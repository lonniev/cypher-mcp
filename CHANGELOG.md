# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.7.0 — 2026-07-20

### Added — grep-scoping "context pack" + code anchors (Service Desk token savings)

The intention graph now carries enough code-orienteering detail that Porter/Journeyman grep a
narrow scope (or skip grep) instead of re-tokenizing whole repos through Anthropic. Borrows the
*idea* (not the code) of `code-review-graph`'s token-optimized context, kept intention-first.

- **Symbol anchors.** `Symbol` nodes gain `file_path`, `verified_at_sha`, `anchor_provenance`.
  Line numbers are deliberately not stored — the Porter re-greps within `file_path` to re-pin
  exact location, so a coarse file+symbol anchor never goes stale in a misleading way.
- **New write `anchor_symbol(symbol_fqn, file_path, verified_at_sha)`** (Journeyman-only) — the
  post-edit anchor. Provenance is the hard-coded literal `'journeyman-verified'` (authority comes
  from having edited the code, not from a param).
- **New write `record_scope(repo_name, issue_number, actionable_text, resolved_via)`** (Porter) —
  stores the rough-English→spec translation and HOW the code was located
  (`graph` | `scoped-grep` | `wide-grep`), the token-savings metric.
- **New write `link_issue_to_capability(...)`** — `(:Issue)-[:ABOUT_CAPABILITY]->(:Capability)`,
  so a future fuzzy issue on the same theme matches this one's `actionable_text` as precedent.
- **New read `context_pack(keyword)`** — the flagship: one call returns the whole grep-scoping
  bundle per matched capability (owner repos, realizing symbols *with `file_path`*, guarding
  invariants, precedent issues' `actionable_text` + why). Grep only inside the returned files.
- **New read `factory_resolution_stats()`** — grep-fallback metric; watch `wide-grep` trend to 0.
- `what_realizes_capability` and `symbols_in_service` now return `file_path` (and `verified_at_sha`).

Seed with `scripts/seed_factory_vocabulary.py` (idempotent) and price the new tools in Pricing
Studio; reads stay open, writes stay role-gated (Porter/Journeyman).

## 0.6.1 — 2026-07-19

### Added — clickable GitHub URLs on the factory graph (Issue / repo / PR)

- `scripts/factory_vocabulary.py` — `Issue` nodes now carry the real GitHub URLs so a graph
  reader can click straight through to the original artifacts:
  - `record_triage` gains `issue_url` + `repo_url` params — the **actual** URLs the caller
    fetches at runtime (`gh issue view <n> --json url`, `gh repo view --json url`), stored on
    `i.url` / `i.repo_url`. Nothing is derived from a hardcoded owner.
  - New write `link_pr(repo_name, issue_number, pr_url)` (Journeyman-gated) records the actual
    URL of the PR that carried the fix (the URL `gh pr create` printed) on `i.pr_url`.
  - New read `issue_provenance(repo_name, issue_number)` — the click-through surface: returns an
    issue's `issue_url` / `repo_url` / `pr_url` plus its triage, rationale (Decisions),
    rejections, and root-cause symbols.
- A test guard (`test_no_template_hardcodes_a_github_owner`) fails if any template's Cypher
  contains a literal `github.com/` owner — the no-hardcode rule can't silently regress.
- Deploy is a re-seed of the live operator (`scripts/seed_factory_vocabulary.py`); templates
  live in Neon, not the wheel, so no runtime change ships.

## 0.6.0 — 2026-07-18

### Added — Intention Service Task 2: the derived forward map (Capability layer + read surface)

- `scripts/factory_vocabulary.py` — extended the factory graph with two node types and a
  read surface, per PersonalBrain `60c4c06d` ("Intention Service"):
  - `(:Capability {name, why, provenance, keywords})` — a cross-cutting service ability
    (e.g. "Secure Courier") spanning many symbols across many repos, with edges
    `OWNED_BY` (multi-owner), `CONSUMED_BY`, `REALIZED_BY`.
  - `(:Invariant {name, rule, provenance})` — a distinct, enforceable rule node (kept
    separate from the Constraint Engine's vocabulary) with a bounded `GUARDS` symbol set
    for the later drift alarm.
  - One agent actor: the **Journeyman** writes the derived structure (`upsert_capability`,
    `link_capability_consumer`, `bind_capability_to_symbol`, `index_symbol`) and its advice
    on why a capability exists (`suggest_capability_why` → `inferred_why`, hard-coded
    `llm-inferred-unverified`). The **Operator** (the human-run identity, a new `OPERATOR`
    role) writes the authoritative why (`authorize_capability_why` → `human-authored`) and
    authors `Invariant` nodes (`assert_invariant`, `guard_invariant_symbol`).
  - **Provenance is never a parameter** anywhere in the vocabulary — every provenance is a
    role-keyed Cypher literal, so the calling key decides authority. A Journeyman (LLM)
    physically cannot stamp `human-authored`; it proposes advice, the Operator legislates.
  - Four read templates published as tools (`which_service_handles`,
    `what_realizes_capability`, `explain_capability`, `symbols_in_service`) — the forward
    map query surface. Reads are open (priced, ungated).
- `scripts/seed_factory_vocabulary.py` — authors + publishes writes then reads (honoring
  each template's `access_mode`); `--gate` now takes `--harvester-npub` and gates each
  write to its role npubs while leaving reads open.
- `tests/test_factory_vocabulary.py` — pins the provenance boundary (agent-reachable
  templates never parameterize provenance; harvester-only ones may), that reads are
  read-only and open, and the harvester gating contract.

No core server or wheel change: the read/write catalog and per-tool constraints already
exist; this adds the vocabulary, its seeding, and tests.

## 0.5.2 — 2026-07-16

### Changed — track tollbooth-dpyc 0.63.3

- Bumped the pinned SDK to 0.63.3 (npub-proof challenge DM now stamps the request time). Also cuts a release for changes accumulated since the last tag.

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
