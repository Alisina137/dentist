# DandanLink — Clinic Phase 04: Responsive UX, RTL and Accessible Feedback

**Status:** Code and automated regression gates are part of this phase. Physical/browser acceptance remains **NOT RUN** until tested with real browser/device evidence.

## Implemented — functionally connected changes

1. **Localized shared state components** in `packages/ui-web/src/clinic-feedback.tsx` (exported as `@dandanlink/ui/clinic-feedback`).
   - `ClinicLoadingState` presents accessible, content-shaped rows/cards/forms instead of a plain loading string. Empty placeholders never depict fabricated clinic/patient records.
   - `ClinicFailureState` presents real retry actions where a page already had a retry callback, with an accessible alert.
   - `ClinicNoResults` is available for further clinic page upgrades (no invented data or prompts).
   - A single `useClinicFeedback` helper provides English, Dari and Pashto loading, retry, sign-in and error descriptions.
   - Known API errors such as stale revisions, unavailable booking slots, network failures, expired sessions, forbidden roles and invalid input map to usable localized messages. **Unexpected raw backend content is not displayed directly** in the generic new error panels.

2. **Retrofitted real clinic pages** rather than only a static mock:
   - Operations (services/resources/hours): localized, accessible card loading and retry.
   - Patient directory: row loading placeholders and translated retry state.
   - Appointment calendar/queue: row skeletons, localized unknown-error fallback while retaining specific existing business-rule messages.
   - Clinical visits/worklist: form-shaped skeletons and localized retry/sign-in; overview tab now marks its selected state.
   - Finance/invoicing: card loading placeholders, localized retry, no-data status announcement.

3. **Safer asynchronous page transitions:** Operations, Clinical and Finance request hooks now match snapshots to their exact requested path; Patient Directory and Appointments already did so. A response from a previous clinic, patient, encounter or invoice cannot be shown while the next route is loading, even in a render before a cleanup effect runs. In-flight completion after unmount is ignored. Backend authorization remains authoritative.

4. **Responsive clinic-only stylesheet** in `apps/clinic-web/app/clinic/clinic-ux.css`, loaded *after* existing clinic navigation and premium design styles. It includes:
   - Responsive grids at 1024, 680, and **375 px**, including single-column fallback for extremely narrow devices.
   - Scrollable appointment week/month and clinical/finance/patient tables, without making the entire viewport horizontally scroll.
   - Scrollable tab rows for clinic, appointment, clinical, finance and operational sub-navigation.
   - Keyboard-visible focus, touch-friendly buttons, logical RTL spacing, tabular numbers and bidirectional isolation for medical date/time/ID fields.
   - Height-constrained modals and sticky form footer controls so keyboard overlays do not hide critical actions.
   - Accessible 3-locale loading/retry/empty patterns, distinct success/warning/error color meaning and `prefers-reduced-motion`.
   - No global restyling of the public site, platform admin, patient UI, SVG dental charts or print receipts.

## Automated checks

`tests/clinic-phase-04-validation.test.mjs` verifies:
- Clinic-only CSS import scope; no global styles, iOS/Android or admin changes.
- Localized English, Dari, Pashto messages and safe error handling.
- Content-shaped placeholders, accessible alerts, retry semantics and correct icons.
- Operations, Patient, Appointments, Clinical and Finance real module wiring.
- Path/tenant-safe request snapshots for these five sensitive modules.
- 375px layout/RTL/keyboard focus and scrolling calendar/table/modal constraints.
- Existing persistent sidebar/header and permissions remain intact.

Full GitHub CI (tests, typecheck, build, Expo Android/iOS bundle and PostgreSQL HTTP integration) must pass before main merge.

## Required real-browser acceptance (not automated by GitHub)

| Case | Role, viewport, action | Expected outcome | Status |
| --- | --- | --- | --- |
| C4-01 | Owner 1440px, Overview → Patients → Appointments → Finance | Sidebar/header stable; only data region loads; no double navigation | NOT RUN |
| C4-02 | Receptionist 320px, Patients Directory search/add/edit | Filter/form inputs not clipped; valid save and server errors remain intelligible | NOT RUN |
| C4-03 | Dentist 360px, appointment week/month | Calendar scrolls within its own region; time column/numerals readable and RTL correct | NOT RUN |
| C4-04 | Receptionist 375px, appointment Queue, approve/cancel | Actions reachable; status/confirmation accurate after actual backend reply | NOT RUN |
| C4-05 | Owner 375px, Resources/Hours, form dialogs | All dialog actions usable when keyboard open; no lost edits/hidden Save | NOT RUN |
| C4-06 | Dentist 320px, Clinical worklist/visit | Correct patient encounter only; medical record security/audit intact; no chart mirroring | NOT RUN |
| C4-07 | Cashier 360px, Finance invoices/payment details | Tables scroll, totals are unchanged by visual theme and print receipts remain readable | NOT RUN |
| C4-08 | Guest/unverified account, stale session | Correct localized session error; no private clinic content ever shown | NOT RUN |
| C4-09 | Switch synthetic clinic A → B on slow network | No clinic A patient/financial/clinical/operational values shown in B for even one frame | NOT RUN |
| C4-10 | Disconnect/reconnect network in all five areas | Non-fabricated skeleton and accessible error/retry; no spinner stuck or silent failure | NOT RUN |
| C4-11 | English LTR at 200% text + keyboard navigation | Focus visible; selected tabs announced; no hidden Submit/Cancel or unusable table | NOT RUN |
| C4-12 | Dari RTL and Pashto RTL at 200% text | Readable scripts, no reversed medical dates/IDs, proper RTL labels and layout | NOT RUN |
| C4-13 | Reduced motion + screen reader | Loading is announced once per region; progress animations stopped; retry has spoken label | NOT RUN |
| C4-14 | Cross-role security with synthetic accounts | Roles remain server-authorized; CSS/route navigation cannot grant access | NOT RUN |

Do not mark any physical/browser result PASS without running the specified scenario. Use synthetic data only; avoid actual patient details or non-redacted screenshots in bug reports. A true healthcare pilot still requires independent security, privacy, accessibility, clinical and legal approvals under PH19; **NO-GO** remains until then.

## Pull and test locally

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

In a separate PowerShell terminal:

```powershell
cd C:\projects\dentist
pnpm dev:clinic
```

No additional dependencies, database migrations or environment variables are needed. **Next roadmap:** Clinic Phase 05 — Role-Specific Clinic Command Center.
