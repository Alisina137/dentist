import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {
 checkOrigin,fetchDiagnostic,runClinicQualityPreflight
} from "../scripts/clinic-quality-preflight.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const model=read("packages/ui-web/src/clinic-quality-model.ts");
const ui=read("packages/ui-web/src/clinic-quality.tsx");
const sidebar=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const styles=read("apps/clinic-web/app/clinic/clinic-quality.css");
const staff=read("packages/ui-web/src/phase03.tsx");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const pkg=JSON.parse(read("package.json"));
const exports=JSON.parse(read("packages/ui-web/package.json")).exports;
const qualityPage=read("apps/clinic-web/app/clinic/settings/quality/page.tsx");
const operationsApi=read("apps/api/src/operations-router.ts");
const privateBookingApi=read("apps/api/src/patient-booking-router.ts");
const staffApi=read("apps/api/src/staff-management.ts");
const appointmentApi=read("apps/api/src/appointments-router.ts");
const ci=read(".github/workflows/ci.yml");

const built=ts.transpileModule(model,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText;
const load={exports:{}};
new Function("exports","module",built)(load.exports,load);
const {clinicQualityChecks,clinicQualitySummary,clinicQualityStatus,
 clinicQualityPayloadValid,clinicQualityOverview,clinicQualitySelected}=load.exports;
const operations={metrics:{services:2,chairs:0,openDays:6,scheduledDentists:2},
 checklist:[{key:"service",done:true},{key:"chair",done:true},
  {key:"clinicHours",done:true},{key:"dentistHours",done:true}],readyForPreview:true};
const staffFixture={access:[
 {status:"active",role:"owner",mfaEnabled:true},
 {status:"active",role:"dentist",mfaEnabled:false},
 {status:"suspended",role:"assistant",mfaEnabled:false}
]};
const messages={emailConfigured:false,smsConfigured:false,pushConfigured:false,deliveries:[
 {status:"sent",event_name:"booking_confirmation",attempt_count:1},
 {status:"failed",event_name:"booking_reminder",attempt_count:4}]};
const appointment={todayTotal:3,weekTotal:8,timezone:"Asia/Kabul",counts:{
 confirmed:2,arrived:1,in_treatment:0,completed:0,no_show:0}};

test("Clinic Phase 15: overview uses real readiness, privacy-safe metadata and no false positive for missing data",()=>{
 const actual={operations,staff:staffFixture,channels:messages,appointments:appointment};
 const checks=clinicQualityChecks(actual,"clinic&other=true");
 assert.deepEqual(checks.map(x=>[x.id,x.state]),[
  ["services","pass"],["resources","pass"],["clinicHours","pass"],
  ["dentistHours","pass"],["staffMfa","action"],["email","action"]
 ]);
 assert.equal(checks[1].current,0,"chairless service setup may still be valid");
 assert.ok(checks.every(x=>x.href.includes("clinic=clinic%26other%3Dtrue")));
 assert.deepEqual(clinicQualitySummary(checks),{passed:4,action:2,unknown:0,total:6,complete:false});
 assert.deepEqual(clinicQualityOverview(actual),{
  today:3,week:8,activeStaff:2,failedDeliveries:1,deliveryWindow:2
 });
 const empty={operations:null,staff:null,channels:null,appointments:null};
 assert.equal(clinicQualitySummary(clinicQualityChecks(empty,"clinic")).unknown,6);
 assert.equal(clinicQualitySummary(clinicQualityChecks(empty,"clinic")).complete,false);
 assert.equal(clinicQualityOverview(empty).activeStaff,null);
 const safe={...actual,staff:{access:[{status:"active",role:"owner",mfaEnabled:true}]},
  channels:{...messages,emailConfigured:true}};
 assert.equal(clinicQualitySummary(clinicQualityChecks(safe,"clinic")).complete,true);
 assert.equal(clinicQualitySelected("clinic-a",["clinic-b"]),null);
 assert.equal(clinicQualitySelected("clinic-a",["clinic-a"]),"clinic-a");
 assert.equal(clinicQualityStatus(401),"auth");
 assert.equal(clinicQualityStatus(403),"forbidden");
 assert.equal(clinicQualityStatus(404),"forbidden");
 assert.equal(clinicQualityStatus(503),"unavailable");
});

test("Clinic Phase 15: reject HTML/unexpected API payloads before interpreting operational metrics",()=>{
 assert.equal(clinicQualityPayloadValid("operations",operations),true);
 assert.equal(clinicQualityPayloadValid("staff",staffFixture),true);
 assert.equal(clinicQualityPayloadValid("channels",messages),true);
 assert.equal(clinicQualityPayloadValid("appointments",appointment),true);
 assert.equal(clinicQualityPayloadValid("operations",{metrics:{services:1}}),false);
 assert.equal(clinicQualityPayloadValid("operations",{...operations,checklist:[]}),true);
 assert.equal(clinicQualityPayloadValid("staff",{access:[{status:"active"}]}),false);
 assert.equal(clinicQualityPayloadValid("channels",{...messages,deliveries:new Array(101).fill({
  status:"sent",event_name:"booking",attempt_count:1})}),false);
 assert.equal(clinicQualityPayloadValid("channels",{...messages,deliveries:[{id:1}]}),false);
 assert.equal(clinicQualityPayloadValid("appointments",{...appointment,timezone:"Europe/Paris"}),false);
 assert.equal(clinicQualityPayloadValid("appointments","<html>ngrok</html>"),false);
 assert.equal(clinicQualityPayloadValid("operations",null),false);
});

test("Clinic Phase 15: operator page binds all four private requests to selected tenant, aborts stale requests",()=>{
 for(const token of [
  'useClinicWorkspaceSession()',
  'const authorized=Boolean(space&&(space.role==="owner"||space.role==="manager"))',
  'const current=snapshot?.key===cid?snapshot:null',
  'const controller=new AbortController()',
  '"/v1/operations/clinics/"+prefix+"/summary"',
  '"/v1/team/clinics/"+prefix+"/security"',
  '"/v1/booking/clinics/"+prefix+"/notifications"',
  '"/v1/appointments/clinics/"+prefix+"/overview"',
  'fetch(API+path,{credentials:"include",cache:"no-store"',
  'if(!response.ok)throw Object.assign(new Error("DATA_UNAVAILABLE")',
  'if(!kind.toLowerCase().includes("application/json"))throw new Error("NOT_JSON")',
  'if(!clinicQualityPayloadValid(slot,payload))throw new Error("INVALID_PRIVATE_RESULT")',
  'setSnapshot(old=>!old||old.key!==cid?old:',
  'if(controller.signal.aborted)return',
  'return()=>{controller.abort();window.clearTimeout(timeout);};',
  'old.state[key]==="loading"?"unavailable":old.state[key]',
  'setSnapshot({key:cid,data:empty,state:pending,syncedAt:null})',
  'const pending=!current||slots.some(slot=>current.state[slot]==="loading")',
  'const failed=slots.filter(slot=>current&&',
  'disabled={pending} onClick={()=>setRevision(v=>v+1)}',
  '<ClinicLoadingState',
  'role="progressbar" aria-valuemin={0} aria-valuemax={score.total}',
  'QualityBadge state={check.state}',
  'aria-live="polite"',
  'copy.notApproval',
  'copy.reviewHelp'
 ])assert.ok(ui.includes(token),token);
 assert.ok(!ui.includes("patientName"));
 assert.ok(!ui.includes("patientNumber"));
 assert.ok(!ui.includes("localStorage.setItem("));
 assert.ok(!ui.includes("sessionStorage.setItem("));
 assert.ok(!ui.includes("window.alert("));
 for(const server of [
  [operationsApi,'await operationsAccess(req,id)'],
  [staffApi,'await permission(req,clinicId,"security.read")'],
  [appointmentApi,'await appointmentAccess(req,cid(req),"read")'],
  [privateBookingApi,'staff.get("/notifications",route(async(req:StaffRequest,res)=>{']
 ])assert.ok(server[0].includes(server[1]),server[1]);
});

test("Clinic Phase 15: user interface is real, owner/manager-only, localized and responsive",()=>{
 assert.equal(exports["./clinic-quality"],"./src/clinic-quality.tsx");
 assert.ok(qualityPage.includes('ClinicQualityPortal'));
 assert.ok(sidebar.includes('{key:"quality",path:"/clinic/settings/quality",group:"settings",icon:"badge-check"}'));
 assert.ok(sidebar.includes('"notifications","quality","security"'));
 assert.ok(!sidebar.includes('"reports","quality","patients"'));
 for(const value of [
  'quality:"Quality checks"','quality:"بررسی کیفیت"','quality:"د کیفیت کتنه"',
  'items:["settings","quality","security"'
 ])assert.ok(sidebar.includes(value),value);
 for(const word of [
  'title:"Operational readiness checks"',
  'title:"بررسی آمادگی عملیاتی"',
  'title:"د کاري چمتووالي کتنه"',
  'notApproval:"These checks are operational hints',
  'notApproval:"این بررسی‌ها راهنمای عملیات',
  'notApproval:"دا یوازې د عملیاتو لارښوونې',
  'pending:"Human review pending"',
  'pending:"در انتظار تأیید انسانی"',
  'pending:"انساني کتنې ته منتظر"'
 ])assert.ok(ui.includes(word),word);
 for(const cssMarker of [
  '.clinic-persistent-shell .clinic-quality-workspace',
  '.clinic-persistent-shell .clinic-quality-hero',
  '.clinic-persistent-shell .clinic-quality-check',
  '.clinic-persistent-shell .clinic-quality-badge.is-action',
  '.clinic-persistent-shell .clinic-quality-human',
  '.clinic-persistent-shell .clinic-quality-signal',
  ':focus-visible','@media(max-width:1150px)','@media(max-width:750px)',
  '@media(max-width:580px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(styles.includes(cssMarker),cssMarker);
 assert.ok(layout.includes('import "./clinic-cross-workspaces.css";\nimport "./clinic-quality.css";'));
 for(const bad of ['body{',':root{','.odontogram{','svg path{','Math.random('])
  assert.ok(!styles.includes(bad),bad);
 for(const app of ["patient-web","admin-web"])
  assert.ok(!read("apps/"+app+"/app/layout.tsx").includes("clinic-quality.css"));
});

test("Clinic Phase 15: member and invite review dialogs trap Tab and restore focus on dismiss",()=>{
 for(const snippet of [
  'useRef<HTMLElement>(null)','const opener=document.activeElement instanceof HTMLElement',
  'const previousOverflow=document.body.style.overflow;',
  'document.body.style.overflow="hidden"',
  'document.body.style.overflow=previousOverflow;',
  'if(opener?.isConnected)opener.focus();',
  'const focusable=Array.from(root.querySelectorAll<HTMLElement>(',
  'if(event.key==="Escape"&&!busy)onCancel()',
  'event.shiftKey&&document.activeElement===first',
  '!event.shiftKey&&document.activeElement===last',
  'event.preventDefault();first.focus();',
  'ref={dialogRef} tabIndex={-1}',
  'aria-modal="true"',
  'aria-describedby="clinic-phase13-dialog-description"',
  'id="clinic-phase13-dialog-description"'
 ])assert.ok(staff.includes(snippet),snippet);
});

test("Clinic Phase 15: production QA preflight validates origins and never sends credentials",async()=>{
 assert.equal(checkOrigin("http://127.0.0.1:4000"),"http://127.0.0.1:4000");
 assert.equal(checkOrigin("http://localhost:4000"),"http://localhost:4000");
 assert.equal(checkOrigin("https://api.example.test"),"https://api.example.test");
 for(const bad of [
  "http://remote.example.test","https://user:pass@api.example.test",
  "ftp://example.test","http://localhost:4000/secret","garbage"
 ])assert.throws(()=>checkOrigin(bad),/QUALITY_INVALID_API_ORIGIN/);
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  const path=new URL(url).pathname;
  return new Response(JSON.stringify(path==="/health"?{status:"up"}:
   path==="/ready"?{status:"ready"}:
   {product:"DandanLink",pilotReleaseEnabled:false}),{
    status:200,headers:{"content-type":"application/json"}
   });
 };
 const lines=[],errors=[];
 const writer={info:v=>lines.push(v),error:v=>errors.push(v)};
 const result=await runClinicQualityPreflight("https://example.ngrok-free.dev",writer,fetcher);
 assert.equal(result,0);
 assert.ok(lines.includes("QUALITY_PILOT_FLAG=NO_GO"));
 assert.ok(lines.includes("QUALITY_DATABASE=PASS"));
 assert.equal(calls.length,3);
 for(const call of calls){
  assert.equal(call.options.credentials,undefined);
  assert.equal(call.options.headers["ngrok-skip-browser-warning"],"1");
  assert.equal(call.options.redirect,"error");
  assert.equal(call.options.method,"GET");
  assert.ok(!JSON.stringify(call).includes("password"));
 }
 assert.equal(errors.length,0);
 assert.equal(pkg.scripts["qa:clinic"],"node scripts/clinic-quality-preflight.mjs");
 assert.ok(ci.includes("node tests/clinic-phase-15-integration.mjs")||
  ci.includes("HTTP auth integration against PostgreSQL"));
});

test("Clinic Phase 15: preflight treats HTTP 200 HTML, DB 503 and invalid status as failures",async()=>{
 const html=async()=>new Response("<html>Tunnel</html>",{
  status:200,headers:{"content-type":"text/html"}
 });
 const status=await fetchDiagnostic("https://api.example.test","/health",html);
 assert.equal(status.ok,false);assert.equal(status.issue,"NON_JSON_RESPONSE");
 const unavailable=async()=>new Response(JSON.stringify({code:"DB_UNAVAILABLE"}),{
  status:503,headers:{"content-type":"application/json"}
 });
 const db=await fetchDiagnostic("https://api.example.test","/ready",unavailable);
 assert.equal(db.ok,false);assert.equal(db.issue,"NON_SUCCESS_STATUS");
 const thrower=async()=>{throw new Error("secret sensitive");};
 const error=await fetchDiagnostic("https://api.example.test","/health",thrower);
 assert.equal(error.ok,false);assert.equal(error.issue,"UNREACHABLE");
 const lines=[],errors=[];
 const code=await runClinicQualityPreflight("not a URL",{
  info:v=>lines.push(v),error:v=>errors.push(v)
 },html);
 assert.equal(code,1);
 assert.deepEqual(errors,["QUALITY_API_ORIGIN=INVALID (use HTTPS or localhost; no credentials)"]);
});
