package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ChaseHandler handles chase-related requests
type ChaseHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewChaseHandler creates a new chase handler
func NewChaseHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *ChaseHandler {
	return &ChaseHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateChaseRequest represents the request to create a chase
type CreateChaseRequest struct {
	CampaignID           *string          `json:"campaign_id,omitempty"`
	Name                 string           `json:"name" binding:"required"`
	ChaseType            string           `json:"chase_type" binding:"required"`
	Terrain              string           `json:"terrain" binding:"required"`
	Difficulty           string           `json:"difficulty" binding:"required"`
	Description          string           `json:"description"`
	Setting              string           `json:"setting"`
	Participants         map[string]any   `json:"participants"`
	StartingConditions   string           `json:"starting_conditions"`
	Obstacles            []map[string]any `json:"obstacles"`
	Complications        []string         `json:"complications"`
	Shortcuts            []map[string]any `json:"shortcuts"`
	ChasePhases          []map[string]any `json:"chase_phases"`
	EndingConditions     map[string]any   `json:"ending_conditions"`
	Rewards              map[string]any   `json:"rewards"`
	SpecialRules         string           `json:"special_rules"`
	EnvironmentalFactors []string         `json:"environmental_factors"`
	AIGenerated          bool             `json:"ai_generated"`
}

// GenerateChaseRequest represents the request to AI-generate a chase
type GenerateChaseRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	ChaseType       string  `json:"chase_type" binding:"required"`
	Terrain         string  `json:"terrain" binding:"required"`
	Difficulty      string  `json:"difficulty" binding:"required"`
	PartyLevel      string  `json:"party_level"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateChaseRequest represents the request to update a chase
type UpdateChaseRequest struct {
	Name                 string           `json:"name"`
	ChaseType            string           `json:"chase_type"`
	Terrain              string           `json:"terrain"`
	Difficulty           string           `json:"difficulty"`
	Description          string           `json:"description"`
	Setting              string           `json:"setting"`
	Status               string           `json:"status"`
	CurrentRound         *int             `json:"current_round"`
	Outcome              string           `json:"outcome"`
	StartingDistance     *int             `json:"starting_distance"`
	Participants         map[string]any   `json:"participants"`
	StartingConditions   string           `json:"starting_conditions"`
	Obstacles            []map[string]any `json:"obstacles"`
	Complications        []string         `json:"complications"`
	Shortcuts            []map[string]any `json:"shortcuts"`
	ChasePhases          []map[string]any `json:"chase_phases"`
	EndingConditions     map[string]any   `json:"ending_conditions"`
	Rewards              map[string]any   `json:"rewards"`
	SpecialRules         string           `json:"special_rules"`
	EnvironmentalFactors []string         `json:"environmental_factors"`
}

// CreateChase creates a new chase
func (h *ChaseHandler) CreateChase(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateChaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert JSON fields
	participantsJSON, _ := json.Marshal(req.Participants)
	obstaclesJSON, _ := json.Marshal(req.Obstacles)
	complicationsJSON, _ := json.Marshal(req.Complications)
	shortcutsJSON, _ := json.Marshal(req.Shortcuts)
	chasePhasesJSON, _ := json.Marshal(req.ChasePhases)
	endingConditionsJSON, _ := json.Marshal(req.EndingConditions)
	rewardsJSON, _ := json.Marshal(req.Rewards)
	environmentalFactorsJSON, _ := json.Marshal(req.EnvironmentalFactors)

	chase := &db.Chase{
		UserID:               userID,
		CampaignID:           req.CampaignID,
		Name:                 req.Name,
		ChaseType:            req.ChaseType,
		Terrain:              req.Terrain,
		Difficulty:           req.Difficulty,
		Description:          &req.Description,
		Setting:              &req.Setting,
		Participants:         participantsJSON,
		StartingConditions:   &req.StartingConditions,
		Obstacles:            obstaclesJSON,
		Complications:        complicationsJSON,
		Shortcuts:            shortcutsJSON,
		ChasePhases:          chasePhasesJSON,
		EndingConditions:     endingConditionsJSON,
		Rewards:              rewardsJSON,
		SpecialRules:         &req.SpecialRules,
		EnvironmentalFactors: environmentalFactorsJSON,
		AIGenerated:          req.AIGenerated,
		Status:               "setup", // Default status for new chases
	}

	if err := h.db.CreateChase(c.Request.Context(), chase); err != nil {
		h.logger.Error("Failed to create chase", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create chase"})
		return
	}

	c.JSON(http.StatusCreated, chase)
}

// GenerateChase generates a chase using AI
func (h *ChaseHandler) GenerateChase(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateChaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get settings to determine Ollama capability level and timeout
	settings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Warn("Failed to get settings, using defaults", zap.Error(err))
		settings = &db.Settings{AITimeoutSeconds: 300, OllamaCapability: "standard"}
	}
	ollamaCapability := "standard" // default
	if settings != nil && settings.OllamaCapability != "" {
		ollamaCapability = settings.OllamaCapability
	}

	// Determine timeout: use request timeout if provided, otherwise use settings
	timeoutSeconds := settings.AITimeoutSeconds
	if req.Timeout != nil && *req.Timeout > 0 {
		timeoutSeconds = *req.Timeout
	}

	// Create a context with configured timeout (decoupled from HTTP request context)
	// Add 30s buffer for HTTP client operations
	aiCtx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds+30)*time.Second)
	defer cancel()

	// Get campaign context if provided
	campaignContext := GetCampaignContext(aiCtx, req.CampaignID, h.summaryService, h.logger)

	// Get game system from user context
	gameSystem, _ := middleware.GetGameSystem(c)

	h.logger.Info("Generating chase with timeout",
		zap.Int("timeout_seconds", timeoutSeconds),
		zap.String("chase_type", req.ChaseType))

	// Generate chase using AI
	chaseData, err := h.aiClient.GenerateChase(aiCtx, services.ChaseGenerationRequest{
		ChaseType:        req.ChaseType,
		Terrain:          req.Terrain,
		Difficulty:       req.Difficulty,
		PartyLevel:       req.PartyLevel,
		SpecialRequests:  req.SpecialRequests,
		CampaignContext:  campaignContext,
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate chase", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate chase"})
		return
	}

	// Return the generated chase without saving
	c.JSON(http.StatusOK, gin.H{
		"chase": chaseData,
	})
}

// GetChase gets a chase by ID
func (h *ChaseHandler) GetChase(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	chase, err := h.db.GetChaseByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get chase", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get chase"})
		return
	}

	if chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	c.JSON(http.StatusOK, chase)
}

// ListChases lists all chases for the user
func (h *ChaseHandler) ListChases(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	chases, err := h.db.ListChasesByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list chases", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list chases"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Chase, 0)
		for _, ch := range chases {
			if ch.CampaignID == nil {
				filtered = append(filtered, ch)
			}
		}
		chases = filtered
	}

	c.JSON(http.StatusOK, chases)
}

// ListChasesByCampaign lists all chases for a specific campaign
func (h *ChaseHandler) ListChasesByCampaign(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")

	chases, err := h.db.ListChasesByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list chases for campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list chases"})
		return
	}

	// Filter to only chases the user owns
	var userChases []*db.Chase
	for _, chase := range chases {
		if chase.UserID == userID {
			userChases = append(userChases, chase)
		}
	}

	c.JSON(http.StatusOK, userChases)
}

// UpdateChase updates an existing chase
func (h *ChaseHandler) UpdateChase(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing chase
	chase, err := h.db.GetChaseByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get chase", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get chase"})
		return
	}

	if chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	var req UpdateChaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		chase.Name = req.Name
	}
	if req.ChaseType != "" {
		chase.ChaseType = req.ChaseType
	}
	if req.Terrain != "" {
		chase.Terrain = req.Terrain
	}
	if req.Difficulty != "" {
		chase.Difficulty = req.Difficulty
	}
	if req.Description != "" {
		chase.Description = &req.Description
	}
	if req.Setting != "" {
		chase.Setting = &req.Setting
	}
	if req.StartingConditions != "" {
		chase.StartingConditions = &req.StartingConditions
	}
	if req.SpecialRules != "" {
		chase.SpecialRules = &req.SpecialRules
	}
	if req.Status != "" {
		chase.Status = req.Status
	}
	if req.CurrentRound != nil {
		chase.CurrentRound = *req.CurrentRound
	}
	if req.Outcome != "" {
		chase.Outcome = &req.Outcome
	}
	if req.StartingDistance != nil {
		chase.StartingDistance = *req.StartingDistance
	}

	// Update JSON fields
	if req.Participants != nil {
		participantsJSON, _ := json.Marshal(req.Participants)
		chase.Participants = participantsJSON
	}
	if req.Obstacles != nil {
		obstaclesJSON, _ := json.Marshal(req.Obstacles)
		chase.Obstacles = obstaclesJSON
	}
	if req.Complications != nil {
		complicationsJSON, _ := json.Marshal(req.Complications)
		chase.Complications = complicationsJSON
	}
	if req.Shortcuts != nil {
		shortcutsJSON, _ := json.Marshal(req.Shortcuts)
		chase.Shortcuts = shortcutsJSON
	}
	if req.ChasePhases != nil {
		chasePhasesJSON, _ := json.Marshal(req.ChasePhases)
		chase.ChasePhases = chasePhasesJSON
	}
	if req.EndingConditions != nil {
		endingConditionsJSON, _ := json.Marshal(req.EndingConditions)
		chase.EndingConditions = endingConditionsJSON
	}
	if req.Rewards != nil {
		rewardsJSON, _ := json.Marshal(req.Rewards)
		chase.Rewards = rewardsJSON
	}
	if req.EnvironmentalFactors != nil {
		environmentalFactorsJSON, _ := json.Marshal(req.EnvironmentalFactors)
		chase.EnvironmentalFactors = environmentalFactorsJSON
	}

	if err := h.db.UpdateChase(c.Request.Context(), chase); err != nil {
		h.logger.Error("Failed to update chase", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update chase"})
		return
	}

	c.JSON(http.StatusOK, chase)
}

// DeleteChase deletes a chase
func (h *ChaseHandler) DeleteChase(c *gin.Context) {
	HandleEntityDelete(
		c,
		"chase",
		h.db.GetChaseByID,
		func(chase *db.Chase) string { return chase.UserID },
		h.db.DeleteChase,
		h.logger,
	)
}

// AssignCampaign assigns a chase to a campaign or Personal Library
func (h *ChaseHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"chase",
		h.db.GetChaseByID,
		func(ch *db.Chase) string { return ch.UserID },
		func(ch *db.Chase, campaignID *string) { ch.CampaignID = campaignID },
		h.db.UpdateChase,
		h.logger,
	)
}

// =====================
// Participant Handlers
// =====================

// CreateParticipantRequest represents the request to create a chase participant
type CreateParticipantRequest struct {
	ChaseID           string   `json:"chase_id" binding:"required"`
	Name              string   `json:"name" binding:"required"`
	Role              string   `json:"role" binding:"required"`             // "pursuer" or "quarry"
	ParticipantType   string   `json:"participant_type" binding:"required"` // "pc" or "npc"
	CharacterID       *string  `json:"character_id,omitempty"`
	NPCID             *string  `json:"npc_id,omitempty"`
	CurrentPosition   int      `json:"current_position"`
	MovementSpeed     int      `json:"movement_speed" binding:"required"`
	Stamina           int      `json:"stamina" binding:"required"`
	MaxStamina        int      `json:"max_stamina" binding:"required"`
	HasDashed         bool     `json:"has_dashed"`
	MovementThisRound int      `json:"movement_this_round"`
	Conditions        []string `json:"conditions"`
}

// UpdateParticipantRequest represents the request to update a participant
type UpdateParticipantRequest struct {
	CurrentPosition   *int     `json:"current_position,omitempty"`
	MovementSpeed     *int     `json:"movement_speed,omitempty"`
	Stamina           *int     `json:"stamina,omitempty"`
	HasDashed         *bool    `json:"has_dashed,omitempty"`
	MovementThisRound *int     `json:"movement_this_round,omitempty"`
	Conditions        []string `json:"conditions,omitempty"`
}

// CreateChaseParticipant creates a new chase participant
func (h *ChaseHandler) CreateChaseParticipant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), req.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	// Convert conditions to JSON
	conditionsJSON, _ := json.Marshal(req.Conditions)

	participant := &db.ChaseParticipant{
		ChaseID:           req.ChaseID,
		Name:              req.Name,
		Role:              req.Role,
		ParticipantType:   req.ParticipantType,
		CharacterID:       req.CharacterID,
		NPCID:             req.NPCID,
		CurrentPosition:   req.CurrentPosition,
		MovementSpeed:     req.MovementSpeed,
		Stamina:           req.Stamina,
		MaxStamina:        req.MaxStamina,
		HasDashed:         req.HasDashed,
		MovementThisRound: req.MovementThisRound,
		Conditions:        conditionsJSON,
	}

	if err := h.db.CreateChaseParticipant(c.Request.Context(), participant); err != nil {
		h.logger.Error("Failed to create chase participant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create participant"})
		return
	}

	c.JSON(http.StatusCreated, participant)
}

// GetChaseParticipant gets a participant by ID
func (h *ChaseHandler) GetChaseParticipant(c *gin.Context) {
	HandleChaseSubEntityGet(
		c,
		"participant",
		"participant_id",
		h.db.GetChaseParticipantByID,
		func(p *db.ChaseParticipant) string { return p.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// ListChaseParticipants lists all participants for a chase
func (h *ChaseHandler) ListChaseParticipants(c *gin.Context) {
	HandleChaseSubEntityList(
		c,
		"participants",
		h.db.ListChaseParticipants,
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// UpdateChaseParticipant updates a participant
func (h *ChaseHandler) UpdateChaseParticipant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("participant_id")

	// Get existing participant
	participant, err := h.db.GetChaseParticipantByID(c.Request.Context(), id)
	if err != nil || participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant not found"})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), participant.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant not found"})
		return
	}

	var req UpdateParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.CurrentPosition != nil {
		participant.CurrentPosition = *req.CurrentPosition
	}
	if req.MovementSpeed != nil {
		participant.MovementSpeed = *req.MovementSpeed
	}
	if req.Stamina != nil {
		participant.Stamina = *req.Stamina
	}
	if req.HasDashed != nil {
		participant.HasDashed = *req.HasDashed
	}
	if req.MovementThisRound != nil {
		participant.MovementThisRound = *req.MovementThisRound
	}
	if req.Conditions != nil {
		conditionsJSON, _ := json.Marshal(req.Conditions)
		participant.Conditions = conditionsJSON
	}

	if err := h.db.UpdateChaseParticipant(c.Request.Context(), participant); err != nil {
		h.logger.Error("Failed to update participant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update participant"})
		return
	}

	c.JSON(http.StatusOK, participant)
}

// DeleteChaseParticipant deletes a participant
func (h *ChaseHandler) DeleteChaseParticipant(c *gin.Context) {
	HandleChaseSubEntityDelete(
		c,
		"participant",
		"participant_id",
		h.db.GetChaseParticipantByID,
		func(p *db.ChaseParticipant) string { return p.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.db.DeleteChaseParticipant,
		h.logger,
	)
}

// =====================
// Challenge Handlers
// =====================

// CreateChallengeRequest represents the request to create a chase challenge
type CreateChallengeRequest struct {
	ChaseID         string   `json:"chase_id" binding:"required"`
	Round           int      `json:"round" binding:"required"`
	Description     string   `json:"description" binding:"required"`
	Skill           string   `json:"skill" binding:"required"`
	DC              int      `json:"dc" binding:"required"`
	AlternateSkills []string `json:"alternate_skills"`
	SuccessEffect   string   `json:"success_effect" binding:"required"`
	FailureEffect   string   `json:"failure_effect" binding:"required"`
}

// CreateChaseChallenge creates a new chase challenge
func (h *ChaseHandler) CreateChaseChallenge(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), req.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	// Convert alternate skills to JSON
	alternateSkillsJSON, _ := json.Marshal(req.AlternateSkills)

	challenge := &db.ChaseChallenge{
		ChaseID:         req.ChaseID,
		Round:           req.Round,
		Description:     req.Description,
		Skill:           req.Skill,
		DC:              req.DC,
		AlternateSkills: alternateSkillsJSON,
		SuccessEffect:   req.SuccessEffect,
		FailureEffect:   req.FailureEffect,
	}

	if err := h.db.CreateChaseChallenge(c.Request.Context(), challenge); err != nil {
		h.logger.Error("Failed to create chase challenge", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create challenge"})
		return
	}

	c.JSON(http.StatusCreated, challenge)
}

// ListChaseChallenges lists all challenges for a chase
func (h *ChaseHandler) ListChaseChallenges(c *gin.Context) {
	HandleChaseSubEntityList(
		c,
		"challenges",
		h.db.ListChaseChallenges,
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// GetChaseChallenge gets a challenge by ID
func (h *ChaseHandler) GetChaseChallenge(c *gin.Context) {
	HandleChaseSubEntityGet(
		c,
		"challenge",
		"challenge_id",
		h.db.GetChaseChallengeByID,
		func(ch *db.ChaseChallenge) string { return ch.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// DeleteChaseChallenge deletes a challenge
func (h *ChaseHandler) DeleteChaseChallenge(c *gin.Context) {
	HandleChaseSubEntityDelete(
		c,
		"challenge",
		"challenge_id",
		h.db.GetChaseChallengeByID,
		func(ch *db.ChaseChallenge) string { return ch.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.db.DeleteChaseChallenge,
		h.logger,
	)
}

// =====================
// Complication Handlers
// =====================

// CreateComplicationRequest represents the request to create a chase complication
type CreateComplicationRequest struct {
	ChaseID          string  `json:"chase_id" binding:"required"`
	Round            int     `json:"round" binding:"required"`
	ComplicationType string  `json:"complication_type" binding:"required"`
	Description      string  `json:"description" binding:"required"`
	Severity         string  `json:"severity" binding:"required"`
	AffectsRole      string  `json:"affects_role"`
	SaveAbility      *string `json:"save_ability,omitempty"`
	SaveDC           *int    `json:"save_dc,omitempty"`
	SuccessEffect    *string `json:"success_effect,omitempty"`
	FailureEffect    *string `json:"failure_effect,omitempty"`
	Notes            *string `json:"notes,omitempty"`
}

// CreateChaseComplication creates a new chase complication
func (h *ChaseHandler) CreateChaseComplication(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateComplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), req.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	complication := &db.ChaseComplication{
		ChaseID:          req.ChaseID,
		Round:            req.Round,
		ComplicationType: req.ComplicationType,
		Description:      req.Description,
		Effect:           req.SuccessEffect,
		SaveAbility:      req.SaveAbility,
		SaveDC:           req.SaveDC,
		Resolved:         false,
	}

	if err := h.db.CreateChaseComplication(c.Request.Context(), complication); err != nil {
		h.logger.Error("Failed to create chase complication", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create complication"})
		return
	}

	c.JSON(http.StatusCreated, complication)
}

// ListChaseComplications lists all complications for a chase
func (h *ChaseHandler) ListChaseComplications(c *gin.Context) {
	HandleChaseSubEntityList(
		c,
		"complications",
		h.db.ListChaseComplications,
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// GetChaseComplication gets a complication by ID
func (h *ChaseHandler) GetChaseComplication(c *gin.Context) {
	HandleChaseSubEntityGet(
		c,
		"complication",
		"complication_id",
		h.db.GetChaseComplicationByID,
		func(co *db.ChaseComplication) string { return co.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.logger,
	)
}

// ResolveChaseComplication marks a complication as resolved
func (h *ChaseHandler) ResolveChaseComplication(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("complication_id")

	// Get existing complication
	complication, err := h.db.GetChaseComplicationByID(c.Request.Context(), id)
	if err != nil || complication == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "complication not found"})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), complication.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "complication not found"})
		return
	}

	complication.Resolved = true
	if err := h.db.UpdateChaseComplication(c.Request.Context(), complication); err != nil {
		h.logger.Error("Failed to resolve complication", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve complication"})
		return
	}

	c.JSON(http.StatusOK, complication)
}

// DeleteChaseComplication deletes a complication
func (h *ChaseHandler) DeleteChaseComplication(c *gin.Context) {
	HandleChaseSubEntityDelete(
		c,
		"complication",
		"complication_id",
		h.db.GetChaseComplicationByID,
		func(co *db.ChaseComplication) string { return co.ChaseID },
		h.db.GetChaseByIDWithInterface,
		h.db.DeleteChaseComplication,
		h.logger,
	)
}

// =====================
// Event Handlers
// =====================

// CreateEventRequest represents the request to create a chase event
type CreateEventRequest struct {
	ChaseID       string          `json:"chase_id" binding:"required"`
	Round         int             `json:"round" binding:"required"`
	EventType     string          `json:"event_type" binding:"required"`
	ParticipantID *string         `json:"participant_id,omitempty"`
	Description   string          `json:"description" binding:"required"`
	Details       json.RawMessage `json:"details,omitempty"`
}

// CreateChaseEvent creates a new chase event
func (h *ChaseHandler) CreateChaseEvent(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), req.ChaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	event := &db.ChaseEvent{
		ChaseID:         req.ChaseID,
		Round:           req.Round,
		ParticipantName: req.ParticipantID,
		Action:          req.EventType,
		Effect:          req.Description,
	}

	if err := h.db.CreateChaseEvent(c.Request.Context(), event); err != nil {
		h.logger.Error("Failed to create chase event", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// ListChaseEvents lists all events for a chase
func (h *ChaseHandler) ListChaseEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	chaseID := c.Param("id")

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), chaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	events, err := h.db.ListChaseEvents(c.Request.Context(), chaseID)
	if err != nil {
		h.logger.Error("Failed to list events", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list events"})
		return
	}

	c.JSON(http.StatusOK, events)
}

// DeleteChaseEvents deletes all events for a chase (used when re-running)
func (h *ChaseHandler) DeleteChaseEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	chaseID := c.Param("id")

	// Verify chase belongs to user
	chase, err := h.db.GetChaseByID(c.Request.Context(), chaseID)
	if err != nil || chase == nil || chase.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "chase not found"})
		return
	}

	if err := h.db.DeleteChaseEventsByChaseID(c.Request.Context(), chaseID); err != nil {
		h.logger.Error("Failed to delete events", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "events deleted successfully"})
}

// =====================
// Template Handlers
// =====================

// CreateTemplateRequest represents the request to create a chase template
type CreateTemplateRequest struct {
	Name               string           `json:"name" binding:"required"`
	Description        string           `json:"description"`
	ChaseType          string           `json:"chase_type" binding:"required"`
	Terrain            string           `json:"terrain" binding:"required"`
	Difficulty         string           `json:"difficulty" binding:"required"`
	RecommendedLevel   string           `json:"recommended_level"`
	ChallengePool      []map[string]any `json:"challenge_pool"`
	ComplicationPool   []map[string]any `json:"complication_pool"`
	DefaultSettings    json.RawMessage  `json:"default_settings,omitempty"`
	PresetParticipants []map[string]any `json:"preset_participants"`
	TipsAndGuidance    *string          `json:"tips_and_guidance,omitempty"`
}

// CreateChaseTemplate creates a new chase template
func (h *ChaseHandler) CreateChaseTemplate(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert JSON fields
	challengePoolJSON, _ := json.Marshal(req.ChallengePool)
	complicationPoolJSON, _ := json.Marshal(req.ComplicationPool)

	terrainPtr := &req.Terrain
	difficultyPtr := &req.Difficulty

	template := &db.ChaseTemplate{
		Name:          req.Name,
		Description:   &req.Description,
		ChaseType:     req.ChaseType,
		Terrain:       terrainPtr,
		Difficulty:    difficultyPtr,
		Challenges:    challengePoolJSON,
		Complications: complicationPoolJSON,
		IsPublic:      false,
		CreatedBy:     &userID,
	}

	if err := h.db.CreateChaseTemplate(c.Request.Context(), template); err != nil {
		h.logger.Error("Failed to create chase template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// GetChaseTemplate gets a template by ID
func (h *ChaseHandler) GetChaseTemplate(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("template_id")
	template, err := h.db.GetChaseTemplateByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get template"})
		return
	}

	if template == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}

	// Only allow access if template is public or belongs to user
	if !template.IsPublic && (template.CreatedBy == nil || *template.CreatedBy != userID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// ListChaseTemplates lists available templates
func (h *ChaseHandler) ListChaseTemplates(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	templates, err := h.db.ListChaseTemplates(c.Request.Context(), &userID)
	if err != nil {
		h.logger.Error("Failed to list templates", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list templates"})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// DeleteChaseTemplate deletes a template
func (h *ChaseHandler) DeleteChaseTemplate(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("template_id")

	// Get existing template
	template, err := h.db.GetChaseTemplateByID(c.Request.Context(), id)
	if err != nil || template == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}

	// Only allow deletion if template belongs to user
	if template.CreatedBy == nil || *template.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete this template"})
		return
	}

	if err := h.db.DeleteChaseTemplate(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete template", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "template deleted successfully"})
}
