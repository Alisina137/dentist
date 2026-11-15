"use client";

import React,{useEffect,useMemo,useState} from "react";
import {CareIcon,InlineAlert,usePreferences,type CareIconName} from "./index";

type Span=7|30|90;
type Trend={day:string;registrations:number;appointments:number;receiptsAfn:number;paidInvoices:number;supportTickets:number};
type Activity={action:string;outcome:string;subjectType:string;at:string};
type Summary={
 period:{days:Span;from:string;to:string;timezone:string;generatedAt:string};
 clinics:{total:number;verified:number;pending:number;needsInfo:number;registered:number;previousRegistered:number};
 dentists:{pending:number;verified:number};
 listings:{pending:number};
 reviews:{pending:number;reports:number;appeals:number};
 subscriptions:{active:number;trialing:number;awaitingPayments:number;paidInvoices:number;receiptsAfn:number;previousReceiptsAfn:number};
 appointments:{created:number;cancelled:number;previousCreated:number};
 support:{open:number;inProgress:number;waiting:number;highPriority:number;overdue:number;urgent:number;created:number;previousCreated:number};
 operations:{databaseResponsive:boolean;delayedOutbox:number;failedNotifications:number;pilotReleaseEnabled:boolean;caveat:string};
 trend:Trend[];activity:Activity[];privacy:string;
};
const WORDS:Record<string,Record<string,string>>={
 en:{
  title:"Platform overview",subtitle:"A clear view of platform activity, approvals and what needs attention.",
  eyebrow:"DANDANLINK · ADMINISTRATION",updated:"Updated",refresh:"Refresh",refreshing:"Updating…",
  span7:"7 days",span30:"30 days",span90:"90 days",period:"Reporting period",range:"Period",
  clinics:"Total clinics",verifiedClinics:"Verified clinics",activeSubs:"Active subscriptions",
  bookings:"Appointments created",receipts:"Confirmed subscription receipts",openSupport:"Open support requests",
  newClinics:"New clinics",priorPeriod:"vs previous period",trendNew:"New this period",
  verifiedNote:"Verified independently",trialSubs:"trial subscriptions",bookingCanceled:"cancelled",
  paidInvoices:"paid invoices",pendingPayments:"awaiting payments",
  actionTitle:"Action required",actionDescription:"Pending administrative work from the live platform queues.",
  viewAll:"View queue",queueClinics:"Clinic verification",queueDentists:"Dentist credentials",
  queueListings:"Listing approvals",queueReviews:"Reviews and reports",queuePayments:"Payment verification",
  queueSupport:"Support escalation",waitingClinic:"clinics awaiting information",
  reviewsBreakdown:"reviews · reports · appeals",supportBreakdown:"high priority · overdue 48h",
  clear:"All clear",priority:"Priority",trendTitle:"Platform activity",trendSubtitle:"Actual recorded events, grouped by Kabul calendar day.",
  trendClinics:"Registrations",trendBookings:"Appointments",trendSupport:"Support tickets",trendRevenue:"Receipts (AFN)",
  chartEmpty:"No recorded activity during this period.",chartTable:"View chart data table",
  chartDay:"Day",chartValue:"Value",financeNote:"Subscription payments confirmed by an administrator; excludes clinic-patient billing.",
  recentTitle:"Recent administrative activity",recentSubtitle:"Audit events without person, clinic or medical record identifiers.",
  noEvents:"No administrative events recorded in the last 30 days.",securityTitle:"Operational signals",
  securitySubtitle:"Direct checks from platform data; not a certificate of production readiness.",
  database:"Database connection",operational:"Responsive",
  delayed:"Delayed delivery events",failedNotices:"Failed booking notifications",
  pilot:"Pilot release",pilotBlocked:"Not approved",pilotLive:"Operator enabled",
  threshold:"Delivery events older than 15 minutes",alert:"Needs review",normal:"No backlog",
  safety:"Real-clinic production release remains subject to signed legal, clinical and infrastructure approvals.",
  visitSecurity:"Security",visitPilot:"Pilot readiness",visitAnalytics:"Detailed analytics",
  systemEvidence:"Readiness flags are operator attestations, not independently verified evidence.",
  privacy:"Metadata only. Patient charts, diagnoses, identity data and support messages are not included.",
  error:"Unable to load the dashboard.",retry:"Try again",denied:"Access requires a verified platform administrator and MFA.",
  loading:"Loading live platform metrics…",dataTime:"Kabul time",trendDifference:"Compared with the preceding equal-length period",
  noGrowth:"No prior baseline",records:"records",next:"Open",current:"Current period",
  statusSuccess:"Success",statusFailed:"Failed",more:"More details",metric0:"No cases"
 },
 "fa-AF":{
  title:"نمای کلی پلتفرم",subtitle:"وضعیت پلتفرم، تأییدها و کارهای مهم را در یک صفحه ببینید.",
  eyebrow:"دندان‌لینک · مدیریت",updated:"تازه‌شده",refresh:"تازه‌سازی",refreshing:"در حال تازه‌سازی…",
  span7:"۷ روز",span30:"۳۰ روز",span90:"۹۰ روز",period:"بازه گزارش",range:"دوره",
  clinics:"مجموع کلینیک‌ها",verifiedClinics:"کلینیک‌های تأییدشده",activeSubs:"اشتراک‌های فعال",
  bookings:"ملاقات‌های ثبت‌شده",receipts:"دریافت‌های تأییدشده اشتراک",openSupport:"درخواست‌های باز پشتیبانی",
  newClinics:"کلینیک‌های جدید",priorPeriod:"نسبت به دوره قبل",trendNew:"جدید در این دوره",
  verifiedNote:"تأیید مستقل",trialSubs:"اشتراک آزمایشی",bookingCanceled:"لغوشده",
  paidInvoices:"فاکتور پرداخت‌شده",pendingPayments:"پرداخت منتظر",
  actionTitle:"اقدام لازم",actionDescription:"کارهای معطل‌مانده واقعی در بخش مدیریت.",
  viewAll:"مشاهده فهرست",queueClinics:"تأیید کلینیک‌ها",queueDentists:"اسناد داکتران",
  queueListings:"تأیید آگهی‌ها",queueReviews:"نظرات و گزارش‌ها",queuePayments:"تأیید پرداخت‌ها",
  queueSupport:"رسیدگی عاجل پشتیبانی",waitingClinic:"کلینیک نیازمند معلومات",
  reviewsBreakdown:"نظر · گزارش · اعتراض",supportBreakdown:"اولویت بلند · بیشتر از ۴۸ ساعت",
  clear:"همه بررسی شده",priority:"اولویت",trendTitle:"فعالیت پلتفرم",
  trendSubtitle:"فعالیت‌های ثبت‌شده بر اساس تاریخ کابل.",trendClinics:"ثبت‌نام‌ها",
  trendBookings:"ملاقات‌ها",trendSupport:"پشتیبانی",trendRevenue:"دریافت‌ها (افغانی)",
  chartEmpty:"در این دوره فعالیتی ثبت نشده است.",chartTable:"نمایش جدول داده‌ها",
  chartDay:"روز",chartValue:"مقدار",financeNote:"پرداخت‌های اشتراک تأییدشده؛ بدون پرداخت مریضان به کلینیک.",
  recentTitle:"فعالیت‌های اخیر مدیران",
  recentSubtitle:"ثبت رویدادها بدون مشخصات اشخاص، کلینیک‌ها و اسناد صحی.",
  noEvents:"در ۳۰ روز گذشته فعالیت مدیریتی ثبت نشده است.",securityTitle:"وضعیت عملیاتی",
  securitySubtitle:"بررسی مستقیم معلومات پلتفرم؛ نه تأیید آمادگی نشر رسمی.",
  database:"اتصال دیتابیس",operational:"پاسخ‌گو",delayed:"رویدادهای تحویل با تأخیر",
  failedNotices:"اعلان‌های ناموفق ملاقات",pilot:"نشر آزمایشی",pilotBlocked:"تأیید نشده",
  pilotLive:"فعال‌شده توسط مسئول",threshold:"رویدادهای بیشتر از ۱۵ دقیقه",alert:"نیاز به بررسی",
  normal:"بدون مشکل",safety:"نشر واقعی تا تأیید کتبی حقوقی، طبی و زیرساختی مجاز نیست.",
  visitSecurity:"امنیت",visitPilot:"آمادگی آزمایشی",visitAnalytics:"تحلیل‌های بیشتر",
  systemEvidence:"تنظیمات مسئول، جایگزین اسناد تأیید مستقل نیست.",
  privacy:"فقط معلومات مجموعی؛ بدون چارت دندان، تشخیص، هویت مریض یا پیام پشتیبانی.",
  error:"داشبورد بارگیری نشد.",retry:"تلاش دوباره",
  denied:"دسترسی تنها برای مدیر تأییدشده با تأیید دومرحله‌ای است.",
  loading:"در حال بارگیری شاخص‌های واقعی…",dataTime:"به وقت کابل",
  trendDifference:"در مقایسه با دوره مشابه قبلی",noGrowth:"دوره قبلی بدون فعالیت",
  records:"مورد",next:"بازکردن",current:"دوره فعلی",statusSuccess:"موفق",
  statusFailed:"ناموفق",more:"جزئیات",metric0:"بدون مورد"
 },
 "ps-AF":{
  title:"د پلاتفورم عمومي کتنه",subtitle:"د پلاتفورم فعالیتونه، تاییدونه او اړین کارونه په یوه پاڼه کې وګورئ.",
  eyebrow:"دندان‌لینک · مدیریت",updated:"تازه شوی",refresh:"تازه کول",refreshing:"تازه کېږي…",
  span7:"۷ ورځې",span30:"۳۰ ورځې",span90:"۹۰ ورځې",period:"د راپور موده",range:"موده",
  clinics:"ټول کلینیکونه",verifiedClinics:"تایید شوي کلینیکونه",activeSubs:"فعال ګډونونه",
  bookings:"ثبت شوې لیدنې",receipts:"تایید شوي ګډون عواید",openSupport:"د ملاتړ پرانیستې غوښتنې",
  newClinics:"نوي کلینیکونه",priorPeriod:"د تېرې مودې پرتله",trendNew:"په دې موده کې نوي",
  verifiedNote:"خپلواک تایید",trialSubs:"ازمایښتي ګډونونه",bookingCanceled:"لغوه شوي",
  paidInvoices:"تادیه شوي بلونه",pendingPayments:"د تادیې منتظر",
  actionTitle:"اړین اقدام",actionDescription:"د ادارې له ژوندیو کتارونو پاتې کارونه.",
  viewAll:"کتار وګورئ",queueClinics:"د کلینیکونو تایید",queueDentists:"د ډاکټرانو اسناد",
  queueListings:"د اعلانونو تایید",queueReviews:"نظرونه او راپورونه",queuePayments:"د تادیې تایید",
  queueSupport:"بیړنی ملاتړ",waitingClinic:"د معلوماتو منتظر کلینیکونه",
  reviewsBreakdown:"نظر · راپور · غوښتنه",supportBreakdown:"لوړ لومړیتوب · له ۴۸ ساعتونو زاړه",
  clear:"ټول بشپړ",priority:"لومړیتوب",trendTitle:"د پلاتفورم فعالیت",
  trendSubtitle:"د کابل د ورځې له مخې ثبت شوې پېښې.",trendClinics:"نوي ثبتونه",
  trendBookings:"لیدنې",trendSupport:"ملاتړ",trendRevenue:"عواید (افغانۍ)",
  chartEmpty:"په دې موده کې فعالیت نشته.",chartTable:"د معلوماتو جدول وښایئ",
  chartDay:"ورځ",chartValue:"شمېر",financeNote:"یوازې تایید شوي ګډون عواید؛ د ناروغانو پیسې نه دي.",
  recentTitle:"وروستي اداري فعالیتونه",
  recentSubtitle:"د شخص، کلینیک یا طبي ریکارډ له پېژندنې پرته پېښې.",
  noEvents:"په وروستیو ۳۰ ورځو کې اداري پېښې نشته.",securityTitle:"عملیاتي وضعیت",
  securitySubtitle:"د سیسټم حقیقي شمېرې؛ د تولید د چمتووالي تصدیق نه دی.",
  database:"د ډیټابېس اړیکه",operational:"فعاله",delayed:"ځنډېدلې پېښې",
  failedNotices:"ناکامې خبرتیاوې",pilot:"ازمایښتي پیل",pilotBlocked:"نه دی تایید شوی",
  pilotLive:"د مسئول له خوا فعال",threshold:"له ۱۵ دقیقو زاړه کارونه",
  alert:"بیاکتنې ته اړتیا",normal:"ستونزه نشته",
  safety:"د حقیقي ناروغانو کارول تر قانوني، طبي او تخنیکي تایید پورې بند دي.",
  visitSecurity:"امنیت",visitPilot:"ازمایښتي چمتووالی",visitAnalytics:"نور تحلیلونه",
  systemEvidence:"د مسئول نښه د خپلواک تایید سند نه دی.",
  privacy:"یوازې مجموعي شمېرې؛ طبي ریکارډونه او د ناروغانو معلومات نشته.",
  error:"ډشبورډ نه خلاصیږي.",retry:"بیا هڅه",
  denied:"دا برخه د MFA تایید شوي پلاتفورم مدیر لپاره ده.",
  loading:"ریښتینې شمېرې بارېږي…",dataTime:"د کابل وخت",
  trendDifference:"د مخکینۍ ورته مودې په پرتله",noGrowth:"مخکینۍ موده تشه وه",
  records:"ریکارډونه",next:"پرانیستل",current:"اوسنۍ موده",statusSuccess:"بریالی",
  statusFailed:"ناکام",more:"نور معلومات",metric0:"هیڅ مورد نشته"
 }
};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
function delta(now:number,previous:number,t:(key:string)=>string,format:(n:number)=>string){
 if(previous===0)return now===0?"—":t("noGrowth");
 const change=(now-previous)/previous*100;
 return (change>0?"+":"")+format(Math.round(change))+"%";
}
function chartDate(day:string,lang:string,calendar:string){
 return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  month:"short",day:"numeric"}).format(new Date(day+"T12:00:00Z"));
}
function eventLabel(action:string){
 // Only safe action metadata arrives from the server; never interpret subject IDs.
 return action.replace(/[._]/g," ").replace(/\s+/g," ").trim();
}
function Kpi({label,value,detail,icon,href,deltaText,format}:{
 label:string;value:number|string;detail:string;icon:CareIconName;
 href:string;deltaText?:string;format:(value:number)=>string;
}){
 return <a href={href} className="adm-b-kpi">
  <span className="adm-b-kpi-icon"><CareIcon name={icon} size={21}/></span>
  <span className="adm-b-kpi-label">{label}</span>
  <strong className="adm-b-kpi-value" dir="auto">{typeof value==="number"?format(value):value}</strong>
  <span className="adm-b-kpi-detail">{detail}</span>
  {deltaText&&<span className="adm-b-kpi-delta">{deltaText}</span>}
  <span className="adm-b-kpi-arrow" aria-hidden="true"><CareIcon name="chevron" size={16}/></span>
 </a>;
}
function TrendChart({data,metric,locale,calendar,format,empty,tableLabel,dayLabel,valueLabel}:{
 data:Trend[];metric:keyof Pick<Trend,"registrations"|"appointments"|"supportTickets"|"receiptsAfn">;
 locale:string;calendar:string;format:(n:number)=>string;
 empty:string;tableLabel:string;dayLabel:string;valueLabel:string;
}){
 const values=data.map(x=>x[metric]);
 const maximum=Math.max(1,...values);
 const area={x:48,y:20,w:778,h:157};
 const points=values.map((v,i)=>({
  x:area.x+(data.length<=1?area.w/2:i*area.w/(data.length-1)),
  y:area.y+area.h-(v/maximum)*area.h
 }));
 const path=points.map((point,i)=>(i===0?"M":"L")+point.x.toFixed(2)+","+point.y.toFixed(2)).join(" ");
 const filled=path+" L"+points.at(-1)?.x.toFixed(2)+","+(area.y+area.h)+" L"+
  points[0]?.x.toFixed(2)+","+(area.y+area.h)+" Z";
 const ticks=[0,1,2,3].map(i=>({y:area.y+area.h*i/3,value:maximum*(3-i)/3}));
 const labelIndices=Array.from(new Set([0,Math.floor((data.length-1)/3),Math.floor(2*(data.length-1)/3),data.length-1]));
 const allZero=values.every(x=>x===0);
 return <div className="adm-b-chart-area">
  <svg viewBox="0 0 850 214" role="img" aria-label={valueLabel+": "+format(values.reduce((a,b)=>a+b,0))+
   ". "+data.length+" "+dayLabel+". "+(allZero?empty:"")} preserveAspectRatio="xMidYMid meet">
   <defs><linearGradient id="adminBTrendGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#0a8391" stopOpacity=".2"/>
    <stop offset="100%" stopColor="#0a8391" stopOpacity="0"/>
   </linearGradient></defs>
   {ticks.map((tick,i)=><g key={i}>
    <line x1={area.x} y1={tick.y} x2={area.x+area.w} y2={tick.y} stroke="#dfebef" strokeDasharray={i===3?"0":"3 5"}/>
    <text x={area.x-8} y={tick.y+4} textAnchor="end" fill="#597483" fontSize="11">{format(Math.round(tick.value))}</text>
   </g>)}
   {!allZero&&<><path d={filled} fill="url(#adminBTrendGradient)"/>
    <path d={path} fill="none" stroke="#0a8391" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>}
   {labelIndices.map(index=><text key={index}
    x={points[index].x} y="202" textAnchor={index===0?"start":index===data.length-1?"end":"middle"}
    fontSize="11" fill="#597483">{chartDate(data[index].day,locale,calendar)}</text>)}
  </svg>
  {allZero&&<p className="adm-b-chart-empty">{empty}</p>}
  <details className="adm-b-chart-details"><summary>{tableLabel}</summary>
   <div className="adm-b-table-wrap"><table><thead><tr><th>{dayLabel}</th><th>{valueLabel}</th></tr></thead>
    <tbody>{data.map(point=><tr key={point.day}><td>{chartDate(point.day,locale,calendar)}</td>
     <td dir="ltr">{format(point[metric])}</td></tr>)}</tbody></table></div>
  </details>
 </div>;
}
export function AdminDashboardPortal(){
 const {locale,calendar}=usePreferences(),lang=locale in WORDS?locale:"en";
 const t=(key:string)=>WORDS[lang]?.[key]||WORDS.en[key]||key;
 const fmt=(value:number)=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(value);
 const [days,setDays]=useState<Span>(30),[reload,setReload]=useState(0);
 const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(true);
 const [metric,setMetric]=useState<"registrations"|"appointments"|"supportTickets"|"receiptsAfn">("appointments");
 useEffect(()=>{
  const handle=setInterval(()=>{if(document.visibilityState==="visible")setReload(x=>x+1);},120000);
  return()=>clearInterval(handle);
 },[]);
 useEffect(()=>{
  let live=true;
  const controller=new AbortController();
  setBusy(true);setError("");
  fetch(API+"/v1/insights/platform/dashboard?days="+days,{
   credentials:"include",cache:"no-store",signal:controller.signal
  }).then(async response=>{
   const result=await response.json().catch(()=>({})) as Summary&{code?:string};
   if(!response.ok)throw new Error(result.code||"DASHBOARD_UNAVAILABLE");
   return result;
  }).then(result=>{if(live)setData(result);})
   .catch(e=>{if(live&&!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(live)setBusy(false);});
  return()=>{live=false;controller.abort();};
 },[days,reload]);
 const kpis=useMemo(()=>{
  if(!data)return [];
  return [
   {key:"clinics",icon:"clinic" as CareIconName,value:data.clinics.total,
    detail:fmt(data.clinics.registered)+" "+t("trendNew"),href:"/admin/clinics?status=all",
    growth:delta(data.clinics.registered,data.clinics.previousRegistered,t,fmt)},
   {key:"verifiedClinics",icon:"shield" as CareIconName,value:data.clinics.verified,
    detail:t("verifiedNote"),href:"/admin/clinics?status=approved"},
   {key:"activeSubs",icon:"receipt" as CareIconName,value:data.subscriptions.active,
    detail:fmt(data.subscriptions.trialing)+" "+t("trialSubs"),href:"/admin/subscriptions"},
   {key:"bookings",icon:"calendar" as CareIconName,value:data.appointments.created,
    detail:fmt(data.appointments.cancelled)+" "+t("bookingCanceled"),href:"/admin/analytics",
    growth:delta(data.appointments.created,data.appointments.previousCreated,t,fmt)},
   {key:"receipts",icon:"chart" as CareIconName,value:data.subscriptions.receiptsAfn,
    detail:"AFN · "+fmt(data.subscriptions.paidInvoices)+" "+t("paidInvoices"),href:"/admin/subscriptions",
    growth:delta(data.subscriptions.receiptsAfn,data.subscriptions.previousReceiptsAfn,t,fmt)},
   {key:"openSupport",icon:"mail" as CareIconName,value:data.support.open+data.support.inProgress,
    detail:fmt(data.support.highPriority)+" "+t("priority"),href:"/admin/support?status=open"}
  ];
 },[data,lang]);
 if(!data&&busy)return <section className="adm-b-loading admin-page-loading" role="status" aria-label={t("loading")}>
  <div className="admin-loading-line admin-loading-heading"/>
  <div className="admin-loading-grid">{Array.from({length:6},(_,i)=><div className="admin-loading-card" key={i}/>)}</div>
  <div className="admin-loading-card admin-loading-wide"/></section>;
 if(!data)return <section className="adm-b-dashboard"><InlineAlert kind="error">{t("error")} {error==="ADMIN_DENIED"||error==="MFA_REQUIRED"?t("denied"):error}</InlineAlert>
  <button type="button" className="btn btn-secondary" onClick={()=>setReload(x=>x+1)}>{t("retry")}</button></section>;
 const actionRows=[
  {key:"queueClinics",count:data.clinics.pending,secondary:fmt(data.clinics.needsInfo)+" "+t("waitingClinic"),
   href:"/admin/clinics?status=pending",icon:"clinic" as CareIconName},
  {key:"queueDentists",count:data.dentists.pending,secondary:"",href:"/admin/dentists?status=pending",icon:"dental" as CareIconName},
  {key:"queueListings",count:data.listings.pending,secondary:"",href:"/admin/listings?status=pending",icon:"layers" as CareIconName},
  {key:"queueReviews",count:data.reviews.pending+data.reviews.reports+data.reviews.appeals,
   secondary:[data.reviews.pending,data.reviews.reports,data.reviews.appeals].map(fmt).join(" · ")+" "+t("reviewsBreakdown"),
   href:"/admin/reviews",icon:"star" as CareIconName},
  {key:"queuePayments",count:data.subscriptions.awaitingPayments,secondary:"",href:"/admin/subscriptions",icon:"receipt" as CareIconName},
  {key:"queueSupport",count:data.support.urgent,secondary:fmt(data.support.highPriority)+" · "+
   fmt(data.support.overdue)+" "+t("supportBreakdown"),href:"/admin/support?status=open",icon:"mail" as CareIconName}
 ];
 const metrics=[
  {key:"appointments" as const,title:"trendBookings"},
  {key:"registrations" as const,title:"trendClinics"},
  {key:"supportTickets" as const,title:"trendSupport"},
  {key:"receiptsAfn" as const,title:"trendRevenue"}
 ];
 const stamp=new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",dateStyle:"medium",timeStyle:"short"})
  .format(new Date(data.period.generatedAt));
 return <div className="adm-b-dashboard">
  <section className="adm-b-intro">
   <div className="adm-b-intro-copy"><span className="adm-b-eyebrow">{t("eyebrow")}</span>
    <h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
   <div className="adm-b-toolbar">
    <div className="adm-b-period" role="group" aria-label={t("period")}>
     {([7,30,90] as const).map(span=><button type="button" key={span} disabled={busy&&days===span}
      aria-pressed={days===span} onClick={()=>setDays(span)}>{t("span"+span)}</button>)}
    </div>
    <button type="button" className="btn btn-secondary adm-b-refresh" onClick={()=>setReload(x=>x+1)}
     disabled={busy}><CareIcon name="activity" size={17}/>{busy?t("refreshing"):t("refresh")}</button>
   </div>
  </section>
  <div className="adm-b-meta"><span><CareIcon name="clock" size={15}/>{t("updated")}: <time>{stamp}</time> · {t("dataTime")}</span>
   <span>{t("current")}: <time dir="ltr">{data.period.from} — {data.period.to}</time></span></div>
  {error&&<InlineAlert kind="warning">{t("error")} {error}</InlineAlert>}
  <section aria-label={t("title")} className="adm-b-kpis">
   {kpis.map(k=><Kpi key={k.key} label={t(k.key)} value={k.value} detail={k.detail}
    href={k.href} icon={k.icon} format={fmt} deltaText={k.growth?`${k.growth} · ${t("priorPeriod")}`:undefined}/>)}
  </section>
  <section className="adm-b-main-grid">
   <article className="adm-b-panel adm-b-actions">
    <header className="adm-b-panel-head"><div><h2>{t("actionTitle")}</h2><p>{t("actionDescription")}</p></div>
     <span className="adm-b-panel-badge">{actionRows.filter(x=>x.count>0).length}</span>
    </header>
    <div className="adm-b-queue-list">
     {actionRows.map(item=><a className="adm-b-queue-row" href={item.href} key={item.key}>
      <span className="adm-b-queue-icon"><CareIcon name={item.icon} size={18}/></span>
      <span className="adm-b-queue-copy"><strong>{t(item.key)}</strong>
       <small>{item.secondary|| (item.count===0?t("clear"):fmt(item.count)+" "+t("records"))}</small></span>
      <span className={"adm-b-queue-count"+(item.count>0?" has-work":"")}>{fmt(item.count)}</span>
      <span className="adm-b-row-arrow" aria-hidden="true"><CareIcon name="chevron" size={16}/></span>
     </a>)}
    </div>
   </article>
   <article className="adm-b-panel adm-b-chart-panel">
    <header className="adm-b-panel-head"><div><h2>{t("trendTitle")}</h2>
     <p>{t("trendSubtitle")}</p></div><a className="adm-b-secondary-link" href="/admin/analytics">
     {t("visitAnalytics")} <CareIcon name="arrow" size={15}/></a></header>
    <div className="adm-b-chart-tabs" role="group" aria-label={t("trendTitle")}>
     {metrics.map(item=><button key={item.key} type="button" aria-pressed={metric===item.key}
      onClick={()=>setMetric(item.key)}>{t(item.title)}</button>)}
    </div>
    <TrendChart data={data.trend} metric={metric} locale={lang} calendar={calendar}
     format={fmt} empty={t("chartEmpty")} tableLabel={t("chartTable")}
     dayLabel={t("chartDay")} valueLabel={t(metrics.find(x=>x.key===metric)!.title)}/>
    <p className="adm-b-caption">{metric==="receiptsAfn"?t("financeNote"):t("trendDifference")}</p>
   </article>
  </section>
  <section className="adm-b-lower-grid">
   <article className="adm-b-panel">
    <header className="adm-b-panel-head"><div><h2>{t("recentTitle")}</h2><p>{t("recentSubtitle")}</p></div></header>
    {data.activity.length===0?<p className="adm-b-empty">{t("noEvents")}</p>:
     <ol className="adm-b-activity-list">{data.activity.map((item,i)=><li key={item.at+"-"+i}>
      <span className={"adm-b-activity-dot"+(item.outcome!=="success"?" warning":"")}/>
      <div><strong>{eventLabel(item.action)}</strong>
       <span>{item.outcome==="success"?t("statusSuccess"):t("statusFailed")}</span></div>
      <time dir="auto">{new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",dateStyle:"medium",timeStyle:"short"})
       .format(new Date(item.at))}</time></li>)}</ol>}
   </article>
   <article className="adm-b-panel">
    <header className="adm-b-panel-head"><div><h2>{t("securityTitle")}</h2><p>{t("securitySubtitle")}</p></div></header>
    <div className="adm-b-health-list">
     {[
      {key:"database",value:data.operations.databaseResponsive?t("operational"):t("alert"),
       warning:!data.operations.databaseResponsive},
      {key:"delayed",value:fmt(data.operations.delayedOutbox),warning:data.operations.delayedOutbox>0},
      {key:"failedNotices",value:fmt(data.operations.failedNotifications),warning:data.operations.failedNotifications>0},
      {key:"pilot",value:data.operations.pilotReleaseEnabled?t("pilotLive"):t("pilotBlocked"),
       warning:!data.operations.pilotReleaseEnabled}
     ].map(item=><div className="adm-b-health-row" key={item.key}>
      <span><i className={item.warning?"adm-b-led is-warning":"adm-b-led"}/>{t(item.key)}</span>
      <strong className={item.warning?"adm-b-health-attention":""}>{item.value}</strong>
     </div>)}
    </div>
    <p className="adm-b-health-notice"><CareIcon name="shield" size={17}/>{t("safety")}</p>
    <nav className="adm-b-footer-links" aria-label={t("securityTitle")}><a href="/admin/security">{t("visitSecurity")}</a>
     <a href="/admin/pilot">{t("visitPilot")}</a></nav>
   </article>
  </section>
  <p className="adm-b-privacy"><CareIcon name="shield" size={16}/>{t("privacy")}</p>
 </div>;
}
