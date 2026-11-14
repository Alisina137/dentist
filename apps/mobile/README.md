# DandanLink Patient — Expo Go

The native patient experience is an actual Expo SDK 57 / React Native app.
The clinic and admin management tools remain separate websites. The native
interface is built specifically for Dari and Pashto RTL as well as English LTR.

## Run on Windows

In `C:\projects\dentist`:

```powershell
pnpm install --frozen-lockfile
pnpm dev:api
```

In a second terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Open the Expo QR in Expo Go (compatible SDK 57).

### Connect real patient content

Create `apps/mobile/.env` (local only):

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-PUBLIC-API-TUNNEL.example
EXPO_PUBLIC_PATIENT_WEB_URL=https://YOUR-PATIENT-WEB.example
```

`EXPO_PUBLIC_API_URL` is used for **real approved PH13 public clinic
search**, live city/specialty/service facets, approved clinic/gallery/dentist
profiles, hours, prices and **preview-only** candidate schedule slots.
The device must actually reach this API. Expo's Metro tunnel (8081) **does
not** tunnel the backend (4000). If desired, use a reachable LAN IP instead
for local development. Never expose credentials using `EXPO_PUBLIC_` variables.

`EXPO_PUBLIC_PATIENT_WEB_URL` enables opening the secure PH14 patient
website in the external browser for verified account management and family
permissions. Native login and bookings are PH16 and PH15/16 respectively;
the native app must not accept passwords, display clinic medical records,
or claim an unbookable time was reserved.

## Patient navigation

- **Home:** verified clinic recommendations for the selected Afghan city,
  published specialties, genuine search, real availability status.
- **Explore:** search approved clinics/dentists/treatments; city, specialty,
  service and sort filters derived from actual public directory facets.
- **Saved:** on-device, non-sensitive public clinic ID shortcuts (max 30)
  stored in AsyncStorage; each opened clinic is checked against live
  publication eligibility, so suspended or expired profiles cannot be shown.
- **Account:** guest/secure website account link, language, calendar and city
  preferences, network health and how verification works.

Tapping a verified clinic opens its genuine approved **profile,
dentists, treatments, gallery, opening hours and time previews**. Dentist
details include published qualifications and clinic affiliation. Preview
times are **not bookable** until PH15; the user may call the clinic.
There are **no fake reviews, stars, awards, promotions, clinic grades,
rewards, invoices, or unauthorized medical records**.

Language/calendar controls are **only in Account → Preferences**, never the
header. Screens are scrollable, mobile-safe-area aware, and render right-to-left
layout for Dari/Pashto without a global I18nManager restart.

The app behaves honestly when the API is missing/offline, with loading,
retry and empty states rather than placeholder provider records.

## Validation

```powershell
pnpm --filter @dandanlink/mobile typecheck
pnpm --filter @dandanlink/mobile build
```

GitHub CI additionally checks mobile source invariants and exports Android,
then runs public PH13/secure PH14 HTTP regressions.
