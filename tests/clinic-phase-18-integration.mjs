/**
 * Clinic Phase 18: synthetic booking/finance read profiling for CI.
 * Uses only test staff/clinic/patient fixtures and logs numeric timings.
 */
import assert from "node:assert/strict";
import {request,owner,clinic,date} from "./phase07-fixture.mjs";
import {pilotLatencyStats} from "../scripts/clinic-pilot-latency.mjs";

assert.equal(process.env.NODE_ENV,"test");
assert.match(process.env.API_BASE_URL||"http://localhost:4000",/^http:\/\/(?:localhost|127\.0\.0\.1):4000$/);

const paths=[
 ["SCHEDULE","/v1/appointments/clinics/"+clinic.id+"/calendar?from="+date+"&to="+date],
 ["QUEUE","/v1/appointments/clinics/"+clinic.id+"/overview"],
 ["INVOICES","/v1/billing/clinics/"+clinic.id+"/invoices?page=1&status=all"],
 ["FINANCE","/v1/billing/clinics/"+clinic.id+"/overview"]
];

for(const [name,path] of paths){
 const samples=[];
 for(let i=0;i<3;i++){
  const started=performance.now();
  const res=await request(path,"GET",undefined,owner.session);
  samples.push(performance.now()-started);
  assert.equal(res.status,200,name+" synthetic authorized request");
  assert.ok(res.data&&typeof res.data==="object"&&!Array.isArray(res.data));
  assert.match(res.headers.get("cache-control")||"",/no-store/);
 }
 const stats=pilotLatencyStats(samples);
 assert.ok(stats&&Number.isInteger(stats.p95Ms));
 console.info("CLINIC18_"+name+"_P50_MS="+stats.p50Ms+
  " P95_MS="+stats.p95Ms+" MAX_MS="+stats.maxMs+" SAMPLES="+stats.samples);
}
console.info("CLINIC18_AUTHORIZED_SYNTHETIC_READS=OBSERVED_NOT_SLO_CERTIFIED");
console.info("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
