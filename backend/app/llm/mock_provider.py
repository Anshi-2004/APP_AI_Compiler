from __future__ import annotations

import time
from typing import Type, TypeVar
from pydantic import BaseModel

from app.llm.base import BaseLLMProvider
from app.schemas.intent import IntentResult, Entity, Role, Page, AuthConfig, BusinessRule as IntentBusinessRule
from app.schemas.design import DesignResult, ArchitectureComponent, ArchitectureEdge
from app.schemas.schema_gen import (
    UISchema,
    UIComponent,
    UITheme,
    APISchema,
    APIEndpoint,
    DatabaseSchema,
    DBTable,
    DBField,
    AuthSchema,
    AuthStrategy,
    BusinessLogicSchema,
    BusinessRule,
)

T = TypeVar("T", bound=BaseModel)

class MockLLMProvider(BaseLLMProvider):
    """
    High-fidelity Mock LLM Provider used when real API keys are not configured.
    Generates realistic, validated structures matching each output schema.
    """

    @property
    def model_name(self) -> str:
        return "mock-llm-compiler"

    async def structured_output(
        self,
        prompt: str,
        output_schema: Type[T],
        system_prompt: str | None = None,
    ) -> T:
        # Simulate small network latency
        time.sleep(0.1)

        name = output_schema.__name__

        # 1. IntentResult
        if name == "IntentResult":
            return IntentResult(
                project_type="saas",
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
                    IntentBusinessRule(id="rule-001", description="Stock must be > 0 before checkout", applies_to="api"),
                ],
                assumptions=["Stripe is configured with live keys", "Email notifications via SendGrid"],
                confidence=0.95,
            )

        # 2. DesignResult
        if name == "DesignResult":
            return DesignResult(
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

        # 3. UISchema
        if name == "UISchema":
            return UISchema(
                components=[
                    UIComponent(
                        id="root-layout",
                        name="Root Layout",
                        type="layout",
                        children=["home-page"],
                        accessible_to=["admin", "customer"],
                    ),
                    UIComponent(
                        id="home-page",
                        name="Home Page",
                        type="page",
                        route="/",
                        accessible_to=["admin", "customer"],
                    ),
                ],
                theme=UITheme(),
                navigation=[{"title": "Home", "path": "/"}],
            )

        # 4. APISchema
        if name == "APISchema":
            return APISchema(
                version="1.0.0",
                base_path="/api/v1",
                endpoints=[
                    APIEndpoint(
                        method="GET",
                        path="/items",
                        description="Get items",
                        auth_required=True,
                        roles=["admin", "customer"],
                        response_body={"type": "array"},
                    )
                ],
            )

        # 5. DatabaseSchema
        if name == "DatabaseSchema":
            return DatabaseSchema(
                engine="PostgreSQL",
                tables=[
                    DBTable(
                        name="items",
                        description="Items table",
                        fields=[
                            DBField(name="id", type="uuid", primary_key=True),
                            DBField(name="name", type="varchar", nullable=False),
                            DBField(name="created_at", type="timestamp", nullable=False),
                            DBField(name="updated_at", type="timestamp", nullable=False),
                        ],
                    )
                ],
            )

        # 6. AuthSchema
        if name == "AuthSchema":
            return AuthSchema(
                strategies=[AuthStrategy(name="jwt", provider="internal")],
                roles=["admin", "customer"],
                role_permissions={"admin": ["read", "write"], "customer": ["read"]},
                token_type="jwt",
                token_expiry="15m",
            )

        # 7. BusinessLogicSchema
        if name == "BusinessLogicSchema":
            return BusinessLogicSchema(
                rules=[
                    BusinessRule(
                        id="rule-1",
                        name="Item validation",
                        description="Name cannot be empty",
                        trigger="before create",
                        condition="name != ''",
                        action="allow",
                        layer="api",
                    )
                ]
            )

        # Fallback to instantiating output_schema
        return output_schema()

    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> str:
        return "Mock response completed successfully."
