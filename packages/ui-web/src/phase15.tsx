"use client";
import React,{useEffect,useMemo,useState,type FormEvent} from "react";
import {usePreferences,InlineAlert} from "./index";
import {Shell} from "./phase03";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Lang="en"|"fa-AF"|"ps-AF";
type Slot={startAt:string;endAt:string;dentistId:string;serviceId:string;
 dentistName:string;serviceName:string;priceAfn:number;durationMinutes:number};
type Booking={id:string;clinicId:string;clinicName:string;clinicCity:string;
 clinicAddress:string;clinicPhone:string;appointmentId:string;patientName:string;
 subjectType:string;startAt:string;endAt:string;dentistId:string;serviceId:string;
 serviceName:string;priceAfn:number;status:string;approvalMode:"manual"|"auto";
 revision:number;createdAt:string;cancelUntil:string};
type Clinic={clinic:{id:string;name:string;city:string;address:string};
 profile:{dentists:{id:string;displayName:string;verified:boolean}[];
 services:{id:string;name:string;priceAfn:number;durationMinutes:number}[];
 bookingRules:{approvalMode:"manual"|"auto";horizonDays:number;
 minNoticeHours:number;cancellationHours:number}}};
type Member={id:string;memberType:"minor"|"adult";displayName:string;
 authorizationStatus:string;eligibleForFutureBooking:boolean};
type Link={id:string;clinicId:string;clinicName:string;state:string;requestedAt:string};
type Records={summaries:{id:string;clinicName:string;signedAt:string;reason:string;
 assessment:string;procedures:unknown}[];
 receipts:{id:string;clinicName:string;invoiceNumber:number;totalAfn:number;issuedAt:string}[]};

const vocab:Record<Lang,Record<string,string>>={
 en:{
 title:"Book an appointment",appointments:"My appointments",records:"Shared records",
 clinic:"Clinic",services:"Choose treatment",date:"Choose date and time",
 people:"Who is the appointment for?",review:"Review your request",done:"Request received",
 next:"Continue",back:"Back",confirm:"Confirm booking",tryAgain:"Try again",
 treatment:"Treatment",dentist:"Dentist",day:"Day",time:"Time",
 patient:"Patient",self:"Myself",price:"Estimated fee",noSlot:"No available time on this date",
 noService:"No bookable services are published",login:"Sign in to book an appointment",
 loginHelp:"A verified patient account and completed onboarding are required.",
 family:"Authorized family",consent:"I agree that this clinic can create a new clinic-local registration for this appointment. This does not link any previous medical history.",
 manual:"The clinic will review this request before confirming a time.",
 auto:"Booking is automatically confirmed when the slot is still available.",
 loading:"Loading live availability…",submit:"Submitting…",success:"Your appointment status is",
 receipt:"See appointment details",go:"See my appointments",none:"No appointments found",
 upcoming:"Upcoming",past:"Past",cancelled:"Cancelled",requested:"Awaiting clinic review",
 confirmed:"Confirmed",arrived:"Arrived",in_treatment:"In treatment",completed:"Completed",
 rejected:"Rejected",cancel:"Cancel appointment",reschedule:"Change appointment time",
 reason:"Reason (at least 10 characters)",cancelUntil:"Change or cancel before",
 save:"Save changes",newDate:"New date",check:"Check live times",
 location:"Location",contact:"Contact clinic",history:"This booking uses the clinic's live calendar.",
 online:"Online booking",messages:"Notification delivery",noMessages:"No notifications have been queued",
 requestLink:"Ask clinic to link records",number:"Clinic patient number",linkConsent:"I request separate in-person identity verification. This number alone must not grant access to private records.",
 linkBtn:"Submit verification request",linked:"Record-link requests",revoke:"Revoke access",
 noLinks:"No requests yet",noRecords:"No records have been individually released to you.",
 summaries:"Approved care summaries",receipts:"Released invoices/receipts",
 bookingHelp:"Already booked? Find your clinic's patient number on a receipt or ask at reception.",
 forbidden:"Access requires a verified account and consent.",bad:"Something went wrong",
 saving:"Saving…",linkPending:"Waiting for clinic identity verification",
 secure:"Only specifically approved, signed medical summaries and issued invoices are displayed.",
 clinicQueue:"Booking requests",pending:"Pending",processed:"Processed",
 reviewRecords:"Review eligible clinic records",releaseRecord:"Release to verified patient",
 withdrawRelease:"Withdraw record access",approveIndividual:"I explicitly approve sharing this individual document",
 noReleasable:"No signed summaries or issued receipts eligible for release.",
 accept:"Accept request",reject:"Reject request",proof:"Clinic record identity checks",
 verify:"Verify identity in person",method:"Verification method",
 approveLink:"Approve verified link",rejectLink:"Reject link",selectedPatient:"Clinic patient ID",
 notificationStatus:"Booking email delivery",provider:"SMTP configured",
 noneProcessed:"No requests in this category",signClinic:"Sign in to the clinic workspace",
 overview:"Appointments calendar",settings:"Clinic notifications",details:"Details",
 network:"Network connection is unavailable",noFamily:"No authorized family members available.",
 doctorUnavailable:"This dentist or clinic isn't available for online booking.",
 disclaimer:"All times are Afghanistan local time (Asia/Kabul)."
 },
 "fa-AF":{
 title:"رزرو وقت ملاقات",appointments:"وقت‌های ملاقات من",records:"اسناد شریک‌شده",
 clinic:"کلینیک",services:"انتخاب تداوی",date:"انتخاب تاریخ و ساعت",
 people:"وقت برای کیست؟",review:"بررسی درخواست",done:"درخواست ثبت شد",
 next:"ادامه",back:"بازگشت",confirm:"تأیید درخواست",tryAgain:"دوباره کوشش",
 treatment:"تداوی",dentist:"داکتر",day:"روز",time:"ساعت",
 patient:"مریض",self:"خودم",price:"قیمت تخمینی",noSlot:"در این تاریخ وقت آزاد نیست",
 noService:"خدمات قابل رزرو نشر نشده است",login:"برای رزرو وارد شوید",
 loginHelp:"حساب تأییدشده و تکمیل ثبت نام مریض لازم است.",
 family:"اعضای خانواده مجاز",consent:"موافق هستم که کلینیک برای این وقت یک پرونده جدید بسازد. سابقه طبی قبلی به‌صورت خودکار وصل نمی‌شود.",
 manual:"کلینیک درخواست را بررسی می‌کند و سپس وقت را تأیید می‌کند.",
 auto:"در صورت آزاد بودن وقت، رزرو مستقیم تأیید می‌شود.",
 loading:"در حال دریافت وقت‌های واقعی…",submit:"در حال ثبت…",success:"حالت درخواست شما",
 receipt:"جزئیات وقت",go:"دیدن وقت‌های من",none:"هنوز وقت ملاقات ندارید",
 upcoming:"آینده",past:"گذشته",cancelled:"لغوشده",requested:"در انتظار بررسی کلینیک",
 confirmed:"تأییدشده",arrived:"حاضر",in_treatment:"تحت تداوی",completed:"تکمیل‌شده",
 rejected:"ردشده",cancel:"لغو وقت ملاقات",reschedule:"تغییر وقت ملاقات",
 reason:"دلیل (حداقل ۱۰ حرف)",cancelUntil:"مهلت تغییر یا لغو",
 save:"ثبت تغییرات",newDate:"تاریخ جدید",check:"بررسی وقت‌های واقعی",
 location:"آدرس",contact:"تماس با کلینیک",history:"رزرو از تقسیم اوقات واقعی کلینیک انجام می‌شود.",
 online:"رزرو آنلاین",messages:"ارسال پیام‌ها",noMessages:"پیامی ثبت نشده است",
 requestLink:"درخواست وصل اسناد کلینیک",number:"شماره مریض در کلینیک",linkConsent:"برای تأیید جداگانه هویت حضوری درخواست می‌کنم. این شماره به تنهایی اجازه دسترسی به اسناد محرمانه را نمی‌دهد.",
 linkBtn:"ثبت درخواست بررسی",linked:"درخواست‌های وصل اسناد",revoke:"لغو دسترسی",
 noLinks:"هنوز درخواستی ندارید",noRecords:"هنوز سندی به‌صورت جداگانه برای شما اجازه نشر نگرفته است.",
 summaries:"خلاصه‌های تداوی مجاز",receipts:"فاکتور‌ها و رسید‌های مجاز",
 bookingHelp:"شماره مریض را از رسید یا پذیرش کلینیک دریافت کنید.",
 forbidden:"حساب تأییدشده و رضایت شما لازم است.",bad:"مشکلی پیش آمد",
 saving:"در حال ذخیره…",linkPending:"منتظر تأیید حضوری کلینیک",
 secure:"فقط خلاصه‌های امضاشده و رسیدهایی که جداگانه تأیید شده‌اند نمایش داده می‌شوند.",
 clinicQueue:"درخواست‌های رزرو",pending:"در انتظار",processed:"پردازش‌شده",
 reviewRecords:"بررسی اسناد قابل اشتراک",releaseRecord:"اشتراک با مریض تأییدشده",
 withdrawRelease:"لغو دسترسی سند",approveIndividual:"اشتراک این سند مشخص را به‌صورت جداگانه تأیید می‌کنم",
 noReleasable:"خلاصه امضاشده یا رسید صادرشده قابل اشتراک موجود نیست.",
 accept:"تأیید درخواست",reject:"رد درخواست",proof:"بررسی هویت و اسناد کلینیک",
 verify:"تأیید هویت حضوری",method:"روش تأیید",
 approveLink:"تأیید اتصال",rejectLink:"رد اتصال",selectedPatient:"شناسه مریض در کلینیک",
 notificationStatus:"ارسال ایمیل وقت ملاقات",provider:"سرور ایمیل تنظیم شده",
 noneProcessed:"درخواستی در این بخش نیست",signClinic:"وارد حساب کلینیک شوید",
 overview:"تقویم ملاقات‌ها",settings:"اطلاعیه‌های کلینیک",details:"جزئیات",
 network:"ارتباط با سرور برقرار نشد",noFamily:"عضو مجاز خانواده موجود نیست",
 doctorUnavailable:"رزرو آنلاین برای این داکتر یا کلینیک فعال نیست.",
 disclaimer:"تمام ساعت‌ها به وقت افغانستان (Asia/Kabul) است."
 },
 "ps-AF":{
 title:"د ملاقات وخت اخیستل",appointments:"زما ملاقاتونه",records:"شریک شوي اسناد",
 clinic:"کلینیک",services:"درملنه غوره کړئ",date:"نېټه او وخت غوره کړئ",
 people:"ملاقات د چا لپاره دی؟",review:"غوښتنه وګورئ",done:"غوښتنه ثبت شوه",
 next:"دوام",back:"شاته",confirm:"غوښتنه تایید کړه",tryAgain:"بیا هڅه",
 treatment:"درملنه",dentist:"ډاکټر",day:"ورځ",time:"وخت",
 patient:"ناروغ",self:"زه",price:"اټکلي بیه",noSlot:"په دې نېټه وخت نشته",
 noService:"د بک کولو خدمت نشته",login:"د ملاقات لپاره ننوځئ",
 loginHelp:"تایید شوی حساب او بشپړه نوملیکنه اړینه ده.",
 family:"اجازه لرونکې کورنۍ",consent:"زه منم چې کلینیک د دې ملاقات لپاره نوی ریکارډ جوړ کړي؛ پخواني طبي ریکارډونه په اتومات ډول نه نښلي.",
 manual:"کلینیک به غوښتنه وڅېړي او وخت به تایید کړي.",
 auto:"که وخت خالي وي، ملاقات سمدستي تاییدېږي.",
 loading:"د رښتینو وختونو بارول…",submit:"ثبتېږي…",success:"ستاسو د ملاقات حالت",
 receipt:"د ملاقات جزئیات",go:"زما ملاقاتونه",none:"تر اوسه ملاقات نشته",
 upcoming:"راتلونکي",past:"تېر",cancelled:"لغوه شوي",requested:"د کلینیک تایید ته منتظر",
 confirmed:"تایید شوی",arrived:"راغلی",in_treatment:"تر درملنې لاندې",completed:"بشپړ",
 rejected:"رد شوی",cancel:"ملاقات لغوه کړه",reschedule:"د ملاقات وخت بدل کړه",
 reason:"دلیل (لږترلږه ۱۰ توري)",cancelUntil:"د بدلولو/لغوه کولو وروستی وخت",
 save:"بدلون خوندي کړه",newDate:"نوې نېټه",check:"رښتیني وختونه وګوره",
 location:"پته",contact:"کلینیک سره اړیکه",history:"ملاقات د کلینیک له رښتینې مهالوېش څخه دی.",
 online:"انلاین ملاقات",messages:"د خبرتیا استول",noMessages:"تر اوسه خبرتیا نشته",
 requestLink:"د کلینیک ریکارډونو نښلولو غوښتنه",number:"د کلینیک ناروغ شمېره",linkConsent:"زه د هویت د بېلې مخامخ تایید غوښتنه کوم. دا شمېره یوازې محرم اسناد نه خلاصوي.",
 linkBtn:"غوښتنه ثبت کړه",linked:"د اسنادو د نښلولو غوښتنې",revoke:"لاسرسی لغوه کړه",
 noLinks:"تر اوسه غوښتنه نشته",noRecords:"تر اوسه کوم سند تاسو ته په جلا ډول نه دی خپور شوی.",
 summaries:"تایید شوي د درملنې لنډیزونه",receipts:"تایید شوي رسیدونه",
 bookingHelp:"د ناروغ شمېره له رسید یا د کلینیک له استقبال څخه واخلئ.",
 forbidden:"تایید شوی حساب او ستاسو رضایت پکار دی.",bad:"ستونزه رامنځته شوه",
 saving:"خوندي کېږي…",linkPending:"د کلینیک هویت تایید ته منتظر",
 secure:"یوازې ځانګړي تایید شوي او لاسلیک شوي اسناد ښودل کېږي.",
 clinicQueue:"د ملاقات غوښتنې",pending:"منتظر",processed:"پروسس شوي",
 reviewRecords:"د شریکولو وړ ریکارډونه وڅېړئ",releaseRecord:"تایید شوي ناروغ سره شریک کړئ",
 withdrawRelease:"لاسرسی بېرته واخلئ",approveIndividual:"د همدې سند شریکول په ځانګړي ډول تاییدوم",
 noReleasable:"د شریکولو وړ لاسلیک شوی لنډیز یا صادر شوی رسید نشته.",
 accept:"غوښتنه ومنه",reject:"غوښتنه رد کړه",proof:"د کلینیک د اسنادو هویت",
 verify:"مخامخ هویت تایید کړه",method:"د تایید ډول",
 approveLink:"نښلول تایید کړه",rejectLink:"نښلول رد کړه",selectedPatient:"په کلینیک کې ناروغ پېژند",
 notificationStatus:"د ملاقات ایمیلونه",provider:"ایمیل تنظیم دی",
 noneProcessed:"دلته غوښتنه نشته",signClinic:"د کلینیک حساب ته ننوځه",
 overview:"د ملاقات جدول",settings:"د کلینیک خبرتیاوې",details:"جزئیات",
 network:"د سرور سره اړیکه نشته",noFamily:"د کورنۍ اجازه لرونکی غړی نشته",
 doctorUnavailable:"د دې ډاکټر انلاین ملاقات نشته.",
 disclaimer:"ټول وختونه د افغانستان له وخت سره سم دي (Asia/Kabul)."
 }};
function useWords(){
 const {locale,calendar}=usePreferences(),lang=locale as Lang;
 const words=vocab[lang]||vocab.en;
 const t=(key:string)=>words[key]||vocab.en[key]||key;
 const fmt=(value:unknown,time=false)=>{
  if(!value)return "—";
  const d=new Date(String(value));
  if(!Number.isFinite(d.getTime()))return "—";
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",year:"numeric",
   month:"short",day:"numeric",...(time?{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}:{})}).format(d);
 };
 return {lang,t,fmt};
}
async function api<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const r=await fetch(API+path,{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.code||"NETWORK_UNAVAILABLE"),{status:r.status});
 return data as T;
}
function LinkButton({href,children}:{href:string;children:React.ReactNode}){
 return <a className="p15-button p15-button-secondary" href={href}>{children}</a>;
}
function Banner({text}:{text:string}){return <InlineAlert kind="warning">{text}</InlineAlert>}
function ErrorNote({message}:{message:string}){return message?<InlineAlert kind="error">{message}</InlineAlert>:null}
function Spinner(){return <div className="p15-loading" role="status" aria-label="Loading"><span className="p15-spinner"/></div>}
function Badge({status}:{status:string}){const {t}=useWords();return <span className={"p15-badge p15-status-"+status}>{t(status)}</span>}
function Page({heading,sub,children}:{heading:string;sub?:string;children:React.ReactNode}){
 const {lang}=useWords();
 return <section className="p15-page" dir={lang==="en"?"ltr":"rtl"}>
  <div className="p15-heading"><span className="p15-overline">DandanLink · Patient care</span>
   <h1>{heading}</h1>{sub&&<p>{sub}</p>}</div>{children}</section>;
}
function SafePhone({value}:{value:string}){return /^\+?[0-9\- ]{7,22}$/.test(value)?
 <a href={"tel:"+value.replace(/[^+\d]/g,"")}>{value}</a>:<span>{value}</span>}

export function PatientBookPage({dentistId}:{dentistId:string}){
 const {t,fmt}=useWords();
 const [clinicId,setClinicId]=useState(""),[clinic,setClinic]=useState<Clinic|null>(null);
 const [serviceId,setServiceId]=useState(""),[day,setDay]=useState("");
 const [slots,setSlots]=useState<Slot[]>([]),[selected,setSelected]=useState<Slot|null>(null);
 const [family,setFamily]=useState<Member[]>([]),[profile,setProfile]=useState<any>(null);
 const [subject,setSubject]=useState("self"),[step,setStep]=useState(0);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true),[loadingSlots,setLoadingSlots]=useState(false);
 const [error,setError]=useState(""),[idempotency,setIdempotency]=useState(crypto.randomUUID());
 const [created,setCreated]=useState<Booking|null>(null);
 useEffect(()=>{
  const cid=new URLSearchParams(location.search).get("clinicId")||"";
  setClinicId(cid);
  if(!cid){setError("CLINIC_REQUIRED");setLoading(false);return;}
  Promise.all([api<Clinic>("/v1/discovery/clinics/"+encodeURIComponent(cid)),
   api<any>("/v1/patients/me").catch(()=>null),
   api<any>("/v1/patients/family").catch(()=>({members:[]}))])
   .then(([c,account,people])=>{
    if(!c.profile.dentists.some(x=>x.id===dentistId)){
     setError("PROVIDER_NOT_BOOKABLE");return;
    }
    setClinic(c);setProfile(account);
    setFamily((people.members||[]).filter((m:Member)=>m.eligibleForFutureBooking));
    const first=c.profile.services[0];if(first)setServiceId(first.id);
   }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 },[dentistId]);
 useEffect(()=>{setSelected(null);setSlots([]);setIdempotency(crypto.randomUUID());},[serviceId,day]);
 useEffect(()=>{setIdempotency(crypto.randomUUID());},[subject]);
 useEffect(()=>{
  if(!clinicId||!serviceId||!day)return;
  let active=true;setLoadingSlots(true);setError("");setSelected(null);
  api<{slots:Slot[]}>("/v1/discovery/clinics/"+encodeURIComponent(clinicId)+"/availability?"+
   new URLSearchParams({date:day,dentistId,serviceId}).toString())
   .then(x=>{if(active)setSlots(x.slots||[]);})
   .catch(e=>{if(active){setError(e.message);setSlots([])}})
   .finally(()=>{if(active)setLoadingSlots(false)});
  return()=>{active=false};
 },[clinicId,serviceId,day,dentistId]);
 const choice=clinic?.profile.dentists.find(d=>d.id===dentistId);
 const service=clinic?.profile.services.find(s=>s.id===serviceId);
 const member=family.find(m=>m.id===subject);
 const submit=async()=>{
  if(!clinicId||!selected||!consent)return;
  setBusy(true);setError("");
  try{
   const x=await api<{booking:Booking}>("/v1/booking/requests","POST",{
    clinicId,serviceId,dentistId,startAt:selected.startAt,
    subjectType:subject==="self"?"self":member?.memberType==="minor"?"minor":"adult_delegate",
    dependentId:subject==="self"?null:subject,idempotencyKey:idempotency,bookingConsent:true});
   setCreated(x.booking);setStep(4);
  }catch(e:any){setError(e.message||"BOOKING_UNAVAILABLE");}
  finally{setBusy(false)}
 };
 const dateMin=()=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return p.year+"-"+p.month+"-"+p.day};
 if(loading)return <Page heading={t("title")}><Spinner/></Page>;
 if(!clinic)return <Page heading={t("title")}><ErrorNote message={error||t("doctorUnavailable")}/>
  <LinkButton href="/search">{t("back")}</LinkButton></Page>;
 if(!profile?.registered)return <Page heading={t("title")}><div className="p15-panel">
  <Banner text={t("loginHelp")}/><LinkButton href={"/login?next="+encodeURIComponent("/book/"+dentistId+"?clinicId="+clinicId)}>{t("login")}</LinkButton>
  </div></Page>;
 return <Page heading={t("title")} sub={t("disclaimer")}>
  <div className="p15-topline"><strong>{clinic.clinic.name}</strong><span>{clinic.clinic.city}</span>
   <Badge status={clinic.profile.bookingRules.approvalMode==="auto"?"confirmed":"requested"}/></div>
  <div className="p15-steps" aria-label={t("title")}>{[t("services"),t("date"),t("people"),t("review"),t("done")].map((text,n)=>
   <div key={n} className={"p15-step"+(n===step?" active":n<step?" complete":"")}>
    <span>{n+1}</span><b>{text}</b></div>)}</div>
  <ErrorNote message={error}/>
  <div className="p15-panel">
   {step===0&&<>
    <h2>{t("services")}</h2>{clinic.profile.services.length===0?<Banner text={t("noService")}/>:null}
    <div className="p15-grid">{clinic.profile.services.map(s=>
     <button key={s.id} type="button" onClick={()=>setServiceId(s.id)}
      className={"p15-select-card"+(s.id===serviceId?" chosen":"")}
      aria-pressed={s.id===serviceId}><strong>{s.name}</strong>
      <small>{s.durationMinutes} min</small><span>{s.priceAfn} AFN</span></button>)}</div>
   </>}
   {step===1&&<>
    <h2>{t("date")}</h2>
    <label className="p15-field">{t("day")}<input type="date" value={day} min={dateMin()}
     onChange={e=>setDay(e.target.value)}/></label>
    {loadingSlots?<Spinner/>:day?<div className="p15-slots">{slots.length?slots.map(slot=>
     <button type="button" key={slot.startAt} onClick={()=>setSelected(slot)}
      aria-pressed={selected?.startAt===slot.startAt}
      className={"p15-slot"+(selected?.startAt===slot.startAt?" chosen":"")}>
      {fmt(slot.startAt,true)}</button>):<Banner text={t("noSlot")}/>}</div>:null}
   </>}
   {step===2&&<>
    <h2>{t("people")}</h2>
    <div className="p15-grid"><button type="button" className={"p15-select-card"+(subject==="self"?" chosen":"")}
     onClick={()=>setSubject("self")}>{t("self")} — {profile.profile?.preferredName}</button>
     {family.map(m=><button type="button" key={m.id}
      className={"p15-select-card"+(subject===m.id?" chosen":"")} onClick={()=>setSubject(m.id)}>
      {m.displayName}<small>{m.memberType}</small></button>)}</div>
    <LinkButton href="/account/family">{t("family")}</LinkButton>
   </>}
   {step===3&&<>
    <h2>{t("review")}</h2>
    <dl className="p15-review">
     <div><dt>{t("clinic")}</dt><dd>{clinic.clinic.name}</dd></div>
     <div><dt>{t("dentist")}</dt><dd>{choice?.displayName}</dd></div>
     <div><dt>{t("treatment")}</dt><dd>{service?.name}</dd></div>
     <div><dt>{t("date")}</dt><dd>{fmt(selected?.startAt,true)}</dd></div>
     <div><dt>{t("patient")}</dt><dd>{subject==="self"?profile.profile?.preferredName:member?.displayName}</dd></div>
     <div><dt>{t("price")}</dt><dd>{service?.priceAfn} AFN</dd></div></dl>
    <Banner text={t(clinic.profile.bookingRules.approvalMode)}/>
    <label className="p15-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t("consent")}</label>
   </>}
   {step===4&&created&&<>
    <div className="p15-success-icon">✓</div><h2>{t("done")}</h2>
    <p>{t("success")}: <Badge status={created.status}/></p>
    <p>{fmt(created.startAt,true)} · {created.clinicName}</p>
    <LinkButton href={"/appointments/"+created.id}>{t("receipt")}</LinkButton>
    <LinkButton href="/appointments">{t("go")}</LinkButton>
   </>}
  </div>
  {step<4&&<div className="p15-footer">
   {step>0?<button type="button" className="p15-button p15-button-secondary"
    onClick={()=>{setStep(x=>x-1);setError("")}}>{t("back")}</button>:<LinkButton href={"/clinics/"+clinicId}>{t("back")}</LinkButton>}
   <button type="button" className="p15-button" disabled={busy||
    (step===0&&!serviceId)||(step===1&&!selected)||(step===3&&!consent)}
    onClick={()=>step===3?void submit():setStep(x=>x+1)}>
    {busy?t("submit"):step===3?t("confirm"):t("next")}</button>
  </div>}
 </Page>;
}

function useBookings(){
 const [rows,setRows]=useState<Booking[]>([]),[error,setError]=useState("");
 const [pending,setPending]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setPending(true);
  api<{appointments:Booking[]}>("/v1/booking/my")
   .then(x=>{if(active)setRows(x.appointments||[])})
   .catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setPending(false)});
  return()=>{active=false};
 },[refresh]);
 return {rows,error,pending,reload:()=>{setError("");setRefresh(x=>x+1)}};
}
export function PatientAppointmentsPage(){
 const {t,fmt}=useWords(),{rows,error,pending,reload}=useBookings(),[filter,setFilter]=useState("upcoming");
 const filtered=rows.filter(a=>{
  if(filter==="cancelled")return ["cancelled","rejected","no_show"].includes(a.status);
  if(filter==="past")return ["completed","arrived","in_treatment"].includes(a.status)||
   new Date(a.startAt).getTime()<Date.now()&&!["cancelled","rejected"].includes(a.status);
  return !["cancelled","rejected","completed","no_show"].includes(a.status)&&
   new Date(a.startAt).getTime()>=Date.now();
 });
 return <Page heading={t("appointments")} sub={t("disclaimer")}>
  <nav className="p15-tabs">{["upcoming","past","cancelled"].map(s=>
   <button key={s} aria-current={s===filter?"page":undefined} type="button"
    onClick={()=>setFilter(s)}>{t(s)}</button>)}</nav>
  <ErrorNote message={error}/>
  {pending?<Spinner/>:filtered.length? <div className="p15-list">{filtered.map(a=>
   <a className="p15-appointment" href={"/appointments/"+a.id} key={a.id}>
    <div><strong>{a.clinicName}</strong><p>{a.serviceName} · {a.patientName}</p>
     <small>{fmt(a.startAt,true)}</small></div>
    <Badge status={a.status}/></a>)}</div>:
   <div className="p15-empty"><p>{t("none")}</p><LinkButton href="/search">{t("services")}</LinkButton></div>}
  <div className="p15-footer"><button type="button" className="p15-button p15-button-secondary"
   onClick={reload}>{t("tryAgain")}</button><LinkButton href="/account/records">{t("records")}</LinkButton></div>
 </Page>;
}
export function PatientAppointmentDetailPage({bookingId}:{bookingId:string}){
 const {t,fmt}=useWords(),[item,setItem]=useState<Booking|null>(null);
 const [error,setError]=useState(""),[pending,setPending]=useState(true),[busy,setBusy]=useState(false);
 const [action,setAction]=useState<"cancel"|"reschedule"|null>(null);
 const [why,setWhy]=useState(""),[day,setDay]=useState(""),[slots,setSlots]=useState<Slot[]>([]);
 const [choice,setChoice]=useState<Slot|null>(null);
 const reload=()=>{setPending(true);setError("");
  api<{booking:Booking}>("/v1/booking/my/"+bookingId)
   .then(r=>setItem(r.booking)).catch(e=>setError(e.message))
   .finally(()=>setPending(false))};
 useEffect(reload,[bookingId]);
 useEffect(()=>{if(!item||!day||action!=="reschedule")return;
  let mounted=true;setChoice(null);
  api<{slots:Slot[]}>("/v1/discovery/clinics/"+item.clinicId+"/availability?"+
   new URLSearchParams({date:day,serviceId:item.serviceId,dentistId:item.dentistId}).toString())
   .then(x=>{if(mounted)setSlots(x.slots||[])})
   .catch(e=>{if(mounted)setError(e.message)});
  return()=>{mounted=false};
 },[day,item?.clinicId,item?.serviceId,item?.dentistId,action]);
 async function submit(){
  if(!item||why.trim().length<10||action==="reschedule"&&!choice)return;
  setBusy(true);setError("");
  try{
   await api("/v1/booking/my/"+bookingId+"/"+action,"POST",{
    revision:item.revision,reason:why,startAt:choice?.startAt});
   setAction(null);setWhy("");reload();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 if(pending)return <Page heading={t("details")}><Spinner/></Page>;
 if(!item)return <Page heading={t("details")}><ErrorNote message={error}/><LinkButton href="/appointments">{t("back")}</LinkButton></Page>;
 const editable=["confirmed","requested"].includes(item.status);
 return <Page heading={t("details")} sub={t("disclaimer")}>
  <div className="p15-panel"><div className="p15-topline"><strong>{item.clinicName}</strong><Badge status={item.status}/></div>
   <dl className="p15-review">
    <div><dt>{t("patient")}</dt><dd>{item.patientName}</dd></div>
    <div><dt>{t("treatment")}</dt><dd>{item.serviceName}</dd></div>
    <div><dt>{t("date")}</dt><dd>{fmt(item.startAt,true)}</dd></div>
    <div><dt>{t("price")}</dt><dd>{item.priceAfn} AFN</dd></div>
    <div><dt>{t("location")}</dt><dd>{item.clinicAddress}</dd></div>
    <div><dt>{t("cancelUntil")}</dt><dd>{fmt(item.cancelUntil,true)}</dd></div></dl>
   <SafePhone value={item.clinicPhone}/>
   {editable?<div className="p15-actions">
    <button className="p15-button p15-button-secondary" onClick={()=>setAction("reschedule")}>{t("reschedule")}</button>
    <button className="p15-button p15-button-danger" onClick={()=>setAction("cancel")}>{t("cancel")}</button></div>:null}
  </div>
  {action&&<div className="p15-panel">
   <h2>{t(action)}</h2>{action==="reschedule"&&<>
    <label className="p15-field">{t("newDate")}<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label>
    <div className="p15-slots">{slots.map(s=><button type="button" key={s.startAt}
     className={"p15-slot"+(choice?.startAt===s.startAt?" chosen":"")}
     onClick={()=>setChoice(s)}>{fmt(s.startAt,true)}</button>)}</div>
    {day&&!slots.length?<Banner text={t("noSlot")}/>:null}
   </>}
   <label className="p15-field">{t("reason")}<textarea maxLength={300} minLength={10}
    value={why} onChange={e=>setWhy(e.target.value)}/></label>
   <div className="p15-footer"><button type="button" className="p15-button p15-button-secondary"
    onClick={()=>setAction(null)}>{t("back")}</button>
    <button type="button" className="p15-button" disabled={busy||why.trim().length<10||
     action==="reschedule"&&!choice} onClick={()=>void submit()}>{t("save")}</button></div>
  </div>}
  <ErrorNote message={error}/><LinkButton href="/appointments">{t("back")}</LinkButton>
 </Page>;
}
export function PatientRecordsPage(){
 const {t,fmt}=useWords(),{rows}=useBookings();
 const [links,setLinks]=useState<Link[]>([]),[records,setRecords]=useState<Records|null>(null);
 const [clinic,setClinic]=useState(""),[number,setNumber]=useState("");
 const [consent,setConsent]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const refresh=()=>{Promise.all([api<{links:Link[]}>("/v1/booking/record-links"),
   api<Records>("/v1/booking/records")])
   .then(([l,r])=>{setLinks(l.links);setRecords(r);})
   .catch(e=>setError(e.message)).finally(()=>setLoading(false))};
 useEffect(refresh,[]);
 const clinics=useMemo(()=>[...new Map(rows.map(x=>[x.clinicId,{id:x.clinicId,name:x.clinicName}])).values()], [rows]);
 async function request(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{await api("/v1/booking/record-links","POST",{
   clinicId:clinic,patientNumber:number,explicitConsent:consent,identityProofAcknowledged:consent});
   setNumber("");setConsent(false);refresh();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function revoke(id:string){
  setBusy(true);try{await api("/v1/booking/record-links/"+id+"/revoke","POST",{});refresh();}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 return <Page heading={t("records")} sub={t("secure")}>
  <ErrorNote message={error}/><div className="p15-two">
   <div className="p15-panel"><h2>{t("requestLink")}</h2><p>{t("bookingHelp")}</p>
    <form onSubmit={request} className="p15-form">
     <label className="p15-field">{t("clinic")}
      <select value={clinic} onChange={e=>setClinic(e.target.value)} required>
       <option value="">—</option>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
     <label className="p15-field">{t("number")}<input value={number} required minLength={2} maxLength={40}
      onChange={e=>setNumber(e.target.value)}/></label>
     <label className="p15-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t("linkConsent")}</label>
     <button className="p15-button" disabled={busy||!clinic||!consent||number.trim().length<2}>{t("linkBtn")}</button>
    </form>
   </div>
   <div className="p15-panel"><h2>{t("linked")}</h2>{loading?<Spinner/>:links.length?
    <div className="p15-list">{links.map(l=><div className="p15-list-row" key={l.id}>
     <strong>{l.clinicName}</strong><small>{fmt(l.requestedAt,true)}</small><Badge status={l.state}/>
     {["pending","approved"].includes(l.state)&&<button type="button" className="p15-button p15-button-danger"
      disabled={busy} onClick={()=>void revoke(l.id)}>{t("revoke")}</button>}
    </div>)}</div>:<p>{t("noLinks")}</p>}</div>
  </div>
  <div className="p15-two">
   <div className="p15-panel"><h2>{t("summaries")}</h2>
    {records?.summaries?.length?records.summaries.map(s=><article className="p15-list-row" key={s.id}>
     <strong>{s.clinicName}</strong><span>{fmt(s.signedAt,true)}</span>
     <p>{s.reason}</p><p>{s.assessment}</p></article>):<p>{t("noRecords")}</p>}</div>
   <div className="p15-panel"><h2>{t("receipts")}</h2>
    {records?.receipts?.length?records.receipts.map(r=><article className="p15-list-row" key={r.id}>
     <strong>{r.clinicName} #{r.invoiceNumber}</strong><span>{fmt(r.issuedAt,true)}</span>
     <b>{r.totalAfn} AFN</b></article>):<p>{t("noRecords")}</p>}</div>
  </div>
 </Page>;
}

type StaffContext={name:string;email:string;clinics:{
 clinicId:string;clinicName:string;membershipId:string;role:string;clinicianEnabled:boolean}[]};
function ClinicShell({title,activeKey="appointments",children}:{title:string;activeKey?:string;children:(clinicId:string,role:string,clinicianEnabled:boolean)=>React.ReactNode}){
 const {t}=useWords(),[ctx,setCtx]=useState<StaffContext|null>(null),[clinic,setClinic]=useState<string|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
  setClinic(new URLSearchParams(location.search).get("clinic"));
  api<StaffContext>("/v1/team/context").then(setCtx).catch(e=>setError(e.message));
 },[]);
 if(error)return <Page heading={title}><ErrorNote message={error}/><LinkButton href="/clinic/login">{t("signClinic")}</LinkButton></Page>;
 if(!ctx)return <Spinner/>;
 const space=(clinic?ctx.clinics.find(c=>c.clinicId===clinic):null)||ctx.clinics[0];
 if(!space)return <Page heading={title}><Banner text={t("signClinic")}/></Page>;
 return <Shell ctx={ctx as any} space={space as any} active={activeKey}>
  <Page heading={title} sub={space.clinicName}>
   <nav className="p15-tabs"><a href={"/clinic/appointments?clinic="+space.clinicId}>{t("overview")}</a>
    <a href={"/clinic/appointments/requests?clinic="+space.clinicId}>{t("clinicQueue")}</a>
    <a href={"/clinic/settings/notifications?clinic="+space.clinicId}>{t("notificationStatus")}</a></nav>
   {children(space.clinicId,space.role,space.clinicianEnabled)}
  </Page>
 </Shell>;
}
type StaffRequestRow={id:string;patientName:string;serviceName:string;startAt:string;
 status:string;revision:number;priceAfn:number};
type LinkRequest={id:string;state:string;suppliedPatientNumber:string;
 requestedAt:string;patientId:string|null;method:string|null;applicantName:string};
export function ClinicBookingRequestsPage(){
 return <ClinicShell title={vocab.en.clinicQueue} activeKey="bookingRequests">{(clinicId,role,clinicianEnabled)=><Requests cid={clinicId} role={role} clinicianEnabled={clinicianEnabled}/>}</ClinicShell>;
}
function Requests({cid,role,clinicianEnabled}:{cid:string;role:string;clinicianEnabled:boolean}){
 const {t,fmt}=useWords(),[filter,setFilter]=useState("pending");
 const [rows,setRows]=useState<StaffRequestRow[]>([]),[links,setLinks]=useState<LinkRequest[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [reasons,setReasons]=useState<Record<string,string>>({});
 const [patientIds,setPatientIds]=useState<Record<string,string>>({});
 const [verified,setVerified]=useState<Record<string,boolean>>({});
 const [methods,setMethods]=useState<Record<string,string>>({});
 const load=()=>{setLoading(true);
  Promise.all([api<{requests:StaffRequestRow[]}>("/v1/booking/clinics/"+cid+"/requests?state="+filter),
   api<{links:LinkRequest[]}>("/v1/booking/clinics/"+cid+"/record-links")])
   .then(([q,l])=>{setRows(q.requests);setLinks(l.links);})
   .catch(e=>setError(e.message)).finally(()=>setLoading(false))};
 useEffect(load,[cid,filter]);
 async function decision(r:StaffRequestRow,action:"accept"|"reject"){
  setBusy(true);setError("");
  try{await api("/v1/booking/clinics/"+cid+"/requests/"+r.id+"/decision","POST",
   {action,reason:reasons[r.id],revision:r.revision});load();}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function linkDecision(l:LinkRequest,action:"approve"|"reject"){
  setBusy(true);setError("");
  try{await api("/v1/booking/clinics/"+cid+"/record-links/"+l.id+"/decision","POST",
   {action,patientId:patientIds[l.id],reason:reasons[l.id],
    verifiedInPerson:verified[l.id]===true,method:methods[l.id]||"in_person_document"});load();}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 return <><ErrorNote message={error}/>
  <div className="p15-tabs">{["pending","processed"].map(s=><button key={s} type="button"
   aria-current={filter===s?"page":undefined} onClick={()=>setFilter(s)}>{t(s)}</button>)}</div>
  {loading?<Spinner/>:rows.length?<div className="p15-list">{rows.map(r=>
   <div className="p15-panel p15-request" key={r.id}>
    <div className="p15-topline"><strong>{r.patientName}</strong><Badge status={r.status}/></div>
    <p>{r.serviceName} · {fmt(r.startAt,true)} · {r.priceAfn} AFN</p>
    {r.status==="requested"&&<>
     <label className="p15-field">{t("reason")}<input maxLength={300} value={reasons[r.id]||""}
      onChange={e=>setReasons(x=>({...x,[r.id]:e.target.value}))}/></label>
     <div className="p15-actions">
      <button className="p15-button" disabled={busy} onClick={()=>void decision(r,"accept")}>{t("accept")}</button>
      <button className="p15-button p15-button-danger" disabled={busy||(reasons[r.id]||"").trim().length<10}
       onClick={()=>void decision(r,"reject")}>{t("reject")}</button></div>
    </>}
   </div>)}</div>:<div className="p15-empty">{t("noneProcessed")}</div>}
  <div className="p15-panel"><h2>{t("proof")}</h2><p>{t("secure")}</p>
   <div className="p15-list">{links.filter(l=>l.state==="pending").map(l=>
    <article className="p15-list-row" key={l.id}>
     <strong>{l.applicantName}</strong>
     <p>{t("number")}: <bdi dir="ltr">{l.suppliedPatientNumber}</bdi></p>
     <label className="p15-field">{t("selectedPatient")}<input value={patientIds[l.id]||""}
      onChange={e=>setPatientIds(x=>({...x,[l.id]:e.target.value}))}/></label>
     <label className="p15-field">{t("method")}<select value={methods[l.id]||"in_person_document"}
      onChange={e=>setMethods(x=>({...x,[l.id]:e.target.value}))}>
      <option value="in_person_document">In-person document</option>
      <option value="in_person_care">Known patient confirmed in person</option></select></label>
     <label className="p15-consent"><input type="checkbox" checked={!!verified[l.id]}
      onChange={e=>setVerified(x=>({...x,[l.id]:e.target.checked}))}/>{t("verify")}</label>
     <label className="p15-field">{t("reason")}<input value={reasons[l.id]||""}
      onChange={e=>setReasons(x=>({...x,[l.id]:e.target.value}))}/></label>
     <div className="p15-actions"><button className="p15-button" disabled={busy||!verified[l.id]||!patientIds[l.id]}
      onClick={()=>void linkDecision(l,"approve")}>{t("approveLink")}</button>
      <button className="p15-button p15-button-danger" disabled={busy||!verified[l.id]||
       (reasons[l.id]||"").trim().length<10} onClick={()=>void linkDecision(l,"reject")}>{t("rejectLink")}</button></div>
    </article>)}</div>
   {links.filter(l=>l.state==="approved").map(l=><ApprovedRecordReleases key={l.id}
     cid={cid} link={l} enabled={role==="dentist"||clinicianEnabled}/>) }
  </div>
 </>;
}

type ReleaseItem={id:string;released:boolean;title?:string;signedAt?:string;
 invoiceNumber?:number;issuedAt?:string;totalAfn?:number};
function ApprovedRecordReleases({cid,link,enabled}:{cid:string;link:LinkRequest;enabled:boolean}){
 const {t,fmt}=useWords();
 const [opened,setOpened]=useState(false),[approved,setApproved]=useState(false);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [problem,setProblem]=useState("");
 const [items,setItems]=useState<{summaries:ReleaseItem[];receipts:ReleaseItem[]}|null>(null);
 const refresh=async()=>{
  setLoading(true);setProblem("");
  try{const r=await api<{summaries:ReleaseItem[];receipts:ReleaseItem[]}>(
   "/v1/booking/clinics/"+cid+"/record-links/"+link.id+"/releasable");setItems(r);}
  catch(e:any){setProblem(e.message);}finally{setLoading(false);}
 };
 async function send(item:ReleaseItem,kind:string,operation:"release"|"revoke"){
  if(!approved||busy)return;
  setBusy(true);setProblem("");
  try{await api("/v1/booking/clinics/"+cid+"/record-links/"+link.id+"/releases","POST",{
   kind,resourceId:item.id,operation,patientApproved:true});
   await refresh();
  }catch(e:any){setProblem(e.message);}
  finally{setBusy(false);}
 }
 if(!enabled)return null;
 return <article className="p15-list-row" key={link.id}>
  <div><strong>{link.applicantName}</strong><Badge status={link.state}/>
   <p>{t("selectedPatient")}: <bdi dir="ltr">{link.patientId||"—"}</bdi></p></div>
  <button type="button" className="p15-button p15-button-secondary"
   onClick={()=>{setOpened(x=>!x);if(!opened)void refresh();}}>{t("reviewRecords")}</button>
  {opened&&<div className="p15-record-review">
   <ErrorNote message={problem}/>{loading?<Spinner/>:null}
   <label className="p15-consent">
    <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>
    {t("approveIndividual")}</label>
   {!loading&&items&&!(items.summaries.length+items.receipts.length)&&<p>{t("noReleasable")}</p>}
   {items?.summaries.map(item=><div key={item.id} className="p15-list-row">
    <div><strong>{t("summaries")} — {item.title}</strong><small>{fmt(item.signedAt,true)}</small>
     <Badge status={item.released?"approved":"pending"}/></div>
    <button type="button" className={"p15-button "+(item.released?"p15-button-danger":"")}
     disabled={!approved||busy}
     onClick={()=>void send(item,"signed_encounter_summary",item.released?"revoke":"release")}>
      {t(item.released?"withdrawRelease":"releaseRecord")}</button></div>)}
   {items?.receipts.map(item=><div key={item.id} className="p15-list-row">
    <div><strong>{t("receipts")} #{item.invoiceNumber}</strong>
     <small>{fmt(item.issuedAt,true)} · {item.totalAfn} AFN</small>
     <Badge status={item.released?"approved":"pending"}/></div>
    <button type="button" className={"p15-button "+(item.released?"p15-button-danger":"")}
     disabled={!approved||busy}
     onClick={()=>void send(item,"issued_receipt",item.released?"revoke":"release")}>
      {t(item.released?"withdrawRelease":"releaseRecord")}</button></div>)}
  </div>}
 </article>;
}

export function ClinicNotificationsPage(){
 const {t,fmt}=useWords();
 return <ClinicShell title={t("settings")} activeKey="notifications">{cid=><Notifications cid={cid}/>}</ClinicShell>;
}
function Notifications({cid}:{cid:string}){
 const {t,fmt}=useWords(),[items,setItems]=useState<any[]>([]);
 const [configured,setConfigured]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{api<{deliveries:any[];emailConfigured:boolean}>("/v1/booking/clinics/"+cid+"/notifications")
  .then(r=>{setItems(r.deliveries);setConfigured(r.emailConfigured)})
  .catch(e=>setError(e.message)).finally(()=>setLoading(false))},[cid]);
 return <div className="p15-panel"><p>{t("provider")}: {configured?"✓":"—"}</p>
  <p>{t("secure")}</p><ErrorNote message={error}/>{loading?<Spinner/>:
  items.length?items.map((i,n)=><div key={n} className="p15-list-row">
   <strong>{i.event_name}</strong><Badge status={i.status}/><small>{fmt(i.created_at,true)}</small>
   <small>{i.attempt_count} attempts</small></div>):<p>{t("noMessages")}</p>}</div>;
}
