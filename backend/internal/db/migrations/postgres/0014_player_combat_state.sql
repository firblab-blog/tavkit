-- Migration 0014: Player Combat State Table
-- Tracks player-side combat state (HP, conditions, concentration, reaction)
-- This is separate from the GM combat tracker and allows players to track their own state

CREATE TABLE player_combat_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    is_in_combat BOOLEAN DEFAULT false,
    current_hp INTEGER NOT NULL DEFAULT 0,
    max_hp INTEGER NOT NULL DEFAULT 0,
    temp_hp INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '[]',
    concentration_spell VARCHAR(255),
    reaction_used BOOLEAN DEFAULT false,
    initiative INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id)
);

CREATE INDEX idx_player_combat_user ON player_combat_state(user_id);
CREATE INDEX idx_player_combat_character ON player_combat_state(character_id);
CREATE INDEX idx_player_combat_campaign ON player_combat_state(campaign_id);
CREATE INDEX idx_player_combat_in_combat ON player_combat_state(is_in_combat);
