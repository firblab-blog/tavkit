-- User context table for persisting user preferences and last active context
-- This enables "continue where you left off" functionality and onboarding tracking
CREATE TABLE IF NOT EXISTS user_context (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Last active context
    last_context_type TEXT CHECK (last_context_type IN ('gm_campaign', 'player_campaign', 'library')),
    last_campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    last_character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,

    -- First-time user flag
    has_completed_onboarding INTEGER DEFAULT 0,

    -- Preferences
    default_game_system TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_user_context_user_id ON user_context(user_id);
