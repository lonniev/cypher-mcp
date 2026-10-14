"""Named-tool synthesis — runner wiring + register/unregister on the live app.

The wheel covers the synthesis mechanics; these cover cypher's integration: the
shared-executor runner and that a published query projects a typed
``cypher_<key>`` tool on this server.
"""

from __future__ import annotations

from tollbooth.tool_identity import READS_REMOTE

from cypher_mcp import server


async def test_make_runner_delegates_to_shared_executor(monkeypatch):
    captured: dict = {}

    async def fake_run(key, params, npub, dpop_token):
        captured.update(key=key, params=params, npub=npub, dpop_token=dpop_token)
        return {"ok": True}

    monkeypatch.setattr(server, "_run_named_query", fake_run)
    runner = server._make_runner("find_a_service")
    out = await runner({"keyword": "vault"}, "np", "pf")

    assert out == {"ok": True}
    assert captured == {
        "key": "find_a_service",
        "params": {"keyword": "vault"},
        "npub": "np",
        "dpop_token": "pf",
    }


async def test_register_projects_typed_tool_then_unregister_removes_it():
    rt = server.runtime
    name = rt.register_dynamic_tool(
        name="find_a_service",
        param_schema={
            "keyword": {"type": "string", "description": "A word naming the concern."},
            "limit": {"type": "int", "description": "Most rows to return."},
        },
        runner=server._make_runner("find_a_service"),
        title="Find a service",
        behavior=READS_REMOTE,
        intent="Name the service that handles a concern.",
        category="read",
    )
    try:
        assert name == "cypher_find_a_service"
        tools = await server.mcp._list_tools()
        by_name = {t.name: t for t in tools}
        assert "cypher_find_a_service" in by_name
        props = by_name["cypher_find_a_service"].parameters["properties"]
        assert props["keyword"]["type"] == "string"
        assert props["limit"]["type"] == "integer"
    finally:
        rt.unregister_dynamic_tool("find_a_service", _quiet=True)

    after = {t.name for t in await server.mcp._list_tools()}
    assert "cypher_find_a_service" not in after
