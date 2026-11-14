import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Global headers do not display language or calendar selectors",()=>{
 const ui=read("packages/ui-web/src/index.tsx");
 const start=ui.indexOf("export function SiteLayout(");
 const end=ui.indexOf("export function InlineAlert(",start);
 assert.ok(start>=0&&end>start);
 const header=ui.slice(start,end);
 assert.ok(!header.includes("<LocaleControls"),"No language/year/calendar picker in global header");
 assert.ok(!header.includes('className="preferences"'),"No header preference block");
 assert.ok(!header.includes('<select'),"No selects in shared header");
 assert.ok(header.includes('className="site-header-inner"'),"One compact header layout");
 assert.ok(header.includes("CareIcon"),"Consistent iconography");
 assert.ok(header.includes('aria-expanded={open}'),"Accessible mobile menu state");
 assert.ok(header.includes('aria-controls="primary-header-nav"'),"Mobile menu controls nav");
 assert.ok(header.includes('aria-current={active('),"Navigation marks the current page");
 assert.ok(header.includes("PatientAccountNavLink"),"Patient sign-in/account remains reachable");
 assert.ok(header.includes("header-nav-open"),"Menu toggles visible nav on narrow screens");
 assert.ok(header.includes("skip-link"),"Keyboard skip-to-content preserved");
 assert.ok(ui.includes("export function LocaleControls"),"Preferences selector stays available outside header");
});
test("Language and calendar remain available in patient preferences and clinic/admin sidebar",()=>{
 const patient=read("packages/ui-web/src/phase14.tsx");
 const ui=read("packages/ui-web/src/index.tsx");
 assert.ok(patient.includes("function PreferencesContent()"));
 assert.ok(patient.includes('href:"/account/preferences"'));
 assert.ok(patient.includes('<F title={t("language")}'));
 assert.ok(patient.includes('<F title={t("calendar")}'));
 assert.ok(patient.includes("<LocaleControls/>"),"Explicit onboarding preference setup");
 for(const phase of ["phase02.tsx","phase03.tsx"]){
  const other=read("packages/ui-web/src/"+phase);
  assert.ok(other.includes("LocaleControls"),phase+" offers in-workspace language/calendar controls");
 }
 assert.ok(ui.includes('request("/v1/me/preferences"'),"Persisted preferences unchanged");
});
test("All three web portals load shared design and have a mobile menu",()=>{
 const polish=read("packages/ui-web/src/polish.css");
 const base=read("packages/ui-web/src/styles.css");
 const icons=read("packages/ui-web/src/care-icons.tsx");
 for(const app of ["patient-web","clinic-web","admin-web"]){
  const layout=read("apps/"+app+"/app/layout.tsx");
  assert.ok(layout.includes('import "@dandanlink/ui/styles.css";'),app+" keeps base styles");
  assert.ok(layout.includes('import "@dandanlink/ui/polish.css";'),app+" loads improved styling");
 }
 const pkg=read("packages/ui-web/package.json");
 assert.ok(pkg.includes('"./polish.css":"./src/polish.css"'));
 assert.ok(polish.includes(".header-menu-toggle"));
 assert.ok(polish.includes(".header-nav.header-nav-open"));
 assert.ok(polish.includes("@media(max-width:760px)"));
 assert.ok(polish.includes(".p14-account-grid"));
 assert.ok(polish.includes(".p14-auth-page"));
 assert.ok(polish.includes(".p14-family-member"));
 assert.ok(polish.includes(".p13-hero"));
 assert.ok(polish.includes("prefers-reduced-motion"));
 assert.ok(icons.includes('export function CareIcon('));
 assert.ok(base.includes(".staff-side-locale .preferences"),"Clinic staff sidebar locale remains");
});
