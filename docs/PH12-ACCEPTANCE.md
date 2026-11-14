# PH12 — Verified clinic listings, dentist credentials and publication moderation

**Trace:** Product spec F12, C28, A04, A05, A08, AC12. Workflow V5. 
**User flows:** Clinic owner/manager creates actual patient-facing listing content; clinician submits credential evidence; platform MFA-admin independently reviews documents, affiliation, and listing revisions before any public visibility.

## Clinic experience (C28)

At **Clinic > Clinic Listing**, owners and managers see a five-tab workspace. The sidebar entry appears only to clinic owners and managers, never to cashier, receptionist or clinician by default.

- **Overview:** clinic identity and approved contact/address from real PH02 tenancy, description, specialty tags, paired latitude/longitude, contact note. Critical verified clinic identity is not owner-self-published without PH02 approval.
- **Dentists:** actual clinic-affiliated professional drafts, current verification badge (requires approved document, unchanged draft version, active membership, unexpired credential), staff draft edit link, secure PDF/PNG/JPEG evidence submission with explicit attestation. Clinic owner cannot approve credentials. Admin can request changes/reject, with reason visible.
- **Photos:** rights-attested original image uploads, up to eight selected photos, captions, reorder, remove from listing without deleting immutable underlying image, primary image. Only approved-revision photos are publicly retrievable; draft/unselected media remain private. Upload server limit 1 MiB per PNG/JPEG; magic signature, filename protection and digest verified.
- **Booking Rules:** actual publicly enabled PH04 service selections, manual/auto approval policy for future PH15, notice/horizon/cancellation/buffer with numeric limits. An 'auto' policy is only configuration, not a live booking gateway.
- **Preview:** actual owner-private patient-facing draft/pending/approved render with status, doctors and services; full completeness checklist. No invented testimonials, rating, appointment slots, medical conditions or booking CTA.
- **Save Draft** stores a new immutable version with clinic revision precondition. When submitted, it is locked for independent moderation. A previously approved revision stays public while the new revision is pending or rejected. The owner sees the reviewer reason and can resubmit a fresh version.
- **Submission gate:** clinic must be PH02-approved, have active correctly associated verified dentist(s), active publicly enabled service(s), primary photo with rights, description and specialties, map coordinates and contact, configured clinic/provider hours and active chair when required, and at least one **real eligible upcoming slot** from existing PH04/06 availability data. No fabricated availability.

## Administration (A04/A05/A08)

Existing MFA-gated platform admin shell now includes **Dentist Verification** and **Marketplace Listings** in sidebar. Admin-only routes:
- `/admin/dentists` Pending / Verified / Rejected / Needs changes / Revoked, query by name/clinic/city.
- `/admin/dentists/:membershipId` clinic affiliation, profile version, license metadata and expiration, private document download, documented review basis, verified/reject/request changes/revoke form, permanent decision history. Approve requires reviewing evidence **and** explicit `VERIFY` confirmation. System does not invent external registry matches; real verification work remains the human reviewer's responsibility.
- `/admin/listings` Pending revisions / Published / Reported & Hidden with city, changed fields, review state.
- `/admin/listings/:clinicId` side-by-side approved and pending public text/photos, checklist, factual reasons, approval (explicit `PUBLISH`), rejection, emergency hide, restore (revalidates eligibility) and audit timeline.
- Approved versions copy current verified professional identity and service price/version snapshots into their reviewed version. Client edits can never change approved snapshots; pricing/credentials in public profiles require same current verified versions or the profile is unavailable.
- Platform admin cannot access clinic patient/clinical details. Credential evidence exists only on guarded, audited admin download routes. Auth includes Better Auth session, verified email where required, platform-admin grant, and verified MFA.

## Public direct-link, NOT public search

`/clinics/:clinicId` on patient web is a direct-link preview of an **approved-only, nonhidden** snapshot. Backing `GET /v1/listings/public/clinics/:clinicId` has a strict publication gate: clinic currently approved, valid clinic subscription, currently verified dentists with unexpired credentials/active affiliations and matching approved draft versions, live active selected services matching reviewed price/version snapshots. It contains public-only text, real service fee labels, verified professional qualifications and approved gallery, but no credential number/document, private clinic information or clinical patient records.

Public image routes require the same published version and valid current listing gate. Changing approved professional credentials without rereview, revoking a license, clinic suspension or emergency hiding immediately revokes public profile visibility, including photos. No search index, patient account booking, review/rating system or appointment booking exists until PH13–PH15. The API explicitly returns `publicBookingsEnabled:false`, `searchable:false`.

## Data and audit

`packages/db/migrations/0012_public_listings_credentials.sql` creates:
- `clinic_dentist_credential_cases`, `clinic_dentist_credential_submissions` (private binary), append-only `clinic_dentist_credential_decisions`.
- `clinic_listing_heads`, immutable versioned `clinic_listing_versions` (approved professional/service snapshots), private media in `clinic_listing_photos`, append-only `clinic_listing_events`.
- PostgreSQL constraints and triggers to prevent tampering with credential submissions, photo evidence, reviewed listing profile snapshots and moderation logs. Tenant-scoped FK and authenticated scope checks.
- API `/v1/listings/clinics/:clinicId/*` (clinic owner/manager and credential submission by own clinician), `/v1/listings/admin/*` (MFA-admin), and `/v1/listings/public/clinics/:clinicId` (only eligible approved).
- Language support English, Dari and Pashto; responsive forms, table navigation, gallery, comparators and loading/empty/error modes.

## Acceptance AC12 — end-to-end

1. Unapproved clinic and unverified dentist cannot publish or display a verified badge. Owner uploads a real clinic license in PH02; platform independently approves clinic.
2. Dentist updates own professional draft, uploads attested private credential; admin sees evidence metadata, downloads the original, records review method/reason, approves with explicit confirmation. Unauthorized users cannot fetch documents.
3. Owner creates publicly selectable clinic service, rights-attested photo, complete location and listing, selects verified dentist. Submission checks **real available provider slots**, not invented time.
4. Admin sees pending revision and approved-vs-proposed differences. Admin publishing creates the reviewed immutable version; only approved public profile and its selected image become retrievable via a direct link. No credential number or clinical patient records in public response.
5. Material draft change after publication does not modify public view until independently approved; rejection preserves old approved version with reason. Subsequent approved version replaces it.
6. Emergency admin hide instantly hides approved profile *and image*; independent restore rechecks eligibility. Revoking dentist credential or suspending clinic disables public visibility; a revoked dentist cannot bypass review with a new listing.
7. Database test rejects raw UPDATE/DELETE of document, photo, decision and reviewed listing evidence.
8. CI runs static tests, TypeScript, web builds, Expo Android bundle, migration, PH01–PH12 full PostgreSQL/HTTP integration.

## Production release conditions

Human credential policy, license-checking procedure, evidence storage encryption/retention, admin MFA and access review, photo rights and biometric privacy, publication moderation/copyright rules, security testing and accessibility/RTL manual QA remain external approval gates. **Code does not certify medical licensure or guarantee real slots without independent data validation**. Existing real clinic and booking schedule remain the source of truth. Next phase **PH13** implements public search/browse.
