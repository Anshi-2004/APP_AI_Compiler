from __future__ import annotations

import pytest
import uuid
from app.models.pipeline_run import PipelineRun
from app.models.pipeline_log import PipelineLog


@pytest.mark.asyncio
async def test_logs_endpoints(client, test_db):
    # 1. Create a dummy PipelineRun in test_db
    run_id = uuid.uuid4()
    run = PipelineRun(
        id=run_id,
        prompt="Test prompt string",
        status="success",
    )
    test_db.add(run)
    await test_db.flush()

    # 2. Create some dummy PipelineLog entries in test_db
    log_id = uuid.uuid4()
    log = PipelineLog(
        id=log_id,
        run_id=run_id,
        stage="intent",
        status="success",
        output_data={"mock_field": "mock_value"},
        execution_ms=100,
    )
    test_db.add(log)
    await test_db.commit()

    # 3. Test GET /api/v1/logs (list endpoint)
    response = await client.get("/api/v1/logs")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 1
    
    # Check fields in list response
    run_entry = next(r for r in data["data"] if r["run_id"] == str(run_id))
    assert run_entry["prompt"] == "Test prompt string"
    assert run_entry["status"] == "success"

    # 4. Test GET /api/v1/logs/{run_id} (detail endpoint)
    response_detail = await client.get(f"/api/v1/logs/{run_id}")
    assert response_detail.status_code == 200
    detail_data = response_detail.json()
    assert detail_data["success"] is True
    assert detail_data["data"]["run_id"] == str(run_id)
    assert detail_data["data"]["prompt"] == "Test prompt string"
    assert detail_data["data"]["status"] == "success"
    assert len(detail_data["data"]["logs"]) == 1
    assert detail_data["data"]["logs"][0]["stage"] == "intent"
    assert detail_data["data"]["logs"][0]["status"] == "success"
    assert detail_data["data"]["logs"][0]["output_data"] == {"mock_field": "mock_value"}
