// The notebook's look for the account widgets @tollbooth-dpyc/web provides —
// the package brings the calls, states and words; these class strings are
// cypher's stone/zinc/amber, light and dark.

import type {
  AccountPageClassNames,
  BuildInfoPanelClassNames,
  FundingStatusClassNames,
  ThemeToggleClassNames,
  TimezonePickerClassNames,
  UsageSummaryClassNames,
} from "@tollbooth-dpyc/web/react";

export const card = "rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";

/// The Appearance choices: the current pick is ringed in amber (the chip is
/// a radio, so `aria-checked` marks it).
export const themeToggleClassNames: ThemeToggleClassNames = {
  root: "grid grid-cols-3 gap-2",
  chip:
    "rounded-lg border px-3 py-3 text-left transition-colors border-stone-200 hover:bg-stone-50 dark:border-zinc-800 dark:hover:bg-zinc-800 aria-checked:border-amber-400 aria-checked:bg-amber-50 aria-checked:hover:bg-amber-50 dark:aria-checked:border-amber-500/50 dark:aria-checked:bg-amber-500/10 dark:aria-checked:hover:bg-amber-500/10",
};

/// A card's Refresh: the notebook chip, one size down, beside the title.
const smallChip =
  "inline-flex items-center rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-500 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-amber-400";

const cardHeader = "flex items-center justify-between gap-3 mb-3";
const cardTitle = "text-sm font-medium";
const quiet = "text-xs text-stone-400 dark:text-zinc-500";

/// "Last 30 days": the figures as the old three-up grid (medium figure over a
/// small grey label), the top tools as quiet rows.
export const usageClassNames: UsageSummaryClassNames = {
  root: `${card} p-5`,
  header: cardHeader,
  heading: cardTitle,
  chip: smallChip,
  figures: "grid grid-cols-3 gap-3 text-center",
  value: "text-lg font-semibold tabular-nums",
  label: quiet,
  subheading: `${quiet} mt-4 mb-1.5`,
  list: "divide-y divide-stone-100 dark:divide-zinc-800 text-xs",
  row: "flex items-baseline gap-3 py-1.5 tabular-nums text-stone-500 dark:text-zinc-400 [&>span:first-child]:flex-1 [&>span:first-child]:min-w-0 [&>span:first-child]:truncate",
  tool: "font-mono text-stone-700 dark:text-zinc-200",
  sats: "text-amber-700 dark:text-amber-400",
  loading: quiet,
  error: quiet,
  empty: `${quiet} mt-3`,
};

/// Account health: each row a dependency, its state word coloured, the
/// detail and when it was read in quiet ink.
export const fundingClassNames: FundingStatusClassNames = {
  root: `${card} p-5`,
  header: cardHeader,
  heading: `${cardTitle} flex-1`,
  overall: "text-xs font-medium",
  chip: smallChip,
  list: "divide-y divide-stone-100 dark:divide-zinc-800",
  row: "py-2.5",
  dependency: "text-sm text-stone-900 dark:text-zinc-100",
  state: "ml-2 text-xs font-medium",
  detail: "mt-0.5 text-xs text-stone-500 dark:text-zinc-400",
  checked: `mt-0.5 ${quiet}`,
  loading: quiet,
  error: quiet,
  ok: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  blocked: "text-red-600 dark:text-red-400",
};

/// The display time zone, drawn like the notebook's other fields.
export const timezoneClassNames: TimezonePickerClassNames = {
  select:
    "w-full max-w-sm rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700 focus:outline-none focus:border-amber-400",
};

/// Build & license: section labels in small caps, label/value rows, links in
/// the notebook's amber.
export const buildInfoClassNames: BuildInfoPanelClassNames = {
  root: `${card} p-5`,
  heading: `${cardTitle} mb-1`,
  intro: "text-xs text-stone-500 dark:text-zinc-400 mb-2",
  section: "mt-4 mb-1 text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-zinc-500",
  row: "flex gap-3 py-1 text-xs border-b border-stone-100 dark:border-zinc-800",
  label: "w-28 shrink-0 text-stone-400 dark:text-zinc-500",
  value: "min-w-0 break-all font-mono text-stone-600 dark:text-zinc-300",
  link: "!text-amber-700 hover:underline dark:!text-amber-400",
};

/// The Profile page: the notebook's frame, each account card in the notebook's
/// card, and Log out as a quiet red action on the right.
export const accountPageClassNames: AccountPageClassNames = {
  root: "page-frame px-4 py-6 space-y-5",
  heading: "text-lg font-semibold",
  section: `${card} p-5`,
  sectionHeading: "text-sm font-medium mb-1",
  sectionIntro: "text-xs text-stone-500 dark:text-zinc-400 mb-3",
  actions: "flex justify-end",
  signOut:
    "text-sm px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors",
};
