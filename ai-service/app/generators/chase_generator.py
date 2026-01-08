"""Chase generator using AI"""

import json
import re
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.prompts.chase_prompts import get_chase_prompt


class ChaseGenerator:
    """Generates chase/pursuit scenes using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        chase_type: str = "foot_chase",
        terrain: str = "urban",
        difficulty: str = "medium",
        party_level: Optional[str] = None,
        special_requests: Optional[str] = None,
        campaign_context: Optional[str] = None,
        game_system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
    ) -> dict:
        """
        Generate a chase/pursuit scene based on parameters

        Args:
            chase_type: Type of chase (foot_chase, mounted_chase, vehicle_chase, etc.)
            terrain: Terrain type (urban, forest, mountains, etc.)
            difficulty: Difficulty level (easy, medium, challenging, hard, extreme)
            party_level: Target party level for challenge rating
            special_requests: Special features or requirements
            campaign_context: Campaign context for tailored generation
            game_system: Game system (e.g., D&D 5e)
            max_tokens: Maximum tokens for AI generation (overrides config default)
            timeout: Timeout in seconds (overrides config default)

        Returns:
            Dictionary with chase data
        """
        # Build context from parameters
        context = {
            "chase_type": chase_type,
            "terrain": terrain,
            "difficulty": difficulty,
            "party_level": party_level or "5",
            "special_requests": special_requests,
            "campaign_context": campaign_context,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_chase_prompt("system")
        user_prompt = get_chase_prompt("user", **context)

        # Generate chase with JSON mode enabled
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
            chase_data = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] Failed to parse chase JSON. Error: {e.msg} at position {e.pos}")
            print(f"[ERROR] Raw response preview: {raw[:500]}")

            # Try to extract JSON from markdown code blocks or other wrapping
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
            if json_match:
                try:
                    extracted = json_match.group(1)
                    chase_data = json.loads(extracted)
                    print("[INFO] Successfully extracted JSON from markdown code block")
                except json.JSONDecodeError as e2:
                    print(f"[ERROR] Extracted JSON also failed to parse: {e2.msg}")
                    try:
                        # Try to find just the JSON object
                        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
                        if json_match:
                            chase_data = json.loads(json_match.group(0))
                            print("[INFO] Successfully extracted JSON object from response")
                        else:
                            raise ValueError(
                                f"Failed to parse chase data. Error: {e.msg} at position {e.pos}. Response preview: {raw[:300]}"
                            )
                    except json.JSONDecodeError:
                        raise ValueError(
                            f"Failed to parse chase data. Error: {e.msg} at position {e.pos}. Response preview: {raw[:300]}"
                        )
            else:
                raise ValueError(
                    f"Failed to parse chase data. Error: {e.msg}. Response preview: {raw[:300]}"
                )

        return chase_data
