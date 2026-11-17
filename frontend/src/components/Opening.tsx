import { Suspense, type ReactNode } from "react";
import { useT } from "../i18n";

/** Holds a page's place while its chunk loads; the layout around it stays up. */
export default function Opening({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <Suspense fallback={<p className="page-frame px-6 py-12 text-sm text-stone-400 dark:text-zinc-500">{t("ui.app.opening")}</p>}>
      {children}
    </Suspense>
  );
}
