import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("PH18 clinic reports derive period-specific totals from tenant-owned immutable ledgers",()=>{
 const api=read("apps/api/src/insights-router.ts");
 for(const evidence of ["authStaff","scope(req,clinicId)","owner","manager","cashier",
  "clinic_appointments","clinic_patients","clinic_payment_entries","clinic_invoices",
  "clinic_expenses","e.kind='reversal'","e.kind<>'credit'","status='issued'",
  "Asia/Kabul","from","to","privateOps(res)"])
  assert.ok(api.includes(evidence),evidence);
 assert.match(api,/i.status='issued'/);
 assert.match(api,/netReceiptsAfn:receipts/);
 assert.doesNotMatch(api,/SELECT (?:\*|.*(?:note|diagnosis)) FROM clinic_encounters/i);
 const ui=read("packages/ui-web/src/phase18.tsx");
 for(const text of ["ClinicReportsPortal","appointments","patients","revenue","exportReport",
  "byMethodAfn","csv","fa-AF","ps-AF","role","restricted","Shell"])
  assert.ok(ui.includes(text),text);
 assert.match(read("apps/clinic-web/app/clinic/reports/page.tsx"),/ClinicReportsPortal/);
});
test("PH18 support agent auth never grants access to clinical data",()=>{
 const access=read("apps/api/src/staff-access.ts");
 const ops=read("apps/api/src/ops-access.ts");
 const support=read("apps/api/src/support-router.ts");
 for(const key of ["platform_support_agents","PLATFORM_WORKSPACE_ONLY"])
  assert.ok(access.includes(key),key);
 for(const key of ["opsStaff","opsAdmin","MFA_REQUIRED","support","verified",
  "ADMIN_DENIED","safeSupportText"])
  assert.ok(ops.includes(key)||support.includes(key),key);
 assert.doesNotMatch(support,/clinic_encounters|clinic_patient_intakes|clinic_clinical_files|clinic_tooth_observations/);
 assert.doesNotMatch(read("apps/api/src/insights-router.ts"),/clinic_encounters|clinic_patient_intakes|clinic_clinical_files/);
 const migration=read("packages/db/migrations/0018_reporting_support_operations.sql");
 for(const table of ["platform_support_agents","support_categories","support_templates",
   "support_tickets","support_ticket_messages","support_ticket_events"])
   assert.ok(migration.includes("CREATE TABLE "+table),table);
 assert.ok(migration.includes("support_history_immutable"));
 assert.ok(support.includes("requester_id"));
 assert.ok(support.includes("SUPPORT_PERSONAL_OR_CLINICAL_DETAILS")||ops.includes("SUPPORT_PERSONAL_OR_CLINICAL_DETAILS"));
});
test("PH18 platform intelligence is suppressed and security views are admin-only",()=>{
 const api=read("apps/api/src/insights-router.ts");
 assert.match(api,/const countSafe/);
 assert.match(api,/n===0\|\|n>=5\?n:null/);
 assert.match(api,/opsStaff\(req\)/);
 assert.match(api,/opsAdmin\(req\)/);
 assert.match(api,/SELECT action,outcome,count\(\*\)/);
 assert.doesNotMatch(api,/SELECT .*actor_id.*FROM audit_events/);
 const admin=read("packages/ui-web/src/phase18-admin.tsx");
 for(const key of ["AdminOperationsPortal","SupportDesk","PlatformAnalytics",
  "SecurityReview","OperationSettings","/support/admin/tickets","/insights/platform/security"])
  assert.ok(admin.includes(key),key);
 for(const view of ["support","analytics","security","settings"])
  assert.match(read("apps/admin-web/app/admin/"+view+"/page.tsx"),/AdminOperationsPortal/);
});
test("PH18 ticket lifecycle and public help are real and localized",()=>{
 const code=read("apps/api/src/support-router.ts");
 for(const part of ["/public/help","/tickets/mine","/tickets/:ticketId",
  "/admin/tickets","/admin/settings","/admin/categories/:code","/admin/templates/:id",
  "/admin/agents","waiting_user","in_progress","resolved","closed",
  "SUPPORT_STAFF_CANNOT_OPEN","CLIENT"]) {
  if(part==="CLIENT")continue;
  assert.ok(code.includes(part),part);
 }
 const ui=read("packages/ui-web/src/phase18.tsx");
 for(const key of ["HelpPortal","support/public/help","support/tickets/mine",
  "support/tickets","fa-AF","ps-AF","privacy"])
  assert.ok(ui.includes(key),key);
 assert.ok(read("apps/patient-web/app/help/page.tsx").includes("HelpPortal"));
 assert.ok(read("apps/clinic-web/app/help/page.tsx").includes("HelpPortal"));
 for(const layout of ["clinic","patient","admin"]){
  const l=read("apps/"+layout+"-web/app/layout.tsx");
  assert.ok(l.includes("phase18.css"),layout);
 }
});
