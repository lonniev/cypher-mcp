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
NPUBS = {PORTER: PORTER_NPUB, JOURNEYMAN: JOURNEYMAN_NPUB, OPERATOR: OPERATOR_NPUB}


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

    def test_authoritative_why_and_invariants_are_operator_only_human_authored(self):
        for key in ("authorize_capability_why", "assert_invariant"):
            t = next(t for t in VOCABULARY if t.key == key)
            assert t.allow_roles == (OPERATOR,)
            assert PORTER not in t.allow_roles and JOURNEYMAN not in t.allow_roles
            assert "'human-authored'" in t.cypher

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

    def test_link_pr_is_journeyman_only_and_stores_actual_pr_url(self):
        t = next(t for t in VOCABULARY if t.key == "link_pr")
        assert t.allow_roles == (JOURNEYMAN,)
        assert t.param_schema["pr_url"]["required"] is True
        assert "i.pr_url = $pr_url" in t.cypher

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

    def test_issue_provenance_returns_the_three_urls(self):
        t = next(t for t in READ_VOCABULARY if t.key == "issue_provenance")
        assert t.access_mode == "read"
        # The click-through surface returns the issue, repo, and PR URLs.
        for field in ("issue_url", "repo_url", "pr_url"):
            assert field in t.cypher, field

    def test_recent_activity_is_a_bounded_cross_type_feed(self):
        t = next(t for t in READ_VOCABULARY if t.key == "recent_activity")
        # Bounded by BOTH ends so calendar windows (yesterday / last month) are exact.
        assert "$since_ms" in t.cypher and "$until_ms" in t.cypher
        assert "updated_at >= $since_ms" in t.cypher
        assert "$until_ms <= 0 OR updated_at < $until_ms" in t.cypher
        # Unions every first-class node type into one normalized stream.
        for label in ("Capability", "Issue", "Symbol", "Invariant", "PatentElement", "Service"):
            assert f":{label})" in t.cypher, label
        # The uniform row shape the FE renders + routes on, newest-first.
        for col in ("kind", "label", "key", "repo", "updated_at"):
            assert col in t.cypher, col
        assert "ORDER BY updated_at DESC" in t.cypher


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

    def test_operator_only_writes_are_gated_to_operator(self):
        model = {"tools": [{"tool_name": f"cypher_{t.key}", "chain": []} for t in VOCABULARY]}
        apply_gate_and_price(model, NPUBS)
        by = {tp["tool_name"]: tp for tp in model["tools"]}
        for key in ("authorize_capability_why", "assert_invariant", "guard_invariant_symbol"):
            assert by[f"cypher_{key}"]["chain"][0]["params"]["expression"]["value"] == [OPERATOR_NPUB]

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
