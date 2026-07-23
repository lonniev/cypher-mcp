// Issues register — peer of Capabilities. A filterable grid of issue cards that
// open the issue dossier. Enter here, jump straight to a known GitHub issue/PR,
// or cross over to the Concordance's elastic search.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asStrList, listIssues, type IssueSummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { toMillis, relTime } from "../../lib/time";
import { Page, MeteredBar, Empty, MeteredError, SinceFilter, LoadPanel, faint, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import { parseIssueRef, ResolvedPill, WorkingPulse } from "./dossier";
import { GhStatusDot } from "./GhStatusDot";

type Col = "recent" | "number" | "repo" | "disposition";
const SORTS: { col: Col; label: string }[] = [
  { col: "recent", label: "Recent" },
  { col: "number", label: "Number" },
  { col: "repo", label: "Service" },
  { col: "disposition", label: "Status" },
];

function resolved(disposition?: string): boolean {
  return /resolv|merg|fixed|closed|done|shipped/i.test(disposition ?? "");
}

export default function Issues() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("recent");
  const [dir, setDir] = useState<SortDir>("desc");
  // Server-side time window: each window is its own cached read; no auto-fetch.
  const [since, setSince] = useState(0);
  const m = useMetered<IssueSummary[]>(
    `issues:list:since=${since}`,
    () => listIssues({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0 }),
    { autoFetch: false },
  );

  const rows = (m.data ?? []).map((i) => ({ ...i, capabilities: asStrList(i.capabilities) }));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((i) => {
      if (!needle) return true;
      return (
        String(i.number ?? "").includes(needle) ||
        (i.title ?? "").toLowerCase().includes(needle) ||
        (i.actionable_text ?? "").toLowerCase().includes(needle) ||
        (i.repo_name ?? "").toLowerCase().includes(needle) ||
        (i.classification ?? "").toLowerCase().includes(needle) ||
        i.capabilities!.some((c) => c.toLowerCase().includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "number") return sign * ((a.number ?? 0) - (b.number ?? 0));
      if (sortCol === "repo") return sign * (a.repo_name ?? "").localeCompare(b.repo_name ?? "");
      if (sortCol === "disposition") return sign * (a.disposition ?? "").localeCompare(b.disposition ?? "");
      return sign * ((toMillis(a.updated_at) ?? 0) - (toMillis(b.updated_at) ?? 0));
    });
    return out;
  }, [rows, q, sortCol, dir]);

  // The one search field doubles as a jump: type to filter the loaded list, or
  // paste a GitHub URL / `repo#123` and press Enter to open that dossier directly
  // (even one not in the list). Replaces the old separate IssueJump box.
  const jumpRef = parseIssueRef(q);

  return (
    <Page eyebrow="Register" title="Issues" lede="Every issue the Service Desk has triaged. Filter here, open a known issue directly, or run elastic search in the Concordance.">
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
              <Icon name="history" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by number, title, service, capability — or paste a GitHub URL / repo#123 to open it"
                spellCheck={false}
                className={`w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 ${jumpRef ? "pr-40" : "pr-3"}`}
              />
              {jumpRef && (
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-mono text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                >
                  Open {jumpRef.repo}#{jumpRef.number} <Icon name="open" size={12} />
                </button>
              )}
            </form>
            <Link
              to="/concordance"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300"
            >
              <Icon name="swap" size={16} /> Elastic search
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${faint}`}>{m.data ? `${filtered.length} of ${rows.length} issues` : "not loaded"}</span>
              <SinceFilter value={since} onChange={setSince} />
            </div>
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.col}
                  onClick={() => (sortCol === s.col ? setDir((d) => (d === "asc" ? "desc" : "asc")) : (setSortCol(s.col), setDir(s.col === "recent" || s.col === "number" ? "desc" : "asc")))}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${sortCol === s.col ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  {s.label}
                  {sortCol === s.col && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          </div>

          {m.loading ? (
            <QuoteScroller heading="Reading the issue catalog…" className="py-12" />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} />
          ) : filtered.length === 0 ? (
            <Empty>No issues match this filter.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((i) => (
                <Link
                  key={`${i.repo_name}#${i.number}`}
                  to={`/issues/${encodeURIComponent(i.repo_name ?? "")}/${i.number}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="grid h-10 w-14 place-items-center rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/[0.12] font-mono text-[13px] font-bold text-amber-700 dark:text-amber-300">
                        #{i.number}
                      </div>
                      {/* Live GitHub open/closed status — green/purple/gray dot in the corner. */}
                      <GhStatusDot url={i.url} className="-right-1.5 -top-1.5" size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">
                          {i.title?.trim() || i.actionable_text?.trim() || `Issue #${i.number}`}
                        </h3>
                        <Icon name="open" size={15} className="mt-0.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-stone-500 dark:text-zinc-400">
                        <Icon name="github" size={13} /> {i.repo_name}
                      </div>
                    </div>
                  </div>
                  {/* Secondary summary — the Porter's triage spec, when the card's headline is the GitHub title. */}
                  {i.title?.trim() && i.actionable_text?.trim() && (
                    <div className={`line-clamp-2 text-[12.5px] leading-snug ${muted}`}>{i.actionable_text}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <WorkingPulse a={i} />
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
                  {toMillis(i.updated_at) != null && (
                    <div className={`mt-auto flex items-center gap-1 pt-0.5 text-[10.5px] ${faint}`}>
                      <Icon name="history" size={11} /> triaged {relTime(toMillis(i.updated_at))}
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
