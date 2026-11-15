import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Phase C: all 4 moderation modules share accessible, localized search/sort/pagination",()=>{
 const clinics=read("packages/ui-web/src/phase02.tsx");
 const lists=read("packages/ui-web/src/phase12.tsx");
 const reviews=read("packages/ui-web/src/phase17.tsx");
 const shared=read("packages/ui-web/src/admin-moderation.tsx");
 const css=read("packages/ui-web/src/admin-moderation.css");
 for(const x of ["QueueTools","QueuePager","QueueEmpty"])
  for(const [label,code] of Object.entries({clinics,lists,reviews,shared}))
   assert.ok(code.includes(x),label+" lacks "+x);
 assert.ok(lists.includes("ListingDiff"),"listings need approved vs pending change comparison");
 assert.ok(lists.includes("current_submission_id"),"current professional document should be highlighted");
 assert.ok(clinics.includes("adm-c-history"),"clinic reviews need decision history");
 assert.ok(lists.includes("function Timeline"),"dentists and listings preserve decision history");
 assert.ok(reviews.includes('"/admin/history"'),"review moderation has audit history");
 assert.ok(reviews.includes("setConfirmed(false)"),"each decision must require fresh confirmation");
 assert.ok(reviews.includes("selected?.id===item.id"),"review form bound to selected item");
 assert.ok(reviews.includes("action!==\"approve\"&&reason.trim().length<15"),"policy reason required");
 for(const locale of ["en:",'"fa-AF":','"ps-AF":'])
  assert.ok(shared.includes(locale),locale+" localization");
 for(const key of ["role=\"search\"","aria-label","role=\"status\"","onClear","onSortChange"])
  assert.ok(shared.includes(key),key);
 for(const key of [".adm-c-tools",".adm-c-pager",".adm-c-diff",".adm-c-moderation-card",
  ".adm-c-history","max-width:740px","prefers-reduced-motion"])
  assert.ok(css.includes(key),key);
 assert.match(read("apps/admin-web/app/layout.tsx"),/admin-moderation\.css/);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/admin-moderation\.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/admin-moderation\.css/);
});
test("Phase C: admin API validation keeps status, search, pagination and sorting server-side",()=>{
 const clinic=read("apps/api/src/phase02.ts");
 const listing=read("apps/api/src/listing-router.ts");
 const review=read("apps/api/src/patient-review-router.ts");
 for(const code of [clinic,listing,review]){
  for(const x of ["INVALID_PAGE","INVALID_SORT","pageSize","total"])
   assert.ok(code.includes(x),x+" is required");
 }
 assert.ok(clinic.includes('admin(req)'),"existing platform MFA gate remains");
 assert.ok(listing.includes('adminPage(req)'),"dentist/listing queries share input validation");
 assert.ok(review.includes('moderationPage(req)'),"review queues share input validation");
 assert.ok(review.includes('adminArea.use(identity,admin)'),"MFA-protected moderation access");
 assert.match(review,/adminArea\.get\("\/history"/);
 assert.match(review,/SELECT action,version,occurred_at/);
 assert.doesNotMatch(review.slice(review.indexOf('adminArea.get("/history"'),review.indexOf('adminArea.get("/queue"')),
  /actor_id|owner_user_id|clinic_id|patient_id/);
 for(const code of [clinic,listing,review]){
  assert.ok(code.includes("Cache-Control")||code.includes("noStore(res)")||code.includes("clean(res)"),
   "private list endpoints must not cache");
 }
});
test("Phase C: existing immutable and version-guarded decision workflows are preserved",()=>{
 const clinic=read("apps/api/src/phase02.ts");
 const listing=read("apps/api/src/listing-router.ts");
 const reviews=read("apps/api/src/patient-review-router.ts");
 for(const token of ["STALE_REVISION","clinicReview","CONFIRMATION_REQUIRED"])
  assert.ok(clinic.includes(token),token);
 for(const token of ["STALE_LISTING_REVISION","PUBLISH_CONFIRMATION_REQUIRED","clinic_listing_events"])
  assert.ok(listing.includes(token),token);
 for(const token of ["REVIEW_REVISION_CONFLICT","SELF_MODERATION_FORBIDDEN","patient_review_events"])
  assert.ok(reviews.includes(token),token);
});
