// Issues register — peer of Capabilities. A filterable grid of issue cards that
// open the issue dossier. Enter here, jump straight to a known GitHub issue/PR,
// or cross over to the Concordance's elastic search.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asStrList, listIssues, type IssueSummary } from "../../lib/mcp";
import type { SortDir } from "@tollbooth-dpyc/web";
import { useMetered } from "../../lib/graphCache";
import { toMillis, relTime } from "../../lib/time";
import { Page, MeteredBar, Empty, MeteredError, SinceFilter, LoadPanel, faint, muted } from "./ui";
import { Icon } from "./icons";
import { QuoteScroller } from "@tollbooth-dpyc/web/react";
import { quotes } from "../../lib/quotes";
import { quoteStyles } from "../../lib/quoteStyles";
import { parseIssueRef, ResolvedPill, WorkingPulse } from "./dossier";
import { IssueStatusGlyph, IssueStatusPill } from "./IssueStatusGlyph";
import { useT, type Translate } from "../../i18n";

type Col = "recent" | "number" | "repo" | "disposition";
const sorts = (t: Translate): { col: Col; label: string }[] => [
  { col: "recent", label: t("notebook.sort.recent") },
  { col: "number", label: t("notebook.sort.number") },
  { col: "repo", label: t("notebook.sort.service") },
  { col: "disposition", label: t("notebook.sort.status") },
];

export default function Issues() {
  const t = useT();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<Col>("recent");
  const [dir, setDir] = useState<SortDir>("desc");
  // Server-side time window: each window is its own cached read; no auto-fetch.
  const [since, setSince] = useState(0);
  const m = useMetered<IssueSummary[]>(
    `issues:list:since=${since}`,
    () => listIssues({ sinceMs: since > 0 ? Date.now() - since * 86_400_000 : 0 }),
    { autoFetch: false, refetchOnKeyChange: true },
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
    <Page eyebrow={t("notebook.register")} title={t("notebook.contents.issues.title")} lede={t("notebook.issues.lede")}>
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
                placeholder={t("notebook.issues.filter")}
                spellCheck={false}
                className={`w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 ${jumpRef ? "pr-40" : "pr-3"}`}
              />
              {jumpRef && (
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-mono text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                >
                  {t("notebook.openRef", { ref: `${jumpRef.repo}#${jumpRef.number}` })} <Icon name="open" size={12} />
                </button>
              )}
            </form>
            <Link
              to="/notebook/concordance"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-300"
            >
              <Icon name="swap" size={16} /> {t("notebook.caps.elastic")}
            </Link>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${faint}`}>{m.data ? t("notebook.issues.shown", { shown: filtered.length, count: rows.length }) : t("notebook.notLoaded")}</span>
              <SinceFilter value={since} onChange={setSince} />
            </div>
            <div className="flex items-center gap-1">
              {sorts(t).map((s) => (
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
            <QuoteScroller quotes={quotes()} spinner heading={t("notebook.issues.reading")} classNames={quoteStyles} />
          ) : !m.data ? (
            <LoadPanel onLoad={m.refresh} />
          ) : filtered.length === 0 ? (
            <Empty>{t("notebook.issues.none")}</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((i) => (
                <Link
                  key={`${i.repo_name}#${i.number}`}
                  to={`/notebook/issues/${encodeURIComponent(i.repo_name ?? "")}/${i.number}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="grid h-10 w-14 place-items-center rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/[0.12] font-mono text-[13px] font-bold text-amber-700 dark:text-amber-300">
                        #{i.number}
                      </div>
                      {/* Fused live-GitHub + disposition status glyph in the corner. */}
                      <IssueStatusGlyph url={i.url} disposition={i.disposition} className="-right-2 -top-2" size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">
                          {i.title?.trim() || i.actionable_text?.trim() || t("notebook.issues.numbered", { number: i.number ?? "" })}
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
                    {i.disposition && <IssueStatusPill url={i.url} disposition={i.disposition} />}
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
                      <Icon name="history" size={11} /> {t("notebook.issues.triaged", { when: relTime(toMillis(i.updated_at)) })}
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
