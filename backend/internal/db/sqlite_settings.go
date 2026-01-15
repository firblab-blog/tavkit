package db

import (
	"context"
)

// settingsOps returns a SettingsOperations instance for this database.
func (s *SQLiteDB) settingsOps() *SettingsOperations {
	return NewSettingsOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// TOOL OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateTool(ctx context.Context, tool *Tool) error {
	return s.settingsOps().CreateTool(ctx, tool)
}

func (s *SQLiteDB) GetToolByID(ctx context.Context, id string) (*Tool, error) {
	return s.settingsOps().GetToolByID(ctx, id)
}

func (s *SQLiteDB) ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error) {
	return s.settingsOps().ListToolsByUserID(ctx, userID)
}

func (s *SQLiteDB) UpdateTool(ctx context.Context, tool *Tool) error {
	return s.settingsOps().UpdateTool(ctx, tool)
}

func (s *SQLiteDB) DeleteTool(ctx context.Context, id string) error {
	return s.settingsOps().DeleteTool(ctx, id)
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

func (s *SQLiteDB) GetSettings(ctx context.Context) (*Settings, error) {
	return s.settingsOps().GetSettings(ctx)
}

func (s *SQLiteDB) UpdateSettings(ctx context.Context, settings *Settings) error {
	return s.settingsOps().UpdateSettings(ctx, settings)
}
