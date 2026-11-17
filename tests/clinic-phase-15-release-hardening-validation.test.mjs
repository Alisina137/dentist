import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const integrity=read("packages/ui-web/src/clinic-ops-integrity.ts");
const reportUi=read("packages/ui-web/src/phase18.tsx");
const notifyUi=read("packages/ui-web/src/phase15.tsx");
const scheduleUi=read("packages/ui-web/src/phase06.tsx");
const network=read("packages/ui-web/src/clinic-ops-connection.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-release-hardening.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const reportApi=read("apps/api/src/insights-router.ts");
const notificationApi=read("apps/api/src/patient-booking-router.ts");
const dbSchema=read("packages/db/migrations/0015_patient_booking_links_notifications.sql");
const financeModel=read("packages/ui-web/src/clinic-finance-model.ts");
const load={exports:{}};
new Function("exports","module",ts.transpileModule(integrity,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText)(load.exports,load);
const {clinicValidReportPayload,clinicValidDeliveryPayload,clinicSafeApiCode}=load.exports;

const identity={clinicId:"clinic-a",from:"2026-11-01",to:"2026-11-17"};
const valid=()=>({
 clinicId:"clinic-a",from:"2026-11-01",to:"2026-11-17",
 timezone:"Asia/Kabul",currency:"AFN",basis:"Scheduled appointments / posted manual ledger",
 appointments:{
  total:3,byStatus:{confirmed:1,arrived:1,in_treatment:0,completed:1,cancelled:0,no_show:0},
  byDay:[{day:"2026-11-13",count:1},{day:"2026-11-17",count:2}]
 },
 patients:{newRegistered:2,activeTotal:10},
 revenue:{netReceiptsAfn:120,byMethodAfn:{cash:100,bank_transfer:20,other_manual:0},
  issuedInvoices:3,issuedFaceValueAfn:600,postedExpensesAfn:80}
});
const deliveries=()=>({
 deliveries:[
  {event_name:"requested",status:"pending",attempt_count:0,
   created_at:"2026-11-17T06:00:00Z",sent_at:null,last_error_code:null},
  {event_name:"confirmed",status:"sent",attempt_count:2,
   created_at:"2026-11-17T05:00:00Z",sent_at:"2026-11-17T05:00:02Z",last_error_code:null},
  {event_name:"rejected",status:"failed",attempt_count:5,
   created_at:"2026-11-16T23:00:00Z",sent_at:null,last_error_code:"SMTP_DELIVERY_FAILED"}],
 emailConfigured:true,smsConfigured:false,pushConfigured:false
});

test("Clinic Phase 15: real report shape reconciles status, days, ledger and clinic identity",()=>{
 assert.equal(clinicValidReportPayload(valid(),identity),true);
 assert.equal(clinicValidReportPayload(null,identity),false);
 assert.equal(clinicValidReportPayload([],identity),false);
 const alt={...valid(),clinicId:"clinic-b"};
 assert.equal(clinicValidReportPayload(alt,identity),false,"never show foreign clinic");
 const stale={...valid(),from:"2026-10-01"};
 assert.equal(clinicValidReportPayload(stale,identity),false,"never export stale period");
 const invalidTimezone={...valid(),timezone:"UTC"};
 assert.equal(clinicValidReportPayload(invalidTimezone,identity),false);
 assert.equal(clinicValidReportPayload({...valid(),currency:"USD"},identity),false);
 assert.equal(clinicValidReportPayload({...valid(),patientName:"Secret person"},identity),false);
 const unknownPatient=valid();unknownPatient.patients.patientName="Secret person";
 assert.equal(clinicValidReportPayload(unknownPatient,identity),false);
 const forged=valid();forged.appointments.byStatus.completed=100;
 assert.equal(clinicValidReportPayload(forged,identity),false,"status sum mismatch");
 const inaccurateDay=valid();inaccurateDay.appointments.byDay[0].count=2;
 assert.equal(clinicValidReportPayload(inaccurateDay,identity),false,"daily sum mismatch");
 const duplicateDay=valid();duplicateDay.appointments.byDay[1].day="2026-11-13";
 assert.equal(clinicValidReportPayload(duplicateDay,identity),false,"duplicate day");
 const future=valid();future.appointments.byDay[1].day="2026-11-18";
 assert.equal(clinicValidReportPayload(future,identity),false,"out-of-range day");
 const bogusMoney=valid();bogusMoney.revenue.netReceiptsAfn=Infinity;
 assert.equal(clinicValidReportPayload(bogusMoney,identity),false);
 const negativeCount=valid();negativeCount.appointments.total=-3;
 assert.equal(clinicValidReportPayload(negativeCount,identity),false);
 const ledgerDrift=valid();ledgerDrift.revenue.byMethodAfn.cash=101;
 assert.equal(clinicValidReportPayload(ledgerDrift,identity),false);
 const extraDay=valid();extraDay.appointments.byDay[0].patientId="private";
 assert.equal(clinicValidReportPayload(extraDay,identity),false);
 assert.ok(reportApi.includes("clinicId,from,to,timezone:\"Asia/Kabul\",currency:\"AFN\""));
});

test("Clinic Phase 15: notification metadata enforces bounded records, real database statuses and zero PHI",()=>{
 assert.equal(clinicValidDeliveryPayload(deliveries()),true);
 const noEmail=deliveries();noEmail.emailConfigured=false;
 assert.equal(clinicValidDeliveryPayload(noEmail),true);
 const queue=deliveries();queue.deliveries[0].status="processing";
 assert.equal(clinicValidDeliveryPayload(queue),true);
 const overflow=deliveries();overflow.deliveries=Array(101).fill(overflow.deliveries[0]);
 assert.equal(clinicValidDeliveryPayload(overflow),false);
 const contact=deliveries();contact.deliveries[0].patientName="Private";
 assert.equal(clinicValidDeliveryPayload(contact),false);
 const address=deliveries();address.deliveries[0].email="patient@example.com";
 assert.equal(clinicValidDeliveryPayload(address),false);
 const newChannel=deliveries();newChannel.smsConfigured=true;
 assert.equal(clinicValidDeliveryPayload(newChannel),false,"do not claim SMS works");
 const erroneous=deliveries();erroneous.deliveries[0].status="delivered";
 assert.equal(clinicValidDeliveryPayload(erroneous),false);
 const brokenDate=deliveries();brokenDate.deliveries[0].created_at="not a date";
 assert.equal(clinicValidDeliveryPayload(brokenDate),false);
 const errorDetail=deliveries();errorDetail.deliveries[2].last_error_code="patient@example.com";
 assert.equal(clinicValidDeliveryPayload(errorDetail),false,"no personal info in error");
 assert.ok(notificationApi.includes("LIMIT 100"));
 assert.ok(dbSchema.includes("status IN ('pending','processing','sent','skipped','failed')"));
});

test("Clinic Phase 15: API messages cannot leak arbitrary text, stack traces or patient identifiers",()=>{
 assert.equal(clinicSafeApiCode("AUTH_REQUIRED"),"AUTH_REQUIRED");
 assert.equal(clinicSafeApiCode("REPORT_RESPONSE_INVALID"),"REPORT_RESPONSE_INVALID");
 for(const input of [null,42,"", "someone@example.com",
  "Failed to fetch", "patient with name", "<script>alert(1)</script>",
  "../token", "A".repeat(120)]){
  assert.equal(clinicSafeApiCode(input),"REQUEST_FAILED");
 }
 const ix=reportUi.indexOf("export async function call18");
 assert.ok(ix>=0&&reportUi.slice(ix,ix+750).includes("clinicSafeApiCode(data?.code)"));
 assert.ok(reportUi.includes("if(!clinicValidReportPayload(result,{"));
 assert.ok(reportUi.includes('throw Error("REPORT_RESPONSE_INVALID")'));
 assert.ok(reportUi.includes("setSnapshot({key:reportKey,data:result,error:\"\",loading:false})"));
 assert.ok(reportUi.includes("feedback(reportError)"));
 assert.ok(notifyUi.includes('if(!clinicValidDeliveryPayload(result))throw Error("DELIVERY_RESPONSE_INVALID")'));
 assert.ok(notifyUi.includes('clinicSafeApiCode(e instanceof Error?e.message:"NETWORK_UNAVAILABLE")'));
 assert.ok(notifyUi.includes("clinicErrorText(error,locale as Lang)"));
 assert.ok(financeModel.includes("clinicCsvSafeCell"));
});

test("Clinic Phase 15: network reconnection is read-only, explicit, accessible and localized",()=>{
 for(const s of [
  'window.addEventListener("offline",down)',
  'window.addEventListener("online",up)',
  'window.removeEventListener("offline",down)',
  'window.removeEventListener("online",up)',
  'if(!navigator.onLine)down()',
  'role="status" aria-live="polite"',
  'connection==="reconnected"&&onRefresh',
  'setConnection("unverified");onRefresh()',
  'onRefresh?:()=>void',
  '"fa-AF"','"ps-AF"'
 ])assert.ok(network.includes(s),s);
 assert.ok(!network.includes('method:"POST"'));
 assert.ok(!network.includes('localStorage'));
 assert.ok(reportUi.includes('<ClinicOpsConnection onRefresh={()=>setCounter(x=>x+1)}/>'));
 assert.ok(scheduleUi.includes('<ClinicOpsConnection onRefresh={()=>{refresh();refreshOverview();}}/>'));
 assert.ok(scheduleUi.includes('<ClinicOpsConnection onRefresh={refresh}/>'));
 assert.ok(notifyUi.includes('<ClinicOpsConnection onRefresh={reload}/>'));
 for(const s of [
  '.clinic-persistent-shell .clinic-phase15-connectivity',
  '.is-offline','.is-reconnected',
  '@media(max-width:560px)','@media(prefers-reduced-motion:reduce)',
  ':focus-visible','overflow-wrap:anywhere'
 ])assert.ok(css.includes(s),s);
 assert.ok(layout.includes('import "./clinic-quality.css";\nimport "./clinic-release-hardening.css";'));
 for(const area of ["admin-web","patient-web"])
  assert.ok(!read("apps/"+area+"/app/layout.tsx").includes("clinic-release-hardening.css"));
});

test("Clinic Phase 15: no premature production approval or transport changes",()=>{
 const ci=read(".github/workflows/ci.yml");
 for(const s of [
  "pnpm test","pnpm typecheck","pnpm build",
  "Bundle Expo patient app for Android",
  "Bundle Expo patient app for iOS",
  "HTTP auth integration against PostgreSQL",
  "node tests/stage-l-security-integration.mjs",
  "node tests/clinic-phase-15-integration.mjs",
  "NODE_ENV=test node scripts/verify-test-backup-restore.mjs"
 ])assert.ok(ci.includes(s),s);
 assert.ok(!integrity.includes("document.cookie"));
 assert.ok(!integrity.includes("localStorage"));
 assert.ok(!integrity.includes("Math.random()"));
 assert.ok(reportUi.includes('if(!["owner","manager","cashier"].includes(space.role))'));
 assert.ok(notifyUi.includes("ownerManagerOnly>"));
});
