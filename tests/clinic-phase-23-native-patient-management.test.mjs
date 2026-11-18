import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
function loadCommonJs(path,dependencies={}){
 const module={exports:{}};
 const content=ts.transpileModule(read(path),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
 }).outputText;
 new Function("module","exports","require",content)(module,module.exports,name=>{
  if(name in dependencies)return dependencies[name];
  throw Error("UNKNOWN_DEPENDENCY:"+name);
 });
 return module.exports;
}
const appointment={parseAppointment:(raw,cid)=>{
 if(!raw||raw.clinicId!==cid||typeof raw.id!=="string"||raw.id.length<8||
  !raw.patientId||!raw.serviceName||!raw.startAt||!raw.endAt)return null;
 return {id:raw.id,clinicId:cid,patientId:raw.patientId,status:raw.status,
  serviceName:raw.serviceName,startAt:raw.startAt,endAt:raw.endAt,
  providerName:raw.providerName,revision:raw.revision};
}};
const m=loadCommonJs("apps/mobile/native-clinic-phase23-model.ts",{
 "./native-clinic-phase22-model":appointment
});
const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const pid="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const doctor="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const brief=(changes={})=>({
 id:pid,patientNumber:"P-000011",preferredName:"Test",familyName:"Patient",
 phone:"+93700000000",phoneVerified:false,emergencyContact:"SECRET_EMERGENCY",
 status:"active",revision:2,
 createdAt:"2026-11-17T09:00:00.000Z",updatedAt:"2026-11-18T09:00:00.000Z",
 ...changes
});
const counts={counts:{active:2,inactive:1,archived:0},total:3};
const directory=(changes={})=>({
 patients:[brief()],total:1,page:1,limit:10,pages:1,sort:"activity",status:"active",query:"",
 ...changes
});
const profile=(changes={},flags={})=>({
 patient:{...brief(),alternateContact:"friend contact",dateOfBirth:null,
  ageEstimate:26,dobIsEstimated:true,province:"Kabul",city:"Kabul",
  address:"Street 1",emergencyContact:"SECRET_EMERGENCY",...changes},
 clinicalAvailable:true,appointmentsAvailable:true,financialAvailable:false,...flags
});
test("C23-01 patient role boundaries: cashier identity-only, assistant none",()=>{
 for(const role of ["owner","manager","dentist","receptionist","cashier"])
  assert.equal(m.canReadPatients(role),true,role);
 assert.equal(m.canReadPatients("assistant"),false);
 for(const role of ["owner","manager","dentist","receptionist"]){
  assert.equal(m.canWritePatients(role),true);
  assert.equal(m.canViewPatientAppointments(role),true);
 }
 assert.equal(m.canWritePatients("cashier"),false);
 assert.equal(m.canViewPatientAppointments("cashier"),false);
 assert.equal(m.canViewContact("cashier"),false);
 assert.equal(m.canViewClinicalHistory("dentist",false),true);
 assert.equal(m.canViewClinicalHistory("owner",false),false);
 assert.equal(m.canViewClinicalHistory("manager",true),true);
 assert.equal(m.canViewClinicalHistory("receptionist",true),false);
 assert.equal(m.canChangePatientStatus("owner"),true);
 assert.equal(m.canChangePatientStatus("manager"),true);
 assert.equal(m.canChangePatientStatus("dentist"),false);
});
test("C23-02 directory query is bounded, tenant/role filters do not cross clinics",()=>{
 const path=m.directoryPath(id,1,"active","name","Test+Patient");
 assert.ok(path.includes("/v1/registry/clinics/"+id+"/patients?"));
 assert.ok(path.includes("limit=10"));
 assert.ok(path.includes("sort=name"));
 assert.ok(path.includes("q=Test%2BPatient"));
 assert.throws(()=>m.directoryPath("OTHER",1,"active","name","x"));
 assert.throws(()=>m.directoryPath(id,0,"active","name","x"));
 assert.throws(()=>m.directoryPath(id,1,"strange","name","x"));
 const p=m.parseDirectory(directory(),{page:1,status:"active",sort:"activity",query:""});
 assert.equal(p.total,1);assert.equal(p.patients.length,1);
 assert.equal(p.patients[0].phone,undefined);
 assert.equal(p.patients[0].emergencyContact,undefined);
 assert.equal(m.parseDirectory(directory({query:"secret"}),
  {page:1,status:"active",sort:"activity",query:""}),null);
 assert.equal(m.parseDirectory(directory({patients:[brief({status:"archived"})]}),
  {page:1,status:"active",sort:"activity",query:""}),null);
 assert.equal(m.parseDirectory(directory({patients:[brief(),brief()]}),
  {page:1,status:"active",sort:"activity",query:""}),null);
 assert.equal(m.parseDirectory(directory({limit:100}),
  {page:1,status:"active",sort:"activity",query:""}),null);
});
test("C23-03 summary validated and unknown metrics never become fake zeros",()=>{
 assert.deepEqual(m.parsePatientCounts(counts),{
  active:2,inactive:1,archived:0,total:3
 });
 assert.equal(m.parsePatientCounts({...counts,total:4}),null);
 assert.equal(m.parsePatientCounts({counts:{...counts.counts,active:-1},total:1}),null);
 assert.equal(m.parsePatientCounts({counts:{active:0},total:0}),null);
 assert.equal(m.parseDirectory({patients:[],total:0,page:1,pages:1,limit:10,
  sort:"activity",status:"active",query:""},
  {page:1,status:"active",sort:"activity",query:""}).patients.length,0);
});
test("C23-04 patient profile is allowlisted and cashier cannot see contact/DOB",()=>{
 const data=m.parsePatientProfile(profile(),pid,"dentist");
 assert.equal(data.patient.ageEstimate,26);
 assert.equal(data.patient.phone,"+93700000000");
 assert.equal(data.patient.phoneVerified,false);
 assert.equal(data.patient.revision,2);
 const asCashier=m.parsePatientProfile(profile(),pid,"cashier");
 for(const field of ["phone","emergencyContact","alternateContact","dateOfBirth",
  "ageEstimate","address","city"]){
  assert.equal(asCashier.patient[field],null,field);
 }
 assert.equal(asCashier.clinicalAvailable,false);
 assert.equal(asCashier.appointmentsAvailable,false);
 assert.equal(m.parsePatientProfile(profile(),pid,"assistant"),null);
 assert.equal(m.parsePatientProfile(profile({id:doctor}),pid,"dentist"),null);
 assert.equal(m.parsePatientProfile(profile({dateOfBirth:"2026-13-40"}),pid,"dentist"),null);
 assert.equal(m.parsePatientProfile(profile({ageEstimate:7,dateOfBirth:"2019-01-01"}),pid,"dentist"),null);
});
test("C23-05 create/edit demographics need privacy consent, no double age/DOB",()=>{
 const draft={...m.newPatientDraft(),preferredName:"Sample Patient",
  phone:"+93700123456",ageEstimate:"26",province:"Kabul",
  noticeAcknowledged:true};
 assert.deepEqual(m.validatePatientDraft(draft),[]);
 const result=m.patientPayload(draft);
 assert.equal(result.preferredName,"Sample Patient");
 assert.equal(result.ageEstimate,26);
 assert.equal(result.noticeAcknowledged,true);
 assert.equal(result.dateOfBirth,null);
 assert.equal(result.phone,"+93700123456");
 const toEdit=m.profileToDraft(m.parsePatientProfile(profile(),pid,"owner").patient);
 assert.equal(toEdit.emergencyContact,"SECRET_EMERGENCY");
 assert.equal(toEdit.ageEstimate,"26");
 assert.equal(m.patientPayload(toEdit,2).revision,2);
 assert.throws(()=>m.patientPayload({...draft,noticeAcknowledged:false}));
 assert.ok(m.validatePatientDraft({...draft,dateOfBirth:"2000-01-01"})
  .includes("birthChoice"));
 assert.ok(m.validatePatientDraft({...draft,phone:"1234"}).includes("phone"));
 assert.ok(m.validatePatientDraft({...draft,ageEstimate:"121"}).includes("ageEstimate"));
 assert.equal(m.validBirthDate("2026-02-30"),false);
 assert.equal(m.validBirthDate("2020-02-29"),true);
 assert.throws(()=>m.patientPayload(draft,0));
 assert.equal(m.validStatusReason("too short"),false);
 assert.equal(m.validStatusReason("verified administrative reason"),true);
});
test("C23-06 appointment history shows only selected patient's bounded authorized rows",()=>{
 const row={id:doctor,clinicId:id,patientId:pid,status:"completed",serviceName:"Cleaning",
  providerName:"Tester",startAt:"2026-11-18T05:00:00Z",endAt:"2026-11-18T05:30:00Z",
  revision:1,patientPhone:"PRIVATE_PHONE",administrativeNote:"PRIVATE_NOTE"};
 const parsed=m.parsePatientHistory({patient:{id:pid},appointments:[row],
  total:1,maximumRows:150},id,pid,"dentist");
 assert.equal(parsed.rows.length,1);
 assert.equal(JSON.stringify(parsed).includes("PRIVATE_PHONE"),false);
 assert.equal(JSON.stringify(parsed).includes("PRIVATE_NOTE"),false);
 assert.equal(m.parsePatientHistory({patient:{id:doctor},appointments:[row],
  total:1,maximumRows:150},id,pid,"dentist"),null);
 assert.equal(m.parsePatientHistory({patient:{id:pid},appointments:[{...row,patientId:doctor}],
  total:1,maximumRows:150},id,pid,"dentist"),null);
 assert.equal(m.parsePatientHistory({patient:{id:pid},appointments:[row],
  total:1,maximumRows:150},id,pid,"cashier"),null);
 assert.equal(m.parsePatientHistory({patient:{id:pid},appointments:[row],
  total:10,maximumRows:150},id,pid,"dentist"),null);
});
test("C23-07 clinician-only encounter metadata excludes all clinical narratives",()=>{
 const encounter={id:doctor,status:"signed",created_at:"2026-11-18T05:00:00Z",
  author_name:"Assigned Clinician",reason:"SECRET_COMPLAINT",findings:"SECRET_FINDINGS"};
 const encounters=m.parseEncounterHistory({
  patient:{id:pid},encounters:[encounter]
 },pid);
 assert.deepEqual(encounters,[{id:doctor,status:"signed",
  createdAt:"2026-11-18T05:00:00Z",authorName:"Assigned Clinician"}]);
 assert.equal(JSON.stringify(encounters).includes("SECRET_COMPLAINT"),false);
 assert.equal(JSON.stringify(encounters).includes("SECRET_FINDINGS"),false);
 assert.equal(m.parseEncounterHistory({patient:{id:pid},
  encounters:[{...encounter,status:"unverified"}]},pid),null);
 const plans=m.parseTreatmentStatus({summary:[{id:doctor,status:"in_progress",
  expected_sessions:3,stage_count:4,completed_stages:1,version:2,
  estimate_total_afn:999999,notes:"SECRET_TREATMENT"}]});
 assert.equal(plans.length,1);
 assert.equal(plans[0].completedStages,1);
 assert.equal(JSON.stringify(plans).includes("SECRET_TREATMENT"),false);
 assert.equal(JSON.stringify(plans).includes("estimate_total_afn"),false);
 assert.equal(m.parseTreatmentStatus({summary:[{...plans[0],
  expected_sessions:3,stage_count:4,completed_stages:5,version:2}]}),null);
});
test("C23-08 native route wiring, backend audit, PH19 and privacy isolation",()=>{
 const native=read("apps/mobile/native-clinic.tsx");
 const patient=read("apps/mobile/native-clinic-phase23.tsx");
 const home=read("apps/mobile/native-clinic-phase21.tsx");
 const registry=read("apps/api/src/patient-registry.ts");
 const service=read("apps/api/src/patient-service.ts");
 const appointments=read("apps/api/src/appointments-router.ts");
 const clinical=read("apps/api/src/clinical-router.ts");
 const treatment=read("apps/api/src/treatment-router.ts");
 const pilot=read("apps/api/src/pilot-gate.ts");
 assert.match(native,/NativeClinicPhase23/);
 assert.match(native,/"patients","users"/);
 assert.match(home,/onNavigate\("patients"\)/);
 assert.match(patient,/controller.abort\(\)/);
 assert.match(patient,/AppState.addEventListener/);
 assert.match(patient,/patientPayload/);
 assert.match(patient,/parsePatientHistory/);
 assert.match(patient,/parseTreatmentStatus/);
 assert.match(patient,/parseEncounterHistory/);
 assert.match(patient,/noticeAcknowledged/);
 assert.match(patient,/canViewClinicalHistory/);
 assert.match(patient,/canChangePatientStatus/);
 assert.match(patient,/Alert.alert/);
 for(const action of ["patients/duplicates","patients/summary","/patients/",
   "/status","/encounters","/status-summary"]){
  assert.ok(patient.includes(action),action);
 }
 assert.doesNotMatch(patient,/AsyncStorage|SecureStore|localStorage|console.log/);
 assert.match(registry,/patientAccess\(req,cid,"read"\)/);
 assert.match(registry,/patientAccess\(req,cid,"write"\)/);
 assert.match(registry,/STALE_PATIENT_REVISION/);
 assert.match(service,/if\(role==="cashier"\)/);
 assert.match(appointments,/ctx.role==="dentist"\?\[/);
 assert.match(appointments,/eq\(schema.clinicAppointment.providerMembershipId,ctx.membership.id\)/);
 assert.match(clinical,/e.provider_membership_id=\$\{ctx.membership.id\}/);
 assert.match(treatment,/p.clinician_membership_id=\$\{ctx.membership.id\}/);
 assert.match(pilot,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(pilot,/protectHealthWrites/);
});
