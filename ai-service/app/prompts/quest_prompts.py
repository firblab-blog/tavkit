"""Quest generation prompt templates"""

from typing import Optional, Dict, Any


def get_quest_prompt(
    prompt_type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get quest generation prompt"""

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

            campaign_section += "\n\nCreate quests that tie into the ongoing plot, involve existing characters, and advance the campaign story. Consider moral complexity appropriate to the campaign tone."

        base_system = (
            "You are a TTRPG quest generator. Create engaging, well-structured quests for tabletop games."
            + campaign_section
            + """

Return ONLY valid JSON. Include clear objectives, meaningful rewards, and interesting complications. Example:
{
    "title": "The Missing Merchant",
    "type": "side",
    "description": "A wealthy merchant has vanished from the trade quarter. His family fears foul play and offers a reward for information. The city guard seems reluctant to investigate.",
    "objectives": [
        "Interview the merchant's family and employees",
        "Search the merchant's office and warehouse",
        "Follow the trail to the abandoned docks",
        "Confront the kidnappers in their hideout"
    ],
    "rewards": [
        "200 gold pieces from the family",
        "Favor from the Merchant's Guild",
        "Information about a larger smuggling operation"
    ],
    "complications": [
        "The merchant was involved in illegal dealings",
        "Corrupt city guards are working with the kidnappers",
        "Time limit: kidnappers will move the merchant in 3 days"
    ],
    "npcs_involved": [
        {"name": "Lady Isadora Vance", "role": "Merchant's wife", "description": "Wealthy, worried, hiding something"},
        {"name": "Crew Boss Malik", "role": "Kidnapper leader", "description": "Ruthless dockworker turned criminal"}
    ],
    "locations_involved": [
        "Vance Trading Company office",
        "Abandoned warehouse at the docks",
        "Secret meeting place in the sewers"
    ],
    "party_level": 3,
    "estimated_sessions": 2,
    "status": "available",
    "hooks": [
        "Party sees wanted posters offering reward",
        "Lady Vance approaches party at tavern",
        "Party's fence mentions suspicious dock activity"
    ]
}"""
        )
        return base_system

    elif prompt_type == "user":
        # Build context
        context_parts = []
        if kwargs.get("type"):
            context_parts.append(f"Type: {kwargs['type']}")
        if kwargs.get("party_level"):
            context_parts.append(f"Party Level: {kwargs['party_level']}")
        if kwargs.get("moral_complexity"):
            context_parts.append(f"Moral Complexity: {kwargs['moral_complexity']}")
        if kwargs.get("game_system"):
            context_parts.append(f"System: {kwargs['game_system']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Clear structure."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
