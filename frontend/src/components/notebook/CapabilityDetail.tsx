// Capability dossier — the deep read for one capability, as a case file.
// One cached bundle of four graph queries: explain_capability (the ‘why’ +
// provenance + owners/consumers), what_realizes_capability (implementing
// symbols), capability_patents (patent grounding), and context_pack (invariants
// + precedent issues, matched to this capability).

import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  capabilityPatents,
  contextPack,
  explainCapability,
  whatRealizesCapability,
  type CapabilityExplain,
  type CapabilitySummary,
  type ContextPackEntry,
  type GraphSymbol,
  type PatentRef,
} from "../../lib/mcp";
import { useMetered, readCache } from "../../lib/graphCache";
import { useSwipeNav } from "../../lib/useSwipeNav";
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
  SymbolRow,
  RepoBadge,
  PatentBadge,
  Pager,
  initialsOf,
} from "./dossier";
import { useT } from "../../i18n";

interface Bundle {
  explain: CapabilityExplain;
  symbols: GraphSymbol[];
  patents: PatentRef[];
  pack: ContextPackEntry | null;
}

/// GitHub issue URLs carry the repo — parse it so a precedent can open the
/// issue's OWN dossier (the inversion), falling back to the external link.
function issueLinkFromUrl(url?: string, number?: number): string | null {
  if (!url || number == null) return null;
  const m = url.match(/github\.com\/[^/]+\/([^/]+)\/(?:issues|pull)\/\d+/i);
  return m ? `/issues/${encodeURIComponent(m[1])}/${number}` : null;
}

export default function CapabilityDetail() {
  const t = useT();
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);
  const nav = useNavigate();

  // Swipe / arrow between capabilities in the register's (cached) A–Z order.
  const siblings = useMemo(() => {
    const cached = readCache<CapabilitySummary[]>("capabilities:list:since=0")?.data ?? [];
    return [...new Set(cached.map((c) => String(c.name ?? "")).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, []);
  const idx = siblings.indexOf(decoded);
  const goPrev = idx > 0 ? () => nav(`/capabilities/${encodeURIComponent(siblings[idx - 1])}`) : undefined;
  const goNext = idx >= 0 && idx < siblings.length - 1 ? () => nav(`/capabilities/${encodeURIComponent(siblings[idx + 1])}`) : undefined;
  const swipe = useSwipeNav({ prev: goPrev, next: goNext });

  const m = useMetered<Bundle>(`capability:${decoded}`, async () => {
    const [explain, symbols, patents, packs] = await Promise.all([
      explainCapability(decoded),
      whatRealizesCapability(decoded),
      capabilityPatents(decoded),
      contextPack(decoded),
    ]);
    const pack =
      packs.find((p) => (p.capability ?? "").toLowerCase() === decoded.toLowerCase()) ?? packs[0] ?? null;
    return { explain, symbols, patents, pack };
  });

  const b = m.data;
  const explain = b?.explain;
  const doctrine = !!explain?.why;
  const invariants = b?.pack?.invariants ?? [];
  const precedents = b?.pack?.precedents ?? [];

  return (
    <DossierWrap swipe={swipe}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/notebook/capabilities" className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> {t("notebook.register")}
        </Link>
        <Pager index={idx} total={siblings.length} onPrev={goPrev} onNext={goNext} label={t("notebook.cap.one")} />
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <QuoteScroller quotes={quotes()} spinner heading={t("notebook.dossier.assembling")} classNames={quoteStyles} />}

      {explain && (
        <Dossier accent="blue" tab={t("notebook.cap.tab")} tabNo={t("notebook.dossier.caseFile")}>
          <DossierHead
            crest={initialsOf(decoded)}
            role={t("notebook.cap.role")}
            roleIcon="verified"
            title={decoded}
            tags={(b?.pack?.keywords ?? explain.owners ?? []).slice(0, 6)}
            tagHref={(tag) => `/concordance?q=${encodeURIComponent(tag)}`}
            stamp={
              doctrine ? (
                <Stamp tone="good" icon="verified" label={t("notebook.seal.human")} sub={t("notebook.doctrine")} tip={t("notebook.cap.humanTip")} />
              ) : explain.inferred_why ? (
                <Stamp tone="warn" icon="info" label={t("notebook.stamp.inferred")} sub={t("notebook.stamp.unverified")} tip={t("notebook.cap.inferredTip")} />
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="dns" num={explain.owners?.length ?? 0} label={t("notebook.sort.owners")} drill="cap-owners" tip={t("notebook.cap.ownersTip")} />
            <Stat icon="groups" num={explain.consumers?.length ?? 0} label={t("notebook.cap.consumers")} drill="cap-consumers" tip={t("notebook.cap.consumersTip")} />
            <Stat icon="symbol" num={b?.symbols.length ?? 0} label={t("notebook.conc.symbols")} accent drill="cap-symbols" tip={t("notebook.cap.symbolsTip")} />
            <Stat icon="bookmark" num={b?.patents.length ?? 0} label={t("notebook.nav.patents")} drill="cap-patents" tip={t("notebook.cap.patentsTip")} />
            <Stat icon="history" num={precedents.length} label={t("notebook.nav.issues")} drill="cap-precedents" tip={t("notebook.cap.issuesTip")} />
            <Stat icon="verified" num={invariants.length} label={t("notebook.nav.invariants")} drill="cap-invariants" tip={t("notebook.cap.invariantsTip")} />
          </BoxScore>

          {/* Rationale */}
          <div className="border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
            <Eyebrow icon="quote">{t("notebook.cap.rationale")}</Eyebrow>
            {doctrine ? (
              <>
                <blockquote className="border-l-[3px] border-amber-500 pl-4 font-serif text-[17px] leading-relaxed">{explain.why}</blockquote>
                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[12px] text-stone-500 dark:text-zinc-400">
                  <Icon name="verified" className="text-[14px] text-emerald-600 dark:text-emerald-400" />
                  {t("notebook.cap.operatorHuman")}
                </div>
              </>
            ) : explain.inferred_why ? (
              <>
                <blockquote className="border-l-[3px] border-amber-400 pl-4 font-serif text-[17px] leading-relaxed">{explain.inferred_why}</blockquote>
                <p className={`mt-2 text-xs ${muted}`}>{t("notebook.cap.awaiting")}</p>
              </>
            ) : (
              <p className={`text-sm ${muted}`}>{t("notebook.cap.noRationale")}</p>
            )}
          </div>

          <Cells>
            <Cell id="cap-symbols">
              <Eyebrow icon="symbol" count={b?.symbols.length ?? 0} info={t("notebook.cap.symbolsInfo")}>{t("notebook.conc.symbols")}</Eyebrow>
              {b && b.symbols.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {b.symbols.map((s, i) => {
                    const fqn = s.symbol ?? s.fqn ?? t("notebook.recent.unnamed");
                    return <SymbolRow key={fqn + i} fqn={fqn} file={s.file ?? s.file_path} lang={s.lang} sha={s.verified_at_sha} copyValue={fqn} />;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.cap.noSymbols")}</p>
              )}
            </Cell>

            <Cell id="cap-patents">
              <Eyebrow icon="bookmark" count={b?.patents.length ?? 0} info={t("notebook.cap.patentsInfo")}>{t("notebook.nav.patents")}</Eyebrow>
              {b && b.patents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {b.patents.map((p) => (p.ref != null ? <PatentBadge key={p.ref} refNum={p.ref} name={p.name} /> : null))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.cap.noPatents")}</p>
              )}
            </Cell>

            <Cell id="cap-owners">
              <Eyebrow icon="dns" count={explain.owners?.length ?? 0} info={t("notebook.cap.ownersInfo")}>{t("notebook.sort.owners")}</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {(explain.owners ?? []).length ? explain.owners!.map((o) => <RepoBadge key={o} repo={o} />) : <span className={`text-sm ${muted}`}>—</span>}
              </div>
            </Cell>

            <Cell id="cap-consumers">
              <Eyebrow icon="groups" count={explain.consumers?.length ?? 0} info={t("notebook.cap.consumersInfo")}>{t("notebook.cap.consumers")}</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {(explain.consumers ?? []).length ? explain.consumers!.map((c) => <RepoBadge key={c} repo={c} />) : <span className={`text-sm ${muted}`}>—</span>}
              </div>
            </Cell>

            <Cell id="cap-invariants" span>
              <Eyebrow icon="verified" count={invariants.length} info={t("notebook.cap.invariantsInfo")}>{t("notebook.nav.invariants")}</Eyebrow>
              {invariants.length ? (
                <ul className="flex flex-col gap-2">
                  {invariants.map((inv, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]">
                      <Icon name="check" className="mt-0.5 text-[15px] text-emerald-600 dark:text-emerald-400" />
                      <Link to={`/notebook/invariants/${encodeURIComponent(inv)}`} className="text-amber-700 hover:underline dark:text-amber-300">{inv}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.cap.noInvariants")}</p>
              )}
            </Cell>

            <Cell id="cap-precedents" span>
              <Eyebrow icon="history" count={precedents.length || undefined} info={t("notebook.cap.issuesInfo")}>{t("notebook.nav.issues")}</Eyebrow>
              {precedents.length ? (
                <ul className="flex flex-col gap-2">
                  {precedents.map((pr, i) => {
                    const internal = issueLinkFromUrl(pr.url, pr.number);
                    return (
                      <li key={i} className="flex items-baseline gap-2.5">
                        <Icon name="github" className="translate-y-0.5 text-[15px] text-stone-500 dark:text-zinc-400" />
                        {internal ? (
                          <Link to={internal} className="shrink-0 font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">#{pr.number}</Link>
                        ) : pr.url ? (
                          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">#{pr.number}</a>
                        ) : (
                          <span className="shrink-0 font-mono text-[12.5px]">#{pr.number}</span>
                        )}
                        {(pr.title || pr.actionable_text) && (
                          <span className="text-[13px] text-stone-700 dark:text-zinc-200">{pr.title || pr.actionable_text}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.cap.noIssues")}</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
