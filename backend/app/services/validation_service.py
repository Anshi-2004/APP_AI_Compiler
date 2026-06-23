from __future__ import annotations

"""
Validation Engine — Phase 3 full implementation.

Six independent validators, each producing a ValidationCategoryResult:
  1. JsonValidator      — Valid JSON, required keys, data types
  2. UIValidator        — Pages, components, layout consistency
  3. APIValidator       — Endpoints, methods, I/O contracts, duplicates
  4. DatabaseValidator  — PKs, FKs, relationships, naming
  5. CrossLayerValidator— UI↔API↔DB↔Auth field consistency
  6. LogicalValidator   — Premium gating, role access, circular refs

Only failed sections are returned in `failed_sections` so the Repair
Engine can regenerate targeted sections rather than the full schema.
"""

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError as CompilerValidationError
from app.core.logging_service import LoggingService, StageTimer
from app.llm.base import BaseLLMProvider
from app.schemas.schema_gen import (
    GeneratedSchemas,
    UISchema,
    APISchema,
    DatabaseSchema,
    AuthSchema,
    BusinessLogicSchema,
)
from app.schemas.pipeline_stages import (
    ValidationCheck,
    ValidationCategoryResult,
    ValidationReport,
    ValidationResponse,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_check(
    check_id: str,
    rule: str,
    category: str,
    layer: str,
    passed: bool,
    message: str,
    field: str | None = None,
    warning: bool = False,
    suggestion: str | None = None,
    details: dict[str, Any] | None = None,
) -> ValidationCheck:
    severity = "pass" if passed else ("warning" if warning else "error")
    return ValidationCheck(
        id=check_id,
        rule=rule,
        category=category,  # type: ignore[arg-type]
        severity=severity,
        message=message,
        layer=layer,  # type: ignore[arg-type]
        field=field,
        suggestion=suggestion,
        details=details,
    )


def _summarize(category: str, checks: list[ValidationCheck]) -> ValidationCategoryResult:
    return ValidationCategoryResult(
        category=category,
        total=len(checks),
        passed=sum(1 for c in checks if c.severity == "pass"),
        warnings=sum(1 for c in checks if c.severity == "warning"),
        errors=sum(1 for c in checks if c.severity == "error"),
        checks=checks,
    )


SNAKE_CASE = re.compile(r"^[a-z][a-z0-9_]*$")


# ─────────────────────────────────────────────────────────────────────────────
# 1. JSON Validator
# ─────────────────────────────────────────────────────────────────────────────

class JsonValidator:
    """Validates structural integrity: required keys, data types, non-empty lists."""

    REQUIRED_SCHEMA_KEYS = {
        "ui": ["components", "theme", "navigation"],
        "api": ["version", "base_path", "endpoints"],
        "database": ["engine", "tables", "enums"],
        "auth": ["strategies", "token_type", "roles"],
        "business_logic": ["rules", "workflows", "events"],
    }

    EXPECTED_TYPES = {
        "ui.components": list,
        "api.endpoints": list,
        "database.tables": list,
        "auth.strategies": list,
        "auth.roles": list,
        "business_logic.rules": list,
    }

    def validate(self, schemas: GeneratedSchemas) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []
        data = schemas.model_dump()

        # Required top-level sections
        for section in ("ui", "api", "database", "auth", "business_logic"):
            checks.append(_make_check(
                f"json-section-{section}", "required_section_present",
                "json", "cross-layer",
                section in data and data[section] is not None,
                f"Section '{section}' {'present' if section in data else 'MISSING'}",
                field=section,
            ))

        # Required keys per section
        for section, keys in self.REQUIRED_SCHEMA_KEYS.items():
            section_data = data.get(section, {}) or {}
            for key in keys:
                present = key in section_data
                checks.append(_make_check(
                    f"json-key-{section}-{key}", "required_key_present",
                    "json", section,  # type: ignore[arg-type]
                    present,
                    f"'{section}.{key}' {'found' if present else 'MISSING'}",
                    field=f"{section}.{key}",
                    suggestion=f"Add '{key}' to the {section} schema" if not present else None,
                ))

        # Type checks
        for path, expected_type in self.EXPECTED_TYPES.items():
            parts = path.split(".")
            val = data
            for p in parts:
                val = (val or {}).get(p)
            correct_type = isinstance(val, expected_type)
            checks.append(_make_check(
                f"json-type-{path.replace('.', '-')}", "correct_data_type",
                "json", parts[0],  # type: ignore[arg-type]
                correct_type,
                f"'{path}' is {type(val).__name__} (expected {expected_type.__name__})",
                field=path,
            ))

            # Non-empty lists
            if expected_type is list and correct_type:
                non_empty = len(val) > 0  # type: ignore[arg-type]
                checks.append(_make_check(
                    f"json-nonempty-{path.replace('.', '-')}", "list_not_empty",
                    "json", parts[0],  # type: ignore[arg-type]
                    non_empty,
                    f"'{path}' has {len(val)} item(s)",  # type: ignore[arg-type]
                    field=path,
                    warning=not non_empty,
                ))

        return _summarize("json", checks)


# ─────────────────────────────────────────────────────────────────────────────
# 2. UI Validator
# ─────────────────────────────────────────────────────────────────────────────

class UIValidator:
    """Validates UI schema: pages, components, layout consistency, routing."""

    def validate(self, ui: UISchema) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []
        component_ids = {c.id for c in ui.components}
        has_layout = any(c.type == "layout" for c in ui.components)
        has_page = any(c.type == "page" for c in ui.components)
        routes: list[str] = []

        # Must have at least one layout and one page
        checks.append(_make_check(
            "ui-has-layout", "has_layout_component", "ui", "ui",
            has_layout,
            "UI schema has a layout component" if has_layout else "No layout component defined",
            suggestion="Add a root layout component (type='layout')" if not has_layout else None,
        ))
        checks.append(_make_check(
            "ui-has-page", "has_page_component", "ui", "ui",
            has_page,
            "UI schema has at least one page component" if has_page else "No page components defined",
        ))

        for comp in ui.components:
            cid = comp.id

            # Every component must have a non-empty name
            checks.append(_make_check(
                f"ui-name-{cid}", "component_has_name", "ui", "ui",
                bool(comp.name and comp.name.strip()),
                f"Component '{cid}' has name: {comp.name!r}",
                field=cid,
            ))

            # Page components must have a route
            if comp.type == "page":
                has_route = bool(comp.route and comp.route.startswith("/"))
                checks.append(_make_check(
                    f"ui-route-{cid}", "page_has_valid_route", "ui", "ui",
                    has_route,
                    f"Page '{comp.name}' route '{comp.route}' {'valid' if has_route else 'INVALID or missing'}",
                    field=cid,
                    suggestion="Page routes must start with '/'",
                ))
                if comp.route:
                    routes.append(comp.route)

                # Pages must declare access control
                has_access = bool(comp.accessible_to)
                checks.append(_make_check(
                    f"ui-access-{cid}", "page_has_access_control", "ui", "ui",
                    has_access,
                    f"Page '{comp.name}' accessible_to: {comp.accessible_to or 'UNDEFINED'}",
                    field=cid,
                    warning=True,
                    suggestion="Define accessible_to roles or add 'public'",
                ))

            # Children must reference valid component IDs
            for child_id in comp.children:
                valid_ref = child_id in component_ids
                checks.append(_make_check(
                    f"ui-child-ref-{cid}-{child_id}", "valid_child_reference", "ui", "ui",
                    valid_ref,
                    f"Component '{cid}' child '{child_id}' {'exists' if valid_ref else 'UNDEFINED'}",
                    field=cid,
                ))

        # Duplicate routes
        seen_routes: set[str] = set()
        for route in routes:
            is_dup = route in seen_routes
            if not is_dup:
                seen_routes.add(route)
            checks.append(_make_check(
                f"ui-dup-route-{route.replace('/', '_')}", "no_duplicate_routes", "ui", "ui",
                not is_dup,
                f"Route '{route}' {'is a DUPLICATE' if is_dup else 'is unique'}",
                field=route,
                warning=False,
            ))

        return _summarize("ui", checks)


# ─────────────────────────────────────────────────────────────────────────────
# 3. API Validator
# ─────────────────────────────────────────────────────────────────────────────

class APIValidator:
    """Validates API schema: endpoints, methods, I/O contracts, duplicates."""

    VALID_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}

    def validate(self, api: APISchema) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []
        seen: set[str] = set()

        # Base path format
        checks.append(_make_check(
            "api-base-path", "valid_base_path", "api", "api",
            api.base_path.startswith("/"),
            f"base_path '{api.base_path}' {'valid' if api.base_path.startswith('/') else 'INVALID'}",
            field="base_path",
        ))

        # Must have endpoints
        checks.append(_make_check(
            "api-has-endpoints", "has_endpoints", "api", "api",
            len(api.endpoints) > 0,
            f"API has {len(api.endpoints)} endpoints",
            warning=len(api.endpoints) == 0,
        ))

        for ep in api.endpoints:
            key = f"{ep.method}:{ep.path}"
            safe = key.replace("/", "_").replace(":", "_")

            # HTTP method valid
            checks.append(_make_check(
                f"api-method-{safe}", "valid_http_method", "api", "api",
                ep.method in self.VALID_METHODS,
                f"{ep.method} {ep.path} — method {'valid' if ep.method in self.VALID_METHODS else 'INVALID'}",
                field=ep.path,
            ))

            # Path starts with /
            checks.append(_make_check(
                f"api-path-{safe}", "valid_endpoint_path", "api", "api",
                ep.path.startswith("/"),
                f"Path '{ep.path}' {'valid' if ep.path.startswith('/') else 'must start with /'}",
                field=ep.path,
            ))

            # Response body defined
            checks.append(_make_check(
                f"api-response-{safe}", "endpoint_has_response_schema", "api", "api",
                ep.response_body is not None,
                f"{ep.method} {ep.path} response schema {'defined' if ep.response_body else 'MISSING'}",
                field=ep.path,
                warning=ep.response_body is None,
                suggestion="Add a response_body schema to document the API contract",
            ))

            # POST/PUT/PATCH must have request body
            if ep.method in ("POST", "PUT", "PATCH"):
                checks.append(_make_check(
                    f"api-reqbody-{safe}", "mutation_has_request_body", "api", "api",
                    ep.request_body is not None,
                    f"{ep.method} {ep.path} request_body {'defined' if ep.request_body else 'MISSING'}",
                    field=ep.path,
                    suggestion="Add a request_body schema for mutation endpoints",
                ))

            # Auth-protected endpoints must have roles
            if ep.auth_required and not ep.roles:
                checks.append(_make_check(
                    f"api-roles-{safe}", "protected_endpoint_has_roles", "api", "api",
                    False,
                    f"{ep.method} {ep.path} is auth_required but defines no roles",
                    field=ep.path,
                    warning=True,
                    suggestion="Specify at least one allowed role or set auth_required=false",
                ))
            else:
                checks.append(_make_check(
                    f"api-roles-{safe}", "protected_endpoint_has_roles", "api", "api",
                    True,
                    f"{ep.method} {ep.path} roles: {ep.roles or ['public']}",
                    field=ep.path,
                ))

            # Duplicate detection
            is_dup = key in seen
            checks.append(_make_check(
                f"api-dup-{safe}", "no_duplicate_endpoints", "api", "api",
                not is_dup,
                f"{key} {'DUPLICATE' if is_dup else 'unique'}",
                field=ep.path,
            ))
            seen.add(key)

        # Validate standard REST patterns are covered
        paths = {ep.path for ep in api.endpoints}
        has_health = any("/health" in p or "/status" in p for p in paths)
        checks.append(_make_check(
            "api-health-endpoint", "has_health_endpoint", "api", "api",
            has_health,
            "Health/status endpoint present" if has_health else "No health endpoint defined",
            warning=True,
            suggestion="Add GET /health for monitoring",
        ))

        return _summarize("api", checks)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Database Validator
# ─────────────────────────────────────────────────────────────────────────────

class DatabaseValidator:
    """Validates DB schema: PKs, FKs, relationships, naming conventions."""

    def validate(self, db: DatabaseSchema) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []
        table_names = {t.name for t in db.tables}

        checks.append(_make_check(
            "db-has-tables", "has_tables", "database", "database",
            len(db.tables) > 0,
            f"Database has {len(db.tables)} table(s)",
        ))

        for table in db.tables:
            tname = table.name
            field_names = {f.name for f in table.fields}

            # Snake case table name
            checks.append(_make_check(
                f"db-naming-{tname}", "snake_case_table_name", "database", "database",
                bool(SNAKE_CASE.match(tname)),
                f"Table '{tname}' naming {'valid' if SNAKE_CASE.match(tname) else 'should be snake_case'}",
                field=tname,
                warning=not bool(SNAKE_CASE.match(tname)),
            ))

            # Primary key exists
            pks = [f for f in table.fields if f.primary_key]
            checks.append(_make_check(
                f"db-pk-{tname}", "table_has_primary_key", "database", "database",
                len(pks) == 1,
                f"Table '{tname}' has {len(pks)} PK(s) (expected 1)",
                field=tname,
                suggestion="Add a UUID primary key: id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
            ))

            # PK should be UUID
            if pks:
                pk = pks[0]
                checks.append(_make_check(
                    f"db-pk-type-{tname}", "primary_key_is_uuid", "database", "database",
                    "uuid" in pk.type.lower(),
                    f"Table '{tname}' PK type is '{pk.type}' ({'OK' if 'uuid' in pk.type.lower() else 'recommend UUID'})",
                    field=tname,
                    warning="uuid" not in pk.type.lower(),
                ))

            # Audit fields
            for audit_field in ("created_at", "updated_at"):
                has_audit = audit_field in field_names
                checks.append(_make_check(
                    f"db-audit-{tname}-{audit_field}", "has_audit_timestamp", "database", "database",
                    has_audit,
                    f"Table '{tname}' has '{audit_field}': {has_audit}",
                    field=tname,
                    warning=not has_audit,
                    suggestion=f"Add {audit_field} TIMESTAMP WITH TIME ZONE",
                ))

            # Foreign key references exist
            for field in table.fields:
                if field.foreign_key:
                    ref_table = field.foreign_key.split(".")[0] if "." in field.foreign_key else field.foreign_key
                    fk_valid = ref_table in table_names
                    checks.append(_make_check(
                        f"db-fk-{tname}-{field.name}", "foreign_key_references_valid_table",
                        "database", "database",
                        fk_valid,
                        f"FK '{tname}.{field.name}' → '{field.foreign_key}' {'valid' if fk_valid else 'REFERENCES UNKNOWN TABLE'}",
                        field=f"{tname}.{field.name}",
                        suggestion=f"Ensure table '{ref_table}' exists in the schema",
                    ))

            # Snake case field names
            for field in table.fields:
                is_snake = bool(SNAKE_CASE.match(field.name))
                checks.append(_make_check(
                    f"db-field-naming-{tname}-{field.name}", "snake_case_field_name",
                    "database", "database",
                    is_snake,
                    f"Field '{tname}.{field.name}' naming {'OK' if is_snake else 'should be snake_case'}",
                    field=f"{tname}.{field.name}",
                    warning=not is_snake,
                ))

        # Circular FK detection (simple cycle check)
        fk_graph: dict[str, set[str]] = {t.name: set() for t in db.tables}
        for table in db.tables:
            for field in table.fields:
                if field.foreign_key and "." in field.foreign_key:
                    ref = field.foreign_key.split(".")[0]
                    if ref != table.name:
                        fk_graph[table.name].add(ref)

        cycles = _detect_cycles(fk_graph)
        if cycles:
            for cycle in cycles:
                checks.append(_make_check(
                    f"db-cycle-{'_'.join(cycle)}", "no_circular_foreign_keys",
                    "database", "database",
                    False,
                    f"Circular FK detected: {' → '.join(cycle)}",
                    suggestion="Break the cycle with a nullable FK or a join table",
                ))
        else:
            checks.append(_make_check(
                "db-no-cycles", "no_circular_foreign_keys", "database", "database",
                True, "No circular foreign key relationships detected",
            ))

        return _summarize("database", checks)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Cross-Layer Validator
# ─────────────────────────────────────────────────────────────────────────────

class CrossLayerValidator:
    """Validates consistency across UI, API, Database, and Auth schemas."""

    def validate(self, schemas: GeneratedSchemas) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []

        table_names = {t.name.lower() for t in schemas.database.tables}
        auth_roles = set(schemas.auth.roles)
        api_paths = {ep.path for ep in schemas.api.endpoints}
        api_base_entities = set()

        # Extract entity names from API paths (e.g. /api/v1/users → users)
        for path in api_paths:
            parts = [p for p in path.split("/") if p and not p.startswith("{")]
            if parts:
                api_base_entities.add(parts[-1].lower().rstrip("s"))  # de-pluralize

        # Check: each DB table has at least one API endpoint
        for table in schemas.database.tables:
            entity = table.name.lower().rstrip("s")
            has_api = any(
                entity in p.lower() or table.name.lower() in p.lower()
                for p in api_paths
            )
            checks.append(_make_check(
                f"cross-db-api-{table.name}", "db_table_has_api_endpoint",
                "cross_layer", "cross-layer",
                has_api,
                f"Table '{table.name}' {'has' if has_api else 'has NO'} corresponding API endpoint",
                field=table.name,
                warning=not has_api,
                suggestion=f"Add CRUD endpoints for /{table.name}",
            ))

        # Check: UI roles are defined in Auth
        ui_roles: set[str] = set()
        for comp in schemas.ui.components:
            ui_roles.update(comp.accessible_to)
        ui_roles -= {"public", "any", "guest", "authenticated"}

        for role in ui_roles:
            in_auth = role in auth_roles
            checks.append(_make_check(
                f"cross-ui-auth-role-{role}", "ui_role_in_auth_schema",
                "cross_layer", "cross-layer",
                in_auth,
                f"UI role '{role}' {'defined' if in_auth else 'UNDEFINED'} in auth schema",
                field=role,
                suggestion=f"Add role '{role}' to auth.roles",
            ))

        # Check: API roles are in Auth
        api_roles: set[str] = set()
        for ep in schemas.api.endpoints:
            api_roles.update(ep.roles)
        api_roles -= {"public", "any", "authenticated"}

        for role in api_roles:
            in_auth = role in auth_roles
            checks.append(_make_check(
                f"cross-api-auth-role-{role}", "api_role_in_auth_schema",
                "cross_layer", "cross-layer",
                in_auth,
                f"API role '{role}' {'defined' if in_auth else 'UNDEFINED'} in auth schema",
                field=role,
            ))

        # Check: Auth roles have permission definitions
        for role in auth_roles:
            has_perms = role in schemas.auth.role_permissions and bool(schemas.auth.role_permissions[role])
            checks.append(_make_check(
                f"cross-auth-perms-{role}", "role_has_permissions",
                "cross_layer", "cross-layer",
                has_perms,
                f"Role '{role}' {'has' if has_perms else 'MISSING'} permissions in auth schema",
                field=role,
                warning=not has_perms,
                suggestion=f"Define permissions for role '{role}' in auth.role_permissions",
            ))

        # Check: Business rules reference valid layers
        valid_layers = {"api", "database", "ui"}
        for rule in schemas.business_logic.rules:
            layer_ok = rule.layer in valid_layers
            checks.append(_make_check(
                f"cross-biz-layer-{rule.id}", "business_rule_valid_layer",
                "cross_layer", "cross-layer",
                layer_ok,
                f"Rule '{rule.name}' layer='{rule.layer}' {'valid' if layer_ok else 'INVALID'}",
                field=rule.id,
            ))

        # Check: Protected routes in auth exist as UI routes
        ui_routes = {c.route for c in schemas.ui.components if c.route}
        for prot_route in schemas.auth.protected_routes:
            route_ok = any(prot_route.startswith(r) or r == prot_route for r in ui_routes)
            checks.append(_make_check(
                f"cross-auth-route-{prot_route.replace('/', '_')}", "protected_route_exists",
                "cross_layer", "cross-layer",
                route_ok,
                f"Protected route '{prot_route}' {'found' if route_ok else 'NOT found'} in UI schema",
                field=prot_route,
                warning=not route_ok,
            ))

        return _summarize("cross_layer", checks)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Logical Validator
# ─────────────────────────────────────────────────────────────────────────────

class LogicalValidator:
    """Validates business logic: role access, premium gating, invalid references."""

    def validate(self, schemas: GeneratedSchemas) -> ValidationCategoryResult:
        checks: list[ValidationCheck] = []
        auth_roles = set(schemas.auth.roles)

        # Admin role must exist
        has_admin = any("admin" in r.lower() for r in auth_roles)
        checks.append(_make_check(
            "logic-admin-role", "admin_role_exists", "logical", "auth",
            has_admin,
            f"Admin role {'found' if has_admin else 'NOT defined'} in auth schema",
            warning=not has_admin,
            suggestion="Define an 'admin' role for system management",
        ))

        # Delete endpoints should be admin-only
        for ep in schemas.api.endpoints:
            if ep.method == "DELETE":
                admin_only = any("admin" in r.lower() for r in ep.roles) if ep.roles else False
                checks.append(_make_check(
                    f"logic-delete-admin-{ep.path.replace('/', '_')}", "delete_restricted_to_admin",
                    "logical", "api",
                    admin_only,
                    f"DELETE {ep.path} {'restricted to admin' if admin_only else 'allows non-admin roles'}",
                    field=ep.path,
                    warning=not admin_only,
                    suggestion="Restrict DELETE endpoints to admin role only",
                ))

        # Each business rule must have trigger and condition defined
        for rule in schemas.business_logic.rules:
            has_trigger = bool(rule.trigger and rule.trigger.strip())
            has_condition = bool(rule.condition and rule.condition.strip())
            checks.append(_make_check(
                f"logic-rule-complete-{rule.id}", "business_rule_complete",
                "logical", "business_logic",
                has_trigger and has_condition,
                f"Rule '{rule.name}' trigger={'✓' if has_trigger else '✗'} condition={'✓' if has_condition else '✗'}",
                field=rule.id,
                warning=not (has_trigger and has_condition),
            ))

        # Check for invalid self-references in DB
        for table in schemas.database.tables:
            for field in table.fields:
                if field.foreign_key:
                    ref_table = field.foreign_key.split(".")[0] if "." in field.foreign_key else field.foreign_key
                    is_self_ref = ref_table == table.name
                    # Self-references are legal (e.g. parent_id), so only warn
                    if is_self_ref:
                        checks.append(_make_check(
                            f"logic-self-ref-{table.name}-{field.name}", "self_reference_check",
                            "logical", "database",
                            True,
                            f"'{table.name}.{field.name}' self-references '{table.name}' (hierarchical data — OK)",
                            field=f"{table.name}.{field.name}",
                            warning=False,
                        ))

        # Auth: at least one strategy defined
        checks.append(_make_check(
            "logic-auth-strategies", "auth_has_strategies", "logical", "auth",
            len(schemas.auth.strategies) > 0,
            f"Auth has {len(schemas.auth.strategies)} strategy/strategies",
            suggestion="Define at least one auth strategy (email-password, google-oauth, etc.)",
        ))

        # Token expiry format sanity
        expiry = schemas.auth.token_expiry
        valid_expiry = bool(re.match(r"^\d+[smhd]$", expiry))
        checks.append(_make_check(
            "logic-token-expiry", "valid_token_expiry_format", "logical", "auth",
            valid_expiry,
            f"Token expiry '{expiry}' {'valid' if valid_expiry else 'invalid format (use: 15m, 7d, 1h)'}",
            field="token_expiry",
            warning=not valid_expiry,
        ))

        return _summarize("logical", checks)


# ─────────────────────────────────────────────────────────────────────────────
# Cycle detection helper
# ─────────────────────────────────────────────────────────────────────────────

def _detect_cycles(graph: dict[str, set[str]]) -> list[list[str]]:
    """DFS cycle detection on FK graph. Returns list of cycles found."""
    visited: set[str] = set()
    rec_stack: set[str] = set()
    cycles: list[list[str]] = []

    def dfs(node: str, path: list[str]) -> None:
        visited.add(node)
        rec_stack.add(node)
        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                dfs(neighbor, path + [neighbor])
            elif neighbor in rec_stack:
                cycle_start = path.index(neighbor) if neighbor in path else 0
                cycles.append(path[cycle_start:] + [neighbor])

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node, [node])

    return cycles


# ─────────────────────────────────────────────────────────────────────────────
# Validation Service (orchestrates all validators)
# ─────────────────────────────────────────────────────────────────────────────

class ValidationService:
    """
    Runs all 6 validation categories and returns a unified ValidationReport.
    The `failed_sections` field tells the Repair Engine which sections to target.
    """

    def __init__(self, llm: BaseLLMProvider, logger: LoggingService, db: AsyncSession) -> None:
        self._llm = llm
        self._logger = logger
        self._db = db
        self._json_v = JsonValidator()
        self._ui_v = UIValidator()
        self._api_v = APIValidator()
        self._db_v = DatabaseValidator()
        self._cross_v = CrossLayerValidator()
        self._logic_v = LogicalValidator()

    async def validate(self, schemas: GeneratedSchemas, run_id: str) -> ValidationResponse:
        rid = uuid.UUID(run_id)
        timer = StageTimer()
        timer.start()

        log_entry = await self._logger.log_stage_start(
            run_id=rid,
            stage="validation",
            input_data={
                "tables": len(schemas.database.tables),
                "endpoints": len(schemas.api.endpoints),
                "ui_components": len(schemas.ui.components),
            },
        )

        try:
            report = self._run_all_validators(schemas)
            elapsed = timer.elapsed_ms()

            status = "error" if report.errors > 0 else ("warning" if report.warnings > 0 else "success")

            await self._logger.log_stage_success(
                log=log_entry,
                output_data=report.model_dump(),
                execution_ms=elapsed,
                warnings=[
                    c.message for c in self._all_checks(report) if c.severity == "warning"
                ][:10],
            )

            return ValidationResponse(
                run_id=run_id,
                status=status,
                result=report,
                execution_ms=elapsed,
            )

        except Exception as exc:
            elapsed = timer.elapsed_ms()
            await self._logger.log_stage_error(log_entry, str(exc), elapsed)
            raise CompilerValidationError(str(exc)) from exc

    def _run_all_validators(self, schemas: GeneratedSchemas) -> ValidationReport:
        categories = [
            self._json_v.validate(schemas),
            self._ui_v.validate(schemas.ui),
            self._api_v.validate(schemas.api),
            self._db_v.validate(schemas.database),
            self._cross_v.validate(schemas),
            self._logic_v.validate(schemas),
        ]

        # Map category names to schema sections
        section_map = {"ui": "ui", "api": "api", "database": "database"}
        failed_sections: list[str] = []
        for cat in categories:
            section = section_map.get(cat.category, "")
            if section and cat.errors > 0:
                failed_sections.append(section)

        # Cross-layer failures implicate both auth and business_logic
        cross_cat = next((c for c in categories if c.category == "cross_layer"), None)
        if cross_cat and cross_cat.errors > 0:
            for sec in ("auth", "business_logic"):
                if sec not in failed_sections:
                    failed_sections.append(sec)

        return ValidationReport.aggregate(categories, failed_sections)

    @staticmethod
    def _all_checks(report: ValidationReport) -> list[ValidationCheck]:
        return (
            report.json_validation.checks
            + report.ui_validation.checks
            + report.api_validation.checks
            + report.db_validation.checks
            + report.cross_layer_validation.checks
            + report.logical_validation.checks
        )
