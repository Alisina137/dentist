"use client";
import React,{useState,useEffect,useMemo,useCallback,type FormEvent,type ReactNode} from "react";
import {InlineAlert,usePreferences} from "./index";
import {Shell} from "./phase03";

type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type View="calendar"|"queue"|"new"|"detail";
type Booking={id:string;patientId:string;patient:{id:string;preferredName:string;familyName:string|null;patientNumber:string}|null;
 serviceName:string;priceSnapshotAfn:number;durationMinutes:number;bufferMinutes:number;
 providerMembershipId:string;resourceId:string|null;serviceId:string;startAt:string;endAt:string;
 status:string;source:string;adminNote:string|null;revision:number;checkedInAt:string|null;createdAt:string};
type Service={id:string;name:string;active:boolean;durationMinutes:number;preparationMinutes:number;
 basePriceAfn:number;requiresChair:boolean};
type Resource={id:string;label:string;code:string;kind:string;active:boolean};
type Doctor={membershipId:string;name:string;role:string};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const translations:Record<string,Record<string,string>>={
 en:{
 appointments:"Appointments",calendar:"Calendar",queue:"Today's Queue",newAppointment:"New Appointment",
 dashboard:"Dashboard",today:"Today",day:"Day",week:"Week",month:"Month",date:"Date",
 all:"All",allProviders:"All dentists",allChairs:"All chairs",status:"Status",
 patient:"Patient",service:"Service",dentist:"Dentist",chair:"Treatment chair",source:"Source",
 time:"Time",from:"From",to:"To",notes:"Administrative note (no clinical information)",
 confirmed:"Confirmed",arrived:"Arrived",in_treatment:"In treatment",completed:"Completed",
 cancelled:"Cancelled",no_show:"No-show",staff:"Staff",walk_in:"Walk-in",phone:"Phone",
 checkIn:"Check in",startCare:"Start treatment",complete:"Complete",cancel:"Cancel booking",
 markNoShow:"Mark no-show",reschedule:"Reschedule",save:"Confirm appointment",
 confirmChange:"Confirm change",update:"Update",close:"Close",back:"Back",retry:"Retry",
 loading:"Loading…",empty:"No appointments for this period",emptyQueue:"No appointments in today's queue",
 emptyMessage:"Choose another date or create an appointment using available clinic hours.",
 queueHelp:"Track arrivals and treatment progress for today's patients.",
 queueExpected:"Expected",queueArrived:"Arrived",queueTreatment:"In treatment",queueDone:"Finished",
 quickActions:"Quick actions",agenda:"Agenda",availableSlots:"Available times",chooseSlot:"Choose a time",
 booked:"Booked",available:"Available",unavailable:"Not available",noSlots:"No available times",
 choosePatient:"Find a patient by name, number, or phone",patientSearch:"Search patients",
 noPatient:"No matching clinic patients",newPatient:"Create a patient first",
 chooseService:"Choose a service",chooseDentist:"Choose a dentist",chooseChair:"Choose chair",
 sourceHelp:"Source describes how this internal appointment was arranged.",
 duration:"Duration",price:"Estimated service price",details:"Appointment details",
 timeline:"Activity history",created:"Created",statusUpdated:"Status changed",
 reason:"Reason (at least 10 characters)",confirm:"Confirm",dismiss:"Dismiss",
 conflict:"The slot is no longer available. Choose another time.",
 stale:"This appointment was updated elsewhere. Refresh to continue.",
 saved:"Appointment saved",changed:"Appointment updated",notReady:"Finish clinic services, hours and dentist shifts first.",
 privacy:"Private clinic appointment. No public online booking or clinical encounter yet.",
 viewPatient:"Open patient",localTime:"Afghanistan time (Asia/Kabul)",
 dayAppointments:"Appointments",count:"Appointments",filters:"Filters",clear:"Clear filters",
 todaySummary:"Today's appointments",waiting:"Waiting",inCare:"In treatment",done:"Completed",
 upcoming:"Upcoming",days:"Days",monthSummary:"Select a date to open its daily appointments.",
 browse:"Browse schedule",appointmentID:"Appointment ID",notAllowed:"You don't have permission for this action.",
 durationBuffer:"Service duration includes the saved preparation buffer.",
 noClinics:"No clinic membership",signIn:"Sign in to clinic management",
 active:"Active",slotPreview:"Only slots verified against current schedules can be booked.",
 duplicate:"A double-click cannot create a duplicate appointment.",
 note:"Note",weekOf:"Week of",goCalendar:"Open calendar",patientRequired:"Select an existing patient.",
 viewDetails:"View details",late:"Past",hold:"No appointment holds",
 changeDate:"Pick another date",manageHours:"Configure working hours",
 providerFilter:"Dentist",chairFilter:"Chair",statusFilter:"Status",
 full:"Fully booked",pending:"Not started",completeAction:"Finish treatment",
 cancelledReason:"Cancellation reason",noShowReason:"No-show reason",
 actionSuccess:"Action completed",minute:"min",appointmentsTitle:"Appointment calendar",
 selectedDay:"Selected day",scheduled:"Scheduled",clinicOnly:"Internal scheduling only",
 select:"Select",next:"Next",previous:"Previous",refresh:"Refresh",notAvailable:"Not yet available",
 bookedCount:"Total",arrival:"Check-in time",treatment:"Treatment",allStatuses:"All statuses",
 mfa:"Your clinic membership determines which actions are available.",
 patientHint:"Choose a clinic-local patient. No global patient records are shared.",
 help:"Select a patient, active service, qualified dentist and free time.",
 error:"Request could not be completed",noProvider:"No active dentist is configured.",
 bookedHeader:"Bookings",openDetails:"Open booking",cancelTitle:"Cancel appointment",
 rescheduleTitle:"Move appointment",statusReason:"Reason required",timeWindow:"Working hours",
 dateFuture:"Choose an upcoming date",needsChair:"This service requires an active treatment chair.",
 noRequests:"Online booking requests become available in a later phase.",
 timeConflict:"Another booking occupies this time, dentist, or chair."
 },
 "fa-AF":{
 appointments:"وقت‌های ملاقات",calendar:"تقویم",queue:"صف امروز",newAppointment:"ثبت وقت جدید",
 dashboard:"داشبورد",today:"امروز",day:"روز",week:"هفته",month:"ماه",date:"تاریخ",
 all:"همه",allProviders:"همه داکتران",allChairs:"همه چوکی‌ها",status:"وضعیت",
 patient:"مریض",service:"خدمت",dentist:"داکتر",chair:"چوکی تداوی",source:"منبع ثبت",
 time:"ساعت",from:"از",to:"تا",notes:"یادداشت اداری (بدون معلومات طبی)",
 confirmed:"تأیید شده",arrived:"رسیده",in_treatment:"زیر تداوی",completed:"تکمیل",
 cancelled:"لغو شده",no_show:"حاضر نشد",staff:"کارمند",walk_in:"مراجعه حضوری",
 phone:"تلفنی",checkIn:"ثبت ورود",startCare:"شروع تداوی",complete:"تکمیل",
 cancel:"لغو وقت",markNoShow:"عدم حضور",reschedule:"تغییر وقت",save:"ثبت وقت",
 confirmChange:"تأیید تغییر",update:"بروزرسانی",close:"بستن",back:"بازگشت",
 retry:"تلاش دوباره",loading:"در حال بارگیری…",empty:"در این دوره وقتی ثبت نشده",
 emptyQueue:"صف امروز خالی است",emptyMessage:"تاریخ دیگری انتخاب کنید یا وقت جدید ثبت کنید.",
 queueHelp:"ورود مریضان و پیشرفت تداوی را دنبال کنید.",
 queueExpected:"در انتظار",queueArrived:"رسیده",queueTreatment:"زیر تداوی",
 queueDone:"پایان یافته",quickActions:"عملیات سریع",agenda:"فهرست",availableSlots:"وقت‌های آزاد",
 chooseSlot:"انتخاب ساعت",booked:"رزرو شده",available:"آزاد",unavailable:"در دسترس نیست",
 noSlots:"وقت آزاد موجود نیست",choosePatient:"نام، شماره مریض یا تماس را جستجو کنید",
 patientSearch:"جستجوی مریض",noPatient:"مریض پیدا نشد",
 newPatient:"ابتدا مریض ثبت کنید",chooseService:"انتخاب خدمت",chooseDentist:"انتخاب داکتر",
 chooseChair:"انتخاب چوکی",sourceHelp:"روش ثبت این وقت داخلی کلینیک.",
 duration:"مدت",price:"قیمت تخمینی خدمت",details:"جزئیات وقت",timeline:"تاریخچه فعالیت",
 created:"ثبت شد",statusUpdated:"وضعیت تغییر کرد",reason:"دلیل (حداقل ۱۰ حرف)",
 confirm:"تأیید",dismiss:"بستن",conflict:"این ساعت دیگر آزاد نیست؛ وقت دیگری انتخاب کنید.",
 stale:"این وقت توسط شخص دیگری تغییر یافته؛ تازه‌سازی کنید.",saved:"وقت ثبت شد",
 changed:"وقت تغییر کرد",notReady:"ابتدا خدمات، ساعات کاری و شیفت داکتر را تنظیم کنید.",
 privacy:"وقت خصوصی کلینیک است؛ رزرو عمومی و معاینه طبی هنوز فعال نیست.",
 viewPatient:"مشاهده مریض",localTime:"وقت افغانستان (Asia/Kabul)",
 dayAppointments:"وقت‌ها",count:"وقت‌ها",filters:"فیلترها",clear:"پاک کردن",
 todaySummary:"وقت‌های امروز",waiting:"منتظر",inCare:"زیر تداوی",done:"تکمیل شده",
 upcoming:"آینده",days:"روزها",monthSummary:"برای دیدن وقت‌های روز، روی تاریخ کلیک کنید.",
 browse:"تقویم وقت‌ها",appointmentID:"شناسه وقت",notAllowed:"شما اجازه این عملیات را ندارید.",
 durationBuffer:"مدت تداوی شامل وقت آماده‌سازی ثبت‌شده است.",noClinics:"عضویت کلینیک ندارید",
 signIn:"ورود به کلینیک",active:"فعال",slotPreview:"تنها ساعات مطابق شیفت فعلی ثبت می‌شوند.",
 duplicate:"فشار دوباره دکمه، وقت تکراری نمی‌سازد.",note:"یادداشت",
 weekOf:"هفته",goCalendar:"تقویم",patientRequired:"یک مریض انتخاب کنید.",
 viewDetails:"مشاهده جزئیات",late:"گذشته",hold:"بدون نگهداشت وقت",changeDate:"انتخاب تاریخ",
 manageHours:"تنظیم ساعات کاری",providerFilter:"داکتر",chairFilter:"چوکی",
 statusFilter:"وضعیت",full:"پر",pending:"شروع نشده",completeAction:"تکمیل تداوی",
 cancelledReason:"دلیل لغو",noShowReason:"دلیل عدم حضور",actionSuccess:"عملیات موفق بود",
 minute:"دقیقه",appointmentsTitle:"تقویم وقت‌ها",selectedDay:"روز انتخابی",
 scheduled:"ثبت شده",clinicOnly:"فقط وقت‌دهی داخلی",select:"انتخاب",next:"بعدی",
 previous:"قبلی",refresh:"تازه‌سازی",notAvailable:"هنوز فعال نیست",
 bookedCount:"مجموع",arrival:"وقت ورود",treatment:"تداوی",allStatuses:"همه وضعیت‌ها",
 mfa:"صلاحیت شما بر اساس نقش کلینیک مشخص می‌شود.",patientHint:"مریض همین کلینیک را انتخاب کنید.",
 help:"مریض، خدمت فعال، داکتر واجد صلاحیت و وقت آزاد انتخاب کنید.",
 error:"درخواست ناموفق",noProvider:"داکتر فعالی تنظیم نشده",
 bookedHeader:"وقت‌های ثبت‌شده",openDetails:"باز کردن وقت",cancelTitle:"لغو وقت",
 rescheduleTitle:"تغییر وقت",statusReason:"دلیل ضروری",timeWindow:"ساعات کاری",
 dateFuture:"تاریخ آینده انتخاب کنید",needsChair:"این خدمت چوکی فعال نیاز دارد.",
 noRequests:"درخواست‌های رزرو آنلاین در مرحله بعدی فعال می‌شود.",
 timeConflict:"این ساعت یا داکتر یا چوکی با وقت دیگری تداخل دارد."
 },
 "ps-AF":{
 appointments:"ملاقاتونه",calendar:"کلیز",queue:"د نن ورځې کتار",newAppointment:"نوی ملاقات",
 dashboard:"ډشبورډ",today:"نن",day:"ورځ",week:"اونۍ",month:"میاشت",date:"نېټه",
 all:"ټول",allProviders:"ټول ډاکټران",allChairs:"ټولې څوکۍ",status:"حالت",
 patient:"ناروغ",service:"خدمت",dentist:"ډاکټر",chair:"د درملنې څوکۍ",
 source:"د ثبت سرچینه",time:"وخت",from:"له",to:"تر",notes:"اداري یادښت (طبي نه)",
 confirmed:"تأیید شوی",arrived:"راغلی",in_treatment:"تر درملنې لاندې",
 completed:"بشپړ",cancelled:"لغوه",no_show:"نه دی راغلی",staff:"کارکوونکی",
 walk_in:"حضوري",phone:"ټلیفون",checkIn:"ورود ثبت کړئ",startCare:"درملنه پیل کړئ",
 complete:"بشپړ",cancel:"ملاقات لغوه کړئ",markNoShow:"نه حاضر",reschedule:"وخت بدل کړئ",
 save:"ملاقات ثبت کړئ",confirmChange:"بدلون تایید کړئ",update:"تازه کول",
 close:"بندول",back:"شاته",retry:"بیا هڅه",loading:"بارېږي…",
 empty:"په دې موده کې ملاقات نشته",emptyQueue:"د نن ورځې کتار تش دی",
 emptyMessage:"بله نېټه وټاکئ یا نوی ملاقات ثبت کړئ.",queueHelp:"د ناروغانو راتګ او درملنه تعقیب کړئ.",
 queueExpected:"په تمه",queueArrived:"راغلي",queueTreatment:"تر درملنې لاندې",queueDone:"بشپړ شوي",
 quickActions:"چټکې کړنې",agenda:"لړلیک",availableSlots:"خالي وختونه",
 chooseSlot:"وخت وټاکئ",booked:"نیول شوی",available:"خالي",unavailable:"نشته",
 noSlots:"خالي وخت نشته",choosePatient:"ناروغ د نوم، شمېره یا ټلیفون له مخې ولټوئ",
 patientSearch:"ناروغ ولټوئ",noPatient:"ناروغ نشته",newPatient:"لومړی ناروغ ثبت کړئ",
 chooseService:"خدمت غوره کړئ",chooseDentist:"ډاکټر غوره کړئ",chooseChair:"څوکۍ وټاکئ",
 sourceHelp:"دا د کلینیک دننه د ملاقات ثبت طریقه ده.",duration:"موده",price:"اټکلي بیه",
 details:"د ملاقات جزییات",timeline:"د کړنو تاریخچه",created:"جوړ شو",
 statusUpdated:"حالت بدل شو",reason:"دلیل (لږ تر لږه ۱۰ توري)",
 confirm:"تأیید",dismiss:"بندول",conflict:"دا وخت نور خالي نه دی؛ بل وخت وټاکئ.",
 stale:"ملاقات بل چا بدل کړی؛ تازه یې کړئ.",saved:"ملاقات ثبت شو",
 changed:"ملاقات بدل شو",notReady:"لومړی خدمتونه، کاري وختونه او د ډاکټر شیفټونه برابر کړئ.",
 privacy:"دا د کلینیک شخصي ملاقات دی؛ عامه رزرو او طبي ثبت لا نشته.",
 viewPatient:"ناروغ وګورئ",localTime:"د افغانستان وخت (Asia/Kabul)",
 dayAppointments:"ملاقاتونه",count:"ملاقاتونه",filters:"فلټرونه",clear:"پاک کړئ",
 todaySummary:"د نن ورځې ملاقاتونه",waiting:"په تمه",inCare:"درملنه روانه",
 done:"بشپړ",upcoming:"راتلونکي",days:"ورځې",
 monthSummary:"د یوې ورځې د ملاقاتونو لپاره نېټه وټاکئ.",browse:"مهالویش وګورئ",
 appointmentID:"د ملاقات پېژند",notAllowed:"دا کړنه ستاسې لپاره نشته",
 durationBuffer:"د چمتووالي وخت هم حساب دی.",noClinics:"فعال کلینیک نشته",
 signIn:"کلینیک ته ننوزئ",active:"فعال",
 slotPreview:"یوازې د اصلي شیفټ سره سم وختونه ثبتېږي.",
 duplicate:"پرله‌پسې کلیک نوی ملاقات نه جوړوي.",note:"یادښت",
 weekOf:"د اونۍ پیل",goCalendar:"کلیز",patientRequired:"ناروغ وټاکئ.",
 viewDetails:"جزییات وګورئ",late:"تېر",hold:"وخت نه ساتل کېږي",
 changeDate:"بله نېټه",manageHours:"ساعتونه تنظیم کړئ",providerFilter:"ډاکټر",
 chairFilter:"څوکۍ",statusFilter:"حالت",full:"ډک",pending:"نه دی پیل شوی",
 completeAction:"درملنه بشپړه کړئ",cancelledReason:"د لغوه کولو دلیل",
 noShowReason:"د نه حاضریدو دلیل",actionSuccess:"بریالی",
 minute:"دقیقه",appointmentsTitle:"د ملاقاتونو کلیز",selectedDay:"ټاکل شوې ورځ",
 scheduled:"ثبت شوی",clinicOnly:"یوازې داخلي ملاقاتونه",select:"ټاکل",
 next:"راتلونکی",previous:"پخوانی",refresh:"تازه کول",
 notAvailable:"لا نه دی فعال",bookedCount:"ټول",arrival:"د راتګ وخت",
 treatment:"درملنه",allStatuses:"ټول حالتونه",
 mfa:"د کلینیک رول ستاسو لاسرسی ټاکي.",
 patientHint:"د همدې کلینیک ناروغ غوره کړئ.",
 help:"ناروغ، خدمت، ډاکټر او خالي وخت وټاکئ.",
 error:"غوښتنه ناکامه شوه",noProvider:"فعال ډاکټر نشته",
 bookedHeader:"ثبت شوي ملاقاتونه",openDetails:"ملاقات خلاص کړئ",
 rescheduleTitle:"وخت بدل کړئ",cancelTitle:"ملاقات لغوه کړئ",
 statusReason:"دلیل اړین دی",timeWindow:"کاري وختونه",
 dateFuture:"راتلونکې نېټه وټاکئ",needsChair:"دا خدمت فعالې څوکۍ ته اړتیا لري.",
 noRequests:"آنلاین غوښتنې په بل پړاو کې فعالېږي.",
 timeConflict:"دا وخت، ډاکټر یا څوکۍ له بل ملاقات سره ټکر لري."
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const t=(key:string)=>translations[locale]?.[key]||translations.en[key]||key;
 const format=(date:unknown,options?:Intl.DateTimeFormatOptions)=>{
  try{return new Intl.DateTimeFormat(locale,{calendar:calendar==="solar_hijri"?"persian":"gregory",
   timeZone:"Asia/Kabul",month:"short",day:"numeric",year:"numeric",...options}).format(new Date(String(date)));}
  catch{return String(date||"—");}
 };
 return {t,format,locale};
}
const url=(cid:string)=>"/clinics/"+encodeURIComponent(cid);
const href=(cid:string,page:"calendar"|"queue"|"new",date?:string)=>"/clinic/appointments"+
 (page==="queue"?"/queue":page==="new"?"/new":"")+"?clinic="+encodeURIComponent(cid)+
 (date?"&date="+encodeURIComponent(date):"");
async function request(path:string,method="GET",body?:unknown){
 const response=await fetch(API+"/v1/appointments"+path,{
  method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.code||"NETWORK_ERROR");
 return data;
}
async function ops(path:string){const response=await fetch(API+"/v1/operations"+path,{credentials:"include",cache:"no-store"});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.code||"NETWORK_ERROR");return result;}
const todayKabul=()=>{
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",year:"numeric",
  month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const p=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
};
const addDays=(day:string,count:number)=>new Date(Date.parse(day+"T12:00:00Z")+count*86400000).toISOString().slice(0,10);
const satIndex=(day:string)=>(new Date(day+"T12:00:00Z").getUTCDay()+1)%7;
const localTime=(value:unknown)=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(String(value)));
const localDate=(value:unknown)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(String(value)));
const statusNames=["confirmed","arrived","in_treatment","completed","cancelled","no_show"];
const live=(s:string)=>["confirmed","arrived","in_treatment"].includes(s);
function useData(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [tick,setTick]=useState(0);
 const retry=()=>{setData(null);setError("");setTick(x=>x+1);};
 useEffect(()=>{if(!path)return;let mounted=true;setData(null);setError("");
  request(path).then(v=>{if(mounted)setData(v);}).catch(e=>{if(mounted)setError(e.message);});
  return()=>{mounted=false;};
 },[path,tick]);
 return {data,error,retry};
}
function Busy(){const {t}=useWords();return <div className="card panel" aria-live="polite">
 <span className="phase05-spinner" aria-hidden="true"/> {t("loading")}</div>;}
function Warning({message,retry}:{message:string;retry?:()=>void}){
 const {t}=useWords();return <div className="card panel"><InlineAlert kind="error">
 {t("error")}: {message==="STALE_APPOINTMENT_REVISION"?t("stale"):
 message==="APPOINTMENT_SLOT_CONFLICT"||message==="SLOT_NOT_AVAILABLE"?t("conflict"):message}
 </InlineAlert>{retry&&<button className="btn btn-secondary" onClick={retry}>{t("retry")}</button>}</div>;
}
function Status({value}:{value:string}){
 const {t}=useWords();return <span className={"ph06-status ph06-"+value}>
 <i aria-hidden="true"/>{t(value)}</span>;
}
function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;
 onChange:(s:string)=>void;options:{value:string,label:string}[];disabled?:boolean}){
 return <label className="ph06-field"><span>{label}</span><select value={value}
  onChange={e=>onChange(e.target.value)} disabled={disabled}>
 {options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
}
function Input({label,value,onChange,type="text",required=false,placeholder="",disabled=false}:{
 label:string;value:string;onChange:(s:string)=>void;type?:string;
 required?:boolean;placeholder?:string;disabled?:boolean}){
 return <label className="ph06-field"><span>{label}{required?" *":""}</span><input type={type}
 value={value} onChange={e=>onChange(e.target.value)} required={required}
 placeholder={placeholder} disabled={disabled}/></label>;
}
function MiniButton({children,onClick,disabled=false}:{children:ReactNode,onClick:()=>void;disabled?:boolean}){
 return <button className="ph06-mini-button" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}
function PageHeading({view,space}:{view:View;space:Space}){
 const {t}=useWords();return <div className="ph06-hero">
  <div><span className="ph06-eyebrow">DANDANLINK / {space.clinicName}</span>
   <h1>{t(view==="new"?"newAppointment":view==="detail"?"details":view==="queue"?"queue":"appointmentsTitle")}</h1>
   <p>{view==="queue"?t("queueHelp"):t("privacy")}</p></div>
  <span className="ph06-time-badge">◷ {t("localTime")}</span></div>;
}
function Tabs({space,view}:{space:Space;view:View}){
 const {t}=useWords();return <nav className="ph06-tabs" aria-label={t("appointments")}>
 {(["calendar","queue","new"] as const).map((p,i)=><a key={p}
  href={href(space.clinicId,p)} aria-current={view===p?"page":undefined}>
  <span aria-hidden="true">{["▦","☷","+"][i]}</span>
  {t(p==="new"?"newAppointment":p)}</a>)}</nav>;
}
export function AppointmentsPortal({view}:{view:View}){
 const {t}=useWords();
 const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [selected,setSelected]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.code||"AUTH_REQUIRED");setCtx(value);})
   .catch(e=>setError(e.message));
 },[]);
 if(error==="AUTH_REQUIRED")return <div className="page-narrow card panel">
  <InlineAlert kind="warning">{t("signIn")}</InlineAlert>
  <a href="/clinic/login" className="btn btn-primary">{t("signIn")}</a></div>;
 if(error)return <Warning message={error} retry={()=>location.reload()}/>;
 if(!ctx||selected===undefined)return <Busy/>;
 const space=selected?ctx.clinics.find(s=>s.clinicId===selected):ctx.clinics[0];
 if(!space)return <Warning message={t("noClinics")} retry={()=>location.assign("/clinic")}/>;
 if(!["owner","manager","receptionist","dentist"].includes(space.role))
  return <Warning message={t("notAllowed")}/>;
 return <Shell ctx={ctx} space={space} active="appointments">
  <main className="ph06-workspace"><PageHeading view={view} space={space}/>
   <Tabs space={space} view={view}/>
   {view==="calendar"?<Calendar space={space}/>:
    view==="queue"?<Queue space={space}/>:
    view==="new"?<BookingEditor space={space}/>:
    <Details space={space}/>}
  </main>
 </Shell>;
}
