package db

import (
	"context"
	"database/sql"

	"github.com/jackc/pgx/v5"
)

// ============================================================================
// COMBAT ENCOUNTER OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	if combat.ID == "" {
		combat.ID = generateUUID()
	}
	query := `INSERT INTO combat_encounters
              (id, session_id, encounter_id, name, current_round, current_turn,
               status, difficulty, environment, notes, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := db.pool.Exec(ctx, query,
		combat.ID, combat.SessionID, combat.EncounterID, combat.Name,
		combat.CurrentRound, combat.CurrentTurn, combat.Status,
		combat.Difficulty, combat.Environment, combat.Notes, combat.CreatedAt)
	return err
}

func (db *PostgresDB) GetCombatEncounterByID(ctx context.Context, id string) (*CombatEncounter, error) {
	query := `SELECT id, session_id, encounter_id, name, current_round, current_turn,
              status, difficulty, environment, notes, created_at
              FROM combat_encounters
              WHERE id = $1`

	combat := &CombatEncounter{}
	var encounterID, difficulty, environment, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&combat.ID, &combat.SessionID, &encounterID, &combat.Name,
		&combat.CurrentRound, &combat.CurrentTurn, &combat.Status,
		&difficulty, &environment, &notes, &combat.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
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

	return combat, nil
}

func (db *PostgresDB) GetCombatEncounterBySessionID(ctx context.Context, sessionID string) (*CombatEncounter, error) {
	query := `SELECT id, session_id, encounter_id, name, current_round, current_turn,
              status, difficulty, environment, notes, created_at
              FROM combat_encounters
              WHERE session_id = $1
              ORDER BY created_at DESC
              LIMIT 1`

	combat := &CombatEncounter{}
	var encounterID, difficulty, environment, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, sessionID).Scan(
		&combat.ID, &combat.SessionID, &encounterID, &combat.Name,
		&combat.CurrentRound, &combat.CurrentTurn, &combat.Status,
		&difficulty, &environment, &notes, &combat.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
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

	return combat, nil
}

func (db *PostgresDB) UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	query := `UPDATE combat_encounters
              SET current_round = $1, current_turn = $2, status = $3,
                  difficulty = $4, environment = $5, notes = $6
              WHERE id = $7`

	_, err := db.pool.Exec(ctx, query,
		combat.CurrentRound, combat.CurrentTurn, combat.Status,
		combat.Difficulty, combat.Environment, combat.Notes, combat.ID)
	return err
}

func (db *PostgresDB) DeleteCombatEncounter(ctx context.Context, id string) error {
	query := `DELETE FROM combat_encounters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// ============================================================================
// COMBAT PARTICIPANT OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	if participant.ID == "" {
		participant.ID = generateUUID()
	}
	query := `INSERT INTO combat_participants
              (id, combat_id, participant_type, character_id, npc_id, monster_id,
               name, max_hp, ac, stats_snapshot, abilities_snapshot,
               initiative, initiative_bonus, current_hp, temp_hp, passive_perception,
               conditions, concentration_spell, death_saves, is_surprised, has_reaction,
               legendary_actions_used, legendary_actions_max, position, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`

	var statsSnapshot, abilitiesSnapshot, conditions, deathSaves interface{}
	if len(participant.StatsSnapshot) > 0 {
		statsSnapshot = string(participant.StatsSnapshot)
	}
	if len(participant.AbilitiesSnapshot) > 0 {
		abilitiesSnapshot = string(participant.AbilitiesSnapshot)
	}
	if len(participant.Conditions) > 0 {
		conditions = string(participant.Conditions)
	}
	if len(participant.DeathSaves) > 0 {
		deathSaves = string(participant.DeathSaves)
	}

	_, err := db.pool.Exec(ctx, query,
		participant.ID, participant.CombatID, participant.ParticipantType,
		participant.CharacterID, participant.NPCID, participant.MonsterID,
		participant.Name, participant.MaxHP, participant.AC,
		statsSnapshot, abilitiesSnapshot,
		participant.Initiative, participant.InitiativeBonus,
		participant.CurrentHP, participant.TempHP, participant.PassivePerception,
		conditions, participant.ConcentrationSpell, deathSaves,
		participant.IsSurprised, participant.HasReaction,
		participant.LegendaryActionsUsed, participant.LegendaryActionsMax,
		participant.Position, participant.Notes)
	return err
}

func (db *PostgresDB) GetCombatParticipantByID(ctx context.Context, id string) (*CombatParticipant, error) {
	query := `SELECT id, combat_id, participant_type, character_id, npc_id, monster_id,
              name, max_hp, ac, stats_snapshot, abilities_snapshot,
              initiative, initiative_bonus, current_hp, temp_hp, passive_perception,
              conditions, concentration_spell, death_saves, is_surprised, has_reaction,
              legendary_actions_used, legendary_actions_max, position, notes
              FROM combat_participants
              WHERE id = $1`

	participant := &CombatParticipant{}
	var characterID, npcID, monsterID, statsSnapshot, abilitiesSnapshot sql.NullString
	var passivePerception sql.NullInt64
	var conditions, concentrationSpell, deathSaves, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&participant.ID, &participant.CombatID, &participant.ParticipantType,
		&characterID, &npcID, &monsterID,
		&participant.Name, &participant.MaxHP, &participant.AC,
		&statsSnapshot, &abilitiesSnapshot,
		&participant.Initiative, &participant.InitiativeBonus,
		&participant.CurrentHP, &participant.TempHP, &passivePerception,
		&conditions, &concentrationSpell, &deathSaves,
		&participant.IsSurprised, &participant.HasReaction,
		&participant.LegendaryActionsUsed, &participant.LegendaryActionsMax,
		&participant.Position, &notes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
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
	if statsSnapshot.Valid {
		participant.StatsSnapshot = []byte(statsSnapshot.String)
	}
	if abilitiesSnapshot.Valid {
		participant.AbilitiesSnapshot = []byte(abilitiesSnapshot.String)
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

func (db *PostgresDB) ListCombatParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	query := `SELECT id, combat_id, participant_type, character_id, npc_id, monster_id,
              name, max_hp, ac, stats_snapshot, abilities_snapshot,
              initiative, initiative_bonus, current_hp, temp_hp, passive_perception,
              conditions, concentration_spell, death_saves, is_surprised, has_reaction,
              legendary_actions_used, legendary_actions_max, position, notes
              FROM combat_participants
              WHERE combat_id = $1
              ORDER BY initiative DESC, position ASC`

	rows, err := db.pool.Query(ctx, query, combatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []*CombatParticipant
	for rows.Next() {
		participant := &CombatParticipant{}
		var characterID, npcID, monsterID, statsSnapshot, abilitiesSnapshot sql.NullString
		var passivePerception sql.NullInt64
		var conditions, concentrationSpell, deathSaves, notes sql.NullString

		err := rows.Scan(
			&participant.ID, &participant.CombatID, &participant.ParticipantType,
			&characterID, &npcID, &monsterID,
			&participant.Name, &participant.MaxHP, &participant.AC,
			&statsSnapshot, &abilitiesSnapshot,
			&participant.Initiative, &participant.InitiativeBonus,
			&participant.CurrentHP, &participant.TempHP, &passivePerception,
			&conditions, &concentrationSpell, &deathSaves,
			&participant.IsSurprised, &participant.HasReaction,
			&participant.LegendaryActionsUsed, &participant.LegendaryActionsMax,
			&participant.Position, &notes)
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
		if statsSnapshot.Valid {
			participant.StatsSnapshot = []byte(statsSnapshot.String)
		}
		if abilitiesSnapshot.Valid {
			participant.AbilitiesSnapshot = []byte(abilitiesSnapshot.String)
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

		participants = append(participants, participant)
	}

	return participants, rows.Err()
}

func (db *PostgresDB) UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	query := `UPDATE combat_participants
              SET initiative = $1, current_hp = $2, temp_hp = $3, passive_perception = $4,
                  conditions = $5, concentration_spell = $6, death_saves = $7,
                  is_surprised = $8, has_reaction = $9, legendary_actions_used = $10,
                  position = $11, notes = $12
              WHERE id = $13`

	var conditions, deathSaves interface{}
	if len(participant.Conditions) > 0 {
		conditions = string(participant.Conditions)
	}
	if len(participant.DeathSaves) > 0 {
		deathSaves = string(participant.DeathSaves)
	}

	_, err := db.pool.Exec(ctx, query,
		participant.Initiative, participant.CurrentHP, participant.TempHP,
		participant.PassivePerception, conditions, participant.ConcentrationSpell,
		deathSaves, participant.IsSurprised, participant.HasReaction,
		participant.LegendaryActionsUsed, participant.Position, participant.Notes,
		participant.ID)
	return err
}

func (db *PostgresDB) DeleteCombatParticipant(ctx context.Context, id string) error {
	query := `DELETE FROM combat_participants WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// ============================================================================
// COMBAT CONDITION OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatCondition(ctx context.Context, condition *CombatCondition) error {
	if condition.ID == "" {
		condition.ID = generateUUID()
	}
	query := `INSERT INTO combat_conditions
              (id, participant_id, condition_name, duration_rounds, save_dc,
               save_ability, source, applied_round, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := db.pool.Exec(ctx, query,
		condition.ID, condition.ParticipantID, condition.ConditionName,
		condition.DurationRounds, condition.SaveDC, condition.SaveAbility,
		condition.Source, condition.AppliedRound, condition.Notes)
	return err
}

func (db *PostgresDB) ListCombatConditions(ctx context.Context, participantID string) ([]*CombatCondition, error) {
	query := `SELECT id, participant_id, condition_name, duration_rounds, save_dc,
              save_ability, source, applied_round, notes
              FROM combat_conditions
              WHERE participant_id = $1
              ORDER BY applied_round DESC`

	rows, err := db.pool.Query(ctx, query, participantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conditions []*CombatCondition
	for rows.Next() {
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

		conditions = append(conditions, condition)
	}

	return conditions, rows.Err()
}

func (db *PostgresDB) DeleteCombatCondition(ctx context.Context, id string) error {
	query := `DELETE FROM combat_conditions WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}
