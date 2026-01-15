package db

import (
	"context"
)

// settingsOps returns a SettingsOperations instance for this database.
func (db *PostgresDB) settingsOps() *SettingsOperations {
	return NewSettingsOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

func (db *PostgresDB) GetSettings(ctx context.Context) (*Settings, error) {
	return db.settingsOps().GetSettings(ctx)
}

func (db *PostgresDB) UpdateSettings(ctx context.Context, settings *Settings) error {
	return db.settingsOps().UpdateSettings(ctx, settings)
}

// ============================================================================
// TOOL OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateTool(ctx context.Context, tool *Tool) error {
	return db.settingsOps().CreateTool(ctx, tool)
}

func (db *PostgresDB) GetToolByID(ctx context.Context, id string) (*Tool, error) {
	return db.settingsOps().GetToolByID(ctx, id)
}

func (db *PostgresDB) ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error) {
	return db.settingsOps().ListToolsByUserID(ctx, userID)
}

func (db *PostgresDB) UpdateTool(ctx context.Context, tool *Tool) error {
	return db.settingsOps().UpdateTool(ctx, tool)
}

func (db *PostgresDB) DeleteTool(ctx context.Context, id string) error {
	return db.settingsOps().DeleteTool(ctx, id)
}
