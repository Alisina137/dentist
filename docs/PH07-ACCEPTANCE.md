# PH07 — Clinician worklist, encounters and private files

**State:** Implemented on the PH07 branch for integration verification. This is NOT authorization to deploy with real patient health information.

## Delivered routes
- `/clinic/clinical` — date-filtered Today appointments, Pending Notes, My Cases.
- `/clinic/patients/:patientId/visits` — patient-specific visits, chronological status and new drafts.
- `/clinic/patients/:patientId/visits/:visitId` — structured note, clinical intake, save/sign/amend/version history.
- `/clinic/patients/:patientId/files` — private file upload, filtered listing, authenticated download/image preview.
- API `/v1/clinical/clinics/:clinicId/...` — staff-authenticated, tenant/clinician scoped REST actions.
- Migration `0007_clinical_encounters.sql`: encounter, append-only version history, signed-note immutability trigger, private bytea file storage with no public object URLs.

## Access and integrity
- Clinic owners/managers without clinician authorization can view **aggregate operational counts only**, not patient names, notes, or files.\n- Dentist or explicitly clinician-enabled owner/manager can start their own unscheduled encounters and sign/amend their assigned encounters; active clinic membership is verified on every request.
- Assistant can create a draft for an arrived/in-treatment/completed appointment and edit **only own unsigned draft**; cannot sign, amend, or view another clinician's private notes. Receptionist/cashier/admin cannot read private clinical content.
- Appointment association validates clinic and patient, prevents more than one encounter per appointment, and requires clinical readiness.
- Note changes use optimistic revisions; signatures require an explicit confirmation token; signed base is immutable, amendments are append-only and reasoned. The encounter/version records are kept indefinitely until a later approved retention policy.
- Clinical file request enforces 2 MiB, MIME allowlist, magic bytes, tenant/patient/provider access, no-cache and download-only serving with `nosniff` headers. PostgreSQL stores bytes privately; this is **signature validation, not malware scanning**.
- The frontend offers Dari/Pashto/English and RTL/LTR, responsive hierarchy, active tabs, form labels, error/retry states and file upload retry while preserving the in-memory buffer.

## AC07 verification matrix
| Case | Expected result |
|---|---|
| Dentist creates unscheduled draft with complaint | Persisted and visible in Visits/Pending Notes |
| Assistant drafts checked-in encounter | Own draft persists; sign/amend rejected |
| Dentist signs fully completed note | Timestamped, attributed, snapshot stored |
| Edit signed note | Rejected; append-only amendment requires clinician + reason |
| Stale concurrent edit | HTTP 409, existing note remains |
| Receptionist/cashier/platform admin accesses note/file | HTTP 403; unaffiliated clinician gets 404 |
| Cross-tenant patient ID or file ID | HTTP 404 |
| Invalid MIME or signature / oversized file | HTTP 415/413/422 |
| Private file preview | Authenticated scoped fetch only, no direct public URL |
| Network interruption during save/upload | User sees error; editing buffer/files remain in memory |

## Commands
```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install
pnpm db:migrate
pnpm check
pnpm dev
```
Migration is additive; backup a development database before migration. Do not use real clinical data until approval.

## Gates remaining before production acceptance
- Automated validation/CI and HTTP integration against live PostgreSQL to be confirmed on PR.
- Manual browser keyboard, responsive, screen-reader and RTL inspection not performed by the connector.
- Clinician review of visit fields and workflow and local clinical-record legal consent/retention requirements.
- Private object storage lifecycle, backup/recovery, access logging policy, encryption-at-rest verification, malware scanning/AV quarantine, file format hardening; these require PH19 security/pilot readiness.
- No automated diagnosis, prescription, odontogram (PH08), or treatment plan (PH09) is claimed.
