# DandanLink Admin Dashboard — Phase B Acceptance

**Scope:** Main platform administrator dashboard `/admin`. Builds on the persistent, accessible sidebar and design system delivered in Phase A. **No database migration required.**

## Delivered

- Dedicated **dashboard endpoint** `GET /v1/insights/platform/dashboard?days=7|30|90` mounted inside the existing `insightsRouter` platform namespace. Access enforced by `opsIdentity` and `opsAdmin`, which require a verified platform administrator with MFA. Other roles receive 403; anonymous requests receive 401. Periods outside 7/30/90 receive 422.
- All counts are calculated **from real PostgreSQL records** (no placeholder values): registered and approved clinics, independent dentist credential status, pending public listings, review/report/appeal moderation, active and trial subscriptions, invoice review backlog, confirmed platform subscription receipts, appointments created, cancelled appointments, open/in-progress/waiting support, high priority and 48-hour stale tickets.
- Time range selected in **Asia/Kabul calendar days**, with current versus preceding equal-length period figures where applicable. A full daily time series for clinics, appointments, support and confirmed subscription receipts, with zero-filled missing days and no invented numbers.
- **Page hierarchy:** compact header and date-range selector → six KPI cards → action-required verification queue → interactive real-data trends → recent administrative activity and operational signals. Accessible SVG chart with an optional underlying data table; separate data controls for registrations, appointments, tickets and receipts.
- Eight recent administrative audit events, projected to **action, outcome, type and timestamp only**. No patient, staff, payer, clinic or support-message identifiers in the payload.
- Operational signals: a successfully queried database, overdue pending delivery-outbox records, failed booking notices and the *operator-set* pilot release flag. **These signals do not certify backups, legal, clinical or hosting approval.**
- Explicit **no-store** API responses, loading skeletons confined to the page content, retriable error state, periodic refresh while page visible, manual refresh and cancellation of stale fetches.
- Localized interface: **English, Dari and Pashto**, with inherited RTL/LTR and Hijri/Gregorian chart-date formatting. Responsive cards and reduced-motion behavior, without introducing new chart packages.
- Existing administrator support, clinic moderation, subscription, security and other pages remain available. Backend patient/clinical security gates remain unchanged.

## Validation

Run `pnpm test && pnpm typecheck && pnpm build`. Added `tests/admin-phase-b-validation.test.mjs` and expanded the live PostgreSQL `tests/phase18-integration.mjs` to verify 401/403/422 cases, current 7/30/90-period charts, count reconciliation to DB rows, sum of confirmed receipts, and no identifiers in the dashboard payload.

### Functional acceptance checks

| Condition | Expected result |
| --- | --- |
| Open `/admin` as MFA-enabled platform admin | Live totals and actions; no placeholders |
| Open as ordinary clinic owner / anonymous | 403 / 401 on data API |
| Select 7 / 30 / 90 days | Corresponding Kabul-date window, comparison and correct day-count chart |
| Read KPI "receipts" | **Platform** subscription payments confirmed by the admin, not clinic billing |
| Queue contains 0 items | Calm empty/clear state with direct link to the underlying module |
| Switch chart metric | Accurate registration, appointments, support or revenue lines; data table is available |
| No activity in selected dates | Zero-filled chart, clear empty explanation; no mock metric |
| Switch tabs to clinics, payments, security | Phase-A persistent sidebar and header remain visible |
| Change Dari/Pashto/English or calendar preference | Labels and calendar formats adapt correctly |
| Network offline / API denied | Error and retry affordance; no false "all clear" value |
| Production readiness unapproved | Explicit "not approved" warning and link to pilot checklist |
| Unprivileged user calls dashboard URL | Role/MFA denial in the API, never just hidden UI |

## Later phases

- **Phase C:** deeper moderation pages, evidence reviews, decision history and pagination.
- **Phase D:** payment-case form isolation and support SLA management.
- **Phase E:** platform-wide search, notification center and deeper monitoring/alerts.

A successful Phase B automated test **does not** mark the PH19 real-patient launch gates as approved.
