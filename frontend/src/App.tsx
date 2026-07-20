import { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import {
  getStoredNpub,
  isLoggedIn,
  logOut as mcpLogOut,
  onProofExpired,
  serviceStatus,
  type ServiceStatus,
} from "./lib/mcp";
import { hydrateAvatarFromNostr } from "./lib/avatar";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import NpubGate from "./components/NpubGate";
import DebugPanel from "./components/DebugPanel";
import WalletPage from "./components/WalletPage";
import ProfilePage from "./components/ProfilePage";
import Contents from "./components/notebook/Contents";
import Capabilities from "./components/notebook/Capabilities";
import CapabilityDetail from "./components/notebook/CapabilityDetail";
import Concordance from "./components/notebook/Concordance";
import Metrics from "./components/notebook/Metrics";
import QueryCatalog from "./components/notebook/QueryCatalog";
import ServiceDetail from "./components/notebook/ServiceDetail";
import PatentDetail from "./components/notebook/PatentDetail";
import IssueDetail from "./components/notebook/IssueDetail";

interface SessionCtx {
  npub: string;
  status: ServiceStatus | null;
  logOut: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within <App>");
  return v;
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [npub, setNpub] = useState(getStoredNpub());
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  // Set when a metered read bounced for an expired proof and we re-presented the
  // gate — rendered as a calm "this is routine" note, not an error.
  const [reauthNotice, setReauthNotice] = useState("");

  useEffect(() => {
    serviceStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  // A metered graph read anywhere can bounce for a lapsed proof. The mcp layer
  // clears the stale token and fires this; drop back to sign-in so the architect
  // isn't stranded on a page whose data silently won't load. An nsec session
  // re-signs inline, so isLoggedIn() stays true and we leave it alone.
  useEffect(() => {
    return onProofExpired(() => {
      if (isLoggedIn()) return;
      setReauthNotice(
        "Your sign-in expired — that's routine. Sign in again to pick up where you left off.",
      );
      setNpub(getStoredNpub());
      setLoggedIn(false);
    });
  }, []);

  useEffect(() => {
    if (loggedIn && npub) void hydrateAvatarFromNostr(npub);
  }, [loggedIn, npub]);

  function onLogin() {
    setReauthNotice("");
    setNpub(getStoredNpub());
    setLoggedIn(true);
  }

  function logOut() {
    mcpLogOut();
    setNpub("");
    setLoggedIn(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 transition-colors">
      <Ctx.Provider value={{ npub, status, logOut }}>
        {loggedIn ? (
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Contents />} />
                <Route path="capabilities" element={<Capabilities />} />
                <Route path="capabilities/:name" element={<CapabilityDetail />} />
                <Route path="concordance" element={<Concordance />} />
                <Route path="metrics" element={<Metrics />} />
                <Route path="catalog" element={<QueryCatalog />} />
                <Route path="services/:repo" element={<ServiceDetail />} />
                <Route path="patent/:ref" element={<PatentDetail />} />
                <Route path="issues/:repo/:number" element={<IssueDetail />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        ) : (
          <>
            <TopBar />
            <main className="flex-1">
              <Hero />
              <div className="pb-16">
                <NpubGate onLogin={onLogin} operatorHash={status?.operator_npub_hash} notice={reauthNotice} />
              </div>
            </main>
            <Footer status={status} />
          </>
        )}
        <DebugPanel />
      </Ctx.Provider>
    </div>
  );
}

function Layout() {
  const { status } = useSession();
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer status={status} />
    </>
  );
}

function TopBar() {
  return (
    <header className="border-b border-stone-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
      <span className="font-serif font-semibold tracking-wide">Cypher</span>
      <span className="text-sm text-stone-400 dark:text-zinc-500">Lab Notebook</span>
    </header>
  );
}

function Footer({ status }: { status: ServiceStatus | null }) {
  return (
    <footer className="border-t border-stone-100 px-4 py-3 text-center text-xs text-stone-400 dark:border-zinc-900 dark:text-zinc-600 space-y-0.5">
      <div>
        Cypher Lab Notebook v{__APP_VERSION__} · {__BUILD_COMMIT__}
        {status?.version && ` · MCP ${status.version}`}
        {status && (status.tollbooth_version ?? status.tollbooth_dpyc_version) &&
          ` · SDK ${status.tollbooth_version ?? status.tollbooth_dpyc_version}`}
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
