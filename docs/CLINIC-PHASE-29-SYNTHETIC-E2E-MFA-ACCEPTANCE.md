# DandanLink — Clinic Phase 29: Multi-account E2E and real-device MFA acceptance

**Status:** Engineering implementation delivered for CI and operator-run device acceptance. Android and iOS physical MFA execution **NOT RUN in this environment**. PH19 healthcare production pilot **NO-GO**. This phase does not change production flags, privileges, membership guards, data migrations or dependencies.

## Scope and expected result

Phase 28 closed code-level access leaks (Admin pending identity, Clinic Web deep routes, Patient native MFA). Phase 29 verifies that the *actual* API, PostgreSQL and a synthetic team preserve these controls across one continuous journey, rather than relying solely on source/permission unit tests. It also provides a strict, locally retained evidence checklist for actual Android/iOS second-factor verification. **An evidence checklist is not a simulated device run.**

### Automated integration — required CI

`tests/clinic-phase-29-synthetic-journey.mjs` runs against the existing test-only Phase 07 fixture (all accounts and clinic/patient records generated for CI, no real patients). It is added to the PostgreSQL GitHub Actions job after prior HTTP integrations. The test:

1. Confirms verified clinic owner/team identity and that receptionist, unrelated user and platform administrator cannot open the privileged team roster.
2. Confirms tenant boundaries on clinic appointment catalog; dentist sees only assigned provider entries.
3. Creates one real internal appointment, checks idempotent replay, slot conflict, assistant write denial and outsider denial.
4. Tests receptionist appointment detail with no-store response, unrelated clinician/other-clinic/outsider isolation and that the reservation appears in the actual shared queue.
5. Probes doctor-only clinical encounter permissions, creates a **synthetic draft**, and ensures the other doctor/receptionist cannot access it.
6. Moves synthetic appointment to the controlled clock fixture, checks arrival and the refreshed live reception queue.
7. Onboards a separate verified patient portal account, checks consent-required access and no implicit relationship to the clinic registry or chart; verifies notifications read availability and no staff data access.
8. Suspends a synthetic assistant and confirms stale sessions lose access immediately, including private appointment catalog, with owner-visible audit event.
9. Fails execution if `NODE_ENV` is not `test`, the fixture is not local or a PH19 release switch is set. Outputs **only symbolic check IDs/counts**, no passwords/cookies/patient IDs.

Run this integration *only* inside the already configured disposable CI Postgres test stack, never against local real patients or remotely deployed environments. Standalone local execution requires the existing Phase07 fixture, a ready local CI-mode API, dev email test-link logger and the repository's test env.

### Physical Android/iOS MFA — human device acceptance (not completed)

`scripts/phase29-device-mfa-check.mjs` creates a strictly allowlisted 32-case local evidence manifest for **Android × iOS × Clinic × Patient × eight MFA scenarios**:

| Case | Required manual observation on each OS and workspace |
| --- | --- |
| Password challenge | After the password, there is **no** authenticated bearer and no private workspace mount until factor verified. |
| Successful TOTP | Android/iOS authenticator switch returns to challenge; correct code establishes authorized session and correct clinic/patient destination. |
| Invalid code | A wrong 6-digit code is rejected without session or PHI. |
| Recovery | A legitimate one-time recovery code succeeds once and cannot be reused. |
| Expired/replay | Expired challenge or replayed MFA attempt fails closed. |
| Background | Switching to authenticator/background clears entered codes without losing role-bound private state. |
| Lost cookie/network | HTTP-only challenge continuity failure, offline or interrupted request reports failure, **not** a fabricated login. |
| Sign-out/revoke | Server logout/session revocation removes all private account/clinic access after app resume. |

Use **synthetic verified accounts only**, with MFA enabled via legitimate web account security settings. On *both actual OS devices*, perform each observation, verify role and tenant denial in network logs without recording tokens, and compare patient/clinic session isolation. Real physical test requires a supported Expo Go/SDK 57 build and a reachable HTTPS API tunnel; perform with a privacy and security reviewer.

**Local PowerShell operator commands**, after approved Phase29 code lands on `main`:

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
node scripts/phase29-device-mfa-check.mjs --init
# Run MFA checks on Android and iOS, manually edit .patient-acceptance/phase29-device-mfa.json:
# for each witnessed PASS only, set status=PASS, evidenceId=non-sensitive-ticket-ID,
# completedAt=UTC ISO 8601 time. Never record screen captures/OTP/cookies in this file.
node scripts/phase29-device-mfa-check.mjs --verify
```

`--init` never overwrites existing evidence. `--verify` fails closed for any pending/blocked/failed case, duplicate/unknown IDs, extra fields, or missing sanitized PASS ticket/time. The private manifest is under `.patient-acceptance/` and excluded by `.gitignore`; **do not commit patient information or secrets**. Use external approved evidence storage with access controls and retention, referenced by generic ticket IDs only. Manual PASS in a checklist does not itself verify the evidence or authorize a release.

### Other Phase 28 findings that still block release

- Independent clinical, legal/privacy, hosting/encryption, penetration testing, backup restoration, privileged-access, alerts, pilot roster and RTL/accessibility reviews with dated signatures are still **P0** before real healthcare data.
- Human screen-reader, keyboard, rotation and 320/360/414 dp checks in English, Dari and Pashto are still required. These were not automated by Phase29.
- Staging owner → verified doctor → public listing → real patient booking/notifications/subscription and rollback must be performed with approved **synthetic** data and independently reviewed evidence; the Phase29 CI run is narrower than this full device-and-browser certification.
- New devices, offline forms, push/SMS delivery and production alert routing cannot be marked verified by this script.

### Checks and release decision

- `pnpm test`: includes Phase29 strict manifest and CI-gate unit tests.
- `pnpm typecheck`, `pnpm build`, Expo Android/iOS bundle: existing CI stages unchanged.
- `node tests/clinic-phase-29-synthetic-journey.mjs`: test-only HTTP+Postgres integration in GitHub Actions.
- Device tracker: produces **32 NOT_RUN** cases until a real operator supplies verified evidence; independently reviewed tickets required.
- **Release: NO-GO**, regardless of passing tests or manually entered tickets, until PH19's independent signoffs are completed.

**Phase 30 candidate:** instrument redacted 401/403/409 operational alerts and notification/backup failure pathways, followed by multilingual accessibility and cross-device recovery improvements. Never put PHI, session cookies, TOTP or recovery tokens into alerts.
