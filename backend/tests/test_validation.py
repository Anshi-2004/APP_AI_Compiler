from __future__ import annotations

import pytest
import uuid
from unittest.mock import AsyncMock
from app.schemas.schema_gen import (
    GeneratedSchemas,
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
from app.services.validation_service import (
    ValidationService,
    JsonValidator,
    UIValidator,
    APIValidator,
    DatabaseValidator,
    CrossLayerValidator,
    LogicalValidator,
)
from app.llm.base import BaseLLMProvider
from app.core.logging_service import LoggingService
from sqlalchemy.ext.asyncio import AsyncSession


def make_valid_schemas() -> GeneratedSchemas:
    return GeneratedSchemas(
        ui=UISchema(
            components=[
                UIComponent(
                    id="root-layout",
                    name="Root Layout",
                    type="layout",
                    children=["home-page"],
                    accessible_to=["admin", "user"],
                ),
                UIComponent(
                    id="home-page",
                    name="Home Page",
                    type="page",
                    route="/",
                    accessible_to=["admin", "user"],
                ),
            ],
            theme=UITheme(),
            navigation=[{"title": "Home", "path": "/"}],
        ),
        api=APISchema(
            version="1.0.0",
            base_path="/api/v1",
            endpoints=[
                APIEndpoint(
                    method="GET",
                    path="/items",
                    description="Get items",
                    auth_required=True,
                    roles=["admin", "user"],
                    response_body={"type": "array"},
                )
            ],
        ),
        database=DatabaseSchema(
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
        ),
        auth=AuthSchema(
            strategies=[AuthStrategy(name="jwt", provider="internal")],
            roles=["admin", "user"],
            role_permissions={"admin": ["read", "write"], "user": ["read"]},
            token_type="jwt",
            token_expiry="15m",
        ),
        business_logic=BusinessLogicSchema(
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
        ),
    )


@pytest.mark.asyncio
async def test_validation_success_on_valid_schema():
    schemas = make_valid_schemas()
    mock_llm = AsyncMock(spec=BaseLLMProvider)
    mock_logger = AsyncMock(spec=LoggingService)
    mock_db = AsyncMock(spec=AsyncSession)
    
    # mock log_stage_start and other logger calls
    mock_logger.log_stage_start = AsyncMock(return_value=AsyncMock())
    mock_logger.log_stage_success = AsyncMock()

    service = ValidationService(llm=mock_llm, logger=mock_logger, db=mock_db)
    response = await service.validate(schemas, run_id=str(uuid.uuid4()))

    assert response.status in ("success", "warning")
    report = response.result
    assert report.total_checks > 0
    assert report.errors == 0
    assert report.score >= 90.0
    assert len(report.failed_sections) == 0


@pytest.mark.asyncio
async def test_json_validator_detects_missing_keys():
    schemas = make_valid_schemas()
    # Intentionally corrupt some fields to make it fail required keys or types
    schemas.ui.components = []
    
    validator = JsonValidator()
    result = validator.validate(schemas)
    assert result.category == "json"
    assert result.warnings > 0 or result.errors > 0


@pytest.mark.asyncio
async def test_ui_validator_detects_invalid_routing():
    schemas = make_valid_schemas()
    # Route does not start with /
    schemas.ui.components[1].route = "home"

    validator = UIValidator()
    result = validator.validate(schemas.ui)
    assert result.errors > 0
    assert any(c.rule == "page_has_valid_route" and c.severity == "error" for c in result.checks)


@pytest.mark.asyncio
async def test_api_validator_detects_duplicates_and_invalid_paths():
    schemas = make_valid_schemas()
    # Add duplicate endpoint
    schemas.api.endpoints.append(
        APIEndpoint(
            method="GET",
            path="/items",
            description="Duplicate items",
            auth_required=True,
            roles=["admin"],
            response_body={},
        )
    )

    validator = APIValidator()
    result = validator.validate(schemas.api)
    assert result.errors > 0
    assert any(c.rule == "no_duplicate_endpoints" and c.severity == "error" for c in result.checks)


@pytest.mark.asyncio
async def test_database_validator_detects_missing_pk_and_snake_case():
    schemas = make_valid_schemas()
    # Remove PK from fields
    schemas.database.tables[0].fields[0].primary_key = False
    # Use non-snake_case field name
    schemas.database.tables[0].fields[1].name = "itemFieldName"

    validator = DatabaseValidator()
    result = validator.validate(schemas.database)
    assert result.errors > 0 or result.warnings > 0
    assert any(c.rule == "table_has_primary_key" and c.severity == "error" for c in result.checks)
    assert any(c.rule == "snake_case_field_name" and c.severity == "warning" for c in result.checks)


@pytest.mark.asyncio
async def test_cross_layer_validator_detects_role_mismatch():
    schemas = make_valid_schemas()
    # Reference a role that does not exist in Auth
    schemas.ui.components[1].accessible_to.append("super-admin")

    validator = CrossLayerValidator()
    result = validator.validate(schemas)
    assert result.errors > 0
    assert any(c.rule == "ui_role_in_auth_schema" and c.severity == "error" for c in result.checks)


@pytest.mark.asyncio
async def test_logical_validator_detects_issues():
    schemas = make_valid_schemas()
    
    validator = LogicalValidator()
    result = validator.validate(schemas)
    assert result.category == "logical"
