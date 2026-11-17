/**
 * Clinic Phase 15: read-only HTTP release security smoke tests.
 * Run only against the CI test API/PostgreSQL; no test account, email,
 * patient identifier, protected health data, or database mutation is needed.
 */
import assert from "node:assert/strict";

const API=process.env.API_BASE_URL||"http://localhost:4000";
const id="11111111-1111-4111-8111-111111111111";
async function request(path,method="GET",body,origin){
 const response=await fetch(API+path,{
  method,redirect:"manual",
  headers:{
   Accept:"application/json",
   ...(origin?{Origin:origin}:{}),
   ...(body?{"Content-Type":"application/json"}:{})
  },
  body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(12000)
 });
 const text=await response.text();
 let value={};try{value=JSON.parse(text);}catch{assert.fail("Non-JSON API response");}
 assert.ok((response.headers.get("cache-control")||"").includes("no-store")||
  !path.startsWith("/v1/"),"Sensitive API response must not cache");
 assert.ok(!/at\s+.*\.(ts|js):\d+/.test(text),"No stack traces");
 assert.equal(typeof value,"object","Expected JSON result");
 return {status:response.status,body:value,headers:response.headers};
}
const health=await request("/health");
assert.equal(health.status,200);
assert.equal(health.body.status,"up");
const ready=await request("/ready");
assert.equal(ready.status,200);
assert.equal(ready.body.status,"ready");
const publicStatus=await request("/v1/public/status");
assert.equal(publicStatus.status,200);
assert.equal(publicStatus.body.product,"DandanLink");
assert.equal(typeof publicStatus.body.pilotReleaseEnabled,"boolean");
assert.ok(publicStatus.headers.get("x-request-id"));
const protectedRoutes=[
 "/v1/team/context",
 "/v1/operations/clinics/"+id+"/summary",
 "/v1/team/clinics/"+id+"/security",
 "/v1/booking/clinics/"+id+"/notifications",
 "/v1/appointments/clinics/"+id+"/overview",
 "/v1/insights/clinics/"+id+"/report?from=2026-11-01&to=2026-11-17"
];
for(const path of protectedRoutes){
 const result=await request(path);
 assert.equal(result.status,401,path+" must authenticate before data access");
 assert.equal(result.body.code,"AUTH_REQUIRED",path);
 assert.ok(result.headers.get("x-request-id"),"request ID required");
 assert.ok(!JSON.stringify(result.body).includes("email"));
 assert.ok(!JSON.stringify(result.body).includes("patient"));
 assert.ok(!JSON.stringify(result.body).includes("password"));
}
const forbidden=await request("/v1/appointments/clinics/"+id+"/appointments",
 "POST",{patientId:id,serviceId:id,providerMembershipId:id},
 "https://evil.example.test");
assert.equal(forbidden.status,403);
assert.equal(forbidden.body.code,"ORIGIN_DENIED");
const noAccount=await request("/v1/appointments/clinics/"+id+"/appointments",
 "POST",{patientId:id,serviceId:id,providerMembershipId:id});
assert.equal(noAccount.status,401);
assert.equal(noAccount.body.code,"AUTH_REQUIRED");
console.info("CLINIC_PHASE15_INTEGRATION_OK: health/DB JSON, tenant access denied without staff session, cross-origin write rejected, no-store and request ID enforced.");
