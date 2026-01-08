"""
Tavkit AI Service - FastAPI Application
Handles AI-powered content generation for D&D sessions
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.api.routes import health, generate, models, summarize, rag, chat


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    print(f"[STARTUP] Tavkit AI Service v{settings.VERSION}")
    print(f"[STARTUP] Environment: {settings.ENVIRONMENT}")
    print(f"[STARTUP] AI Provider: {settings.AI_PROVIDER}")
    yield
    # Shutdown
    print("[SHUTDOWN] Tavkit AI Service")


# Create FastAPI application
app = FastAPI(
    title="Tavkit AI Service",
    description="AI-powered content generation for D&D Game Masters",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(generate.router, prefix="/api/v1/generate", tags=["Generation"])
app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
app.include_router(summarize.router, prefix="/api/v1/summarize", tags=["Summarization"])
app.include_router(rag.router, prefix="/api/v1", tags=["RAG"])  # Wiki RAG system
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])  # Session Chat


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Tavkit AI Service",
        "version": settings.VERSION,
        "status": "running",
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
