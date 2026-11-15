# DandanLink — Administrator Phase F Acceptance

## Scope and release boundary

Phase F completes **administrator security, delegated access settings, localization, keyboard accessibility, pilot-gate clarity, and automated regression coverage**. It does not certify production, legal requirements, clinical workflows or private-health-data hosting. The PH19 release switch remains **blocked by default**, regardless of how attractive or complete the admin UI appears.

**No new SQL migration is needed in Phase F.** The Phase E database migration must have been applied already (`pnpm db:migrate` remains idempotent).

## New MFA security posture API

`GET /v1/admin/security/posture` is an independent `opsIdentity` + `opsAdmin` MFA-verified platform-admin-only endpoint. It returns only aggregates:

- Active platform admin and support-agent grants; verified MFA enrollment and incomplete MFA accounts; email-verification *counts*.
- Active privileged session count, never sessions or tokens.
- Counts of recent unsuccessful audit outcomes, delegated support grants/revocations and the top audit action/outcome groups.
- Operator-declared pilot approval tally and release flag from the existing PH19 gate.
- A privacy and **independent external verification required** disclaimer.

**Never** returns principal identifiers, patient information, authentication tokens, private support messages or clinic invoice line items. Data comes from current PostgreSQL queries, not mocks. Authentication and MFA enforcement occur on the backend, not only as hidden links in the UI.

## Admin Security page

`/admin/security` now has a dedicated, multilingual, mobile-adaptive security dashboard showing MFA gaps, access grant counts, audit groups, active privileged sessions and production release gates, with direct links to the Settings, Operations Center and Pilot Readiness pages. Loading, retry, privacy disclaimer, aggregate counts and Kabul timestamps are explicit. Current operator switches must not be mistaken for external legal/security proof.

## Settings and delegated support

`/admin/settings` keeps the server's existing admin-only security gate and safe support-category/template mutations. Changes improve:

- Separate Categories, Reply Templates and Support Agents sections, consistent forms, styling and active selection states.
- Existing category/template identifiers are visibly locked during edits so an edit cannot accidentally create a new resource with a different key. New records remain possible after clearing the editor.
- Explicit **I verified the recipient** checkbox before granting a support role.
- Clearly visible MFA readiness for each delegated support account. Being granted a role does not bypass MFA requirements or permit clinical/clinic financial access.
- Filter agents by display name, confirmation **bound to the selected account** before revocation; no fragile native confirm dialog. Revocation continues to be enforced and recorded by existing backend.
- All labels and warnings translated to English, Dari and Pashto.

## Accessibility and pilot readiness

- Ctrl/Cmd+K admin command overlay restores keyboard focus to its origin on closing; the notifications dialog receives focus when opened from the bell; Tab and Shift+Tab remain trapped while open. The sticky sidebar continues across route changes without loading or unmounting.
- Pilot Readiness displays **completed and incomplete gates** with an accessible progressbar, a concise translated checklist and an explicit independently signed evidence warning. Never treats operator toggles as certification.
- Scoped CSS provides responsive typography, consistent tables/forms, RTL logical spacing, readable status colors and a reduced-motion preference.

## Automated acceptance

New `tests/admin-phase-f-validation.test.mjs` checks authorization, sensitive-data exclusions, focus/RTL, MFA confirmation and pilot safeguards. New `tests/admin-phase-f-integration.mjs` runs PH19/E integration first and then verifies against live PostgreSQL:

| Verification | Expected |
| --- | --- |
| Anonymous or clinic-owner request for admin security | HTTP 401 / 403 |
| Admin without verified MFA | Denied by `opsAdmin` (covered by existing identity/MFA tests) |
| MFA-verified administrator | Aggregate security page succeeds and is `Cache-Control: no-store` |
| Aggregates | Platform-admin/support MFA readiness matches direct PostgreSQL counts |
| Privacy | No patient/principal identifiers, session tokens or contact addresses in posture |
| Support settings | Only admin permitted; per-account boolean `mfa_ready` and `email_verified` |
| PH19 launch status | Pilot release remains blocked in CI |
| Admin UI | Language/RTL, keyboard focus restoration, responsive cards, stable sidebar |
| Full product | Existing auth, booking, medical, finance, Expo bundle, backup/restore and migration checks |

## Manual acceptance required before treating the entire app as ready

Automated unit/HTTP/build checks are **not** a real browser accessibility audit or clinical go-live signoff. An authorized operator still needs to test on actual desktop and mobile browsers, screen reader and keyboard-only navigation, the three languages, evidence uploads, credentials, paid-invoice audit behavior, support grant/revoke with live identities, and the nine independently verified PH19 clinical/legal/infrastructure gates. Follow `docs/PH19-PILOT-RUNBOOK.md` and `docs/PH19-ACCEPTANCE.md`.

### Local update
```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

All Phase F changes are expected to be merged into `main` only after the entire GitHub CI test suite, builds, Android bundle and real PostgreSQL integrations pass.
