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

Live at `https://cypher-mcp.fastmcp.app/mcp`.

## How it works

Two planes, cleanly separated:

- **Settlement / identity plane** — Neon + Nostr + Tollbooth, shared with
  every other DPYC operator. It never knows a graph exists.
- **Value-delivery plane** — Bolt → Neo4j, sealed *inside the tool handlers*
  (`graph.py`), opened and torn down per request (no pool). The backing store
  is an implementation detail invisible to patrons, so it can be swapped
  without changing the MCP surface.

Three conceptual layers:

| Layer | Where | What |
|---|---|---|
| **L1 — primitive** | code (shipped once) | `execute_query_by_key(key, params)` + catalog CRUD |
| **L2 — catalog** | Neon `query_catalog` | `key → vetted Cypher template + param schema` (*what's possible*) |
| **L3 — pricing** | Tollbooth pricing model | *what's sold, named, priced* |

> **Status: live, with named tools.** L1 + L2 are shipped and serving real,
> billed answers — an operator adopted by an Authority, AuraDB-backed, with
> refund-on-raise verified end to end. **Named tools are now live (L3 tool
> synthesis):** an operator can `publish_tool(key)` to project a query as a
> first-class, typed tool (e.g. `cypher_find_airline_flights(from_city,
> to_city)`), priced individually in Pricing Studio. Per-key parametric *pricing
> formulas* remain a later step — see [CHANGELOG.md](CHANGELOG.md).

## Tools

**Patron (priced):**

- `cypher_execute_query_by_key(key, params)` — run a published query. You
  supply only parameters; the operator owns the query text, and parameters
  bind as Cypher `$params` (never string-interpolated). You're charged only
  for a delivered answer — an unknown key, invalid parameters, or a failed
  query rolls back the debit (refund-on-raise).

Plus the standard DPYC surface from the wheel: `cypher_check_balance`,
`cypher_check_price`, `cypher_purchase_credits`, Secure Courier, npub proof,
Oracle delegation, account statements, constraint-based dynamic pricing, etc.

**Operator-only (restricted, unpriced) — the authoring plane:**

- `cypher_create_query` / `cypher_update_query` / `cypher_get_query` /
  `cypher_list_queries` / `cypher_delete_query`
- `cypher_publish_tool(key)` / `cypher_unpublish_tool(key)` — project a query as
  a first-class, typed named tool (or retire it). See *Named tools* below.

Raw Cypher never reaches patrons — only named, parameterized templates.

### Authoring in Neo4j's own UI — no second editor to learn

A DB-analyst refines templates in Neo4j Browser, not in a bespoke tool.
`cypher_get_query(key)` returns the template **plus an `edit_url`** — a deep
link into the hosted Neo4j Browser (`browser.neo4j.io`) that pre-targets the
operator's AuraDB and loads the statement **in edit mode** (`cmd=edit`).
Refine it with autocomplete, run-to-test, visualization, and `PROFILE`; then
save it back with `cypher_update_query`. The template is just a string flowing
over MCP — no files, no desktop, no exported bundles. The link carries the
DBMS URI but never the password, and `get_query` is operator-only, so neither
ever reaches a patron.

### Named tools — publish a query as its own tool

`cypher_publish_tool(key)` projects a catalog query as a first-class MCP tool
named `cypher_<key>` whose flat, typed parameters come from the query's schema —
e.g. `cypher_find_airline_flights(from_city, to_city)`. An agent then calls it by
name with typed params instead of `execute_query_by_key(key, params)`. Internally
every named tool funnels through the **same shared executor** (look the stored
Cypher up by key → parameter-bind → run), so there is one code path and the same
refund-on-raise guarantee. A published tool registers **unpriced** — it appears in
Pricing Studio like any new tool; set its price there (calls return "not priced yet
(TBD)" until you do). `cypher_unpublish_tool(key)` retires the tool (the query
itself stays, still runnable by key). Published tools survive restarts
(re-materialized from the catalog); reconnect to observe tool-list changes.

The synthesis machinery is a generic `tollbooth-dpyc` primitive
(`register_dynamic_tool`) — named Cypher queries are one realization; the same
primitive can back a synthesized tool with a REST call, SQL, or a stored prompt.

## Onboarding (operator)

1. **Request adoption** from an Authority (the deferred courtship —
   `request_adoption`) or be registered directly. Either way the Authority
   provisions an isolated Neon tenant automatically.
2. Deliver operator secrets via Secure Courier
   (`cypher_request_credential_channel`, service `cypher-operator`):
   - `neo4j_uri`, `neo4j_user`, `neo4j_password` — the graph store
     (e.g. a Neo4j AuraDB instance)
   - `btcpay_host`, `btcpay_api_key`, `btcpay_store_id` — Lightning
3. Author your catalog with `cypher_create_query`; patrons then execute by key.

## Develop

```bash
pip install -e ".[dev]"
pytest -v
python -m cypher_mcp.server   # needs TOLLBOOTH_NOSTR_OPERATOR_NSEC
```

Deployed on Prefect Horizon (FastMCP runtime); see `.fastmcp.yaml`. The only
env var required to boot is `TOLLBOOTH_NOSTR_OPERATOR_NSEC` — every other
secret arrives via Secure Courier.

---

## DPYC Ecosystem

| Repo | Role |
|------|------|
| [tollbooth-dpyc](https://github.com/lonniev/tollbooth-dpyc) | Python SDK — vault, auth, pricing, payments, Nostr identity |
| [dpyc-community](https://github.com/lonniev/dpyc-community) | Governance registry, membership, advisories, threat model |
| [dpyc-oracle](https://github.com/lonniev/dpyc-oracle) | Community concierge — free onboarding help and membership lookup |
| [tollbooth-authority](https://github.com/lonniev/tollbooth-authority) | Certification backbone — Schnorr-signed purchase order certificates |
| [tollbooth-sample](https://github.com/lonniev/tollbooth-sample) | Sample Operator — canonical template for new MCP services |
| [tollbooth-pricing-studio](https://github.com/lonniev/tollbooth-pricing-studio) | iOS app — visual pricing-model editor and operator console |
| [schwab-mcp](https://github.com/lonniev/schwab-mcp) | Charles Schwab brokerage data (operational example) |
| [thebrain-mcp](https://github.com/lonniev/thebrain-mcp) | TheBrain personal knowledge graph (operational example) |
| [excalibur-mcp](https://github.com/lonniev/excalibur-mcp) | X/Twitter posting (operational example) |
| [taxsort-mcp](https://github.com/lonniev/taxsort-mcp) | Tax classification + Cloudflare Pages UI (operational example) |
| [tollbooth-oauth2-collector](https://github.com/lonniev/tollbooth-oauth2-collector) | OAuth2 callback handler — shared advocate service |
| [stablecoin.myshopify.com](https://stablecoin.myshopify.com) | DPYC merch and Austrian economics |

## Prior Art & Attribution

The methods, algorithms, and implementations contained in this repository may
represent original work by Lonnie VanZandt, first published on June 15, 2026.
This public disclosure establishes prior art under U.S. patent law
(35 U.S.C. 102).

All use, reproduction, or derivative work must comply with the Apache License
2.0 included in this repository and must provide proper attribution to the
original author per the [NOTICE](NOTICE) file.

### How to Attribute

If you use or build upon this work, please include the following in your
documentation or source:

    Based on original work by Lonnie VanZandt and Claude.ai
    Originally published: June 15, 2026
    Source: https://github.com/lonniev/cypher-mcp
    Licensed under Apache License 2.0

Visit the technologist's virtual cafe for Bitcoin advocates and coffee
aficionados at [stablecoin.myshopify.com](https://stablecoin.myshopify.com).

### Patent Notice

The author reserves all rights to seek patent protection for the novel methods
and systems described herein. Public disclosure of this work establishes a
priority date of June 15, 2026. Under the America Invents Act, the author
retains a one-year grace period from the date of first public disclosure to
file patent applications.

**Note to potential filers:** This public repository and its full Git history
serve as evidence of prior art. Any patent application covering substantially
similar methods filed after the publication date of this repository may be
subject to invalidation under 35 U.S.C. 102(a).

## Further Reading

[The Phantom Tollbooth on the Lightning Turnpike](https://stablecoin.myshopify.com/blogs/our-value/the-phantom-tollbooth-on-the-lightning-turnpike)
— the full story of how we're monetizing the monetization of AI APIs, and
then fading to the background.

## Trademarks

DPYC&trade;, Tollbooth DPYC&trade;, and Don't Pester Your Customer&trade; are
trademarks of Lonnie VanZandt. See
[TRADEMARKS.md](https://github.com/lonniev/dpyc-community/blob/main/TRADEMARKS.md)
in the dpyc-community repository for usage guidelines.

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.

---

*Because in the end, the tollbooth was never the destination. It was always
just the beginning of the journey.*
