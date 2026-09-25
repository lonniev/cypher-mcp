// How the notebook's loading quotes look, in light and dark. The package's
// QuoteScroller brings the rotation, the fade and the spinner; every visual
// choice is this site's and lives here, passed at each call site.

import type { QuoteScrollerClassNames } from "@tollbooth-dpyc/web/react";

export const quoteStyles: QuoteScrollerClassNames = {
  root: "flex flex-col items-center justify-center px-6 py-12 text-center",
  heading:
    "mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em] text-amber-600 dark:text-amber-500",
  spinner: "h-3.5 w-3.5",
  figure: "mx-auto flex min-h-[7rem] max-w-xl flex-col justify-center gap-3",
  text: "font-serif text-lg italic leading-relaxed text-stone-700 dark:text-zinc-300",
  mark: "text-amber-500",
  author: "font-mono text-[10px] uppercase tracking-[0.28em] text-stone-400 dark:text-zinc-500",
};
