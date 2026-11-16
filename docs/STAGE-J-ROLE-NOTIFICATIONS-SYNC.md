# Stage J — Cross-role permissions, notifications and data synchronization

**Scope:** DandanLink clinic-web and Expo patient app, using existing booking, clinic membership, email notification outbox and record-link APIs. The production/pilot and privacy gates from PH19 remain unchanged.

## What this release actually adds

| Area | Outcome |
| --- | --- |
| Clinic isolation | An **explicit** `?clinic=...` that is absent from the current staff member's authorized clinic memberships is rejected instead of silently switching to their first clinic. Changing a clinic remounts request and delivery views so unsent identity proof and rejection form inputs do not carry into a different tenant. |
| Cross-role navigation | Only **owner and manager** can open the clinic's notification-delivery monitoring screen and its navigation link. Only **owner, manager, receptionist, dentist** can open booking request review. These UI restrictions are defense-in-depth: the existing API still authorizes every read/write per clinic. |
| Clinician access alignment | A dentist without `clinicianEnabled` cannot enumerate clinic patient record-link applicants via `GET /v1/booking/clinics/:clinicId/record-links`. This now matches the existing link-decision authorization. UI also omits that fetch and form. |
| Booking request synchronization | Pending/processed booking requests and record-link requests load together using an abortable request, bound to the exact clinic/filter. Views synchronize on browser focus, on returning to a visible tab, every 45 seconds **while visible**, and after authorized accept/reject actions. Empty and error states are kept distinct. Manual refresh is available. |
| Clinic delivery dashboard | Owner/manager view of **email outbox delivery metadata only**: configured channels, queued/sent/failed/skipped counts, filter tabs and 10-row pages, last refresh, errors/retry. Reads the server's last 100 results; UI explicitly avoids calling the result an all-time total. No patient name, contact, appointment times or clinical content are displayed. |
| Patient mobile update history | A verified/onboarded patient may see their own last eight booking **event-delivery statuses** in Account, using their own authenticated API request. It refreshes when the Account view mounts, on manual refresh, or when the app returns to the foreground. Display dates use user-selected Solar Hijri/Gregorian preferences in Afghanistan local time. No notifications or patient data are persisted to the device. |
| Honest delivery claims | SMTP is reported as configured/unconfigured based on the real server value. **SMS and push are not implemented**; only the preexisting opted-in SMTP mechanism can send booking emails, and even then delivery is not guaranteed. Event history is delivery status, not a verified OS notification. |
| Localization | English, Dari and Pashto copy for authorization, delivery states, channel availability, refresh and event status. Responsive cards, button focus rings and reduced-motion styling. |

## Verification

```powershell
pnpm test
pnpm typecheck
pnpm build
```

The repository also runs the Expo Android bundle and PostgreSQL integration suites. Added `tests/stage-j-notifications-sync-validation.test.mjs` for key permission, scoping, sync and privacy contracts.

### Hands-on acceptance using authorized test accounts

1. As owner/manager, visit `/clinic/settings/notifications?clinic=<authorized-clinic-id>`. Exercise email-configured/unconfigured states, queued/sent/failed/skipped filters, 10-row paging and Retry. Confirm no patient identity, clinical details or appointment times are rendered.
2. As dentist/receptionist/assistant/cashier, attempt the **same route** by typing the URL. Only owner/manager can view it. Also test API GET directly; frontend hiding alone is insufficient.
3. Open booking requests as owner/manager/receptionist/dentist. Verify each user only sees server-authorized requests and cannot see another clinic's requests. A dentist without clinician approval must not see record-link applicant details and must receive HTTP 403 for the record-link list.
4. Use two real test clinic memberships. Switch between clinics (including a manually altered `?clinic=<unknown>`); the wrong tenant must never be shown. Start editing a record-link decision, switch clinics, and verify the previous form inputs are gone.
5. With two authenticated devices, accept/reject a synthetic booking on one device. Inspect pending requests on the other, then focus the browser tab or use Refresh; the new state should replace old data. Switch filters during a deliberately slow API response to confirm no stale results.
6. Log in to Expo Go with a verified patient account. Navigate to **Account → Profile → My booking updates**. Create a synthetic booking, return the app to the foreground and confirm the new event appears. Toggle email consent in the existing preferences and inspect skipped/queued status after delivery processing. Confirm logout/login as a second patient never shows the previous patient's events.
7. Disconnect the network: pending requests and delivery history should show errors, **not a false 'no notifications' result**. Retry after reconnection. Verify no client-side medical records or access tokens appear in local-storage records or screenshots.
8. Test English/Dari/Pashto direction, large fonts, keyboard focus on web and a small Android screen.

**Limitations:** No WebSocket, background job scheduler in the patient device, native push/SMS, guaranteed delivery, or production compliance certification was added. Foreground periodic revalidation is not instant real-time synchronization. Clinic actions continue to rely on the existing transaction/optimistic revision checks.

## Local update

```powershell
git -C C:\projects\dentist pull --ff-only origin main
```

No new dependencies or migrations expected.
