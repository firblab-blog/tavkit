-- Add ui_settings column to user_context for per-user UI preferences
-- This stores settings like theme, enabled generators, hidden sections, etc.

ALTER TABLE user_context ADD COLUMN ui_settings TEXT DEFAULT '{}';
