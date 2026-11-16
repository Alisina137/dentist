import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const booking=read("apps/api/src/patient-booking-router.ts");
const clinic=read("packages/ui-web/src/phase15.tsx");
const native=read("apps/mobile/native-patient.tsx");
const css=read("packages/ui-web/src/clinic-operations.css");

test("Stage J: clinic notification metadata remains owner/manager only at both server and screen",()=>{
 for(const part of [
  'staff.get("/notifications",route(async(req:StaffRequest,res)=>{',
  'if(!["owner","manager"].includes(ctx.role))fail(403,"SETTINGS_ROLE_DENIED")',
  'WHERE b.clinic_id=${clinic} ORDER BY n.created_at DESC LIMIT 100',
  'res.json({deliveries:rows,emailConfigured:mailConfigured(),smsConfigured:false,pushConfigured:false})',
  'staff.get("/record-links",route(async(req:StaffRequest,res)=>{',
  'if(ctx.role==="dentist"&&!ctx.membership.clinicianEnabled)',
  'fail(403,"LINK_APPROVAL_DENIED")'
 ])assert.ok(booking.includes(part),part);
 assert.ok(clinic.includes('ownerManagerOnly>'));
 assert.ok(clinic.includes('if((ownerManagerOnly&&!["owner","manager"].includes(space.role))'));
 assert.ok(clinic.includes('activeKey==="bookingRequests"&&!["owner","manager","receptionist","dentist"].includes(space.role)'));
 assert.ok(clinic.includes('["owner","manager"].includes(space.role)&&'));
});
test("Stage J: explicit unauthorized tenant never falls back to a different clinic",()=>{
 assert.ok(clinic.includes('const space=clinic===null?ctx.clinics[0]:ctx.clinics.find(c=>c.clinicId===clinic)'));
 assert.ok(!clinic.includes('||ctx.clinics[0]'));
 assert.ok(clinic.includes('clinicUnavailable'));
 assert.ok(clinic.includes('<Requests key={clinicId}'));
 assert.ok(clinic.includes('<Notifications key={cid}'));
});
test("Stage J: requests read current tenant, cancel obsolete reads and refresh after mutations",()=>{
 for(const part of [
  'const current=snapshot?.key===key?snapshot:null',
  'const rows=current?.rows||[],links=current?.links||[]',
  'const controller=new AbortController()',
  'identityOpen&&canReviewLinks?',
  'return()=>controller.abort()',
  'document.addEventListener("visibilitychange",visible)',
  'window.addEventListener("focus",visible)',
  'window.setInterval(visible,45000)',
  'window.clearInterval(timer)',
  'setSnapshot(null);reload()',
  'loading?<Spinner/>:loadError?null:visible.length?'
 ])assert.ok(clinic.includes(part),part);
});
test("Stage J: delivery monitoring shows explicit channel status, bounded metadata and accessible retry",()=>{
 for(const part of [
  'type DeliveryRead={deliveries:DeliveryEvent[];emailConfigured:boolean;',
  'smsConfigured:boolean;pushConfigured:boolean',
  'function deliveryGroup(value:string)',
  'const current=snapshot?.cid===cid?snapshot:null',
  'api<DeliveryRead>("/v1/booking/clinics/"+encodeURIComponent(cid)+"/notifications"',
  'return()=>controller.abort()',
  'if(document.visibilityState==="visible")reload()',
  'visible=matches.slice((safePage-1)*10,safePage*10)',
  'aria-pressed={filter===value}',
  'aria-live="polite"',
  't("deliveryLimit")',
  'deliveryNoPush:"SMS and push are not available in this release."',
  'deliveryNoPush:"پیامک و پوش در این نسخه فعال نیست."',
  'deliveryNoPush:"SMS او push په دې نسخه کې نشته."'
 ])assert.ok(clinic.includes(part),part);
 for(const forbidden of ['patientName','phone','diagnosis','medicalNote','localStorage.setItem('])
  assert.ok(!clinic.slice(clinic.indexOf("function Notifications({cid}")).includes(forbidden),forbidden);
});
test("Stage J: patient mobile notifications refresh privately on foreground with accurate channel claims",()=>{
 for(const part of [
  'AppState.addEventListener("change",state=>',
  'if(state==="active")reload()',
  'auth.request<NotificationFeed>("/v1/booking/notifications")',
  'const view=snapshot?.user===user?snapshot:null',
  'return()=>{live=false}',
  '<NativePatientNotifications locale={locale} calendar={calendar}/>',
  'matching.slice(0,visible).map(',
  'matching.length>visible',
  'event.status===filter',
  'notificationChannelOff:"Email is not configured. SMS and push are unavailable."',
  'notificationChannelOff:"ایمیل تنظیم نشده است؛ پیامک و پوش فعال نیست."',
  'notificationChannelOff:"برېښنالیک نه دی تنظیم شوی؛ SMS او push نشته."',
  'function NativePatientNotifications'
 ])assert.ok(native.includes(part),part);
 const feed=native.slice(native.indexOf("function NativePatientNotifications("),native.indexOf("export function NativeAppointments("));
 for(const forbidden of ['AsyncStorage','SecureStore','localStorage','diagnosis','patientNumber'])
  assert.ok(!feed.includes(forbidden),forbidden);
});
test("Stage J: notification design is mobile friendly, safe, and keyboard accessible",()=>{
 for(const part of [
  '.j-delivery-counters','.j-channel-grid','.j-delivery-row','.j-delivery-badge.j-failed',
  '.j-deliveries button:focus-visible','@media(max-width:700px)',
  '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(part),part);
});
