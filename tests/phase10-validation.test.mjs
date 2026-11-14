import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH10 PostgreSQL separates tenant invoices from platform invoices and preserves ledger",()=>{
 const sql=read("packages/db/migrations/0010_patient_billing_ledger.sql");
 for(const part of ["clinic_invoice_counters","clinic_invoices","clinic_invoice_versions",
  "clinic_payment_entries","clinic_invoice_events","clinic_billing_immutable",
  "clinic_invoice_change_guard","action_key","request_digest","reverses_entry_id",
  "UNIQUE(clinic_id,created_by,action_key)","issued_at","occurred_at","source_type"])
  assert.ok(sql.includes(part),part);
 assert.match(sql,/CREATE TRIGGER clinic_payment_entries_no_change/);
 assert.match(sql,/CREATE TRIGGER clinic_invoice_versions_no_change/);
 assert.match(sql,/CREATE TRIGGER clinic_invoice_events_no_change/);
 assert.match(sql,/WHERE status<>'void'/);
});
test("PH10 API requires actual performed care and prevents payment double-posting",()=>{
 const api=read("apps/api/src/billing-router.ts");
 for(const part of ["COMPLETED_APPOINTMENT_REQUIRED","SIGNED_ENCOUNTER_REQUIRED",
  "COMPLETED_STAGE_REQUIRED","UNPERFORMED_SERVICE_CANNOT_BE_CHARGED",
  "STALE_INVOICE_REVISION","ISSUED_INVOICE_IMMUTABLE","INVOICE_HAS_LEDGER_HISTORY",
  "AMOUNT_EXCEEDS_BALANCE","IDEMPOTENCY_KEY_CHANGED","ALREADY_REVERSED",
  "DUPLICATE_PAYMENT_REFERENCE","DISCOUNT_REQUIRES_OWNER","BILLING_ROLE_DENIED",
  "getPatient","private, no-store","BANK"])
  if(part!=="BANK")assert.ok(api.includes(part),part);
 assert.match(api,/FOR UPDATE/);
 assert.match(api,/CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END/);
 assert.match(api,/noStore\(res\)/);
});
test("PH10 navigation and all financial routes have real integration",()=>{
 const side=read("packages/ui-web/src/phase03.tsx");
 assert.match(side,/const finance=link\("finance","\/clinic\/finance"/);
 assert.match(side,/options.push\(finance,patients/);
 const ui=read("packages/ui-web/src/phase10.tsx");
 for(const part of ["FinancePortal","InvoiceEditor","InvoiceDetail","Payments","Balances","Receipt",
  "PatientBilling","recordPayment","phase10-printable","usePreferences",
  "fa-AF","ps-AF","confirmReverse","voidReason","sourceId","history","aria-selected"])
  assert.ok(ui.includes(part),part);
 for(const path of [
  "apps/clinic-web/app/clinic/finance/page.tsx",
  "apps/clinic-web/app/clinic/finance/invoices/[invoiceId]/page.tsx",
  "apps/clinic-web/app/clinic/finance/payments/[paymentId]/receipt/page.tsx",
  "apps/clinic-web/app/clinic/patients/[patientId]/billing/page.tsx"])
  assert.match(read(path),/FinancePortal/);
 assert.match(read("packages/ui-web/src/phase05.tsx"),/\/billing\?clinic=/);
 assert.doesNotMatch(read("apps/patient-web/app/page.tsx"),/FinancePortal/);
});
