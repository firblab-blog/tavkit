"""Schema validation and field extraction utilities."""

from typing import Any, Dict, List, Optional, Union


def extract_fields(
    data: Dict[str, Any],
    schema: Dict[str, Any],
    strict: bool = False
) -> Dict[str, Any]:
    """
    Extract only the fields defined in the schema from the data.

    This prevents AI-generated extra fields from polluting the response.

    Args:
        data: The raw data (typically from AI response)
        schema: A dictionary defining expected fields and their types/defaults
        strict: If True, raise error on missing required fields. If False, use defaults.

    Returns:
        Dictionary containing only the expected fields

    Example schema:
        {
            "name": str,
            "age": (int, 0),  # (type, default)
            "tags": (list, []),
            "metadata": dict,
        }
    """
    result = {}

    for field_name, field_spec in schema.items():
        # Handle nested object specs
        if isinstance(field_spec, dict):
            # Nested object - recurse
            if field_name in data and isinstance(data[field_name], dict):
                result[field_name] = extract_fields(data[field_name], field_spec, strict)
            else:
                result[field_name] = {}
            continue

        # Parse field spec
        if isinstance(field_spec, tuple):
            expected_type, default = field_spec
        else:
            expected_type = field_spec
            default = get_default_for_type(expected_type)

        # Extract field value
        if field_name in data:
            value = data[field_name]
            # Type check and coercion
            if isinstance(value, expected_type):
                result[field_name] = value
            else:
                # Try to coerce or use default
                try:
                    if expected_type == list and not isinstance(value, list):
                        result[field_name] = [value] if value else []
                    elif expected_type == str and not isinstance(value, str):
                        result[field_name] = str(value)
                    elif expected_type == int and not isinstance(value, int):
                        result[field_name] = int(value)
                    elif expected_type == float and not isinstance(value, float):
                        result[field_name] = float(value)
                    elif expected_type == bool and not isinstance(value, bool):
                        result[field_name] = bool(value)
                    else:
                        result[field_name] = default
                except (ValueError, TypeError):
                    result[field_name] = default
        else:
            if strict:
                raise ValueError(f"Missing required field: {field_name}")
            result[field_name] = default

    return result


def get_default_for_type(t: type) -> Any:
    """Get a sensible default value for a type."""
    if t == str:
        return ""
    elif t == int:
        return 0
    elif t == float:
        return 0.0
    elif t == bool:
        return False
    elif t == list:
        return []
    elif t == dict:
        return {}
    else:
        return None


# Schema definitions for each generator type
CRITTER_SCHEMA = {
    "name": (str, "Unknown Critter"),
    "species": (str, "Unknown Species"),
    "critter_type": (str, "mammal"),
    "size": (str, "medium"),
    "temperament": (str, "neutral"),
    "habitat": (str, "forest"),
    "description": (str, ""),
    "behavior": (str, ""),
    "stats": {
        "ac": (int, 10),
        "hp": (str, "1d8"),
        "speed": (str, "30 ft."),
        "str": (int, 10),
        "dex": (int, 10),
        "con": (int, 10),
        "int": (int, 3),
        "wis": (int, 10),
        "cha": (int, 5),
    },
    "special_abilities": (list, []),
    "uses": (list, []),
    "training_difficulty": (str, "moderate"),
    "diet": (str, "omnivore"),
    "lifespan": (str, "10 years"),
    "interesting_facts": (list, []),
    "encounter_notes": (str, ""),
}

NPC_SCHEMA = {
    "name": (str, ""),
    "race": (str, "Human"),
    "class": (str, "Commoner"),
    "level": (int, 1),
    "alignment": (str, "Neutral"),
    "appearance": (str, ""),
    "personality": {
        "traits": (list, []),
        "ideals": (str, ""),
        "bonds": (str, ""),
        "flaws": (str, ""),
    },
    "background": (str, ""),
    "motivation": (str, ""),
    "abilities": {
        "STR": (int, 10),
        "DEX": (int, 10),
        "CON": (int, 10),
        "INT": (int, 10),
        "WIS": (int, 10),
        "CHA": (int, 10),
    },
    "skills": (list, []),
    "equipment": (list, []),
    "role": (str, ""),
    "plot_hooks": (list, []),
}

ITEM_SCHEMA = {
    "name": (str, ""),
    "type": (str, "wondrous"),
    "rarity": (str, "common"),
    "description": (str, ""),
    "properties": (dict, {}),
    "requires_attunement": (bool, False),
    "curse": (str, None),
    "origin": (str, ""),
    "lore": (str, ""),
    "value": (int, 0),
    "weight": (float, 0.0),
    "hooks": (list, []),
}

RUMOR_SCHEMA = {
    "text": (str, ""),
    "source": (str, ""),
    "veracity": (str, "unknown"),
    "truth": (str, ""),
    "context": (str, ""),
    "tone": (str, "neutral"),
    "leads_to": (str, ""),
    "foreshadowing": (bool, False),
    "foreshadows": (str, ""),
    "tags": (list, []),
    "investigation_dc": (int, 10),
    "revealed": (bool, False),
    "hooks": (list, []),
}

MONSTER_SCHEMA = {
    "name": (str, ""),
    "type": (str, ""),
    "size": (str, "Medium"),
    "armor_class": (int, 10),
    "hit_points": (int, 10),
    "speed": (dict, {}),
    "abilities": {
        "STR": (int, 10),
        "DEX": (int, 10),
        "CON": (int, 10),
        "INT": (int, 10),
        "WIS": (int, 10),
        "CHA": (int, 10),
    },
    "challenge_rating": (int, 1),
    "traits": (list, []),
    "actions": (list, []),
    "lore": (str, ""),
}

QUEST_SCHEMA = {
    "title": (str, ""),
    "type": (str, "side"),
    "description": (str, ""),
    "objectives": (list, []),
    "rewards": (list, []),
    "complications": (list, []),
    "npcs_involved": (list, []),
    "locations_involved": (list, []),
    "party_level": (int, 1),
    "estimated_sessions": (int, 1),
    "status": (str, "available"),
    "hooks": (list, []),
}

LOCATION_SCHEMA = {
    "name": (str, ""),
    "type": (str, ""),
    "description": (str, ""),
    "atmosphere": (str, ""),
    "features": (list, []),
    "secrets": (list, []),
    "npcs": (list, []),
    "encounters": (list, []),
    "factions": (list, []),
    "hooks": (list, []),
}

MERCHANT_SCHEMA = {
    "name": (str, ""),
    "shop_type": (str, "general_store"),
    "atmosphere": (str, ""),
    "description": (str, ""),
    "location": (str, ""),
    "owner_name": (str, ""),
    "owner_personality": (str, ""),
    "owner_description": (str, ""),
    "haggle_willingness": (str, "firm"),
    "inventory": (list, []),
    "services": (list, []),
    "special_items": (list, []),
    "recently_sold": (list, []),
    "rumors": (list, []),
    "special_notes": (str, ""),
}

TAVERN_SCHEMA = {
    "name": (str, ""),
    "type": (str, "tavern"),
    "atmosphere": (str, ""),
    "description": (str, ""),
    "keeper_name": (str, ""),
    "keeper_personality": (str, ""),
    "keeper_description": (str, ""),
    "menu_food": (list, []),
    "menu_drinks": (list, []),
    "rooms": (list, []),
    "patrons": (list, []),
    "events": (list, []),
    "rumors": (list, []),
    "special_notes": (str, ""),
}

TRAP_SCHEMA = {
    "name": (str, ""),
    "trap_type": (str, "mechanical"),
    "difficulty": (str, "medium"),
    "description": (str, ""),
    "trigger": (str, ""),
    "effect": (str, ""),
    "damage": (str, ""),
    "detection": (dict, {}),
    "solution_paths": (list, []),
    "complications": (list, []),
    "rewards": (list, []),
    "scaling": (dict, {}),
    "dm_notes": (str, ""),
}
