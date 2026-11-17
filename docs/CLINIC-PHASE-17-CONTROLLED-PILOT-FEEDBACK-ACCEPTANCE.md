# DandanLink — Clinic Improvement Phase 17
## Controlled Pilot Feedback, Performance Observability and Final Regression Improvements

**Scope:** authenticated clinic operations. This is a real, working **structured UAT observation workflow**, not a replacement for patient support, independent clinical review or the PH19 launch gate. The feature collects strictly non-clinical issue categories only; no free-text comments, media, medical records, contact details or patient identifiers are accepted.

## Implemented

### Persisted, private structured pilot observations
- New `/v1/pilot-feedback/clinics/:clinicId/observations` **GET**/**POST** routes, and `PATCH /:observationId` to triage records. Only verified, active **owner/manager** staff may list/create for their clinic; status updates additionally require verified **MFA**. Each request is tenant-scoped server-side and nonmembers cannot obtain other clinics' observations.
- Exact allowlisted metadata: workspace (10 fixed areas), symptom (10 fixed categories), severity, reproducibility, connection category, device category, and interface locale. No free-text title or description. The server rejects arbitrary keys—including patient identifiers, notes, screenshots, emails and links—with HTTP 422. The client repeats validation only for usability; server schema constraints remain authoritative.
- PostgreSQL migration `0021_clinic_pilot_feedback.sql` adds `clinic_pilot_observations` with clinic, actor and status indexes, and append-only `clinic_pilot_observation_events`. Audit entries `pilot.observation.created` and `pilot.observation.triaged` accompany successful changes.
- Up to **20 new observations per actor, clinic, rolling hour**; a transaction advisory lock makes parallel submissions subject to the same limit. Owner/manager history returns the **latest 40** items per clinic; displayed metrics are explicitly scoped to this window.
- Review stages `open → triaged → in_progress → resolved` with explicit `deferred` and reopened review pathways, fixed outcome codes, mandatory confirmation and server-side **optimistic revision checks**. Stale reviews return HTTP 409; no silent overwrites or single-click approvals.
- No change to `PH19_PILOT_RELEASE_ENABLED`, health-data write gate, clinical workflows or staff access policy. A resolved UI report **never** constitutes medical/legal approval.

### Functional clinic interface
- Integrated under **Clinic → Settings → Quality checks**, beneath the human pilot signoff section; does not reload or collapse the persistent sidebar.
- Modern EN/Dari/Pashto/RTL fields for area, symptom, severity, frequency, network, device and language; real recent-list counters, status/area filters, five per page, relevant badges and secure error/retry/timeout feedback.
- Owners/managers with MFA can review an observation and choose a valid state transition + fixed reason, then acknowledge and confirm. Others see a reminder to configure MFA rather than an unlocked status action.
- Optional aggregate-only CSV export includes only category, UTC timestamp, status and reason metadata. **No clinic ID, actor ID, patient ID, contact information, free text, arbitrary URLs or medical files** are exported. Uses existing formula-safe CSV encoding.
- UI blocks HTML or malformed JSON, rejects unexpected personal fields in responses, guards against cross-tenant stale state and shows error instead of infinite loading when requests time out.

### Performance measurement and regression
- Indexed queries serve only the latest **40** feedback rows, with bounded response sizes. Client list requests time out after 11 seconds with clear recovery.
- New `pnpm qa:pilot:latency` samples credential-free public API process health, database readiness and public app identity via **1–5 sequential GETs each** (default 3). Prints numeric p50/p95/max round-trip latency *observations*, not a certified SLO. All probes reject HTML/unreachable servers, never send credentials/PHI, never make writes and always print **NO_GO_PENDING_INDEPENDENT_REVIEW**.
- Mock unit/regression tests verify strict server/client option parity, allowed status graph, PHI rejection, paging/counts, safe responses and benchmark requests. CI now includes real PostgreSQL + HTTP testing with synthetic users/clinics, cross-tenant denials, MFA, status revisions and append-only security audit events.

## Operator workflow (only in a synthetic/consented, authorized staging environment)

1. Pull Phase 17, **run the new database migration** (`pnpm db:migrate`) and restart your API process to load the new route. Do not run the migration on production without an approved migration/backup plan.
2. Sign in as active clinic owner or manager. Visit **Settings → Quality checks**. Select *only fixed technical categories* for an issue; never enter any patient data. Save and verify it appears in the right clinic's recent 40.
3. Enable verified MFA before triaging. Choose a valid next state and outcome code, acknowledge, then confirm. Refresh to see persisted status. Test a stale review in another browser and verify HTTP 409 without overwriting.
4. Export the metadata CSV only to an approved, access-controlled QA location. The download is not an approval certificate and is not automatically sent to an external support provider.
5. Run `pnpm qa:pilot`, `pnpm qa:clinic`, then `pnpm qa:pilot:latency` with API running. For a remote test instance, set `DANDANLINK_CHECK_API_URL` to its public HTTPS root. These technical checks never submit synthetic patient data.
6. Triage genuine issues against a non-public approved ticket system or engineering release branch. Retest and record an independent reviewer separately before declaring work verified.

## Manual acceptance matrix — NOT YET WITNESSED

| Check | Expected | Status |
| --- | --- | --- |
| C17-01 | Owner and manager can record a structured observation for their selected clinic; others cannot see management entries | **PENDING** |
| C17-02 | Names, phone numbers, emails, patient IDs, clinical notes, attachments and custom fields are rejected server-side | **PENDING** |
| C17-03 | Two separate clinics cannot read, create or triage one another's records, including with forged IDs | **PENDING** |
| C17-04 | 20 submissions per clinic/actor/hour succeed; 21st returns 429, including concurrent submissions | **PENDING** |
| C17-05 | List shows at most 40 records, counts agree with returned window and pages show exactly five rows | **PENDING** |
| C17-06 | Status change requires MFA, valid transition, confirmation and current revision; stale update rejected | **PENDING** |
| C17-07 | Created and triaged audit events exist, are scoped, and append-only event history cannot be edited or deleted | **PENDING** |
| C17-08 | CSV has only category/status/timestamp fields, with no patient/staff/clinic identifiers and no formula injection | **PENDING** |
| C17-09 | EN/Dari/Pashto, RTL, keyboard, screen-reader labels and 320/375/580/1130px layouts verified | **PENDING** |
| C17-10 | Disconnect/restore Wi-Fi, force timeout and switch tenants mid-request; no cross-tenant stale data | **PENDING** |
| C17-11 | Baseline p50/p95 health/database/status timing collected on intended staging network; do not mistake it for authenticated user response time | **PENDING** |
| C17-12 | Existing booking, billing, staff, feedback, private export and PH19 no-go gates regressions all green | **CI-GATED + MANUAL PENDING** |
| C17-13 | Independent legal, clinical, security, accessibility, backup and pilot sponsor approvals collected and signed before any production patient writes | **BLOCKED — HUMAN** |

## Database and deployment instructions

After an exact-commit green CI and merge to `main`:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm db:migrate
```

Restart API with `pnpm dev:api`; optionally run `pnpm qa:pilot:latency` in another terminal. **Migration is required** for persisted UAT observations. The existing migration runner is idempotent; previously recorded migrations are skipped. No dependency or environment variable additions.

For production, ensure encrypted backups and operator approval before migration. A green CI is **not** a clinical certification, live UAT or legal authorization; PH19 protected healthcare release remains **NO-GO**.

**Next proposed improvement:** Phase 18 — cross-device usability follow-up, booking/finance performance profiling with synthetic data and independent pilot release review.
