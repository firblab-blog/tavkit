package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Session Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateSession(ctx context.Context, session *Session) error {
	if session.ID == "" {
		session.ID = generateUUID()
	}
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()

	query := `INSERT INTO sessions
			  (id, user_id, campaign_id, session_type, name, status, started_at,
			   ended_at, duration_minutes, summary, notes, created_at, updated_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := db.pool.Exec(ctx, query,
		session.ID, session.UserID, session.CampaignID, session.SessionType,
		session.Name, session.Status, session.StartedAt, session.EndedAt,
		session.DurationMinutes, session.Summary, session.Notes,
		session.CreatedAt, session.UpdatedAt)
	return err
}

func (db *PostgresDB) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	session := &Session{}
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions WHERE id = $1`

	var endedAt sql.NullTime
	var durationMinutes sql.NullInt64
	var summary, notes sql.NullString

	err := db.pool.QueryRow(ctx, query, id).Scan(
		&session.ID, &session.UserID, &session.CampaignID, &session.SessionType,
		&session.Name, &session.Status, &session.StartedAt, &endedAt,
		&durationMinutes, &summary, &notes,
		&session.CreatedAt, &session.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	if endedAt.Valid {
		session.EndedAt = &endedAt.Time
	}
	if durationMinutes.Valid {
		dur := int(durationMinutes.Int64)
		session.DurationMinutes = &dur
	}
	if summary.Valid {
		session.Summary = &summary.String
	}
	if notes.Valid {
		session.Notes = &notes.String
	}

	return session, nil
}

func (db *PostgresDB) ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions
			  WHERE campaign_id = $1
			  ORDER BY started_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*Session
	for rows.Next() {
		session := &Session{}
		var endedAt sql.NullTime
		var durationMinutes sql.NullInt64
		var summary, notes sql.NullString

		err := rows.Scan(
			&session.ID, &session.UserID, &session.CampaignID, &session.SessionType,
			&session.Name, &session.Status, &session.StartedAt, &endedAt,
			&durationMinutes, &summary, &notes,
			&session.CreatedAt, &session.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if endedAt.Valid {
			session.EndedAt = &endedAt.Time
		}
		if durationMinutes.Valid {
			dur := int(durationMinutes.Int64)
			session.DurationMinutes = &dur
		}
		if summary.Valid {
			session.Summary = &summary.String
		}
		if notes.Valid {
			session.Notes = &notes.String
		}

		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

func (db *PostgresDB) ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions
			  WHERE campaign_id = $1 AND status = 'active'
			  ORDER BY started_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*Session
	for rows.Next() {
		session := &Session{}
		var endedAt sql.NullTime
		var durationMinutes sql.NullInt64
		var summary, notes sql.NullString

		err := rows.Scan(
			&session.ID, &session.UserID, &session.CampaignID, &session.SessionType,
			&session.Name, &session.Status, &session.StartedAt, &endedAt,
			&durationMinutes, &summary, &notes,
			&session.CreatedAt, &session.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if endedAt.Valid {
			session.EndedAt = &endedAt.Time
		}
		if durationMinutes.Valid {
			dur := int(durationMinutes.Int64)
			session.DurationMinutes = &dur
		}
		if summary.Valid {
			session.Summary = &summary.String
		}
		if notes.Valid {
			session.Notes = &notes.String
		}

		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

func (db *PostgresDB) UpdateSession(ctx context.Context, session *Session) error {
	session.UpdatedAt = time.Now()

	query := `UPDATE sessions
			  SET session_type = $1, name = $2, status = $3, started_at = $4,
			      ended_at = $5, duration_minutes = $6, summary = $7, notes = $8,
			      updated_at = $9
			  WHERE id = $10`

	_, err := db.pool.Exec(ctx, query,
		session.SessionType, session.Name, session.Status, session.StartedAt,
		session.EndedAt, session.DurationMinutes, session.Summary, session.Notes,
		session.UpdatedAt, session.ID)
	return err
}

func (db *PostgresDB) CompleteSession(ctx context.Context, id string, summary *string) error {
	now := time.Now()

	// Get the session to calculate duration
	session, err := db.GetSessionByID(ctx, id)
	if err != nil {
		return err
	}

	durationMinutes := int(now.Sub(session.StartedAt).Minutes())

	query := `UPDATE sessions
			  SET status = 'completed',
			      ended_at = $1,
			      duration_minutes = $2,
			      summary = $3,
			      updated_at = $4
			  WHERE id = $5`

	_, err = db.pool.Exec(ctx, query, now, durationMinutes, summary, now, id)
	return err
}

func (db *PostgresDB) DeleteSession(ctx context.Context, id string) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Session Event Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := `INSERT INTO session_events
			  (id, session_id, event_type, round, timestamp, actor, action,
			   details, outcome, important, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := db.pool.Exec(ctx, query,
		event.ID, event.SessionID, event.EventType, event.Round,
		event.Timestamp, event.Actor, event.Action, event.Details,
		event.Outcome, event.Important, event.CreatedAt)
	return err
}

func (db *PostgresDB) ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = $1
			  ORDER BY timestamp ASC`

	rows, err := db.pool.Query(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var round sql.NullInt64
		var actor, outcome sql.NullString
		var details []byte

		err := rows.Scan(
			&event.ID, &event.SessionID, &event.EventType, &round,
			&event.Timestamp, &actor, &event.Action, &details,
			&outcome, &event.Important, &event.CreatedAt)
		if err != nil {
			return nil, err
		}

		if round.Valid {
			r := int(round.Int64)
			event.Round = &r
		}
		if actor.Valid {
			event.Actor = &actor.String
		}
		if len(details) > 0 {
			event.Details = details
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}

func (db *PostgresDB) ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = $1 AND round = $2
			  ORDER BY timestamp ASC`

	rows, err := db.pool.Query(ctx, query, sessionID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var roundVal sql.NullInt64
		var actor, outcome sql.NullString
		var details []byte

		err := rows.Scan(
			&event.ID, &event.SessionID, &event.EventType, &roundVal,
			&event.Timestamp, &actor, &event.Action, &details,
			&outcome, &event.Important, &event.CreatedAt)
		if err != nil {
			return nil, err
		}

		if roundVal.Valid {
			r := int(roundVal.Int64)
			event.Round = &r
		}
		if actor.Valid {
			event.Actor = &actor.String
		}
		if len(details) > 0 {
			event.Details = details
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}

func (db *PostgresDB) ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = $1 AND important = true
			  ORDER BY timestamp ASC`

	rows, err := db.pool.Query(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var round sql.NullInt64
		var actor, outcome sql.NullString
		var details []byte

		err := rows.Scan(
			&event.ID, &event.SessionID, &event.EventType, &round,
			&event.Timestamp, &actor, &event.Action, &details,
			&outcome, &event.Important, &event.CreatedAt)
		if err != nil {
			return nil, err
		}

		if round.Valid {
			r := int(round.Int64)
			event.Round = &r
		}
		if actor.Valid {
			event.Actor = &actor.String
		}
		if len(details) > 0 {
			event.Details = details
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}
