"""NPC generator using AI"""

import json
from typing import Optional, Dict, Any

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, NPC_SCHEMA
from app.prompts.npc_prompts import get_npc_prompt


class NPCGenerator:
    """Generates NPCs using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        prompt: str,
        race: Optional[str] = None,
        class_name: Optional[str] = None,
        level: Optional[int] = None,
        personality: Optional[str] = None,
        campaign_context: Optional[Dict[str, Any]] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate an NPC based on prompt and optional parameters

        Args:
            prompt: Description of the NPC
            race: NPC race
            class_name: NPC class
            level: NPC level (1-20)
            personality: Personality traits
            campaign_context: Optional campaign world context for tailored generation
            max_tokens: Maximum tokens for AI generation (overrides config default)
            timeout: Timeout in seconds (overrides config default)

        Returns:
            Dictionary with NPC data
        """
        # Build context from parameters
        context = {
            "race": race,
            "class": class_name,
            "level": level,
            "personality": personality,
            "campaign": campaign_context,
        }

        # Get system and user prompts
        system_prompt = get_npc_prompt("system", campaign_context=campaign_context)
        user_prompt = get_npc_prompt("user", prompt=prompt, **context)

        # Generate NPC with constrained tokens for speed
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
            npc_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse NPC JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        npc_data = extract_fields(npc_raw, NPC_SCHEMA, strict=False)
        return npc_data
