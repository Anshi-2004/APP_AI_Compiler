from __future__ import annotations

from typing import List, Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.
    All fields are strictly typed — no silent fallbacks for secrets.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────
    app_name: str = "CompilerAI"
    app_env: Literal["development", "staging", "production"] = "development"
    app_version: str = "0.1.0"
    debug: bool = True

    # ── API ────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000"]

    # ── Database ───────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/compiler_ai"
    )

    # ── LLM ────────────────────────────────────────────────
    llm_provider: Literal["openai", "gemini"] = "openai"
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4096

    openai_api_key: str = ""
    google_api_key: str = ""

    # ── Pipeline ───────────────────────────────────────────
    pipeline_timeout_seconds: int = 120
    max_repair_iterations: int = 3
    strict_mode: bool = False


# Singleton — import this everywhere
settings = Settings()
