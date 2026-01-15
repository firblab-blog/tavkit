"""
Configuration management for AI service
Loads settings from environment variables
"""

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Application
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = (
        "http://localhost:3000,http://localhost:5173," "http://tavkit.local,https://tavkit.local"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # AI Provider Configuration
    AI_PROVIDER: str = "ollama"  # ollama, openai, anthropic
    AI_TIMEOUT: int = 300  # 5 minutes for CPU-based inference
    AI_MAX_RETRIES: int = 3

    # Ollama Configuration
    # Default assumes containerized Ollama. For host Ollama:
    # - Windows/Mac: OLLAMA_BASE_URL=http://host.docker.internal:11434
    # - Linux: OLLAMA_BASE_URL=http://172.17.0.1:11434
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.2:7b"
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 800  # Reduced for faster generation
    OLLAMA_TOP_P: float = 0.9
    OLLAMA_TOP_K: int = 40
    OLLAMA_NUM_CTX: int = 2048  # Context window
    # Embedding model for Ollama (default: nomic-embed-text)
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 800
    OPENAI_TOP_P: float = 0.9

    # Anthropic Configuration
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"
    ANTHROPIC_TEMPERATURE: float = 0.7
    ANTHROPIC_MAX_TOKENS: int = 4096
    ANTHROPIC_TOP_P: float = 0.9

    # Provider-specific context limits (tokens) for chunked summary pipeline
    OLLAMA_CONTEXT_LIMIT: int = 6000  # Conservative for 8K models
    OPENAI_CONTEXT_LIMIT: int = 100000
    ANTHROPIC_CONTEXT_LIMIT: int = 150000

    # Batch sizes (items per extraction call) for chunked summary pipeline
    OLLAMA_BATCH_SIZE: int = 8
    OPENAI_BATCH_SIZE: int = 40
    ANTHROPIC_BATCH_SIZE: int = 40

    # Token estimation
    CHARS_PER_TOKEN: int = 4

    # Embedding chunk configuration
    # Override to manually set chunk size (0 = auto-calculate based on model)
    EMBEDDING_CHUNK_SIZE_OVERRIDE: int = 0
    # Safety margin for auto-calculated chunk sizes (percentage below context limit)
    EMBEDDING_SAFETY_MARGIN: float = 0.15

    def get_batch_size(self) -> int:
        """Get batch size for the current provider."""
        provider = self.AI_PROVIDER.upper()
        return getattr(self, f"{provider}_BATCH_SIZE", 8)

    def get_context_limit(self) -> int:
        """Get context limit for the current provider."""
        provider = self.AI_PROVIDER.upper()
        return getattr(self, f"{provider}_CONTEXT_LIMIT", 6000)

    class Config:
        """Pydantic config"""

        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()
