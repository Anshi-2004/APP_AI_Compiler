from __future__ import annotations

import os
import shutil
import uuid
import pytest
from unittest.mock import AsyncMock
from sqlalchemy import select

from app.llm.base import BaseLLMProvider
from app.core.dependencies import get_llm
from app.services.orchestrator import Orchestrator
from app.core.logging_service import LoggingService
from app.models import PipelineRun, PipelineLog
from tests.test_intent import MOCK_INTENT_RESULT
from tests.test_design import MOCK_DESIGN_RESULT
from tests.test_validation import make_valid_schemas


@pytest.mark.asyncio
async def test_end_to_end_pipeline_integration(test_db):
    """
    E2E integration test verifying database model insertion, logging transitions,
    and stage result propagation during the orchestrator execution.
    """
    schemas = make_valid_schemas()

    # Mock the LLM provider sequentially returning results
    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_llm.structured_output = AsyncMock()
    mock_llm.structured_output.side_effect = [
        MOCK_INTENT_RESULT,
        MOCK_DESIGN_RESULT,
        schemas.ui,
        schemas.api,
        schemas.database,
        schemas.auth,
        schemas.business_logic,
    ]

    logger = LoggingService(test_db)
    orchestrator = Orchestrator(llm=mock_llm, logger=logger, db=test_db)

    # Run orchestrator
    prompt = "Build a patient booking portal with admin dashboard and medical history logs."
    result = await orchestrator.run(prompt)

    # Verify return object
    assert result.status == "success"
    assert result.run_id is not None
    assert result.total_ms > 0

    run_uuid = uuid.UUID(result.run_id)

    # Query DB to verify PipelineRun is inserted
    stmt = select(PipelineRun).where(PipelineRun.id == run_uuid)
    exec_result = await test_db.execute(stmt)
    run_model = exec_result.scalar_one_or_none()

    assert run_model is not None
    assert run_model.prompt == prompt
    assert run_model.status == "success"
    assert run_model.completed_at is not None

    # Query DB to verify PipelineLogs are inserted for all stages
    stmt_logs = select(PipelineLog).where(PipelineLog.run_id == run_uuid)
    exec_logs = await test_db.execute(stmt_logs)
    log_models = exec_logs.scalars().all()

    assert len(log_models) > 0
    stages_logged = {log.stage for log in log_models}
    assert "intent" in stages_logged
    assert "design" in stages_logged
    assert "schema" in stages_logged
    assert "validation" in stages_logged
    assert "runtime" in stages_logged

    # Cleanup disk storage
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "storage", "generated_projects", str(result.run_id))
    zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{result.run_id}.zip")
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)
    if os.path.exists(zip_path):
        os.remove(zip_path)
