// Package handlers provides HTTP handlers for the API endpoints.
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"strconv"

	"tavkit/internal/ai"
	"tavkit/internal/auth"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AdminHandler struct {
	db        db.Database
	hasher    *auth.PasswordHasher
	aiFactory *ai.Factory
	logger    *zap.Logger
}

func NewAdminHandler(database db.Database, aiFactory *ai.Factory, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{
		db:        database,
		hasher:    auth.NewPasswordHasher(),
		aiFactory: aiFactory,
		logger:    logger,
	}
}

type UpdateSettingsRequest struct {
	RegistrationEnabled     bool            `json:"registration_enabled"`
	AITimeoutSeconds        *int            `json:"ai_timeout_seconds,omitempty"`         // Optional, defaults to 120 if not provided
	OllamaCapability        *string         `json:"ollama_capability,omitempty"`          // Optional: "standard" or "low_power"
	OllamaURL               *string         `json:"ollama_url,omitempty"`                 // Optional: Custom Ollama endpoint URL
	UISettings              json.RawMessage `json:"ui_settings,omitempty"`                // Optional UI preferences
	DefaultCampaignEnabled  *bool           `json:"default_campaign_enabled,omitempty"`   // Optional: Whether to show the default campaign
	RAGKnowledgeBaseEnabled *bool           `json:"rag_knowledge_base_enabled,omitempty"` // Optional: Whether RAG/wiki knowledge feature is enabled
	EnabledSettingPacks     []string        `json:"enabled_setting_packs,omitempty"`      // Optional: Array of enabled setting pack slugs
}

// GetSettings retrieves application settings (admin only)
func (h *AdminHandler) GetSettings(c *gin.Context) {
	settings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates application settings (admin only)
func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing settings to preserve fields not being updated
	existingSettings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get existing settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve settings"})
		return
	}

	settings := &db.Settings{
		RegistrationEnabled:        req.RegistrationEnabled,
		AITimeoutSeconds:           120,        // Default
		OllamaCapability:           "standard", // Default
		UISettings:                 req.UISettings,
		DefaultCampaignEnabled:     existingSettings.DefaultCampaignEnabled,     // Preserve existing
		DefaultCampaignInitialized: existingSettings.DefaultCampaignInitialized, // Preserve existing
		RAGKnowledgeBaseEnabled:    existingSettings.RAGKnowledgeBaseEnabled,    // Preserve existing
		EnabledSettingPacks:        existingSettings.EnabledSettingPacks,        // Preserve existing
	}

	// Use provided timeout or default to 120 seconds
	if req.AITimeoutSeconds != nil && *req.AITimeoutSeconds > 0 {
		settings.AITimeoutSeconds = *req.AITimeoutSeconds
	}

	// Use provided Ollama capability or default to "standard"
	if req.OllamaCapability != nil && *req.OllamaCapability != "" {
		settings.OllamaCapability = *req.OllamaCapability
	}

	// Use provided Ollama URL if specified
	if req.OllamaURL != nil && *req.OllamaURL != "" {
		settings.OllamaURL = *req.OllamaURL
	}

	// Update default campaign enabled if specified
	if req.DefaultCampaignEnabled != nil {
		settings.DefaultCampaignEnabled = *req.DefaultCampaignEnabled
	}

	// Update RAG knowledge base enabled if specified
	if req.RAGKnowledgeBaseEnabled != nil {
		settings.RAGKnowledgeBaseEnabled = *req.RAGKnowledgeBaseEnabled
	}

	// Update enabled setting packs if specified
	if len(req.EnabledSettingPacks) > 0 {
		packsJSON, err := json.Marshal(req.EnabledSettingPacks)
		if err == nil {
			settings.EnabledSettingPacks = packsJSON
		}
	}

	if err := h.db.UpdateSettings(c.Request.Context(), settings); err != nil {
		h.logger.Error("Failed to update settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	// If Ollama URL was updated, reload the provider
	if settings.OllamaURL != "" && h.aiFactory != nil {
		h.logger.Info("Reloading Ollama provider with new URL", zap.String("url", settings.OllamaURL))
		if err := h.aiFactory.AddProvider(ai.ProviderOllama, settings.OllamaURL, ""); err != nil {
			h.logger.Warn("Failed to reload Ollama provider - connection may fail",
				zap.String("url", settings.OllamaURL),
				zap.Error(err))
			// Don't fail the settings update - just warn
		}
	}

	h.logger.Info("Settings updated",
		zap.Bool("registration_enabled", req.RegistrationEnabled),
		zap.Int("ai_timeout_seconds", settings.AITimeoutSeconds),
		zap.String("ollama_capability", settings.OllamaCapability),
		zap.Bool("default_campaign_enabled", settings.DefaultCampaignEnabled))
	c.JSON(http.StatusOK, settings)
}

// User management endpoints

type ListUsersResponse struct {
	Users []*db.User `json:"users"`
	Total int        `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

type CreateUserRequest struct {
	Username    string  `json:"username" binding:"required,min=3,max=50"`
	Email       string  `json:"email" binding:"required,email"`
	DisplayName *string `json:"display_name,omitempty"`
	Password    string  `json:"password" binding:"required,min=8"`
	IsAdmin     bool    `json:"is_admin"`
	GameSystem  string  `json:"game_system,omitempty"`
}

type AdminUpdateUserRequest struct {
	Username    string  `json:"username" binding:"required,min=3,max=50"`
	Email       string  `json:"email" binding:"required,email"`
	DisplayName *string `json:"display_name,omitempty"`
	IsAdmin     bool    `json:"is_admin"`
	GameSystem  string  `json:"game_system,omitempty"`
}

type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=8"`
}

// ListUsers returns a paginated list of all users (admin only)
func (h *AdminHandler) ListUsers(c *gin.Context) {
	// Parse pagination parameters
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	users, total, err := h.db.ListUsers(c.Request.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list users", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve users"})
		return
	}

	c.JSON(http.StatusOK, ListUsersResponse{
		Users: users,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetUser retrieves a specific user by ID (admin only)
func (h *AdminHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// CreateUser creates a new user (admin only)
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Additional security validations
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}

	// Check if user already exists
	existingUser, _ := h.db.GetUserByEmail(c.Request.Context(), req.Email) //nolint:errcheck // Only checking existence, not error
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user with this email already exists"})
		return
	}

	existingUser, _ = h.db.GetUserByUsername(c.Request.Context(), req.Username) //nolint:errcheck // Only checking existence, not error
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user with this username already exists"})
		return
	}

	// Hash password
	hashedPassword, err := h.hasher.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	// Create user
	user := &db.User{
		Username:     req.Username,
		Email:        req.Email,
		DisplayName:  req.DisplayName,
		PasswordHash: hashedPassword,
		IsAdmin:      req.IsAdmin,
		GameSystem:   req.GameSystem,
	}

	if err := h.db.CreateUser(c.Request.Context(), user); err != nil {
		h.logger.Error("Failed to create user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	h.logger.Info("User created by admin",
		zap.String("user_id", user.ID),
		zap.String("username", user.Username),
		zap.Bool("is_admin", user.IsAdmin))

	c.JSON(http.StatusCreated, user)
}

// UpdateUser updates a user's information (admin only)
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var req AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing user to preserve password hash
	existingUser, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update user fields
	existingUser.Username = req.Username
	existingUser.Email = req.Email
	existingUser.DisplayName = req.DisplayName
	existingUser.IsAdmin = req.IsAdmin
	if req.GameSystem != "" {
		existingUser.GameSystem = req.GameSystem
	}

	if err := h.db.AdminUpdateUser(c.Request.Context(), existingUser); err != nil {
		h.logger.Error("Failed to update user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	h.logger.Info("User updated by admin",
		zap.String("user_id", userID),
		zap.String("username", req.Username),
		zap.Bool("is_admin", req.IsAdmin))

	c.JSON(http.StatusOK, existingUser)
}

// DeleteUser deletes a user (admin only)
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Prevent admin from deleting themselves
	currentUserID, exists := c.Get("user_id")
	if exists && currentUserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete your own account"})
		return
	}

	if err := h.db.DeleteUser(c.Request.Context(), userID); err != nil {
		h.logger.Error("Failed to delete user", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	h.logger.Info("User deleted by admin", zap.String("user_id", userID))
	c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
}

// ResetUserPassword resets a user's password (admin only)
func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")

	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Additional security validation
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}

	// Verify user exists
	_, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("User not found for password reset", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Hash the new password
	hashedPassword, err := h.hasher.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	// Update the password
	if err := h.db.AdminUpdateUserPassword(c.Request.Context(), userID, hashedPassword); err != nil {
		h.logger.Error("Failed to reset password", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset password"})
		return
	}

	h.logger.Info("User password reset by admin", zap.String("user_id", userID))
	c.JSON(http.StatusOK, gin.H{"message": "password reset successfully"})
}

// =============================================================================
// RAG Knowledge Base Admin Endpoints
// =============================================================================

// GetRAGSettingPacks proxies to AI service to get available setting packs
func (h *AdminHandler) GetRAGSettingPacks(c *gin.Context) {
	// Get AI service URL from environment or use default
	aiServiceURL := getAIServiceURL()

	resp, err := http.Get(aiServiceURL + "/api/v1/rag/settings")
	if err != nil {
		h.logger.Error("Failed to fetch RAG setting packs from AI service", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	defer resp.Body.Close()

	var packs []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&packs); err != nil {
		h.logger.Error("Failed to decode RAG setting packs response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	c.JSON(http.StatusOK, packs)
}

// StartRAGScrape starts a wiki scrape job for a setting pack
func (h *AdminHandler) StartRAGScrape(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "setting slug required"})
		return
	}

	aiServiceURL := getAIServiceURL()

	// Create request body
	reqBody, _ := json.Marshal(map[string]string{"setting_slug": slug})
	resp, err := http.Post(aiServiceURL+"/api/v1/rag/scrape/start", "application/json",
		bytes.NewReader(reqBody))
	if err != nil {
		h.logger.Error("Failed to start RAG scrape", zap.String("slug", slug), zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		h.logger.Error("Failed to decode scrape response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	h.logger.Info("Started RAG scrape job", zap.String("slug", slug))
	c.JSON(resp.StatusCode, result)
}

// GetRAGScrapeStatus gets the status of a scrape job
func (h *AdminHandler) GetRAGScrapeStatus(c *gin.Context) {
	jobID := c.Param("jobId")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job ID required"})
		return
	}

	aiServiceURL := getAIServiceURL()

	resp, err := http.Get(aiServiceURL + "/api/v1/rag/scrape/job/" + jobID)
	if err != nil {
		h.logger.Error("Failed to get RAG scrape status", zap.String("jobId", jobID), zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		h.logger.Error("Failed to decode job status response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	c.JSON(resp.StatusCode, result)
}

// GetActiveScrapeJobs gets all currently active (in-progress) scrape jobs
func (h *AdminHandler) GetActiveScrapeJobs(c *gin.Context) {
	aiServiceURL := getAIServiceURL()

	resp, err := http.Get(aiServiceURL + "/api/v1/rag/scrape/jobs/active")
	if err != nil {
		h.logger.Error("Failed to get active scrape jobs", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	defer resp.Body.Close()

	var result []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		h.logger.Error("Failed to decode active jobs response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	c.JSON(resp.StatusCode, result)
}

// CancelScrapeJob cancels an active scrape job
func (h *AdminHandler) CancelScrapeJob(c *gin.Context) {
	jobID := c.Param("jobId")
	aiServiceURL := getAIServiceURL()

	resp, err := http.Post(aiServiceURL+"/api/v1/rag/scrape/job/"+jobID+"/cancel", "application/json", nil)
	if err != nil {
		h.logger.Error("Failed to cancel scrape job", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		h.logger.Error("Failed to decode cancel response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	c.JSON(resp.StatusCode, result)
}

// Helper to get AI service URL
func getAIServiceURL() string {
	if url := os.Getenv("PYTHON_AI_SERVICE_URL"); url != "" {
		return url
	}
	return "http://ai-service:8001"
}
