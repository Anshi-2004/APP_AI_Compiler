from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard envelope for all API responses."""

    success: bool = True
    data: T
    message: str | None = None
    error: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ApiError(BaseModel):
    """Standard error response body."""

    success: bool = False
    code: str
    message: str
    details: dict | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool


class StageStatus(str):
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


class RunId(BaseModel):
    run_id: uuid.UUID = Field(default_factory=uuid.uuid4)
