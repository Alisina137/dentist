"use client";
import React,{useEffect,useMemo,useState} from "react";
import {usePreferences} from "./index";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Language="en"|"fa-AF"|"ps-AF";
type Row={id:string;clinicId:string;dependentId:string|null;serviceName:string;
 dentistId:string;startAt:string;endAt:string;priceAfn:number;status:string;revision:number;
 appointmentId:string|null;decisionReason:string|null};
type Clinic={clinic:{id:string;name:string;city:string;phone:string};
 profile:{services:{id:string;name:string;priceAfn:number;durationMinutes:number}[];
 dentists:{id:string;displayName:string}[];
 bookingRules:{approvalMode:"manual"|"auto";cancellationHours:number}}};
type Slot={startAt:string;endAt:string;dentistId:string;serviceId:string;dentistName:string;
 serviceName:string;priceAfn:number};
type Family={members:{id:string;displayName:string;memberType:string;eligibleForFutureBooking:boolean}[]};
const tr={
 en:{book:"Book an appointment",appointments:"My appointments",clinic:"Clinic",service:"Treatment",
 dentist:"Dentist",time:"Date & time",patient:"Patient",continue:"Continue",back:"Back",
 select:"Choose an option",availability:"Available appointment times",noTimes:"No available times for this date.",
 self:"Myself",terms:"I authorize this appointment request and understand the clinic policy.",
 confirm:"Confirm request",pending:"Awaiting clinic approval",confirmed:"Confirmed",cancelled:"Cancelled",
 rejected:"Declined",cancel:"Cancel appointment",review:"Review your booking",load:"Loading…",
 missing:"Select a treatment, dentist and live time to continue.",none:"No appointments yet.",
 chooseClinic:"Browse verified clinics",pendingHelp:"Manual clinic approval is required; this time is not yet confirmed.",
 confirmedHelp:"The clinic calendar has recorded this appointment.",fee:"Published estimate",
 error:"The request could not be completed. Please retry.",retry:"Retry",
 signIn:"Sign in and finish your patient profile before booking.",consent:"Consent required",
 cancellation:"Cancellation may be restricted close to appointment time.",date:"Appointment date"},
 "fa-AF":{book:"رزرو نوبت",appointments:"نوبت‌های من",clinic:"کلینیک",service:"تداوی",
 dentist:"داکتر",time:"تاریخ و ساعت",patient:"مریض",continue:"ادامه",back:"بازگشت",
 select:"یک گزینه را انتخاب کنید",availability:"وقت‌های موجود",noTimes:"در این روز وقت موجود نیست.",
 self:"خودم",terms:"اجازه ثبت این درخواست را می‌دهم و مقررات کلینیک را می‌پذیرم.",
 confirm:"ثبت درخواست",pending:"در انتظار تأیید کلینیک",confirmed:"تأیید شده",cancelled:"لغو شده",
 rejected:"رد شده",cancel:"لغو نوبت",review:"مرور درخواست",load:"در حال بارگذاری…",
 missing:"لطفاً تداوی، داکتر و ساعت را انتخاب کنید.",none:"هنوز نوبتی ندارید.",
 chooseClinic:"جستجوی کلینیک‌های تأییدشده",pendingHelp:"تأیید کلینیک لازم است؛ این ساعت هنوز قطعی نیست.",
 confirmedHelp:"این نوبت در تقویم کلینیک ثبت شده است.",fee:"قیمت تخمینی",
 error:"درخواست انجام نشد. دوباره کوشش کنید.",retry:"دوباره کوشش",
 signIn:"برای رزرو وارد شوید و پروفایل مریض را تکمیل کنید.",consent:"تأیید لازم است",
 cancellation:"لغو نزدیک به وقت نوبت ممکن است محدود باشد.",date:"تاریخ نوبت"},
 "ps-AF":{book:"د ملاقات وخت اخیستل",appointments:"زما ملاقاتونه",clinic:"کلینیک",service:"درملنه",
 dentist:"ډاکټر",time:"نېټه او وخت",patient:"ناروغ",continue:"دوام",back:"شاته",
 select:"یوه ټاکنه وکړئ",availability:"شته وختونه",noTimes:"په دې ورځ وخت نشته.",
 self:"زه خپله",terms:"زه د ملاقات غوښتنه منم او د کلینیک اصولو سره موافق یم.",
 confirm:"غوښتنه ثبت کړه",pending:"د کلینیک تایید ته منتظر",confirmed:"تایید شوی",cancelled:"لغوه شوی",
 rejected:"رد شوی",cancel:"ملاقات لغوه کړه",review:"غوښتنه وګورئ",load:"په بارېدو دی…",
 missing:"درملنه، ډاکټر او وخت وټاکئ.",none:"تراوسه ملاقات نشته.",
 chooseClinic:"تایید شوي کلینیکونه ولټوئ",pendingHelp:"د کلینیک تایید اړین دی؛ وخت لا نهایی نه دی.",
 confirmedHelp:"دا ملاقات د کلینیک په مهال‌وېش کې ثبت شوی.",fee:"اټکلي بیه",
 error:"غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.",retry:"بیا هڅه",
 signIn:"د وخت اخیستلو لپاره ننوځئ او خپل حساب بشپړ کړئ.",consent:"موافقت اړین دی",
 cancellation:"د ملاقات له وخته نږدې لغوه کول محدودېدای شي.",date:"د ملاقات نېټه"}
} as const;
async function get<T>(path:string):Promise<T>{
 const res=await fetch(API+path,{credentials:"include",cache:"no-store"});
 if(!res.ok){const body=await res.json().catch(()=>({})) as {code?:string};
  throw Error(body.code||"REQUEST_FAILED");}
 return res.json() as Promise<T>;
}
async function mutate<T>(path:string,body:unknown):Promise<T>{
 const res=await fetch(API+path,{method:"POST",credentials:"include",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!res.ok){const data=await res.json().catch(()=>({})) as {code?:string};
  throw Error(data.code||"REQUEST_FAILED");}
 return res.json() as Promise<T>;
}
function formatDate(value:string,locale:Language){
 try{return new Intl.DateTimeFormat(locale==="fa-AF"?"fa-AF":locale==="ps-AF"?"ps-AF":"en-GB",{
  timeZone:"Asia/Kabul",dateStyle:"medium",timeStyle:"short"
 }).format(new Date(value));}catch{return value;}
}
function today(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
export function PatientBookPage({clinicId}:{clinicId:string}){
 const {locale}=usePreferences();
 const lang=(locale in tr?locale:"en") as Language,t=tr[lang];
 const [clinic,setClinic]=useState<Clinic|null>(null);
 const [family,setFamily]=useState<Family>({members:[]});
 const [step,setStep]=useState(0),[service,setService]=useState(""),[dentist,setDentist]=useState("");
 const [day,setDay]=useState(today()),[slots,setSlots]=useState<Slot[]>([]);
 const [selected,setSelected]=useState(""),[dependent,setDependent]=useState("");
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [authRequired,setAuthRequired]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let live=true;
  setLoading(true);setError("");
  Promise.all([get<Clinic>("/v1/discovery/clinics/"+encodeURIComponent(clinicId)),
   get<Family>("/v1/patients/family")]).then(([item,members])=>{
   if(!live)return;
   setClinic(item);setFamily(members);
  }).catch((e:Error)=>{if(live){
   setError(e.message);setAuthRequired(/AUTH_REQUIRED|PATIENT_ONBOARDING_REQUIRED|EMAIL_VERIFICATION_REQUIRED/.test(e.message));
  }}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[clinicId,refresh]);
 useEffect(()=>{
  if(!service||!dentist)return;
  let active=true;setSelected("");setSlots([]);
  const query=new URLSearchParams({date:day,serviceId:service,dentistId:dentist});
  get<{slots:Slot[]}>("/v1/discovery/clinics/"+encodeURIComponent(clinicId)+"/availability?"+query)
   .then(x=>{if(active)setSlots(x.slots)})
   .catch((e:Error)=>{if(active)setError(e.message)});
  return()=>{active=false};
 },[clinicId,day,dentist,service]);
 const selectedSlot=slots.find(s=>s.startAt===selected);
 const allowed=step===0?true:step===1?Boolean(service):step===2?Boolean(dentist):
  step===3?Boolean(selectedSlot):Boolean(consent);
 async function submit(){
  if(!selectedSlot||!clinic||!consent)return;
  setBusy(true);setError("");
  try{
   await mutate("/v1/patient-bookings",{clinicId:clinic.clinic.id,serviceId:service,
    dentistId:dentist,startAt:selectedSlot.startAt,
    dependentId:dependent||null,consent:true,idempotencyKey:crypto.randomUUID()});
   window.location.assign("/appointments");
  }catch(e){setError(e instanceof Error?e.message:t.error);setBusy(false)}
 }
 const steps=[t.clinic,t.service,t.dentist,t.time,t.patient];
 return <section className="p15-shell" dir={lang==="en"?"ltr":"rtl"}>
  <a className="p15-back" href={"/clinics/"+encodeURIComponent(clinicId)}>← {t.back}</a>
  <div className="p15-heading"><span className="p15-overline">DANDANLINK · PATIENT</span>
   <h1>{t.book}</h1><p>{clinic?.clinic.name||t.load}</p></div>
  {loading?<p role="status">{t.load}</p>:error&&(!clinic||authRequired)?
   <div className="p15-notice" role="alert">{error}
    {authRequired?<a href="/login">{t.signIn}</a>:<button type="button" onClick={()=>setRefresh(x=>x+1)}>{t.retry}</button>}
   </div>:<div className="p15-card">
   <ol className="p15-stepper">{steps.map((label,i)=><li key={label} className={i===step?"current":i<step?"complete":""}>
    <button type="button" disabled={i>step} onClick={()=>setStep(i)}><span>{i+1}</span>{label}</button>
   </li>)}</ol>
   <div className="p15-stage">
    {step===0&&<><h2>{t.clinic}</h2><div className="p15-choice">
     <strong>{clinic?.clinic.name}</strong><span>{clinic?.clinic.city}</span>
     <small>{clinic?.clinic.phone}</small></div></>}
    {step===1&&<><h2>{t.service}</h2><div className="p15-choices">
     {clinic?.profile.services.map(x=><button key={x.id} type="button" className={service===x.id?"selected":""}
      onClick={()=>{setService(x.id);setSelected("")}}>
      <strong>{x.name}</strong><span>{x.durationMinutes} min · {x.priceAfn} AFN</span></button>)}</div></>}
    {step===2&&<><h2>{t.dentist}</h2><div className="p15-choices">
     {clinic?.profile.dentists.map(x=><button key={x.id} type="button" className={dentist===x.id?"selected":""}
      onClick={()=>{setDentist(x.id);setSelected("")}}>{x.displayName}</button>)}</div></>}
    {step===3&&<><h2>{t.availability}</h2><label className="p15-field">{t.date}
     <input type="date" value={day} min={today()} onChange={e=>setDay(e.target.value)}/></label>
     <div className="p15-time-list">{slots.length?slots.map((s,i)=>
      <button key={s.startAt+"-"+i} className={selected===s.startAt?"selected":""} type="button"
       onClick={()=>setSelected(s.startAt)}>{formatDate(s.startAt,lang)}</button>):
      <p>{t.noTimes}</p>}</div></>}
    {step===4&&<><h2>{t.review}</h2><div className="p15-summary">
      <p><b>{t.clinic}:</b> {clinic?.clinic.name}</p>
      <p><b>{t.service}:</b> {clinic?.profile.services.find(x=>x.id===service)?.name}</p>
      <p><b>{t.dentist}:</b> {clinic?.profile.dentists.find(x=>x.id===dentist)?.displayName}</p>
      <p><b>{t.time}:</b> {selectedSlot&&formatDate(selectedSlot.startAt,lang)}</p>
      <p><b>{t.fee}:</b> {selectedSlot?.priceAfn} AFN</p>
      <p className="p15-note">{clinic?.profile.bookingRules.approvalMode==="manual"?t.pendingHelp:t.confirmedHelp}</p></div>
      <label className="p15-field">{t.patient}<select value={dependent} onChange={e=>setDependent(e.target.value)}>
       <option value="">{t.self}</option>
       {family.members.filter(x=>x.eligibleForFutureBooking).map(x=><option value={x.id} key={x.id}>{x.displayName}</option>)}
      </select></label>
      <label className="p15-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t.terms}</label>
     </>}
   </div>
   {error&&<p className="p15-notice" role="alert">{error}</p>}
   <div className="p15-actions">{step>0&&<button className="p15-secondary" type="button"
    onClick={()=>setStep(s=>s-1)}>{t.back}</button>}
    <button className="p15-primary" type="button" disabled={!allowed||busy} onClick={()=>{
     if(step<4)setStep(s=>s+1);else void submit();
    }}>{busy?t.load:step===4?t.confirm:t.continue}</button></div>
  </div>}</section>;
}
export function PatientAppointmentsPage(){
 const {locale}=usePreferences(),lang=(locale in tr?locale:"en") as Language,t=tr[lang];
 const [bookings,setBookings]=useState<Row[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [authRequired,setAuthRequired]=useState(false),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState("");
 useEffect(()=>{
  let live=true;setLoading(true);setError("");
  get<{bookings:Row[]}>("/v1/patient-bookings").then(x=>{if(live)setBookings(x.bookings)})
   .catch((e:Error)=>{if(live){setError(e.message);setAuthRequired(true)}})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[refresh]);
 async function cancel(row:Row){
  if(!window.confirm(t.cancellation))return;
  setBusy(row.id);setError("");
  try{
   await mutate("/v1/patient-bookings/"+encodeURIComponent(row.id)+"/cancel",{
    revision:row.revision,reason:"Cancellation requested by patient"});
   setRefresh(x=>x+1);
  }catch(e){setError(e instanceof Error?e.message:t.error)}
  finally{setBusy("")}
 }
 const text=(status:string)=>status==="confirmed"?t.confirmed:status==="pending"?t.pending:
  status==="cancelled"?t.cancelled:status==="rejected"?t.rejected:status;
 return <section className="p15-shell" dir={lang==="en"?"ltr":"rtl"}>
  <div className="p15-heading"><span className="p15-overline">DANDANLINK · PATIENT</span>
   <h1>{t.appointments}</h1><a className="p15-primary p15-link" href="/search">{t.chooseClinic}</a></div>
  {loading?<p role="status">{t.load}</p>:<div className="p15-card">
   {error&&<div className="p15-notice" role="alert">{error}
    {authRequired?<a href="/login">{t.signIn}</a>:<button onClick={()=>setRefresh(x=>x+1)}>{t.retry}</button>}
   </div>}
   {!bookings.length&&!error&&<div className="p15-empty"><p>{t.none}</p>
    <a href="/search">{t.chooseClinic}</a></div>}
   {bookings.map(b=><article className="p15-appointment" key={b.id}>
    <div><span className={"p15-status p15-status-"+b.status}>{text(b.status)}</span>
     <h2>{b.serviceName}</h2>
     <p>{formatDate(b.startAt,lang)} · {b.priceAfn} AFN</p>
     <a href={"/clinics/"+encodeURIComponent(b.clinicId)}>{t.clinic}</a>
    </div>
    {["confirmed","pending"].includes(b.status)&&<button type="button"
     disabled={busy===b.id} className="p15-secondary"
     onClick={()=>void cancel(b)}>{busy===b.id?t.load:t.cancel}</button>}
   </article>)}
  </div>}</section>;
}
