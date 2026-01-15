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

type EncounterHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

func NewEncounterHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *EncounterHandler {
	return &EncounterHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

type CreateEncounterRequest struct {
	Name        string                 `json:"name" binding:"required"`
	PartyLevel  int                    `json:"party_level" binding:"required"`
	PartySize   int                    `json:"party_size" binding:"required"`
	Difficulty  string                 `json:"difficulty"`
	Description string                 `json:"description"`
	Environment map[string]interface{} `json:"environment"`
	Creatures   interface{}            `json:"creatures" binding:"required"`
	Treasure    map[string]interface{} `json:"treasure"`
	XPTotal     int                    `json:"xp_total"`
	XPPerPlayer float64                `json:"xp_per_player"`
	Notes       string                 `json:"notes"`
	CampaignID  *string                `json:"campaign_id,omitempty"`
}

type GenerateEncounterRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	PartyLevel      int     `json:"party_level" binding:"required"`
	PartySize       int     `json:"party_size" binding:"required"`
	Difficulty      string  `json:"difficulty" binding:"required"`
	Environment     string  `json:"environment" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// CreateEncounter creates a new encounter (called when user clicks Save)
func (h *EncounterHandler) CreateEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateEncounterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert JSON fields
	var environmentJSON json.RawMessage
	if req.Environment != nil {
		env, err := json.Marshal(req.Environment)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid environment format"})
			return
		}
		environmentJSON = env
	}

	creaturesJSON, err := json.Marshal(req.Creatures)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid creatures format"})
		return
	}

	var treasureJSON json.RawMessage
	if req.Treasure != nil {
		treasure, err := json.Marshal(req.Treasure)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid treasure format"})
			return
		}
		treasureJSON = treasure
	}

	encounter := &db.Encounter{
		UserID:      userID,
		Name:        req.Name,
		PartyLevel:  req.PartyLevel,
		PartySize:   req.PartySize,
		Difficulty:  req.Difficulty,
		Description: &req.Description,
		Environment: environmentJSON,
		Creatures:   creaturesJSON,
		Treasure:    treasureJSON,
		XPTotal:     req.XPTotal,
		XPPerPlayer: req.XPPerPlayer,
		Notes:       &req.Notes,
		CampaignID:  req.CampaignID,
		AIGenerated: true,
	}

	if err := h.db.CreateEncounter(c.Request.Context(), encounter); err != nil {
		h.logger.Error("Failed to create encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create encounter"})
		return
	}

	c.JSON(http.StatusCreated, encounter)
}

// GenerateEncounter generates an encounter using AI (does NOT auto-save - matches Critter pattern)
func (h *EncounterHandler) GenerateEncounter(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateEncounterRequest
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

	// Generate encounter using AI
	encounterData, err := h.aiClient.GenerateEncounter(c.Request.Context(), services.EncounterGenerateRequest{
		PartyLevel:       req.PartyLevel,
		PartySize:        req.PartySize,
		Difficulty:       req.Difficulty,
		Environment:      req.Environment,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate encounter"})
		return
	}

	// Return generated encounter WITHOUT saving - user will save via CreateEncounter
	c.JSON(http.StatusOK, gin.H{
		"encounter": encounterData,
	})
}

// GetEncounter gets an encounter by ID
func (h *EncounterHandler) GetEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	encounterID := c.Param("id")
	encounter, err := h.db.GetEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "encounter not found"})
		return
	}

	// Check ownership
	if encounter.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// ListEncounters lists all encounters for current user
func (h *EncounterHandler) ListEncounters(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	encounters, err := h.db.ListEncountersByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list encounters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list encounters"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Encounter, 0)
		for _, e := range encounters {
			if e.CampaignID == nil {
				filtered = append(filtered, e)
			}
		}
		encounters = filtered
	}

	c.JSON(http.StatusOK, gin.H{"encounters": encounters})
}

// DeleteEncounter deletes an encounter
func (h *EncounterHandler) DeleteEncounter(c *gin.Context) {
	HandleEntityDelete(
		c,
		"encounter",
		h.db.GetEncounterByID,
		func(encounter *db.Encounter) string { return encounter.UserID },
		h.db.DeleteEncounter,
		h.logger,
	)
}

// AssignCampaign assigns an encounter to a campaign or Personal Library
func (h *EncounterHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"encounter",
		h.db.GetEncounterByID,
		func(e *db.Encounter) string { return e.UserID },
		func(e *db.Encounter, campaignID *string) { e.CampaignID = campaignID },
		h.db.UpdateEncounter,
		h.logger,
	)
}
