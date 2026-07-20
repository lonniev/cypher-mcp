// Dossier design system — the case-file layout primitives. Each actor in the
// graph is rendered as a folder-tabbed card: crest + nameplate + provenance
// stamp, a box-score stat line, then satellite cells. Provenance is a literal
// rubber stamp; tech-stack references carry their vendor/lang icon; features are
// taught with (i) tooltips, and rows carry compact icon actions (copy, open).

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, langIcon, type IconName } from "./icons";

// ─── Micro-affordances ─────────────────────────────────────────────────────

/// A hover/focus tooltip. Teaches without prose.
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex focus-within:z-30">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[230px] -translate-x-1/2 translate-y-1 rounded-lg bg-zinc-900 px-2.5 py-2 text-left text-[12px] font-normal normal-case leading-snug tracking-normal text-zinc-50 opacity-0 shadow-lg transition duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {text}
      </span>
    </span>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tip text={text}>
      <button
        type="button"
        aria-label="More information"
        className="grid h-5 w-5 place-items-center rounded text-[15px] text-stone-400 transition-colors hover:text-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-zinc-500 dark:hover:text-amber-400"
      >
        <Icon name="info" />
      </button>
    </Tip>
  );
}

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500";
const iconBtnIdle =
  "border-stone-200 text-stone-500 hover:border-amber-400 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-amber-400";

/// Copy a value to the clipboard; flashes a check.
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() =>
        navigator.clipboard?.writeText(value).then(
          () => {
            setOk(true);
            window.setTimeout(() => setOk(false), 1200);
          },
          () => {},
        )
      }
      className={`${iconBtn} ${ok ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : iconBtnIdle}`}
    >
      <Icon name={ok ? "check" : "copy"} />
    </button>
  );
}

/// A compact icon link (e.g. open on GitHub). Renders nothing without an href.
export function IconLink({ href, name, label }: { href?: string; name: IconName; label: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label} className={`${iconBtn} ${iconBtnIdle}`}>
      <Icon name={name} />
    </a>
  );
}

// ─── Card structure ────────────────────────────────────────────────────────

/// The warm "desk" a dossier sits on.
export function DossierWrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-4xl px-5 py-8">{children}</div>;
}

export function Dossier({
  accent = "blue",
  tab,
  tabNo,
  children,
}: {
  accent?: "blue" | "amber";
  tab: string;
  tabNo?: string;
  children: ReactNode;
}) {
  const tabBg = accent === "amber" ? "bg-amber-600" : "bg-[#35618e] dark:bg-[#6e9bc9]";
  const tabInk = accent === "amber" ? "text-white" : "text-stone-50 dark:text-zinc-900";
  return (
    <article className="relative rounded-[3px_14px_14px_14px] border border-stone-200 bg-white shadow-[0_14px_30px_-18px_rgba(60,48,30,0.25)] dark:border-zinc-800 dark:bg-zinc-900">
      <span
        className={`absolute -top-[15px] left-[-1px] inline-flex items-center gap-1.5 rounded-t-[7px] px-3 pb-1.5 pt-[5px] font-mono text-[11px] uppercase tracking-[0.16em] ${tabBg} ${tabInk}`}
      >
        {tabNo && <span className="opacity-70">{tabNo}</span>}
        {tab}
      </span>
      {children}
    </article>
  );
}

export function Crest({ initials }: { initials: string }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] border-[1.5px] border-amber-500/45 bg-amber-500/[0.14] font-serif text-lg font-bold text-amber-700 dark:text-amber-300">
      {initials}
    </div>
  );
}

export function DossierHead({
  crest,
  role,
  roleIcon,
  title,
  tags,
  stamp,
}: {
  crest: string;
  role: ReactNode;
  roleIcon?: IconName;
  title: string;
  tags?: string[];
  stamp?: ReactNode;
}) {
  return (
    <div className="relative flex gap-4 border-b border-stone-200 px-6 pb-5 pt-7 dark:border-zinc-800">
      <Crest initials={crest} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.13em] text-stone-400 dark:text-zinc-500">
          {roleIcon && <Icon name={roleIcon} className="text-[13px]" />}
          {role}
        </div>
        <h2 className="mb-2.5 font-serif text-[clamp(22px,3.4vw,30px)] font-semibold leading-tight tracking-tight text-balance">
          {title}
        </h2>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {stamp}
    </div>
  );
}

/// The rotated rubber stamp — provenance / disposition made literal.
export function Stamp({
  tone,
  icon,
  label,
  sub,
  tip,
}: {
  tone: "good" | "warn";
  icon: IconName;
  label: string;
  sub: string;
  tip: string;
}) {
  const c =
    tone === "good"
      ? "text-emerald-700 border-emerald-600/60 dark:text-emerald-400"
      : "text-amber-700 border-amber-600/60 dark:text-amber-400";
  return (
    <Tip text={tip}>
      <span
        tabIndex={0}
        className={`animate-stamp absolute right-5 top-5 flex -rotate-[7deg] cursor-help flex-col items-center gap-0.5 rounded-md border-[2.5px] px-3 pb-1.5 pt-[7px] font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${c}`}
      >
        <Icon name={icon} className="text-[15px]" />
        {label}
        <span className="text-[9px] font-medium tracking-[0.18em] opacity-80">{sub}</span>
      </span>
    </Tip>
  );
}

// ─── Box score ─────────────────────────────────────────────────────────────

export function BoxScore({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-stretch border-b border-stone-200 dark:border-zinc-800">{children}</div>;
}

export function Stat({ num, label, accent }: { num: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="min-w-[92px] flex-1 border-r border-stone-200 px-3.5 py-3 text-center last:border-r-0 dark:border-zinc-800">
      <div className={`font-mono text-2xl font-semibold tabular-nums ${accent ? "text-amber-600 dark:text-amber-400" : ""}`}>{num}</div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-stone-400 dark:text-zinc-500">{label}</div>
    </div>
  );
}

// ─── Cells ─────────────────────────────────────────────────────────────────

export function Cells({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 dark:bg-zinc-800">{children}</div>;
}

export function Cell({ span, children }: { span?: boolean; children: ReactNode }) {
  return <div className={`bg-white px-5 py-4 dark:bg-zinc-900 ${span ? "sm:col-span-2" : ""}`}>{children}</div>;
}

export function Eyebrow({ icon, children, count }: { icon: IconName; children: ReactNode; count?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-500">
      <Icon name={icon} className="text-[14px] text-stone-500 dark:text-zinc-400" />
      {children}
      {count != null && <span className="text-stone-400 dark:text-zinc-500">· {count}</span>}
    </div>
  );
}

// ─── Rows & chips ──────────────────────────────────────────────────────────

export function SymbolRow({
  fqn,
  file,
  lang,
  sha,
  ghHref,
  copyValue,
}: {
  fqn: string;
  file?: string;
  lang?: string;
  sha?: string;
  ghHref?: string;
  copyValue?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name={langIcon(lang, file)} className="text-[15px] text-[#35618e] dark:text-[#6e9bc9]" />
      <span className="min-w-0 truncate font-mono text-[13px]">{fqn}</span>
      {(file || sha) && (
        <span className="shrink-0 font-mono text-[11px] text-stone-400 dark:text-zinc-500">
          {file}
          {sha && <span className="ml-1.5 text-[#35618e] dark:text-[#6e9bc9]">@{sha.slice(0, 7)}</span>}
        </span>
      )}
      <span className="ml-auto flex shrink-0 gap-1.5">
        {copyValue && <CopyButton value={copyValue} label="Copy fully-qualified name" />}
        <IconLink href={ghHref} name="github" label="Open on GitHub" />
      </span>
    </div>
  );
}

const badge =
  "inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11.5px] text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-amber-300";

export function RepoBadge({ repo }: { repo: string }) {
  return (
    <Link to={`/services/${encodeURIComponent(repo)}`} className={badge}>
      <Icon name="github" className="text-[13px] text-stone-500 dark:text-zinc-400" />
      {repo}
    </Link>
  );
}

export function PatentBadge({ refNum, name }: { refNum: number; name?: string }) {
  return (
    <Link to={`/patent/${refNum}`} className={badge}>
      <span className="font-semibold text-amber-600 dark:text-amber-400">[{refNum}]</span>
      {name}
    </Link>
  );
}

/// The token-savings badge — how the Service Desk located the code.
export function ResolvedPill({ mode }: { mode?: string }) {
  const m = (mode ?? "").toLowerCase();
  const tone =
    m === "graph"
      ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
      : m === "wide-grep"
        ? "text-rose-700 bg-rose-500/10 dark:text-rose-300"
        : "text-amber-700 bg-amber-500/10 dark:text-amber-300";
  const dot = m === "graph" ? "bg-emerald-500" : m === "wide-grep" ? "bg-rose-500" : "bg-amber-500";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] ${tone}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      {mode ?? "—"}
    </span>
  );
}

/// Two-letter crest initials from a name.
export function initialsOf(name: string): string {
  const words = name.trim().split(/[\s\-_./]+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
