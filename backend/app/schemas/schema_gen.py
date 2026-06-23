from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.intent import IntentResult
from app.schemas.design import DesignResult


# ── UI Schema ──────────────────────────────────────────────────────────────────

class UIComponent(BaseModel):
    id: str
    name: str
    type: Literal["page", "layout", "form", "table", "card", "modal", "chart", "nav"]
    route: str | None = None
    props: list[str] = Field(default_factory=list)
    children: list[str] = Field(default_factory=list, description="Child component IDs")
    accessible_to: list[str] = Field(default_factory=list)


class UITheme(BaseModel):
    primary_color: str = "#6366f1"
    font_family: str = "Inter"
    dark_mode: bool = True
    border_radius: str = "8px"


class UISchema(BaseModel):
    components: list[UIComponent]
    theme: UITheme = Field(default_factory=UITheme)
    navigation: list[dict[str, Any]] = Field(default_factory=list)


# ── API Schema ─────────────────────────────────────────────────────────────────

class APIParameter(BaseModel):
    name: str
    type: str
    required: bool = False
    description: str = ""


class APIEndpoint(BaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    description: str
    auth_required: bool = True
    roles: list[str] = Field(default_factory=list)
    request_body: dict[str, Any] | None = None
    response_body: dict[str, Any] | None = None
    query_params: list[APIParameter] = Field(default_factory=list)
    path_params: list[APIParameter] = Field(default_factory=list)


class APISchema(BaseModel):
    version: str = "1.0.0"
    base_path: str = "/api/v1"
    endpoints: list[APIEndpoint]


# ── Database Schema ────────────────────────────────────────────────────────────

class DBField(BaseModel):
    name: str
    type: str = Field(..., description="e.g. uuid, varchar, integer, boolean, timestamp, jsonb")
    nullable: bool = True
    unique: bool = False
    primary_key: bool = False
    foreign_key: str | None = Field(default=None, description="e.g. users.id")
    default: str | None = None
    index: bool = False


class DBTable(BaseModel):
    name: str
    fields: list[DBField]
    indexes: list[str] = Field(default_factory=list)
    description: str = ""


class DatabaseSchema(BaseModel):
    engine: str = "PostgreSQL"
    tables: list[DBTable]
    enums: dict[str, list[str]] = Field(
        default_factory=dict,
        description="PostgreSQL enum types: {enum_name: [values]}",
    )


# ── Auth Schema ────────────────────────────────────────────────────────────────

class AuthStrategy(BaseModel):
    name: str
    provider: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)


class AuthSchema(BaseModel):
    strategies: list[AuthStrategy]
    token_type: Literal["jwt", "session", "api-key"] = "jwt"
    token_expiry: str = "7d"
    refresh_token: bool = True
    roles: list[str] = Field(default_factory=list)
    role_permissions: dict[str, list[str]] = Field(
        default_factory=dict,
        description="{role: [permitted_actions]}",
    )
    protected_routes: list[str] = Field(default_factory=list)


# ── Business Logic Schema ──────────────────────────────────────────────────────

class BusinessRule(BaseModel):
    id: str
    name: str
    description: str
    trigger: str = Field(..., description="When this rule fires (e.g. 'before order creation')")
    condition: str = Field(..., description="The condition that must be met")
    action: str = Field(..., description="What happens when rule triggers")
    layer: Literal["api", "database", "ui"] = "api"


class BusinessLogicSchema(BaseModel):
    rules: list[BusinessRule]
    workflows: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Multi-step workflows (e.g. checkout flow)",
    )
    events: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Domain events and their handlers",
    )


# ── Aggregated output ──────────────────────────────────────────────────────────

class GeneratedSchemas(BaseModel):
    """
    Complete set of schemas produced by the Schema Generator.
    Input to the Validation Engine.
    """

    ui: UISchema
    api: APISchema
    database: DatabaseSchema
    auth: AuthSchema
    business_logic: BusinessLogicSchema


# ── Request / Response ─────────────────────────────────────────────────────────

class SchemaRequest(BaseModel):
    intent: IntentResult
    design: DesignResult
    run_id: str


class SchemaResponse(BaseModel):
    run_id: str
    stage: str = "schema"
    status: str = "success"
    result: GeneratedSchemas
    execution_ms: int
