package db

import (
	"context"
	"database/sql"
)

// CombatOperations provides unified combat database operations
// that work with both SQLite and PostgreSQL through the Executor interface.
type CombatOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewCombatOperations creates a new CombatOperations with the given executor and query builder.
func NewCombatOperations(exec Executor, qb *QueryBuilder) *CombatOperations {
	return &CombatOperations{exec: exec, qb: qb}
}

// Column definitions for combat tables
var combatEncounterColumns = []string{
	"id", "session_id", "campaign_id", "encounter_id", "name", "current_round", "current_turn",
	"status", "difficulty", "environment", "notes", "visibility_mode", "is_active", "created_at",
}

var combatParticipantColumns = []string{
	"id", "combat_id", "participant_type", "character_id", "npc_id", "monster_id",
	"owner_user_id", "name", "max_hp", "ac", "stats_snapshot", "abilities_snapshot",
	"initiative", "initiative_bonus", "initiative_roll", "current_hp", "temp_hp", "passive_perception",
	"conditions", "concentration_spell", "death_saves", "is_surprised", "has_reaction",
	"legendary_actions_used", "legendary_actions_max", "position", "notes",
	"is_visible_to_players", "show_hp_to_players", "show_conditions_to_players",
}

var combatConditionColumns = []string{
	"id", "participant_id", "condition_name", "duration_rounds", "save_dc",
	"save_ability", "source", "applied_round", "notes",
}

var combatSettingsColumns = []string{
	"id", "campaign_id", "default_visibility", "allow_player_self_join",
	"auto_roll_initiative", "show_monster_names", "show_monster_hp",
	"created_at", "updated_at",
}

// scanCombatEncounter scans a row into a CombatEncounter struct.
func scanCombatEncounter(row Row) (*CombatEncounter, error) {
	combat := &CombatEncounter{}
	var campaignID, encounterID, difficulty, environment, notes, visibilityMode sql.NullString

	err := row.Scan(
		&combat.ID, &combat.SessionID, &campaignID, &encounterID, &combat.Name,
		&combat.CurrentRound, &combat.CurrentTurn, &combat.Status,
		&difficulty, &environment, &notes, &visibilityMode, &combat.IsActive, &combat.CreatedAt)
	if err != nil {
		return nil, err
	}

	if campaignID.Valid {
		combat.CampaignID = &campaignID.String
	}
	if encounterID.Valid {
		combat.EncounterID = &encounterID.String
	}
	if difficulty.Valid {
		combat.Difficulty = &difficulty.String
	}
	if environment.Valid {
		combat.Environment = &environment.String
	}
	if notes.Valid {
		combat.Notes = &notes.String
	}
	if visibilityMode.Valid {
		combat.VisibilityMode = visibilityMode.String
	} else {
		combat.VisibilityMode = "full" // default
	}

	return combat, nil
}

// scanCombatParticipant scans a row into a CombatParticipant struct.
func scanCombatParticipantFromRows(rows Rows) (*CombatParticipant, error) {
	participant := &CombatParticipant{}
	var characterID, npcID, monsterID, ownerUserID, statsSnapshot, abilitiesSnapshot sql.NullString
	var passivePerception, initiativeRoll sql.NullInt64
	var conditions, concentrationSpell, deathSaves, notes sql.NullString

	err := rows.Scan(
		&participant.ID, &participant.CombatID, &participant.ParticipantType,
		&characterID, &npcID, &monsterID, &ownerUserID,
		&participant.Name, &participant.MaxHP, &participant.AC,
		&statsSnapshot, &abilitiesSnapshot,
		&participant.Initiative, &participant.InitiativeBonus, &initiativeRoll,
		&participant.CurrentHP, &participant.TempHP, &passivePerception,
		&conditions, &concentrationSpell, &deathSaves,
		&participant.IsSurprised, &participant.HasReaction,
		&participant.LegendaryActionsUsed, &participant.LegendaryActionsMax,
		&participant.Position, &notes,
		&participant.IsVisibleToPlayers, &participant.ShowHPToPlayers, &participant.ShowConditionsToPlayers)
	if err != nil {
		return nil, err
	}

	if characterID.Valid {
		participant.CharacterID = &characterID.String
	}
	if npcID.Valid {
		participant.NPCID = &npcID.String
	}
	if monsterID.Valid {
		participant.MonsterID = &monsterID.String
	}
	if ownerUserID.Valid {
		participant.OwnerUserID = &ownerUserID.String
	}
	if statsSnapshot.Valid {
		participant.StatsSnapshot = []byte(statsSnapshot.String)
	}
	if abilitiesSnapshot.Valid {
		participant.AbilitiesSnapshot = []byte(abilitiesSnapshot.String)
	}
	if initiativeRoll.Valid {
		ir := int(initiativeRoll.Int64)
		participant.InitiativeRoll = &ir
	}
	if passivePerception.Valid {
		pp := int(passivePerception.Int64)
		participant.PassivePerception = &pp
	}
	if conditions.Valid {
		participant.Conditions = []byte(conditions.String)
	}
	if concentrationSpell.Valid {
		participant.ConcentrationSpell = &concentrationSpell.String
	}
	if deathSaves.Valid {
		participant.DeathSaves = []byte(deathSaves.String)
	}
	if notes.Valid {
		participant.Notes = &notes.String
	}

	return participant, nil
}

// scanCombatParticipantFromRow scans a single row into a CombatParticipant struct.
func scanCombatParticipantFromRow(row Row) (*CombatParticipant, error) {
	participant := &CombatParticipant{}
	var characterID, npcID, monsterID, ownerUserID, statsSnapshot, abilitiesSnapshot sql.NullString
	var passivePerception, initiativeRoll sql.NullInt64
	var conditions, concentrationSpell, deathSaves, notes sql.NullString

	err := row.Scan(
		&participant.ID, &participant.CombatID, &participant.ParticipantType,
		&characterID, &npcID, &monsterID, &ownerUserID,
		&participant.Name, &participant.MaxHP, &participant.AC,
		&statsSnapshot, &abilitiesSnapshot,
		&participant.Initiative, &participant.InitiativeBonus, &initiativeRoll,
		&participant.CurrentHP, &participant.TempHP, &passivePerception,
		&conditions, &concentrationSpell, &deathSaves,
		&participant.IsSurprised, &participant.HasReaction,
		&participant.LegendaryActionsUsed, &participant.LegendaryActionsMax,
		&participant.Position, &notes,
		&participant.IsVisibleToPlayers, &participant.ShowHPToPlayers, &participant.ShowConditionsToPlayers)
	if err != nil {
		return nil, err
	}

	if characterID.Valid {
		participant.CharacterID = &characterID.String
	}
	if npcID.Valid {
		participant.NPCID = &npcID.String
	}
	if monsterID.Valid {
		participant.MonsterID = &monsterID.String
	}
	if ownerUserID.Valid {
		participant.OwnerUserID = &ownerUserID.String
	}
	if statsSnapshot.Valid {
		participant.StatsSnapshot = []byte(statsSnapshot.String)
	}
	if abilitiesSnapshot.Valid {
		participant.AbilitiesSnapshot = []byte(abilitiesSnapshot.String)
	}
	if initiativeRoll.Valid {
		ir := int(initiativeRoll.Int64)
		participant.InitiativeRoll = &ir
	}
	if passivePerception.Valid {
		pp := int(passivePerception.Int64)
		participant.PassivePerception = &pp
	}
	if conditions.Valid {
		participant.Conditions = []byte(conditions.String)
	}
	if concentrationSpell.Valid {
		participant.ConcentrationSpell = &concentrationSpell.String
	}
	if deathSaves.Valid {
		participant.DeathSaves = []byte(deathSaves.String)
	}
	if notes.Valid {
		participant.Notes = &notes.String
	}

	return participant, nil
}

// scanCombatConditionFromRows scans a row into a CombatCondition struct.
func scanCombatConditionFromRows(rows Rows) (*CombatCondition, error) {
	condition := &CombatCondition{}
	var durationRounds, saveDC sql.NullInt64
	var saveAbility, source, notes sql.NullString

	err := rows.Scan(
		&condition.ID, &condition.ParticipantID, &condition.ConditionName,
		&durationRounds, &saveDC, &saveAbility, &source,
		&condition.AppliedRound, &notes)
	if err != nil {
		return nil, err
	}

	if durationRounds.Valid {
		dr := int(durationRounds.Int64)
		condition.DurationRounds = &dr
	}
	if saveDC.Valid {
		dc := int(saveDC.Int64)
		condition.SaveDC = &dc
	}
	if saveAbility.Valid {
		condition.SaveAbility = &saveAbility.String
	}
	if source.Valid {
		condition.Source = &source.String
	}
	if notes.Valid {
		condition.Notes = &notes.String
	}

	return condition, nil
}

// =============================================================================
// COMBAT ENCOUNTER OPERATIONS
// =============================================================================

// CreateCombatEncounter inserts a new combat encounter.
func (ops *CombatOperations) CreateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	if combat.ID == "" {
		combat.ID = generateUUID()
	}
	if combat.VisibilityMode == "" {
		combat.VisibilityMode = "full"
	}
	query := ops.qb.BuildInsert("combat_encounters", combatEncounterColumns)
	_, err := ops.exec.Exec(ctx, query,
		combat.ID, combat.SessionID, combat.CampaignID, combat.EncounterID, combat.Name,
		combat.CurrentRound, combat.CurrentTurn, combat.Status,
		combat.Difficulty, combat.Environment, combat.Notes,
		combat.VisibilityMode, combat.IsActive, combat.CreatedAt)
	return err
}

// GetCombatEncounterByID retrieves a combat encounter by ID.
func (ops *CombatOperations) GetCombatEncounterByID(ctx context.Context, id string) (*CombatEncounter, error) {
	query := ops.qb.BuildSelect("combat_encounters", combatEncounterColumns, "id")
	row := ops.exec.QueryRow(ctx, query, id)
	return scanCombatEncounter(row)
}

// GetCombatEncounterBySessionID retrieves the most recent combat encounter for a session.
func (ops *CombatOperations) GetCombatEncounterBySessionID(ctx context.Context, sessionID string) (*CombatEncounter, error) {
	query := ops.qb.BuildSelect("combat_encounters", combatEncounterColumns, "session_id") +
		" ORDER BY created_at DESC LIMIT 1"
	row := ops.exec.QueryRow(ctx, query, sessionID)
	return scanCombatEncounter(row)
}

// UpdateCombatEncounter updates an existing combat encounter.
func (ops *CombatOperations) UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	setCols := []string{"current_round", "current_turn", "status", "difficulty", "environment", "notes", "visibility_mode", "is_active"}
	query := ops.qb.BuildUpdate("combat_encounters", setCols, "id")
	_, err := ops.exec.Exec(ctx, query,
		combat.CurrentRound, combat.CurrentTurn, combat.Status,
		combat.Difficulty, combat.Environment, combat.Notes,
		combat.VisibilityMode, combat.IsActive, combat.ID)
	return err
}

// DeleteCombatEncounter removes a combat encounter by ID.
func (ops *CombatOperations) DeleteCombatEncounter(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("combat_encounters", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// =============================================================================
// COMBAT PARTICIPANT OPERATIONS
// =============================================================================

// prepareParticipantJSONFields converts byte slices to strings for storage.
func prepareParticipantJSONFields(p *CombatParticipant) (statsSnapshot, abilitiesSnapshot, conditions, deathSaves interface{}) {
	if len(p.StatsSnapshot) > 0 {
		statsSnapshot = string(p.StatsSnapshot)
	}
	if len(p.AbilitiesSnapshot) > 0 {
		abilitiesSnapshot = string(p.AbilitiesSnapshot)
	}
	if len(p.Conditions) > 0 {
		conditions = string(p.Conditions)
	}
	if len(p.DeathSaves) > 0 {
		deathSaves = string(p.DeathSaves)
	}
	return
}

// CreateCombatParticipant inserts a new combat participant.
func (ops *CombatOperations) CreateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	if participant.ID == "" {
		participant.ID = generateUUID()
	}
	query := ops.qb.BuildInsert("combat_participants", combatParticipantColumns)

	statsSnapshot, abilitiesSnapshot, conditions, deathSaves := prepareParticipantJSONFields(participant)

	_, err := ops.exec.Exec(ctx, query,
		participant.ID, participant.CombatID, participant.ParticipantType,
		participant.CharacterID, participant.NPCID, participant.MonsterID,
		participant.OwnerUserID, participant.Name, participant.MaxHP, participant.AC,
		statsSnapshot, abilitiesSnapshot,
		participant.Initiative, participant.InitiativeBonus, participant.InitiativeRoll,
		participant.CurrentHP, participant.TempHP, participant.PassivePerception,
		conditions, participant.ConcentrationSpell, deathSaves,
		participant.IsSurprised, participant.HasReaction,
		participant.LegendaryActionsUsed, participant.LegendaryActionsMax,
		participant.Position, participant.Notes,
		participant.IsVisibleToPlayers, participant.ShowHPToPlayers, participant.ShowConditionsToPlayers)
	return err
}

// GetCombatParticipantByID retrieves a combat participant by ID.
func (ops *CombatOperations) GetCombatParticipantByID(ctx context.Context, id string) (*CombatParticipant, error) {
	query := ops.qb.BuildSelect("combat_participants", combatParticipantColumns, "id")
	row := ops.exec.QueryRow(ctx, query, id)
	return scanCombatParticipantFromRow(row)
}

// ListCombatParticipants retrieves all participants for a combat encounter.
func (ops *CombatOperations) ListCombatParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	query := ops.qb.BuildSelect("combat_participants", combatParticipantColumns, "combat_id") +
		" ORDER BY initiative DESC, position ASC"
	rows, err := ops.exec.Query(ctx, query, combatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var participants []*CombatParticipant
	for rows.Next() {
		participant, err := scanCombatParticipantFromRows(rows)
		if err != nil {
			return nil, err
		}
		participants = append(participants, participant)
	}

	return participants, rows.Err()
}

// UpdateCombatParticipant updates an existing combat participant.
func (ops *CombatOperations) UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	setCols := []string{
		"initiative", "initiative_roll", "current_hp", "temp_hp", "passive_perception",
		"conditions", "concentration_spell", "death_saves",
		"is_surprised", "has_reaction", "legendary_actions_used",
		"position", "notes",
		"is_visible_to_players", "show_hp_to_players", "show_conditions_to_players",
	}
	query := ops.qb.BuildUpdate("combat_participants", setCols, "id")

	var conditions, deathSaves interface{}
	if len(participant.Conditions) > 0 {
		conditions = string(participant.Conditions)
	}
	if len(participant.DeathSaves) > 0 {
		deathSaves = string(participant.DeathSaves)
	}

	_, err := ops.exec.Exec(ctx, query,
		participant.Initiative, participant.InitiativeRoll, participant.CurrentHP, participant.TempHP,
		participant.PassivePerception, conditions, participant.ConcentrationSpell,
		deathSaves, participant.IsSurprised, participant.HasReaction,
		participant.LegendaryActionsUsed, participant.Position, participant.Notes,
		participant.IsVisibleToPlayers, participant.ShowHPToPlayers, participant.ShowConditionsToPlayers,
		participant.ID)
	return err
}

// DeleteCombatParticipant removes a combat participant by ID.
func (ops *CombatOperations) DeleteCombatParticipant(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("combat_participants", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// =============================================================================
// COMBAT CONDITION OPERATIONS
// =============================================================================

// CreateCombatCondition inserts a new combat condition.
func (ops *CombatOperations) CreateCombatCondition(ctx context.Context, condition *CombatCondition) error {
	if condition.ID == "" {
		condition.ID = generateUUID()
	}
	query := ops.qb.BuildInsert("combat_conditions", combatConditionColumns)
	_, err := ops.exec.Exec(ctx, query,
		condition.ID, condition.ParticipantID, condition.ConditionName,
		condition.DurationRounds, condition.SaveDC, condition.SaveAbility,
		condition.Source, condition.AppliedRound, condition.Notes)
	return err
}

// ListCombatConditions retrieves all conditions for a participant.
func (ops *CombatOperations) ListCombatConditions(ctx context.Context, participantID string) ([]*CombatCondition, error) {
	query := ops.qb.BuildSelect("combat_conditions", combatConditionColumns, "participant_id") +
		" ORDER BY applied_round DESC"
	rows, err := ops.exec.Query(ctx, query, participantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var conditions []*CombatCondition
	for rows.Next() {
		condition, err := scanCombatConditionFromRows(rows)
		if err != nil {
			return nil, err
		}
		conditions = append(conditions, condition)
	}

	return conditions, rows.Err()
}

// DeleteCombatCondition removes a combat condition by ID.
func (ops *CombatOperations) DeleteCombatCondition(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("combat_conditions", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// =============================================================================
// CAMPAIGN-LINKED COMBAT OPERATIONS
// =============================================================================

// GetActiveCombatByCampaignID retrieves the active combat encounter for a campaign.
func (ops *CombatOperations) GetActiveCombatByCampaignID(ctx context.Context, campaignID string) (*CombatEncounter, error) {
	query := ops.qb.BuildSelect("combat_encounters", combatEncounterColumns, "campaign_id") +
		" AND is_active = 1" +
		" AND status != 'completed'" +
		" ORDER BY created_at DESC LIMIT 1"
	row := ops.exec.QueryRow(ctx, query, campaignID)
	return scanCombatEncounter(row)
}

// ListCombatsByCampaignID retrieves all combat encounters for a campaign.
func (ops *CombatOperations) ListCombatsByCampaignID(ctx context.Context, campaignID string) ([]*CombatEncounter, error) {
	query := ops.qb.BuildSelect("combat_encounters", combatEncounterColumns, "campaign_id") +
		" ORDER BY created_at DESC"
	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var combats []*CombatEncounter
	for rows.Next() {
		combat, err := scanCombatEncounterFromRows(rows)
		if err != nil {
			return nil, err
		}
		combats = append(combats, combat)
	}

	return combats, rows.Err()
}

// scanCombatEncounterFromRows scans a row from Rows into a CombatEncounter struct.
func scanCombatEncounterFromRows(rows Rows) (*CombatEncounter, error) {
	combat := &CombatEncounter{}
	var campaignID, encounterID, difficulty, environment, notes, visibilityMode sql.NullString

	err := rows.Scan(
		&combat.ID, &combat.SessionID, &campaignID, &encounterID, &combat.Name,
		&combat.CurrentRound, &combat.CurrentTurn, &combat.Status,
		&difficulty, &environment, &notes, &visibilityMode, &combat.IsActive, &combat.CreatedAt)
	if err != nil {
		return nil, err
	}

	if campaignID.Valid {
		combat.CampaignID = &campaignID.String
	}
	if encounterID.Valid {
		combat.EncounterID = &encounterID.String
	}
	if difficulty.Valid {
		combat.Difficulty = &difficulty.String
	}
	if environment.Valid {
		combat.Environment = &environment.String
	}
	if notes.Valid {
		combat.Notes = &notes.String
	}
	if visibilityMode.Valid {
		combat.VisibilityMode = visibilityMode.String
	} else {
		combat.VisibilityMode = "full"
	}

	return combat, nil
}

// GetParticipantByOwnerUserID retrieves a participant by owner user ID and combat ID.
func (ops *CombatOperations) GetParticipantByOwnerUserID(ctx context.Context, combatID, userID string) (*CombatParticipant, error) {
	query := ops.qb.BuildSelect("combat_participants", combatParticipantColumns, "combat_id") +
		" AND owner_user_id = " + ops.qb.Placeholder(2)
	row := ops.exec.QueryRow(ctx, query, combatID, userID)
	return scanCombatParticipantFromRow(row)
}

// GetParticipantByCharacterID retrieves a participant by character ID and combat ID.
func (ops *CombatOperations) GetParticipantByCharacterID(ctx context.Context, combatID, characterID string) (*CombatParticipant, error) {
	query := ops.qb.BuildSelect("combat_participants", combatParticipantColumns, "combat_id") +
		" AND character_id = " + ops.qb.Placeholder(2)
	row := ops.exec.QueryRow(ctx, query, combatID, characterID)
	return scanCombatParticipantFromRow(row)
}

// ListVisibleParticipants retrieves participants visible to players for a combat.
func (ops *CombatOperations) ListVisibleParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	query := ops.qb.BuildSelect("combat_participants", combatParticipantColumns, "combat_id") +
		" AND is_visible_to_players = 1" +
		" ORDER BY initiative DESC, position ASC"
	rows, err := ops.exec.Query(ctx, query, combatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var participants []*CombatParticipant
	for rows.Next() {
		participant, err := scanCombatParticipantFromRows(rows)
		if err != nil {
			return nil, err
		}
		participants = append(participants, participant)
	}

	return participants, rows.Err()
}

// =============================================================================
// COMBAT SETTINGS OPERATIONS
// =============================================================================

// scanCombatSettings scans a row into a CombatSettings struct.
func scanCombatSettings(row Row) (*CombatSettings, error) {
	settings := &CombatSettings{}
	err := row.Scan(
		&settings.ID, &settings.CampaignID, &settings.DefaultVisibility,
		&settings.AllowPlayerSelfJoin, &settings.AutoRollInitiative,
		&settings.ShowMonsterNames, &settings.ShowMonsterHP,
		&settings.CreatedAt, &settings.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return settings, nil
}

// GetCombatSettings retrieves combat settings for a campaign.
func (ops *CombatOperations) GetCombatSettings(ctx context.Context, campaignID string) (*CombatSettings, error) {
	query := ops.qb.BuildSelect("combat_settings", combatSettingsColumns, "campaign_id")
	row := ops.exec.QueryRow(ctx, query, campaignID)
	return scanCombatSettings(row)
}

// UpsertCombatSettings creates or updates combat settings for a campaign.
func (ops *CombatOperations) UpsertCombatSettings(ctx context.Context, settings *CombatSettings) error {
	if settings.ID == "" {
		settings.ID = generateUUID()
	}

	// Try to update first
	updateCols := []string{"default_visibility", "allow_player_self_join", "auto_roll_initiative", "show_monster_names", "show_monster_hp", "updated_at"}
	updateQuery := ops.qb.BuildUpdate("combat_settings", updateCols, "campaign_id")
	result, err := ops.exec.Exec(ctx, updateQuery,
		settings.DefaultVisibility, settings.AllowPlayerSelfJoin, settings.AutoRollInitiative,
		settings.ShowMonsterNames, settings.ShowMonsterHP, settings.UpdatedAt, settings.CampaignID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	// If no rows affected, insert
	if rowsAffected == 0 {
		insertQuery := ops.qb.BuildInsert("combat_settings", combatSettingsColumns)
		_, err = ops.exec.Exec(ctx, insertQuery,
			settings.ID, settings.CampaignID, settings.DefaultVisibility,
			settings.AllowPlayerSelfJoin, settings.AutoRollInitiative,
			settings.ShowMonsterNames, settings.ShowMonsterHP,
			settings.CreatedAt, settings.UpdatedAt)
		return err
	}

	return nil
}
