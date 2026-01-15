package db

import (
	"context"
	"strconv"
	"time"
)

// SettingsOperations provides unified settings and tool operations.
type SettingsOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewSettingsOperations creates a new SettingsOperations.
func NewSettingsOperations(exec Executor, qb *QueryBuilder) *SettingsOperations {
	return &SettingsOperations{exec: exec, qb: qb}
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

// GetSettings retrieves all settings.
func (ops *SettingsOperations) GetSettings(ctx context.Context) (*Settings, error) {
	settings := &Settings{
		AITimeoutSeconds:        120,        // Default
		OllamaCapability:        "standard", // Default
		DefaultCampaignEnabled:  true,       // Default: show the default campaign
		RAGKnowledgeBaseEnabled: true,       // Default: RAG feature enabled
	}

	// Get registration_enabled setting
	query := `SELECT value FROM settings WHERE key = ` + ops.qb.Placeholder(1)
	var registrationValue string
	err := ops.exec.QueryRow(ctx, query, "registration_enabled").Scan(&registrationValue)
	if err == nil {
		settings.RegistrationEnabled = registrationValue == "true"
	}
	// If key doesn't exist, use default false

	// Get ai_timeout_seconds setting
	var timeoutValue string
	err = ops.exec.QueryRow(ctx, query, "ai_timeout_seconds").Scan(&timeoutValue)
	if err == nil {
		if timeout, parseErr := strconv.Atoi(timeoutValue); parseErr == nil && timeout > 0 {
			settings.AITimeoutSeconds = timeout
		}
	}
	// If key doesn't exist or parse error, use default 120

	// Get ollama_capability setting
	var capabilityValue string
	err = ops.exec.QueryRow(ctx, query, "ollama_capability").Scan(&capabilityValue)
	if err == nil && capabilityValue != "" {
		settings.OllamaCapability = capabilityValue
	}
	// If key doesn't exist, use default "standard"

	// Get ollama_url setting
	var ollamaURLValue string
	err = ops.exec.QueryRow(ctx, query, "ollama_url").Scan(&ollamaURLValue)
	if err == nil && ollamaURLValue != "" {
		settings.OllamaURL = ollamaURLValue
	}
	// If key doesn't exist, will be empty (use environment default)

	// Get ui_settings (JSON string)
	var uiSettingsValue string
	err = ops.exec.QueryRow(ctx, query, "ui_settings").Scan(&uiSettingsValue)
	if err == nil && uiSettingsValue != "" {
		settings.UISettings = []byte(uiSettingsValue)
	}

	// Get default_campaign_enabled setting
	var defaultCampaignEnabledValue string
	err = ops.exec.QueryRow(ctx, query, "default_campaign_enabled").Scan(&defaultCampaignEnabledValue)
	if err == nil {
		settings.DefaultCampaignEnabled = defaultCampaignEnabledValue == "true"
	}
	// If key doesn't exist, use default true

	// Get default_campaign_initialized setting
	var defaultCampaignInitializedValue string
	err = ops.exec.QueryRow(ctx, query, "default_campaign_initialized").Scan(&defaultCampaignInitializedValue)
	if err == nil {
		settings.DefaultCampaignInitialized = defaultCampaignInitializedValue == "true"
	}
	// If key doesn't exist, use default false

	// Get rag_knowledge_base_enabled setting
	var ragEnabledValue string
	err = ops.exec.QueryRow(ctx, query, "rag_knowledge_base_enabled").Scan(&ragEnabledValue)
	if err == nil {
		settings.RAGKnowledgeBaseEnabled = ragEnabledValue == "true"
	}
	// If key doesn't exist, use default true

	// Get enabled_setting_packs (JSON array)
	var enabledPacksValue string
	err = ops.exec.QueryRow(ctx, query, "enabled_setting_packs").Scan(&enabledPacksValue)
	if err == nil && enabledPacksValue != "" {
		settings.EnabledSettingPacks = []byte(enabledPacksValue)
	}

	return settings, nil
}

// UpdateSettings updates all settings.
func (ops *SettingsOperations) UpdateSettings(ctx context.Context, settings *Settings) error {
	// Update registration_enabled
	registrationValue := "false"
	if settings.RegistrationEnabled {
		registrationValue = "true"
	}
	if err := ops.upsertSetting(ctx, "registration_enabled", registrationValue); err != nil {
		return err
	}

	// Update ai_timeout_seconds
	timeoutValue := strconv.Itoa(settings.AITimeoutSeconds)
	if err := ops.upsertSetting(ctx, "ai_timeout_seconds", timeoutValue); err != nil {
		return err
	}

	// Update ollama_capability
	if settings.OllamaCapability != "" {
		if err := ops.upsertSetting(ctx, "ollama_capability", settings.OllamaCapability); err != nil {
			return err
		}
	}

	// Update ollama_url
	if settings.OllamaURL != "" {
		if err := ops.upsertSetting(ctx, "ollama_url", settings.OllamaURL); err != nil {
			return err
		}
	}

	// Update ui_settings if provided
	if len(settings.UISettings) > 0 {
		if err := ops.upsertSetting(ctx, "ui_settings", string(settings.UISettings)); err != nil {
			return err
		}
	}

	// Update default_campaign_enabled
	defaultCampaignEnabledValue := "false"
	if settings.DefaultCampaignEnabled {
		defaultCampaignEnabledValue = "true"
	}
	if err := ops.upsertSetting(ctx, "default_campaign_enabled", defaultCampaignEnabledValue); err != nil {
		return err
	}

	// Update default_campaign_initialized
	defaultCampaignInitializedValue := "false"
	if settings.DefaultCampaignInitialized {
		defaultCampaignInitializedValue = "true"
	}
	if err := ops.upsertSetting(ctx, "default_campaign_initialized", defaultCampaignInitializedValue); err != nil {
		return err
	}

	// Update rag_knowledge_base_enabled
	ragEnabledValue := "false"
	if settings.RAGKnowledgeBaseEnabled {
		ragEnabledValue = "true"
	}
	if err := ops.upsertSetting(ctx, "rag_knowledge_base_enabled", ragEnabledValue); err != nil {
		return err
	}

	// Update enabled_setting_packs if provided
	if len(settings.EnabledSettingPacks) > 0 {
		if err := ops.upsertSetting(ctx, "enabled_setting_packs", string(settings.EnabledSettingPacks)); err != nil {
			return err
		}
	}

	return nil
}

// upsertSetting inserts or updates a setting key-value pair.
func (ops *SettingsOperations) upsertSetting(ctx context.Context, key, value string) error {
	query := `INSERT INTO settings (key, value, updated_at)
		  VALUES (` + ops.qb.Placeholders(3) + `)
		  ON CONFLICT (key) DO UPDATE SET value = ` + ops.qb.Placeholder(2) + `, updated_at = ` + ops.qb.Placeholder(3)

	_, err := ops.exec.Exec(ctx, query, key, value, time.Now())
	return err
}

// ============================================================================
// TOOL OPERATIONS
// ============================================================================

// CreateTool creates a new tool.
func (ops *SettingsOperations) CreateTool(ctx context.Context, tool *Tool) error {
	tool.ID = generateUUID()
	tool.CreatedAt = time.Now()

	query := `INSERT INTO tools (id, user_id, name, type, url, config, position, is_pinned, created_at)
		  VALUES (` + ops.qb.Placeholders(9) + `)`

	_, err := ops.exec.Exec(ctx, query,
		tool.ID, tool.UserID, tool.Name, tool.Type, tool.URL,
		string(tool.Config), tool.Position, tool.IsPinned, tool.CreatedAt)
	return err
}

// GetToolByID retrieves a tool by ID.
func (ops *SettingsOperations) GetToolByID(ctx context.Context, id string) (*Tool, error) {
	tool := &Tool{}
	var configJSON string
	query := `SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		  FROM tools WHERE id = ` + ops.qb.Placeholder(1)

	err := ops.exec.QueryRow(ctx, query, id).
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

// ListToolsByUserID lists all tools for a user.
func (ops *SettingsOperations) ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error) {
	query := `SELECT id, user_id, name, type, url, config, position, is_pinned, created_at
		  FROM tools
		  WHERE user_id = ` + ops.qb.Placeholder(1) + `
		  ORDER BY position ASC, created_at ASC`

	rows, err := ops.exec.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

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

// UpdateTool updates a tool.
func (ops *SettingsOperations) UpdateTool(ctx context.Context, tool *Tool) error {
	query := `UPDATE tools
		  SET name = ` + ops.qb.Placeholder(1) + `, type = ` + ops.qb.Placeholder(2) + `,
		      url = ` + ops.qb.Placeholder(3) + `, config = ` + ops.qb.Placeholder(4) + `,
		      position = ` + ops.qb.Placeholder(5) + `, is_pinned = ` + ops.qb.Placeholder(6) + `
		  WHERE id = ` + ops.qb.Placeholder(7)

	_, err := ops.exec.Exec(ctx, query,
		tool.Name, tool.Type, tool.URL, string(tool.Config),
		tool.Position, tool.IsPinned, tool.ID)
	return err
}

// DeleteTool deletes a tool.
func (ops *SettingsOperations) DeleteTool(ctx context.Context, id string) error {
	query := `DELETE FROM tools WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}
