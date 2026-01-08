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
