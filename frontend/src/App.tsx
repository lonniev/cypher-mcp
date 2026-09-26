import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { consumeReloadRefresh } from "./lib/graphCache";
import { AppShell, WalletPage, type AppShellContext } from "@tollbooth-dpyc/web/react";
import Nav from "./components/Nav";
import { walletClassNames } from "./lib/accountStyles";
import ProfilePage from "./components/ProfilePage";
import Contents from "./components/notebook/Contents";
import RecentActivity from "./components/notebook/RecentActivity";
import Capabilities from "./components/notebook/Capabilities";
import CapabilityDetail from "./components/notebook/CapabilityDetail";
import Issues from "./components/notebook/Issues";
import PullRequests from "./components/notebook/PullRequests";
import PullRequestDetail from "./components/notebook/PullRequestDetail";
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

// The package's AppShell holds the session, the sign-in gate, service_status,
// the theme and the debug log. The site keeps its routes: the public pages
// need no sign-in, and the Lab Notebook shows the gate until one is made.
export default function App() {
  const site = (shell: AppShellContext) => <Site shell={shell} />;
  return (
    <AppShell
      signedOut={site}
      footer={<PublicFooter />}
      classNames={{ root: "bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 transition-colors" }}
    >
      {site}
    </AppShell>
  );
}

function Site({ shell }: { shell: AppShellContext }) {
  const signedIn = shell.session.signedIn;

  // On a browser reload, the reloaded page's metered queries refetch (see
  // useMetered). Consume that intent here — this effect runs after the page's
  // own effects (child-first), so the reload refreshes the current page yet
  // later client-side navigations stay cache-first.
  useEffect(() => {
    consumeReloadRefresh();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public factory spokesman — no auth required (#72). */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="factory" element={<FactoryPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="join" element={<JoinPage />} />
        </Route>

        {/* Lab Notebook — auth gate; signed-in patrons get the full registers. */}
        <Route path="notebook/*" element={signedIn ? <NotebookApp /> : <NotebookGate gate={shell.gate} />} />

        {/* Convenience: legacy deep links into notebook sections. */}
        {signedIn ? (
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
  );
}

function NotebookGate({ gate }: { gate: ReactNode }) {
  return (
    <>
      <PrimaryNav />
      <main className="flex-1">
        <div className="page-frame px-6 py-12">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Lab Notebook</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
            Sign in with a Nostr key to read the intention graph — capabilities, issues,
            invariants, concordance, and the token-savings ledger. The public factory
            pages need no sign-in.
          </p>
        </div>
        <div className="pb-16">{gate}</div>
      </main>
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
        <Route path="pulls" element={<PullRequests />} />
        <Route path="pulls/:repo/:number" element={<PullRequestDetail />} />
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
        <Route
          path="wallet"
          element={<WalletPage classNames={walletClassNames} coupons={false} statement={false} />}
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/notebook" replace />} />
      </Route>
    </Routes>
  );
}

function NotebookLayout() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
    </>
  );
}

