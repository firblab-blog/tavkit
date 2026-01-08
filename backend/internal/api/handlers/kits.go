package handlers

import (
	"encoding/json"
	"net/http"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type KitHandler struct {
	database db.Database
	logger   *zap.Logger
}

func NewKitHandler(database db.Database, logger *zap.Logger) *KitHandler {
	return &KitHandler{
		database: database,
		logger:   logger,
	}
}

// ListKits handles GET /api/v1/kits
func (h *KitHandler) ListKits(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kits, err := h.database.ListKitsByUserID(c.Request.Context(), userID.(string))
	if err != nil {
		h.logger.Error("Failed to list kits", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list kits"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"kits": kits})
}

// GetKit handles GET /api/v1/kits/:id
func (h *KitHandler) GetKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kitID := c.Param("id")

	kit, err := h.database.GetKitByID(c.Request.Context(), kitID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}

	if kit.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view this kit"})
		return
	}

	c.JSON(http.StatusOK, kit)
}

// CreateKit handles POST /api/v1/kits
func (h *KitHandler) CreateKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name        string          `json:"name" binding:"required"`
		Description *string         `json:"description"`
		Containers  json.RawMessage `json:"containers" binding:"required"`
		IsDefault   bool            `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	kit := &db.Kit{
		UserID:      userID.(string),
		Name:        req.Name,
		Description: req.Description,
		Containers:  req.Containers,
		IsDefault:   req.IsDefault,
	}

	if err := h.database.CreateKit(c.Request.Context(), kit); err != nil {
		h.logger.Error("Failed to create kit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create kit"})
		return
	}

	// If this is set as default, update other kits
	if kit.IsDefault {
		if err := h.database.SetDefaultKit(c.Request.Context(), userID.(string), kit.ID); err != nil {
			h.logger.Error("Failed to set default kit", zap.Error(err))
		}
	}

	c.JSON(http.StatusCreated, kit)
}

// UpdateKit handles PUT /api/v1/kits/:id
func (h *KitHandler) UpdateKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kitID := c.Param("id")

	// Verify ownership
	existing, err := h.database.GetKitByID(c.Request.Context(), kitID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}

	if existing.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this kit"})
		return
	}

	var req struct {
		Name        string          `json:"name"`
		Description *string         `json:"description"`
		Containers  json.RawMessage `json:"containers"`
		IsDefault   bool            `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.Containers = req.Containers
	existing.IsDefault = req.IsDefault

	if err := h.database.UpdateKit(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update kit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update kit"})
		return
	}

	// If this is set as default, update other kits
	if existing.IsDefault {
		if err := h.database.SetDefaultKit(c.Request.Context(), userID.(string), existing.ID); err != nil {
			h.logger.Error("Failed to set default kit", zap.Error(err))
		}
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteKit handles DELETE /api/v1/kits/:id
func (h *KitHandler) DeleteKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kitID := c.Param("id")

	// Verify ownership
	existing, err := h.database.GetKitByID(c.Request.Context(), kitID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}

	if existing.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this kit"})
		return
	}

	if err := h.database.DeleteKit(c.Request.Context(), kitID); err != nil {
		h.logger.Error("Failed to delete kit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete kit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kit deleted"})
}

// SetDefaultKit handles PUT /api/v1/kits/:id/default
func (h *KitHandler) SetDefaultKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kitID := c.Param("id")

	// Verify ownership
	existing, err := h.database.GetKitByID(c.Request.Context(), kitID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}

	if existing.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to modify this kit"})
		return
	}

	if err := h.database.SetDefaultKit(c.Request.Context(), userID.(string), kitID); err != nil {
		h.logger.Error("Failed to set default kit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set default kit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Default kit updated"})
}

// LoadKit handles POST /api/v1/kits/:id/load
// Loads a kit by replacing current containers
func (h *KitHandler) LoadKit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	kitID := c.Param("id")

	// Verify ownership and get kit
	kit, err := h.database.GetKitByID(c.Request.Context(), kitID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}

	if kit.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to load this kit"})
		return
	}

	// Parse containers from kit
	var containers []struct {
		Type     string  `json:"type"`
		Tool     string  `json:"tool"`
		Title    string  `json:"title"`
		URL      *string `json:"url"`
		Position int     `json:"position"`
		IsActive bool    `json:"is_active"`
	}

	if err := json.Unmarshal(kit.Containers, &containers); err != nil {
		h.logger.Error("Failed to parse kit containers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid kit data"})
		return
	}

	// Delete all existing containers
	if err := h.database.DeleteAllContainersByUserID(c.Request.Context(), userID.(string)); err != nil {
		h.logger.Error("Failed to delete existing containers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kit"})
		return
	}

	// Create new containers from kit
	var createdContainers []*db.Container
	for _, reqContainer := range containers {
		container := &db.Container{
			UserID:   userID.(string),
			Type:     reqContainer.Type,
			Tool:     reqContainer.Tool,
			Title:    reqContainer.Title,
			URL:      reqContainer.URL,
			Position: reqContainer.Position,
			IsActive: reqContainer.IsActive,
		}

		if err := h.database.CreateContainer(c.Request.Context(), container); err != nil {
			h.logger.Error("Failed to create container", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container"})
			return
		}

		createdContainers = append(createdContainers, container)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Kit loaded",
		"containers": createdContainers,
	})
}
