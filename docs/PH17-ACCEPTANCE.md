# PH17 — Verified patient reviews and impartial moderation

**Audience:** Patient web and public verified dentist/clinic profiles; platform admin with MFA.

## Review eligibility and privacy

- A patient can submit **one** review only for a **completed and past** PH15 patient-portal booking. Server ownership is checked; no name/email/phone matching creates eligibility. Cancelled, rejected, no-show, pending or future visits are excluded.
- Patients rate 1–5 stars and submit a short headline and constructive feedback; explicit privacy/contact guard rejects obvious email addresses, phone numbers, URLs and medical details. These controls are not a substitute for human PHI review.
- Every new review enters a pending moderation queue. Review versions and decisions are audit-trailed, and the public displays **only approved content**. Previous published versions remain visible while a new edit awaits review.
- Public cards show verified completed-visit proof, headline, stars, feedback, decision date. **No patient names, clinical histories, invoices or treatment notes** are returned. Overall average and count come from actually published versions. With no approved reviews, show count 0 and no stars rather than inventing social proof.

## Moderation and impartiality

- Platform admins must be actively authorized and MFA-verified.
- Moderation decisions are based on specified policy categories: personal_data, clinical_details, harassment, spam and unrelated. Negative or low-star feedback is **not a violation**.
- A review owner cannot moderate their own review; stale/repeated decisions are rejected. Rejected-review appeal requests have an independent approve/overturn workflow, with permanent reasons/events and patient notices.
- Any verified user can flag a published review with a policy category and explanation. Admins may dismiss a report or remove the reported version from public view for a documented policy issue; raw history remains in the moderator audit trail.
- Patient notices are private, durable and code-based; no medical or personal review text is emailed.

## Routes

- Patient: `/reviews` — Completed visits, My Reviews, Updates; submit/edit/withdraw/appeal.
- Public: clinic and dentist detail pages → **Reviews** tab, approved verified ratings only.
- Admin: `/admin/reviews` — Pending reviews, Reports, Appeals; category, reason, approve/reject and decision controls.

API:
- `GET /v1/reviews/public/clinics/:clinicId`, `GET /v1/reviews/public/clinics/:clinicId/dentists/:dentistId`
- `GET /v1/reviews/my/eligibility`, `GET /v1/reviews/my`, `GET /v1/reviews/my/notices`
- `POST /v1/reviews/my`, `POST /v1/reviews/my/:reviewId/edit`, `POST /v1/reviews/my/:reviewId/withdraw`, `POST /v1/reviews/my/:reviewId/appeal`
- `POST /v1/reviews/reports`
- `GET /v1/reviews/admin/queue`, `POST /v1/reviews/admin/:reviewId/decision`
- `GET /v1/reviews/admin/reports`, `POST /v1/reviews/admin/reports/:reportId/decision`
- `GET /v1/reviews/admin/appeals`, `POST /v1/reviews/admin/appeals/:appealId/decision`

All writes validate the current session, target ownership or platform admin permissions, and use PostgreSQL transactions for consistency.

## Development

From `C:\projects\dentist`:

```powershell
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev:api
```

In separate terminals: `pnpm dev:patient:web` and `pnpm dev:admin`. Patient web uses http://localhost:3002, admin web http://localhost:3000. Existing clinic web remains on 3001.

## Testing/acceptance

CI: `pnpm test`, `pnpm typecheck`, `pnpm build`, Android Expo export and `node tests/phase17-integration.mjs` in an isolated PostgreSQL 16 environment after PH15/16 fixtures.

Coverage includes: guest/admin denial, completed-visit requirement, duplicate review prevention, privacy inputs, 1–5 stars, unpublished review invisibility, approval of a legitimate negative review, report dismissal for non-violations, edits retaining approved snapshots, appeal overturn, withdrawal and count updates.

Before using real patient data, PH19 must complete privacy and legal approval, abuse-handling review, additional human clinical-safety inspection, penetration tests, anti-spam/rate-limit review and retention/deletion policy approval. PH17 does not introduce paid placement or buyable review rankings.
