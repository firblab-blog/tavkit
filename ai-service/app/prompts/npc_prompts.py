"""NPC generation prompt templates"""

from typing import Optional, Dict, Any


def get_npc_prompt(
    type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get NPC generation prompt"""

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

            # Add RAG-retrieved setting knowledge (from wiki like Eberron Wiki)
            # This provides canonical lore context for the AI
            setting_knowledge = campaign_context.get("setting_knowledge")
            if setting_knowledge:
                campaign_section += f"\n\n{setting_knowledge}"

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

            campaign_section += "\n\nGenerate NPCs that fit this campaign world. Consider existing characters, plot threads, and setting details when creating personality, background, and plot hooks."

            # Extra instruction when setting knowledge is present
            if setting_knowledge:
                campaign_section += " Use the provided SETTING KNOWLEDGE to ensure the NPC fits the canonical world lore - reference specific locations, factions, races, or concepts where appropriate."

        base_system = f"""You are a D&D 5e NPC generator. Create concise, usable NPCs.{campaign_section}

Return ONLY valid JSON. Be brief. Example:
{{
    "name": "Garrett Flynn",
    "race": "Human",
    "class": "Rogue",
    "level": 5,
    "alignment": "Chaotic Good",
    "appearance": "Lean, dark hair, shifty eyes, wears dark leather",
    "personality": {{
        "traits": ["Cunning", "Quick-witted"],
        "ideals": "Honor among thieves",
        "bonds": "Loyalty to former crew",
        "flaws": "Gambling addiction"
    }},
    "background": "Ex-thief turned information broker in the city",
    "motivation": "Seeking redemption for betraying friends",
    "abilities": {{"STR": 10, "DEX": 16, "CON": 12, "INT": 14, "WIS": 13, "CHA": 15}},
    "skills": ["Stealth", "Deception", "Investigation"],
    "equipment": ["Daggers", "Thieves' tools", "Dark cloak"],
    "role": "Urban scout and spy",
    "plot_hooks": ["Owes debt to guild", "Knows secret passage"]
}}"""
        return base_system

    elif type == "user":
        # Build context
        context_parts = []
        if kwargs.get("race"):
            context_parts.append(f"Race: {kwargs['race']}")
        if kwargs.get("class"):
            context_parts.append(f"Class: {kwargs['class']}")
        if kwargs.get("level"):
            context_parts.append(f"Level: {kwargs['level']}")
        if kwargs.get("personality"):
            context_parts.append(f"Personality: {kwargs['personality']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create: {prompt}

{context}

JSON only. Be brief."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
