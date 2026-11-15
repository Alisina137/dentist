# DandanLink — Phase E: Administration Search, Alerts & Monitoring

**Scope:** Platform-admin-only operations; builds on Phases A–D and preserves the persistent sidebar. The Phase E database migration is `0020_admin_alert_snoozes.sql`.

## Delivered

### Global search
- Persistent **Ctrl+K / Cmd+K** search from the admin header (also available by clicking the search trigger).
- Searches public/admin-safe identity metadata across **clinics, dentist credentials, clinic listings, platform subscription invoices and support-ticket titles/references**. Search results link directly to existing protected admin pages. Results are capped at **five per category**, ordered by most recently changed, and only require two to eighty characters.
- The backend is **verified-platform-admin + MFA only**. Search does **not** query patient accounts, diagnoses, appointment notes, clinical charts, support-message bodies or clinic financial ledgers. Inputs are parameterized and bounded, and every response is private/no-store.

### Notification center (derived from live records)
- A **persistent notification bell** and badge in the admin header, with direct links to the appropriate review queue. The **Alerts** sidebar tab opens `/admin/alerts`.
- Current alert types: 15-minute delivery job backlog, failed booking notifications, no first staff reply after 24 hours, support triage older than 48 hours, high-priority support, unassigned support, platform payment verification over 48 hours, clinic verification over 48 hours, and failed/denied actions in platform audit events over the past 24 hours.
- All alerts are calculated **from PostgreSQL** each time they are fetched. These are *pull/poll-based* operational alerts, **not** push notifications or an externally managed incident service.
- **Snooze for 12 hours** (and restore immediately) is stored per verified administrator in `platform_admin_alert_snoozes`. Snoozing an alert does **not** change the underlying incident, queue, external job or production gate. After 12 hours, unresolved alerts automatically return. Resolved conditions disappear as soon as their count reaches zero.
- Mutations require verified MFA, an allowed browser Origin, a server-side allowlist of alert keys, and create an admin audit event. No patient/clinic/actor identifiers are included in alert overview data.

### Platform monitoring
- `/admin/monitoring` shows real counters for pending clinics, pending listings, open support requests and platform subscription invoices verified paid in the last 14 days.
- **14-day real daily series** for support requests opened, platform subscription invoices confirmed and failed/denied platform audit actions, grouped by Kabul local day. An accessible chart has a table alternative and displays an empty state on zero activity. No demo numbers are inserted.
- Recent platform action metadata and current database connectivity status. Pilot-release flag is labeled **operator-set** and is **not** treated as external clinical/legal/hosting approval; existing PH19 real-patient production safety gates are unaffected.
- **English, Dari, Pashto**, RTL/LTR, desktop/mobile responsive, accessible modal focus handling, reduced motion and admin-only CSS.

## Acceptance

| Test | Expectation |
| --- | --- |
| Anonymous, clinic owner or patient visits search or monitoring API | 401/403; no leaked platform data |
| Admin with verified MFA searches clinic name or support reference | Real matching records, up to five per category, safe destination paths |
| Invalid, repeated or excessive search parameter | 422 |
| Bell/alerts center | Same live active counts and only actual outstanding records |
| Admin snoozes support overdue alert | Saved to their own database row, 12h expiry, badge decrements |
| Admin restores or staff resolves underlying overdue request | Badge returns on restore, or affected case count decreases on real reply |
| Invalid alert name / non-admin snooze | 422 / 403 |
| Monitoring | 14 Kabul-local daily values, real counts, source data table |
| Offline or API failure | Clearly visible error + retry, **not** false "all clear" |
| Existing clinic, patient, treatment, receipts and API functionality | No navigation / role regression; unchanged clinical access restrictions |

## Verification

`pnpm db:migrate` (required for existing databases), `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android bundle, plus PostgreSQL integration through `tests/phase18-integration.mjs`. Added `tests/admin-phase-e-validation.test.mjs` and updated sidebar icon regression tests.

**Production boundary:** No claims of independent legal compliance, clinical readiness, incident monitoring, or backups. Pilot safety checks require external operator evidence and remain controlled by Phase 19.
