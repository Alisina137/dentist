# DandanLink — Clinic Phase 26
## Native Two-Factor Sign-In, Session Continuity and Privileged Clinic Controls

**Scope:** Complete an authenticated native Clinic / Doctor sign-in for accounts that have **already enrolled** TOTP in the secure clinic website. Replace the prior unconditional `MFA_WEB_REQUIRED` redirect with the standard Better Auth challenge/verification flow while preserving the existing security model.

### Technical design
- The mobile password sign-in posts to the existing `/api/auth/sign-in/email` with native HTTP **`credentials:"include"`**. Better Auth keeps its short-lived, signed **HttpOnly second-factor cookie** inside the operating system network cookie jar; JavaScript never reads `Set-Cookie`, manually builds a `Cookie` header, or stores the challenge cookie in SecureStore/AsyncStorage.
- When Better Auth replies `twoFactorRedirect:true`, the app **does not** read or store a session token. Instead it renders a dedicated polished MFA screen with **Authenticator (6-digit TOTP)** and **single-use recovery code** modes. The code is masked, length-bounded, used only for the verification request, and cleared on completion, cancel, background/lifecycle reset or a failed attempt.
- TOTP submits to `/api/auth/two-factor/verify-totp`; recovery submits to `/api/auth/two-factor/verify-backup-code` with `trustDevice:false`. No trusted-device bypass is enabled. Better Auth is authoritative for signing, challenge expiry, account lockout, backup consumption, session revocation and attempt limits.
- **Only after** receiving a valid full second-factor response and Better Auth Bearer plugin's `set-auth-token` header is the actual signed opaque bearer token stored in `expo-secure-store`. The app then checks `/api/auth/get-session` and `/v1/team/context` before unlocking any Clinic/Doctor workspace.
- MFA challenge UI TTL is **9 minutes**, under the server's normal 10-minute challenge expiry. The user cannot access onboarding, clinic patient records, staff role changes or operations while the factor remains outstanding. Expiry, cancellation, sign-out and account switch clear the incomplete authentication flow.
- All authenticated clinic requests still go through generation-checked bearer transport. No new token type, alternate password API, cached MFA secret, account impersonation or direct role grant is introduced. The Phase 24 `STAFF_MFA_REQUIRED` backend checks still apply independently.

### Practical rollout limitations
- **Native OS cookie jar:** Expo Go/React Native version differences and reverse-proxy configuration may affect the native cookie continuity between password and TOTP requests. CI verifies the native request contract and the actual Better Auth HTTP cookie + signed bearer exchange, **not** that each Android/iOS OS cookie jar behaves identically. Test in real Expo Go Android and iOS before claiming device acceptance. If native cookies are lost, the process **fails closed** instead of granting access. The secure clinic website remains the fallback.
- **Enrollment and recovery setup:** To enroll a new authenticator or regenerate backup codes, use the secure clinic website `/clinic/settings/security`. Native Phase 26 performs authentication using enrolled factors, not new enrollment or credential reset.
- **Protected staff actions:** Owners/managers can use the Phase 24 native staff administration controls only after a correctly established, verified TOTP session. Backend permission and MFA checks never rely on a client-provided flag. A failed second factor must not silently leave a full session.
- **No biometric lock screen** is added in this phase. SecureStore protects the minted session token; the user must still protect access to their handset.
- **PH19 human approvals** for real patient data, clinical production, security and legal/privacy compliance remain **NO-GO**. Use synthetic account/clinic data in testing.

### Testing and acceptance
| ID | Case | Evidence |
| --- | --- | --- |
| C26-01 | Password with enabled 2FA returns temporary redirect and no bearer | Actual Better Auth HTTP integration |
| C26-02 | Native TOTP challenges use the system cookie jar; no JS cookie access | Unit and contract/source checks |
| C26-03 | Six-digit code, single-use recovery code, 9-minute expiry, no trust-device bypass | Unit and source tests |
| C26-04 | Wrong code, rate-limit, expired challenge, cancel, transport failure fail closed | Unit plus manual device/network QA |
| C26-05 | TOTP success mints Better Auth bearer, validates user and clinic context | HTTP integration + native source |
| C26-06 | Replayed challenge rejected | Actual Better Auth HTTP integration |
| C26-07 | Correct permissions still required for staff invite, role, verification and operations | API security regression tests |
| C26-08 | Login and recovery labels are consistent in English/Dari/Pashto | Source tests; RTL device QA pending |
| C26-09 | Real Expo Go Android/iOS cookie continuity, background resume and security screen reader | **Manual device acceptance pending** |
| C26-10 | Independent health/clinical production release approval | **NO-GO pending independent approval** |

### PowerShell development

```powershell
cd C:\projects\dentist
git pull --ff-only origin main
pnpm dev:api
```

In another terminal:

```powershell
cd C:\projects\dentist
pnpm dev:mobile
```

Open **Expo Go SDK 57** → **Clinic / Doctor → Sign In**, enter the account's email/password, then the current authenticator app TOTP. If the account has no enrolled TOTP, enable it first through the secure clinic website. Do not disable MFA to access owner/manager functions.

### Next phase
**Phase 27**: notifications, organization settings, subscription visibility, staff preferences, and remaining mobile account-security controls (with device acceptance of Phase 26 as the first gate).
