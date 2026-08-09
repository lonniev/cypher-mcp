"""Public factory stats — free, aggregate-only, hard-cached (#72)."""

from __future__ import annotations

import pytest

from cypher_mcp import public_stats, server


@pytest.fixture(autouse=True)
def _clear_cache():
    public_stats.clear_cache()
    yield
    public_stats.clear_cache()


def test_public_factory_stats_is_registered_free():
    by_cap = {ti.capability: ti for ti in server.TOOL_REGISTRY.values()}
    assert "public_factory_stats" in by_cap
    ti = by_cap["public_factory_stats"]
    assert ti.category == "free"
    assert ti.tool_id == server.PUBLIC_FACTORY_STATS_UUID


async def test_public_factory_stats_tool_name_on_wire():
    tools = await server.mcp._list_tools()
    names = {t.name for t in tools}
    assert "cypher_public_factory_stats" in names


async def test_fetch_returns_aggregates_only():
    async def fake_run(**_kwargs):
        return {
            "success": True,
            "rows": [
                {
                    "capability_count": 12,
                    "invariant_count": 4,
                    "issue_count": 30,
                    "service_count": 18,
                    "symbol_count": 90,
                    "resolution": [
                        {"resolved_via": "graph", "n": 20},
                        {"resolved_via": "scoped-grep", "n": 7},
                        {"resolved_via": "wide-grep", "n": 3},
                        # hostile / unexpected values must be dropped
                        {"resolved_via": "DROP TABLE", "n": 1},
                        {"resolved_via": "graph", "n": "nope"},
                        {"title": "secret issue", "n": 1},
                    ],
                    "last_activity_ms": 1_700_000_000_000,
                }
            ],
        }

    out = await public_stats.fetch_public_stats(fake_run, now=1_000.0)
    assert out["success"] is True
    assert out["available"] is True
    assert out["capability_count"] == 12
    assert out["invariant_count"] == 4
    assert out["issue_count"] == 30
    assert out["service_count"] == 18
    assert out["symbol_count"] == 90
    assert out["last_activity_ms"] == 1_700_000_000_000
    assert out["resolution"] == [
        {"resolved_via": "graph", "n": 20},
        {"resolved_via": "scoped-grep", "n": 7},
        {"resolved_via": "wide-grep", "n": 3},
    ]
    # No free-text / identity fields on the public surface.
    for forbidden in ("title", "npub", "file_path", "symbol", "label", "url"):
        assert forbidden not in out
        for item in out["resolution"]:
            assert forbidden not in item


async def test_fetch_is_hard_cached():
    calls = {"n": 0}

    async def fake_run(**_kwargs):
        calls["n"] += 1
        return {
            "success": True,
            "rows": [
                {
                    "capability_count": 1,
                    "invariant_count": 0,
                    "issue_count": 0,
                    "service_count": 0,
                    "symbol_count": 0,
                    "resolution": [],
                    "last_activity_ms": None,
                }
            ],
        }

    a = await public_stats.fetch_public_stats(fake_run, now=100.0, ttl_s=60.0)
    b = await public_stats.fetch_public_stats(fake_run, now=130.0, ttl_s=60.0)
    assert calls["n"] == 1
    assert a["cache_hit"] is False
    assert b["cache_hit"] is True
    # After TTL, refreshes.
    c = await public_stats.fetch_public_stats(fake_run, now=170.0, ttl_s=60.0)
    assert calls["n"] == 2
    assert c["cache_hit"] is False


async def test_fetch_failure_returns_empty_not_raise():
    async def boom(**_kwargs):
        raise RuntimeError("bolt timeout")

    out = await public_stats.fetch_public_stats(boom, now=1.0)
    assert out["success"] is True
    assert out["available"] is False
    assert out["reason"] == "graph_unavailable"
    assert out["capability_count"] == 0
    assert out["resolution"] == []


def test_public_stats_cypher_is_read_only_and_parameter_free():
    import re

    cypher = public_stats.PUBLIC_STATS_CYPHER.upper()
    # Word-boundary check — property names like created_at must not trip CREATE.
    for banned in ("CREATE", "MERGE", "DELETE", "SET", "REMOVE", "DROP", "FOREACH"):
        assert not re.search(rf"\b{banned}\b", cypher), banned
    # No $params — this is a fixed aggregate query.
    assert "$" not in public_stats.PUBLIC_STATS_CYPHER
