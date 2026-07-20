// The cover page — Front Matter masthead over the Table of Contents. Every
// register in the notebook is listed here with its purpose and whether reading
// it is free (operational) or metered (intention graph). This is the map the
// architect starts from.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  SearchCode,
  Gauge,
  ScrollText,
  Landmark,
  ArrowRight,
} from "lucide-react";
import FrontMatter from "./FrontMatter";
import { Page, SectionLabel, card, muted, faint } from "./ui";
import { readCache } from "../../lib/graphCache";
import type { CapabilitySummary } from "../../lib/mcp";

interface Entry {
  to: string;
  title: string;
  blurb: string;
  icon: ReactNode;
  meter: "free" | "metered";
  count?: string;
}

export default function Contents() {
  // Opportunistic cached counts — never triggers a paid read, just reflects one
  // if the architect has already visited that register this device.
  const caps = readCache<CapabilitySummary[]>("capabilities:list")?.data;

  const registers: Entry[] = [
    {
      to: "/capabilities",
      title: "Capabilities",
      blurb:
        "The abilities the fleet owns — each with its human-authored ‘why’ (doctrine) or an agent's inferred rationale, its owning and consuming services, and the symbols that realize it.",
      icon: <Boxes className="h-5 w-5" />,
      meter: "metered",
      count: caps ? `${caps.length} entries` : undefined,
    },
    {
      to: "/concordance",
      title: "Concordance",
      blurb:
        "Look up any keyword and see which services handle it and the full context pack — the one query that resolves twelve repos to one answer.",
      icon: <SearchCode className="h-5 w-5" />,
      meter: "metered",
    },
    {
      to: "/metrics",
      title: "Factory Metrics",
      blurb:
        "How the Service Desk locates code — graph, scoped-grep, or wide-grep. Watch wide-grep trend to zero as the graph learns. The token-savings ledger.",
      icon: <Gauge className="h-5 w-5" />,
      meter: "metered",
    },
    {
      to: "/catalog",
      title: "Query Catalog",
      blurb:
        "The published dynamic tool set and its prices — the apparatus of the graph service, read straight from the operator's pricing model.",
      icon: <ScrollText className="h-5 w-5" />,
      meter: "free",
    },
  ];

  return (
    <Page
      eyebrow="DPYC Agentic Service Desk"
      title="Cypher Lab Notebook"
      lede={
        <>
          A read-only architect's notebook over the intention graph that grounds the DPYC Software
          Factory — capabilities, code symbols, invariants, patent tracing, and the issues the
          Service Desk has triaged. Operational status is free; graph reads settle in Bitcoin
          Lightning and are cached so you rarely pay twice.
        </>
      }
    >
      <div className="mb-8">
        <SectionLabel>Colophon</SectionLabel>
        <FrontMatter />
      </div>

      <SectionLabel>Table of contents</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        {registers.map((e) => (
          <Link
            key={e.to}
            to={e.to}
            className={`${card} group flex flex-col gap-2 p-4 transition-colors hover:border-amber-300 dark:hover:border-amber-500/40`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400">
                {e.icon}
                <span className="font-serif text-lg font-semibold text-stone-900 dark:text-zinc-50">
                  {e.title}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-600" />
            </div>
            <p className={`text-sm leading-relaxed ${muted}`}>{e.blurb}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  e.meter === "free"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                }`}
              >
                {e.meter === "free" ? "free" : "metered"}
              </span>
              {e.count && <span className={faint}>{e.count}</span>}
            </div>
          </Link>
        ))}
      </div>

      <div className={`mt-8 ${card} flex items-start gap-3 p-4`}>
        <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className={`text-sm leading-relaxed ${muted}`}>
          Provenance is honest throughout: a{" "}
          <span className="font-medium text-emerald-700 dark:text-emerald-300">human-authored</span>{" "}
          rationale is doctrine — an agent cannot forge it — while an{" "}
          <span className="font-medium text-amber-700 dark:text-amber-300">agent-inferred</span> one
          is advice awaiting review. The notebook shows which is which on every entry.
        </p>
      </div>
    </Page>
  );
}
