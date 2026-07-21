// Service dossier — the case-file grammar with a service (repo) at center. Its
// owned and consumed capabilities, its indexed symbols, and the issues filed
// against it orbit around it. Same shape as every other detail page, pivoted.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { serviceProvenance, type ServiceProvenance } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { MeteredBar, MeteredError, muted, faint } from "./ui";
import { Icon, langIcon } from "./icons";
import QuoteScroller from "../QuoteScroller";
import {
  DossierWrap,
  Dossier,
  DossierHead,
  BoxScore,
  Stat,
  Cells,
  Cell,
  Eyebrow,
  initialsOf,
} from "./dossier";

function resolved(disposition?: string): boolean {
  return /resolv|merg|fixed|closed|done|shipped/i.test(disposition ?? "");
}

export default function ServiceDetail() {
  const { repo = "" } = useParams();
  const decoded = decodeURIComponent(repo);
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const m = useMetered<ServiceProvenance>(`service:${decoded}`, () => serviceProvenance(decoded));

  const d = m.data;
  const owns = d?.owns ?? [];
  const consumes = d?.consumes ?? [];
  const symbols = d?.symbols ?? [];
  const issues = d?.issues ?? [];
  const found = !!(d && (d.repo_name || owns.length || consumes.length || symbols.length || issues.length));

  const symFiltered = symbols.filter((s) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return ((s.symbol ?? s.fqn ?? "") + (s.file ?? s.file_path ?? "")).toLowerCase().includes(needle);
  });

  return (
    <DossierWrap>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => nav(-1)} className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}>
          <Icon name="back" size={15} /> Back
        </button>
      </div>
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.loading && !d && <QuoteScroller heading="Reading the service…" className="py-12" />}

      {!m.error && !m.loading && d && !found && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Icon name="close" size={22} className="mx-auto mb-2 text-stone-300 dark:text-zinc-600" />
          <div className="font-serif text-lg font-semibold">No such service in the graph</div>
          <p className={`mx-auto mt-1.5 max-w-md text-sm ${muted}`}>
            <span className="font-mono text-stone-600 dark:text-zinc-300">{decoded}</span> hasn't been registered in the intention graph.
          </p>
        </div>
      )}

      {found && (
        <Dossier accent="blue" tab="Service" tabNo="Case file">
          <DossierHead crest={initialsOf(decoded)} role="Service · repository" roleIcon="github" title={decoded} />

          <BoxScore>
            <Stat icon="verified" num={owns.length} label="Owns" accent drill="svc-owns" tip="Capabilities this service owns and provides." />
            <Stat icon="groups" num={consumes.length} label="Consumes" drill="svc-consumes" tip="Capabilities this service depends on." />
            <Stat icon="symbol" num={symbols.length} label="Symbols" drill="svc-symbols" tip="Code symbols indexed to this service." />
            <Stat icon="history" num={issues.length} label="Issues" drill="svc-issues" tip="Issues filed against this service." />
          </BoxScore>

          <Cells>
            <Cell id="svc-owns">
              <Eyebrow icon="verified" count={owns.length} info="Capabilities this service owns — the reverse of a capability's Owners cell.">Owns</Eyebrow>
              {owns.length ? (
                <div className="flex flex-wrap gap-2">
                  {owns.map((c) => (
                    <Link key={c} to={`/capabilities/${encodeURIComponent(c)}`} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                      <Icon name="verified" size={13} className="text-stone-500 dark:text-zinc-400" /> {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>Owns no capability yet.</p>
              )}
            </Cell>

            <Cell id="svc-consumes">
              <Eyebrow icon="groups" count={consumes.length} info="Capabilities this service consumes.">Consumes</Eyebrow>
              {consumes.length ? (
                <div className="flex flex-wrap gap-2">
                  {consumes.map((c) => (
                    <Link key={c} to={`/capabilities/${encodeURIComponent(c)}`} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300">
                      <Icon name="verified" size={13} className="text-stone-500 dark:text-zinc-400" /> {c}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>Consumes no tracked capability.</p>
              )}
            </Cell>

            <Cell id="svc-issues" span>
              <Eyebrow icon="history" count={issues.length} info="Issues filed against this service.">Issues</Eyebrow>
              {issues.length ? (
                <ul className="flex flex-col gap-2">
                  {issues.map((i, k) => (
                    <li key={k} className="flex items-center gap-2.5">
                      <Icon name="github" size={15} className="text-stone-500 dark:text-zinc-400" />
                      {i.repo_name && i.number != null ? (
                        <Link to={`/issues/${encodeURIComponent(i.repo_name)}/${i.number}`} className="font-mono text-[12.5px] text-amber-700 hover:underline dark:text-amber-300">#{i.number}</Link>
                      ) : (
                        <span className="font-mono text-[12.5px]">#{i.number}</span>
                      )}
                      {i.title && <span className={`truncate text-[13px] ${muted}`}>{i.title}</span>}
                      {i.disposition && (
                        <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10.5px] ${resolved(i.disposition) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                          {i.disposition}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${muted}`}>No issue filed against this service.</p>
              )}
            </Cell>

            <Cell id="svc-symbols" span>
              <Eyebrow icon="symbol" count={symbols.length} info="Indexed code symbols. Each opens its own dossier.">Symbols</Eyebrow>
              {symbols.length ? (
                <>
                  {symbols.length > 8 && (
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Filter symbols…"
                      className="mb-2.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  )}
                  <div className="flex flex-col gap-1.5">
                    {symFiltered.map((s, k) => {
                      const fqn = s.symbol ?? s.fqn ?? "";
                      return (
                        <div key={fqn + k} className="flex items-center gap-2.5">
                          <Icon name={langIcon(s.lang, s.file ?? s.file_path)} size={15} className="text-[#35618e] dark:text-[#6e9bc9]" />
                          <Link to={`/symbol?fqn=${encodeURIComponent(fqn)}`} className="min-w-0 truncate font-mono text-[13px] hover:text-amber-700 hover:underline dark:hover:text-amber-300">{fqn}</Link>
                          {(s.file ?? s.file_path) && <span className={`shrink-0 font-mono text-[11px] ${faint}`}>{s.file ?? s.file_path}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className={`text-sm ${muted}`}>No symbol indexed to this service yet.</p>
              )}
            </Cell>
          </Cells>
        </Dossier>
      )}
    </DossierWrap>
  );
}
