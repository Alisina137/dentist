# Clinic Phase 03 — Premium Design System

## Scope and completed implementation

Clinic Phase 03 standardizes the **existing** clinic management pages without inventing clinical capabilities, fake counters, unsupported permissions, payment methods, SMS status or sample patients.

- **Clinic-only token layer.** `apps/clinic-web/app/clinic/clinic-design.css` loads after the Phase 01/02 persistent workspace stylesheet. All selectors are scoped under `.clinic-persistent-shell`; public clinic login/onboarding, patient mobile/web and platform admin remain unaffected.
- **Typography.** Soft and highly readable Segoe UI/system fonts for English, existing Noto Sans Arabic for Dari/Pashto; a consistent heading hierarchy and tabular numerals for finance/appointment counters. No font files or external library added.
- **Palette.** Accessible-minded deep blue for navigation/primary actions, slate for supporting text, quiet white/blue-gray surfaces, consistent borders/shadows and visible keyboard focus. Status colors remain semantically fixed: green for approved/completed, amber for pending, rose for cancelled/rejected. No dark-mode override risks changes to dental chart color semantics.
- **Reusable primitives.** `ClinicSectionHeading` (real navigation action with icon), `ClinicMetricValue` (tabular count without fake data) and `ClinicEmptyState` (honest informational empty state, optional real destination). The overview dashboard uses these for appointment/patient data and genuine no-upcoming state; future clinic phases can import from `@dandanlink/ui/clinic-primitives`.
- **Surfaces.** One card/panel radius and subtle elevation system across the clinic command dashboard, patient directory, appointments, clinical workspace, operations, finance, reports and administration forms.
- **Controls.** Consistent button heights/states and form border/focus styling. Checkbox, radio, file upload and hidden fields are explicitly excluded from general input geometry to avoid breaking medical consent and clinical workflow. Danger actions retain red styling and existing click behavior.
- **Tabs, lists, data tables.** Standardized tab spacing, active state, scrollable tab containers and readable table rows, plus preserved responsive horizontal overflow.
- **Responsive/RTL/accessibility.** CSS logical spacing where used, mobile typography and cards, 3px focus outlines, reduced-motion safeguards, unchanged persistent sidebar/role filters and clinic tenant authorization. No database migration, backend modification or new npm dependency.

## Verification

`tests/clinic-phase-03-design-system-validation.test.mjs` checks isolated styling, tokens, metrics, empty states, real data binding, semantic statuses, accessibility rules and clinic-only imports.

All previous test suites should pass, including Clinic PH01–02, Stage H, Patient A–F, admin phases, and integration. The GitHub CI gate includes `pnpm test`, `pnpm typecheck`, `pnpm build`, Android/iOS Expo JavaScript exports and PostgreSQL integration.

## Manual visual acceptance (not performed by GitHub CI)

Use synthetic clinic owner, dentist, receptionist, assistant and cashier accounts in Chrome or Edge, and record screenshots only after removing identifying information.

| ID | Test | Expected behavior |
|---|---|---|
| CD3-01 | Owner Dashboard | Soft typography and harmonious blue/white/slate palette; live numbers remain identical to API; section headings and honest empty states readable |
| CD3-02 | Appointments / Queue / Requests | Calendar, buttons and status badges remain correctly differentiated; approving or cancelling changes real state, not only visual state |
| CD3-03 | Patients | Forms, filters, table and details use one sizing/border rhythm; wide tables scroll on narrow phones |
| CD3-04 | Clinical | Patient dental chart, signed-note controls and odontogram maintain existing clinical colors, structure and permission boundaries |
| CD3-05 | Finance and Reports | Numeric columns align, invoices and totals remain server-truthful; clear readable table headings |
| CD3-06 | Operations | Services, rooms, shifts, opening hours, validation and modal editors keep input usability and scroll position |
| CD3-07 | Staff, Listing and Settings | Cards, tabs, forms and primary/secondary/destructive actions look consistent across screens |
| CD3-08 | Multiple Roles | No previously hidden or unauthorized module appears merely because of styling; backend denials stay enforced |
| CD3-09 | English, Dari, Pashto | Typography, RTL and number layouts remain readable; no clipping/overlap or mirrored medical data |
| CD3-10 | Narrow screen, large text | 320–430px width and 200% text do not hide save/confirm/cancel controls; no accidental horizontal page scrolling |
| CD3-11 | Keyboard / screen reader | Focus ring visible, active tab announced, validation errors discernible, touch targets sufficient |
| CD3-12 | Reduced motion, slow network | No excessive movement; loading/empty/error states visually distinguished; navigation still persists |

**Release posture:** Automated CI success does not mean clinical, legal, accessibility, privacy or physical-device approval. Existing PH19 pilot remains **NO-GO** until independently accepted.

## Local update

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

Run the existing `pnpm dev:api` and `pnpm dev:clinic` commands in separate terminals for local visual QA. No new installation or migration.
