import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {runPilotLatency,pilotLatencyStats} from "../scripts/clinic-pilot-latency.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
function compile(src){
 const mod={exports:{}};
 const js=ts.transpileModule(read(src),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 new Function("module","exports",js)(mod,mod.exports);
 return mod.exports;
}
const server=compile("apps/api/src/pilot-feedback-validation.ts");
const ui=compile("packages/ui-web/src/clinic-pilot-feedback-model.ts");
const api=read("apps/api/src/pilot-feedback-router.ts");
const page=read("packages/ui-web/src/clinic-pilot-feedback.tsx");
const quality=read("packages/ui-web/src/clinic-quality.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-pilot-feedback.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const migration=read("packages/db/migrations/0021_clinic_pilot_feedback.sql");
const serverEntry=read("apps/api/src/server.ts");
const pkg=JSON.parse(read("package.json"));
const ci=read(".github/workflows/ci.yml");

const valid={area:"booking",symptom:"slow",severity:"high",frequency:"sometimes",
 network:"wifi",device:"android",locale:"fa-AF"};
const observation=(id="11111111-1111-4111-8111-111111111111")=>({
 ...valid,id,status:"open",resolution:null,revision:1,
 createdAt:"2026-11-17T08:00:00.000Z",updatedAt:"2026-11-17T08:00:00.000Z"
});

test("Clinic Phase 17: server and client allow exactly the same nonclinical issue fields",()=>{
 for(const name of Object.keys(server.pilotFields)){
  assert.deepEqual(server.pilotFields[name],ui.pilotChoices[name],name);
 }
 assert.equal(server.validPilotInput(valid),true);
 assert.equal(ui.pilotValidInput(valid),true);
 for(const changed of [
  {...valid,patientName:"Do not collect patient identities"},
  {...valid,email:"someone@example.com"},
  {...valid,notes:"Patient symptoms"},
  {...valid,diagnosis:"Sensitive diagnosis"},
  {...valid,attachment:"data:image/jpeg;base64,foo"},
  {...valid,area:"<script>"},
  {...valid,device:"personal phone serial"},
  {...valid,locale:"ru-RU"},
  {...valid,frequency:null}
 ]){
  assert.equal(server.validPilotInput(changed),false);
  assert.equal(ui.pilotValidInput(changed),false);
 }
 assert.equal(server.validPilotInput(null),false);
 assert.equal(ui.pilotValidInput([]),false);
});

test("Clinic Phase 17: status changes require optimistic revisions and follow approved workflow",()=>{
 const cases={
  open:["triaged","deferred"],triaged:["in_progress","deferred"],
  in_progress:["resolved","deferred"],deferred:["triaged"],resolved:["triaged"]
 };
 for(const [from,to] of Object.entries(cases)){
  assert.deepEqual(ui.pilotStatusTransitions(from),to);
  for(const status of server.pilotStatuses){
   assert.equal(server.pilotTransition(from,status),to.includes(status),
    from+"->"+status);
  }
 }
 assert.equal(server.validPilotStatusChange({status:"triaged",reason:"reproduced",revision:1}),true);
 for(const changed of [
  {status:"resolved",reason:"patient account",revision:1},
  {status:"resolved",reason:"fixed_in_build",revision:0},
  {status:"resolved",reason:"fixed_in_build",revision:"1"},
  {status:"resolved",reason:"fixed_in_build",revision:1,patientId:"leak"},
  {status:"approved",reason:"fixed_in_build",revision:1}
 ])assert.equal(server.validPilotStatusChange(changed),false);
});

test("Clinic Phase 17: recent 40 bound, strict response fields, pages and window-derived statistics",()=>{
 const original=observation();
 assert.equal(ui.pilotValidObservation(original),true);
 assert.equal(ui.pilotValidObservation({...original,actorId:"private"}),false);
 assert.equal(ui.pilotValidObservation({...original,revision:0}),false);
 assert.equal(ui.pilotValidObservation({...original,createdAt:"invalid"}),false);
 assert.equal(ui.pilotValidList({observations:[original],window:40,scope:"clinic_metadata_only"}),true);
 assert.equal(ui.pilotValidList({observations:[original,original],window:40,scope:"clinic_metadata_only"}),false);
 assert.equal(ui.pilotValidList({observations:[original],window:999,scope:"clinic_metadata_only"}),false);
 assert.equal(ui.pilotValidList({observations:[{...original,patientNumber:"100"}],window:40,
  scope:"clinic_metadata_only"}),false);
 const rows=Array.from({length:12},(_,i)=>observation(
  "11111111-1111-4111-8111-"+String(i+1).padStart(12,"0")));
 rows[0].severity="blocker";
 rows[1].status="resolved";
 const stats=ui.pilotFeedbackStats(rows);
 assert.deepEqual(stats,{returned:12,open:11,critical:11,resolved:1});
 assert.equal(ui.pilotFeedbackFilter(rows,"resolved","all").length,1);
 assert.equal(ui.pilotFeedbackFilter(rows,"all","booking").length,12);
 const page=ui.pilotFeedbackPage(rows,3);
 assert.deepEqual({current:page.current,pages:page.pages,start:page.start,end:page.end,total:page.total},
  {current:3,pages:3,start:11,end:12,total:12});
 assert.equal(ui.pilotFeedbackPage([],100).start,0);
});

test("Clinic Phase 17: authenticated owner-manager API isolates tenants, audits and limits changes",()=>{
 for(const snippet of [
  'r.use(authStaff)','await permission(req,cid,"staff.read")',
  'await permission(req,cid,"staff.manage",true)',
  'if(!validPilotInput(req.body))fail(422,"INVALID_PILOT_OBSERVATION")',
  'if(!validPilotStatusChange(req.body))fail(422,"INVALID_PILOT_STATUS")',
  'WHERE clinic_id=${cid}',
  'ORDER BY created_at DESC,id DESC LIMIT 40',
  'req.actor!.id',
  'SELECT pg_advisory_xact_lock(hashtextextended',
  "created_at>now()-interval '1 hour'",
  'if(Number(rate[0]?.n)>=20)fail(429,"PILOT_FEEDBACK_RATE_LIMIT")',
  'FOR UPDATE','revision=revision+1',
  'if(!pilotTransition(previous,status))fail(409,"INVALID_PILOT_TRANSITION")',
  'if(!updated.length)fail(409,"STALE_PILOT_OBSERVATION")',
  'pilot.observation.created','pilot.observation.triaged',
  'INSERT INTO clinic_pilot_observation_events',
  'Cache-Control","private, no-store',
  'const validId=(value:string)=>',
  'noStore(res);res.status(201).json({saved:true})',
  'r.patch("/clinics/:clinicId/observations/:observationId"'
 ])assert.ok(api.includes(snippet),snippet);
 assert.ok(serverEntry.includes('app.use("/v1/pilot-feedback", pilotFeedbackRouter())'));
 assert.ok(!api.includes("publicBookingsEnabled=true"));
 for(const prohibited of ['patientName','patientNumber','medicalNote',
  'patient_id','clinical_records','session.token','JSON.stringify(req.body)'])
  assert.ok(!api.includes(prohibited),prohibited);
 for(const snippet of [
  'CREATE TABLE clinic_pilot_observations',
  'CREATE TABLE clinic_pilot_observation_events',
  'REFERENCES clinics(id) ON DELETE CASCADE',
  'REFERENCES auth_users(id)',
  "CHECK(status IN ('open','triaged','in_progress','resolved','deferred'))",
  'pilot_event_immutable','BEFORE UPDATE OR DELETE',
  'CREATE INDEX clinic_pilot_observations_actor_rate_idx'
 ])assert.ok(migration.includes(snippet),snippet);
});

test("Clinic Phase 17: owner QA tracker never sends free text, reports no identities and supports MFA-only triage",()=>{
 for(const snippet of [
  'useClinicFeedback,ClinicLoadingState',
  'clinicCsvRows',
  'const active=snapshot?.clinicId===clinicId?snapshot:null',
  'request<unknown>(path(clinicId),"GET",undefined,controller.signal)',
  'if(!pilotValidList(data))throw Error("INVALID_PILOT_RESULT")',
  'return()=>{clearTimeout(timeout);controller.abort();}',
  'if(saving||!pilotValidInput(form))return;',
  'await request(path(clinicId),"POST",form);',
  'disabled={!mfaEnabled||saving}',
  'if(!review||!checked||!mfaEnabled||saving||!pilotStatusTransitions',
  'status:nextStatus,reason,revision:review.revision',
  'role="alert"','role="status"',
  'aria-live="polite"',
  'new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"',
  'timeZone:"Asia/Kabul"',
  'pilotFeedbackPage(filtered,page)',
  'pilotFeedbackStats(rows)',
  'pilotFeedbackFilter(rows,filterStatus,filterArea)',
  'copy[locale]','optionLabel[locale]',
  'new Blob([output],{type:"text/csv;charset=utf-8"})',
  '["Created (UTC)","Area","Symptom","Severity","Frequency","Network","Device"',
  'link.download="dandanlink-pilot-observations-"',
  'setTimeout(()=>URL.revokeObjectURL(url),60000);'
 ])assert.ok(page.includes(snippet),snippet);
 for(const prohibited of [
  '<textarea','localStorage.','sessionStorage.','patientName','clinicalNote',
  'userAgent','email','diagnosis','actorId'
 ])assert.ok(!page.includes(prohibited),prohibited);
 assert.ok(quality.includes('<ClinicPilotFeedback clinicId={cid} role={space.role as "owner"|"manager"}'));
 assert.ok(quality.includes('mfaEnabled={session.ctx.mfaEnabled}'));
 assert.ok(layout.includes('import "./clinic-pilot-readiness.css";\nimport "./clinic-pilot-feedback.css";'));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase17-feedback',
  '.clinic-persistent-shell .clinic-phase17-columns',
  '.clinic-persistent-shell .clinic-phase17-form',
  '.clinic-persistent-shell .clinic-phase17-row',
  '.clinic-persistent-shell .clinic-phase17-status',
  ':focus-visible','@media(max-width:1130px)',
  '@media(max-width:800px)','@media(max-width:580px)',
  '@media(max-width:375px)','@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(token),token);
 for(const area of ["patient-web","admin-web"])
  assert.ok(!read("apps/"+area+"/app/layout.tsx").includes("clinic-pilot-feedback.css"));
});

test("Clinic Phase 17: public latency estimates are bounded and never certify performance or release",async()=>{
 assert.deepEqual(pilotLatencyStats([20,100,30,40,50]),
  {samples:5,p50Ms:40,p95Ms:100,maxMs:100});
 assert.equal(pilotLatencyStats([]),null);
 assert.equal(pilotLatencyStats([NaN]),null);
 assert.equal(pilotLatencyStats([-1]),null);
 const fetched=[],logs=[],errors=[];
 let now=0;
 const fetcher=async(url,options)=>{
  fetched.push({url,options});now+=25;
  const path=new URL(url).pathname;
  const body=path==="/health"?{status:"up"}:
   path==="/ready"?{status:"ready"}:
    {product:"DandanLink",pilotReleaseEnabled:false};
  return new Response(JSON.stringify(body),{
   status:200,headers:{"content-type":"application/json"}
  });
 };
 const writer={info:x=>logs.push(x),error:x=>errors.push(x)};
 assert.equal(await runPilotLatency("https://api.example.test",writer,fetcher,()=>now,"3"),0);
 assert.equal(fetched.length,9);
 assert.equal(errors.length,0);
 assert.ok(logs.includes("PILOT_LATENCY_API_PROCESS_P95_MS=25"));
 assert.ok(logs.includes("PILOT_LATENCY_DATABASE_P50_MS=25"));
 assert.ok(logs.includes("PILOT_LATENCY=OBSERVED"));
 assert.ok(logs.includes("PILOT_LATENCY_SLO=NOT_CERTIFIED_NO_AUTHENTICATED_TRAFFIC_TESTED"));
 assert.ok(logs.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 for(const x of fetched){
  assert.equal(x.options.method,"GET");
  assert.equal(x.options.credentials,undefined);
  assert.equal(x.options.body,undefined);
  assert.equal(x.options.redirect,"error");
  assert.equal(x.options.cache,"no-store");
 }
 assert.equal(await runPilotLatency("https://api.example.test",writer,fetcher,()=>now,"900"),1);
 assert.equal(pkg.scripts["qa:pilot:latency"],"node scripts/clinic-pilot-latency.mjs");
 const bad=await runPilotLatency("https://api.example.test",writer,async()=>new Response("<html>",{
  status:200,headers:{"content-type":"text/html"}
 }),()=>now,"1");
 assert.equal(bad,1);
 assert.ok(!read("scripts/clinic-pilot-latency.mjs").includes("process.env.DATABASE_URL"));
});

test("Clinic Phase 17: production PH19 release stays blocked and CI includes real feedback integration",()=>{
 const gate=read("apps/api/src/pilot-gate.ts");
 assert.ok(gate.includes('PH19_PILOT_RELEASE_ENABLED'));
 assert.ok(gate.includes('const releaseEnabled=approved&&'));
 assert.ok(ci.includes('node tests/clinic-phase-17-integration.mjs'));
 assert.ok(ci.includes('NODE_ENV=test node scripts/verify-test-backup-restore.mjs'));
 assert.ok(!api.includes("PH19_PILOT_RELEASE_ENABLED"));
 assert.ok(!page.includes("PH19_PILOT_RELEASE_ENABLED"));
});
