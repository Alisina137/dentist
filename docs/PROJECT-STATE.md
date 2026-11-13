# DandanLink — project state

Specification: Product Specification v1.0, November 13, 2026.
Workflow: Software Development Workflow V5.
GitHub: Alisina137/dentist. Local IDE folder: dentist.

## PH02 — Clinic creation, versioned subscription and verification

Status: IMPLEMENTED — VERIFICATION PENDING for real-browser RTL, production email, security/legal review and pilot configuration.
The repository holds integrated tenant and billing workflows; GitHub Actions is the proof of automated execution, not a substitute for field testing.

### Routes
Clinic: /clinic, /clinic/onboarding, /clinic/settings, /clinic/settings/subscription, /pricing, /for-clinics.
Admin (verified 2FA): /admin, /admin/clinics, /admin/clinics/:clinicId, /admin/plans, /admin/subscriptions.
The patient public web remains informational until PH13; do not publish fictitious dentist profiles.

### Data
Migration 0002_clinics.sql adds clinics, versioned platform plans, subscriptions, platform payment requests, secure administrative evidence, verification history.
Clinic owner access is scoped server-side; platform admin operations require admin membership and verified MFA.
Professional verification and payment status remain independent.
Documents (max 2 MiB each) are private and stored inside the encrypted-at-rest database provider volume; do not treat as production-compliant without a formal hosting/security review.
No patient clinical data is collected.

### Important limitations and decisions
- No subscription prices are hardcoded. An authenticated TOTP-enabled platform admin must create an active Starter/Professional/Business plan before a clinic can register.
- Payment is NOT online: owner records a manual transaction reference, admin reconciles and marks paid. No payment receipt is fabricated.
- Tenant can submit one clinic per request and can own multiple clinics; switching uses explicit clinic selection.
- Staff/chair/services setup is PH03–04; public publishing is PH12 and booking PH15.
- Trial duration and grace come from immutable plan version; renewals are manual until gateway integration.
- Clinic verification evidence is only for manual professional review, not automated validation.
- Clinic record updates after approval reopen human review, not silent publication.
- Medical record retention/export and production privacy/security signoff remain PH19 gates.

### Verification
See docs/PH02-ACCEPTANCE.md and GitHub Actions. Current local browser/SMTP/device verification is still pending.

Next approved phase: PH03 — Staff invitations, role-based memberships and dentist identity.
