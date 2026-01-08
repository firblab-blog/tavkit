package handlers

import (
	"encoding/json"
	"net/http"

	"tavkit/internal/db"
	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ExternalSitesHandler struct {
	logger      *zap.Logger
	siteManager *services.ExternalSiteManager
	db          db.Database
}

func NewExternalSitesHandler(logger *zap.Logger, siteManager *services.ExternalSiteManager, database db.Database) *ExternalSitesHandler {
	return &ExternalSitesHandler{
		logger:      logger,
		siteManager: siteManager,
		db:          database,
	}
}

// ListSites returns all registered external sites that are enabled in settings
func (h *ExternalSitesHandler) ListSites(c *gin.Context) {
	sites := h.siteManager.ListSites()

	// Get enabled tools from settings
	enabledTools := make(map[string]bool)
	if settings, err := h.db.GetSettings(c.Request.Context()); err == nil && len(settings.UISettings) > 0 {
		var uiSettings map[string]interface{}
		if err := json.Unmarshal(settings.UISettings, &uiSettings); err == nil {
			if enabled, ok := uiSettings["enabled_tools"].(map[string]interface{}); ok {
				for tool, val := range enabled {
					if isEnabled, ok := val.(bool); ok {
						enabledTools[tool] = isEnabled
					}
				}
			}
		}
	}

	h.logger.Info("ListSites - enabled tools from settings",
		zap.Any("enabledTools", enabledTools),
		zap.Int("totalSites", len(sites)))

	// Default enabled state for tools (matches frontend defaults in uiSettingsStore.ts)
	defaultEnabled := map[string]bool{
		"dnd5etools":     true,
		"dndbeyond":      false,
		"roll20":         false,
		"foundryvtt":     false,
		"koboldplus":     true,
		"tabletopaudio":  false,
		"fantasynamegen": true,
		"dungeonscrawl":  true,
		"thievesguild":   true,
	}

	// Filter out sensitive information and disabled tools
	publicSites := make([]map[string]interface{}, 0, len(sites))
	for _, site := range sites {
		// Check if tool is enabled: use saved setting if exists, otherwise use default
		var isEnabled bool
		if enabled, exists := enabledTools[site.ID]; exists {
			isEnabled = enabled
		} else if defaultVal, hasDefault := defaultEnabled[site.ID]; hasDefault {
			isEnabled = defaultVal
		} else {
			// Unknown tools default to enabled (for custom-registered sites)
			isEnabled = true
		}

		if !isEnabled {
			h.logger.Debug("Skipping disabled site", zap.String("siteID", site.ID))
			continue
		}

		publicSites = append(publicSites, map[string]interface{}{
			"id":              site.ID,
			"name":            site.Name,
			"base_url":        site.BaseURL,
			"login_url":       site.LoginURL,
			"requires_auth":   site.RequiresAuth,
			"open_in_new_tab": site.OpenInNewTab,
		})
	}

	h.logger.Info("ListSites - returning sites", zap.Int("count", len(publicSites)))
	c.JSON(http.StatusOK, gin.H{
		"sites": publicSites,
	})
}

// GetSite returns a specific external site configuration
func (h *ExternalSitesHandler) GetSite(c *gin.Context) {
	siteID := c.Param("id")

	site, err := h.siteManager.GetSite(siteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "site not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            site.ID,
		"name":          site.Name,
		"base_url":      site.BaseURL,
		"login_url":     site.LoginURL,
		"requires_auth": site.RequiresAuth,
	})
}

// RegisterCustomSite allows admins to register custom external sites
func (h *ExternalSitesHandler) RegisterCustomSite(c *gin.Context) {
	var req struct {
		ID            string            `json:"id" binding:"required"`
		Name          string            `json:"name" binding:"required"`
		BaseURL       string            `json:"base_url" binding:"required"`
		LoginURL      string            `json:"login_url"`
		RequiresAuth  bool              `json:"requires_auth"`
		CookieDomains []string          `json:"cookie_domains"`
		Headers       map[string]string `json:"headers"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &services.ExternalSiteConfig{
		ID:            req.ID,
		Name:          req.Name,
		BaseURL:       req.BaseURL,
		LoginURL:      req.LoginURL,
		RequiresAuth:  req.RequiresAuth,
		CookieDomains: req.CookieDomains,
		Headers:       req.Headers,
	}

	h.siteManager.RegisterSite(config)

	h.logger.Info("Custom site registered",
		zap.String("id", config.ID),
		zap.String("name", config.Name),
	)

	c.JSON(http.StatusCreated, gin.H{
		"message": "site registered successfully",
		"site":    config,
	})
}
