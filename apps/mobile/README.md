# DandanLink Patient · Expo Go

The actual patient interface lives in this Expo SDK 57 / React Native application.
The admin and clinic management interfaces are **web only**.

### Start on Windows PowerShell

From repository root:

\`\`\`powershell
pnpm install --frozen-lockfile
pnpm dev:mobile
\`\`\`

Expo prints a QR code (Android phone + Expo Go). It may ask to log in to
Expo first; do so on the command line/app if requested. Select a compatible
SDK 57 Expo Go version on https://expo.dev/go if you see SDK mismatch.
Metro uses port 8081 and tunnel uses @expo/ngrok; both require connectivity.

\`pnpm dev:api\` starts the separate Express backend at http://localhost:4000.
Expo tunnel **does not** expose this API to the device.

To use backend discovery/status from your phone, create \`apps/mobile/.env\`:

\`\`\`dotenv
EXPO_PUBLIC_API_URL=https://YOUR-PUBLIC-API-TUNNEL.example
\`\`\`

Alternatively use \`http://<your-PC-LAN-IP>:4000\` over the same accessible
network and ensure Windows Firewall allows API port 4000. Insecure HTTP
is for development only. Never commit credentials into EXPO_PUBLIC variables.

The mobile interface works without an API configured: it shows honest
unavailable states instead of fake clinics or simulated bookings.
The API connectivity status can be checked under Account.

Navigation: Home, Appointments, Saved and Account.
Localization: Dari (default), Pashto and English with direction-aware
layouts and persistent, non-sensitive preferences in AsyncStorage.
Real patient login, dentist listings and bookings will be added in their
respective product phases; no clinical records should be entered here.

For development-only validation run:

\`\`\`powershell
pnpm --filter @dandanlink/mobile typecheck
pnpm --filter @dandanlink/mobile build
\`\`\`
