"""Abstract base class for AI providers"""

from abc import ABC, abstractmethod
from typing import Optional


class AIProvider(ABC):
    """Base interface for AI providers"""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        timeout: Optional[int] = None,
    ) -> str:
        """
        Generate text based on prompt

        Args:
            prompt: User prompt
            system_prompt: System/instruction prompt
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            json_mode: Force JSON output format (provider-specific implementation)
            timeout: Timeout in seconds for the request

        Returns:
            Generated text
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if provider is healthy and accessible

        Returns:
            True if healthy, False otherwise
        """
        pass
