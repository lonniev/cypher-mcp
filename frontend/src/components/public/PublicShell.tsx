// Shared chrome for the unauthenticated public pages (/, /factory, /memory, /join)
// and the sign-in surface. Same visual language as the lab notebook — serif
// headings, amber accent, stone/zinc ground — so a guest who later signs in
// feels continuity rather than a theme swap.

import { Link, NavLink, Outlet } from "react-router-dom";
import type { ServiceStatus } from "../../lib/mcp";

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

export function PublicNav({ showSignIn = true }: { showSignIn?: boolean }) {
  return (
    <header className="border-b border-stone-200 dark:border-zinc-800 px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
      <Link to="/" className="flex items-center gap-2 mr-3">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <span className="font-serif font-semibold tracking-wide">Cypher</span>
        <span className="hidden sm:inline text-sm text-stone-400 dark:text-zinc-500">
          · Factory spokesman
        </span>
      </Link>
      {tab("/", "Home", true)}
      {tab("/factory", "Factory")}
      {tab("/memory", "Memory")}
      {tab("/join", "Join")}
      {tab("/notebook", "Lab Notebook")}
      {showSignIn && (
        <Link
          to="/notebook"
          className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors"
        >
          Sign in
        </Link>
      )}
    </header>
  );
}

export function PublicFooter({ status }: { status: ServiceStatus | null }) {
  return (
    <footer className="border-t border-stone-100 px-4 py-3 text-center text-xs text-stone-400 dark:border-zinc-900 dark:text-zinc-600 space-y-0.5">
      <div>
        Cypher · DPYC Agentic Software Factory v{__APP_VERSION__} · {__BUILD_COMMIT__}
        {status?.version && ` · MCP ${status.version}`}
      </div>
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

export function PublicLayout({ status }: { status: ServiceStatus | null }) {
  return (
    <>
      <PublicNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter status={status} />
    </>
  );
}
