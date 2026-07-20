// Last-resort guard so a stray render-time throw can never white-screen the app.
// Data-loading paths already catch their own failures and show inline banners
// (a denied-service state renders as a message, not a crash); this only catches
// what those miss — an unexpected error thrown during render.
//
// Hardened for capture: the fallback SHOWS the error text + component stack and
// offers a Copy button, and the error is also pushed to the persistent debug
// log. So a crash is never "removed from the screen before it can be captured"
// — reload or not, the message survives.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { debugPush, debugLogText } from "../lib/debugLog";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  stack: string;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: "", copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const stack = info.componentStack ?? "";
    this.setState({ stack });
    // Persist to the debug log so it's readable/copyable even after a reload,
    // and to the console for good measure.
    debugPush("error", `render crash: ${error.message}`);
    console.error("Unhandled render error:", error, stack);
  }

  private detail(): string {
    const { error, stack } = this.state;
    return [
      `Error: ${error?.message ?? "(unknown)"}`,
      error?.stack ? `\n${error.stack}` : "",
      stack ? `\nComponent stack:${stack}` : "",
      `\n\n--- recent activity ---\n${debugLogText()}`,
    ].join("");
  }

  private copy = (): void => {
    navigator.clipboard?.writeText(this.detail()).then(
      () => {
        this.setState({ copied: true });
        window.setTimeout(() => this.setState({ copied: false }), 1500);
      },
      () => {},
    );
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-stone-800 dark:bg-zinc-950 dark:text-zinc-200">
        <div className="w-full max-w-2xl space-y-4">
          <h1 className="text-lg font-semibold">Something went sideways</h1>
          <p className="text-sm text-stone-500 dark:text-zinc-400">
            The page hit an unexpected error. It's captured below and saved to the debug log — copy
            it into a bug report. Reloading usually clears the view.
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-left text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-red-400">
            {this.state.error.message}
            {this.state.stack ? `\n${this.state.stack}` : ""}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.copy}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {this.state.copied ? "Copied" : "Copy error + log"}
            </button>
            <button
              onClick={() => this.setState({ error: null, stack: "" })}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
