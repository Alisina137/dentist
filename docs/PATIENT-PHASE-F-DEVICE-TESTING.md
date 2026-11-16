# DandanLink — Patient Phase F: Physical-Device Acceptance Toolkit

**Implementation status:** Android navigation smoke runner, structured human evidence ledger, regression tests and safety instructions are implemented. **Physical-device execution remains NOT RUN.** The developer/AI GitHub environment cannot remotely access your Android phone, Windows Expo Go process, or private localhost tunnel.

Phase E established the 24-case patient acceptance criteria at `docs/PATIENT-PHASE-E-END-TO-END-ACCEPTANCE.md`. Phase F supplies a repeatable, privacy-conscious way to execute and document them on your own Android device. No actual clinical patient data, contact numbers, emails, passwords, tokens, support-message bodies, unredacted screenshots or UI accessibility dumps should be sent to GitHub.

## 1. Start the real app on Windows (two terminals)

Terminal 1, from your dentist project:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

Confirm the API runner connects successfully and sets `apps/mobile/.env` to the reachable HTTPS API tunnel, not `http://localhost:4000`. Local phone and Windows can be on different networks when the API and Expo tunnels are up. Use synthetic test clinic + patient accounts only.

Terminal 2:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Scan the QR code in compatible Expo Go, wait for Home, and close any Expo developer menu/error overlay. **No additional app dependencies or database migrations are introduced by Phase F.**

## 2. Initiate the human acceptance ledger

```powershell
node scripts/patient-acceptance.mjs init
node scripts/patient-acceptance.mjs next
```

The first command creates `.patient-acceptance/results.json` locally, with 23 cases `NOT_RUN` and the independent healthcare approval gate E24 `BLOCKED`. It refuses to overwrite existing human evidence.

After actually testing case E01 on the phone:

```powershell
node scripts/patient-acceptance.mjs record E01 PASS --reviewer "Patient QA" --note "Guest Home/Explore displayed actual verified clinics with working retry state"
```

For a failed case:

```powershell
node scripts/patient-acceptance.mjs record E07 FAIL --reviewer "Patient QA" --note "After network timeout, appointment reconciliation needs attention"
```

Generate an exportable local report:

```powershell
node scripts/patient-acceptance.mjs report
```

The report is written to `.patient-acceptance/report.md` and summarizes all 24 test cases and the **NO-GO** release decision. Notes are length-bounded and common email/phone/bearer-token patterns are automatically redacted. Do not enter other people's names or private health information in `--note`. To document evidence, use `--evidence "local redacted screen recording reference"` rather than sharing a private video by default.

**Important:** The ledger cannot attest a test was run by itself. Only a human tester who actually used the phone may mark a test `PASS` with a reviewer and observed result. E24 explicitly requires external clinical, privacy, security, legal, accessibility and backup approval references to be marked `PASS`. A record in this ledger is documentation, not independent approval itself.

## 3. Optional Android guest navigation smoke using ADB

If your Windows laptop has Android SDK **Platform Tools** (`adb`) installed, connect the Android phone by USB, unlock it, enable USB debugging, approve the computer prompt, open DandanLink in Expo Go, then run:

```powershell
adb devices
node scripts/patient-android-smoke.mjs
```

You can select a specific device with `--serial` if more than one is connected, or specify a locale:

```powershell
node scripts/patient-android-smoke.mjs --locale fa-AF
node scripts/patient-android-smoke.mjs --locale ps-AF
node scripts/patient-android-smoke.mjs --locale en
```

**What the smoke checks automatically:** the native accessibility hierarchy exposes the five main bottom tabs (Home/Explore/Appointments/Saved/Account), tapping each tab keeps navigation mounted, and their visual order follows English LTR or Dari/Pashto RTL. The UI may change or be hidden by an OS dialog; such checks are `FAIL`/`BLOCKED`, not falsely treated as a passing app.

**Privacy and operating boundaries:** the script only taps five bottom navigation buttons and returns to Home. It does not sign in, book appointments, submit support messages, create real records, accept consent, open charts, change security settings or capture screenshots. Android UIAutomation creates a temporary device-only XML dump, which is read **in memory** and immediately deleted. The locally written JSON includes just device model/OS, viewport/font scale, selected locale, S00–S05 statuses and generic non-identifying observations. No raw UI XML, private visible text or device serial is saved.

**Smoke PASS is not an E01–E24 PASS.** UI accessibility dumps can be incomplete with certain Android/OEM/Expo Go versions; if any tab is not discoverable, inspect in person rather than assuming the app is broken. Do not run tests on devices with actual patient content visible.

## 4. Full manual cross-account acceptance (still required)

Follow **E01–E24 in Phase E's matrix**. The minimum high-risk tests should explicitly cover:

- Registered synthetic adult A, independent adult B, guest: verify instant private-data disappearance during switching, saved favorites isolation and previously entered review draft isolation; use flight mode and slow network to provoke races.
- Real slot selection → clinic approval → appointment detail → cancel/reschedule/409 conflict, uncertain network submission recovery without duplicate booking.
- Guardian/minor and adult self-authorization/revocation; an unapproved adult invitation must not create a permission.
- Clinic record linking stays empty until in-person identity proof plus an explicit release of each signed summary/issued receipt; revocation must hide these immediately.
- Patient-private support tickets, booking delivery notifications and published/moderated verified reviews.
- English LTR / Dari RTL / Pashto RTL, 320–360dp screens, 200% text scaling, keyboard open, Back gestures, TalkBack; no user-facing raw error codes, lost tabs or clipped consent.
- Physical performance and connectivity: Android airplane mode, return from background, large/slow real listings, network interruption during booking, retry and support; record device facts and observed behavior.

For testing on an iPhone, use the manual matrix and Expo Go. **The Android ADB smoke does not apply to iOS**, and a successful iOS JS export is not an iOS hardware acceptance result.

## 5. Evidence discipline and release policy

- All reports live in gitignored `.patient-acceptance/`. A private screenshot/video must be redacted *before* a human shares it for debugging. Don't put login tokens, medical details, family identities or email addresses in CI logs/PRs.
- `pnpm test`, `pnpm typecheck` and CI's Android/iOS bundles and PostgreSQL HTTP suites are automated software checks; they do not satisfy physical-device or healthcare launch approvals.
- Any case `FAIL` or `BLOCKED` must have a tracked defect, repair and retest by the operator. E24 is blocked until independent legal, clinical, security, privacy, accessibility and restore signoffs are evidenced.
- **Medical pilot remains NO-GO** while any mandatory device case is incomplete or human approval is absent. Do not use real patient data during this acceptance.

**No new npm dependency or DB migration required.**
