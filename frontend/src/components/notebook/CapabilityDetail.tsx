// Capability leaf — the deep read for one capability. One cached bundle of
// three graph queries: explain_capability (the ‘why’ + provenance + owners /
// consumers), what_realizes_capability (the implementing symbols across repos),
// and capability_patents (the patent numerals that ground the rationale).

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileCode2, Landmark } from "lucide-react";
import {
  capabilityPatents,
  explainCapability,
  whatRealizesCapability,
  type CapabilityExplain,
  type GraphSymbol,
  type PatentRef,
} from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import {
  Page,
  MeteredBar,
  SectionLabel,
  ProvenanceSeal,
  Empty,
  ErrorNote,
  XRef,
  card,
  faint,
  muted,
} from "./ui";

interface Bundle {
  explain: CapabilityExplain;
  symbols: GraphSymbol[];
  patents: PatentRef[];
}

export default function CapabilityDetail() {
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);

  const m = useMetered<Bundle>(
    `capability:${decoded}`,
    "explain_capability",
    async () => {
      const [explain, symbols, patents] = await Promise.all([
        explainCapability(decoded),
        whatRealizesCapability(decoded),
        capabilityPatents(decoded),
      ]);
      return { explain, symbols, patents };
    },
    { priceParams: { name: decoded } },
  );

  const b = m.data;
  const explain = b?.explain;

  return (
    <Page
      eyebrow="Capability"
      title={decoded}
      actions={
        <Link
          to="/capabilities"
          className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}
        >
          <ArrowLeft className="h-4 w-4" /> Register
        </Link>
      }
    >
      <MeteredBar
        cachedAt={m.cachedAt}
        loading={m.loading}
        priceSats={m.priceSats}
        onRefresh={m.refresh}
        note="1 leaf = 3 graph queries"
      />

      {m.error && <ErrorNote>{m.error}</ErrorNote>}
      {!m.error && m.cold && m.loading && <Empty>Reading the capability…</Empty>}

      {explain && (
        <div className="space-y-7">
          {/* Rationale — doctrine vs. advice, unmistakably distinguished */}
          <section>
            <SectionLabel>Rationale</SectionLabel>
            {explain.why ? (
              <div className={`${card} p-4`}>
                <div className="mb-2">
                  <ProvenanceSeal provenance={explain.provenance ?? "human-authored"} />
                </div>
                <p className="font-serif text-[15px] leading-relaxed text-stone-800 dark:text-zinc-100">
                  {explain.why}
                </p>
              </div>
            ) : explain.inferred_why ? (
              <div className={`${card} p-4`}>
                <div className="mb-2">
                  <ProvenanceSeal provenance={explain.inferred_provenance ?? "llm-inferred-unverified"} />
                </div>
                <p className="font-serif text-[15px] leading-relaxed text-stone-800 dark:text-zinc-100">
                  {explain.inferred_why}
                </p>
                <p className={`mt-2 text-xs ${faint}`}>
                  No human rationale has been authorized yet — this is an agent's suggestion awaiting
                  an operator's review.
                </p>
              </div>
            ) : (
              <Empty>No rationale recorded for this capability yet.</Empty>
            )}
          </section>

          {/* Services */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <SectionLabel>Owned by</SectionLabel>
              <ServiceList repos={explain.owners} empty="No owning service recorded." />
            </div>
            <div>
              <SectionLabel>Consumed by</SectionLabel>
              <ServiceList repos={explain.consumers} empty="No consumers recorded." />
            </div>
          </section>

          {/* Realizing symbols — the grep scope for any fix */}
          <section>
            <SectionLabel>Realized by · code symbols</SectionLabel>
            {b && b.symbols.length > 0 ? (
              <div className={`${card} divide-y divide-stone-100 dark:divide-zinc-800`}>
                {b.symbols.map((s, i) => (
                  <SymbolRow key={(s.symbol ?? s.fqn ?? "") + i} s={s} />
                ))}
              </div>
            ) : (
              <Empty>No symbols bound to this capability yet.</Empty>
            )}
          </section>

          {/* Patent grounding */}
          <section>
            <SectionLabel>Grounded in · patent elements</SectionLabel>
            {b && b.patents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {b.patents.map((p) => (
                  <Link
                    key={p.ref}
                    to={`/patent/${p.ref}`}
                    className={`${card} flex items-center gap-2 px-3 py-2 transition-colors hover:border-amber-300 dark:hover:border-amber-500/40`}
                  >
                    <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm">
                      <span className="font-mono text-amber-700 dark:text-amber-300">[{p.ref}]</span>{" "}
                      {p.name}
                    </span>
                    {p.figures && <span className={`text-[11px] ${faint}`}>fig {p.figures}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>Not yet traced to a filed patent element.</Empty>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}

function ServiceList({ repos, empty }: { repos?: string[]; empty: string }) {
  if (!repos || repos.length === 0) return <div className={`text-sm ${faint}`}>{empty}</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {repos.map((r) => (
        <XRef key={r} to={`/services/${encodeURIComponent(r)}`}>
          <span className="font-mono text-[13px]">{r}</span>
        </XRef>
      ))}
    </div>
  );
}

function SymbolRow({ s }: { s: GraphSymbol }) {
  const fqn = s.symbol ?? s.fqn ?? "(unnamed)";
  const file = s.file ?? s.file_path;
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-zinc-500" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[13px] text-stone-800 dark:text-zinc-100">{fqn}</div>
        <div className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] ${muted}`}>
          {file && <span className="font-mono">{file}</span>}
          {s.lang && <span className={faint}>{s.lang}</span>}
          {s.owner && (
            <XRef to={`/services/${encodeURIComponent(s.owner)}`}>
              <span className="font-mono">{s.owner}</span>
            </XRef>
          )}
          {s.verified_at_sha && (
            <span className={`font-mono ${faint}`} title="Journeyman-verified at this commit">
              @ {s.verified_at_sha.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
