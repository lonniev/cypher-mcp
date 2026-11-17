// `/memory` — why the intention graph exists, then what it stores.
// Leads with the reader's problem (agents forget; why decays) before any
// mechanism. See issue #78.

import { Link } from "react-router-dom";
import { Tx } from "@tollbooth-dpyc/web/react";
import { memoryStores, resolvedVia } from "../../lib/factoryModel";
import { useT, WORDS } from "../../i18n";
import LiveStats from "./LiveStats";

export default function MemoryPage() {
  const t = useT();
  return (
    <div className="page-frame px-6 py-12 space-y-14">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          {t("public.memory.kicker")}
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          {t("public.memory.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          {t("public.memory.lede1")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.lede2")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.lede3")}
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.memory.why.title")}</h2>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          <Tx ns={WORDS} k="public.memory.why1" components={{ em: <em /> }} />
        </p>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          <Tx ns={WORDS} k="public.memory.why2" components={{ em: <em /> }} />
        </p>
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.why3")}
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.why4")}
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">
          {t("public.memory.grows.title")}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.grows.body")}
        </p>
        <LiveStats />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">{t("public.memory.found.title")}</h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("public.memory.found.body")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {resolvedVia(t).map((v) => (
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
          {t("public.memory.found.note")}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold">{t("public.memory.stored.title")}</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
          {t("public.memory.stored.body")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {memoryStores(t).map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-sm font-medium">{s.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                {s.body}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    cypher_{tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
          {t("model.provenance.motto")}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-zinc-200">
          {t("model.provenance.hazard")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {t("model.provenance.mechanism")}
        </p>
        <p className="mt-4 font-serif text-lg leading-snug text-stone-800 dark:text-zinc-100">
          {t("model.provenance.thesis")}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
          <Tx
            ns={WORDS}
            k="public.memory.signIn"
            components={{ notebook: <Link to="/notebook" className="text-amber-600 hover:underline dark:text-amber-400" /> }}
          />
        </p>
      </section>
    </div>
  );
}
