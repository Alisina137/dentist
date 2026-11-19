# DandanLink — Phase 28: Cross-Workspace Functional & Release Audit

## Executive result (engineering, not production clearance)
**Phase 27 is on `main`** (PR #81, merge `250bb6a51797c1293a63df8aae7b107984ee2654`, CI successful). Phase 28 performs a **code-level and CI-aided audit across platform Admin, Clinic Web, Patient Web and both native Expo paths**. This is not a claim of having visually inspected every mobile screen on a physical device or completed a clinical penetration test. **PH19 healthcare-production release remains NO-GO** until independently signed evidence is reviewed.

### Coverage inventory

| Surface | Examined routes/modules | Finding / response |
| --- | --- | --- |
| Platform Admin | Persistent admin layout/shell; /admin, clinics, dentists, listings, reviews, subscriptions, plans, support, analytics, security, settings, pilot | **P0 fixed**: protected child component could mount while the role was still loading or denied. Now uses fail-closed content gating with owner/admin/support-specific routes, separate offline retry, and an access recheck after returning from a dormant browser tab. |
| Clinic Web | Persistent clinic shell and sidebar, member role routes; appointments, patients, medical records, staff, finance, services, security/subscription; PH19 API gate | **P0 fixed**: direct links to an unauthorized detail page were not explicitly checked by the persistent UI shell even if not in the sidebar. A role/deep-route gate now prevents mounting chart, visit, file, treatment, billing, edit, staff, appointment-request, and owner-only settings pages for unauthorized viewers. API permissions remain authoritative. |
| Native Clinic | Clinic / Doctor onboarding, real overview, reception, patient directory, staff, operations, account/settings, Better Auth MFA | Source and regression audits confirm distinct clinic/membership keys, server-scoped reads, MFA-protected staff writes and opt-in patient contact reveal. **Device verification required**: Expo Go Android/iOS HttpOnly 2FA cookie continuity (Phase 26), RTL touch/keyboard, network and background checks. |
| Native Patient | Public discovery, appointment wizard, account/notifications, family, records, SecureStore-backed session | **P1 fixed**: MFA-enabled patient accounts previously hit `MFA_WEB_REQUIRED` even though clinic native and web already used Better Auth TOTP. Now the patient uses the **same** existing HttpOnly cookie + TOTP/backup challenge and validates a signed bearer + verified email before mounting the account. No new MFA backend, token type, or password bypass. |
| Patient Web | Public clinic search, approved listing profile, appointment requests, account/family/preferences/privacy/security | Routes and source guards checked in the inventory and existing suite. All real-patient production booking and clinical use remains gated; independent phone-browser UAT pending. |
| API / Data | Better Auth; staff scope, directory scope; appointments, clinical/records/treatment; billing, notifications, patient enrollment; release switch and Postgres-backed integration | Server permissions remain separate from the navigation gates. **P0** PH19 signed clinical/go-live gate has **not** been overridden; no new migrations or packages. |

## Actual fixes included in Phase 28

### 1 — Platform Admin authorization and reliable offline state
The previous admin persistent shell populated `role="loading"` but continued to mount `{children}` in its main region. An unauthenticated, offline or support-only user could therefore briefly see the structural content of a restricted route, even though individual APIs were separately protected. The correction introduces an independent, strictly allowlisted `adminPageGate` and `validAdminIdentity` model. Only `admin` can mount the full administration workspace; `support` may mount **Support** and **Analytics** only; `user`, loading and transport-error states get distinct login, spinner and retry panels. Non-401/403 network failures no longer pretend the user lacks permissions. The shell also rechecks privileges after returning to a browser tab inactive for a minute, pausing protected child rendering while revalidating.

### 2 — Clinic Web deep-link / role boundaries
Previously a user who could see a broad parent tab could navigate directly to a nested route with fewer UI guardrails. `clinicPageAllowed` now requires an explicitly allowed sidebar destination and applies tighter secondary rules for patient chart/visit/treatment/files, patient billing/edit/new/import, own-vs-other staff member profiles, appointment creation/request queues, and owner-only subscription/export. The `/clinic` root **never** acts as a wildcard. A localized restricted panel replaces forbidden children while the sidebar remains mounted. **The server still checks user membership, clinic tenant, clinician assignment and roles on every private API**; this UI gate is defense in depth, not a security boundary by itself.

### 3 — Native patient 2FA continuity
The patient secure account provider now uses the same native auth helper already exercised in clinic Phase 26. Password sign-in with MFA returns a **short-lived unverified pending challenge**, not a session. A new native patient MFA screen presents TOTP (6 digits) or one-time backup code in English, Dari and Pashto, with countdown, cancel, masked input, secret wipe when switching to another app, and secure clinic/patient website fallback. **Only after Better Auth final 2FA verification**, a signed bearer in `set-auth-token`, email-verified `/api/auth/get-session`, and the patient's server profile does the provider save the bearer in SecureStore and mount private patient views. Expired, altered or ambiguous verification fails closed; no automatic OTP replay, TOTP secret storage or trusted-device shortcut.

### 4 — Cross-workspace regression matrix
New `tests/clinic-phase-28-cross-workspace-audit.test.mjs` exercises permission decisions for administrators/support, clinic owner/manager/dentist/receptionist/assistant/cashier and nested private clinic links. It checks authentication view mounting, staff self/other limitations, signed bearer validation order, patient MFA lifecycle/secret storage boundaries, source entrypoints and PH19 release gate. Existing database-backed CI, mobile TypeScript and production JS bundle checks remain required.

## Remaining issues — owner-visible priorities

| Priority | Remaining work | Acceptance before go-live |
| --- | --- | --- |
| **P0 / RELEASE BLOCKER** | PH19 independent human legal/privacy, clinical safety, hosted encryption, backup restore, penetration test, privileged access, alerts, RTL accessibility and pilot roster signoffs | Signed, dated artifacts verified by appropriate reviewers, not just environment flags |
| **P0 / DEVICE BLOCKER** | Android/iOS Expo Go MFA HttpOnly-cookie propagation for **both** Clinic and Patient, interrupted TOTP, backup-code consumption, session resume/revoke | Real-device videos and logs with synthetic accounts, no secrets captured; test latest app state |
| **P1** | Cross-role staging scenario per clinic and provider: owner invites dentist, independent credential verification, schedule, patient registration, queue, chart authorization, notifications and subscription | Synthetic identity matrix; repeat after role revocation; no patient-contact or chart leak |
| **P1** | 320/360/414 dp layouts, landscape, keyboard focus and TalkBack/VoiceOver for English, Dari and Pashto | Screenshot/interaction evidence and human accessible navigation signoff |
| **P1** | Production-grade observability for 401/403/409, patient booking partial failure, staff invite delivery, notification queue failures and DB backup alarms without PHI | Tested alert routing, retention and runbook |
| **P2** | Patient/clinic account switching on low-connectivity devices, offline drafts, saved favorites, locale/calendar changes and partially finished forms | State purge and replay-safe retry on real devices |
| **P2** | Patient and clinic form edge cases (long texts, leap dates, slow phones, null optional address and photo upload failures) | UAT with synthetic multilingual data and backend rejection tests |

## Synthetic-data acceptance sequence

1. **Admin:** Try direct `/admin/clinics` as support; protected admin content must not mount. Use support analytics & tickets; try with browser offline and press Retry. Sign out, open a protected URL in a new tab and confirm no cached private content appears.
2. **Clinic Web:** Test cashier deep-link to another patient's chart (denied) and their own finance area (allowed); receptionist patient edit vs chart; dentist clinician visit; unverified manager chart denial; owner subscription. Repeat after membership suspension and clinic switch.
3. **Clinic Native:** Enroll TOTP on secure clinic web, sign in on Expo Android, leave to authenticator, return and verify. Test invalid, expired, recovery, no-HTTP-cookie conditions and logout. Run appointments, team, operations and settings for each synthetic role.
4. **Patient Native:** MFA-enabled verified patient sign-in, recovery code, expired challenge, wrong code, offline failure and return from authenticator. Verify pending MFA never opens private family or booking data.
5. **Patient Web:** Search only approved clinics, preview rather than fake bookings, test booking consent/validation, family authorization, and verified release of medical records.
6. **Security:** Verify production policy blocks protected writes until *all* independent PH19 flags and human evidence are approved; audit access logs without exposing private patient/OTP data.

### Local Windows commands (no migrations/dependencies)

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

In another PowerShell window:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

For web UAT use `pnpm dev:admin` and `pnpm dev:clinic` in separate terminals as supported by the repository scripts. Run the existing CI test suite before deploying; review the Phase 28 merged PR and signed PH19 acceptance document.

**Phase 28 completion criterion:** audited and fixed the three identified code-level problems, green GitHub CI, tested models and acceptance checklist committed. **Not** proof of production readiness, full visual parity, deployed URL availability, or real-device MFA success.

### Phase 29 proposal
Complete instrumented multi-account E2E synthetic scenarios and real Android/iOS MFA tests; address any practical gaps found. Do not merge work that disables clinic/patient role checks or PH19 gate for convenience.
