"""
Campaign summarization routes for AI service
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import json

from app.providers import get_provider
from app.config import settings
import re


def _provider_max_tokens(provider_name: Optional[str] = None) -> int:
    """Return the configured max tokens for the active provider."""
    provider = (provider_name or settings.AI_PROVIDER or "").lower()
    if provider == "anthropic":
        return settings.ANTHROPIC_MAX_TOKENS
    if provider == "openai":
        return settings.OPENAI_MAX_TOKENS
    # default to Ollama value
    return settings.OLLAMA_MAX_TOKENS


def _get_provider_from_config(config: Optional["ProviderConfig"] = None):
    """Get provider instance from config or use defaults."""
    if config and config.provider:
        return get_provider(
            provider_name=config.provider,
            api_key=config.api_key,
            model=config.model,
            base_url=config.base_url,
        )
    return get_provider()


logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Extraction prompts for the chunked summary pipeline (anti-hallucination)
# =============================================================================

EXTRACTION_PROMPTS = {
    "npcs": """Extract ONLY explicit facts from these NPCs.
For each NPC, extract: name, race, class, occupation, personality traits mentioned,
relationships explicitly stated, locations mentioned, notable abilities/items.
Do NOT infer backstory or motivations not explicitly written.""",
    "locations": """Extract ONLY explicit facts from these locations.
For each location, extract: name, type, notable features described,
NPCs explicitly mentioned as present, connections to other locations stated.""",
    "quests": """Extract ONLY explicit facts from these quests.
For each quest, extract: title, type, objectives stated, rewards mentioned,
NPCs involved, locations involved, current status if mentioned.""",
    "monsters": """Extract ONLY explicit facts from these monsters.
For each monster, extract: name, type, challenge rating,
notable abilities, lore explicitly provided, weaknesses if stated.""",
    "items": """Extract ONLY explicit facts from these items.
For each item, extract: name, type, rarity, properties described,
history/origin if explicitly stated, current owner if mentioned.""",
    "encounters": """Extract ONLY explicit facts from these encounters.
For each encounter, extract: name, difficulty, creatures involved,
environment, treasure mentioned, any narrative hooks stated.""",
    "rumors": """Extract ONLY explicit facts from these rumors.
For each rumor, extract: the rumor text, veracity if known,
source mentioned, what it relates to.""",
    "dialogues": """Extract ONLY explicit facts from these dialogues.
For each dialogue, extract: character name, key information revealed,
potential quests mentioned, relationships implied.""",
    "taverns": """Extract ONLY explicit facts from these taverns.
For each tavern, extract: name, type, atmosphere, keeper name and personality,
notable features, rumors available.""",
    "merchants": """Extract ONLY explicit facts from these merchants.
For each merchant, extract: shop name, type, owner name and personality,
notable items for sale, any special services.""",
    "traps": """Extract ONLY explicit facts from these traps.
For each trap, extract: name, type, difficulty, trigger mechanism,
effects, detection/disarm methods.""",
    "critters": """Extract ONLY explicit facts from these critters.
For each critter, extract: name, species, size, temperament,
habitat, notable abilities, potential uses.""",
    "chases": """Extract ONLY explicit facts from these chases.
For each chase, extract: name, type, terrain, difficulty,
key obstacles, participants mentioned.""",
    "campaign_content": """Extract ONLY explicit facts from this campaign content.
Extract: key events described, NPCs mentioned, locations mentioned,
plot developments, decisions made, outcomes stated.""",
}

EXTRACTION_SYSTEM_PROMPT = """You are a fact extraction assistant.

CRITICAL RULES:
1. Extract ONLY facts explicitly stated in the source data
2. NEVER infer, assume, or add information not present
3. If a field is empty or not provided, do not include it
4. Do not interpret or expand on what is written
5. Output format: JSON array of {"content_id": "...", "facts": ["fact1", "fact2", ...]}

Your goal is ACCURATE EXTRACTION, not creative interpretation."""

# =============================================================================
# Synthesis prompts for the chunked summary pipeline (anti-hallucination)
# =============================================================================

SYNTHESIS_PROMPTS = {
    "overview": """Generate a 2-3 sentence campaign overview.
Mention the campaign name and game system.
Describe the core premise based ONLY on the facts provided.""",
    "setting": """Generate a 2-3 sentence setting summary.
Describe where the campaign takes place and the atmosphere.
ONLY mention locations and details from the facts list.""",
    "characters": """Generate a 2-3 sentence characters summary.
Highlight key NPCs and their roles in the campaign.
ONLY mention characters from the facts list.""",
    "plot": """Generate a 2-3 sentence plot summary.
Describe active storylines and major conflicts.
ONLY reference quests, events, and developments from the facts.""",
    "tone": """Generate a 1-2 sentence tone summary.
Describe the campaign's atmosphere and themes.
Base this on the campaign metadata and facts provided.""",
}

SYNTHESIS_SYSTEM_PROMPT = """You are a campaign summary writer.

CRITICAL ANTI-HALLUCINATION RULES:
1. You may ONLY use facts from the provided list below
2. If information is not provided, say "not yet established" rather than inventing
3. NEVER mention names, places, events, or details not in the facts list
4. Do not infer relationships or backstory not explicitly stated
5. It is better to write a shorter, accurate summary than a longer fabricated one

Your summaries must be 100% grounded in the provided facts."""


# =============================================================================
# Request/Response models for chunked pipeline endpoints
# =============================================================================


class ProviderConfig(BaseModel):
    """Provider configuration passed from Go backend"""

    provider: Optional[str] = None  # 'ollama', 'openai', 'anthropic'
    api_key: Optional[str] = None  # API key for cloud providers
    model: Optional[str] = None  # Model name override
    base_url: Optional[str] = None  # Base URL (mainly for Ollama)


class FactResult(BaseModel):
    """Result of fact extraction for a single content item"""

    content_id: str
    facts: List[str]


class ExtractFactsRequest(BaseModel):
    """Request model for fact extraction"""

    content_type: str  # 'npc', 'location', etc.
    items: List[Dict[str, Any]]  # FULL rich data (not pre-summarized)
    campaign_context: Optional[Dict[str, Any]] = None
    provider_config: Optional[ProviderConfig] = None  # Provider override from backend


class ExtractFactsResponse(BaseModel):
    """Response model for fact extraction"""

    content_type: str
    results: List[FactResult]


class SynthesizeSectionRequest(BaseModel):
    """Request model for synthesizing a summary section"""

    section: str  # 'overview', 'setting', 'characters', 'plot', 'tone'
    campaign_metadata: Dict[str, Any]  # name, game_system, theme, tone, magic_level
    facts_by_type: Dict[str, Optional[List[str]]]  # {"npcs": ["fact1",...], "locations": [...]} - values can be null
    provider_config: Optional[ProviderConfig] = None  # Provider override from backend


class SynthesizeSectionResponse(BaseModel):
    """Response model for synthesized section"""

    section: str
    summary: str


class SummarizeContentRequest(BaseModel):
    """Request model for content summarization"""

    content_type: str  # 'npc', 'location', 'quest', etc.
    content: dict  # The actual content to summarize
    campaign_context: Optional[dict] = None  # Optional campaign context


class SummarizeSectionRequest(BaseModel):
    """Request model for section summarization"""

    content_type: str  # 'npcs', 'locations', 'quests', etc.
    items: List[dict]  # List of items to summarize
    campaign_context: Optional[dict] = None


class SummarizeCampaignRequest(BaseModel):
    """Request model for campaign overview summarization"""

    campaign: dict  # Campaign metadata
    section_summaries: dict  # Pre-generated section summaries
    campaign_content: Optional[List[dict]] = (
        None  # Structured campaign content (sessions, notes, etc.)
    )


@router.post("/content")
async def summarize_content(request: SummarizeContentRequest):
    """
    Generate a 1-sentence summary for a single piece of content
    """
    try:
        provider = get_provider(settings.AI_PROVIDER)

        # Build prompt based on content type
        if request.content_type == "npc":
            name = request.content.get("name", "Unknown")
            race = request.content.get("race", "")
            class_name = request.content.get("class", "")
            personality = request.content.get("personality", "")
            prompt = f"Summarize this NPC in one concise sentence: {name}, {race} {class_name}. Personality: {personality}."

        elif request.content_type == "location":
            name = request.content.get("name", "Unknown")
            type_name = request.content.get("type", "")
            description = request.content.get("description", "")
            prompt = f"Summarize this location in one sentence: {name} ({type_name}). {description[:200]}..."

        elif request.content_type == "quest":
            title = request.content.get("title", "Unknown")
            description = request.content.get("description", "")
            type_name = request.content.get("type", "")
            prompt = f"Summarize this quest in one sentence: {title} ({type_name}). {description[:200]}..."

        elif request.content_type == "monster":
            name = request.content.get("name", "Unknown")
            cr = request.content.get("cr", 0)
            lore = request.content.get("lore", "")
            prompt = f"Summarize this monster in one sentence: {name} (CR {cr}). {lore[:200]}..."

        elif request.content_type == "item":
            name = request.content.get("name", "Unknown")
            type_name = request.content.get("type", "")
            rarity = request.content.get("rarity", "")
            description = request.content.get("description", "")
            prompt = f"Summarize this item in one sentence: {name} ({rarity} {type_name}). {description[:200]}..."

        elif request.content_type == "encounter":
            name = request.content.get("name", "Unknown")
            difficulty = request.content.get("difficulty", "")
            description = request.content.get("description", "")
            prompt = f"Summarize this encounter in one sentence: {name} ({difficulty}). {description[:200]}..."

        elif request.content_type == "rumor":
            text = request.content.get("text", "")
            veracity = request.content.get("veracity", "")
            prompt = f"Summarize this rumor in one sentence ({veracity}): {text[:200]}..."

        else:
            return {"summary": f"Content of type {request.content_type}"}

        # Generate summary
        system_prompt = "You are a master game master. Summarize content in exactly one concise sentence. Be specific and memorable."
        response = await provider.generate(
            system_prompt, prompt, max_tokens=_provider_max_tokens(), temperature=0.3
        )

        summary = response.strip()
        return {"summary": summary}

    except Exception as e:
        logger.error(f"Error summarizing content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize content: {str(e)}")


@router.post("/section")
async def summarize_section(request: SummarizeSectionRequest):
    """
    Generate a summary for multiple items of the same type
    """
    try:
        provider = get_provider(settings.AI_PROVIDER)

        # Build prompt based on content type
        item_names = [
            item.get("name", item.get("title", item.get("text", "Unknown")[:50]))
            for item in request.items[:20]
        ]  # Limit to 20 items
        items_list = ", ".join(item_names)

        content_type_singular = request.content_type.rstrip("s")  # Remove trailing 's'

        prompt = f"""Summarize this collection of {len(request.items)} {request.content_type} in 2-3 sentences.
Include the most important/interesting ones and any patterns or themes.

{request.content_type.capitalize()}: {items_list}

Provide a brief summary that captures the essence of this collection."""

        system_prompt = "You are a master game master. Provide concise, thematic summaries that highlight key elements and patterns."
        response = await provider.generate(
            system_prompt, prompt, max_tokens=_provider_max_tokens(), temperature=0.5
        )

        summary = response.strip()
        return {"summary": summary}

    except Exception as e:
        logger.error(f"Error summarizing section: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize section: {str(e)}")


@router.post("/campaign")
async def summarize_campaign(request: SummarizeCampaignRequest):
    """
    Generate an overall campaign summary from section summaries
    """
    try:
        provider = get_provider()

        campaign = request.campaign
        sections = request.section_summaries
        campaign_content = request.campaign_content or []

        # Build campaign content context
        content_context = ""
        if campaign_content:
            content_context = "\n\nCampaign Content (Sessions, Notes, Overviews):\n"
            for item in campaign_content:
                section = item.get("section", "unknown")
                subsection = item.get("subsection", "")
                title = item.get("title", "Untitled")
                content = item.get("content", "")

                content_context += f"\n[{section}"
                if subsection:
                    content_context += f" - {subsection}"
                content_context += (
                    f"] {title}:\n{content[:1500]}\n"  # Include substantial content for context
                )

        # Build comprehensive prompt
        prompt = f"""Generate a comprehensive campaign summary for game masters to reference.

Campaign: {campaign.get('name', 'Unknown')}
Game System: {campaign.get('game_system', 'Unknown')}
Theme: {campaign.get('theme', 'N/A')}
Tone: {campaign.get('tone', 'N/A')}
Magic Level: {campaign.get('magic_level', 'N/A')}{content_context}

Generated Content Summaries:
- NPCs: {sections.get('npcs', 'None')}
- Locations: {sections.get('locations', 'None')}
- Quests: {sections.get('quests', 'None')}
- Items: {sections.get('items', 'None')}
- Monsters: {sections.get('monsters', 'None')}

Based on ALL the information above (especially the Campaign Content), provide:
1. Overview (1-2 sentences): What is this campaign about?
2. Setting Summary (2-3 sentences): Where does it take place and what's the atmosphere?
3. Characters Summary (2-3 sentences): Who are the key NPCs and what are their roles?
4. Plot Summary (2-3 sentences): What are the main storylines and conflicts?
5. Tone Summary (1-2 sentences): What's the overall feel and themes?

Format as JSON with keys: overview, setting_summary, characters_summary, plot_summary, tone_summary"""

        system_prompt = "You are a master game master. Create concise, evocative campaign summaries that help GMs quickly understand their world."
        response = await provider.generate(
            system_prompt, prompt, max_tokens=_provider_max_tokens(), temperature=0.6, json_mode=True
        )

        # Try to parse as JSON, but Anthropic sometimes wraps JSON in markdown
        import json

        def clean_json_response(text: str) -> str:
            """Remove markdown code fences, explanatory text, and extract JSON from LLM responses."""
            if not text:
                return text
            # Remove leading/trailing whitespace
            txt = text.strip()

            # Remove common LLM prefixes (Ollama often adds these)
            txt = re.sub(
                r"^.*?(?:here is|here\'s).*?(?:json|summary).*?:?\s*",
                "",
                txt,
                flags=re.IGNORECASE | re.DOTALL,
            )

            # If the whole response is a fenced code block, extract its contents
            m = re.search(r"```(?:json)?\s*(.*?)\s*```", txt, flags=re.DOTALL | re.IGNORECASE)
            if m:
                return m.group(1).strip()

            # Otherwise, remove any leading ```json or ``` and trailing ``` if present
            txt = re.sub(r"^```json\s*", "", txt, flags=re.IGNORECASE)
            txt = re.sub(r"^```\s*", "", txt)
            txt = re.sub(r"\s*```$", "", txt)
            return txt.strip()

        # Clean markdown fences and explanatory text from response (works for all providers)
        parsed = None
        try:
            raw = response.strip()
            raw = clean_json_response(raw)  # Clean LLM formatting artifacts

            parsed = json.loads(raw)
            summary_data = parsed
        except Exception as e:
            # If JSON parsing fails, try to extract any readable text
            logger.warning(
                f"Failed to parse JSON from campaign summary, falling back to text extraction: {e}"
            )
            logger.warning(f"Raw response (first 1000 chars): {response[:1000]}")

            # Try to clean the response more aggressively
            cleaned = clean_json_response(response)

            # If it looks like JSON but has syntax errors, try to fix common issues
            if cleaned.startswith("{") or cleaned.startswith("["):
                # Try removing any leading characters before the opening brace
                cleaned = re.sub(r"^[^{]*({.*})[^}]*$", r"\1", cleaned, flags=re.DOTALL)
                try:
                    summary_data = json.loads(cleaned)
                except:
                    # Still can't parse, create minimal response
                    summary_data = {
                        "overview": "Campaign summary could not be parsed. Please refresh.",
                        "setting_summary": "",
                        "characters_summary": "",
                        "plot_summary": "",
                        "tone_summary": "",
                    }
            else:
                # Not JSON-like at all, return error message
                summary_data = {
                    "overview": "Campaign summary generation failed. Please try refreshing.",
                    "setting_summary": "",
                    "characters_summary": "",
                    "plot_summary": "",
                    "tone_summary": "",
                }

        return summary_data

    except Exception as e:
        logger.error(f"Error summarizing campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize campaign: {str(e)}")


# =============================================================================
# Chunked Summary Pipeline Endpoints
# =============================================================================


def _clean_json_response(text: str) -> str:
    """Remove markdown code fences, explanatory text, and extract JSON from LLM responses."""
    if not text:
        return text
    txt = text.strip()

    # Remove common LLM prefixes
    txt = re.sub(
        r"^.*?(?:here is|here\'s).*?(?:json|summary|facts).*?:?\s*",
        "",
        txt,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # If the whole response is a fenced code block, extract its contents
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", txt, flags=re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Remove any leading/trailing code fences
    txt = re.sub(r"^```json\s*", "", txt, flags=re.IGNORECASE)
    txt = re.sub(r"^```\s*", "", txt)
    txt = re.sub(r"\s*```$", "", txt)
    return txt.strip()


def _get_content_id(item: Dict[str, Any], content_type: str) -> str:
    """Extract the ID from a content item based on its type."""
    # Most content types use 'id' field
    if "id" in item:
        return str(item["id"])
    # Some might use title or name as identifier
    if "title" in item:
        return str(item["title"])
    if "name" in item:
        return str(item["name"])
    # Fallback to text for rumors
    if "text" in item:
        return str(item["text"][:50])
    return "unknown"


def _format_items_for_extraction(items: List[Dict[str, Any]], content_type: str) -> str:
    """Format items into a string for extraction prompt."""
    formatted_items = []
    for item in items:
        content_id = _get_content_id(item, content_type)
        # Create a compact representation of the item
        item_str = f"[ID: {content_id}]\n"
        for key, value in item.items():
            if value is not None and key != "id":
                # Truncate long values
                str_value = str(value)
                if len(str_value) > 500:
                    str_value = str_value[:500] + "..."
                item_str += f"  {key}: {str_value}\n"
        formatted_items.append(item_str)
    return "\n".join(formatted_items)


@router.post("/extract-facts", response_model=ExtractFactsResponse)
async def extract_facts(request: ExtractFactsRequest):
    """
    Extract facts from a batch of content items.
    Uses anti-hallucination prompts to ensure only explicit facts are extracted.
    """
    try:
        # Use provider from request config (passed from Go backend) or fall back to settings
        provider = _get_provider_from_config(request.provider_config)
        provider_name = request.provider_config.provider if request.provider_config else None

        content_type = request.content_type
        items = request.items

        if not items:
            return ExtractFactsResponse(content_type=content_type, results=[])

        # Get the extraction prompt for this content type
        extraction_prompt = EXTRACTION_PROMPTS.get(
            content_type,
            f"Extract ONLY explicit facts from these {content_type} items. Do NOT infer or add any information.",
        )

        # Format items for the prompt
        items_text = _format_items_for_extraction(items, content_type)

        prompt = f"""{extraction_prompt}

Content to extract facts from:
{items_text}

Return a JSON array with this structure:
[{{"content_id": "...", "facts": ["fact1", "fact2", ...]}}]

Extract facts for each item. Be concise but accurate."""

        # Use low temperature for deterministic extraction
        response = await provider.generate(
            EXTRACTION_SYSTEM_PROMPT, prompt, max_tokens=_provider_max_tokens(provider_name), temperature=0.1, json_mode=True
        )

        # Parse the response
        raw = _clean_json_response(response)

        # Build a map of our own IDs for the items (we trust these, not the LLM's returned IDs)
        item_ids = [str(_get_content_id(item, content_type)) for item in items]

        try:
            parsed = json.loads(raw)
            results = []

            # Extract all facts from the response
            parsed_results = []
            if isinstance(parsed, list):
                for r in parsed:
                    if isinstance(r, dict):
                        content_id = str(r.get("content_id", "unknown"))
                        facts_raw = r.get("facts", [])
                        if isinstance(facts_raw, list):
                            facts = [str(f) for f in facts_raw if f is not None]
                        else:
                            facts = []
                        parsed_results.append({"content_id": content_id, "facts": facts})
            elif isinstance(parsed, dict):
                content_id = str(parsed.get("content_id", "unknown"))
                facts_raw = parsed.get("facts", [])
                if isinstance(facts_raw, list):
                    facts = [str(f) for f in facts_raw if f is not None]
                else:
                    facts = []
                parsed_results.append({"content_id": content_id, "facts": facts})

            # Match results back to original items
            # Strategy: First try exact ID match, then use positional match if IDs don't match
            used_indices = set()
            for item_id in item_ids:
                # Try to find exact match
                matched = False
                for i, pr in enumerate(parsed_results):
                    if i not in used_indices and pr["content_id"] == item_id:
                        results.append(FactResult(content_id=item_id, facts=pr["facts"]))
                        used_indices.add(i)
                        matched = True
                        break

                if not matched:
                    # No exact match - try positional match (if same number of results)
                    idx = len(results)
                    if idx < len(parsed_results) and idx not in used_indices:
                        # Use our ID, but the LLM's facts
                        results.append(FactResult(content_id=item_id, facts=parsed_results[idx]["facts"]))
                        used_indices.add(idx)
                    else:
                        # No match at all, return empty facts for this item
                        results.append(FactResult(content_id=item_id, facts=[]))

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse facts JSON: {e}. Raw: {raw[:500]}")
            # Return empty facts for each item
            results = [FactResult(content_id=item_id, facts=[]) for item_id in item_ids]

        return ExtractFactsResponse(content_type=content_type, results=results)

    except Exception as e:
        logger.error(f"Error extracting facts: {e}")
        # Return empty facts instead of raising an error - more graceful degradation
        item_ids = [str(_get_content_id(item, request.content_type)) for item in request.items]
        results = [FactResult(content_id=item_id, facts=[]) for item_id in item_ids]
        return ExtractFactsResponse(content_type=request.content_type, results=results)


@router.post("/synthesize-section", response_model=SynthesizeSectionResponse)
async def synthesize_section(request: SynthesizeSectionRequest):
    """
    Synthesize a summary section from extracted facts.
    Uses anti-hallucination prompts to ensure only provided facts are used.
    """
    try:
        # Use provider from request config (passed from Go backend) or fall back to settings
        provider = _get_provider_from_config(request.provider_config)
        provider_name = request.provider_config.provider if request.provider_config else None

        section = request.section
        metadata = request.campaign_metadata
        facts_by_type = request.facts_by_type

        # Get the synthesis prompt for this section
        synthesis_prompt = SYNTHESIS_PROMPTS.get(
            section, f"Generate a 2-3 sentence {section} summary using ONLY the facts provided."
        )

        # Build the facts context (handle None values gracefully)
        facts_context = ""
        total_facts = 0
        for content_type, facts in facts_by_type.items():
            if facts:  # This handles both None and empty lists
                facts_context += f"\n{content_type.upper()} FACTS:\n"
                for fact in facts:
                    facts_context += f"- {fact}\n"
                    total_facts += 1

        # If no facts available, return a helpful placeholder instead of asking AI
        if total_facts == 0:
            no_content_messages = {
                "overview": "Add content to your campaign to generate an overview. Create NPCs, locations, quests, or import session notes to get started.",
                "setting": "No locations or world-building content yet. Add locations, lore, or session notes to generate a setting summary.",
                "characters": "No characters or NPCs in this campaign yet. Create NPCs or import player characters to generate a characters summary.",
                "plot": "No quests or story content yet. Add quests, session notes, or campaign content to generate a plot summary.",
                "tone": "Add content to your campaign to determine its tone. The more content you add, the better the tone summary will be.",
            }
            return SynthesizeSectionResponse(
                section=section,
                summary=no_content_messages.get(section, "Add content to your campaign to generate this summary.")
            )

        # Build the prompt
        prompt = f"""Campaign Metadata:
- Name: {metadata.get('name', 'Unknown Campaign')}
- Game System: {metadata.get('game_system', 'Unknown')}
- Theme: {metadata.get('theme', 'Not specified')}
- Tone: {metadata.get('tone', 'Not specified')}
- Magic Level: {metadata.get('magic_level', 'Not specified')}

AVAILABLE FACTS (use ONLY these):
{facts_context}

{synthesis_prompt}

Write the {section} summary:"""

        # Use moderate temperature for readable but grounded output
        response = await provider.generate(
            SYNTHESIS_SYSTEM_PROMPT, prompt, max_tokens=_provider_max_tokens(provider_name), temperature=0.5
        )

        summary = response.strip()

        # Clean up any markdown formatting
        summary = re.sub(r"^#+\s*", "", summary)  # Remove markdown headers
        summary = re.sub(r"\*\*(.+?)\*\*", r"\1", summary)  # Remove bold

        # Remove standalone title lines that the AI tends to add (e.g., "Campaign Overview", "Setting Summary")
        # Only remove lines that are JUST a title (followed by newline), not titles embedded in sentences
        campaign_name = metadata.get('name', '')
        title_patterns = [
            # Standalone title lines (must be followed by newline)
            r"^(Campaign\s+)?Overview\s*\n+",
            r"^Setting\s+Summary\s*\n+",
            r"^Characters?\s+Summary\s*\n+",
            r"^Plot\s+Summary\s*\n+",
            r"^Tone\s+Summary\s*\n+",
            # Campaign name followed by colon/dash and "Summary/Overview" on its own line
            rf"^{re.escape(campaign_name)}\s*[:\-–]+\s*(Campaign\s+)?(Overview|Summary|Characters?\s+Summary|Setting\s+Summary|Plot\s+Summary|Tone\s+Summary)\s*\n+",
            # Generic "Title: Summary" or "Title – Summary" standalone lines
            r"^[A-Z][^:\n]{0,40}[:\-–]\s*(Campaign\s+)?(Overview|Summary)\s*\n+",
        ]
        for pattern in title_patterns:
            summary = re.sub(pattern, "", summary, flags=re.IGNORECASE)

        summary = summary.strip()

        return SynthesizeSectionResponse(section=section, summary=summary)

    except Exception as e:
        logger.error(f"Error synthesizing section: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to synthesize section: {str(e)}")
