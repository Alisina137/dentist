"use client";
import React,{useEffect,useState} from "react";
import {CareIcon,usePreferences,InlineAlert} from "./index";
import {useClinicWorkspaceSession} from "./clinic-shell-context";
import {ClinicLoadingState} from "./clinic-feedback";
import {clinicQualityChecks,clinicQualitySummary,clinicQualityOverview,clinicQualityStatus,
 type QualitySnapshot,type QualityCheck,type OperationSummary,
 type StaffSecuritySummary,type ChannelSummary,type AppointmentSummary}
 from "./clinic-quality-model";

type Slot="operations"|"staff"|"channels"|"appointments";
type Status="ready"|"loading"|"auth"|"forbidden"|"unavailable";
type Panel={key:string;data:QualitySnapshot;state:Record<Slot,Status>;syncedAt:string|null};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const words={
 en:{
  eyebrow:"CLINIC QUALITY & SAFETY",title:"Operational readiness checks",
  intro:"Review live clinic setup and access signals before running daily workflows.",
  private:"Read-only • authorized clinic staff • no patient or clinical records",
  notApproval:"These checks are operational hints, not medical certification or approval to launch healthcare services.",
  notConfigured:"Action needed",unknown:"Not checked",complete:"Configured",
  ready:"Checks completed",incomplete:"Needs attention",refresh:"Run checks again",
  scope:"Selected clinic",status:"Clinic registration status",staff:"Staff security",
  overview:"Live operational signals",passed:"Configured checks",action:"Items needing attention",
  unknownCount:"Unverified checks",total:"Checks available",
  setup:"Clinic configuration",setupHelp:"Actual data returned by the clinic's private API.",
  services:"Active services",resources:"Active dental chairs",
  clinicHours:"Clinic open days",dentistHours:"Dentists with configured hours",
  staffMfa:"Active staff without MFA",email:"Email delivery channel",
  resourcesHelp:"Chairs are needed for procedures requiring a chair.",
  clinicHoursHelp:"Configure operating hours before accepting scheduled visits.",
  staffMfaHelp:"Review MFA for active staff. This is guidance; the server enforces protected operations.",
  emailHelp:"SMTP setup is required for email messages; SMS and push are not offered.",
  servicesHelp:"Add real dental services and base prices.",
  dentistHoursHelp:"Assign valid provider hours; calendar gaps alone do not prove slot availability.",
  open:"Review settings",noValue:"—",count:"Current",
  today:"Appointments scheduled today",week:"Scheduled in next 7 days",
  activeStaff:"Active staff accounts",failed:"Failed delivery attempts",
  failedHint:"Failures among the latest 100 events, not a lifetime count.",
  none:"No recent delivery events",synced:"Last checked",
  partial:"Some checks could not be completed. Unknown does not mean passed.",
  access:"Your access changed. Sign in again and confirm your clinic role.",
  forbidden:"This data is not available to your current clinic role.",
  unavailable:"Unable to reach this private service. Check server/database connectivity and retry.",
  overviewError:"No live operational metrics are available for this clinic.",
  ownerOnly:"Only active clinic owners and managers can view these diagnostics.",
  review:"Human approval still required",
  reviewHelp:"The following require real-world verification and cannot be marked complete by this screen.",
  clinical:"Clinical credential and patient-safety review",
  privacyReview:"Privacy, consent and retention review",
  tests:"Role-based appointment, billing and booking test on real devices",
  backup:"Restore drill, security test and incident-response signoff",
  legal:"Independent local regulatory and medical approval",
  pending:"Human review pending",
  links:"Related workspaces",calendar:"Calendar",notifications:"Notification status",
  finance:"Finance",security:"Security & access",reports:"Reports",
  login:"Sign in to clinic",accessHelp:"The clinic role must be confirmed by the server."
 },
 "fa-AF":{
  eyebrow:"کیفیت و امنیت کلینیک",title:"بررسی آمادگی عملیاتی",
  intro:"پیش از فعالیت روزانه، تنظیمات و وضعیت دسترسی کلینیک را با معلومات زنده بررسی کنید.",
  private:"فقط خواندنی • کارمندان مجاز • بدون معلومات طبی و مریض",
  notApproval:"این بررسی‌ها راهنمای عملیات است، نه تصدیق صحی یا مجوز آغاز خدمات طبی.",
  notConfigured:"نیاز به اقدام",unknown:"بررسی نشده",complete:"تنظیم شده",
  ready:"بررسی‌ها تکمیل شد",incomplete:"نیاز به توجه",refresh:"بررسی دوباره",
  scope:"کلینیک انتخاب‌شده",status:"حالت ثبت کلینیک",staff:"امنیت کارمندان",
  overview:"شاخص‌های عملیاتی زنده",passed:"تنظیمات آماده",action:"موارد نیازمند اقدام",
  unknownCount:"موارد بررسی‌نشده",total:"مجموع بررسی‌ها",
  setup:"تنظیمات کلینیک",setupHelp:"اطلاعات واقعی از سرور خصوصی کلینیک دریافت می‌شود.",
  services:"خدمات فعال",resources:"چوکی‌های فعال",
  clinicHours:"روزهای کاری کلینیک",dentistHours:"داکتران دارای ساعات کاری",
  staffMfa:"کارمندان فعال بدون تأیید دو مرحله‌ای",email:"کانال ارسال ایمیل",
  resourcesHelp:"برای خدمات نیازمند چوکی باید چوکی موجود باشد.",
  clinicHoursHelp:"پیش از پذیرش نوبت، ساعات کاری را تنظیم کنید.",
  staffMfaHelp:"وضعیت تأیید دو مرحله‌ای کارمندان را ببینید. صلاحیت عمل توسط سرور کنترول می‌شود.",
  emailHelp:"برای ارسال ایمیل باید SMTP تنظیم گردد؛ پیامک و پوش فعال نیست.",
  servicesHelp:"خدمات واقعی و قیمت را اضافه کنید.",
  dentistHoursHelp:"ساعات داکتر را تنظیم کنید؛ جای خالی تقویم به معنی وقت قطعی نیست.",
  open:"بررسی تنظیمات",noValue:"—",count:"مقدار فعلی",
  today:"ملاقات‌های برنامه‌ریزی‌شدۀ امروز",week:"ملاقات‌های ۷ روز آینده",
  activeStaff:"حساب‌های فعال",failed:"تلاش‌های ناکام ارسال",
  failedHint:"ناکامی میان ۱۰۰ رویداد اخیر، نه کل تاریخچه.",
  none:"رویداد ارسالی موجود نیست",synced:"آخرین بررسی",
  partial:"بعضی موارد قابل بررسی نبود؛ نامعلوم به معنی موفق نیست.",
  access:"دسترسی شما تغییر کرده؛ دوباره وارد شوید و نقش را بررسی کنید.",
  forbidden:"این معلومات برای نقش فعلی شما مجاز نیست.",
  unavailable:"سرور خصوصی در دسترس نیست؛ اتصال و دیتابیس را بررسی کنید.",
  overviewError:"آمار عملیاتی زنده در دسترس نیست.",
  ownerOnly:"فقط مالک یا مدیر فعال کلینیک می‌تواند این بخش را ببیند.",
  review:"تأیید انسانی هنوز لازم است",
  reviewHelp:"موارد زیر باید در واقعیت تأیید شوند و در این صفحه تکمیل نمی‌شوند.",
  clinical:"تأیید مدارک طبی و مصئونیت مریض",
  privacyReview:"بررسی حریم خصوصی، رضایت و نگهداری",
  tests:"آزمایش واقعی نوبت‌دهی، مالی و صلاحیت کاربران",
  backup:"آزمایش بازیابی، امنیت و پاسخ به رویداد",
  legal:"تأیید مستقل مقرراتی و طبی افغانستان",
  pending:"در انتظار تأیید انسانی",
  links:"بخش‌های مرتبط",calendar:"تقویم",notifications:"حالت ارسال",
  finance:"مالی",security:"امنیت و دسترسی",reports:"گزارش‌ها",
  login:"ورود کلینیک",accessHelp:"نقش کلینیک باید توسط سرور تأیید شود."
 },
 "ps-AF":{
  eyebrow:"د کلینیک کیفیت او خوندیتوب",title:"د کاري چمتووالي کتنه",
  intro:"د ورځنیو چارو تر پیل مخکې رښتینې تنظیمات او لاسرسی وګورئ.",
  private:"یوازې لوستل • مجاز کارکوونکي • د ناروغ شخصي یا طبي معلومات نشته",
  notApproval:"دا یوازې د عملیاتو لارښوونې دي، طبي تصدیق یا د خدماتو د پیل اجازه نه ده.",
  notConfigured:"اقدام غواړي",unknown:"نه دی کتل شوی",complete:"تنظیم شوی",
  ready:"کتنې بشپړې شوې",incomplete:"پاملرنه غواړي",refresh:"بیا وګورئ",
  scope:"ټاکل شوی کلینیک",status:"د ثبت حالت",staff:"د کارکوونکو امنیت",
  overview:"ژوندي عملي شمېرې",passed:"چمتو تنظیمات",action:"د اقدام وړ موارد",
  unknownCount:"نه ارزول شوي",total:"ټولې کتنې",
  setup:"د کلینیک تنظیمات",setupHelp:"رښتینې شمېرې د کلینیک له شخصي سرور څخه دي.",
  services:"فعال خدمتونه",resources:"فعالې څوکۍ",
  clinicHours:"د کلینیک کاري ورځې",dentistHours:"د ډاکټرانو کاري وختونه",
  staffMfa:"فعال کارکوونکي بې له دوه پړاوه تاییده",email:"د ایمیل کانال",
  resourcesHelp:"هغه خدمتونه چې څوکۍ غواړي، څوکۍ ته اړتیا لري.",
  clinicHoursHelp:"تر لیدنو مخکې د کلینیک کاري وختونه تنظیم کړئ.",
  staffMfaHelp:"د فعالو کارکوونکو دوه پړاوه تایید وګورئ؛ سرور د لاسرسي اجازه ټاکي.",
  emailHelp:"د ایمیل لپاره SMTP اړین دی؛ SMS او push نشته.",
  servicesHelp:"رښتیني خدمتونه او بیې زیاتې کړئ.",
  dentistHoursHelp:"د ډاکټر وختونه تنظیم کړئ؛ تش مهالوېش قطعي خالي وخت نه دی.",
  open:"تنظیمات وګورئ",noValue:"—",count:"اوسنی شمېر",
  today:"د نن لپاره ټاکلې لیدنې",week:"راتلونکې ۷ ورځې لیدنې",
  activeStaff:"فعال کارکوونکي",failed:"ناکامې خبرتیاوې",
  failedHint:"ناکامۍ یوازې د وروستیو ۱۰۰ پېښو له منځه، نه ټول تاریخ.",
  none:"د خبرتیا پېښې نشته",synced:"وروستۍ کتنه",
  partial:"ځینې کتنې ونشوې؛ نامعلوم د بریا معنی نه لري.",
  access:"لاسرسی بدل شوی؛ بیا ننوزئ او خپل رول وګورئ.",
  forbidden:"دا معلومات ستاسو رول ته نشته.",
  unavailable:"شخصي سرور ته لاسرسی نشته؛ شبکه او ډیټابېس وګورئ.",
  overviewError:"رښتینې شمېرې نشته.",
  ownerOnly:"یوازې د کلینیک فعال مالک او مدیر دا کتنې لیدلای شي.",
  review:"د انسان تایید لا اړین دی",
  reviewHelp:"دا موارد باید په واقعي نړۍ کې وکتل شي او په دې پاڼه نه بشپړېږي.",
  clinical:"د طبي سندونو او د ناروغ خوندیتوب کتنه",
  privacyReview:"محرمیت، رضایت او ساتنې کتنه",
  tests:"د رولونو، لیدنو او مالي چارو په وسایلو ازموینه",
  backup:"د بېرته راګرځولو، امنیت او پېښو د ځواب ازموینه",
  legal:"خپلواک قانوني او طبي تایید",
  pending:"انساني کتنې ته منتظر",
  links:"اړوند برخې",calendar:"مهالوېش",notifications:"د خبرتیا حالت",
  finance:"مالي چارې",security:"امنیت او لاسرسی",reports:"راپورونه",
  login:"کلینیک ته ننوتل",accessHelp:"د کلینیک رول د سرور له خوا تاییدېږي."
 }
} as const;
const route=(cid:string,path:string)=>path+"?"+new URLSearchParams({clinic:cid});
const slots:Slot[]=["operations","staff","channels","appointments"];
const errors:Record<Status,string>={ready:"",loading:"",auth:"access",
 forbidden:"forbidden",unavailable:"unavailable"};
function QualityBadge({state,text}:{state:"pass"|"action"|"unknown";text:string}){
 return <span className={"clinic-quality-badge is-"+state}>
  <CareIcon name={state==="pass"?"check":state==="action"?"about":"clock"} size={16}/>{text}
 </span>;
}
async function readPrivate<T>(path:string,signal:AbortSignal):Promise<T>{
 const response=await fetch(API+path,{credentials:"include",cache:"no-store",
  signal,headers:{Accept:"application/json"}});
 if(!response.ok)throw Object.assign(new Error("DATA_UNAVAILABLE"),{status:response.status});
 const kind=response.headers.get("content-type")||"";
 if(!kind.toLowerCase().includes("application/json"))throw new Error("NOT_JSON");
 return await response.json() as T;
}
export function ClinicQualityPortal(){
 const session=useClinicWorkspaceSession();
 const {locale}=usePreferences();
 const copy=words[locale as keyof typeof words]||words.en;
 const [revision,setRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<Panel|null>(null);
 const space=session?.space;
 const cid=space?.clinicId||"";
 const authorized=Boolean(space&&(space.role==="owner"||space.role==="manager"));
 const current=snapshot?.key===cid?snapshot:null;
 useEffect(()=>{
  if(!authorized||!cid){setSnapshot(null);return;}
  const controller=new AbortController();
  const empty:QualitySnapshot={operations:null,staff:null,channels:null,appointments:null};
  const pending:Record<Slot,Status>={operations:"loading",staff:"loading",
   channels:"loading",appointments:"loading"};
  setSnapshot({key:cid,data:empty,state:pending,syncedAt:null});
  const prefix=encodeURIComponent(cid);
  const paths:Record<Slot,string>={
   operations:"/v1/operations/clinics/"+prefix+"/summary",
   staff:"/v1/team/clinics/"+prefix+"/security",
   channels:"/v1/booking/clinics/"+prefix+"/notifications",
   appointments:"/v1/appointments/clinics/"+prefix+"/overview"
  };
  const timeout=window.setTimeout(()=>controller.abort(),12500);
  const checks=slots.map(async slot=>{
   try{
    const payload=await readPrivate<unknown>(paths[slot],controller.signal);
    if(controller.signal.aborted)return;
    setSnapshot(old=>!old||old.key!==cid?old:{
     ...old,data:{...old.data,[slot]:payload},state:{...old.state,[slot]:"ready"}
    });
   }catch(e){
    if(controller.signal.aborted)return;
    const state=clinicQualityStatus(
     typeof e==="object"&&e&&"status" in e?Number(e.status):0);
    setSnapshot(old=>!old||old.key!==cid?old:{
     ...old,state:{...old.state,[slot]:state}
    });
   }
  });
  void Promise.all(checks).then(()=>{
   if(controller.signal.aborted)return;
   setSnapshot(old=>!old||old.key!==cid?old:{
    ...old,syncedAt:new Date().toISOString()
   });
  }).finally(()=>window.clearTimeout(timeout));
  return()=>{controller.abort();window.clearTimeout(timeout);};
 },[cid,authorized,revision]);
 if(!session||!space)return <div className="card panel">
  <InlineAlert kind="warning">{copy.accessHelp}</InlineAlert>
  <a className="btn btn-secondary" href="/clinic">{copy.login}</a>
 </div>;
 if(!authorized)return <div className="card panel">
  <InlineAlert kind="warning">{copy.ownerOnly}</InlineAlert>
 </div>;
 const data=current?.data??{operations:null,staff:null,channels:null,appointments:null};
 const checks=clinicQualityChecks(data,cid);
 const score=clinicQualitySummary(checks),overview=clinicQualityOverview(data);
 const pending=!current||slots.some(slot=>current.state[slot]==="loading");
 const failed=slots.filter(slot=>current&&["auth","forbidden","unavailable"].includes(current.state[slot]));
 const label=(check:QualityCheck)=>copy[check.id];
 const help=(check:QualityCheck)=>copy[(check.id+"Help") as keyof typeof copy]||"";
 const time=(value:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Kabul",
  dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
 return <div className="clinic-quality-workspace">
  <header className="clinic-quality-hero">
   <div><span className="clinic-quality-eyebrow">
    <CareIcon name="shield-check" size={17}/>{copy.eyebrow}</span>
    <h1>{copy.title}</h1><p>{copy.intro}</p>
    <div className="clinic-quality-private"><CareIcon name="shield-check" size={16}/>
     {copy.private}</div>
   </div>
   <div className="clinic-quality-current">
    <span>{copy.scope}</span><strong>{space.clinicName}</strong>
    <small>{copy.status}: {space.clinicStatus}</small>
   </div>
  </header>
  <div className="clinic-quality-warning" role="note">
   <CareIcon name="about" size={21}/><p>{copy.notApproval}</p>
  </div>
  <section className="clinic-quality-metrics" aria-label={copy.overview}>
   {([
    {label:copy.passed,value:score.passed,icon:"check"},
    {label:copy.action,value:score.action,icon:"about"},
    {label:copy.unknownCount,value:score.unknown,icon:"clock"},
    {label:copy.total,value:score.total,icon:"layers"}
   ] as const).map(item=><article className="clinic-quality-metric" key={item.label}>
    <span className="clinic-quality-metric-icon">
     <CareIcon name={item.icon} size={20}/></span>
    <strong>{item.value}</strong><span>{item.label}</span>
   </article>)}
  </section>
  <div className="clinic-quality-layout">
   <section className="clinic-quality-panel" aria-labelledby="quality-checks-title">
    <div className="clinic-quality-panel-head">
     <div><h2 id="quality-checks-title">{copy.setup}</h2><p>{copy.setupHelp}</p></div>
     <button type="button" className="btn btn-secondary"
      disabled={pending} onClick={()=>setRevision(v=>v+1)}>
      <CareIcon name="activity" size={17}/>{copy.refresh}</button>
    </div>
    {pending&&<ClinicLoadingState label={copy.intro} variant="rows"/>}
    {failed.length>0&&<div className="clinic-quality-issues" role="status">
     <CareIcon name="about" size={18}/><div><strong>{copy.partial}</strong>
      {failed.map(slot=><p key={slot}>{copy[errors[current!.state[slot]] as keyof typeof copy]}</p>)}
     </div></div>}
    {!pending&&<div className="clinic-quality-completion" aria-live="polite">
     <div><strong>{score.complete?copy.ready:copy.incomplete}</strong>
      <span>{score.passed} / {score.total} {copy.passed}</span></div>
     <div role="progressbar" aria-valuemin={0} aria-valuemax={score.total}
      aria-valuenow={score.passed} aria-label={copy.passed}>
      <span style={{width:(score.total?score.passed/score.total*100:0)+"%"}}/></div>
    </div>}
    <div className="clinic-quality-checks">
     {checks.map(check=><article key={check.id} className="clinic-quality-check">
      <span className="clinic-quality-check-icon">
       <CareIcon name={check.state==="pass"?"check":
        check.state==="action"?"about":"clock"} size={20}/></span>
      <div><h3>{label(check)}</h3><p>{help(check)}</p>
       {check.current!==null&&<small>{copy.count}: {check.current}
        </small>}</div>
      <div className="clinic-quality-check-actions">
       <QualityBadge state={check.state} text={copy[check.state==="pass"?
        "complete":check.state==="action"?"notConfigured":"unknown"]}/>
       <a className="clinic-quality-check-link" href={check.href}>
        {copy.open} <CareIcon name="arrow" size={15}/></a>
      </div>
     </article>)}
    </div>
   </section>
   <aside className="clinic-quality-rail">
    <section className="clinic-quality-panel">
     <h2>{copy.overview}</h2><div className="clinic-quality-signal-list">
      {([
       {label:copy.today,value:overview.today},
       {label:copy.week,value:overview.week},
       {label:copy.activeStaff,value:overview.activeStaff},
       {label:copy.failed,value:overview.failedDeliveries}
      ] as const).map(signal=><div key={signal.label} className="clinic-quality-signal">
       <span>{signal.label}</span><strong>{signal.value??copy.noValue}</strong></div>)}
     </div>
     <p className="clinic-quality-signal-hint">{copy.failedHint}</p>
     {current?.syncedAt&&<p className="clinic-quality-synced">
      <CareIcon name="activity" size={15}/>{copy.synced}: {time(current.syncedAt)}</p>}
    </section>
    <section className="clinic-quality-panel">
     <h2>{copy.review}</h2><p>{copy.reviewHelp}</p>
     <div className="clinic-quality-human">
      {[copy.clinical,copy.privacyReview,copy.tests,copy.backup,copy.legal].map(item=>
       <div key={item}><CareIcon name="clock" size={16}/>
        <span>{item}</span><small>{copy.pending}</small></div>)}
     </div>
    </section>
    <section className="clinic-quality-panel">
     <h2>{copy.links}</h2><div className="clinic-quality-shortcuts">
      {([
       [copy.calendar,"/clinic/appointments","calendar"],
       [copy.notifications,"/clinic/settings/notifications","mail"],
       [copy.finance,"/clinic/finance","receipt"],
       [copy.security,"/clinic/settings/security","shield-check"],
       [copy.reports,"/clinic/reports","chart-columns"]
      ] as const).map(([label,path,icon])=>
       <a key={path} href={route(cid,path)}>
        <CareIcon name={icon} size={18}/>{label}<CareIcon name="arrow" size={16}/>
       </a>)}
     </div>
    </section>
   </aside>
  </div>
 </div>;
}
