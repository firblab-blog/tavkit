"""Dialogue builder using AI"""

import json
from typing import Optional

from app.providers.base import AIProvider
from app.config import settings
from app.utils.response_utils import clean_json_response
from app.prompts.dialogue_prompts import get_dialogue_prompt


class DialogueBuilder:
    """Builds NPC dialogues using AI"""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def build(
        self,
        prompt: str,
        character_name: Optional[str] = None,
        personality: Optional[str] = None,
        situation: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> dict:
        """
        Build dialogue based on prompt and character info

        Args:
            prompt: Description of the dialogue scene
            character_name: Name of the NPC (optional)
            personality: NPC personality traits (optional)
            situation: Current situation or context (optional)
            tone: Desired tone (friendly, tense, mysterious, etc.)

        Returns:
            Dictionary with dialogue data
        """
        # Build context from parameters
        context = {
            "character_name": character_name,
            "personality": personality,
            "situation": situation,
            "tone": tone,
        }

        # Get system and user prompts
        system_prompt = get_dialogue_prompt("system")
        user_prompt = get_dialogue_prompt("user", prompt=prompt, **context)

        # Generate dialogue
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        try:
            dialogue_data = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract JSON from text - look for first { to last }
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    dialogue_data = json.loads(raw[start:end])
                except json.JSONDecodeError:
                    # Last resort: try to find JSON after markdown headers
                    import re

                    json_match = re.search(r"\{[\s\S]*\}", raw)
                    if json_match:
                        dialogue_data = json.loads(json_match.group(0))
                    else:
                        raise ValueError(
                            f"Failed to parse dialogue data from AI response: {raw[:200]}"
                        )
            else:
                raise ValueError(f"Failed to parse dialogue data from AI response: {raw[:200]}")

        return dialogue_data
