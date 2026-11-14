import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("PH16 native patient app has five complete navigation destinations",()=>{
 const app=read("apps/mobile/App.tsx");
 for(const s of ["NativeAuthProvider","NativeAccountArea","NativeBookingWizard",
  "NativeAppointments","NativeSaved","saveDentist","onReschedule",
  '[["home","⌂"],["explore","⌕"],["appointments","▦"],["saved","♡"],["account","☺"]]'])
  assert.ok(app.includes(s),s);
 assert.ok(!app.includes('"Book Appointment"'));
});

test("PH16 native sessions use SecureStore exclusively; no cookies or clinical payload cache",()=>{
 const auth=read("apps/mobile/native-auth.tsx");
 const patient=read("apps/mobile/native-patient.tsx");
 assert.ok(auth.includes("expo-secure-store"));
 assert.ok(auth.includes('headers.get("set-auth-token")'));
 assert.ok(auth.includes('"Authorization":"Bearer "+token'));
 assert.ok(auth.includes("SecureStore.deleteItemAsync"));
 assert.ok(auth.includes("SecureStore.setItemAsync"));
 assert.ok(auth.includes("/api/auth/get-session"));
 assert.ok(auth.includes("/api/auth/sign-in/email"));
 assert.ok(!auth.includes("AsyncStorage"));
 assert.ok(!patient.includes("AsyncStorage"));
 assert.ok(!patient.includes("/v1/clinical"));
 assert.ok(!patient.includes("/v1/registry"));
 assert.ok(!patient.includes("Math.random("));
});

test("PH16 backend rechecks publication and authentication for clinic and dentist favorites",()=>{
 const api=read("apps/api/src/patient-favorites-router.ts");
 const auth=read("apps/api/src/auth.ts");
 const schema=read("packages/db/migrations/0016_native_favorites.sql");
 for(const x of ["auth.api.getSession","patient_profiles","publicListing","VERIFIED_DENTIST_UNAVAILABLE",
  'app.post("/")','app.get("/")','app.delete("/")',"no-store"])
  assert.ok(api.includes(x),x);
 assert.ok(auth.includes("bearer({requireSignature:true})"));
 assert.ok(schema.includes("patient_favorites_dentist_unique"));
 assert.ok(schema.includes("patient_favorites_clinic_unique"));
 assert.ok(!api.includes("clinic_encounters"));
 assert.ok(!api.includes("patient_record_releases"));
});

test("PH16 requests use PH15 transactional booking contract and explicit consent",()=>{
 const native=read("apps/mobile/native-patient.tsx");
 for(const p of ["/v1/discovery/clinics/","/availability?","/v1/booking/requests",
   "/v1/booking/my","/cancel","/reschedule",
   "bookingConsent:true","idempotencyKey:key","subjectType:",
   "eligibleForFutureBooking"])
  assert.ok(native.includes(p),p);
 assert.ok(native.includes('timeZone:"Asia/Kabul"'));
});
