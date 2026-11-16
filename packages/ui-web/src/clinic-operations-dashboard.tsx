"use client";
import React,{useEffect,useState} from "react";
import {CareIcon,InlineAlert,usePreferences} from "./index";
import {ClinicSectionHeading,ClinicMetricValue,ClinicEmptyState} from "./clinic-primitives";
import {clinicErrorText} from "./clinic-feedback";
import {ClinicDashboardSnapshot,ClinicDashboardInsights,clinicReportWindow,
 type ClinicInsights} from "./clinic-command-widgets";

type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;
 membershipId:string;role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Lang="en"|"fa-AF"|"ps-AF";
type Appointments={today:string;todayTotal:number;weekTotal:number;timezone:string;
 counts:{confirmed:number;arrived:number;in_treatment:number;completed:number;no_show:number};
 upcoming:{id:string;startAt:string;serviceName:string;status:string}[]};
type Patients={counts:{active:number;inactive:number;archived:number};total:number};
type BookingRequests={requests:{id:string}[];filter:"pending"};
type Operations={timezone:string;metrics:{services:number;chairs:number;openDays:number;scheduledDentists:number};
 checklist:{key:string;done:boolean}[];readyForPreview:boolean};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const copy:Record<Lang,Record<string,string>>={
 en:{
  title:"Clinic command center",eyebrow:"CLINIC OPERATIONS",intro:"One place to manage today's care, staff and readiness.",
  bookingPending:"Pending online requests",noBookingPending:"No new booking requests.",atLeast:"At least",
  owner:"Clinic owner",manager:"Clinic manager",dentist:"Dentist",receptionist:"Receptionist",assistant:"Dental assistant",cashier:"Cashier",
  overview:"Today's schedule",today:"Appointments today",confirmed:"Confirmed",arrived:"Arrived",
  in_treatment:"In treatment",completed:"Completed",no_show:"No-shows",week:"Next 7 days",
  patients:"Patient directory",totalPatients:"Patient records",activePatients:"Active records",
  inactive:"Inactive",archived:"Archived",readiness:"Operational readiness",
  service:"Services & pricing",chair:"Treatment resources",clinicHours:"Opening hours",
  dentistHours:"Dentist shifts",ready:"Configured",needsSetup:"Needs attention",
  setupBody:"These checks reflect live clinic configuration, not clinical or legal approval.",
  quick:"Quick actions",recent:"Coming up",noUpcoming:"No confirmed appointments in the next seven days.",
  timezone:"Times are displayed in Afghanistan time.",refresh:"Refresh live data",
  loading:"Loading live data…",retry:"Retry",error:"Could not load this information.",
  unconfigured:"Open a section to complete the setup.",status:"Clinic verification",
  setup:"Clinic registration",subscription:"Subscription",appointments:"Appointments",
  queue:"Today's queue",newAppointment:"New appointment",patientsLink:"Patient directory",
  addPatient:"Add patient",staff:"Team and invitations",services:"Services",resources:"Chairs & rooms",
  hours:"Hours & holidays",clinical:"Clinical records",finance:"Finance",reports:"Reports",
  requests:"Online booking requests",listing:"Public listing",security:"Security & access",
  myProfile:"My membership",credentials:"My credentials",restricted:"Not available for your role.",
  workspaceRole:"Your workspace",statusNote:"Verification and subscription rules continue to apply before any sensitive change.",
  noFixtures:"All numbers come from your current clinic's API; no sample patient data is displayed.",
  draft:"Draft",pending:"Under review",needs_info:"More information required",approved:"Approved",
  suspended:"Suspended",rejected:"Rejected",missing:"Unconfirmed",
  checkSummary:"Configuration checklist",progress:"Checks complete"
 },
 "fa-AF":{
  title:"مرکز مدیریت کلینیک",eyebrow:"عملیات کلینیک",intro:"مدیریت نوبت‌های امروز، کارمندان و آمادگی در یک صفحه.",
  bookingPending:"درخواست‌های آنلاین در انتظار",noBookingPending:"درخواست تازه موجود نیست.",atLeast:"حداقل",
  owner:"مالک کلینیک",manager:"مدیر کلینیک",dentist:"داکتر دندان",receptionist:"پذیرش",assistant:"دستیار دندان",cashier:"حسابدار",
  overview:"تقویم امروز",today:"نوبت‌های امروز",confirmed:"تأییدشده",arrived:"حاضر",
  in_treatment:"در تداوی",completed:"تکمیل‌شده",no_show:"حاضرنشده",week:"هفت روز آینده",
  patients:"فهرست مریضان",totalPatients:"مریضان ثبت‌شده",activePatients:"سوابق فعال",
  inactive:"غیرفعال",archived:"آرشیف",readiness:"آمادگی عملیاتی",
  service:"خدمات و قیمت‌ها",chair:"چوکی‌ها و اتاق‌ها",clinicHours:"ساعات کاری",
  dentistHours:"شیفت‌های داکتران",ready:"تنظیم‌شده",needsSetup:"نیاز به تنظیم",
  setupBody:"این موارد از تنظیمات واقعی کلینیک اند؛ نه تأیید طبی یا حقوقی.",
  quick:"اقدام‌های سریع",recent:"نوبت‌های آینده",noUpcoming:"در هفت روز آینده نوبت تأییدشده نیست.",
  timezone:"ساعت‌ها به وقت افغانستان نمایش داده می‌شوند.",refresh:"تازه‌سازی معلومات",
  loading:"دریافت معلومات واقعی…",retry:"دوباره کوشش",error:"معلومات دریافت نشد.",
  unconfigured:"برای تکمیل به بخش مربوط بروید.",status:"تأیید کلینیک",
  setup:"ثبت کلینیک",subscription:"اشتراک",appointments:"نوبت‌ها",
  queue:"صف امروز",newAppointment:"ثبت نوبت",patientsLink:"فهرست مریضان",
  addPatient:"ثبت مریض",staff:"تیم و دعوت‌ها",services:"خدمات",resources:"چوکی‌ها و اتاق‌ها",
  hours:"ساعات و رخصتی‌ها",clinical:"سوابق کلینیکی",finance:"مالی",
  reports:"گزارش‌ها",requests:"درخواست‌های آنلاین",listing:"پروفایل عمومی",
  security:"امنیت و دسترسی",myProfile:"عضویت من",credentials:"اسناد مسلکی من",
  restricted:"برای نقش شما قابل دسترس نیست.",workspaceRole:"محیط کاری شما",
  statusNote:"قوانین تأیید و اشتراک پیش از هر تغییر حساس تطبیق می‌شوند.",
  noFixtures:"تمام ارقام از سرور کلینیک می‌آیند؛ معلومات نمونه نمایش داده نمی‌شوند.",
  draft:"پیش‌نویس",pending:"در انتظار بررسی",needs_info:"نیاز به معلومات",
  approved:"تأییدشده",suspended:"تعلیق‌شده",rejected:"ردشده",missing:"نامشخص",
  checkSummary:"فهرست بررسی تنظیمات",progress:"بخش تکمیل‌شده"
 },
 "ps-AF":{
  title:"د کلینیک د مدیریت مرکز",eyebrow:"د کلینیک چارې",
  intro:"د نن لیدنې، کارکوونکي او چمتووالی په یوه پاڼه کې وګورئ.",
  bookingPending:"ناڅېړل شوې آنلاین غوښتنې",noBookingPending:"نوې غوښتنې نشته.",atLeast:"لږ تر لږه",
  owner:"د کلینیک خاوند",manager:"د کلینیک مدیر",dentist:"د غاښونو ډاکټر",receptionist:"پذیرش",assistant:"د غاښونو مرستیال",cashier:"حسابدار",
  overview:"د نن مهالوېش",today:"د نن لیدنې",confirmed:"تایید شوي",
  arrived:"راغلي",in_treatment:"د درملنې لاندې",completed:"بشپړ شوي",
  no_show:"نه حاضر شوي",week:"راتلونکې اووه ورځې",
  patients:"د ناروغانو لېست",totalPatients:"د ناروغانو ریکارډونه",
  activePatients:"فعال ریکارډونه",inactive:"غیرفعال",archived:"آرشیف",
  readiness:"د کار چمتووالی",service:"خدمتونه او بیې",
  chair:"څوکۍ او خونې",clinicHours:"کاري ساعتونه",dentistHours:"د ډاکټرانو وختونه",
  ready:"چمتو",needsSetup:"سمون ته اړتیا",setupBody:"دا د کلینیک رښتینې امستنې دي؛ طبي او قانوني تایید نه دی.",
  quick:"چټکې کړنې",recent:"راتلونکې لیدنې",
  noUpcoming:"په راتلونکو اوو ورځو کې تایید شوې لیدنې نشته.",
  timezone:"وختونه د افغانستان په وخت ښودل کېږي.",refresh:"معلومات تازه کول",
  loading:"رښتیني معلومات بارېږي…",retry:"بیا هڅه",error:"معلومات ترلاسه نه شول.",
  unconfigured:"د جوړولو لپاره اړونده برخه پرانیزئ.",status:"د کلینیک تایید",
  setup:"د کلینیک ثبت",subscription:"ګډون",appointments:"لیدنې",queue:"د نن کتار",
  newAppointment:"نوې لیدنه",patientsLink:"د ناروغانو لېست",addPatient:"ناروغ زیاتول",
  staff:"کارکوونکي او بلنې",services:"خدمتونه",resources:"څوکۍ او خونې",
  hours:"ساعتونه او رخصتۍ",clinical:"کلینیکي ریکارډونه",finance:"مالي چارې",
  reports:"راپورونه",requests:"آنلاین غوښتنې",listing:"عامه پېژندنه",
  security:"امنیت او لاسرسی",myProfile:"زما غړیتوب",credentials:"زما اسناد",
  restricted:"ستاسې دندې ته دا برخه نشته.",workspaceRole:"ستاسې کاري برخه",
  statusNote:"د تایید او ګډون اصول د حساسو بدلونونو پر مهال هم پلي کېږي.",
  noFixtures:"ټولې شمېرې له سرور څخه اخېستل کېږي؛ نمونه معلومات نشته.",
  draft:"مسوده",pending:"تر څېړنې لاندې",needs_info:"نورو معلوماتو ته اړتیا",
  approved:"تایید شوی",suspended:"ځنډول شوی",rejected:"رد شوی",
  missing:"نامعلوم",checkSummary:"د چمتووالي لېست",progress:"بشپړ شوي برخې"
 }
};
function useLabels(){
 const {locale,calendar}=usePreferences();
 const lang=(locale in copy?locale:"en") as Lang;
 return {lang,calendar,t:(key:string)=>copy[lang][key]||copy.en[key]||key};
}
function useClinicRead<T>(path:string|null){
 // Associate every response with its requested path to avoid showing even one frame
 // of another clinic's private counts while a tenant selection is changing.
 const [state,setState]=useState<{path:string|null;data:T|null;error:string;loading:boolean}>({
  path,data:null,error:"",loading:!!path
 });
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!path){setState({path:null,data:null,error:"",loading:false});return;}
  const controller=new AbortController();
  setState({path,data:null,error:"",loading:true});
  const timer=setTimeout(()=>controller.abort(),10000);
  fetch(API+path,{credentials:"include",cache:"no-store",signal:controller.signal}).then(async res=>{
   const result=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(result.code||"NETWORK_UNAVAILABLE");
   if(!controller.signal.aborted)setState({path,data:result as T,error:"",loading:false});
  }).catch((error:unknown)=>{
   if(!controller.signal.aborted)setState({path,data:null,error:error instanceof Error?error.message:"NETWORK_UNAVAILABLE",loading:false});
  }).finally(()=>clearTimeout(timer));
  return ()=>{controller.abort();clearTimeout(timer)};
 },[path,revision]);
 return {data:state.path===path?state.data:null,
  error:state.path===path?state.error:"",
  loading:state.path===path?state.loading:!!path,
  refresh:()=>setRevision(x=>x+1)};
}
type SkeletonVariant="metrics"|"list"|"summary";
function PanelState({loading,error,retry,variant="summary"}:{loading:boolean;error:string;
 retry:()=>void;variant?:SkeletonVariant}){
 const {t,lang}=useLabels();
 if(loading)return <div className={"h-loading h-loading-"+variant} role="status"
  aria-live="polite" aria-label={t("loading")}>
  <span className="h-loading-label"><span className="h-spinner" aria-hidden="true"/>{t("loading")}</span>
  {variant==="metrics"?<div className="h-skeleton-metrics" aria-hidden="true">
   {Array.from({length:6},(_,i)=><div className="h-skeleton-metric" key={i}>
    <span className="h-skeleton h-skeleton-label"/><span className="h-skeleton h-skeleton-value"/></div>)}
  </div>:variant==="list"?<div className="h-skeleton-list" aria-hidden="true">
   {Array.from({length:4},(_,i)=><div className="h-skeleton-row" key={i}>
    <span className="h-skeleton h-skeleton-icon"/><span className="h-skeleton h-skeleton-copy"/>
    <span className="h-skeleton h-skeleton-trailing"/></div>)}
  </div>:<div className="h-skeleton-summary" aria-hidden="true">
   <span className="h-skeleton h-skeleton-wide"/><span className="h-skeleton h-skeleton-short"/>
  </div>}
 </div>;
 if(error)return <div className="h-error" role="alert"><span>{t("error")} <span>{clinicErrorText(error,lang)}</span></span>
  <button type="button" className="btn btn-secondary" onClick={retry}>{t("retry")}</button></div>;
 return null;
}
function DateText({iso}:{iso:string}){
 const {lang,calendar}=useLabels();
 const value=new Date(iso);
 if(!Number.isFinite(value.getTime()))return <span>—</span>;
 return <time dateTime={iso}>{new Intl.DateTimeFormat(lang,{
  timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"
 }).format(value)}</time>;
}
type Action={title:string;path:string;icon:"calendar"|"plus"|"users"|"clipboard"|"dental"|"receipt"|"chart"|"settings"|"shield"|"clock"|"clinic"|"file"|"account"|"mail"};
function actionsFor(space:Space):Action[]{
 const p=(route:string)=>route+"?clinic="+encodeURIComponent(space.clinicId);
 const isManager=space.role==="owner"||space.role==="manager";
 if(space.role==="cashier")return [
  {title:"finance",path:p("/clinic/finance"),icon:"receipt"},
  {title:"patientsLink",path:p("/clinic/patients"),icon:"users"},
  {title:"reports",path:p("/clinic/reports"),icon:"chart"},
  {title:"security",path:p("/clinic/settings/security"),icon:"shield"}
 ];
 if(space.role==="assistant")return [
  {title:"queue",path:p("/clinic/appointments/queue"),icon:"clock"},
  {title:"appointments",path:p("/clinic/appointments"),icon:"calendar"},
  {title:"clinical",path:p("/clinic/clinical"),icon:"dental"},
  {title:"myProfile",path:p("/clinic/staff/"+space.membershipId),icon:"account"}
 ];
 const actions:Action[]=[
  {title:"newAppointment",path:p("/clinic/appointments/new"),icon:"plus"},
  {title:"queue",path:p("/clinic/appointments/queue"),icon:"clock"},
  {title:"patientsLink",path:p("/clinic/patients"),icon:"users"},
  {title:"addPatient",path:p("/clinic/patients/new"),icon:"plus"},
  {title:"requests",path:p("/clinic/appointments/requests"),icon:"mail"}
 ];
 if(space.role==="dentist")actions.push(
  {title:"clinical",path:p("/clinic/clinical"),icon:"dental"},
  {title:"credentials",path:p("/clinic/credentials"),icon:"file"});
 if(isManager)actions.push(
  {title:"staff",path:p("/clinic/staff"),icon:"users"},
  {title:"services",path:p("/clinic/services"),icon:"clipboard"},
  {title:"hours",path:p("/clinic/settings/hours"),icon:"clock"},
  {title:"listing",path:p("/clinic/listing"),icon:"clinic"},
  {title:"finance",path:p("/clinic/finance"),icon:"receipt"},
  {title:"reports",path:p("/clinic/reports"),icon:"chart"});
 return actions;
}
export function ClinicOperationsOverview({ctx,space}:{ctx:Context;space:Space}){
 const {t,lang}=useLabels();
 const [insightDays,setInsightDays]=useState<7|30>(7);
 const canSchedule=space.role!=="cashier";
 const canSeeReports=["owner","manager","cashier"].includes(space.role);
 const canPatients=space.role!=="assistant";
 const canOperate=["owner","manager","dentist","receptionist"].includes(space.role);
 const canReadRequests=canOperate;
 const prefix=encodeURIComponent(space.clinicId);
 const appointments=useClinicRead<Appointments>(canSchedule?"/v1/appointments/clinics/"+prefix+"/overview":null);
 const patients=useClinicRead<Patients>(canPatients?"/v1/registry/clinics/"+prefix+"/patients/summary":null);
 const operations=useClinicRead<Operations>(canOperate?"/v1/operations/clinics/"+prefix+"/summary":null);
 const bookingRequests=useClinicRead<BookingRequests>(canReadRequests?
  "/v1/booking/clinics/"+prefix+"/requests?state=pending":null);
 const window=clinicReportWindow(insightDays);
 const insights=useClinicRead<ClinicInsights>(canSeeReports?
  "/v1/insights/clinics/"+prefix+"/report?from="+window.from+"&to="+window.to:null);
 const links=actionsFor(space);
 const checks=[
  {key:"service",label:"service",href:"/clinic/services"},
  {key:"chair",label:"chair",href:"/clinic/resources"},
  {key:"clinicHours",label:"clinicHours",href:"/clinic/settings/hours"},
  {key:"dentistHours",label:"dentistHours",href:"/clinic/settings/hours"}
 ];
 const completed=checks.filter(x=>operations.data?.checklist.some(row=>row.key===x.key&&row.done)).length;
 function refreshAll(){appointments.refresh();patients.refresh();operations.refresh();bookingRequests.refresh();}
 function refreshDashboard(){refreshAll();insights.refresh();}
 return <div className="h-clinic" lang={lang}>
  <header className="h-head">
   <div><span className="h-eyebrow"><CareIcon name="activity" size={17}/>{t("eyebrow")}</span>
    <h1>{t("title")}</h1><p>{t("intro")}</p>
    <div className="h-identity">
     <span><CareIcon name="clinic" size={16}/>{space.clinicName}</span>
     <span><CareIcon name="account" size={16}/>{t("workspaceRole")}: {t(space.role)}</span>
     <span className={"h-status h-"+(space.clinicStatus==="approved"?"approved":"pending")}>
      {t("status")}: {t(space.clinicStatus)||space.clinicStatus}</span>
    </div></div>
   <button className="btn btn-secondary h-refresh" onClick={refreshDashboard} type="button">
    <CareIcon name="activity" size={17}/>{t("refresh")}</button>
  </header>
  {space.clinicStatus!=="approved"&&<div className="h-warning" role="status">
   <CareIcon name="shield" size={19}/><div><strong>{t("status")}: {t(space.clinicStatus)}</strong>
    <p>{t("statusNote")}</p></div>
   {space.role==="owner"&&<a className="btn btn-secondary" href={"/clinic/onboarding?clinic="+prefix}>
    {t("setup")}</a>}</div>}
  <ClinicDashboardSnapshot role={space.role} clinicId={space.clinicId}
   clinicStatus={space.clinicStatus} lang={lang}
   schedule={appointments} patients={patients} requests={bookingRequests}
   operations={operations} insights={insights}/>
  <section className="h-primary" aria-label={t("overview")}>
   {canSchedule&&<div className="h-card h-schedule">
    <ClinicSectionHeading icon="calendar" eyebrow={t("overview")} title={t("today")}
     actionLabel={t("appointments")} actionHref={"/clinic/appointments?clinic="+prefix}/>
    <PanelState loading={appointments.loading} error={appointments.error} retry={appointments.refresh} variant="metrics"/>
    {appointments.data&&<div className="h-metrics">
     {([{key:"todayTotal",label:"today"},{key:"confirmed",label:"confirmed"},
       {key:"arrived",label:"arrived"},{key:"in_treatment",label:"in_treatment"},
       {key:"completed",label:"completed"},{key:"no_show",label:"no_show"}] as const).map(item=>
      <div className="h-metric" key={item.key}><span>{t(item.label)}</span>
       <ClinicMetricValue value={item.key==="todayTotal"?appointments.data!.todayTotal:appointments.data!.counts[item.key]}/></div>)}
     <div className="h-metric h-week"><span>{t("week")}</span><ClinicMetricValue value={appointments.data.weekTotal}/></div>
    </div>}
   </div>}
   {canPatients&&<div className="h-card h-patients">
    <ClinicSectionHeading icon="users" eyebrow={t("patients")} title={t("totalPatients")}
     actionLabel={t("patientsLink")} actionHref={"/clinic/patients?clinic="+prefix}/>
    <PanelState loading={patients.loading} error={patients.error} retry={patients.refresh} variant="metrics"/>
    {patients.data&&<div className="h-metrics">
     <div className="h-metric h-main-metric"><span>{t("totalPatients")}</span><ClinicMetricValue value={patients.data.total}/></div>
     <div className="h-metric"><span>{t("activePatients")}</span><ClinicMetricValue value={patients.data.counts.active}/></div>
     <div className="h-metric"><span>{t("inactive")}</span><ClinicMetricValue value={patients.data.counts.inactive}/></div>
     <div className="h-metric"><span>{t("archived")}</span><ClinicMetricValue value={patients.data.counts.archived}/></div>
    </div>}
   </div>}
  </section>
  {canSeeReports&&<ClinicDashboardInsights clinicId={space.clinicId} lang={lang}
   days={insightDays} onDaysChange={setInsightDays} read={insights}/>}
  <div className="h-layout">
   <section className="h-card h-shortcuts">
    <div className="h-card-heading"><div><span className="h-kicker"><CareIcon name="rocket" size={16}/>{t("quick")}</span>
     <h2>{t("quick")}</h2></div></div>
    <div className="h-action-grid">
     {links.map(a=><a key={a.path} href={a.path} className="h-action">
      <span className="h-action-icon"><CareIcon name={a.icon} size={20}/></span>
      <span>{t(a.title)}</span><CareIcon name="chevron" size={15}/>
     </a>)}
     {space.role==="owner"&&<><a href={"/clinic/onboarding?clinic="+prefix} className="h-action">
      <span className="h-action-icon"><CareIcon name="clinic" size={20}/></span>
      <span>{t("setup")}</span><CareIcon name="chevron" size={15}/></a>
      <a href={"/clinic/settings/subscription?clinic="+prefix} className="h-action">
       <span className="h-action-icon"><CareIcon name="receipt" size={20}/></span>
       <span>{t("subscription")}</span><CareIcon name="chevron" size={15}/></a></>}
    </div>
   </section>
   <div className="h-stack">
    {canReadRequests&&<section className="h-card h-online-requests">
      <div className="h-card-heading"><div><span className="h-kicker">
       <CareIcon name="bell" size={16}/>{t("requests")}</span>
       <h2>{t("bookingPending")}</h2></div>
       <a className="h-more" href={"/clinic/appointments/requests?clinic="+prefix}>
        {t("requests")} <CareIcon name="arrow" size={16}/></a></div>
      <PanelState loading={bookingRequests.loading} error={bookingRequests.error} retry={bookingRequests.refresh} variant="summary"/>
      {bookingRequests.data&&<div className="h-request-count">
       <strong>{bookingRequests.data.requests.length===100?t("atLeast")+" 100":bookingRequests.data.requests.length}</strong>
       <span>{bookingRequests.data.requests.length? t("bookingPending"):t("noBookingPending")}</span>
      </div>}
     </section>}
    {canOperate&&<section className="h-card">
     <div className="h-card-heading"><div><span className="h-kicker"><CareIcon name="shield-check" size={16}/>{t("readiness")}</span>
      <h2>{t("checkSummary")}</h2></div>
      {operations.data&&<span className="h-progress">{completed}/{checks.length} {t("progress")}</span>}</div>
     <p className="h-help">{t("setupBody")}</p>
     <PanelState loading={operations.loading} error={operations.error} retry={operations.refresh} variant="list"/>
     {operations.data&&<><div className="h-progressbar" role="progressbar" aria-label={t("progress")}
      aria-valuemin={0} aria-valuemax={4} aria-valuenow={completed}>
      <span style={{width:(completed/4*100)+"%"}}/></div>
      <div className="h-checklist">{checks.map(item=>{
       const ok=Boolean(operations.data?.checklist.find(x=>x.key===item.key)?.done);
       return <a key={item.key} href={item.href+"?clinic="+prefix} className="h-check">
        <span className={ok?"h-check-icon done":"h-check-icon"}><CareIcon name={ok?"check":"plus"} size={16}/></span>
        <span><strong>{t(item.label)}</strong><small>{t(ok?"ready":"needsSetup")}</small></span>
        <CareIcon name="chevron" size={15}/></a>;
      })}</div></>}
    </section>}
    {canSchedule&&<section className="h-card">
     <div className="h-card-heading"><div><span className="h-kicker"><CareIcon name="clock" size={16}/>{t("recent")}</span>
      <h2>{t("recent")}</h2></div><a className="h-more" href={"/clinic/appointments?clinic="+prefix}>
       {t("appointments")} <CareIcon name="arrow" size={16}/></a></div>
     <PanelState loading={appointments.loading} error={appointments.error} retry={appointments.refresh} variant="list"/>
     {appointments.data&&(appointments.data.upcoming.length?<div className="h-upcoming">
      {appointments.data.upcoming.map((a,i)=><a key={a.id||i} className="h-upcoming-row"
       href={"/clinic/appointments/"+encodeURIComponent(a.id)+"?clinic="+prefix}>
        <span className="h-upcoming-icon"><CareIcon name="calendar" size={18}/></span>
        <span className="h-upcoming-details"><strong>{a.serviceName||t("appointments")}</strong>
         <small><DateText iso={a.startAt}/></small></span>
        <span className="h-status h-approved">{t("confirmed")}</span>
       </a>)}</div>:<ClinicEmptyState message={t("noUpcoming")} icon="calendar"/>)}
     <p className="h-help">{t("timezone")}</p>
    </section>}
   </div>
  </div>
  <p className="h-disclaimer"><CareIcon name="shield" size={15}/>{t("noFixtures")}</p>
 </div>;
}
