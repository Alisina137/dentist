import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,AppState,Pressable,StyleSheet,Text,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import type {NativeClinicSpace} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 dashboardCanRead,dashboardEmptySnapshot,dashboardShortcuts,parseOperationalSummary,
 parseQueueSummary,parseScheduleSummary,snapshotIsStale,
 type DashboardShortcuts,type DashboardSnapshot,type DashboardRead,
 type QueueSummary,type OperationalSummary,type ScheduleSummary,type QueueStatus
} from "./native-clinic-phase21-model";

type Locale="en"|"fa-AF"|"ps-AF";
type TabDestination="onboard"|"team"|"settings";
type Props={
 clinic:NativeClinicSpace;locale:Locale;
 plannedDentists:number|null;request:Phase20Request;
 onNavigate:(tab:TabDestination)=>void;onOpenWeb:(path:string)=>void;
};
type SliceName="operations"|"schedule"|"queue";
const labels={
 en:{
  label:"DAILY OPERATIONS",welcome:"Your practice at a glance",
  verified:"Clinic approved",review:"Registration under review",draft:"Registration incomplete",
  suspended:"Clinic suspended",role:"My access",clinicDay:"Asia/Kabul clinic time",
  latest:"Updated",stale:"Snapshot expired — refresh",loading:"Refreshing clinic activity",
  offline:"Live service unavailable",partial:"Some modules could not be loaded",
  access:"Restricted by your staff role",retry:"Refresh dashboard",quick:"Quick access",
  preview:"Private staff preview · not a clinical release approval",
  today:"Today",week:"This week",waiting:"Checked in",treating:"In treatment",
  upcoming:"Scheduled",completed:"Completed",noShow:"No show",
  activeDentists:"Scheduled dentists",services:"Active services",
  chairs:"Active chairs",days:"Open weekdays",
  overview:"Live appointment summary",todayList:"Today's appointment queue",
  todayDesc:"Up to six authorized appointments in start-time order",
  empty:"No appointments scheduled for today",
  hidden:"Appointments aren't available for this staff role",
  unavailable:"Unable to verify the current appointments. Retry.",
  patient:"Patient",dentist:"Provider",
  at:"at",setup:"Clinic setup",setupDesc:"Real configuration from clinic operations",
  setupReady:"Configured for preview",setupAction:"Action required",
  setupUnavailable:"Setup data cannot be verified",
  service:"At least one active service",chair:"Required chair capacity",
  clinicHours:"Clinic opening hours",dentistHours:"Dentist working hours",
  registration:"Registration",team:"Doctors & staff",todayShortcut:"Today's queue",
  bookings:"Appointments",patients:"Patient directory",operations:"Services & hours",
  finance:"Clinic finance",account:"Account & security",
  registrationHint:"License and approval",teamHint:"Credentials and invitations",
  todayHint:"Read today's schedule",bookingsHint:"Open secure appointment workspace",
  patientsHint:"Authorized patient directory",operationsHint:"Services, chairs, calendar",
  financeHint:"Secure billing workspace",accountHint:"Privacy and account settings",
  noPermissions:"No operational panels are available for this role.",
  web:"Opens secure clinic web; you may need to sign in separately.",
  loadingHint:"The dashboard only uses live authorized clinic reads.",
  go:"Open",more:"View six appointments",less:"Show first three",
  timeUnknown:"Time unavailable",nameUnknown:"Patient name unavailable",
  processing:"Preview only",noClinical:"No clinical or financial data is stored on this dashboard."
 },
 "fa-AF":{
  label:"عملیات روزانه",welcome:"نمای کلی کلینیک شما",
  verified:"کلینیک تأیید شده",review:"در حال بررسی ثبت",draft:"ثبت تکمیل نشده",
  suspended:"کلینیک تعلیق است",role:"دسترسی من",clinicDay:"وقت کلینیک، کابل",
  latest:"آخرین بررسی",stale:"خلاصه قدیمی شد؛ دوباره بررسی کنید",
  loading:"دریافت فعالیت کلینیک",offline:"خدمات زنده در دسترس نیست",
  partial:"بعضی بخش‌ها در دسترس نیست",access:"دسترسی این نقش محدود است",
  retry:"تازه‌سازی داشبورد",quick:"دسترسی سریع",
  preview:"نمای خصوصی کارمندان · مجوز استفاده طبی نیست",
  today:"امروز",week:"این هفته",waiting:"حاضرشده",
  treating:"در حال تداوی",upcoming:"ثبت‌شده",completed:"تکمیل‌شده",
  noShow:"حاضرنشده",activeDentists:"داکتران دارای ساعت کاری",
  services:"خدمات فعال",chairs:"چوکی‌های فعال",days:"روزهای کاری",
  overview:"خلاصه واقعی نوبت‌ها",todayList:"صف نوبت‌های امروز",
  todayDesc:"حداکثر شش نوبت مجاز به ترتیب زمان شروع",
  empty:"امروز نوبتی ثبت نشده",hidden:"نوبت‌ها برای این نقش مجاز نیستند",
  unavailable:"معلومات نوبت‌ها تأیید نشد. دوباره تلاش کنید.",
  patient:"مریض",dentist:"داکتر",at:"ساعت",
  setup:"آمادگی کلینیک",setupDesc:"تنظیمات واقعی از سرور کلینیک",
  setupReady:"برای پیش‌نمایش تنظیم است",setupAction:"نیاز به تکمیل",
  setupUnavailable:"معلومات تنظیمات تأیید نشد",
  service:"حداقل یک خدمت فعال",chair:"ظرفیت چوکی‌های ضروری",
  clinicHours:"ساعات کاری کلینیک",dentistHours:"ساعات کاری داکتران",
  registration:"ثبت کلینیک",team:"داکتران و کارمندان",
  todayShortcut:"صف امروز",bookings:"نوبت‌ها",patients:"فهرست مریضان",
  operations:"خدمات و ساعات",finance:"امور مالی",account:"حساب و امنیت",
  registrationHint:"جواز و تأیید",teamHint:"اسناد و دعوت‌نامه‌ها",
  todayHint:"نوبت‌های امروز",bookingsHint:"فضای مصئون نوبت‌ها",
  patientsHint:"فهرست مجاز مریضان",operationsHint:"خدمات، چوکی‌ها، زمان‌بندی",
  financeHint:"مدیریت مصئون صورت‌حساب",accountHint:"حریم خصوصی و حساب",
  noPermissions:"برای این نقش بخش عملیاتی موجود نیست.",
  web:"وب کلینیک باز می‌شود؛ شاید ورود جداگانه لازم باشد.",
  loadingHint:"فقط معلومات واقعی و مجاز کلینیک نشان داده می‌شود.",
  go:"بازکردن",more:"نمایش شش نوبت",less:"نمایش سه نوبت",
  timeUnknown:"زمان نامعلوم",nameUnknown:"نام مریض موجود نیست",
  processing:"فقط پیش‌نمایش",noClinical:"هیچ سند طبی یا مالی در این صفحه ذخیره نمی‌شود."
 },
 "ps-AF":{
  label:"ورځني فعالیتونه",welcome:"ستاسو د کلینیک لنډیز",
  verified:"کلینیک تایید شوی",review:"ثبت د کتنې لاندې دی",
  draft:"ثبت نیمګړی دی",suspended:"کلینیک ځنډول شوی",
  role:"زما واک",clinicDay:"د کابل د کلینیک وخت",
  latest:"تازه شوی",stale:"معلومات زاړه دي؛ بیا یې وګورئ",
  loading:"د کلینیک معلومات ترلاسه کېږي",offline:"ژوندۍ شبکه نشته",
  partial:"ځینې برخې نه دي ترلاسه شوې",access:"دا رول محدود لاسرسی لري",
  retry:"ډشبورډ تازه کول",quick:"چټک لاسرسی",
  preview:"د کارکوونکو شخصي لید · د درملنې اجازه نه ده",
  today:"نن",week:"دا اوونۍ",waiting:"راغلي ناروغان",
  treating:"تر درملنې لاندې",upcoming:"ټاکل شوي",
  completed:"بشپړ شوي",noShow:"نه دي راغلي",
  activeDentists:"د مهالویش ډاکټران",services:"فعال خدمتونه",
  chairs:"فعالې څوکۍ",days:"کاري ورځې",
  overview:"د ملاقاتونو حقیقي لنډیز",todayList:"د نن ملاقاتونه",
  todayDesc:"تر شپږو مجاز ملاقاتونو پورې د وخت له مخې",
  empty:"نن ملاقات نه شته",hidden:"دې رول ته ملاقاتونه نشته",
  unavailable:"د ملاقاتونو معلومات نه دي تایید شوي. بیا هڅه وکړئ.",
  patient:"ناروغ",dentist:"ډاکټر",at:"په",
  setup:"د کلینیک تنظیم",setupDesc:"د کلینیک له سرور څخه رښتیني معلومات",
  setupReady:"د مخکتنې لپاره تنظیم شوی",setupAction:"کار ته اړتیا لري",
  setupUnavailable:"د تنظیم معلومات نه دي تایید شوي",
  service:"لږ تر لږه یو فعال خدمت",chair:"د څوکۍ اړین ظرفیت",
  clinicHours:"د کلینیک کاري ساعتونه",dentistHours:"د ډاکټر کاري ساعتونه",
  registration:"د کلینیک ثبت",team:"ډاکټران او کارکوونکي",
  todayShortcut:"د نن کتار",bookings:"ملاقاتونه",patients:"د ناروغانو فهرست",
  operations:"خدمتونه او ساعتونه",finance:"مالي چارې",account:"حساب او امنیت",
  registrationHint:"جواز او تایید",teamHint:"اسناد او بلنې",
  todayHint:"نننۍ کتار",bookingsHint:"د ملاقات خوندي وېب",
  patientsHint:"د ناروغانو مجاز فهرست",operationsHint:"خدمتونه، څوکۍ او مهالویش",
  financeHint:"د حسابونو خوندي وېب",accountHint:"د حساب محرمیت",
  noPermissions:"دې رول ته کاري برخې نشته.",
  web:"د کلینیک وېب پرانیستل کېږي؛ کېدای شي بیا ننوتل وغواړي.",
  loadingHint:"یوازې مجاز او تازه معلومات ښکاره کېږي.",
  go:"پرانیزئ",more:"شپږ ملاقاتونه ښکاره کړئ",less:"لومړي درې ښکاره کړئ",
  timeUnknown:"وخت نه شته",nameUnknown:"د ناروغ نوم نشته",
  processing:"یوازې مخکتنه",noClinical:"دلته طبي یا مالي اسناد نه ساتل کېږي."
 }
} as const;
const colors={navy:"#142d47",ink:"#1b344d",muted:"#668095",line:"#dce6f1",
 blue:"#185e99",green:"#147f76",amber:"#a36c22",pale:"#f3f7fb",white:"#fff"};
const queueColor:Record<QueueStatus,{bg:string;fg:string}>={
 confirmed:{bg:"#eaf3fd",fg:"#185b97"},
 arrived:{bg:"#fff5e5",fg:"#8b5a18"},
 in_treatment:{bg:"#f0edfc",fg:"#7050ad"},
 completed:{bg:"#e9f7f1",fg:"#26704f"},
 no_show:{bg:"#fdf0f1",fg:"#a44153"}
};
const shortcutIcons:Record<DashboardShortcuts,PatientIconName>={
 registration:"file",team:"users",today:"calendar",bookings:"clock",
 patients:"user",operations:"clinic",finance:"file",account:"shield"
};
const clinicPaths:Partial<Record<DashboardShortcuts,string>>={
 bookings:"/clinic/appointments",patients:"/clinic/patients",
 operations:"/clinic/services",finance:"/clinic/finance"
};
const blank=(role:NativeClinicSpace["role"])=>dashboardEmptySnapshot(role);
function classifyError(error:unknown):DashboardRead<never>["state"]{
 const status=error&&typeof error==="object"&&"status" in error?
  (error as {status?:unknown}).status:null;
 return status===403||status===401?"forbidden":"unavailable";
}
const statusFor=(role:NativeClinicSpace["role"],result:PromiseSettledResult<unknown>,
 parser:(value:unknown)=>any)=>{
 if(result.status==="rejected")
  return {state:classifyError(result.reason),data:null} as DashboardRead<any>;
 const data=parser(result.value);
 return data?{state:"ready",data} as DashboardRead<any>:
  {state:"unavailable",data:null} as DashboardRead<any>;
};
function timeKabul(value:string){
 try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
 catch{return "—"}
}
function updatedTime(value:number){
 try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
 catch{return "—"}
}
function InfoMetric({value,label,icon,index}:{value:number|null;label:string;
 icon:PatientIconName;index:number}){
 return <View style={styles.metric}>
  <View style={[styles.metricIcon,index===1?styles.metricIconMint:null]}>
   <PatientIcon name={icon} size={20} color={index===1?colors.green:colors.blue}/></View>
  <Text style={styles.metricValue}>{value===null?"—":value.toLocaleString("en")}</Text>
  <Text style={styles.metricLabel}>{label}</Text>
 </View>;
}
function Skeleton({rows=3}:{rows?:number}){
 return <View style={styles.skeletonWrap} accessibilityLabel="Loading" accessibilityRole="progressbar">
  {Array.from({length:rows},(_,idx)=><View key={idx}
   style={[styles.skeleton,idx%2?{width:"72%"}:{width:"95%"}]}/>)}
 </View>;
}
export function NativeClinicPhase21({clinic,locale,plannedDentists,request,
 onNavigate,onOpenWeb}:Props){
 const t=labels[locale],rtl=locale!=="en";
 const [snapshot,setSnapshot]=useState<DashboardSnapshot>(()=>blank(clinic.role));
 const [tick,setTick]=useState(0),[clock,setClock]=useState(Date.now());
 const [foreground,setForeground]=useState(!["background","inactive"].includes(AppState.currentState));
 const [expanded,setExpanded]=useState(false);
 const seq=useRef(0);
 const active=useRef(true);
 useEffect(()=>{
  active.current=true;
  return()=>{active.current=false;seq.current++};
 },[]);
 useEffect(()=>{
  const sub=AppState.addEventListener("change",state=>{
   const isActive=state==="active";
   setForeground(isActive);
   if(isActive)setTick(current=>current+1);
  });
  return()=>sub.remove();
 },[]);
 useEffect(()=>{
  const timer=setInterval(()=>setClock(Date.now()),30000);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  if(!foreground){
   // Hide all private previews from the OS task-switcher and after sleep.
   setSnapshot(blank(clinic.role));setExpanded(false);
   return;
  }
  const controller=new AbortController(),revision=++seq.current;
  const permitted=(resource:"operations"|"appointments"|"queue")=>
   dashboardCanRead(clinic.role,resource);
  const next=blank(clinic.role);setSnapshot(next);
  const cid=encodeURIComponent(clinic.clinicId);
  const paths={
   operations:"/v1/operations/clinics/"+cid+"/summary",
   schedule:"/v1/appointments/clinics/"+cid+"/overview",
   queue:"/v1/appointments/clinics/"+cid+"/queue"
  };
  const entries=([
   ["operations",permitted("operations")],
   ["schedule",permitted("appointments")],
   ["queue",permitted("queue")]
  ] as [SliceName,boolean][]).filter(([,allowed])=>allowed);
  const read=async()=>{
   const results=await Promise.allSettled(entries.map(([name])=>
    request<unknown>(paths[name],"GET",undefined,controller.signal)));
   if(controller.signal.aborted||!active.current||revision!==seq.current)return;
   const data={...next};
   for(let i=0;i<entries.length;i++){
    const [name]=entries[i],result=results[i];
    if(name==="operations")
     data.operations=statusFor(clinic.role,result,parseOperationalSummary);
    if(name==="schedule")
     data.schedule=statusFor(clinic.role,result,parseScheduleSummary);
    if(name==="queue")
     data.queue=statusFor(clinic.role,result,value=>
      parseQueueSummary(value,clinic.clinicId));
   }
   if(data.queue.state==="ready"&&data.schedule.state==="ready"&&
    data.queue.data!.day!==data.schedule.data!.day){
    data.queue={state:"unavailable",data:null};
   }
   data.observedAt=Date.now();setClock(Date.now());setSnapshot(data);
  };
  void read();
  return()=>{controller.abort();seq.current++};
 },[clinic.clinicId,clinic.role,clinic.membershipId,request,tick,foreground]);
 const pending=(["operations","schedule","queue"] as const).some(
  k=>snapshot[k].state==="loading");
 const error=(["operations","schedule","queue"] as const).some(
  k=>snapshot[k].state==="unavailable");
 const denied=(["operations","schedule","queue"] as const).some(
  k=>snapshot[k].state==="forbidden");
 const stale=snapshotIsStale(snapshot,clock);
 const expired=stale&&!pending;
 const actionable=dashboardShortcuts(clinic.role);
 // Never present private or expired rows as an actionable live queue.
 const ops=!foreground||expired?null:snapshot.operations.data;
 const appointments=!foreground||expired?null:snapshot.schedule.data;
 const queue=!foreground||expired?null:snapshot.queue.data;
 const guarded=(id:DashboardShortcuts)=>{
  if(id==="registration"){onNavigate("onboard");return}
  if(id==="team"){onNavigate("team");return}
  if(id==="account"){onNavigate("settings");return}
  if(id==="today"){setExpanded(current=>!current);return}
  const route=clinicPaths[id];
  if(route)onOpenWeb(route+"?clinic="+encodeURIComponent(clinic.clinicId));
 };
 const titleFor:Record<DashboardShortcuts,string>={
  registration:t.registration,team:t.team,today:t.todayShortcut,
  bookings:t.bookings,patients:t.patients,operations:t.operations,
  finance:t.finance,account:t.account
 };
 const hintFor:Record<DashboardShortcuts,string>={
  registration:t.registrationHint,team:t.teamHint,today:t.todayHint,
  bookings:t.bookingsHint,patients:t.patientsHint,
  operations:t.operationsHint,finance:t.financeHint,account:t.accountHint
 };
 const numberOrNull=(n:number|undefined)=>typeof n==="number"?n:null;
 const statRows=[
  {value:appointments?.todayTotal,label:t.today,icon:"calendar" as const},
  {value:appointments?.weekTotal,label:t.week,icon:"clock" as const},
  {value:appointments?.counts.arrived,label:t.waiting,icon:"users" as const},
  {value:appointments?.counts.in_treatment,label:t.treating,icon:"tooth" as const},
  {value:ops?.metrics.scheduledDentists,label:t.activeDentists,icon:"user" as const},
  {value:ops?.metrics.services,label:t.services,icon:"clinic" as const}
 ];
 const clinicState=clinic.clinicStatus==="approved"?t.verified:
  clinic.clinicStatus==="pending"?t.review:
  clinic.clinicStatus==="suspended"?t.suspended:t.draft;
 return <View style={styles.root}>
  <View style={styles.hero}>
   <View style={[styles.heroTop,{flexDirection:rtl?"row-reverse":"row"}]}>
    <View style={styles.eyebrowDot}/><Text style={styles.eyebrow}>{t.label}</Text>
    <View style={styles.heroPill}><Text style={styles.heroPillText}>{clinicState}</Text></View>
   </View>
   <Text style={[styles.heroTitle,{textAlign:rtl?"right":"left"}]}>{t.welcome}</Text>
   <Text style={[styles.heroClinic,{textAlign:rtl?"right":"left"}]} numberOfLines={2}>
    {clinic.clinicName}</Text>
   <View style={[styles.heroBottom,{flexDirection:rtl?"row-reverse":"row"}]}>
    <PatientIcon name="shield" color="#91d4dc" size={17}/>
    <Text style={styles.heroRole}>{t.role}: {clinic.role}</Text>
    <Text style={styles.heroTime}>{t.clinicDay}</Text>
   </View>
  </View>
  <View style={[styles.stateBar,{flexDirection:rtl?"row-reverse":"row"}]}
   accessibilityRole="summary">
   <View style={[styles.stateDot,
    error?styles.stateDotWarning:pending?styles.stateDotLoading:
    stale?styles.stateDotWarning:null]}/>
   <Text style={styles.stateText}>{!foreground?t.loading:
    pending?t.loading:denied&&!dashboardCanRead(clinic.role,"queue")?t.access:
    stale?t.stale:error?t.partial:
    snapshot.observedAt!==null?t.latest+" "+updatedTime(snapshot.observedAt):
    denied?t.access:t.offline}</Text>
   <Pressable accessibilityRole="button" onPress={()=>setTick(v=>v+1)}
    disabled={!foreground||pending} accessibilityState={{disabled:!foreground||pending}}
    style={({pressed})=>[styles.refresh,pressed?{opacity:.75}:null]}>
    <PatientIcon name="clock" size={16} color={colors.blue}/>
    <Text style={styles.refreshText}>{t.retry}</Text>
   </Pressable>
  </View>
  <Text style={styles.privacy}>{t.preview}</Text>

  <View style={styles.block}>
   <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{t.overview}</Text>
    <Text style={styles.sectionSub}>{t.clinicDay}</Text>
   </View>
   {pending&&snapshot.observedAt===null?<Skeleton rows={4}/>:
   <View style={styles.metrics}>
    {statRows.map((item,index)=>
     <InfoMetric key={item.label} index={index} value={numberOrNull(item.value)}
      label={item.label} icon={item.icon}/>)}
   </View>}
   {!pending&&snapshot.observedAt!==null&&error&&
    <Text style={styles.notice}>{t.unavailable}</Text>}
   {denied&&<Text style={styles.meta}>{t.access}</Text>}
  </View>

  <View style={styles.block}>
   <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{t.quick}</Text>
    <Text style={styles.sectionSub}>{t.processing}</Text>
   </View>
   <View style={styles.shortcuts}>
    {actionable.map(id=><Pressable key={id}
     accessibilityRole="button" accessibilityLabel={titleFor[id]+" — "+hintFor[id]}
     onPress={()=>guarded(id)}
     style={({pressed})=>[styles.shortcut,pressed&&styles.shortcutPressed]}>
     <View style={styles.shortcutIcon}>
      <PatientIcon name={shortcutIcons[id]} size={22} color={colors.blue}/></View>
     <Text style={styles.shortcutName} numberOfLines={2}>{titleFor[id]}</Text>
     <Text style={styles.shortcutHint} numberOfLines={2}>{hintFor[id]}</Text>
    </Pressable>)}
   </View>
   <Text style={styles.meta}>{t.web}</Text>
  </View>

  <View style={styles.block}>
   <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{t.todayList}</Text>
    <Text style={styles.sectionSub}>{t.todayDesc}</Text>
   </View>
   {dashboardCanRead(clinic.role,"queue")&&queue&&
    <View style={styles.queueCounts}>
     {(["confirmed","arrived","in_treatment","completed"] as const).map(id=>
      <View key={id} style={styles.queueCount}>
       <Text style={styles.queueCountValue}>{queue.counts[id]}</Text>
       <Text style={styles.queueCountLabel}>{id==="confirmed"?t.upcoming:
        id==="arrived"?t.waiting:id==="in_treatment"?t.treating:t.completed}</Text>
      </View>)}
    </View>}
   {snapshot.queue.state==="loading"&&foreground?<Skeleton rows={3}/>:
    snapshot.queue.state==="forbidden"?<Text style={styles.notice}>{t.hidden}</Text>:
    snapshot.queue.state!=="ready"||!queue?
     <Text style={styles.notice}>{stale?t.stale:t.unavailable}</Text>:
    queue.rows.length===0?<View style={styles.emptyRow}>
     <PatientIcon name="calendar" size={27} color="#82a6bf"/>
     <Text style={styles.emptyTitle}>{t.empty}</Text></View>:
    <View style={styles.queue}>
     {queue.rows.slice(0,expanded?6:3).map((row,index)=>
      <View key={row.id} style={[styles.appointmentRow,
       index>0?styles.rowSeparator:null,
       {flexDirection:rtl?"row-reverse":"row"}]}>
       <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{timeKabul(row.startAt)}</Text>
        <Text style={styles.timeZone}>KBL</Text>
       </View>
       <View style={styles.patientBlock}>
        <Text style={[styles.patientName,{textAlign:rtl?"right":"left"}]}
         numberOfLines={1}>{row.preferredName||t.nameUnknown}</Text>
        <Text style={[styles.provider,{textAlign:rtl?"right":"left"}]}
         numberOfLines={1}>{t.dentist}: {row.providerName||"—"}</Text>
       </View>
       <View style={[styles.statusChip,{backgroundColor:queueColor[row.status].bg}]}>
        <Text style={[styles.statusText,{color:queueColor[row.status].fg}]}>
         {row.status==="confirmed"?t.upcoming:
          row.status==="arrived"?t.waiting:
          row.status==="in_treatment"?t.treating:
          row.status==="completed"?t.completed:t.noShow}</Text>
       </View>
      </View>)}
     {queue.rows.length>3&&<Pressable accessibilityRole="button"
      style={styles.showMore} onPress={()=>setExpanded(x=>!x)}>
      <Text style={styles.showMoreText}>{expanded?t.less:t.more}</Text>
      <PatientIcon name="chevron" size={16} color={colors.blue}/>
     </Pressable>}
     <Text style={styles.meta}>{t.processing} · {t.noClinical}</Text>
    </View>}
  </View>

  {dashboardCanRead(clinic.role,"operations")&&<View style={styles.block}>
   <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{t.setup}</Text>
    <Text style={styles.sectionSub}>{t.setupDesc}</Text>
   </View>
   {snapshot.operations.state==="loading"?<Skeleton/>:
    snapshot.operations.state!=="ready"||!ops?
     <Text style={styles.notice}>{t.setupUnavailable}</Text>:
     <View style={styles.checklist}>
      {ops.checklist.map(x=><View key={x.key} style={[styles.checkRow,
       {flexDirection:rtl?"row-reverse":"row"}]}>
       <View style={[styles.checkIcon,x.done?styles.checkIconPass:styles.checkIconWarn]}>
        <PatientIcon name={x.done?"check":"clock"} size={17}
         color={x.done?colors.green:colors.amber}/></View>
       <Text style={styles.checkText}>{x.key==="service"?t.service:
        x.key==="chair"?t.chair:x.key==="clinicHours"?t.clinicHours:t.dentistHours}</Text>
       <Text style={[styles.checkState,{color:x.done?colors.green:colors.amber}]}>
        {x.done?t.setupReady:t.setupAction}</Text>
      </View>)}
     </View>}
   {plannedDentists!==null&&clinic.role==="owner"&&
    <Text style={styles.meta}>{t.activeDentists}: {ops?.metrics.scheduledDentists??"—"} ·
     {t.team}: {plannedDentists} ({t.processing})</Text>}
  </View>}
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:18},
 hero:{padding:20,paddingTop:18,paddingBottom:21,borderRadius:19,backgroundColor:"#142e48",
  gap:10,overflow:"hidden"},
 heroTop:{alignItems:"center",gap:8},
 eyebrowDot:{width:7,height:7,borderRadius:4,backgroundColor:"#62d6c5"},
 eyebrow:{fontSize:10,fontWeight:"900",color:"#8ed4df",letterSpacing:1,flex:1},
 heroPill:{backgroundColor:"#234763",borderWidth:1,borderColor:"#3e6c86",
  paddingHorizontal:10,paddingVertical:7,borderRadius:20},
 heroPillText:{color:"#d6e9f4",fontSize:10,fontWeight:"800"},
 heroTitle:{fontSize:24,fontWeight:"900",color:colors.white,lineHeight:32},
 heroClinic:{fontSize:13,color:"#b6d1e7",lineHeight:20,fontWeight:"700"},
 heroBottom:{borderTopColor:"#37576f",borderTopWidth:1,paddingTop:13,marginTop:5,
  alignItems:"center",gap:7},
 heroRole:{color:"#d3e8f4",fontWeight:"700",fontSize:10,flex:1},
 heroTime:{color:"#99bcd5",fontWeight:"700",fontSize:10},
 stateBar:{borderColor:colors.line,borderWidth:1,backgroundColor:colors.white,
  borderRadius:13,paddingHorizontal:13,paddingVertical:10,gap:8,alignItems:"center",minHeight:52},
 stateDot:{width:8,height:8,borderRadius:5,backgroundColor:"#25a48d"},
 stateDotWarning:{backgroundColor:"#e49a38"},
 stateDotLoading:{backgroundColor:"#65a8dd"},
 stateText:{fontSize:11,color:colors.muted,flex:1,fontWeight:"800",lineHeight:17},
 refresh:{flexDirection:"row",alignItems:"center",paddingHorizontal:8,paddingVertical:8,
  borderRadius:9,backgroundColor:"#e9f3fc",gap:6,minHeight:38},
 refreshText:{fontSize:10,color:colors.blue,fontWeight:"900"},
 privacy:{fontSize:10,color:"#71859a",lineHeight:18,marginTop:-7},
 block:{backgroundColor:"#fff",borderRadius:16,borderWidth:1,borderColor:colors.line,
  padding:16,gap:15,shadowColor:"#142e48",shadowOpacity:.045,shadowRadius:15,
  shadowOffset:{width:0,height:5},elevation:1},
 sectionHeading:{gap:5},
 sectionTitle:{fontSize:17,fontWeight:"900",color:colors.ink,lineHeight:24},
 sectionSub:{fontSize:11,lineHeight:18,color:colors.muted},
 metrics:{flexDirection:"row",flexWrap:"wrap",gap:9},
 metric:{width:"47%",flexGrow:1,borderRadius:13,backgroundColor:"#f5f8fc",
  borderColor:"#e3ebf3",borderWidth:1,minHeight:122,padding:13,gap:9},
 metricIcon:{width:32,height:32,borderRadius:9,backgroundColor:"#e3f0fc",
  alignItems:"center",justifyContent:"center"},
 metricIconMint:{backgroundColor:"#e5f6f1"},
 metricValue:{color:colors.ink,fontSize:23,fontWeight:"900"},
 metricLabel:{fontSize:11,color:"#657f94",fontWeight:"700",lineHeight:18},
 notice:{backgroundColor:"#fff8e9",borderColor:"#f3ddba",borderWidth:1,
  padding:12,borderRadius:11,color:"#946327",fontSize:12,lineHeight:19},
 meta:{fontSize:10,lineHeight:18,color:"#7a8c9d"},
 shortcuts:{flexDirection:"row",flexWrap:"wrap",gap:9},
 shortcut:{width:"47%",flexGrow:1,minHeight:135,padding:13,borderRadius:12,
  backgroundColor:"#f7fafd",borderColor:"#e4edf4",borderWidth:1,gap:7},
 shortcutPressed:{backgroundColor:"#e9f3fc",borderColor:"#a9cfe8"},
 shortcutIcon:{width:36,height:36,borderRadius:10,
  backgroundColor:"#e4eff9",alignItems:"center",justifyContent:"center"},
 shortcutName:{color:"#234864",fontWeight:"900",fontSize:12,lineHeight:18},
 shortcutHint:{color:"#71879a",fontWeight:"600",fontSize:10,lineHeight:16},
 queueCounts:{flexDirection:"row",gap:6,justifyContent:"space-between"},
 queueCount:{minWidth:0,flex:1,borderRadius:10,backgroundColor:"#f3f7fb",padding:9,gap:5},
 queueCountValue:{fontSize:16,fontWeight:"900",color:"#1e5279"},
 queueCountLabel:{fontSize:9,lineHeight:14,color:"#6a8297",fontWeight:"700"},
 queue:{gap:3},
 appointmentRow:{alignItems:"center",gap:12,paddingVertical:12,minHeight:68},
 rowSeparator:{borderTopColor:"#eaf0f5",borderTopWidth:1},
 timeBlock:{width:50,gap:3},
 timeText:{color:"#154b73",fontSize:14,fontWeight:"900"},
 timeZone:{fontSize:9,color:"#8498a8",fontWeight:"700"},
 patientBlock:{flex:1,marginHorizontal:2,gap:5,minWidth:0},
 patientName:{fontSize:12,color:"#294b63",fontWeight:"900"},
 provider:{fontSize:10,lineHeight:16,color:"#73889a"},
 statusChip:{paddingHorizontal:9,paddingVertical:8,borderRadius:8,maxWidth:98},
 statusText:{fontSize:10,lineHeight:14,fontWeight:"900",textAlign:"center"},
 showMore:{minHeight:45,justifyContent:"center",alignItems:"center",gap:7,
  flexDirection:"row",backgroundColor:"#eef5fb",borderRadius:10,marginTop:5},
 showMoreText:{color:colors.blue,fontSize:11,fontWeight:"900"},
 emptyRow:{minHeight:130,backgroundColor:"#f7f9fc",borderRadius:12,
  alignItems:"center",justifyContent:"center",gap:10},
 emptyTitle:{fontSize:12,color:"#5a7b95",fontWeight:"800"},
 checkRow:{gap:10,alignItems:"center",paddingVertical:10,borderBottomColor:"#eaf0f5",borderBottomWidth:1},
 checkIcon:{width:31,height:31,borderRadius:9,alignItems:"center",justifyContent:"center"},
 checkIconPass:{backgroundColor:"#e6f6ee"},checkIconWarn:{backgroundColor:"#fff3df"},
 checkText:{flex:1,fontSize:11,color:"#3e5c73",lineHeight:17,fontWeight:"700"},
 checkState:{fontSize:10,fontWeight:"900",maxWidth:100,textAlign:"right"},
 skeletonWrap:{gap:12,paddingVertical:10},
 skeleton:{height:29,backgroundColor:"#e9f0f6",borderRadius:9}
});
