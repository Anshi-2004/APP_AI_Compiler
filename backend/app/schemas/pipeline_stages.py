"""
Validation, Repair, and Runtime Pydantic schemas — Phase 3 full implementation.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ValidationCheck(BaseModel):
    """A single validation check result."""

    id: str
    rule: str = Field(..., description="Machine-readable rule name")
    category: Literal[
        "json", "ui", "api", "database", "cross_layer", "logical"
    ]
    severity: Literal["pass", "warning", "error"]
    message: str
    layer: Literal["ui", "api", "database", "auth", "cross-layer", "business_logic"]
    field: str | None = None
    details: dict[str, Any] | None = None
    suggestion: str | None = None


class ValidationCategoryResult(BaseModel):
    """Results for one validation category."""

    category: str
    total: int
    passed: int
    warnings: int
    errors: int
    checks: list[ValidationCheck] = Field(default_factory=list)


class ValidationReport(BaseModel):
    """
    Complete validation report across all 6 categories.
    Output of the Validation Engine.
    """

    # Per-category results
    json_validation: ValidationCategoryResult
    ui_validation: ValidationCategoryResult
    api_validation: ValidationCategoryResult
    db_validation: ValidationCategoryResult
    cross_layer_validation: ValidationCategoryResult
    logical_validation: ValidationCategoryResult

    # Aggregated totals
    total_checks: int
    passed: int
    warnings: int
    errors: int
    score: float = Field(
        ..., ge=0.0, le=100.0, description="Validation score 0–100"
    )

    # Which schema sections failed (used by Repair Engine for targeted regen)
    failed_sections: list[
        Literal["ui", "api", "database", "auth", "business_logic"]
    ] = Field(default_factory=list)

    @classmethod
    def aggregate(cls, categories: list[ValidationCategoryResult], failed_sections: list[str]) -> "ValidationReport":
        total = sum(c.total for c in categories)
        passed = sum(c.passed for c in categories)
        warnings = sum(c.warnings for c in categories)
        errors = sum(c.errors for c in categories)
        score = round((passed / total * 100) if total > 0 else 100.0, 1)
        cat_map = {c.category: c for c in categories}
        return cls(
            json_validation=cat_map["json"],
            ui_validation=cat_map["ui"],
            api_validation=cat_map["api"],
            db_validation=cat_map["database"],
            cross_layer_validation=cat_map["cross_layer"],
            logical_validation=cat_map["logical"],
            total_checks=total,
            passed=passed,
            warnings=warnings,
            errors=errors,
            score=score,
            failed_sections=failed_sections,
        )


class ValidationResponse(BaseModel):
    run_id: str
    stage: str = "validation"
    status: str
    result: ValidationReport
    execution_ms: int


# ═══════════════════════════════════════════════════════════════════════════════
# REPAIR SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class RepairRecord(BaseModel):
    """
    Complete audit record for a single repair action.
    Stored in the repair_history table and returned in the API.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    section: Literal["ui", "api", "database", "auth", "business_logic"]
    original_json: dict[str, Any]
    error: str
    repair_reason: str
    updated_json: dict[str, Any]
    repair_time_ms: int
    success: bool
    error_count: int = Field(default=0, description="Number of errors in this section before repair")
    errors_fixed: int = Field(default=0, description="Number of errors resolved by this repair")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RepairAction(BaseModel):
    """Lightweight repair action summary (used in lists)."""

    id: str
    error_id: str
    description: str
    original: str
    repaired: str
    applied: bool = False
    section: str = ""


class RepairReport(BaseModel):
    """Output of the Repair Engine — summary across all sections."""

    total_errors: int
    repaired: int
    failed: int
    sections_repaired: list[str] = Field(default_factory=list)
    sections_failed: list[str] = Field(default_factory=list)
    actions: list[RepairAction] = Field(default_factory=list)
    records: list[RepairRecord] = Field(default_factory=list)


class RepairResponse(BaseModel):
    run_id: str
    stage: str = "repair"
    status: str
    result: RepairReport
    execution_ms: int


# ═══════════════════════════════════════════════════════════════════════════════
# RUNTIME SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class RuntimeFile(BaseModel):
    path: str
    type: Literal["page", "api", "component", "schema", "config"]
    content: str | None = None


class RuntimeResult(BaseModel):
    """Output of the Runtime Execution service (Phase 7)."""

    files: list[RuntimeFile] = Field(default_factory=list)
    pages: list[str] = Field(default_factory=list)
    apis: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    execution_time_ms: int | None = None
    status: str = "success"
    build_logs: list[str] = Field(default_factory=list)
    preview_url: str | None = None
    download_url: str | None = None


class RuntimeResponse(BaseModel):
    run_id: str
    stage: str = "runtime"
    status: str
    result: RuntimeResult
    execution_ms: int
