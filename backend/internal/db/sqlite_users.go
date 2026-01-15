package db

import (
	"context"
)

// userOps returns a UserOperations instance for this database.
func (s *SQLiteDB) userOps() *UserOperations {
	return NewUserOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateUser(ctx context.Context, user *User) error {
	return s.userOps().CreateUser(ctx, user)
}

func (s *SQLiteDB) GetUserByID(ctx context.Context, id string) (*User, error) {
	return s.userOps().GetUserByID(ctx, id)
}

func (s *SQLiteDB) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	return s.userOps().GetUserByUsername(ctx, username)
}

func (s *SQLiteDB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	return s.userOps().GetUserByEmail(ctx, email)
}

func (s *SQLiteDB) UpdateUser(ctx context.Context, user *User) error {
	return s.userOps().UpdateUser(ctx, user)
}

func (s *SQLiteDB) DeleteUser(ctx context.Context, id string) error {
	return s.userOps().DeleteUser(ctx, id)
}

// ============================================================================
// ADMIN USER OPERATIONS
// ============================================================================

func (s *SQLiteDB) ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error) {
	return s.userOps().ListUsers(ctx, limit, offset)
}

func (s *SQLiteDB) AdminUpdateUser(ctx context.Context, user *User) error {
	return s.userOps().AdminUpdateUser(ctx, user)
}

func (s *SQLiteDB) AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	return s.userOps().AdminUpdateUserPassword(ctx, userID, passwordHash)
}
