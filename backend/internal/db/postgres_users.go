package db

import (
	"context"
)

// userOps returns a UserOperations instance for this database.
func (db *PostgresDB) userOps() *UserOperations {
	return NewUserOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateUser(ctx context.Context, user *User) error {
	return db.userOps().CreateUser(ctx, user)
}

func (db *PostgresDB) GetUserByID(ctx context.Context, id string) (*User, error) {
	return db.userOps().GetUserByID(ctx, id)
}

func (db *PostgresDB) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	return db.userOps().GetUserByUsername(ctx, username)
}

func (db *PostgresDB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	return db.userOps().GetUserByEmail(ctx, email)
}

func (db *PostgresDB) UpdateUser(ctx context.Context, user *User) error {
	return db.userOps().UpdateUser(ctx, user)
}

func (db *PostgresDB) DeleteUser(ctx context.Context, id string) error {
	return db.userOps().DeleteUser(ctx, id)
}

// ============================================================================
// ADMIN USER OPERATIONS
// ============================================================================

func (db *PostgresDB) ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error) {
	return db.userOps().ListUsers(ctx, limit, offset)
}

func (db *PostgresDB) AdminUpdateUser(ctx context.Context, user *User) error {
	return db.userOps().AdminUpdateUser(ctx, user)
}

func (db *PostgresDB) AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	return db.userOps().AdminUpdateUserPassword(ctx, userID, passwordHash)
}
