package handlers

import (
	"net/http"

	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type HealthHandler struct {
	db     db.Database
	logger *zap.Logger
}

func NewHealthHandler(database db.Database, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		db:     database,
		logger: logger,
	}
}

type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// Health returns basic health status
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status: "healthy",
	})
}

// Ready returns readiness status including database
func (h *HealthHandler) Ready(c *gin.Context) {
	// Check database connection
	if err := h.db.Ping(c.Request.Context()); err != nil {
		h.logger.Error("Database health check failed", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, HealthResponse{
			Status:  "unhealthy",
			Message: "database connection failed",
		})
		return
	}

	c.JSON(http.StatusOK, HealthResponse{
		Status: "ready",
	})
}
