-- Migration 0005: Dynamic embedding dimensions
--
-- This migration removes the fixed dimension constraint from the embedding column,
-- allowing any embedding model to be used regardless of output dimensions.
--
-- Common embedding dimensions:
-- - OpenAI text-embedding-3-small: 1536 dimensions
-- - OpenAI text-embedding-3-large: 3072 dimensions
-- - Ollama nomic-embed-text: 768 dimensions
-- - Ollama mxbai-embed-large: 1024 dimensions
-- - Anthropic voyage-2: 1024 dimensions
--
-- IMPORTANT: This migration will DROP existing embeddings!
-- Re-run wiki scraping after applying this migration.
--
-- Note: pgvector supports variable-dimension vectors (no dimension specified),
-- but HNSW indexes require fixed dimensions. We use IVFFlat instead which
-- can handle variable dimensions, or we store the dimension and create
-- dimension-specific indexes as needed.

-- =============================================================================
-- UPDATE SETTING_WIKI_CHUNKS TABLE
-- =============================================================================

-- Drop the HNSW index first (it depends on the column type)
DROP INDEX IF EXISTS idx_wiki_chunks_embedding;

-- Drop and recreate the column WITHOUT dimension constraint
-- This allows vectors of any dimension to be stored
ALTER TABLE setting_wiki_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE setting_wiki_chunks ADD COLUMN embedding vector;

-- Add a column to track the embedding dimension for validation
ALTER TABLE setting_wiki_chunks ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER;

-- Add a global setting for the current embedding dimension
-- This helps ensure all embeddings in a setting pack use the same dimension
ALTER TABLE setting_knowledge_packs ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER;

-- =============================================================================
-- UPDATE RAG_QUERY_CACHE TABLE
-- =============================================================================

-- Update rag_query_cache to use variable-dimension vectors
ALTER TABLE rag_query_cache DROP COLUMN IF EXISTS query_embedding;
ALTER TABLE rag_query_cache ADD COLUMN query_embedding vector;

-- =============================================================================
-- NOTE ON INDEXES
-- =============================================================================
-- pgvector indexes (HNSW, IVFFlat) require either:
-- 1. Fixed dimensions specified on the column, OR
-- 2. Data already in the table (for IVFFlat)
--
-- Since we're using variable dimensions, we skip index creation here.
-- The search will use sequential scan which is fine for small datasets (<100k rows).
-- For larger datasets, create a dimension-specific index after data is loaded:
--
-- For 768-dim (Ollama nomic-embed-text):
--   CREATE INDEX idx_wiki_chunks_embedding_768 ON setting_wiki_chunks
--   USING hnsw ((embedding::vector(768)) vector_cosine_ops);
--
-- For 1536-dim (OpenAI):
--   CREATE INDEX idx_wiki_chunks_embedding_1536 ON setting_wiki_chunks
--   USING hnsw ((embedding::vector(1536)) vector_cosine_ops);

-- =============================================================================
-- UPDATE HELPER FUNCTIONS (remove dimension constraints)
-- =============================================================================

-- Function to search wiki chunks by similarity (dimension-agnostic)
CREATE OR REPLACE FUNCTION search_wiki_chunks(
    p_setting_slug VARCHAR(100),
    p_query_embedding vector,
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

-- Function to get RAG context for a campaign (dimension-agnostic)
CREATE OR REPLACE FUNCTION get_campaign_rag_context(
    p_campaign_id UUID,
    p_query_embedding vector,
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

-- =============================================================================
-- CLEANUP EXISTING DATA
-- =============================================================================

-- Reset scrape status since embeddings were cleared
UPDATE setting_knowledge_packs SET scrape_status = 'pending', total_chunks = 0;

-- Clear wiki pages processed flag so they get re-chunked
UPDATE setting_wiki_pages SET is_processed = FALSE;

-- Delete existing chunks (they'll be recreated during scrape)
DELETE FROM setting_wiki_chunks;
