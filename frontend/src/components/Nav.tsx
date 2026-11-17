import { NavLink } from "react-router-dom";
import { PrimaryNav } from "./public/PublicShell";
import { useT } from "../i18n";

export default function Nav() {
  const t = useT();
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
      <PrimaryNav />
      {/* Secondary notebook registers — subordinate row, does not replace primary. */}
      <nav
        aria-label={t("notebook.nav.label")}
        className="border-b border-stone-200 dark:border-zinc-800 px-4 py-1.5 flex items-center gap-1 flex-wrap bg-stone-50/80 dark:bg-zinc-950/80"
      >
        {tab("/notebook", t("notebook.nav.contents"), true)}
        {tab("/notebook/recent", t("notebook.nav.recent"))}
        {tab("/notebook/capabilities", t("notebook.nav.capabilities"))}
        {tab("/notebook/issues", t("notebook.nav.issues"))}
        {tab("/notebook/pulls", t("notebook.nav.pulls"))}
        {tab("/notebook/invariants", t("notebook.nav.invariants"))}
        {tab("/notebook/patents", t("notebook.nav.patents"))}
        {tab("/notebook/concordance", t("notebook.nav.concordance"))}
        {tab("/notebook/metrics", t("notebook.nav.metrics"))}
        {tab("/notebook/catalog", t("notebook.nav.catalog"))}
        {tab("/notebook/audit", t("notebook.nav.audit"))}
        {tab("/notebook/wallet", t("ui.nav.wallet"))}
      </nav>
    </>
  );
}
