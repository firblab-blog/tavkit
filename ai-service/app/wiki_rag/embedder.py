"""
Embedding Generator - Generates vector embeddings for text chunks.

Supports:
- OpenAI text-embedding-3-small (1536 dimensions)
- OpenAI text-embedding-3-large (3072 dimensions)
- Ollama embeddings (various dimensions depending on model)

The provider is automatically selected based on available API keys:
1. If OPENAI_API_KEY is set, use OpenAI embeddings
2. Otherwise, use Ollama embeddings with the configured model
"""

import asyncio
import logging
import os
from typing import Optional

import aiohttp

from app.config import settings as app_settings

logger = logging.getLogger(__name__)

# Track which models have been verified/pulled
_verified_models: set[str] = set()

# Known embedding dimensions for common models
KNOWN_DIMENSIONS: dict[str, int] = {
    # OpenAI models
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
    # Ollama models
    "nomic-embed-text": 768,
    "nomic-embed-text:latest": 768,
    "mxbai-embed-large": 1024,
    "mxbai-embed-large:latest": 1024,
    "all-minilm": 384,
    "all-minilm:latest": 384,
    "snowflake-arctic-embed": 1024,
    "bge-m3": 1024,
    "bge-large": 1024,
}

# Known context limits for embedding models (max input sequence length in tokens)
EMBEDDING_CONTEXT_LIMITS: dict[str, int] = {
    # OpenAI models - 8191 tokens max
    "text-embedding-3-small": 8191,
    "text-embedding-3-large": 8191,
    "text-embedding-ada-002": 8191,
    # Ollama models - varies by model
    "nomic-embed-text": 2048,
    "nomic-embed-text:latest": 2048,
    "mxbai-embed-large": 512,
    "mxbai-embed-large:latest": 512,
    "all-minilm": 512,
    "all-minilm:latest": 512,
    "snowflake-arctic-embed": 512,
    "bge-m3": 8192,
    "bge-large": 512,
}

# Default context limits per provider (fallback when model not in dictionary)
DEFAULT_CONTEXT_LIMITS: dict[str, int] = {
    "openai": 8191,
    "ollama": 2048,  # Conservative default for unknown Ollama models
}


def get_embedding_provider() -> tuple[str, Optional[str]]:
    """
    Determine which embedding provider to use based on available API keys.

    Returns:
        Tuple of (provider_name, api_key)

    Priority:
    1. If OPENAI_API_KEY is set, use OpenAI (best quality, works with any AI_PROVIDER)
    2. Otherwise, use Ollama for local embeddings
    """
    openai_key = os.getenv("OPENAI_API_KEY", "") or app_settings.OPENAI_API_KEY
    if openai_key:
        logger.info("Using OpenAI for embeddings (OPENAI_API_KEY found)")
        return "openai", openai_key

    # Fall back to Ollama for local embeddings
    logger.info("Using Ollama for embeddings (no OPENAI_API_KEY)")
    return "ollama", None


class EmbeddingGenerator:
    """
    Generates embeddings using various providers.

    Automatically selects provider based on available API keys:
    - If OPENAI_API_KEY is set: Use OpenAI (1536 dims)
    - Otherwise: Use Ollama nomic-embed-text (768 dims)
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        """
        Initialize embedding generator.

        Args:
            provider: "openai" or "ollama" (auto-detected if not provided)
            model: Model name (default depends on provider)
            api_key: API key for OpenAI
            base_url: Base URL for Ollama
        """
        # Auto-detect provider if not specified
        if provider is None:
            provider, detected_key = get_embedding_provider()
            if api_key is None:
                api_key = detected_key

        self.provider = provider
        self.api_key = api_key

        if provider == "openai":
            self.model = model or "text-embedding-3-small"
            self.dimensions = KNOWN_DIMENSIONS.get(self.model, 1536)
            self.context_limit = EMBEDDING_CONTEXT_LIMITS.get(
                self.model, DEFAULT_CONTEXT_LIMITS.get("openai", 8191)
            )
            self.base_url = "https://api.openai.com/v1"
            logger.info(
                f"Initialized OpenAI embeddings: {self.model} "
                f"({self.dimensions} dims, {self.context_limit} token limit)"
            )
        elif provider == "ollama":
            # Use model from config (which supports env var override)
            self.model = model or app_settings.OLLAMA_EMBEDDING_MODEL
            self.dimensions = KNOWN_DIMENSIONS.get(self.model, 768)
            self.context_limit = EMBEDDING_CONTEXT_LIMITS.get(
                self.model, DEFAULT_CONTEXT_LIMITS.get("ollama", 2048)
            )
            self.base_url = base_url or app_settings.OLLAMA_BASE_URL
            logger.info(
                f"Initialized Ollama embeddings: {self.model} "
                f"({self.dimensions} dims, {self.context_limit} token limit)"
            )
        else:
            raise ValueError(f"Unsupported embedding provider: {provider}")

    async def embed_text(self, text: str) -> list[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            List of floats (embedding vector)
        """
        embeddings = await self.embed_batch([text])
        return embeddings[0] if embeddings else []

    async def embed_batch(
        self,
        texts: list[str],
        batch_size: int = 100,
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts per API call

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        all_embeddings = []

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            if self.provider == "openai":
                embeddings = await self._embed_openai(batch)
            elif self.provider == "ollama":
                embeddings = await self._embed_ollama(batch)
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")

            all_embeddings.extend(embeddings)

        return all_embeddings

    async def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using OpenAI API."""
        if not self.api_key:
            raise ValueError("OpenAI API key required for embeddings")

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "input": texts,
                    "dimensions": self.dimensions,
                },
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenAI embedding error: {error_text}")
                    raise RuntimeError(f"OpenAI API error: {response.status}")

                data = await response.json()
                # Sort by index to ensure order matches input
                sorted_data = sorted(data["data"], key=lambda x: x["index"])
                return [item["embedding"] for item in sorted_data]

    async def _ensure_ollama_model(self) -> None:
        """Ensure the Ollama embedding model is available, pulling if necessary."""
        global _verified_models

        model_key = f"ollama:{self.model}"
        if model_key in _verified_models:
            return

        async with aiohttp.ClientSession() as session:
            # Check if model exists
            try:
                async with session.post(
                    f"{self.base_url}/api/show",
                    json={"name": self.model},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    if response.status == 200:
                        logger.info(f"Ollama model '{self.model}' is available")
                        _verified_models.add(model_key)
                        return
            except Exception as e:
                logger.warning(f"Could not check model status: {e}")

            # Model not found, attempt to pull it
            logger.info(f"Pulling Ollama model '{self.model}'... This may take a few minutes.")
            try:
                async with session.post(
                    f"{self.base_url}/api/pull",
                    json={"name": self.model, "stream": False},
                    timeout=aiohttp.ClientTimeout(total=600),  # 10 minute timeout for pull
                ) as response:
                    if response.status == 200:
                        logger.info(f"Successfully pulled Ollama model '{self.model}'")
                        _verified_models.add(model_key)
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to pull model '{self.model}': {error_text}")
                        raise RuntimeError(f"Failed to pull Ollama model: {error_text}")
            except asyncio.TimeoutError:
                logger.error(f"Timeout pulling model '{self.model}'")
                raise RuntimeError(f"Timeout pulling Ollama model '{self.model}'")

    async def _embed_ollama(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using Ollama API."""
        # Ensure model is available before embedding
        await self._ensure_ollama_model()

        # Safety: max chars based on context limit (~3 chars/token conservative estimate)
        max_chars = int(self.context_limit * 3)

        embeddings = []

        async with aiohttp.ClientSession() as session:
            for text in texts:
                # Truncate if exceeds safe character limit
                if len(text) > max_chars:
                    logger.warning(
                        f"Truncating chunk from {len(text)} to {max_chars} chars "
                        f"for {self.model} (context limit: {self.context_limit} tokens)"
                    )
                    text = text[:max_chars]

                async with session.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.model,
                        "prompt": text,
                    },
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama embedding error: {error_text}")
                        raise RuntimeError(f"Ollama API error: {response.status}")

                    data = await response.json()
                    embedding = data.get("embedding", [])

                    # Update dimensions based on actual model output (first time)
                    if embedding and len(embedding) != self.dimensions:
                        actual_dims = len(embedding)
                        logger.info(
                            f"Updating embedding dimensions: expected {self.dimensions}, "
                            f"got {actual_dims} from {self.model}"
                        )
                        self.dimensions = actual_dims

                    embeddings.append(embedding)

        return embeddings

    def get_dimensions(self) -> int:
        """Get the embedding dimensions for this provider/model."""
        return self.dimensions

    def get_context_limit(self) -> int:
        """Get the context limit (max input tokens) for this provider/model."""
        return self.context_limit

    def get_recommended_chunk_size(self, safety_margin: float | None = None) -> int:
        """
        Get recommended chunk size based on embedding model context limit.

        Args:
            safety_margin: Percentage buffer below context limit.
                          If None, uses EMBEDDING_SAFETY_MARGIN from config.

        Returns:
            Recommended max tokens per chunk
        """
        # Check for manual override in config
        if app_settings.EMBEDDING_CHUNK_SIZE_OVERRIDE > 0:
            return app_settings.EMBEDDING_CHUNK_SIZE_OVERRIDE

        # Use config safety margin if not explicitly provided
        if safety_margin is None:
            safety_margin = app_settings.EMBEDDING_SAFETY_MARGIN

        # Apply safety margin
        safe_size = int(self.context_limit * (1 - safety_margin))
        # Cap at 500 tokens for retrieval quality (smaller chunks = better precision)
        return min(safe_size, 500)
