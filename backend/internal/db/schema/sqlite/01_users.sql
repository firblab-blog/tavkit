-- =============================================================================
-- TavKit SQLite Schema: Users & Settings
-- =============================================================================
-- This file contains core user management and application settings tables.
-- Run order: 01 (no dependencies)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS schema_version;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS tools;
DROP TABLE IF EXISTS users;

-- Schema version tracking
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema with embedded SQL files');

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    game_system TEXT NOT NULL DEFAULT 'Dungeons & Dragons 5th Edition',
    display_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tools table (user-configured external tools)
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    config TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_tools_user_id ON tools(user_id);

-- Settings table (application-wide key-value settings)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_enabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_timeout_seconds', '120');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ui_settings', '{"icon_set":"lucide","toolbar_position":"top","enabled_tools":{"dnd5etools":true,"dndbeyond":false,"roll20":false,"foundryvtt":false}}');
