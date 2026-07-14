# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.1] — 2026-07-14

### Fixed — published (named) tools now materialize eagerly, so a cold instance reveals them

- On stateless Horizon, synthesized named tools entered the runtime registry only when the
  first *domain* call warmed `_ensure_catalog`. A cold instance's `tools/list` — and Pricing
  Studio's Reconcile, which reads the live tool registry via the pricing model — therefore
  missed freshly published tools until something warmed the instance.
- A small `Middleware` now runs the existing `_materialize_published` once, before the first
  `list_tools`/`call_tool` on each instance. Best-effort: a not-yet-configured operator never
  has a request broken (failures are swallowed and retried on the next request). Published
  tools are now reliably visible on any instance without a prior domain call.

## [0.5.0] — 2026-07-14

### Added — DPYC Software Factory mutation vocabulary (Task 1 substrate)

- `scripts/factory_vocabulary.py` — the six operator-authored *write* templates
  (`register_service`, `record_triage`, `note_rejection`, `link_root_cause`,
  `assert_rationale`, `bind_rationale_to_symbol`) over a Service/Issue/Decision/
  Symbol node model. `assert_rationale` hard-codes
  `provenance:'llm-inferred-unverified'` as a Cypher literal — an agent key cannot
  claim authoritative provenance.
- `scripts/seed_factory_vocabulary.py` — idempotent operator runbook that authors +
  publishes the vocabulary. Tools start **unlimited** (any funded patron, once priced in
  Pricing Studio); per-npub limiting to the two agents is a later Pricing Studio session
  adding a `json_expression` allow-list on `patron.npub` (Constraint Engine, not a bespoke
  ACL — the Porter is denied `assert_rationale`). `--dry-run` previews (no server/nsec) and
  prints the allow-list to replicate; `--gate` applies it programmatically if preferred.
- `tests/test_factory_vocabulary.py` — validates every template against the wheel's
  author-time guards, proves the provenance literal is unforgeable, and pins the
  allow-list gating contract (listed npub allowed, others denied).

No core server or wheel change: the write path (`access_mode='write'`) and per-tool
constraints already exist; this release adds the vocabulary, its seeding, and tests.

## [0.4.1] — 2026-07-09

### Changed

- Bump **tollbooth-dpyc** pin `==0.62.0` → `==0.62.1` (security-hardening
  batch): invoice-owner check on credit settlement, GCM credential vault,
  encrypted self-provisioning ledger, no plaintext audit. `uv.lock` regenerated.

## [0.4.0] — 2026-06-29

### Changed — BREAKING: identity-proof param renamed `proof` → `dpop_token`

- Lockstep with **tollbooth-dpyc 0.57.0**, which unified the Secure Courier
  possession token under one name (`dpop_token`), retiring the `proof_token`,
  `poison`, and `proof` spellings. The SDK's `@paid_tool` decorator now extracts
  `kwargs["dpop_token"]`, so every paid tool's identity-proof parameter is renamed
  `proof` → `dpop_token` (clean cut, no backward-compat shim). A tool still
  declaring `proof` would fail every paid call with `proof_required`.
- Renamed in `execute_query_by_key` and the operator-only authoring/synthesis
  tools, plus the shared `_run_named_query` executor and the dynamic-tool runner
  contract (`async (params, npub, dpop_token) -> dict`).
- SDK pin bumped `tollbooth-dpyc[nostr]==0.53.1` → `==0.57.0`; `uv.lock`
  regenerated.

## [0.3.0] — 2026-06-18

### Added — named tools at runtime (L3 tool synthesis)

- **`publish_tool(key)` / `unpublish_tool(key)`** (operator-only) project a catalog
  query as a first-class, typed MCP tool named `cypher_<key>` — e.g.
  `cypher_find_airline_flights(from_city, to_city)`. Patrons call it by name with
  typed params; internally it funnels through the one shared executor
  (`_run_named_query`) that resolves the stored Cypher by key and parameter-binds
  it (`$params`, never interpolated). Published tools survive cold starts
  (re-materialized from the catalog) and are visible to Pricing Studio.
- **Register-only; price in the App.** A published tool registers **unpriced** — it
  appears in Pricing Studio like any new tool; set its price there. Until then calls
  return "not priced yet (TBD)". No price flows through the MCP.

### Changed

- Built on `tollbooth-dpyc==0.46.1`'s new `register_dynamic_tool` synthesis
  primitive (the generic machinery lives in the wheel; cypher supplies the
  named-Cypher runner). The `query_catalog` gains `as_tool` / `tool_intent` columns
  (migrated in place); the param-schema validators now come from the wheel.
- `list_queries` reports each query's `as_tool` (published) state.

## [0.2.0] — 2026-06-15

### Added

- **`get_query` returns an `edit_url`** — a deep link into the hosted Neo4j Browser
  (`browser.neo4j.io`) that opens the template in EDIT mode against the operator's
  AuraDB, so an analyst refines it in Neo4j's own UI and saves it back with
  `update_query`. The link carries the DBMS URI but never the password; `get_query`
  is operator-only, so neither ever reaches a patron.

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
