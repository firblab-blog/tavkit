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

// TavernHandler handles tavern-related requests
type TavernHandler struct {
	db             db.Database
	aiClient       *services.AIClient
	summaryService *services.CampaignSummaryService
	logger         *zap.Logger
}

// NewTavernHandler creates a new tavern handler
func NewTavernHandler(database db.Database, aiClient *services.AIClient, summaryService *services.CampaignSummaryService, logger *zap.Logger) *TavernHandler {
	return &TavernHandler{
		db:             database,
		aiClient:       aiClient,
		summaryService: summaryService,
		logger:         logger,
	}
}

// CreateTavernRequest represents the request to create a tavern
type CreateTavernRequest struct {
	CampaignID        *string          `json:"campaign_id,omitempty"`
	Name              string           `json:"name" binding:"required"`
	Type              string           `json:"type" binding:"required"`
	Atmosphere        string           `json:"atmosphere"`
	Description       string           `json:"description"`
	KeeperName        string           `json:"keeper_name"`
	KeeperPersonality string           `json:"keeper_personality"`
	KeeperDescription string           `json:"keeper_description"`
	MenuFood          []map[string]any `json:"menu_food"`
	MenuDrinks        []map[string]any `json:"menu_drinks"`
	Rooms             []map[string]any `json:"rooms"`
	Patrons           []map[string]any `json:"patrons"`
	Events            []string         `json:"events"`
	Rumors            []string         `json:"rumors"`
	SpecialNotes      string           `json:"special_notes"`
	AIGenerated       bool             `json:"ai_generated"`
}

// GenerateTavernRequest represents the request to AI-generate a tavern
type GenerateTavernRequest struct {
	CampaignID      *string `json:"campaign_id,omitempty"`
	Type            string  `json:"type" binding:"required"`
	Quality         string  `json:"quality" binding:"required"`
	Size            string  `json:"size" binding:"required"`
	SpecialRequests string  `json:"special_requests"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// UpdateTavernRequest represents the request to update a tavern
type UpdateTavernRequest struct {
	Name              string           `json:"name"`
	Type              string           `json:"type"`
	Atmosphere        string           `json:"atmosphere"`
	Description       string           `json:"description"`
	KeeperName        string           `json:"keeper_name"`
	KeeperPersonality string           `json:"keeper_personality"`
	KeeperDescription string           `json:"keeper_description"`
	MenuFood          []map[string]any `json:"menu_food"`
	MenuDrinks        []map[string]any `json:"menu_drinks"`
	Rooms             []map[string]any `json:"rooms"`
	Patrons           []map[string]any `json:"patrons"`
	Events            []string         `json:"events"`
	Rumors            []string         `json:"rumors"`
	SpecialNotes      string           `json:"special_notes"`
}

// CreateTavern creates a new tavern
func (h *TavernHandler) CreateTavern(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateTavernRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert slices to JSON
	menuFoodJSON, _ := json.Marshal(req.MenuFood)
	menuDrinksJSON, _ := json.Marshal(req.MenuDrinks)
	roomsJSON, _ := json.Marshal(req.Rooms)
	patronsJSON, _ := json.Marshal(req.Patrons)
	eventsJSON, _ := json.Marshal(req.Events)
	rumorsJSON, _ := json.Marshal(req.Rumors)

	// Set pointers for optional fields
	var atmospherePtr, descPtr, keeperDescPtr, specialNotesPtr *string
	if req.Atmosphere != "" {
		atmospherePtr = &req.Atmosphere
	}
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.KeeperDescription != "" {
		keeperDescPtr = &req.KeeperDescription
	}
	if req.SpecialNotes != "" {
		specialNotesPtr = &req.SpecialNotes
	}

	tavern := &db.Tavern{
		UserID:            userID,
		CampaignID:        req.CampaignID,
		Name:              req.Name,
		Type:              req.Type,
		Atmosphere:        atmospherePtr,
		Description:       descPtr,
		KeeperName:        req.KeeperName,
		KeeperPersonality: req.KeeperPersonality,
		KeeperDescription: keeperDescPtr,
		MenuFood:          menuFoodJSON,
		MenuDrinks:        menuDrinksJSON,
		Rooms:             roomsJSON,
		Patrons:           patronsJSON,
		Events:            eventsJSON,
		Rumors:            rumorsJSON,
		SpecialNotes:      specialNotesPtr,
		AIGenerated:       req.AIGenerated,
	}

	if err := h.db.CreateTavern(c.Request.Context(), tavern); err != nil {
		h.logger.Error("Failed to create tavern", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tavern"})
		return
	}

	c.JSON(http.StatusCreated, tavern)
}

// GenerateTavern generates a tavern using AI
func (h *TavernHandler) GenerateTavern(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req GenerateTavernRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get full campaign context from summary service if campaign_id is provided
	var campaignContext *string
	if req.CampaignID != nil {
		summaryContext, err := h.summaryService.GetCampaignContext(c.Request.Context(), *req.CampaignID)
		if err != nil {
			h.logger.Warn("Failed to get campaign context, generating without it",
				zap.String("campaign_id", *req.CampaignID),
				zap.Error(err))
		} else {
			// Convert summary context to a string for AI
			contextJSON, err := json.Marshal(summaryContext)
			if err == nil {
				contextStr := string(contextJSON)
				campaignContext = &contextStr
			}
		}
	}

	// Call AI service to generate tavern
	gameSystem, _ := middleware.GetGameSystem(c)
	tavernData, err := h.aiClient.GenerateTavern(c.Request.Context(), services.TavernGenerateRequest{
		Type:            req.Type,
		Quality:         req.Quality,
		Size:            req.Size,
		SpecialRequests: req.SpecialRequests,
		CampaignContext: campaignContext,
		GameSystem:      gameSystem,
		MaxTokens:       req.MaxTokens,
		Timeout:         req.Timeout,
	})
	if err != nil {
		h.logger.Error("Failed to generate tavern", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tavern"})
		return
	}

	// Return the generated tavern without saving
	c.JSON(http.StatusOK, gin.H{
		"tavern": tavernData,
	})
}

// GetTavern gets a tavern by ID
func (h *TavernHandler) GetTavern(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	tavern, err := h.db.GetTavernByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get tavern", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get tavern"})
		return
	}

	if tavern == nil || tavern.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "tavern not found"})
		return
	}

	c.JSON(http.StatusOK, tavern)
}

// ListTaverns lists all taverns for the user
func (h *TavernHandler) ListTaverns(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get optional campaign_id from query params
	// Special value "null" means filter for Personal Library (campaign_id IS NULL)
	filterType, campaignID := ParseCampaignFilter(c)

	taverns, err := h.db.ListTavernsByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list taverns", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list taverns"})
		return
	}

	// Filter for Personal Library (campaign_id IS NULL)
	if filterType == FilterNullCampaign {
		filtered := make([]*db.Tavern, 0)
		for _, t := range taverns {
			if t.CampaignID == nil {
				filtered = append(filtered, t)
			}
		}
		taverns = filtered
	}

	c.JSON(http.StatusOK, taverns)
}

// ListTavernsByCampaign lists all taverns for a specific campaign
func (h *TavernHandler) ListTavernsByCampaign(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")

	taverns, err := h.db.ListTavernsByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list taverns for campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list taverns"})
		return
	}

	c.JSON(http.StatusOK, taverns)
}

// UpdateTavern updates an existing tavern
func (h *TavernHandler) UpdateTavern(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	// Get existing tavern
	tavern, err := h.db.GetTavernByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get tavern", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get tavern"})
		return
	}

	if tavern == nil || tavern.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "tavern not found"})
		return
	}

	var req UpdateTavernRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		tavern.Name = req.Name
	}
	if req.Type != "" {
		tavern.Type = req.Type
	}
	if req.Atmosphere != "" {
		tavern.Atmosphere = &req.Atmosphere
	}
	if req.Description != "" {
		tavern.Description = &req.Description
	}
	if req.KeeperName != "" {
		tavern.KeeperName = req.KeeperName
	}
	if req.KeeperPersonality != "" {
		tavern.KeeperPersonality = req.KeeperPersonality
	}
	if req.KeeperDescription != "" {
		tavern.KeeperDescription = &req.KeeperDescription
	}
	if req.MenuFood != nil {
		menuFoodJSON, _ := json.Marshal(req.MenuFood)
		tavern.MenuFood = menuFoodJSON
	}
	if req.MenuDrinks != nil {
		menuDrinksJSON, _ := json.Marshal(req.MenuDrinks)
		tavern.MenuDrinks = menuDrinksJSON
	}
	if req.Rooms != nil {
		roomsJSON, _ := json.Marshal(req.Rooms)
		tavern.Rooms = roomsJSON
	}
	if req.Patrons != nil {
		patronsJSON, _ := json.Marshal(req.Patrons)
		tavern.Patrons = patronsJSON
	}
	if req.Events != nil {
		eventsJSON, _ := json.Marshal(req.Events)
		tavern.Events = eventsJSON
	}
	if req.Rumors != nil {
		rumorsJSON, _ := json.Marshal(req.Rumors)
		tavern.Rumors = rumorsJSON
	}
	if req.SpecialNotes != "" {
		tavern.SpecialNotes = &req.SpecialNotes
	}

	if err := h.db.UpdateTavern(c.Request.Context(), tavern); err != nil {
		h.logger.Error("Failed to update tavern", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tavern"})
		return
	}

	c.JSON(http.StatusOK, tavern)
}

// DeleteTavern deletes a tavern
func (h *TavernHandler) DeleteTavern(c *gin.Context) {
	HandleEntityDelete(
		c,
		"tavern",
		h.db.GetTavernByID,
		func(t *db.Tavern) string { return t.UserID },
		h.db.DeleteTavern,
		h.logger,
	)
}

// AssignCampaign assigns a tavern to a campaign or Personal Library
func (h *TavernHandler) AssignCampaign(c *gin.Context) {
	HandleAssignCampaign(
		c,
		"tavern",
		h.db.GetTavernByID,
		func(t *db.Tavern) string { return t.UserID },
		func(t *db.Tavern, campaignID *string) { t.CampaignID = campaignID },
		h.db.UpdateTavern,
		h.logger,
	)
}
