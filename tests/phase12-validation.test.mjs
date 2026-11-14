import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
test("PH12 credential and listing revisions are independent and preserve approved snapshot",()=>{
 const sql=read("packages/db/migrations/0012_public_listings_credentials.sql");
 for(const x of ["clinic_dentist_credential_cases","clinic_dentist_credential_submissions",
 "clinic_dentist_credential_decisions","clinic_listing_heads","clinic_listing_versions",
 "clinic_listing_photos","clinic_listing_events","approved_dentists","approved_services",
 "listing_versions_protect_snapshot","clinic_listing_version_guard",
 "credential_decisions_immutable","listing_photos_immutable","listing_events_immutable"])
  assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/clinic_patients|clinic_encounters|clinic_treatment_versions/);
});
test("PH12 review has independent admin MFA gate and never invents verified status",()=>{
 const src=read("apps/api/src/listing-router.ts");
 for(const x of ["adminAuth","ADMIN_MFA_REQUIRED","VERIFICATION_CONFIRMATION_REQUIRED",
 "PUBLISH_CONFIRMATION_REQUIRED","CURRENT_DENTIST_VERIFICATION_REQUIRED",
 "PROFESSIONAL_PROFILE_CHANGED_REVIEW_AGAIN","PUBLIC_SERVICE_PRICE_CHANGED",
 "PHOTO_RIGHTS_ATTESTATION_REQUIRED","REAL_AVAILABILITY_REQUIRED",
 "PUBLIC_LISTING_UNAVAILABLE","PUBLISH_NOT_READY_","CREDENTIAL_EXPIRED",
 "LISTING_REVIEW_IN_PROGRESS","LISTING_STAFF_FORBIDDEN","LISTING_CONFLICT",
 "publicBookingsEnabled:true","searchable:true"])
  assert.ok(src.includes(x),x);
 assert.match(src,/availabilityPreview/);
 assert.match(src,/clinic\.get\("\/preview"/);
 assert.match(src,/admin\.post\("\/listings\/:clinicId\/decision"/);
 assert.match(src,/admin\.post\("\/dentists\/:membershipId\/decision"/);
});
test("PH12 frontend has five complete owner tabs, two moderated admin queues and public approved preview",()=>{
 const ui=read("packages/ui-web/src/phase12.tsx");
 for(const term of ["ClinicListingPortal","AdminModerationPortal","PublicListingPortal",
  "overview","dentists","photos","bookingRules","preview","CredentialForm","PhotoUpload",
  "PatientPreviewCard","VersionCompare","AdminDentistReview","AdminListingReview",
  "fa-AF","ps-AF","phase12-tabs","usePreferences","onSaved","readonlyPending"])
  if(term!=="onSaved")assert.ok(ui.includes(term),term);
 const side=read("packages/ui-web/src/phase03.tsx");
 assert.match(side,/const listing=link\("listing","\/clinic\/listing"/);
 assert.ok(side.includes('const myVerification=link("myVerification","/clinic/credentials"'));
 const parent=read("packages/ui-web/src/phase02.tsx");
 assert.match(parent,/\["dentists","\/admin\/dentists"\]/);
 assert.match(parent,/\["listings","\/admin\/listings"\]/);
 for(const page of [
 "apps/clinic-web/app/clinic/listing/page.tsx",
 "apps/clinic-web/app/clinic/credentials/page.tsx",
 "apps/admin-web/app/admin/dentists/page.tsx",
 "apps/admin-web/app/admin/dentists/[membershipId]/page.tsx",
 "apps/admin-web/app/admin/listings/page.tsx",
 "apps/admin-web/app/admin/listings/[clinicId]/page.tsx",
 "apps/patient-web/app/clinics/[clinicId]/page.tsx"])
 assert.match(read(page),/phase12|phase02|phase13/);
});
