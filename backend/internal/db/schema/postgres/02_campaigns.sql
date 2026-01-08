-- =============================================================================
-- TavKit PostgreSQL Schema: Campaigns & Campaign Content
-- =============================================================================
-- This file contains campaign management and campaign-specific content tables.
-- Run order: 02 (depends on: 01_users.sql)
-- =============================================================================

-- Drop existing tables (for clean recreation)
DROP TABLE IF EXISTS summary_generation_jobs CASCADE;
DROP TABLE IF EXISTS campaign_fact_cache CASCADE;
DROP TABLE IF EXISTS campaign_content_status CASCADE;
DROP TABLE IF EXISTS campaign_summaries CASCADE;
DROP TABLE IF EXISTS campaign_content CASCADE;
DROP TABLE IF EXISTS campaign_characters CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    game_system VARCHAR(100) NOT NULL DEFAULT 'Dungeons & Dragons 5th Edition',
    theme VARCHAR(100),
    tone VARCHAR(100),
    setting TEXT,
    factions TEXT,
    history TEXT,
    magic_level VARCHAR(50),
    tech_level VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

-- Campaign content table (user-created lore, notes, etc.)
CREATE TABLE campaign_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section VARCHAR(100) NOT NULL,
    subsection VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'manual',
    file_name VARCHAR(255),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_campaign_content_campaign ON campaign_content(campaign_id);
CREATE INDEX idx_campaign_content_section ON campaign_content(campaign_id, section, subsection);
CREATE INDEX idx_campaign_content_user_id ON campaign_content(user_id);

-- Campaign summaries table (AI-generated summaries)
CREATE TABLE campaign_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID UNIQUE NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    overview TEXT,
    setting_summary TEXT,
    characters_summary TEXT,
    plot_summary TEXT,
    tone_summary TEXT,
    content_stats TEXT,
    section_summaries TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_campaign_summaries_campaign_id ON campaign_summaries(campaign_id);
CREATE INDEX idx_campaign_summaries_user_id ON campaign_summaries(user_id);

-- Campaign content status table (tracks status of generator content per campaign)
CREATE TABLE campaign_content_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    defeated BOOLEAN NOT NULL DEFAULT false,
    visited BOOLEAN NOT NULL DEFAULT false,
    obtained BOOLEAN NOT NULL DEFAULT false,
    heard BOOLEAN NOT NULL DEFAULT false,
    triggered BOOLEAN NOT NULL DEFAULT false,
    encountered BOOLEAN NOT NULL DEFAULT false,
    completed BOOLEAN NOT NULL DEFAULT false,
    relationship_notes TEXT,
    status_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id)
);
CREATE INDEX idx_campaign_content_status_campaign ON campaign_content_status(campaign_id);
CREATE INDEX idx_campaign_content_status_lookup ON campaign_content_status(campaign_id, content_type, content_id);

-- Campaign fact cache table (stores extracted facts per content item for incremental updates)
CREATE TABLE campaign_fact_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,  -- 'npc', 'location', 'quest', etc.
    content_id UUID NOT NULL,           -- ID of source content
    content_hash VARCHAR(64) NOT NULL,  -- SHA256 for change detection
    facts JSONB NOT NULL,               -- JSON array of extracted facts
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, content_type, content_id)
);
CREATE INDEX idx_campaign_fact_cache_lookup ON campaign_fact_cache(campaign_id, content_type);

-- Summary generation jobs table (tracks async generation progress)
CREATE TABLE summary_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/extracting/synthesizing/completed/failed
    current_stage VARCHAR(50),                       -- 'npcs', 'locations', etc.
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_summary_jobs_campaign ON summary_generation_jobs(campaign_id);
CREATE INDEX idx_summary_jobs_status ON summary_generation_jobs(status);
