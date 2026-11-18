# DandanLink — Clinic Phase 25
## Native Clinic Operations: Services, Chairs, Hours, Holidays and Availability

**Release status:** Development with synthetic clinic/patient test data only. This phase does **not** activate production clinical or patient bookings. PH19 independent healthcare pilot signoffs still apply.

### What changed

The Clinic / Doctor mobile workspace now has a dedicated, permission-aware **Operations** tab, and the Phase 21 Dashboard **Services & Hours** shortcut opens this native tab. There are five nested sections. The previous Appointment, Patients, Team, Registration, and Account tabs remain mounted in the persistent navigation.

| Native section | Real source | Workflow |
| --- | --- | --- |
| **Services & Pricing** | `GET/POST/PATCH /v1/operations/clinics/:clinicId/services` | Active/inactive services; name, category, optional description, duration (5–240 min/5-minute step), preparation (0–120/5-minute step), AFN price (0–10m), chair requirement, public-visibility flag. Owner/manager can create/edit through versioned, confirmed writes; disabled when a conflicting future booking exists. |
| **Chairs & Rooms** | `GET/POST/PATCH .../resources` | Real chairs and rooms with unique code, label, equipment and active status; optimistic resource revision. Future bookings, live schedules and illegal kind changes prevent unsafe deactivation. The API caps resources at 50. |
| **Working Hours** | `GET/PUT/DELETE .../hours` | Full seven-day clinic week and optional resource-specific schedules, Saturday-indexed (0–6), with live server revisions. Only owners/managers may edit; all confirmed saves checked against future appointments. Missing weekday rows get revision 0; existing breaks are preserved unless that day's time bounds change. Removing resource-specific schedule restores general hours rather than deleting the resource itself. |
| **Holidays & Exceptions** | `GET .../hours`; `POST/DELETE .../exceptions` | Full-day closure or special opening-hour ranges (maximum 90 calendar days), including an administrative reason and confirmation; cannot overlap another exception or invalidate an existing booking. Deletion requires 5–200-character reason and explicit confirmation. |
| **Availability** | `GET .../availability/preview` | Select a real active service, eligible clinician, optional active chair and Kabul-local calendar date (today to 365 days ahead); preview uses provider, clinic, resource, break, holiday and existing-booking constraints. Read-only candidate slots. **This screen never creates, changes, approves, or cancels an appointment.** |

### Design and behavior
- Premium dark navy header, consistent white elevated cards, compact per-day shift editor, readable labels, service price and active/inactive badges, real readiness metrics, status alerts, pagination-safe scroll, and English/Dari/Pashto text.
- The **Clinic Readiness** panel shows actual API summary metrics: active services, active chairs, open weekdays, and doctors with scheduled hours. `readyForPreview` is configuration readiness, **not** a clinical go-live approval. Do not infer public booking activation from a service's public-visibility flag.
- Authenticated staff roles: owner and manager may read/write; dentist and receptionist may read only. Assistant and cashier cannot see this tab. The API separately checks membership, role, clinic status, subscription and independent pilot protections.
- Authenticated requests reuse the existing clinic Bearer token. Data is reloaded from the server after successful writes. API 409/422/version conflicts surface errors without silent retry. An ambiguous write result blocks further writes until explicit refresh.
- Data parsing uses clinic-ID checks, bounded arrays, whitelist-only field projection, valid dates/times, and optimistic versions. No patient identifiers, clinical notes, service version history, booking IDs, invite tokens, or private finance are stored in this view.
- App backgrounding clears all private operational data, form inputs and previews; leaving the clinic session unmounts and removes component state. All explicit GET loads are abortable.
- No schema migration or new npm package. Phase 25 extends authenticated native API methods to **DELETE** for resource-specific hours and holiday exception removal.

### Known boundaries
- The clinic APIs deliberately return `publicBookingsEnabled:false` for operational readiness; the patient/public booking release state and independent PH19 healthcare approval remain separate. The availability UI is a **preview only**; authorized patient appointments belong in the dedicated native Appointments tab.
- Existing API supports **bounded service version history**; this native phase edits using current version and displays current price. Detailed version-history review stays in clinic web.
- The service/resource/holiday native workflows are API-guarded owner/manager operations, and unlike Phase 24 staff/role administration, their endpoints do **not** require MFA as an additional API prerequisite. **Do not disable MFA** on accounts to test this: current native login cannot complete an MFA challenge, so MFA owners/managers should use clinic web for protected login and configuration pending a future audited native TOTP flow.
- Device QA, accessibility and real SMTP/credential review are still manual. Only synthetic records may be used until independent healthcare signoffs.
- Date fields use Gregorian ISO `YYYY-MM-DD` in the clinic timezone `Asia/Kabul`, even when the interface language is Dari/Pashto. Time grids display Kabul wall-clock time.

### Run on Windows PowerShell

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

Open a second terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

In **Expo Go SDK 57**, choose **Clinic / Doctor → Sign In → Operations**. To open clinic-web handoff from a phone, configure `EXPO_PUBLIC_CLINIC_WEB_URL` to a reachable HTTPS clinic origin. A local `http://localhost:3001` URL refers to the phone, not to the development PC.

### Synthetic-data acceptance checklist

| ID | Verify | Coverage |
| --- | --- | --- |
| C25-01 | Owner/manager edit; dentist/receptionist read; assistant/cashier denied; exact selected clinic scope | Unit tests + backend authorization; device QA pending |
| C25-02 | Service edit retains price, duration, visibility, optimistic version and protects upcoming appointments | Contract/source tests + DB staging pending |
| C25-03 | Chair/room unique code, equipment, status, optimistic revision, 50-resource ceiling, appointment guard | Unit/source tests + DB staging pending |
| C25-04 | Seven-day clinic and resource schedules save all revisions; preserved/cleared breaks; no future appointment conflicts | Unit/source tests + DB staging pending |
| C25-05 | Full and partial holiday exceptions within 90 days, nonoverlapping, confirmation/reason, guarded deletion | Contract/source tests + DB staging pending |
| C25-06 | Kabul time, valid date bounds, active dentist/service, optional chair, preview slots and no real booking mutations | Unit/source tests + real-device pending |
| C25-07 | Offline/401/403/409/422, repeat tap, service edit while refreshing, background and clinic switch | Source tests + Android lifecycle pending |
| C25-08 | All labels, layout sizes 320/360/414px and RTL languages, VoiceOver/TalkBack | Manual UAT pending |
| C25-09 | PH19 human signoffs for real patient/clinical production | **NO-GO** |

### Next phase
**Phase 26: native account MFA continuity, safe privileged actions, clinic operator QA and device acceptance**. This closes the known Phase 24 owner/manager MFA gap without weakening server-side verification.
