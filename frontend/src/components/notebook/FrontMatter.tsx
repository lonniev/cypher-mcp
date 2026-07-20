// Front Matter — the free operational masthead. Reads only FREE tools
// (service_status, session_status, get_pricing_model) so it refreshes at no
// cost and works even before the architect funds an npub. This is the
// notebook's colophon: what press it came off, and whether the press is warm.

import { useEffect, useState, type ReactNode } from "react";
import { Database, Radio, ShieldCheck, GitBranch } from "lucide-react";
import {
  getPricingModel,
  serviceStatus,
  sessionStatus,
  type PricingModel,
  type ServiceStatus,
  type SessionStatus,
} from "../../lib/mcp";
import { card, faint, muted } from "./ui";

interface Light {
  tone: "ok" | "warm" | "bad" | "idle";
  label: string;
}

function lifecycleLight(lifecycle?: string): Light {
  switch (lifecycle) {
    case "ready":
      return { tone: "ok", label: "Ready" };
    case "warming_up":
      return { tone: "warm", label: "Warming up" };
    case "quota_exceeded":
      return { tone: "bad", label: "Quota exceeded" };
    case "misconfigured":
      return { tone: "bad", label: "Misconfigured" };
    case "not_registered":
      return { tone: "bad", label: "Not registered" };
    case "no_identity":
      return { tone: "idle", label: "No identity" };
    default:
      return { tone: "idle", label: lifecycle ?? "Unknown" };
  }
}

const dot: Record<Light["tone"], string> = {
  ok: "bg-emerald-500",
  warm: "bg-amber-500",
  bad: "bg-rose-500",
  idle: "bg-zinc-400",
};

function Traffic({ light }: { light: Light }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${dot[light.tone]}`} />
      <span className="text-sm font-medium">{light.label}</span>
    </span>
  );
}

function Health({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : ok === false ? "bg-rose-500" : "bg-zinc-400"}`} />
      <span className={muted}>{label}</span>
    </span>
  );
}

export default function FrontMatter() {
  const [svc, setSvc] = useState<ServiceStatus | null>(null);
  const [sess, setSess] = useState<SessionStatus | null>(null);
  const [pricing, setPricing] = useState<PricingModel | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.allSettled([serviceStatus(), sessionStatus(), getPricingModel()]).then((r) => {
      if (!live) return;
      if (r[0].status === "fulfilled") setSvc(r[0].value);
      if (r[1].status === "fulfilled") setSess(r[1].value);
      if (r[2].status === "fulfilled") setPricing(r[2].value);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const light = lifecycleLight(sess?.lifecycle ?? svc?.lifecycle);
  const tools = pricing?.tools ?? [];
  const pricedCount = tools.filter((t) => t.priced || (t.price_sats ?? 0) > 0).length;
  const version = svc?.version;
  const sdk = svc?.tollbooth_version ?? svc?.tollbooth_dpyc_version;
  const durable = svc?.durable_jobs?.enabled;
  // patron_auth is an object ({mode, patron_credentials_required}) — show its mode.
  const patronAuth =
    typeof svc?.patron_auth === "object" && svc.patron_auth
      ? svc.patron_auth.mode ?? "—"
      : svc?.patron_auth ?? "—";

  return (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            Graph service
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <Traffic light={light} />
            {!loaded && <span className={faint}>reading status…</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Health ok={svc?.vault_ok} label="Vault" />
          <Health ok={svc?.courier_ok} label="Secure Courier" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Database className="h-4 w-4" />} label="Priced tools" value={loaded ? pricedCount : undefined} sub={`${tools.length} total`} />
        <Stat icon={<GitBranch className="h-4 w-4" />} label="MCP version" value={version ?? "—"} sub={sdk ? `SDK ${sdk}` : ""} isText />
        <Stat icon={<Radio className="h-4 w-4" />} label="Durable jobs" value={durable == null ? "—" : durable ? "on" : "off"} sub={svc?.durable_jobs?.backend ?? ""} isText />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Patron auth" value={patronAuth} isText />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  isText,
}: {
  icon: ReactNode;
  label: string;
  // `unknown` on purpose: these are wheel-returned fields; a scalar we assumed
  // could arrive as an object. Coerce defensively so a shape surprise can never
  // throw React error #31 ("objects are not valid as a React child").
  value?: unknown;
  sub?: string;
  isText?: boolean;
}) {
  const display =
    value === undefined || value === null
      ? "…"
      : typeof value === "number"
        ? value.toLocaleString()
        : typeof value === "string"
          ? value
          : JSON.stringify(value);
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2.5 dark:border-zinc-800/70 dark:bg-zinc-950/40">
      <div className="mb-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          {label}
        </span>
      </div>
      <div className={`${isText ? "text-sm" : "text-xl"} font-semibold tabular-nums`}>{display}</div>
      {sub && <div className={`mt-0.5 text-[11px] ${faint}`}>{sub}</div>}
    </div>
  );
}
