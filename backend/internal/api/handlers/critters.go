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

// CritterHandler handles critter-related requests
type CritterHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewCritterHandler creates a new critter handler
func NewCritterHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *CritterHandler {
	return &CritterHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateCritterRequest represents the request to create a critter
type CreateCritterRequest struct {
	CampaignID         *string          `json:"campaign_id,omitempty"`
	Name               string           `json:"name" binding:"required"`
	Species            string           `json:"species"`
	CritterType        string           `json:"critter_type" binding:"required"`
	Size               string           `json:"size" binding:"required"`
	Temperament        string           `json:"temperament"`
	Habitat            string           `json:"habitat"`
	Description        string           `json:"description"`
	Behavior           string           `json:"behavior"`
	Stats              map[string]any   `json:"stats"`
	SpecialAbilities   []map[string]any `json:"special_abilities"`
	Uses               []string         `json:"uses"`
	TrainingDifficulty string           `json:"training_difficulty"`
	Diet               string           `json:"diet"`
	Lifespan           string           `json:"lifespan"`
	InterestingFacts   []string         `json:"interesting_facts"`
	EncounterNotes     string           `json:"encounter_notes"`
	AIGenerated        bool             `json:"ai_generated"`
}

// GenerateCritterRequest represents the request to AI-generate a critter
type GenerateCritterRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	CritterType     string  `json:"critter_type" binding:"required"`
	Size            string  `json:"size" binding:"required"`
	Temperament     string  `json:"temperament" binding:"required"`
	Habitat         string  `json:"habitat" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateCritterRequest represents the request to update a critter
type UpdateCritterRequest struct {
	Name               string           `json:"name"`
	Species            string           `json:"species"`
	CritterType        string           `json:"critter_type"`
	Size               string           `json:"size"`
	Temperament        string           `json:"temperament"`
	Habitat            string           `json:"habitat"`
	Description        string           `json:"description"`
	Behavior           string           `json:"behavior"`
	Stats              map[string]any   `json:"stats"`
	SpecialAbilities   []map[string]any `json:"special_abilities"`
	Uses               []string         `json:"uses"`
	TrainingDifficulty string           `json:"training_difficulty"`
	Diet               string           `json:"diet"`
	Lifespan           string           `json:"lifespan"`
	InterestingFacts   []string         `json:"interesting_facts"`
	EncounterNotes     string           `json:"encounter_notes"`
}

// CreateCritter creates a new critter
func (h *CritterHandler) CreateCritter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateCritterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Marshal JSON fields
	statsJSON, _ := json.Marshal(req.Stats)
	specialAbilitiesJSON, _ := json.Marshal(req.SpecialAbilities)
	usesJSON, _ := json.Marshal(req.Uses)
	interestingFactsJSON, _ := json.Marshal(req.InterestingFacts)

	critter := &db.Critter{
		UserID:             userID,
		CampaignID:         req.CampaignID,
		Name:               req.Name,
		Species:            &req.Species,
		CritterType:        req.CritterType,
		Size:               req.Size,
		Temperament:        &req.Temperament,
		Habitat:            &req.Habitat,
		Description:        &req.Description,
		Behavior:           &req.Behavior,
		Stats:              statsJSON,
		SpecialAbilities:   specialAbilitiesJSON,
		Uses:               usesJSON,
		TrainingDifficulty: &req.TrainingDifficulty,
		Diet:               &req.Diet,
		Lifespan:           &req.Lifespan,
		InterestingFacts:   interestingFactsJSON,
		EncounterNotes:     &req.EncounterNotes,
		AIGenerated:        req.AIGenerated,
	}

	if err := h.db.CreateCritter(c.Request.Context(), critter); err != nil {
		h.logger.Error("Failed to create critter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create critter"})
		return
	}

	c.JSON(http.StatusCreated, critter)
}

// GenerateCritter generates a critter using AI
func (h *CritterHandler) GenerateCritter(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateCritterRequest
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

	// Generate critter using AI
	critterData, err := h.aiClient.GenerateCritter(c.Request.Context(), services.CritterGenerationRequest{
		CritterType:      req.CritterType,
		Size:             req.Size,
		Temperament:      req.Temperament,
		Habitat:          req.Habitat,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate critter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate critter"})
		return
	}

	// Return the generated critter without saving
	c.JSON(http.StatusOK, gin.H{
		"critter": critterData,
	})
}

// GetCritter gets a critter by ID
func (h *CritterHandler) GetCritter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	critter, err := h.db.GetCritterByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get critter", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get critter"})
		return
	}

	if critter == nil || critter.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "critter not found"})
		return
	}

	c.JSON(http.StatusOK, critter)
}

// ListCritters lists all critters for the user
func (h *CritterHandler) ListCritters(c *gin.Context) {
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

	critters, err := h.db.ListCrittersByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list critters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list critters"})
		return
	}

	c.JSON(http.StatusOK, critters)
}

// ListCrittersByCampaign lists all critters for a specific campaign
func (h *CritterHandler) ListCrittersByCampaign(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")

	critters, err := h.db.ListCrittersByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list critters for campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list critters"})
		return
	}

	c.JSON(http.StatusOK, critters)
}

// UpdateCritter updates an existing critter
func (h *CritterHandler) UpdateCritter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing critter
	critter, err := h.db.GetCritterByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get critter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get critter"})
		return
	}

	if critter == nil || critter.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "critter not found"})
		return
	}

	var req UpdateCritterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		critter.Name = req.Name
	}
	if req.Species != "" {
		critter.Species = &req.Species
	}
	if req.CritterType != "" {
		critter.CritterType = req.CritterType
	}
	if req.Size != "" {
		critter.Size = req.Size
	}
	if req.Temperament != "" {
		critter.Temperament = &req.Temperament
	}
	if req.Habitat != "" {
		critter.Habitat = &req.Habitat
	}
	if req.Description != "" {
		critter.Description = &req.Description
	}
	if req.Behavior != "" {
		critter.Behavior = &req.Behavior
	}
	if req.Stats != nil {
		statsJSON, _ := json.Marshal(req.Stats)
		critter.Stats = statsJSON
	}
	if req.SpecialAbilities != nil {
		specialAbilitiesJSON, _ := json.Marshal(req.SpecialAbilities)
		critter.SpecialAbilities = specialAbilitiesJSON
	}
	if req.Uses != nil {
		usesJSON, _ := json.Marshal(req.Uses)
		critter.Uses = usesJSON
	}
	if req.TrainingDifficulty != "" {
		critter.TrainingDifficulty = &req.TrainingDifficulty
	}
	if req.Diet != "" {
		critter.Diet = &req.Diet
	}
	if req.Lifespan != "" {
		critter.Lifespan = &req.Lifespan
	}
	if req.InterestingFacts != nil {
		interestingFactsJSON, _ := json.Marshal(req.InterestingFacts)
		critter.InterestingFacts = interestingFactsJSON
	}
	if req.EncounterNotes != "" {
		critter.EncounterNotes = &req.EncounterNotes
	}

	if err := h.db.UpdateCritter(c.Request.Context(), critter); err != nil {
		h.logger.Error("Failed to update critter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update critter"})
		return
	}

	c.JSON(http.StatusOK, critter)
}

// DeleteCritter deletes a critter
func (h *CritterHandler) DeleteCritter(c *gin.Context) {
	HandleEntityDelete(
		c,
		"critter",
		h.db.GetCritterByID,
		func(critter *db.Critter) string { return critter.UserID },
		h.db.DeleteCritter,
		h.logger,
	)
}
