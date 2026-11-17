# DandanLink — Clinic Phase 10: Medical Chart and Treatment Workspace Refinement

**Scope:** existing authenticated clinic dental chart (original PH08) and treatment plans (original PH09) only. This clinic-improvement Phase 10 is distinct from the original app Phase 10 financial module. Backend chart, treatment, immutable evidence, consent, billing, clinical clinician role rules and dental anatomy remain authoritative and unchanged.

## Implemented and verified-in-code

### Dental chart
- Responsive clinician-only chart context with truthful counts of permanent/primary teeth, currently validated observations in the **selected** chart mode (current, selected visit or historical-as-of date) and teeth without an approved finding. **A tooth without a recorded observation is not labeled sound.** No inferred diagnosis or observed treatment.
- Fast FDI tooth number picker with Latin, Dari/Persian and Arabic-Indic numeric input normalization; validates the code against the currently selected primary/permanent FDI dentition, focuses the corresponding diagram button and reports a localized error for invalid codes.
- Status-and-history navigation using existing, server-authorized snapshot and 20-per-page tooth observations; observation comments are shown only if the API actually returned them.
- Fixed a chart privacy/stale-result issue: the chart context/snapshot/observation hooks are now bound to the exact API path, abort old requests and never paint the prior patient, tooth, clinic or mode's result after navigation.
- Before permanently validating an assistant's observation, the assigned clinician sees an explicit in-app review with actual patient number, FDI tooth, observed condition, linked encounter, date and notes. The clinician must confirm; Esc/cancel closes the review. Server validation and audit, assignment checks and append-only medical observations are unchanged.
- Assistants no longer receive links to registry patient overview or clinician-only treatment plans from the chart subnavigation. Their chart draft and visit/file links remain governed by the existing clinical backend. No chart SVG transformation, mirrored dentistry, fabricated findings, cosmetic color overlays or auto-charging.

### Treatment planning
- Clinician-only treatment-workspace hero with five explicit stages: draft → proposal → witnessed consent → performed-care evidence → completed plan. **These are education labels, not invented completion statuses.** Real links open existing clinical visits and dental chart.
- Plan list now defaults to All statuses with actual API status tabs, patient-scoped search, server 10-per-page results, Next/Previous, a genuine clear/reset state, and validated shareable URL search/status/page. No fabricated plan totals or rows.
- Existing detail plan tabs (Summary, Stages, Estimate, Consent, Timeline) now preserve the currently selected tab in the URL so links to specific steps open the intended real section.
- Detail dashboard shows **server-derived** completed-stage counts and native progress bar (no false percentage), current version-specific consent status and contextual links to consent/stages/AFN estimates/audit history.
- Unauthorized or unconsented stage advancement remains blocked by server rules; stage screen adds consent action shortcut and explicit signed-encounter evidence warning. Actual completed stages link to their existing clinical encounter.
- Clinician plan editor now validates FDI tooth codes (including no duplicate codes per stage), up to 30% estimate discount constraint, refuses discount greater than line amount and prevents negative-looking estimated totals. Backend remains the source of truth for service prices, ownership, allowed limits and clinical/financial decisions.
- Fixed another privacy/staleness gap in treatment data loader: patient/clinic/URL-bound snapshots and abortable GETs instead of rendering prior patient details during navigation. Server errors are mapped to localized safe text, never blindly echoed into clinical UI.
- Consent remains version-specific witnessed in-person attestation, not an e-signature; revising a plan creates an auditable new proposal and requires new consent. Stage completion still requires performed-procedure evidence in a signed clinical encounter. No automated invoice, procedure, payment or patient-facing release.

### Quality and presentation
- New authenticated-clinic-only responsive stylesheet with 1200px/800px/640px/375px breakpoints, visible keyboard focus, reduced-motion support and RTL/LTR-safe clinical numbers.
- New localized English/Dari/Pashto UI messages and separate confirmation review. Existing anatomical tooth SVG, FDI coordinates, surface codes, versioned chart/clinical append-only triggers, clinical permissions, billing and printing are not modified.
- No migration, new dependency, new endpoint, environment setting or demo medical record.

## Files
- `packages/ui-web/src/phase08.tsx`: chart read isolation, state-aware summary, FDI selector, clinical validation review, safer role navigation.
- `packages/ui-web/src/phase09.tsx`: treatment loader isolation, workflow UI, URL plan filters/tabs, consent/progress UI, client side FDI/discount validation.
- `apps/clinic-web/app/clinic/clinic-chart-treatment.css` + `layout.tsx`: authenticated-only responsive styling.
- `tests/clinic-phase-10-chart-treatment-validation.test.mjs`: source and security regressions.
- `docs/CLINIC-PHASE-10-CHART-TREATMENT-ACCEPTANCE.md`: this acceptance document.

## Browser/device clinical acceptance — NOT RUN

| Case | Actual role / scenario | Required observation |
| --- | --- | --- |
| C10-01 | Assigned dentist opens patient chart | Correct patient number and real chart snapshot; no stale cross-patient chart data |
| C10-02 | Switch permanent/primary and inspect FDI teeth | 32 vs 20 positions, correct jaw left/right, accessible arrow navigation; no flipped teeth |
| C10-03 | FDI picker in EN, Dari/Pashto at 320px/200% zoom | Latin/Persian/Arabic digits resolve right tooth; invalid code blocked |
| C10-04 | Current/visit/historical chart at different dates | Only actual validated observations; no false diagnosis on empty tooth |
| C10-05 | Assistant drafts an observation | Draft only, cannot validate; no unauthorized registry/treatment navigation |
| C10-06 | Dentist reviews pending assistant observation | Review shows correct patient/tooth/encounter/condition; server validates after explicit confirmation |
| C10-07 | Simultaneous validation by two clinicians | Server's immutable/audit/duplicate action checks reject repeated or incorrect validation |
| C10-08 | Network offline and clinic/patient switch mid-request | Safe localized retry, no wrong patient's chart/tooth history |
| C10-09 | Dentist creates plan with invalid tooth code or duplicate | UI and backend reject; drafts not partially written |
| C10-10 | Manager clinician edits AFN line price/discount | Maximum 30%, no discount exceeding amount, existing server owner-only discount rule |
| C10-11 | Search and filter with >10 real plans, reload URL | Correct assigned patient-only server page, query/status and Next/Previous |
| C10-12 | Plan status summary and consent version | Server-only counts/consent; no inferred medical readiness |
| C10-13 | No recorded consent in latest version | Stage progress blocked by existing backend; UI links to actual consent form |
| C10-14 | Accepted plan, stage has no signed evidence | Completion blocked; no auto-recorded performed procedure |
| C10-15 | Complete stage with signed matching encounter | Real link opens actual signed clinical note; audit history intact |
| C10-16 | Withdraw consent or revise an existing accepted plan | Versioned consent and refusal rules enforced by backend, no erasure of previous history |
| C10-17 | Load treatment tab by `?clinic=...&tab=stages` | Stages tab selected and filters intact; no stale prior patient's plan displayed |
| C10-18 | Private patient, platform admin and printed invoice/clinical charts | No new CSS leakage, clinical data disclosure or altered chart anatomy |
| C10-19 | Physical keyboard/reader, 320px, RTL and reduced-motion | Navigation, tooth picker and modal controls accessible; no forced animation |

## Build/release gate

GitHub PR CI must pass **pnpm test, typecheck, build, Expo Android/iOS exports and PostgreSQL HTTP integration** on the exact head SHA before merge. Manual browser and device acceptance in the table remains **NOT RUN** until a reviewer completes it. PH19 clinical, security, legal, privacy and operational pilot remains **NO-GO** regardless of automation success.

After verified merge:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

For local clinic smoke tests run `pnpm dev:api` and `pnpm dev:clinic` in separate PowerShell terminals from `C:\projects\dentist`. No schema migration or new environment variable.

**Next:** Clinic Phase 11 — Clinical Records, Documents and Patient Communication Refinement.
