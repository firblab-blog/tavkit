"""Prompts for chase/pursuit generation"""

from typing import Optional


def get_chase_prompt(prompt_type: str, **kwargs) -> str:
    """Get chase/pursuit generation prompts"""

    if prompt_type == "system":
        return """You are a chase/pursuit generator for tabletop RPGs. Create exciting, dynamic chase sequences.

Return ONLY valid JSON. Be concise. Example:
{
  "name": "Rooftop Pursuit",
  "chase_type": "foot_chase",
  "terrain": "urban_rooftops",
  "difficulty": "challenging",
  "description": "A desperate chase across rain-slicked rooftops as the thief flees with stolen artifact",
  "setting": "Market district at night, wooden roofs, narrow gaps between buildings",
  "participants": {
    "quarry": "Nimble thief with artifact",
    "pursuers": "Party and city guards"
  },
  "starting_conditions": "Thief has 30-foot head start, knows the rooftops well",
  "obstacles": [
    {"name": "Wide Gap", "description": "15-foot gap between buildings", "check": "DC 12 Athletics or Acrobatics", "failure": "Fall to alley below (3d6 damage)"},
    {"name": "Clothesline", "description": "Washing line across path", "check": "DC 10 Dexterity save", "failure": "Tangled, lose action"},
    {"name": "Crumbling Roof", "description": "Weak tiles give way", "check": "DC 13 Acrobatics", "failure": "Crash through roof (2d6 damage, fall into building)"},
    {"name": "Market Awning", "description": "Fabric canopy", "check": "DC 8 Acrobatics to slide across", "failure": "Rip through, land in stall"}
  ],
  "complications": [
    "City watch below shooting arrows upward",
    "Thief drops smoke pellet, lightly obscuring area",
    "Flock of pigeons startled, creating distraction",
    "Loose chimney topples, blocking path"
  ],
  "shortcuts": [
    {"name": "Zipline", "description": "Rope stretched between towers", "benefit": "Skip 2 obstacles, DC 10 Acrobatics"},
    {"name": "Narrow Alley", "description": "Drop down, run through", "benefit": "Gain ground but take 1d6 damage"}
  ],
  "chase_phases": [
    {"round": "1-2", "description": "Initial pursuit across stable roofs", "difficulty": "Easy"},
    {"round": "3-4", "description": "Dangerous gaps and weak structures", "difficulty": "Medium"},
    {"round": "5+", "description": "Desperate finale near clock tower", "difficulty": "Hard"}
  ],
  "ending_conditions": {
    "success": "Catch thief before they reach safe house",
    "failure": "Thief escapes into sewers with artifact",
    "alternative": "Thief cornered but threatens to destroy artifact"
  },
  "rewards": {
    "success": "Recover artifact, 100 gp bounty, city guard gratitude",
    "partial": "Track thief to hideout location",
    "failure": "Gain enemy, artifact lost"
  },
  "special_rules": "Each round requires DC 10 + round number Athletics/Acrobatics check to maintain pace",
  "environmental_factors": [
    "Rain makes surfaces slippery (+2 to all DCs)",
    "Poor visibility from fog (Perception checks at disadvantage)",
    "Strong winds (Strength save to cross gaps)"
  ]
}

Create dramatic, exciting chases with clear mechanics."""

    elif prompt_type == "user":
        chase_type = kwargs.get("chase_type", "foot_chase")
        terrain = kwargs.get("terrain", "urban")
        difficulty = kwargs.get("difficulty", "medium")
        party_level = kwargs.get("party_level", "5")
        special_requests = kwargs.get("special_requests")
        campaign_context = kwargs.get("campaign_context")
        game_system = kwargs.get("game_system", "D&D 5e")

        prompt = f"""Generate a {difficulty} difficulty {chase_type} in {terrain} terrain for {game_system}.
Target party level: {party_level}

Chase Types:
- foot_chase: Running pursuit on foot
- mounted_chase: On horseback or riding animals
- vehicle_chase: Wagons, carriages, or carts
- aerial_chase: Flying creatures or airships
- aquatic_chase: Boats, swimming, underwater
- urban_pursuit: Through city streets and alleys
- wilderness_chase: Through forests, mountains, plains
- dungeon_chase: Through corridors and chambers
- magical_chase: Teleportation, dimension doors, ethereal

Terrain Types:
- urban: City streets, buildings, crowds
- urban_rooftops: Across rooftops and heights
- forest: Dense woods, undergrowth, trees
- mountains: Cliffs, narrow paths, avalanches
- desert: Sand dunes, heat, limited cover
- swamp: Mud, water, treacherous ground
- snow: Ice, blizzards, avalanches
- underground: Tunnels, caves, darkness
- waterways: Rivers, canals, docks
- magical: Shifting reality, portals, illusions

Difficulty Levels:
- easy: Simple obstacles, low stakes
- medium: Moderate challenges, meaningful consequences
- challenging: Difficult obstacles, high stakes
- hard: Deadly hazards, critical importance
- extreme: Nearly impossible, epic finale

Include:
- 4-6 unique obstacles with skill checks
- 2-4 complications or random events
- 1-2 shortcuts or alternate routes
- Chase phases showing progression
- Multiple ending conditions
- Environmental factors affecting difficulty
- Special rules for chase mechanics"""

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
            except:
                pass

        return prompt

    return ""
