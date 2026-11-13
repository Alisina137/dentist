import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {API,origin,key,request,ok,fixture,doBooking,
 admin,owner,dentist,dentist2,reception,assistant,stranger,
 clinic,unrelated,service,chair,p1,p2,date,base} from "./phase07-fixture.mjs";

const chart="/v1/chart/clinics/"+clinic.id+"/patients/";
const clinical="/v1/clinical/clinics/"+clinic.id+"/patients/";
function localDay(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Kabul"})
  .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join("-");
}
const today=localDay(),earlier=new Date(Date.parse(today+"T00:00:00Z")-8*86400000).toISOString().slice(0,10);
const first=chart+p1.id,second=chart+p2.id;
const note={encounterId:"",dentition:"permanent",toothCode:"11",condition:"caries_suspected",
 surfaces:["I"],notes:"Test-only clinical observation; not a diagnosis",observationDate:earlier,
 actionKey:key()};
ok(await request(first+"/context","GET",undefined,reception.session),[403],
 "front desk cannot see chart");
ok(await request(first+"/context","GET",undefined,admin.session),[403],
 "platform admin cannot see clinical chart");
ok(await request(first+"/context","GET",undefined,stranger.session),[404],
 "unaffiliated account sees clinic not found");
ok(await request(first+"/context","GET",undefined,dentist.session),[403],
 "dentist without assigned appointment or encounter cannot browse chart");
const start=ok(await request(clinical+p1.id+"/encounters","POST",
 {reason:"Clinical observation of patient teeth"},dentist.session),[201],"start encounter");
note.encounterId=start.id;
const context=ok(await request(first+"/context","GET",undefined,dentist.session),
 [200],"assigned clinician chart context");
assert.ok(context.encounters.some(x=>x.id===start.id));
assert.equal(context.system,"FDI");
assert.equal(context.noAutomatedDiagnosis,true);
ok(await request(first+"/context","GET",undefined,dentist2.session),[403],
 "dentist cannot read unassigned case");
ok(await request(first+"/context","GET",undefined,assistant.session),[403],
 "assistant without own draft cannot read chart");
const initial=ok(await request(first+"/snapshot?dentition=permanent","GET",undefined,dentist.session),
 [200],"empty permanent chart");
assert.equal(initial.observedCount,0);
ok(await request(first+"/observations","POST",{...note,toothCode:"19",actionKey:key()},dentist.session),
 [422],"reject permanent tooth 19");
ok(await request(first+"/observations","POST",{...note,toothCode:"59",dentition:"primary",actionKey:key()},
 dentist.session),[422],"reject primary tooth 59");
ok(await request(first+"/observations","POST",{...note,toothCode:"51",dentition:"permanent",actionKey:key()},
 dentist.session),[422],"tooth and dentition must match");
ok(await request(first+"/observations","POST",{...note,surfaces:["O"],actionKey:key()},
 dentist.session),[422],"occlusal surface cannot describe incisor");
ok(await request(first+"/observations","POST",{...note,observationDate:"2100-01-01",actionKey:key()},
 dentist.session),[422],"future observation rejected");
ok(await request(first+"/observations","POST",note,reception.session),[403],"reception cannot write chart");
ok(await request(first+"/observations","POST",note,dentist2.session),[403],
 "unassigned dentist cannot write chart");
ok(await request("/v1/chart/clinics/"+unrelated.id+"/patients/"+p1.id+"/context",
 "GET",undefined,dentist.session),[404],"cross-tenant patient inaccessible");
const firstSave=await request(first+"/observations","POST",note,dentist.session);
if(firstSave.status>=500){
 const log=await readFile("/tmp/dandanlink-api.log","utf8").catch(()=>"");
 // Filter safe error metadata only: NEVER print identity, tokens, query values or PHI.
 console.error("PH08_SAFE_DB_DIAGNOSTIC",
  log.split("\\n").filter(line=>line.includes("PH08 dental chart request failed")).slice(-5).join("\\n"));
}
const old=ok(firstSave,[201],"permanent 11 initial observation").observation;
assert.equal(old.status,"validated");
assert.equal(old.toothCode,"11");
const replay=ok(await request(first+"/observations","POST",note,dentist.session),
 [200],"idempotent retry");
assert.equal(replay.observation.id,old.id);
assert.equal(replay.replayed,true);
ok(await request(first+"/observations","POST",{...note,condition:"sound"},dentist.session),
 [409],"idempotency key cannot change contents");
const tooth21=ok(await request(first+"/observations","POST",
 {...note,toothCode:"21",condition:"sound",surfaces:["I"],actionKey:key()},dentist.session),
 [201],"upper left 21 supported").observation;
assert.equal(tooth21.toothCode,"21");
const tooth51=ok(await request(first+"/observations","POST",
 {...note,dentition:"primary",toothCode:"51",condition:"restored",surfaces:["I"],actionKey:key()},
 dentist.session),[201],"primary incisor 51 supported").observation;
assert.equal(tooth51.toothCode,"51");
const newer=ok(await request(first+"/observations","POST",
 {...note,condition:"restored",notes:"Restoration observed at later examination",
 observationDate:today,actionKey:key()},dentist.session),
 [201],"new dated observation of tooth 11").observation;
assert.notEqual(old.id,newer.id);
const current=ok(await request(first+"/snapshot?dentition=permanent&mode=current",
 "GET",undefined,dentist.session),[200],"current date-aware chart");
assert.equal(current.teeth.find(x=>x.toothCode==="11").condition,"restored");
assert.equal(current.teeth.find(x=>x.toothCode==="21").condition,"sound");
assert.equal(current.teeth.length,2);
const historical=ok(await request(first+"/snapshot?dentition=permanent&mode=history&asOf="+earlier,
 "GET",undefined,dentist.session),[200],"historical chart projection");
assert.equal(historical.teeth.find(x=>x.toothCode==="11").condition,"caries_suspected");
const visit=ok(await request(first+"/snapshot?dentition=permanent&mode=visit&encounterId="+start.id,
 "GET",undefined,dentist.session),[200],"selected encounter chart");
assert.equal(visit.teeth.find(x=>x.toothCode==="11").condition,"restored");
ok(await request(first+"/snapshot?dentition=permanent&mode=visit&encounterId=wrong",
 "GET",undefined,dentist.session),[404],"arbitrary encounter cannot be selected");
const baby=ok(await request(first+"/snapshot?dentition=primary&mode=current",
 "GET",undefined,dentist.session),[200],"primary history independently present");
assert.equal(baby.teeth.length,1);
assert.equal(baby.teeth[0].toothCode,"51");
const entries=ok(await request(first+"/observations?toothCode=11","GET",undefined,dentist.session),
 [200],"tooth history page");
assert.equal(entries.observations.length,2);
assert.equal(entries.observations[0].condition,"restored");
assert.equal(entries.observations[1].condition,"caries_suspected");
assert.equal(entries.hasMore,false);
ok(await request(first+"/observations?toothCode=19","GET",undefined,dentist.session),
 [422],"reject invalid FDI even on read");
ok(await request(first+"/observations/"+old.id+"/validate","POST",{confirmation:"VALIDATE"},
 dentist.session),[409],"already validated observation cannot change");

const provider=ok(await request("/v1/team/context","GET",undefined,dentist.session),
 [200],"provider membership").clinics.find(x=>x.clinicId===clinic.id);
assert.ok(provider?.membershipId);
const booked=ok(await doBooking(clinic.id,reception,p2,service,
 {membershipId:provider.membershipId},chair,date,"09:00"),[201],"assistant assigned visit").appointment;
ok(await request(second+"/context","GET",undefined,assistant.session),[403],
 "assistant cannot chart unclaimed visit");
fixture(clinic.id,booked.id);
const active=ok(await request(base+"/appointments/"+booked.id,"GET",undefined,reception.session),
 [200],"arrival fixture").appointment;
ok(await request(base+"/appointments/"+booked.id+"/status","POST",
 {status:"arrived",revision:active.revision,idempotencyKey:key()},
 reception.session),[200],"check in for assistant case");
const assistantEncounter=ok(await request(clinical+p2.id+"/encounters","POST",
 {reason:"Assistant prepared chart for checked-in patient",appointmentId:booked.id},
 assistant.session),[201],"assistant creates eligible clinical draft");
const assistantContext=ok(await request(second+"/context","GET",undefined,assistant.session),
 [200],"assistant own draft chart access");
assert.equal(assistantContext.canValidate,false);
const pending=ok(await request(second+"/observations","POST",
 {...note,encounterId:assistantEncounter.id,toothCode:"11",
 condition:"sound",observationDate:today,actionKey:key()},assistant.session),
 [201],"assistant writes observation draft").observation;
assert.equal(pending.status,"draft");
const unpublished=ok(await request(second+"/snapshot?dentition=permanent","GET",
 undefined,dentist.session),[200],"draft invisible on validated chart");
assert.equal(unpublished.teeth.length,0);
const history=ok(await request(second+"/observations?toothCode=11","GET",undefined,dentist.session),
 [200],"assigned dentist can review assistant draft");
assert.ok(history.observations.some(x=>x.id===pending.id&&x.status==="draft"));
ok(await request(second+"/observations/"+pending.id+"/validate","POST",
 {confirmation:"VALIDATE"},assistant.session),[403],"assistant cannot validate chart");
ok(await request(second+"/observations/"+pending.id+"/validate","POST",
 {confirmation:"NO"},dentist.session),[422],"doctor confirmation required");
ok(await request(second+"/observations/"+pending.id+"/validate","POST",
 {confirmation:"VALIDATE"},dentist2.session),[403,404],
 "other clinician cannot validate draft");
const validated=ok(await request(second+"/observations/"+pending.id+"/validate","POST",
 {confirmation:"VALIDATE"},dentist.session),[200],"assigned dentist validates observation");
assert.equal(validated.observation.status,"validated");
ok(await request(second+"/observations/"+pending.id+"/validate","POST",
 {confirmation:"VALIDATE"},dentist.session),[409],"cannot validate twice");
const released=ok(await request(second+"/snapshot?dentition=permanent","GET",
 undefined,dentist.session),[200],"validated assistant observation appears");
assert.equal(released.teeth.find(x=>x.toothCode==="11").condition,"sound");
const direct=spawnSync("pnpm",["exec","tsx","tests/phase08-immutability.ts",old.id,pending.id],
 {cwd:process.cwd(),encoding:"utf8",env:process.env});
assert.equal(direct.status,0,"append-only DB protections failed: "+direct.stderr+" "+direct.stdout);
console.log("PH08_INTEGRATION_OK — FDI 11/21/51, dated chart/history/visit, assistant draft + dentist validation, ACL, idempotency, immutable DB.");
