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

type NPCHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

func NewNPCHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *NPCHandler {
	return &NPCHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

type CreateNPCRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Race        string                 `json:"race"`
	Class       string                 `json:"class"`
	Personality string                 `json:"personality"`
	Backstory   string                 `json:"backstory"`
	Stats       map[string]interface{} `json:"stats"`
	AIGenerated bool                   `json:"ai_generated"`
	CampaignID  *string                `json:"campaign_id,omitempty"`
}

type GenerateNPCRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	Race            string  `json:"race" binding:"required"`
	Class           string  `json:"class" binding:"required"`
	Level           int     `json:"level" binding:"required"`
	Role            string  `json:"role" binding:"required"`
	Personality     string  `json:"personality" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// CreateNPC creates a new NPC
func (h *NPCHandler) CreateNPC(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateNPCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert stats to JSON if provided
	var statsJSON json.RawMessage
	if req.Stats != nil {
		stats, err := json.Marshal(req.Stats)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stats format"})
			return
		}
		statsJSON = stats
	}

	npc := &db.NPC{
		UserID:      userID,
		CampaignID:  req.CampaignID,
		Name:        req.Name,
		Race:        &req.Race,
		Class:       &req.Class,
		Personality: &req.Personality,
		Backstory:   &req.Backstory,
		Stats:       statsJSON,
		AIGenerated: req.AIGenerated,
	}

	if err := h.db.CreateNPC(c.Request.Context(), npc); err != nil {
		h.logger.Error("Failed to create NPC", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create NPC"})
		return
	}

	c.JSON(http.StatusCreated, npc)
}

// GenerateNPC generates an NPC using AI
func (h *NPCHandler) GenerateNPC(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateNPCRequest
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

	// Generate NPC using AI
	npcData, err := h.aiClient.GenerateNPC(c.Request.Context(), services.NPCGenerateRequest{
		Race:             req.Race,
		Class:            req.Class,
		Level:            req.Level,
		Role:             req.Role,
		Personality:      req.Personality,
		SpecialRequests:  req.SpecialRequests,
		CampaignID:       campaignIDStr,   // For Python proxy
		CampaignContext:  campaignContext, // For direct providers
		GameSystem:       gameSystem,
		OllamaCapability: ollamaCapability,
		MaxTokens:        req.MaxTokens,
		Timeout:          req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate NPC", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate NPC"})
		return
	}

	// Return generated NPC without saving
	c.JSON(http.StatusOK, gin.H{
		"npc": npcData,
	})
}

// GetNPC gets an NPC by ID
func (h *NPCHandler) GetNPC(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	npcID := c.Param("id")
	npc, err := h.db.GetNPCByID(c.Request.Context(), npcID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "NPC not found"})
		return
	}

	// Check ownership
	if npc.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, npc)
}

// ListNPCs lists all NPCs for current user
func (h *NPCHandler) ListNPCs(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	npcs, err := h.db.ListNPCsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list NPCs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list NPCs"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.NPC, 0)
		for _, npc := range npcs {
			if npc.CampaignID == nil {
				filtered = append(filtered, npc)
			}
		}
		npcs = filtered
	}

	c.JSON(http.StatusOK, npcs)
}

// DeleteNPC deletes an NPC
func (h *NPCHandler) DeleteNPC(c *gin.Context) {
	HandleEntityDelete(
		c,
		"NPC",
		h.db.GetNPCByID,
		func(n *db.NPC) string { return n.UserID },
		h.db.DeleteNPC,
		h.logger,
	)
}

// AssignCampaign assigns an NPC to a campaign or Personal Library
func (h *NPCHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"NPC",
		h.db.GetNPCByID,
		func(n *db.NPC) string { return n.UserID },
		func(n *db.NPC, campaignID *string) { n.CampaignID = campaignID },
		h.db.UpdateNPC,
		h.logger,
	)
}
