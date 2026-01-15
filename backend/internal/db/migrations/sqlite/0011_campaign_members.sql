-- Migration 0011: Add campaign_invites and campaign_members tables
-- Enables multi-user campaigns where GMs can invite players via codes

-- campaign_invites: GM-generated invite codes for players to join campaigns
CREATE TABLE IF NOT EXISTS campaign_invites (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL REFERENCES users(id),
    uses_remaining INTEGER,  -- NULL = unlimited uses
    expires_at TEXT,         -- NULL = never expires (stored as ISO8601)
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- campaign_members: Players who joined a GM's campaign via invite code
CREATE TABLE IF NOT EXISTS campaign_members (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'co_gm')),
    character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    invite_code_used TEXT,
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(campaign_id, user_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_campaign_invites_code ON campaign_invites(code);
CREATE INDEX IF NOT EXISTS idx_campaign_invites_campaign ON campaign_invites(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_character ON campaign_members(character_id);
