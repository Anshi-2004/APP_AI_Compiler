from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class EvaluationItemData(BaseModel):
    id: str
    run_id: str | None = None
    prompt_name: str
    prompt_type: str
    prompt_text: str
    status: str
    latency_ms: int
    validation_errors: int
    retries: int
    repair_success: bool
    execution_success: bool
    token_cost: float
    created_at: datetime


class EvaluationRunData(BaseModel):
    id: str
    name: str
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    total_runs: int
    success_rate: float
    avg_latency_ms: float
    total_token_cost: float
    items: list[EvaluationItemData] = Field(default_factory=list)


class EvaluationSummary(BaseModel):
    id: str
    name: str
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    total_runs: int
    success_rate: float
    avg_latency_ms: float
    total_token_cost: float


class EvaluationListResponse(BaseModel):
    success: bool
    data: list[EvaluationSummary]


class EvaluationDetailResponse(BaseModel):
    success: bool
    data: EvaluationRunData
