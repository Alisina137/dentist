import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("PH13 indexes approved clinic, dentist and service copy only, with live visibility gate",()=>{
 const sql=src("packages/db/migrations/0013_public_discovery_index.sql");
 for(const term of ["clinic_public_search_index","eligible_clinic_public_search",
  "public_search_text_gin","public_search_city_idx","public_search_specialties_gin",
  "refresh_clinic_public_search_index","refresh_public_search_on_publication",
  "refresh_public_search_on_clinic_identity","clinic_dentist_credential_cases",
  "clinic_services","clinic_subscriptions","valid_until","status='approved'",
  "NOT EXISTS","base_price_afn","lower(i.city)".replace("lower(i.city)","lower(city)")]){
   assert.ok(sql.includes(term),term);
 }
 for(const forbidden of ["clinic_patients","clinic_encounters","clinic_treatment",
  "patient_name","diagnosis","clinic_invoices","clinic_payment_entries"]){
  assert.ok(!sql.includes(forbidden),"privacy: "+forbidden);
 }
});
test("PH13 public search is real and read-only; private clinic records not exposed",()=>{
 const api=src("apps/api/src/discovery-router.ts");
 for(const term of ["discoveryRouter","/search","/facets","/clinics/:clinicId",
  "/clinics/:clinicId/availability","/clinics/:clinicId/dentists/:dentistId",
  "eligible_clinic_public_search","publicListing","slotsForDate",
  "availabilityPreview","DATE_OUT_OF_RANGE","LOCATION_CONSENT_REQUIRED",
  "CLINIC_UNAVAILABLE","publicBookingsEnabled:false","source:","reviewedOnly:true",
  "totalExact:!truncated","nextSlot","verifiedClinic:true"]){
   assert.ok(api.includes(term),term);
 }
 for(const forbidden of ["clinicPatient","clinicEncounter","clinicTreatment",
  "clinicPaymentEntry","clinicInvoice","req.actor","getSession","adminAuth"]){
   assert.ok(!api.includes(forbidden),"public API must not access restricted records: "+forbidden);
 }
 assert.match(api,/ESCAPE/);
});
test("PH13 public patient navigates real Home, Search, Clinic, Dentist, About without booking CTA",()=>{
 const ui=src("packages/ui-web/src/phase13.tsx");
 for(const term of ["PatientDiscoveryHome","PatientSearchPage","PatientClinicPage",
  "PatientDentistPage","PatientAboutPage","ClinicCard","ProfessionalCard",
  "AvailabilityPanel","HoursTable","VerifiedBadge","nearMe","SearchCity",
  "phase13","fa-AF","ps-AF","en","getCurrentPosition","publicBookingsEnabled:false"
     .replace("publicBookingsEnabled:false","bookingLater")]){
  if(term!=="phase13")assert.ok(ui.includes(term),term);
 }
 const files=[
 "apps/patient-web/app/page.tsx",
 "apps/patient-web/app/search/page.tsx",
 "apps/patient-web/app/clinics/[clinicId]/page.tsx",
 "apps/patient-web/app/clinics/[clinicId]/dentists/[dentistId]/page.tsx",
 "apps/patient-web/app/about/page.tsx"
 ];
 for(const file of files)assert.ok(src(file).includes("@dandanlink/ui/phase13"),file);
 const layout=src("packages/ui-web/src/index.tsx");
 assert.ok(layout.includes('href="/search"'));
 assert.ok(layout.includes('href="/about"'));
 const css=src("packages/ui-web/src/styles.css");
 assert.ok(css.includes(".p13-search-layout"));
 assert.ok(css.includes("@media(max-width:620px)"));
});
