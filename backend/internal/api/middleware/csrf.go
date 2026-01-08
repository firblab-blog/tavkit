package middleware

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	// CSRFTokenHeader is the header name for CSRF tokens
	CSRFTokenHeader = "X-CSRF-Token"
	// CSRFCookieName is the cookie name for CSRF tokens
	CSRFCookieName = "csrf_token"
	// CSRFTokenLength is the length of the CSRF token in bytes
	CSRFTokenLength = 32
	// CSRFTokenExpiry is how long CSRF tokens are valid
	CSRFTokenExpiry = 24 * time.Hour
)

// CSRFToken represents a CSRF token with its expiry
type CSRFToken struct {
	Token     string
	ExpiresAt time.Time
}

// CSRFStore manages CSRF tokens in memory
// In production, consider using Redis for distributed deployments
type CSRFStore struct {
	tokens map[string]CSRFToken
	mu     sync.RWMutex
}

// NewCSRFStore creates a new CSRF token store
func NewCSRFStore() *CSRFStore {
	store := &CSRFStore{
		tokens: make(map[string]CSRFToken),
	}
	// Start cleanup goroutine
	go store.cleanup()
	return store
}

// GenerateToken creates a new CSRF token for a user
func (s *CSRFStore) GenerateToken(userID string) (string, error) {
	tokenBytes := make([]byte, CSRFTokenLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	s.mu.Lock()
	s.tokens[userID] = CSRFToken{
		Token:     token,
		ExpiresAt: time.Now().Add(CSRFTokenExpiry),
	}
	s.mu.Unlock()

	return token, nil
}

// ValidateToken checks if a CSRF token is valid for a user
func (s *CSRFStore) ValidateToken(userID, token string) bool {
	s.mu.RLock()
	storedToken, exists := s.tokens[userID]
	s.mu.RUnlock()

	if !exists {
		return false
	}

	if time.Now().After(storedToken.ExpiresAt) {
		s.mu.Lock()
		delete(s.tokens, userID)
		s.mu.Unlock()
		return false
	}

	// Use constant-time comparison to prevent timing attacks
	return subtle.ConstantTimeCompare([]byte(storedToken.Token), []byte(token)) == 1
}

// InvalidateToken removes a CSRF token for a user (e.g., on logout)
func (s *CSRFStore) InvalidateToken(userID string) {
	s.mu.Lock()
	delete(s.tokens, userID)
	s.mu.Unlock()
}

// cleanup periodically removes expired tokens
func (s *CSRFStore) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for userID, token := range s.tokens {
			if now.After(token.ExpiresAt) {
				delete(s.tokens, userID)
			}
		}
		s.mu.Unlock()
	}
}

// Global CSRF store instance
var globalCSRFStore = NewCSRFStore()

// GetCSRFStore returns the global CSRF store
func GetCSRFStore() *CSRFStore {
	return globalCSRFStore
}

// CSRFMiddleware validates CSRF tokens on state-changing requests
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only check CSRF for state-changing methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Get user ID from context (set by auth middleware)
		userID, exists := c.Get("user_id")
		if !exists {
			// If no user_id in context, auth middleware hasn't run yet
			// This shouldn't happen for protected routes
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}

		// Get CSRF token from header
		csrfToken := c.GetHeader(CSRFTokenHeader)
		if csrfToken == "" {
			// Also check cookie as fallback (for form submissions)
			csrfToken, _ = c.Cookie(CSRFCookieName)
		}

		if csrfToken == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "CSRF token required"})
			c.Abort()
			return
		}

		// Validate token
		if !globalCSRFStore.ValidateToken(userID.(string), csrfToken) {
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid CSRF token"})
			c.Abort()
			return
		}

		c.Next()
	}
}
