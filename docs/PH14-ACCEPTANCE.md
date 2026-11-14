# PH14 — Verified patient accounts, family permissions and consent

**Traceability:** DandanLink Product Specification v1.0 PH14 / F14 / AC14 / P05–P09. Process: Software Development Workflow V5. Depends on PH01 Better Auth and PH13 guest discovery. **Production gates:** independently approved Afghan patient/guardian consent and professional/privacy policy, medical records retention, legal identity and data rights, translations, accessibility/manual QA.

## Patient web: no placeholder account screens

Navigation: `Home / Find Care / About / My Account` for logged-in patients, `Sign In` for guests. Patient web on :3002, API on :4000.

- `/login`: email/password via existing secure Better Auth sessions, verification enforcement, generic credential errors, redirect to safe internal `next` (no arbitrary cross-origin redirects). 2FA challenge route `/account/2fa` for accounts already configured with 2FA; no bypass for MFA-enabled accounts.
- `/signup`: full name/email/password, explicit links to patient terms/privacy and checkbox; requires email verification. Patient account and later booking are free. Unverified users can browse public PH13 profiles but cannot open patient account APIs.
- `/verify`: correct verification result, manual resend using Better Auth and subsequent sign-in. `/forgot-password` and `/reset-password`: existing token-validated Better Auth recovery, generic email privacy, revoked sessions after password reset.
- `/account/onboarding`: after verified login, explicitly store patient terms, privacy acknowledgment, adult attestation, preferred name, editable Kabul city, optional **unverified** contact phone. Legal/privacy versions (patient-terms-2026-11-14-v1 and patient-privacy-2026-11-14-v1) and timestamp are stored atomically. **Children cannot declare themselves adult guardians.** Policy/consent is not inferred from signup API calls without the verified onboarding step.
- `/account`: functional account overview with actual verified status, server count of active authorized dependents, joined date and direct links to Profile, Family, Preferences, Privacy and Security. No dead appointment, favorite or clinical record links; PH15/16 modules identified as not yet released.
- `/account/profile`: edit preferred name, city, optional unverified phone; verified email is read-only; optimistic revision conflict handling, actual save, initials avatar placeholder. Profile/name change does not grant clinic medical record access.
- `/account/family`: real minor creation/update/revocation (parent/legal guardian explicit attestation, DOB age under 18, date and revision validation). Minor who turns 18 loses effective guardian authority pending independent adult consent. Active list shows status and age. Guardian may request an adult using an existing verified email address, but receives exactly the same generic response for unknown and existing accounts (no account enumeration). The verified adult receives a direct link to **Requests to Me**, uses their own session and explicit independent acceptance to grant future booking authority; the requester cannot accept on their behalf. The adult can revoke their own delegation; guardian may also revoke. No family operation links or retrieves clinic medical records or receives any patient matching by name/phone.
- `/account/preferences`: real persistent app language (Dari, Pashto, English) and calendar (Solar Hijri, Gregorian) on `auth_users`, notification opt-ins default off and stored separately, public provider delivery capability clearly shown. No pre-PH15 claim that booking emails/SMS/push were sent; SMS/push disabled.
- `/account/privacy`: consent history with append-only DB guard, explicit **no linked clinical records** state, real self-service JSON export (account, preferences, dependents and consent; **clinic PHI excluded**). `/privacy`, `/terms` show patient-specific policy version and patient identity/medical access disclaimers, with final legal review still needed.
- `/account/security`: real sessions from Better Auth account-scoped session table, revoke selected session only if owned, sign out current session, password reset path. No expose session token.

## Endpoints

All routes under `/v1/patients` require verified email-based authentication. Personal routes also require accepted portal onboarding. All data are private/no-store. Unsafe Origin requests are rejected for writes. These endpoints never read clinic_patient, encounter, chart, billing or credential evidence tables.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/me` | verified user and onboarding state; no records or linked clinic data |
| POST | `/onboard` | store explicit adult/terms/privacy consent and initial profile atomically |
| PUT | `/me` | edit owned profile with revision precondition |
| GET/PUT | `/preferences` | persistent locale/calendar and two independent notification choices |
| GET | `/family` | effective minor and independently accepted adult grants |
| POST | `/family/minors` | new legally attested child under 18 |
| PUT | `/family/minors/:memberId` | only owning guardian, with revision and fresh attestation |
| DELETE | `/family/:memberId` | revoke own delegation, no cascade deletion of clinic records |
| POST | `/family/invite-adult` | generic response; dispatch private email invitation only to verified account |
| GET | `/family/requests` | independently verified adult sees their own invitations |
| POST | `/family/requests/:invitationId/decide` | adult consent accept/decline, one-time transaction |
| GET/DELETE | `/family/delegations[/:memberId]` | adult view/revoke grants made to other guardians |
| GET/DELETE | `/security/sessions[/:sessionId]` | view/revoke only own active Better Auth sessions |
| GET | `/privacy/consents` | own immutable consent ledger, no clinical grants |
| GET | `/privacy/export` | own portal-only JSON, no clinic clinical/finance data |

All user and dependents records are in `0014_patient_identity_family.sql`. SQL guardrails ensure correct minor/adult relationship, soft revocation and age gate at API, no active duplicate adult family delegate, append-only consent events. Consent changes and auditing are recorded for high-risk operations. Portal data has **no foreign key to clinic-local patient clinical records**.

## Acceptance and safety checks

CI includes `tests/phase14-validation.test.mjs` and `tests/phase14-integration.mjs`, plus PH01–PH13 regressions, TypeScript, all web builds and Expo Android export:

- Verified session can inspect its own onboarding state; guest and verified-but-not-onboarded cannot read private profile/family data.
- Consent/guardian adult statements required; invalid age/relationship and stale revisions rejected.
- Account profile, locale/calendar and notification choices persist in PostgreSQL and cannot be overwritten by stale updates. Unverified phone cannot be used for identity proof.
- A guardian's adult invitation alone grants nothing. Independent verified adult accepts and can revoke from their own portal; another user's attempt fails. No account enumeration in invitation response; the sender cannot list pending email matches.
- Patient portal cannot access staff-only patient registry or export clinic-held clinical/billing records.
- Session revocation is account scoped; cross-site unsafe Origin rejected.
- No self-service public booking until PH15, no clinic clinical record link without separate proof and approval, and no fabricated messages.

## Installation

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm db:migrate
```

No new environment variables are mandatory. For real email verification/forgot password/adult invitation delivery, production requires working `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` plus correct `PATIENT_WEB_URL`. Local no-SMTP development only logs verification links to localhost and must not be used for real patient data.

**Next:** PH15 integrated patient booking, approved record links and notification delivery, with explicit separate clinic patient identity proof. No automatic matching on same name/email/phone.
