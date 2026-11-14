import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");

test("Native patient UX shows real public approved search, profile and live preview",()=>{
 const app=read("apps/mobile/App.tsx");
 for(const required of [
  "function PatientApp","function HomeScreen","function ExploreScreen","function ClinicScreen",
  "function DentistScreen","function Availability","function HoursCard","function ServicesCard",
  "function SavedScreen","function AccountScreen","function DateRibbon",
  "/v1/discovery","/facets","/search","/clinics/","/availability?",
  "previewOnly:true","publicBookingsEnabled:false","SavedButton",
  "AsyncStorage","SAVED_KEY","RefreshControl","SafeAreaView","patient.preferences.v1",
  "profile.photos","verifiedClinic:true","isSaved","onSave","onCity","service","specialty",
  "formatToParts","Asia/Kabul","photo.url","Linking.openURL","tel:"
 ])assert.ok(app.includes(required),required);
 for(const forbidden of [
  "Math.random(","fakeDentists","demoDoctor","PMDC Verified","Elite Clinic",
  "Free Dental Camp","Book Appointment","Confirm Appointment",
  "/v1/appointments","/v1/clinical","/v1/registry",
  "EXPO_PUBLIC_AUTH_SECRET","EXPO_PUBLIC_DATABASE_URL"
 ])assert.ok(!app.includes(forbidden),"must never fabricate or leak: "+forbidden);
 const pkg=JSON.parse(read("apps/mobile/package.json"));
 assert.ok(pkg.dependencies["react-native"]);
 assert.ok(!pkg.dependencies["expo-location"],"location permission not requested silently");
});

test("Mobile reference design uses four working navigation tabs, not fake unfinished features",()=>{
 const app=read("apps/mobile/App.tsx");
 assert.ok(app.includes('[["home","⌂"],["explore","⌕"],["saved","♡"],["account","☺"]]'));
 assert.ok(!app.includes('["appointments","'));
 assert.ok(!app.includes('["rewards","'));
 assert.ok(!app.includes('["reviews","'));
 assert.ok(!app.includes('["bills","'));
 assert.ok(app.includes('PATIENT_WEB+"/account"'));
 assert.ok(app.includes("EXPO_PUBLIC_PATIENT_WEB_URL"));
 assert.ok(app.includes("window")===false,"native screen never assumes browser window globals");
});

test("Native localization and page structure are truly RTL-aware",()=>{
 const app=read("apps/mobile/App.tsx");
 for(const str of ['"fa-AF"','"ps-AF"','"en"','flexDirection:ui.flow',
  "textAlign:ui.align",'calendar==="solar_hijri"','setLocale','setCalendar',
  "dandanlink.patient.preferences.v1","SafeAreaProvider","StatusBar"])
  assert.ok(app.includes(str),str);
});

test("Patient website has functional mobile bottom nav, gallery, filters, schedule ribbon and signup confirm",()=>{
 const nav=read("packages/ui-web/src/index.tsx");
 assert.ok(nav.includes("function PatientBottomNav"));
 for(const route of ['href:"/"','href:"/search"','href:"/account/family"','href:"/account"'])
  assert.ok(nav.includes(route),route);
 const discovery=read("packages/ui-web/src/phase13.tsx");
 for(const feature of ["p13-gallery-grid","p13-date-ribbon","p13-mobile-filter-toolbar",
  "p13-filter-panel-open","setMobileFilters",'tab==="gallery"'])
  assert.ok(discovery.includes(feature),feature);
 const auth=read("packages/ui-web/src/phase14.tsx");
 for(const field of ["confirmPassword","passwordMismatch","confirmation","password!==confirmation"])
  assert.ok(auth.includes(field),field);
 const layout=read("apps/patient-web/app/layout.tsx");
 assert.ok(layout.includes("patient-experience.css"));
 const css=read("packages/ui-web/src/patient-experience.css");
 for(const key of [".patient-bottom-navigation",".p13-gallery-grid",
   ".p13-date-ribbon",".p13-mobile-filter-toolbar",".p13-filter-panel-open",
   "@media(max-width:800px)","env(safe-area-inset-bottom)"])
   assert.ok(css.includes(key),key);
 const locale=read("packages/locales/src/index.ts");
 assert.ok(locale.includes("patientFamilyNav"));
});
