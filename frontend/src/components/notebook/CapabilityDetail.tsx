// Capability dossier — the deep read for one capability, as a case file.
// One cached bundle of four graph queries: explain_capability (the ‘why’ +
// provenance + owners/consumers), what_realizes_capability (implementing
// symbols), capability_patents (patent grounding), and context_pack (invariants
// + precedent issues, matched to this capability).

import { Link, useParams } from "react-router-dom";
import {
  capabilityPatents,
  contextPack,
  explainCapability,
  whatRealizesCapability,
  type CapabilityExplain,
  type ContextPackEntry,
  type GraphSymbol,
  type PatentRef,
} from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, Empty, MeteredError, muted } from "./ui";
import { Icon } from "./icons";
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
  initialsOf,
} from "./dossier";

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
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);

  const m = useMetered<Bundle>(`capability:${decoded}`, "explain_capability", async () => {
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
    <DossierWrap>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/capabilities" className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" /> Register
        </Link>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} note="1 dossier = 4 graph queries" />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <Empty>Assembling the case file…</Empty>}

      {explain && (
        <Dossier accent="blue" tab="Capability" tabNo="Case file">
          <DossierHead
            crest={initialsOf(decoded)}
            role="Capability · intention graph"
            roleIcon="verified"
            title={decoded}
            tags={(b?.pack?.keywords ?? explain.owners ?? []).slice(0, 6)}
            tagHref={(t) => `/concordance?q=${encodeURIComponent(t)}`}
            stamp={
              doctrine ? (
                <Stamp tone="good" icon="verified" label="Human-authored" sub="Doctrine" tip="A human wrote this rationale — an agent physically can't forge it. Treat it as doctrine." />
              ) : explain.inferred_why ? (
                <Stamp tone="warn" icon="info" label="Agent-inferred" sub="Unverified" tip="An agent suggested this rationale. It awaits an operator's review — advice, not doctrine." />
              ) : undefined
            }
          />

          <BoxScore>
            <Stat icon="dns" num={explain.owners?.length ?? 0} label="Owners" drill="cap-affiliations" tip="Services that own this capability." />
            <Stat icon="groups" num={explain.consumers?.length ?? 0} label="Consumers" drill="cap-affiliations" tip="Services that depend on this capability." />
            <Stat icon="symbol" num={b?.symbols.length ?? 0} label="Symbols" accent drill="cap-symbols" tip="Code symbols that implement it — the grep scope for a fix." />
            <Stat icon="bookmark" num={b?.patents.length ?? 0} label="Patents" drill="cap-patents" tip="Filed patent elements that ground its rationale." />
            <Stat icon="history" num={precedents.length} label="Precedents" drill="cap-history" tip="Prior issues that touched this capability." />
            <Stat icon="verified" num={invariants.length} label="Guards" drill="cap-rules" tip="Invariants the fleet must not violate." />
          </BoxScore>

          {/* Rationale */}
          <div className="border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
            <Eyebrow icon="quote">Rationale</Eyebrow>
            {doctrine ? (
              <>
                <blockquote className="border-l-[3px] border-amber-500 pl-4 font-serif text-[17px] leading-relaxed">{explain.why}</blockquote>
                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[12px] text-stone-500 dark:text-zinc-400">
                  <Icon name="verified" className="text-[14px] text-emerald-600 dark:text-emerald-400" />
                  Operator · human-authored
                </div>
              </>
            ) : explain.inferred_why ? (
              <>
                <blockquote className="border-l-[3px] border-amber-400 pl-4 font-serif text-[17px] leading-relaxed">{explain.inferred_why}</blockquote>
                <p className={`mt-2 text-xs ${muted}`}>No human rationale is authorized yet — an agent's suggestion, awaiting review.</p>
              </>
            ) : (
              <p className={`text-sm ${muted}`}>No rationale recorded yet.</p>
            )}
          </div>

          <Cells>
            <Cell id="cap-symbols">
              <Eyebrow icon="symbol" count={b?.symbols.length ?? 0} info="Each symbol links to its owning service. Copy the FQN or open it on GitHub.">Realized by</Eyebrow>
              {b && b.symbols.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {b.symbols.map((s, i) => {
                    const fqn = s.symbol ?? s.fqn ?? "(unnamed)";
                    return <SymbolRow key={fqn + i} fqn={fqn} file={s.file ?? s.file_path} lang={s.lang} sha={s.verified_at_sha} owner={s.owner} copyValue={fqn} />;
                  })}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>No symbols bound yet.</p>
              )}
            </Cell>

            <Cell id="cap-affiliations">
              <Eyebrow icon="dns" info="Owners provide the capability; consumers depend on it. Each badge opens that service.">Affiliations</Eyebrow>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-zinc-500">Owned by</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(explain.owners ?? []).length ? explain.owners!.map((o) => <RepoBadge key={o} repo={o} />) : <span className={`text-sm ${muted}`}>—</span>}
              </div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-zinc-500">Consumed by · {explain.consumers?.length ?? 0}</div>
              <div className="flex flex-wrap gap-1.5">
                {(explain.consumers ?? []).length ? explain.consumers!.map((c) => <RepoBadge key={c} repo={c} />) : <span className={`text-sm ${muted}`}>—</span>}
              </div>
            </Cell>

            <Cell id="cap-patents">
              <Eyebrow icon="bookmark" count={`${b?.patents.length ?? 0} patent elements`} info="Reference numerals from the filed provisional. Each opens the patent element.">Decorations</Eyebrow>
              {b && b.patents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {b.patents.map((p) => (p.ref != null ? <PatentBadge key={p.ref} refNum={p.ref} name={p.name} /> : null))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>Not yet traced to a patent element.</p>
              )}
            </Cell>

            <Cell id="cap-rules">
              <Eyebrow icon="verified" count={`${invariants.length} invariant${invariants.length === 1 ? "" : "s"}`} info="Human-authored rules the fleet must not violate — drift alarms if broken.">House rules</Eyebrow>
              {invariants.length ? (
                <ul className="flex flex-col gap-2">
                  {invariants.map((inv, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]">
                      <Icon name="check" className="mt-0.5 text-[15px] text-emerald-600 dark:text-emerald-400" />
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>No invariant guards this capability yet.</p>
              )}
            </Cell>

            {precedents.length > 0 && (
              <Cell id="cap-history" span>
                <Eyebrow icon="history" count={`${precedents.length} precedents`} info="Prior issues about this capability. Each opens its own issue dossier.">Case history</Eyebrow>
                <ul className="flex flex-col gap-2">
                  {precedents.map((pr, i) => {
                    const internal = issueLinkFromUrl(pr.url, pr.number);
                    return (
                      <li key={i} className="flex items-center gap-2.5">
                        <Icon name="github" className="text-[15px] text-stone-500 dark:text-zinc-400" />
                        {internal ? (
                          <Link to={internal} className="font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">#{pr.number}</Link>
                        ) : pr.url ? (
                          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">#{pr.number}</a>
                        ) : (
                          <span className="font-mono text-[12.5px]">#{pr.number}</span>
                        )}
                        {pr.actionable_text && <span className={`text-[13px] ${muted}`}>{pr.actionable_text}</span>}
                      </li>
                    );
                  })}
                </ul>
              </Cell>
            )}
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
