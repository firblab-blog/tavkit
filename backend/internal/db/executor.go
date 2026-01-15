package db

import (
	"context"
	"database/sql"
)

// Row represents a database row that can be scanned.
type Row interface {
	Scan(dest ...interface{}) error
}

// Rows represents database rows that can be iterated.
type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
	Err() error
}

// Executor provides a common interface for executing SQL queries.
// This abstracts over the differences between sql.DB and pgxpool.Pool.
type Executor interface {
	// Exec executes a query that doesn't return rows (INSERT, UPDATE, DELETE).
	Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	// QueryRow executes a query that returns a single row.
	QueryRow(ctx context.Context, query string, args ...interface{}) Row
	// Query executes a query that returns multiple rows.
	Query(ctx context.Context, query string, args ...interface{}) (Rows, error)
}

// sqlDBExecutor wraps a *sql.DB to implement the Executor interface.
type sqlDBExecutor struct {
	db *sql.DB
}

func (e *sqlDBExecutor) Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return e.db.ExecContext(ctx, query, args...)
}

func (e *sqlDBExecutor) QueryRow(ctx context.Context, query string, args ...interface{}) Row {
	return e.db.QueryRowContext(ctx, query, args...)
}

func (e *sqlDBExecutor) Query(ctx context.Context, query string, args ...interface{}) (Rows, error) {
	rows, err := e.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return &sqlRowsWrapper{rows}, nil
}

// sqlRowsWrapper wraps *sql.Rows to implement our Rows interface.
type sqlRowsWrapper struct {
	rows *sql.Rows
}

func (r *sqlRowsWrapper) Next() bool {
	return r.rows.Next()
}

func (r *sqlRowsWrapper) Scan(dest ...interface{}) error {
	return r.rows.Scan(dest...)
}

func (r *sqlRowsWrapper) Close() error {
	return r.rows.Close()
}

func (r *sqlRowsWrapper) Err() error {
	return r.rows.Err()
}

// NewSQLDBExecutor creates an Executor from a *sql.DB.
func NewSQLDBExecutor(db *sql.DB) Executor {
	return &sqlDBExecutor{db: db}
}

// Executor returns an Executor for the SQLiteDB.
func (s *SQLiteDB) Executor() Executor {
	return NewSQLDBExecutor(s.db)
}

// QueryBuilder returns a QueryBuilder for SQLite placeholder style.
func (s *SQLiteDB) QueryBuilder() *QueryBuilder {
	return NewQueryBuilder(PlaceholderQuestion)
}
