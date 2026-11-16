# DandanLink — Clinic Improvement Phase 09
## Patient Workspace and Reception-to-Clinical Handoff

**Scope:** authorized clinic patient overview, clinical worklist, and linked encounter navigation. No clinical diagnosis or consent automation, no patient data in browser storage, no role expansion, no database migration.

### Functionality delivered

**Clinical worklist and actual handoff**
- A visually clear three-stage workflow guide: reception check-in → clinician review of clinical history/intake → clinical documentation and signing. **This is a guide, not a synthetic completion tracker.**
- A patient appointment can open linked clinical documentation **only if the server reports `arrived`, `in_treatment` or `completed`**. A `confirmed` appointment requires check-in; a `requested` appointment requires clinic approval. The clinical API independently rechecks appointment/clinician/tenant authorization on encounter creation.
- The worklist retains server-authorized Today, Pending Notes and My Cases, adds search by name/clinic ID/service, real appointment status filters and counters, five items/page, a date picker/Today, refresh and shareable date/tab/status URL. Worklist counters are explicitly bounded: the API supplies at most 100 appointments, 60 drafts and 60 signed cases. These are not lifetime clinic totals.
- A status-aware appointment card offers actual appointment details, linked existing encounter or encounter creation, and patient overview **only for roles authorized to access registry demographics**. Assistant does not see the unauthorized general patient overview or treatment plan link, cannot sign/amend and is limited to the existing draft/read scopes.
- Reception queue and calendar links preserve clinic and selected date for proper handoff without claiming that clinical readiness, signed chart, patient consent or completed treatment automatically follow check-in.

**Patient workspace**
- An actionable care-coordination panel uses real appointments **already returned** by `GET /v1/appointments/clinics/:clinicId/patients/:patientId/appointments`, which is tenant and role restricted, never fake or locally persisted. It prioritizes a currently checked-in patient, else the next pending/confirmed booking, else the most recent appointment.
- Shows the real appointment status, clinician, service and Kabul-local date, accurately distinguishing `requested`, `confirmed`, `arrived`, `in_treatment` and `completed`. A completed appointment is **not** labeled as a signed clinical encounter. Direct links to the existing appointment view and clinical chart/visit routes are shown only to permitted roles; owner/manager/reception staff can navigate to the queue for relevant appointments.
- Clinic patient overview includes an anchored care-coordination navigation item and maintains the prior demographic sections, intake protection, clinical visits/chart/treatments/files, role-limited billing and status review from Phase 08.

**Clinical visit context**
- Appointment-linked visit creation displays the selected appointment reference, a link to appointment details and an explicit reminder to verify clinical history and consent. Backend prevents creating a linked encounter before check-in, signing without authorized clinician, editing a signed baseline or applying an amendment without proper revision/reason.
- Existing encounter details now provide accessible patient overview and appointment links (when permitted) and a real clinician-only route to treatment plans. The sensitive chart and file views retain existing protections and formats.

**Integrity and UI**
- Shared, independently unit-tested pure handoff helpers validate which statuses can link an encounter, choose the best actual appointment, and calculate day dates in **Asia/Kabul** rather than UTC. No new API request or server mutation is necessary.
- Three-language translations (English, Dari, Pashto), RTL/LTR-safe numerals, 1100px/680px/375px layouts, keyboard/focus states, reduced-motion behavior and scoped clinic-only CSS.
- Sidebar and header remain mounted across route navigation; changes do not touch patient mobile/web, platform admin, dental charts, or invoice/clinical print templates.

### Files changed

- `packages/ui-web/src/clinic-handoff-model.ts` — pure workflow and Kabul timezone helpers.
- `packages/ui-web/src/phase05.tsx` — patient care summary and clinic/clinical role-aware navigation.
- `packages/ui-web/src/phase07.tsx` — live clinician worklist, safe encounter path, case/appointment links and visits.
- `apps/clinic-web/app/clinic/clinic-care.css`, `apps/clinic-web/app/clinic/layout.tsx` — authenticated clinic-only styling.
- `tests/clinic-phase-09-care-handoff-validation.test.mjs` — unit-model and integration contract regression checks.
- `docs/CLINIC-PHASE-09-CARE-HANDOFF-ACCEPTANCE.md` — manual acceptance matrix.

### Manual browser/device acceptance — NOT RUN

| ID | Role, scenario | Expected | Status |
| --- | --- | --- | --- |
| C9-01 | Reception confirms booking, checks in patient | Appointment transitions via server; appears checked in when worklist refreshes | NOT RUN |
| C9-02 | Dentist opens confirmed appointment | Waiting for check-in visible; no false clinical-start CTA | NOT RUN |
| C9-03 | Dentist opens requested appointment | Pending approval label; linked clinical-start CTA withheld | NOT RUN |
| C9-04 | Dentist opens arrived/in-treatment appointment | Opens linked encounter or Visits new-encounter form with validated appointment ID | NOT RUN |
| C9-05 | Two clinicians simultaneously create/sign | Existing assignment, revision, uniqueness, immutable signed base and audit rules hold | NOT RUN |
| C9-06 | Assistant opens worklist and patient visit | Own assignment/draft rules; no unauthorized patient overview/treatment link or sign action | NOT RUN |
| C9-07 | Owner with no clinical qualifications | Aggregate-only operational worklist; cannot view patient-level clinical records | NOT RUN |
| C9-08 | Receptionist opens a patient profile | Real selected appointment and reception queue link; no clinical chart or notes disclosure | NOT RUN |
| C9-09 | Dentist opens active patient profile | Correct linked visit/clinical chart paths, no fictitious completed-note status | NOT RUN |
| C9-10 | Completed appointment with unsigned/no encounter | Completion is NOT presented as a signed medical record or performed procedure | NOT RUN |
| C9-11 | Worklist with 100+ appointments | Up to server limit; honest count disclosure, no fabricated full-roster count | NOT RUN |
| C9-12 | Search/filter/tabs/page/date, then refresh/share URL | Correct real patient rows, stable active selection and pagination; clinic remains selected | NOT RUN |
| C9-13 | Cross-midnight Kabul appointment | Queue URL uses correct local day, not UTC day | NOT RUN |
| C9-14 | Offline/failing API; clinic switch while request pending | Safe retry, no stale cross-clinic/patient data, persistent navigation | NOT RUN |
| C9-15 | RTL Dari/Pashto at 320–375px, 200% font | Touch controls usable, dates/identifiers correct, content wraps | NOT RUN |
| C9-16 | Keyboard/reader/reduced motion | Tabs/status announced, no inaccessible controls or compulsory animation | NOT RUN |
| C9-17 | Smoke public/patient/admin/chart/finance and import | No role or clinical-color regressions | NOT RUN |

### Release quality

Automated CI must pass `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS JS bundles and PostgreSQL HTTP integration **on the exact PR commit** before merge. CI does not replace clinical/medical, privacy, accessibility or physical-device acceptance. Independent PH19 pilot remains **NO-GO**.

No dependency install, migration or new environment variable.

After the code is merged to main:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

For local review use `pnpm dev:api` and `pnpm dev:clinic` from the dentist project root in separate PowerShell terminals.

**Next:** Clinic Phase 10 — Medical Chart and Treatment Workspace Refinement.
