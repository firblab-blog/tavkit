package handlers

import (
	"context"
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CampaignStatusHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewCampaignStatusHandler(database db.Database, logger *zap.Logger) *CampaignStatusHandler {
	return &CampaignStatusHandler{
		db:     database,
		logger: logger,
	}
}

// Request/Response types

type UpsertStatusRequest struct {
	Defeated          *bool   `json:"defeated,omitempty"`
	Visited           *bool   `json:"visited,omitempty"`
	Obtained          *bool   `json:"obtained,omitempty"`
	Heard             *bool   `json:"heard,omitempty"`
	Triggered         *bool   `json:"triggered,omitempty"`
	Encountered       *bool   `json:"encountered,omitempty"`
	Completed         *bool   `json:"completed,omitempty"`
	RelationshipNotes *string `json:"relationship_notes,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

type MarkStatusRequest struct {
	ContentType string `json:"content_type" binding:"required"` // 'monster', 'location', etc.
	ContentID   string `json:"content_id" binding:"required"`
}

// GetContentStatus gets the campaign-specific status for a piece of content
// GET /api/v1/campaigns/:id/content/:type/:contentId/status
func (h *CampaignStatusHandler) GetContentStatus(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	contentType := c.Param("type")
	contentID := c.Param("contentId")

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	// Get content status
	status, err := h.db.GetCampaignContentStatus(c.Request.Context(), campaignID, contentType, contentID)
	if err != nil {
		// If no status exists yet, return empty status
		c.JSON(http.StatusOK, gin.H{
			"status":  nil,
			"message": "No status set for this content",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// UpsertContentStatus creates or updates the campaign-specific status for content
// PUT /api/v1/campaigns/:id/content/:type/:contentId/status
func (h *CampaignStatusHandler) UpsertContentStatus(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	contentType := c.Param("type")
	contentID := c.Param("contentId")

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	var req UpsertStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing status or create new one
	status, err := h.db.GetCampaignContentStatus(c.Request.Context(), campaignID, contentType, contentID)
	if err != nil {
		// Create new status
		status = &db.CampaignContentStatus{
			CampaignID:  campaignID,
			ContentType: contentType,
			ContentID:   contentID,
		}
	}

	// Update fields if provided
	if req.Defeated != nil {
		status.Defeated = *req.Defeated
	}
	if req.Visited != nil {
		status.Visited = *req.Visited
	}
	if req.Obtained != nil {
		status.Obtained = *req.Obtained
	}
	if req.Heard != nil {
		status.Heard = *req.Heard
	}
	if req.Triggered != nil {
		status.Triggered = *req.Triggered
	}
	if req.Encountered != nil {
		status.Encountered = *req.Encountered
	}
	if req.Completed != nil {
		status.Completed = *req.Completed
	}
	if req.RelationshipNotes != nil {
		status.RelationshipNotes = req.RelationshipNotes
	}
	if req.Notes != nil {
		status.Notes = req.Notes
	}

	// Upsert status
	if err := h.db.UpsertCampaignContentStatus(c.Request.Context(), status); err != nil {
		h.logger.Error("Failed to upsert content status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// ListCampaignStatus lists all content status for a campaign
// GET /api/v1/campaigns/:id/status?content_type=monster
func (h *CampaignStatusHandler) ListCampaignStatus(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	contentType := c.Query("content_type") // Optional filter

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	var contentTypePtr *string
	if contentType != "" {
		contentTypePtr = &contentType
	}

	statuses, err := h.db.ListCampaignContentStatus(c.Request.Context(), campaignID, contentTypePtr)
	if err != nil {
		h.logger.Error("Failed to list content status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list status"})
		return
	}

	if statuses == nil {
		statuses = []*db.CampaignContentStatus{}
	}

	c.JSON(http.StatusOK, gin.H{"statuses": statuses})
}

// Helper function to handle common mark content operations
func (h *CampaignStatusHandler) handleMarkContent(
	c *gin.Context,
	dbFunc func(ctx context.Context, campaignID, contentType, contentID string) error,
	errorMsg, successMsg string,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	var req MarkStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if err := dbFunc(c.Request.Context(), campaignID, req.ContentType, req.ContentID); err != nil {
		h.logger.Error(errorMsg, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": errorMsg})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": successMsg})
}

// Convenience endpoints for common actions

// MarkDefeated marks a monster as defeated
// POST /api/v1/campaigns/:id/content/mark-defeated
func (h *CampaignStatusHandler) MarkDefeated(c *gin.Context) {
	h.handleMarkContent(c, h.db.MarkContentDefeated, "failed to mark defeated", "Content marked as defeated")
}

// MarkVisited marks a location as visited
// POST /api/v1/campaigns/:id/content/mark-visited
func (h *CampaignStatusHandler) MarkVisited(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	var req struct {
		ContentID string `json:"content_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if err := h.db.MarkContentVisited(c.Request.Context(), campaignID, req.ContentID); err != nil {
		h.logger.Error("Failed to mark content visited", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark visited"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Location marked as visited"})
}

// MarkCompleted marks content as completed
// POST /api/v1/campaigns/:id/content/mark-completed
func (h *CampaignStatusHandler) MarkCompleted(c *gin.Context) {
	h.handleMarkContent(c, h.db.MarkContentCompleted, "failed to mark completed", "Content marked as completed")
}

// UpdateRelationship updates relationship notes for an NPC
// PUT /api/v1/campaigns/:id/npcs/:npcId/relationship
func (h *CampaignStatusHandler) UpdateRelationship(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	npcID := c.Param("npcId")

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if err := h.db.UpdateRelationshipNotes(c.Request.Context(), campaignID, npcID, req.Notes); err != nil {
		h.logger.Error("Failed to update relationship notes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update relationship"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Relationship notes updated"})
}
