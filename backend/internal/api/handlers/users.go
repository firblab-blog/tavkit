package handlers

import (
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type UserHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewUserHandler(database db.Database, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		db:     database,
		logger: logger,
	}
}

type UpdateUserRequest struct {
	Username   string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Email      string `json:"email,omitempty" binding:"omitempty,email"`
	GameSystem string `json:"game_system,omitempty"`
}

// GetMe returns current user info
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Password hash is already hidden by json:"-" tag

	c.JSON(http.StatusOK, user)
}

// UpdateMe updates current user
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user
	user, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update fields
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.GameSystem != "" {
		user.GameSystem = req.GameSystem
	}

	if err := h.db.UpdateUser(c.Request.Context(), user); err != nil {
		h.logger.Error("Failed to update user", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	// Password hash is already hidden by json:"-" tag

	c.JSON(http.StatusOK, user)
}

// DeleteMe deletes current user
func (h *UserHandler) DeleteMe(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.db.DeleteUser(c.Request.Context(), userID); err != nil {
		h.logger.Error("Failed to delete user", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

// =============================================================================
// User Context Endpoints
// =============================================================================

// UpdateContextRequest defines the request body for updating user context
type UpdateContextRequest struct {
	LastContextType   *string `json:"last_context_type,omitempty"` // 'gm_campaign', 'player_campaign', 'library'
	LastCampaignID    *string `json:"last_campaign_id,omitempty"`
	LastCharacterID   *string `json:"last_character_id,omitempty"`
	DefaultGameSystem *string `json:"default_game_system,omitempty"`
}

// GetContext returns the current user's context (last used campaign, mode, etc.)
func (h *UserHandler) GetContext(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get or create context (ensures every user has one)
	ctx, err := h.db.GetOrCreateUserContext(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user context", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user context"})
		return
	}

	c.JSON(http.StatusOK, ctx)
}

// UpdateContext updates the current user's context
func (h *UserHandler) UpdateContext(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req UpdateContextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate last_context_type if provided
	if req.LastContextType != nil {
		validTypes := map[string]bool{"gm_campaign": true, "player_campaign": true, "library": true}
		if !validTypes[*req.LastContextType] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid last_context_type, must be 'gm_campaign', 'player_campaign', or 'library'"})
			return
		}
	}

	// Get existing context or create new
	ctx, err := h.db.GetOrCreateUserContext(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user context", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user context"})
		return
	}

	// Update only provided fields
	if req.LastContextType != nil {
		ctx.LastContextType = req.LastContextType
	}
	if req.LastCampaignID != nil {
		ctx.LastCampaignID = req.LastCampaignID
	}
	if req.LastCharacterID != nil {
		ctx.LastCharacterID = req.LastCharacterID
	}
	if req.DefaultGameSystem != nil {
		ctx.DefaultGameSystem = req.DefaultGameSystem
	}

	if err := h.db.UpdateUserContext(c.Request.Context(), ctx); err != nil {
		h.logger.Error("Failed to update user context", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user context"})
		return
	}

	c.JSON(http.StatusOK, ctx)
}

// CompleteOnboarding marks the user's onboarding as complete
func (h *UserHandler) CompleteOnboarding(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Ensure context exists first
	_, err := h.db.GetOrCreateUserContext(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user context", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user context"})
		return
	}

	if err := h.db.MarkOnboardingComplete(c.Request.Context(), userID); err != nil {
		h.logger.Error("Failed to mark onboarding complete", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete onboarding"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "onboarding completed"})
}

// =============================================================================
// User UI Settings Endpoints
// =============================================================================

// GetUISettings returns the current user's UI settings
func (h *UserHandler) GetUISettings(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	settings, err := h.db.GetUserUISettings(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get UI settings", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get UI settings"})
		return
	}

	// Return raw JSON
	c.Data(http.StatusOK, "application/json", settings)
}

// UpdateUISettings updates the current user's UI settings
func (h *UserHandler) UpdateUISettings(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Read raw JSON body
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.db.UpdateUserUISettings(c.Request.Context(), userID, body); err != nil {
		h.logger.Error("Failed to update UI settings", zap.Error(err), zap.String("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update UI settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "UI settings updated"})
}
