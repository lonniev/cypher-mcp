import type { ReactNode } from "react";
import type { Theme } from "@tollbooth-dpyc/web";
import { AccountPage, PatronFundingStatus, useAppShell } from "@tollbooth-dpyc/web/react";
import {
  accountPageClassNames,
  buildInfoClassNames,
  couponClassNames,
  fundingClassNames,
  themeToggleClassNames,
  timezoneClassNames,
  usageClassNames,
} from "../lib/accountStyles";

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
  const { session, status } = useAppShell();

  return (
    <AccountPage
      npub={session.npub}
      usage={{ classNames: usageClassNames }}
      timezone={{
        heading: "Time zone",
        intro: "Dates show in your browser's time zone unless you pick another. Saved on this device.",
        classNames: timezoneClassNames,
      }}
      theme={{
        heading: "Appearance",
        intro: "The notebook defaults to dark. Your choice is saved on this device.",
        labels: themeLabels,
        classNames: themeToggleClassNames,
      }}
      coupons={{
        classNames: couponClassNames,
        intro:
          "Redeem an operator code once. The discount applies automatically on subsequent paid calls until the per-patron cap or the window expires.",
        empty:
          "No coupons redeemed yet. Operators distribute codes via X, email, the welcome page, or DM — paste a code above to claim its discount.",
        placeholder: "FRESHMAN, EARLYBIRD…",
        redeemLabel: "🎟 Redeem",
        forgetLabel: "🗑",
      }}
      build={{
        status,
        frontend: {
          version: __APP_VERSION__,
          commit: __BUILD_COMMIT__,
          builtAt: __BUILD_TIME__,
          source: "https://github.com/lonniev/cypher-mcp",
        },
        classNames: buildInfoClassNames,
      }}
      between={{
        // Sign-in proof and credit balance, read fresh, beside the usage.
        usage: <PatronFundingStatus classNames={fundingClassNames} />,
      }}
      onSignOut={session.signOut}
      classNames={accountPageClassNames}
    />
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
