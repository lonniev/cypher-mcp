"""Server import smoke + credential validator + registered tool surface."""

from __future__ import annotations

from cypher_mcp import server

_RESTRICTED_CAPS = (
    "create_query", "update_query", "get_query", "list_queries", "delete_query",
    "publish_tool", "unpublish_tool",
)


def test_domain_registry_tool_surface():
    caps = {ti.capability for ti in server.TOOL_REGISTRY.values()}
    assert caps == {"execute_query_by_key", *_RESTRICTED_CAPS}


def test_executor_is_priced_others_restricted():
    by_cap = {ti.capability: ti for ti in server.TOOL_REGISTRY.values()}
    ex = by_cap["execute_query_by_key"]
    assert ex.category == "read" and ex.pricing_hint_value == 5
    for cap in _RESTRICTED_CAPS:
        assert by_cap[cap].category == "restricted"


async def test_registered_tool_names_present():
    tools = await server.mcp._list_tools()
    names = {t.name for t in tools}
    assert "cypher_execute_query_by_key" in names
    for cap in _RESTRICTED_CAPS:
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


def test_edit_url_builds_browser_deep_link():
    from urllib.parse import parse_qs, urlparse

    url = server._edit_url(
        "neo4j+s://abcd1234.databases.neo4j.io",
        "MATCH (p:Person {name:$name}) RETURN p",
    )
    assert url.startswith("https://browser.neo4j.io/?")
    assert " " not in url  # well-formed: spaces encoded, not raw
    q = parse_qs(urlparse(url).query)
    assert q["cmd"] == ["edit"]                 # edit mode, not run
    assert q["db"] == ["neo4j"]
    assert q["dbms"] == ["neo4j+s://abcd1234.databases.neo4j.io"]
    assert q["arg"] == ["MATCH (p:Person {name:$name}) RETURN p"]  # decodes back


def test_edit_url_empty_when_missing_uri_or_cypher():
    assert server._edit_url("", "MATCH (n) RETURN n") == ""
    assert server._edit_url("neo4j+s://x.databases.neo4j.io", "") == ""
