import { NavLink } from "react-router-dom";
import { useAppShell } from "@tollbooth-dpyc/web/react";
import { PrimaryNav } from "./public/PublicShell";

export default function Nav() {
  const { session } = useAppShell();

  const tab = (to: string, label: string, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
            : "text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <>
      {/* Primary site nav — same items/order as the public pages (#80). */}
      <PrimaryNav
        account={{
          npub: session.npub,
          links: [
            { href: "/notebook/profile", label: "Profile & theme" },
            { href: "/notebook/wallet", label: "Wallet" },
          ],
          onSignOut: session.signOut,
        }}
      />
      {/* Secondary notebook registers — subordinate row, does not replace primary. */}
      <nav
        aria-label="Lab Notebook registers"
        className="border-b border-stone-200 dark:border-zinc-800 px-4 py-1.5 flex items-center gap-1 flex-wrap bg-stone-50/80 dark:bg-zinc-950/80"
      >
        {tab("/notebook", "Contents", true)}
        {tab("/notebook/recent", "Recent")}
        {tab("/notebook/capabilities", "Capabilities")}
        {tab("/notebook/issues", "Issues")}
        {tab("/notebook/pulls", "Pull Requests")}
        {tab("/notebook/invariants", "Invariants")}
        {tab("/notebook/patents", "Patents")}
        {tab("/notebook/concordance", "Concordance")}
        {tab("/notebook/metrics", "Metrics")}
        {tab("/notebook/catalog", "Catalog")}
        {tab("/notebook/audit", "Audit")}
        {tab("/notebook/wallet", "Wallet")}
      </nav>
    </>
  );
}
