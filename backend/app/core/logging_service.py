from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pipeline_log import PipelineLog
from app.models.pipeline_run import PipelineRun


StageEnum = Literal["intent", "design", "schema", "validation", "repair", "runtime"]


class LoggingService:
    """
    Structured, DB-backed logging for every pipeline stage.

    Usage:
        async with logging_service.stage(db, run_id, "intent") as log:
            result = await do_work()
            log.set_output(result.model_dump())
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Run management ─────────────────────────────────────────────────────────

    async def create_run(self, prompt: str) -> PipelineRun:
        """Create a new PipelineRun record and return it."""
        run = PipelineRun(
            id=uuid.uuid4(),
            prompt=prompt,
            status="running",
        )
        self._db.add(run)
        await self._db.flush()
        return run

    async def complete_run(self, run_id: uuid.UUID, *, error: str | None = None) -> None:
        """Mark a run as success or error."""
        run = await self._db.get(PipelineRun, run_id)
        if run:
            run.status = "error" if error else "success"
            run.completed_at = datetime.now(timezone.utc)
            run.error_message = error
            await self._db.flush()

    async def get_run(self, run_id: uuid.UUID) -> PipelineRun | None:
        return await self._db.get(PipelineRun, run_id)

    # ── Stage logging ──────────────────────────────────────────────────────────

    async def log_stage_start(
        self,
        run_id: uuid.UUID,
        stage: StageEnum,
        input_data: dict[str, Any] | None = None,
    ) -> PipelineLog:
        """Create a running log entry when a stage begins."""
        log = PipelineLog(
            id=uuid.uuid4(),
            run_id=run_id,
            stage=stage,
            status="running",
            input_data=input_data,
        )
        self._db.add(log)
        await self._db.flush()
        return log

    async def log_stage_success(
        self,
        log: PipelineLog,
        output_data: dict[str, Any],
        execution_ms: int,
        warnings: list[str] | None = None,
    ) -> None:
        """Update log entry on stage success."""
        log.status = "success"
        log.output_data = output_data
        log.execution_ms = execution_ms
        log.warnings = warnings or []
        await self._db.flush()

    async def log_stage_error(
        self,
        log: PipelineLog,
        error_message: str,
        execution_ms: int,
    ) -> None:
        """Update log entry on stage failure."""
        log.status = "error"
        log.error_message = error_message
        log.execution_ms = execution_ms
        await self._db.flush()

    # ── Query helpers ──────────────────────────────────────────────────────────

    async def get_run_logs(self, run_id: uuid.UUID) -> list[PipelineLog]:
        """Fetch all stage logs for a run, ordered by creation time."""
        stmt = (
            select(PipelineLog)
            .where(PipelineLog.run_id == run_id)
            .order_by(PipelineLog.created_at)
        )
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def get_stage_log(
        self, run_id: uuid.UUID, stage: StageEnum
    ) -> PipelineLog | None:
        """Fetch the log for a specific stage of a run."""
        stmt = select(PipelineLog).where(
            PipelineLog.run_id == run_id,
            PipelineLog.stage == stage,
        )
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()


class StageTimer:
    """Context-manager style timer for measuring stage execution."""

    def __init__(self) -> None:
        self._start: float = 0.0

    def start(self) -> None:
        self._start = time.monotonic()

    def elapsed_ms(self) -> int:
        return int((time.monotonic() - self._start) * 1000)
