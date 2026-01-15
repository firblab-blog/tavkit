"""
Text Chunker - Splits wiki content into embedding-ready chunks.

Handles:
- Smart text splitting at sentence/paragraph boundaries
- Section-aware chunking (keeps section context)
- Token counting for embedding model limits
- Overlap for better retrieval
"""

import logging
import re
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy load tiktoken to avoid import errors if not installed
_tokenizer = None


def get_tokenizer():
    """Get tiktoken tokenizer, lazy loaded."""
    global _tokenizer
    if _tokenizer is None:
        try:
            import tiktoken

            _tokenizer = tiktoken.get_encoding("cl100k_base")  # GPT-4/text-embedding-3 encoding
        except ImportError:
            logger.warning("tiktoken not installed, using approximate token counting")
            _tokenizer = "approximate"
    return _tokenizer


def count_tokens(text: str) -> int:
    """Count tokens in text."""
    tokenizer = get_tokenizer()
    if tokenizer == "approximate":
        # Rough approximation: ~4 chars per token for English
        return len(text) // 4
    return len(tokenizer.encode(text))


@dataclass
class TextChunk:
    """A chunk of text with metadata."""

    text: str
    chunk_index: int
    section_title: Optional[str]
    token_count: int
    char_count: int
    start_char: int
    end_char: int


class TextChunker:
    """
    Chunks text for embedding generation.

    Uses a hierarchical approach:
    1. Split by sections (## headers)
    2. Within sections, split by paragraphs
    3. If paragraphs too long, split by sentences
    4. Add overlap between chunks for context

    Note: max_tokens should be set based on the embedding model's context limit.
    Use EmbeddingGenerator.get_recommended_chunk_size() to get the appropriate value.
    """

    def __init__(
        self,
        max_tokens: int = 500,
        min_tokens: int = 50,
        overlap_tokens: int = 50,
    ):
        """
        Initialize chunker.

        Args:
            max_tokens: Maximum tokens per chunk. Should be set based on the
                       embedding model's context limit. Use
                       EmbeddingGenerator.get_recommended_chunk_size() to get
                       the appropriate value. Default 500 is a conservative fallback.
            min_tokens: Minimum tokens per chunk (avoid tiny chunks)
            overlap_tokens: Overlap between consecutive chunks
        """
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.overlap_tokens = overlap_tokens
        logger.info(
            f"TextChunker initialized: max_tokens={max_tokens}, "
            f"min_tokens={min_tokens}, overlap_tokens={overlap_tokens}"
        )

    def chunk_text(self, text: str, page_title: str = "") -> list[TextChunk]:
        """
        Split text into chunks.

        Args:
            text: Full text to chunk
            page_title: Title of the source page (for context)

        Returns:
            List of TextChunk objects
        """
        if not text.strip():
            return []

        chunks = []
        chunk_index = 0

        # Split into sections
        sections = self._split_into_sections(text)

        for section_title, section_text in sections:
            # Skip empty sections
            if not section_text.strip():
                continue

            # Split section into paragraphs
            paragraphs = self._split_into_paragraphs(section_text)

            # Build chunks from paragraphs
            current_chunk = ""
            current_start = 0

            for para in paragraphs:
                para_tokens = count_tokens(para)

                # If paragraph alone exceeds max, split it
                if para_tokens > self.max_tokens:
                    # First, flush current chunk if any
                    if current_chunk:
                        chunk = self._create_chunk(
                            current_chunk, chunk_index, section_title, current_start
                        )
                        chunks.append(chunk)
                        chunk_index += 1
                        current_chunk = ""

                    # Split large paragraph by sentences
                    sentence_chunks = self._split_large_paragraph(para, section_title, chunk_index)
                    chunks.extend(sentence_chunks)
                    chunk_index += len(sentence_chunks)
                    continue

                # Check if adding this paragraph exceeds max
                test_chunk = f"{current_chunk}\n\n{para}".strip() if current_chunk else para
                if count_tokens(test_chunk) > self.max_tokens:
                    # Flush current chunk
                    if current_chunk:
                        chunk = self._create_chunk(
                            current_chunk, chunk_index, section_title, current_start
                        )
                        chunks.append(chunk)
                        chunk_index += 1

                        # Start new chunk with overlap
                        overlap_text = self._get_overlap_text(current_chunk)
                        current_chunk = f"{overlap_text}\n\n{para}".strip() if overlap_text else para
                    else:
                        current_chunk = para
                else:
                    current_chunk = test_chunk

            # Flush remaining chunk
            if current_chunk and count_tokens(current_chunk) >= self.min_tokens:
                chunk = self._create_chunk(current_chunk, chunk_index, section_title, current_start)
                chunks.append(chunk)
                chunk_index += 1
            elif current_chunk and chunks:
                # Merge small trailing chunk with previous
                prev_chunk = chunks[-1]
                merged_text = f"{prev_chunk.text}\n\n{current_chunk}"
                if count_tokens(merged_text) <= self.max_tokens * 1.2:  # Allow slight overflow
                    chunks[-1] = self._create_chunk(
                        merged_text,
                        prev_chunk.chunk_index,
                        prev_chunk.section_title,
                        prev_chunk.start_char,
                    )

        return chunks

    def _split_into_sections(self, text: str) -> list[tuple[Optional[str], str]]:
        """Split text by section headers (## format)."""
        # Pattern for markdown-style headers
        pattern = r"(?:^|\n)(#{2,4})\s+(.+?)(?:\n|$)"

        sections = []
        last_end = 0
        current_section = None

        for match in re.finditer(pattern, text):
            # Add text before this header
            before_text = text[last_end : match.start()].strip()
            if before_text:
                sections.append((current_section, before_text))

            # Update current section
            current_section = match.group(2).strip()
            last_end = match.end()

        # Add remaining text
        remaining = text[last_end:].strip()
        if remaining:
            sections.append((current_section, remaining))

        # If no sections found, return entire text as one section
        if not sections:
            sections = [(None, text)]

        return sections

    def _split_into_paragraphs(self, text: str) -> list[str]:
        """Split text into paragraphs."""
        # Split on double newlines or single newlines followed by bullet points
        paragraphs = re.split(r"\n\n+|\n(?=[-*•])", text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _split_large_paragraph(
        self, text: str, section_title: Optional[str], start_index: int
    ) -> list[TextChunk]:
        """Split a large paragraph by sentences."""
        # Sentence splitting pattern
        sentences = re.split(r"(?<=[.!?])\s+", text)

        chunks = []
        current_chunk = ""
        chunk_index = start_index

        for sentence in sentences:
            test_chunk = f"{current_chunk} {sentence}".strip() if current_chunk else sentence

            if count_tokens(test_chunk) > self.max_tokens and current_chunk:
                # Flush current chunk
                chunk = self._create_chunk(current_chunk, chunk_index, section_title, 0)
                chunks.append(chunk)
                chunk_index += 1

                # Start new chunk with overlap
                overlap = self._get_overlap_text(current_chunk)
                current_chunk = f"{overlap} {sentence}".strip() if overlap else sentence
            else:
                current_chunk = test_chunk

        # Flush remaining
        if current_chunk:
            chunk = self._create_chunk(current_chunk, chunk_index, section_title, 0)
            chunks.append(chunk)

        return chunks

    def _get_overlap_text(self, text: str) -> str:
        """Get the last N tokens of text for overlap."""
        if self.overlap_tokens <= 0:
            return ""

        sentences = re.split(r"(?<=[.!?])\s+", text)
        overlap_text = ""

        # Take sentences from the end until we hit overlap_tokens
        for sentence in reversed(sentences):
            test = f"{sentence} {overlap_text}".strip() if overlap_text else sentence
            if count_tokens(test) > self.overlap_tokens:
                break
            overlap_text = test

        return overlap_text

    def _create_chunk(
        self,
        text: str,
        chunk_index: int,
        section_title: Optional[str],
        start_char: int,
    ) -> TextChunk:
        """Create a TextChunk object."""
        return TextChunk(
            text=text.strip(),
            chunk_index=chunk_index,
            section_title=section_title,
            token_count=count_tokens(text),
            char_count=len(text),
            start_char=start_char,
            end_char=start_char + len(text),
        )

    def truncate_to_limit(self, text: str, max_chars: int) -> str:
        """
        Truncate text to character limit, trying to break at sentence boundary.

        Used as a safety net for unexpectedly long text that wasn't properly
        chunked (e.g., very long sentences).

        Args:
            text: Text to truncate
            max_chars: Maximum character limit

        Returns:
            Truncated text, preferably at a sentence boundary
        """
        if len(text) <= max_chars:
            return text

        # Try to break at last sentence within limit
        truncated = text[:max_chars]
        last_period = truncated.rfind(". ")
        if last_period > max_chars * 0.7:  # Only if we keep >70% of content
            return truncated[: last_period + 1]
        return truncated
