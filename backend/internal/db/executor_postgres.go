package db

import (
	"context"
	"database/sql"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// pgxPoolExecutor wraps a *pgxpool.Pool to implement the Executor interface.
type pgxPoolExecutor struct {
	pool *pgxpool.Pool
}

// pgxResult implements sql.Result for pgx command tags.
type pgxResult struct {
	rowsAffected int64
}

func (r pgxResult) LastInsertId() (int64, error) {
	return 0, nil // PostgreSQL doesn't support LastInsertId via RETURNING
}

func (r pgxResult) RowsAffected() (int64, error) {
	return r.rowsAffected, nil
}

func (e *pgxPoolExecutor) Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	tag, err := e.pool.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return pgxResult{rowsAffected: tag.RowsAffected()}, nil
}

func (e *pgxPoolExecutor) QueryRow(ctx context.Context, query string, args ...interface{}) Row {
	return &pgxRowWrapper{row: e.pool.QueryRow(ctx, query, args...)}
}

func (e *pgxPoolExecutor) Query(ctx context.Context, query string, args ...interface{}) (Rows, error) {
	rows, err := e.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return &pgxRowsWrapper{rows: rows}, nil
}

// pgxRowWrapper wraps pgx.Row to implement our Row interface.
type pgxRowWrapper struct {
	row pgx.Row
}

func (r *pgxRowWrapper) Scan(dest ...interface{}) error {
	err := r.row.Scan(dest...)
	if err == pgx.ErrNoRows {
		return sql.ErrNoRows
	}
	return err
}

// pgxRowsWrapper wraps pgx.Rows to implement our Rows interface.
type pgxRowsWrapper struct {
	rows pgx.Rows
}

func (r *pgxRowsWrapper) Next() bool {
	return r.rows.Next()
}

func (r *pgxRowsWrapper) Scan(dest ...interface{}) error {
	return r.rows.Scan(dest...)
}

func (r *pgxRowsWrapper) Close() error {
	r.rows.Close()
	return nil
}

func (r *pgxRowsWrapper) Err() error {
	return r.rows.Err()
}

// NewPgxPoolExecutor creates an Executor from a *pgxpool.Pool.
func NewPgxPoolExecutor(pool *pgxpool.Pool) Executor {
	return &pgxPoolExecutor{pool: pool}
}

// Executor returns an Executor for the PostgresDB.
func (db *PostgresDB) Executor() Executor {
	return NewPgxPoolExecutor(db.pool)
}

// QueryBuilder returns a QueryBuilder for PostgreSQL placeholder style.
func (db *PostgresDB) QueryBuilder() *QueryBuilder {
	return NewQueryBuilder(PlaceholderDollar)
}
