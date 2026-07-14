"""Task 1 — the Software Factory mutation vocabulary + its per-npub gating.

Validates the six write templates against the wheel's own author-time guards, proves the
provenance literal is unforgeable by an agent, and pins the Constraint-Engine allow-list
contract we rely on for access control (json_expression on patron.npub).
"""

from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from factory_vocabulary import VOCABULARY, PORTER, JOURNEYMAN  # noqa: E402
from seed_factory_vocabulary import (  # noqa: E402
    apply_gate_and_price,
    build_gate_step,
    resolve_roles,
)

from tollbooth.dynamic_tools import validate_param_schema  # noqa: E402
from cypher_mcp.catalog import assert_parameterized  # noqa: E402

PORTER_NPUB = "npub1porter_test"
JOURNEYMAN_NPUB = "npub1journeyman_test"
NPUBS = {PORTER: PORTER_NPUB, JOURNEYMAN: JOURNEYMAN_NPUB}


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

    def test_no_other_template_writes_provenance(self):
        for t in VOCABULARY:
            if t.key != "assert_rationale":
                assert "provenance" not in t.cypher


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


class TestAllowListGatingContract:
    """Pin the wheel behavior our gating depends on: a json_expression allow-list on
    patron.npub allows a listed npub and denies everyone else (default-deny)."""

    def _ctx(self, npub):
        from tollbooth.constraints.base import (
            ConstraintContext, EnvironmentSnapshot, LedgerSnapshot, PatronIdentity,
        )
        return ConstraintContext(
            ledger=LedgerSnapshot(balance_api_sats=1000),
            patron=PatronIdentity(npub=npub),
            env=EnvironmentSnapshot(utc_now=datetime.now(timezone.utc), tool_name="cypher_assert_rationale"),
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
