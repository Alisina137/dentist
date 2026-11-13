import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {API,request,ok,key,admin,owner,dentist,dentist2,reception,assistant,
 clinic,unrelated,service,p1,p2} from "./phase07-fixture.mjs";

const prefix="/v1/treatments/clinics/"+clinic.id,patient=prefix+"/patients/"+p1.id,
 otherPatient=prefix+"/patients/"+p2.id;
const clinical="/v1/clinical/clinics/"+clinic.id+"/patients/"+p1.id;
const treatment=patient+"/plans";
function item(){return {serviceId:service.id,quantity:1,discountAfn:0};}
const input={
 title:"Three-stage root canal care",indication:"Persistent tooth pain after clinician examination",
 expectedSessions:3,durationMinutes:150,notes:"Clinician-defined scope, not a scheduled treatment.",
 items:[item()],stages:[
  {description:"Root canal preparation",toothCodes:["11"],expectedVisits:1,dueDate:null},
  {description:"Root canal cleaning",toothCodes:["11"],expectedVisits:1,dueDate:null},
  {description:"Root canal restoration",toothCodes:["11"],expectedVisits:1,dueDate:null}
 ]
};
async function encounterWithProcedure(description,teeth=["11"],signed=true){
 const c=ok(await request(clinical+"/encounters","POST",{reason:"Treatment evidence encounter"},dentist.session),
  [201],"clinician creates evidence visit");
 const path=clinical+"/encounters/"+c.id;
 ok(await request(path,"PATCH",{revision:1,
  reason:"Planned care with observed clinical findings",findings:"Clinical procedure performed",
  assessment:"Procedure was clinically indicated",historySource:"Patient",historyDate:null,
  followUp:"Follow-up in next encounter",performedProcedures:[{
   description,toothIds:teeth,serviceId:null
  }]},dentist.session),[200],"signed procedure documentation");
 if(signed)ok(await request(path+"/sign","POST",{revision:2,confirmation:"SIGN"},dentist.session),
  [200],"clinician signs performed procedure");
 return c.id;
}
ok(await request(treatment,"GET",undefined,reception.session),[403],"reception excluded from clinical plan");
ok(await request(treatment,"GET",undefined,assistant.session),[403],"assistant excluded from clinical plan");
ok(await request(treatment,"GET",undefined,admin.session),[403],"platform admin excluded from clinic data");
ok(await request(treatment,"GET",undefined,dentist.session),[403],"unassigned clinician cannot browse");
const originalVisit=await encounterWithProcedure("General dental exam",[],true);
const catalog=ok(await request(patient+"/catalog","GET",undefined,dentist.session),
 [200],"get clinician's current priced service catalog");
assert.ok(catalog.services.some(x=>x.id===service.id));
ok(await request(treatment,"POST",{...input,items:[{serviceId:service.id,quantity:1,discountAfn:300}]},dentist.session),
 [403],"dentist cannot override quote with discount");
ok(await request(treatment,"POST",{...input,stages:[{...input.stages[0],toothCodes:["19"]}]},dentist.session),
 [422],"invalid FDI code rejected");
const made=ok(await request(treatment,"POST",input,dentist.session),[201],"create treatment draft");
assert.equal(made.status,"draft");
const plan=treatment+"/"+made.id;
let loaded=ok(await request(plan,"GET",undefined,dentist.session),[200],"load treatment plan");
assert.equal(loaded.plan.version,1);
assert.equal(loaded.plan.status,"draft");
assert.equal(loaded.items[0].serviceVersion,service.version);
assert.equal(loaded.items[0].unitPriceAfn,service.basePriceAfn);
assert.equal(loaded.plan.estimateTotalAfn,service.basePriceAfn);
assert.equal(loaded.stages.length,3);
const estimate=ok(await request(prefix+"/plans/"+made.id+"/estimate","GET",undefined,owner.session),
 [200],"owner sees pricing projection without clinical indication");
assert.equal(estimate.totalAfn,service.basePriceAfn);
assert.equal(estimate.invoiceCreated,false);
assert.equal(estimate.paymentPosted,false);
assert.ok(!("indication" in estimate));
assert.ok(!("patientId" in estimate));
ok(await request(prefix+"/plans/"+made.id+"/estimate","GET",undefined,reception.session),
 [403],"reception cannot view quote");
ok(await request(prefix+"/plans/"+made.id+"/estimate","GET",undefined,dentist2.session),
 [404],"other clinician cannot view quote");
ok(await request(plan,"GET",undefined,dentist2.session),[404],"other clinician cannot view plan");
ok(await request("/v1/treatments/clinics/"+unrelated.id+"/patients/"+p1.id+"/plans",
 "GET",undefined,dentist.session),[404],"cross-tenant clinic scope");
ok(await request(plan+"/propose","POST",{revision:55},dentist.session),
 [409],"optimistic revision prevents stale proposal");
const proposed=ok(await request(plan+"/propose","POST",{revision:1},dentist.session),
 [200],"propose treatment");
assert.equal(proposed.status,"proposed");
ok(await request(plan+"/stages/"+loaded.stages[0].id+"/action","POST",{revision:2,action:"start"},
 dentist.session),[409],"no stage progression without recorded consent");
ok(await request(plan+"/consent","POST",{revision:2,confirmation:"IN_PERSON_RECORDED",
 patientRole:"patient",personName:"Test Patient",witnessName:"Witness Clinician",
 scopeDescription:"Three stages of care described and consented",
 acknowledgedAt:new Date().toISOString()},assistant.session),[403],"assistant cannot record consent");
ok(await request(plan+"/consent","POST",{revision:2,confirmation:"NO",
 patientRole:"patient",personName:"Test Patient",witnessName:"Witness Clinician",
 scopeDescription:"Three stages of care described and consented",
 acknowledgedAt:new Date().toISOString()},dentist.session),[422],"explicit in-person attestation required");
const consent=ok(await request(plan+"/consent","POST",{revision:2,
 confirmation:"IN_PERSON_RECORDED",patientRole:"patient",personName:"Test Patient",
 witnessName:"Witness Clinician",scopeDescription:"Consent was witnessed for all three stages",
 acknowledgedAt:new Date().toISOString()},dentist.session),[200],"witnessed consent");
assert.equal(consent.status,"accepted");
assert.equal(consent.revision,3);
const stage1=loaded.stages[0].id;
ok(await request(plan+"/stages/"+stage1+"/action","POST",{revision:3,action:"complete",
 encounterId:originalVisit},dentist.session),[409],"stage must start first");
const started=ok(await request(plan+"/stages/"+stage1+"/action","POST",
 {revision:3,action:"start"},dentist.session),[200],"start first stage");
assert.equal(started.status,"in_progress");
ok(await request(plan+"/stages/"+stage1+"/action","POST",{revision:4,action:"complete",
 encounterId:originalVisit},dentist.session),[409],"cannot infer performed care from unrelated signed procedure");
const unsigned=await encounterWithProcedure(input.stages[0].description,["11"],false);
ok(await request(plan+"/stages/"+stage1+"/action","POST",{revision:4,action:"complete",
 encounterId:unsigned},dentist.session),[409],"cannot complete with unsigned clinical evidence");
const signed1=await encounterWithProcedure(input.stages[0].description);
const completed1=ok(await request(plan+"/stages/"+stage1+"/action","POST",
 {revision:4,action:"complete",encounterId:signed1},dentist.session),
 [200],"first completed with explicit evidence");
assert.equal(completed1.revision,5);
for(let i=1;i<3;i++){
 const current=ok(await request(plan,"GET",undefined,dentist.session),[200],"current plan");
 const s=current.stages[i];
 ok(await request(plan+"/stages/"+s.id+"/action","POST",
  {revision:current.plan.revision,action:"start"},dentist.session),[200],"start next stage");
 const signed=await encounterWithProcedure(input.stages[i].description);
 ok(await request(plan+"/stages/"+s.id+"/action","POST",
  {revision:current.plan.revision+1,action:"complete",encounterId:signed},dentist.session),
  [200],"complete recorded stage");
}
loaded=ok(await request(plan,"GET",undefined,dentist.session),[200],"final completed treatment");
assert.equal(loaded.plan.status,"completed");
assert.equal(loaded.stages.filter(x=>x.status==="completed").length,3);
assert.equal(loaded.consents.filter(x=>x.action==="recorded").length,1);
assert.ok(loaded.events.some(x=>x.action==="completed"));
assert.equal(loaded.autoInvoicing,false);
ok(await request(plan+"/discontinue","POST",
 {revision:loaded.plan.revision,reason:"Cannot discontinue completed plan"},dentist.session),
 [409],"completed plan remains final");
ok(await request(plan+"/revise","PUT",{...input,revision:loaded.plan.revision,
 reason:"Completed treatment change requires separate plan"},dentist.session),
 [409],"completed plan cannot be rewritten");

const second=ok(await request(treatment,"POST",{...input,title:"Revision and reconsent scenario"},dentist.session),
 [201],"create second plan");
const plan2=treatment+"/"+second.id;
ok(await request(plan2+"/propose","POST",{revision:1},dentist.session),[200],"propose second plan");
ok(await request(plan2+"/consent","POST",{revision:2,confirmation:"IN_PERSON_RECORDED",
 patientRole:"guardian",personName:"Guardian Person",relationship:"Parent",
 witnessName:"Witness Clinician",scopeDescription:"Guardian accepted this version after discussion",
 acknowledgedAt:new Date().toISOString()},dentist.session),[200],"guardian consent");
const revised=ok(await request(plan2+"/revise","PUT",{...input,
 title:"Revised multi-stage root canal proposal",revision:3,
 reason:"New assessment requires a revised clinician proposal"},dentist.session),
 [200],"material revision creates new version");
assert.equal(revised.version,2);
let newPlan=ok(await request(plan2,"GET",undefined,dentist.session),[200],"revised plan detail");
assert.equal(newPlan.plan.status,"proposed");
assert.equal(newPlan.plan.consentState,"none");
assert.equal(newPlan.versions.length,2);
assert.equal(newPlan.consents[0].version,1);
ok(await request(plan2+"/stages/"+newPlan.stages[0].id+"/action","POST",
 {revision:4,action:"start"},dentist.session),[409],"revised plan requires fresh consent");
ok(await request(plan2+"/consent","POST",{revision:4,confirmation:"IN_PERSON_RECORDED",
 patientRole:"patient",personName:"Patient Person",witnessName:"Witness Clinician",
 scopeDescription:"Patient accepted revised second version after explanation",
 acknowledgedAt:new Date().toISOString()},dentist.session),[200],"second version consent");
const withdrawn=ok(await request(plan2+"/withdraw-consent","POST",{revision:5,
 reason:"Patient changed the agreed treatment arrangement"},dentist.session),
 [200],"withdrawal suspends treatment");
assert.equal(withdrawn.status,"proposed");
newPlan=ok(await request(plan2,"GET",undefined,dentist.session),[200],"withdrawn treatment history");
assert.ok(newPlan.consents.some(x=>x.action==="withdrawn"));
ok(await request(plan2+"/stages/"+newPlan.stages[0].id+"/action","POST",
 {revision:6,action:"start"},dentist.session),[409],"withdrawn consent blocks treatment");
ok(await request(plan2+"/consent","POST",{revision:6,confirmation:"IN_PERSON_RECORDED",
 patientRole:"patient",personName:"Patient Person",witnessName:"Witness Clinician",
 scopeDescription:"Repeat old version consent is intentionally forbidden",
 acknowledgedAt:new Date().toISOString()},dentist.session),
 [409],"re-consent requires new version after withdrawal");
const ceased=ok(await request(plan2+"/discontinue","POST",{revision:6,
 reason:"Patient declined further proposed treatment"},dentist.session),
 [200],"discontinue with preserved clinical evidence");
assert.equal(ceased.status,"discontinued");
const history=ok(await request(plan2,"GET",undefined,dentist.session),[200],"discontinued history retained");
assert.equal(history.versions.length,2);
assert.ok(history.consents.length>=3);
assert.ok(history.events.some(x=>x.action==="discontinued"));
const brief=ok(await request(patient+"/status-summary","GET",undefined,reception.session),
 [200],"front desk sees status only");
assert.ok(brief.summary.some(x=>x.status==="completed"));
assert.ok(!("indication" in brief.summary[0]));
const testIds=loaded.stages.map(x=>x.id);
const check=spawnSync("pnpm",["exec","tsx","tests/phase09-immutability.ts",second.id,stage1],
 {cwd:process.cwd(),encoding:"utf8",env:process.env});
assert.equal(check.status,0,"immutable treatment history DB guard failed: "+check.stderr+" "+check.stdout);
console.log("PH09_INTEGRATION_OK — 3-stage signed care, consent, price snapshots, versioned reconsent, privacy, finalization and immutable DB.");
