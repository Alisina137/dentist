# DandanLink Patient Phase D — connected patient features

**Completed implementation scope:** Existing PH14/PH15/PH17/PH18 data and authorization services are connected to fully native Android/iOS Expo Go screens. User flows now match Patient Phase D's notification, family, shared-record, support and verified-review requirements. No new database tables, migrations, packages, SMS, push notifications or clinical permissions were introduced.

## Implemented patient journeys

| Patient feature | Native interaction and server contract | Safety boundary |
| --- | --- | --- |
| Booking updates | Bell shortcut in the main header opens Account → Notifications; account preferences and actual booking email delivery history with All / Sent / Failed filters and **Show older updates**, up to the server's 100 latest entries. Existing AppState foreground refresh retained. | Not a push notification inbox; only genuine backend delivery events, clearly indicates when email is not configured. |
| Family management | Native Members / Requests / My Permissions tabs; load registered members, add/edit legally attested minors, revision-checked remove, invite an independently verified adult, show and accept/decline invitations with explicit consent, and self-revoke adult delegated permission. | Server validates guardian policy/age, rejects stale revision, enforces adult self-acceptance, and never grants access to another person's clinical records by name or relationship. Family updates are in-memory and scoped to the current authenticated user. |
| Clinic shared records | Native Records screen loads real booking clinic choices, record-link requests and individually released clinic summaries/issued receipts. It can request an identity-verified link by clinic patient number after explicit consent and revoke pending/approved links. Clear empty/loading/errors and explanation that a number is not proof. | No medical record is matched automatically. Server independently confirms identity and only returns signed summaries/issued receipts with nonrevoked individual release grants, scoped to the current authenticated user. No client persistent medical storage or bearer URLs. |
| Support | Native Help page provides current public localized FAQ and categories plus private ticket list, new-ticket submission, conversation with staff replies and reply-to-open-case actions. | Existing server removes contact/health details from permitted support content and isolates tickets by requester; client prominently warns not to send PHI. The backend accepts only **origin-less bearer** native ticket creation and replies; browser requests still require trusted Origin. Staff/admin writes do not gain this native exception. |
| Verified public reviews | Approved clinic and dentist Overview sections show real published, moderated verified-visit reviews, their server-calculated count/average, pagination for clinic reviews and a Write Review entry to the existing authenticated native reviews flow. | Public endpoint requires current approved listing, approved published version, nonwithdrawn review; no invented reviews, sample ratings or hidden/pending reviews. |

## Automated validation

- `tests/patient-phase-d-validation.test.mjs`: all native paths and screen wiring; current-account isolation; family/adult permissions; record releases; bounded notification history; public moderation and no invented ratings; native support auth/CORS; localization; no storage of health data.
- `tests/phase18-integration.mjs`: PostgreSQL-backed new native bearer HTTP tests including originating without Origin, forbidden anonymous requests, forbidden untrusted browser Origin, staff/admin mutation guard and ticket ownership. Existing PH18 operations tests still run.
- Existing Phase A–C, PH01–19, Stages G–L tests, monorepo typecheck, Expo Android export, and PostgreSQL HTTP synthetic checks must remain green.

## Operator acceptance on a physical phone (synthetic accounts only)

1. **Sign in as Patient A**, create one real synthetic booking, request confirmation and check that the header Bell opens true email-delivery history. Filter All / Sent / Failed, paginate older history and restart app; see only A's legitimate messages. Repeat for Patient B; no private A history appears.
2. In **Family**, add a synthetic minor with a valid birth date and guardian consent. Edit the minor with revision, remove with confirmation, then try a stale revision: server refuses. Invite an adult to their *own verified* account and accept independently on B's phone. Confirm the adult appears only after acceptance; reject a separate invitation; revoke existing delegation independently.
3. Request a clinic record link using a synthetic booking clinic and explicitly checked consent. Confirm **pending** grants no summaries. Staff separately verifies identity in person and approves; nothing appears until they release a specific signed encounter summary or issued receipt. Open Records, see only those released items. Revoke link; the information disappears upon refresh. Repeat with wrong user / another clinic to confirm strict isolation.
4. Open **Support**; search FAQ and create a nonclinical ticket from Android (native bearer request without Origin). Confirm ticket appears in admin support desk; reply from the admin; patient can read staff response and reply. Ensure no access to another patient's ticket, and that PHI or contact details in support messages are rejected. Resolved ticket remains read-only.
5. Open a published clinic with **no** approved reviews: show honest empty state, not a fake score. Add a review from a real completed synthetic booking; while pending it must not appear publicly; after moderator approval it shows under that clinic (and the correct dentist) with the verified label. Withdraw: public review disappears.
6. Check navigation in **English LTR / Dari RTL / Pashto RTL**, 320dp small-screen width, keyboard-safe scrolling, long names, large text, VoiceOver/TalkBack, slow network, offline retry and switching accounts during pending requests. Verify no raw SQL error, bearer header, clinical notes or private identifiers in logs/URLs.
7. **Pilot gating remains mandatory.** Do not use production medical information until real-world legal, clinical, privacy, accessibility, backup restoration, identity verification and security acceptance is independently evidenced (PH19).

## Pull / local run

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
```

In another terminal after API and tunnel are ready:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

No new dependencies, migrations or environment settings required. `EXPO_PUBLIC_PATIENT_WEB_URL` remains optional for the existing **web-only account security** actions. The new Records and Support sections are native.

**NO-GO:** Passing automated CI is not proof of device visual QA, independent medical or legal authorization, or production release readiness.
