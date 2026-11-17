// Query Catalog — the apparatus. The operator's pricing model lists every
// registered and published dynamic tool with its price. This is a FREE read
// (get_pricing_model), so it refreshes at no cost — the notebook's index of the
// machinery that answers everything else.

import { useEffect, useMemo, useState } from "react";
import { getPricingModel, type ToolPrice } from "@tollbooth-dpyc/web";
import { RefreshButton, useLanguageLocale } from "@tollbooth-dpyc/web/react";
import { useT } from "../../i18n";
import { Page, SectionLabel, Empty, ErrorNote, faint, muted, refreshClass } from "./ui";

function toolName(t: ToolPrice): string {
  return t.tool_name || t.tool_id || "—";
}
function price(t: ToolPrice): number | null {
  if (typeof t.price_sats === "number") return t.price_sats;
  return null;
}
function isFree(t: ToolPrice): boolean {
  return t.category === "free" || (!t.priced && (t.price_sats ?? 0) === 0);
}

export default function QueryCatalog() {
  const t = useT();
  const locale = useLanguageLocale();
  const [tools, setTools] = useState<ToolPrice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await getPricingModel();
      setTools(r.tools ?? []);
      if (!r.tools) setError(r.error ?? t("notebook.catalog.noList"));
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
      .filter((tool) => (needle ? toolName(tool).toLowerCase().includes(needle) || (tool.category ?? "").includes(needle) : true))
      .sort((a, b) => toolName(a).localeCompare(toolName(b)));
  }, [rows, q]);

  const pricedCount = rows.filter((tool) => !isFree(tool)).length;

  return (
    <Page
      eyebrow={t("notebook.catalog.eyebrow")}
      title={t("notebook.contents.catalog.title")}
      lede={t("notebook.catalog.lede")}
      actions={
        <RefreshButton
          onRefresh={load}
          busy={loading}
          label={t("notebook.catalog.refresh")}
          iconSize={14}
          classNames={{ root: refreshClass }}
        />
      }
    >
      {error && <ErrorNote>{error}</ErrorNote>}

      {!error && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("notebook.catalog.filter")}
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className={`text-xs ${faint}`}>
              {t("notebook.catalog.count", { count: rows.length, priced: pricedCount })}
            </span>
          </div>

          {loading && !tools ? (
            <Empty>{t("notebook.catalog.reading")}</Empty>
          ) : filtered.length === 0 ? (
            <Empty>{t("notebook.catalog.none")}</Empty>
          ) : (
            <>
              <SectionLabel>{t("notebook.catalog.published")}</SectionLabel>
              <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:border-zinc-800 dark:text-zinc-500">
                      <th className="px-3 py-2">{t("notebook.catalog.tool")}</th>
                      <th className="px-3 py-2">{t("notebook.catalog.category")}</th>
                      <th className="px-3 py-2 text-right">{t("notebook.catalog.price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tool, i) => (
                      <tr
                        key={(tool.tool_id ?? toolName(tool)) + i}
                        className="border-b border-stone-100 last:border-0 dark:border-zinc-900"
                      >
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono text-[13px] text-stone-800 dark:text-zinc-100">
                            {toolName(tool)}
                          </span>
                          {tool.price_type && (
                            <span className={`ml-2 text-[11px] ${faint}`}>{tool.price_type}</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 align-top text-xs ${muted}`}>{tool.category ?? "—"}</td>
                        <td className="px-3 py-2 text-right align-top tabular-nums">
                          {isFree(tool) ? (
                            <span className="text-emerald-600 dark:text-emerald-400">{t("notebook.catalog.free")}</span>
                          ) : price(tool) != null ? (
                            <span>{t("notebook.catalog.sats", { count: price(tool)!, n: price(tool)!.toLocaleString(locale) })}</span>
                          ) : (
                            <span className={faint}>{t("notebook.catalog.unpriced")}</span>
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
