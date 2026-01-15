package db

import (
	"context"
)

// userContextOps returns the unified UserContextOperations for SQLite.
func (s *SQLiteDB) userContextOps() *UserContextOperations {
	return NewUserContextOperations(s.Executor(), s.QueryBuilder())
}

// =============================================================================
// User Context Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateUserContext(ctx context.Context, uc *UserContext) error {
	return s.userContextOps().CreateUserContext(ctx, uc)
}

func (s *SQLiteDB) GetUserContextByUserID(ctx context.Context, userID string) (*UserContext, error) {
	return s.userContextOps().GetUserContextByUserID(ctx, userID)
}

func (s *SQLiteDB) UpdateUserContext(ctx context.Context, uc *UserContext) error {
	return s.userContextOps().UpdateUserContext(ctx, uc)
}

func (s *SQLiteDB) UpsertUserContext(ctx context.Context, uc *UserContext) error {
	return s.userContextOps().UpsertUserContext(ctx, uc)
}

func (s *SQLiteDB) DeleteUserContext(ctx context.Context, userID string) error {
	return s.userContextOps().DeleteUserContext(ctx, userID)
}

func (s *SQLiteDB) MarkOnboardingComplete(ctx context.Context, userID string) error {
	return s.userContextOps().MarkOnboardingComplete(ctx, userID)
}

func (s *SQLiteDB) GetOrCreateUserContext(ctx context.Context, userID string) (*UserContext, error) {
	return s.userContextOps().GetOrCreateUserContext(ctx, userID)
}

func (s *SQLiteDB) UpdateUserUISettings(ctx context.Context, userID string, uiSettings []byte) error {
	return s.userContextOps().UpdateUserUISettings(ctx, userID, uiSettings)
}

func (s *SQLiteDB) GetUserUISettings(ctx context.Context, userID string) ([]byte, error) {
	return s.userContextOps().GetUserUISettings(ctx, userID)
}
