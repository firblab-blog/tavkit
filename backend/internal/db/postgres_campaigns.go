package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Campaign Operations (PostgreSQL)
// =============================================================================

// GetCampaigns returns all campaigns in the database
func (db *PostgresDB) GetCampaigns(ctx context.Context) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  ORDER BY is_active DESC, updated_at DESC`

	rows, err := db.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
		var setting, factions []byte

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&description,
			&campaign.GameSystem,
			&theme,
			&tone,
			&setting,
			&factions,
			&history,
			&magicLevel,
			&techLevel,
			&notes,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Handle nullable strings
		if description.Valid {
			campaign.Description = &description.String
		}
		if theme.Valid {
			campaign.Theme = &theme.String
		}
		if tone.Valid {
			campaign.Tone = &tone.String
		}
		if history.Valid {
			campaign.History = &history.String
		}
		if magicLevel.Valid {
			campaign.MagicLevel = &magicLevel.String
		}
		if techLevel.Valid {
			campaign.TechLevel = &techLevel.String
		}
		if notes.Valid {
			campaign.Notes = &notes.String
		}

		// Parse JSON fields
		if len(setting) > 0 {
			campaign.Setting = json.RawMessage(setting)
		}
		if len(factions) > 0 {
			campaign.Factions = json.RawMessage(factions)
		}

		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

// CreateCampaign creates a new campaign
func (db *PostgresDB) CreateCampaign(ctx context.Context, campaign *Campaign) error {
	if campaign.ID == "" {
		campaign.ID = generateUUID()
	}
	campaign.CreatedAt = time.Now()
	campaign.UpdatedAt = time.Now()

	query := `INSERT INTO campaigns (id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, is_active, created_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := db.pool.Exec(ctx, query,
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
		campaign.IsActive,
		campaign.CreatedAt,
		campaign.UpdatedAt,
	)
	return err
}

// GetCampaignByID retrieves a campaign by ID
func (db *PostgresDB) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
	var campaign Campaign
	var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
	var setting, factions []byte

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&description,
		&campaign.GameSystem,
		&theme,
		&tone,
		&setting,
		&factions,
		&history,
		&magicLevel,
		&techLevel,
		&notes,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	// Handle nullable strings
	if description.Valid {
		campaign.Description = &description.String
	}
	if theme.Valid {
		campaign.Theme = &theme.String
	}
	if tone.Valid {
		campaign.Tone = &tone.String
	}
	if history.Valid {
		campaign.History = &history.String
	}
	if magicLevel.Valid {
		campaign.MagicLevel = &magicLevel.String
	}
	if techLevel.Valid {
		campaign.TechLevel = &techLevel.String
	}
	if notes.Valid {
		campaign.Notes = &notes.String
	}

	// Parse JSON fields
	if len(setting) > 0 {
		campaign.Setting = json.RawMessage(setting)
	}
	if len(factions) > 0 {
		campaign.Factions = json.RawMessage(factions)
	}

	return &campaign, nil
}

// ListCampaignsByUserID retrieves all campaigns for a specific user
func (db *PostgresDB) ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE user_id = $1
		  ORDER BY is_active DESC, updated_at DESC`

	rows, err := db.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
		var setting, factions []byte

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&description,
			&campaign.GameSystem,
			&theme,
			&tone,
			&setting,
			&factions,
			&history,
			&magicLevel,
			&techLevel,
			&notes,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Handle nullable strings
		if description.Valid {
			campaign.Description = &description.String
		}
		if theme.Valid {
			campaign.Theme = &theme.String
		}
		if tone.Valid {
			campaign.Tone = &tone.String
		}
		if history.Valid {
			campaign.History = &history.String
		}
		if magicLevel.Valid {
			campaign.MagicLevel = &magicLevel.String
		}
		if techLevel.Valid {
			campaign.TechLevel = &techLevel.String
		}
		if notes.Valid {
			campaign.Notes = &notes.String
		}

		// Parse JSON fields
		if len(setting) > 0 {
			campaign.Setting = json.RawMessage(setting)
		}
		if len(factions) > 0 {
			campaign.Factions = json.RawMessage(factions)
		}

		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

// UpdateCampaign updates a campaign
func (db *PostgresDB) UpdateCampaign(ctx context.Context, campaign *Campaign) error {
	campaign.UpdatedAt = time.Now()

	query := `UPDATE campaigns SET
		  name = $1, description = $2, game_system = $3, theme = $4, tone = $5,
		  setting = $6, factions = $7, history = $8, magic_level = $9, tech_level = $10,
		  notes = $11, is_active = $12, updated_at = $13
		  WHERE id = $14`

	_, err := db.pool.Exec(ctx, query,
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
		campaign.IsActive,
		campaign.UpdatedAt,
		campaign.ID,
	)
	return err
}

// DeleteCampaign deletes a campaign by ID
func (db *PostgresDB) DeleteCampaign(ctx context.Context, id string) error {
	query := `DELETE FROM campaigns WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error) {
	var campaign Campaign
	var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
	var setting, factions []byte

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = $1 AND user_id = $2`

	err := db.pool.QueryRow(ctx, query, id, userID).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&description,
		&campaign.GameSystem,
		&theme,
		&tone,
		&setting,
		&factions,
		&history,
		&magicLevel,
		&techLevel,
		&notes,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	// Handle nullable strings
	if description.Valid {
		campaign.Description = &description.String
	}
	if theme.Valid {
		campaign.Theme = &theme.String
	}
	if tone.Valid {
		campaign.Tone = &tone.String
	}
	if history.Valid {
		campaign.History = &history.String
	}
	if magicLevel.Valid {
		campaign.MagicLevel = &magicLevel.String
	}
	if techLevel.Valid {
		campaign.TechLevel = &techLevel.String
	}
	if notes.Valid {
		campaign.Notes = &notes.String
	}

	// Parse JSON fields
	if len(setting) > 0 {
		campaign.Setting = json.RawMessage(setting)
	}
	if len(factions) > 0 {
		campaign.Factions = json.RawMessage(factions)
	}

	return &campaign, nil
}

// GetCampaignContentByCampaignID retrieves all campaign_content entries for a campaign
func (db *PostgresDB) GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE campaign_id = $1 AND user_id = $2
		  ORDER BY section, subsection, created_at`

	rows, err := db.pool.Query(ctx, query, campaignID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

// GetCampaignContentBySection retrieves campaign_content entries filtered by section
func (db *PostgresDB) GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error) {
	var query string
	var args []interface{}

	if subsection != nil {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = $1 AND user_id = $2 AND section = $3 AND subsection = $4
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section, *subsection}
	} else {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = $1 AND user_id = $2 AND section = $3
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

// CreateCampaignContent creates a new campaign content entry
func (db *PostgresDB) CreateCampaignContent(ctx context.Context, content *CampaignContent) error {
	if content.ID == "" {
		content.ID = generateUUID()
	}
	now := time.Now().Format(time.RFC3339)
	content.CreatedAt = now
	content.UpdatedAt = now

	query := `INSERT INTO campaign_content
		  (id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := db.pool.Exec(ctx, query,
		content.ID, content.CampaignID, content.UserID, content.Section, content.Subsection,
		content.Title, content.Content, content.Type, content.FileName, content.Summary,
		content.CreatedAt, content.UpdatedAt)

	return err
}

// GetCampaignContentByID retrieves a single campaign content entry by ID
func (db *PostgresDB) GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE id = $1`

	var content CampaignContent
	var subsection, fileName, summary sql.NullString
	var createdAt, updatedAt time.Time

	err := db.pool.QueryRow(ctx, query, id).Scan(
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

// UpdateCampaignContent updates an existing campaign content entry
func (db *PostgresDB) UpdateCampaignContent(ctx context.Context, content *CampaignContent) error {
	content.UpdatedAt = time.Now().Format(time.RFC3339)

	query := `UPDATE campaign_content
		  SET title = $1, content = $2, updated_at = $3
		  WHERE id = $4`

	_, err := db.pool.Exec(ctx, query, content.Title, content.Content, content.UpdatedAt, content.ID)
	return err
}

// DeleteCampaignContent deletes a campaign content entry
func (db *PostgresDB) DeleteCampaignContent(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Campaign Summary Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	summary.CreatedAt = time.Now()
	summary.UpdatedAt = time.Now()

	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	_, err := db.pool.Exec(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.Version, summary.CreatedAt, summary.UpdatedAt)
	return err
}

func (db *PostgresDB) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	summary := &CampaignSummary{}
	query := `SELECT id, campaign_id, user_id, overview, setting_summary, characters_summary,
		  plot_summary, tone_summary, content_stats, section_summaries, version,
		  created_at, updated_at
		  FROM campaign_summaries WHERE campaign_id = $1`

	var contentStats, sectionSummaries []byte
	err := db.pool.QueryRow(ctx, query, campaignID).Scan(
		&summary.ID, &summary.CampaignID, &summary.UserID, &summary.Overview, &summary.SettingSummary,
		&summary.CharactersSummary, &summary.PlotSummary, &summary.ToneSummary, &contentStats,
		&sectionSummaries, &summary.Version, &summary.CreatedAt, &summary.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if len(contentStats) > 0 {
		summary.ContentStats = contentStats
	}
	if len(sectionSummaries) > 0 {
		summary.SectionSummaries = sectionSummaries
	}

	return summary, nil
}

func (db *PostgresDB) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	summary.UpdatedAt = time.Now()
	summary.Version++

	query := `UPDATE campaign_summaries
		  SET overview = $1, setting_summary = $2, characters_summary = $3, plot_summary = $4,
		      tone_summary = $5, content_stats = $6, section_summaries = $7, version = $8,
		      updated_at = $9
		  WHERE campaign_id = $10`

	_, err := db.pool.Exec(ctx, query,
		summary.Overview, summary.SettingSummary, summary.CharactersSummary, summary.PlotSummary,
		summary.ToneSummary, summary.ContentStats, summary.SectionSummaries, summary.Version,
		summary.UpdatedAt, summary.CampaignID)
	return err
}

func (db *PostgresDB) DeleteCampaignSummary(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_summaries WHERE campaign_id = $1`
	_, err := db.pool.Exec(ctx, query, campaignID)
	return err
}

func (db *PostgresDB) UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	now := time.Now()
	summary.CreatedAt = now
	summary.UpdatedAt = now

	// Use PostgreSQL's ON CONFLICT for atomic upsert
	// The version is incremented using COALESCE to handle new vs existing records
	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12)
		  ON CONFLICT (campaign_id) DO UPDATE SET
		   overview = EXCLUDED.overview,
		   setting_summary = EXCLUDED.setting_summary,
		   characters_summary = EXCLUDED.characters_summary,
		   plot_summary = EXCLUDED.plot_summary,
		   tone_summary = EXCLUDED.tone_summary,
		   content_stats = EXCLUDED.content_stats,
		   section_summaries = EXCLUDED.section_summaries,
		   version = campaign_summaries.version + 1,
		   updated_at = EXCLUDED.updated_at`

	_, err := db.pool.Exec(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.CreatedAt, summary.UpdatedAt)
	return err
}

// =============================================================================
// Campaign Fact Cache Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := db.pool.Exec(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

func (db *PostgresDB) GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error) {
	cache := &CampaignFactCache{}
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = $1 AND content_type = $2 AND content_id = $3`

	var facts []byte
	err := db.pool.QueryRow(ctx, query, campaignID, contentType, contentID).Scan(
		&cache.ID, &cache.CampaignID, &cache.ContentType, &cache.ContentID,
		&cache.ContentHash, &facts, &cache.ExtractedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if len(facts) > 0 {
		cache.Facts = facts
	}

	return cache, nil
}

func (db *PostgresDB) ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error) {
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = $1
		  ORDER BY content_type, extracted_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var caches []*CampaignFactCache
	for rows.Next() {
		cache := &CampaignFactCache{}
		var facts []byte

		err := rows.Scan(
			&cache.ID, &cache.CampaignID, &cache.ContentType, &cache.ContentID,
			&cache.ContentHash, &facts, &cache.ExtractedAt)
		if err != nil {
			return nil, err
		}

		if len(facts) > 0 {
			cache.Facts = facts
		}

		caches = append(caches, cache)
	}

	return caches, rows.Err()
}

func (db *PostgresDB) UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7)
		  ON CONFLICT (campaign_id, content_type, content_id) DO UPDATE SET
		   content_hash = EXCLUDED.content_hash,
		   facts = EXCLUDED.facts,
		   extracted_at = EXCLUDED.extracted_at`

	_, err := db.pool.Exec(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

func (db *PostgresDB) DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error {
	query := `DELETE FROM campaign_fact_cache
		  WHERE campaign_id = $1 AND content_type = $2 AND content_id = $3`
	_, err := db.pool.Exec(ctx, query, campaignID, contentType, contentID)
	return err
}

func (db *PostgresDB) DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_fact_cache WHERE campaign_id = $1`
	_, err := db.pool.Exec(ctx, query, campaignID)
	return err
}

// =============================================================================
// Summary Generation Job Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	if job.ID == "" {
		job.ID = generateUUID()
	}
	job.CreatedAt = time.Now()

	query := `INSERT INTO summary_generation_jobs
		  (id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		   progress_percent, error_message, started_at, completed_at, created_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := db.pool.Exec(ctx, query,
		job.ID, job.CampaignID, job.UserID, job.Status, job.CurrentStage,
		job.CurrentBatch, job.TotalBatches, job.ProgressPercent, job.ErrorMessage,
		job.StartedAt, job.CompletedAt, job.CreatedAt)
	return err
}

func (db *PostgresDB) GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE id = $1`

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&job.ID, &job.CampaignID, &job.UserID, &job.Status, &currentStage,
		&job.CurrentBatch, &job.TotalBatches, &job.ProgressPercent, &errorMessage,
		&startedAt, &completedAt, &job.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	query := `UPDATE summary_generation_jobs
		  SET status = $1, current_stage = $2, current_batch = $3, total_batches = $4,
		      progress_percent = $5, error_message = $6, started_at = $7, completed_at = $8
		  WHERE id = $9`

	_, err := db.pool.Exec(ctx, query,
		job.Status, job.CurrentStage, job.CurrentBatch, job.TotalBatches,
		job.ProgressPercent, job.ErrorMessage, job.StartedAt, job.CompletedAt,
		job.ID)
	return err
}

func (db *PostgresDB) GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE campaign_id = $1 AND status NOT IN ('completed', 'failed')
		  ORDER BY created_at DESC
		  LIMIT 1`

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := db.pool.QueryRow(ctx, query, campaignID).Scan(
		&job.ID, &job.CampaignID, &job.UserID, &job.Status, &currentStage,
		&job.CurrentBatch, &job.TotalBatches, &job.ProgressPercent, &errorMessage,
		&startedAt, &completedAt, &job.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) DeleteSummaryJob(ctx context.Context, id string) error {
	query := `DELETE FROM summary_generation_jobs WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}
