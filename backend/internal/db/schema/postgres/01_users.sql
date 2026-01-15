-- =============================================================================
-- TavKit PostgreSQL Schema: Users & Settings
-- =============================================================================
-- This file contains core user management and application settings tables.
-- Run order: 01 (no dependencies)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS schema_version CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS tools CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Schema version tracking
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema with embedded SQL files');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    game_system VARCHAR(100) DEFAULT 'Dungeons & Dragons 5th Edition',
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tools table (user-configured external tools)
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    url TEXT,
    config TEXT,
    position INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tools_user_id ON tools(user_id);

-- Settings table (application-wide key-value settings)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO settings (key, value) VALUES
    ('registration_enabled', 'false'),
    ('ai_timeout_seconds', '120'),
    ('ui_settings', '{"icon_set":"lucide","toolbar_position":"top","enabled_tools":{"dnd5etools":true,"dndbeyond":false,"roll20":false,"foundryvtt":false}}')
ON CONFLICT (key) DO NOTHING;
