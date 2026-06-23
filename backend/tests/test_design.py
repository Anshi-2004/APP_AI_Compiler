from __future__ import annotations

import pytest
from unittest.mock import AsyncMock

from app.schemas.design import DesignResult, ArchitectureComponent, ArchitectureEdge
from tests.test_intent import MOCK_INTENT_RESULT


MOCK_DESIGN_RESULT = DesignResult(
    architecture=[
        ArchitectureComponent(id="frontend", name="Next.js Frontend", type="frontend", technology="Next.js 16", responsibilities=["UI rendering", "routing"]),
        ArchitectureComponent(id="api", name="FastAPI Backend", type="backend", technology="FastAPI", responsibilities=["business logic", "API"]),
        ArchitectureComponent(id="db", name="PostgreSQL", type="database", technology="PostgreSQL 16", responsibilities=["data persistence"]),
        ArchitectureComponent(id="stripe", name="Stripe", type="external", technology="Stripe API", responsibilities=["payments"]),
    ],
    connections=[
        ArchitectureEdge(id="e1", source="frontend", target="api", protocol="REST"),
        ArchitectureEdge(id="e2", source="api", target="db", protocol="SQL"),
        ArchitectureEdge(id="e3", source="api", target="stripe", protocol="HTTPS"),
    ],
    entity_relationships=[],
    navigation_flow=[],
    role_hierarchy=[],
    data_flows=[],
    tech_stack={"frontend": "Next.js", "backend": "FastAPI", "database": "PostgreSQL"},
    design_notes=["Stripe webhooks handled server-side for security"],
)


@pytest.mark.asyncio
async def test_design_generate_with_mock_llm(client):
    """Design generation should return architecture when LLM is mocked."""
    from app.llm.base import BaseLLMProvider
    from app.core.dependencies import get_llm
    from app.main import app
    import uuid

    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_llm.structured_output = AsyncMock(return_value=MOCK_DESIGN_RESULT)
    app.dependency_overrides[get_llm] = lambda: mock_llm

    response = await client.post(
        "/api/v1/design/generate",
        json={
            "run_id": str(uuid.uuid4()),
            "intent": MOCK_INTENT_RESULT.model_dump(),
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    result = data["data"]["result"]
    assert len(result["architecture"]) == 4
    assert result["tech_stack"]["frontend"] == "Next.js"


@pytest.mark.asyncio
async def test_design_validates_missing_run_id(client):
    """Missing run_id should return 422."""
    response = await client.post(
        "/api/v1/design/generate",
        json={"intent": MOCK_INTENT_RESULT.model_dump()},
    )
    assert response.status_code == 422
