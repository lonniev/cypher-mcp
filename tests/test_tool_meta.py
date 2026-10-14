"""A published query's title and behaviour hints, read from its catalog row.

Pins the behaviour judged for every template in the factory vocabulary, so a new
template (or a rule change) that shifts a hint is a visible decision.
"""

import sys
from pathlib import Path

import pytest
from tollbooth.tool_identity import (
    CREATES_REMOTE,
    DELETES_REMOTE,
    READS_REMOTE,
    REPLACES_REMOTE,
    WRITES_REMOTE,
)

from cypher_mcp.tool_meta import (
    REPLACES_AND_APPENDS_REMOTE,
    behavior_for_query,
    title_for_key,
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from factory_vocabulary import READ_VOCABULARY, VOCABULARY

EXPECTED_WRITES = {
    "register_service": REPLACES_REMOTE,
    "record_triage": REPLACES_REMOTE,
    "claim_issue": REPLACES_REMOTE,
    "record_scope": REPLACES_REMOTE,
    "link_issue_to_capability": WRITES_REMOTE,
    "note_rejection": CREATES_REMOTE,
    "route_rejection": CREATES_REMOTE,
    "mark_funding_state": REPLACES_REMOTE,
    "retire_funding_block": DELETES_REMOTE,
    "link_root_cause": WRITES_REMOTE,
    "link_pr": WRITES_REMOTE,
    "upsert_pull_request": REPLACES_REMOTE,
    "assert_rationale": REPLACES_REMOTE,
    "bind_rationale_to_symbol": WRITES_REMOTE,
    "upsert_capability": REPLACES_REMOTE,
    "link_capability_consumer": WRITES_REMOTE,
    "bind_capability_to_symbol": WRITES_REMOTE,
    "anchor_symbol": REPLACES_REMOTE,
    "index_symbol": REPLACES_REMOTE,
    "suggest_capability_why": REPLACES_REMOTE,
    "authorize_capability_why": REPLACES_AND_APPENDS_REMOTE,
    "assert_invariant": REPLACES_REMOTE,
    "mark_invariant_contradiction": REPLACES_REMOTE,
    "guard_invariant_symbol": WRITES_REMOTE,
    "upsert_patent_element": REPLACES_REMOTE,
    "link_capability_to_patent": WRITES_REMOTE,
    "link_invariant_to_patent": WRITES_REMOTE,
}


def _row(t):
    return {"access_mode": t.access_mode, "cypher_template": t.cypher}


def test_every_write_template_has_a_judged_behavior():
    assert {t.key for t in VOCABULARY} == set(EXPECTED_WRITES)


@pytest.mark.parametrize("template", VOCABULARY, ids=lambda t: t.key)
def test_write_template_behavior(template):
    assert behavior_for_query(_row(template)) == EXPECTED_WRITES[template.key]


@pytest.mark.parametrize("template", READ_VOCABULARY, ids=lambda t: t.key)
def test_read_template_only_reads(template):
    assert behavior_for_query(_row(template)) == READS_REMOTE


def test_missing_access_mode_is_a_read():
    assert behavior_for_query({"cypher_template": "MATCH (n) RETURN n"}) == READS_REMOTE


def test_keywords_inside_string_literals_are_ignored():
    row = {
        "access_mode": "write",
        "cypher_template": "MERGE (n:Note {id: $id}) ON CREATE SET n.text = 'DELETE me; SET x'",
    }
    assert behavior_for_query(row) == WRITES_REMOTE


@pytest.mark.parametrize(
    ("key", "title"),
    [
        ("upsert_capability", "Upsert capability"),
        ("pr_provenance", "PR provenance"),
        ("audit_what_changed_since", "Audit what changed since"),
        ("list_pull_requests", "List pull requests"),
    ],
)
def test_title_for_key(key, title):
    assert title_for_key(key) == title
