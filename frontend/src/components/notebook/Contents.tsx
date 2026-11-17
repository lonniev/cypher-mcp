// The cover page — Front Matter masthead over the Table of Contents. Every
// register in the notebook is listed here with its purpose. This is the map the
// architect starts from.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  History,
  GitPullRequestArrow,
  SearchCode,
  Gauge,
  ScrollText,
  Landmark,
  CalendarClock,
  ShieldCheck,
  Award,
  ArrowRight,
  Scale,
} from "lucide-react";
import FrontMatter from "./FrontMatter";
import { Page, SectionLabel, card, muted, faint } from "./ui";
import { readCache } from "../../lib/graphCache";
import type { CapabilitySummary } from "../../lib/mcp";
import { Tx } from "@tollbooth-dpyc/web/react";
import { useT, WORDS, type MessageKey } from "../../i18n";

interface Entry {
  to: string;
  title: string;
  blurb: string;
  icon: ReactNode;
  count?: string;
}

export default function Contents() {
  // Opportunistic cached counts — never triggers a paid read, just reflects one
  // if the architect has already visited that register this device.
  const caps = readCache<CapabilitySummary[]>("capabilities:list:since=0")?.data;

  const t = useT();
  const entry = (to: string, id: string, icon: ReactNode, count?: string): Entry => ({
    to,
    title: t(`notebook.contents.${id}.title` as MessageKey),
    blurb: t(`notebook.contents.${id}.blurb` as MessageKey),
    icon,
    count,
  });
  const registers: Entry[] = [
    entry("/notebook/recent", "recent", <CalendarClock className="h-5 w-5" />),
    entry("/notebook/capabilities", "capabilities", <Boxes className="h-5 w-5" />, caps ? t("notebook.contents.entries", { count: caps.length }) : undefined),
    entry("/notebook/issues", "issues", <History className="h-5 w-5" />),
    entry("/notebook/pulls", "pulls", <GitPullRequestArrow className="h-5 w-5" />),
    entry("/notebook/invariants", "invariants", <ShieldCheck className="h-5 w-5" />),
    entry("/notebook/patents", "patents", <Award className="h-5 w-5" />),
    entry("/notebook/concordance", "concordance", <SearchCode className="h-5 w-5" />),
    entry("/notebook/metrics", "metrics", <Gauge className="h-5 w-5" />),
    entry("/notebook/catalog", "catalog", <ScrollText className="h-5 w-5" />),
    entry("/notebook/audit", "audit", <Scale className="h-5 w-5" />),
  ];

  return (
    <Page
      eyebrow={t("notebook.contents.eyebrow")}
      title={t("notebook.contents.title")}
      lede={t("notebook.contents.lede")}
    >
      <div className="mb-8">
        <SectionLabel>{t("notebook.contents.colophon")}</SectionLabel>
        <FrontMatter />
      </div>

      <SectionLabel>{t("notebook.contents.toc")}</SectionLabel>
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
            {e.count && <div className={`mt-1 text-[11px] ${faint}`}>{e.count}</div>}
          </Link>
        ))}
      </div>

      <div className={`mt-8 ${card} flex items-start gap-3 p-4`}>
        <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className={`text-sm leading-relaxed ${muted}`}>
          <Tx
            ns={WORDS}
            k="notebook.contents.provenance"
            components={{
              human: <span className="font-medium text-emerald-700 dark:text-emerald-300" />,
              agent: <span className="font-medium text-amber-700 dark:text-amber-300" />,
            }}
          />
        </p>
      </div>
    </Page>
  );
}
