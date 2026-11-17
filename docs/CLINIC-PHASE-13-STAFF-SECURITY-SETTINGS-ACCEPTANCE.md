# DandanLink — Clinic Improvement Phase 13
## Staff, Roles, Permissions and Clinic Settings Refinement

**Scope:** the real authenticated clinic staff and management interface (`/clinic/staff`, `/clinic/staff/:membershipId`), clinic security (`/clinic/settings/security`) and owner-only registration settings (`/clinic/settings`). These are **improvements to existing authenticated functionality**, separate from the original project's application PH13 patient discovery module.

## Implemented

### Staff workspace and navigation
- Three **in-page** tabs: Team, Dentists and Invitations. Switching tabs updates the query string, preserves the clinic ID, and does not reload or collapse the persistent clinic sidebar/header.
- Team list uses actual `/v1/team/clinics/:clinicId/team` response. Real staff counters (total, active, suspended, active clinicians), search by name/email/role, status and role selectors, clear filter, **five members per page**, patient-safe empty/loading/retry and an explicit open-membership link.
- Dentist cards are built only from existing authorized dentist/draft records. Search and five-card paging are added. Professional drafts are **not** labeled verified or public.
- Owner/manager can navigate directly to invitations from the team or dentist view; other roles still fail clinic staff permission gating. Server remains the authority.

### Invitation workflow and lifecycle
- Owner/manager **with MFA** can review an exact recipient email, intended role and clinic before sending an invitation; explicit acknowledgement required. The owner may invite a manager, but a manager may not assign a manager or owner role.
- Registration **does not create a staff password or membership**. An invitation grants no access until a **verified account** accepts it. The API enforces subscription seat limit, email canonicalization, duplicate/pending/same-user checks, authenticated role ceiling and MFA.
- Staff invite list contains server-provided latest **100** invitations and clearly states the limit, with status/email/role filtering, five-per-page controls, send time, expiry, cooldown-aware resend and reason-required revocation. Revoke has a separate confirmation review; it does not delete accepted memberships.
- Email sending is performed by the existing backend. If SMTP delivery fails, the UI reports failure and does not claim an email was delivered.

### Safe role, status and clinical-affiliation actions
- Member detail shows real status, current role, join date, MFA and recorded events, plus a clear warning that membership actions may revoke all account sessions.
- Role change, suspension, reactivation, revocation, force logout, and clinician affiliation updates now use a **review dialog showing the specific member, clinic, action and typed reason**. Confirmation checkbox and explicit final action replace the native `window.confirm` path.
- Client mirrors server restrictions: no owner removal, no self-removal or self-role changes, manager cannot modify other managers, no changes to revoked staff, 5-character reason requirement and MFA. Server still validates and audits on every write, rejects stale state transitions, revokes sessions where required and prevents privilege escalation.
- Dentist qualification/profile edits remain private, versioned and marked **unverified**; no automatic public credentials or clinical permissions are fabricated.

### Security and access overview
- Authorized staff access list displays MFA status, actual membership status, last change and member links. Search + five-row paging, and real count of visible members, MFA-enabled active members, and recent audit events.
- **Only your own sessions** are displayed in the session list; not all colleagues' devices. Session list and latest **60** audit events each show five entries per page. No edit/deletion of audit entries.
- "Sign out of all devices" affects **your own account** and requires a typed reason and confirmation dialog. Other staff logout uses the separately audited and MFA-protected staff management operation.

### Owner clinic settings
- Clinic selection respects the requested `?clinic=` parameter only if returned by the owner-scoped `/v1/clinics` endpoint. Unknown or unrelated clinic IDs are never trusted.
- Changing owner clinics resets detail, errors and form fields immediately, and aborts acceptance of late responses from a previous clinic. Unsaved edits require a discard decision. Refresh and reset actions and a dirty-state indicator prevent accidental changes.
- Settings remain restricted to the clinic owner server-side. The update sends the **actual stored revision**, only for eligible, changed clinic records. Server enforces optimistic concurrency and validation.
- Changes to **approved** clinic details go into **pending review** instead of being immediately published. UI explains the review gate and retains all existing registration fields.
- Shortcuts connect the authorized clinic to staff, security, services, hours, subscription and private export. The persistent clinic navigation and tenant selection remain intact.

### Presentation
- Professional clinical blue palette, spacious headings, icon badges, staff and security KPI cards, searchable role lists, accessible review dialogs, confirmation controls, clear notifications and responsive clinic-specific layouts.
- English, Dari and Pashto translations, RTL-friendly alignment and bidirectional-safe emails, keyboard focus, Escape-to-close dialogs, 1150/780/580/375 px breakpoints and reduced motion.
- CSS is imported only in the persistent clinic layout, not in the public patient or platform admin interfaces. No dependency, database migration or environment file changes are required.

## Changed files

- `packages/ui-web/src/phase03.tsx` — Team, Dentists, Invitations, Member Details, Security.
- `packages/ui-web/src/phase02.tsx` — owned clinic setting selection, dirty forms and scoped details.
- `packages/ui-web/src/clinic-staff-model.ts` — pure role, invitations, staff filtering/paging and settings dirty-state guards.
- `apps/clinic-web/app/clinic/clinic-staff-settings.css`, `apps/clinic-web/app/clinic/layout.tsx` — clinic-scoped modern design.
- `tests/clinic-phase-13-staff-security-settings-validation.test.mjs` — permission, URL, review, privacy and settings regression coverage.
- This acceptance document.

## Manual clinic/operator testing — NOT YET PERFORMED

| Test | Scenario and expected behavior |
| --- | --- |
| C13-01 | Owner with MFA opens staff; tabs switch **without collapsing sidebar/header**, URL keeps clinic. |
| C13-02 | Staff list has >5 members: counts from server, five/page, role/status/email filters, reset and correct page. |
| C13-03 | Dentist list contains real clinicians; a manager with clinician affiliation is counted, unverified draft never appears public. |
| C13-04 | Owner invites cashier, reviews clinic/email/role and acknowledges, then sends. Invitation is pending, not an account. |
| C13-05 | Manager tries to invite manager/owner, or dentist opens invite URL: frontend restrictions and **403 server denial**. |
| C13-06 | Owner has no MFA: invitation and privilege-changing actions remain blocked; MFA setup shown. |
| C13-07 | Invalid email, duplicate invite, self-invite, maxed subscription seat and SMTP failure: no false success. |
| C13-08 | Invitation expires after seven days; resend cooldown of 60 seconds enforced server-side; UI matches. |
| C13-09 | Revoke pending invitation with reason, review recipient, accept. No accepted membership is deleted. |
| C13-10 | Owner modifies staff role; verify action review, identity, reason, permitted role and server session revocation. |
| C13-11 | Manager tries editing another manager, owner or own membership: denied; owner privileges preserved. |
| C13-12 | Suspend, reactivate and revoke allowed membership; status matches server; suspended account loses clinic access. |
| C13-13 | Force logout an authorized member; all target account sessions revoked, but memberships in other clinics unchanged. |
| C13-14 | Update clinician affiliation; unverified private profile draft remains unverified. |
| C13-15 | Role actions with stale membership or concurrent change: backend rejects; refresh shows current server state. |
| C13-16 | Security page shows only own sessions, member MFA status, latest 60 scoped audit events, searchable/paged. |
| C13-17 | Self sign-out review requires reason and acknowledgement; all own sessions removed; redirect to clinic login. |
| C13-18 | Owner with 2 clinics switches settings: no prior clinic details remain visible, errors/data scoped to new clinic. |
| C13-19 | Switch while unsaved form: discard prompt; cancel retains current form; confirm safely resets. |
| C13-20 | Unknown clinic ID in URL or manual API request: no owner data leak. |
| C13-21 | Change approved clinic contact: API stores revision, sets status to pending review. No automatic public listing update. |
| C13-22 | Concurrent clinic settings revisions: stale update rejected; local page reloads server record. |
| C13-23 | EN, Dari, Pashto, RTL and mobile 320/375px: focusable buttons, readable rows, safe review dialog. |
| C13-24 | Regression: patient, public, admin, clinical records, invoices and mobile app remain unchanged. |

## Verification and release

Merge only when the GitHub Actions run for the **exact PR head SHA** passes `pnpm test`, `pnpm typecheck`, production builds, Expo Android/iOS bundles and PostgreSQL HTTP integration. Automated tests do not replace physical-browser accessibility/security review. The independent production **PH19 pilot is still NO-GO** pending manual approval.

After CI success and merge:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

**Next:** Clinic Improvement Phase 14 — Scheduling, Notifications and Reporting Cross-Workspace Polish.
