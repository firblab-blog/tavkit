package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds security headers to all responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking - allow same origin for iframe embedding of external tools
		c.Writer.Header().Set("X-Frame-Options", "SAMEORIGIN")

		// Enable XSS filter in older browsers
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		// Prevent caching of sensitive data
		// Only set for API responses, not static assets
		if len(c.Request.URL.Path) > 7 && c.Request.URL.Path[:8] == "/api/v1/" {
			c.Writer.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			c.Writer.Header().Set("Pragma", "no-cache")
		}

		c.Next()
	}
}
