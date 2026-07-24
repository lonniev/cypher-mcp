// A memorable issue-status glyph — a small colored badge with a glyph, not a bare
// dot: a green hard-hat for in-progress, a purple delivery box for done, an orange
// handshake for a delegated issue, a gray mark for one closed-not-planned.
//
// It FUSES the live GitHub state (is it still open, closed-completed, or
// closed-not-planned) with the graph's triage disposition (delegated to a peer).
// GitHub-closed wins: a stale "blocked/upstream" disposition on an issue that has
// since closed reads as Done, never Blocked — the peer isn't always "upstream",
// and a closed issue isn't blocked.

import { useLiveIssueStatus, type LiveIssueStatus } from "../../lib/githubStatus";
import { Tip } from "./dossier";
import { Icon, type IconName } from "./icons";

export type LifecycleKind = "in-progress" | "done" | "delegated" | "declined";

export interface Lifecycle {
  kind: LifecycleKind;
  icon: IconName;
  badge: string; // bg + text tailwind for the round glyph badge
  pill: string; // subtle bg + text tailwind for an inline text pill
  stamp: string; // text + border ink for the rubber stamp (matches the glyph color)
  label: string;
}

const IN_PROGRESS: Lifecycle = {
  kind: "in-progress", icon: "worker", label: "In progress",
  badge: "bg-emerald-500 text-white",
  pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  stamp: "text-emerald-700 border-emerald-600/60 dark:text-emerald-400",
};
const DONE: Lifecycle = {
  kind: "done", icon: "delivered", label: "Done",
  badge: "bg-violet-500 text-white",
  pill: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  stamp: "text-violet-700 border-violet-600/60 dark:text-violet-400",
};
const DELEGATED: Lifecycle = {
  kind: "delegated", icon: "handshake", label: "Delegated",
  badge: "bg-orange-500 text-white",
  pill: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  stamp: "text-orange-700 border-orange-600/60 dark:text-orange-400",
};
const DECLINED: Lifecycle = {
  kind: "declined", icon: "close", label: "Closed — not planned",
  badge: "bg-stone-400 text-white dark:bg-zinc-500",
  pill: "bg-stone-500/10 text-stone-600 dark:text-zinc-400",
  stamp: "text-stone-600 border-stone-500/60 dark:text-zinc-400",
};

// A disposition is "delegated" when the issue was handed to a peer service.
const DELEGATED_RE = /block|upstream|delegat|escalat|arbitrat|rout|hand.?off/i;
const RESOLVED_RE = /resolv|merg|fixed|done|shipped|complete|closed/i;
const DECLINED_RE = /reject|declin|wont|not.?planned|duplicate|invalid/i;

/// Fuse live GitHub state with the graph disposition into one lifecycle status.
/// GitHub-closed wins (a closed issue is Done/Declined, never still delegated);
/// among open issues the disposition decides delegated vs resolved vs in-progress.
export function issueLifecycle(live: LiveIssueStatus | null, disposition?: string): Lifecycle {
  const disp = disposition ?? "";
  if (live?.state === "closed") return live.reason === "not_planned" ? DECLINED : DONE;
  // GitHub state unknown/open — lean on the disposition.
  if (!live && DECLINED_RE.test(disp)) return DECLINED;
  if (DELEGATED_RE.test(disp)) return DELEGATED;
  if (RESOLVED_RE.test(disp)) return DONE;
  return IN_PROGRESS;
}

/// Display label for a raw graph disposition — the peer-handoff states read as
/// "Delegated" (the peer isn't always strictly "upstream"); an arbitration standoff
/// reads as "Arbitration". Everything else passes through unchanged.
export function dispositionLabel(disposition?: string): string {
  const disp = (disposition ?? "").trim();
  if (!disp) return disp;
  if (/arbitrat/i.test(disp)) return "Arbitration";
  if (DELEGATED_RE.test(disp)) return "Delegated";
  return disp;
}

/// The inline text form of the same fused status — a glyph + word ("Delegated",
/// "Done", "In progress"), for a card's metadata row where a corner badge is too terse.
export function IssueStatusPill({ url, disposition }: { url?: string; disposition?: string }) {
  const live = useLiveIssueStatus(url);
  if (!live && !disposition) return null;
  const life = issueLifecycle(live, disposition);
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] ${life.pill}`}>
      <Icon name={life.icon} size={11} /> {life.label}
    </span>
  );
}

export function IssueStatusGlyph({
  url,
  disposition,
  className = "",
  size = 18,
}: {
  url?: string;
  disposition?: string;
  className?: string;
  size?: number;
}) {
  const live = useLiveIssueStatus(url);
  // Nothing to derive from — no live state and no disposition — so show nothing.
  if (!live && !disposition) return null;
  const life = issueLifecycle(live, disposition);
  const glyph = Math.max(9, Math.round(size * 0.6));
  return (
    <span className={`absolute ${className}`}>
      <Tip text={`Status: ${life.label}`}>
        <span
          tabIndex={0}
          aria-label={`Status: ${life.label}`}
          style={{ width: size, height: size }}
          className={`grid cursor-help place-items-center rounded-full ring-2 ring-white dark:ring-zinc-900 ${life.badge}`}
        >
          <Icon name={life.icon} size={glyph} />
        </span>
      </Tip>
    </span>
  );
}
