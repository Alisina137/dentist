# PH04 — Services, Chairs, Clinic Hours and Availability Foundation

Specification: DandanLink Product Specification v1 / F04, C26, C27, C31, BR-SLOT-01 and AC04. This phase is merged **after** PH05 by user request. The migration retains its normal order (0004 before 0005 on fresh databases, additive on databases where 0005 is already applied).

## Product surfaces — real routes

| Page | Route | Tabs/actions | Access |
| --- | --- | --- | --- |
| Services & Pricing | `/clinic/services` | Service catalog, version history, create/edit, price/duration/buffer/category, active status, chair requirement, prepared public-booking eligibility | Owner/Manager edit; Dentist/Receptionist read |
| Chairs & Rooms | `/clinic/resources` | Active/inactive chairs and rooms, clinic-unique internal code, equipment, edit, safe deactivate and chair-shift link | Owner/Manager edit; Dentist/Receptionist read |
| Hours & Holidays | `/clinic/settings/hours` | Clinic weekly hours, Dentist shifts, Chair schedules, Holidays/Exceptions, Availability preview — five **working** tabs | Owner/Manager edit; Dentist/Receptionist read preview |
| Clinic Dashboard | `/clinic` / `/clinic/onboarding` | Operational checklist shows real completeness of service, chair, operating hours and dentist shifts, with working navigation links | Clinic Owner |

All three operations routes share a consistent mobile-responsive header, reusable card scale and aligned primary actions. The existing Staff sidebar groups workspace vs operations vs settings; buttons have icon + readable label, current route highlight, focus outline and RTL-safe layout. The owner sidebar also exposes completed phases. Locales: Dari default, Pashto, English; Saturday-first calendar and explicit Gregorian date picker; times are stored as wall-clock minutes within Asia/Kabul and translated to UTC for previews.

## API contract

All endpoints are behind current authenticated, active clinic membership and tenant scope:

`GET /v1/operations/clinics/:clinicId/summary`

`GET|POST /v1/operations/clinics/:clinicId/services`
`PATCH /v1/operations/clinics/:clinicId/services/:serviceId`
`GET /v1/operations/clinics/:clinicId/services/:serviceId/versions`

`GET|POST /v1/operations/clinics/:clinicId/resources`
`PATCH /v1/operations/clinics/:clinicId/resources/:resourceId`

`GET /v1/operations/clinics/:clinicId/hours`
`PUT /v1/operations/clinics/:clinicId/hours/clinic`
`PUT /v1/operations/clinics/:clinicId/hours/providers/:membershipId`
`PUT|DELETE /v1/operations/clinics/:clinicId/hours/resources/:resourceId`

`POST /v1/operations/clinics/:clinicId/exceptions`
`DELETE /v1/operations/clinics/:clinicId/exceptions/:exceptionId`

`GET /v1/operations/clinics/:clinicId/availability/preview?date=YYYY-MM-DD&serviceId=...&providerId=...&resourceId=...`

All writes validate body, tenant and role server-side and create audit events. Service versions use immutable snapshots so later pricing cannot modify old versions or future invoice snapshots. Update requires current version. Resource change requires current revision; active scheduled chair cannot be deactivated until its explicit resource schedule is cleared. Weekly save requires all seven days (Saturday=0 through Friday=6), with per-day expected revisions; concurrent stale edits return 409. Time windows, breaks and date exceptions are validated for overlap and malformed input. Exceptions are serialized per clinic and cannot overlap existing ranges.

### Operations and subscription policy

Operating writes require clinic owner/manager and block suspended, cancelled, and expired subscription states. Initial draft-owner setup is allowed before the trial starts; branch limit is checked from the selected subscription plan. Dentist shifts require a **current active dentist or clinician-enabled membership**; arbitrary users cannot be assigned. Existing staff seat limits from PH03 remain enforced on invitations. All resources belong to a single clinic (branch creation is not implemented in PH04). Resource creation has a 50-resource safety ceiling; no fictional paid chair entitlement is assumed from the current plan schema.

### Real availability engine boundaries

Availability is computed solely from:
- active service duration + preparation buffer, chair requirement and AFN price;
- clinic weekday opening range and breaks;
- current active dentist's saved shift and breaks;
- current active chair's optional saved hours/breaks (when no specific resource hours exist, the chair inherits clinic hours);
- nonoverlapping clinic closures/special-hours exceptions.

Day-of-week is Saturday-first. Slot interval is 15 minutes; each candidate's complete service and buffer must fit all active ranges and avoid all breaks. Slot timestamps are converted through the **Asia/Kabul IANA timezone**, not the host/browser timezone. The API returns previewOnly=true, bookable=false, appointmentsImplemented=false, never a reservation or held appointment.

Public appointments are NOT enabled. PH06 adds staff-booking, resource overlap constraints and recorded appointments; PH12 verifies/publicizes clinicians; PH15 enables eligible public online booking. Existing confirmed bookings will require explicit impact management before future schedule changes; no such bookings exist in PH04.

## AC04 tests and evidence

`tests/phase04-validation.test.mjs` checks malformed weeks, overlapping breaks, date exception ranges, Kabul time conversion and visible role/route/mobile styling contracts.
`tests/phase04-integration.mjs` runs through real PostgreSQL with owner, dentist, manager and receptionist:
1. Clinic plan + owner MFA, staff seats, duplicate service/resource errors and role restrictions.
2. Versioned consultation 30 min, AFN pricing update and immutable historic version.
3. Active Chair A, clinic Saturday 09:00–12:00, dentist Saturday 09:00–12:00, resource hours.
4. Preview real Saturday candidate slots, 09:00 Kabul = 04:30 UTC, no overrun.
5. Reject overlapping breaks and stale calendar versions; saved 10:00–10:30 break removes intersecting slots.
6. Closure disables slots; overlapping exception is rejected; special hours constrain candidates.
7. Scheduled chair cannot deactivate; clearing chair shifts permits deactivation; no active chair means no candidate slots.
8. Cross-clinic identity denial and receptionist write denial.

GitHub Actions also runs all PH01–PH03/PH05 tests, typechecking, Next.js production builds and Expo Android bundle. Browser/phone/manual accessibility, real-world time zone and Afghani-language review remain external acceptance work.

## After merge (PowerShell)

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open clinic management on http://localhost:3001 and navigate to Services, Chairs & Rooms or Hours & Holidays. Admin remains on port 3000 and the patient's Expo Go mobile interface remains on `pnpm dev:mobile`. Neither patient booking nor public verification is implied by Phase 4.
