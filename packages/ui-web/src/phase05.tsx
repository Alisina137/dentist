"use client";
import React,{useEffect,useState,useCallback,useMemo,type FormEvent,type ReactNode} from "react";
import { InlineAlert, usePreferences } from "./index";
import { Shell } from "./phase03";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;role:Role;
  capabilities:string[];clinicianEnabled:boolean};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Page="directory"|"new"|"import"|"overview"|"edit";
type Patient={id:string;clinicId?:string;patientNumber:string;preferredName:string;familyName:string|null;
  phone:string|null;phoneVerified:boolean;alternateContact?:string|null;dateOfBirth?:string|null;
  ageEstimate?:number|null;dobIsEstimated?:boolean;province?:string|null;city?:string|null;
  address?:string|null;emergencyContact?:string|null;status:string;revision:number;
  noticeAcknowledged?:boolean;intakeSource?:string;updatedAt:string;createdAt:string};
const text:Record<string,Record<string,string>>={
 en:{
  patients:"Patients",directory:"Directory",import:"Import",newPatient:"Add patient",identity:"Identification",
  contact:"Contact",intake:"Medical intake",consent:"Consent",overview:"Overview",edit:"Edit demographics",
  preferredName:"Preferred name",familyName:"Family name",phone:"Phone (optional)",altContact:"Alternate contact",
  dob:"Date of birth (Gregorian)",ageEstimate:"Estimated age (if DOB unknown)",
  ageWarning:"Choose a birth date OR an estimated age, never both. Estimates do not create a precise birth date.",
  province:"Province",city:"City",address:"Address",emergency:"Emergency contact",
  patientNumber:"Clinic patient ID",status:"Status",active:"Active",inactive:"Inactive",archived:"Archived",
  search:"Search name, phone, or patient ID",all:"All",sort:"Sort",activity:"Recently updated",
  name:"Name",total:"Total",countActive:"Active records",countInactive:"Inactive records",
  countArchived:"Archived records",lastChange:"Record updated",source:"Record source",
  notice:"I confirm that the clinic provided the applicable privacy notice to this patient.",
  noticeImport:"I confirm these records were lawfully obtained and the clinic is authorized to import them.",
  noticeImportImportant:"Imported records are NOT marked as individually notified. Confirm each patient's notice later.",
  create:"Save patient",save:"Save changes",cancel:"Cancel",back:"Back",next:"Next",previous:"Previous",
  pageSize:"Rows per page",view:"View",openExisting:"Open existing",createAnyway:"Create anyway",
  duplicateTitle:"Possible duplicate patient",duplicateHelp:"Review matches from this clinic before creating another patient.",
  duplicateReason:"Reason for creating an apparent duplicate (at least 10 characters)",
  duplicateInfo:"Matches are suggestions only and never merged automatically.",
  noPatients:"No clinic patients found.",addFirst:"Create the first patient",
  noFilter:"No patients match the current filters.",clear:"Clear filters",
  loading:"Loading…",failed:"Request could not be completed",retry:"Retry",
  required:"Required fields",success:"Patient saved",safeguard:"Private clinic record. Not a public patient account.",
  clinicalPrivacy:"Medical details are visible only to authorized clinical staff.",
  clinicalUnavailable:"Clinical intake can be completed only by an authorized dentist or clinical owner/manager.",
  allergies:"Allergies",medications:"Medications",conditions:"Medical conditions",
  unknown:"Unknown",none_reported:"None reported",reported:"Reported",
  details:"Details / known issues",sourceKind:"Source of clinical information",sourceDate:"Source date (Gregorian)",
  patient_reported:"Patient reported",clinician_observed:"Clinician observed",transcribed:"Transcribed from authorized document",
  saveIntake:"Save clinical intake",intakeUnknown:"No qualified clinical intake has been recorded yet.",
  noAppointments:"Appointments and visits will be available in their scheduled development phases.",
  noFinancial:"No invoices or balances are available in Phase 5.",
  patientHeader:"Patient overview",recordStatus:"Record status",setStatus:"Update status",
  reason:"Reason (at least 10 characters)",confirm:"Confirm action",showArchived:"Including archived",
  team:"Clinic",goHome:"Clinic dashboard",changeClinic:"Switch clinic",chooseClinic:"Choose clinic",
  notAllowed:"Your current clinic role is not permitted to use this feature.",
  noClinic:"No active clinic membership.",stale:"Another user changed this record. Refresh before editing.",
  importTitle:"Import clinic patients",template:"Download CSV template",stepUpload:"Upload",
  stepMap:"Map columns",stepPreview:"Preview",stepResolve:"Resolve duplicates",stepCommit:"Commit",
  uploadCsv:"Choose UTF-8 CSV (1 MB max, 500 patients max)",mapping:"Match CSV columns to patient fields",
  mapNoColumn:"Not mapped",upload:"Choose file",preview:"Preview patients",
  rows:"Rows",ready:"Ready",duplicate:"Duplicate",invalid:"Invalid",
  new:"Create new",skip:"Skip",merge:"Merge missing fields",decision:"Action",
  existing:"Existing patient",confirmImport:"Import approved CSV",importSuccess:"Import finished",
  importTransfer:"I am authorized to transfer these patient demographics into this clinic.",
  importConfirm:"I reviewed duplicates and invalid rows and approve the selected actions.",
  rowErrors:"Download error report",created:"Created",skipped:"Skipped",needsReview:"Needs review",
  failedRows:"Failed",finished:"Import results",resultCode:"Result",fileError:"Choose a valid UTF-8 CSV.",
  selectPatient:"Select matching clinic patient",chooseAction:"Select an action for duplicate rows",
  reasonImport:"Reason for merge/create anyway",importHelp:"Import demographic data only. No chart, treatment, medical history or billing data.",
  importedStatus:"Imported record — individual privacy notice not yet acknowledged.",
  clinicalRecorded:"Clinical entry recorded by qualified staff.",age:"Estimated age",
  dateFormat:"Use YYYY-MM-DD in Gregorian format for DOB and clinical source date.",
  errorAccount:"Sign in to view clinic patients",disabled:"This action is not available for your role.",
  reportSummary:"Batch results by row. No medical or contact details are included in error report.",
  statusReason:"Reason for changing patient status",lastUpdated:"Last updated",
  noPublic:"Do not enter real patient data until clinic privacy, security and retention policies are approved.",
  idLabel:"Internal clinic identifier",notVerified:"Unverified",staffOnly:"Authorized clinic staff only"
 },
 "fa-AF":{
  patients:"مریضان",directory:"فهرست",import:"وارد کردن",newPatient:"افزودن مریض",
  identity:"معلومات هویت",contact:"تماس",intake:"معلومات صحی",consent:"رضایت و اطلاع",
  overview:"نمای کلی",edit:"ویرایش مشخصات",preferredName:"نام مورد استفاده",
  familyName:"تخلص",phone:"شماره تماس (اختیاری)",altContact:"تماس دوم",
  dob:"تاریخ تولد (میلادی)",ageEstimate:"سن تخمینی (اگر تاریخ تولد معلوم نیست)",
  ageWarning:"یا تاریخ تولد را وارد کنید یا سن تخمینی؛ سن تخمینی تاریخ تولد دقیق ایجاد نمی‌کند.",
  province:"ولایت",city:"شهر",address:"آدرس",emergency:"تماس اضطراری",
  patientNumber:"شماره مریض کلینیک",status:"وضعیت",active:"فعال",inactive:"غیرفعال",archived:"بایگانی",
  search:"جستجو بر اساس نام، شماره یا آی‌دی",all:"همه",sort:"مرتب‌سازی",
  activity:"آخرین تغییر",name:"نام",total:"مجموع",countActive:"مریضان فعال",
  countInactive:"غیرفعال",countArchived:"بایگانی",lastChange:"آخرین تغییر",
  source:"منبع ثبت",notice:"تأیید می‌کنم اطلاعیه حریم خصوصی کلینیک به مریض ارائه شده است.",
  noticeImport:"تأیید می‌کنم این معلومات قانونی دریافت شده و کلینیک حق وارد کردن آن را دارد.",
  noticeImportImportant:"مریضان واردشده به‌صورت خودکار اطلاع‌یافته علامت نمی‌شوند.",
  create:"ذخیره مریض",save:"ذخیره تغییرات",cancel:"انصراف",back:"بازگشت",next:"بعدی",
  previous:"قبلی",pageSize:"تعداد در صفحه",view:"مشاهده",openExisting:"بازکردن مریض قبلی",
  createAnyway:"با وجود مشابهت ثبت شود",duplicateTitle:"مریض مشابه پیدا شد",
  duplicateHelp:"قبل از ثبت مریض دیگر، موارد مشابه همین کلینیک را بررسی کنید.",
  duplicateReason:"دلیل ثبت مریض مشابه (حداقل ۱۰ حرف)",duplicateInfo:"موارد مشابه پیشنهاد هستند؛ ادغام خودکار نمی‌شوند.",
  noPatients:"مریضی ثبت نشده است.",addFirst:"اولین مریض را ثبت کنید",
  noFilter:"مریضی با این فیلتر یافت نشد.",clear:"پاک کردن فیلتر",
  loading:"در حال بارگیری…",failed:"عملیات ناموفق بود",retry:"تلاش دوباره",required:"فیلدهای ضروری",
  success:"مریض ذخیره شد",safeguard:"سند خصوصی کلینیک؛ حساب عمومی مریض نیست.",
  clinicalPrivacy:"معلومات صحی فقط برای کارمندان طبی مجاز قابل دیدن است.",
  clinicalUnavailable:"ثبت تاریخچه صحی تنها برای داکتر یا مدیر دارای صلاحیت طبی است.",
  allergies:"حساسیت‌ها",medications:"ادویه",conditions:"بیماری‌ها",
  unknown:"نامعلوم",none_reported:"گزارش نشده",reported:"گزارش شده",
  details:"جزئیات",sourceKind:"منبع معلومات صحی",sourceDate:"تاریخ منبع (میلادی)",
  patient_reported:"گزارش مریض",clinician_observed:"مشاهده داکتر",
  transcribed:"نقل از سند معتبر",saveIntake:"ذخیره معلومات صحی",
  intakeUnknown:"هنوز معلومات طبی توسط شخص مجاز ثبت نشده است.",
  noAppointments:"وقت‌ها و ملاقات‌ها در مراحل بعدی فعال می‌شوند.",
  noFinancial:"حسابداری و بل‌ها در مرحله پنجم فعال نیستند.",
  patientHeader:"نمای کلی مریض",recordStatus:"وضعیت سند",setStatus:"تغییر وضعیت",
  reason:"دلیل (حداقل ۱۰ حرف)",confirm:"تأیید عملیات",showArchived:"شامل بایگانی",
  team:"کلینیک",goHome:"داشبورد کلینیک",changeClinic:"تغییر کلینیک",chooseClinic:"انتخاب کلینیک",
  notAllowed:"نقش شما اجازه دسترسی ندارد.",noClinic:"عضویت فعال کلینیک ندارید.",
  stale:"شخص دیگری سند را تغییر داده؛ دوباره بارگیری کنید.",
  importTitle:"وارد کردن مریضان",template:"دریافت نمونه CSV",stepUpload:"آپلود",
  stepMap:"تطبیق ستون‌ها",stepPreview:"پیش‌نمایش",stepResolve:"حل موارد مشابه",
  stepCommit:"ثبت نهایی",uploadCsv:"فایل UTF-8 CSV (حداکثر ۱ MB و ۵۰۰ مریض)",
  mapping:"تطبیق ستون‌های CSV",mapNoColumn:"بدون ستون",upload:"انتخاب فایل",
  preview:"بررسی مریضان",rows:"ردیف",ready:"آماده",duplicate:"مشابه",invalid:"نامعتبر",
  new:"ثبت جدید",skip:"رد کردن",merge:"تکمیل موارد خالی",decision:"تصمیم",
  existing:"مریض موجود",confirmImport:"ثبت CSV تأییدشده",importSuccess:"وارد کردن تکمیل شد",
  importTransfer:"اجازه قانونی برای انتقال این معلومات به کلینیک دارم.",
  importConfirm:"موارد مشابه و نامعتبر را بررسی کرده و اقدامات انتخابی را تأیید می‌کنم.",
  rowErrors:"دریافت گزارش خطاها",created:"ایجادشده",skipped:"ردشده",needsReview:"نیازمند بررسی",
  failedRows:"ناموفق",finished:"نتیجه واردکردن",resultCode:"نتیجه",fileError:"فایل معتبر UTF-8 CSV انتخاب کنید.",
  selectPatient:"مریض مشابه انتخاب کنید",chooseAction:"برای هر مریض مشابه تصمیم بگیرید",
  reasonImport:"دلیل ادغام یا ثبت مشابه",importHelp:"فقط مشخصات مریضان؛ بدون تاریخچه طبی، تداوی و بل.",
  importedStatus:"مریض واردشده؛ اطلاعیه فردی هنوز تأیید نشده است.",
  clinicalRecorded:"معلومات طبی توسط کارمند واجد صلاحیت ثبت شد.",age:"سن تخمینی",
  dateFormat:"تاریخ را به قالب میلادی YYYY-MM-DD وارد کنید.",errorAccount:"برای دیدن مریضان وارد شوید.",
  disabled:"این اقدام برای نقش شما فعال نیست.",reportSummary:"گزارش شامل معلومات طبی یا تماس نیست.",
  statusReason:"دلیل تغییر وضعیت",lastUpdated:"آخرین تغییر",
  noPublic:"تا تکمیل مقررات حریم خصوصی و امنیت، معلومات واقعی مریضان را وارد نکنید.",
  idLabel:"شناسه داخلی کلینیک",notVerified:"تأیید نشده",staffOnly:"فقط کارمندان مجاز کلینیک"
 },
 "ps-AF":{
  patients:"ناروغان",directory:"نوملړ",import:"واردول",newPatient:"ناروغ ثبت کړئ",
  identity:"د پېژندنې معلومات",contact:"اړیکه",intake:"روغتیايي معلومات",consent:"خبرتیا او رضا",
  overview:"لنډیز",edit:"د معلوماتو سمون",preferredName:"د ناروغ نوم",familyName:"تخلص",
  phone:"شمېره (اختیاري)",altContact:"بله اړیکه",dob:"د زېږېدو نېټه (میلادي)",
  ageEstimate:"اټکلی عمر (که نېټه نه وي)",
  ageWarning:"نېټه یا اټکلی عمر وټاکئ؛ له عمر څخه دقیقه نېټه نه جوړېږي.",
  province:"ولایت",city:"ښار",address:"پته",emergency:"بیړنۍ اړیکه",
  patientNumber:"د کلینیک د ناروغ شمېره",status:"حالت",active:"فعال",inactive:"غیرفعال",
  archived:"آرشیف",search:"د نوم، شمېره یا آی‌ډي لټون",all:"ټول",sort:"ترتیب",
  activity:"وروستی بدلون",name:"نوم",total:"ټول",countActive:"فعال ناروغان",
  countInactive:"غیرفعال",countArchived:"آرشیف",lastChange:"وروستی بدلون",
  source:"د ثبت سرچینه",notice:"تاییدوم چې ناروغ ته د کلینیک د محرمیت خبرتیا ورکړل شوې.",
  noticeImport:"تاییدوم چې دا معلومات په قانوني توګه ترلاسه شوي او د واردولو اجازه لرم.",
  noticeImportImportant:"وارد شوي ناروغان په خپله د خبرتیا منلي نه ګڼل کېږي.",
  create:"ناروغ خوندي کړئ",save:"بدلونونه خوندي کړئ",cancel:"لغوه",back:"شاته",
  next:"بل",previous:"مخکېنی",pageSize:"هر مخ",view:"کتل",openExisting:"پخوانی ناروغ خلاص کړئ",
  createAnyway:"سره له ورته والي ثبت کړئ",duplicateTitle:"ورته ناروغ وموندل شو",
  duplicateHelp:"د نوي ناروغ تر ثبت وړاندې د همدې کلینیک ورته ثبت وګورئ.",
  duplicateReason:"د ورته ناروغ د ثبت دلیل (لږترلږه ۱۰ توري)",
  duplicateInfo:"دا یوازې وړاندیزونه دي؛ په خپله نه یوځای کېږي.",
  noPatients:"ناروغان نشته.",addFirst:"لومړی ناروغ ثبت کړئ",
  noFilter:"له دې فلټر سره ناروغ نشته.",clear:"فلټر پاک کړئ",loading:"بارېږي…",
  failed:"غوښتنه ناکامه شوه",retry:"بیا هڅه",required:"اړین برخې",success:"ناروغ خوندي شو",
  safeguard:"د کلینیک شخصي ریکارډ؛ عامه حساب نه دی.",
  clinicalPrivacy:"روغتیايي معلومات یوازې مجاز طبي کارکوونکو ته ښکاري.",
  clinicalUnavailable:"روغتیايي معلومات یوازې مجاز ډاکټر یا طبي مدیر لیکي.",
  allergies:"حساسیتونه",medications:"درمل",conditions:"ناروغۍ",
  unknown:"نامعلوم",none_reported:"نه دي راپور شوي",reported:"راپور شوي",
  details:"تفصیل",sourceKind:"د معلوماتو سرچینه",sourceDate:"د سرچینې نېټه (میلادي)",
  patient_reported:"د ناروغ راپور",clinician_observed:"د ډاکټر مشاهده",
  transcribed:"له تایید شوي سند څخه",saveIntake:"روغتیايي معلومات خوندي کړئ",
  intakeUnknown:"طبي معلومات لا د مجاز کس لخوا نه دي ثبت شوي.",
  noAppointments:"وختونه او لیدنې په راتلونکو پړاوونو کې فعالېږي.",
  noFinancial:"بیلونه او تادیات په پنځم پړاو کې نشته.",
  patientHeader:"د ناروغ لنډیز",recordStatus:"د ثبت حالت",setStatus:"حالت بدلول",
  reason:"دلیل (لږترلږه ۱۰ توري)",confirm:"کار تایید کړئ",showArchived:"د آرشیف په ګډون",
  team:"کلینیک",goHome:"د کلینیک ډشبورډ",changeClinic:"کلینیک بدل کړئ",
  chooseClinic:"کلینیک غوره کړئ",notAllowed:"ستاسې دندې ته دا اجازه نشته.",
  noClinic:"فعال غړیتوب نشته.",stale:"بل چا ریکارډ بدل کړی؛ پاڼه تازه کړئ.",
  importTitle:"ناروغان وارد کړئ",template:"د CSV نمونه",stepUpload:"پورته کول",
  stepMap:"د ستونونو ټاکل",stepPreview:"مخکتنه",stepResolve:"ورته ریکارډونه",stepCommit:"وروستی ثبت",
  uploadCsv:"UTF-8 CSV (۱ MB او ۵۰۰ ناروغان)",mapping:"د CSV ستونونه برابر کړئ",
  mapNoColumn:"نه ټاکل شوی",upload:"فایل وټاکئ",preview:"مخکتنه",
  rows:"قطارونه",ready:"چمتو",duplicate:"ورته",invalid:"ناسم",
  new:"نوی جوړ کړئ",skip:"پریږدئ",merge:"یوازې تش برخې ډکې کړئ",decision:"کړنه",
  existing:"موجود ناروغ",confirmImport:"تایید شوی CSV ثبت کړئ",importSuccess:"واردول بشپړ شول",
  importTransfer:"زه د ناروغانو د معلوماتو د انتقال قانوني اجازه لرم.",
  importConfirm:"ورته او ناسم ریکارډونه مې کتلي او کړنې تاییدوم.",
  rowErrors:"د تېروتنو راپور",created:"جوړ شوي",skipped:"پریښودل شوي",
  needsReview:"کتنې ته اړتیا",failedRows:"ناکام",finished:"د واردولو پایلې",
  resultCode:"پایله",fileError:"سم UTF-8 CSV غوره کړئ.",
  selectPatient:"ورته ناروغ وټاکئ",chooseAction:"د هر ورته ریکارډ لپاره کړنه وټاکئ",
  reasonImport:"د یوځای کولو یا نوي ثبت دلیل",importHelp:"یوازې پېژندنیز معلومات؛ طبي تاریخ، درملنه او بلونه نه.",
  importedStatus:"وارد شوی ناروغ؛ شخصي خبرتیا لا تایید شوې نه ده.",
  clinicalRecorded:"طبي معلومات د مجاز کس لخوا ثبت شول.",age:"اټکلی عمر",
  dateFormat:"د میلادي نېټې بڼه YYYY-MM-DD ده.",errorAccount:"لومړی خپل حساب ته ننوځئ.",
  disabled:"دا کړنه ستاسې لپاره نشته.",reportSummary:"په راپور کې طبي او د اړیکې معلومات نشته.",
  statusReason:"د حالت بدلولو دلیل",lastUpdated:"وروستی بدلون",
  noPublic:"تر قانوني او امنیتي تایید مخکې واقعي ناروغان مه داخلوئ.",
  idLabel:"د کلینیک داخلي پېژند",notVerified:"نه دی تایید شوی",staffOnly:"یوازې مجاز کارکوونکي"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const t=(key:string)=>text[locale]?.[key]||text.en[key]||key;
 const date=(value:unknown)=>{
  if(!value)return "—";
  try{return new Intl.DateTimeFormat(locale,{calendar:calendar==="solar_hijri"?"persian":"gregory",
    timeZone:"Asia/Kabul",year:"numeric",month:"short",day:"numeric"}).format(new Date(String(value)));}
  catch{return String(value);}
 };
 return {t,date,locale};
}
async function api(path:string,method="GET",body?:unknown):Promise<any>{
 const response=await fetch(API+"/v1/registry"+path,{
  method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const value=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(new Error(value.code||"NETWORK_ERROR"),{code:value.code,candidates:value.candidates});
 return value;
}
async function context():Promise<Context>{
 const response=await fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"});
 const value=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(value.code||"NETWORK_ERROR");
 return value as Context;
}
function Loading(){const {t}=useWords();return <div className="card panel" aria-live="polite"><span className="phase05-spinner"/> {t("loading")}</div>;}
function ErrorPanel({message,retry}:{message:string,retry?:()=>void}){
 const {t}=useWords();return <section className="card panel"><InlineAlert kind="error">{t("failed")}: {message}</InlineAlert>
  {retry&&<button className="btn btn-secondary" onClick={retry}>{t("retry")}</button>}</section>;
}
function Notice({children,kind="info"}:{children:ReactNode,kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Chip({value}:{value:string}){
 const {t}=useWords();return <span className={"state-badge state-"+value}>{t(value)}</span>;
}
function Field({name,value,onChange,type="text",required=false,maxLength=250,disabled=false,placeholder=""}:{
 name:string;value:string|number|null|undefined;onChange:(s:string)=>void;type?:string;
 required?:boolean;maxLength?:number;disabled?:boolean;placeholder?:string
}){
 return <label className="field"><span>{name}{required?" *":""}</span>
 <input value={value??""} onChange={e=>onChange(e.target.value)} type={type}
  required={required} maxLength={maxLength} disabled={disabled} placeholder={placeholder}/></label>;
}
function Select({name,value,onChange,options,disabled=false}:{name:string,value:string,onChange:(s:string)=>void,
 options:{value:string,label:string}[],disabled?:boolean}){
 return <label className="field"><span>{name}</span><select value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>
 {options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
}
function PatientLink({cid,id,children}:{cid:string,id:string,children:ReactNode}){
 return <a className="text-link" href={"/clinic/patients/"+id+"?clinic="+encodeURIComponent(cid)}>{children}</a>;
}
const patientHref=(cid:string)=>"/clinic/patients?clinic="+encodeURIComponent(cid);
const addHref=(cid:string)=>"/clinic/patients/new?clinic="+encodeURIComponent(cid);
const importHref=(cid:string)=>"/clinic/patients/import?clinic="+encodeURIComponent(cid);
const emptyPatient={preferredName:"",familyName:"",dateOfBirth:"",ageEstimate:"",phone:"",alternateContact:"",
 province:"",city:"",address:"",emergencyContact:"",noticeAcknowledged:false};
function useResource(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [tick,setTick]=useState(0);
 const retry=()=>{setData(null);setError("");setTick(v=>v+1);};
 useEffect(()=>{
  if(!path)return;
  let mounted=true;setData(null);setError("");
  api(path).then(d=>{if(mounted)setData(d);}).catch(e=>{if(mounted)setError(e.message);});
  return()=>{mounted=false;};
 },[path,tick]);
 return {data,error,retry};
}
export function PatientPortal({view}:{view:Page}){
 const {t}=useWords();
 const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  context().then(setCtx).catch(e=>setError(e.message));
 },[]);
 if(error==="AUTH_REQUIRED")return <div className="page-narrow card panel"><Notice kind="warning">{t("errorAccount")}</Notice>
  <a className="btn btn-primary" href="/clinic/login">{t("errorAccount")}</a></div>;
 if(error)return <ErrorPanel message={error} retry={()=>location.reload()}/>;
 if(!ctx)return <Loading/>;
 const space=selected?ctx.clinics.find(c=>c.clinicId===selected):ctx.clinics[0];
 if(!space)return <div className="page-narrow card panel"><Notice kind="warning">{t("noClinic")}</Notice>
  <a href="/clinic" className="btn btn-primary">{t("goHome")}</a></div>;
 if(!["owner","manager","dentist","receptionist","cashier"].includes(space.role))
  return <ErrorPanel message={t("notAllowed")}/>;
 return <Shell ctx={ctx} space={space} active="patients">
  <div className="phase05-page">
   <div className="phase05-top"><div><span className="pill">DandanLink · PH05</span>
      <h1 className="phase-title">{view==="import"?t("importTitle"):view==="new"?t("newPatient"):
        view==="overview"||view==="edit"?t("patientHeader"):t("patients")}</h1></div>
      <div className="phase-actions"><a className="btn btn-secondary" href={patientHref(space.clinicId)}>{t("directory")}</a>
      {["owner","manager","receptionist","dentist"].includes(space.role)&&
       <a className="btn btn-primary" href={addHref(space.clinicId)}>{t("newPatient")}</a>}</div></div>
    {view==="directory"?<Directory space={space}/>:view==="new"?<PatientEditor space={space}/>:
     view==="import"?<CsvImport space={space}/>:
     <PatientDetail space={space} edit={view==="edit"}/>}
  </div>
 </Shell>;
}
