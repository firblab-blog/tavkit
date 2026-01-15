-- Add ui_settings column to user_context for per-user UI preferences
-- This stores settings like theme, enabled generators, hidden sections, etc.

ALTER TABLE user_context
ADD COLUMN IF NOT EXISTS ui_settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_context.ui_settings IS 'JSON object containing user-specific UI preferences (theme, enabled tools, hidden sections, etc.)';
