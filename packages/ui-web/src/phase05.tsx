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
 en:{visits:"Visits",files:"Files",chart:"Dental Chart",treatments:"Treatments",

  appointmentHistory:"Appointment history",newAppointment:"New appointment",noBookedVisits:"No appointments for this clinic patient yet.",confirmed:"Scheduled",arrived:"Arrived",in_treatment:"In treatment",completed:"Completed",cancelled:"Cancelled",no_show:"No-show",patients:"Patients",directory:"Directory",import:"Import",newPatient:"Add patient",identity:"Identification",
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
 "fa-AF":{visits:"معاینات",files:"فایل‌ها",chart:"چارت دندان",treatments:"پلان‌های تداوی",

  appointmentHistory:"تاریخچه ملاقات‌ها",newAppointment:"ثبت وقت جدید",noBookedVisits:"برای این مریض هنوز ملاقات ثبت نشده است.",confirmed:"وقت تعیین‌شده",arrived:"حاضر",in_treatment:"در تداوی",completed:"تکمیل",cancelled:"لغو",no_show:"غیرحاضر",patients:"مریضان",directory:"فهرست",import:"وارد کردن",newPatient:"افزودن مریض",
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
 "ps-AF":{visits:"معاینې",files:"فایلونه",chart:"د غاښونو چارټ",treatments:"د درملنې پلانونه",

  appointmentHistory:"د لیدنو تاریخچه",newAppointment:"نوی وخت ثبت کړئ",noBookedVisits:"د دې ناروغ لپاره تر اوسه لیدنه نشته.",confirmed:"ټاکل شوی",arrived:"راغلی",in_treatment:"درملنه",completed:"بشپړ",cancelled:"لغوه",no_show:"نه راغلی",patients:"ناروغان",directory:"نوملړ",import:"واردول",newPatient:"ناروغ ثبت کړئ",
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


function Directory({space}:{space:Space}){
 const {t,date}=useWords();
 const [search,setSearch]=useState(""),[q,setQ]=useState("");
 const [status,setStatus]=useState("active"),[sort,setSort]=useState("activity");
 const [page,setPage]=useState(1),[limit,setLimit]=useState(20);
 useEffect(()=>{const id=setTimeout(()=>{setQ(search.trim());setPage(1);},300);return()=>clearTimeout(id);},[search]);
 const prefix="/clinics/"+space.clinicId+"/patients";
 const {data:summary,retry:refreshSummary}=useResource(prefix+"/summary");
 const {data,error,retry}=useResource(prefix+"?"+new URLSearchParams({
  q,status,sort,page:String(page),limit:String(limit)
 }).toString());
 return <div>
  <div className="phase05-counters" aria-label={t("total")}>
   {(["total","active","inactive","archived"] as const).map(key=><div className="card phase05-stat" key={key}>
     <span>{t(key==="total"?"total":key==="active"?"countActive":key==="inactive"?"countInactive":"countArchived")}</span>
     <strong>{summary?key==="total"?summary.total:summary.counts[key]:"—"}</strong></div>)}
  </div>
  <div className="phase05-directory card panel">
   <div className="phase05-toolbar">
    <div className="phase05-tabs">
     <a href={patientHref(space.clinicId)} className="phase05-tab current" aria-current="page">{t("directory")}</a>
     {["owner","manager"].includes(space.role)&&
       <a href={importHref(space.clinicId)} className="phase05-tab">{t("import")}</a>}
    </div>
    <div className="phase05-filters">
     <Field name={t("search")} value={search} onChange={setSearch} placeholder={t("search")} maxLength={120}/>
     <Select name={t("status")} value={status} onChange={v=>{setStatus(v);setPage(1);}}
       options={["active","inactive","archived","all"].map(v=>({value:v,label:t(v)}))}/>
     <Select name={t("sort")} value={sort} onChange={v=>{setSort(v);setPage(1);}}
       options={[{value:"activity",label:t("activity")},{value:"name",label:t("name")}]}/>
     <Select name={t("pageSize")} value={String(limit)} onChange={v=>{setLimit(Number(v));setPage(1);}}
       options={[{value:"10",label:"10"},{value:"20",label:"20"}]}/>
    </div>
   </div>
   {error?<ErrorPanel message={error} retry={retry}/>:!data?<Loading/>:
    !data.patients.length?<div className="phase05-empty">
      <h2>{search||status!=="active"?t("noFilter"):t("noPatients")}</h2>
      {search||status!=="active"?<button className="btn btn-secondary"
       onClick={()=>{setSearch("");setQ("");setStatus("active");setPage(1);}}>{t("clear")}</button>:
       <a className="btn btn-primary" href={addHref(space.clinicId)}>{t("addFirst")}</a>}
     </div>:
    <div className="phase05-scroll"><table className="staff-table phase05-table">
     <thead><tr><th>{t("patientNumber")}</th><th>{t("name")}</th>
      <th>{t("contact")}</th><th>{t("status")}</th><th>{t("lastChange")}</th><th>{t("view")}</th></tr></thead>
     <tbody>{data.patients.map((p:Patient)=><tr key={p.id}>
       <td><bdi dir="ltr" className="phase05-patient-code">{p.patientNumber}</bdi></td>
       <td><PatientLink cid={space.clinicId} id={p.id}>
         {p.preferredName} {p.familyName||""}</PatientLink></td>
       <td><bdi dir="ltr">{p.phone||"—"}</bdi>{p.phone&&!p.phoneVerified&&
        <small className="phase05-unverified">{t("notVerified")}</small>}</td>
       <td><Chip value={p.status}/></td><td>{date(p.updatedAt)}</td>
       <td><PatientLink cid={space.clinicId} id={p.id}>{t("view")} ↗</PatientLink></td>
      </tr>)}</tbody></table></div>}
   {data&&<div className="phase-pagination">
    <button className="btn btn-secondary" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>{t("previous")}</button>
    <span>{data.total} · {data.page}/{data.pages}</span>
    <button className="btn btn-secondary" disabled={page>=data.pages}
     onClick={()=>setPage(v=>v+1)}>{t("next")}</button>
   </div>}
  </div>
  <p className="muted phase05-footer">{t("safeguard")} {t("noPublic")}</p>
 </div>;
}
function PatientFields({form,setForm,editing=false}:{
 form:any;setForm:React.Dispatch<React.SetStateAction<any>>;editing?:boolean
}){
 const {t}=useWords();
 const set=(key:string)=>(value:string)=>setForm((s:any)=>({...s,[key]:value}));
 const toggleDob=(value:string)=>setForm((s:any)=>({...s,dateOfBirth:value,ageEstimate:value?"":s.ageEstimate}));
 const toggleAge=(value:string)=>setForm((s:any)=>({...s,ageEstimate:value,dateOfBirth:value?"":s.dateOfBirth}));
 return <div className="phase05-form">
  <section className="phase05-form-section"><h2>{t("identity")}</h2>
   <div className="phase-form-grid">
    <Field name={t("preferredName")} required value={form.preferredName}
      maxLength={120} onChange={set("preferredName")}/>
    <Field name={t("familyName")} value={form.familyName}
      maxLength={120} onChange={set("familyName")}/>
    <Field name={t("dob")} value={form.dateOfBirth} type="date" onChange={toggleDob}
      disabled={Boolean(form.ageEstimate)}/>
    <Field name={t("ageEstimate")} value={form.ageEstimate} type="number" onChange={toggleAge}
      disabled={Boolean(form.dateOfBirth)}/>
   </div>
   <p className="muted phase05-description">{t("ageWarning")}</p>
  </section>
  <section className="phase05-form-section"><h2>{t("contact")}</h2>
   <div className="phase-form-grid">
    <Field name={t("phone")} value={form.phone} maxLength={24} onChange={set("phone")} type="tel"/>
    <Field name={t("altContact")} value={form.alternateContact} maxLength={120} onChange={set("alternateContact")}/>
    <Field name={t("province")} value={form.province} maxLength={80} onChange={set("province")}/>
    <Field name={t("city")} value={form.city} maxLength={80} onChange={set("city")}/>
    <Field name={t("address")} value={form.address} maxLength={250} onChange={set("address")}/>
    <Field name={t("emergency")} value={form.emergencyContact} maxLength={160} onChange={set("emergencyContact")}/>
   </div>
  </section>
  <section className="phase05-form-section"><h2>{t("intake")}</h2>
   <Notice>{t("clinicalPrivacy")}</Notice><p className="muted">{t("clinicalUnavailable")}</p>
   <p className="muted">{t("noFinancial")}</p>
  </section>
  <section className="phase05-form-section"><h2>{t("consent")}</h2>
   <label className="phase05-check"><input type="checkbox"
      checked={!!form.noticeAcknowledged} onChange={e=>setForm((s:any)=>({
       ...s,noticeAcknowledged:e.target.checked}))}/>
    <span>{t("notice")}</span></label>
   <p className="muted">{t("safeguard")}</p>
  </section>
 </div>;
}
function DuplicateDialog({candidates,cid,reason,setReason,close,continueCreate,busy}:{
 candidates:Patient[],cid:string,reason:string,setReason:(s:string)=>void,
 close:()=>void,continueCreate:()=>void,busy:boolean
}){
 const {t}=useWords();
 return <div className="phase05-dialog-backdrop" role="presentation">
  <section role="alertdialog" aria-modal="true" aria-labelledby="phase05-dupes-title"
   aria-describedby="phase05-dupes-desc" className="card phase05-dialog">
   <h2 id="phase05-dupes-title">{t("duplicateTitle")}</h2>
   <p id="phase05-dupes-desc">{t("duplicateHelp")} {t("duplicateInfo")}</p>
   <div className="phase-list">{candidates.map(p=><div key={p.id} className="phase-row phase-list-item">
    <div><strong>{p.preferredName} {p.familyName||""}</strong><p><bdi dir="ltr">{p.patientNumber} · {p.phone||"—"}</bdi></p></div>
    <PatientLink cid={cid} id={p.id}>{t("openExisting")}</PatientLink>
   </div>)}</div>
   <Field name={t("duplicateReason")} value={reason} onChange={setReason} maxLength={300}/>
   <div className="phase-actions">
    <button type="button" className="btn btn-secondary" onClick={close}>{t("cancel")}</button>
    <button type="button" className="btn btn-primary" onClick={continueCreate}
     disabled={busy||reason.trim().length<10}>{t("createAnyway")}</button>
   </div>
  </section>
 </div>;
}
function PatientEditor({space,existing}:{space:Space,existing?:Patient}){
 const {t}=useWords();
 const [form,setForm]=useState<any>(existing?{
  ...existing,ageEstimate:existing.ageEstimate??"",
  dateOfBirth:existing.dateOfBirth??"",
  noticeAcknowledged:existing.noticeAcknowledged===true
 }:emptyPatient);
 const [candidates,setCandidates]=useState<Patient[]>([]);
 const [reason,setReason]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const canWrite=["owner","manager","dentist","receptionist"].includes(space.role);
 const target="/clinics/"+space.clinicId+"/patients";
 async function persist(override=false){
  if(!canWrite)return;
  setBusy(true);setError("");
  try{
   const payload={...form,
     dateOfBirth:form.dateOfBirth||null,
     ageEstimate:form.ageEstimate===""||form.ageEstimate===null?null:Number(form.ageEstimate)};
   let result;
   if(existing)result=await api(target+"/"+existing.id,"PATCH",{...payload,revision:existing.revision});
   else result=await api(target,"POST",{...payload,
    ...(override?{duplicateOverride:"create_anyway",duplicateReason:reason.trim()}:{})});
   window.location.assign("/clinic/patients/"+result.patient.id+"?clinic="+encodeURIComponent(space.clinicId));
  }catch(e:any){
   if(e.code==="DUPLICATE_CANDIDATES"&&e.candidates?.length)setCandidates(e.candidates);
   else setError(e.message||"NETWORK_ERROR");
  }finally{setBusy(false);}
 }
 async function submit(event:FormEvent){
  event.preventDefault();
  if(!form.noticeAcknowledged){setError("NOTICE_ACKNOWLEDGEMENT_REQUIRED");return;}
  if(!existing){
   setBusy(true);setError("");
   try{
    const payload={...form,dateOfBirth:form.dateOfBirth||null,
     ageEstimate:form.ageEstimate===""||form.ageEstimate===null?null:Number(form.ageEstimate)};
    const check=await api(target+"/duplicates","POST",payload);
    if(check.count){setCandidates(check.candidates);return;}
   }catch(e:any){setError(e.message);return;}
   finally{setBusy(false);}
  }
  await persist();
 }
 return <section className="card panel">
  {!canWrite?<Notice kind="warning">{t("disabled")}</Notice>:<>
   {existing&&<p className="muted">{t("idLabel")}: <bdi dir="ltr">{existing.patientNumber}</bdi></p>}
   <Notice kind="warning">{t("noPublic")}</Notice>
   {existing&&!existing.noticeAcknowledged&&<Notice kind="warning">{t("importedStatus")}</Notice>}
   <form onSubmit={submit}><PatientFields form={form} setForm={setForm} editing={!!existing}/>
    {error&&<Notice kind="error">{t("failed")}: {error==="STALE_PATIENT_REVISION"?t("stale"):error}</Notice>}
    <div className="phase-actions">
     <a className="btn btn-secondary" href={existing?
       "/clinic/patients/"+existing.id+"?clinic="+space.clinicId:patientHref(space.clinicId)}>{t("cancel")}</a>
     <button className="btn btn-primary" disabled={busy||!form.preferredName?.trim()||!form.noticeAcknowledged}>
       {busy?t("loading"):existing?t("save"):t("create")}</button>
    </div>
   </form></>}
  {candidates.length>0&&<DuplicateDialog cid={space.clinicId} candidates={candidates}
    reason={reason} setReason={setReason} busy={busy}
    close={()=>{setCandidates([]);setReason("");}}
    continueCreate={async()=>{setCandidates([]);await persist(true);}}/>}
 </section>;
}


function PatientDetail({space,edit}:{space:Space,edit:boolean}){
 const {t,date}=useWords();
 const [id,setId]=useState<string|null>(null);
 useEffect(()=>{const bits=location.pathname.split("/").filter(Boolean);
  const index=bits.indexOf("patients");setId(index>=0?bits[index+1]||"":null);},[]);
 const base=id?"/clinics/"+space.clinicId+"/patients/"+id:null;
 const {data,error,retry}=useResource(base);
 const [status,setStatus]=useState("inactive"),[statusReason,setStatusReason]=useState("");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[problem,setProblem]=useState("");
 const {data:intake,error:intakeError,retry:retryIntake}=useResource(data?.clinicalAvailable?base+"/intake":null);
 const p:Patient|undefined=data?.patient;
 useEffect(()=>{if(p)setStatus(p.status==="active"?"inactive":"active");},[p]);
 async function updateStatus(){
  if(!p||statusReason.trim().length<10||!confirm(t("confirm")))return;
  setBusy(true);setProblem("");setNotice("");
  try{
   await api(base+"/status","PATCH",{status,revision:p.revision,reason:statusReason.trim()});
   setNotice(t("success"));setStatusReason("");retry();
  }catch(e:any){setProblem(e.message);}finally{setBusy(false);}
 }
 if(error)return <ErrorPanel message={error} retry={retry}/>;
 if(!p)return <Loading/>;
 if(edit)return <PatientEditor key={p.id+":"+p.revision} space={space} existing={p}/>;
 const canEdit=["owner","manager","dentist","receptionist"].includes(space.role);
 return <div className="phase05-gap">
  <section className="card panel">
   <div className="phase05-patient-head">
    <div><p className="muted">{t("patientNumber")} <bdi dir="ltr" className="phase05-patient-code">{p.patientNumber}</bdi></p>
     <h2 className="phase05-name">{p.preferredName} {p.familyName||""}</h2>
     <p className="muted">{t("lastUpdated")}: {date(p.updatedAt)}</p></div>
    <div className="phase05-head-actions"><Chip value={p.status}/>
     {canEdit&&<a className="btn btn-secondary" href={"/clinic/patients/"+p.id+"/edit?clinic="+space.clinicId}>
       {t("edit")}</a>}</div>
   </div>
   <Notice>{t("safeguard")}</Notice>
   {p.intakeSource==="import"&&!p.noticeAcknowledged&&
     <Notice kind="warning">{t("importedStatus")}</Notice>}
  </section>
  <section className="card panel">
   <div className="phase05-tabs"><span className="phase05-tab current">{t("overview")}</span>
    {data.clinicalAvailable&&<><a className="phase05-tab" href={"/clinic/patients/"+p.id+"/visits?clinic="+encodeURIComponent(space.clinicId)}>{t("visits")}</a>
     <a className="phase05-tab" href={"/clinic/patients/"+p.id+"/chart?clinic="+encodeURIComponent(space.clinicId)}>{t("chart")}</a>
     <a className="phase05-tab" href={"/clinic/patients/"+p.id+"/treatments?clinic="+encodeURIComponent(space.clinicId)}>{t("treatments")}</a>
     <a className="phase05-tab" href={"/clinic/patients/"+p.id+"/files?clinic="+encodeURIComponent(space.clinicId)}>{t("files")}</a></>}</div>
   <h2>{t("identity")}</h2>
   <div className="phase05-detail-grid">
    {([
      ["patientNumber",p.patientNumber],["preferredName",p.preferredName],
      ["familyName",p.familyName],["dob",p.dateOfBirth],
      ["ageEstimate",p.ageEstimate!==undefined?p.ageEstimate:null],
      ["phone",p.phone],["altContact",p.alternateContact],["province",p.province],
      ["city",p.city],["address",p.address],["emergency",p.emergencyContact]
    ] as [string,unknown][]).map(([key,value])=><div key={key} className="phase05-detail-item">
      <span className="muted">{t(key)}</span><strong><bdi dir={["phone","patientNumber"].includes(key)?"ltr":undefined}>
       {value===null||value===undefined||value===""?"—":String(value)}</bdi></strong>
    </div>)}
   </div>
  </section>
  {data.clinicalAvailable&&<section className="card panel"><h2>{t("intake")}</h2>
    <p className="muted">{t("clinicalPrivacy")}</p>
    {intakeError?<ErrorPanel message={intakeError} retry={retryIntake}/>:!intake?<Loading/>:
      <ClinicalIntake value={intake.intake} path={base+"/intake"} reload={retryIntake}/>}
  </section>}
  {!data.clinicalAvailable&&<section className="card panel">
    <h2>{t("intake")}</h2><Notice kind="warning">{t("clinicalUnavailable")}</Notice>
  </section>}
  <section className="card panel">
    <div className="phase05-patient-head">
      <div><span className="phase06-eyebrow">{t("appointmentHistory")}</span>
       <h2 style={{margin:"7px 0 0"}}>{t("appointmentHistory")}</h2></div>
      {canEdit&&p.status==="active"&&
       <a className="btn btn-primary" href={"/clinic/appointments/new?clinic="+space.clinicId+
        "&patientId="+p.id}>+ {t("newAppointment")}</a>}
    </div>
    {canEdit?<PatientBookings space={space} patientId={p.id}/>:
      <Notice kind="warning">{t("disabled")}</Notice>}
    <Notice>{t("noFinancial")}</Notice>
  </section>
  {["owner","manager"].includes(space.role)&&<section className="card panel">
    <h2>{t("setStatus")}</h2>
    <div className="phase05-filters">
      <Select name={t("recordStatus")} value={status} onChange={setStatus}
       options={["active","inactive","archived"].filter(s=>s!==p.status)
        .map(s=>({value:s,label:t(s)}))}/>
      <Field name={t("statusReason")} value={statusReason} onChange={setStatusReason} maxLength={300}/>
    </div>
    <button className="btn btn-secondary" disabled={busy||statusReason.trim().length<10}
      onClick={updateStatus}>{busy?t("loading"):t("confirm")}</button>
    {notice&&<Notice kind="success">{notice}</Notice>}
    {problem&&<Notice kind="error">{problem==="STALE_PATIENT_REVISION"?t("stale"):problem}</Notice>}
  </section>}
 </div>;
}
function PatientBookings({space,patientId}:{space:Space;patientId:string}){
 const {t,date}=useWords();
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [again,setAgain]=useState(0);
 useEffect(()=>{
  let active=true;setData(null);setError("");
  fetch(API+"/v1/appointments/clinics/"+space.clinicId+"/patients/"+patientId+"/appointments",{
   credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(x.code||"REQUEST_FAILED");return x;})
   .then(x=>{if(active)setData(x);})
   .catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[space.clinicId,patientId,again]);
 if(error)return <ErrorPanel message={error} retry={()=>setAgain(n=>n+1)}/>;
 if(!data)return <Loading/>;
 const visits=(data.appointments||[]).slice().reverse();
 if(!visits.length)return <div className="phase06-patient-empty">
    <span aria-hidden="true">▦</span><p>{t("noBookedVisits")}</p>
  </div>;
 return <div className="phase06-patient-appointments">
  {visits.map((a:any)=><a href={"/clinic/appointments/"+a.id+"?clinic="+space.clinicId}
    className="phase06-patient-appointment" key={a.id}>
   <div><strong>{a.serviceName}</strong>
    <span>{a.providerName} · {date(a.startAt)}</span></div>
   <span className={"phase06-status phase06-status-"+a.status}>{t(a.status)}</span>
   <span aria-hidden="true">↗</span>
  </a>)}
 </div>;
}
function ClinicalIntake({value,path,reload}:{value:any,path:string,reload:()=>void}){
 const {t,date}=useWords();
 const [form,setForm]=useState<any>({
   ...value,sourceKind:value.sourceKind==="not_collected"?"patient_reported":value.sourceKind,
   sourceDate:value.sourceDate||new Date().toISOString().slice(0,10)
 });
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState("");
 useEffect(()=>{
  setForm({...value,sourceKind:value.sourceKind==="not_collected"?"patient_reported":value.sourceKind,
   sourceDate:value.sourceDate||new Date().toISOString().slice(0,10)});
 },[value]);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setDone("");setBusy(true);
  try{await api(path,"PATCH",form);setDone(t("clinicalRecorded"));reload();}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <form className="phase05-form" onSubmit={submit}>
  <div className="phase05-intake-grid">
   {(["allergies","medications","conditions"] as const).map(key=><div className="phase05-intake-card" key={key}>
     <h3>{t(key)}</h3>
     <Select name={t("status")} value={form[key+"Status"]||"unknown"}
       onChange={s=>setForm((v:any)=>({...v,[key+"Status"]:s,
          ...(s!=="reported"?{[key+"Notes"]:""}:{})}))}
       options={["unknown","none_reported","reported"].map(s=>({value:s,label:t(s)}))}/>
     {form[key+"Status"]==="reported"&&<label className="field">
       <span>{t("details")}</span>
       <textarea rows={3} value={form[key+"Notes"]||""} maxLength={1500}
        onChange={e=>setForm((v:any)=>({...v,[key+"Notes"]:e.target.value}))}/>
     </label>}
   </div>)}
  </div>
  <div className="phase05-form-grid">
   <Select name={t("sourceKind")} value={form.sourceKind} onChange={s=>setForm((v:any)=>({...v,sourceKind:s}))}
    options={["patient_reported","clinician_observed","transcribed"].map(s=>({value:s,label:t(s)}))}/>
   <Field name={t("sourceDate")} value={form.sourceDate||""} type="date"
    onChange={s=>setForm((v:any)=>({...v,sourceDate:s}))}/>
  </div>
  <p className="muted">{t("source")}: {value.sourceKind==="not_collected"?t("unknown"):t(value.sourceKind)}
    {" · "}{t("lastChange")}: {date(value.updatedAt)} {" · "}{t("idLabel")}: {value.recordedBy||"—"}</p>
  <div className="phase-actions"><button className="btn btn-primary" disabled={busy||!form.sourceDate}>
    {busy?t("loading"):t("saveIntake")}</button></div>
  {error&&<Notice kind="error">{error==="STALE_INTAKE_REVISION"?t("stale"):error}</Notice>}
  {done&&<Notice kind="success">{done}</Notice>}
 </form>;
}


type ImportPreview={headers:string[];mapping:Record<string,string>;previewHash:string;
 counts:{ready:number,duplicates:number,invalid:number};
 rows:{rowNumber:number;values:Record<string,string|null>;status:"ready"|"invalid"|"duplicate";
  errorCode:string|null;candidates:Patient[]}[]};
type RowAction={mode:"skip"|"create"|"merge";reason?:string;targetPatientId?:string};
const CSV_FIELDS=[
 ["preferredName","preferredName"],["familyName","familyName"],["phone","phone"],
 ["importSourceId","idLabel"],["dateOfBirth","dob"],["ageEstimate","ageEstimate"],
 ["province","province"],["city","city"],["address","address"],
 ["alternateContact","altContact"],["emergencyContact","emergency"]
] as const;
const CSV_HEADERS:Record<string,string>={
 preferredName:"preferred_name",familyName:"family_name",phone:"phone",
 importSourceId:"source_id",dateOfBirth:"date_of_birth",ageEstimate:"age_estimate",
 province:"province",city:"city",address:"address",
 alternateContact:"alternate_contact",emergencyContact:"emergency_contact"
};
function CsvImport({space}:{space:Space}){
 const {t}=useWords();
 const [step,setStep]=useState(0),[csv,setCsv]=useState(""),[name,setName]=useState("");
 const [headers,setHeaders]=useState<string[]>([]);
 const [mapping,setMapping]=useState<Record<string,string>>({...CSV_HEADERS});
 const [authorized,setAuthorized]=useState(false),[confirmed,setConfirmed]=useState(false);
 const [preview,setPreview]=useState<ImportPreview|null>(null);
 const [actions,setActions]=useState<Record<string,RowAction>>({});
 const [jobId,setJobId]=useState("");
 const [result,setResult]=useState<any>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const path="/clinics/"+space.clinicId+"/patients/import";
 const canImport=["owner","manager"].includes(space.role);
 function startOver(){setStep(0);setCsv("");setPreview(null);setActions({});
  setJobId("");setResult(null);setError("");setConfirmed(false);setName("");}
 async function choose(file:File|null){
  if(!file)return;
  setError("");setPreview(null);setResult(null);setActions({});setJobId("");
  if(file.size>1048576||file.size<10){setError("CSV_TOO_LARGE_OR_EMPTY");return;}
  if(!file.name.toLocaleLowerCase("en").endsWith(".csv")){setError("CSV_FILE_REQUIRED");return;}
  try{
   const contents=await file.text();
   if(contents.includes("\u0000"))throw new Error("CSV_INVALID_ENCODING");
   const names=contents.replace(/^\ufeff/,"").split(/\r?\n/)[0].split(",")
      .map(s=>s.trim().replace(/^"|"$/g,"").toLocaleLowerCase("en"));
   if(!names.length)throw new Error("CSV_EMPTY");
   const initial:Record<string,string>={};
   for(const field of Object.keys(CSV_HEADERS))
      initial[field]=names.includes(CSV_HEADERS[field])?CSV_HEADERS[field]:"";
   setCsv(contents);setName(file.name);setHeaders(names);setMapping(initial);setStep(1);
  }catch(e:any){setError(e.message||"CSV_INVALID_ENCODING");}
 }
 async function openPreview(){
  setBusy(true);setError("");
  try{
   const response=await api(path+"/preview","POST",{csv,mapping,authorizedTransfer:authorized});
   setPreview(response);setStep(2);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 function setAction(row:number,field:"mode"|"reason"|"targetPatientId",value:string){
  setActions(current=>{
   const item={...(current[row]||{mode:"skip"})} as RowAction;
   return {...current,[row]:{...item,[field]:value}};
  });
 }
 function duplicateRows(){return preview?.rows.filter(r=>r.status==="duplicate")||[];}
 function resolved(){
  return duplicateRows().every(r=>{
   const decision=actions[r.rowNumber];
   if(!decision||decision.mode==="skip")return true;
   if((decision.reason?.trim().length??0)<10)return false;
   if(decision.mode==="merge"&&!decision.targetPatientId)return false;
   return true;
  });
 }
 async function commit(){
  if(!preview||!confirmed||!resolved())return;
  const key=jobId||crypto.randomUUID();
  setJobId(key);setBusy(true);setError("");
  try{
   const value=await api(path+"/commit","POST",{
    csv,mapping:preview.mapping,previewHash:preview.previewHash,
    actions,jobId:key,authorizedTransfer:authorized,confirmed
   });
   setResult(value);setStep(4);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 function downloadReport(){
  if(!result)return;
  const quote=(v:unknown)=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const report="row_number,result,code,patient_id\r\n"+(result.rows||[])
    .filter((r:any)=>r.result!=="created").map((r:any)=>[
      r.rowNumber,r.result,r.code,r.patientId||""].map(quote).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+report],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
  anchor.href=url;anchor.download="dandanlink-import-report.csv";document.body.append(anchor);
  anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 async function template(){
  try{
   const response=await fetch(API+"/v1/registry"+path+"/template",{credentials:"include"});
   if(!response.ok)throw new Error("TEMPLATE_UNAVAILABLE");
   const url=URL.createObjectURL(await response.blob()),anchor=document.createElement("a");
   anchor.href=url;anchor.download="dandanlink-patient-import-template.csv";
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e:any){setError(e.message);}
 }
 if(!canImport)return <ErrorPanel message={t("disabled")}/>;
 return <div className="phase05-gap">
  <Notice kind="warning">{t("noPublic")}</Notice>
  <section className="card panel">
   <div className="phase05-tabs phase05-steps" role="tablist" aria-label={t("importTitle")}>
    {["stepUpload","stepMap","stepPreview","stepResolve","stepCommit"].map((key,index)=>
     <button key={key} type="button" className={"phase05-tab "+(step===index?"current":"")}
       role="tab" aria-selected={step===index} disabled={index>step||step===4&&index!==4}
       onClick={()=>{if(index<=step&&step<4){setStep(index);setError("");}}}>
       {index+1}. {t(key)}</button>)}
   </div>
   <p className="muted">{t("importHelp")}</p>
   {step===0&&<div className="phase05-form">
     <button className="btn btn-secondary" onClick={template}>{t("template")} ↓</button>
     <label className="field"><span>{t("uploadCsv")}</span>
       <input type="file" accept=".csv,text/csv" onChange={e=>choose(e.currentTarget.files?.[0]||null)}/></label>
     <label className="phase05-check"><input type="checkbox" checked={authorized}
       onChange={e=>setAuthorized(e.target.checked)}/>
       <span>{t("noticeImport")}</span></label>
     <Notice>{t("noticeImportImportant")}</Notice>
   </div>}
   {step===1&&<div className="phase05-form">
     <h2>{t("mapping")}</h2><p><strong>{name}</strong> · {headers.length} {t("rows")}</p>
     <div className="phase05-form-grid">
     {CSV_FIELDS.map(([key,label])=><Select key={key} name={t(label)}
       value={mapping[key]||""} onChange={v=>setMapping(m=>({...m,[key]:v}))}
       options={[{value:"",label:t("mapNoColumn")},
         ...headers.map(h=>({value:h,label:h}))]}/>)}</div>
     <div className="phase-actions">
       <button className="btn btn-secondary" onClick={()=>setStep(0)}>{t("back")}</button>
       <button className="btn btn-primary" disabled={!authorized||!mapping.preferredName||busy}
        onClick={openPreview}>{busy?t("loading"):t("preview")}</button>
     </div>
   </div>}
   {step===2&&preview&&<div className="phase05-form">
     <h2>{t("stepPreview")}</h2>
     <div className="phase05-counters">
      {(["ready","duplicates","invalid"] as const).map(key=><div className="phase05-stat card" key={key}>
        <span>{t(key==="duplicates"?"duplicate":key)}</span>
        <strong>{preview.counts[key]}</strong></div>)}
     </div>
     <p className="muted">{t("preview")}: {Math.min(preview.rows.length,15)} / {preview.rows.length} {t("rows")}</p>
     <div className="phase05-scroll"><table className="staff-table"><thead>
      <tr><th>{t("rows")}</th><th>{t("preferredName")}</th><th>{t("phone")}</th>
        <th>{t("status")}</th><th>{t("resultCode")}</th></tr></thead>
      <tbody>{preview.rows.slice(0,15).map(r=><tr key={r.rowNumber}>
       <td>{r.rowNumber}</td><td>{r.values.preferredName||"—"}</td>
       <td><bdi dir="ltr">{r.values.phone||"—"}</bdi></td>
       <td><Chip value={r.status}/></td><td>{r.errorCode||"—"}</td>
      </tr>)}</tbody></table></div>
     <div className="phase-actions"><button className="btn btn-secondary" onClick={()=>setStep(1)}>{t("back")}</button>
      <button className="btn btn-primary" onClick={()=>setStep(3)}>{t("next")}</button></div>
   </div>}
   {step===3&&preview&&<div className="phase05-form">
     <h2>{t("stepResolve")}</h2><Notice kind="warning">{t("duplicateInfo")}</Notice>
     {!duplicateRows().length?<p className="muted">{t("noFilter")}</p>:
      <div className="phase05-resolve-list">{duplicateRows().map(r=><article key={r.rowNumber} className="phase05-resolve-row">
       <div><strong>#{r.rowNumber} · {r.values.preferredName||"—"} {r.values.familyName||""}</strong>
       <p className="muted"><bdi dir="ltr">{r.values.phone||"—"}</bdi> · {r.errorCode}</p></div>
       <Select name={t("decision")} value={actions[r.rowNumber]?.mode||"skip"}
        onChange={v=>setAction(r.rowNumber,"mode",v)}
        options={[{value:"skip",label:t("skip")},{value:"create",label:t("new")},
         ...(r.candidates.length?[{value:"merge",label:t("merge")}]:[])]}/>
       {(actions[r.rowNumber]?.mode==="merge")&&<Select name={t("selectPatient")}
        value={actions[r.rowNumber]?.targetPatientId||""}
        onChange={v=>setAction(r.rowNumber,"targetPatientId",v)}
        options={[{value:"",label:t("mapNoColumn")},
          ...r.candidates.map(p=>({value:p.id,label:p.patientNumber+" · "+p.preferredName}))]}/>}
       {(actions[r.rowNumber]?.mode==="merge"||actions[r.rowNumber]?.mode==="create")&&
        <Field name={t("reasonImport")} value={actions[r.rowNumber]?.reason||""}
         onChange={v=>setAction(r.rowNumber,"reason",v)} maxLength={300}/>}
       {r.candidates.length>0&&<div className="phase05-match-list">
         {r.candidates.map(p=><PatientLink key={p.id} cid={space.clinicId} id={p.id}>
           {t("openExisting")}: <bdi dir="ltr">{p.patientNumber}</bdi> {p.preferredName}</PatientLink>)}
       </div>}
      </article>)}</div>}
     <label className="phase05-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
      <span>{t("importConfirm")}</span></label>
     <p className="muted">{t("noticeImportImportant")}</p>
     <div className="phase-actions"><button className="btn btn-secondary" onClick={()=>setStep(2)}>{t("back")}</button>
      <button className="btn btn-primary" disabled={!confirmed||!resolved()||busy}
       onClick={commit}>{busy?t("loading"):t("confirmImport")}</button></div>
   </div>}
   {step===4&&result&&<div className="phase05-form" aria-live="polite">
     <h2>{t("finished")}</h2>
     <div className="phase05-counters">
       {(["created","skipped","needsReview","failed"] as const).map(key=>
       <div className="phase05-stat card" key={key}><span>{t(key==="needsReview"?"needsReview":key==="failed"?"failedRows":key)}</span>
        <strong>{result.job[key]}</strong></div>)}
     </div>
     <p className="muted">{t("reportSummary")}</p>
     <div className="phase05-scroll"><table className="staff-table"><thead><tr>
       <th>{t("rows")}</th><th>{t("status")}</th><th>{t("resultCode")}</th><th>{t("view")}</th>
       </tr></thead><tbody>{result.rows?.map((row:any)=><tr key={row.rowNumber}>
         <td>{row.rowNumber}</td><td>{t(row.result)}</td><td>{row.code}</td>
         <td>{row.patientId?<PatientLink cid={space.clinicId} id={row.patientId}>{t("view")} ↗</PatientLink>:"—"}</td>
       </tr>)}</tbody></table></div>
     <div className="phase-actions">
       <button className="btn btn-secondary" onClick={downloadReport}>{t("rowErrors")} ↓</button>
       <button className="btn btn-secondary" onClick={startOver}>{t("import")}</button>
       <a className="btn btn-primary" href={patientHref(space.clinicId)}>{t("directory")}</a>
     </div>
   </div>}
   {error&&<Notice kind="error">{t("failed")}: {error}</Notice>}
  </section>
 </div>;
}
