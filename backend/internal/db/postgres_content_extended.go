package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Location Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateLocation(ctx context.Context, location *Location) error {
	if location.ID == "" {
		location.ID = generateUUID()
	}
	location.CreatedAt = time.Now()
	location.UpdatedAt = time.Now()

	query := `INSERT INTO locations (id, user_id, campaign_id, name, type, theme, description, features,
              secrets, factions, npcs, encounters, map, parent_id, ai_generated, ai_provider,
              created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`
	_, err := db.pool.Exec(ctx, query,
		location.ID, location.UserID, location.CampaignID, location.Name, location.Type, location.Theme, location.Description,
		location.Features, location.Secrets, location.Factions, location.NPCs, location.Encounters,
		location.Map, location.ParentID, location.AIGenerated, location.AIProvider,
		location.CreatedAt, location.UpdatedAt)
	return err
}

func (db *PostgresDB) GetLocationByID(ctx context.Context, id string) (*Location, error) {
	location := &Location{}
	query := `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
              npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
              FROM locations WHERE id = $1`
	var features, secrets, factions, npcs, encounters sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&location.ID, &location.UserID, &location.CampaignID, &location.Name, &location.Type, &location.Theme,
		&location.Description, &features, &secrets, &factions, &npcs, &encounters, &location.Map,
		&location.ParentID, &location.AIGenerated, &location.AIProvider, &location.CreatedAt,
		&location.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) ListLocationsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Location, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
                 npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
                 FROM locations WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, type, theme, description, features, secrets, factions,
                 npcs, encounters, map, parent_id, ai_generated, ai_provider, created_at, updated_at
                 FROM locations WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return locations, rows.Err()
}

func (db *PostgresDB) UpdateLocation(ctx context.Context, location *Location) error {
	location.UpdatedAt = time.Now()
	query := `UPDATE locations SET name = $1, type = $2, theme = $3, description = $4, features = $5,
              secrets = $6, factions = $7, npcs = $8, encounters = $9, map = $10, parent_id = $11,
              updated_at = $12 WHERE id = $13`
	_, err := db.pool.Exec(ctx, query,
		location.Name, location.Type, location.Theme, location.Description, location.Features,
		location.Secrets, location.Factions, location.NPCs, location.Encounters, location.Map,
		location.ParentID, location.UpdatedAt, location.ID)
	return err
}

func (db *PostgresDB) DeleteLocation(ctx context.Context, id string) error {
	query := `DELETE FROM locations WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Quest Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateQuest(ctx context.Context, quest *Quest) error {
	if quest.ID == "" {
		quest.ID = generateUUID()
	}
	quest.CreatedAt = time.Now()
	quest.UpdatedAt = time.Now()

	query := `INSERT INTO quests (id, user_id, campaign_id, title, type, category, description, objectives,
              rewards, complications, npcs_involved, locations_involved, faction_alignment, party_level,
              status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
              created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`
	_, err := db.pool.Exec(ctx, query,
		quest.ID, quest.UserID, quest.CampaignID, quest.Title, quest.Type, quest.Category, quest.Description,
		quest.Objectives, quest.Rewards, quest.Complications, quest.NPCsInvolved,
		quest.LocationsInvolved, quest.FactionAlignment, quest.PartyLevel, quest.Status,
		quest.MoralAmbiguity, quest.CombatIntensity, quest.TimeLimit, quest.AIGenerated,
		quest.AIProvider, quest.CreatedAt, quest.UpdatedAt)
	return err
}

func (db *PostgresDB) GetQuestByID(ctx context.Context, id string) (*Quest, error) {
	quest := &Quest{}
	query := `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
              complications, npcs_involved, locations_involved, faction_alignment, party_level,
              status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
              created_at, updated_at
              FROM quests WHERE id = $1`
	var objectives, rewards, complications, npcsInvolved, locationsInvolved sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&quest.ID, &quest.UserID, &quest.CampaignID, &quest.Title, &quest.Type, &quest.Category, &quest.Description,
		&objectives, &rewards, &complications, &npcsInvolved, &locationsInvolved,
		&quest.FactionAlignment, &quest.PartyLevel, &quest.Status, &quest.MoralAmbiguity,
		&quest.CombatIntensity, &quest.TimeLimit, &quest.AIGenerated, &quest.AIProvider,
		&quest.CreatedAt, &quest.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) ListQuestsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Quest, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
                 complications, npcs_involved, locations_involved, faction_alignment, party_level,
                 status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
                 created_at, updated_at
                 FROM quests WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, title, type, category, description, objectives, rewards,
                 complications, npcs_involved, locations_involved, faction_alignment, party_level,
                 status, moral_ambiguity, combat_intensity, time_limit, ai_generated, ai_provider,
                 created_at, updated_at
                 FROM quests WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return quests, rows.Err()
}

func (db *PostgresDB) UpdateQuest(ctx context.Context, quest *Quest) error {
	quest.UpdatedAt = time.Now()
	query := `UPDATE quests SET title = $1, type = $2, category = $3, description = $4, objectives = $5,
              rewards = $6, complications = $7, npcs_involved = $8, locations_involved = $9,
              faction_alignment = $10, party_level = $11, status = $12, moral_ambiguity = $13,
              combat_intensity = $14, time_limit = $15, updated_at = $16 WHERE id = $17`
	_, err := db.pool.Exec(ctx, query,
		quest.Title, quest.Type, quest.Category, quest.Description, quest.Objectives,
		quest.Rewards, quest.Complications, quest.NPCsInvolved, quest.LocationsInvolved,
		quest.FactionAlignment, quest.PartyLevel, quest.Status, quest.MoralAmbiguity,
		quest.CombatIntensity, quest.TimeLimit, quest.UpdatedAt, quest.ID)
	return err
}

func (db *PostgresDB) DeleteQuest(ctx context.Context, id string) error {
	query := `DELETE FROM quests WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Item Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateItem(ctx context.Context, item *Item) error {
	if item.ID == "" {
		item.ID = generateUUID()
	}
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()

	query := `INSERT INTO items (id, user_id, campaign_id, name, type, rarity, description, properties, origin,
              previous_owner, complication, value, weight, attunement, location_found, ai_generated,
              ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`
	_, err := db.pool.Exec(ctx, query,
		item.ID, item.UserID, item.CampaignID, item.Name, item.Type, item.Rarity, item.Description, item.Properties,
		item.Origin, item.PreviousOwner, item.Complication, item.Value, item.Weight,
		item.Attunement, item.LocationFound, item.AIGenerated, item.AIProvider,
		item.CreatedAt, item.UpdatedAt)
	return err
}

func (db *PostgresDB) GetItemByID(ctx context.Context, id string) (*Item, error) {
	item := &Item{}
	query := `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
              complication, value, weight, attunement, location_found, ai_generated, ai_provider,
              created_at, updated_at
              FROM items WHERE id = $1`
	var properties sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.UserID, &item.CampaignID, &item.Name, &item.Type, &item.Rarity, &item.Description,
		&properties, &item.Origin, &item.PreviousOwner, &item.Complication, &item.Value,
		&item.Weight, &item.Attunement, &item.LocationFound, &item.AIGenerated, &item.AIProvider,
		&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if properties.Valid {
		item.Properties = []byte(properties.String)
	}
	return item, nil
}

func (db *PostgresDB) ListItemsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Item, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
                 complication, value, weight, attunement, location_found, ai_generated, ai_provider,
                 created_at, updated_at
                 FROM items WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, type, rarity, description, properties, origin, previous_owner,
                 complication, value, weight, attunement, location_found, ai_generated, ai_provider,
                 created_at, updated_at
                 FROM items WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return items, rows.Err()
}

func (db *PostgresDB) UpdateItem(ctx context.Context, item *Item) error {
	item.UpdatedAt = time.Now()
	query := `UPDATE items SET name = $1, type = $2, rarity = $3, description = $4, properties = $5,
              origin = $6, previous_owner = $7, complication = $8, value = $9, weight = $10, attunement = $11,
              location_found = $12, updated_at = $13 WHERE id = $14`
	_, err := db.pool.Exec(ctx, query,
		item.Name, item.Type, item.Rarity, item.Description, item.Properties, item.Origin,
		item.PreviousOwner, item.Complication, item.Value, item.Weight, item.Attunement,
		item.LocationFound, item.UpdatedAt, item.ID)
	return err
}

func (db *PostgresDB) DeleteItem(ctx context.Context, id string) error {
	query := `DELETE FROM items WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Rumor Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateRumor(ctx context.Context, rumor *Rumor) error {
	if rumor.ID == "" {
		rumor.ID = generateUUID()
	}
	rumor.CreatedAt = time.Now()
	rumor.UpdatedAt = time.Now()

	query := `INSERT INTO rumors (id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
              foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := db.pool.Exec(ctx, query,
		rumor.ID, rumor.UserID, rumor.CampaignID, rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo,
		rumor.RelatedID, rumor.Context, rumor.Foreshadowing, rumor.Tags, rumor.Revealed,
		rumor.AIGenerated, rumor.AIProvider, rumor.CreatedAt, rumor.UpdatedAt)
	return err
}

func (db *PostgresDB) GetRumorByID(ctx context.Context, id string) (*Rumor, error) {
	rumor := &Rumor{}
	query := `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
              foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
              FROM rumors WHERE id = $1`
	var tags sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&rumor.ID, &rumor.UserID, &rumor.CampaignID, &rumor.Text, &rumor.Source, &rumor.Veracity, &rumor.LeadsTo,
		&rumor.RelatedID, &rumor.Context, &rumor.Foreshadowing, &tags, &rumor.Revealed,
		&rumor.AIGenerated, &rumor.AIProvider, &rumor.CreatedAt, &rumor.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	if tags.Valid {
		rumor.Tags = []byte(tags.String)
	}
	return rumor, nil
}

func (db *PostgresDB) ListRumorsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Rumor, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
                 foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
                 FROM rumors WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, text, source, veracity, leads_to, related_id, context,
                 foreshadowing, tags, revealed, ai_generated, ai_provider, created_at, updated_at
                 FROM rumors WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return rumors, rows.Err()
}

func (db *PostgresDB) UpdateRumor(ctx context.Context, rumor *Rumor) error {
	rumor.UpdatedAt = time.Now()
	query := `UPDATE rumors SET text = $1, source = $2, veracity = $3, leads_to = $4, related_id = $5,
              context = $6, foreshadowing = $7, tags = $8, revealed = $9, updated_at = $10
              WHERE id = $11`
	_, err := db.pool.Exec(ctx, query,
		rumor.Text, rumor.Source, rumor.Veracity, rumor.LeadsTo, rumor.RelatedID, rumor.Context,
		rumor.Foreshadowing, rumor.Tags, rumor.Revealed, rumor.UpdatedAt, rumor.ID)
	return err
}

func (db *PostgresDB) DeleteRumor(ctx context.Context, id string) error {
	query := `DELETE FROM rumors WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Tavern Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateTavern(ctx context.Context, tavern *Tavern) error {
	if tavern.ID == "" {
		tavern.ID = generateUUID()
	}
	tavern.CreatedAt = time.Now()
	tavern.UpdatedAt = time.Now()

	query := `INSERT INTO taverns (id, user_id, campaign_id, name, type, atmosphere, description,
              keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
              events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`
	_, err := db.pool.Exec(ctx, query,
		tavern.ID, tavern.UserID, tavern.CampaignID, tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes,
		tavern.AIGenerated, tavern.AIProvider, tavern.CreatedAt, tavern.UpdatedAt)
	return err
}

func (db *PostgresDB) GetTavernByID(ctx context.Context, id string) (*Tavern, error) {
	tavern := &Tavern{}
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
              keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
              events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
              FROM taverns WHERE id = $1`
	var menuFood, menuDrinks, rooms, patrons, events, rumors sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&tavern.ID, &tavern.UserID, &tavern.CampaignID, &tavern.Name, &tavern.Type, &tavern.Atmosphere, &tavern.Description,
		&tavern.KeeperName, &tavern.KeeperPersonality, &tavern.KeeperDescription, &menuFood, &menuDrinks,
		&rooms, &patrons, &events, &rumors, &tavern.SpecialNotes,
		&tavern.AIGenerated, &tavern.AIProvider, &tavern.CreatedAt, &tavern.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) ListTavernsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Tavern, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
                 keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
                 events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
                 FROM taverns WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
                 keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
                 events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
                 FROM taverns WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return taverns, rows.Err()
}

func (db *PostgresDB) ListTavernsByCampaignID(ctx context.Context, campaignID string) ([]*Tavern, error) {
	query := `SELECT id, user_id, campaign_id, name, type, atmosphere, description,
              keeper_name, keeper_personality, keeper_description, menu_food, menu_drinks, rooms, patrons,
              events, rumors, special_notes, ai_generated, ai_provider, created_at, updated_at
              FROM taverns WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return taverns, rows.Err()
}

func (db *PostgresDB) UpdateTavern(ctx context.Context, tavern *Tavern) error {
	tavern.UpdatedAt = time.Now()
	query := `UPDATE taverns SET name = $1, type = $2, atmosphere = $3, description = $4,
              keeper_name = $5, keeper_personality = $6, keeper_description = $7, menu_food = $8, menu_drinks = $9,
              rooms = $10, patrons = $11, events = $12, rumors = $13, special_notes = $14, updated_at = $15
              WHERE id = $16`
	_, err := db.pool.Exec(ctx, query,
		tavern.Name, tavern.Type, tavern.Atmosphere, tavern.Description,
		tavern.KeeperName, tavern.KeeperPersonality, tavern.KeeperDescription, tavern.MenuFood, tavern.MenuDrinks,
		tavern.Rooms, tavern.Patrons, tavern.Events, tavern.Rumors, tavern.SpecialNotes, tavern.UpdatedAt, tavern.ID)
	return err
}

func (db *PostgresDB) DeleteTavern(ctx context.Context, id string) error {
	query := `DELETE FROM taverns WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Merchant Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateMerchant(ctx context.Context, merchant *Merchant) error {
	if merchant.ID == "" {
		merchant.ID = generateUUID()
	}
	merchant.CreatedAt = time.Now()
	merchant.UpdatedAt = time.Now()

	query := `INSERT INTO merchants (id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
              owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
              recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`
	_, err := db.pool.Exec(ctx, query,
		merchant.ID, merchant.UserID, merchant.CampaignID, merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness,
		merchant.AIGenerated, merchant.AIProvider, merchant.CreatedAt, merchant.UpdatedAt)
	return err
}

func (db *PostgresDB) GetMerchantByID(ctx context.Context, id string) (*Merchant, error) {
	merchant := &Merchant{}
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
              owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
              recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
              FROM merchants WHERE id = $1`
	var inventory, services, specialItems, rumors, recentlySold sql.NullString
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&merchant.ID, &merchant.UserID, &merchant.CampaignID, &merchant.Name, &merchant.ShopType, &merchant.Atmosphere, &merchant.Description, &merchant.Location,
		&merchant.OwnerName, &merchant.OwnerPersonality, &merchant.OwnerDescription, &inventory, &services,
		&specialItems, &rumors, &recentlySold, &merchant.SpecialNotes, &merchant.HaggleWillingness,
		&merchant.AIGenerated, &merchant.AIProvider, &merchant.CreatedAt, &merchant.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) ListMerchantsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Merchant, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
                 owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
                 recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
                 FROM merchants WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
                 owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
                 recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
                 FROM merchants WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return merchants, rows.Err()
}

func (db *PostgresDB) ListMerchantsByCampaignID(ctx context.Context, campaignID string) ([]*Merchant, error) {
	query := `SELECT id, user_id, campaign_id, name, shop_type, atmosphere, description, location,
              owner_name, owner_personality, owner_description, inventory, services, special_items, rumors,
              recently_sold, special_notes, haggle_willingness, ai_generated, ai_provider, created_at, updated_at
              FROM merchants WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return merchants, rows.Err()
}

func (db *PostgresDB) UpdateMerchant(ctx context.Context, merchant *Merchant) error {
	merchant.UpdatedAt = time.Now()
	query := `UPDATE merchants SET name = $1, shop_type = $2, atmosphere = $3, description = $4, location = $5,
              owner_name = $6, owner_personality = $7, owner_description = $8, inventory = $9, services = $10,
              special_items = $11, rumors = $12, recently_sold = $13, special_notes = $14, haggle_willingness = $15, updated_at = $16
              WHERE id = $17`
	_, err := db.pool.Exec(ctx, query,
		merchant.Name, merchant.ShopType, merchant.Atmosphere, merchant.Description, merchant.Location,
		merchant.OwnerName, merchant.OwnerPersonality, merchant.OwnerDescription, merchant.Inventory, merchant.Services,
		merchant.SpecialItems, merchant.Rumors, merchant.RecentlySold, merchant.SpecialNotes, merchant.HaggleWillingness, merchant.UpdatedAt, merchant.ID)
	return err
}

func (db *PostgresDB) DeleteMerchant(ctx context.Context, id string) error {
	query := `DELETE FROM merchants WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Trap Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateTrap(ctx context.Context, trap *Trap) error {
	if trap.ID == "" {
		trap.ID = generateUUID()
	}
	trap.CreatedAt = time.Now()
	trap.UpdatedAt = time.Now()

	query := `INSERT INTO traps (id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
              trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
              ai_generated, ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`
	_, err := db.pool.Exec(ctx, query,
		trap.ID, trap.UserID, trap.CampaignID, trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.AIGenerated, trap.AIProvider, trap.CreatedAt, trap.UpdatedAt)
	return err
}

func (db *PostgresDB) GetTrapByID(ctx context.Context, id string) (*Trap, error) {
	trap := &Trap{}
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
              trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
              ai_generated, ai_provider, created_at, updated_at
              FROM traps WHERE id = $1`
	var detection, solutionPaths, complications, rewards, scaling sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&trap.ID, &trap.UserID, &trap.CampaignID, &trap.Name, &trap.TrapType, &trap.Difficulty, &trap.Description, &trap.Environment,
		&trap.Trigger, &trap.Effect, &trap.Damage, &detection, &solutionPaths, &complications,
		&rewards, &scaling, &trap.DMNotes, &trap.AIGenerated, &trap.AIProvider, &trap.CreatedAt, &trap.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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

func (db *PostgresDB) ListTrapsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Trap, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
                 trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
                 ai_generated, ai_provider, created_at, updated_at
                 FROM traps WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
                 trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
                 ai_generated, ai_provider, created_at, updated_at
                 FROM traps WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return traps, rows.Err()
}

func (db *PostgresDB) ListTrapsByCampaignID(ctx context.Context, campaignID string) ([]*Trap, error) {
	query := `SELECT id, user_id, campaign_id, name, trap_type, difficulty, description, environment,
              trigger, effect, damage, detection, solution_paths, complications, rewards, scaling, dm_notes,
              ai_generated, ai_provider, created_at, updated_at
              FROM traps WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
	return traps, rows.Err()
}

func (db *PostgresDB) UpdateTrap(ctx context.Context, trap *Trap) error {
	trap.UpdatedAt = time.Now()
	query := `UPDATE traps SET name = $1, trap_type = $2, difficulty = $3, description = $4, environment = $5,
              trigger = $6, effect = $7, damage = $8, detection = $9, solution_paths = $10, complications = $11,
              rewards = $12, scaling = $13, dm_notes = $14, updated_at = $15 WHERE id = $16`

	_, err := db.pool.Exec(ctx, query,
		trap.Name, trap.TrapType, trap.Difficulty, trap.Description, trap.Environment,
		trap.Trigger, trap.Effect, trap.Damage, trap.Detection, trap.SolutionPaths, trap.Complications,
		trap.Rewards, trap.Scaling, trap.DMNotes, trap.UpdatedAt, trap.ID)
	return err
}

func (db *PostgresDB) DeleteTrap(ctx context.Context, id string) error {
	query := `DELETE FROM traps WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Critter Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateCritter(ctx context.Context, critter *Critter) error {
	if critter.ID == "" {
		critter.ID = generateUUID()
	}
	critter.CreatedAt = time.Now()
	critter.UpdatedAt = time.Now()

	query := `INSERT INTO critters (id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
              description, behavior, stats, special_abilities, uses, training_difficulty, diet,
              lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`

	_, err := db.pool.Exec(ctx, query,
		critter.ID, critter.UserID, critter.CampaignID, critter.Name, critter.Species, critter.CritterType,
		critter.Size, critter.Temperament, critter.Habitat, critter.Description, critter.Behavior,
		critter.Stats, critter.SpecialAbilities, critter.Uses, critter.TrainingDifficulty, critter.Diet,
		critter.Lifespan, critter.InterestingFacts, critter.EncounterNotes, critter.AIGenerated,
		critter.AIProvider, critter.CreatedAt, critter.UpdatedAt)
	return err
}

func (db *PostgresDB) GetCritterByID(ctx context.Context, id string) (*Critter, error) {
	critter := &Critter{}
	var stats, specialAbilities, uses, interestingFacts sql.NullString
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
              description, behavior, stats, special_abilities, uses, training_difficulty, diet,
              lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
              FROM critters WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&critter.ID, &critter.UserID, &critter.CampaignID, &critter.Name, &critter.Species, &critter.CritterType,
		&critter.Size, &critter.Temperament, &critter.Habitat, &critter.Description, &critter.Behavior,
		&stats, &specialAbilities, &uses, &critter.TrainingDifficulty, &critter.Diet,
		&critter.Lifespan, &interestingFacts, &critter.EncounterNotes, &critter.AIGenerated,
		&critter.AIProvider, &critter.CreatedAt, &critter.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

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

func (db *PostgresDB) ListCrittersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Critter, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
                 description, behavior, stats, special_abilities, uses, training_difficulty, diet,
                 lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
                 FROM critters WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
                 description, behavior, stats, special_abilities, uses, training_difficulty, diet,
                 lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
                 FROM critters WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

	return critters, rows.Err()
}

func (db *PostgresDB) ListCrittersByCampaignID(ctx context.Context, campaignID string) ([]*Critter, error) {
	query := `SELECT id, user_id, campaign_id, name, species, critter_type, size, temperament, habitat,
              description, behavior, stats, special_abilities, uses, training_difficulty, diet,
              lifespan, interesting_facts, encounter_notes, ai_generated, ai_provider, created_at, updated_at
              FROM critters WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

	return critters, rows.Err()
}

func (db *PostgresDB) UpdateCritter(ctx context.Context, critter *Critter) error {
	critter.UpdatedAt = time.Now()
	query := `UPDATE critters SET name = $1, species = $2, critter_type = $3, size = $4, temperament = $5, habitat = $6,
              description = $7, behavior = $8, stats = $9, special_abilities = $10, uses = $11, training_difficulty = $12,
              diet = $13, lifespan = $14, interesting_facts = $15, encounter_notes = $16, updated_at = $17
              WHERE id = $18`

	_, err := db.pool.Exec(ctx, query,
		critter.Name, critter.Species, critter.CritterType, critter.Size, critter.Temperament, critter.Habitat,
		critter.Description, critter.Behavior, critter.Stats, critter.SpecialAbilities, critter.Uses,
		critter.TrainingDifficulty, critter.Diet, critter.Lifespan, critter.InterestingFacts,
		critter.EncounterNotes, critter.UpdatedAt, critter.ID)
	return err
}

func (db *PostgresDB) DeleteCritter(ctx context.Context, id string) error {
	query := `DELETE FROM critters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Campaign Item Linking Operations (many-to-many)
// =============================================================================

func (db *PostgresDB) LinkItemToCampaign(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error {
	id := generateUUID()
	query := `INSERT INTO campaign_items (id, campaign_id, item_id, quantity, notes, added_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT(campaign_id, item_id) DO UPDATE SET quantity = $4, notes = $5`
	_, err := db.pool.Exec(ctx, query, id, campaignID, itemID, quantity, notes)
	return err
}

func (db *PostgresDB) UnlinkItemFromCampaign(ctx context.Context, campaignID, itemID string) error {
	query := `DELETE FROM campaign_items WHERE campaign_id = $1 AND item_id = $2`
	_, err := db.pool.Exec(ctx, query, campaignID, itemID)
	return err
}

func (db *PostgresDB) UpdateCampaignItemLink(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error {
	query := `UPDATE campaign_items SET quantity = $1, notes = $2 WHERE campaign_id = $3 AND item_id = $4`
	_, err := db.pool.Exec(ctx, query, quantity, notes, campaignID, itemID)
	return err
}

func (db *PostgresDB) ListCampaignItems(ctx context.Context, campaignID string) ([]*ItemWithCampaignLink, error) {
	query := `SELECT
		i.id, i.user_id, i.campaign_id, i.name, i.type, i.rarity, i.description, i.properties,
		i.origin, i.previous_owner, i.complication, i.value, i.weight, i.attunement,
		i.location_found, i.ai_generated, i.ai_provider, i.created_at, i.updated_at,
		ci.id as link_id, ci.quantity, ci.notes, ci.added_at
	FROM items i
	INNER JOIN campaign_items ci ON i.id = ci.item_id
	WHERE ci.campaign_id = $1
	ORDER BY ci.added_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*ItemWithCampaignLink
	for rows.Next() {
		item := &ItemWithCampaignLink{}
		var campaignIDNull, rarity, description, origin, previousOwner, complication, locationFound, aiProvider sql.NullString
		var value sql.NullInt64
		var weight sql.NullFloat64
		var attunement sql.NullBool
		var linkNotes sql.NullString
		var addedAt time.Time

		err := rows.Scan(
			&item.ID, &item.UserID, &campaignIDNull, &item.Name, &item.Type, &rarity, &description, &item.Properties,
			&origin, &previousOwner, &complication, &value, &weight, &attunement,
			&locationFound, &item.AIGenerated, &aiProvider, &item.CreatedAt, &item.UpdatedAt,
			&item.LinkID, &item.Quantity, &linkNotes, &addedAt,
		)
		if err != nil {
			return nil, err
		}

		// Assign nullable fields
		if campaignIDNull.Valid {
			item.CampaignID = &campaignIDNull.String
		}
		if rarity.Valid {
			item.Rarity = &rarity.String
		}
		if description.Valid {
			item.Description = &description.String
		}
		if origin.Valid {
			item.Origin = &origin.String
		}
		if previousOwner.Valid {
			item.PreviousOwner = &previousOwner.String
		}
		if complication.Valid {
			item.Complication = &complication.String
		}
		if value.Valid {
			v := int(value.Int64)
			item.Value = &v
		}
		if weight.Valid {
			item.Weight = &weight.Float64
		}
		if attunement.Valid {
			item.Attunement = &attunement.Bool
		}
		if locationFound.Valid {
			item.LocationFound = &locationFound.String
		}
		if aiProvider.Valid {
			item.AIProvider = &aiProvider.String
		}
		if linkNotes.Valid {
			item.Notes = &linkNotes.String
		}
		item.AddedAt = addedAt.Format(time.RFC3339)

		items = append(items, item)
	}

	return items, rows.Err()
}

func (db *PostgresDB) ListItemCampaigns(ctx context.Context, itemID string) ([]*Campaign, error) {
	query := `SELECT
		c.id, c.user_id, c.name, c.description, c.game_system, c.theme, c.tone, c.setting, c.factions,
		c.history, c.magic_level, c.tech_level, c.notes, c.is_active, c.created_at, c.updated_at
	FROM campaigns c
	INNER JOIN campaign_items ci ON c.id = ci.campaign_id
	WHERE ci.item_id = $1
	ORDER BY c.name`

	rows, err := db.pool.Query(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []*Campaign
	for rows.Next() {
		campaign := &Campaign{}
		var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString

		err := rows.Scan(
			&campaign.ID, &campaign.UserID, &campaign.Name, &description, &campaign.GameSystem,
			&theme, &tone, &campaign.Setting, &campaign.Factions, &history, &magicLevel, &techLevel,
			&notes, &campaign.IsActive, &campaign.CreatedAt, &campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

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

		campaigns = append(campaigns, campaign)
	}

	return campaigns, rows.Err()
}
