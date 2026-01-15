package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// PlayerModeOperations provides unified player mode operations.
type PlayerModeOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewPlayerModeOperations creates a new PlayerModeOperations.
func NewPlayerModeOperations(exec Executor, qb *QueryBuilder) *PlayerModeOperations {
	return &PlayerModeOperations{exec: exec, qb: qb}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// AssignNullInt32 assigns a sql.NullInt32 to a *int if valid.
func AssignNullInt32(dest **int, src sql.NullInt32) {
	if src.Valid {
		intVal := int(src.Int32)
		*dest = &intVal
	}
}

// AssignNullInt64ToInt assigns a sql.NullInt64 to a *int if valid.
func AssignNullInt64ToInt(dest **int, src sql.NullInt64) {
	if src.Valid {
		intVal := int(src.Int64)
		*dest = &intVal
	}
}

// AssignNullTime assigns a sql.NullTime to a *time.Time if valid.
func AssignNullTime(dest **time.Time, src sql.NullTime) {
	if src.Valid {
		*dest = &src.Time
	}
}

// ============================================================================
// PLAYER JOURNAL ENTRY OPERATIONS
// ============================================================================

// CreatePlayerJournalEntry creates a new journal entry for a player.
func (ops *PlayerModeOperations) CreatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	if entry.ID == "" {
		entry.ID = generateUUID()
	}
	entry.CreatedAt = time.Now()
	entry.UpdatedAt = time.Now()

	query := `INSERT INTO player_journal_entries
		(id, user_id, campaign_id, character_id, title, content, session_date, session_number,
		tagged_npcs, tagged_locations, tagged_quests, is_private, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(14) + `)`

	_, err := ops.exec.Exec(ctx, query,
		entry.ID,
		entry.UserID,
		entry.CampaignID,
		entry.CharacterID,
		entry.Title,
		entry.Content,
		entry.SessionDate,
		entry.SessionNumber,
		entry.TaggedNPCs,
		entry.TaggedLocations,
		entry.TaggedQuests,
		entry.IsPrivate,
		entry.CreatedAt,
		entry.UpdatedAt,
	)
	return err
}

// GetPlayerJournalEntryByID retrieves a journal entry by ID.
func (ops *PlayerModeOperations) GetPlayerJournalEntryByID(ctx context.Context, id string) (*PlayerJournalEntry, error) {
	query := `SELECT id, user_id, campaign_id, character_id, title, content, session_date, session_number,
		tagged_npcs, tagged_locations, tagged_quests, is_private, created_at, updated_at
		FROM player_journal_entries WHERE id = ` + ops.qb.Placeholder(1)

	entry := &PlayerJournalEntry{}
	var campaignID, characterID, content, sessionDate sql.NullString
	var sessionNumber sql.NullInt32
	var taggedNPCs, taggedLocations, taggedQuests sql.NullString

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&entry.ID,
		&entry.UserID,
		&campaignID,
		&characterID,
		&entry.Title,
		&content,
		&sessionDate,
		&sessionNumber,
		&taggedNPCs,
		&taggedLocations,
		&taggedQuests,
		&entry.IsPrivate,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&entry.CampaignID, campaignID)
	AssignNullString(&entry.CharacterID, characterID)
	AssignNullString(&entry.Content, content)
	AssignNullString(&entry.SessionDate, sessionDate)
	AssignNullInt32(&entry.SessionNumber, sessionNumber)
	AssignNullStringToBytes(&entry.TaggedNPCs, taggedNPCs)
	AssignNullStringToBytes(&entry.TaggedLocations, taggedLocations)
	AssignNullStringToBytes(&entry.TaggedQuests, taggedQuests)

	return entry, nil
}

// ListPlayerJournalEntries lists journal entries for a user, optionally filtered by campaign.
func (ops *PlayerModeOperations) ListPlayerJournalEntries(ctx context.Context, userID string, campaignID *string) ([]*PlayerJournalEntry, error) {
	query := `SELECT id, user_id, campaign_id, character_id, title, content, session_date, session_number,
		tagged_npcs, tagged_locations, tagged_quests, is_private, created_at, updated_at
		FROM player_journal_entries WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY session_number DESC, created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var entries []*PlayerJournalEntry
	for rows.Next() {
		entry := &PlayerJournalEntry{}
		var campID, charID, cont, sessDate sql.NullString
		var sessNum sql.NullInt32
		var tagNPCs, tagLocs, tagQuests sql.NullString

		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&campID,
			&charID,
			&entry.Title,
			&cont,
			&sessDate,
			&sessNum,
			&tagNPCs,
			&tagLocs,
			&tagQuests,
			&entry.IsPrivate,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&entry.CampaignID, campID)
		AssignNullString(&entry.CharacterID, charID)
		AssignNullString(&entry.Content, cont)
		AssignNullString(&entry.SessionDate, sessDate)
		AssignNullInt32(&entry.SessionNumber, sessNum)
		AssignNullStringToBytes(&entry.TaggedNPCs, tagNPCs)
		AssignNullStringToBytes(&entry.TaggedLocations, tagLocs)
		AssignNullStringToBytes(&entry.TaggedQuests, tagQuests)

		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

// UpdatePlayerJournalEntry updates a journal entry.
func (ops *PlayerModeOperations) UpdatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	entry.UpdatedAt = time.Now()

	query := `UPDATE player_journal_entries SET
		title = ` + ops.qb.Placeholder(1) + `, content = ` + ops.qb.Placeholder(2) + `,
		session_date = ` + ops.qb.Placeholder(3) + `, session_number = ` + ops.qb.Placeholder(4) + `,
		tagged_npcs = ` + ops.qb.Placeholder(5) + `, tagged_locations = ` + ops.qb.Placeholder(6) + `,
		tagged_quests = ` + ops.qb.Placeholder(7) + `, is_private = ` + ops.qb.Placeholder(8) + `,
		updated_at = ` + ops.qb.Placeholder(9) + `
		WHERE id = ` + ops.qb.Placeholder(10)

	_, err := ops.exec.Exec(ctx, query,
		entry.Title,
		entry.Content,
		entry.SessionDate,
		entry.SessionNumber,
		entry.TaggedNPCs,
		entry.TaggedLocations,
		entry.TaggedQuests,
		entry.IsPrivate,
		entry.UpdatedAt,
		entry.ID,
	)
	return err
}

// DeletePlayerJournalEntry deletes a journal entry.
func (ops *PlayerModeOperations) DeletePlayerJournalEntry(ctx context.Context, id string) error {
	query := `DELETE FROM player_journal_entries WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// PLAYER QUEST TRACKING OPERATIONS
// ============================================================================

// CreatePlayerQuestTracking creates a new quest tracking entry.
func (ops *PlayerModeOperations) CreatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	if quest.ID == "" {
		quest.ID = generateUUID()
	}
	quest.StartedAt = time.Now()
	quest.CreatedAt = time.Now()
	quest.UpdatedAt = time.Now()

	query := `INSERT INTO player_quest_tracking
		(id, user_id, campaign_id, character_id, quest_id, title, description, quest_type, status,
		objectives, priority, notes, started_at, completed_at, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(16) + `)`

	_, err := ops.exec.Exec(ctx, query,
		quest.ID,
		quest.UserID,
		quest.CampaignID,
		quest.CharacterID,
		quest.QuestID,
		quest.Title,
		quest.Description,
		quest.QuestType,
		quest.Status,
		quest.Objectives,
		quest.Priority,
		quest.Notes,
		quest.StartedAt,
		quest.CompletedAt,
		quest.CreatedAt,
		quest.UpdatedAt,
	)
	return err
}

// GetPlayerQuestTrackingByID retrieves a quest tracking entry by ID.
func (ops *PlayerModeOperations) GetPlayerQuestTrackingByID(ctx context.Context, id string) (*PlayerQuestTracking, error) {
	query := `SELECT id, user_id, campaign_id, character_id, quest_id, title, description, quest_type, status,
		objectives, priority, notes, started_at, completed_at, created_at, updated_at
		FROM player_quest_tracking WHERE id = ` + ops.qb.Placeholder(1)

	quest := &PlayerQuestTracking{}
	var campaignID, characterID, questID, description, notes sql.NullString
	var completedAt sql.NullTime
	var objectives sql.NullString

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&quest.ID,
		&quest.UserID,
		&campaignID,
		&characterID,
		&questID,
		&quest.Title,
		&description,
		&quest.QuestType,
		&quest.Status,
		&objectives,
		&quest.Priority,
		&notes,
		&quest.StartedAt,
		&completedAt,
		&quest.CreatedAt,
		&quest.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&quest.CampaignID, campaignID)
	AssignNullString(&quest.CharacterID, characterID)
	AssignNullString(&quest.QuestID, questID)
	AssignNullString(&quest.Description, description)
	AssignNullString(&quest.Notes, notes)
	AssignNullTime(&quest.CompletedAt, completedAt)
	AssignNullStringToBytes(&quest.Objectives, objectives)

	return quest, nil
}

// ListPlayerQuestTracking lists quest tracking entries for a user.
func (ops *PlayerModeOperations) ListPlayerQuestTracking(ctx context.Context, userID string, campaignID *string, status *string) ([]*PlayerQuestTracking, error) {
	query := `SELECT id, user_id, campaign_id, character_id, quest_id, title, description, quest_type, status,
		objectives, priority, notes, started_at, completed_at, created_at, updated_at
		FROM player_quest_tracking WHERE user_id = ` + ops.qb.Placeholder(1)
	args := []interface{}{userID}
	paramNum := 2

	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(paramNum)
		args = append(args, *campaignID)
		paramNum++
	}
	if status != nil {
		query += ` AND status = ` + ops.qb.Placeholder(paramNum)
		args = append(args, *status)
	}

	query += ` ORDER BY priority DESC, started_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var quests []*PlayerQuestTracking
	for rows.Next() {
		quest := &PlayerQuestTracking{}
		var campID, charID, qID, desc, n sql.NullString
		var compAt sql.NullTime
		var objs sql.NullString

		err := rows.Scan(
			&quest.ID,
			&quest.UserID,
			&campID,
			&charID,
			&qID,
			&quest.Title,
			&desc,
			&quest.QuestType,
			&quest.Status,
			&objs,
			&quest.Priority,
			&n,
			&quest.StartedAt,
			&compAt,
			&quest.CreatedAt,
			&quest.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&quest.CampaignID, campID)
		AssignNullString(&quest.CharacterID, charID)
		AssignNullString(&quest.QuestID, qID)
		AssignNullString(&quest.Description, desc)
		AssignNullString(&quest.Notes, n)
		AssignNullTime(&quest.CompletedAt, compAt)
		AssignNullStringToBytes(&quest.Objectives, objs)

		quests = append(quests, quest)
	}

	return quests, rows.Err()
}

// UpdatePlayerQuestTracking updates a quest tracking entry.
func (ops *PlayerModeOperations) UpdatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	quest.UpdatedAt = time.Now()

	query := `UPDATE player_quest_tracking SET
		title = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
		quest_type = ` + ops.qb.Placeholder(3) + `, status = ` + ops.qb.Placeholder(4) + `,
		objectives = ` + ops.qb.Placeholder(5) + `, priority = ` + ops.qb.Placeholder(6) + `,
		notes = ` + ops.qb.Placeholder(7) + `, completed_at = ` + ops.qb.Placeholder(8) + `,
		updated_at = ` + ops.qb.Placeholder(9) + `
		WHERE id = ` + ops.qb.Placeholder(10)

	_, err := ops.exec.Exec(ctx, query,
		quest.Title,
		quest.Description,
		quest.QuestType,
		quest.Status,
		quest.Objectives,
		quest.Priority,
		quest.Notes,
		quest.CompletedAt,
		quest.UpdatedAt,
		quest.ID,
	)
	return err
}

// DeletePlayerQuestTracking deletes a quest tracking entry.
func (ops *PlayerModeOperations) DeletePlayerQuestTracking(ctx context.Context, id string) error {
	query := `DELETE FROM player_quest_tracking WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// PLAYER NPC ENCOUNTER OPERATIONS
// ============================================================================

// CreatePlayerNPCEncounter creates a new NPC encounter log entry.
func (ops *PlayerModeOperations) CreatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	encounter.CreatedAt = time.Now()
	encounter.UpdatedAt = time.Now()

	query := `INSERT INTO player_npc_encounters
		(id, user_id, campaign_id, npc_id, name, description, relationship,
		first_met_session, first_met_location, last_interaction, notes, is_gm_revealed, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(14) + `)`

	_, err := ops.exec.Exec(ctx, query,
		encounter.ID,
		encounter.UserID,
		encounter.CampaignID,
		encounter.NPCID,
		encounter.Name,
		encounter.Description,
		encounter.Relationship,
		encounter.FirstMetSession,
		encounter.FirstMetLocation,
		encounter.LastInteraction,
		encounter.Notes,
		encounter.IsGMRevealed,
		encounter.CreatedAt,
		encounter.UpdatedAt,
	)
	return err
}

// GetPlayerNPCEncounterByID retrieves an NPC encounter by ID.
func (ops *PlayerModeOperations) GetPlayerNPCEncounterByID(ctx context.Context, id string) (*PlayerNPCEncounter, error) {
	query := `SELECT id, user_id, campaign_id, npc_id, name, description, relationship,
		first_met_session, first_met_location, last_interaction, notes, is_gm_revealed, created_at, updated_at
		FROM player_npc_encounters WHERE id = ` + ops.qb.Placeholder(1)

	encounter := &PlayerNPCEncounter{}
	var campaignID, npcID, description, firstMetLocation, notes sql.NullString
	var firstMetSession sql.NullInt32
	var lastInteraction sql.NullTime

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&encounter.ID,
		&encounter.UserID,
		&campaignID,
		&npcID,
		&encounter.Name,
		&description,
		&encounter.Relationship,
		&firstMetSession,
		&firstMetLocation,
		&lastInteraction,
		&notes,
		&encounter.IsGMRevealed,
		&encounter.CreatedAt,
		&encounter.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&encounter.CampaignID, campaignID)
	AssignNullString(&encounter.NPCID, npcID)
	AssignNullString(&encounter.Description, description)
	AssignNullInt32(&encounter.FirstMetSession, firstMetSession)
	AssignNullString(&encounter.FirstMetLocation, firstMetLocation)
	AssignNullTime(&encounter.LastInteraction, lastInteraction)
	AssignNullString(&encounter.Notes, notes)

	return encounter, nil
}

// ListPlayerNPCEncounters lists NPC encounters for a user.
func (ops *PlayerModeOperations) ListPlayerNPCEncounters(ctx context.Context, userID string, campaignID *string) ([]*PlayerNPCEncounter, error) {
	query := `SELECT id, user_id, campaign_id, npc_id, name, description, relationship,
		first_met_session, first_met_location, last_interaction, notes, is_gm_revealed, created_at, updated_at
		FROM player_npc_encounters WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY name`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var encounters []*PlayerNPCEncounter
	for rows.Next() {
		encounter := &PlayerNPCEncounter{}
		var campID, nID, desc, fmLoc, n sql.NullString
		var fmSession sql.NullInt32
		var lastInt sql.NullTime

		err := rows.Scan(
			&encounter.ID,
			&encounter.UserID,
			&campID,
			&nID,
			&encounter.Name,
			&desc,
			&encounter.Relationship,
			&fmSession,
			&fmLoc,
			&lastInt,
			&n,
			&encounter.IsGMRevealed,
			&encounter.CreatedAt,
			&encounter.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&encounter.CampaignID, campID)
		AssignNullString(&encounter.NPCID, nID)
		AssignNullString(&encounter.Description, desc)
		AssignNullInt32(&encounter.FirstMetSession, fmSession)
		AssignNullString(&encounter.FirstMetLocation, fmLoc)
		AssignNullTime(&encounter.LastInteraction, lastInt)
		AssignNullString(&encounter.Notes, n)

		encounters = append(encounters, encounter)
	}

	return encounters, rows.Err()
}

// UpdatePlayerNPCEncounter updates an NPC encounter.
func (ops *PlayerModeOperations) UpdatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	encounter.UpdatedAt = time.Now()

	query := `UPDATE player_npc_encounters SET
		name = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
		relationship = ` + ops.qb.Placeholder(3) + `, first_met_session = ` + ops.qb.Placeholder(4) + `,
		first_met_location = ` + ops.qb.Placeholder(5) + `, last_interaction = ` + ops.qb.Placeholder(6) + `,
		notes = ` + ops.qb.Placeholder(7) + `, updated_at = ` + ops.qb.Placeholder(8) + `
		WHERE id = ` + ops.qb.Placeholder(9)

	_, err := ops.exec.Exec(ctx, query,
		encounter.Name,
		encounter.Description,
		encounter.Relationship,
		encounter.FirstMetSession,
		encounter.FirstMetLocation,
		encounter.LastInteraction,
		encounter.Notes,
		encounter.UpdatedAt,
		encounter.ID,
	)
	return err
}

// DeletePlayerNPCEncounter deletes an NPC encounter.
func (ops *PlayerModeOperations) DeletePlayerNPCEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM player_npc_encounters WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// PLAYER LOCATION VISIT OPERATIONS
// ============================================================================

// CreatePlayerLocationVisit creates a new location visit log entry.
func (ops *PlayerModeOperations) CreatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	if visit.ID == "" {
		visit.ID = generateUUID()
	}
	visit.CreatedAt = time.Now()
	visit.UpdatedAt = time.Now()

	query := `INSERT INTO player_location_visits
		(id, user_id, campaign_id, location_id, name, description, first_visit_session, notes, is_gm_revealed, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(11) + `)`

	_, err := ops.exec.Exec(ctx, query,
		visit.ID,
		visit.UserID,
		visit.CampaignID,
		visit.LocationID,
		visit.Name,
		visit.Description,
		visit.FirstVisitSession,
		visit.Notes,
		visit.IsGMRevealed,
		visit.CreatedAt,
		visit.UpdatedAt,
	)
	return err
}

// GetPlayerLocationVisitByID retrieves a location visit by ID.
func (ops *PlayerModeOperations) GetPlayerLocationVisitByID(ctx context.Context, id string) (*PlayerLocationVisit, error) {
	query := `SELECT id, user_id, campaign_id, location_id, name, description, first_visit_session, notes, is_gm_revealed, created_at, updated_at
		FROM player_location_visits WHERE id = ` + ops.qb.Placeholder(1)

	visit := &PlayerLocationVisit{}
	var campaignID, locationID, description, notes sql.NullString
	var firstVisitSession sql.NullInt32

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&visit.ID,
		&visit.UserID,
		&campaignID,
		&locationID,
		&visit.Name,
		&description,
		&firstVisitSession,
		&notes,
		&visit.IsGMRevealed,
		&visit.CreatedAt,
		&visit.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&visit.CampaignID, campaignID)
	AssignNullString(&visit.LocationID, locationID)
	AssignNullString(&visit.Description, description)
	AssignNullInt32(&visit.FirstVisitSession, firstVisitSession)
	AssignNullString(&visit.Notes, notes)

	return visit, nil
}

// ListPlayerLocationVisits lists location visits for a user.
func (ops *PlayerModeOperations) ListPlayerLocationVisits(ctx context.Context, userID string, campaignID *string) ([]*PlayerLocationVisit, error) {
	query := `SELECT id, user_id, campaign_id, location_id, name, description, first_visit_session, notes, is_gm_revealed, created_at, updated_at
		FROM player_location_visits WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY name`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var visits []*PlayerLocationVisit
	for rows.Next() {
		visit := &PlayerLocationVisit{}
		var campID, locID, desc, n sql.NullString
		var fvSession sql.NullInt32

		err := rows.Scan(
			&visit.ID,
			&visit.UserID,
			&campID,
			&locID,
			&visit.Name,
			&desc,
			&fvSession,
			&n,
			&visit.IsGMRevealed,
			&visit.CreatedAt,
			&visit.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&visit.CampaignID, campID)
		AssignNullString(&visit.LocationID, locID)
		AssignNullString(&visit.Description, desc)
		AssignNullInt32(&visit.FirstVisitSession, fvSession)
		AssignNullString(&visit.Notes, n)

		visits = append(visits, visit)
	}

	return visits, rows.Err()
}

// UpdatePlayerLocationVisit updates a location visit.
func (ops *PlayerModeOperations) UpdatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	visit.UpdatedAt = time.Now()

	query := `UPDATE player_location_visits SET
		name = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
		first_visit_session = ` + ops.qb.Placeholder(3) + `, notes = ` + ops.qb.Placeholder(4) + `,
		updated_at = ` + ops.qb.Placeholder(5) + `
		WHERE id = ` + ops.qb.Placeholder(6)

	_, err := ops.exec.Exec(ctx, query,
		visit.Name,
		visit.Description,
		visit.FirstVisitSession,
		visit.Notes,
		visit.UpdatedAt,
		visit.ID,
	)
	return err
}

// DeletePlayerLocationVisit deletes a location visit.
func (ops *PlayerModeOperations) DeletePlayerLocationVisit(ctx context.Context, id string) error {
	query := `DELETE FROM player_location_visits WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// PARTY LOOT OPERATIONS
// ============================================================================

// CreatePartyLoot creates a new party loot item.
func (ops *PlayerModeOperations) CreatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	if loot.ID == "" {
		loot.ID = generateUUID()
	}
	loot.CreatedAt = time.Now()
	loot.UpdatedAt = time.Now()

	query := `INSERT INTO party_loot
		(id, campaign_id, item_id, name, description, quantity, value, claimed_by, claimed_by_name,
		source, session_acquired, notes, created_by, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(15) + `)`

	_, err := ops.exec.Exec(ctx, query,
		loot.ID,
		loot.CampaignID,
		loot.ItemID,
		loot.Name,
		loot.Description,
		loot.Quantity,
		loot.Value,
		loot.ClaimedBy,
		loot.ClaimedByName,
		loot.Source,
		loot.SessionAcquired,
		loot.Notes,
		loot.CreatedBy,
		loot.CreatedAt,
		loot.UpdatedAt,
	)
	return err
}

// GetPartyLootByID retrieves a party loot item by ID.
func (ops *PlayerModeOperations) GetPartyLootByID(ctx context.Context, id string) (*PartyLoot, error) {
	query := `SELECT id, campaign_id, item_id, name, description, quantity, value, claimed_by, claimed_by_name,
		source, session_acquired, notes, created_by, created_at, updated_at
		FROM party_loot WHERE id = ` + ops.qb.Placeholder(1)

	loot := &PartyLoot{}
	var itemID, description, value, claimedBy, claimedByName, source, notes sql.NullString
	var sessionAcquired sql.NullInt32

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&loot.ID,
		&loot.CampaignID,
		&itemID,
		&loot.Name,
		&description,
		&loot.Quantity,
		&value,
		&claimedBy,
		&claimedByName,
		&source,
		&sessionAcquired,
		&notes,
		&loot.CreatedBy,
		&loot.CreatedAt,
		&loot.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&loot.ItemID, itemID)
	AssignNullString(&loot.Description, description)
	AssignNullString(&loot.Value, value)
	AssignNullString(&loot.ClaimedBy, claimedBy)
	AssignNullString(&loot.ClaimedByName, claimedByName)
	AssignNullString(&loot.Source, source)
	AssignNullInt32(&loot.SessionAcquired, sessionAcquired)
	AssignNullString(&loot.Notes, notes)

	return loot, nil
}

// ListPartyLoot lists all loot for a campaign.
func (ops *PlayerModeOperations) ListPartyLoot(ctx context.Context, campaignID string) ([]*PartyLoot, error) {
	query := `SELECT id, campaign_id, item_id, name, description, quantity, value, claimed_by, claimed_by_name,
		source, session_acquired, notes, created_by, created_at, updated_at
		FROM party_loot WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var items []*PartyLoot
	for rows.Next() {
		loot := &PartyLoot{}
		var iID, desc, val, clBy, clByName, src, n sql.NullString
		var sessAcq sql.NullInt32

		err := rows.Scan(
			&loot.ID,
			&loot.CampaignID,
			&iID,
			&loot.Name,
			&desc,
			&loot.Quantity,
			&val,
			&clBy,
			&clByName,
			&src,
			&sessAcq,
			&n,
			&loot.CreatedBy,
			&loot.CreatedAt,
			&loot.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&loot.ItemID, iID)
		AssignNullString(&loot.Description, desc)
		AssignNullString(&loot.Value, val)
		AssignNullString(&loot.ClaimedBy, clBy)
		AssignNullString(&loot.ClaimedByName, clByName)
		AssignNullString(&loot.Source, src)
		AssignNullInt32(&loot.SessionAcquired, sessAcq)
		AssignNullString(&loot.Notes, n)

		items = append(items, loot)
	}

	return items, rows.Err()
}

// UpdatePartyLoot updates a party loot item.
func (ops *PlayerModeOperations) UpdatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	loot.UpdatedAt = time.Now()

	query := `UPDATE party_loot SET
		name = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
		quantity = ` + ops.qb.Placeholder(3) + `, value = ` + ops.qb.Placeholder(4) + `,
		claimed_by = ` + ops.qb.Placeholder(5) + `, claimed_by_name = ` + ops.qb.Placeholder(6) + `,
		source = ` + ops.qb.Placeholder(7) + `, session_acquired = ` + ops.qb.Placeholder(8) + `,
		notes = ` + ops.qb.Placeholder(9) + `, updated_at = ` + ops.qb.Placeholder(10) + `
		WHERE id = ` + ops.qb.Placeholder(11)

	_, err := ops.exec.Exec(ctx, query,
		loot.Name,
		loot.Description,
		loot.Quantity,
		loot.Value,
		loot.ClaimedBy,
		loot.ClaimedByName,
		loot.Source,
		loot.SessionAcquired,
		loot.Notes,
		loot.UpdatedAt,
		loot.ID,
	)
	return err
}

// DeletePartyLoot deletes a party loot item.
func (ops *PlayerModeOperations) DeletePartyLoot(ctx context.Context, id string) error {
	query := `DELETE FROM party_loot WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ClaimPartyLoot assigns a loot item to a character.
func (ops *PlayerModeOperations) ClaimPartyLoot(ctx context.Context, lootID string, characterID string, characterName string) error {
	query := `UPDATE party_loot SET claimed_by = ` + ops.qb.Placeholder(1) + `,
		claimed_by_name = ` + ops.qb.Placeholder(2) + `, updated_at = ` + ops.qb.Placeholder(3) + `
		WHERE id = ` + ops.qb.Placeholder(4)
	_, err := ops.exec.Exec(ctx, query, characterID, characterName, time.Now(), lootID)
	return err
}

// ============================================================================
// CONTENT REVEAL OPERATIONS
// ============================================================================

// CreateContentReveal creates a new content reveal.
func (ops *PlayerModeOperations) CreateContentReveal(ctx context.Context, reveal *ContentReveal) error {
	if reveal.ID == "" {
		reveal.ID = generateUUID()
	}
	reveal.RevealedAt = time.Now()

	query := `INSERT INTO content_reveals
		(id, campaign_id, revealed_by, content_type, content_id, reveal_level, custom_notes, revealed_at)
		VALUES (` + ops.qb.Placeholders(8) + `)
		ON CONFLICT (campaign_id, content_type, content_id) DO UPDATE
		SET reveal_level = ` + ops.qb.ExcludedCol("reveal_level") + `,
		custom_notes = ` + ops.qb.ExcludedCol("custom_notes") + `,
		revealed_at = ` + ops.qb.ExcludedCol("revealed_at")

	_, err := ops.exec.Exec(ctx, query,
		reveal.ID,
		reveal.CampaignID,
		reveal.RevealedBy,
		reveal.ContentType,
		reveal.ContentID,
		reveal.RevealLevel,
		reveal.CustomNotes,
		reveal.RevealedAt,
	)
	return err
}

// GetContentReveal retrieves a content reveal.
func (ops *PlayerModeOperations) GetContentReveal(ctx context.Context, campaignID, contentType, contentID string) (*ContentReveal, error) {
	query := `SELECT id, campaign_id, revealed_by, content_type, content_id, reveal_level, custom_notes, revealed_at
		FROM content_reveals WHERE campaign_id = ` + ops.qb.Placeholder(1) + `
		AND content_type = ` + ops.qb.Placeholder(2) + ` AND content_id = ` + ops.qb.Placeholder(3)

	reveal := &ContentReveal{}
	var customNotes sql.NullString

	err := ops.exec.QueryRow(ctx, query, campaignID, contentType, contentID).Scan(
		&reveal.ID,
		&reveal.CampaignID,
		&reveal.RevealedBy,
		&reveal.ContentType,
		&reveal.ContentID,
		&reveal.RevealLevel,
		&customNotes,
		&reveal.RevealedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&reveal.CustomNotes, customNotes)

	return reveal, nil
}

// ListContentReveals lists all revealed content for a campaign.
func (ops *PlayerModeOperations) ListContentReveals(ctx context.Context, campaignID string, contentType *string) ([]*ContentReveal, error) {
	query := `SELECT id, campaign_id, revealed_by, content_type, content_id, reveal_level, custom_notes, revealed_at
		FROM content_reveals WHERE campaign_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{campaignID}
	if contentType != nil {
		query += ` AND content_type = ` + ops.qb.Placeholder(2)
		args = append(args, *contentType)
	}
	query += ` ORDER BY revealed_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var reveals []*ContentReveal
	for rows.Next() {
		reveal := &ContentReveal{}
		var custNotes sql.NullString

		err := rows.Scan(
			&reveal.ID,
			&reveal.CampaignID,
			&reveal.RevealedBy,
			&reveal.ContentType,
			&reveal.ContentID,
			&reveal.RevealLevel,
			&custNotes,
			&reveal.RevealedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&reveal.CustomNotes, custNotes)

		reveals = append(reveals, reveal)
	}

	return reveals, rows.Err()
}

// DeleteContentReveal deletes a content reveal.
func (ops *PlayerModeOperations) DeleteContentReveal(ctx context.Context, id string) error {
	query := `DELETE FROM content_reveals WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// ABILITY USAGE TRACKING OPERATIONS
// ============================================================================

// CreateAbilityUsageTracking creates a new ability tracking entry.
func (ops *PlayerModeOperations) CreateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	if tracking.ID == "" {
		tracking.ID = generateUUID()
	}
	tracking.CreatedAt = time.Now()
	tracking.UpdatedAt = time.Now()

	query := `INSERT INTO ability_usage_tracking
		(id, user_id, character_id, ability_name, ability_type, max_uses, current_uses,
		recharge_type, notes, last_used, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(12) + `)
		ON CONFLICT (character_id, ability_name) DO UPDATE
		SET ability_type = ` + ops.qb.ExcludedCol("ability_type") + `,
		max_uses = ` + ops.qb.ExcludedCol("max_uses") + `,
		current_uses = ` + ops.qb.ExcludedCol("current_uses") + `,
		recharge_type = ` + ops.qb.ExcludedCol("recharge_type") + `,
		notes = ` + ops.qb.ExcludedCol("notes") + `,
		updated_at = ` + ops.qb.ExcludedCol("updated_at")

	_, err := ops.exec.Exec(ctx, query,
		tracking.ID,
		tracking.UserID,
		tracking.CharacterID,
		tracking.AbilityName,
		tracking.AbilityType,
		tracking.MaxUses,
		tracking.CurrentUses,
		tracking.RechargeType,
		tracking.Notes,
		tracking.LastUsed,
		tracking.CreatedAt,
		tracking.UpdatedAt,
	)
	return err
}

// GetAbilityUsageTrackingByID retrieves an ability tracking entry by ID.
func (ops *PlayerModeOperations) GetAbilityUsageTrackingByID(ctx context.Context, id string) (*AbilityUsageTracking, error) {
	query := `SELECT id, user_id, character_id, ability_name, ability_type, max_uses, current_uses,
		recharge_type, notes, last_used, created_at, updated_at
		FROM ability_usage_tracking WHERE id = ` + ops.qb.Placeholder(1)

	tracking := &AbilityUsageTracking{}
	var abilityType, rechargeType, notes sql.NullString
	var lastUsed sql.NullTime

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&tracking.ID,
		&tracking.UserID,
		&tracking.CharacterID,
		&tracking.AbilityName,
		&abilityType,
		&tracking.MaxUses,
		&tracking.CurrentUses,
		&rechargeType,
		&notes,
		&lastUsed,
		&tracking.CreatedAt,
		&tracking.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&tracking.AbilityType, abilityType)
	AssignNullString(&tracking.RechargeType, rechargeType)
	AssignNullString(&tracking.Notes, notes)
	AssignNullTime(&tracking.LastUsed, lastUsed)

	return tracking, nil
}

// ListAbilityUsageTracking lists all ability tracking for a character.
func (ops *PlayerModeOperations) ListAbilityUsageTracking(ctx context.Context, characterID string) ([]*AbilityUsageTracking, error) {
	query := `SELECT id, user_id, character_id, ability_name, ability_type, max_uses, current_uses,
		recharge_type, notes, last_used, created_at, updated_at
		FROM ability_usage_tracking WHERE character_id = ` + ops.qb.Placeholder(1) + ` ORDER BY ability_name`

	rows, err := ops.exec.Query(ctx, query, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var trackings []*AbilityUsageTracking
	for rows.Next() {
		tracking := &AbilityUsageTracking{}
		var abType, rechType, n sql.NullString
		var lastU sql.NullTime

		err := rows.Scan(
			&tracking.ID,
			&tracking.UserID,
			&tracking.CharacterID,
			&tracking.AbilityName,
			&abType,
			&tracking.MaxUses,
			&tracking.CurrentUses,
			&rechType,
			&n,
			&lastU,
			&tracking.CreatedAt,
			&tracking.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		AssignNullString(&tracking.AbilityType, abType)
		AssignNullString(&tracking.RechargeType, rechType)
		AssignNullString(&tracking.Notes, n)
		AssignNullTime(&tracking.LastUsed, lastU)

		trackings = append(trackings, tracking)
	}

	return trackings, rows.Err()
}

// UpdateAbilityUsageTracking updates an ability tracking entry.
func (ops *PlayerModeOperations) UpdateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	tracking.UpdatedAt = time.Now()

	query := `UPDATE ability_usage_tracking SET
		ability_type = ` + ops.qb.Placeholder(1) + `, max_uses = ` + ops.qb.Placeholder(2) + `,
		current_uses = ` + ops.qb.Placeholder(3) + `, recharge_type = ` + ops.qb.Placeholder(4) + `,
		notes = ` + ops.qb.Placeholder(5) + `, last_used = ` + ops.qb.Placeholder(6) + `,
		updated_at = ` + ops.qb.Placeholder(7) + `
		WHERE id = ` + ops.qb.Placeholder(8)

	_, err := ops.exec.Exec(ctx, query,
		tracking.AbilityType,
		tracking.MaxUses,
		tracking.CurrentUses,
		tracking.RechargeType,
		tracking.Notes,
		tracking.LastUsed,
		tracking.UpdatedAt,
		tracking.ID,
	)
	return err
}

// DeleteAbilityUsageTracking deletes an ability tracking entry.
func (ops *PlayerModeOperations) DeleteAbilityUsageTracking(ctx context.Context, id string) error {
	query := `DELETE FROM ability_usage_tracking WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// UseAbility decrements the current uses of an ability.
func (ops *PlayerModeOperations) UseAbility(ctx context.Context, id string) error {
	// Use MAX for SQLite, GREATEST for PostgreSQL - but MAX works in both for this case
	query := fmt.Sprintf(`UPDATE ability_usage_tracking SET
		current_uses = %s(current_uses - 1, 0),
		last_used = `+ops.qb.Placeholder(1)+`,
		updated_at = `+ops.qb.Placeholder(2)+`
		WHERE id = `+ops.qb.Placeholder(3), ops.qb.MaxFunc())
	now := time.Now()
	_, err := ops.exec.Exec(ctx, query, now, now, id)
	return err
}

// ResetAbility resets the current uses to max uses.
func (ops *PlayerModeOperations) ResetAbility(ctx context.Context, id string) error {
	query := `UPDATE ability_usage_tracking SET current_uses = max_uses,
		updated_at = ` + ops.qb.Placeholder(1) + ` WHERE id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, time.Now(), id)
	return err
}

// ResetAbilitiesByRechargeType resets all abilities of a certain recharge type for a character.
func (ops *PlayerModeOperations) ResetAbilitiesByRechargeType(ctx context.Context, characterID string, rechargeType string) error {
	query := `UPDATE ability_usage_tracking SET current_uses = max_uses,
		updated_at = ` + ops.qb.Placeholder(1) + `
		WHERE character_id = ` + ops.qb.Placeholder(2) + ` AND recharge_type = ` + ops.qb.Placeholder(3)
	_, err := ops.exec.Exec(ctx, query, time.Now(), characterID, rechargeType)
	return err
}

// ============================================================================
// PLAYER COMBAT STATE OPERATIONS
// ============================================================================

// CreatePlayerCombatState creates a new player combat state.
func (ops *PlayerModeOperations) CreatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	if state.ID == "" {
		state.ID = generateUUID()
	}
	state.CreatedAt = time.Now()
	state.UpdatedAt = time.Now()

	// Default conditions to empty array if nil
	if state.Conditions == nil {
		state.Conditions = []byte("[]")
	}

	query := `INSERT INTO player_combat_state
		(id, user_id, character_id, campaign_id, is_in_combat, current_hp, max_hp, temp_hp,
		conditions, concentration_spell, reaction_used, initiative, notes, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(15) + `)`

	_, err := ops.exec.Exec(ctx, query,
		state.ID,
		state.UserID,
		state.CharacterID,
		state.CampaignID,
		state.IsInCombat,
		state.CurrentHP,
		state.MaxHP,
		state.TempHP,
		state.Conditions,
		state.ConcentrationSpell,
		state.ReactionUsed,
		state.Initiative,
		state.Notes,
		state.CreatedAt,
		state.UpdatedAt,
	)
	return err
}

// GetPlayerCombatStateByCharacterID retrieves combat state for a character.
func (ops *PlayerModeOperations) GetPlayerCombatStateByCharacterID(ctx context.Context, characterID string) (*PlayerCombatState, error) {
	query := `SELECT id, user_id, character_id, campaign_id, is_in_combat, current_hp, max_hp, temp_hp,
		conditions, concentration_spell, reaction_used, initiative, notes, created_at, updated_at
		FROM player_combat_state WHERE character_id = ` + ops.qb.Placeholder(1)

	state := &PlayerCombatState{}
	var campaignID, concentrationSpell, notes sql.NullString
	var initiative sql.NullInt64
	var conditions sql.NullString

	err := ops.exec.QueryRow(ctx, query, characterID).Scan(
		&state.ID,
		&state.UserID,
		&state.CharacterID,
		&campaignID,
		&state.IsInCombat,
		&state.CurrentHP,
		&state.MaxHP,
		&state.TempHP,
		&conditions,
		&concentrationSpell,
		&state.ReactionUsed,
		&initiative,
		&notes,
		&state.CreatedAt,
		&state.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	AssignNullString(&state.CampaignID, campaignID)
	AssignNullString(&state.ConcentrationSpell, concentrationSpell)
	AssignNullString(&state.Notes, notes)
	AssignNullInt64ToInt(&state.Initiative, initiative)

	if conditions.Valid && conditions.String != "" {
		state.Conditions = []byte(conditions.String)
	} else {
		state.Conditions = []byte("[]")
	}

	return state, nil
}

// UpdatePlayerCombatState updates an existing player combat state.
func (ops *PlayerModeOperations) UpdatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	state.UpdatedAt = time.Now()

	query := `UPDATE player_combat_state SET
		campaign_id = ` + ops.qb.Placeholder(1) + `,
		is_in_combat = ` + ops.qb.Placeholder(2) + `,
		current_hp = ` + ops.qb.Placeholder(3) + `,
		max_hp = ` + ops.qb.Placeholder(4) + `,
		temp_hp = ` + ops.qb.Placeholder(5) + `,
		conditions = ` + ops.qb.Placeholder(6) + `,
		concentration_spell = ` + ops.qb.Placeholder(7) + `,
		reaction_used = ` + ops.qb.Placeholder(8) + `,
		initiative = ` + ops.qb.Placeholder(9) + `,
		notes = ` + ops.qb.Placeholder(10) + `,
		updated_at = ` + ops.qb.Placeholder(11) + `
		WHERE character_id = ` + ops.qb.Placeholder(12)

	_, err := ops.exec.Exec(ctx, query,
		state.CampaignID,
		state.IsInCombat,
		state.CurrentHP,
		state.MaxHP,
		state.TempHP,
		state.Conditions,
		state.ConcentrationSpell,
		state.ReactionUsed,
		state.Initiative,
		state.Notes,
		state.UpdatedAt,
		state.CharacterID,
	)
	return err
}

// UpsertPlayerCombatState creates or updates a player combat state.
func (ops *PlayerModeOperations) UpsertPlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	if state.ID == "" {
		state.ID = generateUUID()
	}
	state.UpdatedAt = time.Now()

	// Default conditions to empty array if nil
	if state.Conditions == nil {
		state.Conditions = []byte("[]")
	}

	query := `INSERT INTO player_combat_state
		(id, user_id, character_id, campaign_id, is_in_combat, current_hp, max_hp, temp_hp,
		conditions, concentration_spell, reaction_used, initiative, notes, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(15) + `)
		ON CONFLICT (character_id) DO UPDATE SET
		campaign_id = ` + ops.qb.ExcludedCol("campaign_id") + `,
		is_in_combat = ` + ops.qb.ExcludedCol("is_in_combat") + `,
		current_hp = ` + ops.qb.ExcludedCol("current_hp") + `,
		max_hp = ` + ops.qb.ExcludedCol("max_hp") + `,
		temp_hp = ` + ops.qb.ExcludedCol("temp_hp") + `,
		conditions = ` + ops.qb.ExcludedCol("conditions") + `,
		concentration_spell = ` + ops.qb.ExcludedCol("concentration_spell") + `,
		reaction_used = ` + ops.qb.ExcludedCol("reaction_used") + `,
		initiative = ` + ops.qb.ExcludedCol("initiative") + `,
		notes = ` + ops.qb.ExcludedCol("notes") + `,
		updated_at = ` + ops.qb.ExcludedCol("updated_at")

	_, err := ops.exec.Exec(ctx, query,
		state.ID,
		state.UserID,
		state.CharacterID,
		state.CampaignID,
		state.IsInCombat,
		state.CurrentHP,
		state.MaxHP,
		state.TempHP,
		state.Conditions,
		state.ConcentrationSpell,
		state.ReactionUsed,
		state.Initiative,
		state.Notes,
		time.Now(),
		state.UpdatedAt,
	)
	return err
}

// DeletePlayerCombatState deletes a player combat state by character ID.
func (ops *PlayerModeOperations) DeletePlayerCombatState(ctx context.Context, characterID string) error {
	query := `DELETE FROM player_combat_state WHERE character_id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, characterID)
	return err
}
