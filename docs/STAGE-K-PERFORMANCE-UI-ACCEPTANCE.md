# Stage K — Performance, Loading States & UI Polish

**Baseline:** DandanLink PH19, Stage G patient navigation, Stage H clinic command center, Stage I scheduling and patient visit workflows, and Stage J role-aware notifications and synchronization.

**Status:** UI and data-loading implementation. This stage does not certify clinical use, production compliance, accessibility conformance, or specific device performance.

## Delivered work

| Surface | Change | Why it matters |
| --- | --- | --- |
| Clinic command center | Realistic skeleton variants for appointment/patient metrics, booking request summary, operational readiness and upcoming appointments; accessible busy state and dedicated error/retry state. | Prevents a blank or shrinking dashboard while real data loads, without inventing patient/operational totals. |
| Staff workspace | Existing tenant-aware staff hook now ties a response to the request path and uses an AbortController with 10-second timeout. Generic loading text replaced with an accessible content-shaped skeleton. | Avoids displaying another clinic's older data while loading and keeps expected workspace geometry. |
| Mobile discovery | Public clinic search results and facet fetch state bound to exact requested path; older requests cancelled on route/filters changes. | Prevents stale clinic cards or search results appearing for the wrong city, specialty or page even transiently. |
| Native discovery loading | Three static skeleton clinic cards with a subtle native-driver opacity pulse, which is **disabled** if the phone's system Reduce Motion setting is on. Animation loop is stopped on unmount. | Responsive feedback without fabricated results or third-party animations, while respecting accessibility preferences. |
| Native appointments | Appointment responses are tied to the authenticated patient user ID and a request generation. Earlier/out-of-order responses cannot overwrite a newer request. No prior patient's bookings or outdated cards appear while loading or on errors. | Safe, privacy-conscious last-request-wins data state. |
| Native appointments/saved | Localized, consistent placeholder cards rather than spinner-only views. English, Dari and Pashto loading messages. | More predictable loading layout on small screens. |
| Patient web booking | Added distinct, content-shaped skeletons for form setup, appointment lists and available time slots; error/retry does not masquerade as an empty appointment list. | Clear distinction between loading, empty, error and genuine data. |
| UI refinement | More legible native tab labels, active-tab pill, pressed CTA/navigation feedback, progressive Android image rendering, clearer keyboard focus, responsive grids, and subtle clinic card entry motion. | Improves touch affordances and clarity without new dependencies or expensive renderers. |

## Security and reliability boundaries

- No patient/clinical details are embedded in loading placeholders, persisted in local storage, or fabricated.
- Existing backend checks for clinic memberships, patient consent, subscription, authorization, and clinical record releases remain authoritative.
- All new UI animations have a static/reduced-motion fallback; the native loader uses React Native's built-in animated native driver.
- Tenant-specific staff reads and patient-specific booking reads discard obsolete results. Failed network requests show errors and Retry, not "zero records."
- There are **no** new packages, database schema changes, API endpoints or migrations.

## Acceptance checks

1. Visit **Clinic Dashboard** with a slow network; check skeleton geometry in every card. Under network failure each affected card must show a retryable error, not fake zero totals.
2. Navigate Clinic → Staff → Staff detail and change clinics during a deliberately delayed API response. Confirm staff records of the former clinic are never rendered and retries function.
3. In Expo Go, search clinics; quickly change city, specialty, sorting and page while data is loading. Confirm only the correct query's listings render. Test slow and offline states.
4. Test **System Reduce Motion: ON/OFF** on Android. Skeletons should be static when ON and pulse subtly when OFF; leave the screen while loading to confirm animations stop.
5. Log into a synthetic patient account, open Appointments, then switch authenticated accounts after signing out. Confirm no previous patient's appointments appear. Test two rapid refresh requests and airplane mode.
6. Check Saved and Appointments loading placeholders under 320–420 px widths, English/Dari/Pashto, large font setting, and RTL direction.
7. Load patient-web booking with slow services/slot APIs. Verify form/slot skeleton variants, empty slots only on true empty success, and retry/error semantics.
8. Inspect keyboard focus, screen reader loading announcements and mobile active navigation. No interactive input should be blocked by decorative skeletons.
9. Perform a manual timing comparison in device dev tools for network response and rendered readiness; **no numeric performance improvement is claimed without measurements**.

## Automated verification

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Added `tests/stage-k-performance-loading-validation.test.mjs`; CI must also pass Expo Android bundling and PostgreSQL integration before this branch merges.

## Next step

Stage L is production-readiness validation, security hardening and final cross-role regression review. Existing DandanLink healthcare pilot/production approvals are required before use with real patient data.

**Local update when Stage K merges:**
```powershell
git -C C:\projects\dentist pull --ff-only origin main
```
