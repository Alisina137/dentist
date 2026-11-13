# PH01 — acceptance and demonstration checklist

## Automation
- [ ] Node tests: locale/calendar validity, tenant-scope deny, admin member+MFA checks and safe redirect.
- [ ] pnpm typecheck across all workspaces.
- [ ] pnpm build for all three Next.js applications.

## Live flows
- [ ] New owner signs up, receives verification and cannot sign in before verifying.
- [ ] After verifying, owner can sign in, refresh, sign out and sign back in.
- [ ] Invalid credentials, duplicate email, expired link and reset token produce safe UI states.
- [ ] Password reset works and revokes previous sessions.
- [ ] Nonadmin user gets 403 on admin API and admin page.
- [ ] Admin grant only succeeds for the explicitly authorized verified user.
- [ ] Admin MFA enrollment, enrollment confirmation, invalid code and new-login challenge are enforced.
- [ ] Locale switching actually mirrors UI; persisted Dari/Pashto RTL and English LTR.
- [ ] Afghan Solar Hijri and Gregorian displays format correctly without shifting dates.
- [ ] Phone (320–430px), tablet, desktop and 200% zoom have no clipped critical controls.
- [ ] Keyboard focus, labels, errors, navigation/back routes and recovery states work.
- [ ] /ready returns 200 with DB and 503 on DB outage.
- [ ] No route reveals patient/clinical data or pretends booking/subscriptions are active.

Only label PH01 COMPLETE AND VERIFIED once relevant live checks have actually passed. Until then use IMPLEMENTED — VERIFICATION PENDING.
