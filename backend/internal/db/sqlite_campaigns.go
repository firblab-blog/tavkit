package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

func (s *SQLiteDB) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	summary.CreatedAt = time.Now()
	summary.UpdatedAt = time.Now()

	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.Version, summary.CreatedAt, summary.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	summary := &CampaignSummary{}
	query := `SELECT id, campaign_id, user_id, overview, setting_summary, characters_summary,
		  plot_summary, tone_summary, content_stats, section_summaries, version,
		  created_at, updated_at
		  FROM campaign_summaries WHERE campaign_id = ?`

	var contentStats, sectionSummaries sql.NullString
	err := s.db.QueryRowContext(ctx, query, campaignID).Scan(
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

func (s *SQLiteDB) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	summary.UpdatedAt = time.Now()
	summary.Version++

	query := `UPDATE campaign_summaries
		  SET overview = ?, setting_summary = ?, characters_summary = ?, plot_summary = ?,
		      tone_summary = ?, content_stats = ?, section_summaries = ?, version = ?,
		      updated_at = ?
		  WHERE campaign_id = ?`

	_, err := s.db.ExecContext(ctx, query,
		summary.Overview, summary.SettingSummary, summary.CharactersSummary, summary.PlotSummary,
		summary.ToneSummary, summary.ContentStats, summary.SectionSummaries, summary.Version,
		summary.UpdatedAt, summary.CampaignID)
	return err
}

func (s *SQLiteDB) DeleteCampaignSummary(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_summaries WHERE campaign_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID)
	return err
}

func (s *SQLiteDB) UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	if summary.ID == "" {
		summary.ID = generateUUID()
	}
	now := time.Now()
	summary.UpdatedAt = now

	// Use INSERT OR REPLACE for atomic upsert
	// First, get the existing version if any (for incrementing)
	var existingVersion int
	err := s.db.QueryRowContext(ctx,
		"SELECT version FROM campaign_summaries WHERE campaign_id = ?",
		summary.CampaignID).Scan(&existingVersion)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if err == sql.ErrNoRows {
		// New record
		summary.CreatedAt = now
		summary.Version = 1
	} else {
		// Existing record - increment version
		summary.Version = existingVersion + 1
	}

	// Use INSERT ON CONFLICT for atomic upsert (SQLite 3.24+)
	query := `INSERT INTO campaign_summaries
		  (id, campaign_id, user_id, overview, setting_summary, characters_summary,
		   plot_summary, tone_summary, content_stats, section_summaries, version,
		   created_at, updated_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		  ON CONFLICT(campaign_id) DO UPDATE SET
		   overview = excluded.overview,
		   setting_summary = excluded.setting_summary,
		   characters_summary = excluded.characters_summary,
		   plot_summary = excluded.plot_summary,
		   tone_summary = excluded.tone_summary,
		   content_stats = excluded.content_stats,
		   section_summaries = excluded.section_summaries,
		   version = excluded.version,
		   updated_at = excluded.updated_at`

	_, err = s.db.ExecContext(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.Version, summary.CreatedAt, summary.UpdatedAt)
	return err
}

// Campaign operations

// CreateCampaign creates a new campaign
func (s *SQLiteDB) CreateCampaign(ctx context.Context, campaign *Campaign) error {
	if campaign.ID == "" {
		campaign.ID = generateUUID()
	}
	campaign.CreatedAt = time.Now()
	campaign.UpdatedAt = time.Now()

	query := `INSERT INTO campaigns (id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes, is_active, created_at, updated_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
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
func (s *SQLiteDB) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
	var campaign Campaign
	var setting, factions sql.NullString

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&campaign.Description,
		&campaign.GameSystem,
		&campaign.Theme,
		&campaign.Tone,
		&setting,
		&factions,
		&campaign.History,
		&campaign.MagicLevel,
		&campaign.TechLevel,
		&campaign.Notes,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if setting.Valid && setting.String != "" {
		campaign.Setting = json.RawMessage(setting.String)
	}
	if factions.Valid && factions.String != "" {
		campaign.Factions = json.RawMessage(factions.String)
	}

	return &campaign, nil
}

// ListCampaignsByUserID retrieves all campaigns for a specific user
func (s *SQLiteDB) ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE user_id = ?
		  ORDER BY is_active DESC, updated_at DESC`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var setting, factions sql.NullString

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&campaign.Description,
			&campaign.GameSystem,
			&campaign.Theme,
			&campaign.Tone,
			&setting,
			&factions,
			&campaign.History,
			&campaign.MagicLevel,
			&campaign.TechLevel,
			&campaign.Notes,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if setting.Valid && setting.String != "" {
			campaign.Setting = json.RawMessage(setting.String)
		}
		if factions.Valid && factions.String != "" {
			campaign.Factions = json.RawMessage(factions.String)
		}

		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

// UpdateCampaign updates a campaign
func (s *SQLiteDB) UpdateCampaign(ctx context.Context, campaign *Campaign) error {
	campaign.UpdatedAt = time.Now()

	query := `UPDATE campaigns SET
		  name = ?, description = ?, game_system = ?, theme = ?, tone = ?,
		  setting = ?, factions = ?, history = ?, magic_level = ?, tech_level = ?,
		  notes = ?, is_active = ?, updated_at = ?
		  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
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
func (s *SQLiteDB) DeleteCampaign(ctx context.Context, id string) error {
	query := `DELETE FROM campaigns WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// GetCampaigns returns all campaigns in the database
func (s *SQLiteDB) GetCampaigns(ctx context.Context) ([]*Campaign, error) {
	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  ORDER BY is_active DESC, updated_at DESC`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var campaigns []*Campaign
	for rows.Next() {
		var campaign Campaign
		var setting, factions sql.NullString

		err := rows.Scan(
			&campaign.ID,
			&campaign.UserID,
			&campaign.Name,
			&campaign.Description,
			&campaign.GameSystem,
			&campaign.Theme,
			&campaign.Tone,
			&setting,
			&factions,
			&campaign.History,
			&campaign.MagicLevel,
			&campaign.TechLevel,
			&campaign.Notes,
			&campaign.IsActive,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if setting.Valid && setting.String != "" {
			campaign.Setting = json.RawMessage(setting.String)
		}
		if factions.Valid && factions.String != "" {
			campaign.Factions = json.RawMessage(factions.String)
		}

		campaigns = append(campaigns, &campaign)
	}

	return campaigns, rows.Err()
}

func (s *SQLiteDB) GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error) {
	var campaign Campaign
	var setting, factions sql.NullString

	query := `SELECT id, user_id, name, description, game_system, theme, tone,
		  setting, factions, history, magic_level, tech_level, notes,
		  is_active, created_at, updated_at
		  FROM campaigns
		  WHERE id = ? AND user_id = ?`

	err := s.db.QueryRowContext(ctx, query, id, userID).Scan(
		&campaign.ID,
		&campaign.UserID,
		&campaign.Name,
		&campaign.Description,
		&campaign.GameSystem,
		&campaign.Theme,
		&campaign.Tone,
		&setting,
		&factions,
		&campaign.History,
		&campaign.MagicLevel,
		&campaign.TechLevel,
		&campaign.Notes,
		&campaign.IsActive,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Parse JSON fields
	if setting.Valid && setting.String != "" {
		campaign.Setting = json.RawMessage(setting.String)
	}
	if factions.Valid && factions.String != "" {
		campaign.Factions = json.RawMessage(factions.String)
	}

	return &campaign, nil
}

// GetCampaignContentByCampaignID retrieves all campaign_content entries for a campaign
func (s *SQLiteDB) GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE campaign_id = ? AND user_id = ?
		  ORDER BY section, subsection, created_at`

	rows, err := s.db.QueryContext(ctx, query, campaignID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var contents []*CampaignContent
	for rows.Next() {
		var content CampaignContent
		var subsection, fileName, summary sql.NullString

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
			&content.CreatedAt,
			&content.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

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
func (s *SQLiteDB) GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error) {
	var query string
	var args []interface{}

	if subsection != nil {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = ? AND user_id = ? AND section = ? AND subsection = ?
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section, *subsection}
	} else {
		query = `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
			  FROM campaign_content
			  WHERE campaign_id = ? AND user_id = ? AND section = ?
			  ORDER BY created_at DESC`
		args = []interface{}{campaignID, userID, section}
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var contents []*CampaignContent
	for rows.Next() {
		var content CampaignContent
		var subsec, fileName, summary sql.NullString

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
			&content.CreatedAt,
			&content.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

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
func (s *SQLiteDB) CreateCampaignContent(ctx context.Context, content *CampaignContent) error {
	if content.ID == "" {
		content.ID = generateUUID()
	}
	now := time.Now().Format(time.RFC3339)
	content.CreatedAt = now
	content.UpdatedAt = now

	query := `INSERT INTO campaign_content
		  (id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		content.ID, content.CampaignID, content.UserID, content.Section, content.Subsection,
		content.Title, content.Content, content.Type, content.FileName, content.Summary,
		content.CreatedAt, content.UpdatedAt)

	return err
}

// GetCampaignContentByID retrieves a single campaign content entry by ID
func (s *SQLiteDB) GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error) {
	query := `SELECT id, campaign_id, user_id, section, subsection, title, content, type, file_name, summary, created_at, updated_at
		  FROM campaign_content
		  WHERE id = ?`

	var content CampaignContent
	var subsection, fileName, summary sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
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
		&content.CreatedAt,
		&content.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

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
func (s *SQLiteDB) UpdateCampaignContent(ctx context.Context, content *CampaignContent) error {
	content.UpdatedAt = time.Now().Format(time.RFC3339)

	query := `UPDATE campaign_content
		  SET title = ?, content = ?, updated_at = ?
		  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query, content.Title, content.Content, content.UpdatedAt, content.ID)
	return err
}

// DeleteCampaignContent deletes a campaign content entry
func (s *SQLiteDB) DeleteCampaignContent(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Campaign Content Status operations
func (s *SQLiteDB) UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error {
	if status.ID == "" {
		status.ID = generateUUID()
	}
	now := time.Now()
	status.CreatedAt = now
	status.UpdatedAt = now

	// Use INSERT ON CONFLICT for atomic upsert (SQLite 3.24+)
	// This avoids the check-then-write race condition
	query := `INSERT INTO campaign_content_status
		  (id, campaign_id, content_type, content_id, defeated, visited, obtained,
		   heard, triggered, encountered, completed, relationship_notes, status_data,
		   notes, created_at, updated_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		  ON CONFLICT(campaign_id, content_type, content_id) DO UPDATE SET
		   defeated = COALESCE(excluded.defeated, campaign_content_status.defeated),
		   visited = COALESCE(excluded.visited, campaign_content_status.visited),
		   obtained = COALESCE(excluded.obtained, campaign_content_status.obtained),
		   heard = COALESCE(excluded.heard, campaign_content_status.heard),
		   triggered = COALESCE(excluded.triggered, campaign_content_status.triggered),
		   encountered = COALESCE(excluded.encountered, campaign_content_status.encountered),
		   completed = COALESCE(excluded.completed, campaign_content_status.completed),
		   relationship_notes = COALESCE(excluded.relationship_notes, campaign_content_status.relationship_notes),
		   status_data = COALESCE(excluded.status_data, campaign_content_status.status_data),
		   notes = COALESCE(excluded.notes, campaign_content_status.notes),
		   updated_at = excluded.updated_at`

	_, err := s.db.ExecContext(ctx, query,
		status.ID, status.CampaignID, status.ContentType, status.ContentID,
		status.Defeated, status.Visited, status.Obtained, status.Heard,
		status.Triggered, status.Encountered, status.Completed,
		status.RelationshipNotes, status.StatusData, status.Notes,
		status.CreatedAt, status.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error) {
	status := &CampaignContentStatus{}
	query := `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
		  heard, triggered, encountered, completed, relationship_notes, status_data,
		  notes, created_at, updated_at
		  FROM campaign_content_status
		  WHERE campaign_id = ? AND content_type = ? AND content_id = ?`

	var relationshipNotes, statusData, notes sql.NullString
	err := s.db.QueryRowContext(ctx, query, campaignID, contentType, contentID).Scan(
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

func (s *SQLiteDB) ListCampaignContentStatus(ctx context.Context, campaignID string, contentType *string) ([]*CampaignContentStatus, error) {
	var query string
	var args []interface{}

	if contentType != nil {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = ? AND content_type = ?
			 ORDER BY updated_at DESC`
		args = []interface{}{campaignID, *contentType}
	} else {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = ?
			 ORDER BY content_type, updated_at DESC`
		args = []interface{}{campaignID}
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
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

func (s *SQLiteDB) DeleteCampaignContentStatus(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content_status WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Convenience methods for marking content status
func (s *SQLiteDB) MarkContentDefeated(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Defeated:    true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentVisited(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "location",
		ContentID:   contentID,
		Visited:     true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentObtained(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "item",
		ContentID:   contentID,
		Obtained:    true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentHeard(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "rumor",
		ContentID:   contentID,
		Heard:       true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentTriggered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "trap",
		ContentID:   contentID,
		Triggered:   true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentEncountered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "critter",
		ContentID:   contentID,
		Encountered: true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) MarkContentCompleted(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Completed:   true,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

func (s *SQLiteDB) UpdateRelationshipNotes(ctx context.Context, campaignID string, npcID string, notes string) error {
	status := &CampaignContentStatus{
		CampaignID:        campaignID,
		ContentType:       "npc",
		ContentID:         npcID,
		RelationshipNotes: &notes,
	}
	return s.UpsertCampaignContentStatus(ctx, status)
}

// =============================================================================
// Campaign Fact Cache Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

func (s *SQLiteDB) GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error) {
	cache := &CampaignFactCache{}
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = ? AND content_type = ? AND content_id = ?`

	var facts sql.NullString
	err := s.db.QueryRowContext(ctx, query, campaignID, contentType, contentID).Scan(
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

func (s *SQLiteDB) ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error) {
	query := `SELECT id, campaign_id, content_type, content_id, content_hash, facts, extracted_at
		  FROM campaign_fact_cache
		  WHERE campaign_id = ?
		  ORDER BY content_type, extracted_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
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

func (s *SQLiteDB) UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error {
	if cache.ID == "" {
		cache.ID = generateUUID()
	}
	cache.ExtractedAt = time.Now()

	query := `INSERT INTO campaign_fact_cache
		  (id, campaign_id, content_type, content_id, content_hash, facts, extracted_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?)
		  ON CONFLICT(campaign_id, content_type, content_id) DO UPDATE SET
		   content_hash = excluded.content_hash,
		   facts = excluded.facts,
		   extracted_at = excluded.extracted_at`

	_, err := s.db.ExecContext(ctx, query,
		cache.ID, cache.CampaignID, cache.ContentType, cache.ContentID,
		cache.ContentHash, cache.Facts, cache.ExtractedAt)
	return err
}

func (s *SQLiteDB) DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error {
	query := `DELETE FROM campaign_fact_cache
		  WHERE campaign_id = ? AND content_type = ? AND content_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID, contentType, contentID)
	return err
}

func (s *SQLiteDB) DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error {
	query := `DELETE FROM campaign_fact_cache WHERE campaign_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID)
	return err
}

// =============================================================================
// Summary Generation Job Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	if job.ID == "" {
		job.ID = generateUUID()
	}
	job.CreatedAt = time.Now()

	query := `INSERT INTO summary_generation_jobs
		  (id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		   progress_percent, error_message, started_at, completed_at, created_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		job.ID, job.CampaignID, job.UserID, job.Status, job.CurrentStage,
		job.CurrentBatch, job.TotalBatches, job.ProgressPercent, job.ErrorMessage,
		job.StartedAt, job.CompletedAt, job.CreatedAt)
	return err
}

func (s *SQLiteDB) GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE id = ?`

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

func (s *SQLiteDB) UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error {
	query := `UPDATE summary_generation_jobs
		  SET status = ?, current_stage = ?, current_batch = ?, total_batches = ?,
		      progress_percent = ?, error_message = ?, started_at = ?, completed_at = ?
		  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		job.Status, job.CurrentStage, job.CurrentBatch, job.TotalBatches,
		job.ProgressPercent, job.ErrorMessage, job.StartedAt, job.CompletedAt,
		job.ID)
	return err
}

func (s *SQLiteDB) GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error) {
	job := &SummaryGenerationJob{}
	query := `SELECT id, campaign_id, user_id, status, current_stage, current_batch, total_batches,
		  progress_percent, error_message, started_at, completed_at, created_at
		  FROM summary_generation_jobs
		  WHERE campaign_id = ? AND status NOT IN ('completed', 'failed')
		  ORDER BY created_at DESC
		  LIMIT 1`

	var currentStage, errorMessage sql.NullString
	var startedAt, completedAt sql.NullTime

	err := s.db.QueryRowContext(ctx, query, campaignID).Scan(
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

func (s *SQLiteDB) DeleteSummaryJob(ctx context.Context, id string) error {
	query := `DELETE FROM summary_generation_jobs WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}
