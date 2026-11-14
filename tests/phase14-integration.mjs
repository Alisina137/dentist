import assert from "node:assert/strict";
import {API,request,ok,signup,clinic,p1} from "./phase07-fixture.mjs";

const root="/v1/patients",person=await signup("PH14-Patient"),
 adult=await signup("PH14-Adult"),stranger=await signup("PH14-Stranger");
const mine=person.session,yours=adult.session,other=stranger.session;
async function get(route,session=mine){return ok(await request(root+route,"GET",undefined,session),
 [200],"GET "+route)}
async function post(route,body,session=mine,codes=[200,201]){
 return ok(await request(root+route,"POST",body,session),codes,"POST "+route);
}
async function put(route,body,session=mine,codes=[200]){
 return ok(await request(root+route,"PUT",body,session),codes,"PUT "+route);
}
async function del(route,body,session=mine,codes=[200]){
 return ok(await request(root+route,"DELETE",body,session),codes,"DELETE "+route);
}
ok(await request(root+"/me","GET"),[401],"guest cannot read patient portal profile");
const before=await get("/me");assert.equal(before.registered,false);
assert.equal(before.user.email,person.email);
assert.equal(before.user.emailVerified,true);
assert.equal(before.onboarding.accountAndBookingFree,true);
assert.equal(before.publicBookingsEnabled,false);
ok(await request(root+"/family","GET",undefined,mine),[403],
 "verified but not consented user cannot read private patient portal");
ok(await request(root+"/onboard","POST",{
 preferredName:"Patient A",city:"Kabul",phone:null,termsAccepted:true,privacyAcknowledged:true,
 adultAttested:false,termsVersion:before.onboarding.termsVersion,
 privacyVersion:before.onboarding.privacyVersion},mine),[422],
 "a minor cannot mark themselves a guardian by avoiding the explicit adult statement");
ok(await request(root+"/onboard","POST",{
 preferredName:"Patient A",city:"Kabul",termsAccepted:false,privacyAcknowledged:true,
 adultAttested:true,termsVersion:before.onboarding.termsVersion,
 privacyVersion:before.onboarding.privacyVersion},mine),[422],
 "legal consent is required to use patient account");
const onboard=await post("/onboard",{
 preferredName:"Patient A",city:"Kabul",phone:"+93700111222",
 termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
 termsVersion:before.onboarding.termsVersion,privacyVersion:before.onboarding.privacyVersion
},mine,[201]);
assert.equal(onboard.registered,true);
assert.equal(onboard.profile.revision,1);
assert.equal(onboard.profile.phoneVerified,false);
const fresh=await get("/me");assert.equal(fresh.registered,true);
assert.equal(fresh.profile.preferredName,"Patient A");
assert.equal(fresh.user.email,person.email);
ok(await request(root+"/onboard","POST",{
 preferredName:"Again",city:"Kabul",termsAccepted:true,privacyAcknowledged:true,
 adultAttested:true,termsVersion:before.onboarding.termsVersion,
 privacyVersion:before.onboarding.privacyVersion},mine),[409],
 "cannot re-onboard and overwrite accepted terms");
const updated=await put("/me",{preferredName:"Patient Updated",city:"Herat",
 phone:"+93700888777",revision:1});
assert.equal(updated.profile.revision,2);
assert.equal(updated.profile.city,"Herat");
assert.equal(updated.profile.phoneVerified,false);
ok(await request(root+"/me","PUT",{
 preferredName:"Stale",city:"Kabul",revision:1},mine),[409],
 "optimistic revision prevents stale profile overwrite");
ok(await request(root+"/me","PUT",{
 preferredName:"Patient",city:"A",email:"victim@example.test",phone:"999",
 revision:2},mine),[422],"bad contact rejected; no unverified email spoof");
const savedMe=await get("/me");
assert.equal(savedMe.user.email,person.email);
assert.equal(savedMe.profile.city,"Herat");
const preferences=await get("/preferences");
assert.equal(preferences.locale,"fa-AF");
assert.equal(preferences.calendar,"solar_hijri");
assert.equal(preferences.notifications.emailBookings,false);
assert.equal(preferences.notifications.pushEnabled,false);
assert.equal(preferences.notifications.bookingNotificationsReleased,false);
const savePrefs=await put("/preferences",{
 locale:"ps-AF",calendar:"gregorian",
 emailBookings:true,emailUpdates:false,revision:preferences.revision
});
assert.equal(savePrefs.saved,true);
const persistent=await get("/preferences");
assert.equal(persistent.calendar,"gregorian");
assert.equal(persistent.locale,"ps-AF");
assert.equal(persistent.notifications.emailBookings,true);
assert.equal(persistent.notifications.smsEnabled,false);
assert.equal((await get("/me")).user.locale,"ps-AF");
ok(await request(root+"/preferences","PUT",{
 locale:"en",calendar:"solar_hijri",
 emailBookings:true,emailUpdates:true,revision:preferences.revision
},mine),[409],"stale notification preference revision denied");
ok(await request(root+"/preferences","PUT",{
 locale:"invalid",calendar:"gregorian",
 emailBookings:true,emailUpdates:true,revision:persistent.revision
},mine),[422],"invalid locale rejected");

const policy=(await get("/family")).policy;
assert.equal(policy.adultRequiresIndependentAccountAcceptance,true);
assert.equal(policy.clinicRecordAccessViaName,false);
ok(await request(root+"/family/minors","POST",{
 displayName:"Unconsented Child",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:false,guardianPolicyVersion:policy.guardianPolicyVersion
},mine),[422],"guardian attestation required");
ok(await request(root+"/family/minors","POST",{
 displayName:"A Fake Adult",relationship:"child",dateOfBirth:"1980-09-14",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion
},mine),[422],"adults cannot be smuggled into minor authorizations");
ok(await request(root+"/family/minors","POST",{
 displayName:"Future Child",relationship:"child",dateOfBirth:"2041-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion
},mine),[422],"future birth date blocked");
const child=await post("/family/minors",{
 displayName:"My Child",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion
},mine,[201]);
assert.equal(child.member.memberType,"minor");
assert.equal(child.member.authorization,"guardian_attested");
assert.equal(child.member.eligibleForFutureBooking,true);
const childList=await get("/family");
assert.equal(childList.total,1);
assert.equal(childList.members[0].displayName,"My Child");
ok(await request(root+"/family/minors/"+child.member.id,"PUT",{
 displayName:"Hacker",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion,
 revision:child.member.revision},other),[403],
 "another user cannot edit dependent without their own patient onboarding");
const edit=await put("/family/minors/"+child.member.id,{
 displayName:"My Child Revised",relationship:"legal_guardian",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion,
 revision:child.member.revision
});
assert.equal(edit.member.revision,2);
assert.equal(edit.member.relationship,"legal_guardian");
ok(await request(root+"/family/minors/"+child.member.id,"PUT",{
 displayName:"Old data",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion,
 revision:1},mine),[409],"stale child revision denied");

// Adult is a separate verified account and has NOT accepted anything at this point.
const adultDetails=await get("/me",yours);
const adultOnboard=await post("/onboard",{
 preferredName:"Independent Adult",city:"Kabul",phone:null,
 termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
 termsVersion:adultDetails.onboarding.termsVersion,
 privacyVersion:adultDetails.onboarding.privacyVersion
},yours,[201]);
assert.equal(adultOnboard.profile.preferredName,"Independent Adult");
const unknown=await post("/family/invite-adult",{
 email:"unregistered-no-leak-php14@example.test",explicitAuthorization:true
},mine,[202]);
const requested=await post("/family/invite-adult",{
 email:adult.email,explicitAuthorization:true
},mine,[202]);
assert.deepEqual(requested,unknown,"adult email account existence cannot be inferred");
assert.equal((await get("/family")).total,1,
 "outbound adult invitation does not create an active permission");
ok(await request(root+"/family/invitations","GET",undefined,mine),[404],
 "outgoing pending invitations must not leak whether an email exists");
const incoming=await get("/family/requests",yours);
assert.equal(incoming.requests.length,1,"real target account sees private request");
assert.equal(incoming.requests[0].guardianName,"Patient A",
 "guardian display name at email invitation time may differ from updated portal name");
const invitation=incoming.requests[0].id;
ok(await request(root+"/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:true},mine),[409,404],
 "inviter cannot accept adult's authorization on their behalf");
ok(await request(root+"/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:false},yours),[422],
 "adult must expressly consent from independently verified account");
const accepted=await post("/family/requests/"+invitation+"/decide",{
 decision:"accept",adultConsent:true},yours);
assert.equal(accepted.authorized,true);
assert.equal(accepted.status,"accepted");
ok(await request(root+"/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:true},yours),[409],
 "adult cannot replay accepted invitation");
const familyAccepted=await get("/family");
assert.equal(familyAccepted.total,2);
const newAdult=familyAccepted.members.find(x=>x.memberType==="adult");
assert.ok(newAdult);
assert.equal(newAdult.authorization,"independently_confirmed");
assert.equal(newAdult.eligibleForFutureBooking,true);
assert.equal(newAdult.displayName,adult.name);
const delegations=await get("/family/delegations",yours);
assert.equal(delegations.delegations[0].id,newAdult.id);
const revoked=await del("/family/delegations/"+newAdult.id,undefined,yours);
assert.equal(revoked.revoked,true);
assert.equal((await get("/family")).total,1);
assert.equal((await get("/family/delegations",yours)).delegations.length,0);
ok(await request(root+"/family/delegations/"+newAdult.id,"DELETE",undefined,yours),[404],
 "self-revocation cannot be replayed");

const consents=await get("/privacy/consents");
assert.ok(consents.events.some(e=>e.subjectType==="portal_terms"));
assert.ok(consents.events.some(e=>e.subjectType==="family_minor"));
assert.ok(consents.events.some(e=>e.subjectType==="notifications"));
assert.equal(consents.clinicalAccessGrants.length,0);
const exportBundle=await get("/privacy/export");
assert.equal(exportBundle.scope,"patient_portal_only");
assert.equal(exportBundle.account.email,person.email);
assert.ok(exportBundle.family.length>=2);
assert.ok(exportBundle.consentHistory.length>=4);
assert.ok(!JSON.stringify(exportBundle).includes(p1.preferredName),
 "the portal must never export unrelated clinic patient records");
assert.ok(!JSON.stringify(exportBundle).includes("clinic_patient_id"));

const sessions=await get("/security/sessions");
assert.ok(Array.isArray(sessions.sessions));
assert.ok(sessions.sessions.some(x=>x.id&&x.device!==undefined));
const otherSessions=await get("/security/sessions",yours);
const foreignSession=otherSessions.sessions[0]?.id;
assert.ok(foreignSession);
ok(await request(root+"/security/sessions/"+encodeURIComponent(foreignSession),
 "DELETE",undefined,mine),[404],"cannot revoke another patient's auth session");
const revokeOwn=await del("/family/"+child.member.id,{revision:edit.member.revision});
assert.equal(revokeOwn.revoked,true);
assert.equal((await get("/family")).total,0);
ok(await request(root+"/family/"+child.member.id,"DELETE",{revision:edit.member.revision},mine),
 [404,409],"revoked dependent cannot be deleted again");
ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","GET",undefined,mine),
 [403,404],"patient portal account cannot browse clinic clinical registry");
ok(await request(root+"/family/minors","POST",{
 displayName:"Cross-origin",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion
},other),[403],"another unregistered portal user cannot create a minor in a guardian's family");
const cross=await fetch(API+root+"/family/minors",{method:"POST",headers:{
 cookie:mine,origin:"https://untrusted.invalid","content-type":"application/json"
},body:JSON.stringify({
 displayName:"Cross-origin",relationship:"child",dateOfBirth:"2016-02-28",
 authorizationStatement:true,guardianPolicyVersion:policy.guardianPolicyVersion
})});
assert.equal(cross.status,403,"untrusted browser origin denied");
console.log("PH14_INTEGRATION_OK — email-verified onboarding and policy consent, private profile, saved locale/calendar, child guardian authority, verified adult opt-in/revocation, export, sessions, cross-origin and medical-record isolation.");
