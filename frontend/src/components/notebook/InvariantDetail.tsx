// Invariant dossier — the case-file grammar with an enforceable rule at center.
// The symbols it guards (the bounded expected set) and the patent elements it is
// traced to orbit around it. Same shape as the Capability / Issue dossiers.

import { useNavigate, useParams } from "react-router-dom";
import { invariantProvenance, type InvariantProvenance } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
import { QuoteScroller } from "@tollbooth-dpyc/web/react";
import { quotes } from "../../lib/quotes";
import { quoteStyles } from "../../lib/quoteStyles";
import { DossierWrap, Dossier, DossierHead, Stamp, BoxScore, Stat, Cells, Cell, Eyebrow, SymbolRow, PatentBadge, initialsOf } from "./dossier";
import { Tx } from "@tollbooth-dpyc/web/react";
import { useT, WORDS } from "../../i18n";

export default function InvariantDetail() {
  const t = useT();
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);
  const nav = useNavigate();

  const m = useMetered<InvariantProvenance>(`invariant:${decoded}`, () => invariantProvenance(decoded));

  const d = m.data;
  const symbols = d?.symbols ?? [];
  const patents = d?.patents ?? [];
  const doctrine = d?.provenance === "human-authored";
  const found = !!(d && (d.name || d.rule || symbols.length || patents.length));

  return (
    <DossierWrap>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => nav(-1)} className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> {t("notebook.back")}
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller quotes={quotes()} spinner heading={t("notebook.inv.reading")} classNames={quoteStyles} />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">{t("notebook.inv.notFound")}</div>
          <p className={`mt-1.5 text-sm ${muted}`}>
            <Tx ns={WORDS} k="notebook.notRecorded" vars={{ ref: decoded }} components={{ ref: <span className="font-mono text-stone-600 dark:text-zinc-300" /> }} />
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab={t("notebook.inv.tab")} tabNo={t("notebook.dossier.caseFile")}>
          <DossierHead
            crest={initialsOf(decoded)}
            role={t("notebook.inv.role")}
            roleIcon="verified"
            title={d!.name ?? decoded}
            stamp={
              doctrine ? (
                <Stamp tone="good" icon="verified" label={t("notebook.seal.human")} sub={t("notebook.doctrine")} tip={t("notebook.inv.humanTip")} />
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="symbol" num={symbols.length} label={t("notebook.sort.guards")} accent drill="inv-symbols" tip={t("notebook.inv.guardsTip")} />
            <Stat icon="bookmark" num={patents.length} label={t("notebook.nav.patents")} drill="inv-patents" tip={t("notebook.inv.patentsTip")} />
          </BoxScore>

          {d!.rule && (
            <div className="border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
              <Eyebrow icon="quote">{t("notebook.inv.rule")}</Eyebrow>
              <blockquote className="border-l-[3px] border-amber-500 pl-4 font-serif text-[17px] leading-relaxed">{d!.rule}</blockquote>
              {doctrine && (
                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[12px] text-stone-500 dark:text-zinc-400">
                  <Icon name="verified" className="text-[14px] text-emerald-600 dark:text-emerald-400" />
                  {t("notebook.cap.operatorHuman")}
                </div>
              )}
            </div>
          )}

          <Cells>
            <Cell id="inv-symbols" span>
              <Eyebrow icon="symbol" count={symbols.length} info={t("notebook.inv.guardedInfo")}>{t("notebook.inv.guarded")}</Eyebrow>
              {symbols.length ? (
                <div className="flex flex-col gap-2.5">
                  {symbols.map((s, i) => {
                    const fqn = s.symbol ?? s.fqn ?? t("notebook.recent.unnamed");
                    return <SymbolRow key={fqn + i} fqn={fqn} file={s.file ?? s.file_path} lang={s.lang} sha={s.verified_at_sha} copyValue={fqn} />;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.inv.noSymbols")}</p>
              )}
            </Cell>

            <Cell id="inv-patents">
              <Eyebrow icon="bookmark" count={patents.length} info={t("notebook.inv.patentsInfo")}>{t("notebook.nav.patents")}</Eyebrow>
              {patents.length ? (
                <div className="flex flex-wrap gap-2">
                  {patents.map((p) => (p.ref != null ? <PatentBadge key={p.ref} refNum={p.ref} name={p.name} /> : null))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.cap.noPatents")}</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
