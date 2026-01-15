package db

import (
	"context"
	"time"
)

// UserOperations provides unified user operations.
type UserOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewUserOperations creates a new UserOperations.
func NewUserOperations(exec Executor, qb *QueryBuilder) *UserOperations {
	return &UserOperations{exec: exec, qb: qb}
}

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

// CreateUser creates a new user.
func (ops *UserOperations) CreateUser(ctx context.Context, user *User) error {
	// Generate UUID for new user
	user.ID = generateUUID()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// Set default game system if not provided
	if user.GameSystem == "" {
		user.GameSystem = "Dungeons & Dragons 5th Edition"
	}

	query := `INSERT INTO users (id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at)
		  VALUES (` + ops.qb.Placeholders(9) + `)`

	_, err := ops.exec.Exec(ctx, query,
		user.ID,
		user.Email,
		user.Username,
		user.DisplayName,
		user.PasswordHash,
		user.IsAdmin,
		user.GameSystem,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return err
}

// GetUserByID retrieves a user by ID.
func (ops *UserOperations) GetUserByID(ctx context.Context, id string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at
		  FROM users WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.DisplayName,
		&user.PasswordHash,
		&user.IsAdmin,
		&user.GameSystem,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetUserByUsername retrieves a user by username.
func (ops *UserOperations) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at
		  FROM users WHERE username = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, username).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.DisplayName,
		&user.PasswordHash,
		&user.IsAdmin,
		&user.GameSystem,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetUserByEmail retrieves a user by email.
func (ops *UserOperations) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at
		  FROM users WHERE email = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.DisplayName,
		&user.PasswordHash,
		&user.IsAdmin,
		&user.GameSystem,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser updates a user.
func (ops *UserOperations) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	query := `UPDATE users
		  SET email = ` + ops.qb.Placeholder(1) + `, username = ` + ops.qb.Placeholder(2) + `,
		      display_name = ` + ops.qb.Placeholder(3) + `, password_hash = ` + ops.qb.Placeholder(4) + `,
		      updated_at = ` + ops.qb.Placeholder(5) + `
		  WHERE id = ` + ops.qb.Placeholder(6)

	_, err := ops.exec.Exec(ctx, query,
		user.Email,
		user.Username,
		user.DisplayName,
		user.PasswordHash,
		user.UpdatedAt,
		user.ID,
	)
	return err
}

// DeleteUser deletes a user.
func (ops *UserOperations) DeleteUser(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// ADMIN USER OPERATIONS
// ============================================================================

// ListUsers lists all users with pagination.
func (ops *UserOperations) ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM users`
	err := ops.exec.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get paginated users
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at
		  FROM users
		  ORDER BY created_at DESC
		  LIMIT ` + ops.qb.Placeholder(1) + ` OFFSET ` + ops.qb.Placeholder(2)

	rows, err := ops.exec.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	users := make([]*User, 0)
	for rows.Next() {
		user := &User{}
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Username,
			&user.DisplayName,
			&user.PasswordHash,
			&user.IsAdmin,
			&user.GameSystem,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, rows.Err()
}

// AdminUpdateUser updates a user (admin operation).
func (ops *UserOperations) AdminUpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	query := `UPDATE users
		  SET email = ` + ops.qb.Placeholder(1) + `, username = ` + ops.qb.Placeholder(2) + `,
		      display_name = ` + ops.qb.Placeholder(3) + `, is_admin = ` + ops.qb.Placeholder(4) + `,
		      game_system = ` + ops.qb.Placeholder(5) + `, updated_at = ` + ops.qb.Placeholder(6) + `
		  WHERE id = ` + ops.qb.Placeholder(7)

	_, err := ops.exec.Exec(ctx, query,
		user.Email,
		user.Username,
		user.DisplayName,
		user.IsAdmin,
		user.GameSystem,
		user.UpdatedAt,
		user.ID,
	)
	return err
}

// AdminUpdateUserPassword updates a user's password (admin operation).
func (ops *UserOperations) AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	query := `UPDATE users SET password_hash = ` + ops.qb.Placeholder(1) + `, updated_at = ` + ops.qb.Placeholder(2) + `
		  WHERE id = ` + ops.qb.Placeholder(3)
	_, err := ops.exec.Exec(ctx, query, passwordHash, time.Now(), userID)
	return err
}
