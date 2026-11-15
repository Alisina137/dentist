import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Phase E search is MFA-admin-only and returns only administrative display data",()=>{
 const api=read("apps/api/src/admin-center-router.ts");
 const server=read("apps/api/src/server.ts");
 const migration=read("packages/db/migrations/0020_admin_notification_reads.sql");
 for(const key of ["router.use(opsIdentity)","opsAdmin(req)","privateOps(res)",
  'router.get("/search"','router.get("/notices"','router.post("/notices/read"',
  'router.get("/monitoring"',"INVALID_SEARCH","INVALID_SEARCH_CATEGORY",
  "admin_notice_reads","clinics","clinic_dentist_credential_cases",
  "clinic_listing_heads","platform_subscription_invoices","support_tickets",
  "LIMIT 6","limitedTo:6","INVALID_NOTICE_KEY","NOTICE_NOT_FOUND",
  "outbox_events","patient_booking_notifications","audit_events"])
  assert.ok(api.includes(key),key);
 assert.match(server,/app\.use\("\/v1\/admin\/center", adminCenterRouter\(\)\)/);
 assert.match(migration,/PRIMARY KEY\(admin_id,notice_key\)/);
 assert.doesNotMatch(api,/clinic_patient|clinic_patients|clinic_invoices|clinical_encounters|clinic_payment_entries|patient_profiles|medical_record|diagnos/i);
 assert.doesNotMatch(api,/SELECT \* FROM support_ticket_messages/i);
 assert.doesNotMatch(api,/Math\.random|mockResults|mockData/i);
});
test("Phase E bell, keyboard search, localized command center and stable persistent sidebar",()=>{
 const shell=read("apps/admin-web/app/admin/admin-shell.tsx");
 const ui=read("apps/admin-web/app/admin/command-center.tsx");
 const css=read("apps/admin-web/app/admin/command-center.css");
 const page=read("apps/admin-web/app/admin/center/page.tsx");
 for(const key of ['AdminCommandCenter','setShowCommand(true)',
  'admin-notices-changed','unreadNotices','Ctrl K',
  'e.ctrlKey||e.metaKey','e.key.toLowerCase()==="k"',
  'admin-persistent-sidebar','admin-route-content','PersistentAdminShellProvider'])
  assert.ok(shell.includes(key),key);
 for(const key of ['Ctrl + K','onClose','onKey','Escape','Tab','role={compact?"dialog"',
  'AbortController','setTimeout','"/search?"','"/notices"','"/monitoring"',
  'readNotice(item.key)','admin-notices-changed','cache:"no-store"',
  '"fa-AF"','"ps-AF"','timeZone:"Asia/Kabul"','role="tablist"',
  'aria-selected','<table','scope'])
  assert.ok(ui.includes(key),key);
 assert.match(page,/AdminCommandCenter/);
 assert.match(read("apps/admin-web/app/admin/layout.tsx"),/import "\.\/command-center\.css"/);
 assert.ok(css.includes(".shell-admin .adm-e-overlay"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/command-center\.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/command-center\.css/);
});
test("Phase E limits operational monitoring to observed database and queues, not claims of production readiness",()=>{
 const api=read("apps/api/src/admin-center-router.ts");
 const ui=read("apps/admin-web/app/admin/command-center.tsx");
 for(const key of ["outboxDelayed","failedNotices","overduePayments",
  "triageOverdue","firstReplyOverdue","auditFailures","timezone:\"Asia/Kabul\"",
  "launchReadiness","scope","read:seen.has(key)"])
  assert.ok(api.includes(key),key);
 assert.ok(ui.includes("monitor.scope"));
 assert.ok(ui.includes("monitor.launchReadiness"));
});
