# Patient Experience Refresh — reference-driven mobile and patient-web design

**Input:** 23 patient-application screenshots provided by the user on 14 November 2026. These are *design references*, not proof that any depicted backend feature exists in DandanLink. Their source application's information (Pakistan cities, PKR, PMDC-specific claims, ranking labels, years of experience, reviews, free camps and billing) must **not** be copied as DandanLink data.

## Design decisions drawn from the references

| Reference area | DandanLink treatment | Source and data safeguard |
| --- | --- | --- |
| Mobile home / header / bottom tabs | Distinct blue clinical-care header, precise spacing and icons; functional Home, Explore, Saved and Account bottom tabs in Expo. Patient web receives Home, Find Care, Family and Account bottom nav on mobile. | No placeholder Appointments/Rewards/Bills/Reviews tabs before their API phase. Header has no language/calendar selection. |
| Directory / filters / dentist cards | Search by clinic/dentist/treatment, city selection, verified chips, specialty/service filters and sort; real clinic cards with published photo/name/city, actual minimum fee, current verified status and next real preview slot. | All results come from PH13 live gated directory; no Pakistan location defaults, no synthetic recommendations, stars or paid ranking. |
| Clinic profile / tabs / gallery | Approved clinic photo with thumbnails, public contact/address, verified dentists, transparent treatment costs, hours, gallery and real schedule-preview tab. | Do not infer certifications, 'Elite' scores, facility features or 'PMDC verified' claims from unreviewed imagery. Gallery shows only explicitly approved public photos; empty states are honest. |
| Dentist detail | Profile card, published specialty/qualifications/biography, independent credential verification, clinic affiliation, real services and timetable preview. | Do not invent 25 years of practice, ratings, experience or consent to published photos. |
| Booking screenshot / appointment tabs | Seven-day scrollable date selector, service/dentist selection and actual PH04/06 candidate slot times; call clinic CTA; availability disclaimer. | **No native online booking confirmation or appointments list** until PH15/16 implements server-side conflict, consent, patient-guardian authorization, notification and appointment ownership. Slots are explicitly *preview only*. |
| Patient signup and edit profile | Patient web signup adds confirm password; pre-existing email verification, secure onboarding, profile, family, preferences and consent remain real. More polished mobile cards and form rhythm. | Mobile password/session handling deferred until PH16 security review; native Account opens the existing secure PH14 patient website if configured. Do not make phone required just because a third-party screenshot shows it. |
| Saved / family / account | Device-local saved public clinic IDs with live visibility recheck, account web link, persistent Dari/Pashto/English and Solar Hijri/Gregorian settings under Account only. Patient website's Family link uses its existing verified guardian permissions. | No patient records stored in AsyncStorage; native guest data are not falsely represented as a sync'd account. |
| Other screenshot features | Rewards, ratings/reviews, promotions, bills, before/after consent, payment methods, optional gender/DOB/address, gallery photo upload and native appointment workflows may inform product review later. | Not implemented merely as cosmetic UI; each needs product policy, verified source, access control, real data and approval. |

## What is newly implemented

### Expo React Native patient app

- Completely replaces previous static informational prototype with real, approved public directory browsing.
- Home live city results, keyword search, vetted chips, current published clinic cards with correct AFN and next schedule preview.
- Explore result list with actual search/city/specialty/service/sort and page controls. Filters use actual facet values; no fake doctors.
- Clinic detail tabs: Overview, Dentists, Treatments, Gallery, Opening Hours and Availability; published-only images and professionally verified affiliations. Dentist page: Overview, Treatments, Availability.
- Schedule preview has 7-day ribbon with locale-sensitive date display, service/clinician filters, actual candidate slots from PH04/06, and transparent 'not bookable yet' label. No booking API call.
- Save/remove vetted clinic IDs on-device only (up to 30). Opening saved clinics rechecks server eligibility: expired or suspended listings don't display. Network errors are not misreported as revoked profiles.
- Locale/calendar/city preferences persisted in existing non-sensitive AsyncStorage key. No selector in header. Account can open secure PH14 website by `EXPO_PUBLIC_PATIENT_WEB_URL`. No native password storage before PH16.
- Clear offline/configuration, error/retry, loading, empty and back states, safe-area-aware blue header and 4-tab footer.

### Patient website

- Real 4-destination mobile bottom navigation (Home, Find Care, Family, Account) with auth redirects where required.
- Clinic **Gallery** tab from approved public photos (not invented before/after pictures).
- Actual available-date ribbon and collapsible search filters on narrow screens.
- Functional confirm-password and mismatch feedback on patient signup; three-language translations.
- Dedicated patient-only CSS for visual hierarchy, mobile blue header, card proportions, accessible tabs, focus, safe-area and RTL. Clinic/admin websites unchanged.

## Non-goals and follow-up phases

**PH15** must implement real patient booking, patient/guardian verified account permissions, clinic acceptance, cancellations/rescheduling, delivery outbox, and clinic record link proof. Only after those backend flows are proven should the Book Appointment/Appointment History buttons become active.

**PH16** adds secure native patient authentication, account parity, appointment booking, verified account-scoped saved synchronization and notification tokens with consent; this refresh deliberately does **not** attempt to hack around Better Auth or expose PHI from native.

**PH17 and later** require fully genuine reviews/reputation, bills/receipts, campaigns and secure patient records before any equivalent tabs or promotional scoreboards are offered.

## Run and test

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm dev:api
# In another terminal:
pnpm dev:mobile
```

Set `EXPO_PUBLIC_API_URL` to a phone-reachable API URL in `apps/mobile/.env`. Optionally set `EXPO_PUBLIC_PATIENT_WEB_URL` for verified patient-account navigation. No schema migration is needed.

CI executes `tests/patient-experience-validation.test.mjs`, strict TS, all web and Expo builds, Android bundle and PH01–PH14 PostgreSQL HTTP regressions. Manual validation needed on real Android at small/large widths, Expo tunnel + API tunnel, English LTR, Dari/Pashto RTL, Android back behavior, no-network and no-published-clinic cases.
