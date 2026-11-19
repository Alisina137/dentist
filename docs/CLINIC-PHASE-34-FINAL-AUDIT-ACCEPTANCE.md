# DandanLink — Phase 34 Final Engineering Audit & Release-Candidate Acceptance

**Status: Engineering release candidate, conditional on passing the exact GitHub CI SHA. Healthcare production/pilot: NO-GO.** The project has reached the proposed end of the 34-phase engineering roadmap. This is **not** clinical certification, legal approval, a successful independent penetration test, or proof of device/production hosting readiness. It does not change `PH19_PILOT_RELEASE_ENABLED` or any of the nine authorization controls.

## 1. Audit scope and real defect fixes

The final audit covered code-level controls for all **four** interfaces: the Admin web workspace, Clinic management web workspace, Patient web app, and Expo Patient/Clinic mobile app, plus protected API, PostgreSQL, SMTP notifications, MFA, observability, database backup/restore instrumentation, and deployment gates.

### High-priority findings remediated

| Severity | Finding | Change and acceptance |
| --- | --- | --- |
| **P0 privacy/security** | The Patient mobile `clear()` helper swallowed SecureStore keychain errors. Logout and sign-in could appear complete while the previous user's bearer might still exist on the device and be restored on relaunch. | Patient sign-out, sign-in and workspace switching now **require OS secure key deletion to succeed** before reporting success or beginning the next account. In-memory private views still disappear immediately. Failed deletion returns `SECURE_STORAGE_UNAVAILABLE`, not a misleading successful logout. A remote sign-out is best effort only after local deletion succeeds; offline server revocation cannot be claimed. |
| **P0 privacy/security** | The Clinic mobile `clearSession()` helper also swallowed a failed secure token deletion; signing out could appear successful and lead to a token returning after restart. | Clinic sign-in and explicit sign-out/switch now check **actual** SecureStore deletion success. On failure, the private UI is cleared, a safe network/storage message is shown, and the workspace switch is blocked. Hooks remain stable across locale changes. |
| **P0 resilience** | Phase33 graceful shutdown used `Promise.all`: if one task rejected, PostgreSQL could be closed before the **other** HTTP or notification task finished a booking/mail update. | Shutdown uses `Promise.allSettled`, waits for **both** in-flight tasks before attempting DB close, honors the shared deadline, force-closes the HTTP server on timeout/error, and exits nonzero after any failed drain. A scheduler-stop error no longer skips cleanup. |

These are identified code weaknesses addressed in this phase, **not** the result of a live external pen test.

## 2. Four-workspace static and CI coverage

`scripts/phase34-release-candidate.mjs` verifies a fixed file/feature contract, without reading private patient records or secrets:

| Workstream | Contract checked | Human work still needed |
| --- | --- | --- |
| **Admin web** | Dashboard, clinics, dentists, subscriptions, security, PH19 pilot gate, support screens | Role-specific browser testing, live audit/incident UI and screen reader review |
| **Clinic web** | Dashboard, appointments, patient directory, clinical care, finance, staff, security/quality settings | Cross-tenant manual tests with authorized synthetic accounts, real UI flow and performance |
| **Patient web** | Search, booking, appointments, family, records, security and home | Real account/consent/booking retries, RTL and accessibility |
| **Mobile** | Patient + clinic native screens, secure auth, clinic appointments/patients/settings, workspace switch and path/lifecycle safety | **32 MFA** and **96 accessibility/network** physical Android/iOS cases with named reviewers |
| **API and operations** | PH19 guard; scoped booking, alert journal, backup watchdog, TLS mail, bounded readiness/shutdown; historical integration test modules | Independent pen test, real DB/SMTP/alert outages, backup restore, RPO/RTO and incident response |

**Interpretation:** The contract confirms required routes/modules/tests are present and the relevant security markers are enforced in source. It does **not** prove every button, visual layout or clinical workflow works on a real device. The suite still executes actual API/PostgreSQL synthetic multi-account and booking tests separately in CI.

A static audit with missing module, missing PH19 control, missing safety marker or incomplete CI stage **fails nonzero**. There is no CLI mode that certifies real clinical launch from code alone.

## 3. How to run final checks (PowerShell)

After merging Phase 34 and pulling into `C:\projects\dentist`:

```powershell
cd C:\projects\dentist
pnpm check
pnpm qa:release:ci
pnpm qa:release:review
```

For public GET-only API checks on the **nonproduction** local API:

```powershell
pnpm dev:api
# In another PowerShell window, same folder:
pnpm qa:hardening
pnpm qa:pilot
pnpm qa:clinic:handoff
```

`pnpm qa:release:review` **does not invent passes**. It can summarize the local ignored `.patient-acceptance/phase29-device-mfa.json` and `phase32-device-accessibility.json` manifests if the operator created them. Missing manifests are `NOT_RUN`, malformed manifests are `INVALID_EVIDENCE`, and an all-PASS manifest is only `OPERATOR_REPORTED_COMPLETE` until independent review. Output includes **only aggregate counts and fixed non-sensitive state codes**.

To create one local, non-overwriting summary for an independent release reviewer:

```powershell
pnpm qa:release:snapshot
```

This creates `.patient-acceptance/phase34-release-candidate-review.json` with `0600` permissions where supported. Re-running refuses to overwrite an existing review snapshot. The file contains counts, known fixed code failures, a build SHA **only if supplied by trusted GitHub Actions context**, and the immutable `NO_GO_PENDING_INDEPENDENT_REVIEW` conclusion. No patient or clinic identifiers, screenshots, keys, medical notes or real evidence documents are collected. Keep the original source evidence in an approved access-controlled environment; only share reviewer-approved sanitized metadata.

**The CI job** runs `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS JavaScript exports and all current PostgreSQL HTTP/integration tests. It also runs the Phase33 GET-only hardening probe, Phase29 synthetic multi-role/tenant booking journey, Phase34 static contract, and test backup restore drill against the **disposable CI Postgres database**. A green CI run is engineering evidence for a particular commit, not real device/provider evidence.

## 4. Required independent release blockers — do not convert to an automatic GO

The following remain **individually blocking**, even if automated QA and all 128 device cases were eventually marked PASS:

1. **Legal and privacy:** Jurisdictional consent, guardian/minor authorization, terms and language translations reviewed and signed.
2. **Clinical:** Qualified dentist/clinical safety lead signs chart, diagnosis/treatment, credential and appointment safeguards.
3. **Hosting/security:** Data residency, encrypted file/DB storage, key access, backups, TLS and secrets management reviewed.
4. **Backup/restore:** Actual encrypted snapshot, independent isolated restore, checksums, and measured RPO/RTO with signed operator evidence.
5. **Penetration testing:** Independent MFA, auth, tenant isolation, SSRF, session persistence, PHI exfiltration and mobile storage testing with no critical/high findings outstanding.
6. **Access review:** Admin/staff roster, least privilege, account suspension, emergency access and MFA reviewed.
7. **Operational alerts:** Authenticated incident collector, real delivery acknowledgements, staffed escalation and incident rehearsal.
8. **Accessibility/RTL:** Physical Android/iOS (VoiceOver/TalkBack and large type), real web browser, English/Dari/Pashto and 320px/landscape UAT.
9. **Pilot roster and sponsor:** 5–10 reviewed/consenting clinics, insurance/payment/dispute rules as appropriate, rollback plans and accountable human sponsor.

Track all above in `docs/PH19-PILOT-RUNBOOK.md` and the private audit system. **Do not set `PH19_PILOT_RELEASE_ENABLED=true` or any independent approval flag to get around NO-GO.** A human's recorded PASS or an environment variable alone is not independent certification. No live PHI or real clinical/financial workflows are authorized by this acceptance report.

## 5. Release candidate decision and next activities

| Milestone | Decision |
| --- | --- |
| Phase 1–34 source implementation and final hardening | **Complete once this PR is merged with green CI** |
| Source/CI structural audit | **Automated; see exact PR commit and Actions run** |
| Physical Android and iOS MFA/RTL/a11y acceptance | **NOT RUN / not verified in CI** |
| Live load test, production database restore and alert on-call drill | **NOT VERIFIED** |
| Healthcare/legal/security/clinical approvals | **NOT VERIFIED — launch blocked** |
| Production health-data release | **NO-GO_PENDING_INDEPENDENT_REVIEW** |

**Stop automatically adding engineering phases at 34.** Future changes should be tracked as specific bugs, P0/P1 operator findings, independent compliance signoff tasks, deployments, and post-launch maintenance; urgent security defects must still be fixed before any clinical production use. Engineers can complete the proposed roadmap while the independent healthcare production decision remains NO-GO.
