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

// TrapHandler handles trap-related requests
type TrapHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewTrapHandler creates a new trap handler
func NewTrapHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *TrapHandler {
	return &TrapHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateTrapRequest represents the request to create a trap
type CreateTrapRequest struct {
	CampaignID    *string          `json:"campaign_id,omitempty"`
	Name          string           `json:"name" binding:"required"`
	TrapType      string           `json:"trap_type" binding:"required"`
	Difficulty    string           `json:"difficulty" binding:"required"`
	Description   string           `json:"description"`
	Environment   string           `json:"environment"`
	Trigger       string           `json:"trigger"`
	Effect        string           `json:"effect"`
	Damage        string           `json:"damage"`
	Detection     map[string]any   `json:"detection"`
	SolutionPaths []map[string]any `json:"solution_paths"`
	Complications []string         `json:"complications"`
	Rewards       []string         `json:"rewards"`
	Scaling       map[string]any   `json:"scaling"`
	DMNotes       string           `json:"dm_notes"`
	AIGenerated   bool             `json:"ai_generated"`
}

// GenerateTrapRequest represents the request to AI-generate a trap
type GenerateTrapRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	TrapType        string  `json:"trap_type" binding:"required"`
	Difficulty      string  `json:"difficulty" binding:"required"`
	PartyLevel      string  `json:"party_level"`
	Environment     string  `json:"environment"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateTrapRequest represents the request to update a trap
type UpdateTrapRequest struct {
	Name          string           `json:"name"`
	TrapType      string           `json:"trap_type"`
	Difficulty    string           `json:"difficulty"`
	Description   string           `json:"description"`
	Environment   string           `json:"environment"`
	Trigger       string           `json:"trigger"`
	Effect        string           `json:"effect"`
	Damage        string           `json:"damage"`
	Detection     map[string]any   `json:"detection"`
	SolutionPaths []map[string]any `json:"solution_paths"`
	Complications []string         `json:"complications"`
	Rewards       []string         `json:"rewards"`
	Scaling       map[string]any   `json:"scaling"`
	DMNotes       string           `json:"dm_notes"`
}

// CreateTrap creates a new trap
func (h *TrapHandler) CreateTrap(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateTrapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Marshal JSON fields
	detectionJSON, _ := json.Marshal(req.Detection)
	solutionPathsJSON, _ := json.Marshal(req.SolutionPaths)
	complicationsJSON, _ := json.Marshal(req.Complications)
	rewardsJSON, _ := json.Marshal(req.Rewards)
	scalingJSON, _ := json.Marshal(req.Scaling)

	trap := &db.Trap{
		UserID:        userID,
		CampaignID:    req.CampaignID,
		Name:          req.Name,
		TrapType:      req.TrapType,
		Difficulty:    req.Difficulty,
		Description:   &req.Description,
		Environment:   &req.Environment,
		Trigger:       &req.Trigger,
		Effect:        &req.Effect,
		Damage:        &req.Damage,
		Detection:     detectionJSON,
		SolutionPaths: solutionPathsJSON,
		Complications: complicationsJSON,
		Rewards:       rewardsJSON,
		Scaling:       scalingJSON,
		DMNotes:       &req.DMNotes,
		AIGenerated:   req.AIGenerated,
	}

	if err := h.db.CreateTrap(c.Request.Context(), trap); err != nil {
		h.logger.Error("Failed to create trap", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create trap"})
		return
	}

	c.JSON(http.StatusCreated, trap)
}

// GenerateTrap generates a trap using AI
func (h *TrapHandler) GenerateTrap(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateTrapRequest
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

	// Generate trap using AI
	trapData, err := h.aiClient.GenerateTrap(c.Request.Context(), services.TrapGenerationRequest{
		TrapType:         req.TrapType,
		Difficulty:       req.Difficulty,
		PartyLevel:       req.PartyLevel,
		Environment:      req.Environment,
		SpecialRequests:  req.SpecialRequests,
		CampaignContext:  campaignContext,
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate trap", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate trap"})
		return
	}

	// Return the generated trap without saving
	c.JSON(http.StatusOK, gin.H{
		"trap": trapData,
	})
}

// GetTrap gets a trap by ID
func (h *TrapHandler) GetTrap(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	trap, err := h.db.GetTrapByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get trap", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get trap"})
		return
	}

	if trap == nil || trap.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "trap not found"})
		return
	}

	c.JSON(http.StatusOK, trap)
}

// ListTraps lists all traps for the user
func (h *TrapHandler) ListTraps(c *gin.Context) {
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

	traps, err := h.db.ListTrapsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list traps", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list traps"})
		return
	}

	c.JSON(http.StatusOK, traps)
}

// ListTrapsByCampaign lists all traps for a specific campaign
func (h *TrapHandler) ListTrapsByCampaign(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")

	traps, err := h.db.ListTrapsByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list traps for campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list traps"})
		return
	}

	c.JSON(http.StatusOK, traps)
}

// UpdateTrap updates an existing trap
func (h *TrapHandler) UpdateTrap(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing trap
	trap, err := h.db.GetTrapByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get trap", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get trap"})
		return
	}

	if trap == nil || trap.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "trap not found"})
		return
	}

	var req UpdateTrapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		trap.Name = req.Name
	}
	if req.TrapType != "" {
		trap.TrapType = req.TrapType
	}
	if req.Difficulty != "" {
		trap.Difficulty = req.Difficulty
	}
	if req.Description != "" {
		trap.Description = &req.Description
	}
	if req.Environment != "" {
		trap.Environment = &req.Environment
	}
	if req.Trigger != "" {
		trap.Trigger = &req.Trigger
	}
	if req.Effect != "" {
		trap.Effect = &req.Effect
	}
	if req.Damage != "" {
		trap.Damage = &req.Damage
	}
	if req.Detection != nil {
		detectionJSON, _ := json.Marshal(req.Detection)
		trap.Detection = detectionJSON
	}
	if req.SolutionPaths != nil {
		solutionPathsJSON, _ := json.Marshal(req.SolutionPaths)
		trap.SolutionPaths = solutionPathsJSON
	}
	if req.Complications != nil {
		complicationsJSON, _ := json.Marshal(req.Complications)
		trap.Complications = complicationsJSON
	}
	if req.Rewards != nil {
		rewardsJSON, _ := json.Marshal(req.Rewards)
		trap.Rewards = rewardsJSON
	}
	if req.Scaling != nil {
		scalingJSON, _ := json.Marshal(req.Scaling)
		trap.Scaling = scalingJSON
	}
	if req.DMNotes != "" {
		trap.DMNotes = &req.DMNotes
	}

	if err := h.db.UpdateTrap(c.Request.Context(), trap); err != nil {
		h.logger.Error("Failed to update trap", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update trap"})
		return
	}

	c.JSON(http.StatusOK, trap)
}

// DeleteTrap deletes a trap
func (h *TrapHandler) DeleteTrap(c *gin.Context) {
	HandleEntityDelete(
		c,
		"trap",
		h.db.GetTrapByID,
		func(t *db.Trap) string { return t.UserID },
		h.db.DeleteTrap,
		h.logger,
	)
}
