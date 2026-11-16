# DandanLink — Clinic Phase 06: Appointment Calendar and Scheduling Improvements

**Scope:** authenticated clinic staff scheduling workspace only. Uses the existing secure appointment/queue/slot endpoints, database overlap protection, and backend role checks. No new permission, database migration, external package, payment flow or reminder promise.

## Changes delivered

1. **Four genuine views**: Day, Week, Month and **Agenda** (seven days from the selected date). Agenda lists the authorized patient, service, clinician, chair, time and status. Clicking an appointment uses the existing protected detail/transition/reschedule flow. Existing day/week/month/queue and booking wizard remain functional.
2. **Solar Hijri/Gregorian calendar correctness**: the selected user display calendar determines the month *boundaries* and month number, not merely the heading. The API still receives ISO Gregorian dates in the Kabul local calendar zone as required by the server. Week starts Saturday consistent with the prior clinic scheduler. The month view is a single real calendar month, so it respects the backend limit of 34 days maximum, including variable-length solar months.
3. **No misleading empty dates**: the calendar grid includes adjacent-month cells for geometry, but marks them as **not loaded**; it does not invent a zero appointment count for dates outside the fetched interval. Clicking one opens its Day view and loads the actual data.
4. **Shareable toolbar state**: the browser URL preserves the current date, mode, clinician, chair and status filters. On initial page load, valid URL state is restored. The clear-filters button resets only filters while keeping the date/view/clinic; appointment and queue links preserve the clinic selector.
5. **Reception date context**: Queue date and clinician filters can be shared as URL parameters, and the return-to-calendar button opens Day view on the same queue date. Existing clinical status transitions remain unchanged and server-authorized.
6. **Honest availability and record-count communication**: the calendar labels appointment counts from the API only, shows explicit API truncation warnings, and clarifies that open spaces on a schedule do **not** represent confirmed availability. The booking wizard still requests a live slot and backend reconciliation before creating appointments.
7. **Accessible premium presentation**: English, Dari, Pashto strings for the new agenda, filters, out-of-month behavior and warning. Full keyboard/active-view state, readable times with bidirectional isolation, reduced-motion, 1024/680/375px layouts, and mobile list cards. CSS imports only inside the authenticated clinic persistent shell; does not touch patient apps, public auth pages, platform administration, financial print pages or medically significant tooth chart colors.

## Code-level tests

`tests/clinic-phase-06-scheduling-validation.test.mjs` covers:
- Gregorian date validation including leap years, Sat–Fri weeks, day/week/month/agenda ranges and 7-day navigation;
- Real Solar Hijri month boundaries and adjacent-month nonzero disclosure;
- UI wiring for each view, real API rows, filters, tenant URL persistence and reset semantics;
- localized states, scoped styles, keyboard and small-screen rules;
- preservation of backend clinic tenancy and the <=34-day date window.

Required CI: `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS bundles and HTTP integration against PostgreSQL. This does not establish clinical or production approval.

## Manual browser/device acceptance — NOT RUN

| Case | Role, action | Expected outcome | Status |
| --- | --- | --- | --- |
| C6-01 | Owner or manager, day/week/month/agenda | Four real views; no invented rows, actual API status/visit links | NOT RUN |
| C6-02 | Receptionist, appointment created then refresh | Booking appears in correct Kabul-local time on calendar and queue | NOT RUN |
| C6-03 | Dentist, scoped to own schedule | Server filters still prevent access outside clinician scope | NOT RUN |
| C6-04 | Assistant, view appointment and queue | No unauthorized booking/create/status actions; link to detail remains protected | NOT RUN |
| C6-05 | Switch Dari/Pashto solar calendar on November 16, 2026 | Month spans true solar dates rather than November 1–30 Gregorian | NOT RUN |
| C6-06 | English Gregorian, navigate month prev/next | Current period moves by actual month boundaries; no 34-day API validation errors | NOT RUN |
| C6-07 | Neighboring gray month cells | No false zero appointment count; clicking fetches target Day view | NOT RUN |
| C6-08 | Select dentist/chair/status then share URL | Same authorized filtered results after opening shared URL; Clear retains date/view | NOT RUN |
| C6-09 | Queue with previous date and clinician, return Calendar | Same date opens in Day view; queue filter remains URL-shareable | NOT RUN |
| C6-10 | Scheduling under high volume (1500-row limit) | Honest truncation notice; no false claim to complete list | NOT RUN |
| C6-11 | Empty date on schedule clicked for new booking | Wizard checks real available slots and collision rules; blank cell is not guaranteed open | NOT RUN |
| C6-12 | 320/375px, 200% text, Dari/Pashto RTL | Toolbar and four views usable, agenda rows wrap without clipped actions | NOT RUN |
| C6-13 | Keyboard, screen reader and reduced motion | Active view announced; status and links reachable; animations reduced | NOT RUN |
| C6-14 | Switch clinic A→B during slow fetch/offline | Previous clinic data not visible, request can retry, sidebar remains persistent | NOT RUN |
| C6-15 | New booking and reschedule conflict in another session | Existing server-side overlap exclusion and idempotency still enforce safe booking | NOT RUN |

**Release posture:** PH19 pilot remains **NO-GO** until independent patient privacy, health security, clinical, legal, device, accessibility and operational acceptance.

## Pull & run after merge

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

To inspect the clinic pages locally, start `pnpm dev:api` in one terminal and `pnpm dev:clinic` in another terminal inside `C:\projects\dentist`. No migration, package installation or new environment variables required.

**Next:** Phase 07 — Reception and Online Appointment Request Workflow.
