"""Merchant generator using AI"""

import json
import re
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, MERCHANT_SCHEMA
from app.prompts.merchant_prompts import get_merchant_prompt


class MerchantGenerator:
    """Generates merchants/shops using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        shop_type: str = "general_store",
        quality: str = "average",
        size: str = "medium",
        party_level: Optional[str] = None,
        special_requests: Optional[str] = None,
        campaign_context: Optional[str] = None,
        game_system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate a merchant/shop based on parameters

        Args:
            shop_type: Type of shop (general_store, blacksmith, apothecary, etc.)
            quality: Quality level (poor, modest, average, comfortable, wealthy, aristocratic)
            size: Size (tiny, small, medium, large, huge)
            party_level: Target party level for pricing/items
            special_requests: Special features or requirements
            campaign_context: Campaign context for tailored generation
            game_system: Game system (e.g., D&D 5e)
            max_tokens: Maximum tokens for AI generation (overrides config default)
            timeout: Timeout in seconds (overrides config default)

        Returns:
            Dictionary with merchant data
        """
        # Build context from parameters
        context = {
            "shop_type": shop_type,
            "quality": quality,
            "size": size,
            "party_level": party_level or "5",
            "special_requests": special_requests,
            "campaign_context": campaign_context,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_merchant_prompt("system")
        user_prompt = get_merchant_prompt("user", **context)

        # Generate merchant with JSON mode enabled
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
            merchant_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Merchant JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        merchant_data = extract_fields(merchant_raw, MERCHANT_SCHEMA, strict=False)
        return merchant_data
