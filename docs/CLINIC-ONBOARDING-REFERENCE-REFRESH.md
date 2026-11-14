# Clinic and dentist onboarding refresh — 9 mobile screenshots

**Reference:** The nine supplied mobile screenshots of a separate dental app's clinician registration, professional profile, facility selection, under-review status, and support conversation. They are UX references only; names, phone numbers, Pakistani PMDC registration standards, ratings and claims are not DandanLink facts.

## What was applied

- **Clinic signup (existing Better Auth):** Simple clinic-owner versus invited-dentist role guidance; full name/email/password with confirmation and mismatch prevention; links to existing terms/privacy; email verification. Selecting Dentist does *not* grant access to medical records or clinician privileges. Invitation acceptance remains independently authorized in `/clinic/invite`.
- **Clinic setup (existing PH02):** Four understandable stages — Organization, Published Plan, Review & Verification Evidence, and Real Operational Readiness. Clinic legal identity is separated visually from public name and contact information. The previously existing fields and API contracts remain intact.
- **Professional confidentiality:** Private clinic registration evidence is visually separated and can be uploaded only after an actual saved clinic exists. Existing audited clinic-license upload enforces file type/size; no extra government ID collection is invented. Dentist evidence/registration is an independent PH12 verification process under `/clinic/credentials` for authorized clinician accounts.
- **Actual review status:** Pending/approved/request-information/rejected state is derived from the genuine clinic record; approvals and reasons remain decided only by authorized platform administrators. Pending status has a meaningful, non-deceptive message, not a promised SLA. Read-only submitted clinic details prevent inadvertent edits during review.
- **Operational setup:** Actual PH04 checklist for service catalog, treatment chairs, clinic working hours and dentist shifts. It uses real server results and direct links to the functioning settings pages; no fake point-based `Elite/Modern/Standard` facility scores or unsupported badges.
- **UI:** Consistent DandanLink blue/navy panels, clear section hierarchy, compact mobile-aware steps and upload zones, privacy badges, responsive forms and plan cards, keyboard focus, and Dari/Pashto/English text. Clinic-only stylesheet, leaving the patient and admin sites unchanged.

## Reference features intentionally not copied

- **PMDC:** Pakistan-specific licensing organization, not appropriate to clinics and practitioners serving Afghanistan. A professional license is entered and reviewed under DandanLink's existing dentist credential flow; no implied verification from a typed number.
- **Government ID front/back:** Sensitive identity data must not be collected as an invented extra clinic-registration upload. Existing clinician credential review is privately scoped; further requirements need legal, retention and access policies.
- **Auto facility rankings and 40-point grades:** Cannot label a clinic elite or safe based solely on self-reported checkboxes. Later verified facility assessments can be implemented only with formal published criteria and moderated evidence.
- **WhatsApp support link:** No hardcoded external number or copied support chat history. Support access must be configured with DandanLink's own real contact endpoint.
- **Instant approval:** Clinic verification remains manual with audit events; account signup does not make clinic searchable or permit medical access.

## Integration and deployment

- Clinic signup `/clinic/signup`
- Clinic creation/verification `/clinic/onboarding`
- Dentist invitation `/clinic/invite`, staff invitation management `/clinic/staff`
- Clinician professional documentation `/clinic/credentials`
- Services/chairs/hours readiness: `/clinic/services`, `/clinic/resources`, `/clinic/settings/hours`
- Existing endpoints `/v1/clinics`, `/v1/clinics/:id/evidence`, `/v1/clinics/:id/submit`, `/v1/operations/clinics/:id/summary` are reused without schema changes.

Run `pnpm test`, `pnpm typecheck`, and `pnpm build`. CI includes `tests/clinic-onboarding-refresh.test.mjs` with PH01–PH14 regressions and Expo Android export.

Pull after merge: `git -C C:\projects\dentist pull --ff-only origin main`. No `pnpm db:migrate` required.
