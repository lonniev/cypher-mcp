import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { configureTollbooth } from "@tollbooth-dpyc/web";
import "./index.css";
import { bootstrapTheme } from "./lib/theme";

// The shared account pieces (profile, session key, avatar) read who this site
// is from here. Storage keys stay "cypher:…", so held keys and avatars carry over.
configureTollbooth({
  slug: "cypher",
  appName: "Cypher Lab Notebook",
  mcpUrl: import.meta.env.VITE_MCP_URL as string,
});

// Apply the saved theme (dark by default) before first paint — no flash.
bootstrapTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
