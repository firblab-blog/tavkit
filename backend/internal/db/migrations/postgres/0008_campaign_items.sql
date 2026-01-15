-- Campaign Items linking table (many-to-many relationship)
-- Allows items to be linked to multiple campaigns (reusable item templates)
CREATE TABLE IF NOT EXISTS campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_item ON campaign_items(item_id);

-- Add inventory field to NPCs for cross-referencing items
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]';

-- Add treasure field to locations for cross-referencing items
ALTER TABLE locations ADD COLUMN IF NOT EXISTS treasure JSONB DEFAULT '[]';
