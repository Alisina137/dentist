# DandanLink — project state

Product specification: DandanLink Product Specification v1.0, November 13 2026.
Workflow: Software Development Workflow V5.
GitHub: Alisina137/dentist.
User IDE folder: dentist (Windows local path not directly accessible).

## Current phase

PH01 — Identity, localization, and application shells.

Status: **IMPLEMENTED — VERIFICATION PENDING** until dependencies, database, browser and email/MFA integrations have been tested. GitHub source availability is not evidence of a passed build.

## Phase 01 scope in source

- Auth: Better Auth signup, email verification, login, password reset, sessions and rate limits.
- Authorization: administrative grant only via a trusted CLI; TOTP MFA enrollment/challenge enforced for admin; API 401 and 403.
- Shared API: structured errors, health/readiness, authenticated profile and preference endpoints; audit/outbox schema.
- Database: versioned PostgreSQL schema for auth, administrative membership, audit and outbox.
- Design: DandanLink Care UI, reusable layouts/forms/states, desktop and mobile width adaptations.
- Localization: Dari and Pashto RTL, English LTR; Solar Hijri and Gregorian display options; local and account preference persistence.
- Three distinct responsive web applications; no fictional dentist listings, clinical operations or payments.
- Test suite and run commands.

## Route and feature ownership

| Phase requirement | Routes and behavior |
| --- | --- |
| F01 — owner identity | /clinic/signup, /clinic/verify, /clinic/login, /clinic/reset-password |
| F01 — clinic shell | /clinic, restricted to verified nonplatform accounts |
| F01 — admin identity | /admin/login, /admin/2fa, /admin, secure grant + TOTP |
| F01 — public shell | / on patient web, /privacy, /terms |
| F01 — recoverability | /403, /offline, 404 in each web application |
| F01 — API | /api/auth/*, /v1/me, /v1/me/preferences, /v1/admin/home, /v1/clinic/home, /ready |

Deferred correctly: PH02 clinic creation/subscription, PH03 staff invitations, PH04 chairs/services, PH05 patient data, PH06 calendar, PH12 public provider listings, PH15 patient booking, PH16 native mobile parity.

## Verification limitations

The repository is remotely editable, but this execution environment has no network access to npm packages or local Windows IDE, so install/build/DB/auth/UI E2E cannot truthfully be marked as passed here. Run the checklist in docs/PH01-ACCEPTANCE.md. Backend/email/OTP need real validation and external configuration. Translators and legal advisers must review patient-facing clinical/legal language before production.

Do not use real patient records in PH01 or claim HIPAA/legal compliance. PH19 will require the production data protection, restore, retention, export and security release gates.

Next approved phase after PH01 verification: PH02 — clinic creation, subscriptions and manual verification.
