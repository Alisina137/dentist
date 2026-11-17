import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const loaded={exports:{}};
const source=read("apps/mobile/native-clinic-model.ts");
new Function("module","exports",ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText)(loaded,loaded.exports);
const {blankClinicDraft,clinicDraftErrors,clinicRegistrationPayload,plannedDentists,
 validClinicContext,clinicHomeMetrics,clinicAppointmentMetrics}=loaded.exports;
const good={
 ...blankClinicDraft,legalName:"Kabul Dental Practice",displayName:"Kabul Smile Center",
 province:"Kabul",city:"Kabul",district:"District 4",
 address:"A real neighborhood address, Kabul",phone:"+93700123456",
 email:"owner@example.com",licenseNumber:"",plannedDentistCount:"7"
};
const id="11111111-1111-4111-8111-111111111111";
test("native clinic onboarding: validates exact Phase02 fields and genuine plan ID",()=>{
 assert.deepEqual(clinicDraftErrors(good),[]);
 const payload=clinicRegistrationPayload(good,"plan-id");
 assert.equal(payload.plannedDentistCount,7);
 assert.equal(payload.selectedPlanId,"plan-id");
 assert.equal(payload.email,"owner@example.com");
 assert.equal(payload.district,"District 4");
 assert.equal(payload.timezone,undefined);
 assert.deepEqual(Object.keys(payload).sort(),[
  "address","city","clinicType","displayName","district","email","legalName",
  "licenseNumber","phone","plannedDentistCount","province","selectedPlanId"
 ].sort());
 assert.throws(()=>clinicRegistrationPayload(good,""));
});
test("clinic registration: unsupported staff count, malformed numbers and missing address blocked",()=>{
 for(const value of ["0","501","-1","1.5","2e3","1.0","NaN","  ","9999999","Infinity"]){
  assert.equal(plannedDentists(value),null,value);
  assert.ok(clinicDraftErrors({...good,plannedDentistCount:value}).includes("plannedDentistCount"));
 }
 assert.equal(plannedDentists("500"),500);
 assert.equal(plannedDentists("1"),1);
 assert.ok(clinicDraftErrors({...good,phone:"12345"}).includes("phone"));
 assert.ok(clinicDraftErrors({...good,email:"not-email"}).includes("email"));
 assert.ok(clinicDraftErrors({...good,address:"a"}).includes("address"));
 assert.ok(clinicDraftErrors({...good,clinicType:"fake"}).includes("clinicType"));
});
test("clinic session parsing: membership must be server-authorized and exact role",()=>{
 const ctx={name:"Dentist",email:"dentist@example.com",mfaEnabled:false,
  clinics:[{clinicId:id,clinicName:"Practice",clinicStatus:"approved",
   role:"dentist",membershipId:id,clinicianEnabled:true,capabilities:["clinic.read"]}]};
 assert.equal(validClinicContext(ctx),true);
 assert.equal(validClinicContext({...ctx,clinics:[ctx.clinics[0],ctx.clinics[0]]}),false);
 assert.equal(validClinicContext({...ctx,clinics:[{...ctx.clinics[0],role:"administrator"}]}),false);
 assert.equal(validClinicContext({...ctx,clinics:[{...ctx.clinics[0],clinicId:"not a uuid"}]}),false);
 assert.equal(validClinicContext({...ctx,clinics:undefined}),false);
 assert.equal(validClinicContext({...ctx,mfaEnabled:"false"}),false);
});
test("clinic operational dashboard: no missing or fabricated metrics",()=>{
 assert.equal(clinicHomeMetrics({metrics:{services:4,chairs:2,openDays:6,scheduledDentists:3},
  readyForPreview:true}).metrics.scheduledDentists,3);
 assert.equal(clinicHomeMetrics({metrics:{services:0,chairs:0,openDays:0,
  scheduledDentists:-1},readyForPreview:true}),null);
 assert.equal(clinicHomeMetrics({metrics:{services:0,chairs:0,openDays:0},
  readyForPreview:false}),null);
 assert.deepEqual(clinicAppointmentMetrics({todayTotal:4,weekTotal:11,
  counts:{confirmed:2,arrived:2}}),{
  todayTotal:4,weekTotal:11,counts:{confirmed:2,arrived:2}
 });
 assert.equal(clinicAppointmentMetrics({todayTotal:-1,weekTotal:10,counts:{}}),null);
 assert.equal(clinicAppointmentMetrics({todayTotal:0,weekTotal:0,counts:{confirmed:"5"}}),null);
});
test("clinic web design premium scope: preserves patient/admin and chart semantics",()=>{
 const layout=read("apps/clinic-web/app/clinic/layout.tsx");
 const css=read("apps/clinic-web/app/clinic/clinic-premium-v2.css");
 const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
 assert.ok(layout.includes('import "./clinic-premium-v2.css"'));
 assert.ok(css.includes(".clinic-persistent-shell"));
 assert.ok(css.includes("clinic-persistent-sidebar"));
 assert.ok(css.includes("clinic-persistent-header"));
 assert.ok(css.includes('aria-current="page"'));
 assert.ok(css.includes("@media(max-width:900px)"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(shell.includes("clinic-sidebar-collapsed"));
 assert.ok(!css.includes(".tooth-path"));
 assert.ok(!css.includes(".patient-web"));
 assert.ok(!css.includes(".admin-shell"));
});
test("patient/clinic onboarding: no unverified health data in local storage or permission shortcut",()=>{
 const app=read("apps/mobile/App.tsx");
 const choice=read("apps/mobile/native-workspace-choice.tsx");
 const clinic=read("apps/mobile/native-clinic.tsx");
 const clinicApi=read("apps/api/src/phase02.ts");
 const db=read("packages/db/src/schema.ts");
 const migration=read("packages/db/migrations/0022_clinic_planned_staffing.sql");
 assert.ok(app.includes("<WorkspaceRouter"));
 assert.ok(app.includes("<NativeClinicApp"));
 assert.ok(app.includes("<NativeAuthProvider>"));
 assert.ok(choice.includes("dandanlink.mobile.workspace.v1"));
 assert.ok(choice.includes("onChangeWorkspace")===false);
 assert.ok(choice.includes("AsyncStorage.setItem(WORKSPACE_STORAGE_KEY"));
 assert.ok(clinic.includes("expo-secure-store"));
 assert.ok(clinic.includes("Bearer "));
 assert.ok(clinic.includes('"/v1/team/context"'));
 assert.ok(clinic.includes('"/v1/clinics","POST"'));
 assert.ok(clinic.includes('"/v1/public/plans"'));
 assert.ok(clinic.includes("twoFactorRedirect"));
 assert.ok(clinic.includes("MFA_WEB_REQUIRED"));
 assert.ok(clinic.includes("/v1/appointments/clinics/"));
 assert.ok(clinic.includes("/v1/operations/clinics/"));
 assert.ok(clinic.includes("EXPO_PUBLIC_CLINIC_WEB_URL"));
 assert.ok(clinic.includes("emailVerified"));
 assert.ok(clinic.includes("clinicRegistrationPayload"));
 assert.ok(clinic.includes('"/clinic/onboarding?clinic="'));
 assert.ok(clinic.includes("NativeClinicApp"));
 assert.ok(clinicApi.includes("INVALID_PLANNED_DENTISTS"));
 assert.ok(db.includes('integer("planned_dentist_count")'));
 assert.ok(migration.includes("CHECK (planned_dentist_count BETWEEN 1 AND 500)"));
 assert.ok(!clinic.includes("PH19_PILOT_RELEASE_ENABLED"));
 assert.ok(!clinic.includes("localStorage"));
 assert.ok(!clinic.includes("AsyncStorage.setItem(TOKEN_KEY"));
});
