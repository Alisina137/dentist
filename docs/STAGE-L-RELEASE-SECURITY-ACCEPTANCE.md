# DandanLink — Stage L Security, Acceptance & Release Readiness

**Baseline:** PH01–PH19 and clinic/patient UI stages A–K.  
**Release posture:** **NO-GO for real health data or a public clinical pilot** until the independent sign-offs in [PH19 Pilot Runbook](PH19-PILOT-RUNBOOK.md) have been completed with dated evidence. Automated CI and a correct environment are necessary, not sufficient.

## What Stage L implements

| Control | Implementation | Verified by |
| --- | --- | --- |
| HTTPS production origins | The API refuses production startup if the API/clinic/admin/patient public origins are missing, malformed, non-HTTPS, localhost, credentials-bearing, or ambiguous. Development retains locally correct clinic `3001` and admin `3000` ports. | `production-config.ts` and `tests/stage-l-security-validation.test.mjs` |
| Server/session secret | Requires a non-example auth secret of at least 32 characters and retains Better Auth secure, HttpOnly, SameSite cookie settings and existing MFA/rate limits. | Production preflight + existing PH01 auth tests |
| Database and verified-account email | The production connection must be an authenticated PostgreSQL TLS URL; SMTP host/user/password/from must be present. No external connection or SMTP delivery is presumed by the preflight. | Config tests + operator provider verification |
| Production pilot gate | An enabled `PH19_PILOT_RELEASE_ENABLED` requires all nine manual operator flags. Even when all are set, separate signed evidence and security/legal/clinical sign-off remain mandatory; the app's operator switches do not certify compliance. | `pilot-gate.ts`, preflight, PH19 test, independent review |
| Private API caching | `/v1/*` and `/api/auth/*` carry `Cache-Control: private, no-store, max-age=0` and `Pragma: no-cache`. | Stage L real HTTP integration |
| Cross-site writes | Rejects unsafe `/v1/*` write methods from unknown/opaque `Origin` and `Sec-Fetch-Site: cross-site`; preserves native bearer-based requests with no Origin. Does not change server-side staff/clinic authorization. | Stage L real HTTP integration |
| Request errors | Malformed JSON yields safe 400, payload beyond configured parser limit yields 413, unsupported encodings yield 415, and unknown errors remain redacted 500 with a request ID. No input content, secrets or patient data are reflected in parser errors. | Stage L real HTTP integration |
| Cross-role controls | Regressions check ordinary accounts, clinic owner, dentist, assistant, receptionist and platform admin cannot cross private clinical, registry, export and notification gates. | Stage L HTTP integration + existing phase-specific suites |
| PH19 regression closure | CI now **executes** the existing PH19 real-PostgreSQL single-use export, immutable audit log and 100-way booking contention checks before Stage L tests. Previously this file existed without being invoked by the CI workflow. | `.github/workflows/ci.yml` |

No new dependencies, migrations, production account provisioning, clinical data imports, SMS or push providers, automatic approvals, or irreversible operations are added.

## Production configuration preflight

Set environment variables using your hosting provider's secret manager—not shell history, checked-in files or chat. Required names, **not values**:

- `NODE_ENV=production`
- `API_BASE_URL`, `CLINIC_WEB_URL`, `ADMIN_WEB_URL`, `PATIENT_WEB_URL`: distinct, real HTTPS origins for the three web apps; the API URL may share a domain only when correctly routed.
- `DATABASE_URL`: PostgreSQL URL with TLS `sslmode=require` or stronger and authentication. Independently verify provider-enforced TLS and encrypted backups.
- `BETTER_AUTH_SECRET`: unique high-entropy secret, minimum 32 characters.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (`SMTP_PORT` optional).
- `DEV_SKIP_EMAIL_VERIFICATION=false`.
- `PH19_PILOT_RELEASE_ENABLED=false` until all nine documented approvals and independent evidence are complete.

Read-only local/host-side check:

```powershell
cd C:\projects\dentist
pnpm exec tsx scripts/production-preflight.ts
```

The command returns nonzero for invalid configuration, never echoes secret values, and explicitly reports **HEALTHCARE_PILOT=NO_GO** while the gate is disabled. A passing configuration is **not** authorization to flip the gate, send real patient records, or open the clinic pilot. The API itself also refuses unsafe production configuration at startup.

## Automated acceptance

```powershell
pnpm test
pnpm typecheck
pnpm build
```

GitHub Actions must pass the Android Expo bundle, the complete PostgreSQL HTTP phase suites, the new Stage L cross-role and malformed-input tests, **PH19 100-booking contention and single-use owner exports**, and the isolated synthetic backup/restore exercise. Check the exact head SHA before merging.

## Human acceptance matrix — launch blockers, not just engineering tasks

| Human check | Evidence required | Current disposition |
| --- | --- | --- |
| Legal/health privacy and consent in Afghanistan | Signed lawyer review; retention, guardian, data subject rights and Dari/Pashto/English text | **BLOCKED** |
| Clinical workflow and record integrity | Qualified dental clinician signed workflow/anatomy/clinical documentation acceptance | **BLOCKED** |
| Penetration test; MFA; scoped data leakage | Independent tester report and resolved critical/high risks; key/access roster | **BLOCKED** |
| Live hosting, encryption at rest, backups | Provider agreement, region, TLS, encrypted objects, access keys, backup and independent restore | **BLOCKED** |
| Operational alerts and incident response | Tested on-call roster, audit access, rotation/revocation, incident and outage drills | **BLOCKED** |
| Device accessibility and low connectivity | Real Android/iOS/browser keyboard, RTL, Dari/Pashto/English, solar dates, screen reader and network traces | **BLOCKED** |
| Verified small pilot | 5–10 real clinics, verified identities, explicit patient consent, sponsor signatures and rollback owner | **BLOCKED** |

### Manual smoke test order (synthetic accounts only)

1. Confirm `/health` responds and `/ready` responds only while PostgreSQL is available. The health route does not prove schema backups, email delivery, or approval.
2. Confirm `/v1/public/status` reports `pilotReleaseEnabled:false` until signed external approvals, regardless of passing build/CI.
3. Use verified synthetic patient, owner, receptionist, dentist, assistant and admin accounts to attempt **positive and negative** clinic permissions. Test both typed URLs and the actual API, including multi-clinic switching and revoked staff sessions.
4. Create/cancel/reschedule a synthetic appointment and check the clinician/room double-booking invariant; test two devices with outdated revision and spot-check event logs.
5. Complete a synthetic clinic export under owner+MFA and recent-auth checks, try cross-tenant/replayed/revoked/expired tokens, and confirm no clinical documents are present.
6. Inspect `Cache-Control: no-store` for private identity and patient routes, cookie Secure/HttpOnly/SameSite, and CORS/Origin rejection for untrusted browser writes. Confirm native Android bearer requests without Origin continue to function.
7. Use airplane mode and deliberately delayed/oversized/malformed requests; verify errors are safe, recoverable and do not disclose payloads or stale protected information.
8. Inspect SMTP verification sending/consent and downstream bounces in a non-production mailbox; do not claim SMTP is proven by configuration alone.
9. Restore a **separate encrypted production-like** snapshot; record RTO, RPO, trigger integrity and restore owner signatures. The CI synthetic local restore does not certify hosted disaster recovery.

## Rollback and emergency operations

- If any clinical/security/quality control fails, **leave or set `PH19_PILOT_RELEASE_ENABLED=false`** and restart the service to block new protected writes.
- Suspend promotion and enrollment; rotate compromised secrets, revoke affected sessions and preserve append-only audit evidence.
- Roll the app back to a reviewed, compatible release only after checking schema compatibility. **Never drop health tables or delete audit events as a rollback strategy.**
- Restore from an independently validated snapshot into an isolated environment first; follow the signed operator procedure before any production restoration.
- Assign and record incident commander, communications owner, privacy/legal escalation and postmortem. An external reviewer—not a CI result—makes the final go/no-go decision.

**Result of Stage L:** deployability validation and security regressions have been tightened; release remains blocked pending the PH19 external evidence and human sign-offs.
