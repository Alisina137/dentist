# PH08 — Interactive FDI dental chart and longitudinal observations

**Scope:** F08 / C12 / BR-CLIN-02 / AC08. Based on DandanLink Product Specification v1.0 and Software Development Workflow V5.

**Status:** Implemented in development. Do not import real patient health information before the professional, legal, retention, backup and clinical privacy gates are approved.

## User experience / demo
Open an assigned clinic patient: `/clinic/patients/:patientId/chart?clinic=...`.
The patient context and patient-tabs remain visible. The layout includes a clinical chart workspace, upper/lower full-mouth FDI map, anatomical patient right/left orientation, tooth legend, permanent/primary switch, mode tabs, selected-tooth inspector, observation form and tooth-history timeline.

1. Create an assigned encounter from Visits if none exists, or use a checked-in appointment encounter.
2. Select **Permanent**: 18–11 on the patient's upper right and 21–28 upper left; 48–41 lower right and 31–38 lower left. Select **Primary** to see quadrants 5–8, teeth 1–5.
3. Select tooth 11 and record `caries_suspected` for an earlier examination date. Select 21 and 51 to verify two different dentitions are preserved independently.
4. Record a subsequent `restored` observation for tooth 11. The **Current status** chart shows the later validated finding; **Historical chart** with the prior date shows the earlier state.
5. **Selected visit** shows only validated observations linked to that encounter.
6. Drill into a tooth to see recorded history (date, author, clinician validation, tooth surfaces, note), including draft review when permitted.
7. Assistant records a draft only for an encounter the assistant created in the prior phase; the assigned clinician explicitly validates it before it appears in current state. The assistant cannot validate a chart.
8. Invalid FDI codes, invalid tooth-surface combinations, future dates, changed idempotency retries and unauthorized cross-tenant requests fail on the server.

## Architecture and invariants
- API `/v1/chart/clinics/:clinicId/patients/:patientId/{context,snapshot,observations}`; validation is `POST observations/:id/validate`.
- Only tenant-active, case-assigned clinical members access chart data. An authorized dentist with an assigned appointment or encounter may read relevant validated patient history, including previous clinician entries. Assistants can access only when they own a currently unsigned encounter draft; their entries remain drafts until qualified review. Receptionist, cashier, platform admin, unaffiliated clinicians and patients cannot access clinical chart routes.
- Chart observations always reference the FDI two-digit code, dentition, patient/clinic, source encounter, author, observation date, condition, surfaces, notes and validation provenance. The composite DB foreign key prevents cross-patient/clinic encounter association.
- Condition enum: `sound, caries_suspected, restored, missing, extraction_planned, root_canal_treated, crown, implant, other`. Tooth surface choices: `M,D,B,L,P,O,I`; no posterior incisal or anterior occlusal tags.
- No chart write is permitted without a prior authorized encounter (clinical workflow decision: no implicit encounter creation). Changes are **new observations**, never edits to old findings. PostgreSQL triggers prevent deletes and changes except a draft's qualified validation stamp.
- Current and dated chart projections use validated observations, ordered by observation date and validation time, not by appointment time or most recently clicked screen. Drafts are visible only in authorized tooth history.
- Idempotent create actions prevent duplicate clinical entries on retry; a changed payload with the same key returns a conflict. Selection/date history are server-side filtered, not client-only display tricks.
- Dental chart renders in anatomical LTR sequence independently of app RTL; language and date presentation support Dari, Pashto, English and Solar Hijri/Gregorian. Explicit Gregorian observation-date inputs prevent calendar ambiguity. Native numbered buttons support keyboard focus and arrow selection. On phones, horizontal scroll/zoom and a numbered select remain available.
- No diagnosis is inferred from a condition code. No billing/treatment plan automation and no patient-facing access are shipped in PH08. Treatment planning is PH09; patient-release flows PH15.

## Verification and gates
- Structural tests `tests/phase08-validation.test.mjs`.
- Authenticated PostgreSQL HTTP tests `tests/phase08-integration.mjs` reusing the real clinic/clinician fixture; DB trigger test `tests/phase08-immutability.ts`.
- CI runs `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo checks and all clinical integration tests.
- Manual dentist review of permanent/primary orientation, tooth morphology and terminology, mobile/tablet viewport, RTL, keyboard/tab order, focus and contrast remains mandatory.
- Clinical chart is **schematic**, not professional diagnostic imaging. No clinical license verification, external malware scan, or production retention/data recovery certification is claimed.

## Local update
```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm db:migrate
pnpm check
```

Next: PH09 treatment planning, consent, stages and proposed estimates (not automatic charges).
