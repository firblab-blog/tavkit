"""Tavern generator using AI"""

import json
import re
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, TAVERN_SCHEMA
from app.prompts.tavern_prompts import get_tavern_prompt


class TavernGenerator:
    """Generates taverns using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        type: str = "tavern",
        quality: str = "average",
        size: str = "medium",
        special_requests: Optional[str] = None,
        campaign_context: Optional[str] = None,
        game_system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate a tavern based on parameters

        Args:
            type: Type of establishment (tavern, inn, pub, etc.)
            quality: Quality level (poor, modest, average, comfortable, wealthy, aristocratic)
            size: Size (tiny, small, medium, large, huge)
            special_requests: Special features or requirements
            campaign_context: Campaign context for tailored generation
            game_system: Game system (e.g., D&D 5e)
            max_tokens: Maximum tokens for AI generation (overrides config default)
            timeout: Timeout in seconds (overrides config default)

        Returns:
            Dictionary with tavern data
        """
        # Build context from parameters
        context = {
            "type": type,
            "quality": quality,
            "size": size,
            "special_requests": special_requests,
            "campaign_context": campaign_context,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_tavern_prompt("system")
        user_prompt = get_tavern_prompt("user", **context)

        # Generate tavern with JSON mode enabled
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            json_mode=True,
            max_tokens=max_tokens,
            timeout=timeout,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            tavern_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Tavern JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        tavern_data = extract_fields(tavern_raw, TAVERN_SCHEMA, strict=False)
        return tavern_data
