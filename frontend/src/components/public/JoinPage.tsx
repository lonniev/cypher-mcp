// `/join` — visitors bring their own Nostr identity. Scout is not the on-ramp.

import { Link } from "react-router-dom";
import { Tx } from "@tollbooth-dpyc/web/react";
import { COMMUNITY_REPO } from "../../lib/factoryModel";
import { useT, WORDS } from "../../i18n";

export default function JoinPage() {
  const t = useT();
  return (
    <div className="page-frame px-6 py-12 space-y-12">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          {t("public.join.kicker")}
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          {t("public.join.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          {t("public.join.lede")}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">{t("public.join.why.title")}</h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.join.why.lede")}
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium">{t("public.join.read.title")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {t("public.join.read.body")}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium">{t("public.join.report.title")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {t("public.join.report.body")}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium">{t("public.join.propose.title")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {t("public.join.propose.body")}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.join.why.close")}
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Step
          n="1"
          title={t("public.join.step1.title")}
          body={t("public.join.step1.body")}
        />
        <Step
          n="2"
          title={t("public.join.step2.title")}
          body={t("public.join.step2.body")}
        />
        <Step
          n="3"
          title={t("public.join.step3.title")}
          body={t("public.join.step3.body")}
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-serif text-lg font-semibold">{t("public.join.scout.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.join.scout.body")}
        </p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-serif text-lg font-semibold">{t("public.join.example.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          <Tx
            ns={WORDS}
            k="public.join.example.body"
            components={{
              code: <span className="font-mono text-xs" />,
              issue: <a href="https://github.com/lonniev/cypher-mcp/issues/72" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline dark:text-amber-400" />,
            }}
          />
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium">{t("public.join.readGraph.title")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            {t("public.join.readGraph.body")}
          </p>
          <Link
            to="/notebook"
            className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            {t("public.join.readGraph.open")}
          </Link>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium">{t("public.join.readModel.title")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            {t("public.join.readModel.body")}
          </p>
          <a
            href={COMMUNITY_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t("public.join.readModel.link")}
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">{t("public.join.need.title")}</h2>
        <ul className="space-y-2 text-sm text-stone-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            {t("public.join.need1")}
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            <span><Tx ns={WORDS} k="public.join.need2" components={{ code: <span className="font-mono text-xs" /> }} /></span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            {t("public.join.need3")}
          </li>
        </ul>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400">{t("public.join.step", { n })}</div>
      <div className="mt-1 text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">{body}</p>
    </div>
  );
}
