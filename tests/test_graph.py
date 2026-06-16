"""Tests for the ephemeral Bolt value plane (graph.run_named).

Patches cypher_mcp.graph.AsyncGraphDatabase with a fake async driver, so no
live Neo4j is needed. Asserts: params bind as a dict to session.run (never
interpolated), row_limit truncates, access mode maps read/write, and the
driver is always torn down.
"""

from __future__ import annotations

from typing import Any

import neo4j
import pytest

from cypher_mcp import graph


class FakeRecord:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def data(self) -> dict[str, Any]:
        return self._data


class FakeSummary:
    query_type = "r"
    result_available_after = 7


class FakeResult:
    def __init__(self, records: list[FakeRecord]):
        self._records = records
        self.consumed = False

    def __aiter__(self):
        self._it = iter(self._records)
        return self

    async def __anext__(self) -> FakeRecord:
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration

    async def consume(self) -> FakeSummary:
        self.consumed = True
        return FakeSummary()


class FakeSession:
    def __init__(self, result: FakeResult, run_calls: list[tuple[str, Any]]):
        self._result = result
        self._run_calls = run_calls
        self.access_mode: Any = None

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *a) -> bool:
        return False

    async def run(self, cypher: str, params: Any = None) -> FakeResult:
        self._run_calls.append((cypher, params))
        return self._result


class FakeDriver:
    def __init__(self, session: FakeSession, closed: list[bool]):
        self._session = session
        self._closed = closed
        self.default_access_mode: Any = None

    def session(self, default_access_mode: Any = None) -> FakeSession:
        self.default_access_mode = default_access_mode
        self._session.access_mode = default_access_mode
        return self._session

    async def close(self) -> None:
        self._closed.append(True)


def _install_fake(monkeypatch, records, run_calls, closed, captured):
    session = FakeSession(FakeResult(records), run_calls)
    driver = FakeDriver(session, closed)

    class FakeGraphDatabase:
        @staticmethod
        def driver(uri, auth=None, **kwargs):
            captured["uri"] = uri
            captured["auth"] = auth
            captured["kwargs"] = kwargs
            return driver

    monkeypatch.setattr(graph, "AsyncGraphDatabase", FakeGraphDatabase)


async def test_run_named_binds_params_and_returns_rows(monkeypatch):
    run_calls: list[tuple[str, Any]] = []
    closed: list[bool] = []
    captured: dict[str, Any] = {}
    _install_fake(monkeypatch, [FakeRecord({"n": 1}), FakeRecord({"n": 2})],
                  run_calls, closed, captured)

    out = await graph.run_named(
        uri="neo4j+s://x", user="neo4j", password="pw",
        cypher="MATCH (s {name:$sector}) RETURN s", params={"sector": "tech"},
        access_mode="read", row_limit=1000, timeout_ms=5000,
    )

    assert out["success"] is True
    assert out["row_count"] == 2 and out["truncated"] is False
    # Params bound as a dict to session.run — NOT interpolated into the text.
    cypher, params = run_calls[0]
    assert "$sector" in cypher
    assert params == {"sector": "tech"}
    assert captured["auth"] == ("neo4j", "pw")
    assert closed == [True]  # driver torn down


async def test_run_named_truncates_at_row_limit(monkeypatch):
    records = [FakeRecord({"n": i}) for i in range(10)]
    _install_fake(monkeypatch, records, [], [], {})
    out = await graph.run_named(
        uri="bolt://x", user="u", password="p",
        cypher="RETURN $x", params={"x": 1}, row_limit=3,
    )
    assert out["row_count"] == 3 and out["truncated"] is True


async def test_run_named_access_mode_maps(monkeypatch):
    run_calls: list[tuple[str, Any]] = []
    session = FakeSession(FakeResult([]), run_calls)
    driver = FakeDriver(session, [])

    class FakeGraphDatabase:
        @staticmethod
        def driver(uri, auth=None, **kwargs):
            return driver

    monkeypatch.setattr(graph, "AsyncGraphDatabase", FakeGraphDatabase)

    await graph.run_named(uri="x", user="u", password="p", cypher="RETURN 1",
                          params={}, access_mode="read")
    assert session.access_mode == neo4j.READ_ACCESS

    await graph.run_named(uri="x", user="u", password="p", cypher="CREATE (n)",
                          params={}, access_mode="write")
    assert session.access_mode == neo4j.WRITE_ACCESS


async def test_run_named_closes_driver_on_error(monkeypatch):
    closed: list[bool] = []

    class BoomSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def run(self, cypher, params=None):
            raise RuntimeError("bolt exploded")

    class BoomDriver:
        def session(self, default_access_mode=None):
            return BoomSession()

        async def close(self):
            closed.append(True)

    class FakeGraphDatabase:
        @staticmethod
        def driver(uri, auth=None, **kwargs):
            return BoomDriver()

    monkeypatch.setattr(graph, "AsyncGraphDatabase", FakeGraphDatabase)

    with pytest.raises(RuntimeError, match="bolt exploded"):
        await graph.run_named(uri="x", user="u", password="p",
                              cypher="RETURN 1", params={})
    assert closed == [True]  # teardown still happened (finally)
