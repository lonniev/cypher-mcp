// Live pull-request status, in the GitHub palette — green = open, purple = merged,
// rose = closed-unmerged, gray = closed-not-planned. Distinct from IssueStatusGlyph
// (which fuses the graph's TRIAGE disposition and speaks in worker/delivered/handshake
// glyphs): a PR's meaningful state is its GitHub lifecycle, read live from the API. The
// graph mirrors that state, but GitHub is the freshest source, so these overlay it.
//
// Both degrade to null on any failure (rate limit, offline, private repo), so a card or
// dossier renders exactly as before — just without the dot.

import { useLiveIssueStatus, ghStatusLook } from "../../lib/githubStatus";
import { Tip } from "./dossier";

/// A bare colored dot for a card corner or an inline chip.
export function PrStatusDot({ url, size = 8 }: { url?: string; size?: number }) {
  const live = useLiveIssueStatus(url);
  if (!live) return null;
  const look = ghStatusLook(live);
  return (
    <Tip text={look.label}>
      <span
        aria-label={look.label}
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 rounded-full ${look.dot}`}
      />
    </Tip>
  );
}

/// The inline dot + word form ("Merged", "Open pull request"), for a metadata row.
export function PrStatusPill({ url }: { url?: string }) {
  const live = useLiveIssueStatus(url);
  if (!live) return null;
  const look = ghStatusLook(live);
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600 dark:text-zinc-300">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${look.dot}`} /> {look.label}
    </span>
  );
}
