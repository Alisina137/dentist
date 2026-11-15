import assert from "node:assert/strict";
import {request,ok,admin,owner} from "./phase07-fixture.mjs";
// Reuse previously verified synthetic patients, clinics, credential submissions and review decisions.
await import("./phase17-integration.mjs");

const modules=[
 {path:"/v1/admin/clinics",key:"clinics",sortDefault:"newest"},
 {path:"/v1/listings/admin/dentists",key:"dentists",sortDefault:"newest"},
 {path:"/v1/listings/admin/listings",key:"listings",sortDefault:"newest"},
 {path:"/v1/reviews/admin/queue",key:"pending",sortDefault:"oldest"},
 {path:"/v1/reviews/admin/reports",key:"reports",sortDefault:"oldest"},
 {path:"/v1/reviews/admin/appeals",key:"appeals",sortDefault:"oldest"}
];
for(const testCase of modules){
 const endpoint=testCase.path;
 ok(await request(endpoint+"?page=1","GET",undefined,owner.session),[403],
   "clinic owner cannot enumerate private moderation queue: "+endpoint);
 ok(await request(endpoint+"?page=0","GET",undefined,admin.session),[422],
   "reject zero page "+endpoint);
 ok(await request(endpoint+"?page=-1","GET",undefined,admin.session),[422],
   "reject negative page "+endpoint);
 ok(await request(endpoint+"?page=1.5","GET",undefined,admin.session),[422],
   "reject fractional page "+endpoint);
 ok(await request(endpoint+"?sort=arbitrary","GET",undefined,admin.session),[422],
   "reject unapproved sort "+endpoint);
 const firstResponse=await request(endpoint+"?page=1&sort="+testCase.sortDefault,"GET",undefined,admin.session);
 const first=ok(firstResponse,[200],"paginated queue "+endpoint);
 assert.match(firstResponse.headers.get("cache-control")||"",/no-store/,
   "verification details must never be cached");
 assert.ok(Array.isArray(first[testCase.key]),testCase.key);
 assert.ok(Number.isInteger(first.total)&&first.total>=first[testCase.key].length,
   "total derived from DB");
 assert.equal(first.page,1);
 assert.equal(first.pageSize,10);
 assert.ok(first[testCase.key].length<=10);
 const recent=ok(await request(endpoint+"?sort=newest&page=1","GET",undefined,admin.session),
  [200],"newest sort "+endpoint);
 const oldest=ok(await request(endpoint+"?sort=oldest&page=1","GET",undefined,admin.session),
  [200],"oldest sort "+endpoint);
 assert.equal(recent.total,oldest.total,"sort does not change count");
 const empty=ok(await request(endpoint+"?page=99999","GET",undefined,admin.session),
  [200],"empty high page "+endpoint);
 assert.equal(empty[testCase.key].length,0);
 assert.equal(empty.total,first.total);
 const unmatched=ok(await request(endpoint+"?q=unmatched-unique-term-123456-abcdefgh&page=1",
  "GET",undefined,admin.session),[200],"search filtered "+endpoint);
 assert.equal(unmatched[testCase.key].length,0);
 assert.equal(unmatched.total,0);
}
ok(await request("/v1/reviews/admin/history","GET",undefined,owner.session),
 [403],"clinic user denied review audit history");
const historyResponse=await request("/v1/reviews/admin/history","GET",undefined,admin.session);
const history=ok(historyResponse,[200],"MFA admin sees review decision metadata");
assert.match(historyResponse.headers.get("cache-control")||"",/no-store/);
assert.ok(Array.isArray(history.events));
assert.ok(history.events.every(row=>
 Object.keys(row).every(key=>["action","version","at"].includes(key))));
console.log("ADMIN_PHASE_C_OK — 6 paginated/sorted/searched private queues, role denials and safe review history");
