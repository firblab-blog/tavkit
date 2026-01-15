package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PlayerModeHandler handles all player mode endpoints
type PlayerModeHandler struct {
	db     db.Database
	logger *zap.Logger
}

// NewPlayerModeHandler creates a new PlayerModeHandler
func NewPlayerModeHandler(database db.Database, logger *zap.Logger) *PlayerModeHandler {
	return &PlayerModeHandler{
		db:     database,
		logger: logger,
	}
}

// =============================================================================
// Journal Entry Handlers
// =============================================================================

type CreateJournalEntryRequest struct {
	CampaignID      *string          `json:"campaign_id,omitempty"`
	CharacterID     *string          `json:"character_id,omitempty"`
	Title           string           `json:"title" binding:"required"`
	Content         *string          `json:"content,omitempty"`
	SessionDate     *string          `json:"session_date,omitempty"`
	SessionNumber   *int             `json:"session_number,omitempty"`
	TaggedNPCs      *json.RawMessage `json:"tagged_npcs,omitempty"`
	TaggedLocations *json.RawMessage `json:"tagged_locations,omitempty"`
	TaggedQuests    *json.RawMessage `json:"tagged_quests,omitempty"`
	IsPrivate       bool             `json:"is_private"`
}

type UpdateJournalEntryRequest struct {
	Title           string           `json:"title" binding:"required"`
	Content         *string          `json:"content,omitempty"`
	SessionDate     *string          `json:"session_date,omitempty"`
	SessionNumber   *int             `json:"session_number,omitempty"`
	TaggedNPCs      *json.RawMessage `json:"tagged_npcs,omitempty"`
	TaggedLocations *json.RawMessage `json:"tagged_locations,omitempty"`
	TaggedQuests    *json.RawMessage `json:"tagged_quests,omitempty"`
	IsPrivate       bool             `json:"is_private"`
}

// CreateJournalEntry creates a new journal entry
func (h *PlayerModeHandler) CreateJournalEntry(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	entry := &db.PlayerJournalEntry{
		UserID:        userID,
		CampaignID:    req.CampaignID,
		CharacterID:   req.CharacterID,
		Title:         req.Title,
		Content:       req.Content,
		SessionDate:   req.SessionDate,
		SessionNumber: req.SessionNumber,
		IsPrivate:     req.IsPrivate,
	}

	if req.TaggedNPCs != nil {
		entry.TaggedNPCs = *req.TaggedNPCs
	} else {
		entry.TaggedNPCs = []byte("[]")
	}
	if req.TaggedLocations != nil {
		entry.TaggedLocations = *req.TaggedLocations
	} else {
		entry.TaggedLocations = []byte("[]")
	}
	if req.TaggedQuests != nil {
		entry.TaggedQuests = *req.TaggedQuests
	} else {
		entry.TaggedQuests = []byte("[]")
	}

	if err := h.db.CreatePlayerJournalEntry(c.Request.Context(), entry); err != nil {
		h.logger.Error("Failed to create journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create journal entry"})
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// GetJournalEntry retrieves a journal entry by ID
func (h *PlayerModeHandler) GetJournalEntry(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID := c.Param("id")
	entry, err := h.db.GetPlayerJournalEntryByID(c.Request.Context(), entryID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "journal entry not found"})
			return
		}
		h.logger.Error("Failed to get journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get journal entry"})
		return
	}

	// Check ownership
	if entry.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// ListJournalEntries lists all journal entries for the user
func (h *PlayerModeHandler) ListJournalEntries(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	entries, err := h.db.ListPlayerJournalEntries(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list journal entries", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list journal entries"})
		return
	}

	if entries == nil {
		entries = []*db.PlayerJournalEntry{}
	}

	c.JSON(http.StatusOK, entries)
}

// UpdateJournalEntry updates a journal entry
func (h *PlayerModeHandler) UpdateJournalEntry(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID := c.Param("id")
	existing, err := h.db.GetPlayerJournalEntryByID(c.Request.Context(), entryID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "journal entry not found"})
			return
		}
		h.logger.Error("Failed to get journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get journal entry"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Title = req.Title
	existing.Content = req.Content
	existing.SessionDate = req.SessionDate
	existing.SessionNumber = req.SessionNumber
	existing.IsPrivate = req.IsPrivate

	if req.TaggedNPCs != nil {
		existing.TaggedNPCs = *req.TaggedNPCs
	}
	if req.TaggedLocations != nil {
		existing.TaggedLocations = *req.TaggedLocations
	}
	if req.TaggedQuests != nil {
		existing.TaggedQuests = *req.TaggedQuests
	}

	if err := h.db.UpdatePlayerJournalEntry(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update journal entry"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteJournalEntry deletes a journal entry
func (h *PlayerModeHandler) DeleteJournalEntry(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID := c.Param("id")
	existing, err := h.db.GetPlayerJournalEntryByID(c.Request.Context(), entryID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "journal entry not found"})
			return
		}
		h.logger.Error("Failed to get journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get journal entry"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeletePlayerJournalEntry(c.Request.Context(), entryID); err != nil {
		h.logger.Error("Failed to delete journal entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete journal entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "journal entry deleted"})
}

// =============================================================================
// NPC Encounter Handlers
// =============================================================================

type CreateNPCEncounterRequest struct {
	CampaignID       *string    `json:"campaign_id,omitempty"`
	NPCID            *string    `json:"npc_id,omitempty"`
	Name             string     `json:"name" binding:"required"`
	Description      *string    `json:"description,omitempty"`
	Relationship     string     `json:"relationship"`
	FirstMetSession  *int       `json:"first_met_session,omitempty"`
	FirstMetLocation *string    `json:"first_met_location,omitempty"`
	LastInteraction  *time.Time `json:"last_interaction,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

type UpdateNPCEncounterRequest struct {
	Name             string     `json:"name" binding:"required"`
	Description      *string    `json:"description,omitempty"`
	Relationship     string     `json:"relationship"`
	FirstMetSession  *int       `json:"first_met_session,omitempty"`
	FirstMetLocation *string    `json:"first_met_location,omitempty"`
	LastInteraction  *time.Time `json:"last_interaction,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

// CreateNPCEncounter creates a new NPC encounter log
func (h *PlayerModeHandler) CreateNPCEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateNPCEncounterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	relationship := req.Relationship
	if relationship == "" {
		relationship = "neutral"
	}

	encounter := &db.PlayerNPCEncounter{
		UserID:           userID,
		CampaignID:       req.CampaignID,
		NPCID:            req.NPCID,
		Name:             req.Name,
		Description:      req.Description,
		Relationship:     relationship,
		FirstMetSession:  req.FirstMetSession,
		FirstMetLocation: req.FirstMetLocation,
		LastInteraction:  req.LastInteraction,
		Notes:            req.Notes,
		IsGMRevealed:     false,
	}

	if err := h.db.CreatePlayerNPCEncounter(c.Request.Context(), encounter); err != nil {
		h.logger.Error("Failed to create NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create NPC encounter"})
		return
	}

	c.JSON(http.StatusCreated, encounter)
}

// GetNPCEncounter retrieves an NPC encounter by ID
func (h *PlayerModeHandler) GetNPCEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	encounterID := c.Param("id")
	encounter, err := h.db.GetPlayerNPCEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "NPC encounter not found"})
			return
		}
		h.logger.Error("Failed to get NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get NPC encounter"})
		return
	}

	if encounter.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// ListNPCEncounters lists all NPC encounters for the user
func (h *PlayerModeHandler) ListNPCEncounters(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	encounters, err := h.db.ListPlayerNPCEncounters(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list NPC encounters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list NPC encounters"})
		return
	}

	if encounters == nil {
		encounters = []*db.PlayerNPCEncounter{}
	}

	c.JSON(http.StatusOK, encounters)
}

// UpdateNPCEncounter updates an NPC encounter
func (h *PlayerModeHandler) UpdateNPCEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	encounterID := c.Param("id")
	existing, err := h.db.GetPlayerNPCEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "NPC encounter not found"})
			return
		}
		h.logger.Error("Failed to get NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get NPC encounter"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateNPCEncounterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.Relationship = req.Relationship
	existing.FirstMetSession = req.FirstMetSession
	existing.FirstMetLocation = req.FirstMetLocation
	existing.LastInteraction = req.LastInteraction
	existing.Notes = req.Notes

	if err := h.db.UpdatePlayerNPCEncounter(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update NPC encounter"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteNPCEncounter deletes an NPC encounter
func (h *PlayerModeHandler) DeleteNPCEncounter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	encounterID := c.Param("id")
	existing, err := h.db.GetPlayerNPCEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "NPC encounter not found"})
			return
		}
		h.logger.Error("Failed to get NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get NPC encounter"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeletePlayerNPCEncounter(c.Request.Context(), encounterID); err != nil {
		h.logger.Error("Failed to delete NPC encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete NPC encounter"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "NPC encounter deleted"})
}

// =============================================================================
// Location Visit Handlers
// =============================================================================

type CreateLocationVisitRequest struct {
	CampaignID        *string `json:"campaign_id,omitempty"`
	LocationID        *string `json:"location_id,omitempty"`
	Name              string  `json:"name" binding:"required"`
	Description       *string `json:"description,omitempty"`
	FirstVisitSession *int    `json:"first_visit_session,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

type UpdateLocationVisitRequest struct {
	Name              string  `json:"name" binding:"required"`
	Description       *string `json:"description,omitempty"`
	FirstVisitSession *int    `json:"first_visit_session,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

// CreateLocationVisit creates a new location visit log
func (h *PlayerModeHandler) CreateLocationVisit(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateLocationVisitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	visit := &db.PlayerLocationVisit{
		UserID:            userID,
		CampaignID:        req.CampaignID,
		LocationID:        req.LocationID,
		Name:              req.Name,
		Description:       req.Description,
		FirstVisitSession: req.FirstVisitSession,
		Notes:             req.Notes,
		IsGMRevealed:      false,
	}

	if err := h.db.CreatePlayerLocationVisit(c.Request.Context(), visit); err != nil {
		h.logger.Error("Failed to create location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create location visit"})
		return
	}

	c.JSON(http.StatusCreated, visit)
}

// GetLocationVisit retrieves a location visit by ID
func (h *PlayerModeHandler) GetLocationVisit(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	visitID := c.Param("id")
	visit, err := h.db.GetPlayerLocationVisitByID(c.Request.Context(), visitID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "location visit not found"})
			return
		}
		h.logger.Error("Failed to get location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get location visit"})
		return
	}

	if visit.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, visit)
}

// ListLocationVisits lists all location visits for the user
func (h *PlayerModeHandler) ListLocationVisits(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	visits, err := h.db.ListPlayerLocationVisits(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list location visits", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list location visits"})
		return
	}

	if visits == nil {
		visits = []*db.PlayerLocationVisit{}
	}

	c.JSON(http.StatusOK, visits)
}

// UpdateLocationVisit updates a location visit
func (h *PlayerModeHandler) UpdateLocationVisit(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	visitID := c.Param("id")
	existing, err := h.db.GetPlayerLocationVisitByID(c.Request.Context(), visitID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "location visit not found"})
			return
		}
		h.logger.Error("Failed to get location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get location visit"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateLocationVisitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.FirstVisitSession = req.FirstVisitSession
	existing.Notes = req.Notes

	if err := h.db.UpdatePlayerLocationVisit(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update location visit"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteLocationVisit deletes a location visit
func (h *PlayerModeHandler) DeleteLocationVisit(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	visitID := c.Param("id")
	existing, err := h.db.GetPlayerLocationVisitByID(c.Request.Context(), visitID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "location visit not found"})
			return
		}
		h.logger.Error("Failed to get location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get location visit"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeletePlayerLocationVisit(c.Request.Context(), visitID); err != nil {
		h.logger.Error("Failed to delete location visit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete location visit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "location visit deleted"})
}

// =============================================================================
// Quest Tracking Handlers
// =============================================================================

type CreateQuestTrackingRequest struct {
	CampaignID  *string          `json:"campaign_id,omitempty"`
	CharacterID *string          `json:"character_id,omitempty"`
	QuestID     *string          `json:"quest_id,omitempty"`
	Title       string           `json:"title" binding:"required"`
	Description *string          `json:"description,omitempty"`
	QuestType   string           `json:"quest_type"`
	Status      string           `json:"status"`
	Objectives  *json.RawMessage `json:"objectives,omitempty"`
	Priority    int              `json:"priority"`
	Notes       *string          `json:"notes,omitempty"`
}

type UpdateQuestTrackingRequest struct {
	Title       string           `json:"title" binding:"required"`
	Description *string          `json:"description,omitempty"`
	QuestType   string           `json:"quest_type"`
	Status      string           `json:"status"`
	Objectives  *json.RawMessage `json:"objectives,omitempty"`
	Priority    int              `json:"priority"`
	Notes       *string          `json:"notes,omitempty"`
	CompletedAt *time.Time       `json:"completed_at,omitempty"`
}

// CreateQuestTracking creates a new quest tracking entry
func (h *PlayerModeHandler) CreateQuestTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateQuestTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	questType := req.QuestType
	if questType == "" {
		questType = "personal"
	}
	status := req.Status
	if status == "" {
		status = "active"
	}

	quest := &db.PlayerQuestTracking{
		UserID:      userID,
		CampaignID:  req.CampaignID,
		CharacterID: req.CharacterID,
		QuestID:     req.QuestID,
		Title:       req.Title,
		Description: req.Description,
		QuestType:   questType,
		Status:      status,
		Priority:    req.Priority,
		Notes:       req.Notes,
	}

	if req.Objectives != nil {
		quest.Objectives = *req.Objectives
	} else {
		quest.Objectives = []byte("[]")
	}

	if err := h.db.CreatePlayerQuestTracking(c.Request.Context(), quest); err != nil {
		h.logger.Error("Failed to create quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create quest tracking"})
		return
	}

	c.JSON(http.StatusCreated, quest)
}

// GetQuestTracking retrieves a quest tracking entry by ID
func (h *PlayerModeHandler) GetQuestTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	questID := c.Param("id")
	quest, err := h.db.GetPlayerQuestTrackingByID(c.Request.Context(), questID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "quest tracking not found"})
			return
		}
		h.logger.Error("Failed to get quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get quest tracking"})
		return
	}

	if quest.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, quest)
}

// ListQuestTracking lists all quest tracking entries for the user
func (h *PlayerModeHandler) ListQuestTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	var status *string
	if s := c.Query("status"); s != "" {
		status = &s
	}

	quests, err := h.db.ListPlayerQuestTracking(c.Request.Context(), userID, campaignID, status)
	if err != nil {
		h.logger.Error("Failed to list quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list quest tracking"})
		return
	}

	if quests == nil {
		quests = []*db.PlayerQuestTracking{}
	}

	c.JSON(http.StatusOK, quests)
}

// UpdateQuestTracking updates a quest tracking entry
func (h *PlayerModeHandler) UpdateQuestTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	questID := c.Param("id")
	existing, err := h.db.GetPlayerQuestTrackingByID(c.Request.Context(), questID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "quest tracking not found"})
			return
		}
		h.logger.Error("Failed to get quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get quest tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateQuestTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Title = req.Title
	existing.Description = req.Description
	existing.QuestType = req.QuestType
	existing.Status = req.Status
	existing.Priority = req.Priority
	existing.Notes = req.Notes
	existing.CompletedAt = req.CompletedAt

	if req.Objectives != nil {
		existing.Objectives = *req.Objectives
	}

	if err := h.db.UpdatePlayerQuestTracking(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update quest tracking"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteQuestTracking deletes a quest tracking entry
func (h *PlayerModeHandler) DeleteQuestTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	questID := c.Param("id")
	existing, err := h.db.GetPlayerQuestTrackingByID(c.Request.Context(), questID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "quest tracking not found"})
			return
		}
		h.logger.Error("Failed to get quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get quest tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeletePlayerQuestTracking(c.Request.Context(), questID); err != nil {
		h.logger.Error("Failed to delete quest tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete quest tracking"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "quest tracking deleted"})
}

// =============================================================================
// Ability Usage Tracking Handlers
// =============================================================================

type CreateAbilityTrackingRequest struct {
	CharacterID  string  `json:"character_id" binding:"required"`
	AbilityName  string  `json:"ability_name" binding:"required"`
	AbilityType  *string `json:"ability_type,omitempty"`
	MaxUses      int     `json:"max_uses" binding:"required"`
	CurrentUses  int     `json:"current_uses"`
	RechargeType *string `json:"recharge_type,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

type UpdateAbilityTrackingRequest struct {
	AbilityName  string  `json:"ability_name" binding:"required"`
	AbilityType  *string `json:"ability_type,omitempty"`
	MaxUses      int     `json:"max_uses" binding:"required"`
	CurrentUses  int     `json:"current_uses"`
	RechargeType *string `json:"recharge_type,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

// CreateAbilityTracking creates a new ability tracking entry
func (h *PlayerModeHandler) CreateAbilityTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateAbilityTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tracking := &db.AbilityUsageTracking{
		UserID:       userID,
		CharacterID:  req.CharacterID,
		AbilityName:  req.AbilityName,
		AbilityType:  req.AbilityType,
		MaxUses:      req.MaxUses,
		CurrentUses:  req.CurrentUses,
		RechargeType: req.RechargeType,
		Notes:        req.Notes,
	}

	if err := h.db.CreateAbilityUsageTracking(c.Request.Context(), tracking); err != nil {
		h.logger.Error("Failed to create ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ability tracking"})
		return
	}

	c.JSON(http.StatusCreated, tracking)
}

// ListAbilityTracking lists all ability tracking for a character
func (h *PlayerModeHandler) ListAbilityTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	characterID := c.Param("characterId")

	// Verify the character belongs to the user
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
			return
		}
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character"})
		return
	}

	if character.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	trackings, err := h.db.ListAbilityUsageTracking(c.Request.Context(), characterID)
	if err != nil {
		h.logger.Error("Failed to list ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list ability tracking"})
		return
	}

	if trackings == nil {
		trackings = []*db.AbilityUsageTracking{}
	}

	// Return response matching frontend expectations
	c.JSON(http.StatusOK, gin.H{
		"abilities":   trackings,
		"spell_slots": []interface{}{}, // Empty array for now
	})
}

// UpdateAbilityTracking updates an ability tracking entry
func (h *PlayerModeHandler) UpdateAbilityTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	abilityID := c.Param("id")
	existing, err := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "ability tracking not found"})
			return
		}
		h.logger.Error("Failed to get ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ability tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateAbilityTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.AbilityName = req.AbilityName
	existing.AbilityType = req.AbilityType
	existing.MaxUses = req.MaxUses
	existing.CurrentUses = req.CurrentUses
	existing.RechargeType = req.RechargeType
	existing.Notes = req.Notes

	if err := h.db.UpdateAbilityUsageTracking(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update ability tracking"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeleteAbilityTracking deletes an ability tracking entry
func (h *PlayerModeHandler) DeleteAbilityTracking(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	abilityID := c.Param("id")
	existing, err := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "ability tracking not found"})
			return
		}
		h.logger.Error("Failed to get ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ability tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeleteAbilityUsageTracking(c.Request.Context(), abilityID); err != nil {
		h.logger.Error("Failed to delete ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete ability tracking"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ability tracking deleted"})
}

// UseAbility decrements the current uses of an ability
func (h *PlayerModeHandler) UseAbility(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	abilityID := c.Param("id")
	existing, err := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "ability tracking not found"})
			return
		}
		h.logger.Error("Failed to get ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ability tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.UseAbility(c.Request.Context(), abilityID); err != nil {
		h.logger.Error("Failed to use ability", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to use ability"})
		return
	}

	// Fetch updated tracking
	updated, _ := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	c.JSON(http.StatusOK, updated)
}

// ResetAbility resets the current uses to max uses
func (h *PlayerModeHandler) ResetAbility(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	abilityID := c.Param("id")
	existing, err := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "ability tracking not found"})
			return
		}
		h.logger.Error("Failed to get ability tracking", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get ability tracking"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.ResetAbility(c.Request.Context(), abilityID); err != nil {
		h.logger.Error("Failed to reset ability", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset ability"})
		return
	}

	// Fetch updated tracking
	updated, _ := h.db.GetAbilityUsageTrackingByID(c.Request.Context(), abilityID)
	c.JSON(http.StatusOK, updated)
}

type RestRequest struct {
	RechargeType string `json:"recharge_type" binding:"required"`
}

// TakeRest resets all abilities of a certain recharge type for a character
func (h *PlayerModeHandler) TakeRest(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	characterID := c.Param("characterId")

	// Verify the character belongs to the user
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
			return
		}
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character"})
		return
	}

	if character.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req RestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.ResetAbilitiesByRechargeType(c.Request.Context(), characterID, req.RechargeType); err != nil {
		h.logger.Error("Failed to reset abilities by recharge type", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset abilities"})
		return
	}

	// Return updated list
	trackings, _ := h.db.ListAbilityUsageTracking(c.Request.Context(), characterID)
	c.JSON(http.StatusOK, trackings)
}

// =============================================================================
// Party Loot Handlers
// =============================================================================

type CreatePartyLootRequest struct {
	ItemID          *string `json:"item_id,omitempty"`
	Name            string  `json:"name" binding:"required"`
	Description     *string `json:"description,omitempty"`
	Quantity        int     `json:"quantity"`
	Value           *string `json:"value,omitempty"`
	ClaimedBy       *string `json:"claimed_by,omitempty"`
	ClaimedByName   *string `json:"claimed_by_name,omitempty"`
	Source          *string `json:"source,omitempty"`
	SessionAcquired *int    `json:"session_acquired,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type UpdatePartyLootRequest struct {
	Name            string  `json:"name" binding:"required"`
	Description     *string `json:"description,omitempty"`
	Quantity        int     `json:"quantity"`
	Value           *string `json:"value,omitempty"`
	ClaimedBy       *string `json:"claimed_by,omitempty"`
	ClaimedByName   *string `json:"claimed_by_name,omitempty"`
	Source          *string `json:"source,omitempty"`
	SessionAcquired *int    `json:"session_acquired,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type ClaimLootRequest struct {
	CharacterID   string `json:"character_id" binding:"required"`
	CharacterName string `json:"character_name" binding:"required"`
}

// CreatePartyLoot creates a new party loot item
func (h *PlayerModeHandler) CreatePartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify the user has access to this campaign (either as owner or member)
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	// Check if user is owner or member
	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), campaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	var req CreatePartyLootRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	quantity := req.Quantity
	if quantity < 1 {
		quantity = 1
	}

	loot := &db.PartyLoot{
		CampaignID:      campaignID,
		ItemID:          req.ItemID,
		Name:            req.Name,
		Description:     req.Description,
		Quantity:        quantity,
		Value:           req.Value,
		ClaimedBy:       req.ClaimedBy,
		ClaimedByName:   req.ClaimedByName,
		Source:          req.Source,
		SessionAcquired: req.SessionAcquired,
		Notes:           req.Notes,
		CreatedBy:       userID,
	}

	if err := h.db.CreatePartyLoot(c.Request.Context(), loot); err != nil {
		h.logger.Error("Failed to create party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create party loot"})
		return
	}

	c.JSON(http.StatusCreated, loot)
}

// GetPartyLoot retrieves a party loot item by ID
func (h *PlayerModeHandler) GetPartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	lootID := c.Param("lootId")
	loot, err := h.db.GetPartyLootByID(c.Request.Context(), lootID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "party loot not found"})
			return
		}
		h.logger.Error("Failed to get party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party loot"})
		return
	}

	// Verify campaign access
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), loot.CampaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}

	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), loot.CampaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	c.JSON(http.StatusOK, loot)
}

// ListPartyLoot lists all loot for a campaign
func (h *PlayerModeHandler) ListPartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify campaign access
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), campaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	loot, err := h.db.ListPartyLoot(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list party loot"})
		return
	}

	if loot == nil {
		loot = []*db.PartyLoot{}
	}

	c.JSON(http.StatusOK, loot)
}

// UpdatePartyLoot updates a party loot item
func (h *PlayerModeHandler) UpdatePartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	lootID := c.Param("lootId")
	existing, err := h.db.GetPartyLootByID(c.Request.Context(), lootID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "party loot not found"})
			return
		}
		h.logger.Error("Failed to get party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party loot"})
		return
	}

	// Verify campaign access
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), existing.CampaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}

	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), existing.CampaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	var req UpdatePartyLootRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.Quantity = req.Quantity
	existing.Value = req.Value
	existing.ClaimedBy = req.ClaimedBy
	existing.ClaimedByName = req.ClaimedByName
	existing.Source = req.Source
	existing.SessionAcquired = req.SessionAcquired
	existing.Notes = req.Notes

	if err := h.db.UpdatePartyLoot(c.Request.Context(), existing); err != nil {
		h.logger.Error("Failed to update party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update party loot"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// DeletePartyLoot deletes a party loot item
func (h *PlayerModeHandler) DeletePartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	lootID := c.Param("lootId")
	existing, err := h.db.GetPartyLootByID(c.Request.Context(), lootID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "party loot not found"})
			return
		}
		h.logger.Error("Failed to get party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party loot"})
		return
	}

	// Only campaign owner or the user who created the loot can delete it
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), existing.CampaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}

	if campaign.UserID != userID && existing.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.db.DeletePartyLoot(c.Request.Context(), lootID); err != nil {
		h.logger.Error("Failed to delete party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete party loot"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "party loot deleted"})
}

// ClaimPartyLoot assigns a loot item to a character
func (h *PlayerModeHandler) ClaimPartyLoot(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	lootID := c.Param("lootId")
	existing, err := h.db.GetPartyLootByID(c.Request.Context(), lootID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "party loot not found"})
			return
		}
		h.logger.Error("Failed to get party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party loot"})
		return
	}

	// Verify campaign access
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), existing.CampaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}

	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), existing.CampaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	var req ClaimLootRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.ClaimPartyLoot(c.Request.Context(), lootID, req.CharacterID, req.CharacterName); err != nil {
		h.logger.Error("Failed to claim party loot", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to claim party loot"})
		return
	}

	// Fetch updated loot
	updated, _ := h.db.GetPartyLootByID(c.Request.Context(), lootID)
	c.JSON(http.StatusOK, updated)
}

// =============================================================================
// Content Reveal Handlers (GM only)
// =============================================================================

type CreateContentRevealRequest struct {
	ContentType string  `json:"content_type" binding:"required"`
	ContentID   string  `json:"content_id" binding:"required"`
	RevealLevel string  `json:"reveal_level"`
	CustomNotes *string `json:"custom_notes,omitempty"`
}

// CreateContentReveal reveals content to players (GM only)
func (h *PlayerModeHandler) CreateContentReveal(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify the user is the campaign owner (GM)
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the GM can reveal content"})
		return
	}

	var req CreateContentRevealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	revealLevel := req.RevealLevel
	if revealLevel == "" {
		revealLevel = "full"
	}

	reveal := &db.ContentReveal{
		CampaignID:  campaignID,
		RevealedBy:  userID,
		ContentType: req.ContentType,
		ContentID:   req.ContentID,
		RevealLevel: revealLevel,
		CustomNotes: req.CustomNotes,
	}

	if err := h.db.CreateContentReveal(c.Request.Context(), reveal); err != nil {
		h.logger.Error("Failed to create content reveal", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create content reveal"})
		return
	}

	c.JSON(http.StatusCreated, reveal)
}

// ListContentReveals lists all revealed content for a campaign (GM)
func (h *PlayerModeHandler) ListContentReveals(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify the user is the campaign owner (GM)
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the GM can view reveals"})
		return
	}

	var contentType *string
	if ct := c.Query("content_type"); ct != "" {
		contentType = &ct
	}

	reveals, err := h.db.ListContentReveals(c.Request.Context(), campaignID, contentType)
	if err != nil {
		h.logger.Error("Failed to list content reveals", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list content reveals"})
		return
	}

	if reveals == nil {
		reveals = []*db.ContentReveal{}
	}

	c.JSON(http.StatusOK, reveals)
}

// DeleteContentReveal un-reveals content (GM only)
func (h *PlayerModeHandler) DeleteContentReveal(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	revealID := c.Param("revealId")

	// Verify the user is the campaign owner (GM)
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the GM can un-reveal content"})
		return
	}

	if err := h.db.DeleteContentReveal(c.Request.Context(), revealID); err != nil {
		h.logger.Error("Failed to delete content reveal", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete content reveal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "content reveal deleted"})
}

// GetRevealedContent lists revealed content for a player in a campaign
func (h *PlayerModeHandler) GetRevealedContent(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify the user has access to this campaign
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get campaign"})
		return
	}

	isOwner := campaign.UserID == userID
	if !isOwner {
		member, err := h.db.GetCampaignMember(c.Request.Context(), campaignID, userID)
		if err != nil || member == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	var contentType *string
	if ct := c.Query("content_type"); ct != "" {
		contentType = &ct
	}

	reveals, err := h.db.ListContentReveals(c.Request.Context(), campaignID, contentType)
	if err != nil {
		h.logger.Error("Failed to list content reveals", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list content reveals"})
		return
	}

	if reveals == nil {
		reveals = []*db.ContentReveal{}
	}

	c.JSON(http.StatusOK, reveals)
}

// =============================================================================
// Player Combat State Handlers
// =============================================================================

type UpdatePlayerCombatRequest struct {
	IsInCombat         *bool            `json:"is_in_combat,omitempty"`
	CurrentHP          *int             `json:"current_hp,omitempty"`
	MaxHP              *int             `json:"max_hp,omitempty"`
	TempHP             *int             `json:"temp_hp,omitempty"`
	Conditions         *json.RawMessage `json:"conditions,omitempty"`
	ConcentrationSpell *string          `json:"concentration_spell,omitempty"`
	ReactionUsed       *bool            `json:"reaction_used,omitempty"`
	Initiative         *int             `json:"initiative,omitempty"`
	ClearInitiative    bool             `json:"clear_initiative,omitempty"`
	Notes              *string          `json:"notes,omitempty"`
}

// GetPlayerCombatState retrieves the combat state for a character
func (h *PlayerModeHandler) GetPlayerCombatState(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	characterID := c.Query("character_id")
	if characterID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character_id is required"})
		return
	}

	// Verify the character belongs to the user
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
			return
		}
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character"})
		return
	}

	if character.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	state, err := h.db.GetPlayerCombatStateByCharacterID(c.Request.Context(), characterID)
	if err != nil {
		if err == sql.ErrNoRows {
			// No combat state exists yet, return default state based on character
			c.JSON(http.StatusOK, gin.H{
				"character_id":  characterID,
				"is_in_combat":  false,
				"current_hp":    character.CurrentHitPoints,
				"max_hp":        character.MaxHitPoints,
				"temp_hp":       0,
				"conditions":    []interface{}{},
				"reaction_used": false,
			})
			return
		}
		h.logger.Error("Failed to get player combat state", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get combat state"})
		return
	}

	c.JSON(http.StatusOK, state)
}

// UpdatePlayerCombatState updates or creates the combat state for a character
func (h *PlayerModeHandler) UpdatePlayerCombatState(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	characterID := c.Param("characterId")

	// Verify the character belongs to the user
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
			return
		}
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character"})
		return
	}

	if character.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdatePlayerCombatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing state or create new one
	state, err := h.db.GetPlayerCombatStateByCharacterID(c.Request.Context(), characterID)
	if err != nil && err != sql.ErrNoRows {
		h.logger.Error("Failed to get player combat state", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get combat state"})
		return
	}

	// Initialize new state if it doesn't exist
	if state == nil {
		state = &db.PlayerCombatState{
			UserID:       userID,
			CharacterID:  characterID,
			CampaignID:   character.CampaignID,
			IsInCombat:   false,
			CurrentHP:    character.CurrentHitPoints,
			MaxHP:        character.MaxHitPoints,
			TempHP:       0,
			Conditions:   []byte("[]"),
			ReactionUsed: false,
		}
	}

	// Apply updates from request
	if req.IsInCombat != nil {
		state.IsInCombat = *req.IsInCombat
	}
	if req.CurrentHP != nil {
		state.CurrentHP = *req.CurrentHP
	}
	if req.MaxHP != nil {
		state.MaxHP = *req.MaxHP
	}
	if req.TempHP != nil {
		state.TempHP = *req.TempHP
	}
	if req.Conditions != nil {
		state.Conditions = *req.Conditions
	}
	if req.ConcentrationSpell != nil {
		if *req.ConcentrationSpell == "" {
			state.ConcentrationSpell = nil
		} else {
			state.ConcentrationSpell = req.ConcentrationSpell
		}
	}
	if req.ReactionUsed != nil {
		state.ReactionUsed = *req.ReactionUsed
	}
	if req.ClearInitiative {
		state.Initiative = nil
	} else if req.Initiative != nil {
		state.Initiative = req.Initiative
		// If initiative is set, mark as in combat
		state.IsInCombat = true
	}
	if req.Notes != nil {
		if *req.Notes == "" {
			state.Notes = nil
		} else {
			state.Notes = req.Notes
		}
	}

	// Upsert the state
	if err := h.db.UpsertPlayerCombatState(c.Request.Context(), state); err != nil {
		h.logger.Error("Failed to update player combat state", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update combat state"})
		return
	}

	// Fetch and return the updated state
	updated, err := h.db.GetPlayerCombatStateByCharacterID(c.Request.Context(), characterID)
	if err != nil {
		h.logger.Error("Failed to get updated combat state", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get updated state"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
