"""
RAG API Routes - Endpoints for wiki RAG system.

Provides:
- Setting pack management
- Wiki scraping job control
- RAG context retrieval
- Setting knowledge search
"""

import logging
import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.wiki_rag import EmbeddingGenerator, RAGDatabase, RAGService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])

# Database connection settings from environment
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "postgres"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "tavkit"),
    "user": os.getenv("DB_USER", "tavkit"),
    "password": os.getenv("DB_PASSWORD", ""),
}


# Singleton instances (lazy initialized)
_rag_db: Optional[RAGDatabase] = None
_rag_service: Optional[RAGService] = None


async def get_rag_service() -> RAGService:
    """Get or create RAG service instance."""
    global _rag_db, _rag_service

    if _rag_service is None:
        _rag_db = RAGDatabase(**DB_CONFIG)
        await _rag_db.connect()

        # Auto-detect embedding provider based on available API keys
        # (OpenAI if OPENAI_API_KEY set, otherwise Ollama)
        embedder = EmbeddingGenerator()
        logger.info(
            f"RAG service initialized:\n"
            f"  Embedding provider: {embedder.provider}\n"
            f"  Embedding model: {embedder.model}\n"
            f"  Embedding dimensions: {embedder.dimensions}\n"
            f"  Context limit: {embedder.context_limit} tokens\n"
            f"  Recommended chunk size: {embedder.get_recommended_chunk_size()} tokens"
        )

        _rag_service = RAGService(db=_rag_db, embedder=embedder)

    return _rag_service


# =============================================================================
# Request/Response Models
# =============================================================================


class SettingPackResponse(BaseModel):
    """Response model for setting pack info."""

    id: UUID
    name: str
    slug: str
    game_system: str
    description: Optional[str]
    wiki_base_url: Optional[str]
    scrape_status: str
    total_pages: int
    total_chunks: int
    is_active: bool


class ScrapeJobResponse(BaseModel):
    """Response model for scrape job status."""

    job_id: UUID
    setting_pack_id: UUID
    status: str
    current_phase: Optional[str]
    pages_found: int
    pages_scraped: int
    pages_failed: int
    chunks_created: int
    chunks_embedded: int
    progress_percent: int
    error_message: Optional[str]


class StartScrapeRequest(BaseModel):
    """Request to start a scrape job."""

    setting_slug: str = Field(..., description="Slug of the setting pack (e.g., 'eberron')")


class RAGQueryRequest(BaseModel):
    """Request for RAG context retrieval."""

    query: str = Field(..., description="Query text for similarity search")
    setting_slug: Optional[str] = Field(None, description="Setting slug (e.g., 'eberron')")
    campaign_id: Optional[UUID] = Field(None, description="Campaign ID to get setting from")
    max_results: int = Field(5, ge=1, le=20, description="Maximum chunks to return")
    min_similarity: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity threshold")


class ChunkResult(BaseModel):
    """A single chunk from RAG search."""

    chunk_id: UUID
    page_title: str
    section_title: Optional[str]
    chunk_text: str
    similarity: float
    source_url: Optional[str]


class RAGContextResponse(BaseModel):
    """Response with RAG context for AI generation."""

    setting_name: str
    chunks: list[ChunkResult]
    total_tokens: int
    formatted_context: str


class SearchRequest(BaseModel):
    """Request for knowledge search."""

    setting_slug: str
    query: str
    max_results: int = Field(10, ge=1, le=50)


class CampaignSettingRequest(BaseModel):
    """Request to set campaign's setting pack."""

    campaign_id: UUID
    setting_slug: Optional[str] = Field(None, description="Setting slug or null for homebrew")
    knowledge_depth: str = Field("standard", description="minimal, standard, comprehensive")
    max_context_chunks: int = Field(5, ge=1, le=20)


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/settings", response_model=list[SettingPackResponse])
async def list_setting_packs():
    """
    List all available setting packs.

    Returns packs like Eberron, Forgotten Realms, etc.
    """
    try:
        service = await get_rag_service()
        packs = await service.db.list_setting_packs(active_only=True)

        return [
            SettingPackResponse(
                id=p.id,
                name=p.name,
                slug=p.slug,
                game_system=p.game_system,
                description=p.description,
                wiki_base_url=p.wiki_base_url,
                scrape_status=p.scrape_status,
                total_pages=p.total_pages,
                total_chunks=p.total_chunks,
                is_active=p.is_active,
            )
            for p in packs
        ]
    except Exception as e:
        logger.exception("Failed to list setting packs")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/{slug}", response_model=SettingPackResponse)
async def get_setting_pack(slug: str):
    """Get details of a specific setting pack."""
    try:
        service = await get_rag_service()
        pack = await service.db.get_setting_pack(slug)

        if not pack:
            raise HTTPException(status_code=404, detail=f"Setting pack not found: {slug}")

        return SettingPackResponse(
            id=pack.id,
            name=pack.name,
            slug=pack.slug,
            game_system=pack.game_system,
            description=pack.description,
            wiki_base_url=pack.wiki_base_url,
            scrape_status=pack.scrape_status,
            total_pages=pack.total_pages,
            total_chunks=pack.total_chunks,
            is_active=pack.is_active,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get setting pack: {slug}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape/start", response_model=ScrapeJobResponse)
async def start_scrape_job(request: StartScrapeRequest, background_tasks: BackgroundTasks):
    """
    Start a wiki scraping job for a setting pack.

    This will:
    1. Crawl the wiki starting from the index page
    2. Extract and clean text from each page
    3. Split text into chunks
    4. Generate vector embeddings for each chunk

    The job runs in the background. Use GET /rag/scrape/job/{job_id} to check progress.
    """
    try:
        print(f"[API ROUTE] Starting scrape for: {request.setting_slug}")
        service = await get_rag_service()
        print(f"[API ROUTE] Got RAG service, calling start_scrape_job...")
        job_id = await service.start_scrape_job(request.setting_slug)
        print(f"[API ROUTE] Job created: {job_id}")

        # Get initial job status
        job = await service.get_job_status(job_id)

        return ScrapeJobResponse(
            job_id=job.id,
            setting_pack_id=job.setting_pack_id,
            status=job.status,
            current_phase=job.current_phase,
            pages_found=job.pages_found,
            pages_scraped=job.pages_scraped,
            pages_failed=job.pages_failed,
            chunks_created=job.chunks_created,
            chunks_embedded=job.chunks_embedded,
            progress_percent=job.progress_percent,
            error_message=job.error_message,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to start scrape job")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scrape/job/{job_id}", response_model=ScrapeJobResponse)
async def get_scrape_job_status(job_id: UUID):
    """Get the status of a scrape job."""
    try:
        service = await get_rag_service()
        job = await service.get_job_status(job_id)

        if not job:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        return ScrapeJobResponse(
            job_id=job.id,
            setting_pack_id=job.setting_pack_id,
            status=job.status,
            current_phase=job.current_phase,
            pages_found=job.pages_found,
            pages_scraped=job.pages_scraped,
            pages_failed=job.pages_failed,
            chunks_created=job.chunks_created,
            chunks_embedded=job.chunks_embedded,
            progress_percent=job.progress_percent,
            error_message=job.error_message,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get job status: {job_id}")
        raise HTTPException(status_code=500, detail=str(e))


class ActiveScrapeJobResponse(BaseModel):
    """Response model for active scrape job with setting info."""

    job_id: str
    setting_pack_id: str
    setting_slug: str
    setting_name: str
    status: str
    current_phase: Optional[str]
    pages_found: int
    pages_scraped: int
    pages_failed: int
    chunks_created: int
    chunks_embedded: int
    progress_percent: int
    error_message: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]


@router.get("/scrape/jobs/active", response_model=list[ActiveScrapeJobResponse])
async def get_active_scrape_jobs():
    """
    Get all currently active (in-progress) scrape jobs.

    Returns jobs with status 'pending', 'scraping', or 'embedding'.
    Useful for recovering UI state after page refresh.
    """
    try:
        service = await get_rag_service()
        jobs = await service.get_active_jobs()
        return [ActiveScrapeJobResponse(**job) for job in jobs]
    except Exception as e:
        logger.exception("Failed to get active scrape jobs")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape/job/{job_id}/cancel")
async def cancel_scrape_job(job_id: str):
    """
    Cancel an active scrape job.

    Marks the job as failed with 'Cancelled by user' message.
    """
    try:
        service = await get_rag_service()
        success = await service.cancel_job(UUID(job_id))
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Job not found or already completed",
            )
        return {"success": True, "message": "Job cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to cancel job: {job_id}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/context", response_model=RAGContextResponse)
async def get_rag_context(request: RAGQueryRequest):
    """
    Get RAG context for AI generation.

    Searches the setting knowledge base for chunks relevant to the query,
    and returns them formatted for injection into AI prompts.

    You can specify either:
    - `setting_slug`: Direct setting (e.g., "eberron")
    - `campaign_id`: Campaign to look up the setting from

    Example usage for NPC generation:
    ```
    POST /rag/context
    {
        "query": "mysterious warforged spy in Sharn",
        "setting_slug": "eberron",
        "max_results": 5
    }
    ```
    """
    try:
        service = await get_rag_service()

        result = await service.get_rag_context(
            query=request.query,
            setting_slug=request.setting_slug,
            campaign_id=request.campaign_id,
            max_results=request.max_results,
            min_similarity=request.min_similarity,
        )

        return RAGContextResponse(
            setting_name=result.setting_name,
            chunks=[
                ChunkResult(
                    chunk_id=c.chunk_id,
                    page_title=c.page_title,
                    section_title=c.section_title,
                    chunk_text=c.chunk_text,
                    similarity=c.similarity,
                    source_url=c.source_url,
                )
                for c in result.chunks
            ],
            total_tokens=result.total_tokens,
            formatted_context=result.formatted_context,
        )

    except Exception as e:
        logger.exception("Failed to get RAG context")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=list[ChunkResult])
async def search_setting_knowledge(request: SearchRequest):
    """
    Search setting knowledge directly.

    Useful for browsing/exploring the knowledge base,
    or for displaying search results to users.
    """
    try:
        service = await get_rag_service()

        chunks = await service.search_setting_knowledge(
            setting_slug=request.setting_slug,
            query=request.query,
            max_results=request.max_results,
        )

        return [
            ChunkResult(
                chunk_id=c.chunk_id,
                page_title=c.page_title,
                section_title=c.section_title,
                chunk_text=c.chunk_text,
                similarity=c.similarity,
                source_url=c.source_url,
            )
            for c in chunks
        ]

    except Exception as e:
        logger.exception("Failed to search knowledge")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaign/setting")
async def set_campaign_setting(request: CampaignSettingRequest):
    """
    Set the campaign's knowledge base setting.

    This links a campaign to a setting pack (like Eberron),
    so AI generations for that campaign will use relevant lore.
    """
    try:
        service = await get_rag_service()

        # Get pack ID from slug if provided
        pack_id = None
        if request.setting_slug:
            pack = await service.db.get_setting_pack(request.setting_slug)
            if not pack:
                raise HTTPException(
                    status_code=404, detail=f"Setting pack not found: {request.setting_slug}"
                )
            pack_id = pack.id

        config_id = await service.db.upsert_campaign_setting_config(
            campaign_id=request.campaign_id,
            setting_pack_id=pack_id,
            knowledge_depth=request.knowledge_depth,
            max_context_chunks=request.max_context_chunks,
        )

        return {"config_id": str(config_id), "status": "updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to set campaign setting")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{campaign_id}/setting")
async def get_campaign_setting(campaign_id: UUID):
    """Get the current setting configuration for a campaign."""
    try:
        service = await get_rag_service()

        config = await service.db.get_campaign_setting_config(campaign_id)

        if not config:
            return {
                "campaign_id": str(campaign_id),
                "setting_pack": None,
                "knowledge_depth": "standard",
                "max_context_chunks": 5,
            }

        # Get pack details if set
        pack_info = None
        if config.setting_pack_id:
            # We'd need to add a get_setting_pack_by_id method, for now return ID
            pack_info = {"id": str(config.setting_pack_id)}

        return {
            "campaign_id": str(campaign_id),
            "setting_pack": pack_info,
            "knowledge_depth": config.knowledge_depth,
            "max_context_chunks": config.max_context_chunks,
            "show_source_links": config.show_source_links,
        }

    except Exception as e:
        logger.exception(f"Failed to get campaign setting: {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))
