package db

import (
	"context"
)

// sessionOps returns the unified SessionOperations for PostgreSQL.
func (db *PostgresDB) sessionOps() *SessionOperations {
	return NewSessionOperations(db.Executor(), db.QueryBuilder())
}

func (db *PostgresDB) CreateSession(ctx context.Context, session *Session) error {
	return db.sessionOps().CreateSession(ctx, session)
}

func (db *PostgresDB) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	return db.sessionOps().GetSessionByID(ctx, id)
}

func (db *PostgresDB) ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	return db.sessionOps().ListSessionsByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	return db.sessionOps().ListActiveSessionsByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) UpdateSession(ctx context.Context, session *Session) error {
	return db.sessionOps().UpdateSession(ctx, session)
}

func (db *PostgresDB) CompleteSession(ctx context.Context, id string, summary *string) error {
	return db.sessionOps().CompleteSession(ctx, id, summary)
}

func (db *PostgresDB) DeleteSession(ctx context.Context, id string) error {
	return db.sessionOps().DeleteSession(ctx, id)
}

// Session Event operations
func (db *PostgresDB) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	return db.sessionOps().CreateSessionEvent(ctx, event)
}

func (db *PostgresDB) ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	return db.sessionOps().ListSessionEvents(ctx, sessionID)
}

func (db *PostgresDB) ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error) {
	return db.sessionOps().ListSessionEventsByRound(ctx, sessionID, round)
}

func (db *PostgresDB) ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	return db.sessionOps().ListImportantSessionEvents(ctx, sessionID)
}
