# DandanLink

Dental practice management + free patient discovery platform. **Phases 01–03 foundations are implemented; browser, local SMTP and healthcare production verification remain pending.** Do not enter real patient data or use for clinical care.

## Development applications

| Application | Local address | Current availability |
| --- | --- | --- |
| Admin web | http://localhost:3000 | Authenticated admin panel with plans, clinic verification and subscriptions |
| Clinic web | http://localhost:3001 | Clinic owners and staff: registration, settings, subscriptions and security |
| Patient mobile (Expo Go) | QR code from `pnpm dev:mobile` | Patient mobile home, appointments, saved and account foundations (booking not launched) |
| Patient web (optional SEO site) | http://localhost:3002 | Informational public site, started separately via `pnpm dev:patient:web` |
| API | http://localhost:4000 | Better Auth, PostgreSQL and access-protected routes |

Phases 02–03 enable clinic onboarding, manual verification, plan/version configuration, trial subscriptions, staff invitations, tenant role security and unpublished dentist identity drafts. Patient records, appointments and public booking are NOT released yet.

## Windows PowerShell setup

Open PowerShell inside your existing dentist folder (for example C:\projects\dentist), then run:

1. corepack enable
2. corepack prepare pnpm@10.27.0 --activate
3. Copy-Item .env.example .env
4. Edit your local .env with a real PostgreSQL DATABASE_URL and a random BETTER_AUTH_SECRET of at least 32 characters.
5. pnpm install
6. pnpm dev:ports:sync  (updates web origins in your existing .env without touching secrets)
7. pnpm db:migrate
8. pnpm dev

Open http://localhost:4000/ready to confirm the DB is reachable. `pnpm dev` starts API + both web dashboards, not Expo Go. Run `pnpm dev:mobile` in another terminal to show the Expo Go QR code. Alternatively run the web/backend components individually using `pnpm dev:api`, `pnpm dev:admin` and `pnpm dev:clinic`. The port mapping is **admin 3000, clinic 3001**.

### Verification and password reset

Outside local development, SMTP credentials are required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM. On localhost only, without SMTP the API logs email-verification and password-reset test links to the API terminal; these are NOT actual sent emails. Do not deploy without SMTP. Clinic signup requires email verification before sign-in.

### Create a legitimate platform admin

There is no public admin signup. First register and verify an account from the clinic site, then set ADMIN_BOOTSTRAP_EMAIL to the exact verified email and temporarily set ALLOW_ADMIN_BOOTSTRAP=true in the local .env. Run:

    pnpm --filter @dandanlink/api grant:admin your@email.example

Immediately reset ALLOW_ADMIN_BOOTSTRAP=false. Sign in via http://localhost:3000/admin/login, enroll your authenticator application, verify the code and securely retain backup codes. Nonadmin and unenrolled accounts are blocked from admin endpoints.

### Checks

    pnpm test
    pnpm typecheck
    pnpm build

Live integration checks still require a real database, browser and email configuration. No real clinical data should be collected before the PH19 production security and legal gate.

## Layout

- apps/admin-web (:3000) and apps/clinic-web (:3001) — dedicated Next.js dashboards.
- apps/mobile — Expo SDK 57 React Native patient application for Expo Go on Android.
- apps/patient-web (:3002) — optional future SEO/marketing web app, not part of the default dev command.
- apps/api — Express/Better Auth server, with server-side admin verification and MFA gates.
- packages/db — Drizzle schema and numbered PostgreSQL migration.
- packages/domain — authorization contract and validation utilities.
- packages/locales — Dari, Pashto, English and calendar preferences.
- packages/ui-web — DandanLink Care UI shared components and style tokens.
- docs/PROJECT-STATE.md — phase implementation status and limitations.

See docs/PH01-ACCEPTANCE.md for exact validation checklist.

## Phase 02 — first-time configuration

Run `pnpm db:migrate` after pulling Phase 02. This adds clinic and subscription tables without removing existing account data.

1. Sign in as an approved platform administrator at http://localhost:3000/admin and complete MFA.
2. Visit http://localhost:3000/admin/plans and create active Starter, Professional or Business plan versions. Prices are **not prefilled**; enter validated AFN prices yourself.
3. As a separate clinic owner account, visit http://localhost:3001/clinic/onboarding, enter clinic details, select an available plan, and save the draft.
4. Upload the clinic's registration document (PDF/PNG/JPG, <=2 MB) and submit the attestation; status becomes Pending Review. Do not upload real patient records.
5. Admin reviews the clinic at http://localhost:3000/admin/clinics. Approval is independent of billing and does not publish listings.
6. Owner may enter a bank/cash reference at http://localhost:3001/clinic/settings/subscription; an admin must verify it at http://localhost:3000/admin/subscriptions before the subscription activates.

Run `pnpm check` for local lint-equivalent tests/typecheck/build. For automated API integration see `tests/phase02-integration.mjs` and GitHub Actions. Real-world clinical/data-protection clearance is not established by passing CI.

## Phase 03 — Staff roles and invitations

After pulling this phase, run `pnpm install --frozen-lockfile` and `pnpm db:migrate`. Migration 0003 creates active owner memberships for existing clinics.

1. Sign in with a verified clinic owner at http://localhost:3001/clinic.
2. Open **Staff & Resources**, and enroll an authenticator app if prompted (required before granting privileges).
3. Select **Invitations**; invite verified email addresses as manager (owner only), dentist, receptionist, assistant or cashier. Staff seats are bounded by the clinic's active/trial subscription plan, including owner and pending invitations.
4. An email invitation contains a one-time secure link to `/clinic/invite`. The recipient must verify and sign into the exact invited email, then accept the invitation. During localhost development without configured SMTP, the API terminal logs a local-only invitation URL (not an email delivered).
5. Recipients see the appropriate clinic workspace and only their allowed navigation. Dentists can edit their private **unverified** professional identity draft.
6. Owner/authorized manager can view **Team**, **Dentists**, **Invitations** and **Security & Access**. Staff changes/revocations immediately invalidate the affected account sessions; the user may sign in again to access any other still-authorized clinic.

Staff roles are stored per clinic and enforced on the backend. Owners cannot be demoted via staff management. Manager role grants cannot exceed their own grant. Suspended clinics do not automatically become publicly bookable.

Checks: `pnpm check` and GitHub Actions PH01–PH03 PostgreSQL integration. See docs/PH03-ACCEPTANCE.md.

## Platform update: Expo Go patient app and dashboard ports

The patient interface now runs as a native Expo/React Native application in `apps/mobile`.
The clinic management and platform administration remain separate web applications.
You do **not** need to rebuild these web applications for Android.

For an existing checkout, run once after pulling this update:

```powershell
cd C:\projects\dentist
pnpm install --frozen-lockfile
pnpm dev:ports:sync
```

The sync command changes **only** `ADMIN_WEB_URL=http://localhost:3000` and
`CLINIC_WEB_URL=http://localhost:3001` in the existing root `.env`. It preserves
`DATABASE_URL`, `BETTER_AUTH_SECRET` and unrelated settings.

For the web dashboards, run `pnpm dev:api`, `pnpm dev:admin`, and
`pnpm dev:clinic` in separate terminals, or simply `pnpm dev` to start all three.

For the Android patient app, run:

```powershell
pnpm dev:mobile
```

Scan the QR code from **Expo Go** on an Android phone. This project uses Expo **SDK 57**,
so Expo Go must support SDK 57 (install a compatible version from
https://expo.dev/go if the app reports a version mismatch).
The `--tunnel` connection requires internet access and @expo/ngrok, which is installed
as a development dependency. Avoid using an old Metro server still running at port 8081.

The mobile app's initial tabs are **Home / Appointments / Saved / Account**,
with Dari, Pashto, English and saved local preferences. The live dentist directory,
patient sign-in and appointments intentionally remain disabled until their planned
phases; no synthetic bookings or dentists are presented.

### Mobile API connectivity (optional at this stage)

Expo tunnel forwards the Metro bundler, **not** your Express API. Your physical
phone cannot access the computer through `http://localhost:4000`.
If you want the mobile app to check your live backend status, configure
`apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=https://your-https-api-tunnel.example
```

You may use your PC's reachable LAN address instead, for example
`http://192.168.1.20:4000` when phone and computer share a network. Never place
`BETTER_AUTH_SECRET`, `DATABASE_URL` or other secrets in `EXPO_PUBLIC_*` variables.
Restart `pnpm dev:mobile` after changing `apps/mobile/.env`.
The app's informational screens run even without an API URL configured.

The mobile SDK will be revisited when patient login, public verified listings,
and real bookings are implemented, and a production mobile development build
is required before release.

## Local development without email confirmation

DandanLink can skip email ownership confirmation **only** when both
`NODE_ENV=development` and `DEV_SKIP_EMAIL_VERIFICATION=true` are set.
Production and automated-test environments always enforce email verification.

From the local Windows project folder, run:

```powershell
cd C:\projects\dentist
pnpm dev:auth:no-email
pnpm dev
```

The command modifies only `DEV_SKIP_EMAIL_VERIFICATION` in the existing root
`.env` file and refuses non-development environments. Restart the API after
changing the flag. **No database migration is needed.**

Use fake development email addresses; the application does not pretend they
were verified. Disabling the flag immediately restores normal email
verification checks. Never enable this for real patients or a public server.

### Create a development administrator

1. Create a name, test email and private password at http://localhost:3001/clinic/signup.
   No verification email is sent in this development mode.
2. In your **local** `.env`, temporarily set `ALLOW_ADMIN_BOOTSTRAP=true` and
   `ADMIN_BOOTSTRAP_EMAIL=<exact email registered>`.
3. Run `pnpm admin:grant <exact email registered>`.
4. Set `ALLOW_ADMIN_BOOTSTRAP=false` again in `.env`.
5. Sign in at http://localhost:3000/admin/login and configure a TOTP
   authenticator. **Admin MFA remains mandatory even in development.**

Email-based password-reset and staff invitations still require SMTP or the
restricted localhost development email-link logger. Skipping email verification
does not remove those separate requirements.

## PH05 — Clinic patient records
Open http://localhost:3001/clinic/patients with a clinic owner, manager,
dentist or receptionist account. Owners/managers can also import approved CSV.
Patient overview is private to the clinic; medical intake requires qualified
staff. No appointments, dental chart, visits or patient billing in this release.
Run pnpm install --frozen-lockfile, pnpm db:migrate, then pnpm dev.
The database migrations include 0004 for operational configuration and 0005 for patients.
PH04 and PH05 are independent foundations, and both are now implemented.
Do not enter real patient records while development email verification is disabled.
Details and limitations: docs/PH05-ACCEPTANCE.md.

## PH04 — Services, chairs, hours and safe slot previews

Owner and manager can set up clinic operations in the web dashboard:

- `http://localhost:3001/clinic/services` — service catalog, AFN prices,
  treatment duration/buffer, active state, immutable price version history.
- `http://localhost:3001/clinic/resources` — chairs and rooms, unique
  internal codes, equipment, safe updates and scheduling links.
- `http://localhost:3001/clinic/settings/hours` — five functional tabs:
  Clinic hours, Dentist shifts, Chair schedules, Holidays, Preview.
- `http://localhost:3001/clinic` — real configuration checklist with
  working links; clinic onboarding also includes the operations step.

All routes use the clinic-specific `?clinic=<clinic-id>` query when navigating
inside multiple clinics. Current tenant membership and operational write
access are verified on the API, not by the browser.

To try the Saturday scenario, add a 30-minute active consultation, create
Treatment Chair A, save Saturday 09:00–12:00 clinic hours, save the same
Saturday dentist shift and optionally the chair shift, then open Hours →
Availability preview and select a Saturday. Times are computed in Asia/Kabul;
preview entries are **not bookings or patient appointments**. Appointments
and conflict-proof reservations first become real in PH06, while public booking
remains deferred until PH15. Do not enter actual clinical or patient records
in insecure development mode.

### Updating your local checkout

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

The new additive migration is `0004_services_resources_hours.sql`; it is
safe to apply after the previously merged PH05 migration `0005` because
the migration runner skips already-applied filenames. No new environment
variables are required. Admin remains on 3000, clinic on 3001, API on 4000,
and the patient's Expo Go app still starts with `pnpm dev:mobile`.

See `docs/PH04-ACCEPTANCE.md` for the exact permissions, validation and CI tests.
