// Shared chrome for the unauthenticated public pages (/, /factory, /memory, /join)
// and the sign-in surface. Same visual language as the lab notebook — serif
// headings, amber accent, stone/zinc ground — so a guest who later signs in
// feels continuity rather than a theme swap.
//
// PrimaryNav is the site-wide top row (Home · Factory · Memory · Join · Lab
// Notebook), drawn by the package's SiteNav in the notebook's classes. Every
// page mounts it; notebook secondary registers render BELOW it, never in place
// of it (#80).

import { Link, Outlet, useLocation } from "react-router-dom";
import { matchesPath, SiteNav, useAppShell, type SiteNavClassNames, type SiteNavItem } from "@tollbooth-dpyc/web/react";

const ITEMS: readonly SiteNavItem[] = [
  { href: "/", label: "Home", end: true },
  { href: "/factory", label: "Factory" },
  { href: "/memory", label: "Memory" },
  { href: "/join", label: "Join" },
  { href: "/notebook", label: "Lab Notebook" },
];

const link =
  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800";
const current =
  "!bg-amber-100 !text-amber-800 dark:!bg-amber-500/15 dark:!text-amber-400";
const menuRow =
  "px-3 text-sm text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors";

export const navClassNames: SiteNavClassNames = {
  root: "relative border-b border-stone-200 dark:border-zinc-800 px-4 py-1.5 flex items-center gap-1.5",
  nav: "flex items-center",
  list: "flex items-center gap-1.5 flex-wrap",
  item: link,
  active: current,
  end: "ml-auto flex items-center gap-3",
  toggle:
    "inline-flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors",
  menu: "absolute left-0 right-0 top-full z-40 border-b border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 shadow-lg p-2 space-y-0.5",
  menuItem: `rounded-lg ${link}`,
  account: "relative",
  accountButton: "flex items-center justify-center rounded-full",
  accountMenu:
    "absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-40",
  accountHeader: "px-3 py-2 border-b border-stone-100 dark:border-zinc-800",
  accountHeading: "text-xs text-stone-400 dark:text-zinc-500",
  accountNpub: "text-xs font-mono truncate text-stone-600 dark:text-zinc-300",
  accountLink: menuRow,
  signOut: `w-full text-left ${menuRow} hover:!bg-red-50 hover:text-red-600 dark:hover:!bg-red-500/10 dark:hover:text-red-400`,
};

const brand = (
  <Link to="/" className="flex items-center gap-2 mr-3">
    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
    <span className="font-serif font-semibold tracking-wide">Cypher</span>
  </Link>
);

/// Site-wide primary navigation. Identical items and order on every page.
/// It reads the one shared session, so a public page and the notebook never
/// disagree: signed in, the right side is the avatar menu; signed out, the
/// Sign-in link. Lab Notebook is active for any `/notebook/*` path.
export function PrimaryNav() {
  const { pathname } = useLocation();
  const { session } = useAppShell();
  const account = session.signedIn
    ? {
        npub: session.npub,
        links: [
          { href: "/notebook/profile", label: "Profile & theme" },
          { href: "/notebook/wallet", label: "Wallet" },
        ],
        onSignOut: session.signOut,
      }
    : undefined;
  return (
    <SiteNav
      brand={brand}
      items={ITEMS}
      isActive={(href, item) => matchesPath(pathname, href, item.end)}
      renderLink={({ href, children, ...rest }) => (
        <Link to={href} {...rest}>
          {children}
        </Link>
      )}
      account={account}
      trailing={
        account ? undefined : (
          <Link
            to="/notebook"
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors"
          >
            Sign in
          </Link>
        )
      }
      classNames={navClassNames}
    />
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-stone-100 px-4 py-3 text-center text-xs text-stone-400 dark:border-zinc-900 dark:text-zinc-600">
      <div>
        Monetized with{" "}
        <a
          href="https://tollbooth-dpyc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600/80 hover:underline dark:text-amber-400/80"
        >
          Tollbooth DPYC™
        </a>{" "}
        · Apache-2.0 · Patent Pending (US Prov. 64/045,999)
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <>
      <PrimaryNav />
      <main className="flex-1">
        <Outlet />
      </main>
    </>
  );
}
