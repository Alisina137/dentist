# PH06 — Internal Appointment Calendar, Booking and Patient Queue

Product specification: DandanLink v1, **F06**, **C03–C05**, **C37**, rules **BR-SLOT-01–03** and **BR-APT-01–05**, acceptance **AC06**. PH04 and PH05 are prerequisites and remain unchanged in their own data boundaries. No public bookings or medical treatment notes are claimed.

## Actual delivered clinic screens

| Route | User flows and shipped tabs | Staff visibility |
| --- | --- | --- |
| `/clinic/appointments` | **Calendar** (default) and **Queue**; Day/Week/Month date navigation, Saturday-first week, real appointment density, dentist/chair/status filters, new booking, click to details, mobile agenda | Owner, manager, reception, dentist (own appointments), assistant (limited identifiers) |
| `/clinic/appointments/new` | Four-step booking: select/search/add clinic patient, service/provider, date/compatible chair and candidate slot, final confirmation; source staff/phone/walk-in; administrative note only; duplicate candidate handling; live concurrency retry suggestions | Owner, manager, receptionist; dentist schedules **self only** |
| `/clinic/appointments/:appointmentId` | Patient, procedure & price snapshot, clinic/provider/chair, status, time in Kabul, chronological event timeline with staff authors; reschedule without losing original on conflict; status actions by role; linked patient profile | Authorized staff; dentists own cases only |
| `/clinic/appointments/queue` | Real **Expected / Arrived / In Treatment / Complete** Kanban with today's local date, clinician filtering, check-in, start care, complete, no-show and cancellation paths | Reception/owner/manager check-in and no-show; assigned dentist or clinician-enabled owner/manager start/complete; assistant read-only |

The owner dashboard has live today/arrived/in-treatment/completed counters and working appointments/queue/new links. The patient record shows real appointment history and preselects the patient in the booking wizard. Clinical/chart and billing tabs remain hidden until PH07–PH10. **Booking Requests** remains hidden until PH15.

Styling is applied during the phase: consistent headings, compact grouped role menus, status badges, calendar density, progress indicator, sticky summary, modal actions, input validation, empty/loading/error/retry states and responsive 320px+/tablet/desktop layout. Dari is default RTL; Pashto RTL; English LTR. UI date picker is explicitly labeled **Gregorian** so a Solar Hijri preference never changes the API date interpretation. All stored times use the IANA `Asia/Kabul` timezone. Keyboard navigation, visual focus and reduced-motion preferences are supported; manual accessibility testing is still required.

## Database and collision safety

Migration `packages/db/migrations/0006_appointments_queue.sql`:
- `clinic_appointments` holds explicit clinic/patient/service/provider/chair IDs, status/source, start/end in UTC, service version/name/duration/buffer/estimated AFN **snapshots**, administrative-only note and revision. No DandanLink patient account required.
- **Two independent PostgreSQL GiST exclusion constraints** block overlapping clinic provider reservations and overlapping clinic chair reservations for confirmed/arrived/in-treatment/completed appointments. Their time ranges are half-open `[start,end)`, so consecutive bookings may touch endpoints.
- `clinic_appointment_events` is the immutable timeline of create, reschedule and status transitions. Original time/status and optional reason survive subsequent changes; actor IDs are audit-tracked.
- `clinic_appointment_actions` stores actor+clinic+key+request digest, enforcing idempotent booking/status/reschedule retries with a unique key. Changed data with an already used key produces 409, not a second action.
- Clinic-level row locks serialize booking and schedule changes. Final resource compatibility/clinic hours/doctor shift/duration/breaks/holiday/existing reservations are checked again **inside the booking transaction**, then enforced independently by database exclusion constraints. A conflicting booking returns 409 and up to three genuinely available alternatives.
- Cancelling or no-show releases a time from active reservations. Completed appointments retain historical resource occupancy and cannot be silently returned to confirmed. Queued clinical status is not a signed encounter.
- Scheduled chair/service deactivation, hours/shift changes, holiday closures and patient archival are rejected with explicit conflict if they would invalidate a future confirmed/arrived/in-treatment booking. The clinic must explicitly cancel/reschedule the affected appointment first. Price updates never rewrite previous estimate snapshots.

## Status transitions and authorization

| Starting state | Permitted next states | Who may perform |
| --- | --- | --- |
| Confirmed | Arrived, Cancelled, No-show | Owner/Manager/Receptionist; arrival only on booked day and no-show only after scheduled start |
| Arrived | In Treatment, Cancelled | Assigned dentist/clinician-enabled owner or manager starts; reception/owner/manager may cancel |
| In Treatment | Completed | Assigned dentist/clinician-enabled owner or manager |
| Completed / Cancelled / No-show | Terminal | No return to earlier state without future explicit amendment workflow |

All state mutations require a valid action key and optimistic revision check, a current active membership and writable subscription. Cancel/no-show/reschedule require recorded reasons; access checks occur in API and database scope, not client controls. Assistant views are redacted (no phone/admin note). Dentists cannot see or mutate other dentists' appointments. Platform admins have no clinic appointment access. Patient histories remain tenant-scoped and unavailable to unlinked public identities.

## Operational API

All prefixed `/v1/appointments/clinics/:clinicId`:
- GET `/catalog`, `/patients/search?q=...`, `/patients/:patientId/appointments`, `/overview`.
- GET `/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&providerId=...&resourceId=...&status=...` (at most 35 days), `/queue?date=YYYY-MM-DD`, `/slots?date=...&serviceId=...&providerId=...&resourceId=...`. Reschedule slot fetch can supply a clinic-local `excludeAppointmentId` for the original booking.
- POST `/appointments` with patient/service/provider/resource/date/15-min start/source/idempotency key.
- GET `/appointments/:appointmentId` with event history.
- POST `/appointments/:appointmentId/reschedule` with new target + reason/current revision/action key (atomic replacement).
- POST `/appointments/:appointmentId/status` with valid state, revision, action key and required reason.
- Phase04 `GET /v1/operations/clinics/:id/availability/preview` now excludes occupied provider and chair slots. It remains explicitly **not public bookable**.

## AC06 verification

GitHub Actions executes `pnpm test`, TypeScript, production builds, Expo Android bundle, PH01–PH05 PostgreSQL integration and `tests/phase06-integration.mjs`. The PH06 test covers:
- Patient/clinician/resource/clinic relationships, clinic-local access and required plan.
- Two **concurrent API writes to one real slot**: exactly one success and one conflict.
- Cross-provider chair conflicts, independent chair capacity and idempotent create/replay.
- Immutable fee snapshot after service repricing.
- Atomic reschedule; failed replacement leaves previous reservation intact; history preserves original time.
- Hours/holiday/resource/service and patient archival safeguards for upcoming bookings.
- No premature no-show, no invalid completed→cancelled state, no cross-provider treatment.
- Reception check-in, clinician treatment-start/completion and terminal no-show after elapsed time, using a CI-only PostgreSQL clock fixture rather than a production bypass.
- Functional routes, localization, navigation, responsive CSS and safe absence of PH15 request tabs.

**Not verified automatically:** human RTL visual QA on actual devices, browser keyboard/ARIA end-to-end, patient retention/legal compliance and notification delivery. Outbox rows contain only safe IDs; no SMTP/SMS/provider is implied or sent in PH06. Real patient data is prohibited until PH19 privacy/security gate, especially while local email verification is disabled.

## Running locally after merge

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Clinic: `http://localhost:3001/clinic/appointments`. Admin: port 3000. API: port 4000. Expo patient app remains `pnpm dev:mobile`, without public appointments in this phase.

**Suggested demo:** add a 30-minute consultation, Chair A and Saturday 09:00–12:00 clinic/doctor shifts (PH04). Create a fake clinic patient (PH05), then Book → Calendar → Detail → Queue. Saturday booking creates a real confirmed appointment, two simultaneous requests for the same resource conflict, and a **same-day** appointment can be checked in and progressed by authorized roles. No fake charting or public marketplace claims.
