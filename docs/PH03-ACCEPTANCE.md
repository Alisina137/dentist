# PH03 — Staff invitations, role security, dentist identity
Specification: F03; C24 Team/Dentists/Invitations; C25 Staff Detail; C34 Security & Access; AC03.

## User-visible capability map

| Role | Navigation/route | Write powers | Server gate |
| --- | --- | --- | --- |
| Clinic owner | /clinic/staff Team, Dentists, Invitations; /clinic/settings/security | Invite all non-owner roles, change delegated roles, suspend/revoke and audit | Verified session + membership owner + MFA |
| Clinic manager | Same staff/security pages | Invite/edit only dentist/receptionist/assistant/cashier; not manager/owner or self | Verified session + active tenant manager + MFA |
| Dentist | /clinic and own /clinic/staff/:membershipId | Edit own unpublished professional identity draft | Verified session + active dentist membership |
| Receptionist | /clinic and own staff detail | View own membership and sessions only | Active tenant receptionist membership |
| Dental assistant | /clinic and own staff detail | View own membership and sessions only | Active tenant assistant membership |
| Cashier | /clinic and own staff detail | View own membership and sessions only | Active tenant cashier membership |

Routes added: /clinic/staff?tab=team|dentists|invitations, /clinic/staff/:membershipId, /clinic/settings/security, /clinic/invite?token=..., /clinic/2fa.
API: /v1/team/context, /v1/team/sessions, /v1/team/invitations/preview|accept, /v1/team/clinics/:clinicId/{team,dentists,invitations,security,staff/:membershipId}.
Plan staff capacity includes owner membership and reserved unexpired invitations. Trial must be valid (or subscription active/in grace) before inviting more users.

## Automated acceptance tests
- AC03-01: New clinic has atomic owner membership and existing PH02 clinics are backfilled through migration 0003.
- AC03-02: Staff invite uses verified email only, no automatic active membership; link token random and stored only as SHA256 digest; 7-day validity and resend/revoke path.
- AC03-03: Accept requires authenticated email-verified identity matching the invitation and atomically marks token used.
- AC03-04: Tenant access is server-authorized: unrelated user receives no clinic/staff directory; members lacking staff.read receive 403 with audit.
- AC03-05: Manager cannot grant owner/manager or alter their own role. Owner grant cannot be removed by staff management. High-risk changes require enrolled authenticator.
- AC03-06: Suspended/revoked membership denied on every scoped API request; sessions for target account revoked immediately.
- AC03-07: Changing role invalidates sessions and preserves append-only audit. Other clinic grants remain unchanged on user.
- AC03-08: Dentist identity always unverified/draft; clinician can edit own draft; stale draft version rejected; no public verified badge.
- AC03-09: Role-specific tabs and tenant switch respect correct routes, no unavailable appointments or clinical charts.
- AC03-10: Responsive phone menu, RTL and LTR strings, forms, loading/empty/error/success/recovery flows.

CI executes pnpm test, typecheck, production builds, PostgreSQL 0001–0003 migrations, PH01 auth integration, PH02 review/billing integration and PH03 staff HTTP integration.

## Human/operational verification still required
Manual web browser navigation at desktop/mobile widths, screen reader, Dari/Pashto translations, SMTP invitations with a real mail provider, clinician verification policy and permission penetration testing.
No patient medical data or verified marketplace listing is released in PH03; production legal/security gate is PH19.
