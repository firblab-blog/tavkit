"""Prompts for tavern generation"""

from typing import Optional


def get_tavern_prompt(prompt_type: str, **kwargs) -> str:
    """Get tavern generation prompts"""

    if prompt_type == "system":
        return """You are a tavern generator for tabletop RPGs. Create usable, atmospheric establishments.

Return ONLY valid JSON. Be concise. Example:
{
  "name": "The Rusted Cask",
  "type": "tavern",
  "atmosphere": "Worn beams, amber lamplight, smell of ale and roasted meat",
  "description": "Veterans' tavern near garrison, low-key and practical",
  "keeper_name": "Mara Ironhand",
  "keeper_personality": "Gruff but fair, veteran herself, no-nonsense",
  "keeper_description": "Stocky dwarf, iron-gray hair, missing left hand (replaced with pewter prosthetic)",
  "menu_food": [
    {"name": "Stew", "description": "Hearty mutton stew", "price": "4 cp"},
    {"name": "Bread", "description": "Dark rye bread", "price": "1 cp"},
    {"name": "Roast", "description": "Sunday roast chicken", "price": "8 cp"}
  ],
  "menu_drinks": [
    {"name": "Ale", "description": "House ale", "price": "2 cp"},
    {"name": "Wine", "description": "Cheap red wine", "price": "5 cp"},
    {"name": "Spirits", "description": "Strong whiskey", "price": "1 sp"}
  ],
  "rooms": [
    {"type": "Common Room", "description": "Bedroll in common hall", "price": "3 cp/night", "available": 8},
    {"type": "Private", "description": "Small room, single bed", "price": "5 sp/night", "available": 3}
  ],
  "patrons": [
    {"name": "Corporal Venn", "race": "Human", "description": "Off-duty guard drinking alone", "hook": "Worried about missing patrol"},
    {"name": "Old Thom", "race": "Halfling", "description": "Regular, plays cards", "hook": "Knows local smuggling routes"}
  ],
  "events": ["Weekly dart tournament tonight", "Merchant caravan arrived, bar is crowded"],
  "rumors": ["Bandits active on north road", "Lord's daughter seen with mysterious stranger"],
  "special_notes": "Basement leads to old smuggling tunnel (now blocked)"
}

Be brief and atmospheric. Focus on usability."""

    elif prompt_type == "user":
        type_str = kwargs.get("type", "tavern")
        quality = kwargs.get("quality", "average")
        size = kwargs.get("size", "medium")
        special_requests = kwargs.get("special_requests")
        campaign_context = kwargs.get("campaign_context")
        game_system = kwargs.get("game_system", "D&D 5e")

        prompt = f"""Create {size} {quality} {type_str} for {game_system}.
"""

        if campaign_context:
            prompt += f"Campaign: {campaign_context}\n"

        if special_requests:
            prompt += f"Special: {special_requests}\n"

        prompt += "\nJSON only. Be concise."

        return prompt

    return ""
