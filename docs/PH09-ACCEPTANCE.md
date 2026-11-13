# PH09 — Treatment proposals, multi-visit stages, price snapshots and witnessed consent

**Specification:** DandanLink v1.0 C13/C14, F09, BR-TRT-01/02, AC09.  
**Scope:** Clinic-private professional dental treatment planning. This is neither a payment system nor a legally certified electronic signature service.

## Patient navigation and pages

- `/clinic/patients/:patientId/treatments` — status tabs **Draft**, **Proposed**, **Accepted / In Progress**, **Completed**, **Discontinued** and **All**; search, paging and New Plan. Each row includes title, assigned clinician, status, service-based AFN estimate, session count and stage count.
- `/clinic/patients/:patientId/treatments/:planId` — Summary, Stages, Estimate, Consent and Timeline tabs, with revision and discontinuation controls.
- Patient Overview, Visits and Dental Chart now all link to Treatments; selected patient/clinic is carried through the navigation.
- The create/revise form handles title, clinical indication, sessions, duration, notes, ordered stage descriptions, FDI tooth codes, expected visits, due suggestions, active service-catalog line items and quoted totals. Draft and proposal versions preserve their full original snapshots.

## Backend and data integrity

`/v1/treatments/clinics/:clinicId/patients/:patientId` implements:

- `GET /catalog` — active, clinic-owned services with latest prices and the clinician's authorized encounters.
- `GET /plans?status=...` and `GET /plans/:id` — paginated list and current details, version history, stage progress and consent history.
- `POST /plans`, `PUT /plans/:id/revise`, `POST /plans/:id/propose` — clinician authorization, optimistic revisions, service version and price snapshot, explicit revision reason. After acceptance, changing the plan creates a new proposed version and invalidates old consent; older version and completed stage history remain.
- `POST /plans/:id/consent`, `POST /plans/:id/withdraw-consent` — explicit named, witnessed **in-person attestation**; records the consent scope and the patient/guardian relationship. No inferred/electronic signatures, and withdrawing consent blocks further stage actions.
- `POST /plans/:id/stages/:stageId/action` — start, skip with reason, or complete only with a linked, **signed** clinical encounter that contains the matching **performed** procedure and FDI tooth IDs. An appointment/service booking never counts as performed evidence. Final stage completion closes the plan without issuing an invoice or posting a payment.
- `POST /plans/:id/discontinue` — reasoned terminal discontinuation with history preserved.
- `GET /status-summary` — receptionist/assistant *status-only* projection (no diagnosis/indication/clinical notes). `GET /clinics/:clinicId/plans/:id/estimate` — authorized owner/manager/cashier or assigned clinician *estimate-only* projection (no patient ID, diagnosis or signed record). Financial posting belongs to PH10.
- All mutating actions check clinic subscription and active provider membership, plan owner, status and optimistic revision. All relevant events are auditable and record actor/timestamp.

Migration `0009_treatment_plans.sql` creates scoped treatment plans, append-only proposal versions, version-bound stage records, witnessed consent/withdrawals and immutable action events. PostgreSQL triggers guard historical version, event and consent rows and prevent stage rollback, erasure or silent change of approved scope.

**Security:** No public treatment or clinical detail endpoint; patient app does not receive draft plans. Patient releases are intentionally disabled until PH15 (the `patient_released` flag is false). All price arithmetic uses server-verified integer AFN and active service version snapshots; clinician discounts are forbidden except clinician-enabled owners/managers with a <=30% authorization cap.

## Acceptance test (AC09)

1. Assigned dentist starts with a PH07 visit and creates a three-stage root canal treatment proposal from active service prices.
2. Proposal requires an intentional in-person consent record from patient/guardian and named witness before any stage work; assistant cannot record consent or modify treatment plan.
3. Stage 1 must start before completing. A signed clinical visit that lacks matching performed procedure evidence is refused; an unsigned visit is refused.
4. A fully signed recorded procedure completes each stage; completing the third stage sets **Completed**. Estimates remain unbilled, payment remains unposted.
5. A second accepted plan is materially revised; old consent/version/stage evidence remain unchanged, new version becomes Proposed and requires fresh consent.
6. Withdrawal blocks stage actions; discontinued plans retain consent and prior proposal history.
7. Cross-tenant reads, reception and non-clinical modifications are rejected; receptionist receives limited status only, owner receives limited finance projection only; another dentist cannot see non-assigned clinical details.
8. PostgreSQL trigger regression prevents changes/deletes of history rows and completed-stage evidence.
9. Responsive layout, Dari/Pashto/English, keyboard focus, RTL navigation and error/retry states are implemented, but **manual accessibility and dentist clinical acceptance are not yet performed.**

## CI
`pnpm test`; `pnpm typecheck`; `pnpm build`; PostgreSQL-backed `tests/phase09-integration.mjs` and `tests/phase09-immutability.ts` alongside phases 1–8.

## Production gates
External dental clinical review of treatment semantics, verified in-person consent policy under applicable law, staff privileges, usability testing, de-identified pilot, secure backup/retention/recovery, and PH19 privacy audit. **Do not enter real medical data before those gates are approved.**

Next is **PH10**: clinic invoice lifecycle, posted receipts, partial payment ledger and balances, without retroactively treating planned care as completed.
