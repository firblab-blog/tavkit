-- Combat Sync Migration
-- Adds campaign binding, visibility controls, and settings for real-time combat sync

-- ============================================================================
-- COMBAT SETTINGS TABLE (new)
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    default_visibility TEXT DEFAULT 'full',  -- 'full' | 'gm_controlled'
    allow_player_self_join BOOLEAN DEFAULT TRUE,
    auto_roll_initiative BOOLEAN DEFAULT FALSE,
    show_monster_names BOOLEAN DEFAULT TRUE,
    show_monster_hp BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMBAT ENCOUNTERS TABLE MODIFICATIONS
-- ============================================================================

-- Add campaign_id column (link combat to campaign for sync)
ALTER TABLE combat_encounters ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

-- Add visibility_mode column
ALTER TABLE combat_encounters ADD COLUMN IF NOT EXISTS visibility_mode TEXT DEFAULT 'full';

-- Add is_active column for quick lookup of active combats
ALTER TABLE combat_encounters ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_combat_encounters_campaign ON combat_encounters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_campaign_active ON combat_encounters(campaign_id, is_active);

-- ============================================================================
-- COMBAT PARTICIPANTS TABLE MODIFICATIONS
-- ============================================================================

-- Add owner_user_id to track which user controls this participant (for PCs)
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add visibility controls
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS is_visible_to_players BOOLEAN DEFAULT TRUE;
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS show_hp_to_players BOOLEAN DEFAULT TRUE;
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS show_conditions_to_players BOOLEAN DEFAULT TRUE;

-- Add initiative_roll to store the raw d20 roll (separate from total initiative)
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS initiative_roll INTEGER;

-- Create index for owner lookup
CREATE INDEX IF NOT EXISTS idx_combat_participants_owner ON combat_participants(owner_user_id);
