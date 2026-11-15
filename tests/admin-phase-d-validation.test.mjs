import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Phase D finance is MFA-only, uses real database totals and never includes patient ledger",()=>{
 const finance=read("apps/api/src/admin-finance-router.ts");
 const server=read("apps/api/src/server.ts");
 for(const token of ['router.use(opsIdentity)','opsAdmin(req)','privateOps(res)',
  'platform_subscription_invoices','clinic_subscriptions','platform_plan_versions',
  'INVALID_STATUS','INVALID_PAGE','INVALID_SORT','pageSize:10','verified_at',
  'lifetimeAfn','last30Afn','previous30Afn','INVOICE_NOT_FOUND',
  'subscription.invoice.confirm','subscription.invoice.reject'])
  assert.ok(finance.includes(token),token);
 assert.match(server,/app\.use\("\/v1\/admin\/finance", adminFinanceRouter\(\)\)/);
 assert.doesNotMatch(finance,/clinic_payment_entries|clinic_invoices|clinical|diagnos|patient_id|patient_profiles/i);
 assert.doesNotMatch(finance,/Math\.random|mockData|seedDemo|sampleData/);
 assert.match(read("apps/api/src/phase02.ts"),/eq\(schema\.platformInvoice\.status,"awaiting"\)/);
});
test("Phase D finance UI isolates decisions to their invoice and requires proof & explicit confirmation",()=>{
 const ui=read("packages/ui-web/src/admin-finance.tsx");
 for(const token of ['AdminFinancePortal','QueueTools','QueuePager','QueueEmpty',
  'selected.id!==invoice.id','selected.action==="confirm"','reference!==invoice.evidenceReference',
  'reason.trim().length<5','setVerified(false)','type="checkbox"','maxLength={400}',
  'historyId','AbortController','credentials:"include"','cache:"no-store"',
  'setResults(null)','new Intl.NumberFormat(lang)','timeZone:"Asia/Kabul"',
  '"fa-AF"','"ps-AF"','reconciliation','subscriptions','invoices'])
  assert.ok(ui.includes(token),token);
 assert.match(read("apps/admin-web/app/admin/subscriptions/page.tsx"),/AdminFinancePortal/);
 assert.match(read("apps/admin-web/app/layout.tsx"),/admin-phase-d\.css/);
 assert.match(read("packages/ui-web/package.json"),/"\.\/admin-finance"/);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/admin-phase-d\.css/);
});
test("Phase D support desk has meaningful 24h/48h metrics and constrained list with safe history",()=>{
 const api=read("apps/api/src/support-router.ts"),ui=read("packages/ui-web/src/phase18-admin.tsx");
 for(const token of ['desk-summary','first_reply_overdue','triage_overdue',
  'firstReplyOverdue','triageOverdue','initialResponseHours:24','triageHours:48',
  'INVALID_PRIORITY','INVALID_URGENCY','INVALID_SORT','INVALID_PAGE',
  'pageSize=15','ORDER BY','LIMIT','OFFSET','admin/tickets/:ticketId/activity',
  '"assigned":"unassigned"','"assigned":"unassigned"'])
  assert.ok(api.includes(token),token);
 assert.ok(api.includes('opsStaff(req)'));
 assert.ok(api.includes('privateOps(res)'));
 assert.ok(api.includes("NOT EXISTS (SELECT 1 FROM support_ticket_messages"));
 assert.match(api,/x\.action==="assign"\?\(x\.new_state\?"assigned":"unassigned"\)/);
 for(const token of ['adm-d-sla','deskStats?.firstReplyOverdue',
  'deskStats?.triageOverdue','first_reply_overdue','adm-d-support-pager',
  'adm-d-support-search','adm-d-support-history',
  'firstReplyOverdue','sort,q:search,page:String(page)','"fa-AF":{supportSummary',
  '"ps-AF":{supportSummary'])
  assert.ok(ui.includes(token),token);
 assert.doesNotMatch(api.slice(api.indexOf('router.get("/admin/tickets/:ticketId/activity"'),
  api.indexOf('router.get("/admin/templates"')),/SELECT.*actor_id/);
});
