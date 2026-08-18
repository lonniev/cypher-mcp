// Pull Request dossier — the case-file grammar with the PR at center. A PR is the
// enactment that closes the intention loop: the cells show the issue(s) it FIXES
// and, the thesis made visible, the Capabilities it ENFORCES (derived at read time
// via FIXES->Issue->ABOUT_CAPABILITY — never a stored edge). Live GitHub state
// (open / draft / merged / closed) is overlaid on the graph's mirror. One cached
// read: pr_provenance.

import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { prProvenance, type PullRequestProvenance, type PullRequestSummary } from "../../lib/mcp";
import { useMetered, readCache } from "../../lib/graphCache";
import { useSwipeNav } from "../../lib/useSwipeNav";
import { useLiveIssueStatus } from "../../lib/githubStatus";
import { PrStatusDot, PrStatusPill } from "./PrStatus";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import {
  DossierWrap,
  Dossier,
  DossierHead,
  Stamp,
  BoxScore,
  Stat,
  Cells,
  Cell,
  Eyebrow,
  Pager,
} from "./dossier";

export default function PullRequestDetail() {
  const { repo = "", number = "" } = useParams();
  const decodedRepo = decodeURIComponent(repo);
  const num = Number(number);
  const nav = useNavigate();

  // Swipe / arrow between PRs in the register's (cached) order.
  const siblings = useMemo(() => {
    const cached = readCache<PullRequestSummary[]>("pulls:list:since=0")?.data ?? [];
    return cached
      .filter((p) => p.repo_name && p.number != null)
      .map((p) => ({ repo: String(p.repo_name), number: Number(p.number) }));
  }, []);
  const idx = siblings.findIndex((s) => s.repo === decodedRepo && s.number === num);
  const toPr = (s: { repo: string; number: number }) => nav(`/notebook/pulls/${encodeURIComponent(s.repo)}/${s.number}`);
  const goPrev = idx > 0 ? () => toPr(siblings[idx - 1]) : undefined;
  const goNext = idx >= 0 && idx < siblings.length - 1 ? () => toPr(siblings[idx + 1]) : undefined;
  const swipe = useSwipeNav({ prev: goPrev, next: goNext });

  const m = useMetered<PullRequestProvenance>(
    `pr:${decodedRepo}#${num}`,
    () => prProvenance(decodedRepo, num),
  );

  const d = m.data;
  const live = useLiveIssueStatus(d?.url);
  const fixes = d?.fixes ?? [];
  const caps = d?.enforces_capabilities ?? [];
  // A non-existent PR yields an empty match — render "not found", not a hollow dossier.
  const found = !!(d && (d.number != null || d.title || d.url || d.state || fixes.length || caps.length));

  // The rubber stamp, from the live GitHub lifecycle (freshest), falling back to the
  // graph's mirrored state when GitHub can't be read.
  const stamp = (() => {
    const open = live ? live.state === "open" : d?.state === "open";
    const merged = live?.reason === "merged" || (!live && !!d?.merged_at);
    if (merged)
      return <Stamp tone="good" icon="delivered" label="Merged" sub="Pull request" tip="Merged — this change is enacted. The Enforces cell shows the intention it served." />;
    if (open)
      return <Stamp tone="warn" icon="pullrequest" label={d?.draft ? "Draft" : "Open"} sub="Pull request" tip={d?.draft ? "A draft — in progress, not yet up for review." : "Open — a change in flight. Watch it here before it lands."} />;
    return <Stamp tone="warn" ink="text-rose-700 border-rose-600/60 dark:text-rose-400" icon="close" label="Closed" sub="Not merged" tip="Closed without merging — the change was not enacted." />;
  })();

  return (
    <DossierWrap swipe={swipe}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/notebook/pulls" className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> Pull Requests
        </Link>
        <Pager index={idx} total={siblings.length} onPrev={goPrev} onNext={goNext} label="pull request" />
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller heading="Pulling the case file…" className="py-12" />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">No such pull request in the graph</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            <span className="font-mono text-stone-600 dark:text-zinc-300">{decodedRepo}#{num}</span> hasn't been mirrored into the intention graph. Check the number, or start from a real one on the{" "}
            <Link to="/notebook/pulls" className="text-amber-700 hover:underline dark:text-amber-300">Pull Requests register</Link>.
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab="Pull Request" tabNo={`Case file №${num}`}>
          <DossierHead
            crest={`#${num}`}
            crestBadge={
              <span className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 dark:bg-zinc-900">
                <PrStatusDot url={d.url} size={14} />
              </span>
            }
            role={
              <>
                <Link to={`/notebook/services/${encodeURIComponent(decodedRepo)}`} className="hover:text-amber-700 hover:underline dark:hover:text-amber-300">
                  {decodedRepo}
                </Link>
                {d.author ? ` · @${d.author}` : ""}
              </>
            }
            roleIcon="pullrequest"
            title={d.title ?? `Pull request #${num}`}
            tags={[d.head_ref, d.base_ref].filter(Boolean) as string[]}
            stamp={stamp}
          />

          <BoxScore>
            <Stat icon="verified" num={caps.length} label="Enforces" accent drill="pr-enforces" tip="The capabilities this PR enforces — the intention it enacts, traced through the issue it fixes." />
            <Stat icon="history" num={fixes.length} label="Fixes" drill="pr-fixes" tip="The issue(s) this PR resolves." />
            <Stat icon="github" num={d.url ? 1 : 0} label="Record" drill="pr-record" tip="Open the live pull request on GitHub." />
          </BoxScore>

          <Cells>
            <Cell id="pr-enforces" span>
              <Eyebrow icon="verified" count={caps.length || undefined} info="The capabilities this PR enforces, derived from the issue it fixes (FIXES -> Issue -> ABOUT_CAPABILITY). The intention this change enacts.">Enforces intention</Eyebrow>
              {caps.length ? (
                <div className="flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <Link
                      key={c}
                      to={`/notebook/capabilities/${encodeURIComponent(c)}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300"
                    >
                      <Icon name="verified" className="text-[13px] text-stone-500 dark:text-zinc-400" />
                      {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>
                  No capability traced yet — this PR fixes an issue that isn't linked to a capability, or fixes none.
                </p>
              )}
            </Cell>

            <Cell id="pr-fixes" span>
              <Eyebrow icon="history" count={fixes.length || undefined} info="The issue(s) this PR resolves, via the FIXES edge. Each opens its own issue dossier.">Fixes issues</Eyebrow>
              {fixes.length ? (
                <ul className="flex flex-col gap-2">
                  {fixes.map((f, i) =>
                    f.number != null ? (
                      <li key={i} className="flex items-baseline gap-2.5">
                        <Icon name="history" className="translate-y-0.5 text-[15px] text-stone-500 dark:text-zinc-400" />
                        <Link to={`/notebook/issues/${encodeURIComponent(decodedRepo)}/${f.number}`} className="shrink-0 font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">
                          #{f.number}
                        </Link>
                        {f.title && <span className="text-[13px] text-stone-700 dark:text-zinc-200">{f.title}</span>}
                        {f.disposition && <span className={`text-[11px] ${muted}`}>· {f.disposition}</span>}
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>No issue linked — the fix PR was recorded without a FIXES edge.</p>
              )}
            </Cell>

            <Cell id="pr-record" span>
              <Eyebrow icon="open" info="Open the live pull request on GitHub.">Record</Eyebrow>
              <div className="flex flex-wrap items-center gap-3">
                <PrStatusPill url={d.url} />
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11.5px] text-stone-700 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                    <Icon name="pullrequest" className="text-[14px]" /> PR #{num} <Icon name="open" className="text-[13px]" />
                  </a>
                ) : (
                  <span className={`text-sm ${muted}`}>No PR URL recorded.</span>
                )}
                {d.head_ref && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11.5px] text-stone-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    <Icon name="swap" className="text-[13px]" /> {d.head_ref} → {d.base_ref || "?"}
                  </span>
                )}
              </div>
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
