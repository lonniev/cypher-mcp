"""Named-tool synthesis — runner wiring + register/unregister on the live app.

The wheel covers the synthesis mechanics; these cover cypher's integration: the
shared-executor runner and that a published query projects a typed
``cypher_<key>`` tool on this server.
"""

from __future__ import annotations

from cypher_mcp import server


async def test_make_runner_delegates_to_shared_executor(monkeypatch):
    captured: dict = {}

    async def fake_run(key, params, npub, dpop_token):
        captured.update(key=key, params=params, npub=npub, dpop_token=dpop_token)
        return {"ok": True}

    monkeypatch.setattr(server, "_run_named_query", fake_run)
    runner = server._make_runner("find_airline_flights")
    out = await runner({"from_city": "JFK"}, "np", "pf")

    assert out == {"ok": True}
    assert captured == {
        "key": "find_airline_flights",
        "params": {"from_city": "JFK"},
        "npub": "np",
        "dpop_token": "pf",
    }


async def test_register_projects_typed_tool_then_unregister_removes_it():
    rt = server.runtime
    name = rt.register_dynamic_tool(
        name="find_airline_flights",
        param_schema={
            "from_city": {"type": "string"},
            "to_city": {"type": "string"},
        },
        runner=server._make_runner("find_airline_flights"),
        intent="Find flights between two cities.",
        category="read",
    )
    try:
        assert name == "cypher_find_airline_flights"
        tools = await server.mcp._list_tools()
        by_name = {t.name: t for t in tools}
        assert "cypher_find_airline_flights" in by_name
        props = by_name["cypher_find_airline_flights"].parameters["properties"]
        assert props["from_city"]["type"] == "string"
        assert props["to_city"]["type"] == "string"
    finally:
        rt.unregister_dynamic_tool("find_airline_flights", _quiet=True)

    after = {t.name for t in await server.mcp._list_tools()}
    assert "cypher_find_airline_flights" not in after
