import type { ReactNode } from "react";
import type { Theme } from "@tollbooth-dpyc/web";
import { AccountPage, LanguageChooser, PatronFundingStatus, useAppShell } from "@tollbooth-dpyc/web/react";
import { useT, type Translate } from "../i18n";
import {
  accountPageClassNames,
  buildInfoClassNames,
  fundingClassNames,
  themeToggleClassNames,
  timezoneClassNames,
  usageClassNames,
} from "../lib/accountStyles";

/** Each theme's name and hint, in the reader's language. */
const themeWords = (t: Translate): Record<Theme, { label: string; hint: string }> => ({
  dark: { label: t("views.profile.theme.dark"), hint: t("views.profile.theme.darkHint") },
  light: { label: t("views.profile.theme.light"), hint: "" },
  system: { label: t("views.profile.theme.system"), hint: t("views.profile.theme.systemHint") },
});

const themeLabels = (t: Translate): Record<Theme, ReactNode> => {
  const words = themeWords(t);
  return {
    dark: <ThemeChoice theme="dark" {...words.dark} />,
    light: <ThemeChoice theme="light" {...words.light} />,
    system: <ThemeChoice theme="system" {...words.system} />,
  };
};

export default function ProfilePage() {
  const { session, status } = useAppShell();
  const t = useT();

  return (
    <AccountPage
      npub={session.npub}
      usage={{ classNames: usageClassNames }}
      timezone={{
        heading: t("views.profile.timezone.heading"),
        intro: t("views.profile.timezone.intro"),
        classNames: timezoneClassNames,
      }}
      theme={{
        heading: t("views.profile.theme.heading"),
        intro: t("views.profile.theme.intro"),
        labels: themeLabels(t),
        classNames: themeToggleClassNames,
      }}
      build={{
        status,
        frontend: {
          version: __APP_VERSION__,
          commit: __BUILD_COMMIT__,
          builtAt: __BUILD_TIME__,
          source: "https://github.com/lonniev/cypher-mcp",
        },
        classNames: buildInfoClassNames,
      }}
      panels={{
        // The reader's language, with the theme and time zone.
        you: (
          <section className={accountPageClassNames.section}>
            <h2 className={accountPageClassNames.sectionHeading}>{t("views.profile.language.heading")}</h2>
            <LanguageChooser classNames={{ root: themeToggleClassNames.root, chip: themeToggleClassNames.chip, active: "border-amber-400! bg-amber-50! dark:border-amber-500/50! dark:bg-amber-500/10!" }} />
          </section>
        ),
        // Sign-in proof and credit balance, read fresh, beside the usage.
        money: <PatronFundingStatus classNames={fundingClassNames} />,
      }}
      onSignOut={session.signOut}
      classNames={accountPageClassNames}
    />
  );
}

function ThemeChoice({ theme, label, hint }: { theme: Theme; label: string; hint: string }) {
  return (
    <>
      <span className="flex items-center gap-2">
        <ThemeSwatch theme={theme} />
        <span className="text-sm font-medium">{label}</span>
      </span>
      {hint && <span className="block text-xs text-stone-400 dark:text-zinc-500 mt-1">{hint}</span>}
    </>
  );
}

function ThemeSwatch({ theme }: { theme: Theme }) {
  const base = "w-5 h-5 rounded-full border border-stone-300 dark:border-zinc-600";
  if (theme === "dark") return <span className={`${base} bg-zinc-900`} />;
  if (theme === "light") return <span className={`${base} bg-stone-100`} />;
  return <span className={`${base} bg-gradient-to-r from-stone-100 to-zinc-900`} />;
}
