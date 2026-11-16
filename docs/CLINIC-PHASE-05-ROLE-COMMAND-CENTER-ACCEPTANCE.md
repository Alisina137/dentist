# DandanLink — Clinic Phase 05: Role-Specific Command Center

**Implementation status:** Code, tests and responsive UI added. Full GitHub CI and on-device/browser scenarios must be reviewed separately. **No production/clinical pilot approval is implied.**

## Deliverables

- **Role-aware snapshot:** owner and manager see appointments, pending booking requests, net ledger receipts and active patient count; receptionist sees check-in pipeline, online requests and patient records; dentist and assistant see schedule, arrivals, treatment and completed care; cashier sees permitted finance and patient directory aggregates. All metrics are derived from existing tenant-scoped authenticated endpoints; missing or failed responses never become fake zeroes.
- **Actionable attention panel:** pending booking requests and confirmed appointments lead to their existing pages; clinic owners can reach verification; managers/owners can reach incomplete operational configuration. When any necessary endpoint fails or is loading, the summary does **not** claim that every issue has been resolved.
- **Owner/manager/cashier performance:** last 7 or 30 **Kabul-local calendar days** from the authorized `GET /v1/insights/clinics/:clinicId/report` endpoint. This includes scheduled appointment counts by day, net posted payment receipts (adjusted for reversals, excluding credits), issued invoice face value and posted expenses. These figures are explicitly **not profit**. Reports are inaccessible to receptionist, dentist and assistant roles, consistent with the backend's owner/manager/cashier allowlist.
- **Safe, localized feedback:** English, Dari and Pashto support, localized unknown-error fallback, no raw server details, no stale data across a clinic or report-period switch. The new chart is empty until a successful response and shows a true zero-activity state, not synthetic bars.
- **Trustworthy configuration signals:** configured weekly dentist shifts and treatment chairs are explicitly labeled as configured quantities, **not** live staff presence/availability.
- **Responsive and accessible layout:** clinic-only stylesheet loaded after Phase 04 UX, keyboard focus, clear chart counts and date labels, scrollable 30-day chart, 1100/680/375px layouts, reduced-motion rules and touch-friendly controls.
- **Preserved behavior:** existing role-filtered navigation, appointment detail, patient list, queue, finance, clinical worklist, exports and backend authorization remain in place. No extra database migration, external API, new npm dependency, fake analytics, or sensitive identifying clinical details in charts.

## Files

- `packages/ui-web/src/clinic-command-widgets.tsx` — typed snapshot, role routing, report range, insights and attention panels.
- `packages/ui-web/src/clinic-operations-dashboard.tsx` — connect to existing private endpoints with AbortController, path-keyed snapshots and refresh.
- `apps/clinic-web/app/clinic/clinic-dashboard.css` and `layout.tsx` — isolated responsive visual design.
- `tests/clinic-phase-05-validation.test.mjs` — source-level access/data/locale/style regressions.

## Manual acceptance matrix — NOT RUN

| ID | Scenario | Expected outcome | Status |
| --- | --- | --- | --- |
| C5-01 | Clinic owner, approved, desktop | 4 live overview KPIs, priorities, finance/appointment trends; no fake values | NOT RUN |
| C5-02 | Clinic manager, one incomplete service setting | Configuration attention links to authorized setup; no clinical approval claim | NOT RUN |
| C5-03 | Dentist | Only appointment/patient-authorized modules; no finance report or receipts | NOT RUN |
| C5-04 | Receptionist, 4 pending online requests | Live pending count with link to requests, no financial report | NOT RUN |
| C5-05 | Assistant | Appointment and workflow counts, no patient or finance private summary | NOT RUN |
| C5-06 | Cashier | Actual receipts, invoices, expenses and patient summary; no appointment calendar fetched | NOT RUN |
| C5-07 | Owner or cashier switches 7d → 30d on slow network | Old period's report values disappear immediately, replaced by skeleton then new window | NOT RUN |
| C5-08 | 7d no appointments, no payments | Zero values displayed only after successful API reply; no invented chart activity | NOT RUN |
| C5-09 | API 401/403/500 and offline; then retry | Localized safe message, genuine retry and stable sidebar; no raw error or fake zero | NOT RUN |
| C5-10 | Switch clinic A → B during slow report fetch | No numbers from A appear on B; backend independently enforces clinic membership | NOT RUN |
| C5-11 | Dari and Pashto RTL, 320–375px, 200% text | No clipped controls, readable count/currency/date and independently scrollable report chart | NOT RUN |
| C5-12 | Keyboard and screen reader, reduced motion | Period buttons announce pressed state, actionable links focus, chart labelled, animation disabled | NOT RUN |
| C5-13 | Same-day new booking/payment, then Refresh | Snapshot updates to API truth after refresh, all role restrictions intact | NOT RUN |
| C5-14 | Other apps and patient clinical chart | No styling changes to patient/admin, chart geometry, print receipts or public login | NOT RUN |

## Validation and local run

Automated GitHub CI should pass: `pnpm test`, `pnpm typecheck`, `pnpm build`, Expo Android and iOS JS export, and PostgreSQL integration. The tests do **not** replace physical clinic browser/device acceptance, privacy/health compliance checks or PH19 pilot review. **PH19 NO-GO** remains unchanged pending independent acceptance.

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

To test the running clinic workspace locally after pulling, run `pnpm dev:api` and `pnpm dev:clinic` in separate PowerShell terminals from `C:\projects\dentist`. No new environment variable or migration is required.

**Next:** Phase 06 — Appointment Calendar and Scheduling Workspace improvements.
