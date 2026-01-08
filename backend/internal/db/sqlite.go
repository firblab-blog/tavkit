package db

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

// SQLiteDB implements Database interface for SQLite
type SQLiteDB struct {
	db   *sql.DB
	path string
}

// NewSQLiteDB creates a new SQLite database connection
func NewSQLiteDB(path string) (*SQLiteDB, error) {
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// SQLite connection pool tuning
	// SQLite only supports a single writer at a time, so we limit connections
	db.SetMaxOpenConns(1)    // Only one connection to avoid SQLITE_BUSY errors
	db.SetMaxIdleConns(1)    // Keep one idle connection for reuse
	db.SetConnMaxLifetime(0) // No timeout - connection stays open forever

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &SQLiteDB{
		db:   db,
		path: path,
	}, nil
}

// Close closes the database connection
func (s *SQLiteDB) Close() error {
	return s.db.Close()
}

// DB returns the underlying *sql.DB for direct SQL operations
func (s *SQLiteDB) DB() *sql.DB {
	return s.db
}

// Migrate runs database migrations using golang-migrate with embedded SQL files
func (s *SQLiteDB) Migrate() error {
	return RunSQLiteMigrations(s.db, s.path)
}

// Ping checks if the database is reachable
func (s *SQLiteDB) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

// Helper function to generate UUIDs
func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// Wrapper functions to support generic helpers

// GetChaseByIDWithInterface wraps GetChaseByID to return an interface with GetUserID method
func (s *SQLiteDB) GetChaseByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error) {
	return s.GetChaseByID(ctx, id)
}

// GetCombatEncounterByIDWithInterface wraps GetCombatEncounterByID to return an interface with GetSessionID method
func (s *SQLiteDB) GetCombatEncounterByIDWithInterface(ctx context.Context, id string) (interface{ GetSessionID() string }, error) {
	return s.GetCombatEncounterByID(ctx, id)
}

// GetSessionByIDWithInterface wraps GetSessionByID to return an interface with GetUserID method
func (s *SQLiteDB) GetSessionByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error) {
	return s.GetSessionByID(ctx, id)
}
