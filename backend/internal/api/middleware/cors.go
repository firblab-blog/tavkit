package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware adds CORS headers
func CORSMiddleware(allowedOrigins []string, allowCredentials bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Check if origin is allowed
		allowed := false
		isWildcard := false
		for _, allowedOrigin := range allowedOrigins {
			if allowedOrigin == "*" {
				allowed = true
				isWildcard = true
				break
			}
			if allowedOrigin == origin {
				allowed = true
				break
			}
		}

		if allowed {
			// Security: When credentials are allowed, we must use the specific origin,
			// not "*", as per CORS specification
			if isWildcard && !allowCredentials {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		// Security: Only set credentials header when not using wildcard origin
		if allowCredentials && !isWildcard {
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
