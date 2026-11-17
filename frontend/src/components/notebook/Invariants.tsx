// Invariants register — the fleet's enforceable business-logic rules (human-authored
// doctrine). A filterable grid of invariant cards, peer of the Issues and Capabilities
// registers; each opens that invariant's dossier. Same grammar as Issues.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listInvariants, type InvariantSummary } from "../../lib/mcp";
import type { SortDir } from "@tollbooth-dpyc/web";
import { useMetered } from "../../lib/graphCache";
import { toMillis, relTime } from "../../lib/time";
import { Page, MeteredBar, Empty, MeteredError, SinceFilter, LoadPanel, faint, muted } from "./ui";
import { Icon } from "./icons";
import { QuoteScroller } from "@tollbooth-dpyc/web/react";
import { quotes } from "../../lib/quotes";
import { quoteStyles } from "../../lib/quoteStyles";
import { parseIssueRef, initialsOf } from "./dossier";
import { useT, type Translate } from "../../i18n";

type Col = "name" | "symbols" | "recent";
const sorts = (t: Translate): { col: Col; label: string }[] => [
  { col: "recent", label: t("notebook.sort.recent") },
  { col: "name", label: t("notebook.sort.az") },
  { col: "symbols", label: t("notebook.sort.guards") },
];

export default function Invariants() {
  const t = useT();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [since, setSince] = useState(0);
  const m = useMetered<InvariantSummary[]>(
    `invariants:list:since=${since}`,
    () => listInvariants({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0 }),
    { autoFetch: false, refetchOnKeyChange: true },
  );

  const rows = m.data ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((v) => {
      if (!needle) return true;
      return (
        (v.name ?? "").toLowerCase().includes(needle) ||
        (v.rule ?? "").toLowerCase().includes(needle) ||
        (v.patents ?? []).some((p) => String(p).includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "symbols") return sign * ((a.symbol_count ?? 0) - (b.symbol_count ?? 0));
      if (sortCol === "recent") return sign * ((toMillis(a.updated_at) ?? 0) - (toMillis(b.updated_at) ?? 0));
      return sign * (a.name ?? "").localeCompare(b.name ?? "");
    });
    return out;
  }, [rows, q, sortCol, dir]);

  const jumpRef = parseIssueRef(q);

  return (
    <Page eyebrow={t("notebook.register")} title={t("notebook.contents.invariants.title")} lede={t("notebook.invs.lede")}>
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
              <Icon name="verified" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("notebook.invs.filter")}
                spellCheck={false}
                className={`w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 ${jumpRef ? "pr-40" : "pr-3"}`}
              />
              {jumpRef && (
                <button type="submit" className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-mono text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25">
                  {t("notebook.openRef", { ref: `${jumpRef.repo}#${jumpRef.number}` })} <Icon name="open" size={12} />
                </button>
              )}
            </form>
            <Link to="/notebook/concordance" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300">
              <Icon name="swap" size={16} /> {t("notebook.caps.elastic")}
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${faint}`}>{m.data ? t("notebook.invs.shown", { shown: filtered.length, count: rows.length }) : t("notebook.notLoaded")}</span>
              <SinceFilter value={since} onChange={setSince} />
            </div>
            <div className="flex items-center gap-1">
              {sorts(t).map((s) => (
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

          {m.loading ? (
            <QuoteScroller quotes={quotes()} spinner heading={t("notebook.invs.reading")} classNames={quoteStyles} />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} />
          ) : filtered.length === 0 ? (
            <Empty>{t("notebook.invs.none")}</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((v) => (
                <Link
                  key={v.name}
                  to={`/notebook/invariants/${encodeURIComponent(v.name)}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/[0.12] font-serif text-sm font-bold text-amber-700 dark:text-amber-300">
                      {initialsOf(v.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">{v.name}</h3>
                        <Icon name="open" size={15} className="mt-0.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      {v.provenance === "human-authored" && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                          <Icon name="verified" size={11} /> {t("notebook.doctrine")}
                        </span>
                      )}
                    </div>
                  </div>
                  {v.rule && <div className={`line-clamp-2 text-[12.5px] leading-snug ${muted}`}>{v.rule}</div>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <Icon name="symbol" size={11} /> {t("notebook.invs.guarded", { count: v.symbol_count ?? 0 })}
                    </span>
                    {(v.patents ?? []).map((p) => (
                      <Link
                        key={p}
                        to={`/notebook/patent/${p}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10.5px] text-blue-700 hover:underline dark:text-blue-300"
                      >
                        <Icon name="bookmark" size={11} /> [{p}]
                      </Link>
                    ))}
                  </div>
                  {toMillis(v.updated_at) != null && (
                    <div className={`mt-auto flex items-center gap-1 pt-0.5 text-[10.5px] ${faint}`}>
                      <Icon name="history" size={11} /> {t("notebook.invs.authored", { when: relTime(toMillis(v.updated_at)) })}
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
