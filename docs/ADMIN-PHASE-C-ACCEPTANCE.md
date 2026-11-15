# Admin Phase C — Verification and Moderation

Scope: improve four existing administrator sections **Clinics, Dentists, Listings, Patient Reviews** without changing their permission model or clinical/patient interfaces.

## Implemented
- Shared English, Dari, Pashto search, submit/reset, newest/oldest sorting, 10-record pages, genuine database-backed totals, accessible previous/next controls and explicit no-result states.
- **Clinics:** Pending, needs-information, approved, suspended, rejected and all-status filters; efficient count query, name/city/license search, stable sorting, structured table and readable decision timeline. Existing private evidence download and confirmation requirements remain intact.
- **Dentists:** Server-filtered 10-item credential queues, configurable sort, professional/clinic/credential columns, page controls and visibly identified current credential evidence. Original protected evidence download, review basis, decision reasons and immutable history remain intact.
- **Listings:** Server-side pagination and sort, changed-field summary in queue, **field-level published-versus-proposed comparison** in detail, plus full previous/current preview, photo evidence, readiness checks, revision-locked approval, and decision history. Rejecting an update still retains currently published content.
- **Reviews:** Pending reviews, reports, appeals with server-side pagination, search by headline, oldest-first backlog review, per-record decision form (no shared reason applied to a different review), explicit confirmation, policy-category and reason enforcement, and privacy-safe metadata-only recent decision history. Negative but policy-compliant reviews remain publishable.
- Consistent admin-only styling: tables, controls, empty states, card density, evidence comparison and histories. Responsive and RTL-friendly, with no changes to clinics/patient CSS.
- Backend authorization still requires platform administrator and verified MFA. API responses are no-store, search/sort values are parameterized, and all existing concurrency/revision checks and audit events remain in effect.

## Acceptance
| Gate | Evidence |
|---|---|
| Clinics support 10-item pages, status filters, oldest/newest, search with real totals | Phase C integration + CI |
| Dentists and listings support search, status, sorting, multiple pages | Phase C integration + CI |
| Review pending/report/appeal queues use independent pagination and never silently truncate to 100 | Phase C integration + CI |
| Anonymous/clinic users cannot enumerate platform moderation | Phase C integration + existing PH12/PH17 |
| Decision confirmations and policy reasons belong to an individual review | Phase C source validation |
| Review decision history reveals no patient/clinic/actor identifiers | Phase C integration |
| Clinic/dentist/listing decisions preserve evidence, revision checks, history | Existing Phase02/PH12/PH17 integrations |
| Sidebar/header stay stable; all roles & translations maintained | Existing admin persistent navigation tests |

## Next
**Phase D** is financial workflows and support ticket operations, including isolated payment decision forms and SLA counters. **Phase E** adds global search, notification center and deeper platform monitoring. Clinical/legal/hosting approvals for PH19 remain launch-blocking.

## Run
Pull main, run `pnpm install --frozen-lockfile` if needed, and start the existing development scripts. No new database migration.
