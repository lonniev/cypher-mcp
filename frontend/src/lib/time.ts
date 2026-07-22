// Graph timestamps are Neo4j `timestamp()` values — integer milliseconds since
// the epoch. Helpers to display and filter by them.

/// Coerce a graph timestamp (ms number, numeric string, or ISO) to unix ms, or
/// null if absent/unparseable.
export function toMillis(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v > 0 ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/// "just now" / "3h ago" / "5d ago" / "2mo ago" / "1y ago".
export function relTime(ms: number | null): string {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/// True when the timestamp falls within the last `days` (or when days is 0/None
/// meaning "any time"). Rows with no timestamp only pass the "any time" filter.
export function withinDays(ms: number | null, days: number): boolean {
  if (!days) return true;
  if (ms == null) return false;
  return ms >= Date.now() - days * 86_400_000;
}

/// Preset windows for the "added since" filter.
export const SINCE_PRESETS: { days: number; label: string }[] = [
  { days: 0, label: "Any time" },
  { days: 1, label: "24h" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

// ─── Bounded date-range chiclets (Recently Changed register) ───────────────
// Unlike SINCE_PRESETS (a lower bound only), these resolve to a concrete
// [sinceMs, untilMs) window. "Yesterday" is genuinely bounded on BOTH ends —
// which is why recent_activity takes an until_ms upper bound, not just a floor.

export type RangeKey = "today" | "yesterday" | "7d" | "month" | "any";

export interface DateRange {
  key: RangeKey;
  label: string;
  sinceMs: number; // 0 = from the beginning
  untilMs: number; // 0 = open (up to now)
}

const DAY_MS = 86_400_000;

function startOfToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/// Resolve a chiclet preset to a concrete window. Bounded presets (yesterday)
/// set untilMs; recency windows (today / 7d / month) run through now (untilMs=0).
export function rangeFor(key: RangeKey): DateRange {
  const today = startOfToday();
  switch (key) {
    case "today":
      return { key, label: "Today", sinceMs: today, untilMs: 0 };
    case "yesterday":
      return { key, label: "Yesterday", sinceMs: today - DAY_MS, untilMs: today };
    case "7d":
      return { key, label: "Last 7 days", sinceMs: today - 6 * DAY_MS, untilMs: 0 };
    case "month":
      return { key, label: "Last 30 days", sinceMs: today - 29 * DAY_MS, untilMs: 0 };
    case "any":
    default:
      return { key, label: "Any time", sinceMs: 0, untilMs: 0 };
  }
}

export const RANGE_PRESETS: RangeKey[] = ["today", "yesterday", "7d", "month", "any"];
