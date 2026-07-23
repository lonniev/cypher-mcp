// Patent Topics register — the filed provisional's reference numerals (the
// "patentable topics"), each grounding the capabilities and invariants traced to
// it. A filterable grid, peer of the Issues/Capabilities registers; each card
// opens that element's dossier at /patent/:ref.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listPatentElements, type PatentElementSummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { toMillis, relTime } from "../../lib/time";
import { Page, MeteredBar, Empty, MeteredError, SinceFilter, LoadPanel, faint, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import { parseIssueRef } from "./dossier";

type Col = "ref" | "family" | "grounds" | "recent";
const SORTS: { col: Col; label: string }[] = [
  { col: "ref", label: "Numeral" },
  { col: "recent", label: "Recent" },
  { col: "family", label: "Family" },
  { col: "grounds", label: "Grounds" },
];

export default function PatentElements() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("ref");
  const [dir, setDir] = useState<SortDir>("asc");
  const [since, setSince] = useState(0);
  const m = useMetered<PatentElementSummary[]>(
    `patents:list:since=${since}`,
    () => listPatentElements({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0 }),
    { autoFetch: false, refetchOnKeyChange: true },
  );

  const rows = m.data ?? [];

  const grounds = (p: PatentElementSummary) => (p.capability_count ?? 0) + (p.invariant_count ?? 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((p) => {
      if (!needle) return true;
      return (
        String(p.ref ?? "").includes(needle) ||
        (p.name ?? "").toLowerCase().includes(needle) ||
        (p.claim_family ?? "").toLowerCase().includes(needle) ||
        (p.figures ?? "").toLowerCase().includes(needle)
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "family") return sign * (a.claim_family ?? "").localeCompare(b.claim_family ?? "");
      if (sortCol === "grounds") return sign * (grounds(a) - grounds(b));
      if (sortCol === "recent") return sign * ((toMillis(a.updated_at) ?? 0) - (toMillis(b.updated_at) ?? 0));
      return sign * ((a.ref ?? 0) - (b.ref ?? 0));
    });
    return out;
  }, [rows, q, sortCol, dir]);

  const jumpRef = parseIssueRef(q);

  return (
    <Page eyebrow="Register" title="Patent Topics" lede="The filed provisional's reference numerals (US Prov. 64/045,999) — the patentable topics. Each grounds the capabilities and invariants traced to it; open one to see what it describes.">
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (jumpRef) nav(`/issues/${encodeURIComponent(jumpRef.repo)}/${jumpRef.number}`);
              }}
              className="relative"
            >
              <Icon name="bookmark" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by numeral, element name, or claim family — or paste a GitHub URL / repo#123 to open it"
                spellCheck={false}
                className={`w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 ${jumpRef ? "pr-40" : "pr-3"}`}
              />
              {jumpRef && (
                <button type="submit" className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-mono text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25">
                  Open {jumpRef.repo}#{jumpRef.number} <Icon name="open" size={12} />
                </button>
              )}
            </form>
            <Link to="/concordance" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300">
              <Icon name="swap" size={16} /> Elastic search
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${faint}`}>{m.data ? `${filtered.length} of ${rows.length} elements` : "not loaded"}</span>
              <SinceFilter value={since} onChange={setSince} />
            </div>
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.col}
                  onClick={() => (sortCol === s.col ? setDir((d) => (d === "asc" ? "desc" : "asc")) : (setSortCol(s.col), setDir(s.col === "ref" || s.col === "family" ? "asc" : "desc")))}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${sortCol === s.col ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  {s.label}
                  {sortCol === s.col && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          </div>

          {m.loading ? (
            <QuoteScroller heading="Reading the patent schedule…" className="py-12" />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} />
          ) : filtered.length === 0 ? (
            <Empty>No patent elements match this filter.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((p) => (
                <Link
                  key={p.ref}
                  to={`/patent/${p.ref}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg border-[1.5px] border-blue-500/40 bg-blue-500/[0.12] font-mono text-[13px] font-bold text-blue-700 dark:text-blue-300">
                      {p.ref}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">{p.name || `Element ${p.ref}`}</h3>
                        <Icon name="open" size={15} className="mt-0.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      {p.claim_family && <div className={`mt-1 text-[11px] ${muted}`}>{p.claim_family}</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.figures && (
                      <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Icon name="bookmark" size={11} /> fig {p.figures}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10.5px] text-amber-700 dark:text-amber-300">
                      <Icon name="verified" size={11} /> {p.capability_count ?? 0} cap
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10.5px] text-emerald-700 dark:text-emerald-300">
                      <Icon name="verified" size={11} /> {p.invariant_count ?? 0} inv
                    </span>
                  </div>
                  {toMillis(p.updated_at) != null && (
                    <div className={`mt-auto flex items-center gap-1 pt-0.5 text-[10.5px] ${faint}`}>
                      <Icon name="history" size={11} /> updated {relTime(toMillis(p.updated_at))}
                    </div>
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
