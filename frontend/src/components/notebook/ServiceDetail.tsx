// Service leaf — the code concordance for one repo. symbols_in_service lists
// every indexed symbol (fqn → file, language) the graph knows for a service.
// Reached by cross-reference from any capability that names this repo as an
// owner or consumer.

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { symbolsInService, type GraphSymbol } from "../../lib/mcp";
import { useMetered } from "../../lib/graphCache";
import { Page, MeteredBar, SectionLabel, Empty, MeteredError, card, faint, muted } from "./ui";

export default function ServiceDetail() {
  const { repo = "" } = useParams();
  const decoded = decodeURIComponent(repo);
  const [q, setQ] = useState("");

  const m = useMetered<GraphSymbol[]>(
    `service:${decoded}`,
    () => symbolsInService(decoded),
  );

  const rows = m.data ?? [];

  // Group symbols by file — a lab-notebook code concordance reads by file.
  const byFile = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const groups = new Map<string, GraphSymbol[]>();
    for (const s of rows) {
      const fqn = (s.symbol ?? s.fqn ?? "").toLowerCase();
      const file = s.file ?? s.file_path ?? "(unknown file)";
      if (needle && !fqn.includes(needle) && !file.toLowerCase().includes(needle)) continue;
      const list = groups.get(file) ?? [];
      list.push(s);
      groups.set(file, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, q]);

  return (
    <Page
      eyebrow="Service"
      title={decoded}
      lede="The symbols the intention graph has indexed for this repository, grouped by file."
      actions={
        <Link
          to="/capabilities"
          className={`inline-flex items-center gap-1 text-sm ${muted} hover:text-amber-700 dark:hover:text-amber-300`}
        >
          <ArrowLeft className="h-4 w-4" /> Capabilities
        </Link>
      }
    >
      <MeteredBar cachedAt={m.cachedAt} loading={m.loading} onRefresh={m.refresh} />
      {m.error && <MeteredError error={m.error} />}
      {!m.error && m.cold && m.loading && <Empty>Reading indexed symbols…</Empty>}

      {m.data && (rows.length === 0 ? (
        <Empty>No symbols indexed for {decoded} yet.</Empty>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by symbol or file…"
            className="mb-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className={`mb-3 text-xs ${faint}`}>
            {rows.length} symbols across {byFile.length} files
          </div>
          <div className="space-y-5">
            {byFile.map(([file, syms]) => (
              <section key={file}>
                <SectionLabel>{file}</SectionLabel>
                <div className={`${card} divide-y divide-stone-100 dark:divide-zinc-800`}>
                  {syms.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <FileCode2 className="h-4 w-4 shrink-0 text-stone-400 dark:text-zinc-500" />
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                        {s.symbol ?? s.fqn}
                      </span>
                      {s.lang && <span className={`text-[11px] ${faint}`}>{s.lang}</span>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ))}
    </Page>
  );
}
