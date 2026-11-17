# DandanLink — Clinic Improvement Phase 14
## Scheduling, Notifications and Reporting: Cross-Workspace Refinement

This phase builds on existing clinic functionality. It does **not** create a new messaging service, change payment processing, invent appointment records, publish clinical information, or modify the separate original product PH14 patient account module.

### Delivered

**Connected clinic navigation.** A single, keyboard-accessible, RTL-compatible, icon-led shortcut strip links authorized staff to Calendar, Queue, Booking Requests, Notification Delivery, Reports and Finance without changing the active clinic. Role visibility mirrors server permissions: only owners/managers see delivery monitor; only owners/managers/cashiers see financial reports; reception cannot open reports or notification configuration; cashiers cannot book patients. Links preserve the authorized `?clinic=` and day deep links only when a valid Gregorian day is selected. On the calendar and queue screens this supplements existing scheduling controls. On notification monitoring it replaces redundant page tabs.

**Calendar and queue clarity.** Dashboard cards now have consistent clinic care icons. Appointment/queue links provide a practical route to requests, reports and delivery monitoring. Stale policy wording claiming that patient booking or reminders are not available has been corrected; calendar gaps remain candidates rather than guaranteed bookable slots. All scheduling data still comes from the live appointment API, and server-side conflict, scope and revision checks remain unchanged.

**Notification delivery monitoring.** Actual last-100-deliveries metadata from `/v1/booking/clinics/:clinicId/notifications` powers the per-status counters, email/SMS/push readiness indicators, search by event **type** (never patient name), status filter, ten-record paging, safe failure codes, created/sent timestamps, current-sync label, clear-filter/empty/retry states and attention callout if SMTP is not configured. Polling remains 45 seconds/foreground. During refresh, the previous same-clinic monitor is visible with an explicit refreshing status; prior clinic data is discarded. No delivery is claimed until marked sent, SMS/push are explicitly unsupported. The API's owner/manager MFA/tenant access remains authoritative.

**Real reporting workflow.** The clinic report uses actual private `/v1/insights/clinics/:clinicId/report` data, constrained to owner/manager/cashier. Staff can choose Last 7 Days, This Month, Last Month, or Last 30 Days; edit Gregorian From/To and **Apply** when ready. The UI validates real calendar dates, chronological order and the API's **maximum 366-day span** before fetching. A changed draft is never mistaken for an applied report or exported; the report snapshot is keyed to the authorized clinic ID, applied dates and pending request, with `AbortController` cleanup to avoid cross-clinic stale render.

**Privacy and truthful reporting.** Staff can switch between real appointment status/day metrics, patient aggregate counts and AFN financial metrics. A day-by-day appointment-volume bar graph uses API counts, deep-linking only to staff clinic calendar, with optional completion percentage. This does not mean clinical success rate. Revenue excludes credits, subtracts posted manual reversals and is not treated as bank-verified profit. CSV exports contain **aggregate metrics only** (plus reporting time zone) and use the existing formula-injection-safe encoder; no patient names, notes, diagnoses or payment references are written. The patient, admin and public views are unchanged.

**Design.** A cohesive clinic-blue private dashboard for cross-links, reports, compact delivery health states, filter search, date presets, real KPI cards and daily bars; focus-visible accessibility, Dari/Pashto/English and RTL, 1150/760/560/375px media queries, reduced-motion skeletons, and scoped CSS only imported into the persistent clinic shell.

### Changed paths

- `packages/ui-web/src/clinic-ops-bridge-model.ts` — pure role/link/period/stats utility.
- `packages/ui-web/src/clinic-ops-bridge.tsx` — shared translated clinic shortcut strip.
- `packages/ui-web/src/phase06.tsx` — calendar/queue shortcuts, truthful booking policy and icons.
- `packages/ui-web/src/phase15.tsx` — delivery monitoring, search and diagnostic states.
- `packages/ui-web/src/phase18.tsx` — report request scoping, date presets, bars, safe CSV and real summary UI.
- `apps/clinic-web/app/clinic/clinic-cross-workspaces.css` and `layout.tsx` — clinic-only responsive styles.
- `tests/clinic-phase-14-cross-workspaces-validation.test.mjs` — data/permissions/privacy guards.
- This acceptance record.

### Manual acceptance (not run)

1. As owner with an active clinic, open Calendar → Queue → Requests → Delivery → Reports → Finance. Links all retain `?clinic=` and the persistent header/sidebar remains visible without full-page loading.
2. As receptionist, no shortcut to Report/Delivery; as cashier, report and finance are available but scheduling/booking shortcuts are not. Call restricted endpoints directly and confirm server 403.
3. In the clinic calendar choose a date and verify the day deep link from queue, along with round-trip links, use the same Gregorian day. Booking conflict checks remain server authoritative.
4. In Notifications, create synthetic test booking events with local email service configured and observe real queued→sent, failed or skipped statuses. Confirm exact event type, attempts and timestamps, and that no names, emails, phones, diagnoses or treatment notes appear.
5. Disable SMTP in a development environment and confirm UI shows email-unconfigured warning; SMS and push remain explicitly unavailable. No fake delivered confirmations.
6. Search/filter events and page >10, switch to another clinic while a response is pending; no previous-clinic results remain. Confirm view refreshes after 45 seconds or upon tab focus.
7. Reports preset Last 7 Days, This Month, Last Month across year boundary and Last 30 Days. Draft changes do not fetch, mark as changed, or allow export until Apply. Invalid 2026-02-30, reversed dates and ranges >366 days block Apply.
8. Verify report dates are interpreted using Asia/Kabul, and that the authorized private API response matches all displayed counts; empty ranges show zero, not demonstration totals.
9. Verify completion percentage comes strictly from reported completed/total; daily bars reflect real per-day counts and open the same selected calendar date.
10. Verify receivable totals are not conflated with bank receipts or credits; PDF/CSV contain only aggregate counts. Try values that resemble spreadsheet formulas and confirm Excel does not execute them.
11. Switch two authorized clinic URLs while loading and exporting. Nothing from the former clinic may render or export in the new clinic.
12. Test English/Dari/Pashto, RTL, keyboard, Tab focus, 320/375/560/760/1440px, high text scaling and reduced-motion settings.
13. Regression-check Phase 13 staff/settings, clinic expenses, patient web, admin web, mobile Expo and existing booking request/notification safety tests.

### Release gates
GitHub CI must pass on the **exact current PR head SHA** for test, TypeScript, web production builds, Expo bundles and PostgreSQL HTTP integration before merge. Browser/manual validation remains pending, and PH19 clinic-pilot production signoff remains **NO-GO**.

After a verified merge to main, only the standard PowerShell pull is required:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

**Next:** Clinic Improvement Phase 15 — Operational QA, Accessibility, Data Integrity and Release Hardening.
