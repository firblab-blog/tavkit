"""Dialogue generation prompt templates"""

from typing import Optional, Dict, Any


def get_dialogue_prompt(
    type: str, prompt: str = "", campaign_context: Optional[Dict[str, Any]] = None, **kwargs
) -> str:
    """Get dialogue generation prompt"""

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

            campaign_section += "\n\nWrite dialogue that references the campaign world, plot, and other characters. Match the overall tone and include information relevant to ongoing story threads."

        base_system = (
            "You are a D&D 5e dialogue writer. Create engaging, character-appropriate"
            + campaign_section
            + """ 
dialogue for NPCs with:
- Natural speech patterns matching character personality
- Appropriate vocabulary and dialect for character background
- Emotional subtext and character motivations
- Dialogue options for different player approaches
- Physical descriptions and body language
- Potential skill check opportunities (Persuasion, Intimidation, Deception, Insight)

Return ONLY a valid JSON object with this exact structure:
{
    "character_name": "NPC name",
    "scene_setting": "Where and when this dialogue occurs",
    "mood": "Current emotional state",
    "opening_line": "What the NPC says first",
    "dialogue_tree": {
        "friendly": {
            "player_option": "What player might say",
            "npc_response": "NPC response",
            "outcome": "Result of this approach"
        },
        "neutral": {
            "player_option": "What player might say",
            "npc_response": "NPC response",
            "outcome": "Result of this approach"
        },
        "hostile": {
            "player_option": "What player might say",
            "npc_response": "NPC response",
            "outcome": "Result of this approach"
        }
    },
    "skill_checks": [
        {
            "skill": "Skill name",
            "dc": 15,
            "success": "What happens on success",
            "failure": "What happens on failure"
        }
    ],
    "body_language": "Physical descriptions during dialogue",
    "information_revealed": ["fact1", "fact2"],
    "potential_quests": ["Quest hook 1", "Quest hook 2"]
}"""
        )
        return base_system

    elif type == "user":
        # Build context
        context_parts = []
        if kwargs.get("character_name"):
            context_parts.append(f"Character: {kwargs['character_name']}")
        if kwargs.get("personality"):
            context_parts.append(f"Personality: {kwargs['personality']}")
        if kwargs.get("situation"):
            context_parts.append(f"Situation: {kwargs['situation']}")
        if kwargs.get("tone"):
            context_parts.append(f"Tone: {kwargs['tone']}")

        context = "\n".join(context_parts) if context_parts else "No specific requirements"

        return f"""Create dialogue: {prompt}

Requirements:
{context}

Generate engaging, character-appropriate dialogue following the JSON format. Include multiple 
dialogue paths for different player approaches (friendly, neutral, hostile)."""

    else:
        raise ValueError(f"Unknown prompt type: {type}")
