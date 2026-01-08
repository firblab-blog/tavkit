package db

import (
	"context"
	"strconv"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Settings Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) GetSettings(ctx context.Context) (*Settings, error) {
	settings := &Settings{
		AITimeoutSeconds:        120,        // Default
		OllamaCapability:        "standard", // Default
		DefaultCampaignEnabled:  true,       // Default: show the default campaign
		RAGKnowledgeBaseEnabled: true,       // Default: RAG feature enabled
	}

	// Get registration_enabled setting
	query := `SELECT value FROM settings WHERE key = $1`
	var registrationValue string
	err := db.pool.QueryRow(ctx, query, "registration_enabled").Scan(&registrationValue)
	if err != nil && err != pgx.ErrNoRows {
		return nil, err
	}
	if err == nil {
		settings.RegistrationEnabled = registrationValue == "true"
	}

	// Get ai_timeout_seconds setting
	var timeoutValue string
	err = db.pool.QueryRow(ctx, query, "ai_timeout_seconds").Scan(&timeoutValue)
	if err == nil {
		if timeout, parseErr := strconv.Atoi(timeoutValue); parseErr == nil && timeout > 0 {
			settings.AITimeoutSeconds = timeout
		}
	}

	// Get ollama_capability setting
	var capabilityValue string
	err = db.pool.QueryRow(ctx, query, "ollama_capability").Scan(&capabilityValue)
	if err == nil && capabilityValue != "" {
		settings.OllamaCapability = capabilityValue
	}

	// Get ollama_url setting
	var ollamaURLValue string
	err = db.pool.QueryRow(ctx, query, "ollama_url").Scan(&ollamaURLValue)
	if err == nil && ollamaURLValue != "" {
		settings.OllamaURL = ollamaURLValue
	}

	// Get ui_settings (JSON string)
	var uiSettingsValue string
	err = db.pool.QueryRow(ctx, query, "ui_settings").Scan(&uiSettingsValue)
	if err == nil && uiSettingsValue != "" {
		settings.UISettings = []byte(uiSettingsValue)
	}

	// Get default_campaign_enabled setting
	var defaultCampaignEnabledValue string
	err = db.pool.QueryRow(ctx, query, "default_campaign_enabled").Scan(&defaultCampaignEnabledValue)
	if err == nil {
		settings.DefaultCampaignEnabled = defaultCampaignEnabledValue == "true"
	}

	// Get default_campaign_initialized setting
	var defaultCampaignInitializedValue string
	err = db.pool.QueryRow(ctx, query, "default_campaign_initialized").Scan(&defaultCampaignInitializedValue)
	if err == nil {
		settings.DefaultCampaignInitialized = defaultCampaignInitializedValue == "true"
	}

	// Get rag_knowledge_base_enabled setting
	var ragEnabledValue string
	err = db.pool.QueryRow(ctx, query, "rag_knowledge_base_enabled").Scan(&ragEnabledValue)
	if err == nil {
		settings.RAGKnowledgeBaseEnabled = ragEnabledValue == "true"
	}

	// Get enabled_setting_packs (JSON array)
	var enabledPacksValue string
	err = db.pool.QueryRow(ctx, query, "enabled_setting_packs").Scan(&enabledPacksValue)
	if err == nil && enabledPacksValue != "" {
		settings.EnabledSettingPacks = []byte(enabledPacksValue)
	}

	return settings, nil
}

func (db *PostgresDB) UpdateSettings(ctx context.Context, settings *Settings) error {
	registrationValue := "false"
	if settings.RegistrationEnabled {
		registrationValue = "true"
	}

	// Update registration_enabled
	if err := db.upsertSetting(ctx, "registration_enabled", registrationValue); err != nil {
		return err
	}

	// Update ai_timeout_seconds
	timeoutValue := strconv.Itoa(settings.AITimeoutSeconds)
	if err := db.upsertSetting(ctx, "ai_timeout_seconds", timeoutValue); err != nil {
		return err
	}

	// Update ollama_capability
	if settings.OllamaCapability != "" {
		if err := db.upsertSetting(ctx, "ollama_capability", settings.OllamaCapability); err != nil {
			return err
		}
	}

	// Update ollama_url
	if settings.OllamaURL != "" {
		if err := db.upsertSetting(ctx, "ollama_url", settings.OllamaURL); err != nil {
			return err
		}
	}

	// Update ui_settings if provided
	if len(settings.UISettings) > 0 {
		if err := db.upsertSetting(ctx, "ui_settings", string(settings.UISettings)); err != nil {
			return err
		}
	}

	// Update default_campaign_enabled
	defaultCampaignEnabledValue := "false"
	if settings.DefaultCampaignEnabled {
		defaultCampaignEnabledValue = "true"
	}
	if err := db.upsertSetting(ctx, "default_campaign_enabled", defaultCampaignEnabledValue); err != nil {
		return err
	}

	// Update default_campaign_initialized
	defaultCampaignInitializedValue := "false"
	if settings.DefaultCampaignInitialized {
		defaultCampaignInitializedValue = "true"
	}
	if err := db.upsertSetting(ctx, "default_campaign_initialized", defaultCampaignInitializedValue); err != nil {
		return err
	}

	// Update rag_knowledge_base_enabled
	ragEnabledValue := "false"
	if settings.RAGKnowledgeBaseEnabled {
		ragEnabledValue = "true"
	}
	if err := db.upsertSetting(ctx, "rag_knowledge_base_enabled", ragEnabledValue); err != nil {
		return err
	}

	// Update enabled_setting_packs if provided
	if len(settings.EnabledSettingPacks) > 0 {
		if err := db.upsertSetting(ctx, "enabled_setting_packs", string(settings.EnabledSettingPacks)); err != nil {
			return err
		}
	}

	return nil
}

// upsertSetting inserts or updates a setting key-value pair
func (db *PostgresDB) upsertSetting(ctx context.Context, key, value string) error {
	// PostgreSQL upsert using ON CONFLICT
	query := `
		INSERT INTO settings (key, value, updated_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`

	_, err := db.pool.Exec(ctx, query, key, value)
	return err
}
