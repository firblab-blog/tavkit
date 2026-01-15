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

type MonsterHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

func NewMonsterHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *MonsterHandler {
	return &MonsterHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

type CreateMonsterRequest struct {
	Name       string                 `json:"name" binding:"required"`
	CR         float64                `json:"cr"`
	Stats      map[string]interface{} `json:"stats" binding:"required"`
	Lore       string                 `json:"lore"`
	Tactics    string                 `json:"tactics"`
	CampaignID *string                `json:"campaign_id,omitempty"`
}

type GenerateMonsterRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	MonsterType     string  `json:"monster_type" binding:"required"`
	Size            string  `json:"size" binding:"required"`
	ChallengeRating float64 `json:"challenge_rating" binding:"required"`
	Environment     string  `json:"environment" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// CreateMonster creates a new monster (called when user clicks Save)
func (h *MonsterHandler) CreateMonster(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateMonsterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert stats to JSON
	statsJSON, err := json.Marshal(req.Stats)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stats format"})
		return
	}

	monster := &db.Monster{
		UserID:      userID,
		Name:        req.Name,
		CR:          req.CR,
		Stats:       statsJSON,
		Lore:        &req.Lore,
		Tactics:     &req.Tactics,
		CampaignID:  req.CampaignID,
		AIGenerated: true,
	}

	if err := h.db.CreateMonster(c.Request.Context(), monster); err != nil {
		h.logger.Error("Failed to create monster", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create monster"})
		return
	}

	c.JSON(http.StatusCreated, monster)
}

// GenerateMonster generates a monster using AI (does NOT auto-save)
func (h *MonsterHandler) GenerateMonster(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateMonsterRequest
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

	// Generate monster using AI
	monsterData, err := h.aiClient.GenerateMonster(c.Request.Context(), services.MonsterGenerateRequest{
		MonsterType:      req.MonsterType,
		Size:             req.Size,
		ChallengeRating:  req.ChallengeRating,
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
		h.logger.Error("Failed to generate monster", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate monster"})
		return
	}

	// Return generated monster WITHOUT saving - user will save via CreateMonster
	c.JSON(http.StatusOK, gin.H{
		"monster": monsterData,
	})
}

// GetMonster gets a monster by ID
func (h *MonsterHandler) GetMonster(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	monsterID := c.Param("id")
	monster, err := h.db.GetMonsterByID(c.Request.Context(), monsterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "monster not found"})
		return
	}

	// Check ownership
	if monster.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, monster)
}

// ListMonsters lists all monsters for current user
func (h *MonsterHandler) ListMonsters(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	monsters, err := h.db.ListMonstersByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list monsters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list monsters"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Monster, 0)
		for _, m := range monsters {
			if m.CampaignID == nil {
				filtered = append(filtered, m)
			}
		}
		monsters = filtered
	}

	c.JSON(http.StatusOK, gin.H{"monsters": monsters})
}

// DeleteMonster deletes a monster
func (h *MonsterHandler) DeleteMonster(c *gin.Context) {
	HandleEntityDelete(
		c,
		"monster",
		h.db.GetMonsterByID,
		func(m *db.Monster) string { return m.UserID },
		h.db.DeleteMonster,
		h.logger,
	)
}

// AssignCampaign assigns a monster to a campaign or Personal Library
func (h *MonsterHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"monster",
		h.db.GetMonsterByID,
		func(m *db.Monster) string { return m.UserID },
		func(m *db.Monster, campaignID *string) { m.CampaignID = campaignID },
		h.db.UpdateMonster,
		h.logger,
	)
}
