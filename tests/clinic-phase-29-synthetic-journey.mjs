/**
 * Clinic Phase 29 — CI-only, real HTTP + PostgreSQL multi-account journey.
 *
 * Uses the established Phase07 SYNTHETIC identity/clinic fixture. Never run
 * against a public/production API or patient database. Output only symbolic
 * check IDs and status codes; no cookies, names, notes, OTPs or patient IDs.
 */
import assert from "node:assert/strict";
import {
 API,request,signup,key,doBooking,fixture,admin,owner,dentist,dentist2,
 reception,assistant,stranger,clinic,unrelated,service,chair,p1,date
} from "./phase07-fixture.mjs";

assert.equal(process.env.NODE_ENV,"test","Phase29 E2E is test-only");
assert.equal(API,"http://localhost:4000","Phase29 must target the local test API");
assert.notEqual(process.env.PH19_PILOT_RELEASE_ENABLED,"true",
 "Never exercise this synthetic journey with the release flag enabled");
const checks=[];
function expect(id,result,status){
 assert.equal(result.status,status,id+" unexpected HTTP status "+result.status);
 checks.push({id,status});
 return result.data;
}
async function get(id,path,session,status=200){
 return expect(id,await request(path,"GET",undefined,session),status);
}
async function post(id,path,body,session,status){
 return expect(id,await request(path,"POST",body,session),status);
}
function noStore(id,reply){
 assert.match(reply.headers.get("cache-control")||"",/no-store/i,id+" must not cache PHI");
}
const cid=clinic.id;
const ap="/v1/appointments/clinics/"+cid;
const cp="/v1/clinical/clinics/"+cid;
const team="/v1/team/clinics/"+cid;
const member=await get("F29-C01","/v1/team/context",owner.session);
assert.equal(member.clinics.find(c=>c.clinicId===cid)?.role,"owner");
const staff=await get("F29-C02",team+"/team",owner.session);
assert.ok(staff.members.length>=5,"expected synthetic team members");
await get("F29-C03",team+"/team",reception.session,403);
await get("F29-C04",team+"/team",stranger.session,404);
await get("F29-C05",team+"/team",admin.session,403);
await get("F29-C06",ap+"/catalog",stranger.session,404);
await get("F29-C07",ap+"/catalog",admin.session,403);
const doctorCtx=await get("F29-C08","/v1/team/context",dentist.session);
const doctorId=doctorCtx.clinics.find(c=>c.clinicId===cid)?.membershipId;
assert.ok(doctorId,"dentist scoped membership missing");
const catalog=await get("F29-C09",ap+"/catalog",dentist.session);
assert.ok(catalog.providers.every(p=>p.membershipId===doctorId),
 "dentist catalog must not show other clinician assignments");
const attemptKey=key();
const appointmentArgs=[cid,reception,p1,service,{membershipId:doctorId},
 chair,date,"09:00",attemptKey];
const created=await doBooking(...appointmentArgs);
const booked=expect("F29-C10",created,201).appointment;
assert.ok(booked?.id&&booked.status==="confirmed","real booked appointment required");
const exactReplay=await doBooking(...appointmentArgs);
assert.equal(expect("F29-C11",exactReplay,200).appointment.id,booked.id,
 "same idempotency key must return same appointment");
const conflicting=await doBooking(cid,reception,p1,service,
 {membershipId:doctorId},chair,date,"09:00",key());
expect("F29-C12",conflicting,409);
const assistantAttempt=await doBooking(cid,assistant,p1,service,
 {membershipId:doctorId},chair,date,"10:00",key());
expect("F29-C13",assistantAttempt,403);
const outsiderAttempt=await doBooking(cid,stranger,p1,service,
 {membershipId:doctorId},chair,date,"10:00",key());
expect("F29-C14",outsiderAttempt,404);
const detail=await request(ap+"/appointments/"+booked.id,"GET",undefined,reception.session);
expect("F29-C15",detail,200);
noStore("F29-C15",detail);
await get("F29-C16",ap+"/appointments/"+booked.id,dentist2.session,404);
await get("F29-C17","/v1/appointments/clinics/"+unrelated.id+
 "/appointments/"+booked.id,owner.session,404);
await get("F29-C18",ap+"/appointments/"+booked.id,stranger.session,404);
const calendar=await get("F29-C19",ap+"/queue?date="+date,reception.session);
assert.ok(calendar.queue.some(a=>a.id===booked.id),"booking not shared with queue");
await get("F29-C20",cp+"/patients/"+p1.id+"/encounters",reception.session,403);
await get("F29-C21",cp+"/patients/"+p1.id+"/encounters",stranger.session,404);
await get("F29-C22",cp+"/patients/"+p1.id+"/encounters",admin.session,403);
const encounters=cp+"/patients/"+p1.id+"/encounters";
const note=await post("F29-C23",encounters,{
 reason:"Synthetic Phase29 clinician-only draft for automated permissions"
},dentist.session,201);
assert.ok(note.id,"clinician draft was not created");
await get("F29-C24",encounters+"/"+note.id,dentist2.session,404);
await get("F29-C25",encounters+"/"+note.id,reception.session,403);
const ownNote=await get("F29-C26",encounters+"/"+note.id,dentist.session);
assert.equal(ownNote.encounter.status,"draft");
fixture(cid,booked.id);
const live=await get("F29-C27",ap+"/appointments/"+booked.id,reception.session);
const arrived=await post("F29-C28",ap+"/appointments/"+booked.id+"/status",{
 status:"arrived",revision:live.appointment.revision,idempotencyKey:key()
},reception.session,200);
assert.equal(arrived.appointment.status,"arrived");
const today=await get("F29-C29",ap+"/queue",reception.session);
assert.ok(today.queue.some(a=>a.id===booked.id&&a.status==="arrived"),
 "check-in must be reflected in live reception queue");

// Separate, verified patient account; no inferred connection to clinic patients.
const patient=await signup("phase29portal");
const before=await get("F29-C30","/v1/patients/me",patient.session);
assert.equal(before.registered,false);
await get("F29-C31","/v1/booking/my",patient.session,403);
await post("F29-C32","/v1/patients/onboard",{
 preferredName:"PH29 synthetic patient",city:"Kabul",
 termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
 termsVersion:before.onboarding.termsVersion,
 privacyVersion:before.onboarding.privacyVersion
},patient.session,201);
const privateBookings=await request("/v1/booking/my","GET",undefined,patient.session);
const patientBookings=expect("F29-C33",privateBookings,200);
noStore("F29-C33",privateBookings);
assert.deepEqual(patientBookings.appointments,[],
 "patient portal must not inherit clinic records based on matching identity");
await get("F29-C34","/v1/booking/notifications",patient.session);
await get("F29-C35",team+"/team",patient.session,404);
await get("F29-C36",ap+"/catalog",patient.session,404);

// Privilege change must immediately invalidate a prior device session.
const assistantCtx=await get("F29-C37","/v1/team/context",assistant.session);
const assistantId=assistantCtx.clinics.find(c=>c.clinicId===cid)?.membershipId;
assert.ok(assistantId,"synthetic assistant membership missing");
await post("F29-C38",team+"/staff/"+assistantId+"/status",{
 action:"suspend",reason:"Phase29 synthetic staff revocation drill"
},owner.session,200);
await get("F29-C39","/v1/team/context",assistant.session,401);
await get("F29-C40",ap+"/catalog",assistant.session,401);
const audit=await get("F29-C41",team+"/security",owner.session);
assert.ok(audit.events.some(e=>e.action==="staff.membership.suspend"),
 "independent audit must retain staff suspension event");
console.info("CLINIC_PHASE29_SYNTHETIC_JOURNEY_PASS: "+
 checks.length+" role/tenant/booking/check-in/clinical/consent/revocation checks; "+
 "symbolic checks only; real-device MFA NOT RUN; PH19 healthcare release remains NO-GO.");
