import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRequire} from "node:module";
import ts from "typescript";
import {
 structuralAudit,manualEvidenceStatus,buildReview,run,
 workspaceContracts,independentControls
} from "../scripts/phase34-release-candidate.mjs";
import {makeChecklist as make29} from "../scripts/phase29-device-mfa-check.mjs";
import {makeChecklist as make32} from "../scripts/phase32-device-accessibility-check.mjs";
const require=createRequire(import.meta.url);
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
function loadTs(p){
 const source=ts.transpileModule(read(p),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const m={exports:{}};
 new Function("module","exports","require",source)(m,m.exports,require);
 return m.exports;
}
const {BoundedShutdown}=loadTs("apps/api/src/phase33-shutdown.ts");
const now=new Date("2026-11-19T12:00:00.000Z");

test("C34-01 all four workspaces, integration coverage and PH19 gate have structural presence",()=>{
 const result=structuralAudit();
 assert.equal(result.pass,true,JSON.stringify(result.issues));
 assert.equal(result.issues.length,0);
 assert.ok(result.checks>=65,"final engineering coverage should span whole app");
 for(const key of ["admin","clinic","patient","mobile","infra"]){
  assert.ok(workspaceContracts[key].length>=6,"incomplete "+key+" contract");
 }
 assert.equal(independentControls.length,9);
 assert.equal(new Set(independentControls).size,9);
 assert.equal(run(["--ci"],undefined,{
  info:()=>{},error:x=>{throw Error(x)}
 }),0);
});

test("C34-02 missing paths/missing workflow and absent independent signoff never pass",()=>{
 const folder=mkdtempSync(join(tmpdir(),"phase34-corrupt-"));
 try{
  const result=structuralAudit(folder);
  assert.equal(result.pass,false);
  assert.ok(result.issues.some(x=>x.startsWith("MISSING_")));
  assert.ok(result.issues.includes("CI_PIPELINE_INCOMPLETE"));
  assert.ok(result.issues.includes("CONTROL_CONTRACT_MISSING"));
 }finally{rmSync(folder,{recursive:true,force:true})}
});

test("C34-03 operator device evidence defaults NOT_RUN and never invents Android/iOS passes",()=>{
 const folder=mkdtempSync(join(tmpdir(),"phase34-devices-"));
 try{
  const initial=manualEvidenceStatus(folder);
  assert.deepEqual(initial.physicalMfa,{
   status:"NOT_RUN",total:32,passed:0,remaining:32
  });
  assert.deepEqual(initial.physicalAccessibility,{
   status:"NOT_RUN",total:96,passed:0,remaining:96
  });
  mkdirSync(join(folder,".patient-acceptance"),{recursive:true});
  const mfa=make29(),physical=make32();
  mfa.cases[0].status="PASS";
  mfa.cases[0].evidenceId="PH34_REVIEW_001";
  mfa.cases[0].completedAt="2026-11-19T09:00:00.000Z";
  physical.cases[0].status="PASS";
  physical.cases[0].ticket="PH34_PHONE_001";
  physical.cases[0].observedAt="2026-11-19T09:00:00.000Z";
  writeFileSync(join(folder,".patient-acceptance","phase29-device-mfa.json"),
   JSON.stringify(mfa));
  writeFileSync(join(folder,".patient-acceptance","phase32-device-accessibility.json"),
   JSON.stringify(physical));
  const partial=manualEvidenceStatus(folder);
  assert.equal(partial.physicalMfa.status,"INCOMPLETE");
  assert.equal(partial.physicalMfa.passed,1);
  assert.equal(partial.physicalAccessibility.remaining,95);
  const output=JSON.stringify(partial);
  assert.doesNotMatch(output,/PH34_REVIEW_001|PH34_PHONE_001/);
  mfa.cases[0].evidenceId="Bearer ABC123";
  writeFileSync(join(folder,".patient-acceptance","phase29-device-mfa.json"),
   JSON.stringify(mfa));
  assert.equal(manualEvidenceStatus(folder).physicalMfa.status,"INVALID_EVIDENCE");
 }finally{rmSync(folder,{recursive:true,force:true})}
});

test("C34-04 fake operator env flags or all-PASS manifest cannot grant clinical release",()=>{
 const env={
  GITHUB_SHA:"0123456789abcdef0123456789abcdef01234567",
  PH19_PILOT_RELEASE_ENABLED:"true",
  ...Object.fromEntries(independentControls.map(x=>["PH19_"+x+"_APPROVED","true"]))
 };
 const result=buildReview(undefined,env,now);
 assert.equal(result.commitSha,env.GITHUB_SHA);
 assert.equal(result.clinicalProductionDecision,"NO_GO_PENDING_INDEPENDENT_REVIEW");
 assert.equal(result.authorizesProtectedHealthWrites,false);
 assert.equal(result.independentSignoffs.verifiedByThisTool,0);
 assert.equal(result.independentSignoffs.status,"NOT_VERIFIED_BY_AUTOMATION");
 assert.ok(result.engineering.pass);
 assert.equal(buildReview(undefined,{GITHUB_SHA:"user-pasted-sha"},now).commitSha,null);
 const raw=JSON.stringify(result);
 assert.doesNotMatch(raw,/password|Bearer\s+[A-Za-z]|patientEmail|phoneNumber|screenshot:/i);
});

test("C34-05 snapshot is private, redacted and refuses to overwrite reviewer evidence",()=>{
 const folder=mkdtempSync(join(tmpdir(),"phase34-snapshot-"));
 const logs=[];
 const out={info:x=>logs.push(x),error:x=>logs.push(x)};
 try{
  assert.equal(run(["--snapshot"],folder,out),2,
   "incomplete copy of source must not be structurally accepted");
  const file=join(folder,".patient-acceptance","phase34-release-candidate-review.json");
  assert.equal(existsSync(file),true);
  const data=JSON.parse(readFileSync(file,"utf8"));
  assert.equal(data.authorizesProtectedHealthWrites,false);
  assert.equal(data.clinicalProductionDecision,"NO_GO_PENDING_INDEPENDENT_REVIEW");
  assert.equal(data.independentSignoffs.verifiedByThisTool,0);
  assert.equal(run(["--snapshot"],folder,out),2);
  assert.ok(logs.includes("PH34_EXISTING_REVIEW_NOT_OVERWRITTEN"));
 }finally{rmSync(folder,{recursive:true,force:true})}
});

test("C34-06 a failed worker drain must NOT close Postgres before HTTP work settles",async()=>{
 let finishHttp;
 const http=new Promise(resolve=>{finishHttp=resolve;});
 const order=[];
 const driver=new BoundedShutdown({
  stopNewWork:()=>order.push("stop-new"),
  stopWorker:async()=>{order.push("mail-failed");throw Error("outbox failure")},
  closeHttp:async()=>{order.push("http-start");await http;order.push("http-complete")},
  forceHttp:()=>order.push("force-close"),
  closeDb:async()=>{order.push("db-closed")}
 },1000,30);
 const running=driver.run();
 assert.strictEqual(driver.run(),running,"duplicate signals must share one drain");
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(order.includes("http-start"));
 assert.ok(!order.includes("db-closed"),
  "P0: failing worker must not close DB while HTTP booking is pending");
 finishHttp();
 assert.equal(await running,"failed");
 assert.ok(order.indexOf("http-complete")<order.indexOf("db-closed"));
 assert.ok(order.includes("force-close"));
});

test("C34-07 scheduler failure does not abandon HTTP cleanup; timeout still fail-closed",async()=>{
 const order=[];
 const running=new BoundedShutdown({
  stopNewWork:()=>{order.push("scheduler-failed");throw Error("scheduler")},
  stopWorker:()=>order.push("worker-drained"),
  closeHttp:()=>order.push("http-closed"),
  forceHttp:()=>order.push("forced"),
  closeDb:()=>order.push("database-closed")
 },200,30);
 assert.equal(await running.run(),"failed");
 assert.deepEqual(order,["scheduler-failed","worker-drained","http-closed","database-closed"]);
 const stuck=new BoundedShutdown({
  stopNewWork:()=>{},
  stopWorker:()=>new Promise(()=>{}),
  closeHttp:()=>Promise.resolve(),
  forceHttp:()=>{order.push("timeout-forced")},
  closeDb:()=>Promise.resolve()
 },15,25);
 assert.equal(await stuck.run(),"timeout");
 assert.ok(order.includes("timeout-forced"));
});

test("C34-08 real app sign-out and account switching require OS token deletion",()=>{
 const patient=read("apps/mobile/native-auth.tsx");
 const clinic=read("apps/mobile/native-clinic.tsx");
 assert.match(patient,/const clear=useCallback\(async\(requireDeviceWipe=false\)/);
 assert.match(patient,/if\(requireDeviceWipe\)throw new ApiError\(0,"SECURE_STORAGE_UNAVAILABLE"\)/);
 assert.match(patient,/const signIn=useCallback\([\s\S]*?await clear\(true\)/);
 assert.match(patient,/const signOut=useCallback\([\s\S]*?await clear\(true\)/);
 assert.match(patient,/const switchWorkspace=useCallback\([\s\S]*?await clear\(true\)/);
 assert.match(clinic,/const clearSession=useCallback\(async\(\):Promise<boolean>/);
 assert.match(clinic,/await SecureStore.deleteItemAsync\(TOKEN_KEY\)/);
 assert.match(clinic,/if\(!await clearSession\(\)\)throw new ApiError/);
 assert.match(clinic,/const deleted=await clearSession\(\);\s*if\(!deleted\)/);
 assert.match(clinic,/if\(!deleted\)\{setError\(t.network\);return;\}/);
 assert.match(clinic,/onChangeWorkspace\(\);/);
 assert.match(clinic,/setToken\(null\);setContext\(null\);setSelected\(null\);setRecords\(\[\]\)/);
});

test("C34-09 final QA script preserves PH19 gate and cannot forge physical/mobile/alert evidence",()=>{
 const pipeline=read(".github/workflows/ci.yml");
 const gate=read("apps/api/src/pilot-gate.ts");
 const script=read("scripts/phase34-release-candidate.mjs");
 const doc=read("docs/CLINIC-PHASE-34-FINAL-AUDIT-ACCEPTANCE.md");
 assert.match(pipeline,/phase34-release-candidate\.mjs --ci/);
 assert.match(gate,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(gate,/PILOT_RELEASE_BLOCKED/);
 assert.match(script,/NO_GO_PENDING_INDEPENDENT_REVIEW/);
 assert.match(script,/NOT_VERIFIED_BY_AUTOMATION/);
 assert.match(doc,/P0 privacy\/security/);
 assert.match(doc,/P0 resilience/);
 assert.doesNotMatch(script,/process\.env\.PH19_PILOT_RELEASE_ENABLED\s*===\s*"true"/);
});
