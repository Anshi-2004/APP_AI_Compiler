from __future__ import annotations

"""
Repair Engine — Phase 3 full implementation.

Key principle: NEVER regenerate everything.
Only the sections that FAILED validation are regenerated.
Each repair is logged as a RepairRecord with:
  - original_json
  - error description
  - repair_reason
  - updated_json
  - repair_time_ms
  - success flag
"""

import time
import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.models.repair_history import RepairHistory
from app.schemas.intent import IntentResult
from app.schemas.design import DesignResult
from app.schemas.schema_gen import (
    GeneratedSchemas,
    UISchema,
    APISchema,
    DatabaseSchema,
    AuthSchema,
    BusinessLogicSchema,
)
from app.schemas.pipeline_stages import (
    ValidationReport,
    ValidationCheck,
    RepairRecord,
    RepairAction,
    RepairReport,
    RepairResponse,
)


SectionType = Literal["ui", "api", "database", "auth", "business_logic"]


# ─────────────────────────────────────────────────────────────────────────────
# System prompts — targeted per section
# ─────────────────────────────────────────────────────────────────────────────

REPAIR_SYSTEM_PROMPTS: dict[str, str] = {
    "ui": """\
You are a UI architect correcting a broken UI schema. You will receive:
1. The original UI schema (JSON)
2. A list of validation errors

Regenerate ONLY the UI schema, fixing ALL listed errors. Rules:
- Every page must have a valid route starting with '/'
- Every page must have accessible_to roles defined
- No duplicate routes
- Child component IDs must reference existing components
- Preserve all valid components from the original schema
Return a complete, valid UISchema object.
""",
    "api": """\
You are an API designer correcting a broken API schema. You will receive:
1. The original API schema (JSON)
2. A list of validation errors

Regenerate ONLY the API schema, fixing ALL listed errors. Rules:
- All paths must start with '/'
- POST/PUT/PATCH must have request_body defined
- All endpoints must have response_body defined
- No duplicate method+path combinations
- Protected endpoints must list roles
- Auth-required endpoints must define allowed roles
Return a complete, valid APISchema object.
""",
    "database": """\
You are a database architect correcting a broken database schema. You will receive:
1. The original database schema (JSON)
2. A list of validation errors

Regenerate ONLY the database schema, fixing ALL listed errors. Rules:
- Every table must have exactly one UUID primary key named 'id'
- All tables must have created_at and updated_at timestamp fields
- All table and field names must be snake_case
- Foreign keys must reference existing tables
- No circular foreign key dependencies
Return a complete, valid DatabaseSchema object.
""",
    "auth": """\
You are a security architect correcting a broken auth schema. You will receive:
1. The original auth schema (JSON)
2. A list of validation errors

Regenerate ONLY the auth schema, fixing ALL listed errors. Rules:
- All roles referenced in UI and API must be defined
- All roles must have permissions listed in role_permissions
- Token expiry must match format: 15m, 7d, 1h, etc.
- At least one auth strategy must be defined
Return a complete, valid AuthSchema object.
""",
    "business_logic": """\
You are a domain expert correcting a broken business logic schema. You will receive:
1. The original business logic schema (JSON)
2. A list of validation errors

Regenerate ONLY the business logic schema, fixing ALL listed errors. Rules:
- Every rule must have a non-empty trigger and condition
- Rule layer must be one of: api, database, ui
- Rules must reference valid entities from the application
Return a complete, valid BusinessLogicSchema object.
""",
}

SCHEMA_CLASSES: dict[str, type] = {
    "ui": UISchema,
    "api": APISchema,
    "database": DatabaseSchema,
    "auth": AuthSchema,
    "business_logic": BusinessLogicSchema,
}


# ─────────────────────────────────────────────────────────────────────────────
# Repair Service
# ─────────────────────────────────────────────────────────────────────────────

class RepairService:
    """
    Repair Engine — regenerates ONLY the sections that failed validation.

    Process per failed section:
    1. Extract all errors for that section
    2. Call LLM with the original section JSON + error list
    3. Parse the LLM response into the appropriate Pydantic schema
    4. Re-run section-level validation on the repaired schema
    5. Store a RepairRecord in the repair_history table
    6. Retry up to settings.max_repair_iterations if still failing

    After repair, the FULL GeneratedSchemas is updated with the fixed sections only.
    """

    def __init__(self, llm: BaseLLMProvider, logger: LoggingService, db: AsyncSession) -> None:
        self._llm = llm
        self._logger = logger
        self._db = db

    async def repair(
        self,
        schemas: GeneratedSchemas,
        validation_report: ValidationReport,
        run_id: str,
        *,
        intent: IntentResult | None = None,
        design: DesignResult | None = None,
    ) -> tuple[GeneratedSchemas, RepairResponse]:
        """
        Repair all failed sections. Returns updated schemas and a RepairResponse.
        """
        rid = uuid.UUID(run_id)
        timer = StageTimer()
        timer.start()

        log_entry = await self._logger.log_stage_start(
            run_id=rid,
            stage="repair",
            input_data={
                "failed_sections": validation_report.failed_sections,
                "total_errors": validation_report.errors,
            },
        )

        records: list[RepairRecord] = []
        actions: list[RepairAction] = []
        sections_repaired: list[str] = []
        sections_failed: list[str] = []

        # Only repair sections that failed — never regenerate passing sections
        for section in validation_report.failed_sections:
            section_errors = self._extract_section_errors(validation_report, section)
            if not section_errors:
                continue

            record, repaired_section = await self._repair_section(
                schemas=schemas,
                section=section,  # type: ignore[arg-type]
                errors=section_errors,
                run_id=run_id,
                intent=intent,
                design=design,
            )

            records.append(record)
            actions.append(RepairAction(
                id=record.id,
                error_id=section,
                description=record.repair_reason,
                original=f"[{section}] {len(section_errors)} errors",
                repaired=f"[{section}] Regenerated via LLM" if record.success else "(failed)",
                applied=record.success,
                section=section,
            ))

            if record.success and repaired_section is not None:
                # Patch ONLY the failed section into the schemas
                schemas = self._patch_schema(schemas, section, repaired_section)  # type: ignore[arg-type]
                sections_repaired.append(section)
            else:
                sections_failed.append(section)

            # Persist to DB
            await self._save_record(rid, record)

        elapsed = timer.elapsed_ms()
        total_errors = validation_report.errors
        repaired_count = sum(r.errors_fixed for r in records)

        report = RepairReport(
            total_errors=total_errors,
            repaired=repaired_count,
            failed=len(sections_failed),
            sections_repaired=sections_repaired,
            sections_failed=sections_failed,
            actions=actions,
            records=records,
        )

        status = "success" if not sections_failed else ("partial" if sections_repaired else "error")

        await self._logger.log_stage_success(
            log=log_entry,
            output_data=report.model_dump(mode="json"),
            execution_ms=elapsed,
        )

        return schemas, RepairResponse(
            run_id=run_id,
            status=status,
            result=report,
            execution_ms=elapsed,
        )

    async def _repair_section(
        self,
        schemas: GeneratedSchemas,
        section: SectionType,
        errors: list[ValidationCheck],
        run_id: str,
        *,
        intent: IntentResult | None,
        design: DesignResult | None,
    ) -> tuple[RepairRecord, object | None]:
        """Attempt LLM-based repair for a single schema section."""
        start = time.monotonic()
        original_data = self._get_section(schemas, section)
        error_summary = self._format_errors(errors)

        repair_reason = (
            f"Regenerating '{section}' schema to fix {len(errors)} validation error(s): "
            + "; ".join(e.rule for e in errors[:5])
            + ("..." if len(errors) > 5 else "")
        )

        context = self._build_context(schemas, intent, design)
        user_prompt = f"""\
{context}

The following section FAILED validation with these errors:

{error_summary}

Original {section} schema:
{original_data}

Fix ALL errors and return a complete, valid {section} schema.
"""
        schema_class = SCHEMA_CLASSES[section]

        repaired_section = None
        success = False
        error_msg = ""
        iteration = 0

        while iteration < settings.max_repair_iterations and not success:
            iteration += 1
            try:
                repaired_section = await self._llm.structured_output(
                    prompt=user_prompt,
                    output_schema=schema_class,
                    system_prompt=REPAIR_SYSTEM_PROMPTS[section],
                )
                success = True
            except Exception as exc:
                error_msg = str(exc)
                if iteration < settings.max_repair_iterations:
                    user_prompt += f"\n\nPrevious attempt failed with: {error_msg}. Please correct and try again."

        elapsed_ms = int((time.monotonic() - start) * 1000)

        record = RepairRecord(
            run_id=run_id,
            section=section,
            original_json=original_data,
            error=error_summary,
            repair_reason=repair_reason,
            updated_json=repaired_section.model_dump() if repaired_section else {},
            repair_time_ms=elapsed_ms,
            success=success,
            error_count=len(errors),
            errors_fixed=len(errors) if success else 0,
        )

        return record, repaired_section if success else None

    @staticmethod
    def _extract_section_errors(
        report: ValidationReport, section: str
    ) -> list[ValidationCheck]:
        """Get all validation errors that belong to a schema section."""
        section_to_categories = {
            "ui": ["ui"],
            "api": ["api"],
            "database": ["database"],
            "auth": ["cross_layer", "logical"],
            "business_logic": ["cross_layer", "logical"],
        }
        target_categories = section_to_categories.get(section, [section])

        all_checks = (
            report.json_validation.checks
            + report.ui_validation.checks
            + report.api_validation.checks
            + report.db_validation.checks
            + report.cross_layer_validation.checks
            + report.logical_validation.checks
        )

        return [
            c for c in all_checks
            if c.severity == "error" and c.category in target_categories
        ]

    @staticmethod
    def _get_section(schemas: GeneratedSchemas, section: str) -> dict:
        mapping = {
            "ui": schemas.ui,
            "api": schemas.api,
            "database": schemas.database,
            "auth": schemas.auth,
            "business_logic": schemas.business_logic,
        }
        obj = mapping.get(section)
        return obj.model_dump() if obj else {}

    @staticmethod
    def _patch_schema(
        schemas: GeneratedSchemas,
        section: SectionType,
        repaired: object,
    ) -> GeneratedSchemas:
        """Return a new GeneratedSchemas with only the repaired section replaced."""
        return GeneratedSchemas(
            ui=repaired if section == "ui" else schemas.ui,  # type: ignore[arg-type]
            api=repaired if section == "api" else schemas.api,  # type: ignore[arg-type]
            database=repaired if section == "database" else schemas.database,  # type: ignore[arg-type]
            auth=repaired if section == "auth" else schemas.auth,  # type: ignore[arg-type]
            business_logic=repaired if section == "business_logic" else schemas.business_logic,  # type: ignore[arg-type]
        )

    @staticmethod
    def _format_errors(errors: list[ValidationCheck]) -> str:
        lines = []
        for i, e in enumerate(errors, 1):
            line = f"{i}. [{e.rule}] {e.message}"
            if e.suggestion:
                line += f"\n   Suggestion: {e.suggestion}"
            lines.append(line)
        return "\n".join(lines)

    @staticmethod
    def _build_context(
        schemas: GeneratedSchemas,
        intent: IntentResult | None,
        design: DesignResult | None,
    ) -> str:
        ctx = []
        if intent:
            ctx.append(f"Application: {intent.project_name} ({intent.project_type})")
            ctx.append(f"Modules: {', '.join(intent.modules)}")
            ctx.append(f"Roles: {', '.join(r.name for r in intent.roles)}")
        if design:
            ctx.append(f"Tech Stack: {', '.join(f'{k}: {v}' for k,v in design.tech_stack.items())}")
        ctx.append(f"Tables: {', '.join(t.name for t in schemas.database.tables)}")
        ctx.append(f"Auth Roles: {', '.join(schemas.auth.roles)}")
        return "\n".join(ctx)

    async def _save_record(self, run_id: uuid.UUID, record: RepairRecord) -> None:
        """Persist RepairRecord to the repair_history table."""
        try:
            history = RepairHistory(
                id=uuid.UUID(record.id),
                run_id=run_id,
                section=record.section,
                error=record.error,
                repair_reason=record.repair_reason,
                original_json=record.original_json,
                updated_json=record.updated_json,
                repair_time_ms=record.repair_time_ms,
                success=record.success,
                error_count=record.error_count,
                errors_fixed=record.errors_fixed,
            )
            self._db.add(history)
            await self._db.flush()
        except Exception:
            # Non-fatal — repair still succeeded even if history save fails
            pass

    async def get_history(
        self,
        run_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[RepairHistory]:
        """Query repair history, optionally filtered by run_id."""
        stmt = select(RepairHistory).order_by(RepairHistory.created_at.desc())
        if run_id:
            stmt = stmt.where(RepairHistory.run_id == run_id)
        stmt = stmt.limit(limit).offset(offset)
        result = await self._db.execute(stmt)
        return list(result.scalars().all())
