"use client";
import React,{useEffect,useMemo,useRef,useState,type ReactNode,type FormEvent,type CSSProperties} from "react";
import {InlineAlert,usePreferences} from "./index";
import {Shell} from "./phase03";

type Language="en"|"fa-AF"|"ps-AF";
type Role="owner"|"manager"|"dentist"|"assistant"|"receptionist"|"cashier";
type Space={clinicId:string;clinicName:string;role:Role;membershipId:string;clinicianEnabled:boolean;capabilities:string[];clinicStatus:string};
type Context={name:string;email:string;clinics:Space[];mfaEnabled:boolean};
type Dentition="permanent"|"primary";
type Mode="current"|"visit"|"history";
type Condition="sound"|"caries_suspected"|"restored"|"missing"|"extraction_planned"|"root_canal_treated"|"crown"|"implant"|"other";
type Observation={id:string;toothCode:string;dentition:Dentition;condition:Condition;surfaces:string[];notes:string|null;
 observationDate:string;encounterId:string;status:"draft"|"validated";recordedByName:string|null;
 validatedByName:string|null;createdAt:string;validatedAt:string|null};
type Visit={id:string;status:string;reason:string;createdAt:string;canRecord:boolean};
type ChartContext={patient:{id:string;patientNumber:string;preferredName:string;familyName:string|null;
 suggestedDentition:Dentition|"choose"};encounters:Visit[];canRecord:boolean;canValidate:boolean;
 system:string;noAutomatedDiagnosis:boolean};
const BASE=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const CONDITIONS:Condition[]=["sound","caries_suspected","restored","missing","extraction_planned",
 "root_canal_treated","crown","implant","other"];
const surfaces=["M","D","B","L","P","O","I"] as const;
const dict:Record<Language,Record<string,string>>={
 en:{
 chart:"Dental Chart",description:"FDI tooth observations · privately recorded clinical findings",
 overview:"Overview",visits:"Visits",files:"Files",worklist:"Worklist",patient:"Patient",
 system:"FDI system",primary:"Primary teeth",permanent:"Permanent teeth",chooseDentition:"Select dentition",
 chooseDentitionHelp:"Age is unknown; choose permanent or primary teeth before charting.",
 upper:"Upper jaw",lower:"Lower jaw",right:"Patient's right",left:"Patient's left",orientation:"Anatomical orientation",
 current:"Current status",visit:"Selected visit",history:"Historical chart",asOf:"View chart as of",
 selectVisit:"Visit / encounter",allVisits:"Choose visit",today:"Today",examinationDate:"Examination date (Gregorian)",
 selectTooth:"Selected tooth",chooseTooth:"Choose a tooth",tooth:"FDI tooth",
 inspector:"Tooth inspector",currentFinding:"Latest validated finding",none:"No validated observation",
 condition:"Observed condition",surfaces:"Tooth surfaces",notes:"Clinical comments",optional:"Optional",
 newObservation:"Record observation",saveValidated:"Save validated finding",saveDraft:"Save observation draft",
 visitRequired:"An encounter is required before recording chart findings.",
 newVisit:"Open patient visits",draftHint:"Assistant entries are drafts until an authorized dentist validates them.",
 clinicianHint:"Validated observations become part of the longitudinal dental chart.",
 validate:"Validate",validatePrompt:"Validate this draft observation as the assigned clinician?",
 confirmation:"Confirm validation",historyLabel:"Observation history",noHistory:"No prior observations for this tooth.",
 by:"Recorded by",validatedBy:"Validated by",date:"Date",linkedVisit:"Visit",
 loading:"Loading chart…",retry:"Retry",saving:"Saving…",success:"Observation saved.",
 validated:"Validated",draft:"Draft",error:"Unable to load or save chart data.",
 noCase:"You are not assigned to a clinical case for this patient. Open an authorized patient encounter.",
 unavailable:"Only authorized clinicians and assigned assistants may use the dental chart.",
 restricted:"Private clinical information — no automatic diagnosis or billing.",
 status:"Status",viewMore:"Older observations",next:"Next",previous:"Previous",page:"Page",
 legend:"Condition legend",zoom:"Zoom",smaller:"Zoom out",larger:"Zoom in",missingHistory:"No observations for this view.",
 viewNote:"Recorded note",noNote:"No comment",sound:"Sound",caries_suspected:"Caries suspected",
 restored:"Restored",missing:"Missing",extraction_planned:"Extraction planned",root_canal_treated:"Root-canal treated",
 crown:"Crown",implant:"Implant",other:"Other",selectDate:"Select a date to view an earlier chart.",
 clinicalSignoff:"Clinician validation",chooseCondition:"Select observed condition",
 conflict:"This request conflicts with an existing record. Review and retry.",
 contact:"Use a new encounter for later examinations rather than changing older findings.",
 anterior:"Front tooth",posterior:"Back tooth",
 noVisit:"There are no eligible encounters yet. Start a patient visit to chart an examination.",
 viewAsOf:"Past observations are never overwritten; the map shows latest findings through your selected date.",
 dentalContext:"Current / selected visit / historical views are separate projections, not automatic diagnoses.",
 M:"Mesial",D:"Distal",B:"Buccal",L:"Lingual",P:"Palatal",O:"Occlusal",I:"Incisal",
 patientSummary:"Patient context",selected:"Selected",reset:"Reset form",privacy:"Clinic-private record",
 unvalidated:"Awaiting clinician validation",startVisit:"Start an authorized examination",
 viewChart:"Dental chart",noticeDate:"Dates are Gregorian for clinical accuracy; historical display follows selected locale.",
 invalid:"Check the tooth, visit, date, condition and surfaces.",retryAction:"Retry save"
 },
 "fa-AF":{
 chart:"چارت دندان",description:"مشاهدات دندان با سیستم FDI · معلومات کلینیکی خصوصی",
 overview:"نمای کلی",visits:"معاینات",files:"فایل‌ها",worklist:"وظایف کلینیکی",patient:"مریض",
 system:"سیستم FDI",primary:"دندان‌های شیری",permanent:"دندان‌های دایمی",chooseDentition:"انتخاب نوع دندان",
 chooseDentitionHelp:"سن نامعلوم است؛ نوع دندان را برای ثبت انتخاب کنید.",
 upper:"فک بالا",lower:"فک پایین",right:"راست مریض",left:"چپ مریض",orientation:"جهت آناتومی",
 current:"وضعیت فعلی",visit:"معاینه انتخاب‌شده",history:"چارت تاریخی",asOf:"نمایش تا تاریخ",
 selectVisit:"معاینه / ویزیت",allVisits:"معاینه انتخاب کنید",today:"امروز",examinationDate:"تاریخ معاینه (میلادی)",
 selectTooth:"دندان انتخاب‌شده",chooseTooth:"انتخاب دندان",tooth:"شماره FDI",
 inspector:"بررسی دندان",currentFinding:"آخرین مشاهده تأییدشده",none:"مشاهده تأییدشده ندارد",
 condition:"حالت مشاهده‌شده",surfaces:"سطح‌های دندان",notes:"ملاحظات کلینیکی",optional:"اختیاری",
 newObservation:"ثبت مشاهده",saveValidated:"ذخیره مشاهده تأییدشده",saveDraft:"ذخیره پیش‌نویس مشاهده",
 visitRequired:"قبل از ثبت باید معاینه مرتبط داشته باشید.",newVisit:"باز کردن معاینات",
 draftHint:"یادداشت دستیار پیش‌نویس است تا داکتر مسئول آن را تأیید کند.",
 clinicianHint:"مشاهدات تأییدشده جزو سابقه دندان مریض است.",
 validate:"تأیید",validatePrompt:"این مشاهده را به‌عنوان داکتر مسئول تأیید می‌کنید؟",
 confirmation:"تأیید نهایی",historyLabel:"تاریخچه مشاهدات",noHistory:"مشاهده قبلی برای این دندان وجود ندارد.",
 by:"ثبت توسط",validatedBy:"تأیید توسط",date:"تاریخ",linkedVisit:"معاینه",
 loading:"چارت بارگذاری می‌شود…",retry:"تلاش دوباره",saving:"در حال ذخیره…",success:"مشاهده ذخیره شد.",
 validated:"تأییدشده",draft:"پیش‌نویس",error:"دریافت یا ذخیره چارت ناکام شد.",
 noCase:"شما به معاینه کلینیکی این مریض دسترسی ندارید. معاینه مجاز باز کنید.",
 unavailable:"چارت دندان فقط برای کارکنان کلینیکی مجاز است.",
 restricted:"معلومات کلینیکی خصوصی؛ بدون تشخیص یا صورت‌حساب خودکار.",
 status:"وضعیت",viewMore:"مشاهدات قبلی",next:"بعدی",previous:"قبلی",page:"صفحه",
 legend:"راهنمای وضعیت",zoom:"بزرگ‌نمایی",smaller:"کوچک‌تر",larger:"بزرگ‌تر",
 missingHistory:"برای این نما مشاهده‌ای ثبت نشده.",viewNote:"یادداشت ثبت‌شده",noNote:"یادداشت ندارد",
 sound:"سالم",caries_suspected:"احتمال پوسیدگی",restored:"ترمیم‌شده",missing:"غایب",
 extraction_planned:"کشیدن برنامه‌شده",root_canal_treated:"عصب‌کشی‌شده",
 crown:"روکش",implant:"ایمپلنت",other:"سایر",selectDate:"برای چارت قدیمی تاریخ انتخاب کنید.",
 clinicalSignoff:"تأیید داکتر",chooseCondition:"حالت مشاهده‌شده را انتخاب کنید",
 conflict:"درخواست با سابقه فعلی هم‌خوانی ندارد؛ دوباره بررسی کنید.",
 contact:"برای معاینه جدید، سابقه قبلی را تغییر ندهید.",
 anterior:"دندان پیشین",posterior:"دندان پسین",
 noVisit:"معاینه مناسب ثبت نشده. برای مشاهده دندان ابتدا معاینه ایجاد کنید.",
 viewAsOf:"مشاهدات قبلی حذف نمی‌شوند؛ نقشه آخرین وضعیت تا تاریخ انتخاب‌شده را نمایش می‌دهد.",
 dentalContext:"نمای فعلی، معاینه و تاریخچه جدا هستند و تشخیص خودکار نیستند.",
 M:"مزیال",D:"دیستال",B:"باکال",L:"لینگوال",P:"پالاتال",O:"اکلوزال",I:"انسیزال",
 patientSummary:"معلومات مریض",selected:"انتخاب‌شده",reset:"پاک‌کردن فورم",
 privacy:"سابقه خصوصی کلینیک",unvalidated:"در انتظار تأیید داکتر",
 startVisit:"آغاز معاینه مجاز",viewChart:"چارت دندان",
 noticeDate:"تاریخ ورودی میلادی است؛ نمایش تاریخچه مطابق زبان و تقویم انتخابی است.",
 invalid:"دندان، معاینه، تاریخ، حالت و سطح‌ها را بررسی کنید.",
 retryAction:"تلاش دوباره برای ذخیره"
 },
 "ps-AF":{
 chart:"د غاښونو چارټ",description:"د FDI د غاښونو کتنې · شخصي کلینیکي معلومات",
 overview:"لنډیز",visits:"معاینې",files:"فایلونه",worklist:"کلینیکي چارې",patient:"ناروغ",
 system:"د FDI سیستم",primary:"د شیدو غاښونه",permanent:"دایمي غاښونه",chooseDentition:"د غاښونو ډول",
 chooseDentitionHelp:"عمر نه دی معلوم؛ د معاینې لپاره د غاښونو ډول وټاکئ.",
 upper:"پورته ژامه",lower:"کښته ژامه",right:"د ناروغ ښۍ خوا",left:"د ناروغ چپه خوا",
 orientation:"اناطومي لوری",current:"اوسنی حالت",visit:"غوره شوې معاینه",
 history:"تاریخي چارټ",asOf:"تر دې نېټې",selectVisit:"معاینه / لیدنه",allVisits:"معاینه وټاکئ",
 today:"نن",examinationDate:"د معاینې نېټه (میلادي)",selectTooth:"غوره شوی غاښ",
 chooseTooth:"غاښ وټاکئ",tooth:"د FDI غاښ",inspector:"د غاښ کتنه",
 currentFinding:"وروستۍ تایید شوې کتنه",none:"تایید شوې کتنه نشته",
 condition:"لیدل شوی حالت",surfaces:"د غاښ برخې",notes:"کلینیکي یادښت",optional:"اختیاري",
 newObservation:"کتنه ثبت کړئ",saveValidated:"تایید شوې کتنه خوندي کړئ",saveDraft:"مسوده خوندي کړئ",
 visitRequired:"د غاښ ثبتولو لپاره اړونده معاینه اړینه ده.",newVisit:"معاینې پرانیزئ",
 draftHint:"د مرستیال کتنې مسودې دي تر څو ډاکټر یې تایید کړي.",
 clinicianHint:"تایید شوې کتنې د ناروغ په تاریخ کې ساتل کېږي.",
 validate:"تایید",validatePrompt:"د مسوول ډاکټر په توګه دا کتنه تاییدوئ؟",
 confirmation:"تایید",historyLabel:"د کتونونو تاریخ",noHistory:"د دې غاښ پخوانۍ کتنه نشته.",
 by:"ثبت کوونکی",validatedBy:"تایید کوونکی",date:"نېټه",linkedVisit:"معاینه",
 loading:"چارټ بارېږي…",retry:"بیا هڅه",saving:"خوندي کېږي…",success:"کتنه خوندي شوه.",
 validated:"تایید شوې",draft:"مسوده",error:"د چارټ اخیستل یا خوندي کول ناکام شول.",
 noCase:"تاسو د دې ناروغ اړوند کلینیکي معاینه نه لرئ. اجازه لرونکې معاینه پرانیزئ.",
 unavailable:"یوازې اجازه لرونکي کلینیکي کارکوونکي چارټ کارولی شي.",
 restricted:"شخصي کلینیکي معلومات؛ اتومات تشخیص او بیل نشته.",
 status:"حالت",viewMore:"پخوانۍ کتنې",next:"بل",previous:"مخکېنی",page:"پاڼه",
 legend:"د حالاتو رهنما",zoom:"غټوالی",smaller:"کوچنی",larger:"غټ",
 missingHistory:"په دې برخه کې کتنه نشته.",viewNote:"ثبت شوی یادښت",noNote:"یادښت نشته",
 sound:"روغ",caries_suspected:"د خرابوالي شک",restored:"ترمیم شوی",missing:"نه شته",
 extraction_planned:"د ایستلو پلان",root_canal_treated:"عصب درملنه",
 crown:"تاج",implant:"امپلانټ",other:"نور",selectDate:"د پخواني چارټ لپاره نېټه وټاکئ.",
 clinicalSignoff:"د ډاکټر تایید",chooseCondition:"حالت غوره کړئ",
 conflict:"دا غوښتنه له بل ریکارډ سره ټکر لري؛ بیا یې وګورئ.",
 contact:"د نوې معاینې لپاره پخوانۍ کتنې مه بدلوئ.",
 anterior:"مخکینی غاښ",posterior:"شا غاښ",
 noVisit:"مناسبه معاینه نشته؛ لومړی معاینه جوړه کړئ.",
 viewAsOf:"زړې کتنې نه پاکېږي؛ نقشه د ټاکلې نېټې حالت ښيي.",
 dentalContext:"اوسنی، ټاکل شوې معاینه او تاریخ بېل دي؛ اتومات تشخیص نه دی.",
 M:"مزیال",D:"ډیستال",B:"باکال",L:"لینګوال",P:"پالاتال",O:"اکلوزال",I:"انسیزال",
 patientSummary:"د ناروغ معلومات",selected:"غوره شوی",reset:"فورم پاک کړئ",
 privacy:"د کلینیک شخصي ثبت",unvalidated:"د ډاکټر تایید ته منتظر",
 startVisit:"اجازه لرونکې معاینه پیل کړئ",viewChart:"د غاښونو چارټ",
 noticeDate:"د لیکلو نېټه میلادي ده؛ د ښودلو نېټه له ټاکلي تقویم سره سمون لري.",
 invalid:"غاښ، معاینه، نېټه، حالت او برخې وګورئ.",retryAction:"بیا خوندي کړئ"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang:Language=locale==="fa-AF"||locale==="ps-AF"||locale==="en"?locale:"en";
 const t=(key:string)=>dict[lang][key]||dict.en[key]||key;
 const format=(date:unknown,opts?:Intl.DateTimeFormatOptions)=>{
  if(!date)return "—";
  try{
   return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
    calendar:calendar==="solar_hijri"?"persian":"gregory",year:"numeric",month:"short",day:"numeric",
    ...opts}).format(new Date(String(date).slice(0,10)+"T12:00:00Z"));
  }catch{return String(date);}
 };
 return {t,format,lang};
}
function today(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",year:"numeric",
  month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const d=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [d.year,d.month,d.day].join("-");
}
async function api(path:string,method="GET",body?:unknown):Promise<any>{
 const response=await fetch(BASE+"/v1/chart"+path,{method,cache:"no-store",credentials:"include",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(new Error(data.code||"CHART_UNAVAILABLE"),{status:response.status});
 return data;
}
function useQuery(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [seq,setSeq]=useState(0);
 const refresh=()=>{setError("");setData(null);setSeq(s=>s+1);};
 useEffect(()=>{if(!path){setData(null);setError("");return;}
  let active=true;setData(null);setError("");
  api(path).then(x=>{if(active)setData(x);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[path,seq]);
 return {data,error,refresh};
}
const patientPath=(cid:string,id:string)=>"/clinic/patients/"+id+"?clinic="+encodeURIComponent(cid);
const visitPath=(cid:string,id:string)=>"/clinic/patients/"+id+"/visits?clinic="+encodeURIComponent(cid);
const chartPath=(cid:string,id:string)=>"/clinic/patients/"+id+"/chart?clinic="+encodeURIComponent(cid);
const filePath=(cid:string,id:string)=>"/clinic/patients/"+id+"/files?clinic="+encodeURIComponent(cid);
function Notice({children,kind="info"}:{children:ReactNode;kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Busy(){const {t}=useWords();return <div className="card phase08-loading" aria-live="polite">
 <span className="phase05-spinner" aria-hidden="true"/>{t("loading")}</div>;}
function Problem({code,retry,patientId,clinicId}:{code:string;retry?:()=>void;patientId?:string;clinicId?:string}){
 const {t}=useWords();
 const message=code==="CHART_CASE_NOT_ASSIGNED"?t("noCase"):
 code==="DUPLICATE_ACTION_CHANGED"||code==="CHART_CONFLICT"?t("conflict"):
 code.startsWith("INVALID_")?t("invalid"):code==="CHART_ROLE_DENIED"?t("unavailable"):t("error")+" ("+code+")";
 return <section className="card phase08-error" role="alert"><strong>{message}</strong>
  <div className="phase08-actions">{retry&&<button className="btn btn-secondary" onClick={retry}>{t("retry")} ↻</button>}
  {patientId&&clinicId&&code==="CHART_CASE_NOT_ASSIGNED"&&<a className="btn btn-primary" href={visitPath(clinicId,patientId)}>
   {t("startVisit")} →</a>}</div></section>;
}
function fdi(d:Dentition){
 const topLeft=d==="permanent"?[18,17,16,15,14,13,12,11]:[55,54,53,52,51];
 const topRight=d==="permanent"?[21,22,23,24,25,26,27,28]:[61,62,63,64,65];
 const bottomLeft=d==="permanent"?[48,47,46,45,44,43,42,41]:[85,84,83,82,81];
 const bottomRight=d==="permanent"?[31,32,33,34,35,36,37,38]:[71,72,73,74,75];
 return {top:[topLeft,topRight],bottom:[bottomLeft,bottomRight],
  all:[...topLeft,...topRight,...bottomLeft,...bottomRight].map(String)};
}
const isAnterior=(code:string)=>Number(code[1])<=3;
function ToothIcon({code,upper,condition}:{code:string;upper:boolean;condition:Condition|null}){
 const front=isAnterior(code);
 // Upper roots are above the crowns; lower roots appear below. Tooth morphology is schematic.
 const crown=front?"M15 38 Q23 33 32 38 L32 55 Q24 60 15 55 Z":
 "M7 36 Q24 31 41 36 L41 56 Q31 64 17 61 Q7 60 7 52 Z";
 const roots=front?"M19 38 L21 12 Q24 6 27 12 L29 38":
 "M12 38 L10 13 Q14 6 19 13 L20 38 M27 38 L29 11 Q34 6 38 15 L36 38";
 return <svg viewBox="0 0 48 72" aria-hidden="true" focusable="false" className={"phase08-tooth-svg state-"+(condition||"unrecorded")}>
  <g transform={upper?undefined:"translate(0 72) scale(1 -1)"}>
   <path d={roots} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
   <path d={crown} className="phase08-crown" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round"/>
   {!front&&<path d="M12 47 Q24 41 36 47 M15 55 Q24 50 33 55" fill="none" stroke="currentColor"
    strokeWidth="1.5" opacity=".48"/>}
   {front&&<path d="M17 48 L30 48" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>}
   {condition==="missing"&&<path d="M8 12 L40 60 M40 12 L8 60" stroke="#6e7684" strokeWidth="3" strokeLinecap="round"/>}
   {condition==="restored"&&<circle cx="24" cy="48" r="5" fill="#fff" stroke="currentColor" strokeWidth="1.8"/>}
   {condition==="implant"&&<path d="M23 11 V35 M19 18 H27 M19 24 H27" stroke="currentColor" strokeWidth="2"/>}
  </g>
 </svg>;
}
function ToothButton({code,upper,condition,selected,choose,onArrow,t}:{
 code:string;upper:boolean;condition:Condition|null;selected:boolean;choose:(c:string)=>void;
 onArrow:(code:string,dir:number)=>void;t:(key:string)=>string
}){
 return <button type="button" id={"fdi-tooth-"+code} key={code}
  className={"phase08-tooth"+(selected?" selected":"")+(condition?" state-"+condition:"")}
  aria-pressed={selected} aria-label={t("tooth")+" "+code+" · "+(condition?t(condition):t("none"))}
  onClick={()=>choose(code)} onKeyDown={event=>{
   if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
    event.preventDefault();onArrow(code,event.key==="ArrowRight"?1:-1);
   }
  }}>
   <ToothIcon code={code} upper={upper} condition={condition}/>
   <span className="phase08-fdi-number" dir="ltr">{code}</span>
  </button>;
}
function Odontogram({dentition,teeth,selected,choose,zoom,t}:{
 dentition:Dentition;teeth:Observation[];selected:string;choose:(c:string)=>void;
 zoom:number;t:(key:string)=>string
}){
 const schema=fdi(dentition);
 const states=new Map(teeth.map(x=>[x.toothCode,x.condition]));
 function arrow(code:string,dir:number){
  const index=schema.all.indexOf(code);if(index<0)return;
  const next=schema.all[(index+dir+schema.all.length)%schema.all.length];
  choose(next);requestAnimationFrame(()=>document.getElementById("fdi-tooth-"+next)?.focus());
 }
 const draw=(halves:number[][],upper:boolean)=><div className="phase08-arch">
  {halves.map((side,idx)=><div key={idx} className="phase08-quadrant">
   {side.map(value=><ToothButton key={value} code={String(value)} upper={upper}
    selected={selected===String(value)} condition={states.get(String(value))||null}
    choose={choose} onArrow={arrow} t={t}/>)}</div>)}
 </div>;
 return <div className="phase08-chart-scroll" tabIndex={0} role="region"
  aria-label={t("chart")+" · "+t(dentition)} dir="ltr">
  <div className="phase08-chart-surface" style={{"--tooth-size":zoom+"px"} as CSSProperties}>
   <div className="phase08-orientation">
    <span>{t("right")}</span><strong>{t("orientation")} · {t("system")}</strong><span>{t("left")}</span>
   </div>
   <div className="phase08-jaw-label">{t("upper")}</div>
   {draw(schema.top,true)}
   <div className="phase08-midline"><span>{t("patient")}</span></div>
   {draw(schema.bottom,false)}
   <div className="phase08-jaw-label">{t("lower")}</div>
   <p className="phase08-orient-foot">{t("right")} ◀ &nbsp; │ &nbsp; ▶ {t("left")}</p>
  </div>
 </div>;
}
export function DentalChartPortal(){
 const {t,format}=useWords();
 const [context,setContext]=useState<Context|null>(null),[contextError,setContextError]=useState("");
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setRequested(new URLSearchParams(location.search).get("clinic"));
  fetch(BASE+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(x.code||"AUTH_REQUIRED");setContext(x);})
   .catch(e=>setContextError(e.message||"NETWORK_ERROR"));
 },[]);
 if(contextError==="AUTH_REQUIRED")return <div className="card panel"><Notice kind="warning">{t("unavailable")}</Notice>
  <a className="btn btn-primary" href="/clinic/login">Login</a></div>;
 if(contextError)return <Problem code={contextError} retry={()=>location.reload()}/>;
 if(!context||requested===undefined)return <Busy/>;
 const space=requested?context.clinics.find(s=>s.clinicId===requested):context.clinics[0];
 if(!space)return <Problem code="CHART_ROLE_DENIED"/>;
 if(space.role!=="dentist"&&space.role!=="assistant"&&
  !((space.role==="owner"||space.role==="manager")&&space.clinicianEnabled))
  return <Problem code="CHART_ROLE_DENIED"/>;
 const bits=typeof location==="undefined"?[]:location.pathname.split("/").filter(Boolean);
 const i=bits.indexOf("patients"),patientId=i>=0?bits[i+1]||"":"";
 return <Shell ctx={context} space={space} active="patients">
  <DentalChart space={space} patientId={patientId} format={format}/>
 </Shell>;
}
function DentalChart({space,patientId,format}:{space:Space;patientId:string;
 format:(d:unknown,opts?:Intl.DateTimeFormatOptions)=>string}){
 const {t}=useWords();
 const base="/clinics/"+space.clinicId+"/patients/"+patientId;
 const {data:context,error:ctxError,refresh:refreshContext}=useQuery(base+"/context");
 const [dentition,setDentition]=useState<Dentition|"">("");
 const [mode,setMode]=useState<Mode>("current");
 const [asOf,setAsOf]=useState(today());
 const [encounterId,setEncounterId]=useState("");
 const [selected,setSelected]=useState("");
 const [zoom,setZoom]=useState(52);
 const [formCondition,setFormCondition]=useState<Condition|"">("");
 const [formSurfaces,setFormSurfaces]=useState<string[]>([]);
 const [formNotes,setFormNotes]=useState("");
 const [observationDate,setObservationDate]=useState(today());
 const [writing,setWriting]=useState(false),[message,setMessage]=useState(""),[failure,setFailure]=useState("");
 const [historyPage,setHistoryPage]=useState(1);
 const keyRef=useRef("");
 const snapshotUrl=dentition&&context&&(mode!=="visit"||encounterId)?
  base+"/snapshot?"+new URLSearchParams({dentition,mode,
   ...(mode==="visit"?{encounterId}:{}),...(mode==="history"?{asOf}:{})}):null;
 const {data:snapshot,error:snapshotError,refresh:refreshSnapshot}=useQuery(snapshotUrl);
 const {data:observations,error:observationsError,refresh:refreshObservations}=useQuery(
  context&&selected?base+"/observations?"+new URLSearchParams({toothCode:selected,
   page:String(historyPage),...(mode==="visit"&&encounterId?{encounterId}:{})}):null);
 const teeth=snapshot?.teeth as Observation[]||[];
 const selectedObservation=teeth.find(x=>x.toothCode===selected);
 const chartTeeth=dentition?fdi(dentition).all:[];
 useEffect(()=>{
  if(!context)return;
  const suggested=context.patient.suggestedDentition;
  if(suggested==="permanent"||suggested==="primary")setDentition(suggested);
  const param=new URLSearchParams(location.search).get("encounterId");
  const eligible=context.encounters.find((e:Visit)=>e.id===param)||
   context.encounters.find((e:Visit)=>e.canRecord);
  if(eligible)setEncounterId(eligible.id);
 },[context]);
 useEffect(()=>{
  if(!dentition)return;
  setSelected(fdi(dentition).all[0]);setHistoryPage(1);setFormCondition("");
  setFormSurfaces([]);setFormNotes("");keyRef.current="";
 },[dentition]);
 function choose(code:string){
  setSelected(code);setHistoryPage(1);
  setFormCondition("");setFormSurfaces([]);setFormNotes("");
  setFailure("");setMessage("");keyRef.current="";
 }
 const availableSurfaces=selected&&Number(selected[1])<=3?
  surfaces.filter(s=>s!=="O"):surfaces.filter(s=>s!=="I");
 const canRecord=Boolean(context?.canRecord&&encounterId&&
  context.encounters.some((v:Visit)=>v.id===encounterId&&v.canRecord));
 const options=context?.encounters.filter((v:Visit)=>v.canRecord) as Visit[]||[];
 const selectedVisit=context?.encounters.find((v:Visit)=>v.id===encounterId) as Visit|undefined;
 const isAssistant=space.role==="assistant";
 function changeSurfaces(s:string){setFormSurfaces(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]);
  keyRef.current="";}
 async function save(event:FormEvent){
  event.preventDefault();if(!dentition||!selected||!formCondition||!canRecord)return;
  setWriting(true);setFailure("");setMessage("");
  if(!keyRef.current)keyRef.current=crypto.randomUUID();
  try{
   await api(base+"/observations","POST",{dentition,toothCode:selected,condition:formCondition,
    surfaces:formSurfaces,notes:formNotes,observationDate,encounterId,actionKey:keyRef.current});
   keyRef.current="";setFormNotes("");setFormCondition("");setFormSurfaces([]);
   setHistoryPage(1);refreshSnapshot();refreshObservations();setMessage(t("success"));
  }catch(e:any){setFailure(e.message||"CHART_UNAVAILABLE");}
  finally{setWriting(false);}
 }
 async function validate(id:string){
  if(!confirm(t("validatePrompt")))return;
  setWriting(true);setFailure("");setMessage("");
  try{
   await api(base+"/observations/"+id+"/validate","POST",{confirmation:"VALIDATE"});
   refreshSnapshot();refreshObservations();setMessage(t("validated"));
  }catch(e:any){setFailure(e.message||"CHART_UNAVAILABLE");}finally{setWriting(false);}
 }
 if(ctxError)return <Problem code={ctxError} retry={refreshContext} patientId={patientId} clinicId={space.clinicId}/>;
 if(!context)return <Busy/>;
 const patient=context.patient;
 return <div className="phase08-workspace">
  <header className="phase08-heading">
   <div>
    <span className="phase08-eyebrow">DANDANLINK / {space.clinicName} / {t("privacy")}</span>
    <h1>{t("chart")}</h1>
    <p>{t("description")}</p>
   </div>
   <div className="phase08-heading-actions">
    <a className="btn btn-secondary" href={visitPath(space.clinicId,patientId)}>{t("visits")} ↗</a>
    <a className="btn btn-secondary" href={"/clinic/clinical?clinic="+encodeURIComponent(space.clinicId)}>
     {t("worklist")} ↗</a>
   </div>
  </header>
  <section className="card phase08-patient-bar">
   <div className="phase08-avatar" aria-hidden="true">✚</div>
   <div><span className="phase08-kicker">{t("patientSummary")}</span>
    <h2>{patient.preferredName} {patient.familyName||""}</h2>
    <span className="phase08-muted">{t("patient")} <bdi dir="ltr">{patient.patientNumber}</bdi></span></div>
   <span className="phase08-safe-badge">{t("system")} · {t("restricted")}</span>
  </section>
  <nav aria-label={t("patient")} className="phase08-patient-tabs">
   <a href={patientPath(space.clinicId,patientId)}>{t("overview")}</a>
   <a href={visitPath(space.clinicId,patientId)}>{t("visits")}</a>
   <a href={chartPath(space.clinicId,patientId)} aria-current="page">{t("chart")}</a>
   <a href={filePath(space.clinicId,patientId)}>{t("files")}</a>
  </nav>
  <div className="phase08-layout">
   <main className="phase08-main">
    <section className="card phase08-chart-card">
     <div className="phase08-section-heading"><div><span className="phase08-kicker">{t("system")}</span>
      <h2>{t("chart")}</h2><p>{t("dentalContext")}</p></div>
      <div className="phase08-zoom"><span>{t("zoom")}</span>
       <button aria-label={t("smaller")} type="button" disabled={zoom<=42} onClick={()=>setZoom(v=>Math.max(42,v-7))}>−</button>
       <strong dir="ltr">{Math.round(zoom/52*100)}%</strong>
       <button aria-label={t("larger")} type="button" disabled={zoom>=80} onClick={()=>setZoom(v=>Math.min(80,v+7))}>+</button>
      </div>
     </div>
     <div className="phase08-dentition" role="group" aria-label={t("chooseDentition")}>
      {(["permanent","primary"] as Dentition[]).map(key=><button key={key} type="button"
       aria-pressed={dentition===key} onClick={()=>setDentition(key)}>{t(key)}</button>)}
     </div>
     {!dentition?<Notice kind="warning">{t("chooseDentitionHelp")}</Notice>:<>
      <div className="phase08-viewtabs" role="tablist" aria-label={t("chart")}>
       {(["current","visit","history"] as Mode[]).map(m=><button key={m} role="tab" type="button"
        aria-selected={mode===m} onClick={()=>{setMode(m);setHistoryPage(1);}}>{t(m)}</button>)}
      </div>
      {mode==="visit"&&<label className="phase08-filter"><span>{t("selectVisit")}</span>
       <select value={encounterId} onChange={e=>{setEncounterId(e.target.value);setHistoryPage(1);}}>
        <option value="">{t("allVisits")}</option>
        {context.encounters.map((v:Visit)=><option value={v.id} key={v.id}>
         {format(v.createdAt)} · {v.reason.slice(0,60)} ({t(v.status)})</option>)}</select></label>}
      {mode==="history"&&<div className="phase08-history-filter">
       <label className="phase08-filter"><span>{t("asOf")}</span>
        <input type="date" max={today()} value={asOf}
         onChange={e=>setAsOf(e.target.value)}/></label>
       <span>{t("viewAsOf")}</span></div>}
      {snapshotError?<Problem code={snapshotError} retry={refreshSnapshot}/>:
       !snapshot?<Busy/>:<>
        <Odontogram dentition={dentition} teeth={teeth} selected={selected}
         choose={choose} zoom={zoom} t={t}/>
        {!snapshot.observedCount&&<p className="phase08-empty">{t("missingHistory")}</p>}
       </>}
      <div className="phase08-legend"><span className="phase08-kicker">{t("legend")}</span>
       <div className="phase08-legend-items">{CONDITIONS.map(condition=><span key={condition}
        className={"phase08-legend-item state-"+condition}>
        <i aria-hidden="true"/>{t(condition)}</span>)}</div>
      </div>
     </>}
    </section>
    {selected&&<section className="card phase08-history-card">
     <div className="phase08-section-heading"><div><span className="phase08-kicker">{t("tooth")}</span>
      <h2>{t("historyLabel")} · <bdi dir="ltr">{selected}</bdi></h2>
      <p>{t("viewAsOf")}</p></div><span className="phase08-history-count">{t("system")}</span></div>
     {observationsError?<Problem code={observationsError} retry={refreshObservations}/>:
      !observations?<Busy/>:
      !observations.observations.length?<p className="phase08-empty">{t("noHistory")}</p>:
       <ol className="phase08-observations">{observations.observations.map((ob:Observation)=>
        <li key={ob.id}><div className={"phase08-obs-dot state-"+ob.condition} aria-hidden="true"/>
         <div className="phase08-obs-content">
          <div className="phase08-obs-head"><strong>{t(ob.condition)}</strong>
           <span className={"phase08-status "+ob.status}>{t(ob.status)}</span></div>
          <p>{format(ob.observationDate)} · {t("by")}: {ob.recordedByName||"—"}</p>
          <p>{t("linkedVisit")}: <bdi dir="ltr">{ob.encounterId.slice(0,8)}</bdi> ·
           {ob.surfaces.length?ob.surfaces.map(x=>t(x)).join(", "):t("none")}</p>
          {ob.notes&&<p className="phase08-obs-note">{ob.notes}</p>}
          {ob.status==="validated"&&ob.validatedByName&&<p>{t("validatedBy")}: {ob.validatedByName}</p>}
         </div>
         {context.canValidate&&ob.status==="draft"&&selectedVisit?.id===ob.encounterId&&
          <button type="button" className="btn btn-secondary" disabled={writing}
           onClick={()=>validate(ob.id)}>{t("validate")} ✓</button>}
        </li>)}</ol>}
     {observations&&<div className="phase08-pagination">
      <button type="button" className="btn btn-secondary" disabled={historyPage<=1}
       onClick={()=>setHistoryPage(p=>p-1)}>{t("previous")}</button>
      <span>{t("page")} {historyPage}</span>
      <button type="button" className="btn btn-secondary" disabled={!observations.hasMore}
       onClick={()=>setHistoryPage(p=>p+1)}>{t("next")}</button></div>}
    </section>}
   </main>
   <aside className="phase08-inspector">
    <section className="card phase08-inspector-card">
     <div className="phase08-inspector-title"><span className="phase08-kicker">{t("inspector")}</span>
      <h2>{t("tooth")} <bdi dir="ltr">{selected||"—"}</bdi></h2></div>
     <label className="phase08-field"><span>{t("chooseTooth")}</span>
      <select value={selected} disabled={!dentition} onChange={e=>choose(e.target.value)}>
       {!dentition&&<option value="">{t("chooseDentition")}</option>}
       {chartTeeth.map(code=><option key={code} value={code}>{code} · {t(Number(code[1])<=3?"anterior":"posterior")}</option>)}</select></label>
     <div className="phase08-current">
      <span className="phase08-kicker">{t("currentFinding")}</span>
      {selectedObservation?<><strong>{t(selectedObservation.condition)}</strong>
       <p>{format(selectedObservation.observationDate)} · {selectedObservation.surfaces.map(x=>t(x)).join(", ")}</p>
       <p>{selectedObservation.notes||t("noNote")}</p></>:
       <p>{t("none")}</p>}
     </div>
     <div className="phase08-divider"/>
     <h3>{t("newObservation")}</h3>
     {!options.length?<div className="phase08-stack"><Notice kind="warning">{t("noVisit")}</Notice>
      <a className="btn btn-primary" href={visitPath(space.clinicId,patientId)}>{t("newVisit")} →</a></div>:
      <form className="phase08-form" onSubmit={save}>
       <label className="phase08-field"><span>{t("selectVisit")} *</span>
        <select required value={encounterId} onChange={e=>{setEncounterId(e.target.value);keyRef.current="";}}>
         <option value="">{t("allVisits")}</option>
         {options.map((v:Visit)=><option key={v.id} value={v.id}>
          {format(v.createdAt)} · {v.reason.slice(0,56)}</option>)}</select></label>
       <label className="phase08-field"><span>{t("examinationDate")} *</span>
        <input type="date" max={today()} required value={observationDate}
         onChange={e=>{setObservationDate(e.target.value);keyRef.current="";}}/></label>
       <label className="phase08-field"><span>{t("condition")} *</span>
        <select required value={formCondition} onChange={e=>{setFormCondition(e.target.value as Condition);
         keyRef.current="";}}><option value="">{t("chooseCondition")}</option>
         {CONDITIONS.map(key=><option key={key} value={key}>{t(key)}</option>)}</select></label>
       <fieldset className="phase08-surface-fieldset"><legend>{t("surfaces")} ({t("optional")})</legend>
        <div className="phase08-surface-tags">{availableSurfaces.map(code=><label key={code}
         className={formSurfaces.includes(code)?"active":""}>
         <input type="checkbox" checked={formSurfaces.includes(code)}
          onChange={()=>changeSurfaces(code)}/><abbr title={t(code)}>{code}</abbr></label>)}</div>
       </fieldset>
       <label className="phase08-field"><span>{t("notes")} ({t("optional")})</span>
        <textarea rows={3} maxLength={1000} value={formNotes}
         onChange={e=>{setFormNotes(e.target.value);keyRef.current="";}}/></label>
       <button className="btn btn-primary phase08-submit" type="submit" disabled={writing||!canRecord||
        !selected||!dentition||!formCondition||!observationDate}>
        {writing?t("saving"):t(isAssistant?"saveDraft":"saveValidated")} →</button>
       <p className="phase08-muted">{t(isAssistant?"draftHint":"clinicianHint")}</p>
       {message&&<Notice kind="success">{message}</Notice>}
       {failure&&<Problem code={failure} retry={undefined}/>}
      </form>}
    </section>
    <section className="phase08-info">
     <div aria-hidden="true" className="phase08-info-icon">◇</div>
     <p>{t("restricted")} {t("contact")} {t("noticeDate")}</p>
    </section>
   </aside>
  </div>
 </div>;
}
