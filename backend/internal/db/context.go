package db

import (
	"context"
	"time"
)

// DefaultQueryTimeout is the default timeout for database queries (30 seconds)
const DefaultQueryTimeout = 30 * time.Second

// DefaultMigrationTimeout is the default timeout for database migrations (5 minutes)
const DefaultMigrationTimeout = 5 * time.Minute

// WithQueryTimeout wraps a context with a query timeout.
// If the context already has a deadline that is sooner than the timeout,
// the original context is returned unchanged.
func WithQueryTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if timeout <= 0 {
		timeout = DefaultQueryTimeout
	}

	// If the context already has a shorter deadline, use it
	if deadline, ok := ctx.Deadline(); ok {
		if time.Until(deadline) < timeout {
			return ctx, func() {} // Return no-op cancel func
		}
	}

	return context.WithTimeout(ctx, timeout)
}

// WithMigrationTimeout wraps a context with a migration timeout.
func WithMigrationTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if timeout <= 0 {
		timeout = DefaultMigrationTimeout
	}

	return context.WithTimeout(ctx, timeout)
}
