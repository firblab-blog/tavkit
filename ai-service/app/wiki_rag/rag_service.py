"""
RAG Service - Main orchestration service for wiki RAG.

Handles:
- Wiki scraping orchestration
- Chunk processing and embedding
- RAG context retrieval for AI generation
"""

import asyncio
import logging
from typing import Optional
from uuid import UUID

from .chunker import TextChunker
from .database import RAGDatabase
from .embedder import EmbeddingGenerator
from .models import RAGContextResponse, ScrapeJobStatus, WikiChunkResult
from .scraper import WikiScraper

logger = logging.getLogger(__name__)


class RAGService:
    """
    Main RAG service for wiki-based knowledge retrieval.

    Orchestrates:
    1. Wiki scraping (async, with job tracking)
    2. Text chunking and embedding
    3. Similarity search for AI context
    """

    def __init__(
        self,
        db: RAGDatabase,
        embedder: Optional[EmbeddingGenerator] = None,
        chunker: Optional[TextChunker] = None,
    ):
        """
        Initialize RAG service.

        Args:
            db: RAGDatabase instance
            embedder: EmbeddingGenerator instance (created if not provided)
            chunker: TextChunker instance (created if not provided)
        """
        self.db = db
        self.embedder = embedder or EmbeddingGenerator()
        self.chunker = chunker or TextChunker()

    async def start_scrape_job(self, setting_slug: str) -> UUID:
        """
        Start a new wiki scraping job.

        Args:
            setting_slug: Slug of the setting pack (e.g., "eberron")

        Returns:
            Job ID for tracking progress
        """
        # Get setting pack
        pack = await self.db.get_setting_pack(setting_slug)
        if not pack:
            raise ValueError(f"Setting pack not found: {setting_slug}")

        if not pack.wiki_index_url:
            raise ValueError(f"No wiki URL configured for: {setting_slug}")

        # Create job
        job_id = await self.db.create_scrape_job(pack.id)

        # Start scraping in background
        asyncio.create_task(self._run_scrape_job(job_id, pack))

        return job_id

    async def _run_scrape_job(self, job_id: UUID, pack):
        """Run the full scrape job (scraping → chunking → embedding)."""
        try:
            # Phase 1: Scraping
            await self.db.update_scrape_job(
                job_id,
                status="scraping",
                current_phase="Scraping wiki pages",
            )

            pages_scraped = 0
            pages_failed = 0

            async with WikiScraper(
                pack.wiki_base_url,
                scrape_config=pack.scrape_config,
                rate_limit=1.0,
            ) as scraper:

                async def progress_callback(found: int, scraped: int):
                    nonlocal pages_scraped
                    pages_scraped = scraped
                    progress = min(40, int((scraped / max(found, 1)) * 40))
                    await self.db.update_scrape_job(
                        job_id,
                        pages_found=found,
                        pages_scraped=scraped,
                        progress_percent=progress,
                    )

                pages = await scraper.crawl(
                    pack.wiki_index_url,
                    progress_callback=progress_callback,
                )

            # Save pages to database
            for page_data in pages:
                try:
                    await self.db.upsert_wiki_page(
                        setting_pack_id=pack.id,
                        url=page_data["url"],
                        url_path=page_data["url_path"],
                        title=page_data["title"],
                        clean_text=page_data["clean_text"],
                        categories=page_data.get("categories", []),
                        infobox_data=page_data.get("infobox_data", {}),
                        last_modified=page_data.get("last_modified"),
                    )
                except Exception as e:
                    logger.error(f"Failed to save page {page_data['url']}: {e}")
                    pages_failed += 1

            await self.db.update_scrape_job(
                job_id,
                pages_scraped=len(pages) - pages_failed,
                pages_failed=pages_failed,
                progress_percent=40,
            )

            # Phase 2: Chunking
            await self.db.update_scrape_job(
                job_id,
                current_phase="Creating text chunks",
            )

            unprocessed_pages = await self.db.get_unprocessed_pages(pack.id, limit=1000)
            total_chunks = 0

            for i, page in enumerate(unprocessed_pages):
                chunks = self.chunker.chunk_text(page.clean_text, page.title)

                for chunk in chunks:
                    await self.db.insert_chunk(
                        page_id=page.id,
                        setting_pack_id=pack.id,
                        chunk_text=chunk.text,
                        chunk_index=chunk.chunk_index,
                        page_title=page.title,
                        section_title=chunk.section_title,
                        token_count=chunk.token_count,
                    )
                    total_chunks += 1

                await self.db.mark_page_processed(page.id)

                # Update progress (40-70%)
                progress = 40 + int((i / max(len(unprocessed_pages), 1)) * 30)
                await self.db.update_scrape_job(
                    job_id,
                    chunks_created=total_chunks,
                    progress_percent=progress,
                )

            # Phase 3: Embedding
            await self.db.update_scrape_job(
                job_id,
                status="embedding",
                current_phase="Generating embeddings",
                progress_percent=70,
            )

            chunks_embedded = 0
            batch_size = 50

            while True:
                chunks_to_embed = await self.db.get_chunks_without_embeddings(
                    pack.id, limit=batch_size
                )

                if not chunks_to_embed:
                    break

                # Generate embeddings in batch
                chunk_ids = [c[0] for c in chunks_to_embed]
                chunk_texts = [c[1] for c in chunks_to_embed]

                try:
                    embeddings = await self.embedder.embed_batch(chunk_texts)

                    # Save embeddings
                    for chunk_id, embedding in zip(chunk_ids, embeddings):
                        await self.db.update_chunk_embedding(
                            chunk_id, embedding, self.embedder.model
                        )
                        chunks_embedded += 1

                except Exception as e:
                    logger.error(f"Embedding batch failed: {e}")
                    # Continue with next batch

                # Update progress (70-100%)
                progress = 70 + int((chunks_embedded / max(total_chunks, 1)) * 30)
                await self.db.update_scrape_job(
                    job_id,
                    chunks_embedded=chunks_embedded,
                    progress_percent=min(progress, 99),
                )

            # Complete
            await self.db.update_pack_stats(
                pack.id,
                total_pages=len(pages) - pages_failed,
                total_chunks=total_chunks,
                status="completed",
            )

            await self.db.update_scrape_job(
                job_id,
                status="completed",
                current_phase="Complete",
                progress_percent=100,
            )

            logger.info(
                f"Scrape job completed: {pack.slug} - "
                f"{len(pages)} pages, {total_chunks} chunks, {chunks_embedded} embedded"
            )

        except Exception as e:
            logger.exception(f"Scrape job failed: {e}")
            await self.db.update_scrape_job(
                job_id,
                status="failed",
                error_message=str(e),
            )

    async def get_job_status(self, job_id: UUID) -> Optional[ScrapeJobStatus]:
        """Get the status of a scrape job."""
        return await self.db.get_scrape_job(job_id)

    async def get_rag_context(
        self,
        query: str,
        setting_slug: Optional[str] = None,
        campaign_id: Optional[UUID] = None,
        max_results: int = 5,
        min_similarity: float = 0.7,
    ) -> RAGContextResponse:
        """
        Get RAG context for AI generation.

        Args:
            query: The user's query or generation request
            setting_slug: Direct setting slug (e.g., "eberron")
            campaign_id: Campaign ID to look up setting from
            max_results: Maximum chunks to return
            min_similarity: Minimum similarity threshold

        Returns:
            RAGContextResponse with chunks and formatted context
        """
        # Determine setting
        actual_slug = setting_slug
        if not actual_slug and campaign_id:
            config = await self.db.get_campaign_setting_config(campaign_id)
            if config and config.setting_pack_id:
                pack = await self.db.get_setting_pack_by_id(config.setting_pack_id)
                if pack:
                    actual_slug = pack.slug
                    max_results = config.max_context_chunks

        if not actual_slug:
            return RAGContextResponse(
                setting_name="",
                chunks=[],
                total_tokens=0,
                formatted_context="",
            )

        # Get setting pack info
        pack = await self.db.get_setting_pack(actual_slug)
        if not pack:
            return RAGContextResponse(
                setting_name="",
                chunks=[],
                total_tokens=0,
                formatted_context="",
            )

        # Generate query embedding
        query_embedding = await self.embedder.embed_text(query)

        # Search for similar chunks
        chunks = await self.db.search_chunks(
            actual_slug,
            query_embedding,
            limit=max_results,
            min_similarity=min_similarity,
        )

        # Calculate total tokens
        total_tokens = sum(len(c.chunk_text.split()) for c in chunks)  # Approximate

        # Format context for prompt injection
        formatted_context = self._format_context(pack.name, chunks)

        return RAGContextResponse(
            setting_name=pack.name,
            chunks=chunks,
            total_tokens=total_tokens,
            formatted_context=formatted_context,
        )

    def _format_context(self, setting_name: str, chunks: list[WikiChunkResult]) -> str:
        """Format chunks into a prompt-ready context string."""
        if not chunks:
            return ""

        lines = [f"SETTING KNOWLEDGE ({setting_name}):", ""]

        for chunk in chunks:
            header = chunk.page_title
            if chunk.section_title:
                header = f"{chunk.page_title} > {chunk.section_title}"

            lines.append(f"[{header}]")
            lines.append(chunk.chunk_text)
            lines.append("")

        lines.append(
            "Use the above setting knowledge to ensure generated content "
            "is consistent with the campaign world. Reference specific details "
            "where appropriate."
        )

        return "\n".join(lines)

    async def search_setting_knowledge(
        self,
        setting_slug: str,
        query: str,
        max_results: int = 10,
    ) -> list[WikiChunkResult]:
        """
        Search setting knowledge directly.

        Useful for displaying search results to users or debugging.
        """
        query_embedding = await self.embedder.embed_text(query)
        return await self.db.search_chunks(
            setting_slug,
            query_embedding,
            limit=max_results,
            min_similarity=0.5,  # Lower threshold for browsing
        )
