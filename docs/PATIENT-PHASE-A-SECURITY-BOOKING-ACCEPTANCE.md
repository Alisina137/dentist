# DandanLink Patient — Phase A: Security & Booking Reliability

**Baseline:** PH01–PH19, patient UI Stage G, operational stages H–L.  
**Scope:** Expo patient navigation, native verified account, booking/rescheduling, appointments and patient-facing recovery. This is **not** an approval for real clinical data or a healthcare production launch; the PH19 pilot gate stays blocked without independent legal, clinical, security and operational evidence.

## Implemented outcomes

| Patient scenario | Behavior now | Evidence |
| --- | --- | --- |
| Switch between patients (including onboarding-only accounts) | Entire native screen tree remounts by actual authenticated user ID. A temporary safe spinner blocks even a single render of the previous account's detail/booking route; private booking route and account sections are cleared. Guest shortcuts remain nonclinical and device-local. | `apps/mobile/App.tsx`, patient Phase A validation |
| Signed-in favorites | Favorites snapshot is tagged with the verified registered patient ID and rendered only for that ID. Pending/out-of-order responses cannot display another patient's saved items. | `apps/mobile/App.tsx`, Stage K and Phase A checks |
| Profile, family, notification preferences | Profile's family/notification settings, unsaved child form, consent and errors reset on account transition. Results from prior account request are discarded via per-effect cleanup; user ID change remounts the screen. | `apps/mobile/native-patient.tsx`, Phase A tests |
| SecureStore restore and sign-out races | A session generation and active bearer token guard async initial restore, refresh and private API result/401. Clearing a session removes private UI state before remote sign-out, and stale 401s cannot clear a newer user's session. Incomplete-onboarding accounts remain signed in during refresh rather than being treated as unauthorized. | `apps/mobile/native-auth.tsx`, PH16 auth contract and Phase A tests |
| Native account recovery | Account tab now has native **Forgot password** and **Resend verification email** actions. Reset email initiates through existing Better Auth; the reset link opens the patient web flow at the configured `EXPO_PUBLIC_PATIENT_WEB_URL`. Without that URL the app explains the limitation instead of showing a broken control or a fake success. Verified-email resend outcome is neutral to avoid account existence disclosure. Accounts using MFA must sign in via the patient web app until native MFA is fully implemented. | Native Auth, Account screen, existing PH01 reset integration |
| Booking time no longer available | On a server 409 booking-slot conflict, clear previously selected time, return to the time step, refresh provider availability, preserve service/dentist/subject and show a localized explanation. Do not silently resubmit the unavailable time. The review button requires a still-selected slot. | Native booking wizard and PH15/PH19 server contention checks |
| Booking result uncertain due to network | Preserve original idempotency key and booking details; show a **Check My appointments** action instead of stating that the booking failed. A retry using unchanged details continues to be idempotent server-side. | Native wizard, PH15 API and PH19 100-concurrent booking checks |
| Cancellation with stale revision | Show a localized conflict/status/deadline error and refresh the authoritative appointment list; do not blank existing appointments when one mutation fails. | Native appointments + API conflict integration |
| Error privacy and accessibility | Sign-in, family, booking, favorites and reviews map typed API codes to clear Dari/Pashto/English messages. Backend technical codes, token strings and raw errors are not shown to patients. The slot refresh notice is accessible; empty vs loading vs error states remain distinct. | `patient-errors.ts`, `native-reviews.tsx`, Phase A tests |
| Guest help | A guest in Settings is directed to **native Profile / sign-in** rather than an optional browser link; network failures no longer display developer environment variable names. | `App.tsx` |

## Smoke-test acceptance (synthetic accounts only)

1. Set up two verified synthetic patient users with **different** favorites, families and appointments. Sign into patient A, visit Saved, Family, Notifications and Booking; sign out and sign in as B. No frame, status, badge or saved draft may show A's private data. Test B in the middle of onboarding and again after completing onboarding.
2. Trigger expired session and a delayed previous API response while signing in as B. The older 401, refresh, family load and favorites load must not overwrite or sign out B. Test launch restoration of an incomplete onboarding session and a server-side revoked session.
3. Native sign-up → resend verification → sign-in. On the recovery form, request a password reset using a **reachable HTTPS patient-web URL**, then complete reset in the browser. Confirm old sessions cannot access private data afterward; test email-provider failure and rate limits. When the web URL is absent, the app must explain that completion is unavailable.
4. Book a real synthetic slot shown by approved public discovery. In another session book the exact slot first; then attempt confirmation in the first app. The first app must clear the chosen time and refresh alternatives without making a duplicate booking.
5. While the patient submits, intentionally interrupt connectivity after the server may have committed. The screen must prompt checking **My appointments**. Never claim an uncertain booking did not occur; do not change the idempotency key before checking.
6. Reschedule/cancel from an outdated revision after staff or another device modifies the appointment. A safe localized error appears, the appointment list refreshes and the user can navigate back to current details. Cancellation deadline and booking price/version rules remain server-enforced.
7. Repeat in English LTR, Dari RTL and Pashto RTL on a small Android device and with large accessibility font. Verify touch targets, inputs under keyboard, reduced-motion, screen-reader announcements, loading, empty and offline recovery states.
8. Verify the public directory remains accessible without sign-in and **no real patient/clinical data** is stored in AsyncStorage or in Expo public environment variables.

## Tests / operation

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm test
pnpm typecheck
pnpm dev:api
```

Run `pnpm dev:mobile` in a separate PowerShell terminal once the backend API tunnel is ready. The automated Phase A regression suite is `node --test tests/patient-phase-a-validation.test.mjs`. Existing PH01/PH15/PH16/PH19 real PostgreSQL HTTP integration is also mandatory in CI.

**Not part of Phase A:** new native MFA, independent medical-record release, SMS/push providers, new database tables, invented listings, real patient accounts in test fixtures or blanket regulatory certification. These are separate, explicitly gated tasks.

## Release gate

No new dependencies or DB migrations. The repository can be built/tested, but **clinical production release remains NO-GO** until the external PH19 acceptance and pilot roster are signed. Physical-device UX and web email completion require manual verification; CI does not prove them.
