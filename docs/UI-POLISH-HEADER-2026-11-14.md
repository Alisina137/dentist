# UI refinement — cleaner portal headers and patient experience

**Scope:** DandanLink shared website layout on clinic, administration and patient websites, plus existing patient discovery and account interfaces. This is a usability and visual refinement, not a feature phase or data migration.

## Request addressed

- Remove **both the language selector and calendar/year-type selector** from the global top header in patient, clinic and admin sites. These are not hidden with CSS; `SiteLayout` no longer renders `LocaleControls` there.
- Keep those preferences functional **in the correct context**. On the patient website select `My Account → Preferences` (and onboarding). Clinic/admin workspace sidebars continue offering `LocaleControls` where they were present. Existing API persistence/RTL behavior remains untouched.
- Clean up the top header: consistent DandanLink brand mark and portal label, purposeful Home/Search/About/Account (patient), correctly marked active page, responsive single-row mobile toggle with `aria-expanded`, `aria-controls`, close on navigation and accessible focus states. No empty navigation tabs and no horizontal header overflow.
- Refine visual hierarchy across all three portal headers, buttons, spacing and form focus. Larger comfortable type, consistent iconography, soft surfaces, clearer CTA contrast, durable skeleton/loading states, improved patient account and public discovery cards, tighter responsive layouts, RTL-aware alignment and reduced-motion support.
- Patient account navigation reuses shared stroke SVG icons rather than random Unicode shapes; quick actions, family membership cards, alerts and onboarding icons are consistent.
- Site styles remain maintainable: `packages/ui-web/src/polish.css` is a separate additive layer loaded after the legacy stylesheet by all three website app root layouts. Revert or adjust polish independently of feature CSS. `packages/ui-web/src/care-icons.tsx` is a shared icon component without new dependencies.
- **No authentication, family-consent, clinical permission, booking or database changes.** Previous PH01–PH14 behavior remains intact.

## Automated acceptance

`tests/ui-polish-validation.test.mjs` checks header selector absence, presence of a real accessible mobile menu, patient and clinic/admin preference controls in the correct location, working account navigation, style import in all sites and reduced motion. The normal CI additionally validates TypeScript, web builds, Expo Android export and PH01–PH14 PostgreSQL HTTP acceptance.

## Pull into Windows checkout

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

No `db:migrate` needed: this update includes no schema changes.
