import assert from "node:assert/strict";
import {API,request,ok,signup,key,admin,owner,dentist,clinic,p1,date} from "./phase07-fixture.mjs";

// Assemble the same moderated, real clinic/dentist/service fixtures as PH13.
// PH13 revokes the credential at its conclusion; PH15 must independently
// restore eligibility before patients can book. No synthetic reservation rows.
await import("./phase13-integration.mjs");
const root="/v1/booking",doctorId=(ok(await request("/v1/team/context","GET",undefined,dentist.session),
 [200],"dentist context").clinics.find(x=>x.clinicId===clinic.id)?.membershipId);
assert.ok(doctorId);
const proof=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
ok(await request("/v1/listings/clinics/"+clinic.id+"/dentists/"+doctorId+"/credentials","POST",{
 credentialType:"Dental professional license",credentialNumber:"PH15-RESTORED-LICENSE",
 validUntil:"2032-11-14",attested:true,evidence:{
  fileName:"ph15-reviewed-proof.pdf",mimeType:"application/pdf",
  contentBase64:proof.toString("base64")}
},dentist.session),[201],"re-submit credential");
ok(await request("/v1/listings/admin/dentists/"+doctorId+"/decision","POST",{
 action:"approve",reason:"Manually reverified dentist qualification and current clinic affiliation",
 reviewBasis:"Re-inspected the license document and professional identity",
 confirmation:"VERIFY"
},admin.session),[200],"PH15 professional verified again");
const listed=ok(await request("/v1/discovery/clinics/"+clinic.id,"GET"),
 [200],"verified clinic is bookable");
assert.equal(listed.publicBookingsEnabled,true);
assert.equal(listed.profile.bookingRules.approvalMode,"manual");
const serviceId=listed.profile.services.find(x=>x.name==="PH12 Public Dental Care")?.id;
assert.ok(serviceId);
const real=ok(await request("/v1/discovery/clinics/"+clinic.id+"/availability?"+
 new URLSearchParams({date,serviceId,dentistId:doctorId}),"GET"),
 [200],"live upcoming clinic appointment slots");
assert.ok(real.slots.length>=2,"need two real slots for original and rescheduled appointments");
const slot=real.slots[0],alternative=real.slots[1];

ok(await request(root+"/my","GET"),[401],"guest cannot see private bookings");
ok(await request(root+"/requests","POST",{
 clinicId:clinic.id,serviceId,dentistId:doctorId,startAt:slot.startAt,
 idempotencyKey:key(),bookingConsent:true
}),[401],"guest cannot book without authentication");

const patient=await signup("ph15-person"),other=await signup("ph15-other");
const onboard=ok(await request("/v1/patients/me","GET",undefined,patient.session),
 [200],"pre-onboarding status");
ok(await request(root+"/requests","POST",{
 clinicId:clinic.id,serviceId,dentistId:doctorId,startAt:slot.startAt,
 idempotencyKey:key(),bookingConsent:true
},patient.session),[403],"verified account needs patient consent onboarding");
const consent={preferredName:"PH15 Online Patient",city:"Kabul",
 termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
 termsVersion:onboard.onboarding.termsVersion,
 privacyVersion:onboard.onboarding.privacyVersion};
ok(await request("/v1/patients/onboard","POST",consent,patient.session),
 [201],"patient onboarding");
const otherInfo=ok(await request("/v1/patients/me","GET",undefined,other.session),
 [200],"other onboarding status");
ok(await request("/v1/patients/onboard","POST",{
 ...consent,preferredName:"Unrelated PH15 Patient",
 termsVersion:otherInfo.onboarding.termsVersion,
 privacyVersion:otherInfo.onboarding.privacyVersion
},other.session),[201],"other patient onboarding");

const payload={clinicId:clinic.id,serviceId,dentistId:doctorId,
 startAt:slot.startAt,idempotencyKey:key(),subjectType:"self",bookingConsent:true};
ok(await request(root+"/requests","POST",{...payload,bookingConsent:false},
 patient.session),[422],"explicit booking consent required");
const created=ok(await request(root+"/requests","POST",payload,patient.session),
 [201],"real manual booking request").booking;
assert.equal(created.status,"requested");
assert.equal(created.approvalMode,"manual");
assert.equal(created.clinicId,clinic.id);
assert.equal(created.priceAfn,850);
assert.equal(created.subjectType,"self");
assert.equal(created.cancellationHours,undefined,"clinic policy is enforced by the API, not patient supplied");
const originalId=created.id;
const same=ok(await request(root+"/requests","POST",payload,patient.session),
 [200],"retry uses booking idempotency instead of duplicates");
assert.equal(same.replayed,true);
assert.equal(same.booking.id,originalId);
ok(await request(root+"/requests","POST",{...payload,startAt:alternative.startAt},
 patient.session),[409],"same idempotency key cannot be reused for other slot");

const invisible=ok(await request(root+"/my/"+created.id,"GET",undefined,other.session),
 [404],"other patient cannot see booking");
assert.equal(invisible.code,"BOOKING_NOT_FOUND");
const own=ok(await request(root+"/my","GET",undefined,patient.session),
 [200],"patient own booked visits");
assert.equal(own.appointments.length,1);
assert.equal(own.appointments[0].id,originalId);
const incoming=ok(await request(root+"/clinics/"+clinic.id+"/requests?state=pending",
 "GET",undefined,owner.session),[200],"clinic incoming requests");
assert.ok(incoming.requests.some(x=>x.id===created.id));
const requestRow=incoming.requests.find(x=>x.id===created.id);
ok(await request(root+"/clinics/"+clinic.id+"/requests/"+created.id+"/decision","POST",
 {action:"accept",revision:requestRow.revision},patient.session),
 [403],"patient may not impersonate clinic scheduler");

const approved=ok(await request(root+"/clinics/"+clinic.id+"/requests/"+created.id+"/decision",
 "POST",{action:"accept",revision:requestRow.revision},owner.session),
 [200],"clinic accepts request into PH06 exclusive shared calendar");
assert.equal(approved.status,"confirmed");
ok(await request(root+"/clinics/"+clinic.id+"/requests/"+created.id+"/decision",
 "POST",{action:"accept",revision:requestRow.revision},owner.session),
 [409],"cannot accept booking twice");
const confirmed=ok(await request(root+"/my/"+created.id,"GET",undefined,patient.session),
 [200],"confirmed state visible in account").booking;
assert.equal(confirmed.status,"confirmed");
assert.equal(confirmed.revision,created.revision+1);

const modified=ok(await request(root+"/my/"+created.id+"/reschedule","POST",{
 startAt:alternative.startAt,reason:"I would prefer the following available appointment slot",
 revision:confirmed.revision
},patient.session),[200],"reschedule succeeds within clinic policy");
assert.equal(modified.status,"confirmed");
assert.equal(modified.startAt,alternative.startAt);
ok(await request(root+"/my/"+created.id+"/reschedule","POST",{
 startAt:slot.startAt,reason:"Stale patient operation should never overwrite new time",
 revision:confirmed.revision
},patient.session),[409],"stale revision refused");

const cancelled=ok(await request(root+"/my/"+created.id+"/cancel","POST",{
 revision:modified.revision,reason:"Patient has made alternative arrangements and needs to cancel"
},patient.session),[200],"cancel confirmed reservation within policy");
assert.equal(cancelled.status,"cancelled");
ok(await request(root+"/my/"+created.id+"/cancel","POST",{
 revision:modified.revision,reason:"Trying to cancel the same booking two times"
},patient.session),[409],"cannot repeatedly cancel");

const preferences=ok(await request("/v1/patients/preferences","GET",undefined,
 patient.session),[200],"notification preferences");
assert.equal(preferences.notifications.smsEnabled,false);
assert.equal(preferences.notifications.pushEnabled,false);
const delivery=ok(await request(root+"/notifications","GET",undefined,patient.session),
 [200],"patient sees status of queued notification events");
assert.ok(delivery.events.length>=3);
assert.equal(delivery.smsConfigured,false);
assert.equal(delivery.pushConfigured,false);
ok(await request(root+"/records","GET",undefined,other.session),
 [200],"unlinked patient record is always empty");

ok(await request(root+"/record-links","POST",{
 clinicId:clinic.id,patientNumber:p1.patientNumber,
 explicitConsent:true,identityProofAcknowledged:true
},patient.session),[202],"request in-person identity proof; no automatic records");
const linkInfo=ok(await request(root+"/record-links","GET",undefined,patient.session),
 [200],"patient gets own link requests");
const link=linkInfo.links.find(l=>l.clinicId===clinic.id);
assert.equal(link.state,"pending");
const recordless=ok(await request(root+"/records","GET",undefined,patient.session),
 [200],"cannot read clinic records by patient number alone");
assert.deepEqual(recordless.summaries,[]);
assert.deepEqual(recordless.receipts,[]);
ok(await request(root+"/clinics/"+clinic.id+"/record-links/"+link.id+"/decision","POST",{
 action:"approve",patientId:p1.id,verifiedInPerson:false,
 method:"in_person_document"
},owner.session),[422],"cannot bypass in-person identity proof");
ok(await request(root+"/clinics/"+clinic.id+"/record-links/"+link.id+"/decision","POST",{
 action:"approve",patientId:p1.id,verifiedInPerson:true,
 method:"in_person_document"
},owner.session),[200],"clinic approves consented verified match");
const stillEmpty=ok(await request(root+"/records","GET",undefined,patient.session),
 [200],"record link alone is NOT an authorization to read history");
assert.deepEqual(stillEmpty.summaries,[]);
assert.deepEqual(stillEmpty.receipts,[]);
ok(await request(root+"/clinics/"+clinic.id+"/record-links/"+link.id+"/releases","POST",{
 operation:"release",kind:"signed_encounter_summary",resourceId:key(),patientApproved:true
},owner.session),[403,404],"unauthorized/nonexistent clinician record denied");
ok(await request(root+"/record-links/"+link.id+"/revoke","POST",{},
 patient.session),[200],"patient can revoke record link");
assert.deepEqual(ok(await request(root+"/records","GET",undefined,patient.session),
 [200],"revocation removes all records").summaries,[]);
console.log("PH15_INTEGRATION_OK — approved clinic, live slot booking, idempotent requests, staff decision, owner isolation, safe cancel/reschedule, notification outbox and explicit record-link proof.");
