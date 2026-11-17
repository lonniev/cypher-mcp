/** The Lab Notebook's words in every language say what English says: the same keys, {{places}} and <tags/>. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGUAGES, localeProblems, setLanguage, translate } from "@tollbooth-dpyc/web";
import english from "../i18n/en.ts";
import { registerCypher, WORDS } from "../i18n/index.ts";

for (const { code } of LANGUAGES.filter((l) => l.code !== "en")) {
  test(`${code}: every message is there, with English's {{places}} and <tags/>`, async () => {
    const locale = (await import(`../i18n/${code}.ts`)).default;
    assert.deepEqual(localeProblems(english, locale), []);
  });
}

test("no message keeps a single-brace {place} or a raw ${…}", () => {
  for (const [key, text] of Object.entries(english)) assert.doesNotMatch(text, /(^|[^{])\{\w+\}(?!\})|\$\{/, key);
});

test("Cypher's words are read through the package, in the chosen language", async () => {
  await registerCypher();
  assert.equal(translate("ui.nav.home", undefined, WORDS), "Home");
  await setLanguage("fr");
  const fr = (await import("../i18n/fr.ts")).default as Record<string, string>;
  assert.equal(translate("ui.nav.home", undefined, WORDS), fr["ui.nav.home"]);
  await setLanguage("en");
});

test("a count picks its plural in English", async () => {
  await registerCypher();
  assert.equal(translate("notebook.caps.shown", { shown: 1, count: 1 }, WORDS), "1 of 1 capability");
  assert.equal(translate("notebook.caps.shown", { shown: 2, count: 5 }, WORDS), "2 of 5 capabilities");
  assert.equal(translate("notebook.since.days", { count: 3 }, WORDS), "3 days");
});

test("each quotation has a message", () => {
  const quotes = Object.keys(english).filter((k) => k.startsWith("lib.quotes."));
  assert.equal(quotes.length, 135);
});
