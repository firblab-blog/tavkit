"""Item generator using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, ITEM_SCHEMA
from app.prompts.item_prompts import get_item_prompt


class ItemGenerator:
    """Generates items using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        prompt: str,
        type: Optional[str] = None,
        rarity: Optional[str] = None,
        magical: Optional[bool] = None,
        game_system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate an item based on prompt and optional parameters

        Args:
            prompt: Description of the item
            type: Item type (weapon, armor, wondrous, potion, treasure)
            rarity: Rarity (common, uncommon, rare, very_rare, legendary)
            magical: Whether the item is magical
            game_system: Game system (e.g., D&D 5e)
            max_tokens: Maximum tokens for AI generation (overrides config default)
            timeout: Timeout in seconds (overrides config default)

        Returns:
            Dictionary with item data
        """
        # Build context from parameters
        context = {
            "type": type,
            "rarity": rarity,
            "magical": magical,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_item_prompt("system")
        user_prompt = get_item_prompt("user", prompt=prompt, **context)

        # Generate item
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            timeout=timeout,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            item_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Item JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        item_data = extract_fields(item_raw, ITEM_SCHEMA, strict=False)
        return item_data
