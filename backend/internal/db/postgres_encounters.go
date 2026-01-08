package db

import (
	"context"
	"database/sql"

	"github.com/jackc/pgx/v5"
)

// ============================================================================
// SOCIAL ENCOUNTER OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO social_encounters
              (id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
               current_mood, starting_mood, success_threshold, success_count,
               failure_count, status, outcome, notes, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := db.pool.Exec(ctx, query,
		encounter.ID, encounter.SessionID, encounter.DialogueID, encounter.NPCID,
		encounter.Name, encounter.EncounterType, encounter.Goal,
		encounter.CurrentMood, encounter.StartingMood, encounter.SuccessThreshold,
		encounter.SuccessCount, encounter.FailureCount, encounter.Status,
		encounter.Outcome, encounter.Notes, encounter.CreatedAt)
	return err
}

func (db *PostgresDB) GetSocialEncounterByID(ctx context.Context, id string) (*SocialEncounter, error) {
	query := `SELECT id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
              current_mood, starting_mood, success_threshold, success_count,
              failure_count, status, outcome, notes, created_at
              FROM social_encounters WHERE id = $1`

	encounter := &SocialEncounter{}
	var dialogueID, npcID, outcome, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &dialogueID, &npcID,
		&encounter.Name, &encounter.EncounterType, &encounter.Goal,
		&encounter.CurrentMood, &encounter.StartingMood, &encounter.SuccessThreshold,
		&encounter.SuccessCount, &encounter.FailureCount, &encounter.Status,
		&outcome, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if dialogueID.Valid {
		encounter.DialogueID = &dialogueID.String
	}
	if npcID.Valid {
		encounter.NPCID = &npcID.String
	}
	if outcome.Valid {
		encounter.Outcome = &outcome.String
	}
	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) GetSocialEncounterBySessionID(ctx context.Context, sessionID string) (*SocialEncounter, error) {
	query := `SELECT id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
              current_mood, starting_mood, success_threshold, success_count,
              failure_count, status, outcome, notes, created_at
              FROM social_encounters WHERE session_id = $1
              ORDER BY created_at DESC LIMIT 1`

	encounter := &SocialEncounter{}
	var dialogueID, npcID, outcome, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &dialogueID, &npcID,
		&encounter.Name, &encounter.EncounterType, &encounter.Goal,
		&encounter.CurrentMood, &encounter.StartingMood, &encounter.SuccessThreshold,
		&encounter.SuccessCount, &encounter.FailureCount, &encounter.Status,
		&outcome, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if dialogueID.Valid {
		encounter.DialogueID = &dialogueID.String
	}
	if npcID.Valid {
		encounter.NPCID = &npcID.String
	}
	if outcome.Valid {
		encounter.Outcome = &outcome.String
	}
	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) UpdateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	query := `UPDATE social_encounters
              SET current_mood = $1, success_count = $2, failure_count = $3,
                  status = $4, outcome = $5, notes = $6
              WHERE id = $7`

	_, err := db.pool.Exec(ctx, query,
		encounter.CurrentMood, encounter.SuccessCount, encounter.FailureCount,
		encounter.Status, encounter.Outcome, encounter.Notes, encounter.ID)
	return err
}

func (db *PostgresDB) DeleteSocialEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM social_encounters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) CreateSocialCheck(ctx context.Context, check *SocialCheck) error {
	if check.ID == "" {
		check.ID = generateUUID()
	}
	query := `INSERT INTO social_checks
              (id, encounter_id, character_name, skill, dc, roll, modifier, total,
               success, approach, npc_response, mood_change, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	_, err := db.pool.Exec(ctx, query,
		check.ID, check.EncounterID, check.CharacterName, check.Skill,
		check.DC, check.Roll, check.Modifier, check.Total, check.Success,
		check.Approach, check.NPCResponse, check.MoodChange, check.CreatedAt)
	return err
}

func (db *PostgresDB) ListSocialChecks(ctx context.Context, encounterID string) ([]*SocialCheck, error) {
	query := `SELECT id, encounter_id, character_name, skill, dc, roll, modifier, total,
              success, approach, npc_response, mood_change, created_at
              FROM social_checks WHERE encounter_id = $1 ORDER BY created_at ASC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var checks []*SocialCheck
	for rows.Next() {
		check := &SocialCheck{}
		var approach, npcResponse sql.NullString

		err := rows.Scan(
			&check.ID, &check.EncounterID, &check.CharacterName, &check.Skill,
			&check.DC, &check.Roll, &check.Modifier, &check.Total, &check.Success,
			&approach, &npcResponse, &check.MoodChange, &check.CreatedAt)
		if err != nil {
			return nil, err
		}

		if approach.Valid {
			check.Approach = &approach.String
		}
		if npcResponse.Valid {
			check.NPCResponse = &npcResponse.String
		}

		checks = append(checks, check)
	}

	return checks, rows.Err()
}

// ============================================================================
// TAVERN ENCOUNTER OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO tavern_encounters
              (id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
               status, notes, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := db.pool.Exec(ctx, query,
		encounter.ID, encounter.SessionID, encounter.TavernID,
		encounter.TimeOfDay, encounter.CrowdSize, encounter.Atmosphere,
		encounter.Status, encounter.Notes, encounter.CreatedAt)
	return err
}

func (db *PostgresDB) GetTavernEncounterByID(ctx context.Context, id string) (*TavernEncounter, error) {
	query := `SELECT id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
              status, notes, created_at
              FROM tavern_encounters WHERE id = $1`

	encounter := &TavernEncounter{}
	var notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.TavernID,
		&encounter.TimeOfDay, &encounter.CrowdSize, &encounter.Atmosphere,
		&encounter.Status, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) GetTavernEncounterBySessionID(ctx context.Context, sessionID string) (*TavernEncounter, error) {
	query := `SELECT id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
              status, notes, created_at
              FROM tavern_encounters WHERE session_id = $1
              ORDER BY created_at DESC LIMIT 1`

	encounter := &TavernEncounter{}
	var notes sql.NullString

	err := db.pool.QueryRow(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.TavernID,
		&encounter.TimeOfDay, &encounter.CrowdSize, &encounter.Atmosphere,
		&encounter.Status, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) UpdateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	query := `UPDATE tavern_encounters
              SET time_of_day = $1, crowd_size = $2, atmosphere = $3,
                  status = $4, notes = $5
              WHERE id = $6`

	_, err := db.pool.Exec(ctx, query,
		encounter.TimeOfDay, encounter.CrowdSize, encounter.Atmosphere,
		encounter.Status, encounter.Notes, encounter.ID)
	return err
}

func (db *PostgresDB) DeleteTavernEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM tavern_encounters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) CreatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	if patron.ID == "" {
		patron.ID = generateUUID()
	}
	query := `INSERT INTO patron_interactions
              (id, encounter_id, patron_name, patron_data, talked_to, relationship,
               conversation_summary, rumors_shared, quest_hooks, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	var patronData, rumorsShared, questHooks interface{}
	if len(patron.PatronData) > 0 {
		patronData = string(patron.PatronData)
	}
	if len(patron.RumorsShared) > 0 {
		rumorsShared = string(patron.RumorsShared)
	}
	if len(patron.QuestHooks) > 0 {
		questHooks = string(patron.QuestHooks)
	}

	_, err := db.pool.Exec(ctx, query,
		patron.ID, patron.EncounterID, patron.PatronName, patronData,
		patron.TalkedTo, patron.Relationship, patron.ConversationSummary,
		rumorsShared, questHooks, patron.Notes)
	return err
}

func (db *PostgresDB) GetPatronInteraction(ctx context.Context, id string) (*PatronInteraction, error) {
	query := `SELECT id, encounter_id, patron_name, patron_data, talked_to, relationship,
              conversation_summary, rumors_shared, quest_hooks, notes
              FROM patron_interactions WHERE id = $1`

	patron := &PatronInteraction{}
	var patronData, conversationSummary, rumorsShared, questHooks, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&patron.ID, &patron.EncounterID, &patron.PatronName, &patronData,
		&patron.TalkedTo, &patron.Relationship, &conversationSummary,
		&rumorsShared, &questHooks, &notes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if patronData.Valid {
		patron.PatronData = []byte(patronData.String)
	}
	if conversationSummary.Valid {
		patron.ConversationSummary = &conversationSummary.String
	}
	if rumorsShared.Valid {
		patron.RumorsShared = []byte(rumorsShared.String)
	}
	if questHooks.Valid {
		patron.QuestHooks = []byte(questHooks.String)
	}
	if notes.Valid {
		patron.Notes = &notes.String
	}

	return patron, nil
}

func (db *PostgresDB) ListPatronInteractions(ctx context.Context, encounterID string) ([]*PatronInteraction, error) {
	query := `SELECT id, encounter_id, patron_name, patron_data, talked_to, relationship,
              conversation_summary, rumors_shared, quest_hooks, notes
              FROM patron_interactions WHERE encounter_id = $1 ORDER BY patron_name ASC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patrons []*PatronInteraction
	for rows.Next() {
		patron := &PatronInteraction{}
		var patronData, conversationSummary, rumorsShared, questHooks, notes sql.NullString

		err := rows.Scan(
			&patron.ID, &patron.EncounterID, &patron.PatronName, &patronData,
			&patron.TalkedTo, &patron.Relationship, &conversationSummary,
			&rumorsShared, &questHooks, &notes)
		if err != nil {
			return nil, err
		}

		if patronData.Valid {
			patron.PatronData = []byte(patronData.String)
		}
		if conversationSummary.Valid {
			patron.ConversationSummary = &conversationSummary.String
		}
		if rumorsShared.Valid {
			patron.RumorsShared = []byte(rumorsShared.String)
		}
		if questHooks.Valid {
			patron.QuestHooks = []byte(questHooks.String)
		}
		if notes.Valid {
			patron.Notes = &notes.String
		}

		patrons = append(patrons, patron)
	}

	return patrons, rows.Err()
}

func (db *PostgresDB) UpdatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	query := `UPDATE patron_interactions
              SET talked_to = $1, relationship = $2, conversation_summary = $3,
                  rumors_shared = $4, quest_hooks = $5, notes = $6
              WHERE id = $7`

	var rumorsShared, questHooks interface{}
	if len(patron.RumorsShared) > 0 {
		rumorsShared = string(patron.RumorsShared)
	}
	if len(patron.QuestHooks) > 0 {
		questHooks = string(patron.QuestHooks)
	}

	_, err := db.pool.Exec(ctx, query,
		patron.TalkedTo, patron.Relationship, patron.ConversationSummary,
		rumorsShared, questHooks, patron.Notes, patron.ID)
	return err
}

func (db *PostgresDB) CreateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	if rumor.ID == "" {
		rumor.ID = generateUUID()
	}
	query := `INSERT INTO rumor_tracking
              (id, encounter_id, rumor_text, source_patron, heard, verified, related_to, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := db.pool.Exec(ctx, query,
		rumor.ID, rumor.EncounterID, rumor.RumorText, rumor.SourcePatron,
		rumor.Heard, rumor.Verified, rumor.RelatedTo, rumor.Notes)
	return err
}

func (db *PostgresDB) ListRumorTracking(ctx context.Context, encounterID string) ([]*RumorTracking, error) {
	query := `SELECT id, encounter_id, rumor_text, source_patron, heard, verified, related_to, notes
              FROM rumor_tracking WHERE encounter_id = $1 ORDER BY heard ASC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rumors []*RumorTracking
	for rows.Next() {
		rumor := &RumorTracking{}
		var sourcePatron, relatedTo, notes sql.NullString

		err := rows.Scan(
			&rumor.ID, &rumor.EncounterID, &rumor.RumorText, &sourcePatron,
			&rumor.Heard, &rumor.Verified, &relatedTo, &notes)
		if err != nil {
			return nil, err
		}

		if sourcePatron.Valid {
			rumor.SourcePatron = &sourcePatron.String
		}
		if relatedTo.Valid {
			rumor.RelatedTo = &relatedTo.String
		}
		if notes.Valid {
			rumor.Notes = &notes.String
		}

		rumors = append(rumors, rumor)
	}

	return rumors, rows.Err()
}

func (db *PostgresDB) UpdateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	query := `UPDATE rumor_tracking
              SET heard = $1, verified = $2, related_to = $3, notes = $4
              WHERE id = $5`

	_, err := db.pool.Exec(ctx, query,
		rumor.Heard, rumor.Verified, rumor.RelatedTo, rumor.Notes, rumor.ID)
	return err
}

func (db *PostgresDB) CreateTavernTab(ctx context.Context, tab *TavernTab) error {
	if tab.ID == "" {
		tab.ID = generateUUID()
	}
	query := `INSERT INTO tavern_tabs
              (id, encounter_id, character_name, items_ordered, total_cost, paid, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7)`

	var itemsOrdered interface{}
	if len(tab.ItemsOrdered) > 0 {
		itemsOrdered = string(tab.ItemsOrdered)
	}

	_, err := db.pool.Exec(ctx, query,
		tab.ID, tab.EncounterID, tab.CharacterName, itemsOrdered,
		tab.TotalCost, tab.Paid, tab.Notes)
	return err
}

func (db *PostgresDB) ListTavernTabs(ctx context.Context, encounterID string) ([]*TavernTab, error) {
	query := `SELECT id, encounter_id, character_name, items_ordered, total_cost, paid, notes
              FROM tavern_tabs WHERE encounter_id = $1 ORDER BY character_name ASC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tabs []*TavernTab
	for rows.Next() {
		tab := &TavernTab{}
		var itemsOrdered, notes sql.NullString

		err := rows.Scan(
			&tab.ID, &tab.EncounterID, &tab.CharacterName, &itemsOrdered,
			&tab.TotalCost, &tab.Paid, &notes)
		if err != nil {
			return nil, err
		}

		if itemsOrdered.Valid {
			tab.ItemsOrdered = []byte(itemsOrdered.String)
		}
		if notes.Valid {
			tab.Notes = &notes.String
		}

		tabs = append(tabs, tab)
	}

	return tabs, rows.Err()
}

func (db *PostgresDB) UpdateTavernTab(ctx context.Context, tab *TavernTab) error {
	query := `UPDATE tavern_tabs
              SET items_ordered = $1, total_cost = $2, paid = $3, notes = $4
              WHERE id = $5`

	var itemsOrdered interface{}
	if len(tab.ItemsOrdered) > 0 {
		itemsOrdered = string(tab.ItemsOrdered)
	}

	_, err := db.pool.Exec(ctx, query,
		itemsOrdered, tab.TotalCost, tab.Paid, tab.Notes, tab.ID)
	return err
}

// ============================================================================
// SHOPPING ENCOUNTER OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO shopping_encounters
              (id, session_id, merchant_id, merchant_mood, relationship_level,
               discount_percentage, status, total_purchased, notes, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := db.pool.Exec(ctx, query,
		encounter.ID, encounter.SessionID, encounter.MerchantID,
		encounter.MerchantMood, encounter.RelationshipLevel,
		encounter.DiscountPercentage, encounter.Status,
		encounter.TotalPurchased, encounter.Notes, encounter.CreatedAt)
	return err
}

func (db *PostgresDB) GetShoppingEncounterByID(ctx context.Context, id string) (*ShoppingEncounter, error) {
	query := `SELECT id, session_id, merchant_id, merchant_mood, relationship_level,
              discount_percentage, status, total_purchased, notes, created_at
              FROM shopping_encounters WHERE id = $1`

	encounter := &ShoppingEncounter{}
	var totalPurchased, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.MerchantID,
		&encounter.MerchantMood, &encounter.RelationshipLevel,
		&encounter.DiscountPercentage, &encounter.Status,
		&totalPurchased, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if totalPurchased.Valid {
		encounter.TotalPurchased = &totalPurchased.String
	}
	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) GetShoppingEncounterBySessionID(ctx context.Context, sessionID string) (*ShoppingEncounter, error) {
	query := `SELECT id, session_id, merchant_id, merchant_mood, relationship_level,
              discount_percentage, status, total_purchased, notes, created_at
              FROM shopping_encounters WHERE session_id = $1
              ORDER BY created_at DESC LIMIT 1`

	encounter := &ShoppingEncounter{}
	var totalPurchased, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.MerchantID,
		&encounter.MerchantMood, &encounter.RelationshipLevel,
		&encounter.DiscountPercentage, &encounter.Status,
		&totalPurchased, &notes, &encounter.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if totalPurchased.Valid {
		encounter.TotalPurchased = &totalPurchased.String
	}
	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (db *PostgresDB) UpdateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	query := `UPDATE shopping_encounters
              SET merchant_mood = $1, relationship_level = $2, discount_percentage = $3,
                  status = $4, total_purchased = $5, notes = $6
              WHERE id = $7`

	_, err := db.pool.Exec(ctx, query,
		encounter.MerchantMood, encounter.RelationshipLevel, encounter.DiscountPercentage,
		encounter.Status, encounter.TotalPurchased, encounter.Notes, encounter.ID)
	return err
}

func (db *PostgresDB) DeleteShoppingEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM shopping_encounters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) CreateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	if item.ID == "" {
		item.ID = generateUUID()
	}
	query := `INSERT INTO shopping_cart
              (id, encounter_id, character_name, item_name, item_data, quantity,
               base_price, negotiated_price, purchased)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	var itemData interface{}
	if len(item.ItemData) > 0 {
		itemData = string(item.ItemData)
	}

	_, err := db.pool.Exec(ctx, query,
		item.ID, item.EncounterID, item.CharacterName, item.ItemName,
		itemData, item.Quantity, item.BasePrice, item.NegotiatedPrice, item.Purchased)
	return err
}

func (db *PostgresDB) ListShoppingCartItems(ctx context.Context, encounterID string) ([]*ShoppingCart, error) {
	query := `SELECT id, encounter_id, character_name, item_name, item_data, quantity,
              base_price, negotiated_price, purchased
              FROM shopping_cart WHERE encounter_id = $1 ORDER BY purchased ASC, item_name ASC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*ShoppingCart
	for rows.Next() {
		item := &ShoppingCart{}
		var itemData, negotiatedPrice sql.NullString

		err := rows.Scan(
			&item.ID, &item.EncounterID, &item.CharacterName, &item.ItemName,
			&itemData, &item.Quantity, &item.BasePrice, &negotiatedPrice, &item.Purchased)
		if err != nil {
			return nil, err
		}

		if itemData.Valid {
			item.ItemData = []byte(itemData.String)
		}
		if negotiatedPrice.Valid {
			item.NegotiatedPrice = &negotiatedPrice.String
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

func (db *PostgresDB) UpdateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	query := `UPDATE shopping_cart
              SET quantity = $1, negotiated_price = $2, purchased = $3
              WHERE id = $4`

	_, err := db.pool.Exec(ctx, query,
		item.Quantity, item.NegotiatedPrice, item.Purchased, item.ID)
	return err
}

func (db *PostgresDB) DeleteShoppingCartItem(ctx context.Context, id string) error {
	query := `DELETE FROM shopping_cart WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) CreateHagglingSession(ctx context.Context, session *HagglingSession) error {
	if session.ID == "" {
		session.ID = generateUUID()
	}
	query := `INSERT INTO haggling_sessions
              (id, encounter_id, item_name, character_name, starting_price, party_offer,
               merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
               success, final_price, mood_change, notes, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := db.pool.Exec(ctx, query,
		session.ID, session.EncounterID, session.ItemName, session.CharacterName,
		session.StartingPrice, session.PartyOffer, session.MerchantCounter,
		session.Rounds, session.MaxRounds, session.SkillCheckType, session.RollTotal,
		session.Success, session.FinalPrice, session.MoodChange, session.Notes, session.CreatedAt)
	return err
}

func (db *PostgresDB) GetHagglingSession(ctx context.Context, id string) (*HagglingSession, error) {
	query := `SELECT id, encounter_id, item_name, character_name, starting_price, party_offer,
              merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
              success, final_price, mood_change, notes, created_at
              FROM haggling_sessions WHERE id = $1`

	session := &HagglingSession{}
	var merchantCounter, finalPrice, notes sql.NullString
	var rollTotal sql.NullInt64
	var success sql.NullBool

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&session.ID, &session.EncounterID, &session.ItemName, &session.CharacterName,
		&session.StartingPrice, &session.PartyOffer, &merchantCounter,
		&session.Rounds, &session.MaxRounds, &session.SkillCheckType, &rollTotal,
		&success, &finalPrice, &session.MoodChange, &notes, &session.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if merchantCounter.Valid {
		session.MerchantCounter = &merchantCounter.String
	}
	if rollTotal.Valid {
		rt := int(rollTotal.Int64)
		session.RollTotal = &rt
	}
	if success.Valid {
		session.Success = &success.Bool
	}
	if finalPrice.Valid {
		session.FinalPrice = &finalPrice.String
	}
	if notes.Valid {
		session.Notes = &notes.String
	}

	return session, nil
}

func (db *PostgresDB) ListHagglingSessions(ctx context.Context, encounterID string) ([]*HagglingSession, error) {
	query := `SELECT id, encounter_id, item_name, character_name, starting_price, party_offer,
              merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
              success, final_price, mood_change, notes, created_at
              FROM haggling_sessions WHERE encounter_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*HagglingSession
	for rows.Next() {
		session := &HagglingSession{}
		var merchantCounter, finalPrice, notes sql.NullString
		var rollTotal sql.NullInt64
		var success sql.NullBool

		err := rows.Scan(
			&session.ID, &session.EncounterID, &session.ItemName, &session.CharacterName,
			&session.StartingPrice, &session.PartyOffer, &merchantCounter,
			&session.Rounds, &session.MaxRounds, &session.SkillCheckType, &rollTotal,
			&success, &finalPrice, &session.MoodChange, &notes, &session.CreatedAt)
		if err != nil {
			return nil, err
		}

		if merchantCounter.Valid {
			session.MerchantCounter = &merchantCounter.String
		}
		if rollTotal.Valid {
			rt := int(rollTotal.Int64)
			session.RollTotal = &rt
		}
		if success.Valid {
			session.Success = &success.Bool
		}
		if finalPrice.Valid {
			session.FinalPrice = &finalPrice.String
		}
		if notes.Valid {
			session.Notes = &notes.String
		}

		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

func (db *PostgresDB) UpdateHagglingSession(ctx context.Context, session *HagglingSession) error {
	query := `UPDATE haggling_sessions
              SET merchant_counter = $1, rounds = $2, roll_total = $3, success = $4,
                  final_price = $5, mood_change = $6, notes = $7
              WHERE id = $8`

	_, err := db.pool.Exec(ctx, query,
		session.MerchantCounter, session.Rounds, session.RollTotal, session.Success,
		session.FinalPrice, session.MoodChange, session.Notes, session.ID)
	return err
}
