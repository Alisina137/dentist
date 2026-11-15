import assert from "node:assert/strict";
import {request,ok,admin,owner,clinic} from "./phase07-fixture.mjs";
await import("./phase19-integration.mjs");

const root="/v1/admin/center";
ok(await request(root+"/notices"),[401],"anonymous cannot access platform notification inbox");
for(const endpoint of ["/search?q=PH07","/notices","/monitoring"]){
 ok(await request(root+endpoint,"GET",undefined,owner.session),[403],
  "clinic owner denied platform operations "+endpoint);
}
for(const q of ["x",""])ok(await request(root+"/search?q="+q,"GET",undefined,admin.session),
 [422],"short/empty global search rejected");
ok(await request(root+"/search?q=clinic&category=patients","GET",undefined,admin.session),
 [422],"patient search category explicitly unsupported");
const searched=ok(await request(root+"/search?q=PH07&category=clinics",
 "GET",undefined,admin.session),[200],"MFA admin searches registered clinics");
assert.equal(searched.category,"clinics");
assert.equal(searched.limitedTo,6);
assert.ok(searched.results.some(x=>x.id===clinic.id&&x.category==="clinics"));
assert.ok(searched.results.every(x=>x.href.startsWith("/admin/clinics/")));
const general=ok(await request(root+"/search?q=PH07","GET",undefined,admin.session),
 [200],"MFA administrator searches platform-wide administrative entities");
assert.ok(general.results.length>=1);
assert.ok(general.results.every(x=>Object.keys(x).every(k=>
 ["id","category","title","detail","href"].includes(k))));
assert.ok(general.results.length<=30);
for(const sensitive of ['"patient_id"','"patientName"','"medicalRecord"','"diagnosis"',
 '"requester_id"','"email"','"phone"','"message"']){
 assert.ok(!JSON.stringify(general).includes(sensitive),"search must not leak "+sensitive);
}
const inboxResponse=await request(root+"/notices","GET",undefined,admin.session);
const inbox=ok(inboxResponse,[200],"MFA admin reads live notices");
assert.match(inboxResponse.headers.get("cache-control")||"",/no-store/);
assert.ok(Number.isInteger(inbox.unread));
assert.ok(inbox.notices.every(x=>Object.keys(x).every(k=>
 ["key","kind","severity","count","title","description","href","occurredAt","read"].includes(k))));
ok(await request(root+"/notices/read","POST",{key:"event:not-found-00000000"},owner.session),
 [403],"nonadmin cannot mutate read state");
ok(await request(root+"/notices/read","POST",{key:"bad:injection"},admin.session),
 [422],"malformed notice key rejected");
ok(await request(root+"/notices/read","POST",{key:"event:not-found-00000000"},admin.session),
 [404],"cannot save arbitrary notice keys");
if(inbox.notices.length){
 const first=inbox.notices[0];
 ok(await request(root+"/notices/read","POST",{key:first.key},admin.session),
  [200],"MFA admin acknowledges actual notice");
 const read=ok(await request(root+"/notices","GET",undefined,admin.session),
  [200],"notice acknowledgement persisted");
 assert.equal(read.notices.find(x=>x.key===first.key)?.read,true,
  "read receipts persisted in database across requests");
 assert.equal(read.unread,inbox.unread-(first.read?0:1));
}
const monitorResponse=await request(root+"/monitoring","GET",undefined,admin.session);
const monitor=ok(monitorResponse,[200],"MFA admin sees actual operational health");
assert.match(monitorResponse.headers.get("cache-control")||"",/no-store/);
assert.equal(monitor.timezone,"Asia/Kabul");
assert.ok(monitor.metrics.length>=8);
const keys=monitor.metrics.map(x=>x.key);
for(const name of ["database","outboxPending","outboxDelayed","failedNotices",
 "overduePayments","triageOverdue","firstReplyOverdue","auditFailures"])
 assert.ok(keys.includes(name),name);
assert.ok(monitor.metrics.every(x=>Number.isInteger(x.value)&&x.value>=0));
assert.ok(monitor.trend.every(x=>!Object.keys(x).some(k=>/patient|clinicId|actorId/.test(k))));
assert.match(monitor.launchReadiness,/separate signed approval/);
console.log("ADMIN_PHASE_E_OK — MFA-only global search, persistent notices and live health indicators");
