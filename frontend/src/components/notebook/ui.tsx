// Shared lab-notebook UI atoms. The notebook aesthetic: serif display headings,
// small-caps ruled section labels, generous type, a paper-neutral stone/zinc
// ground with a single amber accent — deliberately NOT a force-directed graph.
// Provenance is always visible: human-authored is doctrine; llm-inferred is an
// agent's unverified advice.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw, ShieldCheck, Sparkle, BookOpen } from "lucide-react";
import { ageLabel } from "../../lib/graphCache";

export const card =
  "rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";
export const muted = "text-stone-500 dark:text-zinc-400";
export const faint = "text-stone-400 dark:text-zinc-500";

/// The page frame: a serif masthead title, a lede, and the body. Every notebook
/// section opens the same way so the whole thing reads as one bound volume.
export function Page({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 border-b border-stone-200 pb-5 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                {eyebrow}
              </div>
            )}
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50">
              {title}
            </h1>
            {lede && <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${muted}`}>{lede}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}

/// A ruled small-caps section heading — the notebook's chapter markers.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
        {children}
      </span>
      <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-800" />
    </div>
  );
}

/// Provenance is the architecturally-central signal: a Capability's human "why"
/// is doctrine (an agent cannot forge it); its inferred "why" is unverified
/// advice. Render the two unmistakably differently.
export function ProvenanceSeal({ provenance }: { provenance?: string }) {
  const p = (provenance ?? "").toLowerCase();
  if (p.includes("human")) {
    return (
      <span
        title="Human-authored — doctrine. An agent physically cannot write this."
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        <ShieldCheck className="h-3 w-3" /> Human-authored
      </span>
    );
  }
  if (p.includes("journeyman") || p.includes("verified")) {
    return (
      <span
        title="Journeyman-verified against a commit SHA."
        className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
      >
        <ShieldCheck className="h-3 w-3" /> Verified
      </span>
    );
  }
  return (
    <span
      title="Agent-inferred and unverified — treat as advice, not doctrine."
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
    >
      <Sparkle className="h-3 w-3" /> Agent-inferred · unverified
    </span>
  );
}

/// The metered-read header: cache age + live price + a Refresh that pays for a
/// fresh call. Cost is shown BEFORE it is spent — no surprise sat debits.
export function MeteredBar({
  cachedAt,
  loading,
  priceSats,
  onRefresh,
  note,
}: {
  cachedAt: number | null;
  loading: boolean;
  priceSats: number | null;
  onRefresh: () => void;
  note?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className={faint}>
        {loading ? "Reading the graph…" : cachedAt ? `Cached · ${ageLabel(cachedAt)}` : "Not yet read"}
      </span>
      {note && <span className={faint}>· {note}</span>}
      <span className="ml-auto flex items-center gap-2">
        {priceSats != null && (
          <span className={faint}>
            {priceSats === 0 ? "free" : `~${priceSats.toLocaleString()} sats / read`}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1 font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500/50 dark:hover:text-amber-300"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </span>
    </div>
  );
}

/// A hyperlink out to an external service (GitHub issue/PR, patent doc). Only
/// rendered when the graph actually carries a full URL — we never synthesize a
/// GitHub owner (feedback_no_hardcoded_gh_owner).
export function Outbound({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

/// An internal cross-reference — the notebook's [[wikilink]]. Links one entry to
/// another (capability → symbol → service → patent → issue).
export function XRef({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-stone-700 underline decoration-stone-300 underline-offset-2 hover:text-amber-700 hover:decoration-amber-400 dark:text-zinc-200 dark:decoration-zinc-600 dark:hover:text-amber-300"
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className={`${card} flex items-center gap-2 px-4 py-8 text-sm ${muted}`}>
      <BookOpen className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      {children}
    </div>
  );
}

/// A metered-read error, rendered with intent. An empty-balance error becomes a
/// calm Top-up call to action (the common case — graph reads cost sats) rather
/// than a raw "0 sats available" string; everything else shows the message.
export function MeteredError({ error }: { error: string }) {
  const broke = /insufficient balance|required for|0 sats available/i.test(error);
  if (broke) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="mb-1 text-sm font-medium text-amber-800 dark:text-amber-300">
          Your credit balance is empty
        </div>
        <p className="mb-3 text-xs leading-relaxed text-amber-700/90 dark:text-amber-200/80">
          Graph reads settle in Bitcoin Lightning. Top up a small balance and this register loads
          on the next read. {error}
        </p>
        <Link
          to="/wallet"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500"
        >
          Top up
        </Link>
      </div>
    );
  }
  return <ErrorNote>{error}</ErrorNote>;
}

/// A short-hex npub chip (identity is a key, never a name).
export function NpubChip({ npub }: { npub?: string }) {
  if (!npub) return <span className={faint}>—</span>;
  return (
    <span className="font-mono text-[11px] text-stone-500 dark:text-zinc-400" title={npub}>
      {npub.startsWith("npub1") ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub}
    </span>
  );
}
