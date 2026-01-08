package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
)

// SQL query fragments for PostgreSQL
const (
	pgAndCampaignIDEquals  = " AND campaign_id = $2"
	pgOrderByCreatedAtDesc = " ORDER BY created_at DESC"
)

// =============================================================================
// NPC Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateNPC(ctx context.Context, npc *NPC) error {
	if npc.ID == "" {
		npc.ID = generateUUID()
	}
	npc.CreatedAt = time.Now()

	query := `INSERT INTO npcs (id, user_id, campaign_id, name, race, class, personality, backstory, stats, ai_generated, ai_provider, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := db.pool.Exec(ctx, query,
		npc.ID, npc.UserID, npc.CampaignID, npc.Name, npc.Race, npc.Class,
		npc.Personality, npc.Backstory, npc.Stats, npc.AIGenerated, npc.AIProvider, npc.CreatedAt)
	return err
}

func (db *PostgresDB) GetNPCByID(ctx context.Context, id string) (*NPC, error) {
	query := `SELECT id, user_id, campaign_id, name, race, class, personality, backstory, stats,
              ai_generated, ai_provider, created_at
              FROM npcs WHERE id = $1`

	npc := &NPC{}
	var stats sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&npc.ID, &npc.UserID, &npc.CampaignID, &npc.Name, &npc.Race, &npc.Class,
		&npc.Personality, &npc.Backstory, &stats, &npc.AIGenerated,
		&npc.AIProvider, &npc.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if stats.Valid {
		npc.Stats = []byte(stats.String)
	}
	return npc, nil
}

func (db *PostgresDB) ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, race, class, personality, backstory, stats,
                 ai_generated, ai_provider, created_at
                 FROM npcs WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, race, class, personality, backstory, stats,
                 ai_generated, ai_provider, created_at
                 FROM npcs WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var npcs []*NPC
	for rows.Next() {
		npc := &NPC{}
		var stats sql.NullString
		if err := rows.Scan(&npc.ID, &npc.UserID, &npc.CampaignID, &npc.Name, &npc.Race, &npc.Class,
			&npc.Personality, &npc.Backstory, &stats, &npc.AIGenerated,
			&npc.AIProvider, &npc.CreatedAt); err != nil {
			return nil, err
		}
		if stats.Valid {
			npc.Stats = []byte(stats.String)
		}
		npcs = append(npcs, npc)
	}

	return npcs, rows.Err()
}

func (db *PostgresDB) DeleteNPC(ctx context.Context, id string) error {
	query := `DELETE FROM npcs WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Monster Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateMonster(ctx context.Context, monster *Monster) error {
	if monster.ID == "" {
		monster.ID = generateUUID()
	}
	monster.CreatedAt = time.Now()

	query := `INSERT INTO monsters (id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := db.pool.Exec(ctx, query,
		monster.ID, monster.UserID, monster.CampaignID, monster.Name, monster.CR,
		monster.Stats, monster.Lore, monster.Tactics, monster.AIGenerated, monster.CreatedAt)
	return err
}

func (db *PostgresDB) GetMonsterByID(ctx context.Context, id string) (*Monster, error) {
	monster := &Monster{}
	query := `SELECT id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at
              FROM monsters WHERE id = $1`
	var stats sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&monster.ID, &monster.UserID, &monster.CampaignID, &monster.Name, &monster.CR,
		&stats, &monster.Lore, &monster.Tactics, &monster.AIGenerated, &monster.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if stats.Valid {
		monster.Stats = []byte(stats.String)
	}
	return monster, nil
}

func (db *PostgresDB) ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at
                 FROM monsters WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at
                 FROM monsters WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var monsters []*Monster
	for rows.Next() {
		monster := &Monster{}
		var stats sql.NullString
		err := rows.Scan(
			&monster.ID, &monster.UserID, &monster.CampaignID, &monster.Name, &monster.CR,
			&stats, &monster.Lore, &monster.Tactics, &monster.AIGenerated, &monster.CreatedAt)
		if err != nil {
			return nil, err
		}
		if stats.Valid {
			monster.Stats = []byte(stats.String)
		}
		monsters = append(monsters, monster)
	}
	return monsters, rows.Err()
}

func (db *PostgresDB) DeleteMonster(ctx context.Context, id string) error {
	query := `DELETE FROM monsters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Encounter Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateEncounter(ctx context.Context, encounter *Encounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	encounter.CreatedAt = time.Now()

	query := `INSERT INTO encounters (id, user_id, campaign_id, name, party_level, party_size, difficulty,
              description, environment, creatures, treasure, xp_total, xp_per_player, notes,
              ai_generated, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := db.pool.Exec(ctx, query,
		encounter.ID, encounter.UserID, encounter.CampaignID, encounter.Name, encounter.PartyLevel, encounter.PartySize,
		encounter.Difficulty, encounter.Description, encounter.Environment, encounter.Creatures,
		encounter.Treasure, encounter.XPTotal, encounter.XPPerPlayer, encounter.Notes, encounter.AIGenerated, encounter.CreatedAt)
	return err
}

func (db *PostgresDB) GetEncounterByID(ctx context.Context, id string) (*Encounter, error) {
	encounter := &Encounter{}
	query := `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
              environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
              FROM encounters WHERE id = $1`
	var environment, creatures, treasure sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&encounter.ID, &encounter.UserID, &encounter.CampaignID, &encounter.Name, &encounter.PartyLevel, &encounter.PartySize,
		&encounter.Difficulty, &encounter.Description, &environment, &creatures,
		&treasure, &encounter.XPTotal, &encounter.XPPerPlayer, &encounter.Notes,
		&encounter.AIGenerated, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if environment.Valid {
		encounter.Environment = []byte(environment.String)
	}
	if creatures.Valid {
		encounter.Creatures = []byte(creatures.String)
	}
	if treasure.Valid {
		encounter.Treasure = []byte(treasure.String)
	}
	return encounter, nil
}

func (db *PostgresDB) ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
                 environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
                 FROM encounters WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
                 environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
                 FROM encounters WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var encounters []*Encounter
	for rows.Next() {
		encounter := &Encounter{}
		var environment, creatures, treasure sql.NullString
		err := rows.Scan(
			&encounter.ID, &encounter.UserID, &encounter.CampaignID, &encounter.Name, &encounter.PartyLevel, &encounter.PartySize,
			&encounter.Difficulty, &encounter.Description, &environment, &creatures,
			&treasure, &encounter.XPTotal, &encounter.XPPerPlayer, &encounter.Notes,
			&encounter.AIGenerated, &encounter.CreatedAt)
		if err != nil {
			return nil, err
		}
		if environment.Valid {
			encounter.Environment = []byte(environment.String)
		}
		if creatures.Valid {
			encounter.Creatures = []byte(creatures.String)
		}
		if treasure.Valid {
			encounter.Treasure = []byte(treasure.String)
		}
		encounters = append(encounters, encounter)
	}
	return encounters, rows.Err()
}

func (db *PostgresDB) DeleteEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM encounters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Dialogue Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateDialogue(ctx context.Context, dialogue *Dialogue) error {
	if dialogue.ID == "" {
		dialogue.ID = generateUUID()
	}
	dialogue.CreatedAt = time.Now()

	query := `INSERT INTO dialogues (id, user_id, campaign_id, character_name, scene_setting, mood,
              dialogue_tree, skill_checks, information, potential_quests, ai_generated, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := db.pool.Exec(ctx, query,
		dialogue.ID, dialogue.UserID, dialogue.CampaignID, dialogue.CharacterName, dialogue.SceneSetting, dialogue.Mood,
		dialogue.DialogueTree, dialogue.SkillChecks, dialogue.Information, dialogue.PotentialQuests,
		dialogue.AIGenerated, dialogue.CreatedAt)
	return err
}

func (db *PostgresDB) GetDialogueByID(ctx context.Context, id string) (*Dialogue, error) {
	dialogue := &Dialogue{}
	query := `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
              skill_checks, information, potential_quests, ai_generated, created_at
              FROM dialogues WHERE id = $1`
	var dialogueTree, skillChecks, information, potentialQuests sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&dialogue.ID, &dialogue.UserID, &dialogue.CampaignID, &dialogue.CharacterName, &dialogue.SceneSetting, &dialogue.Mood,
		&dialogueTree, &skillChecks, &information, &potentialQuests,
		&dialogue.AIGenerated, &dialogue.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if dialogueTree.Valid {
		dialogue.DialogueTree = []byte(dialogueTree.String)
	}
	if skillChecks.Valid {
		dialogue.SkillChecks = []byte(skillChecks.String)
	}
	if information.Valid {
		dialogue.Information = []byte(information.String)
	}
	if potentialQuests.Valid {
		dialogue.PotentialQuests = []byte(potentialQuests.String)
	}
	return dialogue, nil
}

func (db *PostgresDB) ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
                 skill_checks, information, potential_quests, ai_generated, created_at
                 FROM dialogues WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
                 skill_checks, information, potential_quests, ai_generated, created_at
                 FROM dialogues WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dialogues []*Dialogue
	for rows.Next() {
		dialogue := &Dialogue{}
		var dialogueTree, skillChecks, information, potentialQuests sql.NullString
		err := rows.Scan(
			&dialogue.ID, &dialogue.UserID, &dialogue.CampaignID, &dialogue.CharacterName, &dialogue.SceneSetting, &dialogue.Mood,
			&dialogueTree, &skillChecks, &information, &potentialQuests,
			&dialogue.AIGenerated, &dialogue.CreatedAt)
		if err != nil {
			return nil, err
		}
		if dialogueTree.Valid {
			dialogue.DialogueTree = []byte(dialogueTree.String)
		}
		if skillChecks.Valid {
			dialogue.SkillChecks = []byte(skillChecks.String)
		}
		if information.Valid {
			dialogue.Information = []byte(information.String)
		}
		if potentialQuests.Valid {
			dialogue.PotentialQuests = []byte(potentialQuests.String)
		}
		dialogues = append(dialogues, dialogue)
	}
	return dialogues, rows.Err()
}

func (db *PostgresDB) DeleteDialogue(ctx context.Context, id string) error {
	query := `DELETE FROM dialogues WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
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
