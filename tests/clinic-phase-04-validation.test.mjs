import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const pkg=JSON.parse(read("packages/ui-web/package.json"));
const feedback=read("packages/ui-web/src/clinic-feedback.tsx");
const style=read("apps/clinic-web/app/clinic/clinic-ux.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const operations=read("packages/ui-web/src/phase04.tsx");
const patients=read("packages/ui-web/src/phase05.tsx");
const appointments=read("packages/ui-web/src/phase06.tsx");
const clinical=read("packages/ui-web/src/phase07.tsx");
const finance=read("packages/ui-web/src/phase10.tsx");

test("Clinic PH04: responsive UX styles are clinic-only and loaded after premium theme",()=>{
 assert.ok(layout.includes('import "./clinic-shell.css";\nimport "./clinic-design.css";\nimport "./clinic-ux.css";'));
 assert.ok(style.startsWith("/*"));
 assert.ok(style.includes(".clinic-persistent-shell{"));
 assert.ok(!style.includes(":root{"));
 assert.ok(!style.includes("html{"));
 assert.ok(!style.includes("body{"));
 for(const p of ["apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx","apps/clinic-web/app/layout.tsx"]){
  assert.ok(!read(p).includes("clinic-ux.css"),"UX styling must not mutate public/admin/patient UIs: "+p);
 }
 assert.ok(shell.includes("showPage&&ctx?<PersistentClinicShellProvider session={{"));
});

test("Clinic PH04: loading, safe failure and empty states are accessible, have real retries and 3 locales",()=>{
 assert.equal(pkg.exports["./clinic-feedback"],"./src/clinic-feedback.tsx");
 for(const token of [
  'en:{','"fa-AF":{','"ps-AF":{',
  'loading:"Loading clinic information…"','loading:"در حال بارگیری معلومات کلینیک…"','loading:"د کلینیک معلومات پورته کېږي…"',
  'retry:"Try again"','retry:"دوباره کوشش کنید"','retry:"بیا هڅه وکړئ"',
  'signIn:"Sign in"','signIn:"ورود"','signIn:"ننوتل"',
  "export function clinicErrorText(","export function useClinicFeedback()",
  "export function ClinicLoadingState(","export function ClinicFailureState(",
  "export function ClinicNoResults(",
  'role="status"','aria-live="polite"','aria-busy="true"','aria-label={label}',
  'aria-hidden="true"','role="alert" aria-live="assertive"',
  'onRetry&&<button type="button"','type="button"','aria-hidden="true"'
 ])assert.ok(feedback.includes(token),token);
 assert.ok(!feedback.includes("Math.random("));
 assert.ok(!feedback.includes("patientName"));
 assert.ok(!feedback.includes("localStorage"));
 assert.ok(!feedback.includes("window.alert("));
});

test("Clinic PH04: errors are mapped to safe localized UX instead of raw HTTP or sensitive server strings",()=>{
 for(const marker of [
  'STALE_SERVICE_VERSION:"conflict"',
  'STALE_APPOINTMENT_REVISION:"conflict"',
  'STALE_ENCOUNTER_REVISION:"conflict"',
  'STALE_INVOICE_REVISION:"conflict"',
  'APPOINTMENT_SLOT_UNAVAILABLE:"slot"',
  'AUTH_REQUIRED:"unauthorized"',
  'FORBIDDEN:"forbidden"',
  'NETWORK_ERROR:"network"',
  'VALIDATION_ERROR:"invalid"',
  'const code=String(raw||"").trim().toUpperCase().replace(/[^A-Z0-9_]/g,"")',
  'return dictionary[errorKinds[code]||"server"]'
 ])assert.ok(feedback.includes(marker),marker);
 for(const module of [operations,patients,clinical,finance]){
  assert.ok(module.includes('from "./clinic-feedback"'));
  assert.ok(module.includes('<ClinicFailureState'));
  assert.ok(module.includes('message={describe('));
  assert.ok(module.includes('<ClinicLoadingState'));
 }
 assert.ok(appointments.includes('messages[error]||describe(error)'));
 assert.ok(!clinical.includes('<a href="/clinic/login" className="btn btn-primary">Login</a>'),
  "Clinical sign-in action must not be English-only");
 assert.ok(clinical.includes('{feedback("signIn")}'));
});

test("Clinic PH04: key pages use content-shaped skeletons without fabricated patient data",()=>{
 for(const [module,name,variant] of [
  [operations,"phase04","cards"],[patients,"phase05","rows"],
  [appointments,"phase06","rows"],[clinical,"phase07","form"],
  [finance,"phase10","cards"]
 ]){
  assert.ok(module.includes('<ClinicLoadingState'),name);
  assert.ok(module.includes('variant="'+variant+'"'),name+" variant "+variant);
 }
 for(const token of [
  "clinic-ux-loading-caption","clinic-ux-spinner","clinic-ux-placeholder",
  "clinic-ux-skeleton-cards","clinic-ux-skeleton-rows","clinic-ux-skeleton-form",
  "@keyframes clinic-ux-spin","@keyframes clinic-ux-pulse"
 ])assert.ok(style.includes(token),token);
 assert.ok(style.includes("@media(prefers-reduced-motion:reduce)"));
 assert.ok(style.includes("animation:none!important"));
});

test("Clinic PH04: page and patient/financial/clinical records are isolated across route changes",()=>{
 for(const [name,module] of [
  ["operations",operations],["patients",patients],["appointments",appointments],
  ["clinical",clinical],["finance",finance]
 ]){
  assert.ok(module.includes('snapshot.path===path?snapshot.data:null'),name+" data binding");
  assert.ok(module.includes('snapshot.path===path?snapshot.error:""'),name+" error binding");
  assert.ok(module.includes('setSnapshot({path,data:null,error:""})'),name+" clear old request");
  assert.ok(module.includes('return()=>{'),name+" async cancellation");
 }
 assert.ok(operations.includes('if(!path){setSnapshot({path:null,data:null,error:""});return;}'));
 assert.ok(clinical.includes('if(!path){setSnapshot({path:null,data:null,error:""});return;}'));
 assert.ok(finance.includes('if(!path){setSnapshot({path:null,data:null,error:""});return;}'));
 assert.ok(appointments.includes('const canTreat=(space:Space,a:Appointment)'));
 assert.ok(clinical.includes('<a aria-label={t("overview")} href={link(space.clinicId,patientId)}>'));
});

test("Clinic PH04: 320px, large text, RTL and calendar/table navigation remain usable",()=>{
 for(const marker of [
  "@media(max-width:1024px)","@media(max-width:680px)","@media(max-width:375px)",
  ".phase04-table-scroll",".phase05-scroll",".phase06-week-scroll",
  ".phase10-table-scroll",".phase07-tabs",".phase06-main-tabs",
  "overflow-x:auto","scrollbar-width:thin","overscroll-behavior-inline:contain",
  "grid-template-columns:minmax(0,1fr)",
  "padding-inline:clamp(12px,3.5vw,18px)",
  "direction:inherit","unicode-bidi:isolate",
  'input[type="date"]','input[type="time"]','input[type="number"]',
  "max-height:min(92dvh,100%)",
  "max-width:min(100%,95vw)",
  "min-height:44px","outline:3px solid #297bbb",
  '.p15-consent','input[type="checkbox"]',
  "@media print"
 ])assert.ok(style.includes(marker),marker);
 assert.ok(!style.includes('.odontogram{'));
 assert.ok(!style.includes('svg path{'));
 assert.ok(!style.includes('transform:scaleX(-1)'),
  "do not mirror medically meaningful chart or typed date content");
});

test("Clinic PH04: error/empty states do not hide the persistent navigation",()=>{
 assert.ok(layout.includes("<ClinicPersistentShell>{children}</ClinicPersistentShell>"));
 assert.ok(shell.includes('className="work-heading clinic-persistent-header"'));
 assert.ok(shell.includes('id="clinic-route-content" tabIndex={-1}'));
 assert.ok(style.includes("clinic-ux-failure-copy"));
 assert.ok(style.includes(".clinic-ux-no-results"));
 assert.ok(style.includes("clinic-ux-failure>.btn"));
 assert.ok(!feedback.includes("onClick={()=>location.reload()}"));
});
