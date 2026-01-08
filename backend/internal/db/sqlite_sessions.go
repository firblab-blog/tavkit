package db

import (
	"context"
	"database/sql"
	"time"
)

func (s *SQLiteDB) CreateSession(ctx context.Context, session *Session) error {
	if session.ID == "" {
		session.ID = generateUUID()
	}
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()

	query := `INSERT INTO sessions
			  (id, user_id, campaign_id, session_type, name, status, started_at,
			   ended_at, duration_minutes, summary, notes, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query,
		session.ID, session.UserID, session.CampaignID, session.SessionType,
		session.Name, session.Status, session.StartedAt, session.EndedAt,
		session.DurationMinutes, session.Summary, session.Notes,
		session.CreatedAt, session.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	session := &Session{}
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions WHERE id = ?`

	var endedAt sql.NullTime
	var durationMinutes sql.NullInt64
	var summary, notes sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

	return session, nil
}

func (s *SQLiteDB) ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions
			  WHERE campaign_id = ?
			  ORDER BY started_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	query := `SELECT id, user_id, campaign_id, session_type, name, status, started_at,
			  ended_at, duration_minutes, summary, notes, created_at, updated_at
			  FROM sessions
			  WHERE campaign_id = ? AND status = 'active'
			  ORDER BY started_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

func (s *SQLiteDB) UpdateSession(ctx context.Context, session *Session) error {
	session.UpdatedAt = time.Now()

	query := `UPDATE sessions
			  SET session_type = ?, name = ?, status = ?, started_at = ?,
			      ended_at = ?, duration_minutes = ?, summary = ?, notes = ?,
			      updated_at = ?
			  WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		session.SessionType, session.Name, session.Status, session.StartedAt,
		session.EndedAt, session.DurationMinutes, session.Summary, session.Notes,
		session.UpdatedAt, session.ID)
	return err
}

func (s *SQLiteDB) CompleteSession(ctx context.Context, id string, summary *string) error {
	now := time.Now()

	// Get the session to calculate duration
	session, err := s.GetSessionByID(ctx, id)
	if err != nil {
		return err
	}

	durationMinutes := int(now.Sub(session.StartedAt).Minutes())

	query := `UPDATE sessions
			  SET status = 'completed',
			      ended_at = ?,
			      duration_minutes = ?,
			      summary = ?,
			      updated_at = ?
			  WHERE id = ?`

	_, err = s.db.ExecContext(ctx, query, now, durationMinutes, summary, now, id)
	return err
}

func (s *SQLiteDB) DeleteSession(ctx context.Context, id string) error {
	query := `DELETE FROM sessions WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Session Event operations
func (s *SQLiteDB) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := `INSERT INTO session_events
			  (id, session_id, event_type, round, timestamp, actor, action,
			   details, outcome, important, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query,
		event.ID, event.SessionID, event.EventType, event.Round,
		event.Timestamp, event.Actor, event.Action, event.Details,
		event.Outcome, event.Important, event.CreatedAt)
	return err
}

func (s *SQLiteDB) ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = ?
			  ORDER BY timestamp ASC`

	rows, err := s.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var round sql.NullInt64
		var actor, details, outcome sql.NullString

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
		if details.Valid {
			event.Details = []byte(details.String)
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}

func (s *SQLiteDB) ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = ? AND round = ?
			  ORDER BY timestamp ASC`

	rows, err := s.db.QueryContext(ctx, query, sessionID, round)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var roundVal sql.NullInt64
		var actor, details, outcome sql.NullString

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
		if details.Valid {
			event.Details = []byte(details.String)
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}

func (s *SQLiteDB) ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	query := `SELECT id, session_id, event_type, round, timestamp, actor, action,
			  details, outcome, important, created_at
			  FROM session_events
			  WHERE session_id = ? AND important = 1
			  ORDER BY timestamp ASC`

	rows, err := s.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var events []*SessionEvent
	for rows.Next() {
		event := &SessionEvent{}
		var round sql.NullInt64
		var actor, details, outcome sql.NullString

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
		if details.Valid {
			event.Details = []byte(details.String)
		}
		if outcome.Valid {
			event.Outcome = &outcome.String
		}

		events = append(events, event)
	}

	return events, rows.Err()
}
