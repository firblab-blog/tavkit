"""Item generation prompt templates"""

from typing import Optional, Dict, Any


def get_item_prompt(
    prompt_type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get item generation prompt"""

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

            campaign_section += "\n\nGenerate items that fit the campaign's magic level and setting. Consider how items might connect to the plot or existing characters through their lore and hooks."

        base_system = (
            "You are a TTRPG magic item generator. Create interesting, balanced items for tabletop games."
            + campaign_section
            + """

Return ONLY valid JSON. Include mechanical details and flavor. 

IMPORTANT formatting rules:
- For damage_dice, use object: {"count": 1, "die": 6, "bonus": 2} means 1d6+2
- For weight, use NUMBER only (in pounds): "weight": 1 or "weight": 0.5
- For value, use NUMBER only (in gold): "value": 5000
- For properties, use STRINGS for descriptions, not objects

Example:
{
    "name": "Whisperwind Cloak",
    "type": "wondrous",
    "rarity": "rare",
    "description": "A silvery cloak that seems to shimmer and flow like mist even when still. Delicate runes along the hem glow faintly in moonlight.",
    "properties": {
        "armor_class": "+1 to AC when worn",
        "stealth": "Advantage on Stealth checks",
        "special": "Once per day, become invisible for 1 minute as a bonus action"
    },
    "requires_attunement": true,
    "curse": null,
    "origin": "Crafted by elven shadow weavers in the Moonwood",
    "lore": "These cloaks were originally made for elven scouts operating behind enemy lines during the ancient wars.",
    "value": 5000,
    "weight": 1,
    "hooks": [
        "A group of assassins seeks to reclaim this cloak",
        "The cloak's creator left a hidden message in the runes"
    ]
}

For weapons with damage dice:
{
    "name": "Flaming Longsword",
    "type": "weapon",
    "rarity": "rare",
    "description": "A blade wreathed in flames.",
    "properties": {
        "damage_dice": {"count": 1, "die": 8, "bonus": 1},
        "damage_type": "slashing",
        "fire_damage": "2d6 fire damage on hit",
        "special": "Sheds bright light in a 20-foot radius"
    },
    "value": 3000,
    "weight": 3
}"""
        )
        return base_system

    elif prompt_type == "user":
        # Build context
        context_parts = []
        if kwargs.get("type"):
            context_parts.append(f"Type: {kwargs['type']}")
        if kwargs.get("rarity"):
            context_parts.append(f"Rarity: {kwargs['rarity']}")
        if kwargs.get("magical") is not None:
            context_parts.append(f"Magical: {kwargs['magical']}")
        if kwargs.get("game_system"):
            context_parts.append(f"System: {kwargs['game_system']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Include mechanics."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
