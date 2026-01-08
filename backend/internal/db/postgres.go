// Package db provides database interfaces and implementations.
package db

import (
	"context"
	"fmt"
	"time"

	"tavkit/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresDB implements Database interface for PostgreSQL
type PostgresDB struct {
	pool *pgxpool.Pool
	cfg  config.DatabaseConfig
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(cfg config.DatabaseConfig) (*PostgresDB, error) {
	connString := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	poolConfig, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	// #nosec G115 - config values are validated at startup
	poolConfig.MaxConns = int32(cfg.MaxConnections)
	// #nosec G115 - config values are validated at startup
	poolConfig.MinConns = int32(cfg.MaxIdleConns)

	// Connection pool tuning for PostgreSQL
	poolConfig.MaxConnLifetime = 1 * time.Hour     // Close connections after 1 hour to avoid stale connections
	poolConfig.MaxConnIdleTime = 30 * time.Minute  // Close idle connections after 30 minutes
	poolConfig.HealthCheckPeriod = 1 * time.Minute // Check connection health every minute

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	db := &PostgresDB{
		pool: pool,
		cfg:  cfg,
	}

	// Test connection
	if err := db.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func (db *PostgresDB) Close() error {
	db.pool.Close()
	return nil
}

// Ping checks database connectivity
func (db *PostgresDB) Ping(ctx context.Context) error {
	return db.pool.Ping(ctx)
}

// Migrate runs database migrations using golang-migrate with embedded SQL files
func (db *PostgresDB) Migrate() error {
	return RunPostgresMigrations(db.pool)
}

// Wrapper functions to support generic helpers

// GetChaseByIDWithInterface wraps GetChaseByID to return an interface with GetUserID method
func (db *PostgresDB) GetChaseByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error) {
	return db.GetChaseByID(ctx, id)
}

// GetCombatEncounterByIDWithInterface wraps GetCombatEncounterByID to return an interface with GetSessionID method
func (db *PostgresDB) GetCombatEncounterByIDWithInterface(ctx context.Context, id string) (interface{ GetSessionID() string }, error) {
	return db.GetCombatEncounterByID(ctx, id)
}

// GetSessionByIDWithInterface wraps GetSessionByID to return an interface with GetUserID method
func (db *PostgresDB) GetSessionByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error) {
	return db.GetSessionByID(ctx, id)
}
