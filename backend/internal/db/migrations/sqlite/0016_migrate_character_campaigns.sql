-- Migration: Migrate existing characters.campaign_id to campaign_characters junction table
-- This ensures all characters created with direct campaign_id FK are now also in the junction table
-- so they appear correctly when querying via the junction table.

-- Copy existing character-campaign associations to the junction table
-- Uses ON CONFLICT to avoid duplicates if some are already linked
INSERT INTO campaign_characters (id, campaign_id, character_id, added_at)
SELECT
    lower(hex(randomblob(16))),  -- Generate UUID for id
    campaign_id,
    id,
    COALESCE(created_at, CURRENT_TIMESTAMP)
FROM characters
WHERE campaign_id IS NOT NULL
ON CONFLICT(campaign_id, character_id) DO NOTHING;
