import React,{useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import type {NativeClinicSpace} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 canChangePatientStatus,canReadPatients,canViewClinicalHistory,canViewContact,
 canViewPatientAppointments,canWritePatients,directoryPath,newPatientDraft,
 parseDirectory,parseEncounterHistory,parsePatientBrief,parsePatientCounts,
 parsePatientHistory,parsePatientProfile,parseTreatmentStatus,patientPayload,
 profileToDraft,validStatusReason,validatePatientDraft,
 type PatientBrief,type PatientCounts,type PatientDirectory,type PatientDraft,
 type PatientProfile,type PatientAppointmentHistory,type PatientEncounter,
 type PatientTreatments,type PatientStatus,type DirectoryFilter,type DirectorySort
} from "./native-clinic-phase23-model";

type Locale="en"|"fa-AF"|"ps-AF";
type Pane="directory"|"profile"|"create"|"edit";
type ProfileSection="summary"|"appointments"|"clinical";
type LoadState="loading"|"ready"|"error"|"forbidden";
type Props={clinic:NativeClinicSpace;locale:Locale;request:Phase20Request;
 onOpenWeb:(route:string)=>void};
const l10n={
 en:{
  kicker:"CLINIC PATIENTS",heading:"Patient management",
  intro:"Verified, clinic-scoped patient records. Private data is displayed only for authorized roles.",
  directory:"Directory",profile:"Patient profile",search:"Search patients",
  searchHint:"Search by name, patient number, or phone. Press Search to submit.",
  runSearch:"Search",clearSearch:"Clear",filter:"Status filter",sort:"Sort",
  activity:"Recent activity",nameSort:"Name A–Z",all:"All",
  active:"Active",inactive:"Inactive",archived:"Archived",
  total:"All patients",activeCount:"Active",inactiveCount:"Inactive",
  archivedCount:"Archived",page:"Page",of:"of",backPage:"Previous",nextPage:"Next",
  loading:"Loading secure records…",offline:"Unable to load live patient information.",
  access:"Your staff role cannot view this information.",empty:"No patients match these filters.",
  retry:"Refresh",view:"Open profile",patientId:"Patient number",
  updated:"Updated",back:"Back to directory",create:"Add patient",
  modify:"Edit details",save:"Save patient",createConfirm:"Create this patient in the selected clinic?",
  editConfirm:"Save these demographic changes? They will be recorded in the clinic audit trail.",
  editSuccess:"Patient details saved.",createSuccess:"Patient created. Directory refreshed.",
  details:"Patient identity",contact:"Contact information",showContact:"Show contact",
  hideContact:"Hide contact",contactHint:"Only view contact data when required for clinic care.",
  phone:"Phone",phoneUnverified:"Unverified phone — confirm directly with patient",
  alternateContact:"Alternate contact",address:"Address",province:"Province",city:"City",
  emergencyContact:"Emergency contact",birthDate:"Date of birth (YYYY-MM-DD)",
  estimatedAge:"Estimated age (if birth date unknown)",none:"Not provided",
  fullName:"Preferred name",familyName:"Family name (optional)",
  notice:"I acknowledge the patient privacy notice and am authorized to register these details.",
  required:"Required information",optional:"Additional details (optional)",
  dobRule:"Provide either birth date or estimated age, not both.",
  invalid:"Check the required name, phone, dates, age, and privacy acknowledgement.",
  duplicate:"Potential duplicate patient found. No new record was created. Review the existing clinic directory or use audited clinic web workflow to resolve.",
  changed:"Record changed on the server. Refresh before editing again.",
  future:"This patient has future appointments. Resolve them before changing status.",
  uncertain:"The outcome could not be verified. Search for this patient before trying again.",
  blocked:"The clinic role, plan or healthcare pilot release gate prevents this action.",
  busy:"Saving…",cancel:"Cancel",confirm:"Confirm",warning:"This action is logged by the clinic server.",
  appointments:"Appointment history",appointmentHint:"Authorized appointments only; not a full clinical chart.",
  appointmentEmpty:"No authorized appointment history available.",doctor:"Doctor",
  treatment:"Treatment overview",treatmentHint:"Provider-authorized status metadata only. No diagnosis or clinical notes are shown here.",
  treatmentEmpty:"No authorized treatment status records.",encounters:"Clinical visit history",
  encountersHint:"Only this clinician's authorized visit metadata is shown. Notes stay in the secure clinical workspace.",
  encounterEmpty:"No authorized visits available.",clinicalRestricted:"Clinical history is restricted to verified clinicians.",
  clinical:"Clinical history",historyNo:"History unavailable for this role.",
  serverScope:"The clinic server enforces provider access independently of this screen.",
  created:"Created",next:"Next",previous:"Previous",sessions:"Expected sessions",
  stages:"Completed stages",status:"Status",draft:"Draft",signed:"Signed",
  amended:"Amended",newPatient:"Register patient",
  close:"Close",statusUpdate:"Change patient status",newStatus:"New status",
  reason:"Administrative reason (10–300 characters)",reasonHint:"Administrative purpose only. Do not enter a clinical diagnosis.",
  statusConfirm:"Change the patient status? Future appointments must be resolved first.",
  statusSuccess:"Patient status updated.",archivedWarning:"Archive/deactivation affects booking eligibility.",
  web:"Open secure clinic web",webHint:"Clinical notes, dental charts and advanced records use clinician-gated clinic web.",
  privacy:"Patient details are cleared when this app leaves the foreground and are never saved to device storage.",
  locked:"Secure session paused. Reopen the patient tab to refresh.",
  recent:"Recent",completed:"Completed",confirmed:"Confirmed",arrived:"Arrived",
  in_treatment:"In treatment",cancelled:"Cancelled",no_show:"No show",
  activePlan:"Current status",profileHidden:"Some demographics are hidden for this finance-only role.",
  historyTruncated:"Showing a bounded set of appointments; the clinic website has the complete authorized history."
 },
 "fa-AF":{
  kicker:"مریضان کلینیک",heading:"مدیریت مریضان",
  intro:"معلومات واقعی مریضان در کلینیک انتخاب‌شده؛ فقط برای نقش‌های مجاز.",
  directory:"فهرست مریضان",profile:"پروفایل مریض",search:"جستجوی مریضان",
  searchHint:"با نام، شماره مریض یا تلفن جستجو کنید و دکمه جستجو را بزنید.",
  runSearch:"جستجو",clearSearch:"پاک‌کردن",filter:"حالت مریض",sort:"ترتیب",
  activity:"فعالیت تازه",nameSort:"بر اساس نام",all:"همه",
  active:"فعال",inactive:"غیرفعال",archived:"آرشیف",
  total:"مجموع مریضان",activeCount:"فعال",inactiveCount:"غیرفعال",
  archivedCount:"آرشیف",page:"صفحه",of:"از",backPage:"قبلی",nextPage:"بعدی",
  loading:"دریافت معلومات مصئون…",offline:"معلومات مریضان از سرور دریافت نشد.",
  access:"نقش شما اجازه مشاهده ندارد.",empty:"مریض مطابق جستجو پیدا نشد.",
  retry:"تازه‌سازی",view:"بازکردن پروفایل",patientId:"شماره مریض",
  updated:"تازه‌شده",back:"بازگشت به فهرست",create:"افزودن مریض",
  modify:"ویرایش مشخصات",save:"ذخیره مریض",createConfirm:"این مریض در کلینیک انتخاب‌شده ثبت شود؟",
  editConfirm:"تغییرات ثبت و در سیستم پیگیری می‌شوند؛ ذخیره شود؟",
  editSuccess:"مشخصات مریض ذخیره شد.",createSuccess:"مریض ثبت شد. فهرست تازه شد.",
  details:"هویت مریض",contact:"معلومات تماس",showContact:"نمایش تماس",
  hideContact:"پنهان‌کردن تماس",contactHint:"معلومات تماس را فقط در صورت نیاز کاری باز کنید.",
  phone:"شماره تماس",phoneUnverified:"شماره تأیید نشده؛ مستقیم با مریض تأیید کنید",
  alternateContact:"تماس بدیل",address:"آدرس",province:"ولایت",city:"شهر",
  emergencyContact:"تماس اضطراری",birthDate:"تاریخ تولد (YYYY-MM-DD)",
  estimatedAge:"سن تخمینی (اگر تاریخ تولد معلوم نیست)",none:"درج نشده",
  fullName:"نام مریض",familyName:"تخلص (اختیاری)",
  notice:"مقررات حریم خصوصی را مطالعه کردم و اجازه ثبت معلومات مریض را دارم.",
  required:"معلومات ضروری",optional:"جزئیات اضافی (اختیاری)",
  dobRule:"فقط یکی از تاریخ تولد یا سن تخمینی را وارد کنید.",
  invalid:"نام، شماره، تاریخ، سن و تأیید حریم خصوصی را بررسی کنید.",
  duplicate:"امکان تکراری بودن مریض وجود دارد. ثبت جدید انجام نشد؛ فهرست را بررسی یا از روش مصئون وب استفاده کنید.",
  changed:"معلومات در سرور تغییر کرده؛ پیش از ویرایش دوباره بررسی کنید.",
  future:"این مریض نوبت آینده دارد؛ پیش از تغییر حالت آن‌ها را حل کنید.",
  uncertain:"نتیجه مشخص نیست؛ پیش از تلاش مجدد فهرست را جستجو کنید.",
  blocked:"نقش، اشتراک یا مجوز آزمایشی اجازه این عملیات را نمی‌دهد.",
  busy:"در حال ذخیره…",cancel:"لغو",confirm:"تأیید",warning:"این عملیات در سرور ثبت و بررسی می‌شود.",
  appointments:"تاریخچه نوبت‌ها",appointmentHint:"فقط نوبت‌های مجاز؛ نه پرونده کامل طبی.",
  appointmentEmpty:"نوبت مجاز وجود ندارد.",doctor:"داکتر",
  treatment:"نمای کلی تداوی",treatmentHint:"فقط حالت تداوی برای داکتر مجاز؛ هیچ تشخیص و یادداشت طبی نمایش داده نمی‌شود.",
  treatmentEmpty:"حالت تداوی مجاز وجود ندارد.",encounters:"تاریخچه ویزیت",
  encountersHint:"فقط مشخصات عمومی ویزیت‌های مجاز این داکتر؛ یادداشت‌ها در وب مصئون می‌مانند.",
  encounterEmpty:"ویزیت مجاز وجود ندارد.",clinicalRestricted:"تاریخچه طبی فقط برای داکتران مجاز است.",
  clinical:"تاریخچه طبی",historyNo:"تاریخچه برای نقش شما موجود نیست.",
  serverScope:"سرور دسترسی داکتر را مستقل بررسی می‌کند.",
  created:"ایجاد",next:"بعدی",previous:"قبلی",sessions:"جلسات تخمینی",
  stages:"مراحل تکمیل‌شده",status:"حالت",draft:"مسوده",signed:"امضاشده",
  amended:"اصلاح‌شده",newPatient:"ثبت مریض",
  close:"بستن",statusUpdate:"تغییر حالت مریض",newStatus:"حالت جدید",
  reason:"دلیل اداری (۱۰ تا ۳۰۰ حرف)",reasonHint:"فقط دلیل اداری؛ تشخیص طبی ننویسید.",
  statusConfirm:"حالت مریض تغییر کند؟ نوبت‌های آینده باید قبلاً حل شده باشند.",
  statusSuccess:"حالت مریض تغییر کرد.",archivedWarning:"آرشیف و غیرفعال‌سازی روی اجازه نوبت تأثیر دارد.",
  web:"بازکردن وب کلینیک",webHint:"یادداشت‌ها، چارت دندان و اسناد پیشرفته در وب مصئون برای داکتر مجاز قرار دارند.",
  privacy:"معلومات مریض با ترک برنامه پاک می‌شود و در حافظه موبایل ذخیره نمی‌شود.",
  locked:"جلسه متوقف شده؛ صفحه مریضان را دوباره باز کنید.",
  recent:"تازه",completed:"تکمیل‌شده",confirmed:"تأییدشده",
  arrived:"حاضر شده",in_treatment:"در حال تداوی",cancelled:"لغوشده",no_show:"عدم حضور",
  activePlan:"حالت فعلی",profileHidden:"بعضی مشخصات برای نقش مالی پنهان است.",
  historyTruncated:"بخشی از نوبت‌ها نمایش داده می‌شود؛ تاریخچه کامل مجاز در وب کلینیک است."
 },
 "ps-AF":{
  kicker:"د کلینیک ناروغان",heading:"د ناروغانو مدیریت",
  intro:"د ټاکلي کلینیک ریښتیني معلومات؛ یوازې د مجازو کارکوونکو لپاره.",
  directory:"د ناروغانو فهرست",profile:"د ناروغ پېژند",search:"د ناروغانو لټون",
  searchHint:"د نوم، ناروغ شمېرې یا تلیفون له مخې ولټوئ او لټون ووهئ.",
  runSearch:"لټون",clearSearch:"پاکول",filter:"حالت",sort:"ترتیب",
  activity:"وروستی فعالیت",nameSort:"د نوم له مخې",all:"ټول",
  active:"فعال",inactive:"غیرفعال",archived:"ارشیف",
  total:"ټول ناروغان",activeCount:"فعال",inactiveCount:"غیرفعال",
  archivedCount:"ارشیف",page:"پاڼه",of:"له",backPage:"مخکینی",nextPage:"راتلونکی",
  loading:"خوندي معلومات ترلاسه کېږي…",offline:"د ناروغانو معلومات نه دي ترلاسه شوي.",
  access:"ستاسو رول اجازه نه لري.",empty:"ناروغ ونه موندل شو.",
  retry:"تازه کول",view:"پروفایل پرانستل",patientId:"د ناروغ شمېره",
  updated:"تازه شوی",back:"فهرست ته ستنېدل",create:"ناروغ زیاتول",
  modify:"معلومات سمول",save:"ناروغ خوندي کول",
  createConfirm:"دا ناروغ په ټاکلي کلینیک کې ثبت شي؟",
  editConfirm:"بدلونونه په سرور کې ثبتېږي؛ خوندي شي؟",
  editSuccess:"معلومات خوندي شول.",createSuccess:"ناروغ ثبت شو؛ فهرست تازه شو.",
  details:"د ناروغ پېژند",contact:"د اړیکې معلومات",showContact:"اړیکه ښکاره کړئ",
  hideContact:"اړیکه پټه کړئ",contactHint:"یوازې د کاري اړتیا پر مهال اړیکه وګورئ.",
  phone:"تلیفون",phoneUnverified:"تلیفون تایید شوی نه دی؛ له ناروغ سره یې وګورئ",
  alternateContact:"بله اړیکه",address:"پته",province:"ولایت",city:"ښار",
  emergencyContact:"بیړنۍ اړیکه",birthDate:"د زېږون نېټه (YYYY-MM-DD)",
  estimatedAge:"اټکلي عمر (که نېټه نه وي)",none:"نه دی درج شوی",
  fullName:"د ناروغ نوم",familyName:"تخلص (اختیاري)",
  notice:"ما د ناروغ د محرمیت خبرتیا لوستې او د ثبت واک لرم.",
  required:"اړین معلومات",optional:"نور معلومات (اختیاري)",
  dobRule:"یوازې د زېږون نېټه یا اټکلي عمر وکاروئ.",
  invalid:"نوم، تلیفون، نېټه، عمر او د محرمیت تایید سم کړئ.",
  duplicate:"کېدای شي ناروغ تکراري وي؛ نوی ریکارډ نه دی جوړ شوی. فهرست یا خوندي وېب وګورئ.",
  changed:"معلومات په سرور بدل شوي؛ بیا یې وګورئ.",
  future:"دا ناروغ راتلونکي ملاقاتونه لري؛ لومړی هغه سم کړئ.",
  uncertain:"پایله روښانه نه ده؛ د بیا هڅې مخکې فهرست ولټوئ.",
  blocked:"رول، ګډون یا ازمایښتي اجازه د دې کار مخه نیسي.",
  busy:"خوندي کېږي…",cancel:"لغوه کول",confirm:"تایید",warning:"دا کار په سرور کې ثبتېږي.",
  appointments:"د ملاقاتونو تاریخچه",appointmentHint:"یوازې مجاز ملاقاتونه؛ بشپړ طبي ریکارډ نه دی.",
  appointmentEmpty:"مجاز ملاقات نشته.",doctor:"ډاکټر",
  treatment:"د درملنې لنډیز",treatmentHint:"یوازې د مجاز ډاکټر د درملنې حالت؛ تشخیص او یادښتونه نه ښکاري.",
  treatmentEmpty:"مجاز درملنه نشته.",encounters:"د معاینې تاریخچه",
  encountersHint:"یوازې د مجاز ډاکټر د لیدنې معلومات؛ طبي یادښتونه په خوندي وېب کې دي.",
  encounterEmpty:"مجاز معاینه نه شته.",clinicalRestricted:"طبي تاریخچه یوازې مجازو ډاکټرانو ته ده.",
  clinical:"طبي تاریخچه",historyNo:"ستاسو رول ته تاریخچه نه شته.",
  serverScope:"سرور د ډاکټر لاسرسی بېل ارزوي.",
  created:"جوړ شوی",next:"بل",previous:"مخکینی",sessions:"ټاکل شوې ناستې",
  stages:"بشپړ پړاوونه",status:"حالت",draft:"مسوده",signed:"لاسلیک شوی",
  amended:"سم شوی",newPatient:"ناروغ ثبتول",
  close:"تړل",statusUpdate:"د ناروغ حالت بدلول",newStatus:"نوی حالت",
  reason:"اداري دلیل (۱۰ تر ۳۰۰ تورو)",reasonHint:"یوازې اداري دلیل؛ طبي تشخیص مه لیکئ.",
  statusConfirm:"د ناروغ حالت بدل شي؟ راتلونکي ملاقاتونه باید مخکې سم شي.",
  statusSuccess:"د ناروغ حالت بدل شو.",archivedWarning:"غیرفعالول او ارشیف په ملاقات اغېز کوي.",
  web:"د کلینیک وېب پرانستل",webHint:"طبي یادښتونه، د غاښونو چارټ او نور ریکارډونه په خوندي وېب کې دي.",
  privacy:"د ناروغ معلومات د پروګرام په شالید کې پاکېږي او په موبایل کې نه ساتل کېږي.",
  locked:"ناسته ځنډېدلې ده؛ د ناروغانو پاڼه بیا پرانیزئ.",
  recent:"وروستی",completed:"بشپړ شوی",confirmed:"تایید شوی",
  arrived:"راغلی",in_treatment:"تر درملنې لاندې",cancelled:"لغو شوی",no_show:"نه راغلی",
  activePlan:"اوسنی حالت",profileHidden:"ځینې معلومات د مالي رول لپاره پټ دي.",
  historyTruncated:"د ملاقاتونو محدوده برخه ښکاري؛ بشپړ تاریخ په خوندي وېب کې دی."
 }
} as const;
type Words={[K in keyof typeof l10n.en]:string};
const PALETTE={navy:"#17314c",ink:"#1c3c57",blue:"#175f9b",muted:"#667d92",
 border:"#dce7ef",bg:"#f4f8fc",green:"#167964",red:"#a34052"};
const statusTheme:Record<PatientStatus,{bg:string;fg:string}>={
 active:{bg:"#e6f6ef",fg:"#17745a"},
 inactive:{bg:"#fff4e4",fg:"#8b631f"},
 archived:{bg:"#f1f2f7",fg:"#6d7384"}
};
function Section({title,children,hint}:{title:string;hint?:string;children:React.ReactNode}){
 return <View style={s.card}><Text style={s.section}>{title}</Text>
  {hint&&<Text style={s.muted}>{hint}</Text>}{children}</View>;
}
function Action({label,onPress,secondary=false,danger=false,disabled=false,icon}:{
 label:string;onPress:()=>void;secondary?:boolean;danger?:boolean;disabled?:boolean;icon?:PatientIconName}){
 return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}}
  onPress={onPress} style={({pressed})=>[s.action,secondary&&s.actionSoft,
   danger&&s.actionDanger,disabled&&s.disabled,pressed&&s.pressed]}>
  {icon&&<PatientIcon name={icon} size={18} color={secondary?PALETTE.blue:danger?PALETTE.red:"#fff"}/>}
  <Text style={[s.actionText,secondary&&s.actionTextSoft,danger&&s.actionTextDanger]}>
   {label}</Text></Pressable>;
}
function Badge({status,words}:{status:PatientStatus;words:Words}){
 return <View style={[s.badge,{backgroundColor:statusTheme[status].bg}]}>
  <Text style={[s.badgeText,{color:statusTheme[status].fg}]}>{words[status]}</Text></View>;
}
function LabelValue({label,value,rtl=false}:{label:string;value:string;rtl?:boolean}){
 return <View style={[s.valueRow,{flexDirection:rtl?"row-reverse":"row"}]}>
  <Text style={[s.valueLabel,{textAlign:rtl?"right":"left"}]}>{label}</Text>
  <Text style={[s.valueText,{textAlign:rtl?"left":"right"}]} selectable={false}>{value}</Text></View>;
}
function Field({title,value,onChange,number=false,placeholder}:{
 title:string;value:string;onChange:(value:string)=>void;
 number?:boolean;placeholder?:string}){
 return <View style={s.field}><Text style={s.fieldLabel}>{title}</Text>
  <TextInput style={s.input} accessibilityLabel={title} value={value}
   onChangeText={onChange} maxLength={250} autoCorrect={false}
   keyboardType={number?"phone-pad":"default"} placeholder={placeholder||title}
   placeholderTextColor="#91a3b3"/></View>;
}
const stateFor=(e:unknown):LoadState=>{
 const code=e&&typeof e==="object"&&"status" in e?
  (e as {status?:unknown}).status:null;
 return code===401||code===403?"forbidden":"error";
};
const failureMessage=(e:unknown,words:Words):string=>{
 const code=e&&typeof e==="object"&&"code" in e?String((e as {code?:unknown}).code):"";
 const status=e&&typeof e==="object"&&"status" in e?(e as {status?:unknown}).status:null;
 if(status===409){
  if(code==="STALE_PATIENT_REVISION")return words.changed;
  if(code==="PATIENT_HAS_FUTURE_APPOINTMENTS")return words.future;
  return words.duplicate;
 }
 if(status===403||status===401||status===503)return words.blocked;
 if(status===422)return words.invalid;
 return words.uncertain;
};
function niceDate(v:string){
 try{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(v));
  const item=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return item.year+"-"+item.month+"-"+item.day;
 }catch{return "—"}
}
export function NativeClinicPhase23({clinic,locale,request,onOpenWeb}:Props){
 const words=l10n[locale],rtl=locale!=="en";
 const permitted=canReadPatients(clinic.role),canEdit=canWritePatients(clinic.role);
 const clinical=canViewClinicalHistory(clinic.role,clinic.clinicianEnabled);
 const [pane,setPane]=useState<Pane>("directory");
 const [section,setSection]=useState<ProfileSection>("summary");
 const [counts,setCounts]=useState<PatientCounts|null>(null);
 const [query,setQuery]=useState(""),[searched,setSearched]=useState("");
 const [status,setStatus]=useState<DirectoryFilter>("active");
 const [sort,setSort]=useState<DirectorySort>("activity");
 const [page,setPage]=useState(1);
 const [directory,setDirectory]=useState<PatientDirectory|null>(null);
 const [listState,setListState]=useState<LoadState>("loading");
 const [detailId,setDetailId]=useState<string|null>(null);
 const [profile,setProfile]=useState<PatientProfile|null>(null);
 const [detailState,setDetailState]=useState<LoadState>("loading");
 const [shownContact,setShownContact]=useState(false);
 const [history,setHistory]=useState<PatientAppointmentHistory|null>(null);
 const [encounters,setEncounters]=useState<PatientEncounter[]|null>(null);
 const [treatments,setTreatments]=useState<PatientTreatments[]|null>(null);
 const [historyState,setHistoryState]=useState<LoadState>("loading");
 const [draft,setDraft]=useState<PatientDraft>(newPatientDraft);
 const [busy,setBusy]=useState(false);
 const [fail,setFail]=useState(""),[success,setSuccess]=useState("");
 const [statusChoice,setStatusChoice]=useState<PatientStatus>("active");
 const [reason,setReason]=useState("");
 const [editingStatus,setEditingStatus]=useState(false);
 const [uncertainWrite,setUncertainWrite]=useState(false);
 const [reload,setReload]=useState(0);
 const [foreground,setForeground]=useState(!["inactive","background"].includes(AppState.currentState));
 const mounted=useRef(true),liveRef=useRef(true),ids=useRef({list:0,detail:0,history:0});
 const root="/v1/registry/clinics/"+encodeURIComponent(clinic.clinicId);
 const operations="/v1/appointments/clinics/"+encodeURIComponent(clinic.clinicId);
 const medical="/v1/clinical/clinics/"+encodeURIComponent(clinic.clinicId);
 const treatment="/v1/treatments/clinics/"+encodeURIComponent(clinic.clinicId);
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;ids.current.list++;ids.current.detail++;ids.current.history++;
 }},[]);
 useEffect(()=>{
  const sub=AppState.addEventListener("change",state=>{
   if(state==="active"){liveRef.current=true;setForeground(true);setReload(n=>n+1)}
   else{
    liveRef.current=false;setForeground(false);
    // Prevent sensitive details, forms and histories appearing in the OS app switcher.
    setPane("directory");setDetailId(null);setProfile(null);setDirectory(null);
    setCounts(null);setHistory(null);setEncounters(null);setTreatments(null);
    setQuery("");setSearched("");setDraft(newPatientDraft());setShownContact(false);
    setReason("");setEditingStatus(false);setFail("");setSuccess("");
   }
  });return()=>sub.remove();
 },[]);
 const resetFeedback=()=>{setFail("");setSuccess("")};
 const goDirectory=()=>{
  setPane("directory");setDetailId(null);setProfile(null);
  setHistory(null);setEncounters(null);setTreatments(null);
  setShownContact(false);setReason("");setEditingStatus(false);
  setDraft(newPatientDraft());setUncertainWrite(false);
  setReload(n=>n+1);
 };
 const changeFilter=(next:DirectoryFilter)=>{setStatus(next);setPage(1);setDirectory(null);
  resetFeedback()};
 const changeSort=(next:DirectorySort)=>{setSort(next);setPage(1);setDirectory(null);
  resetFeedback()};
 const submitSearch=()=>{setSearched(query.trim().slice(0,120));setPage(1);setDirectory(null);
  resetFeedback()};
 const openPerson=(person:PatientBrief)=>{
  setDetailId(person.id);setProfile(null);setPane("profile");
  setSection("summary");setShownContact(false);setHistory(null);
  setEncounters(null);setTreatments(null);setEditingStatus(false);
  setFail("");setSuccess("");
 };
 const refresh=()=>{resetFeedback();setUncertainWrite(false);
  setShownContact(false);setReload(n=>n+1)};

 useEffect(()=>{
  if(!permitted||!foreground||pane!=="directory"){setDirectory(null);setCounts(null);return}
  const controller=new AbortController(),key=++ids.current.list;
  setDirectory(null);setCounts(null);setListState("loading");
  const expected={page,status,sort,query:searched};
  const fetch=async()=>{
   const [people,summary]=await Promise.allSettled([
    request<unknown>(directoryPath(clinic.clinicId,page,status,sort,searched),
     "GET",undefined,controller.signal),
    request<unknown>(root+"/patients/summary","GET",undefined,controller.signal)
   ]);
   if(controller.signal.aborted||!mounted.current||!liveRef.current||
    key!==ids.current.list)return;
   if(people.status==="fulfilled"){
    const parsed=parseDirectory(people.value,expected);
    if(parsed){setDirectory(parsed);setListState("ready")}
    else setListState("error");
   }else setListState(stateFor(people.reason));
   if(summary.status==="fulfilled")setCounts(parsePatientCounts(summary.value));
  };
  void fetch();
  return()=>{controller.abort();ids.current.list++};
 },[clinic.clinicId,permitted,foreground,pane,page,status,sort,searched,request,reload]);

 useEffect(()=>{
  if(!permitted||!foreground||pane!=="profile"||!detailId){
   setProfile(null);return;
  }
  const controller=new AbortController(),key=++ids.current.detail;
  setProfile(null);setHistory(null);setEncounters(null);setTreatments(null);
  setDetailState("loading");setShownContact(false);
  void request<unknown>(root+"/patients/"+encodeURIComponent(detailId),"GET",
   undefined,controller.signal).then(raw=>{
   if(controller.signal.aborted||!liveRef.current||!mounted.current||
    key!==ids.current.detail)return;
   const result=parsePatientProfile(raw,detailId,clinic.role);
   if(!result)throw Error("INVALID_PATIENT_PROFILE");
   setProfile(result.patient);setStatusChoice(result.patient.status);
   setDetailState("ready");
  }).catch(e=>{
   if(!controller.signal.aborted&&liveRef.current&&mounted.current&&key===ids.current.detail)
    setDetailState(stateFor(e));
  });
  return()=>{controller.abort();ids.current.detail++};
 },[clinic.clinicId,clinic.role,permitted,pane,detailId,request,reload,foreground]);

 useEffect(()=>{
  if(!permitted||!foreground||pane!=="profile"||!detailId||
   section==="summary"||!profile){setHistory(null);setEncounters(null);
   setTreatments(null);return}
  const controller=new AbortController(),key=++ids.current.history;
  setHistory(null);setEncounters(null);setTreatments(null);setHistoryState("loading");
  const pid=encodeURIComponent(detailId);
  const work=async()=>{
   if(section==="appointments"&&canViewPatientAppointments(clinic.role)){
    const response=await request<unknown>(operations+"/patients/"+pid+"/appointments",
     "GET",undefined,controller.signal);
    const value=parsePatientHistory(response,clinic.clinicId,detailId,clinic.role);
    if(!value)throw Error("INVALID_APPOINTMENT_HISTORY");
    if(!controller.signal.aborted&&mounted.current&&liveRef.current&&key===ids.current.history){
     setHistory(value);setHistoryState("ready");
    }
   }else if(section==="clinical"&&clinical){
    const results=await Promise.allSettled([
     request<unknown>(medical+"/patients/"+pid+"/encounters","GET",
      undefined,controller.signal),
     request<unknown>(treatment+"/patients/"+pid+"/status-summary","GET",
      undefined,controller.signal)
    ]);
    if(controller.signal.aborted||!mounted.current||!liveRef.current||
     key!==ids.current.history)return;
    const visits=results[0].status==="fulfilled"?
     parseEncounterHistory(results[0].value,detailId):null;
    const plans=results[1].status==="fulfilled"?
     parseTreatmentStatus(results[1].value):null;
    setEncounters(visits);setTreatments(plans);
    setHistoryState(visits!==null||plans!==null?"ready":"error");
   }
  };
  void work().catch(e=>{
   if(!controller.signal.aborted&&mounted.current&&liveRef.current&&key===ids.current.history)
    setHistoryState(stateFor(e));
  });
  return()=>{controller.abort();ids.current.history++};
 },[clinic.clinicId,clinic.role,clinical,foreground,pane,section,detailId,
  profile?.id,request,reload]);

 const openCreate=()=>{setDraft(newPatientDraft());setPane("create");setFail("");
  setSuccess("");setUncertainWrite(false);setShownContact(false)};
 const openEdit=()=>{if(!profile||!canEdit)return;
  setDraft(profileToDraft(profile));setPane("edit");resetFeedback();
  setUncertainWrite(false);setShownContact(false)};
 const update=(key:keyof PatientDraft,value:string|boolean)=>
  setDraft(before=>({...before,[key]:value}));
 const setNewPatientStatus=(newStatus:PatientStatus)=>{setStatusChoice(newStatus);setReason("");setFail("")};
 const maybeDuplicate=(value:unknown)=>{
  if(!value||typeof value!=="object")throw Error("INVALID_DUPLICATE_CHECK");
  const v=value as {count?:unknown;candidates?:unknown};
  if(typeof v.count!=="number"||!Number.isSafeInteger(v.count)||v.count<0||
   !Array.isArray(v.candidates)||v.candidates.length>5||
   v.candidates.some(x=>!parsePatientBrief(x))||v.candidates.length!==v.count)
   throw Error("INVALID_DUPLICATE_CHECK");
  return v.count;
 };
 const writeFailed=(e:unknown)=>{
  const label=failureMessage(e,words);setFail(label);setSuccess("");
  if(label===words.uncertain){setUncertainWrite(true)}
 };
 async function savePatient(){
  if(busy||uncertainWrite||!canEdit||!foreground||
   pane==="edit"&&!profile)return;
  let payload;
  try{payload=patientPayload(draft,pane==="edit"?profile?.revision:undefined)}
  catch{setFail(words.invalid);return}
  setBusy(true);setFail("");
  try{
   if(pane==="create"){
    // Preflight is advisory. The transaction repeats duplicate checks under
    // a clinic lock and the native client refuses audited duplicate overrides.
    const dup=await request<unknown>(root+"/patients/duplicates","POST",payload);
    if(!mounted.current||!liveRef.current||pane!=="create")return;
    if(maybeDuplicate(dup)>0){setFail(words.duplicate);return}
   }
   const path=pane==="edit"&&profile?
    root+"/patients/"+encodeURIComponent(profile.id):root+"/patients";
   const result=await request<unknown>(path,pane==="edit"?"PATCH":"POST",payload);
   if(!mounted.current||!liveRef.current)return;
   const raw=result&&typeof result==="object"&&"patient" in result?
    (result as {patient:unknown}).patient:null;
   const saved=parsePatientBrief(raw);
   if(!saved||(pane==="edit"&&profile&&
    (saved.id!==profile.id||saved.revision<=profile.revision))||
    (pane==="create"&&saved.status!=="active"))
    throw Error("WRITE_RESPONSE_UNVERIFIED");
   // Do not repeat a successful or uncertain create. Force server re-fetch.
   setPane("directory");setProfile(null);setDetailId(null);
   setDraft(newPatientDraft());setSearched("");setQuery("");setStatus("all");
   setPage(1);setReload(n=>n+1);
   setSuccess(pane==="edit"?words.editSuccess:words.createSuccess);
   setUncertainWrite(false);
  }catch(e){if(mounted.current&&liveRef.current)writeFailed(e)}
  finally{if(mounted.current)setBusy(false)}
 }
 const confirmPatient=()=>{
  if(validatePatientDraft(draft).length){setFail(words.invalid);return}
  if(uncertainWrite)return;
  Alert.alert(words.confirm,pane==="edit"?words.editConfirm:words.createConfirm,[
   {text:words.cancel,style:"cancel"},
   {text:words.confirm,onPress:()=>{void savePatient()}}
  ]);
 };
 async function saveStatus(){
  if(busy||uncertainWrite||!profile||!canChangePatientStatus(clinic.role)||!validStatusReason(reason)||
   statusChoice===profile.status||!foreground)return;
  setBusy(true);setFail("");
  try{
   const raw=await request<unknown>(root+"/patients/"+encodeURIComponent(profile.id)+
    "/status","PATCH",{status:statusChoice,reason:reason.trim(),revision:profile.revision});
   if(!mounted.current||!liveRef.current)return;
   // The update response may not include clinical flags; verify via GET.
   // Avoid claiming success if server payload shape does not match expected status.
   const saved=raw&&typeof raw==="object"&&"patient" in raw?
    parsePatientBrief((raw as {patient:unknown}).patient):null;
   if(!saved||saved.id!==profile.id||saved.status!==statusChoice||
    saved.revision<=profile.revision)
    throw Error("WRITE_RESPONSE_UNVERIFIED");
   setEditingStatus(false);setReason("");setProfile(null);
   setPane("directory");setDetailId(null);setReload(n=>n+1);
   setSuccess(words.statusSuccess);
  }catch(e){if(mounted.current&&liveRef.current)writeFailed(e)}
  finally{if(mounted.current)setBusy(false)}
 }
 const confirmStatus=()=>{
  if(!profile||uncertainWrite||statusChoice===profile.status||!validStatusReason(reason)){
   setFail(words.reason);return;
  }
  Alert.alert(words.statusUpdate,words.statusConfirm+" "+words.warning,[
   {text:words.cancel,style:"cancel"},
   {text:words.confirm,style:statusChoice==="archived"?"destructive":"default",
    onPress:()=>{void saveStatus()}}
  ]);
 };
 const label=(value:string|null|undefined)=>value?.trim()||words.none;
 const identity=(value:PatientBrief)=>[value.preferredName,value.familyName].filter(Boolean).join(" ");
 const filtered=directory?.patients||[];
 if(!permitted)return <Section title={words.heading}>
  <Text style={s.error}>{words.access}</Text></Section>;
 return <View style={s.root}>
  <View style={s.hero}>
   <View style={s.heroTop}><PatientIcon name="shield" color="#80d7d6" size={17}/>
    <Text style={s.heroKicker}>{words.kicker}</Text></View>
   <Text style={s.heroTitle}>{words.heading}</Text>
   <Text style={s.heroText}>{words.intro}</Text>
   <Text style={s.heroClinic} numberOfLines={1}>{clinic.clinicName}</Text>
  </View>
  <View style={[s.topActions,{flexDirection:rtl?"row-reverse":"row"}]}>
   {pane!=="directory"?<Action icon="chevron" secondary label={words.back}
    onPress={goDirectory}/>:
    canEdit?<Action icon="plus" label={words.create} onPress={openCreate}/>:
    <View style={s.readonlyBadge}><PatientIcon name="shield" size={17}
     color="#527b91"/><Text style={s.muted}>{words.profileHidden}</Text></View>}
   <Action label={words.retry} icon="clock" secondary onPress={refresh}/>
  </View>
  {fail!==""&&<Text style={s.error} accessibilityRole="alert">{fail}</Text>}
  {success!==""&&<Text style={s.success} accessibilityRole="alert">{success}</Text>}
  {pane==="directory"&&<View style={s.gap}>
   <View style={s.totals}>
    {([
     [words.total,counts?.total],[words.activeCount,counts?.active],
     [words.inactiveCount,counts?.inactive],[words.archivedCount,counts?.archived]
    ] as [string,number|undefined][]).map(([title,value],index)=>
     <View key={index} style={s.totalCard}>
      <Text style={s.totalValue}>{value??"—"}</Text>
      <Text style={s.totalLabel}>{title}</Text></View>)}
   </View>
   <Section title={words.search} hint={words.searchHint}>
    <TextInput value={query} onChangeText={setQuery} maxLength={120}
     accessibilityLabel={words.search} placeholder={words.search}
     autoCorrect={false} style={s.input} placeholderTextColor="#879fb3"
     returnKeyType="search" onSubmitEditing={submitSearch}/>
    <View style={s.pillRow}><Action label={words.runSearch} icon="search"
     onPress={submitSearch}/>
     <Action label={words.clearSearch} secondary onPress={()=>{
      setQuery("");setSearched("");setPage(1);setDirectory(null)}}/></View>
    <Text style={s.fieldLabel}>{words.filter}</Text>
    <View style={s.pillRow}>{(["active","inactive","archived","all"] as const).map(x=>
     <Pressable key={x} accessibilityRole="button"
      accessibilityState={{selected:status===x}} onPress={()=>changeFilter(x)}
      style={[s.pill,status===x&&s.pillActive]}>
      <Text style={[s.pillText,status===x&&s.pillTextActive]}>{words[x]}</Text></Pressable>)}</View>
    <Text style={s.fieldLabel}>{words.sort}</Text>
    <View style={s.pillRow}>{(["activity","name"] as const).map(x=>
     <Pressable key={x} accessibilityRole="button"
      accessibilityState={{selected:sort===x}} onPress={()=>changeSort(x)}
      style={[s.pill,sort===x&&s.pillActive]}>
      <Text style={[s.pillText,sort===x&&s.pillTextActive]}>
       {x==="activity"?words.activity:words.nameSort}</Text></Pressable>)}</View>
   </Section>
   <Section title={words.directory}>
    {listState==="loading"?<View style={s.loading}><ActivityIndicator color={PALETTE.blue}/>
     <Text style={s.muted}>{words.loading}</Text></View>:
     listState!=="ready"?<Text style={s.error}>
      {listState==="forbidden"?words.access:words.offline}</Text>:
     !filtered.length?<Text style={s.empty}>{words.empty}</Text>:
     filtered.map(person=><Pressable key={person.id} accessibilityRole="button"
      accessibilityLabel={words.view+": "+identity(person)}
      onPress={()=>openPerson(person)} style={({pressed})=>[s.person,pressed&&s.pressed]}>
      <View style={s.avatar}><Text style={s.avatarLetter}>
       {person.preferredName.slice(0,1).toLocaleUpperCase()}</Text></View>
      <View style={s.personBody}>
       <Text style={[s.personName,{textAlign:rtl?"right":"left"}]}
        numberOfLines={1}>{identity(person)}</Text>
       <Text style={s.personMeta}>{person.patientNumber} · {niceDate(person.updatedAt)}</Text>
      </View><Badge status={person.status} words={words}/>
      <PatientIcon name="chevron" color="#7394aa" size={19}/>
     </Pressable>)}
    {directory&&<View style={s.pagination}>
     <Action label={words.backPage} secondary disabled={page<=1}
      onPress={()=>setPage(x=>Math.max(1,x-1))}/>
     <Text style={s.pageText}>{words.page} {page} {words.of} {directory.pages}</Text>
     <Action label={words.nextPage} secondary disabled={page>=directory.pages}
      onPress={()=>setPage(x=>x+1)}/></View>}
    <Text style={s.muted}>{words.privacy}</Text>
   </Section>
  </View>}
  {pane==="profile"&&<View style={s.gap}>
   {detailState==="loading"?<View style={s.loading}><ActivityIndicator color={PALETTE.blue}/>
    <Text style={s.muted}>{words.loading}</Text></View>:
    detailState!=="ready"||!profile?<Section title={words.profile}>
     <Text style={s.error}>{detailState==="forbidden"?words.access:words.offline}</Text>
     <Action label={words.retry} secondary onPress={refresh}/></Section>:
    <View style={s.gap}>
     <Section title={words.profile}>
      <View style={s.profileHead}>
       <View style={s.profileAvatar}><Text style={s.profileLetter}>
        {profile.preferredName.slice(0,1).toLocaleUpperCase()}</Text></View>
       <View style={s.profileIdentity}><Text style={s.profileName}>
        {identity(profile)}</Text>
        <Text style={s.personMeta}>{profile.patientNumber}</Text></View>
       <Badge status={profile.status} words={words}/>
      </View>
      <LabelValue label={words.updated} value={niceDate(profile.updatedAt)} rtl={rtl}/>
      {canEdit&&<Action label={words.modify} secondary icon="settings" onPress={openEdit}/>}
     </Section>
     <View style={s.pillRow}>
      {(["summary","appointments","clinical"] as const)
       .filter(x=>x==="summary"||x==="appointments"&&canViewPatientAppointments(clinic.role)||
        x==="clinical"&&clinical).map(x=>
       <Pressable key={x} accessibilityRole="tab" accessibilityState={{selected:section===x}}
        onPress={()=>{setSection(x);setHistory(null);setEncounters(null);setTreatments(null)}}
        style={[s.pill,section===x&&s.pillActive]}>
        <Text style={[s.pillText,section===x&&s.pillTextActive]}>
         {x==="summary"?words.details:x==="appointments"?words.appointments:words.clinical}</Text>
       </Pressable>)}
     </View>
     {section==="summary"&&<View style={s.gap}>
      <Section title={words.details}>
       <LabelValue label={words.fullName} value={profile.preferredName} rtl={rtl}/>
       <LabelValue label={words.familyName} value={label(profile.familyName)} rtl={rtl}/>
       <LabelValue label={words.patientId} value={profile.patientNumber} rtl={rtl}/>
       {clinic.role!=="cashier"&&<><LabelValue label={words.birthDate}
        value={label(profile.dateOfBirth)} rtl={rtl}/>
        <LabelValue label={words.estimatedAge} value={profile.ageEstimate===null?
         words.none:String(profile.ageEstimate)} rtl={rtl}/>
        <LabelValue label={words.province} value={label(profile.province)} rtl={rtl}/>
        <LabelValue label={words.city} value={label(profile.city)} rtl={rtl}/></>}
       {clinic.role==="cashier"&&<Text style={s.muted}>{words.profileHidden}</Text>}
      </Section>
      {canViewContact(clinic.role)&&<Section title={words.contact} hint={words.contactHint}>
       <Action label={shownContact?words.hideContact:words.showContact}
        secondary icon="shield" onPress={()=>setShownContact(x=>!x)}/>
       {shownContact&&<View style={s.gap}>
        <LabelValue label={words.phone} value={label(profile.phone)} rtl={rtl}/>
        {profile.phone&&!profile.phoneVerified&&<Text style={s.warning}>{words.phoneUnverified}</Text>}
        <LabelValue label={words.alternateContact} value={label(profile.alternateContact)} rtl={rtl}/>
        <LabelValue label={words.address} value={label(profile.address)} rtl={rtl}/>
        <LabelValue label={words.emergencyContact} value={label(profile.emergencyContact)} rtl={rtl}/>
       </View>}
      </Section>}
      {canChangePatientStatus(clinic.role)&&<Section title={words.statusUpdate}
       hint={words.archivedWarning}>
       {!editingStatus?<Action label={words.statusUpdate} secondary
        onPress={()=>{setEditingStatus(true);setStatusChoice(profile.status);setReason("")}}/>:
        <View style={s.gap}>
         <Text style={s.fieldLabel}>{words.newStatus}</Text>
         <View style={s.pillRow}>{(["active","inactive","archived"] as const).map(value=>
          <Pressable key={value} onPress={()=>setNewPatientStatus(value)}
           accessibilityRole="button" accessibilityState={{selected:statusChoice===value}}
           style={[s.pill,statusChoice===value&&s.pillActive]}>
           <Text style={[s.pillText,statusChoice===value&&s.pillTextActive]}>
            {words[value]}</Text></Pressable>)}</View>
         <Field title={words.reason} value={reason} onChange={setReason}
          placeholder={words.reasonHint}/>
         <Action label={words.confirm} disabled={busy||uncertainWrite||statusChoice===profile.status||
          !validStatusReason(reason)} onPress={confirmStatus}/>
         <Action label={words.cancel} secondary
          onPress={()=>{setEditingStatus(false);setReason("")}}/>
        </View>}
      </Section>}
     </View>}
     {section==="appointments"&&canViewPatientAppointments(clinic.role)&&
      <Section title={words.appointments} hint={words.appointmentHint}>
       {historyState==="loading"?<View style={s.loading}><ActivityIndicator color={PALETTE.blue}/></View>:
       historyState!=="ready"||!history?<Text style={s.error}>
        {historyState==="forbidden"?words.access:words.offline}</Text>:
       history.rows.length===0?<Text style={s.empty}>{words.appointmentEmpty}</Text>:
       <View style={s.gap}>{history.rows.map(row=><View key={row.id} style={s.historyRow}>
        <View style={s.historyIcon}><PatientIcon name="calendar" color={PALETTE.blue} size={19}/></View>
        <View style={s.historyCopy}><Text style={s.historyTitle}>{row.serviceName}</Text>
         <Text style={s.muted}>{niceDate(row.startAt)} · {words.doctor}: {row.providerName}</Text>
        </View><Text style={s.historyStatus}>{words[row.status]||row.status}</Text>
       </View>)}
       {(history.truncated||history.total>20)&&
        <Text style={s.warning}>{words.historyTruncated}</Text>}</View>}
      </Section>}
     {section==="clinical"&&clinical&&<View style={s.gap}>
      <Section title={words.encounters} hint={words.encountersHint}>
       {historyState==="loading"?<ActivityIndicator color={PALETTE.blue}/>:
        encounters===null?<Text style={s.error}>{words.offline}</Text>:
        !encounters.length?<Text style={s.empty}>{words.encounterEmpty}</Text>:
        encounters.slice(0,15).map(item=><View key={item.id} style={s.historyRow}>
         <View style={s.historyIcon}><PatientIcon name="file" color={PALETTE.blue} size={20}/></View>
         <View style={s.historyCopy}><Text style={s.historyTitle}>{words.created} · {niceDate(item.createdAt)}</Text>
          <Text style={s.muted}>{item.authorName}</Text></View>
         <Text style={s.historyStatus}>{words[item.status]||item.status}</Text>
        </View>)}
      </Section>
      <Section title={words.treatment} hint={words.treatmentHint}>
       {historyState==="loading"?<ActivityIndicator color={PALETTE.blue}/>:
        treatments===null?<Text style={s.error}>{words.offline}</Text>:
        !treatments.length?<Text style={s.empty}>{words.treatmentEmpty}</Text>:
        treatments.slice(0,20).map(item=><View key={item.id} style={s.treatmentRow}>
         <LabelValue label={words.status} value={item.status} rtl={rtl}/>
         <LabelValue label={words.stages}
          value={item.completedStages+" / "+item.stageCount} rtl={rtl}/>
         <LabelValue label={words.sessions} value={String(item.expectedSessions)} rtl={rtl}/>
        </View>)}
       <Text style={s.muted}>{words.serverScope}</Text>
      </Section>
      <Action label={words.web} icon="shield" secondary
       onPress={()=>onOpenWeb("/clinic/patients?clinic="+encodeURIComponent(clinic.clinicId))}/>
      <Text style={s.muted}>{words.webHint}</Text>
     </View>}
    </View>}
  </View>}
  {(pane==="create"||pane==="edit")&&canEdit&&<View style={s.gap}>
   <Section title={pane==="create"?words.newPatient:words.modify}
    hint={words.warning}>
    <Text style={s.fieldLabel}>{words.required}</Text>
    <Field title={words.fullName+" *"} value={draft.preferredName}
     onChange={v=>update("preferredName",v)}/>
    <Field title={words.familyName} value={draft.familyName}
     onChange={v=>update("familyName",v)}/>
    <Text style={s.fieldLabel}>{words.optional}</Text>
    <Field title={words.phone} value={draft.phone} number onChange={v=>update("phone",v)}/>
    <Field title={words.alternateContact} value={draft.alternateContact}
     onChange={v=>update("alternateContact",v)}/>
    <Field title={words.birthDate} value={draft.dateOfBirth}
     placeholder="YYYY-MM-DD" onChange={v=>update("dateOfBirth",v)}/>
    <Field title={words.estimatedAge} value={draft.ageEstimate} number
     onChange={v=>update("ageEstimate",v)}/>
    <Text style={s.muted}>{words.dobRule}</Text>
    <Field title={words.province} value={draft.province}
     onChange={v=>update("province",v)}/>
    <Field title={words.city} value={draft.city} onChange={v=>update("city",v)}/>
    <Field title={words.address} value={draft.address} onChange={v=>update("address",v)}/>
    <Field title={words.emergencyContact} value={draft.emergencyContact}
     onChange={v=>update("emergencyContact",v)}/>
    <Pressable accessibilityRole="checkbox"
     accessibilityState={{checked:draft.noticeAcknowledged}}
     onPress={()=>update("noticeAcknowledged",!draft.noticeAcknowledged)}
     style={s.checkbox}>
     <View style={[s.checkSquare,draft.noticeAcknowledged&&s.checkMarked]}>
      {draft.noticeAcknowledged&&<PatientIcon name="check" color="#fff" size={16}/>}</View>
     <Text style={s.checkboxLabel}>{words.notice}</Text></Pressable>
    {uncertainWrite&&<Text style={s.warning}>{words.uncertain}</Text>}
    <Action label={busy?words.busy:words.save} icon="check"
     onPress={confirmPatient} disabled={busy||uncertainWrite||validatePatientDraft(draft).length>0}/>
    <Action secondary label={words.cancel} onPress={goDirectory} disabled={busy}/>
   </Section>
   <Text style={s.muted}>{words.privacy}</Text>
  </View>}
  <Text style={s.privacy}>{words.privacy}</Text>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:15},
 gap:{gap:13},
 hero:{backgroundColor:"#152f48",borderRadius:18,padding:20,gap:10},
 heroTop:{flexDirection:"row",alignItems:"center",gap:9},
 heroKicker:{color:"#8cdbd8",letterSpacing:1,fontWeight:"900",fontSize:10},
 heroTitle:{color:"#fff",fontSize:24,fontWeight:"900",lineHeight:34},
 heroText:{color:"#b9d2e5",fontSize:12,lineHeight:20},
 heroClinic:{color:"#e6f2fa",fontSize:11,fontWeight:"800",paddingTop:7,
  borderTopColor:"#345875",borderTopWidth:1},
 topActions:{gap:9,flexWrap:"wrap"},
 card:{borderWidth:1,borderColor:"#dce7ef",borderRadius:16,
  backgroundColor:"#fff",padding:16,gap:13,
  shadowColor:"#163b59",shadowOpacity:.035,shadowRadius:14,
  shadowOffset:{width:0,height:5},elevation:1},
 section:{color:PALETTE.ink,fontSize:18,fontWeight:"900"},
 muted:{fontSize:11,color:PALETTE.muted,lineHeight:19},
 privacy:{fontSize:10,color:"#768da0",lineHeight:17,textAlign:"center",paddingBottom:12},
 totals:{flexDirection:"row",flexWrap:"wrap",gap:8},
 totalCard:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dce7ef",borderRadius:13,
  flexGrow:1,width:"47%",padding:15,minHeight:100,gap:9},
 totalValue:{fontSize:24,fontWeight:"900",color:"#1a5e96"},
 totalLabel:{fontSize:11,fontWeight:"800",color:"#71869a"},
 action:{backgroundColor:"#1766a3",borderRadius:11,minHeight:44,
  flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,
  paddingHorizontal:13,paddingVertical:11,flexGrow:1},
 actionSoft:{backgroundColor:"#e9f3fc",borderWidth:1,borderColor:"#cde0ef"},
 actionDanger:{backgroundColor:"#fff1f1"},
 actionText:{color:"#fff",fontSize:12,fontWeight:"900",textAlign:"center"},
 actionTextSoft:{color:"#1a6297"},actionTextDanger:{color:"#a34251"},
 disabled:{opacity:.45},pressed:{opacity:.8},
 readonlyBadge:{flex:1,flexDirection:"row",alignItems:"center",gap:8},
 pillRow:{flexDirection:"row",flexWrap:"wrap",gap:8},
 pill:{minHeight:43,paddingVertical:10,paddingHorizontal:12,
  borderWidth:1,borderColor:"#dae5ef",borderRadius:11,backgroundColor:"#f4f7fb",
  justifyContent:"center"},
 pillActive:{backgroundColor:"#e6f3fc",borderColor:"#3384bb"},
 pillText:{fontSize:11,fontWeight:"800",color:"#617b90"},
 pillTextActive:{color:"#145e92"},
 fieldLabel:{fontSize:12,fontWeight:"900",color:"#375974"},
 field:{gap:7},input:{fontSize:13,color:"#213f59",backgroundColor:"#f8fbfd",
  minHeight:48,borderRadius:11,borderWidth:1,borderColor:"#d4e3ed",
  paddingHorizontal:13,paddingVertical:11},
 loading:{minHeight:120,justifyContent:"center",alignItems:"center",gap:12},
 empty:{paddingVertical:22,textAlign:"center",fontSize:12,color:"#7b91a2"},
 error:{color:"#9f4050",backgroundColor:"#fff1f2",borderWidth:1,borderColor:"#f4d0d5",
  padding:12,borderRadius:11,fontSize:12,lineHeight:20},
 success:{color:"#256d55",backgroundColor:"#eaf8f0",borderColor:"#caead7",borderWidth:1,
  padding:12,borderRadius:11,fontSize:12,lineHeight:20},
 warning:{color:"#916624",backgroundColor:"#fff6e8",borderWidth:1,borderColor:"#f1dcb5",
  padding:12,borderRadius:10,fontSize:11,lineHeight:19},
 person:{minHeight:78,flexDirection:"row",alignItems:"center",gap:11,
  paddingVertical:11,paddingHorizontal:9,borderWidth:1,borderColor:"#e9eff5",
  borderRadius:12,backgroundColor:"#f8fafc"},
 avatar:{width:42,height:42,borderRadius:13,backgroundColor:"#e3f1fc",
  justifyContent:"center",alignItems:"center"},
 avatarLetter:{color:"#1b639b",fontWeight:"900",fontSize:19},
 personBody:{flex:1,gap:5,minWidth:0},
 personName:{fontSize:12,fontWeight:"900",color:"#284b67"},
 personMeta:{fontSize:10,color:"#7591a5",fontWeight:"700"},
 badge:{borderRadius:9,paddingHorizontal:9,paddingVertical:7},
 badgeText:{fontSize:10,fontWeight:"900"},
 pagination:{flexDirection:"row",gap:7,alignItems:"center",justifyContent:"space-around"},
 pageText:{fontSize:11,fontWeight:"900",color:"#466d89",minWidth:69,textAlign:"center"},
 profileHead:{flexDirection:"row",gap:12,alignItems:"center"},
 profileAvatar:{width:50,height:50,borderRadius:15,backgroundColor:"#e4f0fd",
  alignItems:"center",justifyContent:"center"},
 profileLetter:{fontWeight:"900",fontSize:22,color:"#216aa1"},
 profileIdentity:{flex:1,minWidth:0,gap:5},
 profileName:{fontSize:15,fontWeight:"900",color:"#254963"},
 valueRow:{flexDirection:"row",gap:13,justifyContent:"space-between",
  paddingVertical:9,borderBottomWidth:1,borderBottomColor:"#eef2f6"},
 valueLabel:{fontSize:11,color:"#6e869a",flex:1},
 valueText:{fontSize:11,color:"#284b65",fontWeight:"800",flex:1},
 checkbox:{flexDirection:"row",alignItems:"flex-start",gap:12,
  backgroundColor:"#f0f7fc",padding:13,borderRadius:11},
 checkSquare:{width:25,height:25,borderRadius:7,borderWidth:2,
  borderColor:"#9cbcd1",alignItems:"center",justifyContent:"center"},
 checkMarked:{backgroundColor:"#176a9b",borderColor:"#176a9b"},
 checkboxLabel:{flex:1,fontSize:11,color:"#3e627b",lineHeight:20},
 historyRow:{flexDirection:"row",alignItems:"center",gap:9,
  paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#edf2f6"},
 historyIcon:{width:34,height:34,borderRadius:10,backgroundColor:"#eaf4fc",
  alignItems:"center",justifyContent:"center"},
 historyCopy:{flex:1,gap:5},
 historyTitle:{fontSize:12,fontWeight:"900",color:"#274e6a"},
 historyStatus:{fontSize:10,fontWeight:"800",color:"#567b96",maxWidth:95,textAlign:"right"},
 treatmentRow:{padding:12,backgroundColor:"#f8fafc",borderRadius:11,gap:6},
});
