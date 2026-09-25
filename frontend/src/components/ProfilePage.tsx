import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "../App";
import { getAccountStatement, type AccountStatementResult, type Theme } from "@tollbooth-dpyc/web";
import { CouponsPanel, NostrProfilePanel, SessionKeyClaim, ThemeToggle } from "@tollbooth-dpyc/web/react";
import { card, couponClassNames, themeToggleClassNames } from "../lib/accountStyles";

const THEME_LABELS: Record<Theme, { label: string; hint: string }> = {
  dark: { label: "Dark", hint: "Default" },
  light: { label: "Light", hint: "" },
  system: { label: "System", hint: "Match OS" },
};

const themeLabels: Record<Theme, ReactNode> = {
  dark: <ThemeChoice theme="dark" />,
  light: <ThemeChoice theme="light" />,
  system: <ThemeChoice theme="system" />,
};

export default function ProfilePage() {
  const { npub, logOut } = useSession();
  const [stmt, setStmt] = useState<AccountStatementResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAccountStatement(30).then(setStmt).catch(() => setStmt(null));
  }, []);

  function copyNpub() {
    navigator.clipboard?.writeText(npub).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <div className="page-frame px-4 py-6 space-y-5">
      <h1 className="text-lg font-semibold">Profile</h1>

      {/* Nostr profile (kind-0) — avatar + contact, self-sovereign */}
      <NostrProfilePanel npub={npub} />
      {/* Browser-held session nsec only — silent when NIP-07 / courier.
          Keyed by npub so a revealed key never carries across a sign-in. */}
      <SessionKeyClaim key={npub} npub={npub} />

      {/* Theme selection */}
      <div className={`${card} p-5`}>
        <div className="text-sm font-medium mb-1">Appearance</div>
        <p className="text-xs text-stone-500 dark:text-zinc-400 mb-3">
          The notebook defaults to dark. Your choice is saved on this device.
        </p>
        <ThemeToggle labels={themeLabels} classNames={themeToggleClassNames} />
      </div>

      {/* Identity */}
      <div className={`${card} p-5`}>
        <div className="text-sm font-medium mb-2">Nostr identity</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-xs font-mono text-stone-600 dark:text-zinc-300 bg-stone-50 dark:bg-zinc-950 rounded px-2 py-1.5">
            {npub}
          </code>
          <button
            onClick={copyNpub}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Usage */}
      <div className={`${card} p-5`}>
        <div className="text-sm font-medium mb-3">Last 30 days</div>
        {stmt ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Balance" value={stmt.account_summary?.balance_api_sats} />
            <Stat label="Deposited" value={stmt.account_summary?.total_deposited_api_sats} />
            <Stat label="Consumed" value={stmt.account_summary?.total_consumed_api_sats} />
          </div>
        ) : (
          <p className="text-xs text-stone-400 dark:text-zinc-500">No statement available.</p>
        )}
      </div>

      {/* Coupons */}
      <CouponsPanel
        classNames={couponClassNames}
        intro="Redeem an operator code once. The discount applies automatically on subsequent paid calls until the per-patron cap or the window expires."
        empty="No coupons redeemed yet. Operators distribute codes via X, email, the welcome page, or DM — paste a code above to claim its discount."
        placeholder="FRESHMAN, EARLYBIRD…"
        redeemLabel="🎟 Redeem"
        forgetLabel="🗑"
      />

      <div className="flex justify-end">
        <button
          onClick={logOut}
          className="text-sm px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value?.toLocaleString() ?? "—"}</div>
      <div className="text-xs text-stone-400 dark:text-zinc-500">{label}</div>
    </div>
  );
}

function ThemeChoice({ theme }: { theme: Theme }) {
  const { label, hint } = THEME_LABELS[theme];
  return (
    <>
      <span className="flex items-center gap-2">
        <ThemeSwatch theme={theme} />
        <span className="text-sm font-medium">{label}</span>
      </span>
      {hint && <span className="block text-xs text-stone-400 dark:text-zinc-500 mt-1">{hint}</span>}
    </>
  );
}

function ThemeSwatch({ theme }: { theme: Theme }) {
  const base = "w-5 h-5 rounded-full border border-stone-300 dark:border-zinc-600";
  if (theme === "dark") return <span className={`${base} bg-zinc-900`} />;
  if (theme === "light") return <span className={`${base} bg-stone-100`} />;
  return <span className={`${base} bg-gradient-to-r from-stone-100 to-zinc-900`} />;
}
