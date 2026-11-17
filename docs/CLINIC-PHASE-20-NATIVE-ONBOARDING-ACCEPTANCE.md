# DandanLink — Clinic Mobile Improvement Phase 20
## Complete Native Clinic & Doctor Onboarding (Expo SDK 57)

**Engineering delivery only. Real-patient production remains NO-GO until independent PH19 signoffs.** This phase extends the dual-mode Patient / Clinic Expo app delivered in PR #73. It uses the existing, server-owned clinic, licensing and professional credential workflows; no client role or review decision grants are introduced.

### Delivered

**Clinic owner (native mobile)**

1. Sign in with verified Better Auth email; opaque clinic bearer remains in native SecureStore, never AsyncStorage.
2. Create the clinic draft using the existing real `POST /v1/clinics` flow: registered/display names, practice type, location, address, phone, email, optional license number, expected dentists (1–500), and a real published subscription plan.
3. The new **Registration** tab retrieves the owner-only `GET /v1/clinics/:id` (including revision, selected plan, current review status, evidence metadata and bounded review decision history). It shows a **five-step progress checklist**: identity, subscription, license document, submission, independent approval.
4. Review or update the clinic draft with server-enforced optimistic `PATCH /v1/clinics/:id` revision. Pending, approved or suspended clinic identity cannot be silently edited via native UI.
5. Pick genuine **PDF/PNG/JPEG** via SDK57 OS document picker, maximum **2 MiB**. Expo File System reads the copied local file, checks length and file signature, sanitizes the HTTP header filename, then posts `application/octet-stream` using the existing authenticated `POST /v1/clinics/:id/evidence`. Server checks owner/clinic/state, file bytes, SHA-256 and MIME, and stores private evidence without public URL. The picker file body is never persisted to AsyncStorage, printed in logs or sent in query strings.
6. Explicit permission attestation checkbox and human confirmation precede the existing `POST /v1/clinics/:id/submit`. Submitting requires a real saved plan and clinic license; the server transitions the request to **pending independent review**. The app never labels a draft as approved, automatically approves an unverified professional or launches live clinical care.
7. The review history and approval state remain visible to the owner; rejection/needs-info can be corrected and resubmitted, with new evidence as appropriate.

**Invited doctors / staff (native mobile)**

1. After verified sign-in, users can paste a secure invitation token, preview a clinic/role without trusting client-chosen privileges, then accept it via `POST /v1/team/invitations/accept`. Server validates invited email, token digest, expiry, seat count and prevents conflicting membership.
2. Clinic owner/manager **with active MFA** may invite a dentist from mobile; backend enforces role ceiling and subscription capacity. Other roles never receive an invite permission.
3. Doctors (and eligible owner-clinicians) can see and edit their own professional draft fields: display name, specialty, qualifications, professional-license number, experience years, biography. Writes target `POST /v1/team/clinics/:cid/staff/:membershipId/dentist`; the server enforces active membership, self/management permissions, MFA for edits to others, and optimistic draft version.
4. Native credential evidence collection accepts only genuine PDF/PNG/JPEG, maximum **1.5 MiB**. For the existing credential API, it validates/sends base64 within the bound, with credential type/number, future expiry date, explicit authenticity checkbox and confirmation. The server enforces dentist self/manager scope, protects against concurrent pending submissions, stores the evidence privately, and routes it to independent reviewer moderation; no automatic professional verification.
5. Authorized owner/manager sees real staff-affiliated dentists from `GET /v1/listings/clinics/:cid/dentists` and a distinction between pending, unverified and **currently verified** professional credentials. No invented number of doctors, fake badges or locally granted role.

**Security, UX, operations**
- English, Dari and Pashto content, RTL-aware composition, 44+ point touch targets, accessible checkbox and status cards, no spinner wiping the persistent app navigation.
- Every protected Phase 20 request checks the live SecureStore-backed clinic bearer, verifies generation on response and stays clinic-scoped. Changing clinics or signing out discards private page state.
- Failed or uncertain uploads have no automatic retry. The owner must refresh evidence list before trying again to avoid duplicate uploads.
- The existing patient experience and all clinic/admin web functions remain available.
- A new device-level dependency is installed: `expo-document-picker@57.0.3` and `expo-file-system@57.0.7`, locked for Expo SDK57.

### Pull and run on Windows PowerShell

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev:api
```

Then in another terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

**Database:** No new Phase 20 migration. Running `pnpm db:migrate` is safe and ensures the preceding Phase 19/PR #73 migration `0022_clinic_planned_staffing.sql` is present. Do not run parallel databases or mismatch API origins. Real Android Expo Go SDK 57 is required.

### Manual staging acceptance — use disposable synthetic clinics, never real patients

| ID | Validation | Status |
| --- | --- | --- |
| C20-01 | Owner signs up, verifies email, signs in, creates clinic with 1–500 expected dentists and real published plan | CI logic + **device witness pending** |
| C20-02 | Registration tab shows 5 real status steps and correct document/review history, no false approved label | CI logic + **device pending** |
| C20-03 | Pick tiny authentic PDF/PNG/JPEG, upload under 2MiB with Bearer; mismatched signatures, HTML ngrok, oversized and canceled documents are rejected | CI contract + **device/network pending** |
| C20-04 | Submit without real saved license or explicit attestation fails; successful submit is pending independent review | Server integration + **manual pending** |
| C20-05 | Server-side rejection/needs-info can be edited, with revision check and no auto-approval; pending edit blocked | Server regression + **manual pending** |
| C20-06 | Owner/manager MFA invitation, verified email token acceptance and multi-tenant role isolation | Existing backend guard + **manual pending** |
| C20-07 | Dentist self-profile and future-valid credential evidence (<1.5 MiB) create pending review; verified only after independent signed decision | Backend + **manual pending** |
| C20-08 | Offline, slow network, expired token, clinic switch mid-request, app sleep/reopen and keyboard accessibility in EN/Dari/Pashto | **manual pending** |
| C20-09 | Existing patient login, bookings, family, files, and original web registration are unchanged | Automated regression + **device pending** |
| C20-10 | Healthcare production release remains prohibited without PH19 independent legal, clinical, security, privacy, backup and staff approval | **BLOCKED — HUMAN** |

### Next — Phase 21

Premium native clinic dashboard: stronger daily operational information hierarchy, role-aware shortcuts, appointment/queue previews, practical today workflow (read-only in protected environments), loading/offline/retry UX and cross-device manual validation. Phase 20 is about secure onboarding and verification; it does not assert that full native payments, clinical writing and booking mutations already exist.
