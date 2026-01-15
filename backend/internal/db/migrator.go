package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
)

//go:embed migrations/sqlite/*.sql
var sqliteMigrations embed.FS

//go:embed migrations/postgres/*.sql
var postgresMigrations embed.FS

// Migration represents a database migration
type Migration struct {
	Version     int
	Description string
	UpSQL       string
}

// MigrationRecord represents a record in the schema_migrations table
type MigrationRecord struct {
	Version   int
	AppliedAt time.Time
}

// MigratorSQLite handles SQLite database migrations
type MigratorSQLite struct {
	db *sql.DB
}

// MigratorPostgres handles PostgreSQL database migrations
type MigratorPostgres struct {
	pool *pgxpool.Pool
}

// NewMigratorSQLite creates a new SQLite migrator
func NewMigratorSQLite(db *sql.DB) *MigratorSQLite {
	return &MigratorSQLite{db: db}
}

// NewMigratorPostgres creates a new PostgreSQL migrator
func NewMigratorPostgres(pool *pgxpool.Pool) *MigratorPostgres {
	return &MigratorPostgres{pool: pool}
}

// ensureMigrationsTable creates the schema_migrations table if it doesn't exist
func (m *MigratorSQLite) ensureMigrationsTable() error {
	_, err := m.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}

// ensureMigrationsTable creates the schema_migrations table if it doesn't exist
// Also handles migration from old golang-migrate schema_migrations table format
func (m *MigratorPostgres) ensureMigrationsTable(ctx context.Context) error {
	db := stdlib.OpenDBFromPool(m.pool)

	// Check if an old-style schema_migrations table exists (from golang-migrate)
	// It has columns: version (bigint), dirty (boolean)
	// We need to drop it and create our new format
	var hasDirtyColumn bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'schema_migrations' AND column_name = 'dirty'
		)
	`).Scan(&hasDirtyColumn)
	if err != nil {
		return fmt.Errorf("failed to check for old migration table: %w", err)
	}

	if hasDirtyColumn {
		log.Printf("Found old golang-migrate schema_migrations table, migrating to new format...")
		// Drop the old table - we'll recreate it with our new schema
		_, err = db.ExecContext(ctx, "DROP TABLE schema_migrations")
		if err != nil {
			return fmt.Errorf("failed to drop old migration table: %w", err)
		}
	}

	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}

// getAppliedMigrations returns a set of applied migration versions
func (m *MigratorSQLite) getAppliedMigrations() (map[int]bool, error) {
	applied := make(map[int]bool)

	rows, err := m.db.Query("SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

// getAppliedMigrations returns a set of applied migration versions
func (m *MigratorPostgres) getAppliedMigrations(ctx context.Context) (map[int]bool, error) {
	applied := make(map[int]bool)
	db := stdlib.OpenDBFromPool(m.pool)

	rows, err := db.QueryContext(ctx, "SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

// loadMigrations loads all migration files from the embedded filesystem
func loadMigrations(embedFS embed.FS, dir string) ([]Migration, error) {
	var migrations []Migration

	err := fs.WalkDir(embedFS, dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".sql") {
			return nil
		}

		// Parse filename: NNNN_description.sql
		filename := d.Name()
		parts := strings.SplitN(filename, "_", 2)
		if len(parts) != 2 {
			log.Printf("Skipping invalid migration filename: %s", filename)
			return nil
		}

		version, err := strconv.Atoi(parts[0])
		if err != nil {
			log.Printf("Skipping migration with invalid version: %s", filename)
			return nil
		}

		description := strings.TrimSuffix(parts[1], ".sql")

		content, err := embedFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", path, err)
		}

		migrations = append(migrations, Migration{
			Version:     version,
			Description: description,
			UpSQL:       string(content),
		})

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Sort by version
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}

// checkExistingSchema checks if the database was created with the old schema system
// Returns true if the users table exists (meaning schema was already set up)
func (m *MigratorSQLite) checkExistingSchema() (bool, error) {
	var exists int
	err := m.db.QueryRow(`
		SELECT COUNT(*) FROM sqlite_master
		WHERE type='table' AND name='users'
	`).Scan(&exists)
	return exists > 0, err
}

// markInitialMigrationApplied marks migration 0001 as applied for existing databases
func (m *MigratorSQLite) markInitialMigrationApplied() error {
	_, err := m.db.Exec("INSERT OR IGNORE INTO schema_migrations (version) VALUES (1)")
	return err
}

// Migrate runs all pending migrations
func (m *MigratorSQLite) Migrate() error {
	log.Printf("Starting SQLite migration...")

	// Check if this is an existing database (has users table but no schema_migrations)
	hasExistingSchema, err := m.checkExistingSchema()
	if err != nil {
		return fmt.Errorf("failed to check existing schema: %w", err)
	}

	// Ensure migrations table exists
	if err := m.ensureMigrationsTable(); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// If database was created with old schema system, mark initial migration as applied
	if hasExistingSchema {
		applied, err := m.getAppliedMigrations()
		if err != nil {
			return fmt.Errorf("failed to get applied migrations: %w", err)
		}
		if len(applied) == 0 {
			log.Printf("Detected existing database created with old schema system")
			log.Printf("Marking initial migration (0001) as already applied...")
			if err := m.markInitialMigrationApplied(); err != nil {
				return fmt.Errorf("failed to mark initial migration: %w", err)
			}
		}
	}

	// Get applied migrations
	applied, err := m.getAppliedMigrations()
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Load all migrations
	migrations, err := loadMigrations(sqliteMigrations, "migrations/sqlite")
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	if len(migrations) == 0 {
		log.Printf("No migrations found")
		return nil
	}

	// Apply pending migrations
	pendingCount := 0
	for _, mig := range migrations {
		if applied[mig.Version] {
			continue
		}

		log.Printf("Applying migration %04d: %s", mig.Version, mig.Description)

		// Start transaction
		tx, err := m.db.Begin()
		if err != nil {
			return fmt.Errorf("failed to start transaction: %w", err)
		}

		// Execute migration
		if _, err := tx.Exec(mig.UpSQL); err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				return fmt.Errorf("failed to rollback after migration error (migration %04d): %w, rollback error: %v", mig.Version, err, rbErr)
			}
			return fmt.Errorf("failed to apply migration %04d: %w", mig.Version, err)
		}

		// Record migration
		if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", mig.Version); err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				return fmt.Errorf("failed to rollback after recording error (migration %04d): %w, rollback error: %v", mig.Version, err, rbErr)
			}
			return fmt.Errorf("failed to record migration %04d: %w", mig.Version, err)
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %04d: %w", mig.Version, err)
		}

		pendingCount++
	}

	if pendingCount == 0 {
		log.Printf("Database is up to date (version %04d)", migrations[len(migrations)-1].Version)
	} else {
		log.Printf("Applied %d migration(s)", pendingCount)
	}

	return nil
}

// checkExistingSchema checks if the database was created with the old schema system
// Returns true if the users table exists (meaning schema was already set up)
func (m *MigratorPostgres) checkExistingSchema(ctx context.Context) (bool, error) {
	db := stdlib.OpenDBFromPool(m.pool)
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_name = 'users'
		)
	`).Scan(&exists)
	return exists, err
}

// markInitialMigrationApplied marks migration 0001 as applied for existing databases
func (m *MigratorPostgres) markInitialMigrationApplied(ctx context.Context) error {
	db := stdlib.OpenDBFromPool(m.pool)
	_, err := db.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING")
	return err
}

// Migrate runs all pending migrations
func (m *MigratorPostgres) Migrate() error {
	ctx := context.Background()
	log.Printf("Starting PostgreSQL migration...")

	// Check if this is an existing database (has users table but no schema_migrations)
	hasExistingSchema, err := m.checkExistingSchema(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing schema: %w", err)
	}

	// Ensure migrations table exists
	if err := m.ensureMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// If database was created with old schema system, mark initial migration as applied
	if hasExistingSchema {
		applied, err := m.getAppliedMigrations(ctx)
		if err != nil {
			return fmt.Errorf("failed to get applied migrations: %w", err)
		}
		if len(applied) == 0 {
			log.Printf("Detected existing database created with old schema system")
			log.Printf("Marking initial migration (0001) as already applied...")
			if err := m.markInitialMigrationApplied(ctx); err != nil {
				return fmt.Errorf("failed to mark initial migration: %w", err)
			}
		}
	}

	// Get applied migrations
	applied, err := m.getAppliedMigrations(ctx)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Load all migrations
	migrations, err := loadMigrations(postgresMigrations, "migrations/postgres")
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	if len(migrations) == 0 {
		log.Printf("No migrations found")
		return nil
	}

	db := stdlib.OpenDBFromPool(m.pool)

	// Apply pending migrations
	pendingCount := 0
	for _, mig := range migrations {
		if applied[mig.Version] {
			continue
		}

		log.Printf("Applying migration %04d: %s", mig.Version, mig.Description)

		// Start transaction
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to start transaction: %w", err)
		}

		// Execute migration
		if _, err := tx.ExecContext(ctx, mig.UpSQL); err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				return fmt.Errorf("failed to rollback after migration error (migration %04d): %w, rollback error: %v", mig.Version, err, rbErr)
			}
			return fmt.Errorf("failed to apply migration %04d: %w", mig.Version, err)
		}

		// Record migration
		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", mig.Version); err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				return fmt.Errorf("failed to rollback after recording error (migration %04d): %w, rollback error: %v", mig.Version, err, rbErr)
			}
			return fmt.Errorf("failed to record migration %04d: %w", mig.Version, err)
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %04d: %w", mig.Version, err)
		}

		pendingCount++
	}

	if pendingCount == 0 {
		log.Printf("Database is up to date (version %04d)", migrations[len(migrations)-1].Version)
	} else {
		log.Printf("Applied %d migration(s)", pendingCount)
	}

	return nil
}

// GetCurrentVersion returns the current schema version
func (m *MigratorSQLite) GetCurrentVersion() (int, error) {
	if err := m.ensureMigrationsTable(); err != nil {
		return 0, err
	}

	var version int
	err := m.db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM schema_migrations").Scan(&version)
	return version, err
}

// GetCurrentVersion returns the current schema version
func (m *MigratorPostgres) GetCurrentVersion() (int, error) {
	ctx := context.Background()
	if err := m.ensureMigrationsTable(ctx); err != nil {
		return 0, err
	}

	db := stdlib.OpenDBFromPool(m.pool)
	var version int
	err := db.QueryRowContext(ctx, "SELECT COALESCE(MAX(version), 0) FROM schema_migrations").Scan(&version)
	return version, err
}
