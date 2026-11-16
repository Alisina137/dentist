# Stage H — Dentist & Clinic Management: Operations Workspace

**Baseline:** DandanLink PH19 plus Stage G. **Scope:** improve the existing clinic/dentist management experience without altering patient, billing, or clinical write contracts. This is an incremental patient-safe clinic UX upgrade, **not** healthcare production release approval.

## What changed

| Area | Stage H outcome |
| --- | --- |
| Overview for all roles | Replaced the PH03 role placeholder and owner-only PH02 onboarding-first dashboard with a tenant-specific operations command center. **Clinic owners without a registered clinic still see the original registration/onboarding workflow.** |
| Daily scheduling | Live count of today's appointments, check-ins, active treatments, completions, no-shows and the next-seven-day schedule from `GET /v1/appointments/clinics/:clinicId/overview`. Future appointments show service/date only, with no patient name printed on the overview. |
| Online booking triage | Live pending booking count from `GET /v1/booking/clinics/:clinicId/requests?state=pending` with a direct route to staff review. The server limits that response to 100 and the dashboard displays **at least 100** when the page is full; it never calls it a total. Only owner, manager, dentist and receptionist may request it. |
| Patients | Live active/inactive/archived and total counts from `GET /v1/registry/clinics/:clinicId/patients/summary`, with a shortcut to the existing directory. Assistant cannot fetch this endpoint. Cashier sees permitted patient summary but not scheduling data. |
| Operational setup | Four existing, real checklist rules (service, treatment chair/room, clinic hours, dentist shifts) shown with a progress bar, actionable links and explicit warning: not healthcare/legal approval. Uses `GET /v1/operations/clinics/:clinicId/summary`. The server still governs write and subscription restrictions. |
| Quick actions | Role-appropriate shortcuts for owner/manager, dentist, receptionist, assistant and cashier. Clinic owners keep clinic registration and subscription management entry points. |
| Navigation | New operational Queue and owner Subscription/Settings links, replaced text symbols with the application's `CareIcon` stroke icons, highlighted Queue correctly, and displayed current mobile navigation destination. Role restrictions still apply at the API. |
| Layout/localization | Responsive cards, restrained teal/navy colors, consistent 12–36 px typography, English/Dari/Pashto labels, semantic status colors, correct Solar Hijri/Gregorian display in Asia/Kabul, reduced-motion preference, accessible loading and error states. |
| Data security | Separate fetch retry for each panel, 10 s network timeout, `credentials:include`, `cache:no-store`, abort on scope changes, and response-path binding to avoid showing previous-clinic data during a tenant switch. No patient data is saved to browser storage. |

## User roles and API reads

| Role | Scheduling | Patient aggregate | Operations readiness | Pending online requests |
| --- | --- | --- | --- | --- |
| Owner / Manager | Yes | Yes | Yes | Yes |
| Dentist | Own authorized schedule | Yes | Yes | Own authorized requests |
| Receptionist | Yes | Yes | Yes | Yes |
| Assistant | Authorized queue overview | No | No | No |
| Cashier | No | Yes | No | No |

**Important:** The UI never replaces backend role, clinician affiliation, subscription, clinic suspension, MFA or patient privacy checks. Clinic and dentist clinical records are **not** in the command center.

## Automated verification

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Stage H adds `tests/stage-h-clinic-operations-validation.test.mjs`; the repository CI still runs the full PostgreSQL integration suites and Android Expo bundle. Only merge to `main` once the whole workflow is green.

## Manual acceptance with authorized synthetic data

1. Open `/clinic` as owner, manager, dentist, receptionist, assistant and cashier. Each sees a role-appropriate overview and navigation. An owner without a clinic still sees registration.
2. Create a synthetic appointment and update its status; refresh the dashboard and confirm the matching real counts and current appointment time, including the 7-day list.
3. Make a patient booking request; confirm the pending counter changes and the Requests shortcut navigates to the existing moderation workflow. Check dentist sees only appointments assigned to them. For over 100 requests ensure no false exact total.
4. Add a real test service, chair, clinic hours and dentist shift; check the readiness steps and progress bar update. Test the subscription/verification enforcement with test accounts.
5. Compare patient summary totals against the directory without exposing individual clinical records, names, phone numbers or charts.
6. Switch between two clinic memberships, including before a slow API responds: no previous-tenant private metrics must be visible. Verify role denial at the HTTP API, not just via hidden UI.
7. Check Sidebar → Queue active highlighting, mobile current tab summary, RTL order in Dari/Pashto, Gregorian/Solar Hijri date, large fonts, keyboard focus and reduced motion.
8. Check API offline/reconnection, slow responses and per-panel Retry without interpreting an error as zero patients or zero appointments.

**Remaining:** Physical browser QA, translations by native speakers, production privacy/compliance checks, PH19 pilot gate approvals, screen reader reviews and real clinical stakeholder acceptance. These are not certified by CI.

### Local pull

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

No migration or package installation is expected for this UI-only stage.
