# DandanLink — Patient Phase E: Full Acceptance & Release-Evidence Matrix

**Scope:** Native Expo patient app plus authenticated clinic/booking/support/records/reviews APIs after Patient Phases A–D. **CI cannot impersonate a real person holding a phone, certify clinical judgment, or approve production use.** This document distinguishes verified automated gates from evidence still to be collected on an actual Android/iOS device.

## Shipped reliability and accessibility fixes

- Signed-in patient favorites are loaded solely from `GET /v1/patient-favorites`. Public clinics saved locally as a **guest** are **never silently uploaded** into a later signed-in account. This closes an unintended cross-account import on shared Android devices.
- Account-scoped native **Saved** and **My Reviews** snapshots are now keyed by verified user ID; previous-account lists, draft review text and moderation state do not display when identity changes or new network requests fail.
- On Home, Explore, Appointments and Saved, the pull spinner finishes when the **relevant screen's principal data fetch settles**, not when an unrelated connection/status probe finishes. Account pages show their own loading/empty/error states. A 16.5-second safety stop prevents an indefinite OS refresh spinner even if a native request hangs.
- Booking wizard steps, date chips, time slots and patient/family selection now expose proper radio/selected/disabled state and spoken labels for screen readers. Existing reduce-motion skeleton, device safe areas, RTL navigation and localized errors remain intact.
- CI now bundles **Android and iOS JavaScript** separately, in addition to TypeScript, monorepo builds and backend tests. This is **not** a native iOS physical-device or App Store binary build.
- Expanded real PostgreSQL/HTTP bearer journey in `tests/phase16-integration.mjs`: separate adults A/B, guardian minor edit/revision/removal, adult invitation with independent consent and self-revocation, patient-only link requests, denied cross-user records, private support messages, notification/review private reads, and guest denial. Existing PH15 bookings (live-slot conflict/approval/cancel/reschedule), PH17 moderated published reviews and PH18 support native bearer-origin restrictions still run in CI.
- `tests/patient-phase-e-validation.test.mjs` enforces device/app state, data scoping, refresh, a11y and cross-role test coverage to prevent regression.

## Automated acceptance gates (GitHub Actions)

| Gate | Mechanism | Evidence |
| --- | --- | --- |
| App content & routing | `pnpm test`; Patient A–E + Stage G–L checks | PR CI job step “Run pnpm test” |
| Cross-account API privacy | `node tests/phase16-integration.mjs` synthetic A/B bearer sessions | `PATIENT_PHASE_E_JOURNEY_OK` |
| Booking lifecycle | `node tests/phase15-integration.mjs` clinic availability → requested → approved → rescheduled → cancelled, idempotency, 409 | `PH15_INTEGRATION_OK` |
| Published reviews | `node tests/phase17-integration.mjs` completed visit → pending → moderation → appeal → withdrawal | `PH17_INTEGRATION_OK` |
| Support authentication & clinical privacy | `node tests/phase18-integration.mjs` and native origin-less bearer tests; staff MFA | `PH18_INTEGRATION_OK` |
| App compilation | `pnpm typecheck`, `pnpm build`, Android/iOS Expo JS export | Four green CI steps |
| Backup/restore | `scripts/verify-test-backup-restore.mjs` synthetic, not a production recovery exercise | CI restore drill |
| Clinical pilot gate | `PH19_PILOT_RELEASE_ENABLED=false` until independent signoff | Existing PH19 pilot runbook |

## Manual device acceptance: fill in real evidence before marking PASS

**Device and operator:** device/model ______ | Android/iOS version ______ | Expo Go build ______ | app SHA ______ | tester ______ | date/time (Asia/Kabul) ______. Use **synthetic test accounts only**, never actual patient health information. For every row capture: result `PASS / FAIL / BLOCKED / NOT RUN`, screenshot or screen recording (redact account identifiers), actual observation, issue ID (if fail), owner and retest date.

| ID | Device case | Exact acceptance rule | Status |
| --- | --- | --- | --- |
| E01 | Guest launch, slow 3G | Home/Explore show real verified listings; no private requests; empty/error/retry distinguish missing connection vs no results. | NOT RUN |
| E02 | Native signup, verification, login | Unverified address cannot enter private portal; verified adult completes required terms and privacy consent; signout returns to guest. | NOT RUN |
| E03 | Account A → account B while network is slow | After switch, no A appointment, review draft, family member, personal support ticket, records, saved favorites or notification can appear for even one rendered frame. | NOT RUN |
| E04 | Guest Saved before sign-in | Save a public clinic as a guest, sign in as A, inspect server Saved; guest favorite must **not** have been silently copied into A. | NOT RUN |
| E05 | Home → Explore → Clinic → Dentist | Search and filters, published hours, verified listing, treatment fees, review source, images and back navigation remain consistent; no mock ratings/fees. | NOT RUN |
| E06 | Book appointment | Select real approved clinic, licensed dentist, service, day, slot, patient, consent; receive one actual request ID, correct pending/confirmed status and booking reference. | NOT RUN |
| E07 | Double tap / network timeout during booking | Disable network immediately after submit, reconnect and check My Appointments before retry; idempotency key stops duplicate booking; never claim failed booking when state is uncertain. | NOT RUN |
| E08 | Slot collision | Use two synthetic patients competing for the same clinic/provider time; second booking gets a localized conflict and refreshed live slots; no phantom confirmation. | NOT RUN |
| E09 | Appointments listing and detail | Upcoming/past/cancelled/rejected/no-show grouping is accurate; full booking detail loads server status/timeline; Back goes to origin. | NOT RUN |
| E10 | Cancel/reschedule | Confirm before destructive cancel; expired cutoff/stale revision refused by API; 409 refresh displays current state. | NOT RUN |
| E11 | Family minor | Add a synthetic minor with legal guardian attestation; edit using current revision; deleting is confirmed; the guardian cannot view unrelated clinic records. | NOT RUN |
| E12 | Family adult | A invites B; B independently accepts; A may request a future booking for authorized B; B can revoke delegation and any subsequent A booking for B is refused. | NOT RUN |
| E13 | Shared records | Link request alone returns no clinical records. Clinic separately verifies identity and expressly releases selected signed summaries/issued receipts; revoke hides items on refresh. | NOT RUN |
| E14 | Booking notifications | Bell opens account delivery center; All/Sent/Failed filtering matches actual delivery status; no fake push/SMS badge; delayed/outage reads show retry. | NOT RUN |
| E15 | Public vs own reviews | Pending review hidden publicly; moderation approval changes authentic average; withdrawal removes it. Review editor never shows previous user's private text after signout. | NOT RUN |
| E16 | Support | From native Expo, FAQ, ticket, reply and status work; untrusted browser cross-Origin and other patient tickets denied; PHI/contact content rejected. | NOT RUN |
| E17 | Dari RTL | 320–360dp phone: labels, Back, bottom tabs, scrollable clinic tabs, booking progress, confirmation and Account fields all readable. | NOT RUN |
| E18 | Pashto RTL | Same as E17; check Arabic-script shaping, contextual numerals, date readability and punctuation. | NOT RUN |
| E19 | English LTR | Same journeys with logical left-to-right order; mirrored arrows and TalkBack focus order remain correct. | NOT RUN |
| E20 | Large text, dark/high contrast, screen readers | Android TalkBack + iOS VoiceOver where available; >=200% text; selected radio/tab announced; 44–48dp controls reachable; contrast and zoom do not truncate consent. | NOT RUN |
| E21 | Offline and foreground | Flight mode during each major private tab then reconnect; no lost booking due to duplicate retry, no stale A data, visible load/error/retry; returning from background refreshes booking delivery history. | NOT RUN |
| E22 | Device orientation / safe areas | Keyboard open on booking and support forms, back gesture, narrow phone, long names, notches, navigation bar: no unreachable Submit/Cancel/Back, no overlay covering sticky booking CTA. | NOT RUN |
| E23 | Performance under poor connection | Capture trace/video of home, search, profile, booking, account switch, records and support; document cold/warm responsiveness and unusually slow interactions. No fabricated pass threshold. | NOT RUN |
| E24 | Production approvals | Independent security, privacy/consent, clinical safety, accessibility, legal and backup restore sign-offs, required PH19 policy review all documented. | BLOCKED — human approval required |

### Evidence format for a failed case

```text
Case: E__
Result: FAIL
Environment: Android/iOS __, phone __, Expo Go __, locale __, text scale __
Scenario: Guest / patient A / patient B (synthetic)
Steps: __
Expected: __
Actual: __
Screenshots / logs (redacted): __
Reproducible: __ / __ tries
Risk: Blocker / High / Medium / Low
Issue reference: __
Retest result + reviewer: __
```

**Release decision:** A green CI proves compilation, source regressions and synthetic HTTP behavior; the device rows remain **NOT RUN** until someone actually tests the app in Expo Go. **Do not mark patient acceptance complete or enable the PH19 medical pilot based only on CI.** A failed/untested security, consent or clinical safety row is a release blocker, not a cosmetic backlog item.

## Pull and run on your Windows laptop

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

After API (4000) and ngrok are ready, in a second PowerShell terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

No additional dependency, database migration or environment variable is required for this phase. `EXPO_PUBLIC_API_URL` must point to the reachable API tunnel from the phone. Use only synthetic accounts and test data.
