"""Prompts for merchant generation"""

from typing import Optional


def get_merchant_prompt(prompt_type: str, **kwargs) -> str:
    """Get merchant generation prompts"""

    if prompt_type == "system":
        return """You are a merchant/shop generator for tabletop RPGs. Create usable, interesting establishments.

Return ONLY valid JSON. Be concise. Example:
{
  "name": "Ironclad Armory",
  "shop_type": "blacksmith",
  "atmosphere": "Ring of hammer on anvil, heat from forge, smell of hot metal and oil",
  "description": "Master smith's workshop, specializes in quality armor and weapons",
  "location": "Market square, near city gates",
  "owner_name": "Borin Steelheart",
  "owner_personality": "Perfectionist, proud of work, gruff but honest",
  "owner_description": "Burly dwarf with singed beard, leather apron, calloused hands",
  "haggle_willingness": "firm",
  "inventory": [
    {"name": "Longsword", "description": "Well-balanced steel blade", "price": "15 gp", "quantity": "3"},
    {"name": "Chain Mail", "description": "Quality interlocking rings", "price": "75 gp", "quantity": "2"},
    {"name": "Shield", "description": "Sturdy wooden shield with iron boss", "price": "10 gp", "quantity": "5"}
  ],
  "services": [
    {"name": "Weapon Repair", "description": "Restore damaged weapons", "price": "5 gp"},
    {"name": "Armor Fitting", "description": "Custom fit armor to buyer", "price": "10 gp"},
    {"name": "Sharpening", "description": "Professional blade sharpening", "price": "1 gp"}
  ],
  "special_items": [
    {"name": "Masterwork Warhammer", "description": "Exceptional balance, dwarven runes", "price": "350 gp"},
    {"name": "Silver Dagger", "description": "For fighting lycanthropes", "price": "25 gp"}
  ],
  "recently_sold": [
    "Set of chainmail to local guard",
    "Dozen arrows to hunter",
    "Repaired family sword for noble"
  ],
  "rumors": [
    "Lord commissioned special armor for tournament",
    "Merchant seeking guard escort for caravan"
  ],
  "special_notes": "Will discount for bulk orders from adventuring parties"
}

Be brief and atmospheric. Focus on usability."""

    elif prompt_type == "user":
        shop_type = kwargs.get("shop_type", "general_store")
        quality = kwargs.get("quality", "average")
        size = kwargs.get("size", "medium")
        party_level = kwargs.get("party_level", "5")
        special_requests = kwargs.get("special_requests")
        campaign_context = kwargs.get("campaign_context")
        game_system = kwargs.get("game_system", "D&D 5e")

        prompt = f"""Generate a {quality} quality {shop_type} ({size} size) for {game_system}.
Target party level: {party_level}

Shop Types Guide:
- general_store: Basic supplies, rope, rations, tools
- blacksmith: Weapons, armor, metalwork
- apothecary: Potions, herbs, medicines
- magic_shop: Scrolls, components, minor enchanted items
- bookstore: Maps, books, scrolls, knowledge
- tavern: Inn with marketplace attached
- pawn_shop: Used items, curiosities, bargains
- temple: Holy items, blessings, donations
- jeweler: Gems, fine jewelry, luxury goods
- tailor: Clothing, armor padding, disguises
- fletcher: Bows, arrows, ranged weapons
- alchemist: Alchemical items, explosives, acids
- exotic_goods: Rare imports, unusual items

Quality Levels:
- poor: Basic goods, worn items, limited selection
- modest: Decent quality, fair prices
- average: Standard goods, typical selection
- comfortable: Good quality, reliable stock
- wealthy: Fine goods, premium prices
- aristocratic: Luxury items, exclusive clientele

Size affects inventory quantity and variety."""

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
