// Audit — one envelope, six questions. Answers the PROV-ish audit catalog
// (why_exists / who_authorized / what_derived_from / what_guards /
// what_contradicts / what_changed_since) with a shared rendering:
//
//   - PROV term as a small monospace badge beside a plain-English sentence
//   - confidence as a band (Authorized / Asserted / Suggested), not a decimal
//   - effectivity as one line ("In effect since …" / "Superseded …")
//   - contradictions as a banner ABOVE the answer, never buried
//   - gaps as an honest work queue (silence is never a valid audit response)
//
// The date control at the top re-runs against valid_from/valid_to (as_at_ms).

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, HelpCircle, ShieldCheck, Sparkle } from "lucide-react";
import {
  AUDIT_QUESTIONS,
  auditQuery,
  confidenceBand,
  listCapabilities,
  type AuditAssertion,
  type AuditContradiction,
  type AuditEnvelope,
  type AuditQuestion,
  type CapabilitySummary,
} from "../../lib/mcp";
import { useMetered, readCache } from "../../lib/graphCache";
import { relTime, toMillis } from "../../lib/time";
import { Page, SectionLabel, Empty, ErrorNote, faint, muted, card } from "./ui";

function ProvBadge({ term }: { term?: string }) {
  if (!term) return null;
  const label = term.startsWith("prov:") ? term : `prov:${term}`;
  return (
    <span
      className="inline-flex items-center rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      title={label}
    >
      {label}
    </span>
  );
}

function StatusBand({ assertion }: { assertion: AuditAssertion }) {
  const band = confidenceBand(assertion.confidence, assertion.status);
  const tone =
    band === "Authorized"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
      : band === "Asserted"
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-stone-300 bg-stone-50 text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  const Icon = band === "Authorized" ? ShieldCheck : band === "Suggested" ? Sparkle : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon className="h-3 w-3" />
      {band}
    </span>
  );
}

function effectivityLine(a: AuditAssertion): string {
  const from = toMillis(a.valid_from);
  const to = toMillis(a.valid_to);
  if (a.status === "superseded" || to != null) {
    return `Superseded ${to ? relTime(to) : ""}`.trim();
  }
  if (from != null) return `In effect since ${relTime(from)}`;
  const gen = toMillis(a.generated_at);
  if (gen != null) return `Recorded ${relTime(gen)}`;
  return "";
}

function plainEnglish(a: AuditAssertion): string {
  const role = a.agent?.role || a.agent?.label || "Unknown";
  const when = toMillis(a.generated_at);
  const whenBit = when ? ` on ${new Date(when).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "";
  if (a.status === "authorized") return `Authorized by ${role} in role ${role}${whenBit}`;
  if (a.status === "suggested") return `Suggested by ${role}${whenBit}`;
  if (a.status === "superseded") return `Superseded claim formerly by ${role}${whenBit}`;
  return `Asserted by ${role}${whenBit}`;
}

function sideLabel(side: AuditContradiction["left"]): string {
  if (side == null) return "—";
  if (typeof side === "string") return side;
  return side.statement || side.id || "—";
}

function ContradictionBanner({ items }: { items: AuditContradiction[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
        <AlertTriangle className="h-4 w-4" />
        Contradictions
      </div>
      <ul className="space-y-2">
        {items.map((c, i) => (
          <li key={i} className="grid gap-1 text-sm text-rose-900 dark:text-rose-100 sm:grid-cols-2">
            <div className={`${card} border-rose-200 p-2 dark:border-rose-500/30`}>
              <div className={`text-[10px] uppercase tracking-widest ${faint}`}>
                {c.kind || "Claim"} · left
              </div>
              <div>{sideLabel(c.left)}</div>
            </div>
            <div className={`${card} border-rose-200 p-2 dark:border-rose-500/30`}>
              <div className={`text-[10px] uppercase tracking-widest ${faint}`}>
                {c.kind || "Claim"} · right
              </div>
              <div>{sideLabel(c.right)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GapsList({ gaps }: { gaps: string[] }) {
  if (!gaps.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
        <HelpCircle className="h-4 w-4" />
        Gaps — what is not asserted
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950 dark:text-amber-100">
        {gaps.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
    </div>
  );
}

function AssertionCard({ a }: { a: AuditAssertion }) {
  const effect = effectivityLine(a);
  return (
    <article className={`${card} p-4`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ProvBadge term={a.prov} />
        <StatusBand assertion={a} />
        {a.severity ? (
          <span className={`font-mono text-[11px] ${muted}`}>severity: {a.severity}</span>
        ) : null}
        {a.name ? (
          <Link
            to={`/invariants/${encodeURIComponent(a.name)}`}
            className="font-mono text-[11px] text-amber-700 hover:underline dark:text-amber-400"
          >
            {a.name}
          </Link>
        ) : null}
      </div>
      <p className={`mb-1 text-xs ${muted}`}>{plainEnglish(a)}</p>
      <p className="text-sm leading-relaxed text-stone-800 dark:text-zinc-100">
        {a.statement || <span className={faint}>(no statement)</span>}
      </p>
      {effect ? <p className={`mt-2 text-[11px] ${faint}`}>{effect}</p> : null}
    </article>
  );
}

export default function Audit() {
  const capsCached = readCache<CapabilitySummary[]>("capabilities:list:since=0")?.data ?? [];
  const [name, setName] = useState(capsCached[0]?.name ?? "");
  const [question, setQuestion] = useState<AuditQuestion>("why_exists");
  const [asAt, setAsAt] = useState<string>(""); // yyyy-mm-dd; empty = now
  const [sinceDays, setSinceDays] = useState(30);

  // Opportunistic capability list for the picker (metered once if uncached).
  const capsMeter = useMetered<CapabilitySummary[]>("capabilities:list:since=0", () =>
    listCapabilities({ sinceMs: 0 }),
  );
  const capNames = useMemo(() => {
    const rows = capsMeter.data ?? capsCached;
    return [...new Set(rows.map((c) => String(c.name ?? "")).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [capsMeter.data, capsCached]);

  const asAtMs = useMemo(() => {
    if (!asAt) return 0;
    const t = Date.parse(asAt + "T23:59:59Z");
    return Number.isFinite(t) ? t : 0;
  }, [asAt]);

  const sinceMs = useMemo(() => Date.now() - sinceDays * 86_400_000, [sinceDays]);

  const meta = AUDIT_QUESTIONS.find((q) => q.id === question)!;
  const cacheKey = `audit:${question}:${name}:as=${asAtMs}:since=${meta.needsSince ? sinceMs : 0}`;

  const m = useMetered<AuditEnvelope>(
    cacheKey,
    async () => {
      if (!name.trim()) return { gaps: ["pick a capability to audit"] };
      return auditQuery(question, name.trim(), {
        asAtMs,
        sinceMs: meta.needsSince ? sinceMs : undefined,
      });
    },
    { autoFetch: Boolean(name.trim()), refetchOnKeyChange: true },
  );

  const envelope = m.data;
  const assertions = envelope?.assertions ?? [];
  const contradictions = envelope?.contradictions ?? [];
  const gaps = envelope?.gaps ?? [];

  return (
    <Page
      eyebrow="Apparatus · Metered"
      title="Audit"
      lede="Six audit questions over the intention graph — one shared envelope. PROV terms ride as badges; contradictions surface as a banner; gaps name what is not asserted."
      actions={
        <button
          onClick={() => m.refresh()}
          disabled={m.loading || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
        >
          <RefreshCw className={`h-3 w-3 ${m.loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      }
    >
      {(m.error || envelope?.error) && <ErrorNote>{m.error || envelope?.error}</ErrorNote>}

      <div className={`${card} mb-6 grid gap-4 p-4 sm:grid-cols-2`}>
        <label className="block text-sm">
          <span className={`mb-1 block text-[11px] font-mono uppercase tracking-widest ${faint}`}>
            Capability
          </span>
          <input
            list="audit-caps"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monetized Named-Query Catalog"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
          <datalist id="audit-caps">
            {capNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        <label className="block text-sm">
          <span className={`mb-1 block text-[11px] font-mono uppercase tracking-widest ${faint}`}>
            As-of date (valid time)
          </span>
          <input
            type="date"
            value={asAt}
            onChange={(e) => setAsAt(e.target.value)}
            disabled={meta.needsSince}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className={`mt-1 block text-[11px] ${faint}`}>
            Empty = now. Filters assertion valid_from / valid_to.
          </span>
        </label>

        {meta.needsSince && (
          <label className="block text-sm sm:col-span-2">
            <span className={`mb-1 block text-[11px] font-mono uppercase tracking-widest ${faint}`}>
              Changed since (days)
            </span>
            <input
              type="number"
              min={1}
              max={3650}
              value={sinceDays}
              onChange={(e) => setSinceDays(Math.max(1, Number(e.target.value) || 30))}
              className="w-40 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        )}
      </div>

      <SectionLabel>Question</SectionLabel>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIT_QUESTIONS.map((q) => {
          const active = q.id === question;
          return (
            <button
              key={q.id}
              onClick={() => setQuestion(q.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-amber-400 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-500/10"
                  : "border-stone-200 bg-white hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/40"
              }`}
            >
              <div className="text-sm font-semibold">{q.label}</div>
              <div className={`mt-1 text-[11px] ${muted}`}>{q.blurb}</div>
              <div className={`mt-2 font-mono text-[10px] ${faint}`}>{q.key}</div>
            </button>
          );
        })}
      </div>

      {!name.trim() ? (
        <Empty>Pick a capability to run the audit question.</Empty>
      ) : m.loading && !envelope ? (
        <Empty>Running {meta.key}…</Empty>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className={`text-[11px] font-mono uppercase tracking-widest ${faint}`}>
                Subject
              </div>
              <div className="font-serif text-xl">
                {envelope?.subject?.label || name}{" "}
                <span className={`font-mono text-xs ${faint}`}>
                  {envelope?.subject?.kind || "Capability"}
                </span>
              </div>
            </div>
            {name.trim() ? (
              <Link
                to={`/capabilities/${encodeURIComponent(name.trim())}`}
                className="text-xs text-amber-700 hover:underline dark:text-amber-400"
              >
                Open capability dossier →
              </Link>
            ) : null}
          </div>

          <ContradictionBanner items={contradictions} />
          <GapsList gaps={gaps} />

          <SectionLabel>Assertions</SectionLabel>
          {assertions.length === 0 ? (
            <Empty>No assertions in this window — see gaps above.</Empty>
          ) : (
            <div className="grid gap-3">
              {assertions.map((a, i) => (
                <AssertionCard key={i} a={a} />
              ))}
            </div>
          )}

          {envelope?.derived_from && envelope.derived_from.length > 0 ? (
            <>
              <SectionLabel>Derived from</SectionLabel>
              <ul className="mb-4 space-y-1 text-sm">
                {envelope.derived_from.map((d, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <ProvBadge term={d.prov || "wasDerivedFrom"} />
                    <span className={`font-mono text-[11px] ${faint}`}>{d.kind}</span>
                    <span>{d.label || d.id}</span>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-700 hover:underline dark:text-amber-400"
                      >
                        open
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </Page>
  );
}
