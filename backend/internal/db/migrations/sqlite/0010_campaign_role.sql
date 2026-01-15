-- Migration 0010: Add role field to campaigns table
-- This allows distinguishing between campaigns where the user is GM (owner) vs Player

-- Add the role column with a default of 'owner' for existing campaigns
ALTER TABLE campaigns ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'player'));

-- Add index for filtering by role
CREATE INDEX IF NOT EXISTS idx_campaigns_role ON campaigns(role);

-- Add index for filtering by user and role
CREATE INDEX IF NOT EXISTS idx_campaigns_user_role ON campaigns(user_id, role);
