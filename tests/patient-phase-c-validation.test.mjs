import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("apps/mobile/App.tsx");
const patient=read("apps/mobile/native-patient.tsx");
const journeys=read("apps/mobile/native-journeys.tsx");
const reviews=read("apps/mobile/native-reviews.tsx");
const icons=read("apps/mobile/patient-icons.tsx");
const theme=read("apps/mobile/patient-theme.ts");

test("Patient C: shared design tokens across all four native patient modules",()=>{
 for(const content of [app,patient,journeys,reviews])
  assert.ok(content.includes('import {patientTheme} from "./patient-theme";'));
 for(const token of [
  "brandSoft","background","surface","stroke","radius",
  "cardTitle","section","body","caption","minimum","controlHeight",
  "shadowOpacity","spacing"
 ])assert.ok(theme.includes(token),token);
 assert.ok(theme.includes("native Arabic-script fallback"),
  "Dari/Pashto must use platform font shaping instead of assuming a Latin-only font");
 for(const content of [app,patient,journeys,reviews])
  assert.ok(content.includes("patientTheme.type."),"a shared typographic scale must reach each experience");
});

test("Patient C: consistent native outline icons have no external fonts, image assets or dependency additions",()=>{
 for(const marker of [
  'export type PatientIconName=',
  'export function PatientIcon(',
  'importantForAccessibility="no-hide-descendants"',
  'case "home":','case "search":','case "calendar":','case "bookmark":',
  'case "user":','case "clinic":','case "users":','case "file":',
  'case "bell":','case "settings":','case "shield":','case "help":',
  'case "tooth":','case "phone":'
 ])assert.ok(icons.includes(marker),marker);
 assert.ok(!icons.includes("fetch(")&&!icons.includes("<Image")&&!icons.includes("require("),
  "icons must render offline without visual fonts or remote requests");
 for(const content of [app,patient,journeys,reviews])
  assert.ok(content.includes('from "./patient-icons"'),"primary patient modules use the same outline icon family");
 assert.ok(app.includes('<PatientIcon name="tooth"'));
 assert.ok(app.includes('<PatientIcon name={icon} size={23}'));
 assert.ok(app.includes('<PatientIcon name={row.icon}'));
 assert.ok(!app.includes('[["home","⌂"],["explore","⌕"]'),
  "bottom nav must not regress to platform-dependent Unicode symbols");
});

test("Patient C: navigation remains stable, accessible and safe-area-aware",()=>{
 for(const marker of [
  '([["home","home"],["explore","search"],["appointments","calendar"],["saved","bookmark"],["account","user"]] as const)',
  'accessibilityRole="tab" accessibilityState={{selected:tab===value}}',
  's.bottomNavItemActive',
  's.bottomNavPressed',
  's.bottomNavIconContainerSelected',
  'minHeight:64',
  'patientTheme.type.minimum',
  'SafeAreaView style={s.root} edges={["top","bottom","left","right"]}',
  'tab+":"+accountSection',
  'BackHandler.addEventListener("hardwareBackPress"',
  'if(viewIdentity!==identityKey)return <SafeAreaView'
 ])assert.ok(app.includes(marker),marker);
 assert.ok(app.includes('flexDirection:ui.flow'),"navigation should mirror in RTL");
});

test("Patient C: sticky detail booking action survives scroll and respects clinic/dentist routes",()=>{
 for(const marker of [
  '(route?.kind==="clinic"||route?.kind==="dentist")&&<View style={s.stickyBookingBar}>',
  'onPress={()=>route?.kind==="dentist"?book(route.clinicId,route.dentistId):',
  'route?.kind==="clinic"?book(route.clinicId):undefined}',
  's.stickyBookingButton',
  'stickyBookingBar:{backgroundColor:colors.white',
  'minHeight:54',
  '<PatientIcon name="calendar" size={21} color={colors.white}/>',
  'accessibilityRole="button"',
  'onBook={()=>book(route.clinicId)}',
  'onBook={()=>book(route.clinicId,route.dentistId)}'
 ])assert.ok(app.includes(marker),marker);
 assert.ok(app.includes('!route&&<View style={[s.bottomNav'),
  "bottom tabs must not overlap detail booking action");
});

test("Patient C: cards, forms, error states and rating targets use readable touch sizing",()=>{
 for(const marker of [
  'padding:patientTheme.spacing.card',
  'fontSize:patientTheme.type.body',
  'fontSize:patientTheme.type.caption',
  'minHeight:patientTheme.controlHeight',
  'backgroundColor:patientTheme.colors.dangerSoft',
  'minHeight:52',
  'patientTheme.radius.control'
 ])assert.ok(patient.includes(marker),marker);
 for(const marker of [
  'minHeight:patientTheme.controlHeight',
  'fontSize:patientTheme.type.body',
  'style={{minWidth:44,minHeight:48',
  'flexDirection:locale==="en"?"row":"row-reverse"',
  'style={({pressed})=>'
 ])assert.ok(reviews.includes(marker),marker);
 assert.ok(journeys.includes('padding:patientTheme.spacing.card'));
 assert.ok(journeys.includes('minHeight:patientTheme.controlHeight'));
 assert.ok(app.includes('s.quickActionIconBox'));
 assert.ok(app.includes('s.iconButtonRow'));
 assert.ok(app.includes('flexWrap:"wrap"'),"clinic action groups must wrap in long RTL translations");
});

test("Patient C: polish does not change data permissions or create fake data",()=>{
 for(const marker of [
  'NativeAppointmentDetails bookingId={route.bookingId}',
  'NativeNextAppointment locale={ui.locale} calendar={ui.calendar}',
  'NativeAuthProvider','NativeBookingWizard','NativeAppointments',
  'NativeSaved','patientError(err,locale)'
 ])assert.ok(app.includes(marker),marker);
 for(const content of [app,patient,journeys,reviews]){
  assert.ok(!content.includes("fakeDentists"));
  assert.ok(!content.includes("Math.random("));
 }
 assert.ok(!patient.includes("AsyncStorage"));
 assert.ok(journeys.includes('auth.request<{appointments:Booking[]}>("/v1/booking/my")'));
 assert.ok(journeys.includes('snapshot?.user===user&&snapshot.bookingId===bookingId?snapshot:null'));
 assert.ok(app.includes('AccessibilityInfo.isReduceMotionEnabled()'),
  "existing reduced motion support must remain intact");
});
