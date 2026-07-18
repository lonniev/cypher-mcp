"""The DPYC Software Factory intent vocabulary — data, not I/O.

Operator-authored, parameterized templates that give the factory a fixed vocabulary for
reading and writing the institutional-memory graph, without ever holding a raw Cypher
tool. Design: PersonalBrain 60c4c06d ("Intention Service"): Task 1 = the mutation
vocabulary (Porter/Journeyman); Task 2 = the derived *forward map* — the Capability layer
and a read surface, written by the Journeyman (structure + advice) and the Operator
(authoritative intent).

Node model
----------
    (:Service {repo_npub, repo_name})                one per repo — the service is the actor
    (:Issue   {repo_name, number, title, classification, disposition})
    (:Rejection {reason, at})                          history-preserving; linked to its Issue
    (:Decision {id, statement, reason, provenance, at}) provenance is a LITERAL here
    (:Symbol  {fqn})                                   a code location by fully-qualified name
    (:Capability {name, keywords, why, provenance, inferred_why})  cross-cutting ability, e.g. "Secure Courier"
    (:Invariant  {name, rule, provenance})             an enforceable rule, e.g. "exactly two transaction types"
    (:PatentElement {ref, name, figures, claim_family})  a patent reference numeral, e.g. 610 "Secure Courier channel"

    (:Issue)-[:FILED_AGAINST]->(:Service)
    (:Issue)-[:HAS_REJECTION]->(:Rejection)
    (:Issue)-[:ROOT_CAUSE]->(:Symbol)
    (:Issue)-[:HAS_RATIONALE]->(:Decision)
    (:Decision)-[:ABOUT]->(:Symbol)
    (:Capability)-[:OWNED_BY]->(:Service)              multi-owner
    (:Capability)-[:CONSUMED_BY]->(:Service)
    (:Capability)-[:REALIZED_BY]->(:Symbol)            one capability → many symbols, across repos
    (:Invariant)-[:GUARDS]->(:Symbol)                  bounded expected symbol set (the later drift alarm)
    (:Capability)-[:DESCRIBED_IN]->(:PatentElement)    grounds the why in the filed patent
    (:Invariant)-[:DESCRIBED_IN]->(:PatentElement)
    (:Symbol)-[:IN_SERVICE]->(:Service)

Provenance — the asymmetry that defends against confabulation
-------------------------------------------------------------
There is **no provenance parameter anywhere** in this vocabulary. Every provenance is a
Cypher *literal* keyed to the *role* that can call the template — so the calling key, not
a trusted argument, decides authority. An agent physically cannot forge ``human-authored``.

  - Journeyman (an LLM) writes derived structure (no provenance at all), and its *advice*
    on why a capability exists into the ``inferred_why`` field via
    ``suggest_capability_why`` — implicitly ``llm-inferred-unverified``. Trusted advice,
    visible and queryable, but never doctrine. Mirrors ``assert_rationale``.
  - Operator (the human-run identity) writes the authoritative ``why``/``provenance``
    (``human-authored``) via ``authorize_capability_why`` and authors ``Invariant`` nodes
    via ``assert_invariant`` — both hard-code ``'human-authored'`` and are OPERATOR-gated.
    The human steps in only where it matters; the Journeyman's advice stands on its own
    until then. An agent may propose into the graph; it may not legislate into it.

Access
------
Per-npub access is NOT encoded here — it is a Constraint-Engine concern applied to each
published *write* tool via the pricing model (a ``json_expression`` allow-list on
``patron.npub``). Read tools are open (priced, unrestricted). See
``seed_factory_vocabulary.py`` :func:`build_gate_step`. Each entry only *declares* which
roles should be allowed; the seed script turns that into pricing-model config.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Role tokens — resolved to concrete npubs by the seed script.
PORTER = "porter"
JOURNEYMAN = "journeyman"
OPERATOR = "operator"  # the human-run operator identity; writes authoritative (human-authored) intent


@dataclass(frozen=True)
class Template:
    key: str
    cypher: str
    param_schema: dict[str, Any]
    description: str
    intent: str
    allow_roles: tuple[str, ...]  # which roles may call the published tool ( () = open, reads )
    price_sats: int = 5
    access_mode: str = "write"    # "write" (mutation) or "read" (query)


VOCABULARY: list[Template] = [
    Template(
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
        allow_roles=(JOURNEYMAN, OPERATOR),
    ),
    Template(
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
    Template(
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
    Template(
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
    Template(
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
    Template(
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
    # ---- Task 2: the derived forward map ------------------------------------- #
    # Journeyman writes the DERIVED STRUCTURE (no provenance — self-correcting, rebuilt on
    # push) and its ADVICE on why (implicitly llm-inferred-unverified). The Operator writes
    # the AUTHORITATIVE why/invariants (hard-coded 'human-authored'). No provenance is ever
    # a parameter; the calling role's template fixes it.
    Template(
        key="upsert_capability",
        cypher=(
            "MERGE (c:Capability {name: $name}) "
            "SET c.keywords = $keywords, c.updated_at = timestamp() "
            "MERGE (s:Service {repo_name: $owner_repo}) "
            "MERGE (c)-[:OWNED_BY]->(s) "
            "RETURN c.name AS name"
        ),
        param_schema={
            "name": {"type": "string", "required": True,
                     "description": "Capability name, e.g. 'Secure Courier'."},
            "owner_repo": {"type": "string", "required": True,
                           "description": "Repo of an owning Service (multi-owner: call again per owner)."},
            "keywords": {"type": "string", "required": True,
                         "description": "Comma-joined search keywords for forward-map resolution."},
        },
        description="Upsert a Capability (derived structure: keywords + OWNED_BY). No why/"
                    "provenance — those are separate, provenance-tiered templates.",
        intent="Record a cross-cutting service Capability and one of its owners.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        key="link_capability_consumer",
        cypher=(
            "MATCH (c:Capability {name: $name}) "
            "MERGE (s:Service {repo_name: $consumer_repo}) "
            "MERGE (c)-[:CONSUMED_BY]->(s) "
            "RETURN c.name AS name"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
            "consumer_repo": {"type": "string", "required": True,
                              "description": "Repo of a Service that consumes this capability."},
        },
        description="Link a Capability to a Service that consumes it (CONSUMED_BY).",
        intent="Record that a service consumes a capability.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        key="bind_capability_to_symbol",
        cypher=(
            "MATCH (c:Capability {name: $name}) "
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "MERGE (c)-[:REALIZED_BY]->(sym) "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "Fully-qualified name of a code symbol that realizes the capability."},
        },
        description="Bind a Capability to a code Symbol that realizes it (REALIZED_BY).",
        intent="Attach a capability to one of the symbols that implement it.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        key="index_symbol",
        cypher=(
            "MERGE (s:Service {repo_name: $repo_name}) "
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "SET sym.lang = $lang "
            "MERGE (sym)-[:IN_SERVICE]->(s) "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "Fully-qualified symbol name (per-language normalized)."},
            "lang": {"type": "string", "required": True,
                     "description": "Source language, e.g. 'python', 'swift', 'typescript', 'rust'."},
        },
        description="Register a code Symbol under its Service (IN_SERVICE). Capability-relevant "
                    "symbols only — not a blanket ctags dump.",
        intent="Index a code symbol as belonging to a service.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        # The Journeyman's ADVICE on why a capability exists. Provenance is the hard-coded
        # literal 'llm-inferred-unverified' — no parameter — and it writes ``inferred_why``,
        # never the authoritative ``why``/``provenance``. It will not overwrite the machine
        # advice onto a human-authored why (separate field). Trusted advice, not doctrine.
        key="suggest_capability_why",
        cypher=(
            "MERGE (c:Capability {name: $name}) "
            "SET c.inferred_why = $inferred_why, "
            "    c.inferred_provenance = 'llm-inferred-unverified', "
            "    c.inferred_at = timestamp() "
            "RETURN c.name AS name"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
            "inferred_why": {"type": "string", "required": True,
                             "description": "The Journeyman's best explanation of why this capability exists."},
        },
        description="Record the Journeyman's advice on why a capability exists "
                    "(inferred_why; provenance fixed to 'llm-inferred-unverified' — never doctrine).",
        intent="Offer the Journeyman's read on why a capability exists.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        # OPERATOR-only. Hard-codes 'human-authored'. Writes the AUTHORITATIVE why —
        # the field the Journeyman cannot reach.
        key="authorize_capability_why",
        cypher=(
            "MERGE (c:Capability {name: $name}) "
            "SET c.why = $why, c.provenance = 'human-authored', c.authored_at = timestamp() "
            "RETURN c.name AS name"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
            "why": {"type": "string", "required": True,
                    "description": "The authoritative, human-authored reason this capability exists."},
        },
        description="Set a Capability's authoritative why (provenance 'human-authored'). "
                    "OPERATOR-only — the human stepping in.",
        intent="Author the authoritative why for a capability.",
        allow_roles=(OPERATOR,),
    ),
    Template(
        # OPERATOR-only. Invariants are enforceable; only a human authors them. Provenance
        # hard-coded 'human-authored'.
        key="assert_invariant",
        cypher=(
            "MERGE (inv:Invariant {name: $name}) "
            "SET inv.rule = $rule, inv.provenance = 'human-authored', inv.at = timestamp() "
            "RETURN inv.name AS invariant"
        ),
        param_schema={
            "name": {"type": "string", "required": True,
                     "description": "Invariant name, e.g. 'exactly two transaction types'."},
            "rule": {"type": "string", "required": True,
                     "description": "The rule stated plainly (the enforceable 'MUST NOT' / cardinality)."},
        },
        description="Author an enforceable Invariant node (provenance 'human-authored'). "
                    "OPERATOR-only — distinct from Capability.",
        intent="Record an enforceable code invariant.",
        allow_roles=(OPERATOR,),
    ),
    Template(
        key="guard_invariant_symbol",
        cypher=(
            "MATCH (inv:Invariant {name: $name}) "
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "MERGE (inv)-[:GUARDS]->(sym) "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Invariant name."},
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "A symbol in the invariant's bounded expected set."},
        },
        description="Add a Symbol to an Invariant's guarded (bounded) set (GUARDS). A later "
                    "symbol matching the pattern but absent from this set is the drift alarm.",
        intent="Register a symbol an invariant guards.",
        allow_roles=(OPERATOR,),
    ),
    # ---- Patent tracing: ground capabilities in the filed provisional patent ---- #
    # PatentElement nodes are a transcription of the public REFERENCE-NUMERAL-SCHEDULE
    # (numeral → element name → figures → claim family) — a citation index, not a why, so
    # there is nothing to confabulate; Journeyman-writable.
    Template(
        key="upsert_patent_element",
        cypher=(
            "MERGE (p:PatentElement {ref: $ref}) "
            "SET p.name = $name, p.figures = $figures, p.claim_family = $claim_family "
            "RETURN p.ref AS ref"
        ),
        param_schema={
            "ref": {"type": "int", "required": True,
                    "description": "Patent reference numeral, e.g. 610."},
            "name": {"type": "string", "required": True,
                     "description": "Element name from the reference-numeral schedule."},
            "figures": {"type": "string", "required": True,
                        "description": "Figures the element appears in, e.g. '5' or '1,4'."},
            "claim_family": {"type": "string", "required": True,
                             "description": "Claim family, e.g. 'Nostr Identity & Credential Exchange'."},
        },
        description="Upsert a PatentElement (a filed-patent reference numeral) — the grounding index.",
        intent="Record a patent reference numeral as a node.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        key="link_capability_to_patent",
        cypher=(
            "MATCH (c:Capability {name: $name}) "
            "MERGE (p:PatentElement {ref: $patent_ref}) "
            "MERGE (c)-[:DESCRIBED_IN]->(p) "
            "RETURN p.ref AS ref"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
            "patent_ref": {"type": "int", "required": True,
                           "description": "Patent reference numeral the capability is described by."},
        },
        description="Trace a Capability to the patent element that describes it (DESCRIBED_IN).",
        intent="Ground a capability in a patent reference numeral.",
        allow_roles=(JOURNEYMAN,),
    ),
    Template(
        key="link_invariant_to_patent",
        cypher=(
            "MATCH (inv:Invariant {name: $name}) "
            "MERGE (p:PatentElement {ref: $patent_ref}) "
            "MERGE (inv)-[:DESCRIBED_IN]->(p) "
            "RETURN p.ref AS ref"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Invariant name."},
            "patent_ref": {"type": "int", "required": True,
                           "description": "Patent reference numeral the invariant is described by."},
        },
        description="Trace an Invariant to the patent element that describes it (DESCRIBED_IN).",
        intent="Ground an invariant in a patent reference numeral.",
        allow_roles=(JOURNEYMAN,),
    ),
]


# Read surface (Task 2) — the forward-map query tools. Open (priced, unrestricted): any
# funded agent may resolve intent. access_mode='read' — MATCH/RETURN only, never a mutation.
READ_VOCABULARY: list[Template] = [
    Template(
        key="which_service_handles",
        cypher=(
            "MATCH (c:Capability)-[:OWNED_BY]->(s:Service) "
            "WHERE toLower(c.name) CONTAINS toLower($keyword) "
            "   OR toLower(c.keywords) CONTAINS toLower($keyword) "
            "RETURN DISTINCT s.repo_name AS service, c.name AS capability "
            "ORDER BY service"
        ),
        param_schema={
            "keyword": {"type": "string", "required": True,
                        "description": "Intent keyword, e.g. 'npub proof', 'vault', 'pricing'."},
        },
        description="Resolve which Service(s) handle an intent keyword — before opening a file.",
        intent="Find which service handles a given intent.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # The Porter's Tier-1 semantic-triage tool: pull the whole compact catalog in one
        # call and let the LLM match the issue's intent against it in-context (RAG-lite, no
        # embeddings). Small graph, so returning everything is cheap and high-recall.
        key="list_capabilities",
        cypher=(
            "MATCH (c:Capability) "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "RETURN c.name AS name, collect(DISTINCT o.repo_name) AS owners, "
            "       c.keywords AS keywords "
            "ORDER BY name"
        ),
        param_schema={},
        description="The compact capability catalog (name, owners, keywords) for semantic triage "
                    "— retrieve all, match the issue's intent in-context, then explain_capability.",
        intent="List every capability for semantic intent-matching.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="what_realizes_capability",
        cypher=(
            "MATCH (c:Capability {name: $name})-[:REALIZED_BY]->(sym:Symbol) "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "RETURN sym.fqn AS symbol, o.repo_name AS owner "
            "ORDER BY symbol"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
        },
        description="List the code Symbols (and owning Services) that realize a Capability.",
        intent="Find the symbols that implement a capability.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="explain_capability",
        cypher=(
            "MATCH (c:Capability {name: $name}) "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "OPTIONAL MATCH (c)-[:CONSUMED_BY]->(u:Service) "
            "RETURN c.name AS name, c.why AS why, c.provenance AS provenance, "
            "       c.inferred_why AS inferred_why, "
            "       collect(DISTINCT o.repo_name) AS owners, "
            "       collect(DISTINCT u.repo_name) AS consumers"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
        },
        description="Explain a Capability: its authoritative why (human-authored) and the "
                    "Journeyman's inferred_why advice, with provenance, owners and consumers.",
        intent="Explain why a capability exists and where it lives.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="symbols_in_service",
        cypher=(
            "MATCH (sym:Symbol)-[:IN_SERVICE]->(s:Service {repo_name: $repo_name}) "
            "RETURN sym.fqn AS symbol, sym.lang AS lang "
            "ORDER BY symbol"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
        },
        description="List the indexed code Symbols belonging to a Service.",
        intent="List a service's indexed symbols.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="explain_patent_element",
        cypher=(
            "MATCH (p:PatentElement {ref: $ref}) "
            "OPTIONAL MATCH (c:Capability)-[:DESCRIBED_IN]->(p) "
            "OPTIONAL MATCH (inv:Invariant)-[:DESCRIBED_IN]->(p) "
            "RETURN p.ref AS ref, p.name AS name, p.figures AS figures, "
            "       p.claim_family AS claim_family, "
            "       collect(DISTINCT c.name) AS capabilities, "
            "       collect(DISTINCT inv.name) AS invariants"
        ),
        param_schema={
            "ref": {"type": "int", "required": True, "description": "Patent reference numeral, e.g. 400."},
        },
        description="Explain a patent element: its name, figures, and the capabilities/invariants it grounds.",
        intent="Show what a patent reference numeral describes.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="capability_patents",
        cypher=(
            "MATCH (c:Capability {name: $name})-[:DESCRIBED_IN]->(p:PatentElement) "
            "RETURN p.ref AS ref, p.name AS name, p.figures AS figures "
            "ORDER BY ref"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
        },
        description="List the patent elements a Capability is grounded in (its DESCRIBED_IN trace).",
        intent="Show a capability's patent grounding.",
        allow_roles=(),
        access_mode="read",
    ),
]
