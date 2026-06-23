from __future__ import annotations

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import DbSession, Logger
from app.core.exceptions import not_found
from app.models.pipeline_run import PipelineRun

router = APIRouter(prefix="/logs", tags=["Pipeline Logs"])


@router.get(
    "",
    summary="List all pipeline runs in the database",
)
async def list_runs(db: DbSession) -> dict:
    stmt = select(PipelineRun).order_by(PipelineRun.created_at.desc())
    result = await db.execute(stmt)
    runs = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "run_id": str(run.id),
                "prompt": run.prompt,
                "status": run.status,
                "created_at": run.created_at.isoformat(),
                "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            }
            for run in runs
        ]
    }


@router.get(
    "/{run_id}",
    summary="Get all stage logs for a pipeline run",
)
async def get_run_logs(run_id: str, db: DbSession, logger: Logger) -> dict:
    rid = uuid.UUID(run_id)
    run = await logger.get_run(rid)
    if not run:
        raise not_found(f"Run '{run_id}' not found")

    logs = await logger.get_run_logs(rid)
    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "prompt": run.prompt,
            "status": run.status,
            "created_at": run.created_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "logs": [
                {
                    "id": str(log.id),
                    "stage": log.stage,
                    "status": log.status,
                    "execution_ms": log.execution_ms,
                    "warnings": log.warnings or [],
                    "error_message": log.error_message,
                    "input_data": log.input_data,
                    "output_data": log.output_data,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
        },
    }


@router.get(
    "/{run_id}/{stage}",
    summary="Get the log for a specific stage of a pipeline run",
)
async def get_stage_log(run_id: str, stage: str, db: DbSession, logger: Logger) -> dict:
    rid = uuid.UUID(run_id)
    log = await logger.get_stage_log(rid, stage)  # type: ignore[arg-type]
    if not log:
        raise not_found(f"No log found for run '{run_id}' stage '{stage}'")

    return {
        "success": True,
        "data": {
            "id": str(log.id),
            "run_id": run_id,
            "stage": log.stage,
            "status": log.status,
            "execution_ms": log.execution_ms,
            "warnings": log.warnings or [],
            "error_message": log.error_message,
            "input_data": log.input_data,
            "output_data": log.output_data,
            "created_at": log.created_at.isoformat(),
        },
    }

