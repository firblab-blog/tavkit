"""Content generation endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Annotated, Dict, Any, Union

from app.generators.npc_generator import NPCGenerator
from app.generators.monster_generator import MonsterGenerator
from app.generators.encounter_builder import EncounterBuilder
from app.generators.dialogue_builder import DialogueBuilder
from app.generators.location_generator import LocationGenerator
from app.generators.quest_generator import QuestGenerator
from app.generators.item_generator import ItemGenerator
from app.generators.rumor_generator import RumorGenerator
from app.generators.tavern_generator import TavernGenerator
from app.generators.merchant_generator import MerchantGenerator
from app.generators.trap_generator import TrapGenerator
from app.generators.critter_generator import CritterGenerator
from app.generators.chase_generator import ChaseGenerator
from app.providers import get_provider


router = APIRouter()


# Campaign Context Model
class CampaignContext(BaseModel):
    """Campaign context for tailored generation"""

    name: Optional[str] = None
    theme: Optional[str] = None
    tone: Optional[str] = None
    game_system: Optional[str] = None
    magic_level: Optional[str] = None
    setting: Optional[Any] = None
    # RAG-enhanced setting knowledge (injected by Go backend after RAG query)
    setting_knowledge: Optional[str] = Field(
        None,
        description="RAG-retrieved setting knowledge from wiki (e.g., Eberron lore)"
    )


# Request/Response Models
class NPCGenerateRequest(BaseModel):
    """NPC generation request"""

    prompt: Optional[str] = Field(None, description="Description of the NPC to generate")
    race: Optional[str] = Field(None, description="NPC race")
    class_name: Annotated[Optional[str], Field(alias="class", description="NPC class")] = None
    level: Optional[int] = Field(None, ge=1, le=20, description="NPC level")
    npc_role: Optional[str] = Field(
        None, description="NPC role (commoner, merchant, guard, noble, etc.)"
    )
    personality_type: Optional[str] = Field(
        None, description="Personality type (friendly, hostile, neutral, quirky, etc.)"
    )
    personality: Optional[str] = Field(None, description="Personality traits")
    campaign_id: Optional[str] = Field(None, description="Campaign ID for context")
    campaign_context: Optional[CampaignContext] = Field(
        None, description="Campaign context for tailored generation"
    )
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class NPCGenerateResponse(BaseModel):
    """NPC generation response"""

    npc: dict


class MonsterGenerateRequest(BaseModel):
    """Monster generation request"""

    prompt: Optional[str] = Field(None, description="Description of the monster to generate")
    cr: Optional[int] = Field(None, ge=0, le=30, description="Challenge Rating")
    type: Optional[str] = Field(None, description="Monster type")
    size: Optional[str] = Field(
        None, description="Size category (tiny, small, medium, large, huge, gargantuan)"
    )
    environment: Optional[str] = Field(None, description="Environment")


class MonsterGenerateResponse(BaseModel):
    """Monster generation response"""

    monster: dict


class EncounterGenerateRequest(BaseModel):
    """Encounter generation request"""

    prompt: Optional[str] = Field(None, description="Description of the encounter")
    party_level: int = Field(..., ge=1, le=20, description="Average party level")
    party_size: int = Field(..., ge=1, le=10, description="Number of players")
    difficulty: Optional[str] = Field("medium", description="easy, medium, hard, deadly")
    encounter_type: Optional[str] = Field(
        None, description="Encounter type (combat, social, exploration, puzzle, stealth)"
    )
    environment: Optional[str] = Field(
        None, description="Environment (dungeon, forest, urban, etc.)"
    )


class EncounterGenerateResponse(BaseModel):
    """Encounter generation response"""

    encounter: dict


class DialogueGenerateRequest(BaseModel):
    """Dialogue generation request"""

    prompt: Optional[str] = Field(None, description="Description of the dialogue scene")
    character_name: Optional[str] = Field(None, description="Name of the NPC")
    personality: Optional[str] = Field(None, description="NPC personality traits")
    situation: Optional[str] = Field(None, description="Current situation or context")
    tone: Optional[str] = Field(
        None, description="Desired tone (friendly, tense, mysterious, etc.)"
    )
    dialogue_type: Optional[str] = Field(
        None, description="Dialogue type (conversation, interrogation, negotiation, etc.)"
    )
    complexity: Optional[str] = Field(
        None, description="Complexity level (simple, moderate, complex)"
    )


class DialogueGenerateResponse(BaseModel):
    """Dialogue generation response"""

    dialogue: dict


class LocationGenerateRequest(BaseModel):
    """Location generation request"""

    prompt: Optional[str] = Field(None, description="Description of the location to generate")
    type: Optional[str] = Field(
        None, description="Location type (settlement, dungeon, tavern, shop, etc.)"
    )
    size: Optional[str] = Field(None, description="Size (tiny, small, medium, large, huge)")
    danger_level: Optional[str] = Field(
        None, description="Danger level (safe, low, moderate, high, extreme)"
    )
    theme: Optional[str] = Field(None, description="Theme or atmosphere")
    scale: Optional[str] = Field(None, description="Scale (small, medium, large)")
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class LocationGenerateResponse(BaseModel):
    """Location generation response"""

    location: dict


class QuestGenerateRequest(BaseModel):
    """Quest generation request"""

    prompt: Optional[str] = Field(None, description="Description of the quest to generate")
    type: Optional[str] = Field(
        None, description="Quest type (main, side, fetch, escort, investigation, combat)"
    )
    difficulty: Optional[str] = Field(
        None, description="Difficulty level (easy, medium, hard, deadly)"
    )
    party_level: Optional[int] = Field(None, ge=1, le=20, description="Recommended party level")
    quest_length: Optional[str] = Field(
        None, description="Quest length (short, medium, long, epic)"
    )
    moral_complexity: Optional[str] = Field(
        None, description="Moral complexity (simple, nuanced, morally_grey)"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")


class QuestGenerateResponse(BaseModel):
    """Quest generation response"""

    quest: dict


class ItemGenerateRequest(BaseModel):
    """Item generation request"""

    prompt: Optional[str] = Field(None, description="Description of the item to generate")
    type: Optional[str] = Field(
        None, description="Item type (weapon, armor, potion, scroll, wondrous, ring, etc.)"
    )
    rarity: Optional[str] = Field(
        None, description="Item rarity (common, uncommon, rare, very_rare, legendary)"
    )
    category: Optional[str] = Field(
        None, description="Item category (combat, utility, consumable, quest)"
    )
    cursed: Optional[bool] = Field(None, description="Whether the item is cursed")
    magical: Optional[bool] = Field(None, description="Whether the item is magical")
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class ItemGenerateResponse(BaseModel):
    """Item generation response"""

    item: dict


class RumorGenerateRequest(BaseModel):
    """Rumor generation request"""

    prompt: Optional[str] = Field(None, description="Context or theme for the rumor")
    count: Optional[int] = Field(1, ge=1, le=10, description="Number of rumors to generate")
    veracity: Optional[str] = Field(
        None, description="Veracity (true, partially_true, false, unknown)"
    )
    rumor_type: Optional[str] = Field(
        None, description="Rumor type (political, supernatural, criminal, economic, etc.)"
    )
    urgency: Optional[str] = Field(None, description="Urgency (low, medium, high, critical)")
    scope: Optional[str] = Field(None, description="Scope (local, regional, national, world)")
    tone: Optional[str] = Field(None, description="Tone (mysterious, ominous, hopeful, etc.)")
    leads_to: Optional[str] = Field(
        None, description="What the rumor leads to (npc, location, quest, item)"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")


class RumorGenerateResponse(BaseModel):
    """Rumor generation response"""

    rumor: dict


class TavernGenerateRequest(BaseModel):
    """Tavern generation request"""

    type: str = Field(
        ..., description="Type of establishment (tavern, inn, pub, alehouse, roadhouse, brewery)"
    )
    quality: str = Field(
        ..., description="Quality level (poor, modest, average, comfortable, wealthy, aristocratic)"
    )
    size: str = Field(..., description="Size (tiny, small, medium, large, huge)")
    special_requests: Optional[str] = Field(None, description="Special features or requirements")
    campaign_context: Optional[str] = Field(
        None, description="Campaign context JSON for tailored generation"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class TavernGenerateResponse(BaseModel):
    """Tavern generation response"""

    tavern: dict


class MerchantGenerateRequest(BaseModel):
    """Merchant generation request"""

    shop_type: str = Field(
        ..., description="Type of shop (general_store, blacksmith, apothecary, etc.)"
    )
    quality: str = Field(
        ..., description="Quality level (poor, modest, average, comfortable, wealthy, aristocratic)"
    )
    size: str = Field(..., description="Size (tiny, small, medium, large, huge)")
    party_level: Optional[str] = Field(None, description="Target party level for pricing/items")
    special_requests: Optional[str] = Field(None, description="Special features or requirements")
    campaign_context: Optional[str] = Field(
        None, description="Campaign context JSON for tailored generation"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class MerchantGenerateResponse(BaseModel):
    """Merchant generation response"""

    merchant: dict


class TrapGenerateRequest(BaseModel):
    """Trap/puzzle generation request"""

    trap_type: str = Field(
        ..., description="Type of trap (mechanical, magical, puzzle, combination, environmental)"
    )
    difficulty: str = Field(..., description="Difficulty level (easy, medium, hard, deadly)")
    party_level: Optional[str] = Field(None, description="Target party level for appropriate DCs")
    environment: str = Field(
        "dungeon", description="Environment type (dungeon, temple, tomb, forest, urban, castle)"
    )
    special_requests: Optional[str] = Field(None, description="Special features or requirements")
    campaign_context: Optional[str] = Field(
        None, description="Campaign context JSON for tailored generation"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class TrapGenerateResponse(BaseModel):
    """Trap/puzzle generation response"""

    trap: dict


class CritterGenerateRequest(BaseModel):
    """Critter generation request"""

    # Optional: Accept raw prompt from Go backend (overrides template)
    prompt: Optional[str] = Field(None, description="Direct prompt (bypasses template generation)")
    
    critter_type: str = Field(
        "mammal",
        description="Type of critter (bird, mammal, reptile, amphibian, insect, aquatic, magical, hybrid)",
    )
    size: str = Field(
        "medium", description="Size category (tiny, small, medium, large, huge, gargantuan)"
    )
    temperament: str = Field(
        "neutral",
        description="Temperament (docile, curious, timid, neutral, territorial, aggressive, protective)",
    )
    habitat: str = Field("forest", description="Primary habitat/environment")
    special_requests: Optional[str] = Field(None, description="Special features or requirements")
    campaign_id: Optional[str] = Field(
        None, description="Campaign ID to fetch context from Go backend"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class CritterGenerateResponse(BaseModel):
    """Critter generation response"""

    critter: dict


class ChaseGenerateRequest(BaseModel):
    """Chase/pursuit generation request"""

    chase_type: str = Field(
        "foot_chase",
        description="Type of chase (foot_chase, mounted_chase, vehicle_chase, aerial_chase, aquatic_chase, urban_pursuit, wilderness_chase, dungeon_chase, magical_chase)",
    )
    terrain: str = Field(
        "urban",
        description="Terrain type (urban, urban_rooftops, forest, mountains, desert, swamp, snow, underground, waterways, magical)",
    )
    difficulty: str = Field(
        "medium", description="Difficulty level (easy, medium, challenging, hard, extreme)"
    )
    party_level: Optional[str] = Field(None, description="Target party level for appropriate DCs")
    special_requests: Optional[str] = Field(None, description="Special features or requirements")
    campaign_context: Optional[str] = Field(
        None, description="Campaign context JSON for tailored generation"
    )
    game_system: Optional[str] = Field(None, description="Game system (e.g., D&D 5e)")
    max_tokens: Optional[int] = Field(
        None, ge=1, le=16384, description="Maximum tokens for AI generation"
    )
    timeout: Optional[int] = Field(None, ge=30, le=600, description="Timeout in seconds")


class ChaseGenerateResponse(BaseModel):
    """Chase/pursuit generation response"""

    chase: dict


@router.post("/npc", response_model=NPCGenerateResponse)
async def generate_npc(request: NPCGenerateRequest):
    """Generate an NPC using AI"""
    try:
        provider = get_provider()
        generator = NPCGenerator(provider)

        # Convert campaign context to dict if provided
        campaign_ctx = request.campaign_context.model_dump() if request.campaign_context else None

        npc = await generator.generate(
            prompt=request.prompt,
            race=request.race,
            class_name=request.class_name,
            level=request.level,
            personality=request.personality,
            campaign_context=campaign_ctx,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return NPCGenerateResponse(npc=npc)
    except Exception as e:
        import traceback

        print(f"[ERROR] NPC generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"NPC generation failed: {str(e)}")


@router.post("/monster", response_model=MonsterGenerateResponse)
async def generate_monster(request: MonsterGenerateRequest):
    """Generate a monster using AI"""
    try:
        provider = get_provider()
        generator = MonsterGenerator(provider)

        monster = await generator.generate(
            prompt=request.prompt,
            cr=request.cr,
            type=request.type,
            environment=request.environment,
        )

        return MonsterGenerateResponse(monster=monster)
    except Exception as e:
        import traceback

        print(f"[ERROR] Monster generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Monster generation failed: {str(e)}")


@router.post("/encounter", response_model=EncounterGenerateResponse)
async def generate_encounter(request: EncounterGenerateRequest):
    """Generate an encounter using AI"""
    try:
        provider = get_provider()
        builder = EncounterBuilder(provider)

        encounter = await builder.build(
            prompt=request.prompt,
            party_level=request.party_level,
            party_size=request.party_size,
            difficulty=request.difficulty,
        )

        return EncounterGenerateResponse(encounter=encounter)
    except Exception as e:
        import traceback

        print(f"[ERROR] Encounter generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Encounter generation failed: {str(e)}")


@router.post("/dialogue", response_model=DialogueGenerateResponse)
async def generate_dialogue(request: DialogueGenerateRequest):
    """Generate NPC dialogue using AI"""
    try:
        provider = get_provider()
        builder = DialogueBuilder(provider)

        dialogue = await builder.build(
            prompt=request.prompt,
            character_name=request.character_name,
            personality=request.personality,
            situation=request.situation,
            tone=request.tone,
        )

        return DialogueGenerateResponse(dialogue=dialogue)
    except Exception as e:
        import traceback

        print(f"[ERROR] Dialogue generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Dialogue generation failed: {str(e)}")


@router.post("/location", response_model=LocationGenerateResponse)
async def generate_location(request: LocationGenerateRequest):
    """Generate a location using AI"""
    try:
        provider = get_provider()
        generator = LocationGenerator(provider)

        location = await generator.generate(
            prompt=request.prompt,
            type=request.type,
            theme=request.theme,
            scale=request.scale,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return LocationGenerateResponse(location=location)
    except Exception as e:
        import traceback

        print(f"[ERROR] Location generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Location generation failed: {str(e)}")


@router.post("/quest", response_model=QuestGenerateResponse)
async def generate_quest(request: QuestGenerateRequest):
    """Generate a quest using AI"""
    try:
        provider = get_provider()
        generator = QuestGenerator(provider)

        quest = await generator.generate(
            prompt=request.prompt,
            type=request.type,
            party_level=request.party_level,
            moral_complexity=request.moral_complexity,
            game_system=request.game_system,
        )

        return QuestGenerateResponse(quest=quest)
    except Exception as e:
        import traceback

        print(f"[ERROR] Quest generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Quest generation failed: {str(e)}")


@router.post("/item", response_model=ItemGenerateResponse)
async def generate_item(request: ItemGenerateRequest):
    """Generate an item using AI"""
    try:
        provider = get_provider()
        generator = ItemGenerator(provider)

        item = await generator.generate(
            prompt=request.prompt,
            type=request.type,
            rarity=request.rarity,
            magical=request.magical,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return ItemGenerateResponse(item=item)
    except Exception as e:
        import traceback

        print(f"[ERROR] Item generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Item generation failed: {str(e)}")


@router.post("/rumor", response_model=RumorGenerateResponse)
async def generate_rumor(request: RumorGenerateRequest):
    """Generate a rumor using AI"""
    try:
        provider = get_provider()
        generator = RumorGenerator(provider)

        rumor = await generator.generate(
            prompt=request.prompt,
            veracity=request.veracity,
            tone=request.tone,
            leads_to=request.leads_to,
            game_system=request.game_system,
        )

        return RumorGenerateResponse(rumor=rumor)
    except Exception as e:
        import traceback

        print(f"[ERROR] Rumor generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Rumor generation failed: {str(e)}")


@router.post("/tavern", response_model=TavernGenerateResponse)
async def generate_tavern(request: TavernGenerateRequest):
    """Generate a tavern using AI"""
    try:
        provider = get_provider()
        generator = TavernGenerator(provider)

        tavern = await generator.generate(
            type=request.type,
            quality=request.quality,
            size=request.size,
            special_requests=request.special_requests,
            campaign_context=request.campaign_context,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return TavernGenerateResponse(tavern=tavern)
    except Exception as e:
        import traceback

        print(f"[ERROR] Tavern generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Tavern generation failed: {str(e)}")


@router.post("/merchant", response_model=MerchantGenerateResponse)
async def generate_merchant(request: MerchantGenerateRequest):
    """Generate a merchant/shop using AI"""
    try:
        provider = get_provider()
        generator = MerchantGenerator(provider)

        merchant = await generator.generate(
            shop_type=request.shop_type,
            quality=request.quality,
            size=request.size,
            party_level=request.party_level,
            special_requests=request.special_requests,
            campaign_context=request.campaign_context,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return MerchantGenerateResponse(merchant=merchant)
    except Exception as e:
        import traceback

        print(f"[ERROR] Merchant generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Merchant generation failed: {str(e)}")


@router.post("/trap", response_model=TrapGenerateResponse)
async def generate_trap(request: TrapGenerateRequest):
    """Generate a trap/puzzle using AI"""
    try:
        provider = get_provider()
        generator = TrapGenerator(provider)

        trap = await generator.generate(
            trap_type=request.trap_type,
            difficulty=request.difficulty,
            party_level=request.party_level,
            environment=request.environment,
            special_requests=request.special_requests,
            campaign_context=request.campaign_context,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return TrapGenerateResponse(trap=trap)
    except Exception as e:
        import traceback

        print(f"[ERROR] Trap generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Trap generation failed: {str(e)}")


@router.post("/critter", response_model=CritterGenerateResponse)
async def generate_critter(request: CritterGenerateRequest):
    """Generate a critter/creature using AI"""
    print(f"[ENDPOINT] Received critter request:")
    print(f"  - Has prompt: {request.prompt is not None}")
    print(f"  - Prompt length: {len(request.prompt) if request.prompt else 0}")
    print(f"  - critter_type: {request.critter_type}")
    print(f"  - size: {request.size}")
    print(f"  - max_tokens: {request.max_tokens}")
    print(f"  - campaign_id: {request.campaign_id}")
    if request.prompt:
        print(f"  - Prompt preview: {request.prompt[:200]}...")
    try:
        provider = get_provider()
        generator = CritterGenerator(provider)

        critter = await generator.generate(
            prompt=request.prompt,  # Pass through raw prompt if provided
            critter_type=request.critter_type,
            size=request.size,
            temperament=request.temperament,
            habitat=request.habitat,
            special_requests=request.special_requests,
            campaign_id=request.campaign_id,  # Pass campaign ID instead of context
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return CritterGenerateResponse(critter=critter)
    except Exception as e:
        import traceback

        print(f"[ERROR] Critter generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Critter generation failed: {str(e)}")


@router.post("/chase", response_model=ChaseGenerateResponse)
async def generate_chase(request: ChaseGenerateRequest):
    """Generate a chase/pursuit scene using AI"""
    try:
        provider = get_provider()
        generator = ChaseGenerator(provider)

        chase = await generator.generate(
            chase_type=request.chase_type,
            terrain=request.terrain,
            difficulty=request.difficulty,
            party_level=request.party_level,
            special_requests=request.special_requests,
            campaign_context=request.campaign_context,
            game_system=request.game_system,
            max_tokens=request.max_tokens,
            timeout=request.timeout,
        )

        return ChaseGenerateResponse(chase=chase)
    except Exception as e:
        import traceback

        print(f"[ERROR] Chase generation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chase generation failed: {str(e)}")
