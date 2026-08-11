// `/join` — visitors bring their own Nostr identity. Scout is not the on-ramp.

import { Link } from "react-router-dom";
import { COMMUNITY_REPO } from "../../lib/factoryModel";

export default function JoinPage() {
  return (
    <div className="page-frame px-6 py-12 space-y-12">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Identity
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
          You bring your own identity
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
          Signing in here means proving you control a Nostr keypair. You generate
          that keypair yourself, in whatever Nostr client you prefer — nobody issues
          it to you and nobody can revoke it. If you already have an npub, you already
          have everything you need. If you do not, any Nostr client will create one in
          a few seconds.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-3">
        <Step
          n="1"
          title="Create or bring an npub"
          body="A Nostr keypair is self-issued. Generate one in any NIP-07 extension or Nostr client — there is no registration step, no approval, and nobody to ask."
        />
        <Step
          n="2"
          title="Prove you control it"
          body="When you call a paid tool, this operator sends a signed challenge to your npub over Nostr. Reply from your client; the reply proves the key is yours. Keep the dpop_token the tool returns — it is cached so you are not challenged on every call."
        />
        <Step
          n="3"
          title="Use the operator"
          body="Top up a few sats via purchase_credits if you need paid tools. Read the graph from the Lab Notebook, or file a field report with report_issue under your own proven npub."
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-serif text-lg font-semibold">What about Scout?</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Scout is a separate identity that agents use when filing issues against the
          factory&apos;s repositories — a field-report actor, not an account you sign
          in as, and not how you join. Your access is your own npub and the signed
          proof that you control it.
        </p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-serif text-lg font-semibold">Worked example</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          Field reports still arrive under a proven npub via{" "}
          <span className="font-mono text-xs">report_issue</span>. Issue{" "}
          <a
            href="https://github.com/lonniev/cypher-mcp/issues/72"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:underline dark:text-amber-400"
          >
            lonniev/cypher-mcp#72
          </a>{" "}
          was labeled <span className="font-mono text-xs">agent/fix</span> and
          implemented by the Journeyman role — the author of record was the
          reporter&apos;s own npub, not a shared join account.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium">Read the graph</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            Sign in to the Lab Notebook to browse capabilities, issues, invariants, and
            the token-savings ledger. Graph reads cost sats; operational status is free.
          </p>
          <Link
            to="/notebook"
            className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            Open Lab Notebook
          </Link>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium">Read the model</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            The factory&apos;s machine-checked SysML model and diagrams live in the
            community docs. Paraphrase drifts; the generated page fails the build instead.
          </p>
          <a
            href={COMMUNITY_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            dpyc-community on GitHub
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">What you need</h2>
        <ul className="space-y-2 text-sm text-stone-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            A Nostr identity (npub). Generate one in any NIP-07 extension or at sign-in.
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            A few sats of credits on this operator (Lightning top-up via{" "}
            <span className="font-mono text-xs">purchase_credits</span>) for paid tools
            and any graph reads.
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500">·</span>
            No GitHub write access. No invitation. No KYC. The proof is the signed DM.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400">Step {n}</div>
      <div className="mt-1 text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">{body}</p>
    </div>
  );
}
