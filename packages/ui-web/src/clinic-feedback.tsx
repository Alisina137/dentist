"use client";
import React from "react";
import {CareIcon} from "./care-icons";
import {usePreferences} from "./index";

type Locale="en"|"fa-AF"|"ps-AF";
type Variant="cards"|"rows"|"form";
const words:Record<Locale,Record<string,string>>={
 en:{
  loading:"Loading clinic information…",
  failed:"Unable to load this section",retry:"Try again",
  network:"Connection unavailable. Check your internet connection and try again.",
  unauthorized:"Your session has expired. Sign in again.",
  forbidden:"Your staff role does not permit this action.",
  conflict:"This information changed. Refresh before making another change.",
  slot:"This appointment slot is no longer available. Choose another time.",
  invalid:"Check the required fields and correct any invalid values.",
  server:"We couldn't finish this request. Please try again.",
  noResults:"No matching records were found.",
  formHint:"Fields marked * are required."
 },
 "fa-AF":{
  loading:"در حال بارگیری معلومات کلینیک…",
  failed:"این بخش بارگیری نشد",retry:"دوباره کوشش کنید",
  network:"اتصال برقرار نیست. اینترنت را بررسی کرده و دوباره کوشش کنید.",
  unauthorized:"نشست شما پایان یافته است. دوباره وارد شوید.",
  forbidden:"نقش شما اجازهٔ این عمل را ندارد.",
  conflict:"این معلومات تغییر کرده است. پیش از تغییر دوباره صفحه را تازه کنید.",
  slot:"این وقت ملاقات دیگر موجود نیست. وقت دیگری انتخاب کنید.",
  invalid:"خانه‌های ضروری را بررسی و معلومات نادرست را اصلاح کنید.",
  server:"درخواست تکمیل نشد. دوباره کوشش کنید.",
  noResults:"هیچ نتیجهٔ مطابق پیدا نشد.",
  formHint:"خانه‌هایی که با * مشخص شده‌اند ضروری هستند."
 },
 "ps-AF":{
  loading:"د کلینیک معلومات پورته کېږي…",
  failed:"دا برخه پورته نه شوه",retry:"بیا هڅه وکړئ",
  network:"اړیکه نشته. انټرنټ وګورئ او بیا هڅه وکړئ.",
  unauthorized:"ستاسو ناسته پای ته رسېدلې ده. بیا ننوځئ.",
  forbidden:"ستاسې دندې ته د دې کار اجازه نشته.",
  conflict:"دا معلومات بدل شوي دي. تر بل بدلون مخکې پاڼه تازه کړئ.",
  slot:"دا د ملاقات وخت نور نشته. بل وخت وټاکئ.",
  invalid:"اړین ځایونه وګورئ او ناسم معلومات سم کړئ.",
  server:"غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.",
  noResults:"اړونده پایله ونه موندل شوه.",
  formHint:"د * نښه لرونکي ځایونه اړین دي."
 }
};
const errorKinds:Record<string,string>={
 NETWORK:"network",NETWORK_ERROR:"network",NETWORK_UNAVAILABLE:"network",
 FETCH_FAILED:"network",CONNECTION_ERROR:"network",REQUEST_TIMEOUT:"network",
 AUTH_REQUIRED:"unauthorized",UNAUTHORIZED:"unauthorized",SESSION_EXPIRED:"unauthorized",
 FORBIDDEN:"forbidden",NOT_ALLOWED:"forbidden",PERMISSION_DENIED:"forbidden",
 STALE_SERVICE_VERSION:"conflict",STALE_RESOURCE_REVISION:"conflict",
 STALE_SCHEDULE_VERSION:"conflict",STALE_APPOINTMENT_REVISION:"conflict",
 STALE_ENCOUNTER_REVISION:"conflict",STALE_INVOICE_REVISION:"conflict",
 CONFLICT:"conflict",REVISION_CONFLICT:"conflict",
 APPOINTMENT_SLOT_UNAVAILABLE:"slot",SLOT_UNAVAILABLE:"slot",
 INVALID_INPUT:"invalid",VALIDATION_ERROR:"invalid",INVALID_REQUEST:"invalid",
 BILLING_UNAVAILABLE:"server",SERVER_ERROR:"server"
};
export function clinicErrorText(raw:string,locale:Locale):string{
 const dictionary=words[locale]||words.en;
 // Never expose arbitrary server error text or PHI through a generic alert.
 // Unknown messages, including HTTP details, receive a safe translated fallback.
 const code=String(raw||"").trim().toUpperCase().replace(/[^A-Z0-9_]/g,"");
 return dictionary[errorKinds[code]||"server"];
}
export function useClinicFeedback(){
 const {locale}=usePreferences();
 const lang:Locale=locale==="en"||locale==="fa-AF"||locale==="ps-AF"?locale:"en";
 const t=(key:string)=>words[lang][key]||words.en[key]||key;
 return {lang,t,error:(raw:string)=>clinicErrorText(raw,lang)};
}
export function ClinicLoadingState({label,variant="rows",className=""}:{
 label:string;variant?:Variant;className?:string
}){
 const count=variant==="cards"?4:variant==="form"?3:5;
 return <div className={"clinic-ux-loading "+className} role="status"
  aria-live="polite" aria-busy="true" aria-label={label}>
  <span className="clinic-ux-loading-caption">
   <span className="clinic-ux-spinner" aria-hidden="true"/>{label}
  </span>
  <div className={"clinic-ux-skeleton clinic-ux-skeleton-"+variant} aria-hidden="true">
   {Array.from({length:count},(_,i)=><span key={i} className="clinic-ux-placeholder">
    <span/><span/></span>)}
  </div>
 </div>;
}
export function ClinicFailureState({title,message,onRetry,retryLabel,className=""}:{
 title:string;message:string;onRetry?:()=>void;retryLabel?:string;className?:string
}){
 return <section className={"clinic-ux-failure "+className} role="alert" aria-live="assertive">
  <span className="clinic-ux-failure-icon" aria-hidden="true">
   <CareIcon name="about" size={21}/></span>
  <div className="clinic-ux-failure-copy"><strong>{title}</strong><p>{message}</p></div>
  {onRetry&&<button type="button" className="btn btn-secondary"
   onClick={onRetry}><CareIcon name="activity" size={16}/>{retryLabel}</button>}
 </section>;
}
export function ClinicNoResults({text,help}:{text:string;help?:string}){
 return <div className="clinic-ux-no-results" role="status">
  <span className="clinic-ux-no-results-icon" aria-hidden="true">
   <CareIcon name="search" size={20}/></span>
  <p>{text}</p>{help&&<small>{help}</small>}
 </div>;
}
