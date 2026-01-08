package db

import (
	"context"
	"fmt"
	"time"
)

// =============================================================================
// User Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateUser(ctx context.Context, user *User) error {
	// Set default game system if not provided
	if user.GameSystem == "" {
		user.GameSystem = "Dungeons & Dragons 5th Edition"
	}

	query := `
		INSERT INTO users (username, email, display_name, password_hash, is_admin, game_system)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return db.pool.QueryRow(ctx, query, user.Username, user.Email, user.DisplayName, user.PasswordHash, user.IsAdmin, user.GameSystem).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (db *PostgresDB) GetUserByID(ctx context.Context, id string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, username, email, display_name, password_hash, is_admin, game_system, created_at, updated_at
		FROM users WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).
		Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.PasswordHash, &user.IsAdmin, &user.GameSystem, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *PostgresDB) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, username, email, display_name, password_hash, is_admin, game_system, created_at, updated_at
		FROM users WHERE username = $1`

	err := db.pool.QueryRow(ctx, query, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.PasswordHash, &user.IsAdmin, &user.GameSystem, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *PostgresDB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, username, email, display_name, password_hash, is_admin, game_system, created_at, updated_at
		FROM users WHERE email = $1`

	err := db.pool.QueryRow(ctx, query, email).
		Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.PasswordHash, &user.IsAdmin, &user.GameSystem, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *PostgresDB) UpdateUser(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3`

	_, err := db.pool.Exec(ctx, query, user.Username, user.Email, user.ID)
	return err
}

func (db *PostgresDB) DeleteUser(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Admin User Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM users`
	err := db.pool.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Get users with pagination
	query := `
		SELECT id, username, email, display_name, password_hash, is_admin, game_system, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := db.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var users []*User
	for rows.Next() {
		user := &User{}
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.PasswordHash,
			&user.IsAdmin, &user.GameSystem, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating users: %w", err)
	}

	return users, total, nil
}

func (db *PostgresDB) AdminUpdateUser(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET username = $1, email = $2, game_system = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4`

	result, err := db.pool.Exec(ctx, query, user.Username, user.Email, user.GameSystem, user.ID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (db *PostgresDB) AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2`

	result, err := db.pool.Exec(ctx, query, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// =============================================================================
// Tool Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateTool(ctx context.Context, tool *Tool) error {
	query := `
		INSERT INTO tools (user_id, name, type, url, config, position, is_pinned)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	return db.pool.QueryRow(ctx, query,
		tool.UserID, tool.Name, tool.Type, tool.URL, tool.Config, tool.Position, tool.IsPinned).
		Scan(&tool.ID, &tool.CreatedAt)
}

func (db *PostgresDB) GetToolByID(ctx context.Context, id string) (*Tool, error) {
	tool := &Tool{}
	query := `
		SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		FROM tools WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).
		Scan(&tool.ID, &tool.UserID, &tool.Name, &tool.Type, &tool.URL,
			&tool.Config, &tool.Position, &tool.IsPinned, &tool.CreatedAt)

	if err != nil {
		return nil, err
	}
	return tool, nil
}

func (db *PostgresDB) ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error) {
	query := `
		SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		FROM tools
		WHERE user_id = $1
		ORDER BY position ASC`

	rows, err := db.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var tools []*Tool
	for rows.Next() {
		tool := &Tool{}
		if err := rows.Scan(&tool.ID, &tool.UserID, &tool.Name, &tool.Type, &tool.URL,
			&tool.Config, &tool.Position, &tool.IsPinned, &tool.CreatedAt); err != nil {
			return nil, err
		}
		tools = append(tools, tool)
	}

	return tools, rows.Err()
}

func (db *PostgresDB) UpdateTool(ctx context.Context, tool *Tool) error {
	query := `
		UPDATE tools
		SET name = $1, type = $2, url = $3, config = $4, position = $5, is_pinned = $6
		WHERE id = $7`

	_, err := db.pool.Exec(ctx, query,
		tool.Name, tool.Type, tool.URL, tool.Config, tool.Position, tool.IsPinned, tool.ID)
	return err
}

func (db *PostgresDB) DeleteTool(ctx context.Context, id string) error {
	query := `DELETE FROM tools WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Container Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateContainer(ctx context.Context, container *Container) error {
	if container.ID == "" {
		container.ID = generateUUID()
	}
	container.CreatedAt = time.Now()
	container.UpdatedAt = time.Now()

	query := `
		INSERT INTO containers (id, user_id, type, tool, title, url, position, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := db.pool.Exec(ctx, query,
		container.ID, container.UserID, container.Type, container.Tool, container.Title,
		container.URL, container.Position, container.IsActive, container.CreatedAt, container.UpdatedAt)
	return err
}

func (db *PostgresDB) GetContainerByID(ctx context.Context, id string) (*Container, error) {
	container := &Container{}
	query := `
		SELECT id, user_id, type, tool, title, url, position, is_active, created_at, updated_at
		FROM containers WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).
		Scan(&container.ID, &container.UserID, &container.Type, &container.Tool,
			&container.Title, &container.URL, &container.Position, &container.IsActive,
			&container.CreatedAt, &container.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return container, nil
}

func (db *PostgresDB) ListContainersByUserID(ctx context.Context, userID string) ([]*Container, error) {
	query := `
		SELECT id, user_id, type, tool, title, url, position, is_active, created_at, updated_at
		FROM containers
		WHERE user_id = $1
		ORDER BY position ASC, created_at ASC`

	rows, err := db.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var containers []*Container
	for rows.Next() {
		container := &Container{}
		if err := rows.Scan(&container.ID, &container.UserID, &container.Type, &container.Tool,
			&container.Title, &container.URL, &container.Position, &container.IsActive,
			&container.CreatedAt, &container.UpdatedAt); err != nil {
			return nil, err
		}
		containers = append(containers, container)
	}

	return containers, rows.Err()
}

func (db *PostgresDB) UpdateContainer(ctx context.Context, container *Container) error {
	container.UpdatedAt = time.Now()
	query := `
		UPDATE containers
		SET type = $1, tool = $2, title = $3, url = $4, position = $5, is_active = $6, updated_at = $7
		WHERE id = $8`

	_, err := db.pool.Exec(ctx, query,
		container.Type, container.Tool, container.Title, container.URL,
		container.Position, container.IsActive, container.UpdatedAt, container.ID)
	return err
}

func (db *PostgresDB) DeleteContainer(ctx context.Context, id string) error {
	query := `DELETE FROM containers WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) DeleteAllContainersByUserID(ctx context.Context, userID string) error {
	query := `DELETE FROM containers WHERE user_id = $1`
	_, err := db.pool.Exec(ctx, query, userID)
	return err
}

// =============================================================================
// Kit Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateKit(ctx context.Context, kit *Kit) error {
	query := `
		INSERT INTO kits (user_id, name, description, containers, is_default)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`

	return db.pool.QueryRow(ctx, query,
		kit.UserID, kit.Name, kit.Description, kit.Containers, kit.IsDefault).
		Scan(&kit.ID, &kit.CreatedAt, &kit.UpdatedAt)
}

func (db *PostgresDB) GetKitByID(ctx context.Context, id string) (*Kit, error) {
	kit := &Kit{}
	query := `
		SELECT id, user_id, name, description, containers, is_default, created_at, updated_at
		FROM kits WHERE id = $1`

	err := db.pool.QueryRow(ctx, query, id).
		Scan(&kit.ID, &kit.UserID, &kit.Name, &kit.Description,
			&kit.Containers, &kit.IsDefault, &kit.CreatedAt, &kit.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return kit, nil
}

func (db *PostgresDB) ListKitsByUserID(ctx context.Context, userID string) ([]*Kit, error) {
	query := `
		SELECT id, user_id, name, description, containers, is_default, created_at, updated_at
		FROM kits
		WHERE user_id = $1
		ORDER BY is_default DESC, created_at DESC`

	rows, err := db.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var kits []*Kit
	for rows.Next() {
		kit := &Kit{}
		if err := rows.Scan(&kit.ID, &kit.UserID, &kit.Name, &kit.Description,
			&kit.Containers, &kit.IsDefault, &kit.CreatedAt, &kit.UpdatedAt); err != nil {
			return nil, err
		}
		kits = append(kits, kit)
	}

	return kits, rows.Err()
}

func (db *PostgresDB) UpdateKit(ctx context.Context, kit *Kit) error {
	query := `
		UPDATE kits
		SET name = $1, description = $2, containers = $3, is_default = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5`

	_, err := db.pool.Exec(ctx, query,
		kit.Name, kit.Description, kit.Containers, kit.IsDefault, kit.ID)
	return err
}

func (db *PostgresDB) DeleteKit(ctx context.Context, id string) error {
	query := `DELETE FROM kits WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

func (db *PostgresDB) SetDefaultKit(ctx context.Context, userID string, kitID string) error {
	// First, unset all defaults for this user
	unsetQuery := `UPDATE kits SET is_default = false WHERE user_id = $1`
	if _, err := db.pool.Exec(ctx, unsetQuery, userID); err != nil {
		return err
	}

	// Then set the new default
	setQuery := `UPDATE kits SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`
	_, err := db.pool.Exec(ctx, setQuery, kitID, userID)
	return err
}
