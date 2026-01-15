package db

import (
	"context"
	"database/sql"
	"time"
)

// SessionOperations provides unified session database operations
// that work with both SQLite and PostgreSQL through the Executor interface.
type SessionOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewSessionOperations creates a new SessionOperations with the given executor and query builder.
func NewSessionOperations(exec Executor, qb *QueryBuilder) *SessionOperations {
	return &SessionOperations{exec: exec, qb: qb}
}

// Session columns for queries
var sessionColumns = []string{
	"id", "user_id", "campaign_id", "session_type", "name", "status", "started_at",
	"ended_at", "duration_minutes", "summary", "notes", "created_at", "updated_at",
}

// SessionEvent columns for queries
var sessionEventColumns = []string{
	"id", "session_id", "event_type", "round", "timestamp", "actor", "action",
	"details", "outcome", "important", "created_at",
}

// scanSession scans a row into a Session struct, handling nullable fields.
func scanSession(row Row) (*Session, error) {
	session := &Session{}
	var endedAt sql.NullTime
	var durationMinutes sql.NullInt64
	var summary, notes sql.NullString

	err := row.Scan(
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

// scanSessionFromRows scans a single session from a Rows iterator.
func scanSessionFromRows(rows Rows) (*Session, error) {
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

	return session, nil
}

// scanSessionEvent scans a row into a SessionEvent struct.
func scanSessionEventFromRows(rows Rows) (*SessionEvent, error) {
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

	return event, nil
}

// CreateSession inserts a new session into the database.
func (ops *SessionOperations) CreateSession(ctx context.Context, session *Session) error {
	if session.ID == "" {
		session.ID = generateUUID()
	}
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()

	query := ops.qb.BuildInsert("sessions", sessionColumns)
	_, err := ops.exec.Exec(ctx, query,
		session.ID, session.UserID, session.CampaignID, session.SessionType,
		session.Name, session.Status, session.StartedAt, session.EndedAt,
		session.DurationMinutes, session.Summary, session.Notes,
		session.CreatedAt, session.UpdatedAt)
	return err
}

// GetSessionByID retrieves a session by its ID.
func (ops *SessionOperations) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	query := ops.qb.BuildSelect("sessions", sessionColumns, "id")
	row := ops.exec.QueryRow(ctx, query, id)
	return scanSession(row)
}

// listSessionsWithQuery is a helper that runs a query and returns sessions.
func (ops *SessionOperations) listSessionsWithQuery(ctx context.Context, query string, args ...interface{}) ([]*Session, error) {
	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var sessions []*Session
	for rows.Next() {
		session, err := scanSessionFromRows(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

// ListSessionsByCampaignID retrieves all sessions for a campaign.
func (ops *SessionOperations) ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	query := ops.qb.BuildSelect("sessions", sessionColumns, "campaign_id") +
		ops.qb.AppendOrderBy("started_at", true)
	return ops.listSessionsWithQuery(ctx, query, campaignID)
}

// ListActiveSessionsByCampaignID retrieves active sessions for a campaign.
func (ops *SessionOperations) ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	// Build query with campaign_id = $1 AND status = 'active'
	cols := "id, user_id, campaign_id, session_type, name, status, started_at, ended_at, duration_minutes, summary, notes, created_at, updated_at"
	query := "SELECT " + cols + " FROM sessions WHERE campaign_id = " + ops.qb.Placeholder(1) +
		" AND status = 'active'" + ops.qb.AppendOrderBy("started_at", true)
	return ops.listSessionsWithQuery(ctx, query, campaignID)
}

// UpdateSession updates an existing session.
func (ops *SessionOperations) UpdateSession(ctx context.Context, session *Session) error {
	session.UpdatedAt = time.Now()

	setCols := []string{"session_type", "name", "status", "started_at", "ended_at",
		"duration_minutes", "summary", "notes", "updated_at"}
	query := ops.qb.BuildUpdate("sessions", setCols, "id")

	_, err := ops.exec.Exec(ctx, query,
		session.SessionType, session.Name, session.Status, session.StartedAt,
		session.EndedAt, session.DurationMinutes, session.Summary, session.Notes,
		session.UpdatedAt, session.ID)
	return err
}

// CompleteSession marks a session as completed.
func (ops *SessionOperations) CompleteSession(ctx context.Context, id string, summary *string) error {
	now := time.Now()

	// Get the session to calculate duration
	session, err := ops.GetSessionByID(ctx, id)
	if err != nil {
		return err
	}

	durationMinutes := int(now.Sub(session.StartedAt).Minutes())

	// Build update query: SET status, ended_at, duration_minutes, summary, updated_at WHERE id
	query := "UPDATE sessions SET status = 'completed', ended_at = " + ops.qb.Placeholder(1) +
		", duration_minutes = " + ops.qb.Placeholder(2) +
		", summary = " + ops.qb.Placeholder(3) +
		", updated_at = " + ops.qb.Placeholder(4) +
		" WHERE id = " + ops.qb.Placeholder(5)

	_, err = ops.exec.Exec(ctx, query, now, durationMinutes, summary, now, id)
	return err
}

// DeleteSession removes a session by ID.
func (ops *SessionOperations) DeleteSession(ctx context.Context, id string) error {
	query := ops.qb.BuildDelete("sessions", "id")
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Session Event Operations
// =============================================================================

// CreateSessionEvent inserts a new session event.
func (ops *SessionOperations) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	if event.ID == "" {
		event.ID = generateUUID()
	}
	event.CreatedAt = time.Now()

	query := ops.qb.BuildInsert("session_events", sessionEventColumns)
	_, err := ops.exec.Exec(ctx, query,
		event.ID, event.SessionID, event.EventType, event.Round,
		event.Timestamp, event.Actor, event.Action, event.Details,
		event.Outcome, event.Important, event.CreatedAt)
	return err
}

// listSessionEventsWithQuery is a helper that runs a query and returns events.
func (ops *SessionOperations) listSessionEventsWithQuery(ctx context.Context, query string, args ...interface{}) ([]*SessionEvent, error) {
	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var events []*SessionEvent
	for rows.Next() {
		event, err := scanSessionEventFromRows(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

// ListSessionEvents retrieves all events for a session.
func (ops *SessionOperations) ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	query := ops.qb.BuildSelect("session_events", sessionEventColumns, "session_id") +
		ops.qb.AppendOrderBy("timestamp", false)
	return ops.listSessionEventsWithQuery(ctx, query, sessionID)
}

// ListSessionEventsByRound retrieves events for a specific round.
func (ops *SessionOperations) ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error) {
	cols := "id, session_id, event_type, round, timestamp, actor, action, details, outcome, important, created_at"
	query := "SELECT " + cols + " FROM session_events WHERE session_id = " + ops.qb.Placeholder(1) +
		" AND round = " + ops.qb.Placeholder(2) + ops.qb.AppendOrderBy("timestamp", false)
	return ops.listSessionEventsWithQuery(ctx, query, sessionID, round)
}

// ListImportantSessionEvents retrieves important events for a session.
func (ops *SessionOperations) ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	cols := "id, session_id, event_type, round, timestamp, actor, action, details, outcome, important, created_at"
	// Use different boolean syntax based on placeholder style (SQLite uses 1, PostgreSQL uses true)
	importantVal := "1"
	if ops.qb.style == PlaceholderDollar {
		importantVal = "true"
	}
	query := "SELECT " + cols + " FROM session_events WHERE session_id = " + ops.qb.Placeholder(1) +
		" AND important = " + importantVal + ops.qb.AppendOrderBy("timestamp", false)
	return ops.listSessionEventsWithQuery(ctx, query, sessionID)
}
