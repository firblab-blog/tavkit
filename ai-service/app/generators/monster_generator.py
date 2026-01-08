"""Monster generator using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, MONSTER_SCHEMA
from app.prompts.monster_prompts import get_monster_prompt


class MonsterGenerator:
    """Generates monsters using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        prompt: str,
        cr: Optional[int] = None,
        type: Optional[str] = None,
        environment: Optional[str] = None,
    ) -> dict:
        """
        Generate a monster based on prompt and optional parameters

        Args:
            prompt: Description of the monster
            cr: Challenge Rating (0-30)
            type: Monster type (aberration, beast, etc.)
            environment: Environment (forest, dungeon, etc.)

        Returns:
            Dictionary with monster data
        """
        # Build context from parameters
        context = {
            "cr": cr,
            "type": type,
            "environment": environment,
        }

        # Get system and user prompts
        system_prompt = get_monster_prompt("system")
        user_prompt = get_monster_prompt("user", prompt=prompt, **context)

        # Generate monster with constrained tokens for speed
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            monster_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse Monster JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        monster_data = extract_fields(monster_raw, MONSTER_SCHEMA, strict=False)
        return monster_data
