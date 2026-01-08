package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
)

//go:embed schema/sqlite/*.sql
var sqliteSchema embed.FS

//go:embed schema/postgres/*.sql
var postgresSchema embed.FS

// RunSQLiteSchema runs the embedded schema files for SQLite
// WARNING: This drops and recreates all tables - use only for development/testing
// For production, use RunSQLiteMigrations instead
func RunSQLiteSchema(db *sql.DB) error {
	log.Printf("Running SQLite schema setup (DESTRUCTIVE - development only)...")

	// Get all schema files in order
	files, err := getSortedSchemaFiles(sqliteSchema, "schema/sqlite")
	if err != nil {
		return fmt.Errorf("failed to read schema files: %w", err)
	}

	// Execute each schema file in order
	for _, file := range files {
		log.Printf("Executing schema file: %s", file)

		content, err := sqliteSchema.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read schema file %s: %w", file, err)
		}

		// Execute the SQL
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute schema file %s: %w", file, err)
		}
	}

	log.Printf("SQLite schema setup completed successfully (%d files)", len(files))
	return nil
}

// RunPostgresSchema runs the embedded schema files for PostgreSQL
// WARNING: This drops and recreates all tables - use only for development/testing
// For production, use RunPostgresMigrations instead
func RunPostgresSchema(pool *pgxpool.Pool) error {
	log.Printf("Running PostgreSQL schema setup (DESTRUCTIVE - development only)...")

	// Get a stdlib connection from the pool
	db := stdlib.OpenDBFromPool(pool)

	// Get all schema files in order
	files, err := getSortedSchemaFiles(postgresSchema, "schema/postgres")
	if err != nil {
		return fmt.Errorf("failed to read schema files: %w", err)
	}

	// Execute each schema file in order
	for _, file := range files {
		log.Printf("Executing schema file: %s", file)

		content, err := postgresSchema.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read schema file %s: %w", file, err)
		}

		// Execute the SQL
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute schema file %s: %w", file, err)
		}
	}

	log.Printf("PostgreSQL schema setup completed successfully (%d files)", len(files))
	return nil
}

// getSortedSchemaFiles returns schema files sorted by name (which gives us order due to numeric prefix)
func getSortedSchemaFiles(embedFS embed.FS, dir string) ([]string, error) {
	var files []string

	err := fs.WalkDir(embedFS, dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.HasSuffix(path, ".sql") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Sort files alphabetically (01_users.sql, 02_campaigns.sql, etc.)
	sort.Strings(files)

	return files, nil
}

// CheckSQLiteSchemaExists checks if the database has been initialized
func CheckSQLiteSchemaExists(db *sql.DB) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM sqlite_master
			WHERE type='table' AND name='users'
		)
	`).Scan(&exists)
	return exists, err
}

// CheckPostgresSchemaExists checks if the database has been initialized
func CheckPostgresSchemaExists(pool *pgxpool.Pool) (bool, error) {
	db := stdlib.OpenDBFromPool(pool)
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_name = 'users'
		)
	`).Scan(&exists)
	return exists, err
}

// RunSQLiteMigrations runs pending migrations for SQLite using the new migrator
// This is safe for production - it only applies pending migrations and never drops tables
func RunSQLiteMigrations(db *sql.DB, dbPath string) error {
	migrator := NewMigratorSQLite(db)
	return migrator.Migrate()
}

// RunPostgresMigrations runs pending migrations for PostgreSQL using the new migrator
// This is safe for production - it only applies pending migrations and never drops tables
func RunPostgresMigrations(pool *pgxpool.Pool) error {
	migrator := NewMigratorPostgres(pool)
	return migrator.Migrate()
}
