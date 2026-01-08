"""AI provider factory and base interface"""

from typing import Optional
from app.config import settings
from app.providers.base import AIProvider


def get_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
) -> AIProvider:
    """Get AI provider based on configuration or explicit override.

    Args:
        provider_name: Override provider (ollama, openai, anthropic). Uses settings if None.
        api_key: Override API key for cloud providers. Uses settings if None.
        model: Override model name. Uses settings if None.
        base_url: Override base URL (mainly for Ollama). Uses settings if None.
    """
    name = (provider_name or settings.AI_PROVIDER).lower()

    if name == "ollama":
        from app.providers.ollama import OllamaProvider

        return OllamaProvider(
            base_url=base_url or settings.OLLAMA_BASE_URL,
            model=model or settings.OLLAMA_MODEL,
        )
    elif name == "openai":
        from app.providers.openai import OpenAIProvider

        return OpenAIProvider(
            api_key=api_key or settings.OPENAI_API_KEY,
            model=model or settings.OPENAI_MODEL,
        )
    elif name == "anthropic":
        from app.providers.anthropic import AnthropicProvider

        return AnthropicProvider(
            api_key=api_key or settings.ANTHROPIC_API_KEY,
            model=model or settings.ANTHROPIC_MODEL,
        )
    else:
        raise ValueError(f"Unknown AI provider: {name}")


__all__ = ["get_provider", "AIProvider"]
