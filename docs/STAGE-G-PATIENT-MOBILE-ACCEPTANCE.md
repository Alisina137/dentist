# Stage G — Patient Mobile Experience: Acceptance

**Scope:** Expo/React Native patient app only. This is the first targeted post-PH19 patient UX review, not a new clinical feature or a claim of production readiness.

## Implementation and expected behavior

| Patient journey | Acceptance |
| --- | --- |
| Home → specialties → Explore | Published specialties are **interactive**. Selecting one opens Explore and applies the live specialty filter; searching/browsing from Home clears a previously chosen specialty. All results still come from approved public discovery. |
| Explore filters | API/facet failures have a visible retry action; clearing filters resets the page. No synthetic providers, ratings or prices. |
| Refresh | Pull-to-refresh remounts the **active patient data view** (Home, Explore, Appointments, Saved, Account) and refreshes connectivity independently, rather than changing only a connection badge. Private responses are not persisted locally. |
| Navigation | Android hardware Back closes detail views, returns a booking to its referring dentist when appropriate, returns a reschedule to Appointments, then falls back to Home before leaving the app. Bottom navigation stays mounted while switching tabs. |
| Appointments | Confirmed/requested upcoming bookings are separated from completed/past and cancelled/rejected/no-show; upcoming is sorted by earliest time; accurate localized status labels replace the incorrect catch-all cancelled label. Cancellation and rescheduling are hidden after confirmed-booking cutoff; pending requests can still be cancelled while future. Server remains the authority for allowed actions and revision conflicts. |
| Booking | The booking wizard shows a spinner while **live** slots load, does not announce "no slots" while loading or after network failure, and uses a localized calendar in the ribbon, slots, review and receipt. No mock slots or accidental booking requests. |
| Account | Account navigation is split into **Profile, Reviews, Settings** instead of stacking unrelated forms. Patients can sign out even before finishing onboarding. Signed-in Account, Appointments, Booking and Saved layouts follow Dari/Pashto RTL or English LTR. Fields have accessible labels, appointment statuses have semantic warning/danger colors and cancelling is a visibly destructive action. Refresh and error states do not show stale favorites as if validated. |

## Technical constraints

- No new database migration, external dependencies or API contract changes.
- Uses the existing verified-booking, family authorization, signed-in favorite, and public discovery endpoints. Backend permission checks are unaffected.
- Native patient preferences are device-local only; no clinical records are written to AsyncStorage.
- Appointment dates use the configured Solar Hijri or Gregorian **display** calendar with Afghanistan timezone. ISO/Gregorian values remain the backend scheduling source of truth.
- The PH19 rollout gate remains blocked by default. Health-data privacy, credential checks, translations, actual device accessibility, and regulatory review still require independent evidence.

## Automated verification

- `node --test tests/stage-g-patient-mobile-validation.test.mjs`
- `pnpm test`
- `pnpm typecheck`
- `pnpm --filter @dandanlink/mobile build`
- Repository CI must pass before merge to `main`.

## Manual Expo Go acceptance on Android

1. Start the API and ngrok with `pnpm dev:api`; start Expo with `pnpm dev:mobile`. Use a reachable `EXPO_PUBLIC_API_URL`.
2. In Dari, Pashto and English: search from Home; tap a **real** specialty; verify Explore filter/result/facet error and clear behavior.
3. Pull down Home, Explore and Appointments after making a server-side data change; verify the data re-loads and the bottom tabs do not disappear.
4. Open Home → Clinic → Dentist → Booking. Press device Back and inspect the route sequence. Enter rescheduling from Appointments and confirm Back returns to Appointments.
5. Check requested, confirmed, completed, no-show, rejected and cancelled bookings with a real test patient. Confirm correct grouping and labels. Advance past the clinic's cancellation cutoff and confirm actions are hidden while the API still rejects an unauthorized direct attempt.
6. Test a slow connection in Booking: loading indicator must appear until slots resolve; error is not a false empty slot list. Change the app calendar and verify dates in slots, review and receipt.
7. Sign in without completing onboarding and confirm Sign out works. Check profile, Appointments and Saved in both RTL languages including small screens and large font settings.
8. Test offline, session expiration, notification delivery and screen reader focus with authorized, synthetic pilot data. No production patient data or secrets in screenshots or logs.

**Not claimed by automation:** device-level RTL visual perfection, real clinic workflow approval, external healthcare compliance or a certified production release.
