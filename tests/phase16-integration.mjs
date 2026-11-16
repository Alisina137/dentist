import assert from "node:assert/strict";
import {API,request,ok,signup,clinic,dentist} from "./phase07-fixture.mjs";
await import("./phase15-integration.mjs");

// Native clients send Better Auth's signed bearer session in the Authorization
// header rather than relying on browser cookies or an untrusted client userId.
const native=await signup("ph16-native"),other=await signup("ph16-unrelated");
async function nativeFetch(path,method="GET",body,token){
 const response=await fetch(API+path,{method,headers:{
  "origin":"http://localhost:3002",
  ...(token?{"authorization":"Bearer "+token}:{}),
  ...(body===undefined?{}:{"content-type":"application/json"})
 },body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 return {status:response.status,data,headers:response.headers};
}
async function bearerLogin(user){
 const result=await nativeFetch("/api/auth/sign-in/email","POST",{
  email:user.email,password:"Dandan-PH07-Booked#2026"
 });
 ok(result,[200],"PH16 native sign in");
 const token=result.headers.get("set-auth-token");
 assert.ok(token&&token.length>12,"Better Auth must return a signed session token for SecureStore");
 return token;
}
const bearer=await bearerLogin(native);
const session=ok(await nativeFetch("/api/auth/get-session","GET",undefined,bearer),
 [200],"bearer session");
assert.equal(session.user.email,native.email);
const account=ok(await nativeFetch("/v1/patients/me","GET",undefined,bearer),
 [200],"verified native account");
assert.equal(account.registered,false);
const pre=ok(await nativeFetch("/v1/patient-favorites","GET",undefined,bearer),
 [403],"favorites require patient onboarding");
assert.equal(pre.code,"PATIENT_ONBOARDING_REQUIRED");
ok(await nativeFetch("/v1/patients/onboard","POST",{
 preferredName:"PH16 Native Patient",city:"Kabul",termsAccepted:true,
 privacyAcknowledged:true,adultAttested:true,
 termsVersion:account.onboarding.termsVersion,
 privacyVersion:account.onboarding.privacyVersion
},bearer),[201],"native consent onboarding");
ok(await nativeFetch("/v1/patient-favorites","GET"),[401],"guest denied favorites");
const doctors=ok(await request("/v1/team/context","GET",undefined,dentist.session),
 [200],"dentist context");
const providerId=doctors.clinics.find(x=>x.clinicId===clinic.id).membershipId;
ok(await nativeFetch("/v1/patient-favorites","POST",{clinicId:clinic.id},bearer),
 [200],"save published clinic");
ok(await nativeFetch("/v1/patient-favorites","POST",{
 clinicId:clinic.id,dentistId:providerId
},bearer),[200],"save verified dentist");
ok(await nativeFetch("/v1/patient-favorites","POST",{clinicId:clinic.id},bearer),
 [200],"repeat saving clinic is idempotent");
let saved=ok(await nativeFetch("/v1/patient-favorites","GET",undefined,bearer),
 [200],"native favorites persist");
assert.equal(saved.favorites.length,2,"deduplicated clinic plus dentist");
assert.ok(saved.favorites.some(x=>x.dentistId===providerId));
ok(await nativeFetch("/v1/patient-favorites","POST",{
 clinicId:clinic.id,dentistId:"unauthorized-doctor"
},bearer),[404],"no unverified dentist favorite");
const otherToken=await bearerLogin(other);
const otherAccount=ok(await nativeFetch("/v1/patients/me","GET",undefined,otherToken),
 [200],"other account");
ok(await nativeFetch("/v1/patients/onboard","POST",{
 preferredName:"Unrelated PH16 Patient",city:"Kabul",termsAccepted:true,
 privacyAcknowledged:true,adultAttested:true,
 termsVersion:otherAccount.onboarding.termsVersion,
 privacyVersion:otherAccount.onboarding.privacyVersion
},otherToken),[201],"other native onboard");
const isolated=ok(await nativeFetch("/v1/patient-favorites","GET",undefined,otherToken),
 [200],"favorites are account scoped");
assert.equal(isolated.favorites.length,0);
ok(await nativeFetch("/v1/patient-favorites","DELETE",{clinicId:clinic.id},otherToken),
 [200],"other account cannot alter original favorite");
saved=ok(await nativeFetch("/v1/patient-favorites","GET",undefined,bearer),
 [200],"original still has two favorites");
assert.equal(saved.favorites.length,2);
ok(await nativeFetch("/v1/patient-favorites","DELETE",{
 clinicId:clinic.id,dentistId:providerId
},bearer),[200],"remove verified dentist");
saved=ok(await nativeFetch("/v1/patient-favorites","GET",undefined,bearer),
 [200],"clinic favorite remains");
assert.equal(saved.favorites.length,1);
assert.equal(saved.favorites[0].dentistId,null);
// Patient Phase E — authenticated device journey acceptance across two verified
// adult accounts, not just cookie-based PH14/PH15 API assertions.
const aFamily=ok(await nativeFetch("/v1/patients/family","GET",undefined,bearer),
 [200],"patient A reads own family");
const bFamily=ok(await nativeFetch("/v1/patients/family","GET",undefined,otherToken),
 [200],"patient B reads own family");
assert.equal(aFamily.total,0);assert.equal(bFamily.total,0);
const minor=ok(await nativeFetch("/v1/patients/family/minors","POST",{
 displayName:"PH16 synthetic guardian child",relationship:"child",dateOfBirth:"2016-03-01",
 authorizationStatement:true,guardianPolicyVersion:aFamily.policy.guardianPolicyVersion
},bearer),[201],"native guardian creates consented child").member;
assert.equal(minor.memberType,"minor");
assert.equal(ok(await nativeFetch("/v1/patients/family","GET",undefined,otherToken),
 [200],"patient B family remains empty").total,0);
ok(await nativeFetch("/v1/patients/family/"+minor.id,"DELETE",{
 revision:minor.revision
},otherToken),[409],"another patient may not remove A's dependent");
const edited=ok(await nativeFetch("/v1/patients/family/minors/"+minor.id,"PUT",{
 displayName:"PH16 synthetic updated child",relationship:"child",dateOfBirth:"2016-03-01",
 authorizationStatement:true,guardianPolicyVersion:aFamily.policy.guardianPolicyVersion,
 revision:minor.revision
},bearer),[200],"patient A can edit own child").member;
assert.equal(edited.revision,minor.revision+1);
ok(await nativeFetch("/v1/patients/family/minors/"+minor.id,"PUT",{
 displayName:"Stale edit must fail",relationship:"child",dateOfBirth:"2016-03-01",
 authorizationStatement:true,guardianPolicyVersion:aFamily.policy.guardianPolicyVersion,
 revision:minor.revision
},bearer),[409],"stale native family revision denied");

const invite=ok(await nativeFetch("/v1/patients/family/invite-adult","POST",{
 email:other.email,explicitAuthorization:true
},bearer),[202],"patient A invites independently verified adult");
assert.equal(invite.requested,true);
assert.equal(ok(await nativeFetch("/v1/patients/family","GET",undefined,bearer),
 [200],"invitation does not silently authorize B").total,1);
const requests=ok(await nativeFetch("/v1/patients/family/requests","GET",undefined,otherToken),
 [200],"B can see their own invite").requests;
assert.ok(requests.length>0);
const invitation=requests[0].id;
ok(await nativeFetch("/v1/patients/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:true
},bearer),[404,409],"guardian cannot self-accept B's invitation");
ok(await nativeFetch("/v1/patients/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:false
},otherToken),[422],"adult must independently acknowledge authorization");
ok(await nativeFetch("/v1/patients/family/requests/"+invitation+"/decide","POST",{
 decision:"accept",adultConsent:true
},otherToken),[200],"adult B explicitly accepts caregiver authority");
const adult=ok(await nativeFetch("/v1/patients/family","GET",undefined,bearer),
 [200],"A sees independently authorized adult").members.find(m=>m.memberType==="adult");
assert.ok(adult?.id);
assert.ok(ok(await nativeFetch("/v1/patients/family/delegations","GET",undefined,otherToken),
 [200],"B owns their delegation list").delegations.some(d=>d.id===adult.id));
ok(await nativeFetch("/v1/patients/family/delegations/"+adult.id,"DELETE",undefined,otherToken),
 [200],"B can revoke caregiver delegation independently");
assert.ok(!ok(await nativeFetch("/v1/patients/family","GET",undefined,bearer),
 [200],"A can no longer see a revoked adult").members.some(m=>m.id===adult.id));

const beforeRecord=ok(await nativeFetch("/v1/booking/records","GET",undefined,bearer),
 [200],"patient A initial released records");
assert.equal(beforeRecord.releasedOnly,true);
assert.deepEqual(beforeRecord.summaries,[]);
const link=ok(await nativeFetch("/v1/booking/record-links","POST",{
 clinicId:clinic.id,patientNumber:"PH16 SYNTHETIC NOT PROOF",
 explicitConsent:true,identityProofAcknowledged:true
},bearer),[202],"request link with explicit native consent only");
assert.equal(link.state,"pending");
const aLinks=ok(await nativeFetch("/v1/booking/record-links","GET",undefined,bearer),
 [200],"A sees only own link requests");
assert.ok(aLinks.links.some(x=>x.id===link.id&&x.state==="pending"));
assert.ok(!ok(await nativeFetch("/v1/booking/record-links","GET",undefined,otherToken),
 [200],"B cannot enumerate A's link").links.some(x=>x.id===link.id));
assert.deepEqual(ok(await nativeFetch("/v1/booking/records","GET",undefined,bearer),
 [200],"unverified patient number grants no records").summaries,[]);
ok(await nativeFetch("/v1/booking/record-links/"+link.id+"/revoke","POST",{},otherToken),
 [404],"B cannot revoke A's link");
ok(await nativeFetch("/v1/booking/record-links/"+link.id+"/revoke","POST",{},bearer),
 [200],"patient revokes own pending link");

const aTickets=ok(await nativeFetch("/v1/support/tickets/mine","GET",undefined,bearer),
 [200],"native account A support inbox");
const bTickets=ok(await nativeFetch("/v1/support/tickets/mine","GET",undefined,otherToken),
 [200],"native account B support inbox");
assert.deepEqual(aTickets.tickets,[]);assert.deepEqual(bTickets.tickets,[]);
const ticket=ok(await nativeFetch("/v1/support/tickets","POST",{
 category:"booking",title:"Synthetic native patient issue",
 message:"My appointment is pending and I would like to know how confirmation works."
},bearer),[201],"patient A submits safe support ticket");
assert.ok(ok(await nativeFetch("/v1/support/tickets/mine","GET",undefined,bearer),
 [200],"A support list contains ticket").tickets.some(x=>x.id===ticket.id));
assert.ok(!ok(await nativeFetch("/v1/support/tickets/mine","GET",undefined,otherToken),
 [200],"B support list excludes A ticket").tickets.some(x=>x.id===ticket.id));
ok(await nativeFetch("/v1/support/tickets/"+ticket.id,"GET",undefined,otherToken),
 [403],"B cannot read A support conversation");
ok(await nativeFetch("/v1/support/tickets/"+ticket.id+"/messages","POST",{
 message:"Trying to respond from unrelated account."
},otherToken),[403],"B cannot reply to A support ticket");
ok(await nativeFetch("/v1/support/tickets/"+ticket.id+"/messages","POST",{
 message:"Thank you, I will check the booking status in my app."
},bearer),[201],"patient A appends ticket message");
const thread=ok(await nativeFetch("/v1/support/tickets/"+ticket.id,"GET",undefined,bearer),
 [200],"native A can see private conversation");
assert.equal(thread.messages.length,2);
ok(await nativeFetch("/v1/support/tickets","POST",{
 category:"booking",title:"Do not accept PHI",message:"My medical diagnosis needs review."
},bearer),[422],"clinical data blocked from patient support chat");

const privatePaths=["/v1/booking/notifications","/v1/reviews/my",
 "/v1/reviews/my/eligibility","/v1/reviews/my/notices"];
for(const path of privatePaths){
 ok(await nativeFetch(path,"GET",undefined,bearer),[200],"A private native "+path);
 ok(await nativeFetch(path,"GET",undefined,otherToken),[200],"B private native "+path);
 ok(await nativeFetch(path,"GET"),[401],"guest cannot fetch private "+path);
}
ok(await nativeFetch("/v1/patients/family/"+minor.id,"DELETE",{
 revision:edited.revision
},bearer),[200],"guardian revokes minor after journey");
assert.equal(ok(await nativeFetch("/v1/patients/family","GET",undefined,bearer),
 [200],"family returns to empty after revocations").total,0);
const release=ok(await nativeFetch("/v1/public/status"),[200],"release status");
assert.equal(release.nativeBookingEnabled,true);
console.log("PATIENT_PHASE_E_JOURNEY_OK — two verified native bearer users, guarded minor/adult family delegation, released-record proof, support privacy, notifications and reviews");
console.log("PH16_INTEGRATION_OK — signed bearer session, consent, isolated favorites, review checks, removal, startup status");
