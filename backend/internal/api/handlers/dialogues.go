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

type DialogueHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

func NewDialogueHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *DialogueHandler {
	return &DialogueHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

type CreateDialogueRequest struct {
	CharacterName   string      `json:"character_name" binding:"required"`
	SceneSetting    string      `json:"scene_setting"`
	Mood            string      `json:"mood"`
	DialogueTree    interface{} `json:"dialogue_tree" binding:"required"`
	SkillChecks     interface{} `json:"skill_checks"`
	Information     interface{} `json:"information"`
	PotentialQuests interface{} `json:"potential_quests"`
	CampaignID      *string     `json:"campaign_id,omitempty"`
}

type GenerateDialogueRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	CharacterName   string  `json:"character_name"`
	DialogueType    string  `json:"dialogue_type" binding:"required"`
	NPCPersonality  string  `json:"npc_personality" binding:"required"`
	Mood            string  `json:"mood" binding:"required"`
	Complexity      string  `json:"complexity"`
	SceneSetting    string  `json:"scene_setting"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// CreateDialogue creates a new dialogue (called when user clicks Save)
func (h *DialogueHandler) CreateDialogue(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateDialogueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert JSON fields
	dialogueTreeJSON, err := json.Marshal(req.DialogueTree)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dialogue_tree format"})
		return
	}

	var skillChecksJSON json.RawMessage
	if req.SkillChecks != nil {
		checks, err := json.Marshal(req.SkillChecks)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid skill_checks format"})
			return
		}
		skillChecksJSON = checks
	}

	var informationJSON json.RawMessage
	if req.Information != nil {
		info, err := json.Marshal(req.Information)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid information format"})
			return
		}
		informationJSON = info
	}

	var potentialQuestsJSON json.RawMessage
	if req.PotentialQuests != nil {
		quests, err := json.Marshal(req.PotentialQuests)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid potential_quests format"})
			return
		}
		potentialQuestsJSON = quests
	}

	dialogue := &db.Dialogue{
		UserID:          userID,
		CharacterName:   req.CharacterName,
		SceneSetting:    &req.SceneSetting,
		Mood:            &req.Mood,
		DialogueTree:    dialogueTreeJSON,
		SkillChecks:     skillChecksJSON,
		Information:     informationJSON,
		PotentialQuests: potentialQuestsJSON,
		CampaignID:      req.CampaignID,
		AIGenerated:     true,
	}

	if err := h.db.CreateDialogue(c.Request.Context(), dialogue); err != nil {
		h.logger.Error("Failed to create dialogue", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create dialogue"})
		return
	}

	c.JSON(http.StatusCreated, dialogue)
}

// GenerateDialogue generates dialogue using AI (does NOT auto-save - matches Critter pattern)
func (h *DialogueHandler) GenerateDialogue(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateDialogueRequest
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

	// Generate dialogue using AI
	dialogueData, err := h.aiClient.GenerateDialogue(c.Request.Context(), services.DialogueGenerateRequest{
		CharacterName:    req.CharacterName,
		DialogueType:     req.DialogueType,
		NPCPersonality:   req.NPCPersonality,
		Mood:             req.Mood,
		Complexity:       req.Complexity,
		SceneSetting:     req.SceneSetting,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate dialogue", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate dialogue"})
		return
	}

	// Return generated dialogue WITHOUT saving - user will save via CreateDialogue
	c.JSON(http.StatusOK, gin.H{
		"dialogue": dialogueData,
	})
}

// GetDialogue gets a dialogue by ID
func (h *DialogueHandler) GetDialogue(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	dialogueID := c.Param("id")
	dialogue, err := h.db.GetDialogueByID(c.Request.Context(), dialogueID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "dialogue not found"})
		return
	}

	// Check ownership
	if dialogue.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, dialogue)
}

// ListDialogues lists all dialogues for current user
func (h *DialogueHandler) ListDialogues(c *gin.Context) {
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

	dialogues, err := h.db.ListDialoguesByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list dialogues", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list dialogues"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"dialogues": dialogues})
}

// DeleteDialogue deletes a dialogue
func (h *DialogueHandler) DeleteDialogue(c *gin.Context) {
	HandleEntityDelete(
		c,
		"dialogue",
		h.db.GetDialogueByID,
		func(d *db.Dialogue) string { return d.UserID },
		h.db.DeleteDialogue,
		h.logger,
	)
}
