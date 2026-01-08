package db

import (
	"context"
	"database/sql"
)

// ============================================================================
// SOCIAL ENCOUNTER OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO social_encounters
              (id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
               current_mood, starting_mood, success_threshold, success_count,
               failure_count, status, outcome, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		encounter.ID, encounter.SessionID, encounter.DialogueID, encounter.NPCID,
		encounter.Name, encounter.EncounterType, encounter.Goal,
		encounter.CurrentMood, encounter.StartingMood, encounter.SuccessThreshold,
		encounter.SuccessCount, encounter.FailureCount, encounter.Status,
		encounter.Outcome, encounter.Notes, encounter.CreatedAt)
	return err
}

func (s *SQLiteDB) GetSocialEncounterByID(ctx context.Context, id string) (*SocialEncounter, error) {
	query := `SELECT id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
              current_mood, starting_mood, success_threshold, success_count,
              failure_count, status, outcome, notes, created_at
              FROM social_encounters WHERE id = ?`

	encounter := &SocialEncounter{}
	var dialogueID, npcID, outcome, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &dialogueID, &npcID,
		&encounter.Name, &encounter.EncounterType, &encounter.Goal,
		&encounter.CurrentMood, &encounter.StartingMood, &encounter.SuccessThreshold,
		&encounter.SuccessCount, &encounter.FailureCount, &encounter.Status,
		&outcome, &notes, &encounter.CreatedAt)
	if err != nil {
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

func (s *SQLiteDB) GetSocialEncounterBySessionID(ctx context.Context, sessionID string) (*SocialEncounter, error) {
	query := `SELECT id, session_id, dialogue_id, npc_id, name, encounter_type, goal,
              current_mood, starting_mood, success_threshold, success_count,
              failure_count, status, outcome, notes, created_at
              FROM social_encounters WHERE session_id = ?
              ORDER BY created_at DESC LIMIT 1`

	encounter := &SocialEncounter{}
	var dialogueID, npcID, outcome, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &dialogueID, &npcID,
		&encounter.Name, &encounter.EncounterType, &encounter.Goal,
		&encounter.CurrentMood, &encounter.StartingMood, &encounter.SuccessThreshold,
		&encounter.SuccessCount, &encounter.FailureCount, &encounter.Status,
		&outcome, &notes, &encounter.CreatedAt)
	if err != nil {
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

func (s *SQLiteDB) UpdateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	query := `UPDATE social_encounters
              SET current_mood = ?, success_count = ?, failure_count = ?,
                  status = ?, outcome = ?, notes = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		encounter.CurrentMood, encounter.SuccessCount, encounter.FailureCount,
		encounter.Status, encounter.Outcome, encounter.Notes, encounter.ID)
	return err
}

func (s *SQLiteDB) DeleteSocialEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM social_encounters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) CreateSocialCheck(ctx context.Context, check *SocialCheck) error {
	if check.ID == "" {
		check.ID = generateUUID()
	}
	query := `INSERT INTO social_checks
              (id, encounter_id, character_name, skill, dc, roll, modifier, total,
               success, approach, npc_response, mood_change, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		check.ID, check.EncounterID, check.CharacterName, check.Skill,
		check.DC, check.Roll, check.Modifier, check.Total, check.Success,
		check.Approach, check.NPCResponse, check.MoodChange, check.CreatedAt)
	return err
}

func (s *SQLiteDB) ListSocialChecks(ctx context.Context, encounterID string) ([]*SocialCheck, error) {
	query := `SELECT id, encounter_id, character_name, skill, dc, roll, modifier, total,
              success, approach, npc_response, mood_change, created_at
              FROM social_checks WHERE encounter_id = ? ORDER BY created_at ASC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) CreateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO tavern_encounters
              (id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
               status, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		encounter.ID, encounter.SessionID, encounter.TavernID,
		encounter.TimeOfDay, encounter.CrowdSize, encounter.Atmosphere,
		encounter.Status, encounter.Notes, encounter.CreatedAt)
	return err
}

func (s *SQLiteDB) GetTavernEncounterByID(ctx context.Context, id string) (*TavernEncounter, error) {
	query := `SELECT id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
              status, notes, created_at
              FROM tavern_encounters WHERE id = ?`

	encounter := &TavernEncounter{}
	var notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.TavernID,
		&encounter.TimeOfDay, &encounter.CrowdSize, &encounter.Atmosphere,
		&encounter.Status, &notes, &encounter.CreatedAt)
	if err != nil {
		return nil, err
	}

	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (s *SQLiteDB) GetTavernEncounterBySessionID(ctx context.Context, sessionID string) (*TavernEncounter, error) {
	query := `SELECT id, session_id, tavern_id, time_of_day, crowd_size, atmosphere,
              status, notes, created_at
              FROM tavern_encounters WHERE session_id = ?
              ORDER BY created_at DESC LIMIT 1`

	encounter := &TavernEncounter{}
	var notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.TavernID,
		&encounter.TimeOfDay, &encounter.CrowdSize, &encounter.Atmosphere,
		&encounter.Status, &notes, &encounter.CreatedAt)
	if err != nil {
		return nil, err
	}

	if notes.Valid {
		encounter.Notes = &notes.String
	}

	return encounter, nil
}

func (s *SQLiteDB) UpdateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	query := `UPDATE tavern_encounters
              SET time_of_day = ?, crowd_size = ?, atmosphere = ?,
                  status = ?, notes = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		encounter.TimeOfDay, encounter.CrowdSize, encounter.Atmosphere,
		encounter.Status, encounter.Notes, encounter.ID)
	return err
}

func (s *SQLiteDB) DeleteTavernEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM tavern_encounters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) CreatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	if patron.ID == "" {
		patron.ID = generateUUID()
	}
	query := `INSERT INTO patron_interactions
              (id, encounter_id, patron_name, patron_data, talked_to, relationship,
               conversation_summary, rumors_shared, quest_hooks, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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

	_, err := s.db.ExecContext(ctx, query,
		patron.ID, patron.EncounterID, patron.PatronName, patronData,
		patron.TalkedTo, patron.Relationship, patron.ConversationSummary,
		rumorsShared, questHooks, patron.Notes)
	return err
}

func (s *SQLiteDB) GetPatronInteraction(ctx context.Context, id string) (*PatronInteraction, error) {
	query := `SELECT id, encounter_id, patron_name, patron_data, talked_to, relationship,
              conversation_summary, rumors_shared, quest_hooks, notes
              FROM patron_interactions WHERE id = ?`

	patron := &PatronInteraction{}
	var patronData, conversationSummary, rumorsShared, questHooks, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

	return patron, nil
}

func (s *SQLiteDB) ListPatronInteractions(ctx context.Context, encounterID string) ([]*PatronInteraction, error) {
	query := `SELECT id, encounter_id, patron_name, patron_data, talked_to, relationship,
              conversation_summary, rumors_shared, quest_hooks, notes
              FROM patron_interactions WHERE encounter_id = ? ORDER BY patron_name ASC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	query := `UPDATE patron_interactions
              SET talked_to = ?, relationship = ?, conversation_summary = ?,
                  rumors_shared = ?, quest_hooks = ?, notes = ?
              WHERE id = ?`

	var rumorsShared, questHooks interface{}
	if len(patron.RumorsShared) > 0 {
		rumorsShared = string(patron.RumorsShared)
	}
	if len(patron.QuestHooks) > 0 {
		questHooks = string(patron.QuestHooks)
	}

	_, err := s.db.ExecContext(ctx, query,
		patron.TalkedTo, patron.Relationship, patron.ConversationSummary,
		rumorsShared, questHooks, patron.Notes, patron.ID)
	return err
}

func (s *SQLiteDB) CreateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	if rumor.ID == "" {
		rumor.ID = generateUUID()
	}
	query := `INSERT INTO rumor_tracking
              (id, encounter_id, rumor_text, source_patron, heard, verified, related_to, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		rumor.ID, rumor.EncounterID, rumor.RumorText, rumor.SourcePatron,
		rumor.Heard, rumor.Verified, rumor.RelatedTo, rumor.Notes)
	return err
}

func (s *SQLiteDB) ListRumorTracking(ctx context.Context, encounterID string) ([]*RumorTracking, error) {
	query := `SELECT id, encounter_id, rumor_text, source_patron, heard, verified, related_to, notes
              FROM rumor_tracking WHERE encounter_id = ? ORDER BY heard ASC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	query := `UPDATE rumor_tracking
              SET heard = ?, verified = ?, related_to = ?, notes = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		rumor.Heard, rumor.Verified, rumor.RelatedTo, rumor.Notes, rumor.ID)
	return err
}

func (s *SQLiteDB) CreateTavernTab(ctx context.Context, tab *TavernTab) error {
	if tab.ID == "" {
		tab.ID = generateUUID()
	}
	query := `INSERT INTO tavern_tabs
              (id, encounter_id, character_name, items_ordered, total_cost, paid, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?)`

	var itemsOrdered interface{}
	if len(tab.ItemsOrdered) > 0 {
		itemsOrdered = string(tab.ItemsOrdered)
	}

	_, err := s.db.ExecContext(ctx, query,
		tab.ID, tab.EncounterID, tab.CharacterName, itemsOrdered,
		tab.TotalCost, tab.Paid, tab.Notes)
	return err
}

func (s *SQLiteDB) ListTavernTabs(ctx context.Context, encounterID string) ([]*TavernTab, error) {
	query := `SELECT id, encounter_id, character_name, items_ordered, total_cost, paid, notes
              FROM tavern_tabs WHERE encounter_id = ? ORDER BY character_name ASC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdateTavernTab(ctx context.Context, tab *TavernTab) error {
	query := `UPDATE tavern_tabs
              SET items_ordered = ?, total_cost = ?, paid = ?, notes = ?
              WHERE id = ?`

	var itemsOrdered interface{}
	if len(tab.ItemsOrdered) > 0 {
		itemsOrdered = string(tab.ItemsOrdered)
	}

	_, err := s.db.ExecContext(ctx, query,
		itemsOrdered, tab.TotalCost, tab.Paid, tab.Notes, tab.ID)
	return err
}

// ============================================================================
// SHOPPING ENCOUNTER OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	if encounter.ID == "" {
		encounter.ID = generateUUID()
	}
	query := `INSERT INTO shopping_encounters
              (id, session_id, merchant_id, merchant_mood, relationship_level,
               discount_percentage, status, total_purchased, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		encounter.ID, encounter.SessionID, encounter.MerchantID,
		encounter.MerchantMood, encounter.RelationshipLevel,
		encounter.DiscountPercentage, encounter.Status,
		encounter.TotalPurchased, encounter.Notes, encounter.CreatedAt)
	return err
}

func (s *SQLiteDB) GetShoppingEncounterByID(ctx context.Context, id string) (*ShoppingEncounter, error) {
	query := `SELECT id, session_id, merchant_id, merchant_mood, relationship_level,
              discount_percentage, status, total_purchased, notes, created_at
              FROM shopping_encounters WHERE id = ?`

	encounter := &ShoppingEncounter{}
	var totalPurchased, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.MerchantID,
		&encounter.MerchantMood, &encounter.RelationshipLevel,
		&encounter.DiscountPercentage, &encounter.Status,
		&totalPurchased, &notes, &encounter.CreatedAt)
	if err != nil {
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

func (s *SQLiteDB) GetShoppingEncounterBySessionID(ctx context.Context, sessionID string) (*ShoppingEncounter, error) {
	query := `SELECT id, session_id, merchant_id, merchant_mood, relationship_level,
              discount_percentage, status, total_purchased, notes, created_at
              FROM shopping_encounters WHERE session_id = ?
              ORDER BY created_at DESC LIMIT 1`

	encounter := &ShoppingEncounter{}
	var totalPurchased, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, sessionID).Scan(
		&encounter.ID, &encounter.SessionID, &encounter.MerchantID,
		&encounter.MerchantMood, &encounter.RelationshipLevel,
		&encounter.DiscountPercentage, encounter.Status,
		&totalPurchased, &notes, &encounter.CreatedAt)
	if err != nil {
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

func (s *SQLiteDB) UpdateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	query := `UPDATE shopping_encounters
              SET merchant_mood = ?, relationship_level = ?, discount_percentage = ?,
                  status = ?, total_purchased = ?, notes = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		encounter.MerchantMood, encounter.RelationshipLevel, encounter.DiscountPercentage,
		encounter.Status, encounter.TotalPurchased, encounter.Notes, encounter.ID)
	return err
}

func (s *SQLiteDB) DeleteShoppingEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM shopping_encounters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) CreateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	if item.ID == "" {
		item.ID = generateUUID()
	}
	query := `INSERT INTO shopping_cart
              (id, encounter_id, character_name, item_name, item_data, quantity,
               base_price, negotiated_price, purchased)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	var itemData interface{}
	if len(item.ItemData) > 0 {
		itemData = string(item.ItemData)
	}

	_, err := s.db.ExecContext(ctx, query,
		item.ID, item.EncounterID, item.CharacterName, item.ItemName,
		itemData, item.Quantity, item.BasePrice, item.NegotiatedPrice, item.Purchased)
	return err
}

func (s *SQLiteDB) ListShoppingCartItems(ctx context.Context, encounterID string) ([]*ShoppingCart, error) {
	query := `SELECT id, encounter_id, character_name, item_name, item_data, quantity,
              base_price, negotiated_price, purchased
              FROM shopping_cart WHERE encounter_id = ? ORDER BY purchased ASC, item_name ASC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	query := `UPDATE shopping_cart
              SET quantity = ?, negotiated_price = ?, purchased = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		item.Quantity, item.NegotiatedPrice, item.Purchased, item.ID)
	return err
}

func (s *SQLiteDB) DeleteShoppingCartItem(ctx context.Context, id string) error {
	query := `DELETE FROM shopping_cart WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) CreateHagglingSession(ctx context.Context, session *HagglingSession) error {
	if session.ID == "" {
		session.ID = generateUUID()
	}
	query := `INSERT INTO haggling_sessions
              (id, encounter_id, item_name, character_name, starting_price, party_offer,
               merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
               success, final_price, mood_change, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		session.ID, session.EncounterID, session.ItemName, session.CharacterName,
		session.StartingPrice, session.PartyOffer, session.MerchantCounter,
		session.Rounds, session.MaxRounds, session.SkillCheckType, session.RollTotal,
		session.Success, session.FinalPrice, session.MoodChange, session.Notes, session.CreatedAt)
	return err
}

func (s *SQLiteDB) GetHagglingSession(ctx context.Context, id string) (*HagglingSession, error) {
	query := `SELECT id, encounter_id, item_name, character_name, starting_price, party_offer,
              merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
              success, final_price, mood_change, notes, created_at
              FROM haggling_sessions WHERE id = ?`

	session := &HagglingSession{}
	var merchantCounter, finalPrice, notes sql.NullString
	var rollTotal sql.NullInt64
	var success sql.NullBool

	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

	return session, nil
}

func (s *SQLiteDB) ListHagglingSessions(ctx context.Context, encounterID string) ([]*HagglingSession, error) {
	query := `SELECT id, encounter_id, item_name, character_name, starting_price, party_offer,
              merchant_counter, rounds, max_rounds, skill_check_type, roll_total,
              success, final_price, mood_change, notes, created_at
              FROM haggling_sessions WHERE encounter_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdateHagglingSession(ctx context.Context, session *HagglingSession) error {
	query := `UPDATE haggling_sessions
              SET merchant_counter = ?, rounds = ?, roll_total = ?, success = ?,
                  final_price = ?, mood_change = ?, notes = ?
              WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		session.MerchantCounter, session.Rounds, session.RollTotal, session.Success,
		session.FinalPrice, session.MoodChange, session.Notes, session.ID)
	return err
}
