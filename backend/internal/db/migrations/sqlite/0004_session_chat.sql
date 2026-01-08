-- Session Chat Messages
-- Stores chat messages for the Session Chat feature in the Tavern Toolkit

CREATE TABLE IF NOT EXISTS session_chat_messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    rag_sources TEXT,  -- JSON array of {page_title, source_url, similarity}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient retrieval by campaign
CREATE INDEX IF NOT EXISTS idx_session_chat_campaign ON session_chat_messages(campaign_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_session_chat_created ON session_chat_messages(created_at DESC);

-- Index for user's messages
CREATE INDEX IF NOT EXISTS idx_session_chat_user ON session_chat_messages(user_id);
