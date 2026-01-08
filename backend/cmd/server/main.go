// Package main is the entry point for the Tavkit server application.
//
//	@title						Tavkit API
//	@version					1.0
//	@description				Tavkit is a D&D campaign management toolkit
//	@contact.name				API Support
//	@license.name				MIT
//	@host						localhost:8000
//	@BasePath					/api/v1
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				Type "Bearer" followed by a space and JWT token
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	_ "tavkit/docs"
	"tavkit/internal/ai"
	"tavkit/internal/api"
	"tavkit/internal/auth"
	"tavkit/internal/config"
	"tavkit/internal/db"
	"tavkit/internal/seed"
	"tavkit/internal/services"
)

func main() {
	// Initialize logger based on environment
	var logger *zap.Logger
	var err error
	if os.Getenv("ENVIRONMENT") == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer func() {
		_ = logger.Sync() //nolint:errcheck // Best effort sync on shutdown
	}()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize database based on type
	var database db.Database
	if cfg.Database.Type == "sqlite" {
		database, err = db.NewSQLiteDB(cfg.Database.Path)
	} else {
		database, err = db.NewPostgresDB(cfg.Database)
	}
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer func() {
		_ = database.Close() //nolint:errcheck // Best effort close on shutdown
	}()

	// Run migrations
	if migrationErr := database.Migrate(); migrationErr != nil {
		logger.Fatal("Failed to run migrations", zap.Error(migrationErr))
	}

	// Create default admin user if no users exist
	if adminErr := createDefaultAdminIfNeeded(database, logger); adminErr != nil {
		logger.Fatal("Failed to create default admin user", zap.Error(adminErr))
	}

	// Initialize default settings if they don't exist
	if settingsErr := initializeDefaultSettings(database, logger); settingsErr != nil {
		logger.Fatal("Failed to initialize default settings", zap.Error(settingsErr))
	}

	// Load user settings from database (for custom Ollama URL, etc.)
	dbSettings, err := database.GetSettings(context.Background())
	if err != nil {
		logger.Warn("Failed to load settings from database, using defaults", zap.Error(err))
	}

	// Seed default campaign for all users if enabled and not yet initialized
	if seedErr := seedDefaultCampaignIfNeeded(database, logger); seedErr != nil {
		logger.Warn("Failed to seed default campaign, continuing without it", zap.Error(seedErr))
	}

	// Initialize JWT manager
	jwtManager, err := auth.NewJWTManager(cfg.Auth.JWTSecret, cfg.Auth.JWTExpiration)
	if err != nil {
		logger.Fatal("Failed to initialize JWT manager", zap.Error(err))
	}

	// Initialize AI factory with provider configuration
	// Use database ollama_url if set, otherwise fall back to environment variable
	ollamaHost := cfg.AI.OllamaHost
	if dbSettings != nil && dbSettings.OllamaURL != "" {
		ollamaHost = dbSettings.OllamaURL
		logger.Info("Using Ollama URL from database settings", zap.String("url", ollamaHost))
	}

	aiConfig := ai.Config{
		Enabled:         cfg.AI.Enabled,
		Provider:        ai.ProviderType(cfg.AI.Provider),
		OllamaHost:      ollamaHost,
		OllamaModel:     cfg.AI.OllamaModel,
		AnthropicAPIKey: cfg.AI.AnthropicAPIKey,
		AnthropicModel:  cfg.AI.AnthropicModel,
		OpenAIAPIKey:    cfg.AI.OpenAIAPIKey,
		OpenAIModel:     cfg.AI.OpenAIModel,
	}

	aiFactory, err := ai.NewFactory(aiConfig, logger)
	if err != nil {
		logger.Warn("AI initialization failed, continuing without AI", zap.Error(err))
		// Create disabled factory as fallback
		aiConfig.Enabled = false
		aiFactory, _ = ai.NewFactory(aiConfig, logger)
	}

	if aiConfig.Enabled {
		logger.Info("AI enabled", zap.String("provider", string(aiConfig.Provider)))

		// Test current provider connection
		if provider, err := aiFactory.GetCurrentProvider(); err == nil {
			if err := provider.ValidateConnection(context.Background()); err != nil {
				logger.Warn("Current AI provider not available", zap.Error(err))
			} else {
				logger.Info("AI provider connected successfully", zap.String("name", provider.GetProviderName()))
			}
		}
	} else {
		logger.Info("AI is disabled")
	}

	// Initialize AI client with factory and Python AI service URL (for campaign summaries)
	aiClient := services.NewAIClient(aiFactory, cfg.AI.PythonProxyURL, logger)

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()

	// Setup routes
	api.SetupRoutes(router, cfg, database, jwtManager, aiClient, aiFactory, logger)

	// Create server
	// ReadTimeout: time to read request headers/body
	// WriteTimeout: time to write response - must be > max AI timeout (600s) + processing overhead
	// Set to 630s to match nginx timeout (600s max AI timeout + 30s buffer)
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 630 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting server", zap.Int("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server stopped")
}

// createDefaultAdminIfNeeded creates a default admin user if no users exist in the database.
func createDefaultAdminIfNeeded(database db.Database, logger *zap.Logger) error {
	ctx := context.Background()

	// Try to get admin user by email to check if users exist
	adminEmail := getEnv("ADMIN_EMAIL", "admin@tavkit.local")
	existingUser, err := database.GetUserByEmail(ctx, adminEmail)

	// If user exists or error is something other than "not found", return
	if err == nil && existingUser != nil {
		logger.Info("Admin user already exists, skipping creation")
		return nil
	}

	// Get admin credentials from config
	adminPassword := getEnv("ADMIN_PASSWORD", "changeme123")
	adminUsername := getEnv("ADMIN_USERNAME", "admin")

	// Hash the password using Argon2 (same as auth handler)
	hasher := auth.NewPasswordHasher()
	logger.Debug("Admin password setup",
		zap.String("password", adminPassword),
		zap.Int("password_length", len(adminPassword)),
	)
	hashedPassword, err := hasher.HashPassword(adminPassword)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create default admin user
	admin := &db.User{
		Email:        adminEmail,
		Username:     adminUsername,
		PasswordHash: hashedPassword,
		IsAdmin:      true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := database.CreateUser(ctx, admin); err != nil {
		return fmt.Errorf("failed to create default admin user: %w", err)
	}

	logger.Info("Created default admin user",
		zap.String("email", adminEmail),
		zap.String("username", adminUsername),
		zap.String("hash_preview", hashedPassword[:50]+"..."),
	)
	logger.Warn("⚠️  Default admin credentials are in use. Change them immediately in production!")

	return nil
}

// initializeDefaultSettings creates default settings if they don't exist in the database.
func initializeDefaultSettings(database db.Database, logger *zap.Logger) error {
	ctx := context.Background()

	// Try to get existing settings
	_, err := database.GetSettings(ctx)
	if err == nil {
		// Settings already exist
		return nil
	}

	// Create default settings with 300s timeout (5 minutes) to handle AI generation times
	defaultSettings := &db.Settings{
		RegistrationEnabled: true,
		AITimeoutSeconds:    300, // 5 minutes default - AI service can take 150-180s in practice
	}

	if err := database.UpdateSettings(ctx, defaultSettings); err != nil {
		return fmt.Errorf("failed to create default settings: %w", err)
	}

	logger.Info("Initialized default settings",
		zap.Int("ai_timeout_seconds", defaultSettings.AITimeoutSeconds),
		zap.Bool("registration_enabled", defaultSettings.RegistrationEnabled))

	return nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// seedDefaultCampaignIfNeeded seeds the Crossroads Chronicle campaign for all users if enabled
func seedDefaultCampaignIfNeeded(database db.Database, logger *zap.Logger) error {
	ctx := context.Background()

	// Check if default campaign is enabled and not yet initialized
	settings, err := database.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings: %w", err)
	}

	// If not enabled, skip seeding
	if !settings.DefaultCampaignEnabled {
		logger.Info("Default campaign is disabled, skipping seeding")
		return nil
	}

	// If already initialized, skip
	if settings.DefaultCampaignInitialized {
		logger.Debug("Default campaign already initialized, skipping")
		return nil
	}

	// Get all users
	users, _, err := database.ListUsers(ctx, 1000, 0) // Get up to 1000 users
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	if len(users) == 0 {
		logger.Info("No users found, skipping default campaign seeding")
		return nil
	}

	// Seed campaign for each user
	seeder := seed.NewCrossroadsChronicleSeeder(database, logger)
	for _, user := range users {
		if err := seeder.SeedForUser(ctx, user.ID); err != nil {
			logger.Warn("Failed to seed default campaign for user",
				zap.String("user_id", user.ID),
				zap.Error(err))
			// Continue with other users
		}
	}

	// Mark as initialized
	settings.DefaultCampaignInitialized = true
	if err := database.UpdateSettings(ctx, settings); err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	logger.Info("Default campaign seeded successfully")
	return nil
}
