// Query Catalog — the apparatus. The operator's pricing model lists every
// registered and published dynamic tool with its price. This is a FREE read
// (get_pricing_model), so it refreshes at no cost — the notebook's index of the
// machinery that answers everything else.

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getPricingModel, type PricedTool } from "../../lib/mcp";
import { Page, SectionLabel, Empty, ErrorNote, faint, muted } from "./ui";

function toolName(t: PricedTool): string {
  return t.tool_name ?? t.name ?? t.tool_id ?? "(unnamed)";
}
function price(t: PricedTool): number | null {
  if (typeof t.price_sats === "number") return t.price_sats;
  return null;
}
function isFree(t: PricedTool): boolean {
  return t.category === "free" || (!t.priced && (t.price_sats ?? 0) === 0);
}

export default function QueryCatalog() {
  const [tools, setTools] = useState<PricedTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await getPricingModel();
      setTools(r.tools ?? []);
      if (!r.tools) setError(r.error ?? "The pricing model returned no tool list.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = tools ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((t) => (needle ? toolName(t).toLowerCase().includes(needle) || (t.category ?? "").includes(needle) : true))
      .sort((a, b) => toolName(a).localeCompare(toolName(b)));
  }, [rows, q]);

  const pricedCount = rows.filter((t) => !isFree(t)).length;

  return (
    <Page
      eyebrow="Apparatus · Free"
      title="Query Catalog"
      lede="Every tool the graph service exposes and what it costs — read straight from the operator's live pricing model. Reading this index is itself free."
      actions={
        <button
          onClick={() => void load()}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300`}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      }
    >
      {error && <ErrorNote>{error}</ErrorNote>}

      {!error && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter tools…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className={`text-xs ${faint}`}>
              {rows.length} tools · {pricedCount} priced
            </span>
          </div>

          {loading && !tools ? (
            <Empty>Reading the pricing model…</Empty>
          ) : filtered.length === 0 ? (
            <Empty>No tools match that filter.</Empty>
          ) : (
            <>
              <SectionLabel>Published & registered tools</SectionLabel>
              <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:border-zinc-800 dark:text-zinc-500">
                      <th className="px-3 py-2">Tool</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => (
                      <tr
                        key={(t.tool_id ?? toolName(t)) + i}
                        className="border-b border-stone-100 last:border-0 dark:border-zinc-900"
                      >
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono text-[13px] text-stone-800 dark:text-zinc-100">
                            {toolName(t)}
                          </span>
                          {t.price_type && (
                            <span className={`ml-2 text-[11px] ${faint}`}>{t.price_type}</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 align-top text-xs ${muted}`}>{t.category ?? "—"}</td>
                        <td className="px-3 py-2 text-right align-top tabular-nums">
                          {isFree(t) ? (
                            <span className="text-emerald-600 dark:text-emerald-400">free</span>
                          ) : price(t) != null ? (
                            <span>{price(t)!.toLocaleString()} sats</span>
                          ) : (
                            <span className={faint}>unpriced</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Page>
  );
}
