from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DesignGenerationError
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.schemas.intent import IntentResult
from app.schemas.design import DesignRequest, DesignResult, DesignResponse

# ── System prompt ──────────────────────────────────────────────────────────────

DESIGN_SYSTEM_PROMPT = """\
You are a principal software architect who translates application intent into precise system designs.

Given a structured IntentResult, generate a complete system architecture including:
- All system components with their technology choices and responsibilities
- Inter-component connections with protocols (REST, WebSocket, SQL, etc.)
- Entity-relationship definitions matching the data model
- Navigation tree with access control per role
- Role permission hierarchy
- Key data flows for the most important user journeys
- Recommended tech stack (modern, production-grade choices)
- Architecture decisions and their rationale

Rules:
1. Every entity from the intent MUST appear in the architecture.
2. Every role MUST appear in the role hierarchy with a numeric privilege level.
3. Components must include: frontend, backend API, database, auth service at minimum.
4. Add external services only when explicitly needed by features (e.g., Stripe for payments).
5. Data flows should cover the top 3–5 most critical user journeys.
6. Tech stack must be consistent and production-ready.
7. Design notes should explain non-obvious choices.
"""


class DesignService:
    """
    System Design Service.

    Converts a structured IntentResult into a full application architecture —
    component graph, entity relationships, navigation flow, and data flows.
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

    async def generate(self, request: DesignRequest) -> DesignResponse:
        """
        Main entry point. Generates system design from intent and logs to DB.
        """
        run_id = uuid.UUID(request.run_id)
        timer = StageTimer()
        timer.start()

        log_entry = await self._logger.log_stage_start(
            run_id=run_id,
            stage="design",
            input_data=request.intent.model_dump(),
        )

        try:
            design = await self._generate_design(request.intent)
            elapsed = timer.elapsed_ms()

            await self._logger.log_stage_success(
                log=log_entry,
                output_data=design.model_dump(),
                execution_ms=elapsed,
                warnings=self._build_warnings(design, request.intent),
            )

            return DesignResponse(
                run_id=request.run_id,
                result=design,
                execution_ms=elapsed,
            )

        except Exception as exc:
            elapsed = timer.elapsed_ms()
            await self._logger.log_stage_error(
                log=log_entry,
                error_message=str(exc),
                execution_ms=elapsed,
            )
            raise DesignGenerationError(str(exc)) from exc

    async def _generate_design(self, intent: IntentResult) -> DesignResult:
        """Call the LLM to produce a DesignResult from an IntentResult."""
        user_prompt = f"""\
Generate a complete system architecture for this application:

Project Type: {intent.project_type}
Project Name: {intent.project_name}
Description: {intent.description}

Modules: {', '.join(intent.modules)}
Features: {', '.join(intent.features)}

Entities ({len(intent.entities)}):
{self._format_entities(intent)}

Roles ({len(intent.roles)}):
{self._format_roles(intent)}

Authentication: {intent.auth.model_dump_json()}

Business Rules:
{self._format_rules(intent)}

Generate a production-grade architecture with all components, connections, \
entity relationships, navigation tree, role hierarchy, top data flows, \
recommended tech stack, and architecture decision notes.
"""
        return await self._llm.structured_output(
            prompt=user_prompt,
            output_schema=DesignResult,
            system_prompt=DESIGN_SYSTEM_PROMPT,
        )

    @staticmethod
    def _format_entities(intent: IntentResult) -> str:
        lines = []
        for e in intent.entities:
            rels = ", ".join(e.relationships) if e.relationships else "none"
            lines.append(f"  - {e.name}: fields=[{', '.join(e.fields)}], relationships=[{rels}]")
        return "\n".join(lines) if lines else "  (none specified)"

    @staticmethod
    def _format_roles(intent: IntentResult) -> str:
        lines = []
        for r in intent.roles:
            lines.append(f"  - {r.name}: {', '.join(r.permissions)}")
        return "\n".join(lines) if lines else "  (none specified)"

    @staticmethod
    def _format_rules(intent: IntentResult) -> str:
        lines = []
        for rule in intent.business_rules:
            lines.append(f"  - [{rule.applies_to}] {rule.description}")
        return "\n".join(lines) if lines else "  (none specified)"

    @staticmethod
    def _build_warnings(design: DesignResult, intent: IntentResult) -> list[str]:
        warnings: list[str] = []
        if len(design.architecture) < 3:
            warnings.append("Fewer than 3 architectural components — design may be incomplete.")
        if not design.data_flows:
            warnings.append("No data flows generated — review architecture manually.")
        entity_names = {e.name.lower() for e in intent.entities}
        component_names = {c.name.lower() for c in design.architecture}
        unrepresented = entity_names - component_names
        if unrepresented:
            warnings.append(
                f"Entities not directly represented in architecture: {', '.join(unrepresented)}"
            )
        return warnings
