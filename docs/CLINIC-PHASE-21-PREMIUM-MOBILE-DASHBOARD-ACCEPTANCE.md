# DandanLink — Clinic Mobile Phase 21
## Premium, Live, Role-Aware Clinic Dashboard (Expo SDK 57)

**Engineering preview complete; real-patient production remains NO-GO until independent PH19 approvals.** This phase replaces the original flat six-counter clinic mobile home with a structured, professional operations dashboard that only displays values actually returned by the existing protected API. No appointment/clinical/billing writes were introduced.

### Delivered

- **Premium home hierarchy.** Dark navy selected-clinic masthead with actual clinic review status and account role; clear authenticated/read-only notice; data freshness and retry strip; six actionable cards for the daily appointment and clinic setup signals; genuine server-operated setup checklist; today’s appointment queue; and role-aware quick actions. Compact 2-column cards, touch-friendly controls, accessible button labels, meaningful status coloring and stable bottom navigation.
- **Server truth, no demo values.** Appointment totals and status counters come from `GET /v1/appointments/clinics/:clinicId/overview`; today’s queue from `GET /v1/appointments/clinics/:clinicId/queue`; operational settings from `GET /v1/operations/clinics/:clinicId/summary`. The UI uses `—` instead of fabricated zero when a response is absent. Data is checked for ranges, counts, expected date, tenant/appointment scope, validation status, queue shape and consistent timestamps.
- **Safe personal-data minimization.** The queue preview contains at most six appointments, uses only authorized preferred patient name, scheduled time, provider name and status. It drops administrative notes, patient contact, family name, health records, payment information and raw server objects before handing data to the UI. Nothing is persisted to AsyncStorage or displayed from an unrelated clinic.
- **Least-privilege navigation.** Owner, manager, dentist, receptionist, assistant and cashier each see relevant actions. Cashiers never request/read appointment or operational summary endpoints; assistants never query operational configuration; dentists see only server-filtered own appointments. Buttons to advanced appointments, patients, operations and finance open the existing protected clinic web pages where role checks remain authoritative. Registration/team/account shortcuts take users to existing native tabs. The mobile experience never grants roles or bypasses verification.
- **Resilient refresh.** An independent 12-second timeout and AbortController per request (reusing the Phase 20 validated bearer transport); concurrent read-only requests that cannot block the other panels; errors/restricted responses distinguished from loading; manual retry, bounded freshness (2 minutes), Android lifecycle on-return refresh, and request cancellation when clinic, account, role, or screen changes. The persistent bottom nav remains visible during background requests.
- **Language and accessibility.** English, Dari and Pashto human-facing labels; RTL-aware hero and appointment rows; explicit touch targets; status semantics, browser deep-link disclosure, safe no-record and unauthorized states. Visual/device/screen-reader audit is still a human step.

### Operator workflow (disposable/synthetic clinic only)

1. From `C:\projects\dentist`, pull merged `main`. `pnpm db:migrate` is a safe check, but **no new migration was created for Phase 21**. Phase 20 document dependencies remain as previously installed.
2. Start the API (`pnpm dev:api`) in one PowerShell terminal; run `pnpm dev:mobile` in another. Use Expo Go SDK57 on Android. Open **Clinic / Doctor**, sign in with a *verified* clinic owner or invited staff account and choose a clinic with test configuration.
3. Open **Overview**. Compare daily counts and appointment entries with Clinic Web → Appointments → Queue for the **same clinic and Asia/Kabul day**. Check the operational setup checklist against Clinic Web → Services, Resources and Working Hours.
4. Use **Refresh dashboard** to retry. Test offline mode, an HTTP 403, expired bearer, invalid API JSON, switching between two clinics and resigning in as another staff user; no prior clinic data should remain visible. Confirm cashier has no patient data and dentist sees only their assigned appointments.
5. On a phone, verify 320, 360 and 414-point widths, screen-reader announcements, focus, navigation, Dari/Pashto RTL and airplane-mode return.
6. For advanced actions, set `EXPO_PUBLIC_CLINIC_WEB_URL` to a genuinely reachable clinic website if you want the secure web handoffs on the device. The web may require its own login. Without it the web routes are unavailable but the mobile read-only dashboard still works through the API.

### Acceptance matrix

| ID | Condition | Engineering / manual status |
| --- | --- | --- |
| C21-01 | Real appointment overview, today's queue, setup checklist all reflect live synthetic tenant data | Unit/contract tests; **device staging pending** |
| C21-02 | No fake counters when missing API data; partial response and 403 handled independently | CI + **manual pending** |
| C21-03 | Switching clinic, role, or account mid-load cancels and hides previous tenant; no cross-tenant queue | CI + **device pending** |
| C21-04 | Owner/manager, dentist, receptionist, assistant, cashier each see allowed endpoints and shortcuts | CI + **role witness pending** |
| C21-05 | No phone, administrative notes, full charts, financial details or account secrets in dashboard state | CI + **privacy review pending** |
| C21-06 | Network offline, broken ngrok tunnel, sleep/wake, time freshness and retry | Source/contract + **device pending** |
| C21-07 | Premium 320–414px, EN/Dari/Pashto RTL, keyboard/screen reader, touch target and stable nav | **manual pending** |
| C21-08 | Phase 20 native registration and doctor credentials still work | Regression CI + **device pending** |
| C21-09 | PH19 independent medical, legal, security, hosting/backup and operational release signoffs | **NO-GO: human evidence pending** |

### Next phase — Phase 22

Native appointment and reception workflows: verified calendar, queue handling, safe check-in and rescheduling with explicit confirmation, server-enforced roles, subscriptions, concurrency/idempotency and clinical restrictions. Phase 21 intentionally offers a **read-only** operational dashboard; it is not an authorization to schedule real patients or submit clinical data in production.
