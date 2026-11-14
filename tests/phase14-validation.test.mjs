import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("PH14 patient identity is distinct from clinic records and consent is append-only",()=>{
 const schema=file("packages/db/migrations/0014_patient_identity_family.sql");
 for(const name of ["patient_profiles","patient_notification_preferences",
  "patient_dependents","patient_family_invitations","patient_consent_events",
  "patient_pending_family_invite_unique","patient_active_adult_delegate_unique",
  "minor_guardian_attestation","adult_account_acceptance","patient_consent_events_immutable",
  "PATIENT_CONSENT_EVENTS_APPEND_ONLY","adult_attested","CHECK"]){
   assert.ok(schema.includes(name),name);
 }
 for(const forbidden of ["REFERENCES clinic_patients","REFERENCES clinic_appointments",
  "REFERENCES clinic_encounters","REFERENCES clinic_treatments","medical_record_id",
  "credential_evidence"]){
   assert.ok(!schema.includes(forbidden),"no implicit patient/clinic linkage: "+forbidden);
 }
});
test("PH14 public patient account must be verified, consented and isolated",()=>{
 const api=file("apps/api/src/patient-account-router.ts");
 for(const token of ["auth.api.getSession","emailVerified!==true",
  "PATIENT_ONBOARDING_REQUIRED","PATIENT_CONSENT_REQUIRED","CHILD_AGE_REQUIRED",
  "GUARDIAN_AUTHORIZATION_REQUIRED","adultConsent","target_user_id",
  "patient_profiles","patient_consent_events","patient_family_invitations",
  "profileGuard","/family/minors","/family/invite-adult","/family/requests",
  "/family/delegations","/privacy/export","/security/sessions",
  "publicBookingsEnabled:true","clinicalRecordLinksEnabled:true"]){
   assert.ok(api.includes(token),token);
 }
 for(const forbidden of ["clinic_patients","clinic_encounters","clinic_invoices",
   "clinic_treatment","clinic_patient_records","fetchClinicalNotes"]){
    assert.ok(!api.includes(forbidden),"no direct clinic PHI read: "+forbidden);
 }
 assert.ok(!api.includes('privateArea.get("/family/invitations"'),
  "do not reveal adult email registration via outgoing pending invitations");
});
test("PH14 Next.js patient routes have complete real UI and email auth without booking placeholders",()=>{
 const ui=file("packages/ui-web/src/phase14.tsx");
 const screens=["PatientAuthPage","PatientOnboardingPage","PatientAccountHome",
  "PatientProfilePage","PatientFamilyPage","PatientPreferencesPage",
  "PatientPrivacyPage","PatientSecurityPage","PatientLegalPage"];
 for(const name of screens)assert.ok(ui.includes("export function "+name),name);
 const routes=["login","signup","verify","forgot-password","reset-password",
  "account","account/onboarding","account/profile","account/family",
  "account/family/requests","account/preferences","account/privacy",
  "account/security","account/2fa"];
 for(const name of routes){
  const content=file("apps/patient-web/app/"+name+"/page.tsx");
  assert.ok(content.includes("dandanlink/ui"),name);
 }
 const styles=file("packages/ui-web/src/styles.css");
 for(const token of [".p14-account-grid",".p14-family-member",
  ".p14-form-two",".p14-auth-page",".p14-session",
  "@media(max-width:570px)","@media(max-width:810px)"])
  assert.ok(styles.includes(token),token);
 const nav=file("packages/ui-web/src/index.tsx");
 assert.ok(nav.includes("PatientAccountNavLink"));
 const locale=file("packages/locales/src/index.ts");
 for(const token of ["patientAccountLink","patientSignInLink"])
  assert.ok(locale.includes(token),token);
});
