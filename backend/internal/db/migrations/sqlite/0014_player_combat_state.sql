-- Migration 0014: Player Combat State Table
-- Tracks player-side combat state (HP, conditions, concentration, reaction)
-- This is separate from the GM combat tracker and allows players to track their own state

CREATE TABLE IF NOT EXISTS player_combat_state (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    is_in_combat INTEGER DEFAULT 0,
    current_hp INTEGER NOT NULL DEFAULT 0,
    max_hp INTEGER NOT NULL DEFAULT 0,
    temp_hp INTEGER DEFAULT 0,
    conditions TEXT DEFAULT '[]',
    concentration_spell TEXT,
    reaction_used INTEGER DEFAULT 0,
    initiative INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id)
);

CREATE INDEX IF NOT EXISTS idx_player_combat_user ON player_combat_state(user_id);
CREATE INDEX IF NOT EXISTS idx_player_combat_character ON player_combat_state(character_id);
CREATE INDEX IF NOT EXISTS idx_player_combat_campaign ON player_combat_state(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_combat_in_combat ON player_combat_state(is_in_combat);
