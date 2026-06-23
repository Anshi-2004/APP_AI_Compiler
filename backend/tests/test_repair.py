from __future__ import annotations

import pytest
import uuid
from unittest.mock import AsyncMock

from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.schema_gen import GeneratedSchemas
from app.schemas.pipeline_stages import ValidationReport, ValidationCategoryResult, ValidationCheck
from app.services.repair_service import RepairService
from app.services.validation_service import ValidationService
from app.llm.base import BaseLLMProvider
from app.core.logging_service import LoggingService
from tests.test_validation import make_valid_schemas


@pytest.mark.asyncio
async def test_repair_service_success(test_db: AsyncSession):
    # 1. Create a schema that has UI errors
    schemas = make_valid_schemas()
    schemas.ui.components[1].route = "invalid-route-no-slash"  # invalid!
    
    # Run validation to get a report with errors
    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_logger = AsyncMock(spec=LoggingService)
    mock_logger.log_stage_start = AsyncMock(return_value=AsyncMock())
    mock_logger.log_stage_success = AsyncMock()
    mock_logger.log_stage_error = AsyncMock()

    val_service = ValidationService(llm=mock_llm, logger=mock_logger, db=test_db)
    run_id = str(uuid.uuid4())
    val_response = await val_service.validate(schemas, run_id=run_id)
    report = val_response.result

    assert report.errors > 0
    assert "ui" in report.failed_sections

    # 2. Setup mock LLM for Repair to return the corrected UISchema
    repaired_ui = make_valid_schemas().ui  # correct one
    mock_llm.structured_output = AsyncMock(return_value=repaired_ui)

    # 3. Initialize RepairService and run repair
    repair_service = RepairService(llm=mock_llm, logger=mock_logger, db=test_db)
    repaired_schemas, repair_response = await repair_service.repair(
        schemas=schemas,
        validation_report=report,
        run_id=run_id
    )

    # 4. Assertions
    assert repair_response.status == "success"
    assert repair_response.result.total_errors == report.errors
    assert repair_response.result.repaired > 0
    assert "ui" in repair_response.result.sections_repaired

    # Verify that the patched schema is corrected
    assert repaired_schemas.ui.components[1].route == "/"

    # Verify that repair record is persisted to DB and can be retrieved
    history = await repair_service.get_history(run_id=uuid.UUID(run_id))
    assert len(history) == 1
    assert history[0].section == "ui"
    assert history[0].success is True
    assert history[0].errors_fixed == report.errors
