import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("PH07 clinical routes are mounted only inside staff API",()=>{
 const server=load("apps/api/src/server.ts");
 assert.match(server,/express\.json\(\{limit:"3\.5mb"\}\), clinicalRouter\(\)/);
 assert.doesNotMatch(load("apps/patient-web/app/page.tsx"),/ClinicalPortal/);
});
test("PH07 signed base and version history are write-protected at DB layer",()=>{
 const sql=load("packages/db/migrations/0007_clinical_encounters.sql");
 assert.match(sql,/CREATE TRIGGER clinic_signed_encounter_guard/);
 assert.match(sql,/CREATE TRIGGER clinic_encounter_version_no_update BEFORE UPDATE OR DELETE/);
 assert.match(sql,/amendment_reason_required/);
 assert.match(sql,/clinic_encounters[\s\S]*clinic_encounter_versions/);
});
test("PH07 signed record requires assignment, and assistant cannot sign",()=>{
 const s=load("apps/api/src/clinical-router.ts");
 assert.match(s,/const canSign=/);
 assert.match(s,/ONLY_CLINICIAN_MAY_SIGN/);
 assert.match(s,/SIGN_CONFIRMATION_REQUIRED/);
 assert.match(s,/STALE_ENCOUNTER_REVISION/);
 assert.match(s,/SIGNED_NOTE_IMMUTABLE/);
 assert.match(s,/ASSISTANT_REQUIRES_APPOINTMENT/);
 assert.match(s,/APPOINTMENT_NOT_READY/);
});
test("PH07 private file checks reject invalid bytes, nonclinical reads and cache",()=>{
 const s=load("apps/api/src/clinical-router.ts");
 for (const pattern of [/FILE_SIGNATURE_MISMATCH/,/FILE_TYPE_UNSUPPORTED/,/FILE_TOO_LARGE/,
  /FILE_NOT_FOUND/,/CLINICAL_ROLE_REQUIRED/,/Cache-Control","private, no-store"/,
  /X-Content-Type-Options","nosniff"/,/Content-Disposition/])assert.match(s,pattern);
 assert.match(s,/await findFile\(req,ctx,String\(req.params.fileId\)\)/);
});
test("PH07 navigation and routes do not expose unfinished chart/treatment tabs",()=>{
 const s=load("packages/ui-web/src/phase07.tsx");
 for(const key of ["today","pending","cases","visitDetail","patientFiles","amend","upload"])assert.match(s,new RegExp(key));
 assert.doesNotMatch(s,/<a[^>]+\/chart/);
 assert.doesNotMatch(s,/<a[^>]+\/treatments/);
});
