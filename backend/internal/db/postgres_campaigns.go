package db

import (
	"context"
)

// campaignsOps returns a CampaignsOperations instance for this database.
func (db *PostgresDB) campaignsOps() *CampaignsOperations {
	return NewCampaignsOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// CAMPAIGN CRUD OPERATIONS
// ============================================================================

func (db *PostgresDB) GetCampaigns(ctx context.Context) ([]*Campaign, error) {
	return db.campaignsOps().GetCampaigns(ctx)
}

func (db *PostgresDB) CreateCampaign(ctx context.Context, campaign *Campaign) error {
	return db.campaignsOps().CreateCampaign(ctx, campaign)
}

func (db *PostgresDB) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
	return db.campaignsOps().GetCampaignByID(ctx, id)
}

func (db *PostgresDB) ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error) {
	return db.campaignsOps().ListCampaignsByUserID(ctx, userID)
}

func (db *PostgresDB) UpdateCampaign(ctx context.Context, campaign *Campaign) error {
	return db.campaignsOps().UpdateCampaign(ctx, campaign)
}

func (db *PostgresDB) DeleteCampaign(ctx context.Context, id string) error {
	return db.campaignsOps().DeleteCampaign(ctx, id)
}

func (db *PostgresDB) GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error) {
	return db.campaignsOps().GetCampaignByIDAndUserID(ctx, id, userID)
}

// ============================================================================
// CAMPAIGN CONTENT OPERATIONS
// ============================================================================

func (db *PostgresDB) GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error) {
	return db.campaignsOps().GetCampaignContentByCampaignID(ctx, campaignID, userID)
}

func (db *PostgresDB) GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error) {
	return db.campaignsOps().GetCampaignContentBySection(ctx, campaignID, userID, section, subsection)
}

func (db *PostgresDB) CreateCampaignContent(ctx context.Context, content *CampaignContent) error {
	return db.campaignsOps().CreateCampaignContent(ctx, content)
}

func (db *PostgresDB) GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error) {
	return db.campaignsOps().GetCampaignContentByID(ctx, id)
}

func (db *PostgresDB) UpdateCampaignContent(ctx context.Context, content *CampaignContent) error {
	return db.campaignsOps().UpdateCampaignContent(ctx, content)
}

func (db *PostgresDB) DeleteCampaignContent(ctx context.Context, id string) error {
	return db.campaignsOps().DeleteCampaignContent(ctx, id)
}

// ============================================================================
// CAMPAIGN SUMMARY OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return db.campaignsOps().CreateCampaignSummary(ctx, summary)
}

func (db *PostgresDB) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	return db.campaignsOps().GetCampaignSummaryByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return db.campaignsOps().UpdateCampaignSummary(ctx, summary)
}

func (db *PostgresDB) DeleteCampaignSummary(ctx context.Context, campaignID string) error {
	return db.campaignsOps().DeleteCampaignSummary(ctx, campaignID)
}

func (db *PostgresDB) UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	return db.campaignsOps().UpsertCampaignSummary(ctx, summary)
}

// ============================================================================
// CAMPAIGN FACT CACHE OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateFactCache(ctx context.Context, cache *CampaignFactCache) error {
	return db.campaignsOps().CreateFactCache(ctx, cache)
}

func (db *PostgresDB) GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error) {
	return db.campaignsOps().GetFactCache(ctx, campaignID, contentType, contentID)
}

func (db *PostgresDB) ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error) {
	return db.campaignsOps().ListFactCacheByCampaign(ctx, campaignID)
}

func (db *PostgresDB) UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error {
	return db.campaignsOps().UpsertFactCache(ctx, cache)
}

func (db *PostgresDB) DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error {
	return db.campaignsOps().DeleteFactCacheByContent(ctx, campaignID, contentType, contentID)
}

func (db *PostgresDB) DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error {
	return db.campaignsOps().DeleteFactCacheByCampaign(ctx, campaignID)
}

// ============================================================================
// SUMMARY GENERATION JOB OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	return db.campaignsOps().CreateSummaryJob(ctx, job)
}

func (db *PostgresDB) GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error) {
	return db.campaignsOps().GetSummaryJob(ctx, id)
}

func (db *PostgresDB) UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	return db.campaignsOps().UpdateSummaryJob(ctx, job)
}

func (db *PostgresDB) GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error) {
	return db.campaignsOps().GetActiveSummaryJobForCampaign(ctx, campaignID)
}

func (db *PostgresDB) DeleteSummaryJob(ctx context.Context, id string) error {
	return db.campaignsOps().DeleteSummaryJob(ctx, id)
}
