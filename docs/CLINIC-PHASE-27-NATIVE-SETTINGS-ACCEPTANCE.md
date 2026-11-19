# DandanLink — Phase 27: Native Account, Notifications and Clinic Settings

## Scope

This phase replaces the **Clinic / Doctor → Account** placeholder with a structured, professional five-section account workspace. Data comes exclusively from the existing authenticated DandanLink APIs. This does **not** create an unreviewed channel to send clinical data, simulate a paid subscription, or bypass healthcare-production approval. Synthetic-data development and independent PH19 release review remain mandatory.

### Functionality

| Section | Who | API endpoints | Controls |
| --- | --- | --- | --- |
| **Account Preferences** | All signed-in clinic members | `GET /v1/me`, `PUT /v1/me/preferences` | Verified account name/email and MFA status, preferred language (English/Dari/Pashto), Gregorian/Solar Hijri calendar. Saved on **server account**, reflected in native display locale only after confirmed response. |
| **Notifications** | Owner / Manager | `GET /v1/booking/clinics/:clinicId/notifications` | Real bounded last-100 delivery status records (pending/processing, sent, failed, skipped). Email/SMS/push gateway configuration visibility, status counts, filters, pagination and manual refresh. No patient identity, recipient addresses, appointment specifics, or clinical content. |
| **Clinic Details** | Owner | `GET/PATCH /v1/clinics/:clinicId` | Registered name, public name, type, province, city, optional district, address, phone, clinic email, license number and planned dentist count. Uses Phase 02 full payload and **optimistic revision** checks. Approved-clinic edits return to independent verification. |
| **Subscription** | Owner | `GET /v1/clinics/:clinicId`, `GET /v1/public/plans`, `POST /v1/clinics/:clinicId/subscription/request` | Actual plan and trial/grace/period dates, active staffing/branch limits, last invoice status and published plan options. Submission of existing payment **evidence reference** creates an awaiting-review invoice, not a charge/automatic approval; duplicate pending invoices are blocked. |
| **Security & Sessions** | All signed-in clinic members | `GET /v1/team/sessions`, `POST /v1/team/sessions/revoke` | List own sessions and device labels, independent MFA status, secure web links for password and authenticator setup, self-service audited all-device session revocation, confirmation and local signout. Owner/manager cannot list other people's sessions through this API. |

### Important boundaries

- The current API exposes **delivery monitoring**, but no clinic-level user-controlled event delivery preferences. Phase 27 therefore does **not** invent notification toggles or silently change email/SMS consent. Clinical appointment updates remain governed by the existing patient consent and queue processor.
- Only the account holder can revoke their own sessions. No direct staff session/token manipulation is added; role-based staff controls remain in Phase 24.
- Organization changes and subscription payment evidence require owner membership, pass through existing API validation and audits, and are confirmed by refreshing from the server. The client does not trust its own role or subscription status as authorization.
- **Every write is confirmed** with an explicit dialog or verified response. On an ambiguous network/server result the form blocks further mutation until explicit refresh; no automated retry of payment requests, clinic revisions or all-device logout.
- An uncertain all-device sign-out may still have revoked other sessions on the server. The phone signs out locally even if the server outcome was unconfirmed; the UI explicitly warns that remote revocation was not verified.
- The Account screen does not persist patient content, booking IDs, notification recipients, private payment evidence, organization credential proofs or session tokens. Session tokens remain in the previously implemented secure native auth layer.
- Backgrounding or switching clinics removes these settings records, draft billing references and typed administrative reasons from in-memory component state.
- The five sections are shown only when the current clinic role has access; owner-only subscription and organization editing are not exposed to managers, doctors, receptionists, assistants or cashiers. Server checks remain authoritative.
- English, Dari and Pashto are implemented. Solar Hijri vs Gregorian is an account preference; appointment dates/time are still interpreted in Asia/Kabul by the server.
- **No new database migration or npm dependency required.** Uses prior Phase 02, 03 and 15 APIs.

### Manual synthetic-data QA matrix

| ID | Test | Automated coverage / device status |
| --- | --- | --- |
| C27-01 | Account verified identity and server preference changes persist on relaunch | Contract and API source; Expo device pending |
| C27-02 | Manager and owner get only clinic notification delivery history, never PHI | Contract/source tests; device pending |
| C27-03 | Owner can edit full clinic registration with revision and human re-review; manager cannot | Contract + Phase02 API guards; device pending |
| C27-04 | Owner sees real plan and invoices; payment references create *awaiting* invoice only | Contract + Phase02 guards; real payment unavailable |
| C27-05 | Duplicate pending invoice, invalid evidence, stale revision fail safely without retry | Contract and existing API tests; staging pending |
| C27-06 | Account can list its own sessions and revoke all; other accounts remain isolated | Contract + Phase03 API guard; physical device pending |
| C27-07 | Network failure / app background / changing clinic wipes private records and drafts | Source test; device pending |
| C27-08 | RTL, large font, scroll, small Android screen and screen reader controls | Human Expo Go QA pending |
| C27-09 | Phase26 TOTP cookie continuity on real Expo Go Android/iOS | Human device QA pending |
| C27-10 | Independent production privacy, security and clinical-pilot approvals | **NO-GO — human signoff outstanding** |

### Run on Windows

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

In a second PowerShell terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

In Expo Go SDK 57 navigate **Clinic / Doctor → Sign In → Account**. Use synthetic clinic accounts and appointment notifications. The **Subscription** section requires an existing clinic subscription to request payment review.

### Next: Phase 28

End-to-end cross-role UX and functional audit across clinic, patient and admin screens, controlled synthetic-data tests, and physical-device acceptance for MFA and native forms. Any remaining production clinical/patient release must be separately approved.
