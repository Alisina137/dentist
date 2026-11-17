# DandanLink — Clinic Improvement Phase 15
## Operational QA, Accessibility, Data Integrity and Release Hardening

### Delivered

**Clinic Settings → Quality checks.** New owner/manager-only `/clinic/settings/quality` screen within the persistent clinic sidebar. It runs four existing private and tenant-authorized, no-cache reads for the currently selected clinic: operations summary, staff security, booking notification delivery metadata and appointment overview. It displays only aggregate operational counts; no patient name, phone number, medical data or staff email is rendered.

Six real setup checks show distinct Configured / Needs attention / Unknown states: active services, chair compatibility, clinic hours, provider hours, active staff without MFA and email-channel readiness. No statuses are invented. Chairless service compatibility follows the API's chair checklist. The screen links to actual clinic settings while preserving clinic ID. Latest failed notification count is explicitly bounded to 100 API-delivered events, not an all-time failure rate.

**Clinical and regulatory hold.** A permanent human-review-pending section covers medical credentials, privacy/consent, real-device booking/finance validation, backup/restore, incident response, security and regulatory approval. No UI control can mark clinical signoff complete. PH19 remains independent and NO-GO unless independently approved; a green operational checklist does not override the healthcare pilot gate.

**Data integrity.** All four calls use authenticated no-cache GET, AbortController cancellation and tenant-keyed response updates. Any malformed JSON, unauthorized status or failed request is unknown rather than passing. A 12.5-second timeout unblocks retry instead of leaving an infinite spinner. A switch to a different clinic never reuses the previous clinic's data.

**Accessibility.** Staff role/invitation/revocation review dialogs now trap Tab/Shift+Tab, restore focus after closing, support Escape except during protected writes, lock body scroll, and announce descriptions. The quality page supports EN/Dari/Pashto, RTL, clear status, mobile breakpoints, focus-visible and reduced motion.

**Read-only operator preflight.** `pnpm qa:clinic` probes public `/health`, `/ready`, `/v1/public/status` without any auth cookies or patient/clinic secrets. It rejects HTML interstitial responses, network failures and DB 503, and never confuses API availability or an operator release flag with clinical approval. For public HTTPS origins an optional `DANDANLINK_CHECK_API_URL` may be supplied; localhost HTTP is allowed only on loopback.

**Continuous integration.** Unit regressions validate page authorization, real data selection, privacy, accessibility, UI scaling, quality utility states and preflight. A new actual PostgreSQL-backed HTTP integration verifies anonymous requests are blocked for protected clinic operational endpoints, restricted writes reject foreign origins, and API responses include cache prevention and request IDs.

No migration, additional dependency or production environment change is required.

### Manual acceptance (pending)

1. Owner or manager can access Quality checks; all other roles cannot see this item, and the page refuses direct access.
2. Changing the `?clinic=` ID cannot expose data from another tenant or previous clinic.
3. Service, chair (including chairless services), clinic opening hours and provider hours count correctly as configuration changes are made.
4. Active staff **without** MFA count excludes suspended accounts. MFA-protected actions still require MFA on the server.
5. SMTP off is accurately reported and no email or push notification is sent by checking status. SMS and push remain unsupported.
6. Scheduled appointments today/next 7 days and recent failed delivery counts match real server data without any patient identifiers.
7. Each private request can independently fail or time out without falsely indicating success; user can retry after 12.5 seconds.
8. Enter another clinic while network requests are pending; previous-clinic data must never appear.
9. Staff review dialogs constrain keyboard focus and restore it after cancellation or confirmation.
10. EN/Dari/Pashto, RTL, screen reader, zoom 200%, mobile 320–375px and reduced-motion settings remain usable.
11. `pnpm qa:clinic` returns PASS with a healthy test API and nonzero exit if API/DB is unreachable, without revealing credentials.
12. PH19 release still requires human clinical/legal/security/privacy approval, independent of this page.
13. Regression-check billing idempotency, booking conflict detection, MFA role protection, patient app, admin web and Expo.

### Merge gate

Run GitHub CI on the exact final PR head SHA: node tests, typecheck, production web builds, Android/iOS Expo bundle, PostgreSQL authentication and protected clinic HTTP integration. No manual test or clinical certification is claimed. PH19 remains NO-GO.

After PR is merged to main:

    git -C C:\projects\dentist pull --ff-only origin main

Optional diagnostic while API is running:

    cd C:\projects\dentist
    pnpm qa:clinic

Next: Clinic Improvement Phase 16 — Manual User Acceptance and Targeted Operational Defect Remediation.
