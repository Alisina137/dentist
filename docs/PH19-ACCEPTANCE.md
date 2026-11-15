# PH19 — Data portability, privacy, disaster recovery and pilot release gate

**Branch:** `phase-19-data-portability-and-release-gates`  
**Route C35:** `/clinic/settings/export?clinic=<clinic-id>`  
**API:** `/v1/portability/clinics/:clinicId/{exports,retention}`  
**Environment:** Development/pilot verification only. **DO NOT store real protected health information before legal, clinical, security, provider/retention approvals.**

## Delivered implementation

- **Production fail-closed gate:** Patient booking, registry, clinical, billing and other private health-data mutations return `503 PILOT_RELEASE_BLOCKED` until all nine operator approval switches AND `PH19_PILOT_RELEASE_ENABLED` are true. The admin-only `/admin/pilot` dashboard shows the current 9-gate status in three languages. Flags are *operator attestations* only; signed external evidence remains mandatory. Local development and synthetic CI test routes are not blocked.
- C35 is a dedicated responsive **Export requests / Retention preference / Access history** workspace, reachable from owner sidebar and clinic settings, with English, Dari, Pashto and RTL support. Staff with non-owner roles do not see the navigation item; the server separately enforces the grant.
- Owner identity, active tenant membership, verified authenticator enrollment and **fresh sign-in (last 10 minutes)** are checked on mutations and downloads. The owner must sign out and sign back in for a new high-risk export when the session ages out; this is deliberate reauthentication, not an unchecked UI checkbox.
- JSON export grants contain 256-bit random capability tokens; **SHA-256 hash only** is stored. Files are **generated on authorized download**, not uploaded to public storage or cached in the database. Each link expires in **5 minutes**, requires the original owner account and clinic, and is atomically **single-use**. The UI downloads with authenticated `fetch` and `no-referrer`, without putting a token in navigation history.
- Export scope is explicitly **administrative**: patient directory (limited demographics), appointments, invoices and recorded payment entries. All queries have clinic filters, explicit columns, and a 5,000-row-per-table safety cap (error, never silent truncation). **Not exported:** signed clinical visits, odontograms, intakes, X-rays, medical histories, attachments or provider notes. This is **not** a complete patient medical-record portability workflow. Clinical content export requires its own separate clinician-authorized privacy/legal design.
- Actor-specific export history, `created/downloaded/revoked` events and immutable audit triggers; past download secrets are not shown. Four new grants per actor per hour at most, via transaction-level advisory lock.
- Retention preference allows **1, 2, 5 or 10 years** only as a **proposal**. No destructive purge job exists; clinical, financial and audit evidence is never silently deleted.
- PostgreSQL migration `0019_data_portability.sql`, static tests, HTTP integration tests, real 100-request same-slot booking contention and a measured **synthetic database backup → separate database restore** drill.

## User flow

1. Start from the Clinic workspace, enroll MFA in **Security & Access** if needed, then sign out and sign back in (no older than ten minutes).
2. Open **Export & Retention** under Settings. Confirm the selected clinic and read the exact administrative/clinical exclusion notice.
3. Enter an audit reason of 12–240 characters; acknowledge sensitivity; press **Create & download secure export**. A signed, one-use link is generated and redeemed immediately by a credentialed request. Save the JSON on an encrypted device or approved encrypted storage. The API never stores its bytes.
4. In **Access history**, inspect the returned status and revoke any unused grants. Link tokens cannot be recovered or replayed; request a new export when necessary.
5. In **Retention preference**, select a proposed period and acknowledge that no records will be deleted. Do not interpret this setting as a legal retention schedule.

## AC19 automation and manual acceptance matrix

| Gate | Evidence / test | State |
| --- | --- | --- |
| Owner/MFA/tenant authorization, isolation, no unauthorized support access | `tests/phase19-integration.mjs`, schema and role assertions | **CI-gated** |
| Single-use 5-minute token, actor/clinic binding and revocation | `tests/phase19-integration.mjs` | **CI-gated** |
| Export audit immutability, throttling and non-destructive retention | `tests/phase19-validation.test.mjs`, `phase19-integration.mjs` | **CI-gated** |
| 100 simultaneous bookings for one verified slot → exactly one reservation | `tests/phase19-integration.mjs` | **CI-gated** |
| Restorable synthetic backup with booking constraint, row checks and elapsed time | `scripts/verify-test-backup-restore.mjs` in CI | **CI-gated; production drill outstanding** |
| Production protected-data write gates default NO-GO | `pilot-gate.ts`, `GET /v1/portability/admin/readiness`, `/admin/pilot` | **CI-gated; operator approvals missing** |
| Legal privacy/consent text, data retention/deletion policy, hosting jurisdiction and data-processing agreements | Written owner/legal approval and provider evidence | **BLOCKED — external approvals** |
| Clinical workflow and chart privacy, exported clinical data policy, consent/guardian law | Qualified clinical/legal reviewer | **BLOCKED — external approvals** |
| Production environment secrets, TLS, encryption, storage malware scanning and access review | Security owner and provider screenshots/reports | **BLOCKED — manual** |
| Actual production backup/restore rehearsal, measured RPO/RTO, PITR | Recovery officer and signed evidence | **BLOCKED — manual** |
| Penetration test and session/role/authorization audit | Independent tester's signed report, issues closed | **BLOCKED — manual** |
| Alerts, on-call paging, audit retention, abuse response and 5–10 verified clinics | Ops owner and pilot checklist | **BLOCKED — manual** |
| Physical Android device, browsers, English/Dari/Pashto RTL, low connectivity and accessibility smoke | Actual devices and user review | **BLOCKED — manual** |

A successful CI run **does not** turn any blocked production gate into PASS.

## Reproducible test environment

After pulling `main`, use the project root `C:\projects\dentist`:

```powershell
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm test
pnpm typecheck
pnpm build
```

For the full synthetic integration and backup drill use the GitHub Actions `Phase quality checks` workflow, which starts PostgreSQL 16, applies migrations, runs the API tests and restores a disposable snapshot. Never run the restore drill on a non-test database: it rejects `NODE_ENV` other than `test` or a URL not containing `dandan_test`.

## Recovery, migration and privacy operations

- Make a provider-managed encrypted backup with verified retention, encrypted transfer and access logs. Record snapshot start/end, DB engine version, extension inventory, storage region, encryption and key ownership, restorability and last successful test.
- In a **separate** isolated staging database, restore that backup, compare key row counts and checksums, verify all migration versions and GiST exclusion constraints, sample authorized UI/API journeys using **sanitized or consented** material, and measure actual RPO and RTO. Obtain signed evidence before any live pilot.
- Apply migrations in order, with immutable backup snapshot and rollback window. `0019` is additive. Do not delete or down-migrate any health/finance history to roll back: instead deploy previous application build, and restore a verified snapshot only under an approved incident plan with explicit data-loss assessment.
- Export payloads contain direct identifiers; require TLS, encryption at rest on the recipient device, short offline retention and access logs. Do not email raw JSON or paste it into support tickets.
- Data erasure, clinical-record export, signed file content, guardian authorizations and retention must be separately approved by qualified advisors. Medical imports are prohibited pending approvals.
- For critical alerts at minimum monitor failed login/MFA, repeated export denials/429s, unexpected administrative downloads, overdue backups, failed restore probes, booking overlap exceptions, DB errors and non-delivery notification outbox; configure an **actual** on-call destination, severity and 24/7 incident procedure.

## Penetration/authorization review checklist

Attempt anonymous/role-crossing and support-principal access, tenant-ID swapping, revoked memberships and old sessions, forged/expired/replayed capability tokens, concurrent redemptions, clinic switching, historical link disclosure, HTTP caching/proxy logs, CSRF and origin-policy bypass, dangerous CSV/JSON import into spreadsheet software, 5,001+ rows, intentional database error during export, and MFA enrollment vs. session freshness. Validate that all private API responses carry `no-store`, that no clinical data is included in administrative export, and that event history is append-only. Independently re-run real patient booking 100-way contention and review conflicts.

## Five-to-ten-clinic pilot gate

1. Confirm written legal and clinical approvals; complete vendor contracts, record retention, breach response, backup/restore and incident monitoring.
2. On nonproduction fixtures demonstrate clinic signup → verification → staff invite → patient booking → clinical signed visit → invoice → manual partial payment → **authorized administrative** export → restore rehearsal.
3. Test the three workspaces on phone and desktop, Dari/Pashto RTL, assistive technology and slow/offline connections. Do not promise offline clinical writes; they are unsupported.
4. Recruit **5–10 separately verified clinics** only after release gates PASS. Track cancellations, booking contention, support tickets, access denials, notification failures and backups daily. Hold production PHI import until signed approval.

**Go/no-go decision:** **NO-GO until every BLOCKED gate has named approver, dated evidence and explicit PASS; CI alone is insufficient.** See `docs/PH19-PILOT-RUNBOOK.md` for operator worksheet.
