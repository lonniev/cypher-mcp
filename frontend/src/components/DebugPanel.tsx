// On-screen MCP activity log, ported from taxsort-mcp. A fixed bottom bar that
// shows every MCP call/result/error so you can see what the FE is doing —
// invaluable during bring-up and for watching metered graph reads settle.
//
// Hardened for capture: the log persists across reloads (localStorage), a Copy
// button grabs the whole thing, and uncaught errors + proof-expiry bounces are
// folded in — so an error that flips the view can still be read afterward.

import { useEffect, useState } from "react";
import { clearDebug, debugLogText, debugPush, useDebugLog, type DebugEntry } from "../lib/debugLog";
import { onProofExpired } from "../lib/mcp";

const TYPE_COLOR: Record<DebugEntry["type"], string> = {
  info: "text-sky-400",
  call: "text-amber-400",
  result: "text-green-400",
  error: "text-red-400",
};

const OPEN_KEY = "cypher:debug-open:v1";

function isFailure(entry: DebugEntry): boolean {
  if (entry.type === "error") return true;
  if (entry.type === "result") {
    const m = entry.message;
    return m.includes('"success":false') || m.includes('"error"') || m.includes("error_code");
  }
  return false;
}

// Fold uncaught errors, promise rejections, and proof bounces into the log —
// once per page, guarded so React StrictMode / remounts don't double-register.
let globalsWired = false;
function wireGlobalCapture(): void {
  if (globalsWired) return;
  globalsWired = true;
  window.addEventListener("error", (e) => debugPush("error", `window.error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) =>
    debugPush("error", `unhandledrejection: ${String((e as PromiseRejectionEvent).reason)}`),
  );
  onProofExpired((msg) => debugPush("info", `proof expired → returning to sign-in: ${msg}`));
}

export default function DebugPanel() {
  const log = useDebugLog();
  const [open, setOpen] = useState<boolean>(() => window.localStorage.getItem(OPEN_KEY) === "1");
  const [copied, setCopied] = useState(false);

  useEffect(() => wireGlobalCapture(), []);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      window.localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }

  function copy() {
    navigator.clipboard?.writeText(debugLogText()).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  const errorCount = log.filter(isFailure).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-end">
      {/* Control bar — always in flow ABOVE the panel, so the minimize (Hide)
          tab is never overlapped by the expanded log. */}
      <div className="flex gap-1 pr-3">
        {open && (
          <>
            <button
              onClick={copy}
              className="rounded-t-lg bg-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
              title="Copy the whole log to the clipboard"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={clearDebug}
              className="rounded-t-lg bg-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
            >
              Clear
            </button>
          </>
        )}
        <button
          onClick={toggle}
          className={`rounded-t-lg px-3 py-1 text-xs text-white ${
            errorCount > 0 ? "bg-red-700 hover:bg-red-600" : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          {open ? "Hide" : "Debug"} ({log.length}
          {errorCount > 0 ? ` · ${errorCount} err` : ""})
        </button>
      </div>
      {open && (
        <div className="max-h-64 w-full overflow-y-auto border-t border-zinc-700 bg-zinc-950/95 p-3 font-mono text-xs backdrop-blur">
          {log.length === 0 && <div className="text-zinc-500">No MCP activity yet.</div>}
          {log.map((entry, i) => {
            const failed = isFailure(entry);
            return (
              <div
                key={i}
                className={`flex gap-2 py-0.5 ${failed ? "-mx-1 rounded bg-red-950/60 px-1" : ""}`}
              >
                <span className="shrink-0 text-zinc-600">{entry.ts}</span>
                <span className={`w-12 shrink-0 ${failed ? "font-bold text-red-400" : TYPE_COLOR[entry.type]}`}>
                  {entry.type}
                  {failed && entry.type !== "error" ? " !" : ""}
                </span>
                <span className={`break-all ${failed ? "text-red-300" : "text-zinc-300"}`}>{entry.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
