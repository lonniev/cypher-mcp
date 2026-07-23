// Invariant dossier — the case-file grammar with an enforceable rule at center.
// The symbols it guards (the bounded expected set) and the patent elements it is
// traced to orbit around it. Same shape as the Capability / Issue dossiers.

import { useNavigate, useParams } from "react-router-dom";
import { invariantProvenance, type InvariantProvenance } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import { DossierWrap, Dossier, DossierHead, Stamp, BoxScore, Stat, Cells, Cell, Eyebrow, SymbolRow, PatentBadge, initialsOf } from "./dossier";

export default function InvariantDetail() {
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
          <Icon name="back" size={15} /> Back
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller heading="Reading the invariant…" className="py-12" />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">No such invariant in the graph</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            <span className="font-mono text-stone-600 dark:text-zinc-300">{decoded}</span> isn't recorded in the intention graph.
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab="Invariant" tabNo="Case file">
          <DossierHead
            crest={initialsOf(decoded)}
            role="Invariant · business logic"
            roleIcon="verified"
            title={d!.name ?? decoded}
            stamp={
              doctrine ? (
                <Stamp tone="good" icon="verified" label="Human-authored" sub="Doctrine" tip="A human authored this enforceable rule — an agent physically can't forge it. Treat it as doctrine." />
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="symbol" num={symbols.length} label="Guards" accent drill="inv-symbols" tip="The bounded set of symbols this invariant guards — a symbol that drifts outside it trips the alarm." />
            <Stat icon="bookmark" num={patents.length} label="Patents" drill="inv-patents" tip="Filed patent reference numerals that ground this invariant." />
          </BoxScore>

          {d!.rule && (
            <div className="border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
              <Eyebrow icon="quote">The rule</Eyebrow>
              <blockquote className="border-l-[3px] border-amber-500 pl-4 font-serif text-[17px] leading-relaxed">{d!.rule}</blockquote>
              {doctrine && (
                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[12px] text-stone-500 dark:text-zinc-400">
                  <Icon name="verified" className="text-[14px] text-emerald-600 dark:text-emerald-400" />
                  Operator · human-authored
                </div>
              )}
            </div>
          )}

          <Cells>
            <Cell id="inv-symbols" span>
              <Eyebrow icon="symbol" count={symbols.length} info="The bounded expected set. A later symbol matching the pattern but absent from this set is the drift alarm. Each links to its owning service.">Guarded symbols</Eyebrow>
              {symbols.length ? (
                <div className="flex flex-col gap-2.5">
                  {symbols.map((s, i) => {
                    const fqn = s.symbol ?? s.fqn ?? "(unnamed)";
                    return <SymbolRow key={fqn + i} fqn={fqn} file={s.file ?? s.file_path} lang={s.lang} sha={s.verified_at_sha} copyValue={fqn} />;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>No symbol is guarded by this invariant yet.</p>
              )}
            </Cell>

            <Cell id="inv-patents">
              <Eyebrow icon="bookmark" count={patents.length} info="Filed patent reference numerals this invariant is traced to. Each opens the patent element.">Patents</Eyebrow>
              {patents.length ? (
                <div className="flex flex-wrap gap-2">
                  {patents.map((p) => (p.ref != null ? <PatentBadge key={p.ref} refNum={p.ref} name={p.name} /> : null))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>Not yet traced to a patent element.</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
