// Recently Changed register — the "what's new in the knowledge base" feed. Pick
// a rolling window with the chiclets (Day · Week · Month · Quarter · Any time —
// the shared filter vocabulary) and see every domain object — Capability, Issue, Symbol,
// Invariant, PatentElement, Service — created or modified within it, newest
// first, each row a click-through into its existing dossier. The one query
// (recent_activity) that unifies the notebook's registers on a timeline.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { recentActivity, type RecentActivity, type ActivityKind } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { SINCE_PRESETS, sinceLabel, relTime, toMillis } from "../../lib/time";
import { Page, MeteredBar, MeteredError, LoadPanel, Empty, muted, faint } from "./ui";
import { Icon, type IconName } from "./icons";
import QuoteScroller from "../QuoteScroller";

// Per-kind display + routing. `href` returns the dossier path, or null for kinds
// with no standalone dossier (Invariant surfaces inside Capability/Symbol pages).
const KIND: Record<
  ActivityKind,
  { icon: IconName; tint: string; href: (r: RecentActivity) => string | null }
> = {
  Capability: {
    icon: "verified",
    tint: "text-amber-700 bg-amber-500/[0.12] dark:text-amber-300",
    href: (r) => (r.key ? `/capabilities/${encodeURIComponent(r.key)}` : null),
  },
  Issue: {
    icon: "history",
    tint: "text-sky-700 bg-sky-500/10 dark:text-sky-300",
    href: (r) => (r.repo && r.key ? `/issues/${encodeURIComponent(r.repo)}/${encodeURIComponent(r.key)}` : null),
  },
  Symbol: {
    icon: "symbol",
    tint: "text-violet-700 bg-violet-500/10 dark:text-violet-300",
    href: (r) => (r.key ? `/symbol?fqn=${encodeURIComponent(r.key)}` : null),
  },
  Invariant: {
    icon: "info",
    tint: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300",
    href: () => null, // no standalone dossier — shown within the entries it guards
  },
  PatentElement: {
    icon: "tag",
    tint: "text-rose-700 bg-rose-500/10 dark:text-rose-300",
    href: (r) => (r.key ? `/patent/${encodeURIComponent(r.key)}` : null),
  },
  Service: {
    icon: "dns",
    tint: "text-teal-700 bg-teal-500/10 dark:text-teal-300",
    href: (r) => (r.repo ? `/services/${encodeURIComponent(r.repo)}` : null),
  },
};

const KIND_ORDER: ActivityKind[] = [
  "Capability", "Issue", "Symbol", "Invariant", "PatentElement", "Service",
];

function meta(kind: string) {
  return KIND[kind as ActivityKind] ?? { icon: "bookmark" as IconName, tint: `${muted}`, href: () => null };
}

/// One activity row — a Link when the kind has a dossier, an inert div otherwise.
function Row({ r }: { r: RecentActivity }) {
  const m = meta(r.kind);
  const href = m.href(r);
  const ts = toMillis(r.updated_at);

  const inner = (
    <>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.tint}`}>
        <Icon name={m.icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${m.tint}`}>
            {r.kind}
          </span>
          {r.repo && r.kind !== "Service" && (
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-stone-500 dark:text-zinc-400">
              <Icon name="github" size={12} /> {r.repo}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate font-serif text-[15px] font-medium text-stone-900 dark:text-zinc-50">
          {r.label?.trim() || r.key || "(unnamed)"}
        </div>
      </div>
      <div className={`flex shrink-0 items-center gap-1.5 pl-2 text-[10.5px] ${faint}`}>
        {ts != null && <span className="whitespace-nowrap">{relTime(ts)}</span>}
        {href && <Icon name="open" size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" />}
      </div>
    </>
  );

  const shell =
    "flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-900";

  if (!href) {
    return (
      <div className={shell} title="Shown within the entries it guards — no standalone page.">
        {inner}
      </div>
    );
  }
  return (
    <Link to={href} className={`group ${shell} transition-colors hover:border-amber-300 dark:hover:border-amber-500/40`}>
      {inner}
    </Link>
  );
}

export default function RecentActivity() {
  // Same rolling-window vocabulary as every other filter (24h · 7d · 30d · 90d ·
  // Any time). `since` is a day count; 0 = any time.
  const [since, setSince] = useState(7);
  const [kindFilter, setKindFilter] = useState<ActivityKind | "all">("all");
  const [q, setQ] = useState("");

  // Each window is its own cached read; no auto-fetch so a tab entry never spends
  // sats before the architect has chosen a window.
  const m = useMetered<RecentActivity[]>(
    `recent:since=${since}`,
    () => recentActivity({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0, untilMs: 0 }),
    { autoFetch: false, refetchOnKeyChange: true },
  );

  const rows = m.data ?? [];

  // Per-kind counts for the filter chips (over the full window, pre-text-filter).
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.kind] = (c[r.kind] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!needle) return true;
      return (
        (r.label ?? "").toLowerCase().includes(needle) ||
        (r.key ?? "").toLowerCase().includes(needle) ||
        (r.repo ?? "").toLowerCase().includes(needle) ||
        r.kind.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, kindFilter]);

  const presentKinds = KIND_ORDER.filter((k) => counts[k]);

  return (
    <Page
      eyebrow="Register"
      title="Recently Changed"
      lede="Everything the knowledge base learned in a window — capabilities, issues, symbols, invariants, patent elements, and services — newest first. Pick a range, then open any entry's dossier."
    >
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          {/* Rolling-window chiclets — the primary control. Same vocabulary and
              order as every other filter: shortest first, "Any time" far right. */}
          <div className="mb-4 inline-flex flex-wrap items-center gap-1">
            <Icon name="history" size={15} className="mr-1 text-stone-400 dark:text-zinc-500" />
            {SINCE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => setSince(p.days)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  since === p.days
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name, service, or type…"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          {/* Type filter chips (only kinds present in this window). */}
          {m.data && rows.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setKindFilter("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  kindFilter === "all"
                    ? "bg-stone-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                All {rows.length}
              </button>
              {presentKinds.map((k) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(kindFilter === k ? "all" : k)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    kindFilter === k ? KIND[k].tint : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Icon name={KIND[k].icon} size={12} /> {k} {counts[k]}
                </button>
              ))}
            </div>
          )}

          <div className="mb-3 text-xs">
            <span className={faint}>{m.data ? `${filtered.length} of ${rows.length} in ${sinceLabel(since).toLowerCase()}` : "not loaded"}</span>
          </div>

          {m.loading ? (
            <QuoteScroller heading="Reading the activity feed…" className="py-12" />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} loading={m.loading} />
          ) : filtered.length === 0 ? (
            <Empty>{rows.length === 0 ? "Nothing changed in this window." : "No entries match this filter."}</Empty>
          ) : (
            <div className="grid gap-2">
              {filtered.map((r, i) => (
                <Row key={`${r.kind}:${r.key}:${r.repo}:${i}`} r={r} />
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
