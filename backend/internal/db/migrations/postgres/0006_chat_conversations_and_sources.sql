-- Chat Conversations and Source Preferences
-- Adds support for multiple conversations per campaign and granular source toggles

-- 1. Chat Conversations table (multiple per campaign)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient retrieval
CREATE INDEX idx_chat_conversations_campaign ON chat_conversations(campaign_id);
CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- 2. Add conversation_id to existing session_chat_messages table
ALTER TABLE session_chat_messages
ADD COLUMN conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE;

-- Index for efficient querying by conversation
CREATE INDEX idx_session_chat_conversation ON session_chat_messages(conversation_id);

-- 3. Chat Source Preferences table (per-campaign)
CREATE TABLE IF NOT EXISTS chat_source_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Campaign content source toggles (default all true)
    include_npcs BOOLEAN DEFAULT true,
    include_monsters BOOLEAN DEFAULT true,
    include_locations BOOLEAN DEFAULT true,
    include_quests BOOLEAN DEFAULT true,
    include_items BOOLEAN DEFAULT true,
    include_encounters BOOLEAN DEFAULT true,
    include_rumors BOOLEAN DEFAULT true,
    include_taverns BOOLEAN DEFAULT true,
    include_merchants BOOLEAN DEFAULT true,
    include_traps BOOLEAN DEFAULT true,
    include_critters BOOLEAN DEFAULT true,
    include_chases BOOLEAN DEFAULT true,
    include_dialogues BOOLEAN DEFAULT true,
    include_campaign_summary BOOLEAN DEFAULT true,

    -- Wiki/setting pack toggle
    include_wiki_knowledge BOOLEAN DEFAULT true,
    enabled_wiki_sources JSONB DEFAULT '[]'::jsonb,

    -- Performance tuning
    max_context_chunks INTEGER DEFAULT 5,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient retrieval by campaign
CREATE INDEX idx_chat_source_prefs_campaign ON chat_source_preferences(campaign_id);
