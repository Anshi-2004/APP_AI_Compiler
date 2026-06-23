from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import DesignGenerationError, internal_error
from app.schemas.common import ApiResponse
from app.schemas.design import DesignRequest, DesignResponse
from app.services.design_service import DesignService

router = APIRouter(prefix="/design", tags=["System Design"])


@router.post(
    "/generate",
    response_model=ApiResponse[DesignResponse],
    summary="Generate system architecture from structured intent",
    description=(
        "Takes an IntentResult and produces a full system architecture including "
        "components, connections, entity relationships, navigation flow, and data flows."
    ),
)
async def generate_design(
    body: DesignRequest,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> ApiResponse[DesignResponse]:
    try:
        service = DesignService(llm=llm, logger=logger, db=db)
        response = await service.generate(body)
        return ApiResponse(data=response)
    except DesignGenerationError as exc:
        raise internal_error(exc.message)
    except Exception as exc:
        raise internal_error(str(exc))
