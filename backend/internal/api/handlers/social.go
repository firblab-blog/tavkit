package handlers

import (
	"net/http"
	"time"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
)

type SocialHandler struct {
	db db.Database
}

func NewSocialHandler(database db.Database) *SocialHandler {
	return &SocialHandler{db: database}
}

// CreateSocialEncounter creates a new social encounter
func (h *SocialHandler) CreateSocialEncounter(c *gin.Context) {
	var req struct {
		SessionID        string `json:"session_id" binding:"required"`
		DialogueID       string `json:"dialogue_id"`
		NPCID            string `json:"npc_id"`
		Name             string `json:"name" binding:"required"`
		EncounterType    string `json:"encounter_type"`
		Goal             string `json:"goal"`
		CurrentMood      int    `json:"current_mood"`
		StartingMood     int    `json:"starting_mood"`
		SuccessThreshold int    `json:"success_threshold"`
		SuccessCount     int    `json:"success_count"`
		FailureCount     int    `json:"failure_count"`
		Status           string `json:"status"`
		Outcome          string `json:"outcome"`
		Notes            string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter := &db.SocialEncounter{
		SessionID:        req.SessionID,
		Name:             req.Name,
		EncounterType:    req.EncounterType,
		Goal:             req.Goal,
		CurrentMood:      req.CurrentMood,
		StartingMood:     req.StartingMood,
		SuccessThreshold: req.SuccessThreshold,
		SuccessCount:     req.SuccessCount,
		FailureCount:     req.FailureCount,
		Status:           req.Status,
		CreatedAt:        time.Now(),
	}
	if req.DialogueID != "" {
		encounter.DialogueID = &req.DialogueID
	}
	if req.NPCID != "" {
		encounter.NPCID = &req.NPCID
	}
	if req.Outcome != "" {
		encounter.Outcome = &req.Outcome
	}
	if req.Notes != "" {
		encounter.Notes = &req.Notes
	}

	if err := h.db.CreateSocialEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create social encounter"})
		return
	}

	c.JSON(http.StatusCreated, encounter)
}

// GetSocialEncounter retrieves a social encounter by ID
func (h *SocialHandler) GetSocialEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	encounter, err := h.db.GetSocialEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// GetSocialEncounterBySession retrieves a social encounter by session ID
func (h *SocialHandler) GetSocialEncounterBySession(c *gin.Context) {
	sessionID := c.Param("session_id")

	encounter, err := h.db.GetSocialEncounterBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social encounter not found"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// UpdateSocialEncounter updates an existing social encounter
func (h *SocialHandler) UpdateSocialEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		CurrentMood  *int    `json:"current_mood"`
		SuccessCount *int    `json:"success_count"`
		FailureCount *int    `json:"failure_count"`
		Status       string  `json:"status"`
		Outcome      *string `json:"outcome"`
		Notes        *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encounter, err := h.db.GetSocialEncounterByID(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social encounter not found"})
		return
	}

	if req.CurrentMood != nil {
		encounter.CurrentMood = *req.CurrentMood
	}
	if req.SuccessCount != nil {
		encounter.SuccessCount = *req.SuccessCount
	}
	if req.FailureCount != nil {
		encounter.FailureCount = *req.FailureCount
	}
	if req.Status != "" {
		encounter.Status = req.Status
	}
	if req.Outcome != nil {
		encounter.Outcome = req.Outcome
	}
	if req.Notes != nil {
		encounter.Notes = req.Notes
	}

	if err := h.db.UpdateSocialEncounter(c.Request.Context(), encounter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update social encounter"})
		return
	}

	c.JSON(http.StatusOK, encounter)
}

// DeleteSocialEncounter deletes a social encounter
func (h *SocialHandler) DeleteSocialEncounter(c *gin.Context) {
	encounterID := c.Param("id")

	if err := h.db.DeleteSocialEncounter(c.Request.Context(), encounterID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete social encounter"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Social encounter deleted"})
}

// CreateSocialCheck creates a new social skill check
func (h *SocialHandler) CreateSocialCheck(c *gin.Context) {
	encounterID := c.Param("id")

	var req struct {
		CharacterName string `json:"character_name" binding:"required"`
		Skill         string `json:"skill" binding:"required"`
		DC            int    `json:"dc" binding:"required"`
		Roll          int    `json:"roll" binding:"required"`
		Modifier      int    `json:"modifier"`
		Total         int    `json:"total"`
		Success       bool   `json:"success"`
		Approach      string `json:"approach"`
		NPCResponse   string `json:"npc_response"`
		MoodChange    int    `json:"mood_change"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	check := &db.SocialCheck{
		EncounterID:   encounterID,
		CharacterName: req.CharacterName,
		Skill:         req.Skill,
		DC:            req.DC,
		Roll:          req.Roll,
		Modifier:      req.Modifier,
		Total:         req.Total,
		Success:       req.Success,
		MoodChange:    req.MoodChange,
		CreatedAt:     time.Now(),
	}
	if req.Approach != "" {
		check.Approach = &req.Approach
	}
	if req.NPCResponse != "" {
		check.NPCResponse = &req.NPCResponse
	}

	if err := h.db.CreateSocialCheck(c.Request.Context(), check); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create social check"})
		return
	}

	c.JSON(http.StatusCreated, check)
}

// ListSocialChecks retrieves all social checks for an encounter
func (h *SocialHandler) ListSocialChecks(c *gin.Context) {
	encounterID := c.Param("id")

	checks, err := h.db.ListSocialChecks(c.Request.Context(), encounterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list social checks"})
		return
	}

	c.JSON(http.StatusOK, checks)
}
