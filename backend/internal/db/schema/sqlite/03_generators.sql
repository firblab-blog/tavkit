-- =============================================================================
-- TavKit SQLite Schema: Content Generators
-- =============================================================================
-- This file contains all AI-generated content tables (NPCs, monsters, items, etc.)
-- Run order: 03 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS critters;
DROP TABLE IF EXISTS traps;
DROP TABLE IF EXISTS merchants;
DROP TABLE IF EXISTS taverns;
DROP TABLE IF EXISTS rumors;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS dialogues;
DROP TABLE IF EXISTS encounters;
DROP TABLE IF EXISTS monsters;
DROP TABLE IF EXISTS npcs;

-- NPCs table
CREATE TABLE npcs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    race TEXT,
    class TEXT,
    personality TEXT,
    backstory TEXT,
    stats TEXT,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_npcs_campaign ON npcs(campaign_id);
CREATE INDEX idx_npcs_user_id ON npcs(user_id);

-- Monsters table
CREATE TABLE monsters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    cr REAL NOT NULL DEFAULT 0,
    stats TEXT,
    lore TEXT,
    tactics TEXT,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_monsters_campaign ON monsters(campaign_id);
CREATE INDEX idx_monsters_user_id ON monsters(user_id);

-- Encounters table
CREATE TABLE encounters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    party_level INTEGER NOT NULL CHECK (party_level >= 1 AND party_level <= 30),
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly', 'custom')),
    description TEXT,
    environment TEXT,
    creatures TEXT,
    treasure TEXT,
    xp_total INTEGER CHECK (xp_total IS NULL OR xp_total >= 0),
    xp_per_player INTEGER CHECK (xp_per_player IS NULL OR xp_per_player >= 0),
    notes TEXT,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_encounters_campaign ON encounters(campaign_id);
CREATE INDEX idx_encounters_user_id ON encounters(user_id);

-- Dialogues table
CREATE TABLE dialogues (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    character_name TEXT NOT NULL,
    scene_setting TEXT,
    mood TEXT,
    dialogue_tree TEXT,
    skill_checks TEXT,
    information TEXT,
    potential_quests TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_dialogues_campaign ON dialogues(campaign_id);
CREATE INDEX idx_dialogues_user_id ON dialogues(user_id);

-- Locations table
CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('settlement', 'dungeon', 'tavern', 'shop', 'temple', 'wilderness', 'ruins', 'lair', 'other')),
    theme TEXT,
    description TEXT,
    features TEXT,
    secrets TEXT,
    factions TEXT,
    npcs TEXT,
    encounters TEXT,
    map TEXT,
    parent_id TEXT,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
);
CREATE INDEX idx_locations_campaign ON locations(campaign_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);

-- Quests table
CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('main', 'side', 'faction', 'timed', 'personal', 'other')),
    category TEXT,
    description TEXT,
    objectives TEXT,
    rewards TEXT,
    complications TEXT,
    npcs_involved TEXT,
    locations_involved TEXT,
    faction_alignment TEXT,
    party_level INTEGER CHECK (party_level IS NULL OR (party_level >= 1 AND party_level <= 30)),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'abandoned')),
    moral_ambiguity BOOLEAN,
    combat_intensity TEXT CHECK (combat_intensity IS NULL OR combat_intensity IN ('none', 'light', 'medium', 'heavy')),
    time_limit TEXT,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_quests_campaign ON quests(campaign_id);
CREATE INDEX idx_quests_user_id ON quests(user_id);

-- Items table
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'consumable', 'treasure', 'tool', 'quest_item', 'relic', 'wondrous', 'other')),
    rarity TEXT CHECK (rarity IS NULL OR rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
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
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_items_campaign ON items(campaign_id);
CREATE INDEX idx_items_user_id ON items(user_id);

-- Rumors table
CREATE TABLE rumors (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    text TEXT NOT NULL,
    source TEXT,
    veracity TEXT NOT NULL CHECK (veracity IN ('true', 'partially_true', 'false', 'unknown')),
    leads_to TEXT,
    related_id TEXT,
    context TEXT,
    foreshadowing BOOLEAN,
    tags TEXT,
    revealed BOOLEAN NOT NULL DEFAULT 0,
    summary TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_rumors_campaign ON rumors(campaign_id);
CREATE INDEX idx_rumors_user_id ON rumors(user_id);

-- Taverns table
CREATE TABLE taverns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tavern', 'inn', 'pub', 'alehouse', 'roadhouse', 'brewery', 'other')),
    atmosphere TEXT,
    description TEXT,
    keeper_name TEXT NOT NULL,
    keeper_personality TEXT NOT NULL,
    keeper_description TEXT,
    menu_food TEXT,
    menu_drinks TEXT,
    rooms TEXT,
    patrons TEXT,
    events TEXT,
    rumors TEXT,
    special_notes TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_taverns_campaign ON taverns(campaign_id);
CREATE INDEX idx_taverns_user_id ON taverns(user_id);

-- Merchants table
CREATE TABLE merchants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    shop_type TEXT NOT NULL,
    atmosphere TEXT,
    description TEXT,
    location TEXT,
    owner_name TEXT NOT NULL,
    owner_personality TEXT NOT NULL,
    owner_description TEXT,
    inventory TEXT,
    services TEXT,
    special_items TEXT,
    rumors TEXT,
    recently_sold TEXT,
    special_notes TEXT,
    haggle_willingness TEXT CHECK (haggle_willingness IS NULL OR haggle_willingness IN ('never', 'rarely', 'sometimes', 'often', 'always')),
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_merchants_campaign ON merchants(campaign_id);
CREATE INDEX idx_merchants_user_id ON merchants(user_id);

-- Traps table
CREATE TABLE traps (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    trap_type TEXT NOT NULL CHECK (trap_type IN ('mechanical', 'magical', 'puzzle', 'combination', 'environmental', 'other')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly', 'custom')),
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
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_traps_campaign ON traps(campaign_id);
CREATE INDEX idx_traps_user_id ON traps(user_id);

-- Critters table
CREATE TABLE critters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    species TEXT,
    critter_type TEXT NOT NULL CHECK (critter_type IN ('bird', 'mammal', 'reptile', 'amphibian', 'fish', 'insect', 'magical', 'elemental', 'aberration', 'other')),
    size TEXT NOT NULL CHECK (size IN ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan')),
    temperament TEXT,
    habitat TEXT,
    description TEXT,
    behavior TEXT,
    stats TEXT,
    special_abilities TEXT,
    uses TEXT,
    training_difficulty TEXT,
    diet TEXT,
    lifespan TEXT,
    interesting_facts TEXT,
    encounter_notes TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX idx_critters_campaign ON critters(campaign_id);
CREATE INDEX idx_critters_user_id ON critters(user_id);
