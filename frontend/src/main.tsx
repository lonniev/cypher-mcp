import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { bootstrapTheme, configureDebugLog, configureTollbooth } from "@tollbooth-dpyc/web";
import { ErrorBoundary } from "@tollbooth-dpyc/web/react";
import "./index.css";

// The MCP client, sign-in gate and account pieces read who this site is from
// here. Storage keys stay "cypher:…", so a signed-in architect stays signed in.
configureTollbooth({
  slug: "cypher",
  appName: "Cypher Lab Notebook",
  mcpUrl: import.meta.env.VITE_MCP_URL as string,
  // A free operator-wide read that takes no npub/proof envelope — the wheel
  // rejects an unexpected `npub` kwarg on it.
  extraBootstrapTools: ["public_factory_stats"],
  quietTools: ["public_factory_stats"],
});
// One activity log for the page — this site's calls and the package's alike —
// kept across reloads so an error that flips the view can still be copied.
configureDebugLog({ persist: true });

// Apply the saved theme (dark by default) before first paint — no flash.
bootstrapTheme();

// A render crash is shown with its stack and saved to the debug log, in the
// notebook's own stone/zinc/amber; Reload is the one amber action.
const chip =
  "rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
const crash = {
  root: "flex min-h-screen flex-col justify-center gap-4 bg-white p-6 text-stone-800 dark:bg-zinc-950 dark:text-zinc-200 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-2xl",
  title: "text-lg font-semibold",
  message: "text-sm text-stone-500 dark:text-zinc-400",
  detail:
    "max-h-64 overflow-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-left text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-red-400",
  actions:
    "flex gap-2 [&>button:last-child]:border-transparent [&>button:last-child]:bg-amber-400 [&>button:last-child]:text-zinc-950 [&>button:last-child]:hover:bg-amber-300",
  chip,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      classNames={crash}
      message="The page hit an unexpected error. It's captured below and saved to the debug log — copy it into a bug report. Reloading usually clears the view."
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
