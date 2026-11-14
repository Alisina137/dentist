import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("global header is navigation-only with no locale/calendar selectors",()=>{
 const ui=read("packages/ui-web/src/index.tsx");
 const head=ui.slice(ui.indexOf("export function SiteLayout"),ui.indexOf("export function InlineAlert"));
 assert.ok(head.includes("site-header-inner"));
 assert.ok(head.includes("PatientAccountNavLink"));
 assert.ok(!head.includes("<LocaleControls"));
 assert.ok(!head.includes("setCalendar("));
 assert.ok(!head.includes("setLocale("));
 assert.ok(!head.includes('aria-label={t("calendar")}'));
 assert.ok(!head.includes('aria-label={t("language")}'));
});
test("patient language/calendar live in account preferences",()=>{
 const ui=read("packages/ui-web/src/phase14.tsx");
 const preferences=ui.slice(ui.indexOf("function PreferencesContent"),ui.indexOf("export function PatientPreferencesPage"));
 assert.ok(preferences.includes('t("language")'));
 assert.ok(preferences.includes('t("calendar")'));
 assert.ok(preferences.includes('save({locale:'));
 assert.ok(preferences.includes('save({calendar:'));
});
test("shared visual refinement remains responsive for clinic, admin and patient",()=>{
 const css=read("packages/ui-web/src/polish.css");
 for(const selector of [".site-header-inner",".p14-account-grid",".p14-account-nav",
  ".p14-quick-grid",".p14-family-member",".p14-auth-page",".p13-hero",
  "@media(max-width:900px)","@media(max-width:600px)"])
  assert.ok(css.includes(selector),selector);
 assert.ok(css.includes(".site-header .preferences"));
});
