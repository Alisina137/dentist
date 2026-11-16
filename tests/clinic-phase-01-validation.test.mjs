import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-shell.css");
const loading=read("apps/clinic-web/app/clinic/loading.tsx");
const old=read("packages/ui-web/src/phase03.tsx");
const context=read("packages/ui-web/src/clinic-shell-context.tsx");
const manifest=JSON.parse(read("packages/ui-web/package.json"));

test("Clinic Phase 01 — Next segment layout owns persistent navigation and page-only loading",()=>{
 assert.ok(layout.includes("ClinicPersistentShell"),"clinic layout must persist across route transitions");
 assert.ok(layout.includes('"./clinic-shell.css"'));
 assert.ok(layout.includes("{children}"));
 assert.ok(loading.includes("clinic-page-skeleton"),"only route content shows skeleton");
 assert.ok(!loading.includes("clinic-persistent-sidebar"),"loading must not unmount or rebuild sidebar");
 assert.ok(shell.includes("clinic-persistent-sidebar"));
 assert.ok(shell.includes("clinic-persistent-header"));
 assert.ok(shell.includes('id="clinic-route-content"'));
 assert.ok(shell.includes("clinic-route-progress"));
 assert.ok(shell.includes('usePathname()||"/clinic"'));
 assert.ok(shell.includes("useRouter()"));
 assert.ok(shell.includes("useTransition()"));
 assert.ok(!shell.includes("window.location.assign(url.pathname"),
  "same-tenant navigation must use Next client routing");
});

test("Clinic Phase 01 — context is only loaded once in persistent shell and reused by PH03",()=>{
 assert.ok(shell.includes('fetch(API+"/v1/team/context"'));
 assert.ok(shell.includes('credentials:"include",cache:"no-store",signal:controller.signal'));
 assert.ok(shell.includes("return()=>controller.abort()"));
 assert.ok(shell.includes("setCtx(null);setError("),"errors must purge stale tenant data");
 assert.ok(context.includes("createContext<ClinicWorkspaceSession|null>(null)"));
 assert.ok(context.includes("export type ClinicWorkspaceRole="));
 assert.ok(shell.includes("showPage&&ctx?<PersistentClinicShellProvider session={{"));
 assert.ok(old.includes('useData(session?null:"/context")'),
  "PH03 must not refetch the same team context on each route");
 assert.ok(old.includes("if(persistent)return <>{children}</>"),
  "PH03 legacy content stays functional, duplicate sidebar/header is suppressed");
 assert.equal(manifest.exports["./clinic-shell-context"],"./src/clinic-shell-context.tsx");
});

test("Clinic Phase 01 — roles and selected tenant keep existing navigation and sensitive permissions",()=>{
 for(const item of ["overview","appointments","queue","bookingRequests","patients",
  "clinical","finance","reports","listing","staff","resources","services","hours",
  "notifications","security","settings","subscription","exportData","myVerification","myProfile"]){
  assert.ok(shell.includes('key:"'+item+'"'),item+" missing from current clinic nav");
 }
 for(const role of ["owner","manager","dentist","receptionist","assistant","cashier"])
  assert.ok(shell.includes('space.role==="'+role+'"'),role+" role not explicitly scoped");
 assert.ok(shell.includes('const selected=requested===undefined?null:requested?'));
 assert.ok(shell.includes("spaces.find(s=>s.clinicId===requested)||null"),
  "unknown tenant must never silently fall back to first available clinic");
 assert.ok(shell.includes("const requestedInvalid=Boolean(requested&&ctx&&!selected)"));
 assert.ok(shell.includes("if(!sameTenant(url))"),"tenant changes must avoid SPA cache continuity");
 assert.ok(shell.includes('window.location.assign("/clinic?clinic="+encodeURIComponent(event.target.value))'),
  "hard reload during clinic switching invalidates old clinical screen state");
 assert.ok(shell.includes('window.location.assign("/clinic/login")'),"sign-out must purge and exit workspace");
 assert.ok(shell.includes("const showPage=!loading&&!error&&!requestedInvalid"));
 assert.ok(shell.includes('if(isPublic)return <>{children}</>'),
  "login/onboarding must not require authenticated clinic chrome");
 assert.ok(old.includes('space.capabilities.includes("staff.read")'),
  "server-authorized legacy staff guard remains intact");
});

test("Clinic Phase 01 — all navigation is client-side except explicit tenant changes, downloads and public routes",()=>{
 for(const marker of [
  'if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey',
  'anchor.hasAttribute("download")',
  'anchor.hasAttribute("data-hard-navigation")',
  'anchor.hasAttribute("data-hard-navigation")',
  'PUBLIC_CLINIC_PATH.test(url.pathname)',
  'url.origin!==window.location.origin',
  'url.searchParams.set("clinic",selected.clinicId)',
  'startNavigation(()=>router.push(url.pathname+url.search+url.hash))',
  'aria-current={active?"page":undefined}',
  'href={hrefFor(item.path)}'
 ])assert.ok(shell.includes(marker),marker);
 assert.ok(!shell.includes("router.replace('/clinic") &&
  !shell.includes("location.href=url.pathname"));
});

test("Clinic Phase 01 — keyboard, drawer, responsive/collapsed sidebar, RTL and accessible states",()=>{
 for(const marker of [
  'mobileCloseRef.current?.focus()',
  'event.key==="Escape"',
  'event.shiftKey&&document.activeElement===tabbable[0]',
  'document.body.style.overflow="hidden"',
  'aria-expanded={mobileOpen}',
  'aria-controls="clinic-workspace-navigation"',
  'aria-modal={mobileOpen||undefined}',
  'aria-label={t("navigation")}',
  'aria-label={t("breadcrumb")}',
  'aria-label={t("pageContent")}',
  'localStorage.getItem(COLLAPSE_KEY)',
  'localStorage.setItem(COLLAPSE_KEY',
  'import {authClient,CareIcon,LocaleControls,usePreferences'
 ])assert.ok(shell.includes(marker),marker);
 for(const marker of [
  ".clinic-sidebar-collapsed",
  ".clinic-mobile-open",
  '[dir="rtl"] .clinic-persistent-sidebar',
  ".clinic-persistent-nav .clinic-sidebar-link",
  '@media(max-width:900px)',
  '@media(max-width:600px)',
  '@media(prefers-reduced-motion:reduce)',
  ".clinic-mobile-open.clinic-sidebar-collapsed .clinic-sidebar-label",
  ":focus-visible"
 ])assert.ok(css.includes(marker),marker);
 for(const lang of ['"fa-AF"','"ps-AF"','en:{'])assert.ok(shell.includes(lang));
 assert.ok(!shell.includes("innerHTML"));
 assert.ok(!shell.includes("sessionStorage.setItem("),"clinical patient data is not cached in browser storage");
});
