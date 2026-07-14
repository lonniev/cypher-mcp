"""The eager-materialize middleware warms published tools before serving, best-effort.

Without it, synthesized (named) tools only enter the runtime registry after the first
domain call warms a serverless instance — so a cold instance's tools/list and Pricing
Studio's Reconcile miss them. This runs materialization once, before the first list/call.
"""

import cypher_mcp.server as srv


async def test_warm_materializes_when_not_ready(monkeypatch):
    called = []

    async def fake_ensure():
        called.append(True)

    monkeypatch.setattr(srv, "_tools_materialized", False)
    monkeypatch.setattr(srv, "_ensure_catalog", fake_ensure)
    await srv._EagerMaterializeMiddleware()._warm()
    assert called == [True]


async def test_warm_is_noop_once_materialized(monkeypatch):
    called = []

    async def fake_ensure():
        called.append(True)

    monkeypatch.setattr(srv, "_tools_materialized", True)
    monkeypatch.setattr(srv, "_ensure_catalog", fake_ensure)
    await srv._EagerMaterializeMiddleware()._warm()
    assert called == []  # already warm — don't re-run per request


async def test_warm_swallows_errors_so_requests_never_break(monkeypatch):
    async def boom():
        raise RuntimeError("operator not configured yet")

    monkeypatch.setattr(srv, "_tools_materialized", False)
    monkeypatch.setattr(srv, "_ensure_catalog", boom)
    await srv._EagerMaterializeMiddleware()._warm()  # must not raise


async def test_hooks_warm_then_forward(monkeypatch):
    monkeypatch.setattr(srv, "_tools_materialized", True)  # skip the warm body
    mw = srv._EagerMaterializeMiddleware()
    sentinel = object()

    async def call_next(_ctx):
        return sentinel

    assert await mw.on_list_tools(None, call_next) is sentinel
    assert await mw.on_call_tool(None, call_next) is sentinel
