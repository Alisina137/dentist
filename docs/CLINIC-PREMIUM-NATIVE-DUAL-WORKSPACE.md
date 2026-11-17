# DandanLink — Premium Clinic UI + Native Patient/Clinic Workspace Gateway

This is a **UI/UX and native workflow release**, not healthcare pilot authorization.
The independently controlled `PH19_PILOT_RELEASE_ENABLED` gate remains untouched. Do not use real protected patient records until clinical, legal, privacy, security, backup, accessibility and operational approvals are complete.

## What is included

### Clinic web — stricter premium visual refresh
- Authenticated clinic-only design tokens: crisp white operational cards, slate/ink persistent sidebar, clear high-contrast selected navigation, restrained cobalt controls, consistent form fields, active status chips, shadows, responsive header and keyboard focus rings.
- Covers existing dashboard, patients, reception, appointments, finance, scheduling, staff, reports, security and quality workspace **without removing a tab, changing endpoint permissions or altering clinical chart/dental drawing layers**.
- The persistent sidebar and topbar remain mounted during route navigation; the dedicated new stylesheet loads last so older per-phase page styles do not override the final common surface.
- 900px mobile drawer and 600px small-phone layout, accessible focus and reduced-motion support, English / Dari / Pashto RTL. Manual screen-reader and live-device verification is still required.

### Native Expo Go — two safe experiences
On first launch of `pnpm dev:mobile`, the app shows a polished onboarding selector:
- **Patient** — existing native guest discovery, secure signup/login, bookings, favorites, family, released records and account functions remain unchanged. The patient header adds an explicit clinic/patient switch.
- **Clinic / Dentist** — independent native clinic signup and sign-in (email verification required, MFA accounts continue on clinic web). Server-authenticated memberships, roles and chosen clinic are loaded from `/v1/team/context`. Patients and clinic bearer tokens occupy separate SecureStore keys. Only the chosen public role is stored in AsyncStorage; no token, patient, staff or clinic private identity is stored in AsyncStorage.

#### New clinic native registration flow
1. Create/verify account or sign in; invited clinic dentists/staff sign in using their existing account and server membership.
2. Clinic identity: registered/display names, clinic type (solo, dental office, specialty), province, city, district, full address, phone, email, optional license number, and **expected number of dentists** (1–500).
3. Select only an active plan returned by the API with its real price, billing period, trial days, staff capacity and branch capacity.
4. Review and **save real clinic draft** through the same `POST /v1/clinics` used by web. The projected dentist count is persisted as `planned_dentist_count` (migration 0022), visible in web clinic onboarding and mobile owner summary. This is a capacity estimate, **not** a credential verification or an actual dentist roster.
5. Open existing secure **clinic website onboarding** for license document upload (PDF/PNG/JPEG 2 MB), explicit authorized-owner attestation, independent approval and further staff/doctor credential verification. Web login may be required separately. The mobile app does **not** pretend that a saved draft was submitted/approved.
6. Once a real authorized membership exists, the native clinic tab shows selected clinic, role, status, real 7-day appointment overview, active services, chairs, open days, **actual scheduled dentists** and direct web handoffs for staffing/operations. All private GETs are bearer-authenticated, bounded, aborted on tenant switch; no fabricated data and no mobile patient/finance writes added.

Mobile clinic interface includes Overview, Registration, Team & Dentists, Account tabs; language EN/Dari/Pashto; signout and switch mode. Owner registration creates a draft, **never a public listing or verified dentist**. Follow-up full native document upload, credential onboarding and clinic workflows would need their own security/UX phases; they are intentionally kept on the existing audited clinic web routes for now.

## One-time update / run

**New database migration 0022 is mandatory before using the native clinic flow**. In PowerShell terminal from the Windows local repo:

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm db:migrate
pnpm dev:api
```

In a **second** PowerShell terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

The current Expo SDK is 57. Your phone's Expo Go must match SDK 57.

The API origin should continue using your working `EXPO_PUBLIC_API_URL` setup, normally the development ngrok HTTPS URL from `pnpm dev:api`. For clinic web deep links on a physical phone, set the **optional** mobile env variable `EXPO_PUBLIC_CLINIC_WEB_URL` to your reachable HTTPS clinic web origin; `localhost:3001` only works on the development PC, **not your Android phone**. If no public clinic web origin is available, drafts can still be saved through API but license uploads and full management must be completed from the clinic web on the PC. Never use a temporary untrusted origin for private documents or expose dev hosting to real patient records.

## Acceptance checklist (synthetic data only)

| ID | Expected | State |
| --- | --- | --- |
| UX-01 | Fresh Expo Go install opens mode choice in EN/Dari/Pashto with two clearly described paths; chosen mode persists | CI source/logic + **device pending** |
| UX-02 | Patient retains existing guest/browse/signup/login, appointment, family, records and logout behavior | Regression CI + **device pending** |
| UX-03 | Switch mode from patient header safely signs out the patient and returns to role selection | CI source + **device pending** |
| UX-04 | Clinic signup requires verified email, uses Bearer+SecureStore and never bypasses MFA | CI checks + **device pending** |
| UX-05 | Register owner clinic, validate fields/plan, save draft; count persists after reload; no duplicate submission | Unit/source + **staging pending** |
| UX-06 | Doctor/cashier/receptionist sees only membership-authorized clinic and their server-authorized metrics | CI architecture + **staging pending** |
| UX-07 | Change active clinic during network delay: prior results cannot bleed into new clinic | CI structure + **network pending** |
| UX-08 | Real clinic license upload, attestations, independent reviewer approval remain on secure web | CI architecture + **human pending** |
| UX-09 | Test clinic desktop 1440px, tablet 900px, phone 375px and 320px; keyboard/screen reader, RTL, reduced motion and financially significant tables | **manual pending** |
| UX-10 | Healthcare production release remains NO-GO without independent signoffs and completed PH19 runbook | **BLOCKED — HUMAN** |

## Next native clinic work (not represented as already complete)

Full native license/document picker with hardened upload, native clinician credential enrollment, clinic operational mutations, appointment/queue management, dentistry record editing, financial settlements, and advanced audit/recovery UI require independent feature-specific tests and human review. The current version does **not** claim those are already natively available; the secure existing clinic web workflow remains their working interface.
