package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"tavkit/internal/db"
)

// CampaignMembersHandler handles campaign membership operations
type CampaignMembersHandler struct {
	db     db.Database
	logger *zap.Logger
}

// NewCampaignMembersHandler creates a new campaign members handler
func NewCampaignMembersHandler(database db.Database, logger *zap.Logger) *CampaignMembersHandler {
	return &CampaignMembersHandler{
		db:     database,
		logger: logger,
	}
}

// =============================================================================
// Invite Code Endpoints
// =============================================================================

// GenerateInviteCodeRequest represents the request to generate an invite code
type GenerateInviteCodeRequest struct {
	UsesRemaining *int `json:"uses_remaining,omitempty"`  // NULL = unlimited
	ExpiresInDays *int `json:"expires_in_days,omitempty"` // NULL = never expires
}

// GenerateInviteCode creates a new invite code for a campaign
// POST /campaigns/:id/invites
func (h *CampaignMembersHandler) GenerateInviteCode(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify user owns this campaign
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	// Only campaign owners can generate invite codes
	if campaign.Role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only campaign owners can generate invite codes"})
		return
	}

	var req GenerateInviteCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Empty body is fine, all fields are optional
		req = GenerateInviteCodeRequest{}
	}

	invite := &db.CampaignInvite{
		CampaignID:    campaignID,
		CreatedBy:     userID.(string),
		UsesRemaining: req.UsesRemaining,
		IsActive:      true,
	}

	// Calculate expiration if specified
	if req.ExpiresInDays != nil && *req.ExpiresInDays > 0 {
		expiresAt := time.Now().AddDate(0, 0, *req.ExpiresInDays)
		invite.ExpiresAt = &expiresAt
	}

	if err := h.db.CreateCampaignInvite(c.Request.Context(), invite); err != nil {
		h.logger.Error("Failed to create invite code", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite code"})
		return
	}

	c.JSON(http.StatusCreated, invite)
}

// ListInvites lists all invite codes for a campaign
// GET /campaigns/:id/invites
func (h *CampaignMembersHandler) ListInvites(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify user owns this campaign
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	if campaign.Role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only campaign owners can view invite codes"})
		return
	}

	invites, err := h.db.ListCampaignInvites(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list invites", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list invites"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invites": invites})
}

// RevokeInvite deactivates an invite code
// DELETE /campaigns/:id/invites/:code
func (h *CampaignMembersHandler) RevokeInvite(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")
	code := c.Param("code")

	// Verify user owns this campaign
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	if campaign.Role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only campaign owners can revoke invite codes"})
		return
	}

	if err := h.db.DeactivateCampaignInvite(c.Request.Context(), campaignID, code); err != nil {
		h.logger.Error("Failed to revoke invite", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke invite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invite code revoked"})
}

// =============================================================================
// Campaign Joining Endpoints
// =============================================================================

// JoinCampaignRequest represents the request to join a campaign
type JoinCampaignRequest struct {
	Code        string  `json:"code" binding:"required"`
	CharacterID *string `json:"character_id,omitempty"`
}

// JoinCampaign allows a player to join a campaign via invite code
// POST /campaigns/join
func (h *CampaignMembersHandler) JoinCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req JoinCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invite code is required"})
		return
	}

	// Look up the invite code
	invite, err := h.db.GetCampaignInviteByCode(c.Request.Context(), req.Code)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid invite code"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch invite", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate invite code"})
		return
	}

	// Validate invite is active
	if !invite.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This invite code has been revoked"})
		return
	}

	// Check if expired
	if invite.ExpiresAt != nil && invite.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This invite code has expired"})
		return
	}

	// Check uses remaining
	if invite.UsesRemaining != nil && *invite.UsesRemaining <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This invite code has no uses remaining"})
		return
	}

	// Check if user is already a member
	existingMember, err := h.db.GetCampaignMember(c.Request.Context(), invite.CampaignID, userID.(string))
	if err != nil && err != sql.ErrNoRows {
		h.logger.Error("Failed to check membership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join campaign"})
		return
	}
	if existingMember != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You are already a member of this campaign"})
		return
	}

	// Check if user owns this campaign
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), invite.CampaignID)
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join campaign"})
		return
	}
	if campaign.UserID == userID.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot join your own campaign"})
		return
	}

	// Create the membership
	member := &db.CampaignMember{
		CampaignID:     invite.CampaignID,
		UserID:         userID.(string),
		Role:           "player",
		CharacterID:    req.CharacterID,
		InviteCodeUsed: &req.Code,
	}

	if err := h.db.CreateCampaignMember(c.Request.Context(), member); err != nil {
		h.logger.Error("Failed to create membership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join campaign"})
		return
	}

	// Decrement uses if limited
	if invite.UsesRemaining != nil {
		if err := h.db.DecrementInviteUses(c.Request.Context(), invite.ID); err != nil {
			h.logger.Warn("Failed to decrement invite uses", zap.Error(err))
		}
	}

	// Return the campaign info
	c.JSON(http.StatusOK, gin.H{
		"message":  "Successfully joined campaign",
		"campaign": campaign,
		"member":   member,
	})
}

// =============================================================================
// Member Management Endpoints
// =============================================================================

// ListMembers lists all members of a campaign
// GET /campaigns/:id/members
func (h *CampaignMembersHandler) ListMembers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify user has access to this campaign (owner or member)
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		// Check if user is a member
		member, memberErr := h.db.GetCampaignMember(c.Request.Context(), campaignID, userID.(string))
		if memberErr != nil || member == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
	} else if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	members, err := h.db.ListCampaignMembers(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list members", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list members"})
		return
	}

	// Also include the owner info
	var owner *db.User
	if campaign != nil {
		owner, _ = h.db.GetUserByID(c.Request.Context(), campaign.UserID)
	}

	c.JSON(http.StatusOK, gin.H{
		"members": members,
		"owner":   owner,
	})
}

// RemoveMember removes a player from a campaign
// DELETE /campaigns/:id/members/:userId
func (h *CampaignMembersHandler) RemoveMember(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")
	targetUserID := c.Param("userId")

	// Verify user owns this campaign OR is removing themselves
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		// User might be a member trying to leave
		if userID.(string) != targetUserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only campaign owners can remove other members"})
			return
		}
	} else if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	} else if campaign.Role != "owner" && userID.(string) != targetUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only campaign owners can remove other members"})
		return
	}

	if err := h.db.DeleteCampaignMember(c.Request.Context(), campaignID, targetUserID); err != nil {
		h.logger.Error("Failed to remove member", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}

// LeaveCampaign allows a player to leave a campaign
// DELETE /campaigns/:id/leave
func (h *CampaignMembersHandler) LeaveCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	if err := h.db.DeleteCampaignMember(c.Request.Context(), campaignID, userID.(string)); err != nil {
		h.logger.Error("Failed to leave campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave campaign"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left campaign"})
}
