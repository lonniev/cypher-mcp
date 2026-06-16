# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-06-15

Initial scaffold — crude Cypher integration on conventional per-tool pricing.

- feat: conventional Tollbooth-DPYC operator bootstrap (`OperatorRuntime` +
  `register_standard_tools`, slug `cypher`) on `tollbooth-dpyc==0.44.15`
- feat: `execute_query_by_key(key, params)` — the one priced patron tool;
  runs an operator-authored, parameterized, named Cypher query. Patron is
  charged only for a delivered answer (failures roll back the debit).
- feat: operator-only (restricted), unpriced catalog CRUD —
  `create_query` / `update_query` / `get_query` / `list_queries` /
  `delete_query` over a per-operator Neon `query_catalog` table.
- feat: ephemeral Bolt connect→run→teardown value plane (`graph.py`), no
  pool — robust to Horizon cold-start workers. Params bind as Cypher
  `$params`, never interpolated (anti-injection).
- feat: operator credentials (Neo4j Bolt trio + BTCPay trio) delivered via
  Secure Courier under service `cypher-operator`.
- security: author-time guard that every declared param is referenced as
  `$name`; execution-time validation of params against the stored schema
  before any Bolt connection.

### Deferred (flagged, not dropped)
- L3 parametric pricing entries / tool synthesis (per-key pricing,
  `check_query_price`, published-tool menu projection, catalog
  discoverability flag). Crude phase prices every key at one flat rate;
  standard `cypher_check_price` covers the single executor tool.
