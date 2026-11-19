import test from "node:test";
import assert from "node:assert/strict";
import {makeChecklist,validateChecklist,scenarios,platforms,workspaces} from
 "../scripts/phase29-device-mfa-check.mjs";

test("C29-01 all clinic/patient and Android/iOS manual MFA cases default NOT RUN",()=>{
 const doc=makeChecklist();
 assert.equal(doc.syntheticOnly,true);
 assert.equal(doc.cases.length,platforms.length*workspaces.length*scenarios.length);
 assert.equal(doc.cases.length,32);
 assert.equal(new Set(doc.cases.map(x=>x.id)).size,32);
 assert.deepEqual(validateChecklist(doc).stats,
  {PASS:0,FAIL:0,BLOCKED:0,NOT_RUN:32});
 assert.equal(validateChecklist(doc).complete,false);
});
test("C29-02 do not approve device MFA without ticket, timestamp and every case",()=>{
 const doc=makeChecklist();
 doc.cases[0].status="PASS";
 assert.throws(()=>validateChecklist(doc),/ticket/);
 doc.cases[0].evidenceId="C29DEVICE_000001";
 doc.cases[0].completedAt="2026-11-19T10:00:00.000Z";
 assert.equal(validateChecklist(doc).complete,false);
 assert.equal(validateChecklist(doc).remaining,31);
 doc.cases.forEach((c,i)=>{
  c.status="PASS";c.evidenceId="C29DEVICE_"+String(i).padStart(6,"0");
  c.completedAt="2026-11-19T10:00:00.000Z";
 });
 assert.equal(validateChecklist(doc).complete,true);
 doc.cases[8].status="BLOCKED";doc.cases[8].evidenceId="";
 doc.cases[8].completedAt="";
 assert.equal(validateChecklist(doc).complete,false);
});
test("C29-03 sensitive/debug fields and unknown cases fail closed",()=>{
 const doc=makeChecklist();
 doc.cases[0].totp="123456";
 assert.throws(()=>validateChecklist(doc),/invalid Phase29 device case/);
 delete doc.cases[0].totp;
 doc.cases[0].id=doc.cases[1].id;
 assert.throws(()=>validateChecklist(doc),/duplicate/);
 doc.cases[0].id="FAKE_CLINIC_OTP";
 assert.throws(()=>validateChecklist(doc),/Unknown/);
 const fresh=makeChecklist();
 fresh.secret="Do not save tokens";
 assert.throws(()=>validateChecklist(fresh),/Invalid Phase29 device manifest/);
});
test("C29-04 evidence is a sanitized ticket ID, not raw URI, cookie or screenshot",()=>{
 const doc=makeChecklist();
 doc.cases[0].status="PASS";
 doc.cases[0].completedAt="2026-11-19T10:00:00.000Z";
 for(const value of ["https://example.test/sensitive","123","cookie=value",
  "data:image/png;base64,SECRET","recovery code 123"]){
  doc.cases[0].evidenceId=value;
  assert.throws(()=>validateChecklist(doc),/ticket/);
 }
});
test("C29-05 PH19 production gate and CI synthetic harness remain separate",()=>{
 const {readFileSync}=await import("node:fs");
 const {fileURLToPath}=await import("node:url");
 const {resolve,dirname}=await import("node:path");
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const ci=readFileSync(resolve(root,".github/workflows/ci.yml"),"utf8");
 const journey=readFileSync(resolve(root,"tests/clinic-phase-29-synthetic-journey.mjs"),"utf8");
 const pilot=readFileSync(resolve(root,"apps/api/src/pilot-gate.ts"),"utf8");
 assert.match(ci,/node tests\/clinic-phase-29-synthetic-journey\.mjs/);
 assert.match(journey,/NODE_ENV/);
 assert.match(journey,/stranger\.session/);
 assert.match(journey,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(journey,/staff\/.*\/status/);
 assert.match(pilot,/protectHealthWrites/);
 assert.match(pilot,/PH19_PENETRATION_TEST_APPROVED/);
});
