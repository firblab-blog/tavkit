-- =============================================================================
-- TavKit SQLite Schema: Sessions & Combat
-- =============================================================================
-- This file contains session management, combat, social, and encounter tables.
-- Run order: 05 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS haggling_sessions;
DROP TABLE IF EXISTS shopping_cart;
DROP TABLE IF EXISTS shopping_encounters;
DROP TABLE IF EXISTS tavern_tabs;
DROP TABLE IF EXISTS rumor_tracking;
DROP TABLE IF EXISTS patron_interactions;
DROP TABLE IF EXISTS tavern_encounters;
DROP TABLE IF EXISTS social_checks;
DROP TABLE IF EXISTS social_encounters;
DROP TABLE IF EXISTS combat_conditions;
DROP TABLE IF EXISTS combat_participants;
DROP TABLE IF EXISTS combat_encounters;
DROP TABLE IF EXISTS session_events;
DROP TABLE IF EXISTS sessions;

-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_type TEXT, -- 'chase', 'combat', 'social', 'tavern', 'shopping'
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
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);

-- Session events table
CREATE TABLE session_events (
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

-- =============================================================================
-- COMBAT SYSTEM
-- =============================================================================

-- Combat encounters table
CREATE TABLE combat_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT,
    current_round INTEGER DEFAULT 1 CHECK (current_round >= 0),
    current_turn INTEGER DEFAULT 0 CHECK (current_turn >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    environment TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX idx_combat_encounters_session ON combat_encounters(session_id);

-- Combat participants table
CREATE TABLE combat_participants (
    id TEXT PRIMARY KEY,
    combat_id TEXT NOT NULL,
    name TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('pc', 'npc', 'monster', 'ally', 'other')),
    initiative INTEGER DEFAULT 0,
    initiative_modifier INTEGER DEFAULT 0,
    armor_class INTEGER DEFAULT 10 CHECK (armor_class >= 0),
    max_hp INTEGER DEFAULT 1 CHECK (max_hp >= 1),
    current_hp INTEGER DEFAULT 1,
    temp_hp INTEGER DEFAULT 0 CHECK (temp_hp >= 0),
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    source_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (combat_id) REFERENCES combat_encounters(id) ON DELETE CASCADE
);
CREATE INDEX idx_combat_participants_combat ON combat_participants(combat_id);

-- Combat conditions table
CREATE TABLE combat_conditions (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    condition_name TEXT NOT NULL,
    duration INTEGER,
    source TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES combat_participants(id) ON DELETE CASCADE
);

-- =============================================================================
-- SOCIAL ENCOUNTERS
-- =============================================================================

-- Social encounters table
CREATE TABLE social_encounters (
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
CREATE INDEX idx_social_encounters_session ON social_encounters(session_id);

-- Social checks table
CREATE TABLE social_checks (
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

-- =============================================================================
-- TAVERN ENCOUNTERS
-- =============================================================================

-- Tavern encounters table
CREATE TABLE tavern_encounters (
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
CREATE INDEX idx_tavern_encounters_session ON tavern_encounters(session_id);

-- Patron interactions table
CREATE TABLE patron_interactions (
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
CREATE TABLE rumor_tracking (
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
CREATE TABLE tavern_tabs (
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

-- =============================================================================
-- SHOPPING ENCOUNTERS
-- =============================================================================

-- Shopping encounters table
CREATE TABLE shopping_encounters (
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
CREATE INDEX idx_shopping_encounters_session ON shopping_encounters(session_id);

-- Shopping cart table
CREATE TABLE shopping_cart (
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
CREATE TABLE haggling_sessions (
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
