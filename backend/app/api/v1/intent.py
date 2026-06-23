from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import IntentExtractionError, internal_error
from app.schemas.common import ApiResponse
from app.schemas.intent import IntentRequest, IntentResponse
from app.services.intent_service import IntentService

router = APIRouter(prefix="/intent", tags=["Intent Extraction"])


@router.post(
    "/extract",
    response_model=ApiResponse[IntentResponse],
    summary="Extract structured intent from a natural language prompt",
    description=(
        "Sends the prompt to the LLM and extracts a fully structured IntentResult "
        "containing project type, entities, roles, pages, auth config, and business rules."
    ),
)
async def extract_intent(
    body: IntentRequest,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> ApiResponse[IntentResponse]:
    try:
        service = IntentService(llm=llm, logger=logger, db=db)
        response = await service.extract(body)
        return ApiResponse(data=response)
    except IntentExtractionError as exc:
        raise internal_error(exc.message)
    except Exception as exc:
        raise internal_error(str(exc))
