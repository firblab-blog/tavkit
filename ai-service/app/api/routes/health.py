"""Health check endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.providers import get_provider


router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    version: str
    environment: str


class ReadinessResponse(BaseModel):
    """Readiness check response"""

    status: str
    ai_provider: str
    ai_provider_healthy: bool


@router.get("", response_model=HealthResponse)
async def health():
    """Basic health check"""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness():
    """Readiness check including AI provider"""
    provider = get_provider()

    try:
        is_healthy = await provider.health_check()

        if not is_healthy:
            raise HTTPException(status_code=503, detail="AI provider is not healthy")

        return ReadinessResponse(
            status="ready",
            ai_provider=settings.AI_PROVIDER,
            ai_provider_healthy=True,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI provider health check failed: {str(e)}")
