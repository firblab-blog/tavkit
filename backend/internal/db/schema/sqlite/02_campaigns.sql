-- =============================================================================
-- TavKit SQLite Schema: Campaigns & Campaign Content
-- =============================================================================
-- This file contains campaign management and campaign-specific content tables.
-- Run order: 02 (depends on: 01_users.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS campaign_content_status;
DROP TABLE IF EXISTS campaign_summaries;
DROP TABLE IF EXISTS campaign_content;
DROP TABLE IF EXISTS campaign_characters;
DROP TABLE IF EXISTS campaigns;

-- Campaigns table
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    game_system TEXT NOT NULL DEFAULT 'Dungeons & Dragons 5th Edition',
    theme TEXT,
    tone TEXT,
    setting TEXT,
    factions TEXT,
    history TEXT,
    magic_level TEXT,
    tech_level TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

-- Campaign content table (user-created lore, notes, etc.)
CREATE TABLE campaign_content (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    section TEXT NOT NULL,
    subsection TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    file_name TEXT,
    summary TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_campaign_content_campaign ON campaign_content(campaign_id);
CREATE INDEX idx_campaign_content_section ON campaign_content(campaign_id, section, subsection);
CREATE INDEX idx_campaign_content_user_id ON campaign_content(user_id);

-- Campaign summaries table (AI-generated summaries)
CREATE TABLE campaign_summaries (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    overview TEXT,
    setting_summary TEXT,
    characters_summary TEXT,
    plot_summary TEXT,
    tone_summary TEXT,
    content_stats TEXT,
    section_summaries TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_campaign_summaries_campaign_id ON campaign_summaries(campaign_id);
CREATE INDEX idx_campaign_summaries_user_id ON campaign_summaries(user_id);

-- Campaign content status table (tracks status of generator content per campaign)
CREATE TABLE campaign_content_status (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    defeated BOOLEAN NOT NULL DEFAULT 0,
    visited BOOLEAN NOT NULL DEFAULT 0,
    obtained BOOLEAN NOT NULL DEFAULT 0,
    heard BOOLEAN NOT NULL DEFAULT 0,
    triggered BOOLEAN NOT NULL DEFAULT 0,
    encountered BOOLEAN NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT 0,
    relationship_notes TEXT,
    status_data TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id)
);
CREATE INDEX idx_campaign_content_status_campaign ON campaign_content_status(campaign_id);
CREATE INDEX idx_campaign_content_status_lookup ON campaign_content_status(campaign_id, content_type, content_id);

-- Campaign fact cache table (stores extracted facts per content item for incremental updates)
CREATE TABLE campaign_fact_cache (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    content_type TEXT NOT NULL,      -- 'npc', 'location', 'quest', etc.
    content_id TEXT NOT NULL,        -- ID of source content
    content_hash TEXT NOT NULL,      -- SHA256 for change detection
    facts TEXT NOT NULL,             -- JSON array of extracted facts
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
CREATE INDEX idx_campaign_fact_cache_lookup ON campaign_fact_cache(campaign_id, content_type);

-- Summary generation jobs table (tracks async generation progress)
CREATE TABLE summary_generation_jobs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending/extracting/synthesizing/completed/failed
    current_stage TEXT,                       -- 'npcs', 'locations', etc.
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_summary_jobs_campaign ON summary_generation_jobs(campaign_id);
CREATE INDEX idx_summary_jobs_status ON summary_generation_jobs(status);
