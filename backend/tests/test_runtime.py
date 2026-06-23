from __future__ import annotations

import os
import uuid
import zipfile
import pytest
from unittest.mock import AsyncMock
from fastapi import status

from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.schema_gen import GeneratedSchemas
from app.services.runtime_service import RuntimeService
from app.llm.base import BaseLLMProvider
from app.core.logging_service import LoggingService
from tests.test_validation import make_valid_schemas


@pytest.mark.asyncio
async def test_runtime_service_generation_and_validation(test_db: AsyncSession):
    # 1. Setup mock dependencies
    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_logger = AsyncMock(spec=LoggingService)
    mock_logger.log_stage_start = AsyncMock(return_value=AsyncMock())
    mock_logger.log_stage_success = AsyncMock()
    
    schemas = make_valid_schemas()
    run_id = str(uuid.uuid4())

    service = RuntimeService(llm=mock_llm, logger=mock_logger, db=test_db)
    
    # 2. Execute runtime generation
    response = await service.execute(schemas, run_id)

    # 3. Assertions
    assert response.status == "success"
    result = response.result
    assert result.status == "success"
    assert len(result.files) > 0
    assert len(result.build_logs) > 0
    assert result.download_url == f"/api/v1/runtime/download/{run_id}"

    # Verify files exist on disk
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
    zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")

    assert os.path.exists(project_dir)
    assert os.path.exists(os.path.join(project_dir, "main.py"))
    assert os.path.exists(os.path.join(project_dir, "routes.py"))
    assert os.path.exists(os.path.join(project_dir, "models.py"))
    assert os.path.exists(os.path.join(project_dir, "package.json"))
    assert os.path.exists(os.path.join(project_dir, "src/App.tsx"))
    assert os.path.exists(zip_path)

    # Verify zip content
    with zipfile.ZipFile(zip_path, "r") as z:
        namelist = z.namelist()
        assert "main.py" in namelist
        assert "package.json" in namelist
        assert "src/App.tsx" in namelist

    # Cleanup test files
    import shutil
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)
    if os.path.exists(zip_path):
        os.remove(zip_path)


@pytest.mark.asyncio
async def test_runtime_api_endpoints(client, test_db: AsyncSession):
    # Setup files first to mock a successful runtime run
    run_id = str(uuid.uuid4())
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    project_dir = os.path.join(base_dir, "storage", "generated_projects", run_id)
    zip_dir = os.path.join(base_dir, "storage", "downloads")
    zip_path = os.path.join(zip_dir, f"project_{run_id}.zip")
    
    os.makedirs(project_dir, exist_ok=True)
    os.makedirs(zip_dir, exist_ok=True)
    
    with open(os.path.join(project_dir, "main.py"), "w") as f:
        f.write("print('hello world')")
        
    with zipfile.ZipFile(zip_path, "w") as z:
        z.writestr("main.py", "print('hello world')")

    # Mock the pipeline run log in DB so endpoint knows the run exists
    from app.models.pipeline_run import PipelineRun
    run_model = PipelineRun(id=uuid.UUID(run_id), prompt="Sample prompt build e-commerce", status="success")
    test_db.add(run_model)
    await test_db.commit()

    # 1. Download Endpoint test
    response = await client.get(f"/api/v1/runtime/download/{run_id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "application/zip"
    assert "content-disposition" in response.headers

    # 2. File Explorer Endpoint test
    response = await client.get(f"/api/v1/runtime/file/{run_id}/main.py")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["data"]["path"] == "main.py"
    assert data["data"]["content"] == "print('hello world')"

    # Cleanup
    import shutil
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)
    if os.path.exists(zip_path):
        os.remove(zip_path)
