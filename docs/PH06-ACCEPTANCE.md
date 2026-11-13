# PH06 — Internal Appointment Calendar, Booking and Arrival Queue

Product specification: DandanLink v1 — F06, C03–C05, C37; acceptance AC06; user journey J03.

## Delivered actual routes

- `/clinic/appointments` — authenticated, tenant-scoped Day/Week/Month calendar, provider/chair/status filters, density indicators, synchronized daily agenda, empty states and date navigation.
- `/clinic/appointments/new` — four-stage guided form: select an existing clinic patient, active service, assigned dentist, chair if needed, future Gregorian date, and server-previewed time; choose staff/walk-in/phone source and optional administrative note (no clinical content). Double-submit protection is enforced both in UI and server.
- `/clinic/appointments/:id` — private appointment summary, patient link, AFN price and duration snapshots, provider, chair, audit timeline, contextual role-specific status actions, reschedule and cancel with reason.
- `/clinic/appointments/queue` — real appointment arrival queue for a selected day: Expected, Arrived, In Treatment, Completed; check-in by front desk; treatment start/finish only by assigned clinician (or properly authorized clinician-enabled clinic owner/manager). Actions update the same stored appointment rows as calendar.
- Clinic sidebar adds **Appointments** above Patients for owner/manager/receptionist/dentist. Owner landing dashboard includes a direct link. **Requests** are intentionally hidden until PH15; no fake booking forms or public patient booking.

The locale controls already present in the clinic shell drive English LTR, Dari RTL default and Pashto RTL, including localized labels, clean breakpoint behavior, keyboard-accessible controls and Gregorian date input with Asia/Kabul time formatting. User input is never used to authorize roles.

## Data, integrity and security

`0006_appointments.sql` creates:
- `clinic_appointments` with tenant-protected patient, clinician, service and chair FK references, immutable service name/price/version/duration/buffer snapshots, schedule, administrative note, status, optimistic revision and actor/timestamps.
- **PostgreSQL btree_gist exclusion constraints** on provider and chair overlapping `tstzrange(start_at,end_at,'[)')` for Confirmed, Arrived and In Treatment appointments. Cancelled/No-show/Completed no longer reserve calendar resources. No race between two reception users can double-book a clinician or chair.
- `clinic_appointment_events`: append-only actor/reason/old and new schedule/status timeline.
- `clinic_appointment_idempotency`: clinic+actor+request-key+payload-digest, so an identical retried creation returns the original appointment, while key reuse for changed payload returns 409.

All HTTP endpoints are prefixed `/v1/appointments/clinics/:clinicId`: GET calendar/queue/summary, GET appointments/:id, POST appointments, PATCH appointments/:id/reschedule, PATCH appointments/:id/status, GET patients/search.

Every endpoint authenticates and verifies **active membership in the requested tenant**, including read. A dentist is restricted to their own appointments. A receptionist or non-clinical manager can check in, cancel or mark no-show but **cannot** start/complete treatment. Only assigned dentists or explicitly clinician-qualified managers/owners can progress clinical workflow states. No medical chart access or clinical note is granted in PH06. Writes require a valid subscription and block suspended clinics.

The booking service locks the clinic in a transaction, checks idempotency, validates patient/service/clinician/chair within the clinic, validates availability against PH04 clinic/dentist/chair schedules and exception rules, then writes appointment + event + outbox reference. DB exclusion constraints provide the final concurrent slot safety. Rescheduling swaps the row's reserved range atomically; conflicts roll back, preserving the original. Status transitions enforce **Confirmed → Arrived → In Treatment → Completed**, with eligible Confirmed → Cancelled/No-show and Arrived → Cancelled transitions only. Terminal states cannot be reopened. Cancellation/no-show requires reason ≥10 chars and stale revisions fail.

## AC06 automated evidence

`tests/phase06-integration.mjs` creates actual clinic, plan, owner, dentist(s), receptionist and patients on PostgreSQL. It tests:
- staff booking and idempotent replay, changed-payload key denial;
- same dentist / different chair and different dentist / same chair conflicts;
- two nonoverlapping slots;
- cross-clinic IDs denied and receptionist versus clinician authorization;
- atomic reschedule conflict rollback, successful move and stale revision rejection;
- check-in, clinical start/complete, cancellation, released slot reuse, no-show timing and illegal terminal transitions;
- time zone conversion Saturday 09:00 Kabul → 04:30 UTC;
- day calendar, queue, activity history and status summary reconciliation.
CI runs PH01–PH06 suites, tests, strict typechecking, Next.js production web builds and Expo Android export.

## Known phase boundaries and manual QA

PH07 adds real encounter documentation; PH08–09 dental chart/treatments; PH10 billing; PH12 public verified listing; PH15 patient booking and Requests. **Do not infer treatment notes from Completed appointment status.** PH06 is not an online patient booking gateway.

Manual browser test on 320px/desktop, keyboard/focus and RTL, accessibility check, time-zone edge cases, and qualified clinical privacy/security/retention/legal review remain necessary before real patient use. Development skip-email mode is never approved for actual healthcare records.

## Local setup

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Clinic: http://localhost:3001/clinic/appointments; admin: http://localhost:3000; API: 4000. Expo Go patient mobile remains `pnpm dev:mobile` and does not yet offer patient booking.
