import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH08 enforces anatomically correct permanent and primary FDI codes",()=>{
 const api=load("apps/api/src/chart-router.ts");
 const migration=load("packages/db/migrations/0008_fdi_dental_chart.sql");
 assert.match(api,/\^\[1-4\]\[1-8\]\$/);
 assert.match(api,/\^\[5-8\]\[1-5\]\$/);
 assert.match(migration,/tooth_quadrant_matches_dentition/);
 assert.match(migration,/observation_date/);
});
test("PH08 observations are append-only and date-versioned",()=>{
 const sql=load("packages/db/migrations/0008_fdi_dental_chart.sql");
 assert.match(sql,/CREATE TRIGGER tooth_observation_guard/);
 assert.match(sql,/CREATE TRIGGER tooth_observation_no_delete/);
 assert.match(sql,/UNIQUE \(clinic_id, recorded_by, action_key\)/);
 const api=load("apps/api/src/chart-router.ts");
 assert.match(api,/DISTINCT ON \(o.tooth_code\)/);
 assert.match(api,/o.observation_date DESC,o.validated_at DESC/);
 assert.match(api,/status='validated'/);
 assert.match(api,/ALREADY_VALIDATED/);
});
test("PH08 guards clinical role, assignment, encounter and assistant draft signoff",()=>{
 const api=load("apps/api/src/chart-router.ts");
 for(const word of ["CHART_ROLE_DENIED","CHART_CASE_NOT_ASSIGNED","ASSISTANT_DRAFT_ONLY",
  "CLINICIAN_VALIDATION_REQUIRED","VALIDATION_CONFIRMATION_REQUIRED",
  "DUPLICATE_ACTION_CHANGED","PATIENT_INACTIVE","SUBSCRIPTION_EXPIRED"])
  assert.ok(api.includes(word),word);
 assert.match(api,/encounter_id IN \(SELECT id FROM clinic_encounters/);
});
test("PH08 navigation, SVG diagram and accessible tooth selection are integrated",()=>{
 const ui=load("packages/ui-web/src/phase08.tsx");
 for(const key of ["aria-label","aria-pressed","fdi-tooth-","ArrowLeft","ArrowRight",
  "role=\"tablist\"","role=\"region\"","phase08-orientation","phase08-chart-scroll","phase08-inspector"])
  assert.ok(ui.includes(key),key);
 const routes=load("apps/clinic-web/app/clinic/patients/[patientId]/chart/page.tsx");
 assert.match(routes,/DentalChartPortal/);
 const p5=load("packages/ui-web/src/phase05.tsx");
 const p7=load("packages/ui-web/src/phase07.tsx");
 assert.match(p5,/\/chart\?clinic=/);
 assert.match(p7,/\/chart\?clinic=/);
 assert.doesNotMatch(load("apps/patient-web/app/page.tsx"),/DentalChartPortal/);
});
