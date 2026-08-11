// `/factory` — model walkthrough: tech stack, crew, lifecycles, funding rails.

import { Link } from "react-router-dom";
import {
  CREW,
  FACTORY_DOCS,
  MODEL,
  PLANES,
  THREE_RULES,
} from "../../lib/factoryModel";
import LiveStats from "./LiveStats";

export default function FactoryPage() {
  const judgement = CREW.filter((r) => r.side === "judgement");
  const policy = CREW.filter((r) => r.side === "policy");

  return (
    <div className="page-frame px-6 py-12 space-y-14">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          The model
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          DPYC Agentic Software Factory
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          {MODEL.repos} repositories. A split roster: judgement roles run as agents;
          policy roles run as bash. The shape is explained by three rules, four planes,
          and two funding rails. Source of truth:{" "}
          <a
            href={FACTORY_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:underline dark:text-amber-400"
          >
            the machine-checked factory model
          </a>
          .
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Three rules</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {THREE_RULES.map((r, i) => (
            <div
              key={r.title}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                0{i + 1}
              </div>
              <div className="mt-1 text-sm font-medium">{r.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Four planes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANES.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {p.home}
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {p.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-stone-600 dark:text-zinc-400">
          The memory-and-money plane is why an agent&apos;s graph write is a paid, signed,
          patron-authenticated MCP call rather than a database connection.{" "}
          <Link to="/memory" className="text-amber-600 hover:underline dark:text-amber-400">
            What cypher-mcp stores →
          </Link>
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold">Crew roster</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
          Judgement gets an agent. Policy gets bash — every gate that can land code is
          LLM-free, and therefore immune to injection and to a dry key.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <CrewColumn title="Judgement" subtitle="LLM agents" roles={judgement} tone="amber" />
          <CrewColumn title="Policy" subtitle="Deterministic bash" roles={policy} tone="emerald" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Lifecycle
          title="Issue lifecycle"
          steps={[
            "Scout or a human files an issue (field report or ordinary GitHub issue).",
            "Porter triages: classification, disposition, actionable spec; may reject.",
            "Journeyman claims, implements the minimal fix, opens a PR, records rationale.",
            "QA reviews; PR Dialogue / PR Revision iterate with humans if needed.",
            "Policy gates (Doctrine Lint, tests, Deploy Verify) decide landing — no LLM.",
          ]}
        />
        <Lifecycle
          title="PR lifecycle"
          steps={[
            "PR opens with Closes #N; graph records the PR URL on the Issue node.",
            "CI + Doctrine Lint run. Money-gate and self-modification greps are deterministic.",
            "QA (agent) and/or required human reviewers leave verdicts.",
            "Auto-merge or Merge-on-Approval lands only after every gate is green.",
            "Deploy Verify confirms the live surface; Funding Sentinel watches for dry keys.",
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Two funding rails</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm font-medium">Inference rail</div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              Shared OpenRouter key. When it is exhausted the Funding Sentinel tags work{" "}
              <span className="font-mono">awaiting-funds</span>; the Credit Canary clears
              the tag and re-runs deferred agents once funded. A drained agent degrades
              rather than stalls.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm font-medium">Memory-and-money rail</div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              Patron sats on this operator, settled over Lightning via Tollbooth DPYC.
              Graph reads and writes are metered MCP calls. cypher-mcp sells
              operator-authored named queries — never raw graph access — over Neo4j
              AuraDB.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Live ledger</h2>
        <LiveStats />
      </section>
    </div>
  );
}

function CrewColumn({
  title,
  subtitle,
  roles,
  tone,
}: {
  title: string;
  subtitle: string;
  roles: typeof CREW;
  tone: "amber" | "emerald";
}) {
  const chip =
    tone === "amber"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${chip}`}>
          {subtitle}
        </span>
      </div>
      <ul className="space-y-2">
        {roles.map((r) => (
          <li
            key={r.name}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-sm font-medium">{r.name}</div>
            <div className="text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {r.blurb}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Lifecycle({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-xs leading-relaxed text-stone-600 dark:text-zinc-400">
            <span className="font-mono text-amber-600 dark:text-amber-400">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
