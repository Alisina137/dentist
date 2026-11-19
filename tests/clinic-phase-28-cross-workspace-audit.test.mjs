import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function model(path){
 const source=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 new Function("module","exports",source)(mod,mod.exports);
 return mod.exports;
}
const admin=model("apps/admin-web/app/admin/admin-access.ts");
const clinic=model("apps/clinic-web/app/clinic/clinic-route-access.ts");
const membership="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
 other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const allClinicPaths=[
 "/clinic","/clinic/appointments","/clinic/appointments/requests","/clinic/patients",
 "/clinic/clinical","/clinic/finance","/clinic/staff","/clinic/settings",
 "/clinic/settings/hours","/clinic/settings/security","/clinic/settings/subscription",
 "/clinic/settings/export","/clinic/credentials"
];
const receptionistPaths=["/clinic","/clinic/appointments",
 "/clinic/appointments/requests","/clinic/patients","/clinic/finance",
 "/clinic/settings/hours","/clinic/settings/security",
 "/clinic/staff/"+membership];
const dentistPaths=["/clinic","/clinic/appointments",
 "/clinic/appointments/requests","/clinic/patients","/clinic/clinical",
 "/clinic/settings/hours","/clinic/credentials","/clinic/staff/"+membership];
const cashierPaths=["/clinic","/clinic/patients","/clinic/finance",
 "/clinic/settings/security","/clinic/staff/"+membership];
const assistantPaths=["/clinic","/clinic/appointments","/clinic/clinical",
 "/clinic/settings/security","/clinic/staff/"+membership];
test("C28-01 platform Admin never mounts protected page before role check",()=>{
 assert.equal(admin.adminPageGate("loading","/admin/clinics"),"loading");
 assert.equal(admin.adminPageGate("error","/admin/clinics"),"offline");
 assert.equal(admin.adminPageGate("user","/admin/clinics"),"sign-in");
 assert.equal(admin.adminPageGate("admin","/admin/clinics",true),"loading");
 assert.equal(admin.adminPageGate("admin","/admin/clinics"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/clinics"),"restricted");
 assert.equal(admin.adminPageGate("support","/admin/support"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/support/ticket-23"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/analytics"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/analytics/export"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/analytics-secret"),"restricted");
 assert.equal(admin.adminPageGate("support","/admin/plans"),"restricted");
 assert.equal(admin.adminPageGate("support","/admin"),"restricted");
 assert.equal(admin.adminPageGate("user","/admin/login"),"allowed");
 assert.equal(admin.adminPageGate("loading","/admin/2fa"),"allowed");
 assert.equal(admin.adminPageGate("support","/admin/reset-password"),"allowed");
 assert.equal(admin.validAdminIdentity({role:"admin",displayName:"Manager"}).role,"admin");
 assert.equal(admin.validAdminIdentity({role:"support",displayName:"Help"}).role,"support");
 assert.equal(admin.validAdminIdentity({role:"owner",displayName:"Wrong"}),null);
 assert.equal(admin.validAdminIdentity({role:"admin",displayName:123}),null);
});
test("C28-02 clinic route mount requires actual sidebar membership and clinician role",()=>{
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic/clinical",allClinicPaths),false);
 // This model checks sidebar permission separately from the server's
 // clinicianEnabled flag; owner/manager cannot open a patient's chart.
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic/patients/"+other+"/chart",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("owner",true,membership,
  "/clinic/patients/"+other+"/chart",allClinicPaths),true);
 assert.equal(clinic.clinicPageAllowed("manager",false,membership,
  "/clinic/patients/"+other+"/treatments",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("dentist",false,membership,
  "/clinic/patients/"+other+"/visits/visit-1",dentistPaths),true);
 assert.equal(clinic.clinicPageAllowed("dentist",false,membership,
  "/clinic/patients/"+other+"/files",dentistPaths),true);
 assert.equal(clinic.clinicPageAllowed("receptionist",false,membership,
  "/clinic/patients/"+other+"/visits",receptionistPaths),false);
 assert.equal(clinic.clinicPageAllowed("cashier",false,membership,
  "/clinic/patients/"+other+"/billing",cashierPaths),true);
 assert.equal(clinic.clinicPageAllowed("cashier",false,membership,
  "/clinic/patients/"+other+"/chart",cashierPaths),false);
 assert.equal(clinic.clinicPageAllowed("cashier",false,membership,
  "/clinic/patients/"+other+"/edit",cashierPaths),false);
 assert.equal(clinic.clinicPageAllowed("receptionist",false,membership,
  "/clinic/patients/new",receptionistPaths),true);
 assert.equal(clinic.clinicPageAllowed("cashier",false,membership,
  "/clinic/patients/new",cashierPaths),false);
 assert.equal(clinic.clinicPageAllowed("assistant",false,membership,
  "/clinic/clinical",assistantPaths),true);
 assert.equal(clinic.clinicPageAllowed("assistant",false,membership,
  "/clinic/patients",assistantPaths),false);
 assert.equal(clinic.clinicPageAllowed("assistant",false,membership,
  "/clinic/appointments/new",assistantPaths),false);
});
test("C28-03 clinic access to own staff profile vs other members, owner settings",()=>{
 assert.equal(clinic.clinicPageAllowed("receptionist",false,membership,
  "/clinic/staff/"+membership,receptionistPaths),true);
 assert.equal(clinic.clinicPageAllowed("receptionist",false,membership,
  "/clinic/staff/"+other,receptionistPaths),false);
 assert.equal(clinic.clinicPageAllowed("manager",false,membership,
  "/clinic/staff/"+other,allClinicPaths),true);
 assert.equal(clinic.clinicPageAllowed("manager",false,membership,
  "/clinic/settings/subscription",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic/settings/subscription",allClinicPaths),true);
 assert.equal(clinic.clinicPageAllowed("manager",false,membership,
  "/clinic/settings/export",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("cashier",false,membership,
  "/clinic/appointments/queue",cashierPaths),false);
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic/unknown/fake",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic//patients",allClinicPaths),false);
 assert.equal(clinic.clinicPageAllowed("owner",false,membership,
  "/clinic/../admin",allClinicPaths),false);
});
test("C28-04 shell renders role-aware access screen, not stale protected content",()=>{
 const ui=read("apps/admin-web/app/admin/admin-shell.tsx");
 const staff=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
 const adminLayout=read("apps/admin-web/app/admin/layout.tsx");
 const clinicLayout=read("apps/clinic-web/app/clinic/layout.tsx");
 assert.match(ui,/accessGate==="allowed"\?children/);
 assert.match(ui,/adminPageGate\(role,pathname,rechecking\)/);
 assert.match(ui,/validAdminIdentity/);
 assert.match(ui,/signal:controller.signal/);
 assert.match(ui,/visibilitychange/);
 assert.match(ui,/admin-access-result/);
 assert.match(staff,/clinicPageAllowed\(/);
 assert.match(staff,/!allowedPage&&ctx&&selected/);
 assert.match(staff,/showPage&&ctx\?<PersistentClinicShellProvider/);
 assert.match(adminLayout,/AdminPersistentShell/);
 assert.match(clinicLayout,/ClinicPersistentShell/);
});
test("C28-05 patient native MFA parity: signed bearer only AFTER existing server 2FA",()=>{
 const auth=read("apps/mobile/native-auth.tsx");
 const scene=read("apps/mobile/native-patient-mfa.tsx");
 const wrapper=read("apps/mobile/native-patient.tsx");
 const clinicMfa=read("apps/mobile/native-clinic-mfa.ts");
 const server=read("apps/api/src/auth.ts");
 assert.match(auth,/mfaPending:PendingMfa\|null/);
 assert.match(auth,/parseMfaRedirect/);
 assert.match(auth,/isFullMfaResponse/);
 assert.match(auth,/mfaEndpoint/);
 assert.match(auth,/nativeMfaRequest<unknown>/);
 assert.match(auth,/challengeValid/);
 assert.match(auth,/activateBearer/);
 assert.match(auth,/SecureStore.setItemAsync\(TOKEN_KEY,newToken\)/);
 assert.ok(auth.indexOf('"/api/auth/get-session"')<
  auth.lastIndexOf('SecureStore.setItemAsync(TOKEN_KEY,newToken)'));
 assert.doesNotMatch(auth,/MFA_WEB_REQUIRED/);
 assert.match(wrapper,/if\(auth.mfaPending\)return <NativePatientMfa/);
 assert.match(scene,/secureTextEntry/);
 assert.match(scene,/AppState.addEventListener/);
 assert.match(scene,/setCode\(""\)/);
 assert.match(scene,/normalizeMfaCode\(method,code\)/);
 assert.match(scene,/auth.verifyMfa\(method,candidate\)/);
 assert.match(scene,/auth.cancelMfa\(\)/);
 assert.match(scene,/challengeValid\(challenge,now\)/);
 assert.doesNotMatch(scene,/AsyncStorage|SecureStore|console\.log|Cookie:/);
 assert.match(clinicMfa,/credentials:"include"/);
 assert.match(clinicMfa,/trustDevice:false/);
 assert.match(server,/twoFactor\(/);
 assert.match(server,/bearer\(\{requireSignature:true\}\)/);
});
test("C28-06 full roles and all patient/admin/clinic major app entrypoints exist",()=>{
 for(const path of [
  "apps/mobile/App.tsx","apps/mobile/native-workspace-choice.tsx",
  "apps/mobile/native-clinic.tsx","apps/mobile/native-patient.tsx",
  "apps/admin-web/app/admin/clinics/page.tsx",
  "apps/admin-web/app/admin/dentists/page.tsx",
  "apps/admin-web/app/admin/listings/page.tsx",
  "apps/admin-web/app/admin/security/page.tsx",
  "apps/admin-web/app/admin/pilot/page.tsx",
  "apps/clinic-web/app/clinic/patients/page.tsx",
  "apps/clinic-web/app/clinic/appointments/page.tsx",
  "apps/clinic-web/app/clinic/clinical/page.tsx",
  "apps/clinic-web/app/clinic/finance/page.tsx",
  "apps/clinic-web/app/clinic/staff/page.tsx",
  "apps/clinic-web/app/clinic/settings/page.tsx",
  "apps/patient-web/app/book/[dentistId]/page.tsx",
  "apps/patient-web/app/appointments/page.tsx",
  "apps/patient-web/app/account/security/page.tsx",
  "apps/api/src/pilot-gate.ts"
 ])assert.ok(existsSync(new URL("../"+path,import.meta.url)),path);
 const pilot=read("apps/api/src/pilot-gate.ts");
 assert.match(pilot,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(pilot,/protectHealthWrites/);
 assert.match(pilot,/PH19_PENETRATION_TEST_APPROVED/);
 assert.match(read("apps/mobile/App.tsx"),/<WorkspaceRouter/);
 assert.match(read("apps/mobile/native-clinic.tsx"),/NativeClinicPhase27/);
});
