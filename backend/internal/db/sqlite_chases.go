package db

import (
	"context"
	"database/sql"
	"time"
)

// Chase operations

func (s *SQLiteDB) CreateChase(ctx context.Context, chase *Chase) error {
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
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		chase.ID, chase.UserID, chase.CampaignID, chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty,
		chase.Description, chase.Setting, chase.Participants, chase.StartingConditions, chase.Obstacles,
		chase.Complications, chase.Shortcuts, chase.ChasePhases, chase.EndingConditions, chase.Rewards,
		chase.SpecialRules, chase.EnvironmentalFactors, chase.AIGenerated, chase.AIProvider,
		chase.CurrentRound, chase.MaxRounds, chase.StartingDistance, chase.CurrentDistance,
		chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome, chase.Notes,
		chase.CreatedAt, chase.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetChaseByID(ctx context.Context, id string) (*Chase, error) {
	chase := &Chase{}
	var participants, obstacles, complications, shortcuts, chasePhases, endingConditions, rewards, environmentalFactors sql.NullString
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
		&chase.Description, &chase.Setting, &participants, &chase.StartingConditions, &obstacles, &complications,
		&shortcuts, &chasePhases, &endingConditions, &rewards, &chase.SpecialRules, &environmentalFactors,
		&chase.AIGenerated, &chase.AIProvider, &chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance,
		&chase.CurrentDistance, &chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome,
		&chase.Notes, &chase.CreatedAt, &chase.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// Convert nullable JSON fields
	if participants.Valid {
		chase.Participants = []byte(participants.String)
	}
	if obstacles.Valid {
		chase.Obstacles = []byte(obstacles.String)
	}
	if complications.Valid {
		chase.Complications = []byte(complications.String)
	}
	if shortcuts.Valid {
		chase.Shortcuts = []byte(shortcuts.String)
	}
	if chasePhases.Valid {
		chase.ChasePhases = []byte(chasePhases.String)
	}
	if endingConditions.Valid {
		chase.EndingConditions = []byte(endingConditions.String)
	}
	if rewards.Valid {
		chase.Rewards = []byte(rewards.String)
	}
	if environmentalFactors.Valid {
		chase.EnvironmentalFactors = []byte(environmentalFactors.String)
	}

	return chase, nil
}

func (s *SQLiteDB) ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error) {
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE user_id = ?`

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

	var chases []*Chase
	for rows.Next() {
		chase := &Chase{}
		var participants, obstacles, complications, shortcuts, chasePhases, endingConditions, rewards, environmentalFactors sql.NullString
		if err := rows.Scan(
			&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
			&chase.Description, &chase.Setting, &participants, &chase.StartingConditions, &obstacles, &complications,
			&shortcuts, &chasePhases, &endingConditions, &rewards, &chase.SpecialRules, &environmentalFactors,
			&chase.AIGenerated, &chase.AIProvider, &chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance,
			&chase.CurrentDistance, &chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome,
			&chase.Notes, &chase.CreatedAt, &chase.UpdatedAt); err != nil {
			return nil, err
		}

		// Convert nullable JSON fields
		if participants.Valid {
			chase.Participants = []byte(participants.String)
		}
		if obstacles.Valid {
			chase.Obstacles = []byte(obstacles.String)
		}
		if complications.Valid {
			chase.Complications = []byte(complications.String)
		}
		if shortcuts.Valid {
			chase.Shortcuts = []byte(shortcuts.String)
		}
		if chasePhases.Valid {
			chase.ChasePhases = []byte(chasePhases.String)
		}
		if endingConditions.Valid {
			chase.EndingConditions = []byte(endingConditions.String)
		}
		if rewards.Valid {
			chase.Rewards = []byte(rewards.String)
		}
		if environmentalFactors.Valid {
			chase.EnvironmentalFactors = []byte(environmentalFactors.String)
		}

		chases = append(chases, chase)
	}

	return chases, nil
}

func (s *SQLiteDB) ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error) {
	query := `SELECT id, user_id, campaign_id, name, chase_type, terrain, difficulty, description,
				setting, participants, starting_conditions, obstacles, complications, shortcuts, chase_phases,
				ending_conditions, rewards, special_rules, environmental_factors, ai_generated, ai_provider,
				current_round, max_rounds, starting_distance, current_distance, catch_threshold, escape_threshold,
				status, outcome, notes, created_at, updated_at
			  FROM chases WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var chases []*Chase
	for rows.Next() {
		chase := &Chase{}
		var participants, obstacles, complications, shortcuts, chasePhases, endingConditions, rewards, environmentalFactors sql.NullString
		if err := rows.Scan(
			&chase.ID, &chase.UserID, &chase.CampaignID, &chase.Name, &chase.ChaseType, &chase.Terrain, &chase.Difficulty,
			&chase.Description, &chase.Setting, &participants, &chase.StartingConditions, &obstacles, &complications,
			&shortcuts, &chasePhases, &endingConditions, &rewards, &chase.SpecialRules, &environmentalFactors,
			&chase.AIGenerated, &chase.AIProvider, &chase.CurrentRound, &chase.MaxRounds, &chase.StartingDistance,
			&chase.CurrentDistance, &chase.CatchThreshold, &chase.EscapeThreshold, &chase.Status, &chase.Outcome,
			&chase.Notes, &chase.CreatedAt, &chase.UpdatedAt); err != nil {
			return nil, err
		}

		// Convert nullable JSON fields
		if participants.Valid {
			chase.Participants = []byte(participants.String)
		}
		if obstacles.Valid {
			chase.Obstacles = []byte(obstacles.String)
		}
		if complications.Valid {
			chase.Complications = []byte(complications.String)
		}
		if shortcuts.Valid {
			chase.Shortcuts = []byte(shortcuts.String)
		}
		if chasePhases.Valid {
			chase.ChasePhases = []byte(chasePhases.String)
		}
		if endingConditions.Valid {
			chase.EndingConditions = []byte(endingConditions.String)
		}
		if rewards.Valid {
			chase.Rewards = []byte(rewards.String)
		}
		if environmentalFactors.Valid {
			chase.EnvironmentalFactors = []byte(environmentalFactors.String)
		}

		chases = append(chases, chase)
	}

	return chases, nil
}

func (s *SQLiteDB) UpdateChase(ctx context.Context, chase *Chase) error {
	chase.UpdatedAt = time.Now()
	query := `UPDATE chases SET name = ?, chase_type = ?, terrain = ?, difficulty = ?, description = ?,
				setting = ?, participants = ?, starting_conditions = ?, obstacles = ?, complications = ?,
				shortcuts = ?, chase_phases = ?, ending_conditions = ?, rewards = ?, special_rules = ?,
				environmental_factors = ?, current_round = ?, max_rounds = ?, starting_distance = ?,
				current_distance = ?, catch_threshold = ?, escape_threshold = ?, status = ?, outcome = ?,
				notes = ?, updated_at = ?
			  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		chase.Name, chase.ChaseType, chase.Terrain, chase.Difficulty, chase.Description, chase.Setting,
		chase.Participants, chase.StartingConditions, chase.Obstacles, chase.Complications, chase.Shortcuts,
		chase.ChasePhases, chase.EndingConditions, chase.Rewards, chase.SpecialRules,
		chase.EnvironmentalFactors, chase.CurrentRound, chase.MaxRounds, chase.StartingDistance,
		chase.CurrentDistance, chase.CatchThreshold, chase.EscapeThreshold, chase.Status, chase.Outcome,
		chase.Notes, chase.UpdatedAt, chase.ID)
	return err
}

func (s *SQLiteDB) DeleteChase(ctx context.Context, id string) error {
	query := `DELETE FROM chases WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Chase Tracker - Participant operations

func (s *SQLiteDB) CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	if participant.ID == "" {
		participant.ID = generateUUID()
	}
	participant.CreatedAt = time.Now()

	query := `INSERT INTO chase_participants (id, chase_id, participant_type, character_id, npc_id, name, role,
				movement_speed, current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		participant.ID, participant.ChaseID, participant.ParticipantType, participant.CharacterID, participant.NPCID,
		participant.Name, participant.Role, participant.MovementSpeed, participant.CurrentPosition, participant.Stamina,
		participant.MaxStamina, participant.HasDashed, participant.Conditions, participant.MovementThisRound, participant.CreatedAt)
	return err
}

func (s *SQLiteDB) GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error) {
	participant := &ChaseParticipant{}
	var conditions sql.NullString
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&participant.ID, &participant.ChaseID, &participant.ParticipantType, &participant.CharacterID, &participant.NPCID,
		&participant.Name, &participant.Role, &participant.MovementSpeed, &participant.CurrentPosition, &participant.Stamina,
		&participant.MaxStamina, &participant.HasDashed, &conditions, &participant.MovementThisRound, &participant.CreatedAt)

	if err != nil {
		return nil, err
	}

	if conditions.Valid {
		participant.Conditions = []byte(conditions.String)
	}

	return participant, nil
}

func (s *SQLiteDB) ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error) {
	query := `SELECT id, chase_id, participant_type, character_id, npc_id, name, role, movement_speed,
				current_position, stamina, max_stamina, has_dashed, conditions, movement_this_round, created_at
			  FROM chase_participants WHERE chase_id = ? ORDER BY role, name`

	rows, err := s.db.QueryContext(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var participants []*ChaseParticipant
	for rows.Next() {
		participant := &ChaseParticipant{}
		var conditions sql.NullString
		if err := rows.Scan(
			&participant.ID, &participant.ChaseID, &participant.ParticipantType, &participant.CharacterID, &participant.NPCID,
			&participant.Name, &participant.Role, &participant.MovementSpeed, &participant.CurrentPosition, &participant.Stamina,
			&participant.MaxStamina, &participant.HasDashed, &conditions, &participant.MovementThisRound, &participant.CreatedAt); err != nil {
			return nil, err
		}

		if conditions.Valid {
			participant.Conditions = []byte(conditions.String)
		}

		participants = append(participants, participant)
	}

	return participants, nil
}

func (s *SQLiteDB) UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	query := `UPDATE chase_participants SET current_position = ?, stamina = ?, has_dashed = ?,
				conditions = ?, movement_this_round = ?
			  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		participant.CurrentPosition, participant.Stamina, participant.HasDashed,
		participant.Conditions, participant.MovementThisRound, participant.ID)
	return err
}

func (s *SQLiteDB) DeleteChaseParticipant(ctx context.Context, id string) error {
	query := `DELETE FROM chase_participants WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Chase Tracker - Challenge operations

func (s *SQLiteDB) CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	if challenge.ID == "" {
		challenge.ID = generateUUID()
	}
	challenge.CreatedAt = time.Now()

	query := `INSERT INTO chase_challenges (id, chase_id, round, description, skill, dc, success_effect,
				failure_effect, alternate_skills, ai_generated, used, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		challenge.ID, challenge.ChaseID, challenge.Round, challenge.Description, challenge.Skill, challenge.DC,
		challenge.SuccessEffect, challenge.FailureEffect, challenge.AlternateSkills, challenge.AIGenerated,
		challenge.Used, challenge.CreatedAt)
	return err
}

func (s *SQLiteDB) GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error) {
	challenge := &ChaseChallenge{}
	var alternateSkills sql.NullString
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
		&challenge.SuccessEffect, &challenge.FailureEffect, &alternateSkills, &challenge.AIGenerated,
		&challenge.Used, &challenge.CreatedAt)

	if err != nil {
		return nil, err
	}

	if alternateSkills.Valid {
		challenge.AlternateSkills = []byte(alternateSkills.String)
	}

	return challenge, nil
}

func (s *SQLiteDB) ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = ? ORDER BY round, created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var challenges []*ChaseChallenge
	for rows.Next() {
		challenge := &ChaseChallenge{}
		var alternateSkills sql.NullString
		if err := rows.Scan(
			&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
			&challenge.SuccessEffect, &challenge.FailureEffect, &alternateSkills, &challenge.AIGenerated,
			&challenge.Used, &challenge.CreatedAt); err != nil {
			return nil, err
		}

		if alternateSkills.Valid {
			challenge.AlternateSkills = []byte(alternateSkills.String)
		}

		challenges = append(challenges, challenge)
	}

	return challenges, nil
}

func (s *SQLiteDB) ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error) {
	query := `SELECT id, chase_id, round, description, skill, dc, success_effect, failure_effect,
				alternate_skills, ai_generated, used, created_at
			  FROM chase_challenges WHERE chase_id = ? AND round = ? ORDER BY created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var challenges []*ChaseChallenge
	for rows.Next() {
		challenge := &ChaseChallenge{}
		var alternateSkills sql.NullString
		if err := rows.Scan(
			&challenge.ID, &challenge.ChaseID, &challenge.Round, &challenge.Description, &challenge.Skill, &challenge.DC,
			&challenge.SuccessEffect, &challenge.FailureEffect, &alternateSkills, &challenge.AIGenerated,
			&challenge.Used, &challenge.CreatedAt); err != nil {
			return nil, err
		}

		if alternateSkills.Valid {
			challenge.AlternateSkills = []byte(alternateSkills.String)
		}

		challenges = append(challenges, challenge)
	}

	return challenges, nil
}

func (s *SQLiteDB) UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	query := `UPDATE chase_challenges SET used = ? WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, challenge.Used, challenge.ID)
	return err
}

func (s *SQLiteDB) DeleteChaseChallenge(ctx context.Context, id string) error {
	query := `DELETE FROM chase_challenges WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Chase Tracker - Complication operations

func (s *SQLiteDB) CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	if complication.ID == "" {
		complication.ID = generateUUID()
	}
	complication.CreatedAt = time.Now()

	query := `INSERT INTO chase_complications (id, chase_id, round, description, complication_type, effect,
				save_ability, save_dc, resolved, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		complication.ID, complication.ChaseID, complication.Round, complication.Description, complication.ComplicationType,
		complication.Effect, complication.SaveAbility, complication.SaveDC, complication.Resolved, complication.CreatedAt)
	return err
}

func (s *SQLiteDB) GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error) {
	complication := &ChaseComplication{}
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&complication.ID, &complication.ChaseID, &complication.Round, &complication.Description, &complication.ComplicationType,
		&complication.Effect, &complication.SaveAbility, &complication.SaveDC, &complication.Resolved, &complication.CreatedAt)

	return complication, err
}

func (s *SQLiteDB) ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = ? ORDER BY round, created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

	return complications, nil
}

func (s *SQLiteDB) ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error) {
	query := `SELECT id, chase_id, round, description, complication_type, effect, save_ability, save_dc, resolved, created_at
			  FROM chase_complications WHERE chase_id = ? AND round = ? ORDER BY created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

	return complications, nil
}

func (s *SQLiteDB) UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	query := `UPDATE chase_complications SET resolved = ? WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, complication.Resolved, complication.ID)
	return err
}

func (s *SQLiteDB) DeleteChaseComplication(ctx context.Context, id string) error {
	query := `DELETE FROM chase_complications WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Chase Tracker - Event operations

func (s *SQLiteDB) CreateChaseEvent(ctx context.Context, event *ChaseEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := `INSERT INTO chase_events (id, chase_id, round, participant_name, action, roll, success, effect, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		event.ID, event.ChaseID, event.Round, event.ParticipantName, event.Action,
		event.Roll, event.Success, event.Effect, event.CreatedAt)
	return err
}

func (s *SQLiteDB) ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = ? ORDER BY round, created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

	return events, nil
}

func (s *SQLiteDB) ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error) {
	query := `SELECT id, chase_id, round, participant_name, action, roll, success, effect, created_at
			  FROM chase_events WHERE chase_id = ? AND round = ? ORDER BY created_at`

	rows, err := s.db.QueryContext(ctx, query, chaseID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

	return events, nil
}

func (s *SQLiteDB) DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error {
	query := `DELETE FROM chase_events WHERE chase_id = ?`
	_, err := s.db.ExecContext(ctx, query, chaseID)
	return err
}

// Chase Tracker - Template operations

func (s *SQLiteDB) CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	if template.ID == "" {
		template.ID = generateUUID()
	}
	template.CreatedAt = time.Now()

	query := `INSERT INTO chase_templates (id, name, description, chase_type, terrain, default_starting_distance,
				default_catch_threshold, default_escape_threshold, default_max_rounds, difficulty, challenges,
				complications, is_public, created_by, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		template.ID, template.Name, template.Description, template.ChaseType, template.Terrain,
		template.DefaultStartingDistance, template.DefaultCatchThreshold, template.DefaultEscapeThreshold,
		template.DefaultMaxRounds, template.Difficulty, template.Challenges, template.Complications,
		template.IsPublic, template.CreatedBy, template.CreatedAt)
	return err
}

func (s *SQLiteDB) GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error) {
	template := &ChaseTemplate{}
	var challenges, complications sql.NullString
	query := `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
				default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
				created_by, created_at
			  FROM chase_templates WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&template.ID, &template.Name, &template.Description, &template.ChaseType, &template.Terrain,
		&template.DefaultStartingDistance, &template.DefaultCatchThreshold, &template.DefaultEscapeThreshold,
		&template.DefaultMaxRounds, &template.Difficulty, &challenges, &complications,
		&template.IsPublic, &template.CreatedBy, &template.CreatedAt)

	if err != nil {
		return nil, err
	}

	if challenges.Valid {
		template.Challenges = []byte(challenges.String)
	}
	if complications.Valid {
		template.Complications = []byte(complications.String)
	}

	return template, nil
}

func (s *SQLiteDB) ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error) {
	query := `SELECT id, name, description, chase_type, terrain, default_starting_distance, default_catch_threshold,
				default_escape_threshold, default_max_rounds, difficulty, challenges, complications, is_public,
				created_by, created_at
			  FROM chase_templates WHERE is_public = 1`

	args := []interface{}{}
	if chaseType != nil {
		query += ` AND chase_type = ?`
		args = append(args, *chaseType)
	}
	query += ` ORDER BY name`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var templates []*ChaseTemplate
	for rows.Next() {
		template := &ChaseTemplate{}
		var challenges, complications sql.NullString
		if err := rows.Scan(
			&template.ID, &template.Name, &template.Description, &template.ChaseType, &template.Terrain,
			&template.DefaultStartingDistance, &template.DefaultCatchThreshold, &template.DefaultEscapeThreshold,
			&template.DefaultMaxRounds, &template.Difficulty, &challenges, &complications,
			&template.IsPublic, &template.CreatedBy, &template.CreatedAt); err != nil {
			return nil, err
		}

		if challenges.Valid {
			template.Challenges = []byte(challenges.String)
		}
		if complications.Valid {
			template.Complications = []byte(complications.String)
		}

		templates = append(templates, template)
	}

	return templates, nil
}

func (s *SQLiteDB) UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	query := `UPDATE chase_templates SET name = ?, description = ?, challenges = ?, complications = ?
			  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		template.Name, template.Description, template.Challenges, template.Complications, template.ID)
	return err
}

func (s *SQLiteDB) DeleteChaseTemplate(ctx context.Context, id string) error {
	query := `DELETE FROM chase_templates WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}
