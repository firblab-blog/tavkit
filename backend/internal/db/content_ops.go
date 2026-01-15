package db

import (
	"context"
	"database/sql"
	"time"
)

// ContentOps provides common database operations for content entities.
// It uses the Executor interface and QueryBuilder to work with both SQLite and PostgreSQL.
type ContentOps struct {
	exec Executor
	qb   *QueryBuilder
}

// NewContentOps creates a new ContentOps with the given executor and query builder.
func NewContentOps(exec Executor, qb *QueryBuilder) *ContentOps {
	return &ContentOps{exec: exec, qb: qb}
}

// NPC column definitions for consistent query building
var npcColumns = []string{
	"id", "user_id", "campaign_id", "name", "race", "class",
	"personality", "backstory", "stats", "ai_generated", "ai_provider", "created_at",
}

var npcInsertColumns = []string{
	"id", "user_id", "campaign_id", "name", "race", "class",
	"personality", "backstory", "stats", "ai_generated", "ai_provider", "created_at",
}

var npcUpdateColumns = []string{
	"name", "race", "class", "personality", "backstory", "stats", "campaign_id",
}

// CreateNPC creates a new NPC in the database.
func (ops *ContentOps) CreateNPC(ctx context.Context, npc *NPC) error {
	if npc.ID == "" {
		npc.ID = generateUUID()
	}
	npc.CreatedAt = time.Now()

	query := ops.qb.BuildInsert("npcs", npcInsertColumns)

	_, err := ops.exec.Exec(ctx, query,
		npc.ID, npc.UserID, npc.CampaignID, npc.Name, npc.Race, npc.Class,
		npc.Personality, npc.Backstory, npc.Stats, npc.AIGenerated, npc.AIProvider, npc.CreatedAt)
	return err
}

// GetNPCByID retrieves an NPC by ID.
func (ops *ContentOps) GetNPCByID(ctx context.Context, id string) (*NPC, error) {
	query := ops.qb.BuildSelect("npcs", npcColumns, "id")

	npc := &NPC{}
	var stats sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&npc.ID, &npc.UserID, &npc.CampaignID, &npc.Name, &npc.Race, &npc.Class,
		&npc.Personality, &npc.Backstory, &stats, &npc.AIGenerated,
		&npc.AIProvider, &npc.CreatedAt)

	if err != nil {
		return nil, err
	}
	if stats.Valid {
		npc.Stats = []byte(stats.String)
	}
	return npc, nil
}

// ListNPCsByUserID retrieves all NPCs for a user, optionally filtered by campaign.
func (ops *ContentOps) ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error) {
	query := ops.qb.BuildSelectByUser("npcs", npcColumns, "created_at DESC")
	args := []interface{}{userID}

	if campaignID != nil {
		query += ops.qb.AppendCampaignFilter(2)
		args = append(args, *campaignID)
	}
	query += ops.qb.AppendOrderBy("created_at", true)

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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

// UpdateNPC updates an existing NPC.
func (ops *ContentOps) UpdateNPC(ctx context.Context, npc *NPC) error {
	query := ops.qb.BuildUpdate("npcs", npcUpdateColumns, "id")
	_, err := ops.exec.Exec(ctx, query,
		npc.Name, npc.Race, npc.Class, npc.Personality, npc.Backstory,
		npc.Stats, npc.CampaignID, npc.ID)
	return err
}

// DeleteNPC deletes an NPC by ID.
func (ops *ContentOps) DeleteNPC(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("npcs", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// Monster column definitions
var monsterColumns = []string{
	"id", "user_id", "campaign_id", "name", "cr", "stats",
	"lore", "tactics", "ai_generated", "created_at",
}

var monsterInsertColumns = []string{
	"id", "user_id", "campaign_id", "name", "cr", "stats",
	"lore", "tactics", "ai_generated", "created_at",
}

var monsterUpdateColumns = []string{
	"name", "cr", "stats", "lore", "tactics", "campaign_id",
}

// CreateMonster creates a new Monster in the database.
func (ops *ContentOps) CreateMonster(ctx context.Context, monster *Monster) error {
	if monster.ID == "" {
		monster.ID = generateUUID()
	}
	monster.CreatedAt = time.Now()

	query := ops.qb.BuildInsert("monsters", monsterInsertColumns)

	_, err := ops.exec.Exec(ctx, query,
		monster.ID, monster.UserID, monster.CampaignID, monster.Name, monster.CR,
		monster.Stats, monster.Lore, monster.Tactics, monster.AIGenerated, monster.CreatedAt)
	return err
}

// GetMonsterByID retrieves a Monster by ID.
func (ops *ContentOps) GetMonsterByID(ctx context.Context, id string) (*Monster, error) {
	query := ops.qb.BuildSelect("monsters", monsterColumns, "id")

	monster := &Monster{}
	var stats sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&monster.ID, &monster.UserID, &monster.CampaignID, &monster.Name, &monster.CR,
		&stats, &monster.Lore, &monster.Tactics, &monster.AIGenerated, &monster.CreatedAt)

	if err != nil {
		return nil, err
	}
	if stats.Valid {
		monster.Stats = []byte(stats.String)
	}
	return monster, nil
}

// ListMonstersByUserID retrieves all Monsters for a user, optionally filtered by campaign.
func (ops *ContentOps) ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error) {
	query := ops.qb.BuildSelectByUser("monsters", monsterColumns, "created_at DESC")
	args := []interface{}{userID}

	if campaignID != nil {
		query += ops.qb.AppendCampaignFilter(2)
		args = append(args, *campaignID)
	}
	query += ops.qb.AppendOrderBy("created_at", true)

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	var monsters []*Monster
	for rows.Next() {
		monster := &Monster{}
		var stats sql.NullString
		if err := rows.Scan(&monster.ID, &monster.UserID, &monster.CampaignID, &monster.Name, &monster.CR,
			&stats, &monster.Lore, &monster.Tactics, &monster.AIGenerated, &monster.CreatedAt); err != nil {
			return nil, err
		}
		if stats.Valid {
			monster.Stats = []byte(stats.String)
		}
		monsters = append(monsters, monster)
	}

	return monsters, rows.Err()
}

// UpdateMonster updates an existing Monster.
func (ops *ContentOps) UpdateMonster(ctx context.Context, monster *Monster) error {
	query := ops.qb.BuildUpdate("monsters", monsterUpdateColumns, "id")
	_, err := ops.exec.Exec(ctx, query,
		monster.Name, monster.CR, monster.Stats, monster.Lore,
		monster.Tactics, monster.CampaignID, monster.ID)
	return err
}

// DeleteMonster deletes a Monster by ID.
func (ops *ContentOps) DeleteMonster(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("monsters", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// ENCOUNTER OPERATIONS
// ============================================================================

// CreateEncounter creates a new Encounter in the database.
func (ops *ContentOps) CreateEncounter(ctx context.Context, encounter *Encounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	encounter.CreatedAt = time.Now()

	query := `INSERT INTO encounters (id, user_id, campaign_id, name, party_level, party_size, difficulty,
		description, environment, creatures, treasure, xp_total, xp_per_player, notes,
		ai_generated, created_at)
		VALUES (` + ops.qb.Placeholders(16) + `)`

	_, err := ops.exec.Exec(ctx, query,
		encounter.ID, encounter.UserID, encounter.CampaignID, encounter.Name, encounter.PartyLevel, encounter.PartySize,
		encounter.Difficulty, encounter.Description, encounter.Environment, encounter.Creatures,
		encounter.Treasure, encounter.XPTotal, encounter.XPPerPlayer, encounter.Notes, encounter.AIGenerated, encounter.CreatedAt)
	return err
}

// GetEncounterByID retrieves an Encounter by ID.
func (ops *ContentOps) GetEncounterByID(ctx context.Context, id string) (*Encounter, error) {
	query := `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
		environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
		FROM encounters WHERE id = ` + ops.qb.Placeholder(1)

	encounter := &Encounter{}
	var environment, creatures, treasure sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&encounter.ID, &encounter.UserID, &encounter.CampaignID, &encounter.Name, &encounter.PartyLevel, &encounter.PartySize,
		&encounter.Difficulty, &encounter.Description, &environment, &creatures,
		&treasure, &encounter.XPTotal, &encounter.XPPerPlayer, &encounter.Notes,
		&encounter.AIGenerated, &encounter.CreatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&encounter.Environment, environment)
	AssignNullStringToBytes(&encounter.Creatures, creatures)
	AssignNullStringToBytes(&encounter.Treasure, treasure)
	return encounter, nil
}

// ListEncountersByUserID retrieves all Encounters for a user, optionally filtered by campaign.
func (ops *ContentOps) ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error) {
	query := `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
		environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
		FROM encounters WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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
		AssignNullStringToBytes(&encounter.Environment, environment)
		AssignNullStringToBytes(&encounter.Creatures, creatures)
		AssignNullStringToBytes(&encounter.Treasure, treasure)
		encounters = append(encounters, encounter)
	}
	return encounters, rows.Err()
}

// UpdateEncounter updates an existing Encounter.
func (ops *ContentOps) UpdateEncounter(ctx context.Context, encounter *Encounter) error {
	query := `UPDATE encounters SET name = ` + ops.qb.Placeholder(1) + `, party_level = ` + ops.qb.Placeholder(2) + `,
		party_size = ` + ops.qb.Placeholder(3) + `, difficulty = ` + ops.qb.Placeholder(4) + `,
		description = ` + ops.qb.Placeholder(5) + `, environment = ` + ops.qb.Placeholder(6) + `,
		creatures = ` + ops.qb.Placeholder(7) + `, treasure = ` + ops.qb.Placeholder(8) + `,
		xp_total = ` + ops.qb.Placeholder(9) + `, xp_per_player = ` + ops.qb.Placeholder(10) + `,
		notes = ` + ops.qb.Placeholder(11) + `, campaign_id = ` + ops.qb.Placeholder(12) + `
		WHERE id = ` + ops.qb.Placeholder(13)

	_, err := ops.exec.Exec(ctx, query, encounter.Name, encounter.PartyLevel,
		encounter.PartySize, encounter.Difficulty, encounter.Description, encounter.Environment,
		encounter.Creatures, encounter.Treasure, encounter.XPTotal, encounter.XPPerPlayer,
		encounter.Notes, encounter.CampaignID, encounter.ID)
	return err
}

// DeleteEncounter deletes an Encounter by ID.
func (ops *ContentOps) DeleteEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM encounters WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// DIALOGUE OPERATIONS
// ============================================================================

// CreateDialogue creates a new Dialogue in the database.
func (ops *ContentOps) CreateDialogue(ctx context.Context, dialogue *Dialogue) error {
	if dialogue.ID == "" {
		dialogue.ID = generateUUID()
	}
	dialogue.CreatedAt = time.Now()

	query := `INSERT INTO dialogues (id, user_id, campaign_id, character_name, scene_setting, mood,
		dialogue_tree, skill_checks, information, potential_quests, ai_generated, created_at)
		VALUES (` + ops.qb.Placeholders(12) + `)`

	_, err := ops.exec.Exec(ctx, query,
		dialogue.ID, dialogue.UserID, dialogue.CampaignID, dialogue.CharacterName, dialogue.SceneSetting, dialogue.Mood,
		dialogue.DialogueTree, dialogue.SkillChecks, dialogue.Information, dialogue.PotentialQuests,
		dialogue.AIGenerated, dialogue.CreatedAt)
	return err
}

// GetDialogueByID retrieves a Dialogue by ID.
func (ops *ContentOps) GetDialogueByID(ctx context.Context, id string) (*Dialogue, error) {
	query := `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
		skill_checks, information, potential_quests, ai_generated, created_at
		FROM dialogues WHERE id = ` + ops.qb.Placeholder(1)

	dialogue := &Dialogue{}
	var dialogueTree, skillChecks, information, potentialQuests sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&dialogue.ID, &dialogue.UserID, &dialogue.CampaignID, &dialogue.CharacterName, &dialogue.SceneSetting, &dialogue.Mood,
		&dialogueTree, &skillChecks, &information, &potentialQuests,
		&dialogue.AIGenerated, &dialogue.CreatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&dialogue.DialogueTree, dialogueTree)
	AssignNullStringToBytes(&dialogue.SkillChecks, skillChecks)
	AssignNullStringToBytes(&dialogue.Information, information)
	AssignNullStringToBytes(&dialogue.PotentialQuests, potentialQuests)
	return dialogue, nil
}

// ListDialoguesByUserID retrieves all Dialogues for a user, optionally filtered by campaign.
func (ops *ContentOps) ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error) {
	query := `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
		skill_checks, information, potential_quests, ai_generated, created_at
		FROM dialogues WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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
		AssignNullStringToBytes(&dialogue.DialogueTree, dialogueTree)
		AssignNullStringToBytes(&dialogue.SkillChecks, skillChecks)
		AssignNullStringToBytes(&dialogue.Information, information)
		AssignNullStringToBytes(&dialogue.PotentialQuests, potentialQuests)
		dialogues = append(dialogues, dialogue)
	}
	return dialogues, rows.Err()
}

// UpdateDialogue updates an existing Dialogue.
func (ops *ContentOps) UpdateDialogue(ctx context.Context, dialogue *Dialogue) error {
	query := `UPDATE dialogues SET character_name = ` + ops.qb.Placeholder(1) + `,
		scene_setting = ` + ops.qb.Placeholder(2) + `, mood = ` + ops.qb.Placeholder(3) + `,
		dialogue_tree = ` + ops.qb.Placeholder(4) + `, skill_checks = ` + ops.qb.Placeholder(5) + `,
		information = ` + ops.qb.Placeholder(6) + `, potential_quests = ` + ops.qb.Placeholder(7) + `,
		campaign_id = ` + ops.qb.Placeholder(8) + `
		WHERE id = ` + ops.qb.Placeholder(9)

	_, err := ops.exec.Exec(ctx, query, dialogue.CharacterName, dialogue.SceneSetting,
		dialogue.Mood, dialogue.DialogueTree, dialogue.SkillChecks, dialogue.Information,
		dialogue.PotentialQuests, dialogue.CampaignID, dialogue.ID)
	return err
}

// DeleteDialogue deletes a Dialogue by ID.
func (ops *ContentOps) DeleteDialogue(ctx context.Context, id string) error {
	query := `DELETE FROM dialogues WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// LOCATION OPERATIONS
// ============================================================================

// CreateLocation creates a new Location in the database.
func (ops *ContentOps) CreateLocation(ctx context.Context, location *Location) error {
	if location.ID == "" {
		location.ID = generateUUID()
	}

	query := `INSERT INTO locations (id, user_id, campaign_id, name, type, theme, description, features,
		secrets, factions, npcs, encounters, map, parent_id, ai_generated, ai_provider,
		created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(16) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		location.ID, location.UserID, location.CampaignID, location.Name, location.Type, location.Theme, location.Description,
		location.Features, location.Secrets, location.Factions, location.NPCs, location.Encounters,
		location.Map, location.ParentID, location.AIGenerated, location.AIProvider)
	return err
}

// GetLocationByID retrieves a Location by ID.
func (ops *ContentOps) GetLocationByID(ctx context.Context, id string) (*Location, error) {
	location := &Location{}
	query := `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
		npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
		FROM locations WHERE id = ` + ops.qb.Placeholder(1)

	var features, secrets, factions, npcs, encounters sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&location.ID, &location.UserID, &location.CampaignID, &location.Name, &location.Type, &location.Theme,
		&location.Description, &features, &secrets, &factions, &npcs, &encounters, &location.Map,
		&location.ParentID, &location.AIGenerated, &location.AIProvider, &location.CreatedAt,
		&location.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&location.Features, features)
	AssignNullStringToBytes(&location.Secrets, secrets)
	AssignNullStringToBytes(&location.Factions, factions)
	AssignNullStringToBytes(&location.NPCs, npcs)
	AssignNullStringToBytes(&location.Encounters, encounters)
	return location, nil
}

// ListLocationsByUserID retrieves all Locations for a user, optionally filtered by campaign.
func (ops *ContentOps) ListLocationsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Location, error) {
	query := `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
		npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
		FROM locations WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var locations []*Location
	for rows.Next() {
		location := &Location{}
		var features, secrets, factions, npcs, encounters sql.NullString
		err := rows.Scan(
			&location.ID, &location.UserID, &location.CampaignID, &location.Name, &location.Type, &location.Theme,
			&location.Description, &features, &secrets, &factions, &npcs, &encounters,
			&location.Map, &location.ParentID, &location.AIGenerated, &location.AIProvider,
			&location.CreatedAt, &location.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&location.Features, features)
		AssignNullStringToBytes(&location.Secrets, secrets)
		AssignNullStringToBytes(&location.Factions, factions)
		AssignNullStringToBytes(&location.NPCs, npcs)
		AssignNullStringToBytes(&location.Encounters, encounters)
		locations = append(locations, location)
	}
	return locations, nil
}

// UpdateLocation updates an existing Location.
func (ops *ContentOps) UpdateLocation(ctx context.Context, location *Location) error {
	query := `UPDATE locations SET name = ` + ops.qb.Placeholder(1) + `, type = ` + ops.qb.Placeholder(2) + `,
		theme = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		features = ` + ops.qb.Placeholder(5) + `, secrets = ` + ops.qb.Placeholder(6) + `,
		factions = ` + ops.qb.Placeholder(7) + `, npcs = ` + ops.qb.Placeholder(8) + `,
		encounters = ` + ops.qb.Placeholder(9) + `, map = ` + ops.qb.Placeholder(10) + `,
		parent_id = ` + ops.qb.Placeholder(11) + `, updated_at = CURRENT_TIMESTAMP
		WHERE id = ` + ops.qb.Placeholder(12)

	_, err := ops.exec.Exec(ctx, query,
		location.Name, location.Type, location.Theme, location.Description, location.Features,
		location.Secrets, location.Factions, location.NPCs, location.Encounters, location.Map,
		location.ParentID, location.ID)
	return err
}

// DeleteLocation deletes a Location by ID.
func (ops *ContentOps) DeleteLocation(ctx context.Context, id string) error {
	query := `DELETE FROM locations WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// QUEST OPERATIONS
// ============================================================================

// CreateQuest creates a new Quest in the database.
func (ops *ContentOps) CreateQuest(ctx context.Context, quest *Quest) error {
	if quest.ID == "" {
		quest.ID = generateUUID()
	}

	query := `INSERT INTO quests (id, user_id, campaign_id, title, type, category, description, objectives,
		rewards, complications, npcs_involved, locations_involved, faction_alignment, party_level,
		status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
		created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(20) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		quest.ID, quest.UserID, quest.CampaignID, quest.Title, quest.Type, quest.Category, quest.Description,
		quest.Objectives, quest.Rewards, quest.Complications, quest.NPCsInvolved,
		quest.LocationsInvolved, quest.FactionAlignment, quest.PartyLevel, quest.Status,
		quest.MoralAmbiguity, quest.CombatIntensity, quest.TimeLimit, quest.AIGenerated,
		quest.AIProvider)
	return err
}

// GetQuestByID retrieves a Quest by ID.
func (ops *ContentOps) GetQuestByID(ctx context.Context, id string) (*Quest, error) {
	quest := &Quest{}
	query := `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
		complications, npcs_involved, locations_involved, faction_alignment, party_level,
		status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
		created_at, updated_at
		FROM quests WHERE id = ` + ops.qb.Placeholder(1)

	var objectives, rewards, complications, npcsInvolved, locationsInvolved sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&quest.ID, &quest.UserID, &quest.CampaignID, &quest.Title, &quest.Type, &quest.Category, &quest.Description,
		&objectives, &rewards, &complications, &npcsInvolved, &locationsInvolved,
		&quest.FactionAlignment, &quest.PartyLevel, &quest.Status, &quest.MoralAmbiguity,
		&quest.CombatIntensity, &quest.TimeLimit, &quest.AIGenerated, &quest.AIProvider,
		&quest.CreatedAt, &quest.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&quest.Objectives, objectives)
	AssignNullStringToBytes(&quest.Rewards, rewards)
	AssignNullStringToBytes(&quest.Complications, complications)
	AssignNullStringToBytes(&quest.NPCsInvolved, npcsInvolved)
	AssignNullStringToBytes(&quest.LocationsInvolved, locationsInvolved)
	return quest, nil
}

// ListQuestsByUserID retrieves all Quests for a user, optionally filtered by campaign.
func (ops *ContentOps) ListQuestsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Quest, error) {
	query := `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
		complications, npcs_involved, locations_involved, faction_alignment, party_level,
		status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
		created_at, updated_at
		FROM quests WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var quests []*Quest
	for rows.Next() {
		quest := &Quest{}
		var objectives, rewards, complications, npcsInvolved, locationsInvolved sql.NullString
		err := rows.Scan(
			&quest.ID, &quest.UserID, &quest.CampaignID, &quest.Title, &quest.Type, &quest.Category, &quest.Description,
			&objectives, &rewards, &complications, &npcsInvolved, &locationsInvolved,
			&quest.FactionAlignment, &quest.PartyLevel, &quest.Status, &quest.MoralAmbiguity,
			&quest.CombatIntensity, &quest.TimeLimit, &quest.AIGenerated, &quest.AIProvider,
			&quest.CreatedAt, &quest.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&quest.Objectives, objectives)
		AssignNullStringToBytes(&quest.Rewards, rewards)
		AssignNullStringToBytes(&quest.Complications, complications)
		AssignNullStringToBytes(&quest.NPCsInvolved, npcsInvolved)
		AssignNullStringToBytes(&quest.LocationsInvolved, locationsInvolved)
		quests = append(quests, quest)
	}
	return quests, nil
}

// UpdateQuest updates an existing Quest.
func (ops *ContentOps) UpdateQuest(ctx context.Context, quest *Quest) error {
	query := `UPDATE quests SET title = ` + ops.qb.Placeholder(1) + `, type = ` + ops.qb.Placeholder(2) + `,
		category = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		objectives = ` + ops.qb.Placeholder(5) + `, rewards = ` + ops.qb.Placeholder(6) + `,
		complications = ` + ops.qb.Placeholder(7) + `, npcs_involved = ` + ops.qb.Placeholder(8) + `,
		locations_involved = ` + ops.qb.Placeholder(9) + `, faction_alignment = ` + ops.qb.Placeholder(10) + `,
		party_level = ` + ops.qb.Placeholder(11) + `, status = ` + ops.qb.Placeholder(12) + `,
		moral_ambiguity = ` + ops.qb.Placeholder(13) + `, combat_intensity = ` + ops.qb.Placeholder(14) + `,
		time_limit = ` + ops.qb.Placeholder(15) + `, updated_at = CURRENT_TIMESTAMP
		WHERE id = ` + ops.qb.Placeholder(16)

	_, err := ops.exec.Exec(ctx, query,
		quest.Title, quest.Type, quest.Category, quest.Description, quest.Objectives,
		quest.Rewards, quest.Complications, quest.NPCsInvolved, quest.LocationsInvolved,
		quest.FactionAlignment, quest.PartyLevel, quest.Status, quest.MoralAmbiguity,
		quest.CombatIntensity, quest.TimeLimit, quest.ID)
	return err
}

// DeleteQuest deletes a Quest by ID.
func (ops *ContentOps) DeleteQuest(ctx context.Context, id string) error {
	query := `DELETE FROM quests WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// ITEM OPERATIONS
// ============================================================================

// CreateItem creates a new Item in the database.
func (ops *ContentOps) CreateItem(ctx context.Context, item *Item) error {
	if item.ID == "" {
		item.ID = generateUUID()
	}

	query := `INSERT INTO items (id, user_id, campaign_id, name, type, rarity, description, properties, origin,
		previous_owner, complication, value, weight, attunement, location_found, ai_generated,
		ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(17) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		item.ID, item.UserID, item.CampaignID, item.Name, item.Type, item.Rarity, item.Description, item.Properties,
		item.Origin, item.PreviousOwner, item.Complication, item.Value, item.Weight,
		item.Attunement, item.LocationFound, item.AIGenerated, item.AIProvider)
	return err
}

// GetItemByID retrieves an Item by ID.
func (ops *ContentOps) GetItemByID(ctx context.Context, id string) (*Item, error) {
	item := &Item{}
	query := `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
		complication, value, weight, attunement, location_found, ai_generated, ai_provider,
		created_at, updated_at
		FROM items WHERE id = ` + ops.qb.Placeholder(1)

	var properties sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.UserID, &item.CampaignID, &item.Name, &item.Type, &item.Rarity, &item.Description,
		&properties, &item.Origin, &item.PreviousOwner, &item.Complication, &item.Value,
		&item.Weight, &item.Attunement, &item.LocationFound, &item.AIGenerated, &item.AIProvider,
		&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&item.Properties, properties)
	return item, nil
}

// ListItemsByUserID retrieves all Items for a user, optionally filtered by campaign.
func (ops *ContentOps) ListItemsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Item, error) {
	query := `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
		complication, value, weight, attunement, location_found, ai_generated, ai_provider,
		created_at, updated_at
		FROM items WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var items []*Item
	for rows.Next() {
		item := &Item{}
		var properties sql.NullString
		err := rows.Scan(
			&item.ID, &item.UserID, &item.CampaignID, &item.Name, &item.Type, &item.Rarity, &item.Description,
			&properties, &item.Origin, &item.PreviousOwner, &item.Complication, &item.Value,
			&item.Weight, &item.Attunement, &item.LocationFound, &item.AIGenerated, &item.AIProvider,
			&item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&item.Properties, properties)
		items = append(items, item)
	}
	return items, nil
}

// UpdateItem updates an existing Item.
func (ops *ContentOps) UpdateItem(ctx context.Context, item *Item) error {
	query := `UPDATE items SET name = ` + ops.qb.Placeholder(1) + `, type = ` + ops.qb.Placeholder(2) + `,
		rarity = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		properties = ` + ops.qb.Placeholder(5) + `, origin = ` + ops.qb.Placeholder(6) + `,
		previous_owner = ` + ops.qb.Placeholder(7) + `, complication = ` + ops.qb.Placeholder(8) + `,
		value = ` + ops.qb.Placeholder(9) + `, weight = ` + ops.qb.Placeholder(10) + `,
		attunement = ` + ops.qb.Placeholder(11) + `, location_found = ` + ops.qb.Placeholder(12) + `,
		updated_at = CURRENT_TIMESTAMP WHERE id = ` + ops.qb.Placeholder(13)

	_, err := ops.exec.Exec(ctx, query,
		item.Name, item.Type, item.Rarity, item.Description, item.Properties, item.Origin,
		item.PreviousOwner, item.Complication, item.Value, item.Weight, item.Attunement,
		item.LocationFound, item.ID)
	return err
}

// DeleteItem deletes an Item by ID.
func (ops *ContentOps) DeleteItem(ctx context.Context, id string) error {
	query := `DELETE FROM items WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// RUMOR OPERATIONS
// ============================================================================

// CreateRumor creates a new Rumor in the database.
func (ops *ContentOps) CreateRumor(ctx context.Context, rumor *Rumor) error {
	if rumor.ID == "" {
		rumor.ID = generateUUID()
	}

	query := `INSERT INTO rumors (id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
		foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(14) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		rumor.ID, rumor.UserID, rumor.CampaignID, rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo,
		rumor.RelatedID, rumor.Context, rumor.Foreshadowing, rumor.Tags, rumor.Revealed,
		rumor.AIGenerated, rumor.AIProvider)
	return err
}

// GetRumorByID retrieves a Rumor by ID.
func (ops *ContentOps) GetRumorByID(ctx context.Context, id string) (*Rumor, error) {
	rumor := &Rumor{}
	query := `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
		foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
		FROM rumors WHERE id = ` + ops.qb.Placeholder(1)

	var tags sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&rumor.ID, &rumor.UserID, &rumor.CampaignID, &rumor.Text, &rumor.Source, &rumor.Veracity, &rumor.LeadsTo,
		&rumor.RelatedID, &rumor.Context, &rumor.Foreshadowing, &tags, &rumor.Revealed,
		&rumor.AIGenerated, &rumor.AIProvider, &rumor.CreatedAt, &rumor.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&rumor.Tags, tags)
	return rumor, nil
}

// ListRumorsByUserID retrieves all Rumors for a user, optionally filtered by campaign.
func (ops *ContentOps) ListRumorsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Rumor, error) {
	query := `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
		foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
		FROM rumors WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var rumors []*Rumor
	for rows.Next() {
		rumor := &Rumor{}
		var tags sql.NullString
		err := rows.Scan(
			&rumor.ID, &rumor.UserID, &rumor.CampaignID, &rumor.Text, &rumor.Source, &rumor.Veracity, &rumor.LeadsTo,
			&rumor.RelatedID, &rumor.Context, &rumor.Foreshadowing, &tags, &rumor.Revealed,
			&rumor.AIGenerated, &rumor.AIProvider, &rumor.CreatedAt, &rumor.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&rumor.Tags, tags)
		rumors = append(rumors, rumor)
	}
	return rumors, nil
}

// UpdateRumor updates an existing Rumor.
func (ops *ContentOps) UpdateRumor(ctx context.Context, rumor *Rumor) error {
	query := `UPDATE rumors SET text = ` + ops.qb.Placeholder(1) + `, source = ` + ops.qb.Placeholder(2) + `,
		veracity = ` + ops.qb.Placeholder(3) + `, leads_to = ` + ops.qb.Placeholder(4) + `,
		related_id = ` + ops.qb.Placeholder(5) + `, context = ` + ops.qb.Placeholder(6) + `,
		foreshadowing = ` + ops.qb.Placeholder(7) + `, tags = ` + ops.qb.Placeholder(8) + `,
		revealed = ` + ops.qb.Placeholder(9) + `, updated_at = CURRENT_TIMESTAMP
		WHERE id = ` + ops.qb.Placeholder(10)

	_, err := ops.exec.Exec(ctx, query,
		rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo, rumor.RelatedID, rumor.Context,
		rumor.Foreshadowing, rumor.Tags, rumor.Revealed, rumor.ID)
	return err
}

// DeleteRumor deletes a Rumor by ID.
func (ops *ContentOps) DeleteRumor(ctx context.Context, id string) error {
	query := `DELETE FROM rumors WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// TAVERN OPERATIONS
// ============================================================================

// CreateTavern creates a new Tavern in the database.
func (ops *ContentOps) CreateTavern(ctx context.Context, tavern *Tavern) error {
	if tavern.ID == "" {
		tavern.ID = generateUUID()
	}

	query := `INSERT INTO taverns (id, user_id, campaign_id, name, type, atmosphere, description,
		keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
		events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(19) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		tavern.ID, tavern.UserID, tavern.CampaignID, tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes,
		tavern.AIGenerated, tavern.AIProvider)
	return err
}

// GetTavernByID retrieves a Tavern by ID.
func (ops *ContentOps) GetTavernByID(ctx context.Context, id string) (*Tavern, error) {
	tavern := &Tavern{}
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
		keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
		events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
		FROM taverns WHERE id = ` + ops.qb.Placeholder(1)

	var menuFood, menuDrinks, rooms, patrons, events, rumors sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&tavern.ID, &tavern.UserID, &tavern.CampaignID, &tavern.Name, &tavern.Type, &tavern.Atmosphere, &tavern.Description,
		&tavern.KeeperName, &tavern.KeeperPersonality, &tavern.KeeperDescription, &menuFood, &menuDrinks,
		&rooms, &patrons, &events, &rumors, &tavern.SpecialNotes,
		&tavern.AIGenerated, &tavern.AIProvider, &tavern.CreatedAt, &tavern.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&tavern.MenuFood, menuFood)
	AssignNullStringToBytes(&tavern.MenuDrinks, menuDrinks)
	AssignNullStringToBytes(&tavern.Rooms, rooms)
	AssignNullStringToBytes(&tavern.Patrons, patrons)
	AssignNullStringToBytes(&tavern.Events, events)
	AssignNullStringToBytes(&tavern.Rumors, rumors)
	return tavern, nil
}

// ListTavernsByUserID retrieves all Taverns for a user, optionally filtered by campaign.
func (ops *ContentOps) ListTavernsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Tavern, error) {
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
		keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
		events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
		FROM taverns WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var taverns []*Tavern
	for rows.Next() {
		tavern := &Tavern{}
		var menuFood, menuDrinks, rooms, patrons, events, rumors sql.NullString
		err := rows.Scan(
			&tavern.ID, &tavern.UserID, &tavern.CampaignID, &tavern.Name, &tavern.Type, &tavern.Atmosphere, &tavern.Description,
			&tavern.KeeperName, &tavern.KeeperPersonality, &tavern.KeeperDescription, &menuFood, &menuDrinks,
			&rooms, &patrons, &events, &rumors, &tavern.SpecialNotes,
			&tavern.AIGenerated, &tavern.AIProvider, &tavern.CreatedAt, &tavern.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&tavern.MenuFood, menuFood)
		AssignNullStringToBytes(&tavern.MenuDrinks, menuDrinks)
		AssignNullStringToBytes(&tavern.Rooms, rooms)
		AssignNullStringToBytes(&tavern.Patrons, patrons)
		AssignNullStringToBytes(&tavern.Events, events)
		AssignNullStringToBytes(&tavern.Rumors, rumors)
		taverns = append(taverns, tavern)
	}
	return taverns, nil
}

// ListTavernsByCampaignID retrieves all Taverns for a campaign.
func (ops *ContentOps) ListTavernsByCampaignID(ctx context.Context, campaignID string) ([]*Tavern, error) {
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
		keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
		events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
		FROM taverns WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var taverns []*Tavern
	for rows.Next() {
		tavern := &Tavern{}
		var menuFood, menuDrinks, rooms, patrons, events, rumors sql.NullString
		err := rows.Scan(
			&tavern.ID, &tavern.UserID, &tavern.CampaignID, &tavern.Name, &tavern.Type, &tavern.Atmosphere, &tavern.Description,
			&tavern.KeeperName, &tavern.KeeperPersonality, &tavern.KeeperDescription, &menuFood, &menuDrinks,
			&rooms, &patrons, &events, &rumors, &tavern.SpecialNotes,
			&tavern.AIGenerated, &tavern.AIProvider, &tavern.CreatedAt, &tavern.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&tavern.MenuFood, menuFood)
		AssignNullStringToBytes(&tavern.MenuDrinks, menuDrinks)
		AssignNullStringToBytes(&tavern.Rooms, rooms)
		AssignNullStringToBytes(&tavern.Patrons, patrons)
		AssignNullStringToBytes(&tavern.Events, events)
		AssignNullStringToBytes(&tavern.Rumors, rumors)
		taverns = append(taverns, tavern)
	}
	return taverns, nil
}

// UpdateTavern updates an existing Tavern.
func (ops *ContentOps) UpdateTavern(ctx context.Context, tavern *Tavern) error {
	query := `UPDATE taverns SET name = ` + ops.qb.Placeholder(1) + `, type = ` + ops.qb.Placeholder(2) + `,
		atmosphere = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		keeper_name = ` + ops.qb.Placeholder(5) + `, keeper_personality = ` + ops.qb.Placeholder(6) + `,
		keeper_description = ` + ops.qb.Placeholder(7) + `, menu_food = ` + ops.qb.Placeholder(8) + `,
		menu_drinks = ` + ops.qb.Placeholder(9) + `, rooms = ` + ops.qb.Placeholder(10) + `,
		patrons = ` + ops.qb.Placeholder(11) + `, events = ` + ops.qb.Placeholder(12) + `,
		rumors = ` + ops.qb.Placeholder(13) + `, special_notes = ` + ops.qb.Placeholder(14) + `,
		updated_at = CURRENT_TIMESTAMP WHERE id = ` + ops.qb.Placeholder(15)

	_, err := ops.exec.Exec(ctx, query,
		tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes, tavern.ID)
	return err
}

// DeleteTavern deletes a Tavern by ID.
func (ops *ContentOps) DeleteTavern(ctx context.Context, id string) error {
	query := `DELETE FROM taverns WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// MERCHANT OPERATIONS
// ============================================================================

// CreateMerchant creates a new Merchant in the database.
func (ops *ContentOps) CreateMerchant(ctx context.Context, merchant *Merchant) error {
	if merchant.ID == "" {
		merchant.ID = generateUUID()
	}

	query := `INSERT INTO merchants (id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
		owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
		recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(20) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		merchant.ID, merchant.UserID, merchant.CampaignID, merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness,
		merchant.AIGenerated, merchant.AIProvider)
	return err
}

// GetMerchantByID retrieves a Merchant by ID.
func (ops *ContentOps) GetMerchantByID(ctx context.Context, id string) (*Merchant, error) {
	merchant := &Merchant{}
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
		owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
		recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
		FROM merchants WHERE id = ` + ops.qb.Placeholder(1)

	var inventory, services, specialItems, rumors, recentlySold sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&merchant.ID, &merchant.UserID, &merchant.CampaignID, &merchant.Name, &merchant.ShopType, &merchant.Atmosphere, &merchant.Description, &merchant.Location,
		&merchant.OwnerName, &merchant.OwnerPersonality, &merchant.OwnerDescription, &inventory, &services,
		&specialItems, &rumors, &recentlySold, &merchant.SpecialNotes, &merchant.HaggleWillingness,
		&merchant.AIGenerated, &merchant.AIProvider, &merchant.CreatedAt, &merchant.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&merchant.Inventory, inventory)
	AssignNullStringToBytes(&merchant.Services, services)
	AssignNullStringToBytes(&merchant.SpecialItems, specialItems)
	AssignNullStringToBytes(&merchant.Rumors, rumors)
	AssignNullStringToBytes(&merchant.RecentlySold, recentlySold)
	return merchant, nil
}

// ListMerchantsByUserID retrieves all Merchants for a user, optionally filtered by campaign.
func (ops *ContentOps) ListMerchantsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Merchant, error) {
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
		owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
		recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
		FROM merchants WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var merchants []*Merchant
	for rows.Next() {
		merchant := &Merchant{}
		var inventory, services, specialItems, rumors, recentlySold sql.NullString
		err := rows.Scan(
			&merchant.ID, &merchant.UserID, &merchant.CampaignID, &merchant.Name, &merchant.ShopType, &merchant.Atmosphere, &merchant.Description, &merchant.Location,
			&merchant.OwnerName, &merchant.OwnerPersonality, &merchant.OwnerDescription, &inventory, &services,
			&specialItems, &rumors, &recentlySold, &merchant.SpecialNotes, &merchant.HaggleWillingness,
			&merchant.AIGenerated, &merchant.AIProvider, &merchant.CreatedAt, &merchant.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&merchant.Inventory, inventory)
		AssignNullStringToBytes(&merchant.Services, services)
		AssignNullStringToBytes(&merchant.SpecialItems, specialItems)
		AssignNullStringToBytes(&merchant.Rumors, rumors)
		AssignNullStringToBytes(&merchant.RecentlySold, recentlySold)
		merchants = append(merchants, merchant)
	}
	return merchants, nil
}

// ListMerchantsByCampaignID retrieves all Merchants for a campaign.
func (ops *ContentOps) ListMerchantsByCampaignID(ctx context.Context, campaignID string) ([]*Merchant, error) {
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
		owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
		recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
		FROM merchants WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var merchants []*Merchant
	for rows.Next() {
		merchant := &Merchant{}
		var inventory, services, specialItems, rumors, recentlySold sql.NullString
		err := rows.Scan(
			&merchant.ID, &merchant.UserID, &merchant.CampaignID, &merchant.Name, &merchant.ShopType, &merchant.Atmosphere, &merchant.Description, &merchant.Location,
			&merchant.OwnerName, &merchant.OwnerPersonality, &merchant.OwnerDescription, &inventory, &services,
			&specialItems, &rumors, &recentlySold, &merchant.SpecialNotes, &merchant.HaggleWillingness,
			&merchant.AIGenerated, &merchant.AIProvider, &merchant.CreatedAt, &merchant.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&merchant.Inventory, inventory)
		AssignNullStringToBytes(&merchant.Services, services)
		AssignNullStringToBytes(&merchant.SpecialItems, specialItems)
		AssignNullStringToBytes(&merchant.Rumors, rumors)
		AssignNullStringToBytes(&merchant.RecentlySold, recentlySold)
		merchants = append(merchants, merchant)
	}
	return merchants, nil
}

// UpdateMerchant updates an existing Merchant.
func (ops *ContentOps) UpdateMerchant(ctx context.Context, merchant *Merchant) error {
	query := `UPDATE merchants SET name = ` + ops.qb.Placeholder(1) + `, shop_type = ` + ops.qb.Placeholder(2) + `,
		atmosphere = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		location = ` + ops.qb.Placeholder(5) + `, owner_name = ` + ops.qb.Placeholder(6) + `,
		owner_personality = ` + ops.qb.Placeholder(7) + `, owner_description = ` + ops.qb.Placeholder(8) + `,
		inventory = ` + ops.qb.Placeholder(9) + `, services = ` + ops.qb.Placeholder(10) + `,
		special_items = ` + ops.qb.Placeholder(11) + `, rumors = ` + ops.qb.Placeholder(12) + `,
		recently_sold = ` + ops.qb.Placeholder(13) + `, special_notes = ` + ops.qb.Placeholder(14) + `,
		haggle_willingness = ` + ops.qb.Placeholder(15) + `, updated_at = CURRENT_TIMESTAMP
		WHERE id = ` + ops.qb.Placeholder(16)

	_, err := ops.exec.Exec(ctx, query,
		merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness, merchant.ID)
	return err
}

// DeleteMerchant deletes a Merchant by ID.
func (ops *ContentOps) DeleteMerchant(ctx context.Context, id string) error {
	query := `DELETE FROM merchants WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// TRAP OPERATIONS
// ============================================================================

// CreateTrap creates a new Trap in the database.
func (ops *ContentOps) CreateTrap(ctx context.Context, trap *Trap) error {
	if trap.ID == "" {
		trap.ID = generateUUID()
	}

	query := `INSERT INTO traps (id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
		trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
		ai_generated, ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(19) + `, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`

	_, err := ops.exec.Exec(ctx, query,
		trap.ID, trap.UserID, trap.CampaignID, trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.AIGenerated, trap.AIProvider)
	return err
}

// GetTrapByID retrieves a Trap by ID.
func (ops *ContentOps) GetTrapByID(ctx context.Context, id string) (*Trap, error) {
	trap := &Trap{}
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
		trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
		ai_generated, ai_provider, created_at, updated_at
		FROM traps WHERE id = ` + ops.qb.Placeholder(1)

	var detection, solutionPaths, complications, rewards, scaling sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&trap.ID, &trap.UserID, &trap.CampaignID, &trap.Name, &trap.TrapType, &trap.Difficulty, &trap.Description, &trap.Environment,
		&trap.Trigger, &trap.Effect, &trap.Damage, &detection, &solutionPaths, &complications,
		&rewards, &scaling, &trap.DMNotes, &trap.AIGenerated, &trap.AIProvider, &trap.CreatedAt, &trap.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&trap.Detection, detection)
	AssignNullStringToBytes(&trap.SolutionPaths, solutionPaths)
	AssignNullStringToBytes(&trap.Complications, complications)
	AssignNullStringToBytes(&trap.Rewards, rewards)
	AssignNullStringToBytes(&trap.Scaling, scaling)
	return trap, nil
}

// ListTrapsByUserID retrieves all Traps for a user, optionally filtered by campaign.
func (ops *ContentOps) ListTrapsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Trap, error) {
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
		trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
		ai_generated, ai_provider, created_at, updated_at
		FROM traps WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var traps []*Trap
	for rows.Next() {
		trap := &Trap{}
		var detection, solutionPaths, complications, rewards, scaling sql.NullString
		err := rows.Scan(
			&trap.ID, &trap.UserID, &trap.CampaignID, &trap.Name, &trap.TrapType, &trap.Difficulty, &trap.Description, &trap.Environment,
			&trap.Trigger, &trap.Effect, &trap.Damage, &detection, &solutionPaths, &complications,
			&rewards, &scaling, &trap.DMNotes, &trap.AIGenerated, &trap.AIProvider, &trap.CreatedAt, &trap.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&trap.Detection, detection)
		AssignNullStringToBytes(&trap.SolutionPaths, solutionPaths)
		AssignNullStringToBytes(&trap.Complications, complications)
		AssignNullStringToBytes(&trap.Rewards, rewards)
		AssignNullStringToBytes(&trap.Scaling, scaling)
		traps = append(traps, trap)
	}
	return traps, nil
}

// ListTrapsByCampaignID retrieves all Traps for a campaign.
func (ops *ContentOps) ListTrapsByCampaignID(ctx context.Context, campaignID string) ([]*Trap, error) {
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
		trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
		ai_generated, ai_provider, created_at, updated_at
		FROM traps WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var traps []*Trap
	for rows.Next() {
		trap := &Trap{}
		var detection, solutionPaths, complications, rewards, scaling sql.NullString
		err := rows.Scan(
			&trap.ID, &trap.UserID, &trap.CampaignID, &trap.Name, &trap.TrapType, &trap.Difficulty, &trap.Description, &trap.Environment,
			&trap.Trigger, &trap.Effect, &trap.Damage, &detection, &solutionPaths, &complications,
			&rewards, &scaling, &trap.DMNotes, &trap.AIGenerated, &trap.AIProvider, &trap.CreatedAt, &trap.UpdatedAt)
		if err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&trap.Detection, detection)
		AssignNullStringToBytes(&trap.SolutionPaths, solutionPaths)
		AssignNullStringToBytes(&trap.Complications, complications)
		AssignNullStringToBytes(&trap.Rewards, rewards)
		AssignNullStringToBytes(&trap.Scaling, scaling)
		traps = append(traps, trap)
	}
	return traps, nil
}

// UpdateTrap updates an existing Trap.
func (ops *ContentOps) UpdateTrap(ctx context.Context, trap *Trap) error {
	query := `UPDATE traps SET name = ` + ops.qb.Placeholder(1) + `, trap_type = ` + ops.qb.Placeholder(2) + `,
		difficulty = ` + ops.qb.Placeholder(3) + `, description = ` + ops.qb.Placeholder(4) + `,
		environment = ` + ops.qb.Placeholder(5) + `, trigger = ` + ops.qb.Placeholder(6) + `,
		effect = ` + ops.qb.Placeholder(7) + `, damage = ` + ops.qb.Placeholder(8) + `,
		detection = ` + ops.qb.Placeholder(9) + `, solution_paths = ` + ops.qb.Placeholder(10) + `,
		complications = ` + ops.qb.Placeholder(11) + `, rewards = ` + ops.qb.Placeholder(12) + `,
		scaling = ` + ops.qb.Placeholder(13) + `, dm_notes = ` + ops.qb.Placeholder(14) + `,
		updated_at = CURRENT_TIMESTAMP WHERE id = ` + ops.qb.Placeholder(15)

	_, err := ops.exec.Exec(ctx, query,
		trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.ID)
	return err
}

// DeleteTrap deletes a Trap by ID.
func (ops *ContentOps) DeleteTrap(ctx context.Context, id string) error {
	query := `DELETE FROM traps WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// CRITTER OPERATIONS
// ============================================================================

// CreateCritter creates a new Critter in the database.
func (ops *ContentOps) CreateCritter(ctx context.Context, critter *Critter) error {
	if critter.ID == "" {
		critter.ID = generateUUID()
	}
	critter.CreatedAt = time.Now()
	critter.UpdatedAt = time.Now()

	query := `INSERT INTO critters (id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
		description, behavior, stats, special_abilities, uses, training_difficulty, diet,
		lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(23) + `)`

	_, err := ops.exec.Exec(ctx, query,
		critter.ID, critter.UserID, critter.CampaignID, critter.Name, critter.Species, critter.CritterType,
		critter.Size, critter.Temperament, critter.Habitat, critter.Description, critter.Behavior,
		critter.Stats, critter.SpecialAbilities, critter.Uses, critter.TrainingDifficulty, critter.Diet,
		critter.Lifespan, critter.InterestingFacts, critter.EncounterNotes, critter.AIGenerated,
		critter.AIProvider, critter.CreatedAt, critter.UpdatedAt)
	return err
}

// GetCritterByID retrieves a Critter by ID.
func (ops *ContentOps) GetCritterByID(ctx context.Context, id string) (*Critter, error) {
	critter := &Critter{}
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
		description, behavior, stats, special_abilities, uses, training_difficulty, diet,
		lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
		FROM critters WHERE id = ` + ops.qb.Placeholder(1)

	var stats, specialAbilities, uses, interestingFacts sql.NullString
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&critter.ID, &critter.UserID, &critter.CampaignID, &critter.Name, &critter.Species, &critter.CritterType,
		&critter.Size, &critter.Temperament, &critter.Habitat, &critter.Description, &critter.Behavior,
		&stats, &specialAbilities, &uses, &critter.TrainingDifficulty, &critter.Diet,
		&critter.Lifespan, &interestingFacts, &critter.EncounterNotes, &critter.AIGenerated,
		&critter.AIProvider, &critter.CreatedAt, &critter.UpdatedAt)
	if err != nil {
		return nil, err
	}
	AssignNullStringToBytes(&critter.Stats, stats)
	AssignNullStringToBytes(&critter.SpecialAbilities, specialAbilities)
	AssignNullStringToBytes(&critter.Uses, uses)
	AssignNullStringToBytes(&critter.InterestingFacts, interestingFacts)
	return critter, nil
}

// ListCrittersByUserID retrieves all Critters for a user, optionally filtered by campaign.
func (ops *ContentOps) ListCrittersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Critter, error) {
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
		description, behavior, stats, special_abilities, uses, training_difficulty, diet,
		lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
		FROM critters WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var critters []*Critter
	for rows.Next() {
		critter := &Critter{}
		var stats, specialAbilities, uses, interestingFacts sql.NullString
		if err := rows.Scan(
			&critter.ID, &critter.UserID, &critter.CampaignID, &critter.Name, &critter.Species, &critter.CritterType,
			&critter.Size, &critter.Temperament, &critter.Habitat, &critter.Description, &critter.Behavior,
			&stats, &specialAbilities, &uses, &critter.TrainingDifficulty, &critter.Diet,
			&critter.Lifespan, &interestingFacts, &critter.EncounterNotes, &critter.AIGenerated,
			&critter.AIProvider, &critter.CreatedAt, &critter.UpdatedAt); err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&critter.Stats, stats)
		AssignNullStringToBytes(&critter.SpecialAbilities, specialAbilities)
		AssignNullStringToBytes(&critter.Uses, uses)
		AssignNullStringToBytes(&critter.InterestingFacts, interestingFacts)
		critters = append(critters, critter)
	}
	return critters, nil
}

// ListCrittersByCampaignID retrieves all Critters for a campaign.
func (ops *ContentOps) ListCrittersByCampaignID(ctx context.Context, campaignID string) ([]*Critter, error) {
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
		description, behavior, stats, special_abilities, uses, training_difficulty, diet,
		lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
		FROM critters WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var critters []*Critter
	for rows.Next() {
		critter := &Critter{}
		var stats, specialAbilities, uses, interestingFacts sql.NullString
		if err := rows.Scan(
			&critter.ID, &critter.UserID, &critter.CampaignID, &critter.Name, &critter.Species, &critter.CritterType,
			&critter.Size, &critter.Temperament, &critter.Habitat, &critter.Description, &critter.Behavior,
			&stats, &specialAbilities, &uses, &critter.TrainingDifficulty, &critter.Diet,
			&critter.Lifespan, &interestingFacts, &critter.EncounterNotes, &critter.AIGenerated,
			&critter.AIProvider, &critter.CreatedAt, &critter.UpdatedAt); err != nil {
			return nil, err
		}
		AssignNullStringToBytes(&critter.Stats, stats)
		AssignNullStringToBytes(&critter.SpecialAbilities, specialAbilities)
		AssignNullStringToBytes(&critter.Uses, uses)
		AssignNullStringToBytes(&critter.InterestingFacts, interestingFacts)
		critters = append(critters, critter)
	}
	return critters, nil
}

// UpdateCritter updates an existing Critter.
func (ops *ContentOps) UpdateCritter(ctx context.Context, critter *Critter) error {
	critter.UpdatedAt = time.Now()
	query := `UPDATE critters SET name = ` + ops.qb.Placeholder(1) + `, species = ` + ops.qb.Placeholder(2) + `,
		critter_type = ` + ops.qb.Placeholder(3) + `, size = ` + ops.qb.Placeholder(4) + `,
		temperament = ` + ops.qb.Placeholder(5) + `, habitat = ` + ops.qb.Placeholder(6) + `,
		description = ` + ops.qb.Placeholder(7) + `, behavior = ` + ops.qb.Placeholder(8) + `,
		stats = ` + ops.qb.Placeholder(9) + `, special_abilities = ` + ops.qb.Placeholder(10) + `,
		uses = ` + ops.qb.Placeholder(11) + `, training_difficulty = ` + ops.qb.Placeholder(12) + `,
		diet = ` + ops.qb.Placeholder(13) + `, lifespan = ` + ops.qb.Placeholder(14) + `,
		interesting_facts = ` + ops.qb.Placeholder(15) + `, encounter_notes = ` + ops.qb.Placeholder(16) + `,
		updated_at = ` + ops.qb.Placeholder(17) + `
		WHERE id = ` + ops.qb.Placeholder(18)

	_, err := ops.exec.Exec(ctx, query,
		critter.Name, critter.Species, critter.CritterType, critter.Size, critter.Temperament, critter.Habitat,
		critter.Description, critter.Behavior, critter.Stats, critter.SpecialAbilities, critter.Uses,
		critter.TrainingDifficulty, critter.Diet, critter.Lifespan, critter.InterestingFacts,
		critter.EncounterNotes, critter.UpdatedAt, critter.ID)
	return err
}

// DeleteCritter deletes a Critter by ID.
func (ops *ContentOps) DeleteCritter(ctx context.Context, id string) error {
	query := `DELETE FROM critters WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}
