package middleware

import (
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const GameSystemKey = "game_system"

// GameSystemMiddleware injects the user's game system preference into the context
func GameSystemMiddleware(database db.Database, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok {
			// No user context, set default
			c.Set(GameSystemKey, "Dungeons & Dragons 5th Edition")
			c.Next()
			return
		}

		// Get user to fetch their game system preference
		user, err := database.GetUserByID(c.Request.Context(), userID)
		if err != nil {
			logger.Warn("Failed to get user for game system", zap.Error(err))
			c.Set(GameSystemKey, "Dungeons & Dragons 5th Edition")
			c.Next()
			return
		}

		// Inject game system into context
		gameSystem := user.GameSystem
		if gameSystem == "" {
			gameSystem = "Dungeons & Dragons 5th Edition"
		}
		c.Set(GameSystemKey, gameSystem)

		c.Next()
	}
}

// GetGameSystem retrieves the game system from context
func GetGameSystem(c *gin.Context) (string, bool) {
	gameSystem, exists := c.Get(GameSystemKey)
	if !exists {
		return "Dungeons & Dragons 5th Edition", false
	}
	gs, ok := gameSystem.(string)
	return gs, ok
}
