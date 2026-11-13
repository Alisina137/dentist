# Phase 02 — clinic onboarding, subscription plans and verification

## Scope
- Clinic: register (draft), select active versioned plan, safely store administrative evidence, submit for human verification, review status, edit permitted details, request manual subscription payment.
- Admin (TOTP protected): create new plan version, deactivate plan, review clinics, approve/request information/reject/suspend/reopen, read audit history, inspect private evidence, reconcile invoice references and activate/cancel billing.
- Public: active-plan prices shown on /pricing and /for-clinics, no checkout simulation.
- Dashboard: role-specific links and status (no clinical charts, scheduling or fake marketplace).

## Acceptance
- AC02-01 Owner creates clinic with validated fields and a real configured active plan. Failed validation preserves form.
- AC02-02 A second logged-in user cannot access owner clinic ID or upload/read its evidence.
- AC02-03 Admin routes reject anonymous and non-admin sessions; authorized administrator has verified MFA.
- AC02-04 Evidence restricted to PDF/PNG/JPEG, validated signature and 2 MiB maximum, never publicly served.
- AC02-05 Pending -> needs_info -> pending -> approved and approved -> suspended are correctly persisted with reviewer/time/reason.
- AC02-06 Plan versions preserve old subscription price and benefits; new versions affect only new customers until changed through explicit request.
- AC02-07 Initial plan trial has configured expiration; expired status does not erase clinic or billing history.
- AC02-08 Manual payment request never marks paid. Only administrator with reference confirmation can activate billing, and replay is denied.
- AC02-09 Billing and verification are independent; paid clinic may remain unverified or suspended.
- AC02-10 Navigations, forms and statuses are available on relevant routes and are localized Dari/Pashto/English, including RTL and mobile.
- AC02-11 Future staff/clinical/appointment destinations are not exposed as active UI.

## Recorded automated test
`tests/phase02-integration.mjs` runs against ephemeral PostgreSQL and the real API via GitHub Actions.
The test covers user authentication, admin MFA, plan setup, tenant isolation, upload, review transitions, payment confirmation and replay.
Typechecks, production web builds and test scripts also run in `.github/workflows/ci.yml`.

## Remaining external verification
Browser visual, screen-reader, actual telephone/email verification, production backups, field review of professional credential requirements, retention/legal review.
Do not use actual clinical patient data before PH19 privacy/security gate.
