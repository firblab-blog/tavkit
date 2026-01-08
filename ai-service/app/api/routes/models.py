"""Model management endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import os

from app.config import settings


router = APIRouter()


class ModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
    provider: str  # ollama, openai, anthropic


class ModelListResponse(BaseModel):
    models: List[ModelInfo]
    current_model: str
    provider: str


class AISettings(BaseModel):
    """AI generation settings"""

    temperature: float
    max_tokens: int
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    num_ctx: Optional[int] = None


class AISettingsResponse(BaseModel):
    """Current AI settings"""

    provider: str
    model: str
    settings: AISettings


@router.get("/available", response_model=ModelListResponse)
async def list_available_models():
    """List all available AI models based on current provider"""

    provider = settings.AI_PROVIDER
    models = []
    current_model = ""

    if provider == "ollama":
        # Fetch available Ollama models
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=10.0)

                if response.status_code == 200:
                    data = response.json()
                    for model in data.get("models", []):
                        models.append(
                            ModelInfo(
                                name=model.get("name"),
                                size=model.get("size"),
                                modified_at=model.get("modified_at"),
                                provider="ollama",
                            )
                        )
                    current_model = settings.OLLAMA_MODEL
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to fetch Ollama models: {response.status_code}",
                    )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to Ollama: {str(e)}")

    elif provider == "openai":
        # Predefined OpenAI models
        openai_models = [
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ]
        models = [ModelInfo(name=m, provider="openai") for m in openai_models]
        current_model = settings.OPENAI_MODEL

    elif provider == "anthropic":
        # Predefined Anthropic models
        anthropic_models = [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ]
        models = [ModelInfo(name=m, provider="anthropic") for m in anthropic_models]
        current_model = settings.ANTHROPIC_MODEL

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider: {provider}")

    return ModelListResponse(models=models, current_model=current_model, provider=provider)


class SetModelRequest(BaseModel):
    model_name: str


@router.post("/set")
async def set_active_model(request: SetModelRequest):
    """Set the active AI model (updates environment variable for current session)"""

    provider = settings.AI_PROVIDER

    # Update the appropriate setting
    if provider == "ollama":
        os.environ["OLLAMA_MODEL"] = request.model_name
        settings.OLLAMA_MODEL = request.model_name
    elif provider == "openai":
        os.environ["OPENAI_MODEL"] = request.model_name
        settings.OPENAI_MODEL = request.model_name
    elif provider == "anthropic":
        os.environ["ANTHROPIC_MODEL"] = request.model_name
        settings.ANTHROPIC_MODEL = request.model_name
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider: {provider}")

    return {
        "success": True,
        "model": request.model_name,
        "provider": provider,
        "message": f"Active model set to {request.model_name}. Note: This change is temporary and will reset on service restart. Update .env file for persistence.",
    }


@router.get("/settings", response_model=AISettingsResponse)
async def get_ai_settings():
    """Get current AI generation settings"""

    provider = settings.AI_PROVIDER

    if provider == "ollama":
        return AISettingsResponse(
            provider=provider,
            model=settings.OLLAMA_MODEL,
            settings=AISettings(
                temperature=settings.OLLAMA_TEMPERATURE,
                max_tokens=settings.OLLAMA_MAX_TOKENS,
                top_p=settings.OLLAMA_TOP_P,
                top_k=settings.OLLAMA_TOP_K,
                num_ctx=settings.OLLAMA_NUM_CTX,
            ),
        )
    elif provider == "openai":
        return AISettingsResponse(
            provider=provider,
            model=settings.OPENAI_MODEL,
            settings=AISettings(
                temperature=settings.OPENAI_TEMPERATURE,
                max_tokens=settings.OPENAI_MAX_TOKENS,
                top_p=settings.OPENAI_TOP_P,
            ),
        )
    elif provider == "anthropic":
        return AISettingsResponse(
            provider=provider,
            model=settings.ANTHROPIC_MODEL,
            settings=AISettings(
                temperature=settings.ANTHROPIC_TEMPERATURE,
                max_tokens=settings.ANTHROPIC_MAX_TOKENS,
                top_p=settings.ANTHROPIC_TOP_P,
            ),
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider: {provider}")


class UpdateAISettingsRequest(BaseModel):
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    num_ctx: Optional[int] = None


@router.post("/settings")
async def update_ai_settings(request: UpdateAISettingsRequest):
    """Update AI generation settings (session only)"""

    provider = settings.AI_PROVIDER
    updated = {}

    if provider == "ollama":
        if request.temperature is not None:
            os.environ["OLLAMA_TEMPERATURE"] = str(request.temperature)
            settings.OLLAMA_TEMPERATURE = request.temperature
            updated["temperature"] = request.temperature
        if request.max_tokens is not None:
            os.environ["OLLAMA_MAX_TOKENS"] = str(request.max_tokens)
            settings.OLLAMA_MAX_TOKENS = request.max_tokens
            updated["max_tokens"] = request.max_tokens
        if request.top_p is not None:
            os.environ["OLLAMA_TOP_P"] = str(request.top_p)
            settings.OLLAMA_TOP_P = request.top_p
            updated["top_p"] = request.top_p
        if request.top_k is not None:
            os.environ["OLLAMA_TOP_K"] = str(request.top_k)
            settings.OLLAMA_TOP_K = request.top_k
            updated["top_k"] = request.top_k
        if request.num_ctx is not None:
            os.environ["OLLAMA_NUM_CTX"] = str(request.num_ctx)
            settings.OLLAMA_NUM_CTX = request.num_ctx
            updated["num_ctx"] = request.num_ctx

    elif provider == "openai":
        if request.temperature is not None:
            os.environ["OPENAI_TEMPERATURE"] = str(request.temperature)
            settings.OPENAI_TEMPERATURE = request.temperature
            updated["temperature"] = request.temperature
        if request.max_tokens is not None:
            os.environ["OPENAI_MAX_TOKENS"] = str(request.max_tokens)
            settings.OPENAI_MAX_TOKENS = request.max_tokens
            updated["max_tokens"] = request.max_tokens
        if request.top_p is not None:
            os.environ["OPENAI_TOP_P"] = str(request.top_p)
            settings.OPENAI_TOP_P = request.top_p
            updated["top_p"] = request.top_p

    elif provider == "anthropic":
        if request.temperature is not None:
            os.environ["ANTHROPIC_TEMPERATURE"] = str(request.temperature)
            settings.ANTHROPIC_TEMPERATURE = request.temperature
            updated["temperature"] = request.temperature
        if request.max_tokens is not None:
            os.environ["ANTHROPIC_MAX_TOKENS"] = str(request.max_tokens)
            settings.ANTHROPIC_MAX_TOKENS = request.max_tokens
            updated["max_tokens"] = request.max_tokens
        if request.top_p is not None:
            os.environ["ANTHROPIC_TOP_P"] = str(request.top_p)
            settings.ANTHROPIC_TOP_P = request.top_p
            updated["top_p"] = request.top_p

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider: {provider}")

    return {
        "success": True,
        "provider": provider,
        "updated": updated,
        "message": "Settings updated (session only - restart required for persistence)",
    }
