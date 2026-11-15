# Admin Phase D — Finance and Support Operations

**Scope:** Admin subscription payments and support case management. Builds on persistent shell (Phase A), dashboard (B) and verification pages (C). No new database migration required.

## Finance
- **New /admin/subscriptions portal** with responsive finance scorecards, Payments and Subscriptions views, separate status filters, submitted search, 10-item server-side pages, newest/oldest sort, date/plan/reference details, empty/loading/error states, and Dari/Pashto/English text.
- Platform subscription metrics computed from **PostgreSQL**: awaiting, paid, rejected invoices, awaiting >48h, lifetime confirmed receipts (AFN), last 30 days and preceding 30 days, plus effective trial/active/grace/expired/cancelled subscriptions accounting for expiry and plan grace.
- One isolated decision form per selected awaiting invoice. Confirm requires the exact submitted reference, a 5–400 character reason, explicit attestation checkbox and independently checking the real payment outside the app. Reject requires reason and checkbox. Backend retains existing **MFA, status-concurrent compare-and-update, audit events, notifications and idempotent conflict** protection.
- Finalized invoices show **metadata-only** decision history (action/outcome/time) from append-only platform audit. Never expose owner identifiers or medical information in history.
- These metrics count confirmed **platform subscription** invoices, not patient billing nor independently verified bank reconciliation. **Typing a payment reference alone is not proof of payment**.

## Support
- Operational scorecards: unassigned cases, high-priority cases, cases older than 48h needing triage, waiting for first staff reply longer than 24h, cases approaching the first response target (20–24h), and in-progress cases.
- These are **internal monitoring targets**, NOT guaranteed contractual SLAs. Ticket age is based on creation time; first response detection is based on actual stored staff messages.
- Server-filtered search (ticket title/reference), status/category/assignee/age/priority/overdue type, server-side page 15, newest/oldest/priority sort, exact result totals, page navigation.
- Individual ticket activity histories show timestamps and transition labels, never assignee principal IDs; private staff notes and conversation remain separately permission-checked. Existing assign/escalate/status and reply transitions and audit events remain unchanged.

## Security, correctness and acceptance

| Gate | Expected result |
| --- | --- |
| Finance aggregate, invoices, subscriptions and invoice history | Platform admin with verified MFA only; clinic owner gets 403; anonymous gets 401 |
| Search/sort/page filter abuse | Whitelisted values; 422 for invalid page/status/sort/priority/urgency |
| Finance real totals | Sum of 'paid' platform subscription invoices matches PostgreSQL; no invented receipts |
| Decision form isolation | Reason, exact reference and confirmation bound to the selected invoice |
| Finalized payment replay | Existing atomic awaiting -> paid/void transition denies repeat with 409 |
| Support metrics | Operational 24h/48h thresholds; test-only aged ticket counted correctly |
| Search and pagination | Correct counts, page sizes (10 finance / 15 support), empty high pages |
| Ticket history | Hides assignee IDs; requester denied; MFA staff allowed |
| Clinic/patient data isolation | No medical chart or patient billing joins introduced |
| UX | Persistent sidebar, responsive cards, English/Dari/Pashto RTL, accessible controls |

Tests: `pnpm test`, `pnpm typecheck`, `pnpm build`. New `tests/admin-phase-d-validation.test.mjs` and real PostgreSQL Phase D assertions in `tests/phase18-integration.mjs`. GitHub CI runs the same suites and patient Expo bundle.

## Next
**Phase E:** unified admin search, internal notifications/alerts and deeper monitoring. PH19 legal, clinical, hosting, pentest, operational recovery and real-clinic acceptance checks **remain separate and unapproved until signed external verification**.
