import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";

const API="http://localhost:4000",origin="http://localhost:3001";
const PASS="Dandan-Phase04-Integration@2026";
const nonce=String(Date.now());
async function req(path,method="GET",body,cookie=""){
 const headers={origin,...(cookie?{cookie}:{}),...(body===undefined?{}:{"content-type":"application/json"})};
 const result=await fetch(API+path,{method,headers,redirect:"manual",
  body:body===undefined?undefined:JSON.stringify(body)});
 let data={};const raw=await result.text();
 try{data=JSON.parse(raw);}catch{}
 return {status:result.status,data,headers:result.headers};
}
function expect(x,codes,label){
 if(x.status>=500){
   const trace=readFileSync("/tmp/dandanlink-api.log","utf8").split("\n")
     .filter(line=>line.includes("PH04 operations failure")).slice(-4);
   console.error("PH04 safe DB diagnostics",trace);
 }
 assert.ok(codes.includes(x.status),label+": expected "+codes+" got "+x.status+" "+JSON.stringify(x.data).slice(0,260));
 return x.data;
}
function cookie(x){return x.headers.getSetCookie().map(p=>p.split(";")[0]).join("; ");}
async function mail(email,kind){
 for(let attempt=0;attempt<90;attempt++){
  const log=await readFile("/tmp/dandanlink-api.log","utf8").catch(()=>"");
  const rows=[...log.matchAll(/to:\s*'([^']+)'[\s\S]{0,500}?subject:\s*'([^']+)'[\s\S]{0,1200}?url:\s*'([^']+)'/g)];
  const last=rows.filter(x=>x[1]===email&&x[2].includes(kind)).at(-1);
  if(last)return last[3];
  await new Promise(r=>setTimeout(r,120));
 }
 throw Error("Expected test mail not found for "+email);
}
async function signup(label){
 const email=label+"-"+nonce+"@example.test";
 expect(await req("/api/auth/sign-up/email","POST",{name:label,email,password:PASS,
  callbackURL:origin+"/clinic/verify"}),[200,201],"register "+label);
 const link=await mail(email,"Verify your DandanLink account");
 const callback=new URL(link);
 expect(await req(callback.pathname+callback.search),[200,302,303],"verify "+label);
 const sign=await req("/api/auth/sign-in/email","POST",{email,password:PASS});
 expect(sign,[200],"signin "+label);
 return {email,name:label,session:cookie(sign)};
}
function totp(url){
 const secret=new URL(url).searchParams.get("secret");assert.ok(secret);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes=[];let bits=0,n=0;
 for(const char of secret.toUpperCase().replaceAll("=","")){
  const digit=alphabet.indexOf(char);if(digit<0)continue;
  n=n<<5|digit;bits+=5;if(bits>=8){bits-=8;bytes.push(n>>>bits&255);}
 }
 const step=Buffer.alloc(8);step.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const mac=createHmac("sha1",Buffer.from(bytes)).update(step).digest();
 return String((mac.readUInt32BE(mac.at(-1)&15)&0x7fffffff)%1000000).padStart(6,"0");
}
async function enableMfa(user){
 const enabled=expect(await req("/api/auth/two-factor/enable","POST",
  {password:PASS,method:"totp"},user.session),[200],"enable MFA").totpURI;
 const check=await req("/api/auth/two-factor/verify-totp","POST",{code:totp(enabled)},user.session);
 expect(check,[200],"verify MFA");
 user.session=cookie(check)||user.session;
}
async function invite(owner,clinicId,user,role){
 expect(await req("/v1/team/clinics/"+clinicId+"/invitations","POST",
  {email:user.email,role},owner.session),[201],"invite "+role);
 const link=await mail(user.email,"clinic staff invitation");
 const token=new URL(link).searchParams.get("token");
 return expect(await req("/v1/team/invitations/accept","POST",
  {token},user.session),[200],"accept "+role);
}
function week(weekday=0){
 return Array.from({length:7},(_,index)=>({weekday:index,isOpen:index===weekday,
  startMinute:540,endMinute:720,breaks:[],revision:0}));
}
function nextSaturday(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
  .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 const now=new Date([parts.year,parts.month,parts.day].join("-")+"T12:00:00Z");
 const gap=(6-now.getUTCDay()+7)%7||7;
 return new Date(now.getTime()+gap*86400000).toISOString().slice(0,10);
}
const admin=await signup("admin-ph04"),owner=await signup("owner-ph04"),
 dentist=await signup("dentist-ph04"),manager=await signup("manager-ph04"),
 reception=await signup("reception-ph04"),stranger=await signup("stranger-ph04");
const command=spawnSync("pnpm",["admin:grant",admin.email],{
 env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},
 encoding:"utf8"
});
assert.equal(command.status,0,"admin bootstrap: "+command.stderr);
await enableMfa(admin);
const plan=expect(await req("/v1/admin/plans","POST",{
 planKey:"professional",billingPeriod:"monthly",label:"PH04 Plan",
 priceAfn:1100,staffLimit:4,branchLimit:1,trialDays:14,graceDays:7
},admin.session),[201],"create plan").plan;
const baseClinic={legalName:"Phase Four Dental Practice",displayName:"PH04 Clinical",
 clinicType:"office",province:"Kabul",city:"Kabul",address:"Kabul example office",
 phone:"+93700123999",email:owner.email,selectedPlanId:plan.id,licenseNumber:"PH04-"+nonce};
const clinic=expect(await req("/v1/clinics","POST",baseClinic,owner.session),[201],"create clinic").clinic;
const another=expect(await req("/v1/clinics","POST",{
 ...baseClinic,legalName:"Separate PH04 Clinic",displayName:"PH04 Other",
 licenseNumber:"PH04-other-"+nonce
},owner.session),[201],"create second clinic").clinic;
const root="/v1/operations/clinics/"+clinic.id;
const other="/v1/operations/clinics/"+another.id;
const before=expect(await req(root+"/summary","GET",undefined,owner.session),[200],"empty summary");
assert.equal(before.metrics.services,0);
assert.equal(before.readyForPreview,false);
const initialService={name:"Consultation",category:"General Dentistry",
 description:"Dental examination and consultation",durationMinutes:30,preparationMinutes:0,
 basePriceAfn:500,requiresChair:true,publicBooking:false,active:true};
expect(await req(root+"/services","POST",initialService,reception.session),[404],
 "non-member cannot write clinic resource");
expect(await req(root+"/services","POST",initialService,admin.session),[403],
 "platform admin cannot access clinic treatment settings");
const service=expect(await req(root+"/services","POST",initialService,owner.session),[201],
 "create real service").service;
assert.equal(service.version,1);
const versions1=expect(await req(root+"/services/"+service.id+"/versions","GET",undefined,owner.session),
 [200],"initial service price version");
assert.equal(versions1.versions.length,1);
expect(await req(root+"/services","POST",{...initialService,name:"Consultation"},owner.session),
 [409],"reject duplicate service name");
expect(await req(other+"/services/"+service.id+"/versions","GET",undefined,owner.session),
 [404],"tenant cannot read another clinic's service history");
const updated=expect(await req(root+"/services/"+service.id,"PATCH",{
 ...initialService,basePriceAfn:800,durationMinutes:30,version:service.version
},owner.session),[200],"version service price").service;
assert.equal(updated.version,2);
expect(await req(root+"/services/"+service.id,"PATCH",{
 ...initialService,version:service.version
},owner.session),[409],"stale service update blocked");
const history=expect(await req(root+"/services/"+service.id+"/versions","GET",undefined,owner.session),
 [200],"immutable price history").versions;
assert.equal(history.length,2);
assert.equal(history[0].basePriceAfn,800);
assert.equal(history[1].basePriceAfn,500);
const chairInput={code:"chair-a",label:"Treatment Chair A",kind:"chair",
 equipment:"Standard chair + examination light",active:true};
const chair=expect(await req(root+"/resources","POST",chairInput,owner.session),
 [201],"create chair").resource;
assert.equal(chair.code,"CHAIR-A");
expect(await req(root+"/resources","POST",chairInput,owner.session),
 [409],"reject duplicate resource code");
const room=expect(await req(root+"/resources","POST",{
 code:"room-b",label:"Examination Room B",kind:"room",equipment:"Consultation table",active:true
},owner.session),[201],"create room").resource;
expect(await req(other+"/resources/"+chair.id,"PATCH",{
 ...chairInput,revision:chair.revision
},owner.session),[404],"resource id cannot cross clinics");
await enableMfa(owner);
const evidence=await fetch(API+"/v1/clinics/"+clinic.id+"/evidence",{
 method:"POST",headers:{origin,cookie:owner.session,
  "content-type":"application/octet-stream","x-document-kind":"clinic_license",
  "x-file-name":"clinic-license.pdf"},
 body:Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")
});
assert.equal(evidence.status,201,"upload clinic proof for legitimate trial");
expect(await req("/v1/clinics/"+clinic.id+"/submit","POST",
 {attested:true},owner.session),[200],"submit clinic to activate trial");
const dentistInvitation=await invite(owner,clinic.id,dentist,"dentist");
const managerInvitation=await invite(owner,clinic.id,manager,"manager");
const receptionistInvitation=await invite(owner,clinic.id,reception,"receptionist");
expect(await req("/v1/team/clinics/"+clinic.id+"/invitations","POST",{
 email:stranger.email,role:"dentist"
},owner.session),[409],"enforce staff capacity from subscribed plan");
expect(await req(root+"/services","POST",{...initialService,name:"Reception Action"},
 reception.session),[403],"reception can view but not manage pricing");
expect(await req(root+"/resources","POST",{
 ...chairInput,code:"reception-chair"},reception.session),[403],
 "reception cannot add chairs");
expect(await req(root+"/services","GET",undefined,reception.session),[200],
 "reception may read service details");
expect(await req(root+"/hours","GET",undefined,dentist.session),[200],
 "clinician can inspect clinic opening hours");
const invalidWeek=week();
invalidWeek[0].breaks=[{start:600,end:630},{start:620,end:645}];
expect(await req(root+"/hours/clinic","PUT",{week:invalidWeek},owner.session),
 [422],"reject overlapping clinic breaks");
const clinicSaved=expect(await req(root+"/hours/clinic","PUT",{week:week()},owner.session),
 [200],"save clinic hours");
assert.equal(clinicSaved.hours.length,7);
expect(await req(root+"/hours/clinic","PUT",{week:week()},owner.session),
 [409],"stale weekly schedule cannot silently overwrite");
const activeProvider=week();
expect(await req(root+"/hours/providers/"+managerInvitation.membershipId,
 "PUT",{week:activeProvider},owner.session),[422],
 "manager cannot be scheduled as dentist without clinical affiliation");
const providerSaved=expect(await req(root+"/hours/providers/"+dentistInvitation.membershipId,
 "PUT",{week:activeProvider},owner.session),[200],"save qualified dentist shift");
assert.equal(providerSaved.providers.length,7);
const chairSaved=expect(await req(root+"/hours/resources/"+chair.id,"PUT",
 {week:week()},owner.session),[200],"assign chair working schedule");
assert.equal(chairSaved.resources.length,7);
expect(await req(root+"/resources/"+chair.id,"PATCH",{
 ...chairInput,revision:chair.revision,code:"CHAIR-A",active:false
},owner.session),[409],"chair with active shift cannot silently deactivate");
const date=nextSaturday();
const params=new URLSearchParams({date,serviceId:service.id,
 providerId:dentistInvitation.membershipId,resourceId:chair.id});
let view=expect(await req(root+"/availability/preview?"+params,
 "GET",undefined,reception.session),[200],"Saturday candidate slots");
assert.equal(view.previewOnly,true);
assert.equal(view.bookable,false);
assert.equal(view.appointmentsImplemented,true,"PH06 now supports authenticated internal appointments");
assert.equal(view.timezone,"Asia/Kabul");
assert.equal(view.service.basePriceAfn,800);
assert.equal(view.slots[0].start,"09:00");
assert.equal(view.slots[0].startAt,date+"T04:30:00.000Z",
 "09:00 Kabul must be 04:30Z, independent of server timezone");
assert.ok(view.slots.some(s=>s.start==="11:30"),"11:30–12:00 candidate should exist");
assert.ok(!view.slots.some(s=>s.start==="11:45"),"slot must fit full duration");
const nextDay=new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10);
const sunday=expect(await req(root+"/availability/preview?"+new URLSearchParams({
 date:nextDay,serviceId:service.id,providerId:dentistInvitation.membershipId,
 resourceId:chair.id
}),"GET",undefined,owner.session),[200],"Sunday closed");
assert.equal(sunday.slots.length,0);
const persisted=expect(await req(root+"/hours","GET",undefined,owner.session),[200],
 "read back saved shifts");
const withBreak=persisted.hours.map(x=>({
 ...x,breaks:x.weekday===0?[{start:600,end:630}]:x.breaks
}));
expect(await req(root+"/hours/clinic","PUT",{week:withBreak},owner.session),
 [200],"save lunch break");
view=expect(await req(root+"/availability/preview?"+params,"GET",undefined,owner.session),
 [200],"preview after lunch break");
assert.ok(!view.slots.some(s=>s.start==="09:45"),"slot cannot cross lunch break");
assert.ok(!view.slots.some(s=>s.start==="10:00"),"slot cannot start in lunch break");
assert.ok(view.slots.some(s=>s.start==="10:30"),"next complete slot resumes after break");
const holiday=expect(await req(root+"/exceptions","POST",{
 startDate:date,endDate:date,kind:"closed",reason:"Clinic closed for staff training"
},owner.session),[201],"create holiday").exception;
expect(await req(root+"/exceptions","POST",{
 startDate:date,endDate:date,kind:"closed",reason:"Overlapping test holiday"
},owner.session),[409],"reject overlapping closure intervals");
view=expect(await req(root+"/availability/preview?"+params,"GET",undefined,owner.session),
 [200],"preview closure");
assert.equal(view.slots.length,0);
assert.equal(view.status,"holiday_closed");
expect(await req(root+"/exceptions/"+holiday.id,"DELETE",{
 reason:"Reopening after clinic training"
},reception.session),[403],"reception cannot delete closures");
expect(await req(root+"/exceptions/"+holiday.id,"DELETE",{
 reason:"Reopening after clinic training"
},owner.session),[200],"remove exception with reason");
const special=expect(await req(root+"/exceptions","POST",{
 startDate:date,endDate:date,kind:"special_hours",startMinute:600,endMinute:660,
 reason:"Clinic opens for a shorter session"
},owner.session),[201],"special hours exception").exception;
view=expect(await req(root+"/availability/preview?"+params,"GET",undefined,owner.session),
 [200],"limited special hours preview");
assert.ok(view.slots.length>0&&view.slots.every(s=>s.start>="10:00"&&s.end<="11:00"),
 "special hours must bound the entire service and buffer interval");
expect(await req(root+"/exceptions/"+special.id,"DELETE",{
 reason:"Special hour test is completed"
},owner.session),[200],"remove special hours");
expect(await req(root+"/hours/resources/"+chair.id,"DELETE",{
 reason:"Test resource shift removal"
},owner.session),[200],"clear chair shift");
const deactivated=expect(await req(root+"/resources/"+chair.id,"PATCH",{
 ...chairInput,revision:chair.revision,code:"CHAIR-A",active:false
},owner.session),[200],"deactivate unassigned chair").resource;
assert.equal(deactivated.active,false);
view=expect(await req(root+"/availability/preview?"+new URLSearchParams({
 date,serviceId:service.id,providerId:dentistInvitation.membershipId
}),"GET",undefined,owner.session),[200],"no active compatible chairs");
assert.equal(view.slots.length,0);
assert.equal(view.status,"chair_unavailable");
const final=expect(await req(root+"/summary","GET",undefined,owner.session),[200],"real readiness checklist");
assert.equal(final.metrics.services,1);
assert.equal(final.metrics.chairs,0);
assert.equal(final.readyForPreview,false);
console.log("PH04_INTEGRATION_OK: versioned service price, plan seats, chairs, 7-day shifts, breaks, closures, no fake booking, Kabul timezone, role/tenant authorization.");
