// Capabilities register — the index into the dossiers. Not a table: a grid of
// capability cards you filter live (or jump past via the Concordance for full
// elastic search, or straight to a known GitHub issue/PR). Each card opens that
// capability's dossier.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { asStrList, listCapabilities, type CapabilitySummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { Page, MeteredBar, Empty, MeteredError, faint, muted } from "./ui";
import { Icon } from "./icons";
import { IssueJump, initialsOf } from "./dossier";

type Col = "name" | "owners" | "keywords";

const SORTS: { col: Col; label: string }[] = [
  { col: "name", label: "A–Z" },
  { col: "owners", label: "Owners" },
  { col: "keywords", label: "Keywords" },
];

export default function Capabilities() {
  const m = useMetered<CapabilitySummary[]>("capabilities:list", "list_capabilities", listCapabilities);
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("name");
  const [dir, setDir] = useState<SortDir>("asc");

  // Coerce at the render boundary — stale caches / drift can't crash .join.
  const rows = (m.data ?? []).map((c) => ({
    ...c,
    name: String(c.name ?? ""),
    keywords: asStrList(c.keywords),
    owners: asStrList(c.owners),
  }));

  const keywordIndex = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of rows) for (const k of c.keywords) counts.set(k, (counts.get(k) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((c) => {
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.keywords.some((k) => k.toLowerCase().includes(needle)) ||
        c.owners.some((o) => o.toLowerCase().includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "name") return sign * a.name.localeCompare(b.name);
      if (sortCol === "owners") return sign * (a.owners.length - b.owners.length);
      return sign * (a.keywords.length - b.keywords.length);
    });
    return out;
  }, [rows, q, sortCol, dir]);

  return (
    <Page eyebrow="Register" title="Capabilities" lede="The fleet's abilities. Filter here, run full elastic search in the Concordance, or open a known issue directly.">
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          {/* Three ways in */}
          <div className="mb-5 grid gap-3">
            <div className="relative">
              <Icon name="symbol" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter capabilities by name, keyword, or service…"
                className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <IssueJump compact />
              <Link
                to="/concordance"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300"
              >
                <Icon name="swap" className="text-[15px]" /> Elastic search
              </Link>
            </div>
          </div>

          {keywordIndex.length > 0 && (
            <div className="mb-5">
              <div className={`mb-1.5 text-[11px] uppercase tracking-widest ${faint}`}>Keyword index</div>
              <div className="flex flex-wrap gap-1.5">
                {keywordIndex.slice(0, 40).map(([k, n]) => (
                  <button
                    key={k}
                    onClick={() => setQ((cur) => (cur === k ? "" : k))}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      q === k
                        ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-stone-200 text-stone-500 hover:border-amber-300 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    <Icon name="tag" className="text-[10px] opacity-70" /> {k} <span className={faint}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Count + sort */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={`text-xs ${faint}`}>{filtered.length} of {rows.length} capabilities</span>
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.col}
                  onClick={() => (sortCol === s.col ? setDir((d) => (d === "asc" ? "desc" : "asc")) : (setSortCol(s.col), setDir(s.col === "name" ? "asc" : "desc")))}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${sortCol === s.col ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  {s.label}
                  {sortCol === s.col && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          </div>

          {m.cold && m.loading ? (
            <Empty>Reading the capability catalog…</Empty>
          ) : filtered.length === 0 ? (
            <Empty>{rows.length === 0 ? "No capabilities recorded yet." : "No entries match that filter."}</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((c) => (
                <Link
                  key={c.name}
                  to={`/capabilities/${encodeURIComponent(c.name)}`}
                  className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/[0.12] font-serif text-sm font-bold text-amber-700 dark:text-amber-300">
                      {initialsOf(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-serif text-[15px] font-semibold text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">{c.name}</h3>
                        <Icon name="open" className="shrink-0 text-[14px] text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      {c.owners.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.owners.slice(0, 3).map((o) => (
                            <span key={o} className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <Icon name="github" className="text-[11px]" /> {o}
                            </span>
                          ))}
                          {c.owners.length > 3 && <span className={`text-[10.5px] ${faint}`}>+{c.owners.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {c.keywords.length > 0 && (
                    <div className={`line-clamp-2 text-xs ${muted}`}>{c.keywords.join(" · ")}</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
