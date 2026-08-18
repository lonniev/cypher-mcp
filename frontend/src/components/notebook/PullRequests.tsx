// Pull Requests register — peer of Issues. A filterable grid of the changes in
// flight, each showing the intention it enforces. This is the "think about
// upcoming changes" board: a PR is the enactment that closes the loop — it fixes
// an issue and, through it, enforces a capability. Live GitHub state (open / draft
// / merged / closed) is overlaid on the graph's mirror so the board is current.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asStrList, listPullRequests, type PullRequestSummary, type SortDir } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { toMillis, relTime } from "../../lib/time";
import { Page, MeteredBar, Empty, MeteredError, SinceFilter, LoadPanel, faint, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import { parseIssueRef } from "./dossier";
import { PrStatusDot, PrStatusPill } from "./PrStatus";

type Col = "recent" | "number" | "repo" | "state";
const SORTS: { col: Col; label: string }[] = [
  { col: "recent", label: "Recent" },
  { col: "number", label: "Number" },
  { col: "repo", label: "Service" },
  { col: "state", label: "State" },
];

export default function PullRequests() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("recent");
  const [dir, setDir] = useState<SortDir>("desc");
  const [since, setSince] = useState(0);
  const m = useMetered<PullRequestSummary[]>(
    `pulls:list:since=${since}`,
    () => listPullRequests({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0 }),
    { autoFetch: false, refetchOnKeyChange: true },
  );

  const rows = (m.data ?? []).map((p) => ({ ...p, capabilities: asStrList(p.capabilities) }));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((p) => {
      if (!needle) return true;
      return (
        String(p.number ?? "").includes(needle) ||
        (p.title ?? "").toLowerCase().includes(needle) ||
        (p.author ?? "").toLowerCase().includes(needle) ||
        (p.head_ref ?? "").toLowerCase().includes(needle) ||
        (p.repo_name ?? "").toLowerCase().includes(needle) ||
        (p.state ?? "").toLowerCase().includes(needle) ||
        p.capabilities!.some((c) => c.toLowerCase().includes(needle))
      );
    });
    const sign = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortCol === "number") return sign * ((a.number ?? 0) - (b.number ?? 0));
      if (sortCol === "repo") return sign * (a.repo_name ?? "").localeCompare(b.repo_name ?? "");
      if (sortCol === "state") return sign * (a.state ?? "").localeCompare(b.state ?? "");
      return sign * ((toMillis(a.updated_at) ?? 0) - (toMillis(b.updated_at) ?? 0));
    });
    return out;
  }, [rows, q, sortCol, dir]);

  // The search field doubles as a jump: paste a GitHub PR URL / `repo#123` and
  // press Enter to open that dossier directly, even one not in the list.
  const jumpRef = parseIssueRef(q);

  return (
    <Page eyebrow="Register" title="Pull Requests" lede="Every change in flight and the intention it enforces — open, draft, or merged. A PR fixes an issue and, through it, enforces a capability. Open one to see the whole trace.">
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}

      {!m.error && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (jumpRef) nav(`/notebook/pulls/${encodeURIComponent(jumpRef.repo)}/${jumpRef.number}`);
              }}
              className="relative"
            >
              <Icon name="pullrequest" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by number, title, service, author, capability — or paste a GitHub PR URL / repo#123 to open it"
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
              to="/notebook/issues"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300"
            >
              <Icon name="history" size={16} /> Issues
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${faint}`}>{m.data ? `${filtered.length} of ${rows.length} pull requests` : "not loaded"}</span>
              <SinceFilter value={since} onChange={setSince} />
            </div>
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.col}
                  onClick={() => (sortCol === s.col ? setDir((dd) => (dd === "asc" ? "desc" : "asc")) : (setSortCol(s.col), setDir(s.col === "recent" || s.col === "number" ? "desc" : "asc")))}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${sortCol === s.col ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  {s.label}
                  {sortCol === s.col && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          </div>

          {m.loading ? (
            <QuoteScroller heading="Reading the pull-request catalog…" className="py-12" />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} />
          ) : filtered.length === 0 ? (
            <Empty>No pull requests match this filter.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((p) => (
                <Link
                  key={`${p.repo_name}#${p.number}`}
                  to={`/notebook/pulls/${encodeURIComponent(p.repo_name ?? "")}/${p.number}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="grid h-10 w-14 place-items-center rounded-lg border-[1.5px] border-indigo-500/40 bg-indigo-500/[0.12] font-mono text-[13px] font-bold text-indigo-700 dark:text-indigo-300">
                        #{p.number}
                      </div>
                      {/* Live GitHub status dot in the corner. */}
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 dark:bg-zinc-900">
                        <PrStatusDot url={p.url} size={11} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">
                          {p.title?.trim() || `Pull request #${p.number}`}
                        </h3>
                        <Icon name="open" size={15} className="mt-0.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-stone-500 dark:text-zinc-400">
                        <Icon name="github" size={13} /> {p.repo_name}
                        {p.author && <span className="text-stone-400 dark:text-zinc-500">· @{p.author}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PrStatusPill url={p.url} />
                    {p.draft && <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">draft</span>}
                    {p.head_ref && (
                      <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Icon name="swap" size={10} /> {p.head_ref}
                      </span>
                    )}
                    {(p.fixes_issues?.length ?? 0) > 0 && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                        fixes {p.fixes_issues!.map((n) => `#${n}`).join(" ")}
                      </span>
                    )}
                  </div>
                  {p.capabilities!.length > 0 && (
                    <div className={`text-xs ${muted}`}>
                      <Icon name="verified" size={12} className="mr-1 text-stone-400 dark:text-zinc-500" />
                      enforces {p.capabilities!.join(" · ")}
                    </div>
                  )}
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
