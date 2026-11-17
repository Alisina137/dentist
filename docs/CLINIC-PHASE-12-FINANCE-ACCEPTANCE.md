# DandanLink — Clinic Improvement Phase 12
## Billing, Payments and Financial Workspace Refinement

**Scope:** existing clinic finance dashboard, invoice directory/drafts, manual payment/credit workflows, receivables, immutable ledger, patient billing statement, receipt printing and original clinic expense section. This is the *clinic UX improvement Phase 12*, not the product's unrelated numbered development stage. No artificial transactions, automatic invoicing, bank capture or patient release.

## Implemented

| Area | Delivered |
| --- | --- |
| Finance navigation | Premium role-aware finance header, stable five-tab workspace (Overview, Invoices, Payments, Balances, Expenses), icon affordances, URL-synchronized tab changes and correct clinic scoping. Receptionist is limited to invoices; managers/owners/cashiers can view advanced finance sections. The server independently rechecks every permission. |
| Overview | Four **actual backend** metrics (net recorded receipts today, outstanding receivables, overdue receivables, net recorded month collections), real recent ledger entries, refresh, role guidance and shortcuts to invoicing, ledger, aging and expenses. No credit is counted as a cash receipt. |
| Invoice directory | Search by actual invoice/patient fields, draft/issued/partial/paid/overdue/void filters, 15-row server paging, result window counts, clear/reset, loading/empty/retry and role-safe creation. Backend searches last **400 invoices**; UI discloses the finite window rather than calling it lifetime. |
| Invoice drafting | Completed appointment/signed encounter/completed stage remains required by server, which prices from eligible performed-care sources. UI mirrors duplicate services, quantity limits, 30% maximum discount, role-restricted discounts, nonzero amounts and whole AFN. Catalog price is clearly an **estimate**; server re-prices and freezes invoice items. A draft is not a bill charged to a patient and issuing never collects money. |
| Manual payment / credit | Accurate `datetime-local` for **Asia/Kabul (UTC+04:30)**, amount/remaining-balance validation, source reference checks, owner-only credit reasons. A two-stage **in-app review** shows clinic, patient, invoice, amount, payment method, payment time and projected balance, with an explicit confirmation checkbox before posting. Existing action-key idempotency is kept across network errors so a retry does not double-post. Bank entries remain **manual and unverified**, never online bank-verified. |
| Issuance, void and reversal | In-app confirmation review with patient/invoice/amount/reason, action-specific warnings and explicit checkbox replaces native browser confirmations. The server's current-revision, role, immutable-ledger, unique reversal and audit constraints remain authoritative. A reversal creates a compensating ledger entry, **not** a refund. |
| Ledger & receivables | Date-scoped current ledger data, kind filters, 15-row paging, safe CSV current-page export and private-storage warning. CSV now neutralizes spreadsheet formula injection for hostile patient/reference text and preserves the AFN ledger sign. Receivables aging now displays actual overdue groups/days, not a generic overdue pill. The backend limits aging to 500 invoices; do not treat UI results as full-clinic lifetime totals. |
| Patient billing | Dedicated real patient header, financial summary, invoice/ledger/statement tabs with **five rows per page**. Explicit warning that statement contains at most **150 recent invoices** and **200 recent ledger entries**, with totals scoped to returned invoice window. Records remain private to clinic; no automatic patient-app sharing. |
| Payment receipts | Protected receipt endpoint exposes only its **same-clinic linked invoice ID** for staff navigation. Reversed payment receipts show a prominent warning in both screen and printed record; receipts are retained for audit. No clinical notes included and no bank-verified claims. |
| UX & localization | Responsive professional blue/neutral finance design, icons, accessible focus, dialog Escape/cancel, printable receipt semantics, EN/Dari/Pashto labels and RTL layout, reduced-motion, 1250/860/640/375px breakpoints. CSS is isolated to the persistent clinic layout. |

### Files changed

- `packages/ui-web/src/phase10.tsx`: finance navigation, overview, invoice directory/editor, payment review, issue/void/reverse safeguards, ledger, balances, patient statement and receipts.
- `packages/ui-web/src/clinic-finance-model.ts`: pure tested finance tab guards, Kabul timezone conversion, invoice preview validation, ledger CSV sanitization, net sign and payment amount predicates.
- `apps/api/src/billing-router.ts`: add already-authorized same-tenant invoice ID to existing receipt response; no new route or schema changes.
- `apps/clinic-web/app/clinic/clinic-finance.css` and `apps/clinic-web/app/clinic/layout.tsx`: isolated premium responsive financial workspaces.
- `tests/clinic-phase-12-finance-workspace-validation.test.mjs`: integration contract, formula injection, pure finance model regression and permission tests.
- This file documents the honest limits and hands-on acceptance.

### Live QA / signoff checks (NOT yet performed)

1. Owner/manager: open each finance tab; refresh and navigate back. Confirm active tab, clinic selection, sidebar and header never collapse to a loading page.
2. Cashier: view finance overview and post **a synthetic test cash payment** to a real eligible issued invoice. Confirm review includes the correct patient, amount, method, Kabul time, and remaining balance before action.
3. Receptionist: can open invoices and create permitted draft but cannot access overview/payments/receivables/expenses, post cash or reverse entries. Check backend returns 403 on direct API calls.
4. Dentist/assistant: finance route and direct API deny unauthorized access.
5. Generate a synthetic draft for an actually completed care source. Test duplicate services, discount above 30%, cashier-only discount restriction, quantities 0 and 21. Verify no invoice created for unperformed care.
6. Issue after reviewing recorded source/patient/amount and checking the required box. Verify amount is *not* paid, document freezes, and simultaneous stale revisions are rejected.
7. Owner/manager void an issued, **unpaid** invoice without ledger history. Verify reason is required, original version and audit trail remain.
8. Attempt void after any payment/credit/reversal exists; backend rejects even after all entries were reversed.
9. Record a partial amount then full balance using synthetic data. No duplicate posts after timeout + retry; invalid future Kabul time or historical date is blocked. Confirm credit reduces balance but is not in net cash receipts.
10. Owner/manager posts a compensating reversal. Check the original entry and reversal coexist, reversal reason is permanent, and no external refund was issued. A second reversal is rejected.
11. Verify ledger CSV opened in Excel does not execute a patient name or reference beginning `=HYPERLINK`, `+SUM`, `@` or `-`; export only authorized 15-row page.
12. Finance overview metrics match a directly queried authorized backend response for the clinic (no seeded/fake KPIs), and keep reversals net of cash.
13. Check receivables current/1–30/31–60/61+ filter, overdue day labels and 15-row navigation. A 501st invoice should not be misreported as reflected in the bounded list.
14. For a patient with 6+ statements or 6+ payments, page across 5-row cards. Verify known 150/200 row cap is visible and the summary is not described as lifetime.
15. Print a non-reversed receipt; then reverse the ledger entry and print again. The audit-only reversed warning must appear in the printed page and the invoice link must route to the same authorized clinic.
16. Switch between two authorized clinics during slow network responses; no previous clinic's invoice, patient, receipt or payment is shown or posted to the new clinic.
17. Test EN, Dari, Pashto, RTL/LTR, keyboard, modal focus/Escape/cancel, mobile widths 320–375px, tablet, 1440px desktop and reduced-motion setting.
18. Confirm existing expenses, analytics, clinic operations, patient mobile, public discovery, admin, existing dental chart and print invoice remain unaffected. No new code should release financial records to the patient app.

### Verification gates

GitHub CI must pass **on the PR's exact current SHA**: `pnpm test`, `pnpm typecheck`, `pnpm build`, native Expo Android/iOS bundles and PostgreSQL HTTP integration. Browser/device/manual financial signoff cannot be claimed from source tests alone. The independent PH19 release/pilot gate remains **NO-GO** until all required independent reviews are complete.

No DB migration, package installation, payment-provider setup, or new environment variables are required.

After CI success and merging main:
```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

**Next:** Clinic Phase 13 — Staff, Roles, Permissions and Clinic Settings Refinement.
