import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const module={exports:{}};
const js=ts.transpileModule(read("apps/mobile/native-clinic-phase24-model.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
new Function("module","exports",js)(module,module.exports);
const m=module.exports;
const clinic="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const owner="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const dentist="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const manager="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const invite="ffffffff-ffff-4fff-8fff-ffffffffffff";
const member=(changes={})=>({
 id:dentist,clinicId:clinic,userId:"SECRET_USER_ID",name:"Dr. Synthetic",
 email:"synthetic@example.com",role:"dentist",
 status:"active",clinicianEnabled:true,mfaEnabled:false,
 joinedAt:"2026-11-01T08:00:00Z",changedAt:"2026-11-15T08:00:00Z",
 suspendedAt:null,revokedAt:null,reason:"SECRET_ADMIN_NOTE",
 ...changes
});
const invitation=(changes={})=>({
 id:invite,clinicId:clinic,email:"invite@example.com",role:"dentist",
 status:"pending",expiresAt:"2026-11-25T01:00:00Z",createdAt:"2026-11-18T01:00:00Z",
 sentAt:"2026-11-18T01:01:00Z",resendCount:0,tokenHash:"SECRET_TOKEN_HASH",
 ...changes
});
const shift=(weekday,changes={})=>({
 clinicId:clinic,membershipId:dentist,weekday,isOpen:weekday!==0&&weekday!==1,
 startMinute:540,endMinute:1020,breaks:[],revision:1,
 updatedBy:"SECRET_UPDATED_BY",...changes
});
const roster=()=>({members:[member({id:owner,role:"owner",clinicianEnabled:false,name:"Owner",email:"owner@example.com"}),
 member(),member({id:manager,role:"manager",clinicianEnabled:false,name:"Manager",email:"manager@example.com"})]});
const schedule=()=>({
 timezone:"Asia/Kabul",clinicians:[{membershipId:dentist,name:"Synthetic Dentist",role:"dentist"}],
 providers:[shift(2),shift(3),shift(4),shift(5)],hours:[
  ...Array.from({length:7},(_,i)=>shift(i,{membershipId:undefined}))
 ],resources:[],exceptions:[]
});
test("C24 role ceiling and protected members: native mirrors API but server is authoritative",()=>{
 assert.equal(m.staffCanManage("owner"),true);
 assert.equal(m.staffCanManage("manager"),true);
 assert.equal(m.staffCanManage("dentist"),false);
 assert.equal(m.staffNeedsMfa("owner",false),false);
 assert.equal(m.staffNeedsMfa("owner",true),true);
 assert.equal(m.staffCanAssign("manager","manager"),false);
 assert.equal(m.staffCanAssign("manager","owner"),false);
 assert.equal(m.staffCanAssign("manager","dentist"),true);
 assert.equal(m.staffCanAssign("owner","manager"),true);
 assert.equal(m.staffCanAssign("owner","owner"),false);
 assert.equal(m.staffCanAssign("dentist","receptionist"),false);
 assert.equal(m.reasonValid("short"),true);
 assert.equal(m.reasonValid("1234"),false);
 assert.equal(m.reasonValid("x".repeat(301)),false);
 const ownerRow=m.teamMember(member({id:owner,role:"owner"}),clinic,owner);
 assert.equal(m.staffMayManageMember("owner",ownerRow),false);
 const doctorRow=m.teamMember(member(),clinic,owner);
 assert.equal(m.staffMayManageMember("manager",doctorRow),true);
 assert.equal(m.staffMayManageMember("manager",{...doctorRow,status:"revoked"}),false);
 assert.equal(m.staffCanClinicianToggle("owner",doctorRow),false);
 const managerRow=m.teamMember(member({id:manager,role:"manager"}),clinic,owner);
 assert.equal(m.staffCanClinicianToggle("owner",managerRow),true);
 assert.equal(m.staffCanClinicianToggle("manager",managerRow),false);
});
test("C24 strict clinic roster allowlist omits private raw membership fields",()=>{
 const result=m.teamRows(roster(),clinic,owner);
 assert.equal(result.length,3);
 assert.equal(result[0].self,true);
 assert.equal(result[1].self,false);
 assert.equal(result[1].name,"Dr. Synthetic");
 for(const secret of ["SECRET_ADMIN_NOTE","SECRET_USER_ID","suspendedAt","revokedAt"]){
  assert.equal(JSON.stringify(result).includes(secret),false,secret);
 }
 assert.equal(m.teamRows({members:[member({clinicId:other})]},clinic,owner),null);
 assert.equal(m.teamRows({members:[member(),member()]},clinic,owner),null);
 assert.equal(m.teamRows({members:[member({role:"superadmin"})]},clinic,owner),null);
 assert.equal(m.teamRows({members:[member({mfaEnabled:"false"})]},clinic,owner),null);
 assert.equal(m.teamRows({members:[member({status:"bad"})]},clinic,owner),null);
});
test("C24 invitation data is limited, email and seat status validated",()=>{
 assert.equal(m.inviteEmailValid(" staff@example.org "),true);
 assert.equal(m.inviteEmailValid("bad-email"),false);
 const rows=m.invitationRows({invitations:[invitation()]},clinic);
 assert.equal(rows.length,1);
 assert.equal(rows[0].status,"pending");
 assert.equal(JSON.stringify(rows).includes("SECRET_TOKEN_HASH"),false);
 assert.equal(m.invitationRows({invitations:[invitation({role:"owner"})]},clinic),null);
 assert.equal(m.invitationRows({invitations:[invitation({clinicId:other})]},clinic),null);
 assert.equal(m.invitationRows({invitations:[invitation(),invitation()]},clinic),null);
 assert.equal(m.invitationRows({invitations:[invitation({sentAt:"not-date"})]},clinic),null);
 assert.equal(m.invitationRows({invitations:[invitation({status:"expired"})]},clinic)?.[0].status,"expired");
});
test("C24 professional profile is a draft only; verification requires current server evidence",()=>{
 const row=member();
 const draft={displayName:"Dr. Synthetic",specialty:"Orthodontics",qualifications:"Dental degree",
  professionalLicense:"D-203",experienceYears:8,biography:"Professional summary",
  draftVersion:3,verificationState:"verified",userId:"SECRET_USER_ID"};
 const detail=m.staffDetail({member:row,draft,events:[{token:"SECRET"}],
  canManage:true,canEditDentist:true},clinic,owner);
 assert.equal(detail.displayName,"Dr. Synthetic");
 assert.equal(detail.biography,"Professional summary");
 assert.equal(detail.draftVersion,3);
 assert.equal(JSON.stringify(detail).includes("SECRET"),false);
 assert.equal(JSON.stringify(detail).includes("verificationState"),false);
 const results=m.dentistStatuses({dentists:[{
  id:dentist,display_name:"Dr. Synthetic",verification_status:"verified",
  currentlyVerified:false,affiliation_status:"active",professional_license:"D-203",
  submitted_license_evidence:"SECRET_DOCUMENT",approved_draft_version:1,
  draft_version:2
 }]});
 assert.equal(results[0].currentlyVerified,false);
 assert.equal(JSON.stringify(results).includes("SECRET_DOCUMENT"),false);
 assert.equal(m.staffDetail({member:row,draft:{...draft,experienceYears:90},
  canManage:false,canEditDentist:true},clinic,owner),null);
});
test("C24 schedule: exactly 7 versioned days, Kabul timezone, no fake doctor slots",()=>{
 const parsed=m.parseSchedule(schedule(),clinic);
 assert.ok(parsed);
 assert.deepEqual(parsed.clinicianIds,[dentist]);
 const week=m.providerWeek(parsed,dentist);
 assert.equal(week.length,7);
 assert.equal(week[0].weekday,0);
 assert.equal(week[0].isOpen,false);
 assert.equal(week[0].revision,0);
 assert.equal(week[2].revision,1);
 assert.equal(m.validWeek(week),true);
 assert.equal(m.minuteLabel(540),"09:00");
 assert.equal(m.minuteLabel(1020),"17:00");
 assert.equal(m.weekPayload(week).length,7);
 assert.throws(()=>m.providerWeek(parsed,other));
 assert.equal(m.parseSchedule({...schedule(),timezone:"UTC"},clinic),null);
 assert.equal(m.parseSchedule({...schedule(),providers:[shift(2,{clinicId:other})]},clinic),null);
 assert.equal(m.parseSchedule({...schedule(),providers:[shift(2),shift(2)]},clinic),null);
 assert.equal(m.validWeek([...week.slice(0,6),week[5]]),false);
 assert.equal(m.validWeek([...week.slice(0,6),{...week[6],startMinute:1020,endMinute:540}]),false);
 assert.throws(()=>m.weekPayload([{...week[0],revision:-1},...week.slice(1)]));
});
test("C24 counts are real backend-derived roster, invitation and credential data",()=>{
 const members=m.teamRows(roster(),clinic,owner);
 const invites=m.invitationRows({invitations:[invitation()]},clinic);
 const dentists=m.dentistStatuses({dentists:[{
  id:dentist,display_name:"Synthetic",verification_status:"verified",
  currentlyVerified:true,affiliation_status:"active",professional_license:"D-203"
 }]});
 assert.deepEqual(m.countStaff(members,invites,dentists),{
  active:3,suspended:0,revoked:0,dentists:1,invites:1,verified:1
 });
});
test("C24 integrated team flow honors MFA, tenant scope, versioned shift writes and PH19",()=>{
 const shell=read("apps/mobile/native-clinic.tsx");
 const ui=read("apps/mobile/native-clinic-phase24.tsx");
 const old=read("apps/mobile/native-clinic-phase20.tsx");
 const staff=read("apps/api/src/staff-management.ts");
 const invites=read("apps/api/src/staff-invitations.ts");
 const ops=read("apps/api/src/operations-router.ts");
 const scheduleApi=read("apps/api/src/operations-schedule.ts");
 const pilot=read("apps/api/src/pilot-gate.ts");
 assert.match(shell,/NativeClinicPhase24/);
 assert.doesNotMatch(shell,/<NativeClinicTeamPhase20/);
 assert.match(shell,/type JsonMethod="GET"\|"POST"\|"PATCH"\|"PUT"/);
 assert.match(old,/Phase20Request=<T>\(path:string,method\?:"GET"\|"POST"\|"PATCH"\|"PUT"/);
 for(const path of ["/team","/invitations/","/staff/","/hours",
  "/dentists","/resend","/status","/role","/clinician","/force-logout"]){
  assert.ok(ui.includes(path),path);
 }
 assert.match(ui,/staffNeedsMfa/);
 assert.match(ui,/reasonValid/);
 assert.match(ui,/staffCanAssign/);
 assert.match(ui,/onOpenWeb/);
 assert.match(ui,/AppState.addEventListener/);
 assert.match(ui,/\.abort\(\)/);
 assert.match(ui,/validWeek\(week\)/);
 assert.match(ui,/weekPayload\(week\)/);
 assert.match(ui,/"PUT",\{week:weekPayload\(week\)\}/);
 assert.match(staff,/permission\(req,clinicId,"staff.manage",true\)/);
 assert.match(invites,/permission\(req,cid,"staff.invite",true\)/);
 assert.match(staff,/revokeSessions/);
 assert.match(ops,/clinic.put\("\/hours\/providers\/:membershipId"/);
 assert.match(scheduleApi,/STALE_SCHEDULE_VERSION/);
 assert.match(scheduleApi,/SCHEDULE_CHANGE_CONFLICTS_WITH_APPOINTMENTS/);
 assert.match(pilot,/PH19_PILOT_RELEASE_ENABLED/);
 assert.doesNotMatch(ui,/AsyncStorage|SecureStore|console.log|localStorage/);
});
