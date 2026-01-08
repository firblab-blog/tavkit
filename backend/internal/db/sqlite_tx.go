package db

import (
	"context"
	"database/sql"
	"time"
)

// SQLiteTx implements Transaction interface for SQLite
type SQLiteTx struct {
	tx *sql.Tx
}

// BeginTx starts a new transaction
func (s *SQLiteDB) BeginTx(ctx context.Context) (Transaction, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &SQLiteTx{tx: tx}, nil
}

// Commit commits the transaction
func (t *SQLiteTx) Commit(_ context.Context) error {
	// Note: sql.Tx doesn't support context for Commit, but we accept it for interface consistency
	return t.tx.Commit()
}

// Rollback rolls back the transaction
func (t *SQLiteTx) Rollback(_ context.Context) error {
	// Note: sql.Tx doesn't support context for Rollback, but we accept it for interface consistency
	return t.tx.Rollback()
}

// CreateCampaignSummary creates a new campaign summary within the transaction
func (t *SQLiteTx) CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
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
	_, err := t.tx.ExecContext(ctx, query,
		summary.ID, summary.CampaignID, summary.UserID, summary.Overview, summary.SettingSummary,
		summary.CharactersSummary, summary.PlotSummary, summary.ToneSummary, summary.ContentStats,
		summary.SectionSummaries, summary.Version, summary.CreatedAt, summary.UpdatedAt)
	return err
}

// GetCampaignSummaryByCampaignID retrieves a campaign summary within the transaction
func (t *SQLiteTx) GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error) {
	summary := &CampaignSummary{}
	query := `SELECT id, campaign_id, user_id, overview, setting_summary, characters_summary,
		  plot_summary, tone_summary, content_stats, section_summaries, version,
		  created_at, updated_at
		  FROM campaign_summaries WHERE campaign_id = ?`

	var contentStats, sectionSummaries sql.NullString
	err := t.tx.QueryRowContext(ctx, query, campaignID).Scan(
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

// UpdateCampaignSummary updates a campaign summary within the transaction
func (t *SQLiteTx) UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error {
	summary.UpdatedAt = time.Now()
	summary.Version++

	query := `UPDATE campaign_summaries
		  SET overview = ?, setting_summary = ?, characters_summary = ?, plot_summary = ?,
		      tone_summary = ?, content_stats = ?, section_summaries = ?, version = ?,
		      updated_at = ?
		  WHERE campaign_id = ?`

	_, err := t.tx.ExecContext(ctx, query,
		summary.Overview, summary.SettingSummary, summary.CharactersSummary, summary.PlotSummary,
		summary.ToneSummary, summary.ContentStats, summary.SectionSummaries, summary.Version,
		summary.UpdatedAt, summary.CampaignID)
	return err
}

// UpsertCampaignContentStatus upserts campaign content status within the transaction
// Uses atomic ON CONFLICT to avoid race conditions (SQLite 3.24+)
func (t *SQLiteTx) UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error {
	if status.ID == "" {
		status.ID = generateUUID()
	}
	now := time.Now()
	status.CreatedAt = now
	status.UpdatedAt = now

	// Use SQLite's ON CONFLICT for atomic upsert within the transaction
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

	_, err := t.tx.ExecContext(ctx, query,
		status.ID, status.CampaignID, status.ContentType, status.ContentID,
		status.Defeated, status.Visited, status.Obtained, status.Heard,
		status.Triggered, status.Encountered, status.Completed,
		status.RelationshipNotes, status.StatusData, status.Notes,
		status.CreatedAt, status.UpdatedAt)
	return err
}

// GetCampaignContentStatus retrieves campaign content status within the transaction
func (t *SQLiteTx) GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error) {
	status := &CampaignContentStatus{}
	query := `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
		  heard, triggered, encountered, completed, relationship_notes, status_data,
		  notes, created_at, updated_at
		  FROM campaign_content_status
		  WHERE campaign_id = ? AND content_type = ? AND content_id = ?`

	var relationshipNotes, statusData, notes sql.NullString
	err := t.tx.QueryRowContext(ctx, query, campaignID, contentType, contentID).Scan(
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

// UpdateCombatParticipant updates a combat participant within the transaction
func (t *SQLiteTx) UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	query := `UPDATE combat_participants
              SET initiative = ?, current_hp = ?, temp_hp = ?, passive_perception = ?,
                  conditions = ?, concentration_spell = ?, death_saves = ?,
                  is_surprised = ?, has_reaction = ?, legendary_actions_used = ?,
                  position = ?, notes = ?
              WHERE id = ?`

	var conditions, deathSaves interface{}
	if len(participant.Conditions) > 0 {
		conditions = string(participant.Conditions)
	}
	if len(participant.DeathSaves) > 0 {
		deathSaves = string(participant.DeathSaves)
	}

	_, err := t.tx.ExecContext(ctx, query,
		participant.Initiative, participant.CurrentHP, participant.TempHP,
		participant.PassivePerception, conditions, participant.ConcentrationSpell,
		deathSaves, participant.IsSurprised, participant.HasReaction,
		participant.LegendaryActionsUsed, participant.Position, participant.Notes,
		participant.ID)
	return err
}

// CreateCombatCondition creates a combat condition within the transaction
func (t *SQLiteTx) CreateCombatCondition(ctx context.Context, condition *CombatCondition) error {
	if condition.ID == "" {
		condition.ID = generateUUID()
	}

	query := `INSERT INTO combat_conditions
		  (id, participant_id, condition_name, duration_rounds, save_dc, save_ability, source, applied_round, notes)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := t.tx.ExecContext(ctx, query,
		condition.ID, condition.ParticipantID, condition.ConditionName,
		condition.DurationRounds, condition.SaveDC, condition.SaveAbility,
		condition.Source, condition.AppliedRound, condition.Notes)
	return err
}

// DeleteCombatCondition deletes a combat condition within the transaction
func (t *SQLiteTx) DeleteCombatCondition(ctx context.Context, id string) error {
	query := `DELETE FROM combat_conditions WHERE id = ?`
	_, err := t.tx.ExecContext(ctx, query, id)
	return err
}

// UpdateCombatEncounter updates a combat encounter within the transaction
func (t *SQLiteTx) UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	query := `UPDATE combat_encounters
		  SET name = ?, current_round = ?, current_turn = ?, status = ?,
		      environment = ?, notes = ?
		  WHERE id = ?`

	_, err := t.tx.ExecContext(ctx, query,
		combat.Name, combat.CurrentRound, combat.CurrentTurn, combat.Status,
		combat.Environment, combat.Notes, combat.ID)
	return err
}

// CreateSessionEvent creates a session event within the transaction
func (t *SQLiteTx) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()
	event.Timestamp = time.Now()

	query := `INSERT INTO session_events
		  (id, session_id, event_type, round, timestamp, actor, action, details, outcome, important, created_at)
		  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := t.tx.ExecContext(ctx, query,
		event.ID, event.SessionID, event.EventType, event.Round,
		event.Timestamp, event.Actor, event.Action, event.Details,
		event.Outcome, event.Important, event.CreatedAt)
	return err
}

// UpdateCharacter updates a character within the transaction
func (t *SQLiteTx) UpdateCharacter(ctx context.Context, character *Character) error {
	character.UpdatedAt = time.Now()

	query := `UPDATE characters SET
		name = ?, level = ?, race = ?, subrace = ?, class_info = ?, subclass = ?,
		background = ?, alignment = ?, experience_points = ?, inspiration = ?,
		strength = ?, dexterity = ?, constitution = ?, intelligence = ?,
		wisdom = ?, charisma = ?, armor_class = ?, initiative = ?, speed = ?,
		max_hit_points = ?, current_hit_points = ?, temp_hit_points = ?,
		proficiency_bonus = ?, campaign_id = ?, updated_at = ?
		WHERE id = ?`

	_, err := t.tx.ExecContext(ctx, query,
		character.Name, character.Level, character.Race, character.Subrace, character.ClassInfo, character.Subclass,
		character.Background, character.Alignment, character.ExperiencePoints, character.Inspiration,
		character.Strength, character.Dexterity, character.Constitution, character.Intelligence,
		character.Wisdom, character.Charisma, character.ArmorClass, character.Initiative, character.Speed,
		character.MaxHitPoints, character.CurrentHitPoints, character.TempHitPoints,
		character.ProficiencyBonus, character.CampaignID, character.UpdatedAt, character.ID)
	return err
}

// LinkCharacterToCampaign links a character to a campaign within the transaction
func (t *SQLiteTx) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	id := generateUUID()
	query := `INSERT INTO campaign_characters (id, campaign_id, character_id, added_at)
		  VALUES (?, ?, ?, ?)
		  ON CONFLICT(campaign_id, character_id) DO NOTHING`
	_, err := t.tx.ExecContext(ctx, query, id, campaignID, characterID, time.Now())
	return err
}

// UnlinkCharacterFromCampaign unlinks a character from a campaign within the transaction
func (t *SQLiteTx) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	query := `DELETE FROM campaign_characters WHERE campaign_id = ? AND character_id = ?`
	_, err := t.tx.ExecContext(ctx, query, campaignID, characterID)
	return err
}
