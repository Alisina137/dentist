/**
 * Stage L synthetic end-to-end security regression. Runs the PH19 real-DB
 * single-use export / 100 booking contender acceptance test first.
 * Never point this suite at production or real patient data.
 */
import assert from "node:assert/strict";
if(process.env.NODE_ENV!=="test"||
 !process.env.DATABASE_URL?.includes("dandan_test"))
 throw Error("STAGE_L_TEST_DATABASE_REQUIRED");
await import("./phase19-integration.mjs");
const {API,origin,request,ok,owner,admin,dentist,reception,assistant,stranger,clinic,p1}=
 await import("./phase07-fixture.mjs");
const clinicId=clinic.id,patientId=p1.id;
const root="/v1/portability/clinics/"+clinicId;
const headers={origin,"Content-Type":"application/json",cookie:owner.session};
const raw=(path,method="GET",h={},body)=>fetch(API+path,{
 method,redirect:"manual",headers:h,body
});
const deny=(r,code,label)=>{
 assert.equal(r.status,code,label+" expected "+code+" got "+r.status);
 return r;
};
const notCached=r=>assert.match(r.headers.get("cache-control")||"",/no-store/i,
 "private health and identity response must not be cached");

const publicStatus=await raw("/v1/public/status");
deny(publicStatus,200,"safe public status endpoint");
notCached(publicStatus);
assert.ok(publicStatus.headers.get("x-request-id"),"request ID for incident tracing");
const authenticated=await raw("/v1/me","GET",{cookie:owner.session,origin});
deny(authenticated,200,"verified account can read own identity");
notCached(authenticated);
const identity=await authenticated.json();
assert.equal(identity.user.id,owner.id);
assert.ok(!JSON.stringify(identity).includes("passwordHash"));
const session=await raw("/api/auth/get-session","GET",{cookie:owner.session,origin});
deny(session,200,"auth API session endpoint");
notCached(session);
const strangerOrigin=await raw("/v1/me/preferences","PUT",
 {...headers,origin:"https://attacker.example.com"},
 JSON.stringify({locale:"en",calendar:"gregorian"}));
deny(strangerOrigin,403,"cross-origin writes must fail before mutation");
assert.equal((await strangerOrigin.json()).code,"ORIGIN_DENIED");
notCached(strangerOrigin);
const nullOrigin=await raw("/v1/me/preferences","PUT",{...headers,origin:"null"},
 JSON.stringify({locale:"en",calendar:"gregorian"}));
deny(nullOrigin,403,"opaque Origin is not trusted");
const fetchCrossSite=await raw("/v1/me/preferences","PUT",
 {...headers,"sec-fetch-site":"cross-site"},
 JSON.stringify({locale:"en",calendar:"gregorian"}));
deny(fetchCrossSite,403,"cross-site fetch metadata blocks unsafe requests");
const goodOrigin=await raw("/v1/me/preferences","PUT",headers,
 JSON.stringify({locale:"fa-AF",calendar:"solar_hijri"}));
deny(goodOrigin,200,"trusted clinic origin preserves preferences workflow");
const nativeNoOrigin=await raw("/v1/me/preferences","PUT",
 {cookie:owner.session,"Content-Type":"application/json"},
 JSON.stringify({locale:"fa-AF",calendar:"solar_hijri"}));
deny(nativeNoOrigin,200,"native authenticated clients without Origin remain supported");

const malformed=await raw("/v1/me/preferences","PUT",headers,"{invalid json");
deny(malformed,400,"malformed JSON yields typed client error");
const malformedPayload=await malformed.json();
assert.equal(malformedPayload.code,"INVALID_JSON");
assert.ok(malformedPayload.requestId);
notCached(malformed);
const tooLarge=await raw("/v1/me/preferences","PUT",headers,
 JSON.stringify({payload:"x".repeat(19000)}));
deny(tooLarge,413,"oversized JSON rejected safely");
assert.equal((await tooLarge.json()).code,"BODY_TOO_LARGE");
notCached(tooLarge);

ok(await request("/v1/clinical/clinics/"+clinicId+"/patients/"+patientId+"/encounters",
 "GET",undefined,reception.session),[403],"reception cannot read clinical encounters");
ok(await request("/v1/clinical/clinics/"+clinicId+"/patients/"+patientId+"/encounters",
 "GET",undefined,admin.session),[403],"platform administrator cannot read clinic clinical records");
ok(await request("/v1/registry/clinics/"+clinicId+"/patients","GET",undefined,stranger.session),
 [404],"foreign account cannot enumerate patient directory");
ok(await request(root+"/exports","GET",undefined,reception.session),
 [403],"reception cannot list private clinic exports");
ok(await request(root+"/exports","GET",undefined,dentist.session),
 [403],"dentist cannot list private clinic exports");
ok(await request(root+"/exports","GET",undefined,assistant.session),
 [403],"assistant cannot list private clinic exports");
ok(await request("/v1/booking/clinics/"+clinicId+"/notifications","GET",undefined,reception.session),
 [403],"booking delivery audit limited to owner and manager");
ok(await request("/v1/booking/clinics/"+clinicId+"/notifications","GET",undefined,owner.session),
 [200],"owner can view scoped delivery metadata");
const gate=ok(await request("/v1/portability/admin/readiness","GET",undefined,admin.session),
 [200],"admin live readiness");
assert.equal(gate.releaseEnabled,false,"no human go-live approval may be inferred from CI");
console.log("STAGE_L_SECURITY_INTEGRATION_OK — cross-role permissions, no-store, origin guard, malformed/oversized input, PH19 audit/export/concurrency and no-go readiness");
