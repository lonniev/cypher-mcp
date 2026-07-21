// Patent-element dossier — the case-file grammar with a filed patent reference
// numeral at center. The capabilities and invariants traced to it orbit around
// it. Same shape as the other detail pages, pivoted to the patent element.

import { Link, useNavigate, useParams } from "react-router-dom";
import { explainPatentElement, type PatentElementDetail } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import { DossierWrap, Dossier, DossierHead, BoxScore, Stat, Cells, Cell, Eyebrow } from "./dossier";

export default function PatentDetail() {
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
          <Icon name="back" size={15} /> Back
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller heading="Reading the patent element…" className="py-12" />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">No such patent element in the graph</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            Reference numeral <span className="font-mono text-stone-600 dark:text-zinc-300">[{ref}]</span> isn't recorded in the intention graph.
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab="Patent element" tabNo={`Ref [${d!.ref ?? ref}]`}>
          <DossierHead
            crest={String(d!.ref ?? ref)}
            role={
              <>
                Filed provisional · US Prov. 64/045,999
                {d!.claim_family ? ` · ${d!.claim_family}` : ""}
                {d!.figures ? ` · fig ${d!.figures}` : ""}
              </>
            }
            roleIcon="bookmark"
            title={d!.name ?? `Element ${ref}`}
          />

          <BoxScore>
            <Stat icon="verified" num={caps.length} label="Capabilities" accent drill="pat-caps" tip="Capabilities traced to this patent element." />
            <Stat icon="bookmark" num={invariants.length} label="Invariants" drill="pat-invariants" tip="Invariants traced to this patent element." />
          </BoxScore>

          <Cells>
            <Cell id="pat-caps" span>
              <Eyebrow icon="verified" count={caps.length} info="Capabilities grounded in this reference numeral — the reverse of a capability's Patents cell.">Realized by</Eyebrow>
              {caps.length ? (
                <div className="flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <Link key={c} to={`/capabilities/${encodeURIComponent(c)}`} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                      <Icon name="verified" size={13} className="text-stone-500 dark:text-zinc-400" /> {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>No capability traced to this element yet.</p>
              )}
            </Cell>

            <Cell id="pat-invariants" span>
              <Eyebrow icon="bookmark" count={invariants.length} info="Invariants grounded in this reference numeral.">Guards</Eyebrow>
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
                <p className={`text-sm ${muted}`}>No invariant traced to this element yet.</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
