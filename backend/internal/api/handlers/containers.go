package handlers

import (
	"net/http"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ContainerHandler struct {
	database db.Database
	logger   *zap.Logger
}

func NewContainerHandler(database db.Database, logger *zap.Logger) *ContainerHandler {
	return &ContainerHandler{
		database: database,
		logger:   logger,
	}
}

// ListContainers handles GET /api/v1/containers
func (h *ContainerHandler) ListContainers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	containers, err := h.database.ListContainersByUserID(c.Request.Context(), userID.(string))
	if err != nil {
		h.logger.Error("Failed to list containers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list containers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"containers": containers})
}

// CreateContainer handles POST /api/v1/containers
func (h *ContainerHandler) CreateContainer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Type     string  `json:"type" binding:"required"`
		Tool     string  `json:"tool" binding:"required"`
		Title    string  `json:"title" binding:"required"`
		URL      *string `json:"url"`
		Position int     `json:"position"`
		IsActive bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	container := &db.Container{
		UserID:   userID.(string),
		Type:     req.Type,
		Tool:     req.Tool,
		Title:    req.Title,
		URL:      req.URL,
		Position: req.Position,
		IsActive: req.IsActive,
	}

	if err := h.database.CreateContainer(c.Request.Context(), container); err != nil {
		h.logger.Error("Failed to create container", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container"})
		return
	}

	c.JSON(http.StatusCreated, container)
}

// UpdateContainer handles PUT /api/v1/containers/:id
func (h *ContainerHandler) UpdateContainer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	containerID := c.Param("id")

	// Verify ownership
	existing, err := h.database.GetContainerByID(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
		return
	}

	if existing.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this container"})
		return
	}

	var req struct {
		Type     string  `json:"type"`
		Tool     string  `json:"tool"`
		Title    string  `json:"title"`
		URL      *string `json:"url"`
		Position int     `json:"position"`
		IsActive bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Type = req.Type
	existing.Tool = req.Tool
	existing.Title = req.Title
	existing.URL = req.URL
	existing.Position = req.Position
	existing.IsActive = req.IsActive

	if err := h.database.UpdateContainer(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update container", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update container"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteContainer handles DELETE /api/v1/containers/:id
func (h *ContainerHandler) DeleteContainer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	containerID := c.Param("id")

	// Verify ownership
	existing, err := h.database.GetContainerByID(c.Request.Context(), containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
		return
	}

	if existing.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this container"})
		return
	}

	if err := h.database.DeleteContainer(c.Request.Context(), containerID); err != nil {
		h.logger.Error("Failed to delete container", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete container"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Container deleted"})
}

// BulkUpdateContainers handles POST /api/v1/containers/bulk
// Replaces all user containers with the provided list
func (h *ContainerHandler) BulkUpdateContainers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Containers []struct {
			Type     string  `json:"type" binding:"required"`
			Tool     string  `json:"tool" binding:"required"`
			Title    string  `json:"title" binding:"required"`
			URL      *string `json:"url"`
			Position int     `json:"position"`
			IsActive bool    `json:"is_active"`
		} `json:"containers"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Delete all existing containers
	if err := h.database.DeleteAllContainersByUserID(c.Request.Context(), userID.(string)); err != nil {
		h.logger.Error("Failed to delete existing containers", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update containers"})
		return
	}

	// Create new containers
	var createdContainers []*db.Container
	for _, reqContainer := range req.Containers {
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

	c.JSON(http.StatusOK, gin.H{"containers": createdContainers})
}
