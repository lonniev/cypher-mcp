"""Graph value plane — ephemeral Bolt connect → run → teardown.

This is the only place a graph exists. The Tollbooth/Neon/Nostr settlement
plane never imports this module, so the backing store is swappable without
touching the MCP surface (Store-Swappability decision).

Connection lifecycle == request lifecycle: a fresh async driver per call,
no pool. A Bolt connection is live runtime state (socket, TLS, protocol
position) that cannot be serialized or shared across Horizon's cold-start
workers, so each named-query call is a complete, self-contained transaction
that opens, runs, consumes, and tears down. The per-call TCP+TLS+Bolt
handshake is the accepted trade at bootstrap volume; if cold-start overhead
ever dominates, the localized fix is Neo4j's stateless HTTP Query API —
invisible to patrons.

Parameters bind as Cypher ``$params`` (passed as a dict to ``session.run``),
NEVER string-interpolated — this is the hard anti-injection guarantee.
"""

from __future__ import annotations

from typing import Any

# Imported at module level so tests can patch cypher_mcp.graph.AsyncGraphDatabase.
from neo4j import READ_ACCESS, WRITE_ACCESS, AsyncGraphDatabase


async def run_named(
    *,
    uri: str,
    user: str,
    password: str,
    cypher: str,
    params: dict[str, Any] | None = None,
    access_mode: str = "read",
    row_limit: int = 1000,
    timeout_ms: int = 5000,
) -> dict[str, Any]:
    """Open an ephemeral Bolt session, run one named query, tear down.

    Args:
        uri: Bolt URI (e.g. ``neo4j+s://xxxx.databases.neo4j.io``).
        user, password: Operator-delivered Bolt credentials (from the vault).
        cypher: The vetted, parameterized query template (``$param`` form).
        params: Patron-supplied parameters — bound as ``$params``, never
            interpolated.
        access_mode: ``"read"`` (default) or ``"write"``.
        row_limit: Hard cap on returned rows; results are truncated past it.
        timeout_ms: Best-effort connection timeout (seconds = ms / 1000).

    Returns a dict with ``success``, ``rows``, ``row_count``, ``truncated``,
    and a small ``summary``. Raises on connection/query failure — the caller
    wraps this in ``@paid_tool`` so a failed query rolls back the patron's
    debit (value not delivered → not charged).
    """
    mode = READ_ACCESS if access_mode == "read" else WRITE_ACCESS
    timeout_s = max(0.1, timeout_ms / 1000.0)
    params = params or {}

    driver = AsyncGraphDatabase.driver(
        uri,
        auth=(user, password),
        connection_acquisition_timeout=timeout_s,
        connection_timeout=timeout_s,
    )
    try:
        async with driver.session(default_access_mode=mode) as session:
            result = await session.run(cypher, params)
            rows: list[dict[str, Any]] = []
            truncated = False
            async for record in result:
                if len(rows) >= row_limit:
                    truncated = True
                    break
                rows.append(record.data())
            summary = await result.consume()
            return {
                "success": True,
                "rows": rows,
                "row_count": len(rows),
                "truncated": truncated,
                "summary": {
                    "query_type": getattr(summary, "query_type", None),
                    "result_available_after_ms": getattr(
                        summary, "result_available_after", None
                    ),
                },
            }
    finally:
        await driver.close()
