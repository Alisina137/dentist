# PH10 — Clinic invoices, partial payments, balances and receipts

**Traceability:** DandanLink Product Specification v1.0 — F10, C09 Billing, C16, C18–C22, AC10, BR-FIN-01 through BR-FIN-05.  
**Status:** Implemented in code; GitHub Actions/PostgreSQL acceptance is the release gate. PH11 expenses and online payment gateways remain out of scope.

## Functional patient/clinic navigation

- Clinic side navigation **Finance** is shown to owner, manager, cashier and receptionist. The receptionist sees the invoice workspace only, **not** clinic-wide revenues, payment ledger or balances. Clinical assistants and ordinary dentists have no access to this workspace.
- `/clinic/finance`: Overview (today's net receipts, month-to-date collections, overdue and outstanding issued invoices), Invoices, Payments and Balances; reception only sees Invoices.
- `/clinic/finance/invoices/:invoiceId`: versioned invoice draft/issued details, line-item snapshot, source evidence, totals, issue/void, cash or manual transfer entry, credit and reversal actions, immutable event/history, print invoice.
- `/clinic/finance/payments/:entryId/receipt`: staff-authenticated, print-friendly patient receipt displaying payment provenance and reversed state. This is **not** a public or bank-confirmed receipt.
- `/clinic/patients/:patientId/billing`: patient-specific total invoiced / total paid / outstanding and sub-tabs Invoices, Payments, Statement; new patient invoice action. Finance roles see no dental chart link, diagnosis, clinical notes or attachments.
- Full search, filter, pagination, aging buckets and current-page CSV for authorized finance users. Localized English, Dari and Pashto, correct RTL identifiers, keyboard focus, responsive desktop/tablet/mobile and empty/error/loading states.

## Business invariants and safe financial model

- Tenant-scoped invoices use `INV-000001` serial numbers per clinic; source is exactly one **completed** appointment, **signed** clinical encounter with an explicitly performed and service-linked procedure, or **completed** PH09 treatment stage. Future appointment, proposal, unperformed procedure and another patient's evidence cannot be invoiced. Source uniqueness prevents a second active invoice for the same care.
- Draft invoice creation/revision snapshots actual catalog service ID, service version, name, price (integer AFN), quantity and authorized discount. Treatment-stage sources use the accepted proposal snapshot. Front desk/cashier cannot create discounts; only owners/managers may discount up to 30%. No implicit tax without configuration and no retroactive price changes to issued invoices.
- Draft edits append `clinic_invoice_versions`; issuing freezes terms. Void is an owner/manager-only action with a reason, permitted only when the issued invoice has **no ledger history**. Issuing a bill never posts payment.
- Partial manual payments are `clinic_payment_entries` with server-authorized amount, explicit method, patient/invoice scope, actor, time, optional reference, and idempotency key. `POST /payments` locks invoice inside PostgreSQL transaction; amounts must be positive and no larger than the live outstanding balance; concurrent requests cannot overpay. Duplicate key/payload replays return same posted record; changed key contents or reused transaction reference return conflicts.
- Reversal is a **new compensating entry** against one previous payment/credit, requiring owner/manager and reason. Original entries are never changed/deleted. Reversals recompute receivables; a ledger reversal does **not** physically refund cash or initiate bank transfer.
- Owner/manager can apply an authorized reasoned **credit** reducing receivables, separately from cash receipts. Credits are not counted as cash collected.
- Derived balance = issued invoice total − payment entries − credits + reversal entries. Status reflects draft, issued, partially paid, paid, overdue or void. **Cash collections** and **invoiced charges** are separate metrics and never conflated. The platform subscription invoice domain remains separate from clinic patient invoices.
- Manual bank transfers are explicitly recorded as **unverified by banking infrastructure**. These ledger entries are staff-entered, not proof of actual external transfer. Clinic reconciliation remains an operational obligation.
- Sensitive finance data uses clinic membership and role authorization; patient-app release is disabled until verified portal linkage/release policy. No patient app checkout or payment processing in PH10. Receipts have private/no-store response caching; no PHI in error logs.
- DB migration `0010_patient_billing_ledger.sql` enforces append-only invoice snapshot, event and payment history; issued invoice item terms immutable via trigger, no silent deletion of posted payments or financial audit.

## Acceptance and validation (AC10)

1. Dentist records a performed clinic service in a **signed** PH07 encounter and the clinic owner registers a **6,000 AFN** price. Cashier drafts, edits and issues an invoice from this completed source.
2. Record **2,000 AFN cash**; balance is **4,000 AFN**. Replay the same operation key: exactly one posted payment. Reusing the action key with a changed amount and posting the same payment reference under a new key fail.
3. Record **1,500 AFN** manual bank transfer; invoice now has **3,500 AFN** paid and **2,500 AFN** outstanding. Patient statement, account aging and invoice detail agree; the invoice remains **partially paid**, not "paid."
4. Owner reverses the 1,500 AFN entry with reason; invoice recalculates to 4,000 AFN owing, original receipt remains visible as *reversed*. Retrying identical reversal is idempotent; double reversal is rejected.
5. Owner applies a reasoned 500 AFN noncash credit; live balance becomes 3,500 AFN while cash receipts remain unchanged. Unpaid second invoice can be voided with a reason; invoiced history remains.
6. Cross-tenant cashier cannot view another clinic, receptionist cannot view clinic revenue or post payments, dentist/assistant/platform-admin cannot view finance, no clinical findings appear in revenue, statement, patient selection or invoice list.
7. Direct PostgreSQL checks block UPDATE/DELETE on immutable posted transactions, invoice versions, events and issued terms. Build, static tests, Expo and HTTP/Postgres integration run in GitHub Actions.

## Go-live boundaries

Requires real-clinic reconciliation policy (including manual bank entry confirmation), legal invoice/receipt requirements, tax configuration, proper refund handling outside the platform, data retention, role-permission review, accessible RTL print/browser manual review, and PH19 privacy/security gate. This is a **development implementation**, not yet a legally certified accounting or banking system.

## Local update

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm db:migrate
pnpm check
```

Next: **PH11** categorized operational expenses with historical corrections and income/expense reporting, kept separate from patient balances.
