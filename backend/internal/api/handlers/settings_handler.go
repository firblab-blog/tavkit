package handlers

import (
	"net/http"

	"tavkit/internal/ai"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SettingsHandler handles settings-related HTTP requests
type SettingsHandler struct {
	factory *ai.Factory
	logger  *zap.Logger
}

// NewSettingsHandler creates a new settings handler
func NewSettingsHandler(factory *ai.Factory, logger *zap.Logger) *SettingsHandler {
	return &SettingsHandler{
		factory: factory,
		logger:  logger,
	}
}

// SwitchProviderRequest represents a request to switch AI providers
type SwitchProviderRequest struct {
	Provider string `json:"provider" binding:"required"`
	APIKey   string `json:"api_key,omitempty"`
	Model    string `json:"model,omitempty"`
}

// SwitchProvider handles runtime provider switching
// @Summary Switch AI provider
// @Description Switches the active AI provider at runtime
// @Tags Settings
// @Accept json
// @Produce json
// @Param request body SwitchProviderRequest true "Provider switch request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string "Invalid request or provider not available"
// @Failure 503 {object} map[string]string "AI is disabled"
// @Router /api/v1/settings/ai/provider [post]
func (h *SettingsHandler) SwitchProvider(c *gin.Context) {
	if !h.factory.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is disabled"})
		return
	}

	var req SwitchProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	providerType := ai.ProviderType(req.Provider)

	// If API key provided, add/update the provider
	if req.APIKey != "" {
		h.logger.Info("Adding/updating provider with new API key",
			zap.String("provider", req.Provider))

		if err := h.factory.AddProvider(providerType, req.APIKey, req.Model); err != nil {
			h.logger.Error("Failed to add provider", zap.Error(err))
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	// Switch to the provider
	h.logger.Info("Switching to provider", zap.String("provider", req.Provider))

	if err := h.factory.SetProvider(providerType); err != nil {
		h.logger.Error("Failed to switch provider", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify it works
	provider, err := h.factory.GetCurrentProvider()
	if err != nil {
		h.logger.Error("Failed to get current provider after switch", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to initialize provider"})
		return
	}

	available := true
	if err := provider.ValidateConnection(c.Request.Context()); err != nil {
		h.logger.Warn("Provider validation failed after switch",
			zap.String("provider", req.Provider),
			zap.Error(err))
		available = false
	}

	response := map[string]interface{}{
		"success":   true,
		"provider":  req.Provider,
		"available": available,
	}

	h.logger.Info("Successfully switched provider",
		zap.String("provider", req.Provider),
		zap.Bool("available", available))

	c.JSON(http.StatusOK, response)
}
