import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH09 treatment tables are versioned and immutable with clinician evidence",()=>{
 const sql=read("packages/db/migrations/0009_treatment_plans.sql");
 for(const part of ["clinic_treatment_plans","clinic_treatment_versions","clinic_treatment_stages",
  "clinic_treatment_consents","clinic_treatment_events","clinic_treatment_append_only",
  "clinic_treatment_stage_update_guard","linked_encounter_id","estimate_total_afn"])
  assert.ok(sql.includes(part),part);
 assert.match(sql,/CREATE TRIGGER clinic_treatment_versions_immutable/);
 assert.match(sql,/CREATE TRIGGER clinic_treatment_consents_immutable/);
 assert.match(sql,/CREATE TRIGGER clinic_treatment_events_immutable/);
});
test("PH09 server never infers performed care, consent or paid charges",()=>{
 const source=read("apps/api/src/treatment-router.ts");
 for(const code of ["TREATMENT_CLINICIAN_ONLY","TREATMENT_CASE_NOT_ASSIGNED","TREATMENT_CONSENT_REQUIRED",
  "STALE_TREATMENT_REVISION","PERFORMED_PROCEDURE_EVIDENCE_REQUIRED","SIGNED_ENCOUNTER_REQUIRED",
  "IN_PERSON_CONFIRMATION_REQUIRED","PRICE_ADJUSTMENT_REQUIRES_OWNER","DISCOUNT_EXCEEDS_POLICY"])
  assert.ok(source.includes(code),code);
 assert.match(source,/patient_released=false/);
 assert.match(source,/noStore\(res\);res.json\(\{planId:/);
 assert.match(source,/invoiceCreated:false,paymentPosted:false/);
});
test("PH09 route and patient subtab are integrated, nonclinical app excluded",()=>{
 const server=read("apps/api/src/server.ts");
 assert.match(server,/treatmentRouter/);
 const phase=read("packages/ui-web/src/phase09.tsx");
 for(const word of ["TreatmentPortal","PlanEditor","consentTitle","stageProof","phase09-detail-tabs",
  "IN_PERSON_RECORDED","timeline","estimate","Consent","withdraw"])
  assert.ok(phase.includes(word),word);
 const p5=read("packages/ui-web/src/phase05.tsx");
 const p7=read("packages/ui-web/src/phase07.tsx");
 const p8=read("packages/ui-web/src/phase08.tsx");
 for(const file of [p5,p7,p8])assert.match(file,/\/treatments\?clinic=/);
 assert.match(read("apps/clinic-web/app/clinic/patients/[patientId]/treatments/page.tsx"),/TreatmentPortal/);
 assert.match(read("apps/clinic-web/app/clinic/patients/[patientId]/treatments/[planId]/page.tsx"),/TreatmentPortal/);
 assert.doesNotMatch(read("apps/patient-web/app/page.tsx"),/TreatmentPortal/);
});
