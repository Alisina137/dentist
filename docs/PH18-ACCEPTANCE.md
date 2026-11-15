# PH18 — Role-safe reporting, support, analytics and operations

**Scope:** Clinic reports (C29), patient/public Help (P16), platform Support, Analytics, Security and Settings (A10–A14). All monetary values are integer Afghanis; there is no automated financial or clinical diagnosis.

## Clinic reporting

- Open `http://localhost:3001/clinic/reports?clinic=<clinic-id>` as **owner, manager or cashier**. Reports are guarded by active tenant membership server-side, never just the UI.
- Tabs: **Appointments**, **Patients** and **Revenue**. Apply Gregorian from/to filters (Kabul local day; maximum 367 calendar days), reload and download privacy-safe CSV of summary numbers.
- Appointment counts are grouped by **scheduled start date** in Asia/Kabul. **Cancelled** and no-show appointments have their own counts; both contribute to the total. Reports show recorded status, not proof that the visit occurred.
- Patient report contains registered-new and active-record counts only: **no patient identifiers, demographics, clinical notes, IDs or billing references**.
- Revenue shows net manual payments from `clinic_payment_entries`: payments minus reversal entries; **noncash credits excluded**. Only issued, nonvoid clinic invoices contribute, by date the entry occurred in Asia/Kabul. Net totals equal the sum of cash, bank transfer and other manual. Issued invoice face value and posted clinic expenses are **different measures** and must not be misrepresented as profit, bank-cleared funds, or tax statements.
- Export is a local CSV of the server-authorized summary; it excludes patient, appointment or invoice details. CSV cells are formula-escaped.
- Cross-clinic and non-finance users (including dentists and receptionists) cannot read the report API; active platform admins and support agents cannot use clinic accounts to retrieve it.

## Patient / clinic Help

- Visit `http://localhost:3002/help` (patient portal) or `http://localhost:3001/help` (clinic portal) to read **public FAQ and categories** without login. Help appears in the top navigation and footer.
- Verified signed-in users can create support tickets and see only their own tickets, messages and status. A clinic-scoped ticket additionally requires active clinic membership; other requests remain independent of clinic records.
- The form rejects obvious contact identifiers, URLs and likely health details. **Do not enter clinical information in tickets**. This is a defense-in-depth filter, not a clinical privacy certification.
- Requesters can reply to open/in-progress/waiting tickets. Resolved/closed tickets require a staff status change before further messages. Support responses are shown in the same private conversation; there is no claim of push/SMS delivery.

## Platform operations

- `http://localhost:3000/admin/support`: queue with status filters, redacted metadata, full support conversation, reply and status transitions.
- `http://localhost:3000/admin/analytics`: platform counts for clinics, active dentist memberships, patient portal profiles, last-30-day booking counts, support ticket queue and verified manual subscription payments. Aggregate cell sizes **1–4 are hidden**; support agents see no amount totals.
- `http://localhost:3000/admin/security`: **admin-only** read-only, grouped actions/outcomes and denied activity by Kabul day, no actor or record identifiers. This is not a comprehensive intrusion-detection or production incident console.
- `http://localhost:3000/admin/settings`: **admin-only** edit Dari/Pashto/English support categories and reply templates, grant/revoke an independently verified support agent by email.
- Only platform admins and delegated support agents with verified MFA can use permitted operations. Support agents do **not** inherit platform admin permissions or clinical, financial or patient access. Support agents cannot grant roles, edit categories, see audit security or financial amounts.
- Support data consists of nonclinical category, title, content, status, safe role metadata and immutable message/event timeline. Support message content requires policy and retention review before production.

## API endpoints

- `GET /v1/insights/clinics/:clinicId/report?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /v1/insights/platform/overview`, `GET /v1/insights/platform/security`
- `GET /v1/support/public/help`, `GET /v1/support/me`
- `POST /v1/support/tickets`, `GET /v1/support/tickets/mine`, `GET /v1/support/tickets/:ticketId`
- `POST /v1/support/tickets/:ticketId/messages`
- `GET /v1/support/admin/tickets?status=open|in_progress|waiting_user|resolved|closed|all`
- `POST /v1/support/admin/tickets/:ticketId/status`
- `GET /v1/support/admin/settings`, `PUT /v1/support/admin/categories/:code`, `PUT /v1/support/admin/templates/:id`
- `POST /v1/support/admin/agents`, `POST /v1/support/admin/agents/:userId/revoke`

All private responses use `Cache-Control: private, no-store`. Authorization happens before querying private data. Inputs have length/type checks and response shapes exclude clinical identifiers.

## Applying PH18 locally

From PowerShell in `C:\projects\dentist` after PH18 is merged to `main`:

```powershell
git -C C:\projects\dentist pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm check
pnpm dev
```

Optional web patient portal: `pnpm dev:patient:web`. The mobile app is unaffected by PH18; `pnpm dev:api` still starts backend and ngrok, and `pnpm dev:mobile` starts Expo Go.

## AC18 evidence and release gates

1. Ledger report total matches issued-invoice manual payment/reversal entries for an exact Kabul-local reporting period, excluding credit.
2. Cancelling an appointment retains it in the period total and cancelled count; no-show is separate; timezones cross midnight correctly.
3. Clinic membership and roles are enforced by API; cross-clinic/nonfinance/admin/support attempts denied.
4. Public platform small cells (1–4) suppressed, support staff cannot access clinical notes or patient-level finance.
5. Ticket creation, private message replies, status changes, closed/resolved write conflict and immutable audit conversation verified.
6. Public help, ticket forms, report pages, three platform console tabs and settings controls available in all three locales and RTL/LTR.
7. Fresh PostgreSQL 16 migration `0018`, PH18 validation + HTTP integration, all earlier integrations, TypeScript and web/Expo builds must pass GitHub Actions.

**Unreleased production gates:** PH19 human privacy/legal and clinical advisor approvals, support text redaction/abuse-policy review, retention policy, incident escalation, device-level accessibility/RTL acceptance, penetration and threat modeling. Do not import real clinical data before those gates pass. No multi-branch consolidated certified accounting, billing gateway or clinical-chart export here.
