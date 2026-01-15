package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
	"tavkit/internal/api/middleware"
	"tavkit/internal/db"
)

// WebSocket upgrader with permissive origin check for development
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: In production, validate origin against allowed domains
		return true
	},
}

// CombatWSMessage represents a WebSocket message for combat sync
type CombatWSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// CombatClient represents a connected WebSocket client
type CombatClient struct {
	CombatID string
	UserID   string
	IsGM     bool
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *CombatHub
}

// CombatHub manages WebSocket connections for a combat encounter
type CombatHub struct {
	// Combat ID this hub is for
	CombatID string

	// Registered clients
	clients map[*CombatClient]bool

	// Inbound messages from clients
	broadcast chan []byte

	// Register requests from clients
	register chan *CombatClient

	// Unregister requests from clients
	unregister chan *CombatClient

	// Mutex for thread-safe client access
	mu sync.RWMutex
}

// CombatHubManager manages all combat hubs
type CombatHubManager struct {
	hubs   map[string]*CombatHub
	mu     sync.RWMutex
	db     db.Database
	logger *zap.Logger
}

// NewCombatHubManager creates a new hub manager
func NewCombatHubManager(database db.Database, logger *zap.Logger) *CombatHubManager {
	return &CombatHubManager{
		hubs:   make(map[string]*CombatHub),
		db:     database,
		logger: logger,
	}
}

// GetOrCreateHub returns existing hub or creates a new one for the combat
func (m *CombatHubManager) GetOrCreateHub(combatID string) *CombatHub {
	m.mu.Lock()
	defer m.mu.Unlock()

	if hub, exists := m.hubs[combatID]; exists {
		return hub
	}

	hub := &CombatHub{
		CombatID:   combatID,
		clients:    make(map[*CombatClient]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *CombatClient),
		unregister: make(chan *CombatClient),
	}

	m.hubs[combatID] = hub
	go hub.run()

	return hub
}

// RemoveHub removes a hub when combat ends
func (m *CombatHubManager) RemoveHub(combatID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if hub, exists := m.hubs[combatID]; exists {
		// Close all client connections
		hub.mu.Lock()
		for client := range hub.clients {
			close(client.Send)
		}
		hub.mu.Unlock()
		delete(m.hubs, combatID)
	}
}

// BroadcastToCombat sends a message to all clients in a combat
func (m *CombatHubManager) BroadcastToCombat(combatID string, message []byte) {
	m.mu.RLock()
	hub, exists := m.hubs[combatID]
	m.mu.RUnlock()

	if exists {
		hub.broadcast <- message
	}
}

// run handles hub operations
func (h *CombatHub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// Client buffer full, close connection
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *CombatClient) readPump(handler *CombatWSHandler) {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(65536)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				handler.logger.Error("WebSocket read error", zap.Error(err))
			}
			break
		}

		// Parse and handle the message
		handler.handleClientMessage(c, message)
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *CombatClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// CombatWSHandler handles WebSocket connections for combat
type CombatWSHandler struct {
	db         db.Database
	logger     *zap.Logger
	hubManager *CombatHubManager
}

// NewCombatWSHandler creates a new WebSocket handler for combat
func NewCombatWSHandler(database db.Database, logger *zap.Logger) *CombatWSHandler {
	return &CombatWSHandler{
		db:         database,
		logger:     logger,
		hubManager: NewCombatHubManager(database, logger),
	}
}

// GetHubManager returns the hub manager for external use (broadcasting from REST endpoints)
func (h *CombatWSHandler) GetHubManager() *CombatHubManager {
	return h.hubManager
}

// HandleCombatWS handles WebSocket upgrade and connection for combat sync
// GET /ws/combat/:combatId
func (h *CombatWSHandler) HandleCombatWS(c *gin.Context) {
	combatID := c.Param("combatId")

	// Get user ID from context (set by auth middleware)
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get combat and verify access
	combat, err := h.db.GetCombatEncounterByID(c.Request.Context(), combatID)
	if err != nil {
		h.logger.Error("Failed to get combat for WS", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "combat not found"})
		return
	}

	// Determine if user is GM
	var isGM bool
	if combat.CampaignID != nil {
		campaign, err := h.db.GetCampaignByID(c.Request.Context(), *combat.CampaignID)
		if err == nil {
			isGM = campaign.UserID == userID
		}
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade WebSocket", zap.Error(err))
		return
	}

	hub := h.hubManager.GetOrCreateHub(combatID)

	client := &CombatClient{
		CombatID: combatID,
		UserID:   userID,
		IsGM:     isGM,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		Hub:      hub,
	}

	hub.register <- client

	// Send initial state
	h.sendInitialState(client)

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump(h)
}

// sendInitialState sends the full combat state to a newly connected client
func (h *CombatWSHandler) sendInitialState(client *CombatClient) {
	ctx := context.Background()

	combat, err := h.db.GetCombatEncounterByID(ctx, client.CombatID)
	if err != nil {
		h.logger.Error("Failed to get combat for initial state", zap.Error(err))
		return
	}

	var participants []*db.CombatParticipant
	if client.IsGM {
		participants, err = h.db.ListCombatParticipants(ctx, client.CombatID)
	} else {
		participants, err = h.db.ListVisibleParticipants(ctx, client.CombatID)
	}
	if err != nil {
		h.logger.Error("Failed to get participants for initial state", zap.Error(err))
		return
	}

	// Filter data based on visibility settings for players
	if !client.IsGM && combat.VisibilityMode == "gm_controlled" {
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

	payload, _ := json.Marshal(gin.H{
		"combat":       combat,
		"participants": participants,
		"is_gm":        client.IsGM,
	})

	msg, _ := json.Marshal(CombatWSMessage{
		Type:    "combat:state",
		Payload: payload,
	})

	client.Send <- msg
}

// handleClientMessage processes incoming WebSocket messages
func (h *CombatWSHandler) handleClientMessage(client *CombatClient, message []byte) {
	var msg CombatWSMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		h.logger.Error("Failed to parse WS message", zap.Error(err))
		return
	}

	ctx := context.Background()

	switch msg.Type {
	case "player:hp_update":
		h.handlePlayerHPUpdate(ctx, client, msg.Payload)
	case "player:condition_update":
		h.handlePlayerConditionUpdate(ctx, client, msg.Payload)
	case "combat:end_turn":
		if client.IsGM {
			h.handleEndTurn(ctx, client, msg.Payload)
		}
	case "combat:update_participant":
		if client.IsGM {
			h.handleUpdateParticipant(ctx, client, msg.Payload)
		}
	}
}

// handlePlayerHPUpdate processes HP updates from players
func (h *CombatWSHandler) handlePlayerHPUpdate(ctx context.Context, client *CombatClient, payload json.RawMessage) {
	var update struct {
		ParticipantID string `json:"participant_id"`
		CurrentHP     int    `json:"current_hp"`
		TempHP        int    `json:"temp_hp"`
	}
	if err := json.Unmarshal(payload, &update); err != nil {
		return
	}

	// Verify the player owns this participant
	participant, err := h.db.GetCombatParticipantByID(ctx, update.ParticipantID)
	if err != nil || participant == nil {
		return
	}

	if participant.OwnerUserID == nil || *participant.OwnerUserID != client.UserID {
		return // Not their participant
	}

	// Update HP
	participant.CurrentHP = update.CurrentHP
	participant.TempHP = update.TempHP
	if err := h.db.UpdateCombatParticipant(ctx, participant); err != nil {
		h.logger.Error("Failed to update participant HP", zap.Error(err))
		return
	}

	// Broadcast the update
	broadcastPayload, _ := json.Marshal(gin.H{
		"participant_id": update.ParticipantID,
		"current_hp":     update.CurrentHP,
		"temp_hp":        update.TempHP,
	})

	msg, _ := json.Marshal(CombatWSMessage{
		Type:    "combat:hp_updated",
		Payload: broadcastPayload,
	})

	h.hubManager.BroadcastToCombat(client.CombatID, msg)
}

// handlePlayerConditionUpdate processes condition updates from players
func (h *CombatWSHandler) handlePlayerConditionUpdate(ctx context.Context, client *CombatClient, payload json.RawMessage) {
	var update struct {
		ParticipantID string `json:"participant_id"`
		Action        string `json:"action"` // "add" or "remove"
		ConditionID   string `json:"condition_id,omitempty"`
		Condition     string `json:"condition,omitempty"`
		Duration      *int   `json:"duration,omitempty"`
	}
	if err := json.Unmarshal(payload, &update); err != nil {
		return
	}

	// Verify ownership
	participant, err := h.db.GetCombatParticipantByID(ctx, update.ParticipantID)
	if err != nil || participant == nil {
		return
	}

	if participant.OwnerUserID == nil || *participant.OwnerUserID != client.UserID {
		return
	}

	if update.Action == "add" && update.Condition != "" {
		condition := &db.CombatCondition{
			ParticipantID:  update.ParticipantID,
			ConditionName:  update.Condition,
			DurationRounds: update.Duration,
		}
		if err := h.db.CreateCombatCondition(ctx, condition); err != nil {
			h.logger.Error("Failed to add condition", zap.Error(err))
			return
		}
	} else if update.Action == "remove" && update.ConditionID != "" {
		if err := h.db.DeleteCombatCondition(ctx, update.ConditionID); err != nil {
			h.logger.Error("Failed to remove condition", zap.Error(err))
			return
		}
	}

	// Broadcast the update
	msg, _ := json.Marshal(CombatWSMessage{
		Type:    "combat:condition_updated",
		Payload: payload,
	})

	h.hubManager.BroadcastToCombat(client.CombatID, msg)
}

// handleEndTurn processes turn advancement from GM
func (h *CombatWSHandler) handleEndTurn(ctx context.Context, client *CombatClient, payload json.RawMessage) {
	combat, err := h.db.GetCombatEncounterByID(ctx, client.CombatID)
	if err != nil {
		return
	}

	// Get participants to determine next turn
	participants, err := h.db.ListCombatParticipants(ctx, client.CombatID)
	if err != nil || len(participants) == 0 {
		return
	}

	// Advance turn
	combat.CurrentTurn++
	if combat.CurrentTurn >= len(participants) {
		combat.CurrentTurn = 0
		combat.CurrentRound++
	}

	if err := h.db.UpdateCombatEncounter(ctx, combat); err != nil {
		h.logger.Error("Failed to advance turn", zap.Error(err))
		return
	}

	// Broadcast turn change
	broadcastPayload, _ := json.Marshal(gin.H{
		"current_turn":  combat.CurrentTurn,
		"current_round": combat.CurrentRound,
	})

	msg, _ := json.Marshal(CombatWSMessage{
		Type:    "combat:turn_changed",
		Payload: broadcastPayload,
	})

	h.hubManager.BroadcastToCombat(client.CombatID, msg)

	// Send turn notification to the active player
	if combat.CurrentTurn < len(participants) {
		activeParticipant := participants[combat.CurrentTurn]
		if activeParticipant.OwnerUserID != nil {
			// Find the client for this user and send them a notification
			notifyPayload, _ := json.Marshal(gin.H{
				"participant_id":   activeParticipant.ID,
				"participant_name": activeParticipant.Name,
			})

			notifyMsg, _ := json.Marshal(CombatWSMessage{
				Type:    "combat:your_turn",
				Payload: notifyPayload,
			})

			// Send to specific user
			client.Hub.mu.RLock()
			for c := range client.Hub.clients {
				if c.UserID == *activeParticipant.OwnerUserID {
					select {
					case c.Send <- notifyMsg:
					default:
					}
				}
			}
			client.Hub.mu.RUnlock()
		}
	}
}

// handleUpdateParticipant processes participant updates from GM
func (h *CombatWSHandler) handleUpdateParticipant(ctx context.Context, client *CombatClient, payload json.RawMessage) {
	var update struct {
		ParticipantID      string  `json:"participant_id"`
		CurrentHP          *int    `json:"current_hp,omitempty"`
		TempHP             *int    `json:"temp_hp,omitempty"`
		AC                 *int    `json:"ac,omitempty"`
		IsVisible          *bool   `json:"is_visible_to_players,omitempty"`
		ShowHP             *bool   `json:"show_hp_to_players,omitempty"`
		ShowConditions     *bool   `json:"show_conditions_to_players,omitempty"`
		IsSurprised        *bool   `json:"is_surprised,omitempty"`
		HasReaction        *bool   `json:"has_reaction,omitempty"`
		ConcentrationSpell *string `json:"concentration_spell,omitempty"`
	}
	if err := json.Unmarshal(payload, &update); err != nil {
		return
	}

	participant, err := h.db.GetCombatParticipantByID(ctx, update.ParticipantID)
	if err != nil || participant == nil {
		return
	}

	// Apply updates
	if update.CurrentHP != nil {
		participant.CurrentHP = *update.CurrentHP
	}
	if update.TempHP != nil {
		participant.TempHP = *update.TempHP
	}
	if update.AC != nil {
		participant.AC = *update.AC
	}
	if update.IsVisible != nil {
		participant.IsVisibleToPlayers = *update.IsVisible
	}
	if update.ShowHP != nil {
		participant.ShowHPToPlayers = *update.ShowHP
	}
	if update.ShowConditions != nil {
		participant.ShowConditionsToPlayers = *update.ShowConditions
	}
	if update.IsSurprised != nil {
		participant.IsSurprised = *update.IsSurprised
	}
	if update.HasReaction != nil {
		participant.HasReaction = *update.HasReaction
	}
	if update.ConcentrationSpell != nil {
		participant.ConcentrationSpell = update.ConcentrationSpell
	}

	if err := h.db.UpdateCombatParticipant(ctx, participant); err != nil {
		h.logger.Error("Failed to update participant", zap.Error(err))
		return
	}

	// Broadcast the update
	msg, _ := json.Marshal(CombatWSMessage{
		Type:    "combat:participant_updated",
		Payload: payload,
	})

	h.hubManager.BroadcastToCombat(client.CombatID, msg)
}

// BroadcastCombatEvent broadcasts an event to all clients in a combat (called from REST handlers)
func (h *CombatWSHandler) BroadcastCombatEvent(combatID string, eventType string, data interface{}) {
	payload, _ := json.Marshal(data)
	msg, _ := json.Marshal(CombatWSMessage{
		Type:    eventType,
		Payload: payload,
	})
	h.hubManager.BroadcastToCombat(combatID, msg)
}
