"""Server import smoke + credential validator + registered tool surface."""

from __future__ import annotations

from cypher_mcp import server


def test_domain_registry_has_six_tools():
    caps = {ti.capability for ti in server.TOOL_REGISTRY.values()}
    assert caps == {
        "execute_query_by_key", "create_query", "update_query",
        "get_query", "list_queries", "delete_query",
    }


def test_executor_is_priced_others_restricted():
    by_cap = {ti.capability: ti for ti in server.TOOL_REGISTRY.values()}
    ex = by_cap["execute_query_by_key"]
    assert ex.category == "read" and ex.pricing_hint_value == 5
    for cap in ("create_query", "update_query", "get_query", "list_queries", "delete_query"):
        assert by_cap[cap].category == "restricted"


async def test_registered_tool_names_present():
    tools = await server.mcp._list_tools()
    names = {t.name for t in tools}
    assert "cypher_execute_query_by_key" in names
    for cap in ("create_query", "update_query", "get_query", "list_queries", "delete_query"):
        assert f"cypher_{cap}" in names
    # standard wheel tools are present too
    assert "cypher_check_balance" in names and "cypher_check_price" in names


def test_validate_operator_creds_requires_neo4j_and_btcpay():
    # all good
    good = {
        "btcpay_host": "https://btcpay.example.com",
        "btcpay_api_key": "k", "btcpay_store_id": "s",
        "neo4j_uri": "neo4j+s://abc.databases.neo4j.io",
        "neo4j_user": "neo4j", "neo4j_password": "pw",
    }
    assert server.validate_operator_creds(good) == []

    # missing neo4j password + bad uri scheme
    bad = dict(good, neo4j_password="", neo4j_uri="http://nope")
    errs = server.validate_operator_creds(bad)
    assert any("neo4j_password" in e for e in errs)
    assert any("neo4j_uri must start with" in e for e in errs)
