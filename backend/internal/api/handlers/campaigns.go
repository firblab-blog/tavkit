package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"tavkit/internal/db"
	"tavkit/internal/services"
)

type CampaignHandler struct {
	db              db.Database
	logger          *zap.Logger
	summaryService  *services.CampaignSummaryService
	chunkedPipeline *services.ChunkedSummaryPipeline
}

func NewCampaignHandler(database db.Database, logger *zap.Logger, summaryService *services.CampaignSummaryService, chunkedPipeline *services.ChunkedSummaryPipeline) *CampaignHandler {
	return &CampaignHandler{
		db:              database,
		logger:          logger,
		summaryService:  summaryService,
		chunkedPipeline: chunkedPipeline,
	}
}

// generateCampaignID generates a unique campaign ID
func generateCampaignID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// GetCampaigns returns all campaigns for the authenticated user
// Includes membership_type to distinguish between owned, local player, and joined campaigns
func (h *CampaignHandler) GetCampaigns(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaigns, err := h.db.GetCampaignsWithMembership(c.Request.Context(), userID.(string))
	if err != nil {
		h.logger.Error("Failed to fetch campaigns", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns})
}

// GetCampaign returns a single campaign by ID
func (h *CampaignHandler) GetCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

// CreateCampaign creates a new campaign
func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var campaign db.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Debug("CreateCampaign - received request", zap.String("name", campaign.Name), zap.String("game_system", campaign.GameSystem))

	// Validate required fields
	if campaign.Name == "" {
		h.logger.Warn("CreateCampaign - empty name received")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Campaign name is required"})
		return
	}

	// Set campaign fields
	campaign.ID = generateCampaignID()
	campaign.UserID = userID.(string)

	// If this campaign is being marked as active, deactivate all others first
	if campaign.IsActive {
		// Get all user's campaigns and deactivate them
		existingCampaigns, err := h.db.ListCampaignsByUserID(c.Request.Context(), userID.(string))
		if err != nil {
			h.logger.Error("Failed to list campaigns", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaigns"})
			return
		}
		for _, existing := range existingCampaigns {
			if existing.IsActive {
				existing.IsActive = false
				if err := h.db.UpdateCampaign(c.Request.Context(), existing); err != nil {
					h.logger.Error("Failed to deactivate campaign", zap.Error(err))
				}
			}
		}
	}

	h.logger.Debug("CreateCampaign - about to insert", zap.String("id", campaign.ID), zap.String("name", campaign.Name))

	if err := h.db.CreateCampaign(c.Request.Context(), &campaign); err != nil {
		h.logger.Error("Failed to create campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}

	h.logger.Debug("CreateCampaign - returning response", zap.String("id", campaign.ID), zap.String("name", campaign.Name))
	c.JSON(http.StatusCreated, campaign)
}

// UpdateCampaign updates an existing campaign
func (h *CampaignHandler) UpdateCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	var campaign db.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate required fields if name is being updated
	if campaign.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Campaign name is required"})
		return
	}

	// Verify ownership
	existing, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	// If this campaign is being marked as active, deactivate all others first
	if campaign.IsActive && !existing.IsActive {
		existingCampaigns, err := h.db.ListCampaignsByUserID(c.Request.Context(), userID.(string))
		if err != nil {
			h.logger.Error("Failed to list campaigns", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaigns"})
			return
		}
		for _, other := range existingCampaigns {
			if other.IsActive && other.ID != campaignID {
				other.IsActive = false
				if err := h.db.UpdateCampaign(c.Request.Context(), other); err != nil {
					h.logger.Error("Failed to deactivate campaign", zap.Error(err))
				}
			}
		}
	}

	// Update fields
	campaign.ID = campaignID
	campaign.UserID = userID.(string)
	campaign.CreatedAt = existing.CreatedAt

	if err := h.db.UpdateCampaign(c.Request.Context(), &campaign); err != nil {
		h.logger.Error("Failed to update campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaign"})
		return
	}

	// Fetch the updated campaign to return
	updated, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to fetch updated campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated campaign"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// DeleteCampaign deletes a campaign
func (h *CampaignHandler) DeleteCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	if err := h.db.DeleteCampaign(c.Request.Context(), campaignID); err != nil {
		h.logger.Error("Failed to delete campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete campaign"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

// SetActiveCampaign sets a campaign as the active campaign for the user
func (h *CampaignHandler) SetActiveCampaign(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	// Deactivate all other campaigns
	existingCampaigns, err := h.db.ListCampaignsByUserID(c.Request.Context(), userID.(string))
	if err != nil {
		h.logger.Error("Failed to list campaigns", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaigns"})
		return
	}
	for _, other := range existingCampaigns {
		if other.IsActive && other.ID != campaignID {
			other.IsActive = false
			if err := h.db.UpdateCampaign(c.Request.Context(), other); err != nil {
				h.logger.Error("Failed to deactivate campaign", zap.Error(err))
			}
		}
	}

	// Set this campaign as active
	campaign.IsActive = true
	if err := h.db.UpdateCampaign(c.Request.Context(), campaign); err != nil {
		h.logger.Error("Failed to activate campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate campaign"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

// GetCampaignContent retrieves all content for a campaign
func (h *CampaignHandler) GetCampaignContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	content, err := h.db.GetCampaignContentByCampaignID(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to fetch campaign content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": content})
}

// GenerateCampaignSummary generates an AI summary for a campaign
func (h *CampaignHandler) GenerateCampaignSummary(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	// Generate/regenerate summary using service
	if err := h.summaryService.RegenerateCampaignSummary(c.Request.Context(), campaignID); err != nil {
		h.logger.Error("Failed to generate campaign summary", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate summary"})
		return
	}

	// Fetch the generated summary
	summary, err := h.db.GetCampaignSummaryByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to fetch campaign summary", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetCampaignSummary retrieves the AI-generated summary for a campaign
func (h *CampaignHandler) GetCampaignSummary(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	_, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	summary, err := h.db.GetCampaignSummaryByCampaignID(c.Request.Context(), campaignID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Summary not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to fetch campaign summary", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetCampaignContext returns AI-ready campaign context and summaries
func (h *CampaignHandler) GetCampaignContext(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to verify campaign ownership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if campaign.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to access this campaign"})
		return
	}

	// Check if regeneration is requested
	regenerate := c.Query("regenerate") == "true"
	if regenerate {
		// Get AI timeout from settings
		settings, err := h.db.GetSettings(c.Request.Context())
		if err != nil {
			h.logger.Error("Failed to get settings for timeout", zap.Error(err))
			settings = &db.Settings{AITimeoutSeconds: 120} // Fallback to default
		}

		h.logger.Info("Regenerating campaign summary with configured timeout",
			zap.String("campaign_id", campaignID),
			zap.Int("timeout_seconds", settings.AITimeoutSeconds))

		// Create a context with configured timeout + 90s buffer for HTTP client operations
		timeoutWithBuffer := time.Duration(settings.AITimeoutSeconds+90) * time.Second
		aiCtx, cancel := context.WithTimeout(context.Background(), timeoutWithBuffer)
		defer cancel()

		// Force regenerate the campaign summary
		if err := h.summaryService.RegenerateCampaignSummary(aiCtx, campaignID); err != nil {
			h.logger.Error("Failed to regenerate campaign summary", zap.String("campaign_id", campaignID), zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to regenerate campaign summary"})
			return
		}
	}

	// Get campaign context from summary service
	summaryContext, err := h.summaryService.GetCampaignContext(c.Request.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to get campaign context", zap.String("campaign_id", campaignID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get campaign context"})
		return
	}

	c.JSON(http.StatusOK, summaryContext)
}

// StartChunkedSummaryGeneration starts an async chunked summary generation job
func (h *CampaignHandler) StartChunkedSummaryGeneration(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to verify campaign ownership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if campaign.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to access this campaign"})
		return
	}

	// Start the chunked summary generation job
	job, err := h.chunkedPipeline.StartSummaryGeneration(c.Request.Context(), campaignID, userID.(string))
	if err != nil {
		h.logger.Error("Failed to start chunked summary generation",
			zap.String("campaign_id", campaignID),
			zap.Error(err))
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Get AI timeout from settings for the background job
	settings, err := h.db.GetSettings(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get settings for timeout", zap.Error(err))
		settings = &db.Settings{AITimeoutSeconds: 300} // Fallback to 5 minute default for chunked
	}

	// Run the pipeline in a goroutine
	go func() {
		// Create a context with timeout for the background job
		timeoutWithBuffer := time.Duration(settings.AITimeoutSeconds*3) * time.Second // 3x normal timeout for chunked
		ctx, cancel := context.WithTimeout(context.Background(), timeoutWithBuffer)
		defer cancel()

		if err := h.chunkedPipeline.RunPipeline(ctx, job.ID, nil); err != nil {
			h.logger.Error("Chunked summary pipeline failed",
				zap.String("job_id", job.ID),
				zap.String("campaign_id", campaignID),
				zap.Error(err))
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"job_id":      job.ID,
		"status":      job.Status,
		"message":     "Summary generation started",
		"campaign_id": campaignID,
	})
}

// GetSummaryJobProgress returns the progress of a summary generation job
func (h *CampaignHandler) GetSummaryJobProgress(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	jobID := c.Param("jobId")

	job, err := h.chunkedPipeline.GetJobProgress(c.Request.Context(), jobID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get job progress", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get job progress"})
		return
	}

	// Verify user owns the campaign associated with this job
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), job.CampaignID, userID.(string))
	if err != nil || campaign == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to access this job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"job_id":           job.ID,
		"campaign_id":      job.CampaignID,
		"status":           job.Status,
		"current_stage":    job.CurrentStage,
		"current_batch":    job.CurrentBatch,
		"total_batches":    job.TotalBatches,
		"progress_percent": job.ProgressPercent,
		"error_message":    job.ErrorMessage,
		"started_at":       job.StartedAt,
		"completed_at":     job.CompletedAt,
	})
}

// GetActiveSummaryJob returns the active summary generation job for a campaign
func (h *CampaignHandler) GetActiveSummaryJob(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to verify campaign ownership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if campaign.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to access this campaign"})
		return
	}

	job, err := h.db.GetActiveSummaryJobForCampaign(c.Request.Context(), campaignID)
	if err == sql.ErrNoRows || job == nil {
		c.JSON(http.StatusOK, gin.H{"active_job": nil})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get active summary job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"active_job": gin.H{
			"job_id":           job.ID,
			"status":           job.Status,
			"current_stage":    job.CurrentStage,
			"current_batch":    job.CurrentBatch,
			"total_batches":    job.TotalBatches,
			"progress_percent": job.ProgressPercent,
			"error_message":    job.ErrorMessage,
			"started_at":       job.StartedAt,
		},
	})
}

// ContentItem represents a single content item for the summary settings modal
type ContentItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	AIGenerated bool   `json:"ai_generated"`
	Preview     string `json:"preview,omitempty"`
}

// GetSummaryContent returns all campaign content organized by type, plus current exclusions
func (h *CampaignHandler) GetSummaryContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	ctx := c.Request.Context()
	contentByType := make(map[string][]ContentItem)

	// Fetch NPCs
	npcs, _ := h.db.ListNPCsByUserID(ctx, userID.(string), &campaignID)
	for _, npc := range npcs {
		preview := ""
		if npc.Race != nil {
			preview = *npc.Race
		}
		if npc.Class != nil {
			if preview != "" {
				preview += " "
			}
			preview += *npc.Class
		}
		contentByType["npcs"] = append(contentByType["npcs"], ContentItem{
			ID:          npc.ID,
			Name:        npc.Name,
			Type:        "npcs",
			AIGenerated: npc.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Locations
	locations, _ := h.db.ListLocationsByUserID(ctx, userID.(string), &campaignID)
	for _, loc := range locations {
		preview := loc.Type // Type is not a pointer
		contentByType["locations"] = append(contentByType["locations"], ContentItem{
			ID:          loc.ID,
			Name:        loc.Name,
			Type:        "locations",
			AIGenerated: loc.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Quests
	quests, _ := h.db.ListQuestsByUserID(ctx, userID.(string), &campaignID)
	for _, quest := range quests {
		preview := quest.Type // Type is not a pointer
		contentByType["quests"] = append(contentByType["quests"], ContentItem{
			ID:          quest.ID,
			Name:        quest.Title,
			Type:        "quests",
			AIGenerated: quest.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Monsters
	monsters, _ := h.db.ListMonstersByUserID(ctx, userID.(string), &campaignID)
	for _, monster := range monsters {
		preview := fmt.Sprintf("CR %.1f", monster.CR) // CR is float64, not pointer
		contentByType["monsters"] = append(contentByType["monsters"], ContentItem{
			ID:          monster.ID,
			Name:        monster.Name,
			Type:        "monsters",
			AIGenerated: monster.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Items
	items, _ := h.db.ListItemsByUserID(ctx, userID.(string), &campaignID)
	for _, item := range items {
		preview := ""
		if item.Rarity != nil {
			preview = *item.Rarity
		}
		contentByType["items"] = append(contentByType["items"], ContentItem{
			ID:          item.ID,
			Name:        item.Name,
			Type:        "items",
			AIGenerated: item.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Encounters
	encounters, _ := h.db.ListEncountersByUserID(ctx, userID.(string), &campaignID)
	for _, enc := range encounters {
		preview := enc.Difficulty + " difficulty" // Difficulty is not a pointer
		contentByType["encounters"] = append(contentByType["encounters"], ContentItem{
			ID:          enc.ID,
			Name:        enc.Name,
			Type:        "encounters",
			AIGenerated: enc.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Rumors
	rumors, _ := h.db.ListRumorsByUserID(ctx, userID.(string), &campaignID)
	for _, rumor := range rumors {
		preview := rumor.Text // Text is not a pointer
		if len(preview) > 50 {
			preview = preview[:50] + "..."
		}
		// Use a truncated version of the text as the name if no title
		name := rumor.Text
		if len(name) > 30 {
			name = name[:30] + "..."
		}
		contentByType["rumors"] = append(contentByType["rumors"], ContentItem{
			ID:          rumor.ID,
			Name:        name,
			Type:        "rumors",
			AIGenerated: rumor.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Dialogues
	dialogues, _ := h.db.ListDialoguesByUserID(ctx, userID.(string), &campaignID)
	for _, dialogue := range dialogues {
		preview := ""
		if dialogue.Mood != nil {
			preview = *dialogue.Mood
		}
		contentByType["dialogues"] = append(contentByType["dialogues"], ContentItem{
			ID:          dialogue.ID,
			Name:        dialogue.CharacterName,
			Type:        "dialogues",
			AIGenerated: dialogue.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Taverns
	taverns, _ := h.db.ListTavernsByUserID(ctx, userID.(string), &campaignID)
	for _, tavern := range taverns {
		preview := tavern.Type // Type is not a pointer
		contentByType["taverns"] = append(contentByType["taverns"], ContentItem{
			ID:          tavern.ID,
			Name:        tavern.Name,
			Type:        "taverns",
			AIGenerated: tavern.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Merchants
	merchants, _ := h.db.ListMerchantsByUserID(ctx, userID.(string), &campaignID)
	for _, merchant := range merchants {
		preview := merchant.Name + " - " + merchant.ShopType // Shop name is "Name", type is "ShopType"
		contentByType["merchants"] = append(contentByType["merchants"], ContentItem{
			ID:          merchant.ID,
			Name:        merchant.OwnerName,
			Type:        "merchants",
			AIGenerated: merchant.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Traps
	traps, _ := h.db.ListTrapsByUserID(ctx, userID.(string), &campaignID)
	for _, trap := range traps {
		preview := trap.TrapType + " - " + trap.Difficulty // TrapType and Difficulty are not pointers
		contentByType["traps"] = append(contentByType["traps"], ContentItem{
			ID:          trap.ID,
			Name:        trap.Name,
			Type:        "traps",
			AIGenerated: trap.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Critters
	critters, _ := h.db.ListCrittersByUserID(ctx, userID.(string), &campaignID)
	for _, critter := range critters {
		preview := ""
		if critter.Species != nil {
			preview = *critter.Species
		}
		contentByType["critters"] = append(contentByType["critters"], ContentItem{
			ID:          critter.ID,
			Name:        critter.Name,
			Type:        "critters",
			AIGenerated: critter.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Chases
	chases, _ := h.db.ListChasesByUserID(ctx, userID.(string), &campaignID)
	for _, chase := range chases {
		preview := chase.Terrain + " - " + chase.Difficulty // Terrain and Difficulty are not pointers
		contentByType["chases"] = append(contentByType["chases"], ContentItem{
			ID:          chase.ID,
			Name:        chase.Name,
			Type:        "chases",
			AIGenerated: chase.AIGenerated,
			Preview:     preview,
		})
	}

	// Fetch Campaign Content (sessions, notes, etc.)
	campaignContent, _ := h.db.GetCampaignContentByCampaignID(ctx, campaignID, userID.(string))
	for _, content := range campaignContent {
		preview := content.Section
		if content.Subsection != nil {
			preview += " / " + *content.Subsection
		}
		// Content is "AI Generated" if type is 'imported' (based on existing logic)
		aiGenerated := content.Type == "imported"
		contentByType["campaign_content"] = append(contentByType["campaign_content"], ContentItem{
			ID:          content.ID,
			Name:        content.Title,
			Type:        "campaign_content",
			AIGenerated: aiGenerated,
			Preview:     preview,
		})
	}

	// Get current exclusions from campaign settings
	exclusions := make(map[string][]string)
	if campaign.Setting != nil {
		var settingMap map[string]interface{}
		if err := json.Unmarshal(campaign.Setting, &settingMap); err == nil {
			if excl, ok := settingMap["summary_content_exclusions"].(map[string]interface{}); ok {
				for k, v := range excl {
					if arr, ok := v.([]interface{}); ok {
						for _, id := range arr {
							if idStr, ok := id.(string); ok {
								exclusions[k] = append(exclusions[k], idStr)
							}
						}
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"content_by_type": contentByType,
		"exclusions":      exclusions,
	})
}

// UpdateSummaryContent updates the summary content exclusions for a campaign
func (h *CampaignHandler) UpdateSummaryContent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify ownership
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var req struct {
		Exclusions map[string][]string `json:"exclusions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse existing settings
	settingMap := make(map[string]interface{})
	if campaign.Setting != nil {
		if err := json.Unmarshal(campaign.Setting, &settingMap); err != nil {
			h.logger.Warn("Failed to parse existing campaign settings", zap.Error(err))
		}
	}

	// Update exclusions
	settingMap["summary_content_exclusions"] = req.Exclusions

	// Marshal back to JSON
	newSetting, err := json.Marshal(settingMap)
	if err != nil {
		h.logger.Error("Failed to marshal campaign settings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	// Update campaign
	campaign.Setting = newSetting
	if err := h.db.UpdateCampaign(c.Request.Context(), campaign); err != nil {
		h.logger.Error("Failed to update campaign", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ActivityItem represents a single activity entry for the campaign activity feed
type ActivityItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Action    string `json:"action"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	ContentID string `json:"content_id"`
}

// GetCampaignActivity returns aggregated recent activity for a campaign
// This replaces 13 separate frontend API calls with a single backend call
func (h *CampaignHandler) GetCampaignActivity(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	campaignID := c.Param("id")

	// Verify the user has access to this campaign (either owner or member)
	campaign, err := h.db.GetCampaignByIDAndUserID(c.Request.Context(), campaignID, userID.(string))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to verify campaign access", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	ctx := c.Request.Context()
	var activity []ActivityItem

	// Fetch NPCs
	npcs, _ := h.db.ListNPCsByUserID(ctx, userID.(string), &campaignID)
	for _, npc := range npcs {
		activity = append(activity, ActivityItem{
			ID:        npc.ID,
			Type:      "npc",
			Action:    "created",
			Name:      npc.Name,
			CreatedAt: npc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: npc.ID,
		})
	}

	// Fetch Monsters
	monsters, _ := h.db.ListMonstersByUserID(ctx, userID.(string), &campaignID)
	for _, monster := range monsters {
		activity = append(activity, ActivityItem{
			ID:        monster.ID,
			Type:      "monster",
			Action:    "created",
			Name:      monster.Name,
			CreatedAt: monster.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: monster.ID,
		})
	}

	// Fetch Locations
	locations, _ := h.db.ListLocationsByUserID(ctx, userID.(string), &campaignID)
	for _, loc := range locations {
		activity = append(activity, ActivityItem{
			ID:        loc.ID,
			Type:      "location",
			Action:    "created",
			Name:      loc.Name,
			CreatedAt: loc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: loc.ID,
		})
	}

	// Fetch Items
	items, _ := h.db.ListItemsByUserID(ctx, userID.(string), &campaignID)
	for _, item := range items {
		activity = append(activity, ActivityItem{
			ID:        item.ID,
			Type:      "item",
			Action:    "created",
			Name:      item.Name,
			CreatedAt: item.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: item.ID,
		})
	}

	// Fetch Quests
	quests, _ := h.db.ListQuestsByUserID(ctx, userID.(string), &campaignID)
	for _, quest := range quests {
		activity = append(activity, ActivityItem{
			ID:        quest.ID,
			Type:      "quest",
			Action:    "created",
			Name:      quest.Title,
			CreatedAt: quest.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: quest.ID,
		})
	}

	// Fetch Encounters
	encounters, _ := h.db.ListEncountersByUserID(ctx, userID.(string), &campaignID)
	for _, enc := range encounters {
		activity = append(activity, ActivityItem{
			ID:        enc.ID,
			Type:      "encounter",
			Action:    "created",
			Name:      enc.Name,
			CreatedAt: enc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: enc.ID,
		})
	}

	// Fetch Taverns
	taverns, _ := h.db.ListTavernsByUserID(ctx, userID.(string), &campaignID)
	for _, tavern := range taverns {
		activity = append(activity, ActivityItem{
			ID:        tavern.ID,
			Type:      "tavern",
			Action:    "created",
			Name:      tavern.Name,
			CreatedAt: tavern.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: tavern.ID,
		})
	}

	// Fetch Merchants
	merchants, _ := h.db.ListMerchantsByUserID(ctx, userID.(string), &campaignID)
	for _, merchant := range merchants {
		activity = append(activity, ActivityItem{
			ID:        merchant.ID,
			Type:      "merchant",
			Action:    "created",
			Name:      merchant.Name,
			CreatedAt: merchant.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: merchant.ID,
		})
	}

	// Fetch Traps
	traps, _ := h.db.ListTrapsByUserID(ctx, userID.(string), &campaignID)
	for _, trap := range traps {
		activity = append(activity, ActivityItem{
			ID:        trap.ID,
			Type:      "trap",
			Action:    "created",
			Name:      trap.Name,
			CreatedAt: trap.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: trap.ID,
		})
	}

	// Fetch Critters
	critters, _ := h.db.ListCrittersByUserID(ctx, userID.(string), &campaignID)
	for _, critter := range critters {
		activity = append(activity, ActivityItem{
			ID:        critter.ID,
			Type:      "critter",
			Action:    "created",
			Name:      critter.Name,
			CreatedAt: critter.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: critter.ID,
		})
	}

	// Fetch Chases
	chases, _ := h.db.ListChasesByUserID(ctx, userID.(string), &campaignID)
	for _, chase := range chases {
		activity = append(activity, ActivityItem{
			ID:        chase.ID,
			Type:      "chase",
			Action:    "created",
			Name:      chase.Name,
			CreatedAt: chase.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: chase.ID,
		})
	}

	// Fetch Dialogues
	dialogues, _ := h.db.ListDialoguesByUserID(ctx, userID.(string), &campaignID)
	for _, dialogue := range dialogues {
		activity = append(activity, ActivityItem{
			ID:        dialogue.ID,
			Type:      "dialogue",
			Action:    "created",
			Name:      dialogue.CharacterName,
			CreatedAt: dialogue.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: dialogue.ID,
		})
	}

	// Fetch Rumors
	rumors, _ := h.db.ListRumorsByUserID(ctx, userID.(string), &campaignID)
	for _, rumor := range rumors {
		name := rumor.Text
		if len(name) > 40 {
			name = name[:40] + "..."
		}
		activity = append(activity, ActivityItem{
			ID:        rumor.ID,
			Type:      "rumor",
			Action:    "created",
			Name:      name,
			CreatedAt: rumor.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ContentID: rumor.ID,
		})
	}

	// Sort by created_at descending (most recent first)
	// Using a simple bubble sort for clarity - slice is usually small
	for i := 0; i < len(activity); i++ {
		for j := i + 1; j < len(activity); j++ {
			if activity[j].CreatedAt > activity[i].CreatedAt {
				activity[i], activity[j] = activity[j], activity[i]
			}
		}
	}

	// Log for debugging
	h.logger.Debug("Campaign activity fetched",
		zap.String("campaign_id", campaignID),
		zap.String("campaign_name", campaign.Name),
		zap.Int("activity_count", len(activity)))

	c.JSON(http.StatusOK, gin.H{"activity": activity})
}
