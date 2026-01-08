package handlers

import (
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ToolHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewToolHandler(database db.Database, logger *zap.Logger) *ToolHandler {
	return &ToolHandler{
		db:     database,
		logger: logger,
	}
}

type CreateToolRequest struct {
	Name     string `json:"name" binding:"required"`
	Type     string `json:"type" binding:"required"` // 'external', 'generator', 'git'
	URL      string `json:"url"`                     // For external tools
	Icon     string `json:"icon"`                    // Favicon URL
	Position int    `json:"position"`                // Display order
	IsPinned bool   `json:"is_pinned"`               // Pinned to top
}

type UpdateToolRequest struct {
	Name     string `json:"name,omitempty"`
	URL      string `json:"url,omitempty"`
	Icon     string `json:"icon,omitempty"`
	Position int    `json:"position,omitempty"`
	IsPinned bool   `json:"is_pinned,omitempty"`
}

// CreateTool creates a new tool
func (h *ToolHandler) CreateTool(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create config JSON for icon
	var configJSON []byte
	if req.Icon != "" {
		configJSON = []byte(`{"icon":"` + req.Icon + `"}`)
	}

	url := req.URL
	tool := &db.Tool{
		UserID:   userID,
		Name:     req.Name,
		Type:     req.Type,
		URL:      &url,
		Config:   configJSON,
		Position: req.Position,
		IsPinned: req.IsPinned,
	}

	if err := h.db.CreateTool(c.Request.Context(), tool); err != nil {
		h.logger.Error("Failed to create tool", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tool"})
		return
	}

	c.JSON(http.StatusCreated, tool)
}

// GetTool gets a tool by ID
func (h *ToolHandler) GetTool(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	toolID := c.Param("id")
	tool, err := h.db.GetToolByID(c.Request.Context(), toolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tool not found"})
		return
	}

	// Check ownership
	if tool.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, tool)
}

// ListTools lists all tools for current user
func (h *ToolHandler) ListTools(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	tools, err := h.db.ListToolsByUserID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to list tools", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tools"})
		return
	}

	c.JSON(http.StatusOK, tools)
}

// UpdateTool updates a tool
func (h *ToolHandler) UpdateTool(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	toolID := c.Param("id")
	tool, err := h.db.GetToolByID(c.Request.Context(), toolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tool not found"})
		return
	}

	// Check ownership
	if tool.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		tool.Name = req.Name
	}
	if req.URL != "" {
		tool.URL = &req.URL
	}
	if req.Icon != "" {
		tool.Config = []byte(`{"icon":"` + req.Icon + `"}`)
	}
	if req.Position > 0 {
		tool.Position = req.Position
	}
	tool.IsPinned = req.IsPinned

	if err := h.db.UpdateTool(c.Request.Context(), tool); err != nil {
		h.logger.Error("Failed to update tool", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tool"})
		return
	}

	c.JSON(http.StatusOK, tool)
}

// DeleteTool deletes a tool
func (h *ToolHandler) DeleteTool(c *gin.Context) {
	HandleEntityDelete(
		c,
		"tool",
		h.db.GetToolByID,
		func(t *db.Tool) string { return t.UserID },
		h.db.DeleteTool,
		h.logger,
	)
}
