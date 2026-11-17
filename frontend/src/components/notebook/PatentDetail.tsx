// Patent-element dossier — the case-file grammar with a filed patent reference
// numeral at center. The capabilities and invariants traced to it orbit around
// it. Same shape as the other detail pages, pivoted to the patent element.

import { Link, useNavigate, useParams } from "react-router-dom";
import { explainPatentElement, type PatentElementDetail } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
import { QuoteScroller } from "@tollbooth-dpyc/web/react";
import { quotes } from "../../lib/quotes";
import { quoteStyles } from "../../lib/quoteStyles";
import { DossierWrap, Dossier, DossierHead, BoxScore, Stat, Cells, Cell, Eyebrow } from "./dossier";
import { Tx } from "@tollbooth-dpyc/web/react";
import { useT, WORDS } from "../../i18n";

export default function PatentDetail() {
  const t = useT();
  const { ref = "" } = useParams();
  const refNum = Number(ref);
  const nav = useNavigate();

  const m = useMetered<PatentElementDetail>(`patent:${ref}`, () => explainPatentElement(refNum));

  const d = m.data;
  const caps = d?.capabilities ?? [];
  const invariants = d?.invariants ?? [];
  const found = !!(d && (d.ref != null || d.name || caps.length || invariants.length));

  return (
    <DossierWrap>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => nav(-1)} className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> {t("notebook.back")}
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller quotes={quotes()} spinner heading={t("notebook.pat.reading")} classNames={quoteStyles} />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">{t("notebook.pat.notFound")}</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            <Tx ns={WORDS} k="notebook.pat.notRecorded" vars={{ ref }} components={{ ref: <span className="font-mono text-stone-600 dark:text-zinc-300" /> }} />
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab={t("notebook.pat.tab")} tabNo={t("notebook.pat.tabNo", { ref: d!.ref ?? ref })}>
          <DossierHead
            crest={String(d!.ref ?? ref)}
            role={
              <>
                {t("notebook.pat.filed")}
                {d!.claim_family ? ` · ${d!.claim_family}` : ""}
                {d!.figures ? ` · ${t("notebook.patents.fig", { figures: d!.figures })}` : ""}
              </>
            }
            roleIcon="bookmark"
            title={d!.name ?? t("notebook.patents.element", { ref })}
          />

          <BoxScore>
            <Stat icon="verified" num={caps.length} label={t("notebook.nav.capabilities")} accent drill="pat-caps" tip={t("notebook.pat.capsTip")} />
            <Stat icon="verified" num={invariants.length} label={t("notebook.nav.invariants")} drill="pat-invariants" tip={t("notebook.pat.invsTip")} />
          </BoxScore>

          <Cells>
            <Cell id="pat-caps" span>
              <Eyebrow icon="verified" count={caps.length} info={t("notebook.pat.realizedInfo")}>{t("notebook.pat.realized")}</Eyebrow>
              {caps.length ? (
                <div className="flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <Link key={c} to={`/notebook/capabilities/${encodeURIComponent(c)}`} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                      <Icon name="verified" size={13} className="text-stone-500 dark:text-zinc-400" /> {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.pat.noCaps")}</p>
              )}
            </Cell>

            <Cell id="pat-invariants" span>
              <Eyebrow icon="verified" count={invariants.length} info={t("notebook.pat.invsInfo")}>{t("notebook.nav.invariants")}</Eyebrow>
              {invariants.length ? (
                <ul className="flex flex-col gap-2">
                  {invariants.map((inv, k) => (
                    <li key={k} className="flex items-start gap-2 text-[13.5px]">
                      <Icon name="verified" size={15} className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <Link to={`/notebook/invariants/${encodeURIComponent(inv)}`} className="text-amber-700 hover:underline dark:text-amber-300">{inv}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>{t("notebook.pat.noInvs")}</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
