# PH16 — Native patient application parity (Expo Go, Android/iOS)

## Scope and release boundary

Phase 16 extends the existing **Expo SDK 57** patient app from public clinic discovery to real patient account and appointments workflows. The single server-side source of truth remains the PH15 `/v1/booking` API and PH06 PostgreSQL clinic appointment calendar. Do **not** use real patient data before Phase 19 privacy, legal, recovery and clinical approval gates. Do not mistake a successful Android bundle export for an on-device Android and iOS QA pass.

### Native navigation

Five user-facing destinations: **Home / Explore / Appointments / Saved / Account**. Clinic and dentist detail screens lead directly to the native booking wizard. Loading, error, empty, denied, offline and retry states are shown; no fabricated provider records. Dari/Pashto have RTL-aware labels and layout; English has LTR. Locale, calendar and city preferences remain available in Account.

### Patient account and authentication

- Verified email-and-password signup/signin are backed by the existing Better Auth server. Email verification is required. Signup does not force an unverified login.
- Bearer plugin returns an opaque signed session to the native client; the token is written to Expo SecureStore, not AsyncStorage or Expo public environment variables. Session revalidation occurs on launch; sign-out clears local token. Authentication is checked again on every private server request.
- Adults explicitly accept patient terms and privacy policy on onboarding. Existing PH14 dependent-authorization rules remain enforced by the server for every request. Family, profile and notification preferences are available on-device.
- Password reset uses the existing HTTPS patient web flow if configured; no in-app password or token is printed to logs.
- Public discovery can continue without account login.

### Real booking and management

- Clinic/dentist selection → published service → verified dentist → live day/time → authorized subject (self/guardian or independently approved adult) → confirmation/receipt.
- Booking requests use `POST /v1/booking/requests` with explicit consent and per-attempt idempotency keys.
- Confirmed and manual-approval-required bookings are distinguished. Clinic appointments are exactly the same PH06/PH15 appointments seen by clinic staff.
- **Appointments** tab shows upcoming, past and cancelled/rejected appointments, with server-enforced cancellation/rescheduling, revision conflict handling and correct Asia/Kabul time.
- No payment guarantee, treatment result, review, or appointment is fabricated.

### Favorites

- SQL migration `0016_native_favorites.sql` creates user-owned favorites for verified published clinic and dentist profiles. Each list/read rechecks public eligibility. Server-side unique indexes prevent duplicate saves.
- Guest local public clinic shortcuts from earlier app versions remain supported. After login, previously saved public clinic IDs can be migrated to verified account favorites; no sensitive data is stored in AsyncStorage.
- Signed-in favorites are account-specific, survive reinstall/login and never expose unpublished credentials or clinical records.

### Notifications and records

- Existing PH15 notification preferences and email delivery status remain available. SMS and native push notifications are **not** launched without a push provider, explicit push consent, token registration, and delivery testing.
- Private clinical records are available only through clinic-verified, individually released PH15 record links; no automatic matching or disclosure in the native discovery feed. An optional external patient-web link can open the secure records site for authorized access.

### Environment and run commands (Windows PowerShell)

From `C:\projects\dentist` after pulling:

```powershell
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev:api
```

Run in another PowerShell terminal:

```powershell
pnpm dev:mobile
```

`pnpm dev:api` starts port 4000 and updates `apps/mobile/.env` with a dedicated HTTPS API tunnel. A Cloudflare API tunnel is preferred when `cloudflared` is installed, leaving ngrok available for Expo Metro. Keep both terminals running. If Metro was started before the URL updated, restart it.

### Acceptance / tests

- Native source invariants, session security and no fake data: `tests/phase16-validation.test.mjs`.
- Real PostgreSQL HTTP coverage for bearer sign-in, verified patient onboarding, favorites isolation/deduplication, public verification and revocation: `tests/phase16-integration.mjs`.
- Prior PH15 integration covers live appointment booking, double-booking protection, cancellation/reschedule and clinic approval.
- CI runs full `pnpm test`, `pnpm typecheck`, Expo SDK compatibility, `pnpm build`, Android export and HTTP integrations.
- **Still required manually:** real Android/iOS Expo Go login, email verification links, token persistence over restart, login/logout, five-screen navigation, input keyboard, RTL, assistive technology, low-network retries, deep links, background/foreground behavior and concurrent booking through a real phone.

### Known limits

Do not advertise PH17 reviews or unconfigured native push. PH19 clinical data handling, privacy, backup, retention, release-management and security gates are prerequisites to production. The mobile app itself must not show unapproved historical records or private clinical attachments.
