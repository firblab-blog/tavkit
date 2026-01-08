package handlers

import (
	"bytes"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"tavkit/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ProxyHandler struct {
	logger      *zap.Logger
	siteManager *services.ExternalSiteManager
}

func NewProxyHandler(logger *zap.Logger, siteManager *services.ExternalSiteManager) *ProxyHandler {
	return &ProxyHandler{
		logger:      logger,
		siteManager: siteManager,
	}
}

// isPrivateIP checks if an IP address is private/internal
func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
		return true
	}
	// Check for additional private ranges
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16", // AWS metadata
		"127.0.0.0/8",
		"fc00::/7",  // IPv6 private
		"fe80::/10", // IPv6 link-local
	}
	for _, cidr := range privateRanges {
		_, block, _ := net.ParseCIDR(cidr)
		if block != nil && block.Contains(ip) {
			return true
		}
	}
	return false
}

// validateProxyURL ensures the URL is safe to proxy
func (h *ProxyHandler) validateProxyURL(targetURL string) error {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Only allow http/https
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http and https schemes are allowed")
	}

	// Resolve hostname to check for SSRF
	host := parsed.Hostname()
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("failed to resolve hostname: %w", err)
	}

	// Check if any resolved IP is private/internal
	for _, ip := range ips {
		if isPrivateIP(ip) {
			h.logger.Warn("Blocked attempt to access private IP",
				zap.String("url", targetURL),
				zap.String("resolved_ip", ip.String()),
			)
			return fmt.Errorf("access to private/internal addresses is not allowed")
		}
	}

	// Check if URL matches a registered external site
	if _, found := h.siteManager.GetSiteByURL(targetURL); !found {
		// If not a registered site, check if base domain or proxy domain is in registered sites
		isAllowed := false
		for _, site := range h.siteManager.ListSites() {
			// Check BaseURL
			if site.BaseURL != "" {
				siteHost := strings.TrimPrefix(site.BaseURL, "https://")
				siteHost = strings.TrimPrefix(siteHost, "http://")
				siteHost = strings.Split(siteHost, "/")[0]

				if strings.HasSuffix(host, siteHost) || host == siteHost {
					isAllowed = true
					break
				}
			}

			// Check ProxyDomains (for CDN, media servers, etc.)
			for _, proxyDomain := range site.ProxyDomains {
				if host == proxyDomain || strings.HasSuffix(host, "."+proxyDomain) {
					isAllowed = true
					break
				}
			}
			if isAllowed {
				break
			}
		}

		if !isAllowed {
			h.logger.Warn("Blocked attempt to proxy unregistered site",
				zap.String("url", targetURL),
				zap.String("host", host),
			)
			return fmt.Errorf("URL not in allowed sites list, please contact admin to add this site")
		}
	}

	return nil
}

func (h *ProxyHandler) ProxyURL(c *gin.Context) {
	targetURL := c.Query("url")
	if targetURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter is required"})
		return
	}

	// Validate URL for security (SSRF protection, whitelist check)
	if err := h.validateProxyURL(targetURL); err != nil {
		h.logger.Warn("Proxy request blocked",
			zap.String("url", targetURL),
			zap.String("ip", c.ClientIP()),
			zap.Error(err),
		)
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Proxying request",
		zap.String("url", targetURL),
		zap.String("client_ip", c.ClientIP()),
	)

	// Check if this is a known external site
	var resp *http.Response
	var err error

	if site, found := h.siteManager.GetSiteByURL(targetURL); found {
		h.logger.Debug("Using external site configuration", zap.String("site", site.ID))

		// Get user cookies from request (only for authenticated sites)
		var userCookies []*http.Cookie
		if site.RequiresAuth {
			userCookies = c.Request.Cookies()
		}

		// Use site manager to proxy with authentication
		resp, err = h.siteManager.ProxyRequest(site.ID, targetURL, userCookies)
		if err != nil {
			h.logger.Error("Failed to proxy via site manager", zap.Error(err))
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch url"})
			return
		}
	} else {
		// Generic proxy for allowed but unconfigured sites
		h.logger.Debug("Using generic proxy")
		client := &http.Client{
			Timeout: 30 * time.Second, // Prevent hanging connections
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				// Validate redirect URLs too
				if err := h.validateProxyURL(req.URL.String()); err != nil {
					return fmt.Errorf("redirect blocked: %w", err)
				}
				if len(via) >= 10 {
					return fmt.Errorf("too many redirects")
				}
				return nil
			},
		}

		req, err := http.NewRequest("GET", targetURL, nil)
		if err != nil {
			h.logger.Error("Failed to create request", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create request"})
			return
		}

		// Copy safe headers from original request
		req.Header.Set("User-Agent", c.GetHeader("User-Agent"))
		req.Header.Set("Accept", c.GetHeader("Accept"))
		req.Header.Set("Accept-Language", c.GetHeader("Accept-Language"))

		resp, err = client.Do(req)
		if err != nil {
			h.logger.Error("Failed to fetch URL", zap.Error(err))
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch url"})
			return
		}
	}
	defer func() { _ = resp.Body.Close() }() //nolint:errcheck // Best effort close

	// Limit response size to prevent memory exhaustion (50MB max)
	maxResponseSize := int64(50 * 1024 * 1024)

	// Read body into memory so we can modify it if needed
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	if err != nil {
		h.logger.Error("Failed to read response body", zap.Error(err))
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to read response from target site"})
		return
	}

	// Check if this site requires URL rewriting
	contentType := resp.Header.Get("Content-Type")
	site, _ := h.siteManager.GetSiteByURL(targetURL)

	// For HTML/CSS responses from sites with RewriteContent enabled, rewrite URLs to route through proxy
	if site != nil && site.RewriteContent && len(site.ProxyDomains) > 0 {
		lowerContentType := strings.ToLower(contentType)
		if strings.Contains(lowerContentType, "text/html") ||
			strings.Contains(lowerContentType, "text/css") ||
			strings.Contains(lowerContentType, "application/javascript") ||
			strings.Contains(lowerContentType, "text/javascript") {
			body = rewriteURLsToProxy(body, contentType, site.ProxyDomains)
			h.logger.Debug("Rewrote URLs in response",
				zap.String("url", targetURL),
				zap.String("contentType", contentType),
				zap.Int("proxyDomains", len(site.ProxyDomains)),
			)
		}
	}

	// For HTML responses, inject <base> tag to fix relative URLs
	if strings.Contains(strings.ToLower(contentType), "text/html") {
		body = injectBaseTag(body, targetURL)
	}

	// Copy safe response headers only (explicitly exclude security headers that block embedding)
	safeHeaders := []string{
		"Content-Type",
		"Cache-Control",
		"Expires",
		"Last-Modified",
		"ETag",
	}

	// Security headers we must NOT forward (they prevent embedding):
	// - Content-Security-Policy
	// - X-Frame-Options
	// - Cross-Origin-* headers

	for _, header := range safeHeaders {
		if values := resp.Header[header]; len(values) > 0 {
			for _, value := range values {
				c.Header(header, value)
			}
		}
	}

	// Set CORS headers to allow embedding
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Credentials", "false")
	c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Remove security headers that prevent embedding
	c.Header("X-Frame-Options", "")
	c.Header("Content-Security-Policy", "")
	c.Header("X-Content-Type-Options", "")

	// Return the proxied content
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)

	h.logger.Debug("Proxy response completed",
		zap.String("url", targetURL),
		zap.Int("bytes_written", len(body)),
		zap.Int("status", resp.StatusCode),
	)
}

// injectBaseTag injects a <base> tag into HTML to fix relative URLs
func injectBaseTag(html []byte, targetURL string) []byte {
	// Parse the target URL to get the origin
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return html // Return unchanged if we can't parse
	}

	// Construct the base URL (scheme + host)
	baseURL := fmt.Sprintf("%s://%s/", parsedURL.Scheme, parsedURL.Host)
	baseTag := []byte(fmt.Sprintf(`<base href="%s">`, baseURL))

	// Find the <head> tag and inject <base> right after it
	headStart := bytes.Index(bytes.ToLower(html), []byte("<head>"))
	if headStart == -1 {
		headStart = bytes.Index(bytes.ToLower(html), []byte("<head "))
	}

	if headStart != -1 {
		// Find the end of the <head> opening tag
		headTagEnd := bytes.IndexByte(html[headStart:], '>')
		if headTagEnd != -1 {
			insertPos := headStart + headTagEnd + 1

			// Create new buffer with base tag inserted
			result := make([]byte, 0, len(html)+len(baseTag))
			result = append(result, html[:insertPos]...)
			result = append(result, baseTag...)
			result = append(result, html[insertPos:]...)
			return result
		}
	}

	return html // Return unchanged if we can't find <head>
}

// rewriteURLsToProxy rewrites absolute URLs in HTML/CSS to route through our proxy
// This handles subresources like fonts, stylesheets, scripts, and images
func rewriteURLsToProxy(content []byte, contentType string, allowedDomains []string) []byte {
	if len(allowedDomains) == 0 {
		return content
	}

	result := string(content)

	// Process each allowed domain
	for _, domain := range allowedDomains {
		// Match URLs in quotes (both single and double) - common in HTML attributes and CSS
		// This regex captures: quote + https://domain + path until closing quote
		patterns := []struct {
			prefix  string
			scheme  string
			quoteRe string
		}{
			{`"`, "https", `"`},
			{`'`, "https", `'`},
			{`"`, "http", `"`},
			{`'`, "http", `'`},
			// Protocol-relative URLs
			{`"//`, "", `"`},
			{`'//`, "", `'`},
		}

		for _, p := range patterns {
			var searchPrefix string
			var scheme string
			if p.scheme == "" {
				// Protocol-relative URL
				searchPrefix = p.prefix + domain
				scheme = "https"
			} else {
				searchPrefix = p.prefix + p.scheme + "://" + domain
				scheme = p.scheme
			}

			// Find and replace each occurrence
			for {
				startIdx := strings.Index(result, searchPrefix)
				if startIdx == -1 {
					break
				}

				// Find the end of the URL (closing quote)
				urlStart := startIdx + len(p.prefix)
				remaining := result[urlStart:]
				endIdx := strings.Index(remaining, p.quoteRe)
				if endIdx == -1 {
					break
				}

				// Extract the full URL
				fullURL := remaining[:endIdx]

				// Ensure it's a proper URL (not already rewritten)
				if strings.HasPrefix(fullURL, "/api/v1/proxy") {
					// Skip already rewritten URLs - move past this occurrence
					result = result[:startIdx] + result[startIdx+1:]
					continue
				}

				// For protocol-relative URLs, add the scheme
				if p.scheme == "" {
					fullURL = scheme + ":" + fullURL
				}

				// URL-encode the full URL for the proxy parameter
				encodedURL := url.QueryEscape(fullURL)
				replacement := p.prefix + "/api/v1/proxy?url=" + encodedURL + p.quoteRe

				// Replace this occurrence
				result = result[:startIdx] + replacement + result[urlStart+endIdx+len(p.quoteRe):]
			}
		}
	}

	return []byte(result)
}
