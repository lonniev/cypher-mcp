"""cypher-mcp — Monetized Graph Answers MCP Server.

A conventional Tollbooth-DPYC Operator (sibling of tollbooth-sample /
schwab-mcp). Standard DPYC tools — balance, purchase, Secure Courier,
proof, pricing, Oracle, constraints — come from ``register_standard_tools``
in the tollbooth-dpyc wheel. Only the domain plane is defined here:

  * ``execute_query_by_key`` — the one priced patron tool: run an
    operator-authored, parameterized, named Cypher query from the catalog.
  * ``create_query`` / ``update_query`` / ``get_query`` / ``list_queries``
    / ``delete_query`` — operator-only (restricted), unpriced authoring of
    the query catalog.

Crude phase: one flat price for any key (conventional per-tool pricing).
Per-key/per-product pricing is the deferred L3 parametric-pricing work.

Run locally:
    python -m cypher_mcp.server
"""

from __future__ import annotations

import logging
from typing import Annotated, Any
from urllib.parse import quote

from pydantic import Field

from fastmcp import FastMCP

from tollbooth.tool_identity import ToolIdentity, STANDARD_IDENTITIES
from tollbooth.runtime import OperatorRuntime, register_standard_tools
from tollbooth.credential_templates import CredentialTemplate, FieldSpec
from tollbooth.credential_validators import validate_btcpay_creds
from tollbooth.dynamic_tools import validate_param_schema, validate_params

from cypher_mcp import __version__, catalog, graph

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FastMCP app
# ---------------------------------------------------------------------------

mcp = FastMCP(
    "cypher-mcp",
    instructions=(
        "Cypher MCP — monetized graph answers over Bitcoin Lightning "
        "micropayments. This operator sells operator-authored, parameterized, "
        "named Cypher query templates ('priced answers'), never raw database "
        "access.\n\n"
        "## For patrons\n"
        "Call `cypher_execute_query_by_key(key, params)` to run a published "
        "query. Use `cypher_check_price` to preview cost and "
        "`cypher_check_balance` to see your balance. You supply only the "
        "parameters; the operator owns the query.\n\n"
        "## For the operator (onboarding)\n"
        "Call `cypher_get_operator_onboarding_status` to check readiness.\n"
        "1. Register with an Authority (provides a Neon database automatically).\n"
        "2. Deliver operator secrets via Secure Courier "
        "(`cypher_request_credential_channel`, service='cypher-operator'):\n"
        "   - neo4j_uri, neo4j_user, neo4j_password (the graph store)\n"
        "   - btcpay_host, btcpay_api_key, btcpay_store_id (Lightning)\n"
        "3. Author your catalog with `cypher_create_query`, then patrons can "
        "execute by key.\n"
        "4. Optionally `cypher_publish_tool(key)` to expose a query as a "
        "named, typed tool (e.g. `cypher_find_airline_flights(from_city, "
        "to_city)`). Published tools start unpriced — set their price in "
        "Pricing Studio like any new tool."
    ),
)

# ---------------------------------------------------------------------------
# Tool registry (domain tools only — standard identities live in the wheel)
# ---------------------------------------------------------------------------

# Frozen UUIDs — declared once at tool birth, never changed. Generated via
# capability_uuid("<capability>") against the wheel's DPYC namespace, then
# pinned here so renaming a function never orphans pricing-model rows.
EXECUTE_QUERY_BY_KEY_UUID = "37df55cd-2384-55fa-8411-855165bda9db"
CREATE_QUERY_UUID         = "13b43218-02f0-50cc-90c0-4c4b4e56654c"
UPDATE_QUERY_UUID         = "c9d1360f-0626-50b3-940a-d378931a0453"
GET_QUERY_UUID            = "096a25b2-2b03-579d-8af2-c72dad9b4b20"
LIST_QUERIES_UUID         = "7ba73b4f-5993-5ef5-8aad-ca3a4c99d5e2"
DELETE_QUERY_UUID         = "0151ecef-9528-5705-8f94-af9a5975014b"
PUBLISH_TOOL_UUID         = "53625966-b026-5b5d-90db-056a24a9a6bf"
UNPUBLISH_TOOL_UUID       = "248d328a-f7e0-50a1-b3d9-369d3e4372c0"

_DOMAIN_TOOLS = [
    # The one priced patron tool. Flat starter price; operator reprices in Neon.
    ToolIdentity(
        tool_id=EXECUTE_QUERY_BY_KEY_UUID,
        capability="execute_query_by_key",
        category="read",
        intent="Execute a published, parameterized Cypher query by key.",
        pricing_hint_type="flat",
        pricing_hint_value=5,
    ),
    # Operator-only authoring plane — restricted (operator-proof) + unpriced.
    ToolIdentity(
        tool_id=CREATE_QUERY_UUID, capability="create_query", category="restricted",
        intent="Operator-only: add a named Cypher query template to the catalog.",
    ),
    ToolIdentity(
        tool_id=UPDATE_QUERY_UUID, capability="update_query", category="restricted",
        intent="Operator-only: update an existing named Cypher query template.",
    ),
    ToolIdentity(
        tool_id=GET_QUERY_UUID, capability="get_query", category="restricted",
        intent="Operator-only: fetch one catalog entry (template + schema).",
    ),
    ToolIdentity(
        tool_id=LIST_QUERIES_UUID, capability="list_queries", category="restricted",
        intent="Operator-only: list the catalog's published query keys.",
    ),
    ToolIdentity(
        tool_id=DELETE_QUERY_UUID, capability="delete_query", category="restricted",
        intent="Operator-only: delete a catalog entry.",
    ),
    # Tool-synthesis plane — publish/retire a query as a named, typed tool.
    ToolIdentity(
        tool_id=PUBLISH_TOOL_UUID, capability="publish_tool", category="restricted",
        intent="Operator-only: expose a catalog query as a named, individually-priced MCP tool.",
    ),
    ToolIdentity(
        tool_id=UNPUBLISH_TOOL_UUID, capability="unpublish_tool", category="restricted",
        intent="Operator-only: remove a previously published named tool.",
    ),
]

TOOL_REGISTRY: dict[str, ToolIdentity] = {ti.tool_id: ti for ti in _DOMAIN_TOOLS}


# ---------------------------------------------------------------------------
# Credential validation — BTCPay trio (reused) + Neo4j Bolt trio
# ---------------------------------------------------------------------------


def validate_operator_creds(creds: dict[str, str]) -> list[str]:
    """Validate the combined operator credential set (BTCPay + Neo4j)."""
    errors = list(validate_btcpay_creds(creds))
    for field in ("neo4j_uri", "neo4j_user", "neo4j_password"):
        if not (creds.get(field) or "").strip():
            errors.append(f"{field} is missing or empty.")
    uri = (creds.get("neo4j_uri") or "").strip()
    if uri and not uri.startswith(("neo4j", "bolt")):
        errors.append(
            "neo4j_uri must start with neo4j:// , neo4j+s:// , bolt:// , "
            "or bolt+s:// ."
        )
    return errors


# ---------------------------------------------------------------------------
# OperatorRuntime
# ---------------------------------------------------------------------------

runtime = OperatorRuntime(
    tool_registry={**STANDARD_IDENTITIES, **TOOL_REGISTRY},
    operator_credential_template=CredentialTemplate(
        service="cypher-operator",
        version=1,
        description="Neo4j Bolt store + BTCPay Lightning credentials",
        fields={
            "neo4j_uri": FieldSpec(
                required=True, sensitive=True,
                description="Bolt URI of your Neo4j store "
                            "(e.g. neo4j+s://xxxx.databases.neo4j.io).",
            ),
            "neo4j_user": FieldSpec(
                required=True, sensitive=True,
                description="Neo4j username (e.g. 'neo4j').",
            ),
            "neo4j_password": FieldSpec(
                required=True, sensitive=True,
                description="Neo4j password.",
            ),
            "btcpay_host": FieldSpec(
                required=True, sensitive=True,
                description="URL of your BTCPay Server instance "
                            "(e.g. https://btcpay.example.com).",
            ),
            "btcpay_api_key": FieldSpec(
                required=True, sensitive=True,
                description="Your BTCPay Server API key.",
            ),
            "btcpay_store_id": FieldSpec(
                required=True, sensitive=True,
                description="Your BTCPay Store ID.",
            ),
        },
    ),
    operator_credential_greeting=(
        "Hi — I'm Cypher MCP, a graph-answers service. You (or your AI "
        "agent) requested a credential channel to deliver Neo4j and BTCPay "
        "secrets."
    ),
    service_name="cypher-mcp",
    credential_validator=validate_operator_creds,
)

# ---------------------------------------------------------------------------
# Register all standard DPYC tools from the wheel
# ---------------------------------------------------------------------------

tool = register_standard_tools(
    mcp,
    "cypher",
    runtime,
    service_name="cypher-mcp",
    service_version=__version__,
)


# ---------------------------------------------------------------------------
# Catalog bootstrap (idempotent, once per process)
# ---------------------------------------------------------------------------

_catalog_ready = False
_tools_materialized = False


async def _ensure_catalog() -> Any:
    """Return the NeonVault, ensuring the query_catalog table exists once
    and that published named tools are materialized once per process."""
    global _catalog_ready, _tools_materialized
    vault = await runtime.vault()
    if not _catalog_ready:
        await catalog.ensure_schema(vault)
        _catalog_ready = True
    if not _tools_materialized:
        await _materialize_published(vault)
        _tools_materialized = True
    return vault


async def _materialize_published(vault: Any) -> None:
    """Re-register every catalog entry published as a named tool.

    The process is stateless on Horizon, so published tools are rebuilt from
    the catalog on each cold start. Best-effort and idempotent — a failure to
    materialize one tool never blocks the rest (or the call that triggered
    this). Clients reconnect to observe synthesized tools (dynamic tool-list
    changes need a reconnect on Horizon).
    """
    try:
        rows = await catalog.list_published(vault, runtime.operator_npub())
    except Exception:
        logger.warning("could not load published tools for materialization", exc_info=True)
        return
    for row in rows:
        key = row.get("key", "")
        try:
            runtime.register_dynamic_tool(
                name=key,
                param_schema=row.get("param_schema") or {},
                runner=_make_runner(key),
                intent=row.get("tool_intent") or row.get("description") or "",
                category="read",
            )
        except Exception:
            logger.warning("failed to materialize named tool '%s'", key, exc_info=True)


# ---------------------------------------------------------------------------
# Consumption plane — the one priced patron tool
# ---------------------------------------------------------------------------


async def _run_named_query(
    key: str,
    params: dict[str, Any] | None,
    npub: str,
    proof: str,
) -> dict[str, Any]:
    """Shared executor: resolve a published query by key, validate, run it.

    Used by both the generic ``execute_query_by_key`` and every synthesized
    named tool. Raises ``ValueError`` for an unknown key, invalid params, or
    undelivered credentials so the caller's ``@paid_tool`` wrapper rolls back
    the debit (refund-on-raise). ``npub`` / ``proof`` are taken for parity
    with the dynamic-tool runner contract; identity gating already happened at
    the wrapper, and parameters bind as Cypher ``$params`` (never interpolated).
    """
    vault = await _ensure_catalog()
    row = await catalog.get(vault, runtime.operator_npub(), key)
    if row is None:
        # Refund-on-raise: patron is not charged for an unknown key.
        raise ValueError(
            f"No published query named '{key}'. Ask the operator which keys "
            "are available."
        )

    errors = validate_params(row["param_schema"], params)
    if errors:
        raise ValueError("Invalid parameters: " + "; ".join(errors))

    creds = await runtime.load_credentials(
        ["neo4j_uri", "neo4j_user", "neo4j_password"],
        service="cypher-operator",
    )
    if not all(creds.get(f) for f in ("neo4j_uri", "neo4j_user", "neo4j_password")):
        # Lifecycle situation: operator has not delivered graph credentials.
        # Raise so the patron is refunded — they shouldn't pay before the
        # operator is ready.
        raise ValueError(
            "This operator has not delivered Neo4j credentials yet. "
            "Graph queries are unavailable until onboarding completes."
        )

    return await graph.run_named(
        uri=creds["neo4j_uri"],
        user=creds["neo4j_user"],
        password=creds["neo4j_password"],
        cypher=row["cypher_template"],
        params=params or {},
        access_mode=row.get("access_mode", "read"),
        row_limit=row.get("row_limit", 1000),
        timeout_ms=row.get("timeout_ms", 5000),
    )


def _make_runner(key: str):
    """Build a dynamic-tool runner bound to a catalog ``key``.

    Matches the wheel's runner contract ``async (params, npub, proof) -> dict``
    and funnels through the one shared executor.
    """
    async def runner(
        params: dict[str, Any], npub: str, proof: str
    ) -> dict[str, Any]:
        return await _run_named_query(key, params, npub, proof)

    return runner


@tool
@runtime.paid_tool(EXECUTE_QUERY_BY_KEY_UUID)
async def execute_query_by_key(
    key: str,
    params: dict[str, Any] | None = None,
    npub: Annotated[str, Field(description="Required. Your Nostr public key (npub1...) for credit billing.")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Execute a published, parameterized Cypher query by its key.

    You supply the key of an operator-published query plus its parameters.
    The operator owns the query text; you never see or write raw Cypher. If
    the operator has published a query as a named tool (e.g.
    ``cypher_find_airline_flights``), you can call that directly instead.

    Billing note: you are charged only for a delivered answer. If the key
    is unknown, the parameters are invalid, or the query fails, the call
    raises and your debit is rolled back (no charge for value not delivered).

    Args:
        key: The published query key (e.g. 'holdings_by_sector').
        params: Parameters for the query — bound as Cypher $params, never
            interpolated. Must match the query's declared schema.
    """
    return await _run_named_query(key, params, npub, proof)


# ---------------------------------------------------------------------------
# Authoring plane — operator-only (restricted), unpriced catalog CRUD
# ---------------------------------------------------------------------------


@tool
@runtime.paid_tool(CREATE_QUERY_UUID)
async def create_query(
    key: str,
    cypher_template: str,
    param_schema: dict[str, Any] | None = None,
    description: str = "",
    access_mode: str = "read",
    row_limit: int = 1000,
    timeout_ms: int = 5000,
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: publish a new named Cypher query template.

    The template must reference each declared parameter as $name (binding,
    not interpolation). param_schema maps param name -> {"type": ...,
    "required": true|false}; types: string, int, float, bool, list.

    Args:
        key: Stable, human-meaningful key (e.g. 'holdings_by_sector').
        cypher_template: Parameterized Cypher using $param placeholders.
        param_schema: Declared parameters and their types.
        description: Human-readable description of what the query returns.
        access_mode: 'read' (default) or 'write'.
        row_limit: Max rows returned (default 1000).
        timeout_ms: Best-effort query timeout (default 5000).
    """
    param_schema = param_schema or {}
    if errs := validate_param_schema(param_schema):
        return {"success": False, "error": "; ".join(errs)}
    if err := catalog.assert_parameterized(cypher_template, param_schema):
        return {"success": False, "error": err}

    vault = await _ensure_catalog()
    operator = runtime.operator_npub()
    if await catalog.get(vault, operator, key) is not None:
        return {
            "success": False,
            "error": f"Query '{key}' already exists. Use update_query to change it.",
        }
    await catalog.upsert(
        vault, operator, key, cypher_template, param_schema,
        description=description, access_mode=access_mode,
        row_limit=row_limit, timeout_ms=timeout_ms,
    )
    return {"success": True, "key": key, "message": f"Published query '{key}'."}


@tool
@runtime.paid_tool(UPDATE_QUERY_UUID)
async def update_query(
    key: str,
    cypher_template: str,
    param_schema: dict[str, Any] | None = None,
    description: str = "",
    access_mode: str = "read",
    row_limit: int = 1000,
    timeout_ms: int = 5000,
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: update an existing named Cypher query template.

    Same shape as create_query, but the key must already exist.
    """
    param_schema = param_schema or {}
    if errs := validate_param_schema(param_schema):
        return {"success": False, "error": "; ".join(errs)}
    if err := catalog.assert_parameterized(cypher_template, param_schema):
        return {"success": False, "error": err}

    vault = await _ensure_catalog()
    operator = runtime.operator_npub()
    if await catalog.get(vault, operator, key) is None:
        return {
            "success": False,
            "error": f"Query '{key}' does not exist. Use create_query to add it.",
        }
    await catalog.upsert(
        vault, operator, key, cypher_template, param_schema,
        description=description, access_mode=access_mode,
        row_limit=row_limit, timeout_ms=timeout_ms,
    )
    return {"success": True, "key": key, "message": f"Updated query '{key}'."}


def _edit_url(neo4j_uri: str, cypher: str) -> str:
    """Pure builder: a hosted-Neo4j-Browser deep link that opens ``cypher`` in
    EDIT mode (``cmd=edit``) against ``neo4j_uri``. Returns "" if either is
    empty. Values are URL-encoded so the link is well-formed regardless of
    spaces / newlines in the Cypher.
    """
    if not neo4j_uri or not cypher:
        return ""
    params = (
        f"dbms={quote(neo4j_uri, safe='')}"
        "&db=neo4j"
        f"&cmd=edit&arg={quote(cypher, safe='')}"
    )
    return f"https://browser.neo4j.io/?{params}"


async def _browser_edit_url(cypher: str) -> str:
    """Resolve this operator's neo4j_uri and build the Browser edit link for
    ``cypher``. Best-effort — returns "" if creds aren't delivered yet; the
    link is a convenience, never load-bearing (the raw template is always in
    the response as a paste fallback). The neo4j_uri is used only in this
    operator-only context (never reaches patrons); the password is deliberately
    NOT in the link — the analyst authenticates once per browser session.
    """
    try:
        creds = await runtime.load_credentials(["neo4j_uri"], service="cypher-operator")
    except Exception:
        return ""
    return _edit_url((creds or {}).get("neo4j_uri") or "", cypher)


@tool
@runtime.paid_tool(GET_QUERY_UUID)
async def get_query(
    key: str,
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: fetch one catalog entry (template + schema + metadata).

    Includes ``edit_url`` — a one-click deep link into the hosted Neo4j Browser
    that pre-targets this operator's AuraDB and loads the template in EDIT mode,
    so the analyst refines it in Neo4j's own UI and saves it back with
    ``update_query``. Omitted if the operator's Neo4j credentials aren't
    delivered yet (best-effort; the raw template is always present to paste).
    """
    vault = await _ensure_catalog()
    row = await catalog.get(vault, runtime.operator_npub(), key)
    if row is None:
        return {"success": False, "error": f"Query '{key}' not found."}
    result: dict[str, Any] = {"success": True, "query": row}
    edit_url = await _browser_edit_url(row.get("cypher_template", ""))
    if edit_url:
        result["edit_url"] = edit_url
    return result


@tool
@runtime.paid_tool(LIST_QUERIES_UUID)
async def list_queries(
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: list this operator's published query keys."""
    vault = await _ensure_catalog()
    queries = await catalog.list_keys(vault, runtime.operator_npub())
    return {"success": True, "count": len(queries), "queries": queries}


@tool
@runtime.paid_tool(DELETE_QUERY_UUID)
async def delete_query(
    key: str,
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: delete a catalog entry by key."""
    vault = await _ensure_catalog()
    removed = await catalog.delete(vault, runtime.operator_npub(), key)
    if not removed:
        return {"success": False, "error": f"Query '{key}' not found."}
    return {"success": True, "key": key, "message": f"Deleted query '{key}'."}


# ---------------------------------------------------------------------------
# Tool-synthesis plane — publish a query as a named, typed MCP tool
# ---------------------------------------------------------------------------


@tool
@runtime.paid_tool(PUBLISH_TOOL_UUID)
async def publish_tool(
    key: str,
    tool_intent: str = "",
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: expose a catalog query as a named, typed MCP tool.

    Projects the published query as a first-class tool named ``cypher_<key>``
    whose flat, typed parameters come from the query's param schema (e.g.
    ``cypher_find_airline_flights(from_city, to_city)``). The tool is registered
    immediately but starts **unpriced** — it appears in Pricing Studio like any
    new tool; set its price there. Until priced, calls return "not priced yet
    (TBD)". Patrons then call it by name with typed params instead of
    ``execute_query_by_key``.

    The key must be a valid tool identifier (^[a-z][a-z0-9_]*$). Reconnect to
    see the new tool in the tool list.

    Args:
        key: An existing catalog query key (see ``list_queries``).
        tool_intent: One-line description shown as the tool's purpose
            (defaults to the query's description).
    """
    vault = await _ensure_catalog()
    operator = runtime.operator_npub()
    row = await catalog.get(vault, operator, key)
    if row is None:
        return {"success": False, "error": f"Query '{key}' not found. Create it first."}

    intent = tool_intent or row.get("description") or ""
    # register_dynamic_tool validates the key + schema and raises on bad input
    # (surfaced by @paid_tool as tool_input_invalid); persist only on success.
    tool_name = runtime.register_dynamic_tool(
        name=key,
        param_schema=row.get("param_schema") or {},
        runner=_make_runner(key),
        intent=intent,
        category="read",
    )
    await catalog.set_as_tool(vault, operator, key, True, intent)
    return {
        "success": True,
        "tool_name": tool_name,
        "message": (
            f"Published '{tool_name}'. It is unpriced — set its price in Pricing "
            "Studio (it now appears there like any new tool); until then calls "
            "return 'not priced yet (TBD)'. Reconnect to see it in the tool list."
        ),
    }


@tool
@runtime.paid_tool(UNPUBLISH_TOOL_UUID)
async def unpublish_tool(
    key: str,
    npub: Annotated[str, Field(description="Required. The operator's npub (npub1...).")] = "",
    proof: str = "",
) -> dict[str, Any]:
    """Operator-only: retire a previously published named tool.

    The catalog query itself is kept (still runnable via
    ``execute_query_by_key``); only its projected named tool is removed.
    Reconnect to see it disappear from the tool list.
    """
    vault = await _ensure_catalog()
    operator = runtime.operator_npub()
    if await catalog.get(vault, operator, key) is None:
        return {"success": False, "error": f"Query '{key}' not found."}
    await catalog.set_as_tool(vault, operator, key, False, "")
    removed = runtime.unregister_dynamic_tool(key, _quiet=True)
    return {
        "success": True,
        "key": key,
        "removed": removed,
        "message": f"Unpublished the named tool for '{key}'. Reconnect to refresh the tool list.",
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """Main entry point for the server."""
    from tollbooth import validate_operator_tools

    missing = validate_operator_tools(mcp, "cypher")
    if missing:
        import sys

        print(
            f"⚠ Missing base-catalog tools: {', '.join(missing)}",
            file=sys.stderr,
        )
    mcp.run()


if __name__ == "__main__":
    main()
