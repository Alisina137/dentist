# DandanLink Patient — Phase B: navigation & patient journeys

**Scope:** Native patient Expo application, following Phase A security/booking reliability. **No database migration and no fabricated bookings or clinical records.** PH19 privacy/legal/clinical/security release approvals are still required before real patient data.

## Implemented screens and workflows

| Journey | Implementation | Evidence to check |
| --- | --- | --- |
| Home for signed-in patients | An account-scoped upcoming-appointment summary loads from `GET /v1/booking/my`, considers only real requested/confirmed future visits, chooses the earliest start time, shows exact status, treatment, patient and Kabul-local date. Clear loading, retry and no-upcoming states. Guests do not make this private request. | `NativeNextAppointment` in `native-journeys.tsx` |
| Home quick access | Explore, Appointments and Saved each have a dedicated, accessible quick-action control. Public discovery and existing verified clinician search remain unchanged. | `HomeScreen` in `App.tsx` |
| Appointment detail | Every appointment row offers **View details** and opens its own native route. The screen fetches `GET /v1/booking/my/:bookingId` afresh under the current verified patient ID; no previous patient's booking is rendered. It shows the current server status, patient, clinic, service, Kabul-local start/end times, published estimated price, full reference, clinic contact and available actions. | `NativeAppointmentDetails` and `NativeAppointments` |
| Correct appointment actions | Confirmed/requested future appointments can be cancelled/rescheduled only before the applicable clinic cutoff (the backend remains authoritative); cancellation uses a current revision and prompts for confirmation. A 409 causes a fresh server read and a localized message. No invented history events are claimed: the detail explicitly labels the status as current, not a full audit timeline. | Native appointment detail + PH15/PH19 integration |
| Appointment navigation | Open detail from Home or Appointments; Back returns to the prior tab. Open clinic from detail; Back returns to the original appointment detail. Rescheduling returns to Appointments. The bottom five-tab navigator remains stable on list screens, while details use a dedicated header. | `Route` and `back()` in `App.tsx` |
| Clinic profile sections | Four sections: **Overview / Dentists / Services / Availability**. Overview retains clinic facts, reviewed images with optional **View all**, verified dentists, published service estimates and full opening hours. Booking, call and directions remain accessible. | `ClinicScreen` |
| Account hub | Account opens a home screen with clear routes to Appointments, Family, Shared Records, Reviews, Profile, Notifications, Security, Preferences and Support. It separates the native Profile / Family / Notifications forms into their own views and supplies accessible Back navigation. Guest users get native sign-in, not a broken web link. | `AccountHub`, `NativeAccountArea(section)` |
| External-only destinations | Shared clinic records, session-security management and support link to the optional patient web application **without transferring native bearer tokens**. If the website is unavailable, the app explicitly says so. Separate clinic authorization and releases still gate records. This phase does not represent these as new native APIs. | `AccountWebSection` |

### Automated validation

The new `tests/patient-phase-b-validation.test.mjs` regression suite guards routes, account scoping, no synthetic bookings, localization and four-tab clinic structure. Existing A–L tests, full TypeScript checks, Expo Android bundle, and PostgreSQL backend integration must pass in GitHub CI before merge.

### Manual Android/iOS Expo Go acceptance (synthetic accounts only)

1. **Guest**: Home has no private appointment card; search, Explore and Saved work; Account opens the hub and Sign in opens native login.
2. **Patient with no appointments**: Home displays the honest no-upcoming state and a Find Care shortcut. No example booking is inserted.
3. **Patient with requested/confirmed visits**: Home shows the earliest future booking, with localized time and true status. Tap **View details**; check patient, clinic, treatment, published estimate, reference and the clinic contact number match `/v1/booking/my/:bookingId`.
4. **Multi-account protection**: Sign out of A and sign in as B. Open Home, appointments, account/family/notifications and detail routes. No stale A data may appear even for a moment.
5. **Booking change/cancellation**: Cancel a synthetic upcoming appointment after confirmation, then reopen detail and check that status and available actions update. Try an expired revision, cutoff, and a clinic reschedule from a different session. The backend must reject invalid actions.
6. **Clinic navigation**: Open a clinic and confirm the four available sections. Expand the gallery (all approved photos accessible), inspect actual hours, visit dentist profiles, and open live availability. From appointment detail → clinic → Android Back, the original appointment detail should return.
7. **Account organization**: Check Profile, Family, Booking Updates, Reviews, Settings as distinct screens. Records, Security and Support must truthfully open the configured website or show its unavailability. No private bearer token is included in the URL.
8. **RTL and screen sizes**: Test Dari/Pashto RTL, English LTR, small phones, large text scaling, keyboard focus and screen readers. Confirm back, primary actions, empty/error states and quick shortcuts.
9. **Low connectivity**: Simulate a slow/offline upcoming-appointment load and a delayed detail request. Home and detail should show nonfabricated loading/error/retry states; never show another account's information.

### Deployment commands

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

After the API tunnel is ready, in another terminal run:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

No new packages/migrations are introduced. Set `EXPO_PUBLIC_PATIENT_WEB_URL` to a reachable patient website if using the web-only Records, Security and Support actions; the patient website must validate its own session and clinic record grants.

**Gate:** Automated builds/test success is not a production medical-data, consent, accessibility or legal sign-off. Keep `PH19_PILOT_RELEASE_ENABLED=false` until all independently evidenced approvals in `docs/PH19-PILOT-RUNBOOK.md` are complete.
