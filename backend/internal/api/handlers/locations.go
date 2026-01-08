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

// LocationHandler handles location-related requests
type LocationHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewLocationHandler creates a new location handler
func NewLocationHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *LocationHandler {
	return &LocationHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateLocationRequest represents the request to create a location
type CreateLocationRequest struct {
	Name        string   `json:"name" binding:"required"`
	Type        string   `json:"type" binding:"required"`
	Theme       string   `json:"theme"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
	Secrets     []string `json:"secrets"`
	Factions    []string `json:"factions"`
	NPCs        []string `json:"npcs"`
	Encounters  []string `json:"encounters"`
	Map         string   `json:"map"`
	ParentID    string   `json:"parent_id"`
	AIGenerated bool     `json:"ai_generated"`
	CampaignID  *string  `json:"campaign_id,omitempty"`
}

// GenerateLocationRequest represents the request to AI-generate a location
type GenerateLocationRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	Type            string  `json:"type" binding:"required"`
	Size            string  `json:"size" binding:"required"`
	DangerLevel     string  `json:"danger_level" binding:"required"`
	Theme           string  `json:"theme" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateLocationRequest represents the request to update a location
type UpdateLocationRequest struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Theme       string   `json:"theme"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
	Secrets     []string `json:"secrets"`
	Factions    []string `json:"factions"`
	NPCs        []string `json:"npcs"`
	Encounters  []string `json:"encounters"`
	Map         string   `json:"map"`
	ParentID    string   `json:"parent_id"`
}

// CreateLocation creates a new location
func (h *LocationHandler) CreateLocation(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert arrays to JSON
	var featuresJSON, secretsJSON, factionsJSON, npcsJSON, encountersJSON json.RawMessage
	if req.Features != nil {
		features, err := json.Marshal(req.Features)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid features format"})
			return
		}
		featuresJSON = features
	}
	if req.Secrets != nil {
		secrets, err := json.Marshal(req.Secrets)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid secrets format"})
			return
		}
		secretsJSON = secrets
	}
	if req.Factions != nil {
		factions, err := json.Marshal(req.Factions)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid factions format"})
			return
		}
		factionsJSON = factions
	}
	if req.NPCs != nil {
		npcs, err := json.Marshal(req.NPCs)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid npcs format"})
			return
		}
		npcsJSON = npcs
	}
	if req.Encounters != nil {
		encounters, err := json.Marshal(req.Encounters)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid encounters format"})
			return
		}
		encountersJSON = encounters
	}

	var themePtr, descPtr, mapPtr, parentIDPtr *string
	if req.Theme != "" {
		themePtr = &req.Theme
	}
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.Map != "" {
		mapPtr = &req.Map
	}
	if req.ParentID != "" {
		parentIDPtr = &req.ParentID
	}

	location := &db.Location{
		UserID:      userID,
		Name:        req.Name,
		Type:        req.Type,
		Theme:       themePtr,
		Description: descPtr,
		Features:    featuresJSON,
		Secrets:     secretsJSON,
		Factions:    factionsJSON,
		NPCs:        npcsJSON,
		Encounters:  encountersJSON,
		Map:         mapPtr,
		ParentID:    parentIDPtr,
		CampaignID:  req.CampaignID,
		AIGenerated: req.AIGenerated,
	}

	if err := h.db.CreateLocation(c.Request.Context(), location); err != nil {
		h.logger.Error("Failed to create location", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create location"})
		return
	}

	c.JSON(http.StatusCreated, location)
}

// GenerateLocation generates a location using AI
func (h *LocationHandler) GenerateLocation(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateLocationRequest
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

	// Generate location using AI
	locationData, err := h.aiClient.GenerateLocation(c.Request.Context(), services.LocationGenerateRequest{
		Type:             req.Type,
		Size:             req.Size,
		DangerLevel:      req.DangerLevel,
		Theme:            req.Theme,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate location", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate location"})
		return
	}

	// Return generated location without saving
	c.JSON(http.StatusOK, gin.H{
		"location": locationData,
	})
}

// ListLocations lists all locations for a user
func (h *LocationHandler) ListLocations(c *gin.Context) {
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

	locations, err := h.db.ListLocationsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list locations", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list locations"})
		return
	}

	c.JSON(http.StatusOK, locations)
}

// GetLocation retrieves a specific location
func (h *LocationHandler) GetLocation(c *gin.Context) {
	id := c.Param("id")

	location, err := h.db.GetLocationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get location", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "location not found"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// UpdateLocation updates a location
func (h *LocationHandler) UpdateLocation(c *gin.Context) {
	id := c.Param("id")

	// Get existing location
	location, err := h.db.GetLocationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get location", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "location not found"})
		return
	}

	var req UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		location.Name = req.Name
	}
	if req.Type != "" {
		location.Type = req.Type
	}
	if req.Theme != "" {
		location.Theme = &req.Theme
	}
	if req.Description != "" {
		location.Description = &req.Description
	}
	if req.Features != nil {
		features, _ := json.Marshal(req.Features)
		location.Features = features
	}
	if req.Secrets != nil {
		secrets, _ := json.Marshal(req.Secrets)
		location.Secrets = secrets
	}
	if req.Factions != nil {
		factions, _ := json.Marshal(req.Factions)
		location.Factions = factions
	}
	if req.NPCs != nil {
		npcs, _ := json.Marshal(req.NPCs)
		location.NPCs = npcs
	}
	if req.Encounters != nil {
		encounters, _ := json.Marshal(req.Encounters)
		location.Encounters = encounters
	}
	if req.Map != "" {
		location.Map = &req.Map
	}
	if req.ParentID != "" {
		location.ParentID = &req.ParentID
	}

	if err := h.db.UpdateLocation(c.Request.Context(), location); err != nil {
		h.logger.Error("Failed to update location", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update location"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// DeleteLocation deletes a location
func (h *LocationHandler) DeleteLocation(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteLocation(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete location", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete location"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "location deleted"})
}
