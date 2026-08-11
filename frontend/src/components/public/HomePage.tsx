// `/` — one-screen pitch: what the Factory is, where this operator sits,
// live aggregates, and doors into /factory /memory /join /notebook.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Notebook, Factory, Brain, DoorOpen, ArrowRight } from "lucide-react";
import LiveStats from "./LiveStats";
import { FACTORY_DOCS, MODEL, THREE_RULES, PROVENANCE_THESIS } from "../../lib/factoryModel";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl"
      />

      <div className="relative page-frame px-6 py-14 sm:py-18 space-y-14">
        <section>
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30">
              <Factory className="h-6 w-6" />
            </span>
            <div>
              <div className="font-serif text-2xl font-semibold tracking-tight">
                Cypher <span className="font-normal text-stone-400 dark:text-zinc-500">MCP</span>
              </div>
              <div className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Memory plane of the DPYC Agentic Software Factory
              </div>
            </div>
          </div>

          <h1 className="max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            An unattended crew that builds software — and a graph that remembers why.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-zinc-400">
            The DPYC Agentic Software Factory is {MODEL.repos} repositories and a roster of
            judgement and policy roles. Behavior evolves by PR; the workflow skeleton that
            grants powers is human-only; containment is funding, not policy. cypher-mcp is
            the only component a curious stranger can reach without a GitHub account, an
            nsec, or an invitation — so it speaks for the architecture.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold">Live from the intention graph</h2>
          <p className="mb-4 max-w-2xl text-sm text-stone-500 dark:text-zinc-400">
            Aggregate counts only — no issue titles, no symbol paths, no npubs. The
            resolved_via mix is the argument that the graph pays for itself.
          </p>
          <LiveStats />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {THREE_RULES.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-stone-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="text-sm font-medium">{r.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {r.body}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Agents may propose. Only humans authorize.
          </div>
          <p className="mt-2 max-w-3xl font-serif text-lg leading-snug text-stone-800 dark:text-zinc-100">
            {PROVENANCE_THESIS}
          </p>
          <p className="mt-2 text-xs text-stone-500 dark:text-zinc-400">
            A confident guess recorded as fact is worse than no record — so inferred advice
            and human doctrine are never conflated.{" "}
            <Link to="/memory" className="text-amber-600 hover:underline dark:text-amber-400">
              Why the graph keeps them apart →
            </Link>
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Door
            to="/factory"
            icon={<Factory className="h-5 w-5" />}
            title="Factory"
            body="Crew roster, four planes, issue and PR lifecycles, the two funding rails."
          />
          <Door
            to="/memory"
            icon={<Brain className="h-5 w-5" />}
            title="Memory"
            body="What this operator stores and why — capabilities, symbols, invariants, decisions."
          />
          <Door
            to="/join"
            icon={<DoorOpen className="h-5 w-5" />}
            title="Join"
            body="Scout is the on-ramp. File a field report under your own proven npub."
          />
          <Door
            to="/notebook"
            icon={<Notebook className="h-5 w-5" />}
            title="Lab Notebook"
            body="Sign in to read the full intention graph — registers, concordance, metrics."
          />
        </section>

        <p className="text-xs text-stone-400 dark:text-zinc-500">
          Model source:{" "}
          <a
            href={FACTORY_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600/90 hover:underline dark:text-amber-400/90"
          >
            factory-model.html
          </a>{" "}
          (machine-checked in dpyc-community). Powered by{" "}
          <a
            href="https://tollbooth-dpyc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600/90 hover:underline dark:text-amber-400/90"
          >
            Tollbooth DPYC™
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function Door({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-stone-200 bg-white/70 p-4 transition-colors hover:border-amber-400/50 hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/5"
    >
      <div className="mb-2 flex items-center justify-between text-amber-500">
        {icon}
        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">{body}</div>
    </Link>
  );
}
