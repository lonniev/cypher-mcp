// Capabilities register — the notebook's central index. The full compact
// catalog (list_capabilities), filterable by name/keyword and sortable, with a
// keyword tag-index that doubles as a concordance filter. Each row links to the
// capability's detail leaf.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCapabilities, type CapabilitySummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { SortHeader, TableShell } from "../PagedTable";
import { Page, MeteredBar, Empty, MeteredError, faint, muted } from "./ui";

type Col = "name" | "owners" | "keywords";

export default function Capabilities() {
  const m = useMetered<CapabilitySummary[]>("capabilities:list", "list_capabilities", listCapabilities);
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("name");
  const [dir, setDir] = useState<SortDir>("asc");

  // Guard against a malformed row (missing name): a nameless capability must
  // never throw during render — coerce every name to a string up front.
  const rows = (m.data ?? []).map((c) => ({ ...c, name: String(c.name ?? "") }));

  // Keyword index — every distinct keyword, most-used first (a concordance head).
  const keywordIndex = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of rows) for (const k of c.keywords ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((c) => {
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.keywords ?? []).some((k) => k.toLowerCase().includes(needle)) ||
        (c.owners ?? []).some((o) => o.toLowerCase().includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "name") return sign * a.name.localeCompare(b.name);
      if (sortCol === "owners") return sign * ((a.owners?.length ?? 0) - (b.owners?.length ?? 0));
      return sign * ((a.keywords?.length ?? 0) - (b.keywords?.length ?? 0));
    });
    return out;
  }, [rows, q, sortCol, dir]);

  function onSort(col: string, d: SortDir) {
    setSortCol(col as Col);
    setDir(d);
  }

  return (
    <Page
      eyebrow="Register I"
      title="Capabilities"
      lede="Every ability the fleet owns, with its owners, its keywords, and — on each leaf — its rationale, realizing symbols, and patent grounding."
    >
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} />

      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, keyword, or owning service…"
            className="mb-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />

          {keywordIndex.length > 0 && (
            <div className="mb-5">
              <div className={`mb-1.5 text-[11px] uppercase tracking-widest ${faint}`}>Keyword index</div>
              <div className="flex flex-wrap gap-1.5">
                {keywordIndex.slice(0, 40).map(([k, n]) => (
                  <button
                    key={k}
                    onClick={() => setQ((cur) => (cur === k ? "" : k))}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      q === k
                        ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-stone-200 text-stone-500 hover:border-amber-300 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {k} <span className={faint}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {m.cold && m.loading ? (
            <Empty>Reading the capability catalog…</Empty>
          ) : filtered.length === 0 ? (
            <Empty>{rows.length === 0 ? "No capabilities recorded yet." : "No entries match that filter."}</Empty>
          ) : (
            <>
              <div className={`mb-2 text-xs ${faint}`}>
                {filtered.length} of {rows.length} capabilities
              </div>
              <TableShell>
                <thead>
                  <tr className="border-b border-stone-200 dark:border-zinc-800">
                    <SortHeader label="Capability" col="name" activeCol={sortCol} dir={dir} onSort={onSort} />
                    <SortHeader label="Owners" col="owners" activeCol={sortCol} dir={dir} onSort={onSort} />
                    <SortHeader label="Keywords" col="keywords" activeCol={sortCol} dir={dir} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.name}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50 dark:border-zinc-900 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-3 py-2.5 align-top">
                        <Link
                          to={`/capabilities/${encodeURIComponent(c.name)}`}
                          className="font-serif text-[15px] font-medium text-stone-900 hover:text-amber-700 dark:text-zinc-50 dark:hover:text-amber-300"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(c.owners ?? []).length === 0 ? (
                            <span className={faint}>—</span>
                          ) : (
                            (c.owners ?? []).map((o) => (
                              <Link
                                key={o}
                                to={`/services/${encodeURIComponent(o)}`}
                                className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-amber-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-amber-300"
                              >
                                {o}
                              </Link>
                            ))
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 align-top text-xs ${muted}`}>
                        {(c.keywords ?? []).join(" · ") || <span className={faint}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </>
          )}
        </>
      )}

      <p className={`mt-6 text-xs ${faint}`}>
        Owning services deep-link to their symbol concordance; each capability opens to its
        rationale, realizing symbols, and patent grounding.
      </p>
    </Page>
  );
}
