package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CampaignFilter represents the type of campaign filtering to apply
type CampaignFilter int

const (
	// FilterNone means no campaign filtering (return all)
	FilterNone CampaignFilter = iota
	// FilterByCampaign means filter by a specific campaign ID
	FilterByCampaign
	// FilterNullCampaign means filter for Personal Library (campaign_id IS NULL)
	FilterNullCampaign
)

// ParseCampaignFilter extracts campaign filter from query parameters
// Returns the filter type and campaign ID (if filtering by campaign)
func ParseCampaignFilter(c *gin.Context) (CampaignFilter, *string) {
	cid := c.Query("campaign_id")
	if cid == "" {
		return FilterNone, nil
	}
	if cid == "null" {
		return FilterNullCampaign, nil
	}
	return FilterByCampaign, &cid
}

// FilterByNullCampaign filters a slice to only include items with nil campaign_id
// T must have a method GetCampaignID() *string
func FilterByNullCampaign[T interface{ GetCampaignID() *string }](items []*T) []*T {
	result := make([]*T, 0)
	for _, item := range items {
		if (*item).GetCampaignID() == nil {
			result = append(result, item)
		}
	}
	return result
}

// HandleEntityDelete is a generic handler for deleting entities with ownership verification
// It takes functions to get and delete the entity, and verifies ownership before deletion
func HandleEntityDelete[T any](
	c *gin.Context,
	entityName string,
	getByID func(ctx context.Context, id string) (*T, error),
	getUserID func(*T) string,
	deleteFunc func(ctx context.Context, id string) error,
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing entity
	entity, err := getByID(c.Request.Context(), id)
	if err != nil {
		logger.Error("Failed to get "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get " + entityName})
		return
	}

	if entity == nil || getUserID(entity) != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	if err := deleteFunc(c.Request.Context(), id); err != nil {
		logger.Error("Failed to delete "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete " + entityName})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": entityName + " deleted successfully"})
}

// GetCampaignContext is a helper function to retrieve and serialize campaign context
func GetCampaignContext(
	ctx context.Context,
	campaignID *string,
	summaryService *services.CampaignSummaryService,
	logger *zap.Logger,
) string {
	if campaignID == nil {
		return ""
	}

	summaryContext, err := summaryService.GetCampaignContext(ctx, *campaignID)
	if err != nil {
		logger.Warn("Failed to get campaign context, generating without it",
			zap.String("campaign_id", *campaignID),
			zap.Error(err))
		return ""
	}

	// Convert summary context to a string for AI
	contextJSON, err := json.Marshal(summaryContext)
	if err != nil {
		logger.Warn("Failed to marshal campaign context",
			zap.String("campaign_id", *campaignID),
			zap.Error(err))
		return ""
	}

	return string(contextJSON)
}

// HandleChaseSubEntityGet is a generic handler for getting chase sub-entities (participants, challenges, complications)
// that verifies the parent chase belongs to the user
func HandleChaseSubEntityGet[T any](
	c *gin.Context,
	entityName string,
	paramName string,
	getByID func(ctx context.Context, id string) (*T, error),
	getChaseID func(*T) string,
	getChaseByID func(ctx context.Context, id string) (interface{ GetUserID() string }, error),
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param(paramName)
	entity, err := getByID(c.Request.Context(), id)
	if err != nil {
		logger.Error("Failed to get "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get " + entityName})
		return
	}

	if entity == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	// Verify chase belongs to user
	chase, err := getChaseByID(c.Request.Context(), getChaseID(entity))
	if err != nil || chase == nil || chase.GetUserID() != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	c.JSON(http.StatusOK, entity)
}

// HandleChaseSubEntityList is a generic handler for listing chase sub-entities
// that verifies the parent chase belongs to the user
func HandleChaseSubEntityList[T any](
	c *gin.Context,
	entityName string,
	listFunc func(ctx context.Context, chaseID string) ([]*T, error),
	getChaseByID func(ctx context.Context, id string) (interface{ GetUserID() string }, error),
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	chaseID := c.Param("id")

	// Verify chase belongs to user
	chase, err := getChaseByID(c.Request.Context(), chaseID)
	if err != nil || chase == nil || chase.GetUserID() != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	entities, err := listFunc(c.Request.Context(), chaseID)
	if err != nil {
		logger.Error("Failed to list "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list " + entityName})
		return
	}

	c.JSON(http.StatusOK, entities)
}

// HandleChaseSubEntityDelete is a generic handler for deleting chase sub-entities
// that verifies the parent chase belongs to the user
func HandleChaseSubEntityDelete[T any](
	c *gin.Context,
	entityName string,
	paramName string,
	getByID func(ctx context.Context, id string) (*T, error),
	getChaseID func(*T) string,
	getChaseByID func(ctx context.Context, id string) (interface{ GetUserID() string }, error),
	deleteFunc func(ctx context.Context, id string) error,
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param(paramName)

	// Get existing entity
	entity, err := getByID(c.Request.Context(), id)
	if err != nil || entity == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	// Verify chase belongs to user
	chase, err := getChaseByID(c.Request.Context(), getChaseID(entity))
	if err != nil || chase == nil || chase.GetUserID() != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	if err := deleteFunc(c.Request.Context(), id); err != nil {
		logger.Error("Failed to delete "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete " + entityName})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": entityName + " deleted successfully"})
}

// AssignCampaignRequest represents the request to assign content to a campaign
type AssignCampaignRequest struct {
	// CampaignID is the target campaign, or null to move to Personal Library
	CampaignID *string `json:"campaign_id"`
}

// HandleAssignCampaign is a generic handler for assigning content to a campaign
// It verifies ownership and updates the campaign_id field
func HandleAssignCampaign[T any](
	c *gin.Context,
	entityName string,
	getByID func(ctx context.Context, id string) (*T, error),
	getUserID func(*T) string,
	setCampaignID func(*T, *string),
	updateFunc func(ctx context.Context, entity *T) error,
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing entity
	entity, err := getByID(c.Request.Context(), id)
	if err != nil {
		logger.Error("Failed to get "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get " + entityName})
		return
	}

	if entity == nil || getUserID(entity) != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": entityName + " not found"})
		return
	}

	var req AssignCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update the campaign_id
	setCampaignID(entity, req.CampaignID)

	if err := updateFunc(c.Request.Context(), entity); err != nil {
		logger.Error("Failed to update "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update " + entityName})
		return
	}

	c.JSON(http.StatusOK, entity)
}

// HandleCombatSubEntityDelete is a generic handler for deleting combat sub-entities
// that verifies ownership via the session
func HandleCombatSubEntityDelete(
	c *gin.Context,
	entityName string,
	paramName string,
	getCombatByID func(ctx context.Context, id string) (interface{ GetSessionID() string }, error),
	getSessionByID func(ctx context.Context, id string) (interface{ GetUserID() string }, error),
	deleteFunc func(ctx context.Context, id string) error,
	logger *zap.Logger,
) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")
	entityID := c.Param(paramName)

	combat, err := getCombatByID(c.Request.Context(), combatID)
	if err != nil {
		logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := getSessionByID(c.Request.Context(), combat.GetSessionID())
	if err != nil || session.GetUserID() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := deleteFunc(c.Request.Context(), entityID); err != nil {
		logger.Error("Failed to remove "+entityName, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove " + entityName})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": entityName + " removed"})
}
