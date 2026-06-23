from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, status
from fastapi.responses import Response

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import not_found, internal_error
from app.schemas.evaluation import (
    EvaluationListResponse,
    EvaluationDetailResponse,
    EvaluationSummary,
    EvaluationRunData,
    EvaluationItemData,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["Pipeline Evaluation Framework"])


@router.post(
    "/run",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a full evaluation run benchmark suite in the background",
)
async def run_evaluation(
    background_tasks: BackgroundTasks,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> dict:
    try:
        from app.services.cache_service import cache_service
        cache_service.delete("evaluation_runs")
        
        service = EvaluationService(llm=llm, logger=logger, db=db)
        run_name = f"Evaluation Run #{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        run_model = await service.create_run(run_name)
        
        # Enqueue the background task
        background_tasks.add_task(service.execute_evaluation, run_model.id)
        
        return {
            "success": True,
            "data": {
                "id": str(run_model.id),
                "name": run_model.name,
                "status": run_model.status,
            }
        }
    except Exception as exc:
        raise internal_error(str(exc))


@router.get(
    "/runs",
    response_model=EvaluationListResponse,
    summary="List all previous evaluation runs",
)
async def get_runs(db: DbSession, llm: LLMProvider, logger: Logger):
    try:
        from app.services.cache_service import cache_service
        
        cached_data = cache_service.get("evaluation_runs")
        if cached_data is not None:
            return cached_data
            
        service = EvaluationService(llm=llm, logger=logger, db=db)
        runs = await service.list_runs()
        response_data = {
            "success": True,
            "data": [
                EvaluationSummary(
                    id=str(r.id),
                    name=r.name,
                    status=r.status,
                    created_at=r.created_at,
                    completed_at=r.completed_at,
                    total_runs=r.total_runs,
                    success_rate=r.success_rate,
                    avg_latency_ms=r.avg_latency_ms,
                    total_token_cost=r.total_token_cost,
                )
                for r in runs
            ]
        }
        cache_service.set("evaluation_runs", response_data, ttl_seconds=10)
        return response_data
    except Exception as exc:
        raise internal_error(str(exc))


@router.get(
    "/runs/{eval_id}",
    response_model=EvaluationDetailResponse,
    summary="Get details of a specific evaluation run",
)
async def get_run_detail(
    eval_id: str,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
):
    try:
        service = EvaluationService(llm=llm, logger=logger, db=db)
        run_model = await service.get_run_details(uuid.UUID(eval_id))
        if not run_model:
            raise not_found(f"Evaluation run '{eval_id}' not found")
            
        return {
            "success": True,
            "data": EvaluationRunData(
                id=str(run_model.id),
                name=run_model.name,
                status=run_model.status,
                created_at=run_model.created_at,
                completed_at=run_model.completed_at,
                total_runs=run_model.total_runs,
                success_rate=run_model.success_rate,
                avg_latency_ms=run_model.avg_latency_ms,
                total_token_cost=run_model.total_token_cost,
                items=[
                    EvaluationItemData(
                        id=str(item.id),
                        run_id=str(item.run_id) if item.run_id else None,
                        prompt_name=item.prompt_name,
                        prompt_type=item.prompt_type,
                        prompt_text=item.prompt_text,
                        status=item.status,
                        latency_ms=item.latency_ms,
                        validation_errors=item.validation_errors,
                        retries=item.retries,
                        repair_success=item.repair_success,
                        execution_success=item.execution_success,
                        token_cost=item.token_cost,
                        created_at=item.created_at,
                    )
                    for item in run_model.items
                ]
            )
        }
    except Exception as exc:
        raise internal_error(str(exc))


@router.get(
    "/export/csv/{eval_id}",
    summary="Export an evaluation run as CSV",
)
async def export_csv(
    eval_id: str,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
):
    try:
        service = EvaluationService(llm=llm, logger=logger, db=db)
        run_model = await service.get_run_details(uuid.UUID(eval_id))
        if not run_model:
            raise not_found(f"Evaluation run '{eval_id}' not found")
            
        csv_data = service.export_csv(run_model)
        headers = {
            "Content-Disposition": f"attachment; filename=evaluation_{eval_id}.csv",
            "Content-Type": "text/csv",
        }
        return Response(content=csv_data, headers=headers)
    except Exception as exc:
        raise internal_error(str(exc))


@router.get(
    "/export/pdf/{eval_id}",
    summary="Export an evaluation run as PDF",
)
async def export_pdf(
    eval_id: str,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
):
    try:
        service = EvaluationService(llm=llm, logger=logger, db=db)
        run_model = await service.get_run_details(uuid.UUID(eval_id))
        if not run_model:
            raise not_found(f"Evaluation run '{eval_id}' not found")
            
        pdf_bytes = service.export_pdf(run_model)
        if isinstance(pdf_bytes, bytearray):
            pdf_bytes = bytes(pdf_bytes)
        headers = {
            "Content-Disposition": f"attachment; filename=evaluation_{eval_id}.pdf",
            "Content-Type": "application/pdf",
        }
        return Response(content=pdf_bytes, headers=headers)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise internal_error(str(exc))
