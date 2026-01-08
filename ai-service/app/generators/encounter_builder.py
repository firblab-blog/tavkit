"""Encounter builder using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response
from app.prompts.encounter_prompts import get_encounter_prompt


class EncounterBuilder:
    """Builds encounters using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def build(
        self,
        prompt: str,
        party_level: int,
        party_size: int,
        difficulty: str = "medium",
    ) -> dict:
        """
        Build an encounter based on prompt and party info

        Args:
            prompt: Description of the encounter
            party_level: Average party level (1-20)
            party_size: Number of players (1-10)
            difficulty: Difficulty level (easy, medium, hard, deadly)

        Returns:
            Dictionary with encounter data
        """
        # Build context from parameters
        context = {
            "party_level": party_level,
            "party_size": party_size,
            "difficulty": difficulty,
        }

        # Get system and user prompts
        system_prompt = get_encounter_prompt("system")
        user_prompt = get_encounter_prompt("user", prompt=prompt, **context)

        # Generate encounter with constrained tokens for speed
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        try:
            encounter_data = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract JSON from text - look for first { to last }
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    encounter_data = json.loads(raw[start:end])
                except json.JSONDecodeError:
                    import re

                    json_match = re.search(r"\{[\s\S]*\}", raw)
                    if json_match:
                        encounter_data = json.loads(json_match.group(0))
                    else:
                        raise ValueError(
                            f"Failed to parse encounter data from AI response: {raw[:200]}"
                        )
            else:
                raise ValueError(f"Failed to parse encounter data from AI response: {raw[:200]}")

        return encounter_data
