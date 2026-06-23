from __future__ import annotations

import json
import os
import uuid
import pytest
from unittest.mock import AsyncMock

from app.llm.base import BaseLLMProvider
from app.core.dependencies import get_llm
from tests.test_intent import MOCK_INTENT_RESULT
from tests.test_design import MOCK_DESIGN_RESULT
from tests.test_validation import make_valid_schemas


@pytest.mark.asyncio
async def test_run_pipeline_endpoint(client):
    """
    Test the synchronous run endpoint.
    It should mock the LLM calls and successfully execute the whole pipeline,
    returning a 200 with the correct JSON structure.
    """
    from app.main import app

    # Setup sequential LLM mocks:
    # 1. Intent
    # 2. Design
    # 3. UI Schema
    # 4. API Schema
    # 5. Database Schema
    # 6. Auth Schema
    # 7. Business Logic Schema
    schemas = make_valid_schemas()

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

    app.dependency_overrides[get_llm] = lambda: mock_llm

    try:
        response = await client.post(
            "/api/v1/pipeline/run",
            json={"prompt": "Build a secure and complete SaaS project for managing invoices."},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "run_id" in data["data"]
        assert data["data"]["status"] == "success"
        
        # Verify stages are all success
        stages = data["data"]["stages"]
        assert stages["intent"]["status"] == "success"
        assert stages["design"]["status"] == "success"
        assert stages["schema"]["status"] == "success"
        assert stages["validation"]["status"] == "success"
        assert stages["runtime"]["status"] == "success"

        # Cleanup generated files from disk
        import shutil
        run_id = data["data"]["run_id"]
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
        zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        if os.path.exists(zip_path):
            os.remove(zip_path)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_run_pipeline_stream_endpoint(client):
    """
    Test the run-stream endpoint.
    It should return a stream of SSE data events corresponding to the stages.
    """
    from app.main import app

    schemas = make_valid_schemas()

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

    app.dependency_overrides[get_llm] = lambda: mock_llm

    try:
        response = await client.post(
            "/api/v1/pipeline/run-stream",
            json={"prompt": "Build a secure and complete SaaS project for managing invoices."},
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        # Read the stream lines
        events = []
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                event_data = json.loads(line[6:])
                events.append(event_data)

        # Assertions on event logs
        assert len(events) > 0
        assert events[0]["event"] == "run_start"
        
        # Check start & success for intent
        intent_starts = [e for e in events if e.get("event") == "stage_start" and e.get("stage") == "intent"]
        intent_successes = [e for e in events if e.get("event") == "stage_success" and e.get("stage") == "intent"]
        assert len(intent_starts) == 1
        assert len(intent_successes) == 1

        # Check final complete event
        complete_events = [e for e in events if e.get("event") == "run_complete"]
        assert len(complete_events) == 1
        assert complete_events[0]["status"] == "success"
        assert complete_events[0]["outputs"]["intent"] is not None
        assert complete_events[0]["outputs"]["runtime"] is not None

        # Cleanup generated files from disk
        import shutil
        run_id = complete_events[0]["run_id"]
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
        zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        if os.path.exists(zip_path):
            os.remove(zip_path)
    finally:
        app.dependency_overrides.clear()
