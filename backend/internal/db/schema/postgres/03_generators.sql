-- =============================================================================
-- TavKit PostgreSQL Schema: Content Generators
-- =============================================================================
-- This file contains all AI-generated content tables (NPCs, monsters, items, etc.)
-- Run order: 03 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS critters CASCADE;
DROP TABLE IF EXISTS traps CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS taverns CASCADE;
DROP TABLE IF EXISTS rumors CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS dialogues CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS monsters CASCADE;
DROP TABLE IF EXISTS npcs CASCADE;

-- NPCs table
CREATE TABLE npcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    race VARCHAR(50),
    class VARCHAR(50),
    personality TEXT,
    backstory TEXT,
    stats TEXT,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_npcs_campaign ON npcs(campaign_id);
CREATE INDEX idx_npcs_user_id ON npcs(user_id);

-- Monsters table
CREATE TABLE monsters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    cr REAL NOT NULL DEFAULT 0,
    stats TEXT,
    lore TEXT,
    tactics TEXT,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_monsters_campaign ON monsters(campaign_id);
CREATE INDEX idx_monsters_user_id ON monsters(user_id);

-- Encounters table
CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    party_level INTEGER NOT NULL CHECK (party_level >= 1 AND party_level <= 30),
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly', 'custom')),
    description TEXT,
    environment TEXT,
    creatures TEXT,
    treasure TEXT,
    xp_total INTEGER CHECK (xp_total >= 0),
    xp_per_player INTEGER CHECK (xp_per_player >= 0),
    notes TEXT,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_encounters_campaign ON encounters(campaign_id);
CREATE INDEX idx_encounters_user_id ON encounters(user_id);

-- Dialogues table
CREATE TABLE dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    character_name VARCHAR(100) NOT NULL,
    scene_setting TEXT,
    mood VARCHAR(100),
    dialogue_tree TEXT,
    skill_checks TEXT,
    information TEXT,
    potential_quests TEXT,
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dialogues_campaign ON dialogues(campaign_id);
CREATE INDEX idx_dialogues_user_id ON dialogues(user_id);

-- Locations table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('settlement', 'dungeon', 'tavern', 'shop', 'temple', 'wilderness', 'ruins', 'lair', 'other')),
    theme VARCHAR(100),
    description TEXT,
    features TEXT,
    secrets TEXT,
    factions TEXT,
    npcs TEXT,
    encounters TEXT,
    map TEXT,
    parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_locations_campaign ON locations(campaign_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);

-- Quests table
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('main', 'side', 'faction', 'timed', 'personal', 'other')),
    category VARCHAR(100),
    description TEXT,
    objectives TEXT,
    rewards TEXT,
    complications TEXT,
    npcs_involved TEXT,
    locations_involved TEXT,
    faction_alignment VARCHAR(100),
    party_level INTEGER CHECK (party_level IS NULL OR (party_level >= 1 AND party_level <= 30)),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'abandoned')),
    moral_ambiguity BOOLEAN,
    combat_intensity VARCHAR(50) CHECK (combat_intensity IS NULL OR combat_intensity IN ('none', 'light', 'medium', 'heavy')),
    time_limit VARCHAR(100),
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_quests_campaign ON quests(campaign_id);
CREATE INDEX idx_quests_user_id ON quests(user_id);

-- Items table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('weapon', 'armor', 'consumable', 'treasure', 'tool', 'quest_item', 'relic', 'wondrous', 'other')),
    rarity VARCHAR(50) CHECK (rarity IS NULL OR rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
    description TEXT,
    properties TEXT,
    origin TEXT,
    previous_owner TEXT,
    complication TEXT,
    value INTEGER,
    weight REAL,
    attunement BOOLEAN,
    location_found TEXT,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_items_campaign ON items(campaign_id);
CREATE INDEX idx_items_user_id ON items(user_id);

-- Rumors table
CREATE TABLE rumors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    source TEXT,
    veracity TEXT NOT NULL CHECK (veracity IN ('true', 'partially_true', 'false', 'unknown')),
    leads_to TEXT,
    related_id UUID,
    context TEXT,
    foreshadowing BOOLEAN,
    tags TEXT,
    revealed BOOLEAN NOT NULL DEFAULT false,
    summary TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rumors_campaign ON rumors(campaign_id);
CREATE INDEX idx_rumors_user_id ON rumors(user_id);

-- Taverns table
CREATE TABLE taverns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('tavern', 'inn', 'pub', 'alehouse', 'roadhouse', 'brewery', 'other')),
    atmosphere TEXT,
    description TEXT,
    keeper_name VARCHAR(100) NOT NULL,
    keeper_personality TEXT NOT NULL,
    keeper_description TEXT,
    menu_food TEXT,
    menu_drinks TEXT,
    rooms TEXT,
    patrons TEXT,
    events TEXT,
    rumors TEXT,
    special_notes TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_taverns_campaign ON taverns(campaign_id);
CREATE INDEX idx_taverns_user_id ON taverns(user_id);

-- Merchants table
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    shop_type VARCHAR(100) NOT NULL,
    atmosphere TEXT,
    description TEXT,
    location TEXT,
    owner_name VARCHAR(100) NOT NULL,
    owner_personality TEXT NOT NULL,
    owner_description TEXT,
    inventory TEXT,
    services TEXT,
    special_items TEXT,
    rumors TEXT,
    recently_sold TEXT,
    special_notes TEXT,
    haggle_willingness VARCHAR(50) CHECK (haggle_willingness IS NULL OR haggle_willingness IN ('never', 'rarely', 'sometimes', 'often', 'always')),
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_merchants_campaign ON merchants(campaign_id);
CREATE INDEX idx_merchants_user_id ON merchants(user_id);

-- Traps table
CREATE TABLE traps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    trap_type VARCHAR(50) NOT NULL CHECK (trap_type IN ('mechanical', 'magical', 'puzzle', 'combination', 'environmental', 'other')),
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly', 'custom')),
    description TEXT,
    environment TEXT,
    trigger TEXT,
    effect TEXT,
    damage TEXT,
    detection TEXT,
    solution_paths TEXT,
    complications TEXT,
    rewards TEXT,
    scaling TEXT,
    dm_notes TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_traps_campaign ON traps(campaign_id);
CREATE INDEX idx_traps_user_id ON traps(user_id);

-- Critters table
CREATE TABLE critters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(100),
    critter_type VARCHAR(50) NOT NULL CHECK (critter_type IN ('bird', 'mammal', 'reptile', 'amphibian', 'fish', 'insect', 'magical', 'elemental', 'aberration', 'other')),
    size VARCHAR(50) NOT NULL CHECK (size IN ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan')),
    temperament VARCHAR(100),
    habitat TEXT,
    description TEXT,
    behavior TEXT,
    stats TEXT,
    special_abilities TEXT,
    uses TEXT,
    training_difficulty VARCHAR(50),
    diet VARCHAR(100),
    lifespan VARCHAR(100),
    interesting_facts TEXT,
    encounter_notes TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_critters_campaign ON critters(campaign_id);
CREATE INDEX idx_critters_user_id ON critters(user_id);
