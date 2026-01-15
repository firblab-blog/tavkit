package handlers

import (
	"net/http"
	"time"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CombatHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewCombatHandler(database db.Database, logger *zap.Logger) *CombatHandler {
	return &CombatHandler{
		db:     database,
		logger: logger,
	}
}

// Request/Response types

type CreateCombatRequest struct {
	SessionID   string  `json:"session_id" binding:"required"`
	EncounterID *string `json:"encounter_id,omitempty"`
	Name        string  `json:"name" binding:"required"`
	Difficulty  *string `json:"difficulty,omitempty"`
	Environment *string `json:"environment,omitempty"`
	Notes       *string `json:"notes,omitempty"`
}

type UpdateCombatRequest struct {
	CurrentRound *int    `json:"current_round,omitempty"`
	CurrentTurn  *int    `json:"current_turn,omitempty"`
	Status       *string `json:"status,omitempty"`
	Difficulty   *string `json:"difficulty,omitempty"`
	Environment  *string `json:"environment,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

type AddParticipantRequest struct {
	ParticipantType     string  `json:"participant_type" binding:"required"` // 'pc', 'npc', 'monster'
	CharacterID         *string `json:"character_id,omitempty"`
	NPCID               *string `json:"npc_id,omitempty"`
	MonsterID           *string `json:"monster_id,omitempty"`
	Name                string  `json:"name" binding:"required"`
	MaxHP               int     `json:"max_hp" binding:"required"`
	AC                  int     `json:"ac" binding:"required"`
	StatsSnapshot       *string `json:"stats_snapshot,omitempty"`
	AbilitiesSnapshot   *string `json:"abilities_snapshot,omitempty"`
	Initiative          int     `json:"initiative" binding:"required"`
	InitiativeBonus     int     `json:"initiative_bonus"`
	PassivePerception   *int    `json:"passive_perception,omitempty"`
	LegendaryActionsMax int     `json:"legendary_actions_max"`
}

type UpdateCombatParticipantRequest struct {
	Initiative           *int    `json:"initiative,omitempty"`
	CurrentHP            *int    `json:"current_hp,omitempty"`
	TempHP               *int    `json:"temp_hp,omitempty"`
	PassivePerception    *int    `json:"passive_perception,omitempty"`
	Conditions           *string `json:"conditions,omitempty"` // JSON array
	ConcentrationSpell   *string `json:"concentration_spell,omitempty"`
	DeathSaves           *string `json:"death_saves,omitempty"` // JSON object
	IsSurprised          *bool   `json:"is_surprised,omitempty"`
	HasReaction          *bool   `json:"has_reaction,omitempty"`
	LegendaryActionsUsed *int    `json:"legendary_actions_used,omitempty"`
	Position             *int    `json:"position,omitempty"`
	Notes                *string `json:"notes,omitempty"`
}

type AddConditionRequest struct {
	ConditionName  string  `json:"condition_name" binding:"required"`
	DurationRounds *int    `json:"duration_rounds,omitempty"`
	SaveDC         *int    `json:"save_dc,omitempty"`
	SaveAbility    *string `json:"save_ability,omitempty"`
	Source         *string `json:"source,omitempty"`
	AppliedRound   int     `json:"applied_round" binding:"required"`
	Notes          *string `json:"notes,omitempty"`
}

// ============================================================================
// COMBAT ENCOUNTER HANDLERS
// ============================================================================

// CreateCombat starts a new combat encounter
// POST /api/v1/combat
func (h *CombatHandler) CreateCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateCombatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify session ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), req.SessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	if session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	combat := &db.CombatEncounter{
		SessionID:    req.SessionID,
		EncounterID:  req.EncounterID,
		Name:         req.Name,
		CurrentRound: 0,
		CurrentTurn:  0,
		Status:       "active",
		Difficulty:   req.Difficulty,
		Environment:  req.Environment,
		Notes:        req.Notes,
		CreatedAt:    time.Now(),
	}

	if err := h.db.CreateCombatEncounter(c.Request.Context(), combat); err != nil {
		h.logger.Error("Failed to create combat encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create combat"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"combat": combat})
}

// GetCombat retrieves combat encounter details
// GET /api/v1/combat/:id
func (h *CombatHandler) GetCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership via session
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"combat": combat})
}

// UpdateCombat updates combat encounter state
// PUT /api/v1/combat/:id
func (h *CombatHandler) UpdateCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req UpdateCombatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.CurrentRound != nil {
		combat.CurrentRound = *req.CurrentRound
	}
	if req.CurrentTurn != nil {
		combat.CurrentTurn = *req.CurrentTurn
	}
	if req.Status != nil {
		combat.Status = *req.Status
	}
	if req.Difficulty != nil {
		combat.Difficulty = req.Difficulty
	}
	if req.Environment != nil {
		combat.Environment = req.Environment
	}
	if req.Notes != nil {
		combat.Notes = req.Notes
	}

	if err := h.db.UpdateCombatEncounter(c.Request.Context(), combat); err != nil {
		h.logger.Error("Failed to update combat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update combat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"combat": combat})
}

// NextTurn advances combat to next turn
// POST /api/v1/combat/:id/next-turn
func (h *CombatHandler) NextTurn(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Get all participants to determine turn order
	participants, err := h.db.ListCombatParticipants(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to list participants", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get participants"})
		return
	}

	// Advance turn
	combat.CurrentTurn++
	if combat.CurrentTurn >= len(participants) {
		combat.CurrentTurn = 0
		combat.CurrentRound++
	}

	if err := h.db.UpdateCombatEncounter(c.Request.Context(), combat); err != nil {
		h.logger.Error("Failed to update combat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to advance turn"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"combat": combat, "message": "Turn advanced"})
}

// ============================================================================
// PARTICIPANT HANDLERS
// ============================================================================

// AddParticipant adds a combatant to the encounter
// POST /api/v1/combat/:id/participants
func (h *CombatHandler) AddParticipant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req AddParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	participant := &db.CombatParticipant{
		CombatID:             combatID,
		ParticipantType:      req.ParticipantType,
		CharacterID:          req.CharacterID,
		NPCID:                req.NPCID,
		MonsterID:            req.MonsterID,
		Name:                 req.Name,
		MaxHP:                req.MaxHP,
		AC:                   req.AC,
		Initiative:           req.Initiative,
		InitiativeBonus:      req.InitiativeBonus,
		CurrentHP:            req.MaxHP, // Start at max HP
		TempHP:               0,
		PassivePerception:    req.PassivePerception,
		IsSurprised:          false,
		HasReaction:          true,
		LegendaryActionsUsed: 0,
		LegendaryActionsMax:  req.LegendaryActionsMax,
		Position:             0, // Will be set based on initiative order
	}

	if req.StatsSnapshot != nil {
		participant.StatsSnapshot = []byte(*req.StatsSnapshot)
	}
	if req.AbilitiesSnapshot != nil {
		participant.AbilitiesSnapshot = []byte(*req.AbilitiesSnapshot)
	}

	if err := h.db.CreateCombatParticipant(c.Request.Context(), participant); err != nil {
		h.logger.Error("Failed to add participant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add participant"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"participant": participant})
}

// ListParticipants lists all combatants in initiative order
// GET /api/v1/combat/:id/participants
func (h *CombatHandler) ListParticipants(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	participants, err := h.db.ListCombatParticipants(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to list participants", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list participants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"participants": participants})
}

// UpdateParticipant updates combatant state (HP, conditions, etc.)
// PUT /api/v1/combat/:id/participants/:pid
func (h *CombatHandler) UpdateParticipant(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")
	participantID := c.Param("pid")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	participant, err := h.db.GetCombatParticipantByID(c.Request.Context(), participantID)
	if err != nil {
		h.logger.Error("Failed to get participant", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "participant not found"})
		return
	}

	var req UpdateCombatParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Initiative != nil {
		participant.Initiative = *req.Initiative
	}
	if req.CurrentHP != nil {
		participant.CurrentHP = *req.CurrentHP
	}
	if req.TempHP != nil {
		participant.TempHP = *req.TempHP
	}
	if req.PassivePerception != nil {
		participant.PassivePerception = req.PassivePerception
	}
	if req.Conditions != nil {
		participant.Conditions = []byte(*req.Conditions)
	}
	if req.ConcentrationSpell != nil {
		participant.ConcentrationSpell = req.ConcentrationSpell
	}
	if req.DeathSaves != nil {
		participant.DeathSaves = []byte(*req.DeathSaves)
	}
	if req.IsSurprised != nil {
		participant.IsSurprised = *req.IsSurprised
	}
	if req.HasReaction != nil {
		participant.HasReaction = *req.HasReaction
	}
	if req.LegendaryActionsUsed != nil {
		participant.LegendaryActionsUsed = *req.LegendaryActionsUsed
	}
	if req.Position != nil {
		participant.Position = *req.Position
	}
	if req.Notes != nil {
		participant.Notes = req.Notes
	}

	if err := h.db.UpdateCombatParticipant(c.Request.Context(), participant); err != nil {
		h.logger.Error("Failed to update participant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update participant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"participant": participant})
}

// RemoveParticipant removes a combatant from combat
// DELETE /api/v1/combat/:id/participants/:pid
func (h *CombatHandler) RemoveParticipant(c *gin.Context) {
	HandleCombatSubEntityDelete(
		c,
		"Participant",
		"pid",
		h.db.GetCombatEncounterByIDWithInterface,
		h.db.GetSessionByIDWithInterface,
		h.db.DeleteCombatParticipant,
		h.logger,
	)
}

// ============================================================================
// CONDITION HANDLERS
// ============================================================================

// AddCondition applies a condition to a participant
// POST /api/v1/combat/:id/participants/:pid/conditions
func (h *CombatHandler) AddCondition(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")
	participantID := c.Param("pid")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req AddConditionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	condition := &db.CombatCondition{
		ParticipantID:  participantID,
		ConditionName:  req.ConditionName,
		DurationRounds: req.DurationRounds,
		SaveDC:         req.SaveDC,
		SaveAbility:    req.SaveAbility,
		Source:         req.Source,
		AppliedRound:   req.AppliedRound,
		Notes:          req.Notes,
	}

	if err := h.db.CreateCombatCondition(c.Request.Context(), condition); err != nil {
		h.logger.Error("Failed to add condition", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add condition"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"condition": condition})
}

// ListConditions lists all conditions on a participant
// GET /api/v1/combat/:id/participants/:pid/conditions
func (h *CombatHandler) ListConditions(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")
	participantID := c.Param("pid")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Verify ownership
	session, err := h.db.GetSessionByID(c.Request.Context(), combat.SessionID)
	if err != nil || session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	conditions, err := h.db.ListCombatConditions(c.Request.Context(), participantID)
	if err != nil {
		h.logger.Error("Failed to list conditions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list conditions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conditions": conditions})
}

// RemoveCondition removes a condition from a participant
// DELETE /api/v1/combat/:id/participants/:pid/conditions/:cid
func (h *CombatHandler) RemoveCondition(c *gin.Context) {
	HandleCombatSubEntityDelete(
		c,
		"Condition",
		"cid",
		h.db.GetCombatEncounterByIDWithInterface,
		h.db.GetSessionByIDWithInterface,
		h.db.DeleteCombatCondition,
		h.logger,
	)
}

// ============================================================================
// CAMPAIGN-LINKED COMBAT HANDLERS
// ============================================================================

// Request/Response types for campaign combat

type CreateCampaignCombatRequest struct {
	Name           string  `json:"name" binding:"required"`
	Difficulty     *string `json:"difficulty,omitempty"`
	Environment    *string `json:"environment,omitempty"`
	Notes          *string `json:"notes,omitempty"`
	VisibilityMode *string `json:"visibility_mode,omitempty"` // 'full' or 'gm_controlled'
}

type CombatSettingsRequest struct {
	DefaultVisibility   *string `json:"default_visibility,omitempty"`
	AllowPlayerSelfJoin *bool   `json:"allow_player_self_join,omitempty"`
	AutoRollInitiative  *bool   `json:"auto_roll_initiative,omitempty"`
	ShowMonsterNames    *bool   `json:"show_monster_names,omitempty"`
	ShowMonsterHP       *bool   `json:"show_monster_hp,omitempty"`
}

type JoinCombatRequest struct {
	CharacterID string `json:"character_id" binding:"required"`
	Initiative  int    `json:"initiative" binding:"required"`
}

// CreateCampaignCombat starts a new combat encounter linked to a campaign
// POST /api/v1/campaigns/:campaignId/combat
func (h *CombatHandler) CreateCampaignCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify campaign ownership
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req CreateCampaignCombatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create a session for this combat
	// We need a session_id for backwards compatibility
	sessions, err := h.db.ListSessionsByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list sessions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get sessions"})
		return
	}

	var sessionID string
	for _, s := range sessions {
		if s.Status == "active" {
			sessionID = s.ID
			break
		}
	}

	// Create a session if none exists
	if sessionID == "" {
		session := &db.Session{
			CampaignID: campaignID,
			UserID:     userID,
			Name:       "Combat Session - " + time.Now().Format("2006-01-02"),
			Status:     "active",
			CreatedAt:  time.Now(),
		}
		if err := h.db.CreateSession(c.Request.Context(), session); err != nil {
			h.logger.Error("Failed to create session", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
			return
		}
		sessionID = session.ID
	}

	visibilityMode := "full"
	if req.VisibilityMode != nil {
		visibilityMode = *req.VisibilityMode
	}

	combat := &db.CombatEncounter{
		SessionID:      sessionID,
		CampaignID:     &campaignID,
		Name:           req.Name,
		CurrentRound:   0,
		CurrentTurn:    0,
		Status:         "active",
		Difficulty:     req.Difficulty,
		Environment:    req.Environment,
		Notes:          req.Notes,
		VisibilityMode: visibilityMode,
		IsActive:       true,
		CreatedAt:      time.Now(),
	}

	if err := h.db.CreateCombatEncounter(c.Request.Context(), combat); err != nil {
		h.logger.Error("Failed to create combat encounter", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create combat"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"combat": combat})
}

// GetActiveCampaignCombat retrieves the active combat for a campaign
// GET /api/v1/campaigns/:campaignId/combat/active
func (h *CombatHandler) GetActiveCampaignCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Check if user has access to this campaign (either as GM or player)
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	isGM := campaign.UserID == userID

	// Check if user is a member of the campaign
	if !isGM {
		members, err := h.db.ListCampaignMembers(c.Request.Context(), campaignID)
		if err != nil {
			h.logger.Error("Failed to list campaign members", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check access"})
			return
		}

		isMember := false
		for _, m := range members {
			if m.UserID == userID {
				isMember = true
				break
			}
		}

		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
	}

	combat, err := h.db.GetActiveCombatByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		// No active combat is not an error
		c.JSON(http.StatusOK, gin.H{"combat": nil, "is_gm": isGM})
		return
	}

	// Get participants based on role
	var participants []*db.CombatParticipant
	if isGM {
		participants, err = h.db.ListCombatParticipants(c.Request.Context(), combat.ID)
	} else {
		participants, err = h.db.ListVisibleParticipants(c.Request.Context(), combat.ID)
	}

	if err != nil {
		h.logger.Error("Failed to get participants", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get participants"})
		return
	}

	// For players in gm_controlled mode, filter HP/conditions based on visibility
	if !isGM && combat.VisibilityMode == "gm_controlled" {
		for _, p := range participants {
			if !p.ShowHPToPlayers {
				p.CurrentHP = 0
				p.MaxHP = 0
				p.TempHP = 0
			}
			if !p.ShowConditionsToPlayers {
				p.Conditions = nil
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"combat":       combat,
		"participants": participants,
		"is_gm":        isGM,
	})
}

// JoinCombat allows a player to join an active combat
// POST /api/v1/combat/:id/join
func (h *CombatHandler) JoinCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	if combat.CampaignID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "combat is not campaign-linked"})
		return
	}

	// Check combat settings for self-join
	settings, err := h.db.GetCombatSettings(c.Request.Context(), *combat.CampaignID)
	if err == nil && !settings.AllowPlayerSelfJoin {
		c.JSON(http.StatusForbidden, gin.H{"error": "player self-join is disabled"})
		return
	}

	var req JoinCombatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify character ownership
	character, err := h.db.GetCharacterByID(c.Request.Context(), req.CharacterID)
	if err != nil {
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}

	if character.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your character"})
		return
	}

	// Check if already in combat
	existing, _ := h.db.GetParticipantByCharacterID(c.Request.Context(), combatID, req.CharacterID)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "character already in combat", "participant": existing})
		return
	}

	participant := &db.CombatParticipant{
		CombatID:                combatID,
		ParticipantType:         "pc",
		CharacterID:             &req.CharacterID,
		OwnerUserID:             &userID,
		Name:                    character.Name,
		MaxHP:                   character.MaxHitPoints,
		AC:                      character.ArmorClass,
		Initiative:              req.Initiative,
		InitiativeBonus:         0, // Could calculate from DEX
		CurrentHP:               character.MaxHitPoints,
		TempHP:                  0,
		IsSurprised:             false,
		HasReaction:             true,
		IsVisibleToPlayers:      true,
		ShowHPToPlayers:         true,
		ShowConditionsToPlayers: true,
	}

	if err := h.db.CreateCombatParticipant(c.Request.Context(), participant); err != nil {
		h.logger.Error("Failed to add participant", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join combat"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"participant": participant})
}

// GetCombatSettings retrieves combat settings for a campaign
// GET /api/v1/campaigns/:campaignId/combat-settings
func (h *CombatHandler) GetCombatSettings(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify campaign ownership
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	settings, err := h.db.GetCombatSettings(c.Request.Context(), campaignID)
	if err != nil {
		// Return defaults if no settings exist
		c.JSON(http.StatusOK, gin.H{"settings": db.CombatSettings{
			CampaignID:          campaignID,
			DefaultVisibility:   "full",
			AllowPlayerSelfJoin: true,
			AutoRollInitiative:  false,
			ShowMonsterNames:    true,
			ShowMonsterHP:       true,
		}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// UpdateCombatSettings updates combat settings for a campaign
// PUT /api/v1/campaigns/:campaignId/combat-settings
func (h *CombatHandler) UpdateCombatSettings(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify campaign ownership
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req CombatSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing or create new
	settings, err := h.db.GetCombatSettings(c.Request.Context(), campaignID)
	if err != nil {
		settings = &db.CombatSettings{
			CampaignID:          campaignID,
			DefaultVisibility:   "full",
			AllowPlayerSelfJoin: true,
			AutoRollInitiative:  false,
			ShowMonsterNames:    true,
			ShowMonsterHP:       true,
			CreatedAt:           time.Now(),
		}
	}

	// Update fields
	if req.DefaultVisibility != nil {
		settings.DefaultVisibility = *req.DefaultVisibility
	}
	if req.AllowPlayerSelfJoin != nil {
		settings.AllowPlayerSelfJoin = *req.AllowPlayerSelfJoin
	}
	if req.AutoRollInitiative != nil {
		settings.AutoRollInitiative = *req.AutoRollInitiative
	}
	if req.ShowMonsterNames != nil {
		settings.ShowMonsterNames = *req.ShowMonsterNames
	}
	if req.ShowMonsterHP != nil {
		settings.ShowMonsterHP = *req.ShowMonsterHP
	}

	settings.UpdatedAt = time.Now()

	if err := h.db.UpsertCombatSettings(c.Request.Context(), settings); err != nil {
		h.logger.Error("Failed to update combat settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// ImportPartyRequest allows specifying which members to import and their initiatives
type ImportPartyRequest struct {
	Members []PartyMemberImport `json:"members"`
}

type PartyMemberImport struct {
	CharacterID string `json:"character_id" binding:"required"`
	Initiative  int    `json:"initiative" binding:"required"`
}

// ImportParty adds party members to combat as participants
// POST /api/v1/combat/:id/import-party
func (h *CombatHandler) ImportParty(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	if combat.CampaignID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "combat is not campaign-linked"})
		return
	}

	// Verify GM ownership
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), *combat.CampaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the GM can import party members"})
		return
	}

	var req ImportPartyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get campaign members
	members, err := h.db.ListCampaignMembers(c.Request.Context(), *combat.CampaignID)
	if err != nil {
		h.logger.Error("Failed to list campaign members", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party members"})
		return
	}

	// Build lookup of member character IDs to user IDs
	memberCharacterToUser := make(map[string]string)
	for _, m := range members {
		if m.CharacterID != nil {
			memberCharacterToUser[*m.CharacterID] = m.UserID
		}
	}

	imported := []*db.CombatParticipant{}
	skipped := []string{}

	for _, memberReq := range req.Members {
		// Check if already in combat
		existing, _ := h.db.GetParticipantByCharacterID(c.Request.Context(), combatID, memberReq.CharacterID)
		if existing != nil {
			skipped = append(skipped, memberReq.CharacterID+" (already in combat)")
			continue
		}

		// Get character
		character, err := h.db.GetCharacterByID(c.Request.Context(), memberReq.CharacterID)
		if err != nil {
			h.logger.Warn("Failed to get character", zap.String("character_id", memberReq.CharacterID), zap.Error(err))
			skipped = append(skipped, memberReq.CharacterID+" (character not found)")
			continue
		}

		// Get owner user ID if this is a campaign member's character
		var ownerUserID *string
		if uid, ok := memberCharacterToUser[memberReq.CharacterID]; ok {
			ownerUserID = &uid
		}

		participant := &db.CombatParticipant{
			CombatID:                combatID,
			ParticipantType:         "pc",
			CharacterID:             &memberReq.CharacterID,
			OwnerUserID:             ownerUserID,
			Name:                    character.Name,
			MaxHP:                   character.MaxHitPoints,
			CurrentHP:               character.MaxHitPoints,
			TempHP:                  0,
			AC:                      character.ArmorClass,
			Initiative:              memberReq.Initiative,
			InitiativeBonus:         character.Initiative,
			IsSurprised:             false,
			HasReaction:             true,
			IsVisibleToPlayers:      true,
			ShowHPToPlayers:         true,
			ShowConditionsToPlayers: true,
		}

		if err := h.db.CreateCombatParticipant(c.Request.Context(), participant); err != nil {
			h.logger.Error("Failed to create participant", zap.Error(err))
			skipped = append(skipped, character.Name+" (failed to add)")
			continue
		}

		imported = append(imported, participant)
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"skipped":  skipped,
	})
}

// GetPartyForCombat returns campaign members that can be imported to combat
// GET /api/v1/combat/:id/party
func (h *CombatHandler) GetPartyForCombat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	combatID := c.Param("id")

	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	if combat.CampaignID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "combat is not campaign-linked"})
		return
	}

	// Verify GM ownership
	campaign, err := h.db.GetCampaignByID(c.Request.Context(), *combat.CampaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	if campaign.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the GM can view party members for import"})
		return
	}

	// Get campaign members
	members, err := h.db.ListCampaignMembers(c.Request.Context(), *combat.CampaignID)
	if err != nil {
		h.logger.Error("Failed to list campaign members", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get party members"})
		return
	}

	// Get existing participants to mark who is already in combat
	existingParticipants, err := h.db.ListCombatParticipants(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to list participants", zap.Error(err))
		existingParticipants = []*db.CombatParticipant{}
	}

	existingCharacterIDs := make(map[string]bool)
	for _, p := range existingParticipants {
		if p.CharacterID != nil {
			existingCharacterIDs[*p.CharacterID] = true
		}
	}

	type PartyMember struct {
		CharacterID     string `json:"character_id"`
		CharacterName   string `json:"character_name"`
		PlayerName      string `json:"player_name"`
		MaxHP           int    `json:"max_hp"`
		AC              int    `json:"ac"`
		InitiativeBonus int    `json:"initiative_bonus"`
		AlreadyInCombat bool   `json:"already_in_combat"`
	}

	partyMembers := []PartyMember{}

	for _, m := range members {
		if m.CharacterID == nil {
			continue
		}

		character, err := h.db.GetCharacterByID(c.Request.Context(), *m.CharacterID)
		if err != nil {
			continue
		}

		user, _ := h.db.GetUserByID(c.Request.Context(), m.UserID)
		playerName := "Unknown Player"
		if user != nil && user.DisplayName != nil {
			playerName = *user.DisplayName
		} else if user != nil {
			playerName = user.Username
		}

		partyMembers = append(partyMembers, PartyMember{
			CharacterID:     *m.CharacterID,
			CharacterName:   character.Name,
			PlayerName:      playerName,
			MaxHP:           character.MaxHitPoints,
			AC:              character.ArmorClass,
			InitiativeBonus: character.Initiative,
			AlreadyInCombat: existingCharacterIDs[*m.CharacterID],
		})
	}

	c.JSON(http.StatusOK, gin.H{"party": partyMembers})
}
