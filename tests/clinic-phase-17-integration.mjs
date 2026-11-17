/**
 * CI-only, synthetic-clinic HTTP integration for improvement Phase 17.
 * Uses test accounts, never real patient or clinical information.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHmac} from "node:crypto";

assert.equal(process.env.NODE_ENV,"test","Synthetic pilot integration must never run against production");
const ROOT=process.env.API_BASE_URL||"http://127.0.0.1:4000";
assert.ok(/^http:\/\/(?:localhost|127\.0\.0\.1):4000$/.test(ROOT));
const HOST="http://localhost:3000",LOG="/tmp/dandanlink-api.log";
const PASSWORD="Dandan-Pilot-Phase17-Only!";
const nonce=Date.now().toString(36);
const issue={area:"booking",symptom:"slow",severity:"high",frequency:"sometimes",
 network:"wifi",device:"android",locale:"fa-AF"};
async function http(path,method="GET",body,jar=""){
 const headers={origin:HOST,...(jar?{cookie:jar}:{}),
  ...(body===undefined?{}:{"content-type":"application/json"})};
 const response=await fetch(ROOT+path,{
  method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"
 });
 const json=await response.json().catch(()=>({}));
 return {status:response.status,data:json,headers:response.headers};
}
const cookieOf=r=>r.headers.getSetCookie().map(s=>s.split(";")[0]).join("; ");
const good=(r,codes,label)=>{
 assert.ok(codes.includes(r.status),label+": expected "+codes+" got "+r.status+" "+
  String(r.data?.code||""));
 return r.data;
};
async function mail(email,part){
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  const log=await readFile(LOG,"utf8").catch(()=>"");
  const entries=[...log.matchAll(/to:\s*'([^']+)'[\s\S]{0,500}?subject:\s*'([^']+)'[\s\S]{0,1200}?url:\s*'([^']+)'/g)];
  const item=entries.filter(x=>x[1]===email&&x[2].includes(part)).at(-1);
  if(item)return item[3];
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error("Synthetic email verification message not produced");
}
async function signup(label){
 const email=label+"-"+nonce+"@example.test";
 good(await http("/api/auth/sign-up/email","POST",{
  name:label,email,password:PASSWORD,callbackURL:HOST+"/clinic/verify"
 }),[200,201],"synthetic signup");
 const url=await mail(email,"Verify your DandanLink account");
 const verified=await fetch(url,{redirect:"manual"});
 assert.ok([200,302,303].includes(verified.status),"synthetic verification");
 const signin=await http("/api/auth/sign-in/email","POST",{email,password:PASSWORD});
 good(signin,[200],"synthetic login");
 return {email,jar:cookieOf(signin)};
}
function totp(uri){
 const secret=new URL(uri).searchParams.get("secret");
 assert.ok(secret);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes=[];
 let bits=0,value=0;
 for(const c of secret.toUpperCase().replaceAll("=","")){
  const digit=alphabet.indexOf(c);if(digit<0)continue;
  value=(value<<5)|digit;bits+=5;
  if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}
 }
 const counter=Buffer.alloc(8);
 counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const digest=createHmac("sha1",Buffer.from(bytes)).update(counter).digest();
 return String((digest.readUInt32BE(digest.at(-1)&15)&0x7fffffff)%1000000).padStart(6,"0");
}
async function activateMfa(user){
 const enabled=good(await http("/api/auth/two-factor/enable","POST",{
  password:PASSWORD,method:"totp"
 },user.jar),[200],"enable MFA");
 assert.ok(enabled.totpURI);
 const verified=await http("/api/auth/two-factor/verify-totp","POST",{
  code:totp(enabled.totpURI)
 },user.jar);
 good(verified,[200],"verify MFA");
 user.jar=cookieOf(verified)||user.jar;
}

const owner=await signup("pilot17owner");
const outsider=await signup("pilot17outsider");
const publicPlans=good(await http("/v1/public/plans"),[200],"list valid clinic plans");
const selectedPlanId=publicPlans.plans.find(p=>p.active)?.id;
assert.ok(selectedPlanId,"a real active plan is required for clinic setup");
const makeClinic=async suffix=>{
 const draft=good(await http("/v1/clinics","POST",{
  legalName:"Synthetic Pilot "+suffix,displayName:"Pilot QA "+suffix,
  clinicType:"office",province:"Kabul",city:"Kabul",district:"Test district",
  address:"Synthetic test address only",phone:"+93700917017",email:owner.email,
  licenseNumber:"QA17-"+suffix+"-"+nonce,selectedPlanId
 },owner.jar),[201],"create test clinic");
 return draft.clinic.id;
};
const first=await makeClinic("One");
const second=await makeClinic("Two");
const base=id=>"/v1/pilot-feedback/clinics/"+encodeURIComponent(id)+"/observations";
let result=await http(base(first));
good(result,[401],"anonymous list blocked");
assert.equal(result.headers.get("cache-control")?.includes("no-store"),true);
good(await http(base(first),"POST",issue),[401],"anonymous write blocked");
good(await http(base(first),"GET",undefined,outsider.jar),[404],"cross tenant list blocked");
good(await http(base(first),"POST",issue,outsider.jar),[404],"cross tenant write blocked");
good(await http(base(first),"POST",{...issue,patientName:"DO-NOT-STORE"},owner.jar),
 [422],"reject personal information");
good(await http(base(first),"POST",{...issue,network:"patient@example.com"},owner.jar),
 [422],"reject arbitrary free text");
good(await http(base(first),"PATCH",{status:"resolved",reason:"fixed_in_build",revision:1},owner.jar),
 [404],"unknown resource");
good(await http(base(first),"POST",issue,owner.jar),[201],"create structured feedback");
result=await http(base(first),"GET",undefined,owner.jar);
const list=good(result,[200],"get scoped feedback");
assert.equal(list.scope,"clinic_metadata_only");
assert.equal(list.window,40);
assert.equal(list.observations.length,1);
const row=list.observations[0];
assert.equal(row.area,"booking");
assert.equal(row.revision,1);
assert.equal(row.status,"open");
assert.ok(!JSON.stringify(row).includes(owner.email));
assert.ok(!Object.keys(row).includes("actor_id"));
assert.ok(!Object.keys(row).includes("clinic_id"));
assert.ok(!Object.keys(row).includes("patientName"));
const otherList=good(await http(base(second),"GET",undefined,owner.jar),[200],
 "same owner another clinic isolation");
assert.equal(otherList.observations.length,0);
const itemUrl=base(first)+"/"+encodeURIComponent(row.id);
good(await http(itemUrl,"PATCH",{status:"triaged",reason:"reproduced",revision:1},
 owner.jar),[403],"MFA required for triage");
await activateMfa(owner);
good(await http(itemUrl,"PATCH",{
 status:"triaged",reason:"reproduced",revision:1
},owner.jar),[200],"triage with MFA");
good(await http(itemUrl,"PATCH",{
 status:"triaged",reason:"reproduced",revision:1
},owner.jar),[409],"stale revision blocked");
good(await http(itemUrl,"PATCH",{
 status:"resolved",reason:"fixed_in_build",revision:2
},owner.jar),[409],"status cannot bypass in progress");
good(await http(base(second)+"/"+encodeURIComponent(row.id),"PATCH",{
 status:"in_progress",reason:"reproduced",revision:2
},owner.jar),[404],"same-owner cross clinic triage blocked");
good(await http(itemUrl,"PATCH",{
 status:"in_progress",reason:"followup",revision:2
},owner.jar),[200],"progress status");
good(await http(itemUrl,"PATCH",{
 status:"resolved",reason:"fixed_in_build",revision:3
},owner.jar),[200],"resolved status");
const updated=good(await http(base(first),"GET",undefined,owner.jar),[200],
 "fetch resolved observation");
assert.equal(updated.observations[0].revision,4);
assert.equal(updated.observations[0].status,"resolved");
const security=good(await http("/v1/team/clinics/"+first+"/security","GET",undefined,owner.jar),
 [200],"audit feed");
assert.ok(security.events.some(x=>x.action==="pilot.observation.created"));
assert.ok(security.events.some(x=>x.action==="pilot.observation.triaged"));
console.info("CLINIC_PHASE17_INTEGRATION_OK: synthetic feedback tenant scope, no-PHI allowlist, MFA triage, CAS and audit passed; PH19 remains NO-GO.");
