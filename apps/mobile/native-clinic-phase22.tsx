import React,{useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import type {NativeClinicSpace} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 allowedTransition,bookingDateAllowed,canBook,canReadAppointments,
 clinicIdValid,kabulDayOfTimestamp,kabulToday,newActionKey,parseAppointmentDetail,
 parseCalendar,parseCatalog,parsePatientSearch,parseQueue,parseSlots,
 rescheduleReasonValid,shiftDay,transitionReasonValid,weekWindow,
 type AppointmentAction,type AppointmentCalendar,type AppointmentQueue,
 type AppointmentView,type BookingCatalog,type BookingSlot,type SearchPatient,
 type AppointmentSource,type AppointmentStatus
} from "./native-clinic-phase22-model";

type Locale="en"|"fa-AF"|"ps-AF";
type Props={clinic:NativeClinicSpace;locale:Locale;request:Phase20Request;
 onOpenWeb:(path:string)=>void};
type Mode="queue"|"calendar"|"create";
type Editor="none"|"reschedule";
type State="loading"|"ready"|"error"|"forbidden";
const t={
 en:{
  tag:"RECEPTION DESK",header:"Appointments & reception",
  sub:"Live, clinic-scoped schedule. Times are shown in Kabul time.",
  queue:"Today's queue",calendar:"Calendar",create:"New booking",
  today:"Today",week:"Week",day:"Day",previous:"Previous",next:"Next",refresh:"Refresh",
  loading:"Loading appointments…",error:"The clinic service is unavailable. Check network and refresh.",
  forbidden:"This role cannot access clinic appointments.",empty:"No appointments for this date.",
  readonly:"Read-only for this role",notApproved:"Production writes remain blocked until independent pilot approval.",
  date:"Clinic date",dateHint:"Use previous/next to change date.",
  confirmed:"Confirmed",arrived:"Checked in",in_treatment:"In treatment",
  completed:"Completed",cancelled:"Cancelled",no_show:"No show",
  appointments:"Appointments",queueHint:"Select a row to view the server-authorized details.",
  patient:"Patient",provider:"Dentist",service:"Service",status:"Status",source:"Booking source",
  notes:"Administrative reason",details:"Appointment details",close:"Close",
  updated:"Fresh data",notAvailable:"Unable to verify this appointment. Refresh before taking action.",
  checkIn:"Check in",noShow:"Mark no-show",cancel:"Cancel appointment",
  treatment:"Start treatment",finish:"Complete treatment",reschedule:"Reschedule",
  reason:"Reason (minimum 10 characters)",reasonHint:"Give a professional reason; no medical notes or private details.",
  confirming:"Confirm action",confirmStatus:"Apply this appointment status change?",
  cancelConfirm:"Cancel this confirmed or checked-in appointment? This cannot be undone here.",
  noShowConfirm:"Mark this scheduled patient as a no-show?",
  warning:"Changes are recorded and permission-checked by the clinic server.",
  busy:"Saving…",success:"Appointment updated. Latest data is being refreshed.",
  stale:"Appointment changed. Refresh details and try again.",
  conflict:"The slot is no longer available. Refresh available times.",
  unknown:"The outcome could not be confirmed. Refresh the appointment list before retrying.",
  blocked:"Your role, subscription or the production pilot gate does not permit this action.",
  refreshDetail:"Refresh appointment",closed:"Session paused. Reopen this screen for private data.",
  newHeading:"Book an appointment",createHint:"Choose a registered patient, active service, authorized dentist and a live available slot.",
  patientSearch:"Search patients by name, number or phone",
  search:"Search",searchHint:"Type at least two characters, then search. Only existing clinic patients can be booked.",
  noPatients:"No matching active clinic patients. Create the patient using the secure clinic website.",
  patientChosen:"Selected patient",changePatient:"Change patient",
  catalog:"Service & dentist",noCatalog:"The schedule catalog is unavailable. Refresh.",
  chooseService:"Choose service",chooseDoctor:"Choose dentist",chooseSlot:"Choose time",
  noSlots:"No valid slots available for this selection.",
  slotReason:"Schedule availability",bookingDate:"Requested date",
  sourceStaff:"Staff",sourceWalkIn:"Walk-in",sourcePhone:"Phone booking",
  book:"Confirm appointment",bookConfirm:"Book the selected patient with this service, dentist and time?",
  booked:"Appointment recorded. Check today's queue or calendar.",
  needField:"Select a real patient, service, dentist and available time.",
  web:"Open clinic web",noWrite:"You can view appointments; scheduling requires an authorized role.",
  original:"Original appointment",newDate:"New date",newDoctor:"New dentist",
  newTime:"New available time",saveReschedule:"Confirm reschedule",
  rescheduleConfirm:"Reschedule this appointment? Existing service duration and fee remain unchanged.",
  noOlder:"Cannot book a date in the past or more than one year ahead.",
  detailUnavailable:"This appointment no longer exists or your role cannot read it.",
  calendarLimit:"This view is limited to seven clinic days.",
  preview:"Only the server can confirm the slot. Never rely on preview availability alone.",
  secure:"Private data is not saved to device storage."
 },
 "fa-AF":{
  tag:"پذیرش کلینیک",header:"نوبت‌ها و پذیرش",
  sub:"زمان‌بندی واقعی کلینیک. تمام وقت‌ها مطابق کابل است.",
  queue:"صف امروز",calendar:"تقویم",create:"نوبت جدید",
  today:"امروز",week:"هفته",day:"روز",previous:"قبلی",next:"بعدی",refresh:"تازه‌سازی",
  loading:"دریافت نوبت‌ها…",error:"سرور کلینیک در دسترس نیست. اتصال را بررسی کنید.",
  forbidden:"این نقش به نوبت‌ها دسترسی ندارد.",empty:"در این تاریخ نوبتی نیست.",
  readonly:"برای این نقش فقط خواندنی",notApproved:"تا تأیید مستقل آزمایشی، عملیات طبی در تولید مسدود می‌ماند.",
  date:"تاریخ کلینیک",dateHint:"برای تغییر تاریخ از قبلی/بعدی استفاده کنید.",
  confirmed:"تأییدشده",arrived:"حاضر شده",in_treatment:"در حال تداوی",
  completed:"تکمیل‌شده",cancelled:"لغوشده",no_show:"حاضر نشده",
  appointments:"نوبت‌ها",queueHint:"برای جزئیات مجاز هر نوبت روی آن بزنید.",
  patient:"مریض",provider:"داکتر",service:"خدمت",status:"حالت",source:"نوع نوبت",
  notes:"دلیل اداری",details:"جزئیات نوبت",close:"بستن",
  updated:"معلومات تازه",notAvailable:"جزئیات قابل تأیید نیست. پیش از تغییر دوباره بررسی کنید.",
  checkIn:"ثبت حضور",noShow:"ثبت عدم حضور",cancel:"لغو نوبت",
  treatment:"شروع تداوی",finish:"تکمیل تداوی",reschedule:"تغییر زمان",
  reason:"دلیل (حداقل ۱۰ کاراکتر)",reasonHint:"فقط دلیل اداری؛ معلومات طبی یا خصوصی ننویسید.",
  confirming:"تأیید عملیات",confirmStatus:"آیا حالت نوبت تغییر کند؟",
  cancelConfirm:"آیا این نوبت لغو شود؟ این عمل قابل بازگشت مستقیم نیست.",
  noShowConfirm:"آیا عدم حضور مریض ثبت شود؟",
  warning:"تمام تغییرات در سرور ثبت و از نظر اجازه بررسی می‌شود.",
  busy:"ذخیره…",success:"نوبت اصلاح شد؛ معلومات تازه دریافت می‌شود.",
  stale:"نوبت تغییر کرده است. جزئیات را تازه کنید.",
  conflict:"این وقت دیگر آزاد نیست. زمان‌های موجود را دوباره بگیرید.",
  unknown:"نتیجه عملیات معلوم نیست. پیش از تلاش مجدد فهرست را تازه کنید.",
  blocked:"نقش، اشتراک یا مجوز آزمایشی تولید اجازه این عملیات را نمی‌دهد.",
  refreshDetail:"دریافت مجدد جزئیات",closed:"جلسه متوقف است. صفحه را باز کنید.",
  newHeading:"ثبت نوبت",createHint:"مریض موجود، خدمت فعال، داکتر مجاز و وقت آزاد را انتخاب کنید.",
  patientSearch:"جستجوی مریض با نام، شماره یا تلفن",
  search:"جستجو",searchHint:"حداقل دو حرف وارد و جستجو کنید. فقط مریضان ثبت‌شده قابل نوبت‌دهی اند.",
  noPatients:"مریض فعالی پیدا نشد. مریض را در وب مصئون کلینیک ثبت کنید.",
  patientChosen:"مریض انتخاب‌شده",changePatient:"تغییر مریض",
  catalog:"خدمت و داکتر",noCatalog:"فهرست خدمات و داکتران در دسترس نیست.",
  chooseService:"انتخاب خدمت",chooseDoctor:"انتخاب داکتر",chooseSlot:"انتخاب ساعت",
  noSlots:"برای این انتخاب وقت آزاد موجود نیست.",
  slotReason:"دسترسی زمان‌ها",bookingDate:"تاریخ مورد نظر",
  sourceStaff:"کارمند",sourceWalkIn:"مراجعه حضوری",sourcePhone:"از طریق تلفن",
  book:"تأیید نوبت",bookConfirm:"این مریض با خدمت، داکتر و وقت انتخاب‌شده ثبت شود؟",
  booked:"نوبت ثبت شد. فهرست یا تقویم را بررسی کنید.",
  needField:"مریض، خدمت، داکتر و وقت آزاد را کامل انتخاب کنید.",
  web:"بازکردن وب کلینیک",noWrite:"مشاهده نوبت‌ها مجاز است؛ ثبت به نقش مجاز نیاز دارد.",
  original:"نوبت قبلی",newDate:"تاریخ جدید",newDoctor:"داکتر جدید",
  newTime:"وقت آزاد جدید",saveReschedule:"تأیید تغییر وقت",
  rescheduleConfirm:"زمان نوبت تغییر کند؟ مدت و مبلغ قبلی حفظ می‌شود.",
  noOlder:"نمی‌توان در گذشته یا بیشتر از یک سال آینده نوبت داد.",
  detailUnavailable:"نوبت موجود نیست یا نقش شما اجازه مشاهده ندارد.",
  calendarLimit:"این صفحه حداکثر هفت روز کلینیک را نشان می‌دهد.",
  preview:"زمان آزاد نهایی فقط در سرور تأیید می‌شود.",
  secure:"معلومات خصوصی در حافظه دایمی موبایل ذخیره نمی‌شود."
 },
 "ps-AF":{
  tag:"د کلینیک پذیرش",header:"ملاقاتونه او پذیرش",
  sub:"د کلینیک حقیقي مهالویش؛ ټول وختونه د کابل دي.",
  queue:"د نن کتار",calendar:"مهالوېش",create:"نوی ملاقات",
  today:"نن",week:"اوونۍ",day:"ورځ",previous:"مخکینی",next:"راتلونکی",refresh:"تازه کول",
  loading:"ملاقاتونه ترلاسه کېږي…",error:"د کلینیک سرور نشته؛ شبکه وګورئ.",
  forbidden:"دا رول ملاقاتونو ته لاسرسی نه لري.",empty:"دې نېټې ته ملاقات نه شته.",
  readonly:"دې رول ته یوازې لوستل",notApproved:"د خپلواکې کتنې تر تایید مخکې د ناروغانو بدلونونه بند دي.",
  date:"د کلینیک نېټه",dateHint:"د نېټې بدلولو لپاره مخکینی/راتلونکی وکاروئ.",
  confirmed:"تایید شوی",arrived:"راغلی",in_treatment:"تر درملنې لاندې",
  completed:"بشپړ شوی",cancelled:"لغو شوی",no_show:"نه دی راغلی",
  appointments:"ملاقاتونه",queueHint:"د مجاز جزییاتو لپاره ملاقات وټاکئ.",
  patient:"ناروغ",provider:"ډاکټر",service:"خدمت",status:"حالت",source:"د ملاقات ډول",
  notes:"اداري دلیل",details:"د ملاقات جزییات",close:"تړل",
  updated:"تازه معلومات",notAvailable:"د ملاقات جزییات نشته. بیا یې وګورئ.",
  checkIn:"حضور ثبتول",noShow:"نه راتګ ثبتول",cancel:"ملاقات لغوه کول",
  treatment:"درملنه پیلول",finish:"درملنه بشپړول",reschedule:"وخت بدلول",
  reason:"دلیل (لږ تر لږه ۱۰ توري)",reasonHint:"یوازې اداري دلیل؛ طبي یا شخصي معلومات مه لیکئ.",
  confirming:"عمل تاییدول",confirmStatus:"د ملاقات حالت بدل شي؟",
  cancelConfirm:"دا ملاقات لغوه شي؟ په همدې ځای کې بېرته نه راګرځي.",
  noShowConfirm:"د ناروغ نه راتګ ثبت شي؟",
  warning:"بدلونونه په سرور کې ثبت او د واک له مخې کتل کېږي.",
  busy:"خوندي کېږي…",success:"ملاقات بدل شو؛ تازه معلومات ترلاسه کېږي.",
  stale:"ملاقات بدل شوی؛ جزییات بیا ترلاسه کړئ.",
  conflict:"وخت نور نشته. موجود وختونه تازه کړئ.",
  unknown:"پایله معلومه نه ده. مخکې له بیا هڅې معلومات تازه کړئ.",
  blocked:"رول، ګډون یا د ازمایښتي تولید اجازه نشته.",
  refreshDetail:"جزییات تازه کول",closed:"ناسته بنده ده، پاڼه بیا پرانیزئ.",
  newHeading:"ملاقات ثبتول",createHint:"ثبت شوی ناروغ، فعال خدمت، مجاز ډاکټر او خلاص وخت وټاکئ.",
  patientSearch:"د ناروغ نوم، شمېره یا تلیفون ولټوئ",
  search:"لټون",searchHint:"لږ تر لږه دوه توري ولیکئ او لټون وکړئ.",
  noPatients:"فعال ناروغ ونه موندل شو؛ ناروغ په خوندي وېب کې ثبت کړئ.",
  patientChosen:"ټاکل شوی ناروغ",changePatient:"ناروغ بدلول",
  catalog:"خدمت او ډاکټر",noCatalog:"د خدمتونو او ډاکټرانو لېست نشته.",
  chooseService:"خدمت ټاکل",chooseDoctor:"ډاکټر ټاکل",chooseSlot:"وخت ټاکل",
  noSlots:"دې انتخاب ته خلاص وخت نشته.",
  slotReason:"موجود وختونه",bookingDate:"غوښتل شوې نېټه",
  sourceStaff:"کارکوونکی",sourceWalkIn:"حضوري",sourcePhone:"د تلیفون له لارې",
  book:"ملاقات تاییدول",bookConfirm:"ملاقات د ټاکل شوي ناروغ، خدمت، ډاکټر او وخت لپاره ثبت شي؟",
  booked:"ملاقات ثبت شو. کتار یا مهالویش وګورئ.",
  needField:"ناروغ، خدمت، ډاکټر او خلاص وخت وټاکئ.",
  web:"د کلینیک وېب پرانیزئ",noWrite:"ملاقاتونه کتلای شئ؛ ثبت واک ته اړتیا لري.",
  original:"مخکینی ملاقات",newDate:"نوې نېټه",newDoctor:"نوی ډاکټر",
  newTime:"نوی خلاص وخت",saveReschedule:"بدلون تاییدول",
  rescheduleConfirm:"وخت بدل شي؟ مخکینۍ موده او بیه پر خپل ځای پاتې کېږي.",
  noOlder:"په تېره نېټه یا له یو کال وروسته ملاقات نشي ثبتېدای.",
  detailUnavailable:"دا ملاقات نشته یا ستاسو رول ورته لاسرسی نه لري.",
  calendarLimit:"دلته تر اوو ورځو پورې ښودل کېږي.",
  preview:"د وخت وروستی تایید سرور کوي.",
  secure:"شخصي معلومات د موبایل په دوامدار حافظه کې نه ساتل کېږي."
 }
} as const;
const palettes={
 confirmed:{bg:"#e8f2fd",fg:"#145f9a"},
 arrived:{bg:"#fff4e4",fg:"#91601c"},
 in_treatment:{bg:"#efeafe",fg:"#6853a7"},
 completed:{bg:"#e8f7f0",fg:"#24754f"},
 cancelled:{bg:"#faedef",fg:"#a54653"},
 no_show:{bg:"#faf0e4",fg:"#9c6626"}
} as const;
const statusKeys=["confirmed","arrived","in_treatment","completed","cancelled","no_show"] as const;
type Words=typeof t.en;
function Icon({name,color="#155e9f",size=20}:{name:PatientIconName;color?:string;size?:number}){
 return <PatientIcon name={name} color={color} size={size}/>;
}
function Button({label,onPress,kind="primary",disabled=false,icon}:{
 label:string;onPress:()=>void;kind?:"primary"|"soft"|"danger";disabled?:boolean;icon?:PatientIconName}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label}
  disabled={disabled} accessibilityState={{disabled}}
  onPress={onPress} style={({pressed})=>[s.button,kind==="soft"&&s.buttonSoft,
   kind==="danger"&&s.buttonDanger,disabled&&s.disabled,pressed&&s.pressed]}>
  {icon&&<Icon name={icon} color={kind==="primary"?"#fff":kind==="danger"?"#a43c49":"#1c5d8d"} size={17}/>}
  <Text style={[s.buttonText,kind!=="primary"&&s.buttonSoftText,
   kind==="danger"&&s.buttonDangerText]}>{label}</Text></Pressable>;
}
function Field({label,value,onChange,placeholder,lines=1}:{
 label:string;value:string;onChange:(v:string)=>void;placeholder?:string;lines?:number}){
 return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>
  <TextInput accessibilityLabel={label} maxLength={320} value={value} onChangeText={onChange}
   multiline={lines>1} numberOfLines={lines} autoCapitalize="sentences"
   autoCorrect={false} placeholder={placeholder||label} placeholderTextColor="#889eb2"
   style={[s.input,lines>1?{minHeight:90,textAlignVertical:"top"}:null]}/></View>;
}
function Tag({status,words}:{status:AppointmentStatus;words:Words}){
 return <View style={[s.tag,{backgroundColor:palettes[status].bg}]}>
  <Text style={[s.tagText,{color:palettes[status].fg}]}>{words[status]}</Text></View>;
}
function stamp(value:string){
 try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",hour:"2-digit",
  minute:"2-digit",hour12:false}).format(new Date(value))}
 catch{return "—"}
}
function Section({title,children}:{title:string;children:React.ReactNode}){
 return <View style={s.panel}><Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}
function Selection<T extends string>({items,selected,onChange}:{
 items:{id:T;label:string}[];selected:T;onChange:(v:T)=>void}){
 return <View style={s.options}>{items.map(item=><Pressable key={item.id}
  accessibilityRole="button" accessibilityState={{selected:item.id===selected}}
  onPress={()=>onChange(item.id)} style={[s.option,selected===item.id&&s.optionActive]}>
  <Text style={[s.optionText,selected===item.id&&s.optionTextActive]}>{item.label}</Text>
 </Pressable>)}</View>;
}
const waitStatus=(e:unknown):State=>{
 const status=e&&typeof e==="object"&&"status" in e?
  (e as {status?:unknown}).status:null;
 return status===401||status===403?"forbidden":"error";
};
const actionError=(e:unknown,words:Words)=>{
 const status=e&&typeof e==="object"&&"status" in e?
  (e as {status?:unknown}).status:null;
 const code=e&&typeof e==="object"&&"code" in e?
  String((e as {code?:unknown}).code||""):"";
 if(status===409){
  if(code==="STALE_APPOINTMENT_REVISION"||code==="ONLY_CONFIRMED_CAN_RESCHEDULE")
   return words.stale;
  return words.conflict;
 }
 if(status===403||status===401||status===503)return words.blocked;
 if(status===422)return words.needField;
 return words.unknown;
};
export function NativeClinicPhase22({clinic,locale,request,onOpenWeb}:Props){
 const words=t[locale],rtl=locale!=="en",permission=canReadAppointments(clinic.role);
 const schedulable=canBook(clinic.role);
 const [mode,setMode]=useState<Mode>("queue");
 const [view,setView]=useState<"day"|"week">("day");
 const [date,setDate]=useState(kabulToday);
 const [reload,setReload]=useState(0);
 const [state,setState]=useState<State>("loading");
 const [queue,setQueue]=useState<AppointmentQueue|null>(null);
 const [calendar,setCalendar]=useState<AppointmentCalendar|null>(null);
 const [catalog,setCatalog]=useState<BookingCatalog|null>(null);
 const [selected,setSelected]=useState<AppointmentView|null>(null);
 const [detailState,setDetailState]=useState<State>("ready");
 const [editing,setEditing]=useState<Editor>("none");
 const [reason,setReason]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [foreground,setForeground]=useState(!["inactive","background"].includes(AppState.currentState));
 const [patientQuery,setPatientQuery]=useState("");
 const [patients,setPatients]=useState<SearchPatient[]|null>(null);
 const [patient,setPatient]=useState<SearchPatient|null>(null);
 const [serviceId,setServiceId]=useState("");
 const [providerId,setProviderId]=useState("");
 const [choice,setChoice]=useState<BookingSlot|null>(null);
 const [slots,setSlots]=useState<BookingSlot[]|null>(null);
 const [slotStatus,setSlotStatus]=useState<State>("ready");
 const [source,setSource]=useState<AppointmentSource>("staff");
 const requestCounter=useRef(0);
 const slotCounter=useRef(0);
 const detailCounter=useRef(0);
 const mounted=useRef(true);
 const attempts=useRef<Record<string,{key:string;fingerprint:string}>>({});
 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false;requestCounter.current++;slotCounter.current++;detailCounter.current++};
 },[]);
 useEffect(()=>{
  const sub=AppState.addEventListener("change",next=>{
   if(next==="active"){setForeground(true);setReload(x=>x+1);}
   else{
    // Clear all private patient and appointment data when sent to background.
    setForeground(false);setQueue(null);setCalendar(null);setSelected(null);
    setPatients(null);setPatient(null);setSlots(null);
    setMessage("");setError("");
   }
  });
  return()=>sub.remove();
 },[]);
 const today=kabulToday();
 const window=view==="week"?weekWindow(date,locale):{from:date,to:date};
 const root="/v1/appointments/clinics/"+encodeURIComponent(clinic.clinicId);
 const requestRefresh=()=>{setSelected(null);setEditing("none");setPatient(null);
  setPatients(null);setSlots(null);setMessage("");setError("");setReload(n=>n+1)};
 const setWorkMode=(next:Mode)=>{
  setMode(next);setSelected(null);setEditing("none");setError("");setMessage("");
  setPatient(null);setPatients(null);setSlots(null);setChoice(null);
 };
 useEffect(()=>{
  if(!permission||!foreground||mode==="create"){setQueue(null);setCalendar(null);return}
  const controller=new AbortController(),id=++requestCounter.current;
  setQueue(null);setCalendar(null);setState("loading");setError("");
  const path=mode==="queue"?
   root+"/queue?date="+encodeURIComponent(date):
   root+"/calendar?from="+encodeURIComponent(window.from)+"&to="+encodeURIComponent(window.to);
  void request<unknown>(path,"GET",undefined,controller.signal).then(res=>{
   if(controller.signal.aborted||!mounted.current||id!==requestCounter.current)return;
   if(mode==="queue"){
    const parsed=parseQueue(res,clinic.clinicId,date);
    if(!parsed)throw Error("INVALID_QUEUE_RESPONSE");
    setQueue(parsed);
   }else{
    const parsed=parseCalendar(res,clinic.clinicId,window.from,window.to);
    if(!parsed)throw Error("INVALID_CALENDAR_RESPONSE");
    setCalendar(parsed);
   }
   setState("ready");
  }).catch(e=>{
   if(controller.signal.aborted||!mounted.current||id!==requestCounter.current)return;
   setState(waitStatus(e));
  });
  return()=>{controller.abort();requestCounter.current++};
 },[clinic.clinicId,mode,date,view,locale,permission,request,reload,foreground]);
 useEffect(()=>{
  if(!permission||!schedulable||!foreground||mode!=="create"&&editing!=="reschedule")
   return;
  const controller=new AbortController(),id=++requestCounter.current;
  setCatalog(null);
  void request<unknown>(root+"/catalog","GET",undefined,controller.signal)
   .then(value=>{
    if(controller.signal.aborted||!mounted.current||id!==requestCounter.current)return;
    setCatalog(parseCatalog(value));
   }).catch(()=>{
    if(!controller.signal.aborted&&mounted.current&&id===requestCounter.current)setCatalog(null);
   });
  return()=>{controller.abort();requestCounter.current++};
 },[clinic.clinicId,request,mode,editing,schedulable,foreground,reload]);
 useEffect(()=>{
  if(!catalog)return;
  if(editing==="reschedule"&&selected){
   setServiceId(selected.serviceId);
   setProviderId(selected.providerMembershipId);
  }else{
   if(!catalog.services.some(s=>s.id===serviceId))setServiceId("");
   if(!catalog.providers.some(p=>p.membershipId===providerId))setProviderId("");
  }
 },[catalog,editing,selected?.id]);
 useEffect(()=>{
  if(!foreground||!schedulable||!bookingDateAllowed(date,today)||!serviceId||!providerId||
   mode!=="create"&&editing!=="reschedule"){
   setSlots(null);setChoice(null);setSlotStatus("ready");return;
  }
  if(editing==="reschedule"&&!selected)return;
  const controller=new AbortController(),id=++slotCounter.current;
  setSlots(null);setChoice(null);setSlotStatus("loading");
  const fields="date="+encodeURIComponent(date)+"&serviceId="+encodeURIComponent(serviceId)+
   "&providerId="+encodeURIComponent(providerId)+
   (editing==="reschedule"&&selected?
    "&excludeAppointmentId="+encodeURIComponent(selected.id):"");
  void request<unknown>(root+"/slots?"+fields,"GET",undefined,controller.signal)
   .then(raw=>{
    if(controller.signal.aborted||!mounted.current||id!==slotCounter.current)return;
    const parsed=parseSlots(raw,clinic.clinicId,date,serviceId,providerId);
    if(!parsed)throw Error("INVALID_SLOTS");
    setSlots(parsed.slots);
    setSlotStatus("ready");
   }).catch(e=>{
    if(controller.signal.aborted||!mounted.current||id!==slotCounter.current)return;
    setSlotStatus(waitStatus(e));setSlots(null);
   });
  return()=>{controller.abort();slotCounter.current++};
 },[clinic.clinicId,request,mode,editing,date,serviceId,providerId,selected?.id,
  reload,schedulable,foreground]);
 function moveDay(delta:number){
  const next=shiftDay(date,delta);
  if(next<shiftDay(today,-365)||next>shiftDay(today,365))return;
  setDate(next);
  if(editing!=="reschedule"){setSelected(null);setEditing("none")}
  setError("");
 }
 const displayStatus=(item:AppointmentView)=>item.status;
 const list=mode==="queue"?queue?.appointments:calendar?.appointments;
 async function loadDetail(item:AppointmentView){
  const current=++detailCounter.current;
  setDetailState("loading");setSelected(null);setEditing("none");setError("");
  try{
   const payload=await request<unknown>(root+"/appointments/"+encodeURIComponent(item.id));
   if(current!==detailCounter.current||!mounted.current||!foreground)return;
   const updated=parseAppointmentDetail(payload,clinic.clinicId,item.id);
   if(!updated)throw Error("INVALID_DETAIL");
   setSelected(updated);setDetailState("ready");
  }catch(e){
   if(current!==detailCounter.current||!mounted.current)return;
   setSelected(null);setDetailState(waitStatus(e));setError(words.detailUnavailable);
  }
 }
 const canReschedule=selected?.status==="confirmed"&&schedulable&&
  (clinic.role!=="dentist"||selected.providerMembershipId===clinic.membershipId);
 const actions=selected?allowedTransition(clinic.role,
  (clinic.role==="dentist"||clinic.clinicianEnabled)&&
  selected.providerMembershipId===clinic.membershipId,selected.status):[];
 const clearAttempt=(id:string)=>{delete attempts.current[id]};
 const attemptFor=(id:string,payload:unknown):string=>{
  const fingerprint=JSON.stringify(payload);
  const previous=attempts.current[id];
  if(previous&&previous.fingerprint===fingerprint)return previous.key;
  const key=newActionKey();
  attempts.current[id]={key,fingerprint};
  return key;
 };
 const reloadAfterWrite=(note:string)=>{
  attempts.current={};setMessage(note);setError("");setSelected(null);
  setEditing("none");setSlots(null);setChoice(null);setPatient(null);
  setPatients(null);setMode("queue");setDate(kabulToday());setView("day");
  setReload(v=>v+1);
 };
 async function doTransition(status:AppointmentAction){
  const appt=selected;
  if(!appt||!actions.includes(status)||busy||!foreground)return;
  if(!transitionReasonValid(status,reason)){setError(words.reason);return}
  setBusy(true);setError("");
  const payload={status,revision:appt.revision,
   ...(status==="cancelled"||status==="no_show"?{reason:reason.trim()}:{}),
   appointmentId:appt.id};
  const key=attemptFor("transition:"+appt.id,payload);
  try{
   const result=await request<unknown>(root+"/appointments/"+encodeURIComponent(appt.id)+
    "/status","POST",{...payload,idempotencyKey:key});
   const verified=result&&typeof result==="object"&&"appointment" in result?
    parseAppointment((result as {appointment:unknown}).appointment,clinic.clinicId):null;
   if(!verified||verified.id!==appt.id)throw Error("WRITE_RESPONSE_UNVERIFIED");
   reloadAfterWrite(words.success);
  }catch(e){
   setError(actionError(e,words));
  }finally{setBusy(false)}
 }
 function confirmTransition(status:AppointmentAction){
  if(!selected)return;
  if(!transitionReasonValid(status,reason)){setError(words.reason);return}
  Alert.alert(words.confirming,
   status==="cancelled"?words.cancelConfirm:status==="no_show"?
   words.noShowConfirm:words.confirmStatus,[
    {text:words.close,style:"cancel"},
    {text:words.confirming,style:status==="cancelled"?"destructive":"default",
     onPress:()=>{void doTransition(status)}}
   ]);
 }
 async function searchPatients(){
  if(!schedulable||patientQuery.trim().length<2||busy)return;
  setBusy(true);setError("");setPatient(null);setPatients(null);
  try{
   const payload=await request<unknown>(root+"/patients/search?q="+
    encodeURIComponent(patientQuery.trim().slice(0,100)));
   const result=parsePatientSearch(payload);
   if(!result)throw Error("INVALID_PATIENTS");
   setPatients(result);
  }catch(e){setError(actionError(e,words))}
  finally{setBusy(false)}
 }
 const validBooking=Boolean(patient&&serviceId&&providerId&&choice&&slots?.some(s=>
  s.start===choice.start&&s.resourceId===choice.resourceId)&&
  bookingDateAllowed(date,today)&&
  (clinic.role!=="dentist"||providerId===clinic.membershipId));
 async function saveBooking(){
  if(!validBooking||!patient||!choice||busy)return;
  setBusy(true);setError("");
  const payload={patientId:patient.id,serviceId,providerId,resourceId:choice.resourceId,
   date,start:choice.start,source};
  const key=attemptFor("create",payload);
  try{
   const result=await request<unknown>(root+"/appointments","POST",
    {...payload,idempotencyKey:key});
   const verified=result&&typeof result==="object"&&"appointment" in result?
    parseAppointment((result as {appointment:unknown}).appointment,clinic.clinicId):null;
   if(!verified||verified.patientId!==patient.id)throw Error("WRITE_RESPONSE_UNVERIFIED");
   reloadAfterWrite(words.booked);
  }catch(e){setError(actionError(e,words));setSlots(null);setChoice(null)}
  finally{setBusy(false)}
 }
 function confirmBooking(){
  if(!validBooking){setError(words.needField);return}
  Alert.alert(words.confirming,words.bookConfirm+" "+words.warning,[
   {text:words.close,style:"cancel"},
   {text:words.book,onPress:()=>{void saveBooking()}}
  ]);
 }
 async function saveReschedule(){
  const appt=selected;
  if(!appt||!canReschedule||!choice||!rescheduleReasonValid(reason)){
   setError(words.reason);return}
  if(busy||!validBookingDateOrSlot())return;
  setBusy(true);setError("");
  const payload={date,start:choice.start,providerId,resourceId:choice.resourceId,
   reason:reason.trim(),revision:appt.revision};
  const key=attemptFor("reschedule:"+appt.id,payload);
  try{
   const result=await request<unknown>(root+"/appointments/"+encodeURIComponent(appt.id)+
    "/reschedule","POST",{...payload,idempotencyKey:key});
   const verified=result&&typeof result==="object"&&"appointment" in result?
    parseAppointment((result as {appointment:unknown}).appointment,clinic.clinicId):null;
   if(!verified||verified.id!==appt.id)throw Error("WRITE_RESPONSE_UNVERIFIED");
   reloadAfterWrite(words.success);
  }catch(e){setError(actionError(e,words));setSlots(null);setChoice(null)}
  finally{setBusy(false)}
 }
 function validBookingDateOrSlot(){
  return bookingDateAllowed(date,today)&&Boolean(choice&&slots?.some(s=>
   s.start===choice.start&&s.resourceId===choice.resourceId)&&providerId);
 }
 function confirmReschedule(){
  if(!selected||!canReschedule||!validBookingDateOrSlot()||
   !rescheduleReasonValid(reason)){setError(words.needField);return}
  Alert.alert(words.confirming,words.rescheduleConfirm+" "+words.warning,[
   {text:words.close,style:"cancel"},
   {text:words.saveReschedule,onPress:()=>{void saveReschedule()}}
  ]);
 }
 const setPicked=(slot:BookingSlot)=>{setChoice(slot);setError("")};
 const changeService=(id:string)=>{setServiceId(id);setChoice(null);setSlots(null);clearAttempt("create")};
 const changeProvider=(id:string)=>{setProviderId(id);setChoice(null);setSlots(null);clearAttempt("create")};
 const shiftEditor=(next:Editor)=>{
  setEditing(next);setReason("");setChoice(null);setSlots(null);
  if(next==="reschedule"&&selected){
   setDate(kabulDayOfTimestamp(selected.startAt));setServiceId(selected.serviceId);
   setProviderId(selected.providerMembershipId);
  }
 };
 const calendarList=list?.filter(a=>mode==="calendar"||a.status!=="cancelled")||[];
 const cards=calendarList.map(a=><Pressable key={a.id} accessibilityRole="button"
  accessibilityLabel={words.patient+" "+a.patientName+" "+stamp(a.startAt)+" "+words[a.status]}
  onPress={()=>{void loadDetail(a)}} style={({pressed})=>[s.visit,pressed&&s.pressed]}>
  <View style={s.visitHour}><Text style={s.visitTime}>{stamp(a.startAt)}</Text>
   <Text style={s.visitTimezone}>KBL</Text></View>
  <View style={s.visitBody}><Text style={s.visitName} numberOfLines={1}>
   {a.patientName||words.patient}</Text><Text style={s.visitDesc} numberOfLines={1}>
   {a.serviceName} · {a.providerName}</Text>
   <Text style={s.visitDesc}>{kabulDayOfTimestamp(a.startAt)}</Text>
  </View><Tag status={displayStatus(a)} words={words}/>
 </Pressable>);
 const renderCatalog=(forReschedule:boolean)=>!catalog?
  <Text style={s.hint}>{words.noCatalog}</Text>:
  <View style={s.gap}>
   {!forReschedule&&<View><Text style={s.fieldLabel}>{words.chooseService}</Text>
    <View style={s.options}>{catalog.services.map(item=><Pressable key={item.id}
     accessibilityRole="button" accessibilityState={{selected:serviceId===item.id}}
     onPress={()=>changeService(item.id)}
     style={[s.option,serviceId===item.id&&s.optionActive]}>
      <Text style={[s.optionText,serviceId===item.id&&s.optionTextActive]}>{item.name}</Text>
     </Pressable>)}</View></View>}
   <View><Text style={s.fieldLabel}>{words.chooseDoctor}</Text>
    <View style={s.options}>{catalog.providers.filter(p=>
     clinic.role!=="dentist"||p.membershipId===clinic.membershipId).map(item=>
      <Pressable key={item.membershipId} accessibilityRole="button"
       accessibilityState={{selected:providerId===item.membershipId}}
       onPress={()=>changeProvider(item.membershipId)}
       style={[s.option,providerId===item.membershipId&&s.optionActive]}>
       <Text style={[s.optionText,providerId===item.membershipId&&s.optionTextActive]}>
        {item.name}</Text>
      </Pressable>)}</View></View>
  </View>;
 const slotPicker=()=> <View style={s.gap}>
  <Text style={s.fieldLabel}>{words.chooseSlot} · {date}</Text>
  {slotStatus==="loading"?<ActivityIndicator color="#185e9c"/>:
   slotStatus==="error"||slotStatus==="forbidden"?
    <Text style={s.warn}>{words.error}</Text>:
   slots!==null&&slots.length===0?<Text style={s.warn}>{words.noSlots}</Text>:
   slots!==null?<View style={s.options}>{slots.slice(0,100).map((slot,index)=>
    <Pressable key={slot.start+":"+slot.resourceId+":"+index}
     accessibilityRole="button" accessibilityState={{selected:choice===slot}}
     onPress={()=>setPicked(slot)} style={[s.timeChip,choice===slot&&s.timeChipSelected]}>
      <Text style={[s.timeText,choice===slot&&s.timeTextSelected]}>{slot.start}</Text>
     </Pressable>)}</View>:<Text style={s.hint}>{words.slotReason}: {words.chooseService}</Text>}
  <Text style={s.caption}>{words.preview}</Text>
 </View>;

 if(!permission)return <View style={s.panel}>
  <Text style={s.sectionTitle}>{words.forbidden}</Text>
  <Text style={s.hint}>{words.readonly}</Text></View>;
 return <View style={s.container}>
  <View style={s.hero}><Text style={s.heroTag}>{words.tag} · ASIA/KABUL</Text>
   <Text style={s.heroTitle}>{words.header}</Text>
   <Text style={s.heroSub}>{words.sub}</Text>
   <View style={s.heroFooter}><Icon name="shield" color="#a8d9e7" size={17}/>
    <Text style={s.heroFooterText}>{words.secure}</Text></View>
  </View>
  <View style={s.modeNav}>{(["queue","calendar","create"] as const)
   .filter(x=>x!=="create"||schedulable).map(x=>
   <Pressable key={x} accessibilityRole="tab"
    accessibilityState={{selected:mode===x}}
    style={[s.modeTab,mode===x&&s.modeTabActive]}
    onPress={()=>setWorkMode(x)}>
    <Icon name={x==="create"?"plus":"calendar"} size={17}
     color={mode===x?"#fff":"#437192"}/>
    <Text style={[s.modeText,mode===x&&s.modeTextActive]}>
     {x==="queue"?words.queue:x==="calendar"?words.calendar:words.create}</Text>
   </Pressable>)}</View>
  {message!==""&&<Text style={s.success} accessibilityRole="alert">{message}</Text>}
  {error!==""&&<Text style={s.warn} accessibilityRole="alert">{error}</Text>}
  <Text style={s.caption}>{words.notApproved}</Text>
  {mode!=="create"&&<View style={s.panel}>
   <View style={s.dateTitle}><Text style={s.sectionTitle}>{words.date}</Text>
    <Pressable accessibilityRole="button" onPress={requestRefresh} style={s.refresh}>
     <Icon name="clock" size={16}/><Text style={s.refreshText}>{words.refresh}</Text></Pressable>
   </View>
   <View style={s.dateNav}>
    <Pressable accessibilityRole="button" onPress={()=>moveDay(view==="week"&&mode==="calendar"?-7:-1)}
     style={s.dateButton}><Icon name="chevron" size={18}/><Text>{words.previous}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>{setDate(today);setEditing("none")}}
     style={s.todayButton}><Text style={s.todayText}>{words.today} · {date}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>moveDay(view==="week"&&mode==="calendar"?7:1)}
     style={s.dateButton}><Text>{words.next}</Text><Icon name="chevron" size={18}/></Pressable>
   </View>
   {mode==="calendar"&&<Selection items={[{id:"day",label:words.day},
    {id:"week",label:words.week}]} selected={view} onChange={setView}/>}
   <Text style={s.caption}>{mode==="calendar"&&view==="week"?
    window.from+" — "+window.to:words.dateHint}</Text>
  </View>}
  {mode!=="create"&&<Section title={words.appointments}>
   <Text style={s.caption}>{words.queueHint}</Text>
   {state==="loading"?<View style={s.loading}><ActivityIndicator color="#185e9c"/>
    <Text style={s.hint}>{words.loading}</Text></View>:
    state==="ready"?cards.length?cards:<Text style={s.empty}>{words.empty}</Text>:
     <View style={s.gap}><Text style={s.warn}>{state==="forbidden"?words.forbidden:words.error}</Text>
      <Button label={words.refresh} kind="soft" onPress={requestRefresh}/></View>}
  </Section>}
  {detailState==="loading"&&<View style={s.loading}><ActivityIndicator color="#185e9c"/>
   <Text style={s.hint}>{words.loading}</Text></View>}
  {selected&&mode!=="create"&&<Section title={words.details}>
   <View style={s.detailTop}><Text style={s.detailName}>{selected.patientName||words.patient}</Text>
    <Tag status={selected.status} words={words}/></View>
   {([[words.service,selected.serviceName],[words.provider,selected.providerName],
    [words.date,stamp(selected.startAt)+" · "+kabulDayOfTimestamp(selected.startAt)],
    [words.status,words[selected.status]],[words.source,selected.source]] as const).map(([label,value])=>
     <View key={label} style={s.infoRow}><Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text></View>)}
   <Text style={s.caption}>{words.warning}</Text>
   {actions.length>0&&editing==="none"&&<View style={s.options}>
    {actions.map(action=><Button key={action} disabled={busy}
     kind={action==="cancelled"?"danger":"soft"}
     label={action==="arrived"?words.checkIn:action==="cancelled"?words.cancel:
      action==="no_show"?words.noShow:action==="in_treatment"?words.treatment:words.finish}
     onPress={()=>confirmTransition(action)}/>)}</View>}
   {actions.some(a=>a==="cancelled"||a==="no_show")&&editing==="none"&&
    <Field label={words.reason} value={reason} lines={2}
     onChange={value=>{setReason(value);clearAttempt("transition:"+selected.id)}}
     placeholder={words.reasonHint}/>}
   {canReschedule&&editing==="none"&&
    <Button kind="soft" icon="calendar" label={words.reschedule}
     onPress={()=>shiftEditor("reschedule")}/>}
   {editing==="reschedule"&&<View style={s.gap}>
    <Text style={s.sectionTitle}>{words.reschedule}</Text>
    <Text style={s.hint}>{words.original}: {stamp(selected.startAt)} ·
     {kabulDayOfTimestamp(selected.startAt)}</Text>
    <View style={s.dateNav}>
     <Button label={words.previous} kind="soft" onPress={()=>moveDay(-1)}/>
     <Text style={s.dateChosen}>{date}</Text>
     <Button label={words.next} kind="soft" onPress={()=>moveDay(1)}/>
    </View>
    {renderCatalog(true)}{slotPicker()}
    <Field label={words.reason} value={reason} lines={2}
     placeholder={words.reasonHint} onChange={setReason}/>
    <Button label={busy?words.busy:words.saveReschedule}
     disabled={busy||!canReschedule||!choice||!rescheduleReasonValid(reason)}
     icon="check" onPress={confirmReschedule}/>
    <Button kind="soft" label={words.close} onPress={()=>shiftEditor("none")}/>
   </View>}
   <Button label={words.refreshDetail} disabled={busy} kind="soft"
    onPress={()=>{void loadDetail(selected)}} icon="clock"/>
   <Button label={words.close} kind="soft" onPress={()=>{
    setSelected(null);setEditing("none");setReason("");setSlots(null);setChoice(null)}}/>
  </Section>}
  {mode==="create"&&schedulable&&<View style={s.gap}>
   <Section title={words.newHeading}>
    <Text style={s.hint}>{words.createHint}</Text>
    {patient?<View style={s.patientSelected}><Text style={s.detailName}>
     {patient.preferredName} {patient.familyName}</Text>
     <Text style={s.caption}>#{patient.patientNumber}</Text>
     <Button kind="soft" label={words.changePatient} onPress={()=>{
      setPatient(null);setPatients(null);clearAttempt("create")}}/></View>:
    <View style={s.gap}>
     <Field label={words.patientSearch} value={patientQuery} onChange={v=>{
      setPatientQuery(v);setPatients(null);clearAttempt("create")}}/>
     <Button label={words.search} disabled={busy||patientQuery.trim().length<2}
      kind="soft" icon="search" onPress={()=>{void searchPatients()}}/>
     <Text style={s.caption}>{words.searchHint}</Text>
     {patients!==null&&patients.length===0&&
      <Text style={s.warn}>{words.noPatients}</Text>}
     {patients?.map(p=><Pressable key={p.id} accessibilityRole="button"
      onPress={()=>{setPatient(p);setPatients(null);clearAttempt("create")}}
      style={s.searchItem}><Text style={s.patientName}>{p.preferredName} {p.familyName}</Text>
      <Text style={s.caption}>#{p.patientNumber}</Text></Pressable>)}
     <Button label={words.web} kind="soft" onPress={()=>onOpenWeb(
      "/clinic/patients?clinic="+encodeURIComponent(clinic.clinicId))}/>
    </View>}
   </Section>
   <Section title={words.catalog}>{renderCatalog(false)}</Section>
   <Section title={words.bookingDate}>
    <View style={s.dateNav}>
     <Button label={words.previous} kind="soft" onPress={()=>moveDay(-1)}/>
     <Text style={s.dateChosen}>{date}</Text>
     <Button label={words.next} kind="soft" onPress={()=>moveDay(1)}/>
    </View>
    {!bookingDateAllowed(date,today)&&<Text style={s.warn}>{words.noOlder}</Text>}
    {slotPicker()}
   </Section>
   <Section title={words.source}>
    <Selection items={[
     {id:"staff",label:words.sourceStaff},{id:"walk_in",label:words.sourceWalkIn},
     {id:"phone",label:words.sourcePhone}
    ]} selected={source} onChange={value=>{setSource(value);clearAttempt("create")}}/>
    <Text style={s.caption}>{words.warning}</Text>
    <Button icon="check" label={busy?words.busy:words.book}
     disabled={busy||!validBooking} onPress={confirmBooking}/>
   </Section>
  </View>}
 </View>;
}

const s=StyleSheet.create({
 container:{gap:14},gap:{gap:12},
 hero:{backgroundColor:"#142f49",borderRadius:19,padding:20,gap:10},
 heroTag:{fontSize:10,fontWeight:"900",color:"#72d3ce",letterSpacing:1},
 heroTitle:{fontSize:24,fontWeight:"900",color:"#fff"},
 heroSub:{fontSize:12,color:"#c3d7e7",lineHeight:21},
 heroFooter:{flexDirection:"row",alignItems:"center",gap:8,borderTopWidth:1,
  borderTopColor:"#3c5b70",paddingTop:13,marginTop:4},
 heroFooterText:{fontSize:10,color:"#c7dae8",flex:1,lineHeight:17},
 modeNav:{flexDirection:"row",gap:6,backgroundColor:"#e4ecf5",borderRadius:14,padding:5},
 modeTab:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,
  paddingVertical:11,paddingHorizontal:4,minHeight:45,borderRadius:10},
 modeTabActive:{backgroundColor:"#195e96"},
 modeText:{fontSize:10,fontWeight:"800",color:"#436783",flexShrink:1},
 modeTextActive:{color:"#fff"},
 panel:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dbe5ef",borderRadius:16,
  padding:16,gap:13,shadowColor:"#1b3852",shadowOpacity:.035,
  shadowOffset:{width:0,height:5},shadowRadius:16,elevation:1},
 sectionTitle:{fontSize:17,fontWeight:"900",color:"#1a3c56"},
 dateTitle:{flexDirection:"row",justifyContent:"space-between",gap:12,alignItems:"center"},
 refresh:{flexDirection:"row",gap:5,alignItems:"center",padding:8,backgroundColor:"#edf5fc",borderRadius:10},
 refreshText:{color:"#1b5a8e",fontSize:10,fontWeight:"900"},
 dateNav:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:6},
 dateButton:{flexDirection:"row",alignItems:"center",gap:5,paddingVertical:12,paddingHorizontal:5},
 todayButton:{paddingHorizontal:10,paddingVertical:10,backgroundColor:"#e8f3fc",borderRadius:10},
 todayText:{fontSize:11,fontWeight:"900",color:"#1a679e"},
 dateChosen:{fontSize:12,fontWeight:"900",color:"#24628c",textAlign:"center",flexShrink:1},
 button:{minHeight:44,flexGrow:1,backgroundColor:"#1b64a4",borderRadius:10,
  alignItems:"center",justifyContent:"center",gap:6,paddingVertical:11,paddingHorizontal:14,flexDirection:"row"},
 buttonSoft:{backgroundColor:"#eaf3fa",borderWidth:1,borderColor:"#d3e4f0"},
 buttonDanger:{backgroundColor:"#fff0f2",borderWidth:1,borderColor:"#f2cdd1"},
 buttonText:{fontSize:12,fontWeight:"800",color:"#fff",textAlign:"center"},
 buttonSoftText:{color:"#165e96"},buttonDangerText:{color:"#a54351"},
 disabled:{opacity:.45},pressed:{opacity:.8},
 options:{flexDirection:"row",flexWrap:"wrap",gap:8},
 option:{backgroundColor:"#f4f7fb",borderColor:"#dae5ee",borderWidth:1,
  borderRadius:10,paddingVertical:10,paddingHorizontal:12,minHeight:43},
 optionActive:{backgroundColor:"#e5f3fc",borderColor:"#2c83bc"},
 optionText:{fontSize:11,fontWeight:"800",color:"#627b92"},
 optionTextActive:{color:"#1c6196"},
 hint:{fontSize:12,lineHeight:21,color:"#61798f"},
 caption:{fontSize:11,lineHeight:19,color:"#8192a3"},
 warn:{fontSize:12,lineHeight:20,color:"#914f29",backgroundColor:"#fff4e8",padding:12,
  borderWidth:1,borderColor:"#f3d8b6",borderRadius:11},
 success:{fontSize:12,lineHeight:20,color:"#216c52",backgroundColor:"#e9f8ef",padding:12,
  borderWidth:1,borderColor:"#c8e9d5",borderRadius:11},
 loading:{minHeight:115,alignItems:"center",justifyContent:"center",gap:11},
 empty:{fontSize:12,color:"#698399",padding:22,textAlign:"center"},
 visit:{backgroundColor:"#f7fafc",borderWidth:1,borderColor:"#e8eef4",
  borderRadius:12,padding:12,gap:11,alignItems:"center",flexDirection:"row",minHeight:82},
 visitHour:{gap:4,alignItems:"center",width:52},
 visitTime:{fontSize:14,fontWeight:"900",color:"#145785"},
 visitTimezone:{fontSize:9,fontWeight:"700",color:"#8194a3"},
 visitBody:{flex:1,gap:5},
 visitName:{fontSize:12,fontWeight:"900",color:"#284761"},
 visitDesc:{fontSize:10,lineHeight:16,color:"#6a8194"},
 tag:{borderRadius:9,paddingHorizontal:9,paddingVertical:7,maxWidth:105},
 tagText:{fontSize:10,fontWeight:"800",textAlign:"center"},
 detailTop:{flexDirection:"row",gap:9,alignItems:"center",justifyContent:"space-between"},
 detailName:{fontSize:15,fontWeight:"900",color:"#24465e",flex:1},
 infoRow:{flexDirection:"row",gap:12,paddingVertical:8,borderBottomWidth:1,borderBottomColor:"#eff3f7"},
 infoLabel:{flex:1,fontSize:11,color:"#668298"},
 infoValue:{flex:1,fontSize:11,color:"#28506d",fontWeight:"800",textAlign:"right"},
 field:{gap:7},fieldLabel:{fontWeight:"900",fontSize:12,color:"#3c5c76",marginBottom:3},
 input:{minHeight:45,borderWidth:1,borderColor:"#d9e5ef",borderRadius:10,
  paddingHorizontal:12,paddingVertical:11,backgroundColor:"#f9fbfd",fontSize:13,color:"#2b4b66"},
 searchItem:{padding:13,borderColor:"#d7e7f2",borderWidth:1,backgroundColor:"#f6fafd",borderRadius:12,gap:6},
 patientName:{fontSize:12,fontWeight:"900",color:"#265479"},
 patientSelected:{gap:10,padding:13,backgroundColor:"#f3faf8",borderRadius:11},
 timeChip:{minWidth:75,backgroundColor:"#f2f8fd",borderWidth:1,
  borderColor:"#d7e7f4",borderRadius:10,padding:12,alignItems:"center"},
 timeChipSelected:{backgroundColor:"#145e99",borderColor:"#145e99"},
 timeText:{fontSize:12,fontWeight:"900",color:"#1e5a83"},
 timeTextSelected:{color:"#fff"}
});
