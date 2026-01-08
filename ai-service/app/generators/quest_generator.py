"""Quest generator using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, QUEST_SCHEMA
from app.prompts.quest_prompts import get_quest_prompt


class QuestGenerator:
    """Generates quests using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        prompt: str,
        type: Optional[str] = None,
        party_level: Optional[int] = None,
        moral_complexity: Optional[str] = None,
        game_system: Optional[str] = None,
    ) -> dict:
        """
        Generate a quest based on prompt and optional parameters

        Args:
            prompt: Description of the quest
            type: Quest type (main, side, faction, timed)
            party_level: Recommended party level (1-20)
            moral_complexity: Moral complexity (simple, nuanced, morally_grey)
            game_system: Game system (e.g., D&D 5e)

        Returns:
            Dictionary with quest data
        """
        # Build context from parameters
        context = {
            "type": type,
            "party_level": party_level,
            "moral_complexity": moral_complexity,
            "game_system": game_system or "D&D 5e",
        }

        # Get system and user prompts
        system_prompt = get_quest_prompt("system")
        user_prompt = get_quest_prompt("user", prompt=prompt, **context)

        # Generate quest
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.8,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            quest_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Quest JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        quest_data = extract_fields(quest_raw, QUEST_SCHEMA, strict=False)
        return quest_data
