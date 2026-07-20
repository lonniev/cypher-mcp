// Issue dossier — the same case-file grammar with the issue at center. Around
// it orbit the capability it touched, the root-cause symbols, the decisions and
// rejections in its triage, and its external GitHub record. issue_provenance is
// one cached read.

import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { issueProvenance, type IssueProvenance, type IssueSummary } from "../../lib/mcp";
import { useMetered, readCache } from "../../lib/graphCache";
import { useSwipeNav } from "../../lib/useSwipeNav";
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
  SymbolRow,
  ResolvedPill,
  IconLink,
  Annotate,
  Pager,
} from "./dossier";

function resolved(disposition?: string): boolean {
  return /resolv|merg|fixed|closed|done|shipped/i.test(disposition ?? "");
}

export default function IssueDetail() {
  const { repo = "", number = "" } = useParams();
  const decodedRepo = decodeURIComponent(repo);
  const num = Number(number);
  const nav = useNavigate();

  // Swipe / arrow between issues in the register's (cached) order.
  const siblings = useMemo(() => {
    const cached = readCache<IssueSummary[]>("issues:list:since=0")?.data ?? [];
    return cached
      .filter((i) => i.repo_name && i.number != null)
      .map((i) => ({ repo: String(i.repo_name), number: Number(i.number) }));
  }, []);
  const idx = siblings.findIndex((s) => s.repo === decodedRepo && s.number === num);
  const toIssue = (s: { repo: string; number: number }) => nav(`/issues/${encodeURIComponent(s.repo)}/${s.number}`);
  const goPrev = idx > 0 ? () => toIssue(siblings[idx - 1]) : undefined;
  const goNext = idx >= 0 && idx < siblings.length - 1 ? () => toIssue(siblings[idx + 1]) : undefined;
  const swipe = useSwipeNav({ prev: goPrev, next: goNext });

  const m = useMetered<IssueProvenance>(`issue:${decodedRepo}#${num}`, "issue_provenance", () =>
    issueProvenance(decodedRepo, num),
  );

  const d = m.data;
  const symbols = d?.root_cause_symbols ?? [];
  const decisions = d?.decisions ?? [];
  const rejections = d?.rejections ?? [];
  const caps = d?.capabilities ?? [];
  // A non-existent issue yields an empty match — render "not found", NOT a hollow
  // dossier that implies the issue exists but is blank.
  const found = !!(
    d &&
    (d.number != null ||
      d.title ||
      d.classification ||
      d.disposition ||
      d.issue_url ||
      d.repo_url ||
      d.actionable_text ||
      symbols.length ||
      decisions.length ||
      rejections.length)
  );

  return (
    <DossierWrap swipe={swipe}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/issues" className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> Issues
        </Link>
        <Pager index={idx} total={siblings.length} onPrev={goPrev} onNext={goNext} label="issue" />
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller heading="Pulling the case file…" className="py-12" />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">No such issue in the graph</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            <span className="font-mono text-stone-600 dark:text-zinc-300">{decodedRepo}#{num}</span> hasn't been triaged into the intention graph. Check the number, or start from a real one on the{" "}
            <Link to="/issues" className="text-amber-700 hover:underline dark:text-amber-300">Issues register</Link>.
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="amber" tab="Issue" tabNo={`Case file №${num}`}>
          <DossierHead
            crest={`#${num}`}
            role={
              <>
                <Link to={`/services/${encodeURIComponent(decodedRepo)}`} className="hover:text-amber-700 hover:underline dark:hover:text-amber-300">
                  {decodedRepo}
                </Link>
                {d.classification ? ` · ${d.classification}` : ""}
              </>
            }
            roleIcon="github"
            title={d.title ?? `Issue #${num}`}
            tags={[d.classification, d.disposition].filter(Boolean) as string[]}
            stamp={
              d.disposition ? (
                resolved(d.disposition) ? (
                  <Stamp tone="good" icon="check" label={d.disposition} sub="Disposition" tip="Triaged, root-caused, and closed. The dossier records the whole chain." />
                ) : (
                  <Stamp tone="warn" icon="history" label={d.disposition} sub="Disposition" tip="Still open in the Service Desk workflow." />
                )
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="symbol" num={symbols.length} label="Root cause" accent drill="issue-rootcause" tip="The code symbol found at fault." />
            <Stat icon="quote" num={decisions.length} label="Decisions" drill="issue-decisions" tip="Recorded rationale for the fix." />
            <Stat icon="close" num={rejections.length} label="Rejections" drill="issue-rejections" tip="Triage paths that were ruled out." />
            <Stat icon="verified" num={caps.length} label="Capability" drill="issue-capability" tip="The capability this issue touched." />
            <Stat icon="github" num={(d.issue_url ? 1 : 0) + (d.pr_url ? 1 : 0) + (d.repo_url ? 1 : 0)} label="Record" drill="issue-record" tip="Links to the live GitHub issue, its pull request, and the repository." />
            {d.resolved_via && (
              <div className="min-w-[92px] flex-1 border-r border-stone-200 px-3.5 py-3 text-center last:border-r-0 dark:border-zinc-800">
                <ResolvedPill mode={d.resolved_via} />
                <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-stone-400 dark:text-zinc-500">
                  <Annotate text="How the Service Desk located the code — graph is cheapest (no grep), wide-grep the costliest.">Resolved via</Annotate>
                </div>
              </div>
            )}
          </BoxScore>

          {d.actionable_text && (
            <div className="border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
              <Eyebrow icon="quote">The brief</Eyebrow>
              <blockquote className="border-l-[3px] border-[#35618e] pl-4 text-[15px] leading-relaxed dark:border-[#6e9bc9]">{d.actionable_text}</blockquote>
            </div>
          )}

          <Cells>
            {caps.length > 0 && (
              <Cell id="issue-capability">
                <Eyebrow icon="swap" count={caps.length} info="Center the capability instead and this issue becomes one of its cells — the grammar inverts.">Capability</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <Link
                      key={c}
                      to={`/capabilities/${encodeURIComponent(c)}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300"
                    >
                      <Icon name="verified" className="text-[13px] text-stone-500 dark:text-zinc-400" />
                      {c}
                    </Link>
                  ))}
                </div>
              </Cell>
            )}

            <Cell id="issue-rootcause">
              <Eyebrow icon="symbol" count={`${symbols.length} symbol${symbols.length === 1 ? "" : "s"}`} info="The symbol the Service Desk pinned as the fault. Links to its owning service.">Root cause</Eyebrow>
              {symbols.length ? (
                <div className="flex flex-col gap-2.5">
                  {symbols.map((s, i) => {
                    const fqn = s.symbol ?? s.fqn ?? "(unnamed)";
                    return <SymbolRow key={fqn + i} fqn={fqn} file={s.file ?? s.file_path} lang={s.lang} sha={s.verified_at_sha} copyValue={fqn} />;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>No root-cause symbol linked.</p>
              )}
            </Cell>

            <Cell id="issue-decisions">
              <Eyebrow icon="quote" count={decisions.length || undefined} info="Why the fix was made this way. A human-authored decision is doctrine.">Decisions</Eyebrow>
              {decisions.length ? (
                <ul className="flex flex-col gap-3">
                  {decisions.map((dec, i) => (
                    <li key={i} className="text-[13.5px]">
                      <div>{dec.statement}</div>
                      {dec.reason && <div className={`mt-0.5 text-xs ${muted}`}>{dec.reason}</div>}
                      {dec.provenance && (
                        <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-emerald-600 dark:text-emerald-400">
                          <Icon name="verified" className="text-[13px]" />
                          {dec.provenance}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>No decision recorded.</p>
              )}
            </Cell>

            <Cell id="issue-rejections">
              <Eyebrow icon="history" count={rejections.length || undefined} info="Triage directions the Porter considered and ruled out — the road not taken.">Rejections</Eyebrow>
              {rejections.length ? (
                <ul className="flex flex-col gap-2">
                  {rejections.map((r, i) => (
                    <li key={i} className={`flex items-baseline gap-2 text-[13px] ${muted}`}>
                      <Icon name="close" className="text-[14px] text-rose-600 dark:text-rose-400" />
                      <span>{r.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>No rejections — accepted on first triage.</p>
              )}
            </Cell>

            <Cell id="issue-record" span>
              <Eyebrow icon="open" info="Open the live GitHub issue, its pull request, or the repository.">Record</Eyebrow>
              <div className="flex flex-wrap items-center gap-3">
                {d.issue_url ? (
                  <a href={d.issue_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11.5px] text-stone-700 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                    <Icon name="github" className="text-[14px]" /> Issue #{num} <Icon name="open" className="text-[13px]" />
                  </a>
                ) : (
                  <span className={`text-sm ${muted}`}>No linked issue URL.</span>
                )}
                {d.pr_url && (
                  <a href={d.pr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-[11.5px] text-stone-700 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                    <Icon name="github" className="text-[14px]" /> Pull request <Icon name="open" className="text-[13px]" />
                  </a>
                )}
                <span className="ml-auto">
                  <IconLink href={d.repo_url} name="github" label="Open repository" />
                </span>
              </div>
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
