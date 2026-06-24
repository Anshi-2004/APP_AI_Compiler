from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.api.v1 import api_router
from app.core.exceptions import CompilerBaseError


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup / shutdown.
    Creates DB tables on first run (Alembic handles production migrations).
    """
    # Import models so Base knows about them
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    await engine.dispose()


# ── App factory ────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    tags_metadata = [
        {
            "name": "Pipeline Orchestrator",
            "description": "Orchestrates compilation stages (Intent → Design → Schema → Validation → Repair → Runtime) with streaming Server-Sent Events (SSE).",
        },
        {
            "name": "Intent Extraction",
            "description": "Extracts modules, features, entities, roles, and business rules from natural language prompts into a structured schema.",
        },
        {
            "name": "System Design",
            "description": "Generates system architecture topology, technology stack choice, responsibilities, and connections.",
        },
        {
            "name": "Schema Generation",
            "description": "Generates UI layouts, REST APIs, database schemas, auth strategies, and business rule implementations.",
        },
        {
            "name": "Validation",
            "description": "Performs multi-layer structural validation and constraint checks (UI/API/DB/Cross-layer/Logical logic checks).",
        },
        {
            "name": "Repair Engine",
            "description": "Self-heals compilation and validation warnings/errors using targeted LLM updates.",
        },
        {
            "name": "Runtime Engine",
            "description": "Prepares and bundles executable file configurations, and checks imports, imports resolution, and builds.",
        },
        {
            "name": "Pipeline Evaluation Framework",
            "description": "Benchmarks quality, latency, token costs, and auto-repair statistics across product prompts and edge-cases.",
        },
    ]

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "AI-powered Software Compiler — converts natural language prompts into "
            "validated, executable application configurations via a deterministic pipeline."
        ),
        openapi_tags=tags_metadata,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ───────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global exception handlers ──────────────────────────────────────────────
    @app.exception_handler(CompilerBaseError)
    async def compiler_error_handler(
        request: Request, exc: CompilerBaseError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "code": exc.code,
                "message": exc.message,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "code": "INTERNAL_ERROR",
                "message": str(exc) if settings.debug else "An internal error occurred",
            },
        )

    # ── Routes ─────────────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.api_prefix)

    # ── Health check ───────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health() -> dict:
        return {
            "status": "ok",
            "app": settings.app_name,
            "version": settings.app_version,
            "env": settings.app_env,
            "llm_provider": settings.llm_provider,
            "model": settings.llm_model,
        }

    @app.get("/", tags=["Health"])
    async def root() -> dict:
        return {
            "message": f"{settings.app_name} API",
            "docs": "/docs",
            "version": settings.app_version,
        }

    return app


app = create_app()
