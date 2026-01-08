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
