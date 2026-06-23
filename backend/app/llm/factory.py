from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.llm.base import BaseLLMProvider


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Factory that returns the configured LLM provider singleton.
    Switching providers requires only changing LLM_PROVIDER in .env.
    """
    # Detect if we should use MockLLMProvider (no valid API keys)
    is_mock = False
    if settings.llm_provider == "gemini":
        if not settings.google_api_key or "your-key-here" in settings.google_api_key or settings.google_api_key.startswith("mock") or settings.google_api_key == "":
            is_mock = True
    else:
        if not settings.openai_api_key or "your-key-here" in settings.openai_api_key or settings.openai_api_key.startswith("mock") or settings.openai_api_key == "" or settings.openai_api_key.startswith("sk-..."):
            is_mock = True

    if is_mock:
        from app.llm.mock_provider import MockLLMProvider
        return MockLLMProvider()

    if settings.llm_provider == "gemini":
        from app.llm.gemini_provider import GeminiProvider
        return GeminiProvider()

    from app.llm.openai_provider import OpenAIProvider
    return OpenAIProvider()
