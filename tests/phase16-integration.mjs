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
const release=ok(await nativeFetch("/v1/public/status"),[200],"release status");
assert.equal(release.nativeBookingEnabled,true);
console.log("PH16_INTEGRATION_OK — signed bearer session, consent, isolated favorites, review checks, removal, startup status");
