import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Phase B dashboard uses actual platform data with validated Kabul dates",()=>{
 const data=read("apps/api/src/admin-dashboard-data.ts");
 for(const key of ["parseDashboardDays","timeZone:\"Asia/Kabul\"","7|30|90",
  "status='approved'","status='pending'","status='awaiting'","status='paid'",
  "status='active'","current_period_ends_at","clinic_appointments",
  "patient_review_versions","patient_review_reports","patient_review_appeals",
  "support_tickets","AS urgent","clinic_listing_heads","clinic_dentist_credential_cases",
  "platform_subscription_invoices","verified_at","outbox_events",
  "patient_booking_notifications","count(*)","GROUP BY 1","previousRegistered","previousReceiptsAfn",
  "receiptsAfn","trend","activity"])
  assert.ok(data.includes(key),"Missing actual source: "+key);
 assert.match(data,/return \{[\s\S]*privacy:"Admin-only metadata and aggregates/);
 assert.doesNotMatch(data,/SELECT\s+.*(?:\b(?:patient_id|diagnosis|clinical_note|support_message|requester_id|actor_id)\b)/i);
 assert.doesNotMatch(data,/Math\.random\(|mockData|placeholderCount|dummyData/i);
 assert.match(data,/value===undefined\?"30"/);
 assert.match(data,/INVALID_DASHBOARD_PERIOD/);
});
test("Phase B backend enforces verified platform admin MFA, not only a hidden button",()=>{
 const router=read("apps/api/src/insights-router.ts");
 const start=router.indexOf('router.get("/platform/dashboard"');
 const end=router.indexOf('router.get("/platform/overview"',start);
 assert.ok(start>0&&end>start,"new route must be before other routes, after opsIdentity");
 assert.match(router.slice(0,start),/router\.use\("\/platform",opsIdentity\)/);
 const path=router.slice(start,end);
 assert.match(path,/opsAdmin\(req\)/);
 assert.match(path,/parseDashboardDays\(req\.query\.days\)/);
 assert.match(path,/privateOps\(res\)/);
 assert.match(path,/platformDashboard\(days\)/);
});
test("Phase B dashboard has real loading, actions, trends, health and localized labels",()=>{
 const ui=read("packages/ui-web/src/admin-dashboard.tsx");
 const page=read("apps/admin-web/app/admin/page.tsx");
 const layout=read("apps/admin-web/app/layout.tsx");
 const pkg=read("packages/ui-web/package.json");
 assert.match(page,/AdminDashboardPortal/);
 assert.match(layout,/import "@dandanlink\/ui\/admin-dashboard\.css";/);
 assert.match(pkg,/"\.\/admin-dashboard":"\.\/src\/admin-dashboard\.tsx"/);
 for(const key of ["role=\"status\"","admin-page-loading","AbortController","cache:\"no-store\"",
  "credentials:\"include\"",'visibilityState==="visible"',"range","aria-pressed",
  "Kpi","TrendChart","actionRows","queueClinics","queueDentists",
  "queueListings","queueReviews","queuePayments","queueSupport","recentTitle",
  "securityTitle","failedNotifications","pilotReleaseEnabled","fa-AF","ps-AF",
  "chartTable","<details","<svg","aria-label","InlineAlert"])
  assert.ok(ui.includes(key),"Missing UX element "+key);
 assert.match(ui,/\/v1\/insights\/platform\/dashboard\?days=/);
 assert.match(ui,/new Intl\.NumberFormat\(lang/);
 assert.match(ui,/calendar==="solar_hijri"\?"persian":"gregory"/);
 assert.doesNotMatch(ui,/Math\.random\(|mockData|dummyData/i);
});
test("Phase B dashboard CSS is scoped and responsive without altering patient and clinic portals",()=>{
 const css=read("packages/ui-web/src/admin-dashboard.css");
 for(const key of [".shell-admin .adm-b-kpis",".shell-admin .adm-b-queue-list",
  ".shell-admin .adm-b-chart-area",".shell-admin .adm-b-activity-list",
  ".shell-admin .adm-b-health-list","@media(max-width:620px)",
  "@media(prefers-reduced-motion:reduce)"])
  assert.ok(css.includes(key),key);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/admin-dashboard\.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/admin-dashboard\.css/);
 assert.match(read("apps/admin-web/app/admin/layout.tsx"),/AdminPersistentShell/);
});
