package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Chase Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChase(ctx context.Context, chase *Chase) error {
	if chase.ID == "" {
		chase.ID = generateUUID()
	}
	chase.CreatedAt = time.Now()
	chase.UpdatedAt = time.Now()

	query := `INSERT INTO chases (id, user_id, campaign_id, name, chase_type, terrain, difficulty,
				description, setting, participants, starting_conditions, obstacles, complications,
				shortcuts, chase_phases, ending_conditions, rewards, special_rules, environmental_factors,
				ai_generated, ai_provider, current_round, max_rounds, starting_distance, current_distance,
				catch_threshold, escape_threshold, status, outcome, notes, created_at, updated_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)`

	_, err := db.pool.Exec(ctx, query,
		chase.ID, chase.UserID, chase.CampaignID, chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty,
		chase.Description, chase.Setting, chase.Participants, chase.StartingConditions, chase.Obstacles,
		chase.Complications, chase.Shortcuts, chase.ChasePhases, chase.EndingConditions, chase.Rewards,
		chase.SpecialRules, chase.EnvironmentalFactors, chase.AIGenerated, chase.AIProvider,
		chase.CurrentRound, chase.MaxRounds, chase.StartingDistance, chase.CurrentDistance,
		chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome, chase.Notes,
		chase.CreatedAt, chase.UpdatedAt)
	return err
}

func (db *PostgresDB) GetChaseByID(ctx context.Context, id string) (*Chase, error) {
	chase := &Chase{}
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
		&chase.Description, &chase.Setting, &chase.Participants, &chase.StartingConditions, &chase.Obstacles,
		&chase.Complications, &chase.Shortcuts, &chase.ChasePhases, &chase.EndingConditions, &chase.Rewards,
		&chase.SpecialRules, &chase.EnvironmentalFactors, &chase.AIGenerated, &chase.AIProvider,
		&chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance, &chase.CurrentDistance,
		&chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome, &chase.Notes,
		&chase.CreatedAt, &chase.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return chase, nil
}

func (db *PostgresDB) ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
					setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
					ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
					current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
					status, outcome, notes, created_at, updated_at
				  FROM chases WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
					setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
					ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
					current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
					status, outcome, notes, created_at, updated_at
				  FROM chases WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chases []*Chase
	for rows.Next() {
		chase := &Chase{}
		if err := rows.Scan(
			&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
			&chase.Description, &chase.Setting, &chase.Participants, &chase.StartingConditions, &chase.Obstacles,
			&chase.Complications, &chase.Shortcuts, &chase.ChasePhases, &chase.EndingConditions, &chase.Rewards,
			&chase.SpecialRules, &chase.EnvironmentalFactors, &chase.AIGenerated, &chase.AIProvider,
			&chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance, &chase.CurrentDistance,
			&chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome, &chase.Notes,
			&chase.CreatedAt, &chase.UpdatedAt); err != nil {
			return nil, err
		}
		chases = append(chases, chase)
	}

	return chases, rows.Err()
}

func (db *PostgresDB) ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error) {
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chases []*Chase
	for rows.Next() {
		chase := &Chase{}
		if err := rows.Scan(
			&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
			&chase.Description, &chase.Setting, &chase.Participants, &chase.StartingConditions, &chase.Obstacles,
			&chase.Complications, &chase.Shortcuts, &chase.ChasePhases, &chase.EndingConditions, &chase.Rewards,
			&chase.SpecialRules, &chase.EnvironmentalFactors, &chase.AIGenerated, &chase.AIProvider,
			&chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance, &chase.CurrentDistance,
			&chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome, &chase.Notes,
			&chase.CreatedAt, &chase.UpdatedAt); err != nil {
			return nil, err
		}
		chases = append(chases, chase)
	}

	return chases, rows.Err()
}

func (db *PostgresDB) UpdateChase(ctx context.Context, chase *Chase) error {
	chase.UpdatedAt = time.Now()
	query := `UPDATE chases SET name = $1, chase_type = $2, terrain = $3, difficulty = $4, description = $5,
				setting = $6, participants = $7, starting_conditions = $8, obstacles = $9, complications = $10,
				shortcuts = $11, chase_phases = $12, ending_conditions = $13, rewards = $14, special_rules = $15,
				environmental_factors = $16, current_round = $17, max_rounds = $18, starting_distance = $19,
				current_distance = $20, catch_threshold = $21, escape_threshold = $22, status = $23, outcome = $24,
				notes = $25, updated_at = $26
			  WHERE id = $27`

	_, err := db.pool.Exec(ctx, query,
		chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty, chase.Description, chase.Setting,
		chase.Participants, chase.StartingConditions, chase.Obstacles, chase.Complications, chase.Shortcuts,
		chase.ChasePhases, chase.EndingConditions, chase.Rewards, chase.SpecialRules,
		chase.EnvironmentalFactors, chase.CurrentRound, chase.MaxRounds, chase.StartingDistance,
		chase.CurrentDistance, chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome,
		chase.Notes, chase.UpdatedAt, chase.ID)
	return err
}

func (db *PostgresDB) DeleteChase(ctx context.Context, id string) error {
	query := `DELETE FROM chases WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Chase Tracker - Participant Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	if participant.ID == "" {
		participant.ID = generateUUID()
	}
	participant.CreatedAt = time.Now()

	query := `INSERT INTO chase_participants (id, chase_id, participant_type, character_id, npc_id, name, role,
				movement_speed, current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`

	_, err := db.pool.Exec(ctx, query,
		participant.ID, participant.ChaseID, participant.ParticipantType, participant.CharacterID, participant.NPCID,
		participant.Name, participant.Role, participant.MovementSpeed, participant.CurrentPosition, participant.Stamina,
		participant.MaxStamina, participant.HasDashed, participant.Conditions, participant.MovementThisRound, participant.CreatedAt)
	return err
}

func (db *PostgresDB) GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error) {
	participant := &ChaseParticipant{}
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&participant.ID, &participant.ChaseID, &participant.ParticipantType, &participant.CharacterID, &participant.NPCID,
		&participant.Name, &participant.Role, &participant.MovementSpeed, &participant.CurrentPosition, &participant.Stamina,
		&participant.MaxStamina, &participant.HasDashed, &participant.Conditions, &participant.MovementThisRound, &participant.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return participant, nil
}

func (db *PostgresDB) ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error) {
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE chase_id = $1 ORDER BY role, name`

	rows, err := db.pool.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []*ChaseParticipant
	for rows.Next() {
		participant := &ChaseParticipant{}
		if err := rows.Scan(
			&participant.ID, &participant.ChaseID, &participant.ParticipantType, &participant.CharacterID, &participant.NPCID,
			&participant.Name, &participant.Role, &participant.MovementSpeed, &participant.CurrentPosition, &participant.Stamina,
			&participant.MaxStamina, &participant.HasDashed, &participant.Conditions, &participant.MovementThisRound, &participant.CreatedAt); err != nil {
			return nil, err
		}
		participants = append(participants, participant)
	}

	return participants, rows.Err()
}

func (db *PostgresDB) UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	query := `UPDATE chase_participants SET current_position = $1, stamina = $2, has_dashed = $3,
				conditions = $4, movement_this_round = $5
			  WHERE id = $6`

	_, err := db.pool.Exec(ctx, query,
		participant.CurrentPosition, participant.Stamina, participant.HasDashed,
		participant.Conditions, participant.MovementThisRound, participant.ID)
	return err
}

func (db *PostgresDB) DeleteChaseParticipant(ctx context.Context, id string) error {
	query := `DELETE FROM chase_participants WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Chase Tracker - Challenge Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	if challenge.ID == "" {
		challenge.ID = generateUUID()
	}
	challenge.CreatedAt = time.Now()

	query := `INSERT INTO chase_challenges (id, chase_id, round, description, skill, dc, success_effect,
				failure_effect, alternate_skills, ai_generated, used, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := db.pool.Exec(ctx, query,
		challenge.ID, challenge.ChaseID, challenge.Round, challenge.Description, challenge.Skill, challenge.DC,
		challenge.SuccessEffect, challenge.FailureEffect, challenge.AlternateSkills, challenge.AIGenerated,
		challenge.Used, challenge.CreatedAt)
	return err
}

func (db *PostgresDB) GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error) {
	challenge := &ChaseChallenge{}
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
		&challenge.SuccessEffect, &challenge.FailureEffect, &challenge.AlternateSkills, &challenge.AIGenerated,
		&challenge.Used, &challenge.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return challenge, nil
}

func (db *PostgresDB) ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = $1 ORDER BY round, created_at`

	rows, err := db.pool.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var challenges []*ChaseChallenge
	for rows.Next() {
		challenge := &ChaseChallenge{}
		if err := rows.Scan(
			&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
			&challenge.SuccessEffect, &challenge.FailureEffect, &challenge.AlternateSkills, &challenge.AIGenerated,
			&challenge.Used, &challenge.CreatedAt); err != nil {
			return nil, err
		}
		challenges = append(challenges, challenge)
	}

	return challenges, rows.Err()
}

func (db *PostgresDB) ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = $1 AND round = $2 ORDER BY created_at`

	rows, err := db.pool.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var challenges []*ChaseChallenge
	for rows.Next() {
		challenge := &ChaseChallenge{}
		if err := rows.Scan(
			&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
			&challenge.SuccessEffect, &challenge.FailureEffect, &challenge.AlternateSkills, &challenge.AIGenerated,
			&challenge.Used, &challenge.CreatedAt); err != nil {
			return nil, err
		}
		challenges = append(challenges, challenge)
	}

	return challenges, rows.Err()
}

func (db *PostgresDB) UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	query := `UPDATE chase_challenges SET used = $1 WHERE id = $2`
	_, err := db.pool.Exec(ctx, query, challenge.Used, challenge.ID)
	return err
}

func (db *PostgresDB) DeleteChaseChallenge(ctx context.Context, id string) error {
	query := `DELETE FROM chase_challenges WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Chase Tracker - Complication Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	if complication.ID == "" {
		complication.ID = generateUUID()
	}
	complication.CreatedAt = time.Now()

	query := `INSERT INTO chase_complications (id, chase_id, round, description, complication_type, effect,
				save_ability, save_dc, resolved, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := db.pool.Exec(ctx, query,
		complication.ID, complication.ChaseID, complication.Round, complication.Description, complication.ComplicationType,
		complication.Effect, complication.SaveAbility, complication.SaveDC, complication.Resolved, complication.CreatedAt)
	return err
}

func (db *PostgresDB) GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error) {
	complication := &ChaseComplication{}
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&complication.ID, &complication.ChaseID, &complication.Round, &complication.Description, &complication.ComplicationType,
		&complication.Effect, &complication.SaveAbility, &complication.SaveDC, &complication.Resolved, &complication.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return complication, nil
}

func (db *PostgresDB) ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = $1 ORDER BY round, created_at`

	rows, err := db.pool.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var complications []*ChaseComplication
	for rows.Next() {
		complication := &ChaseComplication{}
		if err := rows.Scan(
			&complication.ID, &complication.ChaseID, &complication.Round, &complication.Description, &complication.ComplicationType,
			&complication.Effect, &complication.SaveAbility, &complication.SaveDC, &complication.Resolved, &complication.CreatedAt); err != nil {
			return nil, err
		}
		complications = append(complications, complication)
	}

	return complications, rows.Err()
}

func (db *PostgresDB) ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = $1 AND round = $2 ORDER BY created_at`

	rows, err := db.pool.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var complications []*ChaseComplication
	for rows.Next() {
		complication := &ChaseComplication{}
		if err := rows.Scan(
			&complication.ID, &complication.ChaseID, &complication.Round, &complication.Description, &complication.ComplicationType,
			&complication.Effect, &complication.SaveAbility, &complication.SaveDC, &complication.Resolved, &complication.CreatedAt); err != nil {
			return nil, err
		}
		complications = append(complications, complication)
	}

	return complications, rows.Err()
}

func (db *PostgresDB) UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	query := `UPDATE chase_complications SET resolved = $1 WHERE id = $2`
	_, err := db.pool.Exec(ctx, query, complication.Resolved, complication.ID)
	return err
}

func (db *PostgresDB) DeleteChaseComplication(ctx context.Context, id string) error {
	query := `DELETE FROM chase_complications WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Chase Tracker - Event Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChaseEvent(ctx context.Context, event *ChaseEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := `INSERT INTO chase_events (id, chase_id, round, participant_name, action, roll, success, effect, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := db.pool.Exec(ctx, query,
		event.ID, event.ChaseID, event.Round, event.ParticipantName, event.Action,
		event.Roll, event.Success, event.Effect, event.CreatedAt)
	return err
}

func (db *PostgresDB) ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = $1 ORDER BY round, created_at`

	rows, err := db.pool.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*ChaseEvent
	for rows.Next() {
		event := &ChaseEvent{}
		if err := rows.Scan(
			&event.ID, &event.ChaseID, &event.Round, &event.ParticipantName, &event.Action,
			&event.Roll, &event.Success, &event.Effect, &event.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

func (db *PostgresDB) ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = $1 AND round = $2 ORDER BY created_at`

	rows, err := db.pool.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*ChaseEvent
	for rows.Next() {
		event := &ChaseEvent{}
		if err := rows.Scan(
			&event.ID, &event.ChaseID, &event.Round, &event.ParticipantName, &event.Action,
			&event.Roll, &event.Success, &event.Effect, &event.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

func (db *PostgresDB) DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error {
	query := `DELETE FROM chase_events WHERE chase_id = $1`
	_, err := db.pool.Exec(ctx, query, chaseID)
	return err
}

// =============================================================================
// Chase Tracker - Template Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	if template.ID == "" {
		template.ID = generateUUID()
	}
	template.CreatedAt = time.Now()

	query := `INSERT INTO chase_templates (id, name, description, chase_type, terrain, default_starting_distance,
				default_catch_threshold, default_escape_threshold, default_max_rounds, difficulty, challenges,
				complications, is_public, created_by, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`

	_, err := db.pool.Exec(ctx, query,
		template.ID, template.Name, template.Description, template.ChaseType, template.Terrain,
		template.DefaultStartingDistance, template.DefaultCatchThreshold, template.DefaultEscapeThreshold,
		template.DefaultMaxRounds, template.Difficulty, template.Challenges, template.Complications,
		template.IsPublic, template.CreatedBy, template.CreatedAt)
	return err
}

func (db *PostgresDB) GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error) {
	template := &ChaseTemplate{}
	query := `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
				default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
				created_by, created_at
			  FROM chase_templates WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&template.ID, &template.Name, &template.Description, &template.ChaseType, &template.Terrain,
		&template.DefaultStartingDistance, &template.DefaultCatchThreshold, &template.DefaultEscapeThreshold,
		&template.DefaultMaxRounds, &template.Difficulty, &template.Challenges, &template.Complications,
		&template.IsPublic, &template.CreatedBy, &template.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return template, nil
}

func (db *PostgresDB) ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error) {
	var query string
	var args []interface{}

	if chaseType != nil {
		query = `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
					default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
					created_by, created_at
				  FROM chase_templates WHERE is_public = true AND chase_type = $1 ORDER BY name`
		args = []interface{}{*chaseType}
	} else {
		query = `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
					default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
					created_by, created_at
				  FROM chase_templates WHERE is_public = true ORDER BY name`
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []*ChaseTemplate
	for rows.Next() {
		template := &ChaseTemplate{}
		if err := rows.Scan(
			&template.ID, &template.Name, &template.Description, &template.ChaseType, &template.Terrain,
			&template.DefaultStartingDistance, &template.DefaultCatchThreshold, &template.DefaultEscapeThreshold,
			&template.DefaultMaxRounds, &template.Difficulty, &template.Challenges, &template.Complications,
			&template.IsPublic, &template.CreatedBy, &template.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, template)
	}

	return templates, rows.Err()
}

func (db *PostgresDB) UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	query := `UPDATE chase_templates SET name = $1, description = $2, challenges = $3, complications = $4
			  WHERE id = $5`

	_, err := db.pool.Exec(ctx, query,
		template.Name, template.Description, template.Challenges, template.Complications, template.ID)
	return err
}

func (db *PostgresDB) DeleteChaseTemplate(ctx context.Context, id string) error {
	query := `DELETE FROM chase_templates WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}
