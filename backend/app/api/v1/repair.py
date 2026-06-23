from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import not_found
from app.services.repair_service import RepairService

router = APIRouter(prefix="/repair", tags=["Repair History"])


def _serialize_history(h) -> dict:
    return {
        "id": str(h.id),
        "run_id": str(h.run_id),
        "section": h.section,
        "error": h.error,
        "repair_reason": h.repair_reason,
        "original_json": h.original_json,
        "updated_json": h.updated_json,
        "repair_time_ms": h.repair_time_ms,
        "success": h.success,
        "error_count": h.error_count,
        "errors_fixed": h.errors_fixed,
        "created_at": h.created_at.isoformat(),
    }


@router.get(
    "/history",
    summary="Get all repair history records",
    description=(
        "Returns an ordered list of every repair action taken across all pipeline runs. "
        "Each record includes the original JSON, error, repair reason, updated JSON, "
        "timing, and success status."
    ),
)
async def get_repair_history(
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict:
    service = RepairService(llm=llm, logger=logger, db=db)
    records = await service.get_history(run_id=None, limit=limit, offset=offset)
    return {
        "success": True,
        "data": {
            "total": len(records),
            "limit": limit,
            "offset": offset,
            "records": [_serialize_history(r) for r in records],
        },
    }


@router.get(
    "/history/{run_id}",
    summary="Get all repair records for a specific pipeline run",
)
async def get_run_repair_history(
    run_id: str,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> dict:
    service = RepairService(llm=llm, logger=logger, db=db)

    # Validate run exists
    run = await logger.get_run(uuid.UUID(run_id))
    if not run:
        raise not_found(f"Run '{run_id}' not found")

    records = await service.get_history(run_id=uuid.UUID(run_id), limit=200)
    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "total": len(records),
            "sections_repaired": list({r.section for r in records if r.success}),
            "sections_failed": list({r.section for r in records if not r.success}),
            "total_errors_fixed": sum(r.errors_fixed for r in records),
            "records": [_serialize_history(r) for r in records],
        },
    }


@router.get(
    "/history/{run_id}/{section}",
    summary="Get repair record for a specific section of a run",
)
async def get_section_repair_history(
    run_id: str,
    section: str,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> dict:
    service = RepairService(llm=llm, logger=logger, db=db)
    records = await service.get_history(run_id=uuid.UUID(run_id), limit=200)
    section_records = [r for r in records if r.section == section]

    if not section_records:
        raise not_found(f"No repair records for run '{run_id}' section '{section}'")

    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "section": section,
            "records": [_serialize_history(r) for r in section_records],
        },
    }
