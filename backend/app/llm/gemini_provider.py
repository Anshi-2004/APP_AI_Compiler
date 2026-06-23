from __future__ import annotations

from typing import Type, TypeVar

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.llm.base import BaseLLMProvider

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini 1.5 Pro implementation using LangChain structured output.
    Falls back automatically when LLM_PROVIDER=gemini in .env.
    """

    def __init__(self) -> None:
        self._llm = ChatGoogleGenerativeAI(
            model=settings.llm_model if "gemini" in settings.llm_model else "gemini-1.5-pro",
            temperature=settings.llm_temperature,
            max_output_tokens=settings.llm_max_tokens,
            google_api_key=settings.google_api_key,
        )

    @property
    def model_name(self) -> str:
        return "gemini-1.5-pro"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def structured_output(
        self,
        prompt: str,
        output_schema: Type[T],
        system_prompt: str | None = None,
    ) -> T:
        system = system_prompt or (
            "You are a precise software architect AI. "
            "Always respond with valid, complete structured data. "
            "Never omit required fields."
        )
        chat_prompt = ChatPromptTemplate.from_messages(
            [("system", system), ("human", "{input}")]
        )
        chain = chat_prompt | self._llm.with_structured_output(output_schema)
        result: T = await chain.ainvoke({"input": prompt})
        return result

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        system = system_prompt or "You are a helpful AI assistant."
        chat_prompt = ChatPromptTemplate.from_messages(
            [("system", system), ("human", "{input}")]
        )
        chain = chat_prompt | self._llm
        result = await chain.ainvoke({"input": prompt})
        return str(result.content)
