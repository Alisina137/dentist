# PH05 — Clinic Patient Registry and CSV Import

Source: DandanLink Product Specification v1, F05, C06–C09, AC05. PH05 can follow PH02–PH03 while PH04 scheduling is in progress. PH04 is **not** yet present in main.

## Released UI and features

- `/clinic/patients`: clinic-local directory, search by name/phone/internal ID, status filtering, sorting and 10/20 server pagination; counts from scoped database.
- `/clinic/patients/new`: identity, contact, DOB or explicitly estimated age, required privacy notice; server-issued patient ID. Duplicate dialog offers Open existing vs Create anyway with reason.
- `/clinic/patients/import`: download UTF-8 CSV → map columns → inspect row preview/invalid and duplicate candidates → skip, merge missing fields or create with reason → commit with idempotent job and download row-level error report.
- `/clinic/patients/:id`: private overview; clinician-only intake with unknown default, source attribution and revision checks. Edit demographics at `/clinic/patients/:id/edit`.
- No fake visits/appointments/chart/files/billing tabs. No link to patient global account.

## Authorizations

| Role | Directory | Add/edit | CSV import | Clinical intake | Change patient status |
|---|---|---|---|---|---|
| Owner / Manager | Yes | Yes | Yes | Only if clinician-enabled | Yes |
| Dentist | Yes | Yes | No | Yes | No |
| Receptionist | Yes | Yes | No | No | No |
| Cashier | Redacted basic directory | No | No | No | No |
| Assistant, platform admin, public | No | No | No | No | No |

Server checks current active clinic membership and tenant ID on every request, not an untrusted UI role. Medical intake is stored separately and never returned by standard registry or demographics APIs. Patient contact numbers remain unverified. Imported patients are **not** recorded as having personally acknowledged privacy notice; CSV import requires explicit authorized-transfer attestation. DOB and age estimate are mutually exclusive; no invented birth date.

## Import and privacy constraints

- Up to 1 MiB CSV with 500 non-header rows. No clinical notes/X-rays, previous treatments, histories or billing import.
- Source identifier is an optional clinic-local mapping for duplicate detection and non-destructive merging.
- Duplicate check is clinic-local and never automatic destructive merge; only empty demographic fields can be filled after explicit clinic-authorized merge selection and reason.
- A job UUID is bound to actor, clinic, source fingerprint and row decisions. Each row is committed independently and recorded so retries do not duplicate writes.
- Audit events store action, actor, timestamp and patient ID, not patient names/medical contents.
- Downloadable error report includes row number, status/error code and authorized internal patient ID only.

## Automated acceptance

`tests/phase05-integration.mjs` tests PostgreSQL-backed patient creation, cross-tenant ID denial, clinical access, opt-in intake provenance, 125+ directory rows, status changes, optimistic updates, duplicate suggestions/override, CSV mixed valid/invalid/duplicate preview, idempotent import and safe reports. GitHub Actions also runs unit tests, TypeScript checks, web production builds and Expo Android export.

## Human review still required

Browser RTL and keyboard/screen-reader testing at phone/tablet/desktop sizes; clinical terminology and consent review by qualified Afghan professionals; legal/retention policies, backup/restore and production security/privacy clearance (PH19). Do not insert real patients while the local email-bypass development mode is enabled.

## Setup after GitHub merge

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Clinic patient directory: http://localhost:3001/clinic/patients
