// Live aggregate tiles for the public landing pages. Pulls the free
// `public_factory_stats` tool — no proof, no credits. Cache-hard on the
// server; we still soft-cache in the browser so a guest paging around
// the four public routes does not re-hit MCP every navigation.

import { useEffect, useState } from "react";
import {
  publicFactoryStats,
  type PublicFactoryStats,
  type ResolutionStat,
} from "../../lib/mcp";
import { RESOLVED_VIA } from "../../lib/factoryModel";

const BROWSER_TTL_MS = 60_000;
let browserCache: { at: number; data: PublicFactoryStats } | null = null;

async function loadStats(): Promise<PublicFactoryStats> {
  const now = Date.now();
  if (browserCache && now - browserCache.at < BROWSER_TTL_MS) {
    return browserCache.data;
  }
  const data = await publicFactoryStats();
  browserCache = { at: now, data };
  return data;
}

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0;
}

function viaN(stats: ResolutionStat[] | undefined, key: string): number {
  return stats?.find((s) => s.resolved_via === key)?.n ?? 0;
}

export default function LiveStats({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<PublicFactoryStats | null>(browserCache?.data ?? null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadStats()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr((e as Error).message || "stats unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err && !data) {
    return (
      <p className="text-xs text-stone-400 dark:text-zinc-500">
        Live counts unavailable right now — the graph may be warming up.
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-xs text-stone-400 dark:text-zinc-500">Reading the factory ledger…</p>
    );
  }

  if (!data.available) {
    return (
      <p className="text-xs text-stone-400 dark:text-zinc-500">
        Live counts will appear once this operator&apos;s graph is online.
      </p>
    );
  }

  const totalRes = (data.resolution ?? []).reduce((a, s) => a + (s.n ?? 0), 0);
  const graphN = viaN(data.resolution, "graph");
  const wideN = viaN(data.resolution, "wide-grep");
  const graphPct = pct(graphN, totalRes);
  const widePct = pct(wideN, totalRes);

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
        <Tile label="Capabilities" value={data.capability_count} />
        <Tile label="Invariants" value={data.invariant_count} />
        <Tile label="Issues triaged" value={data.issue_count} />
        <Tile label="Services" value={data.service_count} />
        {!compact && <Tile label="Symbols anchored" value={data.symbol_count} />}
      </div>

      {totalRes > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div className="text-sm font-medium">How code was found</div>
            <div className="text-xs text-stone-400 dark:text-zinc-500">
              {totalRes.toLocaleString()} resolutions · graph {graphPct}% · wide-grep {widePct}%
            </div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800">
            {RESOLVED_VIA.map((v) => {
              const n = viaN(data.resolution, v.key);
              const w = pct(n, totalRes);
              if (!w) return null;
              const color =
                v.key === "graph"
                  ? "bg-emerald-500"
                  : v.key === "scoped-grep"
                    ? "bg-amber-500"
                    : "bg-rose-500";
              return <div key={v.key} className={color} style={{ width: `${w}%` }} title={`${v.title}: ${n}`} />;
            })}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {RESOLVED_VIA.map((v) => {
              const n = viaN(data.resolution, v.key);
              return (
                <div key={v.key} className="text-xs">
                  <div className="font-mono text-stone-700 dark:text-zinc-200">
                    {v.title} · {n.toLocaleString()}
                  </div>
                  <div className="text-stone-400 dark:text-zinc-500">{v.gloss}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.last_activity_ms ? (
        <p className="text-[11px] text-stone-400 dark:text-zinc-500">
          Last graph activity {new Date(data.last_activity_ms).toLocaleString()} · aggregates only, no titles or paths
        </p>
      ) : null}
    </div>
  );
}

function Tile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="text-[11px] uppercase tracking-widest text-stone-400 dark:text-zinc-500">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold tabular-nums">
        {(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}
