"""Tests for the query catalog: Neon CRUD against a fake vault + validators."""

from __future__ import annotations

import json
from typing import Any

from cypher_mcp import catalog


class FakeVault:
    """Records SQL + params; returns canned results. Mirrors NeonVault's
    ``_t`` schema-prefix and ``_execute`` HTTP-SQL helper."""

    def __init__(self, rows: list[dict[str, Any]] | None = None, row_count: int = 1):
        self.schema_prefix = "op_schema."
        self.calls: list[tuple[str, list[Any] | None]] = []
        self._rows = rows if rows is not None else []
        self._row_count = row_count

    def _t(self, table: str) -> str:
        return f"{self.schema_prefix}{table}"

    async def _execute(self, query: str, params: list[Any] | None = None) -> dict[str, Any]:
        self.calls.append((query, params))
        if query.strip().upper().startswith("SELECT"):
            return {"rows": self._rows}
        # INSERT/DELETE/UPDATE — Neon returns affected rows as camelCase rowCount.
        return {"rowCount": self._row_count, "rows": []}


# ── schema ──────────────────────────────────────────────────────────────


async def test_ensure_schema_is_schema_qualified():
    vault = FakeVault()
    await catalog.ensure_schema(vault)
    sql, _ = vault.calls[0]
    assert "CREATE TABLE IF NOT EXISTS op_schema.query_catalog" in sql
    assert "UNIQUE (operator, key)" in sql


# ── upsert ──────────────────────────────────────────────────────────────


async def test_upsert_binds_params_and_serializes_schema():
    vault = FakeVault()
    schema = {"sector": {"type": "string", "required": True}}
    await catalog.upsert(
        vault, "npub1op", "holdings_by_sector",
        "MATCH (h)-[:IN]->(s {name:$sector}) RETURN h", schema,
        description="Holdings by sector", access_mode="read",
        row_limit=500, timeout_ms=3000,
    )
    sql, params = vault.calls[0]
    assert "INSERT INTO op_schema.query_catalog" in sql
    assert "ON CONFLICT (operator, key) DO UPDATE" in sql
    assert "$4::jsonb" in sql
    assert params[0] == "npub1op"
    assert params[1] == "holdings_by_sector"
    # param_schema is JSON-serialized for the ::jsonb cast.
    assert json.loads(params[3]) == schema
    assert params[5] == "read" and params[6] == 500 and params[7] == 3000


# ── get ─────────────────────────────────────────────────────────────────


async def test_get_parses_jsonb_string():
    row = {
        "key": "k", "cypher_template": "RETURN $x", "description": "",
        "access_mode": "read", "row_limit": 1000, "timeout_ms": 5000,
        "param_schema": '{"x": {"type": "int"}}',  # JSONB may arrive as a string
    }
    vault = FakeVault(rows=[row])
    got = await catalog.get(vault, "npub1op", "k")
    assert got is not None
    assert got["param_schema"] == {"x": {"type": "int"}}


async def test_get_missing_returns_none():
    vault = FakeVault(rows=[])
    assert await catalog.get(vault, "npub1op", "nope") is None


# ── delete ──────────────────────────────────────────────────────────────


async def test_delete_uses_rowcount_camelcase():
    assert await catalog.delete(FakeVault(row_count=1), "npub1op", "k") is True
    assert await catalog.delete(FakeVault(row_count=0), "npub1op", "k") is False


# ── named-tool publication (as_tool / tool_intent) ────────────────────────


async def test_ensure_schema_migrates_named_tool_columns():
    vault = FakeVault()
    await catalog.ensure_schema(vault)
    sqls = [s for s, _ in vault.calls]
    assert any("CREATE TABLE IF NOT EXISTS" in s and "as_tool BOOLEAN" in s for s in sqls)
    assert any("ADD COLUMN IF NOT EXISTS as_tool" in s for s in sqls)
    assert any("ADD COLUMN IF NOT EXISTS tool_intent" in s for s in sqls)


async def test_get_selects_named_tool_columns():
    row = {
        "key": "q", "cypher_template": "RETURN 1", "param_schema": {},
        "access_mode": "read", "row_limit": 1000, "timeout_ms": 5000,
        "as_tool": True, "tool_intent": "hi",
    }
    vault = FakeVault(rows=[row])
    got = await catalog.get(vault, "npub1op", "q")
    sql, _ = vault.calls[-1]
    assert "as_tool" in sql and "tool_intent" in sql
    assert got is not None and got["as_tool"] is True


async def test_set_as_tool_updates_and_reports_rowcount():
    vault = FakeVault(row_count=1)
    ok = await catalog.set_as_tool(vault, "npub1op", "q", True, "intent")
    sql, params = vault.calls[-1]
    assert "UPDATE" in sql and "as_tool = $3" in sql and "tool_intent = $4" in sql
    assert params == ["npub1op", "q", True, "intent"]
    assert ok is True
    assert await catalog.set_as_tool(FakeVault(row_count=0), "npub1op", "missing", True) is False


async def test_list_published_filters_as_tool():
    vault = FakeVault(rows=[{"key": "q", "param_schema": {}, "tool_intent": "hi"}])
    rows = await catalog.list_published(vault, "npub1op")
    sql, _ = vault.calls[-1]
    assert "as_tool = true" in sql
    assert rows[0]["key"] == "q"


# ── anti-injection author guard ───────────────────────────────────────────


def test_assert_parameterized_flags_missing_binding():
    err = catalog.assert_parameterized("MATCH (n) RETURN n", {"sector": {"type": "string"}})
    assert err and "sector" in err


def test_assert_parameterized_passes_when_bound():
    assert catalog.assert_parameterized("MATCH (s {name:$sector}) RETURN s",
                                        {"sector": {"type": "string"}}) is None
