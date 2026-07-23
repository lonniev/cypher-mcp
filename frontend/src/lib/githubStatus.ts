// Live GitHub issue/PR status — a free, unauthenticated read straight from the
// GitHub REST API, distinct from the graph's triage disposition. The graph
// records what the Service Desk DID; this shows what GitHub says RIGHT NOW
// (an issue closed upstream, a PR merged) so a dossier's crest can carry the
// live open/closed state, not just the remembered one.
//
// Kept gentle on the 60-req/hr anonymous limit: each issue's status caches for
// the session, and ANY failure (rate limit, offline, private/renamed repo)
// degrades to null — the dossier renders exactly as before, just without a dot.

import { useEffect, useState } from "react";

export type GhState = "open" | "closed";
export type GhReason = "completed" | "not_planned" | "merged" | "reopened" | null;

export interface LiveIssueStatus {
  state: GhState;
  reason: GhReason;
  isPr: boolean;
}

// owner/repo/number parsed from a canonical github.com URL. We NEVER hardcode
// the owner — it rides in the issue_url the graph already carries.
function parseIssueUrl(url: string): { owner: string; repo: string; num: number } | null {
  const m = /github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/.exec(url);
  if (!m) return null;
  return { owner: m[1], repo: m[2], num: Number(m[3]) };
}

// Session-lived memo so navigating between dossiers never refetches a status.
const cache = new Map<string, LiveIssueStatus | null>();

async function fetchStatus(url: string): Promise<LiveIssueStatus | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  const parts = parseIssueUrl(url);
  if (!parts) {
    cache.set(url, null);
    return null;
  }
  try {
    // The issues endpoint answers for PRs too, and includes `pull_request`
    // (with merged_at) plus `state_reason` (completed | not_planned | reopened).
    const res = await fetch(
      `https://api.github.com/repos/${parts.owner}/${parts.repo}/issues/${parts.num}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) {
      cache.set(url, null);
      return null;
    }
    const j = await res.json();
    const isPr = !!j.pull_request;
    const merged = isPr && !!j.pull_request?.merged_at;
    const status: LiveIssueStatus = {
      state: j.state === "closed" ? "closed" : "open",
      reason: merged ? "merged" : ((j.state_reason as GhReason) ?? null),
      isPr,
    };
    cache.set(url, status);
    return status;
  } catch {
    cache.set(url, null);
    return null;
  }
}

/// Live status for one issue URL, or null while loading / on any failure.
export function useLiveIssueStatus(url?: string): LiveIssueStatus | null {
  const [status, setStatus] = useState<LiveIssueStatus | null>(() => (url ? cache.get(url) ?? null : null));
  useEffect(() => {
    if (!url) {
      setStatus(null);
      return;
    }
    let live = true;
    fetchStatus(url).then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, [url]);
  return status;
}

/// The GitHub palette made literal: green = open, purple = done (completed
/// issue / merged PR), gray = closed-not-planned, rose = a PR closed unmerged.
export function ghStatusLook(s: LiveIssueStatus): { dot: string; label: string } {
  if (s.state === "open") return { dot: "bg-emerald-500", label: s.isPr ? "Open pull request" : "Open on GitHub" };
  if (s.reason === "merged") return { dot: "bg-violet-500", label: "Merged" };
  if (s.isPr) return { dot: "bg-rose-500", label: "Closed — not merged" };
  if (s.reason === "not_planned") return { dot: "bg-stone-400 dark:bg-zinc-500", label: "Closed — not planned" };
  return { dot: "bg-violet-500", label: "Closed — completed" };
}
