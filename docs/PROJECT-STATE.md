# DandanLink — project state

Product specification: DandanLink Product Specification v1.0, November 13 2026.
Workflow: Software Development Workflow V5.
GitHub: Alisina137/dentist.
User IDE folder: dentist (Windows local path not directly accessible).

## Current phase

PH01 — Identity, localization, and application shells.

Status: **IMPLEMENTED — VERIFICATION PENDING** for real-user browser/SMTP/device review. GitHub Actions passed frozen dependency install, Node tests, TypeScript, three production web builds, PostgreSQL migration, and HTTP authentication integration including email verification, password reset, session revocation, tenant/preference guards, trusted admin grant and real TOTP enrollment. These CI checks are actual recorded executions, not implementation claims.

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

The repository is remotely editable and GitHub Actions can run installs, builds, PostgreSQL and API integration. The assistant cannot access the user's Windows IDE; local browser/device accessibility, RTL visual inspection, SMTP deliverability with a real provider, operational backup/restore and medical/legal review remain unverified. Run the remaining checklist in docs/PH01-ACCEPTANCE.md. Translators and legal advisers must review patient-facing clinical/legal language before production.

Do not use real patient records in PH01 or claim HIPAA/legal compliance. PH19 will require the production data protection, restore, retention, export and security release gates.

Next approved phase after PH01 verification: PH02 — clinic creation, subscriptions and manual verification.

## Recorded CI evidence

- [Phase 01 auth and TOTP integration](https://github.com/Alisina137/dentist/actions/runs/43387532343): all tests, builds and PostgreSQL/API integration passed.
- Final branch CI must also pass before merge to main. Healthcare production launch is not approved by this check.
