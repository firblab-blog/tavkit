-- Combat Sync Migration
-- Creates combat_settings table for real-time combat sync
-- Note: combat_encounters and combat_participants already have the needed columns
-- from the initial schema (0001), so we only need to create combat_settings here.

-- ============================================================================
-- COMBAT SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_settings (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL UNIQUE,
    default_visibility TEXT DEFAULT 'full',  -- 'full' | 'gm_controlled'
    allow_player_self_join INTEGER DEFAULT 1,
    auto_roll_initiative INTEGER DEFAULT 0,
    show_monster_names INTEGER DEFAULT 1,
    show_monster_hp INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
