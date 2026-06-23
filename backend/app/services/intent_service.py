from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import IntentExtractionError
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.schemas.intent import IntentRequest, IntentResult, IntentResponse

# ── System prompt ──────────────────────────────────────────────────────────────

INTENT_SYSTEM_PROMPT = """\
You are a senior software architect specialized in extracting structured application requirements from natural language descriptions.

Your job is to analyze the user's prompt and extract a complete, structured intent definition.

Rules:
1. Extract ALL entities mentioned or implied — be thorough.
2. Infer sensible defaults for any unspecified details (mark them as assumptions).
3. ALWAYS include authentication — default to JWT email/password if not specified.
4. Identify all user roles implied by the feature set.
5. Generate realistic page names and routes following REST conventions.
6. Business rules should be actionable and tied to specific layers.
7. Confidence should reflect how complete/clear the prompt was (0.0–1.0).
8. Never omit required fields from the schema.
"""


class IntentService:
    """
    Intent Extraction Service.

    Takes a raw natural language prompt and returns a fully structured
    IntentResult that drives all downstream pipeline stages.
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

    async def extract(self, request: IntentRequest) -> IntentResponse:
        """
        Main entry point. Runs intent extraction and logs results to DB.

        Args:
            request: Contains the user's natural language prompt.

        Returns:
            IntentResponse with the structured IntentResult and execution metadata.
        """
        run_id = uuid.UUID(request.run_id) if request.run_id else uuid.uuid4()
        timer = StageTimer()
        timer.start()

        # Log stage start
        log_entry = await self._logger.log_stage_start(
            run_id=run_id,
            stage="intent",
            input_data={"prompt": request.prompt},
        )

        try:
            intent = await self._extract_intent(request.prompt)
            elapsed = timer.elapsed_ms()

            # Log success
            await self._logger.log_stage_success(
                log=log_entry,
                output_data=intent.model_dump(),
                execution_ms=elapsed,
                warnings=self._build_warnings(intent),
            )

            return IntentResponse(
                run_id=str(run_id),
                result=intent,
                execution_ms=elapsed,
            )

        except Exception as exc:
            elapsed = timer.elapsed_ms()
            await self._logger.log_stage_error(
                log=log_entry,
                error_message=str(exc),
                execution_ms=elapsed,
            )
            raise IntentExtractionError(str(exc)) from exc

    async def _extract_intent(self, prompt: str) -> IntentResult:
        """Call the LLM and get a validated IntentResult."""
        user_prompt = f"""\
Analyze this application description and extract the full structured intent:

---
{prompt}
---

Extract project type, name, description, modules, features, entities (with fields \
and relationships), user roles (with permissions), pages (with routes and access control), \
authentication configuration, business rules, and any assumptions you made.
"""
        result = await self._llm.structured_output(
            prompt=user_prompt,
            output_schema=IntentResult,
            system_prompt=INTENT_SYSTEM_PROMPT,
        )
        return result

    @staticmethod
    def _build_warnings(intent: IntentResult) -> list[str]:
        """Generate actionable warnings for low-confidence or incomplete extractions."""
        warnings: list[str] = []
        if intent.confidence < 0.6:
            warnings.append(
                f"Low confidence extraction ({intent.confidence:.0%}). "
                "Consider providing more detail in your prompt."
            )
        if not intent.entities:
            warnings.append("No entities detected — schema generation may produce generic results.")
        if not intent.business_rules:
            warnings.append("No business rules detected — defaulting to CRUD-only operations.")
        if len(intent.assumptions) > 3:
            warnings.append(
                f"{len(intent.assumptions)} assumptions were made. "
                "Review them before proceeding."
            )
        return warnings
