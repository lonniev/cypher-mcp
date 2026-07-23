// A live GitHub status dot for an issue/PR — green = open, purple = done
// (completed issue / merged PR), gray = closed-not-planned, rose = PR closed
// unmerged. Best-effort: renders nothing until the free live read resolves, and
// nothing at all if it fails, so it decorates without ever blocking a view.
// Shared by the issue dossier crest and the Issues grid cards.

import { useLiveIssueStatus, ghStatusLook } from "../../lib/githubStatus";
import { Tip } from "./dossier";

export function GhStatusDot({
  url,
  className = "",
  size = 14,
}: {
  url?: string;
  /// Corner offset against the caller's `relative` container (e.g. "-bottom-1 -right-1").
  className?: string;
  size?: number;
}) {
  const live = useLiveIssueStatus(url);
  if (!live) return null;
  const look = ghStatusLook(live);
  return (
    // Outer span carries the absolute corner offset; Tip wraps the dot in its own
    // relative inline-flex, so the popover anchors to the dot, the dot to the crest.
    <span className={`absolute ${className}`}>
      <Tip text={`GitHub: ${look.label}`}>
        <span
          tabIndex={0}
          aria-label={`GitHub status: ${look.label}`}
          style={{ width: size, height: size }}
          className={`block cursor-help rounded-full ring-2 ring-white dark:ring-zinc-900 ${look.dot}`}
        />
      </Tip>
    </span>
  );
}
