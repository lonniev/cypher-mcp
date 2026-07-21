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
    (:Issue   {repo_name, number, title, classification, disposition, url, repo_url, pr_url,
               actionable_text, resolved_via})        actionable_text = Porter's rough→spec translation;
                                                       resolved_via = graph | scoped-grep | wide-grep (the metric)
    (:Rejection {reason, at})                          history-preserving; linked to its Issue
    (:Decision {id, statement, reason, provenance, at}) provenance is a LITERAL here
    (:Symbol  {fqn, lang, file_path, verified_at_sha, anchor_provenance})
                                                       fqn = fully-qualified name; file_path + verified_at_sha
                                                       are the grep-scoping ANCHOR the Journeyman writes
                                                       post-edit (anchor_provenance='journeyman-verified')
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
    (:Issue)-[:ABOUT_CAPABILITY]->(:Capability)        precedent: a future fuzzy issue on the same
                                                       theme matches this issue's actionable_text

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
        # url/repo_url are the ACTUAL GitHub URLs, passed by the caller — never derived from a
        # hardcoded owner. The agent fetches them at runtime (gh issue view --json url,
        # gh repo view --json url) so a graph reader can click straight through to the artifacts.
        cypher=(
            "MERGE (s:Service {repo_name: $repo_name}) "
            "MERGE (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "SET i.title = $title, i.classification = $classification, "
            "    i.disposition = $disposition, i.url = $issue_url, i.repo_url = $repo_url, "
            "    i.triaged_at = timestamp() "
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
            "issue_url": {"type": "string", "required": True,
                          "description": "The issue's actual GitHub URL (gh issue view <n> --json url)."},
            "repo_url": {"type": "string", "required": True,
                         "description": "The repository's actual GitHub URL (gh repo view --json url)."},
        },
        description="Record a triaged Issue (with its GitHub issue + repo URLs) and link it to its Service.",
        intent="Record the Porter's triage of a GitHub issue.",
        allow_roles=(PORTER, JOURNEYMAN),
    ),
    Template(
        key="claim_issue",
        # Turn-START heartbeat: the FIRST thing an agent does when it picks up an issue,
        # BEFORE the (possibly long) work. It ensures the Issue node exists and marks it
        # as actively worked, so the graph — and the dashboard — reflect work IN PROGRESS
        # instead of appearing only after the saga ends. Idempotent; enriched later by
        # record_triage / record_scope / link_pr. `triaged_at` is coalesced so the issue
        # shows in the register immediately without clobbering a real triage timestamp.
        cypher=(
            "MERGE (s:Service {repo_name: $repo_name}) "
            "MERGE (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "SET i.title = coalesce($title, i.title), "
            "    i.url = coalesce($issue_url, i.url), "
            "    i.activity = $activity, "
            "    i.worked_by = $worked_by, "
            "    i.activity_since = timestamp(), "
            "    i.triaged_at = coalesce(i.triaged_at, timestamp()) "
            "MERGE (i)-[:FILED_AGAINST]->(s) "
            "RETURN i.number AS number, i.activity AS activity, i.worked_by AS worked_by"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "activity": {"type": "string", "required": True,
                         "description": "What the agent is doing this turn: 'triaging' | 'fixing' | 'reviewing'."},
            "worked_by": {"type": "string", "required": True,
                          "description": "The agent role picking it up: 'porter' | 'journeyman' | 'qa'."},
            "title": {"type": "string", "required": False,
                      "description": "Issue title (sets it if the node is new; omit to leave as-is)."},
            "issue_url": {"type": "string", "required": False,
                          "description": "The issue's GitHub URL (gh issue view <n> --json url), for click-through."},
        },
        description="Turn-start claim: ensure the Issue node exists and mark it actively worked "
                    "(activity + worked_by + activity_since), so the graph shows work in progress.",
        intent="Mark an issue as actively being worked at the start of an agent's turn.",
        allow_roles=(PORTER, JOURNEYMAN),
        access_mode="write",
    ),
    Template(
        key="record_scope",
        # The Porter's rough-English -> actionable spec, plus HOW it resolved the code
        # (graph = context_pack alone; scoped-grep = graph narrowed a grep; wide-grep = the
        # graph missed and a whole-repo grep was needed). resolved_via is the token-savings
        # metric: as the graph learns, wide-grep should trend to zero.
        cypher=(
            "MERGE (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "SET i.actionable_text = $actionable_text, i.resolved_via = $resolved_via, "
            "    i.scoped_at = timestamp() "
            "RETURN i.number AS issue"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "actionable_text": {"type": "string", "required": True,
                                "description": "The Porter's rough-English -> actionable spec translation."},
            "resolved_via": {"type": "string", "required": True,
                             "description": "How the code was located: 'graph' | 'scoped-grep' | 'wide-grep'."},
        },
        description="Record the Porter's actionable spec for an Issue and HOW it located the code "
                    "(resolved_via — the grep-fallback metric).",
        intent="Record the actionable spec and the code-location method for an issue.",
        allow_roles=(PORTER, JOURNEYMAN),
    ),
    Template(
        key="link_issue_to_capability",
        cypher=(
            "MERGE (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "MERGE (c:Capability {name: $capability_name}) "
            "MERGE (i)-[:ABOUT_CAPABILITY]->(c) "
            "RETURN c.name AS capability"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "capability_name": {"type": "string", "required": True,
                                "description": "Capability the issue is about (from context_pack)."},
        },
        description="Link an Issue to the Capability it concerns (ABOUT_CAPABILITY), so a future "
                    "fuzzy issue on the same theme matches this one's actionable_text as precedent.",
        intent="Attach an issue to the capability it is about.",
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
        # Anti-ping-pong: when a TARGET repo declines an escalation, record the reason on the
        # ORIGIN issue (with the declining repo) so the origin's Porter re-triages knowing the
        # passed-repos set — instead of the two repos battling. History-preserving.
        key="route_rejection",
        cypher=(
            "MERGE (o:Issue {repo_name: $origin_repo, number: $origin_issue}) "
            "CREATE (r:Rejection {reason: $reason, from_repo: $by_repo, at: timestamp()}) "
            "MERGE (o)-[:HAS_REJECTION]->(r) "
            "RETURN r.reason AS reason, r.from_repo AS from_repo"
        ),
        param_schema={
            "origin_repo": {"type": "string", "required": True,
                            "description": "The ORIGIN repository the escalation routes back to."},
            "origin_issue": {"type": "int", "required": True, "description": "The origin issue number."},
            "by_repo": {"type": "string", "required": True,
                        "description": "The repo that declined the escalation."},
            "reason": {"type": "string", "required": True,
                       "description": "Why the target declined (which DRY boundary / repo actually owns it)."},
        },
        description="Record on the ORIGIN issue that a target repo declined its escalation, with the "
                    "reason — the passed-repos memory that stops issue ping-pong.",
        intent="Route a target's rejection reason back to the origin issue.",
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
        key="link_pr",
        # pr_url is the ACTUAL URL that `gh pr create` printed — never derived from an owner.
        cypher=(
            "MATCH (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "SET i.pr_url = $pr_url "
            "RETURN i.pr_url AS pr_url"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
            "pr_url": {"type": "string", "required": True,
                       "description": "The actual GitHub URL of the PR that fixes this issue (from gh pr create)."},
        },
        description="Record the URL of the PR that carried the fix for an Issue (click-through provenance).",
        intent="Attach the fix PR's GitHub URL to its issue.",
        allow_roles=(JOURNEYMAN,),
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
        # The grep-scoping ANCHOR. Journeyman-only, written POST-EDIT: the agent that just
        # changed the file records where the symbol lives and the sha it verified against, so
        # the next issue on this theme greps a tiny scope (or skips grep). anchor_provenance is
        # the hard-coded literal 'journeyman-verified' — no param — because the authority comes
        # from having actually edited the code, not from a trusted argument. Line numbers are
        # deliberately NOT stored: the Porter re-greps within file_path to re-pin exact location,
        # so a coarse file+symbol anchor never goes stale in a way that misleads.
        key="anchor_symbol",
        cypher=(
            "MERGE (sym:Symbol {fqn: $symbol_fqn}) "
            "SET sym.file_path = $file_path, sym.verified_at_sha = $verified_at_sha, "
            "    sym.anchor_provenance = 'journeyman-verified', sym.anchored_at = timestamp() "
            "RETURN sym.fqn AS symbol"
        ),
        param_schema={
            "symbol_fqn": {"type": "string", "required": True,
                           "description": "Fully-qualified name of the symbol just edited."},
            "file_path": {"type": "string", "required": True,
                          "description": "Repo-relative path of the file the symbol lives in (the grep scope)."},
            "verified_at_sha": {"type": "string", "required": True,
                                "description": "Commit/PR sha the anchor was verified against (from git)."},
        },
        description="Anchor a Symbol to its file_path + verified_at_sha (provenance "
                    "'journeyman-verified'). Written post-edit so future triage greps a narrow scope.",
        intent="Record where a symbol lives so future triage scopes its grep.",
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
        key="issue_provenance",
        # The click-through surface: an issue's stored GitHub URLs (issue / repo / PR) plus its
        # triage + rationale chain, so a graph reader can open the original artifacts in a browser.
        cypher=(
            "MATCH (i:Issue {repo_name: $repo_name, number: $issue_number}) "
            "OPTIONAL MATCH (i)-[:ROOT_CAUSE]->(sym:Symbol) "
            "OPTIONAL MATCH (i)-[:HAS_RATIONALE]->(d:Decision) "
            "OPTIONAL MATCH (i)-[:HAS_REJECTION]->(r:Rejection) "
            "OPTIONAL MATCH (i)-[:ABOUT_CAPABILITY]->(cap:Capability) "
            "RETURN i.repo_name AS repo_name, i.number AS number, "
            "       i.url AS issue_url, i.repo_url AS repo_url, i.pr_url AS pr_url, "
            "       i.title AS title, i.classification AS classification, i.disposition AS disposition, "
            "       i.actionable_text AS actionable_text, coalesce(i.resolved_via, '') AS resolved_via, "
            "       coalesce(i.activity, '') AS activity, coalesce(i.worked_by, '') AS worked_by, "
            "       i.activity_since AS activity_since, "
            "       collect(DISTINCT cap.name) AS capabilities, "
            "       [x IN collect(DISTINCT sym) WHERE x IS NOT NULL | "
            "           {fqn: x.fqn, file: x.file_path, lang: x.lang, verified_at_sha: x.verified_at_sha}] AS root_cause_symbols, "
            "       [x IN collect(DISTINCT d) WHERE x IS NOT NULL | "
            "           {statement: x.statement, reason: x.reason, provenance: x.provenance}] AS decisions, "
            "       collect(DISTINCT r.reason) AS rejections"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
        },
        description="An issue's click-through provenance: its GitHub issue/repo/PR URLs, the "
                    "capability it concerns and how its code was located (resolved_via), plus its "
                    "triage, rationale (Decisions), rejections, and root-cause symbols.",
        intent="Fetch an issue's GitHub URLs and provenance chain for browser click-through.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # Peer of list_capabilities: the compact issue catalog that backs the Issues register.
        # Small graph, so returning every issue is cheap; the FE filters/sorts client-side (and a
        # future paged variant can add search/limit/offset params).
        key="list_issues",
        cypher=(
            "MATCH (i:Issue) "
            "WHERE $since_ms <= 0 OR coalesce(i.scoped_at, i.triaged_at) >= $since_ms "
            "OPTIONAL MATCH (i)-[:ABOUT_CAPABILITY]->(c:Capability) "
            "RETURN i.repo_name AS repo_name, i.number AS number, i.title AS title, "
            "       i.classification AS classification, i.disposition AS disposition, "
            "       coalesce(i.resolved_via, '') AS resolved_via, "
            "       coalesce(i.actionable_text, '') AS actionable_text, "
            "       i.url AS url, coalesce(i.pr_url, '') AS pr_url, "
            "       coalesce(i.scoped_at, i.triaged_at) AS updated_at, "
            "       i.triaged_at AS triaged_at, "
            "       coalesce(i.activity, '') AS activity, "
            "       coalesce(i.worked_by, '') AS worked_by, "
            "       i.activity_since AS activity_since, "
            "       collect(DISTINCT c.name) AS capabilities "
            "ORDER BY coalesce(i.scoped_at, i.triaged_at) DESC, i.number DESC"
        ),
        param_schema={
            "since_ms": {"type": "int", "required": False,
                         "description": "Epoch-ms lower bound on triage/scope time; 0 (default) = any time."},
        },
        description="The compact issue catalog (repo, number, title, classification, disposition, "
                    "resolved_via, capabilities) — the Issues index, peer to list_capabilities.",
        intent="List every triaged issue for the Issues register.",
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
            "WHERE $since_ms <= 0 "
            "   OR coalesce(c.updated_at, c.authored_at, c.inferred_at) >= $since_ms "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "RETURN c.name AS name, collect(DISTINCT o.repo_name) AS owners, "
            "       c.keywords AS keywords, "
            "       coalesce(c.updated_at, c.authored_at, c.inferred_at) AS updated_at "
            "ORDER BY name"
        ),
        param_schema={
            "since_ms": {"type": "int", "required": False,
                         "description": "Epoch-ms lower bound on change time; 0 (default) = any time."},
        },
        description="The compact capability catalog (name, owners, keywords) for semantic triage "
                    "— retrieve all, match the issue's intent in-context, then explain_capability.",
        intent="List every capability for semantic intent-matching.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # The Porter's flagship Tier-1 answer: ONE call returns the whole grep-scoping bundle
        # for an intent keyword, so the agent greps only inside the returned files (or skips
        # grep) instead of re-tokenizing the repo. Per matched capability: owner repos, the
        # realizing symbols WITH file_path anchors, the invariants guarding them, and precedent
        # issues' actionable_text (the shared spec from a prior fuzzy issue on this theme) + why.
        # Doctrine: grep only within `symbols[].file`; widen to a repo grep ONLY if symbols is
        # empty, and then record_scope(resolved_via='wide-grep') so the miss is measured.
        key="context_pack",
        cypher=(
            "MATCH (c:Capability) "
            "WHERE toLower(c.name) CONTAINS toLower($keyword) "
            "   OR toLower(c.keywords) CONTAINS toLower($keyword) "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "OPTIONAL MATCH (c)-[:REALIZED_BY]->(sym:Symbol) "
            "OPTIONAL MATCH (inv:Invariant)-[:GUARDS]->(sym) "
            "OPTIONAL MATCH (i:Issue)-[:ABOUT_CAPABILITY]->(c) "
            "RETURN c.name AS capability, c.keywords AS keywords, "
            "       c.why AS why, c.provenance AS provenance, c.inferred_why AS inferred_why, "
            "       collect(DISTINCT o.repo_name) AS owners, "
            "       [x IN collect(DISTINCT sym) WHERE x IS NOT NULL | "
            "           {fqn: x.fqn, file: x.file_path, lang: x.lang, verified_at_sha: x.verified_at_sha}] AS symbols, "
            "       collect(DISTINCT inv.name) AS invariants, "
            "       [x IN collect(DISTINCT i) WHERE x IS NOT NULL | "
            "           {number: x.number, url: x.url, actionable_text: x.actionable_text}] AS precedents "
            "ORDER BY capability"
        ),
        param_schema={
            "keyword": {"type": "string", "required": True,
                        "description": "Intent keyword from the issue, e.g. 'npub proof', 'books health'."},
        },
        description="ONE-call grep-scoping bundle for an intent keyword: matched capabilities with "
                    "owner repos, realizing symbols (fqn + file_path anchor), guarding invariants, and "
                    "precedent issues' actionable_text + why. Grep only inside the returned files.",
        intent="Return the code-orienteering scope for an intent keyword.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        key="what_realizes_capability",
        cypher=(
            "MATCH (c:Capability {name: $name})-[:REALIZED_BY]->(sym:Symbol) "
            "OPTIONAL MATCH (c)-[:OWNED_BY]->(o:Service) "
            "RETURN sym.fqn AS symbol, sym.file_path AS file, sym.verified_at_sha AS verified_at_sha, "
            "       o.repo_name AS owner "
            "ORDER BY symbol"
        ),
        param_schema={
            "name": {"type": "string", "required": True, "description": "Capability name."},
        },
        description="List the code Symbols (fqn + file_path anchor + owning Service) that realize a "
                    "Capability — the grep scope for a fix.",
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
            "RETURN sym.fqn AS symbol, sym.lang AS lang, sym.file_path AS file "
            "ORDER BY symbol"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
        },
        description="List the indexed code Symbols (fqn + file_path anchor) belonging to a Service.",
        intent="List a service's indexed symbols.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # Pivot to a code symbol: everything the graph knows about it, so the FE can
        # render a Symbol dossier that mirrors the Capability/Issue ones (bi-directional).
        key="symbol_provenance",
        cypher=(
            "MATCH (sym:Symbol {fqn: $fqn}) "
            "OPTIONAL MATCH (sym)-[:IN_SERVICE]->(svc:Service) "
            "OPTIONAL MATCH (cap:Capability)-[:REALIZED_BY]->(sym) "
            "OPTIONAL MATCH (i:Issue)-[:ROOT_CAUSE]->(sym) "
            "OPTIONAL MATCH (d:Decision)-[:ABOUT]->(sym) "
            "OPTIONAL MATCH (inv:Invariant)-[:GUARDS]->(sym) "
            "RETURN sym.fqn AS fqn, sym.file_path AS file, sym.lang AS lang, "
            "       sym.verified_at_sha AS verified_at_sha, "
            "       collect(DISTINCT svc.repo_name) AS services, "
            "       collect(DISTINCT cap.name) AS capabilities, "
            "       [x IN collect(DISTINCT i) WHERE x IS NOT NULL | "
            "           {number: x.number, repo_name: x.repo_name, title: x.title, url: x.url}] AS issues, "
            "       [x IN collect(DISTINCT d) WHERE x IS NOT NULL | "
            "           {statement: x.statement, reason: x.reason, provenance: x.provenance}] AS decisions, "
            "       collect(DISTINCT inv.name) AS invariants"
        ),
        param_schema={
            "fqn": {"type": "string", "required": True, "description": "The symbol's fully-qualified name."},
        },
        description="A code symbol's provenance: the service it belongs to, the capabilities it "
                    "realizes, the issues it root-caused, decisions attached to it, and guarding invariants.",
        intent="Pivot to a code symbol — its service, capabilities, issues, decisions, invariants.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # Pivot to a service: the capabilities it owns/consumes, its indexed symbols, and the
        # issues filed against it — so the FE renders a Service dossier like the others.
        key="service_provenance",
        cypher=(
            "MATCH (svc:Service {repo_name: $repo_name}) "
            "OPTIONAL MATCH (own:Capability)-[:OWNED_BY]->(svc) "
            "OPTIONAL MATCH (con:Capability)-[:CONSUMED_BY]->(svc) "
            "OPTIONAL MATCH (sym:Symbol)-[:IN_SERVICE]->(svc) "
            "OPTIONAL MATCH (i:Issue)-[:FILED_AGAINST]->(svc) "
            "RETURN svc.repo_name AS repo_name, "
            "       collect(DISTINCT own.name) AS owns, "
            "       collect(DISTINCT con.name) AS consumes, "
            "       [x IN collect(DISTINCT sym) WHERE x IS NOT NULL | "
            "           {fqn: x.fqn, file: x.file_path, lang: x.lang}] AS symbols, "
            "       [x IN collect(DISTINCT i) WHERE x IS NOT NULL | "
            "           {number: x.number, repo_name: x.repo_name, title: x.title, disposition: x.disposition}] AS issues"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
        },
        description="A service's provenance: the capabilities it owns and consumes, its indexed "
                    "symbols, and the issues filed against it.",
        intent="Pivot to a service — its capabilities, symbols, and issues.",
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
    Template(
        # The token-savings metric. As the graph accretes anchors, 'wide-grep' (whole-repo
        # re-tokenization) should trend to zero and 'graph'/'scoped-grep' should dominate.
        key="factory_resolution_stats",
        cypher=(
            "MATCH (i:Issue) WHERE i.resolved_via IS NOT NULL "
            "RETURN i.resolved_via AS resolved_via, count(*) AS n "
            "ORDER BY n DESC"
        ),
        param_schema={},
        description="Grep-fallback metric: how issues were located (graph | scoped-grep | wide-grep). "
                    "Watch wide-grep trend to zero as the intention graph learns.",
        intent="Report how issues were located, to measure grep-scope shrinkage.",
        allow_roles=(),
        access_mode="read",
    ),
    Template(
        # The anti-ping-pong guard's memory: every repo that has declined this issue's escalation,
        # and why. The Porter reads passed_repos before re-routing so it never re-targets a repo
        # that already passed; the FE surfaces the routing trail on the Issue dossier.
        key="routing_history",
        cypher=(
            "MATCH (o:Issue {repo_name: $repo_name, number: $issue_number}) "
            "OPTIONAL MATCH (o)-[:HAS_REJECTION]->(r:Rejection) "
            "RETURN o.repo_name AS repo_name, o.number AS number, "
            "       [x IN collect(DISTINCT r) WHERE x IS NOT NULL | "
            "           {reason: x.reason, from_repo: coalesce(x.from_repo, ''), at: x.at}] AS rejections, "
            "       [x IN collect(DISTINCT r.from_repo) WHERE x IS NOT NULL AND x <> ''] AS passed_repos"
        ),
        param_schema={
            "repo_name": {"type": "string", "required": True, "description": "Repository name."},
            "issue_number": {"type": "int", "required": True, "description": "GitHub issue number."},
        },
        description="The routing trail for an issue: every repo that declined an escalation and why "
                    "(the passed-repos set) — the anti-ping-pong guard's memory.",
        intent="Show which repos have declined an issue and why.",
        allow_roles=(),
        access_mode="read",
    ),
]
