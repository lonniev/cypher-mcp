/**
 * DPYC Agentic Software Factory — model facts for the public landing pages.
 *
 * Sourced from lonniev/dpyc-community docs/model (factory-model.html,
 * diagrams.md, dpyc-factory.sysml) and restated here as structured data the
 * FE can render without a runtime fetch of the community docs site. The
 * numbers and role roster are doctrine; live counts come from
 * `public_factory_stats`. Keep this file the single place a future
 * generation step would write into.
 *
 * The words are in src/i18n; each list is built at render, in the reader's
 * language. Role names, tool names and places (GitHub, OpenRouter) stay as
 * they are.
 */

import type { Translate } from "../i18n";

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

/** The crew's names and sides; each blurb is `model.crew.<id>`. */
const CREW_ROLES = [
  ["scout", "Scout", "judgement"],
  ["porter", "Porter", "judgement"],
  ["journeyman", "Journeyman", "judgement"],
  ["qa", "QA", "judgement"],
  ["prDialogue", "PR Dialogue", "judgement"],
  ["prRevision", "PR Revision", "judgement"],
  ["housekeeper", "Housekeeper", "judgement"],
  ["digest", "Digest", "judgement"],
  ["escalation", "Escalation", "policy"],
  ["autoMerge", "Auto-merge", "policy"],
  ["mergeOnApproval", "Merge on Approval", "policy"],
  ["doctrineLint", "Doctrine Lint", "policy"],
  ["deployVerify", "Deploy Verify", "policy"],
  ["fundingSentinel", "Funding Sentinel", "policy"],
  ["creditCanary", "Credit Canary", "policy"],
  ["blockRetire", "Block Retire", "policy"],
  ["conflictWatch", "Conflict Watch", "policy"],
] as const;

/** 14 roles — judgement gets an agent; policy gets bash. */
export const crew = (t: Translate): Role[] =>
  CREW_ROLES.map(([id, name, side]) => ({ name, side, blurb: t(`model.crew.${id}`) }));

// The issue cites 14 roles; the roster above enumerates the named ones.
// Keep MODEL.roles as the authoritative count from the SysML model.

export const threeRules = (t: Translate) =>
  (["behavior", "skeleton", "containment"] as const).map((id) => ({
    title: t(`model.rules.${id}.title`),
    body: t(`model.rules.${id}.body`),
  }));

export const planes = (t: Translate) =>
  ([
    ["control", "GitHub"],
    ["execution", "Actions runners"],
    ["inference", "OpenRouter"],
    ["memory", null],
  ] as const).map(([id, home]) => ({
    name: t(`model.planes.${id}.name`),
    home: home ?? t("model.planes.memory.home"),
    body: t(`model.planes.${id}.body`),
  }));

/** How code was found; the keys are the values the graph stores. */
export const resolvedVia = (t: Translate) =>
  ([
    ["graph", "graph"],
    ["scoped-grep", "scopedGrep"],
    ["wide-grep", "wideGrep"],
  ] as const).map(([key, id]) => ({ key, title: key, gloss: t(`model.via.${id}`) }));

/** The keys of {@link resolvedVia}, for code that needs no words. */
export const RESOLVED_VIA_KEYS = ["graph", "scoped-grep", "wide-grep"] as const;

export const memoryStores = (t: Translate) =>
  ([
    ["capabilities", ["list_capabilities", "explain_capability", "context_pack", "which_service_handles"]],
    ["symbols", ["index_symbol", "anchor_symbol", "symbol_provenance", "symbols_in_service"]],
    ["invariants", ["list_invariants", "assert_invariant", "invariant_provenance", "guard_invariant_symbol"]],
    ["decisions", ["assert_rationale", "bind_rationale_to_symbol"]],
    ["issues", ["list_issues", "record_triage", "record_scope", "issue_provenance", "factory_resolution_stats"]],
    ["funding", ["mark_funding_state", "retire_funding_block"]],
  ] as const).map(([id, tools]) => ({
    name: t(`model.stores.${id}.name`),
    body: t(`model.stores.${id}.body`),
    tools,
  }));
