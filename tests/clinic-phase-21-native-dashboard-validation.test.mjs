import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const mod={exports:{}};
const js=ts.transpileModule(read("apps/mobile/native-clinic-phase21-model.ts"),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
new Function("module","exports",js)(mod,mod.exports);
const m=mod.exports;
const clinicId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const statuses={confirmed:2,arrived:1,in_treatment:1,completed:1,no_show:0};
const appointment=(id,status="confirmed",clinic=clinicId,patient={preferredName:"Synthetic"})=>({
 id,clinicId:clinic,status,startAt:"2026-11-18T06:00:00.000Z",
 endAt:"2026-11-18T06:30:00.000Z",providerName:"Synthetic Dentist",
 patient,phone:"SHOULD_NOT_EXPORT",patientId:"SHOULD_NOT_EXPORT",
 administrativeNote:"SHOULD_NOT_EXPORT",familyName:"SHOULD_NOT_EXPORT"
});
const rowIds=["11111111-1111-4111-8111-111111111111",
 "22222222-2222-4222-8222-222222222222",
 "33333333-3333-4333-8333-333333333333",
 "44444444-4444-4444-8444-444444444444",
 "55555555-5555-4555-8555-555555555555"];
const queue=()=>({date:"2026-11-18",timezone:"Asia/Kabul",counts:{...statuses},
 queue:[
 appointment(rowIds[0]),appointment(rowIds[1]),
 appointment(rowIds[2],"arrived"),appointment(rowIds[3],"in_treatment"),
 appointment(rowIds[4],"completed")
 ]});
const operations=()=>({timezone:"Asia/Kabul",
 metrics:{services:4,chairs:3,openDays:6,scheduledDentists:2},
 checklist:[
 {key:"service",done:true},{key:"chair",done:true},
 {key:"clinicHours",done:true},{key:"dentistHours",done:false}
 ],
 readyForPreview:false});
const schedule=()=>({today:"2026-11-18",timezone:"Asia/Kabul",
 todayTotal:5,weekTotal:19,counts:{...statuses}});
test("Clinic Phase21: every server-allowed dashboard role is enforced before read",()=>{
 for(const role of ["owner","manager","dentist","receptionist"]){
  assert.equal(m.dashboardCanRead(role,"operations"),true);
  assert.equal(m.dashboardCanRead(role,"appointments"),true);
  assert.equal(m.dashboardCanRead(role,"queue"),true);
 }
 assert.equal(m.dashboardCanRead("assistant","operations"),false);
 assert.equal(m.dashboardCanRead("assistant","appointments"),true);
 assert.equal(m.dashboardCanRead("assistant","queue"),true);
 for(const resource of ["operations","appointments","queue"]){
  assert.equal(m.dashboardCanRead("cashier",resource),false);
 }
 assert.deepEqual(m.dashboardShortcuts("cashier"),["finance","account"]);
 assert.deepEqual(m.dashboardShortcuts("assistant"),["today","account"]);
 assert.equal(m.dashboardShortcuts("dentist").includes("finance"),false);
 assert.equal(m.dashboardShortcuts("receptionist").includes("registration"),false);
 assert.equal(m.dashboardShortcuts("owner").includes("registration"),true);
 assert.equal(m.canUseDashboardRoute("assistant","patients"),false);
 assert.equal(m.canUseDashboardRoute("owner","registration"),true);
 const cashier=m.dashboardEmptySnapshot("cashier");
 assert.deepEqual([cashier.operations.state,cashier.schedule.state,cashier.queue.state],
  ["forbidden","forbidden","forbidden"]);
});
test("Clinic Phase21: real operational setup only, fail closed on missing checks",()=>{
 const good=m.parseOperationalSummary(operations());
 assert.equal(good.metrics.scheduledDentists,2);
 assert.equal(good.checklist.find(x=>x.key==="dentistHours").done,false);
 assert.equal(good.readyForPreview,false);
 assert.equal(m.parseOperationalSummary({...operations(),timezone:"UTC"}),null);
 assert.equal(m.parseOperationalSummary({...operations(),metrics:{services:-1,chairs:0,
  openDays:3,scheduledDentists:2}}),null);
 assert.equal(m.parseOperationalSummary({...operations(),checklist:[operations().checklist[0]]}),null);
 assert.equal(m.parseOperationalSummary({...operations(),checklist:[
  operations().checklist[0],operations().checklist[0],
  operations().checklist[2],operations().checklist[3]
 ]}),null);
});
test("Clinic Phase21: summary totals validated before presentation",()=>{
 const good=m.parseScheduleSummary(schedule());
 assert.equal(good.todayTotal,5);
 assert.equal(good.counts.arrived,1);
 assert.equal(m.parseScheduleSummary({...schedule(),todayTotal:6}),null);
 assert.equal(m.parseScheduleSummary({...schedule(),counts:{confirmed:2}}),null);
 assert.equal(m.parseScheduleSummary({...schedule(),today:"2026-02-30"}),null);
 assert.equal(m.parseScheduleSummary({...schedule(),timezone:"Asia/Tehran"}),null);
});
test("Clinic Phase21: queue is strictly selected-tenant and redacted",()=>{
 const found=m.parseQueueSummary(queue(),clinicId,"2026-11-18");
 assert.equal(found.rows.length,5);
 assert.equal(found.total,5);
 assert.equal(found.rows[0].preferredName,"Synthetic");
 const serial=JSON.stringify(found);
 for(const secret of ["SHOULD_NOT_EXPORT","familyName","patientId","phone",
   "administrativeNote","clinicId","endAt"])
  assert.equal(serial.includes(secret),false,"queue preview leaked "+secret);
 const mismatched=queue();mismatched.queue[1].clinicId=other;
 assert.equal(m.parseQueueSummary(mismatched,clinicId,"2026-11-18"),null);
 assert.equal(m.parseQueueSummary(queue(),other,"2026-11-18"),null);
 assert.equal(m.parseQueueSummary(queue(),clinicId,"2026-11-17"),null);
 const duplicates=queue();duplicates.queue[1].id=duplicates.queue[0].id;
 assert.equal(m.parseQueueSummary(duplicates,clinicId),null);
 const badPatient=queue();badPatient.queue[0].patient={preferredName:42};
 assert.equal(m.parseQueueSummary(badPatient,clinicId),null);
 const badTime=queue();badTime.queue[0].startAt="not-date";
 assert.equal(m.parseQueueSummary(badTime,clinicId),null);
 const fakeCount=queue();fakeCount.counts.arrived=0;
 assert.equal(m.parseQueueSummary(fakeCount,clinicId),null);
});
test("Clinic Phase21: preview is bounded to six and never stores notes",()=>{
 const many=queue();
 many.queue=[...Array.from({length:12},(_,i)=>appointment(
  String(i+10).padStart(36,"a")))];
 many.counts={confirmed:12,arrived:0,in_treatment:0,completed:0,no_show:0};
 const result=m.parseQueueSummary(many,clinicId);
 assert.equal(result.total,12);
 assert.equal(result.rows.length,6);
 assert.equal(m.snapshotIsStale({observedAt:1000},121000),false);
 assert.equal(m.snapshotIsStale({observedAt:1000},121001),true);
 assert.equal(m.snapshotIsStale({observedAt:null},1000),true);
 assert.equal(m.snapshotIsStale({observedAt:Date.now()+60000},Date.now()),true);
});
test("Clinic Phase21: dashboard source respects role and patient data safeguards",()=>{
 const src=read("apps/mobile/native-clinic-phase21.tsx");
 const native=read("apps/mobile/native-clinic.tsx");
 const appointmentsApi=read("apps/api/src/appointments-router.ts");
 const opsApi=read("apps/api/src/operations-router.ts");
 const access=read("apps/api/src/appointments-service.ts");
 assert.match(native,/NativeClinicPhase21/);
 assert.doesNotMatch(native,/tab==="overview"\?<View style=\{\{gap:14\}\}>/);
 assert.match(src,/Promise\.allSettled/);
 assert.match(src,/controller\.abort\(\)/);
 assert.match(src,/AppState\.addEventListener/);
 assert.match(src,/dashboardCanRead\(clinic\.role/);
 assert.match(src,/clinic\.clinicId/);
 assert.match(src,/request<unknown>\(paths\[name\],"GET",undefined,controller\.signal\)/);
 assert.match(src,/onNavigate\("onboard"\)/);
 assert.match(src,/onOpenWeb/);
 assert.match(src,/snapshotIsStale\(snapshot,clock\)/);
 assert.match(src,/accessibilityRole="button"/);
 assert.match(appointmentsApi,/appointmentAccess\(req,cid\(req\),"read"\)/);
 assert.match(appointmentsApi,/clinic\.get\("\/queue"/);
 assert.match(appointmentsApi,/clinic\.get\("\/overview"/);
 assert.match(opsApi,/clinic\.get\("\/summary"/);
 assert.match(access,/ctx\.role!=="dentist"\|\|a\.providerMembershipId===ctx\.membership\.id/);
 assert.doesNotMatch(src,/AsyncStorage/);
 assert.doesNotMatch(src,/SecureStore/);
 assert.doesNotMatch(src,/setItem/);
 assert.doesNotMatch(src,/appointment\.administrativeNote/);
 assert.doesNotMatch(src,/invoice|payment|creditCard/);
});
