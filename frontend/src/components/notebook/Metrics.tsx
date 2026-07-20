// Factory Metrics — the token-savings ledger. factory_resolution_stats reports
// how the Service Desk located code for each issue: `graph` (context_pack
// alone, cheapest), `scoped-grep` (graph narrowed a grep), or `wide-grep` (the
// graph missed and the whole repo was re-tokenized, costliest). Doctrine: watch
// wide-grep trend to zero as the graph learns. The bar is semantic, not
// decorative — greener is cheaper.

import { factoryResolutionStats, type ResolutionStat } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { Page, MeteredBar, SectionLabel, Empty, MeteredError, card, faint, muted } from "./ui";

// Semantic ordering + palette: cheapest resolution first, costliest last.
const ORDER = ["graph", "scoped-grep", "wide-grep"];

interface Tone {
  bar: string;
  text: string;
  gloss: string;
}
const TONES: Record<string, Tone> = {
  graph: {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    gloss: "Answered from the graph alone — no grep. The cheapest path.",
  },
  "scoped-grep": {
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    gloss: "The graph narrowed a grep to a handful of files.",
  },
  "wide-grep": {
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    gloss: "The graph missed; the whole repo was re-tokenized. The metric to drive down.",
  },
};
const FALLBACK: Tone = { bar: "bg-zinc-400", text: "text-stone-600 dark:text-zinc-300", gloss: "" };

export default function Metrics() {
  const m = useMetered<ResolutionStat[]>(
    "metrics:resolution",
    factoryResolutionStats,
  );

  const stats = (m.data ?? []).filter((s) => s.resolved_via);
  const total = stats.reduce((a, s) => a + (s.n ?? 0), 0);
  const sorted = [...stats].sort((a, b) => {
    const ia = ORDER.indexOf(a.resolved_via ?? "");
    const ib = ORDER.indexOf(b.resolved_via ?? "");
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const graphN = stats.find((s) => s.resolved_via === "graph")?.n ?? 0;
  const wideN = stats.find((s) => s.resolved_via === "wide-grep")?.n ?? 0;
  const graphPct = total ? Math.round((graphN / total) * 100) : 0;
  const widePct = total ? Math.round((wideN / total) * 100) : 0;

  return (
    <Page
      eyebrow="Register · Ledger"
      title="Factory Metrics"
      lede="Every issue the Service Desk resolves records HOW its code was found. The greener that mix, the more the intention graph is paying for itself in tokens it saves."
    >
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />

      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <Empty>Reading the resolution ledger…</Empty>}

      {m.data && (total === 0 ? (
        <Empty>No resolutions recorded yet — the ledger fills as the Service Desk triages issues.</Empty>
      ) : (
        <div className="space-y-8">
          {/* Headline tiles */}
          <div className="grid grid-cols-3 gap-3">
            <Tile label="Resolutions" value={total.toLocaleString()} sub="issues located" />
            <Tile label="From the graph" value={`${graphPct}%`} sub={`${graphN.toLocaleString()} issues`} tone="text-emerald-700 dark:text-emerald-300" />
            <Tile label="Wide-grep" value={`${widePct}%`} sub={`${wideN.toLocaleString()} issues`} tone="text-rose-700 dark:text-rose-300" />
          </div>

          {/* Single semantic distribution bar */}
          <section>
            <SectionLabel>Resolution mix</SectionLabel>
            <div
              className="flex h-8 w-full overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-800"
              role="img"
              aria-label={sorted.map((s) => `${s.resolved_via}: ${s.n}`).join(", ")}
            >
              {sorted.map((s) => {
                const tone = TONES[s.resolved_via ?? ""] ?? FALLBACK;
                const pct = total ? ((s.n ?? 0) / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={s.resolved_via}
                    className={`${tone.bar} flex items-center justify-center`}
                    style={{ width: `${pct}%` }}
                    title={`${s.resolved_via}: ${s.n} (${Math.round(pct)}%)`}
                  >
                    {pct > 8 && <span className="text-[11px] font-medium text-white">{Math.round(pct)}%</span>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Per-mode breakdown ledger */}
          <section>
            <SectionLabel>By resolution path</SectionLabel>
            <div className={`${card} divide-y divide-stone-100 dark:divide-zinc-800`}>
              {sorted.map((s) => {
                const tone = TONES[s.resolved_via ?? ""] ?? FALLBACK;
                const pct = total ? Math.round(((s.n ?? 0) / total) * 100) : 0;
                return (
                  <div key={s.resolved_via} className="flex items-center gap-4 px-4 py-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${tone.bar}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`font-mono text-sm font-medium ${tone.text}`}>{s.resolved_via}</div>
                      {tone.gloss && <div className={`text-[11px] ${muted}`}>{tone.gloss}</div>}
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums text-lg font-semibold">{(s.n ?? 0).toLocaleString()}</div>
                      <div className={`text-[11px] ${faint}`}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ))}
    </Page>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className={`text-[10px] font-medium uppercase tracking-widest ${faint}`}>{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className={`mt-0.5 text-[11px] ${faint}`}>{sub}</div>
    </div>
  );
}
