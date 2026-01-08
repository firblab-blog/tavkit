"""Rumor generation prompt templates"""

from typing import Optional, Dict, Any


def get_rumor_prompt(
    type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get rumor generation prompt"""

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

            campaign_section += "\n\nGenerate rumors that hint at campaign plot threads, reference known characters and locations, and create hooks that tie into the ongoing story."

        base_system = (
            "You are a TTRPG rumor generator. Create intriguing rumors that can drive story and player investigation."
            + campaign_section
            + """

Return ONLY valid JSON. Make rumors interesting and useful for campaigns. Example:
{
    "text": "They say the old lighthouse keeper went mad three months ago. Now strange lights flash from the tower at midnight, and ships that sail too close are never seen again.",
    "source": "Worried dockworker at the Rusty Anchor tavern",
    "veracity": "partially_true",
    "truth": "The lighthouse keeper did disappear, but the lights are from smugglers using the tower. The missing ships were actually seized by pirates working with the smugglers.",
    "context": "The speaker's brother was a sailor on one of the missing ships. He's desperate for answers but afraid to investigate alone.",
    "tone": "ominous",
    "leads_to": "Investigation reveals smuggling operation connected to local crime lord",
    "foreshadowing": true,
    "foreshadows": "Larger pirate threat and corrupt harbor master",
    "tags": ["maritime", "mystery", "smuggling", "lighthouse"],
    "investigation_dc": 13,
    "revealed": false,
    "hooks": [
        "Party hired to investigate the lighthouse",
        "Party encounters the smugglers by accident",
        "Speaker offers reward for finding his brother"
    ]
}"""
        )
        return base_system

    elif type == "user":
        # Build context
        context_parts = []
        if kwargs.get("veracity"):
            context_parts.append(f"Veracity: {kwargs['veracity']}")
        if kwargs.get("tone"):
            context_parts.append(f"Tone: {kwargs['tone']}")
        if kwargs.get("leads_to"):
            context_parts.append(f"Leads To: {kwargs['leads_to']}")
        if kwargs.get("game_system"):
            context_parts.append(f"System: {kwargs['game_system']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Engaging rumor."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
