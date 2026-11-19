import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createHmac,randomUUID} from "node:crypto";
import {mkdtempSync,statSync,chmodSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {readFileSync} from "node:fs";
import ts from "typescript";
const require=createRequire(import.meta.url);
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
function loadTypeScript(name){
 const output=ts.transpileModule(read(name),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 const module={exports:{}};
 new Function("module","exports","require",output)(module,module.exports,require);
 return module.exports;
}
const {
 phase31Configuration,Phase31FileSpool,Phase31AlertQueue,deliverSignedAlert
}=loadTypeScript("apps/api/src/phase31-alert-delivery.ts");
const {RedactedOperationalAlerts}=loadTypeScript("apps/api/src/phase30-observability.ts");
const baseTime=Date.parse("2026-11-19T10:00:00.000Z");
const alert=(code="notification_worker_failed")=>({
 kind:"dandanlink.operational_alert.v1",code,area:"operations",
 count:1,windowSeconds:300,at:new Date(baseTime).toISOString(),
 productionClearance:false
});
const config=()=>({
 DANDANLINK_ALERT_WEBHOOK_URL:"https://alerts.ops-dandan.org/v1/events",
 DANDANLINK_ALERT_WEBHOOK_HOST:"alerts.ops-dandan.org",
 DANDANLINK_ALERT_WEBHOOK_SECRET:"z".repeat(64),
 DANDANLINK_ALERT_SPOOL_FILE:join(tmpdir(),"dandanlink-phase31-synthetic-spool.json")
});

test("C31-01 strict HTTPS target, exact allowlist and signer configuration",()=>{
 assert.deepEqual(phase31Configuration({}).issues,
  ["ALERT_TRANSPORT_UNCONFIGURED"]);
 assert.equal(phase31Configuration(config()).issues.length,0);
 const checks=[
  {DANDANLINK_ALERT_WEBHOOK_URL:"http://alerts.ops-dandan.org/v1/events"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://127.0.0.1/hook",
   DANDANLINK_ALERT_WEBHOOK_HOST:"127.0.0.1"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://localhost/hook",
   DANDANLINK_ALERT_WEBHOOK_HOST:"localhost"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://alerts.ops-dandan.org/hook?token=SECRET"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://alerts.ops-dandan.org/hook#foo"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://other.ops-dandan.org/hook"},
  {DANDANLINK_ALERT_WEBHOOK_URL:"https://test@alerts.ops-dandan.org/hook"},
  {DANDANLINK_ALERT_WEBHOOK_HOST:"alerts.ops-dandan.org.internal"},
  {DANDANLINK_ALERT_WEBHOOK_SECRET:"short"},
  {DANDANLINK_ALERT_WEBHOOK_SECRET:"REPLACE_ME_NOT_REAL_SECURE_0123456789"},
  {DANDANLINK_ALERT_SPOOL_FILE:"./not-absolute"},
  {DANDANLINK_ALERT_WEBHOOK_URL:undefined}
 ];
 for(const change of checks)
  assert.equal(phase31Configuration({...config(),...change}).config,null,
   "invalid transport must be disabled");
});

test("C31-02 alert queue persists BEFORE delivery, retry and ack by eventId",async()=>{
 const spool={jobs:[],load(){return structuredClone(this.jobs);},
  save(jobs){this.jobs=structuredClone(jobs);}};
 const sends=[],outcomes=["retry","ack"];
 const queue=new Phase31AlertQueue(async job=>{
  sends.push(job.id);return outcomes.shift();
 },spool);
 assert.equal(queue.enqueue(alert(),baseTime),true);
 const id=spool.jobs[0].id;
 assert.match(id,/^[a-z0-9-]{36}$/i);
 assert.equal(spool.jobs[0].attempts,0);
 await queue.drain(baseTime);
 assert.equal(queue.snapshot(baseTime).retryScheduled,1);
 assert.equal(spool.jobs[0].attempts,1);
 assert.equal(spool.jobs[0].nextAttemptAt,baseTime+10_000);
 await queue.drain(baseTime+9_000);
 assert.equal(sends.length,1,"no fast duplicate send before backoff");
 await queue.drain(baseTime+10_000);
 assert.deepEqual(sends,[id,id],"same idempotency ID across retries");
 assert.equal(spool.jobs.length,0,"ack removes durable outbox item");
 assert.equal(queue.snapshot(baseTime).delivered,1);
});

test("C31-03 restart replays stable event ID; permanent and exhausted failures handled",async()=>{
 const spool={jobs:[],load(){return structuredClone(this.jobs);},
  save(jobs){this.jobs=structuredClone(jobs);}};
 const first=new Phase31AlertQueue(async()=>"retry",spool);
 assert.equal(first.enqueue(alert(),baseTime),true);
 const id=spool.jobs[0].id;
 const rebooted=new Phase31AlertQueue(async job=>{
  assert.equal(job.id,id);return "ack";
 },spool);
 await rebooted.drain(baseTime);
 assert.equal(spool.jobs.length,0);
 const permanent=new Phase31AlertQueue(async()=>"reject",spool);
 permanent.enqueue(alert("staff_invitation_delivery_failed"),baseTime);
 await permanent.drain(baseTime);
 assert.equal(permanent.snapshot(baseTime).discarded,1);
 assert.equal(spool.jobs.length,0);
 const retry=new Phase31AlertQueue(async()=>"retry",spool);
 retry.enqueue(alert(),baseTime);
 for(let i=0;i<6;i++){
  const when=spool.jobs[0]?.nextAttemptAt;
  assert.ok(Number.isFinite(when));
  await retry.drain(when);
 }
 assert.equal(retry.snapshot(baseTime).discarded,1);
 assert.equal(spool.jobs.length,0,"six non-acknowledgements stop unbounded retry");
});

test("C31-04 capacity, invalid payload and journal write fail closed",()=>{
 const queue=new Phase31AlertQueue(async()=>"ack");
 const bad=[
  {...alert(),patientEmail:"personal@example.org"},
  {...alert(),code:"some_private_opaque_id"},
  {...alert(),area:"clinic-secret-id"},
  {...alert(),productionClearance:true},
  {...alert(),windowSeconds:59},
  {...alert(),at:"not-a-time"}
 ];
 for(const input of bad)assert.equal(queue.enqueue(input,baseTime),false);
 assert.equal(queue.snapshot(baseTime).queued,0);
 for(let i=0;i<128;i++)assert.equal(queue.enqueue(alert(),baseTime),true);
 assert.equal(queue.enqueue(alert(),baseTime),false);
 assert.deepEqual([queue.snapshot(baseTime).queued,queue.snapshot(baseTime).queueFull],
  [128,1]);
 const failingSpool={load:()=>[],save:()=>{throw Error("disk unavailable")}};
 const safe=new Phase31AlertQueue(async()=>"ack",failingSpool);
 assert.throws(()=>safe.enqueue(alert(),baseTime),/disk unavailable/);
 assert.equal(safe.snapshot(baseTime).queued,0,"no unpersisted false accepted event");
});

test("C31-05 atomic private spool survives restart and refuses tampering",()=>{
 const dir=mkdtempSync(join(tmpdir(),"dandan-phase31-")),file=join(dir,"alerts.json");
 try{
  const disk=new Phase31FileSpool(file);
  const q=new Phase31AlertQueue(async()=>"ack",disk);
  q.enqueue(alert(),baseTime);
  const info=statSync(file);
  if(process.platform!=="win32")assert.equal(info.mode&0o077,0);
  const restored=new Phase31AlertQueue(async()=>"ack",new Phase31FileSpool(file));
  assert.equal(restored.snapshot(baseTime).queued,1);
  await restored.drain(baseTime);
  assert.equal(new Phase31FileSpool(file).load().length,0);
  writeFileSync(file,"{not-json",{mode:0o600});
  assert.throws(()=>disk.load(),/SPOOL_SCHEMA_INVALID/);
  if(process.platform!=="win32"){
   chmodSync(file,0o644);
   assert.throws(()=>disk.load(),/SPOOL_PERMISSIONS_UNSAFE/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test("C31-06 signed HTTPS request is redacted, authenticated and redirect-safe",async()=>{
 const cfg=phase31Configuration(config()).config;
 assert.ok(cfg);
 const job={
  id:randomUUID(),alert:alert(),attempts:0,
  createdAt:baseTime,nextAttemptAt:baseTime
 };
 let seen=0;
 const fake=async(url,options)=>{
  seen++;
  assert.equal(url,cfg.url);
  assert.equal(options.redirect,"manual");
  assert.equal(options.method,"POST");
  assert.equal(options.cache,"no-store");
  const document=JSON.parse(options.body);
  assert.deepEqual(Object.keys(document).sort(),["alert","eventId","kind"]);
  assert.equal(document.eventId,job.id);
  const tsHeader=options.headers["X-Dandanlink-Timestamp"];
  const signature=createHmac("sha256",cfg.secret)
   .update(tsHeader+"."+options.body).digest("hex");
  assert.equal(options.headers["X-Dandanlink-Signature"],"sha256="+signature);
  assert.doesNotMatch(options.body,/password|email|patientName|clinicId|SECRET/i);
  return {status:204};
 };
 assert.equal(await deliverSignedAlert(job,cfg,fake),"ack");
 assert.equal(seen,1);
 for(const [status,expected] of [
  [429,"retry"],[503,"retry"],[408,"retry"],
  [401,"reject"],[403,"reject"],[302,"reject"]
 ]){
  assert.equal(await deliverSignedAlert(job,cfg,async()=>({status})),expected);
 }
 assert.equal(await deliverSignedAlert(job,cfg,async()=>{throw Error("OFFLINE")}),"retry");
 assert.equal(await deliverSignedAlert({...job,alert:{...job.alert,privateToken:"SECRET"}},cfg,fake),"reject");
});

test("C31-07 synthetic DB outage/booking conflicts produce safe redacted alerts",()=>{
 const incoming=[],events=new RedactedOperationalAlerts(x=>incoming.push(x));
 events.recordHttp("/ready",503,baseTime);
 for(let i=0;i<15;i++)
  events.recordHttp("/v1/booking/clinics/SECRET_TENANT/requests?id=SECRET_PATIENT",409,baseTime);
 assert.deepEqual(incoming.map(a=>a.code),["db_readiness_failed","conflicts_spike"]);
 assert.deepEqual(incoming.map(a=>a.area),["database","booking"]);
 const q=new Phase31AlertQueue(async()=>"ack");
 for(const event of incoming)assert.equal(q.enqueue(event,baseTime),true);
 assert.doesNotMatch(JSON.stringify(q.snapshot(baseTime)),/SECRET/);
});

test("C31-08 source integration keeps PH19 clinical write gate untouched",()=>{
 const server=read("apps/api/src/server.ts");
 const source=read("apps/api/src/phase30-observability.ts");
 const runtime=read("apps/api/src/phase31-alert-runtime.ts");
 const preflight=read("scripts/phase31-alert-preflight.ts");
 const gate=read("apps/api/src/pilot-gate.ts");
 assert.match(server,/startOperationalAlertDelivery\(\)/);
 assert.match(server,/stopOperationalAlerts\(\)/);
 assert.match(source,/registerOperationalAlertForwarder/);
 assert.match(runtime,/DELIVERY_LAG_EXCEEDS_FIVE_MINUTES/);
 assert.match(runtime,/PRIVATE_SPOOL_NOT_READY/);
 assert.match(preflight,/--send-synthetic/);
 assert.match(preflight,/PH19_ALERTS_APPROVAL=NOT_ESTABLISHED_BY_THIS_PROBE/);
 assert.match(gate,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(gate,/PH19_PENETRATION_TEST_APPROVED/);
});
