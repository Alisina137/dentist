import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {checkOrigin} from "../scripts/clinic-quality-preflight.mjs";
import {probeUnauthenticatedEndpoint,runPilotPreflight}
 from "../scripts/clinic-pilot-preflight.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const model=read("packages/ui-web/src/clinic-pilot-readiness-model.ts");
const quality=read("packages/ui-web/src/clinic-quality.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-pilot-readiness.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const gate=read("apps/api/src/pilot-gate.ts");
const server=read("apps/api/src/server.ts");
const staffApi=read("apps/api/src/staff-management.ts");
const preflight=read("scripts/clinic-pilot-preflight.mjs");
const pkg=JSON.parse(read("package.json"));
const loaded={exports:{}};
new Function("exports","module",ts.transpileModule(model,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText)(loaded.exports,loaded);
const {pilotSignal,pilotReviewControls,pilotControlLabel,pilotAuditSignal}=loaded.exports;
const id="11111111-1111-4111-8111-111111111111";

function auditRow(i,outcome="success"){
 return {id:"event-"+i,action:"staff.role.changed",outcome,
  createdAt:"2026-11-17T09:00:00Z",actorId:"PRIVATE_ACTOR",
  subjectId:"PRIVATE_MEMBER"};
}
function mockResponse(value,status=200,extra={}){
 return new Response(JSON.stringify(value),{
  status,headers:{"content-type":"application/json; charset=utf-8",
   ...(status===401?{"cache-control":"private, no-store",
    "x-request-id":"abc12345-def456"}:{}),...extra}
 });
}
function fakeApi({pilot=false,bypass=false,invalidJson=false}={}){
 const hits=[];
 const fetcher=async(url,options)=>{
  hits.push({url,options});
  const p=new URL(url).pathname;
  if(p==="/health")return mockResponse({status:"up"});
  if(p==="/ready")return mockResponse({status:"ready"});
  if(p==="/v1/public/status")return invalidJson?
   new Response("<html>ngrok</html>",{status:200,headers:{"content-type":"text/html"}}):
   mockResponse({product:"DandanLink",pilotReleaseEnabled:pilot});
  return bypass?mockResponse({otherClinic:"private"},200):
   mockResponse({code:"AUTH_REQUIRED"},401);
 };
 return {hits,fetcher};
}

test("Clinic Phase 16: independently evidenced pilot controls are complete, immutable and never automatically approved",()=>{
 assert.equal(pilotReviewControls.length,9);
 assert.equal(new Set(pilotReviewControls.map(x=>x.id)).size,9);
 assert.deepEqual(pilotReviewControls.map(x=>x.id),[
  "legalPrivacy","clinicalReview","hostingEncryption","backupRestore",
  "penetrationTest","accessReview","criticalAlerts","accessibilityRTL","pilotRoster"]);
 assert.ok(pilotReviewControls.every(x=>x.en&&x.fa&&x.ps));
 assert.equal(pilotControlLabel("backupRestore","en"),
  "Independent backup and restore drill");
 assert.ok(pilotControlLabel("clinicalReview","fa-AF").includes("طبی"));
 assert.ok(pilotControlLabel("pilotRoster","ps-AF").includes("کلینیکونو"));
 assert.equal(pilotSignal({product:"DandanLink",pilotReleaseEnabled:false}),"blocked");
 assert.equal(pilotSignal({product:"DandanLink",pilotReleaseEnabled:true}),
  "operator_marked_requires_evidence");
 assert.equal(pilotSignal({product:"Other",pilotReleaseEnabled:true}),"unverified");
 assert.equal(pilotSignal({pilotReleaseEnabled:true}),"unverified");
 assert.equal(pilotSignal({product:"DandanLink",pilotReleaseEnabled:"true"}),"unverified");
 assert.equal(pilotSignal("<html>"),"unverified");
 assert.equal(pilotSignal(null),"unverified");
 assert.ok(gate.includes('process.env.PH19_PILOT_RELEASE_ENABLED==="true"'));
 assert.ok(gate.includes('const releaseEnabled=approved&&'));
 assert.ok(server.includes('protectHealthWrites'));
});

test("Clinic Phase 16: clinic audit readout uses bounded actual events, never caller-supplied patient names",()=>{
 const valid=[auditRow(1),auditRow(2,"failure"),auditRow(3,"denied")];
 const actual=pilotAuditSignal({events:valid});
 assert.deepEqual(actual,{
  events:3,successful:1,failed:2,mostRecentAt:"2026-11-17T09:00:00Z",bounded:true
 });
 assert.ok(!JSON.stringify(actual).includes("PRIVATE_ACTOR"));
 assert.ok(!JSON.stringify(actual).includes("PRIVATE_MEMBER"));
 assert.deepEqual(pilotAuditSignal({events:[]}),{
  events:0,successful:0,failed:0,mostRecentAt:null,bounded:true
 });
 for(const bad of [
  null,{events:Array(61).fill(auditRow(1))},
  {events:[auditRow(1),auditRow(1)]},
  {events:[{...auditRow(1),createdAt:"none"}]},
  {events:[{...auditRow(1),outcome:"<script>alert(1)</script>"}]},
  {events:[{...auditRow(1),action:"patient@example.com"}]},
  {access:[]}
 ])assert.equal(pilotAuditSignal(bad).events,null);
 assert.ok(staffApi.includes('await permission(req,clinicId,"security.read")'));
 assert.ok(staffApi.includes('.orderBy(desc(schema.auditEvent.createdAt)).limit(60)'));
 assert.ok(staffApi.includes('res.setHeader("Cache-Control","no-store")'));
 assert.ok(quality.includes('const audit=data.staff?pilotAuditSignal(data.staff):pilotAuditSignal(null)'));
 assert.ok(quality.includes('audit.events===null?'));
 assert.ok(quality.includes('href={route(cid,"/clinic/settings/security")}'));
});

test("Clinic Phase 16: simulated public API and all private endpoints pass safe unauthenticated probes",async()=>{
 const {fetcher,hits}=fakeApi();
 const lines=[],errors=[];
 const code=await runPilotPreflight("https://api.example.test",{
  info:x=>lines.push(x),error:x=>errors.push(x)
 },fetcher);
 assert.equal(code,0);
 assert.equal(hits.length,7);
 assert.deepEqual(errors,[]);
 assert.ok(lines.includes("PILOT_TECHNICAL_CHECKS=PASS"));
 assert.ok(lines.includes("PILOT_SERVER_FLAG=DISABLED"));
 assert.ok(lines.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 assert.ok(!lines.some(x=>x.includes("PRIVATE_ACTOR")));
 for(const {url,options} of hits){
  assert.ok(url.startsWith("https://api.example.test/"));
  assert.equal(options.method,"GET");
  assert.equal(options.redirect,"error");
  assert.equal(options.credentials,undefined);
  assert.equal(options.body,undefined);
  assert.equal(options.headers.Authorization,undefined);
  assert.equal(options.headers.Cookie,undefined);
  assert.equal(options.cache,"no-store");
 }
 assert.equal(checkOrigin("https://api.example.test"),"https://api.example.test");
 const marked=fakeApi({pilot:true});const markedLines=[];
 assert.equal(await runPilotPreflight("https://api.example.test",{
  info:x=>markedLines.push(x),error:()=>assert.fail("no errors")
 },marked.fetcher),0);
 assert.ok(markedLines.includes("PILOT_SERVER_FLAG=OPERATOR_MARKED_REQUIRES_EVIDENCE"));
 assert.ok(markedLines.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
});

test("Clinic Phase 16: a 200 private endpoint, HTML tunnel or cacheable response fails closed",async()=>{
 const leak=fakeApi({bypass:true}),lines=[],errors=[];
 assert.equal(await runPilotPreflight("https://api.example.test",{
  info:x=>lines.push(x),error:x=>errors.push(x)
 },leak.fetcher),1);
 assert.ok(lines.includes("PILOT_TECHNICAL_CHECKS=FAIL"));
 assert.ok(lines.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 assert.ok(errors.some(x=>x.includes("PRIVATE_ROUTE_NOT_AUTH_GATED")));
 const html=fakeApi({invalidJson:true});
 assert.equal(await runPilotPreflight("https://api.example.test",{
  info:()=>{},error:()=>{}
 },html.fetcher),1);
 const cached=await probeUnauthenticatedEndpoint("https://api.example.test",
  "/v1/team/context",()=>Promise.resolve(mockResponse({code:"AUTH_REQUIRED"},401,{
   "cache-control":"public, max-age=3600"
  })));
 assert.deepEqual(cached,{ok:false,issue:"PRIVATE_DATA_CACHEABLE"});
 const htmlPrivate=await probeUnauthenticatedEndpoint("https://api.example.test",
  "/v1/team/context",()=>Promise.resolve(new Response("<html>",{
   status:200,headers:{"content-type":"text/html"}
  })));
 assert.deepEqual(htmlPrivate,{ok:false,issue:"NON_JSON_RESPONSE"});
 const unsafe=await probeUnauthenticatedEndpoint("https://api.example.test",
  "/v1/team/context",()=>Promise.resolve(mockResponse({
   code:"AUTH_REQUIRED",password:"leak"
  },401)));
 assert.deepEqual(unsafe,{ok:false,issue:"PRIVATE_RESPONSE_UNSAFE"});
 const missingId=await probeUnauthenticatedEndpoint("https://api.example.test",
  "/v1/team/context",()=>Promise.resolve(mockResponse({code:"AUTH_REQUIRED"},401,{
   "x-request-id":""
  })));
 assert.deepEqual(missingId,{ok:false,issue:"MISSING_REQUEST_ID"});
});

test("Clinic Phase 16: pilot QA user interface is read-only, tenant-aware, accessible and RTL-localized",()=>{
 assert.equal(pkg.scripts["qa:pilot"],"node scripts/clinic-pilot-preflight.mjs");
 for(const token of [
  'const authorized=Boolean(space&&(space.role==="owner"||space.role==="manager"))',
  'const currentPilot=pilot?.key===cid?pilot:null',
  'const controller=new AbortController()',
  'fetch(API+"/v1/public/status",{',
  'cache:"no-store",redirect:"error"',
  'signal:pilotSignal(body),loading:false',
  'if(controller.signal.aborted)return',
  'return()=>controller.abort()',
  'role="status" aria-live="polite"',
  'pilotReviewControls.map(control=>',
  'pilotControlLabel(control.id,locale)',
  'copy.pilotMarked','copy.pilotBlocked','copy.pilotUnknown',
  'copy.pilotNoAction',
  'audit.events===null?',
  'audit.mostRecentAt&&',
  'copy.auditWarning',
  'pilotGate:"Healthcare pilot release boundary"',
  'pilotGate:"مرز مجوز پایلوت خدمات صحی"',
  'pilotGate:"د طبي پایلوت د خپرېدو دروازه"'
 ])assert.ok(quality.includes(token),token);
 assert.ok(layout.includes('import "./clinic-release-hardening.css";\nimport "./clinic-pilot-readiness.css";'));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase16-gate',
  '.clinic-persistent-shell .clinic-phase16-review-grid',
  '.clinic-persistent-shell .clinic-phase16-audit-metrics',
  '.clinic-persistent-shell .clinic-phase16-gate-signal',
  'is-operator_marked_requires_evidence',
  '@media(max-width:1100px)','@media(max-width:720px)',
  '@media(max-width:380px)','@media(prefers-reduced-motion:reduce)',
  ':focus-visible','overflow-wrap:anywhere'
 ])assert.ok(css.includes(token),token);
 for(const area of ["patient-web","admin-web"]){
  assert.ok(!read("apps/"+area+"/app/layout.tsx").includes("clinic-pilot-readiness.css"));
 }
 for(const bad of ['localStorage.setItem(', 'window.confirm(', 'document.cookie','fetch(API+"/v1/portability/admin/readiness"', 'patientName','autoApprove'])
  assert.ok(!quality.includes(bad),bad);
 assert.ok(!preflight.includes("BETTER_AUTH_SECRET"));
 assert.ok(!preflight.includes("process.env.DATABASE_URL"));
});

test("Clinic Phase 16: existing critical CI and real DB release gates remain in place",()=>{
 const ci=read(".github/workflows/ci.yml");
 for(const value of ["pnpm test","pnpm typecheck","pnpm build",
  "HTTP auth integration against PostgreSQL",
  "node tests/clinic-phase-15-integration.mjs",
  "node tests/stage-l-security-integration.mjs",
  "NODE_ENV=test node scripts/verify-test-backup-restore.mjs"])
  assert.ok(ci.includes(value),value);
 for(const token of [
  "PH19_PILOT_RELEASE_ENABLED","PH19_LEGAL_PRIVACY_APPROVED",
  "PH19_CLINICAL_REVIEW_APPROVED","PH19_BACKUP_RESTORE_APPROVED",
  "PH19_ACCESS_REVIEW_APPROVED","PH19_ACCESSIBILITY_RTL_APPROVED",
  "PH19_PILOT_ROSTER_APPROVED"
 ])assert.ok(gate.includes(token),token);
 assert.ok(preflight.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 assert.ok(!preflight.includes("POST"));
});
