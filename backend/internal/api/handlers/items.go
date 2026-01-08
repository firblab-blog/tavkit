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

// ItemHandler handles item-related requests
type ItemHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewItemHandler creates a new item handler
func NewItemHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *ItemHandler {
	return &ItemHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateItemRequest represents the request to create an item
type CreateItemRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Type          string                 `json:"type" binding:"required"`
	Rarity        string                 `json:"rarity"`
	Description   string                 `json:"description"`
	Properties    map[string]interface{} `json:"properties"`
	Origin        string                 `json:"origin"`
	PreviousOwner string                 `json:"previous_owner"`
	Complication  string                 `json:"complication"`
	Value         int                    `json:"value"`
	Weight        float64                `json:"weight"`
	Attunement    bool                   `json:"attunement"`
	LocationFound string                 `json:"location_found"`
	AIGenerated   bool                   `json:"ai_generated"`
	CampaignID    *string                `json:"campaign_id,omitempty"`
}

// GenerateItemRequest represents the request to AI-generate an item
type GenerateItemRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	Type            string  `json:"type" binding:"required"`
	Rarity          string  `json:"rarity" binding:"required"`
	Category        string  `json:"category" binding:"required"`
	Cursed          string  `json:"cursed"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateItemRequest represents the request to update an item
type UpdateItemRequest struct {
	Name          string                 `json:"name"`
	Type          string                 `json:"type"`
	Rarity        string                 `json:"rarity"`
	Description   string                 `json:"description"`
	Properties    map[string]interface{} `json:"properties"`
	Origin        string                 `json:"origin"`
	PreviousOwner string                 `json:"previous_owner"`
	Complication  string                 `json:"complication"`
	Value         *int                   `json:"value"`
	Weight        *float64               `json:"weight"`
	Attunement    *bool                  `json:"attunement"`
	LocationFound string                 `json:"location_found"`
}

// CreateItem creates a new item
func (h *ItemHandler) CreateItem(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert properties to JSON
	var propertiesJSON json.RawMessage
	if req.Properties != nil {
		properties, err := json.Marshal(req.Properties)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid properties format"})
			return
		}
		propertiesJSON = properties
	}

	// Set pointers for optional fields
	var rarityPtr, descPtr, originPtr, ownerPtr, compPtr, locationPtr *string
	var valuePtr *int
	var weightPtr *float64
	var attunementPtr *bool

	if req.Rarity != "" {
		rarityPtr = &req.Rarity
	}
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.Origin != "" {
		originPtr = &req.Origin
	}
	if req.PreviousOwner != "" {
		ownerPtr = &req.PreviousOwner
	}
	if req.Complication != "" {
		compPtr = &req.Complication
	}
	if req.Value > 0 {
		valuePtr = &req.Value
	}
	if req.Weight > 0 {
		weightPtr = &req.Weight
	}
	attunementPtr = &req.Attunement
	if req.LocationFound != "" {
		locationPtr = &req.LocationFound
	}

	item := &db.Item{
		UserID:        userID,
		Name:          req.Name,
		Type:          req.Type,
		Rarity:        rarityPtr,
		Description:   descPtr,
		Properties:    propertiesJSON,
		Origin:        originPtr,
		PreviousOwner: ownerPtr,
		Complication:  compPtr,
		Value:         valuePtr,
		Weight:        weightPtr,
		Attunement:    attunementPtr,
		LocationFound: locationPtr,
		CampaignID:    req.CampaignID,
		AIGenerated:   req.AIGenerated,
	}

	if err := h.db.CreateItem(c.Request.Context(), item); err != nil {
		h.logger.Error("Failed to create item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create item"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// GenerateItem generates an item using AI
func (h *ItemHandler) GenerateItem(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateItemRequest
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

	// Generate item using AI
	itemData, err := h.aiClient.GenerateItem(c.Request.Context(), services.ItemGenerateRequest{
		Type:             req.Type,
		Rarity:           req.Rarity,
		Category:         req.Category,
		Cursed:           req.Cursed,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate item"})
		return
	}

	// Return generated item without saving
	c.JSON(http.StatusOK, gin.H{
		"item": itemData,
	})
}

// ListItems lists all items for a user
func (h *ItemHandler) ListItems(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	items, err := h.db.ListItemsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list items", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list items"})
		return
	}

	c.JSON(http.StatusOK, items)
}

// GetItem retrieves a specific item
func (h *ItemHandler) GetItem(c *gin.Context) {
	id := c.Param("id")

	item, err := h.db.GetItemByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get item", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// UpdateItem updates an item
func (h *ItemHandler) UpdateItem(c *gin.Context) {
	id := c.Param("id")

	item, err := h.db.GetItemByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get item", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	var req UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		item.Name = req.Name
	}
	if req.Type != "" {
		item.Type = req.Type
	}
	if req.Rarity != "" {
		item.Rarity = &req.Rarity
	}
	if req.Description != "" {
		item.Description = &req.Description
	}
	if req.Properties != nil {
		properties, _ := json.Marshal(req.Properties)
		item.Properties = properties
	}
	if req.Origin != "" {
		item.Origin = &req.Origin
	}
	if req.PreviousOwner != "" {
		item.PreviousOwner = &req.PreviousOwner
	}
	if req.Complication != "" {
		item.Complication = &req.Complication
	}
	if req.Value != nil {
		item.Value = req.Value
	}
	if req.Weight != nil {
		item.Weight = req.Weight
	}
	if req.Attunement != nil {
		item.Attunement = req.Attunement
	}
	if req.LocationFound != "" {
		item.LocationFound = &req.LocationFound
	}

	if err := h.db.UpdateItem(c.Request.Context(), item); err != nil {
		h.logger.Error("Failed to update item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update item"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteItem deletes an item
func (h *ItemHandler) DeleteItem(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteItem(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete item", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "item deleted"})
}
