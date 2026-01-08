"""OpenAI provider implementation"""

from typing import Optional
import openai

from app.config import settings
from app.providers.base import AIProvider


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
        self.max_tokens = settings.OPENAI_MAX_TOKENS

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not configured")

        openai.api_key = self.api_key

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        """Generate text using OpenAI

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Temperature override
            max_tokens: Max tokens override
            json_mode: If True, use response_format={"type": "json_object"}
        """
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        # Use JSON mode for OpenAI (requires "json" in prompt/system)
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await openai.ChatCompletion.acreate(**kwargs)

        return response.choices[0].message.content

    async def health_check(self) -> bool:
        """Check OpenAI health"""
        try:
            # Simple API call to verify connectivity
            await openai.Model.alist()
            return True
        except Exception:
            return False
