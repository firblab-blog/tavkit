package db

import (
	"context"
)

// campaignsOps returns a CampaignsOperations instance for this database.
func (s *SQLiteDB) campaignsOps() *CampaignsOperations {
	return NewCampaignsOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// CAMPAIGN SUMMARY OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return s.campaignsOps().CreateCampaignSummary(ctx, summary)
}

func (s *SQLiteDB) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	return s.campaignsOps().GetCampaignSummaryByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return s.campaignsOps().UpdateCampaignSummary(ctx, summary)
}

func (s *SQLiteDB) DeleteCampaignSummary(ctx context.Context, campaignID string) error {
	return s.campaignsOps().DeleteCampaignSummary(ctx, campaignID)
}

func (s *SQLiteDB) UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return s.campaignsOps().UpsertCampaignSummary(ctx, summary)
}

// ============================================================================
// CAMPAIGN CRUD OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateCampaign(ctx context.Context, campaign *Campaign) error {
	return s.campaignsOps().CreateCampaign(ctx, campaign)
}

func (s *SQLiteDB) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
	return s.campaignsOps().GetCampaignByID(ctx, id)
}

func (s *SQLiteDB) ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error) {
	return s.campaignsOps().ListCampaignsByUserID(ctx, userID)
}

func (s *SQLiteDB) UpdateCampaign(ctx context.Context, campaign *Campaign) error {
	return s.campaignsOps().UpdateCampaign(ctx, campaign)
}

func (s *SQLiteDB) DeleteCampaign(ctx context.Context, id string) error {
	return s.campaignsOps().DeleteCampaign(ctx, id)
}

func (s *SQLiteDB) GetCampaigns(ctx context.Context) ([]*Campaign, error) {
	return s.campaignsOps().GetCampaigns(ctx)
}

func (s *SQLiteDB) GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error) {
	return s.campaignsOps().GetCampaignByIDAndUserID(ctx, id, userID)
}

// ============================================================================
// CAMPAIGN CONTENT OPERATIONS
// ============================================================================

func (s *SQLiteDB) GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error) {
	return s.campaignsOps().GetCampaignContentByCampaignID(ctx, campaignID, userID)
}

func (s *SQLiteDB) GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error) {
	return s.campaignsOps().GetCampaignContentBySection(ctx, campaignID, userID, section, subsection)
}

func (s *SQLiteDB) CreateCampaignContent(ctx context.Context, content *CampaignContent) error {
	return s.campaignsOps().CreateCampaignContent(ctx, content)
}

func (s *SQLiteDB) GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error) {
	return s.campaignsOps().GetCampaignContentByID(ctx, id)
}

func (s *SQLiteDB) UpdateCampaignContent(ctx context.Context, content *CampaignContent) error {
	return s.campaignsOps().UpdateCampaignContent(ctx, content)
}

func (s *SQLiteDB) DeleteCampaignContent(ctx context.Context, id string) error {
	return s.campaignsOps().DeleteCampaignContent(ctx, id)
}

// ============================================================================
// CAMPAIGN CONTENT STATUS OPERATIONS
// ============================================================================

func (s *SQLiteDB) UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error {
	return s.campaignsOps().UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error) {
	return s.campaignsOps().GetCampaignContentStatus(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) ListCampaignContentStatus(ctx context.Context, campaignID string, contentType *string) ([]*CampaignContentStatus, error) {
	return s.campaignsOps().ListCampaignContentStatus(ctx, campaignID, contentType)
}

func (s *SQLiteDB) DeleteCampaignContentStatus(ctx context.Context, id string) error {
	return s.campaignsOps().DeleteCampaignContentStatus(ctx, id)
}

// Convenience methods for marking content status
func (s *SQLiteDB) MarkContentDefeated(ctx context.Context, campaignID string, contentType string, contentID string) error {
	return s.campaignsOps().MarkContentDefeated(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) MarkContentVisited(ctx context.Context, campaignID string, contentID string) error {
	return s.campaignsOps().MarkContentVisited(ctx, campaignID, contentID)
}

func (s *SQLiteDB) MarkContentObtained(ctx context.Context, campaignID string, contentID string) error {
	return s.campaignsOps().MarkContentObtained(ctx, campaignID, contentID)
}

func (s *SQLiteDB) MarkContentHeard(ctx context.Context, campaignID string, contentID string) error {
	return s.campaignsOps().MarkContentHeard(ctx, campaignID, contentID)
}

func (s *SQLiteDB) MarkContentTriggered(ctx context.Context, campaignID string, contentID string) error {
	return s.campaignsOps().MarkContentTriggered(ctx, campaignID, contentID)
}

func (s *SQLiteDB) MarkContentEncountered(ctx context.Context, campaignID string, contentID string) error {
	return s.campaignsOps().MarkContentEncountered(ctx, campaignID, contentID)
}

func (s *SQLiteDB) MarkContentCompleted(ctx context.Context, campaignID string, contentType string, contentID string) error {
	return s.campaignsOps().MarkContentCompleted(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) UpdateRelationshipNotes(ctx context.Context, campaignID string, npcID string, notes string) error {
	return s.campaignsOps().UpdateRelationshipNotes(ctx, campaignID, npcID, notes)
}

// ============================================================================
// CAMPAIGN FACT CACHE OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateFactCache(ctx context.Context, cache *CampaignFactCache) error {
	return s.campaignsOps().CreateFactCache(ctx, cache)
}

func (s *SQLiteDB) GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error) {
	return s.campaignsOps().GetFactCache(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error) {
	return s.campaignsOps().ListFactCacheByCampaign(ctx, campaignID)
}

func (s *SQLiteDB) UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error {
	return s.campaignsOps().UpsertFactCache(ctx, cache)
}

func (s *SQLiteDB) DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error {
	return s.campaignsOps().DeleteFactCacheByContent(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error {
	return s.campaignsOps().DeleteFactCacheByCampaign(ctx, campaignID)
}

// ============================================================================
// SUMMARY GENERATION JOB OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	return s.campaignsOps().CreateSummaryJob(ctx, job)
}

func (s *SQLiteDB) GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error) {
	return s.campaignsOps().GetSummaryJob(ctx, id)
}

func (s *SQLiteDB) UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	return s.campaignsOps().UpdateSummaryJob(ctx, job)
}

func (s *SQLiteDB) GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error) {
	return s.campaignsOps().GetActiveSummaryJobForCampaign(ctx, campaignID)
}

func (s *SQLiteDB) DeleteSummaryJob(ctx context.Context, id string) error {
	return s.campaignsOps().DeleteSummaryJob(ctx, id)
}
