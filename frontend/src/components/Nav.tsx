import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSession } from "../App";
import Avatar from "./Avatar";
import { avatarFor, AVATAR_EVENT } from "../lib/avatar";
import { PrimaryNav } from "./public/PublicShell";

export default function Nav() {
  const { npub, logOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState(() => avatarFor(npub));
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep the avatar in sync with the picker (same-tab custom event) and npub.
  useEffect(() => {
    setAvatar(avatarFor(npub));
    const h = () => setAvatar(avatarFor(npub));
    window.addEventListener(AVATAR_EVENT, h);
    return () => window.removeEventListener(AVATAR_EVENT, h);
  }, [npub]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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

  const accountMenu = (
    <div className="ml-auto flex items-center gap-3">
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen((o) => !o)} title={npub} className="block rounded-full">
          <Avatar value={avatar} size={32} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-40">
            <div className="px-3 py-2 border-b border-stone-100 dark:border-zinc-800">
              <div className="text-xs text-stone-400 dark:text-zinc-500">Nostr identity</div>
              <div className="text-xs font-mono truncate text-stone-600 dark:text-zinc-300" title={npub}>
                {npub}
              </div>
            </div>
            <Link
              to="/notebook/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Profile & theme
            </Link>
            <Link
              to="/notebook/wallet"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Wallet
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                logOut();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Primary site nav — same items/order as the public pages (#80). */}
      <PrimaryNav trailing={accountMenu} />
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
