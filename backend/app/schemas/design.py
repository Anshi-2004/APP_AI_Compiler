from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.intent import IntentResult


# ── Sub-models ─────────────────────────────────────────────────────────────────

class ArchitectureComponent(BaseModel):
    """A single architectural component in the system design."""

    id: str
    name: str
    type: Literal["frontend", "backend", "database", "auth", "external", "queue", "storage"]
    technology: str = Field(..., description="e.g. Next.js, FastAPI, PostgreSQL, Stripe")
    description: str = ""
    responsibilities: list[str] = Field(default_factory=list)


class ArchitectureEdge(BaseModel):
    """Connection between two architectural components."""

    id: str
    source: str = Field(..., description="Component ID")
    target: str = Field(..., description="Component ID")
    protocol: str = Field(..., description="e.g. REST, WebSocket, SQL, gRPC")
    description: str = ""


class EntityRelationship(BaseModel):
    """Database entity relationship."""

    from_entity: str
    to_entity: str
    relationship: Literal["one-to-one", "one-to-many", "many-to-many"]
    through: str | None = Field(default=None, description="Junction table name if many-to-many")


class NavigationItem(BaseModel):
    """A navigation entry in the application's routing tree."""

    route: str
    label: str
    parent: str | None = None
    accessible_to: list[str] = Field(default_factory=list)
    is_protected: bool = True


class RoleHierarchy(BaseModel):
    """Role inheritance and permission hierarchy."""

    role: str
    inherits_from: list[str] = Field(default_factory=list)
    level: int = Field(..., description="Privilege level, higher = more access")


class DataFlow(BaseModel):
    """A data flow step describing how data moves through the system."""

    step: int
    from_component: str
    to_component: str
    action: str = Field(..., description="e.g. 'User submits checkout form'")
    data: str = Field(..., description="e.g. 'CartItem[], PaymentMethod'")


# ── Request ────────────────────────────────────────────────────────────────────

class DesignRequest(BaseModel):
    intent: IntentResult
    run_id: str


# ── LLM structured output ──────────────────────────────────────────────────────

class DesignResult(BaseModel):
    """
    Complete system architecture generated from intent.
    Input to the Schema Generation service.
    """

    architecture: list[ArchitectureComponent] = Field(
        ..., description="All system components"
    )
    connections: list[ArchitectureEdge] = Field(
        ..., description="Inter-component connections"
    )
    entity_relationships: list[EntityRelationship] = Field(
        ..., description="Database-level entity relationships"
    )
    navigation_flow: list[NavigationItem] = Field(
        ..., description="Application routing tree"
    )
    role_hierarchy: list[RoleHierarchy] = Field(
        ..., description="Role and permission hierarchy"
    )
    data_flows: list[DataFlow] = Field(
        ..., description="Key user journey data flows"
    )
    tech_stack: dict[str, str] = Field(
        ..., description="Recommended tech stack per layer, e.g. {'frontend': 'Next.js'}"
    )
    design_notes: list[str] = Field(
        default_factory=list,
        description="Architecture decisions and tradeoffs",
    )


# ── API response ───────────────────────────────────────────────────────────────

class DesignResponse(BaseModel):
    run_id: str
    stage: str = "design"
    status: str = "success"
    result: DesignResult
    execution_ms: int
