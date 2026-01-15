-- Campaign Items linking table (many-to-many relationship)
-- Allows items to be linked to multiple campaigns (reusable item templates)
CREATE TABLE IF NOT EXISTS campaign_items (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_item ON campaign_items(item_id);

-- Add inventory field to NPCs for cross-referencing items
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a workaround
-- This will fail silently if column already exists
ALTER TABLE npcs ADD COLUMN inventory TEXT DEFAULT '[]';

-- Add treasure field to locations for cross-referencing items
ALTER TABLE locations ADD COLUMN treasure TEXT DEFAULT '[]';
