import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const model=read("packages/ui-web/src/clinic-staff-model.ts");
const team=read("packages/ui-web/src/phase03.tsx");
const settings=read("packages/ui-web/src/phase02.tsx");
const access=read("apps/api/src/staff-access.ts");
const staffApi=read("apps/api/src/staff-management.ts");
const invitesApi=read("apps/api/src/staff-invitations.ts");
const clinicApi=read("apps/api/src/phase02.ts");
const css=read("apps/clinic-web/app/clinic/clinic-staff-settings.css");
const shell=read("apps/clinic-web/app/clinic/layout.tsx");

const mod={exports:{}};
new Function("exports","module",ts.transpileModule(model,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText)(mod.exports,mod);
const {
 staffTab,staffMayInvite,staffAssignableRoles,staffMayManage,staffEmail,
 staffFiltered,staffPage,staffStats,clinicSettingsCanSave
}=mod.exports;

const members=[
 {id:"a",name:"Clinic Owner",email:"owner@example.com",role:"owner",status:"active",mfaEnabled:true},
 {id:"b",name:"Dentist A",email:"a@example.com",role:"dentist",status:"active",mfaEnabled:false},
 {id:"c",name:"Receptionist B",email:"b@example.com",role:"receptionist",status:"suspended",mfaEnabled:true},
 {id:"d",name:"Dentist C",email:"c@example.com",role:"manager",status:"active",clinicianEnabled:true},
 {id:"e",name:"Cashier D",email:"d@example.com",role:"cashier",status:"revoked"},
 {id:"f",name:"Assistant E",email:"e@example.com",role:"assistant",status:"active"}
];
test("Clinic Phase 13: staff tabs remain role-safe, and navigation no longer reloads sidebar",()=>{
 assert.equal(staffTab("dentists"),"dentists");
 assert.equal(staffTab("invitations"),"invitations");
 assert.equal(staffTab("../bad"),"team");
 assert.equal(staffMayInvite("owner",true),true);
 assert.equal(staffMayInvite("manager",true),true);
 assert.equal(staffMayInvite("owner",false),false);
 assert.equal(staffMayInvite("dentist",true),false);
 assert.deepEqual(staffAssignableRoles("manager"),["dentist","receptionist","assistant","cashier"]);
 assert.ok(staffAssignableRoles("owner").includes("manager"));
 assert.deepEqual(staffAssignableRoles("receptionist"),[]);
 for(const marker of [
  'function TeamHub({ctx,space}', 'role="tablist" aria-label={t("staff")}',
  'history.replaceState(null,"",location.pathname+"?"+query.toString())',
  'query.set("clinic",space.clinicId);query.set("tab",next)',
  'aria-controls="clinic-phase13-staff-content"',
  'role="tabpanel" aria-label={t(tab)}',
  '<TeamList space={space} onInvite={()=>choose("invitations")}/>',
  '<DentistList space={space} onInvite={()=>choose("invitations")}/>',
  'const {data,error,reload}=useData("/clinics/"+space.clinicId+"/team")',
  'const {data,error,reload}=useData("/clinics/"+space.clinicId+"/dentists")',
  'data:snapshot.path===path?snapshot.data:null',
  'return()=>{clearTimeout(timer);controller.abort()};'
 ])assert.ok(team.includes(marker),marker);
});

test("Clinic Phase 13: real staff records are filtered and paged without fabricated counts",()=>{
 assert.deepEqual(staffStats(members),{total:6,active:4,suspended:1,clinicians:2});
 assert.equal(staffFiltered(members,"DENTIST","all","all").length,2);
 assert.equal(staffFiltered(members,"","active","dentist").length,1);
 assert.equal(staffFiltered(members,"","all","cashier").length,1);
 assert.equal(staffFiltered(members,"not found","all","all").length,0);
 assert.equal(staffPage(members,1).rows.length,5);
 assert.deepEqual({page:staffPage(members,99).page,pages:staffPage(members,99).pages,
  total:staffPage(members,99).total,start:staffPage(members,99).start,
  end:staffPage(members,99).end},
  {page:2,pages:2,total:6,start:6,end:6});
 assert.equal(staffPage([],5).start,0);
 assert.equal(staffPage([],5).pages,1);
 assert.equal(staffPage(members,-1).page,1);
 for(const marker of [
  'const records:StaffEntry[]=data.members||[]',
  'const summary=staffStats(records)',
  'const people=staffFiltered(records,query,filter,role)',
  'const slice=staffPage(people,page)',
  'const slice=staffPage(clinicians,page)',
  'staffPage(entries,page)',
  'role="status" aria-live="polite"',
  '<StaffPager page={slice.page} pages={slice.pages} onPage={setPage}',
  'staff.read','dentist.read'
 ])assert.ok(team.includes(marker)||access.includes(marker),marker);
 assert.ok(staffApi.includes('await permission(req,clinicId,"staff.read")'));
 assert.ok(staffApi.includes('await permission(req,clinicId,"dentist.read")'));
 assert.ok(staffApi.includes('eq(schema.clinicMembership.clinicId,clinicId)'));
});

test("Clinic Phase 13: invitation review validates recipient and respects role ceiling, MFA, seats and history",()=>{
 assert.equal(staffEmail("  USER@Example.Org "), "user@example.org");
 assert.equal(staffEmail("wrong"),null);
 assert.equal(staffEmail("a@b"),null);
 assert.equal(staffEmail("a@b.org\nfoo"),null);
 assert.equal(staffEmail("a".repeat(170)+"@example.org"),null);
 for(const marker of [
  'const eligible=staffMayInvite(space.role,ctx.mfaEnabled)',
  'const roles=staffAssignableRoles(space.role)',
  'staffEmail(email)',
  'normalized===ctx.email.toLocaleLowerCase()',
  'setReview({kind:"send",email:normalized,role})',
  'setReview({kind,id:row.id,email:row.email,role:row.role})',
  'if(current.kind==="send")await api(root,"POST",{email:current.email,role:current.role})',
  'current.kind==="revoke"?{reason:reason.trim()}:undefined',
  'disabled={busy||reason.trim().length<5}',
  'Date.now()-new Date(i.sentAt).getTime()<60000',
  'invitationLimit:"Latest 100 invitations',
  'invitationLimit:"آخرین ۱۰۰ دعوت',
  'invitationLimit:"د ټاکل شوي کلینیک وروستۍ ۱۰۰',
  'role="alertdialog" aria-modal="true"',
  'if(event.key==="Escape"&&!busy)onCancel()',
  'ref={dialogRef} tabIndex={-1}',
  'disabled={!checked||busy}',
  '<div><dt>{t("modalScope")}</dt><dd>{space.clinicName}</dd></div>'
 ])assert.ok(team.includes(marker),marker);
 for(const marker of [
  'permission(req,cid,"staff.invite",true)',
  'mayAssign(scope.role,role)',
  'SELF_INVITE_FORBIDDEN','INVITATION_ALREADY_PENDING',
  'PLAN_STAFF_LIMIT','INVITATION_DELIVERY_FAILED',
  '.orderBy(desc(','limit(100)',
  'required(req.body?.reason,5,300,"REASON")',
  'await audit(tx,req.actor!.id,cid,"staff.invitation.revoked",iid)'
 ])assert.ok(invitesApi.includes(marker),marker);
 assert.ok(!team.includes('if(operation==="revoke" && (!reason.trim()||!window.confirm(t("confirm"))))return'));
});

test("Clinic Phase 13: protected role changes, status actions and forced logout require explicit review",()=>{
 assert.equal(staffMayManage("owner","manager",false,"active"),true);
 assert.equal(staffMayManage("manager","manager",false,"active"),false);
 assert.equal(staffMayManage("manager","owner",false,"active"),false);
 assert.equal(staffMayManage("owner","dentist",true,"active"),false);
 assert.equal(staffMayManage("owner","dentist",false,"revoked"),false);
 assert.equal(staffMayManage("manager","cashier",false,"suspended"),true);
 for(const marker of [
  'async function confirmReview()',
  'if(!review||!reviewed||busy||!data?.canManage||!ctx.mfaEnabled',
  'setReview({path,body:normalized,actionName:path==="/role"?t("roleChange")',
  'data.member.role==="owner"||reason.trim().length<5',
  'if(destructive){',
  'function StaffReviewDialog(',
  'aria-labelledby="clinic-phase13-dialog-title"',
  'role="alertdialog" aria-modal="true"',
  'onChecked={setReviewed} onCancel={closeReview}',
  'onConfirm={()=>void confirmReview()} busy={busy}',
  'staffMayManage(space.role,member.role as StaffRole',
  'const canChangeRole=canChange&&member.status==="active"',
  'setReview(null);setReviewed(false);setReason("")',
  't("sessionImpact")'
 ])assert.ok(team.includes(marker),marker);
 for(const marker of [
  'permission(req,clinicId,"staff.manage",true)',
  'PROTECTED_MEMBERSHIP','ROLE_CEILING','STALE_MEMBERSHIP',
  'await revokeSessions(tx,m.userId)',
  'if(m.role==="owner"||m.userId===req.actor!.id)',
  'STALE_DENTIST_DRAFT','STAFF_MFA_REQUIRED',
  'await audit(tx,req.actor!.id,clinicId,"staff.sessions.revoked",m.id)'
 ])assert.ok(staffApi.includes(marker),marker);
 assert.ok(!team.includes('if(destructive&&!window.confirm(t("confirm")))return;'));
});

test("Clinic Phase 13: security lists reflect authenticated staff, audit and only own account sessions",()=>{
 for(const marker of [
  'const canManage=space.capabilities.includes("security.read")',
  'useData(canManage?"/clinics/"+space.clinicId+"/security":null)',
  'useData("/sessions")',
  'const accessRows=staffPage(access,accessPage)',
  'const eventRows=staffPage(data?.events||[],eventPage)',
  'const sessionRows=staffPage(sessions?.sessions||[],sessionPage)',
  'securitySessionHint:"These are sessions for your own account',
  'securitySessionHint:"این‌ها نشست‌های حساب خود شما',
  'securitySessionHint:"دا ستاسو خپل حساب ناستې',
  'async function allLogout()',
  'if(!review||!reviewed||busy||reason.trim().length<5)return',
  'await api("/sessions/revoke","POST",{reason:reason.trim()})',
  'onConfirm={()=>void allLogout()}',
  'lastActivity'
 ])assert.ok(team.includes(marker),marker);
 for(const marker of [
  'await permission(req,clinicId,"security.read")',
  '.orderBy(desc(','limit(60)',
  'res.setHeader("Cache-Control","no-store")',
  'eq(schema.auditEvent.clinicId,clinicId)'
 ])assert.ok(staffApi.includes(marker),marker);
});

test("Clinic Phase 13: clinic settings bind owned clinic IDs and clear stale data before saving",()=>{
 const original={displayName:"A",city:"Kabul",status:"approved",revision:2};
 assert.equal(clinicSettingsCanSave("approved",{...original},original),false);
 assert.equal(clinicSettingsCanSave("approved",{...original,city:"Herat"},original),true);
 assert.equal(clinicSettingsCanSave("pending",{...original,city:"Herat"},original),false);
 assert.equal(clinicSettingsCanSave("suspended",{...original,city:"Herat"},original),false);
 assert.equal(clinicSettingsCanSave("approved",null,original),false);
 for(const marker of [
  'import {clinicSettingsCanSave} from "./clinic-staff-model"',
  'new URLSearchParams(location.search).get("clinic")',
  'if(!data.clinics.some((c:any)=>c.id===selected))',
  'setDetail(null);setForm(null);setDetailError("")',
  'let live=true;setDetail(null);setForm(null);setDetailError("")',
  'if(live){setDetail(d);setForm(d.clinic);}',
  'return()=>{live=false;};',
  'const owned=data?.clinics||[]',
  'const maySave=clinicSettingsCanSave(detail?.clinic?.status,form,detail?.clinic)',
  'if(busy||!maySave||!current||!detail||!form)return',
  '{...form,revision:detail.clinic.revision}',
  'if((e as Error).message==="STALE_REVISION")setDetailTick(x=>x+1)',
  'history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString())',
  'clinic-phase13-settings-hero',
  'clinic-phase13-settings-save',
  'readonly={busy||["pending","suspended"].includes(detail.clinic.status)}'
 ])assert.ok(settings.includes(marker),marker);
 for(const marker of [
  'eq(schema.clinic.ownerUserId,req.actor!.id)',
  'if(Number(req.body?.revision)!==c.revision)fail(409,"STALE_REVISION")',
  'if(!["draft","needs_info","rejected","approved"].includes(c.status))',
  'const status=c.status==="approved"?"pending":"draft"',
  'clinic.verification.submitted',
  'res.json({clinic:await ownerClinic(req,c.id)})'
 ])assert.ok(clinicApi.includes(marker),marker);
});

test("Clinic Phase 13: clinical credentials never become public, and no patient/clinical records leaked",()=>{
 for(const marker of [
  'Professional identity draft',
  'notPublic:"Draft only. Not verified or public."',
  'notPublic:"فقط پیش‌نویس',
  'notPublic:"یوازې مسوده',
  't("staffClinicianNote")',
  'canEditDentist',
  'STALE_DENTIST_DRAFT'
 ])assert.ok(team.includes(marker)||staffApi.includes(marker),marker);
 assert.ok(!team.includes('localStorage.setItem('));
 assert.ok(!team.includes('window.alert('));
 assert.ok(!settings.includes('localStorage.setItem('));
 assert.ok(!team.includes('fetch("/v1/patients'));
});

test("Clinic Phase 13: responsive localized styling stays inside clinic shell",()=>{
 assert.ok(shell.includes('import "./clinic-finance.css";\nimport "./clinic-staff-settings.css";'));
 for(const marker of [
  'teamWorkspace:"People & access"',
  'teamWorkspace:"کارمندان و دسترسی"',
  'teamWorkspace:"کارکوونکي او لاسرسی"',
  'staffReviewTitle:"Review staff access change"',
  'staffReviewTitle:"بررسی تغییر دسترسی کارمند"',
  'staffReviewTitle:"د کارکوونکي د لاسرسي بدلون وګورئ"',
  'securityActionReview:"Review sign-out of your devices"',
  'securityActionReview:"بررسی خروج از تمام دستگاه‌های خود"',
  'securityActionReview:"له خپلو ټولو وسیلو د وتلو کتنه"'
 ])assert.ok(team.includes(marker),marker);
 for(const marker of [
  '.clinic-persistent-shell .clinic-phase13-hero',
  '.clinic-persistent-shell .clinic-phase13-staff-tabs',
  '.clinic-persistent-shell .clinic-phase13-staff-table-scroll',
  '.clinic-persistent-shell .clinic-phase13-dialog',
  '.clinic-persistent-shell .clinic-phase13-security',
  '.clinic-persistent-shell .clinic-phase13-settings-hero',
  '.clinic-persistent-shell .clinic-phase13-settings-links',
  '@media(max-width:1150px)','@media(max-width:780px)',
  '@media(max-width:580px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',':focus-visible',
  'min-width:0','overflow-wrap:anywhere',
  'overscroll-behavior:contain'
 ])assert.ok(css.includes(marker),marker);
 for(const forbidden of [':root{','body{','svg path{','.odontogram{','Math.random('])
  assert.ok(!css.includes(forbidden),forbidden);
 for(const path of [
  "apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx",
  "apps/clinic-web/app/layout.tsx"
 ])assert.ok(!read(path).includes("clinic-staff-settings.css"),path);
});
