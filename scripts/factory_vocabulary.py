"""The DPYC Software Factory mutation vocabulary — data, not I/O.

Six operator-authored, parameterized *write* templates that give the factory agents
(Porter = Service Desk, Journeyman = Engineering) a fixed vocabulary for writing the
institutional-memory graph, without ever holding a raw Cypher write tool. Design:
PersonalBrain 6dd4c5e0 (Task 1) + 32a330fb (Porter & Journeyman).

Node model
----------
    (:Service {repo_npub, repo_name})                one per repo — the service is the actor
    (:Issue   {repo_name, number, title, classification, disposition})
    (:Rejection {reason, at})                          history-preserving; linked to its Issue
    (:Decision {id, statement, reason, provenance, at}) provenance is a LITERAL here
    (:Symbol  {fqn})                                   a code location by fully-qualified name

    (:Issue)-[:FILED_AGAINST]->(:Service)
    (:Issue)-[:HAS_REJECTION]->(:Rejection)
    (:Issue)-[:ROOT_CAUSE]->(:Symbol)
    (:Issue)-[:HAS_RATIONALE]->(:Decision)
    (:Decision)-[:ABOUT]->(:Symbol)

Provenance
----------
The agent-facing ``assert_rationale`` template hard-codes
``provenance: 'llm-inferred-unverified'`` as a Cypher *literal* — there is no provenance
parameter, so an agent key physically cannot write ``human-authored`` or
``harvested-from-PR``. Those authoritative provenances are the operator/harvest path
(Task 3), never the agent surface. This is stricter than a validated enum and enforced
in the template exactly as the design note requires.

Access
------
Per-npub access is NOT encoded here — it is a Constraint-Engine concern applied to each
published tool via the pricing model (a ``json_expression`` allow-list on ``patron.npub``).
See ``seed_factory_vocabulary.py`` :func:`build_gate_step`. Each entry only *declares* which
roles should be allowed; the seed script turns that into pricing-model config.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Role tokens — resolved to concrete npubs by the seed script.
PORTER = "porter"
JOURNEYMAN = "journeyman"


@dataclass(frozen=True)
class WriteTemplate:
    key: str
    cypher: str
    param_schema: dict[str, Any]
    description: str
    intent: str
    allow_roles: tuple[str, ...]  # which agent roles may call the published tool
    price_sats: int = 5


VOCABULARY: list[WriteTemplate] = [
    WriteTemplate(
        key="register_service",
        cypher=(
            "MERGE (s:Service {repo_npub: $repo_npub, repo_name: $repo_name}) "
            "ON CREATE SET s.created_at = timestamp() "
            "RETURN s.repo_name AS repo_name"
        ),
        param_schema={
            "repo_npub": {"type": "string", "required": True,
                          "description": "The service's own Nostr npub (the repo as an actor)."},
            "repo_name": {"type": "string", "required": True,
                          "description": "Repository name, e.g. 'tollbooth-sample'."},
        },
        description="Register (idempotently) a Service node for a repo, keyed by its npub and name.",
        intent="Register a repo as a Service node in the factory graph.",
        allow_roles=(JOURNEYMAN,),
    ),
    WriteTemplate(
        key="record_triage",
        cypher=(
            "MERGE (s:Service {repo_name: $repo_name}) "
            "MERGE (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "SET i.title = $title, i.classification = $classification, "
            "    i.disposition = $disposition, i.triaged_at = timestamp() "
            "MERGE (i)-[:FILED_AGAINST]->(s) "
            "RETURN i.number AS issue"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "title": {"type": "string", "required": True, "description": "Issue title."},
            "classification": {"type": "string", "required": True,
                               "description": "type/* classification, e.g. 'bug'."},
            "disposition": {"type": "string", "required": True,
                            "description": "Routing disposition, e.g. 'agent/fix', 'rejected', 'blocked/upstream'."},
        },
        description="Record a triaged Issue and link it to its Service.",
        intent="Record the Porter's triage of a GitHub issue.",
        allow_roles=(PORTER, JOURNEYMAN),
    ),
    WriteTemplate(
        key="note_rejection",
        cypher=(
            "MATCH (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "CREATE (r:Rejection {reason: $reason, at: timestamp()}) "
            "MERGE (i)-[:HAS_REJECTION]->(r) "
            "RETURN r.reason AS reason"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "reason": {"type": "string", "required": True,
                       "description": "Why the issue was rejected (spam, out-of-scope, injection, ...)."},
        },
        description="Attach a rejection with its reason to an Issue (history-preserving).",
        intent="Record why the Porter rejected an issue.",
        allow_roles=(PORTER, JOURNEYMAN),
    ),
    WriteTemplate(
        key="link_root_cause",
        cypher=(
            "MATCH (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "MERGE (i)-[:ROOT_CAUSE]->(sym) "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "Fully-qualified name of the code symbol at fault."},
        },
        description="Link an Issue to the code Symbol identified as its root cause.",
        intent="Point an issue at the code symbol that caused it.",
        allow_roles=(PORTER, JOURNEYMAN),
    ),
    WriteTemplate(
        key="assert_rationale",
        # provenance is a LITERAL — no param — so an agent key cannot set another value.
        cypher=(
            "MATCH (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "MERGE (d:Decision {id: $decision_id}) "
            "SET d.statement = $statement, d.reason = $reason, "
            "    d.provenance = 'llm-inferred-unverified', d.at = timestamp() "
            "MERGE (i)-[:HAS_RATIONALE]->(d) "
            "RETURN d.id AS decision"
        ),
        param_schema={
            "decision_id": {"type": "string", "required": True,
                            "description": "Stable id for this decision (e.g. '<repo>#<issue>-<slug>')."},
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "statement": {"type": "string", "required": True,
                          "description": "The decision, stated plainly."},
            "reason": {"type": "string", "required": True, "description": "Why — the rationale."},
        },
        description="Assert a Decision (rationale) for an Issue. Provenance is fixed to "
                    "'llm-inferred-unverified' — agents cannot claim authoritative provenance.",
        intent="Record the Journeyman's rationale for a fix (unverified provenance).",
        allow_roles=(JOURNEYMAN,),
    ),
    WriteTemplate(
        key="bind_rationale_to_symbol",
        cypher=(
            "MATCH (d:Decision {id: $decision_id}) "
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "MERGE (d)-[:ABOUT]->(sym) "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "decision_id": {"type": "string", "required": True,
                            "description": "Id of the Decision (from assert_rationale)."},
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "Fully-qualified name of the code symbol the decision is about."},
        },
        description="Bind a Decision to the code Symbol it concerns.",
        intent="Attach the Journeyman's rationale to a specific code symbol.",
        allow_roles=(JOURNEYMAN,),
    ),
]
