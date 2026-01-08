package db

import (
	"context"
	"strconv"
	"time"
)

// Tool operations

func (s *SQLiteDB) CreateTool(ctx context.Context, tool *Tool) error {
	tool.ID = generateUUID()
	tool.CreatedAt = time.Now()

	query := `
		INSERT INTO tools (id, user_id, name, type, url, config, position, is_pinned, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		tool.ID, tool.UserID, tool.Name, tool.Type, tool.URL,
		string(tool.Config), tool.Position, tool.IsPinned, tool.CreatedAt)
	return err
}

func (s *SQLiteDB) GetToolByID(ctx context.Context, id string) (*Tool, error) {
	tool := &Tool{}
	var configJSON string
	query := `
		SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		FROM tools WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).
		Scan(&tool.ID, &tool.UserID, &tool.Name, &tool.Type,
			&tool.URL, &configJSON, &tool.Position, &tool.IsPinned, &tool.CreatedAt)

	if err != nil {
		return nil, err
	}
	if configJSON != "" {
		tool.Config = []byte(configJSON)
	}
	return tool, nil
}

func (s *SQLiteDB) ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error) {
	query := `
		SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		FROM tools
		WHERE user_id = ?
		ORDER BY position ASC, created_at ASC`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	var tools []*Tool
	for rows.Next() {
		tool := &Tool{}
		var configJSON string
		if err := rows.Scan(&tool.ID, &tool.UserID, &tool.Name, &tool.Type,
			&tool.URL, &configJSON, &tool.Position, &tool.IsPinned, &tool.CreatedAt); err != nil {
			return nil, err
		}
		if configJSON != "" {
			tool.Config = []byte(configJSON)
		}
		tools = append(tools, tool)
	}

	return tools, rows.Err()
}

func (s *SQLiteDB) UpdateTool(ctx context.Context, tool *Tool) error {
	query := `
		UPDATE tools
		SET name = ?, type = ?, url = ?, config = ?, position = ?, is_pinned = ?
		WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		tool.Name, tool.Type, tool.URL, string(tool.Config),
		tool.Position, tool.IsPinned, tool.ID)
	return err
}

func (s *SQLiteDB) DeleteTool(ctx context.Context, id string) error {
	query := `DELETE FROM tools WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Container operations

func (s *SQLiteDB) CreateContainer(ctx context.Context, container *Container) error {
	container.ID = generateUUID()
	container.CreatedAt = time.Now()
	container.UpdatedAt = time.Now()

	query := `
		INSERT INTO containers (id, user_id, type, tool, title, url, position, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		container.ID, container.UserID, container.Type, container.Tool, container.Title,
		container.URL, container.Position, container.IsActive, container.CreatedAt, container.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetContainerByID(ctx context.Context, id string) (*Container, error) {
	container := &Container{}
	query := `
		SELECT id, user_id, type, tool, title, url, position, is_active, created_at, updated_at
		FROM containers WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).
		Scan(&container.ID, &container.UserID, &container.Type, &container.Tool,
			&container.Title, &container.URL, &container.Position, &container.IsActive,
			&container.CreatedAt, &container.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return container, nil
}

func (s *SQLiteDB) ListContainersByUserID(ctx context.Context, userID string) ([]*Container, error) {
	query := `
		SELECT id, user_id, type, tool, title, url, position, is_active, created_at, updated_at
		FROM containers
		WHERE user_id = ?
		ORDER BY position ASC, created_at ASC`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

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

func (s *SQLiteDB) UpdateContainer(ctx context.Context, container *Container) error {
	container.UpdatedAt = time.Now()
	query := `
		UPDATE containers
		SET type = ?, tool = ?, title = ?, url = ?, position = ?, is_active = ?, updated_at = ?
		WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		container.Type, container.Tool, container.Title, container.URL,
		container.Position, container.IsActive, container.UpdatedAt, container.ID)
	return err
}

func (s *SQLiteDB) DeleteContainer(ctx context.Context, id string) error {
	query := `DELETE FROM containers WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) DeleteAllContainersByUserID(ctx context.Context, userID string) error {
	query := `DELETE FROM containers WHERE user_id = ?`
	_, err := s.db.ExecContext(ctx, query, userID)
	return err
}

// Kit operations

func (s *SQLiteDB) CreateKit(ctx context.Context, profile *Kit) error {
	profile.ID = generateUUID()
	profile.CreatedAt = time.Now()
	profile.UpdatedAt = time.Now()

	query := `
		INSERT INTO kits (id, user_id, name, description, containers, is_default, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		profile.ID, profile.UserID, profile.Name, profile.Description,
		string(profile.Containers), profile.IsDefault, profile.CreatedAt, profile.UpdatedAt)
	return err
}

func (s *SQLiteDB) GetKitByID(ctx context.Context, id string) (*Kit, error) {
	profile := &Kit{}
	var containersJSON string
	query := `
		SELECT id, user_id, name, description, containers, is_default, created_at, updated_at
		FROM kits WHERE id = ?`

	err := s.db.QueryRowContext(ctx, query, id).
		Scan(&profile.ID, &profile.UserID, &profile.Name, &profile.Description,
			&containersJSON, &profile.IsDefault, &profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		return nil, err
	}
	profile.Containers = []byte(containersJSON)
	return profile, nil
}

func (s *SQLiteDB) ListKitsByUserID(ctx context.Context, userID string) ([]*Kit, error) {
	query := `
		SELECT id, user_id, name, description, containers, is_default, created_at, updated_at
		FROM kits
		WHERE user_id = ?
		ORDER BY is_default DESC, created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	var kits []*Kit
	for rows.Next() {
		kit := &Kit{}
		var containersJSON string
		if err := rows.Scan(&kit.ID, &kit.UserID, &kit.Name, &kit.Description,
			&containersJSON, &kit.IsDefault, &kit.CreatedAt, &kit.UpdatedAt); err != nil {
			return nil, err
		}
		kit.Containers = []byte(containersJSON)
		kits = append(kits, kit)
	}

	return kits, rows.Err()
}

func (s *SQLiteDB) UpdateKit(ctx context.Context, profile *Kit) error {
	profile.UpdatedAt = time.Now()
	query := `
		UPDATE kits
		SET name = ?, description = ?, containers = ?, is_default = ?, updated_at = ?
		WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
		profile.Name, profile.Description, string(profile.Containers),
		profile.IsDefault, profile.UpdatedAt, profile.ID)
	return err
}

func (s *SQLiteDB) DeleteKit(ctx context.Context, id string) error {
	query := `DELETE FROM kits WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *SQLiteDB) SetDefaultKit(ctx context.Context, userID string, profileID string) error {
	// First, unset all defaults for this user
	unsetQuery := `UPDATE kits SET is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
	if _, err := s.db.ExecContext(ctx, unsetQuery, userID); err != nil {
		return err
	}

	// Then set the new default
	setQuery := `UPDATE kits SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
	_, err := s.db.ExecContext(ctx, setQuery, profileID, userID)
	return err
}

// Settings operations

func (s *SQLiteDB) GetSettings(ctx context.Context) (*Settings, error) {
	settings := &Settings{
		AITimeoutSeconds:        120,        // Default
		OllamaCapability:        "standard", // Default
		DefaultCampaignEnabled:  true,       // Default: show the default campaign
		RAGKnowledgeBaseEnabled: true,       // Default: RAG feature enabled
	}

	// Get registration_enabled setting
	query := `SELECT value FROM settings WHERE key = ?`
	var registrationValue string
	err := s.db.QueryRowContext(ctx, query, "registration_enabled").Scan(&registrationValue)
	if err != nil {
		return nil, err
	}
	settings.RegistrationEnabled = registrationValue == "true"

	// Get ai_timeout_seconds setting
	var timeoutValue string
	err = s.db.QueryRowContext(ctx, query, "ai_timeout_seconds").Scan(&timeoutValue)
	if err == nil {
		// Parse timeout value
		if timeout, parseErr := strconv.Atoi(timeoutValue); parseErr == nil && timeout > 0 {
			settings.AITimeoutSeconds = timeout
		}
	}
	// If key doesn't exist or parse error, use default 120

	// Get ollama_capability setting
	var capabilityValue string
	err = s.db.QueryRowContext(ctx, query, "ollama_capability").Scan(&capabilityValue)
	if err == nil && capabilityValue != "" {
		settings.OllamaCapability = capabilityValue
	}
	// If key doesn't exist, use default "standard"

	// Get ollama_url setting
	var ollamaURLValue string
	err = s.db.QueryRowContext(ctx, query, "ollama_url").Scan(&ollamaURLValue)
	if err == nil && ollamaURLValue != "" {
		settings.OllamaURL = ollamaURLValue
	}
	// If key doesn't exist, will be empty (use environment default)

	// Get ui_settings (JSON string)
	var uiSettingsValue string
	err = s.db.QueryRowContext(ctx, query, "ui_settings").Scan(&uiSettingsValue)
	if err == nil && uiSettingsValue != "" {
		settings.UISettings = []byte(uiSettingsValue)
	}

	// Get default_campaign_enabled setting
	var defaultCampaignEnabledValue string
	err = s.db.QueryRowContext(ctx, query, "default_campaign_enabled").Scan(&defaultCampaignEnabledValue)
	if err == nil {
		settings.DefaultCampaignEnabled = defaultCampaignEnabledValue == "true"
	}
	// If key doesn't exist, use default true

	// Get default_campaign_initialized setting
	var defaultCampaignInitializedValue string
	err = s.db.QueryRowContext(ctx, query, "default_campaign_initialized").Scan(&defaultCampaignInitializedValue)
	if err == nil {
		settings.DefaultCampaignInitialized = defaultCampaignInitializedValue == "true"
	}
	// If key doesn't exist, use default false

	// Get rag_knowledge_base_enabled setting
	var ragEnabledValue string
	err = s.db.QueryRowContext(ctx, query, "rag_knowledge_base_enabled").Scan(&ragEnabledValue)
	if err == nil {
		settings.RAGKnowledgeBaseEnabled = ragEnabledValue == "true"
	}
	// If key doesn't exist, use default true

	// Get enabled_setting_packs (JSON array)
	var enabledPacksValue string
	err = s.db.QueryRowContext(ctx, query, "enabled_setting_packs").Scan(&enabledPacksValue)
	if err == nil && enabledPacksValue != "" {
		settings.EnabledSettingPacks = []byte(enabledPacksValue)
	}

	return settings, nil
}

func (s *SQLiteDB) UpdateSettings(ctx context.Context, settings *Settings) error {
	registrationValue := "false"
	if settings.RegistrationEnabled {
		registrationValue = "true"
	}

	query := `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`

	// Update registration_enabled
	if _, err := s.db.ExecContext(ctx, query, registrationValue, "registration_enabled"); err != nil {
		return err
	}

	// Update ai_timeout_seconds
	timeoutValue := strconv.Itoa(settings.AITimeoutSeconds)
	if _, err := s.db.ExecContext(ctx, query, timeoutValue, "ai_timeout_seconds"); err != nil {
		return err
	}

	// Update ollama_capability
	if settings.OllamaCapability != "" {
		// First check if the key exists
		var exists bool
		err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM settings WHERE key = ?)", "ollama_capability").Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			// Update existing row
			if _, err := s.db.ExecContext(ctx, query, settings.OllamaCapability, "ollama_capability"); err != nil {
				return err
			}
		} else {
			// Insert new row
			insertQuery := `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
			if _, err := s.db.ExecContext(ctx, insertQuery, "ollama_capability", settings.OllamaCapability); err != nil {
				return err
			}
		}
	}

	// Update ollama_url
	if settings.OllamaURL != "" {
		// First check if the key exists
		var exists bool
		err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM settings WHERE key = ?)", "ollama_url").Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			// Update existing row
			if _, err := s.db.ExecContext(ctx, query, settings.OllamaURL, "ollama_url"); err != nil {
				return err
			}
		} else {
			// Insert new row
			insertQuery := `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
			if _, err := s.db.ExecContext(ctx, insertQuery, "ollama_url", settings.OllamaURL); err != nil {
				return err
			}
		}
	}

	// Update ui_settings if provided
	if len(settings.UISettings) > 0 {
		// First check if the key exists
		var exists bool
		err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM settings WHERE key = ?)", "ui_settings").Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			// Update existing row
			if _, err := s.db.ExecContext(ctx, query, string(settings.UISettings), "ui_settings"); err != nil {
				return err
			}
		} else {
			// Insert new row
			insertQuery := `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
			if _, err := s.db.ExecContext(ctx, insertQuery, "ui_settings", string(settings.UISettings)); err != nil {
				return err
			}
		}
	}

	// Update default_campaign_enabled
	defaultCampaignEnabledValue := "false"
	if settings.DefaultCampaignEnabled {
		defaultCampaignEnabledValue = "true"
	}
	if err := s.upsertSetting(ctx, "default_campaign_enabled", defaultCampaignEnabledValue); err != nil {
		return err
	}

	// Update default_campaign_initialized
	defaultCampaignInitializedValue := "false"
	if settings.DefaultCampaignInitialized {
		defaultCampaignInitializedValue = "true"
	}
	if err := s.upsertSetting(ctx, "default_campaign_initialized", defaultCampaignInitializedValue); err != nil {
		return err
	}

	// Update rag_knowledge_base_enabled
	ragEnabledValue := "false"
	if settings.RAGKnowledgeBaseEnabled {
		ragEnabledValue = "true"
	}
	if err := s.upsertSetting(ctx, "rag_knowledge_base_enabled", ragEnabledValue); err != nil {
		return err
	}

	// Update enabled_setting_packs if provided
	if len(settings.EnabledSettingPacks) > 0 {
		if err := s.upsertSetting(ctx, "enabled_setting_packs", string(settings.EnabledSettingPacks)); err != nil {
			return err
		}
	}

	return nil
}

// upsertSetting inserts or updates a setting key-value pair
func (s *SQLiteDB) upsertSetting(ctx context.Context, key, value string) error {
	var exists bool
	err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM settings WHERE key = ?)", key).Scan(&exists)
	if err != nil {
		return err
	}

	if exists {
		query := `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`
		_, err = s.db.ExecContext(ctx, query, value, key)
	} else {
		query := `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
		_, err = s.db.ExecContext(ctx, query, key, value)
	}
	return err
}
