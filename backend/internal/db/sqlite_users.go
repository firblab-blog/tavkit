package db

import (
	"context"
	"time"
)

// User operations

func (s *SQLiteDB) CreateUser(ctx context.Context, user *User) error {
	// Generate UUID for new user
	user.ID = generateUUID()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// Set default game system if not provided
	if user.GameSystem == "" {
		user.GameSystem = "Dungeons & Dragons 5th Edition"
	}

	query := `
		INSERT INTO users (id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := s.db.ExecContext(ctx, query,
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

func (s *SQLiteDB) GetUserByID(ctx context.Context, id string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at FROM users WHERE id = ?`
	err := s.db.QueryRowContext(ctx, query, id).Scan(
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

func (s *SQLiteDB) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at FROM users WHERE username = ?`
	err := s.db.QueryRowContext(ctx, query, username).Scan(
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

func (s *SQLiteDB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at FROM users WHERE email = ?`
	err := s.db.QueryRowContext(ctx, query, email).Scan(
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

func (s *SQLiteDB) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	query := `
		UPDATE users
		SET email = ?, username = ?, display_name = ?, password_hash = ?, updated_at = ?
		WHERE id = ?
	`
	_, err := s.db.ExecContext(ctx, query,
		user.Email,
		user.Username,
		user.DisplayName,
		user.PasswordHash,
		user.UpdatedAt,
		user.ID,
	)
	return err
}

func (s *SQLiteDB) DeleteUser(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Admin-specific user management methods

func (s *SQLiteDB) ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM users`
	err := s.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get paginated users
	query := `
		SELECT id, email, username, display_name, password_hash, is_admin, game_system, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
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

func (s *SQLiteDB) AdminUpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	query := `
		UPDATE users
		SET email = ?, username = ?, display_name = ?, is_admin = ?, game_system = ?, updated_at = ?
		WHERE id = ?
	`
	_, err := s.db.ExecContext(ctx, query,
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

func (s *SQLiteDB) AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	query := `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, passwordHash, time.Now(), userID)
	return err
}
