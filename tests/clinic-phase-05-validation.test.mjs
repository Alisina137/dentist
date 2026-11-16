import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=read("packages/ui-web/src/clinic-operations-dashboard.tsx");
const widgets=read("packages/ui-web/src/clinic-command-widgets.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-dashboard.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const report=read("apps/api/src/insights-router.ts");

test("Clinic Phase 05: independent clinic-only dashboard styles load after shell, theme and responsive rules",()=>{
 assert.ok(layout.includes('import "./clinic-shell.css";\nimport "./clinic-design.css";\nimport "./clinic-ux.css";\nimport "./clinic-dashboard.css";'));
 assert.ok(css.startsWith("/*"));
 assert.ok(css.includes(".clinic-persistent-shell .c5-command"));
 assert.ok(css.includes(".clinic-persistent-shell .c5-kpis"));
 assert.ok(css.includes(".clinic-persistent-shell .c5-insights"));
 for(const p of ["apps/clinic-web/app/layout.tsx","apps/admin-web/app/layout.tsx",
  "apps/patient-web/app/layout.tsx"]){
  assert.ok(!read(p).includes("clinic-dashboard.css"),"Dashboard theme must remain clinic-only");
 }
 for(const forbidden of [":root{","html{","body{","svg path{",".odontogram{",
  "transform:scaleX(-1)"]){
  assert.ok(!css.includes(forbidden),forbidden);
 }
});

test("Clinic Phase 05: new command view is bound to existing private tenant-scoped requests, not demo statistics",()=>{
 for(const marker of [
  'import {ClinicDashboardSnapshot,ClinicDashboardInsights,clinicReportWindow,',
  'const insights=useClinicRead<ClinicInsights>(canSeeReports?',
  '"/v1/insights/clinics/"+prefix+"/report?from="+window.from+"&to="+window.to:null',
  'canSeeReports=["owner","manager","cashier"].includes(space.role)',
  'const canSchedule=space.role!=="cashier"',
  '"/v1/appointments/clinics/"+prefix+"/overview"',
  '"/v1/booking/clinics/"+prefix+"/requests?state=pending"',
  '"/v1/operations/clinics/"+prefix+"/summary"',
  '"/v1/registry/clinics/"+prefix+"/patients/summary"',
  'credentials:"include",cache:"no-store"',
  '<ClinicDashboardSnapshot role={space.role} clinicId={space.clinicId}',
  'canSeeReports&&<ClinicDashboardInsights clinicId={space.clinicId}',
  'function refreshAll(){appointments.refresh();patients.refresh();operations.refresh();bookingRequests.refresh();insights.refresh();}'
 ])assert.ok(dashboard.includes(marker),marker);
 assert.ok(report.includes('if(!["owner","manager","cashier"].includes(person.role))opsFail(403,"REPORT_FORBIDDEN")'));
 assert.ok(report.includes('WHERE clinic_id=${clinicId}'));
 for(const forbidden of ["Math.random(","localStorage","sessionStorage","demoReceipts","fakePatient"]){
  assert.ok(!widgets.includes(forbidden),forbidden);
 }
});

test("Clinic Phase 05: role-safe KPIs, attention items and finance visibility",()=>{
 for(const marker of [
  'role==="cashier"?[','role==="receptionist"?[',
  'const booking=["owner","manager","dentist","receptionist"].includes(role)',
  'const finance=["owner","manager","cashier"].includes(role)',
  'const manager=["owner","manager"].includes(role)',
  'scheduling=role!=="cashier"',
  'booking&&requests.data?.requests.length',
  'manager&&operations.data&&operations.data.checklist.some(x=>!x.done)',
  'role==="owner"&&clinicStatus!=="approved"',
  'operations.data&&manager&&',
  'const unresolved=needed.some(x=>x.loading||x.error||!x.data)',
  'card.read.error||card.value===undefined?',
  'ClinicFailureState title={t("error")}',
  'clinicErrorText(read.error,lang)',
  'window=clinicReportWindow(days)',
  'map(row=>[row.day,row.count])',
  "Math.max(1,...points.map(x=>x.count))",
  'aria-pressed={days===n}', 'aria-label={x.day+',
  'read.data?.appointments.byDay',
  'role="region" aria-label={t("daily")}'
 ])assert.ok(widgets.includes(marker),marker);
 assert.ok(dashboard.includes('clinicErrorText(error,lang)'),"Hide raw arbitrary server data from alerts");
});

test("Clinic Phase 05: 3-language, Kabul date period, zero/failed-state honesty, accessibility",()=>{
 for(const marker of [
  'en:{','"fa-AF":{','"ps-AF":{',
  'timeZone:"Asia/Kabul"',
  'start.setUTCDate(start.getUTCDate()-(days-1))',
  'from:start.toISOString().slice(0,10),to:day',
  'currency:"AFN"','netReceiptsAfn','postedExpensesAfn',
  'if','const hasBookings=points.some(x=>x.count>0)',
  'read.loading?<ClinicLoadingState',
  'role="status"','aria-label={t("insights")}',
  'aria-pressed={days===n}', 'type="button"',
  'const points=Array.from({length:days}'
 ])assert.ok(widgets.includes(marker),marker);
 for(const marker of [
  "@media(max-width:1100px)","@media(max-width:680px)","@media(max-width:375px)",
  "@media(prefers-reduced-motion:reduce)",".c5-kpi-skeleton{animation:none!important}",
  ".c5-chart-scroll","overflow-x:auto","overscroll-behavior-inline:contain",
  "font-variant-numeric:tabular-nums",
  ":focus-visible", "outline:3px solid #297bbb"
 ])assert.ok(css.includes(marker),marker);
});

test("Clinic Phase 05: correct source definition for ledger counts and scheduled start dates",()=>{
 for(const marker of [
  'const {from,to}=period(req)',
  'at TIME ZONE', // query explicitly groups in Kabul time (AT TIME ZONE)
  'revenue:{netReceiptsAfn:receipts,byMethodAfn:byMethod',
  'postedExpensesAfn:Number(expenses[0]?.total_afn||0)',
  'appointments:{byStatus:appointments,total:Object.values(appointments).reduce',
  'byDay:dayRows.map'
 ])assert.ok(report.toLowerCase().includes(marker.toLowerCase()),marker);
});
