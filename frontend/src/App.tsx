import { lazy, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { consumeReloadRefresh } from "./lib/graphCache";
import { AppShell, Wallet, type AppShellContext } from "@tollbooth-dpyc/web/react";
import { useT } from "./i18n";
import Nav from "./components/Nav";
import Opening from "./components/Opening";
import { PublicLayout, PrimaryNav, PublicFooter } from "./components/public/PublicShell";
import HomePage from "./components/public/HomePage";

// Each page past the home page is its own chunk, fetched the first time it opens.
const ProfilePage = lazy(() => import("./components/ProfilePage"));
const Contents = lazy(() => import("./components/notebook/Contents"));
const RecentActivity = lazy(() => import("./components/notebook/RecentActivity"));
const Capabilities = lazy(() => import("./components/notebook/Capabilities"));
const CapabilityDetail = lazy(() => import("./components/notebook/CapabilityDetail"));
const Issues = lazy(() => import("./components/notebook/Issues"));
const PullRequests = lazy(() => import("./components/notebook/PullRequests"));
const PullRequestDetail = lazy(() => import("./components/notebook/PullRequestDetail"));
const Concordance = lazy(() => import("./components/notebook/Concordance"));
const Metrics = lazy(() => import("./components/notebook/Metrics"));
const QueryCatalog = lazy(() => import("./components/notebook/QueryCatalog"));
const Audit = lazy(() => import("./components/notebook/Audit"));
const ServiceDetail = lazy(() => import("./components/notebook/ServiceDetail"));
const PatentDetail = lazy(() => import("./components/notebook/PatentDetail"));
const PatentElements = lazy(() => import("./components/notebook/PatentElements"));
const Invariants = lazy(() => import("./components/notebook/Invariants"));
const InvariantDetail = lazy(() => import("./components/notebook/InvariantDetail"));
const IssueDetail = lazy(() => import("./components/notebook/IssueDetail"));
const SymbolDetail = lazy(() => import("./components/notebook/SymbolDetail"));
const FactoryPage = lazy(() => import("./components/public/FactoryPage"));
const MemoryPage = lazy(() => import("./components/public/MemoryPage"));
const JoinPage = lazy(() => import("./components/public/JoinPage"));

// The package's AppShell holds the session, the sign-in gate, service_status,
// the theme and the debug log. The site keeps its routes: the public pages
// need no sign-in, and the Lab Notebook shows the gate until one is made.
export default function App() {
  const t = useT();
  const site = (shell: AppShellContext) => <Site shell={shell} />;
  return (
    <AppShell
      signedOut={site}
      gateOptions={{ welcome: t("ui.app.welcome"), linksCredit: false }}
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
  const t = useT();
  return (
    <>
      <PrimaryNav />
      <main className="flex-1">
        <div className="page-frame px-6 py-12">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">{t("ui.gate.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
            {t("ui.gate.body")}
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
          element={
            <div className="page-frame px-4 py-6">
              <Wallet />
            </div>
          }
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
        <Opening><Outlet /></Opening>
      </main>
    </>
  );
}

