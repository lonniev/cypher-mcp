// `/memory` — why the intention graph exists, then what it stores.
// Leads with the reader's problem (agents forget; why decays) before any
// mechanism. See issue #78.

import { Link } from "react-router-dom";
import {
  MEMORY_STORES,
  PROVENANCE_HAZARD,
  PROVENANCE_MECHANISM,
  PROVENANCE_THESIS,
  RESOLVED_VIA,
} from "../../lib/factoryModel";
import LiveStats from "./LiveStats";

export default function MemoryPage() {
  return (
    <div className="page-frame px-6 py-12 space-y-14">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Cypher-MCP — where the factory remembers
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          The intention graph
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          The Tollbooth DPYC ecosystem is built and maintained by agentic workers.
          They triage issues, locate code, propose fixes, and revise the MCP services
          that make up the network.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Agents do not remember. Every session begins blind. Without somewhere to put
          what it learned, each agent re-derives the same understanding — re-reading the
          same repository, re-discovering the same structure, re-asking the same question
          about why a piece of code exists at all.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Cypher-MCP is where that understanding is kept and shared. It is the interface
          between the factory&apos;s agents and the factory&apos;s knowledge graph —
          priced, signed answers over Neo4j AuraDB, never raw graph access.
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Why &ldquo;intention&rdquo;</h2>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Most of what a codebase knows about itself is already recorded somewhere. The
          source says <em>what</em> exists. Git says <em>when</em> it changed and{" "}
          <em>who</em> changed it. Tests say what must remain true.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          None of them say <em>why</em>.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Why this service owns this capability. Why the retry is three attempts rather
          than five. Why an earlier approach was abandoned. That reasoning normally lives
          in a person&apos;s memory, a closed pull-request thread, or a conversation nobody
          wrote down — and it decays fastest of anything in the project, because it was
          never written where anyone would look.
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          The cost of losing it is paid later, by whoever changes the code next. They
          either re-derive the reasoning at full expense, or they change something whose
          purpose they never understood and break it. An intention graph records the why
          alongside the what. That is the whole idea. Everything else on this page is
          machinery in service of it.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">
          What it buys as the network grows
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Adoption produces change requests. Each one begins with the same questions:
          which service handles this, what code implements it, what constraints guard it,
          and what was decided here before. An agent with access to the graph answers
          those from the graph. An agent without it opens the repository and searches.
          That difference is measurable, and it is what the resolution statistics below
          record.
        </p>
        <LiveStats />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">How the code was found</h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          When an agent is given a task, its first job is locating the code that matters.
          That search is the expensive part — not the fix. Every resolution in the factory
          is recorded by how it was reached:
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
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          The proportion between them is how the graph proves it is worth what it costs to
          maintain. It is not a vanity metric. If wide-grep is not falling, the graph is
          not earning its keep.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold">What is stored</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
          Six first-class node families — the durable record agents write into and read
          from. Each lists the tools a caller would use.
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
          Agents may propose. Only humans authorize.
        </div>
        <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-zinc-200">
          {PROVENANCE_HAZARD}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {PROVENANCE_MECHANISM}
        </p>
        <p className="mt-4 font-serif text-lg leading-snug text-stone-800 dark:text-zinc-100">
          {PROVENANCE_THESIS}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
          Sign in to the{" "}
          <Link to="/notebook" className="text-amber-600 hover:underline dark:text-amber-400">
            Lab Notebook
          </Link>{" "}
          to read the registers with provenance seals intact.
        </p>
      </section>
    </div>
  );
}
