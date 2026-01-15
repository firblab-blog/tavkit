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

// MerchantHandler handles merchant-related requests
type MerchantHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewMerchantHandler creates a new merchant handler
func NewMerchantHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *MerchantHandler {
	return &MerchantHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateMerchantRequest represents the request to create a merchant
type CreateMerchantRequest struct {
	CampaignID        *string          `json:"campaign_id,omitempty"`
	Name              string           `json:"name" binding:"required"`
	ShopType          string           `json:"shop_type" binding:"required"`
	Atmosphere        string           `json:"atmosphere"`
	Description       string           `json:"description"`
	Location          string           `json:"location"`
	OwnerName         string           `json:"owner_name"`
	OwnerPersonality  string           `json:"owner_personality"`
	OwnerDescription  string           `json:"owner_description"`
	Inventory         []map[string]any `json:"inventory"`
	Services          []map[string]any `json:"services"`
	SpecialItems      []map[string]any `json:"special_items"`
	Rumors            []string         `json:"rumors"`
	RecentlySold      []string         `json:"recently_sold"`
	SpecialNotes      string           `json:"special_notes"`
	HaggleWillingness string           `json:"haggle_willingness"`
	AIGenerated       bool             `json:"ai_generated"`
}

// GenerateMerchantRequest represents the request to AI-generate a merchant
type GenerateMerchantRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	ShopType        string  `json:"shop_type" binding:"required"`
	Quality         string  `json:"quality" binding:"required"`
	Size            string  `json:"size" binding:"required"`
	PartyLevel      string  `json:"party_level"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateMerchantRequest represents the request to update a merchant
type UpdateMerchantRequest struct {
	Name              string           `json:"name"`
	ShopType          string           `json:"shop_type"`
	Atmosphere        string           `json:"atmosphere"`
	Description       string           `json:"description"`
	Location          string           `json:"location"`
	OwnerName         string           `json:"owner_name"`
	OwnerPersonality  string           `json:"owner_personality"`
	OwnerDescription  string           `json:"owner_description"`
	Inventory         []map[string]any `json:"inventory"`
	Services          []map[string]any `json:"services"`
	SpecialItems      []map[string]any `json:"special_items"`
	Rumors            []string         `json:"rumors"`
	RecentlySold      []string         `json:"recently_sold"`
	SpecialNotes      string           `json:"special_notes"`
	HaggleWillingness string           `json:"haggle_willingness"`
}

// CreateMerchant creates a new merchant
func (h *MerchantHandler) CreateMerchant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Marshal JSON fields
	inventoryJSON, _ := json.Marshal(req.Inventory)
	servicesJSON, _ := json.Marshal(req.Services)
	specialItemsJSON, _ := json.Marshal(req.SpecialItems)
	rumorsJSON, _ := json.Marshal(req.Rumors)
	recentlySoldJSON, _ := json.Marshal(req.RecentlySold)

	merchant := &db.Merchant{
		UserID:            userID,
		CampaignID:        req.CampaignID,
		Name:              req.Name,
		ShopType:          req.ShopType,
		Atmosphere:        &req.Atmosphere,
		Description:       &req.Description,
		Location:          &req.Location,
		OwnerName:         req.OwnerName,
		OwnerPersonality:  req.OwnerPersonality,
		OwnerDescription:  &req.OwnerDescription,
		Inventory:         inventoryJSON,
		Services:          servicesJSON,
		SpecialItems:      specialItemsJSON,
		Rumors:            rumorsJSON,
		RecentlySold:      recentlySoldJSON,
		SpecialNotes:      &req.SpecialNotes,
		HaggleWillingness: &req.HaggleWillingness,
		AIGenerated:       req.AIGenerated,
	}

	if err := h.db.CreateMerchant(c.Request.Context(), merchant); err != nil {
		h.logger.Error("Failed to create merchant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create merchant"})
		return
	}

	c.JSON(http.StatusCreated, merchant)
}

// GenerateMerchant generates a merchant using AI
func (h *MerchantHandler) GenerateMerchant(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateMerchantRequest
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

	// Get campaign context if provided
	campaignContext := GetCampaignContext(c.Request.Context(), req.CampaignID, h.summaryService, h.logger)

	// Get game system from user context
	gameSystem, _ := middleware.GetGameSystem(c)

	// Generate merchant using AI
	merchantData, err := h.aiClient.GenerateMerchant(c.Request.Context(), services.MerchantGenerationRequest{
		ShopType:         req.ShopType,
		Quality:          req.Quality,
		Size:             req.Size,
		PartyLevel:       req.PartyLevel,
		SpecialRequests:  req.SpecialRequests,
		CampaignContext:  campaignContext,
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate merchant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate merchant"})
		return
	}

	// Return the generated merchant without saving
	c.JSON(http.StatusOK, gin.H{
		"merchant": merchantData,
	})
}

// GetMerchant gets a merchant by ID
func (h *MerchantHandler) GetMerchant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	merchant, err := h.db.GetMerchantByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get merchant", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get merchant"})
		return
	}

	if merchant == nil || merchant.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "merchant not found"})
		return
	}

	c.JSON(http.StatusOK, merchant)
}

// ListMerchants lists all merchants for the user
func (h *MerchantHandler) ListMerchants(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	merchants, err := h.db.ListMerchantsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list merchants", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list merchants"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Merchant, 0)
		for _, m := range merchants {
			if m.CampaignID == nil {
				filtered = append(filtered, m)
			}
		}
		merchants = filtered
	}

	c.JSON(http.StatusOK, merchants)
}

// ListMerchantsByCampaign lists all merchants for a specific campaign
func (h *MerchantHandler) ListMerchantsByCampaign(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")

	merchants, err := h.db.ListMerchantsByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list merchants for campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list merchants"})
		return
	}

	c.JSON(http.StatusOK, merchants)
}

// UpdateMerchant updates an existing merchant
func (h *MerchantHandler) UpdateMerchant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing merchant
	merchant, err := h.db.GetMerchantByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get merchant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get merchant"})
		return
	}

	if merchant == nil || merchant.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "merchant not found"})
		return
	}

	var req UpdateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		merchant.Name = req.Name
	}
	if req.ShopType != "" {
		merchant.ShopType = req.ShopType
	}
	if req.Atmosphere != "" {
		merchant.Atmosphere = &req.Atmosphere
	}
	if req.Description != "" {
		merchant.Description = &req.Description
	}
	if req.Location != "" {
		merchant.Location = &req.Location
	}
	if req.OwnerName != "" {
		merchant.OwnerName = req.OwnerName
	}
	if req.OwnerPersonality != "" {
		merchant.OwnerPersonality = req.OwnerPersonality
	}
	if req.OwnerDescription != "" {
		merchant.OwnerDescription = &req.OwnerDescription
	}
	if req.Inventory != nil {
		inventoryJSON, _ := json.Marshal(req.Inventory)
		merchant.Inventory = inventoryJSON
	}
	if req.Services != nil {
		servicesJSON, _ := json.Marshal(req.Services)
		merchant.Services = servicesJSON
	}
	if req.SpecialItems != nil {
		specialItemsJSON, _ := json.Marshal(req.SpecialItems)
		merchant.SpecialItems = specialItemsJSON
	}
	if req.Rumors != nil {
		rumorsJSON, _ := json.Marshal(req.Rumors)
		merchant.Rumors = rumorsJSON
	}
	if req.RecentlySold != nil {
		recentlySoldJSON, _ := json.Marshal(req.RecentlySold)
		merchant.RecentlySold = recentlySoldJSON
	}
	if req.SpecialNotes != "" {
		merchant.SpecialNotes = &req.SpecialNotes
	}
	if req.HaggleWillingness != "" {
		merchant.HaggleWillingness = &req.HaggleWillingness
	}

	if err := h.db.UpdateMerchant(c.Request.Context(), merchant); err != nil {
		h.logger.Error("Failed to update merchant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update merchant"})
		return
	}

	c.JSON(http.StatusOK, merchant)
}

// DeleteMerchant deletes a merchant
func (h *MerchantHandler) DeleteMerchant(c *gin.Context) {
	HandleEntityDelete(
		c,
		"merchant",
		h.db.GetMerchantByID,
		func(m *db.Merchant) string { return m.UserID },
		h.db.DeleteMerchant,
		h.logger,
	)
}

// AssignCampaign assigns a merchant to a campaign or Personal Library
func (h *MerchantHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"merchant",
		h.db.GetMerchantByID,
		func(m *db.Merchant) string { return m.UserID },
		func(m *db.Merchant, campaignID *string) { m.CampaignID = campaignID },
		h.db.UpdateMerchant,
		h.logger,
	)
}
