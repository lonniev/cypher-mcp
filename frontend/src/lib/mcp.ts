/**
 * Cypher MCP client — the intention-graph lab notebook.
 *
 * Pattern cloned from excalibur-mcp/frontend/src/lib/mcp.ts (the DPYC house
 * auth stack). Only the SLUG, the localStorage key prefixes, and the domain
 * wrappers differ:
 *
 * 1. One singleton @modelcontextprotocol/sdk Client over the
 *    StreamableHTTPClientTransport. The SDK handles the initialize
 *    handshake, SSE session tracking, and reconnection.
 * 2. Auth = uniform npub-proof. Two tactics, transparent to callers:
 *      - session nsec in browser → fresh kind-27235 inline proof per call
 *        (signInlineProof), scoped to the runtime tool name.
 *      - npub + DM login → the poison-phrase dpop_token the wheel cached
 *        at receive_npub_proof time, sent verbatim.
 * 3. Bootstrap/auth/balance tools are free and pre-login-safe.
 *
 * The domain half (below the money/auth wrappers) is cypher's read surface:
 * a FREE operational tier (service/session status, pricing model) that a
 * pre-funded architect can poll at no cost, and a METERED intention-graph
 * tier (capabilities, symbols, invariants, patent tracing, issue provenance,
 * factory resolution stats) — each of these is a published dynamic tool that
 * debits sats per call and is refunded on error. The dashboard caches these
 * hard (see lib/graphCache.ts): the graph is small and changes slowly.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { clearSessionNsec, hasSessionNsec, sessionNsecNpub } from "./sessionNsec";
import { debugPush } from "./debugLog";
import { signInlineProof } from "./inlineProof";

const SLUG = "cypher";

const _envUrl = (import.meta.env.VITE_MCP_URL as string | undefined) ?? "";
const MCP_URL = _envUrl.startsWith("/")
  ? `${window.location.origin}${_envUrl}`
  : _envUrl;

const NPUB_STORAGE_KEY = "cypher:patron_npub:v1";
const PROOF_STORAGE_KEY = "cypher:proof_token:v1";

let client: Client | null = null;
let connecting: Promise<void> | null = null;

function requireUrl(): string {
  if (!MCP_URL) {
    throw new Error("VITE_MCP_URL is not configured. Set it in .env (e.g. /mcp).");
  }
  return MCP_URL;
}

async function getClient(): Promise<Client> {
  if (client) return client;
  if (connecting) {
    await connecting;
    return client!;
  }
  connecting = (async () => {
    const url = requireUrl();
    const c = new Client({ name: "cypher-frontend", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(url));
    await c.connect(transport);
    client = c;
    connecting = null;
  })();
  await connecting;
  return client!;
}

// ─── Stored identity ─────────────────────────────────────────────────────

export function getStoredNpub(): string {
  return window.localStorage.getItem(NPUB_STORAGE_KEY) ?? "";
}

export function setStoredNpub(npub: string): void {
  window.localStorage.setItem(NPUB_STORAGE_KEY, npub);
}

export function getStoredProof(): string {
  return window.localStorage.getItem(PROOF_STORAGE_KEY) ?? "";
}

export function setStoredProof(proof: string): void {
  window.localStorage.setItem(PROOF_STORAGE_KEY, proof);
}

// ─── Recent logins (skip the DM on return) ───────────────────────────────
// Cache (npub, dpop_token, expiresAt) tuples so a returning architect
// re-enters on the cached proof until the server-side cache actually expires.

const RECENT_LOGINS_KEY = "cypher:recent-logins:v1";
const MAX_RECENT_LOGINS = 5;

export interface RecentLogin {
  npub: string;
  proof: string;
  expiresAt: number; // unix ms
  lastUsed: number; // unix ms
}

function readRecentLogins(): RecentLogin[] {
  try {
    const raw = window.localStorage.getItem(RECENT_LOGINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentLogin =>
        typeof e === "object" && e !== null &&
        typeof e.npub === "string" && typeof e.proof === "string" &&
        typeof e.expiresAt === "number" && typeof e.lastUsed === "number",
    );
  } catch {
    return [];
  }
}

function writeRecentLogins(entries: RecentLogin[]): void {
  window.localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(entries));
}

/// Unexpired recent logins, MRU-sorted. Prunes expired entries as a side effect.
export function getValidRecentLogins(): RecentLogin[] {
  const now = Date.now();
  const entries = readRecentLogins();
  const valid = entries.filter((e) => e.expiresAt > now);
  if (valid.length !== entries.length) writeRecentLogins(valid);
  valid.sort((a, b) => b.lastUsed - a.lastUsed);
  return valid;
}

/// Record (or refresh) a successful login. Derate the TTL by 30s so a
/// straggler can't serve an already-expired token to the next paid call.
export function recordRecentLogin(npub: string, proof: string, expiresInSec: number): void {
  const safeTtl = Math.max(0, expiresInSec - 30);
  const next: RecentLogin = {
    npub,
    proof,
    expiresAt: Date.now() + safeTtl * 1000,
    lastUsed: Date.now(),
  };
  const others = readRecentLogins().filter((e) => e.npub !== npub);
  writeRecentLogins(
    [next, ...others].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, MAX_RECENT_LOGINS),
  );
}

export function forgetRecentLogin(npub: string): void {
  writeRecentLogins(readRecentLogins().filter((e) => e.npub !== npub));
}

/// "Logged in" = we have the architect's npub AND a way to prove ownership:
/// either a cached DM dpop_token, or a session nsec whose npub matches.
export function isLoggedIn(): boolean {
  const npub = getStoredNpub();
  if (!npub) return false;
  if (getStoredProof()) return true;
  if (hasSessionNsec() && sessionNsecNpub() === npub) return true;
  return false;
}

export function logOut(): void {
  window.localStorage.removeItem(NPUB_STORAGE_KEY);
  window.localStorage.removeItem(PROOF_STORAGE_KEY);
  try {
    clearSessionNsec();
  } catch {
    /* noop */
  }
}

/// Resolve the proof for a paid call: prefer a fresh inline proof signed
/// by the session nsec (if it matches the stored npub), else the cached
/// DM dpop_token. Stale session-nsec entries (from a prior identity) are
/// evicted so they don't poison the call.
function getCachedProof(toolName: string): string {
  try {
    const currentNpub = getStoredNpub();
    const sessionNpub = hasSessionNsec() ? sessionNsecNpub() : null;
    if (sessionNpub && sessionNpub === currentNpub) {
      return signInlineProof(`${SLUG}_${toolName}`);
    }
    if (sessionNpub && sessionNpub !== currentNpub) {
      clearSessionNsec();
    }
  } catch {
    /* fall through to the cached poison token */
  }
  return getStoredProof();
}

// ─── callTool ────────────────────────────────────────────────────────────

interface ToolResultText {
  type: string;
  text?: string;
}

interface ToolResult {
  isError?: boolean;
  content?: ToolResultText[];
  structuredContent?: unknown;
}

/// Thrown when the server rejects a paid call because the proof expired or
/// was never sent. The gate catches this and bounces the user to sign-in.
export class ProofRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofRequiredError";
  }
}

// ─── Proof-expiry signal ───────────────────────────────────────────────────
// A metered graph read can bounce for an expired proof from anywhere. `callTool`
// clears the stale token synchronously, but the React tree needs to KNOW so it
// can re-present sign-in. Any component (App) subscribes; the tool layer fires
// on every proof bounce.

type ProofExpiredListener = (message: string) => void;
const proofExpiredListeners = new Set<ProofExpiredListener>();

/// Subscribe to proof-expiry bounces. Returns an unsubscribe fn.
export function onProofExpired(cb: ProofExpiredListener): () => void {
  proofExpiredListeners.add(cb);
  return () => proofExpiredListeners.delete(cb);
}

function emitProofExpired(message: string): void {
  for (const cb of proofExpiredListeners) {
    try {
      cb(message);
    } catch {
      /* a listener error must not swallow the throw that follows */
    }
  }
}

/// Tools whose wheel signature takes no npub/proof envelope. Pydantic
/// strict mode rejects unexpected kwargs, so we must NOT inject them here.
const BOOTSTRAP_TOOLS = new Set([
  "request_npub_proof",
  "receive_npub_proof",
  "service_status",
  // Takes an explicit patron_npub, no proof envelope (free readiness probe).
  "session_status",
  // Public kind-0 profile reads/relays — take explicit npub, no proof envelope.
  "get_nostr_profile",
  "publish_nostr_profile",
  // Operator-wide reads that take NO npub/proof envelope (the wheel rejects an
  // unexpected `npub` kwarg on these). They describe the operator, not a patron.
  "get_pricing_model",
  "get_operator_onboarding_status",
]);

/// Tools too noisy/background to clutter the debug log (polled liveness).
const QUIET_TOOLS = new Set([
  "service_status",
  "get_nostr_profile",
]);

async function callTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {},
  opts: { bestEffort?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const quiet = QUIET_TOOLS.has(toolName);
  // `args` holds only the wrapper's own params — never npub/proof (those are
  // injected below), so it is safe to log verbatim.
  if (!quiet) debugPush("call", `${SLUG}_${toolName}(${JSON.stringify(args).slice(0, 140)})`);

  const c = await getClient();
  const merged: Record<string, unknown> = BOOTSTRAP_TOOLS.has(toolName)
    ? { ...args }
    : { npub: getStoredNpub(), dpop_token: getCachedProof(toolName), ...args };

  let result: ToolResult;
  try {
    result = (await c.callTool(
      { name: `${SLUG}_${toolName}`, arguments: merged },
      undefined,
      { timeout: opts.timeoutMs ?? 120_000 },
    )) as ToolResult;
  } catch (e) {
    if (!quiet) debugPush("error", `${SLUG}_${toolName}: ${(e as Error).message}`);
    throw new Error(`${SLUG}_${toolName}: ${(e as Error).message}`);
  }

  if (result.isError) {
    const errText = (result.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => String(b.text))
      .join("\n") || "Tool call failed";
    if (!quiet) debugPush("error", `${SLUG}_${toolName}: ${errText.slice(0, 200)}`);
    throw new Error(errText);
  }

  let payload: unknown;
  if (result.structuredContent !== undefined) {
    payload = result.structuredContent;
  } else {
    const textBlocks = (result.content ?? []).filter((b) => b.type === "text");
    if (textBlocks.length > 0) {
      const text = String(textBlocks[0].text ?? "");
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    } else {
      payload = result;
    }
  }

  if (!quiet) {
    const preview = typeof payload === "string" ? payload : JSON.stringify(payload);
    const p = payload as Record<string, unknown> | null;
    const failed = p && typeof p === "object" && (p.success === false || p.error);
    debugPush(failed ? "error" : "result", `${SLUG}_${toolName} → ${String(preview).slice(0, 220)}`);
  }

  // Soft proof failures arrive as {success:false, error_code:...} with no
  // isError flag. Treat them as auth bounces: clear the stale token and let the
  // gate re-arm sign-in. NOT for best-effort calls (personalization/diagnostics).
  if (!opts.bestEffort && payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const errCode = String(p.error_code ?? "").toLowerCase();
    if (p.success === false && (errCode === "proof_required" || errCode === "proof_refresh_needed")) {
      const bouncedNpub = getStoredNpub();
      window.localStorage.removeItem(PROOF_STORAGE_KEY);
      if (bouncedNpub) forgetRecentLogin(bouncedNpub);
      const msg = String(p.error ?? "Sign-in required.");
      emitProofExpired(msg);
      throw new ProofRequiredError(msg);
    }
  }
  return payload as T;
}

/// Sort direction used by the shared PagedTable header controls.
export type SortDir = "asc" | "desc";

// Raw escape hatch for the metered-fetch cache layer, which needs to name any
// published dynamic read tool (e.g. context_pack) and preview its price.
export function callGraphTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {},
  opts: { bestEffort?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  return callTool<T>(toolName, args, opts);
}

// ─── Service / auth (free) ───────────────────────────────────────────────

export interface DurableJobs {
  enabled?: boolean;
  backend?: string;
  [k: string]: unknown;
}

/// cypher_service_status — health of vault + credential courier + wheel version.
export interface ServiceStatus {
  service?: string;
  slug?: string;
  version?: string;
  tollbooth_version?: string;
  tollbooth_dpyc_version?: string;
  operator_npub?: string;
  operator_npub_hash?: string;
  process_id?: number;
  vault_ok?: boolean;
  courier_ok?: boolean;
  // The wheel returns this as an object ({mode, patron_credentials_required}),
  // not a bare string — render its `mode`, never the object itself.
  patron_auth?: string | { mode?: string; patron_credentials_required?: boolean };
  durable_jobs?: DurableJobs;
  lifecycle?: string;
  message?: string;
  build_info?: {
    fastmcp_cloud_url?: string;
    fastmcp_cloud_git_commit_sha?: string;
    fastmcp_cloud_git_repo?: string;
  };
}

export async function serviceStatus(): Promise<ServiceStatus> {
  return callTool<ServiceStatus>("service_status", {});
}

/// cypher_session_status — the database-health traffic light. Lifecycle is one
/// of: ready | warming_up | misconfigured | quota_exceeded | not_registered |
/// no_identity. Free readiness probe; takes an explicit patron_npub.
export interface SessionStatus {
  lifecycle?: string;
  message?: string;
  operator_npub?: string;
  patron_npub?: string;
  [k: string]: unknown;
}

export async function sessionStatus(): Promise<SessionStatus> {
  const npub = getStoredNpub();
  return callTool<SessionStatus>("session_status", npub ? { patron_npub: npub } : {});
}

export interface NpubProofResult {
  success?: boolean;
  proven_npub?: string;
  verified?: boolean; // legacy field; current wheel uses `success`
  status?: string;
  message?: string;
  dpop_token?: string; // wheel 0.57.0+ (was proof_token)
  popped_dms?: number;
  expires_in_seconds?: number;
  expires_at?: string;
  error?: string;
  error_code?: string;
}

/// Step 1 of DM login. Sends a Secure Courier challenge DM to the npub.
/// The user replies in their own Nostr client. Free.
export async function requestNpubProof(patronNpub: string): Promise<NpubProofResult> {
  return callTool<NpubProofResult>("request_npub_proof", { patron_npub: patronNpub });
}

/// Step 2 of DM login. Destructively drains DMs looking for the signed
/// reply to step 1. Call ONLY after the user has actually replied — do not
/// poll or speculatively retry (feedback_human_in_loop_courier).
export async function receiveNpubProof(patronNpub: string, dpopToken: string): Promise<NpubProofResult> {
  return callTool<NpubProofResult>("receive_npub_proof", {
    patron_npub: patronNpub,
    dpop_token: dpopToken,
  });
}

export interface CreditTranche {
  id: string;
  amount_sats: number;
  remaining_sats: number;
  expires_at: string | null;
  created_at: string | null;
}

export interface CheckBalanceResult {
  success?: boolean;
  balance_api_sats?: number;
  total_deposited_api_sats?: number;
  total_consumed_api_sats?: number;
  active_tranches?: number;
  tranches?: CreditTranche[];
  next_expiration_iso?: string;
  seed_balance_granted?: boolean;
  vault_unavailable?: boolean;
  warning?: string;
  npub?: string;
  error?: string;
  error_code?: string;
}

/// Balance is a free convenience read that the nav bar polls on every
/// navigation. It is best-effort: a lapsed proof must never log the architect
/// out from a background poll — only a user-initiated metered graph read does.
export async function checkBalance(): Promise<CheckBalanceResult> {
  return callTool<CheckBalanceResult>("check_balance", {}, { bestEffort: true });
}

export interface CheckPriceResult {
  success: boolean;
  tool_id?: string;
  tool_name?: string;
  base_cost?: number;
  effective_cost?: number;
  cost?: number;
  error?: string;
  error_code?: string;
}

export async function checkPrice(
  toolCapability: string,
  toolKwargs: Record<string, unknown> = {},
): Promise<CheckPriceResult> {
  return callTool<CheckPriceResult>("check_price", {
    tool_id: toolCapability,
    tool_kwargs: JSON.stringify(toolKwargs),
  });
}

export interface PurchaseCreditsResult {
  success?: boolean;
  invoice_id?: string;
  checkout_link?: string;
  lightning_invoice?: string;
  payment_request?: string;
  expires_at?: string;
  amount_sats?: number;
  error?: string;
  error_code?: string;
}

export async function purchaseCredits(sats: number): Promise<PurchaseCreditsResult> {
  return callTool<PurchaseCreditsResult>("purchase_credits", { amount_sats: sats });
}

export interface CheckPaymentResult {
  success?: boolean;
  status?: "New" | "Processing" | "Settled" | "Expired" | "Invalid" | string;
  message?: string;
  invoice_id?: string;
  credits_granted?: number;
  balance_api_sats?: number;
  error?: string;
  error_code?: string;
}

export async function checkPayment(invoiceId: string): Promise<CheckPaymentResult> {
  return callTool<CheckPaymentResult>("check_payment", { invoice_id: invoiceId });
}

export interface AccountStatementResult {
  success?: boolean;
  npub?: string;
  balance_api_sats?: number;
  total_deposited_api_sats?: number;
  total_consumed_api_sats?: number;
  total_expired_api_sats?: number;
  active_tranches?: number;
  today_usage?: Record<string, { calls: number; api_sats: number }>;
  error?: string;
}

/// Best-effort: a background statement read on the Profile page must not bounce
/// the architect to sign-in.
export async function getAccountStatement(days = 30): Promise<AccountStatementResult> {
  return callTool<AccountStatementResult>("account_statement", { days }, { bestEffort: true });
}

// ─── Pricing model (free) — the published dynamic tool set + prices ─────────
// get_pricing_model surfaces every registered/published tool, its price_sats,
// priced flag, price_type, and any constraint chain (per-npub allow-lists).
// This is how the Query Catalog view learns what dynamic tools exist and what
// they cost — the "apparatus" register of the notebook.

export interface PricedTool {
  tool_id?: string;
  tool_name?: string;
  name?: string;
  price_sats?: number;
  priced?: boolean;
  price_type?: string;
  category?: string;
  chain?: unknown;
  [k: string]: unknown;
}

export interface PricingModel {
  success?: boolean;
  tools?: PricedTool[];
  model?: unknown;
  error?: string;
  error_code?: string;
  [k: string]: unknown;
}

export async function getPricingModel(): Promise<PricingModel> {
  return callTool<PricingModel>("get_pricing_model", {}, { bestEffort: true });
}

// ─── Operator onboarding status (free) — which operator secrets are set ─────

export interface OnboardingStatus {
  success?: boolean;
  ready?: boolean;
  configured?: Record<string, boolean>;
  missing?: string[];
  message?: string;
  error?: string;
  [k: string]: unknown;
}

export async function getOperatorOnboardingStatus(): Promise<OnboardingStatus> {
  return callTool<OnboardingStatus>("get_operator_onboarding_status", {}, { bestEffort: true });
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
  actionable_text?: string;
}

/// A capability's human-authored "why" is doctrine; inferred_why is an agent's
/// unverified advice. The provenance literals distinguish them — surface both.
export interface CapabilitySummary {
  name: string;
  owners?: string[];
  keywords?: string[];
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

export interface IssueProvenance {
  issue_url?: string;
  repo_url?: string;
  pr_url?: string;
  repo_name?: string;
  number?: number;
  title?: string;
  classification?: string;
  disposition?: string;
  actionable_text?: string;
  resolved_via?: string;
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

/// list_capabilities — the full compact catalog for semantic triage.
export async function listCapabilities(): Promise<CapabilitySummary[]> {
  const r = await callTool<unknown>("list_capabilities", {});
  return asArray<CapabilitySummary>(r).map((c) => ({
    ...c,
    keywords: asStrList(c.keywords),
    owners: asStrList(c.owners),
  }));
}

/// explain_capability — the "why" + provenance + owners/consumers for one name.
export async function explainCapability(name: string): Promise<CapabilityExplain> {
  const r = await callTool<CapabilityExplain>("explain_capability", { name });
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

/// capability_patents — the patent numerals grounding a capability's "why".
export async function capabilityPatents(name: string): Promise<PatentRef[]> {
  const r = await callTool<unknown>("capability_patents", { name });
  return asArray<PatentRef>(r);
}

/// explain_patent_element — one numeral → its capabilities + invariants.
export async function explainPatentElement(ref: number): Promise<PatentElementDetail> {
  const r = await callTool<PatentElementDetail>("explain_patent_element", { ref });
  return { ...r, capabilities: asStrList(r.capabilities), invariants: asStrList(r.invariants) };
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
  const r = await callTool<IssueProvenance>("issue_provenance", {
    repo_name: repoName,
    issue_number: issueNumber,
  });
  return {
    ...r,
    capabilities: asStrList(r.capabilities),
    root_cause_symbols: normalizeSymbols(r.root_cause_symbols),
    rejections: normalizeRejections(r.rejections),
  };
}

/// A compact issue for the Issues register (peer of CapabilitySummary).
export interface IssueSummary {
  repo_name?: string;
  number?: number;
  title?: string;
  classification?: string;
  disposition?: string;
  resolved_via?: string;
  url?: string;
  pr_url?: string;
  capabilities?: string[];
}

/// list_issues — the full compact issue catalog (peer of list_capabilities).
/// Run via the published `execute_query_by_key` against the seeded `list_issues`
/// template, so it works whether or not the operator published it as a named
/// tool (and is billed via the already-priced execute_query_by_key).
export async function listIssues(): Promise<IssueSummary[]> {
  const r = await callTool<unknown>("execute_query_by_key", { key: "list_issues" });
  return asArray<IssueSummary>(r).map((i) => ({ ...i, capabilities: asStrList(i.capabilities) }));
}

/// factory_resolution_stats — the grep-fallback distribution (the headline metric).
export async function factoryResolutionStats(): Promise<ResolutionStat[]> {
  const r = await callTool<unknown>("factory_resolution_stats", {});
  return asArray<ResolutionStat>(r);
}

// ─── Nostr kind-0 profile (served by the wheel; no relay I/O in the FE) ────

export interface Kind0 {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  website?: string;
  lud16?: string;
}

export interface GetNostrProfileResult {
  success: boolean;
  npub?: string;
  profile?: Kind0;
  error?: string;
}

/// Read an npub's public kind-0 profile via the operator MCP (free, no proof).
export async function getNostrProfile(npub: string): Promise<GetNostrProfileResult> {
  return callTool<GetNostrProfileResult>("get_nostr_profile", { npub });
}

export interface PublishNostrProfileResult {
  success: boolean;
  ok?: number;
  total?: number;
  errors?: string[];
  error?: string;
}

/// Relay a CLIENT-signed kind-0 event through the operator MCP. The FE signs;
/// the wheel verifies pubkey+signature and fans out to relays.
export async function publishNostrProfile(
  npub: string,
  signedEvent: string,
): Promise<PublishNostrProfileResult> {
  return callTool<PublishNostrProfileResult>("publish_nostr_profile", {
    npub,
    signed_event: signedEvent,
  });
}

// ─── Coupons (wheel 0.41.0+) ─────────────────────────────────────────────

export interface PatronCoupon {
  coupon_id: string;
  name: string;
  discount_percent: number;
  valid_from: string;
  valid_until: string;
  uses_per_patron: number | null;
  use_count: number;
  uses_remaining: number | null;
  total_uses: number | null;
  total_remaining: number | null;
  status: string;
}

export interface ListMyCouponsResult {
  success: boolean;
  count: number;
  coupons: PatronCoupon[];
  error?: string;
}

export interface RedeemCouponResult {
  success: boolean;
  coupon_id?: string;
  name?: string;
  discount_percent?: number;
  valid_until?: string;
  uses_remaining?: number | null;
  uses_per_patron?: number | null;
  error?: string;
}

export interface ForgetCouponResult {
  success: boolean;
  coupon_id?: string;
  error?: string;
}

export async function listMyCoupons(): Promise<ListMyCouponsResult> {
  return callTool<ListMyCouponsResult>("list_my_coupons", {});
}

export async function redeemCoupon(code: string): Promise<RedeemCouponResult> {
  return callTool<RedeemCouponResult>("redeem_coupon", { code });
}

export async function forgetCoupon(couponId: string): Promise<ForgetCouponResult> {
  return callTool<ForgetCouponResult>("forget_coupon", { coupon_id: couponId });
}
