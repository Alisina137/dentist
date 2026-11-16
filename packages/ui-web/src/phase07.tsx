"use client";
import React,{useEffect,useState,type FormEvent,type ReactNode} from "react";
import {InlineAlert,usePreferences} from "./index";
import {ClinicLoadingState,ClinicFailureState,useClinicFeedback} from "./clinic-feedback";
import {Shell} from "./phase03";
import {CareIcon} from "./care-icons";
import {clinicValidDay} from "./clinic-scheduling-dates";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Role="owner"|"manager"|"dentist"|"assistant"|"receptionist"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type View="worklist"|"visits"|"encounter"|"files";
type Note={reason:string;findings:string;assessment:string;historySource:string;
 historyDate:string;followUp:string;performedProcedures:{description:string;serviceId:string|null;toothIds:string[]}[]};
type Encounter={id:string;appointmentId:string|null;status:"draft"|"signed";revision:number;note:Note;
 signedAt:string|null;createdAt:string;updatedAt:string};
const empty:Note={reason:"",findings:"",assessment:"",historySource:"",historyDate:"",
 followUp:"",performedProcedures:[]};
type Language="en"|"fa-AF"|"ps-AF";
const labels:Record<Language,Record<string,string>>={
 en:{
 page:"Page",previous:"Previous",next:"Next",
 clinical:"Clinical",operational:"Operational progress · aggregate counts only",scheduled:"Scheduled today",arrived:"Checked in",inTreatment:"In treatment",completed:"Completed today",pendingCount:"Pending notes",signedCount:"Signed encounters",worklist:"Clinical worklist",today:"Today",pending:"Pending Notes",cases:"My Cases",
 date:"Date",refresh:"Refresh",visits:"Visits",billing:"Billing",files:"Files",overview:"Overview",
 newVisit:"New visit",newVisitHint:"Open an unscheduled encounter or continue from an in-progress appointment.",
 complaint:"Presenting complaint",findings:"Clinical findings",assessment:"Clinical assessment",
 historySource:"History source",historyDate:"History date (Gregorian)",followUp:"Plan / follow-up",
 procedure:"Procedures performed",procedureHelp:"Only record procedures actually performed; a booking is not a procedure.",
 saveDraft:"Save draft",sign:"Sign encounter",amend:"Save amendment",
 correction:"Reason for correction",draft:"Draft",signed:"Signed",revision:"Revision",
 edit:"Edit",history:"Clinical intake",timeline:"Version history",
 xray:"X-ray",photo:"Photograph",consent:"Consent",other:"Other",
 title:"File title",file:"Select file",type:"File type",notes:"Notes",upload:"Upload private file",
 open:"Open",download:"Download",preview:"Image preview",close:"Close",
 loading:"Loading clinical records…",failed:"Request failed. Your unsaved text has been preserved.",
 retry:"Retry",forbidden:"Only authorized clinical staff can open this workspace.",
 noPatients:"No visits for this patient yet.",noFiles:"No private files available for this patient.",
 noToday:"No assigned appointments for this date. Try another date.",
 noPending:"No unfinished notes assigned to you.",noCases:"No signed encounters in your case history yet.",
 start:"Open encounter",awaitArrival:"Check-in required before clinical encounter",record:"Patient record",appointment:"Appointment",status:"Status",
 patient:"Patient",visitDetail:"Visit detail",patientFiles:"Private files",
 signedHint:"The signed baseline cannot be edited. Amendments create a dated, append-only version.",
 draftHint:"Drafts are clinic-private and are not visible to patients.",
 signConfirm:"Sign this encounter as the responsible clinician? This makes its baseline immutable.",
 amendConfirm:"Append a new clinical version with your correction reason?",
 signedSuccess:"Encounter signed.",saved:"Saved successfully.",uploadDone:"Files uploaded.",
 errors:"Unable to complete action",signOnly:"Only the assigned clinician can sign.",
 required:"Required",optional:"Optional",choose:"Choose",size:"Maximum 2 MB per file. JPG, PNG or PDF only.",
 storage:"Files remain private. Downloads require an active clinical session.",
 care:"Clinical documentation is a professional record, not an automated diagnosis.",
 source:"Recorded source",allergy:"Allergies",medications:"Medications",conditions:"Medical conditions",
 none:"Not recorded",author:"Author",when:"Date",kind:"Type",busy:"Saving…",
 returnToPatient:"Patient overview",fileFilter:"Filter by type",all:"All files",
 noAppointment:"Unscheduled",latest:"Latest note",viewFile:"View file",fileName:"File name",
 clinicianNote:"Clinician documentation",revisionConflict:"Another change was saved. Refresh before editing again.",
 newIntake:"Check recorded medical alerts before treatment.",chooseFile:"Choose at least one file.",
 attachment:"Attachment",chooseAppointment:"Link to appointment",leaveUnlinked:"Unlinked",
 uploadFailed:"Upload failed; selected files remain available for retry.",protected:"Restricted clinical data",
 assistantHint:"Assistants may prepare their own assigned appointment drafts but cannot sign or amend.",
 chart:"Dental chart",treatments:"Treatment plans",
 handoff:"Reception-to-clinician handoff",handoffIntro:"Check in the patient at reception, then document care in the assigned clinical workspace.",
 handoffReception:"Reception check-in",handoffReview:"Clinician reviews intake",handoffDocument:"Document and sign actual care",
 handoffWarning:"Check-in does not establish clinical readiness or patient consent. Review medical alerts and permissions before treatment.",
 handoffQueue:"Reception queue",handoffCalendar:"Appointments calendar",
 handoffSearch:"Search this worklist",handoffSearchHint:"Patient, clinic ID or service",
 handoffStatus:"Appointment status",handoffAll:"All active stages",handoffAwaiting:"Awaiting check-in",
 handoffChecked:"Checked in",handoffTreatment:"In treatment",handoffCompleted:"Completed",
 handoffNoMatch:"No matching cases in the latest loaded worklist. Clear the search or switch dates.",
 handoffOpenPatient:"Patient overview",handoffOpenAppointment:"Appointment details",handoffContinue:"Open clinical record",
 handoffDateHint:"Choose the date of the appointments to review.",handoffRange:"Up to 100 appointments, 60 draft notes and 60 signed cases are returned by the server; counts are for this loaded window only.",
 handoffRefresh:"Refresh worklist",handoffClear:"Clear filters",handoffVisit:"Start clinical note",
 handoffNoVisit:"There is no clinical encounter linked to this appointment. Opening Visits does not automatically create one.",
 handoffAlready:"Linked clinical encounter",handoffUnknown:"Status not yet refreshed",
 handoffActive:"Appointments on selected day",handoffLinked:"Clinical record",
 handoffDesk:"Open reception queue to record arrival. Only authorized reception staff can check a patient in.",
 handoffNeedsVerification:"Confirm the patient identity, clinical alerts and consent before documenting care.",
 },
 "fa-AF":{
 page:"صفحه",previous:"قبلی",next:"بعدی",
 clinical:"کلینیکی",operational:"پیشرفت عملیاتی · فقط آمار کلی",scheduled:"وقت‌های امروز",arrived:"پذیرش‌شده",inTreatment:"در حال تداوی",completed:"تکمیل‌شده امروز",pendingCount:"یادداشت‌های ناتمام",signedCount:"معاینات امضاشده",worklist:"فهرست کارهای کلینیکی",today:"امروز",pending:"یادداشت‌های ناتمام",cases:"موارد من",
 date:"تاریخ",billing:"حساب مریض",refresh:"تازه‌سازی",visits:"معاینات",files:"فایل‌ها",overview:"نمای کلی",
 newVisit:"معاینه جدید",newVisitHint:"معاینه بدون نوبت بسازید یا از وقت ملاقات ادامه دهید.",
 complaint:"شکایت اصلی مریض",findings:"یافته‌های کلینیکی",assessment:"ارزیابی داکتر",
 historySource:"منبع سابقه صحی",historyDate:"تاریخ سابقه (میلادی)",followUp:"برنامه / پیگیری",
 procedure:"عملیه‌های انجام‌شده",procedureHelp:"فقط خدمات واقعاً انجام‌شده را ثبت کنید؛ وقت ملاقات به معنی انجام خدمت نیست.",
 saveDraft:"ذخیره پیش‌نویس",sign:"امضای معاینه",amend:"ثبت اصلاحیه",
 correction:"دلیل اصلاحیه",draft:"پیش‌نویس",signed:"امضاشده",revision:"نسخه",
 edit:"ویرایش",history:"سابقه صحی",timeline:"تاریخچه نسخه‌ها",
 xray:"عکس ایکس‌ری",photo:"عکس",consent:"رضایت‌نامه",other:"سایر",
 title:"عنوان فایل",file:"انتخاب فایل",type:"نوع فایل",notes:"یادداشت",upload:"بارگذاری فایل خصوصی",
 open:"باز کردن",download:"دریافت",preview:"نمایش عکس",close:"بستن",
 loading:"در حال دریافت سوابق کلینیکی…",failed:"درخواست ناکام شد. نوشته‌های ذخیره‌نشده حفظ شده‌اند.",
 retry:"تلاش دوباره",forbidden:"فقط کارمندان کلینیکی مجاز می‌توانند این بخش را باز کنند.",
 noPatients:"هنوز معاینه‌ای ثبت نشده است.",noFiles:"فایل خصوصی قابل مشاهده نیست.",
 noToday:"برای این تاریخ وقت ملاقات ندارید. تاریخ دیگری انتخاب کنید.",
 noPending:"یادداشت ناتمام ندارید.",noCases:"هنوز معاینه امضاشده در سوابق شما نیست.",
 start:"باز کردن معاینه",awaitArrival:"برای شروع معاینه، ابتدا مریض باید پذیرش شود.",record:"شماره مریض",appointment:"وقت ملاقات",status:"وضعیت",
 patient:"مریض",visitDetail:"جزئیات معاینه",patientFiles:"فایل‌های خصوصی",
 signedHint:"یادداشت امضاشده قابل تغییر نیست. اصلاحیه، نسخه جداگانه و تاریخ‌دار ایجاد می‌کند.",
 draftHint:"پیش‌نویس فقط برای کلینیک است و مریض آن را نمی‌بیند.",
 signConfirm:"این معاینه را به‌عنوان داکتر مسئول امضا می‌کنید؟ متن اصلی دیگر قابل تغییر نیست.",
 amendConfirm:"اصلاحیه تازه با دلیل آن ثبت شود؟",
 signedSuccess:"معاینه امضا شد.",saved:"با موفقیت ذخیره شد.",uploadDone:"فایل‌ها بارگذاری شدند.",
 errors:"اجرای عملیات ناکام شد",signOnly:"فقط داکتر مربوط می‌تواند امضا کند.",
 required:"ضروری",optional:"اختیاری",choose:"انتخاب",size:"حداکثر ۲ مگابایت برای هر فایل؛ JPG، PNG یا PDF.",
 storage:"فایل‌ها خصوصی هستند و دریافت نیاز به ورود مجاز دارد.",
 care:"مستندسازی کلینیکی جای تشخیص خودکار نیست.",
 source:"منبع",allergy:"حساسیت‌ها",medications:"دواها",conditions:"بیماری‌ها",
 none:"ثبت نشده",author:"نویسنده",when:"تاریخ",kind:"نوع",busy:"در حال ذخیره…",
 returnToPatient:"نمای کلی مریض",fileFilter:"فیلتر نوع",all:"تمام فایل‌ها",
 noAppointment:"بدون وقت",latest:"آخرین یادداشت",viewFile:"مشاهده فایل",fileName:"نام فایل",
 clinicianNote:"یادداشت کلینیکی",revisionConflict:"تغییر جدید ثبت شده است؛ پیش از ویرایش صفحه را تازه کنید.",
 newIntake:"پیش از تداوی، هشدارهای صحی ثبت‌شده را بررسی کنید.",chooseFile:"حداقل یک فایل انتخاب کنید.",
 attachment:"ضمیمه",chooseAppointment:"اتصال به وقت ملاقات",leaveUnlinked:"بدون اتصال",
 uploadFailed:"بارگذاری ناکام شد؛ فایل‌های انتخاب‌شده برای تلاش دوباره حفظ می‌شوند.",protected:"داده‌های کلینیکی محرمانه",
 assistantHint:"دستیار می‌تواند پیش‌نویس وظیفه مربوط را بسازد؛ اما امضا یا اصلاحیه انجام نمی‌دهد.",
 chart:"چارت دندان",treatments:"پلان‌های تداوی",
 handoff:"تحویل کار از پذیرش به داکتر",handoffIntro:"ابتدا حضور مریض در پذیرش ثبت شود؛ سپس در بخش کلینیکی اسناد تداوی نوشته شوند.",
 handoffReception:"ثبت حضور در پذیرش",handoffReview:"بررسی سابقه طبی توسط داکتر",handoffDocument:"ثبت و امضای خدمات انجام‌شده",
 handoffWarning:"حضور مریض به معنی آمادگی طبی یا رضایت او نیست. قبل از تداوی هشدارها و اجازه‌ها را بررسی کنید.",
 handoffQueue:"صف پذیرش",handoffCalendar:"تقویم ملاقات‌ها",
 handoffSearch:"جستجو در فهرست کار",handoffSearchHint:"نام، شماره مریض یا خدمت",
 handoffStatus:"حالت ملاقات",handoffAll:"تمام مراحل فعال",handoffAwaiting:"منتظر پذیرش",
 handoffChecked:"پذیرش‌شده",handoffTreatment:"تحت تداوی",handoffCompleted:"تکمیل‌شده",
 handoffNoMatch:"در فهرست بارگیری‌شده موردی یافت نشد. فیلتر را پاک یا تاریخ را تغییر دهید.",
 handoffOpenPatient:"نمای کلی مریض",handoffOpenAppointment:"جزئیات ملاقات",handoffContinue:"بازکردن سند کلینیکی",
 handoffDateHint:"تاریخ ملاقات‌های مورد نظر را انتخاب کنید.",handoffRange:"سرور حداکثر ۱۰۰ ملاقات، ۶۰ پیش‌نویس و ۶۰ مورد امضاشده را می‌دهد. ارقام فقط برای همین فهرست هستند.",
 handoffRefresh:"تازه‌سازی فهرست",handoffClear:"پاک‌کردن فیلترها",handoffVisit:"ایجاد یادداشت کلینیکی",
 handoffNoVisit:"معاینه‌ای به این ملاقات وصل نیست. بازکردن معاینات به‌طور خودکار سند ایجاد نمی‌کند.",
 handoffAlready:"سند کلینیکی وصل‌شده",handoffUnknown:"هنوز تازه نشده",
 handoffActive:"ملاقات‌های تاریخ انتخاب‌شده",handoffLinked:"سند کلینیکی",
 handoffDesk:"برای ثبت حضور صف پذیرش را باز کنید. فقط پذیرش مجاز می‌تواند حضور را ثبت کند.",
 handoffNeedsVerification:"قبل از ثبت تداوی، هویت مریض، هشدارهای صحی و رضایت را بررسی کنید.",
 },
 "ps-AF":{
 page:"پاڼه",previous:"مخکې",next:"راتلونکی",
 clinical:"کلینیکي",operational:"د چارو لنډیز · یوازې شمېرې",scheduled:"نن ټاکل شوې",arrived:"رارسېدلي",inTreatment:"تر درملنې لاندې",completed:"نن بشپړ شوي",pendingCount:"پاتې یادښتونه",signedCount:"لاسلیک شوې معاینې",worklist:"د کلینیکي کارونو لړلیک",today:"نن",pending:"نیمګړې یادښتونه",cases:"زما قضیې",
 date:"نېټه",billing:"د ناروغ حساب",refresh:"بیا تازه کول",visits:"معاینې",files:"فایلونه",overview:"لنډیز",
 newVisit:"نوې معاینه",newVisitHint:"له نوبت پرته معاینه پیل کړئ یا ټاکلې لیدنه پرمخ یوسئ.",
 complaint:"د ناروغ اصلي شکایت",findings:"کلینیکي موندنې",assessment:"د ډاکټر ارزونه",
 historySource:"د طبي تاریخ سرچینه",historyDate:"د تاریخ نېټه (میلادي)",followUp:"پلان / څارنه",
 procedure:"ترسره شوې کړنې",procedureHelp:"یوازې واقعاً ترسره شوي کارونه ولیکئ؛ نوبت د درملنې معنا نه لري.",
 saveDraft:"مسوده خوندي کړئ",sign:"معاینه لاسلیک کړئ",amend:"سمون ثبت کړئ",
 correction:"د سمون دلیل",draft:"مسوده",signed:"لاسلیک شوې",revision:"بڼه",
 edit:"سمون",history:"طبي تاریخ",timeline:"د بڼو تاریخ",
 xray:"ایکس‌رې",photo:"انځور",consent:"رضایت",other:"نور",
 title:"د فایل سرلیک",file:"فایل وټاکئ",type:"د فایل ډول",notes:"یادښت",upload:"شخصي فایل پورته کول",
 open:"پرانیستل",download:"ښکته کول",preview:"د انځور لیدل",close:"بندول",
 loading:"کلینیکي معلومات پورته کېږي…",failed:"غوښتنه ناکامه شوه؛ نه خوندي شوې لیکنه پاتې ده.",
 retry:"بیا هڅه",forbidden:"یوازې اجازه لرونکي کلینیکي کارکوونکي لاسرسی لري.",
 noPatients:"تراوسه معاینه نشته.",noFiles:"شخصي فایل نشته.",
 noToday:"په دې نېټه ټاکلې لیدنه نشته؛ بله نېټه وټاکئ.",
 noPending:"نیمګړي یادښتونه نشته.",noCases:"ستاسو لاسلیک شوې معاینه نشته.",
 start:"معاینه پرانیستل",awaitArrival:"د معاینې لپاره لومړی د ناروغ راتګ ثبت کړئ.",record:"د ناروغ شمېره",appointment:"لیدنه",status:"حالت",
 patient:"ناروغ",visitDetail:"د معاینې جزئیات",patientFiles:"شخصي فایلونه",
 signedHint:"لاسلیک شوی اصل نه بدلېږي. سمون نوې نېټه لرونکې بڼه جوړوي.",
 draftHint:"مسودې یوازې په کلینیک کې لیدل کېږي.",signConfirm:"د مسوول ډاکټر په توګه لاسلیک کوئ؟ اصلي متن نه بدلېږي.",
 amendConfirm:"له دلیل سره نوې سمونه ثبت شي؟",signedSuccess:"معاینه لاسلیک شوه.",
 saved:"خوندي شوه.",uploadDone:"فایلونه پورته شول.",errors:"عملیات ناکام شول",
 signOnly:"یوازې ټاکلی ډاکټر لاسلیک کولی شي.",required:"اړین",optional:"اختیاري",
 choose:"ټاکل",size:"هر فایل تر ۲ MB پورې؛ JPG، PNG یا PDF.",
 storage:"فایلونه شخصي دي او لاسرسي ته ننوتل پکار دي.",care:"دا مسلکي سند دی، اتومات تشخیص نه دی.",
 source:"سرچینه",allergy:"حساسیتونه",medications:"درمل",conditions:"ناروغۍ",
 none:"نه دي ثبت",author:"لیکوال",when:"نېټه",kind:"ډول",busy:"خوندي کېږي…",
 returnToPatient:"د ناروغ لنډیز",fileFilter:"د ډول چاڼ",all:"ټول فایلونه",
 noAppointment:"بې نوبته",latest:"وروستی یادښت",viewFile:"فایل لیدل",fileName:"د فایل نوم",
 clinicianNote:"کلینیکي یادښت",revisionConflict:"بله سمونه شوې؛ پاڼه تازه کړئ.",
 newIntake:"له درملنې وړاندې طبي خبرتیاوې وګورئ.",chooseFile:"لږترلږه یو فایل غوره کړئ.",
 attachment:"ضمیمه",chooseAppointment:"نوبت ونښلوئ",leaveUnlinked:"بې ارتباطه",
 uploadFailed:"پورته کول ناکام شول؛ فایلونه د بیا هڅې لپاره ساتل شوي.",protected:"خوندي کلینیکي معلومات",
 assistantHint:"مرستیال خپله سپارل شوې مسوده جوړوي، خو لاسلیک یا سمون نه شي کولی.",
 chart:"د غاښونو چارټ",treatments:"د درملنې پلانونه",
 handoff:"له استقبال څخه ډاکټر ته سپارل",handoffIntro:"لومړی د ناروغ راتګ په استقبال کې ثبت کړئ؛ بیا رښتینې درملنه په کلینیکي برخه کې ولیکئ.",
 handoffReception:"په استقبال کې د راتګ ثبت",handoffReview:"د ډاکټر له خوا د طبي تاریخ کتنه",handoffDocument:"د ترسره شوې درملنې ثبت او لاسلیک",
 handoffWarning:"د راتګ ثبت طبي چمتووالی یا رضا نه ثابتوي؛ تر درملنې وړاندې طبي خبرتیاوې او اجازې وګورئ.",
 handoffQueue:"د استقبال کتار",handoffCalendar:"د ملاقاتونو مهالوېش",
 handoffSearch:"د کارلړ پلټنه",handoffSearchHint:"نوم، د ناروغ شمېره یا خدمت",
 handoffStatus:"د ملاقات حالت",handoffAll:"ټول فعال پړاوونه",handoffAwaiting:"د راتګ په تمه",
 handoffChecked:"رارسېدلی",handoffTreatment:"تر درملنې لاندې",handoffCompleted:"بشپړ",
 handoffNoMatch:"په پورته شوي کارلړ کې پایله نشته؛ چاڼ پاک یا نېټه بدله کړئ.",
 handoffOpenPatient:"د ناروغ لنډیز",handoffOpenAppointment:"د ملاقات جزیات",handoffContinue:"کلینیکي ریکارډ پرانیزئ",
 handoffDateHint:"د لیدنو نېټه وټاکئ.",handoffRange:"سرور تر ۱۰۰ ملاقاتونو، ۶۰ مسودو او ۶۰ لاسلیک شویو ریکارډونو پورې ښيي؛ شمېرې یوازې د پورته شوي لړ دي.",
 handoffRefresh:"کارلړ تازه کړئ",handoffClear:"چاڼونه پاک کړئ",handoffVisit:"کلینیکي یادښت جوړ کړئ",
 handoffNoVisit:"دې ملاقات ته کلینیکي ریکارډ نه دی نښلول شوی؛ د معایناتو پاڼه په خپله نوی ریکارډ نه جوړوي.",
 handoffAlready:"نښلول شوی کلینیکي ریکارډ",handoffUnknown:"لا نه دی تازه شوی",
 handoffActive:"د ټاکلې ورځې ملاقاتونه",handoffLinked:"کلینیکي ریکارډ",
 handoffDesk:"د راتګ د ثبت لپاره د استقبال کتار پرانیزئ. یوازې اجازه لرونکی استقبال راتګ ثبتوي.",
 handoffNeedsVerification:"تر ثبت وړاندې د ناروغ هویت، طبي خبرتیاوې او رضایت وګورئ.",
 }
};
function useW(){
 const {locale,calendar}=usePreferences();
 const lang=(locale==="fa-AF"||locale==="ps-AF"||locale==="en")?locale:"en";
 const t=(key:string)=>labels[lang][key]||labels.en[key]||key;
 const fmt=(value:unknown,opts?:Intl.DateTimeFormatOptions)=>{
  if(!value)return "—";
  const d=new Date(String(value));if(Number.isNaN(d.getTime()))return String(value);
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   year:"numeric",month:"short",day:"numeric",...opts}).format(d);
 };
 return {t,fmt,lang};
}
async function call(path:string,method="GET",body?:unknown):Promise<any>{
 const r=await fetch(API+"/v1/clinical"+path,{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.code||"NETWORK_ERROR");
 return data;
}
function useLoad(path:string|null){
 // Route identity is part of the snapshot: older patient/encounter data may
 // never flash while a new clinic/patient is loading.
 const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>({
  path:null,data:null,error:""
 });
 const [tick,setTick]=useState(0);
 const refresh=()=>setTick(x=>x+1);
 useEffect(()=>{
  if(!path){setSnapshot({path:null,data:null,error:""});return;}
  let live=true;setSnapshot({path,data:null,error:""});
  call(path).then(v=>{if(live)setSnapshot({path,data:v,error:""});})
   .catch(e=>{if(live)setSnapshot({path,data:null,error:e.message||"NETWORK_ERROR"});});
  return()=>{live=false;};
 },[path,tick]);
 return {data:snapshot.path===path?snapshot.data:null,
  error:snapshot.path===path?snapshot.error:"",refresh};
}
const link=(cid:string,pid:string,view:"overview"|"visits"|"files"="overview",visit?:string)=>
 "/clinic/patients/"+pid+(view==="overview"?"":"/"+view)+(visit?"/"+visit:"")+
 "?clinic="+encodeURIComponent(cid);
const clinicalLink=(cid:string)=>"/clinic/clinical?clinic="+encodeURIComponent(cid);
const patientName=(p:any)=>(p?.preferredName||p?.preferred_name||"")+" "+
 (p?.familyName||p?.family_name||"");
const day=()=>{
 const parts=new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",
 day:"2-digit",timeZone:"Asia/Kabul"}).formatToParts(new Date());
 const o=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [o.year,o.month,o.day].join("-");
};
function Banner({children,kind="info"}:{children:ReactNode;kind?:"info"|"error"|"success"|"warning"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Loading(){const {t}=useW();return <ClinicLoadingState
 className="card phase07-loading" label={t("loading")} variant="form"/>;}
function ErrorBox({error,retry}:{error:string;retry?:()=>void}){
 const {t,error:describe}=useClinicFeedback();
 return <ClinicFailureState className="card phase07-error" title={t("failed")}
  message={describe(error)} onRetry={retry} retryLabel={t("retry")}/>;
}
function Tabs({space,patientId,current}:{space:Space;patientId:string;current:View}){
 const {t}=useW();return <nav className="phase07-tabs" aria-label={t("patient")}>
 <a aria-label={t("overview")} href={link(space.clinicId,patientId)}>{t("overview")}</a>
 <a aria-current={current==="visits"||current==="encounter"?"page":undefined}
  href={link(space.clinicId,patientId,"visits")}>{t("visits")}</a>
 <a href={"/clinic/patients/"+patientId+"/chart?clinic="+encodeURIComponent(space.clinicId)}>{t("chart")}</a>
 <a href={"/clinic/patients/"+patientId+"/treatments?clinic="+encodeURIComponent(space.clinicId)}>{t("treatments")}</a>
 {["owner","manager"].includes(space.role)&&<a href={"/clinic/patients/"+patientId+"/billing?clinic="+encodeURIComponent(space.clinicId)}>{t("billing")}</a>}
 <a aria-current={current==="files"?"page":undefined}
  href={link(space.clinicId,patientId,"files")}>{t("files")}</a>
 </nav>;
}
export function ClinicalPortal({view}:{view:View}){
 const {t}=useW(),{t:feedback}=useClinicFeedback();
 const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [selected,setSelected]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.code||"AUTH_REQUIRED");setCtx(data);})
   .catch(e=>setError(e.message||"NETWORK_ERROR"));
 },[]);
 if(error==="AUTH_REQUIRED")return <div className="card panel"><Banner kind="warning">{t("forbidden")}</Banner>
  <a href="/clinic/login" className="btn btn-primary">{feedback("signIn")}</a></div>;
 if(error)return <ErrorBox error={error} retry={()=>location.reload()}/>;
 if(!ctx||selected===undefined)return <Loading/>;
 const space=selected?ctx.clinics.find(s=>s.clinicId===selected):ctx.clinics[0];
 if(!space)return <ErrorBox error={t("forbidden")}/>;
 const manager=["owner","manager"].includes(space.role);
 const qualified=space.role==="assistant"||space.role==="dentist"||
  (manager&&space.clinicianEnabled);
 if(!qualified&&!manager)return <ErrorBox error={t("forbidden")}/>;
 if(!qualified&&view!=="worklist")return <ErrorBox error={t("forbidden")}/>;
 const bits=typeof location==="undefined"?[]:location.pathname.split("/").filter(Boolean);
 const index=bits.indexOf("patients"),patientId=index<0?"":bits[index+1]||"";
 const encounterId=bits[index+2]==="visits"?bits[index+3]||"":"";
 return <Shell ctx={ctx} space={space} active={view==="worklist"?"clinical":"patients"}>
  <div className="phase07-workspace">
   <header className="phase07-header">
    <div><span className="phase07-eyebrow">DANDANLINK / {space.clinicName}</span>
     <h1>{t(view==="worklist"?"worklist":view==="visits"?"visits":view==="files"?"patientFiles":"visitDetail")}</h1>
     <p className="muted">{view==="worklist"?t("care"):t("protected")}</p></div>
    <div className="phase07-actions"><a className="btn btn-secondary" href={clinicalLink(space.clinicId)}>{t("worklist")}</a>
     {view!=="worklist"&&<a className="btn btn-secondary" href={link(space.clinicId,patientId)}>
      {t("returnToPatient")}</a>}</div>
   </header>
   {view!=="worklist"&&<Tabs space={space} patientId={patientId} current={view}/>}
   {view==="worklist"?(qualified?<Worklist space={space}/>:<OperationalSummary space={space}/>):
    view==="visits"?<Visits space={space} patientId={patientId}/>:
    view==="files"?<Files space={space} patientId={patientId}/>:
    <VisitNote space={space} patientId={patientId} encounterId={encounterId}/>}
   <footer className="phase07-footer">◇ {t("storage")} {t("care")}</footer>
  </div>
 </Shell>;
}
function OperationalSummary({space}:{space:Space}){
 const {t,fmt}=useW();
 const {data,error,refresh}=useLoad("/clinics/"+space.clinicId+"/worklist/status");
 if(error)return <ErrorBox error={error} retry={refresh}/>;
 if(!data)return <Loading/>;
 const cards:[string,number][]=[["scheduled",data.scheduled],["arrived",data.arrived],
  ["inTreatment",data.inTreatment],["completed",data.completed],
  ["pendingCount",data.pending],["signedCount",data.signed]];
 return <section className="card phase07-panel">
  <div className="phase07-section">
   <div><h2>{t("operational")}</h2><p className="phase07-meta">{fmt(data.date+"T12:00:00Z")}</p></div>
   <button type="button" className="btn btn-secondary" onClick={refresh}>{t("refresh")} ↻</button>
  </div>
  <div className="phase07-overview-stats">{cards.map(([key,value])=>
   <div key={key}><span>{t(key)}</span><strong>{value}</strong></div>)}</div>
  <Banner kind="warning">{t("protected")}. {t("operational")}</Banner>
 </section>;
}
type WorklistTab="today"|"pending"|"cases";
type WorklistStatus="all"|"confirmed"|"arrived"|"in_treatment"|"completed";
type WorklistAppointment={
 appointment_id:string;patient_id:string;patient_number:string;
 preferred_name:string;family_name:string|null;service_name:string;
 status:string;start_at:string;end_at:string;encounter_id:string|null;
 encounter_status:string|null;
};
type WorklistCase={id:string;patient_id:string;patient_number:string;
 preferred_name:string;family_name:string|null;reason:string;
 updated_at?:string;signed_at?:string};
const WORKLIST_PAGE_SIZE=5;
function Worklist({space}:{space:Space}){
 const {t,fmt,lang}=useW();
 const [date,setDate]=useState(day()),[ready,setReady]=useState(false);
 const [tab,setTab]=useState<WorklistTab>("today");
 const [status,setStatus]=useState<WorklistStatus>("all");
 const [search,setSearch]=useState("");
 const [page,setPage]=useState(1);
 const base="/clinics/"+encodeURIComponent(space.clinicId);
 useEffect(()=>{
  const q=new URLSearchParams(location.search);
  const queryDate=q.get("date");
  if(queryDate&&clinicValidDay(queryDate))setDate(queryDate);
  if(["today","pending","cases"].includes(q.get("tab")||""))
   setTab(q.get("tab") as WorklistTab);
  if(["all","confirmed","arrived","in_treatment","completed"].includes(q.get("status")||""))
   setStatus(q.get("status") as WorklistStatus);
  setReady(true);
 },[]);
 useEffect(()=>{
  if(!ready)return;
  const q=new URLSearchParams(location.search);
  q.set("clinic",space.clinicId);
  for(const [key,value] of Object.entries({date,tab,status})){
   if((key==="tab"&&value==="today")||(key==="status"&&value==="all"))q.delete(key);
   else q.set(key,value);
  }
  history.replaceState(null,"",location.pathname+"?"+q.toString());
 },[ready,space.clinicId,date,tab,status]);
 const {data,error,refresh}=useLoad(ready?base+"/worklist?date="+date:null);
 const todayRows:WorklistAppointment[]=data?.today||[];
 const pendingRows:WorklistCase[]=data?.pending||[];
 const caseRows:WorklistCase[]=data?.cases||[];
 const searchTerm=search.trim().toLocaleLowerCase();
 const todayMatches=todayRows.filter(a=>(status==="all"||a.status===status)&&
  (!searchTerm||(patientName(a)+" "+a.patient_number+" "+a.service_name)
   .toLocaleLowerCase().includes(searchTerm)));
 const caseMatches=(tab==="pending"?pendingRows:caseRows).filter(e=>
  !searchTerm||(patientName(e)+" "+e.patient_number+" "+e.reason)
   .toLocaleLowerCase().includes(searchTerm));
 const filtered=tab==="today"?todayMatches:caseMatches;
 const pageCount=Math.max(1,Math.ceil(filtered.length/WORKLIST_PAGE_SIZE));
 const safePage=Math.min(page,pageCount);
 const visible=filtered.slice((safePage-1)*WORKLIST_PAGE_SIZE,safePage*WORKLIST_PAGE_SIZE);
 const counts=[
  {key:"confirmed" as const,label:"handoffAwaiting"},
  {key:"arrived" as const,label:"handoffChecked"},
  {key:"in_treatment" as const,label:"handoffTreatment"},
  {key:"completed" as const,label:"handoffCompleted"}
 ];
 function navigateDay(value:string){if(!clinicValidDay(value))return;
  setDate(value);setPage(1);}
 function setActiveTab(value:WorklistTab){setTab(value);setPage(1);}
 function changeStatus(value:WorklistStatus){setStatus(value);setPage(1);}
 return <div className="phase07-stack clinic-phase09-worklist">
  <section className="clinic-phase09-handoff card" aria-label={t("handoff")}>
   <div className="clinic-phase09-handoff-header">
    <div><span className="clinic-phase09-kicker">
     <CareIcon name="activity" size={17}/>{t("handoff")}</span>
     <h2>{t("handoffIntro")}</h2></div>
    <nav className="clinic-phase09-handoff-links" aria-label={t("handoffQueue")}>
     <a href={"/clinic/appointments/queue?clinic="+encodeURIComponent(space.clinicId)+
      "&date="+date} className="btn btn-secondary">
      <CareIcon name="clock" size={17}/>{t("handoffQueue")}</a>
     <a href={"/clinic/appointments?clinic="+encodeURIComponent(space.clinicId)+
      "&date="+date+"&view=day"} className="btn btn-secondary">
      <CareIcon name="calendar" size={17}/>{t("handoffCalendar")}</a>
    </nav>
   </div>
   <ol className="clinic-phase09-handoff-steps">
    {([
     ["handoffReception","account"],["handoffReview","shield-check"],["handoffDocument","clipboard"]
    ] as const).map(([label,icon],index)=><li key={label}>
     <span className="clinic-phase09-step-icon">
      <CareIcon name={icon} size={19}/></span>
     <div><small dir="auto">{index+1}</small><strong>{t(label)}</strong></div>
    </li>)}
   </ol>
   <p className="clinic-phase09-clinical-warning">
    <CareIcon name="about" size={17}/>{t("handoffWarning")}</p>
  </section>
  <section className="card phase07-controlbar clinic-phase09-controlbar">
   <div className="phase07-tabs" role="tablist" aria-label={t("worklist")}>
    {(["today","pending","cases"] as const).map(key=><button type="button" role="tab" key={key}
     aria-selected={tab===key} onClick={()=>setActiveTab(key)}>{t(key)}
     {data&&<span className="phase07-count">
      {(key==="today"?todayRows:key==="pending"?pendingRows:caseRows).length}
     </span>}</button>)}
   </div>
   <div className="clinic-phase09-date-controls">
    <button type="button" className="btn btn-secondary" onClick={()=>navigateDay(day())}>{t("today")}</button>
    <label className="phase07-date"><span>{t("date")}</span>
     <input type="date" value={date} onChange={e=>navigateDay(e.target.value)}/></label>
    <button type="button" className="btn btn-secondary" onClick={refresh}>
     <CareIcon name="activity" size={17}/>{t("handoffRefresh")}</button>
   </div>
  </section>
  <section className="clinic-phase09-search-row card" aria-label={t("handoffSearch")}>
   <label className="clinic-phase09-search">
    <span>{t("handoffSearch")}</span>
    <span><CareIcon name="search" size={17}/>
     <input type="search" value={search} maxLength={100} autoComplete="off"
      placeholder={t("handoffSearchHint")}
      onChange={event=>{setSearch(event.target.value);setPage(1);}}/></span>
   </label>
   {tab==="today"&&<label className="clinic-phase09-status-filter">
    <span>{t("handoffStatus")}</span>
    <select value={status} onChange={event=>changeStatus(event.target.value as WorklistStatus)}>
     <option value="all">{t("handoffAll")}</option>
     {counts.map(({key,label})=><option key={key} value={key}>{t(label)}</option>)}
    </select>
   </label>}
   {(search||status!=="all")&&<button type="button" className="btn btn-secondary"
    onClick={()=>{setSearch("");changeStatus("all");}}>{t("handoffClear")}</button>}
  </section>
  {data&&<section className="clinic-phase09-status-cards" aria-label={t("handoffActive")}>
   {counts.map(({key,label})=><button type="button" key={key}
    className={"clinic-phase09-stage-card stage-"+key+(tab==="today"&&status===key?" is-selected":"")}
    aria-pressed={tab==="today"&&status===key}
    onClick={()=>{setActiveTab("today");changeStatus(key);}}>
    <span>{t(label)}</span>
    <strong>{todayRows.filter(a=>a.status===key).length}</strong></button>)}
  </section>}
  {data&&<p className="clinic-phase09-limits" role="status">
   <CareIcon name="about" size={16}/>{t("handoffRange")}</p>}
  {error?<ErrorBox error={error} retry={refresh}/>:!data?<Loading/>:
   <section className="card phase07-panel clinic-phase09-results" aria-label={t(tab)}>
    <div className="phase07-section">
     <h2>{tab==="today"?t("handoffActive"):t(tab)}</h2>
     <span className="phase07-subdued" role="status" aria-live="polite">
      {tab==="today"?fmt(date+"T12:00:00Z")+" · ":""}
      {filtered.length} {t("handoffLinked")}</span>
    </div>
    {!visible.length?<div className="clinic-phase09-empty" role="status">
     <CareIcon name="search" size={23}/>
     <p>{search||status!=="all"?t("handoffNoMatch"):
      t(tab==="today"?"noToday":tab==="pending"?"noPending":"noCases")}</p>
     {(search||status!=="all")&&<button type="button" className="btn btn-secondary"
      onClick={()=>{setSearch("");changeStatus("all");}}>{t("handoffClear")}</button>}
    </div>:
     tab==="today"?<div className="phase07-rows clinic-phase09-rows">
      {(visible as WorklistAppointment[]).map(a=><article className="phase07-visit-row clinic-phase09-visit-row"
       key={a.appointment_id}>
       <div className="phase07-time"><time dateTime={a.start_at}>
        <bdi dir="ltr">{fmt(a.start_at,{year:undefined,month:undefined,day:undefined,
         hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}</bdi></time></div>
       <div className="phase07-row-main">
        <h3>{patientName(a)}</h3>
        <div className="phase07-meta">
         <bdi dir="ltr">{a.patient_number}</bdi> · {a.service_name}
        </div>
        <span className={"clinic-phase09-visit-status stage-"+a.status}>
         {t(a.status==="confirmed"?"handoffAwaiting":
          a.status==="arrived"?"handoffChecked":
          a.status==="in_treatment"?"handoffTreatment":
          a.status==="completed"?"handoffCompleted":"handoffUnknown")}</span>
        {a.encounter_id&&<small className="clinic-phase09-encounter-mark">
         <CareIcon name="check" size={14}/>{t("handoffAlready")}</small>}
       </div>
       <div className="clinic-phase09-row-actions">
        {a.status==="confirmed"?<span className="phase07-await" aria-label={t("awaitArrival")}>
         {t("awaitArrival")}</span>:
         <a className="btn btn-primary" href={a.encounter_id?
          link(space.clinicId,a.patient_id,"visits",a.encounter_id):
          link(space.clinicId,a.patient_id,"visits")+
           "&appointmentId="+encodeURIComponent(a.appointment_id)}>
          <CareIcon name="clipboard" size={16}/>
          {t(a.encounter_id?"handoffContinue":"handoffVisit")}</a>}
        <a href={"/clinic/appointments/"+encodeURIComponent(a.appointment_id)+
         "?clinic="+encodeURIComponent(space.clinicId)}
         className="clinic-phase09-textlink">{t("handoffOpenAppointment")}</a>
        <a href={link(space.clinicId,a.patient_id)}
         className="clinic-phase09-textlink">{t("handoffOpenPatient")}</a>
       </div>
      </article>)}
     </div>:
     <div className="phase07-rows clinic-phase09-rows">
      {(visible as WorklistCase[]).map(e=><article className="phase07-visit-row clinic-phase09-visit-row" key={e.id}>
       <span className="phase07-time" aria-hidden="true">✚</span>
       <div className="phase07-row-main"><h3>{patientName(e)}</h3>
        <p className="phase07-meta"><bdi dir="ltr">{e.patient_number}</bdi> ·
         {e.reason} · {fmt(e.updated_at||e.signed_at)}</p></div>
       <div className="clinic-phase09-row-actions">
        <a className="btn btn-secondary" href={link(space.clinicId,e.patient_id,"visits",e.id)}>
         {t("handoffContinue")} →</a>
        <a className="clinic-phase09-textlink" href={link(space.clinicId,e.patient_id)}>
         {t("handoffOpenPatient")}</a>
       </div>
      </article>)}
     </div>}
    {filtered.length>WORKLIST_PAGE_SIZE&&<nav className="clinic-phase09-pagination" aria-label={t("page")}>
     <span aria-live="polite">{safePage}/{pageCount} · {filtered.length}</span>
     <div><button type="button" className="btn btn-secondary"
      disabled={safePage<=1} onClick={()=>setPage(v=>Math.max(1,v-1))}>{t("previous")}</button>
      <button type="button" className="btn btn-secondary"
       disabled={safePage>=pageCount} onClick={()=>setPage(v=>Math.min(pageCount,v+1))}>{t("next")}</button>
     </div>
    </nav>}
   </section>}
  {space.role==="assistant"&&<Banner>{t("assistantHint")}</Banner>}
 </div>;
}
function Visits({space,patientId}:{space:Space;patientId:string}){
 const {t,fmt}=useW(),base="/clinics/"+space.clinicId+"/patients/"+patientId;
 const {data,error,refresh}=useLoad(base+"/encounters");
 const appointmentId=typeof location!=="undefined"?new URLSearchParams(location.search).get("appointmentId"):null;
 const [reason,setReason]=useState(""),[busy,setBusy]=useState(false),[failure,setFailure]=useState("");
 async function create(event:FormEvent){
  event.preventDefault();setBusy(true);setFailure("");
  try{const created=await call(base+"/encounters","POST",{reason,appointmentId});
   location.assign(link(space.clinicId,patientId,"visits",created.id));
  }catch(e:any){setFailure(e.message);}finally{setBusy(false);}
 }
 if(error)return <ErrorBox error={error} retry={refresh}/>;
 if(!data)return <Loading/>;
 const canStart=space.role!=="assistant"||Boolean(appointmentId);
 return <div className="phase07-grid">
  <section className="card phase07-panel">
   <div className="phase07-section"><div><span className="phase07-eyebrow">{t("record")} · <bdi dir="ltr">{data.patient.patientNumber}</bdi></span>
    <h2>{patientName(data.patient)}</h2></div><span className="phase07-count">{data.encounters.length}</span></div>
   {!data.encounters.length?<p className="phase07-empty">{t("noPatients")}</p>:
    <ol className="phase07-timeline">{data.encounters.map((e:any)=><li key={e.id}>
     <div className="phase07-datebadge">{fmt(e.created_at,{month:"short",day:"numeric"})}</div>
     <div className="phase07-case"><div className="phase07-between"><h3>{e.reason}</h3>
      <span className={"phase07-badge "+e.status}>{t(e.status)}</span></div>
      <div className="phase07-meta">{e.author_name} · {fmt(e.created_at)} · {t("revision")} {e.revision}</div>
      <a className="phase07-textlink" href={link(space.clinicId,patientId,"visits",e.id)}>
       {t("visitDetail")} →</a></div></li>)}</ol>}
  </section>
  <aside className="card phase07-panel phase07-sidebar">
   <h2>{t("newVisit")}</h2><p className="muted">{t("newVisitHint")}</p>
   {canStart?<form className="phase07-form" onSubmit={create}>
    {appointmentId&&<div className="clinic-phase09-visit-origin">
     <Banner>{t("chooseAppointment")}: <bdi dir="ltr">{appointmentId.slice(0,8)}</bdi></Banner>
     <a className="clinic-phase09-textlink"
      href={"/clinic/appointments/"+encodeURIComponent(appointmentId)+
       "?clinic="+encodeURIComponent(space.clinicId)}>
      <CareIcon name="calendar" size={16}/>{t("handoffOpenAppointment")}</a>
     <p>{t("handoffNeedsVerification")}</p>
    </div>}
    <label className="field"><span>{t("complaint")} *</span><textarea value={reason} required maxLength={2000}
     rows={4} onChange={e=>setReason(e.target.value)}/></label>
    <button className="btn btn-primary" disabled={busy||reason.trim().length<2}>
     {busy?t("busy"):t("newVisit")}</button>
    {failure&&<ErrorBox error={failure}/>}
   </form>:<Banner kind="warning">{t("assistantHint")}</Banner>}
  </aside>
 </div>;
}
function NoteFields({note,setNote,disabled=false}:{note:Note;setNote:(n:Note)=>void;disabled?:boolean}){
 const {t}=useW();
 const field=(key:keyof Note,value:string)=>setNote({...note,[key]:value});
 const fields:[keyof Note,number,number][]=[["reason",2000,3],["findings",5000,5],
  ["assessment",5000,4],["followUp",3000,3]];
 return <div className="phase07-form">
  {fields.map(([key,max,rows])=><label className="field" key={key}><span>
   {t(key==="reason"?"complaint":key)} {key!=="followUp"?"*":t("optional")}</span>
   <textarea value={String(note[key]||"")} rows={rows} maxLength={max} disabled={disabled}
    onChange={e=>field(key,e.target.value)}/></label>)}
  <div className="phase07-pair"><label className="field"><span>{t("historySource")}</span>
   <input value={note.historySource||""} maxLength={200} disabled={disabled}
    onChange={e=>field("historySource",e.target.value)}/></label>
   <label className="field"><span>{t("historyDate")}</span>
    <input type="date" value={note.historyDate||""} disabled={disabled}
     onChange={e=>field("historyDate",e.target.value)}/></label></div>
  <label className="field"><span>{t("procedure")}</span>
   <textarea rows={3} maxLength={600} disabled={disabled}
    value={note.performedProcedures?.map(x=>x.description).join("\n")||""}
    onChange={e=>setNote({...note,performedProcedures:e.target.value.split("\n").filter(x=>x.trim())
     .map(description=>({description,serviceId:null,toothIds:[]}))})}/>
   <small>{t("procedureHelp")}</small></label>
 </div>;
}
function VisitNote({space,patientId,encounterId}:{space:Space;patientId:string;encounterId:string}){
 const {t,fmt}=useW(),base="/clinics/"+space.clinicId+"/patients/"+patientId;
 const {data,error,refresh}=useLoad(base+"/encounters/"+encounterId);
 const [note,setNote]=useState<Note>(empty),[reason,setReason]=useState("");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[failure,setFailure]=useState("");
 useEffect(()=>{if(data?.encounter) setNote({...empty,...data.encounter.note,
  historyDate:data.encounter.note.historyDate||"",historySource:data.encounter.note.historySource||"",
  followUp:data.encounter.note.followUp||"",performedProcedures:data.encounter.note.performedProcedures||[]});},[data]);
 async function action(type:"save"|"sign"|"amend"){
  if(!data)return;
  if(type==="sign"&&!confirm(t("signConfirm")))return;
  if(type==="amend"&&!confirm(t("amendConfirm")))return;
  setBusy(true);setFailure("");setNotice("");
  try{
   const rev=data.encounter.revision;
   if(type==="save")await call(base+"/encounters/"+encounterId,"PATCH",{...note,revision:rev});
   if(type==="sign"){
    // Persist the visible form first so the signed snapshot exactly matches what was confirmed.
    await call(base+"/encounters/"+encounterId,"PATCH",{...note,revision:rev});
    await call(base+"/encounters/"+encounterId+"/sign","POST",{revision:rev+1,confirmation:"SIGN"});
   }
   if(type==="amend")await call(base+"/encounters/"+encounterId+"/amend","POST",
    {...note,revision:rev,correctionReason:reason});
   setNotice(t(type==="sign"?"signedSuccess":"saved"));setReason("");refresh();
  }catch(e:any){setFailure(e.message);}finally{setBusy(false);}
 }
 if(error)return <ErrorBox error={error} retry={refresh}/>;
 if(!data)return <Loading/>;
 const e:Encounter=data.encounter,showEdit=data.canEdit||data.canAmend;
 return <div className="phase07-grid">
  <main className="phase07-stack">
   <section className="card phase07-panel">
    <div className="phase07-between"><div><span className="phase07-eyebrow">{t("record")} · <bdi dir="ltr">
      {data.patient.patientNumber}</bdi></span><h2>{patientName(data.patient)}</h2>
      <p className="muted">{fmt(e.createdAt)} · {t("revision")} {e.revision}</p></div>
     <span className={"phase07-badge "+e.status}>{t(e.status)}</span></div>
    <div className="clinic-phase09-visit-navigation">
     <a className="btn btn-secondary" href={link(space.clinicId,patientId)}>
      <CareIcon name="account" size={16}/>{t("returnToPatient")}</a>
     {e.appointmentId&&<a className="btn btn-secondary" href={
      "/clinic/appointments/"+encodeURIComponent(e.appointmentId)+
       "?clinic="+encodeURIComponent(space.clinicId)}>
      <CareIcon name="calendar" size={16}/>{t("handoffOpenAppointment")}</a>}
    </div>
    <Banner kind={e.status==="signed"?"success":"warning"}>
     {t(e.status==="signed"?"signedHint":"draftHint")}</Banner>
   </section>
   <section className="card phase07-panel">
    <div className="phase07-section"><h2>{t("clinicianNote")}</h2>
     <span className="phase07-badge">{t("latest")}</span></div>
    <NoteFields note={note} setNote={setNote} disabled={!showEdit||busy}/>
    {data.canAmend&&<label className="field phase07-correction"><span>{t("correction")} *</span>
     <textarea value={reason} maxLength={500} rows={3} onChange={ev=>setReason(ev.target.value)}
      disabled={busy}/></label>}
    {showEdit&&<div className="phase07-buttons">
     {data.canEdit&&<button type="button" className="btn btn-secondary" disabled={busy}
      onClick={()=>action("save")}>{busy?t("busy"):t("saveDraft")}</button>}
     {data.canSign&&<button type="button" className="btn btn-primary" disabled={busy||
      !note.reason.trim()||!note.findings.trim()||!note.assessment.trim()}
      onClick={()=>action("sign")}>{busy?t("busy"):t("sign")}</button>}
     {data.canAmend&&<button type="button" className="btn btn-primary" disabled={busy||
      reason.trim().length<10||!note.reason.trim()||!note.findings.trim()||!note.assessment.trim()}
      onClick={()=>action("amend")}>{busy?t("busy"):t("amend")}</button>}
    </div>}
    {data.canSign&&<p className="muted">{t("signConfirm")}</p>}
    {notice&&<Banner kind="success">{notice}</Banner>}
    {failure&&<ErrorBox error={failure} retry={failure==="STALE_ENCOUNTER_REVISION"?refresh:undefined}/>}
   </section>
   <section className="card phase07-panel">
    <div className="phase07-section"><h2>{t("timeline")}</h2></div>
    <ol className="phase07-version-list">{data.versions.map((v:any)=><li key={v.id}>
     <div className="phase07-between"><strong>{t("revision")} {v.revision} ·
      {v.action==="signed"?t("signed"):v.action==="amended"?t("amend"):t("draft")}</strong>
      <time>{fmt(v.created_at)}</time></div>
     <p className="phase07-meta">{v.author_name}</p>
     {v.correction_reason&&<Banner kind="warning">{t("correction")}: {v.correction_reason}</Banner>}
     <details><summary>{t("clinicianNote")}</summary>
      <p>{t("complaint")}: {v.note.reason||"—"}</p>
      <p>{t("findings")}: {v.note.findings||"—"}</p>
      <p>{t("assessment")}: {v.note.assessment||"—"}</p>
      <p>{t("followUp")}: {v.note.followUp||"—"}</p></details>
    </li>)}</ol>
   </section>
  </main>
  <aside className="phase07-stack">
   <section className="card phase07-panel">
    <h2>{t("history")}</h2><p className="muted">{t("newIntake")}</p>
    {(["allergies","medications","conditions"] as const).map(key=><div className="phase07-intake" key={key}>
     <strong>{t(key==="allergies"?"allergy":key)}</strong>
     <span>{data.history?.[key+"_status"]||t("none")}</span>
     <p>{data.history?.[key+"_notes"]||"—"}</p></div>)}
   </section>
   <section className="card phase07-panel">
    <h2>{t("chart")}</h2>
    <a className="btn btn-secondary" href={"/clinic/patients/"+patientId+"/chart?clinic="+encodeURIComponent(space.clinicId)+
     "&encounterId="+encodeURIComponent(encounterId)}>{t("chart")} →</a>
    <hr className="phase07-divider"/>
    <h2>{t("attachment")}</h2>
    <p className="muted">{t("storage")}</p>
    <a className="btn btn-secondary" href={link(space.clinicId,patientId,"files")+
     "&encounterId="+encodeURIComponent(encounterId)}>{t("patientFiles")} →</a>
   </section>
  </aside>
 </div>;
}
async function fileBase64(file:File){
 const buf=new Uint8Array(await file.arrayBuffer());
 let result="";
 for(let i=0;i<buf.length;i+=32768)result+=String.fromCharCode(...buf.subarray(i,i+32768));
 return btoa(result);
}
function Files({space,patientId}:{space:Space;patientId:string}){
 const {t,fmt}=useW(),base="/clinics/"+space.clinicId+"/patients/"+patientId;
 const [kind,setKind]=useState("all");
 const {data,error,refresh}=useLoad(base+"/files?kind="+kind);
 const [title,setTitle]=useState(""),[notes,setNotes]=useState(""),[fileKind,setFileKind]=useState("photo");
 const [selected,setSelected]=useState<File[]>([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState("");
 const [failure,setFailure]=useState(""),[success,setSuccess]=useState("");
 const [preview,setPreview]=useState<string|null>(null);
 const linked=typeof location==="undefined"?null:new URLSearchParams(location.search).get("encounterId");
 async function upload(event:FormEvent){
  event.preventDefault();if(!selected.length){setFailure(t("chooseFile"));return;}
  setBusy(true);setFailure("");setSuccess("");
  try{
   for(let i=0;i<selected.length;i++){
    const file=selected[i];
    if(!["image/png","image/jpeg","application/pdf"].includes(file.type))throw new Error("FILE_TYPE_UNSUPPORTED");
    if(file.size>2097152||file.size===0)throw new Error("FILE_TOO_LARGE");
    setProgress((i+1)+" / "+selected.length);
    await call(base+"/files","POST",{title:title.trim()||file.name,fileName:file.name,
     kind:fileKind,notes,mime:file.type,encounterId:linked,
     contentBase64:await fileBase64(file)});
   }
   setSelected([]);setTitle("");setNotes("");setSuccess(t("uploadDone"));refresh();
  }catch(e:any){setFailure(t("uploadFailed")+" "+e.message);}finally{setBusy(false);setProgress("");}
 }
 async function openFile(file:any){
  setFailure("");
  try{
   const r=await fetch(API+"/v1/clinical"+base+"/files/"+file.id+"/content",{
    credentials:"include",cache:"no-store"});
   if(!r.ok){const p=await r.json().catch(()=>({}));throw Error(p.code||"FILE_UNAVAILABLE");}
   const blob=await r.blob(),url=URL.createObjectURL(blob);
   if(file.mime==="application/pdf"){
    const a=document.createElement("a");a.href=url;a.download=file.file_name||"clinical-file.pdf";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   }else{if(preview)URL.revokeObjectURL(preview);setPreview(url);}
  }catch(e:any){setFailure(e.message);}
 }
 const kinds=["all","xray","photo","consent","other"];
 return <div className="phase07-grid">
  <section className="card phase07-panel">
   <div className="phase07-section"><div><h2>{t("patientFiles")}</h2>
    <p className="muted">{data?.patient?patientName(data.patient):t("storage")}</p></div>
    <select aria-label={t("fileFilter")} value={kind} onChange={e=>setKind(e.target.value)}>
     {kinds.map(k=><option key={k} value={k}>{t(k)}</option>)}</select></div>
   {error?<ErrorBox error={error} retry={refresh}/>:!data?<Loading/>:
    !data.files.length?<p className="phase07-empty">{t("noFiles")}</p>:
    <div className="phase07-rows">{data.files.map((f:any)=><article className="phase07-visit-row" key={f.id}>
     <div className="phase07-fileicon">{f.mime==="application/pdf"?"PDF":"▧"}</div>
     <div className="phase07-row-main"><h3>{f.title}</h3><p className="phase07-meta">
      {t(f.kind)} · {f.file_name} · {Math.ceil(f.size_bytes/1024)} KB · {fmt(f.created_at)}
      </p><p className="phase07-meta">{f.uploaded_by_name}</p></div>
     <button className="btn btn-secondary" type="button" onClick={()=>openFile(f)}>
      {t(f.mime==="application/pdf"?"download":"preview")} →</button></article>)}</div>}
   {preview&&<div className="phase07-preview" role="dialog" aria-modal="true" aria-label={t("preview")}>
    <button className="btn btn-secondary" onClick={()=>{URL.revokeObjectURL(preview);setPreview(null);}}>
     {t("close")} ✕</button>
    <img src={preview} alt={t("preview")}/></div>}
  </section>
  <aside className="card phase07-panel phase07-sidebar">
   <h2>{t("upload")}</h2><p className="muted">{t("size")}</p>
   <form onSubmit={upload} className="phase07-form">
    <label className="field"><span>{t("file")} *</span>
     <input type="file" accept="image/jpeg,image/png,application/pdf" multiple
      onChange={e=>setSelected(Array.from(e.target.files||[]))} disabled={busy}/></label>
    <label className="field"><span>{t("title")}</span>
     <input value={title} maxLength={150} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
    <label className="field"><span>{t("type")} *</span>
     <select value={fileKind} onChange={e=>setFileKind(e.target.value)} disabled={busy}>
      {kinds.filter(x=>x!=="all").map(k=><option value={k} key={k}>{t(k)}</option>)}</select></label>
    <label className="field"><span>{t("notes")}</span>
     <textarea value={notes} rows={3} maxLength={500} onChange={e=>setNotes(e.target.value)}
      disabled={busy}/></label>
    {linked&&<Banner>{t("chooseAppointment")}: <bdi dir="ltr">{linked.slice(0,8)}</bdi></Banner>}
    <button className="btn btn-primary" disabled={busy||!selected.length} type="submit">
     {busy?t("busy")+" "+progress:t("upload")}</button>
    {failure&&<Banner kind="error">{failure}</Banner>}
    {success&&<Banner kind="success">{success}</Banner>}
    <Banner kind="warning">{t("protected")}. {t("storage")}</Banner>
   </form>
  </aside>
 </div>;
}
