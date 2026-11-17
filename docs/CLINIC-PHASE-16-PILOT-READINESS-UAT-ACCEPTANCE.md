# DandanLink — Clinic Improvement Phase 16
## Production Readiness, Audit Coverage, Accessibility, Pilot/UAT Signoff

**Release classification: NO-GO for protected healthcare/patient-data production writes until independently signed evidence exists.** This phase introduces useful diagnostics and an operator testing path; it does **not** turn on production features or grant legal/clinical permission.

### Delivered

1. **Private quality workspace release boundary.** Existing `/clinic/settings/quality?clinic=<authorized-id>` now includes a read-only, clearly differentiated healthcare pilot section. It displays the real API's public `/v1/public/status.pilotReleaseEnabled` flag, but describes it only as `NO-GO`, `unverified`, or `operator marked; independent evidence still required`. Even a true flag **never** renders as certified. A list of all nine evidence control categories mirrors the backend's `apps/api/src/pilot-gate.ts`: legal/privacy, clinical review, hosting/encryption, backup/restore, security testing, access/MFA, alerts/incidents, accessibility/RTL, and pilot roster. The clinic user has **no approve button**; the application never writes these external decisions.
2. **Bounded audit coverage overview.** Owner/manager quality dashboard uses the existing tenant- and permission-scoped `/v1/team/clinics/:id/security` feed, reports the number of **recent 60 at most** audit events, successful vs other outcomes and latest event timestamp in Kabul time. Invalid, missing, duplicate or unrecognized records display **unverified**, never a fake zero or all-clear. It does not render actor identifiers, subject identifiers, patient details or an export of raw audit events. A link opens the authorized detailed security feed. Event count does **not** prove full audit coverage, tamper resistance, retention, alerting or complete capture of denied actions.
3. **Network, database and security preflight.** `pnpm qa:pilot` checks API `/health`, database `/ready`, `/v1/public/status`, plus protected team context, appointments, notifications and reports with **anonymous GETs**. Each private route must return JSON `401 AUTH_REQUIRED`, `Cache-Control: no-store`, and a request ID. A returned HTML warning, 200 on a private route, missing auth denial, cacheable/private response, missing request ID or unreachable backend fails the technical check. URLs are validated: public HTTPS origins or localhost HTTP only; no credentials, cookies, authentication headers, patient data, clinic UUIDs from the user, files or writes are sent. Command output contains fixed diagnostic labels, not arbitrary response bodies or secrets.
4. **Independent approval barrier remains.** The preflight's final decision is always `NO_GO_PENDING_INDEPENDENT_REVIEW` regardless of green technical checks or an operator-marked live flag. The server's existing `PH19_PILOT_RELEASE_ENABLED` plus nine independent approval flags and write-blocking middleware are unchanged. There is no code path from the clinic dashboard to enable them.
5. **Real PostgreSQL integration.** Adds a CI check using the actual test API and database to verify health, JSON identity, private authenticated-route denials, no-store headers, request IDs, and that the pilot release flag is **disabled** in CI. Regression tests also cover missing/wrong-tenant audit feeds, malformed release flags, every independent signoff category, accessible localized dashboard and mock HTML/unsafe private endpoint responses.
6. **Presentation.** Adds a premium responsive, owner/manager-only, EN/Dari/Pashto and RTL-friendly pilot panel with nine distinct pending evidence cards and a compact audit coverage module. The existing persistent sidebar/header and current real clinic quality metrics remain intact. Styles are clinic-only, keyboard focus and reduced motion are supported. No dependency, database schema migration, environment setting or change to clinical/business writes is introduced.

### Pull and locally inspect (nonproduction)

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

In a **second terminal**:

```powershell
cd C:\projects\dentist
pnpm qa:clinic
pnpm qa:pilot
```

These commands never register a patient, send messages, change billing or sign off release. For a remote, controlled test environment you can set `DANDANLINK_CHECK_API_URL` to its **public HTTPS root** (without path or credentials). Never paste production session tokens into terminal logs or test screenshots. In the existing clinic web UI, sign in as a real clinic **owner/manager** and open **Settings → Quality checks** to see the new pilot-readiness and audit-coverage sections. Non-owners must not see those private data views.

### Independent manual acceptance / pilot evidence worksheet

Use **synthetic patients only** in staging. Record an independent reviewer, evidence location, date/time and result for every row. Never put patient identifiers, passwords, tokens or medical notes into issue comments or CI artifacts.

| ID | Mandatory witness / evidence | Current status |
| --- | --- | --- |
| C16-01 | Clinic owner and manager can see quality and new pilot boundary; receptionist/dentist denied or shown restricted UI | **PENDING** |
| C16-02 | 2 clinics under a user: switch clinic while loading; never mix private audit counts or quality data | **PENDING** |
| C16-03 | Inject invalid HTML/malformed public pilot result; UI shows unverified, never pass | **PENDING** |
| C16-04 | Force public flag true on staging only; UI says operator-marked but not certified; no approve action | **PENDING** |
| C16-05 | 0, 1, 60 and >60 audit records; bounded feed, no actor/patient data in overview, correct Kabul timestamp | **PENDING** |
| C16-06 | Create synthetic staff role change, invitation revoke, MFA and forced logout, verify audit action/outcome/time and permissions separately; no sensitive data exposure | **PENDING** |
| C16-07 | `pnpm qa:pilot`: healthy API+DB, protected routes 401/no-store/request ID, no secrets; no-go release classification | **PENDING** |
| C16-08 | Probe protected endpoint with no auth accidentally returning 200; preflight must fail technical checks | **PENDING** |
| C16-09 | Compare approved legal/privacy documents against Dari/Pashto/English notice and consent; legal counsel signed | **BLOCKED — HUMAN** |
| C16-10 | Qualified clinical lead validates credentials, consent, dental chart and signed encounter review | **BLOCKED — HUMAN** |
| C16-11 | Security leader approves TLS/encryption/key custody, independent pentest, least-privilege, MFA and critical alert response | **BLOCKED — HUMAN** |
| C16-12 | Isolated **production-like** encrypted backup/restore with verified RTO/RPO, SQL checksums, logs and recovery owner signature | **BLOCKED — HUMAN** |
| C16-13 | 5–10 consented clinics selected and sponsors/rollback/on-call owners documented; do not enroll real patients before approval | **BLOCKED — HUMAN** |
| C16-14 | Keyboard-only/real screen-reader EN/Dari/Pashto/RTL checks, Android/Expo Go, low-bandwidth and 320px viewport | **BLOCKED — HUMAN** |
| C16-15 | 100 concurrent booking requests, exactly one reservation winner, replays and reversal/audit preserved; CI evidence linked to exact SHA | **PENDING** |
| C16-16 | Independent support, clinical, operations and legal signoff with dated immutable evidence; release decision documented, not self-certified by app | **BLOCKED — HUMAN** |

Use `docs/PH19-PILOT-RUNBOOK.md` and `docs/PH19-ACCEPTANCE.md` as the authoritative release evidence worksheets. Store the signed documents **outside the code repository** in a controlled-access evidence system; track only references and dates in the completed operator worksheet. Do not put signed medical/legal attachments in public GitHub.

**Known limitations:** The CLI validates only request/response controls from the operator's network, not full legal compliance, data-retention effectiveness, SMTP delivery, backup integrity, browser accessibility or all audited actions. The dashboard shows no true independent approval state because the server does not store signed external decisions. A green CI means engineering regression passed, **not** live clinic UAT. The PH19 patient-data release switch must remain **false** until human signoff and a formally approved launch.

### CI gate and merge

Merge the Phase 16 PR only if `pnpm test`, `pnpm typecheck`, Expo SDK checks, web production builds, Android/iOS JS exports, real PostgreSQL HTTP integration, the added C16 anonymous endpoint tests and independent synthetic backup/restore drill pass for the **exact current head commit**. Manual UAT above remains explicitly **pending** after merge.

**Next proposed clinic improvement:** Phase 17 — controlled pilot feedback, performance and regression fixes guided by real (nonproduction) UAT findings, without auto-enabling PH19.
