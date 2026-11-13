# DandanLink

Dental practice management + free patient discovery platform. **Phases 01–03 foundations are implemented; browser, local SMTP and healthcare production verification remain pending.** Do not enter real patient data or use for clinical care.

## Development applications

| Application | Local URL | Phase 01 |
| --- | --- | --- |
| Clinic web | http://localhost:3000 | Signup, clinic onboarding, subscriptions, staff, dentist identity and security |
| Admin web | http://localhost:3001 | TOTP-protected clinic verification, plans, subscriptions and review queue |
| Patient web | http://localhost:3002 | Public introduction and informational privacy/terms |
| API | http://localhost:4000 | Better Auth, PostgreSQL and access-protected routes |

Phases 02–03 enable clinic onboarding, manual verification, plan/version configuration, trial subscriptions, staff invitations, tenant role security and unpublished dentist identity drafts. Patient records, appointments and public booking are NOT released yet.

## Windows PowerShell setup

Open PowerShell inside your existing dentist folder (for example C:\projects\dentist), then run:

1. corepack enable
2. corepack prepare pnpm@10.27.0 --activate
3. Copy-Item .env.example .env
4. Edit your local .env with a real PostgreSQL DATABASE_URL and a random BETTER_AUTH_SECRET of at least 32 characters.
5. pnpm install
6. pnpm db:migrate
7. pnpm dev

Open http://localhost:4000/ready to confirm the DB is reachable. Alternatively run individual apps with pnpm dev:api, pnpm dev:clinic, pnpm dev:admin and pnpm dev:patient in separate terminals.

### Verification and password reset

Outside local development, SMTP credentials are required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM. On localhost only, without SMTP the API logs email-verification and password-reset test links to the API terminal; these are NOT actual sent emails. Do not deploy without SMTP. Clinic signup requires email verification before sign-in.

### Create a legitimate platform admin

There is no public admin signup. First register and verify an account from the clinic site, then set ADMIN_BOOTSTRAP_EMAIL to the exact verified email and temporarily set ALLOW_ADMIN_BOOTSTRAP=true in the local .env. Run:

    pnpm --filter @dandanlink/api grant:admin your@email.example

Immediately reset ALLOW_ADMIN_BOOTSTRAP=false. Sign in via http://localhost:3001/admin/login, enroll your authenticator application, verify the code and securely retain backup codes. Nonadmin and unenrolled accounts are blocked from admin endpoints.

### Checks

    pnpm test
    pnpm typecheck
    pnpm build

Live integration checks still require a real database, browser and email configuration. No real clinical data should be collected before the PH19 production security and legal gate.

## Layout

- apps/clinic-web, apps/admin-web, apps/patient-web — distinct Next.js applications.
- apps/api — Express/Better Auth server, with server-side admin verification and MFA gates.
- packages/db — Drizzle schema and numbered PostgreSQL migration.
- packages/domain — authorization contract and validation utilities.
- packages/locales — Dari, Pashto, English and calendar preferences.
- packages/ui-web — DandanLink Care UI shared components and style tokens.
- docs/PROJECT-STATE.md — phase implementation status and limitations.

See docs/PH01-ACCEPTANCE.md for exact validation checklist.

## Phase 02 — first-time configuration

Run `pnpm db:migrate` after pulling Phase 02. This adds clinic and subscription tables without removing existing account data.

1. Sign in as an approved platform administrator at http://localhost:3001/admin and complete MFA.
2. Visit http://localhost:3001/admin/plans and create active Starter, Professional or Business plan versions. Prices are **not prefilled**; enter validated AFN prices yourself.
3. As a separate clinic owner account, visit http://localhost:3000/clinic/onboarding, enter clinic details, select an available plan, and save the draft.
4. Upload the clinic's registration document (PDF/PNG/JPG, <=2 MB) and submit the attestation; status becomes Pending Review. Do not upload real patient records.
5. Admin reviews the clinic at http://localhost:3001/admin/clinics. Approval is independent of billing and does not publish listings.
6. Owner may enter a bank/cash reference at http://localhost:3000/clinic/settings/subscription; an admin must verify it at http://localhost:3001/admin/subscriptions before the subscription activates.

Run `pnpm check` for local lint-equivalent tests/typecheck/build. For automated API integration see `tests/phase02-integration.mjs` and GitHub Actions. Real-world clinical/data-protection clearance is not established by passing CI.

## Phase 03 — Staff roles and invitations

After pulling this phase, run `pnpm install --frozen-lockfile` and `pnpm db:migrate`. Migration 0003 creates active owner memberships for existing clinics.

1. Sign in with a verified clinic owner at http://localhost:3000/clinic.
2. Open **Staff & Resources**, and enroll an authenticator app if prompted (required before granting privileges).
3. Select **Invitations**; invite verified email addresses as manager (owner only), dentist, receptionist, assistant or cashier. Staff seats are bounded by the clinic's active/trial subscription plan, including owner and pending invitations.
4. An email invitation contains a one-time secure link to `/clinic/invite`. The recipient must verify and sign into the exact invited email, then accept the invitation. During localhost development without configured SMTP, the API terminal logs a local-only invitation URL (not an email delivered).
5. Recipients see the appropriate clinic workspace and only their allowed navigation. Dentists can edit their private **unverified** professional identity draft.
6. Owner/authorized manager can view **Team**, **Dentists**, **Invitations** and **Security & Access**. Staff changes/revocations immediately invalidate the affected account sessions; the user may sign in again to access any other still-authorized clinic.

Staff roles are stored per clinic and enforced on the backend. Owners cannot be demoted via staff management. Manager role grants cannot exceed their own grant. Suspended clinics do not automatically become publicly bookable.

Checks: `pnpm check` and GitHub Actions PH01–PH03 PostgreSQL integration. See docs/PH03-ACCEPTANCE.md.
