import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {runClinicPilotHandoff} from "../scripts/clinic-pilot-handoff.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const compile=(path,requireFn=()=>{throw Error("Unexpected dependency")})=>{
 const mod={exports:{}};
 const js=ts.transpileModule(read(path),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 new Function("require","exports","module",js)(requireFn,mod.exports,mod);
 return mod.exports;
};
const pilot=compile("packages/ui-web/src/clinic-pilot-readiness-model.ts");
const handoff=compile("packages/ui-web/src/clinic-pilot-handoff-model.ts",
 name=>name==="./clinic-pilot-readiness-model"?pilot:null);
const stamp="2026-11-17T11:30:00.000Z";
const now=new Date(stamp);
const input=()=>({
 clinicId:"CLINIC_PRIVATE_ID_77",
 qualityClinicId:"CLINIC_PRIVATE_ID_77",
 pilotClinicId:"CLINIC_PRIVATE_ID_77",
 qualityCheckedAt:stamp,pilotCheckedAt:stamp,
 pilotSignal:"blocked",
 states:{operations:"ready",staff:"ready",channels:"ready",appointments:"ready"},
 checks:handoff.pilotHandoffChecks.map(id=>({
  id,state:"pass",current:1,target:1,href:"/clinic/private?patient=PRIVATE_PATIENT_ID"
 })),
 audit:{events:2,successful:1,failed:1,mostRecentAt:"2026-11-17T11:29:00.000Z",bounded:true,
  actorId:"PRIVATE_ACTOR",patientName:"PRIVATE_PATIENT_NAME"}
});

test("Clinic 19: only verified fresh current-tenant summaries can be exported",()=>{
 const good=handoff.clinicPilotHandoff(input(),now);
 assert.equal(good.available,true);
 assert.equal(good.reason,"ready");
 const packet=good.packet;
 assert.equal(packet.releaseDecision,"NO_GO_PENDING_INDEPENDENT_REVIEW");
 assert.equal(packet.serverPilotFlag,"disabled");
 assert.deepEqual(packet.operationalSetup,{configured:6,attentionNeeded:0,total:6,diagnosticOnly:true});
 assert.deepEqual(packet.auditWindow,{observedEvents:2,successful:1,otherOutcomes:1,
  maximumEvents:60,completeCoverageProven:false});
 assert.equal(packet.independentEvidence.length,9);
 assert.ok(packet.independentEvidence.every(x=>x.status==="NOT_VERIFIED_IN_THIS_REPORT"));
 const json=JSON.stringify(packet);
 for(const secret of ["CLINIC_PRIVATE_ID","PRIVATE_PATIENT","PRIVATE_ACTOR","private?patient",
  "patientName","actorId","clinicId","qualityClinicId","pilotClinicId"])
  assert.equal(json.includes(secret),false,"redacted field leaked: "+secret);
 assert.equal(handoff.pilotHandoffFilename,"dandanlink-clinic-technical-handoff.json");
});

test("Clinic 19: cross-tenant, stale, loading or failed responses cannot yield a report",()=>{
 for(const patch of [
  {qualityClinicId:"OTHER_TENANT"},
  {pilotClinicId:"OTHER_TENANT"},
  {clinicId:"OTHER_TENANT"},
  {qualityCheckedAt:null},
  {pilotCheckedAt:"2026-11-17T11:20:00.000Z"},
  {qualityCheckedAt:"2099-01-01T00:00:00.000Z"},
  {pilotSignal:"unverified"},
  {states:{operations:"ready",staff:"loading",channels:"ready",appointments:"ready"}},
  {states:{operations:"ready",staff:"forbidden",channels:"ready",appointments:"ready"}},
  {states:null},
  {checks:[]},
  {checks:input().checks.map(x=>({...x,state:x.id==="email"?"unknown":"pass"}))},
  {checks:[...input().checks.slice(0,5),input().checks[0]]},
  {audit:{events:2,successful:2,failed:1,bounded:true,mostRecentAt:stamp}},
  {audit:{events:61,successful:61,failed:0,bounded:true,mostRecentAt:stamp}},
  {audit:{events:null,successful:null,failed:null,bounded:true,mostRecentAt:null}}
 ]){
  const result=handoff.clinicPilotHandoff({...input(),...patch},now);
  assert.equal(result.available,false,JSON.stringify(patch));
  assert.equal(result.packet,null);
 }
 assert.equal(handoff.pilotHandoffFresh("invalid",now),false);
 assert.equal(handoff.pilotHandoffFresh("2026-11-17T11:24:59Z",now),false);
 assert.equal(handoff.pilotHandoffFresh("2026-11-17T11:31:00Z",now),false);
});

test("Clinic 19: actionable setup still reports independent NO-GO",()=>{
 const draft=input();
 draft.pilotSignal="operator_marked_requires_evidence";
 draft.checks[0].state="action";
 const result=handoff.clinicPilotHandoff(draft,now);
 assert.equal(result.available,true);
 assert.equal(result.packet.operationalSetup.attentionNeeded,1);
 assert.equal(result.packet.serverPilotFlag,"operator_marked_requires_evidence");
 assert.equal(result.packet.releaseDecision,"NO_GO_PENDING_INDEPENDENT_REVIEW");
 assert.equal(result.packet.independentEvidence.length,pilot.pilotReviewControls.length);
});

test("Clinic 19: quality UI only exposes handoff for owner/manager and uses verified selected clinic",()=>{
 const quality=read("packages/ui-web/src/clinic-quality.tsx");
 const ui=read("packages/ui-web/src/clinic-pilot-handoff.tsx");
 const style=read("apps/clinic-web/app/clinic/clinic-phase19-handoff.css");
 const layout=read("apps/clinic-web/app/clinic/layout.tsx");
 const apiGate=read("apps/api/src/pilot-gate.ts");
 assert.match(quality,/if\(!authorized\)return/);
 assert.match(quality,/ClinicPilotHandoff input=/);
 assert.match(quality,/pilotClinicId:currentPilot\?\.key/);
 assert.match(quality,/qualityClinicId:current\?\.key/);
 assert.match(ui,/clinicPilotHandoff\(input\)/);
 assert.match(ui,/type="button" className="btn btn-primary" disabled=\{!result\.available\}/);
 assert.match(ui,/Blob\(\[JSON\.stringify\(fresh\.packet,null,2\)/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.match(style,/@media\(max-width:600px\)/);
 assert.match(style, /focus-visible/);
 assert.match(layout,/clinic-phase19-handoff\.css/);
 assert.match(apiGate,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(apiGate,/PILOT_RELEASE_BLOCKED/);
});

function scriptedPublicApi({unauthorized=true,html=false,release=false}={}){
 const hits=[];
 const reader=async(url,options)=>{
  hits.push({url,options});
  const path=new URL(url).pathname;
  if(path==="/health")return response({status:"up"});
  if(path==="/ready")return response({status:"ready"});
  if(path==="/v1/public/status")return html?
   new Response("<html>Warning</html>",{headers:{"content-type":"text/html"}}):
   response({product:"DandanLink",pilotReleaseEnabled:release});
  return response({code:"AUTH_REQUIRED",patient:"SHOULD_NOT_BE_LOGGED"},
   unauthorized?401:200,{
    "cache-control":"private, no-store","x-request-id":"test-run-12345678"
   });
 };
 return {hits,reader};
}
function response(payload,status=200,headers={}){
 return new Response(JSON.stringify(payload),{status,headers:{
  "content-type":"application/json",...headers
 }});
}
const log=()=>{
 const lines=[];
 return {lines,writer:{
  info:v=>lines.push(String(v)),error:v=>lines.push(String(v))
 }};
};
test("Clinic 19: handoff CLI probes only public GETs without credentials, always NO-GO",async()=>{
 const {hits,reader}=scriptedPublicApi();
 const {lines,writer}=log();
 let tick=0;
 const code=await runClinicPilotHandoff("http://127.0.0.1:4000",writer,
  reader,()=>tick+=4,"2");
 assert.equal(code,0);
 assert.ok(lines.includes("CLINIC19_TECHNICAL_EVIDENCE=OBSERVED"));
 assert.ok(lines.includes("CLINIC19_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 assert.ok(lines.includes("CLINIC19_EXTERNAL_CONTROLS=9_INDEPENDENT_REVIEWS_NOT_COLLECTED"));
 assert.equal(hits.length,13); // public 3 + private 4 + latency 3*2
 for(const {url,options} of hits){
  assert.match(url,/^http:\/\/127\.0\.0\.1:4000\//);
  assert.equal(options.method,"GET");
  assert.equal(options.credentials,undefined);
  assert.equal(options.body,undefined);
  assert.equal(options.headers.Authorization,undefined);
  assert.equal(options.headers.Cookie,undefined);
 }
 assert.equal(lines.join("\n").includes("SHOULD_NOT_BE_LOGGED"),false);
});
test("Clinic 19: fail-closed non-JSON server or anonymous bypass does not create signoff",async()=>{
 for(const settings of [{html:true},{unauthorized:false}]){
  const {reader}=scriptedPublicApi(settings);
  const {writer,lines}=log();
  let tick=0;
  const result=await runClinicPilotHandoff("http://127.0.0.1:4000",writer,
   reader,()=>tick+=3,"1");
  assert.equal(result,1);
  assert.ok(lines.includes("CLINIC19_TECHNICAL_EVIDENCE=INCOMPLETE"));
  assert.ok(lines.includes("CLINIC19_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
 }
});
