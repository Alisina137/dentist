"use client";
import React,{useEffect,useState,type FormEvent} from "react";
import {CareIcon,usePreferences} from "./index";
import {useClinicFeedback,ClinicLoadingState} from "./clinic-feedback";
import {clinicCsvRows} from "./clinic-finance-model";
import {
 pilotChoices,pilotStatuses,pilotReasons,pilotValidInput,pilotValidList,
 pilotStatusTransitions,pilotFeedbackFilter,pilotFeedbackStats,pilotFeedbackPage,
 type PilotObservation,type PilotObservationInput,type PilotStatus
} from "./clinic-pilot-feedback-model";

type Locale="en"|"fa-AF"|"ps-AF";
const apiBase=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const copy={
 en:{
  eyebrow:"CONTROLLED PILOT FEEDBACK",title:"Clinic observation tracker",
  intro:"Log and review structured issues during authorized testing without entering personal, patient or clinical information.",
  privacy:"Only fixed categories are accepted. Do not include patient names, phone numbers, images, notes or medical records. No comments or attachments.",
  window:"Latest 40 observations for this clinic. Counts are for this window only, not the entire clinic history.",
  add:"Record an observation",create:"Save observation",area:"Workspace",symptom:"Observed problem",
  severity:"Impact",frequency:"Reproducibility",network:"Connection",device:"Device",locale:"Interface language",
  status:"Status",resolution:"Review outcome",review:"Review selected observation",
  approve:"Confirm status update",recorded:"Observation saved",updated:"Review recorded",
  empty:"No matching observations in this clinic's recent window.",
  filterArea:"Filter by workspace",filterStatus:"Filter by status",all:"All",
  blocked:"Critical open",opened:"Open",closed:"Resolved",count:"Recent entries",
  formNote:"This log is not medical certification and cannot enable a healthcare release.",
  noMfa:"To change a review status, enable and verify MFA on your account.",
  stale:"This observation changed on the server. Refresh before reviewing.",
  rate:"The hourly submission limit has been reached. Try again later.",
  error:"Unable to load pilot feedback. Check your session, network and permissions.",
  loading:"Loading feedback records…",retry:"Refresh observations",
  pages:"Page",of:"of",cancel:"Cancel review",confirm:"I reviewed the observation and selected an accurate result.",
  export:"Export metadata CSV",exportNote:"Export contains only fixed issue categories; no account, clinic or patient identifiers.",
  noSave:"Feedback is not automatically published, approved or sent to support.",
  range:"Recorded",reviewHint:"Only owners/managers with verified MFA may update review status.",
  pending:"Saving…",unknown:"—",back:"Review readiness",
  required:"Select all fields before saving.",allCount:"Showing"
 },
 "fa-AF":{
  eyebrow:"بازخورد پایلوت کنترول‌شده",title:"ثبت مشکلات آزمایشی کلینیک",
  intro:"مشکلات آزمایشی را فقط با گزینه‌های مشخص ثبت و بررسی کنید؛ معلومات شخصی یا طبی درج نکنید.",
  privacy:"تنها دسته‌های مشخص پذیرفته می‌شود. نام، شماره تلفن، تصویر، یادداشت یا اسناد طبی مریض را درج نکنید.",
  window:"آخرین ۴۰ مورد این کلینیک؛ شمارها تنها مربوط به همین بخش است، نه تمام تاریخچه.",
  add:"ثبت یک مشکل",create:"ثبت مشاهده",area:"بخش",symptom:"مشکل مشاهده‌شده",
  severity:"شدت",frequency:"تکرار",network:"اتصال",device:"دستگاه",locale:"زبان برنامه",
  status:"حالت",resolution:"نتیجۀ بررسی",review:"بررسی مشاهده",
  approve:"تأیید تغییر حالت",recorded:"مشکل ثبت شد",updated:"بررسی ثبت شد",
  empty:"مشاهده‌ای مطابق فیلتر پیدا نشد.",
  filterArea:"فیلتر بخش",filterStatus:"فیلتر حالت",all:"همه",
  blocked:"مشکلات جدی باز",opened:"باز",closed:"حل‌شده",count:"موارد اخیر",
  formNote:"این ثبت، تأیید طبی نیست و نمی‌تواند اجازۀ انتشار بدهد.",
  noMfa:"برای تغییر حالت بررسی، تأیید دومرحله‌ای حساب را فعال و تأیید کنید.",
  stale:"این مورد در سرور تغییر کرده است؛ ابتدا تازه‌سازی کنید.",
  rate:"محدودیت ثبت یک‌ساعته تکمیل شد؛ بعداً کوشش کنید.",
  error:"مشکلات پایلوت بارگیری نشد. دسترسی و اینترنت را بررسی کنید.",
  loading:"موارد آزمایشی بارگیری می‌شود…",retry:"تازه‌سازی موارد",
  pages:"صفحۀ",of:"از",cancel:"لغو بررسی",confirm:"این مورد را بررسی کرده و نتیجۀ درست را انتخاب نمودم.",
  export:"دریافت CSV بدون معلومات شخصی",
  exportNote:"فایل تنها دسته‌های مشخص مشکل دارد؛ شناسه حساب، کلینیک یا مریض ندارد.",
  noSave:"این گزارش به‌شکل خودکار نشر، تأیید یا به پشتیبانی ارسال نمی‌شود.",
  range:"تاریخ ثبت",reviewHint:"فقط مالک/مدیر با MFA تأییدشده می‌تواند حالت را تغییر دهد.",
  pending:"در حال ثبت…",unknown:"—",back:"بررسی آمادگی",
  required:"پیش از ثبت تمام گزینه‌ها را انتخاب کنید.",allCount:"نمایش"
 },
 "ps-AF":{
  eyebrow:"د ازمایښتي کار کتنه",title:"د کلینیک د ستونزو ثبت",
  intro:"د ازموینې ستونزې په ټاکلو کټګوریو ثبت او وارزوئ؛ شخصي یا طبي معلومات مه داخلوی.",
  privacy:"یوازې ټاکلې کټګورۍ منل کېږي. د ناروغ نوم، تلیفون، انځور، یادښت یا طبي اسناد مه لیکئ.",
  window:"د همدې کلینیک وروستۍ ۴۰ پېښې؛ دا ټول تاریخ نه دی.",
  add:"ستونزه ثبت کړئ",create:"پېښه خوندي کړئ",area:"برخه",symptom:"لیدل شوې ستونزه",
  severity:"شدت",frequency:"تکرار",network:"اړیکه",device:"وسیله",locale:"د اپ ژبه",
  status:"حالت",resolution:"د کتنې پایله",review:"ټاکلې پېښه وارزوئ",
  approve:"د حالت بدلون تایید",recorded:"ستونزه ثبت شوه",updated:"کتنه ثبت شوه",
  empty:"د دې چاڼ سره سم پېښه نشته.",
  filterArea:"برخه چاڼ کړئ",filterStatus:"حالت چاڼ کړئ",all:"ټولې",
  blocked:"جدي پرانیستې",opened:"پرانیستې",closed:"حل شوې",count:"وروستۍ پېښې",
  formNote:"دا طبي تصدیق نه دی او د خپرېدو اجازه نه شي ورکولای.",
  noMfa:"د حالت بدلون لپاره په خپل حساب کې MFA فعال او تایید کړئ.",
  stale:"په سرور کې دا پېښه بدله شوې؛ لومړی یې تازه کړئ.",
  rate:"د یوه ساعت د ثبت حد پوره شوی؛ وروسته هڅه وکړئ.",
  error:"د ازموینې پېښې نه پورته کېږي. اړیکه او لاسرسی وګورئ.",
  loading:"پېښې پورته کېږي…",retry:"پېښې تازه کړئ",
  pages:"مخ",of:"له",cancel:"کتنه لغوه",confirm:"ما پېښه وارزوله او سمه پایله مې وټاکله.",
  export:"بې شخصي معلوماتو CSV",
  exportNote:"فایل یوازې د ستونزو ټاکلې کټګورۍ لري؛ د کارن، کلینیک او ناروغ پېژندنې نشته.",
  noSave:"راپور په اتومات ډول نه خپرېږي، نه تاییدېږي او نه ملاتړ ته لېږل کېږي.",
  range:"ثبت شوې",reviewHint:"یوازې مالک/مدیر د تایید شوي MFA سره حالت بدلولای شي.",
  pending:"خوندي کېږي…",unknown:"—",back:"چمتووالی وګورئ",
  required:"له خوندي کولو مخکې ټول ځایونه وټاکئ.",allCount:"ښودل"
 }
} as const;
const optionLabel:Record<Locale,Record<string,string>>={
 en:{
  calendar:"Calendar",queue:"Queue",booking:"Online booking",notifications:"Notifications",
  reports:"Reports",finance:"Finance",staff:"Staff",settings:"Settings",mobile:"Mobile",
  accessibility:"Accessibility",crash:"App crash",blank:"Blank screen",slow:"Slow response",
  wrong_state:"Incorrect state",permission:"Access denied",navigation:"Navigation problem",
  localization:"Translation / RTL",offline:"Offline failure",visual:"Layout problem",
  other:"Other technical issue",blocker:"Blocker",high:"High",medium:"Medium",low:"Low",
  once:"Once",sometimes:"Sometimes",always:"Every time",wifi:"Wi-Fi",unknown:"Unknown",
  desktop:"Desktop browser",android:"Android",ios:"iPhone / iOS",narrow:"Small screen",
  en:"English","fa-AF":"Dari","ps-AF":"Pashto",open:"Open",triaged:"Triaged",
  in_progress:"In progress",resolved:"Resolved",deferred:"Deferred",reproduced:"Reproduced",
  fixed_in_build:"Fixed in build",not_reproducible:"Cannot reproduce",
  duplicate:"Duplicate",followup:"Needs follow-up",all:"All"
 },
 "fa-AF":{
  calendar:"تقویم",queue:"صف مریضان",booking:"رزرو آنلاین",notifications:"اطلاعیه‌ها",
  reports:"گزارش‌ها",finance:"مالی",staff:"کارمندان",settings:"تنظیمات",mobile:"موبایل",
  accessibility:"دسترسی‌پذیری",crash:"از کار افتادن برنامه",blank:"صفحۀ خالی",slow:"کندی",
  wrong_state:"حالت نادرست",permission:"دسترسی غیرمجاز",navigation:"مشکل مسیریابی",
  localization:"ترجمه / RTL",offline:"مشکل بدون اینترنت",visual:"مشکل چیدمان",
  other:"مشکل تخنیکی دیگر",blocker:"مانع جدی",high:"بلند",medium:"متوسط",low:"پایین",
  once:"یک‌بار",sometimes:"گاهی",always:"همیشه",wifi:"وای‌فای",unknown:"نامعلوم",
  desktop:"مرورگر کمپیوتر",android:"اندروید",ios:"آیفون / iOS",narrow:"صفحۀ کوچک",
  en:"انگلیسی","fa-AF":"دری","ps-AF":"پشتو",open:"باز",triaged:"بررسی‌شده",
  in_progress:"در حال حل",resolved:"حل‌شده",deferred:"به تعویق",reproduced:"تکرار شد",
  fixed_in_build:"در نسخه اصلاح شد",not_reproducible:"تکرار نشد",
  duplicate:"تکراری",followup:"نیازمند پیگیری",all:"همه"
 },
 "ps-AF":{
  calendar:"مهالوېش",queue:"کتار",booking:"انلاین غوښتنې",notifications:"خبرتیاوې",
  reports:"راپورونه",finance:"مالي",staff:"کارکوونکي",settings:"تنظیمات",mobile:"موبایل",
  accessibility:"لاسرسی",crash:"اپ بندېږي",blank:"تشه پاڼه",slow:"ورو ځواب",
  wrong_state:"ناسم حالت",permission:"لاسرسی نشته",navigation:"د لارو ستونزه",
  localization:"ژباړه / RTL",offline:"له انټرنټ پرته ستونزه",visual:"د بڼې ستونزه",
  other:"بله تخنیکي ستونزه",blocker:"ستر خنډ",high:"لوړ",medium:"منځنی",low:"ټیټ",
  once:"یو ځل",sometimes:"کله ناکله",always:"هر ځل",wifi:"وای‌فای",unknown:"نامعلوم",
  desktop:"د کمپیوټر براوزر",android:"اندروید",ios:"آیفون / iOS",narrow:"کوچنۍ پرده",
  en:"انګلیسي","fa-AF":"دري","ps-AF":"پښتو",open:"پرانیستی",triaged:"کتل شوی",
  in_progress:"روان دی",resolved:"حل شوی",deferred:"وروسته",reproduced:"بیا تکرار شو",
  fixed_in_build:"په نسخه کې حل شو",not_reproducible:"بیا ونه لیدل شو",
  duplicate:"تکراري",followup:"نور تعقیب",all:"ټولې"
 }
};
const defaults=(locale:Locale):PilotObservationInput=>({
 area:"calendar",symptom:"slow",severity:"medium",frequency:"sometimes",
 network:"wifi",device:"desktop",locale
});
type Snapshot={clinicId:string;rows:PilotObservation[];loading:boolean;error:string};
const path=(id:string)=>"/v1/pilot-feedback/clinics/"+encodeURIComponent(id)+"/observations";
async function request<T>(route:string,method="GET",body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(apiBase+route,{
  method,credentials:"include",cache:"no-store",signal,
  headers:{Accept:"application/json",...(body===undefined?{}:{"Content-Type":"application/json"})},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const kind=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
 if(kind!=="application/json")throw Error("INVALID_RESPONSE");
 const value=await response.json().catch(()=>null);
 if(!response.ok){
  const code=value&&typeof value.code==="string"&&/^[A-Z0-9_]{2,60}$/.test(value.code)?
   value.code:"REQUEST_FAILED";
  throw Error(code);
 }
 return value as T;
}
function ChoiceField({name,label,value,onChange,options,lang}:{name:string;label:string;value:string;
 onChange:(v:string)=>void;options:readonly string[];lang:Locale}){
 return <label className="clinic-phase17-field"><span>{label}</span>
  <select name={name} value={value} onChange={event=>onChange(event.target.value)}>
   {options.map(option=><option key={option} value={option}>
    {optionLabel[lang][option]||option}</option>)}
  </select></label>;
}
export function ClinicPilotFeedback({clinicId,role,mfaEnabled}:{
 clinicId:string;role:"owner"|"manager";mfaEnabled:boolean}){
 const {locale:preferred}=usePreferences();
 const locale:Locale=preferred==="en"||preferred==="fa-AF"||preferred==="ps-AF"?preferred:"en";
 const {error:feedbackError}=useClinicFeedback();
 const t=copy[locale];
 const [form,setForm]=useState<PilotObservationInput>(()=>defaults(locale));
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [revision,setRevision]=useState(0);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [filterStatus,setFilterStatus]=useState("all"),[filterArea,setFilterArea]=useState("all");
 const [page,setPage]=useState(1);
 const [review,setReview]=useState<PilotObservation|null>(null);
 const [nextStatus,setNextStatus]=useState<PilotStatus>("triaged");
 const [reason,setReason]=useState("reproduced"),[checked,setChecked]=useState(false);
 const active=snapshot?.clinicId===clinicId?snapshot:null;
 const rows=active?.rows||[];
 const stats=pilotFeedbackStats(rows);
 const filtered=pilotFeedbackFilter(rows,filterStatus,filterArea);
 const paging=pilotFeedbackPage(filtered,page);
 useEffect(()=>{
  setForm(defaults(locale));setFilterStatus("all");setFilterArea("all");
  setPage(1);setError("");setNotice("");setReview(null);setChecked(false);
 },[clinicId,locale]);
 useEffect(()=>{
  if(!clinicId){setSnapshot(null);return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
  setSnapshot({clinicId,rows:[],loading:true,error:""});
  request<unknown>(path(clinicId),"GET",undefined,controller.signal).then(data=>{
   if(controller.signal.aborted)return;
   if(!pilotValidList(data))throw Error("INVALID_PILOT_RESULT");
   setSnapshot({clinicId,rows:data.observations,loading:false,error:""});
  }).catch(e=>{
   if(controller.signal.aborted&&e?.name==="AbortError")return;
   if(!controller.signal.aborted)setSnapshot({clinicId,rows:[],loading:false,
    error:e instanceof Error?e.message:"REQUEST_FAILED"});
  }).finally(()=>clearTimeout(timeout));
  return()=>{clearTimeout(timeout);controller.abort();};
 },[clinicId,revision]);
 function change(field:keyof PilotObservationInput,value:string){
  setForm(old=>({...old,[field]:value}));
 }
 async function save(event:FormEvent){
  event.preventDefault();
  if(saving||!pilotValidInput(form))return;
  setSaving(true);setError("");setNotice("");
  try{
   await request(path(clinicId),"POST",form);
   setNotice(t.recorded);setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"REQUEST_FAILED");}
  finally{setSaving(false);}
 }
 function startReview(item:PilotObservation){
  if(!mfaEnabled||saving)return;
  const choices=pilotStatusTransitions(item.status);
  if(!choices.length)return;
  setReview(item);setNextStatus(choices[0]);setReason("reproduced");
  setChecked(false);setError("");setNotice("");
 }
 async function confirmReview(){
  if(!review||!checked||!mfaEnabled||saving||!pilotStatusTransitions(review.status).includes(nextStatus))
   return;
  setSaving(true);setError("");setNotice("");
  try{
   await request(path(clinicId)+"/"+encodeURIComponent(review.id),"PATCH",{
    status:nextStatus,reason,revision:review.revision
   });
   setReview(null);setChecked(false);setNotice(t.updated);setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"REQUEST_FAILED");}
  finally{setSaving(false);}
 }
 function exportCsv(){
  if(!active||active.loading||active.error||!rows.length)return;
  // Never include observation ID, actor/clinic IDs, contact info or free text.
  const output=clinicCsvRows([
   ["Created (UTC)","Area","Symptom","Severity","Frequency","Network","Device",
    "Locale","Status","Resolution"],
   ...rows.map(row=>[
    row.createdAt,row.area,row.symptom,row.severity,row.frequency,
    row.network,row.device,row.locale,row.status,row.resolution||""
   ])
  ]);
  const url=URL.createObjectURL(new Blob([output],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;
  link.download="dandanlink-pilot-observations-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 const displayError=error==="PILOT_FEEDBACK_RATE_LIMIT"?t.rate:
  error==="STALE_PILOT_OBSERVATION"?t.stale:error?feedbackError(error):"";
 return <section className="clinic-phase17-feedback" aria-labelledby="clinic-phase17-heading">
  <header className="clinic-phase17-heading">
   <div><span className="clinic-phase17-eyebrow"><CareIcon name="clipboard" size={18}/>
    {t.eyebrow}</span><h2 id="clinic-phase17-heading">{t.title}</h2>
    <p>{t.intro}</p></div>
   <span className="clinic-phase17-role">{role}</span>
  </header>
  <p className="clinic-phase17-privacy" role="note">
   <CareIcon name="shield-check" size={18}/>{t.privacy}</p>
  <div className="clinic-phase17-stats" aria-label={t.count}>
   {([
    ["count",stats.returned,"clipboard"],["opened",stats.open,"clock"],
    ["blocked",stats.critical,"about"],["closed",stats.resolved,"check"]
   ] as const).map(([label,value,icon])=><div key={label}>
    <CareIcon name={icon} size={21}/><strong>{value}</strong><span>{t[label]}</span>
   </div>)}
  </div>
  <div className="clinic-phase17-columns">
   <section className="clinic-phase17-card" aria-labelledby="clinic-phase17-add">
    <h3 id="clinic-phase17-add">{t.add}</h3>
    <form onSubmit={event=>void save(event)} className="clinic-phase17-form">
     {(Object.keys(pilotChoices) as (keyof PilotObservationInput)[]).map(key=>
      <ChoiceField key={key} name={key} label={t[key]} value={form[key]}
       options={pilotChoices[key]} lang={locale} onChange={v=>change(key,v)}/>)}
     <button className="btn btn-primary" type="submit"
      disabled={saving||!pilotValidInput(form)}>
      <CareIcon name="plus" size={17}/>{saving?t.pending:t.create}</button>
    </form>
    <p className="clinic-phase17-form-note">{t.formNote} {t.noSave}</p>
   </section>
   <section className="clinic-phase17-card" aria-labelledby="clinic-phase17-recent">
    <div className="clinic-phase17-card-head"><div>
     <h3 id="clinic-phase17-recent">{t.count}</h3><p>{t.window}</p></div>
     <div className="clinic-phase17-card-actions">
      <button type="button" className="btn btn-secondary"
       disabled={saving||active?.loading}
       onClick={()=>setRevision(v=>v+1)}>
       <CareIcon name="activity" size={16}/>{t.retry}</button>
      <button type="button" className="btn btn-secondary"
       disabled={!rows.length||Boolean(active?.loading)||Boolean(active?.error)}
       onClick={exportCsv}><CareIcon name="download" size={16}/>{t.export}</button>
     </div>
    </div>
    <div className="clinic-phase17-filters">
     <ChoiceField name="areaFilter" label={t.filterArea} value={filterArea}
      onChange={v=>{setFilterArea(v);setPage(1);}} lang={locale}
      options={["all",...pilotChoices.area]}/>
     <ChoiceField name="statusFilter" label={t.filterStatus} value={filterStatus}
      onChange={v=>{setFilterStatus(v);setPage(1);}} lang={locale}
      options={["all",...pilotStatuses]}/>
    </div>
    {active?.loading||!active?<ClinicLoadingState variant="rows" label={t.loading}/>:
     active.error?<div role="alert" className="clinic-phase17-notice is-error">
      {t.error} {feedbackError(active.error)}</div>:
     !paging.rows.length?<p className="clinic-phase17-empty" role="status">{t.empty}</p>:
     <div className="clinic-phase17-list">
      {paging.rows.map(item=><article key={item.id} className="clinic-phase17-row">
       <div><strong>{optionLabel[locale][item.area]}</strong>
        <span>{optionLabel[locale][item.symptom]} · {optionLabel[locale][item.severity]}</span>
        <small>{t.range}: <time dateTime={item.createdAt} dir="ltr">
         {new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",
          timeZone:"Asia/Kabul"}).format(new Date(item.createdAt))}</time></small></div>
       <div className="clinic-phase17-row-action">
        <span className={"clinic-phase17-status is-"+item.status}>
         {optionLabel[locale][item.status]}</span>
        {pilotStatusTransitions(item.status).length>0&&
         <button type="button" className="btn btn-secondary"
          disabled={!mfaEnabled||saving} onClick={()=>startReview(item)}>
          {t.review}</button>}
       </div></article>)}
     </div>}
    <nav className="clinic-phase17-pager" aria-label={t.pages}>
     <span role="status" aria-live="polite">{t.allCount} {paging.start}–{paging.end}
      {" "}{t.of} {paging.total} · {t.pages} {paging.current}/{paging.pages}</span>
     <button type="button" className="btn btn-secondary"
      disabled={paging.current<=1} onClick={()=>setPage(v=>v-1)}>‹</button>
     <button type="button" className="btn btn-secondary"
      disabled={paging.current>=paging.pages} onClick={()=>setPage(v=>v+1)}>›</button>
    </nav>
    <p className="clinic-phase17-export-note">{t.exportNote}</p>
   </section>
  </div>
  {!mfaEnabled&&<p className="clinic-phase17-notice" role="status">{t.noMfa}</p>}
  {review&&<section className="clinic-phase17-review" aria-labelledby="clinic-phase17-review-heading">
   <div className="clinic-phase17-card-head"><h3 id="clinic-phase17-review-heading">{t.review}</h3>
    <button type="button" className="btn btn-secondary" disabled={saving}
     onClick={()=>{setReview(null);setChecked(false);}}>{t.cancel}</button></div>
   <p>{optionLabel[locale][review.area]} · {optionLabel[locale][review.symptom]}
    {" · "}{optionLabel[locale][review.status]}</p>
   <div className="clinic-phase17-filters">
    <ChoiceField name="nextStatus" label={t.status} value={nextStatus}
     lang={locale} options={pilotStatusTransitions(review.status)} onChange={v=>{
      setNextStatus(v as PilotStatus);setChecked(false);
     }}/>
    <ChoiceField name="reason" label={t.resolution} value={reason} lang={locale}
     options={pilotReasons} onChange={v=>{setReason(v);setChecked(false);}}/>
   </div>
   <label className="clinic-phase17-acknowledge"><input type="checkbox" checked={checked}
    disabled={saving} onChange={e=>setChecked(e.target.checked)}/>
    {t.confirm}</label>
   <button type="button" className="btn btn-primary" disabled={saving||!checked||!mfaEnabled}
    onClick={()=>void confirmReview()}><CareIcon name="check" size={17}/>{t.approve}</button>
   <p className="clinic-phase17-form-note">{t.reviewHint}</p>
  </section>}
  {displayError&&<p className="clinic-phase17-notice is-error" role="alert">{displayError}</p>}
  {notice&&<p className="clinic-phase17-notice is-success" role="status">{notice}</p>}
 </section>;
}
