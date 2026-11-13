import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHmac} from "node:crypto";
const API="http://localhost:4000",origin="http://localhost:3001";
const password="Dandan-PH06-Booked#2026";
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
 throw new Error("PH06 expected test mail missing: "+email);
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
 assert.equal(run.status,0,"PH06 clock fixture failed: "+run.stderr+" "+run.stdout);
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
 planKey:"professional",billingPeriod:"monthly",label:"PH06 Booking",
 priceAfn:1400,staffLimit:6,branchLimit:1,trialDays:14,graceDays:7
},admin.session),[201],"plan").plan;
const clinicBody={legalName:"PH06 Kabul Dental Clinic",displayName:"PH06 Dental",
 clinicType:"office",province:"Kabul",city:"Kabul",address:"Clinic pilot address in Kabul",
 phone:"+93700000068",email:owner.email,selectedPlanId:plan.id,licenseNumber:"PH06-"+nonce};
const clinic=ok(await request("/v1/clinics","POST",clinicBody,owner.session),
 [201],"new clinic").clinic;
const unrelated=ok(await request("/v1/clinics","POST",{
 ...clinicBody,legalName:"PH06 Other Practice",displayName:"PH06 Other",
 licenseNumber:"PH06-OTHER-"+nonce},owner.session),[201],"unrelated clinic").clinic;
ok(await request(api(clinic.id)+"/appointments","POST",{},owner.session),[403],
 "draft clinic cannot create real bookings before activating subscription");
const providerService={name:"Dental Consultation",category:"Consultation",
 description:"Initial general consultation",durationMinutes:30,preparationMinutes:0,
 basePriceAfn:500,requiresChair:true,publicBooking:false,active:true};
const service=ok(await request(ops(clinic.id)+"/services","POST",
 providerService,owner.session),[201],"service").service;
const chair=ok(await request(ops(clinic.id)+"/resources","POST",{
 code:"PH06-A",label:"Chair A",kind:"chair",equipment:"Dental exam chair",active:true
},owner.session),[201],"chair A").resource;
const chair2=ok(await request(ops(clinic.id)+"/resources","POST",{
 code:"PH06-B",label:"Chair B",kind:"chair",equipment:null,active:true
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
 preferredName:"PH06 Patient "+n,familyName:"Test",phone:"+93700012"+String(n).padStart(3,"0"),
 noticeAcknowledged:true,ageEstimate:30
});
const p1=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(1),reception.session),[201],"patient1").patient;
const p2=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(2),reception.session),[201],"patient2").patient;
const p3=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients","POST",
 patientBody(3),reception.session),[201],"patient3").patient;
const date=saturdayFromNow(),base=api(clinic.id),o=ops(clinic.id);
const catalog=ok(await request(base+"/catalog","GET",undefined,reception.session),
 [200],"clinic catalog");
assert.equal(catalog.providers.length,2);
assert.equal(catalog.resources.length,2);
ok(await request(base+"/catalog","GET",undefined,stranger.session),[404],"stranger cannot see clinic");
ok(await request(base+"/catalog","GET",undefined,admin.session),[403],"platform admin has no PHI access");
const query=new URLSearchParams({date,serviceId:service.id,providerId:d1.membershipId,
 resourceId:chair.id});
const preview=ok(await request(base+"/slots?"+query,"GET",undefined,reception.session),
 [200],"real Saturday 09:00 slot");
assert.equal(preview.staffBookable,true);
assert.ok(preview.slots.some(x=>x.start==="09:00"));
const token=key();
const firstBody={
 patientId:p1.id,serviceId:service.id,providerId:d1.membershipId,resourceId:chair.id,
 date,start:"09:00",source:"walk_in",
 administrativeNote:"Walk-in intake at front desk",idempotencyKey:token
};
const first=ok(await request(base+"/appointments","POST",firstBody,reception.session),
 [201],"book walk-in").appointment;
assert.equal(first.status,"confirmed");
assert.equal(first.source,"walk_in");
assert.equal(first.serviceVersion,1);
assert.equal(first.servicePriceAfn,500);
const replay=ok(await request(base+"/appointments","POST",firstBody,reception.session),
 [200],"idempotent exact replay");
assert.equal(replay.appointment.id,first.id);
assert.equal(replay.replayed,true);
ok(await request(base+"/appointments","POST",{...firstBody,start:"09:15"},reception.session),
 [409],"cannot reuse action key for changed details");
ok(await request(api(unrelated.id)+"/appointments/"+first.id,"GET",undefined,owner.session),
 [404],"cannot read appointment by id in other clinic");
ok(await request(base+"/appointments/"+first.id,"GET",undefined,stranger.session),
 [404],"outside tenant cannot read appointment detail");
ok(await request(base+"/appointments","POST",{
 ...firstBody,idempotencyKey:key(),patientId:p2.id
},reception.session),[409],"duplicate dentist or chair time rejected");
const afterFirst=ok(await request(base+"/slots?"+query,"GET",undefined,reception.session),
 [200],"occupied time removed from preview");
assert.ok(!afterFirst.slots.some(x=>x.start==="09:00"));
const collision=await Promise.all([
 doBooking(clinic.id,reception,p2,service,d1,chair,date,"09:30"),
 doBooking(clinic.id,reception,p3,service,d1,chair,date,"09:30")
]);
assert.deepEqual(collision.map(x=>x.status).sort((a,b)=>a-b),[201,409],
 "two concurrent POSTs must produce exactly one booking");
const winner=collision.find(x=>x.status===201).data.appointment;
const loser=collision.find(x=>x.status===409).data;
assert.equal(loser.code,"APPOINTMENT_SLOT_UNAVAILABLE");
assert.ok(loser.alternatives.length>0&&loser.alternatives.length<=3,
 "slot conflict should suggest actual alternative openings");
ok(await doBooking(clinic.id,reception,p3,service,d2,chair,date,"09:00"),
 [409],"different dentist cannot collide on same chair");
const doctor2=ok(await doBooking(clinic.id,reception,p3,service,d2,chair2,date,"09:00"),
 [201],"same time with separate dentist and chair works").appointment;
ok(await request(base+"/appointments","POST",{
 ...firstBody,providerId:d2.membershipId,resourceId:chair2.id,
 idempotencyKey:key()},dentist.session),[403],"dentist cannot schedule someone else's roster");
const assistantView=ok(await request(base+"/calendar?from="+date+"&to="+date,
 "GET",undefined,assistant.session),[200],"assistant calendar");
assert.ok(assistantView.appointments.length>=3);
assert.ok(assistantView.appointments.every(a=>a.administrativeNote===null&&a.patient?.phone===null),
 "assistant sees only minimum queue patient identifiers");
const doc1=ok(await request(base+"/calendar?from="+date+"&to="+date,
 "GET",undefined,dentist.session),[200],"dentist own calendar");
assert.ok(doc1.appointments.every(a=>a.providerMembershipId===d1.membershipId));
const doc2=ok(await request(base+"/calendar?from="+date+"&to="+date,
 "GET",undefined,dentist2.session),[200],"other dentist own calendar");
assert.ok(doc2.appointments.every(a=>a.providerMembershipId===d2.membershipId));
ok(await request(base+"/appointments/"+doctor2.id,"GET",undefined,dentist.session),
 [404],"dentist cannot read other provider's appointment");
const updatedService=ok(await request(o+"/services/"+service.id,"PATCH",{
 ...providerService,version:1,basePriceAfn:850
},owner.session),[200],"change service estimate").service;
assert.equal(updatedService.version,2);
const unchanged=ok(await request(base+"/appointments/"+first.id,"GET",undefined,reception.session),
 [200],"existing booking immutable snapshot").appointment;
assert.equal(unchanged.servicePriceAfn,500);
const reschedule={date,start:"10:00",providerId:d1.membershipId,resourceId:chair.id,
 reason:"Patient requested a later morning appointment",revision:first.revision,idempotencyKey:key()};
const moved=ok(await request(base+"/appointments/"+first.id+"/reschedule","POST",
 reschedule,reception.session),[200],"atomic reschedule preserves booked service").appointment;
assert.equal(moved.servicePriceAfn,500);
assert.equal(moved.serviceVersion,1);
assert.equal(moved.revision,first.revision+1);
assert.equal(moved.startAt,date+"T05:30:00.000Z");
const movedReplay=ok(await request(base+"/appointments/"+first.id+"/reschedule","POST",
 reschedule,reception.session),[200],"idempotent reschedule");
assert.equal(movedReplay.appointment.id,first.id);
assert.equal(movedReplay.replayed,true);
const oldTime=ok(await request(base+"/slots?"+query,"GET",undefined,reception.session),
 [200],"old time released");
assert.ok(oldTime.slots.some(s=>s.start==="09:00"),"original spot should reopen");
const conflict=ok(await request(base+"/appointments/"+first.id+"/reschedule","POST",{
 date,start:"09:30",providerId:d1.membershipId,resourceId:chair.id,
 reason:"A conflicting schedule test reschedule attempt",
 revision:moved.revision,idempotencyKey:key()
},reception.session),[409],"reschedule occupied provider slot rejected");
assert.equal(conflict.code,"APPOINTMENT_SLOT_UNAVAILABLE");
const preserved=ok(await request(base+"/appointments/"+first.id,"GET",undefined,reception.session),
 [200],"failed reschedule did not lose reservation").appointment;
assert.equal(preserved.startAt,moved.startAt);
const history=ok(await request(base+"/appointments/"+first.id,"GET",undefined,reception.session),
 [200],"appointment timeline").events;
assert.ok(history.some(e=>e.action==="created"));
assert.ok(history.some(e=>e.action==="rescheduled"&&e.beforeStartAt===first.startAt));
const patientHistory=ok(await request(base+"/patients/"+p1.id+"/appointments","GET",
 undefined,reception.session),[200],"patient detail appointments");
assert.equal(patientHistory.appointments.length,1);
assert.equal(patientHistory.patient.patientNumber,p1.patientNumber);
ok(await request(o+"/services/"+service.id,"PATCH",{
 ...providerService,version:2,basePriceAfn:850,active:false
},owner.session),[409],"future appointments block service deactivation");
ok(await request(o+"/resources/"+chair.id,"PATCH",{
 code:chair.code,label:chair.label,kind:"chair",equipment:chair.equipment,
 active:false,revision:chair.revision
},owner.session),[409],"future chair appointment blocks deactivation");
const existingWeek=ok(await request(o+"/hours","GET",undefined,owner.session),
 [200],"current weekly hour revisions");
const closedSaturday=existingWeek.hours.map(d=>({
 ...d,isOpen:false,breaks:[]
}));
ok(await request(o+"/hours/clinic","PUT",{week:closedSaturday},owner.session),
 [409],"staff cannot close booked day without resolving appointments");
ok(await request(o+"/exceptions","POST",{
 kind:"closed",startDate:date,endDate:date,reason:"Clinic holiday while booked patients exist"
},owner.session),[409],"holiday cannot silently strand booked appointment");
const patientCurrent=ok(await request("/v1/registry/clinics/"+clinic.id+"/patients/"+p1.id,
 "GET",undefined,owner.session),[200],"load patient revision").patient;
ok(await request("/v1/registry/clinics/"+clinic.id+"/patients/"+p1.id+"/status",
 "PATCH",{status:"inactive",revision:patientCurrent.revision,
  reason:"Attempt to archive patient with a future visit"},owner.session),
 [409],"patient archive blocked with future appointment");
ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"completed",revision:moved.revision,idempotencyKey:key()
},dentist.session),[409],"cannot complete before starting care");
ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"no_show",reason:"Patient did not arrive at scheduled time",
 revision:moved.revision,idempotencyKey:key()
},reception.session),[409],"cannot no-show a future booked patient");
ok(await request(base+"/appointments/"+doctor2.id+"/status","POST",{
 status:"cancelled",reason:"Patient called to cancel the scheduled visit",
 revision:doctor2.revision,idempotencyKey:key()
},dentist2.session),[403],"dentist cannot cancel receptionist-managed booking");
const cancelled=ok(await request(base+"/appointments/"+doctor2.id+"/status","POST",{
 status:"cancelled",reason:"Patient called to cancel the scheduled visit",
 revision:doctor2.revision,idempotencyKey:key()
},reception.session),[200],"cancel booking safely").appointment;
assert.equal(cancelled.status,"cancelled");
ok(await request(base+"/appointments/"+doctor2.id+"/status","POST",{
 status:"arrived",revision:cancelled.revision,idempotencyKey:key()
},reception.session),[409],"cancelled appointment cannot check in");
fixture(clinic.id,first.id);
const queue=ok(await request(base+"/queue","GET",undefined,reception.session),[200],"today queue");
assert.ok(queue.queue.some(a=>a.id===first.id&&a.status==="confirmed"));
const current=ok(await request(base+"/appointments/"+first.id,"GET",undefined,reception.session),
 [200],"fixture appointment").appointment;
const arrivalKey=key();
const arrival={status:"arrived",revision:current.revision,idempotencyKey:arrivalKey};
const arrived=ok(await request(base+"/appointments/"+first.id+"/status","POST",
 arrival,reception.session),[200],"front desk check in").appointment;
assert.ok(arrived.arrivedAt);
const again=ok(await request(base+"/appointments/"+first.id+"/status","POST",
 arrival,reception.session),[200],"arrival double-tap replay");
assert.equal(again.replayed,true);
ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"in_treatment",revision:arrived.revision,idempotencyKey:key()
},dentist2.session),[404],"unassigned clinician cannot begin care (privacy-preserving 404)");
ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"in_treatment",revision:arrived.revision,idempotencyKey:key()
},reception.session),[403],"reception cannot start clinical care");
const started=ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"in_treatment",revision:arrived.revision,idempotencyKey:key()
},dentist.session),[200],"assigned dentist starts care").appointment;
assert.equal(started.status,"in_treatment");
const completed=ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"completed",revision:started.revision,idempotencyKey:key()
},dentist.session),[200],"assigned dentist completes visit").appointment;
assert.equal(completed.status,"completed");
assert.ok(completed.completedAt);
ok(await request(base+"/appointments/"+first.id+"/status","POST",{
 status:"cancelled",revision:completed.revision,
 reason:"Attempted invalid post-completion cancellation",idempotencyKey:key()
},reception.session),[409],"completed appointment cannot cancel");
const finalQueue=ok(await request(base+"/queue","GET",undefined,owner.session),[200],"queue updated");
assert.ok(finalQueue.queue.some(a=>a.id===first.id&&a.status==="completed"));
fixture(clinic.id,winner.id,60);
const currentWinner=ok(await request(base+"/appointments/"+winner.id,"GET",undefined,reception.session),
 [200],"fixture winner").appointment;
const absent=ok(await request(base+"/appointments/"+winner.id+"/status","POST",{
 status:"no_show",revision:currentWinner.revision,idempotencyKey:key(),
 reason:"Patient missed the appointment without notice"
},reception.session),[200],"mark no-show after start").appointment;
assert.equal(absent.status,"no_show");
ok(await request(base+"/appointments/"+winner.id+"/status","POST",{
 status:"arrived",revision:absent.revision,idempotencyKey:key()
},reception.session),[409],"no-show cannot later be checked in silently");
const final=ok(await request(base+"/overview","GET",undefined,owner.session),
 [200],"real owner dashboard counts");
assert.ok(final.counts.completed>=1);
assert.ok(final.counts.no_show>=1);
console.log("PH06_INTEGRATION_OK — clinician/chair conflict, concurrent idempotency, safe reschedule, leave/closure guards, role-private calendar, walk-in queue and terminal states.");
