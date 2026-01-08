-- =============================================================================
-- TavKit PostgreSQL Schema: Characters
-- =============================================================================
-- This file contains player character tables and campaign-character linking.
-- Run order: 04 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS campaign_characters CASCADE;
DROP TABLE IF EXISTS characters CASCADE;

-- Characters table (player characters, imported from D&D Beyond, etc.)
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 30),
    race VARCHAR(100) NOT NULL,
    subrace VARCHAR(100),
    class_info VARCHAR(200) NOT NULL,
    subclass VARCHAR(100),
    background VARCHAR(100),
    alignment VARCHAR(50),
    experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
    inspiration BOOLEAN NOT NULL DEFAULT false,
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
    size VARCHAR(20),
    -- D&D Beyond integration
    dndbeyond_id VARCHAR(50),
    -- Hit points
    max_hit_points INTEGER NOT NULL DEFAULT 1,
    current_hit_points INTEGER NOT NULL DEFAULT 1,
    temp_hit_points INTEGER NOT NULL DEFAULT 0,
    hit_dice VARCHAR(50),
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
    spellcasting_ability VARCHAR(10),
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
    age VARCHAR(50),
    height VARCHAR(50),
    weight VARCHAR(50),
    eyes VARCHAR(50),
    skin VARCHAR(50),
    hair VARCHAR(50),
    gender VARCHAR(50),
    faith VARCHAR(100),
    lifestyle VARCHAR(50),
    avatar TEXT,
    -- Metadata
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_characters_campaign ON characters(campaign_id);
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- Campaign Characters linking table (many-to-many relationship)
-- Allows a character to be linked to multiple campaigns
CREATE TABLE campaign_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, character_id)
);
CREATE INDEX idx_campaign_characters_campaign ON campaign_characters(campaign_id);
CREATE INDEX idx_campaign_characters_character ON campaign_characters(character_id);
