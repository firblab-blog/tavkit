package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// parseTimestamp tries to parse a timestamp string from various formats
// This is needed because SQLite stores timestamps as TEXT strings.
func parseTimestamp(s string) time.Time {
	if s == "" {
		return time.Time{}
	}

	// Try common SQLite timestamp formats
	// The format "2006-01-02 15:04:05.999999999-07:00" handles: 2026-01-14 21:10:49.068390796+00:00
	formats := []string{
		"2006-01-02 15:04:05.999999999-07:00", // SQLite with nano + tz offset (space separator)
		"2006-01-02 15:04:05.999999-07:00",    // SQLite with micro + tz offset
		"2006-01-02 15:04:05-07:00",           // SQLite with tz offset
		time.RFC3339Nano,                      // 2006-01-02T15:04:05.999999999Z07:00
		time.RFC3339,                          // 2006-01-02T15:04:05Z07:00
		"2006-01-02 15:04:05",                 // SQLite default (no tz)
		"2006-01-02T15:04:05",                 // ISO without tz
	}

	for _, format := range formats {
		if t, err := time.Parse(format, s); err == nil {
			return t
		}
	}

	// If all parsing fails, return zero time
	return time.Time{}
}

// parseTimestampInterface handles both PostgreSQL (time.Time) and SQLite (string) timestamps
func parseTimestampInterface(v interface{}) time.Time {
	if v == nil {
		return time.Time{}
	}

	switch t := v.(type) {
	case time.Time:
		return t
	case string:
		return parseTimestamp(t)
	case []byte:
		return parseTimestamp(string(t))
	default:
		return time.Time{}
	}
}

// UserContextOperations provides unified user context operations.
type UserContextOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewUserContextOperations creates a new UserContextOperations.
func NewUserContextOperations(exec Executor, qb *QueryBuilder) *UserContextOperations {
	return &UserContextOperations{exec: exec, qb: qb}
}

// CreateUserContext creates a new user context record.
func (ops *UserContextOperations) CreateUserContext(ctx context.Context, uc *UserContext) error {
	uc.ID = generateUUID()
	uc.CreatedAt = time.Now()
	uc.UpdatedAt = time.Now()

	query := `INSERT INTO user_context (id, user_id, last_context_type, last_campaign_id, last_character_id,
		has_completed_onboarding, default_game_system, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(9) + `)`

	_, err := ops.exec.Exec(ctx, query,
		uc.ID, uc.UserID, uc.LastContextType, uc.LastCampaignID, uc.LastCharacterID,
		uc.HasCompletedOnboarding, uc.DefaultGameSystem, uc.CreatedAt, uc.UpdatedAt)
	return err
}

// GetUserContextByUserID retrieves user context by user ID.
func (ops *UserContextOperations) GetUserContextByUserID(ctx context.Context, userID string) (*UserContext, error) {
	uc := &UserContext{}
	// Use appropriate empty JSON default based on database
	emptyJSON := ops.qb.EmptyJSONObject()
	query := `SELECT id, user_id, last_context_type, last_campaign_id, last_character_id,
		has_completed_onboarding, default_game_system, COALESCE(ui_settings, ` + emptyJSON + `), created_at, updated_at
		FROM user_context WHERE user_id = ` + ops.qb.Placeholder(1)

	row := ops.exec.QueryRow(ctx, query, userID)

	// Handle both SQLite (strings) and PostgreSQL (native types)
	var uiSettingsStr sql.NullString
	var createdAt, updatedAt interface{}
	err := row.Scan(&uc.ID, &uc.UserID, &uc.LastContextType, &uc.LastCampaignID, &uc.LastCharacterID,
		&uc.HasCompletedOnboarding, &uc.DefaultGameSystem, &uiSettingsStr, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user context not found for user: %s", userID)
		}
		return nil, fmt.Errorf("failed to get user context: %w", err)
	}

	// Convert string to json.RawMessage
	if uiSettingsStr.Valid && uiSettingsStr.String != "" {
		uc.UISettings = []byte(uiSettingsStr.String)
	} else {
		uc.UISettings = []byte("{}")
	}

	// Parse timestamps - handle both PostgreSQL (time.Time) and SQLite (string)
	uc.CreatedAt = parseTimestampInterface(createdAt)
	uc.UpdatedAt = parseTimestampInterface(updatedAt)

	return uc, nil
}

// UpdateUserContext updates an existing user context.
func (ops *UserContextOperations) UpdateUserContext(ctx context.Context, uc *UserContext) error {
	uc.UpdatedAt = time.Now()
	query := `UPDATE user_context
		SET last_context_type = ` + ops.qb.Placeholder(1) + `, last_campaign_id = ` + ops.qb.Placeholder(2) + `,
		last_character_id = ` + ops.qb.Placeholder(3) + `, has_completed_onboarding = ` + ops.qb.Placeholder(4) + `,
		default_game_system = ` + ops.qb.Placeholder(5) + `, updated_at = ` + ops.qb.Placeholder(6) + `
		WHERE user_id = ` + ops.qb.Placeholder(7)

	result, err := ops.exec.Exec(ctx, query,
		uc.LastContextType, uc.LastCampaignID, uc.LastCharacterID,
		uc.HasCompletedOnboarding, uc.DefaultGameSystem, uc.UpdatedAt, uc.UserID)
	if err != nil {
		return fmt.Errorf("failed to update user context: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("user context not found for user: %s", uc.UserID)
	}
	return nil
}

// UpsertUserContext creates or updates user context.
func (ops *UserContextOperations) UpsertUserContext(ctx context.Context, uc *UserContext) error {
	// Try update first
	err := ops.UpdateUserContext(ctx, uc)
	if err == nil {
		return nil
	}

	// If update failed (context doesn't exist), try create
	return ops.CreateUserContext(ctx, uc)
}

// DeleteUserContext deletes user context by user ID.
func (ops *UserContextOperations) DeleteUserContext(ctx context.Context, userID string) error {
	query := `DELETE FROM user_context WHERE user_id = ` + ops.qb.Placeholder(1)
	result, err := ops.exec.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user context: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("user context not found for user: %s", userID)
	}
	return nil
}

// MarkOnboardingComplete marks onboarding as complete for a user.
func (ops *UserContextOperations) MarkOnboardingComplete(ctx context.Context, userID string) error {
	now := time.Now()
	query := `UPDATE user_context
		SET has_completed_onboarding = ` + ops.qb.BoolLiteral(true) + `, updated_at = ` + ops.qb.Placeholder(1) + `
		WHERE user_id = ` + ops.qb.Placeholder(2)

	result, err := ops.exec.Exec(ctx, query, now, userID)
	if err != nil {
		return fmt.Errorf("failed to mark onboarding complete: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("user context not found for user: %s", userID)
	}
	return nil
}

// GetOrCreateUserContext gets existing context or creates a default one.
func (ops *UserContextOperations) GetOrCreateUserContext(ctx context.Context, userID string) (*UserContext, error) {
	uc, err := ops.GetUserContextByUserID(ctx, userID)
	if err == nil {
		return uc, nil
	}

	// Only create if context doesn't exist (error contains "not found")
	// Other errors should be propagated
	if !strings.Contains(err.Error(), "not found") {
		return nil, err
	}

	// Create default context
	newContext := &UserContext{
		UserID:                 userID,
		HasCompletedOnboarding: false,
	}
	if err := ops.CreateUserContext(ctx, newContext); err != nil {
		// Handle race condition: if another request just created the context,
		// try to fetch it again
		if strings.Contains(err.Error(), "UNIQUE constraint") ||
			strings.Contains(err.Error(), "duplicate key") ||
			strings.Contains(err.Error(), "unique_violation") {
			// Retry the get
			return ops.GetUserContextByUserID(ctx, userID)
		}
		return nil, fmt.Errorf("failed to create default user context: %w", err)
	}
	return newContext, nil
}

// UpdateUserUISettings updates only the UI settings for a user.
func (ops *UserContextOperations) UpdateUserUISettings(ctx context.Context, userID string, uiSettings []byte) error {
	now := time.Now()
	query := `UPDATE user_context
		SET ui_settings = ` + ops.qb.Placeholder(1) + `, updated_at = ` + ops.qb.Placeholder(2) + `
		WHERE user_id = ` + ops.qb.Placeholder(3)

	result, err := ops.exec.Exec(ctx, query, uiSettings, now, userID)
	if err != nil {
		return fmt.Errorf("failed to update UI settings: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rows == 0 {
		// User context doesn't exist, create it with ui_settings
		id := generateUUID()
		createQuery := `INSERT INTO user_context (id, user_id, ui_settings, has_completed_onboarding, created_at, updated_at)
			VALUES (` + ops.qb.Placeholders(6) + `)`
		_, err = ops.exec.Exec(ctx, createQuery, id, userID, uiSettings, false, now, now)
		if err != nil {
			return fmt.Errorf("failed to create user context with UI settings: %w", err)
		}
	}
	return nil
}

// GetUserUISettings retrieves only the UI settings for a user.
func (ops *UserContextOperations) GetUserUISettings(ctx context.Context, userID string) ([]byte, error) {
	// SQLite returns JSON as TEXT (string), so we scan into sql.NullString first
	var uiSettingsStr sql.NullString
	emptyJSON := ops.qb.EmptyJSONObject()
	query := `SELECT COALESCE(ui_settings, ` + emptyJSON + `) FROM user_context WHERE user_id = ` + ops.qb.Placeholder(1)

	row := ops.exec.QueryRow(ctx, query, userID)
	err := row.Scan(&uiSettingsStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return []byte("{}"), nil // Return empty object if no context exists
		}
		return nil, fmt.Errorf("failed to get UI settings: %w", err)
	}

	// Convert string to []byte
	if uiSettingsStr.Valid && uiSettingsStr.String != "" {
		return []byte(uiSettingsStr.String), nil
	}
	return []byte("{}"), nil
}
