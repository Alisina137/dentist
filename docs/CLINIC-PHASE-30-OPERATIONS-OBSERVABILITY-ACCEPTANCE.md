# DandanLink — Clinic Phase 30: Safe Operational Alerts, Delivery Monitoring and Backup Freshness

**Release result:** Engineering instrumentation only; no independent hosted alert routing, data-retention certification, real-world disaster recovery drill or physical-device test was completed. **PH19 healthcare production pilot stays NO-GO.**

## Delivered

### 1. Request failure surge detection without PHI or credentials

The API registers a single `res.once("finish")` hook before Better Auth and all subrouters, so both auth requests and nested private clinics are classified after the final HTTP status is known. `phase30-observability.ts` only records a small, fixed category list (auth, booking, clinical, appointments, team, operations, etc.) and numeric status families. Request paths, IDs, query parameters, request/response bodies, cookies, access tokens, passwords, diagnostics, clinician/clinic identities and error messages are **not emitted**.

| Signal | Threshold, rolling bucket | Cooldown |
| --- | --- | --- |
| `auth_denials_spike` | 30 × HTTP 401 / group / 5 min | 15 min |
| `permission_denials_spike` | 20 × HTTP 403 / group / 5 min | 15 min |
| `conflicts_spike` | 15 × HTTP 409 / group / 5 min | 15 min |
| `api_server_errors` | 3 × HTTP 5xx / group / 5 min | 15 min |
| `db_readiness_failed` | `/ready` returns 503 | 15 min |

Output is exactly one `[phase30-alert]` JSON line containing `kind`, allowlisted `code`, `area`, `count`, `windowSeconds`, `at`, and `productionClearance:false`. There is no public or authenticated telemetry endpoint. Counters live in process memory, have finite low-cardinality keys, and reset after restart. Each alert is rate limited. **Do not mistake these thresholds for a real-world incident response SLA**; deploy a private log exporter and independent alerting receiver for sustained production monitoring.

### 2. Invitation, email worker and queue failure handling

- Staff invitation create/resend now emits `staff_invitation_delivery_failed` on actual SMTP delivery failure without displaying email addresses, invitation tokens or clinic names. The API continues to return the existing 503 failure; a pending invitation is not falsely marked delivered.
- Booking notification worker emits `notification_transport_unconfigured` only when a consented event is pending but SMTP is absent; no fabricated send or booking rollback.
- Exhausted SMTP retries emit `notification_delivery_exhausted`, and worker exceptions emit `notification_worker_failed`; no raw SMTP error messages or delivery recipient is sent to the telemetry sink.
- Every 10 worker ticks (~5 minutes), one aggregate count checks stuck/failed notifications; if nonzero it emits `notification_queue_stale`. Existing retry/consent semantics are preserved.
- Signals are redacted and throttled, not delivery acknowledgments. A real operator must monitor and restore outbound email configuration; **never** re-send a booking request just because a notification failed.

### 3. Private backup and restore freshness watchdog

The optional `DANDANLINK_BACKUP_HEARTBEAT_FILE` is a private absolute file path on the API host supplied by an **independent backup/restore scheduler**. This phase **does not run backups** and will not accept a manually edited timestamp as independent proof that backup bytes can decrypt or restore. The file contents must be a JSON object of exactly three fields:

```json
{
  "schemaVersion": 1,
  "backupCompletedAt": "2026-11-19T00:00:00.000Z",
  "restoreVerifiedAt": "2026-11-01T00:00:00.000Z"
}
```

Dates must be ISO UTC, not in the future beyond 5 minutes. The watchdog reads at most 2 KiB, refuses unknown keys and invalid or missing dates, and reports **only fixed error codes**:

- `backup_heartbeat_unconfigured`: no private path in production.
- `backup_heartbeat_missing` or `backup_heartbeat_invalid`: missing/unreadable/oversized/bad JSON.
- `backup_stale`: backup older than 26 hours.
- `restore_verification_stale`: independently reported restore test older than 30 days.

It runs on startup and then hourly when configured (or unconfigured production); does nothing in unconfigured development mode. An `--alert` web endpoint does not exist, and no file content/path is written to logs. A passing heartbeat proves **only reported freshness**, not backup integrity or human PH19 signoff.

### Operator commands (PowerShell)

After pulling to your `C:\projects\dentist` directory, `pnpm install` and migrations are **not needed**. To check backup metadata from an already configured independent job:

```powershell
cd C:\projects\dentist
pnpm qa:operations
```

With no `DANDANLINK_BACKUP_HEARTBEAT_FILE`, this command exits nonzero and prints `backup_heartbeat_unconfigured` by design. Do **not** create a sample heartbeat to force a pass. Provision a private file via an actual operator-controlled backup job, secure file permissions, immutable external job audit logs and monitoring delivery channels. Set the path in the **server** environment only, not `EXPO_PUBLIC_*`.

The API runner still uses `pnpm dev:api`; clinic `pnpm dev:clinic`; patient/clinic Expo `pnpm dev:mobile`. Real mobile MFA and accessibility evidence remain Phase29 work.

### Validation and incident response

`tests/clinic-phase-30-operational-observability.test.mjs` exercises threshold/window/cooldown behavior, unknown-route suppression, finite JSON fields, protection against raw identity and token leakage, sink exception tolerance, backup freshness/invalid schema, and source integration with the PH19 pilot gate. Existing `pnpm test`, `pnpm typecheck`, `pnpm build`, PostgreSQL integration and Expo Android/iOS bundling remain required.

| Alert | Immediate safe response | Required follow-up |
| --- | --- | --- |
| 401/403 surge | Check authentication provider status, reverse proxy and recent role change; never disable MFA or clinic tenant guards | Access logs only in restricted environment with approved retention; human incident triage |
| 409 surge | Check slot conflicts, stale revisions and concurrency; avoid blind POST retries | Verify idempotency receipts and rate spikes without personal data |
| 5xx or DB readiness | Check DB health, migrations, connection pool, memory and safe rollback | Synthetic load probe, owner escalation; ensure no false patient confirmation |
| Invitation/notification | Verify SMTP configuration, provider status, outbox state and consent, retry using controlled queue | Independent delivery/receipt checks; never expose invitation links |
| Backup/restore stale | Escalate to on-call, verify external scheduler, encrypted snapshot existence and actual restore integrity | Independent owner/security review, signed evidence, RPO/RTO rehearsal |

**Limitations:** The alert sink currently writes structured low-cardinality console warnings only. Without a hardened log pipeline, external pager, access-control/retention rules and staffed incident procedures, it is **not** end-to-end production alerting. The heartbeat may be spoofed by host operators and is not a backup-verification service. Physical Android/iOS, screen reader and clinical acceptance cannot be inferred. PH19 independent legal, security, clinical, accessibility and recovery approvals remain mandatory.

### Phase 31 candidate

Deploy and verify a real role-protected alert transport with delivery acknowledgments/retries and operational SLO checks, then run synthetic failure drills for queue, DB outage, restore failure and patient booking ambiguity. Do not permit real clinical data until PH19's independent human approvals.
