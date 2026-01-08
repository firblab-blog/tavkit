-- Migration 0004: Dynamic embedding dimensions
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

-- Create a basic index (not HNSW - that requires fixed dimensions)
-- For small datasets this is fine; for large datasets, create dimension-specific HNSW indexes
CREATE INDEX IF NOT EXISTS idx_wiki_chunks_embedding ON setting_wiki_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Reset scrape status since embeddings were cleared
UPDATE setting_knowledge_packs SET scrape_status = 'pending', total_chunks = 0;

-- Clear wiki pages processed flag so they get re-chunked
UPDATE setting_wiki_pages SET processed = FALSE;

-- Delete existing chunks (they'll be recreated during scrape)
DELETE FROM setting_wiki_chunks;
