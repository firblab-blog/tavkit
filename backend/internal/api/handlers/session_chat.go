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
	Message    string `json:"message" binding:"required"`
	CampaignID string `json:"campaign_id" binding:"required"`
}

// SessionChatResponse represents the response from the chat endpoint
type SessionChatResponse struct {
	Response   string      `json:"response"`
	RAGSources []RAGSource `json:"rag_sources,omitempty"`
	MessageID  string      `json:"message_id"`
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

	// Save the user's message first
	userMsg := &db.SessionChatMessage{
		CampaignID: req.CampaignID,
		UserID:     userID.(string),
		Role:       "user",
		Content:    req.Message,
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

	// Call AI service chat endpoint
	aiRequest := map[string]interface{}{
		"message":         req.Message,
		"campaign_id":     req.CampaignID,
		"campaign_name":   campaign.Name,
		"campaign_system": campaign.GameSystem,
		"campaign_theme":  campaignTheme,
		"campaign_tone":   campaignTone,
		"chat_history":    chatHistory,
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
		CampaignID: req.CampaignID,
		UserID:     userID.(string),
		Role:       "assistant",
		Content:    aiResponse.Response,
		RAGSources: ragSourcesJSON,
	}

	if err := h.database.CreateSessionChatMessage(c.Request.Context(), assistantMsg); err != nil {
		h.logger.Error("Failed to save assistant message", zap.Error(err))
		// Still return the response even if save failed
	}

	c.JSON(http.StatusOK, SessionChatResponse{
		Response:   aiResponse.Response,
		RAGSources: aiResponse.RAGSources,
		MessageID:  assistantMsg.ID,
	})
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
