import { Suspense, type ReactNode } from "react";

/** Holds a page's place while its chunk loads; the layout around it stays up. */
export default function Opening({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="page-frame px-6 py-12 text-sm text-stone-400 dark:text-zinc-500">Opening…</p>}>
      {children}
    </Suspense>
  );
}
