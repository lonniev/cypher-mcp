// `/memory` — what this operator stores and why; names the tools a patron calls.

import { Link } from "react-router-dom";
import { MEMORY_STORES, PROVENANCE_THESIS, RESOLVED_VIA } from "../../lib/factoryModel";
import LiveStats from "./LiveStats";

export default function MemoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-14">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          This operator
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          The intention graph
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          cypher-mcp is the factory&apos;s memory plane. It sells operator-authored named
          Cypher queries over Neo4j AuraDB — priced answers, never raw graph access. An
          agent&apos;s write is a paid, signed, patron-authenticated MCP call.
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Why the graph exists</h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          The <span className="font-mono text-xs">ResolvedVia</span> enum is the whole
          argument in three values. Wide-grep is the expensive path the intention graph
          exists to eliminate.{" "}
          <span className="font-mono text-xs">factory_resolution_stats</span> measures
          that shrinkage — the single most persuasive number on this site.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {RESOLVED_VIA.map((v) => (
            <div
              key={v.key}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="font-mono text-sm text-amber-700 dark:text-amber-300">{v.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {v.gloss}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Live aggregates</h2>
        <LiveStats />
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold">What is stored</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
          Six first-class node families. Each lists the tools a patron or agent would call.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {MEMORY_STORES.map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-sm font-medium">{s.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {s.body}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    cypher_{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
          Provenance asymmetry
        </div>
        <p className="mt-2 max-w-3xl font-serif text-lg leading-snug text-stone-800 dark:text-zinc-100">
          {PROVENANCE_THESIS}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
          Journeyman writes land as <span className="font-mono">llm-inferred-unverified</span>.
          Operator (human) writes land as <span className="font-mono">human-authored</span>.
          The calling key decides authority — not a trusted argument. Sign in to the{" "}
          <Link to="/notebook" className="text-amber-600 hover:underline dark:text-amber-400">
            Lab Notebook
          </Link>{" "}
          to read the registers with provenance seals intact.
        </p>
      </section>
    </div>
  );
}
