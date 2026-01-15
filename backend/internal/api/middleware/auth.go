package middleware

import (
	"net/http"
	"strings"

	"tavkit/internal/auth"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuthMiddleware validates JWT tokens from cookies or Authorization header
func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	logger, _ := zap.NewProduction()

	return func(c *gin.Context) {
		logger.Debug("AuthMiddleware called",
			zap.String("path", c.Request.URL.Path),
			zap.String("method", c.Request.Method))

		var token string

		// First, try to get token from HttpOnly cookie (preferred method)
		cookieToken, err := c.Cookie("auth_token")
		if err == nil && cookieToken != "" {
			token = cookieToken
			logger.Debug("Token found in cookie",
				zap.String("path", c.Request.URL.Path))
		}

		// Fallback: Check Authorization header (for backwards compatibility)
		if token == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					token = parts[1]
					logger.Debug("Token found in Authorization header",
						zap.String("path", c.Request.URL.Path))
				}
			}
		}

		// No token found
		if token == "" {
			logger.Warn("No authentication token found",
				zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			logger.Warn("Token validation failed",
				zap.Error(err),
				zap.String("path", c.Request.URL.Path))
			if err == auth.ErrExpiredToken {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			}
			c.Abort()
			return
		}

		logger.Debug("Token validated successfully",
			zap.String("path", c.Request.URL.Path),
			zap.String("user_id", claims.UserID))

		// Store claims in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	id, ok := userID.(string)
	return id, ok
}

// GetUsername retrieves username from context
func GetUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get("username")
	if !exists {
		return "", false
	}
	name, ok := username.(string)
	return name, ok
}

// WebSocketAuthMiddleware validates JWT tokens for WebSocket connections
// WebSocket connections can't easily use cookies or Authorization headers during upgrade,
// so the token is passed as a query parameter: /ws/combat/123?token=xxx
func WebSocketAuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	logger, _ := zap.NewProduction()

	return func(c *gin.Context) {
		logger.Debug("WebSocketAuthMiddleware called",
			zap.String("path", c.Request.URL.Path))

		var token string

		// For WebSocket, try query parameter first
		token = c.Query("token")

		// Also try cookie as fallback
		if token == "" {
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				token = cookieToken
			}
		}

		// No token found
		if token == "" {
			logger.Warn("No authentication token found for WebSocket",
				zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			logger.Warn("WebSocket token validation failed",
				zap.Error(err),
				zap.String("path", c.Request.URL.Path))
			if err == auth.ErrExpiredToken {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			}
			c.Abort()
			return
		}

		logger.Debug("WebSocket token validated successfully",
			zap.String("path", c.Request.URL.Path),
			zap.String("user_id", claims.UserID))

		// Store claims in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
}
