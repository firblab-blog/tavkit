"""
RAG Database - PostgreSQL interface for wiki RAG system.

Handles:
- Connection management with asyncpg
- CRUD operations for wiki pages and chunks
- Vector similarity search with pgvector
- Scrape job management
"""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from .models import (
    CampaignSettingConfig,
    RAGContextResponse,
    ScrapeJobStatus,
    SettingKnowledgePack,
    WikiChunk,
    WikiChunkResult,
    WikiPage,
)

logger = logging.getLogger(__name__)

# Lazy import asyncpg to avoid issues if not installed
_asyncpg = None


def get_asyncpg():
    """Lazy load asyncpg."""
    global _asyncpg
    if _asyncpg is None:
        import asyncpg

        _asyncpg = asyncpg
    return _asyncpg


class RAGDatabase:
    """
    Async PostgreSQL database interface for RAG system.

    Uses asyncpg for high-performance async operations.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 5432,
        database: str = "tavkit",
        user: str = "tavkit",
        password: str = "",
    ):
        """Initialize database connection parameters."""
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self._pool = None

    async def connect(self):
        """Create connection pool."""
        asyncpg = get_asyncpg()
        self._pool = await asyncpg.create_pool(
            host=self.host,
            port=self.port,
            database=self.database,
            user=self.user,
            password=self.password,
            min_size=2,
            max_size=10,
        )
        logger.info(f"Connected to PostgreSQL at {self.host}:{self.port}/{self.database}")

    async def disconnect(self):
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()

    # =========================================================================
    # Setting Knowledge Packs
    # =========================================================================

    async def get_setting_pack(self, slug: str) -> Optional[SettingKnowledgePack]:
        """Get a setting pack by slug."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, name, slug, game_system, description, wiki_base_url, wiki_index_url,
                       scrape_config, scrape_status, total_pages, total_chunks, is_active,
                       created_at, updated_at
                FROM setting_knowledge_packs
                WHERE slug = $1
                """,
                slug,
            )
            if not row:
                return None

            return SettingKnowledgePack(
                id=row["id"],
                name=row["name"],
                slug=row["slug"],
                game_system=row["game_system"],
                description=row["description"],
                wiki_base_url=row["wiki_base_url"],
                wiki_index_url=row["wiki_index_url"],
                scrape_config=json.loads(row["scrape_config"] or "{}"),
                scrape_status=row["scrape_status"],
                total_pages=row["total_pages"],
                total_chunks=row["total_chunks"],
                is_active=row["is_active"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )

    async def get_setting_pack_by_id(self, pack_id: UUID) -> Optional[SettingKnowledgePack]:
        """Get a setting pack by ID."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, name, slug, game_system, description, wiki_base_url, wiki_index_url,
                       scrape_config, scrape_status, total_pages, total_chunks, is_active,
                       created_at, updated_at
                FROM setting_knowledge_packs
                WHERE id = $1
                """,
                pack_id,
            )
            if not row:
                return None

            return SettingKnowledgePack(
                id=row["id"],
                name=row["name"],
                slug=row["slug"],
                game_system=row["game_system"],
                description=row["description"],
                wiki_base_url=row["wiki_base_url"],
                wiki_index_url=row["wiki_index_url"],
                scrape_config=json.loads(row["scrape_config"] or "{}"),
                scrape_status=row["scrape_status"],
                total_pages=row["total_pages"],
                total_chunks=row["total_chunks"],
                is_active=row["is_active"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )

    async def list_setting_packs(self, active_only: bool = True) -> list[SettingKnowledgePack]:
        """List all setting packs."""
        async with self._pool.acquire() as conn:
            query = """
                SELECT id, name, slug, game_system, description, wiki_base_url, wiki_index_url,
                       scrape_config, scrape_status, total_pages, total_chunks, is_active,
                       created_at, updated_at
                FROM setting_knowledge_packs
            """
            if active_only:
                query += " WHERE is_active = true"
            query += " ORDER BY name"

            rows = await conn.fetch(query)
            return [
                SettingKnowledgePack(
                    id=row["id"],
                    name=row["name"],
                    slug=row["slug"],
                    game_system=row["game_system"],
                    description=row["description"],
                    wiki_base_url=row["wiki_base_url"],
                    wiki_index_url=row["wiki_index_url"],
                    scrape_config=json.loads(row["scrape_config"] or "{}"),
                    scrape_status=row["scrape_status"],
                    total_pages=row["total_pages"],
                    total_chunks=row["total_chunks"],
                    is_active=row["is_active"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]

    async def update_pack_stats(
        self, pack_id: UUID, total_pages: int, total_chunks: int, status: str
    ):
        """Update pack statistics after scraping."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE setting_knowledge_packs
                SET total_pages = $2, total_chunks = $3, scrape_status = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                """,
                pack_id,
                total_pages,
                total_chunks,
                status,
            )

    # =========================================================================
    # Wiki Pages
    # =========================================================================

    async def upsert_wiki_page(
        self,
        setting_pack_id: UUID,
        url: str,
        url_path: str,
        title: str,
        clean_text: str,
        categories: list[str],
        infobox_data: dict,
        raw_html: Optional[str] = None,
        last_modified: Optional[str] = None,
    ) -> UUID:
        """Insert or update a wiki page."""
        page_id = uuid4()
        word_count = len(clean_text.split())

        async with self._pool.acquire() as conn:
            # Try to get existing page
            existing = await conn.fetchrow(
                """
                SELECT id FROM setting_wiki_pages
                WHERE setting_pack_id = $1 AND url_path = $2
                """,
                setting_pack_id,
                url_path,
            )

            if existing:
                page_id = existing["id"]
                await conn.execute(
                    """
                    UPDATE setting_wiki_pages
                    SET title = $3, clean_text = $4, categories = $5, infobox_data = $6,
                        raw_html = $7, last_modified = $8, word_count = $9,
                        is_processed = false, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND setting_pack_id = $2
                    """,
                    page_id,
                    setting_pack_id,
                    title,
                    clean_text,
                    json.dumps(categories),
                    json.dumps(infobox_data),
                    raw_html,
                    last_modified,
                    word_count,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO setting_wiki_pages
                    (id, setting_pack_id, url, url_path, title, clean_text, categories,
                     infobox_data, raw_html, last_modified, word_count)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    """,
                    page_id,
                    setting_pack_id,
                    url,
                    url_path,
                    title,
                    clean_text,
                    json.dumps(categories),
                    json.dumps(infobox_data),
                    raw_html,
                    last_modified,
                    word_count,
                )

        return page_id

    async def get_unprocessed_pages(
        self, setting_pack_id: UUID, limit: int = 100
    ) -> list[WikiPage]:
        """Get pages that haven't been chunked/embedded yet."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, setting_pack_id, url, url_path, title, clean_text,
                       categories, infobox_data, is_processed, word_count, scraped_at
                FROM setting_wiki_pages
                WHERE setting_pack_id = $1 AND is_processed = false
                LIMIT $2
                """,
                setting_pack_id,
                limit,
            )

            return [
                WikiPage(
                    id=row["id"],
                    setting_pack_id=row["setting_pack_id"],
                    url=row["url"],
                    url_path=row["url_path"],
                    title=row["title"],
                    clean_text=row["clean_text"],
                    categories=json.loads(row["categories"] or "[]"),
                    infobox_data=json.loads(row["infobox_data"] or "{}"),
                    is_processed=row["is_processed"],
                    word_count=row["word_count"],
                    scraped_at=row["scraped_at"],
                )
                for row in rows
            ]

    async def mark_page_processed(self, page_id: UUID):
        """Mark a page as processed after chunking/embedding."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE setting_wiki_pages
                SET is_processed = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                """,
                page_id,
            )

    # =========================================================================
    # Wiki Chunks
    # =========================================================================

    async def delete_chunks_for_page(self, page_id: UUID):
        """Delete all chunks for a page (used before re-chunking)."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM setting_wiki_chunks WHERE page_id = $1",
                page_id,
            )

    async def insert_chunk(
        self,
        page_id: UUID,
        setting_pack_id: UUID,
        chunk_text: str,
        chunk_index: int,
        page_title: str,
        section_title: Optional[str],
        token_count: int,
        embedding: Optional[list[float]] = None,
        embedding_model: Optional[str] = None,
    ) -> UUID:
        """Insert a text chunk with optional embedding."""
        chunk_id = uuid4()

        async with self._pool.acquire() as conn:
            if embedding:
                # Format embedding as pgvector string
                embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
                await conn.execute(
                    """
                    INSERT INTO setting_wiki_chunks
                    (id, page_id, setting_pack_id, chunk_text, chunk_index, page_title,
                     section_title, token_count, char_count, embedding, embedding_model)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11)
                    ON CONFLICT (page_id, chunk_index) DO UPDATE SET
                        chunk_text = EXCLUDED.chunk_text,
                        page_title = EXCLUDED.page_title,
                        section_title = EXCLUDED.section_title,
                        token_count = EXCLUDED.token_count,
                        char_count = EXCLUDED.char_count,
                        embedding = EXCLUDED.embedding,
                        embedding_model = EXCLUDED.embedding_model
                    """,
                    chunk_id,
                    page_id,
                    setting_pack_id,
                    chunk_text,
                    chunk_index,
                    page_title,
                    section_title,
                    token_count,
                    len(chunk_text),
                    embedding_str,
                    embedding_model,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO setting_wiki_chunks
                    (id, page_id, setting_pack_id, chunk_text, chunk_index, page_title,
                     section_title, token_count, char_count)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (page_id, chunk_index) DO UPDATE SET
                        chunk_text = EXCLUDED.chunk_text,
                        page_title = EXCLUDED.page_title,
                        section_title = EXCLUDED.section_title,
                        token_count = EXCLUDED.token_count,
                        char_count = EXCLUDED.char_count,
                        embedding = NULL,
                        embedding_model = NULL
                    """,
                    chunk_id,
                    page_id,
                    setting_pack_id,
                    chunk_text,
                    chunk_index,
                    page_title,
                    section_title,
                    token_count,
                    len(chunk_text),
                )

        return chunk_id

    async def update_chunk_embedding(
        self, chunk_id: UUID, embedding: list[float], model: str
    ):
        """Update embedding for an existing chunk."""
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        async with self._pool.acquire() as conn:
            # Try with embedding_dimension column first, fall back if it doesn't exist
            try:
                await conn.execute(
                    """
                    UPDATE setting_wiki_chunks
                    SET embedding = $2::vector, embedding_model = $3, embedding_dimension = $4
                    WHERE id = $1
                    """,
                    chunk_id,
                    embedding_str,
                    model,
                    len(embedding),
                )
            except Exception as e:
                if "embedding_dimension" in str(e):
                    # Column doesn't exist yet (migration not applied), use fallback
                    await conn.execute(
                        """
                        UPDATE setting_wiki_chunks
                        SET embedding = $2::vector, embedding_model = $3
                        WHERE id = $1
                        """,
                        chunk_id,
                        embedding_str,
                        model,
                    )
                else:
                    raise

    async def search_chunks(
        self,
        setting_slug: str,
        query_embedding: list[float],
        limit: int = 5,
        min_similarity: float = 0.7,
    ) -> list[WikiChunkResult]:
        """
        Search for similar chunks using vector similarity.

        Uses cosine similarity via pgvector's <=> operator.
        """
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    c.id as chunk_id,
                    c.page_title,
                    c.section_title,
                    c.chunk_text,
                    1 - (c.embedding <=> $2::vector) as similarity,
                    wp.url as source_url
                FROM setting_wiki_chunks c
                JOIN setting_knowledge_packs p ON c.setting_pack_id = p.id
                JOIN setting_wiki_pages wp ON c.page_id = wp.id
                WHERE p.slug = $1
                  AND c.embedding IS NOT NULL
                  AND 1 - (c.embedding <=> $2::vector) >= $4
                ORDER BY c.embedding <=> $2::vector
                LIMIT $3
                """,
                setting_slug,
                embedding_str,
                limit,
                min_similarity,
            )

            return [
                WikiChunkResult(
                    chunk_id=row["chunk_id"],
                    page_title=row["page_title"],
                    section_title=row["section_title"],
                    chunk_text=row["chunk_text"],
                    similarity=row["similarity"],
                    source_url=row["source_url"],
                )
                for row in rows
            ]

    async def get_chunks_without_embeddings(
        self, setting_pack_id: UUID, limit: int = 100
    ) -> list[tuple[UUID, str]]:
        """Get chunks that need embeddings generated."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, chunk_text
                FROM setting_wiki_chunks
                WHERE setting_pack_id = $1 AND embedding IS NULL
                LIMIT $2
                """,
                setting_pack_id,
                limit,
            )
            return [(row["id"], row["chunk_text"]) for row in rows]

    # =========================================================================
    # Scrape Jobs
    # =========================================================================

    async def create_scrape_job(self, setting_pack_id: UUID) -> UUID:
        """Create a new scrape job."""
        job_id = uuid4()

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO wiki_scrape_jobs (id, setting_pack_id, status)
                VALUES ($1, $2, 'pending')
                """,
                job_id,
                setting_pack_id,
            )

        return job_id

    async def update_scrape_job(
        self,
        job_id: UUID,
        status: Optional[str] = None,
        current_phase: Optional[str] = None,
        pages_found: Optional[int] = None,
        pages_scraped: Optional[int] = None,
        pages_failed: Optional[int] = None,
        chunks_created: Optional[int] = None,
        chunks_embedded: Optional[int] = None,
        progress_percent: Optional[int] = None,
        error_message: Optional[str] = None,
    ):
        """Update scrape job progress."""
        updates = []
        params = [job_id]
        param_idx = 2

        if status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1
            if status == "scraping":
                updates.append("started_at = CURRENT_TIMESTAMP")
            elif status in ("completed", "failed"):
                updates.append("completed_at = CURRENT_TIMESTAMP")

        if current_phase is not None:
            updates.append(f"current_phase = ${param_idx}")
            params.append(current_phase)
            param_idx += 1

        if pages_found is not None:
            updates.append(f"pages_found = ${param_idx}")
            params.append(pages_found)
            param_idx += 1

        if pages_scraped is not None:
            updates.append(f"pages_scraped = ${param_idx}")
            params.append(pages_scraped)
            param_idx += 1

        if pages_failed is not None:
            updates.append(f"pages_failed = ${param_idx}")
            params.append(pages_failed)
            param_idx += 1

        if chunks_created is not None:
            updates.append(f"chunks_created = ${param_idx}")
            params.append(chunks_created)
            param_idx += 1

        if chunks_embedded is not None:
            updates.append(f"chunks_embedded = ${param_idx}")
            params.append(chunks_embedded)
            param_idx += 1

        if progress_percent is not None:
            updates.append(f"progress_percent = ${param_idx}")
            params.append(progress_percent)
            param_idx += 1

        if error_message is not None:
            updates.append(f"error_message = ${param_idx}")
            params.append(error_message)
            param_idx += 1

        if not updates:
            return

        query = f"UPDATE wiki_scrape_jobs SET {', '.join(updates)} WHERE id = $1"

        async with self._pool.acquire() as conn:
            await conn.execute(query, *params)

    async def get_scrape_job(self, job_id: UUID) -> Optional[ScrapeJobStatus]:
        """Get scrape job status."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, setting_pack_id, status, current_phase, pages_found,
                       pages_scraped, pages_failed, chunks_created, chunks_embedded,
                       progress_percent, error_message, started_at, completed_at
                FROM wiki_scrape_jobs
                WHERE id = $1
                """,
                job_id,
            )

            if not row:
                return None

            return ScrapeJobStatus(
                id=row["id"],
                setting_pack_id=row["setting_pack_id"],
                status=row["status"],
                current_phase=row["current_phase"],
                pages_found=row["pages_found"],
                pages_scraped=row["pages_scraped"],
                pages_failed=row["pages_failed"],
                chunks_created=row["chunks_created"],
                chunks_embedded=row["chunks_embedded"],
                progress_percent=row["progress_percent"],
                error_message=row["error_message"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
            )

    async def get_active_scrape_jobs(self) -> list[dict]:
        """Get all in-progress scrape jobs with their setting pack info."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT j.id, j.setting_pack_id, j.status, j.current_phase, j.pages_found,
                       j.pages_scraped, j.pages_failed, j.chunks_created, j.chunks_embedded,
                       j.progress_percent, j.error_message, j.started_at, j.completed_at,
                       sp.slug as setting_slug, sp.name as setting_name
                FROM wiki_scrape_jobs j
                JOIN setting_knowledge_packs sp ON j.setting_pack_id = sp.id
                WHERE j.status IN ('pending', 'scraping', 'embedding')
                ORDER BY j.created_at DESC
                """
            )

            return [
                {
                    "job_id": str(row["id"]),
                    "setting_pack_id": str(row["setting_pack_id"]),
                    "setting_slug": row["setting_slug"],
                    "setting_name": row["setting_name"],
                    "status": row["status"],
                    "current_phase": row["current_phase"],
                    "pages_found": row["pages_found"] or 0,
                    "pages_scraped": row["pages_scraped"] or 0,
                    "pages_failed": row["pages_failed"] or 0,
                    "chunks_created": row["chunks_created"] or 0,
                    "chunks_embedded": row["chunks_embedded"] or 0,
                    "progress_percent": row["progress_percent"] or 0,
                    "error_message": row["error_message"],
                    "started_at": row["started_at"].isoformat() if row["started_at"] else None,
                    "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
                }
                for row in rows
            ]

    async def cancel_scrape_job(self, job_id: UUID) -> bool:
        """Cancel a scrape job by marking it as failed."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE wiki_scrape_jobs
                SET status = 'failed',
                    error_message = 'Cancelled by user',
                    completed_at = NOW()
                WHERE id = $1 AND status IN ('pending', 'scraping', 'embedding')
                """,
                job_id,
            )
            return result == "UPDATE 1"

    # =========================================================================
    # Campaign Setting Config
    # =========================================================================

    async def get_campaign_setting_config(
        self, campaign_id: UUID
    ) -> Optional[CampaignSettingConfig]:
        """Get setting config for a campaign."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, campaign_id, setting_pack_id, custom_overrides,
                       excluded_categories, knowledge_depth, max_context_chunks,
                       show_source_links
                FROM campaign_setting_config
                WHERE campaign_id = $1
                """,
                campaign_id,
            )

            if not row:
                return None

            return CampaignSettingConfig(
                id=row["id"],
                campaign_id=row["campaign_id"],
                setting_pack_id=row["setting_pack_id"],
                custom_overrides=json.loads(row["custom_overrides"] or "{}"),
                excluded_categories=json.loads(row["excluded_categories"] or "[]"),
                knowledge_depth=row["knowledge_depth"],
                max_context_chunks=row["max_context_chunks"],
                show_source_links=row["show_source_links"],
            )

    async def upsert_campaign_setting_config(
        self,
        campaign_id: UUID,
        setting_pack_id: Optional[UUID] = None,
        knowledge_depth: str = "standard",
        max_context_chunks: int = 5,
    ) -> UUID:
        """Create or update campaign setting config."""
        config_id = uuid4()

        async with self._pool.acquire() as conn:
            # Check for existing
            existing = await conn.fetchrow(
                "SELECT id FROM campaign_setting_config WHERE campaign_id = $1",
                campaign_id,
            )

            if existing:
                config_id = existing["id"]
                await conn.execute(
                    """
                    UPDATE campaign_setting_config
                    SET setting_pack_id = $2, knowledge_depth = $3,
                        max_context_chunks = $4, updated_at = CURRENT_TIMESTAMP
                    WHERE campaign_id = $1
                    """,
                    campaign_id,
                    setting_pack_id,
                    knowledge_depth,
                    max_context_chunks,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO campaign_setting_config
                    (id, campaign_id, setting_pack_id, knowledge_depth, max_context_chunks)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    config_id,
                    campaign_id,
                    setting_pack_id,
                    knowledge_depth,
                    max_context_chunks,
                )

        return config_id
