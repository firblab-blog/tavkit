package handlers

import (
	"net/http"

	"tavkit/internal/ai"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AIHandler handles AI provider-related HTTP requests
type AIHandler struct {
	factory *ai.Factory
	logger  *zap.Logger
}

// NewAIHandler creates a new AI handler
func NewAIHandler(factory *ai.Factory, logger *zap.Logger) *AIHandler {
	return &AIHandler{
		factory: factory,
		logger:  logger,
	}
}

// GetStatus returns AI system status
// @Summary Get AI status
// @Description Returns the current AI system status including enabled state and available providers
// @Tags AI
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/ai/status [get]
func (h *AIHandler) GetStatus(c *gin.Context) {
	response := map[string]interface{}{
		"enabled": h.factory.IsEnabled(),
	}

	if h.factory.IsEnabled() {
		response["current_provider"] = string(h.factory.GetCurrentProviderType())
		response["available_providers"] = h.factory.ListAvailableProviders(c.Request.Context())
	}

	c.JSON(http.StatusOK, response)
}

// GetModels returns available models for current provider
// @Summary Get available AI models
// @Description Returns list of available models for the currently active AI provider
// @Tags AI
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 503 {object} map[string]string "AI is disabled"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/ai/models [get]
func (h *AIHandler) GetModels(c *gin.Context) {
	if !h.factory.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is disabled"})
		return
	}

	provider, err := h.factory.GetCurrentProvider()
	if err != nil {
		h.logger.Error("Failed to get current provider", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get AI provider"})
		return
	}

	models, err := provider.GetModels(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get models", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve models"})
		return
	}

	response := map[string]interface{}{
		"provider": string(h.factory.GetCurrentProviderType()),
		"models":   models,
	}

	c.JSON(http.StatusOK, response)
}

// GenerateContent handles AI generation requests
// @Summary Generate AI content
// @Description Generates AI content using the currently active provider
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ai.GenerateRequest true "Generation request"
// @Success 200 {object} ai.GenerateResponse
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 503 {object} map[string]string "AI is disabled"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/v1/ai/generate [post]
func (h *AIHandler) GenerateContent(c *gin.Context) {
	if !h.factory.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is disabled"})
		return
	}

	var req ai.GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	provider, err := h.factory.GetCurrentProvider()
	if err != nil {
		h.logger.Error("Failed to get current provider", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get AI provider"})
		return
	}

	h.logger.Info("Generating AI content",
		zap.String("provider", string(h.factory.GetCurrentProviderType())),
		zap.String("model", req.Model))

	response, err := provider.GenerateContent(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Failed to generate content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate content"})
		return
	}

	c.JSON(http.StatusOK, response)
}
