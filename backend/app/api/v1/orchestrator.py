from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel, Field

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import internal_error
from app.schemas.common import ApiResponse
from app.services.orchestrator import Orchestrator, PipelineRunResult

router = APIRouter(prefix="/pipeline", tags=["Pipeline Orchestrator"])


class PipelineRunRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=10,
        max_length=4000,
        description="Natural language description of the application to build",
        examples=["Build an e-commerce platform with Stripe payments, product management, and an admin dashboard"],
    )


@router.post(
    "/run",
    summary="Run the full compiler pipeline",
    description=(
        "Executes the complete AI compiler pipeline: "
        "Intent → Design → Schema → Validation → Repair → Runtime. "
        "Returns stage-wise outputs and timings for every stage. "
        "Partial results are returned even if a stage fails."
    ),
)
async def run_pipeline(
    body: PipelineRunRequest,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> dict:
    try:
        orchestrator = Orchestrator(llm=llm, logger=logger, db=db)
        result: PipelineRunResult = await orchestrator.run(body.prompt)

        # Serialize — dataclass → dict, Pydantic models → dict
        return {
            "success": True,
            "data": {
                "run_id": result.run_id,
                "prompt": result.prompt,
                "status": result.status,
                "created_at": result.created_at.isoformat(),
                "completed_at": result.completed_at.isoformat(),
                "total_ms": result.total_ms,
                "stages": {
                    name: {
                        "stage": s.stage,
                        "status": s.status,
                        "execution_ms": s.execution_ms,
                        "error": s.error,
                    }
                    for name, s in result.stages.items()
                },
                "outputs": {
                    "intent": result.intent.model_dump() if result.intent else None,
                    "design": result.design.model_dump() if result.design else None,
                    "schemas": result.schemas.model_dump() if result.schemas else None,
                    "validation": result.validation.model_dump() if result.validation else None,
                    "repair": result.repair.model_dump() if result.repair else None,
                    "runtime": result.runtime.model_dump() if result.runtime else None,
                },
            },
        }
    except Exception as exc:
        raise internal_error(str(exc))


@router.post(
    "/run-stream",
    summary="Run the full compiler pipeline with streaming logs",
    description="Streams stage-wise events as the compiler executes.",
)
async def run_pipeline_stream(
    body: PipelineRunRequest,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
):
    try:
        orchestrator = Orchestrator(llm=llm, logger=logger, db=db)

        async def event_generator():
            async for event in orchestrator.run_stream(body.prompt):
                yield f"data: {json.dumps(event)}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as exc:
        raise internal_error(str(exc))


@router.get(
    "/run/{run_id}",
    summary="Get status of a previous pipeline run",
)
async def get_run_status(
    run_id: str,
    db: DbSession,
    logger: Logger,
) -> dict:
    run = await logger.get_run(__import__("uuid").UUID(run_id))
    if not run:
        from app.core.exceptions import not_found
        raise not_found(f"Run '{run_id}' not found")

    logs = await logger.get_run_logs(__import__("uuid").UUID(run_id))
    return {
        "success": True,
        "data": {
            "run_id": str(run.id),
            "prompt": run.prompt,
            "status": run.status,
            "created_at": run.created_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "stages": [
                {
                    "stage": log.stage,
                    "status": log.status,
                    "execution_ms": log.execution_ms,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
        },
    }
