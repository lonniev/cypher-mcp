// Symbol dossier — the same case-file grammar with a code symbol at center.
// Around it orbit the service it belongs to, the capabilities it realizes, the
// issues it root-caused, the decisions attached to it, and the invariants that
// guard it. The pivot that makes Capability↔Symbol (and Issue↔Symbol) two-way.

import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { symbolProvenance, type SymbolProvenance } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon, langIcon } from "./icons";
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
  RepoBadge,
  CopyButton,
  initialsOf,
} from "./dossier";
import { Tx } from "@tollbooth-dpyc/web/react";
import { useT, WORDS } from "../../i18n";

/// The short name at the tail of an fqn (after :: and .) for the crest.
function shortName(fqn: string): string {
  const tail = fqn.split("::").pop() ?? fqn;
  return tail.split(".").pop() ?? tail;
}

export default function SymbolDetail() {
  const t = useT();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const fqn = params.get("fqn") ?? "";

  const m = useMetered<SymbolProvenance>(`symbol:${fqn}`, () => symbolProvenance(fqn));

  const d = m.data;
  const services = d?.services ?? [];
  const caps = d?.capabilities ?? [];
  const issues = d?.issues ?? [];
  const decisions = d?.decisions ?? [];
  const invariants = d?.invariants ?? [];
  const found = !!(
    d &&
    (d.fqn || services.length || caps.length || issues.length || decisions.length || invariants.length)
  );

  return (
    <DossierWrap>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => nav(-1)} className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> {t("notebook.back")}
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller quotes={quotes()} spinner heading={t("notebook.sym.reading")} classNames={quoteStyles} />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">{t("notebook.sym.notFound")}</div>
          <p className={`mx-auto mt-1.5 max-w-md break-all text-sm ${muted}`}>
            <Tx ns={WORDS} k="notebook.sym.notIndexed" vars={{ ref: fqn }} components={{ ref: <span className="font-mono text-stone-600 dark:text-zinc-300" /> }} />
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab={t("notebook.sym.tab")} tabNo={t("notebook.dossier.caseFile")}>
          <DossierHead
            crest={initialsOf(shortName(fqn))}
            role={<>{[d!.lang, ...services].filter(Boolean).join(" · ") || t("notebook.sym.codeSymbol")}</>}
            roleIcon={langIcon(d!.lang, d!.file)}
            title={fqn}
            stamp={
              d!.verified_at_sha ? (
                <Stamp tone="good" icon="verified" label={t("notebook.seal.verified")} sub={d!.verified_at_sha.slice(0, 8)} tip={t("notebook.symbol.verifiedAt")} />
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="dns" num={services.length} label={t("public.stats.services")} drill="sym-services" tip={t("notebook.sym.servicesTip")} />
            <Stat icon="verified" num={caps.length} label={t("notebook.nav.capabilities")} accent drill="sym-caps" tip={t("notebook.sym.capsTip")} />
            <Stat icon="history" num={issues.length} label={t("notebook.nav.issues")} drill="sym-issues" tip={t("notebook.sym.issuesTip")} />
            <Stat icon="quote" num={decisions.length} label={t("notebook.issue.decisions")} drill="sym-decisions" tip={t("notebook.sym.decisionsTip")} />
            <Stat icon="bookmark" num={invariants.length} label={t("notebook.nav.invariants")} drill="sym-invariants" tip={t("notebook.sym.invsTip")} />
          </BoxScore>

          {/* File anchor */}
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-6 py-4 dark:border-zinc-800">
            <Icon name={langIcon(d!.lang, d!.file)} size={16} className="text-[#35618e] dark:text-[#6e9bc9]" />
            <span className="font-mono text-[13px] text-stone-700 dark:text-zinc-200">{d!.file ?? t("notebook.sym.noFile")}</span>
            {d!.verified_at_sha && <span className="font-mono text-[11px] text-[#35618e] dark:text-[#6e9bc9]">@{d!.verified_at_sha.slice(0, 8)}</span>}
            <span className="ml-auto"><CopyButton value={fqn} label={t("notebook.symbol.copyFqn")} /></span>
          </div>

          <Cells>
            <Cell id="sym-caps">
              <Eyebrow icon="verified" count={caps.length} info={t("notebook.sym.realizesInfo")}>{t("notebook.sym.realizes")}</Eyebrow>
              {caps.length ? (
                <div className="flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <Link key={c} to={`/notebook/capabilities/${encodeURIComponent(c)}`} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                      <Icon name="verified" size={13} className="text-stone-500 dark:text-zinc-400" /> {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.sym.noCap")}</p>
              )}
            </Cell>

            <Cell id="sym-services">
              <Eyebrow icon="dns" count={services.length} info={t("notebook.sym.belongsInfo")}>{t("notebook.sym.belongs")}</Eyebrow>
              {services.length ? (
                <div className="flex flex-wrap gap-1.5">{services.map((s) => <RepoBadge key={s} repo={s} />)}</div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.sym.noService")}</p>
              )}
            </Cell>

            <Cell id="sym-issues" span>
              <Eyebrow icon="history" count={issues.length} info={t("notebook.sym.rootInfo")}>{t("notebook.sym.root")}</Eyebrow>
              {issues.length ? (
                <ul className="flex flex-col gap-2">
                  {issues.map((i, k) => (
                    <li key={k} className="flex items-center gap-2.5">
                      <Icon name="github" size={15} className="text-stone-500 dark:text-zinc-400" />
                      {i.repo_name && i.number != null ? (
                        <Link to={`/notebook/issues/${encodeURIComponent(i.repo_name)}/${i.number}`} className="font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">
                          {i.repo_name}#{i.number}
                        </Link>
                      ) : (
                        <span className="font-mono text-[12.5px]">#{i.number}</span>
                      )}
                      {i.title && <span className={`text-[13px] ${muted}`}>{i.title}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.sym.noRoot")}</p>
              )}
            </Cell>

            <Cell id="sym-decisions">
              <Eyebrow icon="quote" count={decisions.length || undefined} info={t("notebook.sym.decisionsInfo")}>{t("notebook.issue.decisions")}</Eyebrow>
              {decisions.length ? (
                <ul className="flex flex-col gap-3">
                  {decisions.map((dec, k) => (
                    <li key={k} className="text-[13.5px]">
                      <div>{dec.statement}</div>
                      {dec.reason && <div className={`mt-0.5 text-xs ${muted}`}>{dec.reason}</div>}
                      {dec.provenance && (
                        <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-emerald-600 dark:text-emerald-400">
                          <Icon name="verified" size={13} /> {dec.provenance}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.sym.noDecision")}</p>
              )}
            </Cell>

            <Cell id="sym-invariants">
              <Eyebrow icon="bookmark" count={invariants.length || undefined} info={t("notebook.sym.guardedInfo")}>{t("notebook.sym.guarded")}</Eyebrow>
              {invariants.length ? (
                <ul className="flex flex-col gap-2">
                  {invariants.map((inv, k) => (
                    <li key={k} className="flex items-start gap-2 text-[13.5px]">
                      <Icon name="verified" size={15} className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.sym.noGuard")}</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
