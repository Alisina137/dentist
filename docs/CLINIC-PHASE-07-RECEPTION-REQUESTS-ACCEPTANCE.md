# DandanLink — Clinic Phase 07: Reception and Online Booking Requests

**Scope:** authenticated clinic receptionist/owner/manager/dentist request workspace and receptionist queue only. Existing staff roles, clinic permissions, patient privacy, approval rules and appointment booking flow remain server-authoritative.

## Implemented

- **Functional reception inbox** with genuinely pending/processed clinic online booking requests, custom search (patient name/service), newest vs upcoming-appointment sort, truthful result counts, **five requests per page**, manual refresh and existing 45-second visibility-aware refresh. No new client-side PHI storage.
- **Modern action-focused request cards**, clinic timezone/appointment timestamps and direct appointment links; shortcuts to appointment calendar, today's queue and appointment registration.
- **Explicit accept/reject confirmation dialog** with keyboard Escape, busy-state protection, real server action, real optimistic-concurrency revision, and a minimum 10-character reason for rejection. A rejection never fires without the required reason. After successful action the list is reloaded from the server and a localized success notice appears.
- **Conflict recovery and safe error disclosure.** HTTP 409 REQUEST_ALREADY_PROCESSED triggers a fresh list instead of keeping a stale click target. Network, authorization and unknown backend messages are mapped to safe localized text rather than showing arbitrary server strings or wiping existing completed actions.
- **Honest bounded lists.** Booking endpoint currently returns at most the latest 100 for a given pending/processed state, so the UI describes this as a bounded recent window and warns when the cap is hit. It never claims to show the all-time count.
- **Dentist scope security fix:** apply provider membership filtering in the SQL `WHERE` **before** the 100-record `LIMIT`, so a clinic with many other-dentist requests cannot hide requests legitimately assigned to this dentist. Retains existing post-query defense, membership authorization, transactional schedule lock, availability checks, revision conflict handling and server event/notification outbox.
- **Isolated identity verification:** record-link review is behind a distinct expandable section and is fetched only while opened. Its existing in-person verification confirmation, patient record selection, clinician restriction, per-document approval/revocation and audit-sensitive permissions remain intact. Booking decisions are never identity release actions.
- **Better daily queue workflow:** search locally by clinic patient name/number/service, stage filters (All, Expected, Arrived, In treatment, Complete), a link to online booking requests and walk-in registration, plus cancellation with the existing 10-character reason dialog, concurrency revision and backend authorization. New controls are explicitly limited by existing clinic role checks.
- **UI/accessibility:** Scalable blue/slate premium cards, accessible keyboard controls, confirmations, status color semantics, mobile 375px and smaller, full RTL Dari/Pashto localization and English, reduced motion and clinic-only CSS. Existing Next persistent sidebar/header remain mounted during page loading; patient/public/admin/print/medical chart styles are untouched.

## Files changed

- `apps/api/src/patient-booking-router.ts` — server-side dentist filtering before `LIMIT 100`, explicit bounded-result marker.
- `packages/ui-web/src/phase15.tsx` — role-specific reception inbox, live list, pagination, review dialogs and separated identity verification.
- `packages/ui-web/src/phase06.tsx` — reception queue search/status filtering, valid role shortcuts and cancellation flow.
- `apps/clinic-web/app/clinic/clinic-reception.css` and `layout.tsx` — isolated responsive styling loaded after earlier clinic phases.
- `tests/clinic-phase-07-reception-validation.test.mjs` — data truthfulness, access, workflow, localization and responsive regression checks.

## Manual browser/device acceptance (NOT RUN)

| ID | Role/scenario | Expected result | Status |
| --- | --- | --- | --- |
| C7-01 | Owner 1440px with >5 pending requests | Five requests per page with correct server-derived status; Next/Previous function | NOT RUN |
| C7-02 | Receptionist 375px search/sort pending | Matching patient/service results only; sort changes order, search resets page | NOT RUN |
| C7-03 | Dentist assigned own requests among >100 other-provider requests | Own requests visible due to server SQL filtering before limit; no access to others | NOT RUN |
| C7-04 | Receptionist accepts request | Confirmation dialog; server checks availability and revision; change visible in processed list | NOT RUN |
| C7-05 | Receptionist rejects without valid reason | Rejection disabled; no request sent to server | NOT RUN |
| C7-06 | Receptionist rejects with >=10 characters | Confirmed rejection persists to backend, notification queued according to consent | NOT RUN |
| C7-07 | Two receptionists decide same request concurrently | Second gets localized conflict and list refresh; no duplicate decision | NOT RUN |
| C7-08 | Owner views 100+ requests | Explicit latest-100 limitation warning, never an all-time count claim | NOT RUN |
| C7-09 | Receptionist switches identity verification panel | Private record-link requests loaded only on demand, separate from booking decisions | NOT RUN |
| C7-10 | Staff without clinical authorization attempts record release | No unauthorized release button or backend data access | NOT RUN |
| C7-11 | Receptionist queue with 4 stages | Search by patient number/name/service, status toggles accurate, view links open existing detail | NOT RUN |
| C7-12 | Receptionist cancels confirmed arrival from queue | Confirmation requires reason, audit and backend revision; queue updates only after success | NOT RUN |
| C7-13 | Assistant/cashier tries booking-request URL | Existing server/clinic role checks block unauthorized access | NOT RUN |
| C7-14 | Slow/offline network, click Refresh | Sidebar stays stable, localized loading and safe retry/error with no stale cross-clinic records | NOT RUN |
| C7-15 | RTL Dari/Pashto, 320–375px + 200% text | Cards, buttons and confirmation dialog remain operable; no overflow or flipped medical charts | NOT RUN |
| C7-16 | Keyboard/reader/reduced motion | Tab state, focus, Escape on dialog, success/error announcements, no mandatory animations | NOT RUN |
| C7-17 | Staff switch clinic A→B | No patient or booking details leak between clinics; authorized backend tenant checks still apply | NOT RUN |

## Quality gate and release posture

Require GitHub CI **pnpm test, pnpm typecheck, pnpm build, Expo Android/iOS JS exports and PostgreSQL integration** before merging to `main`. Manual browser/physical-device acceptance is **not** replaced by source tests. PH19 patient privacy, health security, clinical/legal and operational pilot gate remains **NO-GO** until independently approved.

After merge, update the local project with:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

For local clinic UI testing, run `pnpm dev:api` and `pnpm dev:clinic` from `C:\projects\dentist` in separate PowerShell terminals. No database migration, package installation or new environment variable is required.

**Next:** Clinic Phase 08 — Patient Directory and Reception Registration Improvements.
