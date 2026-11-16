# Clinic Phase 01 — Persistent Clinic Workspace

## Objective
Replace the per-route clinic sidebar/header with a **Next.js segment layout** that persists while the current page content changes. Preserve existing clinic appointments, medical notes, permissions and workflows. Do not change backend authorization, claim patient data, or introduce fake content.

## Shipped
- `apps/clinic-web/app/clinic/layout.tsx` mounts persistent `ClinicPersistentShell`, and `loading.tsx` loads only the route content (the sidebar and header remain mounted).
- Authenticated staff/tenant identity is fetched once from `GET /v1/team/context` using a cancelable, non-cacheable request; existing PH03 clinic portals consume this selected tenant via `clinic-shell-context.tsx` without refetching context after every navigation.
- The sidebar remains visible on desktop, remembers user preference for expanded versus icon-only display, uses consistent icons, shows authorized destinations for owner/manager/dentist/receptionist/assistant/cashier, and indicates the active link.
- The sticky header displays breadcrumbs, the current route, verified clinic name and staff role, plus a signed-in signout button. For multi-clinic users, switching tenants intentionally navigates through a **full reload** to prevent old clinic data remaining in mounted patient/medical forms.
- The mobile drawer supports a backdrop, Escape to close, keyboard-focus trapping, body scroll lock, and RTL positioning. A prior collapsed sidebar preference cannot hide mobile navigation labels.
- Same-tenant `/clinic` links transition through the Next router rather than causing a full page refresh. External links, files/downloads, modified clicks, login/onboarding and cross-tenant links retain standard navigation.
- The legacy per-page `Shell` still works outside of the persistent layout but does not produce a duplicate sidebar, header or clinic selector inside it.
- Consistent route progress, small content-only loading skeletons, reduced-motion handling and English/Dari/Pashto labels. No dependencies or DB migrations.

## Automated acceptance
`pnpm test` (including `tests/clinic-phase-01-validation.test.mjs` and historical Phase 03–19 tests), `pnpm typecheck`, `pnpm build`, Expo bundles and PostgreSQL synthetic HTTP integration must pass GitHub CI before merging. The new clinic layout never bypasses existing server-side tenant or clinical record authorization.

## Device/browser acceptance — NOT YET RUN
Use synthetic accounts only. Verify on desktop Chrome/Edge, browser at 320–375 px, Dari RTL, Pashto RTL and English LTR:
1. Log in as owner. Navigate Overview → Appointments → Patients → Clinical (when enabled) → Finance → Staff → Settings. The sidebar and header **remain mounted and visible**, while only the page content loads. Click active destinations to verify highlighting/breadcrumb.
2. Collapse the desktop sidebar to icons; navigate away and back. Preference persists on the same device; expand and verify labels return. Switch to mobile viewport while sidebar is collapsed, open the drawer and verify **all menu text is visible**, the backdrop dismisses it, Escape closes it and keyboard Tab stays within it.
3. Use receptionist, dentist, assistant, cashier and manager synthetic accounts. Verify only the existing role-appropriate menu destinations appear, and that direct unauthorized API/page actions remain denied on the server.
4. Sign in to a second synthetic clinic. Changing the active clinic must perform a hard reload; inspect patient/clinical page for stale records belonging to the previous clinic. Manually open an unrecognized `?clinic=` value: the layout must show no clinic data and refuse to auto-fallback to another tenant.
5. Test booking requests and patient action links already rendered by legacy pages. Internal route clicks preserve the authorized clinic query; file downloads, Ctrl+click, new-tab and external links still behave normally.
6. Verify loading/error/retry behavior with airplane-mode / network disconnection and verify sign-out routes to login without retaining prior staff or patient data.
7. Check screen readers, high-contrast focus outlines, RTL chevrons, smaller screens, 200% text sizing and prefers-reduced-motion. Record failures for Phase 2.

**Healthcare production:** existing PH19 medical pilot **NO-GO** and independent approvals remain in effect. CI is not physical usability or clinical/legal approval.

### Pull
```powershell
git -C C:\projects\dentist pull --ff-only origin main
```
No new installation, environment variable or schema migration is necessary.
