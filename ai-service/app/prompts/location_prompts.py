"""Location generation prompt templates"""

from typing import Optional, Dict, Any


def get_location_prompt(
    prompt_type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get location generation prompt"""

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

            campaign_section += "\n\nGenerate locations that fit this campaign world. Consider the setting details, existing plot threads, and overall atmosphere when creating features, NPCs, and plot hooks."

        base_system = (
            "You are a TTRPG location generator. Create vivid, usable locations for tabletop games."
            + campaign_section
            + """

Return ONLY valid JSON. Include rich sensory details and practical information. Example:
{
    "name": "The Rusty Dragon Inn",
    "type": "tavern",
    "description": "A lively two-story inn with a faded green dragon sign creaking above the entrance. Warm firelight spills from leaded glass windows, and the smell of roasted meat and ale wafts into the street.",
    "atmosphere": "Welcoming and bustling, with travelers sharing tales over drinks",
    "features": [
        "Large common room with central fireplace",
        "Private rooms on second floor",
        "Kitchen with skilled halfling cook",
        "Stable for mounts in back courtyard"
    ],
    "secrets": [
        "Hidden smuggling tunnel beneath wine cellar",
        "Innkeeper collects information for local thieves' guild"
    ],
    "npcs": [
        {"name": "Mara Thornhill", "role": "Innkeeper", "description": "Middle-aged human with warm smile, ex-adventurer"},
        {"name": "Pip", "role": "Halfling cook", "description": "Cheerful, makes the best meat pies in town"}
    ],
    "encounters": [
        "Rowdy mercenaries causing trouble",
        "Mysterious hooded figure offers quest"
    ],
    "factions": ["Thieves' Guild (secret connection)"],
    "hooks": [
        "Innkeeper asks party to investigate strange noises in cellar",
        "Rival inn owner trying to drive business away"
    ]
}"""
        )
        return base_system

    elif prompt_type == "user":
        # Build context
        context_parts = []
        if kwargs.get("type"):
            context_parts.append(f"Type: {kwargs['type']}")
        if kwargs.get("theme"):
            context_parts.append(f"Theme: {kwargs['theme']}")
        if kwargs.get("scale"):
            context_parts.append(f"Scale: {kwargs['scale']}")
        if kwargs.get("game_system"):
            context_parts.append(f"System: {kwargs['game_system']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Rich details."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
