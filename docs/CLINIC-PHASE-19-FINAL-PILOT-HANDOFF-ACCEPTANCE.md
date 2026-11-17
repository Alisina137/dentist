# DandanLink — Clinic Improvement Phase 19
## Final Pilot Technical Handoff, Redacted Evidence and Independent Release Boundary

**Status: engineering pilot-handoff tools delivered. Protected healthcare production remains NO-GO pending independent signoff.** This clinic improvement phase is separate from the original application PH19 patient-data release gate. Nothing in this phase sets or bypasses `PH19_PILOT_RELEASE_ENABLED`, changes authentication or authorizes patient/financial writes.

### Delivered

1. **Actionable, live clinic technical handoff panel.** Existing **Clinic → Settings → Quality checks** now shows a professional, three-language (EN / Dari / Pashto), RTL-ready operator handoff below the independent signoff controls. It reuses the actual clinic-scoped operations, staff, notifications and appointment checks, the bounded audit summary and the actual public pilot flag. No new permissions or access routes are introduced.
2. **Fail-closed snapshot eligibility.** The export button is disabled unless all four private diagnostic reads returned a validated result, all six setup checks have known states, the bounded audit counts reconcile, the live flag was checked, the two data sets belong to the *same selected clinic*, and each was checked in the last **five minutes**. A changing clinic, unresponsive API, expired snapshot, missing MFA/status result, stale role, invalid audit shape or partial response never produces a seemingly current report. A browser timer expires the button after five minutes without requiring a new server call; pressing the button revalidates immediately. The operator can re-run the existing live checks.
3. **Strictly redacted JSON handoff file.** The browser can download `dandanlink-clinic-technical-handoff.json` containing **only allowlisted technical status counts and fixed categories**, sampled timestamp, audit-window totals (bounded latest 60), source-signal state, and nine independent evidence controls explicitly `NOT_VERIFIED_IN_THIS_REPORT`. There is no clinic name, clinic ID, patient/staff identifier, contact, email, actor ID, payment reference, request URL, free-text clinical field, cookie, session token, or signed approval. The file is generated on demand and not uploaded, sent by email, stored on the API, or treated as tamper-proof evidence. Recipients must be authorized to receive operational metadata and must use a controlled-access evidence repository.
4. **One-command technical diagnostics.** `pnpm qa:clinic:handoff` runs the existing public read-only, no-credential `qa:pilot` and `qa:pilot:latency` probes. It prints technical pass/incomplete observations, 9 externally unverified reviews, and the immutable conclusion `NO_GO_PENDING_INDEPENDENT_REVIEW`. There are no POST/PUT/PATCH/DELETE requests, no authentication headers and no clinical records. HTTP success only indicates current technical observations; it is **not** a medical, legal, security or production release approval.
5. **Regression / continuous integration.** New tests verify clinic scope mismatches, read freshness, invalid audit totals, unknown vs configured checks, metadata redaction, the conditional UI and the public CLI (including HTML warning and anonymous-auth bypass failure). The CI suite additionally invokes the live no-credential handoff command against disposable PostgreSQL test API; preexisting end-to-end booking, payment, authorization, data export and restore gates remain in force.

### Operator workflow (staging and synthetic records only)

1. Pull merged `main`; no migration or dependency changes. Run `pnpm dev:api` and `pnpm dev:clinic` from `C:\projects\dentist` in separate PowerShell terminals. Sign in to an **owner/manager** clinic account. Open **Settings → Quality checks**.
2. Review the nine external signoff controls and actual quality warnings. Select **Re-run live checks**, then download the redacted packet only when it is ready. A failed check must be remediated before generating a fresh summary; a technically ready report may still say setup needs attention and always says NO-GO.
3. Run `pnpm qa:clinic:handoff` with the API running to obtain credential-free infrastructure/auth-boundary observations. Optionally set `DANDANLINK_CHECK_API_URL` to a *public HTTPS root* for an authorized nonproduction target; do not paste tokens, session cookies, patient data or private URLs. The CLI does not export the browser's clinic-specific results.
4. Transfer the JSON and the **CI run URL + exact SHA** to the independent reviewer **outside the repository** using approved access-controlled channels. Attach separate signed clinical/legal/security/hosting/backups/accessibility/recovery/pilot-sponsor evidence using `docs/PH19-PILOT-RUNBOOK.md` as the authoritative worksheet. The JSON alone cannot pass any of those gates.
5. Keep `PH19_PILOT_RELEASE_ENABLED=false` and all nine approval settings disabled in production until the accountable human approvers have validated every control; obey existing change-management and rollback processes.

### Manual acceptance (all require a named human witness)

| ID | Check | Status |
| --- | --- | --- |
| C19-01 | Owner/manager sees real handoff; dentist, cashier, receptionist, assistant and unauthenticated users do not gain access | **PENDING** |
| C19-02 | Force 401/403/timeout/HTML/invalid audit and test another clinic while loading; download blocked | **PENDING** |
| C19-03 | Download on 320/375/768/1130px and keyboard-only in EN/Dari/Pashto/RTL; focus, print, reduced motion and screen reader | **PENDING** |
| C19-04 | Confirm packet contains no clinic/patient/staff identity, notes, URLs, secrets, payment details or free text | **CI GATED + MANUAL PENDING** |
| C19-05 | Leave app open for six minutes: download auto-disables, no stale report is created; fresh recheck restores eligibility | **PENDING** |
| C19-06 | Observe `pnpm qa:clinic:handoff` with real staging API, network offline, tunnel returning HTML, auth bypass and partial database failure | **CI GATED + MANUAL PENDING** |
| C19-07 | Validate CI test matrix (100 booking contenders, money ledger replay/reversal, backup restoration, role isolation, Android/iOS bundles) against exact release SHA | **CI GATED + REVIEW PENDING** |
| C19-08 | Independent clinical and legal signoff with jurisdictional consent/guardian/privacy evidence | **BLOCKED — HUMAN** |
| C19-09 | Independent security, audit retention, disaster recovery, critical alert and accessibility signoff | **BLOCKED — HUMAN** |
| C19-10 | Approved 5–10 consented pilot clinic roster, release sponsor and rollback/incident contacts | **BLOCKED — HUMAN** |

### Limits and release decision

These tools cannot certify compliance, independently verify signed evidence, simulate real network conditions or prove throughput under sustained clinic load. An operational setup status of `configured` says only that a matching private API field was present; it does **not** say patient care is safe. The exported JSON is unsigned and user-editable. CI and demo data remain insufficient for real medical launch. **Current independent release decision remains NO-GO**. Follow the PH19 production-pilot worksheet and institutional approval process.
