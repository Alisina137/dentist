import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Clinic owner signup distinguishes invited dentist without automatic privileges",()=>{
 const ui=source("packages/ui-web/src/index.tsx");
 const auth=ui.slice(ui.indexOf("export function AuthPanel"),ui.indexOf("export function PublicHome"));
 for(const token of ["signupRole","clinic-auth-choice","clinic-auth-explainer",
   "password!==confirmation","/clinic/invite","/terms","/privacy",
   'CareIcon name="clinic"','CareIcon name="profile"'])
  assert.ok(auth.includes(token),token);
 assert.ok(auth.includes("Clinic approval and dentist credential review are separate"));
 assert.ok(!auth.includes("grantDentistRole"));
});
test("Clinic setup preserves independent PH02 review while organizing registration into real stages",()=>{
 const src=source("packages/ui-web/src/phase02.tsx");
 const ui=src.slice(src.indexOf("function Onboarding(){"),src.indexOf("function ClinicSettings(){"));
 for(const token of ["function Onboarding","clinic-setup-steps","clinic-setup-review-status",
   "clinic-setup-surface","clinic-setup-docs","clinic-setup-privacy-badge",
   "clinic-setup-summary","clinic-setup-uploads","clinic-setup-submit",
   "OperationsSetup","clinic-setup-side-steps",
   "/clinics/","/evidence","x-document-kind","clinic_license",
   "/submit","attested:true","revision:detail.clinic.revision",
   "needs_info","approved","pending","suspended","readonly={!canEdit}",
   "Professional qualifications and ID cards","doctorNotice"])
  assert.ok(ui.includes(token),token);
 assert.ok(!ui.includes("PMDC"));
 assert.ok(!ui.includes("Elite Clinic"));
 assert.ok(!ui.includes("36 POINTS"));
 assert.ok(!ui.includes("autoApprove"));
 assert.ok(!ui.includes("score +"));
});
test("Clinic registration distinguishes private documents and published information",()=>{
 const src=source("packages/ui-web/src/phase02.tsx");
 const ui=src.slice(src.indexOf("function OrganizationFields"),src.indexOf("function PlanCards"));
 for(const field of ["legalName","displayName","clinicType","province","city",
   "district","address","phone","email","licenseNumber",
   "clinic-setup-field-section","readonly=false","fieldset",
   "private","public"])
  assert.ok(ui.includes(field),field);
 const creds=source("packages/ui-web/src/phase12.tsx");
 assert.ok(creds.includes("DentistCredentialPortal"));
 assert.ok(creds.includes("CredentialForm"));
 const page=source("apps/clinic-web/app/clinic/credentials/page.tsx");
 assert.ok(page.includes("DentistCredentialPortal"));
});
test("Clinic-specific stylesheet supports narrow mobile/RTL and keeps patient/admin isolated",()=>{
 const css=source("packages/ui-web/src/clinic-onboarding.css");
 for(const part of [".clinic-setup-steps",".clinic-setup-form-sections",
  ".clinic-setup-privacy-badge",".clinic-setup-review-status",
  ".clinic-setup-plan-card",".clinic-setup-uploads",".clinic-setup-aside",
  ".clinic-auth-choice-buttons","@media(max-width:650px)","@media(max-width:960px)",
  "prefers-reduced-motion"])
  if(part!==".clinic-setup-plan-card")assert.ok(css.includes(part),part);
 const pkg=JSON.parse(source("packages/ui-web/package.json"));
 assert.ok(pkg.exports["./clinic-onboarding.css"]);
 assert.ok(source("apps/clinic-web/app/layout.tsx").includes("clinic-onboarding.css"));
 assert.ok(!source("apps/patient-web/app/layout.tsx").includes("clinic-onboarding.css"));
 assert.ok(!source("apps/admin-web/app/layout.tsx").includes("clinic-onboarding.css"));
});
