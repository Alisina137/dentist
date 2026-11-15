import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Admin Phase E: search, monitoring and alert routes require MFA",()=>{
 const api=file("apps/api/src/admin-operations-router.ts");
 const server=file("apps/api/src/server.ts");
 const migration=file("packages/db/migrations/0020_admin_alert_snoozes.sql");
 for(const token of ['router.use(opsIdentity)','router.get("/search"','router.get("/overview"',
  'router.post("/alerts/:key/snooze"','router.delete("/alerts/:key/snooze"',
  'opsAdmin(req)','privateOps(res)','INVALID_QUERY','INVALID_ALERT_KEY','ORIGIN_DENIED',
  'query.trim()','limitPerType:5','LIMIT 5','sqlClient','created_at',
  'first_reply_overdue','NOT EXISTS(SELECT 1 FROM support_ticket_messages',
  'now()-interval \'24 hours\'','now()-interval \'48 hours\'',
  'outbox_events','patient_booking_notifications','support_tickets',
  'audit_events','clinic_listing_heads','platform_subscription_invoices',
  'platform_admin_alert_snoozes','getPilotReadiness','timeZone:"Asia/Kabul"'])
  assert.ok(api.includes(token),"Required Phase E safeguard/data source: "+token);
 assert.match(server,/app\.use\("\/v1\/admin\/operations", adminOperationsRouter\(\)\)/);
 assert.match(migration,/CREATE TABLE platform_admin_alert_snoozes/);
 assert.match(migration,/PRIMARY KEY\(user_id,alert_key\)/);
 assert.match(migration,/until_at>snoozed_at/);
 assert.match(api,/now\(\)\+interval '12 hours'/);
 assert.doesNotMatch(api,/SELECT\s+.*(?:clinical|patient_records|clinic_payment_entries|patient_id|diagnosis|note_body)/i);
 assert.doesNotMatch(api,/Math\.random|mockData|seedDemo|placeholderCount/i);
});
test("Admin Phase E: persistent shell search and bell do not replace admin navigation",()=>{
 const shell=file("apps/admin-web/app/admin/admin-shell.tsx");
 const ui=file("packages/ui-web/src/admin-operations-header.tsx");
 const page=file("packages/ui-web/src/admin-operations-page.tsx");
 const shared=file("packages/ui-web/src/admin-operations-shared.ts");
 const css=file("packages/ui-web/src/admin-phase-e.css");
 assert.match(shell,/<AdminHeaderTools\/>/);
 assert.match(shell,/role==="admin"&&<AdminHeaderTools\/>/);
 assert.match(shell,/PersistentAdminShellProvider/);
 assert.match(shell,/admin-route-content/);
 assert.match(shell,/key:"alerts",href:"\/admin\/alerts"/);
 assert.match(shell,/key:"monitoring",href:"\/admin\/monitoring"/);
 for(const token of ['event.metaKey||event.ctrlKey','getAdminOps','AbortController',
  'credentials:"include"','cache:"no-store"','aria-modal="true"','role="dialog"',
  'role="search"','aria-expanded','alertContainer','visibilitychange','90000',
  'adm-e-bell-popover','getClientRects().length>0'])
  assert.ok(ui.includes(token)||shared.includes(token),"Search accessibility: "+token);
 for(const token of ['AdminOperationsPage','changeSnooze','adminWord',
  'view==="alerts"','view==="monitoring"','activityTrend','recentActions',
  'pilotReleaseEnabled','snoozedUntil','aria-pressed','role="tablist"',
  'adm-e-alert-card','adm-e-chart','<details','data.metrics','timeZone:"Asia/Kabul"'])
  assert.ok(page.includes(token),"Monitoring UX: "+token);
 for(const lang of ['en:', '"fa-AF":', '"ps-AF":'])
  assert.ok(shared.includes(lang),"Translation missing "+lang);
 for(const token of ['.adm-e-overlay','.adm-e-bell-popover','.adm-e-page',
  '.adm-e-alert-card','.adm-e-chart','@media(max-width:720px)',
  '@media(prefers-reduced-motion:reduce)'])
  assert.ok(css.includes(token),"Phase E scoped style missing "+token);
 for(const path of ["apps/clinic-web/app/layout.tsx","apps/patient-web/app/layout.tsx"])
  assert.ok(!file(path).includes("admin-phase-e.css"),"No clinic or patient CSS changes");
 assert.match(file("apps/admin-web/app/layout.tsx"),/admin-phase-e\.css/);
 assert.match(file("apps/admin-web/app/admin/alerts/page.tsx"),/view="alerts"/);
 assert.match(file("apps/admin-web/app/admin/monitoring/page.tsx"),/view="monitoring"/);
});
