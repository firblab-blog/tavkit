-- Chat Conversations and Source Preferences
-- Adds support for multiple conversations per campaign and granular source toggles

-- 1. Chat Conversations table (multiple per campaign)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS idx_chat_conversations_campaign ON chat_conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- 2. Add conversation_id to existing session_chat_messages table
ALTER TABLE session_chat_messages ADD COLUMN conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE CASCADE;

-- Index for efficient querying by conversation
CREATE INDEX IF NOT EXISTS idx_session_chat_conversation ON session_chat_messages(conversation_id);

-- 3. Chat Source Preferences table (per-campaign)
CREATE TABLE IF NOT EXISTS chat_source_preferences (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Campaign content source toggles (default all true)
    include_npcs INTEGER DEFAULT 1,
    include_monsters INTEGER DEFAULT 1,
    include_locations INTEGER DEFAULT 1,
    include_quests INTEGER DEFAULT 1,
    include_items INTEGER DEFAULT 1,
    include_encounters INTEGER DEFAULT 1,
    include_rumors INTEGER DEFAULT 1,
    include_taverns INTEGER DEFAULT 1,
    include_merchants INTEGER DEFAULT 1,
    include_traps INTEGER DEFAULT 1,
    include_critters INTEGER DEFAULT 1,
    include_chases INTEGER DEFAULT 1,
    include_dialogues INTEGER DEFAULT 1,
    include_campaign_summary INTEGER DEFAULT 1,

    -- Wiki/setting pack toggle
    include_wiki_knowledge INTEGER DEFAULT 1,
    enabled_wiki_sources TEXT DEFAULT '[]',

    -- Performance tuning
    max_context_chunks INTEGER DEFAULT 5,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient retrieval by campaign
CREATE INDEX IF NOT EXISTS idx_chat_source_prefs_campaign ON chat_source_preferences(campaign_id);
