/**
 * DPYC Agentic Software Factory — model facts for the public landing pages.
 *
 * Sourced from lonniev/dpyc-community docs/model (factory-model.html,
 * diagrams.md, dpyc-factory.sysml) and restated here as structured data the
 * FE can render without a runtime fetch of the community docs site. The
 * numbers and role roster are doctrine; live counts come from
 * `public_factory_stats`. Keep this file the single place a future
 * generation step would write into.
 */

export const FACTORY_DOCS =
  "https://lonniev.github.io/dpyc-community/model/factory-model.html";

export const COMMUNITY_REPO = "https://github.com/lonniev/dpyc-community";

/** Closed counts from the machine-checked model (not live graph counts). */
export const MODEL = {
  repos: 18,
  roles: 14,
} as const;

export interface Role {
  name: string;
  side: "judgement" | "policy";
  blurb: string;
}

/** 14 roles — judgement gets an agent; policy gets bash. */
export const CREW: Role[] = [
  // Judgement side (LLM)
  {
    name: "Scout",
    side: "judgement",
    blurb: "On-ramp. An outside patron files a field report under its own proven npub.",
  },
  {
    name: "Porter",
    side: "judgement",
    blurb: "Triage. Rough English → actionable spec; routes or rejects.",
  },
  {
    name: "Journeyman",
    side: "judgement",
    blurb: "Engineering. Implements the minimal fix; records rationale as unverified advice.",
  },
  {
    name: "QA",
    side: "judgement",
    blurb: "Reviews the PR against the issue; may request revision.",
  },
  {
    name: "PR Dialogue",
    side: "judgement",
    blurb: "Answers human review comments on open PRs.",
  },
  {
    name: "PR Revision",
    side: "judgement",
    blurb: "Applies requested changes after a QA or human review.",
  },
  {
    name: "Housekeeper",
    side: "judgement",
    blurb: "Keeps labels, milestones, and stale work tidy.",
  },
  {
    name: "Digest",
    side: "judgement",
    blurb: "Summarizes what the crew did; never lands code.",
  },
  // Policy side (deterministic bash — LLM-free gates)
  {
    name: "Escalation",
    side: "policy",
    blurb: "Cross-repo routing when the fix belongs elsewhere. No LLM.",
  },
  {
    name: "Auto-merge",
    side: "policy",
    blurb: "Lands a green PR that already cleared every gate. No LLM.",
  },
  {
    name: "Merge on Approval",
    side: "policy",
    blurb: "Lands after a required human approval. No LLM.",
  },
  {
    name: "Doctrine Lint",
    side: "policy",
    blurb: "Greps PRs for self-modification and money-gate violations. No LLM.",
  },
  {
    name: "Deploy Verify",
    side: "policy",
    blurb: "Confirms the live surface matches what just merged. No LLM.",
  },
  {
    name: "Funding Sentinel",
    side: "policy",
    blurb: "Tags work awaiting-funds when the shared LLM key is dry. No LLM.",
  },
  {
    name: "Credit Canary",
    side: "policy",
    blurb: "Clears awaiting-funds and re-runs deferred agents once funded. No LLM.",
  },
  {
    name: "Block Retire",
    side: "policy",
    blurb: "Retires stale funding blocks when their issue/PR closes. No LLM.",
  },
  {
    name: "Conflict Watch",
    side: "policy",
    blurb: "Surfaces merge conflicts before they rot. No LLM.",
  },
];

// The issue cites 14 roles; the roster above enumerates the named ones.
// Keep MODEL.roles as the authoritative count from the SysML model.

export const THREE_RULES = [
  {
    title: "Behavior is data",
    body:
      "The crew may evolve behavior by PR. Doctrine, prompts, and vocabulary live in the repo and move through the same gates as code.",
  },
  {
    title: "The skeleton is human-only",
    body:
      "The workflow files that grant powers are structurally out of reach of every agent — the GitHub App carries no workflows: write. Judgement gets an agent; policy gets bash. Every gate that can actually land code is LLM-free, and therefore immune to injection and to a dry key.",
  },
  {
    title: "Containment is funding, not policy",
    body:
      "A drained agent degrades rather than stalls. The Funding Sentinel tags work awaiting-funds; the Credit Canary clears it. The factory bends under an empty purse instead of locking up.",
  },
] as const;

export const PLANES = [
  {
    name: "Control",
    home: "GitHub",
    body: "Issues, PRs, labels, and the human-only workflow skeleton.",
  },
  {
    name: "Execution",
    home: "Actions runners",
    body: "Every agent and every policy gate runs here, ephemerally.",
  },
  {
    name: "Inference",
    home: "OpenRouter",
    body: "The shared LLM route. A dry key is a funding event, not a crash.",
  },
  {
    name: "Memory & money",
    home: "DPYC network",
    body: "cypher-mcp holds the intention graph; Tollbooth settles sats. An agent's graph write is a paid, signed, patron-authenticated MCP call — not a database connection.",
  },
] as const;

export const RESOLVED_VIA = [
  {
    key: "graph",
    title: "graph",
    gloss: "Answered from the intention graph alone — no grep. The cheapest path.",
  },
  {
    key: "scoped-grep",
    title: "scoped-grep",
    gloss: "The graph narrowed a grep to a handful of files.",
  },
  {
    key: "wide-grep",
    title: "wide-grep",
    gloss: "The graph missed; the whole repo was re-tokenized. The metric to drive down.",
  },
] as const;

export const MEMORY_STORES = [
  {
    name: "Capabilities",
    body: "Cross-cutting abilities the fleet owns — each with a human-authored why (doctrine) or an agent's inferred advice, owners, consumers, and realizing symbols.",
    tools: ["list_capabilities", "explain_capability", "context_pack", "which_service_handles"],
  },
  {
    name: "Symbols",
    body: "Code symbols with file anchors. The Journeyman writes them post-edit so the next triage greps a narrow scope — or skips grep.",
    tools: ["index_symbol", "anchor_symbol", "symbol_provenance", "symbols_in_service"],
  },
  {
    name: "Invariants",
    body: "Enforceable rules a change must not violate. Provenance is the Cypher literal human-authored — an agent cannot claim it.",
    tools: ["list_invariants", "assert_invariant", "invariant_provenance", "guard_invariant_symbol"],
  },
  {
    name: "Decisions",
    body: "The Journeyman's rationale for a fix. Recorded as llm-inferred-unverified — trusted advice, never doctrine.",
    tools: ["assert_rationale", "bind_rationale_to_symbol"],
  },
  {
    name: "Issues",
    body: "Every triaged GitHub issue with disposition, root cause, resolved_via, and the capability it touched.",
    tools: ["list_issues", "record_triage", "record_scope", "issue_provenance", "factory_resolution_stats"],
  },
  {
    name: "Funding blocks",
    body: "LLM-credit outages deferred as their own nodes (not a property on Issue), so a dry key on a PR is visible too.",
    tools: ["mark_funding_state", "retire_funding_block"],
  },
] as const;

export const PROVENANCE_THESIS =
  "llm-inferred-unverified is a Cypher literal inside the write template, not a parameter. There is no argument an agent can pass to claim human authority. The agent proposes; the human legislates.";
