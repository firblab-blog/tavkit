package db

import (
	"context"
)

// userContextOps returns the unified UserContextOperations for PostgreSQL.
func (db *PostgresDB) userContextOps() *UserContextOperations {
	return NewUserContextOperations(db.Executor(), db.QueryBuilder())
}

// =============================================================================
// User Context Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateUserContext(ctx context.Context, uc *UserContext) error {
	return db.userContextOps().CreateUserContext(ctx, uc)
}

func (db *PostgresDB) GetUserContextByUserID(ctx context.Context, userID string) (*UserContext, error) {
	return db.userContextOps().GetUserContextByUserID(ctx, userID)
}

func (db *PostgresDB) UpdateUserContext(ctx context.Context, uc *UserContext) error {
	return db.userContextOps().UpdateUserContext(ctx, uc)
}

func (db *PostgresDB) UpsertUserContext(ctx context.Context, uc *UserContext) error {
	return db.userContextOps().UpsertUserContext(ctx, uc)
}

func (db *PostgresDB) DeleteUserContext(ctx context.Context, userID string) error {
	return db.userContextOps().DeleteUserContext(ctx, userID)
}

func (db *PostgresDB) MarkOnboardingComplete(ctx context.Context, userID string) error {
	return db.userContextOps().MarkOnboardingComplete(ctx, userID)
}

func (db *PostgresDB) GetOrCreateUserContext(ctx context.Context, userID string) (*UserContext, error) {
	return db.userContextOps().GetOrCreateUserContext(ctx, userID)
}

func (db *PostgresDB) UpdateUserUISettings(ctx context.Context, userID string, uiSettings []byte) error {
	return db.userContextOps().UpdateUserUISettings(ctx, userID, uiSettings)
}

func (db *PostgresDB) GetUserUISettings(ctx context.Context, userID string) ([]byte, error) {
	return db.userContextOps().GetUserUISettings(ctx, userID)
}
