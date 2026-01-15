package db

import (
	"fmt"
	"strings"
)

// PlaceholderStyle represents the SQL placeholder syntax for a database driver.
type PlaceholderStyle int

const (
	// PlaceholderQuestion uses ? style (SQLite, MySQL)
	PlaceholderQuestion PlaceholderStyle = iota
	// PlaceholderDollar uses $1, $2, etc. style (PostgreSQL)
	PlaceholderDollar
)

// QueryBuilder helps build SQL queries with database-agnostic placeholder syntax.
// It provides methods to generate placeholders and build common query patterns.
type QueryBuilder struct {
	style PlaceholderStyle
}

// NewQueryBuilder creates a new QueryBuilder with the specified placeholder style.
func NewQueryBuilder(style PlaceholderStyle) *QueryBuilder {
	return &QueryBuilder{style: style}
}

// Placeholder returns the placeholder string for the given parameter position (1-indexed).
func (qb *QueryBuilder) Placeholder(n int) string {
	if qb.style == PlaceholderDollar {
		return fmt.Sprintf("$%d", n)
	}
	return "?"
}

// Placeholders returns a comma-separated string of n placeholders.
// For SQLite: "?, ?, ?" (for n=3)
// For PostgreSQL: "$1, $2, $3" (for n=3)
func (qb *QueryBuilder) Placeholders(n int) string {
	placeholders := make([]string, n)
	for i := 0; i < n; i++ {
		placeholders[i] = qb.Placeholder(i + 1)
	}
	return strings.Join(placeholders, ", ")
}

// PlaceholdersFrom returns placeholders starting from a specific index.
// Useful when building WHERE clauses with dynamic parameters.
func (qb *QueryBuilder) PlaceholdersFrom(start, count int) string {
	placeholders := make([]string, count)
	for i := 0; i < count; i++ {
		placeholders[i] = qb.Placeholder(start + i)
	}
	return strings.Join(placeholders, ", ")
}

// BuildInsert builds an INSERT query with the given table name and column names.
// Returns a query like: "INSERT INTO table (col1, col2) VALUES ($1, $2)"
func (qb *QueryBuilder) BuildInsert(table string, columns []string) string {
	cols := strings.Join(columns, ", ")
	placeholders := qb.Placeholders(len(columns))
	return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, cols, placeholders)
}

// BuildUpdate builds an UPDATE query with SET clauses.
// The whereCol is the column used in the WHERE clause (typically "id").
// Returns a query like: "UPDATE table SET col1 = $1, col2 = $2 WHERE id = $3"
func (qb *QueryBuilder) BuildUpdate(table string, setCols []string, whereCol string) string {
	setClauses := make([]string, len(setCols))
	for i, col := range setCols {
		setClauses[i] = fmt.Sprintf("%s = %s", col, qb.Placeholder(i+1))
	}
	whereClause := fmt.Sprintf("%s = %s", whereCol, qb.Placeholder(len(setCols)+1))
	return fmt.Sprintf("UPDATE %s SET %s WHERE %s", table, strings.Join(setClauses, ", "), whereClause)
}

// BuildDelete builds a DELETE query.
// Returns a query like: "DELETE FROM table WHERE id = $1"
func (qb *QueryBuilder) BuildDelete(table string, whereCol string) string {
	return fmt.Sprintf("DELETE FROM %s WHERE %s = %s", table, whereCol, qb.Placeholder(1))
}

// BuildSelect builds a SELECT query with the given columns and WHERE clause.
// Returns a query like: "SELECT col1, col2 FROM table WHERE id = $1"
func (qb *QueryBuilder) BuildSelect(table string, columns []string, whereCol string) string {
	cols := strings.Join(columns, ", ")
	return fmt.Sprintf("SELECT %s FROM %s WHERE %s = %s", cols, table, whereCol, qb.Placeholder(1))
}

// BuildSelectByUser builds a SELECT query filtered by user_id with optional campaign_id.
// The paramOffset indicates the starting parameter number for the campaign_id placeholder.
func (qb *QueryBuilder) BuildSelectByUser(table string, columns []string, orderBy string) string {
	cols := strings.Join(columns, ", ")
	return fmt.Sprintf("SELECT %s FROM %s WHERE user_id = %s", cols, table, qb.Placeholder(1))
}

// AppendCampaignFilter appends an AND campaign_id = ? clause to the query.
// The paramNum is the parameter number to use for the campaign_id.
func (qb *QueryBuilder) AppendCampaignFilter(paramNum int) string {
	return fmt.Sprintf(" AND campaign_id = %s", qb.Placeholder(paramNum))
}

// AppendOrderBy appends an ORDER BY clause to the query.
func (qb *QueryBuilder) AppendOrderBy(column string, desc bool) string {
	direction := "ASC"
	if desc {
		direction = "DESC"
	}
	return fmt.Sprintf(" ORDER BY %s %s", column, direction)
}

// BoolLiteral returns the appropriate boolean literal for the database.
// SQLite uses 0/1, PostgreSQL uses true/false.
func (qb *QueryBuilder) BoolLiteral(b bool) string {
	if qb.style == PlaceholderDollar {
		if b {
			return "true"
		}
		return "false"
	}
	if b {
		return "1"
	}
	return "0"
}

// EmptyJSONArray returns the appropriate empty JSON array literal for the database.
// SQLite uses '[]', PostgreSQL uses '[]'::jsonb.
func (qb *QueryBuilder) EmptyJSONArray() string {
	if qb.style == PlaceholderDollar {
		return "'[]'::jsonb"
	}
	return "'[]'"
}

// EmptyJSONObject returns the appropriate empty JSON object literal for the database.
// SQLite uses '{}', PostgreSQL uses '{}'::jsonb.
func (qb *QueryBuilder) EmptyJSONObject() string {
	if qb.style == PlaceholderDollar {
		return "'{}'::jsonb"
	}
	return "'{}'"
}

// ExcludedCol returns the reference to an excluded column in ON CONFLICT clause.
// SQLite uses excluded.col, PostgreSQL uses EXCLUDED.col.
func (qb *QueryBuilder) ExcludedCol(col string) string {
	if qb.style == PlaceholderDollar {
		return "EXCLUDED." + col
	}
	return "excluded." + col
}

// MaxFunc returns the appropriate function name for getting the maximum of values.
// SQLite uses MAX(), PostgreSQL uses GREATEST().
func (qb *QueryBuilder) MaxFunc() string {
	if qb.style == PlaceholderDollar {
		return "GREATEST"
	}
	return "MAX"
}
