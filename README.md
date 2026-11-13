# DandanLink

Dental practice management + free patient discovery platform. **Phase 01 code foundation is implemented, but real-world verification is pending.** Do not enter real patient data or use for clinical care.

## Development applications

| Application | Local URL | Phase 01 |
| --- | --- | --- |
| Clinic web | http://localhost:3000 | Verified signup, login, password reset, preferences, honest clinic shell |
| Admin web | http://localhost:3001 | Invited admin login, TOTP 2FA, restricted shell |
| Patient web | http://localhost:3002 | Public introduction and informational privacy/terms |
| API | http://localhost:4000 | Better Auth, PostgreSQL and access-protected routes |

Clinic creation, subscriptions, dentists, patient records, appointments and public booking are NOT released in Phase 01.

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
