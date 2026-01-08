"""Ollama AI provider implementation"""

import aiohttp
from typing import Optional

from app.config import settings
from app.providers.base import AIProvider


class OllamaProvider(AIProvider):
    """Ollama local LLM provider"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL
        self.temperature = settings.OLLAMA_TEMPERATURE
        self.max_tokens = settings.OLLAMA_MAX_TOKENS
        self.top_p = settings.OLLAMA_TOP_P
        self.top_k = settings.OLLAMA_TOP_K
        self.num_ctx = settings.OLLAMA_NUM_CTX
        self.timeout = aiohttp.ClientTimeout(total=settings.AI_TIMEOUT)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        timeout: Optional[int] = None,
    ) -> str:
        """Generate text using Ollama

        Args:
            prompt: The main prompt text
            system_prompt: Optional system prompt to prepend
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            json_mode: Whether to enable JSON mode (note: Ollama doesn't have native JSON mode, this parameter is accepted for compatibility)
            timeout: Request timeout in seconds
        """
        url = f"{self.base_url}/api/generate"

        # Build prompt with system message if provided
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        # If json_mode is requested, append instruction to the prompt
        if json_mode:
            full_prompt += "\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting or code blocks."

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature or self.temperature,
                "num_predict": max_tokens or self.max_tokens,
                "num_ctx": self.num_ctx,
                "top_p": self.top_p,
                "top_k": self.top_k,
            },
        }

        # Use custom timeout if provided, otherwise use default
        request_timeout = aiohttp.ClientTimeout(total=timeout) if timeout else self.timeout

        async with aiohttp.ClientSession(timeout=request_timeout) as session:
            async with session.post(url, json=payload) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Ollama API error: {response.status} - {text}")

                result = await response.json()
                return result.get("response", "")

    async def health_check(self) -> bool:
        """Check Ollama health"""
        try:
            url = f"{self.base_url}/api/tags"
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(url) as response:
                    return response.status == 200
        except Exception:
            return False
