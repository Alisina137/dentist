# DandanLink — Clinic Improvement Phase 01: Persistent Workspace

**Scope:** The existing clinic management web portal under `/clinic` (six clinic roles, English/Dari/Pashto). This phase changes the navigation foundation only; it does **not** replace or invent patient/clinical/finance services.

## Shipped

- **Next App Router segment layout:** `apps/clinic-web/app/clinic/layout.tsx` mounts a single `ClinicPersistentShell` around all clinic dashboard, patient, appointment, staff, clinical, finance and settings page routes. The sidebar and header no longer unmount when a child page is loading.
- **Stable sidebar:** a clinic brand identity, current clinic and role, existing role-specific destinations, selected page indicator, desktop collapse-to-icons, device-local collapse preference, and integrated locale controls. No auto-redirect between clinics; access is derived from real `GET /v1/team/context` memberships.
- **Stable header:** page title and breadcrumb, authorized clinic selector, current role, sign-out control and mobile hamburger menu. Switching to a *different* clinic performs a **hard navigation** so patient/clinical state from the prior tenant is destroyed. Signing out clears the shell and returns to clinic login.
- **SPA routing:** clinic navigation links use Next `Link`. Existing raw internal `<a href>` links from PH02–PH19 are intercepted only when same-origin, same-clinic, ordinary left clicks. Downloads, modifier clicks, external links and cross-clinic navigation preserve browser semantics. Duplicate client navigation for `Link` is explicitly avoided.
- **No duplicate legacy chrome:** the PH03 `Shell` preserves the full existing staff/dashboard functionality but omits its per-page sidebar/header inside the new Next layout. PH03 shares the layout's tenant context instead of refetching identical `team/context` data during every route change.
- **Content-only loading/error states:** `loading.tsx` supplies route content skeletons while the persistent chrome stays. Tenant-context errors have retry or login options; the sidebar does not disappear for a new page.
- **Mobile + RTL:** overlay drawer with Escape-to-close, focus trapping, focus return, scrolling lock, responsive views, native screen reader labels, safe collapsed-sidebar state and LTR/RTL placement. Motion reduced under the OS preference.
- **Privacy:** no patient data copied to global/local storage; server continues to authorize all sensitive operations. Missing or invalid clinic ID never silently switches to an unrelated clinic.

### Expected current navigation

Top destinations and staff capabilities are unchanged in Phase 01: Overview, Appointments, Today's queue, Online requests, Patients, Clinical (authorized clinicians), Finance, Reports, Public listing, Staff, Chairs & rooms, Services & pricing, Hours & holidays, Notifications, Security, Settings, Subscription, Exports, Credentials and Membership. Phase 02 will reorganize the same authorized destinations into cleaner groups without breaking links.

## Regression gates

`tests/clinic-phase-01-validation.test.mjs` protects persistent App Router composition, layout-shared tenant context, no duplicated PH03 sidebar/header, role-specific navigation, tenant switching, client routing, loading-only content changes, and keyboard/RTL behavior. Full CI also executes `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android/iOS exports and PostgreSQL HTTP integration suites.

## Manual acceptance using synthetic clinic accounts

| Case | What to test | Required result |
| --- | --- | --- |
| C01 | Sign in as a clinic owner; navigate Overview → Appointments → Patients → Finance → Settings | Sidebar and header **never disappear** during screen loading; content only is replaced. |
| C02 | Open and close several sidebar destinations, then browser Back/Forward | Correct highlighted destination and breadcrumb after each navigation. |
| C03 | Collapse sidebar on desktop, reload browser, navigate three tabs | Icons-only setting persists and all items have descriptive accessible names. |
| C04 | Switch Dari RTL ↔ Pashto RTL ↔ English LTR | Icons, labels, breadcrumbs, role, clinic and layout direction are legible; no duplicated panels. |
| C05 | Small phone or 320px browser viewport, open hamburger | Drawer opens over content, focuses close control, Escape closes, Tab stays trapped and focus returns. |
| C06 | In owner account with two synthetic clinics, switch A → B | Hard reload; B's patient, financial and calendar data never display A's content. |
| C07 | Open invalid `?clinic=` ID or remove membership while browsing | No fallback into a different clinic or unauthorized patient data; error/login shown appropriately. |
| C08 | Role tests: owner, manager, dentist, receptionist, assistant and cashier | Only intended navigation shown; backend forbids unauthorized writes/reads. |
| C09 | File export/new tab/modifier click within clinic workspace | Proper native download/new-tab; no accidental SPA interception. |
| C10 | Sign out from appointments/clinical/finance | Access context cleared; login screen outside private workspace. |
| C11 | High-latency or offline transition between two tabs | Sidebar/header stable; page content loader or actionable error only. |
| C12 | Keyboard, screen reader and reduced-motion settings | Navigation/tab names, collapse and drawer buttons announce correctly; animations honor reduced motion. |

**Manual device/browser checks are pending.** Source/CI validation is not proof of clinical production readiness. PH19 remains **NO-GO** until independent clinical, legal, security, accessibility, privacy and backup-restore approvals are obtained.

## Update your IDE on Windows

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

No additional packages, environment variables, or database migrations for Phase 01.
