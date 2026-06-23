from __future__ import annotations

import os
import uuid
import pytest
from unittest.mock import AsyncMock

from sqlalchemy.ext.asyncio import AsyncSession
from app.llm.base import BaseLLMProvider
from app.core.dependencies import get_llm
from app.core.logging_service import LoggingService
from app.services.evaluation_service import EvaluationService, PRODUCT_PROMPTS, EDGE_CASE_PROMPTS
from tests.test_intent import MOCK_INTENT_RESULT
from tests.test_design import MOCK_DESIGN_RESULT
from tests.test_validation import make_valid_schemas


def test_evaluation_datasets():
    """Datasets must contain exactly 10 product and 10 edge case prompts."""
    assert len(PRODUCT_PROMPTS) == 10
    assert len(EDGE_CASE_PROMPTS) == 10


@pytest.mark.asyncio
async def test_evaluation_execution_and_reports(test_db: AsyncSession):
    """
    Test the full evaluation runner, database updates,
    CSV exports, and PDF generation.
    """
    # 1. Setup mock LLM structured outputs for 20 prompts (each takes 7 calls)
    schemas = make_valid_schemas()
    mock_values = []
    for _ in range(20):
        mock_values.extend([
            MOCK_INTENT_RESULT,
            MOCK_DESIGN_RESULT,
            schemas.ui,
            schemas.api,
            schemas.database,
            schemas.auth,
            schemas.business_logic,
        ])

    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_llm.structured_output = AsyncMock()
    mock_llm.structured_output.side_effect = mock_values

    # Mock logger service
    from app.core.logging_service import LoggingService
    mock_logger = LoggingService(test_db)

    # 2. Instantiate and run EvaluationService
    service = EvaluationService(llm=mock_llm, logger=mock_logger, db=test_db)
    
    # Create evaluation session
    eval_run = await service.create_run("Unit Test Suite")
    assert eval_run.status == "running"

    # Execute full evaluation dataset
    await service.execute_evaluation(eval_run.id)

    # 3. DB validations
    run_details = await service.get_run_details(eval_run.id)
    assert run_details is not None
    assert run_details.status == "success"
    assert run_details.total_runs == 20
    assert run_details.success_rate == 100.0
    assert len(run_details.items) == 20
    assert run_details.avg_latency_ms > 0
    assert run_details.total_token_cost > 0

    # Clean up generated files from workspace disk (since execution ran 20 times)
    import shutil
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for item in run_details.items:
        run_id = str(item.run_id)
        project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
        zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")
        try:
            if os.path.exists(project_dir):
                shutil.rmtree(project_dir)
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except Exception:
            pass

    # 4. CSV Exporter Validation
    csv_data = service.export_csv(run_details)
    assert "Prompt Name" in csv_data
    assert "Token Cost ($)" in csv_data
    assert "CRM" in csv_data

    # 5. PDF Exporter Validation
    pdf_bytes = service.export_pdf(run_details)
    assert isinstance(pdf_bytes, bytearray) or isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0


@pytest.mark.asyncio
async def test_evaluation_api_endpoints(client, test_db: AsyncSession):
    """Test the POST /run, GET /runs, GET /runs/{id} and export endpoints."""
    from app.main import app

    # Setup mock LLM for API call
    schemas = make_valid_schemas()
    mock_values = []
    for _ in range(20):
        mock_values.extend([
            MOCK_INTENT_RESULT,
            MOCK_DESIGN_RESULT,
            schemas.ui,
            schemas.api,
            schemas.database,
            schemas.auth,
            schemas.business_logic,
        ])

    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_llm.structured_output = AsyncMock()
    mock_llm.structured_output.side_effect = mock_values

    app.dependency_overrides[get_llm] = lambda: mock_llm

    try:
        # 1. Trigger evaluation run
        response = await client.post("/api/v1/evaluation/run")
        assert response.status_code == 202
        data = response.json()
        assert data["success"] is True
        eval_id = data["data"]["id"]
        assert eval_id is not None

        # 2. Get list of runs
        list_response = await client.get("/api/v1/evaluation/runs")
        assert list_response.status_code == 200
        list_data = list_response.json()
        assert list_data["success"] is True
        assert len(list_data["data"]) > 0

        # 3. Get specific details
        detail_response = await client.get(f"/api/v1/evaluation/runs/{eval_id}")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["success"] is True
        assert detail_data["data"]["id"] == eval_id
        assert len(detail_data["data"]["items"]) == 20

        # Cleanup created compile directories in test
        import shutil
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for item in detail_data["data"]["items"]:
            run_id = item["run_id"]
            project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
            zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")
            try:
                if os.path.exists(project_dir):
                    shutil.rmtree(project_dir)
                if os.path.exists(zip_path):
                    os.remove(zip_path)
            except Exception:
                pass

        # 4. Test exports
        csv_export = await client.get(f"/api/v1/evaluation/export/csv/{eval_id}")
        assert csv_export.status_code == 200
        assert "text/csv" in csv_export.headers["content-type"]

        pdf_export = await client.get(f"/api/v1/evaluation/export/pdf/{eval_id}")
        assert pdf_export.status_code == 200
        assert "application/pdf" in pdf_export.headers["content-type"]

    finally:
        app.dependency_overrides.clear()
