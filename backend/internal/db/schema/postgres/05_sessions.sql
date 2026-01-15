-- =============================================================================
-- TavKit PostgreSQL Schema: Sessions & Combat
-- =============================================================================
-- This file contains session management, combat, social, and encounter tables.
-- Run order: 05 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS haggling_sessions CASCADE;
DROP TABLE IF EXISTS shopping_cart CASCADE;
DROP TABLE IF EXISTS shopping_encounters CASCADE;
DROP TABLE IF EXISTS tavern_tabs CASCADE;
DROP TABLE IF EXISTS rumor_tracking CASCADE;
DROP TABLE IF EXISTS patron_interactions CASCADE;
DROP TABLE IF EXISTS tavern_encounters CASCADE;
DROP TABLE IF EXISTS social_checks CASCADE;
DROP TABLE IF EXISTS social_encounters CASCADE;
DROP TABLE IF EXISTS combat_conditions CASCADE;
DROP TABLE IF EXISTS combat_participants CASCADE;
DROP TABLE IF EXISTS combat_encounters CASCADE;
DROP TABLE IF EXISTS session_events CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50), -- 'chase', 'combat', 'social', 'tavern', 'shopping'
    name VARCHAR(200) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    summary TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX idx_sessions_status ON sessions(status) WHERE status = 'active';

-- Session events table
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    round INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(200),
    action TEXT NOT NULL,
    details JSONB,
    outcome TEXT,
    important BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- COMBAT SYSTEM
-- =============================================================================

-- Combat encounters table
CREATE TABLE combat_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(200),
    current_round INTEGER DEFAULT 1 CHECK (current_round >= 0),
    current_turn INTEGER DEFAULT 0 CHECK (current_turn >= 0),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    environment TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_combat_encounters_session ON combat_encounters(session_id);

-- Combat participants table
CREATE TABLE combat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combat_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    participant_type VARCHAR(50) NOT NULL CHECK (participant_type IN ('pc', 'npc', 'monster', 'ally', 'other')),
    initiative INTEGER DEFAULT 0,
    initiative_modifier INTEGER DEFAULT 0,
    armor_class INTEGER DEFAULT 10 CHECK (armor_class >= 0),
    max_hp INTEGER DEFAULT 1 CHECK (max_hp >= 1),
    current_hp INTEGER DEFAULT 1,
    temp_hp INTEGER DEFAULT 0 CHECK (temp_hp >= 0),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    source_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_combat_participants_combat ON combat_participants(combat_id);

-- Combat conditions table
CREATE TABLE combat_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
    condition_name VARCHAR(100) NOT NULL,
    duration INTEGER,
    source TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SOCIAL ENCOUNTERS
-- =============================================================================

-- Social encounters table
CREATE TABLE social_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    npc_id UUID,
    npc_name VARCHAR(100),
    disposition VARCHAR(50) DEFAULT 'neutral' CHECK (disposition IN ('hostile', 'unfriendly', 'neutral', 'friendly', 'helpful')),
    current_attitude INTEGER DEFAULT 0 CHECK (current_attitude >= -5 AND current_attitude <= 5),
    goals TEXT,
    secrets TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'success', 'failure', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_social_encounters_session ON social_encounters(session_id);

-- Social checks table
CREATE TABLE social_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES social_encounters(id) ON DELETE CASCADE,
    skill VARCHAR(50) NOT NULL,
    dc INTEGER DEFAULT 10,
    result INTEGER,
    success BOOLEAN,
    attitude_change INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TAVERN ENCOUNTERS
-- =============================================================================

-- Tavern encounters table
CREATE TABLE tavern_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    tavern_id UUID,
    tavern_name VARCHAR(100),
    time_of_day VARCHAR(50) DEFAULT 'evening' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'late_night')),
    atmosphere VARCHAR(100),
    active_events TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tavern_encounters_session ON tavern_encounters(session_id);

-- Patron interactions table
CREATE TABLE patron_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES tavern_encounters(id) ON DELETE CASCADE,
    patron_name VARCHAR(100) NOT NULL,
    patron_description TEXT,
    disposition VARCHAR(50) DEFAULT 'neutral',
    conversation_notes TEXT,
    secrets_revealed TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rumor tracking table
CREATE TABLE rumor_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES tavern_encounters(id) ON DELETE CASCADE,
    rumor_id UUID,
    rumor_content TEXT,
    source VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tavern tabs table
CREATE TABLE tavern_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES tavern_encounters(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    items TEXT,
    total_cost INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SHOPPING ENCOUNTERS
-- =============================================================================

-- Shopping encounters table
CREATE TABLE shopping_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    merchant_id UUID,
    merchant_name VARCHAR(100),
    shop_type VARCHAR(100),
    available_gold INTEGER DEFAULT 0 CHECK (available_gold >= 0),
    discount_modifier REAL DEFAULT 1.0 CHECK (discount_modifier >= 0),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shopping_encounters_session ON shopping_encounters(session_id);

-- Shopping cart table
CREATE TABLE shopping_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES shopping_encounters(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(50),
    base_price INTEGER DEFAULT 0 CHECK (base_price >= 0),
    final_price INTEGER DEFAULT 0 CHECK (final_price >= 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    is_purchased BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Haggling sessions table
CREATE TABLE haggling_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES shopping_encounters(id) ON DELETE CASCADE,
    item_id UUID,
    starting_price INTEGER DEFAULT 0 CHECK (starting_price >= 0),
    current_offer INTEGER DEFAULT 0 CHECK (current_offer >= 0),
    merchant_minimum INTEGER DEFAULT 0 CHECK (merchant_minimum >= 0),
    rounds INTEGER DEFAULT 0 CHECK (rounds >= 0),
    skill_checks TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'success', 'failed', 'abandoned')),
    final_price INTEGER CHECK (final_price IS NULL OR final_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
