# DandanLink — project state

Product specification: DandanLink v1.0 (13 November 2026).
Engineering process: Software Development Workflow V5.
Repository: Alisina137/dentist. Local IDE folder: dentist (usually C:\projects\dentist).

## Current phase: PH14 verified patient identity, profile, consent and family authorization

Status: **PH01–PH13 implemented and tested. PH14 verified patient login, explicit onboarding, private profiles, preferences, minor guardian consent and independent adult authorization implemented on a feature branch; CI validation and acceptance required before merge. Human clinical consent/guardian law, credential policy, accessibility, localization and privacy sign-offs remain production gates**.
This is a foundational development release, not a medical records or production healthcare system.

### PH03 installed features
- Clinic-specific immutable owner membership created at clinic creation, with backfill for existing PH02 clinics.
- Invited members can hold one scoped role per clinic: owner (protected), manager, dentist, receptionist, assistant, cashier.
- Owner and manager invitation flows use verified-email invitations, 7-day token expiry, hashed tokens, resend and revoke.
- Managers cannot invite or grant manager/owner role, edit their own privilege, or manage owners.
- High-risk staff/role changes require verified 2FA; role change/suspension/revocation destroys account sessions to enforce immediate revocation.
- Multi-clinic role selection; each request verifies tenant membership server-side. A tenant switch forces a full page reload and private fetches use no-store.
- Team, Dentists, Invitations tabs; role-scoped staff detail; security/access audit and self session list.
- Dentist professional identity drafts with version checks and explicit unverified status. No public verified profiles.
- Plan's staff capacity is enforced on invitations. Owner and pending valid invites count against limit. Subscription expiry blocks new invitations.
- CI test suite covers mail verification/acceptance, role ceilings, dentist drafts, plan scope, audit and session revocation.

### Routes
Clinic UI: /clinic, /clinic/staff?tab=team|dentists|invitations, /clinic/staff/:membershipId,
 /clinic/settings/security, /clinic/invite?token=..., /clinic/2fa.
API: /v1/team/context, /v1/team/sessions, /v1/team/invitations/{preview,accept},
 /v1/team/clinics/:clinicId/{team,dentists,invitations,security,staff/:membershipId}.
PH02 clinic owner onboarding, subscription settings and platform verification remain operational.

### Not included yet
Recorded appointments/queue, clinical encounters, dental charting,
financial ledgers, dentist credential verification or public booking. Future planned navigation is hidden until implemented.

### Verification limits and follow-up
GitHub Actions is configured to run PH01–PH03 integration against a real temporary PostgreSQL server, plus TypeScript and production web builds. Actual local browser/device review, SMTP delivery, human translation review, credential validation, retention, backup restore and healthcare security/legal acceptance remain outstanding.

See docs/PH03-ACCEPTANCE.md for the full acceptance matrix and manual checks.
Next phase after PH06: **PH07 — Clinician worklist, encounters and private files**.

## Platform/dev-command adjustment — 13 November 2026

This is a development-platform adjustment, **not PH04**. All PH01–PH03 features remain in scope.

**Patient UI**: new native `apps/mobile` application (Expo SDK 57 / React Native) for
Android Expo Go. The default patient navigation is Home, Appointments, Saved and Account,
with Dari/Pashto RTL and English LTR, stored non-sensitive local preferences,
honest empty/unreleased states, and optional API connectivity check.
Patient registration, published dentist listings, actual availability and booking
will be delivered during their respective planned patient phases.

**Web UI**: `pnpm dev:admin` serves the platform admin dashboard at
`http://localhost:3000`, and `pnpm dev:clinic` serves the clinic management
dashboard at `http://localhost:3001`. `pnpm dev:mobile` starts Expo Go with
`--tunnel --clear --go`. `pnpm dev` runs the API and both web panels.
`pnpm dev:patient:web` remains an optional informational/SEO page on port 3002;
it is not part of the default `pnpm dev`.

**Authentication origins**: the root `.env.example` and CI defaults reflect
the swapped web ports. Existing local `.env` files need
`pnpm dev:ports:sync`, which preserves DB/auth credentials and updates only
admin/clinic origin values. Physical phone network traffic needs a reachable
`EXPO_PUBLIC_API_URL` in `apps/mobile/.env` for backend features; an Expo
Metro tunnel does not tunnel Express port 4000.

**Validation**: Node platform command tests, pnpm typecheck, web production
builds and Expo Android bundling are CI gates. Manual Expo Go device testing,
app store SDK compatibility, mobile connectivity, and visual RTL QA remain
external verification steps. No real clinical data or booked appointments yet.

## Development-only email policy

- To simplify local testing, `.env` may opt into `DEV_SKIP_EMAIL_VERIFICATION=true` when `NODE_ENV=development`.
- Signup sends no verification mail in that mode, and login/clinic/team/admin APIs allow an unverified email **only locally with the explicit flag**.
- Database emailVerified stays false until verified; production and CI test contexts still require verification.
- `pnpm dev:auth:no-email` adjusts only the flag in an existing development `.env` file.
- Platform admin still requires an existing account, an explicit owner-specified admin bootstrap and TOTP MFA before entering protected admin routes.
- No real patient data or public production launch is authorized while development email verification is disabled.

## PH05 — Patient registry delivered independently of PH04
Status: PH05 merged to main (538e06c); web browser and production privacy checks remain separately required.
Product specification explicitly permits PH05 after PH03 in parallel with PH04.
Clinic UI: /clinic/patients (search/status/sort/10-or-20 pagination),
/clinic/patients/new, /clinic/patients/import, /clinic/patients/:patientId
and /clinic/patients/:patientId/edit.
Backend: clinic-local patient numbers, authenticated role-scoped demographic registry,
medical intake stored separately and readable only by qualified clinician roles,
duplicate candidate confirmation, and resumable idempotent CSV import.
Imported records are never falsely marked as having individually accepted
the privacy notice. Import does not include histories, X-rays, visits or billing.
PH04 now implements services/chairs/hours as a separate additive phase; PH06 scheduling is not yet live. Production handling of real clinical information requires PH19 approval.
See docs/PH05-ACCEPTANCE.md for detailed role matrix and remaining verification.

## PH04 — Real clinic operations and availability previews

- Clinic web modules: `/clinic/services`, `/clinic/resources`, `/clinic/settings/hours`.
- Service catalog: durations, buffer, AFN estimate, chair requirement,
  active/inactive state and immutable version/price history.
- Clinic resources: chairs/rooms, unique internal code, equipment, status;
  cannot deactivate a resource still assigned an active chair schedule.
- Hours & Holidays five live tabs: clinic weekly schedule, dentist shifts,
  chair-specific hours, exceptional closures, and safe candidate preview.
- Saturday-first Afghanistan schedule, validated nonoverlapping breaks,
  version-checking for concurrent updates, explicit clinic closures.
- Candidate availability is clinic-hours ∩ dentist shift ∩ optional chair
  shift minus breaks/closures, with duration+preparation buffer. UTC
  timestamps use the Asia/Kabul IANA timezone. No bookings/holds yet.
- Owner PH02 onboarding and dashboard now link to an actual operations
  checklist; staff workspace navigation has grouped icon+label links.
- No public listings, verified professionals or public patient booking have been
  published. No fake appointments or default stored availability.
- New migration `0004_services_resources_hours.sql` is additive even
  when PH05 migration `0005_patient_registry.sql` was applied first.
- Automated AC04 tests cover clinician permissions, resource conflicts,
  versions, staff plan limits, Saturday candidate windows, holiday overrides,
  Kabul time conversion and correct inactive/empty states.
- Pending manual: real browser UX and focus QA, RTL native language review,
  privacy/security/retention/backup approval before real medical data.
- Next planned phase is PH06 appointments and queue.

See docs/PH04-ACCEPTANCE.md and docs/PH05-ACCEPTANCE.md.

## PH06 — Clinic appointments, safe bookings and arrival queue

- Clinic calendar `/clinic/appointments` has synchronized Day/Week/Month, Saturday-first.
- New wizard `/clinic/appointments/new` selects active patient, service, dentist, chair, source and time.
- Details `/clinic/appointments/:id` shows original estimate snapshot, true status and audit timeline,
  with atomic rescheduling and role-gated check-in, cancellation and no-show.
- Queue `/clinic/appointments/queue` has real Expected/Arrived/In Treatment/Complete states.
- Patient records link to real appointment history; owner's dashboard has live activity cards.
- Migration `0006_appointments_queue.sql` adds PostgreSQL GiST exclusion for overlapping clinician
  and chair times, idempotent actions and immutable events. Status actions are audited.
- PH04 schedule, holiday, service, chair changes and PH05 patient archival block invalidating
  future confirmed visits; no silent deletion or retroactive repricing.
- Clinic data never appears in public patient/Expo interface; assistants see redacted calendars,
  dentists see own cases. Public booking, clinical encounter/chart, invoices remain future phases.
- Full responsive Dari/Pashto/English localized navigation, real calendar/queue tabs, touch mobile
  agenda, empty/loading/error controls. Browser UX/keyboard/a11y and legal review remain pending.
- CI tests: `tests/phase06-validation.test.mjs`, `tests/phase06-integration.mjs`.
- Next: PH07 clinical worklist and private encounters. See docs/PH06-ACCEPTANCE.md.


## PH07 — Clinical worklist, notes and private files

- Clinic clinical sidebar entry appears for dentist, assistant, and clinician-enabled owner/manager roles.
- Clinicians get Today / Pending Notes / My Cases; assigned encounters link to Visits and private Files.
- Visits can originate from checked-in appointments or clinician-authorized unscheduled care; assistants only open appointment-associated drafts.
- Structured complaint, findings, assessment, history provenance, performed procedures and follow-up are versioned.
- Signed baseline is immutable at PostgreSQL trigger layer; reasoned clinician amendments append rather than replace signed content; stale revisions rejected.
- Tenant-scoped JPG/PNG/PDF bytes are stored in a guarded DB table, not in public storage; clinical-only upload/download with MIME/magic and size guards.
- Tablet/phone responsive UI, keyboard focus, role-specific navigation, Dari/Pashto/English localization, retry messaging and in-memory form preservation.
- Integration/quality evidence in `tests/phase07-validation.test.mjs` and `tests/phase07-integration.mjs` plus GitHub Actions.
- **Not production approved:** no malware scanner, no verified at-rest encryption/retention signoff, no real patient-data go-live until medical/legal/security review and PH19 gates. See `docs/PH07-ACCEPTANCE.md`.
- Next planned phase: PH08 permanent/primary FDI odontogram. 


## PH08 — Interactive FDI dental chart (C12 / AC08)

- Route `/clinic/patients/:patientId/chart` is now a patient-contextual screen linked from Overview and Visits, with authorized clinician/assistant role safeguards.
- Complete permanent FDI map (11–48) and primary map (51–85), anatomically oriented independent of RTL, SVG illustrations, selectable teeth and keyboard arrow control. Mobile horizontal scroll/zoom and numbered selector.
- Distinct Current / Selected Visit / Historical chart modes. Current/latest and as-of date use latest **validated** dated finding per tooth; earlier findings remain in patient history.
- Tooth inspector shows condition, optional surfaces/notes and authoritative date/clinician/encounter provenance. All records append-only; correction is a new dated observation rather than mutating old evidence.
- Authorized clinician writes validated findings linked to their encounter; an assistant may submit only an authorized own encounter's draft, which must be validated by assigned clinician before current-status release.
- Tenant/case scoping enforced server-side. Receptionist/cashier/platform admin and cross-tenant access denied. Signed chart content never appears on public or patient API.
- New migration `0008_fdi_dental_chart.sql` with FDI/condition/dentition constraints, scoped encounter FK, idempotent write keys, immutable history trigger and indexed validated projection.
- Tests: `tests/phase08-validation.test.mjs`, `tests/phase08-integration.mjs`, `tests/phase08-immutability.ts`; CI includes HTTP/PostgreSQL and prior phase regressions.
- **Not production ready:** clinically reviewed anatomy, accessibility/RTL inspection, legal/medical retention, security/data backup checks still required; chart shapes are schematic, no diagnosis/billing.
- Next phase: PH09 treatment plans and consent. See `docs/PH08-ACCEPTANCE.md`.


## PH09 — Treatment plans, consent, progress and estimates (C13/C14 / AC09)

- Plan status groups Draft / Proposed / Accepted-In Progress / Completed / Discontinued, searchable list and create action at `/clinic/patients/:patientId/treatments`.
- Dedicated plan detail with Summary, Stages, Estimate, Consent and Timeline tabs. Patient Overview, Visits and Dental Chart include Treatments navigation.
- Authorized clinician creates/revises multi-stage care proposals, with service catalog price/version snapshots and 100% clinic/private patient scope. Estimated AFN amounts are not invoices, charges or paid revenue.
- Stages require explicit start; completion requires signed PH07 encounter with matched performed procedure and tooth references. No inferred treatment from appointment or service booking.
- Explicit recorded in-person patient/guardian attestation with named witness, scope and time. Changing an accepted proposal creates a new version requiring new consent; withdrawal suspends stage work; reasons are required for discontinuations and skipped stages.
- New migration `0009_treatment_plans.sql` and PostgreSQL constraints preserve immutable proposal versions, consent history, events, and completed-stage evidence.
- Clinician-private detail endpoints, low-privilege status-only summary and finance projection, optimistic update revisions, actor audit, and subscription gates.
- Tests: `tests/phase09-validation.test.mjs`, `tests/phase09-integration.mjs`, `tests/phase09-immutability.ts`.
- Medical, legal consent, device accessibility, backup/retention and privacy sign-off remain required before real patient data; PH10 handles invoices and payment ledgers.
- Next phase: PH10 patient billing and receipt ledger. See `docs/PH09-ACCEPTANCE.md`.


## PH10 — Clinic patient invoices, ledger and finance screens (C16, C18–C22, AC10)

- The clinic sidebar has a real **Finance** workspace for owner/manager/cashier/receptionist. Receptionist gets invoice handling but not clinic-wide overview/payments/balances. Dentists/assistants/platform admin have no clinical finance access.
- Finance Overview shows true receipt and receivables KPIs; Invoices provides Draft/Issued/Partially Paid/Paid/Overdue/Void and full create/edit/issue/void flow; Payments offers an auditable ledger and CSV; Balances supports current/1–30/31–60/61+ aging.
- Patient records get Billing with Invoices/Payments/Statement, true 3-way totals, invoice receipt print; cashier has no chart/clinical details link.
- Billing requires a completed appointment, signed performed procedure, or completed treatment stage. Drafts snapshot the clinic service price or accepted treatment proposal price. Invoice source cannot be double-charged while nonvoid; issue never marks paid.
- Cash/manual transfers allow idempotent partial payments with locked invoice totals. Owner can make reasoned compensating reversals and noncash credits; original ledger records remain immutable. AFN integers only; no online gateway or automatic refund.
- Private print-friendly receipts, guarded API, correct clinic scope and low-privilege role restrictions, English/Dari/Pashto localization and responsive layout.
- Migration: `0010_patient_billing_ledger.sql`. Tests: `tests/phase10-validation.test.mjs`, `tests/phase10-integration.mjs`, `tests/phase10-immutability.ts`.
- Production gates: cashier and owner approval of finance reconciliation, bank transfer verification, tax requirements, legal invoices, external refund policy, privacy and accessibility sign-off.
- Next PH11: expenses, unrelated to patient invoice balance. See `docs/PH10-ACCEPTANCE.md`.


## PH11 — Operational expenses with auditable correction history (C18/C23, AC11)

- Finance navigation now includes **Expenses** for owner, manager, cashier, integrated into the same responsive and localized workspace. Reception/clinical roles cannot see expense data.
- Create an operational expense with required date, category, description, positive AFN amount, payment method and optional reference, attribution, verified private PDF/PNG/JPEG receipt.
- Filter/search/paginate expenses and open detailed history. Correct with reason and immutable version snapshot; owner/manager can terminally void with reason; posted expense and receipt evidence cannot be deleted or silently overwritten.
- Finance Overview compares real manual net PH10 cash collections with posted PH11 expenses by Kabul-local date range; category totals for owner/manager. This is a **cash-flow comparison, not certified accounting profit or tax revenue**. Noncash credits are excluded from cash collections; invoices remain entirely unchanged.
- Tenant- and role-scoped API, unique action idempotency, transaction locks, auditable actor/timestamps, no patient-linked expense data; private no-store receipt download with MIME/header and digest verification.
- Migration: `0011_clinic_expenses.sql`. CI integration: `tests/phase11-integration.mjs`; static: `tests/phase11-validation.test.mjs`; PostgreSQL immutable evidence: `tests/phase11-immutability.ts`.
- Requires human owner/accountant approval, bank verification policy, legal receipt/retention handling, security and RTL/accessibility acceptance before using real data.
- Next phase: PH12 moderated public clinic listings and professional verification. See `docs/PH11-ACCEPTANCE.md`.


## PH12 — Clinic listing, verified dentists and public-approved-only profiles (C28, A04–A05, A08)

- Owner/manager **Clinic Listing** workspace includes Overview, Dentists, Photos, Booking Rules and patient-facing Preview; explicit readiness checklist validates verified affiliation, public services, media rights, location, real clinic/provider schedule and available slot; drafts are versioned and pending revisions locked for independent review.
- Dentist credential submission accepts attested private PDF/PNG/JPEG evidence; MFA-gated platform admin verifies real clinic membership and unchanged dentist profile version, records manual review basis and permanent reason. No invented external registry verification.
- Admin sidebar has Dentists (Pending/Verified/Rejected/Needs changes/Revoked with evidence review) and Marketplace Listings (Pending/Published/Hidden, side-by-side versions, approve/reject, emergency hide/reinstate and audit).
- Approved clinic direct-link patient preview is public only after independent moderation. Public service price/version and dentist credential snapshot are approved/pinned; later loss of verification or clinic suspension removes public eligibility. No search until PH13 and no patient booking CTA until PH15.
- PostgreSQL migration `0012_public_listings_credentials.sql`; UI `phase12.tsx`, API `listing-router.ts`, `tests/phase12-validation.test.mjs`, `tests/phase12-integration.mjs` and `tests/phase12-immutability.ts`.
- Owner clinic approval, credential license checks, privacy/photo rights, safety, manual accessibility and media retention controls remain go-live gates.
- See `docs/PH12-ACCEPTANCE.md`. Next PH13: fast patient public discovery and verified clinic search.

## PH13 — Fast patient public discovery and honest clinic/dentist profiles

- A real **patient Home** at `/` replaces the no-listings placeholder. Public **Find Care** `/search` and **About** `/about` are linked from the site header. Clinic profiles `/clinics/:clinicId` and dentist profiles `/clinics/:clinicId/dentists/:dentistId` are fully functional; all with English/Dari/Pashto translations, RTL/LTR and local calendar display.
- The search index contains approved/public clinic, dentist and real service text *only*. `0013_public_discovery_index.sql` adds trigram and city/fee/specialty/service indexes, refresh triggers on approved public revisions and clinic name/city, and a live verification/suspension/active-service/valid-subscription security gate. Clinic credential revocation immediately removes search visibility; no patient records indexed.
- `GET /v1/discovery/{facets,search,clinics/:id,clinics/:id/availability,clinics/:id/dentists/:dentistId}` supports true city/name/service/specialty/fee/date filters, URL-persisted pagination, verified-only dentist cards, opt-in geolocation distance sort, real opening hours and live unbookable appointment candidates. Real slots come from existing PH04/06 schedule and bookings, never seeded or guessed.
- User-facing CTAs lead to legitimate public clinic profile, contact phone or directions (external map link). No self-service booking until PH15, patient account until PH14, or reviews until PH17.
- Tests: `tests/phase13-validation.test.mjs` and `tests/phase13-integration.mjs`; CI migration, complete prior-phase regressions, strict TypeScript, web builds and Expo Android bundle.
- See `docs/PH13-ACCEPTANCE.md`. Next **PH14**: patient identity, profile preferences, consent and dependent permissions.

## PH14 — Patient identity and consent-based family directory

- Patient site adds complete sign-in, email verification, signup, recovery and optional existing-account MFA challenge; `/account/onboarding` captures verified adult/legal consent, terms and privacy version, name and selected city.
- Protected `/account` dashboard has actual profile, family, notification/calendar/language, privacy (consent ledger, account-only export), and security (session list/revocation, recovery) pages, with localised English/Dari/Pashto and responsive mobile/RTL layout.
- `/v1/patients` is an authenticated, explicit-consent and tenant-independent patient portal. Data migration `0014_patient_identity_family.sql` creates isolated patient portal profiles, default-off notification preferences, guardian-attested child identities under 18, independent adult acceptance invitations, active/revoked family delegates and immutable consent log. Medical/billing records remain clinic private and are never linked by matching names/emails/phone.
- Adult grants only take effect when the verified adult consents through their own account. Invite response avoids email account enumeration and inviter cannot reveal existing email matches. Both guardian and adult may revoke the grant. A minor turning 18 loses effective guardian authority pending independent consent.
- Future patient booking or clinical record access remains PH15; family consent in PH14 does not automatically grant access to PH05/PH07 clinic records. Account data export excludes all clinic PHI.
- CI adds `tests/phase14-validation.test.mjs` and `tests/phase14-integration.mjs`; see `docs/PH14-ACCEPTANCE.md`.

## Patient mobile/web experience refresh (23 reference screenshots, Nov 2026)

- Expo mobile now has genuinely working PH13 public discovery in native UI: approved current clinic cards, treatments, city/specialty/service search and sorting, dentist profiles, published-only gallery, opening hours and PH06 live preview candidate slots. Homepage and result states use real API data rather than fake doctors or static 'coming soon' cards.
- Native bottom navigation has **Home / Explore / Saved / Account**; saved uses non-sensitive public clinic IDs in AsyncStorage with live eligibility rechecks; logged-in PH14 identity/family management opens secured patient website only if configured. Locale/calendar are in Account, not header. Fully localized Dari/Pashto/English, responsive RTL/native safe-area.
- Patient web additionally has mobile bottom navigation to actual Home/Find Care/Family/Account routes, collapsible mobile search filters, gallery of reviewed clinic photos, scrollable 7-day schedule previews, updated blue styling, and confirm password for sign-up.
- Booking, patient appointment history, bills, reviews, ratings, rewards, campaigns, medical record linking, unverified credentials and native password auth **not invented**. See docs/PATIENT-EXPERIENCE-REFRESH.md for per-screen 23-reference mapping and future PH15/16/17 scope.
- No migrations or API behavior change required. Strict mobile/web TypeScript and Android Expo export tested in CI; public PH13 and secure PH14 regression checks retained.


## PH15 — patient web booking and verified record release (14 November 2026)

**Implementation:** Patient website now has an actual five-step booking wizard from
approved dentist/clinic pages, self or authorized family subject, live Afghanistan-time
slots, published fee/notice policy and confirmation receipt. `/appointments` supports
upcoming/past/cancelled lists and private detail, cancellation and rescheduling. Clinic
appointments include dedicated online requests (manual accept/reject; auto confirmation
where configured), served from the existing PH06 exclusion-protected calendar.

PostgreSQL migration `0015_patient_booking_links_notifications.sql` introduces
booking ownership and idempotency, record-link proof workflow with in-person staff
verification, individually permitted signed-care-summary/issued-receipt releases,
and consent-aware booking notification queue. Clinic approved-record release controls,
request queue, notifications delivery state, new patient account navigation, and
localized RTL English/Dari/Pashto components are implemented.

**Privacy/production:** Portal account association and patient supplied number do not
grant old clinic records. Records appear only after explicit clinic match and individual
release; owner can revoke. No native private patient booking/auth until PH16. SMS/push
remain disabled; SMTP is opt-in, generic and durable. Human healthcare/legal review,
testing on physical devices, privacy retention and threat-model gates remain PH19.
See `docs/PH15-ACCEPTANCE.md` and CI checks including PH15 integration.
