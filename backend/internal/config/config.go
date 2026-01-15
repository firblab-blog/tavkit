// Package config provides application configuration management.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration
type Config struct {
	Environment string
	Server      ServerConfig
	Database    DatabaseConfig
	AI          AIConfig
	Auth        AuthConfig
	CORS        CORSConfig
	RateLimit   RateLimitConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Host          string
	Port          int
	LogLevel      string
	EnableSwagger bool
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Type             string
	Path             string // For SQLite
	Host             string
	Port             int
	Name             string
	User             string
	Password         string
	SSLMode          string
	MaxConnections   int
	MaxIdleConns     int
	QueryTimeout     int // Query timeout in seconds (default: 30)
	MigrationTimeout int // Migration timeout in seconds (default: 300)
}

// AIConfig holds AI service configuration
type AIConfig struct {
	ServiceURL      string // Legacy field, kept for compatibility
	Timeout         int
	Enabled         bool
	Provider        string
	OllamaHost      string
	OllamaModel     string
	AnthropicAPIKey string
	AnthropicModel  string
	OpenAIAPIKey    string
	OpenAIModel     string
	// Python AI Service URL (used for campaign summary generation)
	PythonProxyURL string
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	JWTSecret      string
	JWTExpiration  string
	CookieDomain   string
	CookieSecure   bool   // Set to true in production (HTTPS)
	CookieSameSite string // "Strict", "Lax", or "None"
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins   []string
	AllowCredentials bool
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Enabled           bool
	RequestsPerMinute int
	RequestsPerSecond int
	Burst             int
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Server: ServerConfig{
			Host:          getEnv("HOST", "0.0.0.0"),
			Port:          getEnvAsInt("PORT", 8000),
			LogLevel:      getEnv("LOG_LEVEL", "info"),
			EnableSwagger: getEnvAsBool("ENABLE_SWAGGER", false),
		},
		Database: DatabaseConfig{
			Type:             getEnv("DB_TYPE", "postgres"),
			Path:             getEnv("DB_PATH", "./data/tavkit.db"),
			Host:             getEnv("DB_HOST", "localhost"),
			Port:             getEnvAsInt("DB_PORT", 5432),
			Name:             getEnv("DB_NAME", "tavkit"),
			User:             getEnv("DB_USER", "tavkit"),
			Password:         getEnv("DB_PASSWORD", ""),
			SSLMode:          getEnv("DB_SSLMODE", "disable"),
			MaxConnections:   getEnvAsInt("DB_MAX_CONNECTIONS", 25),
			MaxIdleConns:     getEnvAsInt("DB_MAX_IDLE_CONNECTIONS", 5),
			QueryTimeout:     getEnvAsInt("DB_QUERY_TIMEOUT", 30),      // 30 seconds default
			MigrationTimeout: getEnvAsInt("DB_MIGRATION_TIMEOUT", 300), // 5 minutes default
		},
		AI: AIConfig{
			ServiceURL:      getEnv("AI_SERVICE_URL", "http://localhost:8001"), // Legacy
			Timeout:         getEnvAsInt("AI_TIMEOUT", 120),
			Enabled:         getEnvAsBool("ENABLE_AI", true),
			Provider:        getEnv("AI_PROVIDER", "ollama"),
			OllamaHost:      getEnv("OLLAMA_BASE_URL", "http://ollama:11434"),
			OllamaModel:     getEnv("OLLAMA_MODEL", "llama3.2:3b"),
			AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
			AnthropicModel:  getEnv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
			OpenAIAPIKey:    getEnv("OPENAI_API_KEY", ""),
			OpenAIModel:     getEnv("OPENAI_MODEL", "gpt-4-turbo-preview"),
			// Python AI Service URL (used for campaign summary generation)
			PythonProxyURL: getEnv("PYTHON_AI_SERVICE_URL", "http://ai-service:8001"),
		},
		Auth: AuthConfig{
			JWTSecret:      getEnv("JWT_SECRET", ""),
			JWTExpiration:  getEnv("JWT_EXPIRATION", "24h"),
			CookieDomain:   getEnv("COOKIE_DOMAIN", ""),
			CookieSecure:   getEnvAsBool("COOKIE_SECURE", false),
			CookieSameSite: getEnv("COOKIE_SAMESITE", "Lax"),
		},
		CORS: CORSConfig{
			AllowedOrigins:   getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "http://localhost:5173"}),
			AllowCredentials: getEnvAsBool("CORS_ALLOW_CREDENTIALS", true),
		},
		RateLimit: RateLimitConfig{
			Enabled:           getEnvAsBool("RATE_LIMIT_ENABLED", true),
			RequestsPerMinute: getEnvAsInt("RATE_LIMIT_REQUESTS_PER_MINUTE", 100),
			RequestsPerSecond: getEnvAsInt("RATE_LIMIT_REQUESTS_PER_SECOND", 20),
			Burst:             getEnvAsInt("RATE_LIMIT_BURST", 50),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Only require DB_PASSWORD for postgres
	if c.Database.Type == "postgres" && c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD is required for PostgreSQL")
	}

	if c.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}

	if len(c.Auth.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}

	if c.Server.Port < 1 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Server.Port)
	}

	return nil
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}
