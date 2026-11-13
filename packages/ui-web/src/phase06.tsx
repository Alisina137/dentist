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


function Calendar({space}:{space:Space}){
 const {t,format}=useWords();
 const [day,setDay]=useState(todayKabul);
 const [mode,setMode]=useState<"day"|"week"|"month">("week");
 const [dentist,setDentist]=useState("all"),[chair,setChair]=useState("all"),[status,setStatus]=useState("all");
 useEffect(()=>{const q=new URLSearchParams(location.search);
  const from=q.get("date");if(from&&/^\d{4}-\d\d-\d\d$/.test(from))setDay(from);
  if(window.innerWidth<800)setMode("day");
 },[]);
 const base=url(space.clinicId);
 const weekStart=addDays(day,-satIndex(day));
 const range=mode==="day"?{from:day,to:day}:mode==="week"?
 {from:weekStart,to:addDays(weekStart,6)}:{
  from:day.slice(0,7)+"-01",
  to:addDays(addDays(day.slice(0,7)+"-01",32).slice(0,7)+"-01",-1)
 };
 const q=new URLSearchParams({from:range.from,to:range.to,
  ...(dentist!=="all"&&space.role!=="dentist"?{providerId:dentist}:{}),
  ...(chair!=="all"?{resourceId:chair}:{}),
  ...(status!=="all"?{status}:{})
 });
 const {data,error,retry}=useData(base+"/calendar?"+q.toString());
 const [catalog,setCatalog]=useState<{doctors:Doctor[];resources:Resource[]}>({doctors:[],resources:[]});
 useEffect(()=>{
  let mounted=true;
  Promise.all([ops(base+"/hours"),ops(base+"/resources")]).then(([h,c])=>{
   if(mounted)setCatalog({doctors:h.clinicians,resources:c.resources});}).catch(()=>{});
  return()=>{mounted=false;};
 },[base]);
 const rows:Booking[]=data?.appointments||[];
 const groups=new Map<string,Booking[]>();
 for(const a of rows){const d=localDate(a.startAt);
  groups.set(d,[...(groups.get(d)||[]),a]);}
 const summary={total:rows.length,confirmed:rows.filter(x=>x.status==="confirmed").length,
  arrived:rows.filter(x=>x.status==="arrived").length,
  inCare:rows.filter(x=>x.status==="in_treatment").length,
  completed:rows.filter(x=>x.status==="completed").length};
 const move=(delta:number)=>setDay(current=>{
  if(mode==="day")return addDays(current,delta);
  if(mode==="week")return addDays(current,delta*7);
  const pivot=new Date(current.slice(0,7)+"-15T12:00:00Z");
  pivot.setUTCMonth(pivot.getUTCMonth()+delta);
  return pivot.toISOString().slice(0,7)+"-01";
 });
 const selected=groups.get(day)||[];
 const days=mode==="month"?Array.from({length:
  Math.ceil((satIndex(range.from)+Math.round((Date.parse(range.to+"T00:00:00Z")-
  Date.parse(range.from+"T00:00:00Z"))/86400000)+1)/7)*7},(_,i)=>
    addDays(range.from,i-satIndex(range.from))):
  mode==="week"?Array.from({length:7},(_,i)=>addDays(range.from,i)):[day];
 return <div className="ph06-stack">
  <section className="ph06-kpis">
   {([["total","bookedCount"],["confirmed","scheduled"],["arrived","waiting"],
    ["inCare","inCare"],["completed","done"]] as const).map(([key,label],i)=>
    <article key={key} className="ph06-kpi"><span aria-hidden="true">{["▣","◷","◎","✦","✓"][i]}</span>
     <div><small>{t(label)}</small><strong>{summary[key]}</strong></div></article>)}
  </section>
  <section className="card ph06-panel">
   <div className="ph06-calendar-heading"><div>
    <span className="ph06-eyebrow">{t("appointmentsTitle")}</span>
    <h2>{format(day+"T12:00:00+04:30",{month:"long",year:"numeric"})}</h2>
    <p>{t("clinicOnly")}</p></div>
    <a className="btn btn-primary" href={href(space.clinicId,"new",day)}>+ {t("newAppointment")}</a>
   </div>
   <div className="ph06-navigation-row">
    <div className="ph06-date-navigator">
     <MiniButton onClick={()=>move(-1)}>‹</MiniButton>
     <button className="ph06-today-btn" onClick={()=>setDay(todayKabul())}>{t("today")}</button>
     <MiniButton onClick={()=>move(1)}>›</MiniButton>
     <input aria-label={t("date")} type="date" value={day} onChange={e=>setDay(e.target.value)}
      className="ph06-date-picker"/>
    </div>
    <div className="ph06-segmented" role="group" aria-label={t("calendar")}>
     {(["day","week","month"] as const).map(view=><button key={view}
      className={mode===view?"active":""} aria-pressed={mode===view} onClick={()=>setMode(view)}>
      {t(view)}</button>)}
    </div>
   </div>
   <div className="ph06-filter-bar">
    {space.role!=="dentist"&&<Select label={t("providerFilter")} value={dentist}
     onChange={setDentist} options={[{value:"all",label:t("allProviders")},
      ...catalog.doctors.map(x=>({value:x.membershipId,label:x.name}))]}/>}
    <Select label={t("chairFilter")} value={chair} onChange={setChair}
     options={[{value:"all",label:t("allChairs")},
      ...catalog.resources.filter(x=>x.active&&x.kind==="chair").map(x=>({value:x.id,label:x.label}))]}/>
    <Select label={t("statusFilter")} value={status} onChange={setStatus}
     options={[{value:"all",label:t("allStatuses")},
      ...statusNames.map(x=>({value:x,label:t(x)}))]}/>
    <button className="ph06-refresh" onClick={retry} aria-label={t("refresh")}>↻ {t("refresh")}</button>
   </div>
   {error?<Warning message={error} retry={retry}/>:!data?<Busy/>:<>
    <div className="ph06-legend">{["confirmed","arrived","in_treatment","completed","cancelled","no_show"].map(x=>
     <span key={x}><Status value={x}/></span>)}</div>
    {mode==="day"?<div className="ph06-day-layout">
      <div className="ph06-timeline" role="list" aria-label={t("dayAppointments")}>
       {Array.from({length:13},(_,i)=>i+7).map(hour=><div className="ph06-timeline-hour" key={hour}>
        <span><bdi dir="ltr">{String(hour).padStart(2,"0")}:00</bdi></span>
        <div className="ph06-timeline-row">
         {selected.filter(a=>Number(localTime(a.startAt).slice(0,2))===hour).map(a=>
          <AppointmentCard key={a.id} booking={a} cid={space.clinicId} doctors={catalog.doctors}/>)}
        </div>
       </div>)}
       {selected.filter(a=>Number(localTime(a.startAt).slice(0,2))<7||
        Number(localTime(a.startAt).slice(0,2))>19).map(a=>
        <AppointmentCard key={a.id} booking={a} cid={space.clinicId} doctors={catalog.doctors}/>)}
      </div>
      {selected.length===0&&<EmptyState cid={space.clinicId} day={day}/>}
     </div>:mode==="week"?<div className="ph06-week-grid">
      {days.map(date=><div className={"ph06-week-column"+(date===todayKabul()?" ph06-is-today":"")} key={date}>
       <button className="ph06-week-date" onClick={()=>{setDay(date);setMode("day");}}>
        <span>{format(date+"T12:00:00+04:30",{weekday:"short"})}</span>
        <strong>{date.slice(-2)}</strong><small>{(groups.get(date)||[]).length} {t("count")}</small></button>
       <div className="ph06-week-items">{(groups.get(date)||[]).map(a=>
        <AppointmentCard key={a.id} booking={a} cid={space.clinicId} compact doctors={catalog.doctors}/>)}
        {!(groups.get(date)||[]).length&&<span className="ph06-no-items">—</span>}
       </div>
      </div>)}
     </div>:<div className="ph06-month-grid">
      {days.map(date=><button key={date} className={"ph06-month-cell"+
        (date.slice(0,7)!==range.from.slice(0,7)?" outside":"")+
        (date===todayKabul()?" today":"")+
        (date===day?" selected":"")}
        onClick={()=>{setDay(date);setMode("day");}}>
        <span>{date.slice(-2)}</span>
        {(groups.get(date)||[]).length>0&&<span className="ph06-month-count">
        {(groups.get(date)||[]).length} {t("count")}</span>}
        <span className="ph06-month-dots">{(groups.get(date)||[]).slice(0,4).map(a=>
         <i key={a.id} className={"ph06-dot-"+a.status}/>)}</span>
      </button>)}
     </div>}
    <div className="ph06-agenda-heading">
     <div><h3>{t("agenda")} · {format(day+"T12:00:00+04:30")}</h3>
      <span>{selected.length} {t("count")}</span></div>
     <button className="btn btn-secondary" onClick={()=>{setMode("day");setDay(todayKabul());}}>{t("today")}</button>
    </div>
    {selected.length?<div className="ph06-agenda-list">{selected.map(a=>
      <AppointmentCard key={a.id} booking={a} cid={space.clinicId} doctors={catalog.doctors}/>)}
     </div>:<EmptyState cid={space.clinicId} day={day}/>}
   </>}
  </section>
 </div>;
}
function AppointmentCard({booking,cid,doctors,compact=false}:{booking:Booking;cid:string;
 doctors:Doctor[];compact?:boolean}){
 const {t}=useWords(),name=booking.patient?.preferredName||"—";
 const doctor=doctors.find(x=>x.membershipId===booking.providerMembershipId)?.name||t("dentist");
 return <a className={"ph06-appointment-card ph06-card-"+booking.status+(compact?" compact":"")}
 href={"/clinic/appointments/"+booking.id+"?clinic="+encodeURIComponent(cid)}>
  <div className="ph06-appointment-top"><time>{localTime(booking.startAt)}–{localTime(booking.endAt)}</time>
   {!compact&&<Status value={booking.status}/>}</div>
  <strong>{name} {compact?"":booking.patient?.familyName||""}</strong>
  <span>{booking.serviceName}</span>
  <small>{doctor} · <bdi dir="ltr">{booking.patient?.patientNumber||"—"}</bdi></small>
 </a>;
}
function EmptyState({cid,day}:{cid:string;day?:string}){
 const {t}=useWords();return <div className="ph06-empty">
  <div className="ph06-empty-icon" aria-hidden="true">▦</div><h3>{t("empty")}</h3>
  <p>{t("emptyMessage")}</p><a className="btn btn-primary" href={href(cid,"new",day)}>
  + {t("newAppointment")}</a></div>;
}


function Queue({space}:{space:Space}){
 const {t,format}=useWords();
 const [date,setDate]=useState(todayKabul),[doctor,setDoctor]=useState("all");
 const base=url(space.clinicId);
 const query=new URLSearchParams({date,...(doctor!=="all"&&space.role!=="dentist"?{providerId:doctor}:{})});
 const {data,error,retry}=useData(base+"/queue?"+query);
 const {data:hourData}=useData(null);
 const [clinicians,setClinicians]=useState<Doctor[]>([]);
 const [saving,setSaving]=useState<string|null>(null),[problem,setProblem]=useState("");
 const [reason,setReason]=useState(""),[reasonId,setReasonId]=useState("");
 useEffect(()=>{ops(base+"/hours").then(d=>setClinicians(d.clinicians||[])).catch(()=>{});},[base]);
 const bookings:Booking[]=data?.appointments||[];
 const columns=[
  {key:"confirmed",label:"queueExpected",icon:"◷"},
  {key:"arrived",label:"queueArrived",icon:"◎"},
  {key:"in_treatment",label:"queueTreatment",icon:"✦"},
  {key:"completed",label:"queueDone",icon:"✓"}
 ];
 const canClinical=(space.role==="dentist"||space.clinicianEnabled&&
  ["owner","manager"].includes(space.role));
 const canReception=space.role!=="dentist";
 async function change(a:Booking,status:string){
  if(["cancelled","no_show"].includes(status)&&reasonId!==a.id){setReasonId(a.id);setReason("");return;}
  setSaving(a.id);setProblem("");
  try{
   await request(base+"/appointments/"+a.id+"/status","PATCH",{
    status,revision:a.revision,...(["cancelled","no_show"].includes(status)?{reason}:{})
   });
   setReason("");setReasonId("");retry();
  }catch(e:any){setProblem(e.message);retry();}
  finally{setSaving(null);}
 }
 function actions(a:Booking){
  return <div className="ph06-queue-actions">
   {a.status==="confirmed"&&canReception&&<button disabled={saving===a.id}
    onClick={()=>change(a,"arrived")}>{t("checkIn")}</button>}
   {a.status==="arrived"&&canClinical&&
    (space.role!=="dentist"||space.membershipId===a.providerMembershipId)&&
    <button disabled={saving===a.id} onClick={()=>change(a,"in_treatment")}>{t("startCare")}</button>}
   {a.status==="in_treatment"&&canClinical&&
    (space.role!=="dentist"||space.membershipId===a.providerMembershipId)&&
    <button disabled={saving===a.id} onClick={()=>change(a,"completed")}>{t("completeAction")}</button>}
   {a.status==="confirmed"&&canReception&&<>
    <button disabled={saving===a.id} onClick={()=>change(a,"no_show")}>{t("markNoShow")}</button>
   </>}
  </div>;
 }
 return <div className="ph06-stack">
  <div className="ph06-queue-toolbar card">
   <div><span className="ph06-eyebrow">{t("todaySummary")}</span>
    <h2>{format(date+"T12:00:00+04:30",{weekday:"long",month:"long",day:"numeric"})}</h2></div>
   <div className="ph06-toolbar-right">
    <Input label={t("date")} type="date" value={date} onChange={setDate}/>
    {space.role!=="dentist"&&<Select label={t("providerFilter")} value={doctor}
      onChange={setDoctor} options={[{value:"all",label:t("allProviders")},
      ...clinicians.map(x=>({value:x.membershipId,label:x.name}))]}/>}
    <button className="btn btn-secondary" onClick={()=>{setDate(todayKabul());retry();}}>{t("today")}</button>
    <a className="btn btn-primary" href={href(space.clinicId,"new",date)}>+ {t("newAppointment")}</a>
   </div>
  </div>
  <div className="ph06-queue-metrics">
   {columns.map(x=><div key={x.key} className={"ph06-queue-metric metric-"+x.key}>
    <span aria-hidden="true">{x.icon}</span><div><small>{t(x.label)}</small>
    <strong>{bookings.filter(a=>a.status===x.key).length}</strong></div></div>)}
  </div>
  {problem&&<Warning message={problem} retry={retry}/>}
  {error?<Warning message={error} retry={retry}/>:!data?<Busy/>:
    <div className="ph06-kanban">
     {columns.map(column=><section className="ph06-kanban-column" key={column.key}
      aria-label={t(column.label)}>
      <div className={"ph06-column-header ph06-column-"+column.key}>
       <div><span aria-hidden="true">{column.icon}</span><h3>{t(column.label)}</h3></div>
       <span className="ph06-column-count">{bookings.filter(a=>a.status===column.key).length}</span>
      </div>
      <div className="ph06-queue-cards">
       {bookings.filter(a=>a.status===column.key).map(a=><article className="ph06-queue-card card" key={a.id}>
        <div className="ph06-queue-card-top"><time><bdi dir="ltr">{localTime(a.startAt)}</bdi></time>
         <Status value={a.status}/></div>
        <h4>{a.patient?.preferredName||"—"} {a.patient?.familyName||""}</h4>
        <span className="ph06-patient-code"><bdi dir="ltr">{a.patient?.patientNumber||"—"}</bdi></span>
        <p>{a.serviceName}</p>
        <div className="ph06-queue-provider"><span>◎</span>
        {clinicians.find(d=>d.membershipId===a.providerMembershipId)?.name||t("dentist")}</div>
        {actions(a)}
        {reasonId===a.id&&<div className="ph06-reason-input">
         <Input label={t("noShowReason")} value={reason} onChange={setReason}/>
         <button disabled={saving===a.id||reason.trim().length<10}
          className="btn btn-secondary" onClick={()=>change(a,"no_show")}>{t("confirm")}</button>
         <button className="btn btn-quiet" onClick={()=>setReasonId("")}>{t("dismiss")}</button>
        </div>}
        <a className="ph06-card-link" href={"/clinic/appointments/"+a.id+"?clinic="+space.clinicId}>
         {t("viewDetails")} ↗</a>
       </article>)}
       {!bookings.some(a=>a.status===column.key)&&<div className="ph06-kanban-empty">
         <span aria-hidden="true">◌</span><p>{t("emptyQueue")}</p></div>}
      </div>
     </section>)}
    </div>}
   <div className="ph06-bottom-links"><a className="btn btn-secondary"
    href={href(space.clinicId,"calendar",date)}>{t("goCalendar")} ↗</a>
    <p>{t("privacy")}</p></div>
 </div>;
}


function BookingEditor({space,existing,close,afterSave}:{
 space:Space;existing?:Booking;close?:()=>void;afterSave?:()=>void}){
 const {t,format}=useWords();const base=url(space.clinicId);
 const [patientQuery,setPatientQuery]=useState(""),[patientId,setPatientId]=useState(existing?.patientId||"");
 const [patients,setPatients]=useState<{id:string;preferredName:string;familyName:string|null;patientNumber:string}[]>([]);
 const [service,setService]=useState(existing?.serviceId||""),[provider,setProvider]=useState(existing?.providerMembershipId||"");
 const [resource,setResource]=useState(existing?.resourceId||""),[date,setDate]=useState(()=>{
   if(existing)return localDate(existing.startAt);
   if(typeof window!=="undefined"){
    const d=new URLSearchParams(window.location.search).get("date");
    if(d&&/^\d{4}-\d\d-\d\d$/.test(d))return d;
   }
   return todayKabul();
 });
 const [start,setStart]=useState(existing?localTime(existing.startAt):"");
 const [source,setSource]=useState(existing?.source||"staff"),[note,setNote]=useState(existing?.adminNote||"");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState("");
 const [key,setKey]=useState(()=>crypto.randomUUID());
 const [catalog,setCatalog]=useState<{services:Service[];doctors:Doctor[];resources:Resource[]}>({
  services:[],doctors:[],resources:[]});
 const [loading,setLoading]=useState(true),[catalogError,setCatalogError]=useState("");
 const [slots,setSlots]=useState<{start:string;end:string;resourceId:string|null}[]>([]);
 const [previewError,setPreviewError]=useState(""),[waitingSlots,setWaitingSlots]=useState(false);
 const [booked,setBooked]=useState<Booking[]>([]);
 const [patientLoading,setPatientLoading]=useState(false);
 useEffect(()=>{
  let alive=true;
  Promise.all([ops(base+"/services"),ops(base+"/resources"),ops(base+"/hours")])
   .then(([s,r,h])=>{if(alive)setCatalog({
    services:s.services,resources:r.resources,doctors:h.clinicians});})
   .catch(e=>{if(alive)setCatalogError(e.message);})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[base]);
 const selected=catalog.services.find(s=>s.id===service);
 const doctors=space.role==="dentist"?catalog.doctors.filter(d=>d.membershipId===space.membershipId):catalog.doctors;
 const chairs=catalog.resources.filter(r=>r.kind==="chair"&&r.active);
 useEffect(()=>{
  if(!provider&&doctors.length)setProvider(doctors[0].membershipId);
  if(!service&&catalog.services.some(s=>s.active))
   setService(catalog.services.find(s=>s.active)!.id);
 },[catalog,space.role]);
 useEffect(()=>{
  if(!patientQuery.trim()||patientQuery.trim().length<2){setPatients([]);return;}
  let active=true;setPatientLoading(true);
  const timer=setTimeout(()=>{
   request(base+"/patients/search?q="+encodeURIComponent(patientQuery.trim()))
    .then(v=>{if(active)setPatients(v.patients||[]);})
    .catch(()=>{if(active)setPatients([]);})
    .finally(()=>{if(active)setPatientLoading(false);});
  },300);
  return()=>{active=false;clearTimeout(timer);};
 },[patientQuery,base]);
 useEffect(()=>{
  if(!service||!provider||!date||selected?.requiresChair&&!resource)return;
  let mounted=true;setWaitingSlots(true);setPreviewError("");
  const query=new URLSearchParams({date,serviceId:service,providerId:provider,
   ...(selected?.requiresChair?{resourceId:resource}:{})});
  Promise.all([
   ops(base+"/availability/preview?"+query.toString()),
   request(base+"/calendar?"+new URLSearchParams({from:date,to:date}).toString())
  ]).then(([available,bookings])=>{
   if(mounted){setSlots(available.slots||[]);setBooked(bookings.appointments||[]);}
  }).catch(e=>{if(mounted){setSlots([]);setPreviewError(e.message);}})
   .finally(()=>{if(mounted)setWaitingSlots(false);});
  return()=>{mounted=false;};
 },[base,service,provider,resource,date,selected?.requiresChair]);
 function resetSlot(){
  setStart("");setSlots([]);setBooked([]);setKey(crypto.randomUUID());setError("");setDone("");
 }
 const validSlots=slots.filter(slot=>
  !booked.some(a=>a.id!==existing?.id&&live(a.status)&&(
   a.providerMembershipId===provider||slot.resourceId&&a.resourceId===slot.resourceId
  )&&(Date.parse(a.startAt)<slotDate(date,slot.end) &&
      Date.parse(a.endAt)>slotDate(date,slot.start))) );
 // The client-side status filter is only a convenience. The DB exclusion constraint
 // and fresh PH04 preview are authoritative, including competing users.
 async function submit(event:FormEvent){
  event.preventDefault();setError("");setDone("");
  if(!patientId){setError("PATIENT_REQUIRED");return;}
  if(!service||!provider||!start){setError("SLOT_REQUIRED");return;}
  setBusy(true);
  try{
   const payload={patientId,serviceId:service,providerId:provider,
    resourceId:selected?.requiresChair?resource:null,date,start,source,
    adminNote:note||null,idempotencyKey:key};
   if(existing){
    await request(base+"/appointments/"+existing.id+"/reschedule","PATCH",{
     revision:existing.revision,serviceId:service,providerId:provider,
     resourceId:payload.resourceId,date,start
    });
    setDone(t("changed"));
    if(afterSave)afterSave();else window.location.assign("/clinic/appointments/"+existing.id+
     "?clinic="+encodeURIComponent(space.clinicId));
   }else{
    const created=await request(base+"/appointments","POST",payload);
    setDone(t("saved"));
    if(afterSave)afterSave();else window.location.assign("/clinic/appointments/"+created.appointment.id+
     "?clinic="+encodeURIComponent(space.clinicId));
   }
  }catch(e:any){
   setError(e.message);
   if(["SLOT_NOT_AVAILABLE","APPOINTMENT_SLOT_CONFLICT","STALE_APPOINTMENT_REVISION"].includes(e.message)){
    setStart("");setKey(crypto.randomUUID());
    const query=new URLSearchParams({date,serviceId:service,providerId:provider,
     ...(selected?.requiresChair?{resourceId:resource}:{})});
    Promise.all([ops(base+"/availability/preview?"+query),request(base+"/calendar?from="+date+"&to="+date)])
      .then(([available,calendar])=>{setSlots(available.slots);setBooked(calendar.appointments);}).catch(()=>{});
   }
  }finally{setBusy(false);}
 }
 return <section className="card ph06-editor">
  <div className="ph06-form-header"><div><span className="ph06-eyebrow">
   {t(existing?"rescheduleTitle":"newAppointment")}</span>
   <h2>{t(existing?"rescheduleTitle":"help")}</h2><p>{t("patientHint")}</p></div>
   {close&&<MiniButton onClick={close}>{t("close")} ×</MiniButton>}
  </div>
  {loading?<Busy/>:catalogError?<Warning message={catalogError} retry={()=>location.reload()}/>:
   <form onSubmit={submit} className="ph06-editor-grid">
    <div className="ph06-editor-main">
     <div className="ph06-form-step"><span>01</span><h3>{t("patient")}</h3></div>
     {existing?<div className="ph06-selected-patient">
      <strong>{existing.patient?.preferredName||"—"} {existing.patient?.familyName||""}</strong>
      <span><bdi dir="ltr">{existing.patient?.patientNumber}</bdi></span></div>:
      <>
       <Input label={t("patientSearch")} value={patientQuery} onChange={setPatientQuery}
        placeholder={t("choosePatient")}/>
       {patientLoading&&<p className="muted">{t("loading")}</p>}
       {patients.length>0&&<div className="ph06-patient-results" role="listbox">
        {patients.map(p=><button key={p.id} type="button" role="option"
         aria-selected={patientId===p.id} onClick={()=>{setPatientId(p.id);setPatientQuery(p.preferredName+
           " "+(p.familyName||""));setPatients([]);setKey(crypto.randomUUID());}}>
         <strong>{p.preferredName} {p.familyName||""}</strong><bdi dir="ltr">{p.patientNumber}</bdi>
        </button>)}
       </div>}
       {patientId?<div className="ph06-selected-patient"><span>✓ {t("patient")} {t("selected")}</span>
        <button type="button" className="ph06-inline" onClick={()=>{setPatientId("");setPatientQuery("");}}>
         {t("changeDate")}</button></div>:
        <div className="ph06-patient-hint">{t("patientRequired")} 
         <a href={"/clinic/patients/new?clinic="+space.clinicId}>{t("newPatient")} ↗</a></div>}
      </>}
     <div className="ph06-form-step"><span>02</span><h3>{t("service")} & {t("dentist")}</h3></div>
     <div className="ph06-two-fields">
      <Select label={t("chooseService")} value={service} onChange={v=>{setService(v);resetSlot();}}
       options={[{value:"",label:t("chooseService")},...catalog.services.filter(s=>s.active)
        .map(s=>({value:s.id,label:s.name+" · "+s.durationMinutes+" "+t("minute")}))]}/>
      <Select label={t("chooseDentist")} value={provider} onChange={v=>{setProvider(v);resetSlot();}}
       options={[{value:"",label:t("chooseDentist")},...doctors.map(d=>({
        value:d.membershipId,label:d.name}))]}/>
     </div>
     {selected&&<div className="ph06-service-details"><div><small>{t("duration")}</small>
      <strong>{selected.durationMinutes+selected.preparationMinutes} {t("minute")}</strong></div>
      <div><small>{t("price")}</small>
       <strong><bdi dir="ltr">{selected.basePriceAfn.toLocaleString("en-US")}</bdi> AFN</strong></div>
      <div><small>{t("chair")}</small><strong>{selected.requiresChair?t("needsChair"):t("notAvailable")}</strong></div></div>}
     {selected?.requiresChair&&<Select label={t("chooseChair")} value={resource}
      onChange={v=>{setResource(v);resetSlot();}} options={[{value:"",label:t("chooseChair")},
       ...chairs.map(x=>({value:x.id,label:x.label+" · "+x.code}))]}/>}
     <div className="ph06-form-step"><span>03</span><h3>{t("date")} & {t("time")}</h3></div>
     <Input label={t("date")+" (Gregorian)"} type="date" value={date} required
      onChange={v=>{setDate(v);resetSlot();}}/>
     <div className="ph06-slot-box">
      <div className="ph06-between"><strong>{t("availableSlots")}</strong>
       <span>{validSlots.length} {t("available")}</span></div>
      {previewError&&<InlineAlert kind="warning">{previewError==="PREVIEW_DATE_OUT_OF_RANGE"?
       t("dateFuture"):previewError}</InlineAlert>}
      {waitingSlots?<Busy/>:validSlots.length?<div className="ph06-slot-options">
       {validSlots.slice(0,140).map(slot=><button key={slot.start+slot.resourceId} type="button"
        className={start===slot.start?"selected":""} onClick={()=>{
         setStart(slot.start);setKey(crypto.randomUUID());}}>
         <bdi dir="ltr">{slot.start}</bdi>
         <small><bdi dir="ltr">{slot.end}</bdi></small></button>)}
      </div>:<div className="ph06-slot-empty">{t("noSlots")} · <a
       href={"/clinic/settings/hours?clinic="+space.clinicId+"&tab=preview"}>{t("manageHours")} ↗</a></div>}
     </div>
     {!existing&&<>
      <div className="ph06-form-step"><span>04</span><h3>{t("source")} & {t("note")}</h3></div>
      <div className="ph06-two-fields"><Select label={t("source")} value={source}
       onChange={v=>{setSource(v);setKey(crypto.randomUUID());}} options={[
        {value:"staff",label:t("staff")},{value:"walk_in",label:t("walk_in")},
        {value:"phone",label:t("phone")} ]}/></div>
      <label className="ph06-field"><span>{t("notes")}</span><textarea maxLength={1000}
       rows={3} value={note} onChange={e=>{setNote(e.target.value);setKey(crypto.randomUUID());}}/></label>
     </>}
    </div>
    <aside className="ph06-booking-summary">
     <span className="ph06-eyebrow">{t("details")}</span><h3>{t("bookingSummary")||t("newAppointment")}</h3>
     <dl><div><dt>{t("patient")}</dt><dd>{patientId?"✓ "+t("selected"):"—"}</dd></div>
      <div><dt>{t("service")}</dt><dd>{selected?.name||"—"}</dd></div>
      <div><dt>{t("date")}</dt><dd><bdi dir="ltr">{date}</bdi></dd></div>
      <div><dt>{t("time")}</dt><dd><bdi dir="ltr">{start||"—"}</bdi></dd></div>
      <div><dt>{t("dentist")}</dt><dd>{doctors.find(d=>d.membershipId===provider)?.name||"—"}</dd></div>
      <div><dt>{t("price")}</dt><dd>{selected?.basePriceAfn.toLocaleString("en-US")||"0"} AFN</dd></div>
     </dl>
     <InlineAlert>{t("slotPreview")} {t("duplicate")}</InlineAlert>
     {error&&<InlineAlert kind="error">{error==="APPOINTMENT_SLOT_CONFLICT"||
      error==="SLOT_NOT_AVAILABLE"?t("conflict"):error==="STALE_APPOINTMENT_REVISION"?
      t("stale"):error}</InlineAlert>}
     {done&&<InlineAlert kind="success">{done}</InlineAlert>}
     <button className="btn btn-primary ph06-confirm" disabled={busy||!patientId||
       !service||!provider||!start||selected?.requiresChair&&!resource}>
       {busy?t("loading"):t(existing?"confirmChange":"save")}</button>
     <a href={href(space.clinicId,"calendar",date)} className="btn btn-secondary">{t("back")}</a>
    </aside>
   </form>}
 </section>;
}
// Convert a display slot time to its real UTC timestamp through Kabul's
// selected Gregorian day. The browser timezone never defines a booking interval.
function slotDate(date:string,time:string){
 const m=Number(time.slice(0,2))*60+Number(time.slice(3));
 return Date.parse(date+"T00:00:00Z")+(m-270)*60000;
}


function Details({space}:{space:Space}){
 const {t,format}=useWords();
 const [id,setId]=useState<string|null>(null);
 useEffect(()=>{const parts=location.pathname.split("/").filter(Boolean);
  const idx=parts.indexOf("appointments");
  setId(parts[idx+1]||null);
 },[]);
 const base=url(space.clinicId);
 const {data,error,retry}=useData(id?base+"/appointments/"+id:null);
 const [mode,setMode]=useState<"view"|"move">("view");
 const [saving,setSaving]=useState(false),[reason,setReason]=useState("");
 const [action,setAction]=useState(""),[problem,setProblem]=useState(""),[success,setSuccess]=useState("");
 const {data:hours}=useData(base?null:null);
 const [doctors,setDoctors]=useState<Doctor[]>([]),[chairs,setChairs]=useState<Resource[]>([]);
 useEffect(()=>{Promise.all([ops(base+"/hours"),ops(base+"/resources")])
   .then(([h,c])=>{setDoctors(h.clinicians);setChairs(c.resources);}).catch(()=>{});},[base]);
 if(error)return <Warning message={error} retry={retry}/>;
 if(!data)return <Busy/>;
 const a:Booking={...data.appointment,patient:data.patient};
 const canClinical=space.role==="dentist"||
  space.clinicianEnabled&&["owner","manager"].includes(space.role);
 const frontDesk=space.role!=="dentist";
 const own=space.role!=="dentist"||space.membershipId===a.providerMembershipId;
 const allowed=[
  ...(a.status==="confirmed"&&frontDesk?["arrived","no_show","cancelled"]:[]),
  ...(a.status==="arrived"&&canClinical&&own?["in_treatment"]:[]),
  ...(a.status==="arrived"&&frontDesk?["cancelled"]:[]),
  ...(a.status==="in_treatment"&&canClinical&&own?["completed"]:[])
 ];
 async function changeStatus(status:string){
  if(!allowed.includes(status))return;
  if(["cancelled","no_show"].includes(status)&&action!==status){
   setAction(status);setReason("");return;
  }
  setSaving(true);setProblem("");setSuccess("");
  try{
   await request(base+"/appointments/"+a.id+"/status","PATCH",{
    status,revision:a.revision,...(["cancelled","no_show"].includes(status)?{reason}: {})
   });
   setAction("");setReason("");setSuccess(t("actionSuccess"));retry();
  }catch(e:any){setProblem(e.message);}
  finally{setSaving(false);}
 }
 if(mode==="move")return <div className="ph06-stack">
  <div className="ph06-detail-back"><button className="btn btn-secondary" onClick={()=>setMode("view")}>
   ← {t("back")}</button><span>{t("rescheduleTitle")}</span></div>
  <BookingEditor space={space} existing={a} close={()=>setMode("view")} afterSave={()=>{setMode("view");retry();}}/>
 </div>;
 return <div className="ph06-stack">
  <div className="ph06-detail-back"><a href={href(space.clinicId,"calendar",localDate(a.startAt))}
   className="btn btn-secondary">← {t("calendar")}</a>
   <span>{t("appointmentID")}: <bdi dir="ltr">{a.id.slice(0,8)}</bdi></span></div>
  <section className="card ph06-detail">
   <div className="ph06-detail-header"><div><span className="ph06-eyebrow">{t("details")}</span>
    <h2>{a.patient?.preferredName||"—"} {a.patient?.familyName||""}</h2>
    <p><bdi dir="ltr">{a.patient?.patientNumber||"—"}</bdi> · {t("service")}: {a.serviceName}</p></div>
    <Status value={a.status}/>
   </div>
   <div className="ph06-detail-highlights">
    <div><span>◷</span><small>{t("date")} / {t("time")}</small>
     <strong>{format(a.startAt,{weekday:"long",month:"short",day:"numeric"})}</strong>
     <bdi dir="ltr">{localTime(a.startAt)} – {localTime(a.endAt)}</bdi></div>
    <div><span>◎</span><small>{t("dentist")}</small>
     <strong>{doctors.find(d=>d.membershipId===a.providerMembershipId)?.name||t("dentist")}</strong></div>
    <div><span>▦</span><small>{t("chair")}</small>
     <strong>{chairs.find(x=>x.id===a.resourceId)?.label||"—"}</strong></div>
    <div><span>✦</span><small>{t("price")}</small>
     <strong><bdi dir="ltr">{a.priceSnapshotAfn.toLocaleString("en-US")}</bdi> AFN</strong></div>
   </div>
   <div className="ph06-detail-body">
    <div className="ph06-detail-info">
     <h3>{t("overview")||t("details")}</h3>
     <dl><div><dt>{t("patient")}</dt><dd>
       <a className="ph06-inline" href={"/clinic/patients/"+a.patientId+"?clinic="+space.clinicId}>
       {t("viewPatient")} ↗</a></dd></div>
       <div><dt>{t("source")}</dt><dd>{t(a.source)}</dd></div>
       <div><dt>{t("duration")}</dt><dd>{a.durationMinutes}+{a.bufferMinutes} {t("minute")}</dd></div>
       <div><dt>{t("created")}</dt><dd>{format(a.createdAt)}</dd></div>
       <div><dt>{t("arrival")}</dt><dd>{a.checkedInAt?format(a.checkedInAt,{hour:"2-digit",minute:"2-digit"}):"—"}</dd></div>
       <div><dt>{t("note")}</dt><dd>{a.adminNote||"—"}</dd></div>
     </dl>
     <InlineAlert>{t("privacy")}</InlineAlert>
    </div>
    <div className="ph06-detail-actions">
     <h3>{t("quickActions")}</h3>
     {a.status==="confirmed"&&<button className="btn btn-secondary" onClick={()=>setMode("move")}>
      ◷ {t("reschedule")}</button>}
     {allowed.filter(s=>!["cancelled","no_show"].includes(s)).map(status=><button
      key={status} className="btn btn-primary" disabled={saving} onClick={()=>changeStatus(status)}>
      {t(status==="arrived"?"checkIn":status==="in_treatment"?"startCare":"completeAction")}</button>)}
     {allowed.filter(s=>["cancelled","no_show"].includes(s)).map(status=><button
      key={status} className="btn btn-secondary" disabled={saving} onClick={()=>changeStatus(status)}>
       {t(status==="cancelled"?"cancel":"markNoShow")}</button>)}
     {action&&<div className="ph06-detail-reason">
      <Input label={t(action==="no_show"?"noShowReason":"cancelledReason")}
       value={reason} onChange={setReason} placeholder={t("reason")}/>
      <button className="btn btn-primary" disabled={saving||reason.trim().length<10}
       onClick={()=>changeStatus(action)}>{t("confirm")}</button>
      <button className="btn btn-quiet" onClick={()=>setAction("")}>{t("dismiss")}</button>
     </div>}
     {problem&&<InlineAlert kind="error">{problem==="STALE_APPOINTMENT_REVISION"?t("stale"):
      problem==="APPOINTMENT_SLOT_CONFLICT"?t("timeConflict"):problem}</InlineAlert>}
     {success&&<InlineAlert kind="success">{success}</InlineAlert>}
    </div>
   </div>
  </section>
  <section className="card ph06-timeline-panel">
   <h2>{t("timeline")}</h2>
   <div className="ph06-events">{data.events?.map((ev:any)=><article key={ev.id}>
    <span className="ph06-event-dot" aria-hidden="true"/>
    <div><strong>{t(ev.toStatus||ev.action)}</strong>
     <small>{format(ev.createdAt,{hour:"2-digit",minute:"2-digit"})}</small>
     {ev.reason&&<p>{ev.reason}</p>}
     {ev.action==="rescheduled"&&<p>
      <bdi dir="ltr">{localTime(ev.previousStartAt)}</bdi> →
      <bdi dir="ltr">{localTime(ev.nextStartAt)}</bdi></p>}
    </div>
   </article>)}</div>
  </section>
 </div>;
}
