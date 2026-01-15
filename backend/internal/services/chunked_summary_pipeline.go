package services

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"tavkit/internal/ai"
	"tavkit/internal/db"

	"go.uber.org/zap"
)

// ProviderConfig holds AI provider configuration to pass to the Python ai-service
type ProviderConfig struct {
	Provider string `json:"provider"`           // 'ollama', 'openai', 'anthropic'
	APIKey   string `json:"api_key,omitempty"`  // API key for cloud providers
	Model    string `json:"model,omitempty"`    // Model name
	BaseURL  string `json:"base_url,omitempty"` // Base URL (for Ollama)
}

// ChunkedSummaryPipeline handles the chunked summary generation process
// It extracts facts in batches, caches them, and synthesizes summaries
type ChunkedSummaryPipeline struct {
	database  db.Database
	aiClient  *AIClient
	aiFactory *ai.Factory
	logger    *zap.Logger
	batchSize int
}

// NewChunkedSummaryPipeline creates a new chunked summary pipeline
func NewChunkedSummaryPipeline(database db.Database, aiClient *AIClient, aiFactory *ai.Factory, logger *zap.Logger) *ChunkedSummaryPipeline {
	return &ChunkedSummaryPipeline{
		database:  database,
		aiClient:  aiClient,
		aiFactory: aiFactory,
		logger:    logger,
		batchSize: 8, // Default batch size, can be overridden
	}
}

// getProviderConfig returns the current provider configuration to pass to the ai-service
func (p *ChunkedSummaryPipeline) getProviderConfig() *ProviderConfig {
	if p.aiFactory == nil {
		return nil
	}

	providerType := p.aiFactory.GetCurrentProviderType()
	return &ProviderConfig{
		Provider: string(providerType),
		// Note: We don't pass API keys here - the ai-service uses its own configured keys
		// This approach is safer as it doesn't expose keys in request payloads
	}
}

// ContentTypes defines all content types that can be processed
var ContentTypes = []string{
	"npcs", "locations", "quests", "monsters", "items",
	"encounters", "rumors", "dialogues", "taverns", "merchants",
	"traps", "critters", "chases", "campaign_content",
}

// ProgressCallback is called during pipeline execution to report progress
type ProgressCallback func(stage string, currentBatch, totalBatches, progressPercent int)

// StartSummaryGeneration starts an async summary generation job
func (p *ChunkedSummaryPipeline) StartSummaryGeneration(ctx context.Context, campaignID, userID string) (*db.SummaryGenerationJob, error) {
	// Check for existing active job
	existing, err := p.database.GetActiveSummaryJobForCampaign(ctx, campaignID)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("summary generation already in progress for campaign %s", campaignID)
	}

	// Create new job
	job := &db.SummaryGenerationJob{
		CampaignID:      campaignID,
		UserID:          userID,
		Status:          "pending",
		CurrentBatch:    0,
		TotalBatches:    0,
		ProgressPercent: 0,
	}

	if err := p.database.CreateSummaryJob(ctx, job); err != nil {
		return nil, fmt.Errorf("failed to create summary job: %w", err)
	}

	return job, nil
}

// GetJobProgress retrieves current progress of a summary generation job
func (p *ChunkedSummaryPipeline) GetJobProgress(ctx context.Context, jobID string) (*db.SummaryGenerationJob, error) {
	return p.database.GetSummaryJob(ctx, jobID)
}

// RunPipeline executes the full pipeline for a campaign
// It should be called in a goroutine for async execution
func (p *ChunkedSummaryPipeline) RunPipeline(ctx context.Context, jobID string, progressCallback ProgressCallback) error {
	// Get job details
	job, err := p.database.GetSummaryJob(ctx, jobID)
	if err != nil {
		return fmt.Errorf("failed to get job: %w", err)
	}

	// Mark job as started
	now := time.Now()
	job.StartedAt = &now
	job.Status = "extracting"
	if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
		p.logger.Error("Failed to update job status", zap.Error(err))
	}

	p.logger.Info("Starting chunked summary pipeline",
		zap.String("job_id", jobID),
		zap.String("campaign_id", job.CampaignID))

	// Load content exclusions from campaign settings
	exclusions := p.loadContentExclusions(ctx, job.CampaignID)
	if len(exclusions) > 0 {
		p.logger.Info("Loaded content exclusions",
			zap.String("campaign_id", job.CampaignID),
			zap.Int("exclusion_count", len(exclusions)))
	}

	// Calculate total batches across all content types
	totalBatches := 0
	contentCounts := make(map[string]int)
	for _, contentType := range ContentTypes {
		count, err := p.getContentCountWithExclusions(ctx, job.CampaignID, job.UserID, contentType, exclusions)
		if err != nil {
			p.logger.Warn("Failed to get content count", zap.String("type", contentType), zap.Error(err))
			continue
		}
		contentCounts[contentType] = count
		batches := (count + p.batchSize - 1) / p.batchSize
		if batches == 0 && count > 0 {
			batches = 1
		}
		totalBatches += batches
	}
	// Add synthesis steps (5 sections)
	totalBatches += 5

	job.TotalBatches = totalBatches
	if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
		p.logger.Error("Failed to update total batches", zap.Error(err))
	}

	// Phase 1: Extract facts for each content type
	currentBatch := 0
	for _, contentType := range ContentTypes {
		count := contentCounts[contentType]
		if count == 0 {
			continue
		}

		stage := contentType
		job.CurrentStage = &stage
		if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
			p.logger.Error("Failed to update current stage", zap.Error(err))
		}

		// Process in batches
		for offset := 0; offset < count; offset += p.batchSize {
			select {
			case <-ctx.Done():
				p.markJobFailed(ctx, job, "cancelled")
				return ctx.Err()
			default:
			}

			if err := p.extractFactsBatchWithExclusions(ctx, job.CampaignID, job.UserID, contentType, offset, p.batchSize, exclusions); err != nil {
				p.logger.Error("Failed to extract facts batch",
					zap.String("type", contentType),
					zap.Int("offset", offset),
					zap.Error(err))
				// Continue with other batches
			}

			currentBatch++
			job.CurrentBatch = currentBatch
			job.ProgressPercent = (currentBatch * 100) / totalBatches
			if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
				p.logger.Error("Failed to update progress", zap.Error(err))
			}

			if progressCallback != nil {
				progressCallback(contentType, currentBatch, totalBatches, job.ProgressPercent)
			}
		}
	}

	// Phase 2: Synthesize summary sections
	job.Status = "synthesizing"
	if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
		p.logger.Error("Failed to update status to synthesizing", zap.Error(err))
	}

	// Get campaign metadata
	campaign, err := p.database.GetCampaignByID(ctx, job.CampaignID)
	if err != nil {
		p.markJobFailed(ctx, job, fmt.Sprintf("failed to get campaign: %v", err))
		return err
	}

	// Gather all facts from cache
	allFacts, err := p.gatherAllFacts(ctx, job.CampaignID)
	if err != nil {
		p.markJobFailed(ctx, job, fmt.Sprintf("failed to gather facts: %v", err))
		return err
	}

	// Synthesize each section
	summary := &db.CampaignSummary{
		CampaignID: job.CampaignID,
		UserID:     job.UserID,
	}

	sections := []string{"overview", "setting", "characters", "plot", "tone"}
	for _, section := range sections {
		select {
		case <-ctx.Done():
			p.markJobFailed(ctx, job, "cancelled")
			return ctx.Err()
		default:
		}

		job.CurrentStage = &section
		if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
			p.logger.Error("Failed to update current stage", zap.Error(err))
		}

		sectionSummary, err := p.synthesizeSection(ctx, section, campaign, allFacts)
		if err != nil {
			p.logger.Error("Failed to synthesize section",
				zap.String("section", section),
				zap.Error(err))
			sectionSummary = "Unable to generate summary"
		}

		switch section {
		case "overview":
			summary.Overview = &sectionSummary
		case "setting":
			summary.SettingSummary = &sectionSummary
		case "characters":
			summary.CharactersSummary = &sectionSummary
		case "plot":
			summary.PlotSummary = &sectionSummary
		case "tone":
			summary.ToneSummary = &sectionSummary
		}

		currentBatch++
		job.CurrentBatch = currentBatch
		job.ProgressPercent = (currentBatch * 100) / totalBatches
		if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
			p.logger.Error("Failed to update progress", zap.Error(err))
		}

		if progressCallback != nil {
			progressCallback(section, currentBatch, totalBatches, job.ProgressPercent)
		}
	}

	// Update content stats
	stats := p.buildContentStats(contentCounts)
	statsJSON, _ := json.Marshal(stats)
	summary.ContentStats = statsJSON

	// Save summary
	if err := p.database.UpsertCampaignSummary(ctx, summary); err != nil {
		p.markJobFailed(ctx, job, fmt.Sprintf("failed to save summary: %v", err))
		return err
	}

	// Mark job as completed
	completedAt := time.Now()
	job.CompletedAt = &completedAt
	job.Status = "completed"
	job.ProgressPercent = 100
	if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
		p.logger.Error("Failed to mark job as completed", zap.Error(err))
	}

	p.logger.Info("Chunked summary pipeline completed",
		zap.String("job_id", jobID),
		zap.String("campaign_id", job.CampaignID))

	return nil
}

// synthesizeSection synthesizes a summary section from extracted facts
func (p *ChunkedSummaryPipeline) synthesizeSection(ctx context.Context, section string, campaign *db.Campaign, factsByType map[string][]string) (string, error) {
	// Build campaign metadata
	metadata := map[string]interface{}{
		"name":        campaign.Name,
		"game_system": campaign.GameSystem,
	}
	if campaign.Theme != nil {
		metadata["theme"] = *campaign.Theme
	}
	if campaign.Tone != nil {
		metadata["tone"] = *campaign.Tone
	}
	if campaign.MagicLevel != nil {
		metadata["magic_level"] = *campaign.MagicLevel
	}

	// Call AI service to synthesize
	payload := map[string]interface{}{
		"section":           section,
		"campaign_metadata": metadata,
		"facts_by_type":     factsByType,
	}

	// Include provider config so ai-service uses the same provider as the Go backend
	if providerCfg := p.getProviderConfig(); providerCfg != nil {
		payload["provider_config"] = providerCfg
	}

	var result struct {
		Section string `json:"section"`
		Summary string `json:"summary"`
	}

	if err := p.aiClient.Post(ctx, "/api/v1/summarize/synthesize-section", payload, &result); err != nil {
		return "", fmt.Errorf("AI service call failed: %w", err)
	}

	return result.Summary, nil
}

// gatherAllFacts retrieves all cached facts for a campaign
func (p *ChunkedSummaryPipeline) gatherAllFacts(ctx context.Context, campaignID string) (map[string][]string, error) {
	caches, err := p.database.ListFactCacheByCampaign(ctx, campaignID)
	if err != nil {
		return nil, err
	}

	factsByType := make(map[string][]string)
	for _, cache := range caches {
		var facts []string
		if err := json.Unmarshal(cache.Facts, &facts); err != nil {
			p.logger.Warn("Failed to unmarshal facts", zap.Error(err))
			continue
		}
		factsByType[cache.ContentType] = append(factsByType[cache.ContentType], facts...)
	}

	return factsByType, nil
}

// getContentCount returns the count of content items for a type
func (p *ChunkedSummaryPipeline) getContentCount(ctx context.Context, campaignID, userID, contentType string) (int, error) {
	switch contentType {
	case "npcs":
		items, err := p.database.ListNPCsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "locations":
		items, err := p.database.ListLocationsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "quests":
		items, err := p.database.ListQuestsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "monsters":
		items, err := p.database.ListMonstersByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "items":
		items, err := p.database.ListItemsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "encounters":
		items, err := p.database.ListEncountersByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "rumors":
		items, err := p.database.ListRumorsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "dialogues":
		items, err := p.database.ListDialoguesByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "taverns":
		items, err := p.database.ListTavernsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "merchants":
		items, err := p.database.ListMerchantsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "traps":
		items, err := p.database.ListTrapsByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "critters":
		items, err := p.database.ListCrittersByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "chases":
		items, err := p.database.ListChasesByUserID(ctx, userID, &campaignID)
		return len(items), err
	case "campaign_content":
		items, err := p.database.GetCampaignContentByCampaignID(ctx, campaignID, userID)
		return len(items), err
	default:
		return 0, fmt.Errorf("unknown content type: %s", contentType)
	}
}

// getContentBatch retrieves a batch of content items
func (p *ChunkedSummaryPipeline) getContentBatch(ctx context.Context, campaignID, userID, contentType string, offset, limit int) ([]map[string]interface{}, error) {
	var items []map[string]interface{}

	switch contentType {
	case "npcs":
		npcs, err := p.database.ListNPCsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(npcs) && i < offset+limit; i++ {
			items = append(items, npcToMap(npcs[i]))
		}
	case "locations":
		locations, err := p.database.ListLocationsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(locations) && i < offset+limit; i++ {
			items = append(items, locationToMap(locations[i]))
		}
	case "quests":
		quests, err := p.database.ListQuestsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(quests) && i < offset+limit; i++ {
			items = append(items, questToMap(quests[i]))
		}
	case "monsters":
		monsters, err := p.database.ListMonstersByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(monsters) && i < offset+limit; i++ {
			items = append(items, monsterToMap(monsters[i]))
		}
	case "items":
		dbItems, err := p.database.ListItemsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(dbItems) && i < offset+limit; i++ {
			items = append(items, itemToMap(dbItems[i]))
		}
	case "encounters":
		encounters, err := p.database.ListEncountersByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(encounters) && i < offset+limit; i++ {
			items = append(items, encounterToMap(encounters[i]))
		}
	case "rumors":
		rumors, err := p.database.ListRumorsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(rumors) && i < offset+limit; i++ {
			items = append(items, rumorToMap(rumors[i]))
		}
	case "dialogues":
		dialogues, err := p.database.ListDialoguesByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(dialogues) && i < offset+limit; i++ {
			items = append(items, dialogueToMap(dialogues[i]))
		}
	case "taverns":
		taverns, err := p.database.ListTavernsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(taverns) && i < offset+limit; i++ {
			items = append(items, tavernToMap(taverns[i]))
		}
	case "merchants":
		merchants, err := p.database.ListMerchantsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(merchants) && i < offset+limit; i++ {
			items = append(items, merchantToMap(merchants[i]))
		}
	case "traps":
		traps, err := p.database.ListTrapsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(traps) && i < offset+limit; i++ {
			items = append(items, trapToMap(traps[i]))
		}
	case "critters":
		critters, err := p.database.ListCrittersByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(critters) && i < offset+limit; i++ {
			items = append(items, critterToMap(critters[i]))
		}
	case "chases":
		chases, err := p.database.ListChasesByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(chases) && i < offset+limit; i++ {
			items = append(items, chaseToMap(chases[i]))
		}
	case "campaign_content":
		contents, err := p.database.GetCampaignContentByCampaignID(ctx, campaignID, userID)
		if err != nil {
			return nil, err
		}
		for i := offset; i < len(contents) && i < offset+limit; i++ {
			items = append(items, campaignContentToMap(contents[i]))
		}
	default:
		return nil, fmt.Errorf("unknown content type: %s", contentType)
	}

	return items, nil
}

// buildContentStats builds content statistics from counts
func (p *ChunkedSummaryPipeline) buildContentStats(counts map[string]int) db.ContentStats {
	return db.ContentStats{
		NPCs:            counts["npcs"],
		Locations:       counts["locations"],
		Quests:          counts["quests"],
		Monsters:        counts["monsters"],
		Items:           counts["items"],
		Encounters:      counts["encounters"],
		Rumors:          counts["rumors"],
		CampaignContent: counts["campaign_content"],
	}
}

// markJobFailed marks a job as failed with an error message
func (p *ChunkedSummaryPipeline) markJobFailed(ctx context.Context, job *db.SummaryGenerationJob, errMsg string) {
	job.Status = "failed"
	job.ErrorMessage = &errMsg
	completedAt := time.Now()
	job.CompletedAt = &completedAt
	if err := p.database.UpdateSummaryJob(ctx, job); err != nil {
		p.logger.Error("Failed to mark job as failed", zap.Error(err))
	}
}

// loadContentExclusions loads the content exclusions from campaign settings
func (p *ChunkedSummaryPipeline) loadContentExclusions(ctx context.Context, campaignID string) map[string]map[string]bool {
	exclusions := make(map[string]map[string]bool)

	campaign, err := p.database.GetCampaignByID(ctx, campaignID)
	if err != nil {
		p.logger.Warn("Failed to load campaign for exclusions", zap.Error(err))
		return exclusions
	}

	if campaign.Setting == nil {
		return exclusions
	}

	var settingMap map[string]interface{}
	if err := json.Unmarshal(campaign.Setting, &settingMap); err != nil {
		p.logger.Warn("Failed to parse campaign settings for exclusions", zap.Error(err))
		return exclusions
	}

	excl, ok := settingMap["summary_content_exclusions"].(map[string]interface{})
	if !ok {
		return exclusions
	}

	for contentType, ids := range excl {
		exclusions[contentType] = make(map[string]bool)
		if arr, ok := ids.([]interface{}); ok {
			for _, id := range arr {
				if idStr, ok := id.(string); ok {
					exclusions[contentType][idStr] = true
				}
			}
		}
	}

	return exclusions
}

// isExcluded checks if a content ID is excluded
func isExcluded(exclusions map[string]map[string]bool, contentType, id string) bool {
	if typeExclusions, ok := exclusions[contentType]; ok {
		return typeExclusions[id]
	}
	return false
}

// getContentCountWithExclusions returns the count of non-excluded content items for a type
func (p *ChunkedSummaryPipeline) getContentCountWithExclusions(ctx context.Context, campaignID, userID, contentType string, exclusions map[string]map[string]bool) (int, error) {
	// Get full count first
	fullCount, err := p.getContentCount(ctx, campaignID, userID, contentType)
	if err != nil {
		return 0, err
	}

	// If no exclusions for this type, return full count
	typeExclusions, ok := exclusions[contentType]
	if !ok || len(typeExclusions) == 0 {
		return fullCount, nil
	}

	// Otherwise, we need to count non-excluded items
	// This is a bit inefficient but necessary for accurate batch calculation
	items, err := p.getContentBatch(ctx, campaignID, userID, contentType, 0, 10000) // Get all items
	if err != nil {
		return 0, err
	}

	count := 0
	for _, item := range items {
		id := getItemID(item, contentType)
		if !isExcluded(exclusions, contentType, id) {
			count++
		}
	}

	return count, nil
}

// extractFactsBatchWithExclusions extracts facts for a batch of content items, respecting exclusions
func (p *ChunkedSummaryPipeline) extractFactsBatchWithExclusions(ctx context.Context, campaignID, userID, contentType string, offset, limit int, exclusions map[string]map[string]bool) error {
	// Get content items for this batch (already filtered by getContentBatchWithExclusions)
	items, err := p.getContentBatchWithExclusions(ctx, campaignID, userID, contentType, offset, limit, exclusions)
	if err != nil {
		return err
	}

	if len(items) == 0 {
		return nil
	}

	// Check which items need extraction (hash changed)
	var itemsToExtract []map[string]interface{}

	for _, item := range items {
		id := getItemID(item, contentType)
		hash := computeContentHash(item)

		// Check cache
		cached, err := p.database.GetFactCache(ctx, campaignID, contentType, id)
		if err == nil && cached != nil && cached.ContentHash == hash {
			// Cache hit with matching hash, skip
			continue
		}

		itemsToExtract = append(itemsToExtract, item)
	}

	if len(itemsToExtract) == 0 {
		return nil
	}

	// Call AI service to extract facts
	payload := map[string]interface{}{
		"content_type": contentType,
		"items":        itemsToExtract,
	}

	// Include provider config so ai-service uses the same provider as the Go backend
	if providerCfg := p.getProviderConfig(); providerCfg != nil {
		payload["provider_config"] = providerCfg
	}

	var result struct {
		ContentType string `json:"content_type"`
		Results     []struct {
			ContentID string   `json:"content_id"`
			Facts     []string `json:"facts"`
		} `json:"results"`
	}

	if err := p.aiClient.Post(ctx, "/api/v1/summarize/extract-facts", payload, &result); err != nil {
		return fmt.Errorf("AI service call failed: %w", err)
	}

	// Cache the extracted facts
	for _, r := range result.Results {
		// Find the original item to get the hash
		var item map[string]interface{}
		for _, i := range itemsToExtract {
			if getItemID(i, contentType) == r.ContentID {
				item = i
				break
			}
		}

		factsJSON, _ := json.Marshal(r.Facts)
		cache := &db.CampaignFactCache{
			CampaignID:  campaignID,
			ContentType: contentType,
			ContentID:   r.ContentID,
			ContentHash: computeContentHash(item),
			Facts:       factsJSON,
		}

		if err := p.database.UpsertFactCache(ctx, cache); err != nil {
			p.logger.Error("Failed to cache facts",
				zap.String("content_id", r.ContentID),
				zap.Error(err))
		}
	}

	return nil
}

// getContentBatchWithExclusions retrieves a batch of content items, filtering out excluded items
func (p *ChunkedSummaryPipeline) getContentBatchWithExclusions(ctx context.Context, campaignID, userID, contentType string, offset, limit int, exclusions map[string]map[string]bool) ([]map[string]interface{}, error) {
	// Get all items first
	allItems, err := p.getContentBatch(ctx, campaignID, userID, contentType, 0, 10000)
	if err != nil {
		return nil, err
	}

	// Filter out excluded items
	var filteredItems []map[string]interface{}
	for _, item := range allItems {
		id := getItemID(item, contentType)
		if !isExcluded(exclusions, contentType, id) {
			filteredItems = append(filteredItems, item)
		}
	}

	// Apply offset and limit to filtered items
	if offset >= len(filteredItems) {
		return nil, nil
	}

	end := offset + limit
	if end > len(filteredItems) {
		end = len(filteredItems)
	}

	return filteredItems[offset:end], nil
}

// Helper functions

func getItemID(item map[string]interface{}, contentType string) string {
	if id, ok := item["id"].(string); ok {
		return id
	}
	if title, ok := item["title"].(string); ok {
		return title
	}
	if name, ok := item["name"].(string); ok {
		return name
	}
	return ""
}

func computeContentHash(item map[string]interface{}) string {
	data, _ := json.Marshal(item)
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// Conversion functions for each content type

func npcToMap(npc *db.NPC) map[string]interface{} {
	m := map[string]interface{}{
		"id":   npc.ID,
		"name": npc.Name,
	}
	if npc.Race != nil {
		m["race"] = *npc.Race
	}
	if npc.Class != nil {
		m["class"] = *npc.Class
	}
	if npc.Personality != nil {
		m["personality"] = *npc.Personality
	}
	if npc.Backstory != nil {
		m["backstory"] = *npc.Backstory
	}
	if npc.Stats != nil {
		m["stats"] = string(npc.Stats)
	}
	return m
}

func locationToMap(loc *db.Location) map[string]interface{} {
	m := map[string]interface{}{
		"id":   loc.ID,
		"name": loc.Name,
		"type": loc.Type,
	}
	if loc.Description != nil {
		m["description"] = *loc.Description
	}
	if loc.Features != nil {
		m["features"] = string(loc.Features)
	}
	if loc.Theme != nil {
		m["theme"] = *loc.Theme
	}
	return m
}

func questToMap(quest *db.Quest) map[string]interface{} {
	m := map[string]interface{}{
		"id":    quest.ID,
		"title": quest.Title,
		"type":  quest.Type,
	}
	if quest.Description != nil {
		m["description"] = *quest.Description
	}
	if quest.Objectives != nil {
		m["objectives"] = string(quest.Objectives)
	}
	if quest.Rewards != nil {
		m["rewards"] = string(quest.Rewards)
	}
	return m
}

func monsterToMap(monster *db.Monster) map[string]interface{} {
	m := map[string]interface{}{
		"id":   monster.ID,
		"name": monster.Name,
		"cr":   monster.CR,
	}
	if monster.Lore != nil {
		m["lore"] = *monster.Lore
	}
	if monster.Tactics != nil {
		m["tactics"] = *monster.Tactics
	}
	if monster.Stats != nil {
		m["stats"] = string(monster.Stats)
	}
	return m
}

func itemToMap(item *db.Item) map[string]interface{} {
	m := map[string]interface{}{
		"id":   item.ID,
		"name": item.Name,
		"type": item.Type,
	}
	if item.Rarity != nil {
		m["rarity"] = *item.Rarity
	}
	if item.Description != nil {
		m["description"] = *item.Description
	}
	if item.Properties != nil {
		m["properties"] = string(item.Properties)
	}
	return m
}

func encounterToMap(enc *db.Encounter) map[string]interface{} {
	m := map[string]interface{}{
		"id":          enc.ID,
		"name":        enc.Name,
		"difficulty":  enc.Difficulty,
		"party_level": enc.PartyLevel,
	}
	if enc.Description != nil {
		m["description"] = *enc.Description
	}
	if enc.Creatures != nil {
		m["creatures"] = string(enc.Creatures)
	}
	return m
}

func rumorToMap(rumor *db.Rumor) map[string]interface{} {
	m := map[string]interface{}{
		"id":       rumor.ID,
		"text":     rumor.Text,
		"veracity": rumor.Veracity,
	}
	if rumor.Source != nil {
		m["source"] = *rumor.Source
	}
	return m
}

func dialogueToMap(dlg *db.Dialogue) map[string]interface{} {
	m := map[string]interface{}{
		"id":             dlg.ID,
		"character_name": dlg.CharacterName,
	}
	if dlg.Mood != nil {
		m["mood"] = *dlg.Mood
	}
	if dlg.SceneSetting != nil {
		m["scene_setting"] = *dlg.SceneSetting
	}
	if dlg.DialogueTree != nil {
		m["dialogue_tree"] = string(dlg.DialogueTree)
	}
	return m
}

func tavernToMap(tavern *db.Tavern) map[string]interface{} {
	m := map[string]interface{}{
		"id":          tavern.ID,
		"name":        tavern.Name,
		"type":        tavern.Type,
		"keeper_name": tavern.KeeperName,
	}
	if tavern.Atmosphere != nil {
		m["atmosphere"] = *tavern.Atmosphere
	}
	if tavern.Description != nil {
		m["description"] = *tavern.Description
	}
	m["keeper_personality"] = tavern.KeeperPersonality
	return m
}

func merchantToMap(merchant *db.Merchant) map[string]interface{} {
	m := map[string]interface{}{
		"id":                merchant.ID,
		"name":              merchant.Name,
		"shop_type":         merchant.ShopType,
		"owner_name":        merchant.OwnerName,
		"owner_personality": merchant.OwnerPersonality,
	}
	if merchant.Atmosphere != nil {
		m["atmosphere"] = *merchant.Atmosphere
	}
	if merchant.Description != nil {
		m["description"] = *merchant.Description
	}
	return m
}

func trapToMap(trap *db.Trap) map[string]interface{} {
	m := map[string]interface{}{
		"id":         trap.ID,
		"name":       trap.Name,
		"trap_type":  trap.TrapType,
		"difficulty": trap.Difficulty,
	}
	if trap.Trigger != nil {
		m["trigger"] = *trap.Trigger
	}
	if trap.Effect != nil {
		m["effect"] = *trap.Effect
	}
	if trap.Description != nil {
		m["description"] = *trap.Description
	}
	return m
}

func critterToMap(critter *db.Critter) map[string]interface{} {
	m := map[string]interface{}{
		"id":           critter.ID,
		"name":         critter.Name,
		"critter_type": critter.CritterType,
		"size":         critter.Size,
	}
	if critter.Species != nil {
		m["species"] = *critter.Species
	}
	if critter.Temperament != nil {
		m["temperament"] = *critter.Temperament
	}
	if critter.Habitat != nil {
		m["habitat"] = *critter.Habitat
	}
	if critter.Description != nil {
		m["description"] = *critter.Description
	}
	return m
}

func chaseToMap(chase *db.Chase) map[string]interface{} {
	m := map[string]interface{}{
		"id":         chase.ID,
		"name":       chase.Name,
		"chase_type": chase.ChaseType,
		"terrain":    chase.Terrain,
		"difficulty": chase.Difficulty,
	}
	if chase.Description != nil {
		m["description"] = *chase.Description
	}
	if chase.Obstacles != nil {
		m["obstacles"] = string(chase.Obstacles)
	}
	return m
}

func campaignContentToMap(content *db.CampaignContent) map[string]interface{} {
	m := map[string]interface{}{
		"id":      content.ID,
		"section": content.Section,
		"title":   content.Title,
		"content": content.Content,
		"type":    content.Type,
	}
	if content.Subsection != nil {
		m["subsection"] = *content.Subsection
	}
	return m
}

// InvalidateFactCache invalidates cached facts for a specific content item
// This should be called when content is updated
func (p *ChunkedSummaryPipeline) InvalidateFactCache(ctx context.Context, campaignID, contentType, contentID string) error {
	return p.database.DeleteFactCacheByContent(ctx, campaignID, contentType, contentID)
}

// InvalidateCampaignFactCache invalidates all cached facts for a campaign
func (p *ChunkedSummaryPipeline) InvalidateCampaignFactCache(ctx context.Context, campaignID string) error {
	return p.database.DeleteFactCacheByCampaign(ctx, campaignID)
}

// Ensure unused variable warning is avoided
var _ = strings.TrimSpace
var _ = sql.ErrNoRows
