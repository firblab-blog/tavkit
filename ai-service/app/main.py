"""
Tavkit AI Service - FastAPI Application
Minimal AI service for Campaign Summary, Wiki RAG, and Session Chat
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.api.routes import health, summarize, rag, chat

# Configure logging for our modules
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Set log level for wiki_rag modules specifically
for module in ["app.wiki_rag.scraper", "app.wiki_rag.mediawiki_api", "app.wiki_rag.rag_service"]:
    logging.getLogger(module).setLevel(logging.INFO)


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
    description="Minimal AI service for Tavkit - Campaign Summary, Wiki RAG, and Session Chat",
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

# Include routers - only the essential routes
app.include_router(health.router, prefix="/health", tags=["Health"])
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
