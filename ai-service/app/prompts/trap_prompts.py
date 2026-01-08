"""Prompts for trap/puzzle generation"""

from typing import Optional


def get_trap_prompt(prompt_type: str, **kwargs) -> str:
    """Get trap/puzzle generation prompts"""

    if prompt_type == "system":
        return """You are a trap and puzzle generator for tabletop RPGs. Create challenging, solvable obstacles with multiple solution paths.

Return ONLY valid JSON. Be concise. Example:
{
  "name": "Pressure Plate Pitfall",
  "trap_type": "mechanical",
  "difficulty": "medium",
  "description": "Ancient stone corridor with subtle pressure plates embedded in floor",
  "trigger": "Stepping on marked tiles activates mechanism",
  "effect": "Floor section drops away, 20-foot pit with spikes below",
  "damage": "2d6 piercing damage",
  "detection": {
    "passive_perception_dc": 15,
    "investigation_dc": 13,
    "clues": [
      "Faint scratches around certain floor tiles",
      "Slightly different coloration on pressure plates",
      "Dust patterns show these tiles have moved before"
    ]
  },
  "solution_paths": [
    {
      "approach": "disarm",
      "skill": "Thieves' Tools",
      "dc": 15,
      "description": "Jam the mechanism before stepping on pressure plate",
      "time": "1 minute",
      "failure": "Trap triggers, mechanism locks preventing further attempts"
    },
    {
      "approach": "bypass",
      "skill": "Acrobatics",
      "dc": 13,
      "description": "Carefully step only on safe tiles, avoiding pressure plates",
      "time": "1 minute",
      "failure": "Misstepped tile triggers trap"
    },
    {
      "approach": "strength",
      "skill": "Athletics",
      "dc": 16,
      "description": "Jump across the trapped section entirely",
      "time": "1 action",
      "failure": "Land on pressure plate, trap triggers"
    },
    {
      "approach": "magical",
      "skill": "Mage Hand or Fly",
      "dc": null,
      "description": "Use magic to avoid touching floor entirely",
      "time": "Varies",
      "failure": "None if spell succeeds"
    }
  ],
  "complications": [
    "Trap resets after 1 minute if disarm failed",
    "Noise alerts nearby creatures",
    "Spikes at bottom are poisoned (DC 12 CON save or 1d4 poison damage)"
  ],
  "rewards": [
    "Trapped chest at corridor's end contains valuable loot",
    "Safely reaching the end opens secret door",
    "Mechanism parts can be salvaged for crafting"
  ],
  "scaling": {
    "easier": "Remove poison, reduce damage to 1d6, lower DCs by 2",
    "harder": "Add hidden secondary trigger, increase damage to 3d6, raise DCs by 3"
  },
  "dm_notes": "Allow creative solutions. If party uses rope, tools, or teamwork cleverly, lower DCs or grant advantage"
}

Be tactical and fair. Multiple solution paths essential."""

    elif prompt_type == "user":
        trap_type = kwargs.get("trap_type", "mechanical")
        difficulty = kwargs.get("difficulty", "medium")
        party_level = kwargs.get("party_level", "5")
        environment = kwargs.get("environment", "dungeon")
        special_requests = kwargs.get("special_requests")
        campaign_context = kwargs.get("campaign_context")
        game_system = kwargs.get("game_system", "D&D 5e")

        prompt = f"""Generate a {difficulty} difficulty {trap_type} trap/puzzle for {game_system}.
Target party level: {party_level}
Environment: {environment}

Trap Types:
- mechanical: Physical traps with gears, levers, pressure plates
- magical: Arcane triggers, glyphs, enchanted wards
- puzzle: Logic challenges, riddles, pattern recognition
- combination: Mix of mechanical and magical elements
- environmental: Natural hazards weaponized (falling rocks, water, fire)

Difficulty Scaling:
- easy: Low DCs (10-12), obvious clues, minor consequences
- medium: Moderate DCs (13-15), subtle clues, significant damage
- hard: High DCs (16-18), hidden clues, severe consequences
- deadly: Very high DCs (19-22), minimal clues, potential death

Environment Types:
- dungeon: Stone corridors, ancient mechanisms
- temple: Religious puzzles, divine magic
- tomb: Ancient burial traps, cursed wards
- forest: Natural hazards, druidic wards
- urban: Modern traps, social puzzles
- castle: Noble defenses, sophisticated mechanisms

Key Requirements:
1. Multiple solution paths (at least 3-4 different approaches)
2. Clear clues for detection (passive and active)
3. Fair DCs appropriate for party level
4. Meaningful consequences for failure
5. Creative bypass options (magic, teamwork, creative thinking)
6. Scaling suggestions for different difficulties"""

        if special_requests:
            prompt += f"\n\nSpecial Requirements: {special_requests}"

        if campaign_context:
            try:
                import json

                ctx = (
                    json.loads(campaign_context)
                    if isinstance(campaign_context, str)
                    else campaign_context
                )
                prompt += "\n\nCampaign Context:"
                if ctx.get("name"):
                    prompt += f"\nCampaign: {ctx['name']}"
                if ctx.get("setting"):
                    prompt += f"\nSetting: {ctx['setting'][:200]}"
                if ctx.get("theme"):
                    prompt += f"\nTheme: {ctx['theme']}"
                if ctx.get("tone"):
                    prompt += f"\nTone: {ctx['tone']}"
                if ctx.get("magic_level"):
                    prompt += f"\nMagic Level: {ctx['magic_level']}"
            except:
                pass

        return prompt

    return ""
