# PH11 — Operational expenses and cash-flow insights

**Scope:** DandanLink specification C18 Expenses tab, C23, F11, AC11. Governed by Software Development Workflow V5.

**Purpose:** Maintain an auditable operational-cost register separate from patient billing. Expenses, manual collections and cash comparisons are not tax/accounting profit or automatically verified bank transactions.

## Navigation / workflows

- Clinic **Finance > Expenses** for owners, managers and cashiers. Receptionists have no expense visibility; dentists, assistants, patients and platform admins have none. Expenses is **not** a new top-level sidebar item; it belongs to Finance.
- Full create form: expense date (Gregorian), category (rent, salary, supplies, utilities, other), description, positive integer AFN amount, payment method (cash, manual bank transfer, other manual), optional reference and attribution, optional private PDF/PNG/JPEG receipt file up to 1 MiB. Invalid/oversized/mismatched signatures are rejected.
- List and filter by inclusive date range, category, payment method, status, search; responsive paginated table with selectable detail. Page-local CSV export only—no bulk cross-tenant financial export or public links.
- Details include latest expense and optional receipt download, all original/corrected/voided version snapshots, actor/timestamp/reason, receipt evidence for each version.
- Cashier can record and correct a posted expense with explicit correction reason, but only owner/manager can void (with reason). A voided entry is terminal. Corrections retain original version and original receipt. Detaching a current receipt does not destroy the historical document.
- Finance **Overview > Operating cash flow** reports for selected date interval: *net recorded collections* (PH10 actual manual payments plus reversal signs, without noncash credits), *recorded expenses*, and *collections less expenses*. Owner and manager also see expenses grouped by category. **This comparison is not accounting profit, revenue earned, certified bank balance, taxable income or payroll.** Expenses have no effect on patient receivables or issued invoice balance.
- English, Dari, Pashto, responsive UX, calendar preference for display, accessible form labels/focus, helpful empty/loading/error messages.

## Technical design

- Migration `0011_clinic_expenses.sql`: `clinic_expenses` current projection, clinic-local counter, append-only `clinic_expense_versions`, immutable `clinic_expense_receipts` with SHA-256, receipt MIME, size and version, no patient/appointment/treatment foreign keys. DB triggers block edits/deletes to versions, receipts and voided expenses, and prevent silent direct overwrite of expense identity and version.
- New private API `/v1/expenses/clinics/:clinicId/expenses`:
  - `GET /` paginated filters and search
  - `GET /summary` scoped date-range net cash comparison and owner-only category breakdown
  - `POST /` verified expense + private receipt with an idempotent action key
  - `GET /:expenseId` detailed permanent revision history
  - `PUT /:expenseId` correction with current revision + required reason, new immutable snapshot and existing/new/removed receipt association
  - `POST /:expenseId/void` owner/manager only, terminal reasoned void
  - `GET /:expenseId/receipts/:receiptId` private verified binary download with no-store, MIME and SHA-256 check.
- Mutations enforce subscription, active membership, tenant, role, positive AFN integer and date validation, optimistic row-level version lock. No patient finance data is sent from expenses or derived expense queries.
- Receipt uploads use a narrowly scoped 1.6 MB JSON body parser, not the general 16 KiB API parser; file uploads limited 1 MiB and checked by magic signature. Authenticated private download; no public document store.
- Stored dates are unambiguous DATE, reporting uses Kabul-local period boundaries, amount calculations use integer AFN, action keys prevent repeated create/correction/void posts.

## Acceptance AC11 — automated e2e

1. Authorized cashier posts **800 AFN rent** with PDF proof and **300 AFN supplies** on an active date. Period summary = 1,100 AFN expense and 2 entries; category and payment filters isolate records; different dates exclude entries.
2. Cash receipt already exists from signed clinical treatment and an issued PH10 invoice; cash comparison reports PH10 net collections minus recorded costs (not invoiced charges).
3. Negative and zero amounts, invalid categories, false MIME signatures, missing correction reason and stale revision are rejected; replay of identical idempotency key does not duplicate.
4. Cashier corrects rent from 800 to 900 AFN, stating a reason. Sum becomes 1,200; original 800 expense version and file survive; correction history remains. Invalid direct database UPDATE/DELETE of versions, receipts or projection without revision is rejected.
5. Owner voids supplies: current expenses become 900. Cashier cannot void; completed void cannot be edited. Audit still contains original and terminal version.
6. Patient invoice `balanceAfn` and `paidAfn` remain unchanged before and after all expense posts/revisions/voids. No payroll/inventory/tax engine is inferred.
7. Receptionist/dentist/assistant/admin and cashier from unrelated clinic cannot access any expense or receipt. Authenticated staff receipt bytes match original PDF and private no-store caching.
8. CI: static validation, strict typechecks, builds, Expo bundle, PostgreSQL migrations and all PH01–PH11 integration journeys.

## Production gates

Owner/accountant verification of cash reconciliation and expense categorization, expense policy approval, independent bank confirmation, receipt retention/encryption and backup, payroll legal requirements, privacy controls and manual accessibility/RTL tests. **This remains a development feature—not a certified accounting ledger or evidence of real bank payment.**

Next: **PH12**, verified public clinic/dentist listing and credentials moderation.
