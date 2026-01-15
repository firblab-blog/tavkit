package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// CampaignsOperations provides unified campaign operations.
type CampaignsOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewCampaignsOperations creates a new CampaignsOperations.
func NewCampaignsOperations(exec Executor, qb *QueryBuilder) *CampaignsOperations {
	return &CampaignsOperations{exec: exec, qb: qb}
}

// ============================================================================
// HELPER TYPES
// ============================================================================

// CampaignScanFields holds nullable fields for campaign scanning.
type CampaignScanFields struct {
	Description, Theme, Tone, History, MagicLevel, TechLevel, Notes sql.NullString
	Setting, Factions                                               sql.NullString
}

// PopulateCampaign populates campaign fields from scan fields.
func PopulateCampaign(campaign *Campaign, fields *CampaignScanFields) {
	if fields.Description.Valid {
		campaign.Description = &fields.Description.String
	}
	if fields.Theme.Valid {
		campaign.Theme = &fields.Theme.String
	}
	if fields.Tone.Valid {
		campaign.Tone = &fields.Tone.String
	}
	if fields.History.Valid {
		campaign.History = &fields.History.String
	}
	if fields.MagicLevel.Valid {
		campaign.MagicLevel = &fields.MagicLevel.String
	}
	if fields.TechLevel.Valid {
		campaign.TechLevel = &fields.TechLevel.String
	}
	if fields.Notes.Valid {
		campaign.Notes = &fields.Notes.String
	}
	if fields.Setting.Valid && fields.Setting.String != "" {
		campaign.Setting = json.RawMessage(fields.Setting.String)
	}
	if fields.Factions.Valid && fields.Factions.String != "" {
		campaign.Factions = json.RawMessage(fields.Factions.String)
	}
}

// ============================================================================
// CAMPAIGN SUMMARY OPERATIONS
// ============================================================================

// CreateCampaignSummary creates a new campaign summary.
func (ops *CampaignsOperations) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	summary.CreatedAt = time.Now()
	summary.UpdatedAt = time.Now()

	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(13) + `)`

	_, err := ops.exec.Exec(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.Version, summary.CreatedAt, summary.UpdatedAt)
	return err
}

// GetCampaignSummaryByCampaignID retrieves a campaign summary by campaign ID.
func (ops *CampaignsOperations) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	summary := &CampaignSummary{}
	query := `SELECT id, campaign_id, user_id, overview, setting_summary, characters_summary,
		  plot_summary, tone_summary, content_stats, section_summaries, version,
		  created_at, updated_at
		  FROM campaign_summaries WHERE campaign_id = ` + ops.qb.Placeholder(1)

	var contentStats, sectionSummaries sql.NullString
	err := ops.exec.QueryRow(ctx, query, campaignID).Scan(
		&summary.ID, &summary.CampaignID, &summary.UserID, &summary.Overview, &summary.SettingSummary,
		&summary.CharactersSummary, &summary.PlotSummary, &summary.ToneSummary, &contentStats,
		&sectionSummaries, &summary.Version, &summary.CreatedAt, &summary.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if contentStats.Valid {
		summary.ContentStats = []byte(contentStats.String)
	}
	if sectionSummaries.Valid {
		summary.SectionSummaries = []byte(sectionSummaries.String)
	}

	return summary, nil
}

// UpdateCampaignSummary updates an existing campaign summary.
func (ops *CampaignsOperations) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	summary.UpdatedAt = time.Now()
	summary.Version++

	query := `UPDATE campaign_summaries
		  SET overview = ` + ops.qb.Placeholder(1) + `, setting_summary = ` + ops.qb.Placeholder(2) + `,
		      characters_summary = ` + ops.qb.Placeholder(3) + `, plot_summary = ` + ops.qb.Placeholder(4) + `,
		      tone_summary = ` + ops.qb.Placeholder(5) + `, content_stats = ` + ops.qb.Placeholder(6) + `,
		      section_summaries = ` + ops.qb.Placeholder(7) + `, version = ` + ops.qb.Placeholder(8) + `,
		      updated_at = ` + ops.qb.Placeholder(9) + `
		  WHERE campaign_id = ` + ops.qb.Placeholder(10)

	_, err := ops.exec.Exec(ctx, query,
		summary.Overview, summary.SettingSummary, summary.CharactersSummary, summary.PlotSummary,
		summary.ToneSummary, summary.ContentStats, summary.SectionSummaries, summary.Version,
		summary.UpdatedAt, summary.CampaignID)
	return err
}

// DeleteCampaignSummary deletes a campaign summary.
func (ops *CampaignsOperations) DeleteCampaignSummary(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_summaries WHERE campaign_id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, campaignID)
	return err
}

// ============================================================================
// CAMPAIGN FACT CACHE OPERATIONS
// ============================================================================

// CreateFactCache creates a new fact cache entry.
func (ops *CampaignsOperations) CreateFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES (` + ops.qb.Placeholders(7) + `)`

	_, err := ops.exec.Exec(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

// GetFactCache retrieves a fact cache entry.
func (ops *CampaignsOperations) GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error) {
	cache := &CampaignFactCache{}
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND content_type = ` + ops.qb.Placeholder(2) + ` AND content_id = ` + ops.qb.Placeholder(3)

	var facts sql.NullString
	err := ops.exec.QueryRow(ctx, query, campaignID, contentType, contentID).Scan(
		&cache.ID, &cache.CampaignID, &cache.ContentType, &cache.ContentID,
		&cache.ContentHash, &facts, &cache.ExtractedAt)

	if err != nil {
		return nil, err
	}

	if facts.Valid {
		cache.Facts = []byte(facts.String)
	}

	return cache, nil
}

// ListFactCacheByCampaign lists all fact cache entries for a campaign.
func (ops *CampaignsOperations) ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error) {
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + `
		  ORDER BY content_type, extracted_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var caches []*CampaignFactCache
	for rows.Next() {
		cache := &CampaignFactCache{}
		var facts sql.NullString

		err := rows.Scan(
			&cache.ID, &cache.CampaignID, &cache.ContentType, &cache.ContentID,
			&cache.ContentHash, &facts, &cache.ExtractedAt)
		if err != nil {
			return nil, err
		}

		if facts.Valid {
			cache.Facts = []byte(facts.String)
		}

		caches = append(caches, cache)
	}

	return caches, rows.Err()
}

// UpsertFactCache creates or updates a fact cache entry.
func (ops *CampaignsOperations) UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES (` + ops.qb.Placeholders(7) + `)
		  ON CONFLICT(campaign_id, content_type, content_id) DO UPDATE SET
		   content_hash = ` + ops.qb.ExcludedCol("content_hash") + `,
		   facts = ` + ops.qb.ExcludedCol("facts") + `,
		   extracted_at = ` + ops.qb.ExcludedCol("extracted_at")

	_, err := ops.exec.Exec(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

// DeleteFactCacheByContent deletes a specific fact cache entry.
func (ops *CampaignsOperations) DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error {
	query := `DELETE FROM campaign_fact_cache
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND content_type = ` + ops.qb.Placeholder(2) + ` AND content_id = ` + ops.qb.Placeholder(3)
	_, err := ops.exec.Exec(ctx, query, campaignID, contentType, contentID)
	return err
}

// DeleteFactCacheByCampaign deletes all fact cache entries for a campaign.
func (ops *CampaignsOperations) DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_fact_cache WHERE campaign_id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, campaignID)
	return err
}

// ============================================================================
// SUMMARY GENERATION JOB OPERATIONS
// ============================================================================

// CreateSummaryJob creates a new summary generation job.
func (ops *CampaignsOperations) CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	if job.ID == "" {
		job.ID = generateUUID()
	}
	job.CreatedAt = time.Now()

	query := `INSERT INTO summary_generation_jobs
		  (id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		   progress_percent, error_message, started_at, completed_at, created_at)
		  VALUES (` + ops.qb.Placeholders(12) + `)`

	_, err := ops.exec.Exec(ctx, query,
		job.ID, job.CampaignID, job.UserID, job.Status, job.CurrentStage,
		job.CurrentBatch, job.TotalBatches, job.ProgressPercent, job.ErrorMessage,
		job.StartedAt, job.CompletedAt, job.CreatedAt)
	return err
}

// GetSummaryJob retrieves a summary generation job by ID.
func (ops *CampaignsOperations) GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE id = ` + ops.qb.Placeholder(1)

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&job.ID, &job.CampaignID, &job.UserID, &job.Status, &currentStage,
		&job.CurrentBatch, &job.TotalBatches, &job.ProgressPercent, &errorMessage,
		&startedAt, &completedAt, &job.CreatedAt)

	if err != nil {
		return nil, err
	}

	if currentStage.Valid {
		job.CurrentStage = &currentStage.String
	}
	if errorMessage.Valid {
		job.ErrorMessage = &errorMessage.String
	}
	if startedAt.Valid {
		job.StartedAt = &startedAt.Time
	}
	if completedAt.Valid {
		job.CompletedAt = &completedAt.Time
	}

	return job, nil
}

// UpdateSummaryJob updates a summary generation job.
func (ops *CampaignsOperations) UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	query := `UPDATE summary_generation_jobs
		  SET status = ` + ops.qb.Placeholder(1) + `, current_stage = ` + ops.qb.Placeholder(2) + `,
		      current_batch = ` + ops.qb.Placeholder(3) + `, total_batches = ` + ops.qb.Placeholder(4) + `,
		      progress_percent = ` + ops.qb.Placeholder(5) + `, error_message = ` + ops.qb.Placeholder(6) + `,
		      started_at = ` + ops.qb.Placeholder(7) + `, completed_at = ` + ops.qb.Placeholder(8) + `
		  WHERE id = ` + ops.qb.Placeholder(9)

	_, err := ops.exec.Exec(ctx, query,
		job.Status, job.CurrentStage, job.CurrentBatch, job.TotalBatches,
		job.ProgressPercent, job.ErrorMessage, job.StartedAt, job.CompletedAt,
		job.ID)
	return err
}

// GetActiveSummaryJobForCampaign retrieves an active summary job for a campaign.
func (ops *CampaignsOperations) GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND status NOT IN ('completed', 'failed')
		  ORDER BY created_at DESC
		  LIMIT 1`

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := ops.exec.QueryRow(ctx, query, campaignID).Scan(
		&job.ID, &job.CampaignID, &job.UserID, &job.Status, &currentStage,
		&job.CurrentBatch, &job.TotalBatches, &job.ProgressPercent, &errorMessage,
		&startedAt, &completedAt, &job.CreatedAt)

	if err != nil {
		return nil, err
	}

	if currentStage.Valid {
		job.CurrentStage = &currentStage.String
	}
	if errorMessage.Valid {
		job.ErrorMessage = &errorMessage.String
	}
	if startedAt.Valid {
		job.StartedAt = &startedAt.Time
	}
	if completedAt.Valid {
		job.CompletedAt = &completedAt.Time
	}

	return job, nil
}

// DeleteSummaryJob deletes a summary generation job.
func (ops *CampaignsOperations) DeleteSummaryJob(ctx context.Context, id string) error {
	query := `DELETE FROM summary_generation_jobs WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// CAMPAIGN CONTENT OPERATIONS
// ============================================================================

// CreateCampaignContent creates a new campaign content entry.
func (ops *CampaignsOperations) CreateCampaignContent(ctx context.Context, content *CampaignContent) error {
	if content.ID == "" {
		content.ID = generateUUID()
	}
	now := time.Now().Format(time.RFC3339)
	content.CreatedAt = now
	content.UpdatedAt = now

	query := `INSERT INTO campaign_content
		  (id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(12) + `)`

	_, err := ops.exec.Exec(ctx, query,
		content.ID, content.CampaignID, content.UserID, content.Section, content.Subsection,
		content.Title, content.Content, content.Type, content.FileName, content.Summary,
		content.CreatedAt, content.UpdatedAt)

	return err
}

// GetCampaignContentByID retrieves a campaign content entry by ID.
func (ops *CampaignsOperations) GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE id = ` + ops.qb.Placeholder(1)

	var content CampaignContent
	var subsection, fileName, summary sql.NullString
	var createdAt, updatedAt time.Time

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&content.ID,
		&content.CampaignID,
		&content.UserID,
		&content.Section,
		&subsection,
		&content.Title,
		&content.Content,
		&content.Type,
		&fileName,
		&summary,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return nil, err
	}

	content.CreatedAt = createdAt.Format(time.RFC3339)
	content.UpdatedAt = updatedAt.Format(time.RFC3339)

	if subsection.Valid {
		content.Subsection = &subsection.String
	}
	if fileName.Valid {
		content.FileName = &fileName.String
	}
	if summary.Valid {
		content.Summary = &summary.String
	}

	return &content, nil
}

// UpdateCampaignContent updates a campaign content entry.
func (ops *CampaignsOperations) UpdateCampaignContent(ctx context.Context, content *CampaignContent) error {
	content.UpdatedAt = time.Now().Format(time.RFC3339)

	query := `UPDATE campaign_content
		  SET title = ` + ops.qb.Placeholder(1) + `, content = ` + ops.qb.Placeholder(2) + `, updated_at = ` + ops.qb.Placeholder(3) + `
		  WHERE id = ` + ops.qb.Placeholder(4)

	_, err := ops.exec.Exec(ctx, query, content.Title, content.Content, content.UpdatedAt, content.ID)
	return err
}

// DeleteCampaignContent deletes a campaign content entry.
func (ops *CampaignsOperations) DeleteCampaignContent(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// GetCampaignContentByCampaignID retrieves all campaign_content entries for a campaign.
func (ops *CampaignsOperations) GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2) + `
		  ORDER BY section, subsection, created_at`

	rows, err := ops.exec.Query(ctx, query, campaignID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var contents []*CampaignContent
	for rows.Next() {
		var content CampaignContent
		var subsection, fileName, summary sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&content.ID,
			&content.CampaignID,
			&content.UserID,
			&content.Section,
			&subsection,
			&content.Title,
			&content.Content,
			&content.Type,
			&fileName,
			&summary,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, err
		}

		content.CreatedAt = createdAt.Format(time.RFC3339)
		content.UpdatedAt = updatedAt.Format(time.RFC3339)

		if subsection.Valid {
			content.Subsection = &subsection.String
		}
		if fileName.Valid {
			content.FileName = &fileName.String
		}
		if summary.Valid {
			content.Summary = &summary.String
		}

		contents = append(contents, &content)
	}

	return contents, rows.Err()
}

// GetCampaignContentBySection retrieves campaign_content entries filtered by section.
func (ops *CampaignsOperations) GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error) {
	var query string
	var args []interface{}

	if subsection != nil {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2) + ` AND section = ` + ops.qb.Placeholder(3) + ` AND subsection = ` + ops.qb.Placeholder(4) + `
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section, *subsection}
	} else {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2) + ` AND section = ` + ops.qb.Placeholder(3) + `
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section}
	}

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var contents []*CampaignContent
	for rows.Next() {
		var content CampaignContent
		var subsec, fileName, summary sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&content.ID,
			&content.CampaignID,
			&content.UserID,
			&content.Section,
			&subsec,
			&content.Title,
			&content.Content,
			&content.Type,
			&fileName,
			&summary,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, err
		}

		content.CreatedAt = createdAt.Format(time.RFC3339)
		content.UpdatedAt = updatedAt.Format(time.RFC3339)

		if subsec.Valid {
			content.Subsection = &subsec.String
		}
		if fileName.Valid {
			content.FileName = &fileName.String
		}
		if summary.Valid {
			content.Summary = &summary.String
		}

		contents = append(contents, &content)
	}

	return contents, rows.Err()
}

// UpsertCampaignSummary creates or updates a campaign summary.
func (ops *CampaignsOperations) UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	now := time.Now()
	summary.CreatedAt = now
	summary.UpdatedAt = now

	// Use ON CONFLICT for atomic upsert
	// PostgreSQL increments version in the DO UPDATE, SQLite sets it from excluded
	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(13) + `)
		  ON CONFLICT (campaign_id) DO UPDATE SET
		   overview = ` + ops.qb.ExcludedCol("overview") + `,
		   setting_summary = ` + ops.qb.ExcludedCol("setting_summary") + `,
		   characters_summary = ` + ops.qb.ExcludedCol("characters_summary") + `,
		   plot_summary = ` + ops.qb.ExcludedCol("plot_summary") + `,
		   tone_summary = ` + ops.qb.ExcludedCol("tone_summary") + `,
		   content_stats = ` + ops.qb.ExcludedCol("content_stats") + `,
		   section_summaries = ` + ops.qb.ExcludedCol("section_summaries") + `,
		   version = campaign_summaries.version + 1,
		   updated_at = ` + ops.qb.ExcludedCol("updated_at")

	_, err := ops.exec.Exec(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, 1, summary.CreatedAt, summary.UpdatedAt)
	return err
}

// ============================================================================
// CAMPAIGN CONTENT STATUS OPERATIONS
// ============================================================================

// UpsertCampaignContentStatus creates or updates a campaign content status.
func (ops *CampaignsOperations) UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error {
	if status.ID == "" {
		status.ID = generateUUID()
	}
	now := time.Now()
	status.CreatedAt = now
	status.UpdatedAt = now

	query := `INSERT INTO campaign_content_status
		  (id, campaign_id, content_type, content_id, defeated, visited, obtained,
		   heard, triggered, encountered, completed, relationship_notes, status_data,
		   notes, created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(16) + `)
		  ON CONFLICT(campaign_id, content_type, content_id) DO UPDATE SET
		   defeated = COALESCE(` + ops.qb.ExcludedCol("defeated") + `, campaign_content_status.defeated),
		   visited = COALESCE(` + ops.qb.ExcludedCol("visited") + `, campaign_content_status.visited),
		   obtained = COALESCE(` + ops.qb.ExcludedCol("obtained") + `, campaign_content_status.obtained),
		   heard = COALESCE(` + ops.qb.ExcludedCol("heard") + `, campaign_content_status.heard),
		   triggered = COALESCE(` + ops.qb.ExcludedCol("triggered") + `, campaign_content_status.triggered),
		   encountered = COALESCE(` + ops.qb.ExcludedCol("encountered") + `, campaign_content_status.encountered),
		   completed = COALESCE(` + ops.qb.ExcludedCol("completed") + `, campaign_content_status.completed),
		   relationship_notes = COALESCE(` + ops.qb.ExcludedCol("relationship_notes") + `, campaign_content_status.relationship_notes),
		   status_data = COALESCE(` + ops.qb.ExcludedCol("status_data") + `, campaign_content_status.status_data),
		   notes = COALESCE(` + ops.qb.ExcludedCol("notes") + `, campaign_content_status.notes),
		   updated_at = ` + ops.qb.ExcludedCol("updated_at")

	_, err := ops.exec.Exec(ctx, query,
		status.ID, status.CampaignID, status.ContentType, status.ContentID,
		status.Defeated, status.Visited, status.Obtained, status.Heard,
		status.Triggered, status.Encountered, status.Completed,
		status.RelationshipNotes, status.StatusData, status.Notes,
		status.CreatedAt, status.UpdatedAt)
	return err
}

// GetCampaignContentStatus retrieves a campaign content status.
func (ops *CampaignsOperations) GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error) {
	status := &CampaignContentStatus{}
	query := `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
		  heard, triggered, encountered, completed, relationship_notes, status_data,
		  notes, created_at, updated_at
		  FROM campaign_content_status
		  WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND content_type = ` + ops.qb.Placeholder(2) + ` AND content_id = ` + ops.qb.Placeholder(3)

	var relationshipNotes, statusData, notes sql.NullString
	err := ops.exec.QueryRow(ctx, query, campaignID, contentType, contentID).Scan(
		&status.ID, &status.CampaignID, &status.ContentType, &status.ContentID,
		&status.Defeated, &status.Visited, &status.Obtained, &status.Heard,
		&status.Triggered, &status.Encountered, &status.Completed,
		&relationshipNotes, &statusData, &notes,
		&status.CreatedAt, &status.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if relationshipNotes.Valid {
		status.RelationshipNotes = &relationshipNotes.String
	}
	if statusData.Valid {
		status.StatusData = []byte(statusData.String)
	}
	if notes.Valid {
		status.Notes = &notes.String
	}

	return status, nil
}

// ListCampaignContentStatus lists all campaign content statuses for a campaign.
func (ops *CampaignsOperations) ListCampaignContentStatus(ctx context.Context, campaignID string, contentType *string) ([]*CampaignContentStatus, error) {
	var query string
	var args []interface{}

	if contentType != nil {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND content_type = ` + ops.qb.Placeholder(2) + `
			 ORDER BY updated_at DESC`
		args = []interface{}{campaignID, *contentType}
	} else {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = ` + ops.qb.Placeholder(1) + `
			 ORDER BY content_type, updated_at DESC`
		args = []interface{}{campaignID}
	}

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var statuses []*CampaignContentStatus
	for rows.Next() {
		status := &CampaignContentStatus{}
		var relationshipNotes, statusData, notes sql.NullString

		err := rows.Scan(
			&status.ID, &status.CampaignID, &status.ContentType, &status.ContentID,
			&status.Defeated, &status.Visited, &status.Obtained, &status.Heard,
			&status.Triggered, &status.Encountered, &status.Completed,
			&relationshipNotes, &statusData, &notes,
			&status.CreatedAt, &status.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if relationshipNotes.Valid {
			status.RelationshipNotes = &relationshipNotes.String
		}
		if statusData.Valid {
			status.StatusData = []byte(statusData.String)
		}
		if notes.Valid {
			status.Notes = &notes.String
		}

		statuses = append(statuses, status)
	}

	return statuses, rows.Err()
}

// DeleteCampaignContentStatus deletes a campaign content status.
func (ops *CampaignsOperations) DeleteCampaignContentStatus(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content_status WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// CAMPAIGN CONTENT STATUS CONVENIENCE METHODS
// ============================================================================

// MarkContentDefeated marks content as defeated.
func (ops *CampaignsOperations) MarkContentDefeated(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Defeated:    true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentVisited marks a location as visited.
func (ops *CampaignsOperations) MarkContentVisited(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "location",
		ContentID:   contentID,
		Visited:     true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentObtained marks an item as obtained.
func (ops *CampaignsOperations) MarkContentObtained(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "item",
		ContentID:   contentID,
		Obtained:    true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentHeard marks a rumor as heard.
func (ops *CampaignsOperations) MarkContentHeard(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "rumor",
		ContentID:   contentID,
		Heard:       true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentTriggered marks a trap as triggered.
func (ops *CampaignsOperations) MarkContentTriggered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "trap",
		ContentID:   contentID,
		Triggered:   true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentEncountered marks a critter as encountered.
func (ops *CampaignsOperations) MarkContentEncountered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "critter",
		ContentID:   contentID,
		Encountered: true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// MarkContentCompleted marks content as completed.
func (ops *CampaignsOperations) MarkContentCompleted(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Completed:   true,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// UpdateRelationshipNotes updates relationship notes for an NPC.
func (ops *CampaignsOperations) UpdateRelationshipNotes(ctx context.Context, campaignID string, npcID string, notes string) error {
	status := &CampaignContentStatus{
		CampaignID:        campaignID,
		ContentType:       "npc",
		ContentID:         npcID,
		RelationshipNotes: &notes,
	}
	return ops.UpsertCampaignContentStatus(ctx, status)
}

// ============================================================================
// CORE CAMPAIGN CRUD OPERATIONS
// ============================================================================

// CreateCampaign creates a new campaign.
func (ops *CampaignsOperations) CreateCampaign(ctx context.Context, campaign *Campaign) error {
	if campaign.ID == "" {
		campaign.ID = generateUUID()
	}
	if campaign.Role == "" {
		campaign.Role = "owner"
	}
	campaign.CreatedAt = time.Now()
	campaign.UpdatedAt = time.Now()

	query := `INSERT INTO campaigns (id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, role, is_active, created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(17) + `)`

	_, err := ops.exec.Exec(ctx, query,
		campaign.ID,
		campaign.UserID,
		campaign.Name,
		campaign.Description,
		campaign.GameSystem,
		campaign.Theme,
		campaign.Tone,
		campaign.Setting,
		campaign.Factions,
		campaign.History,
		campaign.MagicLevel,
		campaign.TechLevel,
		campaign.Notes,
		campaign.Role,
		campaign.IsActive,
		campaign.CreatedAt,
		campaign.UpdatedAt,
	)
	return err
}

// GetCampaignByID retrieves a campaign by ID.
func (ops *CampaignsOperations) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
	var campaign Campaign
	var fields CampaignScanFields

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, role,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&fields.Description,
		&campaign.GameSystem,
		&fields.Theme,
		&fields.Tone,
		&fields.Setting,
		&fields.Factions,
		&fields.History,
		&fields.MagicLevel,
		&fields.TechLevel,
		&fields.Notes,
		&campaign.Role,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	PopulateCampaign(&campaign, &fields)
	return &campaign, nil
}

// GetCampaigns returns all campaigns in the database.
func (ops *CampaignsOperations) GetCampaigns(ctx context.Context) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, role,
		  is_active, created_at, updated_at
		  FROM campaigns
		  ORDER BY is_active DESC, updated_at DESC`

	rows, err := ops.exec.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var fields CampaignScanFields

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&fields.Description,
			&campaign.GameSystem,
			&fields.Theme,
			&fields.Tone,
			&fields.Setting,
			&fields.Factions,
			&fields.History,
			&fields.MagicLevel,
			&fields.TechLevel,
			&fields.Notes,
			&campaign.Role,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		PopulateCampaign(&campaign, &fields)
		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

// ListCampaignsByUserID retrieves all campaigns for a specific user.
func (ops *CampaignsOperations) ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, role,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE user_id = ` + ops.qb.Placeholder(1) + `
		  ORDER BY role, is_active DESC, updated_at DESC`

	rows, err := ops.exec.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var fields CampaignScanFields

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&fields.Description,
			&campaign.GameSystem,
			&fields.Theme,
			&fields.Tone,
			&fields.Setting,
			&fields.Factions,
			&fields.History,
			&fields.MagicLevel,
			&fields.TechLevel,
			&fields.Notes,
			&campaign.Role,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		PopulateCampaign(&campaign, &fields)
		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

// UpdateCampaign updates a campaign.
func (ops *CampaignsOperations) UpdateCampaign(ctx context.Context, campaign *Campaign) error {
	campaign.UpdatedAt = time.Now()

	query := `UPDATE campaigns SET
		  name = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
		  game_system = ` + ops.qb.Placeholder(3) + `, theme = ` + ops.qb.Placeholder(4) + `,
		  tone = ` + ops.qb.Placeholder(5) + `, setting = ` + ops.qb.Placeholder(6) + `,
		  factions = ` + ops.qb.Placeholder(7) + `, history = ` + ops.qb.Placeholder(8) + `,
		  magic_level = ` + ops.qb.Placeholder(9) + `, tech_level = ` + ops.qb.Placeholder(10) + `,
		  notes = ` + ops.qb.Placeholder(11) + `, role = ` + ops.qb.Placeholder(12) + `,
		  is_active = ` + ops.qb.Placeholder(13) + `, updated_at = ` + ops.qb.Placeholder(14) + `
		  WHERE id = ` + ops.qb.Placeholder(15)

	_, err := ops.exec.Exec(ctx, query,
		campaign.Name,
		campaign.Description,
		campaign.GameSystem,
		campaign.Theme,
		campaign.Tone,
		campaign.Setting,
		campaign.Factions,
		campaign.History,
		campaign.MagicLevel,
		campaign.TechLevel,
		campaign.Notes,
		campaign.Role,
		campaign.IsActive,
		campaign.UpdatedAt,
		campaign.ID,
	)
	return err
}

// DeleteCampaign deletes a campaign by ID.
func (ops *CampaignsOperations) DeleteCampaign(ctx context.Context, id string) error {
	query := `DELETE FROM campaigns WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// GetCampaignByIDAndUserID retrieves a campaign by ID and user ID.
func (ops *CampaignsOperations) GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error) {
	var campaign Campaign
	var fields CampaignScanFields

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, role,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2)

	err := ops.exec.QueryRow(ctx, query, id, userID).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&fields.Description,
		&campaign.GameSystem,
		&fields.Theme,
		&fields.Tone,
		&fields.Setting,
		&fields.Factions,
		&fields.History,
		&fields.MagicLevel,
		&fields.TechLevel,
		&fields.Notes,
		&campaign.Role,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	PopulateCampaign(&campaign, &fields)
	return &campaign, nil
}
