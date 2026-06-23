from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import SchemaGenerationError, internal_error
from app.schemas.common import ApiResponse
from app.schemas.schema_gen import SchemaRequest, SchemaResponse
from app.services.schema_service import SchemaService

router = APIRouter(prefix="/schema", tags=["Schema Generation"])


@router.post(
    "/generate",
    response_model=ApiResponse[SchemaResponse],
    summary="Generate all five application schemas",
    description=(
        "Takes IntentResult + DesignResult and produces five fully-typed schemas: "
        "UI components, REST API endpoints, PostgreSQL database tables, "
        "authentication configuration, and business logic rules."
    ),
)
async def generate_schema(
    body: SchemaRequest,
    db: DbSession,
    llm: LLMProvider,
    logger: Logger,
) -> ApiResponse[SchemaResponse]:
    try:
        service = SchemaService(llm=llm, logger=logger, db=db)
        response = await service.generate(body)
        return ApiResponse(data=response)
    except SchemaGenerationError as exc:
        raise internal_error(exc.message)
    except Exception as exc:
        raise internal_error(str(exc))
