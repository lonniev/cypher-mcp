import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { configureDebugLog, configureTollbooth } from "@tollbooth-dpyc/web";
import "./index.css";
import { bootstrapTheme } from "./lib/theme";

// The shared account pieces (profile, session key, avatar) read who this site
// is from here. Storage keys stay "cypher:…", so held keys and avatars carry over.
configureTollbooth({
  slug: "cypher",
  appName: "Cypher Lab Notebook",
  mcpUrl: import.meta.env.VITE_MCP_URL as string,
});
// One activity log for the page — this site's calls and the package's alike —
// kept across reloads so an error that flips the view can still be copied.
configureDebugLog({ persist: true });

// Apply the saved theme (dark by default) before first paint — no flash.
bootstrapTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
