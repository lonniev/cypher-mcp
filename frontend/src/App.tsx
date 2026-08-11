import { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { consumeReloadRefresh } from "./lib/graphCache";
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
import NpubGate from "./components/NpubGate";
import DebugPanel from "./components/DebugPanel";
import WalletPage from "./components/WalletPage";
import ProfilePage from "./components/ProfilePage";
import Contents from "./components/notebook/Contents";
import RecentActivity from "./components/notebook/RecentActivity";
import Capabilities from "./components/notebook/Capabilities";
import CapabilityDetail from "./components/notebook/CapabilityDetail";
import Issues from "./components/notebook/Issues";
import Concordance from "./components/notebook/Concordance";
import Metrics from "./components/notebook/Metrics";
import QueryCatalog from "./components/notebook/QueryCatalog";
import Audit from "./components/notebook/Audit";
import ServiceDetail from "./components/notebook/ServiceDetail";
import PatentDetail from "./components/notebook/PatentDetail";
import PatentElements from "./components/notebook/PatentElements";
import Invariants from "./components/notebook/Invariants";
import InvariantDetail from "./components/notebook/InvariantDetail";
import IssueDetail from "./components/notebook/IssueDetail";
import SymbolDetail from "./components/notebook/SymbolDetail";
import { PublicLayout, PrimaryNav, PublicFooter } from "./components/public/PublicShell";
import HomePage from "./components/public/HomePage";
import FactoryPage from "./components/public/FactoryPage";
import MemoryPage from "./components/public/MemoryPage";
import JoinPage from "./components/public/JoinPage";

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

  // On a browser reload, the reloaded page's metered queries refetch (see
  // useMetered). Consume that intent here — this shell effect runs after the
  // page's own effects (child-first), so the reload refreshes the current page
  // yet later client-side navigations stay cache-first.
  useEffect(() => {
    consumeReloadRefresh();
  }, []);

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
        <BrowserRouter>
          <Routes>
            {/* Public factory spokesman — no auth required (#72). */}
            <Route element={<PublicLayout status={status} />}>
              <Route index element={<HomePage />} />
              <Route path="factory" element={<FactoryPage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="join" element={<JoinPage />} />
            </Route>

            {/* Lab Notebook — auth gate; signed-in patrons get the full registers. */}
            <Route
              path="notebook/*"
              element={
                loggedIn ? (
                  <NotebookApp />
                ) : (
                  <NotebookGate
                    status={status}
                    onLogin={onLogin}
                    operatorHash={status?.operator_npub_hash}
                    notice={reauthNotice}
                  />
                )
              }
            />

            {/* Convenience: legacy deep links into notebook sections. */}
            {loggedIn ? (
              <>
                <Route path="capabilities/*" element={<Navigate to="/notebook/capabilities" replace />} />
                <Route path="issues/*" element={<Navigate to="/notebook/issues" replace />} />
                <Route path="metrics" element={<Navigate to="/notebook/metrics" replace />} />
                <Route path="wallet" element={<Navigate to="/notebook/wallet" replace />} />
                <Route path="profile" element={<Navigate to="/notebook/profile" replace />} />
              </>
            ) : null}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <DebugPanel />
      </Ctx.Provider>
    </div>
  );
}

function NotebookGate({
  status,
  onLogin,
  operatorHash,
  notice,
}: {
  status: ServiceStatus | null;
  onLogin: () => void;
  operatorHash?: string;
  notice?: string;
}) {
  return (
    <>
      <PrimaryNav />
      <main className="flex-1">
        <div className="page-frame px-6 py-12">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Lab Notebook</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
            Sign in with a Nostr key to read the intention graph — capabilities, issues,
            invariants, concordance, and the token-savings ledger. The public factory
            pages need no sign-in.
          </p>
        </div>
        <div className="pb-16">
          <NpubGate onLogin={onLogin} operatorHash={operatorHash} notice={notice} />
        </div>
      </main>
      <PublicFooter status={status} />
    </>
  );
}

function NotebookApp() {
  return (
    <Routes>
      <Route element={<NotebookLayout />}>
        <Route index element={<Contents />} />
        <Route path="recent" element={<RecentActivity />} />
        <Route path="capabilities" element={<Capabilities />} />
        <Route path="capabilities/:name" element={<CapabilityDetail />} />
        <Route path="issues" element={<Issues />} />
        <Route path="invariants" element={<Invariants />} />
        <Route path="invariants/:name" element={<InvariantDetail />} />
        <Route path="patents" element={<PatentElements />} />
        <Route path="concordance" element={<Concordance />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="catalog" element={<QueryCatalog />} />
        <Route path="audit" element={<Audit />} />
        <Route path="services/:repo" element={<ServiceDetail />} />
        <Route path="patent/:ref" element={<PatentDetail />} />
        <Route path="issues/:repo/:number" element={<IssueDetail />} />
        <Route path="symbol" element={<SymbolDetail />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/notebook" replace />} />
      </Route>
    </Routes>
  );
}

function NotebookLayout() {
  const { status } = useSession();
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter status={status} />
    </>
  );
}

