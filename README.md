# cypher-mcp

**Monetized graph answers over Bitcoin Lightning.** A Tollbooth-DPYC Operator
that sells *priced answers* from a graph — operator-authored, parameterized,
named Cypher query templates — not raw database access.

The OSS Neo4j MCP servers are a free pipe to a database the operator
separately expenses (Neo4j invoice) and separately bills for (Stripe stack).
cypher-mcp collapses infrastructure cost, application billing, and access
control into one metered MCP surface: the operator stops selling seats and
starts selling answers, settled in sats, with no Stripe stack and no Neo4j
invoice passed to the customer.

## How it works

Two planes, cleanly separated:

- **Settlement / identity plane** — Neon + Nostr + Tollbooth, shared with
  every other DPYC operator. It never knows a graph exists.
- **Value-delivery plane** — Bolt → Neo4j, sealed *inside the tool handlers*
  (`graph.py`). The backing store is an implementation detail invisible to
  patrons, so it can be swapped without changing the MCP surface.

Three conceptual layers:

| Layer | Where | What |
|---|---|---|
| **L1 — primitive** | code (shipped once) | `execute_query_by_key(key, params)` + catalog CRUD |
| **L2 — catalog** | Neon `query_catalog` | `key → vetted Cypher template + param schema` (*what's possible*) |
| **L3 — pricing** | Tollbooth pricing model | *what's sold, named, priced* |

> **Status: crude phase.** This build ships L1 + L2 on **conventional
> per-tool pricing** — one flat price for any key. The L3 parametric
> tool-synthesis (per-key/per-product pricing, published-tool menu) is
> deferred; see CHANGELOG.

## Tools

**Patron (priced):**
- `cypher_execute_query_by_key(key, params)` — run a published query. You
  supply only parameters; the operator owns the query text. You're charged
  only for a delivered answer (failures roll back the debit).

Plus the standard DPYC surface from the wheel: `cypher_check_balance`,
`cypher_check_price`, `cypher_purchase_credits`, Secure Courier, npub proof,
Oracle delegation, etc.

**Operator-only (restricted, unpriced) — the authoring plane:**
- `cypher_create_query` / `cypher_update_query` / `cypher_get_query` /
  `cypher_list_queries` / `cypher_delete_query`

Raw Cypher never reaches patrons — only named, parameterized templates.
Parameters bind as Cypher `$params`, never string-interpolated.

## Onboarding (operator)

1. Register with an Authority (provisions a Neon database automatically).
2. Deliver operator secrets via Secure Courier
   (`cypher_request_credential_channel`, service `cypher-operator`):
   - `neo4j_uri`, `neo4j_user`, `neo4j_password` — the graph store
   - `btcpay_host`, `btcpay_api_key`, `btcpay_store_id` — Lightning
3. Author your catalog with `cypher_create_query`; patrons then execute by key.

## Develop

```bash
pip install -e ".[dev]"
pytest -v
python -m cypher_mcp.server   # needs TOLLBOOTH_NOSTR_OPERATOR_NSEC
```

Deployed on Prefect Horizon (FastMCP runtime); see `.fastmcp.yaml`.

## License

Apache-2.0.
