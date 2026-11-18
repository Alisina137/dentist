import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const exportsObj={},module={exports:exportsObj};
new Function("module","exports",ts.transpileModule(
 read("apps/mobile/native-clinic-phase22-model.ts"),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
 }).outputText)(module,exportsObj);
const m=module.exports;
const cid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const id="11111111-1111-4111-8111-111111111111";
const pid="22222222-2222-4222-8222-222222222222";
const sid="33333333-3333-4333-8333-333333333333";
const provider="44444444-4444-4444-8444-444444444444";
const appointment=(updates={})=>({
 id,clinicId:cid,patientId:pid,serviceId:sid,providerMembershipId:provider,
 resourceId:null,serviceName:"Cleaning",providerName:"Test Dentist",
 serviceDurationMinutes:30,revision:1,status:"confirmed",
 source:"staff",patient:{id:pid,preferredName:"Test Patient",familyName:"Example",
  phone:"SECRET-PHONE",birthDate:"SECRET-DOB"},
 administrativeNote:"SECRET-ADMIN-NOTE",servicePriceAfn:350,
 startAt:"2026-11-18T06:00:00.000Z",endAt:"2026-11-18T06:30:00.000Z",
 ...updates
});
const counts={confirmed:1,arrived:0,in_treatment:0,completed:0,no_show:0};
test("C22 dates: Kabul-based timezone, real calendar dates, Sat and Mon week",()=>{
 assert.equal(m.kabulToday(new Date("2026-11-17T20:00:00.000Z")),"2026-11-18");
 assert.equal(m.validDay("2026-02-30"),false);
 assert.equal(m.validDay("2026-02-28"),true);
 assert.equal(m.shiftDay("2026-12-31",1),"2027-01-01");
 assert.deepEqual(m.weekWindow("2026-11-18","fa-AF"),{
  from:"2026-11-14",to:"2026-11-20"});
 assert.deepEqual(m.weekWindow("2026-11-18","ps-AF"),{
  from:"2026-11-14",to:"2026-11-20"});
 assert.deepEqual(m.weekWindow("2026-11-18","en"),{
  from:"2026-11-16",to:"2026-11-22"});
 assert.equal(m.bookingDateAllowed("2026-11-17","2026-11-18"),false);
 assert.equal(m.bookingDateAllowed("2026-11-18","2026-11-18"),true);
 assert.equal(m.bookingDateAllowed("2028-01-01","2026-11-18"),false);
});
test("C22 appointment parsing: allowlist and clinician assistant redactions",()=>{
 const found=m.parseAppointment(appointment(),cid);
 assert.equal(found.status,"confirmed");
 assert.equal(found.patientName,"Test Patient");
 assert.equal(found.providerMembershipId,provider);
 assert.equal(found.revision,1);
 for(const secret of ["SECRET-PHONE","SECRET-DOB","SECRET-ADMIN-NOTE",
  "servicePriceAfn","familyName","patientNumber"]){
  assert.equal(JSON.stringify(found).includes(secret),false,secret);
 }
 assert.equal(m.parseAppointment(appointment({clinicId:other}),cid),null);
 assert.equal(m.parseAppointment(appointment({revision:0}),cid),null);
 assert.equal(m.parseAppointment(appointment({status:"approved"}),cid),null);
 const assistant=m.parseAppointment(appointment({patient:{id:pid,preferredName:"Patient",familyName:null}}),cid);
 assert.equal(assistant.patientName,"Patient");
 assert.equal(m.parseAppointment(appointment({patient:null}),cid).patientName,"");
});
test("C22 calendar/queue fail closed, never cross tenant, no truncated write context",()=>{
 const raw={date:"2026-11-18",timezone:"Asia/Kabul",queue:[appointment()],
  counts:{...counts}};
 const q=m.parseQueue(raw,cid,"2026-11-18");
 assert.equal(q.appointments.length,1);
 assert.equal(m.parseQueue({...raw,date:"2026-11-19"},cid,"2026-11-18"),null);
 assert.equal(m.parseQueue({...raw,queue:[appointment({clinicId:other})]},cid,"2026-11-18"),null);
 assert.equal(m.parseQueue({...raw,queue:[appointment(),appointment()]},cid,"2026-11-18"),null);
 assert.equal(m.parseQueue({...raw,counts:{...counts,confirmed:2}},cid,"2026-11-18"),null);
 const calendar={appointments:[appointment()],total:1,truncated:false,
  range:{from:"2026-11-18",to:"2026-11-18"},timezone:"Asia/Kabul"};
 assert.equal(m.parseCalendar(calendar,cid,"2026-11-18","2026-11-18").total,1);
 assert.equal(m.parseCalendar({...calendar,truncated:true},cid,"2026-11-18","2026-11-18"),null);
 assert.equal(m.parseCalendar({...calendar,appointments:[appointment({clinicId:other})]},cid,
  "2026-11-18","2026-11-18"),null);
 assert.equal(m.parseCalendar(calendar,cid,"2026-11-17","2026-11-18"),null);
 assert.equal(m.parseAppointmentDetail({appointment:appointment(),timezone:"Asia/Kabul"},cid,id).id,id);
 assert.equal(m.parseAppointmentDetail({appointment:appointment(),timezone:"Asia/Kabul"},other,id),null);
});
test("C22 service catalog, patient search and server-generated available slots validated",()=>{
 const services={services:[{id:sid,name:"Cleaning",durationMinutes:30,requiresChair:true}],
  providers:[{membershipId:provider,name:"Test Dentist"}],
  resources:[{id:"55555555-5555-4555-8555-555555555555",label:"Chair 1"}],
  timezone:"Asia/Kabul"};
 assert.equal(m.parseCatalog(services).providers[0].membershipId,provider);
 assert.equal(m.parseCatalog({...services,providers:[{membershipId:"bad",name:"X"}]}),null);
 const patients={patients:[{id:pid,preferredName:"Test",familyName:"Person",
  patientNumber:"T0001",phone:"SECRET_PHONE"}]};
 assert.equal(m.parsePatientSearch(patients)[0].id,pid);
 assert.equal(JSON.stringify(m.parsePatientSearch(patients)).includes("SECRET_PHONE"),false);
 assert.equal(m.parsePatientSearch({patients:[{...patients.patients[0],id:"BAD"}]}),null);
 const preview={clinicId:cid,service:{id:sid},date:"2026-11-18",providerId:provider,
  timezone:"Asia/Kabul",staffBookable:true,status:"ready",
  slots:[{start:"10:00",end:"10:30",resourceId:null,startAt:"2026-11-18T05:30:00Z"}]};
 assert.equal(m.parseSlots(preview,cid,"2026-11-18",sid,provider).slots.length,1);
 assert.equal(m.parseSlots({...preview,clinicId:other},cid,"2026-11-18",sid,provider),null);
 assert.equal(m.parseSlots({...preview,staffBookable:false},cid,"2026-11-18",sid,provider),null);
 assert.equal(m.parseSlots({...preview,slots:[{...preview.slots[0],start:"10:13"}]},
  cid,"2026-11-18",sid,provider),null);
});
test("C22 role permissions, transitions, no-show/cancel reason gates",()=>{
 for(const role of ["owner","manager","receptionist","dentist","assistant"])
  assert.equal(m.canReadAppointments(role),true);
 assert.equal(m.canReadAppointments("cashier"),false);
 for(const role of ["owner","manager","dentist","receptionist"])
  assert.equal(m.canBook(role),true);
 assert.equal(m.canBook("assistant"),false);
 assert.equal(m.canBook("cashier"),false);
 assert.deepEqual(m.allowedTransition("receptionist",false,"confirmed"),
  ["arrived","no_show","cancelled"]);
 assert.deepEqual(m.allowedTransition("assistant",true,"confirmed"),[]);
 assert.deepEqual(m.allowedTransition("dentist",false,"arrived"),[]);
 assert.deepEqual(m.allowedTransition("dentist",true,"arrived"),["in_treatment"]);
 assert.deepEqual(m.allowedTransition("dentist",true,"in_treatment"),["completed"]);
 assert.deepEqual(m.allowedTransition("cashier",true,"confirmed"),[]);
 assert.deepEqual(m.allowedTransition("owner",false,"confirmed"),["arrived","no_show","cancelled"]);
 assert.equal(m.transitionReasonValid("no_show","short"),false);
 assert.equal(m.transitionReasonValid("cancelled","detailed reason"),true);
 assert.equal(m.transitionReasonValid("arrived",""),true);
 assert.equal(m.rescheduleReasonValid("short"),false);
 assert.equal(m.rescheduleReasonValid("Patient requested time change"),true);
 assert.match(m.newActionKey(1000,.5),/^mobile_[a-z0-9]+_[a-z0-9]+$/);
});
test("C22 integration wiring preserves existing server enforcement and PH19 release guard",()=>{
 const source=read("apps/mobile/native-clinic-phase22.tsx");
 const shell=read("apps/mobile/native-clinic.tsx");
 const dashboard=read("apps/mobile/native-clinic-phase21.tsx");
 const routes=read("apps/api/src/appointments-router.ts");
 const service=read("apps/api/src/appointments-service.ts");
 const pilot=read("apps/api/src/pilot-gate.ts");
 assert.match(shell,/NativeClinicPhase22/);
 assert.match(shell,/"appointments","calendar"/);
 assert.match(dashboard,/onNavigate\("appointments"\)/);
 for(const route of ["/queue?date=","/calendar?from=","/catalog","/patients/search?q=",
  "/slots?","/appointments/"]){
  assert.ok(source.includes(route),route);
 }
 assert.ok(source.includes("idempotencyKey"));
 assert.ok(source.includes("Alert.alert"));
 assert.ok(source.includes("revision:appt.revision"));
 assert.ok(source.includes("parseAppointmentDetail"));
 assert.ok(source.includes("controller.abort()"));
 assert.ok(source.includes("AppState.addEventListener"));
 assert.ok(!source.includes("AsyncStorage"));
 assert.ok(!source.includes("SecureStore"));
 assert.ok(!source.includes("localStorage"));
 assert.ok(routes.includes('clinic.post("/appointments"'));
 assert.ok(routes.includes('"/reschedule"'));
 assert.ok(routes.includes('"/status"'));
 assert.ok(service.includes("APPOINTMENT_ROLE_DENIED"));
 assert.ok(service.includes("STALE_APPOINTMENT_REVISION"));
 assert.ok(service.includes("SUBSCRIPTION_REQUIRED"));
 assert.ok(service.includes("idempotencyKey"));
 assert.ok(pilot.includes("PH19_PILOT_RELEASE_ENABLED"));
 assert.ok(pilot.includes("protectHealthWrites"));
});
