// Patent leaf — one reference numeral. explain_patent_element resolves a filed
// patent element to the capabilities and invariants the fleet has traced back
// to it. This is the notebook's patent concordance: the bridge between the
// narrative in the patent document and the code that realizes each claim.

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Landmark, Boxes, ShieldAlert } from "lucide-react";
import { explainPatentElement, type PatentElementDetail } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { Page, MeteredBar, SectionLabel, Empty, MeteredError, XRef, card, faint, muted } from "./ui";

export default function PatentDetail() {
  const { ref = "" } = useParams();
  const refNum = Number(ref);

  const m = useMetered<PatentElementDetail>(
    `patent:${ref}`,
    "explain_patent_element",
    () => explainPatentElement(refNum),
  );

  const d = m.data;

  return (
    <Page
      eyebrow="Patent element"
      title={`[${ref}] ${d?.name ?? ""}`.trim()}
      lede={
        <>
          A reference numeral from the filed provisional (US Prov. 64/045,999), with the
          capabilities and invariants traced to it.
          {d?.figures && <span className={`ml-1 ${faint}`}>Figures {d.figures}.</span>}
        </>
      }
      actions={
        <Link
          to="/capabilities"
          className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}
        >
          <ArrowLeft className="h-4 w-4" /> Capabilities
        </Link>
      }
    >
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} priceSats={m.priceSats} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <Empty>Reading the patent element…</Empty>}

      {d && (
        <div className="space-y-7">
          <div className={`${card} flex items-start gap-3 p-4`}>
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-serif text-lg font-semibold">{d.name ?? `Element ${ref}`}</div>
              <div className={`mt-0.5 text-xs ${muted}`}>
                {d.claim_family && <span>Claim family: {d.claim_family}</span>}
                {d.figures && <span className="ml-3">Figures: {d.figures}</span>}
              </div>
            </div>
          </div>

          <section>
            <SectionLabel>Realized by · capabilities</SectionLabel>
            {(d.capabilities ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {d.capabilities!.map((c) => (
                  <XRef key={c} to={`/capabilities/${encodeURIComponent(c)}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5" /> {c}
                    </span>
                  </XRef>
                ))}
              </div>
            ) : (
              <Empty>No capability is traced to this element yet.</Empty>
            )}
          </section>

          <section>
            <SectionLabel>Guarded by · invariants</SectionLabel>
            {(d.invariants ?? []).length > 0 ? (
              <div className={`${card} divide-y divide-stone-100 dark:divide-zinc-800`}>
                {d.invariants!.map((inv, i) => (
                  <div key={i} className="flex items-start gap-2 px-4 py-2.5 text-sm">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{inv}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No invariant is traced to this element yet.</Empty>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
