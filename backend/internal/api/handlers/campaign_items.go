package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CampaignItemsHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewCampaignItemsHandler(database db.Database, logger *zap.Logger) *CampaignItemsHandler {
	return &CampaignItemsHandler{
		db:     database,
		logger: logger,
	}
}

// LinkItemRequest represents the request body for linking an item to a campaign
type LinkItemRequest struct {
	Quantity int     `json:"quantity"`
	Notes    *string `json:"notes,omitempty"`
}

// UpdateItemLinkRequest represents the request body for updating an item link
type UpdateItemLinkRequest struct {
	Quantity int     `json:"quantity"`
	Notes    *string `json:"notes,omitempty"`
}

// ListCampaignItems retrieves all items linked to a campaign
func (h *CampaignItemsHandler) ListCampaignItems(c *gin.Context) {
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
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this campaign"})
		return
	}

	// Get linked items
	items, err := h.db.ListCampaignItems(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list campaign items", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if items == nil {
		items = []*db.ItemWithCampaignLink{}
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

// LinkItem links an item to a campaign
func (h *CampaignItemsHandler) LinkItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	itemID := c.Param("itemId")

	// Parse request body (optional quantity and notes)
	var req LinkItemRequest
	req.Quantity = 1           // Default quantity
	_ = c.ShouldBindJSON(&req) // Ignore bind error - use defaults

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

	// Verify item ownership
	item, err := h.db.GetItemByID(c.Request.Context(), itemID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
			return
		}
		h.logger.Error("Failed to query item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if item.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to link this item"})
		return
	}

	// Link the item to the campaign
	if err := h.db.LinkItemToCampaign(c.Request.Context(), campaignID, itemID, req.Quantity, req.Notes); err != nil {
		h.logger.Error("Failed to link item to campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item linked successfully"})
}

// UnlinkItem removes an item from a campaign
func (h *CampaignItemsHandler) UnlinkItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	itemID := c.Param("itemId")

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

	// Unlink the item from the campaign
	if err := h.db.UnlinkItemFromCampaign(c.Request.Context(), campaignID, itemID); err != nil {
		h.logger.Error("Failed to unlink item from campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item unlinked successfully"})
}

// UpdateItemLink updates the quantity/notes for an item in a campaign
func (h *CampaignItemsHandler) UpdateItemLink(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	itemID := c.Param("itemId")

	var req UpdateItemLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

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

	// Update the item link
	if err := h.db.UpdateCampaignItemLink(c.Request.Context(), campaignID, itemID, req.Quantity, req.Notes); err != nil {
		h.logger.Error("Failed to update item link", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item link updated successfully"})
}
