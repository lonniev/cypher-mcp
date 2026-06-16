"""Query catalog — the L2 layer (what is *possible*).

A per-operator Neon table mapping a stable, human-meaningful ``key``
(e.g. ``holdings_by_sector``) to a vetted, parameterized Cypher template
plus a parameter schema. Price lives on the pricing model (Tollbooth),
NOT here — see the Pricing-on-the-Entry decision in the project brain.

This module is the *authoring* boundary: raw Cypher moved here from the
patron, so it pairs with the anti-injection guardrails (params bind as
Cypher ``$params`` at execution, never string-interpolated; templates are
checked at author time to reference every declared param as ``$name``).

Persistence reuses the operator's bootstrapped NeonVault via its HTTP SQL
helper (``_execute``) and schema-prefix helper (``_t``) — the Neon HTTP API
ignores ``search_path``, so table names must be schema-qualified, and it
returns affected-row counts under the camelCase key ``rowCount``.
"""

from __future__ import annotations

import json
from typing import Any

TABLE = "query_catalog"

# Accepted param types in the crude phase. A richer schema language
# (jsonschema / dynamic pydantic models) is the L3-phase upgrade.
_TYPE_CHECKS: dict[str, Any] = {
    "string": lambda v: isinstance(v, str),
    "int": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "float": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "bool": lambda v: isinstance(v, bool),
    "list": lambda v: isinstance(v, list),
}


async def ensure_schema(vault: Any) -> None:
    """Create the per-operator query_catalog table if absent."""
    await vault._execute(
        f"CREATE TABLE IF NOT EXISTS {vault._t(TABLE)} ("
        "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"
        "  operator TEXT NOT NULL,"
        "  key TEXT NOT NULL,"
        "  cypher_template TEXT NOT NULL,"
        "  param_schema JSONB NOT NULL DEFAULT '{}'::jsonb,"
        "  description TEXT NOT NULL DEFAULT '',"
        "  access_mode TEXT NOT NULL DEFAULT 'read',"
        "  row_limit INT NOT NULL DEFAULT 1000,"
        "  timeout_ms INT NOT NULL DEFAULT 5000,"
        "  created_at TIMESTAMPTZ DEFAULT now(),"
        "  updated_at TIMESTAMPTZ DEFAULT now(),"
        "  UNIQUE (operator, key)"
        ")"
    )


def _row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    """Normalize a Neon row — JSONB may arrive parsed or as a string."""
    out = dict(row)
    schema = out.get("param_schema")
    if isinstance(schema, str):
        try:
            out["param_schema"] = json.loads(schema)
        except (ValueError, TypeError):
            out["param_schema"] = {}
    elif schema is None:
        out["param_schema"] = {}
    return out


async def get(vault: Any, operator: str, key: str) -> dict[str, Any] | None:
    """Return the catalog row for (operator, key), or None."""
    result = await vault._execute(
        f"SELECT key, cypher_template, param_schema, description, "
        f"access_mode, row_limit, timeout_ms "
        f"FROM {vault._t(TABLE)} WHERE operator = $1 AND key = $2",
        [operator, key],
    )
    rows = result.get("rows") or []
    return _row_to_dict(rows[0]) if rows else None


async def list_keys(vault: Any, operator: str) -> list[dict[str, Any]]:
    """Return key + description + param_schema for every published query."""
    result = await vault._execute(
        f"SELECT key, description, param_schema, access_mode "
        f"FROM {vault._t(TABLE)} WHERE operator = $1 ORDER BY key",
        [operator],
    )
    return [_row_to_dict(r) for r in (result.get("rows") or [])]


async def upsert(
    vault: Any,
    operator: str,
    key: str,
    cypher_template: str,
    param_schema: dict[str, Any],
    *,
    description: str = "",
    access_mode: str = "read",
    row_limit: int = 1000,
    timeout_ms: int = 5000,
) -> None:
    """Insert or update a catalog row, keyed by (operator, key)."""
    await vault._execute(
        f"INSERT INTO {vault._t(TABLE)} "
        "(operator, key, cypher_template, param_schema, description, "
        " access_mode, row_limit, timeout_ms) "
        "VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8) "
        "ON CONFLICT (operator, key) DO UPDATE SET "
        "  cypher_template = EXCLUDED.cypher_template,"
        "  param_schema = EXCLUDED.param_schema,"
        "  description = EXCLUDED.description,"
        "  access_mode = EXCLUDED.access_mode,"
        "  row_limit = EXCLUDED.row_limit,"
        "  timeout_ms = EXCLUDED.timeout_ms,"
        "  updated_at = now()",
        [
            operator,
            key,
            cypher_template,
            json.dumps(param_schema or {}),
            description,
            access_mode,
            row_limit,
            timeout_ms,
        ],
    )


async def delete(vault: Any, operator: str, key: str) -> bool:
    """Delete a catalog row. Returns True if a row was removed."""
    result = await vault._execute(
        f"DELETE FROM {vault._t(TABLE)} WHERE operator = $1 AND key = $2",
        [operator, key],
    )
    # Neon HTTP API returns affected rows under camelCase "rowCount".
    return (result.get("rowCount", 0) or 0) > 0


def validate_param_schema(param_schema: dict[str, Any]) -> list[str]:
    """Validate the author-supplied param schema shape. Returns errors."""
    errors: list[str] = []
    if not isinstance(param_schema, dict):
        return ["param_schema must be an object mapping param name -> spec"]
    for name, spec in param_schema.items():
        if not isinstance(spec, dict):
            errors.append(f"param '{name}' spec must be an object")
            continue
        t = spec.get("type", "string")
        if t not in _TYPE_CHECKS:
            errors.append(
                f"param '{name}' has unknown type '{t}' "
                f"(allowed: {', '.join(sorted(_TYPE_CHECKS))})"
            )
    return errors


def assert_parameterized(
    cypher_template: str, param_schema: dict[str, Any]
) -> str | None:
    """Anti-injection author-time guard.

    Every declared param must be referenced in the template as ``$name``.
    This nudges operators toward parameter binding and away from building
    query text by interpolation. The hard guarantee is at execution
    (params bind as Cypher ``$params``); this is the author-side check.
    Returns an error string, or None if the template is well-formed.
    """
    missing = [
        name
        for name in (param_schema or {})
        if f"${name}" not in cypher_template
    ]
    if missing:
        return (
            "every declared param must appear in the template as $name; "
            f"missing: {', '.join(sorted(missing))}"
        )
    return None


def validate_params(
    param_schema: dict[str, Any], params: dict[str, Any] | None
) -> list[str]:
    """Validate incoming params against the stored schema. Returns errors.

    Fails cheap, before any Bolt connection. Rejects missing required
    params, type mismatches, and unexpected params (tight surface).
    """
    errors: list[str] = []
    params = params or {}
    schema = param_schema or {}

    for name, spec in schema.items():
        required = spec.get("required", True)
        if name not in params:
            if required:
                errors.append(f"missing required param '{name}'")
            continue
        t = spec.get("type", "string")
        check = _TYPE_CHECKS.get(t)
        if check and not check(params[name]):
            errors.append(f"param '{name}' must be of type {t}")

    for name in params:
        if name not in schema:
            errors.append(f"unexpected param '{name}'")

    return errors
