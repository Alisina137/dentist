import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

const clinic=read("packages/ui-web/src/clinic-operations-dashboard.tsx");
const clinicCss=read("packages/ui-web/src/clinic-operations.css");
const staff=read("packages/ui-web/src/phase03.tsx");
const mobile=read("apps/mobile/App.tsx");
const patient=read("apps/mobile/native-patient.tsx");
const booking=read("packages/ui-web/src/phase15.tsx");
const bookingCss=read("packages/ui-web/src/phase15.css");

test("Stage K: clinic overview uses content-shaped, accessible skeletons without simulated metrics",()=>{
 for(const part of [
  'type SkeletonVariant="metrics"|"list"|"summary"',
  'className={"h-loading h-loading-"+variant}',
  'aria-live="polite" aria-label={t("loading")}',
  'variant==="metrics"?<div className="h-skeleton-metrics"',
  'variant==="list"?<div className="h-skeleton-list"',
  'variant="metrics"/>','variant="list"/>',
  'if(error)return <div className="h-error" role="alert"',
  'state.path===path?state.data:null'
 ]) assert.ok(clinic.includes(part),part);
 assert.ok(!clinic.includes("Math.random("),"fake numbers cannot be used for loading");
 for(const part of [
  ".h-skeleton-metrics",".h-skeleton-row",".h-skeleton-summary",
  ".h-clinic .h-loading-metrics",".h-clinic .h-loading-list",
  ".h-clinic .h-card{contain:layout style}",
  "@media(prefers-reduced-motion:reduce)",
  ".h-skeleton,.h-clinic .h-card,.h-clinic .h-head{animation:none!important}"
 ])assert.ok(clinicCss.includes(part),part);
});

test("Stage K: staff data loading is tenant-scoped and cancelled when navigation invalidates it",()=>{
 for(const part of [
  'async function api(path:string,method="GET",body?:unknown,signal?:AbortSignal)',
  'credentials:"include",signal',
  'const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>',
  'api(path,"GET",undefined,controller.signal)',
  'const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000)',
  'return()=>{clearTimeout(timer);controller.abort()}',
  'snapshot.path===path?snapshot.data:null',
  'snapshot.path===path?snapshot.error:""',
  'className="card panel k-team-skeleton"',
  'role="status" aria-label={t("loading")}'
 ])assert.ok(staff.includes(part),part);
 assert.ok(clinicCss.includes(".k-team-skeleton{"));
});

test("Stage K: mobile public search cannot briefly render prior filters or past clinic results",()=>{
 for(const part of [
  'const [state,setState]=useState<{path:string|null;loading:boolean;data:T|null;error:string|null}>',
  'data:state.path===path?state.data:null',
  'error:state.path===path?state.error:null',
  'loading:state.path===path?state.loading:!!path',
  'controller.abort()',
  'setTimeout(()=>controller.abort(),9000)'
 ])assert.ok(mobile.includes(part),part);
 assert.ok(!mobile.includes("fakeDentists"));
});

test("Stage K: native skeleton animations obey reduced-motion and stop on unmount",()=>{
 for(const part of [
  'AccessibilityInfo.isReduceMotionEnabled()',
  'if(!active||reduced)return',
  'Animated.loop(Animated.sequence([',
  'useNativeDriver:true',
  'loop?.stop()',
  'accessibilityRole="progressbar" accessibilityLabel={ui.t("loading")}',
  'importantForAccessibility="no-hide-descendants"',
  '[0,1,2].map(i=>',
  'progressiveRenderingEnabled onError',
  'bottomNavPressed',
  'ctaPressed'
 ])assert.ok(mobile.includes(part),part);
});

test("Stage K: private mobile appointments are account-isolated and never shown during errors",()=>{
 for(const part of [
  'generation=useRef(0)',
  'const patientId=auth.account?.registered?auth.account.user.id:null',
  'const request=++generation.current',
  'if(generation.current===request)setSnapshot({patientId,rows:result.appointments||[]',
  'return()=>{generation.current++}',
  'const active=snapshot?.patientId===patientId?snapshot:null',
  '{!loading&&!error&&current.map(b=><Block key={b.id}>',
  '<NativeLoadingList label={t.loadingData}/>',
  'loadingData:"Loading your information…"',
  'loadingData:"معلومات شما دریافت می‌شود…"',
  'loadingData:"معلومات بارېږي…"'
 ])assert.ok(patient.includes(part),part);
 const appointments=patient.slice(patient.indexOf("export function NativeAppointments("),
  patient.indexOf("export function NativeBookingWizard("));
 assert.ok(!appointments.includes("AsyncStorage")&&!appointments.includes("localStorage"));
});

test("Stage K: web booking loaders are accessible, responsive and distinguish errors from no results",()=>{
 for(const part of [
  'function Spinner({kind="list"}',
  'aria-label={t("loading")}',
  'kind==="slots"?6:kind==="form"?4:3',
  '<Spinner kind="form"/>',
  '<Spinner kind="slots"/>',
  '{pending?<Spinner/>:error?',
  'onClick={reload}'
 ])assert.ok(booking.includes(part),part);
 for(const part of [
  ".p15-loading-slots .p15-skeletons",
  ".p15-loading-form .p15-skeletons",
  "@media(max-width:600px)",
  "@media(prefers-reduced-motion:reduce)",
  ".p15-skeleton{animation:none!important;background:#eaf1f6}"
 ])assert.ok(bookingCss.includes(part),part);
});
