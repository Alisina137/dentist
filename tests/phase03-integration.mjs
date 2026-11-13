import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
const ROOT="http://localhost:4000", LOG="/tmp/dandanlink-api.log";
const PASSWORD="Dandan-Phase03-Tests-2026!";
const host="http://localhost:3000";
async function http(path,method="GET",body,jar="",origin=host){
  const headers={...(jar?{cookie:jar}:{}),...(origin?{origin}:{})};
  if(body!==undefined)headers["content-type"]="application/json";
  const r=await fetch(path.startsWith("http")?path:ROOT+path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"
  });
  const raw=await r.text();let data={};
  try{data=JSON.parse(raw);}catch{}
  return {status:r.status,data,raw,headers:r.headers};
}
function expect(result,codes,label){
  assert.ok(codes.includes(result.status),
    label+": expected "+codes.join(",")+" received "+result.status+" "+JSON.stringify(result.data).slice(0,230));
  return result.data;
}
const jarOf=res=>res.headers.getSetCookie().map(s=>s.split(";")[0]).join("; ");
function totp(uri){
  const secret=new URL(uri).searchParams.get("secret");
  assert.ok(secret);
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes=[];
  let bits=0,n=0;
  for(const ch of secret.toUpperCase().replaceAll("=","")){
    const digit=alphabet.indexOf(ch);if(digit<0)continue;
    n=(n<<5)|digit;bits+=5;
    if(bits>=8){bits-=8;bytes.push((n>>>bits)&255);}
  }
  const ctr=Buffer.alloc(8);ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const hmac=createHmac("sha1",Buffer.from(bytes)).update(ctr).digest();
  return String((hmac.readUInt32BE(hmac.at(-1)&15)&0x7fffffff)%1000000).padStart(6,"0");
}
async function message(email,part,waitMs=12000){
  const until=Date.now()+waitMs;
  while(Date.now()<until){
    const output=await readFile(LOG,"utf8").catch(()=>"");
    const list=[...output.matchAll(/to:\s*'([^']+)'[\s\S]{0,500}?subject:\s*'([^']+)'[\s\S]{0,1200}?url:\s*'([^']+)'/g)];
    const msg=list.filter(i=>i[1]===email&&i[2].includes(part)).at(-1);
    if(msg)return msg[3];
    await new Promise(r=>setTimeout(r,150));
  }
  throw new Error("Missing development mail for "+email+" ("+part+")");
}
const nonce=String(Date.now());
async function register(label){
  const email=label+"-"+nonce+"@example.test";
  expect(await http("/api/auth/sign-up/email","POST",{name:label,email,password:PASSWORD,
    callbackURL:host+"/clinic/verify"}),[200,201],"signup "+label);
  const url=await message(email,"Verify your DandanLink account");
  const verify=await http(url);
  expect(verify,[200,302,303],"verify "+label);
  const session=await http("/api/auth/sign-in/email","POST",{email,password:PASSWORD});
  expect(session,[200],"login "+label);
  return {email,jar:jarOf(session),name:label};
}
async function mfa(user){
  const enabled=expect(await http("/api/auth/two-factor/enable","POST",
    {password:PASSWORD,method:"totp"},user.jar),[200],"enable MFA").totpURI;
  assert.ok(enabled,"MFA enrollment URI missing");
  const done=await http("/api/auth/two-factor/verify-totp","POST",{code:totp(enabled)},user.jar);
  expect(done,[200],"verify MFA");
  user.jar=jarOf(done)||user.jar;
}
function uri(url){return new URL(url).searchParams.get("token");}
const owner=await register("owner3"),manager=await register("manager3"),
  dentist=await register("dentist3"),receptionist=await register("reception3"),
  cashier=await register("cashier3"),stranger=await register("stranger3"),
  admin=await register("admin3");
const grant=spawnSync("pnpm",["--filter","@dandanlink/api","grant:admin",admin.email],{
  env:{...process.env,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:admin.email},
  encoding:"utf8"
});
assert.equal(grant.status,0,"admin bootstrap failed: "+grant.stderr);
await mfa(admin);
const plan=expect(await http("/v1/admin/plans","POST",{
  planKey:"business",billingPeriod:"monthly",label:"Clinic 7-seats",priceAfn:3900,
  staffLimit:7,branchLimit:1,trialDays:14,graceDays:7
},admin.jar),[201],"create staff capacity plan").plan;
const baseClinic={legalName:"Phase03 Dental Clinic",displayName:"PH03 Clinic",
  clinicType:"office",province:"Kabul",city:"Kabul",district:"District 5",
  address:"Kabul clinical street",phone:"+93700900303",email:owner.email,
  licenseNumber:"PH03-"+nonce,selectedPlanId:plan.id};
const clinic=expect(await http("/v1/clinics","POST",baseClinic,owner.jar),[201],"new clinic").clinic;
const originScope=expect(await http("/v1/team/context","GET",undefined,owner.jar),[200],"owner context");
assert.equal(originScope.clinics.find(x=>x.clinicId===clinic.id).role,"owner");
expect(await http("/v1/team/clinics/"+clinic.id+"/invitations","POST",
  {email:dentist.email,role:"dentist"},owner.jar),[403],"owner must enable MFA first");
await mfa(owner);
const document=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const uploaded=await fetch(ROOT+"/v1/clinics/"+clinic.id+"/evidence",{
  method:"POST",headers:{origin:host,cookie:owner.jar,"content-type":"application/octet-stream",
    "x-document-kind":"clinic_license","x-file-name":"clinic.pdf"},body:document
});
assert.equal(uploaded.status,201,"verification evidence");
expect(await http("/v1/clinics/"+clinic.id+"/submit","POST",{attested:true},owner.jar),[200],"start subscription");
const inviteEndpoint="/v1/team/clinics/"+clinic.id+"/invitations";
for(const user of [manager,dentist,receptionist,cashier]){
  const role=user===manager?"manager":user===dentist?"dentist":user===receptionist?"receptionist":"cashier";
  expect(await http(inviteEndpoint,"POST",{email:user.email,role},owner.jar),[201],"invite "+role);
}
expect(await http(inviteEndpoint,"POST",{email:dentist.email,role:"dentist"},owner.jar),
  [409],"duplicate invitation prevented");
const mail=await message(dentist.email,"clinic staff invitation");
const preview=expect(await http("/v1/team/invitations/preview?token="+encodeURIComponent(uri(mail))),
  [200],"preview role");
assert.equal(preview.role,"dentist");
assert.equal(preview.clinicName,"PH03 Clinic");
assert.ok(!JSON.stringify(preview).includes("tokenHash"));
expect(await http("/v1/team/invitations/accept","POST",{token:uri(mail)},stranger.jar),
  [403],"invitation email mismatch rejected");
const dentistAccepted=expect(await http("/v1/team/invitations/accept","POST",{token:uri(mail)},dentist.jar),
  [200],"dentist accepts");
expect(await http("/v1/team/invitations/accept","POST",{token:uri(mail)},dentist.jar),
  [409],"invitation replay rejected");
const dentistContext=expect(await http("/v1/team/context","GET",undefined,dentist.jar),[200],"dentist context");
assert.equal(dentistContext.clinics.find(c=>c.clinicId===clinic.id).role,"dentist");
expect(await http("/v1/team/clinics/"+clinic.id+"/team","GET",undefined,dentist.jar),
  [403],"dentist blocked from team directory");
expect(await http("/v1/team/clinics/"+clinic.id+"/invitations","POST",
  {email:stranger.email,role:"manager"},dentist.jar),[403],"dentist cannot invite");
const dentistSelf=expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId,
  "GET",undefined,dentist.jar),[200],"dentist self profile");
assert.equal(dentistSelf.draft.verificationState,"unverified");
const updated=expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId+"/dentist",
  "POST",{displayName:"Dr. Sample",specialty:"General dentistry",
    qualifications:"Diploma (self-declared)",professionalLicense:"DRAFT-ONLY",
    experienceYears:4,biography:"Draft profile. Not independently verified.",
    draftVersion:dentistSelf.draft.draftVersion},dentist.jar),[200],"edit dentist self draft");
assert.equal(updated.draft.verificationState,"unverified");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId+"/dentist",
  "POST",{...updated.draft,draftVersion:1},dentist.jar),[409],"stale dentist draft denied");
const receptionistToken=uri(await message(receptionist.email,"clinic staff invitation"));
const receptionAccepted=expect(await http("/v1/team/invitations/accept","POST",
  {token:receptionistToken},receptionist.jar),[200],"receptionist accepts");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId,
  "GET",undefined,receptionist.jar),[403],"receptionist cannot view other staff detail");
const managerToken=uri(await message(manager.email,"clinic staff invitation"));
const managerAccepted=expect(await http("/v1/team/invitations/accept","POST",
  {token:managerToken},manager.jar),[200],"manager accepts");
await mfa(manager);
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+managerAccepted.membershipId+"/role",
  "POST",{role:"owner",reason:"Self elevate attempt"},manager.jar),[403],"cannot self promote");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+receptionAccepted.membershipId+"/role",
  "POST",{role:"manager",reason:"Promote other manager"},manager.jar),[403],"manager role ceiling");
expect(await http(inviteEndpoint,"POST",{email:stranger.email,role:"manager"},manager.jar),
  [403],"manager cannot invite manager");
const cashierToken=uri(await message(cashier.email,"clinic staff invitation"));
const cashierAccepted=expect(await http("/v1/team/invitations/accept","POST",
  {token:cashierToken},cashier.jar),[200],"cashier accepts");
const memberList=expect(await http("/v1/team/clinics/"+clinic.id+"/team","GET",undefined,manager.jar),
  [200],"manager team directory");
assert.equal(memberList.members.length,5,"owner plus 4 staff");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+cashierAccepted.membershipId+"/status",
  "POST",{action:"suspend",reason:"Shift ends until further notice"},manager.jar),
  [200],"manager suspends cashier");
expect(await http("/v1/team/context","GET",undefined,cashier.jar),[401],
  "suspension immediately invalidates global session");
const cashierAgain=await http("/api/auth/sign-in/email","POST",
  {email:cashier.email,password:PASSWORD});
expect(cashierAgain,[200],"cashier fresh login");
cashier.jar=jarOf(cashierAgain);
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+cashierAccepted.membershipId,
  "GET",undefined,cashier.jar),[403],"suspended member denied even after new login");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+cashierAccepted.membershipId+"/status",
  "POST",{action:"reactivate",reason:"Cashier returns from leave"},manager.jar),
  [200],"manager reactivates");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+receptionAccepted.membershipId+"/role",
  "POST",{role:"cashier",reason:"Updated desk responsibilities"},owner.jar),
  [200],"owner changes staff role");
expect(await http("/v1/team/context","GET",undefined,receptionist.jar),[401],
  "role change invalidates sessions");
const wrongClinic=expect(await http("/v1/team/clinics/"+clinic.id+"/team",
  "GET",undefined,stranger.jar),[404],"nonmember not given another clinic directory");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId+"/status",
  "POST",{action:"revoke",reason:"Staff service ended"},owner.jar),[200],"owner revokes dentist");
expect(await http("/v1/team/context","GET",undefined,dentist.jar),[401],
  "revocation invalidates session");
const renewed=await http("/api/auth/sign-in/email","POST",
  {email:dentist.email,password:PASSWORD});
expect(renewed,[200],"revoked dentist signs in globally");
dentist.jar=jarOf(renewed);
const after=expect(await http("/v1/team/context","GET",undefined,dentist.jar),[200],"revoked member context");
assert.ok(!after.clinics.some(c=>c.clinicId===clinic.id),"revoked user must not see clinic");
expect(await http("/v1/team/clinics/"+clinic.id+"/staff/"+dentistAccepted.membershipId,
  "GET",undefined,dentist.jar),[403],"revoked user cannot reuse clinic member ID");
const security=expect(await http("/v1/team/clinics/"+clinic.id+"/security","GET",undefined,owner.jar),
  [200],"security panel");
assert.ok(security.events.some(e=>e.action==="staff.membership.revoke"),"revocation audit missing");
expect(await http("/v1/team/clinics/"+clinic.id+"/security","GET",undefined,receptionist.jar),
  [401],"invalidated reception session cannot view security");
// Verify a second tenant is separate without relying on any global selected clinic.
const another=expect(await http("/v1/clinics","POST",{
  ...baseClinic,displayName:"Second Practice",legalName:"Second Practice Ltd.",
  licenseNumber:"PH03-2-"+nonce
},owner.jar),[201],"create second clinic").clinic;
const ownContext=expect(await http("/v1/team/context","GET",undefined,owner.jar),[200],"multi clinic owner");
assert.equal(ownContext.clinics.filter(c=>c.role==="owner").length,2);
expect(await http("/v1/team/clinics/"+another.id+"/staff/"+dentistAccepted.membershipId,
 "GET",undefined,owner.jar),[404],"staff ID cannot be used across tenants");
console.log("PH03 integration passed: owner seats, email invite, MFA, acceptance, role ceiling, dentist draft, immediate revocation, access logs and tenant scope.");
