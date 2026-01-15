package db

import (
	"context"
	"database/sql"
	"time"
)

// ChasesOperations provides unified chase operations.
type ChasesOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewChasesOperations creates a new ChasesOperations.
func NewChasesOperations(exec Executor, qb *QueryBuilder) *ChasesOperations {
	return &ChasesOperations{exec: exec, qb: qb}
}

// ============================================================================
// CHASE OPERATIONS
// ============================================================================

// CreateChase creates a new chase.
func (ops *ChasesOperations) CreateChase(ctx context.Context, chase *Chase) error {
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
			  VALUES (` + ops.qb.Placeholders(32) + `)`

	_, err := ops.exec.Exec(ctx, query,
		chase.ID, chase.UserID, chase.CampaignID, chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty,
		chase.Description, chase.Setting, chase.Participants, chase.StartingConditions, chase.Obstacles,
		chase.Complications, chase.Shortcuts, chase.ChasePhases, chase.EndingConditions, chase.Rewards,
		chase.SpecialRules, chase.EnvironmentalFactors, chase.AIGenerated, chase.AIProvider,
		chase.CurrentRound, chase.MaxRounds, chase.StartingDistance, chase.CurrentDistance,
		chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome, chase.Notes,
		chase.CreatedAt, chase.UpdatedAt)
	return err
}

// GetChaseByID retrieves a chase by ID.
func (ops *ChasesOperations) GetChaseByID(ctx context.Context, id string) (*Chase, error) {
	chase := &Chase{}
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE id = ` + ops.qb.Placeholder(1)

	row := ops.exec.QueryRow(ctx, query, id)
	if err := ops.scanChase(row, chase); err != nil {
		return nil, err
	}
	return chase, nil
}

// ListChasesByUserID lists chases for a user, optionally filtered by campaign.
func (ops *ChasesOperations) ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error) {
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE user_id = ` + ops.qb.Placeholder(1)

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

	return ops.scanChases(rows)
}

// ListChasesByCampaignID lists all chases for a campaign.
func (ops *ChasesOperations) ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error) {
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChases(rows)
}

// UpdateChase updates an existing chase.
func (ops *ChasesOperations) UpdateChase(ctx context.Context, chase *Chase) error {
	chase.UpdatedAt = time.Now()
	query := `UPDATE chases SET name = ` + ops.qb.Placeholder(1) + `, chase_type = ` + ops.qb.Placeholder(2) + `,
				terrain = ` + ops.qb.Placeholder(3) + `, difficulty = ` + ops.qb.Placeholder(4) + `,
				description = ` + ops.qb.Placeholder(5) + `, setting = ` + ops.qb.Placeholder(6) + `,
				participants = ` + ops.qb.Placeholder(7) + `, starting_conditions = ` + ops.qb.Placeholder(8) + `,
				obstacles = ` + ops.qb.Placeholder(9) + `, complications = ` + ops.qb.Placeholder(10) + `,
				shortcuts = ` + ops.qb.Placeholder(11) + `, chase_phases = ` + ops.qb.Placeholder(12) + `,
				ending_conditions = ` + ops.qb.Placeholder(13) + `, rewards = ` + ops.qb.Placeholder(14) + `,
				special_rules = ` + ops.qb.Placeholder(15) + `, environmental_factors = ` + ops.qb.Placeholder(16) + `,
				current_round = ` + ops.qb.Placeholder(17) + `, max_rounds = ` + ops.qb.Placeholder(18) + `,
				starting_distance = ` + ops.qb.Placeholder(19) + `, current_distance = ` + ops.qb.Placeholder(20) + `,
				catch_threshold = ` + ops.qb.Placeholder(21) + `, escape_threshold = ` + ops.qb.Placeholder(22) + `,
				status = ` + ops.qb.Placeholder(23) + `, outcome = ` + ops.qb.Placeholder(24) + `,
				notes = ` + ops.qb.Placeholder(25) + `, updated_at = ` + ops.qb.Placeholder(26) + `
			  WHERE id = ` + ops.qb.Placeholder(27)

	_, err := ops.exec.Exec(ctx, query,
		chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty, chase.Description, chase.Setting,
		chase.Participants, chase.StartingConditions, chase.Obstacles, chase.Complications, chase.Shortcuts,
		chase.ChasePhases, chase.EndingConditions, chase.Rewards, chase.SpecialRules,
		chase.EnvironmentalFactors, chase.CurrentRound, chase.MaxRounds, chase.StartingDistance,
		chase.CurrentDistance, chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome,
		chase.Notes, chase.UpdatedAt, chase.ID)
	return err
}

// DeleteChase deletes a chase by ID.
func (ops *ChasesOperations) DeleteChase(ctx context.Context, id string) error {
	query := `DELETE FROM chases WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// scanChase scans a single chase from a row.
func (ops *ChasesOperations) scanChase(row Row, chase *Chase) error {
	return row.Scan(
		&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
		&chase.Description, &chase.Setting, &chase.Participants, &chase.StartingConditions, &chase.Obstacles,
		&chase.Complications, &chase.Shortcuts, &chase.ChasePhases, &chase.EndingConditions, &chase.Rewards,
		&chase.SpecialRules, &chase.EnvironmentalFactors, &chase.AIGenerated, &chase.AIProvider,
		&chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance, &chase.CurrentDistance,
		&chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome, &chase.Notes,
		&chase.CreatedAt, &chase.UpdatedAt)
}

// scanChases scans multiple chases from rows.
func (ops *ChasesOperations) scanChases(rows Rows) ([]*Chase, error) {
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

// ============================================================================
// CHASE PARTICIPANT OPERATIONS
// ============================================================================

// CreateChaseParticipant creates a new chase participant.
func (ops *ChasesOperations) CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	if participant.ID == "" {
		participant.ID = generateUUID()
	}
	participant.CreatedAt = time.Now()

	query := `INSERT INTO chase_participants (id, chase_id, participant_type, character_id, npc_id, name, role,
				movement_speed, current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at)
			  VALUES (` + ops.qb.Placeholders(15) + `)`

	_, err := ops.exec.Exec(ctx, query,
		participant.ID, participant.ChaseID, participant.ParticipantType, participant.CharacterID, participant.NPCID,
		participant.Name, participant.Role, participant.MovementSpeed, participant.CurrentPosition, participant.Stamina,
		participant.MaxStamina, participant.HasDashed, participant.Conditions, participant.MovementThisRound, participant.CreatedAt)
	return err
}

// GetChaseParticipantByID retrieves a chase participant by ID.
func (ops *ChasesOperations) GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error) {
	participant := &ChaseParticipant{}
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&participant.ID, &participant.ChaseID, &participant.ParticipantType, &participant.CharacterID, &participant.NPCID,
		&participant.Name, &participant.Role, &participant.MovementSpeed, &participant.CurrentPosition, &participant.Stamina,
		&participant.MaxStamina, &participant.HasDashed, &participant.Conditions, &participant.MovementThisRound, &participant.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}

	return participant, nil
}

// ListChaseParticipants lists all participants for a chase.
func (ops *ChasesOperations) ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error) {
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE chase_id = ` + ops.qb.Placeholder(1) + ` ORDER BY role, name`

	rows, err := ops.exec.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

// UpdateChaseParticipant updates a chase participant.
func (ops *ChasesOperations) UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	query := `UPDATE chase_participants SET current_position = ` + ops.qb.Placeholder(1) + `,
				stamina = ` + ops.qb.Placeholder(2) + `, has_dashed = ` + ops.qb.Placeholder(3) + `,
				conditions = ` + ops.qb.Placeholder(4) + `, movement_this_round = ` + ops.qb.Placeholder(5) + `
			  WHERE id = ` + ops.qb.Placeholder(6)

	_, err := ops.exec.Exec(ctx, query,
		participant.CurrentPosition, participant.Stamina, participant.HasDashed,
		participant.Conditions, participant.MovementThisRound, participant.ID)
	return err
}

// DeleteChaseParticipant deletes a chase participant by ID.
func (ops *ChasesOperations) DeleteChaseParticipant(ctx context.Context, id string) error {
	query := `DELETE FROM chase_participants WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// CHASE CHALLENGE OPERATIONS
// ============================================================================

// CreateChaseChallenge creates a new chase challenge.
func (ops *ChasesOperations) CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	if challenge.ID == "" {
		challenge.ID = generateUUID()
	}
	challenge.CreatedAt = time.Now()

	query := `INSERT INTO chase_challenges (id, chase_id, round, description, skill, dc, success_effect,
				failure_effect, alternate_skills, ai_generated, used, created_at)
			  VALUES (` + ops.qb.Placeholders(12) + `)`

	_, err := ops.exec.Exec(ctx, query,
		challenge.ID, challenge.ChaseID, challenge.Round, challenge.Description, challenge.Skill, challenge.DC,
		challenge.SuccessEffect, challenge.FailureEffect, challenge.AlternateSkills, challenge.AIGenerated,
		challenge.Used, challenge.CreatedAt)
	return err
}

// GetChaseChallengeByID retrieves a chase challenge by ID.
func (ops *ChasesOperations) GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error) {
	challenge := &ChaseChallenge{}
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
		&challenge.SuccessEffect, &challenge.FailureEffect, &challenge.AlternateSkills, &challenge.AIGenerated,
		&challenge.Used, &challenge.CreatedAt)

	if err != nil {
		return nil, err
	}

	return challenge, nil
}

// ListChaseChallenges lists all challenges for a chase.
func (ops *ChasesOperations) ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = ` + ops.qb.Placeholder(1) + ` ORDER BY round, created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseChallenges(rows)
}

// ListChaseChallengesByRound lists challenges for a specific round.
func (ops *ChasesOperations) ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = ` + ops.qb.Placeholder(1) + ` AND round = ` + ops.qb.Placeholder(2) + ` ORDER BY created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseChallenges(rows)
}

// UpdateChaseChallenge updates a chase challenge.
func (ops *ChasesOperations) UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	query := `UPDATE chase_challenges SET used = ` + ops.qb.Placeholder(1) + ` WHERE id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, challenge.Used, challenge.ID)
	return err
}

// DeleteChaseChallenge deletes a chase challenge by ID.
func (ops *ChasesOperations) DeleteChaseChallenge(ctx context.Context, id string) error {
	query := `DELETE FROM chase_challenges WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// scanChaseChallenges scans multiple chase challenges from rows.
func (ops *ChasesOperations) scanChaseChallenges(rows Rows) ([]*ChaseChallenge, error) {
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

// ============================================================================
// CHASE COMPLICATION OPERATIONS
// ============================================================================

// CreateChaseComplication creates a new chase complication.
func (ops *ChasesOperations) CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	if complication.ID == "" {
		complication.ID = generateUUID()
	}
	complication.CreatedAt = time.Now()

	query := `INSERT INTO chase_complications (id, chase_id, round, description, complication_type, effect,
				save_ability, save_dc, resolved, created_at)
			  VALUES (` + ops.qb.Placeholders(10) + `)`

	_, err := ops.exec.Exec(ctx, query,
		complication.ID, complication.ChaseID, complication.Round, complication.Description, complication.ComplicationType,
		complication.Effect, complication.SaveAbility, complication.SaveDC, complication.Resolved, complication.CreatedAt)
	return err
}

// GetChaseComplicationByID retrieves a chase complication by ID.
func (ops *ChasesOperations) GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error) {
	complication := &ChaseComplication{}
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&complication.ID, &complication.ChaseID, &complication.Round, &complication.Description, &complication.ComplicationType,
		&complication.Effect, &complication.SaveAbility, &complication.SaveDC, &complication.Resolved, &complication.CreatedAt)

	if err != nil {
		return nil, err
	}

	return complication, nil
}

// ListChaseComplications lists all complications for a chase.
func (ops *ChasesOperations) ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = ` + ops.qb.Placeholder(1) + ` ORDER BY round, created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseComplications(rows)
}

// ListChaseComplicationsByRound lists complications for a specific round.
func (ops *ChasesOperations) ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = ` + ops.qb.Placeholder(1) + ` AND round = ` + ops.qb.Placeholder(2) + ` ORDER BY created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseComplications(rows)
}

// UpdateChaseComplication updates a chase complication.
func (ops *ChasesOperations) UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	query := `UPDATE chase_complications SET resolved = ` + ops.qb.Placeholder(1) + ` WHERE id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, complication.Resolved, complication.ID)
	return err
}

// DeleteChaseComplication deletes a chase complication by ID.
func (ops *ChasesOperations) DeleteChaseComplication(ctx context.Context, id string) error {
	query := `DELETE FROM chase_complications WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// scanChaseComplications scans multiple chase complications from rows.
func (ops *ChasesOperations) scanChaseComplications(rows Rows) ([]*ChaseComplication, error) {
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

// ============================================================================
// CHASE EVENT OPERATIONS
// ============================================================================

// CreateChaseEvent creates a new chase event.
func (ops *ChasesOperations) CreateChaseEvent(ctx context.Context, event *ChaseEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := `INSERT INTO chase_events (id, chase_id, round, participant_name, action, roll, success, effect, created_at)
			  VALUES (` + ops.qb.Placeholders(9) + `)`

	_, err := ops.exec.Exec(ctx, query,
		event.ID, event.ChaseID, event.Round, event.ParticipantName, event.Action,
		event.Roll, event.Success, event.Effect, event.CreatedAt)
	return err
}

// ListChaseEvents lists all events for a chase.
func (ops *ChasesOperations) ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = ` + ops.qb.Placeholder(1) + ` ORDER BY round, created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseEvents(rows)
}

// ListChaseEventsByRound lists events for a specific round.
func (ops *ChasesOperations) ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = ` + ops.qb.Placeholder(1) + ` AND round = ` + ops.qb.Placeholder(2) + ` ORDER BY created_at`

	rows, err := ops.exec.Query(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return ops.scanChaseEvents(rows)
}

// DeleteChaseEventsByChaseID deletes all events for a chase.
func (ops *ChasesOperations) DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error {
	query := `DELETE FROM chase_events WHERE chase_id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, chaseID)
	return err
}

// scanChaseEvents scans multiple chase events from rows.
func (ops *ChasesOperations) scanChaseEvents(rows Rows) ([]*ChaseEvent, error) {
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

// ============================================================================
// CHASE TEMPLATE OPERATIONS
// ============================================================================

// CreateChaseTemplate creates a new chase template.
func (ops *ChasesOperations) CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	if template.ID == "" {
		template.ID = generateUUID()
	}
	template.CreatedAt = time.Now()

	query := `INSERT INTO chase_templates (id, name, description, chase_type, terrain, default_starting_distance,
				default_catch_threshold, default_escape_threshold, default_max_rounds, difficulty, challenges,
				complications, is_public, created_by, created_at)
			  VALUES (` + ops.qb.Placeholders(15) + `)`

	_, err := ops.exec.Exec(ctx, query,
		template.ID, template.Name, template.Description, template.ChaseType, template.Terrain,
		template.DefaultStartingDistance, template.DefaultCatchThreshold, template.DefaultEscapeThreshold,
		template.DefaultMaxRounds, template.Difficulty, template.Challenges, template.Complications,
		template.IsPublic, template.CreatedBy, template.CreatedAt)
	return err
}

// GetChaseTemplateByID retrieves a chase template by ID.
func (ops *ChasesOperations) GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error) {
	template := &ChaseTemplate{}
	query := `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
				default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
				created_by, created_at
			  FROM chase_templates WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&template.ID, &template.Name, &template.Description, &template.ChaseType, &template.Terrain,
		&template.DefaultStartingDistance, &template.DefaultCatchThreshold, &template.DefaultEscapeThreshold,
		&template.DefaultMaxRounds, &template.Difficulty, &template.Challenges, &template.Complications,
		&template.IsPublic, &template.CreatedBy, &template.CreatedAt)

	if err != nil {
		return nil, err
	}

	return template, nil
}

// ListChaseTemplates lists public chase templates, optionally filtered by type.
func (ops *ChasesOperations) ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error) {
	query := `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
				default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
				created_by, created_at
			  FROM chase_templates WHERE is_public = ` + ops.qb.BoolLiteral(true)

	args := []interface{}{}
	if chaseType != nil {
		query += ` AND chase_type = ` + ops.qb.Placeholder(1)
		args = append(args, *chaseType)
	}
	query += ` ORDER BY name`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

// UpdateChaseTemplate updates a chase template.
func (ops *ChasesOperations) UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	query := `UPDATE chase_templates SET name = ` + ops.qb.Placeholder(1) + `, description = ` + ops.qb.Placeholder(2) + `,
				challenges = ` + ops.qb.Placeholder(3) + `, complications = ` + ops.qb.Placeholder(4) + `
			  WHERE id = ` + ops.qb.Placeholder(5)

	_, err := ops.exec.Exec(ctx, query,
		template.Name, template.Description, template.Challenges, template.Complications, template.ID)
	return err
}

// DeleteChaseTemplate deletes a chase template by ID.
func (ops *ChasesOperations) DeleteChaseTemplate(ctx context.Context, id string) error {
	query := `DELETE FROM chase_templates WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}
