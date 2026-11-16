import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const app=read("apps/mobile/App.tsx"),patient=read("apps/mobile/native-patient.tsx");
const family=read("apps/mobile/native-family.tsx"),records=read("apps/mobile/native-records.tsx");
const support=read("apps/mobile/native-support.tsx"),supportApi=read("apps/api/src/support-router.ts");
const reviews=read("apps/mobile/native-public-reviews.tsx");
const reviewApi=read("apps/api/src/patient-review-router.ts");
const bookingApi=read("apps/api/src/patient-booking-router.ts");

test("Patient D: connected care screens are real Account destinations and visible from clinic profiles",()=>{
 for(const marker of [
  'import {NativeFamilyManager} from "./native-family"',
  'import {NativeReleasedRecords} from "./native-records"',
  'import {NativePatientSupport} from "./native-support"',
  'import {NativePublishedReviews} from "./native-public-reviews"',
  'accountSection==="family"?<NativeFamilyManager locale={locale}/>',
  'accountSection==="records"?<NativeReleasedRecords locale={locale} calendar={calendar}/>',
  'accountSection==="support"?<NativePatientSupport locale={locale}/>',
  'accountSection==="security"?',
  'onPress={()=>accountPage("notifications")}',
  'native.account?.registered&&<Pressable',
  '<NativePublishedReviews clinicId={clinicId} locale={ui.locale} onWrite={onReview}/>',
  '<NativePublishedReviews clinicId={clinicId} dentistId={dentistId}',
  'onReview={()=>accountPage("reviews")}'
 ])assert.ok(app.includes(marker),marker);
 assert.ok(!app.includes('accountSection==="records"||accountSection==="security"||accountSection==="support"?'),
  "records and support must no longer be web-only placeholder pages");
});

test("Patient D: native family requests require independent adult consent and current revisions",()=>{
 for(const marker of [
  'auth.account?.registered?auth.account.user.id:null',
  'snapshot?.user===user?snapshot:null',
  'return()=>{live=false}',
  '"/v1/patients/family/requests"',
  '"/v1/patients/family/delegations"',
  '"/v1/patients/family/minors"',
  '"/v1/patients/family/invite-adult"',
  '"PUT",{...payload,revision:editing.revision}',
  '"DELETE",{revision:m.revision}',
  'decision:"accept",adultConsent:true',
  'decision:"decline",adultConsent:true',
  'explicitAuthorization:true',
  'guardianPolicyVersion:live.family.policy.guardianPolicyVersion',
  '"/v1/patients/family/delegations/"+encodeURIComponent(item.id),"DELETE"',
  'Alert.alert(t.remove,t.removeAsk'
 ])assert.ok(family.includes(marker),marker);
 assert.ok(!family.includes("AsyncStorage")&&!family.includes("clinic_encounters"),
  "family permissions must never cache private clinical records");
});

test("Patient D: native records never bypass explicit verified clinic releases",()=>{
 for(const marker of [
  'auth.request<{links:Link[]}>("/v1/booking/record-links")',
  'auth.request<Records>("/v1/booking/records")',
  'auth.request<{appointments:Booking[]}>("/v1/booking/my")',
  'snapshot?.user===user?snapshot:null',
  'identityProofAcknowledged:true',
  'explicitConsent:true',
  '"/v1/booking/record-links/"+encodeURIComponent(row.id)+"/revoke"',
  'view.records.summaries.map(',
  'view.records.receipts.map(',
  'if(!user)return',
  'return()=>{live=false}'
 ])assert.ok(records.includes(marker),marker);
 for(const clause of [
  "l.state='approved'",
  "r.revoked_at IS NULL",
  "r.resource_kind='signed_encounter_summary'",
  "r.resource_kind='issued_receipt'",
  "e.status='signed'",
  "i.status='issued'",
  "identityProofAcknowledged",
  "approved"
 ])assert.ok(bookingApi.includes(clause),clause);
 assert.ok(!records.includes("AsyncStorage")&&!records.includes("SecureStore")&&
  !records.includes("automaticMatching:true"),"released medical records must remain in memory and permission-scoped");
});

test("Patient D: genuine moderation-approved verified public reviews replace invented ratings",()=>{
 for(const marker of [
  '/v1/reviews/public/clinics/',
  '/dentists/',
  'data.source!=="verified_completed_visits"',
  'summary:{count:number;average:number|null}',
  'reviews:page===1?data.reviews',
  'verifiedVisit:true',
  'onWrite:()=>void',
  'setSnapshot(old=>({path',
  'cache:"no-store"'
 ])assert.ok(reviews.includes(marker),marker);
 for(const marker of [
  'r.withdrawn_at IS NULL',
  "v.state='published'",
  "source:\"verified_completed_visits\"",
  'AND r.withdrawn_at IS NULL',
  'await publicListing(clinic)'
 ])assert.ok(reviewApi.includes(marker),marker);
 assert.ok(!reviews.includes("Math.random(")&&!reviews.includes("fakeReviews")&&
  !reviews.includes("AsyncStorage"));
});

test("Patient D: native support sends only verified bearer requests to existing private helpdesk",()=>{
 for(const marker of [
  '"/v1/support/tickets/mine"',
  '"/v1/support/tickets","POST"',
  '"/v1/support/tickets/"+encodeURIComponent(id)+"/messages","POST"',
  '"/v1/support/tickets/"+encodeURIComponent(ticketId)',
  '"/v1/support/public/help"',
  'auth.account?.registered?auth.account.user.id:null',
  'snapshot?.user===user?snapshot:null',
  'setTicketId(null);setDetail(null)',
  'return()=>{live=false}',
  't.privacy',
  'maxLength={2000}'
 ])assert.ok(support.includes(marker),marker);
 for(const marker of [
  'nativePatientWrite',
  'req.path==="/tickets"',
  'req.headers.authorization',
  'const fetchSite=req.headers["sec-fetch-site"]',
  '(!fetchSite||fetchSite==="none")',
  'if(!origin&&bearer&&nativePatientWrite',
  'router.use(opsIdentity)',
  'ticketAccess(req,textId(req.params.ticketId))',
  'requester_id=${req.opsActor!.id}',
  'safeSupportText(req.body?.message'
 ])assert.ok(supportApi.includes(marker),marker);
 assert.ok(!support.includes("clinic_encounters")&&!support.includes("patient_record_releases"),
  "support may not consume private chart or clinic record APIs");
});

test("Patient D: header notification entry respects native auth; actual delivery history is filterable",()=>{
 for(const marker of [
  'accountPage("notifications")',
  '<PatientIcon name="bell" size={24}',
  'accountWords[locale].notifications'
 ])assert.ok(app.includes(marker),marker);
 for(const marker of [
  'auth.request<NotificationFeed>("/v1/booking/notifications")',
  'AppState.addEventListener("change",state=>',
  'const matching=(data?.events||[]).filter(event=>filter==="all"||event.status===filter)',
  'matching.slice(0,visible).map(',
  'setVisible(x=>Math.min(x+8,100))',
  'const view=snapshot?.user===user?snapshot:null',
  'emailConfigured',
  'smsConfigured',
  'pushConfigured',
  'notificationMore:"Show older updates"'
 ])assert.ok(patient.includes(marker),marker);
 assert.ok(!patient.includes("pushEnabled:true"),"do not promise nonintegrated push delivery");
});

test("Patient D: all four new surfaces honor Dari/Pashto/English and avoid storing private data",()=>{
 for(const source of [family,records,support,reviews]){
  assert.ok(source.includes('"fa-AF"')&&source.includes('"ps-AF"')&&source.includes("en"),
   "language-specific content required");
  assert.ok(!source.includes("AsyncStorage")&&!source.includes("localStorage"),
   "no casual persistent storage of sensitive healthcare data");
  assert.ok(!source.includes("console.log("));
 }
});
