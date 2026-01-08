package handlers

import (
	"fmt"
	"net/http"
	"time"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Query parameter values
const (
	queryValueTrue = "true"
)

type SessionHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewSessionHandler(database db.Database, logger *zap.Logger) *SessionHandler {
	return &SessionHandler{
		db:     database,
		logger: logger,
	}
}

// Request/Response types

type CreateSessionRequest struct {
	CampaignID  string `json:"campaign_id" binding:"required"`
	SessionType string `json:"session_type" binding:"required"` // 'chase', 'combat', 'social', 'tavern', 'shopping'
	Name        string `json:"name" binding:"required"`
}

type UpdateSessionRequest struct {
	Name   *string `json:"name,omitempty"`
	Status *string `json:"status,omitempty"` // 'active', 'paused', 'completed'
	Notes  *string `json:"notes,omitempty"`
}

type CompleteSessionRequest struct {
	Summary *string `json:"summary,omitempty"`
}

type CreateSessionEventRequest struct {
	EventType string  `json:"event_type" binding:"required"` // 'action', 'dialogue', 'combat', 'skill_check'
	Round     *int    `json:"round,omitempty"`
	Actor     *string `json:"actor,omitempty"`
	Action    string  `json:"action" binding:"required"`
	Outcome   *string `json:"outcome,omitempty"`
	Important bool    `json:"important"`
}

// CreateSession creates a new session
// POST /api/v1/sessions
func (h *SessionHandler) CreateSession(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), req.CampaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	// Validate session type
	validTypes := map[string]bool{
		"chase":    true,
		"combat":   true,
		"social":   true,
		"tavern":   true,
		"shopping": true,
	}
	if !validTypes[req.SessionType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_type"})
		return
	}

	session := &db.Session{
		UserID:      userID,
		CampaignID:  req.CampaignID,
		SessionType: req.SessionType,
		Name:        req.Name,
		Status:      "active",
		StartedAt:   time.Now(),
	}

	if err := h.db.CreateSession(c.Request.Context(), session); err != nil {
		h.logger.Error("Failed to create session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"session": session})
}

// GetSession gets a session by ID
// GET /api/v1/sessions/:id
func (h *SessionHandler) GetSession(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session": session})
}

// ListCampaignSessions lists all sessions for a campaign
// GET /api/v1/campaigns/:id/sessions?active_only=true
func (h *SessionHandler) ListCampaignSessions(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("id")
	activeOnly := c.Query("active_only") == queryValueTrue

	// Verify campaign ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	var sessions []*db.Session
	if activeOnly {
		sessions, err = h.db.ListActiveSessionsByCampaignID(c.Request.Context(), campaignID)
	} else {
		sessions, err = h.db.ListSessionsByCampaignID(c.Request.Context(), campaignID)
	}

	if err != nil {
		h.logger.Error("Failed to list sessions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list sessions"})
		return
	}

	if sessions == nil {
		sessions = []*db.Session{}
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// UpdateSession updates a session
// PUT /api/v1/sessions/:id
func (h *SessionHandler) UpdateSession(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req UpdateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Name != nil {
		session.Name = *req.Name
	}
	if req.Status != nil {
		// Validate status
		validStatuses := map[string]bool{
			"active":    true,
			"paused":    true,
			"completed": true,
		}
		if !validStatuses[*req.Status] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
			return
		}
		session.Status = *req.Status
	}
	if req.Notes != nil {
		session.Notes = req.Notes
	}

	if err := h.db.UpdateSession(c.Request.Context(), session); err != nil {
		h.logger.Error("Failed to update session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session": session})
}

// CompleteSession marks a session as completed
// POST /api/v1/sessions/:id/complete
func (h *SessionHandler) CompleteSession(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req CompleteSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.CompleteSession(c.Request.Context(), sessionID, req.Summary); err != nil {
		h.logger.Error("Failed to complete session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete session"})
		return
	}

	// Fetch updated session
	session, _ = h.db.GetSessionByID(c.Request.Context(), sessionID)

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"message": "Session completed successfully",
	})
}

// DeleteSession deletes a session
// DELETE /api/v1/sessions/:id
func (h *SessionHandler) DeleteSession(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err := h.db.DeleteSession(c.Request.Context(), sessionID); err != nil {
		h.logger.Error("Failed to delete session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session deleted successfully"})
}

// Session Events

// CreateSessionEvent adds an event to a session timeline
// POST /api/v1/sessions/:id/events
func (h *SessionHandler) CreateSessionEvent(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req CreateSessionEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event := &db.SessionEvent{
		SessionID: sessionID,
		EventType: req.EventType,
		Round:     req.Round,
		Timestamp: time.Now(),
		Actor:     req.Actor,
		Action:    req.Action,
		Outcome:   req.Outcome,
		Important: req.Important,
	}

	if err := h.db.CreateSessionEvent(c.Request.Context(), event); err != nil {
		h.logger.Error("Failed to create session event", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

// ListSessionEvents lists all events for a session
// GET /api/v1/sessions/:id/events?round=3&important_only=true
func (h *SessionHandler) ListSessionEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID := c.Param("id")
	roundStr := c.Query("round")
	importantOnly := c.Query("important_only") == queryValueTrue

	session, err := h.db.GetSessionByID(c.Request.Context(), sessionID)
	if err != nil {
		h.logger.Error("Failed to get session", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Verify ownership via campaign
	_, err = h.db.GetCampaignByIDAndUserID(c.Request.Context(), session.CampaignID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var events []*db.SessionEvent

	if importantOnly {
		events, err = h.db.ListImportantSessionEvents(c.Request.Context(), sessionID)
	} else if roundStr != "" {
		var round int
		if _, parseErr := fmt.Sscanf(roundStr, "%d", &round); parseErr == nil {
			events, err = h.db.ListSessionEventsByRound(c.Request.Context(), sessionID, round)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid round parameter"})
			return
		}
	} else {
		events, err = h.db.ListSessionEvents(c.Request.Context(), sessionID)
	}

	if err != nil {
		h.logger.Error("Failed to list session events", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list events"})
		return
	}

	if events == nil {
		events = []*db.SessionEvent{}
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}
