package db

import (
	"context"
)

// sessionOps returns the unified SessionOperations for SQLite.
func (s *SQLiteDB) sessionOps() *SessionOperations {
	return NewSessionOperations(s.Executor(), s.QueryBuilder())
}

func (s *SQLiteDB) CreateSession(ctx context.Context, session *Session) error {
	return s.sessionOps().CreateSession(ctx, session)
}

func (s *SQLiteDB) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	return s.sessionOps().GetSessionByID(ctx, id)
}

func (s *SQLiteDB) ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	return s.sessionOps().ListSessionsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error) {
	return s.sessionOps().ListActiveSessionsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateSession(ctx context.Context, session *Session) error {
	return s.sessionOps().UpdateSession(ctx, session)
}

func (s *SQLiteDB) CompleteSession(ctx context.Context, id string, summary *string) error {
	return s.sessionOps().CompleteSession(ctx, id, summary)
}

func (s *SQLiteDB) DeleteSession(ctx context.Context, id string) error {
	return s.sessionOps().DeleteSession(ctx, id)
}

// Session Event operations
func (s *SQLiteDB) CreateSessionEvent(ctx context.Context, event *SessionEvent) error {
	return s.sessionOps().CreateSessionEvent(ctx, event)
}

func (s *SQLiteDB) ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	return s.sessionOps().ListSessionEvents(ctx, sessionID)
}

func (s *SQLiteDB) ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error) {
	return s.sessionOps().ListSessionEventsByRound(ctx, sessionID, round)
}

func (s *SQLiteDB) ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error) {
	return s.sessionOps().ListImportantSessionEvents(ctx, sessionID)
}
