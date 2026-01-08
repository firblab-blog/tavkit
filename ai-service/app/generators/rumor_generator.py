"""Rumor generator using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, RUMOR_SCHEMA
from app.prompts.rumor_prompts import get_rumor_prompt


class RumorGenerator:
    """Generates rumors using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        prompt: str,
        veracity: Optional[str] = None,
        tone: Optional[str] = None,
        leads_to: Optional[str] = None,
        game_system: Optional[str] = None,
    ) -> dict:
        """
        Generate a rumor based on prompt and optional parameters

        Args:
            prompt: Description of the rumor topic
            veracity: How true is it (true, partially_true, false, unknown)
            tone: Tone (ominous, hopeful, mysterious, scandalous)
            leads_to: What this rumor leads to or foreshadows
            game_system: Game system (e.g., D&D 5e)

        Returns:
            Dictionary with rumor data
        """
        # Build context from parameters
        context = {
            "veracity": veracity,
            "tone": tone,
            "leads_to": leads_to,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_rumor_prompt("system")
        user_prompt = get_rumor_prompt("user", prompt=prompt, **context)

        # Generate rumor
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            rumor_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Rumor JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        rumor_data = extract_fields(rumor_raw, RUMOR_SCHEMA, strict=False)
        return rumor_data
