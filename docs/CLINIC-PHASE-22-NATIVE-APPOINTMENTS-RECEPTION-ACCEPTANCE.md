# DandanLink — Clinic Mobile Improvement Phase 22
## Native Appointments & Reception (Expo SDK 57)

**Scope:** Fully native, authenticated appointments and reception for synthetic-clinic testing. The existing independent PH19 healthcare pilot release gate remains unchanged: protected clinical/financial writes are blocked in production until all verified human signoffs are recorded. Mobile cannot override it.

### Implemented

The Clinic / Doctor mobile workspace now contains a dedicated **Appointments** bottom-navigation tab. It is visible to active clinic owners, managers, dentists, receptionists, and assistants. Cashiers see no appointment tab. Phase 21 dashboard quick actions for **Today's queue** and **Appointments** navigate to this native tab instead of sending the user to the clinic website.

#### Native daily reception and calendar
- **Today's queue**, with date navigation; uses `GET /v1/appointments/clinics/:clinicId/queue?date=YYYY-MM-DD`, which derives server-side access, dentist scope, and patient-data redaction.
- **Calendar day/week**, with language-appropriate week start (Saturday for Dari/Pashto, Monday for English), using `GET /v1/appointments/clinics/:clinicId/calendar?from=...&to=...`.
- Today's status counts, time badges, service, assigned dentist, patient preferred name, and clear appointment status colors. Times/day boundaries always use `Asia/Kabul`, never the handset's timezone.
- Tapping an item re-fetches its current **authorized** details from `GET .../appointments/:appointmentId` before presenting changes. Full chart and payment data, phone numbers, administrative notes, and unneeded family details are not retained in the native appointment view model.
- Loading, empty, forbidden, invalid JSON, offline, refresh, conflict, and partial availability states are handled without unmounting the persistent bottom nav.

#### New appointment booking
- Authorized owner, manager, receptionist or dentist can choose an **existing active clinic patient** via server-side bounded `/patients/search` (no fake person creation).
- Fetch real **active services, eligible clinician members and chairs** via `/catalog`, respecting dentist's own membership.
- Pick a real date up to 365 days in the future and an actual server-generated 15-minute slot from `/slots`. Start time and chair/resource are selected from this preview, not typed arbitrarily.
- Choose staff, walk-in, or telephone booking source. An explicit confirmation dialog triggers the existing guarded **POST `/appointments`** endpoint.
- Client sends an idempotency key. Existing PostgreSQL slot-exclusion/locks, subscription checks, role/clinic access, patient activity and PH19 production write gate remain the source of truth.
- On a 409 or an uncertain timeout the app does **not automatically resubmit**. Users must refresh availability and verify appointments. A same-payload explicit retry uses the same idempotency key while the screen remains mounted.

#### Status transitions and rescheduling
- Reception/owner/manager can check in a confirmed patient, mark an eligible no-show, or cancel with a required 10–300 character administrative reason. For checked-in patients, authorized staff can cancel where backend permits.
- Authorized clinicians can start and complete treatment only for their server-authorized appointment. A client cannot grant clinician privilege to an unverified role, and server appointment access is always authoritative.
- Confirmed appointments can be rescheduled through real live slot preview with the original service and valid dentist, explicit 10–300 character reason, backend revision and idempotency key. Service price/duration snapshot is retained by the server.
- Cancel, no-show, status updates, booking and rescheduling all require explicit confirmation. No silent patient actions, no automatic retries.

#### Reliability and privacy
- All operations reuse the existing clinic Bearer token and bounded 12-second JSON transport. Read requests have AbortController cleanup; switching selected clinic or signing out unmounts and discards prior clinic state.
- The screen removes patient and appointment data when the app is backgrounded, and refreshes on return. No booking or patient information is put into AsyncStorage, SecureStore, third-party analytics, logs or share URLs.
- Existing Phase 20 clinic license/doctor onboarding, Phase 21 dashboard, patient app and clinic web remain in place.
- All text is available in English, Dari and Pashto with distinct native status colors and access controls.
- No schema changes, migrations or new dependencies in Phase 22.

### Pull/run (PowerShell)

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

In a second terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Use **Expo Go SDK 57**, scan the QR, select **Clinic / Doctor**, sign in to an **email-verified** clinic account, then open **Appointments**. The app needs the same reachable `EXPO_PUBLIC_API_URL` you configured previously. No new `pnpm install` or `pnpm db:migrate` is necessary for Phase 22 if Phase 20 was already migrated.

### Manual acceptance — synthetic clinics and patients only

| ID | Verification | Engineering / device |
| --- | --- | --- |
| C22-01 | Role-aware tab present for owner/manager/dentist/receptionist/assistant, absent for cashier | Contract tests / device pending |
| C22-02 | Today queue and Sat/Mon week calendar reflect existing authorized clinic data | Unit/contract / device pending |
| C22-03 | Dentist sees only assigned appointments; assistant cannot book/status change; cashier cannot retrieve queue | Existing backend + UI guards / role UAT pending |
| C22-04 | Patient lookup returns active registered clinic patients; 2-character minimum, no phone/contact stored in UI | Contract tests / device pending |
| C22-05 | Active service, permitted dentist and available chair/time required; 409 double-booking conflicts refresh, never silently retry | Existing backend + UI / PostgreSQL staging pending |
| C22-06 | Owner/reception confirms check-in, no-show with reason, cancellation with reason and scheduled dentist treatment transition | Backend guards + explicit confirmations / staging pending |
| C22-07 | Reschedule only confirmed appointments; 10–300 char reason, revision conflict and idempotency; no slot drift | Backend guards + UI tests / staging pending |
| C22-08 | Network and token failure, airplane mode, clinic switch mid-load, app background/reopen; no prior tenant data or silent write | Source regression / device pending |
| C22-09 | EN/Dari/Pashto RTL, small-phone 320/360/414 px tap targets, accessibility and network skeletons | Manual device pending |
| C22-10 | Production real-patient clinical data remains NO-GO until PH19 independent approvals | BLOCKED – HUMAN |

### Phase 23 next

Native patient directory with verified role boundaries, authorized patient details, privacy-safe profile history, no disclosure of unauthorized clinical/financial information, and controlled handling of sensitive patient workflows. Phase 22 does not claim full patient record/clinical chart or finance mutation workflows.
