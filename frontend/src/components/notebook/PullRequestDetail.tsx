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
import { QuoteScroller } from "@tollbooth-dpyc/web/react";
import { quotes } from "../../lib/quotes";
import { quoteStyles } from "../../lib/quoteStyles";
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
import { Tx } from "@tollbooth-dpyc/web/react";
import { useT, WORDS } from "../../i18n";

export default function PullRequestDetail() {
  const t = useT();
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
      return <Stamp tone="good" icon="delivered" label={t("notebook.gh.merged")} sub={t("notebook.pr.one")} tip={t("notebook.pr.mergedTip")} />;
    if (open)
      return <Stamp tone="warn" icon="pullrequest" label={d?.draft ? t("notebook.pr.draft") : t("notebook.pr.open")} sub={t("notebook.pr.one")} tip={d?.draft ? t("notebook.pr.draftTip") : t("notebook.pr.openTip")} />;
    return <Stamp tone="warn" ink="text-rose-700 border-rose-600/60 dark:text-rose-400" icon="close" label={t("notebook.pr.closed")} sub={t("notebook.pr.notMerged")} tip={t("notebook.pr.closedTip")} />;
  })();

  return (
    <DossierWrap swipe={swipe}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/notebook/pulls" className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> {t("notebook.nav.pulls")}
        </Link>
        <Pager index={idx} total={siblings.length} onPrev={goPrev} onNext={goNext} label={t("notebook.pr.lower")} />
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller quotes={quotes()} spinner heading={t("notebook.issue.pulling")} classNames={quoteStyles} />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">{t("notebook.pr.notFound")}</div>
          <p className={`mt-1.5 text-sm ${muted}`}>
            <Tx
              ns={WORDS}
              k="notebook.pr.notFoundBody"
              vars={{ ref: `${decodedRepo}#${num}` }}
              components={{
                ref: <span className="font-mono text-stone-600 dark:text-zinc-300" />,
                register: <Link to="/notebook/pulls" className="text-amber-700 hover:underline dark:text-amber-300" />,
              }}
            />
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab={t("notebook.pr.tab")} tabNo={t("notebook.dossier.caseFileNo", { number: num })}>
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
            title={d.title ?? t("notebook.pulls.numbered", { number: num })}
            tags={[d.head_ref, d.base_ref].filter(Boolean) as string[]}
            stamp={stamp}
          />

          <BoxScore>
            <Stat icon="verified" num={caps.length} label={t("notebook.pr.enforces")} accent drill="pr-enforces" tip={t("notebook.pr.enforcesTip")} />
            <Stat icon="history" num={fixes.length} label={t("notebook.pr.fixes")} drill="pr-fixes" tip={t("notebook.pr.fixesTip")} />
            <Stat icon="github" num={d.url ? 1 : 0} label={t("notebook.issue.record")} drill="pr-record" tip={t("notebook.pr.recordTip")} />
          </BoxScore>

          <Cells>
            <Cell id="pr-enforces" span>
              <Eyebrow icon="verified" count={caps.length || undefined} info={t("notebook.pr.enforcesInfo")}>{t("notebook.pr.enforcesIntention")}</Eyebrow>
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
                  {t("notebook.pr.noCaps")}
                </p>
              )}
            </Cell>

            <Cell id="pr-fixes" span>
              <Eyebrow icon="history" count={fixes.length || undefined} info={t("notebook.pr.fixesInfo")}>{t("notebook.pr.fixesIssues")}</Eyebrow>
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
                <p className={`text-sm ${muted}`}>{t("notebook.pr.noIssue")}</p>
              )}
            </Cell>

            <Cell id="pr-record" span>
              <Eyebrow icon="open" info={t("notebook.pr.recordTip")}>{t("notebook.issue.record")}</Eyebrow>
              <div className="flex flex-wrap items-center gap-3">
                <PrStatusPill url={d.url} />
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11.5px] text-stone-700 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                    <Icon name="pullrequest" className="text-[14px]" /> {t("notebook.pr.short", { number: num })} <Icon name="open" className="text-[13px]" />
                  </a>
                ) : (
                  <span className={`text-sm ${muted}`}>{t("notebook.pr.noUrl")}</span>
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
