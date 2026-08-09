"""Public, unauthenticated aggregate factory stats.

The unauthenticated landing pages need a few persuasive numbers from the
intention graph — capability count, invariant count, issues triaged, the
resolved_via mix, last activity — without ever exposing issue titles,
symbol paths, or npubs.

Constraints (issue #72):
  * aggregate counts only
  * hard process-level cache (AuraDB free tier sleeps; cold Bolt can exceed
    a named query's timeout — guests must not hammer it)
  * no proof requirement (category=free on the MCP tool)

IP rate-limiting lives at the edge (Cloudflare Pages function), not here —
Horizon tool handlers do not see a stable client IP.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger(__name__)

# Hard cache — guests share one snapshot. 5 minutes balances "live enough
# to convince" against AuraDB free-tier sleep + cold Bolt cost.
CACHE_TTL_S = 300.0

# Sequential CALL subqueries accumulate into one RETURN. Only closed-enum
# resolved_via values and integer counts leave this query — no titles,
# paths, npubs, or free-text labels.
PUBLIC_STATS_CYPHER = """
CALL { MATCH (c:Capability) RETURN count(c) AS capability_count }
CALL { MATCH (inv:Invariant) RETURN count(inv) AS invariant_count }
CALL { MATCH (i:Issue) RETURN count(i) AS issue_count }
CALL { MATCH (s:Service) RETURN count(s) AS service_count }
CALL { MATCH (sym:Symbol) RETURN count(sym) AS symbol_count }
CALL {
  MATCH (i:Issue)
  WHERE i.resolved_via IS NOT NULL
  WITH i.resolved_via AS resolved_via, count(*) AS n
  RETURN collect({resolved_via: resolved_via, n: n}) AS resolution
}
CALL {
  OPTIONAL MATCH (c:Capability)
  WITH max(coalesce(c.updated_at, c.authored_at, c.inferred_at)) AS t1
  OPTIONAL MATCH (i:Issue)
  WITH t1, max(coalesce(i.scoped_at, i.triaged_at)) AS t2
  OPTIONAL MATCH (inv:Invariant)
  WITH t1, t2, max(inv.at) AS t3
  OPTIONAL MATCH (s:Service)
  WITH t1, t2, t3, max(s.created_at) AS t4
  RETURN
    reduce(
      m = 0,
      x IN [t1, t2, t3, t4] |
        CASE WHEN x IS NOT NULL AND x > m THEN x ELSE m END
    ) AS last_activity_ms
}
RETURN
  capability_count,
  invariant_count,
  issue_count,
  service_count,
  symbol_count,
  resolution,
  last_activity_ms
"""

_ALLOWED_VIA = frozenset({"graph", "scoped-grep", "wide-grep"})

_cache: dict[str, Any] | None = None
_cache_at: float = 0.0


def _empty_stats(*, reason: str) -> dict[str, Any]:
    return {
        "success": True,
        "available": False,
        "reason": reason,
        "capability_count": 0,
        "invariant_count": 0,
        "issue_count": 0,
        "service_count": 0,
        "symbol_count": 0,
        "resolution": [],
        "last_activity_ms": None,
        "cached_at": None,
        "cache_ttl_s": CACHE_TTL_S,
        "cache_hit": False,
    }


def clear_cache() -> None:
    """Test helper — drop the process cache."""
    global _cache, _cache_at
    _cache = None
    _cache_at = 0.0


def _clean_resolution(raw: Any) -> list[dict[str, Any]]:
    """Keep only the closed resolved_via enum + integer counts."""
    out: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if not isinstance(item, dict):
            continue
        via = item.get("resolved_via")
        n = item.get("n")
        if via in _ALLOWED_VIA and isinstance(n, (int, float)):
            out.append({"resolved_via": via, "n": int(n)})
    return out


async def fetch_public_stats(
    run: Callable[..., Awaitable[dict[str, Any]]],
    *,
    now: float | None = None,
    ttl_s: float = CACHE_TTL_S,
) -> dict[str, Any]:
    """Return aggregate factory stats, served from a hard TTL cache.

    ``run`` is an async callable matching ``graph.run_named``'s keyword
    contract (``cypher=``, ``params=``, …) and return shape
    (``{success, rows, ...}``). The caller supplies credentials + URI so
    this module never imports the vault or runtime (testable pure-ish core).
    """
    global _cache, _cache_at
    ts = time.time() if now is None else now
    if _cache is not None and (ts - _cache_at) < ttl_s:
        out = dict(_cache)
        out["cache_hit"] = True
        return out

    try:
        result = await run(
            cypher=PUBLIC_STATS_CYPHER,
            params={},
            access_mode="read",
            row_limit=1,
            timeout_ms=8000,
        )
    except Exception as exc:
        logger.warning("public_factory_stats query failed: %s", exc, exc_info=True)
        # Do not cache hard failures — a cold-start miss should retry soon,
        # but still return a calm empty payload so the landing page never 500s.
        return _empty_stats(reason="graph_unavailable")

    rows = (result or {}).get("rows") or []
    row = rows[0] if rows else {}

    last = row.get("last_activity_ms")
    payload = {
        "success": True,
        "available": True,
        "reason": None,
        "capability_count": int(row.get("capability_count") or 0),
        "invariant_count": int(row.get("invariant_count") or 0),
        "issue_count": int(row.get("issue_count") or 0),
        "service_count": int(row.get("service_count") or 0),
        "symbol_count": int(row.get("symbol_count") or 0),
        "resolution": _clean_resolution(row.get("resolution")),
        "last_activity_ms": int(last) if last is not None else None,
        "cached_at": int(ts * 1000),
        "cache_ttl_s": ttl_s,
        "cache_hit": False,
    }
    _cache = dict(payload)
    _cache_at = ts
    return payload
