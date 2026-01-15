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

// QuestHandler handles quest-related requests
type QuestHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewQuestHandler creates a new quest handler
func NewQuestHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *QuestHandler {
	return &QuestHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateQuestRequest represents the request to create a quest
type CreateQuestRequest struct {
	Title             string   `json:"title" binding:"required"`
	Type              string   `json:"type" binding:"required"`
	Category          string   `json:"category"`
	Description       string   `json:"description"`
	Objectives        []string `json:"objectives"`
	Rewards           []string `json:"rewards"`
	Complications     []string `json:"complications"`
	NPCsInvolved      []string `json:"npcs_involved"`
	LocationsInvolved []string `json:"locations_involved"`
	FactionAlignment  string   `json:"faction_alignment"`
	PartyLevel        int      `json:"party_level"`
	Status            string   `json:"status"`
	MoralAmbiguity    bool     `json:"moral_ambiguity"`
	CombatIntensity   string   `json:"combat_intensity"`
	TimeLimit         string   `json:"time_limit"`
	AIGenerated       bool     `json:"ai_generated"`
	CampaignID        *string  `json:"campaign_id,omitempty"`
}

// GenerateQuestRequest represents the request to AI-generate a quest
type GenerateQuestRequest struct {
	CampaignID       *string  `json:"campaign_id,omitempty"`
	Type             string   `json:"type" binding:"required"`
	Category         string   `json:"category"`
	PartyLevel       int      `json:"party_level" binding:"required"`
	PartySize        int      `json:"party_size"`
	MoralAmbiguity   bool     `json:"moral_ambiguity"`
	CombatIntensity  string   `json:"combat_intensity" binding:"required"`
	QuestLength      string   `json:"quest_length"`
	IncludeFactions  []string `json:"include_factions"`
	IncludeLocations []string `json:"include_locations"`
	IncludeNPCs      []string `json:"include_npcs"`
	SpecialRequests  string   `json:"special_requests"`
	MaxTokens        *int     `json:"max_tokens,omitempty"`
	Timeout          *int     `json:"timeout,omitempty"`
}

// UpdateQuestRequest represents the request to update a quest
type UpdateQuestRequest struct {
	Title             string   `json:"title"`
	Type              string   `json:"type"`
	Category          string   `json:"category"`
	Description       string   `json:"description"`
	Objectives        []string `json:"objectives"`
	Rewards           []string `json:"rewards"`
	Complications     []string `json:"complications"`
	NPCsInvolved      []string `json:"npcs_involved"`
	LocationsInvolved []string `json:"locations_involved"`
	FactionAlignment  string   `json:"faction_alignment"`
	PartyLevel        int      `json:"party_level"`
	Status            string   `json:"status"`
	MoralAmbiguity    *bool    `json:"moral_ambiguity"`
	CombatIntensity   string   `json:"combat_intensity"`
	TimeLimit         string   `json:"time_limit"`
}

// CreateQuest creates a new quest
func (h *QuestHandler) CreateQuest(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateQuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert arrays to JSON
	var objectivesJSON, rewardsJSON, complicationsJSON, npcsJSON, locationsJSON json.RawMessage
	if req.Objectives != nil {
		objectives, err := json.Marshal(req.Objectives)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid objectives format"})
			return
		}
		objectivesJSON = objectives
	}
	if req.Rewards != nil {
		rewards, err := json.Marshal(req.Rewards)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rewards format"})
			return
		}
		rewardsJSON = rewards
	}
	if req.Complications != nil {
		complications, err := json.Marshal(req.Complications)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid complications format"})
			return
		}
		complicationsJSON = complications
	}
	if req.NPCsInvolved != nil {
		npcs, err := json.Marshal(req.NPCsInvolved)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid npcs format"})
			return
		}
		npcsJSON = npcs
	}
	if req.LocationsInvolved != nil {
		locations, err := json.Marshal(req.LocationsInvolved)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid locations format"})
			return
		}
		locationsJSON = locations
	}

	// Set pointers for optional fields
	var categoryPtr, descPtr, factionPtr, combatPtr, timeLimitPtr *string
	var partyLevelPtr *int
	var moralPtr *bool

	if req.Category != "" {
		truncated := truncateString(req.Category, 100)
		categoryPtr = &truncated
	}
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.FactionAlignment != "" {
		truncated := truncateString(req.FactionAlignment, 100)
		factionPtr = &truncated
	}
	if req.CombatIntensity != "" {
		truncated := truncateString(req.CombatIntensity, 50)
		combatPtr = &truncated
	}
	if req.TimeLimit != "" {
		truncated := truncateString(req.TimeLimit, 100)
		timeLimitPtr = &truncated
	}
	if req.PartyLevel > 0 {
		partyLevelPtr = &req.PartyLevel
	}
	moralPtr = &req.MoralAmbiguity

	status := req.Status
	if status == "" {
		status = "available"
	}

	// Truncate title to fit VARCHAR(100) constraint
	title := truncateString(req.Title, 100)

	quest := &db.Quest{
		UserID:            userID,
		Title:             title,
		Type:              req.Type,
		Category:          categoryPtr,
		Description:       descPtr,
		Objectives:        objectivesJSON,
		Rewards:           rewardsJSON,
		Complications:     complicationsJSON,
		NPCsInvolved:      npcsJSON,
		LocationsInvolved: locationsJSON,
		FactionAlignment:  factionPtr,
		PartyLevel:        partyLevelPtr,
		Status:            status,
		MoralAmbiguity:    moralPtr,
		CombatIntensity:   combatPtr,
		TimeLimit:         timeLimitPtr,
		CampaignID:        req.CampaignID,
		AIGenerated:       req.AIGenerated,
	}

	if err := h.db.CreateQuest(c.Request.Context(), quest); err != nil {
		h.logger.Error("Failed to create quest", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create quest"})
		return
	}

	c.JSON(http.StatusCreated, quest)
}

// GenerateQuest generates a quest using AI (does NOT auto-save - matches Critter pattern)
func (h *QuestHandler) GenerateQuest(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateQuestRequest
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

	// Generate quest using AI
	questData, err := h.aiClient.GenerateQuest(c.Request.Context(), services.QuestGenerateRequest{
		Type:             req.Type,
		Category:         req.Category,
		PartyLevel:       req.PartyLevel,
		PartySize:        req.PartySize,
		MoralAmbiguity:   req.MoralAmbiguity,
		CombatIntensity:  req.CombatIntensity,
		QuestLength:      req.QuestLength,
		IncludeFactions:  req.IncludeFactions,
		IncludeLocations: req.IncludeLocations,
		IncludeNPCs:      req.IncludeNPCs,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate quest", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate quest"})
		return
	}

	// Return generated quest WITHOUT saving - user will save via CreateQuest
	c.JSON(http.StatusOK, gin.H{
		"quest": questData,
	})
}

// ListQuests lists all quests for a user
func (h *QuestHandler) ListQuests(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	quests, err := h.db.ListQuestsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list quests", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list quests"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Quest, 0)
		for _, q := range quests {
			if q.CampaignID == nil {
				filtered = append(filtered, q)
			}
		}
		quests = filtered
	}

	c.JSON(http.StatusOK, quests)
}

// GetQuest retrieves a specific quest
func (h *QuestHandler) GetQuest(c *gin.Context) {
	id := c.Param("id")

	quest, err := h.db.GetQuestByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get quest", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "quest not found"})
		return
	}

	c.JSON(http.StatusOK, quest)
}

// UpdateQuest updates a quest
func (h *QuestHandler) UpdateQuest(c *gin.Context) {
	id := c.Param("id")

	quest, err := h.db.GetQuestByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get quest", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "quest not found"})
		return
	}

	var req UpdateQuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields (truncate VARCHAR fields to fit constraints)
	if req.Title != "" {
		quest.Title = truncateString(req.Title, 100)
	}
	if req.Type != "" {
		quest.Type = req.Type
	}
	if req.Category != "" {
		truncated := truncateString(req.Category, 100)
		quest.Category = &truncated
	}
	if req.Description != "" {
		quest.Description = &req.Description
	}
	if req.Objectives != nil {
		objectives, _ := json.Marshal(req.Objectives)
		quest.Objectives = objectives
	}
	if req.Rewards != nil {
		rewards, _ := json.Marshal(req.Rewards)
		quest.Rewards = rewards
	}
	if req.Complications != nil {
		complications, _ := json.Marshal(req.Complications)
		quest.Complications = complications
	}
	if req.NPCsInvolved != nil {
		npcs, _ := json.Marshal(req.NPCsInvolved)
		quest.NPCsInvolved = npcs
	}
	if req.LocationsInvolved != nil {
		locations, _ := json.Marshal(req.LocationsInvolved)
		quest.LocationsInvolved = locations
	}
	if req.FactionAlignment != "" {
		truncated := truncateString(req.FactionAlignment, 100)
		quest.FactionAlignment = &truncated
	}
	if req.PartyLevel > 0 {
		quest.PartyLevel = &req.PartyLevel
	}
	if req.Status != "" {
		quest.Status = req.Status
	}
	if req.MoralAmbiguity != nil {
		quest.MoralAmbiguity = req.MoralAmbiguity
	}
	if req.CombatIntensity != "" {
		truncated := truncateString(req.CombatIntensity, 50)
		quest.CombatIntensity = &truncated
	}
	if req.TimeLimit != "" {
		truncated := truncateString(req.TimeLimit, 100)
		quest.TimeLimit = &truncated
	}

	if err := h.db.UpdateQuest(c.Request.Context(), quest); err != nil {
		h.logger.Error("Failed to update quest", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update quest"})
		return
	}

	c.JSON(http.StatusOK, quest)
}

// DeleteQuest deletes a quest
func (h *QuestHandler) DeleteQuest(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteQuest(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete quest", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete quest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "quest deleted"})
}

// AssignCampaign assigns a quest to a campaign or Personal Library
func (h *QuestHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"quest",
		h.db.GetQuestByID,
		func(q *db.Quest) string { return q.UserID },
		func(q *db.Quest, campaignID *string) { q.CampaignID = campaignID },
		h.db.UpdateQuest,
		h.logger,
	)
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
