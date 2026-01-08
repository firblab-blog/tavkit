"""Anthropic Claude provider implementation"""

from typing import Optional
import anthropic

from app.config import settings
from app.providers.base import AIProvider


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        self.temperature = settings.ANTHROPIC_TEMPERATURE
        self.max_tokens = settings.ANTHROPIC_MAX_TOKENS

        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        timeout: Optional[int] = None,
    ) -> str:
        """Generate text using Anthropic Claude

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Temperature override
            max_tokens: Max tokens override
            json_mode: If True, use assistant prefill to force JSON output
            timeout: Timeout in seconds for the request
        """
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature or self.temperature,
        }

        # Add timeout if provided
        if timeout:
            kwargs["timeout"] = timeout

        # Use assistant prefill for JSON mode
        if json_mode:
            kwargs["messages"] = [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": "{"},
            ]
        else:
            kwargs["messages"] = [{"role": "user", "content": prompt}]

        if system_prompt:
            kwargs["system"] = system_prompt

        response = await self.client.messages.create(**kwargs)

        # If using JSON mode, prepend the opening brace we prefilled
        if json_mode:
            return "{" + response.content[0].text
        return response.content[0].text

    async def health_check(self) -> bool:
        """Check Anthropic health"""
        try:
            # Simple API call to verify connectivity
            await self.generate("test", max_tokens=10)
            return True
        except Exception:
            return False
