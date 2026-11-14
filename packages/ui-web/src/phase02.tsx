
"use client";
import React, { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authClient, AccountStatus, InlineAlert, usePreferences, LocaleControls } from "./index";
import { AdminModerationPortal } from "./phase12";
import {ReviewModerationPage} from "./phase17";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
async function send(path:string,method="GET",body?:unknown):Promise<any> {
  const response=await fetch(API+"/v1"+path,{
    method,credentials:"include",cache:"no-store",
    headers:body===undefined?{}:{"Content-Type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.code||"NETWORK_ERROR");
  return result;
}
const words:Record<string,Record<string,string>>={
 en:{
  dentists:"Dentist Verification",listings:"Marketplace Listings",reviews:"Patient Reviews",
  appointments:"Appointments",clinicQueue:"Patient queue",bookingToday:"Today’s bookings",bookingArrived:"Arrived",bookingActive:"In treatment",bookingCompleted:"Completed",bookingPreview:"Appointments are real and synchronized across the clinic calendar and queue.",newAppointment:"New appointment",operations:"Operations",management:"Management",workspace:"Workspace",staffWorkspace:"Staff & Resources",services:"Services & Pricing",resources:"Chairs & Rooms",hours:"Hours & Holidays",opsReady:"Operational readiness",opsHint:"Configure real services, clinic resources, provider hours and test candidate slots.",setupComplete:"Complete",setupMissing:"Needs setup",stepService:"Service catalog",stepChair:"Treatment chair",stepHours:"Opening hours",stepDoctor:"Dentist shifts",patients:"Patients",search:"Search clinics",filter:"Search",dashboard:"Dashboard",clinics:"Clinics",clinic:"Clinic",onboarding:"Clinic setup",settings:"Clinic settings",
  subscription:"Subscription",subscriptions:"Subscriptions",plans:"Plans",overview:"Overview",verification:"Verification",
  newClinic:"Register a clinic",continue:"Continue",save:"Save draft",back:"Back",submit:"Submit for review",
  organization:"Organization",choosePlan:"Choose plan",review:"Review & submit",legalName:"Registered clinic name",
  displayName:"Public display name",clinicType:"Clinic type",solo:"Solo dentist",office:"Dental office",
  specialty:"Specialty center",province:"Province",city:"City",district:"District / neighborhood",
  address:"Street or descriptive address",phone:"Clinic phone",email:"Clinic email",
  license:"License / registration number (optional)",plan:"Subscription plan",period:"Billing period",
  monthly:"Monthly",annual:"Annual",price:"Price",staff:"Staff capacity",branches:"Branches",
  trial:"Trial days",grace:"Grace days",features:"Core management and appointment tools included",
  evidence:"Clinic license / registration document",fileHint:"PDF, PNG or JPG · maximum 2 MB · private to verification staff",
  upload:"Upload evidence",uploaded:"Uploaded documents",attest:"I confirm that these clinic details are accurate and I am authorized to register this office.",
  status:"Status",draft:"Draft",pending:"Pending review",needs_info:"Needs information",approved:"Approved",
  rejected:"Rejected",suspended:"Suspended",trialing:"Trialing",active:"Active",expired:"Expired",
  cancelled:"Cancelled",graceState:"Grace period",payment:"Payment",payments:"Manual payment requests",
  invoice:"Invoice",amount:"Amount (AFN)",reference:"Bank transfer / cash receipt reference",
  requestPayment:"Request manual verification",awaiting:"Awaiting review",paid:"Paid",void:"Rejected",
  reviewClinic:"Review clinic",history:"Decision history",reason:"Reason / review note",
  confirmName:"Type clinic name to confirm",approve:"Approve",askInfo:"Request information",
  reject:"Reject",suspend:"Suspend",reopen:"Reopen review",verifyPayment:"Confirm payment",
  rejectPayment:"Reject request",confirmReference:"Repeat submitted payment reference",
  planKey:"Plan tier",starter:"Starter",professional:"Professional",business:"Business",label:"Plan label",
  staffLimit:"Staff limit",branchLimit:"Branch limit",trialDays:"Trial (days)",graceDays:"Grace (days)",
  createPlan:"Publish new plan version",changePlan:"Change plan",update:"Update",deactivate:"Deactivate",
  activate:"Activate",chooseClinic:"Select clinic",noClinics:"No clinics created yet",
  noPlans:"No plans configured. A platform administrator must publish prices and capacity first.",
  noRecords:"Nothing to display",next:"Next",previous:"Previous",refresh:"Refresh",
  unsaved:"Save the updated clinic information to continue.",editing:"Changes to an approved clinic require renewed review.",
  noPayment:"No payment has been confirmed. Do not treat a request as paid.",returnHome:"Back to dashboard",
  operational:"Configure real services, chairs, clinic hours and dentist shifts in Operations.",
  verifiedNote:"Clinic approval does not publish a dentist listing or verify a dentist.",
  awaitingReview:"Your submission is awaiting human review. You can see the status here.",
  privacy:"Verification documents remain private and are accessed only by authorized reviewers.",
  titlePlans:"Manage versioned subscription plans",titleSubs:"Review subscriptions and payments",
  titleClinics:"Clinic verification queue",titleSettings:"Edit clinic information",
  titleDashboard:"Clinic overview",reviewer:"Reviewer",noSetup:"Start with your clinic registration.",
  preview:"Review the current plan price and billing period before requesting payment.",
  signout:"Sign out",failed:"Request failed",success:"Changes saved",loading:"Loading...",
  errorAuth:"Please sign in to access this workspace.",pendingOps:"Further office setup is not available until the next phase.",
  nextAction:"Next action",privacyGate:"Patient records are private clinic data; live scheduling and clinical encounters are not released yet."
 },
 "fa-AF":{
  dentists:"تأیید داکتران دندان",listings:"آگهی‌های کلینیک",
  appointments:"وقت‌های ملاقات",clinicQueue:"صف مریضان",bookingToday:"ملاقات‌های امروز",bookingArrived:"حاضر",bookingActive:"در تداوی",bookingCompleted:"تکمیل",bookingPreview:"ملاقات‌ها در تقویم و صف کلینیک ثبت و همزمان نشان داده می‌شوند.",newAppointment:"ثبت وقت جدید",operations:"عملیات",management:"مدیریت",workspace:"بخش اصلی",staffWorkspace:"کارمندان و منابع",services:"خدمات و قیمت‌ها",resources:"چوکی‌ها و اتاق‌ها",hours:"ساعات و رخصتی‌ها",opsReady:"آمادگی کلینیک",opsHint:"خدمات واقعی، منابع، ساعات کاری و شیفت داکتر را تنظیم کنید.",setupComplete:"تکمیل",setupMissing:"باقی",stepService:"خدمات",stepChair:"چوکی تداوی",stepHours:"ساعات کلینیک",stepDoctor:"شیفت داکتر",patients:"مریضان",search:"جستجوی کلینیک‌ها",filter:"جستجو",dashboard:"داشبورد",clinics:"کلینیک‌ها",clinic:"کلینیک",onboarding:"ثبت کلینیک",settings:"تنظیمات کلینیک",
  subscription:"اشتراک",subscriptions:"اشتراک‌ها",plans:"پلن‌ها",overview:"نمای کلی",verification:"تأیید",
  newClinic:"ثبت کلینیک جدید",continue:"ادامه",save:"ذخیره پیش‌نویس",back:"بازگشت",submit:"ارسال برای بررسی",
  organization:"معلومات کلینیک",choosePlan:"انتخاب پلن",review:"بررسی و ارسال",legalName:"نام رسمی کلینیک",
  displayName:"نام نمایشی",clinicType:"نوع کلینیک",solo:"داکتر مستقل",office:"کلینیک دندان",
  specialty:"مرکز تخصصی",province:"ولایت",city:"شهر",district:"ناحیه / محل",
  address:"آدرس تفصیلی",phone:"شماره تماس کلینیک",email:"ایمیل کلینیک",
  license:"شماره جواز (اختیاری)",plan:"پلن اشتراک",period:"دوره پرداخت",monthly:"ماهانه",annual:"سالانه",
  price:"قیمت",staff:"ظرفیت کارمندان",branches:"شعبه‌ها",trial:"روز آزمایشی",grace:"روز مهلت",
  features:"مدیریت اصلی و وقت‌دهی شامل است",evidence:"سند جواز / ثبت کلینیک",
  fileHint:"PDF، PNG یا JPG · حداکثر ۲ مگابایت · محرمانه",upload:"آپلود سند",uploaded:"اسناد ثبت‌شده",
  attest:"تأیید می‌کنم که معلومات درست است و صلاحیت ثبت کلینیک را دارم.",
  status:"وضعیت",draft:"پیش‌نویس",pending:"در انتظار بررسی",needs_info:"نیاز به معلومات",approved:"تأیید شده",
  rejected:"رد شده",suspended:"تعلیق شده",trialing:"آزمایشی",active:"فعال",expired:"منقضی",
  cancelled:"لغوشده",graceState:"مهلت",payment:"پرداخت",payments:"درخواست‌های پرداخت",
  invoice:"بل",amount:"مبلغ (افغانی)",reference:"شماره حواله / رسید نقدی",
  requestPayment:"درخواست بررسی پرداخت",awaiting:"در انتظار تأیید",paid:"پرداخت‌شده",void:"ردشده",
  reviewClinic:"بررسی کلینیک",history:"تاریخچه تصمیم‌ها",reason:"دلیل / یادداشت",
  confirmName:"برای تأیید، نام کلینیک را وارد کنید",approve:"تأیید",askInfo:"درخواست معلومات",
  reject:"رد",suspend:"تعلیق",reopen:"بررسی مجدد",verifyPayment:"تأیید پرداخت",
  rejectPayment:"رد درخواست",confirmReference:"شماره رسید را دوباره وارد کنید",
  planKey:"سطح پلن",starter:"ابتدایی",professional:"حرفه‌ای",business:"تجارتی",label:"نام پلن",
  staffLimit:"حد کارمندان",branchLimit:"حد شعبه‌ها",trialDays:"روز آزمایشی",graceDays:"روز مهلت",
  createPlan:"انتشار نسخه جدید پلن",changePlan:"تغییر پلن",update:"بروزرسانی",
  deactivate:"غیرفعال‌سازی",activate:"فعال‌سازی",chooseClinic:"انتخاب کلینیک",
  noClinics:"هنوز کلینیکی ثبت نشده",noPlans:"پلنی ثبت نشده؛ مدیر باید نخست قیمت و ظرفیت را مشخص کند.",
  noRecords:"موردی موجود نیست",next:"بعدی",previous:"قبلی",refresh:"تازه‌سازی",
  unsaved:"معلومات تغییر یافته را ذخیره کنید.",editing:"تغییر معلومات تأییدشده نیاز به بررسی مجدد دارد.",
  noPayment:"هیچ پرداختی هنوز تأیید نشده است.",returnHome:"بازگشت به داشبورد",
  operational:"خدمات، چوکی‌ها، ساعات و شیفت داکتر را از بخش عملیات تنظیم کنید.",
  verifiedNote:"تأیید کلینیک به‌معنی نشر عمومی یا تأیید داکتر نیست.",
  awaitingReview:"ثبت شما در انتظار بررسی انسانی است.",privacy:"اسناد تنها برای بررسی‌کنندگان مجاز قابل دسترسی است.",
  titlePlans:"مدیریت پلن‌های نسخه‌دار",titleSubs:"بررسی اشتراک‌ها و پرداخت‌ها",
  titleClinics:"صف بررسی کلینیک",titleSettings:"ویرایش معلومات کلینیک",titleDashboard:"نمای کلی کلینیک",
  reviewer:"بررسی‌کننده",noSetup:"ثبت کلینیک را آغاز کنید.",
  preview:"پیش از درخواست، مبلغ و دوره پرداخت را بررسی کنید.",signout:"خروج",failed:"درخواست ناموفق",
  success:"ذخیره شد",loading:"در حال بارگیری...",errorAuth:"برای دسترسی وارد شوید.",
  pendingOps:"تنظیمات بیشتر کلینیک در مراحل بعدی فعال می‌شود.",nextAction:"قدم بعدی",
  privacyGate:"معلومات مریضان خصوصی است؛ نوبت‌دهی و معاینات طبی در مراحل بعدی فعال می‌شوند."
 },
 "ps-AF":{
  dentists:"د ډاکټرانو تایید",listings:"د کلینیک اعلانونه",
  appointments:"لیدنې",clinicQueue:"د ناروغانو کتار",bookingToday:"د نن لیدنې",bookingArrived:"راغلي",bookingActive:"درملنه",bookingCompleted:"بشپړ",bookingPreview:"رښتینې لیدنې په کلینیکي مهالوېش او کتار کې یو شان ښکاري.",newAppointment:"نوی وخت",operations:"عملیات",management:"مدیریت",workspace:"اصلي برخه",staffWorkspace:"کارکوونکي او سرچینې",services:"خدمتونه او بیې",resources:"څوکۍ او خونې",hours:"وختونه او رخصتۍ",opsReady:"د کلینیک چمتووالی",opsHint:"خدمتونه، څوکۍ، ساعتونه او د ډاکټر شیفټونه تنظیم کړئ.",setupComplete:"بشپړ",setupMissing:"پاتې",stepService:"خدمتونه",stepChair:"څوکۍ",stepHours:"کاري ساعتونه",stepDoctor:"د ډاکټر شیفټ",patients:"ناروغان",search:"کلینیکونه ولټوئ",filter:"لټون",dashboard:"ډشبورډ",clinics:"کلینیکونه",clinic:"کلینیک",onboarding:"د کلینیک ثبت",settings:"د کلینیک تنظیمات",
  subscription:"ګډون",subscriptions:"ګډونونه",plans:"پلانونه",overview:"لنډیز",verification:"تایید",
  newClinic:"نوی کلینیک ثبت کړئ",continue:"دوام",save:"مسوده وساتئ",back:"شاته",submit:"د کتنې لپاره واستوئ",
  organization:"د کلینیک معلومات",choosePlan:"پلان غوره کړئ",review:"بیاکتنه او استول",
  legalName:"رسمي نوم",displayName:"ښکاره نوم",clinicType:"د کلینیک ډول",
  solo:"خپلواک ډاکټر",office:"د غاښونو کلینیک",specialty:"ځانګړی مرکز",
  province:"ولایت",city:"ښار",district:"ناحیه",address:"بشپړه پته",phone:"د اړیکې شمېره",
  email:"برېښنالیک",license:"د جواز شمېره (اختیاري)",plan:"د ګډون پلان",
  period:"د تادیې موده",monthly:"میاشتنی",annual:"کلنی",price:"بیه",staff:"د کارکوونکو حد",
  branches:"څانګې",trial:"ازمایښتي ورځې",grace:"مهلت",features:"بنسټیز مدیریت او وخت ورکول شامل دي",
  evidence:"د کلینیک د جواز سند",fileHint:"PDF، PNG یا JPG · تر ۲ مېګابایټه · شخصي",
  upload:"سند پورته کړئ",uploaded:"پورته شوي اسناد",
  attest:"زه تاییدوم چې معلومات سم دي او د کلینیک د ثبت اجازه لرم.",
  status:"حالت",draft:"مسوده",pending:"کتنې ته منتظر",needs_info:"نورو معلوماتو ته اړتیا",
  approved:"تایید شوی",rejected:"رد شوی",suspended:"ځنډول شوی",trialing:"ازمایښتي",
  active:"فعال",expired:"پای ته رسېدلی",cancelled:"لغوه شوی",graceState:"د مهلت وخت",
  payment:"تادیه",payments:"د تادیې غوښتنې",invoice:"رسید",amount:"اندازه (افغانۍ)",
  reference:"د حوالې / رسید شمېره",requestPayment:"د تادیې کتنه وغواړئ",
  awaiting:"د تایید په تمه",paid:"تادیه شوی",void:"رد شوی",reviewClinic:"د کلینیک کتنه",
  history:"د پرېکړو تاریخ",reason:"دلیل / یادښت",
  confirmName:"د تایید لپاره د کلینیک نوم ولیکئ",approve:"تایید",askInfo:"نور معلومات وغواړئ",
  reject:"ردول",suspend:"ځنډول",reopen:"بیا کتنه",verifyPayment:"تادیه تایید کړئ",
  rejectPayment:"غوښتنه رد کړئ",confirmReference:"د رسید شمېره بیا ولیکئ",
  planKey:"د پلان کچه",starter:"پیل",professional:"مسلکي",business:"سوداګریز",
  label:"د پلان نوم",staffLimit:"د کارکوونکو حد",branchLimit:"د څانګو حد",
  trialDays:"ازمایښتي ورځې",graceDays:"د مهلت ورځې",createPlan:"د پلان نوې نسخه خپره کړئ",
  changePlan:"پلان بدل کړئ",update:"نوی کول",deactivate:"غیرفعالول",activate:"فعالول",
  chooseClinic:"کلینیک غوره کړئ",noClinics:"تر اوسه کلینیک نشته",
  noPlans:"پلان نشته؛ مدیر باید لومړی بیه او ظرفیت وټاکي.",noRecords:"هیڅ ریکارډ نشته",
  next:"بل",previous:"مخکېنی",refresh:"تازه کول",unsaved:"نوي معلومات خوندي کړئ.",
  editing:"د تایید شوي کلینیک بدلون بیا کتنې ته اړتیا لري.",
  noPayment:"هیڅ تادیه لا نه ده تایید شوې.",returnHome:"ډشبورډ ته ستنېدل",
  operational:"خدمتونه، څوکۍ، د کلینیک وختونه او د ډاکټر شیفټونه د عملیاتو له لارې تنظیم کړئ.",
  verifiedNote:"د کلینیک تایید د ډاکټر تایید یا عامه خپرونه نه ده.",
  awaitingReview:"ستاسو غوښتنه د انساني کتنې په تمه ده.",
  privacy:"سندونه یوازې مجاز کتونکو ته ښکاري.",titlePlans:"د پلانونو مدیریت",
  titleSubs:"د ګډونونو او تادیو کتنه",titleClinics:"د کلینیکونو د تایید کتار",
  titleSettings:"د کلینیک معلومات سمول",titleDashboard:"د کلینیک لنډیز",
  reviewer:"کتونکی",noSetup:"خپل کلینیک ثبت کړئ.",preview:"مخکې له تادیې بیه او موده وګورئ.",
  signout:"وتل",failed:"غوښتنه ناکامه شوه",success:"خوندي شو",loading:"بارېږي...",
  errorAuth:"لومړی خپل حساب ته ننوځئ.",pendingOps:"د کلینیک نور کارونه وروسته فعالېږي.",
  nextAction:"راتلونکی ګام",privacyGate:"د ناروغانو معلومات شخصي دي؛ رزرو او طبي لیدنې په راتلونکو پړاوونو کې فعالېږي."
 }
};
type View="reviews"|"dashboard"|"onboarding"|"settings"|"subscription"|"clinics"|"review"|"plans"|"subscriptions"|"dentists"|"dentistReview"|"listings"|"listingReview";
type Audience="clinic"|"admin";
function useText() {
  const {locale}=usePreferences();
  return (key:string)=>words[locale]?.[key]||words.en[key]||key;
}
const short=(v:unknown)=>v ? new Date(String(v)).toLocaleDateString("en-CA") : "—";
const currency=(v:unknown)=>new Intl.NumberFormat("en",{style:"decimal"}).format(Number(v)||0)+" AFN";
function Status({value,l}:{value:string,l:(key:string)=>string}){
  const valueKey=value==="grace"?"graceState":value;
  return <span className={"state-badge state-"+value}>{l(valueKey)||value}</span>;
}
function Alert({message,ok=false}:{message:string,ok?:boolean}){
  return message?<InlineAlert kind={ok?"success":"error"}>{message}</InlineAlert>:null;
}
function Empty({children}:{children:ReactNode}){return <div className="phase-empty">{children}</div>;}
function Rows({children}:{children:ReactNode}){return <div className="phase-list">{children}</div>;}
function Input({title,value,change,type="text",required=false,disabled=false}:{title:string,value:any,change:(v:string)=>void,type?:string,required?:boolean,disabled?:boolean}){
  return <label className="field"><span>{title}{required?" *":""}</span>
    <input type={type} value={value??""} required={required} disabled={disabled} onChange={e=>change(e.target.value)}/></label>;
}
function Select({title,value,change,options}:{title:string,value:string,change:(v:string)=>void,options:{id:string,label:string}[]}){
  return <label className="field"><span>{title} *</span><select required value={value} onChange={e=>change(e.target.value)}>
    <option value="">—</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
}
function DataError({message,retry}:{message:string,retry:()=>void}){
  const l=useText();return <section className="card panel"><InlineAlert kind="error">{message}</InlineAlert>
    <button className="btn btn-secondary" onClick={retry}>{l("refresh")}</button></section>;
}
function Frame({audience,view,children,name}:{audience:Audience,view:View,children:ReactNode,name:string}){
  const l=useText();
  const nav=audience==="clinic"?[
    ["dashboard","/clinic"],["appointments","/clinic/appointments"],["patients","/clinic/patients"],["staffWorkspace","/clinic/staff"],
    ["resources","/clinic/resources"],["services","/clinic/services"],["hours","/clinic/settings/hours"],
    ["onboarding","/clinic/onboarding"],
    ["accessSecurity","/clinic/settings/security"],["settings","/clinic/settings"],
    ["subscription","/clinic/settings/subscription"]
  ]:[["dashboard","/admin"],["clinics","/admin/clinics"],["dentists","/admin/dentists"],["listings","/admin/listings"],["reviews","/admin/reviews"],["subscriptions","/admin/subscriptions"],["plans","/admin/plans"]];
  const active=view==="review"?"clinics":view==="dentistReview"?"dentists":view==="listingReview"?"listings":view;
  return <div className="work-layout phase-layout">
    <aside className="card side-panel">
      <div className="pill">{audience==="clinic"?l("clinic"):l("verification")}</div>
      <nav className="side-nav" style={{marginBlockStart:18}} aria-label={l("dashboard")}>
        {nav.map(([key,link],index)=><React.Fragment key={key}>
        {audience==="clinic"&&(index===0||index===3||index===7)&&
          <span className="phase04-side-group">{l(index===0?"workspace":index===3?"operations":"management")}</span>}
        <a href={link} className="phase04-side-link" aria-current={active===key?"page":undefined}>
         <span className="phase04-side-icon" aria-hidden="true">
          {({dashboard:"⌂",appointments:"▦",patients:"♧",staffWorkspace:"◉",resources:"▦",services:"✦",hours:"◷",
            onboarding:"⊞",settings:"⚙",accessSecurity:"⛨",subscription:"◇",
            clinics:"▤",dentists:"✚",listings:"◈",reviews:"★",plans:"▧",subscriptions:"◇"} as Record<string,string>)[key]||"•"}</span>
         <span>{l(key)}</span></a>
       </React.Fragment>)}
      </nav>
      <div className="phase-sidebar-bottom"><LocaleControls/></div>
    </aside>
    <section className="work-content">
      <header className="work-heading phase-work-heading">
        <div><span className="pill">DandanLink · {audience==="clinic"?l("clinic"):l("dashboard")}</span><p className="muted phase-user">{name}</p></div>
        <button className="btn btn-secondary" onClick={async()=>{
          await authClient.signOut();window.location.href=audience==="clinic"?"/clinic/login":"/admin/login";
        }}>{l("signout")}</button>
      </header>
      {children}
    </section>
  </div>;
}
export function Phase02Portal({audience,view}:{audience:Audience,view:View}){
  const l=useText();
  const [me,setMe]=useState<any>(null);
  const [err,setErr]=useState("");
  useEffect(()=>{send("/me").then(setMe).catch(e=>setErr(e.message));},[]);
  if(err==="AUTH_REQUIRED")return <section className="page-narrow"><InlineAlert kind="warning">{l("errorAuth")}</InlineAlert>
    <p><a className="btn btn-primary" href={audience==="clinic"?"/clinic/login":"/admin/login"}>{l("continue")}</a></p></section>;
  if(err)return <DataError message={l("failed")+": "+err} retry={()=>location.reload()}/>;
  if(!me)return <div className="page-narrow"><InlineAlert>{l("loading")}</InlineAlert></div>;
  if(audience==="clinic"&&me.isPlatformAdmin)return <InlineAlert kind="error">{l("errorAuth")}</InlineAlert>;
  if(audience==="admin"&&(!me.isPlatformAdmin||!me.adminMfaVerified))return <AccountStatus audience="admin"/>;
  return <Frame audience={audience} view={view} name={me.user.name}>
    {view==="reviews"?<ReviewModerationPage/>:view==="dashboard"?<Dashboard audience={audience}/>:view==="onboarding"?<Onboarding/>:
      view==="settings"?<ClinicSettings/>:view==="subscription"?<ClinicSubscription/>:
      view==="clinics"?<AdminClinics/>:view==="review"?<AdminReview/>:
      (view==="dentists"||view==="dentistReview"||view==="listings"||view==="listingReview")?
       <AdminModerationPortal view={view}/>:
      view==="plans"?<AdminPlans/>:<AdminSubscriptions/>}
  </Frame>;
}
function useResource(path:string){
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [tick,setTick]=useState(0);
  const refresh=()=>setTick(v=>v+1);
  useEffect(()=>{
    let alive=true;setError("");
    send(path).then(v=>{if(alive)setData(v);}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[path,tick]);
  return {data,error,refresh};
}
function Dashboard({audience}:{audience:Audience}){
  const l=useText();
  const {data,error,refresh}=useResource(audience==="admin"?"/admin/overview":"/clinics");
  if(error)return <DataError message={error} retry={refresh}/>;
  if(!data)return <InlineAlert>{l("loading")}</InlineAlert>;
  if(audience==="admin")return <div>
    <h1 className="phase-title">{l("dashboard")}</h1>
    <div className="phase-stats">
      {["pending","needs_info","approved","suspended"].map(s=><a key={s} className="card value-box" href={"/admin/clinics?status="+s}>
        <strong>{l(s)}</strong><span className="phase-number">{data.clinics?.[s]||0}</span></a>)}
    </div>
    <section className="card panel"><h2>{l("payments")}</h2><p className="lead">{data.pendingInvoices||0} · {l("awaiting")}</p>
      <a href="/admin/subscriptions" className="btn btn-primary">{l("subscriptions")}</a></section>
    <InlineAlert>{l("verifiedNote")}</InlineAlert>
  </div>;
  return <div><h1 className="phase-title">{l("titleDashboard")}</h1>
    {!data.clinics?.length?<section className="card panel">
      <Empty>{l("noSetup")}</Empty><a className="btn btn-primary" href="/clinic/onboarding">{l("newClinic")}</a></section>:
      <Rows>{data.clinics.map((c:any)=><ClinicDashboardCard key={c.id} clinic={c}/>)}</Rows>}
    <section className="card panel"><h2>{l("nextAction")}</h2><p>{l("operational")}</p>
      <InlineAlert>{l("privacyGate")}</InlineAlert></section>
  </div>;
}
function AppointmentActivity({clinicId}:{clinicId:string}){
 const l=useText();
 const {data,error,refresh}=useResource("/appointments/clinics/"+clinicId+"/overview");
 const blocks=[
  {label:"bookingToday",value:data?.todayTotal??0},
  {label:"bookingArrived",value:data?.counts?.arrived??0},
  {label:"bookingActive",value:data?.counts?.in_treatment??0},
  {label:"bookingCompleted",value:data?.counts?.completed??0}
 ];
 return <section className="phase06-owner-activity card">
  <div className="phase04-between"><div>
   <span className="phase04-eyebrow">{l("appointments")}</span>
   <h3>{l("clinicQueue")}</h3>
   <p className="muted">{l("bookingPreview")}</p></div>
   <button className="btn btn-secondary" onClick={refresh} type="button">{l("refresh")||"↻"}</button>
  </div>
  {error?<InlineAlert kind="error">{error}</InlineAlert>:!data?
   <InlineAlert>{l("loading")}</InlineAlert>:
   <div className="phase06-owner-stats">
    {blocks.map(block=><div key={block.label}>
      <span>{l(block.label)}</span><strong>{block.value}</strong></div>)}
   </div>}
  <div className="phase04-setup-shortcuts">
   <a className="btn btn-primary" href={"/clinic/appointments?clinic="+clinicId}>{l("appointments")} ↗</a>
   <a className="btn btn-secondary" href={"/clinic/appointments/queue?clinic="+clinicId}>{l("clinicQueue")} ↗</a>
   <a className="btn btn-secondary" href={"/clinic/appointments/new?clinic="+clinicId}>{l("newAppointment")} ↗</a>
  </div>
 </section>;
}
function OperationsSetup({clinicId}:{clinicId:string}){
 const l=useText();
 const {data,error,refresh}=useResource("/operations/clinics/"+clinicId+"/summary");
 const options=[
  {key:"service",name:"stepService",url:"/clinic/services?clinic="+clinicId},
  {key:"chair",name:"stepChair",url:"/clinic/resources?clinic="+clinicId},
  {key:"clinicHours",name:"stepHours",url:"/clinic/settings/hours?clinic="+clinicId+"&tab=weekly"},
  {key:"dentistHours",name:"stepDoctor",url:"/clinic/settings/hours?clinic="+clinicId+"&tab=providers"}
 ];
 return <section className="phase04-setup-card card">
  <div className="phase04-between"><div><span className="phase04-eyebrow">{l("operations")}</span>
   <h3>{l("opsReady")}</h3><p className="muted">{l("opsHint")}</p></div>
   <button className="btn btn-secondary" type="button" onClick={refresh}>{l("refresh")||"↻"}</button>
  </div>
  {error?<InlineAlert kind="error">{error}</InlineAlert>:!data?
   <InlineAlert>{l("loading")}</InlineAlert>:
   <div className="phase04-setup-grid">{options.map(x=>{
    const done=Boolean(data.checklist?.find((item:any)=>item.key===x.key)?.done);
    return <a href={x.url} key={x.key} className={"phase04-setup-step "+(done?"done":"")}>
     <span aria-hidden="true" className="phase04-setup-mark">{done?"✓":"+"}</span>
     <span><strong>{l(x.name)}</strong><small>{l(done?"setupComplete":"setupMissing")}</small></span>
     <span aria-hidden="true">↗</span>
    </a>;
   })}</div>}
  <div className="phase04-setup-shortcuts">
   <a className="btn btn-secondary" href={"/clinic/services?clinic="+clinicId}>{l("services")} ↗</a>
   <a className="btn btn-secondary" href={"/clinic/resources?clinic="+clinicId}>{l("resources")} ↗</a>
   <a className="btn btn-primary" href={"/clinic/settings/hours?clinic="+clinicId+"&tab=preview"}>{l("hours")} ↗</a>
  </div>
 </section>;
}
function ClinicDashboardCard({clinic:c}:{clinic:any}){
  const l=useText();const {data}=useResource("/clinics/"+c.id);
  return <article className="card panel">
    <div className="phase-row"><div><h2>{c.displayName}</h2><span className="muted">{c.city} · {c.province}</span></div>
      <Status value={c.status} l={l}/></div>
    <div className="phase-stats">
      <div className="value-box"><strong>{l("subscription")}</strong>
        <Status value={data?.effectiveStatus||"draft"} l={l}/><p>{data?.plan?.label||"—"}</p></div>
      <div className="value-box"><strong>{l("verification")}</strong>
        <p>{c.status==="approved"?l("verifiedNote"):l("awaitingReview")}</p></div>
    </div>
    <div className="phase-actions"><a className="btn btn-primary" href={"/clinic/onboarding?clinic="+c.id}>{l("onboarding")}</a>
      <a className="btn btn-secondary" href={"/clinic/settings/subscription?clinic="+c.id}>{l("subscription")}</a></div>
    <OperationsSetup clinicId={c.id}/>
    <AppointmentActivity clinicId={c.id}/>
  </article>;
}
const emptyClinic={
  legalName:"",displayName:"",clinicType:"office",province:"Kabul",city:"Kabul",
  district:"",address:"",phone:"",email:"",licenseNumber:""
};
function OrganizationFields({form,setForm,readonly=false}:{form:any,setForm:(x:any)=>void,readonly?:boolean}){
 const l=useText();const {locale}=usePreferences();
 const words={
  en:{identity:"Clinic identity",public:"Public after approval",private:"Private to reviewers",
   location:"Location and contacts",sub:"Enter accurate clinic information; published data requires separate approval.",
   license:"Registration number is optional here. The actual clinic license document is reviewed in the verification step.",
   clinical:"Professional qualifications and ID cards belong in the dentist credential workflow, not clinic registration."},
  "fa-AF":{identity:"هویت کلینیک",public:"عمومی پس از تأیید",private:"خصوصی برای بررسی‌کنندگان",
   location:"موقعیت و تماس‌ها",sub:"معلومات دقیق کلینیک را درج کنید؛ نشر عمومی نیازمند تأیید جداگانه است.",
   license:"شماره ثبت اینجا اختیاری است؛ سند اصلی جواز در مرحله تأیید بررسی می‌شود.",
   clinical:"اسناد حرفه‌ای و کارت هویت داکتر مربوط روند تأیید داکتر است، نه ثبت کلینیک."},
  "ps-AF":{identity:"د کلینیک پېژندنه",public:"له تایید وروسته عام",private:"د کتونکو لپاره محرم",
   location:"ځای او اړیکې",sub:"د کلینیک دقیق معلومات ولیکئ؛ عامه خپرول بېل تایید غواړي.",
   license:"د ثبت شمېره دلته اختیاري ده؛ اصلي جواز په تایید پړاو کې کتل کېږي.",
   clinical:"د ډاکټر مسلکي اسناد او پېژندپاڼې د ډاکټر تایید پورې تړلې دي، نه د کلینیک ثبت پورې."}
 }[locale]||{
  identity:"Clinic identity",public:"Public after approval",private:"Private to reviewers",
  location:"Location and contacts",sub:"Enter accurate clinic information.",
  license:"Clinic license proof is reviewed separately.",
  clinical:"Doctor ID and professional documents use the separate credential workflow."};
 const change=(key:string)=>(v:string)=>setForm((x:any)=>({...x,[key]:v}));
 return <fieldset className="clinic-setup-form-sections clinic-setup-fields-readonly" disabled={readonly}>
  <section className="clinic-setup-field-section">
   <header className="clinic-setup-field-section-head">
    <span aria-hidden="true" className="clinic-setup-field-icon">▤</span>
    <div><h3>{words.identity}</h3><p>{words.sub}</p></div>
   </header>
   <div className="phase-form-grid">
    <Input title={l("displayName")} value={form.displayName} change={change("displayName")} required/>
    <Input title={l("legalName")} value={form.legalName} change={change("legalName")} required/>
    <Select title={l("clinicType")} value={form.clinicType} change={change("clinicType")}
     options={["solo","office","specialty"].map(id=>({id,label:l(id)}))}/>
    <Input title={l("license")} value={form.licenseNumber} change={change("licenseNumber")}/>
   </div>
   <div className="clinic-setup-data-note">
    <span className="clinic-setup-privacy-badge">⛨ {words.private}</span>
    <p>{words.license}</p></div>
  </section>
  <section className="clinic-setup-field-section">
   <header className="clinic-setup-field-section-head">
    <span aria-hidden="true" className="clinic-setup-field-icon is-location">⌖</span>
    <div><h3>{words.location}</h3><p>{words.public}</p></div>
   </header>
   <div className="phase-form-grid">
    <Input title={l("province")} value={form.province} change={change("province")} required/>
    <Input title={l("city")} value={form.city} change={change("city")} required/>
    <Input title={l("district")} value={form.district} change={change("district")}/>
    <Input title={l("address")} value={form.address} change={change("address")} required/>
    <Input title={l("phone")} value={form.phone} change={change("phone")} type="tel" required/>
    <Input title={l("email")} value={form.email} change={change("email")} type="email" required/>
   </div>
  </section>
  <p className="clinic-setup-hint">⛨ {words.clinical}</p>
 </fieldset>;
}
function PlanCards({plans,selected,onSelect,readonly=false}:{plans:any[],selected:string,onSelect:(s:string)=>void,readonly?:boolean}){
  const l=useText();
  if(!plans.length)return <InlineAlert kind="warning">{l("noPlans")}</InlineAlert>;
  return <div className="phase-plan-cards">{plans.map((p:any)=><label key={p.id} className={"card phase-plan-card"+(selected===p.id?" phase-selected":"")}>
    {!readonly&&<input type="radio" name="selected-plan" value={p.id} checked={selected===p.id} onChange={()=>onSelect(p.id)}/>}
    <strong>{p.label} · {l(p.billingPeriod)}</strong><span className="phase-price">{currency(p.priceAfn)}</span>
    <span className="muted">{p.staffLimit} {l("staff")} · {p.branchLimit} {l("branches")}</span>
    <span className="muted">{p.trialDays} {l("trial")} · {p.graceDays} {l("grace")}</span>
    <small>{l("features")}</small>
  </label>)}</div>;
}
/** Visual hierarchy derived from mobile clinic onboarding references, without
 * copying unsupported PMDC registration, point-based grades or unreviewed claims.
 * All writes still use the existing audited PH02 clinic lifecycle and PH04
 * persisted readiness/operations endpoints. */
function Onboarding(){
 const l=useText();
 const {locale}=usePreferences();
 const words={
  en:{
   introduction:"Set up your clinic with confidence",
   sub:"Complete the clinic details, choose a plan, and submit verified documents for independent review.",
   profile:"Clinic registration",private:"Private · authorized reviewers only",
   public:"Public after approval",contact:"Location & contact",
   statusPending:"Application under review",statusPendingDetail:"A platform reviewer will examine the submitted clinic license. Approval is not automatic, and a decision may require more information.",
   statusApproved:"Clinic approved",statusApprovedDetail:"Your clinic registration has been approved. Finish real services, chairs and working schedules to operate the clinic.",
   statusNeeds:"Action needed",statusNeedsDetail:"Review the decision history and correct the requested information before submitting again.",
   statusDraft:"Save and submit the clinic details to begin independent review.",
   docs:"Registration evidence",docsDetail:"Only approved verification staff can access these files. Never add patient records here.",
   planDetail:"Only genuine published plan prices, capacity and terms are selectable.",
   summary:"Review your submission",summaryDetail:"Check the details, save a draft, upload a clinic license, then explicitly submit for review.",
   setup:"Clinic operational readiness",setupDetail:"Real services, treatment chairs and working hours are configured separately after clinic registration.",
   professional:"Dentist verification is separate",
   professionalDetail:"Dentists join through an authorized clinic invitation and submit their own registration evidence. Creating a clinic does not verify its dentists.",
   doctorLink:"Invite your team",completed:"Completed",upcoming:"After verification",
   doctorNotice:"Do not upload a dentist's private ID card here. Dentist credentials use their own secure verification workflow.",
   saveFirst:"Save your clinic details before uploading verification evidence.",
   selectFile:"Choose document",fileSize:"The file must be PDF, PNG or JPEG and 2 MB or smaller.",
   change:"Change details",current:"Current clinic",all:"Application steps",
   goDashboard:"Return to dashboard",underReview:"Your draft and review status are preserved.",
   verifiedDisclaimer:"Facility quality rankings, awards and points are not used without a verified assessment policy.",
   next:"Continue",done:"View readiness",uploadAction:"Upload private document",
   reviewCopy:"Review is performed by a platform administrator. No automatic approval is promised."
  },
  "fa-AF":{
   introduction:"کلینیک خود را با اطمینان ثبت کنید",
   sub:"معلومات کلینیک، پلن و اسناد معتبر را تکمیل و برای بررسی مستقل ارسال کنید.",
   profile:"ثبت کلینیک",private:"خصوصی · فقط برای بررسی‌کنندگان مجاز",
   public:"عمومی پس از تأیید",contact:"موقعیت و تماس",
   statusPending:"در انتظار بررسی",statusPendingDetail:"مدیر سیستم جواز کلینیک را بررسی می‌کند. تأیید خودکار نیست و ممکن است معلومات بیشتر بخواهد.",
   statusApproved:"کلینیک تأیید شده",statusApprovedDetail:"ثبت کلینیک تأیید شده است. حالا خدمات، چوکی‌ها و تقسیم اوقات واقعی را تنظیم کنید.",
   statusNeeds:"اقدام ضروری",statusNeedsDetail:"دلیل تصمیم را در تاریخچه ببینید و پیش از ارسال مجدد معلومات را اصلاح کنید.",
   statusDraft:"معلومات کلینیک را ذخیره و برای آغاز بررسی مستقل ارسال کنید.",
   docs:"اسناد ثبت",docsDetail:"تنها بررسی‌کنندگان مجاز به این اسناد دسترسی دارند. اسناد مریضان را اینجا آپلود نکنید.",
   planDetail:"فقط قیمت‌ها، ظرفیت‌ها و شرایط پلن‌های منتشرشده انتخاب می‌شوند.",
   summary:"بررسی معلومات",summaryDetail:"معلومات را بررسی، پیش‌نویس را ذخیره، جواز را آپلود و سپس برای بررسی ارسال کنید.",
   setup:"آمادگی عملیاتی کلینیک",setupDetail:"خدمات، چوکی‌های تداوی و تقسیم اوقات واقعی جداگانه تنظیم می‌شوند.",
   professional:"تأیید داکتر جداگانه است",
   professionalDetail:"داکتر توسط کلینیک دعوت می‌شود و اسناد حرفه‌ای خود را جداگانه ارائه می‌کند. ثبت کلینیک به‌معنی تأیید داکتر نیست.",
   doctorLink:"دعوت کارمندان",completed:"تکمیل",upcoming:"بعد از تأیید",
   doctorNotice:"کارت هویت خصوصی داکتر را اینجا آپلود نکنید. برای اسناد داکتر مسیر مصون جداگانه وجود دارد.",
   saveFirst:"پیش از آپلود اسناد، معلومات کلینیک را ذخیره کنید.",
   selectFile:"انتخاب سند",fileSize:"سند باید PDF، PNG یا JPEG و حداکثر ۲ مگابایت باشد.",
   change:"تغییر معلومات",current:"کلینیک انتخاب‌شده",all:"مراحل ثبت",
   goDashboard:"بازگشت به داشبورد",underReview:"پیش‌نویس و وضعیت بررسی محفوظ می‌مانند.",
   verifiedDisclaimer:"بدون ارزیابی معتبر، درجه، امتیاز یا جایزه کیفیت کلینیک نمایش داده نمی‌شود.",
   next:"ادامه",done:"مشاهده آمادگی",uploadAction:"آپلود سند خصوصی",
   reviewCopy:"بررسی توسط مدیر سیستم انجام می‌شود؛ تأیید خودکار وعده داده نمی‌شود."
  },
  "ps-AF":{
   introduction:"خپل کلینیک په ډاډ ثبت کړئ",
   sub:"د کلینیک معلومات، پلان او اسناد بشپړ کړئ او خپلواکې کتنې ته یې واستوئ.",
   profile:"د کلینیک ثبت",private:"محرم · یوازې مجاز کتونکو ته",
   public:"له تایید وروسته عام",contact:"ځای او اړیکه",
   statusPending:"د تایید په تمه",statusPendingDetail:"اداره د کلینیک جواز ګوري؛ تایید اتومات نه دی او نور معلومات غوښتل کېدای شي.",
   statusApproved:"کلینیک تایید شو",statusApprovedDetail:"ثبت تایید شوی؛ اوس رښتینې خدمتونه، څوکۍ او وختونه بشپړ کړئ.",
   statusNeeds:"اقدام ته اړتیا",statusNeedsDetail:"د پرېکړې تاریخچه وګورئ او مخکې له بیا لېږلو معلومات سم کړئ.",
   statusDraft:"د خپلواکې کتنې لپاره د کلینیک معلومات خوندي او واستوئ.",
   docs:"د ثبت اسناد",docsDetail:"یوازې مجاز کتونکو ته د لاسرسي اجازه شته؛ د ناروغانو اسناد دلته مه پورته کوئ.",
   planDetail:"یوازې خپاره شوي اصلي پلانونه او بیې ټاکل کېږي.",
   summary:"د معلوماتو بیاکتنه",summaryDetail:"معلومات وګورئ، مسوده وساتئ، جواز پورته کړئ او بیا کتنې ته واستوئ.",
   setup:"د کلینیک عملیاتي چمتووالی",setupDetail:"خدمتونه، څوکۍ او رښتیني مهالوېش بېل تنظیمېږي.",
   professional:"د ډاکټر تایید بېل دی",
   professionalDetail:"ډاکټر د کلینیک په بلنه ورګډېږي او خپل مسلکي اسناد وړاندې کوي. د کلینیک ثبت د ډاکټر تایید نه دی.",
   doctorLink:"کارکوونکي راوبلئ",completed:"بشپړ",upcoming:"له تایید وروسته",
   doctorNotice:"د ډاکټر شخصي پېژندپاڼه دلته مه پورته کوئ؛ د ډاکټر اسنادو لپاره خوندي جلا لاره شته.",
   saveFirst:"له سند پورته کولو مخکې د کلینیک معلومات وساتئ.",
   selectFile:"سند غوره کړئ",fileSize:"PDF، PNG یا JPEG تر ۲ مېګابایټه.",
   change:"معلومات بدل کړئ",current:"ټاکل شوی کلینیک",all:"د ثبت پړاوونه",
   goDashboard:"ډشبورډ ته ستنېدل",underReview:"د مسودې او بیاکتنې حالت خوندي دی.",
   verifiedDisclaimer:"له رښتینې ارزونې پرته د کلینیک درجه او نمرې نه ښودل کېږي.",
   next:"دوام",done:"چمتووالی وګورئ",uploadAction:"محرم سند پورته کړئ",
   reviewCopy:"د ادارې له خوا ارزول کېږي؛ د اتومات تایید ژمنه نشته."
  }
 }[locale]||{
  introduction:"Set up your clinic with confidence",sub:"Complete the clinic details, choose a plan and submit verified documents.",
  profile:"Clinic registration",private:"Private to reviewers",public:"Public after approval",
  contact:"Location & contact",statusPending:"Application under review",
  statusPendingDetail:"A platform reviewer will examine the submitted clinic license.",
  statusApproved:"Clinic approved",statusApprovedDetail:"Finish operational setup.",
  statusNeeds:"Action needed",statusNeedsDetail:"Please review the decision.",
  statusDraft:"Save clinic details to begin review.",docs:"Registration evidence",
  docsDetail:"Files are private to reviewers.",planDetail:"Select published plans.",
  summary:"Review your submission",summaryDetail:"Save, upload license and submit.",
  setup:"Operational readiness",setupDetail:"Configure actual services and hours.",
  professional:"Dentist verification is separate",professionalDetail:"Dentists are invited and reviewed separately.",
  doctorLink:"Invite your team",completed:"Completed",upcoming:"After verification",
  doctorNotice:"Do not upload dentist ID documents to clinic license verification.",
  saveFirst:"Save the clinic before uploading documents.",selectFile:"Choose document",
  fileSize:"PDF, PNG, JPEG up to 2 MB",change:"Change details",current:"Current clinic",
  all:"Application steps",goDashboard:"Return to dashboard",underReview:"Your progress is preserved.",
  verifiedDisclaimer:"Unsupported grading is not displayed.",next:"Continue",done:"View readiness",
  uploadAction:"Upload private document",reviewCopy:"Manual review is required."};
 const {data:list,error:listError,refresh:listRefresh}=useResource("/clinics");
 const {data:published}=useResource("/public/plans");
 const [selected,setSelected]=useState("");
 const [detail,setDetail]=useState<any>(null);
 const [form,setForm]=useState<any>(emptyClinic);
 const [plan,setPlan]=useState("");
 const [stage,setStage]=useState(0);
 const [attested,setAttested]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [good,setGood]=useState("");
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search).get("clinic");
  if(query)setSelected(query);
 },[]);
 useEffect(()=>{
  if(!selected){setDetail(null);setForm(emptyClinic);setPlan("");setStage(0);setFile(null);setAttested(false);return;}
  let active=true;
  send("/clinics/"+selected).then(d=>{if(active){
    setDetail(d);setForm(d.clinic);setPlan(d.clinic.selectedPlanId||"");
    setError("");
    if(["pending","approved","suspended"].includes(d.clinic.status))setStage(2);
  }}).catch(e=>{if(active)setError(e.message)});
  return ()=>{active=false};
 },[selected]);
 const reload=async(id:string)=>{
  const d=await send("/clinics/"+id);setDetail(d);
  setForm(d.clinic);setPlan(d.clinic.selectedPlanId||"");listRefresh();
 };
 const canEdit=!detail||["draft","needs_info","rejected"].includes(detail.clinic.status);
 const status=detail?.clinic?.status||"draft";
 const isSubmitted=["pending","approved","suspended"].includes(status);
 const allPlans=published?.plans||[];
 const chosen=allPlans.find((p:any)=>p.id===plan);
 const savedLicense=Boolean(detail?.documents?.some((d:any)=>d.kind==="clinic_license"));
 const isReady=Boolean(selected&&detail);
 const docValid=Boolean(file&&file.size<=2*1024*1024&&
  ["application/pdf","image/png","image/jpeg"].includes(file.type));
 const stageLabels=[l("organization"),l("choosePlan"),l("review"),l("operations")];
 const stageCount=isSubmitted?3:stage;
 async function save(ev:FormEvent){
  ev.preventDefault();setBusy(true);setError("");setGood("");
  try{
   if(!plan)throw new Error("PLAN_REQUIRED");
   const payload={...form,selectedPlanId:plan};
   const result=selected?await send("/clinics/"+selected,"PATCH",
      {...payload,revision:detail.clinic.revision}):
    await send("/clinics","POST",payload);
   const id=result.clinic.id;setSelected(id);await reload(id);
   setGood(l("success"));setStage(2);
   window.history.replaceState(null,"","/clinic/onboarding?clinic="+encodeURIComponent(id));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function upload(){
  if(!docValid||!selected||!file)return;
  setBusy(true);setError("");setGood("");
  try{
   const response=await fetch(API+"/v1/clinics/"+selected+"/evidence",{
    method:"POST",credentials:"include",headers:{"content-type":"application/octet-stream",
     "x-document-kind":"clinic_license","x-file-name":file.name},body:file});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(result.code||"UPLOAD_FAILED");
   setFile(null);await reload(selected);setGood(l("success"));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function submit(){
  if(!selected||!savedLicense||!attested)return;
  setBusy(true);setError("");setGood("");
  try{
   await send("/clinics/"+selected+"/submit","POST",{attested:true});
   await reload(selected);setGood(l("success"));setStage(2);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 const go=(to:number)=>{
  if(to===1&&(!form.displayName?.trim()||!form.legalName?.trim()||
     !form.phone?.trim()||!form.address?.trim()||!form.city?.trim()||
     !form.province?.trim()||!form.email?.trim()))return;
  if(to===2&&!isReady&&!plan)return;
  if(to===3&&!isReady)return;
  setStage(to);setError("");setGood("");
 };
 return <div className="clinic-setup">
  <header className="clinic-setup-top">
   <a href="/clinic" className="clinic-setup-back">← {words.goDashboard}</a>
   <div className="clinic-setup-heading">
    <span className="clinic-setup-overline">DANDANLINK · {l("onboarding")}</span>
    <h1>{words.introduction}</h1><p>{words.sub}</p>
   </div>
   {list?.clinics?.length>0&&<Select title={words.current} value={selected}
     change={setSelected} options={[
      {id:"",label:l("newClinic")},
      ...list.clinics.map((c:any)=>({id:c.id,label:c.displayName}))
     ]}/>}
  </header>
  {listError&&<DataError message={listError} retry={listRefresh}/>}
  <div className="clinic-setup-layout">
   <div className="clinic-setup-main">
    <nav className="clinic-setup-steps" aria-label={words.all}>
     {stageLabels.map((label,i)=><button type="button" key={i}
      aria-current={stage===i?"step":undefined}
      className={stage===i?"is-current":i<stageCount?"is-complete":""}
      disabled={(i===2&&!isReady&&!plan)||(i===3&&!isReady)}
      onClick={()=>go(i)}>
       <span className="clinic-setup-step-num">{i<stageCount?"✓":i+1}</span>
       <span>{label}</span>
      </button>)}
    </nav>
    {isSubmitted&&<section className={"clinic-setup-review-status "+
     (status==="approved"?"is-approved":"is-pending")} role="status">
     <span className="clinic-setup-review-icon" aria-hidden="true">
      {status==="approved"?"✓":"⌛"}</span>
     <div><h2>{status==="approved"?words.statusApproved:words.statusPending}</h2>
      <p>{status==="approved"?words.statusApprovedDetail:words.statusPendingDetail}</p>
      <span className="clinic-setup-status-value"><Status value={status} l={l}/></span>
     </div>
    </section>}
    {["needs_info","rejected"].includes(status)&&<section className="clinic-setup-review-status is-action">
      <span aria-hidden="true" className="clinic-setup-review-icon">!</span>
      <div><h2>{words.statusNeeds}</h2><p>{words.statusNeedsDetail}</p></div>
    </section>}
    {stage===0&&<section className="clinic-setup-surface">
     <div className="clinic-setup-section-head"><span className="clinic-setup-section-icon" aria-hidden="true">▤</span>
      <div><h2>{words.profile}</h2><span className="clinic-setup-privacy-badge">⌁ {words.private}</span></div>
     </div>
     <form className="clinic-setup-form" onSubmit={e=>{e.preventDefault();go(1)}}>
      <OrganizationFields form={form} setForm={setForm} readonly={!canEdit}/>
      <div className="clinic-setup-actions">
       <button className="btn btn-primary" type="submit" disabled={!canEdit}>
        {words.next} →</button></div>
     </form>
    </section>}
    {stage===1&&<section className="clinic-setup-surface">
     <div className="clinic-setup-section-head"><span className="clinic-setup-section-icon" aria-hidden="true">◈</span>
      <div><h2>{l("choosePlan")}</h2><p>{words.planDetail}</p></div>
     </div>
     <PlanCards plans={allPlans.filter((p:any)=>!detail||detail.clinic.status==="draft"||p.id===plan)}
      selected={plan} onSelect={setPlan} readonly={!canEdit}/>
     <div className="clinic-setup-actions">
      <button type="button" className="btn btn-secondary" onClick={()=>go(0)}>{l("back")}</button>
      <button type="button" className="btn btn-primary" disabled={!plan} onClick={()=>go(2)}>
       {words.next} →</button>
     </div>
    </section>}
    {stage===2&&<div className="clinic-setup-blocks">
     <section className="clinic-setup-surface">
      <div className="clinic-setup-section-head">
       <span className="clinic-setup-section-icon" aria-hidden="true">✓</span>
       <div><h2>{words.summary}</h2><p>{words.summaryDetail}</p></div>
      </div>
      <div className="clinic-setup-summary">
       <div><span>{l("displayName")}</span><strong>{form.displayName||"—"}</strong></div>
       <div><span>{l("city")}</span><strong>{form.city||"—"} · {form.province||"—"}</strong></div>
       <div><span>{l("plan")}</span><strong>{chosen?.label||detail?.plan?.label||"—"}
        {chosen?(" · "+currency(chosen.priceAfn)):""}</strong></div>
       <div><span>{l("phone")}</span><strong dir="ltr">{form.phone||"—"}</strong></div>
      </div>
      {canEdit&&<form onSubmit={save} className="clinic-setup-actions">
       <button className="btn btn-secondary" type="button" onClick={()=>go(0)}>{words.change}</button>
       <button disabled={busy||!plan} className="btn btn-primary">
        {busy?l("loading"):l("save")}</button>
      </form>}
      {!canEdit&&<p className="clinic-setup-hint">{words.underReview}</p>}
     </section>
     <section className="clinic-setup-surface">
      <div className="clinic-setup-section-head">
       <span className="clinic-setup-section-icon is-private" aria-hidden="true">♙</span>
       <div><h2>{words.docs}</h2><span className="clinic-setup-privacy-badge">⌁ {words.private}</span>
        <p>{words.docsDetail}</p></div>
      </div>
      {isReady?<div className="clinic-setup-docs">
       <div className="clinic-setup-upload">
        <label className="clinic-setup-upload-picker">
         <span className="clinic-setup-upload-symbol" aria-hidden="true">⇧</span>
         <span><strong>{file?.name||words.selectFile}</strong>
          <small>{l("fileHint")}</small></span>
         <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          disabled={!canEdit||busy} onChange={e=>setFile(e.currentTarget.files?.[0]||null)}/>
        </label>
        {file&&!docValid&&<InlineAlert kind="warning">{words.fileSize}</InlineAlert>}
        <button className="btn btn-secondary" type="button" onClick={upload}
         disabled={!docValid||busy||!canEdit}>
         {busy?l("loading"):words.uploadAction}</button>
       </div>
       {detail?.documents?.length>0&&<div className="clinic-setup-uploads">
        <strong>{l("uploaded")}</strong>
        {detail.documents.map((d:any)=><div key={d.id} className="clinic-setup-uploaded">
         <span aria-hidden="true">✓</span><span>{d.fileName}</span>
         <small>{Math.round(d.sizeBytes/1024)} KB</small></div>)}
       </div>}
       {canEdit&&<div className="clinic-setup-attestation">
        <label className="clinic-setup-check"><input type="checkbox" checked={attested}
         onChange={e=>setAttested(e.target.checked)}/><span>{l("attest")}</span></label>
        <button className="btn btn-primary clinic-setup-submit" type="button" onClick={submit}
         disabled={!attested||!savedLicense||busy}>
         {busy?l("loading"):l("submit")} →</button>
       </div>}
       <p className="clinic-setup-hint">⛨ {words.doctorNotice}</p>
       <p className="clinic-setup-hint">{words.reviewCopy}</p>
      </div>:<InlineAlert kind="info">{words.saveFirst}</InlineAlert>}
     </section>
    </div>}
    {stage===3&&<div className="clinic-setup-blocks">
     <section className="clinic-setup-surface">
      <div className="clinic-setup-section-head">
       <span className="clinic-setup-section-icon" aria-hidden="true">✦</span>
       <div><h2>{words.setup}</h2><p>{words.setupDetail}</p></div></div>
      {isReady?<OperationsSetup clinicId={selected}/>:
       <InlineAlert kind="info">{l("noSetup")}</InlineAlert>}
      <p className="clinic-setup-hint">{words.verifiedDisclaimer}</p>
     </section>
     <section className="clinic-setup-surface">
      <div className="clinic-setup-section-head">
       <span className="clinic-setup-section-icon" aria-hidden="true">⛨</span>
       <div><h2>{words.professional}</h2><p>{words.professionalDetail}</p></div></div>
      {isReady&&<a className="btn btn-secondary" href={"/clinic/staff?clinic="+encodeURIComponent(selected)+"&tab=invitations"}>
       {words.doctorLink} ↗</a>}
     </section>
    </div>}
    {error&&<div className="clinic-setup-alert"><Alert message={l("failed")+": "+error}/></div>}
    {good&&<div className="clinic-setup-alert"><Alert message={good} ok/></div>}
    {detail?.history?.length>0&&<section className="clinic-setup-surface">
      <h2>{l("history")}</h2>
      <div className="clinic-setup-history">{detail.history.map((h:any,i:number)=>
       <div key={i}><span>{short(h.createdAt)}</span>
        <strong>{l(h.action)||h.action}</strong>
        {h.reason&&<p>{h.reason}</p>}</div>)}</div>
    </section>}
   </div>
   <aside className="clinic-setup-aside">
    <section className="clinic-setup-side-card">
     <span className="clinic-setup-side-symbol" aria-hidden="true">✦</span>
     <h2>{l("verification")}</h2>
     <p>{isSubmitted?words.underReview:words.statusDraft}</p>
     <div className="clinic-setup-side-steps">
      <div><span>{isReady?"✓":"1"}</span>{l("organization")}</div>
      <div><span>{plan?"✓":"2"}</span>{l("choosePlan")}</div>
      <div><span>{savedLicense?"✓":"3"}</span>{words.docs}</div>
      <div><span>{status==="approved"?"✓":"4"}</span>{l("verification")}</div>
     </div>
     <p className="clinic-setup-hint">{l("verifiedNote")}</p>
    </section>
    <section className="clinic-setup-side-card">
     <h3>{words.professional}</h3><p>{words.professionalDetail}</p>
     {isReady&&<a href={"/clinic/staff?clinic="+encodeURIComponent(selected)+"&tab=invitations"}>
      {words.doctorLink} ↗</a>}
    </section>
   </aside>
  </div>
 </div>;
}

function ClinicSettings(){
 const l=useText();
 const {data,error,refresh}=useResource("/clinics");
 const [selected,setSelected]=useState("");
 const [detail,setDetail]=useState<any>(null);
 const [form,setForm]=useState<any>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[failure,setFailure]=useState("");
 useEffect(()=>{if(data?.clinics?.length&&!selected)setSelected(data.clinics[0].id);},[data,selected]);
 useEffect(()=>{if(selected)send("/clinics/"+selected).then(d=>{setDetail(d);setForm(d.clinic);})
   .catch(e=>setFailure(e.message));},[selected]);
 async function save(e:FormEvent){
  e.preventDefault();setBusy(true);setFailure("");setMessage("");
  try{
   const response=await send("/clinics/"+selected,"PATCH",{...form,revision:detail.clinic.revision});
   setDetail({...detail,clinic:response.clinic});setForm(response.clinic);setMessage(l("success"));refresh();
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 if(error)return <DataError message={error} retry={refresh}/>;
 if(!data)return <InlineAlert>{l("loading")}</InlineAlert>;
 if(!data.clinics.length)return <section className="card panel"><Empty>{l("noClinics")}</Empty>
   <a className="btn btn-primary" href="/clinic/onboarding">{l("newClinic")}</a></section>;
 return <section className="card panel"><h1 className="phase-title">{l("titleSettings")}</h1>
  <Select title={l("chooseClinic")} value={selected} change={setSelected} options={data.clinics.map((c:any)=>({id:c.id,label:c.displayName}))}/>
  {detail&&<Status value={detail.clinic.status} l={l}/>}
  {form&&<form onSubmit={save} className="phase-form">
    <OrganizationFields form={form} setForm={setForm}/>
    {detail?.clinic.status==="approved"&&<InlineAlert kind="warning">{l("editing")}</InlineAlert>}
    {!["pending","suspended"].includes(detail?.clinic.status)&&
    <button className="btn btn-primary" disabled={busy}>{l("update")}</button>}
  </form>}
  {failure&&<Alert message={failure}/>}
  {message&&<Alert message={message} ok/>}
 </section>;
}
function ClinicSubscription(){
 const l=useText();
 const {data,error,refresh}=useResource("/clinics");
 const {data:published}=useResource("/public/plans");
 const [selected,setSelected]=useState("");
 const [detail,setDetail]=useState<any>(null);
 const [plan,setPlan]=useState("");
 const [reference,setReference]=useState("");
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{
  const fromUrl=new URLSearchParams(window.location.search).get("clinic");
  if(fromUrl)setSelected(fromUrl);
  else if(data?.clinics?.length&&!selected)setSelected(data.clinics[0].id);
 },[data,selected]);
 useEffect(()=>{if(selected)send("/clinics/"+selected).then(setDetail)
   .catch(e=>setFailure(e.message));},[selected]);
 async function requestPay(e:FormEvent){
  e.preventDefault();setBusy(true);setFailure("");setMessage("");
  try{
   await send("/clinics/"+selected+"/subscription/request","POST",{planVersionId:plan,evidenceReference:reference});
   setDetail(await send("/clinics/"+selected));setMessage(l("awaiting"));setReference("");refresh();
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 if(error)return <DataError message={error} retry={refresh}/>;
 if(!data)return <InlineAlert>{l("loading")}</InlineAlert>;
 if(!data.clinics.length)return <div className="card panel"><Empty>{l("noClinics")}</Empty>
   <a className="btn btn-primary" href="/clinic/onboarding">{l("newClinic")}</a></div>;
 const current=detail?.subscription;
 const activePlan=detail?.plan;
 const picked=published?.plans?.find((p:any)=>p.id===plan);
 return <div><h1 className="phase-title">{l("subscription")}</h1>
  <Select title={l("chooseClinic")} value={selected} change={setSelected}
    options={data.clinics.map((c:any)=>({id:c.id,label:c.displayName}))}/>
  {detail?<div>
    <section className="card panel">
      <div className="phase-row"><h2>{detail.clinic.displayName}</h2><Status value={detail.effectiveStatus} l={l}/></div>
      <p>{l("plan")}: <strong>{activePlan?.label||"—"}</strong> · {l(activePlan?.billingPeriod||"")}</p>
      <p>{l("price")}: {currency(activePlan?.priceAfn)}</p>
      <p>{l("trial")}: {short(current?.trialEndsAt)} · {l("grace")}: {activePlan?.graceDays??"—"}</p>
      {current?.currentPeriodEndsAt&&<p>{l("nextAction")}: {short(current.currentPeriodEndsAt)}</p>}
      <InlineAlert>{l("noPayment")}</InlineAlert>
    </section>
    <section className="card panel"><h2>{l("changePlan")} / {l("payment")}</h2>
      <p className="muted">{l("preview")}</p>
      <PlanCards plans={published?.plans||[]} selected={plan} onSelect={setPlan}/>
      {picked&&<InlineAlert>{picked.label} · {currency(picked.priceAfn)} · {l(picked.billingPeriod)}</InlineAlert>}
      <form className="phase-form" onSubmit={requestPay}>
        <Input title={l("reference")} value={reference} change={setReference} required/>
        <button className="btn btn-primary" disabled={!picked||busy||detail.invoices?.some((i:any)=>i.status==="awaiting")}>
          {l("requestPayment")}</button>
      </form>
    </section>
    <section className="card panel"><h2>{l("payments")}</h2>
      {detail.invoices?.length?<Rows>{detail.invoices.map((inv:any)=>
        <div className="phase-row phase-list-item" key={inv.id}>
          <div><strong>{currency(inv.amountAfn)}</strong><p className="muted">{short(inv.createdAt)} · <bdi>{inv.evidenceReference}</bdi></p></div>
          <Status value={inv.status} l={l}/>
        </div>)}</Rows>:<Empty>{l("noRecords")}</Empty>}
    </section>
    {failure&&<Alert message={failure}/>}
    {message&&<Alert message={message} ok/>}
  </div>:<InlineAlert>{l("loading")}</InlineAlert>}
 </div>;
}
function AdminClinics(){
 const l=useText();
 const [status,setStatus]=useState("pending"),[page,setPage]=useState(1);
 const [draft,setDraft]=useState(""),[term,setTerm]=useState("");
 const {data,error,refresh}=useResource("/admin/clinics?status="+status+"&page="+page+"&q="+encodeURIComponent(term));
 useEffect(()=>{
  const fromUrl=new URLSearchParams(window.location.search).get("status");
  if(fromUrl&&["pending","needs_info","approved","rejected","suspended"].includes(fromUrl))setStatus(fromUrl);
 },[]);
 if(error)return <DataError message={error} retry={refresh}/>;
 return <div><h1 className="phase-title">{l("titleClinics")}</h1>
  <div className="phase-tabs" role="tablist" aria-label={l("status")}>
    {["pending","approved","suspended","rejected"].map(s=><button key={s} role="tab"
      aria-selected={status===s} className={status===s?"current":""} onClick={()=>{setStatus(s);setPage(1);}}>
      {l(s)}</button>)}
  </div>
  <section className="card panel">
    <form className="phase-search" onSubmit={e=>{e.preventDefault();setTerm(draft.trim());setPage(1);}}>
      <label className="field"><span>{l("search")}</span>
        <input type="search" value={draft} maxLength={80} onChange={e=>setDraft(e.target.value)}/></label>
      <button type="submit" className="btn btn-secondary">{l("filter")}</button>
    </form>
    {!data?<InlineAlert>{l("loading")}</InlineAlert>:!data.clinics?.length?<Empty>{l("noRecords")}</Empty>:
      <Rows>{data.clinics.map((c:any)=><a className="phase-row phase-list-item" href={"/admin/clinics/"+c.id} key={c.id}>
        <div><strong>{c.displayName}</strong><p className="muted">{c.city} · {c.province} · {short(c.submittedAt)}</p></div>
        <div><Status value={c.status} l={l}/><span className="phase-arrow"> › </span></div>
      </a>)}</Rows>}
    <div className="phase-pagination">
      <button className="btn btn-secondary" disabled={page<2} onClick={()=>setPage(v=>v-1)}>{l("previous")}</button>
      <span>{page} / {Math.max(1,Math.ceil((data?.total||0)/20))}</span>
      <button className="btn btn-secondary" disabled={page*20>=(data?.total||0)} onClick={()=>setPage(v=>v+1)}>{l("next")}</button>
    </div>
  </section>
 </div>;
}
function AdminReview(){
 const l=useText();
 const [id,setId]=useState("");
 useEffect(()=>{setId(window.location.pathname.split("/").filter(Boolean).at(-1)||"");},[]);
 const {data,error,refresh}=useResource(id?"/admin/clinics/"+id:"/admin/overview");
 const [reason,setReason]=useState(""),[confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[message,setMessage]=useState("");
 async function decide(action:string){
  setFailure("");setMessage("");setBusy(true);
  try{await send("/admin/clinics/"+id+"/review","POST",{action,reason,confirmation});
    refresh();setReason("");setConfirmation("");setMessage(l("success"));
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 async function evidence(docId:string){
  try{
    const r=await fetch(API+"/v1/admin/clinics/"+id+"/evidence/"+docId,{credentials:"include"});
    if(!r.ok)throw new Error((await r.json()).code);
    const url=URL.createObjectURL(await r.blob());
    const anchor=document.createElement("a");anchor.href=url;anchor.download="verification-evidence";
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setFailure((e as Error).message);}
 }
 if(error)return <DataError message={error} retry={refresh}/>;
 if(!data?.clinic)return <InlineAlert>{l("loading")}</InlineAlert>;
 const c=data.clinic;
 const choices=c.status==="pending"?["approve","needs_info","reject"]:
   c.status==="approved"?["suspend"]:c.status==="suspended"?["reopen","approve"]:[];
 return <div><a className="text-link" href="/admin/clinics">← {l("back")}</a>
  <h1 className="phase-title">{l("reviewClinic")}: {c.displayName}</h1>
  <div className="phase-status-strip"><Status value={c.status} l={l}/>
    <span>{l("subscription")}: {l(data.effectiveStatus)}</span></div>
  <section className="card panel">
    <h2>{l("organization")}</h2>
    <div className="phase-detail-grid">
      {([["legalName",c.legalName],["clinicType",c.clinicType],["province",c.province],["city",c.city],
        ["address",c.address],["phone",c.phone],["email",c.email],["license",c.licenseNumber]] as const)
        .map(([key,value])=><div key={key}><small className="muted">{l(key)}</small><p><bdi>{String(value||"—")}</bdi></p></div>)}
    </div>
    <InlineAlert>{l("verifiedNote")}</InlineAlert>
  </section>
  <section className="card panel"><h2>{l("uploaded")}</h2>
    {data.documents?.length?data.documents.map((d:any)=><div key={d.id} className="phase-row phase-list-item">
      <span>{d.kind} · {d.fileName} · {Math.round(d.sizeBytes/1024)} KB</span>
      <button className="btn btn-secondary" onClick={()=>evidence(d.id)}>{l("review")}</button>
    </div>):<Empty>{l("noRecords")}</Empty>}
    <p className="muted">{l("privacy")}</p>
  </section>
  {choices.length>0&&<section className="card panel"><h2>{l("verification")}</h2>
    <div className="phase-form">
      <label className="field"><span>{l("reason")}</span><textarea rows={3} value={reason}
        onChange={e=>setReason(e.target.value)}/></label>
      <Input title={l("confirmName")} value={confirmation} change={setConfirmation}/>
      <div className="phase-actions">{choices.map(action=><button className={"btn "+(action==="approve"?"btn-primary":"btn-secondary")}
        key={action} onClick={()=>decide(action)} disabled={busy||action!=="approve"&&reason.trim().length<5||
          ["approve","suspend"].includes(action)&&confirmation!==c.displayName}>{l(action==="needs_info"?"askInfo":action)}</button>)}</div>
    </div>
  </section>}
  <section className="card panel"><h2>{l("history")}</h2>
    {data.history?.length?data.history.map((h:any)=><p key={h.id}>{short(h.createdAt)} · {l(h.action)||h.action} · {h.reason||"—"}</p>):
      <Empty>{l("noRecords")}</Empty>}
  </section>
  {failure&&<Alert message={failure}/>}
  {message&&<Alert message={message} ok/>}
 </div>;
}
function AdminPlans(){
 const l=useText();
 const {data,error,refresh}=useResource("/admin/plans");
 const [form,setForm]=useState<any>({planKey:"starter",billingPeriod:"monthly",
  label:"Starter",priceAfn:"",staffLimit:"1",branchLimit:"1",trialDays:"14",graceDays:"7"});
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[message,setMessage]=useState("");
 function change(name:string,value:string){setForm((f:any)=>({...f,[name]:value}));}
 async function create(e:FormEvent){
  e.preventDefault();setFailure("");setMessage("");setBusy(true);
  try{
    const payload={...form,priceAfn:Number(form.priceAfn),staffLimit:Number(form.staffLimit),
      branchLimit:Number(form.branchLimit),trialDays:Number(form.trialDays),graceDays:Number(form.graceDays)};
    await send("/admin/plans","POST",payload);
    refresh();setMessage(l("success"));
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 async function toggle(p:any){
  try{await send("/admin/plans/"+p.id,"PATCH",{active:!p.active});refresh();setMessage(l("success"));}
  catch(e){setFailure((e as Error).message);}
 }
 if(error)return <DataError message={error} retry={refresh}/>;
 return <div><h1 className="phase-title">{l("titlePlans")}</h1>
  <section className="card panel"><h2>{l("createPlan")}</h2>
    <form className="phase-form" onSubmit={create}>
      <div className="phase-form-grid">
        <Select title={l("planKey")} value={form.planKey} change={v=>change("planKey",v)}
          options={["starter","professional","business"].map(id=>({id,label:l(id)}))}/>
        <Select title={l("period")} value={form.billingPeriod} change={v=>change("billingPeriod",v)}
          options={["monthly","annual"].map(id=>({id,label:l(id)}))}/>
        <Input title={l("label")} value={form.label} change={v=>change("label",v)} required/>
        {(["priceAfn","staffLimit","branchLimit","trialDays","graceDays"] as const).map(key=>
          <Input key={key} title={l(key==="priceAfn"?"amount":key)} value={form[key]}
            type="number" change={v=>change(key,v)} required/>)}
      </div>
      <InlineAlert>{l("preview")}</InlineAlert>
      <button className="btn btn-primary" disabled={busy}>{l("createPlan")}</button>
    </form>
  </section>
  <section className="card panel"><h2>{l("plans")}</h2>
    {!data?<InlineAlert>{l("loading")}</InlineAlert>:!data.plans?.length?<Empty>{l("noPlans")}</Empty>:
      <Rows>{data.plans.map((p:any)=><div className="phase-row phase-list-item" key={p.id}>
        <div><strong>{p.label}</strong> · v{p.version} · {l(p.billingPeriod)}
          <p className="muted">{currency(p.priceAfn)} · {p.staffLimit} {l("staff")} · {p.trialDays} {l("trial")}</p></div>
        <div className="phase-actions"><Status value={p.active?"active":"cancelled"} l={l}/>
          <button className="btn btn-secondary" onClick={()=>toggle(p)}>{l(p.active?"deactivate":"activate")}</button></div>
      </div>)}</Rows>}
  </section>
  {message&&<Alert message={message} ok/>}{failure&&<Alert message={failure}/>}
 </div>;
}
function AdminSubscriptions(){
 const l=useText();
 const {data:subs,error,refresh}=useResource("/admin/subscriptions");
 const {data:payments,refresh:reload}=useResource("/admin/invoices");
 const [status,setStatus]=useState("trialing");
 const [reason,setReason]=useState(""),[confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[message,setMessage]=useState("");
 async function decide(id:string,action:string){
  setBusy(true);setFailure("");setMessage("");
  try{
    await send("/admin/invoices/"+id+"/decision","POST",{action,reason,confirmation});
    reload();refresh();setMessage(l("success"));setReason("");setConfirmation("");
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 if(error)return <DataError message={error} retry={refresh}/>;
 return <div><h1 className="phase-title">{l("titleSubs")}</h1>
  <div className="phase-tabs" role="tablist" aria-label={l("status")}>
    {["trialing","active","grace","expired","cancelled"].map(s=><button key={s} role="tab" aria-selected={status===s}
      className={status===s?"current":""} onClick={()=>setStatus(s)}>{l(s==="grace"?"graceState":s)}</button>)}
  </div>
  <section className="card panel"><h2>{l("subscriptions")}</h2>
    {!subs?<InlineAlert>{l("loading")}</InlineAlert>:subs.subscriptions?.filter((x:any)=>x.effectiveStatus===status).length?
      <Rows>{subs.subscriptions.filter((x:any)=>x.effectiveStatus===status).map((s:any)=>
        <a href={"/admin/clinics/"+s.clinicId} className="phase-row phase-list-item" key={s.clinicId}>
          <div><strong>{s.clinicName}</strong><p className="muted">{short(s.trialEndsAt||s.currentPeriodEndsAt)}</p></div>
          <Status value={s.effectiveStatus} l={l}/>
        </a>)}</Rows>:<Empty>{l("noRecords")}</Empty>}
  </section>
  <section className="card panel"><h2>{l("payments")}</h2>
    {!payments?<InlineAlert>{l("loading")}</InlineAlert>:!payments.invoices?.length?<Empty>{l("noRecords")}</Empty>:
      <Rows>{payments.invoices.map((i:any)=><div key={i.id} className="phase-payment-item">
        <div className="phase-row">
          <div><strong>{i.clinicName}</strong> · {currency(i.amountAfn)}
            <p className="muted">{short(i.createdAt)} · <bdi>{i.evidenceReference}</bdi></p></div>
          <Status value={i.status} l={l}/>
        </div>
        {i.status==="awaiting"&&<div className="phase-form">
          <Input title={l("reason")} value={reason} change={setReason} required/>
          <Input title={l("confirmReference")} value={confirmation} change={setConfirmation}/>
          <div className="phase-actions">
            <button className="btn btn-primary" onClick={()=>decide(i.id,"confirm")}
              disabled={busy||reason.trim().length<5||confirmation!==i.evidenceReference}>{l("verifyPayment")}</button>
            <button className="btn btn-secondary" onClick={()=>decide(i.id,"reject")}
              disabled={busy||reason.trim().length<5}>{l("rejectPayment")}</button>
          </div>
        </div>}
      </div>)}</Rows>}
  </section>
  {message&&<Alert message={message} ok/>}{failure&&<Alert message={failure}/>}
 </div>;
}
export function PublicPlans({mode="pricing"}:{mode?:"pricing"|"for-clinics"}){
 const l=useText();
 const {data,error,refresh}=useResource("/public/plans");
 return <div className="page-narrow phase-pricing"><h1>{mode==="pricing"?l("plans"):l("clinic")}</h1>
  <p className="lead">{l("features")}</p>
  {error?<DataError message={error} retry={refresh}/>:data?<PlanCards readonly plans={data.plans||[]} selected="" onSelect={()=>{}}/>:
    <InlineAlert>{l("loading")}</InlineAlert>}
  <p className="phase-actions"><a href="/clinic/signup" className="btn btn-primary">{l("newClinic")}</a>
   <a href="/clinic/login" className="btn btn-secondary">{l("continue")}</a></p>
  <InlineAlert>{l("verifiedNote")}</InlineAlert>
 </div>;
}
