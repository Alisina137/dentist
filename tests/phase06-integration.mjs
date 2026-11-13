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
     .filter(line=>line.includes("PH06 operations failure")).slice(-4);
   console.error("PH06 safe DB diagnostics",trace);
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

const admin=await signup("admin-ph06"),owner=await signup("owner-ph06"),
 dentist=await signup("dentist-ph06"),dentist2=await signup("dentist-two-ph06"),
 reception=await signup("reception-ph06"),stranger=await signup("stranger-ph06");
const grant=spawnSync("pnpm",["admin:grant",admin.email],{
 env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},encoding:"utf8"
});
assert.equal(grant.status,0,"admin grant");
await enableMfa(admin);
const plan=expect(await req("/v1/admin/plans","POST",{
 planKey:"professional",billingPeriod:"monthly",label:"PH06 Plan",
 priceAfn:1900,staffLimit:5,branchLimit:1,trialDays:14,graceDays:7
},admin.session),[201],"create plan").plan;
const clinicBody={legalName:"PH06 Clinic",displayName:"Appointment Practice",clinicType:"office",
 province:"Kabul",city:"Kabul",address:"Testing Clinic Street, Kabul",
 phone:"+93700123999",email:owner.email,selectedPlanId:plan.id,licenseNumber:"PH06-"+nonce};
const clinic=expect(await req("/v1/clinics","POST",clinicBody,owner.session),[201],"create clinic").clinic;
const other=expect(await req("/v1/clinics","POST",{
 ...clinicBody,displayName:"Another Clinic",legalName:"Separate PH06 Practice",
 licenseNumber:"PH06-other-"+nonce
},owner.session),[201],"create other clinic").clinic;
const op="/v1/operations/clinics/"+clinic.id,api="/v1/appointments/clinics/"+clinic.id;
const service=expect(await req(op+"/services","POST",{
 name:"Consultation",category:"General Dentistry",description:"",
 durationMinutes:30,preparationMinutes:0,basePriceAfn:800,
 requiresChair:true,publicBooking:false,active:true
},owner.session),[201],"service").service;
const chair=expect(await req(op+"/resources","POST",{
 code:"A-01",label:"Chair A",kind:"chair",equipment:"Standard",active:true
},owner.session),[201],"chair").resource;
const chairTwo=expect(await req(op+"/resources","POST",{
 code:"B-02",label:"Chair B",kind:"chair",equipment:"Standard",active:true
},owner.session),[201],"second chair").resource;
await enableMfa(owner);
const evidence=await fetch(API+"/v1/clinics/"+clinic.id+"/evidence",{
 method:"POST",headers:{origin,cookie:owner.session,"content-type":"application/octet-stream",
 "x-document-kind":"clinic_license","x-file-name":"clinic-license.pdf"},
 body:Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")
});
assert.equal(evidence.status,201,"test license");
expect(await req("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.session),
 [200],"activate legitimate trial");
const invited=await invite(owner,clinic.id,dentist,"dentist");
const invitedTwo=await invite(owner,clinic.id,dentist2,"dentist");
const invitedReception=await invite(owner,clinic.id,reception,"receptionist");
expect(await req(op+"/hours/clinic","PUT",{week:week()},owner.session),[200],"clinic hours");
expect(await req(op+"/hours/providers/"+invited.membershipId,"PUT",{week:week()},owner.session),
 [200],"dentist shifts");
expect(await req(op+"/hours/providers/"+invitedTwo.membershipId,"PUT",{week:week()},owner.session),
 [200],"second dentist shifts");
expect(await req(op+"/hours/resources/"+chair.id,"PUT",{week:week()},owner.session),
 [200],"chair shifts");
expect(await req(op+"/hours/resources/"+chairTwo.id,"PUT",{week:week()},owner.session),
 [200],"other chair shifts");
const addPatient=async(name,actor=owner)=>{
 return expect(await req("/v1/registry/clinics/"+clinic.id+"/patients","POST",{
  preferredName:name,familyName:"Patient",phone:"+93700666661",dateOfBirth:null,
  ageEstimate:25,province:"Kabul",city:"Kabul",address:"",
  alternateContact:"",emergencyContact:"",noticeAcknowledged:true
 },actor.session),[201],"add patient "+name).patient;
};
const patient=await addPatient("PH06 One");
const patient2=await addPatient("PH06 Two");
const saturday=nextSaturday();
const first={patientId:patient.id,serviceId:service.id,providerId:invited.membershipId,
 resourceId:chair.id,date:saturday,start:"09:00",source:"staff",adminNote:"Intake scheduled",
 idempotencyKey:"PH06-BOOK-ONE-"+nonce};
const second={...first,patientId:patient2.id,idempotencyKey:"PH06-BOOK-TWO-"+nonce};
expect(await req(api+"/appointments","POST",first,stranger.session),[404],
 "stranger cannot add patient appointments");
expect(await req(api+"/appointments","POST",first,admin.session),[403],
 "platform admin excluded from clinic appointment data");
expect(await req(api+"/appointments","POST",{
 ...first,providerId:invitedTwo.membershipId
},dentist.session),[403],"dentist cannot impersonate another dentist");
const created=expect(await req(api+"/appointments","POST",first,reception.session),
 [201],"reception books real patient").appointment;
assert.equal(created.status,"confirmed");
assert.equal(created.serviceName,"Consultation");
assert.equal(created.priceSnapshotAfn,800);
assert.equal(new Date(created.startAt).toISOString(),saturday+"T04:30:00.000Z");
const replay=expect(await req(api+"/appointments","POST",first,reception.session),
 [200],"same key replay");
assert.equal(replay.replayed,true);
assert.equal(replay.appointment.id,created.id);
expect(await req(api+"/appointments","POST",{...first,start:"09:30"},
 reception.session),[409],"idempotency key cannot change payload");
expect(await req(api+"/appointments","POST",second,owner.session),[409],
 "same provider/chair double booking blocked");
const differentDoctorSameChair={...second,providerId:invitedTwo.membershipId};
expect(await req(api+"/appointments","POST",differentDoctorSameChair,reception.session),
 [409],"chair conflict blocks another dentist");
const sameDoctorOtherChair={...second,resourceId:chairTwo.id};
expect(await req(api+"/appointments","POST",sameDoctorOtherChair,reception.session),
 [409],"dentist conflict blocks different chair");
const future={...second,start:"09:30",idempotencyKey:"PH06-BOOK-NEXT-"+nonce};
const createdTwo=expect(await req(api+"/appointments","POST",future,reception.session),
 [201],"nonoverlapping second booking").appointment;
const daily=expect(await req(api+"/calendar?from="+saturday+"&to="+saturday,"GET",
 undefined,reception.session),[200],"day calendar");
assert.equal(daily.appointments.length,2);
assert.ok(daily.appointments.every(x=>x.patient?.patientNumber));
const doctorView=expect(await req(api+"/calendar?from="+saturday+"&to="+saturday,"GET",
 undefined,dentist.session),[200],"clinician calendar");
assert.equal(doctorView.appointments.length,2);
const otherDoctorView=expect(await req(api+"/calendar?from="+saturday+"&to="+saturday,"GET",
 undefined,dentist2.session),[200],"other dentist may only see own appointments");
assert.equal(otherDoctorView.appointments.length,0);
expect(await req(api+"/appointments/"+created.id,"GET",undefined,dentist2.session),
 [403],"dentist cannot read other dentist detail");
expect(await req("/v1/appointments/clinics/"+other.id+"/appointments/"+created.id,
 "GET",undefined,owner.session),[404],"appointment ID cannot cross clinic");
const detail=expect(await req(api+"/appointments/"+created.id,"GET",undefined,reception.session),
 [200],"detail and history");
assert.equal(detail.events.length,1);
expect(await req(api+"/appointments/"+created.id+"/reschedule","PATCH",{
 revision:created.revision,date:saturday,start:"09:30"
},reception.session),[409],"reschedule conflicts with second booking");
const original=expect(await req(api+"/appointments/"+created.id,"GET",undefined,reception.session),
 [200],"failed move did not alter appointment").appointment;
assert.equal(original.startAt,created.startAt);
const moved=expect(await req(api+"/appointments/"+created.id+"/reschedule","PATCH",{
 revision:created.revision,date:saturday,start:"10:00"
},reception.session),[200],"atomically move original booking").appointment;
assert.equal(moved.revision,2);
expect(await req(api+"/appointments/"+created.id+"/reschedule","PATCH",{
 revision:created.revision,date:saturday,start:"10:30"
},reception.session),[409],"stale reschedule blocked");
expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"completed",revision:moved.revision
},reception.session),[409],"cannot skip queue steps");
expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"in_treatment",revision:moved.revision
},reception.session),[409],"cannot start before check-in");
const checked=expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"arrived",revision:moved.revision
},reception.session),[200],"check in").appointment;
assert.ok(checked.checkedInAt);
expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"in_treatment",revision:checked.revision
},reception.session),[403],"only clinician starts treatment");
const inCare=expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"in_treatment",revision:checked.revision
},dentist.session),[200],"assigned dentist starts treatment").appointment;
const complete=expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"completed",revision:inCare.revision
},dentist.session),[200],"dentist completes visit without a fake clinical note").appointment;
assert.ok(complete.completedAt);
expect(await req(api+"/appointments/"+created.id+"/status","PATCH",{
 status:"cancelled",revision:complete.revision,reason:"Change completed appointment"
},reception.session),[409],"completed appointments are terminal");
const cancel=expect(await req(api+"/appointments/"+createdTwo.id+"/status","PATCH",{
 status:"cancelled",revision:createdTwo.revision,reason:"Patient requested cancellation by phone"
},reception.session),[200],"cancellation with mandatory reason").appointment;
assert.equal(cancel.status,"cancelled");
expect(await req(api+"/appointments/"+createdTwo.id+"/status","PATCH",{
 status:"arrived",revision:cancel.revision
},reception.session),[409],"cancelled booking cannot check in");
const newBooking=expect(await req(api+"/appointments","POST",{
 ...second,resourceId:chair.id,start:"09:30",idempotencyKey:"PH06-RELEASE-"+nonce
},reception.session),[201],"cancelled slot was released").appointment;
expect(await req(api+"/appointments/"+newBooking.id+"/status","PATCH",{
 status:"no_show",revision:newBooking.revision,reason:"Patient has not arrived for appointment"
},reception.session),[409],"future appointments cannot be declared no-show prematurely");
const history=expect(await req(api+"/appointments/"+created.id,"GET",undefined,owner.session),
 [200],"history survives mutations");
assert.equal(history.events.length,5);
const queue=expect(await req(api+"/queue?date="+saturday,"GET",undefined,reception.session),
 [200],"queue view");
assert.equal(queue.appointments.length,3);
const summary=expect(await req(api+"/summary?date="+saturday,"GET",undefined,owner.session),
 [200],"appointment stats");
assert.equal(summary.counts.completed,1);
assert.equal(summary.counts.cancelled,1);
console.log("PH06_INTEGRATION_OK: booking, 2 conflict types, replay safety, reschedule atomicity, clinic isolation, role/queue lifecycle and cancellation.");
