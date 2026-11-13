# DandanLink — Product Specification v1.0

**Status:** Implementation-planning baseline; product decisions marked **ASSUMPTION** require validation before production rollout.  
**Prepared:** 13 November 2026 · **Initial market:** Afghanistan (Kabul pilot)  
**Product:** DandanLink Clinic (paid responsive web/PWA), DandanLink Patient (free Android/iOS/web), DandanLink Admin (internal web)  
**Purpose:** Product truth for WHAT to build, WHO can use it, WHY it matters, and HOW it must behave. The separate Software Development Workflow governs implementation, Git, migrations, deployment, and execution. **Nothing in this document claims that code has already been built.**

> **Guiding rule:** Each shipped feature must be discoverable, operable end-to-end, usable by the correct roles, visually complete, localized, backed by durable data, and verified against its acceptance tests. No placeholder-only screens, dead tabs, fictional integrations, fabricated reviews, or implied clinical capabilities.

## 1. Executive summary, boundaries, and assumptions

### 1.1 The product in one paragraph

DandanLink is a dental-practice operating system connected to a free patient-discovery and appointment-booking marketplace. Subscribed clinics manage staff, dentists, chairs, services, patients, appointments, clinical encounters, odontograms, treatment plans, consent, invoices, payments, balances, expenses, and reports. Clinics may publish verified profiles and selected live availability. Patients browse public listings, compare relevant service information, manage authorized dependents, book available slots, and see only records explicitly released for patient viewing. A separate administrative portal verifies clinic/dentist credentials, manages plans/subscriptions, moderates public content, and handles support without unrestricted clinical-record access.

### 1.2 Product principles

1. **Useful without marketplace traffic:** A clinic can run its essential practice from day one, including walk-ins and telephone bookings.
2. **One source of scheduling truth:** Staff bookings and patient bookings reserve the same dentist/chair/time resources in the database, never competing calendars.
3. **Clinical privacy by design:** Clinic ownership, authorized user access, patient approval, signed-note amendments, private attachments, and audit logs are server-enforced.
4. **Fast, localized workflows:** Real Dari and Pashto RTL, English LTR, Solar Hijri/Gregorian displays, AFN, Saturday-start week, and slow-connection fallbacks.
5. **No fake completeness:** Every exposed destination, form, filter, status, and action works in the phase that ships it; defer advanced capabilities behind absent—not decorative—UI.
6. **Transparent money:** Separate platform subscriptions from clinic invoices and patient payments; balances derive from posted transactions rather than manually editable totals.
7. **Human-reviewed healthcare functions:** Software supports professional documentation and communication; it does not diagnose or prescribe autonomously.

### 1.3 Scope and release boundaries

| Release | Customer promise | Included | Explicitly not required yet |
|---|---|---|---|
| **MVP / REQUIRED** (PH01–PH18) | A verified clinic can run day-to-day operations, receive bookings, document dentistry, collect and reconcile payments, and operate a public listing; patients can book for themselves/dependents free | Auth, tenant/roles, verified onboarding, plan subscription, appointments/chairs, patient registry, chart, visits, treatments, consent, invoices, payments, expense ledger, public listings, web/mobile discovery/booking, notifications with fallback, accounts/family, receipts, reviews with moderation, core admin/reporting | Insurance claim automation, AI diagnosis, integrated radiography hardware, laboratory tracking, inventory, offline writes, video consultation |
| **NEXT** | Grow larger clinics and improve retention | Multi-branch, advanced finance, waiting-list auto-offers, recall campaigns, inventory, laboratories, advanced periodontal chart, expanded analytics, integrated payments where validated | AI treatment decisions |
| **FUTURE** | Interoperability and broader markets | Imaging-system integrations, insurance connectors where applicable, offline-first clinical writing with conflict handling, data exchange APIs, optional AI administrative assistance | Unregulated autonomous medical decisions |
| **EXCLUDED** | Protect product focus and trust | No general hospital EMR, pharmacy delivery, social feed, crypto checkout, fabricated ratings, mandatory booking prepayment, indiscriminate patient-data access | — |

**Interpretation:** MVP means a complete operational pilot, not a minimal static prototype. PH numbers below are product-delivery slices, not guarantees about engineering duration.

### 1.4 Audience and value

| Segment | Pain / job-to-be-done | Value DandanLink must prove |
|---|---|---|
| Independent dentist | Patient history, treatment documentation, billing, missed follow-ups | One low-complexity tool for clinic operation and patient visibility |
| Clinic owner / manager | Coordinating people, chairs, schedules, money, and quality | Live operational dashboard, permissions, accurate ledgers, fewer double bookings |
| Receptionist / cashier | Rapid check-in, rescheduling, balance collection | Fast keyboard-friendly forms and 1-click access to patient/appointment context |
| Dentist / assistant | Clinical chart, visit notes, multiple treatment stages | Continuity across visits; signed history and relevant files, not scattered notes |
| Patient / guardian | Trustworthy nearby options and convenient booking | Verified profiles, honest availability, free self-service and family bookings |
| Platform operator | Fraud control, subscription income, support | Verifiable clinics, plans, moderation, audited exceptions, acquisition metrics |

### 1.5 Business model and subscription separation

- **Clinic subscription:** recurring B2B Starter / Professional / Business, configurable by admins; all tiers include safe basic records, scheduling, dental charting, treatment planning, invoices, booking listing. Higher tiers add capacity and operational extras, not access to one's own patient records.
- **Patient application:** entirely free for search, accounts, booking, appointment changes, permitted documents, and core notifications; patients pay the clinic directly for clinical services.
- **Two independent ledgers:** `platform_subscription_invoice/payment` belongs to DandanLink; `clinic_invoice/payment` belongs to the clinic. Never mix revenue or balances.
- **Price:** `ASSUMPTION`: launch amounts will be chosen after 10–15 clinic interviews and a pilot; **do not hard-code proposed AFN prices**. Trial default 14 days is a configurable hypothesis. Manual/subscription activation is supported until a provider is contracted.
- **Expired clinic:** retains controlled login for billing, data access/export, and renewal; cannot create new nonessential operational activity per documented grace rules; records are not deleted, and any clinically necessary continuity access is handled through an authorized safe process.
- **No sponsored rank in MVP.** Verified profiles may be sorted by relevance/availability/distance with transparent controls; quality/safety claims must not be algorithmically invented.

### 1.6 Measurable pilot outcomes (targets, not forecasts)

| ID | Measure | Pilot success threshold to validate, not promise |
|---|---|---|
| KPI-01 | Clinic onboarding completion | ≥70% of invited verified clinics configure at least one dentist, one chair, one service and hours |
| KPI-02 | Working clinic value | ≥80% of active pilot clinics create actual appointments and patient records weekly |
| KPI-03 | Booking integrity | 0 confirmed overlapping reservations for a required dentist/chair from parallel-booking tests |
| KPI-04 | Financial integrity | 100% tested payments trace to an invoice, clinic, actor and audit event; reversal does not erase history |
| KPI-05 | Patient booking completion | Track search→view→slot→confirmation funnel; set numerical target after initial observation |

### 1.7 Assumptions, risks, and required decisions

| Decision | Current default / assumption | When to resolve | Owner |
|---|---|---|---|
| Dentist/clinic verification evidence | Manual human review of government-issued/professional documents; criteria drafted with local dental advisers | Before accepting live public listings | Product + legal/clinical adviser |
| Local health privacy, clinical retention, hosting/jurisdiction | No unverified compliance assertion; perform local legal/security review; choose retention policy per jurisdiction | Before any real patient data or public launch | Legal/compliance |
| Prescription workflow | Clinician-authored document only if permitted by local rules; otherwise leave it out of MVP UI | Before clinical rollout | Dental adviser + legal |
| Consent & guardian permissions | Explicit consent where needed; minors/guardians verified according to policy | Before patient-record linking | Clinical/legal |
| Subscription price, grace window, trials | Configurable plan; initial 14-day trial assumption | Clinic interviews/pilot | Product + sales |
| Appointment reminders | Push and email when configured; SMS optional dependent on deliverability, vendor, consent and price | Before PH15 | Operations |
| Payment gateway | Manual cash/bank entries for MVP; no online-pay badge without integration | Before later integration | Operations |
| Maps/geocoding | Display map only when provider operational; fallback address and phone | Before public discovery | Product/operations |
| Connection and offline behavior | Read-only cached non-sensitive shell and retry UX; **no offline clinical writes** in MVP | Before pilot | Product + security |
| Clinical chart conventions | Support adult/primary FDI two-digit chart; chart UX clinician-approved | Before PH08 | Dental advisor |
| Clinical identity uniqueness | Internal clinic patient number, optional verified phone/link; no globally identifying patient name search | Before PH05 | Product/security |

### 1.8 Important non-goals

Patient account linkage never implies that two clinics can browse one another's clinical history. Approval to publish a dentist is not permission for platform admins to inspect clinical files. Clinics without an active public listing may continue authorized internal operations within their plan. A dentist may belong to multiple independent clinics, but each clinic owns its own clinical data and schedules.

## 2. Focused competitor and market evidence

**Research confidence key:** `VERIFIED` = publicly documented vendor behavior; `INFERENCE` = product design conclusion; `ASSUMPTION` = requires local validation. Sources are public documentation, not independent evidence of customer satisfaction or Afghanistan market share.

| Reference | What the official source verifies | DandanLink implication |
|---|---|---|
| **Open Dental** | Appointment portals, patient portal, reminders, chart, billing and practice modules are advertised [R1] | `VERIFIED`: these are baseline dental workflows; `INFERENCE`: ship clinical records + scheduling + finance together |
| **Dentrix Ascend** | Cloud charting, smart scheduling, payments, reminders, reports and multi-location support [R2] | `INFERENCE`: cohesive roles, reliable workflows, and clear admin UX matter more than novelty |
| **Practo Ray** | Calendar, patient records, billing, follow-ups and integration with public practice profiles [R3] | `VERIFIED`: clinic management plus discovery has a credible precedent; `INFERENCE`: localized AFN/RTL can be an angle |
| **Zocdoc** | Reads provider availability and writes bookings back into practice systems for compatible integrations [R4] | `INFERENCE`: one internal calendar eliminates integration sync drift in v1 |
| **Emransoft Crown (Afghanistan)** | Publicly describes dental records, appointments, billing, reporting [R5] | `VERIFIED`: local practice-management competition exists; do not claim a market monopoly |
| **Skysoft Dental Clinic Management (Afghanistan)** | Advertises tooth charts, procedures, imaging, treatment plans and charges [R6] | `VERIFIED`: dental-specific charting is a local baseline, not unique differentiation |

**Proposed positioning (INFERENCE):** a well-integrated, locally usable and affordable dental OS + free booking with strong treatment and balance continuity. **Unknown:** clinics' current digitization, subscriptions they will pay, local competitor usage and actual demand. Validate in person; do not assert a quantified market share or TAM from these sources.

### 2.1 Baseline expectations vs. differentiators

| Capability | Evidence/rationale | Role | Priority | Target product behavior |
|---|---|---|---|---|
| Digital patient chart | Open Dental, Dentrix, Skysoft | Dentist | MVP | Signed encounters, tooth history, attachments, permissions |
| Calendar + operatory | Open Dental, Dentrix, Practo | Reception/dentist | MVP | One chair/dentist resource-reserving calendar, walk-ins and public booking |
| Ledger + partial payments | Dentrix, local dental vendors | Cashier/owner | MVP | Invoice line items, immutable posts/reversals, derived balances |
| Clinic discovery + booking | Practo, Zocdoc | Patient | MVP | Verified public profile, live slots, confirmation and changes |
| Real Dari/Pashto RTL | Regional requirements | Everyone | **Differentiator** | Mirrored navigation and correct calendar/number/bidi behavior |
| Afghan operating conventions | Local pilot constraint | Everyone | **Differentiator** | AFN, Saturday start, Solar Hijri/Gregorian displays, phone/address support |
| Free patient family booking | Patient accessibility rationale | Patient/guardian | **Differentiator** | Dependents with verified authorization and safe record sharing |
| Full SaaS from phone/weak links | Connectivity constraint | Clinic/patient | **Differentiator** | Compressed bundles/media, retries, graceful uncertain-state UX |
| Robust clinic onboarding/import | Switching friction (inference) | Clinic owner | MVP | Assisted CSV preview, duplicate resolution, verified publish gate |
| SMS/gateway/AI | Provider feasibility unvalidated | Various | Later | No fake provider success or autonomous diagnosis |

### 2.2 Research and reference links

[R1] https://www.opendental.com/site/features.html  
[R2] https://www.dentrixascend.com/  
[R3] https://help.practo.com/practo-ray/getting-started/getting-started-with-ray/  
[R4] https://www.zocdoc.com/business/integrations  
[R5] https://www.emransoft.com/en/news/welcome-to-emransoft  
[R6] https://skysoft.af/en/products/catalog/dental-clinic-management  
[R7] https://docs.hesab.com/introduction/overview/ (potential **later** gateway only)  
[R8] https://data.who.int/dashboards/gdhm/countries (country-specific digital-health law information is incomplete/subject to change; obtain current legal advice rather than treating research as clearance).  
[R9] https://www.iso.org/standard/68292.html (refer to current ISO 3950 numbering publication; verify licensing and edition before claiming conformance).

**Do not copy vendor marketing claims as objective performance measurements.**

## 3. Roles, entitlements, and user responsibilities

### 3.1 Role definitions and first-use journey

| Role | Scope | Default landing | Main daily actions | First-use activation |
|---|---|---|---|---|
| Platform Super Admin (`SA`) | Platform metadata only; audited break-glass not normal clinical access | `/admin` | Review clinics/dentists, manage plans, moderate, support | Invite + MFA + admin approval |
| Platform Support (`SUP`) | Support tickets and redacted metadata; scoped admin permissions | `/admin/support` | Triage tickets, escalate, no unapproved patient chart access | Invite + MFA + assigned queue |
| Clinic Owner (`CO`) | One clinic tenant (or explicitly owned branch group in later release) | `/clinic` | KPIs, staff/fees/plan, audits | Signup→verify contact→register clinic→plan→configure→submit verification |
| Clinic Manager (`CM`) | Assigned clinic | `/clinic` | Schedules, approvals, service settings | Invitation→verified contact→policy acceptance |
| Dentist (`D`) | Assigned clinic, authorized patients/cases | `/clinic/clinical` | Today's cases, charts, sign visits/treatment | Invitation→credentials validation→availability |
| Receptionist (`R`) | Assigned clinic | `/clinic/appointments` | Book, check in, register patients, reschedule | Invitation→clinic selection→calendar |
| Dental Assistant (`AS`) | Assigned clinic and care teams | `/clinic/clinical` | Prepare permitted encounter data, see chair tasks | Invitation→role briefing→assigned cases |
| Accountant/Cashier (`F`) | Assigned clinic finance | `/clinic/finance` | Issue invoices, post payments, reconcile balances | Invitation→finance queue |
| Patient (`P`) | Self and authorized dependent profiles | `/` (browse) or `/appointments` (signed in) | Find, book, manage, view shared summaries | Browse guest→sign in at booking→verify contact |
| Guardian (`G`) | Dependent permissions, not a separate login role | `/account/family` | Add dependent, book, manage own authorized records | Existing patient account→dependent verification/consent |

A user may have multiple memberships, but the UI requires an explicit active clinic context. User identity, clinic membership, dentist professional identity, patient linkage and subscription entitlement are **separate records**. `platform_admin` must not be granted via clinic invitation.

### 3.2 Permission matrix (server-enforced; `*` = scoped)

Legend: `V` view, `C` create, `E` edit, `S` sign/approve, `X` export, `M` manage, `—` denied; rights always bounded by tenant, assignment and specific entity state.

| Resource/operation | SA | SUP | CO | CM | D | R | AS | F | P/G |
|---|---|---|---|---|---|---|---|---|---|
| Clinic business settings/plan | M metadata | V redacted | M | E* | V | — | — | V billing* | — |
| Clinic invitations/roles | — | — | M | M* (except owner) | — | — | — | — | — |
| Staff schedules/chairs | — | — | M | M | V* | V | V* | — | public availability only |
| Patient directory/demographics | — | — | V/C/E* | V/C/E* | V/E* | V/C/E | V* | V contact/billing* | own shared profile only |
| Clinical chart and encounters | — | — | V only if authorized clinician* | V only if authorized clinician* | V/C/E/S* | — | V/C draft* | — | only explicitly released summaries |
| Signed clinical amendments | — | — | — unless treating clinician | — unless treating clinician | S*, append-only | — | — | — | — |
| Appointments | aggregated metadata | — | M | M | V/E* | M | V* | V financial metadata* | own/dependent V/C/E* |
| Treatment proposals/consent | — | — | V* | V nonclinical status* | V/C/E/S* | V scheduling* | V draft* | V prices* | V/accept own if released |
| Clinic invoices/payments | platform aggregate only | — | M/X | M/X* | V own patient's relevant amount* | C/E* (permissions) | — | M/X | own released receipts |
| Public listing/reviews | M moderation | V reports* | C/E proposal | C/E proposal | V own profile | — | — | — | V/C verified review* |
| Platform clinic verification | M | V/triage* | own status only | own status only | own status only | — | — | — | public verified badge only |
| Platform subscription invoices | M | V redacted* | V/pay | V* | — | — | — | V* | — |
| Support tickets | M | M* | C/V own | C/V own | C/V own | C/V own | C/V own | C/V own | C/V own |
| Medical data export | — by default | — | request/approved* | — | authorized* | — | — | — | self release/export* |

**Owner ≠ omnipotent clinician.** Being financially responsible for a clinic does not automatically permit changing signed clinical records. Any exception must be explicitly approved in a clinic access policy and audited.

### 3.3 Cross-role handoff contracts

| Trigger | Actor | Persisted change | Next-role visibility | Notification | Privacy gate |
|---|---|---|---|---|---|
| Clinic signs up | CO | `clinic:draft`, trial/subscription, verification case | SA verification queue immediately | Owner submission result | Public listing hidden |
| Staff invited | CO/CM | Invitation scoped to clinic and role | Recipient sees invite; staff inactive until accepted | Email/SMS if configured | No access before acceptance |
| Staff books | R | Appointment reserves dentist/chair atomically | Assigned D/AS + patient's account if linked | Confirmation | Patient detail only to assigned staff |
| Patient requests booking | P/G | Requested or confirmed appointment per clinic rule | Reception queue + assigned clinician; public slot reserved/held according to policy | Status to patient, clinic alert | Only minimum contact shown in request |
| Dentist completes encounter | D | Signed visit, tooth observation and treatment progress | Relevant clinic finance may see chargeable procedure summary, not private notes | Optional patient approved summary | Explicit release/consent required |
| Cashier posts payment | F | Immutable payment post linked to invoice | Owner finance, patient's released receipt | Receipt | Clinic transaction only |
| Patient posts review | P/G | Moderation-pending review linked to completed visit | SA moderation, then public after policy checks | Review decision | No private diagnosis or attachment |
| Subscription expires | System | Entitlement state change, not data deletion | Clinic owner renewal/export; staff restricted by policy | Renewal alert | Protected data retained securely |

## 4. Complete navigation, route registry, and page inventory

### 4.1 Navigation rules and role transformations

**Clinic web, desktop ≥1200px:** fixed/expandable left sidebar in English and mirrored right sidebar in Dari/Pashto; logo and active clinic switcher at top; role-filtered navigation; compact quick-create appointment button, global patient search, alerts, language/calendar, account menu in header; content max 1440px with comfortable workspace width. **Tablet 768–1199px:** collapsible rail + header search; calendar remains swipe/scroll usable. **Phone <768px:** drawer (not 10 squeezed bottom tabs), contextual page actions, compact agenda, cards replacing broad tables. Back preserves selected tab/filter where sensible. No horizontal page overflow; tables may scroll within a clearly bounded container.

**Clinic sidebar canonical order:** `Dashboard`, `Appointments`, `Patients`, `Clinical`, `Finance`, `Staff & Resources`, `Services & Pricing`, `Clinic Profile`, `Reports`, `Settings`. Visibility and subitems are phased; clinic owners see broader modules, reception starts at Appointments, dentists at Clinical, cashiers at Finance. `Clinical` means the care-team worklist and encounter workspace; a specific patient's chart, treatment and billing are linked from the patient detail—not duplicate parallel databases. `Staff & Resources` contains Team and Chairs. `Settings` contains Clinic, Hours, Notifications, Subscription, Security & Export (only as delivered).

**Patient mobile:** bottom bar `Home | Appointments | Saved | Account` (labels localized; icon + label). Search is prominent in Home, not a redundant fifth tab. Browse works as guest; booking/account actions require login. Patient public website mirrors the same destinations in responsive top navigation; bottom navigation may appear on narrow mobile web. Booking is a focused full-screen flow; sensitive content never appears on public search pages.

**Admin web:** `Overview | Clinics | Dentists | Subscriptions | Marketplace | Reviews | Support | Analytics | Security & Audit | Settings`, hidden until the owning phase. Super Admin gets all permitted items; Support sees only assigned operations and redacted data. No admin nav into private clinical charts.

### 4.2 Navigation matrix (role, viewport, ownership)

| Role | Platform/viewport | Level | Label → destination | Default | Visibility | Owner phase |
|---|---|---|---|---|---|---|
| CO/CM | Clinic desktop sidebar | Main | Dashboard → C02; Appointments → C03; Patients → C06; Clinical → C17; Finance → C18 | C02 | Clinical edit only if qualified/authorized; Finance full owner/assigned | PH02/06/05/07/10 |
| CO/CM | Clinic sidebar | Main | Staff & Resources → C24/C26; Services & Pricing → C27; Clinic Profile → C28; Reports → C29; Settings → C30 | — | Manager rights limited by policy; modules appear when shipped | PH03/04/12/18/02 |
| D | Clinic desktop/tablet | Main | Clinical → C17; Appointments → C03; Patients → C06 | C17 | Only assigned/authorized patient care | PH07/06/05 |
| R | Clinic desktop/tablet | Main | Appointments → C03; Patients → C06; Finance → C18 (optional billing entitlement) | C03 | Clinical editor and owner plans absent | PH06/05/10 |
| AS | Clinic tablet | Main | Clinical → C17; Appointments → C03 | C17 | Draft/task assignments only | PH07/06 |
| F | Clinic desktop | Main | Finance → C18; Patients → C06 (minimal demographic and billing lookup) | C18 | No clinical detail or dental files | PH10/05 |
| All clinic roles | Clinic phone | Drawer | Same permitted labels as desktop | Role-specific | No inaccessible menu links | Owning phase |
| P/G guest | Patient web/mobile | Primary | Home → P01; Search → P02 (from home); clinic/dentist detail → P03/P04 | P01 | Public verified profiles only | PH13 |
| P/G signed in | Patient mobile | Bottom | Home → P01; Appointments → P11; Saved → P13; Account → P07 | P01 | Appointments from PH15, Saved from PH16; no dead item before release | PH13/15/16/14 |
| P/G | Patient account | Secondary | Family → P08; Preferences → P09; Shared Records → P14; Help → P16 | P07 | Records only if linked/released | PH14/15/18 |
| SA | Admin sidebar | Main | Overview → A01; Clinics → A02; Subscriptions → A06; Plans → A07 | A01 | MFA + admin authorization | PH02 |
| SA | Admin sidebar | Main | Dentists → A04; Marketplace → A08; Reviews → A09; Support → A10; Analytics → A12; Security → A13; Settings → A14 | — | Phased item-by-item | PH12/17/18 |
| SUP | Admin sidebar | Main | Support → A10; own ticket → A11 | A10 | No financial detail or clinical content | PH18 |

**Contextual navigation:** Each detail page has a safe parent breadcrumb or back route (`Back to Patients`, `Back to Search`, etc.). Subtabs have stable URL/deep-link destinations and selected/hover/focus/disabled styles. Route guards return a real 403 screen with next steps, not a 404 disguise. Subscription restrictions show entitlement explanation and renewal path, not a broken click. Deactivated staff immediately lose protected access and sessions must be invalidated.

### 4.3 Route registry AND page inventory — Clinic

The table doubles as the mandatory Page Inventory and Sitemap: each ID is unique, titles/paths are canonical, parent and role are explicit, and the `Job / subtabs` column lists content to be further specified below. `MVP` means the route is released in its owner phase, not exposed earlier. Deeper nested tabs get their own URLs or query state and are individually specified in §5.

| ID | Exact title / route | Parent | Roles | Job / meaningful subtabs | Feature ID | First active phase |
|---|---|---|---|---|---|---|
| C01 | Clinic Setup `/clinic/onboarding` | Auth | CO | Organization → Plan → People/Hours → Review & Submit | F02 | PH02 |
| C02 | Dashboard `/clinic` | Clinic root | CO/CM | Today, clinic setup/alerts, relevant KPI cards | F02,F05 | PH02 (enhanced later) |
| C03 | Appointments `/clinic/appointments` | Sidebar | CO/CM/D/R/AS* | Calendar (default), Requests (after PH15), Queue | F06,F15 | PH06 |
| C04 | New Appointment `/clinic/appointments/new` | C03 | CO/CM/R,D* | Search/create patient, service, dentist/chair, slot, notes, confirm | F06 | PH06 |
| C05 | Appointment Detail `/clinic/appointments/:appointmentId` | C03 | Authorized clinic staff | Status, timeline, edit, check-in, cancel/reschedule | F06 | PH06 |
| C06 | Patients `/clinic/patients` | Sidebar | CO/CM/D/R/F* | Directory (default), Import (authorized) | F05 | PH05 |
| C07 | Add Patient `/clinic/patients/new` | C06 | CO/CM/R,D* | Identity, contact, minimum history intake | F05 | PH05 |
| C08 | Import Patients `/clinic/patients/import` | C06 | CO/CM* | Upload → field mapping → preview → dedupe → commit | F05 | PH05 |
| C09 | Patient Overview `/clinic/patients/:patientId` | C06 | Authorized staff | Overview default; later Visits, Dental Chart, Treatments, Files, Billing | F05–F10 | PH05 |
| C10 | Patient Visits `/clinic/patients/:patientId/visits` | C09 | D/AS* | Visit history, status, start encounter | F07 | PH07 |
| C11 | Visit Detail `/clinic/patients/:patientId/visits/:visitId` | C10 | D/AS* | Encounter note, findings, attachments, sign/amend | F07 | PH07 |
| C12 | Dental Chart `/clinic/patients/:patientId/chart` | C09 | D/AS* | Permanent / Primary; exam/date filter; tooth inspector | F08 | PH08 |
| C13 | Treatments `/clinic/patients/:patientId/treatments` | C09 | D/AS*, R status* | Plans, filters, create proposal | F09 | PH09 |
| C14 | Treatment Detail `/clinic/patients/:patientId/treatments/:planId` | C13 | D/AS*, finance pricing* | Stages, prices, consent, progress, amendments | F09 | PH09 |
| C15 | Patient Files `/clinic/patients/:patientId/files` | C09 | D/AS* | X-rays/photos/docs; permissions, labels, upload | F07 | PH07 |
| C16 | Patient Billing `/clinic/patients/:patientId/billing` | C09 | CO/CM/F/R*, D amounts* | Invoices, payments, outstanding, receipts | F10 | PH10 |
| C17 | Clinical Worklist `/clinic/clinical` | Sidebar | D/AS*, qualified CM/CO | Today (default), Pending Notes, My Cases | F07 | PH07 |
| C18 | Finance Overview `/clinic/finance` | Sidebar | CO/CM/F/R* | Overview (default), Invoices, Payments, Balances, Expenses (PH11) | F10,F11 | PH10 |
| C19 | Invoices `/clinic/finance/invoices` | C18 | CO/CM/F/R* | Search/filter, new draft, issue | F10 | PH10 |
| C20 | Invoice Detail `/clinic/finance/invoices/:invoiceId` | C19 | CO/CM/F/R*, P released* | Items, payment timeline, receipt, adjustments | F10 | PH10 |
| C21 | Payments `/clinic/finance/payments` | C18 | CO/CM/F/R* | Posted entries, reconcile, reverse with reason | F10 | PH10 |
| C22 | Balances `/clinic/finance/balances` | C18 | CO/CM/F/R* | Accounts receivable, aging, patient drilldown | F10 | PH10 |
| C23 | Expenses `/clinic/finance/expenses` | C18 | CO/CM/F | Expense ledger, categories, entry/edit/reversal | F11 | PH11 |
| C24 | Staff `/clinic/staff` | Sidebar | CO/CM | Team (default), Dentists, Invitations | F03 | PH03 |
| C25 | Staff Detail `/clinic/staff/:membershipId` | C24 | CO/CM, self* | Roles, membership state, contact, audit | F03 | PH03 |
| C26 | Resources `/clinic/resources` | Staff & Resources | CO/CM,R view | Chairs/rooms, availability, deactivate | F04 | PH04 |
| C27 | Services & Pricing `/clinic/services` | Sidebar | CO/CM,D view | Services (default), price/slot duration | F04 | PH04 |
| C28 | Clinic Profile `/clinic/profile` | Sidebar | CO/CM,D own profile* | Overview, Dentists, Photos, Booking Rules, Preview | F12 | PH12 |
| C29 | Reports `/clinic/reports` | Sidebar | CO/CM/F*,D own stats* | Appointments, Patients, Revenue (role-gated) | F18 | PH18 |
| C30 | Clinic Settings `/clinic/settings` | Sidebar | CO/CM | General, Hours, Notifications, Subscription, Security & Export | F02–F19 | PH02 |
| C31 | Hours & Holidays `/clinic/settings/hours` | C30 | CO/CM | Weekdays, breaks, exceptional closures | F04 | PH04 |
| C32 | Notification Preferences `/clinic/settings/notifications` | C30 | CO/CM | Event type, channels, limits, delivery history | F15 | PH15 |
| C33 | Subscription `/clinic/settings/subscription` | C30 | CO/F view | Plan, invoice history, renew, upgrade, trial/grace | F02 | PH02 |
| C34 | Security & Access `/clinic/settings/security` | C30 | CO/CM* | Staff access review, sessions, MFA status | F03 | PH03 |
| C35 | Export & Data Retention `/clinic/settings/export` | C30 | CO and authorized export | Request export, jobs, access log, retention notice | F19 | PH19; pre-live gate |
| C36 | Booking Requests `/clinic/appointments/requests` | C03 | CO/CM/R,D* | Pending acceptance, reject with reason/alternatives | F15 | PH15 |
| C37 | Patient Queue `/clinic/appointments/queue` | C03 | CO/CM/R,D/AS* | Today check-in, waiting, in-treatment, completed | F06 | PH06 |

`*` means narrower, configurable scope or read-only access, never automatic full privileges. Patient URLs and clinic URLs share a global user ID system but NOT a shared public patient-chart endpoint.

### 4.4 Route registry AND page inventory — Patient (web + Expo)

Mobile screen names parallel web URLs with navigation stack equivalents; externally shared clinic/dentist links resolve on web if app unavailable.

| ID | Exact title / web route (mobile screen) | Parent | Roles | Job / subtabs | Feature | First active phase |
|---|---|---|---|---|---|---|
| P01 | Find Dental Care `/` (`Home`) | Root | Guest/P/G | Search hero, locations, specialties, available clinics | F13 | PH13 |
| P02 | Search Results `/search` (`SearchResults`) | P01 | Guest/P/G | List (default), Map only when operational, filters | F13 | PH13 |
| P03 | Clinic Profile `/clinics/:slug` (`ClinicDetail`) | P02 | Guest/P/G | Overview, Dentists, Services, Reviews (after PH17), About | F12,F13 | PH13 |
| P04 | Dentist Profile `/dentists/:slug` (`DentistDetail`) | P02/P03 | Guest/P/G | Bio, verified qualifications, services, available dates | F12,F13 | PH13 |
| P05 | Sign In `/login` (`SignIn`) | Context | Guest | Email verification, return-to booking | F14 | PH14 |
| P06 | Create Account `/signup` (`SignUp`) | Context | Guest | Consent, email verify, profile setup | F14 | PH14 |
| P07 | My Account `/account` (`Account`) | Bottom bar | P/G | Profile, family, records, preferences, support | F14 | PH14 |
| P08 | Family Members `/account/family` (`Family`) | P07 | P/G | Dependent directory; add, edit, remove authorization | F14 | PH14 |
| P09 | Preferences `/account/preferences` (`Preferences`) | P07 | P/G | Language, calendar, notification consent, privacy | F14 | PH14 |
| P10 | Book Appointment `/book/:dentistId` (`BookFlow`) | P03/P04 | P/G | Service → Date/time → Patient → Review → Result | F15 | PH15 |
| P11 | My Appointments `/appointments` (`Appointments`) | Bottom bar | P/G | Upcoming (default), Past, Cancelled | F15 | PH15 |
| P12 | Appointment Detail `/appointments/:appointmentId` (`AppointmentDetail`) | P11 | P/G | Status, location, reschedule/cancel, receipt link | F15 | PH15 |
| P13 | Saved Dentists & Clinics `/saved` (`Saved`) | Bottom bar | P/G | Dentists, Clinics | F16 | PH16 |
| P14 | Shared Records `/account/records` (`SharedRecords`) | P07 | P/G | Approved treatment summaries, receipts, unlink | F15 | PH15 |
| P15 | Write Review `/clinics/:slug/review` (`ReviewForm`) | Completed appointment | P/G | Verified experience rating, text, submit | F17 | PH17 |
| P16 | Help `/help` (`Help`) | Account/footer | All | FAQs, contact, support request | F18 | PH18 |
| P17 | Legal & Privacy `/privacy`, `/terms` (`Legal`) | Footer/Auth | All | Published service policy, privacy, consent | F01 | PH01 for web; approved copy before public launch |

**Mobile parity condition:** PH13–15 release patient public web first; PH16 delivers fully connected native equivalents of every patient MVP journey, not a visual-only Expo shell. Until PH16, an Appointments/Saved bottom bar is not shown in a native store build.

### 4.5 Route registry AND page inventory — Platform admin

| ID | Exact title / route | Parent | Roles | Job / subtabs | Feature | Phase |
|---|---|---|---|---|---|---|
| A01 | Admin Overview `/admin` | Admin root | SA | Registrations, subscription state, review workload | F02 | PH02 (enhanced PH18) |
| A02 | Clinics `/admin/clinics` | Admin sidebar | SA | Pending (default), Approved, Suspended, Rejected | F02 | PH02 |
| A03 | Clinic Verification `/admin/clinics/:clinicId` | A02 | SA | Evidence, decision log, status, request more info | F02 | PH02 |
| A04 | Dentist Verification `/admin/dentists` | Admin sidebar | SA | Pending, Verified, Rejected | F12 | PH12 |
| A05 | Dentist Verification Detail `/admin/dentists/:dentistId` | A04 | SA | Credentials, affiliation, decisions | F12 | PH12 |
| A06 | Subscriptions `/admin/subscriptions` | Admin sidebar | SA | Trials, Active, Grace/Expired, Manual reconciliation | F02 | PH02 |
| A07 | Plan Catalog `/admin/plans` | A06/sidebar | SA | Plans, limits, prices, active/version history | F02 | PH02 |
| A08 | Marketplace Listings `/admin/marketplace` | Admin sidebar | SA | Pending profiles, Published, Reported | F12 | PH12 |
| A09 | Reviews `/admin/reviews` | Admin sidebar | SA | Pending, Published, Flagged, Removed | F17 | PH17 |
| A10 | Support `/admin/support` | Admin sidebar | SA/SUP | Open, In Progress, Resolved | F18 | PH18 |
| A11 | Ticket Detail `/admin/support/:ticketId` | A10 | SA/SUP assigned | Conversation, tags, status, redacted metadata | F18 | PH18 |
| A12 | Analytics `/admin/analytics` | Admin sidebar | SA | Clinics, bookings, subscriptions, funnels | F18 | PH18 |
| A13 | Security & Audit `/admin/security` | Admin sidebar | SA security-role only | Events, incidents, access reviews | F18 | PH18 |
| A14 | Platform Settings `/admin/settings` | Admin sidebar | SA | Verification rules, taxonomies, message templates, localization | F18 | PH18 |

### 4.6 Shared auth and public routes

| Route | Audience | Page intent | Owner |
|---|---|---|---|
| `/clinic/signup`, `/clinic/login`, `/clinic/verify`, `/clinic/reset-password` | Clinic staff/owners | Secure account flows, scoped return destination | PH01 |
| `/admin/login` | Pre-invited internal users | MFA and role checks, not public admin signup | PH01 |
| `/pricing`, `/for-clinics` | Public clinic prospects | Clear features, trial eligibility, plan comparison | PH02 |
| `/contact`, `/about` | Public | Company contact/real support information, no fake reviews | PH13/18 |
| `/403`, `/404`, `/error`, `/offline` | All platforms | Recovery, current role and safe route home, retry as applicable | PH01 |

### 4.7 Navigation integrity acceptance

- `NAV-01` All visible menu items have a real destination and a meaningful empty, loading and success state; no future tab appears before its phase.
- `NAV-02` Role and clinic switches update active menu, permissions, breadcrumb and data scope; cached data from previous clinic is cleared.
- `NAV-03` Deep links to a clinic patient are rejected for unauthorized users even when the client hides its navigation.
- `NAV-04` Browser Back and mobile native Back preserve sensible context and do not silently repeat purchases or bookings.
- `NAV-05` Every subtab's default, selected style and query state remain stable after refresh/localization switch; nav icons and chevrons mirror appropriately in RTL.

## 5. Complete page and subtab blueprints

### 5.0 Global blueprint contract (applies to every route unless superseded)

**Common structure:** semantic page title and breadcrumb/back; short description or task context; primary action in predictable top-end position; useful summary when warranted; search/filter/action row; data work area; context actions; pagination; contextual help. Use specific information rather than ornamental cards. **State contract:** `initial → loading/skeleton → success`, plus true empty/first-use, filtered-empty (clear filters), field-validation, permission-denied, offline/unreachable (retry), optimistic conflict, stale session, saving with disabled duplicate-submit, success feedback and return path. **Lists:** server-side paging, default 20/page desktop and 10/page phone unless noted; accessible Previous/Next and page count; persist query/search/filter/selected subtab in URL. **Forms:** visually mark required inputs, inline accessible error messages, cancel without saving, dirty-form leave confirmation, submitting spinner on form submit (not every pagination control), focus first error, preserve user input on 4xx/5xx. **Security:** only request the minimum data authorized by role; no medical details in public URLs or analytics. **Device behavior:** desktop side-by-side panels where productive, tablet stacking, mobile cards/drawers/bottom sheets; no table clipping. **Locale:** labels, messages, date controls and directional UI all supported in Dari/Pashto/English; never reverse email, phone, FDI numbers or other inherently LTR identifiers.

**Page-spec reading key:** Each subtab row is a separately implementable stateful panel. `Actions` are real navigation or persistence events. If a function is listed as later, omit its control before that phase. Forms not requiring additional fields beyond cross-referenced forms are stated explicitly. Default selections in the route registry govern otherwise.

### 5.1 Clinic enrollment and dashboard (C01, C02, C30, C33)

**C01 — Clinic Setup:** left progress stepper on wide screens, linear progress ribbon on phones; title, back, autosaved nonclinical draft, continue/save/submit controls. Step 1 **Organization**: legal clinic name* (2–120 characters), public display name* (2–100), clinic type* (solo/office/specialty), province*, city*, district, descriptive address*, phone* with Afghan/international validation, email*, timezone preset Asia/Kabul, map pin optional, license/registration identifier if applicable; owner attestation. Step 2 **Plan**: compare Starter/Professional/Business by included core features and staff limits, billing period monthly/annual, trial eligibility; transparent price and next charge. Step 3 **Operations** (enabled with PH03–PH04, not shown as a dead step during PH02): guided activation of initial dentist identity, one service, default availability and chair using the same real editor APIs as the full staff/resources screens. In PH02, this step is replaced by an honest checklist with no unavailable controls. Step 4 **Verify**: upload professional/clinic documents securely, review data, terms/consent, submit. Clinic states shown as `Draft`, `Pending review`, `Needs information`, `Approved`, `Rejected`, `Suspended`; public listing unpublished until both relevant checks pass. Forms reject duplicate registered clinic identifier where known, invalid file types and oversized files; verification is manual and audit logged. On incomplete setup, display a actionable checklist rather than an empty dashboard. **First milestone PH02** need not publish marketplace or open clinical workflows, but C01 and plan/trial/manual acceptance are fully functional.

**C02 — Dashboard:** role-specific 12-column desktop grid: page title/active clinic/date, small contextual quick actions, 3–4 truly relevant KPI tiles (do not repeat ones without working data), `Today's schedule` list, `Needs attention` panel, and optional `Recently updated` list. Owner sees booking count, pending verification, active subscription/trial and later money KPIs; receptionist sees waiting/confirmed/pending; dentist's default is Clinical worklist; cashier's default Finance. Each metric links to its source route and uses the same authorization filters. Empty state offers the next real step (`Finish setup`, `Add first patient`, or `Create appointment`), never fake revenue.

**C30 — Settings General:** clinic legal/public name, contact, office timezone, supported language, logo, address, default calendar; save with version check and audit reason for sensitive fields; ownership and verified claims changes reopen an approval request instead of silently republishing. Contextual rows to Hours, Notifications, Subscription, Security, Export only when released.

**C33 — Subscription:** top current-plan banner (status, trial/grace days, renewal date and access scope), `Available plans` cards with staff/branch limits, invoice/transaction history table, billing period selector, renewal method and contact; upgrade/downgrade preview including effective date and proration policy. Offline/manual payment is labeled `Awaiting verification`, not immediately `Paid`. Expired mode allows owner to see invoices/renew/export but prevents unauthorized new operations; critical record access respects documented continuity policy. Empty plan state links back to onboarding; payment errors show retry/reconciliation reference. `Trialing / Active / Grace / Expired / Cancelled` are distinct.

### 5.2 Scheduling and patient queue (C03, C04, C05, C36, C37)

**C03 — Appointments Calendar:** header with `Today`, previous/next, date-range label/calendar picker, view toggle `Day | Week | Month`, clinician selector, chair selector, status filter, `New Appointment` action; next region shows appointment density/legend and schedule grid. Default Day for receptionist and phone, Week for owner desktop; Month shows counts with drilldown rather than microscopic cards. Dentist/chair/time conflicts are blocked server-side; selecting a free slot pre-fills C04. Slots show start/end, patient abbreviated name (privacy), service, clinician, status and available actions. Locked/blocked slots carry explanatory badges. On phone use an agenda grouped by date; sticky date navigation, accessible time labels. **Subtabs:**

| Subtab | Visible in phase | Layout and contents | Actions | Empty/error behavior |
|---|---|---|---|---|
| **Calendar** (default) | PH06 | Synchronized Day/Week/Month, provider/chair filters, appointment status colors | New, select, reschedule, navigate today | `No bookings for date` + New; conflict explanation and refresh |
| **Queue** | PH06 | Today's time-sorted `Expected → Arrived → In Treatment → Complete` columns; arrival time | Check in, start care (authorized), finish, mark no-show | Empty day + calendar link; no unauthorized chart access |
| **Requests** | PH15 | Patient requests newest first; service/date/dentist, deadline, requested contact, status; `Pending/Processed` filter | Accept, reject with reason, propose alternative | No requests and notification status; requests don't double-reserve slots |

**C04 — New Appointment:** two-column wizard desktop / single column phone, with summary sticky near submit. Fields: patient* (existing patient search by clinic-specific ID/phone/name; create patient inline only with authorized role); service* (drives default duration and whether chair needed); dentist* (authorized and available), chair* if service requires; appointment date* and start time*; duration* (default service duration, bounded by clinic rules); source (`staff`, `walk-in`, `phone`); note optional **administrative only**; confirmation channel if patient contact/consent exists. If appointment for a dependent, patient record selected explicitly. Availability always rechecked on submit. Clear error if slot taken and show three next genuinely available options; no duplicate appointment from double-tap (idempotency key).

**C05 — Appointment Detail:** identity/time/location/status at top; treatment/service summary, patient contact (authorized), provider/chair, timestamps, audit timeline, contextual actions. Status transitions from booking policy; reschedule opens availability picker and atomically swaps reservation, preserving original in history; cancellation requires reason, optionally notification; check-in starts queue. Dentist opens linked encounter for permitted appointment only after appropriate check-in or explicit care entry. Soft conflicts/rejections remain visible in history. Unsupported actions are absent or explain why disabled.

**C36 — Booking Requests:** split `Pending` and `Processed` tabs; card/table with requested patient, service, clinician, slot, booking source, wait age, reserved-until indicator (if holds configured). Accept locks the resources and transitions to Confirmed; reject captures reason and optional alternative slots, releases tentative hold. Race between receptionist acceptance and another booking is resolved by atomic availability constraint. A processed request cannot be accepted twice. A rejected request's private reason is sent only to patient/clinic participants.

**C37 — Patient Queue:** four-state stepper grouped by clinician with today's arrival time, check-in timestamp, waiting duration, chair assignment and minimal patient identifier. Receptionist may check in; clinical start/finish restricted. Duplicate check-in rejected idempotently. A patient not arriving can be marked No-show from eligible confirmed state; a completed appointment cannot be silently returned to Scheduled. Empty state: `No patients checked in yet` with active link to today's schedule.

### 5.3 Patient registry and longitudinal record (C06–C09)

**C06 — Patient Directory:** header and `Add Patient`, keyword search by name/verified phone/internal clinic ID (debounced 300 ms), status filter, columns `Patient ID | Name | Contact | Last visit | Next booking | Balance` (balance only financial roles), sortable last visit/name, server pagination. Default sort last activity; patient count based on scoped tenant. Duplicate suggestions shown to authorized staff upon matching phone+name; never globally search patients outside clinic. `Import` subtab/shortcut visible to owners/managers after PH05. Long list returns paginated results, never a wall of patient cards.

**C07 — Add Patient:** grouped sections `Identification`, `Contact`, `Medical Intake`, `Consent`. Fields: preferred name* 2–120; optional family name; DOB or age estimate (mark estimated; never infer precise DOB); sex/gender field only if clinically justified and locally approved, optional; phone optional unless needed for confirmation; alternate contact; province/city/address optional; emergency contact optional; allergies/medications/medical conditions **entered by qualified/authorized personnel** with provenance and `unknown` state; optional existing guardian relationship; privacy notice acknowledged where required. Internal patient ID generated server-side unique within clinic, never editable. Pre-save duplicate candidate dialog with `Open existing` / `Create anyway (reason)`; receptionist can save demographic shell without pretending to certify medical history. On success navigate C09.

**C08 — Import Patients:** 5-step guarded flow: download UTF-8 template; upload CSV (file size/count guard), map headings to `name, phone, ID, DOB, address`, preview sample rows, identify invalid/duplicate records, choose skip/merge/new with permission, commit batch. Display counts `Created / Skipped / Needs review / Failed` and downloadable row-level error report; imports are atomic per row, retry is idempotent with import job ID. No X-ray import, financial import or historical treatment import is implicitly supported in MVP. Before inserting real clinical history, require a separate reviewed migration pathway.

**C09 — Patient Overview:** fixed patient identity header `Clinic patient ID · age/DOB disclosure level · preferred contact`, contextual booking/New visit actions, alert strip for recorded allergy/medical alert **only to clinical roles**; `Overview` includes next appointment, treatment summary and last visit, with role-based financial balance. Role-filtered contextual subtabs appear as their owning feature ships:

| Patient subtab | First phase | Contents & layout | Primary action | No-data presentation |
|---|---|---|---|---|
| **Overview** (default) | PH05 | Demographics, next appointment, consent/link status, role-safe snippets | Edit demographics; Book | Add first appointment |
| **Visits** | PH07 | Reverse chronological visits with author/date/status | Start/continue authorized encounter | No clinical visits |
| **Files** | PH07 | Secure grid/list of authorized private files with type/visit linkage | Upload classified file | No files uploaded |
| **Dental Chart** | PH08 | Adult/primary tooth chart and selected tooth pane | Start examination | No chart observations |
| **Treatments** | PH09 | Status-filtered treatment plan cards and stages | Create proposal | No active plans |
| **Billing** | PH10 | Scoped statement, invoices, payments and balance | New invoice/payment | No invoices; balance 0 |

**Important**: `Patient Overview` is clinic-local, whereas patient account P07 is global identity. A patient cannot attach a clinic record merely by typing an identical name. Patient link requires verification and clinic authorization where appropriate.

### 5.4 Clinical workflows, dental chart, treatments (C10–C15, C17)

**C17 — Clinical Worklist:** assigned date/clinician controls; **Today** tab ordered appointments with check-in state and `Open Encounter` action, **Pending Notes** tab with unfinished drafts requiring sign, **My Cases** tab with relevant ongoing treatments. Dentist sees only assigned/authorized cases, assistant sees permitted draft tasks; managers without a clinical role see operational progress counts, not clinical note text. Empty panels instruct to choose another date or open assigned schedule; no cross-tenant search.

**C10 — Patient Visits:** horizontal mini-summary of visit count/last provider and reverse-chronological timeline with date, reason, dentist, signed/draft badge. `New Visit` only for appropriately authorized clinician; may bind to completed/ongoing appointment but should also support a clinically authorized unscheduled encounter with reason. No deletion of signed visit. Explicit patient context at all times.

**C11 — Visit Detail:** top patient/encounter header (status, author, timestamp), two-column `Clinical Intake / Note` with side context `Relevant allergies / last chart / treatment stages`. Form fields: presenting complaint* (1–2000), relevant history source and date, findings* (1–5000), procedure(s) performed (service/procedure code, tooth IDs as applicable), clinical assessment* (clinician text), plan/follow-up, optional medications/prescription only if separately approved, attachments. `Save draft` and `Sign encounter` are distinct actions. Signing prompts confirmation and clinician authentication check; signed content immutable, corrections via dated append-only amendment capturing reason, author and reference. On failed save, preserve local form buffer (non-persistent memory; avoid insecure offline storage). Every field carries required/optional indicators and appropriate input limits. An assistant may prepare draft information but cannot sign as dentist. Clinical records display provenance and audit history.

**C15 — Patient Files:** file table/grid with filter by `X-ray, Photograph, Consent, Other` and visit/plan, title/filename, uploaded by, date, private-access indicator. Upload fields: file(s)*, type*, associated encounter/plan optional, notes optional; allow approved JPG/PNG/PDF only initially, server verify MIME/magic bytes, antivirus scan/quarantine as available, per-file size guard configurable; EXIF strip for exported public photos; no inline CDN public URL. Preview uses short-lived authorization checks/signed response and audit. Deletion of clinical files follows retention and amendment policy (do not hard-delete evidence casually). Under slow network, progress/pause/retry and clear failed-upload message.

**C12 — Dental Chart:** title `Dental Chart`, patient name, examination date, `Permanent | Primary` selector (adult default only if patient context warrants; never hide primary history), full-mouth interactive odontogram responsive SVG, orientation label `Patient's right / left`, legend, tooth state indicators, selected-tooth inspector drawer. FDI two-digit codes (permanent quadrant 1–4, primary 5–8), tooth condition enum (`sound, caries suspected, restored, missing, extraction planned, root-canal treated, crown, implant, other`) plus tooth-surface tags where appropriate and comments. Clinician picks tooth → selects observed state and relevant date/visit → saves observation with author/time; history remains viewable, not overwritten. **Historical chart**, **Selected visit**, and **Current status** are distinct filters: current status is latest validated observation per tooth, earlier states stay in timeline. Never generate an automated diagnosis. On mobile, grid/zoom and numbered tooth selector accessible by keyboard/screen reader. Chart creation without prior clinical visit either creates an examination record or requires explicit encounter association, as decided in clinical review.

**C13 — Treatment Plans:** status tabs `Draft | Proposed | Accepted/In Progress | Completed | Discontinued`, searchable summary `plan name, clinician, estimated total, number of stages, status`, create action. Required new plan fields: patient, title* (3–120), clinician*, clinical indication text* (clinician-entered), proposed service lines/tooth references, estimated sessions, pricing drawn from current service catalog but snapshotted per line, optional expected duration and notes. Only qualified clinician proposes/approves clinical content. Plan can be drafted without automatic billing; patient-facing release is explicitly selected.

**C14 — Treatment Detail:** header `status, clinician, version, consent`, sections `Plan summary | Stages | Estimate | Consent | Timeline` with deterministic order. **Summary:** indication, plan text and estimated duration. **Stages:** ordered stage cards (`description, tooth reference, expected visits, due suggestion, status, linked encounter`), `Start/Complete stage` clinical action, cannot complete unstarted stage without reason. **Estimate:** snapshot item price, quantity, discount/adjustment authorization and total, link to invoice draft creation (not silent charge). **Consent:** approved patient/guardian acceptance methods (in-person recorded attestation/e-sign only after legal verification), timestamp, scope, withdrawal/revision. **Timeline:** append-only actions and versions. Major change after acceptance creates a new proposed revision; previous approval remains historic. Discontinued plans require reason and do not erase performed procedures or debts. The patient only sees the clinician-released summary, not internal draft notes.

**Cross-clinical actions:** A procedure completed in C11 can update a linked treatment stage; clinic billing staff see authorized charge-ready procedure metadata, not raw diagnosis text; chart/tooth modifications from C12 linked to encounter and audit trail. A planned procedure is **not equivalent** to performed, and neither is automatically equivalent to a paid charge.

### 5.5 Finance (C16, C18–C23)

**C18 — Finance Overview:** top `Today receipts`, `Unpaid invoiced`, `Overdue`, `This month net collections` (clearly label which is revenue vs cash); interval filter, recent payments, accounts requiring action. Report cards link to actual transaction lists. **Subtabs:** `Overview` summary; `Invoices` → C19; `Payments` → C21; `Balances` → C22; `Expenses` → C23 added PH11. Do not display undefined profit margin until expenses and accounting method specified. Permission-limited reception has invoice posting only, not owner revenue reports.

**C19 — Invoices:** scoped table `Number, patient, issue date, due date, total, paid, balance, status`; filters `Draft/Issued/Partially Paid/Paid/Void/Overdue`, date range, clinician/service as authorized; primary `Create Invoice`. Drawer form: patient*, line items* (`service, description, quantity, unit price snapshot, discount`), tax if configured, due date optional, internal note; draft preview and `Issue` confirmation. Totals calculated server-side in decimal minor units; reject negative amounts or unauthorized adjustments. Editing issued invoices uses revised documents/credit adjustments according to accounting policy, not silent overwrite.

**C20 — Invoice Detail:** itemized charges, totals, posted payments, remaining balance, receipt print/PDF, issue/reissue notes and audit. `Record Payment` launches modal: amount* (>0, ≤balance unless explicit credit policy), date/time*, method (`cash, bank transfer, other manual`), reference optional, collected by auto, receipt note optional; same invoice reference and idempotency key; if overpayment, explicit credit policy required rather than creating negative balance accidentally. `Void` only before settlement or via authorized reversal/credit, retaining history. Mark overdue from due-date calculation, not manual editing.

**C21 — Payments:** filterable ledger table `time, invoice, patient, method, amount, entered by, reference, status`; `Record payment` requires invoice context; `Reverse` privileged action opens reason modal and performs compensating entry rather than delete; duplicate payment detection warns on same method/reference/amount/time and requires resolution; downloadable export authorized. Manual bank transfer is `Unverified/Recorded` according to clinic policy, not platform-confirmed digital capture.

**C22 — Balances:** patient/invoice receivable table with `Current, 1–30, 31–60, 61+ day` aging filters calculated from due date; quick route to patient billing, issue/remind (only approved communication channel). Totals match invoice issued amounts minus valid posts, reversals, authorized credits. Search scoped to tenant. No list of patients from other clinics.

**C16 — Patient Billing:** top patient-level statement `Total invoiced, Total paid, Outstanding`, then subtabs `Invoices | Payments | Statement`; show treatment-linked invoices where present, but permit ordinary consultation charges; receipt view available to patient only if released/owned. An accountant sees no dental chart link. Empty state `No billing activity` with New Invoice for authorized users.

**C23 — Expenses:** `Expenses` subtab with date-range filter, category, source and amount. Entry form `Date*, Category* (rent, salary, supplies, utilities, other), Description*, Amount AFN*, Payment method*, Receipt optional`, reference and attribution. Corrections retain an audit trail; expense totals never appear as clinical patient charges. Owner can see category reporting; accountant records and reconciles. No full payroll system implied.

### 5.6 Clinic operations, listing and settings (C24–C29, C31–C35)

**C24 — Staff:** page header with authorized `Invite staff`. Subtab **Team**: name, role, active status, last activity, assigned site; actions View/Suspend/Remove; **Dentists**: clinical specialty/credential review, working schedule summary, status, link to C25; **Invitations**: pending invites, role, expiry, resend/revoke. Invite form `email or validated phone* (based on supported verification), role*, optional dentist profile, expiry policy`, prevent duplicate active membership, owner demotion without alternate owner, and privilege escalation by managers. Invites are not active accounts until accepted and authenticated.

**C25 — Staff Detail:** profile/contact, role grants with explicit scope, assigned dentists/chairs, working-hour link, membership status, activity summary; edit role (authorized) requires reason for privilege increase; deactivation invalidates sessions. Dentist qualifications are editable as unpublished draft; public verified badge only via admin. Self profile may update limited contact details, not self-assign a role.

**C26 — Resources:** **Chairs & Rooms** list `label, branch, type, active, capabilities`; add form `Name* (1–50), Internal code* unique clinic, Equipment type optional, Active yes/no`; `Edit`, `Deactivate` only if no future appointments or after explicit reassignment. Availability is the intersection of dentist shift, chair shift and service constraints. Rooms are not required for services that don't consume an operatory; services declare chair requirement. Empty state prompts first chair; onboarding wizard may create a default chair, clearly labeled for confirmation.

**C27 — Services & Pricing:** **Services** list `service name, specialty/category, duration minutes, price AFN, bookable?, active?`; add/edit with `Name* 2–100, Category*, Description optional, Estimated duration* 5–240 (clinic adjustable), Base price* ≥0, Requires chair?, Public booking?`, optional preparation buffer, provider eligibility. Historic invoice and appointment values snapshot at creation; changes never retroactively alter paid charges. Deactivate with active future booking warning. Custom services support general practice, cleaning, consultation, filling, extraction, root canal, orthodontics, etc. as **configurable catalog items**, not hardcoded clinical diagnoses.

**C31 — Hours & Holidays:** weekly table with each Saturday–Friday row `open? start/end, breaks` and dentist-specific overrides (C25) with chair calendar (C26). Add single-day/interval exceptions with reason; prevent end≤start, overlapping breaks, invalid local timezone transformations. Show preview of generated availability; save recalculates future bookable slots and warns if existing bookings would be affected. Existing confirmed appointments remain recorded and require explicit reschedule/cancel, not silent deletion.

**C28 — Clinic Profile:** published/draft state banner, verification badges and required incomplete fields at top. **Overview**: display name, description, specialties, address, location/map, contact, gallery primary image; **Dentists**: cards with name, qualifications (verified-only), specialties, prices/availability; **Photos**: upload, reorder, caption, public image moderation and rights attestation; **Booking Rules**: auto/manual approval, minimum notice, horizon, cancellation window, permitted public services, booking buffer, chair availability; **Preview**: actual patient-facing render with `Draft/Published` indicator and changes awaiting approval. Edits to critical verified details go to pending revision, old published version remains until approval where appropriate. Publishing needs approved clinic and eligible verified dentist, at least one public service, location, hours and real slots; show explicit missing-items checklist.

**C29 — Reports:** tabs **Appointments** (`booked/completed/cancelled/no-show`, provider/date filters), **Patients** (`new/returning/active`, date interval and privacy-safe counts), **Revenue** (`issued charges, collected amounts, outstanding`, provider/service filters if permitted). Time range custom/last 7/30/90 days, clear chart axis/units, accessible summary table and export for authorized roles; hide revenue tab from assistants and most reception users. All counts reconcile to operational tables; no synthetic demo numbers in production. Clinic dashboards are read-only analytic aggregates with drilldowns.

**C32 — Notification Settings:** event matrix `confirmation, request approved/rejected, 24h reminder, rescheduled, cancelled, receipt` × `push/email/SMS` (only active provider channels); sender display name, template preview per language, per-channel usage/cost where known, consent and quiet hours. `Test` sends a test only when provider configured; delivery log shows queued/delivered/failed with error; disabled SMS uses `Not configured`, not a functional switch.

**C34 — Security & Access:** staff access summary and suspicious sign-in alerts, required MFA status per privileged role, session/device list, force logout permission, invitation audit. Show only safe metadata (IP where policy permits, time, user, action); never log notes or patient file contents. User self password reset and session revocation lives under the shared account menu. Failed login attempts use rate limits and generic messages.

**C35 — Export & Data Retention:** export request form `data scope* (patient directory, assigned patient's authorized record, financial ledger), date range, format (CSV/JSON plus PDF for appropriate records), reason*`; approval checks, job status `Queued/Processing/Ready/Failed/Expired`, re-authentication for download and short-lived private links; audit fields `requested by, approved by, downloaded by, time, tenant`. Do not claim irreversible deletion on subscription expiry. Retention/deletion instructions reflect locally approved policy. This page and tested restore/export processes are **required before live clinical data**, even though feature implementation sits at PH19.

### 5.7 Patient application — public discovery, account, booking (P01–P17)

**P01 — Home / Find Dental Care:** phone-first page with simple header `location selector · language`, search field (placeholder localized equivalent of `Search dentist, clinic or treatment`), primary search action, specialty quick-select chips, `Available near you` verified cards with photo, name, specialty, location, next bookable time **only if current data exists**, and clear city filter. No invented featured clinics or fabricated ratings. On first use, default to Kabul **only as editable city selection**; geolocation is opt-in and absence does not block usage. Empty location: `No participating clinics found here yet` plus change-city action. Guest can browse full public details. Desktop hero search left / relevant value copy right; small phone one-column and compact cards.

**P02 — Search Results:** query and city persist in URL; compact horizontal filters `Specialty, Service, Date, Consultation fee, Verified` with clear/reset; cards show clinic/dentist photo placeholder, name, independently verified credentials indicator, region, fee with `Not listed` when absent, next available slot only if true; `Book` and `View` actions. Default relevance sorts by exact query/category match and available times without paid rank; options `Soonest, Distance (when location consented), Name`. `List` default; `Map` only if map provider works and pin geocodes. Show count and pagination/infinite scroll with keyboard accessibility; filter combinations and zero results must work. Public response contains NO medical identifiers or patient data.

**P03 — Clinic Profile:** top image gallery with restrained aspect ratio and verified badge, title, address, opening status based on real schedule, `Book` CTA (only after PH15 and when eligible), map/directions and contact action. **Overview**: clinic description, next slots/service highlights; **Dentists**: verified dentist list with clinic-specific affiliation, bookability and clinician profile route; **Services**: named services, estimated duration and published fees (unknown price labeled); **Reviews** added PH17: verified-visit average, review count, recent actual reviews, report; **About**: license/credential indicator, policies, hours, accessibility/contact notes. Shareable slug canonical; clinic unpublished/suspended gives informative unavailable page and safe search return. Clinical details never appear in listing.

**P04 — Dentist Profile:** portrait, professional name and affiliation, review source if available, verified qualification fields only, specialty text, supported languages, clinic location, real fees if published; `About`, `Services`, `Availability` meaningful sections. `Book appointment` opens P10 with dentist/clinic preselected; if no public slots show `No online slots` with clinic contact if authorized; never invent available time or claim unverified expertise.

**P05 — Sign In:** email* and password* (MVP), `Forgot password`, create account, verification/recovery, stay signed in only with secure token handling. If patient arrived mid-booking, after verified sign-in return to previously chosen dentist/service/date context and **revalidate availability**. Generic account-not-found/wrong-credential responses; rate limiting; no patient existence leak.

**P06 — Create Account:** full name*, email*, password* strong policy, language preference, acknowledgement of published privacy/terms; email verification mandatory before first confirmed booking. Optional phone stored only after consent/verification pathway is available. Screen explicitly states account and booking are free. Consent defaults off where necessary; child cannot register as adult guardian. Duplicate email receives safe recovery route.

**P07 — My Account:** header photo/avatar initials, verified identity status and edit profile action; links with clear descriptions `Appointments, Family Members, Shared Records, Saved, Preferences, Help`; no sensitive content on home drawer. Edit form `preferred name, contact channels, selected city, optional avatar`, with identity-change verification when appropriate. Guest reaching protected account sees sign-in explanation and post-auth return. On phone sub-navigation is a drill-down, not nested miniature tabs.

**P08 — Family Members:** `My dependents` list with member name, relationship, birth date or age and authorization badge. Add/edit form `name*, relationship* (child/other authorized), birth date/age*, guardian authorization statement*, contact optional`; upload/proof requirements only if local legal policy mandates. For adult dependents require independently verified authorization; no bypass through relationship dropdown. Remove/deauthorize warns that historical clinic records remain at the clinic under retention policy; past booking audit stays. Selecting a dependent in P10 always rechecks booking authority.

**P09 — Preferences:** `Language` Dari/Pashto/English, `Calendar` Solar Hijri/Gregorian, `Notifications` event/channel toggles with permission state, `Privacy` clinical record-sharing grants/link management, `Account & Security` session/logout/password reset and data-access request path. Save immediately with concise success and persistence; notification refusal is never interpreted as cancellation of a valid appointment. Display mixed-direction phone, email and dates without reordering characters.

**P10 — Book Appointment:** five-step full-width mobile flow with top progress `Service → Date & Time → Patient → Review → Result`; back preserves selections but never trusts old slot as reserved. **Step 1**: clinic, dentist, available services (fee/duration where provided); if a service permits multiple dentists, clarify choice. **Step 2**: day picker and actual 15/30-minute slots as calculated by clinic service/dentist/chair rules; selected date in preferred calendar with unambiguous Gregorian reference if needed; disabled closed/full days; server-issued short-lived hold only if policy supports it. **Step 3**: self or authorized dependent; minimal contact; booking note only non-sensitive (`reason category`, not raw medical history). **Step 4**: summary of provider, location, time, service, fee estimate if provided, cancellation policy, approval mode, consent checkbox; `Request appointment` or `Confirm booking` depending on clinic. **Step 5**: status `Requested` or `Confirmed`, reference ID, next steps, reminder expectations. Server transaction must prevent the same dentist/chair being booked twice. If slot lost, show `That time was just booked` and reload real options; retries with same idempotency token never create duplicates. No mandatory prepayment.

**P11 — My Appointments:** nested tabs **Upcoming** (Requested/Confirmed and in-progress with explicit status), **Past** (Completed/No-show), **Cancelled**; cards with dentist, clinic, date/time, service label, booking state, `View`/`Directions` and permitted cancel/reschedule. Date ascending for upcoming, descending past; personalized empty call to `Find a dentist`; loading skeleton displays no PHI leakage. An expired request is displayed as no longer active, not silently deleted.

**P12 — Appointment Detail:** booking reference, status timeline, clinic contact/directions, assigned dentist, service, actual date/time with timezone, fee estimate (not final bill), policy, reminders; `Reschedule` opens current actual slots and atomically moves appointment; `Cancel` requires confirm/reason optional and displays any cutoff/no-show policy. If appointment changed by clinic, patient sees changed details and notification status. `View released receipt` only for correctly linked record. Detail accessible exclusively to booking patient/authorized guardian and participating clinic staff.

**P13 — Saved:** **Dentists** and **Clinics** subtabs display authenticated user's favorites, with city, actual availability if present and remove/save action. Heart can be toggled from P02–P04; guest pressing Save redirects to login and replays intended save after sign-in. Empty state `Save dentists to find them later`; not a second search page. Unique `(user_id, target_type, target_id)` prevents duplicate saves.

**P14 — Shared Records:** **Treatment Summaries** cards containing clinic, clinician, service description, released date, next follow-up, PDF if explicitly released; **Receipts** table with clinic, invoice date, paid amount, outstanding shown only if clinic released; **Linked Clinics & Access** shows verified links and revocation/authorization explanation. `Request link` requires proof of clinic patient identity and clinic approval/verification; no automatic match on name/phone alone. Denied link requests have privacy-safe messages. Clinical draft notes, hidden attachments and records from other clinics are never visible.

**P15 — Write Review:** only available from a qualifying completed appointment to a linked clinic; 1–5 star rating* and optional text (10–1000 if supplied), no medical specifics required, content reminder `Do not share private health details`; submission pending moderation, one eligible review per completed visit under policy, editable via audited update/moderation pathway. Reviews show verified booking indicator, publication date, and clearly disclosed moderation standards. Clinic cannot remove legitimate criticism simply by disagreeing; report abuse routes to A09.

**P16 — Help:** published FAQ categories `Booking, Clinic profiles, Payments to clinic, Privacy, Account`, search FAQ and `Contact Support`; submit form `topic*, booking reference optional, email*, message* (max 3000), consent to share limited information` returns ticket ID and status. Never request diagnoses in support fields. Unconfigured email displays an alternative contact or in-app ticket, not fake `Message sent`.

**P17 — Legal & Privacy:** versioned, real organization identity/contact, data categories/uses, clinic vs platform responsibilities, clinical-access rules, retention and exports, use of SMS/push/cookies, account rights, complaint channel, terms of booking and subscription. No claims of legal compliance without review. Links visible from signup, footer, settings. Human-reviewed translated Dari/Pashto/English versions. Changes to material consent prompt acknowledgement where required.

### 5.8 Platform administration — each page and stateful subtab (A01–A14)

**A01 — Overview:** `Pending clinic verification`, `Dentist reviews`, `Active/Trial/Grace subscriptions`, `Recent reports`, `Support unresolved` **only when those modules exist**; tiles link to exact filtered list and display true query counts. Header shows active environment and role badge. No clinical diagnosis or patient content in admin metrics.

**A02 — Clinics:** status tabs **Pending** (default), **Approved**, **Suspended**, **Rejected**, each with appropriate zero state, sort by submission/update, search name/city/license reference (never patient); row `clinic, city, plan, requested date, verification, listing state`. Actions Review (A03), suspend with reason, reinstate after checks; pagination, audit. `Needs info` is a filter/status within Pending.

**A03 — Clinic Verification Detail:** info sections business identity, owner email/verified contact, redacted administrative document preview, subscription state, verification timeline. Decision panel `Approve, Request Information, Reject, Suspend` each with required reason except approval, reauthentication for high-impact actions. Approval enables eligibility but does not automatically publish incomplete/dentist-unverified listing. Owner notified of outcome. Private clinical patient records never displayed.

**A04 — Dentists:** tabs **Pending**, **Verified**, **Rejected** with clinic affiliation, credential type, submitted date, last decision; filters specialty, city, evidence status. Approve only after review of credentials and clinic affiliation; reject/request changes with audit and applicant notice. Verified listing is per verified identity AND valid current affiliation; revoked license disables badge promptly.

**A05 — Dentist Verification Detail:** professional identity fields, submitted credential attachments in secure admin-only review pane, clinic association, evidence validity dates, decision log; review form `Decision*, reason*, reviewer`, request replacement documents. Platform verifies declared evidence against approved policy; it does not invent external registry matches. Professional edits after approval require re-review when material.

**A06 — Subscriptions:** tabs **Trialing, Active, Grace/Expired, Cancelled**, table `clinic, plan version, started, renewal, amount, method, status, reconciled by`; filters period/plan; manual activate/record paid extension only with authorized evidence and reason. Provider webhook integration later must be verified/idempotent. No subscription operations create patient invoices.

**A07 — Plan Catalog:** list `plan key, public label, billing period, price AFN, staff limit, branch limit, enabled modules, effective date, active?`; new/edit versioned plan form with positive prices/limits and `unlimited` where deliberate; previews for clinic onboarding. Existing subscriber price/entitlements stay on their agreed version until scheduled migration with notice. Deactivation hides from new sales, not existing subscriptions.

**A08 — Marketplace Listings:** tabs **Pending Revisions, Published, Reported/Hidden**. List `clinic, city, verified?, fields changed, submission date`; side-by-side approved vs proposed public text/photos; approve/publish or reject with reason; emergency unpublish with audit. If revision rejected, prior approved listing stays published unless safety suspension. Reject malicious content, false medical claims or unlicensed dentist assertions under documented criteria.

**A09 — Reviews:** **Pending** shows rating/text and proof of completed booking without revealing treatment; **Published** shows moderation history; **Flagged** shows reason/evidence; **Removed** shows reason/appeal. Approve/reject/removal requires policy reason, author notifications; retain moderated content in restricted audit; clinics can respond/report under policy but never edit patient text. No fake rating seed data in public.

**A10 — Support Queue:** **Open / In Progress / Resolved**, filtered by topic, age, assigned staff and SLA; row `ticket reference, requester role, category, opened, status, assignee`; `Assign`, `Open`. Tickets may include limited booking reference but must not automatically retrieve clinical notes.

**A11 — Support Detail:** timeline of requester messages, response composer, internal notes separated from requester-visible replies, status/assignee, redacted booking/clinic metadata and escalation action. Attachments private by role; sensitive clinical-data requests routed to a formal authorized data-access process, not copied into support chat. Duplicate-send prevention and visible message delivery state.

**A12 — Analytics:** **Clinics** (signup/approved/active), **Bookings** (requests/confirmed/completed by date), **Subscriptions** (MRR, churn, trial conversions with precise definitions), **Patient Funnel** (anonymous/aggregated search→profile→book). Role-restricted, redacted small-cell counts if reidentification risk, query time range; no patient conditions, clinical IDs or medical-text exports.

**A13 — Security & Audit:** **Audit Events** searchable by date, actor, action and tenant ID; **Incidents** queue with severity/owner/status, **Access Reviews** privileged-user attestations. Admin cannot edit/delete audit entries. Break-glass access (only if business ever approves) requires justified temporary scope, MFA, independent review and patient/clinic notices as appropriate; **MVP default has no break-glass clinical access**.

**A14 — Platform Settings:** **Verification** rules/document types, **Taxonomy** specialties/service categories/localized labels, **Notifications** approved message templates/provider health, **Localization** locale/date/currency defaults, **Operations** feature flags with audit. Changes validate required fields, preview impacts, and provide rollback; no globally dangerous changes without second approval where warranted.

## 6. Feature catalog, cross-role journeys, and business rules

### 6.1 Stable feature IDs and acceptance ownership

| Feature ID | Feature / exact scope | Primary roles | Owned by phase | Business-rule cluster | Key route IDs |
|---|---|---|---|---|---|
| F01 | Auth, sessions, localization, secure app shells | All | PH01 | BR-ID, BR-L10N | Shared, P17 |
| F02 | Tenant setup, trials, subscription plans, clinic approval | CO,SA,F* | PH02 | BR-SUB, BR-VER | C01,C02,C30,C33,A01–A03,A06–A07 |
| F03 | Staff memberships, clinic permissions, dentist identity | CO,CM,D/R/AS/F | PH03 | BR-ROLE | C24,C25,C34 |
| F04 | Service catalog, chair resources, working hours | CO,CM,R | PH04 | BR-SLOT | C26,C27,C31 |
| F05 | Clinic patient directory, intake, safe import | R,CM,D | PH05 | BR-PAT | C06–C09 |
| F06 | Internal appointments, queue, walk-ins | R,D,AS,CM | PH06 | BR-APT | C03–C05,C37 |
| F07 | Encounter draft/sign/amend, history, clinical files | D,AS | PH07 | BR-CLIN | C10,C11,C15,C17 |
| F08 | Dental charting with history | D,AS | PH08 | BR-CHART | C12 |
| F09 | Treatment proposal, stages, consent/revisions | D,P/G (release later) | PH09 | BR-TRT | C13,C14 |
| F10 | Clinic invoices, ledger, balances, receipts | F,R*,CO | PH10 | BR-FIN | C16,C18–C22 |
| F11 | Clinic expenses and net cash view | F,CO | PH11 | BR-FIN | C23 |
| F12 | Verified dentist/clinic public profile & revision | CO,SA,D | PH12 | BR-VER,PUB | C28,A04–A05,A08 |
| F13 | Public discovery and search web | Guest,P | PH13 | BR-PUB | P01–P04 |
| F14 | Patient account, guardians/dependents and preferences | P/G | PH14 | BR-LINK | P05–P09 |
| F15 | Patient web booking, record-link requests, reminders | P/G,R,D | PH15 | BR-APT,LINK | P10–P12,P14,C36,C32 |
| F16 | Patient native application parity and saves | P/G | PH16 | BR-FAV | P01–P14 (native),P13 |
| F17 | Post-visit reviews and moderation | P/G,SA | PH17 | BR-REV | P15,A09,P03 reviews |
| F18 | Reporting, platform support/analytics/operations | CO,F,SA,SUP | PH18 | BR-RPT,OPS | C29,P16,A10–A14 |
| F19 | Data portability, production controls and pilot gates | CO,SA | PH19 | BR-DATA,OPS | C35, existing routes |

### 6.2 Core journeys (explicit cross-role result and recovery)

**J01 — Owner launches clinic:** CO signs up `/clinic/signup` → email verified → `C01` organization draft → choose/activate trial or manually verified subscription → submit documentation → `A02/A03` admin reviews → CO sees `Pending/Needs info/Approved` in `C02` → after PH03/04 owner completes dentist/chair/services/hours → after PH12 dentist verified and owner publishes C28 → P03 publicly visible. **Failure:** invalid documents return to same draft with visible reviewer reason; paid subscription alone never equals professional verification. **Privacy:** clinic records remain undiscoverable to other tenants.

**J02 — Invite and scope staff:** CO `C24` → invite role/clinic → recipient verifies → accepts clinic membership → lands on role-specific destination → attempts direct unauthorized route/API operation → server 403 and logged access-denied event. **Failure:** expired invite can be resent; revoked invite cannot be accepted. **Cross-role:** owner sees accepted status; recipient sees assigned permissions, never broader tenant data.

**J03 — Register and schedule walk-in:** R `C06/C07` adds demographic record → `C03` chooses empty slot → C04 picks service/dentist/chair → server transaction reserves resources → C05 booking Confirmed → `C37` check-in → D sees C17 today's case. **Failure:** race with other receptionist yields typed conflict with updated slots and no partial booking; duplicate save idempotent.

**J04 — Perform, chart and close treatment:** D sees assigned patient from C17 → enters C11 draft, records findings → selects tooth C12, adds observation tied to encounter → C13 makes treatment plan and captures patient consent C14 → D signs encounter C11 → authorized billing user creates invoice from performed procedures C19 → F posts payment C20 → patient-facing summary released only by explicit authorized action. **Failure:** attempted post-sign edit creates amendment, not overwrite; missing consent blocks a consent-required stage, not all nonclinical navigation.

**J05 — Partial payment:** F opens C16 → C19 issues invoice of 6,000 AFN → C20 posts 2,000 AFN cash, then 1,500 AFN transfer with references → C22 shows balance 2,500 AFN → receipt released if authorized → P14 sees only released receipt after verified clinic record link. **Failure:** same request retried with identical idempotency key does not post twice; reversal appends adjustment and recalculates balance.

**J06 — Patient discovers and books:** Guest P01 searches verified clinics → P02 filters city/date → P03/P04 reads actual provider details → P10 selects service/date/slot → P05/P06 logs in and returns to revalidated selection → chooses self/dependent P08 → confirms booking (Requested if manual approval; Confirmed if automatic) → C36 clinic accepts if needed → C03 calendar and P11/P12 reflect same record. **Failure:** concurrent booking transaction rejects stale slot with alternatives; if notification fails, appointment still succeeds and UI shows true booking status.

**J07 — Reschedule/cancel:** P12 requests new slot within cancellation policy → backend rechecks provider/chair and atomically swaps time → C05 and P12 show new time, old slot released → clinic alerted. **Failure:** time conflict leaves original confirmed booking intact. Cancellation after cutoff gives explicit policy and clinic-contact path, not a silent exception.

**J08 — Guardian booking:** P07→P08 creates dependent with required verified authorization → P10 selects dependent → booking, receipt and approved records shown only to guardian with current authorization → revocation prevents future access, existing clinic clinical records retained. **Failure:** unauthorized adult link blocked even when name/DOB match.

**J09 — Verified review:** P11 has eligible Completed visit → P15 creates review → A09 pending moderation → publish → P03 displays count and rating → clinic can report abuse, not rewrite review. **Failure:** No-show/request-only booking is not eligible; second review for same visit follows edit policy, not a second fabricated rating.

**J10 — Expiration/recovery:** clinic trial ends → grace state, renewal notification → owner C33 can renew and obtain authorized export; staff see factual access explanation → records remain intact → upon verified renewal operations resume. **Failure:** payment callback alone cannot mark invoice paid; duplicate webhook ignored; failed renewal cannot delete clinical chart.

**J11 — Data request/exit:** authorized CO requests C35 export with reason/reauthentication → export job builds tenant-scoped package → reviewer approves if required → private expiring download → audit log records delivery. **Failure:** request spanning other tenants or wrong role denied before job starts; expired link requires new authorization.

**J12 — Content change with safe publication:** CO edits public license/location details in C28 → versioned pending revision A08 → prior approved profile stays visible unless suspended → admin approves and publishes new version with audit; rejected revision shows reason and preserves old live version. **Failure:** unverified dentist cannot display verified badge and cannot publish bookable slots as verified.

### 6.3 State machines and guarded transitions

| Entity | Legal states/transitions | Forbidden actions / side effects |
|---|---|---|
| Clinic verification | `Draft → Submitted → Pending → Approved`; `Pending → NeedsInfo → Pending`; `Pending → Rejected`; `Approved → Suspended → Pending/Approved` after review | Rejected/unsent may not publish; suspension hides booking availability but does **not** delete appointments/clinical data |
| Dentist verification | `Draft → Pending → Verified` or `Pending → NeedsInfo/Rejected`; `Verified → Revoked/Suspended` | Badge visible only while verified; revoked doctor removed from public bookability pending replacement |
| Public listing version | `Draft → InReview → Published/Rejected`; `Published → InReview(new version) → Published(new version)` | Rejection retains previously published approved version; emergency hide separately audited |
| Subscription | `Trialing → Active/Grace → Expired`; `Active → Grace/Cancelled`; `Expired → Active` upon verified renewal | No data deletion, no spurious paid status; account continuity paths available |
| Appointment | `Requested → Confirmed/Rejected/Expired/Cancelled`; `Confirmed → CheckedIn/Cancelled/NoShow`; `CheckedIn → InTreatment/Cancelled(with reason)`; `InTreatment → Completed`; `Completed` terminal for clinical activity | Never simultaneously reserve same required resource; edits create history; no completing from Requested |
| Clinical encounter | `Draft → Signed`; `Signed → Amended` (additional signed version, prior preserved) | No delete or rewrite of signed author/time; assistant cannot sign |
| Tooth observation | `Draft → Recorded` with attributed immutable history; later observations create additional records | Current state derived from latest authorized observation; no overwriting prior condition |
| Treatment plan | `Draft → Proposed → Accepted → InProgress → Completed`; `Proposed/Accepted/InProgress → Discontinued` with reason; amendment creates version/reapproval | No post-accept silent price/clinical change; completion not evidence of payment |
| Invoice | `Draft → Issued → PartiallyPaid → Paid`; `Issued → Void` only by policy; `Paid → Adjusted` via credit/reversal path | Never manually set paid; transaction ledger computes balance; no silent edit of posted financial history |
| Payment | `PendingManualVerification → Posted` or `Rejected`; `Posted → Reversed` by compensating entry | No deletion; idempotent posting; cannot post negative non-reversal |
| Clinic record link | `Unlinked → PendingProof → Linked/Denied`; `Linked → Revoked` | Name or phone match alone cannot grant record access |
| Review | `Draft → Pending → Published/Rejected`; `Published → Flagged → Published/Removed` | No publication without qualifying completed visit and moderation policy |
| Export | `Requested → Authorized → Queued → Processing → Ready/Failed → Expired` | Access must be checked again at download; no cross-tenant export |

**For every status change** store `actor_id`, `tenant_id` (when relevant), `from`, `to`, server timestamp, reason/evidence reference if required, request ID, and a linked audit event. Notifications originate from a committed domain event via outbox, not before the business transaction succeeds.

### 6.4 Numbered business rules (implementation test anchors)

**Identity, roles, tenancy**

- **BR-ID-01:** Unverified login identity cannot create a confirmed patient booking or activate an active clinic staff membership. All auth errors avoid leaking whether a named patient or clinic exists.
- **BR-ID-02:** Each request derives tenant scope from authenticated membership, not a client-provided `clinic_id` that can be changed at will.
- **BR-ROLE-01:** Server-side RBAC + resource ownership checks apply to routes, APIs, file previews, exports and background tasks; client visibility is not authorization.
- **BR-ROLE-02:** Staff account can belong to multiple clinics, but context change invalidates previous tenant's cached protected data.
- **BR-ROLE-03:** Only owner or a suitably delegated manager may assign roles; managers cannot confer owner or higher privileges than their own grant.
- **BR-ROLE-04:** Revocation/suspension invalidates relevant sessions within the configured immediate enforcement window and logs actor/reason.

**Clinic/subscriptions/verification**

- **BR-SUB-01:** Subscription status and verification status are independent; paying does not make a professional credential verified.
- **BR-SUB-02:** Plan entitlements and limits are read from versioned server config and checked at writes as well as in menus.
- **BR-SUB-03:** Renewal/manual payment status requires authorized confirmation or verified payment-provider callback; browser redirect alone insufficient.
- **BR-SUB-04:** Expiry never deletes patient records; owner maintains controlled renewal/export/legal continuity access.
- **BR-SUB-05:** Annual/monthly transitions and trial conversions must show effective date, total amount, and entitlement impact before confirmation.
- **BR-VER-01:** A public verified badge requires a current reviewed clinic/dentist credential and valid affiliation; maintain reviewer/evidence and revocation audit.
- **BR-VER-02:** Published public text/photos are versioned; proposed material edit does not automatically replace an approved live version.

**Patient records and sharing**

- **BR-PAT-01:** Clinic patient ID is unique within tenant and generated on server; patient may exist in multiple clinics with no implicit clinical sharing.
- **BR-PAT-02:** Demographic merge requires deliberate authorized action and audit; duplicate candidates are suggestions, never automated destructive merges.
- **BR-PAT-03:** Medical alerts show only to clinical roles or specifically authorized personnel; notes and attachments are private by default.
- **BR-LINK-01:** Patient account linking requires verified control and clinic-side identity proof/authorization; matching names, phones or dates is insufficient.
- **BR-LINK-02:** Guardian relationship must be independently authorized under applicable policy, especially for adult dependents; revocation closes future access.
- **BR-LINK-03:** Patient visibility defaults to no clinical data; only explicitly released summaries and receipts are exposed from the corresponding clinic and scope.

**Scheduling/booking**

- **BR-SLOT-01:** Eligibility = clinic operating hours ∩ dentist working schedule ∩ compatible chair/room availability ∩ eligible service duration/buffer − closures/leave/existing blocking appointments.
- **BR-SLOT-02:** Exclusion constraints or equivalent transactional locking prevent overlapping required resource reservations, even under simultaneous API requests; do not rely on client checks alone.
- **BR-SLOT-03:** Booking success and status changes are idempotent on user action key; patient retries, double-taps and delayed network requests cannot duplicate appointment.
- **BR-APT-01:** Staff calendar and patient booking use identical appointment records. `Requested` may use temporary holds only under a documented TTL/policy; expired holds release atomically.
- **BR-APT-02:** Cancel/reschedule must follow policy, retain original event in audit, notify affected users asynchronously and preserve old booking if replacement fails.
- **BR-APT-03:** Service estimates are labeled estimates; only posted clinic invoices define amounts due.
- **BR-APT-04:** Walk-in and phone appointments require no DandanLink patient account; the clinic may later invite secure linking.
- **BR-APT-05:** No-show, completed, rejected and cancelled statuses affect public availability and analytics according to explicit definitions, never hidden by deletion.

**Clinical**

- **BR-CLIN-01:** Only a qualified authorized clinician signs a visit; signed notes persist author, timestamp, version and any amendments.
- **BR-CLIN-02:** Each tooth observation identifies numbering convention, specific tooth, date, clinician/encounter context and historical state; do not overwrite earlier findings.
- **BR-CLIN-03:** Clinical procedures cannot be inferred from scheduled service alone; mark performed by clinician before charge-ready entry is created.
- **BR-TRT-01:** Treatment quote totals use price snapshots and current clinician-authorized proposal version; after acceptance, substantive changes require new version and consent as applicable.
- **BR-TRT-02:** Plan/stage completion does not mark an invoice paid and invoice payment does not mark care complete.

**Finance**

- **BR-FIN-01:** Store currency amounts in AFN minor units/decimal with safe precision; financial calculations never use binary floating point as authoritative ledger.
- **BR-FIN-02:** Ledger entries are append-only after posting; reversal/credit entries have reference and actor/reason. Payment and reversal operations are transactionally consistent with invoice balance.
- **BR-FIN-03:** Outstanding balance = issued nonvoid charge lines − valid posted payments − applicable authorized credits + valid reversals/adjustments. Verify zero/partial/overpaid cases explicitly.
- **BR-FIN-04:** Clinic invoice and platform subscription invoice reside in separate domains; aggregations are never combined as one revenue KPI.
- **BR-FIN-05:** Receipts and financial exports are role-authorized and patient-shared only after verified clinic record link + release policy.

**Marketplace, reviews, notifications and privacy**

- **BR-PUB-01:** Search indexes only approved public clinic/dentist profile fields; no medical condition, patient, diagnosis or clinical attachment text.
- **BR-PUB-02:** Public 'next available' times come from current eligible availability; no generated/invented appointment times.
- **BR-REV-01:** Only completed eligible booked visits produce verified reviews. A single visit cannot inflate rating through repeated submissions.
- **BR-REV-02:** Moderation follows published policy; no arbitrary removal of a negative review solely due to rating.
- **BR-NOT-01:** Notification errors never roll back a committed booking, finance post or signed note; background retry and delivery status are independent.
- **BR-NOT-02:** Sensitive clinical information is excluded from unsecured SMS/push notification payloads; channel and consent configuration observed.
- **BR-DATA-01:** Tenant data export requires current authorization and re-auth for downloads; jobs/logs cannot surface other clinics' data.
- **BR-DATA-02:** Retention/deletion policies must be clinically and legally approved before real patient data; subscription expiry is not automatic retention expiry.
- **BR-OPS-01:** Every sensitive modification has traceable actor, time and original state; no PHI in third-party telemetry/error logs.
- **BR-L10N-01:** Date display supports Solar Hijri/Gregorian and UI language independently, stored timestamps are unambiguous (UTC + IANA zone), and RTL never scrambles identifiers.

## 7. Practical UI/UX system, responsive behavior, localization and accessibility

### 7.1 Design direction

**Design system name:** DandanLink Care UI. **Tone:** calm, professional, legible medical software with no excessive glass effects or competing gradients. Clinic interface favors efficient data scanning and task completion; patient interface favors warm, approachable discovery and one clear primary action. Use icons only with labels in primary nav. No decorative metrics or irrelevant illustrations in workspaces. Clinical risk alerts are visually distinguishable and not color-only.

**Representative clinic desktop composition:** 72px header, 248px collapsible sidebar, 24px page gutters, 32px top heading, role-relevant toolbar, 3–4 summary cards, full-width appointment calendar or patient table with row actions and right details drawer. Signed-note state always visible. Patient-detail header carries patient identifier and allergy alerts (only to clinical roles). Page density: comfortable, information-rich, not enormous blank card margins.

**Representative patient phone composition:** 56px header with city and locale, search bar then specialty chips, verified provider cards with compact metadata and bookable date, safe bottom bar above OS gesture area. Clinic detail hero/photo stays ≤35% of screen; service/availability visible without excessive scrolling. Booking flow shows sticky cost/policy summary and one primary CTA; confirmations have clear status text, not only green icon.

### 7.2 Versioned visual tokens (initial proposal; verify with user testing)

| Category | Token | Value / use |
|---|---|---|
| Brand | `color.brand.600` | `#0E7490` teal-blue, primary actions and links |
| Brand hover | `color.brand.700` | `#155E75` |
| Brand subtle | `color.brand.50` | `#ECFEFF` highlights/selected tab background |
| Background | `color.canvas` | `#F7FAFC` clinic work area |
| Surface | `color.surface` | `#FFFFFF` cards/forms/dialogs |
| Text primary | `color.text` | `#102A43` main reading |
| Text muted | `color.muted` | `#526578` metadata/helper |
| Border | `color.border` | `#D6E1E8` dividers/inputs |
| Success | `color.success` | `#15803D` and textual label (confirmed/paid) |
| Warning | `color.warning` | `#B45309` and explicit pending/overdue copy |
| Error | `color.error` | `#B91C1C` error/destructive/critical warnings |
| Information | `color.info` | `#0369A1` neutral informative state |
| Spacing scale | `space` | 4, 8, 12, 16, 20, 24, 32, 40, 48px |
| Radius | `radius.sm/md/lg` | 6/10/14px; pills only for chips/status |
| Elevation | `shadow.card` | minimal soft shadow; prefer 1px border for data panels |
| Type | `font.body` | readable licensed/system Sans with strong Dari/Pashto glyph support; font selected after test |
| Type sizes | `text.caption/body/label/section/page` | 12/14–16/14/20/28px desktop; patient body ≥16px |
| Touch targets | `touch.min` | 44×44 CSS pixels minimum where feasible |
| Focus | `focus.ring` | 2px clearly contrasting outline + offset |
| Motion | `duration.fast/normal` | 120/200ms, disabled when reduced motion |
| Container | `width.content.max` | 1440px clinic; 1200px public site |

**Color and state semantics:** pending/needs review = amber label + icon; confirmed/active = green; cancelled/rejected = neutral or red with label depending severity; in-progress = blue. Dental surfaces/tooth conditions have an explicit legend and noncolor glyphs/patterns. Avoid using red for ordinary calendar holidays. Badge text never relies on hue alone.

**Typography and rhythm:** page heading 28px semibold, section 20px, card header 16px, table/body 14–16px, helper text ≥12px; vertical rhythm 8/16/24px; input height 44px, textarea auto-grow where helpful. Clinical notes use readable 16px editing text. Table header has clear contrast and sticky only when it does not obscure keyboard focus.

### 7.3 Shared component specifications

| Component | Behavior and states |
|---|---|
| Primary button | One main CTA per task context, disabled with explicit reason, spinner on active submit, keyboard Enter/Space |
| Secondary/destructive action | Neutral style until destructive confirmation; reason required for high-risk mutation, explicit consequences |
| Text/search input | Label, optional helper, placeholder example distinct from label, inline validation; preserve typed text on failure |
| Select and autocomplete | Real searchable options with keyboard operation; dependent options clear invalid previous selection |
| Date/time picker | Locale-specific month/day display, actual IANA timezone, hidden but accessible Gregorian ISO reference, unavailable dates disabled |
| Tabs | Default identified, active underline/filled subtle background, ARIA semantics, independent URLs/history, focus states |
| Table/pagination | Sort/filter/paging only if server works; loading area spinner/skeleton not duplicated in clicked page button |
| Patient/provider card | Photo placeholder, unambiguous heading, metadata and one primary CTA; clipped text has accessible full tooltip |
| Modal / bottom sheet | Focus trap, close/cancel, scrollable content, respects viewport/safe areas, dirty state confirmation |
| Toast/status | Brief action feedback supplemented by persistent status in context; errors offer retry or remedy |
| Skeleton | Matches final content geometry; no flashing giant placeholder or unbounded loading |
| Empty state | Explains why zero records, suggests only a valid next step; filtered-empty offers reset |
| Network failure | `Retry`, preserve safe form state, never claim booking/payment success without committed server response |
| Protected attachment | Authorized preview with expiry, no persistent public object URL, download audit where required |

### 7.4 Localization and bidirectional implementation requirements

- **Languages:** Dari default and Pashto true RTL; English true LTR. Translation files cover all navigation, errors, validation, placeholders, email/push templates, printable receipts, legal/privacy copy and accessibility labels, not only header text.
- **Layout:** logical CSS spacing properties and mirrored directional icons; keep dentistry chart's anatomical right/left **anchored to patient anatomy** rather than naively flipping the tooth order under RTL. Numeric FDI tooth IDs, money, emails and phone numbers use isolated LTR spans where necessary.
- **Calendars:** Solar Hijri with Afghan month names and Gregorian display switch; backend stores UTC instants and IANA zone. Week begins Saturday in Afghan locale, configurable in user preference. A picker must not silently offset selected date after locale switch.
- **Currency:** default AFN with explicit minor unit and locale display; no currency conversion in MVP. Users can change display date/calendar independently of clinical record timestamp.
- **Addresses:** freeform descriptive address plus province/city/district; maps optional/consent-based. Phone validation supports `+93...` and properly normalized national formats.
- **Persistence:** language/calendar preferences retained across sessions; guest preferences persist locally without storing PHI. Transition between RTL/LTR updates sidebar, drawer, tabs, breadcrumbs, focus order and text alignment.
- **Translation QA:** bilingual native speaker review, especially clinical terms, consent, numeric fields and plurals; no machine-translated medical claims published without review.

### 7.5 Accessibility and performance targets (pilot acceptance)

- **Accessibility goal:** work toward WCAG 2.2 AA for web; keyboard-accessible menus/calendars/dialogs, visible focus, labels, error announcements, alt text, logical headings, 200% zoom and reduced motion. Test actual Dari/Pashto fonts and screen-reader pronunciations.
- **Mobile responsiveness:** support 320–430px viewport, split keyboard-safe booking forms, no clipped calendar, 44px touch targets and native safe areas.
- **Performance target:** on a realistic slow mobile connection, meaningful booking or schedule feedback without a blank screen; establish quantitative Core Web Vitals and API p95 baselines during PH19 pilot rather than unmeasured claims. Explicit initial engineering targets: API p95 ≤500ms for typical simple reads in controlled staging, excluding third-party provider latency; no >2s unresponsive click without loading feedback; page images compressed and lazily loaded.
- **Offline:** informative banner, local draft **only in safe memory** for clinical editing, retry/reconnect; no automatic unsynced clinical mutations or offline confirmed appointments in MVP.

## 8. Conceptual data, API, integrations, and nonfunctional requirements

### 8.1 Architecture recommendation

**Suggested implementation:** pnpm/TypeScript monorepo. `apps/clinic-web` (Next.js), `apps/patient-web` (Next.js, SEO public profiles), `apps/patient-mobile` (Expo React Native), `apps/admin-web` (Next.js), `apps/api` (Node.js/TypeScript modular monolith, Fastify or Express), `packages/db` (Drizzle + PostgreSQL), `packages/contracts` (runtime validation and API types), `packages/ui-web`, `packages/design-tokens`, `packages/locales`, `packages/domain` (domain services with authorization tests). Use **one backend and one authoritative database** with restricted domain boundaries; no premature microservices.

**Hosting candidates:** Neon PostgreSQL for DB; reputable cloud deploy; S3-compatible private object store. Contracts and legal suitability must be verified before real patient data. Better Auth for verified user identity, separate from clinic role/record permissions. Use backend-created auth sessions appropriate to web/mobile and MFA for staff/admin. Background worker/outbox for notifications, file checks, subscription events; private file ACLs. Deploy dev/staging/production with separate credentials, secrets and storage.

### 8.2 Domain data model — entities, important fields and invariants

| Domain / entity | Significant fields | Ownership / index or constraint | History / relationship |
|---|---|---|---|
| `users`, `sessions`, `verification_tokens` | id, login email, verified state, MFA, language, calendar | global unique normalized email; password hash never exposed | sessions revoked on privilege changes |
| `clinics` | id, legal/public name, status, timezone, address, verification | tenant root; slug unique for published site | owner is membership, not global superuser |
| `clinic_memberships` | clinic_id, user_id, role, effective state, permissions | unique active `(clinic_id,user_id)`; check tenant every request | invitation/role grant audit |
| `staff_invitations` | email/phone, role, token_hash, expires_at | unique per pending invite target | accept/revoke events |
| `dentist_profiles`, `dentist_clinic_affiliations` | identity, specialties, credentials, credential status, clinic relation | verified identity separate from clinic affiliation | revocations and review evidence |
| `clinic_branches` | id, clinic_id, name, address | MVP one default site; multi-branch usage NEXT | all scheduling resources reference branch |
| `services`, `service_price_versions` | code, name/localization, duration, price_minor, bookable, chair required | unique active code per clinic; price snapshots | deactivation history, invoice snapshots |
| `chairs`, `operatory_rules` | clinic_id, branch_id, code, capabilities, active | unique clinic chair code | no deactivate with unresolved future occupancy |
| `working_hours`, `schedule_exceptions`, `dentist_shifts` | local weekday/minutes, timezone, date exception | reject overlapping incompatible rules | availability recompute audit |
| `clinic_patients` | clinic_id, internal_number, identity/contact, estimate_age_flag | unique `(clinic_id,internal_number)` | tenant isolated, duplicate suggestions |
| `medical_histories`, `allergy_entries` | patient, clinician, provenance, date, coded/free text | strictly clinic local, authorized clinical roles | dated revisions |
| `patient_account_links`, `guardianships` | clinic_patient_id, user_id, proof status, grants | verified ownership and scoped relation | revocation audit; never global auto-link |
| `appointments`, `appointment_resources` | clinic, provider, patient, service, start/end UTC, timezone, chair, status, origin, request_key | unique idempotency key; exclusion/transaction lock for overlaps | version, status history, previous times |
| `appointment_holds`, `booking_policies` | slot, expiry, policy version, approval mode | TTL and release transaction-safe | holds not confirmed bookings |
| `encounters`, `encounter_versions`, `clinical_notes` | patient, clinician, appointment, draft/signed, observations | signed immutable; only authorized clinician | version chain, amendment reason |
| `odontogram_observations` | clinic_patient, tooth_code, dentition, surface, state, clinician, visit, time | FDI values validated; no destructive overwrite | effective timeline |
| `treatment_plans`, `plan_versions`, `treatment_stages` | version, status, clinician, indication, stage order, estimates, consent reference | clinic ownership and clinician signatures | acceptance/revision history |
| `clinical_attachments` | object_key, MIME, size, hash, category, encounter, scanner status | private bucket, clinic ACL, no public direct URL | retention/legal hold |
| `consent_records`, `release_grants` | patient/guardian, scope, version, timestamp, method | one grant per purpose/version where applicable | withdrawal/revocation |
| `clinic_invoices`, `clinic_invoice_lines` | patient, invoice_no, currency, issued_at, due_at, item snapshot, status | unique `(clinic_id,invoice_no)` | issued doc revisions and credits |
| `clinic_payments`, `clinic_ledger_entries` | invoice_id, amount_minor, method, actor, idempotency key, reversal_ref | amount precision and unique post key | immutable posting, compensating entries |
| `clinic_expenses` | date, category, amount_minor, method, author | tenant scope and required reason for correction | correction/reversal trail |
| `subscription_plans`, `plan_versions` | tier, price_minor, interval, entitlements, effective dates | versioned, historic subscribers pinned | changes not retroactive |
| `clinic_subscriptions`, `platform_invoices`, `platform_payments` | clinic, trial/start/end, state, gateway/manual evidence | separated from clinic ledger | grace/renewal history |
| `public_listing_versions`, `listing_media` | clinic/dentist public fields, approval state, published pointer | only verified approved version indexed | pending revisions preserved |
| `patient_favorites` | user, target_type/id | unique `(user_id,target_type,target_id)` | delete-on-unsave with audit only if needed |
| `reviews`, `review_moderation` | appointment_id, rating, text, state, reviewer | one active eligible review per booked visit | edits/moderation events |
| `notifications`, `outbox_events` | recipient, channel, template_version, state, retry_at | dedupe event + recipient + channel | delivery failures separate from bookings |
| `audit_events`, `support_tickets`, `exports` | actor, tenant, action, target, timestamp, status, job metadata | append-only controlled access | restricted retention and redacted payload |

**Schema rules:** every clinic-owned table has a verified `clinic_id`; support foreign keys/indexes for `(clinic_id,created_at)`, `(clinic_id,status)`, patient name search and appointment date/provider/chair. No simple client-provided `clinic_id` bypass. Prefer database exclusion constraints for appointment time ranges per resource or equivalent tested serializable locking. PII/PHI separation extends to database views, backups, logs, object storage and search indexing. Prefer stable immutable IDs; use slugs only for public profile URLs, not for access control.

### 8.3 API contracts by domain (illustrative HTTP routes, **not** implemented code)

| Domain / example operation | Method/shape | Authorization | Validation / errors | Result/side effects |
|---|---|---|---|---|
| Identity | `POST /v1/auth/...`, session queries | authenticated verified identity | rate limit, safe invalid credentials | session; no role escalation |
| Clinic setup | `POST /v1/clinics`, `PATCH /v1/clinics/:id` | CO active member | duplicate business ID, invalid docs, optimistic version | clinic draft, audit |
| Membership | `POST /v1/clinics/:id/invitations` | CO/CM delegated | role ceiling, invalid contact, duplicate invite | invitation + outbox |
| Services/resources | `POST/PATCH /v1/clinics/:id/services|chairs|hours` | CO/CM | conflicts, invalid minutes, bound plan limits | versioned configuration |
| Patient | `GET/POST /v1/clinics/:id/patients`; `GET/PATCH /:patientId` | authorized clinic role | `404` concealed unauthorized lookup, `409` duplicate suggestion | clinic-only demographics |
| Import | `POST /v1/clinics/:id/patient-imports` | owner/delegated | bad file/schema, duplicates | job + per-row errors |
| Availability | `GET /v1/public/availability?clinic&dentist&service&date` | public approved records | invalid date, unverified listing | ONLY genuine bookable times |
| Appointment | `POST /v1/clinics/:id/appointments` | R/CM/D* | 409 slot conflict, 422 invalid policy, idempotency | atomic reservation, outbox |
| Patient booking | `POST /v1/me/bookings` | verified patient/guardian | 403 dependent authority, 409 slot taken | requested/confirmed booking |
| Appointment update | `POST /v1/appointments/:id/reschedule|cancel|check-in` | scoped clinic/patient | status transition, auth, conflict | prior booking preserved on failed swap |
| Clinical note | `POST /v1/clinics/:id/encounters`; `POST /:encounterId/sign|amend` | assigned clinician | author, required fields, signed immutability | append-only signed version |
| Chart | `POST/GET /v1/clinics/:id/patients/:id/odontogram` | clinician | tooth code, duplicate version, date | new observation, current view recalculated |
| Treatment | `POST /v1/.../plans`, `POST /:id/propose|accept|complete-stage` | clinician/authorized consent | version/consent/role guards | plan timeline/outbox |
| Invoice | `POST /v1/clinics/:id/invoices`, `POST /:id/issue` | clinic finance role | decimal, line items, duplicate no | issued snapshot |
| Payment | `POST /v1/.../invoices/:id/payments`; `POST /:paymentId/reverse` | authorized finance | 409 duplicate, 422 amount, reason | posted ledger and recalculated balance |
| Public marketplace | `GET /v1/public/clinics|dentists|search` | guest | bounded filters, no private fields | verified public projection only |
| Listing review | `POST /v1/clinics/:id/listing-revisions`; admin approve | CO / SA respectively | verified requirements, content policy | approved publish pointer and search index |
| Patient linking | `POST /v1/me/record-links` | verified patient/guardian | proof/clinic approval, non-guessable references | pending link; grants only after proof |
| Review | `POST /v1/me/reviews`; admin moderate | eligible patient / SA | completed visit + text policy | moderation workflow |
| Subscription | `GET /v1/clinics/:id/subscription`, admin `/plans` | CO/admin | versioned entitlements, verified payment | current plan state |
| Exports | `POST /v1/clinics/:id/exports`, `GET /:exportId/download` | re-auth authorized | rate limit, scope, expiry | private job/url + audit |
| Support | `POST /v1/support/tickets`, admin reply | requester/assigned support | no PHI, rate limit | ticket status, notification |

**Response conventions:** typed envelope with stable error code, localized UI message key, request/correlation ID; standardized pagination `items, next_cursor/page, total_count when economical`; `409` concurrency conflicts return retryable reason and fresh availability; `403` insufficient privileges; `401` auth expiration; `422` field validation; `429` rate limit. Avoid exposing whether a guessed patient ID exists across tenant boundaries. **All writes** validate backend-side and critical writes have transaction/idempotency tests.

### 8.4 External services and fallback policies

| Integration | MVP approach | Failure behavior / security |
|---|---|---|
| Authentication | Better Auth, verified email, privileged MFA | On provider failure, existing session and core UI error clearly; no bypass to clinical route |
| File storage | Private S3-compatible + secure preview | Failed upload shows retry; DB record not `ready` before storage + scan checks |
| Email | Transactional provider after setup | Queue retry; booking remains valid; do not claim sent if provider unconfigured |
| SMS | **Optional** only after vendor feasibility/cost check | Hide toggle or `Not available`; explicit consent; avoid PHI in message |
| Push | Expo push or operational equivalent | Token expiration cleanup; de-dup; fallback in-app notification |
| Maps | Validated provider / consent | Text address/directions remain usable, no blank uninteractive frame |
| Payments | MVP: cash/manual recorded entries; platform subscription admin reconciliation | Never post as verified digital payment without gateway event; potential later HesabPay integration [R7] |
| Monitoring | Structured sanitized telemetry and alerts | No patient diagnosis, email body, uploaded image or full URL with PHI in logs |
| Search | PostgreSQL indexed projection first | Public-only data; high-cardinality filters bounded and rate limited |

### 8.5 Security, privacy, data lifecycle and operational controls

**Threat model:** cross-clinic ID guessing, misassigned staff roles, stolen session, patient-account matching attack, public file URL leakage, duplicate charges, appointment races, rogue admin, fraudulent clinic/dentist badge, malicious uploaded documents, webhook forgery, SMS disclosure and export exfiltration. Every risk requires explicit tests.

**Required safeguards:** MFA for super admins and privileged clinic staff, server authorization in every domain service, database transaction boundaries and tenant-scoped queries, optional row-level security as defense-in-depth, encryption at rest/in transit, private object buckets, short-lived download authorization, signed versioned clinical notes, audit events with tamper-detection/retention, file scanning, secrets manager, least-privilege deployment roles, backup encryption, restore drill, retention and deletion schedule approved locally, incident/notification runbook, vulnerability patching, rate limiting and CSRF/CORS protections. Medical records should not be embedded in ordinary notification copy, public metadata, client crash traces or search indexes.

**Default targets for validation (not compliance certification):** daily encrypted DB backups plus point-in-time recovery where hosting supports it; define RPO target 24h maximum and RTO target 8h for pilot, then tighten based on real clinical operational needs and tested restoration. Monitoring for failed jobs, booking conflicts, payment ledger reconciliation mismatches, unusual access and database restore readiness. No production clinical data until data export, retention, security review and recovery tests pass PH19.

**Local legal caution:** public sources provide incomplete and changing evidence on Afghanistan health-data law. Obtain current local legal/clinical advice and document the real duties, required consent, clinical-record retention, clinician credential verification, data export and hosting jurisdiction before onboarding real records. Do not self-certify HIPAA or any international standard by merely using cloud hosting.

## 9. Implementation roadmap — complete vertical slices

**Release discipline:** A phase must build every required part of its own feature: schema/migration, server logic/validation, API, navigation, screens/subtabs/forms, authorized roles, UI states, localization/responsive behavior, audit/notifications where applicable, automated tests and demo data **only in nonproduction**. Infrastructure phases create honest functional shells, not fake feature buttons. Roadmap explicitly sequences clinic value before patient growth. A later enhancement may not excuse an unusable workflow in an earlier phase.

### 9.1 Dependency map

`PH01 Foundation → PH02 Tenant/Subscription → PH03 Staff → PH04 Services/Hours/Chairs → PH05 Patients → PH06 Internal Appointments → PH07 Encounters → PH08 Chart → PH09 Treatment → PH10 Billing → PH11 Expenses → PH12 Verified Listings → PH13 Public Search → PH14 Patient Identity/Family → PH15 Web Booking → PH16 Native Parity/Favorites → PH17 Reviews → PH18 Analytics/Support → PH19 Production Gate`.

**Safe parallelization:** PH05 (patients) can follow PH02 and basic PH03 authorization even while PH04 builds scheduling; PH12 credential-review UI can begin after PH02 and PH03; PH14 patient auth can start after PH01. No earlier phase should advertise work that depends on a missing one. Phase ordering can be adjusted only by updating the dependency/traceability matrix.

### PH01 — Identity, localization and real application shells

- **Outcome / users:** Clinic owner/staff and invited admin can authenticate; guest has functional public privacy/terms and informative marketing shell. `F01`; shared auth routes/P17; roles SA/CO; other user role destinations gated until released.
- **Data/API/dependencies:** user/session/verification models, password reset, MFA admin, auth rate limit, active locale; core API validation/errors, audit/outbox foundation, tenancy contract, test DB, three distinct web shells, no real clinic data or fake provider listings.
- **UI:** responsive polished site/login/signup, real RTL/LTR switching, language/calendar persistence, accessible input/error/empty/403/offline components, design tokens; clinic admin shells do **not** expose unavailable modules.
- **Acceptance `AC01`:** successful verified signup/login, bad credentials/expired link/duplicate email paths, unauthorized admin access denied, RTL direction and return paths consistent on phone/desktop; unit, auth integration, a11y smoke, route checks.
- **Explicitly NOT yet:** clinic profiles, subscriptions, patient records, scheduling. **Demo:** sign up owner → verify → sign in to honest get-started shell; invalid login → safe error. **Done:** runnable tested authenticated shell and design foundation, no dead nav.

### PH02 — Clinic creation, versioned subscription, manual verification

- **Outcome / users:** CO can register a clinic and choose a real configured plan/trial; SA can approve/reject/ask for info, view subscription states; owner sees actionable status in C02. `F02`, C01/C02/C30/C33/A01–A03/A06–A07/`/pricing`.
- **Data/API:** clinics/owners, plan/version/entitlements, trial/subscription/invoice/manual payment evidence, clinic verification case, audit/alerts; transaction tests for owner and plan state, independent verification vs payment. Depends PH01.
- **UI:** complete C01 organization+plan+verification review (operational setup deferred and hidden until PH03–PH04), status dashboard, real plan cards and admin verification/plan forms, mobile/RTL details. No inactive staff/chair/service steps yet (setup checklist explains later work).
- **Acceptance `AC02`:** create clinic, switch plan before activation, admin approves vs rejects with reason, owner sees correct result, second tenant sees nothing, trial expiration state is usable without deleting clinic; bad documents/plan limits/unauthorized admin rejected.
- **Explicitly NOT yet:** staff invitation, clinical records or public listing. **Demo:** owner registers pending clinic → admin reviews → owner sees Approved and current trial. **Done:** accurate plan/verification lifecycles and no fake checkout.

### PH03 — Staff invitations, membership/role security, dentist identity

- **Outcome / users:** CO/CM invite staff and assign scoped clinic roles; clinician/reception/cashier get role-correct entry; no cross-tenant access. `F03`; C24,C25,C34.
- **Data/API:** membership/invite/role grant, verification and revocation; dentist professional identity draft; owner safety, role ceiling, session invalidation. Depends PH02.
- **UI:** Team/Dentists/Invitations tabs, details/edit, accept invite, role-specific sidebar and 403 states; compact mobile drawer and RTL form layout.
- **Acceptance `AC03`:** owner invites dentist, receptionist, cashier; all see correct menu; manager cannot promote self; revoked user loses access; multi-clinic switch clears cached protected content; expired invite recovery works; permission API tests exhaustive.
- **Explicitly NOT yet:** bookable shifts, verified public dentists. **Demo:** invite receptionist → accept → receptionist sees authorized shell only. **Done:** roles enforce on backend and UI.

### PH04 — Services, chairs, working hours and safe availability foundation

- **Outcome / users:** CO/CM configure service durations/prices, compatible chairs and operating schedules; can preview real availability with no appointments yet. `F04`; C26,C27,C31, operations checklist in C01/C02.
- **Data/API:** versioned services, operatory uniqueness, shifts, holidays/exceptions, candidate availability engine, conflicting rule validation; PH02/03 membership required.
- **UI:** Services table/add/edit; Chairs/Rooms list; weekdays/breaks/exceptions calendar; setting preview and correct responsive day control; all active services and resource tabs functional immediately.
- **Acceptance `AC04`:** create dentist service/price/chair/hours and preview Saturday slot; overlapping hours rejected, deactivating used chair prevented, plan limits enforced, timezone/date conversion stays stable; RTL and keyboard date-picker tests.
- **Explicitly NOT yet:** appointments or patient cards. **Demo:** owner configures consultation 30 minutes, chair A, dentist Saturday 09:00–12:00 → sees valid availability. **Done:** no placeholder scheduling settings.

### PH05 — Real patient registry and import

- **Outcome / users:** R/authorized staff create/search/edit clinic-local patients; CO imports a CSV with duplicate preview. `F05`; C06–C09 (Overview only), C07–C08.
- **Data/API:** clinic_patients, limited intake/provenance, duplicate candidates, import jobs, clinic-local IDs; dependencies PH03; import handler idempotent.
- **UI:** real Directory/Add/Import tabs, patient overview and edit, complete form states, 20/10 paging, duplicate dialog; no Visits/Chart/Billing tabs until their features ship.
- **Acceptance `AC05`:** add patient, edit phone, search/filter/paginate 100+ patients, import mixed valid/invalid/duplicate rows with accurate counts, deny cross-clinic ID lookup, accessibility and RTL regression.
- **Explicitly NOT yet:** charting or payment. **Demo:** receptionist imports approved test CSV → resolves duplicate → opens valid patient profile. **Done:** usable registry, no phantom clinical data.

### PH06 — Internal appointment calendar, walk-ins and arrival queue

- **Outcome / users:** R and clinic clinicians schedule real patients/services/dentists/chairs, check in and track state, prevent overlap. `F06`; C03–C05,C37 and dashboard operational cards.
- **Data/API:** appointments, resource ranges/exclusion constraint, status history, idempotency keys, appointment CRUD/state domain events; PH04/05 required.
- **UI:** full Day/Week/Month, New, Detail, Queue; provider/chair filters and mobile agenda, status badges and error/retry states. `Requests` remains hidden until PH15.
- **Acceptance `AC06`:** book one slot then concurrent attempt conflicts at database level, reschedule atomically, cancel, walk-in check-in and complete path, no-show and invalid transitions denied; multiple viewports/RTL/date/role tests.
- **Explicitly NOT yet:** patient-facing booking. **Demo:** receptionist books then checks in → dentist sees upcoming appointment in permitted schedule. **Done:** real daily scheduling loop.

### PH07 — Clinician worklist, draft/signed encounters and private files

- **Outcome / users:** D/AS manage assigned work and record longitudinal clinical visits, with private attachment permissions and signed history. `F07`; C10,C11,C15,C17; C09 Visits/Files subtabs now appear.
- **Data/API:** encounters/versions, clinical notes, histories, attachments/scan status, audit; PH05/06 permissions and patient context.
- **UI:** Today/Pending Notes/My Cases worklist, visit timeline, structured note form, sign/amend, file upload/preview, clear clinical alert hierarchy; tablet-first clinical layout.
- **Acceptance `AC07`:** assistant saves draft but cannot sign, dentist signs and later amends without overwriting, nonclinical receptionist denied note/file, upload invalid MIME rejected, private object unreachable publicly, interrupted upload recoverable.
- **Explicitly NOT yet:** odontogram or treatment-plan screens. **Demo:** dentist opens checked-in patient → completes signed encounter → views authored note and authorized attachment. **Done:** clinician-reviewed note workflow.

### PH08 — Interactive FDI dental chart and dated observations

- **Outcome / users:** qualified dental staff record adult/primary tooth states and browse historical observations. `F08`; C12 and C09 Dental Chart subtab.
- **Data/API:** tooth coding enum, dated observations tied to visits/clinician, latest-state projection with preserved history; PH07.
- **UI:** anatomically correct adult/primary odontogram, selected tooth inspector, legend, date/visit filters; SVG accessible at phone/tablet/desktop; RTL does not invert anatomical right/left.
- **Acceptance `AC08`:** enter 11/21 and primary 51 conditions, see current vs older observations, reject invalid FDI codes and unauthorized edits, keyboard tooth selection and RTL orientation pass clinical review.
- **Explicitly NOT yet:** automated diagnosis or treatment billing. **Demo:** chart a permanent tooth, record a later restoration, inspect both dated findings. **Done:** clinically reviewed history-preserving chart.

### PH09 — Treatment proposals, stages, consent and revisions

- **Outcome / users:** D drafts/proposes treatment, records appropriate consent, advances stages across visits. `F09`; C13,C14 and C09 Treatments subtab.
- **Data/API:** plan versions, stages, service-price snapshots, consent and revisions; case/encounter links; PH04/07/08.
- **UI:** Plans status tabs; structured create/detail, stage progress, estimate, consent and timeline; authorized financial view only for prices, no clinical note leakage.
- **Acceptance `AC09`:** 3-stage treatment planned/accepted/advanced/completed, unauthorized assistant cannot sign, accepted-plan change triggers revision, discontinued plan keeps history, clinic charges not automatically marked paid; consent denied when missing.
- **Explicitly NOT yet:** financial ledger (PH10), patient app record view (PH15). **Demo:** draft root canal stages → accept and complete first performed stage → inspect plan history. **Done:** real multi-visit plan lifecycle.

### PH10 — Clinic invoices, partial payments, balances and receipts

- **Outcome / users:** F/CO/authorized R charge for performed work or visit, issue invoices and post partial payments with correct balances. `F10`; C16,C18–C22, C09 Billing tab.
- **Data/API:** versioned invoice lines, payment and immutable ledger, idempotency, credits/refunds policy, decimal precision; link to treatments when relevant; PH05/09.
- **UI:** Finance overview, Invoices/Payments/Balances tabs, invoice detail, payment/reversal modal, patient statement, print receipt; permission-sensitive columns.
- **Acceptance `AC10`:** 6,000 AFN invoice receives 2,000 + 1,500, shows 2,500 owing; duplicate post is idempotent, reversal recomputes; cross-tenant cashier blocked, signed clinical content invisible to finance; paid vs issued status accurate.
- **Explicitly NOT yet:** digital gateway or expense payroll. **Demo:** treatment invoice → two real recorded manual payments → statement and receipt. **Done:** reconciliation-safe ledger.

### PH11 — Expense ledger and operational finance insights

- **Outcome / users:** F/CO enter expenses and view meaningful income/expense summary (without conflating cash/charges). `F11`; C23 and C18 Expenses tab.
- **Data/API:** categorized expense entries and audit corrections, summaries and export; PH10.
- **UI:** expense list/add form, date/category filters, cash receipts and expenses comparison with caveat, responsive compact financial tables.
- **Acceptance `AC11`:** record rent and supplies, date filter sums correctly, negative amount rejected, edit leaves audit, privileged expense data invisible to receptionist and patient; no expense can change patient invoice balance.
- **Explicitly NOT yet:** payroll, inventory, multi-branch consolidation. **Demo:** cashier enters expense → owner sees matching period total. **Done:** audited cost tracking.

### PH12 — Verified listings, clinic publishing and credential moderation

- **Outcome / users:** CO publishes approved clinic listing with verified dentists and real services; SA reviews professional evidence and public revisions. `F12`; C28,A04,A05,A08; public preview (not full search yet).
- **Data/API:** credential review, affiliations, public profile versions, moderation, publication gate; PH03/04/02.
- **UI:** C28 Overview/Dentists/Photos/Booking Rules/Preview fully functional; admin pending/verified/rejected and listing revisions. Profile not searchable publicly until PH13 release, but shareable preview is secured as draft.
- **Acceptance `AC12`:** unverified dentist cannot carry verified badge/publish, approved valid listing appears in authorized public projection, material edit waits for admin and old approved version stays, rejection reason visible, suspension removes bookability.
- **Explicitly NOT yet:** public consumer browse and patient booking UI. **Demo:** owner submits gallery/profile → admin approves → owner views published preview. **Done:** verified public-content backend ready.

### PH13 — Fast patient web discovery and honest public profiles

- **Outcome / users:** guest/P browse real verified clinics/dentists and filter by city/service/date, no account needed. `F13`; P01–P04 and public contact/about.
- **Data/API:** indexed approved public projection, search/filter/sort, public availability read model (from PH04/06/12); no patient records.
- **UI:** polished patient responsive Home/Search/Clinic/Dentist views, map fallback, accurate fee labels and slot display, accessible guest flows. Booking CTA before PH15 is **not shown** or explicitly links to legitimate clinic contact, not a dead `Book` button.
- **Acceptance `AC13`:** search matches clinic/name/category, city filters and empty results, unverified/suspended hidden, private records absent from APIs/source, search quick under representative low bandwidth; desktop/phone and RTL tests.
- **Explicitly NOT yet:** app sign-in, confirmed self-service bookings. **Demo:** guest searches Kabul clinic, filters cleaning, opens verified profile and sees real availability with contact path. **Done:** useful public directory.

### PH14 — Patient identity, profile, consent and dependent permissions

- **Outcome / users:** P/G create verified free accounts, manage profiles/dependents, select language/calendar/privacy. `F14`; P05–P09.
- **Data/API:** patient accounts/verified contact, guardianship grants, preference/notification consent, account recovery; PH01 shared auth, PH13 public site.
- **UI:** sign up/login, profile edit, Family directory/add/edit, Preferences, safe recovery and privacy screens; patient web account navigation only. No dead Appointments link until PH15.
- **Acceptance `AC14`:** signup verifies, patient edits profile, authorized parent adds minor (under approved policy), unauthorized adult dependent rejected, changing language/calendar persists, account cannot search clinic clinical records just by same name.
- **Explicitly NOT yet:** public book actions/clinic record access. **Demo:** user joins free, adds authorized child, sets Dari/Solar Hijri. **Done:** secure usable patient account.

### PH15 — Patient web bookings, verified record links and notifications

- **Outcome / users:** P/G book/track/reschedule/cancel online; R/D see booking in clinic calendar/requests, patient sees approved shared records and receipt. `F15`; P10–P12,P14,C36,C32, C03 Requests tab.
- **Data/API:** real public booking transaction, holds if configured, policy, booking ownership, clinic record-link proof workflow, release grants, outbox notifications/delivery history; PH06/12/14.
- **UI:** full five-step booking, appointment tabs, detail, clinic request queue/accept/reject, notification preferences and delivery states, shared records/link request with verification; email/push only if configured, SMS absent otherwise.
- **Acceptance `AC15`:** web booking makes exactly one clinic appointment, manual/auto booking states and clinic acceptance work, simultaneous users compete safely, guardian cannot book without authority, reschedule conflict preserves original, unauthorized shared record denied, email provider outage does not lose booking.
- **Explicitly NOT yet:** native app parity or reviews. **Demo:** patient selects clinic slot → booking appears in receptionist calendar → accepted → patient cancels/reschedules correctly. **Done:** first true cross-platform marketplace workflow.

### PH16 — Native patient Android/iOS parity and favorites

- **Outcome / users:** P/G can discover, book, manage, save favorites and update account in Expo mobile with parity to public web. `F16`; native P01–P14, P13 web/native.
- **Data/API:** shared contracts, secure mobile auth/session, deep link fallback, favorites unique constraints, push tokens with consent; PH15.
- **UI:** real Home/Appointments/Saved/Account bottom bar, native loading, safe-area, sheets, locale-aware booking, RTL/LTR fonts, low-network retries. Each bottom tab is fully interactive and populated from actual backend.
- **Acceptance `AC16`:** Android and iOS flows from signup/search through booked appointment and cancellation; favorite dentist and remove; app killed/restarted persists preferences securely; keyboard and reduced motion; no inaccessible stub nav, no clipboard PHI logging.
- **Explicitly NOT yet:** reviews, optional advanced marketing. **Demo:** Expo device books patient appointment and sees same record in clinic web. **Done:** real mobile patient application.

### PH17 — Eligible patient reviews and impartial moderation

- **Outcome / users:** qualifying completed-visit P/G can review; SA moderates/handles abuse; public profiles show verifiable ratings. `F17`; P15,A09,P03 Reviews tab.
- **Data/API:** one-review-per-visit guards, moderation/version history, flags, appeal policy, summary aggregates; PH06/13/15.
- **UI:** review creation, pending/edit outcome, admin tabs with reason, published list and count, report abuse; clinical details never exposed.
- **Acceptance `AC17`:** completed visit qualifies, No-show/rejected blocked, duplicate rating prevented, negative but policy-compliant review not removed for viewpoint, moderation is audited and patient notified, profanity/private health information controls tested.
- **Explicitly NOT yet:** paid featured listing. **Demo:** patient reviews completed care → admin publishes → clinic profile rating updates from real review. **Done:** trustworthy review lifecycle.

### PH18 — Role-safe reporting, support, analytics and operations

- **Outcome / users:** CO/F view accurate clinic metrics, SA/SUP handle support and platform intelligence without clinical data. `F18`; C29,P16,A10–A14, dashboard cards refreshed.
- **Data/API:** indexed aggregates, privacy-safe attribution, support tickets/messages, incident/audit read models, configurable taxonomy/templates; earlier events already emitted.
- **UI:** Appointments/Patients/Revenue report tabs, admin Support/Analytics/Security/Settings meaningful subtabs, public Help and ticket, complete empties/exports/access denials.
- **Acceptance `AC18`:** clinic payments reconcile to report total, cancelled booking counted correctly, support role cannot read clinical notes, admin small-count dashboard excludes identifying information, support ticket status/reply functions and messages localized, aggregation handles timezones.
- **Explicitly NOT yet:** advanced multi-branch consolidated accounting. **Demo:** owner views month receipts; support agent resolves booking ticket with redacted metadata. **Done:** trustworthy reporting and support.

### PH19 — Data portability, privacy approval, hardening and live-pilot gate

- **Outcome / users:** CO can securely export authorized records, admins can verify recovery/security and launch 5–10 verified clinic pilot. `F19`; C35 plus complete production checks across all apps.
- **Data/API:** scoped export jobs/reauth/audit, retention controls, backup restoration, migration rollback, access reviews, critical alerts, legal privacy content/provider configuration; PH01–18.
- **UI:** full Export & Data Retention route, patient privacy/help and all error/empty/offline states polished, no orphan routes; device accessibility/RTL and low-connectivity validation.
- **Acceptance `AC19`:** export cannot cross tenant; signed file links expire; backup restoration measured; penetration/authorization test plan passes; stress 100 concurrent booking attempts without double reservation; staged smoke across clinic/patient/admin; legal/clinical advisor signs off high-risk workflows.
- **Explicitly NOT yet:** insurance, integrated dental hardware, AI diagnosis, offline clinical writes. **Demo:** first real pilot clinic workflow from signup → patient booking → signed visit → partial payment → authorized export and restore exercise. **Done:** production gate checklist all **PASS** or explicitly launch-blocked; do not launch PHI storage on an unapproved hosting/retention setup.

### 9.2 Phase acceptance invariants (apply to ALL phases)

- **DOD-01:** Every new route and subtab has working entry, active state, back path, purposeful data/empty view, permitted actions, loading/errors/retry, and phone/tablet/desktop arrangements.
- **DOD-02:** All writes have server validation, authorization, tenant scope, transaction/idempotency as needed, and observable success/failure.
- **DOD-03:** At least one positive, one negative, one denial and one relevant edge-case test are automated for each major workflow; no fake tests from mocked-only data when integration is needed.
- **DOD-04:** Dari/Pashto/English pages tested visually and functionally including date/currency and RTL; accessibility smoke and nonproduction demo reproducible.
- **DOD-05:** Feature/route/phase/acceptance matrix is updated; phase-not-shipped destinations hidden. Regression test core previously delivered journeys after every integration slice.
- **DOD-06:** Clinical or financial schema changes include migration and rollback review, historical data protections, seed-only test data and sanitized logs.
- **DOD-07:** No task declared complete based merely on a rendered page, database table or installed dependency; owner role can demonstrate feature end-to-end.

## 10. Coverage/traceability and executable test journey matrix

The comprehensive route registry (§4) covers every required route and its first phase; each page and subtab has a concrete functional contract (§5). The following matrix connects requirements and business rules to phases/tests without copying the full page blueprint into each row.

| Requirement / feature | Roles | Routes / tabs | Data/API & key rules | Owning phase | Acceptance ID | Executable test/journey |
|---|---|---|---|---|---|---|
| REQ-001 F01 Identity/localization | All | Shared auth; P17 | user/session/locale; BR-ID-01,BR-L10N-01 | PH01 | AC01 | J01, NAV-04; invalid login, 3-locale smoke |
| REQ-002 F02 Tenant + subscription | CO,SA | C01,C02,C30,C33,A01–A03,A06–A07 | clinic/plan/subscription; BR-SUB-01–05,BR-VER-01 | PH02 | AC02 | J01,J10; status/verification matrix |
| REQ-003 F03 Staff membership | CO,CM,D,R,AS,F | C24 Team/Dentists/Invitations,C25,C34 | membership/invite; BR-ROLE-01–04 | PH03 | AC03 | J02; role API denial and revoke |
| REQ-004 F04 Service/availability config | CO,CM | C26 Chairs,C27 Services,C31 Hours | service/chair/shifts; BR-SLOT-01 | PH04 | AC04 | J03 preparation; shift overlap and price version |
| REQ-005 F05 Patient registry/import | R,D,CM | C06 Directory/Import,C07,C08,C09 Overview | clinic_patient/import; BR-PAT-01–03 | PH05 | AC05 | J03; duplicate+tenant import test |
| REQ-006 F06 Calendar/queue | R,D,AS | C03 Calendar/Queue,C04,C05,C37 | appointment/resources; BR-SLOT-02–03,BR-APT-01–05 | PH06 | AC06 | J03,J07; concurrent double-book test |
| REQ-007 F07 Encounters/files | D,AS | C10/C11 visits,C15 Files,C17 Today/Pending/My Cases | encounter/version/object; BR-CLIN-01 | PH07 | AC07 | J04; sign/amend/deny/file ACL |
| REQ-008 F08 FDI odontogram | D,AS | C12 Chart | odontogram; BR-CLIN-02 | PH08 | AC08 | J04; tooth mapping/history test |
| REQ-009 F09 Treatment & consent | D | C13 Plans,C14 Stages/Consent/Estimate | plan/version/consent; BR-TRT-01–02 | PH09 | AC09 | J04; revision after acceptance |
| REQ-010 F10 Ledger/invoices | F,CO,R* | C16 Billing,C18 Overview/Invoices/Payments/Balances,C19–C22 | invoice/ledger; BR-FIN-01–05 | PH10 | AC10 | J05; partial/reversal/idempotent |
| REQ-011 F11 Expenses | F,CO | C18 Expenses,C23 | expenses/audit; BR-FIN-04 | PH11 | AC11 | J05 extended; category sum/deny |
| REQ-012 F12 Verified listings | CO,SA,D | C28 Overview/Dentists/Photos/Rules/Preview,A04–A05,A08 | credential/listing version; BR-VER-01–02 | PH12 | AC12 | J01,J12; reject preserves live version |
| REQ-013 F13 Public search | Guest,P | P01,P02,P03 Overview/Dentists/Services/About,P04 | approved search projection; BR-PUB-01–02 | PH13 | AC13 | J06 discovery; no PHI leak |
| REQ-014 F14 Patient family/account | P,G | P05–P09 Profile/Family/Preferences | user/guardian/consent; BR-LINK-02 | PH14 | AC14 | J08; unauthorized adult-dependent guard |
| REQ-015 F15 Booking/share/reminders | P,G,R,D | P10–P12,P14,C36,C32,C03 Requests | appointments/link/outbox; BR-APT,BR-LINK,BR-NOT | PH15 | AC15 | J06,J07,J08; concurrent booking & delivery outage |
| REQ-016 F16 Native/favorites | P,G | native P01–P14/P13 Saved Dentists/Clinics | secure mobile sessions/favorites; BR-FAV | PH16 | AC16 | J06 native; deep link, persist favorite |
| REQ-017 F17 Reviews | P,SA | P15,P03 Reviews,A09 | reviews/moderation; BR-REV-01–02 | PH17 | AC17 | J09; duplicate/no-show moderation |
| REQ-018 F18 Reporting/support | CO,F,SA,SUP | C29 3 tabs,P16,A10–A14 all tabs | aggregates/tickets/audit; BR-OPS-01 | PH18 | AC18 | J05/J09 metrics; support redaction |
| REQ-019 F19 Privacy/export/recovery | CO,SA | C35 plus all app screens | export/backup/retention; BR-DATA-01–02 | PH19 | AC19 | J11; deny, restore drill, penetration and UX |

### 10.1 Critical journey test matrix

| Test ID | Setup and steps | Required observable outcome |
|---|---|---|
| T01 Auth & roles | Create owner/dentist/reception/cashier, switch clinic, probe forbidden API | Only tenant-authorized data returned; 403/404 privacy-safe; valid nav per role |
| T02 Clinic verification | Submit valid/invalid docs, approve/reject/revise | Correct independent verification/subscription states; older published listing unaffected by rejected revision |
| T03 Scheduling concurrency | Two sessions book same dentist+chair+time concurrently 100× in staged stress | Exactly one confirmation per nonshareable slot, loser 409 with alternatives; no phantom booking |
| T04 Booking retry | Simulate timeout after commit, client retries same request key | Single appointment and single outbox event delivered idempotently |
| T05 Reschedule atomicity | Existing confirmed booking, attempt busy replacement | Original booking remains confirmed and resource reserved; conflict clearly shown |
| T06 Treatment lifecycle | Draft→proposed→accepted→in-progress, modify plan, complete stage | New version/consent where required; old revision and encounter persisted |
| T07 Clinical sign/amend | Assistant draft, dentist sign, attempted overwrite, amendment | Assistant denied sign; signed original immutable and amendment audit present |
| T08 Chart anatomy/locales | Record FDI 11,21,51,61 in English, Dari and Pashto | Patient anatomical right/left does not invert on RTL; history preserved |
| T09 Patient privacy | Two clinics contain same-name patients, patient requests record link | No cross-tenant read; no auto-link by name; verified proof/grant required |
| T10 Money integrity | Invoice 6000 AFN, pay 2000 +1500, reverse second, duplicate retry | Balance 2500 then 4000; no duplicate post; ledger trace intact |
| T11 Subscription expiry | Trial→grace→expired→renew with clinical records present | No deletion; correct restricted access, renewal and export route |
| T12 Reviews | Completed vs no-show/rejected patient requests review | Only eligible verified visit can submit; repeated attempt doesn't boost rating |
| T13 Network failure | Drop internet during booking, note draft, upload and reminder | No false success; appropriate retry/preserved safe draft; committed booking survives notification outage |
| T14 Low-bandwidth/RTL | Test 320px phone, 768px tablet, desktop, 3 locales, Solar Hijri/Gregorian | No clipped cards, correct back/focus, date/time invariants, readable labels |
| T15 Admin support | Support agent opens booking dispute with known clinic/patient ID | Redacted metadata only; no PHI or clinical file via routes/API |
| T16 Data exit/restore | Export authorized clinic, try other-tenant ID, restore backup to staging | Tenant-correct package, denied attack, valid private expiry and tested restore integrity |
| T17 Marketplace integrity | Hide/suspend listing and change approved public fields | Search removes suspended profile promptly; pending revision doesn't expose false verification |
| T18 Navigation audit | Crawl every role's active routes/tabs after each phase | No 404/dead tab/placeholder; every exposed action has real backend/result/return path |

### 10.2 Subtab ownership verification

| Platform | Subtabs/panels | Phase where each becomes real |
|---|---|---|
| Clinic Appointments | Calendar, Queue, Requests | PH06, PH06, PH15 |
| Clinic Patients | Directory, Import | PH05, PH05 |
| Patient Detail | Overview, Visits, Files, Dental Chart, Treatments, Billing | PH05, PH07, PH07, PH08, PH09, PH10 |
| Clinical Worklist | Today, Pending Notes, My Cases | PH07 all |
| Finance | Overview, Invoices, Payments, Balances, Expenses | PH10 first four; PH11 Expenses |
| Staff | Team, Dentists, Invitations | PH03 all |
| Clinic Profile | Overview, Dentists, Photos, Booking Rules, Preview | PH12 all |
| Clinic Reports | Appointments, Patients, Revenue | PH18 all (role-gated) |
| Clinic Settings | General, Hours, Notifications, Subscription, Security, Export | PH02, PH04, PH15, PH02, PH03, PH19 |
| Clinic public profile | Overview, Dentists, Services, About, Reviews | PH13 first four; PH17 Reviews |
| Patient Appointments | Upcoming, Past, Cancelled | PH15 web, PH16 native |
| Patient Saved | Dentists, Clinics | PH16 |
| Patient Shared Records | Treatment Summaries, Receipts, Linked Clinics | PH15 |
| Admin Clinics | Pending, Approved, Suspended, Rejected | PH02 |
| Admin Dentists | Pending, Verified, Rejected | PH12 |
| Admin Subscriptions | Trials, Active, Grace/Expired, Cancelled | PH02 |
| Admin Listings | Pending Revisions, Published, Reported/Hidden | PH12 |
| Admin Reviews | Pending, Published, Flagged, Removed | PH17 |
| Admin Support | Open, In Progress, Resolved | PH18 |
| Admin Analytics | Clinics, Bookings, Subscriptions, Patient Funnel | PH18 |
| Admin Security | Audit Events, Incidents, Access Reviews | PH18 |
| Admin Settings | Verification, Taxonomy, Notifications, Localization, Operations | PH18 |

## 11. Risks, trade-offs, exclusions, and open decisions

| Risk | Severity | Proposed mitigation | Gate/owner |
|---|---|---|---|
| Unclear local patient-record privacy, retention and legal rights | **Critical** | Local counsel and clinical advisory sign-off, publish privacy/consent, define data exit policy | PH19 launch blocker |
| False dentist license/qualification representation | **Critical** | Human verification and document evidence, expiration/revocation and public badge controls | PH12 live listing gate |
| Data leak across clinics or into admin/support/public index | **Critical** | Tenant isolation, role tests, row policy as defense-in-depth, private files, penetration audit | Every phase; PH19 |
| Appointment overlap under high concurrency | **Critical** | DB constraint/transaction, idempotency, randomized concurrent tests | PH06 and PH15 |
| Financial corruption or unintended duplicate receipt | High | Immutable entries, decimal amount handling, reconciliation/duplicate key and refund reason | PH10 |
| Local SMS/payments provider availability | Medium–High | Launch with manually verified payments, email/push/in-app and visible channel status; no false integrations | PH02/15 |
| Weak connectivity/devices | High | Small bundles, cached public content, retries, clear uncertain-state errors; never offline clinical commits without designed sync | PH13/16/19 |
| Two-sided marketplace cold start | High | Sell clinic operations first, recruit 5–10 clinics in Kabul, use shareable clinic links, then patient acquisition | Pilot |
| Clinic adoption/training and migration | High | Short staff onboarding, role-focused UI, CSV preview, guided pilot and paper fallback | PH05/19 |
| Over-engineering clinical workflows | High | 2–3 practicing dentists validate tooth chart/consent/visit notes before shipping | PH07–09 |
| Public review abuse and trust | Medium | Completed booking verification, transparent moderation, right to flag/appeal | PH17 |
| Multi-branch pricing and user limits | Medium | Versioned entitlements with branch-ready schema but single-site MVP | NEXT |

**Open decisions to confirm with stakeholder/clinic advisers (do not block writing the initial spec):** final brand name/trademark; clinic plan prices/trial/grace exact durations; whether verified email is practical for all patient cohorts vs local phone OTP provider; adult dependent authorization; clinic credential types; locally acceptable prescription and consent method; clinical file retention/export standard; whether dentist profiles may list self-declared specialties before verified; exact patient profile fields required; allowed refund/credit overpayment policy; local map data quality; official production hosting/data location. These should be tracked as decision records with owner/date/affected FEAT and phase.

**Future scope explicitly reserved:** inventory, laboratories, periodontal charts, orthodontic specialty tracking, multi-branch consolidation, advanced patient recall automation, integrated patient/clinic digital payments, insurance, imaging equipment interfaces, secure offline writes, AI administrative helpers and external API ecosystem. Such features are not present as active MVP nav.

## 12. Independent product-completeness audit

This is a **specification audit**, not a claim that software exists or has passed real tests.

| Audit dimension | Finding in this specification | Validation required during implementation |
|---|---|---|
| First-time onboarding | C01 clinic setup, C02 status, A02 verification, P05/P06 patient account fully specified | Validate real provider onboarding and consent with users |
| User-role destinations | Role matrix, route registry, default landing, denied UI and admin least privilege present | Automated role crawl and authorization tests |
| Tab/page completeness | Every nav/tab named, with owning phase and per-page/subtab behavior | Route acceptance T18 after each phase |
| End-to-end clinic value | Patient→appointment→encounter→chart/treatment→invoice→payment→report | Conduct live pilot with clinician supervision |
| End-to-end patient value | Search→verified listing→real availability→book→manage→receipts/review | 5 real patient usability sessions before launch |
| Business rules | Explicit state machines and numbered rules for billing, slots, records and publishing | Backend transition tests + concurrency stress |
| Empty/slow/permission states | Global contracts plus route-specific error recovery and offline restrictions | Device/network/a11y testing |
| UI design completeness | Concrete tokens, component states, nav patterns, density, responsive transformations | Screenshot review at 320/768/1440px and RTL |
| Data integrity/security | Tenant ownership, event history, immutable clinical/finance entries, private files | External/security review before real PHI |
| Scope realism | MVP/NEXT/FUTURE split and hidden deferred destinations | Product owner approval and freeze |
| Missing unresolved decisions | Explicitly recorded in §1.7 and §11 | Resolve by stated production gate |

**Known conscious deferrals:** insurance, laboratory, inventory, offline medical writes, AI diagnosis, digital prepay, advanced periodontal and multi-branch are NOT missing MVP defects. **Known launch blockers:** approved clinical/legal retention model, professional verification policy, clinician review of chart/notes, private storage/backups/restore, secure exports, provider operational readiness, real-data authorization test coverage.

### 12.1 Change-control and authority

This spec is the proposed authoritative source for product scope, roles, routes, UX and acceptance **once approved**. The actual repository remains authoritative for existing implementation state. Development Workflow owns coding, Git/push/merge/migrations/test execution and deployment; this spec does not override those delivery procedures. Each change updates `decision log + affected FEAT/BR/route + phase + acceptance/test IDs` before implementation. Consequential scope, security, cost, clinical or retention changes require explicit owner approval. Low-risk visual refinements may follow established tokens without altering workflows.

## 13. IMPLEMENTATION HANDOFF — one-page operational brief

**Product:** DandanLink, Afghanistan-first dental OS (paid clinics) + free patient booking (web/Android/iOS) + internal admin. Brand availability unverified.

**Mission:** complete functional workflows per phase; clinic value first. Do not expose tab or navigation before its backend/data/role/UX and tests exist.

**Stack proposal:** pnpm monorepo, TypeScript, Next.js clinic/patient/admin web, Expo patient mobile, Node modular API, Drizzle + PostgreSQL, Better Auth, private S3 storage, outbox/background jobs, email/push; SMS/maps/gateway only after operational validation. Hosted DB/storage locations subject to healthcare security/legal review.

**Roles:** `SA`, `SUP`, `CO`, `CM`, `D`, `R`, `AS`, `F`, `P`, authorized guardian relationship `G`; server-enforced tenant permissions and signed clinical-note safeguards. **No global admin clinical browsing.**

**Navigation:** Clinic `Dashboard / Appointments / Patients / Clinical / Finance / Staff & Resources / Services & Pricing / Clinic Profile / Reports / Settings`; Patient bottom `Home / Appointments / Saved / Account`; Admin `Overview / Clinics / Dentists / Subscriptions / Marketplace / Reviews / Support / Analytics / Security & Audit / Settings`. Exact route registry §4, blueprint §5, phased visibility §10.2.

**Critical journeys:** J01 clinic verified onboarding; J02 invited staff; J03 walk-in booking/check-in; J04 signed encounter/tooth chart/treatment; J05 partial payment; J06 live patient booking and cross-role synchronization; J07 cancellation/reschedule; J08 guardian; J09 verified review; J10 expiry/renew; J11 private export; J12 approved public revisions.

**Phase map:** PH01 identity/UI → PH02 tenant/subscription → PH03 staff/roles → PH04 services/chairs/hours → PH05 patient registry → PH06 staff calendar/queue → PH07 encounters/files → PH08 dental chart → PH09 treatment/consent → PH10 invoicing/payments → PH11 expenses → PH12 verified profiles → PH13 web discovery → PH14 patient accounts/family → PH15 web booking/notifications → PH16 mobile/saves → PH17 reviews → PH18 reporting/support → PH19 exports/security/pilot.

**Mandatory external readiness:** clinic/dentist license verification rules; pricing and subscription collection process; consent and guardian policy; medical retention/hosting review; real email/push/SMS delivery evaluation; maps; professional dental-chart review; backup/restore and support process. No production PHI until PH19 gates pass.

**Definition of ready to implement a phase:** owning FEAT/BR/route list frozen; UX page/subtabs described; dependencies installed/testable; external setup known; AC test examples and demo path selected; no hidden reliance on later phase.

**Definition of done:** user can complete workflow in real application, server persists correct data, permissions/tenancy tested, concurrency/financial/clinical invariants pass, errors/empty/offline localized, responsive/RTL checked, regression green, demo successful, and traceability updated. No simulated app-data or nonfunctional buttons labeled done.

**Source truth / approval:** this is a proposed v1.0 product document. Obtain stakeholder/clinical/legal sign-off on decisions in §1.7/§11, then mark version **Approved**; do not describe the pending document as a certified or production-ready health system.

---

**END OF PRODUCT SPECIFICATION v1.0**