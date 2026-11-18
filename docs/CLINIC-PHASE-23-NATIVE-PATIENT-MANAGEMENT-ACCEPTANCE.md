# DandanLink — Clinic Improvement Phase 23
## Native Patient Management and Authorized History

**Engineering scope:** Implement a real native Clinic/Doctor patient workspace in Expo SDK 57. This phase does **not** enable real-patient production: the independent PH19 legal, privacy, clinical, security, backup, accessibility and operational signoff gate remains NO-GO.

### Delivered

**Native patient directory — real clinic data**
- Dedicated **Patients** tab on the authenticated Clinic/Doctor mobile workspace. Six-tab navigation is horizontally scrollable with a stable bottom rail, without hiding existing dashboard, appointments, onboarding, team, or settings.
- Read-only roles: owner, manager, dentist, receptionist and finance-only cashier. Assistants cannot open the directory (matches existing `patientAccess(...,"read")` server permissions). Cashier sees identity and patient number only, never contact/health/appointment/clinical history.
- Page size 10, server-side status filters (active/inactive/archived/all), recent-activity or name sorting, explicit name/patient number/phone search, result pagination, real active/inactive/archived counts. No fake patients, no fabricated statistics.
- Premium navy identity header, white structured cards, search/filter chips, patient avatars, strong status semantics, active page controls, clear loading/empty/access/offline states. English, Dari and Pashto with RTL-aware profile content. Phase 21 dashboard **Patients** shortcut opens this tab natively.

**Patient profiles and guarded contact**
- Patient profile is fetched from `GET /v1/registry/clinics/:clinicId/patients/:patientId`, which logs a server audit event and enforces membership, role and tenant.
- Shows name, patient number, status, last update, province/city, date of birth or estimated age (only for non-cashier roles). Contact phone, alternate contact, address, emergency contact are behind an explicit **Show contact** control, and phone verification is never implied.
- Typed allowlist parsers strip any extra server fields, including intake, insurance, diagnosis, chart narrative, appointments and financial data. No patient's phone/contact or health text is saved to local storage or displayed in notifications/URL deep links.

**Patient registration and demographic updates**
- The Add Patient form accepts preferred/family name, optional phone, DOB **or** age estimate, province, city, address, alternate/emergency contact and mandatory acknowledgment of the patient-privacy notice.
- A **preflight duplicate check** uses `POST /patients/duplicates`. The server **repeats** duplicate checks within a locked transaction at `POST /patients`. On possible duplicates, native creation is blocked. The existing audited clinic web workflow must be used for deliberate duplicate override.
- Editing an existing profile uses the current `revision`, a complete copy of existing optional demographics (not an accidental field wipe), and the guarded `PATCH /patients/:id`. Both create and edit require a confirmation dialog and server-authorized staff roles.
- Owners and managers can change active/inactive/archive status with a mandatory 10–300-character administrative reason, confirmed user action and optimistic revision through `PATCH /patients/:id/status`. The existing API forbids deactivation while future appointments exist.
- A stale revision, duplicate, forbidden role or PH19 production pilot release gate produces a clear error. Ambiguous network write outcomes require a fresh server lookup before retry; the app does not silently retry a patient write.

**Authorized clinical and appointment history — metadata only**
- An **Appointments** section uses the clinic's `GET /v1/appointments/clinics/:clinicId/patients/:patientId/appointments` and shows only authorized visit times, service, assigned dentist and appointment status. The existing API history query now scopes by dentist membership **before** limiting or counting, preventing cross-provider count inference. Results are most-recent-first with a 150-row server bound / 20-row native preview.
- A **Clinical History** section is available only to a dentist or clinician-enabled owner/manager, not general administrators, receptionists, assistants or cashiers. It calls existing server-authorized `GET /v1/clinical/clinics/:clinicId/patients/:id/encounters` and `GET /v1/treatments/clinics/:clinicId/patients/:id/status-summary` and displays only encounter date, signed/draft state, author, treatment-plan lifecycle and stage counts. It never fetches clinical note bodies, allergies, prescriptions, chart tooth conditions, file payloads, consent text, diagnosis or invoice amounts.
- Advanced chart editing and full medical record remain in secure role-restricted **Clinic Web**, accessible via a nonpatient-specific directory handoff. No clinical-data modification is introduced in Phase 23.

**Data protection and reliability**
- The page is keyed to `clinicId:membershipId`; new clinic/user replaces all private React state. Read-only GET calls use the existing Bearer transport's 12-second timeout and abort on list/filter/page/profile changes, with request-generation guards against stale responses.
- When the app is backgrounded, all in-memory patient details, form drafts, search text, contact reveal and history metadata are cleared. On foreground it refetches clinic-scoped data.
- No AsyncStorage/SecureStore writes for patient data, no patient details in logs/analytics, no automatic clinical permissions, and no bypass of the existing `protectHealthWrites` release gate.
- Phase 23 adds **no database migration and no new npm dependencies**.

### Run and test in PowerShell

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

In another terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Open the QR code with Expo Go SDK 57. In the app choose **Clinic / Doctor → Sign In → Patients**.

Use **synthetic clinics and test patient identities** until all independent PH19 approvals are genuinely recorded. For full clinic web charts, configure `EXPO_PUBLIC_CLINIC_WEB_URL` to a reachable trusted HTTPS origin; do not put patient record IDs into untrusted URLs.

### Acceptance matrix

| ID | Expected behavior | Engineering / manual |
| --- | --- | --- |
| C23-01 | Owner/manager/dentist/receptionist patient directory, cashier identity-only, assistant denied | Test contracts + manual role testing pending |
| C23-02 | Real count cards, 10/page, clinic-limited search, active/inactive/archive filters and sort | Unit/contracts + device staging pending |
| C23-03 | Profile details require authorized server read; sensitive contact hidden by default | Unit/contracts + device/privacy review pending |
| C23-04 | New patient checks duplicates and requires consent; no automatic override or retry | API and source tests + device staging pending |
| C23-05 | Edit preserves optional fields, uses optimistic revision and confirms write | API and source tests + device staging pending |
| C23-06 | Owner/manager status update with reason; future appointment conflict handled | API and source tests + device staging pending |
| C23-07 | Dentist appointment history query scoped before counts/limits; 150 server bound | Source and unit tests + multi-provider DB staging pending |
| C23-08 | Clinical history metadata limited to server-authorized clinician, no narrative or estimates in native state | Tests + clinical privacy review pending |
| C23-09 | On background and clinic/account switch private state cleared and GET aborted | Source tests + Android lifecycle pending |
| C23-10 | 320/360/414-point devices, EN/Dari/Pashto RTL, screen-reader/keyboard, network faults | Manual device QA pending |
| C23-11 | Production patient writes remain NO-GO pending independent PH19 signoffs | **Blocked: human approvals** |

### Next: Phase 24
Native doctor/staff management, real invitation acceptance, role-aware roster, provider hours and credential status. Phase 23 adds no fictitious doctor verification or clinical approvals.
