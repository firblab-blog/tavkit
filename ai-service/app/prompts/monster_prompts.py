"""Monster generation prompt templates"""

from typing import Optional, Dict, Any


def get_monster_prompt(
    prompt_type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get monster generation prompt"""

    if prompt_type == "system":
        # Build campaign context section if provided
        campaign_section = ""
        if campaign_context:
            campaign_section = "\n\nCAMPAIGN CONTEXT:"
            if campaign_context.get("name"):
                campaign_section += f"\nCampaign: {campaign_context['name']}"
            if campaign_context.get("game_system"):
                campaign_section += f"\nSystem: {campaign_context['game_system']}"
            if campaign_context.get("theme"):
                campaign_section += f"\nTheme: {campaign_context['theme']}"
            if campaign_context.get("tone"):
                campaign_section += f"\nTone: {campaign_context['tone']}"
            if campaign_context.get("magic_level"):
                campaign_section += f"\nMagic Level: {campaign_context['magic_level']}"
            if campaign_context.get("setting"):
                campaign_section += f"\nSetting: {campaign_context['setting']}"

            # Add campaign summary details for richer context
            summary = campaign_context.get("summary")
            if summary:
                if summary.get("overview"):
                    campaign_section += f"\n\nCampaign Overview: {summary['overview']}"
                if summary.get("plot_summary"):
                    campaign_section += f"\nCurrent Plot: {summary['plot_summary']}"
                if summary.get("characters_summary"):
                    campaign_section += f"\nKey Characters: {summary['characters_summary']}"
                if summary.get("setting_summary"):
                    campaign_section += f"\nSetting Details: {summary['setting_summary']}"
                if summary.get("tone_summary"):
                    campaign_section += f"\nAtmosphere: {summary['tone_summary']}"

            campaign_section += "\n\nDesign monsters that fit the campaign setting and tone. Consider how they might relate to ongoing plot threads or factions in their lore."

        base_system = (
            "You are a D&D 5e monster designer. Create concise, balanced monsters."
            + campaign_section
            + """

Return ONLY valid JSON. Be brief. Example:
{
    "name": "Frost Wraith",
    "type": "Undead",
    "size": "Medium",
    "armor_class": 14,
    "hit_points": 45,
    "speed": {"walk": 0, "fly": 40},
    "abilities": {"STR": 7, "DEX": 16, "CON": 14, "INT": 10, "WIS": 12, "CHA": 15},
    "challenge_rating": 3,
    "traits": [{"name": "Incorporeal", "description": "Can move through objects"}],
    "actions": [{"name": "Freezing Touch", "description": "+5 to hit, 4d6 cold damage"}],
    "lore": "Spirits of those who died in blizzards"
}"""
        )
        return base_system

    elif prompt_type == "user":
        # Build context
        context_parts = []
        if kwargs.get("cr") is not None:
            context_parts.append(f"Challenge Rating: {kwargs['cr']}")
        if kwargs.get("type"):
            context_parts.append(f"Type: {kwargs['type']}")
        if kwargs.get("environment"):
            context_parts.append(f"Environment: {kwargs['environment']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Be brief."""

    else:
        raise ValueError(f"Unknown prompt type: {prompt_type}")
