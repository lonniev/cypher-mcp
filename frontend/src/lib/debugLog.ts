// On-screen MCP activity log (ported from taxsort-mcp's DebugPanel UX).
// A module-level ring buffer with pub/sub so the central callTool can push
// entries and a single DebugPanel can subscribe. Survives route changes AND
// reloads (persisted to localStorage), so an error that flips the view can
// still be read and copied afterward.

import { useRef, useState } from "react";

export interface DebugEntry {
  ts: string;
  type: "info" | "call" | "result" | "error";
  message: string;
}

const STORAGE_KEY = "cypher:debug-log:v1";
const MAX = 200;

function hydrate(): DebugEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DebugEntry[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

const _log: DebugEntry[] = hydrate();
const _listeners = new Set<() => void>();

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_log));
  } catch {
    /* quota / private mode — the in-memory buffer still works */
  }
}

export function debugPush(type: DebugEntry["type"], message: string): void {
  _log.unshift({ ts: new Date().toLocaleTimeString(), type, message });
  if (_log.length > MAX) _log.length = MAX;
  persist();
  _listeners.forEach((fn) => fn());
}

export function clearDebug(): void {
  _log.length = 0;
  persist();
  _listeners.forEach((fn) => fn());
}

/// The whole log as plain text (newest first) — for the Copy button so an
/// error can be pasted into a bug report even after the view changed.
export function debugLogText(): string {
  return _log.map((e) => `${e.ts}  ${e.type.toUpperCase()}  ${e.message}`).join("\n");
}

export function useDebugLog(): DebugEntry[] {
  const [, setTick] = useState(0);
  const ref = useRef<(() => void) | undefined>(undefined);
  if (!ref.current) {
    ref.current = () => setTick((t) => t + 1);
    _listeners.add(ref.current);
  }
  return _log;
}
