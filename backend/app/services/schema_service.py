from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SchemaGenerationError
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.schemas.intent import IntentResult
from app.schemas.design import DesignResult
from app.schemas.schema_gen import (
    SchemaRequest,
    SchemaResponse,
    GeneratedSchemas,
    UISchema,
    APISchema,
    DatabaseSchema,
    AuthSchema,
    BusinessLogicSchema,
)

# ── System prompts ─────────────────────────────────────────────────────────────

UI_SYSTEM_PROMPT = """\
You are a UI architect. Given application intent and design, generate a complete \
UI component schema defining every page, layout, form, table, and modal. \
Include routes, props, children, and access control. Be exhaustive — cover every page \
from the navigation flow.
"""

API_SYSTEM_PROMPT = """\
You are an API designer. Generate a complete REST API schema with every endpoint \
needed to power the application. For each endpoint include: method, path, description, \
auth requirement, required roles, request body structure, and response body structure. \
Follow RESTful conventions. Version under /api/v1/.
"""

DB_SYSTEM_PROMPT = """\
You are a database architect. Generate a complete PostgreSQL database schema \
with every table, column (with types, constraints, indexes, foreign keys), and enum types \
needed for the application. Normalize to 3NF. Use UUID primary keys. Include \
created_at/updated_at on every table. Define all foreign key relationships explicitly.
"""

AUTH_SYSTEM_PROMPT = """\
You are a security architect. Generate a complete authentication and authorization schema. \
Include all auth strategies, token configuration, RBAC permissions per role, \
and list of protected routes. Be precise about what each role can and cannot do.
"""

BIZ_SYSTEM_PROMPT = """\
You are a domain expert. Generate a complete business logic schema with all business rules, \
multi-step workflows, and domain events. Each rule must have a trigger, condition, action, \
and the layer it applies to (api, database, or ui).
"""


class SchemaService:
    """
    Schema Generator Service.

    Generates five independent schemas in parallel-friendly async calls:
      - UI Schema
      - API Schema
      - Database Schema
      - Auth Schema
      - Business Logic Schema
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

    async def generate(self, request: SchemaRequest) -> SchemaResponse:
        """Main entry point — generates all five schemas and logs to DB."""
        run_id = uuid.UUID(request.run_id)
        timer = StageTimer()
        timer.start()

        log_entry = await self._logger.log_stage_start(
            run_id=run_id,
            stage="schema",
            input_data={
                "intent_project": request.intent.project_name,
                "architecture_components": len(request.design.architecture),
            },
        )

        try:
            schemas = await self._generate_all(request.intent, request.design)
            elapsed = timer.elapsed_ms()

            await self._logger.log_stage_success(
                log=log_entry,
                output_data=schemas.model_dump(),
                execution_ms=elapsed,
                warnings=self._build_warnings(schemas),
            )

            return SchemaResponse(
                run_id=request.run_id,
                result=schemas,
                execution_ms=elapsed,
            )

        except Exception as exc:
            elapsed = timer.elapsed_ms()
            await self._logger.log_stage_error(
                log=log_entry,
                error_message=str(exc),
                execution_ms=elapsed,
            )
            raise SchemaGenerationError(str(exc)) from exc

    async def _generate_all(
        self, intent: IntentResult, design: DesignResult
    ) -> GeneratedSchemas:
        """
        Generate all five schemas sequentially.
        Future optimization: run concurrently with asyncio.gather.
        """
        context = self._build_context(intent, design)

        ui = await self._llm.structured_output(
            prompt=f"{context}\n\nGenerate the complete UI component schema.",
            output_schema=UISchema,
            system_prompt=UI_SYSTEM_PROMPT,
        )

        api = await self._llm.structured_output(
            prompt=f"{context}\n\nGenerate the complete REST API endpoint schema.",
            output_schema=APISchema,
            system_prompt=API_SYSTEM_PROMPT,
        )

        database = await self._llm.structured_output(
            prompt=f"{context}\n\nGenerate the complete PostgreSQL database schema.",
            output_schema=DatabaseSchema,
            system_prompt=DB_SYSTEM_PROMPT,
        )

        auth = await self._llm.structured_output(
            prompt=f"{context}\n\nGenerate the complete authentication and authorization schema.",
            output_schema=AuthSchema,
            system_prompt=AUTH_SYSTEM_PROMPT,
        )

        business_logic = await self._llm.structured_output(
            prompt=f"{context}\n\nGenerate the complete business logic schema with rules, workflows, and events.",
            output_schema=BusinessLogicSchema,
            system_prompt=BIZ_SYSTEM_PROMPT,
        )

        return GeneratedSchemas(
            ui=ui,
            api=api,
            database=database,
            auth=auth,
            business_logic=business_logic,
        )

    @staticmethod
    def _build_context(intent: IntentResult, design: DesignResult) -> str:
        """Build a concise shared context string passed to every schema LLM call."""
        entities = ", ".join(e.name for e in intent.entities)
        roles = ", ".join(r.name for r in intent.roles)
        components = ", ".join(f"{c.name} ({c.technology})" for c in design.architecture)
        tech = ", ".join(f"{k}: {v}" for k, v in design.tech_stack.items())

        return f"""\
Application: {intent.project_name} ({intent.project_type})
Description: {intent.description}
Modules: {', '.join(intent.modules)}
Features: {', '.join(intent.features)}
Entities: {entities}
Roles: {roles}
Architecture: {components}
Tech Stack: {tech}
Auth: {intent.auth.strategies} via {intent.auth.session_type}
"""

    @staticmethod
    def _build_warnings(schemas: GeneratedSchemas) -> list[str]:
        warnings: list[str] = []
        if len(schemas.api.endpoints) < 5:
            warnings.append("Fewer than 5 API endpoints generated — schema may be incomplete.")
        if len(schemas.database.tables) < 2:
            warnings.append("Fewer than 2 database tables — schema may be too minimal.")
        if not schemas.auth.role_permissions:
            warnings.append("No role permissions defined — all roles will have equal access.")
        if not schemas.business_logic.rules:
            warnings.append("No business rules generated — logic layer will be empty.")
        return warnings
