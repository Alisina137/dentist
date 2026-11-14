# PH15 — patient booking, record-link proof, notifications

Implementation scope: **patient website** + **clinic website** + existing Express/Postgres API.
Expo Go remains **native public discovery only until PH16**. This release is
for local testing and must not be used with real patient data without PH19
clinical, consent, retention, backup, incident-response and legal clearance.

## Setup

Run from `C:\projects\dentist`:

```powershell
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev:api
```

Start clinic and patient websites in separate terminals:

```powershell
pnpm dev:clinic
pnpm dev:patient:web
```

Clinic: http://localhost:3001
Patient website: http://localhost:3002
API health: http://localhost:4000/ready

`pnpm dev:api` also launches a dedicated public HTTPS API tunnel for Expo,
with Cloudflare preferred if installed to avoid conflicting with Expo's ngrok
tunnel. **Patient/clinic website authentication uses the local API origin**;
the mobile Expo app does not handle PH15 private booking sessions.

## Patient booking workflow

1. Only current independently reviewed/published clinics, eligible services
   and verified dentists appear. Select **Book appointment** from clinic
   or dentist detail; the 5-step wizard is service → live slot → authorized
   patient/family → review and explicit consent → receipt.
2. Patient must sign in with verified email and complete PH14 adult patient
   onboarding. For a child, an active guardian authorization must exist and the
   child must still be under 18 in Afghanistan time. Adult delegates require a
   separately verified accepted adult invitation.
3. The booking creates exactly one appointment on the **same** PH06
   `clinic_appointments` calendar. No reservation is fabricated. PH15 checks
   approved listing, active public service and version, provider affiliation,
   live hours/availability, notice window, advance horizon and consent.
4. Clinic `approvalMode=manual`: new request has `requested` status and
   does **not** block the chair/provider until a clinician/manager/receptionist
   explicitly accepts. Two requests may be for the same slot, but at most one
   can be accepted. The other receives a conflict instead of double-booking.
   Clinic `approvalMode=auto`: appointment is confirmed transactionally
   if slot still available.
5. Patient: `/appointments` → Upcoming / Past / Cancelled; detail shows
   clinic, time (Asia/Kabul), service, published fee, contact and status.
   Cancellation and rescheduling require the original optimistic revision,
   user ownership and clinic cancellation-hour policy snapshot. PH06's
   provider/chair exclusion constraints protect all actual allocations.
6. Failed network retries with the same idempotency key return the same
   booking. Reusing that key for another slot is a conflict. A repeated
   acceptance/rejection or stale cancellation/reschedule also conflicts.

## Clinic requests and record sharing

**Clinic:** `/clinic/appointments/requests?clinic=<clinicId>`
displays Pending / Processed online booking requests with role-specific
permissions, Accept / Reject action, conflict feedback, and record-link
verification queue. The same route is in the clinic sidebar and appointments
tabs. Notification delivery overview:
`/clinic/settings/notifications?clinic=<clinicId>`.

**Patient:** `/account/records` shows pending/approved/rejected/revoked clinic
record links and **only** individually released, signed encounter summaries
and issued receipts. A patient must explicitly request linking and provide a
clinic patient number; the number is **not identity proof**. Authorized clinic
staff must verify the matching patient in person and choose the exact clinic
patient ID before approving. Following link approval, an authorized clinician
must explicitly approve every summary/receipt separately. Unreleased
history, drafts, unsigned clinical encounters, private attachments and
unrelated patients are invisible. Either party may revoke authorized links;
the clinic can revoke individual releases. All decisions are audited.

**Important:** PH15 does not attempt name/email/phone matching of old clinic
records. Portal bookings use new clinic-local patient identities; repeat
bookings by the same authorized portal subject safely reuse only a matching
**portal-created** clinic identity. Records are not linked automatically.

## Notifications

The backend commits bookings independently of email availability, enqueues
notifications in PostgreSQL, and processes opted-in jobs through SMTP with
retry/backoff and recovery after worker restarts. Preferences default off
until the patient explicitly enables email booking/updates in PH14 account
preferences. Email only states an appointment changed and links to sign-in;
it contains no patient name, diagnosis, treatment details or appointment
time. Push and SMS are **not enabled** in PH15; their delivery status remains
reported as false. If SMTP is not configured, delivery remains pending and
bookings still work.

## Acceptance checks (automated + manual)

| Scenario | Expected |
| --- | --- |
| Public guest visits clinic | Real verified listing and live slots, no records or fake bookings |
| Unverified / unonboarded account | Cannot book |
| Two manual requests same clinician/chair slot | Both may queue; first acceptance confirms, second conflicts |
| Auto mode + single slot | One confirmed appointment, exclusion constraint rejects overlap |
| Duplicate POST with same key | Exactly one clinic appointment; replay returns same booking |
| Other patient's booking ID | 404; no details leaked |
| Minor turns 18 / adult not accepted | Cannot book as delegate |
| Reschedule collision/stale revision | Original appointment remains unchanged |
| Cancel past deadline | Clear conflict with original appointment intact |
| Provider unavailable or credential revoked | New booking blocked |
| Link requested by patient number only | No clinical records exposed |
| No face-to-face proof | Clinic cannot approve link |
| Approved link without individual release | Records list remains empty |
| Explicit release / withdraw | Only that signed/issued record is shown/removed |
| No SMTP or notifications opt-out | Booking succeeds; worker does not send private information |
| Email worker restart | Due processing lease eventually reclaimed |
| Clinic staff outside clinic | Denied |
| RTL Dari/Pashto and English | Layout, date, navigation, contrast and errors reviewed |

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and
`node tests/phase15-integration.mjs` against a seeded temporary
Postgres/API server. GitHub Actions runs these including previous PH01–PH14
regressions, Android Expo export and full web build.

### Production gates still required
Human in-person verification practices, document evidence retention,
local data-processing agreements, consent wording, pediatric legal review,
disaster recovery, SMTP sender trust, audit trail review, browser accessibility
and threat model, real devices and security penetration testing.
