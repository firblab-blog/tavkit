-- =============================================================================
-- TavKit PostgreSQL Migration: Wiki RAG System with pgvector
-- =============================================================================
-- This migration adds support for:
-- 1. pgvector extension for vector similarity search
-- 2. Setting knowledge packs (Eberron, Forgotten Realms, etc.)
-- 3. Wiki page storage and embedding cache
-- 4. Campaign setting configuration
-- =============================================================================

-- Enable pgvector extension for vector operations
-- Note: Requires pgvector to be installed on the PostgreSQL server
-- For postgres:17-alpine, you may need to use ankane/pgvector image instead
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- SETTING KNOWLEDGE PACKS
-- =============================================================================
-- System-level table for available D&D settings (Eberron, Forgotten Realms, etc.)
-- These are shared across all users

CREATE TABLE IF NOT EXISTS setting_knowledge_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,                    -- "Eberron: Rising from the Last War"
    slug VARCHAR(100) UNIQUE NOT NULL,             -- "eberron"
    game_system VARCHAR(100) DEFAULT 'D&D 5e',     -- Compatible game system
    description TEXT,                              -- Brief overview of the setting
    wiki_base_url TEXT,                            -- "https://eberron.fandom.com/wiki/"
    wiki_index_url TEXT,                           -- Main wiki page to start crawling from

    -- Scraping configuration
    scrape_config JSONB DEFAULT '{}',              -- {max_pages, allowed_paths, excluded_paths}
    scrape_status VARCHAR(50) DEFAULT 'pending',   -- pending, scraping, completed, failed
    scrape_started_at TIMESTAMP,
    scrape_completed_at TIMESTAMP,
    scrape_error TEXT,

    -- Statistics
    total_pages INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN DEFAULT true,                -- Available for users to select
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_setting_packs_slug ON setting_knowledge_packs(slug);
CREATE INDEX IF NOT EXISTS idx_setting_packs_active ON setting_knowledge_packs(is_active);

-- =============================================================================
-- WIKI PAGES
-- =============================================================================
-- Stores scraped wiki pages with their raw content

CREATE TABLE IF NOT EXISTS setting_wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_pack_id UUID NOT NULL REFERENCES setting_knowledge_packs(id) ON DELETE CASCADE,

    -- Page identification
    url TEXT NOT NULL,                             -- Full URL of the wiki page
    url_path TEXT NOT NULL,                        -- Path portion (e.g., "/wiki/Sharn")
    title VARCHAR(500) NOT NULL,                   -- Page title

    -- Content
    raw_html TEXT,                                 -- Original HTML (for re-processing)
    clean_text TEXT NOT NULL,                      -- Extracted plain text

    -- Metadata
    categories JSONB DEFAULT '[]',                 -- Wiki categories this page belongs to
    links_to JSONB DEFAULT '[]',                   -- Outbound links (for crawling)
    infobox_data JSONB DEFAULT '{}',               -- Structured data from infoboxes

    -- Processing status
    is_processed BOOLEAN DEFAULT false,            -- Has been chunked and embedded
    word_count INTEGER DEFAULT 0,

    -- Timestamps
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TEXT,                            -- Last-Modified header from wiki
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(setting_pack_id, url_path)
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_setting ON setting_wiki_pages(setting_pack_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_processed ON setting_wiki_pages(setting_pack_id, is_processed);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_title ON setting_wiki_pages(title);

-- =============================================================================
-- WIKI CHUNKS (with vector embeddings)
-- =============================================================================
-- Stores text chunks with their vector embeddings for similarity search

CREATE TABLE IF NOT EXISTS setting_wiki_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES setting_wiki_pages(id) ON DELETE CASCADE,
    setting_pack_id UUID NOT NULL REFERENCES setting_knowledge_packs(id) ON DELETE CASCADE,

    -- Chunk content
    chunk_text TEXT NOT NULL,                      -- The actual text chunk
    chunk_index INTEGER NOT NULL,                  -- Order within the page

    -- Context for better retrieval
    page_title VARCHAR(500) NOT NULL,              -- Denormalized for faster queries
    section_title VARCHAR(500),                    -- H2/H3 section this chunk belongs to

    -- Token counts for context window management
    token_count INTEGER DEFAULT 0,                 -- Approximate token count
    char_count INTEGER DEFAULT 0,

    -- Vector embedding
    -- Using 1536 dimensions for OpenAI text-embedding-3-small
    -- Can also use 384 for sentence-transformers all-MiniLM-L6-v2 (faster, local)
    embedding vector(1536),

    -- Metadata
    embedding_model VARCHAR(100),                  -- Model used for embedding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(page_id, chunk_index)
);

-- Index for vector similarity search using HNSW (faster for large datasets)
-- cosine distance is best for normalized embeddings
CREATE INDEX IF NOT EXISTS idx_wiki_chunks_embedding ON setting_wiki_chunks
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_wiki_chunks_setting ON setting_wiki_chunks(setting_pack_id);
CREATE INDEX IF NOT EXISTS idx_wiki_chunks_page ON setting_wiki_chunks(page_id);

-- =============================================================================
-- CAMPAIGN SETTING CONFIGURATION
-- =============================================================================
-- Per-campaign configuration linking to a setting knowledge pack

CREATE TABLE IF NOT EXISTS campaign_setting_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Selected setting pack (nullable for homebrew/custom)
    setting_pack_id UUID REFERENCES setting_knowledge_packs(id) ON DELETE SET NULL,

    -- User customizations
    custom_overrides JSONB DEFAULT '{}',           -- User's custom lore additions
    excluded_categories JSONB DEFAULT '[]',        -- Wiki categories to exclude

    -- RAG configuration
    knowledge_depth VARCHAR(50) DEFAULT 'standard', -- minimal, standard, comprehensive
    max_context_chunks INTEGER DEFAULT 5,          -- Max chunks to inject into prompts

    -- Attribution preferences
    show_source_links BOOLEAN DEFAULT true,        -- Show "Source: [wiki link]" in output

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_setting_config_campaign ON campaign_setting_config(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_setting_config_pack ON campaign_setting_config(setting_pack_id);

-- =============================================================================
-- RAG QUERY CACHE
-- =============================================================================
-- Cache for frequently used RAG queries to reduce embedding costs

CREATE TABLE IF NOT EXISTS rag_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_pack_id UUID NOT NULL REFERENCES setting_knowledge_packs(id) ON DELETE CASCADE,

    -- Query details
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL,               -- SHA256 of normalized query
    query_embedding vector(1536),

    -- Cached results
    result_chunk_ids JSONB NOT NULL,               -- Array of chunk IDs returned

    -- Cache management
    hit_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                          -- Optional TTL

    UNIQUE(setting_pack_id, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_rag_cache_lookup ON rag_query_cache(setting_pack_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_rag_cache_expires ON rag_query_cache(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- SCRAPE JOB TRACKING
-- =============================================================================
-- Track async wiki scraping jobs

CREATE TABLE IF NOT EXISTS wiki_scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_pack_id UUID NOT NULL REFERENCES setting_knowledge_packs(id) ON DELETE CASCADE,

    -- Job status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, scraping, embedding, completed, failed
    current_phase VARCHAR(100),                    -- "Scraping pages", "Generating embeddings"

    -- Progress tracking
    pages_found INTEGER DEFAULT 0,
    pages_scraped INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    chunks_created INTEGER DEFAULT 0,
    chunks_embedded INTEGER DEFAULT 0,

    -- Progress percentage
    progress_percent INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    failed_urls JSONB DEFAULT '[]',

    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_pack ON wiki_scrape_jobs(setting_pack_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON wiki_scrape_jobs(status);

-- =============================================================================
-- SEED DATA: Initial Setting Packs
-- =============================================================================

INSERT INTO setting_knowledge_packs (name, slug, game_system, description, wiki_base_url, wiki_index_url, scrape_config)
VALUES
    (
        'Eberron: Rising from the Last War',
        'eberron',
        'D&D 5e',
        'A world of pulp adventure, noir intrigue, and magical technology. Features warforged, dragonmarks, and the aftermath of the Last War.',
        'https://eberron.fandom.com',
        'https://eberron.fandom.com/wiki/Eberron_Wiki',
        '{
            "max_pages": 500,
            "priority_paths": ["/wiki/Sharn", "/wiki/Khorvaire", "/wiki/Dragonmarked_house", "/wiki/Warforged", "/wiki/The_Last_War", "/wiki/Mournland"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Forgotten Realms',
        'forgotten-realms',
        'D&D 5e',
        'The most popular D&D setting, home to the Sword Coast, Baldur''s Gate, Waterdeep, and countless legendary heroes and villains.',
        'https://forgottenrealms.fandom.com',
        'https://forgottenrealms.fandom.com/wiki/Main_Page',
        '{
            "max_pages": 500,
            "priority_paths": ["/wiki/Sword_Coast", "/wiki/Waterdeep", "/wiki/Baldur%27s_Gate", "/wiki/Neverwinter", "/wiki/Faerun"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Greyhawk',
        'greyhawk',
        'D&D 5e',
        'The original D&D setting created by Gary Gygax, featuring the Free City of Greyhawk and the Flanaess.',
        'https://greyhawkonline.com',
        'https://greyhawkonline.com/greyhawkwiki/Main_Page',
        '{
            "max_pages": 300,
            "priority_paths": ["/greyhawkwiki/Greyhawk", "/greyhawkwiki/Flanaess", "/greyhawkwiki/Oerth"],
            "allowed_path_patterns": ["/greyhawkwiki/*"],
            "excluded_path_patterns": ["/greyhawkwiki/Category:*", "/greyhawkwiki/File:*", "/greyhawkwiki/Template:*", "/greyhawkwiki/Special:*"],
            "content_selectors": ["#mw-content-text"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference"]
        }'::jsonb
    ),
    (
        'Ravenloft: Domains of Dread',
        'ravenloft',
        'D&D 5e',
        'Gothic horror setting featuring the Domains of Dread, ruled by Dark Lords like Strahd von Zarovich. Mists, curses, and supernatural terror.',
        'https://ravenloft.fandom.com',
        'https://ravenloft.fandom.com/wiki/Ravenloft_Wiki',
        '{
            "max_pages": 400,
            "priority_paths": ["/wiki/Barovia", "/wiki/Strahd_von_Zarovich", "/wiki/Domains_of_Dread", "/wiki/Dark_Powers", "/wiki/Castle_Ravenloft", "/wiki/Darklord"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Spelljammer: Adventures in Space',
        'spelljammer',
        'D&D 5e',
        'Sail the Astral Sea in magical ships! Wildspace, the Astral Plane, and fantastic locations like the Rock of Bral.',
        'https://spelljammer.fandom.com',
        'https://spelljammer.fandom.com/wiki/Spelljammer_Wiki',
        '{
            "max_pages": 300,
            "priority_paths": ["/wiki/Spelljammer", "/wiki/Wildspace", "/wiki/Astral_Plane", "/wiki/Rock_of_Bral", "/wiki/Spelljamming_ship"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Dragonlance',
        'dragonlance',
        'D&D 5e',
        'Epic fantasy on the world of Krynn, featuring the War of the Lance, Knights of Solamnia, and the legendary Heroes of the Lance.',
        'https://dragonlance.fandom.com',
        'https://dragonlance.fandom.com/wiki/Main_Page',
        '{
            "max_pages": 400,
            "priority_paths": ["/wiki/Krynn", "/wiki/Solamnia", "/wiki/War_of_the_Lance", "/wiki/Raistlin_Majere", "/wiki/Dragonlance"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Dark Sun',
        'dark-sun',
        'D&D 5e',
        'Post-apocalyptic desert world of Athas. Defiling magic, psionic powers, brutal survival, and the tyranny of the Sorcerer-Kings.',
        'https://darksun.fandom.com',
        'https://darksun.fandom.com/wiki/Dark_Sun_Wiki',
        '{
            "max_pages": 300,
            "priority_paths": ["/wiki/Athas", "/wiki/Tyr", "/wiki/Sorcerer-King", "/wiki/Defiling", "/wiki/Thri-kreen"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    ),
    (
        'Planescape',
        'planescape',
        'D&D 5e',
        'The City of Doors, Sigil, and the infinite planes of existence. Factions, philosophy, and planar travel.',
        'https://planescape.fandom.com',
        'https://planescape.fandom.com/wiki/Main_Page',
        '{
            "max_pages": 350,
            "priority_paths": ["/wiki/Sigil", "/wiki/Lady_of_Pain", "/wiki/Outlands", "/wiki/Faction", "/wiki/Blood_War"],
            "allowed_path_patterns": ["/wiki/*"],
            "excluded_path_patterns": ["/wiki/Category:*", "/wiki/File:*", "/wiki/Template:*", "/wiki/Special:*", "/wiki/User:*", "/wiki/Talk:*"],
            "content_selectors": ["#mw-content-text .mw-parser-output"],
            "exclude_selectors": [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"]
        }'::jsonb
    )
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to search wiki chunks by similarity
CREATE OR REPLACE FUNCTION search_wiki_chunks(
    p_setting_slug VARCHAR(100),
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 5,
    p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    page_title VARCHAR(500),
    section_title VARCHAR(500),
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as chunk_id,
        c.page_title,
        c.section_title,
        c.chunk_text,
        1 - (c.embedding <=> p_query_embedding) as similarity
    FROM setting_wiki_chunks c
    JOIN setting_knowledge_packs p ON c.setting_pack_id = p.id
    WHERE p.slug = p_setting_slug
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- Function to get RAG context for a campaign
CREATE OR REPLACE FUNCTION get_campaign_rag_context(
    p_campaign_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    page_title VARCHAR(500),
    section_title VARCHAR(500),
    chunk_text TEXT,
    similarity FLOAT,
    source_url TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_setting_pack_id UUID;
    v_max_chunks INTEGER;
BEGIN
    -- Get the campaign's setting configuration
    SELECT csc.setting_pack_id, COALESCE(p_limit, csc.max_context_chunks, 5)
    INTO v_setting_pack_id, v_max_chunks
    FROM campaign_setting_config csc
    WHERE csc.campaign_id = p_campaign_id;

    -- If no setting configured, return empty
    IF v_setting_pack_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        c.id as chunk_id,
        c.page_title,
        c.section_title,
        c.chunk_text,
        1 - (c.embedding <=> p_query_embedding) as similarity,
        wp.url as source_url
    FROM setting_wiki_chunks c
    JOIN setting_wiki_pages wp ON c.page_id = wp.id
    WHERE c.setting_pack_id = v_setting_pack_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT v_max_chunks;
END;
$$;
