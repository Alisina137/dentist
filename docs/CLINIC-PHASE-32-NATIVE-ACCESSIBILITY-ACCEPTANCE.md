# DandanLink — Clinic Phase 32: Native Session Recovery, Accessible Onboarding and Device UAT

**Engineering status:** Native changes and automated regression tests delivered. **Physical Android/iOS testing is NOT RUN** in this environment. This phase does not remove PH19's independent clinical, privacy, security or healthcare release gates. **Healthcare production pilot remains NO-GO.**

## Functional changes

### 1. Patient native: recover without leaking private records

On app backgrounding, the authenticated patient account view is hidden immediately and any outstanding authentication result is invalidated. When the app becomes active again, Better Auth's current session and the patient profile are checked against the server before private account, family, bookings or records can remount. A failed/expired/revoked session cannot reuse the previously rendered private account. Transport failures display a safe network state and keep private data hidden; they do not turn a network error into a confirmed booking.

- On workspace switch, **clear the account and SecureStore token before changing the workspace**, without blocking for an offline server sign-out request. Remote revocation is attempted best-effort; it is not falsely reported as confirmed when offline.
- A failed secure storage deletion now **blocks the workspace switch** instead of silently restoring a previous user's token on next launch. Sensitive account state is cleared in memory.
- The native component's previous identity guard still prevents stale personal routes, favorites, details and drafts from appearing under a different patient account.

### 2. Clinic native: re-check account, role and clinic on resume

On app suspension, revoke all rendered clinic, clinician, team and patient-related views immediately in memory; invalidate outstanding protected asynchronous responses. On return, the persisted bearer is revalidated through **Better Auth + real team context**, checking verified email, clinic memberships and role constraints. Clinic private UI remains on a spinner until this completes.

If the account has been revoked or membership has been suspended, the previous clinic workspace does not reappear. If the network is unreachable, no clinic data is rendered, and a retry panel is available; reconnecting does not fabricate permission. The clinic workspace switch explicitly refuses to proceed when deleting the secure device session fails. Clinic MFA code wiping and short-lived pending challenges remain unchanged.

### 3. Multi-lingual mobile accessibility and layout

- The clinic/patient onboarding selector has explicit radio states, accessible titles/labels, announced selected language, and an accessible Continue button; a decorative illustration is hidden at high system font scaling and at narrow widths.
- System font scaling triggers roomier patient/clinic navigation with two-line labels instead of hard one-line truncation. RTL moves the clinic header and navigation direction appropriately without changing any server permissions.
- Key onboarding language controls, switching controls and patient search/favorite buttons have **44 dp minimum touch targets**; common clinic font roles use less cramped, higher-contrast body text.
- Workspace persistence writes are serialized so an older asynchronous `removeItem` cannot overwrite a freshly selected workspace when quickly switching in low connectivity.

These are meaningful code-level improvements; the remaining screens still require live screen reader and orientation review on actual devices.

## Manual acceptance matrix (not executed)

`scripts/phase32-device-accessibility-check.mjs` generates **96 mandatory manual checks**:

- Android + iOS (2)
- Patient + Clinic (2)
- English + Dari + Pashto (3)
- 320 dp portrait, 360 dp portrait, 414 dp portrait, landscape, screen-reader heading/control order, 200% system text scaling, offline/background/resume, and revoked-session/workspace switching (8)

Each starts `NOT_RUN`. To record an independently witnessed `PASS`, a reviewer must manually inspect the device with **synthetic, verified test accounts** and enter only an external generic evidence ticket (`PH32_UAT_0001`) and UTC timestamp. `FAIL`, `BLOCKED` or `NOT_RUN` remain incomplete. No screenshots, patients, emails, cookies, session IDs, clinic identifiers, GPS, OTPs or medical data belong in this manifest.

#### Operator commands (PowerShell)

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm qa:mobile:accessibility:init
# Manually inspect both supported OS devices, all locales and both workspaces.
# Only after a witnessed PASS, edit .patient-acceptance/phase32-device-accessibility.json:
# set status=PASS, ticket=approved sanitized external ticket ID,
# observedAt=a genuine UTC ISO timestamp.
pnpm qa:mobile:accessibility:verify
```

The tracker is created under git-ignored `.patient-acceptance/` with restrictive file permissions on compatible platforms. `--init` refuses to overwrite existing evidence. `--verify` fails closed on unknown/duplicate case IDs, extra fields, secrets masquerading as tickets, future/malformed timestamps or any incomplete case. A completely marked checklist still sets `releaseApproval:false`; **a signed clinical and accessibility review is independent**.

Use `pnpm dev:api` with a reachable local HTTPS API tunnel or LAN and `pnpm dev:mobile` with Expo Go SDK57 to perform actual Android checks. Expo iOS JS bundling in CI is **not** evidence of physical iOS operation. Test with limited/failed networking, expired/revoked sessions, foreground/background changes, portrait/landscape rotation, VoiceOver/TalkBack, an external authenticator, and large device font scale.

## Automated acceptance

- `tests/clinic-phase-32-native-resume-accessibility.test.mjs` checks foreground/background transition decisions, live account/clinic revalidation and failure hygiene, secure workspace switching, 44 dp hit targets, high font scale/RTL source wiring, and 96-case fail-closed evidence validations.
- The existing Phase29 32-case MFA tracker and PostgreSQL synthetic journey, Phase28 cross-workspace permission tests, and mobile Android/iOS bundle checks remain in CI.
- `pnpm test`, `pnpm typecheck`, `pnpm build`, full PostgreSQL integrations, Expo iOS/Android JS export are unchanged.
- No migrations or new dependencies. No PH19 flags, clinic roles, booking rules, invoice logic or clinical records were loosened.

## Known limitations and next stage

- Revalidation requires connectivity; private content remains inaccessible while offline rather than using a possibly stale cached medical record.
- Server session revocation is best effort when switching workspaces offline. Local secure deletion prevents local account reuse, but operators should revoke server sessions when connectivity returns; do not claim server revocation succeeded offline.
- Screen-reader, touch and RTL acceptance still require actual device evidence. The checklist does not certify all complex clinic/patient submodules or physical accessibility by itself.
- Some older clinic/patient screens may still need label, color contrast or landscape corrections discovered through real UAT; those findings must be tracked and fixed before healthcare launch.
- Legal/privacy, clinician verification, penetration testing, encryption/hosting, access review, backup recovery and alert delivery still require **independent PH19 signatures**.

**Phase 33 candidate:** comprehensive cross-platform security and performance hardening, interrupted mutation recovery, comprehensive accessibility fixes identified by real-device testing and pre-production controls.

**Release decision: PH19 healthcare pilot NO-GO until independent evidence is reviewed.**
