-- =============================================================================
-- TavKit SQLite Schema: Chase System
-- =============================================================================
-- This file contains the chase encounter system tables.
-- Run order: 06 (depends on: 01_users.sql, 02_campaigns.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS chase_events;
DROP TABLE IF EXISTS chase_complications;
DROP TABLE IF EXISTS chase_challenges;
DROP TABLE IF EXISTS chase_participants;
DROP TABLE IF EXISTS chase_templates;
DROP TABLE IF EXISTS chases;

-- Chases table
CREATE TABLE chases (
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
    -- Chase state
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
CREATE INDEX idx_chases_campaign ON chases(campaign_id);
CREATE INDEX idx_chases_user_id ON chases(user_id);

-- Chase participants table
CREATE TABLE chase_participants (
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
CREATE INDEX idx_chase_participants_chase ON chase_participants(chase_id);

-- Chase challenges table
CREATE TABLE chase_challenges (
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
CREATE INDEX idx_chase_challenges_chase ON chase_challenges(chase_id);

-- Chase complications table
CREATE TABLE chase_complications (
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
CREATE INDEX idx_chase_complications_chase ON chase_complications(chase_id);

-- Chase events table
CREATE TABLE chase_events (
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
CREATE INDEX idx_chase_events_chase ON chase_events(chase_id);

-- Chase templates table
CREATE TABLE chase_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    chase_type TEXT,
    terrain TEXT,
    default_complications TEXT,
    default_challenges TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
