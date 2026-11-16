import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("apps/mobile/App.tsx");
const patient=read("apps/mobile/native-patient.tsx");
const journeys=read("apps/mobile/native-journeys.tsx");

test("Patient B: Home is personalized from authenticated real bookings only",()=>{
 for(const x of [
  "function HomeScreen(",
  "<NativeNextAppointment locale={ui.locale} calendar={ui.calendar}",
  "onOpen={onAppointment} onAll={onAppointments} onExplore={onBrowse}",
  'onAppointment={openAppointment} onAppointments={()=>select("appointments")} onSaved={()=>select("saved")}',
  'ui.t("quickActions")',
  'ui.t("explore")',
  'ui.t("appointments")',
  'ui.t("saved")'
 ])assert.ok(app.includes(x),x);
 for(const x of [
  'const auth=useNativeAuth(),user=auth.account?.registered?auth.account.user.id:null',
  'auth.request<{appointments:Booking[]}>("/v1/booking/my")',
  '(data.appointments||[]).filter(future).sort(',
  'setState({user,booking:next,error:"",loading:false})',
  'const view=state?.user===user?state:null',
  'if(!user)return null',
  'onPress={()=>onOpen(booking.id)}',
  'if(active)setState(',
  'return()=>{active=false}'
 ])assert.ok(journeys.includes(x),x);
 assert.ok(!journeys.includes("Math.random("),"no imaginary upcoming appointments");
 assert.ok(!journeys.includes("AsyncStorage"),"no patient data on device public storage");
});

test("Patient B: every appointment row opens its secure, dedicated server-authoritative detail",()=>{
 for(const x of [
  'type Route={kind:"clinic"',
  '{kind:"appointment";bookingId:string}',
  'function openAppointment(bookingId:string){setRoute({kind:"appointment",bookingId})}',
  'route?.kind==="appointment"?<NativeAppointmentDetails bookingId={route.bookingId}',
  'onClinic={id=>openClinic(id,route.bookingId)}',
  'route.kind==="appointment"?route.bookingId:route.clinicId',
  'else if(route?.kind==="clinic"&&route.fromBookingId)',
  'setRoute({kind:"appointment",bookingId:route.fromBookingId})',
  'onOpen={openAppointment}'
 ])assert.ok(app.includes(x),x);
 assert.ok(patient.includes('onOpen:(bookingId:string)=>void'),"appointment listing prop typed");
 assert.ok(patient.includes('title={t.view} onPress={()=>onOpen(b.id)}'),"appointment details accessible");
 for(const x of [
  'export function NativeAppointmentDetails(',
  'auth.request<{booking:Booking;timeline:BookingEvent[];timelineTruncated:boolean}>(',
  'snapshot?.user===user&&snapshot.bookingId===bookingId?snapshot:null',
  'if(!user)return',
  'setSnapshot({user,bookingId,booking:null,timeline:[],timelineTruncated:false,error:"",loading:true})',
  'return()=>{current=false}',
  'booking.status==="requested"',
  'const mayChange=future(booking)',
  'booking.revision,reason:"Patient requested appointment cancellation"',
  'if(error instanceof ApiError&&error.status===409)setReload(x=>x+1)',
  'onReschedule(booking)',
  'onClinic(booking.clinicId)',
  'time(booking.cancelUntil,locale,calendar)',
  'timeZone:"Asia/Kabul"'
 ])assert.ok(journeys.includes(x),x);
 assert.ok(journeys.includes("view.timeline.map((event,index)"),
  "must render real patient-scoped chronology, not fabricated status milestones");
 assert.ok(journeys.includes("timeline:data.timeline||[]"));
 assert.ok(journeys.includes('event.action==="rescheduled"'));
 const api=read("apps/api/src/patient-booking-router.ts");
 for(const part of [
  "JOIN patient_public_bookings b",
  "b.appointment_id=e.appointment_id AND b.clinic_id=e.clinic_id",
  "WHERE b.id=${bookingId} AND b.user_id=${user}",
  "e.action,e.after_status,e.after_start_at,e.created_at",
  "ORDER BY e.created_at DESC,e.id DESC LIMIT 101",
  "timeline,timelineTruncated:rows.length>100"
 ])assert.ok(api.includes(part),part);
});

test("Patient B: clinic profile is four practical tabs, with full reviewed gallery and hours on Overview",()=>{
 const clinic=app.slice(app.indexOf("function ClinicScreen("),app.indexOf("function DentistScreen("));
 for(const x of [
  'useState<"overview"|"dentists"|"services"|"times">("overview")',
  '["overview",ui.t("overview")]',
  '["dentists",ui.t("dentists")]',
  '["services",ui.t("treatments")]',
  '["times",ui.t("times")]',
  'showAllPhotos',
  'p.photos.slice(0,showAllPhotos?p.photos.length:2)',
  '<HoursCard hours={hours} ui={ui}/>',
  'tab==="times"&&<Availability',
  'onBook',
  'onOpenDentist'
 ])assert.ok(clinic.includes(x),x);
 assert.ok(!clinic.includes('tab==="gallery"')&&!clinic.includes('tab==="hours"'),
  "photos and hours should not force two extra navigation tabs");
});

test("Patient B: account is an organized hub with dedicated profile, family, updates and honest web-only pages",()=>{
 for(const x of [
  'type AccountSection="overview"|"profile"|"family"|"notifications"|"reviews"|"settings"|"records"|"security"|"support"',
  'function AccountHub({ui,account,onSection,onAppointments,onExplore}',
  'function AccountWebSection({ui,section,onBack,onProfile,registered}',
  'const path=section==="records"?"/account/records":section==="security"?"/account/security":"/help"',
  'PATIENT_WEB?<View style={{marginTop:16}}>',
  'onSection={setAccountSection}',
  'accountSection==="overview"?<AccountHub',
  'accountSection==="reviews"?<NativeReviews',
  'accountSection==="settings"?<AccountScreen',
  'accountSection==="records"||accountSection==="security"||accountSection==="support"?',
  'section={accountSection}',
  'setRoute(null);setAccountSection("overview");setTab("account")',
  'if(tab==="account"&&accountSection!=="overview")'
 ])assert.ok(app.includes(x),x);
 const account=patient.slice(patient.indexOf("export function NativeAccountArea("),
  patient.indexOf("function NativePatientNotifications("));
 for(const x of [
  'section?:"profile"|"family"|"notifications"',
  'section==="profile"&&<Block>',
  'section==="family"&&<Block>',
  'section==="notifications"&&<Block>',
  'section==="notifications"&&<NativePatientNotifications locale={locale} calendar={calendar}/>',
  'if(!patientId)return;',
  'if(live){setPrefs(p);setFamily(f)'
 ])assert.ok(account.includes(x),x);
 assert.ok(!app.includes("request<{booking:Booking}>"),"detail API belongs to a user-scoped native component");
});

test("Patient B: content and control labels are localized for all three languages",()=>{
 for(const x of ['appointments:"Appointments",quickActions:"Quick actions"',
  'appointments:"نوبت‌ها",quickActions:"دسترسی سریع"',
  'appointments:"ملاقاتونه",quickActions:"چټک لاسرسی"',
  'webNote:', 'webSecurity:', 'webSupport:'])
  assert.ok(app.includes(x),x);
 for(const lang of ['en:{upcoming:', '"fa-AF":{upcoming:', '"ps-AF":{upcoming:'])
  assert.ok(journeys.includes(lang),lang);
});
