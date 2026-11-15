# Phase E — Administrator Operations Center

**Scope:** DandanLink platform-admin search, operational notifications and real database monitoring; integrates with the permanent admin sidebar/header delivered in Phase A. No patient, clinic-staff or clinical chart permissions are added.

## Features

**Global search** in the persistent admin header (button or Ctrl/Cmd+K) and at `/admin/center`. Searches clinic names/city/legal name, dentist names/clinic, listing clinic, subscription invoice clinic/reference and support ticket title/reference; category filters, bounded 2–100-character input, 250ms debounce, per-category six-record cap, direct links to existing administrative detail pages. Every result includes category, safe administrative title, status summary and link. Never indexes patient identities, medical records, clinic billing data, support message bodies, clinical notes or phone/email.

**Notifications center** accessible from the header bell or `/admin/center`. Generates real alerts for pending clinic/credential/listing/review queues, subscription invoices older than 48 hours, support tickets older than 48 hours, delayed delivery outbox entries and failed booking notifications. Also shows recent administrative action metadata (action/outcome/time). Each platform admin has a **private, persisted reviewed state** keyed by the actual alert and admin identity. Explicit read acknowledgement is checked against currently displayed alert keys, requires verified admin MFA and an allowlisted browser origin. Notification read receipts hold only opaque keys and timestamps, never PHI.

**Monitoring** reports database responsiveness to its query, queued/delayed delivery events, failed booking notices, payment-review backlog, 24h first-response/48h triage backlog, unsuccessful audit outcomes in the past 24h, and last 14 days of successful/unsuccessful administrative audit events by Kabul calendar date. Counters are based on PostgreSQL. No fake uptime, independent incident service, delivery guarantee, legal audit or clinical safety certification is claimed. Critical signals link to their existing management modules.

**UI:** One persistent keyboard-accessible search overlay and alert bell in the administrator header, with English/Dari/Pashto labels and RTL layout. Also a full operations-center route with Search, Notifications and Monitoring sections, responsive cards, loading/error/empty states, manual and visible-tab 60-second refresh, and notifications updated when acknowledged. The sidebar and header stay mounted during tab navigation.

## Security
- Admin-only API namespace `/v1/admin/center`: MFA via `opsIdentity` and `opsAdmin` on every endpoint.
- `GET /search?q=...&category=...`, `GET /notices`, `POST /notices/read`, `GET /monitoring`.
- Private no-store responses. Search terms parameterized; categories enumerated; maximum six results per category; no free-form SQL identifiers.
- Read-mark POST requires a matching alert key returned by the server and enforces an allowlisted admin origin. Alternate localhost origin is available only outside production.
- Database migration `0020_admin_notification_reads.sql` stores admin-specific review receipts with FK cascade. No notification bodies stored.
- No modifications to protected health-write gate, clinic/patient data, patient messaging, payment approval or support access privileges.

## Acceptance
| Check | Expected |
| --- | --- |
| Platform admin with verified MFA | Search, bell unread counter, per-admin reviewed status and monitoring |
| Anonymous user, clinic owner or support agent | Denied API access |
| 0/1-character query, unknown category | 422, no broad enumeration |
| Search PH07 clinic fixture | Result links to existing clinic detail page |
| Notification read | Persists between calls; invalid/unknown keys rejected |
| Monitoring counts | Non-negative real SQL aggregates, 14-day Kabul buckets, separate production approval note |
| Header navigation | Existing sidebar and header remain stable on route transitions |
| English/Dari/Pashto | Localized labels, RTL in Dari/Pashto |
| TypeScript/build/Expo/integration | GitHub CI passes |

Run `pnpm db:migrate` **after pulling** because this phase includes one new migration. Existing `pnpm dev:api` and `pnpm dev:admin` (or the scripts from your package configuration) then use the new API.

## Next
**Phase F:** final admin security/settings/accessibility/localization and real-world release readiness review. The PH19 pilot safety flags remain unapproved until genuine signed operator and external verification.
