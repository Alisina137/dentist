import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import {runPhase33Smoke} from "../scripts/phase33-public-safety-smoke.mjs";
const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function load(path){
 const js=ts.transpileModule(read(path),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 const mod={exports:{}};
 new Function("module","exports","require",js)(mod,mod.exports,require);
 return mod.exports;
}
const {safeNativeApiPath}=load("apps/mobile/native-safe-path.ts");
const {BoundedReadinessProbe}=load("apps/api/src/phase33-readiness.ts");
const {BoundedShutdown}=load("apps/api/src/phase33-shutdown.ts");
const {productionConfigurationIssues}=load("apps/api/src/production-config.ts");
const syntheticEnv={
 NODE_ENV:"production",API_BASE_URL:"https://api.dandanlink.example.org",
 CLINIC_WEB_URL:"https://clinic.dandanlink.example.org",
 ADMIN_WEB_URL:"https://admin.dandanlink.example.org",
 PATIENT_WEB_URL:"https://patients.dandanlink.example.org",
 BETTER_AUTH_SECRET:"SYNTHETIC_ONLY_27KWVP_U7JZ6WZQCR3TY4_S1R8DKW",
 DATABASE_URL:"postgresql://test:test@db.dandanlink.example.org/test?sslmode=verify-full",
 SMTP_HOST:"smtp.dandanlink.example.org",SMTP_FROM:"Test <test@dandanlink.example.org>",
 SMTP_USER:"synthetic-test-user",SMTP_PASSWORD:"SYNTHETIC_DEMO_NEVER_USE",
 SMTP_PORT:"587",SMTP_SECURE:"false",DEV_SKIP_EMAIL_VERIFICATION:"false",
 PH19_PILOT_RELEASE_ENABLED:"false"
};

test("C33-01 native private bearer URLs reject origin replacement, traversal, encoded separators and fragments",()=>{
 for(const ok of [
  "/v1/booking/my","/v1/booking/requests","/v1/public/plans",
  "/v1/discovery/clinics/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/availability?date=2030-01-01&serviceId=foo",
  "/api/auth/get-session","/api/auth/sign-in/email","/v1/patients/family?limit=10",
  "/v1/booking/my?term=%2Fencoded%2Equery"
 ])assert.equal(safeNativeApiPath(ok),true,ok);
 for(const bad of [
  "https://evil.example.org/v1/me","//evil.example.org/v1/me",
  "http://evil.example.org","/not-v1/foo","/v2/me","/api/other/secret",
  "/v1/foo/../admin","/v1/foo/./bar","/v1/a%2Fb","/v1/a%2e%2e/b",
  "/v1/a%5csecret","/v1/a\\b","/v1/foo#authorization=abc",
  "/v1/foo\r\nAuthorization: abc",null,[],{},1,
  "/v1/x".repeat(900)
 ])assert.equal(safeNativeApiPath(bad),false,String(bad).slice(0,50));
});

test("C33-02 stuck DB cannot stall /ready or flood PostgreSQL connection pool",async()=>{
 let calls=0,finish;
 const p=new Promise(resolve=>{finish=resolve});
 const probe=new BoundedReadinessProbe(()=>{calls++;return p},14);
 const start=Date.now();
 const outcomes=await Promise.all(Array.from({length:20},()=>probe.check()));
 assert.ok(outcomes.every(x=>x===false));
 assert.equal(calls,1,"concurrent readiness requests share one SQL probe");
 assert.ok(Date.now()-start<1500,"bounded response");
 assert.equal(await probe.check(),false,"stuck query must not spawn another");
 assert.equal(calls,1);
 finish();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(await probe.check(),true,"a recovered DB starts a fresh probe");
 assert.equal(calls,2);
});
test("C33-03 transient DB error fails closed and is checked again",async()=>{
 let attempts=0;
 const p=new BoundedReadinessProbe(async()=>{
  if(++attempts===1)throw Error("synthetic postgres outage");
 },100);
 assert.equal(await p.check(),false);
 assert.equal(await p.check(),true);
 assert.equal(attempts,2);
 assert.throws(()=>new BoundedReadinessProbe(async()=>{},0));
});
test("C33-04 shutdown waits for worker + HTTP before DB, and is single-flight",async()=>{
 const steps=[];let resolveWorker;
 const pendingWorker=new Promise(resolve=>{resolveWorker=resolve});
 const drain=new BoundedShutdown({
  stopNewWork:()=>steps.push("stop_new"),
  stopWorker:async()=>{steps.push("wait_worker");await pendingWorker},
  closeHttp:async()=>{steps.push("stop_http")},
  forceHttp:()=>steps.push("force"),
  closeDb:async()=>{steps.push("close_db")}
 },350,30);
 const first=drain.run(),same=drain.run();
 assert.strictEqual(first,same,"repeated SIGTERM should not start another shutdown");
 await new Promise(resolve=>setTimeout(resolve,8));
 assert.equal(steps[0],"stop_new");
 assert.ok(steps.includes("wait_worker")&&steps.includes("stop_http"));
 assert.ok(!steps.includes("close_db"));
 resolveWorker();
 assert.equal(await first,"clean");
 assert.equal(steps.at(-1),"close_db");
 assert.ok(!steps.includes("force"));
});
test("C33-05 abandoned HTTP work forces close after bounded deadline and no false success",async()=>{
 let forced=0,db=0;
 const pending=new Promise(()=>{});
 const drain=new BoundedShutdown({
  stopNewWork:()=>{},
  stopWorker:()=>pending,
  closeHttp:()=>pending,
  forceHttp:()=>{forced++},
  closeDb:()=>{db++}
 },12,12);
 assert.equal(await drain.run(),"timeout");
 assert.equal(forced,1);assert.equal(db,1);
 assert.throws(()=>new BoundedShutdown({stopNewWork:()=>{},
  stopWorker:()=>{},closeHttp:()=>{},forceHttp:()=>{},closeDb:()=>{}},0));
});

test("C33-06 reject unsafe production origins and TLS downgrade configurations",()=>{
 assert.deepEqual(productionConfigurationIssues(syntheticEnv),[]);
 for(const patch of [
  {API_BASE_URL:"https://127.0.0.1"},
  {PATIENT_WEB_URL:"https://192.168.1.5"},
  {CLINIC_WEB_URL:"https://clinic.internal"},
  {ADMIN_WEB_URL:"https://admin.local"},
  {API_BASE_URL:"https://[::1]"},
  {SMTP_PORT:"465",SMTP_SECURE:"false"},
  {SMTP_SECURE:"disabled"}
 ]){
  const issues=productionConfigurationIssues({...syntheticEnv,...patch});
  assert.ok(issues.length>0,JSON.stringify(patch));
  assert.ok(!issues.join(" ").includes(syntheticEnv.BETTER_AUTH_SECRET));
 }
 const mail=read("apps/api/src/mail.ts");
 const outbox=read("apps/api/src/booking-notifications.ts");
 for(const source of [mail,outbox]){
  assert.match(source,/requireTLS\s*:\s*process\.env\.NODE_ENV\s*===?\s*"production"/);
 }
});

test("C33-07 HTTP smoke checks real no-store, unauthenticated denials and nosniff",async()=>{
 const results=[],calls=[];
 const fake=async(url,opts)=>{
  calls.push({url,method:opts.method});
  const pathname=new URL(url).pathname;
  const status=pathname==="/v1/me"||pathname==="/v1/booking/my"?401:200;
  const value=pathname==="/health"?{status:"up"}:pathname==="/ready"?{status:"ready"}:
   pathname==="/v1/public/status"?{product:"DandanLink",pilotReleaseEnabled:false}:
   {code:"AUTH_REQUIRED"};
  return new Response(JSON.stringify(value),{status,headers:{
   "content-type":"application/json; charset=utf-8",
   "x-content-type-options":"nosniff",
   "cache-control":"private, no-store"
  }});
 };
 const result=await runPhase33Smoke("http://127.0.0.1:4000",{
  info:x=>results.push(x),error:x=>results.push(x)
 },fake);
 assert.equal(result,0);
 assert.equal(calls.length,5);
 assert.ok(calls.every(x=>x.method==="GET"));
 assert.ok(results.some(x=>x==="PH33_BOOKING_DENY=PASS"));
 assert.equal(await runPhase33Smoke("http://127.0.0.1:4000/path",
  {info:()=>{},error:()=>{}},fake),2);
 const broken=async(url,opts)=>{
  const response=await fake(url,opts);
  response.headers.delete("cache-control");
  return response;
 };
 assert.equal(await runPhase33Smoke("http://127.0.0.1:4000",
  {info:()=>{},error:()=>{}},broken),2);
});

test("C33-08 Express hardening, readiness drain and native auth/session isolation remain in place",()=>{
 const server=read("apps/api/src/server.ts");
 const worker=read("apps/api/src/booking-notifications.ts");
 const patient=read("apps/mobile/native-auth.tsx");
 const clinic=read("apps/mobile/native-clinic.tsx");
 const gate=read("apps/api/src/pilot-gate.ts");
 for(const flag of [
  'server.headersTimeout=20_000',
  'server.requestTimeout=120_000',
  'server.keepAliveTimeout=5_000',
  'server.maxRequestsPerSocket=100',
  'server.maxHeadersCount=64',
  'new BoundedReadinessProbe(',
  'if(await readiness.check())',
  'new BoundedShutdown({',
  'closeHttp:()=>new Promise<void>',
  'stopWorker:stopBookingNotifications',
  'server.closeIdleConnections()',
  'server.closeAllConnections()',
  'Retry-After',
  'code:"SERVICE_SHUTTING_DOWN"',
  'res.setHeader("Cache-Control","no-store")',
  'app.use(protectHealthWrites)'
 ])assert.ok(server.includes(flag),flag);
 assert.match(worker,/runningTick:Promise<void>\|null/);
 assert.match(worker,/if\(stopping\|\|runningTick\)return/);
 assert.match(worker,/if\(runningTick\)await runningTick/);
 assert.match(patient,/if\(!safeNativeApiPath\(path\)\)/);
 assert.match(clinic,/if\(!safeNativeApiPath\(path\)\)/);
 assert.match(gate,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(gate,/PH19_PENETRATION_TEST_APPROVED/);
});
