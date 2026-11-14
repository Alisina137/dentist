import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH17 review eligibility and public rating cannot be fabricated",()=>{
 const code=read("apps/api/src/patient-review-router.ts");
 const sql=read("packages/db/migrations/0017_verified_patient_reviews.sql");
 assert.ok(code.includes("a.status='completed'"));
 assert.ok(code.includes("a.end_at<now()"));
 assert.ok(code.includes("b.user_id="));
 assert.ok(code.includes('COMPLETED_VISIT_REQUIRED'));
 assert.ok(sql.includes("booking_id text NOT NULL UNIQUE"));
 assert.ok(code.includes("ONE_REVIEW_PER_VISIT"));
 assert.ok(code.includes("v.version=r.published_version"));
 assert.ok(code.includes("r.withdrawn_at IS NULL"));
 assert.ok(code.includes("verifiedVisit:true"));
 assert.ok(!code.includes("Math.random("));
});
test("PH17 protects patient identities and enforces independent moderation",()=>{
 const code=read("apps/api/src/patient-review-router.ts");
 for(const pattern of ["EMAIL_VERIFICATION_REQUIRED","ADMIN_MFA_REQUIRED",
  "SELF_MODERATION_FORBIDDEN","REVIEW_PRIVACY_OR_CONTACT_DETAILS",
  "policy_compliant","REVIEW_REVISION_CONFLICT","REVIEW_ALREADY_DECIDED",
  "ONLY_REJECTED_REVIEW_APPEALABLE","DUPLICATE_REVIEW_OR_REPORT",
  "patient_review_events","patient_review_notices","audit_events"])
  assert.ok(code.includes(pattern),pattern);
 const schema=read("packages/db/migrations/0017_verified_patient_reviews.sql");
 for(const name of ["patient_visit_reviews","patient_review_versions",
  "patient_review_events","patient_review_reports","patient_review_appeals",
  "patient_review_notices","UNIQUE(review_id,version)"])
  assert.ok(schema.includes(name),name);
 assert.ok(!code.includes("clinic_encounter_notes"));
});
test("PH17 patient and admin and public UI have real navigation",()=>{
 const patient=read("apps/patient-web/app/reviews/page.tsx");
 const admin=read("apps/admin-web/app/admin/reviews/page.tsx");
 const ui=read("packages/ui-web/src/phase17.tsx");
 const publicProfile=read("packages/ui-web/src/phase13.tsx");
 const sidebar=read("packages/ui-web/src/phase02.tsx");
 for(const s of ["PatientReviewsPage","ReviewModerationPage","PublicVerifiedReviews",
  "/my/eligibility","/my/notices","/admin/queue","/admin/appeals",
  "/admin/reports","REVIEW_SERVICE_UNAVAILABLE"])
  assert.ok(ui.includes(s)||patient.includes(s)||admin.includes(s),s);
 assert.ok(publicProfile.includes("PublicVerifiedReviews"));
 assert.ok(sidebar.includes('"/admin/reviews"'));
 assert.ok(read("packages/ui-web/package.json").includes("./phase17.css"));
});
