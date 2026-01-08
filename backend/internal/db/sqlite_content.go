package db

import (
	"context"
	"database/sql"
	"time"
)

func (s *SQLiteDB) CreateNPC(ctx context.Context, npc *NPC) error {
	id := generateUUID()
	query := `
		INSERT INTO npcs (id, user_id, campaign_id, name, race, class, personality, backstory, stats, ai_generated, ai_provider)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		id, npc.UserID, npc.CampaignID, npc.Name, npc.Race, npc.Class,
		npc.Personality, npc.Backstory, npc.Stats, npc.AIGenerated, npc.AIProvider)
	if err != nil {
		return err
	}

	npc.ID = id
	npc.CreatedAt = time.Now()
	return nil
}

func (s *SQLiteDB) GetNPCByID(ctx context.Context, id string) (*NPC, error) {
	query := `
		SELECT id, user_id, campaign_id, name, race, class, personality, backstory, stats,
			   ai_generated, ai_provider, created_at
		FROM npcs
		WHERE id = ?`

	npc := &NPC{}
	var stats sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

func (s *SQLiteDB) ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error) {
	query := `
		SELECT id, user_id, campaign_id, name, race, class, personality, backstory, stats,
			   ai_generated, ai_provider, created_at
		FROM npcs
		WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
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

func (s *SQLiteDB) DeleteNPC(ctx context.Context, id string) error {
	query := `DELETE FROM npcs WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Monster operations
func (s *SQLiteDB) CreateMonster(ctx context.Context, monster *Monster) error {
	if monster.ID == "" {
		monster.ID = generateUUID()
	}

	query := `INSERT INTO monsters (id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		monster.ID, monster.UserID, monster.CampaignID, monster.Name, monster.CR,
		monster.Stats, monster.Lore, monster.Tactics, monster.AIGenerated)
	return err
}

func (s *SQLiteDB) GetMonsterByID(ctx context.Context, id string) (*Monster, error) {
	monster := &Monster{}
	query := `SELECT id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at
			  FROM monsters WHERE id = ?`
	var stats sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

func (s *SQLiteDB) ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error) {
	query := `SELECT id, user_id, campaign_id, name, cr, stats, lore, tactics, ai_generated, created_at
			  FROM monsters WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
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
	return monsters, nil
}

func (s *SQLiteDB) DeleteMonster(ctx context.Context, id string) error {
	query := `DELETE FROM monsters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Encounter operations
func (s *SQLiteDB) CreateEncounter(ctx context.Context, encounter *Encounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}

	query := `INSERT INTO encounters (id, user_id, campaign_id, name, party_level, party_size, difficulty,
			  description, environment, creatures, treasure, xp_total, xp_per_player, notes,
			  ai_generated, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		encounter.ID, encounter.UserID, encounter.CampaignID, encounter.Name, encounter.PartyLevel, encounter.PartySize,
		encounter.Difficulty, encounter.Description, encounter.Environment, encounter.Creatures,
		encounter.Treasure, encounter.XPTotal, encounter.XPPerPlayer, encounter.Notes, encounter.AIGenerated)
	return err
}

func (s *SQLiteDB) GetEncounterByID(ctx context.Context, id string) (*Encounter, error) {
	encounter := &Encounter{}
	query := `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
			  environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
			  FROM encounters WHERE id = ?`
	var environment, creatures, treasure sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
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
	return encounter, nil
}

func (s *SQLiteDB) ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error) {
	query := `SELECT id, user_id, campaign_id, name, party_level, party_size, difficulty, description,
			  environment, creatures, treasure, xp_total, xp_per_player, notes, ai_generated, created_at
			  FROM encounters WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
	return encounters, nil
}

func (s *SQLiteDB) DeleteEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM encounters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Dialogue operations
func (s *SQLiteDB) CreateDialogue(ctx context.Context, dialogue *Dialogue) error {
	if dialogue.ID == "" {
		dialogue.ID = generateUUID()
	}

	query := `INSERT INTO dialogues (id, user_id, campaign_id, character_name, scene_setting, mood,
			  dialogue_tree, skill_checks, information, potential_quests, ai_generated, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		dialogue.ID, dialogue.UserID, dialogue.CampaignID, dialogue.CharacterName, dialogue.SceneSetting, dialogue.Mood,
		dialogue.DialogueTree, dialogue.SkillChecks, dialogue.Information, dialogue.PotentialQuests,
		dialogue.AIGenerated)
	return err
}

func (s *SQLiteDB) GetDialogueByID(ctx context.Context, id string) (*Dialogue, error) {
	dialogue := &Dialogue{}
	query := `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
			  skill_checks, information, potential_quests, ai_generated, created_at
			  FROM dialogues WHERE id = ?`
	var dialogueTree, skillChecks, information, potentialQuests sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
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
	return dialogue, nil
}

func (s *SQLiteDB) ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error) {
	query := `SELECT id, user_id, campaign_id, character_name, scene_setting, mood, dialogue_tree,
			  skill_checks, information, potential_quests, ai_generated, created_at
			  FROM dialogues WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
	return dialogues, nil
}

func (s *SQLiteDB) DeleteDialogue(ctx context.Context, id string) error {
	query := `DELETE FROM dialogues WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Location operations
func (s *SQLiteDB) CreateLocation(ctx context.Context, location *Location) error {
	if location.ID == "" {
		location.ID = generateUUID()
	}

	query := `INSERT INTO locations (id, user_id, campaign_id, name, type, theme, description, features,
			  secrets, factions, npcs, encounters, map, parent_id, ai_generated, ai_provider,
			  created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		location.ID, location.UserID, location.CampaignID, location.Name, location.Type, location.Theme, location.Description,
		location.Features, location.Secrets, location.Factions, location.NPCs, location.Encounters,
		location.Map, location.ParentID, location.AIGenerated, location.AIProvider)
	return err
}

func (s *SQLiteDB) GetLocationByID(ctx context.Context, id string) (*Location, error) {
	location := &Location{}
	query := `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
			  npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
			  FROM locations WHERE id = ?`
	var features, secrets, factions, npcs, encounters sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&location.ID, &location.UserID, &location.CampaignID, &location.Name, &location.Type, &location.Theme,
		&location.Description, &features, &secrets, &factions, &npcs, &encounters, &location.Map,
		&location.ParentID, &location.AIGenerated, &location.AIProvider, &location.CreatedAt,
		&location.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if features.Valid {
		location.Features = []byte(features.String)
	}
	if secrets.Valid {
		location.Secrets = []byte(secrets.String)
	}
	if factions.Valid {
		location.Factions = []byte(factions.String)
	}
	if npcs.Valid {
		location.NPCs = []byte(npcs.String)
	}
	if encounters.Valid {
		location.Encounters = []byte(encounters.String)
	}
	return location, nil
}

func (s *SQLiteDB) ListLocationsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Location, error) {
	query := `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
			  npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
			  FROM locations WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if features.Valid {
			location.Features = []byte(features.String)
		}
		if secrets.Valid {
			location.Secrets = []byte(secrets.String)
		}
		if factions.Valid {
			location.Factions = []byte(factions.String)
		}
		if npcs.Valid {
			location.NPCs = []byte(npcs.String)
		}
		if encounters.Valid {
			location.Encounters = []byte(encounters.String)
		}
		locations = append(locations, location)
	}
	return locations, nil
}

func (s *SQLiteDB) UpdateLocation(ctx context.Context, location *Location) error {
	query := `UPDATE locations SET name = ?, type = ?, theme = ?, description = ?, features = ?,
			  secrets = ?, factions = ?, npcs = ?, encounters = ?, map = ?, parent_id = ?,
			  updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		location.Name, location.Type, location.Theme, location.Description, location.Features,
		location.Secrets, location.Factions, location.NPCs, location.Encounters, location.Map,
		location.ParentID, location.ID)
	return err
}

func (s *SQLiteDB) DeleteLocation(ctx context.Context, id string) error {
	query := `DELETE FROM locations WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Quest operations
func (s *SQLiteDB) CreateQuest(ctx context.Context, quest *Quest) error {
	if quest.ID == "" {
		quest.ID = generateUUID()
	}

	query := `INSERT INTO quests (id, user_id, campaign_id, title, type, category, description, objectives,
			  rewards, complications, npcs_involved, locations_involved, faction_alignment, party_level,
			  status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
			  created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		quest.ID, quest.UserID, quest.CampaignID, quest.Title, quest.Type, quest.Category, quest.Description,
		quest.Objectives, quest.Rewards, quest.Complications, quest.NPCsInvolved,
		quest.LocationsInvolved, quest.FactionAlignment, quest.PartyLevel, quest.Status,
		quest.MoralAmbiguity, quest.CombatIntensity, quest.TimeLimit, quest.AIGenerated,
		quest.AIProvider)
	return err
}

func (s *SQLiteDB) GetQuestByID(ctx context.Context, id string) (*Quest, error) {
	quest := &Quest{}
	query := `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
			  complications, npcs_involved, locations_involved, faction_alignment, party_level,
			  status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
			  created_at, updated_at
			  FROM quests WHERE id = ?`
	var objectives, rewards, complications, npcsInvolved, locationsInvolved sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&quest.ID, &quest.UserID, &quest.CampaignID, &quest.Title, &quest.Type, &quest.Category, &quest.Description,
		&objectives, &rewards, &complications, &npcsInvolved, &locationsInvolved,
		&quest.FactionAlignment, &quest.PartyLevel, &quest.Status, &quest.MoralAmbiguity,
		&quest.CombatIntensity, &quest.TimeLimit, &quest.AIGenerated, &quest.AIProvider,
		&quest.CreatedAt, &quest.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if objectives.Valid {
		quest.Objectives = []byte(objectives.String)
	}
	if rewards.Valid {
		quest.Rewards = []byte(rewards.String)
	}
	if complications.Valid {
		quest.Complications = []byte(complications.String)
	}
	if npcsInvolved.Valid {
		quest.NPCsInvolved = []byte(npcsInvolved.String)
	}
	if locationsInvolved.Valid {
		quest.LocationsInvolved = []byte(locationsInvolved.String)
	}
	return quest, nil
}

func (s *SQLiteDB) ListQuestsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Quest, error) {
	query := `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
			  complications, npcs_involved, locations_involved, faction_alignment, party_level,
			  status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
			  created_at, updated_at
			  FROM quests WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if objectives.Valid {
			quest.Objectives = []byte(objectives.String)
		}
		if rewards.Valid {
			quest.Rewards = []byte(rewards.String)
		}
		if complications.Valid {
			quest.Complications = []byte(complications.String)
		}
		if npcsInvolved.Valid {
			quest.NPCsInvolved = []byte(npcsInvolved.String)
		}
		if locationsInvolved.Valid {
			quest.LocationsInvolved = []byte(locationsInvolved.String)
		}
		quests = append(quests, quest)
	}
	return quests, nil
}

func (s *SQLiteDB) UpdateQuest(ctx context.Context, quest *Quest) error {
	query := `UPDATE quests SET title = ?, type = ?, category = ?, description = ?, objectives = ?,
			  rewards = ?, complications = ?, npcs_involved = ?, locations_involved = ?,
			  faction_alignment = ?, party_level = ?, status = ?, moral_ambiguity = ?,
			  combat_intensity = ?, time_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		quest.Title, quest.Type, quest.Category, quest.Description, quest.Objectives,
		quest.Rewards, quest.Complications, quest.NPCsInvolved, quest.LocationsInvolved,
		quest.FactionAlignment, quest.PartyLevel, quest.Status, quest.MoralAmbiguity,
		quest.CombatIntensity, quest.TimeLimit, quest.ID)
	return err
}

func (s *SQLiteDB) DeleteQuest(ctx context.Context, id string) error {
	query := `DELETE FROM quests WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Item operations
func (s *SQLiteDB) CreateItem(ctx context.Context, item *Item) error {
	if item.ID == "" {
		item.ID = generateUUID()
	}

	query := `INSERT INTO items (id, user_id, campaign_id, name, type, rarity, description, properties, origin,
			  previous_owner, complication, value, weight, attunement, location_found, ai_generated,
			  ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		item.ID, item.UserID, item.CampaignID, item.Name, item.Type, item.Rarity, item.Description, item.Properties,
		item.Origin, item.PreviousOwner, item.Complication, item.Value, item.Weight,
		item.Attunement, item.LocationFound, item.AIGenerated, item.AIProvider)
	return err
}

func (s *SQLiteDB) GetItemByID(ctx context.Context, id string) (*Item, error) {
	item := &Item{}
	query := `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
			  complication, value, weight, attunement, location_found, ai_generated, ai_provider,
			  created_at, updated_at
			  FROM items WHERE id = ?`
	var properties sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&item.ID, &item.UserID, &item.CampaignID, &item.Name, &item.Type, &item.Rarity, &item.Description,
		&properties, &item.Origin, &item.PreviousOwner, &item.Complication, &item.Value,
		&item.Weight, &item.Attunement, &item.LocationFound, &item.AIGenerated, &item.AIProvider,
		&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if properties.Valid {
		item.Properties = []byte(properties.String)
	}
	return item, nil
}

func (s *SQLiteDB) ListItemsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Item, error) {
	query := `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
			  complication, value, weight, attunement, location_found, ai_generated, ai_provider,
			  created_at, updated_at
			  FROM items WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if properties.Valid {
			item.Properties = []byte(properties.String)
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *SQLiteDB) UpdateItem(ctx context.Context, item *Item) error {
	query := `UPDATE items SET name = ?, type = ?, rarity = ?, description = ?, properties = ?,
			  origin = ?, previous_owner = ?, complication = ?, value = ?, weight = ?, attunement = ?,
			  location_found = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		item.Name, item.Type, item.Rarity, item.Description, item.Properties, item.Origin,
		item.PreviousOwner, item.Complication, item.Value, item.Weight, item.Attunement,
		item.LocationFound, item.ID)
	return err
}

func (s *SQLiteDB) DeleteItem(ctx context.Context, id string) error {
	query := `DELETE FROM items WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Rumor operations
func (s *SQLiteDB) CreateRumor(ctx context.Context, rumor *Rumor) error {
	if rumor.ID == "" {
		rumor.ID = generateUUID()
	}

	query := `INSERT INTO rumors (id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
			  foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		rumor.ID, rumor.UserID, rumor.CampaignID, rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo,
		rumor.RelatedID, rumor.Context, rumor.Foreshadowing, rumor.Tags, rumor.Revealed,
		rumor.AIGenerated, rumor.AIProvider)
	return err
}

func (s *SQLiteDB) GetRumorByID(ctx context.Context, id string) (*Rumor, error) {
	rumor := &Rumor{}
	query := `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
			  foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
			  FROM rumors WHERE id = ?`
	var tags sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&rumor.ID, &rumor.UserID, &rumor.CampaignID, &rumor.Text, &rumor.Source, &rumor.Veracity, &rumor.LeadsTo,
		&rumor.RelatedID, &rumor.Context, &rumor.Foreshadowing, &tags, &rumor.Revealed,
		&rumor.AIGenerated, &rumor.AIProvider, &rumor.CreatedAt, &rumor.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if tags.Valid {
		rumor.Tags = []byte(tags.String)
	}
	return rumor, nil
}

func (s *SQLiteDB) ListRumorsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Rumor, error) {
	query := `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
			  foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
			  FROM rumors WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if tags.Valid {
			rumor.Tags = []byte(tags.String)
		}
		rumors = append(rumors, rumor)
	}
	return rumors, nil
}

func (s *SQLiteDB) UpdateRumor(ctx context.Context, rumor *Rumor) error {
	query := `UPDATE rumors SET text = ?, source = ?, veracity = ?, leads_to = ?, related_id = ?,
			  context = ?, foreshadowing = ?, tags = ?, revealed = ?, updated_at = CURRENT_TIMESTAMP
			  WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo, rumor.RelatedID, rumor.Context,
		rumor.Foreshadowing, rumor.Tags, rumor.Revealed, rumor.ID)
	return err
}

func (s *SQLiteDB) DeleteRumor(ctx context.Context, id string) error {
	query := `DELETE FROM rumors WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Tavern operations
func (s *SQLiteDB) CreateTavern(ctx context.Context, tavern *Tavern) error {
	if tavern.ID == "" {
		tavern.ID = generateUUID()
	}

	query := `INSERT INTO taverns (id, user_id, campaign_id, name, type, atmosphere, description,
			  keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
			  events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		tavern.ID, tavern.UserID, tavern.CampaignID, tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes,
		tavern.AIGenerated, tavern.AIProvider)
	return err
}

func (s *SQLiteDB) GetTavernByID(ctx context.Context, id string) (*Tavern, error) {
	tavern := &Tavern{}
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
			  keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
			  events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM taverns WHERE id = ?`
	var menuFood, menuDrinks, rooms, patrons, events, rumors sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&tavern.ID, &tavern.UserID, &tavern.CampaignID, &tavern.Name, &tavern.Type, &tavern.Atmosphere, &tavern.Description,
		&tavern.KeeperName, &tavern.KeeperPersonality, &tavern.KeeperDescription, &menuFood, &menuDrinks,
		&rooms, &patrons, &events, &rumors, &tavern.SpecialNotes,
		&tavern.AIGenerated, &tavern.AIProvider, &tavern.CreatedAt, &tavern.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if menuFood.Valid {
		tavern.MenuFood = []byte(menuFood.String)
	}
	if menuDrinks.Valid {
		tavern.MenuDrinks = []byte(menuDrinks.String)
	}
	if rooms.Valid {
		tavern.Rooms = []byte(rooms.String)
	}
	if patrons.Valid {
		tavern.Patrons = []byte(patrons.String)
	}
	if events.Valid {
		tavern.Events = []byte(events.String)
	}
	if rumors.Valid {
		tavern.Rumors = []byte(rumors.String)
	}
	return tavern, nil
}

func (s *SQLiteDB) ListTavernsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Tavern, error) {
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
			  keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
			  events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM taverns WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if menuFood.Valid {
			tavern.MenuFood = []byte(menuFood.String)
		}
		if menuDrinks.Valid {
			tavern.MenuDrinks = []byte(menuDrinks.String)
		}
		if rooms.Valid {
			tavern.Rooms = []byte(rooms.String)
		}
		if patrons.Valid {
			tavern.Patrons = []byte(patrons.String)
		}
		if events.Valid {
			tavern.Events = []byte(events.String)
		}
		if rumors.Valid {
			tavern.Rumors = []byte(rumors.String)
		}
		taverns = append(taverns, tavern)
	}
	return taverns, nil
}

func (s *SQLiteDB) ListTavernsByCampaignID(ctx context.Context, campaignID string) ([]*Tavern, error) {
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
			  keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
			  events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM taverns WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if menuFood.Valid {
			tavern.MenuFood = []byte(menuFood.String)
		}
		if menuDrinks.Valid {
			tavern.MenuDrinks = []byte(menuDrinks.String)
		}
		if rooms.Valid {
			tavern.Rooms = []byte(rooms.String)
		}
		if patrons.Valid {
			tavern.Patrons = []byte(patrons.String)
		}
		if events.Valid {
			tavern.Events = []byte(events.String)
		}
		if rumors.Valid {
			tavern.Rumors = []byte(rumors.String)
		}
		taverns = append(taverns, tavern)
	}
	return taverns, nil
}

func (s *SQLiteDB) UpdateTavern(ctx context.Context, tavern *Tavern) error {
	query := `UPDATE taverns SET name = ?, type = ?, atmosphere = ?, description = ?,
			  keeper_name = ?, keeper_personality = ?, keeper_description = ?, menu_food = ?, menu_drinks = ?,
			  rooms = ?, patrons = ?, events = ?, rumors = ?, special_notes = ?, updated_at = CURRENT_TIMESTAMP
			  WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes, tavern.ID)
	return err
}

func (s *SQLiteDB) DeleteTavern(ctx context.Context, id string) error {
	query := `DELETE FROM taverns WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Merchant operations
func (s *SQLiteDB) CreateMerchant(ctx context.Context, merchant *Merchant) error {
	if merchant.ID == "" {
		merchant.ID = generateUUID()
	}

	query := `INSERT INTO merchants (id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
			  owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
			  recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		merchant.ID, merchant.UserID, merchant.CampaignID, merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness,
		merchant.AIGenerated, merchant.AIProvider)
	return err
}

func (s *SQLiteDB) GetMerchantByID(ctx context.Context, id string) (*Merchant, error) {
	merchant := &Merchant{}
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
			  owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
			  recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
			  FROM merchants WHERE id = ?`
	var inventory, services, specialItems, rumors, recentlySold sql.NullString
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&merchant.ID, &merchant.UserID, &merchant.CampaignID, &merchant.Name, &merchant.ShopType, &merchant.Atmosphere, &merchant.Description, &merchant.Location,
		&merchant.OwnerName, &merchant.OwnerPersonality, &merchant.OwnerDescription, &inventory, &services,
		&specialItems, &rumors, &recentlySold, &merchant.SpecialNotes, &merchant.HaggleWillingness,
		&merchant.AIGenerated, &merchant.AIProvider, &merchant.CreatedAt, &merchant.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if inventory.Valid {
		merchant.Inventory = []byte(inventory.String)
	}
	if services.Valid {
		merchant.Services = []byte(services.String)
	}
	if specialItems.Valid {
		merchant.SpecialItems = []byte(specialItems.String)
	}
	if rumors.Valid {
		merchant.Rumors = []byte(rumors.String)
	}
	if recentlySold.Valid {
		merchant.RecentlySold = []byte(recentlySold.String)
	}
	return merchant, nil
}

func (s *SQLiteDB) ListMerchantsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Merchant, error) {
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
			  owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
			  recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
			  FROM merchants WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if inventory.Valid {
			merchant.Inventory = []byte(inventory.String)
		}
		if services.Valid {
			merchant.Services = []byte(services.String)
		}
		if specialItems.Valid {
			merchant.SpecialItems = []byte(specialItems.String)
		}
		if rumors.Valid {
			merchant.Rumors = []byte(rumors.String)
		}
		if recentlySold.Valid {
			merchant.RecentlySold = []byte(recentlySold.String)
		}
		merchants = append(merchants, merchant)
	}
	return merchants, nil
}

func (s *SQLiteDB) ListMerchantsByCampaignID(ctx context.Context, campaignID string) ([]*Merchant, error) {
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
			  owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
			  recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
			  FROM merchants WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if inventory.Valid {
			merchant.Inventory = []byte(inventory.String)
		}
		if services.Valid {
			merchant.Services = []byte(services.String)
		}
		if specialItems.Valid {
			merchant.SpecialItems = []byte(specialItems.String)
		}
		if rumors.Valid {
			merchant.Rumors = []byte(rumors.String)
		}
		if recentlySold.Valid {
			merchant.RecentlySold = []byte(recentlySold.String)
		}
		merchants = append(merchants, merchant)
	}
	return merchants, nil
}

func (s *SQLiteDB) UpdateMerchant(ctx context.Context, merchant *Merchant) error {
	query := `UPDATE merchants SET name = ?, shop_type = ?, atmosphere = ?, description = ?, location = ?,
			  owner_name = ?, owner_personality = ?, owner_description = ?, inventory = ?, services = ?,
			  special_items = ?, rumors = ?, recently_sold = ?, special_notes = ?, haggle_willingness = ?, updated_at = CURRENT_TIMESTAMP
			  WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query,
		merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness, merchant.ID)
	return err
}

func (s *SQLiteDB) DeleteMerchant(ctx context.Context, id string) error {
	query := `DELETE FROM merchants WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Trap operations
func (s *SQLiteDB) CreateTrap(ctx context.Context, trap *Trap) error {
	if trap.ID == "" {
		trap.ID = generateUUID()
	}

	query := `INSERT INTO traps (id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
			  trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
			  ai_generated, ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err := s.db.ExecContext(ctx, query,
		trap.ID, trap.UserID, trap.CampaignID, trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.AIGenerated, trap.AIProvider)
	return err
}

func (s *SQLiteDB) GetTrapByID(ctx context.Context, id string) (*Trap, error) {
	trap := &Trap{}
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
			  trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
			  ai_generated, ai_provider, created_at, updated_at
			  FROM traps WHERE id = ?`
	var detection, solutionPaths, complications, rewards, scaling sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&trap.ID, &trap.UserID, &trap.CampaignID, &trap.Name, &trap.TrapType, &trap.Difficulty, &trap.Description, &trap.Environment,
		&trap.Trigger, &trap.Effect, &trap.Damage, &detection, &solutionPaths, &complications,
		&rewards, &scaling, &trap.DMNotes, &trap.AIGenerated, &trap.AIProvider, &trap.CreatedAt, &trap.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if detection.Valid {
		trap.Detection = []byte(detection.String)
	}
	if solutionPaths.Valid {
		trap.SolutionPaths = []byte(solutionPaths.String)
	}
	if complications.Valid {
		trap.Complications = []byte(complications.String)
	}
	if rewards.Valid {
		trap.Rewards = []byte(rewards.String)
	}
	if scaling.Valid {
		trap.Scaling = []byte(scaling.String)
	}

	return trap, nil
}

func (s *SQLiteDB) ListTrapsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Trap, error) {
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
			  trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
			  ai_generated, ai_provider, created_at, updated_at
			  FROM traps WHERE user_id = ?`
	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
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

		if detection.Valid {
			trap.Detection = []byte(detection.String)
		}
		if solutionPaths.Valid {
			trap.SolutionPaths = []byte(solutionPaths.String)
		}
		if complications.Valid {
			trap.Complications = []byte(complications.String)
		}
		if rewards.Valid {
			trap.Rewards = []byte(rewards.String)
		}
		if scaling.Valid {
			trap.Scaling = []byte(scaling.String)
		}

		traps = append(traps, trap)
	}
	return traps, nil
}

func (s *SQLiteDB) ListTrapsByCampaignID(ctx context.Context, campaignID string) ([]*Trap, error) {
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
			  trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
			  ai_generated, ai_provider, created_at, updated_at
			  FROM traps WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
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

		if detection.Valid {
			trap.Detection = []byte(detection.String)
		}
		if solutionPaths.Valid {
			trap.SolutionPaths = []byte(solutionPaths.String)
		}
		if complications.Valid {
			trap.Complications = []byte(complications.String)
		}
		if rewards.Valid {
			trap.Rewards = []byte(rewards.String)
		}
		if scaling.Valid {
			trap.Scaling = []byte(scaling.String)
		}

		traps = append(traps, trap)
	}
	return traps, nil
}

func (s *SQLiteDB) UpdateTrap(ctx context.Context, trap *Trap) error {
	query := `UPDATE traps SET name = ?, trap_type = ?, difficulty = ?, description = ?, environment = ?,
			  trigger = ?, effect = ?, damage = ?, detection = ?, solution_paths = ?, complications = ?,
			  rewards = ?, scaling = ?, dm_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.ID)
	return err
}

func (s *SQLiteDB) DeleteTrap(ctx context.Context, id string) error {
	query := `DELETE FROM traps WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Critter operations
func (s *SQLiteDB) CreateCritter(ctx context.Context, critter *Critter) error {
	if critter.ID == "" {
		critter.ID = generateUUID()
	}
	critter.CreatedAt = time.Now()
	critter.UpdatedAt = time.Now()

	query := `INSERT INTO critters (id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
				description, behavior, stats, special_abilities, uses, training_difficulty, diet,
				lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		critter.ID, critter.UserID, critter.CampaignID, critter.Name, critter.Species, critter.CritterType,
		critter.Size, critter.Temperament, critter.Habitat, critter.Description, critter.Behavior,
		critter.Stats, critter.SpecialAbilities, critter.Uses, critter.TrainingDifficulty, critter.Diet,
		critter.Lifespan, critter.InterestingFacts, critter.EncounterNotes, critter.AIGenerated,
		critter.AIProvider, critter.CreatedAt, critter.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetCritterByID(ctx context.Context, id string) (*Critter, error) {
	critter := &Critter{}
	var stats, specialAbilities, uses, interestingFacts sql.NullString
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
				description, behavior, stats, special_abilities, uses, training_difficulty, diet,
				lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM critters WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&critter.ID, &critter.UserID, &critter.CampaignID, &critter.Name, &critter.Species, &critter.CritterType,
		&critter.Size, &critter.Temperament, &critter.Habitat, &critter.Description, &critter.Behavior,
		&stats, &specialAbilities, &uses, &critter.TrainingDifficulty, &critter.Diet,
		&critter.Lifespan, &interestingFacts, &critter.EncounterNotes, &critter.AIGenerated,
		&critter.AIProvider, &critter.CreatedAt, &critter.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// Convert nullable JSON fields
	if stats.Valid {
		critter.Stats = []byte(stats.String)
	}
	if specialAbilities.Valid {
		critter.SpecialAbilities = []byte(specialAbilities.String)
	}
	if uses.Valid {
		critter.Uses = []byte(uses.String)
	}
	if interestingFacts.Valid {
		critter.InterestingFacts = []byte(interestingFacts.String)
	}

	return critter, nil
}

func (s *SQLiteDB) ListCrittersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Critter, error) {
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
				description, behavior, stats, special_abilities, uses, training_difficulty, diet,
				lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM critters WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += sqlAndCampaignIDEquals
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
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

		// Convert nullable JSON fields
		if stats.Valid {
			critter.Stats = []byte(stats.String)
		}
		if specialAbilities.Valid {
			critter.SpecialAbilities = []byte(specialAbilities.String)
		}
		if uses.Valid {
			critter.Uses = []byte(uses.String)
		}
		if interestingFacts.Valid {
			critter.InterestingFacts = []byte(interestingFacts.String)
		}

		critters = append(critters, critter)
	}

	return critters, nil
}

func (s *SQLiteDB) ListCrittersByCampaignID(ctx context.Context, campaignID string) ([]*Critter, error) {
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
				description, behavior, stats, special_abilities, uses, training_difficulty, diet,
				lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
			  FROM critters WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
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

		// Convert nullable JSON fields
		if stats.Valid {
			critter.Stats = []byte(stats.String)
		}
		if specialAbilities.Valid {
			critter.SpecialAbilities = []byte(specialAbilities.String)
		}
		if uses.Valid {
			critter.Uses = []byte(uses.String)
		}
		if interestingFacts.Valid {
			critter.InterestingFacts = []byte(interestingFacts.String)
		}

		critters = append(critters, critter)
	}

	return critters, nil
}

func (s *SQLiteDB) UpdateCritter(ctx context.Context, critter *Critter) error {
	critter.UpdatedAt = time.Now()
	query := `UPDATE critters SET name = ?, species = ?, critter_type = ?, size = ?, temperament = ?, habitat = ?,
				description = ?, behavior = ?, stats = ?, special_abilities = ?, uses = ?, training_difficulty = ?,
				diet = ?, lifespan = ?, interesting_facts = ?, encounter_notes = ?, updated_at = ?
			  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		critter.Name, critter.Species, critter.CritterType, critter.Size, critter.Temperament, critter.Habitat,
		critter.Description, critter.Behavior, critter.Stats, critter.SpecialAbilities, critter.Uses,
		critter.TrainingDifficulty, critter.Diet, critter.Lifespan, critter.InterestingFacts,
		critter.EncounterNotes, critter.UpdatedAt, critter.ID)
	return err
}

func (s *SQLiteDB) DeleteCritter(ctx context.Context, id string) error {
	query := `DELETE FROM critters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}
