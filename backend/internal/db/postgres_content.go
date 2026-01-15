package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
)

// contentOps returns a ContentOps instance for unified content operations
func (db *PostgresDB) contentOps() *ContentOps {
	return NewContentOps(db.Executor(), db.QueryBuilder())
}

// =============================================================================
// NPC Operations (PostgreSQL) - delegates to ContentOps
// =============================================================================

func (db *PostgresDB) CreateNPC(ctx context.Context, npc *NPC) error {
	return db.contentOps().CreateNPC(ctx, npc)
}

func (db *PostgresDB) GetNPCByID(ctx context.Context, id string) (*NPC, error) {
	return db.contentOps().GetNPCByID(ctx, id)
}

func (db *PostgresDB) ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error) {
	return db.contentOps().ListNPCsByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) DeleteNPC(ctx context.Context, id string) error {
	return db.contentOps().DeleteNPC(ctx, id)
}

func (db *PostgresDB) UpdateNPC(ctx context.Context, npc *NPC) error {
	return db.contentOps().UpdateNPC(ctx, npc)
}

// =============================================================================
// Monster Operations (PostgreSQL) - delegates to ContentOps
// =============================================================================

func (db *PostgresDB) CreateMonster(ctx context.Context, monster *Monster) error {
	return db.contentOps().CreateMonster(ctx, monster)
}

func (db *PostgresDB) GetMonsterByID(ctx context.Context, id string) (*Monster, error) {
	return db.contentOps().GetMonsterByID(ctx, id)
}

func (db *PostgresDB) ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error) {
	return db.contentOps().ListMonstersByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) DeleteMonster(ctx context.Context, id string) error {
	return db.contentOps().DeleteMonster(ctx, id)
}

func (db *PostgresDB) UpdateMonster(ctx context.Context, monster *Monster) error {
	return db.contentOps().UpdateMonster(ctx, monster)
}

// =============================================================================
// Encounter Operations (PostgreSQL) - delegates to ContentOps
// =============================================================================

func (db *PostgresDB) CreateEncounter(ctx context.Context, encounter *Encounter) error {
	return db.contentOps().CreateEncounter(ctx, encounter)
}

func (db *PostgresDB) GetEncounterByID(ctx context.Context, id string) (*Encounter, error) {
	return db.contentOps().GetEncounterByID(ctx, id)
}

func (db *PostgresDB) ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error) {
	return db.contentOps().ListEncountersByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) DeleteEncounter(ctx context.Context, id string) error {
	return db.contentOps().DeleteEncounter(ctx, id)
}

func (db *PostgresDB) UpdateEncounter(ctx context.Context, encounter *Encounter) error {
	return db.contentOps().UpdateEncounter(ctx, encounter)
}

// =============================================================================
// Dialogue Operations (PostgreSQL) - delegates to ContentOps
// =============================================================================

func (db *PostgresDB) CreateDialogue(ctx context.Context, dialogue *Dialogue) error {
	return db.contentOps().CreateDialogue(ctx, dialogue)
}

func (db *PostgresDB) GetDialogueByID(ctx context.Context, id string) (*Dialogue, error) {
	return db.contentOps().GetDialogueByID(ctx, id)
}

func (db *PostgresDB) ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error) {
	return db.contentOps().ListDialoguesByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) DeleteDialogue(ctx context.Context, id string) error {
	return db.contentOps().DeleteDialogue(ctx, id)
}

func (db *PostgresDB) UpdateDialogue(ctx context.Context, dialogue *Dialogue) error {
	return db.contentOps().UpdateDialogue(ctx, dialogue)
}

// =============================================================================
// Campaign Content Status Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error {
	if status.ID == "" {
		status.ID = generateUUID()
	}
	now := time.Now()
	status.CreatedAt = now
	status.UpdatedAt = now

	// Use PostgreSQL's ON CONFLICT for atomic upsert
	// This avoids the check-then-write race condition
	query := `INSERT INTO campaign_content_status
		  (id, campaign_id, content_type, content_id, defeated, visited, obtained,
		   heard, triggered, encountered, completed, relationship_notes, status_data,
		   notes, created_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		  ON CONFLICT (campaign_id, content_type, content_id) DO UPDATE SET
		   defeated = COALESCE(EXCLUDED.defeated, campaign_content_status.defeated),
		   visited = COALESCE(EXCLUDED.visited, campaign_content_status.visited),
		   obtained = COALESCE(EXCLUDED.obtained, campaign_content_status.obtained),
		   heard = COALESCE(EXCLUDED.heard, campaign_content_status.heard),
		   triggered = COALESCE(EXCLUDED.triggered, campaign_content_status.triggered),
		   encountered = COALESCE(EXCLUDED.encountered, campaign_content_status.encountered),
		   completed = COALESCE(EXCLUDED.completed, campaign_content_status.completed),
		   relationship_notes = COALESCE(EXCLUDED.relationship_notes, campaign_content_status.relationship_notes),
		   status_data = COALESCE(EXCLUDED.status_data, campaign_content_status.status_data),
		   notes = COALESCE(EXCLUDED.notes, campaign_content_status.notes),
		   updated_at = EXCLUDED.updated_at`

	_, err := db.pool.Exec(ctx, query,
		status.ID, status.CampaignID, status.ContentType, status.ContentID,
		status.Defeated, status.Visited, status.Obtained, status.Heard,
		status.Triggered, status.Encountered, status.Completed,
		status.RelationshipNotes, status.StatusData, status.Notes,
		status.CreatedAt, status.UpdatedAt)
	return err
}

func (db *PostgresDB) GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error) {
	status := &CampaignContentStatus{}
	query := `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
		  heard, triggered, encountered, completed, relationship_notes, status_data,
		  notes, created_at, updated_at
		  FROM campaign_content_status
		  WHERE campaign_id = $1 AND content_type = $2 AND content_id = $3`

	var relationshipNotes, notes sql.NullString
	var statusData []byte
	err := db.pool.QueryRow(ctx, query, campaignID, contentType, contentID).Scan(
		&status.ID, &status.CampaignID, &status.ContentType, &status.ContentID,
		&status.Defeated, &status.Visited, &status.Obtained, &status.Heard,
		&status.Triggered, &status.Encountered, &status.Completed,
		&relationshipNotes, &statusData, &notes,
		&status.CreatedAt, &status.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if relationshipNotes.Valid {
		status.RelationshipNotes = &relationshipNotes.String
	}
	if len(statusData) > 0 {
		status.StatusData = statusData
	}
	if notes.Valid {
		status.Notes = &notes.String
	}

	return status, nil
}

func (db *PostgresDB) ListCampaignContentStatus(ctx context.Context, campaignID string, contentType *string) ([]*CampaignContentStatus, error) {
	var query string
	var args []interface{}

	if contentType != nil {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = $1 AND content_type = $2
			 ORDER BY updated_at DESC`
		args = []interface{}{campaignID, *contentType}
	} else {
		query = `SELECT id, campaign_id, content_type, content_id, defeated, visited, obtained,
			 heard, triggered, encountered, completed, relationship_notes, status_data,
			 notes, created_at, updated_at
			 FROM campaign_content_status
			 WHERE campaign_id = $1
			 ORDER BY content_type, updated_at DESC`
		args = []interface{}{campaignID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []*CampaignContentStatus
	for rows.Next() {
		status := &CampaignContentStatus{}
		var relationshipNotes, notes sql.NullString
		var statusData []byte

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
		if len(statusData) > 0 {
			status.StatusData = statusData
		}
		if notes.Valid {
			status.Notes = &notes.String
		}

		statuses = append(statuses, status)
	}

	return statuses, rows.Err()
}

func (db *PostgresDB) DeleteCampaignContentStatus(ctx context.Context, id string) error {
	query := `DELETE FROM campaign_content_status WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Convenience Methods for Marking Content Status
// =============================================================================

func (db *PostgresDB) MarkContentDefeated(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Defeated:    true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentVisited(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "location",
		ContentID:   contentID,
		Visited:     true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentObtained(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "item",
		ContentID:   contentID,
		Obtained:    true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentHeard(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "rumor",
		ContentID:   contentID,
		Heard:       true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentTriggered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "trap",
		ContentID:   contentID,
		Triggered:   true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentEncountered(ctx context.Context, campaignID string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: "critter",
		ContentID:   contentID,
		Encountered: true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) MarkContentCompleted(ctx context.Context, campaignID string, contentType string, contentID string) error {
	status := &CampaignContentStatus{
		CampaignID:  campaignID,
		ContentType: contentType,
		ContentID:   contentID,
		Completed:   true,
	}
	return db.UpsertCampaignContentStatus(ctx, status)
}

func (db *PostgresDB) UpdateRelationshipNotes(ctx context.Context, campaignID string, npcID string, notes string) error {
	// Get or create status for this NPC
	status, err := db.GetCampaignContentStatus(ctx, campaignID, "npc", npcID)
	if err == sql.ErrNoRows {
		status = &CampaignContentStatus{
			CampaignID:  campaignID,
			ContentType: "npc",
			ContentID:   npcID,
		}
	} else if err != nil {
		return err
	}

	status.RelationshipNotes = &notes
	return db.UpsertCampaignContentStatus(ctx, status)
}
