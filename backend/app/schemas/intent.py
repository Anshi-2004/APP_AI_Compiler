from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────────────────────

class IntentRequest(BaseModel):
    """Input to the Intent Extraction service."""

    prompt: str = Field(
        ...,
        min_length=10,
        max_length=4000,
        description="Natural language description of the application to build",
        examples=["Build an e-commerce platform with Stripe payments and admin dashboard"],
    )
    run_id: str | None = Field(
        default=None,
        description="Optional existing run ID to attach this extraction to",
    )


# ── LLM-structured output models ───────────────────────────────────────────────

class Entity(BaseModel):
    """A domain entity extracted from the prompt."""

    name: str = Field(..., description="Entity name (e.g. User, Product, Order)")
    fields: list[str] = Field(
        default_factory=list,
        description="Key fields/attributes of this entity",
    )
    relationships: list[str] = Field(
        default_factory=list,
        description="Related entities (e.g. 'belongs to User')",
    )


class Role(BaseModel):
    """A user role extracted from the prompt."""

    name: str = Field(..., description="Role name (e.g. admin, customer, guest)")
    permissions: list[str] = Field(
        default_factory=list,
        description="What this role can do",
    )


class Page(BaseModel):
    """A UI page inferred from the prompt."""

    name: str = Field(..., description="Page name (e.g. Product Listing, Dashboard)")
    route: str = Field(..., description="URL route (e.g. /products, /admin)")
    accessible_to: list[str] = Field(
        default_factory=list,
        description="Roles that can access this page",
    )
    description: str = Field(default="")


class BusinessRule(BaseModel):
    """A business constraint or rule extracted from the prompt."""

    id: str = Field(..., description="Short unique identifier (e.g. rule-001)")
    description: str = Field(..., description="Human-readable rule description")
    applies_to: str = Field(..., description="Which layer this rule applies to (api, db, ui)")


class AuthConfig(BaseModel):
    """Authentication configuration extracted from the prompt."""

    required: bool = True
    strategies: list[str] = Field(
        default_factory=lambda: ["email-password"],
        description="Auth strategies (e.g. email-password, google-oauth, magic-link)",
    )
    session_type: Literal["jwt", "session", "api-key"] = "jwt"
    token_expiry: str = "7d"


class IntentResult(BaseModel):
    """
    Structured output from the Intent Extraction service.
    This is the primary input to all downstream pipeline stages.
    """

    project_type: str = Field(
        ...,
        description="High-level project type (e.g. e-commerce, saas, crm, blog)",
    )
    project_name: str = Field(
        ...,
        description="Inferred project name",
    )
    description: str = Field(
        ...,
        description="One-sentence summary of the application",
    )
    modules: list[str] = Field(
        ...,
        description="Top-level feature modules (e.g. Products, Orders, Auth, Notifications)",
    )
    features: list[str] = Field(
        ...,
        description="Specific feature requirements (e.g. 'Stripe checkout', 'real-time notifications')",
    )
    entities: list[Entity] = Field(
        default_factory=list,
        description="Domain data entities with fields and relationships",
    )
    roles: list[Role] = Field(
        default_factory=list,
        description="User roles and their permissions",
    )
    pages: list[Page] = Field(
        default_factory=list,
        description="UI pages with routes and access control",
    )
    auth: AuthConfig = Field(
        default_factory=AuthConfig,
        description="Authentication configuration",
    )
    business_rules: list[BusinessRule] = Field(
        default_factory=list,
        description="Business constraints and rules",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="Assumptions made where prompt was ambiguous",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="LLM confidence score for the extraction (0.0 – 1.0)",
    )


# ── API response wrapper ───────────────────────────────────────────────────────

class IntentResponse(BaseModel):
    run_id: str
    stage: str = "intent"
    status: str = "success"
    result: IntentResult
    execution_ms: int
