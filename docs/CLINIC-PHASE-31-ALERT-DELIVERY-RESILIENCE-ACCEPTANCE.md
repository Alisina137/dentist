# DandanLink — Clinic Phase 31: Signed Alert Transport, Retry Journal & Synthetic Failure Drills

**Engineering status:** Phase 31 implements opt-in webhook delivery, protected on-host retry storage, acknowledgement handling and offline failure drills. It does **not** attest that a hosted monitoring vendor, on-call staff, real backups, physical devices or healthcare production security reviewers have signed off. The PH19 pilot remains **NO-GO**.

## 1. End-to-end architecture

**Request/worker -> Phase30 redacted code -> Phase31 sanitized job -> private local journal -> signed HTTPS collector -> 2xx receipt -> journal acknowledgement/removal.** Local Phase30 console warning events continue if forwarding is not configured or the recipient is unavailable. No alert endpoint is exposed to the public or to clinic/patient accounts.

- Phase30 keeps only allowlisted low-cardinality aggregate events. The Phase31 trust boundary reconstructs exactly seven safe fields, refusing extra fields, unknown codes, arbitrary areas, malformed timestamps and production-clearance claims.
- A single API instance writes at most **128** events to its own local private JSON journal. Writes create a unique temporary file with `0600` permissions, fsync the file and atomically replace the journal. It refuses a symlink, unreadable, oversized or corrupted journal and requires a private existing parent directory (POSIX directory permissions `0700` or stricter).
- On restart the worker reloads pending events with unchanged UUID event IDs. Recovery is **at-least-once**: a remote 2xx followed by a crash before local deletion may resend the same event. The collector must deduplicate `X-Dandanlink-Event-Id`; there is no exactly-once delivery claim.
- Every 5 seconds the worker sends up to **four** due alerts, in memory-safe bounded work; every failed acknowledgement reschedules exponentially (10, 20, 40, 80, 160 seconds; cap 15 minutes), up to six total attempts or 24 hours of job age. HTTP 408, 425, 429 and 5xx, network errors, and timeouts retry. HTTPS 2xx marks the event delivered and removes it from the journal. 3xx redirects and other 4xx failures are rejected without sending to a new host.
- Phase31 rate-limits safe internal operational warnings for five-minute delivery delay, queue saturation, exhausted/non-retryable delivery, and journal-write failure. It never logs the webhook URL, raw response, signing secret, spool path, usernames, patient IDs, staff emails or access tokens.
- If the journal or configuration cannot be safely loaded, the optional forwarder **does not start**; it does not hold, cancel or reinterpret patient appointments, MFA sessions, invoice operations or staff invitations. This is not a high-availability cluster or a durable managed queue.

## 2. Protected webhook receiver configuration

Set these **four** environment variables on the API server from your secret manager. Never commit their real values or place them in any Expo `EXPO_PUBLIC_*` configuration:

| Variable | Required value |
| --- | --- |
| `DANDANLINK_ALERT_WEBHOOK_URL` | Explicit HTTPS endpoint of an independently operated HMAC-verifying alert collector; no userinfo, query, fragment or cross-host redirect. |
| `DANDANLINK_ALERT_WEBHOOK_HOST` | Exact trusted public DNS hostname of the collector, matching the webhook URL. Literal IP addresses, localhost and internal/test domain suffixes are rejected. |
| `DANDANLINK_ALERT_WEBHOOK_SECRET` | Independent high-entropy signing secret (32–256 characters). Rotate using a planned collector transition; never log or include in the URL. |
| `DANDANLINK_ALERT_SPOOL_FILE` | Absolute file path inside a pre-created **private per-API-instance** directory. On Linux/macOS directory must be owner-only `0700`; the journal is `0600`. Do not share this path between pods/replicas or with a CLI probe. |

**Important network control:** Hostname validation alone does not defeat DNS rebinding; deploy egress firewall rules, private DNS protections and HTTPS certificate verification at infrastructure level. The collector must not accept requests from arbitrary clients without authentication. This is a **generic HMAC receiver protocol**, not a drop-in Slack/PagerDuty webhook without a compatible adapter.

### Payload and verification

For a delivery the API sends a POST with these headers:

- `Content-Type: application/json`
- `X-Dandanlink-Event-Id: <opaque UUID>`
- `X-Dandanlink-Timestamp: <Unix milliseconds>`
- `X-Dandanlink-Signature: sha256=<lowercase hex HMAC-SHA256>`

HMAC input is the ASCII timestamp, then `.`, then the **exact UTF-8 request body bytes**: `HMAC_SHA256(secret, timestamp + "." + rawBody)`.

Body shape:

```json
{
  "kind": "dandanlink.alert_delivery.v1",
  "eventId": "e3606f8e-737a-45cd-9e85-b98856f2fb5e",
  "alert": {
    "kind": "dandanlink.operational_alert.v1",
    "code": "notification_worker_failed",
    "area": "operations",
    "count": 1,
    "windowSeconds": 300,
    "at": "2026-11-19T10:00:00.000Z",
    "productionClearance": false
  }
}
```

The receiver must verify HMAC using constant-time comparison, reject old timestamps (e.g. >5 min away from receiver clock), deduplicate `eventId` over its chosen retention window, durably ingest **before** returning 2xx, and have its own role-restricted incident queue and staffed escalation. The webhook URL and secret are never included in events. 2xx means only that the receiver reported accepting the event—not that an engineer reviewed it.

## 3. Operator checks and safe drills

From your dentist workspace:

```powershell
cd C:\projects\dentist
pnpm qa:alerts
```

This checks configuration and journal schema only. If secrets/collector/journal are not provisioned, the command exits nonzero with fixed diagnostic codes. This is **expected** on an unconfigured workstation.

After the receiving collector is configured and independently approved, intentionally send **one labeled synthetic event**, not a fake outage:

```powershell
pnpm qa:alerts:synthetic
```

This emits the code `phase31_synthetic_delivery_probe`, which is explicitly not a real production outage. The CLI reports `HTTP_ACKNOWLEDGED` only on a 2xx response. The operator must separately confirm the event reached the correct restricted collector inbox, HMAC validation was successful, its on-call route works, the ID was deduplicated on retry, and retention/access permissions are correct. The CLI never reads or mutates the running API's journal.

### CI synthetic drills (no real users, no external pages)

`tests/clinic-phase-31-alert-recovery.test.mjs` performs:

1. Invalid HTTPS targets, host mismatches, secret placeholders and relative journal paths fail closed.
2. An event is saved before its first attempted delivery. A simulated transient network failure reschedules it and a later 2xx removes it only after acknowledgement; retries retain an identical event ID.
3. Process restart with a saved event preserves that event ID. Permanent 4xx and sixth unsuccessful attempt terminate bounded retries; the system reports a failure rather than fabricating an acknowledgement.
4. Queue overflow and invalid/PHI-like payloads fail closed. A simulated journal write error must not claim an event was accepted.
5. A filesystem journal is recovered from actual private file bytes, with permission and corruption rejection.
6. An HTTPS mock validates the exact HMAC over the raw body, an authenticated event header, no redirect following, and the 2xx/429/5xx/401/302/timeout response matrix.
7. A **synthetic** database `/ready=503` and 15 booking conflicts generate only redacted database/booking alert categories. Existing Phase29 PostgreSQL booking/permission/idempotency integration checks remain unchanged.
8. An explicit source-level test verifies the PH19 release gate remains intact.

`pnpm test`, `pnpm typecheck`, `pnpm build`, Expo bundle checks, and all existing Postgres tests remain required on pull requests and `main`.

### Failure response and unresolved P0 criteria

- **Collector offline:** On-host alerts remain queued during temporary failure, with bounded retry and local monitoring warnings; operators must inspect the safe journal and escalate if outage exceeds the retry horizon. The journal is not a cross-host replicated message queue.
- **API process terminated / host lost:** Pending alerts survive process restart only if the private journal volume survives. If the underlying machine or volume is destroyed, local alert spool and its metrics may be lost. External availability monitoring and independent off-host alert collection remain mandatory.
- **Database outage / booking conflict:** Monitor safe error categories, restore DB independently, reconcile booking idempotency status before retries. Never falsely report an appointment as confirmed.
- **Outbox worker/SMTP failure:** Do not retry patient appointment creation to fix notification delivery; manage the existing notification outbox and consent gates.
- **Backup metadata missing/stale:** Phase30 watchdog still alarms; heartbeat is operator-asserted only and does not prove encrypted snapshot integrity or restore viability.
- **Security/legal review:** Real clinical/patient production approval requires independent security, legal/privacy, clinical-safety, accessibility, retention, backup/restore, penetration test and incident routing signoffs, including PH19's `PH19_ALERTS_APPROVED`.

**Release decision: PH19 NO-GO.** Phase31 proves deterministic engineering behavior with mock receivers and a configurable real HTTPS adapter, **not** an actual contracted monitoring service or live emergency response. No clinic payment, booking, appointment or personal health-data guard was relaxed.

**Next:** Phase32 real Android/iOS + web accessibility, recovery and multilingual UX validation; review private spool deployment with security team.
