"use client";
import React,{useEffect,useMemo,useState,type FormEvent} from "react";
import {usePreferences,InlineAlert,CareIcon} from "./index";
import {ClinicOpsBridge} from "./clinic-ops-bridge";
import {clinicReportPeriodIssue,clinicReportPreset,clinicReportCompletion,clinicReportBars,
 clinicOpsHref,type ReportPeriod,type ReportPreset} from "./clinic-ops-bridge-model";
import {clinicCsvRows} from "./clinic-finance-model";
import {clinicValidReportPayload,clinicSafeApiCode} from "./clinic-ops-integrity";
import {useClinicFeedback,ClinicLoadingState} from "./clinic-feedback";
import {Shell} from "./phase03";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
export type Lang="en"|"fa-AF"|"ps-AF";
export const phrases:Record<Lang,Record<string,string>>={
 en:{
  reports:"Clinic reports",appointments:"Appointments",patients:"Patients",revenue:"Revenue",help:"Help & support",
  support:"Support tickets",analytics:"Analytics",security:"Security",settings:"Settings",
  from:"From",to:"To",apply:"Apply range",export:"Export summary CSV",refresh:"Refresh",loading:"Loading current data…",
  noData:"No records for this period.",error:"Unable to load. Please try again.",denied:"You do not have access to this workspace.",
  login:"Sign in",newPatients:"New patient registrations",activePatients:"Active patient records",
  appointmentTotal:"Scheduled appointments",completed:"Completed",cancelled:"Cancelled",no_show:"No-show",
  confirmed:"Confirmed",arrived:"Arrived",in_treatment:"In treatment",day:"Day",count:"Count",
  netReceipts:"Net receipts",issuedInvoices:"Invoices issued",invoiceFace:"Issued invoice total",
  expenses:"Posted expenses",cash:"Cash",bank_transfer:"Bank transfer",other_manual:"Other manual",
  receiptsHint:"Manual net ledger payments minus posted reversals. Credits excluded. Not certified profit.",
  bookingHint:"Appointments are counted by their scheduled date in Asia/Kabul, including cancellations.",
  faq:"Frequently asked questions",privacy:"Do not include names, phone numbers, diagnoses, medical records or private clinical details in any ticket.",
  createTicket:"Create a support ticket",selectClinic:"Clinic (optional)",generalSupport:"General request",category:"Category",title:"Brief title",message:"Message",send:"Submit request",
  myTickets:"My requests",conversation:"Conversation",reply:"Send reply",status:"Status",
  emptyTickets:"You have not opened a support request.",openTicket:"View conversation",
  ticketSaved:"Support request sent.",sendSuccess:"Reply sent.",supportNeedsLogin:"Sign in with a verified account to send a ticket or view replies.",
  selectTicket:"Select a ticket to view its conversation.",needsClinic:"Choose an active clinic workspace.",
  restricted:"Only owners, managers and finance cashiers may view these reports.",
  clinicSummary:"Accurate, tenant-restricted activity for your selected period.",
  platformOverview:"Platform overview",suppressed:"1–4 hidden for privacy",openSupport:"View support requests",
  period:"Reporting period",receiptMethod:"Collection method",afn:"AFN",all:"All",save:"Save",submit:"Submit",
  noSubject:"No patient names, medical details or payment references are exported.",
  close:"Close",back:"Back",requestHelp:"Request help",technical:"Technical problem"
 },
 "fa-AF":{
  reports:"گزارش‌های کلینیک",appointments:"ملاقات‌ها",patients:"مریضان",revenue:"عواید",help:"راهنما و پشتیبانی",
  support:"درخواست‌های پشتیبانی",analytics:"تحلیل‌ها",security:"امنیت",settings:"تنظیمات",
  from:"از تاریخ",to:"تا تاریخ",apply:"اجرای دوره",export:"دریافت خلاصه CSV",refresh:"تازه‌سازی",loading:"در حال بارگیری داده‌ها…",
  noData:"در این دوره رکوردی موجود نیست.",error:"بارگیری ناموفق بود. دوباره تلاش کنید.",denied:"به این بخش دسترسی ندارید.",
  login:"ورود",newPatients:"مریضان جدید",activePatients:"مریضان فعال",
  appointmentTotal:"مجموع ملاقات‌ها",completed:"تکمیل",cancelled:"لغوشده",no_show:"عدم حضور",
  confirmed:"تأییدشده",arrived:"حاضر",in_treatment:"در تداوی",day:"روز",count:"تعداد",
  netReceipts:"دریافت خالص",issuedInvoices:"فاکتورهای صادرشده",invoiceFace:"مجموع فاکتورها",
  expenses:"مصارف ثبت‌شده",cash:"نقد",bank_transfer:"حواله بانکی",other_manual:"سایر پرداخت دستی",
  receiptsHint:"دریافت‌های خالص دفتر پرداخت پس از کسر برگشت؛ اعتبار نقد نیست. این سود حسابداری نیست.",
  bookingHint:"ملاقات‌ها بر اساس تاریخ برنامه‌ریزی‌شده در کابل شمرده می‌شوند؛ لغوشده‌ها نیز شامل اند.",
  faq:"پرسش‌های متداول",privacy:"نام، شماره، تشخیص، اسناد صحی یا جزئیات خصوصی مریض را در درخواست نفرستید.",
  createTicket:"درخواست پشتیبانی جدید",selectClinic:"کلینیک (اختیاری)",generalSupport:"درخواست عمومی",category:"دسته",title:"عنوان مختصر",message:"پیام",send:"ارسال درخواست",
  myTickets:"درخواست‌های من",conversation:"گفتگو",reply:"ارسال پاسخ",status:"حالت",
  emptyTickets:"هنوز درخواست پشتیبانی ندارید.",openTicket:"دیدن گفتگو",
  ticketSaved:"درخواست ثبت شد.",sendSuccess:"پاسخ فرستاده شد.",supportNeedsLogin:"برای درخواست و دیدن پاسخ‌ها به حساب تأییدشده وارد شوید.",
  selectTicket:"برای دیدن گفتگو یک درخواست انتخاب کنید.",needsClinic:"یک کلینیک فعال انتخاب کنید.",
  restricted:"تنها صاحب کلینیک، مدیر و صراف به این گزارش‌ها دسترسی دارند.",
  clinicSummary:"فعالیت دقیق و محدود به کلینیک در دوره انتخابی.",
  platformOverview:"وضعیت پلتفرم",suppressed:"شمارش ۱ تا ۴ برای محرمیت مخفی است",openSupport:"دیدن درخواست‌ها",
  period:"دوره گزارش",receiptMethod:"روش دریافت",afn:"افغانی",all:"همه",save:"ذخیره",submit:"ثبت",
  noSubject:"نام مریض، جزئیات صحی و مراجع پرداخت در خروجی نیست.",
  close:"بستن",back:"بازگشت",requestHelp:"درخواست کمک",technical:"مشکل تخنیکی"
 },
 "ps-AF":{
  reports:"د کلینیک راپورونه",appointments:"لیدنې",patients:"ناروغان",revenue:"عواید",help:"مرسته او ملاتړ",
  support:"د ملاتړ غوښتنې",analytics:"شننې",security:"امنیت",settings:"تنظیمات",
  from:"له نېټې",to:"تر نېټې",apply:"موده وټاکئ",export:"CSV لنډیز ښکته کړئ",refresh:"بیا تازه",loading:"معلومات بارېږي…",
  noData:"په دې موده کې ریکارډ نشته.",error:"معلومات نشي بارېدای. بیا هڅه وکړئ.",denied:"دې برخې ته اجازه نه لرئ.",
  login:"ننوتل",newPatients:"نوي ناروغان",activePatients:"فعال ناروغان",
  appointmentTotal:"ټولې لیدنې",completed:"بشپړ",cancelled:"لغوه شوي",no_show:"نه حاضر",
  confirmed:"تایید شوي",arrived:"راغلي",in_treatment:"د درملنې لاندې",day:"ورځ",count:"شمېر",
  netReceipts:"خالص ترلاسه شوې پیسې",issuedInvoices:"صادر شوي بلونه",invoiceFace:"د بلونو ټول مقدار",
  expenses:"ثبت شوي لګښتونه",cash:"نغدې",bank_transfer:"بانکي لېږد",other_manual:"نورې لاسي تادیې",
  receiptsHint:"له لاسي تادیاتو څخه د بېرته ګرځولو وروسته خالص پیسې؛ کریډیټ نه شمېرل کېږي. دا ګټه نه ده.",
  bookingHint:"لیدنې د کابل د مهال‌وېش نېټې پر بنسټ شمېرل کېږي، لغوه شوې هم پکې دي.",
  faq:"عامې پوښتنې",privacy:"نوم، تلیفون، تشخیص او طبي اسناد د ملاتړ په غوښتنه کې مه لیکئ.",
  createTicket:"د ملاتړ نوې غوښتنه",selectClinic:"کلینیک (اختیاري)",generalSupport:"عمومي غوښتنه",category:"ډول",title:"لنډ سرلیک",message:"پیغام",send:"غوښتنه ولېږئ",
  myTickets:"زما غوښتنې",conversation:"خبرې",reply:"ځواب ولېږئ",status:"حالت",
  emptyTickets:"تاسو تر اوسه غوښتنه نه ده ثبت کړې.",openTicket:"خبرې وګورئ",
  ticketSaved:"غوښتنه ثبت شوه.",sendSuccess:"ځواب ولېږل شو.",supportNeedsLogin:"د غوښتنې او ځوابونو لپاره تایید شوي حساب ته ننوځئ.",
  selectTicket:"د خبرو لپاره یوه غوښتنه وټاکئ.",needsClinic:"فعال کلینیک وټاکئ.",
  restricted:"یوازې خاوند، مدیر او مالي کارکوونکی دا راپورونه لیدلای شي.",
  clinicSummary:"د ټاکلې مودې د کلینیک دقیق او خوندي معلومات.",
  platformOverview:"د پلاتفورم حالت",suppressed:"د محرمیت لپاره د ۱ تر ۴ شمېرې پټې دي",openSupport:"د ملاتړ غوښتنې وګورئ",
  period:"د راپور موده",receiptMethod:"د ترلاسه کولو طریقه",afn:"افغانۍ",all:"ټول",save:"خوندي",submit:"ثبت",
  noSubject:"د ناروغانو نومونه، طبي معلومات او د تادیو مراجع په صادرېدو کې نشته.",
  close:"بند",back:"شاته",requestHelp:"مرسته وغواړئ",technical:"تخنیکي ستونزه"
 }
};
export function useWords(){
 const {locale}=usePreferences();const lang=locale in phrases?locale as Lang:"en";
 return {lang,t:(key:string)=>phrases[lang][key]||phrases.en[key]||key};
}
export async function call18<T=any>(path:string,method="GET",body?:unknown,signal?:AbortSignal):Promise<T>{
 const r=await fetch(API+"/v1"+path,{
  method,credentials:"include",cache:"no-store",signal,
  headers:body===undefined?{}:{"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(clinicSafeApiCode(data?.code));
 return data as T;
}
export function Stat({label,value,caption}:{label:string;value:string|number|null|undefined;caption?:string}){
 return <div className="p18-stat"><span>{label}</span><strong>{value==null?"—":value}</strong>
  {caption&&<small>{caption}</small>}</div>;
}
export function ChipTabs<T extends string>({items,active,set}:{items:{id:T;label:string}[];active:T;set:(v:T)=>void}){
 return <div role="tablist" className="p18-tabs">{items.map(item=><button key={item.id} role="tab" type="button"
  aria-selected={active===item.id} onClick={()=>set(item.id)}>{item.label}</button>)}</div>;
}
export function Notice({error,success}:{error:string;success?:string}){
 return <>{error&&<InlineAlert kind="error">{error}</InlineAlert>}
  {success&&<InlineAlert kind="success">{success}</InlineAlert>}</>;
}
export function localDay(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"})
  .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
export function num(v:unknown){return new Intl.NumberFormat("en").format(Number(v)||0);}
function downloadCsv(name:string,rows:(string|number)[][]){
 const csv=clinicCsvRows(rows);
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
type Space={clinicId:string;clinicName:string;membershipId:string;
 role:"owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
 clinicianEnabled:boolean;clinicStatus:string;capabilities:string[]};
type Context={name:string;email:string;clinics:Space[];mfaEnabled:boolean};
type Report={clinicId:string;from:string;to:string;timezone:string;basis:string;
 appointments:{total:number;byStatus:Record<string,number>;byDay:{day:string;count:number}[]};
 patients:{newRegistered:number;activeTotal:number};
 revenue:{netReceiptsAfn:number;byMethodAfn:Record<string,number>;issuedInvoices:number;
 issuedFaceValueAfn:number;postedExpensesAfn:number}};
const clinicReportUi={
 en:{
  eyebrow:"CLINIC PERFORMANCE",heading:"Operations & financial insights",
  sub:"Real, clinic-scoped appointments, patient records and manually recorded finances for the selected period.",
  preset:"Quick ranges",week:"Last 7 days",month:"This month",
  previousMonth:"Last month",thirtyDays:"Last 30 days",
  apply:"Apply dates",valid:"Ready to apply",outOfSync:"Dates have changed. Apply to refresh the report.",
  dateError:"Enter two valid Gregorian dates, in chronological order, no more than 366 days apart.",
  display:"Report snapshot",summary:"Verified against the clinic API",
  range:"Applied period",tz:"Reporting timezone: Asia/Kabul",
  basis:"Scheduled appointment date; payments by ledger occurrence, excluding credits.",
  clinical:"Clinical records are not included in reports or exports.",
  chart:"Appointment volume by day",chartHelp:"Open a day in the staff calendar to review authorized bookings.",
  chartNone:"No appointments were scheduled in this range.",
  completion:"Completed as a share of all scheduled appointments",
  exportHint:"Export contains aggregate metrics only. It does not include patient names, notes or payment references.",
  appointmentsHint:"Appointment statuses include cancellations and no-shows. The selected period is based on scheduled time, not creation time.",
  receiptsHint:"Amounts reflect manually posted payments minus reversals. Credits are not cash receipts. This is not bank-verified profit.",
  expensesHint:"Posted expenses and issued invoice totals are not a verified profit-and-loss statement.",
  old:"Requesting report data",done:"Up to date",reportError:"Could not load this clinic's report.",
  quickCalendar:"Open calendar",quickFinance:"Open finance",notVerified:"Manual reporting • AFN",
  trend:"Daily appointments",safe:"Private aggregate report — no patient identifiers",
  statusHint:"Counts are returned by the server; no demonstration or estimated data is shown.",
  periodToday:"Report dates use Gregorian input and Afghanistan time."
 },
 "fa-AF":{
  eyebrow:"کارکرد کلینیک",heading:"تحلیل عملیات و مالی",
  sub:"ملاقات‌ها، ریکارډهای مریضان و معلومات مالی دستی و واقعی کلینیک در دورۀ انتخاب‌شده.",
  preset:"دوره‌های سریع",week:"۷ روز اخیر",month:"ماه جاری",
  previousMonth:"ماه گذشته",thirtyDays:"۳۰ روز اخیر",
  apply:"اجرای تاریخ‌ها",valid:"آماده اجرا",outOfSync:"تاریخ تغییر کرده؛ برای گزارش تازه اجرا کنید.",
  dateError:"دو تاریخ معتبر میلادی به ترتیب و با فاصلۀ حداکثر ۳۶۶ روز انتخاب کنید.",
  display:"گزارش فعلی",summary:"معلومات از سرور کلینیک دریافت شده",
  range:"دورۀ اجراشده",tz:"منطقۀ زمانی گزارش: کابل",
  basis:"تاریخ برنامه‌ریزی ملاقات؛ پرداخت بر اساس زمان ثبت دفتر، بدون اعتبار.",
  clinical:"اسناد صحی در گزارش یا فایل خروجی نیست.",
  chart:"شمار ملاقات‌ها در هر روز",chartHelp:"برای دیدن نوبت‌های مجاز، روز را در تقویم کارمندان باز کنید.",
  chartNone:"در این دوره ملاقات برنامه‌ریزی‌شده وجود ندارد.",
  completion:"نسبت ملاقات‌های تکمیل‌شده به تمام وقت‌ها",
  exportHint:"فایل خروجی فقط آمار کلی دارد؛ نام مریض، یادداشت یا مرجع پرداخت ندارد.",
  appointmentsHint:"شمار ملاقات‌ها شامل لغو و عدم حضور است؛ تاریخ بر اساس وقت برنامه‌ریزی‌شده است.",
  receiptsHint:"مبالغ پرداخت دستی پس از کسر برگشت‌ها، بدون اعتبار؛ این سود تأییدشده بانک نیست.",
  expensesHint:"مصارف و فاکتورهای صادرشده به معنی صورت‌حساب سود و زیان تأییدشده نیست.",
  old:"دریافت معلومات گزارش",done:"به‌روز",reportError:"گزارش کلینیک دریافت نشد.",
  quickCalendar:"باز کردن تقویم",quickFinance:"باز کردن مالی",notVerified:"گزارش دستی • افغانی",
  trend:"ملاقات‌های روزانه",safe:"گزارش کلی خصوصی، بدون شناسه مریض",
  statusHint:"تمام آمار از سرور دریافت می‌شود؛ ارقام آزمایشی نمایش داده نمی‌شوند.",
  periodToday:"تاریخ ورودی میلادی و زمان گزارش کابل است."
 },
 "ps-AF":{
  eyebrow:"د کلینیک فعالیت",heading:"عملي او مالي شننې",
  sub:"د ټاکلې مودې رښتینې لیدنې، د ناروغانو شمېر او لاسي مالي ریکارډونه.",
  preset:"چټکې مودې",week:"وروستۍ ۷ ورځې",month:"روانه میاشت",
  previousMonth:"تېره میاشت",thirtyDays:"وروستۍ ۳۰ ورځې",
  apply:"نېټې پلي کړئ",valid:"پلي کېدو ته چمتو",outOfSync:"نېټې بدلې شوې؛ راپور بیا پلي کړئ.",
  dateError:"دوه سمې میلادي نېټې د ۳۶۶ ورځو په واټن او سم ترتیب وټاکئ.",
  display:"اوسنی راپور",summary:"معلومات د کلینیک له سرور څخه دي",
  range:"ټاکل شوې موده",tz:"د راپور وخت: کابل",
  basis:"د لیدنې ټاکلې نېټه او د حساب د تادیې وخت، بې له کریډیټه.",
  clinical:"طبي اسناد په راپور یا CSV کې نشته.",
  chart:"ورځنۍ لیدنې",chartHelp:"د مجاز لیدنو لپاره یوه ورځ د کارکوونکو په مهالوېش کې پرانیزئ.",
  chartNone:"په دې موده کې ټاکل شوې لیدنې نشته.",
  completion:"د بشپړو لیدنو برخه له ټولو مهالوېش شوو لیدنو",
  exportHint:"CSV یوازې ګډ شمېرې لري؛ د ناروغ نومونه، یادښتونه یا تادیې مراجع پکې نشته.",
  appointmentsHint:"لغوه او نه حاضر لیدنې هم شمېرل کېږي؛ د ملاقات ټاکلې ورځ اساس ده.",
  receiptsHint:"لاسي تادیې د بېرته ګرځولو وروسته، بې له کریډیټه؛ بانکي تایید شوې ګټه نه ده.",
  expensesHint:"ثبت شوي لګښتونه او صادر شوي بیلونه تایید شوی ګټه-زیان راپور نه دی.",
  old:"د راپور معلومات بارېږي",done:"تازه دی",reportError:"د کلینیک راپور نه پورته کېږي.",
  quickCalendar:"مهالوېش پرانیزئ",quickFinance:"مالي برخه پرانیزئ",notVerified:"لاسي راپور • افغانۍ",
  trend:"ورځنۍ لیدنې",safe:"شخصي ګډ راپور، بې د ناروغ له پېژندنې",
  statusHint:"ټولې شمېرې له سرور څخه دي؛ اټکلي معلومات نه ښودل کېږي.",
  periodToday:"نېټې میلادي او وخت د افغانستان دی."
 }
} as const;

export function ClinicReportsPortal(){
 const {t}=useWords(),{locale}=usePreferences(),{error:feedback}=useClinicFeedback();
 const copy=clinicReportUi[locale as keyof typeof clinicReportUi]||clinicReportUi.en;
 const [ctx,setCtx]=useState<Context|null>(null),[space,setSpace]=useState<Space|null>(null);
 const [contextError,setContextError]=useState(""),[loading,setLoading]=useState(true);
 const initial=localDay();
 const [from,setFrom]=useState(initial.slice(0,7)+"-01"),[to,setTo]=useState(initial);
 const [applied,setApplied]=useState<ReportPeriod>(()=>({
  from:initial.slice(0,7)+"-01",to:initial
 }));
 const [preset,setPreset]=useState<ReportPreset|null>("month");
 const [tab,setTab]=useState<"appointments"|"patients"|"revenue">("appointments");
 const [counter,setCounter]=useState(0);
 const [snapshot,setSnapshot]=useState<{key:string;data:Report|null;error:string;loading:boolean}|null>(null);
 const [contextCounter,setContextCounter]=useState(0);
 const key=space?space.clinicId+"|"+applied.from+"|"+applied.to:"";
 const current=snapshot?.key===key?snapshot:null;
 const data=current?.data??null;
 const busy=current?.loading??Boolean(space),reportError=current?.error||"";
 const draftError=clinicReportPeriodIssue(from,to);
 const datesChanged=from!==applied.from||to!==applied.to;
 useEffect(()=>{
  let live=true;setLoading(true);setContextError("");
  const controller=new AbortController();
  call18<Context>("/team/context","GET",undefined,controller.signal)
   .then(result=>{
    if(!live)return;
    setCtx(result);
    const clinic=new URLSearchParams(location.search).get("clinic");
    setSpace(result.clinics.find(x=>x.clinicId===clinic)||(!clinic?result.clinics[0]:null)||null);
   }).catch(e=>{if(live)setContextError(e instanceof Error?e.message:"NETWORK_ERROR")})
    .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false;controller.abort();};
 },[contextCounter]);
 useEffect(()=>{
  if(!space||!["owner","manager","cashier"].includes(space.role))return;
  const controller=new AbortController();
  const reportKey=space.clinicId+"|"+applied.from+"|"+applied.to;
  setSnapshot({key:reportKey,data:null,error:"",loading:true});
  call18<Report>("/insights/clinics/"+encodeURIComponent(space.clinicId)+"/report?"+
   new URLSearchParams({from:applied.from,to:applied.to}),"GET",undefined,controller.signal)
   .then(result=>{
    if(controller.signal.aborted)return;
    if(!clinicValidReportPayload(result,{
     clinicId:space.clinicId,from:applied.from,to:applied.to
    }))throw Error("REPORT_RESPONSE_INVALID");
    setSnapshot({key:reportKey,data:result,error:"",loading:false});
   }).catch(e=>{if(!controller.signal.aborted)setSnapshot({
    key:reportKey,data:null,error:e instanceof Error?e.message:"REQUEST_FAILED",
    loading:false
   });});
  return()=>{controller.abort();};
 },[space?.clinicId,applied.from,applied.to,counter]);
 function choosePreset(value:ReportPreset){
  const range=clinicReportPreset(value,localDay());
  setFrom(range.from);setTo(range.to);setPreset(value);
 }
 function applyRange(){
  if(draftError)return;
  setApplied({from,to});setCounter(x=>x+1);
 }
 function exportReport(){
  if(!data||busy||datesChanged||data.from!==applied.from||
   data.to!==applied.to||data.clinicId&&data.clinicId!==space?.clinicId)return;
  const rows:(string|number)[][]=[
   ["Metric","Value","Unit"],["From",data.from,"Date"],["To",data.to,"Date"],
   ["Timezone",data.timezone,"IANA"],
   ["Scheduled appointments",data.appointments.total,"count"],
   ...Object.entries(data.appointments.byStatus).map(([name,count])=>
    ["Appointments: "+name,count,"count"] as (string|number)[]),
   ["New patient registrations",data.patients.newRegistered,"count"],
   ["Active patient records",data.patients.activeTotal,"count"],
   ["Net receipts",data.revenue.netReceiptsAfn,"AFN"],
   ...Object.entries(data.revenue.byMethodAfn).map(([name,amount])=>
    ["Net "+name,amount,"AFN"] as (string|number)[]),
   ["Invoices issued",data.revenue.issuedInvoices,"count"],
   ["Issued invoice total",data.revenue.issuedFaceValueAfn,"AFN"],
   ["Posted operational expenses",data.revenue.postedExpensesAfn,"AFN"]
  ];
  downloadCsv("dandanlink-clinic-report-"+data.from+"-"+data.to+".csv",rows);
 }
 if(loading)return <div className="p18-wrap"><InlineAlert>{t("loading")}</InlineAlert></div>;
 if(!ctx||!space)return <div className="p18-wrap">
  <InlineAlert kind="warning">{contextError?feedback(contextError):t("needsClinic")}</InlineAlert>
  {contextError&&<button type="button" className="btn btn-secondary"
   onClick={()=>setContextCounter(x=>x+1)}>{t("refresh")}</button>}
  <a className="btn btn-primary" href="/clinic">{t("back")}</a></div>;
 if(!["owner","manager","cashier"].includes(space.role))
  return <InlineAlert kind="warning">{t("restricted")}</InlineAlert>;
 const bars=data?clinicReportBars(data.appointments.byDay):[];
 const completion=data?clinicReportCompletion(data.appointments.total,
  data.appointments.byStatus.completed||0):null;
 return <Shell ctx={ctx} space={space} active="reports">
  <div className="p18-wrap clinic-phase14-report">
   <header className="p18-hero clinic-phase14-report-hero">
    <span className="p18-kicker"><CareIcon name="chart-columns" size={17}/>
     {copy.eyebrow}</span>
    <h1>{copy.heading}</h1><p>{space.clinicName} · {copy.sub}</p>
    <div className="clinic-phase14-report-hero-trust">
     <CareIcon name="shield-check" size={17}/>{copy.safe}</div>
   </header>
   <ClinicOpsBridge clinicId={space.clinicId} role={space.role} active="reports"/>
   <section className="card clinic-phase14-report-controls" aria-label={t("period")}>
    <div className="clinic-phase14-report-controls-head">
     <div><h2>{t("period")}</h2><p>{copy.periodToday}</p></div>
     <span className="clinic-phase14-timezone"><CareIcon name="clock" size={16}/>
      {copy.tz}</span>
    </div>
    <div className="clinic-phase14-presets" role="group" aria-label={copy.preset}>
     {(["week","month","previousMonth","thirtyDays"] as const).map(value=>
      <button key={value} className="clinic-phase14-preset" type="button"
       aria-pressed={preset===value} onClick={()=>choosePreset(value)}>
       <CareIcon name="calendar" size={15}/>{copy[value]}</button>)}
    </div>
    <div className="p18-toolbar clinic-phase14-report-toolbar">
     <label>{t("from")}<input aria-label={t("from")} type="date" max={to}
      value={from} onChange={e=>{setFrom(e.target.value);setPreset(null);}}/></label>
     <label>{t("to")}<input aria-label={t("to")} type="date" min={from}
      value={to} onChange={e=>{setTo(e.target.value);setPreset(null);}}/></label>
     <button type="button" className="btn btn-primary" disabled={Boolean(draftError)||busy}
      onClick={applyRange}><CareIcon name="check" size={17}/>{copy.apply}</button>
     <button type="button" className="btn btn-secondary" disabled={busy}
      onClick={()=>setCounter(x=>x+1)}><CareIcon name="activity" size={17}/>
      {t("refresh")}</button>
     <button type="button" className="btn btn-secondary"
      disabled={!data||busy||datesChanged||Boolean(draftError)}
      onClick={exportReport}><CareIcon name="download" size={17}/>{t("export")}</button>
    </div>
    {draftError?<InlineAlert kind="warning">{copy.dateError}</InlineAlert>:
     datesChanged?<InlineAlert kind="info">{copy.outOfSync}</InlineAlert>:null}
    <p className="clinic-phase14-report-export-note"><CareIcon name="shield-check" size={16}/>
     {copy.exportHint}</p>
   </section>
   <div className="clinic-phase14-report-status" role="status" aria-live="polite">
    <div><strong>{copy.display}</strong><span>
     {t("from")}: <bdi dir="ltr">{applied.from}</bdi> — {t("to")}: <bdi dir="ltr">{applied.to}</bdi>
    </span></div>
    <span className={"clinic-phase14-report-indicator"+(busy?" is-loading":"")}>
     <CareIcon name={busy?"clock":"shield-check"} size={16}/>
     {busy?copy.old:reportError?copy.reportError:copy.done}</span>
   </div>
   <Notice error={reportError?feedback(reportError):contextError?feedback(contextError):""}/>
   {busy&&!data?<ClinicLoadingState label={t("loading")} variant="cards"/>:null}
   {!busy&&reportError&&<button type="button" className="btn btn-secondary"
    onClick={()=>setCounter(x=>x+1)}>{t("refresh")}</button>}
   {data&&!busy&&<>
    <ChipTabs items={(["appointments","patients","revenue"] as const).map(id=>({id,label:t(id)}))}
     active={tab} set={setTab}/>
    <section className="p18-panel clinic-phase14-report-panel">
     {tab==="appointments"&&<>
      <div className="p18-stats clinic-phase14-report-stats">
       <Stat label={t("appointmentTotal")} value={num(data.appointments.total)}/>
       {(["completed","cancelled","no_show"] as const).map(id=>
        <Stat key={id} label={t(id)} value={num(data.appointments.byStatus[id]||0)}/>)}
      </div>
      <div className="clinic-phase14-report-completion">
       <div><strong>{copy.completion}</strong>
        <p>{copy.appointmentsHint}</p></div>
       <span>{completion===null?"—":completion+"%"}</span>
      </div>
      <div className="p18-split clinic-phase14-report-split">
       <div><h2>{t("status")}</h2><div className="p18-table">
        {Object.entries(data.appointments.byStatus).map(([status,count])=>
         <div className="p18-table-row" key={status}>
          <span>{t(status)}</span><strong>{num(count)}</strong></div>)}</div></div>
       <div><h2>{copy.chart}</h2>
        <p className="clinic-phase14-chart-help">{copy.chartHelp}</p>
        <div className="clinic-phase14-daily-chart">
         {bars.length?bars.map(item=>
          <a key={item.day} className="clinic-phase14-bar-row"
           href={clinicOpsHref("appointments",space.clinicId,item.day)}
           aria-label={item.day+" · "+item.count+" "+t("appointments")}>
           <time dateTime={item.day} dir="ltr">{item.day}</time>
           <span className="clinic-phase14-bar-track">
            <span style={{width:item.width+"%"}} className="clinic-phase14-bar-fill"/></span>
           <strong>{num(item.count)}</strong></a>):
          <p className="muted">{copy.chartNone}</p>}
        </div></div>
      </div>
      <p className="p18-footnote"><CareIcon name="about" size={16}/>
       {copy.appointmentsHint}</p>
     </>}
     {tab==="patients"&&<>
      <div className="p18-stats clinic-phase14-report-stats">
       <Stat label={t("newPatients")} value={num(data.patients.newRegistered)}/>
       <Stat label={t("activePatients")} value={num(data.patients.activeTotal)}/>
      </div>
      <p className="p18-footnote"><CareIcon name="shield-check" size={16}/>
       {copy.clinical} {t("noSubject")}</p>
     </>}
     {tab==="revenue"&&<>
      <div className="p18-stats clinic-phase14-report-stats">
       <Stat label={t("netReceipts")} value={num(data.revenue.netReceiptsAfn)} caption={t("afn")}/>
       <Stat label={t("issuedInvoices")} value={num(data.revenue.issuedInvoices)}/>
       <Stat label={t("invoiceFace")} value={num(data.revenue.issuedFaceValueAfn)} caption={t("afn")}/>
       <Stat label={t("expenses")} value={num(data.revenue.postedExpensesAfn)} caption={t("afn")}/>
      </div>
      <h2>{t("receiptMethod")}</h2><div className="p18-table">
       {Object.entries(data.revenue.byMethodAfn).map(([method,value])=>
        <div className="p18-table-row" key={method}>
         <span>{t(method)}</span><strong>{num(value)} {t("afn")}</strong></div>)}</div>
      <p className="p18-footnote"><CareIcon name="shield-check" size={16}/>
       {copy.receiptsHint} {copy.expensesHint}</p>
     </>}
     <div className="clinic-phase14-report-bottom">
      <span><CareIcon name="activity" size={16}/>{copy.summary}
       {" · "}{data.timezone} · {data.from} — {data.to}</span>
      <a className="btn btn-secondary" href={clinicOpsHref(tab==="revenue"?"finance":"appointments",space.clinicId)}>
       <CareIcon name="arrow" size={17}/>
       {tab==="revenue"?copy.quickFinance:copy.quickCalendar}</a>
     </div>
    </section>
   </>}
  </div>
 </Shell>;
}
type Faq={key:string;en:string;fa:string;ps:string;answerEn:string;answerFa:string;answerPs:string};
type Category={code:string;label_en:string;label_fa:string;label_ps:string};
type Ticket={id:string;reference:string;title:string;category_code:string;status:string;created_at:string;updated_at:string};
type Message={id:string;author_role:string;body:string;created_at:string};
export function HelpPortal({audience="patient"}:{audience?:"patient"|"clinic"}){
 const {t,lang}=useWords();const [faq,setFaq]=useState<Faq[]>([]),[categories,setCategories]=useState<Category[]>([]);
 const [auth,setAuth]=useState(false),[tickets,setTickets]=useState<Ticket[]>([]);
 const [selected,setSelected]=useState(""),[detail,setDetail]=useState<{ticket:Ticket;messages:Message[]}|null>(null);
 const [category,setCategory]=useState(""),[title,setTitle]=useState(""),[message,setMessage]=useState("");
 const [clinicChoices,setClinicChoices]=useState<{clinicId:string;clinicName:string}[]>([]),[clinicId,setClinicId]=useState("");
 const [reply,setReply]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{let live=true;call18<{faq:Faq[];categories:Category[]}>("/support/public/help")
  .then(d=>{if(live){setFaq(d.faq);setCategories(d.categories);setCategory(old=>old||d.categories[0]?.code||"")}})
  .catch(e=>{if(live)setError(e.message)});return()=>{live=false};},[]);
 useEffect(()=>{let live=true;
  call18("/support/me").then(()=>{if(live)setAuth(true)})
   .catch(()=>{if(live)setAuth(false)});
  return()=>{live=false};
 },[reload]);
 useEffect(()=>{if(!auth||audience!=="clinic")return;let live=true;
  call18<{clinics:{clinicId:string;clinicName:string}[]}>("/team/context")
   .then(x=>{if(live){setClinicChoices(x.clinics);
    const param=new URLSearchParams(location.search).get("clinic");
    setClinicId(x.clinics.find(c=>c.clinicId===param)?.clinicId||x.clinics[0]?.clinicId||"");
   }}).catch(()=>{if(live)setClinicChoices([])});
  return()=>{live=false};
 },[auth,audience]);
 useEffect(()=>{if(!auth)return;let live=true;call18<{tickets:Ticket[]}>("/support/tickets/mine")
  .then(d=>{if(live)setTickets(d.tickets)}).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false};
 },[auth,reload]);
 useEffect(()=>{if(!selected)return;let live=true;
  call18<{ticket:Ticket;messages:Message[]}>("/support/tickets/"+selected)
   .then(d=>{if(live)setDetail(d)}).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false};
 },[selected,reload]);
 async function create(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{const d=await call18<{id:string}>("/support/tickets","POST",{category,title,message,...(audience==="clinic"&&clinicId?{clinicId}:{})});
   setTitle("");setMessage("");setSelected(d.id);setSuccess(t("ticketSaved"));setReload(x=>x+1)}
  catch(e){setError(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function respond(e:FormEvent){
  e.preventDefault();if(!selected)return;setBusy(true);setError("");
  try{await call18("/support/tickets/"+selected+"/messages","POST",{message:reply});
   setReply("");setSuccess(t("sendSuccess"));setReload(x=>x+1)}
  catch(e){setError(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 const label=(c:Category)=>lang==="fa-AF"?c.label_fa:lang==="ps-AF"?c.label_ps:c.label_en;
 return <div className="p18-wrap p18-help"><header className="p18-hero">
  <span className="p18-kicker">DANDANLINK · CARE SUPPORT</span>
  <h1>{t("help")}</h1><p>{t("privacy")}</p></header>
  <Notice error={error} success={success}/>
  <section className="p18-panel"><h2>{t("faq")}</h2>
   <div className="p18-faq">{faq.map(f=><details key={f.key}>
    <summary>{lang==="fa-AF"?f.fa:lang==="ps-AF"?f.ps:f.en}</summary>
    <p>{lang==="fa-AF"?f.answerFa:lang==="ps-AF"?f.answerPs:f.answerEn}</p>
   </details>)}</div></section>
  {!auth?<section className="p18-panel"><h2>{t("createTicket")}</h2>
   <p>{t("supportNeedsLogin")}</p><a className="btn btn-primary" href={audience==="clinic"?"/clinic/login":"/login?next=/help"}>{t("login")}</a></section>:
  <div className="p18-split">
   <section className="p18-panel"><h2>{t("createTicket")}</h2>
    <form className="p18-form" onSubmit={create}>
     {audience==="clinic"&&clinicChoices.length>0&&<label>{t("selectClinic")}<select value={clinicId} onChange={e=>setClinicId(e.target.value)}>
       <option value="">{t("generalSupport")}</option>
       {clinicChoices.map(x=><option key={x.clinicId} value={x.clinicId}>{x.clinicName}</option>)}
      </select></label>}
     <label>{t("category")}<select value={category} required onChange={e=>setCategory(e.target.value)}>
      {categories.map(c=><option key={c.code} value={c.code}>{label(c)}</option>)}</select></label>
     <label>{t("title")}<input minLength={5} maxLength={120} required value={title} onChange={e=>setTitle(e.target.value)}/></label>
     <label>{t("message")}<textarea minLength={10} maxLength={2000} rows={4} required value={message} onChange={e=>setMessage(e.target.value)}/></label>
     <p className="p18-footnote">{t("privacy")}</p>
     <button className="btn btn-primary" disabled={busy||!category}>{t("send")}</button>
    </form>
   </section>
   <section className="p18-panel"><h2>{t("myTickets")}</h2>
    {!tickets.length?<p className="muted">{t("emptyTickets")}</p>:tickets.map(item=>
     <button key={item.id} className={"p18-ticket-option"+(selected===item.id?" selected":"")}
      onClick={()=>setSelected(item.id)} type="button"><bdi dir="ltr">{item.reference}</bdi>
      <span>{item.title}</span><small>{item.status}</small></button>)}
    {detail&&<div className="p18-conversation"><h3>{detail.ticket.title}</h3>
      <small>{detail.ticket.status}</small>
      {detail.messages.map(m=><div key={m.id} className={"p18-message "+m.author_role}>
       <small>{m.author_role}</small><p>{m.body}</p></div>)}
      {!["resolved","closed"].includes(detail.ticket.status)&&<form onSubmit={respond} className="p18-form">
       <label>{t("message")}<textarea required minLength={5} maxLength={2000} rows={3}
        value={reply} onChange={e=>setReply(e.target.value)}/></label>
       <button className="btn btn-primary" disabled={busy}>{t("reply")}</button>
      </form>}</div>}
   </section>
  </div>}</div>;
}
