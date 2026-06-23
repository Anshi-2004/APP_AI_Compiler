from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import CompilerBaseError
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.schemas.intent import IntentRequest, IntentResult, IntentResponse
from app.schemas.design import DesignRequest, DesignResult, DesignResponse
from app.schemas.schema_gen import SchemaRequest, GeneratedSchemas, SchemaResponse
from app.schemas.pipeline_stages import (
    ValidationReport,
    ValidationResponse,
    RepairReport,
    RepairResponse,
    RuntimeResult,
    RuntimeResponse,
)
from app.services.intent_service import IntentService
from app.services.design_service import DesignService
from app.services.schema_service import SchemaService
from app.services.validation_service import ValidationService
from app.services.repair_service import RepairService
from app.services.runtime_service import RuntimeService


# ── Stage result model ─────────────────────────────────────────────────────────

@dataclass
class StageResult:
    stage: str
    status: str           # "success" | "error" | "skipped"
    execution_ms: int
    output: Any | None = None
    error: str | None = None


@dataclass
class PipelineRunResult:
    """Complete result of a full pipeline run — returned by POST /pipeline/run."""
    run_id: str
    prompt: str
    status: str           # "success" | "error" | "partial"
    created_at: datetime
    completed_at: datetime
    total_ms: int
    stages: dict[str, StageResult] = field(default_factory=dict)

    # Final stage outputs (None if stage was skipped or errored)
    intent: IntentResult | None = None
    design: DesignResult | None = None
    schemas: GeneratedSchemas | None = None
    validation: ValidationReport | None = None
    repair: RepairReport | None = None
    runtime: RuntimeResult | None = None


# ── Orchestrator ───────────────────────────────────────────────────────────────

class Orchestrator:
    """
    Pipeline Orchestrator — manages execution order and inter-stage data flow.

    Pipeline:
      Intent → Design → Schema → Validation → (Repair if errors) → Runtime

    Every stage is:
    1. Timed independently
    2. Logged to DB (input, output, execution_ms, errors, warnings)
    3. Type-validated via Pydantic before passing to next stage
    4. Recoverable — a stage failure sets status to "error" but returns partial results
    """

    def __init__(
        self,
        llm: BaseLLMProvider,
        logger: LoggingService,
        db: AsyncSession,
    ) -> None:
        self._llm = llm
        self._logger = logger
        self._db = db

        # Instantiate all services with shared DI
        self._intent = IntentService(llm, logger, db)
        self._design = DesignService(llm, logger, db)
        self._schema = SchemaService(llm, logger, db)
        self._validation = ValidationService(llm, logger, db)
        self._repair = RepairService(llm, logger, db)
        self._runtime = RuntimeService(llm, logger, db)

    async def run(self, prompt: str) -> PipelineRunResult:
        """
        Execute the full compiler pipeline for a given prompt.
        Returns PipelineRunResult regardless of intermediate failures.
        """
        global_timer = StageTimer()
        global_timer.start()
        started_at = datetime.now(timezone.utc)

        # Create the top-level run record
        run = await self._logger.create_run(prompt)
        run_id = str(run.id)

        result = PipelineRunResult(
            run_id=run_id,
            prompt=prompt,
            status="running",
            created_at=started_at,
            completed_at=started_at,
            total_ms=0,
        )

        try:
            # ── Stage 1: Intent Extraction ─────────────────────────────────────
            intent_resp = await self._run_stage(
                name="intent",
                result=result,
                coro=self._intent.extract(
                    IntentRequest(prompt=prompt, run_id=run_id)
                ),
            )
            if not intent_resp:
                return await self._finalize(result, run_id, global_timer, error="Intent extraction failed")

            result.intent = intent_resp.result

            # ── Stage 2: System Design ─────────────────────────────────────────
            design_resp = await self._run_stage(
                name="design",
                result=result,
                coro=self._design.generate(
                    DesignRequest(intent=result.intent, run_id=run_id)
                ),
            )
            if not design_resp:
                return await self._finalize(result, run_id, global_timer, error="Design generation failed")

            result.design = design_resp.result

            # ── Stage 3: Schema Generation ─────────────────────────────────────
            schema_resp = await self._run_stage(
                name="schema",
                result=result,
                coro=self._schema.generate(
                    SchemaRequest(intent=result.intent, design=result.design, run_id=run_id)
                ),
            )
            if not schema_resp:
                return await self._finalize(result, run_id, global_timer, error="Schema generation failed")

            result.schemas = schema_resp.result

            # ── Stage 4: Validation ────────────────────────────────────────────
            validation_resp = await self._run_stage(
                name="validation",
                result=result,
                coro=self._validation.validate(result.schemas, run_id),
            )
            if not validation_resp:
                return await self._finalize(result, run_id, global_timer, error="Validation failed")

            result.validation = validation_resp.result

            # ── Stage 5: Repair (only if validation has errors) ────────────────
            if result.validation.errors > 0:
                repaired_schemas, repair_resp = await self._repair.repair(
                    result.schemas,
                    result.validation,
                    run_id,
                    intent=result.intent,
                    design=result.design,
                )
                result.schemas = repaired_schemas
                result.repair = repair_resp.result
                result.stages["repair"] = StageResult(
                    stage="repair",
                    status=repair_resp.status,
                    execution_ms=repair_resp.execution_ms,
                    output=repair_resp.result,
                )
            else:
                result.stages["repair"] = StageResult(
                    stage="repair",
                    status="skipped",
                    execution_ms=0,
                    output=None,
                )

            # ── Stage 6: Runtime ───────────────────────────────────────────────
            runtime_resp = await self._run_stage(
                name="runtime",
                result=result,
                coro=self._runtime.execute(result.schemas, run_id),
            )
            if runtime_resp:
                result.runtime = runtime_resp.result

            return await self._finalize(result, run_id, global_timer)

        except Exception as exc:
            return await self._finalize(
                result, run_id, global_timer, error=str(exc)
            )

    async def run_stream(self, prompt: str) -> AsyncGenerator[dict[str, Any], None]:
        """
        Execute the full compiler pipeline for a given prompt and yield progress.
        Yields stage-wise status and outputs in real-time.
        """
        global_timer = StageTimer()
        global_timer.start()
        started_at = datetime.now(timezone.utc)

        # Create the top-level run record
        run = await self._logger.create_run(prompt)
        run_id = str(run.id)

        result = PipelineRunResult(
            run_id=run_id,
            prompt=prompt,
            status="running",
            created_at=started_at,
            completed_at=started_at,
            total_ms=0,
        )

        yield {
            "event": "run_start",
            "run_id": run_id,
            "created_at": started_at.isoformat(),
        }

        try:
            # ── Stage 1: Intent Extraction ─────────────────────────────────────
            yield {"event": "stage_start", "stage": "intent"}
            intent_resp = await self._run_stage(
                name="intent",
                result=result,
                coro=self._intent.extract(
                    IntentRequest(prompt=prompt, run_id=run_id)
                ),
            )
            if not intent_resp:
                yield {
                    "event": "stage_error",
                    "stage": "intent",
                    "error": result.stages["intent"].error,
                }
                yield await self._finalize_stream(result, run_id, global_timer, error="Intent extraction failed")
                return

            result.intent = intent_resp.result
            yield {
                "event": "stage_success",
                "stage": "intent",
                "execution_ms": result.stages["intent"].execution_ms,
                "output": result.intent.model_dump() if result.intent else None,
            }

            # ── Stage 2: System Design ─────────────────────────────────────────
            yield {"event": "stage_start", "stage": "design"}
            design_resp = await self._run_stage(
                name="design",
                result=result,
                coro=self._design.generate(
                    DesignRequest(intent=result.intent, run_id=run_id)
                ),
            )
            if not design_resp:
                yield {
                    "event": "stage_error",
                    "stage": "design",
                    "error": result.stages["design"].error,
                }
                yield await self._finalize_stream(result, run_id, global_timer, error="Design generation failed")
                return

            result.design = design_resp.result
            yield {
                "event": "stage_success",
                "stage": "design",
                "execution_ms": result.stages["design"].execution_ms,
                "output": result.design.model_dump() if result.design else None,
            }

            # ── Stage 3: Schema Generation ─────────────────────────────────────
            yield {"event": "stage_start", "stage": "schema"}
            schema_resp = await self._run_stage(
                name="schema",
                result=result,
                coro=self._schema.generate(
                    SchemaRequest(intent=result.intent, design=result.design, run_id=run_id)
                ),
            )
            if not schema_resp:
                yield {
                    "event": "stage_error",
                    "stage": "schema",
                    "error": result.stages["schema"].error,
                }
                yield await self._finalize_stream(result, run_id, global_timer, error="Schema generation failed")
                return

            result.schemas = schema_resp.result
            yield {
                "event": "stage_success",
                "stage": "schema",
                "execution_ms": result.stages["schema"].execution_ms,
                "output": result.schemas.model_dump() if result.schemas else None,
            }

            # ── Stage 4: Validation ────────────────────────────────────────────
            yield {"event": "stage_start", "stage": "validation"}
            validation_resp = await self._run_stage(
                name="validation",
                result=result,
                coro=self._validation.validate(result.schemas, run_id),
            )
            if not validation_resp:
                yield {
                    "event": "stage_error",
                    "stage": "validation",
                    "error": result.stages["validation"].error,
                }
                yield await self._finalize_stream(result, run_id, global_timer, error="Validation failed")
                return

            result.validation = validation_resp.result
            yield {
                "event": "stage_success",
                "stage": "validation",
                "execution_ms": result.stages["validation"].execution_ms,
                "output": result.validation.model_dump() if result.validation else None,
            }

            # ── Stage 5: Repair (only if validation has errors) ────────────────
            yield {"event": "stage_start", "stage": "repair"}
            if result.validation.errors > 0:
                repaired_schemas, repair_resp = await self._repair.repair(
                    result.schemas,
                    result.validation,
                    run_id,
                    intent=result.intent,
                    design=result.design,
                )
                result.schemas = repaired_schemas
                result.repair = repair_resp.result
                result.stages["repair"] = StageResult(
                    stage="repair",
                    status=repair_resp.status,
                    execution_ms=repair_resp.execution_ms,
                    output=repair_resp.result,
                )
                yield {
                    "event": "stage_success",
                    "stage": "repair",
                    "execution_ms": repair_resp.execution_ms,
                    "output": result.repair.model_dump() if result.repair else None,
                }
            else:
                result.stages["repair"] = StageResult(
                    stage="repair",
                    status="skipped",
                    execution_ms=0,
                    output=None,
                )
                yield {
                    "event": "stage_success",
                    "stage": "repair",
                    "execution_ms": 0,
                    "output": None,
                }

            # ── Stage 6: Runtime ───────────────────────────────────────────────
            yield {"event": "stage_start", "stage": "runtime"}
            runtime_resp = await self._run_stage(
                name="runtime",
                result=result,
                coro=self._runtime.execute(result.schemas, run_id),
            )
            if runtime_resp:
                result.runtime = runtime_resp.result
                yield {
                    "event": "stage_success",
                    "stage": "runtime",
                    "execution_ms": result.stages["runtime"].execution_ms,
                    "output": result.runtime.model_dump() if result.runtime else None,
                }
            else:
                yield {
                    "event": "stage_error",
                    "stage": "runtime",
                    "error": result.stages["runtime"].error or "Runtime execution failed",
                }

            yield await self._finalize_stream(result, run_id, global_timer)

        except Exception as exc:
            yield {
                "event": "run_error",
                "error": str(exc),
            }
            yield await self._finalize_stream(result, run_id, global_timer, error=str(exc))

    async def _finalize_stream(
        self,
        result: PipelineRunResult,
        run_id: str,
        timer: StageTimer,
        error: str | None = None,
    ) -> dict[str, Any]:
        result.total_ms = timer.elapsed_ms()
        result.completed_at = datetime.now(timezone.utc)
        result.status = "error" if error else self._compute_status(result)

        await self._logger.complete_run(
            uuid.UUID(run_id),
            error=error,
        )
        return {
            "event": "run_complete",
            "run_id": run_id,
            "status": result.status,
            "total_ms": result.total_ms,
            "completed_at": result.completed_at.isoformat(),
            "error": error,
            "outputs": {
                "intent": result.intent.model_dump() if result.intent else None,
                "design": result.design.model_dump() if result.design else None,
                "schemas": result.schemas.model_dump() if result.schemas else None,
                "validation": result.validation.model_dump() if result.validation else None,
                "repair": result.repair.model_dump() if result.repair else None,
                "runtime": result.runtime.model_dump() if result.runtime else None,
            }
        }

    async def _run_stage(
        self,
        name: str,
        result: PipelineRunResult,
        coro: Any,
    ) -> Any | None:
        """
        Execute a single pipeline stage. Updates result.stages in-place.
        Returns the stage response or None on error.
        """
        try:
            response = await coro
            result.stages[name] = StageResult(
                stage=name,
                status="success",
                execution_ms=response.execution_ms,
                output=response.result,
            )
            return response
        except CompilerBaseError as exc:
            result.stages[name] = StageResult(
                stage=name,
                status="error",
                execution_ms=0,
                error=exc.message,
            )
            return None
        except Exception as exc:
            result.stages[name] = StageResult(
                stage=name,
                status="error",
                execution_ms=0,
                error=str(exc),
            )
            return None

    async def _finalize(
        self,
        result: PipelineRunResult,
        run_id: str,
        timer: StageTimer,
        error: str | None = None,
    ) -> PipelineRunResult:
        """Set final status, elapsed time, and update the DB run record."""
        result.total_ms = timer.elapsed_ms()
        result.completed_at = datetime.now(timezone.utc)
        result.status = "error" if error else self._compute_status(result)

        await self._logger.complete_run(
            uuid.UUID(run_id),
            error=error,
        )
        return result

    @staticmethod
    def _compute_status(result: PipelineRunResult) -> str:
        """Determine overall status from stage results."""
        statuses = {s.status for s in result.stages.values()}
        if "error" in statuses:
            return "partial"
        return "success"
