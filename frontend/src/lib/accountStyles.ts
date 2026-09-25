// The notebook's look for the account widgets @tollbooth-dpyc/web provides —
// the package brings the calls, states and words; these class strings are
// cypher's stone/zinc/amber, light and dark.

import type {
  CouponsPanelClassNames,
  ThemeToggleClassNames,
  WalletPageClassNames,
} from "@tollbooth-dpyc/web/react";

export const card = "rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";

/// An action, drawn like the notebook's Refresh chip.
const chip =
  "inline-flex items-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-amber-400";

/// The action that moves things forward — Create invoice, Open checkout,
/// Redeem — is the notebook's filled amber button, as it was before the
/// package drew the wallet. Amber on white and on zinc both read, so light
/// and dark share it.
const primary =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-amber-600 px-4 py-2 text-sm text-white transition-colors hover:bg-amber-500 disabled:opacity-40 dark:bg-amber-600 dark:hover:bg-amber-500";

const errorBox =
  "rounded-lg p-3 text-xs bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400";

/// The Balance block (the first section) keeps its small grey label over the
/// figure; the other blocks title themselves in medium ink. Written out whole
/// so Tailwind finds the classes.
export const walletClassNames: WalletPageClassNames = {
  root:
    "page-frame px-4 py-6 space-y-5 [&>section:first-of-type>div:first-child]:text-xs [&>section:first-of-type>div:first-child]:font-normal [&>section:first-of-type>div:first-child]:text-stone-400 dark:[&>section:first-of-type>div:first-child]:text-zinc-500",
  heading: "text-lg font-semibold",
  section: `${card} p-5 space-y-3`,
  sectionTitle: "text-sm font-medium",
  figure: "text-3xl font-semibold tabular-nums",
  unit: "text-base font-normal text-stone-400 dark:text-zinc-500",
  stats: "flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-400",
  notice: "text-xs text-amber-600 dark:text-amber-400",
  error: errorBox,
  chips: "flex flex-wrap items-center gap-2",
  chip,
  primary,
  chipActive:
    "!border-amber-400 !bg-amber-100 !text-amber-800 dark:!border-amber-500/50 dark:!bg-amber-500/15 dark:!text-amber-400",
  input:
    "w-32 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700 focus:outline-none focus:border-amber-400",
  invoice: "rounded-lg border border-stone-200 dark:border-zinc-800 p-3 space-y-2",
  bolt11: "font-mono text-xs break-all bg-stone-50 dark:bg-zinc-950 rounded p-2",
  status: "text-xs text-stone-500 dark:text-zinc-400",
  list: "space-y-1.5 text-xs",
  row: "flex justify-between gap-3 tabular-nums text-stone-500 dark:text-zinc-400",
};

/// Redeem is the panel's one amber action; each row's remove mark is quiet
/// until hovered.
export const couponClassNames: CouponsPanelClassNames = {
  root: `${card} p-5`,
  heading: "text-sm font-medium mb-1",
  intro: "text-xs text-stone-500 dark:text-zinc-400 mb-4",
  form: "flex gap-2 mb-3",
  primary,
  input:
    "flex-1 min-w-0 rounded-lg px-3 py-2 text-sm uppercase bg-white dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700 focus:outline-none focus:border-amber-400",
  message: "rounded-lg p-2.5 mb-3 text-xs border",
  ok: "bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400",
  error: "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
  loading: "text-xs text-stone-400 dark:text-zinc-500 py-2",
  empty: "text-xs text-stone-400 dark:text-zinc-500 leading-relaxed",
  list: "divide-y divide-stone-100 dark:divide-zinc-800",
  row:
    "flex items-center gap-3 py-2.5 [&>div]:min-w-0 [&>div]:flex-1 [&>button]:px-2 [&>button]:py-1 [&>button]:text-sm [&>button]:text-stone-400 [&>button]:transition-colors [&>button]:hover:text-red-500 dark:[&>button]:text-zinc-500 dark:[&>button]:hover:text-red-400",
  name: "font-mono text-sm",
  discount: "ml-1 text-sm font-semibold text-amber-600 dark:text-amber-400",
  meta: "text-xs text-stone-400 dark:text-zinc-500 mt-0.5",
  active: "text-green-600 dark:text-green-400",
};

/// The Appearance choices: the current pick is ringed in amber (the chip is
/// a radio, so `aria-checked` marks it).
export const themeToggleClassNames: ThemeToggleClassNames = {
  root: "grid grid-cols-3 gap-2",
  chip:
    "rounded-lg border px-3 py-3 text-left transition-colors border-stone-200 hover:bg-stone-50 dark:border-zinc-800 dark:hover:bg-zinc-800 aria-checked:border-amber-400 aria-checked:bg-amber-50 aria-checked:hover:bg-amber-50 dark:aria-checked:border-amber-500/50 dark:aria-checked:bg-amber-500/10 dark:aria-checked:hover:bg-amber-500/10",
};
