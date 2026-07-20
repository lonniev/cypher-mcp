// Issues register — peer of Capabilities. A filterable grid of issue cards that
// open the issue dossier. Enter here, jump straight to a known GitHub issue/PR,
// or cross over to the Concordance's elastic search.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { asStrList, listIssues, type IssueSummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { Page, MeteredBar, Empty, MeteredError, faint, muted } from "./ui";
import { Icon } from "./icons";
import { IssueJump, ResolvedPill } from "./dossier";

type Col = "number" | "repo" | "disposition";
const SORTS: { col: Col; label: string }[] = [
  { col: "number", label: "Number" },
  { col: "repo", label: "Service" },
  { col: "disposition", label: "Status" },
];

function resolved(disposition?: string): boolean {
  return /resolv|merg|fixed|closed|done|shipped/i.test(disposition ?? "");
}

export default function Issues() {
  const m = useMetered<IssueSummary[]>("issues:list", "list_issues", listIssues);
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("number");
  const [dir, setDir] = useState<SortDir>("desc");

  const rows = (m.data ?? []).map((i) => ({ ...i, capabilities: asStrList(i.capabilities) }));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((i) => {
      if (!needle) return true;
      return (
        String(i.number ?? "").includes(needle) ||
        (i.title ?? "").toLowerCase().includes(needle) ||
        (i.repo_name ?? "").toLowerCase().includes(needle) ||
        (i.classification ?? "").toLowerCase().includes(needle) ||
        i.capabilities!.some((c) => c.toLowerCase().includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "number") return sign * ((a.number ?? 0) - (b.number ?? 0));
      if (sortCol === "repo") return sign * (a.repo_name ?? "").localeCompare(b.repo_name ?? "");
      return sign * (a.disposition ?? "").localeCompare(b.disposition ?? "");
    });
    return out;
  }, [rows, q, sortCol, dir]);

  return (
    <Page eyebrow="Register" title="Issues" lede="Every issue the Service Desk has triaged. Filter here, open a known issue directly, or run elastic search in the Concordance.">
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          <div className="mb-5 grid gap-3">
            <div className="relative">
              <Icon name="history" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter issues by number, title, service, or capability…"
                className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <IssueJump compact />
              <Link
                to="/concordance"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300"
              >
                <Icon name="swap" size={16} /> Elastic search
              </Link>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={`text-xs ${faint}`}>{filtered.length} of {rows.length} issues</span>
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.col}
                  onClick={() => (sortCol === s.col ? setDir((d) => (d === "asc" ? "desc" : "asc")) : (setSortCol(s.col), setDir(s.col === "number" ? "desc" : "asc")))}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${sortCol === s.col ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  {s.label}
                  {sortCol === s.col && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          </div>

          {m.cold && m.loading ? (
            <Empty>Reading the issue catalog…</Empty>
          ) : filtered.length === 0 ? (
            <Empty>{rows.length === 0 ? "No issues recorded yet." : "No issues match that filter."}</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((i) => (
                <Link
                  key={`${i.repo_name}#${i.number}`}
                  to={`/issues/${encodeURIComponent(i.repo_name ?? "")}/${i.number}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-14 shrink-0 place-items-center rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/[0.12] font-mono text-[13px] font-bold text-amber-700 dark:text-amber-300">
                      #{i.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">{i.title ?? `Issue #${i.number}`}</h3>
                        <Icon name="open" size={15} className="mt-0.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-stone-500 dark:text-zinc-400">
                        <Icon name="github" size={13} /> {i.repo_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {i.classification && <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">{i.classification}</span>}
                    {i.disposition && (
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] ${resolved(i.disposition) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                        <Icon name={resolved(i.disposition) ? "check" : "history"} size={11} /> {i.disposition}
                      </span>
                    )}
                    {i.resolved_via && <ResolvedPill mode={i.resolved_via} />}
                  </div>
                  {i.capabilities!.length > 0 && (
                    <div className={`text-xs ${muted}`}>
                      <Icon name="verified" size={12} className="mr-1 text-stone-400 dark:text-zinc-500" />
                      {i.capabilities!.join(" · ")}
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
