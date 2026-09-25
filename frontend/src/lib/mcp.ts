/**
 * Cypher's own tools — the intention-graph lab notebook.
 *
 * The connection, the npub-proof envelope, `ProofRequiredError` /
 * `onProofExpired`, identity storage and the standard wheel tools (session and
 * service status, the pricing model, balance, coupons) all come from
 * @tollbooth-dpyc/web (configured in main.tsx). What lives here is only what
 * is cypher's:
 *
 *   - the FREE public landing stats;
 *   - a METERED intention-graph tier (capabilities, symbols, invariants,
 *     patent tracing, issue provenance, factory resolution stats) — each a
 *     published dynamic tool that debits sats per call and is refunded on
 *     error. The dashboard caches these hard (see lib/graphCache.ts).
 */

import { callTool } from "@tollbooth-dpyc/web";

/// cypher_public_factory_stats — free, unauthenticated aggregate counts for the
/// public landing pages. Never returns titles, paths, or npubs. Server-side
/// hard-cached; safe to call from a guest session.
export interface PublicFactoryStats {
  success?: boolean;
  available?: boolean;
  reason?: string | null;
  capability_count?: number;
  invariant_count?: number;
  issue_count?: number;
  service_count?: number;
  symbol_count?: number;
  resolution?: ResolutionStat[];
  last_activity_ms?: number | null;
  cached_at?: number | null;
  cache_ttl_s?: number;
  cache_hit?: boolean;
  error?: string;
}

export async function publicFactoryStats(): Promise<PublicFactoryStats> {
  return callTool<PublicFactoryStats>("public_factory_stats", {}, { bestEffort: true, timeoutMs: 20_000 });
}

// ─── INTENTION GRAPH — metered read tools (published dynamic, category=read) ─
// Each debits sats per call and is refunded on error. Cache-first; see
// lib/graphCache.ts. Shapes mirror scripts/factory_vocabulary.py READ_VOCABULARY.

/// A code symbol (node label Symbol): fully-qualified name → file, verified sha.
export interface GraphSymbol {
  symbol?: string; // fqn
  fqn?: string;
  file?: string;
  file_path?: string;
  lang?: string;
  verified_at_sha?: string;
  owner?: string;
}

/// A prior issue that touched the same capability (precedent for triage).
export interface GraphPrecedent {
  number?: number;
  url?: string;
  title?: string;
  actionable_text?: string;
}

/// A capability's human-authored "why" is doctrine; inferred_why is an agent's
/// unverified advice. The provenance literals distinguish them — surface both.
export interface CapabilitySummary {
  name: string;
  owners?: string[];
  keywords?: string[];
  updated_at?: number;
}

export interface CapabilityExplain {
  name?: string;
  why?: string;
  provenance?: string; // "human-authored" when set
  inferred_why?: string;
  inferred_provenance?: string; // "llm-inferred-unverified"
  owners?: string[];
  consumers?: string[];
  error?: string;
  error_code?: string;
}

/// The flagship bundle: everything an agent needs to scope a fix for a keyword.
export interface ContextPackEntry {
  capability?: string;
  keywords?: string[];
  why?: string;
  provenance?: string;
  inferred_why?: string;
  owners?: string[];
  symbols?: GraphSymbol[];
  invariants?: string[];
  precedents?: GraphPrecedent[];
}

export interface WhichServiceEntry {
  service?: string;
  capability?: string;
}

export interface PatentRef {
  ref?: number;
  name?: string;
  figures?: string;
}

export interface PatentElementDetail {
  ref?: number;
  name?: string;
  figures?: string;
  claim_family?: string;
  capabilities?: string[];
  invariants?: string[];
  error?: string;
  error_code?: string;
}

export interface IssueDecision {
  statement?: string;
  reason?: string;
  provenance?: string;
}

/// A fix PR attached to an issue via the (:PullRequest)-[:FIXES]->(:Issue) edge.
/// An issue can carry more than one, which is why this replaced the flat pr_url
/// string. `state` is the graph's mirrored state; the FE overlays live GitHub
/// status (open/merged/closed) on top via githubStatus.ts.
export interface PrRef {
  number?: number;
  url?: string;
  title?: string;
  state?: string; // 'open' | 'closed'
  draft?: boolean;
  merged_at?: string;
}

export interface IssueProvenance {
  issue_url?: string;
  repo_url?: string;
  prs?: PrRef[];
  repo_name?: string;
  number?: number;
  title?: string;
  classification?: string;
  disposition?: string;
  actionable_text?: string;
  resolved_via?: string;
  activity?: string;
  worked_by?: string;
  activity_since?: number;
  capabilities?: string[];
  root_cause_symbols?: GraphSymbol[];
  decisions?: IssueDecision[];
  rejections?: { reason?: string; at?: string }[];
  error?: string;
  error_code?: string;
}

/// The token-savings metric: how the Service Desk located code for each issue.
/// resolved_via ∈ graph | scoped-grep | wide-grep. Watch wide-grep trend to 0.
export interface ResolutionStat {
  resolved_via?: string;
  n?: number;
}

// A metered read tool can return either a bare array/object or a wrapped
// {success, data|rows|results} envelope depending on wheel version. The
// unwrapping helpers below normalize both.

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const k of ["rows", "results", "data", "items", "capabilities", "symbols", "stats"]) {
      if (Array.isArray(p[k])) return p[k] as T[];
    }
  }
  return [];
}

/// Unwrap the FIRST row from a named-query tool result. These tools answer with
/// a `{success, rows:[...]}` envelope even for single-object queries, so a wrapper
/// that expects one object must take rows[0]. An empty `rows` (e.g. a query that
/// matched nothing) yields `{}`, which callers read as "not found".
function firstRow<T>(payload: unknown): T {
  if (Array.isArray(payload)) return (payload[0] ?? {}) as T;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const k of ["rows", "results", "data", "items"]) {
      if (Array.isArray(p[k])) return ((p[k] as unknown[])[0] ?? {}) as T;
    }
    return payload as T; // already a bare row object
  }
  return {} as T;
}

/// Normalize a "list of text" graph field to string[]. The graph stores some of
/// these as a comma-separated STRING (e.g. keywords: "a, b, c"), some as arrays,
/// and some as arrays of objects (e.g. invariants as {name, rule}). Coerce them
/// all so the views can trust string[] and never call .join/.map on a string.
/// Exported so a render site can also coerce data hydrated from an older cache.
export function asStrList(v: unknown): string[] {
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === "string") return x.trim();
        if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          return String(o.rule ?? o.name ?? o.text ?? JSON.stringify(x));
        }
        return String(x);
      })
      .filter(Boolean);
  }
  return [];
}

/// list_capabilities — the full compact catalog for semantic triage. `sinceMs`
/// is a server-side window: only capabilities changed at/after that epoch-ms are
/// returned (0 = any time).
export async function listCapabilities(opts: { sinceMs?: number } = {}): Promise<CapabilitySummary[]> {
  const r = await callTool<unknown>("list_capabilities", { since_ms: opts.sinceMs ?? 0 });
  return asArray<CapabilitySummary>(r).map((c) => ({
    ...c,
    keywords: asStrList(c.keywords),
    owners: asStrList(c.owners),
  }));
}

/// explain_capability — the "why" + provenance + owners/consumers for one name.
export async function explainCapability(name: string): Promise<CapabilityExplain> {
  const r = firstRow<CapabilityExplain>(await callTool<unknown>("explain_capability", { name }));
  return { ...r, owners: asStrList(r.owners), consumers: asStrList(r.consumers) };
}

/// context_pack — the flagship bundle(s) per capability matching a keyword.
export async function contextPack(keyword: string): Promise<ContextPackEntry[]> {
  const r = await callTool<unknown>("context_pack", { keyword });
  // Sometimes a single bundle, sometimes a list of them.
  let entries: ContextPackEntry[];
  if (Array.isArray(r)) entries = r as ContextPackEntry[];
  else if (r && typeof r === "object" && "capability" in (r as object)) entries = [r as ContextPackEntry];
  else entries = asArray<ContextPackEntry>(r);
  return entries.map((e) => ({
    ...e,
    keywords: asStrList(e.keywords),
    owners: asStrList(e.owners),
    invariants: asStrList(e.invariants),
  }));
}

/// what_realizes_capability — the implementing symbols (grep scope for a fix).
export async function whatRealizesCapability(name: string): Promise<GraphSymbol[]> {
  const r = await callTool<unknown>("what_realizes_capability", { name });
  return asArray<GraphSymbol>(r);
}

/// symbols_in_service — the code concordance for one repo.
export async function symbolsInService(repoName: string): Promise<GraphSymbol[]> {
  const r = await callTool<unknown>("symbols_in_service", { repo_name: repoName });
  return asArray<GraphSymbol>(r);
}

/// A code symbol's full provenance — the pivot for the Symbol dossier.
export interface SymbolProvenance {
  fqn?: string;
  file?: string;
  lang?: string;
  verified_at_sha?: string;
  services?: string[];
  capabilities?: string[];
  issues?: { number?: number; repo_name?: string; title?: string; url?: string }[];
  decisions?: IssueDecision[];
  invariants?: string[];
  error?: string;
}

/// symbol_provenance — everything the graph knows about one code symbol. Run via
/// execute_query_by_key against the seeded template (works with no named-tool
/// publish/pricing step).
export async function symbolProvenance(fqn: string): Promise<SymbolProvenance> {
  const raw = await callTool<unknown>("execute_query_by_key", { key: "symbol_provenance", params: { fqn } });
  const r = firstRow<SymbolProvenance>(raw);
  return {
    ...r,
    services: asStrList(r.services),
    capabilities: asStrList(r.capabilities),
    invariants: asStrList(r.invariants),
  };
}

/// A service's full provenance — the pivot for the Service dossier.
export interface ServiceProvenance {
  repo_name?: string;
  owns?: string[];
  consumes?: string[];
  symbols?: GraphSymbol[];
  issues?: { number?: number; repo_name?: string; title?: string; disposition?: string }[];
  error?: string;
}

/// service_provenance — a service's capabilities, symbols, and issues. Run via
/// execute_query_by_key against the seeded template.
export async function serviceProvenance(repoName: string): Promise<ServiceProvenance> {
  const raw = await callTool<unknown>("execute_query_by_key", { key: "service_provenance", params: { repo_name: repoName } });
  const r = firstRow<ServiceProvenance>(raw);
  return { ...r, owns: asStrList(r.owns), consumes: asStrList(r.consumes) };
}

/// capability_patents — the patent numerals grounding a capability's "why".
export async function capabilityPatents(name: string): Promise<PatentRef[]> {
  const r = await callTool<unknown>("capability_patents", { name });
  return asArray<PatentRef>(r);
}

/// explain_patent_element — one numeral → its capabilities + invariants.
export async function explainPatentElement(ref: number): Promise<PatentElementDetail> {
  const r = firstRow<PatentElementDetail>(await callTool<unknown>("explain_patent_element", { ref }));
  return { ...r, capabilities: asStrList(r.capabilities), invariants: asStrList(r.invariants) };
}

// ── Invariants (enforceable business-logic rules) ──────────────────────────

/// A compact invariant for the Invariants register (peer of CapabilitySummary).
export interface InvariantSummary {
  name: string;
  rule?: string;
  provenance?: string;
  updated_at?: number;
  symbol_count?: number;
  patents?: number[];
}

/// invariant_provenance — one invariant's rule, guarded symbols, and patent trace.
export interface InvariantProvenance {
  name?: string;
  rule?: string;
  provenance?: string;
  updated_at?: number;
  symbols?: GraphSymbol[];
  patents?: { ref?: number; name?: string; figures?: string }[];
  error?: string;
}

/// list_invariants — the full compact invariant catalog.
export async function listInvariants(opts: { sinceMs?: number } = {}): Promise<InvariantSummary[]> {
  const r = await callTool<unknown>("list_invariants", { since_ms: opts.sinceMs ?? 0 });
  return asArray<InvariantSummary>(r);
}

/// invariant_provenance — one invariant's case file.
export async function invariantProvenance(name: string): Promise<InvariantProvenance> {
  return firstRow<InvariantProvenance>(await callTool<unknown>("invariant_provenance", { name }));
}

// ── Patent elements (filed reference numerals — "patentable topics") ────────

/// A compact patent element for the Patent Topics register.
export interface PatentElementSummary {
  ref: number;
  name?: string;
  figures?: string;
  claim_family?: string;
  updated_at?: number;
  capability_count?: number;
  invariant_count?: number;
}

/// list_patent_elements — the full compact patent-element catalog.
export async function listPatentElements(opts: { sinceMs?: number } = {}): Promise<PatentElementSummary[]> {
  const r = await callTool<unknown>("list_patent_elements", { since_ms: opts.sinceMs ?? 0 });
  return asArray<PatentElementSummary>(r);
}

/// which_service_handles — resolve an intent keyword → repo + capability.
export async function whichServiceHandles(keyword: string): Promise<WhichServiceEntry[]> {
  const r = await callTool<unknown>("which_service_handles", { keyword });
  return asArray<WhichServiceEntry>(r);
}

// Root-cause symbols come back as a list of bare fqn STRINGS; rejections as bare
// reason strings. Normalize both so the views can trust structured objects.
function normalizeSymbols(v: unknown): GraphSymbol[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? { fqn: x, symbol: x } : (x as GraphSymbol)));
}
function normalizeRejections(v: unknown): { reason?: string; at?: string }[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? { reason: x } : (x as { reason?: string; at?: string })));
}

/// issue_provenance — the click-through triage/scope/root-cause/rationale surface.
export async function issueProvenance(repoName: string, issueNumber: number): Promise<IssueProvenance> {
  const r = firstRow<IssueProvenance>(
    await callTool<unknown>("issue_provenance", { repo_name: repoName, issue_number: issueNumber }),
  );
  return {
    ...r,
    capabilities: asStrList(r.capabilities),
    root_cause_symbols: normalizeSymbols(r.root_cause_symbols),
    rejections: normalizeRejections(r.rejections),
    prs: Array.isArray(r.prs) ? r.prs : [],
  };
}

/// The anti-ping-pong routing trail for an issue — which repos declined it, why.
export interface RoutingHistory {
  repo_name?: string;
  number?: number;
  rejections?: { reason?: string; from_repo?: string; at?: number }[];
  passed_repos?: string[];
}

/// routing_history — the repos that declined this issue's escalation and their
/// reasons. Run via execute_query_by_key against the seeded template.
export async function routingHistory(repoName: string, issueNumber: number): Promise<RoutingHistory> {
  const raw = await callTool<unknown>("execute_query_by_key", {
    key: "routing_history",
    params: { repo_name: repoName, issue_number: issueNumber },
  });
  const r = firstRow<RoutingHistory>(raw);
  return {
    ...r,
    passed_repos: asStrList(r.passed_repos),
    rejections: Array.isArray(r.rejections) ? r.rejections : [],
  };
}

/// A compact issue for the Issues register (peer of CapabilitySummary).
export interface IssueSummary {
  repo_name?: string;
  number?: number;
  title?: string;
  actionable_text?: string;
  classification?: string;
  disposition?: string;
  resolved_via?: string;
  url?: string;
  prs?: PrRef[];
  updated_at?: number;
  triaged_at?: number;
  /// Live turn heartbeat: what an agent is doing RIGHT NOW on this issue.
  activity?: string; // 'triaging' | 'fixing' | 'reviewing'
  worked_by?: string; // 'porter' | 'journeyman' | 'qa'
  activity_since?: number; // epoch ms the current turn began
  capabilities?: string[];
}

/// list_issues — the full compact issue catalog (peer of list_capabilities),
/// published + priced as its own named tool.
export async function listIssues(opts: { sinceMs?: number } = {}): Promise<IssueSummary[]> {
  const r = await callTool<unknown>("list_issues", { since_ms: opts.sinceMs ?? 0 });
  return asArray<IssueSummary>(r).map((i) => ({
    ...i,
    capabilities: asStrList(i.capabilities),
    prs: Array.isArray(i.prs) ? i.prs : [],
  }));
}

/// A compact pull request for the Pull Requests register (peer of IssueSummary).
/// `capabilities` are the intentions this PR enforces, derived server-side via
/// FIXES->Issue->ABOUT_CAPABILITY. Live open/merged/closed state is overlaid from
/// GitHub client-side (githubStatus.ts); `state` here is the graph's mirror.
export interface PullRequestSummary {
  repo_name?: string;
  number?: number;
  title?: string;
  url?: string;
  state?: string; // 'open' | 'closed'
  draft?: boolean;
  author?: string;
  merged_at?: string;
  head_ref?: string;
  base_ref?: string;
  updated_at?: number;
  created_at?: number;
  fixes_issues?: number[];
  capabilities?: string[];
}

/// list_pull_requests — the full compact PR catalog (peer of list_issues), run via
/// execute_query_by_key against the seeded template.
export async function listPullRequests(opts: { sinceMs?: number } = {}): Promise<PullRequestSummary[]> {
  const raw = await callTool<unknown>("execute_query_by_key", {
    key: "list_pull_requests",
    params: { since_ms: opts.sinceMs ?? 0 },
  });
  return asArray<PullRequestSummary>(raw).map((p) => ({
    ...p,
    capabilities: asStrList(p.capabilities),
    fixes_issues: Array.isArray(p.fixes_issues) ? p.fixes_issues : [],
  }));
}

/// An issue this PR fixes, for the PR dossier.
export interface PrFixRef {
  number?: number;
  title?: string;
  url?: string;
  disposition?: string;
}

/// pr_provenance — a PR's case file: the issue(s) it fixes and the capabilities it
/// enforces (the intention it enacts, derived at read time — never a stored edge).
export interface PullRequestProvenance {
  repo_name?: string;
  number?: number;
  url?: string;
  title?: string;
  state?: string;
  draft?: boolean;
  author?: string;
  head_sha?: string;
  head_ref?: string;
  base_ref?: string;
  merged_at?: string;
  created_at?: number;
  updated_at?: number;
  fixes?: PrFixRef[];
  enforces_capabilities?: string[];
  error?: string;
  error_code?: string;
}

/// pr_provenance — the PR dossier bundle for one (repo, number).
export async function prProvenance(repoName: string, number: number): Promise<PullRequestProvenance> {
  const r = firstRow<PullRequestProvenance>(
    await callTool<unknown>("execute_query_by_key", {
      key: "pr_provenance",
      params: { repo_name: repoName, number },
    }),
  );
  return {
    ...r,
    fixes: Array.isArray(r.fixes) ? r.fixes : [],
    enforces_capabilities: asStrList(r.enforces_capabilities),
  };
}

/// factory_resolution_stats — the grep-fallback distribution (the headline metric).
export async function factoryResolutionStats(): Promise<ResolutionStat[]> {
  const r = await callTool<unknown>("factory_resolution_stats", {});
  return asArray<ResolutionStat>(r);
}

// ─── Recently Changed — the cross-type activity feed ───────────────────────
// One union over every first-class node type, normalized to a uniform row so
// the register renders a single time-descending stream and each row clicks
// through to that type's dossier. Runs via execute_query_by_key against the
// seeded `recent_activity` template — no named-tool publish/pricing step; it is
// metered under execute_query_by_key, exactly like symbol/service provenance.

export type ActivityKind =
  | "Capability" | "Issue" | "PullRequest" | "Symbol" | "Invariant" | "PatentElement" | "Service";

/// A normalized activity row: `key` is the type's dossier identifier (capability
/// name, issue number, symbol fqn, patent ref, service/invariant name); `repo`
/// scopes the ones that need it (Issue, Service). `updated_at` is epoch-ms.
export interface RecentActivity {
  kind: ActivityKind | string;
  label?: string;
  key?: string;
  repo?: string;
  /// Canonical GitHub URL, when the kind carries one (e.g. FundingBlock links
  /// straight to the cited issue/PR; Issue rows carry their pr/issue URL).
  url?: string;
  updated_at?: number;
}

/// recent_activity — every domain object changed within [sinceMs, untilMs).
/// `untilMs = 0` (default) means open (up to now); a nonzero upper bound makes
/// calendar windows like "yesterday" exact. `sinceMs = 0` means from the start.
export async function recentActivity(
  opts: { sinceMs?: number; untilMs?: number } = {},
): Promise<RecentActivity[]> {
  const raw = await callTool<unknown>("execute_query_by_key", {
    key: "recent_activity",
    params: { since_ms: opts.sinceMs ?? 0, until_ms: opts.untilMs ?? 0 },
  });
  return asArray<RecentActivity>(raw);
}

// ─── Audit envelope — six named questions, one shared shape ─────────────────
// Conceptual keys are audit.why_exists etc.; published tool keys use underscores
// (publish_tool requires ^[a-z][a-z0-9_]*$). Each returns the same envelope so
// the Audit page can render any question with one component. PROV terms travel
// as badge strings (wasAttributedTo / wasDerivedFrom / …), never as prose.

export type AuditQuestion =
  | "why_exists"
  | "who_authorized"
  | "what_derived_from"
  | "what_guards"
  | "what_contradicts"
  | "what_changed_since";

export const AUDIT_QUESTIONS: {
  id: AuditQuestion;
  key: string;
  label: string;
  blurb: string;
  needsSince?: boolean;
}[] = [
  {
    id: "why_exists",
    key: "audit_why_exists",
    label: "Why does it exist?",
    blurb: "Authorized and suggested whys, with honest gaps when doctrine is missing.",
  },
  {
    id: "who_authorized",
    key: "audit_who_authorized",
    label: "Who authorized it?",
    blurb: "Only authorized assertions — the human-authored Authority trail.",
  },
  {
    id: "what_derived_from",
    key: "audit_what_derived_from",
    label: "What was it derived from?",
    blurb: "Issues, decisions, and patent elements that sourced this capability.",
  },
  {
    id: "what_guards",
    key: "audit_what_guards",
    label: "What guards it?",
    blurb: "Invariants on the realizing symbols, with severity bands.",
  },
  {
    id: "what_contradicts",
    key: "audit_what_contradicts",
    label: "What contradicts it?",
    blurb: "Assertion and invariant CONTRADICTS pairs — both sides kept, never buried.",
  },
  {
    id: "what_changed_since",
    key: "audit_what_changed_since",
    label: "What changed since…?",
    blurb: "New assertions, SUPERSEDES chains, and invariant edits after a point in time.",
    needsSince: true,
  },
];

export interface AuditAgent {
  npub?: string;
  label?: string;
  role?: string;
}

export interface AuditDerivedFrom {
  id?: string;
  prov?: string;
  kind?: string;
  label?: string;
  url?: string;
}

export interface AuditAssertion {
  prov?: string; // PROV term badge, e.g. "wasAttributedTo"
  agent?: AuditAgent;
  statement?: string;
  confidence?: number;
  status?: string; // suggested | asserted | authorized | superseded
  severity?: string; // Violation | Warning | Info (invariants)
  generated_at?: number;
  valid_from?: number | null;
  valid_to?: number | null;
  derived_from?: AuditDerivedFrom[];
  name?: string;
  superseded?: boolean;
}

export interface AuditContradictionSide {
  id?: string;
  statement?: string;
  status?: string;
  role?: string;
}

export interface AuditContradiction {
  kind?: string;
  left?: AuditContradictionSide | string;
  right?: AuditContradictionSide | string;
  left_status?: string;
  right_status?: string;
}

export interface AuditSubject {
  id?: string;
  label?: string;
  kind?: string;
}

/// Shared envelope every audit_* query returns. `gaps` is the honest work queue —
/// silence is never a valid audit answer.
export interface AuditEnvelope {
  subject?: AuditSubject;
  question?: AuditQuestion | string;
  assertions?: AuditAssertion[];
  contradictions?: AuditContradiction[];
  gaps?: string[];
  owners?: string[];
  derived_from?: AuditDerivedFrom[];
  since_ms?: number;
  error?: string;
  error_code?: string;
}

function confidenceBand(c?: number, status?: string): "Authorized" | "Asserted" | "Suggested" {
  if (status === "authorized" || (c != null && c >= 0.95)) return "Authorized";
  if (status === "asserted" || (c != null && c >= 0.75)) return "Asserted";
  return "Suggested";
}

export { confidenceBand };

/// Run one of the six audit questions against a capability name. Prefer the
/// published named tool; fall back to execute_query_by_key so the page works
/// even before the operator has priced the audit_* tools.
export async function auditQuery(
  question: AuditQuestion,
  name: string,
  opts: { asAtMs?: number; sinceMs?: number } = {},
): Promise<AuditEnvelope> {
  const meta = AUDIT_QUESTIONS.find((q) => q.id === question);
  if (!meta) return { error: `Unknown audit question: ${question}` };

  const params: Record<string, unknown> = { name };
  if (meta.needsSince) {
    params.since_ms = opts.sinceMs ?? 0;
  } else if (opts.asAtMs != null) {
    params.as_at_ms = opts.asAtMs;
  } else {
    // Optional as_at_ms defaults to 0 (= now) on the server for every
    // point-in-time audit question (all five non-since keys).
    params.as_at_ms = 0;
  }

  let raw: unknown;
  try {
    raw = await callTool<unknown>(meta.key, params);
  } catch {
    raw = await callTool<unknown>("execute_query_by_key", { key: meta.key, params });
  }
  const row = firstRow<AuditEnvelope>(raw);
  return {
    ...row,
    assertions: Array.isArray(row.assertions) ? row.assertions : [],
    contradictions: Array.isArray(row.contradictions) ? row.contradictions : [],
    gaps: asStrList(row.gaps),
    owners: asStrList(row.owners),
    derived_from: Array.isArray(row.derived_from) ? row.derived_from : [],
  };
}
