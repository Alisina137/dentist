# DandanLink — Clinic Improvement Phase 11
## Clinical Records, Documents and Patient Communication Refinement

**Scope:** existing authenticated clinic clinical encounter list, encounter documentation/history, private clinical-file library and contextual navigation to **existing** booking communication. This clinic UX phase is separate from the original app PH11 expense-management module. No schema migration, new endpoint, external messaging provider, SMS/push system or invented patient-message delivery is introduced.

## Delivered

### 1. Private, practical clinical records

- The real `GET /v1/clinical/clinics/:clinicId/patients/:patientId/encounters` staff-scoped API remains authoritative. The encounter directory now has patient header, all/draft/signed interactive counters and filters, search by recorded complaint or clinician, clear empty states, refresh, and **five visits per page**. It accurately describes the server maximum of **100 most recent authorized encounters**, rather than implying all-time totals.
- New encounter creation retains actual clinical role restrictions. An assistant still needs the permitted appointment context, and the clinical API validates check-in, assigned clinician and patient/clinic rights. Pending document changes are in component memory only; they are never cached in browser storage.
- The authenticated clinic sidebar/header remain persistent. All links carry the selected authorized clinic.

### 2. Signed notes, amendments and audit versions

- The encounter editor preserves its actual signed/draft status and existing patient intake alerts. It now presents **an explicit in-app review before clinician sign or amendment**. The review shows the patient name and clinic-local patient ID, current revision, complaint, findings, assessment, follow-up, recorded performed-procedure descriptions, and correction reason when relevant.
- An explicit checkbox confirms identity and clinical content review, with cancel, Escape and keyboard focus. This is **not patient consent**, and does not claim treatment occurred unless the clinician actually recorded it.
- Signing still writes the visible draft before signing, but now uses the **revision returned by the server** rather than assuming the old revision plus one; the backend still checks eligibility, assignment, SIGN confirmation and concurrency. If a draft was saved but sign fails, the UI reloads the server record and does **not** claim successful signing. Unsigned drafts are not silently turned into signed encounters.
- Amendment still requires at least a 10-character reason; prior immutable signed baseline is unchanged, with append-only new versions and existing audit records. The audit history shows five versions per page, timestamps, author and expandable historic findings. The server limits the result to **100 latest versions**; the UI states the bound. No deletion or overwriting of signed history.

### 3. Protected clinical documents

- The existing authenticated file-list endpoint is scoped by clinic, patient and clinician/assigned assistant. Client search by title, filename and uploader, server `kind` filter, five-row paging, attached-encounter links, file type, size, author, real timestamp and quarantine state improve navigation without revealing another provider's records.
- The UI clearly discloses the server's 100-record cap and that search applies only to the loaded set; no global file count or fictitious document search is implied.
- Upload review exposes actual selected filenames/sizes before upload and enforces **1–8 files** of JPG, PNG or PDF, each **1 byte to 2 MB**. Server still verifies actual file signatures, clinic/patient/encounter access, subscription and audit. Selected files never go to localStorage, sessionStorage or a public URL.
- **Partial-upload retry safety:** the app records which uploads actually completed in this local session. After a later file fails, only *remaining files* are selected for retry, preventing accidental duplicate uploads from resending already accepted files.
- File uploads and content reads are abortable on clinic/patient change and unmount. Object URLs for authenticated image previews are revoked on close, switch and unmount, and the viewer closes with Escape. A quarantined file cannot be opened from the UI and remains blocked by the server.
- PDFs use the existing protected binary route and a generic downloaded filename to reduce sensitive patient-name exposure. Medical files are never sent automatically.

### 4. Patient communication — **accurate feature boundary**

- A clinical **communication handoff** card routes authorized staff to the **real appointment status** for an encounter-linked booking and, for **owner/manager only**, to the existing clinic booking-notification delivery monitor. The latter is protected independently by its existing API.
- No clinical note, x-ray, consent file or uploaded medical document is sent, published, emailed or shared by this workflow. Existing opted-in SMTP booking-status updates (when configured) send a generic portal link with no name, appointment time or clinical data; **SMS and push are not implemented**.
- This phase does **not** implement a two-way patient messaging inbox, patient file release, a new communication channel, or a guarantee that an email has been sent/delivered. The UI labels those boundaries explicitly.

### 5. Appearance and accessibility

- Consistent modern clinic record surfaces, workflow status counters, protected file cards, confirmation review, responsive sidebar and private communication card.
- Clinic-only CSS is applied through the persistent clinic layout; the patient-facing app, admin app, dental FDI SVG anatomy and invoice or medical-print layouts are untouched.
- English, Dari and Pashto localization, bidi-safe IDs/numbers, keyboard controls, visible focus rings, Escape-to-close dialogs, 1100/760/580/375px breakpoints and reduced-motion support.

## Changed files

- `packages/ui-web/src/phase07.tsx` — actual clinical records, signed-note reviewer and file library with safe partial retry, authenticated communication links.
- `apps/clinic-web/app/clinic/clinic-records.css` and `apps/clinic-web/app/clinic/layout.tsx` — scoped clinic styling only.
- `tests/clinic-phase-11-records-files-communication-validation.test.mjs` — tests for source contracts, permissions, clinical immutability, file quarantine/upload and honest communications.
- This document — physical and privacy acceptance matrix.

## Manual browser, accessibility and medical review — NOT RUN

| Case | Role / scenario | Expected outcome |
| --- | --- | --- |
| C11-01 | Assigned clinician with >5 recent encounters | Real server records, five/page, correct search, status counters and record links |
| C11-02 | Assistant's own unsigned draft | Can edit permitted assigned draft, **cannot** sign or view unrelated patients |
| C11-03 | Dentist signs a draft, reviews confirmation | Review includes correct patient, FDI-independent clinical note content and performed procedures; check box required |
| C11-04 | Cancel or Escape review | No sign or amendment request; unsaved form text retained |
| C11-05 | Two clinicians concurrently sign/amend | Revision conflict rejected by backend; signed base remains immutable |
| C11-06 | Sign PATCH succeeds but signature request fails | UI does not claim signed; server note reloads at correct revision |
| C11-07 | Append a correction, navigate audit versions | Correction reason and author shown, prior version retained |
| C11-08 | >100 encounter versions | Last 100 displayed with explicit limit, not called complete record history |
| C11-09 | Authorized clinician, >5 private documents | Name/uploader search, kind filter, five/page and real 100-row bound |
| C11-10 | Assistant accesses unrelated patient files | Existing API returns denial; UI never fetches or exposes foreign documents |
| C11-11 | Upload invalid MIME, empty file or >2 MB | UI blocks, backend independently rejects and audit integrity maintained |
| C11-12 | Upload three files; second fails | First upload persists; *remaining only* selected for retry, no repeat duplicate |
| C11-13 | Switch clinic/patient while uploading | Abort remaining upload requests; clear patient-specific inputs and authenticated previews |
| C11-14 | Quarantined document | Open action disabled; protected backend returns HTTP 423 if accessed directly |
| C11-15 | Image preview and PDF download | In-memory object URL revoked on close/switch; generic PDF download, no public asset URL |
| C11-16 | Clinician opens linked appointment | Real booking status; no implicit consent or treatment completion |
| C11-17 | Owner/manager opens booking delivery | Existing authorized metadata-only monitoring; no clinical content |
| C11-18 | Dentist/assistant follows delivery monitor URL directly | Existing owner/manager-only API denies |
| C11-19 | SMTP disabled, consent off, and delivery failure | No claim a patient was contacted; booking persists without send guarantee |
| C11-20 | RTL Dari/Pashto at 320/375px and English desktop | No clipped buttons, proper patient IDs, responsive cards, focus visible |
| C11-21 | Keyboard screen reader and reduced motion | Explicit dialog review, Escape, focus; no motion required to complete |
| C11-22 | Public/patient/admin/medical chart/treatment/finance smoke test | No CSS leakage, leaked medical content, chart-anatomy regression |

## Release gate

CI on the exact PR SHA must pass `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS bundle exports and PostgreSQL HTTP integration **before merge**. Automated checks do not replace physical-browser inspection, medical/privacy review, or signed operational acceptance. The independent PH19 pilot remains **NO-GO**.

No dependency installation, database migration, new environment variables or changes to the notification SMTP configuration are necessary.

After the verified merge:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

For local QA run `pnpm dev:api` and `pnpm dev:clinic` in separate PowerShell terminals from `C:\projects\dentist`.

**Next:** Clinic Phase 12 — Billing, Payments and Financial Workspace Refinement.
