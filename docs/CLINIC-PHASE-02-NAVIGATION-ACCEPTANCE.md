# Clinic Phase 02 — Navigation Restructuring

**Source of truth:** Existing `/clinic` routes and the authenticated `GET /v1/team/context` staff membership from Clinic Phase 01. The current application already has these destinations; no new clinical/finance business capability is implied by a navigation item.

## Implemented

- The Phase 01 persistent sidebar now displays **Overview** directly at the top and six purposeful, expandable categories: **Front Desk**, **Clinical Care**, **Billing & Reports**, **Operations**, **Growth & Updates**, and **Settings**. Empty sections never render.
- Each group contains only real, currently allowed navigation links returned by the existing `navigation(space)` role filter. Owner/manager, dentist, receptionist, assistant and cashier see context-appropriate sections. This is UX filtering, **not** authorization; existing server permissions and clinician verification continue to decide access to sensitive endpoints.
- Group headers have clear 24–48px interactive affordances, iconography, item counts, keyboard focus, `aria-expanded` and `aria-controls`. Users can fold/unfold groups. Only **boolean group expansion preferences** are stored locally; no clinic/patient identifiers, staff roles or searched terms are saved.
- A user navigating into a section automatically sees that section expanded. The active destination is the *longest matching route*, not every ancestor (e.g. Today's Queue is active, not both Queue and Appointments). Deep links preserve selected clinic context.
- Fast, localized **navigation search** across permitted route labels and their group names; no API request and no patient-data search. `Ctrl+K`/`Cmd+K` opens search. Clearing the field restores grouped navigation. The search icon expands an icon-only desktop sidebar before focusing the field.
- Role-sensitive **Quick Access** links in the content header provide direct navigation to existing most-used routes. No fake notification badges, counts, or unsupported routes are displayed.
- Multi-level breadcrumbs show Workspace → Section → Page → generic Details when needed; private patient identifiers and arbitrary database IDs are never printed in breadcrumbs.
- Collapsed desktop sidebar still exposes every allowed route as a consistent icon button, even if a section is folded. Mobile drawer always shows full labels/group accordions, regardless of previously saved desktop collapse preference, and retains Escape/focus-trap/scroll locking. RTL chevrons and reduced-motion styles included.
- English, Dari and Pashto have translated group names, search, shortcut, collapsed/expanded accessibility labels, quick actions and detail breadcrumbs.

## Automation & quality gates

- `tests/clinic-phase-02-validation.test.mjs` verifies six groups, unique real routes, role-filtered links/quick actions, search isolation, selected route specificity, tenant isolation, keyboard and RTL accessibility.
- Existing Clinic Phase 01 source regressions continue checking the persistent shell, selected tenant, no duplicate global header, signout/role revalidation and non-disruptive route transitions.
- Full GitHub CI must pass `pnpm test`, `pnpm typecheck`, `pnpm build`, Android/iOS Expo JS bundles, and PostgreSQL HTTP integration before merge.

## Manual browser acceptance (NOT RUN in GitHub)

| ID | Check | Expected observation |
| --- | --- | --- |
| CN2-01 | Owner / manager login | Overview plus real role-visible section groups; no missing/unauthorized route leaked |
| CN2-02 | Receptionist | Quick access prioritizes Online Requests, Today's Queue and Patients; Finance shown only if existing role access allows |
| CN2-03 | Dentist | Clinical Care is present and Quick Access prioritizes appointments/clinical work; credentials link remains available |
| CN2-04 | Assistant | Cannot see Owner-only Settings, Reports, Finance or Staff Management as regular sidebar destinations |
| CN2-05 | Cashier | Finance and Reports are accessible in Billing; no clinical notes or private record shortcuts |
| CN2-06 | Search | Search existing route in English, Dari, Pashto; results only include authorized pages; empty search has a proper empty state |
| CN2-07 | Keyboard | Ctrl+K/Cmd+K opens input, Escape clears search; section header toggles with Enter/Space, `aria-expanded` changes |
| CN2-08 | Selected route | Appointments → Queue and Settings → Security highlight exactly one page, display correct category and breadcrumb |
| CN2-09 | Accordion persistence | Close and reopen a group; reload and check preference; navigating to that group reopens it |
| CN2-10 | Icon-only desktop | Collapse sidebar; group content remains reachable with icon labels; search reveals expanded sidebar |
| CN2-11 | Mobile 320–430 px | Drawer opens with group labels, scroll, search, focus trap; Back/Escape/backdrop close; all links still reachable |
| CN2-12 | RTL + font size | Dari and Pashto text/chevrons/order correct; 200% text and narrow screens remain usable |
| CN2-13 | Tenant switch | Change to another authorized clinic: hard reload, no patient data from prior clinic; unrecognized clinic ID denied |
| CN2-14 | Loading/network | Sidebar persists during page transitions; refresh/permissions changes show correct skeleton/error behavior |
| CN2-15 | Independent checks | Healthcare pilot remains **NO-GO** until clinical, legal, privacy, security and physical acceptance evidence is signed |

Use **synthetic accounts** and record actual browser observations before marking any manual row PASS. No completed physical/browser testing is claimed by this PR.

## Local pull / run

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

In a second PowerShell terminal:

```powershell
cd C:\projects\dentist
pnpm dev:clinic
```

If your project uses a different root script for the clinic web app, run its existing `pnpm --filter @dandanlink/clinic-web dev` command instead. No new npm packages or database migrations are necessary.

**Next roadmap stage:** Clinic Phase 03 — Premium Design System.
