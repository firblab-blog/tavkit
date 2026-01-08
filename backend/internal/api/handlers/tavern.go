package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
)

type TavernSessionHandler struct {
	db db.Database
}

func NewTavernSessionHandler(database db.Database) *TavernSessionHandler {
	return &TavernSessionHandler{db: database}
}

// CreateTavernEncounter creates a new tavern encounter
func (h *TavernSessionHandler) CreateTavernEncounter(c *gin.Context) {
	var req struct {
		SessionID  string `json:"session_id" binding:"required"`
		TavernID   string `json:"tavern_id" binding:"required"`
		TimeOfDay  string `json:"time_of_day"`
		CrowdSize  string `json:"crowd_size"`
		Atmosphere string `json:"atmosphere"`
		Status     string `json:"status"`
		Notes      string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter := &db.TavernEncounter{
		SessionID:  req.SessionID,
		TavernID:   req.TavernID,
		TimeOfDay:  req.TimeOfDay,
		CrowdSize:  req.CrowdSize,
		Atmosphere: req.Atmosphere,
		Status:     req.Status,
		CreatedAt:  time.Now(),
	}
	if req.Notes != "" {
		encounter.Notes = &req.Notes
	}

	if err := h.db.CreateTavernEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tavern encounter"})
		return
	}

	c.JSON(http.StatusCreated, encounter)
}

// GetTavernEncounter retrieves a tavern encounter by ID
func (h *TavernSessionHandler) GetTavernEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	encounter, err := h.db.GetTavernEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tavern encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// GetTavernEncounterBySession retrieves a tavern encounter by session ID
func (h *TavernSessionHandler) GetTavernEncounterBySession(c *gin.Context) {
	sessionID := c.Param("session_id")

	encounter, err := h.db.GetTavernEncounterBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tavern encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// UpdateTavernEncounter updates an existing tavern encounter
func (h *TavernSessionHandler) UpdateTavernEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		TimeOfDay  string  `json:"time_of_day"`
		CrowdSize  string  `json:"crowd_size"`
		Atmosphere string  `json:"atmosphere"`
		Status     string  `json:"status"`
		Notes      *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter, err := h.db.GetTavernEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tavern encounter not found"})
		return
	}

	if req.TimeOfDay != "" {
		encounter.TimeOfDay = req.TimeOfDay
	}
	if req.CrowdSize != "" {
		encounter.CrowdSize = req.CrowdSize
	}
	if req.Atmosphere != "" {
		encounter.Atmosphere = req.Atmosphere
	}
	if req.Status != "" {
		encounter.Status = req.Status
	}
	if req.Notes != nil {
		encounter.Notes = req.Notes
	}

	if err := h.db.UpdateTavernEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tavern encounter"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// DeleteTavernEncounter deletes a tavern encounter
func (h *TavernSessionHandler) DeleteTavernEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	if err := h.db.DeleteTavernEncounter(c.Request.Context(), encounterID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tavern encounter"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tavern encounter deleted"})
}

// CreatePatronInteraction creates a new patron interaction
func (h *TavernSessionHandler) CreatePatronInteraction(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		PatronName          string          `json:"patron_name" binding:"required"`
		PatronData          json.RawMessage `json:"patron_data"`
		TalkedTo            bool            `json:"talked_to"`
		Relationship        string          `json:"relationship"`
		ConversationSummary string          `json:"conversation_summary"`
		RumorsShared        json.RawMessage `json:"rumors_shared"`
		QuestHooks          json.RawMessage `json:"quest_hooks"`
		Notes               string          `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	interaction := &db.PatronInteraction{
		EncounterID:  encounterID,
		PatronName:   req.PatronName,
		PatronData:   req.PatronData,
		TalkedTo:     req.TalkedTo,
		Relationship: req.Relationship,
		RumorsShared: req.RumorsShared,
		QuestHooks:   req.QuestHooks,
	}
	if req.ConversationSummary != "" {
		interaction.ConversationSummary = &req.ConversationSummary
	}
	if req.Notes != "" {
		interaction.Notes = &req.Notes
	}

	if err := h.db.CreatePatronInteraction(c.Request.Context(), interaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create patron interaction"})
		return
	}

	c.JSON(http.StatusCreated, interaction)
}

// GetPatronInteraction retrieves a patron interaction by ID
func (h *TavernSessionHandler) GetPatronInteraction(c *gin.Context) {
	interactionID := c.Param("interaction_id")

	interaction, err := h.db.GetPatronInteraction(c.Request.Context(), interactionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Patron interaction not found"})
		return
	}

	c.JSON(http.StatusOK, interaction)
}

// ListPatronInteractions retrieves all patron interactions for an encounter
func (h *TavernSessionHandler) ListPatronInteractions(c *gin.Context) {
	encounterID := c.Param("id")

	interactions, err := h.db.ListPatronInteractions(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list patron interactions"})
		return
	}

	c.JSON(http.StatusOK, interactions)
}

// UpdatePatronInteraction updates a patron interaction
func (h *TavernSessionHandler) UpdatePatronInteraction(c *gin.Context) {
	interactionID := c.Param("interaction_id")

	var req struct {
		TalkedTo            *bool           `json:"talked_to"`
		Relationship        string          `json:"relationship"`
		ConversationSummary *string         `json:"conversation_summary"`
		RumorsShared        json.RawMessage `json:"rumors_shared"`
		QuestHooks          json.RawMessage `json:"quest_hooks"`
		Notes               *string         `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	interaction, err := h.db.GetPatronInteraction(c.Request.Context(), interactionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Patron interaction not found"})
		return
	}

	if req.TalkedTo != nil {
		interaction.TalkedTo = *req.TalkedTo
	}
	if req.Relationship != "" {
		interaction.Relationship = req.Relationship
	}
	if req.ConversationSummary != nil {
		interaction.ConversationSummary = req.ConversationSummary
	}
	if req.RumorsShared != nil {
		interaction.RumorsShared = req.RumorsShared
	}
	if req.QuestHooks != nil {
		interaction.QuestHooks = req.QuestHooks
	}
	if req.Notes != nil {
		interaction.Notes = req.Notes
	}

	if err := h.db.UpdatePatronInteraction(c.Request.Context(), interaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update patron interaction"})
		return
	}

	c.JSON(http.StatusOK, interaction)
}

// CreateRumorTracking creates a new rumor tracking entry
func (h *TavernSessionHandler) CreateRumorTracking(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		RumorText    string `json:"rumor_text" binding:"required"`
		SourcePatron string `json:"source_patron"`
		Heard        bool   `json:"heard"`
		Verified     bool   `json:"verified"`
		RelatedTo    string `json:"related_to"`
		Notes        string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rumor := &db.RumorTracking{
		EncounterID: encounterID,
		RumorText:   req.RumorText,
		Heard:       req.Heard,
		Verified:    req.Verified,
	}
	if req.SourcePatron != "" {
		rumor.SourcePatron = &req.SourcePatron
	}
	if req.RelatedTo != "" {
		rumor.RelatedTo = &req.RelatedTo
	}
	if req.Notes != "" {
		rumor.Notes = &req.Notes
	}

	if err := h.db.CreateRumorTracking(c.Request.Context(), rumor); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rumor tracking"})
		return
	}

	c.JSON(http.StatusCreated, rumor)
}

// ListRumorTracking retrieves all rumors for an encounter
func (h *TavernSessionHandler) ListRumorTracking(c *gin.Context) {
	encounterID := c.Param("id")

	rumors, err := h.db.ListRumorTracking(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list rumors"})
		return
	}

	c.JSON(http.StatusOK, rumors)
}

// UpdateRumorTracking updates a rumor tracking entry
func (h *TavernSessionHandler) UpdateRumorTracking(c *gin.Context) {
	rumorID := c.Param("rumor_id")

	var req struct {
		Heard     *bool   `json:"heard"`
		Verified  *bool   `json:"verified"`
		RelatedTo *string `json:"related_to"`
		Notes     *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// First, we need to get the rumor - we'll need to search by ID
	// For now, we'll just accept the update data
	rumor := &db.RumorTracking{
		ID: rumorID,
	}

	if req.Heard != nil {
		rumor.Heard = *req.Heard
	}
	if req.Verified != nil {
		rumor.Verified = *req.Verified
	}
	if req.RelatedTo != nil {
		rumor.RelatedTo = req.RelatedTo
	}
	if req.Notes != nil {
		rumor.Notes = req.Notes
	}

	if err := h.db.UpdateRumorTracking(c.Request.Context(), rumor); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update rumor tracking"})
		return
	}

	c.JSON(http.StatusOK, rumor)
}

// CreateTavernTab creates a new tab entry
func (h *TavernSessionHandler) CreateTavernTab(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		CharacterName string          `json:"character_name" binding:"required"`
		ItemsOrdered  json.RawMessage `json:"items_ordered" binding:"required"`
		TotalCost     string          `json:"total_cost" binding:"required"`
		Paid          bool            `json:"paid"`
		Notes         string          `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tab := &db.TavernTab{
		EncounterID:   encounterID,
		CharacterName: req.CharacterName,
		ItemsOrdered:  req.ItemsOrdered,
		TotalCost:     req.TotalCost,
		Paid:          req.Paid,
	}
	if req.Notes != "" {
		tab.Notes = &req.Notes
	}

	if err := h.db.CreateTavernTab(c.Request.Context(), tab); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tavern tab"})
		return
	}

	c.JSON(http.StatusCreated, tab)
}

// ListTavernTabs retrieves all tab entries for an encounter
func (h *TavernSessionHandler) ListTavernTabs(c *gin.Context) {
	encounterID := c.Param("id")

	tabs, err := h.db.ListTavernTabs(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tavern tabs"})
		return
	}

	c.JSON(http.StatusOK, tabs)
}

// UpdateTavernTab updates a tab entry
func (h *TavernSessionHandler) UpdateTavernTab(c *gin.Context) {
	tabID := c.Param("tab_id")

	var req struct {
		ItemsOrdered json.RawMessage `json:"items_ordered"`
		TotalCost    *string         `json:"total_cost"`
		Paid         *bool           `json:"paid"`
		Notes        *string         `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tab := &db.TavernTab{
		ID: tabID,
	}

	if req.ItemsOrdered != nil {
		tab.ItemsOrdered = req.ItemsOrdered
	}
	if req.TotalCost != nil {
		tab.TotalCost = *req.TotalCost
	}
	if req.Paid != nil {
		tab.Paid = *req.Paid
	}
	if req.Notes != nil {
		tab.Notes = req.Notes
	}

	if err := h.db.UpdateTavernTab(c.Request.Context(), tab); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tavern tab"})
		return
	}

	c.JSON(http.StatusOK, tab)
}
