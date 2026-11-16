# Stage I — Staff Appointments, Scheduling and Patient Records

**Status:** Implementation review for existing DandanLink scheduling and clinic patient registry. No new database tables or API contracts. Not a clinical release certification.

## Delivered improvements

- Appointment, calendar, queue, provider and search reads are now **bound to their actual request path**, preventing a stale response from a previously selected clinic/date/filter appearing during navigation. Existing server authorization remains mandatory.
- All date query parameters must represent **real Gregorian dates**. Booking deep links are additionally limited to today–365 days ahead in the clinic's Afghanistan calendar-day interpretation. Backend scheduling dates remain Gregorian ISO values.
- Staff availability selection is invalidated when slots are rechecked. Booking may advance to confirmation or submit only when the selected exact start/end/resource still appears in the current server-provided availability. Existing transactional server conflict, idempotency and subscription checks remain unchanged.
- Calendar and queue **display headings** honor the user's Solar Hijri/Gregorian preference. Date input and month navigation continue using Gregorian ISO dates, as required by HTML date fields/backend range queries.
- No-show queue area no longer renders as a meaningful section during a queue request failure.
- Patient history now has **All / Scheduled / Completed / Cancelled–No-show** filters, 5 visits per page, previous/next controls, reload, precise loading and failure treatment, and localized English/Dari/Pashto copy.
- Patient-visit fetches cancel on route and tenant changes; data is bound to clinic ID + patient ID and is not copied into persistent browser storage. A caution appears when the endpoint reaches its 150-row limit, so the UI never promises complete history.
- Responsive, accessible filter styling is added to the clinic stylesheet.

## Acceptance

1. Log in using test accounts with owner, dentist, receptionist and cashier roles. Make sure the current role's existing server-enforced permissions have not changed.
2. Switch between two clinics while the API is slow. Verify neither appointments nor patient records show a previous tenant's data, even momentarily.
3. On the calendar and queue, try invalid URLs (e.g. `?date=2026-02-30`), valid day values and multiple filters. Verify invalid values are ignored.
4. On patient details, create synthetic visits with confirmed/arrived/in treatment/completed/cancelled/no-show statuses. Verify the new filter chips and 5-row pages. Refresh and verify backend changes. Check with >150 synthetic records for the accurate result-window warning.
5. Start creating a staff appointment. Select a real slot, change the dentist/service/room/date, or click **Check availability**. Previously selected slot must not be bookable or confirmed unless a new live slot selection is made. Test a 409 race against a second staff member.
6. Toggle English/Dari/Pashto and Solar Hijri/Gregorian in clinic preferences; display date headings should change but the underlying booking ISO date should remain constant.
7. In airplane/offline mode, inspect each loader/error/retry; neither missing data nor stale cached data should appear as a valid patient or appointment.
8. Test at narrow viewport, large text and keyboard-only navigation. Confirm status, links and validation errors remain legible and navigable.

## Automated checks

Run `pnpm test`, `pnpm typecheck`, `pnpm build`. The added `tests/stage-i-appointments-patient-validation.test.mjs` covers important regression anchors. Full GitHub CI also runs Android bundling and PostgreSQL integration suites.

**Privacy:** No live patient data until PH19 operator and external approvals; all testing with authorized synthetic patient records. The UI is not a substitute for clinic, clinician, legal, MFA, subscription and server role checks.

**Local update:** `git -C C:\projects\dentist pull --ff-only origin main`.
