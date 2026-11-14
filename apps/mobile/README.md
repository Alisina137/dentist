# DandanLink Patient — Expo Go

The native patient experience is an actual Expo SDK 57 / React Native app.
The clinic and admin management tools remain separate websites. The native
interface is built specifically for Dari and Pashto RTL as well as English LTR.

## Run on Windows

In `C:\projects\dentist`:

```powershell
pnpm install --frozen-lockfile
pnpm dev:api # starts Express on 4000 and a separate API tunnel, then updates apps/mobile/.env
```

In a second terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Open the Expo QR in Expo Go (compatible SDK 57).

### Connect real patient content

`pnpm dev:api` starts the Express API on port 4000 and a **dedicated
HTTPS API tunnel**, then creates or updates only `EXPO_PUBLIC_API_URL` in
ignored `apps/mobile/.env`; your other settings remain unchanged.

**Important:** Expo's `--tunnel` uses ngrok too. A free ngrok development
domain may only have one active endpoint, so exposing both Metro (8081)
and the API (4000) through the same ngrok domain causes `ERR_NGROK_334`.
**Do not enable pooling**: Metro and API must route to different services.

On Windows, install Cloudflare's lightweight tunnel client once:

```powershell
winget install -e --id Cloudflare.cloudflared
```

Open a fresh terminal after installation. With `cloudflared` available,
`pnpm dev:api` **automatically prefers Cloudflare Quick Tunnel for the
API**, leaving ngrok available for `pnpm dev:mobile --tunnel` (the script's
existing `--tunnel` setting). Cloudflare Quick Tunnel does not require a
Cloudflare login. You may explicitly choose `$env:DANDANLINK_API_TUNNEL="ngrok"`
when you have a separate ngrok domain or you run Expo on LAN; the runner
also reuses a local ngrok tunnel that already points to port 4000.

Run `pnpm dev:api` **before** `pnpm dev:mobile`. Keep both terminals open.
If Expo was already running, restart `pnpm dev:mobile` after the API
URL is updated. If you cannot install cloudflared, stop the conflicting
ngrok session and run Expo with `--lan` instead of `--tunnel` (same Wi-Fi
is required).

Optionally configure your patient website URL separately in
`apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_PATIENT_WEB_URL=https://YOUR-PATIENT-WEB.example
```

If `pnpm dev:api` cannot establish a separate HTTPS API tunnel, it fails
with diagnostics instead of leaving the mobile app pointing at localhost.
`http://localhost:4000/ready` must respond successfully for DB-backed
discovery to work. A blue Expo Go startup screen can also indicate a Metro,
SDK or bundling error, unrelated to API connectivity; check Metro output if
the API tunnel is healthy.

`EXPO_PUBLIC_API_URL` is used for **real approved PH13 public clinic
search**, live city/specialty/service facets, approved clinic/gallery/dentist
profiles, hours, prices and **preview-only** candidate schedule slots.
The device must actually reach this API. Expo's Metro tunnel (8081) **does
not** tunnel the backend (4000). If desired, use a reachable LAN IP instead
for local development. Never expose credentials using `EXPO_PUBLIC_` variables.

`EXPO_PUBLIC_PATIENT_WEB_URL` enables opening the secure PH14 patient
website in the external browser for verified account management and family
permissions. Native login and bookings are PH16 and PH15/16 respectively;
the native app must not accept passwords, display clinic medical records,
or claim an unbookable time was reserved.

## Patient navigation — PH16

- **Home:** verified published clinics in the selected Afghan city, real data and live schedule previews.
- **Explore:** search clinics, dentists and treatments using published public facets.
- **Appointments:** signed-in patient visits grouped as upcoming/past/cancelled; real PH15 booking records, clear manual approval status, cancellation and rescheduling with server-enforced policies.
- **Saved:** authenticated, database-backed clinic **and dentist** favorites with server publication verification; legacy guest public clinic shortcuts remain on this device and can migrate after login. No private clinical data is stored in AsyncStorage.
- **Account:** native verified login/signup, explicit patient onboarding consent, authorized family, profile, notification preferences, language/calendar/city and security. Bearer session is held in `expo-secure-store`, not in AsyncStorage.

Clinic and dentist profiles have working **Book appointment** actions. The five-step native booking flow uses approved services, actual availability and the PH15 transaction API. Appointments are never fabricated; a request requiring clinic approval is displayed as **requested**, not confirmed. Private records remain clinic-controlled with explicit in-person proof and individual releases; the patient website can be opened for authorized records when its URL is configured.

Dari/Pashto navigation is RTL-aware while English is LTR. Language/calendar options are in Account, not the global header. Expo phone screens support loading, empty, retry and offline states. Email notification delivery is based on existing opt-in preferences. No SMS or native push notifications without provider setup and consent. Reviews and unverified ratings are excluded.

Read `docs/PH16-ACCEPTANCE.md` for login/booking QA and production readiness limitations. Do not process real medical data until PH19 privacy/security gates have passed.

## Validation

```powershell
pnpm --filter @dandanlink/mobile typecheck
pnpm --filter @dandanlink/mobile build
```

GitHub CI additionally checks mobile source invariants and exports Android,
then runs PH13–PH16 API integrations including secure native bearer sessions and account favorites.
