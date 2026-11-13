
"use client";
import React, { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authClient, AccountStatus, InlineAlert, usePreferences, LocaleControls } from "./index";

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
  patients:"Patients",search:"Search clinics",filter:"Search",dashboard:"Dashboard",clinics:"Clinics",clinic:"Clinic",onboarding:"Clinic setup",settings:"Clinic settings",
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
  operational:"Dentists, chairs and services will be configured in the next development phases.",
  verifiedNote:"Clinic approval does not publish a dentist listing or verify a dentist.",
  awaitingReview:"Your submission is awaiting human review. You can see the status here.",
  privacy:"Verification documents remain private and are accessed only by authorized reviewers.",
  titlePlans:"Manage versioned subscription plans",titleSubs:"Review subscriptions and payments",
  titleClinics:"Clinic verification queue",titleSettings:"Edit clinic information",
  titleDashboard:"Clinic overview",reviewer:"Reviewer",noSetup:"Start with your clinic registration.",
  preview:"Review the current plan price and billing period before requesting payment.",
  signout:"Sign out",failed:"Request failed",success:"Changes saved",loading:"Loading...",
  errorAuth:"Please sign in to access this workspace.",pendingOps:"Further office setup is not available until the next phase.",
  nextAction:"Next action",privacyGate:"No patient or dental records are available at this stage."
 },
 "fa-AF":{
  patients:"مریضان",search:"جستجوی کلینیک‌ها",filter:"جستجو",dashboard:"داشبورد",clinics:"کلینیک‌ها",clinic:"کلینیک",onboarding:"ثبت کلینیک",settings:"تنظیمات کلینیک",
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
  operational:"داکتران، چوکی‌ها و خدمات در مراحل بعدی تنظیم می‌شوند.",
  verifiedNote:"تأیید کلینیک به‌معنی نشر عمومی یا تأیید داکتر نیست.",
  awaitingReview:"ثبت شما در انتظار بررسی انسانی است.",privacy:"اسناد تنها برای بررسی‌کنندگان مجاز قابل دسترسی است.",
  titlePlans:"مدیریت پلن‌های نسخه‌دار",titleSubs:"بررسی اشتراک‌ها و پرداخت‌ها",
  titleClinics:"صف بررسی کلینیک",titleSettings:"ویرایش معلومات کلینیک",titleDashboard:"نمای کلی کلینیک",
  reviewer:"بررسی‌کننده",noSetup:"ثبت کلینیک را آغاز کنید.",
  preview:"پیش از درخواست، مبلغ و دوره پرداخت را بررسی کنید.",signout:"خروج",failed:"درخواست ناموفق",
  success:"ذخیره شد",loading:"در حال بارگیری...",errorAuth:"برای دسترسی وارد شوید.",
  pendingOps:"تنظیمات بیشتر کلینیک در مراحل بعدی فعال می‌شود.",nextAction:"قدم بعدی",
  privacyGate:"در این مرحله سوابق مریضان و دندان وجود ندارد."
 },
 "ps-AF":{
  patients:"ناروغان",search:"کلینیکونه ولټوئ",filter:"لټون",dashboard:"ډشبورډ",clinics:"کلینیکونه",clinic:"کلینیک",onboarding:"د کلینیک ثبت",settings:"د کلینیک تنظیمات",
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
  operational:"ډاکټران، چوکۍ او خدمتونه په راتلونکو پړاوونو کې جوړېږي.",
  verifiedNote:"د کلینیک تایید د ډاکټر تایید یا عامه خپرونه نه ده.",
  awaitingReview:"ستاسو غوښتنه د انساني کتنې په تمه ده.",
  privacy:"سندونه یوازې مجاز کتونکو ته ښکاري.",titlePlans:"د پلانونو مدیریت",
  titleSubs:"د ګډونونو او تادیو کتنه",titleClinics:"د کلینیکونو د تایید کتار",
  titleSettings:"د کلینیک معلومات سمول",titleDashboard:"د کلینیک لنډیز",
  reviewer:"کتونکی",noSetup:"خپل کلینیک ثبت کړئ.",preview:"مخکې له تادیې بیه او موده وګورئ.",
  signout:"وتل",failed:"غوښتنه ناکامه شوه",success:"خوندي شو",loading:"بارېږي...",
  errorAuth:"لومړی خپل حساب ته ننوځئ.",pendingOps:"د کلینیک نور کارونه وروسته فعالېږي.",
  nextAction:"راتلونکی ګام",privacyGate:"د ناروغانو ریکارډونه لا نشته."
 }
};
type View="dashboard"|"onboarding"|"settings"|"subscription"|"clinics"|"review"|"plans"|"subscriptions";
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
    ["dashboard","/clinic"],["onboarding","/clinic/onboarding"],["staff","/clinic/staff"],["patients","/clinic/patients"],
    ["accessSecurity","/clinic/settings/security"],["settings","/clinic/settings"],
    ["subscription","/clinic/settings/subscription"]
  ]:[["dashboard","/admin"],["clinics","/admin/clinics"],["subscriptions","/admin/subscriptions"],["plans","/admin/plans"]];
  const active=view==="review"?"clinics":view;
  return <div className="work-layout phase-layout">
    <aside className="card side-panel">
      <div className="pill">{audience==="clinic"?l("clinic"):l("verification")}</div>
      <nav className="side-nav" style={{marginBlockStart:18}} aria-label={l("dashboard")}>
        {nav.map(([key,link])=><a key={key} href={link} aria-current={active===key?"page":undefined}>{l(key)}</a>)}
      </nav>
      <div className="phase-sidebar-bottom"><LocaleControls/></div>
    </aside>
    <section className="work-content">
      <header className="work-heading phase-work-heading">
        <div><span className="pill">DandanLink · Phase 02</span><p className="muted phase-user">{name}</p></div>
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
    {view==="dashboard"?<Dashboard audience={audience}/>:view==="onboarding"?<Onboarding/>:
      view==="settings"?<ClinicSettings/>:view==="subscription"?<ClinicSubscription/>:
      view==="clinics"?<AdminClinics/>:view==="review"?<AdminReview/>:
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
  </article>;
}
const emptyClinic={
  legalName:"",displayName:"",clinicType:"office",province:"Kabul",city:"Kabul",
  district:"",address:"",phone:"",email:"",licenseNumber:""
};
function OrganizationFields({form,setForm}:{form:any,setForm:(x:any)=>void}){
  const l=useText();
  const change=(key:string)=>(v:string)=>setForm((s:any)=>({...s,[key]:v}));
  return <div className="phase-form-grid">
    <Input title={l("legalName")} value={form.legalName} change={change("legalName")} required/>
    <Input title={l("displayName")} value={form.displayName} change={change("displayName")} required/>
    <Select title={l("clinicType")} value={form.clinicType} change={change("clinicType")}
      options={["solo","office","specialty"].map(id=>({id,label:l(id)}))}/>
    <Input title={l("province")} value={form.province} change={change("province")} required/>
    <Input title={l("city")} value={form.city} change={change("city")} required/>
    <Input title={l("district")} value={form.district} change={change("district")}/>
    <Input title={l("address")} value={form.address} change={change("address")} required/>
    <Input title={l("phone")} value={form.phone} change={change("phone")} type="tel" required/>
    <Input title={l("email")} value={form.email} change={change("email")} type="email" required/>
    <Input title={l("license")} value={form.licenseNumber} change={change("licenseNumber")}/>
  </div>;
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
function Onboarding(){
  const l=useText();
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
    if(!selected){setDetail(null);setForm(emptyClinic);setPlan("");setStage(0);return;}
    send("/clinics/"+selected).then(d=>{setDetail(d);setForm(d.clinic);setPlan(d.clinic.selectedPlanId||"");})
      .catch(e=>setError(e.message));
  },[selected]);
  const reload=async(id:string)=>{const d=await send("/clinics/"+id);setDetail(d);setForm(d.clinic);setPlan(d.clinic.selectedPlanId||"");listRefresh();};
  const canEdit=!detail||["draft","needs_info","rejected"].includes(detail.clinic.status);
  async function save(ev:FormEvent){
    ev.preventDefault();setBusy(true);setError("");setGood("");
    try{
      if(!plan)throw new Error("PLAN_REQUIRED");
      const payload={...form,selectedPlanId:plan};
      const result=selected?await send("/clinics/"+selected,"PATCH",{...payload,revision:detail.clinic.revision}):
        await send("/clinics","POST",payload);
      const id=result.clinic.id;setSelected(id);await reload(id);setGood(l("success"));setStage(2);
      window.history.replaceState(null,"","/clinic/onboarding?clinic="+id);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function upload(){
    if(!file||!selected)return;
    setBusy(true);setError("");setGood("");
    try{
      const result=await fetch(API+"/v1/clinics/"+selected+"/evidence",{
        method:"POST",credentials:"include",
        headers:{"content-type":"application/octet-stream","x-document-kind":"clinic_license","x-file-name":file.name},
        body:file
      });
      const response=await result.json();
      if(!result.ok)throw new Error(response.code||"UPLOAD_FAILED");
      setFile(null);await reload(selected);setGood(l("success"));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function submit(){
    if(!selected)return;
    setBusy(true);setError("");setGood("");
    try{await send("/clinics/"+selected+"/submit","POST",{attested});
      await reload(selected);setGood(l("success"));}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const allPlans=published?.plans||[];
  return <div><div className="phase-row"><div><h1 className="phase-title">{l("onboarding")}</h1>
    <p className="muted">{l("operational")}</p></div>
    {list?.clinics?.length>0&&<Select title={l("chooseClinic")} value={selected} change={setSelected}
      options={list.clinics.map((c:any)=>({id:c.id,label:c.displayName}))}/>}</div>
    {listError&&<DataError message={listError} retry={listRefresh}/>}
    {detail&&<div className="phase-status-strip"><Status value={detail.clinic.status} l={l}/>
      <span>{detail.plan?.label||""} · {l("subscription")}: {l(detail.effectiveStatus)}</span></div>}
    <div className="phase-stepper" role="tablist" aria-label={l("onboarding")}>
      {["organization","choosePlan","review"].map((key,i)=><button key={key} type="button"
        className={stage===i?"current":""} aria-selected={stage===i}
        role="tab" onClick={()=>setStage(i)}>{i+1}. {l(key)}</button>)}
    </div>
    {!canEdit&&<InlineAlert kind="info">{l("awaitingReview")}</InlineAlert>}
    {stage===0&&<section className="card panel">
      <h2>{l("organization")}</h2><form onSubmit={e=>{e.preventDefault();setStage(1);}}>
        <OrganizationFields form={form} setForm={setForm}/>
        <div className="phase-actions"><button className="btn btn-primary" disabled={!canEdit}>{l("continue")}</button></div>
      </form></section>}
    {stage===1&&<section className="card panel"><h2>{l("choosePlan")}</h2>
      <p className="muted">{l("preview")}</p>
      <PlanCards plans={allPlans.filter((p:any)=>!detail||detail.clinic.status==="draft"||p.id===plan)}
        selected={plan} onSelect={setPlan}/>
      <div className="phase-actions"><button className="btn btn-secondary" onClick={()=>setStage(0)}>{l("back")}</button>
        <button className="btn btn-primary" onClick={()=>setStage(2)} disabled={!plan}>{l("continue")}</button></div>
    </section>}
    {stage===2&&<section className="card panel"><h2>{l("review")}</h2>
      <p><strong>{form.displayName||l("newClinic")}</strong> · {form.city}</p>
      <p>{l("plan")}: {allPlans.find((p:any)=>p.id===plan)?.label||detail?.plan?.label||"—"}</p>
      <form onSubmit={save}><div className="phase-actions">
        <button type="button" className="btn btn-secondary" onClick={()=>setStage(1)}>{l("back")}</button>
        <button className="btn btn-primary" disabled={busy||!canEdit||!plan}>{l("save")}</button></div></form>
      {selected&&<div className="phase-upload"><h3>{l("evidence")}</h3><p className="muted">{l("fileHint")}</p>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy||!canEdit}
          onChange={e=>setFile(e.currentTarget.files?.[0]||null)}/>
        <button className="btn btn-secondary" type="button" onClick={upload} disabled={busy||!file||!canEdit}>{l("upload")}</button>
        <h3>{l("uploaded")}</h3>{detail?.documents?.length?<ul>{detail.documents.map((d:any)=>
          <li key={d.id}>{d.fileName} ({Math.round(d.sizeBytes/1024)} KB)</li>)}</ul>:<Empty>{l("noRecords")}</Empty>}
        <p className="muted">{l("privacy")}</p>
        <label className="phase-check"><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/>
          {l("attest")}</label>
        <button className="btn btn-primary" onClick={submit} type="button" disabled={busy||!canEdit||!attested||
          !detail?.documents?.some((d:any)=>d.kind==="clinic_license")}>{l("submit")}</button>
        <InlineAlert>{l("verifiedNote")}</InlineAlert>
      </div>}</section>}
    {good&&<Alert message={good} ok/>}{error&&<Alert message={l("failed")+": "+error}/>}
    {detail?.history?.length>0&&<section className="card panel"><h2>{l("history")}</h2>
      {detail.history.map((h:any,i:number)=><p key={i}>{short(h.createdAt)} · {l(h.action)||h.action} · {h.reason}</p>)}
    </section>}
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
