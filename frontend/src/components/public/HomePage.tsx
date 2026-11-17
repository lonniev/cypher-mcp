// `/` — one-screen pitch: what the Factory is, where this operator sits,
// live aggregates, and doors into /factory /memory /join /notebook.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Notebook, Factory, Brain, DoorOpen, ArrowRight } from "lucide-react";
import { Tx } from "@tollbooth-dpyc/web/react";
import LiveStats from "./LiveStats";
import { FACTORY_DOCS, MODEL, threeRules } from "../../lib/factoryModel";
import { useT, WORDS } from "../../i18n";

export default function HomePage() {
  const t = useT();
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
                {t("public.home.kicker")}
              </div>
            </div>
          </div>

          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t("public.home.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-zinc-400">
            {t("public.home.lede", { repos: MODEL.repos })}
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold">{t("public.home.live.title")}</h2>
          <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
            {t("public.home.live.body")}
          </p>
          <LiveStats />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {threeRules(t).map((r) => (
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
            {t("model.provenance.motto")}
          </div>
          <p className="mt-2 font-serif text-lg leading-snug text-stone-800 dark:text-zinc-100">
            {t("model.provenance.thesis")}
          </p>
          <p className="mt-2 text-xs text-stone-500 dark:text-zinc-400">
            <Tx
              ns={WORDS}
              k="public.home.provenance.note"
              components={{ why: <Link to="/memory" className="text-amber-600 hover:underline dark:text-amber-400" /> }}
            />
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Door
            to="/factory"
            icon={<Factory className="h-5 w-5" />}
            title={t("ui.nav.factory")}
            body={t("public.home.door.factory")}
          />
          <Door
            to="/memory"
            icon={<Brain className="h-5 w-5" />}
            title={t("ui.nav.memory")}
            body={t("public.home.door.memory")}
          />
          <Door
            to="/join"
            icon={<DoorOpen className="h-5 w-5" />}
            title={t("ui.nav.join")}
            body={t("public.home.door.join")}
          />
          <Door
            to="/notebook"
            icon={<Notebook className="h-5 w-5" />}
            title={t("ui.nav.notebook")}
            body={t("public.home.door.notebook")}
          />
        </section>

        <p className="text-xs text-stone-400 dark:text-zinc-500">
          <Tx
            ns={WORDS}
            k="public.home.source"
            components={{
              doc: <a href={FACTORY_DOCS} target="_blank" rel="noopener noreferrer" className="text-amber-600/90 hover:underline dark:text-amber-400/90" />,
              dpyc: <a href="https://tollbooth-dpyc.com" target="_blank" rel="noopener noreferrer" className="text-amber-600/90 hover:underline dark:text-amber-400/90" />,
            }}
          />
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
