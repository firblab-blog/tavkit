package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"tavkit/internal/db"

	"go.uber.org/zap"
)

// CampaignSummaryService handles campaign summarization and context generation
type CampaignSummaryService struct {
	database             db.Database
	aiClient             *AIClient
	logger               *zap.Logger
	campaignContentItems []CampaignContentItem // Temporary storage for AI payload generation
}

// NewCampaignSummaryService creates a new campaign summary service
func NewCampaignSummaryService(database db.Database, aiClient *AIClient, logger *zap.Logger) *CampaignSummaryService {
	return &CampaignSummaryService{
		database: database,
		aiClient: aiClient,
		logger:   logger,
	}
}

// UpdateSummary regenerates summaries for a specific content type in a campaign
func (s *CampaignSummaryService) UpdateSummary(ctx context.Context, campaignID string, contentType string) error {
	// Get the campaign details
	campaign, err := s.getCampaignByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	// Get or create summary
	summary, err := s.database.GetCampaignSummaryByCampaignID(ctx, campaignID)
	if err != nil {
		// Create new summary if doesn't exist
		summary = &db.CampaignSummary{
			CampaignID: campaignID,
			UserID:     campaign.UserID,
		}
	}

	// Generate section summary for the specified content type
	sectionSummary, err := s.GenerateSectionSummary(ctx, campaignID, campaign.UserID, contentType)
	if err != nil {
		return fmt.Errorf("failed to generate section summary: %w", err)
	}

	// Update section summaries in the summary object
	if err := s.updateSectionSummaries(summary, contentType, sectionSummary); err != nil {
		return fmt.Errorf("failed to update section summaries: %w", err)
	}

	// Regenerate overall summaries
	if err := s.generateOverallSummaries(ctx, summary, campaign); err != nil {
		return fmt.Errorf("failed to generate overall summaries: %w", err)
	}

	// Update content stats
	if err := s.updateContentStats(ctx, summary, campaign.UserID, campaignID); err != nil {
		return fmt.Errorf("failed to update content stats: %w", err)
	}

	// Save summary
	return s.database.UpsertCampaignSummary(ctx, summary)
}

// GetCampaignContext returns structured campaign context for AI generation.
// If no cached summary exists, it returns the campaign metadata with summary set to null
// and summary_available set to false. The caller should use RegenerateCampaignSummary
// to explicitly generate a summary when needed.
func (s *CampaignSummaryService) GetCampaignContext(ctx context.Context, campaignID string) (map[string]interface{}, error) {
	campaign, err := s.getCampaignByID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Build base context response with campaign metadata
	context := map[string]interface{}{
		"campaign": map[string]interface{}{
			"name":        campaign.Name,
			"game_system": campaign.GameSystem,
			"theme":       campaign.Theme,
			"tone":        campaign.Tone,
			"magic_level": campaign.MagicLevel,
			"setting":     campaign.Setting,
		},
	}

	// Get existing names for duplicate avoidance (useful even without summary)
	existingNames, err := s.GetExistingNames(ctx, campaignID)
	if err != nil {
		s.logger.Warn("Failed to get existing names", zap.Error(err))
		// Continue without existing names - not critical
	} else {
		context["existing_names"] = existingNames
	}

	// Try to get cached summary - do NOT auto-generate if missing
	summary, err := s.database.GetCampaignSummaryByCampaignID(ctx, campaignID)
	if err != nil {
		// No cached summary exists - return response indicating this
		s.logger.Debug("No cached summary exists for campaign",
			zap.String("campaign_id", campaignID))

		context["summary"] = nil
		context["summary_available"] = false
		context["content_stats"] = nil
		context["section_summaries"] = nil
		context["version"] = 0

		return context, nil
	}

	// Parse JSON fields from cached summary
	var contentStats db.ContentStats
	if summary.ContentStats != nil {
		_ = json.Unmarshal(summary.ContentStats, &contentStats)
	}

	var sectionSummaries db.SectionSummaries
	if summary.SectionSummaries != nil {
		_ = json.Unmarshal(summary.SectionSummaries, &sectionSummaries)
	}

	// Add summary data to context
	context["summary"] = map[string]interface{}{
		"overview":           summary.Overview,
		"setting_summary":    summary.SettingSummary,
		"characters_summary": summary.CharactersSummary,
		"plot_summary":       summary.PlotSummary,
		"tone_summary":       summary.ToneSummary,
	}
	context["summary_available"] = true
	context["content_stats"] = contentStats
	context["section_summaries"] = sectionSummaries
	context["version"] = summary.Version

	// Log what we're returning
	s.logger.Debug("Returning campaign context with cached summary",
		zap.String("campaign_id", campaignID),
		zap.Bool("has_overview", summary.Overview != nil),
		zap.Bool("has_setting", summary.SettingSummary != nil),
		zap.Bool("has_characters", summary.CharactersSummary != nil),
		zap.Bool("has_plot", summary.PlotSummary != nil),
		zap.Bool("has_tone", summary.ToneSummary != nil),
		zap.Bool("has_existing_names", existingNames != nil),
	)

	return context, nil
}

// GetExistingNames retrieves just the names of existing content for a campaign
// This is used to instruct the AI to avoid generating duplicate names
func (s *CampaignSummaryService) GetExistingNames(ctx context.Context, campaignID string) (*db.ExistingNames, error) {
	campaign, err := s.getCampaignByID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	names := &db.ExistingNames{}

	// Get NPC names
	if npcs, err := s.database.ListNPCsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, npc := range npcs {
			names.NPCs = append(names.NPCs, npc.Name)
		}
	}

	// Get Location names
	if locations, err := s.database.ListLocationsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, location := range locations {
			names.Locations = append(names.Locations, location.Name)
		}
	}

	// Get Quest titles
	if quests, err := s.database.ListQuestsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, quest := range quests {
			names.Quests = append(names.Quests, quest.Title)
		}
	}

	// Get Monster names
	if monsters, err := s.database.ListMonstersByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, monster := range monsters {
			names.Monsters = append(names.Monsters, monster.Name)
		}
	}

	// Get Item names
	if items, err := s.database.ListItemsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, item := range items {
			names.Items = append(names.Items, item.Name)
		}
	}

	// Get Encounter names
	if encounters, err := s.database.ListEncountersByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, encounter := range encounters {
			names.Encounters = append(names.Encounters, encounter.Name)
		}
	}

	// Get Tavern names
	if taverns, err := s.database.ListTavernsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, tavern := range taverns {
			names.Taverns = append(names.Taverns, tavern.Name)
		}
	}

	// Get Merchant/Shop names
	if merchants, err := s.database.ListMerchantsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, merchant := range merchants {
			names.Merchants = append(names.Merchants, merchant.Name)
		}
	}

	// Get Trap names
	if traps, err := s.database.ListTrapsByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, trap := range traps {
			names.Traps = append(names.Traps, trap.Name)
		}
	}

	// Get Critter names
	if critters, err := s.database.ListCrittersByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, critter := range critters {
			names.Critters = append(names.Critters, critter.Name)
		}
	}

	// Get Dialogue character names
	if dialogues, err := s.database.ListDialoguesByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, dialogue := range dialogues {
			names.Dialogues = append(names.Dialogues, dialogue.CharacterName)
		}
	}

	// Get Chase names
	if chases, err := s.database.ListChasesByUserID(ctx, campaign.UserID, &campaignID); err == nil {
		for _, chase := range chases {
			names.Chases = append(names.Chases, chase.Name)
		}
	}

	return names, nil
}

// GenerateSectionSummary generates AI summaries for all content in a section
func (s *CampaignSummaryService) GenerateSectionSummary(ctx context.Context, campaignID, userID, contentType string) ([]string, error) {
	var summaries []string

	s.logger.Debug("Generating section summary",
		zap.String("campaign_id", campaignID),
		zap.String("content_type", contentType),
	)

	switch contentType {
	case "npcs":
		npcs, err := s.database.ListNPCsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		s.logger.Debug("Retrieved NPCs for campaign", zap.Int("count", len(npcs)))
		for _, npc := range npcs {
			summary := s.summarizeNPC(npc)
			summaries = append(summaries, summary)
		}

	case "locations":
		locations, err := s.database.ListLocationsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		s.logger.Debug("Retrieved locations for campaign", zap.Int("count", len(locations)))
		for _, location := range locations {
			summary := s.summarizeLocation(location)
			summaries = append(summaries, summary)
		}

	case "quests":
		quests, err := s.database.ListQuestsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for _, quest := range quests {
			summary := s.summarizeQuest(quest)
			summaries = append(summaries, summary)
		}

	case "monsters":
		monsters, err := s.database.ListMonstersByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for _, monster := range monsters {
			summary := s.summarizeMonster(monster)
			summaries = append(summaries, summary)
		}

	case "items":
		items, err := s.database.ListItemsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			summary := s.summarizeItem(item)
			summaries = append(summaries, summary)
		}

	case "encounters":
		encounters, err := s.database.ListEncountersByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		for _, encounter := range encounters {
			summary := s.summarizeEncounter(encounter)
			summaries = append(summaries, summary)
		}

	case "rumors":
		rumors, err := s.database.ListRumorsByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		s.logger.Debug("Retrieved rumors for campaign", zap.Int("count", len(rumors)))
		for _, rumor := range rumors {
			summary := s.summarizeRumor(rumor)
			summaries = append(summaries, summary)
		}

	case "dialogues":
		dialogues, err := s.database.ListDialoguesByUserID(ctx, userID, &campaignID)
		if err != nil {
			return nil, err
		}
		s.logger.Debug("Retrieved dialogues for campaign", zap.Int("count", len(dialogues)))
		for _, dialogue := range dialogues {
			summary := s.summarizeDialogue(dialogue)
			summaries = append(summaries, summary)
		}

	case "campaign_content":
		// Query campaign_content table directly for this campaign
		contents, err := s.getCampaignContents(ctx, campaignID, userID)
		if err != nil {
			return nil, err
		}
		s.logger.Debug("Retrieved campaign content items", zap.Int("count", len(contents)))
		// Store the full content items in the service for AI payload generation
		s.campaignContentItems = contents
		for _, content := range contents {
			summary := s.summarizeCampaignContent(content)
			summaries = append(summaries, summary)
		}
	}

	return summaries, nil
}

// RegenerateCampaignSummary regenerates the entire campaign summary from scratch
func (s *CampaignSummaryService) RegenerateCampaignSummary(ctx context.Context, campaignID string) error {
	campaign, err := s.getCampaignByID(ctx, campaignID)
	if err != nil {
		return err
	}

	summary := &db.CampaignSummary{
		CampaignID: campaignID,
		UserID:     campaign.UserID,
	}

	// Generate summaries for all content types
	contentTypes := []string{"npcs", "locations", "quests", "monsters", "items", "encounters", "rumors", "dialogues", "campaign_content"}
	for _, contentType := range contentTypes {
		sectionSummary, err := s.GenerateSectionSummary(ctx, campaignID, campaign.UserID, contentType)
		if err != nil {
			return err
		}
		if err := s.updateSectionSummaries(summary, contentType, sectionSummary); err != nil {
			return err
		}
	}

	// Generate overall summaries
	if err := s.generateOverallSummaries(ctx, summary, campaign); err != nil {
		return err
	}

	// Update content stats
	if err := s.updateContentStats(ctx, summary, campaign.UserID, campaignID); err != nil {
		return err
	}

	// Save summary to database
	s.logger.Info("Saving campaign summary to database",
		zap.String("campaign_id", campaignID),
		zap.Bool("has_overview", summary.Overview != nil),
		zap.Bool("has_setting", summary.SettingSummary != nil),
		zap.Bool("has_characters", summary.CharactersSummary != nil),
		zap.Bool("has_plot", summary.PlotSummary != nil))

	if err = s.database.UpsertCampaignSummary(ctx, summary); err != nil {
		s.logger.Error("Failed to save campaign summary to database",
			zap.String("campaign_id", campaignID),
			zap.Error(err))
		return err
	}

	s.logger.Info("Successfully saved campaign summary to database",
		zap.String("campaign_id", campaignID))
	return nil
}

// Helper methods for summarization

func (s *CampaignSummaryService) getCampaignByID(ctx context.Context, campaignID string) (*db.Campaign, error) {
	campaign, err := s.database.GetCampaignByID(ctx, campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("campaign not found: %s", campaignID)
		}
		return nil, fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}
	return campaign, nil
}

func (s *CampaignSummaryService) updateSectionSummaries(summary *db.CampaignSummary, contentType string, summaries []string) error {
	var sectionSummaries db.SectionSummaries
	if summary.SectionSummaries != nil {
		if err := json.Unmarshal(summary.SectionSummaries, &sectionSummaries); err != nil {
			return err
		}
	}

	switch contentType {
	case "npcs":
		sectionSummaries.NPCs = summaries
	case "locations":
		sectionSummaries.Locations = summaries
	case "quests":
		sectionSummaries.Quests = summaries
	case "monsters":
		sectionSummaries.Monsters = summaries
	case "items":
		sectionSummaries.Items = summaries
	case "encounters":
		sectionSummaries.Encounters = summaries
	case "rumors":
		sectionSummaries.Rumors = summaries
	case "campaign_content":
		sectionSummaries.CampaignContent = summaries
	}

	data, err := json.Marshal(sectionSummaries)
	if err != nil {
		return err
	}
	summary.SectionSummaries = data
	return nil
}

func (s *CampaignSummaryService) updateContentStats(ctx context.Context, summary *db.CampaignSummary, userID, campaignID string) error {
	stats := db.ContentStats{}

	// Count NPCs
	if npcs, err := s.database.ListNPCsByUserID(ctx, userID, &campaignID); err == nil {
		stats.NPCs = len(npcs)
	}

	// Count Locations
	if locations, err := s.database.ListLocationsByUserID(ctx, userID, &campaignID); err == nil {
		stats.Locations = len(locations)
	}

	// Count Quests
	if quests, err := s.database.ListQuestsByUserID(ctx, userID, &campaignID); err == nil {
		stats.Quests = len(quests)
	}

	// Count Monsters
	if monsters, err := s.database.ListMonstersByUserID(ctx, userID, &campaignID); err == nil {
		stats.Monsters = len(monsters)
	}

	// Count Items
	if items, err := s.database.ListItemsByUserID(ctx, userID, &campaignID); err == nil {
		stats.Items = len(items)
	}

	// Count Encounters
	if encounters, err := s.database.ListEncountersByUserID(ctx, userID, &campaignID); err == nil {
		stats.Encounters = len(encounters)
	}

	// Count Rumors
	if rumors, err := s.database.ListRumorsByUserID(ctx, userID, &campaignID); err == nil {
		stats.Rumors = len(rumors)
	}

	// Count Campaign Content (sessions, notes, etc.)
	if contents, err := s.getCampaignContents(ctx, campaignID, userID); err == nil {
		stats.CampaignContent = len(contents)
	}

	data, err := json.Marshal(stats)
	if err != nil {
		return err
	}
	summary.ContentStats = data
	return nil
}

func (s *CampaignSummaryService) generateOverallSummaries(ctx context.Context, summary *db.CampaignSummary, campaign *db.Campaign) error {
	// Parse section summaries
	var sectionSummaries db.SectionSummaries
	if summary.SectionSummaries != nil {
		if err := json.Unmarshal(summary.SectionSummaries, &sectionSummaries); err != nil {
			return err
		}
	}

	// Use AI service to generate intelligent summaries
	s.logger.Info("Calling AI service for campaign summary", zap.String("campaign_id", campaign.ID))
	aiSummary, err := s.generateAISummary(ctx, campaign, &sectionSummaries)
	if err != nil {
		s.logger.Warn("AI service call failed, using fallback text summaries",
			zap.String("campaign_id", campaign.ID),
			zap.Error(err))
		// Fall back to simple text-based summaries if AI fails
		overview := s.generateOverview(campaign, &sectionSummaries)
		summary.Overview = &overview

		settingSummary := s.generateSettingSummary(campaign, sectionSummaries.Locations)
		summary.SettingSummary = &settingSummary

		charactersSummary := s.generateCharactersSummary(sectionSummaries.NPCs)
		summary.CharactersSummary = &charactersSummary

		plotSummary := s.generatePlotSummary(sectionSummaries.Quests, sectionSummaries.Rumors)
		summary.PlotSummary = &plotSummary

		toneSummary := s.generateToneSummary(campaign)
		summary.ToneSummary = &toneSummary
	} else {
		s.logger.Info("Successfully generated AI summaries", zap.String("campaign_id", campaign.ID))
		// Use AI-generated summaries
		summary.Overview = &aiSummary.Overview
		summary.SettingSummary = &aiSummary.SettingSummary
		summary.CharactersSummary = &aiSummary.CharactersSummary
		summary.PlotSummary = &aiSummary.PlotSummary
		summary.ToneSummary = &aiSummary.ToneSummary

		// Log the summaries being saved
		s.logger.Debug("Storing AI-generated summaries",
			zap.String("overview_preview", truncateString(aiSummary.Overview, 100)),
			zap.String("setting_preview", truncateString(aiSummary.SettingSummary, 100)),
			zap.String("characters_preview", truncateString(aiSummary.CharactersSummary, 100)),
		)
	}

	return nil
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// generateAISummary calls the AI service to generate intelligent campaign summaries
func (s *CampaignSummaryService) generateAISummary(ctx context.Context, campaign *db.Campaign, sections *db.SectionSummaries) (*AICampaignSummary, error) {
	// Build structured campaign content for AI - limit size to avoid overwhelming the AI
	var campaignContentData []map[string]interface{}
	totalContentSize := 0
	const maxTotalContentSize = 500000 // Limit total content to 500KB (allows for substantial documentation)
	const maxItemSize = 30000          // Limit each item to 30KB (allows for full session notes/overviews)

	for _, item := range s.campaignContentItems {
		if totalContentSize >= maxTotalContentSize {
			s.logger.Debug("Reached max content size, truncating remaining items")
			break
		}

		// Skip image files, maps, and art
		if item.FileName != nil {
			fileName := strings.ToLower(*item.FileName)
			if strings.HasSuffix(fileName, ".png") ||
				strings.HasSuffix(fileName, ".jpg") ||
				strings.HasSuffix(fileName, ".jpeg") ||
				strings.HasSuffix(fileName, ".gif") ||
				strings.HasSuffix(fileName, ".webp") ||
				strings.HasSuffix(fileName, ".svg") {
				s.logger.Debug("Skipping image file", zap.String("file", *item.FileName))
				continue
			}
		}

		// Skip if type is map or art
		itemType := strings.ToLower(item.Type)
		if itemType == "map" || itemType == "art" || itemType == "image" {
			s.logger.Debug("Skipping art/map content", zap.String("type", item.Type), zap.String("title", item.Title))
			continue
		}

		// Truncate content to reasonable size
		content := item.Content
		if len(content) > maxItemSize {
			content = content[:maxItemSize] + "..."
		}

		// Skip if content looks like binary data or base64 encoded images
		if strings.Contains(content, "data:image") || strings.Contains(content, ";base64,") {
			s.logger.Debug("Skipping binary/image content", zap.String("title", item.Title))
			continue
		}

		contentMap := map[string]interface{}{
			"section": item.Section,
			"title":   item.Title,
			"content": content,
		}
		if item.Subsection != nil {
			contentMap["subsection"] = *item.Subsection
		}

		totalContentSize += len(content)
		campaignContentData = append(campaignContentData, contentMap)
	}

	s.logger.Debug("Prepared campaign content for AI",
		zap.Int("items_count", len(campaignContentData)),
		zap.Int("total_size", totalContentSize))

	// Build request payload
	payload := map[string]interface{}{
		"campaign": map[string]interface{}{
			"name":        campaign.Name,
			"game_system": campaign.GameSystem,
			"theme":       campaign.Theme,
			"tone":        campaign.Tone,
			"magic_level": campaign.MagicLevel,
		},
		"section_summaries": map[string]interface{}{
			"npcs":      strings.Join(sections.NPCs, "; "),
			"locations": strings.Join(sections.Locations, "; "),
			"quests":    strings.Join(sections.Quests, "; "),
			"items":     strings.Join(sections.Items, "; "),
			"monsters":  strings.Join(sections.Monsters, "; "),
		},
		"campaign_content": campaignContentData,
	}

	// Log what we're sending to AI service
	s.logger.Info("Sending payload to AI service",
		zap.String("campaign_name", campaign.Name),
		zap.Int("npcs_count", len(sections.NPCs)),
		zap.Int("locations_count", len(sections.Locations)),
		zap.Int("quests_count", len(sections.Quests)),
		zap.Int("items_count", len(sections.Items)),
		zap.Int("monsters_count", len(sections.Monsters)),
		zap.Int("campaign_content_count", len(sections.CampaignContent)),
	)

	// Call AI service
	s.logger.Debug("About to call AI service endpoint", zap.String("endpoint", "/api/v1/summarize/campaign"))
	var result AICampaignSummary
	err := s.aiClient.Post(ctx, "/api/v1/summarize/campaign", payload, &result)
	if err != nil {
		s.logger.Error("AI service Post() call returned error", zap.Error(err))
		return nil, fmt.Errorf("AI service call failed: %w", err)
	}
	s.logger.Debug("AI service call completed successfully")

	return &result, nil
}

// AICampaignSummary represents the AI-generated campaign summary
type AICampaignSummary struct {
	Overview          string `json:"overview"`
	SettingSummary    string `json:"setting_summary"`
	CharactersSummary string `json:"characters_summary"`
	PlotSummary       string `json:"plot_summary"`
	ToneSummary       string `json:"tone_summary"`
}

// Simple text-based summarization methods (can be enhanced with AI later)

func (s *CampaignSummaryService) summarizeNPC(npc *db.NPC) string {
	parts := []string{npc.Name}
	if npc.Race != nil {
		parts = append(parts, *npc.Race)
	}
	if npc.Class != nil {
		parts = append(parts, *npc.Class)
	}
	if npc.Personality != nil {
		parts = append(parts, fmt.Sprintf("(%s)", *npc.Personality))
	}
	return strings.Join(parts, " ")
}

func (s *CampaignSummaryService) summarizeLocation(location *db.Location) string {
	return fmt.Sprintf("%s (%s)", location.Name, location.Type)
}

func (s *CampaignSummaryService) summarizeQuest(quest *db.Quest) string {
	return fmt.Sprintf("%s [%s]", quest.Title, quest.Type)
}

func (s *CampaignSummaryService) summarizeMonster(monster *db.Monster) string {
	return fmt.Sprintf("%s (CR %.1f)", monster.Name, monster.CR)
}

func (s *CampaignSummaryService) summarizeItem(item *db.Item) string {
	if item.Rarity != nil {
		return fmt.Sprintf("%s (%s %s)", item.Name, *item.Rarity, item.Type)
	}
	return fmt.Sprintf("%s (%s)", item.Name, item.Type)
}

func (s *CampaignSummaryService) summarizeEncounter(encounter *db.Encounter) string {
	return fmt.Sprintf("%s (%s, level %d)", encounter.Name, encounter.Difficulty, encounter.PartyLevel)
}

func (s *CampaignSummaryService) summarizeRumor(rumor *db.Rumor) string {
	truncated := rumor.Text
	if len(truncated) > 100 {
		truncated = truncated[:97] + "..."
	}
	return truncated
}

func (s *CampaignSummaryService) summarizeDialogue(dialogue *db.Dialogue) string {
	mood := ""
	if dialogue.Mood != nil {
		mood = fmt.Sprintf(" (%s)", *dialogue.Mood)
	}
	return fmt.Sprintf("%s dialogue%s", dialogue.CharacterName, mood)
}

func (s *CampaignSummaryService) generateOverview(campaign *db.Campaign, summaries *db.SectionSummaries) string {
	return fmt.Sprintf("A %s campaign named '%s'", campaign.GameSystem, campaign.Name)
}

// getCampaignContents retrieves all campaign_content entries for a campaign
func (s *CampaignSummaryService) getCampaignContents(ctx context.Context, campaignID, userID string) ([]CampaignContentItem, error) {
	// Use the Database interface method instead of direct DB access
	contents, err := s.database.GetCampaignContentByCampaignID(ctx, campaignID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign contents: %w", err)
	}

	// Convert to CampaignContentItem
	items := make([]CampaignContentItem, 0, len(contents))
	for _, content := range contents {
		items = append(items, CampaignContentItem{
			ID:         content.ID,
			CampaignID: content.CampaignID,
			UserID:     content.UserID,
			Section:    content.Section,
			Subsection: content.Subsection,
			Title:      content.Title,
			Content:    content.Content,
			Type:       content.Type,
			FileName:   content.FileName,
			CreatedAt:  content.CreatedAt,
			UpdatedAt:  content.UpdatedAt,
		})
	}
	return items, nil
}

// CampaignContentItem represents a campaign content entry
type CampaignContentItem struct {
	ID         string
	CampaignID string
	UserID     string
	Section    string
	Subsection *string
	Title      string
	Content    string
	Type       string
	FileName   *string
	CreatedAt  string
	UpdatedAt  string
}

// summarizeCampaignContent creates a summary for a campaign content item
func (s *CampaignSummaryService) summarizeCampaignContent(content CampaignContentItem) string {
	parts := []string{fmt.Sprintf("[%s]", content.Section)}

	if content.Subsection != nil && *content.Subsection != "" {
		parts = append(parts, fmt.Sprintf("(%s)", *content.Subsection))
	}

	parts = append(parts, content.Title)

	// Truncate content if it's too long (for summary display, not AI processing)
	contentPreview := content.Content
	if len(contentPreview) > 1000 {
		contentPreview = contentPreview[:1000] + "..."
	}
	parts = append(parts, "-", contentPreview)

	return strings.Join(parts, " ")
}

func (s *CampaignSummaryService) generateSettingSummary(campaign *db.Campaign, locations []string) string {
	parts := []string{}
	if campaign.Theme != nil {
		parts = append(parts, fmt.Sprintf("Theme: %s", *campaign.Theme))
	}
	if campaign.MagicLevel != nil {
		parts = append(parts, fmt.Sprintf("Magic Level: %s", *campaign.MagicLevel))
	}
	if len(locations) > 0 {
		parts = append(parts, fmt.Sprintf("Key Locations: %s", strings.Join(locations[:minInt(3, len(locations))], ", ")))
	}
	return strings.Join(parts, ". ")
}

func (s *CampaignSummaryService) generateCharactersSummary(npcs []string) string {
	if len(npcs) == 0 {
		return "No major NPCs yet"
	}
	return fmt.Sprintf("Key Characters: %s", strings.Join(npcs[:minInt(5, len(npcs))], ", "))
}

func (s *CampaignSummaryService) generatePlotSummary(quests []string, rumors []string) string {
	if len(quests) == 0 {
		return "Campaign plot is still developing"
	}
	return fmt.Sprintf("Active Storylines: %s", strings.Join(quests[:minInt(3, len(quests))], "; "))
}

func (s *CampaignSummaryService) generateToneSummary(campaign *db.Campaign) string {
	parts := []string{}
	if campaign.Tone != nil {
		parts = append(parts, fmt.Sprintf("Tone: %s", *campaign.Tone))
	}
	if campaign.Theme != nil {
		parts = append(parts, fmt.Sprintf("Theme: %s", *campaign.Theme))
	}
	if len(parts) == 0 {
		return "Campaign atmosphere is being established"
	}
	return strings.Join(parts, ". ")
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
