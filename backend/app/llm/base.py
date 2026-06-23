from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    All providers must implement `structured_output` and `complete`.
    Adding a new provider only requires subclassing this.
    """

    @abstractmethod
    async def structured_output(
        self,
        prompt: str,
        output_schema: Type[T],
        system_prompt: str | None = None,
    ) -> T:
        """
        Call the LLM and parse the response into a Pydantic model.

        Args:
            prompt: The user prompt.
            output_schema: The Pydantic model class to parse output into.
            system_prompt: Optional system-level instruction.

        Returns:
            A validated instance of output_schema.
        """
        ...

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> str:
        """
        Raw text completion (no structured parsing).
        Used for free-form generation in repair/runtime stages.
        """
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier string."""
        ...
