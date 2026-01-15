-- Migration 0013: Player Mode Enhancement Tables
-- Adds tables for player journal, quest tracking, encounters, party loot,
-- GM content reveals, and ability usage tracking

-- 1. player_journal_entries: Session notes and journal entries
CREATE TABLE player_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    session_date DATE,
    session_number INTEGER,
    tagged_npcs JSONB DEFAULT '[]',
    tagged_locations JSONB DEFAULT '[]',
    tagged_quests JSONB DEFAULT '[]',
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_entries_user ON player_journal_entries(user_id);
CREATE INDEX idx_journal_entries_campaign ON player_journal_entries(campaign_id);
CREATE INDEX idx_journal_entries_character ON player_journal_entries(character_id);
CREATE INDEX idx_journal_entries_session ON player_journal_entries(session_number);

-- 2. player_quest_tracking: Personal quest and goal tracking
CREATE TABLE player_quest_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quest_type VARCHAR(50) DEFAULT 'personal' CHECK (quest_type IN ('personal', 'main', 'side', 'gm_shared')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    objectives JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 0,
    notes TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quest_tracking_user ON player_quest_tracking(user_id);
CREATE INDEX idx_quest_tracking_campaign ON player_quest_tracking(campaign_id);
CREATE INDEX idx_quest_tracking_character ON player_quest_tracking(character_id);
CREATE INDEX idx_quest_tracking_status ON player_quest_tracking(status);
CREATE INDEX idx_quest_tracking_quest ON player_quest_tracking(quest_id);

-- 3. player_npc_encounters: NPCs met log
CREATE TABLE player_npc_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relationship VARCHAR(50) DEFAULT 'neutral' CHECK (relationship IN ('friendly', 'neutral', 'hostile', 'unknown')),
    first_met_session INTEGER,
    first_met_location VARCHAR(255),
    last_interaction TIMESTAMP,
    notes TEXT,
    is_gm_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_npc_encounters_user ON player_npc_encounters(user_id);
CREATE INDEX idx_npc_encounters_campaign ON player_npc_encounters(campaign_id);
CREATE INDEX idx_npc_encounters_npc ON player_npc_encounters(npc_id);
CREATE INDEX idx_npc_encounters_relationship ON player_npc_encounters(relationship);

-- 4. player_location_visits: Locations visited log
CREATE TABLE player_location_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    first_visit_session INTEGER,
    notes TEXT,
    is_gm_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_visits_user ON player_location_visits(user_id);
CREATE INDEX idx_location_visits_campaign ON player_location_visits(campaign_id);
CREATE INDEX idx_location_visits_location ON player_location_visits(location_id);

-- 5. party_loot: Shared party inventory (campaign-scoped)
CREATE TABLE party_loot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    value VARCHAR(100),
    claimed_by UUID REFERENCES characters(id) ON DELETE SET NULL,
    claimed_by_name VARCHAR(255),
    source VARCHAR(255),
    session_acquired INTEGER,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_party_loot_campaign ON party_loot(campaign_id);
CREATE INDEX idx_party_loot_claimed ON party_loot(claimed_by);
CREATE INDEX idx_party_loot_item ON party_loot(item_id);
CREATE INDEX idx_party_loot_created_by ON party_loot(created_by);

-- 6. content_reveals: GM reveals content to players
CREATE TABLE content_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    revealed_by UUID NOT NULL REFERENCES users(id),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('npc', 'location', 'quest', 'item', 'monster', 'encounter')),
    content_id UUID NOT NULL,
    reveal_level VARCHAR(50) DEFAULT 'full' CHECK (reveal_level IN ('name_only', 'summary', 'full')),
    custom_notes TEXT,
    revealed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id)
);

CREATE INDEX idx_content_reveals_campaign ON content_reveals(campaign_id);
CREATE INDEX idx_content_reveals_content ON content_reveals(content_type, content_id);
CREATE INDEX idx_content_reveals_revealed_by ON content_reveals(revealed_by);

-- 7. ability_usage_tracking: Track spell slots and limited-use abilities
CREATE TABLE ability_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    ability_name VARCHAR(255) NOT NULL,
    ability_type VARCHAR(50) CHECK (ability_type IN ('spell_slot', 'class_feature', 'racial', 'item', 'feat', 'other')),
    max_uses INTEGER NOT NULL,
    current_uses INTEGER NOT NULL,
    recharge_type VARCHAR(50) CHECK (recharge_type IN ('short_rest', 'long_rest', 'daily', 'dawn', 'custom')),
    notes TEXT,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, ability_name)
);

CREATE INDEX idx_ability_usage_user ON ability_usage_tracking(user_id);
CREATE INDEX idx_ability_usage_character ON ability_usage_tracking(character_id);
CREATE INDEX idx_ability_usage_type ON ability_usage_tracking(ability_type);
