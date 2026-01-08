-- Session Chat Messages
-- Stores chat messages for the Session Chat feature in the Tavern Toolkit

CREATE TABLE IF NOT EXISTS session_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    rag_sources JSONB,  -- Array of {page_title, source_url, similarity}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient retrieval by campaign
CREATE INDEX idx_session_chat_campaign ON session_chat_messages(campaign_id);

-- Index for ordering by creation time
CREATE INDEX idx_session_chat_created ON session_chat_messages(created_at DESC);

-- Index for user's messages
CREATE INDEX idx_session_chat_user ON session_chat_messages(user_id);
