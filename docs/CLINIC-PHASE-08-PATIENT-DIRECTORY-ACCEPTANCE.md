# DandanLink — Clinic Phase 08: Patient Directory and Reception Registration

**Scope:** authorized, authenticated clinic staff patient directory, demographic registration, and patient-profile actions. Existing medical authorization, patient billing, imports, visit records, privacy enforcement and tenant separation remain untouched.

## Completed functionality

1. **Premium, functional patient directory.** The persistent clinic workspace presents real patient totals for All/Active/Inactive/Archived with clickable status filters, role-appropriate Add Patient/Import shortcuts, search by name/clinic patient ID/phone, name/recent-activity sorting, configurable 10/20 per page, explicit result bounds and useful empty/error/retry experiences. No fake totals or unsanctioned client-side patient datasets.
2. **Shareable filtered directory.** Query, status, sorting, page and limit survive URL sharing/reload while retaining the mandatory clinic selector. Parameters are validated against the backend's allowed values, the page clamps when a result set gets smaller, and debounced searches restart on page 1. The existing API still pages and performs tenant-limited SQL filtering on the server.
3. **Accessible desktop table and mobile records.** The table includes clinic patient ID, preferred/family name, unverified contact, status, updated date, and a link to the existing patient overview. Phone verification is never implied by the presence of a number. Compact mobile cards have the same server-derived details, readable initials and 44px touch-friendly controls. Authorized staff may book a visit for **active** patients directly from the list, passing the clinic and patient ID to the existing appointment wizard, which revalidates the patient and slot server-side.
4. **Better registration/edit flow.** Grouped identity/contact/consent sections, Kabul-local DOB maximum, age estimate limited to 0–120, mutually exclusive DOB/age fields, phone format hint and localized error presentation. Patient notice acknowledgement remains mandatory. Existing backend duplicate search and review, override reason (≥10 characters), clinic lock, permission checks, revision concurrency, audit and unique patient numbering remain the source of truth.
5. **Improved patient profile.** Readable clinic identity/ID/status header; back-to-directory, authorized edit, and active-record booking shortcuts; existing medical chart, visits, treatment, files and billing tabs are preserved and restricted by the existing backend clinical and finance roles.
6. **Safe patient record status changes.** Owner/manager actions now display a localized in-app confirmation dialog with patient identity, current and proposed status, a required ≥10-character reason and Escape/cancel support. The change is not optimistically applied; server revision, audit and the **block on inactivation/archival with future confirmed/arrived/in-treatment appointments** remain enforced.
7. **No stale Phase 5 disclaimers.** The registration/profile no longer claim billing is unavailable when its actual authorized billing route now exists.
8. **Localized responsive styles and privacy.** English, Dari and Pashto text; RTL-aware cards, data labels and modal; accessible focus and contrast; 1100/760/580/375px breakpoints and reduced-motion handling. New CSS is imported only in authenticated persistent clinic layout and does not affect patient-facing apps, platform admin, dental chart geometry or printed clinical/financial records.

## Changed files

- `packages/ui-web/src/phase05.tsx` — real directory, URL filters, patient cards, registration validation, profile actions, status confirmation and localized strings.
- `apps/clinic-web/app/clinic/clinic-patients.css` — clinic-only, responsive and accessible styling.
- `apps/clinic-web/app/clinic/layout.tsx` — append scoped stylesheet after Phase 07.
- `tests/clinic-phase-08-patient-directory-validation.test.mjs` — source regression checks for permissions, SQL scope, privacy, duplicate/consent, status transitions, RTL and mobile layout.
- This document — scope and physical acceptance matrix.

## Manual browser / device acceptance — NOT RUN

| ID | Role/scenario | Expected | Status |
| --- | --- | --- | --- |
| C8-01 | Owner, >20 mixed-status patient records | Click four server-derived status cards; correct totals, no invented rows | NOT RUN |
| C8-02 | Receptionist, search name/ID/phone, 10/page | Correct server-paginated results, Next/Previous, clear filters, no stale patient data | NOT RUN |
| C8-03 | Share filtered page URL with authorized clinic member | Same validated query, status, sort, size, page restored without switching tenant | NOT RUN |
| C8-04 | Receptionist opens an Active patient from directory | Full authorized patient overview; book button passes clinic and patient to slot-validated wizard | NOT RUN |
| C8-05 | Receptionist opens Inactive/Archived patient | No direct book shortcut; server independently blocks unauthorized booking | NOT RUN |
| C8-06 | Cashier opens patient directory | Read-only, phone redacted by server, no create/edit/book actions | NOT RUN |
| C8-07 | Assistant tries patient-directory URL | Existing staff role checks deny access; no patient details leaked | NOT RUN |
| C8-08 | Register a new patient with notice acknowledgment | Backend allocates tenant-local clinic ID and stores demographic data only | NOT RUN |
| C8-09 | Register duplicate or near-duplicate patient | Candidate matches shown; no automatic merge; override needs valid reason | NOT RUN |
| C8-10 | Register patient without notice or with future DOB/both DOB+age | Client and server validation prevent unsafe submission | NOT RUN |
| C8-11 | Two clerks update same patient simultaneously | Server revision guard rejects stale write with safe localized retry guidance | NOT RUN |
| C8-12 | Owner/manager changes patient status, future appointment exists | Confirmation review and reason required; backend blocks deactivation/archival | NOT RUN |
| C8-13 | Owner/manager changes status with no future appointment | Actual backend/audit change confirmed, directory shows refreshed status | NOT RUN |
| C8-14 | Dentist opens patient record, then charts/files/visits | Existing clinical permissions and signed records are unchanged | NOT RUN |
| C8-15 | 320/375px RTL Dari and Pashto; English LTR, 200% text | Cards/forms/modal usable, no clipped touch controls or incorrect bidi numbers | NOT RUN |
| C8-16 | Offline/403/404/500, quick clinic switch, back-to-directory | Localized error, real retry, stable shell, no stale cross-clinic values | NOT RUN |
| C8-17 | Keyboard, screen reader, reduced motion | Focus visible, status buttons announce pressed state, dialog Escape works | NOT RUN |
| C8-18 | Verify other surfaces | No regression on patient/public/admin, imported CSV workflow, medical chart or print | NOT RUN |

## Quality gate

Merge only after `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS JS bundles and PostgreSQL HTTP integration pass on the exact branch commit. This does **not** certify clinic-device/manual acceptance; independent PH19 patient privacy/medical safety/legal/operational pilot gate remains **NO-GO**.

No database migration, new package, new environment variable or additional API route is required; existing protected registry and appointment APIs are reused.

After the merge:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

Test locally with `pnpm dev:api` and `pnpm dev:clinic` from `C:\projects\dentist` in separate PowerShell terminals.

**Next:** Clinic Phase 09 — Patient Workspace and Reception-to-Clinical Handoff Improvements.
