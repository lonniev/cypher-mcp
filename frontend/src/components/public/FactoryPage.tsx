// `/factory` — model walkthrough: tech stack, crew, lifecycles, funding rails.

import { Link } from "react-router-dom";
import { Tx } from "@tollbooth-dpyc/web/react";
import { crew, FACTORY_DOCS, MODEL, planes, threeRules, type Role } from "../../lib/factoryModel";
import { useT, WORDS } from "../../i18n";
import LiveStats from "./LiveStats";

export default function FactoryPage() {
  const t = useT();
  const roster = crew(t);
  const judgement = roster.filter((r) => r.side === "judgement");
  const policy = roster.filter((r) => r.side === "policy");

  return (
    <div className="page-frame px-6 py-12 space-y-14">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          {t("public.factory.kicker")}
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          {t("public.factory.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          <Tx
            ns={WORDS}
            k="public.factory.lede"
            vars={{ repos: MODEL.repos }}
            components={{ doc: <a href={FACTORY_DOCS} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline dark:text-amber-400" /> }}
          />
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.factory.rules")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {threeRules(t).map((r, i) => (
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
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.factory.planes")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {planes(t).map((p) => (
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
          <Tx
            ns={WORDS}
            k="public.factory.planesNote"
            components={{ memory: <Link to="/memory" className="text-amber-600 hover:underline dark:text-amber-400" /> }}
          />
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold">{t("public.factory.crew")}</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
          {t("public.factory.crewNote")}
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <CrewColumn title={t("public.factory.judgement")} subtitle={t("public.factory.judgementSub")} roles={judgement} tone="amber" />
          <CrewColumn title={t("public.factory.policy")} subtitle={t("public.factory.policySub")} roles={policy} tone="emerald" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Lifecycle
          title={t("public.factory.issueLife")}
          steps={[t("public.factory.issue1"), t("public.factory.issue2"), t("public.factory.issue3"), t("public.factory.issue4"), t("public.factory.issue5")]}
        />
        <Lifecycle
          title={t("public.factory.prLife")}
          steps={[t("public.factory.pr1"), t("public.factory.pr2"), t("public.factory.pr3"), t("public.factory.pr4"), t("public.factory.pr5")]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.factory.rails")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm font-medium">{t("public.factory.inferenceRail")}</div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              <Tx ns={WORDS} k="public.factory.inferenceBody" components={{ code: <span className="font-mono" /> }} />
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm font-medium">{t("public.factory.moneyRail")}</div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {t("public.factory.moneyBody")}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.factory.ledger")}</h2>
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
  roles: Role[];
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
