package handlers

import (
	"encoding/json"
	"net/http"

	"tavkit/internal/db"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SessionChatHandler handles session chat HTTP requests
type SessionChatHandler struct {
	database db.Database
	aiClient *services.AIClient
	logger   *zap.Logger
}

// NewSessionChatHandler creates a new session chat handler
func NewSessionChatHandler(database db.Database, aiClient *services.AIClient, logger *zap.Logger) *SessionChatHandler {
	return &SessionChatHandler{
		database: database,
		aiClient: aiClient,
		logger:   logger,
	}
}

// SessionChatRequest represents a chat message request
type SessionChatRequest struct {
	Message        string  `json:"message" binding:"required"`
	CampaignID     string  `json:"campaign_id" binding:"required"`
	ConversationID *string `json:"conversation_id,omitempty"`
}

// SessionChatResponse represents the response from the chat endpoint
type SessionChatResponse struct {
	Response       string      `json:"response"`
	RAGSources     []RAGSource `json:"rag_sources,omitempty"`
	MessageID      string      `json:"message_id"`
	ConversationID string      `json:"conversation_id,omitempty"`
}

// RAGSource represents a source from RAG retrieval
type RAGSource struct {
	PageTitle  string  `json:"page_title"`
	SourceURL  string  `json:"source_url"`
	Similarity float64 `json:"similarity"`
}

// ChatHistoryResponse represents chat history
type ChatHistoryResponse struct {
	Messages []*db.SessionChatMessage `json:"messages"`
}

// CreateConversationRequest represents a request to create a new conversation
type CreateConversationRequest struct {
	CampaignID string `json:"campaign_id" binding:"required"`
	Title      string `json:"title"`
}

// UpdateConversationRequest represents a request to update a conversation
type UpdateConversationRequest struct {
	Title string `json:"title" binding:"required"`
}

// ConversationListResponse represents a list of conversations
type ConversationListResponse struct {
	Conversations []*db.ChatConversation `json:"conversations"`
}

// ChatSourcePreferencesRequest represents a request to update source preferences
type ChatSourcePreferencesRequest struct {
	IncludeNPCs            *bool    `json:"include_npcs,omitempty"`
	IncludeMonsters        *bool    `json:"include_monsters,omitempty"`
	IncludeLocations       *bool    `json:"include_locations,omitempty"`
	IncludeQuests          *bool    `json:"include_quests,omitempty"`
	IncludeItems           *bool    `json:"include_items,omitempty"`
	IncludeEncounters      *bool    `json:"include_encounters,omitempty"`
	IncludeRumors          *bool    `json:"include_rumors,omitempty"`
	IncludeTaverns         *bool    `json:"include_taverns,omitempty"`
	IncludeMerchants       *bool    `json:"include_merchants,omitempty"`
	IncludeTraps           *bool    `json:"include_traps,omitempty"`
	IncludeCritters        *bool    `json:"include_critters,omitempty"`
	IncludeChases          *bool    `json:"include_chases,omitempty"`
	IncludeDialogues       *bool    `json:"include_dialogues,omitempty"`
	IncludeCampaignSummary *bool    `json:"include_campaign_summary,omitempty"`
	IncludeWikiKnowledge   *bool    `json:"include_wiki_knowledge,omitempty"`
	EnabledWikiSources     []string `json:"enabled_wiki_sources,omitempty"`
	MaxContextChunks       *int     `json:"max_context_chunks,omitempty"`
}

// SendMessage handles sending a chat message and getting an AI response
// @Summary Send a chat message
// @Description Sends a message to the session chat and gets an AI response with optional RAG context
// @Tags Session Chat
// @Accept json
// @Produce json
// @Param request body SessionChatRequest true "Chat message request"
// @Success 200 {object} SessionChatResponse
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/send [post]
func (h *SessionChatHandler) SendMessage(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req SessionChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid chat request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Verify campaign exists and user has access
	campaign, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), req.CampaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	// Create or use existing conversation
	var conversationID *string
	if req.ConversationID != nil && *req.ConversationID != "" {
		// Verify conversation exists and belongs to this campaign
		conv, err := h.database.GetChatConversationByID(c.Request.Context(), *req.ConversationID)
		if err != nil || conv.CampaignID != req.CampaignID || conv.UserID != userID.(string) {
			h.logger.Warn("Invalid conversation ID provided", zap.String("conversation_id", *req.ConversationID))
			// Fall through and create new conversation
		} else {
			conversationID = req.ConversationID
		}
	}

	// If no valid conversation, create one
	if conversationID == nil {
		newConv := &db.ChatConversation{
			CampaignID: req.CampaignID,
			UserID:     userID.(string),
			Title:      "New Conversation",
		}
		if err := h.database.CreateChatConversation(c.Request.Context(), newConv); err != nil {
			h.logger.Error("Failed to create conversation", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
			return
		}
		conversationID = &newConv.ID
	}

	// Save the user's message first
	userMsg := &db.SessionChatMessage{
		CampaignID:     req.CampaignID,
		UserID:         userID.(string),
		ConversationID: conversationID,
		Role:           "user",
		Content:        req.Message,
	}

	if err := h.database.CreateSessionChatMessage(c.Request.Context(), userMsg); err != nil {
		h.logger.Error("Failed to save user message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Get recent chat history for context
	recentMessages, err := h.database.GetRecentSessionChatMessages(c.Request.Context(), req.CampaignID, 10)
	if err != nil {
		h.logger.Warn("Failed to get recent messages", zap.Error(err))
		// Continue without history
		recentMessages = []*db.SessionChatMessage{}
	}

	// Build chat history for AI
	chatHistory := make([]map[string]string, 0, len(recentMessages))
	for _, msg := range recentMessages {
		chatHistory = append(chatHistory, map[string]string{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}

	// Build campaign context from campaign fields
	var campaignTheme, campaignTone string
	if campaign.Theme != nil {
		campaignTheme = *campaign.Theme
	}
	if campaign.Tone != nil {
		campaignTone = *campaign.Tone
	}

	// Get source preferences for this campaign
	sourcePrefs, err := h.database.GetChatSourcePreferences(c.Request.Context(), req.CampaignID)
	if err != nil {
		// Use defaults if no preferences saved
		sourcePrefs = &db.ChatSourcePreferences{
			IncludeWikiKnowledge: true,
			EnabledWikiSources:   []byte("[]"),
			MaxContextChunks:     5,
		}
	}

	// Parse enabled wiki sources
	var enabledWikiSources []string
	if sourcePrefs.EnabledWikiSources != nil && len(sourcePrefs.EnabledWikiSources) > 0 {
		if err := json.Unmarshal(sourcePrefs.EnabledWikiSources, &enabledWikiSources); err != nil {
			h.logger.Warn("Failed to parse enabled_wiki_sources", zap.Error(err))
			enabledWikiSources = []string{}
		}
	}

	// Call AI service chat endpoint
	aiRequest := map[string]interface{}{
		"message":                req.Message,
		"campaign_id":            req.CampaignID,
		"campaign_name":          campaign.Name,
		"campaign_system":        campaign.GameSystem,
		"campaign_theme":         campaignTheme,
		"campaign_tone":          campaignTone,
		"chat_history":           chatHistory,
		"include_wiki_knowledge": sourcePrefs.IncludeWikiKnowledge,
		"enabled_wiki_sources":   enabledWikiSources,
		"max_context_chunks":     sourcePrefs.MaxContextChunks,
	}

	var aiResponse struct {
		Response   string      `json:"response"`
		RAGSources []RAGSource `json:"rag_sources,omitempty"`
	}

	if err := h.aiClient.Post(c.Request.Context(), "/api/v1/chat/session", aiRequest, &aiResponse); err != nil {
		h.logger.Error("Failed to get AI response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get AI response"})
		return
	}

	// Serialize RAG sources for storage
	var ragSourcesJSON []byte
	if len(aiResponse.RAGSources) > 0 {
		ragSourcesJSON, _ = json.Marshal(aiResponse.RAGSources)
	}

	// Save the assistant's response
	assistantMsg := &db.SessionChatMessage{
		CampaignID:     req.CampaignID,
		UserID:         userID.(string),
		ConversationID: conversationID,
		Role:           "assistant",
		Content:        aiResponse.Response,
		RAGSources:     ragSourcesJSON,
	}

	if err := h.database.CreateSessionChatMessage(c.Request.Context(), assistantMsg); err != nil {
		h.logger.Error("Failed to save assistant message", zap.Error(err))
		// Still return the response even if save failed
	}

	// Update conversation timestamp
	if conversationID != nil {
		conv := &db.ChatConversation{ID: *conversationID}
		_ = h.database.UpdateChatConversation(c.Request.Context(), conv)
	}

	resp := SessionChatResponse{
		Response:   aiResponse.Response,
		RAGSources: aiResponse.RAGSources,
		MessageID:  assistantMsg.ID,
	}
	if conversationID != nil {
		resp.ConversationID = *conversationID
	}
	c.JSON(http.StatusOK, resp)
}

// GetChatHistory retrieves chat history for a campaign
// @Summary Get chat history
// @Description Retrieves chat message history for a campaign
// @Tags Session Chat
// @Produce json
// @Param campaign_id path string true "Campaign ID"
// @Param limit query int false "Maximum number of messages" default(50)
// @Success 200 {object} ChatHistoryResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/history/{campaign_id} [get]
func (h *SessionChatHandler) GetChatHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaign_id is required"})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	// Get limit from query param
	limit := 50
	if l := c.Query("limit"); l != "" {
		var parsedLimit int
		if _, err := jsonNumberParse(l, &parsedLimit); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	messages, err := h.database.GetSessionChatMessages(c.Request.Context(), campaignID, limit)
	if err != nil {
		h.logger.Error("Failed to get chat history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat history"})
		return
	}

	c.JSON(http.StatusOK, ChatHistoryResponse{
		Messages: messages,
	})
}

// ClearChatHistory clears chat history for a campaign
// @Summary Clear chat history
// @Description Clears all chat messages for a campaign
// @Tags Session Chat
// @Param campaign_id path string true "Campaign ID"
// @Success 200 {object} map[string]string "Chat history cleared"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/history/{campaign_id} [delete]
func (h *SessionChatHandler) ClearChatHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaign_id is required"})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	if err := h.database.ClearSessionChatMessages(c.Request.Context(), campaignID, userID.(string)); err != nil {
		h.logger.Error("Failed to clear chat history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear chat history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chat history cleared"})
}

// jsonNumberParse is a helper to parse string to int
func jsonNumberParse(s string, v *int) (bool, error) {
	return true, json.Unmarshal([]byte(s), v)
}

// =============================================================================
// Chat Conversation Handlers
// =============================================================================

// CreateConversation creates a new conversation for a campaign
// @Summary Create a conversation
// @Description Creates a new chat conversation for a campaign
// @Tags Session Chat
// @Accept json
// @Produce json
// @Param request body CreateConversationRequest true "Conversation creation request"
// @Success 200 {object} db.ChatConversation
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/conversations [post]
func (h *SessionChatHandler) CreateConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), req.CampaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	conv := &db.ChatConversation{
		CampaignID: req.CampaignID,
		UserID:     userID.(string),
		Title:      req.Title,
	}
	if conv.Title == "" {
		conv.Title = "New Conversation"
	}

	if err := h.database.CreateChatConversation(c.Request.Context(), conv); err != nil {
		h.logger.Error("Failed to create conversation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
		return
	}

	c.JSON(http.StatusOK, conv)
}

// ListConversations lists all conversations for a campaign
// @Summary List conversations
// @Description Lists all chat conversations for a campaign
// @Tags Session Chat
// @Produce json
// @Param campaign_id path string true "Campaign ID"
// @Success 200 {object} ConversationListResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/conversations/{campaign_id} [get]
func (h *SessionChatHandler) ListConversations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaign_id is required"})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	conversations, err := h.database.ListChatConversationsByCampaignID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to list conversations", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list conversations"})
		return
	}

	c.JSON(http.StatusOK, ConversationListResponse{Conversations: conversations})
}

// GetConversation retrieves a single conversation
// @Summary Get a conversation
// @Description Retrieves a single chat conversation by ID
// @Tags Session Chat
// @Produce json
// @Param id path string true "Conversation ID"
// @Success 200 {object} db.ChatConversation
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Conversation not found"
// @Router /api/v1/chat/conversation/{id} [get]
func (h *SessionChatHandler) GetConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	conv, err := h.database.GetChatConversationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get conversation", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Verify user owns this conversation
	if conv.UserID != userID.(string) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	c.JSON(http.StatusOK, conv)
}

// UpdateConversation updates a conversation (e.g., rename)
// @Summary Update a conversation
// @Description Updates a chat conversation (e.g., rename)
// @Tags Session Chat
// @Accept json
// @Produce json
// @Param id path string true "Conversation ID"
// @Param request body UpdateConversationRequest true "Update request"
// @Success 200 {object} db.ChatConversation
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Conversation not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/conversation/{id} [put]
func (h *SessionChatHandler) UpdateConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	var req UpdateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	conv, err := h.database.GetChatConversationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get conversation", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Verify user owns this conversation
	if conv.UserID != userID.(string) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	conv.Title = req.Title
	if err := h.database.UpdateChatConversation(c.Request.Context(), conv); err != nil {
		h.logger.Error("Failed to update conversation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update conversation"})
		return
	}

	c.JSON(http.StatusOK, conv)
}

// DeleteConversation deletes a conversation and its messages
// @Summary Delete a conversation
// @Description Deletes a chat conversation and all its messages
// @Tags Session Chat
// @Param id path string true "Conversation ID"
// @Success 200 {object} map[string]string "Conversation deleted"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Conversation not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/conversation/{id} [delete]
func (h *SessionChatHandler) DeleteConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	conv, err := h.database.GetChatConversationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get conversation", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Verify user owns this conversation
	if conv.UserID != userID.(string) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	if err := h.database.DeleteChatConversation(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete conversation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Conversation deleted"})
}

// GetConversationHistory retrieves message history for a specific conversation
// @Summary Get conversation history
// @Description Retrieves chat message history for a specific conversation
// @Tags Session Chat
// @Produce json
// @Param id path string true "Conversation ID"
// @Param limit query int false "Maximum number of messages" default(50)
// @Success 200 {object} ChatHistoryResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Conversation not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/conversation/{id}/history [get]
func (h *SessionChatHandler) GetConversationHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	conv, err := h.database.GetChatConversationByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get conversation", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Verify user owns this conversation
	if conv.UserID != userID.(string) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Get limit from query param
	limit := 50
	if l := c.Query("limit"); l != "" {
		var parsedLimit int
		if _, err := jsonNumberParse(l, &parsedLimit); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	messages, err := h.database.GetSessionChatMessagesByConversationID(c.Request.Context(), id, limit)
	if err != nil {
		h.logger.Error("Failed to get conversation history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversation history"})
		return
	}

	c.JSON(http.StatusOK, ChatHistoryResponse{Messages: messages})
}

// =============================================================================
// Chat Source Preferences Handlers
// =============================================================================

// GetSourcePreferences retrieves source preferences for a campaign
// @Summary Get source preferences
// @Description Retrieves chat source preferences for a campaign
// @Tags Session Chat
// @Produce json
// @Param campaign_id path string true "Campaign ID"
// @Success 200 {object} db.ChatSourcePreferences
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/preferences/{campaign_id} [get]
func (h *SessionChatHandler) GetSourcePreferences(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaign_id is required"})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	prefs, err := h.database.GetChatSourcePreferences(c.Request.Context(), campaignID)
	if err != nil {
		// Return default preferences if none exist
		defaultPrefs := &db.ChatSourcePreferences{
			CampaignID:             campaignID,
			UserID:                 userID.(string),
			IncludeNPCs:            true,
			IncludeMonsters:        true,
			IncludeLocations:       true,
			IncludeQuests:          true,
			IncludeItems:           true,
			IncludeEncounters:      true,
			IncludeRumors:          true,
			IncludeTaverns:         true,
			IncludeMerchants:       true,
			IncludeTraps:           true,
			IncludeCritters:        true,
			IncludeChases:          true,
			IncludeDialogues:       true,
			IncludeCampaignSummary: true,
			IncludeWikiKnowledge:   true,
			EnabledWikiSources:     []byte("[]"),
			MaxContextChunks:       5,
		}
		c.JSON(http.StatusOK, defaultPrefs)
		return
	}

	c.JSON(http.StatusOK, prefs)
}

// UpdateSourcePreferences updates source preferences for a campaign
// @Summary Update source preferences
// @Description Updates chat source preferences for a campaign
// @Tags Session Chat
// @Accept json
// @Produce json
// @Param campaign_id path string true "Campaign ID"
// @Param request body ChatSourcePreferencesRequest true "Preferences update request"
// @Success 200 {object} db.ChatSourcePreferences
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/chat/preferences/{campaign_id} [put]
func (h *SessionChatHandler) UpdateSourcePreferences(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignID := c.Param("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaign_id is required"})
		return
	}

	// Verify campaign exists and user has access
	_, err := h.database.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	var req ChatSourcePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Get existing preferences or create defaults
	prefs, err := h.database.GetChatSourcePreferences(c.Request.Context(), campaignID)
	if err != nil {
		// Create new preferences with defaults
		prefs = &db.ChatSourcePreferences{
			CampaignID:             campaignID,
			UserID:                 userID.(string),
			IncludeNPCs:            true,
			IncludeMonsters:        true,
			IncludeLocations:       true,
			IncludeQuests:          true,
			IncludeItems:           true,
			IncludeEncounters:      true,
			IncludeRumors:          true,
			IncludeTaverns:         true,
			IncludeMerchants:       true,
			IncludeTraps:           true,
			IncludeCritters:        true,
			IncludeChases:          true,
			IncludeDialogues:       true,
			IncludeCampaignSummary: true,
			IncludeWikiKnowledge:   true,
			EnabledWikiSources:     []byte("[]"),
			MaxContextChunks:       5,
		}
	}

	// Apply updates from request (only update fields that were provided)
	if req.IncludeNPCs != nil {
		prefs.IncludeNPCs = *req.IncludeNPCs
	}
	if req.IncludeMonsters != nil {
		prefs.IncludeMonsters = *req.IncludeMonsters
	}
	if req.IncludeLocations != nil {
		prefs.IncludeLocations = *req.IncludeLocations
	}
	if req.IncludeQuests != nil {
		prefs.IncludeQuests = *req.IncludeQuests
	}
	if req.IncludeItems != nil {
		prefs.IncludeItems = *req.IncludeItems
	}
	if req.IncludeEncounters != nil {
		prefs.IncludeEncounters = *req.IncludeEncounters
	}
	if req.IncludeRumors != nil {
		prefs.IncludeRumors = *req.IncludeRumors
	}
	if req.IncludeTaverns != nil {
		prefs.IncludeTaverns = *req.IncludeTaverns
	}
	if req.IncludeMerchants != nil {
		prefs.IncludeMerchants = *req.IncludeMerchants
	}
	if req.IncludeTraps != nil {
		prefs.IncludeTraps = *req.IncludeTraps
	}
	if req.IncludeCritters != nil {
		prefs.IncludeCritters = *req.IncludeCritters
	}
	if req.IncludeChases != nil {
		prefs.IncludeChases = *req.IncludeChases
	}
	if req.IncludeDialogues != nil {
		prefs.IncludeDialogues = *req.IncludeDialogues
	}
	if req.IncludeCampaignSummary != nil {
		prefs.IncludeCampaignSummary = *req.IncludeCampaignSummary
	}
	if req.IncludeWikiKnowledge != nil {
		prefs.IncludeWikiKnowledge = *req.IncludeWikiKnowledge
	}
	if req.EnabledWikiSources != nil {
		jsonData, err := json.Marshal(req.EnabledWikiSources)
		if err != nil {
			h.logger.Error("Failed to marshal enabled wiki sources", zap.Error(err))
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enabled_wiki_sources format"})
			return
		}
		prefs.EnabledWikiSources = jsonData
	}
	if req.MaxContextChunks != nil && *req.MaxContextChunks > 0 {
		prefs.MaxContextChunks = *req.MaxContextChunks
	}

	if err := h.database.UpsertChatSourcePreferences(c.Request.Context(), prefs); err != nil {
		h.logger.Error("Failed to update source preferences", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, prefs)
}
