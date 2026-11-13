import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHmac} from "node:crypto";
const API="http://localhost:4000",origin="http://localhost:3001";
const password="Dandan-PH07-Booked#2026";
const nonce=String(Date.now());
const key=()=>crypto.randomUUID();
async function request(path,method="GET",body,session=""){
 const r=await fetch(API+path,{method,redirect:"manual",headers:{
  origin,...(session?{cookie:session}:{}),...(body===undefined?{}:{"content-type":"application/json"})
 },body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await r.text();let data={};
 try{data=JSON.parse(raw);}catch{}
 return {status:r.status,data,headers:r.headers};
}
function ok(x,codes,label){
 assert.ok(codes.includes(x.status),
  label+" expected "+codes.join("|")+" got "+x.status+" "+JSON.stringify(x.data).slice(0,340));
 return x.data;
}
function cookie(x){return x.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");}
async function emailLink(email,subject){
 for(let i=0;i<75;i++){
  const log=await readFile("/tmp/dandanlink-api.log","utf8").catch(()=>"");
  const matches=[...log.matchAll(/to:\s*'([^']+)'[\s\S]{0,500}?subject:\s*'([^']+)'[\s\S]{0,1200}?url:\s*'([^']+)'/g)];
  const found=matches.filter(x=>x[1]===email&&x[2].includes(subject)).at(-1);
  if(found)return found[3];
  await new Promise(r=>setTimeout(r,150));
 }
 throw new Error("PH07 expected test mail missing: "+email);
}
async function signup(label){
 const email=label+"-"+nonce+"@example.test";
 ok(await request("/api/auth/sign-up/email","POST",{
  name:label,email,password,callbackURL:origin+"/clinic/verify"
 }),[200,201],"register "+label);
 const url=new URL(await emailLink(email,"Verify your DandanLink account"));
 ok(await request(url.pathname+url.search),[200,302,303],"verify "+label);
 const login=await request("/api/auth/sign-in/email","POST",{email,password});
 ok(login,[200],"signin "+label);
 return {email,session:cookie(login),name:label};
}
function totp(uri){
 const secret=new URL(uri).searchParams.get("secret");
 assert.ok(secret);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes=[];let value=0,bits=0;
 for(const letter of secret.toUpperCase().replaceAll("=","")){
  const k=alphabet.indexOf(letter);
  if(k<0)continue;
  value=value<<5|k;bits+=5;
  if(bits>=8){bits-=8;bytes.push(value>>>bits&255);}
 }
 const step=Buffer.alloc(8);step.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const h=createHmac("sha1",Buffer.from(bytes)).update(step).digest();
 return String((h.readUInt32BE(h.at(-1)&15)&0x7fffffff)%1000000).padStart(6,"0");
}
async function enableMfa(user){
 const uri=ok(await request("/api/auth/two-factor/enable","POST",{
  password,method:"totp"},user.session),[200],"MFA enable").totpURI;
 const result=await request("/api/auth/two-factor/verify-totp","POST",{code:totp(uri)},user.session);
 ok(result,[200],"MFA verify");
 user.session=cookie(result)||user.session;
}
async function invite(owner,cid,user,role){
 ok(await request("/v1/team/clinics/"+cid+"/invitations","POST",{
  email:user.email,role},owner.session),[201],"invite "+role);
 const url=new URL(await emailLink(user.email,"clinic staff invitation"));
 return ok(await request("/v1/team/invitations/accept","POST",{
  token:url.searchParams.get("token")},user.session),[200],"accept "+role);
}
function saturdayFromNow(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
  .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 const now=new Date([parts.year,parts.month,parts.day].join("-")+"T12:00:00Z");
 const until=(6-now.getUTCDay()+7)%7||7;
 return new Date(now.getTime()+until*86400000).toISOString().slice(0,10);
}
function week(){
 return Array.from({length:7},(_,weekday)=>({
  weekday,isOpen:weekday===0,startMinute:540,endMinute:720,breaks:[],revision:0
 }));
}
function api(cid){return "/v1/appointments/clinics/"+cid;}
function ops(cid){return "/v1/operations/clinics/"+cid;}
async function doBooking(cid,user,patient,service,provider,resource,date,start,idempotencyKey=key(),source="staff"){
 return request(api(cid)+"/appointments","POST",{
  patientId:patient.id,serviceId:service.id,providerId:provider.membershipId,
  resourceId:resource.id,date,start,source,
  administrativeNote:"Appointment registered at the front desk",idempotencyKey
 },user.session);
}
function fixture(cid,id,offset=0){
 const run=spawnSync("pnpm",["exec","tsx","tests/phase06-time-fixture.ts",cid,id,String(offset)],
  {cwd:process.cwd(),encoding:"utf8",env:process.env});
 assert.equal(run.status,0,"PH07 clock fixture failed: "+run.stderr+" "+run.stdout);
}
const admin=await signup("admin-ph06"),owner=await signup("owner-ph06"),
 dentist=await signup("dentist-ph06"),dentist2=await signup("dentist2-ph06"),
 reception=await signup("reception-ph06"),manager=await signup("manager-ph06"),
 assistant=await signup("assistant-ph06"),stranger=await signup("stranger-ph06");
const bootstrap=spawnSync("pnpm",["admin:grant",admin.email],{
 env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},
 encoding:"utf8"
});
assert.equal(bootstrap.status,0,"admin bootstrap failed: "+bootstrap.stderr);
await enableMfa(admin);
const plan=ok(await request("/v1/admin/plans","POST",{
 planKey:"professional",billingPeriod:"monthly",label:"PH07 Booking",
 priceAfn:1400,staffLimit:6,branchLimit:1,trialDays:14,graceDays:7
},admin.session),[201],"plan").plan;
const clinicBody={legalName:"PH07 Kabul Dental Clinic",displayName:"PH07 Dental",
 clinicType:"office",province:"Kabul",city:"Kabul",address:"Clinic pilot address in Kabul",
 phone:"+93700000068",email:owner.email,selectedPlanId:plan.id,licenseNumber:"PH07-"+nonce};
const clinic=ok(await request("/v1/clinics","POST",clinicBody,owner.session),
 [201],"new clinic").clinic;
const unrelated=ok(await request("/v1/clinics","POST",{
 ...clinicBody,legalName:"PH07 Other Practice",displayName:"PH07 Other",
 licenseNumber:"PH07-OTHER-"+nonce},owner.session),[201],"unrelated clinic").clinic;
ok(await request(api(clinic.id)+"/appointments","POST",{},owner.session),[403],
 "draft clinic cannot create real bookings before activating subscription");
const providerService={name:"Dental Consultation",category:"Consultation",
 description:"Initial general consultation",durationMinutes:30,preparationMinutes:0,
 basePriceAfn:500,requiresChair:true,publicBooking:false,active:true};
const service=ok(await request(ops(clinic.id)+"/services","POST",
 providerService,owner.session),[201],"service").service;
const chair=ok(await request(ops(clinic.id)+"/resources","POST",{
 code:"PH07-A",label:"Chair A",kind:"chair",equipment:"Dental exam chair",active:true
},owner.session),[201],"chair A").resource;
const chair2=ok(await request(ops(clinic.id)+"/resources","POST",{
 code:"PH07-B",label:"Chair B",kind:"chair",equipment:null,active:true
},owner.session),[201],"chair B").resource;
ok(await request(ops(clinic.id)+"/hours/clinic","PUT",{week:week()},owner.session),
 [200],"Saturday clinic hours");
await enableMfa(owner);
const evidence=await fetch(API+"/v1/clinics/"+clinic.id+"/evidence",{
 method:"POST",headers:{origin,cookie:owner.session,"content-type":"application/octet-stream",
  "x-document-kind":"clinic_license","x-file-name":"license.pdf"},
 body:Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")});
assert.equal(evidence.status,201,"evidence for trial");
ok(await request("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.session),
 [200],"clinic submit");
const d1=await invite(owner,clinic.id,dentist,"dentist");
const d2=await invite(owner,clinic.id,dentist2,"dentist");
await invite(owner,clinic.id,reception,"receptionist");
await invite(owner,clinic.id,manager,"manager");
await invite(owner,clinic.id,assistant,"assistant");
ok(await request(ops(clinic.id)+"/hours/providers/"+d1.membershipId,"PUT",
 {week:week()},owner.session),[200],"dentist1 Saturday shift");
ok(await request(ops(clinic.id)+"/hours/providers/"+d2.membershipId,"PUT",
 {week:week()},owner.session),[200],"dentist2 Saturday shift");
const patientBody=(n)=>({
 preferredName:"PH07 Patient "+n,familyName:"Test",phone:"+93700012"+String(n).padStart(3,"0"),
 noticeAcknowledged:true,ageEstimate:30
});
const p1=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(1),reception.session),[201],"patient1").patient;
const p2=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(2),reception.session),[201],"patient2").patient;
const p3=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(3),reception.session),[201],"patient3").patient;
const date=saturdayFromNow(),base=api(clinic.id),o=ops(clinic.id);
export {API,origin,key,request,ok,cookie,signup,invite,fixture,doBooking,admin,owner,dentist,dentist2,reception,assistant,stranger,clinic,unrelated,service,chair,p1,p2,p3,date,base};
