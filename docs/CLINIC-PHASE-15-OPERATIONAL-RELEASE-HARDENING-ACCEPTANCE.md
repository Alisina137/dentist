# DandanLink Clinic Improvement — Phase 15
## Operational QA, Accessibility, Data Integrity & Release Hardening

**Scope:** targeted, production-aware hardening of the connected clinic scheduling, booking notification monitoring, and reporting workspaces built in Phases 6, 13 and 14. The changes build on the existing authenticated clinic, finance ledger and private reporting API; they do not change API roles, clinical records or the payment state machine.

### Implemented engineering changes

**Report data integrity:**
- Aggregate report payload is checked at runtime against the requested clinic ID, applied Gregorian dates, exact Asia/Kabul timezone and AFN currency before rendering or CSV export. An HTTP 200 containing an unexpected clinic/period, malformed JSON, missing fields, excess fields or patient details is **rejected and never displayed or exported**.
- Server-produced appointment status counts reconcile with total; day counts must be valid sorted dates within the requested period, unique and reconcile with total. Ledger payment subtotals reconcile exactly with net receipts. Both counts and money must be finite safe integer values; no estimated/fake numbers are substituted for invalid data.
- The expected API surface is strictly aggregate-only. The CSV continues to use the formula-neutralizing financial encoder; it cannot include patient names, diagnosis, billing references, or notes. API error codes are allowlisted to safe syntax, and rendered messages come from the existing localized clinic feedback component, not arbitrary server/HTML text.
- Report fetch cancellation, tenant-bound snapshot and date-Apply lifecycle from Phase 14 are retained. A failed response is not left visible as a valid report; export stays disabled unless real report data matches the applied range. Loading now reuses the clinic's accessible skeleton state.

**Notification metadata integrity:**
- The last-100 notification response is validated before showing or counting: exact six permitted metadata fields per item (event type, status, attempt count, creation/sending times, safe error code), true boolean email configuration and explicitly disabled SMS and push. It rejects unexpected contact names/addresses, PHI, invalid timestamps, unknown statuses, extra rows or malformed data.
- The database-supported `pending`, `processing`, `sent`, `skipped`, `failed` states remain accepted. No UI action can make an event "sent"; it reflects real server delivery outcomes only.
- Faults display translated, non-sensitive, actionable feedback; stale or invalid responses cannot become a successful empty notification list. The API still enforces owner/manager tenancy and permission.

**Connection resilience and accessible state:**
- Calendar, queue, notification status and reports use one shared localized component to show an accessible **offline** banner and a **connection restored** message.
- The component relies on browser online/offline hints, never treats online as proof of API/database health, and **does not replay mutations, checkout requests, or bookings after reconnect**. The operator must explicitly click Refresh to reload data; that action calls only existing read-only refreshes.
- English, Dari and Pashto, RTL-safe layout, readable status messages, keyboard focus and reduced-motion responsiveness. CSS is only imported in the persistent clinic layout.

**Automated QA:**
- Adds dynamic tests of actual response validators against wrong-tenant records, wrong date, wrong currency/timezone, invalid money/status/day sums, duplicate days, unexpected identifying fields, unknown delivery statuses, more than 100 notifications, invalid error codes, and reconnection behavior contracts.
- Retains and gates existing GitHub workflow: `pnpm test`, `pnpm typecheck`, Expo SDK dependency check, production web build, Android/iOS Expo bundle, real PostgreSQL HTTP identity/tenant integration and backup/restore drill.
- No new external dependencies, migrations, secrets or environment variable changes. No PHI, credentials or patient screenshots are collected as part of QA.

### Manual acceptance matrix — **pending operator validation**

| ID | Action | Expected |
| --- | --- | --- |
| C15-01 | Open calendar, queue, notification and reports while online | Existing data appears from the selected clinic, persistent sidebar/header never vanish |
| C15-02 | Disconnect Wi-Fi/Internet while screens are open | Localized amber offline banner appears and previous contents are not falsely presented as freshly synchronized |
| C15-03 | Reconnect Internet | Green restored banner appears, no POST or booking is silently retried |
| C15-04 | Click Refresh after reconnect | Only currently selected clinic's read-only information re-fetches; empty/loading/error states are clear |
| C15-05 | Test wrong clinic ID, expired session, disabled staff role | Server denies; no aggregate financial or private notification data is shown |
| C15-06 | Mock report API returning 200 HTML, wrong clinic, wrong date, missing currency, excessive fields | Report is rejected, localized safe feedback shown and CSV cannot be exported |
| C15-07 | Mock inconsistent status totals, duplicate dates, impossible dates, mismatched revenue methods | Report rejected instead of charting false figures |
| C15-08 | Use real reporting backend for 7, 30, current and previous month | All totals match SQL and clinic scope, including Afghan timezone boundary |
| C15-09 | Try fast clinic/date switches during report fetch | Old result is ignored, never displayed or included in download |
| C15-10 | Export valid report to CSV and open in Excel/LibreOffice | Aggregate-only values, safe formula escaping; no patient identifiers or medical notes |
| C15-11 | Notification monitor receives valid pending/sent/failed delivery list | Real statuses, attempts and actual timestamps displayed correctly, with SMTP readiness separate from sent state |
| C15-12 | Mock malformed or PHI-containing notification event | Response refused and existing clinic data is not replaced with fake successful event |
| C15-13 | Test no SMTP, offline, API 500 and empty metadata | No delivery claim, safe error + retry UI and honest channel notices |
| C15-14 | Test keyboard focus, tab order, screen reader status announcements | Functional in EN, Dari, Pashto on desktop/mobile layouts including RTL |
| C15-15 | Test narrow screens at 320/375/560 px, large text and reduced motion | No clipped controls or unreadable banners; motion reduced |
| C15-16 | Repeat cross-role security, concurrent booking, finance reversal and no-store API HTTP tests | No regression or cross-clinic leakage |
| C15-17 | Verify production backup, restore, MFA/admin gates, secrets and monitoring | Release checklist marked only when manually verified and approved |

### Release policy / what has **not** happened

CI is automated regression verification, **not** an independent security certification or real-device acceptance. Tests do not replace manual clinic operations or a physical-phone patient test. The existing PH19 pilot production release stays **NO-GO** until the documented manual gates and business/operator security signoff are completed.

**Next suggested clinic improvement:** Phase 16 — production deployment readiness, audit logging, accessibility walkthrough and pilot/UAT signoff (without automatically enabling production release).

### Pull after CI success and verified merge
```powershell
git -C C:\projects\dentist pull --ff-only origin main
```
