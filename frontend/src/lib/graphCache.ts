// Metered graph reads — cache-first, price-aware.
//
// The intention-graph read tools (context_pack, list_capabilities, …) are
// published dynamic tools that DEBIT SATS per call (refunded on error). The
// graph is small and changes slowly, so the lab notebook is cache-first:
//
//   - Every metered read is memoized in localStorage under a stable cache key,
//     with the fetch timestamp. A returning view renders the cached answer
//     instantly and for free, stamped with its age.
//   - The first visit to a view with no cache fetches once (the architect came
//     to read data; an empty page helps no one) and records the cost.
//   - A visible "Refresh" affordance re-fetches on demand, previewing the price
//     (via the FREE check_price) so a sat spend is never a surprise.
//
// This keeps the metered surface honest: nothing polls, nothing auto-refreshes
// on a timer, and the cost of every live read is shown before it is paid.

import { useCallback, useEffect, useRef, useState } from "react";

// A browser RELOAD (F5 / ⌘R) is a deliberate "give me fresh" gesture, so the
// metered queries on the page the user reloaded refetch instead of re-rendering
// a stale localStorage snapshot. A first visit ("navigate") or a back/forward
// restore stays cache-first. The flag is consumed once the reloaded page has
// mounted — the app shell calls consumeReloadRefresh() in a mount effect, which
// (React runs child effects before parent effects) fires AFTER the page's own
// queries have kicked off — so later client-side navigations don't force
// refreshes and re-spend sats.
function wasReloadNavigation(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}
let reloadPending = wasReloadNavigation();

/// Called once by the app shell after the initial page mounts, so a reload's
/// forced refresh applies only to the reloaded page — not to every register the
/// user later navigates to.
export function consumeReloadRefresh(): void {
  reloadPending = false;
}

// v3: bumped when the single-object wrappers began unwrapping the {success,rows}
// envelope's first row (explain_capability / explain_patent_element /
// issue_provenance). Abandoning older caches forces fresh, correctly-shaped
// fetches instead of rendering the stale envelope-spread shape.
const CACHE_PREFIX = "cypher:graph-cache:v3:";

interface CacheEnvelope<T> {
  data: T;
  at: number; // unix ms
}

export function readCache<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof parsed?.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): number {
  const at = Date.now();
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, at }));
  } catch {
    /* quota / private mode — degrade to no-cache, still return the stamp */
  }
  return at;
}

/// A human age like "just now" / "4m ago" / "2h ago" / "3d ago".
export function ageLabel(at: number | null): string {
  if (!at) return "never";
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export interface MeteredState<T> {
  data: T | null;
  cachedAt: number | null;
  loading: boolean;
  error: string | null;
  /// Run the read (also the first load when uncached).
  refresh: () => void;
  /// True the first time we render before any cache/fetch has resolved.
  cold: boolean;
}

/**
 * Cache-first graph read.
 *
 * @param cacheKey  stable key (include params, e.g. `capability:pricing`)
 * @param fetcher   the mcp wrapper that performs the call
 * @param opts.autoFetch    fetch once on mount when uncached (default true)
 */
export function useMetered<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  opts: { autoFetch?: boolean } = {},
): MeteredState<T> {
  const cached = readCache<T>(cacheKey);
  const [data, setData] = useState<T | null>(cached?.data ?? null);
  const [cachedAt, setCachedAt] = useState<number | null>(cached?.at ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cold, setCold] = useState<boolean>(!cached);
  const inFlight = useRef(false);

  const autoFetch = opts.autoFetch ?? true;

  const doFetch = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      // A tool can answer with a soft-error envelope ({success:false, error})
      // instead of raising. Surface it as an error rather than handing a shape
      // the view doesn't expect to the renderer (which could then crash).
      const soft = result as { success?: boolean; error?: string } | null;
      if (soft && typeof soft === "object" && !Array.isArray(soft) && soft.success === false) {
        throw new Error(soft.error || "The graph read failed.");
      }
      setData(result);
      setCachedAt(writeCache(cacheKey, result));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setCold(false);
      inFlight.current = false;
    }
    // fetcher is intentionally excluded — callers pass a fresh closure each
    // render; cacheKey identifies the resource.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // On cacheKey change (e.g. the caller switched the time window), re-hydrate
  // from that key's cache — show a prior result instantly, or nothing if none.
  // Only auto-fetch when the caller opts in (registers pass autoFetch:false so a
  // tab entry never triggers a fetch-all before the user has set their filters).
  useEffect(() => {
    const c = readCache<T>(cacheKey);
    setData(c?.data ?? null);
    setCachedAt(c?.at ?? null);
    setError(null);
    setCold(!c);
    // A browser reload is an explicit refresh: refetch the reloaded page's
    // queries even for cache-first (autoFetch:false) views and even when cached.
    if (reloadPending || (autoFetch && !c)) void doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return {
    data,
    cachedAt,
    loading,
    error,
    refresh: () => void doFetch(),
    cold,
  };
}
