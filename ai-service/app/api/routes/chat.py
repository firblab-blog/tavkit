"""
Session Chat API Routes

Provides endpoints for the Session Chat feature that allows users to
ask questions about campaign settings with RAG-enhanced context.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.providers import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class SessionChatRequest(BaseModel):
    """Request for session chat."""
    message: str = Field(..., description="User's message/question")
    campaign_id: str = Field(..., description="Campaign ID for context")
    campaign_name: Optional[str] = Field(None, description="Campaign name")
    campaign_system: Optional[str] = Field(None, description="Game system (e.g., 'D&D 5e')")
    campaign_theme: Optional[str] = Field(None, description="Campaign theme")
    campaign_tone: Optional[str] = Field(None, description="Campaign tone")
    setting_slug: Optional[str] = Field(None, description="Setting pack slug (e.g., 'eberron')")
    chat_history: Optional[list[ChatMessage]] = Field(
        default_factory=list,
        description="Previous messages in the conversation"
    )
    max_context_chunks: int = Field(5, ge=1, le=10, description="Max RAG chunks to include")


class RAGSource(BaseModel):
    """A source from RAG context."""
    page_title: str
    source_url: Optional[str] = None
    similarity: float


class SessionChatResponse(BaseModel):
    """Response from session chat."""
    response: str = Field(..., description="AI assistant's response")
    rag_sources: list[RAGSource] = Field(default_factory=list, description="Sources used")


# System prompt template for session chat
CHAT_SYSTEM_PROMPT = """You are a knowledgeable tabletop RPG game master assistant helping during a live session.

{campaign_section}

{setting_section}

## Your Role
- Answer questions about the campaign setting, lore, NPCs, locations, and rules
- Provide quick reference information for the GM during sessions
- Be concise but thorough - sessions move fast
- If you're not sure about something, say so rather than making things up
- When citing specific lore, mention where it comes from if you know

## Response Style
- Keep responses focused and actionable
- Use bullet points for lists
- Bold important names and terms
- If asked about mechanics, explain simply
"""


async def get_rag_context(query: str, setting_slug: str, max_chunks: int = 5) -> tuple[str, list[RAGSource]]:
    """
    Get RAG context from the wiki knowledge base.

    Returns a tuple of (context_text, sources).
    """
    # Import here to avoid circular imports
    try:
        from app.wiki_rag.rag_service import RAGService

        rag_service = RAGService()
        results = await rag_service.search_setting_knowledge(
            setting_slug=setting_slug,
            query=query,
            limit=max_chunks
        )

        if not results:
            return "", []

        # Build context text and sources
        context_parts = []
        sources = []

        for result in results:
            context_parts.append(f"### {result.get('page_title', 'Unknown')}\n{result.get('content', '')}")
            sources.append(RAGSource(
                page_title=result.get('page_title', 'Unknown'),
                source_url=result.get('source_url'),
                similarity=result.get('similarity', 0.0)
            ))

        return "\n\n".join(context_parts), sources

    except Exception as e:
        logger.warning(f"Failed to get RAG context: {e}")
        return "", []


def build_system_prompt(
    campaign_name: Optional[str],
    campaign_system: Optional[str],
    campaign_theme: Optional[str],
    campaign_tone: Optional[str],
    setting_context: str,
    setting_name: str
) -> str:
    """Build the system prompt with campaign and setting context."""
    campaign_section = ""
    campaign_parts = []
    if campaign_name:
        campaign_parts.append(f"**Campaign:** {campaign_name}")
    if campaign_system:
        campaign_parts.append(f"**Game System:** {campaign_system}")
    if campaign_theme:
        campaign_parts.append(f"**Theme:** {campaign_theme}")
    if campaign_tone:
        campaign_parts.append(f"**Tone:** {campaign_tone}")

    if campaign_parts:
        campaign_section = f"""## Campaign Context
{chr(10).join(campaign_parts)}"""

    setting_section = ""
    if setting_context:
        setting_section = f"""## Setting Knowledge ({setting_name})
The following information is from the official {setting_name} wiki. Use this to answer questions accurately:

{setting_context}"""

    return CHAT_SYSTEM_PROMPT.format(
        campaign_section=campaign_section,
        setting_section=setting_section
    )


def build_conversation_prompt(
    conversation_history: list[ChatMessage],
    current_message: str
) -> str:
    """Build a prompt string that includes conversation history."""
    prompt_parts = []

    # Add conversation history (last 10 messages to keep context manageable)
    if conversation_history:
        prompt_parts.append("## Previous Conversation")
        for msg in conversation_history[-10:]:
            role_label = "User" if msg.role == "user" else "Assistant"
            prompt_parts.append(f"{role_label}: {msg.content}")
        prompt_parts.append("")  # Empty line before current message

    # Add current user message
    prompt_parts.append(f"User: {current_message}")
    prompt_parts.append("")
    prompt_parts.append("Assistant:")

    return "\n".join(prompt_parts)


@router.post("/session", response_model=SessionChatResponse)
async def session_chat(request: SessionChatRequest) -> SessionChatResponse:
    """
    Generate a chat response with RAG context from campaign settings.

    Flow:
    1. Get RAG context for the user message (if setting is specified)
    2. Build system prompt with campaign context + RAG knowledge
    3. Generate response using configured AI provider
    4. Return response with source citations
    """
    logger.info(f"Session chat request for campaign {request.campaign_id}")

    # Get RAG context if a setting is specified
    rag_context = ""
    rag_sources: list[RAGSource] = []
    setting_name = "General"

    if request.setting_slug:
        setting_name = request.setting_slug.replace("-", " ").title()
        rag_context, rag_sources = await get_rag_context(
            query=request.message,
            setting_slug=request.setting_slug,
            max_chunks=request.max_context_chunks
        )
        logger.info(f"Retrieved {len(rag_sources)} RAG sources for setting {request.setting_slug}")

    # Build system prompt with campaign info
    system_prompt = build_system_prompt(
        campaign_name=request.campaign_name,
        campaign_system=request.campaign_system,
        campaign_theme=request.campaign_theme,
        campaign_tone=request.campaign_tone,
        setting_context=rag_context,
        setting_name=setting_name
    )

    # Build conversation prompt with history
    conversation_prompt = build_conversation_prompt(
        conversation_history=request.chat_history or [],
        current_message=request.message
    )

    # Get AI provider and generate response
    try:
        provider = get_provider()

        response = await provider.generate(
            prompt=conversation_prompt,
            system_prompt=system_prompt,
            max_tokens=1000,
            temperature=0.7
        )

        return SessionChatResponse(
            response=response,
            rag_sources=rag_sources
        )

    except Exception as e:
        logger.error(f"Failed to generate chat response: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.get("/health")
async def chat_health():
    """Health check for chat service."""
    return {"status": "healthy", "service": "session-chat"}
