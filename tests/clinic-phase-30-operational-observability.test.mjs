import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("apps/api/src/phase30-observability.ts");
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const mod={exports:{}};
new Function("module","exports",compiled)(mod,mod.exports);
const {RedactedOperationalAlerts,backupHeartbeatIssues}=mod.exports;
const time=Date.parse("2026-11-19T12:00:00.000Z");

test("C30-01 surge thresholds, cooldown and bounded diagnostic dimensions",()=>{
 const alerts=[],monitor=new RedactedOperationalAlerts(e=>alerts.push(e));
 const privatePath="/v1/booking/my/SECRET_PERSON_IDENTIFIER?token=SECRET_TOKEN";
 for(let i=0;i<14;i++)monitor.recordHttp(privatePath,409,time+i);
 assert.equal(alerts.length,0);
 monitor.recordHttp(privatePath,409,time+15);
 assert.equal(alerts.length,1);
 assert.equal(alerts[0].code,"conflicts_spike");
 assert.equal(alerts[0].area,"booking");
 for(let i=16;i<50;i++)monitor.recordHttp(privatePath,409,time+i);
 assert.equal(alerts.length,1,"no alert flooding within cooldown");
 const exported=JSON.stringify(alerts);
 assert.doesNotMatch(exported,/SECRET|token|booking\/my|patientId|clinicId/i);
 assert.deepEqual(Object.keys(alerts[0]).sort(),
  ["area","at","code","count","kind","productionClearance","windowSeconds"].sort());
 assert.equal(alerts[0].productionClearance,false);
 assert.equal(alerts[0].count,15);
 monitor.recordHttp(privatePath,409,time+15*60_000+1);
 for(let i=1;i<15;i++)monitor.recordHttp(privatePath,409,time+15*60_000+1+i);
 assert.equal(alerts.length,2,"new full window after cooldown may alert");
});
test("C30-02 classify auth, access, server and readiness without route reflection",()=>{
 const alerts=[],monitor=new RedactedOperationalAlerts(x=>alerts.push(x));
 for(let i=0;i<30;i++)monitor.recordHttp("/api/auth/sign-in/email?password=SECRET",401,time);
 for(let i=0;i<20;i++)monitor.recordHttp("/v1/clinical/clinics/SECRET",403,time);
 for(let i=0;i<3;i++)monitor.recordHttp("/v1/appointments/clinics/SECRET",500,time);
 monitor.recordHttp("/ready",503,time);
 assert.deepEqual(alerts.map(x=>[x.code,x.area]),[
  ["auth_denials_spike","auth"],["permission_denials_spike","clinical"],
  ["api_server_errors","appointments"],["db_readiness_failed","database"]
 ]);
 assert.ok(!JSON.stringify(alerts).includes("SECRET"));
 const before=alerts.length;
 monitor.recordHttp("/v1/clinic/123",200,time);
 monitor.recordHttp("/v1/a0/SECRET",403,time);
 monitor.recordHttp("/unknown/SECRET",401,time);
 monitor.recordHttp("/ready",503,time);
 assert.equal(alerts.length,before);
});
test("C30-03 allowlist worker signals, circuit stability and error-isolation",()=>{
 const alerts=[],monitor=new RedactedOperationalAlerts(e=>alerts.push(e));
 for(const code of [
  "staff_invitation_delivery_failed","notification_delivery_exhausted",
  "notification_queue_stale","notification_transport_unconfigured",
  "notification_worker_failed","backup_heartbeat_missing",
  "backup_stale","restore_verification_stale"
 ])monitor.recordSignal(code,time);
 assert.equal(alerts.length,8);
 monitor.recordSignal("patient@example.com",time);
 monitor.recordSignal("staff_invitation_delivery_failed",time+1000);
 assert.equal(alerts.length,8,"no arbitrary or repeated signal");
 const failing=new RedactedOperationalAlerts(()=>{throw Error("SINK_UNAVAILABLE");});
 assert.doesNotThrow(()=>failing.recordSignal("notification_queue_stale",time));
});
test("C30-04 operator heartbeat is strict and cannot claim production clearance",()=>{
 const doc={
  schemaVersion:1,backupCompletedAt:"2026-11-19T11:00:00.000Z",
  restoreVerifiedAt:"2026-11-01T11:00:00.000Z"
 };
 assert.deepEqual(backupHeartbeatIssues(doc,time),[]);
 assert.deepEqual(backupHeartbeatIssues({...doc,
  backupCompletedAt:"2026-11-18T08:00:00.000Z"},time),["backup_stale"]);
 assert.deepEqual(backupHeartbeatIssues({...doc,
  restoreVerifiedAt:"2026-09-01T11:00:00.000Z"},time),
  ["restore_verification_stale"]);
 assert.deepEqual(backupHeartbeatIssues({
  ...doc,backupCompletedAt:"2026-11-17T00:00:00.000Z",
  restoreVerifiedAt:"2026-09-01T11:00:00.000Z"
 },time),["backup_stale","restore_verification_stale"]);
 for(const bad of [null,{},{
  ...doc,patientEmail:"leak@example.test"
 },{...doc,backupCompletedAt:"2060-01-01T00:00:00.000Z"},
 {...doc,backupCompletedAt:"not-ISO"},
 {...doc,restoreVerifiedAt:null}]){
  assert.deepEqual(backupHeartbeatIssues(bad,time),["backup_heartbeat_invalid"]);
 }
});
test("C30-05 global response handler and worker wiring retain PH19 strict gate",()=>{
 const server=read("apps/api/src/server.ts");
 const worker=read("apps/api/src/booking-notifications.ts");
 const staff=read("apps/api/src/staff-invitations.ts");
 const watchdog=read("apps/api/src/phase30-backup-watchdog.ts");
 const gate=read("apps/api/src/pilot-gate.ts");
 assert.match(server,/res\.once\("finish",\(\)=>operationalAlerts\.recordHttp/);
 assert.match(server,/startBackupWatchdog\(\)/);
 assert.match(server,/stopBackupWatchdog\(\)/);
 assert.match(worker,/notification_delivery_exhausted/);
 assert.match(worker,/notification_queue_stale/);
 assert.match(worker,/COUNT\(\*\)::integer AS total/);
 assert.match(staff,/staff_invitation_delivery_failed/);
 assert.match(watchdog,/DANDANLINK_BACKUP_HEARTBEAT_FILE/);
 assert.doesNotMatch(watchdog,/console\.(log|warn|error)/);
 assert.match(gate,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(gate,/PH19_PENETRATION_TEST_APPROVED/);
});
