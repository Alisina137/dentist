"use client";
import React,{useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {InlineAlert,usePreferences} from "./index";
import {Shell} from "./phase03";
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Role="owner"|"manager"|"dentist"|"assistant"|"receptionist"|"cashier";
type Space={clinicId:string;clinicName:string;role:Role;membershipId:string;clinicianEnabled:boolean;clinicStatus:string;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Item={serviceId:string;serviceVersion?:number;name?:string;quantity:number;unitPriceAfn?:number;discountAfn:number;totalAfn?:number};
type Stage={id?:string;position?:number;description:string;toothCodes:string[];expectedVisits:number;dueDate:string|null;
 status?:string;startedAt?:string|null;completedAt?:string|null;linkedEncounterId?:string|null;completionNote?:string|null};
type Plan={id:string;title:string;indication:string;expectedSessions:number;durationMinutes:number|null;notes:string|null;
 status:string;version:number;revision:number;consentState:string;estimateTotalAfn:number;clinicianMembershipId:string;updatedAt:string};
type Detail={plan:Plan;items:Item[];stages:Stage[];events:any[];consents:any[];versions:any[];currency:string;autoInvoicing:false};
type Service={id:string;name:string;category:string;base_price_afn:number;version:number};
type Encounter={id:string;reason:string;status:string;created_at:string};
type Draft={title:string;indication:string;expectedSessions:number;durationMinutes:string;notes:string;
 items:{serviceId:string;quantity:number;discountAfn:number}[];
 stages:Stage[]};
const newDraft=():Draft=>({title:"",indication:"",expectedSessions:3,durationMinutes:"",notes:"",
 items:[{serviceId:"",quantity:1,discountAfn:0}],
 stages:[{description:"",toothCodes:[],expectedVisits:1,dueDate:null}]});
type Language="en"|"fa-AF"|"ps-AF";
const translations:Record<Language,Record<string,string>>={
 en:{
 treatments:"Treatment Plans",tagline:"Clinician-led proposals, consent, performed stages and estimates",
 plans:"Plans",newPlan:"New treatment plan",create:"Create draft",draft:"Draft",proposed:"Proposed",
 active:"Accepted / In progress",accepted:"Accepted",in_progress:"In progress",completed:"Completed",
 discontinued:"Discontinued",all:"All",search:"Search by plan title",empty:"No plans match your selection.",
 summary:"Plan summary",stages:"Stages",estimate:"Estimate",consent:"Consent",timeline:"Timeline",
 versions:"Versions",overview:"Overview",visits:"Visits",chart:"Dental Chart",files:"Files",
 title:"Treatment title",indication:"Clinical indication",sessions:"Expected sessions",
 duration:"Estimated duration (minutes)",notes:"Clinician notes",optional:"Optional",service:"Service",
 quantity:"Quantity",discount:"Discount (AFN)",price:"Unit price (AFN)",lineTotal:"Line total",
 total:"Estimated total",currency:"AFN",addService:"Add estimate line",remove:"Remove",
 addStage:"Add treatment stage",description:"Stage description / performed-procedure name",
 teeth:"FDI tooth codes (comma-separated)",stageVisits:"Expected visits",dueDate:"Suggested due date",
 catalog:"Service catalog prices are snapshotted when a version is saved.",
 stageProof:"To complete a stage, document a matching performed procedure in a signed visit. The exact stage description must appear under performed procedures.",
 patient:"Patient",clinic:"Clinic",selectService:"Select service",choose:"Choose",save:"Save draft",
 revise:"Create new version",revisionReason:"Reason for revision",reconsent:"Changes require a new proposal and fresh consent; prior approvals remain in history.",
 status:"Status",version:"Version",lastUpdated:"Updated",noVisits:"Create a clinical visit before drafting this treatment plan.",
 back:"Treatment plans",cancel:"Cancel",loading:"Loading treatment records…",error:"The operation failed. Your form remains available.",
 retry:"Retry",ready:"Saved successfully",start:"Start stage",complete:"Complete stage",skip:"Skip stage",
 skipped:"Skipped",pending:"Pending",started:"In progress",view:"Open",actions:"Actions",
 signedVisit:"Signed encounter with recorded performed procedure",reason:"Reason",explanation:"Explanation",
 stageEvidence:"Evidence of performed care",noEvidence:"Select a signed visit matching the stage description and affected teeth.",
 propose:"Propose plan",consentTitle:"Record witnessed in-person consent",person:"Patient / guardian name",
 role:"Consenting person",patientRole:"Patient",guardian:"Guardian",relationship:"Relationship to patient",
 witness:"Witness name",scope:"Consent scope (what was explained and accepted)",acknowledged:"Attestation date / time",
 confirmation:"I witnessed and recorded in-person consent for the current plan version.",
 recordConsent:"Record consent and accept plan",consentRequired:"A current version-specific consent is required before starting or completing stages.",
 consentRecorded:"Consent recorded",none:"Not recorded",withdrawn:"Withdrawn",withdraw:"Withdraw consent",
 withdrawalReason:"Reason for withdrawal",discontinue:"Discontinue plan",discontinueReason:"Reason for discontinuation",
 confirmationStop:"Discontinue this plan? Existing history and completed care will remain.",
 confirmationConsent:"Record this witnessed attestation? This is not an electronic signature.",
 completionWarning:"Plan/stage completion is not an invoice and never marks a payment received.",
 priceWarning:"Estimates use AFN integer pricing; there is no invoice or payment posting in this phase.",
 noChanges:"No edits to an accepted plan; create a new proposal version with a reason.",
 clinicianOnly:"Only the assigned qualified clinician can manage this plan.",
 historyNote:"Versioned proposals and witnessed consent are permanent audit history.",
 noHistory:"No actions recorded.",noConsent:"There is no consent for the current version.",
 viewPatient:"Patient overview",edit:"Edit / revise",noStages:"No treatment stages exist.",
 chooseEncounter:"Choose signed encounter",performed:"Procedure evidence checked against signed encounter",
 privacy:"Private clinical data",saved:"Saved",noResults:"No details",planId:"Plan",refresh:"Refresh",
 patientFacing:"This plan has not been released to the patient app.",plus:"Add",next:"Next",previous:"Previous",
 archived:"Audit history",submitted:"Recorded",filter:"Filter",unsaved:"Keep your text until saved or cancelled.",
 finish:"Complete the final stage to close this plan. There is no automatic payment.",
 statusLabel:"Plan status",warning:"Clinical care must be based on professional judgment, not inferred automatically.",
 consentHistory:"Consent and withdrawal history",reasonPlaceholder:"Provide a clear clinical reason (at least 10 characters).",
 signatureNote:"In-person attestation recorded by authorized clinician; no digital signature is created.",
 stageNotes:"Stages are version-bound. Previous progress remains auditable after revision."
 },
 "fa-AF":{
 treatments:"پلان‌های تداوی",tagline:"پلان داکتر، رضایت، مراحل انجام‌شده و برآورد هزینه",
 plans:"پلان‌ها",newPlan:"پلان تداوی جدید",create:"ایجاد پیش‌نویس",draft:"پیش‌نویس",proposed:"پیشنهادشده",
 active:"پذیرفته / در جریان",accepted:"پذیرفته‌شده",in_progress:"در جریان",completed:"تکمیل‌شده",
 discontinued:"متوقف‌شده",all:"همه",search:"جستجوی نام پلان",empty:"پلان مطابق پیدا نشد.",
 summary:"خلاصه پلان",stages:"مراحل",estimate:"برآورد",consent:"رضایت",timeline:"تاریخچه",
 versions:"نسخه‌ها",overview:"نمای کلی",visits:"معاینات",chart:"چارت دندان",files:"فایل‌ها",
 title:"عنوان تداوی",indication:"دلیل کلینیکی",sessions:"تعداد جلسات",duration:"مدت تخمینی (دقیقه)",
 notes:"یادداشت داکتر",optional:"اختیاری",service:"خدمت",quantity:"تعداد",discount:"تخفیف (افغانی)",
 price:"قیمت واحد (افغانی)",lineTotal:"قیمت مجموعی",total:"برآورد مجموعی",currency:"افغانی",
 addService:"افزودن خدمت",remove:"حذف",addStage:"افزودن مرحله",description:"شرح مرحله / نام عملیه انجام‌شده",
 teeth:"شماره‌های FDI (جدا با کاما)",stageVisits:"جلسات مرحله",dueDate:"تاریخ پیشنهادی",
 catalog:"قیمت خدمات هنگام ذخیره نسخه ثابت می‌ماند.",
 stageProof:"تکمیل مرحله نیاز به عملیه انجام‌شده مطابق نام مرحله در معاینه امضاشده دارد.",
 patient:"مریض",clinic:"کلینیک",selectService:"انتخاب خدمت",choose:"انتخاب",save:"ذخیره پیش‌نویس",
 revise:"ساخت نسخه جدید",revisionReason:"دلیل تغییر",reconsent:"تغییرات نیاز به پیشنهاد و رضایت دوباره دارند؛ تاریخچه قبلی حفظ می‌شود.",
 status:"وضعیت",version:"نسخه",lastUpdated:"به‌روزرسانی",noVisits:"ابتدا معاینه کلینیکی مریض ثبت کنید.",
 back:"پلان‌های تداوی",cancel:"انصراف",loading:"در حال دریافت پلان‌ها…",error:"عملیات ناکام شد؛ متن فورم حفظ شده است.",
 retry:"دوباره",ready:"با موفقیت ذخیره شد",start:"آغاز مرحله",complete:"تکمیل مرحله",skip:"صرف‌نظر از مرحله",
 skipped:"ردشده",pending:"منتظر",started:"در جریان",view:"باز کردن",actions:"عملیات",
 signedVisit:"معاینه امضاشده با عملیه واقعی",reason:"دلیل",explanation:"توضیح",
 stageEvidence:"شواهد تداوی انجام‌شده",noEvidence:"معاینه امضاشده با نام و شماره دندان مطابق مرحله انتخاب کنید.",
 propose:"پیشنهاد پلان",consentTitle:"ثبت رضایت حضوری با شاهد",person:"نام مریض / سرپرست",
 role:"شخص رضایت‌دهنده",patientRole:"مریض",guardian:"سرپرست",relationship:"نسبت با مریض",
 witness:"نام شاهد",scope:"محدوده رضایت و توضیحات ارائه‌شده",acknowledged:"تاریخ / وقت رضایت",
 confirmation:"رضایت حضوری این نسخه را با شاهد ثبت می‌کنم.",
 recordConsent:"ثبت رضایت و پذیرش پلان",consentRequired:"پیش از شروع مراحل، رضایت مخصوص نسخه فعلی ضروری است.",
 consentRecorded:"رضایت ثبت‌شده",none:"ثبت نشده",withdrawn:"لغوشده",withdraw:"لغو رضایت",
 withdrawalReason:"دلیل لغو",discontinue:"توقف پلان",discontinueReason:"دلیل توقف",
 confirmationStop:"پلان متوقف شود؟ تاریخچه و تداوی انجام‌شده باقی می‌ماند.",
 confirmationConsent:"رضایت حضوری با شاهد ثبت شود؟ این امضای الکترونیکی نیست.",
 completionWarning:"تکمیل پلان به معنی پرداخت بل نیست.",priceWarning:"برآورد افغانی است؛ بل و پرداخت هنوز ایجاد نمی‌شود.",
 noChanges:"برای تغییر پلان پذیرفته‌شده نسخه پیشنهادی جدید بسازید.",clinicianOnly:"فقط داکتر مسئول حق مدیریت پلان را دارد.",
 historyNote:"تاریخچه نسخه‌ها و رضایت‌های ثبت‌شده حفظ می‌شود.",noHistory:"عملیاتی وجود ندارد.",
 noConsent:"برای نسخه فعلی رضایت ثبت نشده.",viewPatient:"نمای کلی مریض",edit:"تغییر / نسخه جدید",
 noStages:"مرحله‌ای ثبت نشده.",chooseEncounter:"معاینه امضاشده انتخاب کنید",performed:"مطابقت با ثبت عملیه واقعی",
 privacy:"معلومات خصوصی کلینیکی",saved:"ذخیره شد",noResults:"بدون جزئیات",planId:"پلان",refresh:"تازه‌سازی",
 patientFacing:"پلان هنوز برای اپلیکیشن مریض نشر نشده است.",plus:"افزودن",next:"بعدی",previous:"قبلی",
 archived:"تاریخچه",submitted:"ثبت‌شده",filter:"فیلتر",unsaved:"متن تا زمان ذخیره باقی می‌ماند.",
 finish:"مرحله آخر را تکمیل کنید؛ پرداخت خودکار نیست.",statusLabel:"وضعیت",
 warning:"تداوی براساس قضاوت داکتر انجام می‌شود، نه تشخیص خودکار.",
 consentHistory:"تاریخچه رضایت و لغو",reasonPlaceholder:"دلیل روشن بنویسید (حداقل ۱۰ حرف).",
 signatureNote:"ثبت رضایت حضوری توسط داکتر؛ امضای دیجیتال ایجاد نمی‌شود.",
 stageNotes:"مراحل مربوط به نسخه هستند و تغییرات تاریخچه را پاک نمی‌کنند."
 },
 "ps-AF":{
 treatments:"د درملنې پلانونه",tagline:"د ډاکټر وړاندیزونه، رضایت، پړاوونه او لګښت",
 plans:"پلانونه",newPlan:"د درملنې نوی پلان",create:"مسوده جوړول",draft:"مسوده",proposed:"وړاندیز شوی",
 active:"منل شوی / روان",accepted:"منل شوی",in_progress:"روان",completed:"بشپړ",
 discontinued:"درول شوی",all:"ټول",search:"پلان ولټوئ",empty:"داسې پلان نشته.",
 summary:"د پلان لنډیز",stages:"پړاوونه",estimate:"اټکل",consent:"رضایت",timeline:"تاریخ",
 versions:"نسخې",overview:"لنډیز",visits:"معاینې",chart:"د غاښونو چارټ",files:"فایلونه",
 title:"د درملنې نوم",indication:"کلینیکي دلیل",sessions:"تمه شوې ناستې",duration:"دقیقې",
 notes:"د ډاکټر یادښت",optional:"اختیاري",service:"خدمت",quantity:"شمېر",discount:"تخفیف (افغانۍ)",
 price:"د واحد بیه",lineTotal:"ټول",total:"اټکل شوی ټول لګښت",currency:"افغانۍ",
 addService:"خدمت زیات کړئ",remove:"لرې کړئ",addStage:"پړاو زیات کړئ",description:"د پړاو نوم / ترسره شوې پروسه",
 teeth:"د FDI غاښ نمبرې",stageVisits:"د پړاو ناستې",dueDate:"وړاندیز شوې نېټه",
 catalog:"د خدمت بیه د نسخې د ثبت پر مهال ساتل کېږي.",
 stageProof:"پړاو یوازې د لاسلیک شوې معاینې له ثبوت سره بشپړېږي.",
 patient:"ناروغ",clinic:"کلینیک",selectService:"خدمت غوره کړئ",choose:"غوره کړئ",save:"مسوده خوندي کړئ",
 revise:"نوې نسخه جوړ کړئ",revisionReason:"د بدلون دلیل",reconsent:"بدلون نوې وړاندیز او تازه رضایت غواړي؛ زوړ تاریخ ساتل کېږي.",
 status:"حالت",version:"نسخه",lastUpdated:"تازه شوی",noVisits:"لومړی د ناروغ کلینیکي معاینه ثبت کړئ.",
 back:"د درملنې پلانونه",cancel:"بندول",loading:"پلانونه بارېږي…",error:"عملیات ناکام شول؛ فورم پاتې دی.",
 retry:"بیا هڅه",ready:"په بریالیتوب خوندي شو",start:"پړاو پیل",complete:"پړاو بشپړ",skip:"پړاو پرېښودل",
 skipped:"پرېښودل شوی",pending:"پاتې",started:"روان",view:"پرانیستل",actions:"کړنې",
 signedVisit:"لاسلیک شوې معاینه او ترسره شوې پروسه",reason:"دلیل",explanation:"تشریح",
 stageEvidence:"د ترسره شوې درملنې ثبوت",noEvidence:"له ورته ثبت سره لاسلیک شوې معاینه غوره کړئ.",
 propose:"پلان وړاندې کړئ",consentTitle:"په شاهد حضوري رضایت ثبت کړئ",person:"د ناروغ / سرپرست نوم",
 role:"رضایت ورکوونکی",patientRole:"ناروغ",guardian:"سرپرست",relationship:"له ناروغ سره اړیکه",
 witness:"د شاهد نوم",scope:"د رضایت حدود او تشریحات",acknowledged:"د رضایت نېټه او وخت",
 confirmation:"د اوسني پلان حضوري رضایت له شاهد سره ثبتوم.",
 recordConsent:"رضایت او منل ثبت کړئ",consentRequired:"د پړاو له پیلېدو مخکې د اوسني نسخې رضایت اړین دی.",
 consentRecorded:"رضایت ثبت شوی",none:"نه دی ثبت",withdrawn:"بېرته اخیستل شوی",withdraw:"رضایت بېرته اخیستل",
 withdrawalReason:"د بېرته اخیستلو دلیل",discontinue:"پلان بندول",discontinueReason:"د بندولو دلیل",
 confirmationStop:"پلان بند شي؟ پخوانۍ کړنې خوندي پاتې کېږي.",
 confirmationConsent:"حضوري رضایت ثبت شي؟ دا برېښنايي لاسلیک نه دی.",
 completionWarning:"پلان بشپړول بیل یا ورکړه نه جوړوي.",priceWarning:"دا یوازې د افغانۍ اټکل دی، بیل یا تادیه نشته.",
 noChanges:"د منل شوي پلان بدلون نوې نسخه غواړي.",clinicianOnly:"یوازې ټاکلی ډاکټر دا پلان اداره کوي.",
 historyNote:"نسخې او رضایت په تاریخ کې پاتې کېږي.",noHistory:"تاریخ نشته.",
 noConsent:"په اوسنۍ نسخه کې رضایت نشته.",viewPatient:"د ناروغ لنډیز",edit:"سمون / نوې نسخه",
 noStages:"پړاو نه شته.",chooseEncounter:"لاسلیک شوې معاینه غوره کړئ",performed:"د ترسره شوې پروسې ثبوت",
 privacy:"شخصي کلینیکي معلومات",saved:"خوندي شو",noResults:"معلومات نشته",planId:"پلان",refresh:"تازه کول",
 patientFacing:"پلان لا د ناروغ په اپ کې نه دی خپور شوی.",plus:"زیاتول",next:"بل",previous:"مخکېنی",
 archived:"تاریخچه",submitted:"ثبت شوی",filter:"چاڼ",unsaved:"لیکل تر خوندي کولو پورې ساتل کېږي.",
 finish:"وروستی پړاو بشپړ کړئ؛ پيسې اتومات نه کېږي.",statusLabel:"د پلان حالت",
 warning:"درملنه د ډاکټر له ارزونې سره کېږي، نه اتومات تشخیص.",
 consentHistory:"د رضایت تاریخ",reasonPlaceholder:"روښانه دلیل ولیکئ (لږ تر لږه ۱۰ توري).",
 signatureNote:"دا حضوري رضایت ثبت دی، برېښنايي لاسلیک نه دی.",
 stageNotes:"پړاوونه د نسخې پورې تړلي دي او تاریخ نه پاکوي."
 }
};
function useWords(){
 const {locale,calendar}=usePreferences(),lang:Language=locale==="fa-AF"||locale==="ps-AF"||locale==="en"?locale:"en";
 const t=(key:string)=>translations[lang][key]||translations.en[key]||key;
 const date=(value:unknown)=>{if(!value)return "—";
  try{return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   year:"numeric",month:"short",day:"numeric"}).format(new Date(String(value)));}catch{return String(value);}};
 const money=(v:number)=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(v);
 return {t,date,money,lang};
}
async function req(path:string,method="GET",body?:unknown):Promise<any>{
 const r=await fetch(API+"/v1/treatments"+path,{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.code||"NETWORK_ERROR");
 return data;
}
function useLoad(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[tick,setTick]=useState(0);
 const refresh=()=>setTick(x=>x+1);
 useEffect(()=>{let active=true;setData(null);setError("");
  if(path)req(path).then(x=>{if(active)setData(x);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[path,tick]);
 return {data,error,refresh};
}
const base=(c:string,p:string)=>"/clinics/"+c+"/patients/"+p;
const root=(c:string,p:string)=>"/clinic/patients/"+p+"/treatments?clinic="+encodeURIComponent(c);
const detail=(c:string,p:string,id:string)=>"/clinic/patients/"+p+"/treatments/"+id+"?clinic="+encodeURIComponent(c);
function Notice({children,kind="info"}:{children:ReactNode;kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Loading(){const {t}=useWords();return <div className="card phase09-loading"><span className="phase05-spinner"/>{t("loading")}</div>;}
function ErrorBox({code,retry}:{code:string;retry?:()=>void}){
 const {t}=useWords();return <div className="card phase09-error" role="alert">
  <strong>{t("error")}</strong><p>{code}</p>
  {retry&&<button className="btn btn-secondary" onClick={retry}>{t("retry")}</button>}</div>;
}
function Status({name}:{name:string}){const {t}=useWords();return <span className={"phase09-status status-"+name}>{t(name)}</span>;}
function PatientTabs({space,pid}:{space:Space;pid:string}){
 const {t}=useWords(),qs="?clinic="+encodeURIComponent(space.clinicId),prefix="/clinic/patients/"+pid;
 return <nav className="phase09-patient-tabs" aria-label={t("patient")}>
  <a href={prefix+qs}>{t("overview")}</a>
  <a href={prefix+"/visits"+qs}>{t("visits")}</a>
  <a href={prefix+"/chart"+qs}>{t("chart")}</a>
  <a href={prefix+"/treatments"+qs} aria-current="page">{t("treatments")}</a>
  <a href={prefix+"/files"+qs}>{t("files")}</a>
 </nav>;
}
export function TreatmentPortal({view}:{view:"plans"|"detail"}){
 const {t}=useWords();
 const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [chosen,setChosen]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setChosen(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.code||"AUTH_REQUIRED");setCtx(x);})
   .catch(e=>setError(e.message));
 },[]);
 if(error)return <ErrorBox code={error} retry={()=>location.reload()}/>;
 if(!ctx||chosen===undefined)return <Loading/>;
 const space=chosen?ctx.clinics.find(c=>c.clinicId===chosen):ctx.clinics[0];
 if(!space||!(space.role==="dentist"||
  (["owner","manager"].includes(space.role)&&space.clinicianEnabled)))
  return <ErrorBox code={t("clinicianOnly")}/>;
 const path=location.pathname.split("/").filter(Boolean),idx=path.indexOf("patients"),
 pid=path[idx+1]||"",planId=view==="detail"?path[idx+3]||"":"";
 return <Shell ctx={ctx} space={space} active="patients"><div className="phase09-workspace">
  <header className="phase09-header"><div><span className="phase09-eyebrow">DANDANLINK / {space.clinicName} / {t("privacy")}</span>
   <h1>{t("treatments")}</h1><p>{t("tagline")}</p></div>
   <div className="phase09-header-actions">
    <a className="btn btn-secondary" href={root(space.clinicId,pid)}>{t("plans")}</a>
    <a className="btn btn-secondary" href={"/clinic/patients/"+pid+"?clinic="+encodeURIComponent(space.clinicId)}>{t("viewPatient")} ↗</a>
   </div>
  </header>
  <PatientTabs space={space} pid={pid}/>
  {view==="plans"?<Plans space={space} pid={pid}/>:<PlanDetail space={space} pid={pid} id={planId}/>}
  <footer className="phase09-footer">{t("warning")} · {t("completionWarning")}</footer>
 </div></Shell>;
}
function PlanEditor({space,pid,catalog,onCancel,original,onSaved}:{space:Space;pid:string;
 catalog:{services:Service[]};onCancel:()=>void;original?:Detail;onSaved:(id:string)=>void}){
 const {t,money}=useWords();
 const [form,setForm]=useState<Draft>(()=>{
  if(!original)return newDraft();
  return {title:original.plan.title,indication:original.plan.indication,
   expectedSessions:original.plan.expectedSessions,durationMinutes:String(original.plan.durationMinutes||""),
   notes:original.plan.notes||"",items:original.items.map(x=>({serviceId:x.serviceId,quantity:x.quantity,
    discountAfn:x.discountAfn})),stages:original.stages.map(s=>({description:s.description,
     toothCodes:s.toothCodes,expectedVisits:s.expectedVisits,dueDate:s.dueDate}))};
 });
 const [reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const update=(key:keyof Draft,value:any)=>setForm(f=>({...f,[key]:value}));
 const item=(i:number,key:string,value:any)=>update("items",form.items.map((x,j)=>j===i?{...x,[key]:value}:x));
 const stage=(i:number,key:string,value:any)=>update("stages",form.stages.map((x,j)=>j===i?{...x,[key]:value}:x));
 const total=useMemo(()=>form.items.reduce((sum,line)=>{
  const service=catalog.services.find(s=>s.id===line.serviceId);
  return sum+(service?.base_price_afn||0)*line.quantity-line.discountAfn;
 },0),[form.items,catalog]);
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError("");
  try{
   const body={...form,durationMinutes:form.durationMinutes?Number(form.durationMinutes):null,
    notes:form.notes||null,items:form.items.map(x=>({...x,quantity:Number(x.quantity),
     discountAfn:Number(x.discountAfn)})),stages:form.stages.map(x=>({...x,
     toothCodes:x.toothCodes.map(s=>s.trim()).filter(Boolean),
     expectedVisits:Number(x.expectedVisits)})),...(original?{reason,revision:original.plan.revision}:{})};
   const response=original?await req(base(space.clinicId,pid)+"/plans/"+original.plan.id+"/revise","PUT",body):
    await req(base(space.clinicId,pid)+"/plans","POST",body);
   onSaved(response.id||original!.plan.id);
  }catch(ex:any){setError(ex.message);}finally{setBusy(false);}
 }
 return <form className="phase09-editor" onSubmit={submit}>
  <div className="phase09-section-heading"><div><span className="phase09-kicker">{t(original?"edit":"newPlan")}</span>
   <h2>{t(original?"revise":"create")}</h2></div>
   <button className="btn btn-secondary" type="button" onClick={onCancel}>{t("cancel")}</button></div>
  {original&&<Notice kind="warning">{t("reconsent")}</Notice>}
  <div className="phase09-form-grid">
   <label className="phase09-field"><span>{t("title")} *</span>
    <input required minLength={3} maxLength={120} value={form.title} onChange={e=>update("title",e.target.value)}/></label>
   <label className="phase09-field"><span>{t("sessions")} *</span>
    <input type="number" required min={1} max={60} value={form.expectedSessions} onChange={e=>update("expectedSessions",Number(e.target.value))}/></label>
   <label className="phase09-field phase09-wide"><span>{t("indication")} *</span>
    <textarea required minLength={10} maxLength={5000} rows={3} value={form.indication}
     onChange={e=>update("indication",e.target.value)}/></label>
   <label className="phase09-field"><span>{t("duration")}</span>
    <input type="number" min={5} max={100000} value={form.durationMinutes}
     onChange={e=>update("durationMinutes",e.target.value)}/></label>
   <label className="phase09-field phase09-wide"><span>{t("notes")}</span>
    <textarea value={form.notes} maxLength={2000} rows={2} onChange={e=>update("notes",e.target.value)}/></label>
  </div>
  <section className="phase09-composer-section">
   <div className="phase09-section-heading"><div><h3>{t("stages")}</h3><p>{t("stageNotes")}</p></div>
    <button type="button" className="btn btn-secondary" disabled={form.stages.length>=30}
     onClick={()=>update("stages",[...form.stages,{description:"",toothCodes:[],expectedVisits:1,dueDate:null}])}>
     + {t("addStage")}</button></div>
   <div className="phase09-rows">{form.stages.map((s,i)=><div key={i} className="phase09-stage-editor">
    <div className="phase09-between"><strong>#{i+1}</strong>
     {form.stages.length>1&&<button type="button" className="phase09-text-button"
      onClick={()=>update("stages",form.stages.filter((_,n)=>n!==i))}>{t("remove")}</button>}</div>
    <label className="phase09-field"><span>{t("description")} *</span>
     <input required minLength={3} maxLength={500} value={s.description}
      onChange={e=>stage(i,"description",e.target.value)}/></label>
    <div className="phase09-form-grid">
     <label className="phase09-field"><span>{t("teeth")}</span>
      <input placeholder="11, 12" value={s.toothCodes.join(", ")}
       onChange={e=>stage(i,"toothCodes",e.target.value.split(",").map(x=>x.trim()))}/></label>
     <label className="phase09-field"><span>{t("stageVisits")}</span>
      <input type="number" required min={1} max={20} value={s.expectedVisits}
       onChange={e=>stage(i,"expectedVisits",Number(e.target.value))}/></label>
     <label className="phase09-field"><span>{t("dueDate")}</span>
      <input type="date" value={s.dueDate||""} onChange={e=>stage(i,"dueDate",e.target.value||null)}/></label>
    </div>
   </div>)}</div>
  </section>
  <section className="phase09-composer-section">
   <div className="phase09-section-heading"><div><h3>{t("estimate")}</h3><p>{t("catalog")}</p></div>
    <button type="button" className="btn btn-secondary" disabled={form.items.length>=20}
     onClick={()=>update("items",[...form.items,{serviceId:"",quantity:1,discountAfn:0}])}>
     + {t("addService")}</button></div>
   <div className="phase09-rows">{form.items.map((x,i)=>{
    const svc=catalog.services.find(s=>s.id===x.serviceId);
    return <div key={i} className="phase09-estimate-editor">
     <label className="phase09-field"><span>{t("service")} *</span>
      <select required value={x.serviceId} onChange={e=>item(i,"serviceId",e.target.value)}>
       <option value="">{t("selectService")}</option>
       {catalog.services.map(s=><option key={s.id} value={s.id}>{s.name} · {money(s.base_price_afn)} AFN</option>)}
      </select></label>
     <label className="phase09-field"><span>{t("quantity")}</span>
      <input type="number" required min={1} max={20} value={x.quantity}
       onChange={e=>item(i,"quantity",Number(e.target.value))}/></label>
     <label className="phase09-field"><span>{t("discount")}</span>
      <input type="number" min={0} max={10000000} disabled={!["owner","manager"].includes(space.role)}
       value={x.discountAfn} onChange={e=>item(i,"discountAfn",Number(e.target.value))}/></label>
     <div className="phase09-line-amount">{t("lineTotal")}: <strong>{money((svc?.base_price_afn||0)*x.quantity-x.discountAfn)} AFN</strong></div>
     {form.items.length>1&&<button type="button" className="phase09-text-button"
      onClick={()=>update("items",form.items.filter((_,j)=>j!==i))}>{t("remove")}</button>}
    </div>;
   })}</div>
   <div className="phase09-estimate-total"><span>{t("total")}</span>
    <strong>{money(Math.max(0,total))} AFN</strong></div>
  </section>
  {original&&<label className="phase09-field"><span>{t("revisionReason")} *</span>
   <textarea required minLength={10} maxLength={500} rows={2} value={reason}
    placeholder={t("reasonPlaceholder")} onChange={e=>setReason(e.target.value)}/></label>}
  {error&&<ErrorBox code={error}/>}
  <div className="phase09-form-actions"><button type="submit" className="btn btn-primary"
   disabled={busy||!catalog.services.length}>{busy?t("loading"):t(original?"revise":"create")} →</button>
   <span>{t("unsaved")}</span></div>
 </form>;
}
function Plans({space,pid}:{space:Space;pid:string}){
 const {t,date,money}=useWords();
 const [tab,setTab]=useState("draft"),[search,setSearch]=useState(""),[query,setQuery]=useState(""),[page,setPage]=useState(1);
 const [editing,setEditing]=useState(false),[error,setError]=useState("");
 const qs=new URLSearchParams({status:tab,search:query,page:String(page)});
 const {data,error:loadError,refresh}=useLoad(base(space.clinicId,pid)+"/plans?"+qs);
 const catalog=useLoad(editing?base(space.clinicId,pid)+"/catalog":null);
 const tabs=["draft","proposed","active","completed","discontinued","all"];
 return <div className="phase09-stack">
  <section className="card phase09-toolbar">
   <div className="phase09-filters">{tabs.map(x=><button type="button" key={x} aria-pressed={tab===x}
    onClick={()=>{setTab(x);setPage(1);}}>{t(x)}</button>)}</div>
   <div className="phase09-toolbar-actions">
    <form onSubmit={e=>{e.preventDefault();setQuery(search);setPage(1);}}>
     <input aria-label={t("search")} value={search} placeholder={t("search")} maxLength={100}
      onChange={e=>setSearch(e.target.value)}/>
     <button type="submit" className="btn btn-secondary">{t("search")}</button></form>
    <button type="button" className="btn btn-primary" onClick={()=>setEditing(true)}>+ {t("newPlan")}</button>
   </div>
  </section>
  {editing?<section className="card phase09-panel">
   {catalog.error?<ErrorBox code={catalog.error} retry={catalog.refresh}/>:
    !catalog.data?<Loading/>:<PlanEditor space={space} pid={pid} catalog={catalog.data}
     onCancel={()=>setEditing(false)} onSaved={id=>location.assign(detail(space.clinicId,pid,id))}/>}
  </section>:<>
   {loadError?<ErrorBox code={loadError} retry={refresh}/>:!data?<Loading/>:
    <section className="card phase09-panel">
     <div className="phase09-section-heading"><div><span className="phase09-kicker">{t("plans")}</span>
      <h2>{t(tab)}</h2></div><button className="btn btn-secondary" onClick={refresh}>{t("refresh")} ↻</button></div>
     {!data.plans.length?<div className="phase09-empty">{t("empty")}</div>:
      <div className="phase09-plan-list">{data.plans.map((p:any)=><a key={p.id}
       className="phase09-plan-row" href={detail(space.clinicId,pid,p.id)}>
       <div className="phase09-plan-icon">✚</div><div className="phase09-plan-main"><h3>{p.title}</h3>
        <p>{p.clinician_name} · {t("version")} {p.version} · {t("lastUpdated")} {date(p.updated_at)}</p>
        <div className="phase09-plan-tags"><Status name={p.status}/><span>{p.stage_count} {t("stages")}</span>
         <span>{p.expected_sessions} {t("sessions")}</span></div>
       </div><div className="phase09-plan-price"><strong>{money(p.estimate_total_afn)} AFN</strong>
        <span>{t("estimate")}</span></div><span className="phase09-row-arrow">→</span>
       </a>)}</div>}
     <div className="phase09-pagination"><button className="btn btn-secondary" type="button"
      disabled={page<=1} onClick={()=>setPage(x=>x-1)}>{t("previous")}</button>
      <strong>{page}</strong><button className="btn btn-secondary" disabled={!data.hasMore}
      onClick={()=>setPage(x=>x+1)}>{t("next")}</button></div>
    </section>}
   <Notice kind="warning">{t("patientFacing")} {t("completionWarning")}</Notice>
  </>}
 </div>;
}
function PlanDetail({space,pid,id}:{space:Space;pid:string;id:string}){
 const {t,date,money}=useWords();
 const [tab,setTab]=useState("summary"),[revising,setRevising]=useState(false),
 [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const {data,error:loadError,refresh}=useLoad(base(space.clinicId,pid)+"/plans/"+id);
 const catalog=useLoad(revising?base(space.clinicId,pid)+"/catalog":null);
 const visits=useLoad(tab==="stages"?base(space.clinicId,pid)+"/catalog":null);
 const [consentForm,setConsentForm]=useState({patientRole:"patient",personName:"",relationship:"",
  witnessName:"",scopeDescription:"",acknowledgedAt:new Date().toISOString().slice(0,16),confirmed:false});
 const [reason,setReason]=useState("");
 const [stageAction,setStageAction]=useState<{stageId:string;action:"complete"|"skip"}|null>(null);
 const [encounterId,setEncounterId]=useState("");
 async function invoke(path:string,body:unknown,method="POST",confirmPrompt?:string){
  if(confirmPrompt&&!confirm(confirmPrompt))return;
  setBusy(true);setError("");setSuccess("");
  try{await req(base(space.clinicId,pid)+"/plans/"+id+path,method,body);
   setReason("");setStageAction(null);refresh();setSuccess(t("ready"));}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 if(loadError)return <ErrorBox code={loadError} retry={refresh}/>;
 if(!data)return <Loading/>;
 const info=data as Detail,p=info.plan,canAdvance=["accepted","in_progress"].includes(p.status)&&p.consentState==="recorded";
 const tabs=["summary","stages","estimate","consent","timeline"];
 return <div className="phase09-stack">
  <section className="card phase09-panel">
   <a href={root(space.clinicId,pid)} className="phase09-back">← {t("back")}</a>
   <div className="phase09-detail-header"><div><span className="phase09-kicker">{t("version")} {p.version} ·
    {t("planId")} <bdi dir="ltr">{p.id.slice(0,8)}</bdi></span><h2>{p.title}</h2>
    <p>{t("lastUpdated")} {date(p.updatedAt)}</p></div>
    <div className="phase09-detail-cta"><Status name={p.status}/>
     {!["completed","discontinued"].includes(p.status)&&
      <button type="button" className="btn btn-secondary" onClick={()=>setRevising(x=>!x)}>
       {t("edit")}</button>}</div></div>
   <div className="phase09-progress-strip">
    <div><span>{t("status")}</span><strong>{t(p.status)}</strong></div>
    <div><span>{t("consent")}</span><strong>{t(p.consentState)}</strong></div>
    <div><span>{t("stages")}</span><strong>{info.stages.filter(x=>x.status==="completed").length}/{info.stages.length}</strong></div>
    <div><span>{t("estimate")}</span><strong>{money(p.estimateTotalAfn)} AFN</strong></div></div>
  </section>
  {revising?<section className="card phase09-panel">
    {catalog.error?<ErrorBox code={catalog.error} retry={catalog.refresh}/>:
     !catalog.data?<Loading/>:<PlanEditor space={space} pid={pid} catalog={catalog.data} original={info}
      onCancel={()=>setRevising(false)} onSaved={()=>{setRevising(false);refresh();setTab("summary");}}/>}
   </section>:<>
   <nav className="phase09-detail-tabs" role="tablist" aria-label={t("treatments")}>
    {tabs.map(x=><button type="button" role="tab" key={x} aria-selected={tab===x}
     onClick={()=>{setTab(x);setError("");}}>{t(x)}</button>)}</nav>
   {tab==="summary"&&<section className="card phase09-panel phase09-detail-grid">
    <div><span className="phase09-kicker">{t("summary")}</span><h3>{t("indication")}</h3>
     <p className="phase09-long-text">{p.indication}</p><h3>{t("notes")}</h3>
     <p className="phase09-long-text">{p.notes||"—"}</p></div>
    <aside className="phase09-summary-aside">
     <div><span>{t("sessions")}</span><strong>{p.expectedSessions}</strong></div>
     <div><span>{t("duration")}</span><strong>{p.durationMinutes||"—"}</strong></div>
     <div><span>{t("version")}</span><strong>{p.version}</strong></div>
     <div><span>{t("total")}</span><strong>{money(p.estimateTotalAfn)} AFN</strong></div>
    </aside>
    {p.status==="draft"&&<div className="phase09-section-actions">
     <button type="button" className="btn btn-primary" disabled={busy}
      onClick={()=>invoke("/propose",{revision:p.revision})}>{t("propose")} →</button></div>}
   </section>}
   {tab==="stages"&&<section className="card phase09-panel">
    <div className="phase09-section-heading"><div><h2>{t("stages")}</h2><p>{t("stageProof")}</p></div>
     <span className="phase09-count">{info.stages.length}</span></div>
    {!canAdvance&&<Notice kind="warning">{t("consentRequired")}</Notice>}
    <div className="phase09-stage-list">{info.stages.map(s=><article className="phase09-stage-card" key={s.id}>
     <div className="phase09-stage-count">{s.position}</div>
     <div className="phase09-stage-info"><div className="phase09-between">
      <h3>{s.description}</h3><Status name={s.status||"pending"}/></div>
      <p>{t("stageVisits")}: {s.expectedVisits} · {t("teeth")}: {s.toothCodes.join(", ")||"—"} ·
       {t("dueDate")}: {date(s.dueDate)}</p>
      {s.linkedEncounterId&&<p>{t("signedVisit")}: <bdi dir="ltr">{s.linkedEncounterId.slice(0,8)}</bdi></p>}
      {s.completionNote&&<p>{s.completionNote}</p>}
      {canAdvance&&s.status==="pending"&&<div className="phase09-stage-actions">
       <button className="btn btn-primary" type="button" disabled={busy}
        onClick={()=>invoke("/stages/"+s.id+"/action",{revision:p.revision,action:"start"})}>{t("start")}</button>
       <button className="btn btn-secondary" type="button" onClick={()=>setStageAction({stageId:s.id!,action:"skip"})}>{t("skip")}</button>
      </div>}
      {canAdvance&&s.status==="in_progress"&&<div className="phase09-stage-actions">
       <button className="btn btn-primary" type="button" onClick={()=>{setStageAction({stageId:s.id!,action:"complete"});setEncounterId("");}}>{t("complete")}</button>
       <button className="btn btn-secondary" type="button" onClick={()=>setStageAction({stageId:s.id!,action:"skip"})}>{t("skip")}</button>
      </div>}
      {stageAction&&stageAction.stageId===s.id&&<div className="phase09-inline-form">
       {stageAction.action==="complete"?<>
        <Notice kind="warning">{t("stageProof")}</Notice>
        {visits.error?<ErrorBox code={visits.error} retry={visits.refresh}/>:
         <label className="phase09-field"><span>{t("chooseEncounter")}</span>
          <select value={encounterId} onChange={e=>setEncounterId(e.target.value)}>
           <option value="">{t("choose")}</option>
           {(visits.data?.encounters||[]).filter((v:Encounter)=>v.status==="signed").map((v:Encounter)=>
            <option key={v.id} value={v.id}>{date(v.created_at)} · {v.reason.slice(0,50)}</option>)}</select>
         </label>}
        <button className="btn btn-primary" type="button" disabled={!encounterId||busy}
         onClick={()=>invoke("/stages/"+s.id+"/action",{revision:p.revision,action:"complete",encounterId})}>
         {t("complete")}</button>
       </>:<><label className="phase09-field"><span>{t("reason")} *</span>
         <textarea minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}/></label>
         <button className="btn btn-primary" type="button" disabled={reason.trim().length<10||busy}
          onClick={()=>invoke("/stages/"+s.id+"/action",{revision:p.revision,action:"skip",reason})}>{t("skip")}</button></>}
       <button className="btn btn-secondary" type="button" onClick={()=>setStageAction(null)}>{t("cancel")}</button>
      </div>}
     </div>
    </article>)}</div>
    <Notice>{t("completionWarning")} {t("finish")}</Notice>
   </section>}
   {tab==="estimate"&&<section className="card phase09-panel">
    <div className="phase09-section-heading"><div><h2>{t("estimate")}</h2><p>{t("catalog")}</p></div>
     <span className="phase09-kicker">{t("currency")} · {t("version")} {p.version}</span></div>
    <div className="phase09-table-scroll"><table className="phase09-table"><thead><tr>
     <th>{t("service")}</th><th>{t("quantity")}</th><th>{t("price")}</th>
     <th>{t("discount")}</th><th>{t("lineTotal")}</th></tr></thead><tbody>
     {info.items.map((x,i)=><tr key={i}><td>{x.name}</td><td>{x.quantity}</td>
      <td>{money(x.unitPriceAfn||0)}</td><td>{money(x.discountAfn)}</td>
      <td><strong>{money(x.totalAfn||0)} AFN</strong></td></tr>)}</tbody></table></div>
    <div className="phase09-estimate-total"><span>{t("total")}</span>
     <strong>{money(p.estimateTotalAfn)} AFN</strong></div>
    <Notice kind="warning">{t("priceWarning")} {t("completionWarning")}</Notice>
   </section>}
   {tab==="consent"&&<section className="card phase09-panel phase09-consent">
    <div className="phase09-section-heading"><div><h2>{t("consent")}</h2><p>{t("signatureNote")}</p></div>
     <Status name={p.consentState}/></div>
    {!info.consents.length?<Notice kind="warning">{t("noConsent")}</Notice>:null}
    {p.status==="proposed"&&<form className="phase09-form-grid"
     onSubmit={e=>{e.preventDefault();if(!consentForm.confirmed||busy)return;
      invoke("/consent",{revision:p.revision,confirmation:"IN_PERSON_RECORDED",
       patientRole:consentForm.patientRole,personName:consentForm.personName,
       relationship:consentForm.relationship||null,witnessName:consentForm.witnessName,
       scopeDescription:consentForm.scopeDescription,
       acknowledgedAt:new Date(consentForm.acknowledgedAt).toISOString()}, "POST",t("confirmationConsent"));}}>
     <div className="phase09-wide"><Notice kind="warning">{t("consentRequired")}</Notice></div>
     <label className="phase09-field"><span>{t("role")}</span>
      <select value={consentForm.patientRole} onChange={e=>setConsentForm({...consentForm,patientRole:e.target.value})}>
       <option value="patient">{t("patientRole")}</option><option value="guardian">{t("guardian")}</option></select></label>
     <label className="phase09-field"><span>{t("person")} *</span>
      <input required minLength={2} maxLength={120} value={consentForm.personName}
       onChange={e=>setConsentForm({...consentForm,personName:e.target.value})}/></label>
     {consentForm.patientRole==="guardian"&&<label className="phase09-field"><span>{t("relationship")} *</span>
      <input required minLength={2} maxLength={120} value={consentForm.relationship}
       onChange={e=>setConsentForm({...consentForm,relationship:e.target.value})}/></label>}
     <label className="phase09-field"><span>{t("witness")} *</span>
      <input required minLength={2} maxLength={120} value={consentForm.witnessName}
       onChange={e=>setConsentForm({...consentForm,witnessName:e.target.value})}/></label>
     <label className="phase09-field phase09-wide"><span>{t("scope")} *</span>
      <textarea required minLength={10} maxLength={2000} value={consentForm.scopeDescription} rows={3}
       onChange={e=>setConsentForm({...consentForm,scopeDescription:e.target.value})}/></label>
     <label className="phase09-field"><span>{t("acknowledged")}</span>
      <input type="datetime-local" required value={consentForm.acknowledgedAt}
       onChange={e=>setConsentForm({...consentForm,acknowledgedAt:e.target.value})}/></label>
     <label className="phase09-check phase09-wide">
      <input type="checkbox" required checked={consentForm.confirmed}
       onChange={e=>setConsentForm({...consentForm,confirmed:e.target.checked})}/>
      <span>{t("confirmation")}</span></label>
     <div className="phase09-wide"><button className="btn btn-primary" type="submit" disabled={busy||!consentForm.confirmed}>
      {t("recordConsent")}</button></div>
    </form>}
    {["accepted","in_progress"].includes(p.status)&&p.consentState==="recorded"&&<div className="phase09-inline-form">
     <h3>{t("withdraw")}</h3>
     <label className="phase09-field"><span>{t("withdrawalReason")}</span>
      <textarea minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}
       placeholder={t("reasonPlaceholder")}/></label>
     <button type="button" className="btn btn-secondary" disabled={busy||reason.trim().length<10}
      onClick={()=>invoke("/withdraw-consent",{revision:p.revision,reason})}>{t("withdraw")}</button>
    </div>}
    <h3>{t("consentHistory")}</h3>
    <div className="phase09-event-list">{info.consents.map((c:any)=><div key={c.id} className="phase09-event">
     <Status name={c.action==="recorded"?"accepted":"withdrawn"}/>
     <div><strong>{c.person_name} · {c.patient_role}</strong><p>{t("version")} {c.version} · {date(c.created_at)}
      · {c.witness_name}</p><p>{c.scope_description}</p>{c.reason&&<p>{c.reason}</p>}</div>
    </div>)}</div>
   </section>}
   {tab==="timeline"&&<section className="card phase09-panel">
    <div className="phase09-section-heading"><div><h2>{t("timeline")}</h2>
     <p>{t("historyNote")}</p></div><span className="phase09-count">{info.events.length}</span></div>
    {!info.events.length?<p className="phase09-empty">{t("noHistory")}</p>:
     <div className="phase09-event-list">{info.events.map((e:any)=><div className="phase09-event" key={e.id}>
      <span className="phase09-event-dot" aria-hidden="true"/>
      <div><strong>{e.action.replaceAll("_"," ")} · {t("version")} {e.version}</strong>
       <p>{date(e.created_at)} · {e.actor_name}</p>{e.reason&&<p>{e.reason}</p>}</div>
     </div>)}</div>}
    <h3>{t("versions")}</h3>
    <div className="phase09-version-list">{info.versions.map((v:any)=><div key={v.version}>
     <strong>{t("version")} {v.version} — {v.title}</strong>
     <span>{money(v.estimate_total_afn)} AFN · {date(v.created_at)}</span>
     {v.revision_reason&&<p>{v.revision_reason}</p>}</div>)}</div>
   </section>}
   {error&&<ErrorBox code={error}/>}
   {success&&<Notice kind="success">{success}</Notice>}
   {!["completed","discontinued"].includes(p.status)&&<section className="card phase09-panel phase09-danger-panel">
    <div><h3>{t("discontinue")}</h3><p>{t("confirmationStop")}</p></div>
    <label className="phase09-field"><span>{t("discontinueReason")}</span>
     <textarea rows={2} minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}
      placeholder={t("reasonPlaceholder")}/></label>
    <button type="button" className="btn btn-secondary" disabled={busy||reason.trim().length<10}
     onClick={()=>invoke("/discontinue",{revision:p.revision,reason},"POST",t("confirmationStop"))}>
     {t("discontinue")}</button>
   </section>}
  </>}
 </div>;
}
