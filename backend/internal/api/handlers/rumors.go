package handlers

import (
	"encoding/json"
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RumorHandler handles rumor-related requests
type RumorHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewRumorHandler creates a new rumor handler
func NewRumorHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *RumorHandler {
	return &RumorHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateRumorRequest represents the request to create a rumor
type CreateRumorRequest struct {
	Text          string   `json:"text" binding:"required"`
	Source        string   `json:"source"`
	Veracity      string   `json:"veracity" binding:"required"`
	LeadsTo       string   `json:"leads_to"`
	RelatedID     string   `json:"related_id"`
	Context       string   `json:"context"`
	Foreshadowing bool     `json:"foreshadowing"`
	Tags          []string `json:"tags"`
	Revealed      bool     `json:"revealed"`
	AIGenerated   bool     `json:"ai_generated"`
	CampaignID    *string  `json:"campaign_id,omitempty"`
}

// GenerateRumorRequest represents the request to AI-generate rumors
type GenerateRumorRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	Count           int     `json:"count" binding:"required"`
	Veracity        string  `json:"veracity" binding:"required"`
	RumorType       string  `json:"rumor_type" binding:"required"`
	Urgency         string  `json:"urgency" binding:"required"`
	Scope           string  `json:"scope" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateRumorRequest represents the request to update a rumor
type UpdateRumorRequest struct {
	Text          string   `json:"text"`
	Source        string   `json:"source"`
	Veracity      string   `json:"veracity"`
	LeadsTo       string   `json:"leads_to"`
	RelatedID     string   `json:"related_id"`
	Context       string   `json:"context"`
	Foreshadowing *bool    `json:"foreshadowing"`
	Tags          []string `json:"tags"`
	Revealed      *bool    `json:"revealed"`
}

// CreateRumor creates a new rumor (called when user clicks Save)
func (h *RumorHandler) CreateRumor(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateRumorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert tags to JSON
	var tagsJSON json.RawMessage
	if req.Tags != nil {
		tags, err := json.Marshal(req.Tags)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tags format"})
			return
		}
		tagsJSON = tags
	}

	// Set pointers for optional fields
	var sourcePtr, leadsToPtr, relatedIDPtr, contextPtr *string
	var foreshadowingPtr *bool

	if req.Source != "" {
		sourcePtr = &req.Source
	}
	if req.LeadsTo != "" {
		leadsToPtr = &req.LeadsTo
	}
	if req.RelatedID != "" {
		relatedIDPtr = &req.RelatedID
	}
	if req.Context != "" {
		contextPtr = &req.Context
	}
	foreshadowingPtr = &req.Foreshadowing

	rumor := &db.Rumor{
		UserID:        userID,
		Text:          req.Text,
		Source:        sourcePtr,
		Veracity:      req.Veracity,
		LeadsTo:       leadsToPtr,
		RelatedID:     relatedIDPtr,
		Context:       contextPtr,
		Foreshadowing: foreshadowingPtr,
		Tags:          tagsJSON,
		Revealed:      req.Revealed,
		CampaignID:    req.CampaignID,
		AIGenerated:   req.AIGenerated,
	}

	if err := h.db.CreateRumor(c.Request.Context(), rumor); err != nil {
		h.logger.Error("Failed to create rumor", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create rumor"})
		return
	}

	c.JSON(http.StatusCreated, rumor)
}

// GenerateRumor generates rumors using AI (does NOT auto-save - matches Critter pattern)
func (h *RumorHandler) GenerateRumor(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateRumorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get settings to determine Ollama capability level
	settings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Warn("Failed to get settings, using default Ollama capability", zap.Error(err))
	}
	ollamaCapability := "standard" // default
	if settings != nil && settings.OllamaCapability != "" {
		ollamaCapability = settings.OllamaCapability
	}

	// Get campaign context if provided (for direct providers like Anthropic/OpenAI)
	var campaignContext *string
	var campaignIDStr *string
	if req.CampaignID != nil {
		// Pass campaign ID for Python proxy to fetch context itself
		campaignIDStr = req.CampaignID
		// Also fetch context for direct providers (Anthropic/OpenAI)
		ctx := GetCampaignContext(c.Request.Context(), req.CampaignID, h.summaryService, h.logger)
		if ctx != "" {
			campaignContext = &ctx
		}
	}

	// Get game system from user context
	gameSystem, _ := middleware.GetGameSystem(c)

	// Generate rumors using AI
	rumorsData, err := h.aiClient.GenerateRumors(c.Request.Context(), services.RumorGenerateRequest{
		Count:            req.Count,
		Veracity:         req.Veracity,
		RumorType:        req.RumorType,
		Urgency:          req.Urgency,
		Scope:            req.Scope,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate rumors", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate rumors"})
		return
	}

	// Extract rumors array from the map response
	rumors, _ := rumorsData["rumors"].([]interface{})
	rumorCount := len(rumors)

	// Return generated rumors WITHOUT saving - user will save via CreateRumor
	c.JSON(http.StatusOK, gin.H{
		"rumors": rumors,
		"count":  rumorCount,
	})
}

// ListRumors lists all rumors for a user
func (h *RumorHandler) ListRumors(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	rumors, err := h.db.ListRumorsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list rumors", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list rumors"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Rumor, 0)
		for _, r := range rumors {
			if r.CampaignID == nil {
				filtered = append(filtered, r)
			}
		}
		rumors = filtered
	}

	c.JSON(http.StatusOK, rumors)
}

// GetRumor retrieves a specific rumor
func (h *RumorHandler) GetRumor(c *gin.Context) {
	id := c.Param("id")

	rumor, err := h.db.GetRumorByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get rumor", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "rumor not found"})
		return
	}

	c.JSON(http.StatusOK, rumor)
}

// UpdateRumor updates a rumor
func (h *RumorHandler) UpdateRumor(c *gin.Context) {
	id := c.Param("id")

	rumor, err := h.db.GetRumorByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get rumor", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "rumor not found"})
		return
	}

	var req UpdateRumorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Text != "" {
		rumor.Text = req.Text
	}
	if req.Source != "" {
		rumor.Source = &req.Source
	}
	if req.Veracity != "" {
		rumor.Veracity = req.Veracity
	}
	if req.LeadsTo != "" {
		rumor.LeadsTo = &req.LeadsTo
	}
	if req.RelatedID != "" {
		rumor.RelatedID = &req.RelatedID
	}
	if req.Context != "" {
		rumor.Context = &req.Context
	}
	if req.Foreshadowing != nil {
		rumor.Foreshadowing = req.Foreshadowing
	}
	if req.Tags != nil {
		tags, _ := json.Marshal(req.Tags)
		rumor.Tags = tags
	}
	if req.Revealed != nil {
		rumor.Revealed = *req.Revealed
	}

	if err := h.db.UpdateRumor(c.Request.Context(), rumor); err != nil {
		h.logger.Error("Failed to update rumor", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update rumor"})
		return
	}

	c.JSON(http.StatusOK, rumor)
}

// DeleteRumor deletes a rumor
func (h *RumorHandler) DeleteRumor(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteRumor(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete rumor", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete rumor"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "rumor deleted"})
}

// AssignCampaign assigns a rumor to a campaign or Personal Library
func (h *RumorHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"rumor",
		h.db.GetRumorByID,
		func(r *db.Rumor) string { return r.UserID },
		func(r *db.Rumor, campaignID *string) { r.CampaignID = campaignID },
		h.db.UpdateRumor,
		h.logger,
	)
}
