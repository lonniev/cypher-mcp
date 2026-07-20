// Concordance — the keyword lookup. Enter any term and the graph answers two
// ways: which services handle it (which_service_handles) and the full context
// pack per matching capability (context_pack) — the one query that resolves
// twelve repos to a single grounded answer. Metered, cached per keyword.

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, FileCode2, ShieldAlert, GitPullRequestArrow } from "lucide-react";
import {
  contextPack,
  whichServiceHandles,
  type ContextPackEntry,
  type WhichServiceEntry,
} from "../../lib/mcp";
import { useMetered, readCache, writeCache } from "../../lib/graphCache";
import { IssueJump } from "./dossier";
import {
  Page,
  MeteredBar,
  SectionLabel,
  ProvenanceSeal,
  Empty,
  MeteredError,
  Outbound,
  XRef,
  card,
  faint,
  muted,
} from "./ui";

const RECENTS_KEY = "concordance:recents";

export default function Concordance() {
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [params] = useSearchParams();

  function commit(k: string) {
    const kw = k.trim();
    if (!kw) return;
    setInput(kw);
    setKeyword(kw);
    const prev = readCache<string[]>(RECENTS_KEY)?.data ?? [];
    writeCache(RECENTS_KEY, [kw, ...prev.filter((x) => x !== kw)].slice(0, 8));
  }

  // Deep-link: a capability's keyword tag lands here as /concordance?q=<term>.
  useEffect(() => {
    const q = params.get("q");
    if (q) commit(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const recents = readCache<string[]>(RECENTS_KEY)?.data ?? [];

  return (
    <Page
      eyebrow="Apparatus"
      title="Concordance"
      lede="Look up a term. The intention graph tells you which services own it and hands back the full context pack — rationale, owners, symbols, invariants, and precedent issues — for each matching capability."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(input);
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. vault, pricing, proof, courier…"
            className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-40"
        >
          Look up
        </button>
      </form>

      <div className="mb-6">
        <div className={`mb-1.5 text-[11px] uppercase tracking-widest ${faint}`}>Or open a known issue</div>
        <IssueJump compact />
      </div>

      {recents.length > 0 && !keyword && (
        <div className="mb-6">
          <div className={`mb-1.5 text-[11px] uppercase tracking-widest ${faint}`}>Recent lookups</div>
          <div className="flex flex-wrap gap-1.5">
            {recents.map((r) => (
              <button
                key={r}
                onClick={() => commit(r)}
                className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500 hover:border-amber-300 hover:text-amber-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-amber-300"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {!keyword ? (
        <Empty>Enter a keyword to search the graph.</Empty>
      ) : (
        <ConcordanceResult key={keyword} keyword={keyword} />
      )}
    </Page>
  );
}

interface Result {
  services: WhichServiceEntry[];
  packs: ContextPackEntry[];
}

function ConcordanceResult({ keyword }: { keyword: string }) {
  const m = useMetered<Result>(
    `concordance:${keyword}`,
    async () => {
      const [services, packs] = await Promise.all([
        whichServiceHandles(keyword),
        contextPack(keyword),
      ]);
      return { services, packs };
    },
  );

  const r = m.data;

  return (
    <>
      <MeteredBar
        cachedAt={m.cachedAt}
        loading={m.loading}
       
        onRefresh={m.refresh}
        note={`“${keyword}”`}
      />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <Empty>Searching the graph for “{keyword}”…</Empty>}

      {r && (
        <div className="space-y-7">
          <section>
            <SectionLabel>Handled by</SectionLabel>
            {r.services.length > 0 ? (
              <div className={`${card} divide-y divide-stone-100 dark:divide-zinc-800`}>
                {r.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono text-[13px]">{s.service ?? "—"}</span>
                    {s.capability && (
                      <XRef to={`/capabilities/${encodeURIComponent(s.capability)}`}>{s.capability}</XRef>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No service resolves “{keyword}”.</Empty>
            )}
          </section>

          <section>
            <SectionLabel>Context packs</SectionLabel>
            {r.packs.length > 0 ? (
              <div className="space-y-4">
                {r.packs.map((p, i) => (
                  <PackCard key={(p.capability ?? "") + i} p={p} />
                ))}
              </div>
            ) : (
              <Empty>No context pack matched “{keyword}”.</Empty>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function PackCard({ p }: { p: ContextPackEntry }) {
  const rationale = p.why ?? p.inferred_why;
  return (
    <div className={`${card} p-4`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {p.capability && (
          <Link
            to={`/capabilities/${encodeURIComponent(p.capability)}`}
            className="font-serif text-lg font-semibold text-stone-900 hover:text-amber-700 dark:text-zinc-50 dark:hover:text-amber-300"
          >
            {p.capability}
          </Link>
        )}
        <ProvenanceSeal provenance={p.provenance ?? (p.why ? "human-authored" : "llm-inferred-unverified")} />
      </div>

      {rationale && (
        <p className={`mb-3 text-sm leading-relaxed ${muted}`}>{rationale}</p>
      )}

      {(p.keywords ?? []).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {p.keywords!.map((k) => (
            <span key={k} className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
              {k}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(p.symbols ?? []).length > 0 && (
          <div>
            <div className={`mb-1 text-[11px] uppercase tracking-widest ${faint}`}>Symbols</div>
            <ul className="space-y-1">
              {p.symbols!.slice(0, 8).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px]">
                  <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" />
                  <span className="min-w-0">
                    <span className="font-mono text-stone-700 dark:text-zinc-200">{s.symbol ?? s.fqn}</span>
                    {(s.file ?? s.file_path) && (
                      <span className={`block truncate font-mono text-[11px] ${faint}`}>
                        {s.file ?? s.file_path}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(p.invariants ?? []).length > 0 && (
          <div>
            <div className={`mb-1 text-[11px] uppercase tracking-widest ${faint}`}>Invariants</div>
            <ul className="space-y-1">
              {p.invariants!.map((inv, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-stone-700 dark:text-zinc-200">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{inv}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(p.precedents ?? []).length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-zinc-800">
          <div className={`mb-1 text-[11px] uppercase tracking-widest ${faint}`}>Precedent issues</div>
          <ul className="space-y-1">
            {p.precedents!.map((pr, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px]">
                <GitPullRequestArrow className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" />
                <span>
                  <Outbound href={pr.url}>#{pr.number}</Outbound>
                  {pr.actionable_text && <span className={`ml-1.5 ${muted}`}>— {pr.actionable_text}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
