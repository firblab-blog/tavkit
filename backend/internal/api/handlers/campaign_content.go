package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CampaignContentHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewCampaignContentHandler(database db.Database, logger *zap.Logger) *CampaignContentHandler {
	return &CampaignContentHandler{
		db:     database,
		logger: logger,
	}
}

// GetCampaignContent retrieves all content for a campaign section
func (h *CampaignContentHandler) GetCampaignContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	section := c.Query("section")
	subsection := c.Query("subsection")

	// Verify campaign ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.logger.Error("Failed to query campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if campaign.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this campaign"})
		return
	}

	// Get content based on filters
	var contents []*db.CampaignContent
	if section != "" {
		var subsecPtr *string
		if subsection != "" {
			subsecPtr = &subsection
		}
		contents, err = h.db.GetCampaignContentBySection(c.Request.Context(), campaignID, userID.(string), section, subsecPtr)
	} else {
		contents, err = h.db.GetCampaignContentByCampaignID(c.Request.Context(), campaignID, userID.(string))
	}

	if err != nil {
		h.logger.Error("Failed to query content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if contents == nil {
		contents = []*db.CampaignContent{}
	}

	c.JSON(http.StatusOK, gin.H{"content": contents})
}

// CreateCampaignContent creates new content entry
func (h *CampaignContentHandler) CreateCampaignContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")

	// Verify campaign ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.logger.Error("Failed to query campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if campaign.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this campaign"})
		return
	}

	var input struct {
		Section    string  `json:"section" binding:"required"`
		Subsection *string `json:"subsection"`
		Title      string  `json:"title" binding:"required"`
		Content    string  `json:"content"`
		Type       string  `json:"type"`
		FileName   *string `json:"file_name"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default type to manual if not specified
	contentType := input.Type
	if contentType == "" {
		contentType = "manual"
	}

	content := &db.CampaignContent{
		CampaignID: campaignID,
		UserID:     userID.(string),
		Section:    input.Section,
		Subsection: input.Subsection,
		Title:      input.Title,
		Content:    input.Content,
		Type:       contentType,
		FileName:   input.FileName,
	}

	if err := h.db.CreateCampaignContent(c.Request.Context(), content); err != nil {
		h.logger.Error("Failed to create content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create content"})
		return
	}

	c.JSON(http.StatusCreated, content)
}

// UpdateCampaignContent updates existing content
func (h *CampaignContentHandler) UpdateCampaignContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	contentID := c.Param("contentId")

	// Get existing content to verify ownership
	content, err := h.db.GetCampaignContentByID(c.Request.Context(), contentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
			return
		}
		h.logger.Error("Failed to query content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if content.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this content"})
		return
	}

	var input struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	content.Title = input.Title
	content.Content = input.Content

	if err := h.db.UpdateCampaignContent(c.Request.Context(), content); err != nil {
		h.logger.Error("Failed to update content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Content updated successfully"})
}

// DeleteCampaignContent deletes content entry
func (h *CampaignContentHandler) DeleteCampaignContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	contentID := c.Param("contentId")

	// Get existing content to verify ownership
	content, err := h.db.GetCampaignContentByID(c.Request.Context(), contentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
			return
		}
		h.logger.Error("Failed to query content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if content.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this content"})
		return
	}

	if err := h.db.DeleteCampaignContent(c.Request.Context(), contentID); err != nil {
		h.logger.Error("Failed to delete content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Content deleted successfully"})
}
