// Graph timestamps are Neo4j `timestamp()` values — integer milliseconds since
// the epoch. Helpers to display and filter by them.

import { languageLocale } from "@tollbooth-dpyc/web";
import type { Translate } from "../i18n";

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

/// "now" / "3 hr. ago" / "5 days ago" / "2 mo. ago" / "1 yr. ago", in the reader's language.
export function relTime(ms: number | null): string {
  if (!ms) return "";
  const rtf = new Intl.RelativeTimeFormat(languageLocale(), { numeric: "auto", style: "short" });
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return rtf.format(0, "second");
  const m = Math.floor(s / 60);
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.floor(h / 24);
  if (d < 30) return rtf.format(-d, "day");
  const mo = Math.floor(d / 30);
  if (mo < 12) return rtf.format(-mo, "month");
  return rtf.format(-Math.floor(d / 365), "year");
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
export const sincePresets = (t: Translate): { days: number; label: string }[] => [
  { days: 1, label: t("notebook.since.day") },
  { days: 7, label: t("notebook.since.week") },
  { days: 30, label: t("notebook.since.month") },
  { days: 90, label: t("notebook.since.quarter") },
  { days: 0, label: t("notebook.since.any") },
];

/// The label for a since-days value (0 = Any time) — for count/summary text.
export function sinceLabel(t: Translate, days: number): string {
  return sincePresets(t).find((p) => p.days === days)?.label ?? t("notebook.since.days", { count: days });
}
