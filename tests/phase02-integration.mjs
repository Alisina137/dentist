
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";

const base="http://localhost:4000",log="/tmp/dandanlink-api.log";
const password="Dandan-Phase02-SafePassword!";
function headers(cookie="",extra={}){return {"origin":"http://localhost:3000",...(cookie?{cookie}:{}),...extra};}
async function api(path,method="GET",body, cookie="",extra={}){
 const r=await fetch(base+path,{
  method,headers:headers(cookie,body===undefined?extra:{"content-type":"application/json",...extra}),
  body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"
 });
 const content=await r.text();let data={};try{data=JSON.parse(content);}catch{}
 return {status:r.status,data,headers:r.headers};
}
function ok(result,codes,label){
 assert.ok(codes.includes(result.status),label+": "+result.status+" "+JSON.stringify(result.data).slice(0,400));
 return result.data;
}
async function linkFor(email){
 for(let t=0;t<80;t++){
  const logs=await readFile(log,"utf8").catch(()=>"");
  const items=[...logs.matchAll(/subject:\s*'Verify your DandanLink account'[\s\S]{0,1500}?url:\s*'([^']+)'/g)];
  if(items.length)return items.at(-1)[1];
  await new Promise(r=>setTimeout(r,130));
 }
 throw new Error("No verification link for "+email);
}
function cookie(r){return r.headers.getSetCookie().map(s=>s.split(";")[0]).join("; ");}
function totp(uri){
 const secret=new URL(uri).searchParams.get("secret");
 assert.ok(secret);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", bytes=[];
 let bits=0, value=0;
 for(const char of secret.toUpperCase().replaceAll("=","")){
  const n=alphabet.indexOf(char);if(n<0)continue;
  value=(value<<5)|n;bits+=5;
  if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}
 }
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const mac=createHmac("sha1",Buffer.from(bytes)).update(counter).digest();
 const n=(mac.readUInt32BE(mac.at(-1)&15)&0x7fffffff)%1000000;
 return String(n).padStart(6,"0");
}
async function register(label){
 const email=label+"-"+Date.now()+"@example.test";
 ok(await api("/api/auth/sign-up/email","POST",{name:label,email,password,
  callbackURL:"http://localhost:3000/clinic/verify"}),[200,201],"signup "+label);
 const link=await linkFor(email);
 ok(await api(new URL(link).pathname+new URL(link).search),[200,302,303],"verify "+label);
 const signed=await api("/api/auth/sign-in/email","POST",{email,password});
 ok(signed,[200],"signin "+label);
 return {email,cookie:cookie(signed)};
}
const admin=await register("phase02-admin");
const grant=spawnSync("pnpm",["--filter","@dandanlink/api","grant:admin",admin.email],{
 env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},encoding:"utf8"
});
assert.equal(grant.status,0,grant.stderr);
ok(await api("/v1/admin/plans","GET",undefined,admin.cookie),[403],"MFA required");
const enrollment=ok(await api("/api/auth/two-factor/enable","POST",{password,method:"totp"},admin.cookie),[200],"MFA enroll");
const verified=await api("/api/auth/two-factor/verify-totp","POST",{code:totp(enrollment.totpURI)},admin.cookie);
ok(verified,[200],"MFA verify");admin.cookie=cookie(verified)||admin.cookie;

const owner=await register("phase02-owner");
const other=await register("phase02-other");
ok(await api("/v1/admin/plans","GET",undefined,owner.cookie),[403],"ordinary user cannot admin");
const bad=await api("/v1/admin/plans","POST",{planKey:"starter",billingPeriod:"monthly",label:"Starter",
 priceAfn:-1,staffLimit:1,branchLimit:1,trialDays:14,graceDays:7},admin.cookie);
ok(bad,[422],"reject invalid price");
const plan=ok(await api("/v1/admin/plans","POST",{planKey:"starter",billingPeriod:"monthly",label:"Starter",
 priceAfn:1900,staffLimit:2,branchLimit:1,trialDays:14,graceDays:7},admin.cookie),[201],"create plan").plan;
assert.equal(plan.version,1);
assert.equal((ok(await api("/v1/public/plans"),[200],"public pricing")).plans.length,1);

const clinicPayload={legalName:"Kabul Smile Dental Center",displayName:"Smile Center",
 clinicType:"office",province:"Kabul",city:"Kabul",district:"District 3",address:"Street 12",
 phone:"+93700123456",email:owner.email,licenseNumber:"test-license-"+Date.now(),selectedPlanId:plan.id};
const clinic=ok(await api("/v1/clinics","POST",clinicPayload,owner.cookie),[201],"create clinic").clinic;
ok(await api("/v1/clinics/"+clinic.id,undefined,undefined,other.cookie),[404],"other tenant denied");
ok(await api("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.cookie),
 [422],"license required before review");
const bytes=Buffer.from("%PDF-1.4\\n1 0 obj\\n<<>>\\nendobj\\n%%EOF");
const uploaded=await fetch(base+"/v1/clinics/"+clinic.id+"/evidence",{
 method:"POST",credentials:"include",headers:headers(owner.cookie,{
  "content-type":"application/octet-stream","x-document-kind":"clinic_license","x-file-name":"clinic.pdf"
 }),body:bytes
});
assert.equal(uploaded.status,201,"private evidence upload");
ok(await api("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.cookie),[200],"submit clinic");
ok(await api("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.cookie),
 [409],"duplicate submission denied");
const review=ok(await api("/v1/admin/clinics/"+clinic.id),[401],"admin route requires login"); // intentionally no cookie
const adminDetail=ok(await api("/v1/admin/clinics/"+clinic.id,"GET",undefined,admin.cookie),[200],"admin review detail");
assert.equal(adminDetail.documents.length,1);
ok(await api("/v1/admin/clinics/"+clinic.id+"/review","POST",
 {action:"approve",confirmation:"Wrong"},admin.cookie),[422],"review needs correct confirmation");
ok(await api("/v1/admin/clinics/"+clinic.id+"/review","POST",
 {action:"needs_info",reason:"Provide another document"},admin.cookie),[200],"request info");
assert.equal((ok(await api("/v1/clinics/"+clinic.id,"GET",undefined,owner.cookie),[200],"owner status")).clinic.status,"needs_info");
ok(await api("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.cookie),[200],"resubmit");
ok(await api("/v1/admin/clinics/"+clinic.id+"/review","POST",
 {action:"approve",confirmation:"Smile Center"},admin.cookie),[200],"approval");
assert.equal((ok(await api("/v1/clinics/"+clinic.id,"GET",undefined,owner.cookie),[200],"approved owner")).clinic.status,"approved");
ok(await api("/v1/admin/clinics/"+clinic.id+"/review","POST",
 {action:"suspend",confirmation:"Smile Center",reason:"Verification discrepancy"},admin.cookie),
 [200],"suspension");
assert.equal((ok(await api("/v1/clinics/"+clinic.id,"GET",undefined,owner.cookie),[200],"suspended")).clinic.status,"suspend");
const invoice=ok(await api("/v1/clinics/"+clinic.id+"/subscription/request","POST",
 {planVersionId:plan.id,evidenceReference:"bank-transfer-12345"},owner.cookie),[201],"request manual payment");
ok(await api("/v1/clinics/"+clinic.id+"/subscription/request","POST",
 {planVersionId:plan.id,evidenceReference:"bank-transfer-12345"},owner.cookie),[409],"duplicate pending payment");
ok(await api("/v1/admin/invoices/"+invoice.invoiceId+"/decision","POST",
 {action:"confirm",reason:"Bank transfer reconciled",confirmation:"incorrect"},admin.cookie),
 [422],"manual confirmation needs reference");
ok(await api("/v1/admin/invoices/"+invoice.invoiceId+"/decision","POST",
 {action:"confirm",reason:"Bank transfer reconciled",confirmation:"bank-transfer-12345"},admin.cookie),
 [200],"confirm manual payment");
const after=ok(await api("/v1/clinics/"+clinic.id,"GET",undefined,owner.cookie),[200],"payment activated");
assert.equal(after.effectiveStatus,"active");
assert.equal(after.clinic.status,"suspended","subscription must not approve clinic");
ok(await api("/v1/admin/invoices/"+invoice.invoiceId+"/decision","POST",
 {action:"confirm",reason:"Replay verification",confirmation:"bank-transfer-12345"},admin.cookie),
 [409],"payment replay blocked");
console.log("PH02 integration passed: plans, tenant isolation, private evidence, review lifecycle, independent subscription, manual confirmation and replay.");
