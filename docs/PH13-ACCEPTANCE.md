# PH13 — Fast verified dental clinic discovery (P01–P04, F13, AC13)

**Specification**: `docs/DANDANLINK-PRODUCT-SPEC-V1.md`, PH13; P01 Home, P02 Search, P03 Clinic Profile, P04 Dentist Profile; BR-PUB-01/02 and BR-L10N-01. **No PH14 patient account/PH15 booking actions.** Production release still requires documented medical license verification policy, medical advertising/legal review, accessible RTL/phone verification, privacy review and real-time operational validation.

## Actual user journeys and navigation

1. Guest opens patient web `/` (no sign in). Header navigation is **Home, Find Care, About**, with Dari/Pashto/English and Gregorian/Solar Hijri preferences. The landing page has a prominent clinic/dentist/treatment query and editable Kabul city default, real participating specialty chips/city shortcuts and verified Kabul clinic cards. Empty Kabul data is accurately stated, with change-city link; no fake seed cards, ratings, or availability.
2. Search `/search` preserves `q,city,specialty,service,date,maxFee,verified,sort,page,latitude,longitude` in the URL and restores filters. City/specialty/service options come only from the current eligible public index. Service fees use actual **independently approved price snapshots**; unavailable/unknown values are never fabricated. A chosen Gregorian date filters clinics by actual `availabilityPreview` outputs. Names/categories/search results match clinic, verified dentist and public service fields with case-insensitive indexed text search. `Most relevant`, `Name` and `Soonest available` work; `Nearest` only appears after explicit browser geolocation consent. It never blocks city search and coordinates are not stored in user profiles. Search shows real total count and pagination where exact, and transparently warns when a live-schedule evaluation exceeds its bounded scan.
3. Clinic `/clinics/:clinicId`: approved photo gallery, real address/phone, externally openable OpenStreetMap link, scheduled weekday status/hours, specialties, verified dentist cards (link to professional profile), approved services with duration/fee, clinic about/contact, and a **live availability preview** tab with date, service and dentist filters. `Call clinic` is functional and uses the verified public phone. No booking CTA before PH15.
4. Dentist `/clinics/:clinicId/dentists/:dentistId`: approved professional name/specialty/qualifications/clinic affiliation, independently reviewed biography if present, current credential valid-through date, active approved clinic services and live clinic/provider time previews. No invented portrait, spoken languages, professional registry match, reviews, rating or appointment times; phone contact is available.
5. `/about`: how license review, professional credential review, photo rights and public listing moderation work, without falsely promising formal licensure verification by external registries. Links to actual directory and privacy/terms.

UI uses responsive Care design, keyboard labels, empty/error/loading/retry states, dedicated phone filter layout, focus visibility, `aria-selected` tabs, RTL/LTR languages and localized displayed calendar dates. All stored query dates remain unambiguous ISO Gregorian (the calendar picker clearly explains this).

## Data and API

`packages/db/migrations/0013_public_discovery_index.sql`:
- `clinic_public_search_index` contains **only** independently approved clinic names, city, province, reviewed specialty/service/dentist names, bounded public fee, map coordinates and search string. No patient, billing, treatment, private document or clinical text is indexed. GIN trigram search indexes (including name), btree city/fee/province and GIN specialty/service indexes accelerate text and filter queries.
- `refresh_clinic_public_search_index` uses published version snapshots, not owner drafts or pending revisions. Triggers refresh on clinic public revision publication and clinic name/city/province changes, and migration backfills existing approved listings.
- `eligible_clinic_public_search` is a **live safety view**: requires clinic currently approved, subscription effective, approved latest published version and no emergency hide; verified licensed professional identity, unchanged approved draft version and current active clinic affiliation; unexpired credentials; active public service version/fee matches reviewer-approved snapshot; real clinic/provider schedules and chair when needed. Revocation/suspension/hide disables search *without waiting for indexing jobs*.

`apps/api/src/discovery-router.ts` exposes **GET-only, no authentication**:
- `GET /v1/discovery/facets` — current eligible city, province, specialty, service values and actual verified clinic count.
- `GET /v1/discovery/search` — compact reviewed-only cards, city/clinic/dentist/service/category matching, fee, date, sorting, paging, consented distance; returns truthful `totalExact` and `resultsTruncated` metadata when a live-date/soonest evaluation is bounded to 240 candidate clinics. Other search requests paginate in the indexed public view. Includes actual earliest slot **only after schedule/appointment recheck**; cached for 12 seconds for low-bandwidth responsiveness.
- `GET /v1/discovery/clinics/:clinicId` — current independently approved public clinic snapshot and genuine weekly operating hours, with scheduled now status clearly not a guarantee of availability.
- `GET /v1/discovery/clinics/:clinicId/availability?date=&serviceId=&dentistId=` — clinic/date-specific eligible slots derived from PH04/PH06's actual `availabilityPreview`, filtered by approved published clinic service and provider, current notice/horizon and current time. Does **not** return booked patient details, chair resource IDs, private schedule notes or confirm booking. `publicBookingsEnabled:false` until PH15. Server returns `source:live_clinic_schedule` and checkedAt.
- `GET /v1/discovery/clinics/:clinicId/dentists/:dentistId` — verified current affiliated professional with only allowlisted approved public profile fields, clinic offerings and hours.
- PH12 `GET /v1/listings/public/clinics/:id` remains a security gate and is now `searchable:true` for PH13 release; emergency hide/credential revocation/subscription expiration removes both details and image access. No query ever touches clinic patient/encounter/treatment/finance tables.

## Acceptance / QA

`tests/phase13-validation.test.mjs` static guard verifies only approved public index fields, safety view and role/public route separation, all P01–P04 screen routes, RTL assets and responsive layout.

`tests/phase13-integration.mjs` performs PostgreSQL-backed HTTP acceptance after PH12:
- Suspended clinic/revoked credential are absent. Reapproval requires PH02 license review and real admin MFA manual professional credential re-verification.
- Guest city+keyword searches match clinic name, actual dentist name, service name and category/specialty; city exclusion and all-cities work; fee filter uses reviewed AFN price and compound filters persist.
- Search never matches private clinic patient names or exposes credential identifier/private evidence; literal percent is not an SQL wildcard, and test verifies date/price accuracy, real availability payload and both real clinic/dentist details.
- Search pagination, alphabetical/sorted soonest and optional geolocation (cannot sort distance without consent coordinates) work. The clinician's next free slot is checked against booked appointments and clinic schedule; no synthetic slots or booking operations.
- Credential revocation immediately removes the clinic from indexed search, facets, direct profile and public availability.

CI also runs all PH01–PH12 regression integrations, `pnpm test`, `pnpm typecheck`, `pnpm build`, Android Expo export and migration checks.

## Explicitly not released

- **PH14** patient sign-in, profile, dependents, consent and personal history.
- **PH15** self-service booking, holds, confirmations, rescheduling, notifications and shared records.
- **PH17** verified booking-derived ratings/reviews.
- Map provider embedded mode. When no provider is configured, the real latitude/longitude is linked to OpenStreetMap instead of showing a broken map.
- Sponsored placement/rank. Default relevance is review/keyword matching, not paid position.

## Deployment

```powershell
git -C C:\projects\dentist pull --ff-only origin main
cd C:\projects\dentist
pnpm db:migrate
```

No fresh environment secrets are required; the public web uses its existing `NEXT_PUBLIC_API_URL`. Local servers remain API :4000, clinic :3001, admin :3000, patient :3002.
