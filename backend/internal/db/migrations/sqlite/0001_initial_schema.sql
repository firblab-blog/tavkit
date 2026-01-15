-- =============================================================================
-- TavKit SQLite Migration: Initial Schema
-- =============================================================================
-- This migration creates all initial tables for TavKit.
-- Uses CREATE TABLE IF NOT EXISTS to be safe for existing databases.
-- =============================================================================

-- =============================================================================
-- USERS & SETTINGS (from 01_users.sql)
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    game_system TEXT NOT NULL DEFAULT 'Dungeons & Dragons 5th Edition',
    display_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tools table (user-configured external tools)
CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    config TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id);

-- Containers table (workspace tabs)
CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    tool TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_containers_user_id ON containers(user_id);

-- Kits table (saved workspace configurations)
CREATE TABLE IF NOT EXISTS kits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    containers TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kits_user_id ON kits(user_id);

-- Settings table (application-wide key-value settings)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_enabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_timeout_seconds', '120');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ui_settings', '{"icon_set":"lucide","toolbar_position":"top","enabled_tools":{"dnd5etools":true,"dndbeyond":false,"roll20":false,"foundryvtt":false}}');

-- =============================================================================
-- CAMPAIGNS & CAMPAIGN CONTENT (from 02_campaigns.sql)
-- =============================================================================

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    game_system TEXT NOT NULL DEFAULT 'Dungeons & Dragons 5th Edition',
    theme TEXT,
    tone TEXT,
    setting TEXT,
    factions TEXT,
    history TEXT,
    magic_level TEXT,
    tech_level TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Campaign content table (user-created lore, notes, etc.)
CREATE TABLE IF NOT EXISTS campaign_content (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    section TEXT NOT NULL,
    subsection TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    file_name TEXT,
    summary TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign ON campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_section ON campaign_content(campaign_id, section, subsection);
CREATE INDEX IF NOT EXISTS idx_campaign_content_user_id ON campaign_content(user_id);

-- Campaign summaries table (AI-generated summaries)
CREATE TABLE IF NOT EXISTS campaign_summaries (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    overview TEXT,
    setting_summary TEXT,
    characters_summary TEXT,
    plot_summary TEXT,
    tone_summary TEXT,
    content_stats TEXT,
    section_summaries TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_summaries_campaign_id ON campaign_summaries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_summaries_user_id ON campaign_summaries(user_id);

-- Campaign content status table (tracks status of generator content per campaign)
CREATE TABLE IF NOT EXISTS campaign_content_status (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    defeated BOOLEAN NOT NULL DEFAULT 0,
    visited BOOLEAN NOT NULL DEFAULT 0,
    obtained BOOLEAN NOT NULL DEFAULT 0,
    heard BOOLEAN NOT NULL DEFAULT 0,
    triggered BOOLEAN NOT NULL DEFAULT 0,
    encountered BOOLEAN NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT 0,
    relationship_notes TEXT,
    status_data TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_content_status_campaign ON campaign_content_status(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_status_lookup ON campaign_content_status(campaign_id, content_type, content_id);

-- Campaign fact cache table (stores extracted facts per content item for incremental updates)
CREATE TABLE IF NOT EXISTS campaign_fact_cache (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    facts TEXT NOT NULL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_fact_cache_lookup ON campaign_fact_cache(campaign_id, content_type);

-- Summary generation jobs table (tracks async generation progress)
CREATE TABLE IF NOT EXISTS summary_generation_jobs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_stage TEXT,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_summary_jobs_campaign ON summary_generation_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_summary_jobs_status ON summary_generation_jobs(status);

-- =============================================================================
-- CONTENT GENERATORS (from 03_generators.sql)
-- =============================================================================

-- NPCs table
CREATE TABLE IF NOT EXISTS npcs (
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
CREATE INDEX IF NOT EXISTS idx_npcs_campaign ON npcs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_user_id ON npcs(user_id);

-- Monsters table
CREATE TABLE IF NOT EXISTS monsters (
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
CREATE INDEX IF NOT EXISTS idx_monsters_campaign ON monsters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_monsters_user_id ON monsters(user_id);

-- Encounters table
CREATE TABLE IF NOT EXISTS encounters (
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
CREATE INDEX IF NOT EXISTS idx_encounters_campaign ON encounters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_encounters_user_id ON encounters(user_id);

-- Dialogues table
CREATE TABLE IF NOT EXISTS dialogues (
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
CREATE INDEX IF NOT EXISTS idx_dialogues_campaign ON dialogues(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_user_id ON dialogues(user_id);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
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
CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
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
CREATE INDEX IF NOT EXISTS idx_quests_campaign ON quests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id);

-- Items table
CREATE TABLE IF NOT EXISTS items (
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
CREATE INDEX IF NOT EXISTS idx_items_campaign ON items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);

-- Rumors table
CREATE TABLE IF NOT EXISTS rumors (
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
CREATE INDEX IF NOT EXISTS idx_rumors_campaign ON rumors(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rumors_user_id ON rumors(user_id);

-- Taverns table
CREATE TABLE IF NOT EXISTS taverns (
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
CREATE INDEX IF NOT EXISTS idx_taverns_campaign ON taverns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_taverns_user_id ON taverns(user_id);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
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
CREATE INDEX IF NOT EXISTS idx_merchants_campaign ON merchants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);

-- Traps table
CREATE TABLE IF NOT EXISTS traps (
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
CREATE INDEX IF NOT EXISTS idx_traps_campaign ON traps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_traps_user_id ON traps(user_id);

-- Critters table
CREATE TABLE IF NOT EXISTS critters (
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
CREATE INDEX IF NOT EXISTS idx_critters_campaign ON critters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_critters_user_id ON critters(user_id);

-- =============================================================================
-- CHARACTERS (from 04_characters.sql)
-- =============================================================================

-- Characters table (player characters, imported from D&D Beyond, etc.)
CREATE TABLE IF NOT EXISTS characters (
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
    strength INTEGER NOT NULL DEFAULT 10 CHECK (strength >= 1 AND strength <= 30),
    dexterity INTEGER NOT NULL DEFAULT 10 CHECK (dexterity >= 1 AND dexterity <= 30),
    constitution INTEGER NOT NULL DEFAULT 10 CHECK (constitution >= 1 AND constitution <= 30),
    intelligence INTEGER NOT NULL DEFAULT 10 CHECK (intelligence >= 1 AND intelligence <= 30),
    wisdom INTEGER NOT NULL DEFAULT 10 CHECK (wisdom >= 1 AND wisdom <= 30),
    charisma INTEGER NOT NULL DEFAULT 10 CHECK (charisma >= 1 AND charisma <= 30),
    armor_class INTEGER NOT NULL DEFAULT 10,
    initiative INTEGER NOT NULL DEFAULT 0,
    speed INTEGER NOT NULL DEFAULT 30,
    speed_walking INTEGER,
    speed_flying INTEGER,
    speed_swimming INTEGER,
    speed_climbing INTEGER,
    speed_burrowing INTEGER,
    size TEXT,
    dndbeyond_id TEXT,
    max_hit_points INTEGER NOT NULL DEFAULT 1,
    current_hit_points INTEGER NOT NULL DEFAULT 1,
    temp_hit_points INTEGER NOT NULL DEFAULT 0,
    hit_dice TEXT,
    hit_dice_total INTEGER NOT NULL DEFAULT 1,
    hit_dice_used INTEGER NOT NULL DEFAULT 0,
    proficiency_bonus INTEGER NOT NULL DEFAULT 2,
    passive_perception INTEGER NOT NULL DEFAULT 10,
    passive_insight INTEGER,
    passive_investigation INTEGER,
    death_save_successes INTEGER NOT NULL DEFAULT 0 CHECK (death_save_successes >= 0 AND death_save_successes <= 3),
    death_save_failures INTEGER NOT NULL DEFAULT 0 CHECK (death_save_failures >= 0 AND death_save_failures <= 3),
    exhaustion_level INTEGER NOT NULL DEFAULT 0 CHECK (exhaustion_level >= 0 AND exhaustion_level <= 6),
    conditions TEXT,
    skills TEXT,
    saving_throws TEXT,
    proficiencies TEXT,
    languages TEXT,
    senses TEXT,
    actions TEXT,
    bonus_actions TEXT,
    reactions TEXT,
    spellcasting_ability TEXT,
    spell_save_dc INTEGER,
    spell_attack_bonus INTEGER,
    spell_slots TEXT,
    prepared_spells TEXT,
    known_spells TEXT,
    cantrips TEXT,
    currency TEXT,
    weapons TEXT,
    armor TEXT,
    equipment TEXT,
    treasure TEXT,
    features TEXT,
    racial_traits TEXT,
    feats TEXT,
    personality_traits TEXT,
    ideals TEXT,
    bonds TEXT,
    flaws TEXT,
    appearance TEXT,
    backstory TEXT,
    allies_organizations TEXT,
    enemies TEXT,
    notes TEXT,
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
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);

-- Campaign Characters linking table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS campaign_characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, character_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_campaign ON campaign_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_character ON campaign_characters(character_id);

-- =============================================================================
-- SESSIONS & COMBAT (from 05_sessions.sql)
-- =============================================================================

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_type TEXT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_minutes INTEGER,
    summary TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON sessions(campaign_id);

-- Session events table
CREATE TABLE IF NOT EXISTS session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    round INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor TEXT,
    action TEXT NOT NULL,
    details TEXT,
    outcome TEXT,
    important BOOLEAN DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Combat encounters table
CREATE TABLE IF NOT EXISTS combat_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    campaign_id TEXT,
    encounter_id TEXT,
    name TEXT,
    current_round INTEGER DEFAULT 1 CHECK (current_round >= 0),
    current_turn INTEGER DEFAULT 0 CHECK (current_turn >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    difficulty TEXT,
    environment TEXT,
    notes TEXT,
    visibility_mode TEXT DEFAULT 'full',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_campaign ON combat_encounters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_campaign_active ON combat_encounters(campaign_id, is_active);

-- Combat participants table
CREATE TABLE IF NOT EXISTS combat_participants (
    id TEXT PRIMARY KEY,
    combat_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('pc', 'npc', 'monster', 'ally', 'other')),
    character_id TEXT,
    npc_id TEXT,
    monster_id TEXT,
    owner_user_id TEXT,
    name TEXT NOT NULL,
    max_hp INTEGER DEFAULT 1 CHECK (max_hp >= 1),
    ac INTEGER DEFAULT 10 CHECK (ac >= 0),
    stats_snapshot TEXT,
    abilities_snapshot TEXT,
    initiative INTEGER DEFAULT 0,
    initiative_bonus INTEGER DEFAULT 0,
    initiative_roll INTEGER,
    current_hp INTEGER DEFAULT 1,
    temp_hp INTEGER DEFAULT 0 CHECK (temp_hp >= 0),
    passive_perception INTEGER,
    conditions TEXT,
    concentration_spell TEXT,
    death_saves TEXT,
    is_surprised BOOLEAN DEFAULT 0,
    has_reaction BOOLEAN DEFAULT 1,
    legendary_actions_used INTEGER DEFAULT 0,
    legendary_actions_max INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    is_visible_to_players BOOLEAN DEFAULT 1,
    show_hp_to_players BOOLEAN DEFAULT 1,
    show_conditions_to_players BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (combat_id) REFERENCES combat_encounters(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_combat_participants_combat ON combat_participants(combat_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_owner ON combat_participants(owner_user_id);

-- Combat conditions table
CREATE TABLE IF NOT EXISTS combat_conditions (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    condition_name TEXT NOT NULL,
    duration INTEGER,
    source TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES combat_participants(id) ON DELETE CASCADE
);

-- Social encounters table
CREATE TABLE IF NOT EXISTS social_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    npc_id TEXT,
    npc_name TEXT,
    disposition TEXT DEFAULT 'neutral' CHECK (disposition IN ('hostile', 'unfriendly', 'neutral', 'friendly', 'helpful')),
    current_attitude INTEGER DEFAULT 0 CHECK (current_attitude >= -5 AND current_attitude <= 5),
    goals TEXT,
    secrets TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'success', 'failure', 'abandoned')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_social_encounters_session ON social_encounters(session_id);

-- Social checks table
CREATE TABLE IF NOT EXISTS social_checks (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    dc INTEGER DEFAULT 10,
    result INTEGER,
    success BOOLEAN,
    attitude_change INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES social_encounters(id) ON DELETE CASCADE
);

-- Tavern encounters table
CREATE TABLE IF NOT EXISTS tavern_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tavern_id TEXT,
    tavern_name TEXT,
    time_of_day TEXT DEFAULT 'evening' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'late_night')),
    atmosphere TEXT,
    active_events TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tavern_encounters_session ON tavern_encounters(session_id);

-- Patron interactions table
CREATE TABLE IF NOT EXISTS patron_interactions (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    patron_name TEXT NOT NULL,
    patron_description TEXT,
    disposition TEXT DEFAULT 'neutral',
    conversation_notes TEXT,
    secrets_revealed TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES tavern_encounters(id) ON DELETE CASCADE
);

-- Rumor tracking table
CREATE TABLE IF NOT EXISTS rumor_tracking (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    rumor_id TEXT,
    rumor_content TEXT,
    source TEXT,
    is_verified BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES tavern_encounters(id) ON DELETE CASCADE
);

-- Tavern tabs table
CREATE TABLE IF NOT EXISTS tavern_tabs (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    character_name TEXT NOT NULL,
    items TEXT,
    total_cost INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES tavern_encounters(id) ON DELETE CASCADE
);

-- Shopping encounters table
CREATE TABLE IF NOT EXISTS shopping_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    merchant_id TEXT,
    merchant_name TEXT,
    shop_type TEXT,
    available_gold INTEGER DEFAULT 0 CHECK (available_gold >= 0),
    discount_modifier REAL DEFAULT 1.0 CHECK (discount_modifier >= 0),
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_shopping_encounters_session ON shopping_encounters(session_id);

-- Shopping cart table
CREATE TABLE IF NOT EXISTS shopping_cart (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT,
    base_price INTEGER DEFAULT 0 CHECK (base_price >= 0),
    final_price INTEGER DEFAULT 0 CHECK (final_price >= 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    is_purchased BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES shopping_encounters(id) ON DELETE CASCADE
);

-- Haggling sessions table
CREATE TABLE IF NOT EXISTS haggling_sessions (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    item_id TEXT,
    starting_price INTEGER DEFAULT 0 CHECK (starting_price >= 0),
    current_offer INTEGER DEFAULT 0 CHECK (current_offer >= 0),
    merchant_minimum INTEGER DEFAULT 0 CHECK (merchant_minimum >= 0),
    rounds INTEGER DEFAULT 0 CHECK (rounds >= 0),
    skill_checks TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'success', 'failed', 'abandoned')),
    final_price INTEGER CHECK (final_price IS NULL OR final_price >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES shopping_encounters(id) ON DELETE CASCADE
);

-- =============================================================================
-- CHASE SYSTEM (from 06_chases.sql)
-- =============================================================================

-- Chases table
CREATE TABLE IF NOT EXISTS chases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    chase_type TEXT NOT NULL CHECK (chase_type IN ('foot_chase', 'mounted_chase', 'vehicle_chase', 'aerial_chase', 'aquatic_chase', 'other')),
    terrain TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'challenging', 'hard', 'extreme')),
    description TEXT,
    setting TEXT,
    participants TEXT,
    starting_conditions TEXT,
    obstacles TEXT,
    complications TEXT,
    shortcuts TEXT,
    chase_phases TEXT,
    ending_conditions TEXT,
    rewards TEXT,
    special_rules TEXT,
    environmental_factors TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    ai_provider TEXT,
    current_round INTEGER NOT NULL DEFAULT 0 CHECK (current_round >= 0),
    max_rounds INTEGER CHECK (max_rounds IS NULL OR max_rounds >= 1),
    starting_distance INTEGER NOT NULL DEFAULT 3 CHECK (starting_distance >= 0),
    current_distance INTEGER NOT NULL DEFAULT 3 CHECK (current_distance >= 0),
    catch_threshold INTEGER NOT NULL DEFAULT 0 CHECK (catch_threshold >= 0),
    escape_threshold INTEGER NOT NULL DEFAULT 7 CHECK (escape_threshold >= 0),
    status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'completed')),
    outcome TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_chases_campaign ON chases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_chases_user_id ON chases(user_id);

-- Chase participants table
CREATE TABLE IF NOT EXISTS chase_participants (
    id TEXT PRIMARY KEY,
    chase_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('pc', 'npc')),
    character_id TEXT,
    npc_id TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('pursuer', 'quarry')),
    movement_speed INTEGER NOT NULL DEFAULT 30 CHECK (movement_speed >= 0),
    current_position INTEGER NOT NULL DEFAULT 0 CHECK (current_position >= 0),
    stamina INTEGER NOT NULL DEFAULT 3 CHECK (stamina >= 0),
    max_stamina INTEGER NOT NULL DEFAULT 3 CHECK (max_stamina >= 1),
    has_dashed BOOLEAN NOT NULL DEFAULT 0,
    conditions TEXT,
    movement_this_round INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chase_id) REFERENCES chases(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_chase_participants_chase ON chase_participants(chase_id);

-- Chase challenges table
CREATE TABLE IF NOT EXISTS chase_challenges (
    id TEXT PRIMARY KEY,
    chase_id TEXT NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 0),
    description TEXT NOT NULL,
    skill TEXT NOT NULL,
    dc INTEGER NOT NULL CHECK (dc >= 1 AND dc <= 40),
    success_effect TEXT NOT NULL,
    failure_effect TEXT NOT NULL,
    alternate_skills TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chase_id) REFERENCES chases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chase_challenges_chase ON chase_challenges(chase_id);

-- Chase complications table
CREATE TABLE IF NOT EXISTS chase_complications (
    id TEXT PRIMARY KEY,
    chase_id TEXT NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 0),
    description TEXT NOT NULL,
    complication_type TEXT NOT NULL CHECK (complication_type IN ('obstacle', 'hazard', 'bystander', 'terrain_change', 'reinforcement', 'other')),
    effect TEXT,
    save_ability TEXT,
    save_dc INTEGER,
    resolved BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chase_id) REFERENCES chases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chase_complications_chase ON chase_complications(chase_id);

-- Chase events table
CREATE TABLE IF NOT EXISTS chase_events (
    id TEXT PRIMARY KEY,
    chase_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    participant_name TEXT,
    action TEXT NOT NULL,
    roll INTEGER,
    success BOOLEAN,
    effect TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chase_id) REFERENCES chases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chase_events_chase ON chase_events(chase_id);

-- Chase templates table
CREATE TABLE IF NOT EXISTS chase_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    chase_type TEXT,
    terrain TEXT,
    default_complications TEXT,
    default_challenges TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
