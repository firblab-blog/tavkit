-- Migration 0011: Add campaign_invites and campaign_members tables
-- Enables multi-user campaigns where GMs can invite players via codes

-- campaign_invites: GM-generated invite codes for players to join campaigns
CREATE TABLE campaign_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    code VARCHAR(12) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id),
    uses_remaining INTEGER,  -- NULL = unlimited uses
    expires_at TIMESTAMP,    -- NULL = never expires
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- campaign_members: Players who joined a GM's campaign via invite code
CREATE TABLE campaign_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'co_gm')),
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    invite_code_used VARCHAR(12),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, user_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_campaign_invites_code ON campaign_invites(code);
CREATE INDEX idx_campaign_invites_campaign ON campaign_invites(campaign_id);
CREATE INDEX idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_character ON campaign_members(character_id);
