import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const model=read("packages/ui-web/src/clinic-ops-bridge-model.ts");
const bridge=read("packages/ui-web/src/clinic-ops-bridge.tsx");
const schedule=read("packages/ui-web/src/phase06.tsx");
const alerts=read("packages/ui-web/src/phase15.tsx");
const report=read("packages/ui-web/src/phase18.tsx");
const reportApi=read("apps/api/src/insights-router.ts");
const notifyApi=read("apps/api/src/patient-booking-router.ts");
const financeModel=read("packages/ui-web/src/clinic-finance-model.ts");
const css=read("apps/clinic-web/app/clinic/clinic-cross-workspaces.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

const compiled=ts.transpileModule(model,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText;
const loaded={exports:{}};
new Function("exports","module",compiled)(loaded.exports,loaded);
const {
 clinicReportPeriodIssue,clinicReportPreset,clinicValidReportDay,
 clinicOpsAreas,clinicOpsHref,clinicDeliveryStatus,clinicDeliveryFiltered,
 clinicDeliveryStats,clinicDeliveryPage,clinicReportCompletion,clinicReportBars
}=loaded.exports;

test("Clinic Phase 14: role-scoped connected workflow links do not expose forbidden destinations",()=>{
 assert.deepEqual(clinicOpsAreas("owner"),
  ["appointments","queue","requests","notifications","reports","finance"]);
 assert.deepEqual(clinicOpsAreas("manager"),clinicOpsAreas("owner"));
 assert.deepEqual(clinicOpsAreas("cashier"),["reports","finance"]);
 assert.deepEqual(clinicOpsAreas("dentist"),["appointments","queue","requests"]);
 assert.deepEqual(clinicOpsAreas("receptionist"),["appointments","queue","requests","finance"]);
 assert.deepEqual(clinicOpsAreas("assistant"),["appointments","queue"]);
 assert.equal(clinicOpsHref("appointments","clinic&other=1","2026-11-17"),
  "/clinic/appointments?clinic=clinic%26other%3D1&view=day&date=2026-11-17");
 assert.equal(clinicOpsHref("appointments","clinic","2026-02-30"),
  "/clinic/appointments?clinic=clinic");
 assert.equal(clinicOpsHref("notifications","clinic-id"),
  "/clinic/settings/notifications?clinic=clinic-id");
 for(const token of [
  'clinicOpsAreas(role)','href={clinicOpsHref(area,clinicId,area==="appointments"?date:undefined)}',
  'aria-current={active===area?"page":undefined}',
  'role:ClinicOpsRole','<CareIcon name={icon[area]}',
  'const {locale}=usePreferences()',
  '"fa-AF"','"ps-AF"'
 ])assert.ok(bridge.includes(token),token);
 for(const token of [
  '<ClinicOpsBridge clinicId={space.clinicId} role={space.role} active="appointments" date={date}/>',
  '<ClinicOpsBridge clinicId={space.clinicId} role={space.role} active="queue" date={day}/>',
  'clinicScheduleWindow(date,mode,calendar)',
  'data?.truncated','aria-live="polite"',
  'ClinicLoadingState','useData(base+"/queue?date="+day)'
 ])assert.ok(schedule.includes(token),token);
});

test("Clinic Phase 14: Gregorian local report period is bounded to backend's 366-day API rule",()=>{
 assert.equal(clinicValidReportDay("2028-02-29"),true);
 assert.equal(clinicValidReportDay("2026-02-29"),false);
 assert.equal(clinicValidReportDay("2026-13-01"),false);
 assert.equal(clinicValidReportDay("2026-11-17"),true);
 assert.equal(clinicReportPeriodIssue("2026-11-01","2026-11-17"),null);
 assert.equal(clinicReportPeriodIssue("2026-11-17","2026-11-16"),"INVALID_REPORT_PERIOD");
 assert.equal(clinicReportPeriodIssue("2026-02-30","2026-11-17"),"INVALID_DATE");
 assert.equal(clinicReportPeriodIssue("2026-01-01","2027-01-02"),"INVALID_REPORT_PERIOD");
 assert.equal(clinicReportPeriodIssue("2026-01-01","2027-01-02"),"INVALID_REPORT_PERIOD");
 assert.deepEqual(clinicReportPreset("week","2026-11-17"),
  {from:"2026-11-11",to:"2026-11-17"});
 assert.deepEqual(clinicReportPreset("thirtyDays","2026-11-17"),
  {from:"2026-10-19",to:"2026-11-17"});
 assert.deepEqual(clinicReportPreset("month","2026-11-17"),
  {from:"2026-11-01",to:"2026-11-17"});
 assert.deepEqual(clinicReportPreset("previousMonth","2026-01-17"),
  {from:"2025-12-01",to:"2025-12-31"});
 assert.deepEqual(clinicReportPreset("previousMonth","2028-03-15"),
  {from:"2028-02-01",to:"2028-02-29"});
 assert.throws(()=>clinicReportPreset("week","2026-02-30"),RangeError);
 assert.ok(reportApi.includes('if(duration<0||duration>366)opsFail(422,"INVALID_REPORT_PERIOD")'));
 assert.ok(reportApi.includes('timeZone:"Asia/Kabul"'));
});

test("Clinic Phase 14: report loads only after Apply, binds async response to clinic and applied range",()=>{
 for(const marker of [
  'const [applied,setApplied]=useState<ReportPeriod>',
  'const draftError=clinicReportPeriodIssue(from,to)',
  'const datesChanged=from!==applied.from||to!==applied.to',
  'function choosePreset(value:ReportPreset)',
  'clinicReportPreset(value,localDay())',
  'function applyRange(){',
  'if(draftError)return;',
  'setApplied({from,to});setCounter(x=>x+1)',
  'const key=space?space.clinicId+"|"+applied.from+"|"+applied.to:""',
  'const current=snapshot?.key===key?snapshot:null',
  'const controller=new AbortController()',
  'call18<Context>("/team/context","GET",undefined,controller.signal)',
  'call18<Report>("/insights/clinics/"+encodeURIComponent(space.clinicId)+"/report?"+',
  'return()=>{controller.abort();}',
  'setSnapshot({key:reportKey,data:null,error:"",loading:true})',
  'const data=current?.data??null',
  'if(!["owner","manager","cashier"].includes(space.role))',
  'disabled={Boolean(draftError)||busy}',
  'disabled={!data||busy||datesChanged||Boolean(draftError)}',
  'new URLSearchParams({from:applied.from,to:applied.to})',
  '<ClinicOpsBridge clinicId={space.clinicId} role={space.role} active="reports"/>'
 ])assert.ok(report.includes(marker),marker);
 for(const token of [
  'scope(req,clinicId)','if(!["owner","manager","cashier"].includes(person.role))',
  'privateOps(res)','eq(schema.clinicMembership.clinicId'
 ]){
  if(token.startsWith("eq("))continue;
  assert.ok(reportApi.includes(token),token);
 }
 assert.ok(!report.includes('setData(result)'));
});

test("Clinic Phase 14: report bars, status completion and CSV remain aggregated and non-clinical",()=>{
 assert.equal(clinicReportCompletion(0,0),null);
 assert.equal(clinicReportCompletion(10,5),50);
 assert.equal(clinicReportCompletion(3,4),null);
 assert.equal(clinicReportCompletion(5,-1),null);
 assert.equal(clinicReportCompletion(5,2),40);
 assert.deepEqual(clinicReportBars([
  {day:"2026-11-15",count:5},{day:"2026-11-16",count:10},
  {day:"2026-11-17",count:0}
 ]),[
  {day:"2026-11-15",count:5,width:50},
  {day:"2026-11-16",count:10,width:100},
  {day:"2026-11-17",count:0,width:0}
 ]);
 assert.deepEqual(clinicReportBars([{day:"2026-02-30",count:5}]),[]);
 for(const token of [
  'clinicReportBars(data.appointments.byDay)',
  'clinicReportCompletion(data.appointments.total,',
  'aria-label={item.day+" · "+item.count+" "+t("appointments")}',
  'href={clinicOpsHref("appointments",space.clinicId,item.day)}',
  'style={{width:item.width+"%"}}',
  'const csv=clinicCsvRows(rows)',
  'clinicCsvRows','["Timezone",data.timezone,"IANA"]',
  '["Scheduled appointments",data.appointments.total,"count"]',
  '"Net receipts",data.revenue.netReceiptsAfn',
  '["Posted operational expenses",data.revenue.postedExpensesAfn,"AFN"]',
  'copy.receiptsHint','copy.expensesHint','copy.clinical'
 ])assert.ok(report.includes(token),token);
 assert.ok(financeModel.includes("clinicCsvSafeCell"));
 assert.ok(reportApi.includes("e.kind<>'credit'"));
 assert.ok(reportApi.includes("e.kind='reversal'"));
 assert.ok(reportApi.includes("clinic_expenses"));
 assert.ok(reportApi.includes("clinic_appointments"));
 assert.ok(!report.includes('localStorage.setItem('));
 assert.ok(!report.includes('patientName'));
});

test("Clinic Phase 14: notification filters/paging are derived from real server metadata",()=>{
 const events=[
  {event_name:"booking_confirmed",status:"sent",attempt_count:1,created_at:"2026-11-17T00:00:00Z",sent_at:null,last_error_code:null},
  {event_name:"booking_failed",status:"failed",attempt_count:4,created_at:"2026-11-17T00:00:00Z",sent_at:null,last_error_code:"SMTP_CONNECTION"},
  {event_name:"booking_pending",status:"processing",attempt_count:1,created_at:"2026-11-17T00:00:00Z",sent_at:null,last_error_code:null}
 ];
 assert.equal(clinicDeliveryStatus("processing"),"queued");
 assert.deepEqual(clinicDeliveryStats(events),{queued:1,sent:1,failed:1,skipped:0});
 assert.equal(clinicDeliveryFiltered(events,"failed","book").length,1);
 assert.equal(clinicDeliveryFiltered(events,"all","CONFIRMED").length,1);
 assert.equal(clinicDeliveryFiltered(events,"all","none").length,0);
 assert.equal(clinicDeliveryPage(events,2,2).rows.length,1);
 assert.equal(clinicDeliveryPage([],9).start,0);
 for(const token of [
  'api<DeliveryRead>("/v1/booking/clinics/"+encodeURIComponent(cid)+"/notifications"',
  'const current=snapshot?.cid===cid?snapshot:null',
  'return()=>controller.abort()',
  'const counts=clinicDeliveryStats(deliveries)',
  'const matches=clinicDeliveryFiltered(deliveries,filter,search)',
  'const paging=clinicDeliveryPage(matches,page,10)',
  'visible=matches.slice((safePage-1)*10,safePage*10)',
  'if(document.visibilityState==="visible")reload()',
  'window.setInterval(visible,45000)',
  'role="status" aria-live="polite"',
  'if(!data.emailConfigured)',
  'safeDeliveryCode(event.last_error_code)',
  'copy.unavailable','copy.window',
  'const copy=deliveryUi[locale as keyof typeof deliveryUi]||deliveryUi.en',
  'type DeliveryEvent=ClinicDelivery'
 ])assert.ok(alerts.includes(token),token);
 for(const token of [
  'staff.get("/notifications",route(async(req:StaffRequest,res)=>{',
  'if(!["owner","manager"].includes(ctx.role))fail(403,"SETTINGS_ROLE_DENIED")',
  'WHERE b.clinic_id=${clinic} ORDER BY n.created_at DESC LIMIT 100',
  'smsConfigured:false,pushConfigured:false'
 ])assert.ok(notifyApi.includes(token),token);
 const scoped=alerts.slice(alerts.indexOf('function Notifications({cid}'));
 for(const forbidden of ['patientName','diagnosis','medicalNote','patientNumber','localStorage.setItem('])
  assert.ok(!scoped.includes(forbidden),forbidden);
});

test("Clinic Phase 14: reports and delivery enhancements stay inside clinic shell and respect localization",()=>{
 assert.ok(layout.includes('import "./clinic-staff-settings.css";\nimport "./clinic-cross-workspaces.css";'));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase14-bridge',
  '.clinic-persistent-shell .clinic-phase14-notifications',
  '.clinic-persistent-shell .clinic-phase14-report',
  '.clinic-persistent-shell .clinic-phase14-daily-chart',
  '.clinic-persistent-shell .clinic-phase14-report-toolbar',
  '.clinic-persistent-shell .clinic-phase14-report-loading',
  '.clinic-persistent-shell .clinic-phase14-delivery-event-main',
  ':focus-visible','@media(max-width:1150px)',
  '@media(max-width:760px)','@media(max-width:560px)',
  '@media(max-width:375px)','@media(prefers-reduced-motion:reduce)',
  'overflow-wrap:anywhere','min-width:0'
 ])assert.ok(css.includes(token),token);
 for(const token of [
  'heading:"Operations & financial insights"',
  'heading:"تحلیل عملیات و مالی"',
  'heading:"عملي او مالي شننې"',
  'dateError:"Enter two valid Gregorian dates',
  'dateError:"دو تاریخ معتبر میلادی',
  'dateError:"دوه سمې میلادي نېټې',
  'receiptsHint:"Amounts reflect manually posted payments',
  'receiptsHint:"مبالغ پرداخت دستی',
  'receiptsHint:"لاسي تادیې',
  'unavailable:"Email is not configured.',
  'unavailable:"ایمیل تنظیم نشده',
  'unavailable:"ایمیل نه دی تنظیم شوی'
 ])assert.ok(report.includes(token)||alerts.includes(token),token);
 for(const bad of [':root{','body{','svg path{','.odontogram{','Math.random('])
  assert.ok(!css.includes(bad),bad);
 for(const name of ["admin-web","patient-web"]){
  assert.ok(!read("apps/"+name+"/app/layout.tsx").includes("clinic-cross-workspaces.css"));
 }
});
