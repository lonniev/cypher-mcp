"""An omitted optional param must reach Neo4j bound to its declared default.

The regression this pins is a real outage in miniature. The audit catalog declares
``as_at_ms`` as ``{"required": False, "default": 0}`` and its Cypher references
``$as_at_ms`` unconditionally. Validation accepted the omission and returned no
error, nothing filled the default, and Neo4j was handed a statement with an
unbound parameter — so the patron got:

    {"error_code": "tool_execution_failed",
     "error": "Tool execution failed. Check operator logs."}

for a parameter the schema had told them was optional.

Worse, the two routes to the same query disagreed. ``cypher_audit_why_exists(name=…)``
worked, because ``build_dynamic_handler`` has always filled declared defaults, while
``execute_query_by_key("audit_why_exists", {"name": …})`` failed. One contract, two
answers, depending on how you arrived.

These tests assert at the boundary that matters — the params dict actually handed to
``graph.run_named`` — rather than the return value, because the bug lived entirely in
what got bound and an in-memory assertion about the result would have passed either way.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from cypher_mcp import server

_ROW = {
    "cypher_template": "MATCH (c:Capability {name: $name}) "
    "WITH c, CASE WHEN $as_at_ms <= 0 THEN timestamp() ELSE $as_at_ms END AS at "
    "RETURN c.name AS name, at",
    "param_schema": {
        "name": {"type": "string", "required": True},
        "as_at_ms": {"type": "int", "required": False, "default": 0},
    },
    "access_mode": "read",
    "row_limit": 1000,
    "timeout_ms": 5000,
}

_CREDS = {
    "neo4j_uri": "bolt://x",
    "neo4j_user": "neo4j",
    "neo4j_password": "pw",
}


async def _run(params: dict[str, Any] | None) -> dict[str, Any]:
    """Drive the by-key executor and return the params it bound."""
    captured: dict[str, Any] = {}

    async def fake_run_named(**kwargs: Any) -> dict[str, Any]:
        captured.update(kwargs.get("params") or {})
        return {"rows": [], "row_count": 0}

    with (
        patch.object(server, "_ensure_catalog", AsyncMock(return_value=object())),
        patch.object(server.runtime, "operator_npub", lambda: "npub1op"),
        patch.object(server.catalog, "get", AsyncMock(return_value=dict(_ROW))),
        patch.object(server.runtime, "load_credentials", AsyncMock(return_value=_CREDS)),
        patch.object(server.graph, "run_named", AsyncMock(side_effect=fake_run_named)),
    ):
        await server._run_named_query("audit_why_exists", params, "npub1", "tok")
    return captured


@pytest.mark.asyncio
async def test_omitted_optional_param_is_bound_to_its_declared_default() -> None:
    """The exact call that failed live: only `name` supplied."""
    bound = await _run({"name": "Audit-Answering Named Query Catalog"})
    assert bound["as_at_ms"] == 0, (
        "as_at_ms must reach Neo4j bound; leaving it out is what produced "
        "'Tool execution failed. Check operator logs.'"
    )
    assert bound["name"] == "Audit-Answering Named Query Catalog"


@pytest.mark.asyncio
async def test_every_parameter_the_template_references_is_bound() -> None:
    """Generalizes past this one param: no `$x` may arrive unbound.

    Keyed off the template text rather than a hardcoded list, so a query that
    later grows a parameter is covered without editing this test.
    """
    import re

    bound = await _run({"name": "cap"})
    referenced = set(re.findall(r"\$([a-zA-Z_][a-zA-Z0-9_]*)", _ROW["cypher_template"]))
    missing = referenced - set(bound)
    assert not missing, f"template references unbound params: {sorted(missing)}"


@pytest.mark.asyncio
async def test_a_supplied_value_is_not_overwritten_by_the_default() -> None:
    bound = await _run({"name": "cap", "as_at_ms": 1786312458499})
    assert bound["as_at_ms"] == 1786312458499


@pytest.mark.asyncio
async def test_an_undeclared_param_is_still_rejected() -> None:
    """Filling defaults must not loosen the surface validate_params guards."""
    with pytest.raises(ValueError, match="unexpected param"):
        await _run({"name": "cap", "sneaky": 1})
