# DandanLink — Phase 33: Security, Readiness, Graceful Shutdown & Failure Recovery

**Engineering changes delivered:** native bearer-route validation, bounded and deduplicated database health probes, HTTP slow-client limits, single-flight shutdown that drains pending SMTP and active HTTP, mandatory production STARTTLS/SMTPS, stricter production public origins, and no-credential GET-only security smoke tests. **No production clinical approval or performance SLA is asserted.**

## Changes and operational guarantees

### A. Native API bearer path validation

`apps/mobile/native-safe-path.ts` is now called by **both** the patient `requestRaw` and clinic `clinicRequest` *before* the Authorization header is composed. It permits only explicit relative `/v1/...` and `/api/auth/...` paths, while refusing absolute/scheme-relative URLs, path traversal (`..`, `.`, encoded dots/slashes/backslashes), fragments, backslashes, control characters and path length above 4096. Legitimate `URLSearchParams` query values remain supported. This is additional defense-in-depth, not a replacement for server-side session, clinic and patient row authorization.

**Failure semantics:** malformed calls return a typed local `INVALID_API_PATH` or `INVALID_PATH` error without sending an HTTP request or a bearer token. Account / session isolation from Phases 28 and 32 remains mandatory.

### B. Fail-closed database readiness under outage

`GET /health` remains a **process-only** probe, with `Cache-Control: no-store`. `GET /ready` probes the actual database with a **2.5-second HTTP deadline**. Concurrent readiness checks share a single SQL probe. If it times out, all subsequent `/ready` calls return HTTP 503 until that probe settles; they do **not** spawn unlimited queries against a struggling Postgres pool. A recovered probe permits a fresh DB test. An error always returns 503 with a safe fixed error code.

This does **not** cancel a timed-out underlying SQL query. A permanently stuck driver may require operator intervention or restarting the API after database recovery; do not claim readiness when the connection is unhealthy.

### C. Graceful shutdown and performance safeguards

On SIGINT or SIGTERM, API shutdown is single-flight: set a draining flag to return 503 with `Retry-After: 5` on **new** requests, stop backup/alert schedulers, stop accepting HTTP connections, let already-active HTTP requests and the notification SMTP worker complete, then close the database. The worker stops claiming additional notification jobs and awaits the currently active tick. After **20 seconds** without complete drain, the server forcibly closes HTTP connections; DB close has a further **5-second** deadline. A forced or failed shutdown exits non-zero (not a false healthy exit).

Node HTTPS/HTTP server timeouts and resource bounds: `headersTimeout=20s`, `requestTimeout=120s`, `keepAliveTimeout=5s`, `maxRequestsPerSocket=100`, `maxHeadersCount=64`. These limits reduce slow-client connection exhaustion; TLS termination must still be configured in the independently operated reverse proxy. They are *not* capacity/performance certifications.

**Interruption:** There is still no exactly-once guarantee during transport loss. Existing patient booking creation uses idempotency keys and database transactions; the patient must check appointment history after ambiguous responses. A stopped SMTP worker must not make booking transactions look unsaved or re-send a new booking request to repair notification delivery.

### D. Production email and origin hardening

Both account verification/reset delivery and patient notification SMTP now explicitly set Nodemailer's `requireTLS` for **production STARTTLS** (`SMTP_SECURE=false`, commonly port 587). `SMTP_SECURE=true` remains implicit TLS (commonly port 465); configuration refuses port 465 without implicit TLS. If a mail server refuses encryption, SMTP delivery fails without sending credentials or account recovery links over plaintext. Existing retry and alert mechanisms apply.

Production web/API origin checks reject private/loopback IP literals, internal/local/reserved domain suffixes, invalid HTTP or credentials-bearing origins. HTTPS URL syntax alone is still not a proof of provider ownership, DNS integrity or certificate management; hosting signoff remains required.

### E. Real HTTP preflight and CI safety checks

The operator can run:

```powershell
cd C:\projects\dentist
pnpm qa:hardening
```

This is **GET-only** and uses loopback `http://127.0.0.1:4000` by default. It does not send a patient ID, password, cookies, bearer, OTP, appointment details or any write. It verifies:

| Probe | Expected | Additional assertions |
| --- | --- | --- |
| `/health` | HTTP 200, `status:up` | JSON, no-store, nosniff |
| `/ready` | HTTP 200, `status:ready` | Real Postgres, no-store, nosniff |
| `/v1/public/status` | HTTP 200, DandanLink identity | Valid JSON, nosniff, explicit pilot flag |
| `/v1/me` | HTTP 401, `AUTH_REQUIRED` | No bearer, private no-store |
| `/v1/booking/my` | HTTP 401, `AUTH_REQUIRED` | No bearer, private no-store |

A failure exits nonzero and prints fixed, non-sensitive issue codes. An optional `DANDANLINK_CHECK_API_URL` may point to a correctly configured publicly accessible HTTPS API; URI path, query and credentials are rejected. The CLI never prints the destination. **CI executes this script against the live test API and PostgreSQL after migrations and before existing multi-tenant integration suites.**

`tests/clinic-phase-33-hardening-recovery.test.mjs` includes synthetic malicious URL cases, hung DB concurrency and recovery, shutdown ordering/timeout/repeated signal safety, malformed production origin/TLS cases, a fake HTTP response matrix, source wiring and PH19 gate protection.

## Acceptance matrix

| Requirement | Status |
| --- | --- |
| New security and resilience code + unit tests | Code merged after passing CI |
| CI includes real PostgreSQL-backed no-auth hardening smoke | Configured; verify green run |
| Production SMTP TLS refusal behavior | Code enforced; no external SMTP provider tested |
| Real host DB outage, mid-booking SIGTERM, slow-client or throughput benchmark | **NOT EXECUTED** — operational drill pending |
| Real Android+iOS physical device MFA, accessibility and RTL manual UAT | **NOT EXECUTED** — Phase29/32 evidence pending |
| Real alert collector and database backup recovery | **NOT CERTIFIED** — Phases30/31 operator evidence pending |
| Independent healthcare security, privacy/legal, clinical, penetration, access, accessibility and incident reviews | **NO-GO** — PH19 approvals still required |

No database migration, npm dependency or new healthcare release flag is introduced. No permission, clinic-tenant, record-release, consent or MFA policy is relaxed. This phase is **technical hardening**, not a green light to process real patient medical data.

## Phase 34 — proposed final engineering stage

Run the broad cross-workspace end-to-end audit, review all automated/synthetic findings, fix critical defects, execute live operator recovery and accessibility tests, collect and reconcile Phase29/32 physical device evidence, then prepare a release candidate and an explicit **GO/NO-GO** checklist. Real production remains blocked until independent PH19 signatures and actual infrastructure are verified.
