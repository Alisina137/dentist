# DandanLink — Clinic Mobile Improvement Phase 24
## Premium Native Doctors, Staff, Invitations and Provider Schedules

This phase extends the authenticated **Clinic / Doctor → Team** workspace. The release is still a **technical preview with synthetic records**. PH19 real-patient production remains NO-GO until independent clinical, privacy/legal, security, backups, accessibility and operations signoffs; implementing mobile management does not override that gate.

### Delivered

**Native premium team workspace**
- Dark navy and disciplined white-card design, readable staff avatars, role/status badges, real active-staff, clinician, invite and independently verified-dentist counts, tap-safe actions and visible error/loading/success states.
- Owner and manager: complete clinic-owned staff roster via `GET /v1/team/clinics/:id/team` with name/email/role/status and filters. Staff details loaded individually from the server and checked against the current clinic membership.
- Dentist, receptionist, assistant, cashier: own clinic membership view only, no access to full directory. Existing individual dentist profile + credentials flow (Phase 20) remains available for permitted clinicians. Invite acceptance is still available to signed-in invited users.
- Server-reported independent dentist verification via `GET /v1/listings/clinics/:id/dentists`: current verification is **not** inferred from a clinic manager's clinician toggle, typed professional license, or draft document status. Security/credential review continues under the existing independent reviewer workflow; the native screen offers a secure clinic web handoff.

**Invitations**
- Owner/manager can prepare role-scoped email invitations for manager (owner only), dentist, receptionist, assistant and cashier. The server enforces email targeting, staff seat limits, duplicate invitations, the manager assignment ceiling, authentication and **verified MFA**.
- Native invitation history, actual send status, expiry, resend (including expired invitations), revoke with administrative reason. Resend cooldown/replay protection are enforced on the API. A pending invitation never creates a member or grants clinical access until the targeted email account accepts.
- Failure/uncertain-write outcomes are held for explicit Refresh; no background retries, repeated invites, or fake delivery confirmation.

**Staff actions**
- Protected staff detail and role-aware actions: change role, suspend, reactivate, revoke membership, force logout, owner-only clinician affiliation. All security-sensitive actions require a 5–300-character reason, explicit confirmation, verified MFA, and the existing server authorization/audit/session revocation.
- The client hides self-demotion, owner changes and manager-to-manager promotions; the API independently protects those cases, including stale-state conflicts. A clinician toggle **does not verify** a dental professional's license.
- Manager/owner with MFA can edit a dentist's credential **draft** (name, specialty, qualifications, license, experience, biography), versioned against the current draft. Editing revokes current draft's professional verification on the server. Independent credential evidence upload and reviewer approval remain in the existing Phase 20/web workspaces.

**Provider weekly schedules**
- Real 7-day clinician weekly hours from `GET /v1/operations/clinics/:id/hours`, shown in **Asia/Kabul** time. Saturday is day index 0, matching the established backend week convention.
- Owners/managers can select an eligible active clinician, toggle each weekday, adjust start/end times, and save all seven days using `PUT /v1/operations/clinics/:id/hours/providers/:membershipId`.
- Every stored shift's **revision** is preserved, and missing days are sent with revision 0. The existing API rejects stale revisions, conflicting future appointments, ineligible staff, and subscription or clinic restrictions.
- Changing a day's start/end clears that day's previous break intervals; the form explicitly warns before confirmation. Unchanged day breaks are preserved. No guessed hours or silent schedule overwrite; read-only staff cannot edit.

**Technical/security controls**
- No data stored in AsyncStorage or SecureStore; only the already-existing clinic bearer is kept separately by the native app. Staff UI allowlists selected response fields and discards raw user IDs, unneeded audit notes, invite token hashes and credential evidence.
- App foreground/background lifecycle clears private staff, invitations and schedule state. GET requests use AbortController plus generation checks on clinic changes. UI remounts when clinic/membership changes, and all writes use current bearer and no automatic retry.
- English, Dari and Pashto navigation/labels and RTL-friendly semantic elements. Real-device keyboard navigation, 320/360/414-width, screen-reader and network test results are **not** implied by CI.
- No migrations or additional packages for Phase 24. The native API transport gained `PUT` support exclusively for guarded provider hours.

### Local PowerShell

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

New terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Open using **Expo Go SDK 57** → Clinic / Doctor → Sign in → Team. If previous Phase 20 migrations and dependencies were applied, no new `pnpm install` or `pnpm db:migrate` is required.

For protected team invitations, staff mutations and nonself doctor draft edits, use a **verified MFA owner/manager session**. API-derived `context.mfaEnabled` is checked but never used as a substitute for the server. If you have not enabled MFA yet, the mobile interface remains read-only and points to the clinic website; setting the `EXPO_PUBLIC_CLINIC_WEB_URL` to a trusted, reachable HTTPS clinic origin enables this external handoff.

### Acceptance matrix — synthetic data only

| ID | Scenario | State |
| --- | --- | --- |
| C24-01 | Premium roster, active/suspended/revoked counts, filters, exact clinic staff | Contract tests; Android staging pending |
| C24-02 | Manager cannot grant manager/owner; owner/self protected; all critical operations enforce MFA | Source and API tests; role UAT pending |
| C24-03 | Invite role/email/seat limits, pending, duplicate, resend cooldown, revoke with reason | Existing API and source tests; actual SMTP/device pending |
| C24-04 | Admin staff suspension/reinstatement and session revocation shown only after server success | Existing API and tests; multi-account staging pending |
| C24-05 | Dentist profile edits preserve biography, require version and reset verification | Source/contract tests; credential reviewer staging pending |
| C24-06 | Verification badge comes only from independent current server verdict | Contract tests; reviewer evidence pending |
| C24-07 | Seven-day provider schedule, Saturday index, untouched breaks preserved, revisions enforced | Contract and PostgreSQL checks; device staging pending |
| C24-08 | Conflict with actual future appointments fails safely; no automatic resubmit | Backend guard and source tests; staging pending |
| C24-09 | Background clears staff private details, roles, invite email; switching clinic aborts stale GETs | Source tests; Android lifecycle pending |
| C24-10 | EN/Dari/Pashto RTL 320–414 pt, keyboard, screen reader, proper touch targets | Manual device QA pending |
| C24-11 | Production patient/clinical release independent PH19 signoffs | **NO-GO — human verification required** |

### Phase 25 next
Clinic operations: services and fees, chairs/rooms, clinic open hours, exception calendar, availability and stronger mobile scheduling operations. Continue using existing protected APIs and production gate.
