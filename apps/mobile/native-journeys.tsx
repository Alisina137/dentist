import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Linking,Pressable,StyleSheet,Text,View} from "react-native";
import {ApiError,useNativeAuth} from "./native-auth";
import {patientError} from "./patient-errors";
import type {Booking} from "./native-patient";

type Lang="en"|"fa-AF"|"ps-AF";
type Calendar="gregorian"|"solar_hijri";
const blue="#075BF2",ink="#163255",muted="#657993";
const copy={
 en:{upcoming:"Your next appointment",appointment:"Appointment details",all:"All appointments",
  view:"View details",noUpcoming:"You have no upcoming appointments.",
  find:"Find dental care",loading:"Loading your appointment…",retry:"Try again",
  current:"Current booking status",statusHelp:"This is the latest confirmed status from the clinic, not a full event history.",
  requested:"Waiting for clinic approval",confirmed:"Confirmed",completed:"Completed",
  cancelled:"Cancelled",rejected:"Declined",no_show:"Did not attend",
  checked_in:"Checked in",in_progress:"In progress",rescheduled:"Rescheduled",
  statusOther:"Appointment status",requestedHint:"The clinic has not approved this request yet.",
  confirmedHint:"The clinic has confirmed your appointment.",finalHint:"This booking is no longer active.",
  patient:"Patient",service:"Treatment",date:"Appointment time",end:"Expected end",
  fee:"Published estimate",reference:"Booking reference",clinic:"Clinic",
  contact:"Call clinic",openClinic:"Clinic profile",reschedule:"Change appointment time",
  cancel:"Cancel appointment",cancelNote:"The clinic's cancellation deadline applies.",
  changeEnds:"Changes allowed until",notAllowed:"Changes are no longer available for this booking.",
  back:"Back",cancelConfirm:"Do you want to cancel this appointment?",
  refresh:"Refresh status",waiting:"You can view details while the clinic reviews your request.",
  booked:"Booking management",private:"Only your signed-in account can view these booking details.",
  unknown:"Not published",statusUpdated:"The latest booking status has been refreshed."},
 "fa-AF":{upcoming:"نوبت آینده شما",appointment:"جزئیات نوبت",all:"تمام نوبت‌ها",
  view:"مشاهده جزئیات",noUpcoming:"فعلاً نوبت آینده ندارید.",
  find:"جستجوی خدمات دندان",loading:"نوبت شما دریافت می‌شود…",retry:"دوباره کوشش",
  current:"حالت فعلی نوبت",statusHelp:"این آخرین حالت معتبر کلینیک است، نه تاریخچه کامل رویدادها.",
  requested:"در انتظار تأیید کلینیک",confirmed:"تأییدشده",completed:"تکمیل‌شده",
  cancelled:"لغوشده",rejected:"ردشده",no_show:"حاضر نشده",
  checked_in:"حاضرشده",in_progress:"در جریان",rescheduled:"وقت تغییر یافته",
  statusOther:"حالت نوبت",requestedHint:"کلینیک هنوز این درخواست را تأیید نکرده است.",
  confirmedHint:"کلینیک نوبت شما را تأیید کرده است.",finalHint:"این نوبت دیگر فعال نیست.",
  patient:"مریض",service:"تداوی",date:"وقت ملاقات",end:"پایان تخمینی",
  fee:"قیمت تخمینی نشرشده",reference:"شماره مرجع نوبت",clinic:"کلینیک",
  contact:"تماس با کلینیک",openClinic:"پروفایل کلینیک",reschedule:"تغییر وقت",
  cancel:"لغو نوبت",cancelNote:"مهلت لغو مطابق مقررات کلینیک است.",
  changeEnds:"مهلت تغییر تا",notAllowed:"تغییر این نوبت دیگر امکان ندارد.",
  back:"بازگشت",cancelConfirm:"آیا می‌خواهید این نوبت را لغو کنید؟",
  refresh:"تازه‌سازی حالت",waiting:"تا بررسی کلینیک می‌توانید جزئیات نوبت را ببینید.",
  booked:"مدیریت نوبت",private:"این معلومات فقط برای حساب واردشده شما قابل دیدن است.",
  unknown:"نشر نشده",statusUpdated:"حالت تازه نوبت دریافت شد."},
 "ps-AF":{upcoming:"ستاسو راتلونکی ملاقات",appointment:"د ملاقات جزئیات",all:"ټول ملاقاتونه",
  view:"جزئیات وګورئ",noUpcoming:"اوس مهال راتلونکی ملاقات نه لرئ.",
  find:"د غاښونو خدمتونه ومومئ",loading:"ستاسو ملاقات لوستل کېږي…",retry:"بیا هڅه",
  current:"د ملاقات اوسنی حالت",statusHelp:"دا د کلینیک وروستی تایید شوی حالت دی، بشپړ تاریخ نه دی.",
  requested:"د کلینیک تایید ته په تمه",confirmed:"تایید شوی",completed:"بشپړ شوی",
  cancelled:"لغوه شوی",rejected:"رد شوی",no_show:"نه دی حاضر شوی",
  checked_in:"حاضر شوی",in_progress:"روان",rescheduled:"وخت بدل شوی",
  statusOther:"د ملاقات حالت",requestedHint:"کلینیک لا دا غوښتنه نه ده تایید کړې.",
  confirmedHint:"کلینیک ستاسو ملاقات تایید کړی دی.",finalHint:"دا ملاقات نور فعال نه دی.",
  patient:"ناروغ",service:"درملنه",date:"د ملاقات وخت",end:"اټکلی پای",
  fee:"خپره شوې اټکلي بیه",reference:"د ملاقات شمېره",clinic:"کلینیک",
  contact:"کلینیک ته زنګ",openClinic:"د کلینیک پاڼه",reschedule:"وخت بدلول",
  cancel:"ملاقات لغوه کول",cancelNote:"د لغوه کولو وروستۍ نېټه د کلینیک له اصولو سره سم ده.",
  changeEnds:"د بدلولو وروستی وخت",notAllowed:"دا ملاقات نور نشي بدلیدلی.",
  back:"شاته",cancelConfirm:"ایا دا ملاقات لغوه کوئ؟",
  refresh:"حالت تازه کړئ",waiting:"تر څو کلینیک غوښتنه ګوري، تاسو جزئیات لیدلی شئ.",
  booked:"د ملاقات سمبالول",private:"دا معلومات یوازې ستاسو ننوتلی حساب لیدلی شي.",
  unknown:"نه دی خپور شوی",statusUpdated:"وروستی حالت ترلاسه شو."}
} as const;
function time(iso:string,locale:Lang,calendar:Calendar){
 const value=Date.parse(iso);
 if(!Number.isFinite(value))return copy[locale].unknown;
 return new Intl.DateTimeFormat(locale==="en"?"en-GB":locale,{
  timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false
 }).format(new Date(value));
}
const statusOf=(status:string,locale:Lang)=>{
 const key=status as keyof typeof copy.en;
 return key in copy.en?copy[locale][key]:copy[locale].statusOther;
};
const future=(b:Booking)=>Date.parse(b.startAt)>Date.now()&&["requested","confirmed"].includes(b.status);
function Button({label,onPress,secondary=false,disabled=false,danger=false}:{
 label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;danger?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={[css.action,secondary&&css.secondary,danger&&css.danger,disabled&&css.disabled]}>
   <Text style={[css.actionText,(secondary||danger)&&css.secondaryText,danger&&css.dangerText]}>{label}</Text>
 </Pressable>;
}
function Pair({label,value}:{label:string;value:string}){
 return <View style={css.pair}>
  <Text style={css.caption}>{label}</Text>
  <Text selectable style={css.value}>{value}</Text>
 </View>;
}

/** Home-only, account-bound read. An empty list is never filled with demo visits. */
export function NativeNextAppointment({locale,calendar,onOpen,onAll,onExplore}:{
 locale:Lang;calendar:Calendar;onOpen:(bookingId:string)=>void;onAll:()=>void;onExplore:()=>void}){
 const auth=useNativeAuth(),user=auth.account?.registered?auth.account.user.id:null;
 const [reload,setReload]=useState(0);
 const [state,setState]=useState<{user:string;booking:Booking|null;error:string;loading:boolean}|null>(null);
 useEffect(()=>{
  if(!user){setState(null);return;}
  let active=true;setState({user,booking:null,error:"",loading:true});
  auth.request<{appointments:Booking[]}>("/v1/booking/my").then(data=>{
   if(!active)return;
   const next=(data.appointments||[]).filter(future).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0]||null;
   setState({user,booking:next,error:"",loading:false});
  }).catch(err=>{if(active)setState({user,booking:null,error:patientError(err,locale),loading:false})});
  return()=>{active=false};
 },[user,auth.request,reload]);
 if(!user)return null;
 const view=state?.user===user?state:null,t=copy[locale];
 const booking=view?.booking||null;
 return <View style={css.card}>
  <View style={[css.row,{flexDirection:locale==="en"?"row":"row-reverse"}]}>
   <Text style={css.title}>{t.upcoming}</Text>
   <Pressable accessibilityRole="button" onPress={onAll}>
    <Text style={css.link}>{t.all} ›</Text>
   </Pressable>
  </View>
  {!view||view.loading?<View accessibilityRole="progressbar" accessibilityLabel={t.loading}>
    <ActivityIndicator color={blue}/></View>:
   view.error?<><Text style={css.caption}>{view.error}</Text>
    <Button secondary label={t.retry} onPress={()=>setReload(x=>x+1)}/></>:
   !booking?<><Text style={css.caption}>{t.noUpcoming}</Text>
    <Button secondary label={t.find} onPress={onExplore}/></>:
   <>
    <View style={[css.row,{flexDirection:locale==="en"?"row":"row-reverse"}]}>
     <Text style={css.value}>{booking.clinicName}</Text>
     <Text style={[css.pill,booking.status==="requested"&&css.pending]}>{statusOf(booking.status,locale)}</Text>
    </View>
    <Text style={css.caption}>{booking.serviceName} · {booking.patientName}</Text>
    <Text style={css.dateText}>{time(booking.startAt,locale,calendar)}</Text>
    <Button label={t.view} onPress={()=>onOpen(booking.id)}/>
   </>}
 </View>;
}

/** Full screen booking detail: never reuses a list row as the source of truth. */
export function NativeAppointmentDetails({bookingId,locale,calendar,onBack,onReschedule,onClinic}:{
 bookingId:string;locale:Lang;calendar:Calendar;onBack:()=>void;
 onReschedule:(booking:Booking)=>void;onClinic:(clinicId:string)=>void}){
 const auth=useNativeAuth(),user=auth.account?.registered?auth.account.user.id:null;
 const t=copy[locale];
 const [reload,setReload]=useState(0);
 const [snapshot,setSnapshot]=useState<{user:string;bookingId:string;booking:Booking|null;
  error:string;loading:boolean}|null>(null);
 const [busy,setBusy]=useState(false),[actionError,setActionError]=useState("");
 useEffect(()=>{
  if(!user){setSnapshot(null);return;}
  let current=true;
  setSnapshot({user,bookingId,booking:null,error:"",loading:true});
  auth.request<{booking:Booking}>("/v1/booking/my/"+encodeURIComponent(bookingId)).then(data=>{
   if(current)setSnapshot({user,bookingId,booking:data.booking,error:"",loading:false});
  }).catch(error=>{
   if(current)setSnapshot({user,bookingId,booking:null,error:patientError(error,locale),loading:false});
  });
  return()=>{current=false};
 },[user,bookingId,auth.request,reload]);
 const view=snapshot?.user===user&&snapshot.bookingId===bookingId?snapshot:null;
 const booking=view?.booking||null;
 function cancel(){
  if(!booking||busy)return;
  Alert.alert(t.cancel,t.cancelConfirm,[
   {text:t.back,style:"cancel"},
   {text:t.cancel,style:"destructive",onPress:()=>void(async()=>{
    if(!booking)return;
    setBusy(true);setActionError("");
    try{
     await auth.request("/v1/booking/my/"+encodeURIComponent(booking.id)+"/cancel","POST",{
      revision:booking.revision,reason:"Patient requested appointment cancellation"});
     setReload(x=>x+1);
    }catch(error){
     setActionError(patientError(error,locale));
     if(error instanceof ApiError&&error.status===409)setReload(x=>x+1);
    }finally{setBusy(false)}
   })()}
  ]);
 }
 if(!user)return <View style={css.card}><Text style={css.caption}>{t.private}</Text><Button
  label={t.back} onPress={onBack}/></View>;
 if(!view||view.loading)return <View style={css.card} accessibilityRole="progressbar"
  accessibilityLabel={t.loading}><ActivityIndicator color={blue}/><Text style={css.caption}>{t.loading}</Text></View>;
 if(!booking)return <View style={css.card}><Text style={css.caption}>{view.error||t.unknown}</Text>
  <Button secondary label={t.retry} onPress={()=>setReload(x=>x+1)}/>
  <Button secondary label={t.back} onPress={onBack}/></View>;
 const mayChange=future(booking)&&(booking.status==="requested"||Date.parse(booking.cancelUntil)>Date.now());
 const label=booking.status==="requested"?t.requestedHint:booking.status==="confirmed"?t.confirmedHint:t.finalHint;
 return <View style={{gap:14,direction:locale==="en"?"ltr":"rtl"}}>
  <View style={css.card}>
   <Text accessibilityRole="header" style={css.title}>{t.appointment}</Text>
   <Text style={css.caption}>{t.private}</Text>
   <Text style={css.sectionTitle}>{booking.clinicName}</Text>
   <Text style={[css.pill,{alignSelf:"flex-start"},booking.status==="requested"&&css.pending]}>
    {statusOf(booking.status,locale)}</Text>
   <Text style={css.dateText}>{time(booking.startAt,locale,calendar)}</Text>
   <Text style={css.caption}>{booking.serviceName} · {booking.patientName}</Text>
  </View>
  <View style={css.card}>
   <Text accessibilityRole="header" style={css.title}>{t.current}</Text>
   <Text style={css.value}>{statusOf(booking.status,locale)}</Text>
   <Text style={css.caption}>{label}</Text>
   <Text style={css.caption}>{t.statusHelp}</Text>
  </View>
  <View style={css.card}>
   <Text accessibilityRole="header" style={css.title}>{t.booked}</Text>
   <Pair label={t.patient} value={booking.patientName}/>
   <Pair label={t.clinic} value={booking.clinicName}/>
   <Pair label={t.service} value={booking.serviceName}/>
   <Pair label={t.date} value={time(booking.startAt,locale,calendar)}/>
   <Pair label={t.end} value={time(booking.endAt,locale,calendar)}/>
   <Pair label={t.fee} value={booking.priceAfn.toLocaleString("en")+" AFN"}/>
   <Pair label={t.reference} value={booking.id}/>
  </View>
  <View style={css.card}>
   <Text accessibilityRole="header" style={css.title}>{t.booked}</Text>
   <Button secondary label={t.openClinic} onPress={()=>onClinic(booking.clinicId)}/>
   {!!booking.clinicPhone&&<Button secondary label={t.contact} onPress={()=>
    void Linking.openURL("tel:"+booking.clinicPhone)}/>}
   <Button secondary label={t.refresh} onPress={()=>setReload(x=>x+1)} disabled={busy}/>
   {mayChange?<><Text style={css.caption}>{t.cancelNote}</Text>
    {!!booking.cancelUntil&&booking.status==="confirmed"&&<Text style={css.caption}>
     {t.changeEnds}: {time(booking.cancelUntil,locale,calendar)}</Text>}
    <Button label={t.reschedule} onPress={()=>onReschedule(booking)} disabled={busy}/>
    <Button danger label={t.cancel} onPress={cancel} disabled={busy}/></>:
    <Text style={css.caption}>{t.notAllowed}</Text>}
   {!!actionError&&<Text accessibilityRole="alert" style={css.error}>{actionError}</Text>}
   <Button secondary label={t.all} onPress={onBack}/>
  </View>
 </View>;
}

const css=StyleSheet.create({
 card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE8F5",
  borderRadius:18,padding:17,gap:11},
 row:{justifyContent:"space-between",alignItems:"center",gap:10},
 title:{fontSize:18,color:ink,fontWeight:"800",flexShrink:1},
 sectionTitle:{fontSize:21,color:ink,fontWeight:"900"},
 value:{fontSize:14,color:ink,fontWeight:"700",flexShrink:1},
 caption:{fontSize:13,color:muted,lineHeight:20},
 dateText:{fontSize:15,fontWeight:"800",color:blue},
 link:{color:blue,fontSize:12,fontWeight:"800"},
 pill:{fontSize:12,color:"#13694E",backgroundColor:"#E7F8F0",
  borderRadius:12,overflow:"hidden",paddingHorizontal:10,paddingVertical:6,fontWeight:"700"},
 pending:{color:"#915A11",backgroundColor:"#FFF5DC"},
 pair:{paddingVertical:8,borderBottomColor:"#EFF3F7",borderBottomWidth:1,gap:4},
 action:{backgroundColor:blue,paddingHorizontal:14,paddingVertical:12,minHeight:44,
  borderRadius:12,alignItems:"center",justifyContent:"center"},
 actionText:{color:"#fff",fontSize:14,fontWeight:"800",textAlign:"center"},
 secondary:{backgroundColor:"#EEF4FF",borderWidth:1,borderColor:"#CCE1FC"},
 secondaryText:{color:blue},
 danger:{backgroundColor:"#FFF0F1",borderWidth:1,borderColor:"#F3CDD2"},
 dangerText:{color:"#AE3145"},
 disabled:{opacity:.45},
 error:{color:"#AE3145",backgroundColor:"#FFF0F1",padding:12,borderRadius:9}
});
