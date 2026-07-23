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

/// Preset rolling windows for every time filter — the ONE vocabulary shared by
/// the registers' SinceFilter and the Recently Changed page. Shortest window
/// first (leftmost), "Any time" always last (far right). days=0 means no bound.
export const SINCE_PRESETS: { days: number; label: string }[] = [
  { days: 1, label: "24h" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 0, label: "Any time" },
];

/// The label for a since-days value (0 = Any time) — for count/summary text.
export function sinceLabel(days: number): string {
  return SINCE_PRESETS.find((p) => p.days === days)?.label ?? `${days}d`;
}
