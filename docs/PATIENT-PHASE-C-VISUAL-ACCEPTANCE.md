# DandanLink patient — Phase C premium interface acceptance

**Scope:** Expo Go patient Home, Explore, published clinic/dentist profiles, native booking, appointment details, Saved, Reviews, Family, Account, Notifications. Continuation of Patient Phases A and B, not a production healthcare release.

## Visual system implemented

- Shared **patient-theme.ts** tokens for accessible readable type roles (minimum 12, caption 12, supporting text 13, body 14, card title 16, sections 19, page 22, hero 28), softened premium brand blues, warm neutrals, generous 18–20px card radius, tactile 48px controls and gentle card elevations.
- A complete consistent **patient-icons.tsx** set of dependency-free, offline React Native stroke icons replaces mixed navigation Unicode symbols. Includes Home, Search, Calendar, Saved, Profile, Clinic, Dentist/Tooth mark, Clock, Family, Records, Notifications, Settings, Security, Help, Review, Check, Telephone and Map. Icons are decorative and hidden from screen readers: interactive parent controls retain explicit accessible labels.
- Bottom tabs stay present on top-level screens, remain selected while content loads, mirror for Dari/Pashto, and use **consistent icons/labels** with a distinct active pill and adequate font size.
- Published clinic and dentist profile screens retain the existing booking action and also show a **persistent 54px Book Appointment button below scrolling content**. The button goes to the exact same live native booking wizard with clinic/dentist context, not a mock reservation.
- Home, account hub, public listing cards, trust indicators, search, verified provider pages, appointment cards, booking wizard, notification preferences, family forms, appointment chronology and reviews share cards, spacing, status colors and text hierarchy.
- Dentist and clinic profile CTAs now wrap on small phones and expose legible secondary **Call**, **Directions** and **Availability** buttons rather than mixing white text on white surfaces. Image fallbacks use the same icon language, no artificial provider image.
- RTL alignment and text shaping preserve the device's font fallback for Persian/Pashto; no custom font files or new mobile dependencies are installed. Source includes no remote icon calls, no generated clinical statistics or imaginary appointments.

## Automated checks

1. `pnpm test` including `tests/patient-phase-c-validation.test.mjs`, prior Phase A/Phase B validation and all general repository contracts.
2. `pnpm typecheck` for the full monorepo, including React Native type-safety and icon transforms.
3. `pnpm --filter @dandanlink/mobile exec expo install --check` and Expo Android export.
4. `pnpm build`, followed by all PostgreSQL HTTP integration suites and the existing PH19 synthetic restore drill in GitHub Actions.

## Manual acceptance, only with synthetic users

- **Device size:** verify compact Android phone (320–375dp), regular Android (390–430dp), iOS Expo Go and tablet where available. Text must not clip at 200% accessibility text size; cards must scroll, side-by-side actions may wrap and loading states stay consistent.
- **Three languages:** switch between Dari RTL, Pashto RTL and English LTR in Account settings. Review header, bottom tab order/icons, clinic tab scroll, doctor cards, booking chip selection, family consent, notification rows and review tabs. No mirrored/doubled letter shapes.
- **Scroll stability:** on Home/Explore/Account navigation, bottom tabs remain visible while requests load. On clinic and dentist details, scroll to bottom and check sticky Book Appointment remains usable, never overlaps the last section or covers the device safe area; Back returns to the originating profile.
- **Actions:** open any published clinic, open dentist, tap booking bar, select real service/provider/date and make a synthetic booking. Verify the original PH15 booking ID, price, approval status and appointment detail; do not infer availability from a preview alone.
- **Accessibility:** test TalkBack/VoiceOver focus order, tab selected state, button labels, 44–48dp control hitboxes, icon hidden semantics, status text colors in high contrast and reduced motion (existing animated skeleton respects OS setting).
- **Privacy:** switch patients, sign out, refresh Saved, open next appointment and account details. No data from a prior patient may appear. No clinical records or tokens are cached in general device storage; authenticated medical records still require separately approved clinic release.
- **Offline and errors:** search offline, try booking slot conflict with second user, load details with poor connectivity, check skeleton, retry and localized messages. This phase changes visuals, not server permission rules.

## Development command

After the verified PR is merged:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

In a second PowerShell terminal (after the API tunnel is ready):

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

No new packages, no database migrations and no environment variable changes.

**Medical pilot:** CI and screenshot-free source review cannot certify on-device visual accessibility, clinical suitability or legal compliance. PH19 production **NO-GO** remains until independent signed approvals and physical-device acceptance are complete.
