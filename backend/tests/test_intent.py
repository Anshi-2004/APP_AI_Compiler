from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from app.schemas.intent import (
    IntentResult, Entity, Role, Page, AuthConfig, BusinessRule
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

SAMPLE_PROMPT = (
    "Build an e-commerce platform with product listings, "
    "shopping cart, Stripe checkout, and an admin dashboard."
)

MOCK_INTENT_RESULT = IntentResult(
    project_type="e-commerce",
    project_name="ShopAI",
    description="A modern e-commerce platform with Stripe payments",
    modules=["Products", "Cart", "Orders", "Auth", "Admin"],
    features=["Stripe checkout", "Product search", "Admin dashboard"],
    entities=[
        Entity(name="User", fields=["id", "email", "password_hash"], relationships=["has many Orders"]),
        Entity(name="Product", fields=["id", "name", "price", "stock"], relationships=["belongs to Category"]),
        Entity(name="Order", fields=["id", "user_id", "total", "status"], relationships=["belongs to User"]),
    ],
    roles=[
        Role(name="admin", permissions=["create", "read", "update", "delete"]),
        Role(name="customer", permissions=["read", "create:order", "read:own-orders"]),
    ],
    pages=[
        Page(name="Product Listing", route="/products", accessible_to=["customer", "guest"]),
        Page(name="Admin Dashboard", route="/admin", accessible_to=["admin"]),
        Page(name="Checkout", route="/checkout", accessible_to=["customer"]),
    ],
    auth=AuthConfig(required=True, strategies=["email-password"], session_type="jwt"),
    business_rules=[
        BusinessRule(id="rule-001", description="Stock must be > 0 before checkout", applies_to="api"),
    ],
    assumptions=["Stripe is configured with live keys", "Email notifications via SendGrid"],
    confidence=0.92,
)


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Health check should return 200 with status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_intent_extract_validates_short_prompt(client):
    """Prompt shorter than 10 characters should return 422."""
    response = await client.post(
        "/api/v1/intent/extract",
        json={"prompt": "build"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_intent_extract_with_mock_llm(client):
    """
    Intent extraction should return a structured result when LLM is mocked.
    """
    from app.llm.base import BaseLLMProvider
    from app.core.dependencies import get_llm

    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_llm.structured_output = AsyncMock(return_value=MOCK_INTENT_RESULT)

    from app.main import app

    app.dependency_overrides[get_llm] = lambda: mock_llm

    response = await client.post(
        "/api/v1/intent/extract",
        json={"prompt": SAMPLE_PROMPT},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    result = data["data"]["result"]
    assert result["project_type"] == "e-commerce"
    assert result["project_name"] == "ShopAI"
    assert len(result["entities"]) == 3
    assert len(result["roles"]) == 2


@pytest.mark.asyncio
async def test_intent_result_model_validation():
    """IntentResult should reject invalid confidence values."""
    with pytest.raises(Exception):
        IntentResult(
            project_type="saas",
            project_name="Test",
            description="A test",
            modules=[],
            features=[],
            confidence=1.5,  # > 1.0 — should fail
        )
