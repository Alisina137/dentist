# DandanLink — project state

Product specification: DandanLink v1.0 (13 November 2026).
Engineering process: Software Development Workflow V5.
Repository: Alisina137/dentist. Local IDE folder: dentist (usually C:\projects\dentist).

## Current phase: PH03 staff invitation, membership security & dentist identity

Status: **IMPLEMENTED — GITHUB CI / HUMAN VERIFICATION PENDING** (update upon successful CI).
This is a foundational development release, not a medical records or production healthcare system.

### PH03 installed features
- Clinic-specific immutable owner membership created at clinic creation, with backfill for existing PH02 clinics.
- Invited members can hold one scoped role per clinic: owner (protected), manager, dentist, receptionist, assistant, cashier.
- Owner and manager invitation flows use verified-email invitations, 7-day token expiry, hashed tokens, resend and revoke.
- Managers cannot invite or grant manager/owner role, edit their own privilege, or manage owners.
- High-risk staff/role changes require verified 2FA; role change/suspension/revocation destroys account sessions to enforce immediate revocation.
- Multi-clinic role selection; each request verifies tenant membership server-side. A tenant switch forces a full page reload and private fetches use no-store.
- Team, Dentists, Invitations tabs; role-scoped staff detail; security/access audit and self session list.
- Dentist professional identity drafts with version checks and explicit unverified status. No public verified profiles.
- Plan's staff capacity is enforced on invitations. Owner and pending valid invites count against limit. Subscription expiry blocks new invitations.
- CI test suite covers mail verification/acceptance, role ceilings, dentist drafts, plan scope, audit and session revocation.

### Routes
Clinic UI: /clinic, /clinic/staff?tab=team|dentists|invitations, /clinic/staff/:membershipId,
 /clinic/settings/security, /clinic/invite?token=..., /clinic/2fa.
API: /v1/team/context, /v1/team/sessions, /v1/team/invitations/{preview,accept},
 /v1/team/clinics/:clinicId/{team,dentists,invitations,security,staff/:membershipId}.
PH02 clinic owner onboarding, subscription settings and platform verification remain operational.

### Not included yet
Clinic staff scheduling, chairs, clinical encounters, dental charting, patient records, appointments,
financial ledgers, dentist credential verification or public booking. Future planned navigation is hidden until implemented.

### Verification limits and follow-up
GitHub Actions is configured to run PH01–PH03 integration against a real temporary PostgreSQL server, plus TypeScript and production web builds. Actual local browser/device review, SMTP delivery, human translation review, credential validation, retention, backup restore and healthcare security/legal acceptance remain outstanding.

See docs/PH03-ACCEPTANCE.md for the full acceptance matrix and manual checks.
Next phase: **PH04 — Services, chairs, working hours and reliable availability foundation**.

## Platform/dev-command adjustment — 13 November 2026

This is a development-platform adjustment, **not PH04**. All PH01–PH03 features remain in scope.

**Patient UI**: new native `apps/mobile` application (Expo SDK 57 / React Native) for
Android Expo Go. The default patient navigation is Home, Appointments, Saved and Account,
with Dari/Pashto RTL and English LTR, stored non-sensitive local preferences,
honest empty/unreleased states, and optional API connectivity check.
Patient registration, published dentist listings, actual availability and booking
will be delivered during their respective planned patient phases.

**Web UI**: `pnpm dev:admin` serves the platform admin dashboard at
`http://localhost:3000`, and `pnpm dev:clinic` serves the clinic management
dashboard at `http://localhost:3001`. `pnpm dev:mobile` starts Expo Go with
`--tunnel --clear --go`. `pnpm dev` runs the API and both web panels.
`pnpm dev:patient:web` remains an optional informational/SEO page on port 3002;
it is not part of the default `pnpm dev`.

**Authentication origins**: the root `.env.example` and CI defaults reflect
the swapped web ports. Existing local `.env` files need
`pnpm dev:ports:sync`, which preserves DB/auth credentials and updates only
admin/clinic origin values. Physical phone network traffic needs a reachable
`EXPO_PUBLIC_API_URL` in `apps/mobile/.env` for backend features; an Expo
Metro tunnel does not tunnel Express port 4000.

**Validation**: Node platform command tests, pnpm typecheck, web production
builds and Expo Android bundling are CI gates. Manual Expo Go device testing,
app store SDK compatibility, mobile connectivity, and visual RTL QA remain
external verification steps. No real clinical data or booked appointments yet.
