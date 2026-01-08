-- =============================================================================
-- TavKit SQLite Schema: Characters
-- =============================================================================
-- This file contains player character tables and campaign-character linking.
-- Run order: 04 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS campaign_characters;
DROP TABLE IF EXISTS characters;

-- Characters table (player characters, imported from D&D Beyond, etc.)
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 30),
    race TEXT NOT NULL,
    subrace TEXT,
    class_info TEXT NOT NULL,
    subclass TEXT,
    background TEXT,
    alignment TEXT,
    experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
    inspiration BOOLEAN NOT NULL DEFAULT 0,
    -- Ability scores
    strength INTEGER NOT NULL DEFAULT 10 CHECK (strength >= 1 AND strength <= 30),
    dexterity INTEGER NOT NULL DEFAULT 10 CHECK (dexterity >= 1 AND dexterity <= 30),
    constitution INTEGER NOT NULL DEFAULT 10 CHECK (constitution >= 1 AND constitution <= 30),
    intelligence INTEGER NOT NULL DEFAULT 10 CHECK (intelligence >= 1 AND intelligence <= 30),
    wisdom INTEGER NOT NULL DEFAULT 10 CHECK (wisdom >= 1 AND wisdom <= 30),
    charisma INTEGER NOT NULL DEFAULT 10 CHECK (charisma >= 1 AND charisma <= 30),
    -- Combat stats
    armor_class INTEGER NOT NULL DEFAULT 10,
    initiative INTEGER NOT NULL DEFAULT 0,
    speed INTEGER NOT NULL DEFAULT 30,
    speed_walking INTEGER,
    speed_flying INTEGER,
    speed_swimming INTEGER,
    speed_climbing INTEGER,
    speed_burrowing INTEGER,
    size TEXT,
    -- D&D Beyond integration
    dndbeyond_id TEXT,
    -- Hit points
    max_hit_points INTEGER NOT NULL DEFAULT 1,
    current_hit_points INTEGER NOT NULL DEFAULT 1,
    temp_hit_points INTEGER NOT NULL DEFAULT 0,
    hit_dice TEXT,
    hit_dice_total INTEGER NOT NULL DEFAULT 1,
    hit_dice_used INTEGER NOT NULL DEFAULT 0,
    -- Proficiency and passive scores
    proficiency_bonus INTEGER NOT NULL DEFAULT 2,
    passive_perception INTEGER NOT NULL DEFAULT 10,
    passive_insight INTEGER,
    passive_investigation INTEGER,
    -- Death saves and conditions
    death_save_successes INTEGER NOT NULL DEFAULT 0 CHECK (death_save_successes >= 0 AND death_save_successes <= 3),
    death_save_failures INTEGER NOT NULL DEFAULT 0 CHECK (death_save_failures >= 0 AND death_save_failures <= 3),
    exhaustion_level INTEGER NOT NULL DEFAULT 0 CHECK (exhaustion_level >= 0 AND exhaustion_level <= 6),
    conditions TEXT,
    -- Skills and proficiencies (stored as JSON)
    skills TEXT,
    saving_throws TEXT,
    proficiencies TEXT,
    languages TEXT,
    senses TEXT,
    -- Actions
    actions TEXT,
    bonus_actions TEXT,
    reactions TEXT,
    -- Spellcasting
    spellcasting_ability TEXT,
    spell_save_dc INTEGER,
    spell_attack_bonus INTEGER,
    spell_slots TEXT,
    prepared_spells TEXT,
    known_spells TEXT,
    cantrips TEXT,
    -- Equipment and inventory
    currency TEXT,
    weapons TEXT,
    armor TEXT,
    equipment TEXT,
    treasure TEXT,
    -- Features and traits
    features TEXT,
    racial_traits TEXT,
    feats TEXT,
    -- Roleplay
    personality_traits TEXT,
    ideals TEXT,
    bonds TEXT,
    flaws TEXT,
    appearance TEXT,
    backstory TEXT,
    allies_organizations TEXT,
    enemies TEXT,
    notes TEXT,
    -- Physical details
    age TEXT,
    height TEXT,
    weight TEXT,
    eyes TEXT,
    skin TEXT,
    hair TEXT,
    gender TEXT,
    faith TEXT,
    lifestyle TEXT,
    avatar TEXT,
    -- Metadata
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_characters_campaign ON characters(campaign_id);
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- Campaign Characters linking table (many-to-many relationship)
-- Allows a character to be linked to multiple campaigns
CREATE TABLE campaign_characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, character_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_campaign_characters_campaign ON campaign_characters(campaign_id);
CREATE INDEX idx_campaign_characters_character ON campaign_characters(character_id);
