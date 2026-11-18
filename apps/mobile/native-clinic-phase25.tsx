import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import type {NativeClinicSpace} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 canReadOps,canManageOps,clock,dateInPreviewRange,exceptionPayload,
 fullWeek,kabulToday,parseException,parseHours,parsePreview,parseReadiness,
 parseResource,parseResources,parseService,parseServices,previewPath,
 resourceForm,resourcePayload,saveWeekPayload,serviceForm,servicePayload,
 shiftDate,validWeek,type Availability,type Exception,type ExceptionDraft,
 type Hours,type Readiness,type Resource,type ResourceDraft,type Service,
 type ServiceDraft,type Shift
} from "./native-clinic-phase25-model";

type Locale="en"|"fa-AF"|"ps-AF";
type Subtab="services"|"resources"|"hours"|"exceptions"|"availability";
type LoadState="loading"|"ready"|"error"|"denied";
type Props={clinic:NativeClinicSpace;locale:Locale;request:Phase20Request;
 onOpenWeb:(path:string)=>void};
const localeText={
 en:{
  eyebrow:"PRACTICE OPERATIONS",title:"Clinic operations",
  intro:"Live services, dental chairs, schedules, holidays and available appointment previews.",
  clinic:"Selected clinic",services:"Services & pricing",resources:"Chairs & rooms",
  hours:"Working hours",exceptions:"Holidays & exceptions",availability:"Availability",
  loading:"Loading verified clinic data…",offline:"Could not verify this clinic data. Retry.",
  denied:"This role is not authorized to view operations.",
  save:"Save changes",cancel:"Cancel",refresh:"Refresh",confirm:"Confirm",
  confirmTitle:"Confirm clinic update",confirmBody:"Changes are audited and validated against future appointments.",
  added:"Saved to the clinic server.",invalid:"Check all required fields and time ranges.",
  conflict:"Data changed, a resource already exists, or future appointments conflict. Refresh and review.",
  blocked:"Clinic role, status, plan or the protected release gate prevents this change.",
  uncertain:"The write result is unknown. Refresh the live record before attempting again.",
  needsRefresh:"Refresh and inspect current server records before trying another change.",
  seeWeb:"Open secure clinic web",webInfo:"Full administrative settings are available on clinic web.",
  setup:"Clinic readiness",ready:"Configured for preview",notReady:"Setup incomplete",
  previewOnly:"Live staff availability preview — no appointment is created.",
  bookingGate:"Public booking status is controlled separately; this configuration does not activate patient bookings.",
  activeServices:"Active services",activeChairs:"Active chairs",openDays:"Clinic open days",
  scheduledDoctors:"Scheduled dentists",service:"Service",chair:"Required chair",
  clinicHours:"Clinic hours",dentistHours:"Doctor hours",
  noServices:"No services configured yet.",noResources:"No chairs or rooms configured yet.",
  addService:"Add service",editService:"Edit service",addResource:"Add chair or room",
  editResource:"Edit resource",code:"Unique code",label:"Display name",
  kind:"Type",chairType:"Dental chair",roomType:"Room",equipment:"Equipment (optional)",
  name:"Service name",category:"Category",description:"Description (optional)",
  duration:"Treatment minutes",preparation:"Preparation minutes",price:"Price (AFN)",
  requiresChair:"Requires a dental chair",publicBooking:"Visible for public booking (subject to independent release)",
  active:"Active",inactive:"Inactive",version:"Version",scope:"Clinic-scoped data",
  removeWarning:"Deactivation may be rejected if a future appointment or an active resource schedule uses this item.",
  doctor:"Dentist",availabilityDate:"Date (YYYY-MM-DD)",selectService:"Select a service",
  selectDoctor:"Select an active dentist",chooseChair:"Optional chair filter",
  anyChair:"Any eligible chair",checkSlots:"Check available times",
  slots:"Available times",slotEmpty:"No slots available for this combination.",
  previewStatus:"Availability status",dateHint:"Dates and schedules use Asia/Kabul.",
  readyStatus:"Available",clinic_closed:"Clinic closed",provider_unavailable:"Provider unavailable",
  chair_unavailable:"No eligible chair",holiday_closed:"Closed for holiday",
  fully_booked:"Fully booked",
  noClinicians:"No active clinicians in this clinic.",
  open:"Open",closed:"Closed",start:"Start time",end:"End time",
  weekly:"Weekly schedule",saveHours:"Save 7-day hours",shiftNote:"Existing breaks are retained unless start/end times change. Updates conflicting with future appointments are rejected.",
  clinicWeek:"Clinic opening hours",resourceWeek:"Chair/room specific hours",
  manageClinic:"Clinic",manageResource:"Chair / room",selectResource:"Select a resource",
  resourceHint:"Optional resource hours restrict its appointment availability. Missing days start closed when you first save a schedule.",
  clearResource:"Clear resource schedule",clearInfo:"Removing resource-specific hours restores the standard clinic/provider availability rules.",
  holidayName:"Schedule exception",addException:"Add holiday or special hours",
  closedDay:"Closed days",specialDay:"Special opening hours",
  fromDate:"Start date",toDate:"End date",reason:"Administrative reason (5–200 characters)",
  reasonHint:"Why is the clinic closed or operating special hours?",
  deleteException:"Remove exception",noExceptions:"No holiday exceptions set.",
  exceptionWarning:"Exceptions cannot overlap or invalidate a future booked appointment.",
  mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",
  fri:"Friday",sat:"Saturday",sun:"Sunday",
  clickEdit:"Edit",time:"Time",noDraft:"Select an item or start a new one.",
  closeForm:"Close editor",savedHours:"Clinic schedule saved and reloaded.",
  savedException:"Exception saved and reloaded.",
  savedPreview:"Verified live available slots.",serviceHistory:"Versioned service history is retained on the server.",
  empty:"Nothing configured yet.",readOnly:"Read-only for this role. Owner or manager controls changes.",
  failSoft:"Some sections are unavailable; successfully loaded sections remain usable.",
  paused:"Private data is cleared whenever the app is backgrounded.",
  pending:"Checking availability…",today:"Today",nextDay:"Next day",previousDay:"Previous day",
  openSlots:"candidate slots",outOfRange:"Date must be between today and 365 days from now.",
  timezone:"Asia/Kabul",servicePrice:"Price",publicDisabled:"Not enabled",
  noBooking:"This screen previews times only. Use Appointments to schedule an authorized patient.",
  serviceRevision:"Saving a service edit uses its current version.",
  overlap:"Appointments take priority over schedule changes.",
  noEditing:"This action is available to owners/managers only.",
  safety:"Authorized data and server-confirmed operations only; no patient/clinical data is stored here."
 },
 "fa-AF":{
  eyebrow:"عملیات کلینیک",title:"مدیریت عملیات",
  intro:"خدمات، قیمت، چوکی‌ها، ساعات کاری، رخصتی‌ها و پیش‌نمایش نوبت‌ها.",
  clinic:"کلینیک انتخاب‌شده",services:"خدمات و قیمت‌ها",resources:"چوکی و اتاق",
  hours:"ساعات کاری",exceptions:"رخصتی‌ها",availability:"زمان‌های آزاد",
  loading:"دریافت معلومات واقعی کلینیک…",offline:"معلومات تأیید نشد؛ دوباره تلاش کنید.",
  denied:"این نقش اجازه مشاهده عملیات ندارد.",
  save:"ذخیره",cancel:"لغو",refresh:"تازه‌سازی",confirm:"تأیید",
  confirmTitle:"تأیید تغییرات کلینیک",confirmBody:"تغییرات ثبت و با نوبت‌های آینده بررسی می‌شوند.",
  added:"در سرور کلینیک ذخیره شد.",invalid:"معلومات، قیمت و ساعت‌ها را بررسی کنید.",
  conflict:"اطلاعات تغییر کرده یا نوبت آینده با تغییرات تضاد دارد؛ تازه‌سازی کنید.",
  blocked:"نقش، وضعیت، پلان یا مجوز کاری مانع این عملیات است.",
  uncertain:"نتیجه معلوم نیست؛ پیش از تکرار معلومات سرور را تازه کنید.",
  needsRefresh:"قبل از تکرار، وضعیت سرور را بررسی کنید.",
  seeWeb:"بازکردن وب مصئون",webInfo:"تنظیمات پیشرفته در وب کلینیک موجود است.",
  setup:"آمادگی کلینیک",ready:"برای پیش‌نمایش آماده",notReady:"نیاز به تکمیل",
  previewOnly:"فقط پیش‌نمایش زمان‌های آزاد؛ هیچ نوبتی ثبت نمی‌شود.",
  bookingGate:"فعال‌سازی نوبت عمومی جداگانه بررسی می‌شود؛ این تنظیم آن را فعال نمی‌سازد.",
  activeServices:"خدمات فعال",activeChairs:"چوکی‌های فعال",openDays:"روزهای باز",
  scheduledDoctors:"داکتران دارای ساعت",service:"خدمت",chair:"چوکی ضروری",
  clinicHours:"ساعات کلینیک",dentistHours:"ساعات داکتران",
  noServices:"هنوز خدمتی اضافه نشده است.",noResources:"چوکی یا اتاقی اضافه نشده است.",
  addService:"افزودن خدمت",editService:"ویرایش خدمت",addResource:"افزودن چوکی یا اتاق",
  editResource:"ویرایش وسیله",code:"کود یکتا",label:"نام",
  kind:"نوع",chairType:"چوکی دندان",roomType:"اتاق",equipment:"تجهیزات (اختیاری)",
  name:"نام خدمت",category:"کتگوری",description:"توضیحات (اختیاری)",
  duration:"دقیقه تداوی",preparation:"دقیقه آماده‌سازی",price:"قیمت (افغانی)",
  requiresChair:"به چوکی نیاز دارد",publicBooking:"نمایش برای نوبت عمومی (وابسته به مجوز)",
  active:"فعال",inactive:"غیرفعال",version:"نسخه",scope:"معلومات مخصوص کلینیک",
  removeWarning:"اگر نوبت آینده یا برنامه فعال وجود داشته باشد غیرفعال‌سازی رد می‌شود.",
  doctor:"داکتر",availabilityDate:"تاریخ (YYYY-MM-DD)",selectService:"انتخاب خدمت",
  selectDoctor:"انتخاب داکتر فعال",chooseChair:"فلتر چوکی (اختیاری)",
  anyChair:"هر چوکی مجاز",checkSlots:"جستجوی زمان آزاد",
  slots:"زمان‌های آزاد",slotEmpty:"در این روز وقت آزاد موجود نیست.",
  previewStatus:"حالت زمان",dateHint:"تمام ساعت‌ها به وقت کابل اند.",
  readyStatus:"آزاد",clinic_closed:"کلینیک بسته",provider_unavailable:"داکتر موجود نیست",
  chair_unavailable:"چوکی موجود نیست",holiday_closed:"رخصتی",
  fully_booked:"همه اوقات پُر",
  noClinicians:"داکتر فعال موجود نیست.",open:"باز",closed:"بسته",
  start:"شروع",end:"پایان",weekly:"برنامه هفتگی",saveHours:"ذخیره هفت روز",
  shiftNote:"وقفه‌ها تا زمانی که وقت تغییر نکند حفظ می‌شوند؛ نوبت‌های آینده می‌توانند مانع تغییر شوند.",
  clinicWeek:"ساعات عمومی کلینیک",resourceWeek:"ساعات چوکی/اتاق",
  manageClinic:"کلینیک",manageResource:"چوکی / اتاق",selectResource:"انتخاب وسیله",
  resourceHint:"ساعات وسیله اختیاری است؛ اگر برنامه تازه ثبت کنید، روزهای ثبت‌نشده بسته هستند.",
  clearResource:"پاک‌کردن برنامه وسیله",clearInfo:"حذف برنامه وسیله، محدودیت اضافی آن را برمی‌دارد.",
  holidayName:"استثنای کاری",addException:"افزودن رخصتی یا ساعات خاص",
  closedDay:"کلینیک بسته",specialDay:"ساعات خاص",
  fromDate:"تاریخ شروع",toDate:"تاریخ پایان",reason:"دلیل اداری (۵–۲۰۰ حرف)",
  reasonHint:"دلیل رخصتی یا ساعات خاص را بنویسید.",
  deleteException:"حذف استثنا",noExceptions:"هیچ رخصتی ثبت نشده است.",
  exceptionWarning:"استثنا نباید با رخصتی دیگر یا نوبت آینده تضاد داشته باشد.",
  mon:"دوشنبه",tue:"سه‌شنبه",wed:"چهارشنبه",thu:"پنجشنبه",
  fri:"جمعه",sat:"شنبه",sun:"یکشنبه",
  clickEdit:"ویرایش",time:"زمان",noDraft:"یک مورد انتخاب کنید.",
  closeForm:"بستن فرم",savedHours:"ساعات ذخیره شد.",savedException:"رخصتی ذخیره شد.",
  savedPreview:"وقت‌های آزاد بررسی شدند.",serviceHistory:"تاریخچه تغییرات خدمت در سرور حفظ می‌شود.",
  empty:"هنوز چیزی ثبت نشده.",readOnly:"فقط مشاهده؛ مالک یا مدیر اجازه تغییر دارد.",
  failSoft:"برخی بخش‌ها در دسترس نیستند؛ بخش‌های دیگر فعال می‌مانند.",
  paused:"معلومات خصوصی با رفتن اپ به پس‌زمینه پاک می‌شود.",
  pending:"بررسی وقت‌های آزاد…",today:"امروز",nextDay:"روز بعد",previousDay:"روز قبل",
  openSlots:"وقت پیشنهادی",outOfRange:"تاریخ از امروز تا ۳۶۵ روز آینده باشد.",
  timezone:"وقت کابل",servicePrice:"قیمت",publicDisabled:"غیرفعال",
  noBooking:"این بخش فقط زمان‌ها را نشان می‌دهد؛ ثبت نوبت در بخش نوبت‌ها است.",
  serviceRevision:"تغییر خدمت با نسخه فعلی ثبت می‌شود.",
  overlap:"نوبت‌های آینده بر تغییر ساعات اولویت دارند.",
  noEditing:"فقط مالک یا مدیر این تغییر را انجام می‌دهد.",
  safety:"فقط معلومات واقعی و مجاز؛ معلومات طبی مریض در این صفحه ذخیره نمی‌شود."
 },
 "ps-AF":{
  eyebrow:"د کلینیک چارې",title:"د کلینیک چارې",
  intro:"خدمات، بیې، څوکۍ، کاري وختونه، رخصتۍ او د لیدنې وړ وختونه.",
  clinic:"ټاکلی کلینیک",services:"خدمات او بیې",resources:"څوکۍ او خونې",
  hours:"کاري وختونه",exceptions:"رخصتۍ",availability:"خالي وختونه",
  loading:"د کلینیک معلومات راوړل کېږي…",offline:"معلومات تایید نه شول؛ بیا هڅه وکړئ.",
  denied:"دا رول د کلینیک چارو ته اجازه نه لري.",
  save:"خوندي کول",cancel:"لغوه",refresh:"تازه کول",confirm:"تایید",
  confirmTitle:"د کلینیک بدلون تایید کړئ",confirmBody:"بدلونونه ثبتېږي او له راتلونکو ملاقاتونو سره کتل کېږي.",
  added:"په سرور کې خوندي شول.",invalid:"د فورم معلومات، بیې او ساعتونه سم کړئ.",
  conflict:"معلومات بدل شوي یا له راتلونکو ملاقاتونو سره تضاد شته؛ تازه یې کړئ.",
  blocked:"رول، پلان یا د فعالیت اجازه دا کار نه پرېږدي.",
  uncertain:"پایله روښانه نه ده؛ له بیا هڅې مخکې سرور تازه کړئ.",
  needsRefresh:"له بیا هڅې مخکې د سرور اوسنی حالت وګورئ.",
  seeWeb:"خوندي وېب پرانیزئ",webInfo:"پرمختللي تنظیمات په وېب کې شته.",
  setup:"د کلینیک چمتووالی",ready:"د کتنې لپاره چمتو",notReady:"چمتو نه دی",
  previewOnly:"یوازې د خالي وختونو کتنه؛ ملاقات نه جوړوي.",
  bookingGate:"عامه نوبت ورکول بېل تایید ته اړتیا لري؛ دا ترتیب یې نه فعالوي.",
  activeServices:"فعال خدمات",activeChairs:"فعالې څوکۍ",openDays:"پرانیستې ورځې",
  scheduledDoctors:"مهالوېش لرونکي ډاکټران",service:"خدمت",chair:"اړینه څوکۍ",
  clinicHours:"د کلینیک وختونه",dentistHours:"د ډاکټر وختونه",
  noServices:"تر اوسه خدمت نه شته.",noResources:"تر اوسه څوکۍ یا خونه نه شته.",
  addService:"خدمت زیاتول",editService:"خدمت سمول",addResource:"څوکۍ یا خونه زیاتول",
  editResource:"وسیله سمول",code:"ځانګړی کوډ",label:"نوم",
  kind:"ډول",chairType:"د غاښ څوکۍ",roomType:"خونه",equipment:"وسایل (اختیاري)",
  name:"د خدمت نوم",category:"ډله",description:"تشریح (اختیاري)",
  duration:"د درملنې دقیقې",preparation:"د چمتووالي دقیقې",price:"بیه (افغانۍ)",
  requiresChair:"څوکۍ ته اړتیا لري",publicBooking:"د عامه نوبت لپاره ښودل (د تایید تابع)",
  active:"فعال",inactive:"غیرفعال",version:"نسخه",scope:"یوازې د کلینیک معلومات",
  removeWarning:"راتلونکي ملاقاتونه او فعاله مهالوېشونه د بندولو مخه نیولای شي.",
  doctor:"ډاکټر",availabilityDate:"نېټه (YYYY-MM-DD)",selectService:"خدمت وټاکئ",
  selectDoctor:"فعال ډاکټر وټاکئ",chooseChair:"اختیاري څوکۍ",
  anyChair:"هره وړ څوکۍ",checkSlots:"خالي وختونه وګورئ",
  slots:"خالي وختونه",slotEmpty:"په دې وخت کې خالي ځای نه شته.",
  previewStatus:"د وخت حالت",dateHint:"ټول وختونه د کابل له مخې دي.",
  readyStatus:"خالي",clinic_closed:"کلینیک بند",provider_unavailable:"ډاکټر نشته",
  chair_unavailable:"څوکۍ نشته",holiday_closed:"رخصتي",
  fully_booked:"ټول وختونه ډک",
  noClinicians:"فعال ډاکټر نه شته.",open:"خلاص",closed:"بند",
  start:"پیل",end:"پای",weekly:"اوونیز مهالوېش",saveHours:"اووه ورځې خوندي کړئ",
  shiftNote:"که ساعت بدل نه شي وقفې ساتل کېږي؛ راتلونکي ملاقاتونه خنډ کېدای شي.",
  clinicWeek:"د کلینیک عمومي وختونه",resourceWeek:"د څوکۍ/خونې وختونه",
  manageClinic:"کلینیک",manageResource:"څوکۍ / خونه",selectResource:"وسیله وټاکئ",
  resourceHint:"اضافي ساعتونه اختیاري دي؛ د نوې اوونۍ نه ثبت شوې ورځې تړلې وي.",
  clearResource:"د وسیلې وختونه پاک کړئ",clearInfo:"اضافي وختونه لرې کوي.",
  holidayName:"د وخت استثنا",addException:"رخصتي یا ځانګړی وخت زیاتول",
  closedDay:"تړلې ورځې",specialDay:"ځانګړي وختونه",
  fromDate:"د پیل نېټه",toDate:"د پای نېټه",reason:"اداري دلیل (۵–۲۰۰ توري)",
  reasonHint:"د رخصتۍ یا ځانګړي وخت دلیل ولیکئ.",
  deleteException:"استثنا لرې کول",noExceptions:"رخصتي نه ده ثبت شوې.",
  exceptionWarning:"استثنا له نورو رخصتیو او راتلونکو ملاقاتونو سره تضاد نه شي لرلای.",
  mon:"دوشنبه",tue:"سه شنبه",wed:"چهارشنبه",thu:"پنجشنبه",
  fri:"جمعه",sat:"شنبه",sun:"یکشنبه",
  clickEdit:"سمول",time:"وخت",noDraft:"یو توکی وټاکئ.",
  closeForm:"فورم بند کړئ",savedHours:"وختونه ثبت شول.",savedException:"رخصتي ثبت شوه.",
  savedPreview:"خالي وختونه وکتل شول.",serviceHistory:"د خدمت د بدلون تاریخچه په سرور کې ساتل کېږي.",
  empty:"تر اوسه معلومات نشته.",readOnly:"یوازې کتنه؛ مالک یا مدیر یې بدلوي.",
  failSoft:"ځینې برخې نشته؛ نورې فعالې دي.",
  paused:"شخصي معلومات د اپ له شالید سره پاکېږي.",
  pending:"وختونه کتل کېږي…",today:"نن",nextDay:"بله ورځ",previousDay:"مخکینۍ ورځ",
  openSlots:"وړاندیز شوي وختونه",outOfRange:"نېټه له نن څخه تر ۳۶۵ ورځو پورې وي.",
  timezone:"د کابل وخت",servicePrice:"بیه",publicDisabled:"بند",
  noBooking:"دا برخه یوازې وختونه ښيي؛ د ملاقات ثبت په ملاقاتونو کې کېږي.",
  serviceRevision:"خدمت د اوسني نسخې له مخې خوندي کېږي.",
  overlap:"راتلونکي ملاقاتونه تر مهالویش بدلون مهم دي.",
  noEditing:"دا کار یوازې مالک یا مدیر کولای شي.",
  safety:"یوازې مجاز معلومات؛ د ناروغ طبي معلومات دلته نه ساتل کېږي."
 }
} as const;
type Words={[K in keyof typeof localeText.en]:string};
const days=["sat","sun","mon","tue","wed","thu","fri"] as const;
const slotStatus=["ready","clinic_closed","provider_unavailable","chair_unavailable",
 "holiday_closed","fully_booked"] as const;
const startOptions=Array.from({length:33},(_,i)=>420+i*15);
const endOptions=Array.from({length:35},(_,i)=>570+i*15);
const exStartOptions=Array.from({length:31},(_,i)=>420+i*30);
const exEndOptions=Array.from({length:31},(_,i)=>540+i*30);
type Confirmable="service"|"resource"|"hours"|"exception"|"exception-delete"|"resource-clear";
const emptyException=(today:string):ExceptionDraft=>({
 startDate:today,endDate:today,kind:"closed",startMinute:540,endMinute:1020,reason:""
});
function Card({title,hint,children}:{title:string;hint?:string;children:React.ReactNode}){
 return <View style={s.card}><Text style={s.cardTitle}>{title}</Text>
  {hint&&<Text style={s.caption}>{hint}</Text>}{children}</View>;
}
function Button({label,onPress,secondary=false,danger=false,disabled=false,icon}:{
 label:string;onPress:()=>void;secondary?:boolean;danger?:boolean;disabled?:boolean;
 icon?:PatientIconName}){
 return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
  accessibilityState={{disabled}} style={({pressed})=>[
   s.button,secondary&&s.buttonAlt,danger&&s.buttonDanger,
   disabled&&s.disabled,pressed&&s.pressed]}>
  {icon&&<PatientIcon name={icon} size={17} color={secondary?"#1f689b":
   danger?"#aa434f":"#fff"}/>}
  <Text style={[s.buttonText,secondary&&s.buttonAltText,danger&&s.buttonDangerText]}>
   {label}</Text></Pressable>;
}
function Field({label,value,onChange,keyboard="default",multiline=false,max=250,
 placeholder}:{
 label:string;value:string;onChange:(v:string)=>void;
 keyboard?:"default"|"numeric";multiline?:boolean;max?:number;placeholder?:string}){
 return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>
  <TextInput accessibilityLabel={label} style={[s.input,multiline&&s.multiline]}
   value={value} onChangeText={onChange} maxLength={max} autoCorrect={false}
   keyboardType={keyboard} multiline={multiline}
   placeholder={placeholder||label} placeholderTextColor="#95a9b9"/></View>;
}
function Chip<T extends string|number>({options,value,onChange,disabled=false}:{
 options:{value:T;label:string}[];value:T;onChange:(v:T)=>void;disabled?:boolean}){
 return <View style={s.chips}>{options.map(item=>
  <Pressable key={String(item.value)} disabled={disabled} accessibilityRole="button"
   accessibilityState={{selected:value===item.value,disabled}}
   onPress={()=>onChange(item.value)} style={[s.chip,value===item.value&&s.chipOn,
    disabled&&s.disabled]}>
   <Text style={[s.chipText,value===item.value&&s.chipTextOn]}>{item.label}</Text>
  </Pressable>)}</View>;
}
function Toggle({label,value,onChange,disabled=false}:{label:string;value:boolean;
 onChange:()=>void;disabled?:boolean}){
 return <Pressable disabled={disabled} accessibilityRole="switch"
  accessibilityState={{checked:value,disabled}} onPress={onChange}
  style={s.toggleRow}><Text style={s.toggleText}>{label}</Text>
  <View style={[s.switch,value&&s.switchOn]}>
   <View style={[s.switchDot,value&&s.switchDotOn]}/></View></Pressable>;
}
function Pair({label,value}:{label:string;value:string}){
 return <View style={s.pair}><Text style={s.pairLabel}>{label}</Text>
  <Text style={s.pairValue}>{value}</Text></View>;
}
function stateOf(error:unknown):LoadState{
 const status=error&&typeof error==="object"&&"status" in error?
  (error as {status?:unknown}).status:null;
 return status===401||status===403?"denied":"error";
}
function errText(error:unknown,t:Words){
 const status=error&&typeof error==="object"&&"status" in error?
  (error as {status?:unknown}).status:null;
 if(status===401||status===403||status===503)return t.blocked;
 if(status===409||status===422||status===404)return t.conflict;
 return t.uncertain;
}
const withStart=(saved:number,options:number[])=>
 [...new Set([saved,...options])].sort((a,b)=>a-b);
export function NativeClinicPhase25({clinic,locale,request,onOpenWeb}:Props){
 const t=localeText[locale],manage=canManageOps(clinic.role);
 const read=canReadOps(clinic.role);
 const [section,setSection]=useState<Subtab>("services");
 const [services,setServices]=useState<Service[]|null>(null);
 const [resources,setResources]=useState<Resource[]|null>(null);
 const [hours,setHours]=useState<Hours|null>(null);
 const [readiness,setReadiness]=useState<Readiness|null>(null);
 const [states,setStates]=useState<Record<"services"|"resources"|"hours"|"readiness",LoadState>>({
  services:"loading",resources:"loading",hours:"loading",readiness:"loading"});
 const [serviceEditing,setServiceEditing]=useState<Service|null|undefined>(undefined);
 const [resourceEditing,setResourceEditing]=useState<Resource|null|undefined>(undefined);
 const [serviceDraft,setServiceDraft]=useState<ServiceDraft>(serviceForm());
 const [resourceDraft,setResourceDraft]=useState<ResourceDraft>(resourceForm());
 const [scheduleTarget,setScheduleTarget]=useState<"clinic"|"resource">("clinic");
 const [targetResource,setTargetResource]=useState<string>("");
 const [week,setWeek]=useState<Shift[]|null>(null);
 const [weekChanged,setWeekChanged]=useState(false);
 const [expandedDay,setExpandedDay]=useState<number|null>(null);
 const [exceptionDraft,setExceptionDraft]=useState<ExceptionDraft>(emptyException(kabulToday()));
 const [exceptionEditing,setExceptionEditing]=useState(false);
 const [exceptionDelete,setExceptionDelete]=useState<Exception|null>(null);
 const [deleteReason,setDeleteReason]=useState("");
 const [date,setDate]=useState(kabulToday());
 const [providerId,setProviderId]=useState("");
 const [serviceId,setServiceId]=useState("");
 const [previewResourceId,setPreviewResourceId]=useState<string|null>(null);
 const [preview,setPreview]=useState<Availability|null>(null);
 const [previewState,setPreviewState]=useState<LoadState>("ready");
 const [busy,setBusy]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [foreground,setForeground]=useState(!["background","inactive"].includes(AppState.currentState));
 const live=useRef(true),mounted=useRef(true),seq=useRef({read:0,preview:0});
 const root="/v1/operations/clinics/"+encodeURIComponent(clinic.clinicId);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;seq.current.read++;
  seq.current.preview++}},[]);
 const wipe=()=>{
  setServices(null);setResources(null);setHours(null);setReadiness(null);
  setServiceEditing(undefined);setResourceEditing(undefined);
  setServiceDraft(serviceForm());setResourceDraft(resourceForm());
  setExceptionEditing(false);setExceptionDelete(null);
  setDeleteReason("");setExceptionDraft(emptyException(kabulToday()));
  setWeek(null);setWeekChanged(false);setExpandedDay(null);setPreview(null);setProviderId("");
  setServiceId("");setPreviewResourceId(null);setDate(kabulToday());
  setError("");setSuccess("");setUncertain(false);
 };
 useEffect(()=>{
  const sub=AppState.addEventListener("change",state=>{
   if(state==="active"){live.current=true;setForeground(true);setRefreshKey(x=>x+1)}
   else{live.current=false;setForeground(false);wipe()}
  });return()=>sub.remove();
 },[]);
 const refresh=()=>{
  if(busy)return;
  setUncertain(false);setError("");setSuccess("");setPreview(null);
  setServiceEditing(undefined);setResourceEditing(undefined);
  setExceptionEditing(false);setExceptionDelete(null);setWeekChanged(false);
  setWeek(null);setRefreshKey(x=>x+1);
 };
 useEffect(()=>{
  if(!read||!foreground){
   setServices(null);setResources(null);setHours(null);setReadiness(null);return
  }
  const ac=new AbortController(),generation=++seq.current.read;
  setServices(null);setResources(null);setHours(null);setReadiness(null);
  setStates({services:"loading",resources:"loading",hours:"loading",readiness:"loading"});
  const run=async()=>{
   const paths=["/services","/resources","/hours","/summary"] as const;
   const outcomes=await Promise.allSettled(paths.map(path=>
    request<unknown>(root+path,"GET",undefined,ac.signal)));
   if(ac.signal.aborted||!live.current||!mounted.current||
    generation!==seq.current.read)return;
   const check=(index:number,parse:(x:unknown)=>unknown,
    apply:(x:any)=>void,key:"services"|"resources"|"hours"|"readiness")=>{
    const result=outcomes[index];
    if(result.status!=="fulfilled"){
     setStates(before=>({...before,[key]:stateOf(result.reason)}));return;
    }
    const value=parse(result.value);
    setStates(before=>({...before,[key]:value===null?"error":"ready"}));
    apply(value);
   };
   check(0,x=>parseServices(x,clinic.clinicId),setServices,"services");
   check(1,x=>parseResources(x,clinic.clinicId),setResources,"resources");
   check(2,x=>parseHours(x,clinic.clinicId),setHours,"hours");
   check(3,parseReadiness,setReadiness,"readiness");
  };
  void run();
  return()=>{ac.abort();seq.current.read++};
 },[clinic.clinicId,request,refreshKey,read,foreground]);
 useEffect(()=>{
  if(!hours||!resources){setWeek(null);setWeekChanged(false);return}
  if(scheduleTarget==="resource"&&!targetResource){
   const first=resources.find(x=>x.active)?.id||resources[0]?.id||"";
   setTargetResource(first);
   if(!first){setWeek(null);return}
  }
  const target=scheduleTarget==="clinic"?null:
   (resources.some(x=>x.id===targetResource)?targetResource:resources[0]?.id||"");
  if(scheduleTarget==="resource"&&!target){setWeek(null);return}
  setWeek(fullWeek(target===null?hours.clinic:hours.resourceHours[target]||[]));
  setWeekChanged(false);setExpandedDay(null);
 },[hours,resources,scheduleTarget,targetResource]);
 useEffect(()=>{
  setPreview(null);setPreviewState("ready");seq.current.preview++;
 },[date,serviceId,providerId,previewResourceId,section]);
 const choose=(tab:Subtab)=>{
  if(busy)return;
  setSection(tab);setError("");setSuccess("");
  setServiceEditing(undefined);setResourceEditing(undefined);
  setExceptionEditing(false);setExceptionDelete(null);setWeekChanged(false);
 };
 const startService=(item:Service|null)=>{
  if(!manage||busy||uncertain)return;
  setServiceEditing(item);setServiceDraft(serviceForm(item));
  setError("");setSuccess("");
 };
 const startResource=(item:Resource|null)=>{
  if(!manage||busy||uncertain)return;
  setResourceEditing(item);setResourceDraft(resourceForm(item));
  setError("");setSuccess("");
 };
 const mutate=async(path:string,method:"POST"|"PATCH"|"PUT"|"DELETE",payload:unknown,
  validate:(raw:unknown)=>boolean,after:()=>void,note=t.added)=>{
  if(!manage||busy||uncertain||!live.current||!mounted.current)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await request<unknown>(path,method,payload);
   if(!mounted.current||!live.current)return;
   if(!validate(response))throw Error("UNVERIFIED_MUTATION_RESPONSE");
   after();setUncertain(false);setSuccess(note);setRefreshKey(x=>x+1);
  }catch(e){
   if(mounted.current&&live.current){
    setUncertain(true);setError(errText(e,t));
   }
  }finally{if(mounted.current)setBusy(false)}
 };
 const confirmMutation=(category:Confirmable,detail:string,action:()=>void)=>{
  if(!manage||busy||uncertain||!live.current)return;
  Alert.alert(t.confirmTitle,t.confirmBody+"\n"+detail,[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,style:category==="exception-delete"||category==="resource-clear"?
    "destructive":"default",onPress:()=>{if(live.current&&mounted.current)action()}}
  ]);
 };
 const saveService=()=>{
  if(serviceEditing===undefined)return;
  const d=servicePayload(serviceDraft,serviceEditing);
  if(!d){setError(t.invalid);return}
  const old=serviceEditing;
  confirmMutation("service",d.name+" · "+d.basePriceAfn+" AFN",()=>{
   const path=root+"/services"+(old?"/"+encodeURIComponent(old.id):"");
   void mutate(path,old?"PATCH":"POST",d,raw=>{
    const r=raw&&typeof raw==="object"&&"service" in raw?
     (raw as {service:unknown}).service:null;
    const parsed=parseService(r,clinic.clinicId);
    return parsed!==null&&parsed.name===d.name&&parsed.basePriceAfn===d.basePriceAfn&&
     (!old||parsed.id===old.id&&parsed.version>old.version);
   },()=>{setServiceEditing(undefined);setServiceDraft(serviceForm())});
  });
 };
 const saveResource=()=>{
  if(resourceEditing===undefined)return;
  const d=resourcePayload(resourceDraft,resourceEditing);
  if(!d){setError(t.invalid);return}
  const old=resourceEditing;
  confirmMutation("resource",d.label+" · "+d.code,()=>{
   const path=root+"/resources"+(old?"/"+encodeURIComponent(old.id):"");
   void mutate(path,old?"PATCH":"POST",d,raw=>{
    const r=raw&&typeof raw==="object"&&"resource" in raw?
     (raw as {resource:unknown}).resource:null;
    const parsed=parseResource(r,clinic.clinicId);
    return parsed!==null&&parsed.code===d.code&&parsed.label===d.label&&
     (!old||parsed.id===old.id&&parsed.revision>old.revision);
   },()=>{setResourceEditing(undefined);setResourceDraft(resourceForm())});
  });
 };
 const editShift=(day:number,key:"isOpen"|"startMinute"|"endMinute",v:number|boolean)=>{
  if(!manage||busy||uncertain)return;
  setWeek(before=>before?.map(row=>{
   if(row.weekday!==day)return row;
   if(key==="isOpen")return {...row,isOpen:Boolean(v)};
   return {...row,[key]:v,breaks:[]};
  })||null);
  setWeekChanged(true);
 };
 const saveHours=()=>{
  const payload=week&&saveWeekPayload(week);
  const target=scheduleTarget==="clinic"?null:targetResource;
  if(!payload||!hours||target!==null&&!resources?.some(x=>x.id===target)){
   setError(t.invalid);return;
  }
  confirmMutation("hours",t.shiftNote,()=>{
   const path=root+"/hours/"+(target===null?"clinic":
    "resources/"+encodeURIComponent(target));
   void mutate(path,"PUT",payload,raw=>parseHours(raw,clinic.clinicId)!==null,
    ()=>{setWeekChanged(false);setWeek(null)},t.savedHours);
  });
 };
 const clearResource=()=>{
  if(!hours||!targetResource||!(hours.resourceHours[targetResource]?.length))return;
  confirmMutation("resource-clear",t.clearInfo,()=>{
   void mutate(root+"/hours/resources/"+encodeURIComponent(targetResource),
    "DELETE",undefined,raw=>parseHours(raw,clinic.clinicId)!==null,
    ()=>{setWeekChanged(false);setWeek(null)},t.savedHours);
  });
 };
 const saveException=()=>{
  const payload=exceptionPayload(exceptionDraft);
  if(!payload){setError(t.invalid);return}
  confirmMutation("exception",payload.startDate+" → "+payload.endDate,()=>{
   void mutate(root+"/exceptions","POST",payload,raw=>{
    const result=raw&&typeof raw==="object"&&"exception" in raw?
     (raw as {exception:unknown}).exception:null;
    const parsed=parseException(result,clinic.clinicId);
    return parsed!==null&&parsed.startDate===payload.startDate&&
     parsed.endDate===payload.endDate;
   },()=>{setExceptionEditing(false);setExceptionDraft(emptyException(kabulToday()))},
    t.savedException);
  });
 };
 const removeException=()=>{
  if(!exceptionDelete||deleteReason.trim().length<5||deleteReason.trim().length>200){
   setError(t.invalid);return;
  }
  const record=exceptionDelete;
  confirmMutation("exception-delete",record.startDate+"–"+record.endDate,()=>{
   void mutate(root+"/exceptions/"+encodeURIComponent(record.id),
    "DELETE",{reason:deleteReason.trim()},
    raw=>raw!==null&&typeof raw==="object"&&
     (raw as {deleted?:unknown}).deleted===true,
    ()=>{setExceptionDelete(null);setDeleteReason("")},t.savedException);
  });
 };
 const checkAvailability=(ids:{serviceId:string;providerId:string;resourceId:string|null})=>{
  if(!read||!dateInPreviewRange(date)||!ids.serviceId||!ids.providerId){
   setError(t.outOfRange);return;
  }
  setPreview(null);setPreviewState("loading");setError("");
  const current=++seq.current.preview;
  const ac=new AbortController();
  const expected={clinicId:clinic.clinicId,date,serviceId:ids.serviceId,
   providerId:ids.providerId,resourceId:ids.resourceId};
  const path=previewPath(clinic.clinicId,date,ids.serviceId,
   ids.providerId,ids.resourceId);
  void request<unknown>(path,"GET",undefined,ac.signal).then(raw=>{
   if(!mounted.current||!live.current||current!==seq.current.preview)return;
   const parsed=parsePreview(raw,expected);
   setPreview(parsed);setPreviewState(parsed?"ready":"error");
  }).catch(e=>{
   if(!mounted.current||!live.current||current!==seq.current.preview)return;
   setPreviewState(stateOf(e));
  });
 };
 const list=services||[],inventory=resources||[];
 const liveServices=list.filter(x=>x.active);
 const liveProviders=hours?.providers||[];
 const liveChairs=inventory.filter(x=>x.active&&x.kind==="chair");
 const selectedService=liveServices.find(x=>x.id===serviceId)||liveServices[0]||null;
 const selectedProvider=liveProviders.find(x=>x.membershipId===providerId)||
  liveProviders[0]||null;
 const selectedPreviewService=selectedService?.id||"";
 const selectedPreviewProvider=selectedProvider?.membershipId||"";
 const weekTarget=resources?.find(x=>x.id===targetResource);
 const availableChairs=selectedService?.requiresChair?liveChairs:[];
 const effectiveChair=availableChairs.some(x=>x.id===previewResourceId)?
  previewResourceId:null;
 const statusLabel=(state:LoadState)=>state==="loading"?t.loading:
  state==="denied"?t.denied:t.offline;
 if(!read)return <Card title={t.title}><Text style={s.error}>{t.denied}</Text></Card>;
 return <View style={s.root}>
  <View style={s.hero}>
   <View style={s.eyebrowRow}><PatientIcon name="clinic" color="#7eddd4" size={18}/>
    <Text style={s.eyebrow}>{t.eyebrow}</Text></View>
   <Text style={s.heroTitle}>{t.title}</Text>
   <Text style={s.heroBody}>{t.intro}</Text>
   <Text style={s.heroClinic} numberOfLines={1}>{clinic.clinicName}</Text>
  </View>
  <View style={s.topActions}>
   <Button label={t.refresh} icon="clock" secondary onPress={refresh} disabled={busy}/>
   <Button label={t.seeWeb} icon="shield" secondary onPress={()=>
    onOpenWeb("/clinic/services?clinic="+encodeURIComponent(clinic.clinicId))}/>
  </View>
  {error!==""&&<Text style={s.error} accessibilityRole="alert">{error}</Text>}
  {success!==""&&<Text style={s.success} accessibilityRole="alert">{success}</Text>}
  {uncertain&&<Text style={s.warning}>{t.needsRefresh}</Text>}
  {!manage&&<Text style={s.notice}>{t.readOnly}</Text>}
  <Card title={t.setup} hint={t.bookingGate}>
   {states.readiness!=="ready"||!readiness?
    <Text style={s.caption}>{statusLabel(states.readiness)}</Text>:
    <View style={s.stack}>
     <View style={s.metrics}>
      {[
        {label:t.activeServices,value:readiness.services},
        {label:t.activeChairs,value:readiness.chairs},
        {label:t.openDays,value:readiness.openDays},
        {label:t.scheduledDoctors,value:readiness.scheduledDentists}
       ].map((metric,i)=>
       <View key={i} style={s.metric}><Text style={s.metricValue}>{metric.value}</Text>
        <Text style={s.metricLabel}>{metric.label}</Text></View>)}
     </View>
     <Text style={[s.status,s.statusBg]}>
      {readiness.readyForPreview?t.ready:t.notReady}</Text>
     {readiness.checklist.map(item=><View key={item.key} style={s.checkRow}>
      <PatientIcon name={item.done?"check":"close"} size={17}
       color={item.done?"#178265":"#ab6d41"}/>
      <Text style={s.checkLabel}>{t[item.key]}</Text></View>)}
     {readiness.publicBookingsEnabled===false&&<Text style={s.caption}>
      {t.publicDisabled}: {t.bookingGate}</Text>}
    </View>}
  </Card>
  <View style={s.tabRows}>
   {(["services","resources","hours","exceptions","availability"] as const).map(x=>
    <Pressable key={x} accessibilityRole="tab" accessibilityState={{selected:section===x}}
     onPress={()=>choose(x)} style={[s.tab,section===x&&s.tabOn]}>
     <Text style={[s.tabText,section===x&&s.tabTextOn]}>{t[x]}</Text>
    </Pressable>)}
  </View>
  {section==="services"&&<View style={s.stack}>
   <Card title={t.services} hint={t.serviceHistory}>
    {manage&&<Button label={t.addService} icon="plus" disabled={busy||uncertain}
     onPress={()=>startService(null)}/>}
    {states.services==="loading"?<ActivityIndicator color="#2368a1"/>:
     states.services!=="ready"?<Text style={s.error}>{statusLabel(states.services)}</Text>:
     list.length===0?<Text style={s.empty}>{t.noServices}</Text>:
     list.map(row=><View key={row.id} style={s.catalogRow}>
      <View style={s.catalogTitle}><View style={s.catalogIcon}>
       <PatientIcon name="tooth" color="#2d689c" size={20}/></View>
       <View style={s.flex}><Text style={s.itemName}>{row.name}</Text>
        <Text style={s.caption}>{row.category} · {row.durationMinutes}+{row.preparationMinutes} min</Text>
       </View><Text style={s.price}>{row.basePriceAfn} AFN</Text></View>
      <View style={s.badges}>
       <Text style={[s.badge,row.active?s.badgeActive:s.badgeInactive]}>
        {row.active?t.active:t.inactive}</Text>
       <Text style={s.badge}>{t.version} {row.version}</Text>
       {row.requiresChair&&<Text style={s.badge}>{t.chair}</Text>}
      </View>
      {manage&&<Button secondary label={t.editService} disabled={busy||uncertain}
       onPress={()=>startService(row)}/>}
     </View>)}
   </Card>
   {serviceEditing!==undefined&&manage&&<Card title={serviceEditing?t.editService:t.addService}
    hint={t.removeWarning}>
    <Field label={t.name} max={100} value={serviceDraft.name}
     onChange={v=>setServiceDraft(x=>({...x,name:v}))}/>
    <Field label={t.category} max={60} value={serviceDraft.category}
     onChange={v=>setServiceDraft(x=>({...x,category:v}))}/>
    <Field label={t.description} max={700} multiline value={serviceDraft.description}
     onChange={v=>setServiceDraft(x=>({...x,description:v}))}/>
    <Field label={t.duration} keyboard="numeric" max={4} value={serviceDraft.durationMinutes}
     onChange={v=>setServiceDraft(x=>({...x,durationMinutes:v}))}/>
    <Field label={t.preparation} keyboard="numeric" max={4} value={serviceDraft.preparationMinutes}
     onChange={v=>setServiceDraft(x=>({...x,preparationMinutes:v}))}/>
    <Field label={t.price} keyboard="numeric" max={8} value={serviceDraft.basePriceAfn}
     onChange={v=>setServiceDraft(x=>({...x,basePriceAfn:v}))}/>
    <Toggle label={t.requiresChair} value={serviceDraft.requiresChair}
     onChange={()=>setServiceDraft(x=>({...x,requiresChair:!x.requiresChair}))}/>
    <Toggle label={t.publicBooking} value={serviceDraft.publicBooking}
     onChange={()=>setServiceDraft(x=>({...x,publicBooking:!x.publicBooking}))}/>
    <Toggle label={t.active} value={serviceDraft.active}
     onChange={()=>setServiceDraft(x=>({...x,active:!x.active}))}/>
    <Button label={t.save} icon="check" disabled={busy||uncertain||
     !servicePayload(serviceDraft,serviceEditing)} onPress={saveService}/>
    <Button secondary label={t.cancel} disabled={busy}
     onPress={()=>setServiceEditing(undefined)}/>
   </Card>}
  </View>}
  {section==="resources"&&<View style={s.stack}>
   <Card title={t.resources} hint={t.removeWarning}>
    {manage&&<Button label={t.addResource} icon="plus" disabled={busy||uncertain}
     onPress={()=>startResource(null)}/>}
    {states.resources==="loading"?<ActivityIndicator color="#2368a1"/>:
     states.resources!=="ready"?<Text style={s.error}>{statusLabel(states.resources)}</Text>:
     inventory.length===0?<Text style={s.empty}>{t.noResources}</Text>:
     inventory.map(row=><View key={row.id} style={s.catalogRow}>
      <View style={s.catalogTitle}><View style={s.catalogIcon}>
       <PatientIcon name="clinic" color="#24679a" size={19}/></View>
       <View style={s.flex}><Text style={s.itemName}>{row.label}</Text>
        <Text style={s.caption}>{row.code} · {row.kind==="chair"?t.chairType:t.roomType}</Text>
       </View></View>
      <View style={s.badges}><Text style={[s.badge,row.active?s.badgeActive:s.badgeInactive]}>
       {row.active?t.active:t.inactive}</Text>
       <Text style={s.badge}>{t.version} {row.revision}</Text></View>
      {row.equipment&&<Text style={s.caption}>{row.equipment}</Text>}
      {manage&&<Button secondary label={t.editResource} disabled={busy||uncertain}
       onPress={()=>startResource(row)}/>}
     </View>)}
   </Card>
   {resourceEditing!==undefined&&manage&&<Card
    title={resourceEditing?t.editResource:t.addResource} hint={t.removeWarning}>
    <Field label={t.code} value={resourceDraft.code} max={24}
     onChange={v=>setResourceDraft(x=>({...x,code:v}))}/>
    <Field label={t.label} value={resourceDraft.label} max={50}
     onChange={v=>setResourceDraft(x=>({...x,label:v}))}/>
    <Text style={s.fieldLabel}>{t.kind}</Text>
    <Chip value={resourceDraft.kind} onChange={v=>setResourceDraft(x=>({...x,kind:v}))}
     options={[{value:"chair",label:t.chairType},{value:"room",label:t.roomType}]}/>
    <Field label={t.equipment} value={resourceDraft.equipment} max={200}
     onChange={v=>setResourceDraft(x=>({...x,equipment:v}))}/>
    <Toggle label={t.active} value={resourceDraft.active}
     onChange={()=>setResourceDraft(x=>({...x,active:!x.active}))}/>
    <Button label={t.save} icon="check" disabled={busy||uncertain||
     !resourcePayload(resourceDraft,resourceEditing)} onPress={saveResource}/>
    <Button label={t.cancel} secondary disabled={busy}
     onPress={()=>setResourceEditing(undefined)}/>
   </Card>}
  </View>}
  {section==="hours"&&<Card title={t.weekly} hint={t.shiftNote}>
   {states.hours==="loading"?<ActivityIndicator color="#2368a1"/>:
    states.hours!=="ready"||!hours?<Text style={s.error}>{statusLabel(states.hours)}</Text>:
    <View style={s.stack}>
     <Text style={s.fieldLabel}>{t.scope} · {t.timezone}</Text>
     <Chip value={scheduleTarget} disabled={busy} onChange={v=>setScheduleTarget(v)}
      options={[{value:"clinic",label:t.manageClinic},
       {value:"resource",label:t.manageResource}]}/>
     {scheduleTarget==="resource"&&<View style={s.stack}>
      <Text style={s.fieldLabel}>{t.selectResource}</Text>
      {!inventory.length?<Text style={s.empty}>{t.noResources}</Text>:
       <Chip value={targetResource} onChange={v=>setTargetResource(v)}
        disabled={busy} options={inventory.map(x=>({value:x.id,label:x.label}))}/>}
      <Text style={s.caption}>{t.resourceHint}</Text>
     </View>}
     {week?.map(day=><View key={day.weekday} style={s.dayCard}>
      <View style={s.dayTop}><Text style={s.dayName}>{t[days[day.weekday]]}</Text>
       <Pressable accessibilityRole="switch" accessibilityState={{checked:day.isOpen,
        disabled:!manage||busy||uncertain}}
        onPress={()=>editShift(day.weekday,"isOpen",!day.isOpen)}
        disabled={!manage||busy||uncertain}
        style={[s.daySwitch,day.isOpen&&s.daySwitchOn]}>
        <Text style={[s.daySwitchText,day.isOpen&&s.daySwitchTextOn]}>
         {day.isOpen?t.open:t.closed}</Text></Pressable>
      </View>
      {day.isOpen&&<View style={s.stack}>
       <View style={s.timeSummary}>
        <Text style={s.timeSummaryText}>{clock(day.startMinute)}–{clock(day.endMinute)}</Text>
        {manage&&<Button label={expandedDay===day.weekday?t.closeForm:t.clickEdit}
         secondary onPress={()=>setExpandedDay(x=>x===day.weekday?null:day.weekday)}/>}
       </View>
       {manage&&expandedDay===day.weekday&&<View style={s.stack}>
        <Text style={s.caption}>{t.start} · {clock(day.startMinute)}</Text>
        <Chip value={day.startMinute} disabled={busy||uncertain}
         onChange={v=>editShift(day.weekday,"startMinute",v)}
         options={withStart(day.startMinute,startOptions).filter(x=>x<day.endMinute)
          .map(x=>({value:x,label:clock(x)}))}/>
        <Text style={s.caption}>{t.end} · {clock(day.endMinute)}</Text>
        <Chip value={day.endMinute} disabled={busy||uncertain}
         onChange={v=>editShift(day.weekday,"endMinute",v)}
         options={withStart(day.endMinute,endOptions).filter(x=>x>day.startMinute)
          .map(x=>({value:x,label:clock(x)}))}/>
       </View>}
       {day.breaks.length>0&&<Text style={s.caption}>
        {day.breaks.map(b=>clock(b.start)+"–"+clock(b.end)).join(" · ")}</Text>}
      </View>}
     </View>)}
     {manage&&<Button label={t.saveHours} icon="check" onPress={saveHours}
      disabled={!weekChanged||!week||!validWeek(week)||busy||uncertain}/>}
     {manage&&scheduleTarget==="resource"&&Boolean(hours.resourceHours[targetResource]?.length)&&
      <Button label={t.clearResource} danger onPress={clearResource}
       disabled={busy||uncertain}/>}
     {!manage&&<Text style={s.notice}>{t.readOnly}</Text>}
    </View>}
  </Card>}
  {section==="exceptions"&&<View style={s.stack}>
   <Card title={t.exceptions} hint={t.exceptionWarning}>
    {manage&&<Button label={t.addException} icon="plus"
     disabled={busy||uncertain} onPress={()=>{setExceptionEditing(true);
      setExceptionDraft(emptyException(kabulToday()));setError("")}}/>}
    {states.hours==="loading"?<ActivityIndicator color="#2368a1"/>:
     states.hours!=="ready"||!hours?<Text style={s.error}>{statusLabel(states.hours)}</Text>:
     hours.exceptions.length===0?<Text style={s.empty}>{t.noExceptions}</Text>:
     hours.exceptions.map(row=><View style={s.catalogRow} key={row.id}>
      <View style={s.catalogTitle}><PatientIcon name="calendar" color="#1b719e" size={21}/>
       <View style={s.flex}><Text style={s.itemName}>{row.kind==="closed"?
        t.closedDay:t.specialDay}</Text>
        <Text style={s.caption}>{row.startDate} → {row.endDate}</Text>
       </View></View>
      <Text style={s.caption}>{row.reason}</Text>
      {row.kind==="special_hours"&&<Text style={s.caption}>
       {clock(row.startMinute||0)}–{clock(row.endMinute||0)}</Text>}
      {manage&&<Button label={t.deleteException} danger disabled={busy||uncertain}
       onPress={()=>{setExceptionDelete(row);setDeleteReason("");setError("")}}/>}
     </View>)}
   </Card>
   {exceptionEditing&&manage&&<Card title={t.addException} hint={t.exceptionWarning}>
    <Text style={s.fieldLabel}>{t.kind}</Text>
    <Chip value={exceptionDraft.kind}
     onChange={v=>setExceptionDraft(x=>({...x,kind:v}))}
     options={[{value:"closed",label:t.closedDay},
      {value:"special_hours",label:t.specialDay}]}/>
    <Field label={t.fromDate} value={exceptionDraft.startDate}
     placeholder="YYYY-MM-DD" max={10}
     onChange={v=>setExceptionDraft(x=>({...x,startDate:v}))}/>
    <Field label={t.toDate} value={exceptionDraft.endDate}
     placeholder="YYYY-MM-DD" max={10}
     onChange={v=>setExceptionDraft(x=>({...x,endDate:v}))}/>
    {exceptionDraft.kind==="special_hours"&&<View style={s.stack}>
     <Text style={s.fieldLabel}>{t.start} · {clock(exceptionDraft.startMinute)}</Text>
     <Chip value={exceptionDraft.startMinute}
      onChange={v=>setExceptionDraft(x=>({...x,startMinute:v}))}
      options={exStartOptions.filter(x=>x<exceptionDraft.endMinute)
       .map(x=>({value:x,label:clock(x)}))}/>
     <Text style={s.fieldLabel}>{t.end} · {clock(exceptionDraft.endMinute)}</Text>
     <Chip value={exceptionDraft.endMinute}
      onChange={v=>setExceptionDraft(x=>({...x,endMinute:v}))}
      options={exEndOptions.filter(x=>x>exceptionDraft.startMinute)
       .map(x=>({value:x,label:clock(x)}))}/>
    </View>}
    <Field label={t.reason} value={exceptionDraft.reason} max={200}
     onChange={v=>setExceptionDraft(x=>({...x,reason:v}))}/>
    <Button label={t.save} onPress={saveException}
     disabled={busy||uncertain||!exceptionPayload(exceptionDraft)}/>
    <Button label={t.cancel} secondary disabled={busy}
     onPress={()=>setExceptionEditing(false)}/>
   </Card>}
   {exceptionDelete&&manage&&<Card title={t.deleteException}
    hint={exceptionDelete.startDate+" → "+exceptionDelete.endDate}>
    <Field label={t.reason} value={deleteReason} onChange={setDeleteReason}
     max={200}/>
    <Button label={t.deleteException} danger
     disabled={busy||uncertain||deleteReason.trim().length<5} onPress={removeException}/>
    <Button label={t.cancel} secondary disabled={busy}
     onPress={()=>setExceptionDelete(null)}/>
   </Card>}
  </View>}
  {section==="availability"&&<View style={s.stack}>
   <Card title={t.availability} hint={t.previewOnly}>
    <Text style={s.caption}>{t.dateHint}</Text>
    <Field label={t.availabilityDate} value={date} max={10}
     placeholder="YYYY-MM-DD" onChange={setDate}/>
    <View style={s.topActions}>
     <Button label={t.previousDay} secondary onPress={()=>{
      if(dateInPreviewRange(date)&&date>kabulToday())setDate(shiftDate(date,-1));
     }}/>
     <Button label={t.today} secondary onPress={()=>setDate(kabulToday())}/>
     <Button label={t.nextDay} secondary onPress={()=>{
      if(dateInPreviewRange(date)&&date<shiftDate(kabulToday(),365))
       setDate(shiftDate(date,1));
     }}/>
    </View>
    <Text style={s.fieldLabel}>{t.selectService}</Text>
    {!liveServices.length?<Text style={s.empty}>{t.noServices}</Text>:
     <Chip value={selectedPreviewService} onChange={v=>setServiceId(v)}
      options={liveServices.map(x=>({value:x.id,label:x.name}))}/>}
    <Text style={s.fieldLabel}>{t.selectDoctor}</Text>
    {!liveProviders.length?<Text style={s.empty}>{t.noClinicians}</Text>:
     <Chip value={selectedPreviewProvider} onChange={v=>setProviderId(v)}
      options={liveProviders.map(x=>({value:x.membershipId,label:x.name}))}/>}
    {selectedService?.requiresChair&&<View style={s.stack}>
     <Text style={s.fieldLabel}>{t.chooseChair}</Text>
     <Chip value={effectiveChair||""} onChange={v=>setPreviewResourceId(v||null)}
      options={[{value:"",label:t.anyChair},
       ...availableChairs.map(x=>({value:x.id,label:x.label}))]}/>
    </View>}
    <Button label={t.checkSlots} icon="search"
     disabled={previewState==="loading"||!dateInPreviewRange(date)||
      !selectedPreviewService||!selectedPreviewProvider}
     onPress={()=>checkAvailability({serviceId:selectedPreviewService,
      providerId:selectedPreviewProvider,resourceId:effectiveChair})}/>
    {previewState==="loading"&&<View style={s.loading}><ActivityIndicator color="#1f6a9f"/>
     <Text style={s.caption}>{t.pending}</Text></View>}
    {previewState==="error"||previewState==="denied"?
     <Text style={s.error}>{statusLabel(previewState)}</Text>:null}
    {preview&&<View style={s.stack}>
     <View style={s.result}><Text style={s.resultHeader}>{t.previewStatus} ·
      {t[preview.status==="ready"?"readyStatus":preview.status]}</Text>
      <Text style={s.caption}>{preview.date} · {preview.serviceName} ·
       {preview.price} AFN</Text></View>
     {preview.slots.length===0?<Text style={s.empty}>{t.slotEmpty}</Text>:
      <View style={s.slotGrid}>{preview.slots.slice(0,60).map((x,i)=>
       <View key={x.startAt+":"+String(x.resourceId)+":"+i} style={s.slot}>
        <Text style={s.slotTime}>{x.start}–{x.end}</Text>
        {x.resourceId&&<Text style={s.slotMeta}>
         {inventory.find(r=>r.id===x.resourceId)?.label||t.chairType}</Text>}
       </View>)}</View>}
     {preview.slots.length>60&&<Text style={s.caption}>
      {preview.slots.length} {t.openSlots}</Text>}
    </View>}
    <Text style={s.notice}>{t.noBooking}</Text>
   </Card>
  </View>}
  <Text style={s.footer}>{t.paused} · {t.safety}</Text>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:15},stack:{gap:13},flex:{flex:1,minWidth:0},
 hero:{backgroundColor:"#132e49",padding:20,borderRadius:19,gap:10},
 eyebrowRow:{flexDirection:"row",alignItems:"center",gap:8},
 eyebrow:{color:"#81d6d7",fontSize:10,fontWeight:"900",letterSpacing:1.1},
 heroTitle:{fontSize:25,fontWeight:"900",color:"#fff",lineHeight:34},
 heroBody:{fontSize:12,lineHeight:20,color:"#c2d9e8"},
 heroClinic:{color:"#e6f2f7",fontWeight:"800",fontSize:11,paddingTop:9,
  borderTopColor:"#3c5972",borderTopWidth:1},
 card:{borderRadius:16,backgroundColor:"#fff",borderWidth:1,borderColor:"#dce7ef",
  padding:17,gap:13,shadowColor:"#203a54",shadowOpacity:.04,shadowRadius:12,
  shadowOffset:{width:0,height:5},elevation:1},
 cardTitle:{fontSize:18,fontWeight:"900",color:"#1b405e",lineHeight:25},
 caption:{fontSize:11,color:"#6c879d",lineHeight:18},
 footer:{fontSize:10,color:"#778c9b",lineHeight:17,textAlign:"center",paddingBottom:9},
 topActions:{flexDirection:"row",gap:8,flexWrap:"wrap"},
 button:{minHeight:44,backgroundColor:"#1a689f",borderRadius:11,
  flexGrow:1,flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",
  paddingVertical:12,paddingHorizontal:12},
 buttonAlt:{backgroundColor:"#eaf4fc",borderWidth:1,borderColor:"#cbdfee"},
 buttonDanger:{backgroundColor:"#fff1f2",borderWidth:1,borderColor:"#edc8cf"},
 buttonText:{fontSize:11,fontWeight:"900",color:"#fff",textAlign:"center"},
 buttonAltText:{color:"#1b6496"},buttonDangerText:{color:"#aa4352"},
 disabled:{opacity:.47},pressed:{opacity:.82},
 tabRows:{flexDirection:"row",gap:6,flexWrap:"wrap"},
 tab:{backgroundColor:"#e9eff4",minHeight:43,borderRadius:11,
  flexGrow:1,paddingVertical:10,paddingHorizontal:12,alignItems:"center",justifyContent:"center"},
 tabOn:{backgroundColor:"#1a6297"},
 tabText:{fontSize:10,fontWeight:"900",color:"#55748c",textAlign:"center"},
 tabTextOn:{color:"#fff"},
 metrics:{flexDirection:"row",flexWrap:"wrap",gap:9},
 metric:{width:"47%",flexGrow:1,minHeight:99,padding:14,gap:10,borderRadius:13,
  borderWidth:1,borderColor:"#e0eaf2",backgroundColor:"#f9fcfe"},
 metricValue:{fontSize:24,fontWeight:"900",color:"#175f95"},
 metricLabel:{fontSize:11,color:"#6d8698",fontWeight:"800"},
 status:{fontSize:11,fontWeight:"900",color:"#1d8264"},
 statusBg:{backgroundColor:"#eaf7f1",padding:10,borderRadius:10},
 checkRow:{flexDirection:"row",alignItems:"center",gap:9,paddingVertical:6},
 checkLabel:{fontSize:11,color:"#4c7089",fontWeight:"800"},
 field:{gap:7},fieldLabel:{fontSize:12,fontWeight:"900",color:"#375e7a"},
 input:{minHeight:47,borderWidth:1,borderColor:"#d6e5ef",borderRadius:10,
  backgroundColor:"#f7fafc",paddingVertical:11,paddingHorizontal:12,
  fontSize:13,color:"#264864"},
 multiline:{minHeight:90,textAlignVertical:"top"},
 chips:{flexDirection:"row",gap:7,flexWrap:"wrap"},
 chip:{backgroundColor:"#f5f8fb",borderWidth:1,borderColor:"#dfe8ef",
  paddingHorizontal:11,paddingVertical:9,minHeight:40,borderRadius:9,justifyContent:"center"},
 chipOn:{backgroundColor:"#e0f0fb",borderColor:"#348bb6"},
 chipText:{fontSize:10,fontWeight:"800",color:"#64829a"},
 chipTextOn:{color:"#185f95"},
 toggleRow:{minHeight:53,flexDirection:"row",gap:10,alignItems:"center",
  justifyContent:"space-between",backgroundColor:"#f7fafc",
  borderRadius:11,paddingHorizontal:13},
 toggleText:{fontSize:12,color:"#365a77",fontWeight:"800",flex:1},
 switch:{backgroundColor:"#c5d3df",height:24,width:44,borderRadius:12,
  justifyContent:"center",paddingHorizontal:3},
 switchOn:{backgroundColor:"#1e8d7e",alignItems:"flex-end"},
 switchDot:{width:18,height:18,borderRadius:9,backgroundColor:"#fff"},
 switchDotOn:{backgroundColor:"#fff"},
 catalogRow:{borderRadius:12,borderWidth:1,borderColor:"#e7eef5",
  padding:12,backgroundColor:"#f8fbfd",gap:12},
 catalogTitle:{flexDirection:"row",gap:10,alignItems:"center"},
 catalogIcon:{height:41,width:41,borderRadius:12,backgroundColor:"#e5f2fc",
  justifyContent:"center",alignItems:"center"},
 itemName:{fontSize:13,fontWeight:"900",color:"#204663"},
 price:{fontSize:13,fontWeight:"900",color:"#126da2"},
 badges:{flexDirection:"row",gap:7,flexWrap:"wrap"},
 badge:{backgroundColor:"#eaf1f7",color:"#5d7991",padding:7,
  borderRadius:8,fontSize:10,fontWeight:"900"},
 badgeActive:{color:"#257866",backgroundColor:"#e6f5ed"},
 badgeInactive:{color:"#936f37",backgroundColor:"#fff2e5"},
 dayCard:{borderRadius:11,padding:13,borderWidth:1,borderColor:"#e2eaf1",
  gap:12,backgroundColor:"#f8fafc"},
 dayTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 timeSummary:{flexDirection:"row",alignItems:"center",gap:10,justifyContent:"space-between"},
 timeSummaryText:{fontWeight:"900",fontSize:13,color:"#305e7c"},
 dayName:{fontSize:13,fontWeight:"900",color:"#2a4d68"},
 daySwitch:{backgroundColor:"#e8edf3",borderRadius:10,padding:11,minWidth:83,
  alignItems:"center"},
 daySwitchOn:{backgroundColor:"#def3eb"},
 daySwitchText:{fontSize:11,color:"#73899a",fontWeight:"900"},
 daySwitchTextOn:{color:"#1d735d"},
 notice:{padding:13,backgroundColor:"#eaf5fb",borderRadius:11,
  color:"#3f718c",fontSize:11,lineHeight:20},
 warning:{padding:12,color:"#8d622b",backgroundColor:"#fff4e8",
  borderColor:"#f0dfc5",borderWidth:1,borderRadius:11,fontSize:12,lineHeight:19},
 error:{padding:12,color:"#a33f53",backgroundColor:"#fff1f3",
  borderColor:"#f1d1d7",borderWidth:1,borderRadius:11,fontSize:12,lineHeight:19},
 success:{padding:12,color:"#1c7655",backgroundColor:"#eaf8f0",
  borderColor:"#ccecd9",borderWidth:1,borderRadius:11,fontSize:12,lineHeight:19},
 empty:{fontSize:12,color:"#7c93a6",lineHeight:20,textAlign:"center",paddingVertical:17},
 result:{backgroundColor:"#edf7fb",borderRadius:12,padding:14,gap:7},
 resultHeader:{color:"#21688e",fontSize:13,fontWeight:"900"},
 slotGrid:{flexDirection:"row",flexWrap:"wrap",gap:7},
 slot:{borderWidth:1,borderColor:"#cce6ef",backgroundColor:"#f0f9fc",
  borderRadius:10,minWidth:105,padding:10,gap:6},
 slotTime:{color:"#1b638e",fontWeight:"900",fontSize:12},
 slotMeta:{fontSize:10,color:"#6c899b"},
 loading:{minHeight:76,gap:10,justifyContent:"center",alignItems:"center"},
 pair:{flexDirection:"row",justifyContent:"space-between",gap:12},
 pairLabel:{color:"#628097",fontSize:12},pairValue:{color:"#1d4c6e",fontSize:12,fontWeight:"900"}
});
