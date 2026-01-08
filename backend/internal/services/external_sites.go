package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"go.uber.org/zap"
)

// ExternalSiteConfig defines configuration for an external site that requires authentication
type ExternalSiteConfig struct {
	ID             string            `json:"id"`              // Unique identifier (e.g., "dndbeyond")
	Name           string            `json:"name"`            // Display name
	BaseURL        string            `json:"base_url"`        // Base URL of the site
	LoginURL       string            `json:"login_url"`       // Login endpoint
	RequiresAuth   bool              `json:"requires_auth"`   // Whether authentication is needed
	CookieDomains  []string          `json:"cookie_domains"`  // Domains for cookie forwarding
	Headers        map[string]string `json:"headers"`         // Additional headers to forward
	ProxyDomains   []string          `json:"proxy_domains"`   // Additional domains to proxy/rewrite (for subresources like fonts, CDN)
	RewriteContent bool              `json:"rewrite_content"` // Whether to rewrite URLs in HTML/CSS to route through proxy
	OpenInNewTab   bool              `json:"open_in_new_tab"` // If true, always open in new tab (site can't be embedded)
}

// ExternalSiteManager manages authentication for external sites
type ExternalSiteManager struct {
	logger *zap.Logger
	sites  map[string]*ExternalSiteConfig
	mu     sync.RWMutex
}

// NewExternalSiteManager creates a new external site manager
func NewExternalSiteManager(logger *zap.Logger) *ExternalSiteManager {
	manager := &ExternalSiteManager{
		logger: logger,
		sites:  make(map[string]*ExternalSiteConfig),
	}

	// Register default sites
	manager.registerDefaultSites()

	return manager
}

// registerDefaultSites adds built-in site configurations
func (m *ExternalSiteManager) registerDefaultSites() {
	// Roll20
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "roll20",
		Name:          "Roll20",
		BaseURL:       "https://app.roll20.net",
		LoginURL:      "https://app.roll20.net/sessions/new",
		RequiresAuth:  true,
		CookieDomains: []string{".roll20.net", "app.roll20.net"},
		Headers: map[string]string{
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		},
	})

	// Foundry VTT (self-hosted, no auth by default)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "foundryvtt",
		Name:          "Foundry VTT",
		BaseURL:       "", // User-configured
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// D&D 5E Tools (no auth needed)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "dnd5etools",
		Name:          "D&D 5E Tools",
		BaseURL:       "https://5e.tools",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// D&D Beyond - Note: This is a complex SPA that cannot be reliably embedded
	// due to X-Frame-Options headers, dynamic resource loading, third-party scripts,
	// and CORS restrictions. It must be opened in a new tab.
	m.RegisterSite(&ExternalSiteConfig{
		ID:             "dndbeyond",
		Name:           "D&D Beyond",
		BaseURL:        "https://www.dndbeyond.com",
		LoginURL:       "https://www.dndbeyond.com/login",
		RequiresAuth:   false,
		CookieDomains:  []string{".dndbeyond.com", "www.dndbeyond.com"},
		Headers:        map[string]string{},
		ProxyDomains:   []string{},
		RewriteContent: false,
		OpenInNewTab:   true, // Can't embed - opens in new tab
	})

	// Kobold Plus Club (encounter builder)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "koboldplus",
		Name:          "Kobold Plus Club",
		BaseURL:       "https://koboldplus.club",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// Tabletop Audio (ambient sounds and music)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "tabletopaudio",
		Name:          "Tabletop Audio",
		BaseURL:       "https://tabletopaudio.com",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// Fantasy Name Generators
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "fantasynamegen",
		Name:          "Fantasy Name Generators",
		BaseURL:       "https://www.fantasynamegenerators.com",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// Dungeon Scrawl (map maker)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "dungeonscrawl",
		Name:          "Dungeon Scrawl",
		BaseURL:       "https://app.dungeonscrawl.com",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})

	// Thieves Guild (random generators)
	m.RegisterSite(&ExternalSiteConfig{
		ID:            "thievesguild",
		Name:          "Thieves Guild",
		BaseURL:       "https://www.thievesguild.cc",
		RequiresAuth:  false,
		CookieDomains: []string{},
		Headers:       map[string]string{},
	})
}

// RegisterSite adds or updates a site configuration
func (m *ExternalSiteManager) RegisterSite(config *ExternalSiteConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sites[config.ID] = config
	m.logger.Info("Registered external site", zap.String("id", config.ID), zap.String("name", config.Name))
}

// GetSite returns a site configuration by ID
func (m *ExternalSiteManager) GetSite(id string) (*ExternalSiteConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	site, exists := m.sites[id]
	if !exists {
		return nil, fmt.Errorf("site not found: %s", id)
	}
	return site, nil
}

// GetSiteByURL returns a site configuration by matching URL
func (m *ExternalSiteManager) GetSiteByURL(url string) (*ExternalSiteConfig, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, site := range m.sites {
		if site.BaseURL != "" && len(url) >= len(site.BaseURL) && url[:len(site.BaseURL)] == site.BaseURL {
			return site, true
		}
	}
	return nil, false
}

// ListSites returns all registered sites
func (m *ExternalSiteManager) ListSites() []*ExternalSiteConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sites := make([]*ExternalSiteConfig, 0, len(m.sites))
	for _, site := range m.sites {
		sites = append(sites, site)
	}
	return sites
}

// ProxyRequest proxies a request to an external site with authentication
func (m *ExternalSiteManager) ProxyRequest(siteID string, targetURL string, userCookies []*http.Cookie) (*http.Response, error) {
	site, err := m.GetSite(siteID)
	if err != nil {
		return nil, err
	}

	// Create HTTP client with security settings that FOLLOWS redirects
	client := &http.Client{
		Timeout: 30 * time.Second, // Prevent hanging
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Limit redirects
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}

			// Forward cookies on redirects within same domain
			if len(via) > 0 && req.URL.Host == via[0].URL.Host {
				for _, cookie := range via[0].Cookies() {
					req.AddCookie(cookie)
				}
			}

			// Continue following redirects
			return nil
		},
	}

	// Create request
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add site-specific headers
	for key, value := range site.Headers {
		req.Header.Set(key, value)
	}

	// Forward ONLY matching cookies for authenticated sites (prevent cookie leakage)
	if site.RequiresAuth && len(userCookies) > 0 {
		cookiesForwarded := 0
		for _, cookie := range userCookies {
			// Only forward cookies that match the site's domains
			if m.shouldForwardCookie(cookie, site.CookieDomains) {
				req.AddCookie(cookie)
				cookiesForwarded++
			}
		}

		m.logger.Debug("Cookie filtering",
			zap.String("site", siteID),
			zap.Int("received", len(userCookies)),
			zap.Int("forwarded", cookiesForwarded),
		)
	}

	m.logger.Debug("Proxying request",
		zap.String("site", siteID),
		zap.String("url", targetURL),
		zap.Int("cookies", len(req.Cookies())),
	)

	return client.Do(req)
}

// shouldForwardCookie checks if a cookie should be forwarded to the site
func (m *ExternalSiteManager) shouldForwardCookie(cookie *http.Cookie, domains []string) bool {
	if len(domains) == 0 {
		return false
	}

	for _, domain := range domains {
		if cookie.Domain == domain || cookie.Domain == "."+domain {
			return true
		}
	}
	return false
}

// MarshalJSON implements json.Marshaler for safe serialization
func (m *ExternalSiteManager) MarshalJSON() ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return json.Marshal(m.sites)
}
