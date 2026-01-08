"""
Pydantic models for the Wiki RAG system.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SettingKnowledgePack(BaseModel):
    """A D&D setting knowledge pack (e.g., Eberron, Forgotten Realms)."""

    id: UUID
    name: str
    slug: str
    game_system: str = "D&D 5e"
    description: Optional[str] = None
    wiki_base_url: Optional[str] = None
    wiki_index_url: Optional[str] = None
    scrape_config: dict = Field(default_factory=dict)
    scrape_status: str = "pending"
    total_pages: int = 0
    total_chunks: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class WikiPage(BaseModel):
    """A scraped wiki page."""

    id: UUID
    setting_pack_id: UUID
    url: str
    url_path: str
    title: str
    clean_text: str
    categories: list[str] = Field(default_factory=list)
    infobox_data: dict = Field(default_factory=dict)
    is_processed: bool = False
    word_count: int = 0
    scraped_at: datetime


class WikiChunk(BaseModel):
    """A text chunk from a wiki page with embedding."""

    id: UUID
    page_id: UUID
    setting_pack_id: UUID
    chunk_text: str
    chunk_index: int
    page_title: str
    section_title: Optional[str] = None
    token_count: int = 0
    char_count: int = 0
    embedding: Optional[list[float]] = None
    embedding_model: Optional[str] = None


class WikiChunkResult(BaseModel):
    """A wiki chunk returned from similarity search."""

    chunk_id: UUID
    page_title: str
    section_title: Optional[str] = None
    chunk_text: str
    similarity: float
    source_url: Optional[str] = None


class ScrapeJobStatus(BaseModel):
    """Status of a wiki scraping job."""

    id: UUID
    setting_pack_id: UUID
    status: str  # pending, scraping, embedding, completed, failed
    current_phase: Optional[str] = None
    pages_found: int = 0
    pages_scraped: int = 0
    pages_failed: int = 0
    chunks_created: int = 0
    chunks_embedded: int = 0
    progress_percent: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class CampaignSettingConfig(BaseModel):
    """Per-campaign setting configuration."""

    id: UUID
    campaign_id: UUID
    setting_pack_id: Optional[UUID] = None
    custom_overrides: dict = Field(default_factory=dict)
    excluded_categories: list[str] = Field(default_factory=list)
    knowledge_depth: str = "standard"  # minimal, standard, comprehensive
    max_context_chunks: int = 5
    show_source_links: bool = True


class RAGQueryRequest(BaseModel):
    """Request for RAG context retrieval."""

    query: str
    setting_slug: Optional[str] = None
    campaign_id: Optional[UUID] = None
    max_results: int = 5
    min_similarity: float = 0.7


class RAGContextResponse(BaseModel):
    """Response containing RAG context for AI generation."""

    setting_name: str
    chunks: list[WikiChunkResult]
    total_tokens: int = 0
    formatted_context: str = ""  # Pre-formatted for prompt injection
