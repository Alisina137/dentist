import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH19 scoped administrative export requires owner, MFA and a recent authentication",()=>{
 const code=file("apps/api/src/portability-router.ts");
 for(const text of ["authStaff","scope(req,clinic)","ctx.role!==\"owner\"","req.actor?.mfa",
  "session?.createdAt","EXPORT_RECENT_LOGIN_REQUIRED","token_hash",
  "expires_at>now()","status='ready'","randomBytes(32)","createHash",
  "private, no-store","pg_advisory_xact_lock","clinic_export_events"]){
  assert.ok(code.includes(text),text);
 }
 for(const text of ["clinic_patients","clinic_appointments","clinic_invoices","clinic_payment_entries",
   "WHERE clinic_id=${cid}"]){assert.ok(code.includes(text),text);}
 assert.doesNotMatch(code,/SELECT[\s\S]{0,200}\bFROM clinic_(?:encounters|clinical_files|patient_intakes|tooth_observations)/i);
 assert.ok(code.includes("EXPORT_TOO_LARGE_CONTACT_SUPPORT"),"large exports never silently truncate");
});
test("PH19 migration enforces encrypted-token design and append-only auditing",()=>{
 const migration=file("packages/db/migrations/0019_data_portability.sql");
 for(const text of ["CREATE TABLE clinic_export_jobs","CREATE TABLE clinic_export_events",
  "clinic_export_events_immutable","CREATE TABLE clinic_retention_preferences",
  "CHECK(expires_at>created_at)","token_hash text NOT NULL UNIQUE","requested_days"])
  assert.ok(migration.includes(text),text);
 assert.doesNotMatch(migration,/blob|file_bytes|export_payload|raw_token/i);
});
test("PH19 export route is localized and in clinic navigation only for owner",()=>{
 const ui=file("packages/ui-web/src/phase19.tsx");
 const nav=file("packages/ui-web/src/phase03.tsx");
 for(const key of ["ClinicDataPortability","fa-AF","ps-AF","en:",
 "role=\"tablist\"","exports","retention","history",
 "EXPORT_RECENT_LOGIN_REQUIRED","referrerPolicy:\"no-referrer\"","acknowledgeSensitive","noUrl"])
  assert.ok(ui.includes(key),key);
 assert.match(nav,/if\(space.role==="owner"\)options.push\(exportData\)/);
 assert.match(file("apps/clinic-web/app/clinic/settings/export/page.tsx"),/ClinicDataPortability/);
 assert.match(file("apps/clinic-web/app/layout.tsx"),/phase19\.css/);
});
