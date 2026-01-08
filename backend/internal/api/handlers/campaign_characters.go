package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CampaignCharactersHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewCampaignCharactersHandler(database db.Database, logger *zap.Logger) *CampaignCharactersHandler {
	return &CampaignCharactersHandler{
		db:     database,
		logger: logger,
	}
}

// ListCampaignCharacters retrieves all characters linked to a campaign
func (h *CampaignCharactersHandler) ListCampaignCharacters(c *gin.Context) {
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

	// Get linked characters
	characters, err := h.db.ListCampaignCharacters(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list campaign characters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if characters == nil {
		characters = []*db.Character{}
	}

	c.JSON(http.StatusOK, gin.H{"characters": characters})
}

// LinkCharacter links a character to a campaign
func (h *CampaignCharactersHandler) LinkCharacter(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	characterID := c.Param("characterId")

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

	// Verify character ownership
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
			return
		}
		h.logger.Error("Failed to query character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if character.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to link this character"})
		return
	}

	// Link the character to the campaign
	if err := h.db.LinkCharacterToCampaign(c.Request.Context(), campaignID, characterID); err != nil {
		h.logger.Error("Failed to link character to campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link character"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Character linked successfully"})
}

// UnlinkCharacter removes a character from a campaign
func (h *CampaignCharactersHandler) UnlinkCharacter(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	campaignID := c.Param("id")
	characterID := c.Param("characterId")

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

	// Unlink the character from the campaign
	if err := h.db.UnlinkCharacterFromCampaign(c.Request.Context(), campaignID, characterID); err != nil {
		h.logger.Error("Failed to unlink character from campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink character"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Character unlinked successfully"})
}
