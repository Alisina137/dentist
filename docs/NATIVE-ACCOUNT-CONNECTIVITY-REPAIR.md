# DandanLink — Native patient Account signup: API connectivity repair

## Issue

On Expo Go, navigating to Account → Create account could show a generic "server not connected" message despite an API terminal reporting `[ready]`. In local development the API may use an **ngrok free HTTPS tunnel** while Expo Metro uses LAN. An ngrok browser interstitial can return **HTTP 200 HTML**, not DandanLink JSON. Native signup previously accepted any HTTP 2xx even if the response was not JSON, which could falsely report that a patient account had been created. A failed restored session could also block the login/signup form.

## Fix

- Authenticated and account calls send ngrok's documented `ngrok-skip-browser-warning: 1` header **only when the API host is an ngrok HTTPS domain**, including `*.ngrok-free.dev`; no token, personal information or secrets are present in that header.
- Shared transport requires JSON and distinguishes tunnel HTML, malformed JSON, real server errors, missing environment URL and unreachable network. Sign-up success requires a structured Better Auth `user.id` and `user.email`. A tunnel warning is not interpreted as successful registration.
- The account form stays usable after old-session restore errors and provides a clear retry action; native status indicators require the actual `{product:"DandanLink"}` API response, not merely HTTP 200.
- The API launcher now checks the public address with a no-auth JSON request and reports a warning if the endpoint serves HTML or is unreachable. The new `pnpm dev:api:check` command tests the same configured mobile URL and the database-ready endpoint **without sending patient credentials or session data**.
- English, Dari and Pashto show distinct diagnostic guidance for these failures. No auth security bypass, clinical/finance data change, schema migration, SMS or new dependency is required.

## Apply the fix and test signup

1. Pull latest main:
   ```powershell
   git -C C:\projects\dentist pull --ff-only origin main
   ```
2. Stop old API and Metro terminals with **Ctrl+C**. Start API first:
   ```powershell
   cd C:\projects\dentist
   pnpm dev:api
   ```
   Keep the terminal open. Look for `[ready] Public API`, `[ready] Updated apps/mobile/.env` and ideally `[ready] Public mobile API verified: JSON /v1/public/status`. Cloudflare timeout with successful ngrok fallback is acceptable *only when the public API check succeeds*.
3. In another terminal, inspect the API without exposing account details:
   ```powershell
   cd C:\projects\dentist
   pnpm dev:api:check
   ```
   Both `/v1/public/status` and `/ready` should report **OK**. If one fails, look at the API terminal and database connectivity. Do **not** assume a successful Expo QR scan confirms API access.
4. For the currently working Expo Go SDK 57, connect laptop and phone on the same private Wi-Fi and start Metro in LAN mode:
   ```powershell
   cd C:\projects\dentist
   pnpm --filter @dandanlink/mobile exec expo start --lan --clear --go
   ```
   Open Expo Go and scan the **new** QR. Restart/reload Metro and Expo after any API-tunnel change because `EXPO_PUBLIC_API_URL` is embedded in the loaded JavaScript bundle.
5. Open **Account → Create account**. For the local test use a **new test-only email** and a password of at least 10 characters. Do not use real patient data or reuse a sensitive password on a nonproduction backend.
6. If signup succeeds, sign in after email verification when required. When SMTP is not configured locally, check the API terminal for the local-only verification link; no real email was delivered. If `DEV_SKIP_EMAIL_VERIFICATION=true` is used locally, it bypasses verification **only for approved development**, never production.

## If the error remains

- `The API address is missing`: start API **before** Metro, confirm `apps/mobile/.env`, restart Expo.
- `The API address returned a web page`: the ngrok/browser tunnel responded with HTML. Restart the API tunnel; use the `pnpm dev:api:check` command. The native code automatically sends the required bypass header.
- `The DandanLink API is temporarily unavailable`: confirm `/ready` and database configuration; the API is responding but failing.
- `Cannot connect right now`: phone may not reach the public HTTPS endpoint even if the PC can. Check mobile internet, DNS/VPN, tunnel lifetime and whether the API process remains running. Confirm actual error text from the phone; a compatible Expo Go version alone does not establish API access.
- An account that already exists may have been created during a previous attempt. Check signup or email verification rather than repeatedly submitting the same registration. Do not share credentials or verification tokens in screenshots.

## Acceptance and QA

| Case | Expected |
| --- | --- |
| ngrok free tunnel warning returns HTML/200 | No false signup; actionable tunnel error |
| Valid Better Auth signup returns user ID + email | Account creation success, correct verification guidance |
| Non-JSON / invalid JSON / API 503 | Distinct native errors; no false account creation |
| Stale saved session / offline restore | Login and signup remain visible; private account data never shown |
| App status receives 200 HTML instead of DandanLink JSON | Network state does **not** become connected |
| API tunnel fresh URL after restart | `apps/mobile/.env` updated; diagnostics pass after Expo reload |
| Credentials and private API calls | Bearer token remains in SecureStore; no credentials printed or stored in AsyncStorage |
| English/Dari/Pashto | Correct localized error and retry states |
| Expo Go SDK 57 on physical Android | Signup and sign-in tested against a nonproduction database |

GitHub CI test/typecheck/build/Expo bundles and database integration are necessary but cannot simulate the user's local ngrok endpoint or perform physical-phone account creation. No claim is made that the phone was manually tested; test it after pulling. PH19 production pilot remains NO-GO.
