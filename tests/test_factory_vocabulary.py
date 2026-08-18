"""The Software Factory intent vocabulary + its per-npub gating.

Task 1 (writes) + Task 2 (the derived forward map: Capability/Invariant nodes, the
OPERATOR role, and a read surface). Validates every template against the wheel's own
author-time guards, pins the provenance security boundary (no template parameterizes
provenance; every provenance is a role-keyed literal — Journeyman writes advice as
'llm-inferred-unverified', Operator writes 'human-authored'), proves reads are read-only
and open, and pins the Constraint-Engine allow-list contract we rely on for access
control (json_expression on patron.npub).
"""

import sys
from datetime import UTC, datetime
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from factory_vocabulary import (
    CODE_OWNER,
    JOURNEYMAN,
    OPERATOR,
    PORTER,
    READ_VOCABULARY,
    VOCABULARY,
)
from seed_factory_vocabulary import (
    apply_gate_and_price,
    build_gate_step,
    resolve_roles,
)
from tollbooth.dynamic_tools import validate_param_schema

from cypher_mcp.catalog import assert_parameterized

PORTER_NPUB = "npub1porter_test"
JOURNEYMAN_NPUB = "npub1journeyman_test"
OPERATOR_NPUB = "npub1operator_test"
CODE_OWNER_NPUB = "npub1codeowner_test"
NPUBS = {PORTER: PORTER_NPUB, JOURNEYMAN: JOURNEYMAN_NPUB, OPERATOR: OPERATOR_NPUB,
         CODE_OWNER: CODE_OWNER_NPUB}


class TestVocabulary:
    @pytest.mark.parametrize("t", VOCABULARY, ids=lambda t: t.key)
    def test_schema_is_valid(self, t):
        assert validate_param_schema(t.param_schema) == []

    @pytest.mark.parametrize("t", VOCABULARY, ids=lambda t: t.key)
    def test_every_param_is_bound_in_template(self, t):
        # Anti-injection author guard: each declared param appears as $name.
        assert assert_parameterized(t.cypher, t.param_schema) is None

    @pytest.mark.parametrize("t", VOCABULARY, ids=lambda t: t.key)
    def test_all_templates_are_writes(self, t):
        # These are mutations — MERGE/CREATE/SET, never a bare read.
        assert any(kw in t.cypher for kw in ("MERGE", "CREATE", "SET"))

    def test_assert_rationale_hardcodes_provenance(self):
        t = next(t for t in VOCABULARY if t.key == "assert_rationale")
        # Literal in the Cypher, and NOT a parameter — an agent cannot set another value.
        assert "'llm-inferred-unverified'" in t.cypher
        assert "provenance" not in t.param_schema

    def test_provenance_is_never_a_parameter(self):
        # The whole security model: provenance is never a trusted argument. Every provenance
        # is a role-keyed Cypher literal, so the calling key decides authority.
        for t in [*VOCABULARY, *READ_VOCABULARY]:
            assert "provenance" not in t.param_schema, t.key

    def test_journeyman_advice_is_llm_inferred_and_cannot_touch_authoritative_why(self):
        t = next(t for t in VOCABULARY if t.key == "suggest_capability_why")
        assert JOURNEYMAN in t.allow_roles and OPERATOR not in t.allow_roles
        assert "'llm-inferred-unverified'" in t.cypher
        # It writes inferred_why, never the authoritative c.why / c.provenance.
        assert "inferred_why" in t.cypher
        assert "c.why =" not in t.cypher
        assert "c.provenance =" not in t.cypher
        # Versioned Assertion so authorize can SUPERSEDE/CONTRADICT instead of overwrite.
        assert ":Assertion" in t.cypher
        assert "provenance_status = 'suggested'" in t.cypher
        assert "HAS_ASSERTION" in t.cypher

    def test_authoritative_why_and_invariants_are_human_only_human_authored(self):
        # "human-authored" means a HUMAN authored it — the operator identity or the Code
        # Owner. What must never hold is an AGENT role stamping it (see the structural
        # defense below); widening to the Code Owner does not weaken that.
        for key in ("authorize_capability_why", "assert_invariant"):
            t = next(t for t in VOCABULARY if t.key == key)
            assert t.allow_roles == (OPERATOR, CODE_OWNER)
            assert PORTER not in t.allow_roles and JOURNEYMAN not in t.allow_roles
            assert "'human-authored'" in t.cypher

    def test_authorize_keeps_prior_assertions_via_supersedes_and_contradicts(self):
        # Highest-value item from the audit proposal: authorize must NOT silently
        # overwrite the Journeyman's suggested why. Keep both nodes and link them.
        t = next(t for t in VOCABULARY if t.key == "authorize_capability_why")
        assert ":Assertion" in t.cypher
        assert "SUPERSEDES" in t.cypher
        assert "CONTRADICTS" in t.cypher
        assert "provenance_status = 'authorized'" in t.cypher
        assert "provenance_status = 'superseded'" in t.cypher
        # Still mirrors onto c.why for legacy readers.
        assert "c.why = $why" in t.cypher

    def test_assert_invariant_carries_severity_and_effectivity(self):
        t = next(t for t in VOCABULARY if t.key == "assert_invariant")
        assert "severity" in t.param_schema
        assert t.param_schema["severity"]["default"] == "Violation"
        assert "inv.severity" in t.cypher
        assert "inv.valid_from" in t.cypher
        assert "inv.valid_to" in t.cypher

    def test_capability_and_decision_carry_effectivity_windows(self):
        cap = next(t for t in VOCABULARY if t.key == "upsert_capability")
        assert "c.valid_from" in cap.cypher and "c.valid_to" in cap.cypher
        dec = next(t for t in VOCABULARY if t.key == "assert_rationale")
        assert "d.valid_from" in dec.cypher
        assert "provenance_status = 'suggested'" in dec.cypher
        assert "d.role = 'Journeyman'" in dec.cypher
        assert "d.confidence" in dec.cypher
        assert "d.generated_at_time" in dec.cypher

    def test_retire_funding_block_marks_superseded_without_deleting_node(self):
        t = next(t for t in VOCABULARY if t.key == "retire_funding_block")
        assert "DELETE b" in t.cypher  # only the BLOCKS edge
        assert "DELETE f" not in t.cypher
        assert "historical" in t.cypher
        assert "superseded" in t.cypher

    def test_code_owner_is_confined_to_doctrine(self):
        # The Code Owner token exists to author doctrine as a human — nothing else. If it
        # spreads onto ordinary writes it stops meaning "this is doctrine" and becomes just
        # another way to reach the graph.
        reachable = {t.key for t in VOCABULARY if CODE_OWNER in t.allow_roles}
        assert reachable == {"authorize_capability_why", "assert_invariant",
                             "guard_invariant_symbol", "mark_invariant_contradiction"}

    def test_no_journeyman_reachable_template_writes_human_authored(self):
        # Structural confabulation defense: nothing an agent can call stamps 'human-authored'.
        for t in VOCABULARY:
            if PORTER in t.allow_roles or JOURNEYMAN in t.allow_roles:
                assert "'human-authored'" not in t.cypher, t.key

    def test_time_bearing_writes_stamp_a_timestamp(self):
        # The Recently Changed feed can only see a node once a write has stamped it.
        # index_symbol must stamp both first-index and every touch; the patent writes
        # must stamp updated_at (upsert always; the link writes at least on create).
        idx = next(t for t in VOCABULARY if t.key == "index_symbol")
        assert "sym.indexed_at = timestamp()" in idx.cypher
        assert "sym.updated_at = timestamp()" in idx.cypher
        upsert = next(t for t in VOCABULARY if t.key == "upsert_patent_element")
        assert "p.updated_at = timestamp()" in upsert.cypher
        for key in ("link_capability_to_patent", "link_invariant_to_patent"):
            t = next(t for t in VOCABULARY if t.key == key)
            assert "p.updated_at = timestamp()" in t.cypher

    def test_a_node_is_resolved_by_the_same_key_in_every_template(self):
        """Every template must resolve a given node label by the SAME property key.

        This is the invariant that broke: `register_service` MERGEd a Service on
        {repo_npub, repo_name} while `index_symbol` MERGEd it on {repo_name} alone and
        `symbols_in_service` MATCHed on {repo_name}. repo_npub is mutable, so a
        re-registration under a new npub minted a SECOND Service wearing the same name —
        8 of 18 repos ended up doubled. Downstream, `symbols_in_service` matched both twins
        and returned every row twice, and IN_SERVICE edges scattered across the pair.

        Nothing raises when this happens; MERGE just creates. So the guard has to live here.
        Composite keys are legitimate where every part is immutable identity (an Issue IS
        (repo_name, number)) — what is forbidden is DISAGREEMENT between templates.
        """
        import re
        pattern = re.compile(r"(?:MERGE|MATCH) \(\w*:(\w+) \{([^}]*)\}\)")
        keys_by_label: dict[str, dict[frozenset, list[str]]] = {}
        for t in list(VOCABULARY) + list(READ_VOCABULARY):
            for label, props in pattern.findall(t.cypher):
                key = frozenset(p.split(":")[0].strip() for p in props.split(","))
                keys_by_label.setdefault(label, {}).setdefault(key, []).append(t.key)
        disagreements = {
            label: {tuple(sorted(k)): tmpls for k, tmpls in variants.items()}
            for label, variants in keys_by_label.items() if len(variants) > 1
        }
        assert not disagreements, (
            f"these node labels are resolved by different keys in different templates, so "
            f"the same real-world entity can become two nodes: {disagreements}"
        )
        # and pin the two that actually carry cross-template identity
        assert list(keys_by_label["Service"]) == [frozenset({"repo_name"})]
        assert list(keys_by_label["Symbol"]) == [frozenset({"fqn"})]

    def test_record_triage_stores_actual_issue_and_repo_urls(self):
        t = next(t for t in VOCABULARY if t.key == "record_triage")
        # URLs are caller-supplied params (the real GitHub URLs), bound in the SET — never derived.
        assert "issue_url" in t.param_schema and "repo_url" in t.param_schema
        assert "i.url = $issue_url" in t.cypher and "i.repo_url = $repo_url" in t.cypher

    def test_only_entry_writers_create_issues_and_both_require_url(self):
        # URL-completeness invariant: an Issue node is born ONLY via claim_issue or
        # record_triage, and BOTH require issue_url — so no write can mint a URL-less
        # node. Every other issue-touching write MATCHes an already-claimed node, so a
        # future enrichment/reverse-route path can never re-introduce a URL-less issue.
        entry = {"claim_issue", "record_triage"}
        for t in VOCABULARY:
            if "(i:Issue" not in t.cypher and "(o:Issue" not in t.cypher:
                continue
            if t.key in entry:
                assert "MERGE (i:Issue" in t.cypher, f"{t.key} must create the Issue"
                assert t.param_schema.get("issue_url", {}).get("required") is True, \
                    f"{t.key} must REQUIRE issue_url"
            else:
                assert "MERGE (i:Issue" not in t.cypher, f"{t.key} must MATCH, not create, an Issue"
                assert "MERGE (o:Issue" not in t.cypher, f"{t.key} must MATCH, not create, an Issue"

    def test_link_pr_is_journeyman_only_and_creates_the_fixes_edge(self):
        t = next(t for t in VOCABULARY if t.key == "link_pr")
        assert t.allow_roles == (JOURNEYMAN,)
        # The Journeyman KNOWS the PR number (gh pr create prints it) — it is explicit,
        # never scraped out of pr_url.
        assert t.param_schema["pr_url"]["required"] is True
        assert t.param_schema["pr_number"]["required"] is True
        # It owns ONLY the FIXES edge; it MATCHes the Issue (never mints one) and the PR
        # node is a skeleton it may MERGE by (repo_name, number).
        assert "MATCH (i:Issue" in t.cypher and "MERGE (i:Issue" not in t.cypher
        assert "MERGE (p:PullRequest {repo_name: $repo_name, number: $pr_number})" in t.cypher
        assert "MERGE (p)-[:FIXES]->(i)" in t.cypher
        # Clean break: the flat pr_url string on the Issue is gone.
        assert "i.pr_url" not in t.cypher

    def test_upsert_pull_request_mirrors_state_and_carries_no_provenance(self):
        t = next(t for t in VOCABULARY if t.key == "upsert_pull_request")
        assert t.allow_roles == (JOURNEYMAN,)
        # Keyed by (repo_name, number) — the same identity link_pr uses, so the two
        # writers converge on one node and never mint duplicates.
        assert "MERGE (p:PullRequest {repo_name: $repo_name, number: $number})" in t.cypher
        # Owns the mutable lifecycle state that makes an ACTIVE PR visible.
        assert "p.state = $state" in t.cypher and "p.draft = $draft" in t.cypher
        # An OBSERVED mirror node, same tier as :FundingBlock — it carries NO provenance.
        assert "provenance" not in t.cypher
        assert "provenance" not in t.param_schema

    def test_enforcement_of_intention_is_never_a_stored_edge(self):
        # The thesis "a PR enforces an intention" is answered by a QUERY-TIME traversal
        # (PR-[:FIXES]->Issue-[:ABOUT_CAPABILITY]->Capability), never a written :ENFORCES
        # edge — so no writer can forge it. No write template may create ENFORCES.
        for t in VOCABULARY:
            assert ":ENFORCES" not in t.cypher, t.key

    def test_no_template_hardcodes_a_github_owner(self):
        # The no-hardcode rule: URLs must be actual runtime values, never a baked-in owner string.
        for t in [*VOCABULARY, *READ_VOCABULARY]:
            assert "github.com/" not in t.cypher, t.key


class TestReadVocabulary:
    @pytest.mark.parametrize("t", READ_VOCABULARY, ids=lambda t: t.key)
    def test_read_schema_is_valid(self, t):
        assert validate_param_schema(t.param_schema) == []

    @pytest.mark.parametrize("t", READ_VOCABULARY, ids=lambda t: t.key)
    def test_read_params_are_bound(self, t):
        assert assert_parameterized(t.cypher, t.param_schema) is None

    @pytest.mark.parametrize("t", READ_VOCABULARY, ids=lambda t: t.key)
    def test_reads_are_read_only(self, t):
        assert t.access_mode == "read"
        assert not any(kw in t.cypher for kw in ("MERGE", "CREATE", "DELETE", "SET"))
        assert "MATCH" in t.cypher and "RETURN" in t.cypher

    def test_reads_are_open(self):
        # No per-npub gate on reads — any funded agent may resolve intent.
        for t in READ_VOCABULARY:
            assert t.allow_roles == ()

    def test_issue_provenance_returns_urls_and_fix_prs(self):
        t = next(t for t in READ_VOCABULARY if t.key == "issue_provenance")
        assert t.access_mode == "read"
        # The click-through surface returns the issue and repo URLs.
        for field in ("issue_url", "repo_url"):
            assert field in t.cypher, field
        # PRs are first-class now: the fix PR(s) arrive as a collected list off the FIXES
        # edge, not a flat pr_url string (an issue can be fixed by more than one PR).
        assert "(pr:PullRequest)-[:FIXES]->(i)" in t.cypher
        assert "prs" in t.cypher
        assert "i.pr_url" not in t.cypher

    def test_pr_reads_derive_enforced_capabilities_by_traversal(self):
        by_key = {t.key: t for t in READ_VOCABULARY}
        for key in ("list_pull_requests", "pr_provenance"):
            assert key in by_key, f"missing PR read {key}"
            t = by_key[key]
            assert t.access_mode == "read" and t.allow_roles == ()
            # The intention a PR enforces is derived, at read time, from
            # FIXES->Issue->ABOUT_CAPABILITY — never a stored edge.
            assert "(p)-[:FIXES]->(i:Issue)" in t.cypher
            assert "(i)-[:ABOUT_CAPABILITY]->(" in t.cypher

    def test_pr_reads_fall_back_to_the_fixed_issue_title(self):
        # A row must lead with a human summary, never a bare number: when a PR has no
        # title of its own (mirrored/backfilled before it was captured), its title
        # coalesces to the title of the issue it fixes.
        by_key = {t.key: t for t in READ_VOCABULARY}
        for key in ("list_pull_requests", "pr_provenance"):
            assert "coalesce(p.title, collect(DISTINCT i.title)[0])" in by_key[key].cypher, key
        # recent_activity's PullRequest row does the same via the fixed-issue title.
        ra = by_key["recent_activity"].cypher
        assert "coalesce(pr.title, fix_title, '')" in ra

    def test_recent_activity_is_a_bounded_cross_type_feed(self):
        t = next(t for t in READ_VOCABULARY if t.key == "recent_activity")
        # Bounded by BOTH ends so calendar windows (yesterday / last month) are exact.
        assert "$since_ms" in t.cypher and "$until_ms" in t.cypher
        assert "updated_at >= $since_ms" in t.cypher
        assert "$until_ms <= 0 OR updated_at < $until_ms" in t.cypher
        # Unions every first-class node type into one normalized stream.
        for label in ("Capability", "Issue", "PullRequest", "Symbol", "Invariant", "PatentElement", "Service"):
            assert f":{label})" in t.cypher, label
        # The uniform row shape the FE renders + routes on, newest-first.
        for col in ("kind", "label", "key", "repo", "updated_at"):
            assert col in t.cypher, col
        assert "ORDER BY updated_at DESC" in t.cypher

    def test_six_audit_queries_exist_with_shared_envelope(self):
        # One question per query (not a mega-query). Keys use underscores so
        # publish_tool accepts them (^ [a-z][a-z0-9_]* $); conceptual names are
        # audit.why_exists etc.
        expected = {
            "audit_why_exists": "why_exists",
            "audit_who_authorized": "who_authorized",
            "audit_what_derived_from": "what_derived_from",
            "audit_what_guards": "what_guards",
            "audit_what_contradicts": "what_contradicts",
            "audit_what_changed_since": "what_changed_since",
        }
        by_key = {t.key: t for t in READ_VOCABULARY}
        for key, question in expected.items():
            assert key in by_key, f"missing audit query {key}"
            t = by_key[key]
            assert t.access_mode == "read"
            assert t.allow_roles == ()
            # Shared envelope columns the FE page renders.
            for col in ("subject", "question", "assertions", "contradictions", "gaps"):
                assert col in t.cypher, f"{key} missing envelope field {col}"
            assert f"'{question}' AS question" in t.cypher
            # PROV term as a badge string, never bare prose-only.
            assert "prov:" in t.cypher or "wasAttributedTo" in t.cypher \
                or "wasDerivedFrom" in t.cypher or "wasGeneratedBy" in t.cypher \
                or "wasAssociatedWith" in t.cypher

    def test_audit_why_exists_surfaces_gaps_and_effectivity(self):
        t = next(t for t in READ_VOCABULARY if t.key == "audit_why_exists")
        assert "as_at_ms" in t.param_schema
        assert "no authorized why exists" in t.cypher
        assert "no invariant guards this capability" in t.cypher
        assert "valid_from" in t.cypher and "valid_to" in t.cypher

    def test_point_in_time_audit_queries_accept_as_at_ms(self):
        """#76: derived_from and what_contradicts must share the as_at_ms convention.

        The FE always sends as_at_ms for every non-since question. When these two
        rejected it as an unexpected keyword, both the named tool and the
        execute_query_by_key fallback failed identically — no way to ask either
        question as-at a point in time. as_at_ms=0 means now, matching siblings.
        """
        point_in_time = (
            "audit_why_exists",
            "audit_who_authorized",
            "audit_what_derived_from",
            "audit_what_guards",
            "audit_what_contradicts",
        )
        by_key = {t.key: t for t in READ_VOCABULARY}
        for key in point_in_time:
            t = by_key[key]
            assert "as_at_ms" in t.param_schema, f"{key} must declare as_at_ms"
            spec = t.param_schema["as_at_ms"]
            assert spec.get("required") is False
            assert spec.get("default") == 0
            assert "$as_at_ms" in t.cypher, f"{key} must bind $as_at_ms in Cypher"
            # Shared valid-time filter shape used by the siblings that already work.
            assert "CASE WHEN $as_at_ms <= 0 THEN timestamp() ELSE $as_at_ms END" in t.cypher

        # Window-since stays deliberate asymmetry — since_ms, not as_at_ms.
        changed = by_key["audit_what_changed_since"]
        assert "since_ms" in changed.param_schema
        assert "as_at_ms" not in changed.param_schema

    def test_audit_what_contradicts_keeps_both_sides(self):
        t = next(t for t in READ_VOCABULARY if t.key == "audit_what_contradicts")
        assert "CONTRADICTS" in t.cypher
        assert "left" in t.cypher and "right" in t.cypher
        # Never a DELETE in a read.
        assert "DELETE" not in t.cypher
        # Effectivity filters both assertion and invariant sides (#76).
        assert "as_at_ms" in t.param_schema
        assert "valid_from" in t.cypher and "valid_to" in t.cypher


class TestSeedBuilders:
    def test_resolve_roles_dedups_and_orders(self):
        assert resolve_roles((PORTER, JOURNEYMAN), NPUBS) == [PORTER_NPUB, JOURNEYMAN_NPUB]
        assert resolve_roles((JOURNEYMAN, JOURNEYMAN), NPUBS) == [JOURNEYMAN_NPUB]

    def test_gate_step_has_no_patron_npubs(self):
        # Critical: patron_npubs would SKIP the gate for outsiders (letting them through).
        step = build_gate_step([JOURNEYMAN_NPUB])
        assert "patron_npubs" not in step
        assert step["type"] == "json_expression"
        assert step["params"]["on_match"] == "allow"
        assert step["params"]["expression"]["field"] == "patron.npub"

    def test_porter_is_excluded_from_journeyman_only_tools(self):
        model = {"tools": [{"tool_name": f"cypher_{t.key}", "chain": []} for t in VOCABULARY]}
        apply_gate_and_price(model, NPUBS)
        by = {tp["tool_name"]: tp for tp in model["tools"]}
        assert by["cypher_assert_rationale"]["chain"][0]["params"]["expression"]["value"] == [JOURNEYMAN_NPUB]
        assert set(by["cypher_record_triage"]["chain"][0]["params"]["expression"]["value"]) == {
            PORTER_NPUB, JOURNEYMAN_NPUB,
        }
        assert all(tp["priced"] and tp["price_sats"] > 0 for tp in model["tools"])

    def test_doctrine_writes_are_gated_to_operator_and_code_owner(self):
        model = {"tools": [{"tool_name": f"cypher_{t.key}", "chain": []} for t in VOCABULARY]}
        apply_gate_and_price(model, NPUBS)
        by = {tp["tool_name"]: tp for tp in model["tools"]}
        for key in ("authorize_capability_why", "assert_invariant", "guard_invariant_symbol",
                    "mark_invariant_contradiction"):
            assert by[f"cypher_{key}"]["chain"][0]["params"]["expression"]["value"] == [
                OPERATOR_NPUB, CODE_OWNER_NPUB]

    def test_journeyman_forward_map_writes_are_gated_to_journeyman(self):
        model = {"tools": [{"tool_name": f"cypher_{t.key}", "chain": []} for t in VOCABULARY]}
        apply_gate_and_price(model, NPUBS)
        by = {tp["tool_name"]: tp for tp in model["tools"]}
        for key in ("upsert_capability", "bind_capability_to_symbol", "index_symbol",
                    "suggest_capability_why", "link_capability_consumer"):
            assert by[f"cypher_{key}"]["chain"][0]["params"]["expression"]["value"] == [JOURNEYMAN_NPUB]

    def test_gate_only_preserves_studio_prices(self):
        # Closing the gate must NOT clobber prices an operator set in Studio.
        model = {"tools": [
            {"tool_name": "cypher_assert_rationale", "price_sats": 42, "priced": True, "chain": []},
        ]}
        apply_gate_and_price(model, NPUBS, set_prices=False)
        tp = model["tools"][0]
        assert tp["price_sats"] == 42 and tp["priced"] is True          # untouched
        assert tp["chain"][0]["params"]["expression"]["value"] == [JOURNEYMAN_NPUB]  # gated

    def test_reads_are_priced_but_ungated(self):
        # Reads get a price but an empty chain (open to any funded patron).
        model = {"tools": [{"tool_name": f"cypher_{t.key}", "chain": []} for t in READ_VOCABULARY]}
        apply_gate_and_price(model, NPUBS)
        for tp in model["tools"]:
            assert tp["priced"] and tp["price_sats"] > 0
            assert tp["chain"] == []


class TestAllowListGatingContract:
    """Pin the wheel behavior our gating depends on: a json_expression allow-list on
    patron.npub allows a listed npub and denies everyone else (default-deny)."""

    def _ctx(self, npub):
        from tollbooth.constraints.base import (
            ConstraintContext,
            EnvironmentSnapshot,
            LedgerSnapshot,
            PatronIdentity,
        )
        return ConstraintContext(
            ledger=LedgerSnapshot(balance_api_sats=1000),
            patron=PatronIdentity(npub=npub),
            env=EnvironmentSnapshot(utc_now=datetime.now(UTC), tool_name="cypher_assert_rationale"),
        )

    def _constraint(self):
        from tollbooth.constraints.expression import JsonExpressionConstraint
        params = build_gate_step([JOURNEYMAN_NPUB])["params"]
        return JsonExpressionConstraint.from_dict({"type": "json_expression", **params})

    def test_listed_npub_allowed(self):
        assert self._constraint().evaluate(self._ctx(JOURNEYMAN_NPUB)).allowed is True

    def test_unlisted_npub_denied(self):
        result = self._constraint().evaluate(self._ctx(PORTER_NPUB))
        assert result.allowed is False
        assert result.reason == "not_authorized"


class TestEveryReferencedOptionalParamBinds:
    """A template's Cypher may only reference a param that will actually be bound.

    The synthesis layer drops an omitted optional param rather than passing None,
    so a template that interpolates `$x` unconditionally needs `x` to carry a
    declared default — otherwise the query runs against an unbound parameter and
    dies. That is not hypothetical: `list_capabilities` failed on every
    no-argument call for four days (2026-07-26 → 07-29), refunding each time, and
    `claim_issue` carried the same latent break on `$title`.

    This guards the whole class rather than the two instances we happened to hit.
    """

    def test_no_referenced_optional_param_lacks_a_default(self):
        import re

        offenders = []
        for coll in (VOCABULARY, READ_VOCABULARY):
            for t in coll:
                referenced = set(re.findall(r"\$([a-z_][a-z0-9_]*)", t.cypher))
                for name, spec in (t.param_schema or {}).items():
                    if spec.get("required", True):
                        continue
                    if name in referenced and "default" not in spec:
                        offenders.append(f"{t.key}:${name}")
        assert offenders == [], (
            "these optional params are interpolated by their Cypher but declare no "
            f"default, so omitting them leaves the parameter unbound: {offenders}"
        )
