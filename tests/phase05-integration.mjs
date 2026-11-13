import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
const API="http://localhost:4000",origin="http://localhost:3001";
const PASSWORD="Dandan-Phase05-SafePassword!";
const runId=String(Date.now());
async function api(path,method="GET",body,session=""){
 const headers={origin,...(session?{cookie:session}:{}),...(body===undefined?{}:{"content-type":"application/json"})};
 const result=await fetch(API+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
 const raw=await result.text();let response={};
 try{response=JSON.parse(raw);}catch{}
 return {status:result.status,data:response,headers:result.headers};
}
function expect(resp,codes,label){
 assert.ok(codes.includes(resp.status),
  label+": expected "+codes.join("|")+" got "+resp.status+" "+JSON.stringify(resp.data).slice(0,300));
 return resp.data;
}
function jar(response){return response.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");}
async function emailLink(email,subject){
 for(let i=0;i<70;i++){
  const logs=await readFile("/tmp/dandanlink-api.log","utf8").catch(()=>"");
  const results=[...logs.matchAll(/to:\s*'([^']+)'[\s\S]{0,500}?subject:\s*'([^']+)'[\s\S]{0,1200}?url:\s*'([^']+)'/g)];
  const found=results.filter(x=>x[1]===email&&x[2].includes(subject)).at(-1);
  if(found)return found[3];
  await new Promise(r=>setTimeout(r,150));
 }
 throw new Error("Missing test email link for "+email);
}
async function signup(name){
 const email=name+"-"+runId+"@example.test";
 expect(await api("/api/auth/sign-up/email","POST",{name,email,password:PASSWORD,
  callbackURL:origin+"/clinic/verify"}),[200,201],"register "+name);
 const link=await emailLink(email,"Verify your DandanLink account");
 expect(await api(new URL(link).pathname+new URL(link).search),[200,302,303],"verify "+name);
 const signed=await api("/api/auth/sign-in/email","POST",{email,password:PASSWORD});
 expect(signed,[200],"sign in "+name);
 return {name,email,session:jar(signed)};
}
function totp(uri){
 const secret=new URL(uri).searchParams.get("secret");assert.ok(secret);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes=[];
 let bits=0,value=0;
 for(const letter of secret.toUpperCase().replaceAll("=","")){
  const n=alphabet.indexOf(letter);if(n<0)continue;
  value=(value<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}
 }
 const step=Buffer.alloc(8);step.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const m=createHmac("sha1",Buffer.from(bytes)).update(step).digest();
 return String((m.readUInt32BE(m.at(-1)&15)&0x7fffffff)%1000000).padStart(6,"0");
}
async function mfa(user){
 const enabled=expect(await api("/api/auth/two-factor/enable","POST",{password:PASSWORD,method:"totp"},user.session),[200],"enroll MFA");
 const verified=await api("/api/auth/two-factor/verify-totp","POST",{code:totp(enabled.totpURI)},user.session);
 expect(verified,[200],"verify MFA");user.session=jar(verified)||user.session;
}
async function invite(owner,clinicId,invitee,role){
 const url="/v1/team/clinics/"+clinicId+"/invitations";
 expect(await api(url,"POST",{email:invitee.email,role},owner.session),[201],"invite "+role);
 const link=await emailLink(invitee.email,"clinic staff invitation");
 const token=new URL(link).searchParams.get("token");
 assert.ok(token);
 return expect(await api("/v1/team/invitations/accept","POST",{token},invitee.session),[200],"accept "+role);
}
const admin=await signup("admin-05"), owner=await signup("owner-05");
const receptionist=await signup("reception-05"),dentist=await signup("dentist-05"),stranger=await signup("stranger-05");
const bootstrap=spawnSync("pnpm",["admin:grant",admin.email],{
 env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},
 encoding:"utf8"
});
assert.equal(bootstrap.status,0,"bootstrap admin failed: "+bootstrap.stderr);
await mfa(admin);
const plan=expect(await api("/v1/admin/plans","POST",{
 planKey:"professional",billingPeriod:"monthly",label:"PH05 Clinic",priceAfn:2000,
 staffLimit:10,branchLimit:1,trialDays:14,graceDays:7
},admin.session),[201],"create clinic plan").plan;
const clinicInfo={legalName:"Phase Five Dental Clinic",displayName:"PH05 Dental",
 clinicType:"office",province:"Kabul",city:"Kabul",address:"12 Example Street",
 phone:"+93700123456",email:owner.email,selectedPlanId:plan.id,licenseNumber:"PH05-"+runId};
const clinic=expect(await api("/v1/clinics","POST",clinicInfo,owner.session),[201],"create clinic").clinic;
const other=expect(await api("/v1/clinics","POST",{
 ...clinicInfo,legalName:"Other PH05 Clinic",displayName:"PH05 Other",
 licenseNumber:"PH05-OTHER-"+runId
},owner.session),[201],"create other clinic").clinic;
await mfa(owner);
const receptionistGrant=await invite(owner,clinic.id,receptionist,"receptionist");
const dentistGrant=await invite(owner,clinic.id,dentist,"dentist");
const c="/v1/registry/clinics/"+clinic.id+"/patients",d="/v1/registry/clinics/"+other.id+"/patients";
const sample=(i)=>({
 preferredName:"Sample "+String(i).padStart(3,"0"),familyName:"Afghan",
 phone:"+93700"+String(i).padStart(6,"0"),alternateContact:"",
 dateOfBirth:null,ageEstimate:20,province:"Kabul",city:"Kabul",
 address:"Example district",emergencyContact:"",noticeAcknowledged:true
});
const first=expect(await api(c,"POST",sample(1),receptionist.session),[201],"create patient receptionist").patient;
assert.match(first.patientNumber,/^P-\d{6}$/);
assert.equal(first.patientNumber,"P-000001");
assert.equal(first.phoneVerified,false);
expect(await api(c,"POST",sample(1),receptionist.session),[409],"duplicate must warn");
const predicted=expect(await api(c+"/duplicates","POST",sample(1),receptionist.session),[200],"preview duplicates");
assert.equal(predicted.count,1);
const overridden=expect(await api(c,"POST",{
 ...sample(1),duplicateOverride:"create_anyway",
 duplicateReason:"Same name and phone, different clinical identity verified by staff"
},receptionist.session),[201],"create with duplicate override");
assert.notEqual(overridden.patient.id,first.id);
expect(await api(c,"POST",{...sample(10),ageEstimate:30,dateOfBirth:"2000-01-01"},receptionist.session),
 [422],"cannot infer DOB from age");
expect(await api(c,"POST",{...sample(10),noticeAcknowledged:false},receptionist.session),
 [422],"notice acknowledgement required");
expect(await api(c,"POST",{...sample(10),dateOfBirth:"2027-01-01",ageEstimate:null},receptionist.session),
 [422],"future DOB denied");
expect(await api(c+"/"+first.id,"GET",undefined,stranger.session),[404],"stranger can't read tenant record");
expect(await api(d+"/"+first.id,"GET",undefined,owner.session),[404],"owner cannot cross-read their own other tenant");
expect(await api(c+"/"+first.id+"/intake","GET",undefined,receptionist.session),
 [403],"receptionist cannot access private clinical intake");
expect(await api(c+"/"+first.id+"/intake","GET",undefined,owner.session),
 [403],"nonclinical owner cannot access medical intake");
const unknown=expect(await api(c+"/"+first.id+"/intake","GET",undefined,dentist.session),[200],
 "dentist sees only this patient's intake").intake;
assert.equal(unknown.allergiesStatus,"unknown");
assert.equal(unknown.allergiesNotes,null);
expect(await api(c+"/"+first.id+"/intake","PATCH",{
 allergiesStatus:"reported",allergiesNotes:"Test allergy from authorized intake",
 medicationsStatus:"unknown",medicationsNotes:null,conditionsStatus:"none_reported",
 conditionsNotes:null,sourceKind:"patient_reported",sourceDate:"2026-11-13",revision:unknown.revision
},dentist.session),[200],"qualified clinician records medical intake");
const visible=expect(await api(c+"/"+first.id,"GET",undefined,receptionist.session),[200],"receptionist reads demographic overview");
assert.ok(!JSON.stringify(visible).includes("Test allergy"),"clinic reception API must not expose medical notes");
const pUpdate=expect(await api(c+"/"+first.id,"PATCH",{
 ...sample(1),phone:"+93700111222",revision:first.revision
},receptionist.session),[200],"edit patient contact").patient;
assert.equal(pUpdate.phone,"+93700111222");
expect(await api(c+"/"+first.id,"PATCH",{
 ...sample(1),revision:first.revision
},receptionist.session),[409],"stale demographic update refused");
expect(await api(c+"/"+first.id+"/status","PATCH",{
 status:"inactive",reason:"Patient record marked as inactive by clinic owner",revision:pUpdate.revision
},receptionist.session),[403],"receptionist cannot archive");
const pStatus=expect(await api(c+"/"+first.id+"/status","PATCH",{
 status:"inactive",reason:"Patient record marked as inactive for test cleanup",revision:pUpdate.revision
},owner.session),[200],"owner updates patient status").patient;
assert.equal(pStatus.status,"inactive");

for(let i=2;i<=125;i++){
 expect(await api(c,"POST",sample(i),receptionist.session),[201],"add patient "+i);
}
const query=expect(await api(c+"?page=2&limit=20&status=all",undefined,undefined,receptionist.session),
 [200],"paginate 125+ patient directory");
assert.equal(query.patients.length,20);
assert.equal(query.total,126,"125 generated patients + duplicate override");
assert.equal(query.pages,7);
const filter=expect(await api(c+"?q=P-000001&limit=10&status=all",undefined,undefined,receptionist.session),
 [200],"search by internal clinic ID");
assert.equal(filter.total,1);
const nameSort=expect(await api(c+"?sort=name&limit=10",undefined,undefined,receptionist.session),
 [200],"sorted by name");
assert.equal(nameSort.patients.length,10);
expect(await api(c+"/import/preview","POST",{
 csv:"preferred_name,phone\nImported,+93700123450",authorizedTransfer:false
},owner.session),[422],"import privacy attestation required");
expect(await api(c+"/import/preview","POST",{
 csv:"preferred_name,phone\nImported,+93700123450",authorizedTransfer:true
},receptionist.session),[403],"receptionist may not run import");

const csv=[
 "preferred_name,family_name,phone,source_id,date_of_birth,age_estimate,province,city,address",
 "CSV Patient,Tester,+93700999951,R05-1,,31,Kabul,Kabul,West district",
 "Sample 002,Afghan,+93700000002,,,,Kabul,Kabul,",
 "X,,,,,,,", // invalid name length
 "Another Patient,Tester,+93700999952,R05-2,,32,Kabul,Kabul,North district",
 "CSV Patient,Tester,+93700999951,R05-1,,31,Kabul,Kabul,West district",
 "One More Patient,Tester,+93700999953,R05-3,,28,Kabul,Kabul,East district"
].join("\r\n")+"\r\n";
const preview=expect(await api(c+"/import/preview","POST",{
 csv,authorizedTransfer:true
},owner.session),[200],"preview mixed CSV");
assert.equal(preview.rows.length,6);
assert.ok(preview.counts.invalid>=1);
assert.ok(preview.counts.duplicates>=1);
assert.ok(preview.rows.some(x=>x.errorCode==="DUPLICATE_IN_CSV"));
const actions={"3":{mode:"skip"},"6":{mode:"skip"}};
const jobId="f0000000-0000-4000-8000-"+runId.padStart(12,"0").slice(-12);
const importPayload={csv,mapping:preview.mapping,previewHash:preview.previewHash,jobId,
 actions,confirmed:true,authorizedTransfer:true};
const imported=expect(await api(c+"/import/commit","POST",importPayload,owner.session),[200],
 "commit mixed clinic import");
assert.equal(imported.job.state,"completed");
assert.equal(imported.job.rowCount,6);
assert.equal(imported.job.created,3);
assert.equal(imported.job.skipped,2);
assert.equal(imported.job.failed,1);
const retry=expect(await api(c+"/import/commit","POST",importPayload,owner.session),[200],
 "same idempotent import replay");
assert.deepEqual(retry.job.created,imported.job.created);
expect(await api(c+"/import/commit","POST",{...importPayload,csv:csv+"\n"},owner.session),
 [409],"same job with altered data refused");
const job=expect(await api(c+"/import/jobs/"+jobId,undefined,undefined,owner.session),[200],
 "read job report");
assert.equal(job.rows.length,6);
const reports=job.rows.filter(x=>x.result==="created");
assert.equal(reports.length,3);
for(const row of reports)assert.ok(row.patientId);
for(const row of imported.rows)assert.ok(!("phone" in row)&&!("preferredName" in row),"report may not leak PHI");
const importedOne=expect(await api(c+"/"+reports[0].patientId,undefined,undefined,owner.session),
 [200],"imported patient demographics").patient;
assert.equal(importedOne.noticeAcknowledged,false,"CSV import must not pretend individual notice occurred");
assert.equal(importedOne.intakeSource,"import");
expect(await api(d+"/"+reports[0].patientId,undefined,undefined,owner.session),
 [404],"same owner cannot find imported ID in another clinic");
const clinicianIntake=await api(c+"/"+first.id+"/intake","GET",undefined,dentist.session);
assert.equal(clinicianIntake.status,200);
expect(await api(d+"/import/jobs/"+jobId,undefined,undefined,owner.session),
 [404],"import history cannot be read from wrong clinic");
console.log("PH05_INTEGRATION_OK: scoped records, clinical privacy, 125+ pagination, duplicates, editing, CSV preview & idempotent import.");
