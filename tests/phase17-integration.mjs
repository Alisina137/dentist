import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {API,request,ok,signup,key,admin,owner,clinic,dentist,date} from "./phase07-fixture.mjs";
await import("./phase15-integration.mjs");
const require=createRequire(new URL("../packages/db/package.json",import.meta.url));
const postgres=require("postgres");
const db=postgres(process.env.DATABASE_URL,{max:1});
const root="/v1/reviews";
try{
 const listed=ok(await request("/v1/discovery/clinics/"+clinic.id),[200],"published clinic");
 const serviceId=listed.profile.services.find(x=>x.name==="PH12 Public Dental Care")?.id;
 const doctorId=ok(await request("/v1/team/context","GET",undefined,dentist.session),[200],
  "assigned clinician").clinics.find(c=>c.clinicId===clinic.id)?.membershipId;
 assert.ok(serviceId&&doctorId);
 const slots=ok(await request("/v1/discovery/clinics/"+clinic.id+"/availability?"+
  new URLSearchParams({date,serviceId,dentistId:doctorId})),[200],"live time slots").slots;
 assert.ok(slots.length>0);
 const patient=await signup("ph17-author"),outsider=await signup("ph17-outsider");
 for(const user of [patient,outsider]){
  const me=ok(await request("/v1/patients/me","GET",undefined,user.session),[200],"patient onboarding versions");
  ok(await request("/v1/patients/onboard","POST",{
   preferredName:user===patient?"PH17 Author":"PH17 Other",city:"Kabul",termsAccepted:true,
   privacyAcknowledged:true,adultAttested:true,
   termsVersion:me.onboarding.termsVersion,privacyVersion:me.onboarding.privacyVersion
  },user.session),[201],"patient explicit consent");
 }
 const payload={clinicId:clinic.id,serviceId,dentistId:doctorId,
  startAt:slots[0].startAt,idempotencyKey:key(),bookingConsent:true,subjectType:"self"};
 const booked=ok(await request("/v1/booking/requests","POST",payload,patient.session),
  [201],"patient real PH15 booking").booking;
 const candidates=ok(await request("/v1/booking/clinics/"+clinic.id+"/requests?state=pending",
  "GET",undefined,owner.session),[200],"owner pending queue").requests;
 const pending=candidates.find(x=>x.id===booked.id);
 assert.ok(pending);
 ok(await request("/v1/booking/clinics/"+clinic.id+"/requests/"+booked.id+"/decision",
  "POST",{action:"accept",revision:pending.revision},owner.session),[200],"accepted request");
 ok(await request(root+"/my","POST",{bookingId:booked.id,stars:2,
  headline:"Care needed clearer communication",feedback:"I felt the discussion of options was rushed and the waiting period was longer than expected."},
  patient.session),[403],"future appointment cannot be reviewed");
 ok(await request(root+"/my/eligibility","GET",undefined,outsider.session),[200],"other user no review eligibility");
 // A time-shifted completed visit is an isolated test-only fixture. Production
 // transitions are guarded by the existing PH06 appointment status machine.
 await db`UPDATE clinic_appointments SET status='completed',start_at=now()-interval '3 days',
 end_at=now()-interval '3 days'+interval '30 minutes',updated_at=now()
 WHERE id=${booked.appointmentId} AND clinic_id=${clinic.id}`;
 const eligibility=ok(await request(root+"/my/eligibility","GET",undefined,patient.session),
  [200],"completed patient's eligibility").eligible;
 assert.ok(eligibility.some(x=>x.bookingId===booked.id&&x.canReview));
 ok(await request(root+"/my","POST",{bookingId:booked.id,stars:6,
  headline:"Invalid rating",feedback:"This is a long enough text for invalid stars."},
  patient.session),[422],"stars restricted");
 ok(await request(root+"/my","POST",{bookingId:booked.id,stars:1,
  headline:"Invalid contact",feedback:"Call +93700123456 because I was very unhappy with the wait."},
  patient.session),[422],"public contact identifier blocked");
 ok(await request(root+"/my","POST",{bookingId:booked.id,stars:1,
  headline:"Unauthorized visit",feedback:"I was not given enough time to understand the choices I had."},
  outsider.session),[404],"other account cannot review private visit");
 const created=ok(await request(root+"/my","POST",{bookingId:booked.id,stars:2,
  headline:"Communication could improve",feedback:"The appointment started late and communication about the expected wait was not clear."},
  patient.session),[201],"first eligible negative review");
 assert.equal(created.state,"pending");
 const review=created.reviewId;
 ok(await request(root+"/my","POST",{bookingId:booked.id,stars:5,
  headline:"Second attempt",feedback:"A second submission for a completed booking must never succeed."},
  patient.session),[409],"one review per booked visit");
 const hidden=ok(await request(root+"/public/clinics/"+clinic.id),[200],"public pending review hidden");
 assert.equal(hidden.summary.count,0);
 ok(await request(root+"/admin/queue","GET",undefined,patient.session),[403],
  "non-admin denied moderation");
 const queue=ok(await request(root+"/admin/queue","GET",undefined,admin.session),
  [200],"platform review queue").pending;
 const pendingReview=queue.find(x=>x.id===review);
 assert.ok(pendingReview);
 ok(await request(root+"/admin/"+review+"/decision","POST",{
  action:"approve",version:pendingReview.version
 },admin.session),[200],"impartial publication of 2-star negative review");
 ok(await request(root+"/admin/"+review+"/decision","POST",{
  action:"approve",version:pendingReview.version
 },admin.session),[409],"repeat decision conflicts");
 const visible=ok(await request(root+"/public/clinics/"+clinic.id),[200],
  "published review appears");
 assert.equal(visible.summary.count,1);
 assert.equal(visible.summary.average,2);
 assert.equal(visible.reviews[0].verifiedVisit,true);
 assert.ok(!("patientName" in visible.reviews[0]));
 ok(await request(root+"/reports","POST",{reviewId:review,category:"unrelated",
  note:"An unrelated report which should be dismissed under impartial rules."},outsider.session),
  [201],"report from unrelated user queued");
 const reports=ok(await request(root+"/admin/reports","GET",undefined,admin.session),
  [200],"moderation reports").reports;
 const report=reports.find(x=>x.review_id===review);
 assert.ok(report);
 ok(await request(root+"/admin/reports/"+report.id+"/decision","POST",{
  action:"dismiss",reason:"Negative feedback without a clear policy violation is permissible."
 },admin.session),[200],"dismiss report based only on policy");
 assert.equal(ok(await request(root+"/public/clinics/"+clinic.id),[200],
  "published score survives dismissed report").summary.count,1);
 const revised=ok(await request(root+"/my/"+review+"/edit","POST",{
  revision:1,stars:1,headline:"The wait was very long",
  feedback:"The time and administrative information were unclear and I would appreciate more accurate estimates."
 },patient.session),[200],"edited version submitted");
 assert.equal(revised.version,2);
 assert.equal(ok(await request(root+"/public/clinics/"+clinic.id),[200],
  "previous version stays public pending revised review").summary.average,2);
 ok(await request(root+"/admin/"+review+"/decision","POST",{
  action:"reject",version:2,category:"unrelated",
  reason:"This submission needs a clearer relationship to the booked completed appointment."
 },admin.session),[200],"moderation rejects a policy issue with reason");
 const appeal=ok(await request(root+"/my/"+review+"/appeal","POST",{
  reason:"My updated feedback refers to the same completed visit and waiting experience."
 },patient.session),[201],"patient appeals rejection");
 ok(await request(root+"/admin/appeals/"+appeal.id+"/decision","POST",{
  action:"overturn",reason:"This revised feedback is relevant to the verified completed visit."
 },admin.session),[200],"independent appeal upheld in patient's favor");
 assert.equal(ok(await request(root+"/public/clinics/"+clinic.id),[200],
  "appeal restores latest approved version").summary.average,1);
 ok(await request(root+"/my/"+review+"/withdraw","POST",{},patient.session),
  [200],"patient withdrawal removes publication");
 assert.equal(ok(await request(root+"/public/clinics/"+clinic.id),[200],
  "withdrawn reviews do not affect rating").summary.count,0);
 const notices=ok(await request(root+"/my/notices","GET",undefined,patient.session),
  [200],"patient receives private decision codes").notices;
 assert.ok(notices.some(x=>x.code==="published"));
 console.log("PH17_INTEGRATION_OK — real completed booking only, unique review, private author, approval, complaint, appeal and withdrawal.");
}finally{await db.end({timeout:2})}
