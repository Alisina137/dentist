# DandanLink Administrator UI — Phase A Acceptance

Status: **Implemented in code**, production/patient-health data safety gates unchanged. This phase is design-system and navigation modernization; the data-rich Dashboard redesign is reserved for **Phase B**.

## Scope

- **Admin-only** CSS tokens and design language. No changes to clinic/patient web portals or backend authorization.
- Softer multilingual UI font stacks: Segoe UI/system for LTR, Vazirmatn/Noto Sans Arabic/Tahoma fallback for Dari and Pashto RTL. No font binaries or external font dependency added.
- Accessible consistent SVG icon set across 12 existing admin destinations.
- One shared, persistent admin workspace shell, with **5 logical groups**: Overview, Verification, Finance, Operations, Platform. All the existing routes remain intact.
- Desktop sidebar collapses to icon mode. Persist state in localStorage (`dandan.admin.sidebarCollapsed`); all icon-only links retain `aria-label` and `title`.
- Mobile / tablet sidebar is a drawer with overlay and Escape-to-close. Closed drawer is hidden from visual/focus presentation. The navigation still honors role: support agents only get Support and Analytics. The server remains the authority for permissions.
- Dedicated accessible breadcrumb/page label, identity badge, localized role, and signout in the header. No duplicate page-level sidebar.
- Shared typography, card density, controls, color semantics, focus rings, loading skeleton, responsive layout and reduced-motion behavior; buttons and cards use consistent tokens.
- Design improvements are scoped under `.shell-admin` and imported solely by `apps/admin-web/app/layout.tsx`. Existing review, listing, payment, support and monitoring logic is preserved.

## Acceptance checklist

| Scenario | Expected result |
| --- | --- |
| Switch Dashboard → Clinics → Dentists → Plans → Support | Sidebar and header persist without disappearing; only content changes/loading state appears. |
| Collapse on desktop, navigate and reload | Icon-only state remains; tooltips and keyboard accessible names remain. Expand to restore selectors. |
| Open drawer on mobile | Overlay appears; background scrolling is blocked, Escape closes, link selection closes automatically. |
| Change language English / Dari / Pashto | Labels, breadcrumbs, buttons, and typography adapt; sidebar flips correctly in RTL. |
| View account as support agent | Only Support and Analytics visible; other admin routes continue to enforce server permissions. |
| Active route with nested detail | Parent navigation item stays highlighted; header label follows selected area. |
| Reduced motion enabled | Animations and drawer transitions disabled; content remains usable. |
| Keyboard navigation | Focus-visible outlines present on links, buttons, inputs; collapse and drawer controls have labels. |
| Narrow phone (≤590px) / small tablet (≤900px) | No persistent desktop column; drawer for nav and compact page header, content remains scrollable. |
| Clinic and patient apps | Appearance and navigation unchanged; no phase-A admin CSS import. |

## Validation

`pnpm test`, `pnpm typecheck`, `pnpm build`; newly added `tests/admin-design-phase-a.test.mjs`, and prior `tests/admin-persistent-navigation.test.mjs` regression coverage. CI covers the existing backend workflow including 100-way booking contention, database restore and app builds; this phase introduces no API or DB migration.

## Explicitly deferred to Phase B

Home dashboard KPIs, live queues, historical charts, activity feed, additional notification features and related backend aggregation. Phase A does not invent backend metrics or mock status counts. 

## Security and release boundaries

No change to production protected-data write gate, MFA or authorization. Navigation visibility is an enhancement, **not** a security boundary. Full real-clinic production launch remains blocked by the PH19 legal, clinical and infrastructure sign-off checks.
