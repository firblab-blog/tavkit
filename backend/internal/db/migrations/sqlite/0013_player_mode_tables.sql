-- Migration 0013: Player Mode Enhancement Tables
-- Adds tables for player journal, quest tracking, encounters, party loot,
-- GM content reveals, and ability usage tracking

-- 1. player_journal_entries: Session notes and journal entries
CREATE TABLE IF NOT EXISTS player_journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    session_date TEXT,
    session_number INTEGER,
    tagged_npcs TEXT DEFAULT '[]',
    tagged_locations TEXT DEFAULT '[]',
    tagged_quests TEXT DEFAULT '[]',
    is_private INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON player_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_campaign ON player_journal_entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_character ON player_journal_entries(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_session ON player_journal_entries(session_number);

-- 2. player_quest_tracking: Personal quest and goal tracking
CREATE TABLE IF NOT EXISTS player_quest_tracking (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    quest_id TEXT REFERENCES quests(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    quest_type TEXT DEFAULT 'personal' CHECK (quest_type IN ('personal', 'main', 'side', 'gm_shared')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    objectives TEXT DEFAULT '[]',
    priority INTEGER DEFAULT 0,
    notes TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quest_tracking_user ON player_quest_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_tracking_campaign ON player_quest_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quest_tracking_character ON player_quest_tracking(character_id);
CREATE INDEX IF NOT EXISTS idx_quest_tracking_status ON player_quest_tracking(status);
CREATE INDEX IF NOT EXISTS idx_quest_tracking_quest ON player_quest_tracking(quest_id);

-- 3. player_npc_encounters: NPCs met log
CREATE TABLE IF NOT EXISTS player_npc_encounters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    npc_id TEXT REFERENCES npcs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    relationship TEXT DEFAULT 'neutral' CHECK (relationship IN ('friendly', 'neutral', 'hostile', 'unknown')),
    first_met_session INTEGER,
    first_met_location TEXT,
    last_interaction TEXT,
    notes TEXT,
    is_gm_revealed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_npc_encounters_user ON player_npc_encounters(user_id);
CREATE INDEX IF NOT EXISTS idx_npc_encounters_campaign ON player_npc_encounters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npc_encounters_npc ON player_npc_encounters(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_encounters_relationship ON player_npc_encounters(relationship);

-- 4. player_location_visits: Locations visited log
CREATE TABLE IF NOT EXISTS player_location_visits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    first_visit_session INTEGER,
    notes TEXT,
    is_gm_revealed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_location_visits_user ON player_location_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_location_visits_campaign ON player_location_visits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_location_visits_location ON player_location_visits(location_id);

-- 5. party_loot: Shared party inventory (campaign-scoped)
CREATE TABLE IF NOT EXISTS party_loot (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    value TEXT,
    claimed_by TEXT REFERENCES characters(id) ON DELETE SET NULL,
    claimed_by_name TEXT,
    source TEXT,
    session_acquired INTEGER,
    notes TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_party_loot_campaign ON party_loot(campaign_id);
CREATE INDEX IF NOT EXISTS idx_party_loot_claimed ON party_loot(claimed_by);
CREATE INDEX IF NOT EXISTS idx_party_loot_item ON party_loot(item_id);
CREATE INDEX IF NOT EXISTS idx_party_loot_created_by ON party_loot(created_by);

-- 6. content_reveals: GM reveals content to players
CREATE TABLE IF NOT EXISTS content_reveals (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    revealed_by TEXT NOT NULL REFERENCES users(id),
    content_type TEXT NOT NULL CHECK (content_type IN ('npc', 'location', 'quest', 'item', 'monster', 'encounter')),
    content_id TEXT NOT NULL,
    reveal_level TEXT DEFAULT 'full' CHECK (reveal_level IN ('name_only', 'summary', 'full')),
    custom_notes TEXT,
    revealed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(campaign_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reveals_campaign ON content_reveals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_reveals_content ON content_reveals(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reveals_revealed_by ON content_reveals(revealed_by);

-- 7. ability_usage_tracking: Track spell slots and limited-use abilities
CREATE TABLE IF NOT EXISTS ability_usage_tracking (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    ability_name TEXT NOT NULL,
    ability_type TEXT CHECK (ability_type IN ('spell_slot', 'class_feature', 'racial', 'item', 'feat', 'other')),
    max_uses INTEGER NOT NULL,
    current_uses INTEGER NOT NULL,
    recharge_type TEXT CHECK (recharge_type IN ('short_rest', 'long_rest', 'daily', 'dawn', 'custom')),
    notes TEXT,
    last_used TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(character_id, ability_name)
);

CREATE INDEX IF NOT EXISTS idx_ability_usage_user ON ability_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ability_usage_character ON ability_usage_tracking(character_id);
CREATE INDEX IF NOT EXISTS idx_ability_usage_type ON ability_usage_tracking(ability_type);
