"""
Wiki RAG Module - Retrieval-Augmented Generation for D&D Setting Knowledge

This module provides:
- Wiki scraping for Fandom wikis (Eberron, Forgotten Realms, etc.)
- Text chunking and embedding generation
- Vector similarity search via pgvector
- RAG context injection for AI generators
"""

from .scraper import WikiScraper
from .chunker import TextChunker
from .embedder import EmbeddingGenerator
from .database import RAGDatabase
from .rag_service import RAGService

__all__ = [
    "WikiScraper",
    "TextChunker",
    "EmbeddingGenerator",
    "RAGDatabase",
    "RAGService",
]
