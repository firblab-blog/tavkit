"""Encounter generation prompt templates"""

from typing import Optional, Dict, Any


def get_encounter_prompt(
    type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get encounter generation prompt"""

    if type == "system":
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

            campaign_section += "\n\nDesign encounters that fit the campaign setting and advance the plot. Select creatures and tactics appropriate to the tone and themes."

        base_system = (
            "You are a D&D 5e encounter designer. Create balanced encounters."
            + campaign_section
            + """

Return ONLY valid JSON. Be brief. Example:
{
    "name": "Goblin Ambush",
    "description": "Goblins attack from trees along forest path",
    "difficulty": "medium",
    "environment": {"setting": "Forest path", "features": ["Dense trees", "Fallen logs"]},
    "creatures": [{"name": "Goblin", "count": 4, "cr": 0.25, "tactics": "Hit and run"}],
    "treasure": {"coins": {"gp": 25}, "items": ["Crude map"]},
    "xp_total": 200,
    "xp_per_player": 50
}"""
        )
        return base_system

    elif type == "user":
        party_level = kwargs.get("party_level", 1)
        party_size = kwargs.get("party_size", 4)
        difficulty = kwargs.get("difficulty", "medium")

        return f"""Create: {prompt}

Party: {party_size} players, level {party_level}
Difficulty: {difficulty}

JSON only. Be brief."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
