from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm.base import BaseLLMProvider
from app.llm.factory import get_llm_provider
from app.core.logging_service import LoggingService


# ── Database session ───────────────────────────────────────────────────────────

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── LLM provider ───────────────────────────────────────────────────────────────

def get_llm() -> BaseLLMProvider:
    """Inject the configured LLM provider (singleton)."""
    return get_llm_provider()


LLMProvider = Annotated[BaseLLMProvider, Depends(get_llm)]


# ── Logging service ────────────────────────────────────────────────────────────

def get_logger(db: DbSession) -> LoggingService:
    """Inject a LoggingService bound to the current DB session."""
    return LoggingService(db)


Logger = Annotated[LoggingService, Depends(get_logger)]
