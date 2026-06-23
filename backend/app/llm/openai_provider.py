from __future__ import annotations

from typing import Type, TypeVar

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.llm.base import BaseLLMProvider

T = TypeVar("T", bound=BaseModel)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI GPT-4o implementation using LangChain's structured output.
    Uses `with_structured_output` for deterministic Pydantic parsing.
    """

    def __init__(self) -> None:
        self._llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            api_key=settings.openai_api_key,
        )

    @property
    def model_name(self) -> str:
        return settings.llm_model

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
        """
        Calls GPT-4o with structured output mode.
        LangChain uses OpenAI's native JSON schema enforcement.
        """
        system = system_prompt or (
            "You are a precise software architect AI. "
            "Always respond with valid, complete structured data. "
            "Never omit required fields."
        )

        chat_prompt = ChatPromptTemplate.from_messages(
            [("system", system), ("human", "{input}")]
        )
        chain = chat_prompt | self._llm.with_structured_output(
            output_schema, method="json_schema"
        )

        result: T = await chain.ainvoke({"input": prompt})
        return result

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> str:
        system = system_prompt or "You are a helpful AI assistant."
        chat_prompt = ChatPromptTemplate.from_messages(
            [("system", system), ("human", "{input}")]
        )
        chain = chat_prompt | self._llm
        result = await chain.ainvoke({"input": prompt})
        return str(result.content)
