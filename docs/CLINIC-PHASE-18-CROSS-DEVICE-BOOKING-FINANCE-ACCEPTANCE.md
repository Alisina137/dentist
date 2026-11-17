# DandanLink — Clinic Improvement Phase 18
## Cross-device usability, bounded booking/finance reads and synthetic performance observations

**Release classification: NO-GO for protected patient/health-data production until independent signoff.** This phase hardens existing authenticated clinic workflows; it does not approve a launch, alter payment rules, introduce a billing write, or enable PH19.

### Delivered
- **Scheduling and finance: bounded authenticated GETs.** Appointment and billing read requests now have an 11-second deadline, propagate cancellation on route/filter/unmount changes, reject HTML/non-JSON/error redirects, and display the existing localized error and retry UI. Each read is single-attempt, never automatically replaying appointment, invoice, credit, payment or reversal writes. HTTP 401/403/409 use safe classifications; arbitrary server response content is not displayed.
- **Avoid redundant session requests.** Appointments and Finance reuse the existing persistent clinic layout's authenticated session instead of issuing a duplicate `/v1/team/context` fetch on every navigation. The standalone-shell fallback still performs bounded cancellable session reads. Existing role/clinic restrictions remain.
- **Keyboard, RTL and small-screen usability.** Calendar results and invoice tables become labeled, focusable scrolling regions for touch and keyboard access. Strong focus outlines, 320–375px filter stacking and contained horizontal scrolling apply only to the clinic shell. Existing localization, download/export routes and print behavior remain untouched.
- **Synthetic authenticated read timing in CI.** Disposable PostgreSQL fixtures with synthetic staff, clinic and patients measure three sequential authenticated GETs each for calendar, queue, invoices and finance overview. Only numeric p50/p95/max are printed; no private payloads are logged. These measurements do **not** establish a load target, throughput guarantee or clinical safety assessment, and do not include writes. Independent PH19 pilot release gate remains NO-GO.
- **Regression checks.** New tests exercise GET-only credentials/no-store, safe errors, response handling, abort/timeouts and the responsive UI integration. Existing unit/typecheck/build/Expo/integration/backup-restore gates remain mandatory.

### Manual acceptance in staging (synthetic patients only)
| ID | Required witness | Status |
| --- | --- | --- |
| C18-01 | Calendar at 320, 375, 768 and 1130px: touch, Tab/Shift+Tab, EN/Dari/Pashto and RTL with screen reader | PENDING |
| C18-02 | Mobile invoice list supports horizontal swipe and keyboard scrolling; focus and financial action columns remain usable | PENDING |
| C18-03 | Drop network mid-GET; calendar, queue and finance reads time out safely with retry, never automatic POST replay | PENDING |
| C18-04 | Change calendar filters/dates and tenant while a request is in flight; stale response cannot enter another clinic | PENDING |
| C18-05 | Move between booking/finance with a stable persistent sidebar and a single existing clinic session; expired sessions denied | PENDING |
| C18-06 | Real payment replay/reversal and 100-contender booking race continue to pass existing synthetic integration tests | CI-GATED + FIELD PENDING |
| C18-07 | Collect synthetic CI read timing, independently profile intended mobile hardware/network and pilot concurrency | CI-OBSERVED + FIELD PENDING |
| C18-08 | Independent legal/clinical/security/privacy/backup/UAT/accessibility approvals documented outside source control | BLOCKED — HUMAN |

### Pull and inspect
```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm test
pnpm typecheck
pnpm dev:api
```
In another terminal run `pnpm dev:clinic`; only test with approved synthetic data. **No database migration or new environment variable** is required. The 11-second deadline applies to reads only. All mutations retain their existing server-controlled revision and idempotency requirements.

### Remaining pilot boundaries
Real Android/desktop usability measurements, representative booking/finance load and recovery tests, human clinical/legal/security approvals, and the formal PH19 runbook remain required. A green CI result does not authorize real patient-data production writes.
