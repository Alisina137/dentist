import React,{useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Linking,Pressable,ScrollView,Text,TextInput,View,StyleSheet} from "react-native";
import {NativeAccount,useNativeAuth,ApiError,uniqueActionKey} from "./native-auth";
import {patientError,patientText,isSlotConflict} from "./patient-errors";

declare const process:{readonly env:{readonly EXPO_PUBLIC_API_URL?:string;readonly EXPO_PUBLIC_PATIENT_WEB_URL?:string}};
const API=(process.env.EXPO_PUBLIC_API_URL||"").replace(/\/+$/,"");
const WEB=(process.env.EXPO_PUBLIC_PATIENT_WEB_URL||"").replace(/\/+$/,"");
type Language="en"|"fa-AF"|"ps-AF";
type Calendar="gregorian"|"solar_hijri";
export type Favorite={clinicId:string;clinicName:string;dentistId:string|null;dentistName:string|null};
export type Booking={
 id:string;clinicId:string;clinicName:string;clinicCity:string;clinicPhone:string;
 patientName:string;subjectType:"self"|"minor"|"adult_delegate";appointmentId:string;
 serviceId:string;serviceName:string;dentistId:string;status:string;priceAfn:number;
 startAt:string;endAt:string;revision:number;cancelUntil:string;approvalMode:string;
};
type Clinic={clinic:{id:string;name:string;city:string};
 profile:{services:{id:string;name:string;priceAfn:number;durationMinutes:number}[];
 dentists:{id:string;displayName:string}[];
 bookingRules:{horizonDays:number;approvalMode:string}}};
type Time={startAt:string;endAt:string;serviceId:string;dentistId:string;dentistName:string;
 serviceName:string;priceAfn:number};
type Family={members:{id:string;displayName:string;memberType:"minor"|"adult";
 eligibleForFutureBooking:boolean}[];policy:{guardianPolicyVersion:string}};
type Prefs={revision:number;notifications:{emailBookings:boolean;emailUpdates:boolean;
 emailDeliveryConfigured:boolean;pushEnabled:false;smsEnabled:false}};
type Note={event_name:string;status:string;attempt_count:number;created_at:string;sent_at:string|null};
type NotificationFeed={events:Note[];emailConfigured:boolean;smsConfigured:boolean;pushConfigured:boolean};
const words={
 en:{login:"Sign in",signup:"Create account",name:"Full name",email:"Email",password:"Password",
 loginHelp:"Use your verified patient account to manage appointments securely.",
 signupHelp:"We will send an email verification link. Return to sign in after verification.",
 forgot:"Forgot password?",checking:"Checking account…",invalid:"Please check the form.",
 signout:"Sign out",onboard:"Complete patient profile",city:"City",phone:"Phone (optional)",
 accept:"I accept the patient terms and acknowledge the privacy policy.",
 adult:"I confirm I am an adult and understand the guardian policy.",save:"Save",
 profile:"My patient profile",family:"Family",addChild:"Add child",dob:"Date of birth (YYYY-MM-DD)",
 appointments:"My appointments",upcoming:"Upcoming",past:"Past",cancelled:"Cancelled",loadingData:"Loading your information…",
 empty:"No appointments in this section.",find:"Find a clinic",retry:"Retry",
 cancel:"Cancel appointment",reschedule:"Reschedule",requested:"Waiting for clinic approval",
 confirmed:"Confirmed",rejected:"Declined",cancelHint:"Cancellation may be limited close to appointment time.",
 book:"Book appointment",treatment:"Treatment",dentist:"Dentist",time:"Time",
 patient:"Patient",review:"Review",done:"Receipt",self:"Myself",
 next:"Continue",back:"Back",submit:"Confirm booking",confirmConsent:"I authorize this request and accept clinic booking rules.",
 noSlots:"No live available times; choose another day.",select:"Select one option",
 fee:"Estimated fee",pending:"Clinic must approve this request.",
 success:"Your real booking has been recorded.",offline:"Connection unavailable. Retry; no duplicate booking will be created.",
 favorites:"Saved clinics and dentists",noFavorites:"No saved public profiles yet.",
 remove:"Remove",view:"View",preferences:"Email notifications",bookingEmail:"Booking emails",
 updatesEmail:"Appointment updates",emailNote:"Email only when configured and opted in. No SMS/push.",
 notificationHistory:"My booking updates",notificationIntro:"Recent email delivery status. Open Appointments for secure details.",
 notificationEmpty:"No booking updates have been queued.",notificationRefresh:"Refresh updates",
 notificationQueued:"Queued",notificationSent:"Sent",notificationFailed:"Failed",notificationSkipped:"Email disabled",
 notificationRequest:"Booking requested",notificationAccepted:"Booking confirmed",notificationRejected:"Request rejected",
 notificationRescheduled:"Appointment rescheduled",notificationCancelled:"Appointment cancelled",
 notificationChannelOff:"Email is not configured. SMS and push are unavailable.",notificationChannelOn:"SMS and push are unavailable.",
 error:"Request failed",linkedRecords:"My clinic records",visitWeb:"Open secure web records",
 settings:"Account settings",reason:"Reason",saving:"Saving…",
 date:"Date",minor:"Child",adultDelegate:"Authorized adult",adding:"Add",
 signInFirst:"Sign in and finish onboarding before booking.",
 close:"Close",ack:"I am the legal guardian of this minor.",
 reference:"Appointment reference",refresh:"Refresh",created:"Registered",
 cancelledStatus:"Cancelled",profileUpdate:"Update profile",
 verification:"Verify your email from the link before signing in.",
 resendVerification:"Resend verification email",backToLogin:"Back to sign in",resetPassword:"Send password reset link",
 checkAppointments:"Check My appointments"},
 "fa-AF":{login:"ورود",signup:"ایجاد حساب",name:"نام مکمل",email:"ایمیل",password:"رمز عبور",
 loginHelp:"برای مدیریت مصون نوبت‌ها وارد حساب تأییدشده شوید.",
 signupHelp:"لینک تأیید به ایمیل ارسال می‌شود. پس از تأیید وارد شوید.",
 forgot:"رمز را فراموش کرده‌اید؟",checking:"در حال بررسی حساب…",invalid:"معلومات فورم را بررسی کنید.",
 signout:"خروج",onboard:"تکمیل پروفایل مریض",city:"شهر",phone:"تلفن (اختیاری)",
 accept:"شرایط مریضان و حریم خصوصی را قبول دارم.",
 adult:"تأیید می‌کنم که بزرگسال هستم و قوانین سرپرستی را می‌فهمم.",save:"ذخیره",
 profile:"پروفایل مریض",family:"خانواده",addChild:"افزودن طفل",dob:"تاریخ تولد (YYYY-MM-DD)",
 appointments:"نوبت‌های من",upcoming:"آینده",past:"گذشته",cancelled:"لغوشده",loadingData:"معلومات شما دریافت می‌شود…",
 empty:"در این بخش نوبتی موجود نیست.",find:"جستجوی کلینیک",retry:"دوباره کوشش",
 cancel:"لغو نوبت",reschedule:"تغییر وقت",requested:"در انتظار تأیید کلینیک",
 confirmed:"تأیید شده",rejected:"رد شده",cancelHint:"لغو نزدیک به وقت نوبت ممکن است محدود باشد.",
 book:"رزرو نوبت",treatment:"تداوی",dentist:"داکتر",time:"ساعت",
 patient:"مریض",review:"مرور",done:"رسید",self:"خودم",
 next:"ادامه",back:"بازگشت",submit:"تأیید رزرو",confirmConsent:"اجازه رزرو می‌دهم و مقررات کلینیک را می‌پذیرم.",
 noSlots:"وقت موجود نیست؛ روز دیگر را انتخاب کنید.",select:"یک گزینه را انتخاب کنید",
 fee:"قیمت تخمینی",pending:"کلینیک باید این درخواست را تأیید کند.",
 success:"نوبت واقعی شما ثبت شد.",offline:"ارتباط برقرار نشد. دوباره کوشش کنید؛ رزرو تکراری ایجاد نمی‌شود.",
 favorites:"کلینیک‌ها و داکتران ذخیره‌شده",noFavorites:"هنوز پروفایل ذخیره نشده است.",
 remove:"حذف",view:"مشاهده",preferences:"اطلاع‌رسانی ایمیل",bookingEmail:"ایمیل رزرو",
 updatesEmail:"تغییرات نوبت",emailNote:"ایمیل فقط با اجازه و تنظیمات ارسال می‌شود. پیامک و پوش فعال نیست.",
 notificationHistory:"تازه‌های رزرو من",notificationIntro:"وضعیت ارسال ایمیل اخیر؛ جزئیات محفوظ را در نوبت‌ها ببینید.",
 notificationEmpty:"هنوز خبر رزرو ثبت نشده است.",notificationRefresh:"تازه‌سازی خبرها",
 notificationQueued:"در صف",notificationSent:"ارسال‌شده",notificationFailed:"ناکام",notificationSkipped:"ایمیل غیرفعال",
 notificationRequest:"درخواست نوبت",notificationAccepted:"نوبت تأیید شد",notificationRejected:"درخواست رد شد",
 notificationRescheduled:"وقت ملاقات تغییر کرد",notificationCancelled:"نوبت لغو شد",
 notificationChannelOff:"ایمیل تنظیم نشده است؛ پیامک و پوش فعال نیست.",notificationChannelOn:"پیامک و پوش فعال نیست.",
 error:"درخواست انجام نشد",linkedRecords:"سوابق کلینیک",visitWeb:"بازکردن سوابق در وبسایت مصون",
 settings:"تنظیمات حساب",reason:"دلیل",saving:"در حال ذخیره…",
 date:"تاریخ",minor:"طفل",adultDelegate:"بزرگسال مجاز",adding:"افزودن",
 signInFirst:"برای رزرو وارد شوید و پروفایل مریض را تکمیل کنید.",
 close:"بستن",ack:"من سرپرست قانونی این طفل هستم.",
 reference:"شماره نوبت",refresh:"تازه‌سازی",created:"ثبت شده",
 cancelledStatus:"لغو شده",profileUpdate:"ویرایش پروفایل",
 verification:"لینک ارسالی به ایمیل را تأیید کنید، سپس وارد شوید.",
 resendVerification:"ارسال دوباره ایمیل تأیید",backToLogin:"بازگشت به ورود",resetPassword:"ارسال لینک بازیابی رمز",
 checkAppointments:"بررسی نوبت‌های من"},
 "ps-AF":{login:"ننوځئ",signup:"حساب جوړول",name:"بشپړ نوم",email:"ایمیل",password:"پټنوم",
 loginHelp:"د ملاقاتونو د سمبالولو لپاره تایید شوي حساب ته ننوځئ.",
 signupHelp:"د تایید لینک ایمیل ته استول کېږي؛ وروسته ننوځئ.",
 forgot:"پټنوم مو هېر دی؟",checking:"حساب کتل کېږي…",invalid:"فورمه وګورئ.",
 signout:"وتل",onboard:"د ناروغ پروفایل بشپړول",city:"ښار",phone:"شمېره (اختیاري)",
 accept:"زه د ناروغانو شرطونه او د محرمیت پالیسي منم.",
 adult:"زه بالغ یم او د سرپرستۍ اصول منم.",save:"ساتل",
 profile:"د ناروغ پروفایل",family:"کورنۍ",addChild:"ماشوم زیاتول",dob:"د زېږېدو نېټه (YYYY-MM-DD)",
 appointments:"زما ملاقاتونه",upcoming:"راتلونکي",past:"تېر",cancelled:"لغوه شوي",loadingData:"معلومات بارېږي…",
 empty:"دلته ملاقات نشته.",find:"کلینیکونه لټول",retry:"بیا هڅه",
 cancel:"ملاقات لغوه کول",reschedule:"وخت بدلول",requested:"د کلینیک تایید ته په تمه",
 confirmed:"تایید شوی",rejected:"رد شوی",cancelHint:"ملاقات ته نږدې لغوه کول محدودېدای شي.",
 book:"د ملاقات وخت اخیستل",treatment:"درملنه",dentist:"ډاکټر",time:"وخت",
 patient:"ناروغ",review:"بیاکتنه",done:"رسید",self:"زه خپله",
 next:"دوام",back:"شاته",submit:"ملاقات تاییدول",confirmConsent:"زه غوښتنه او د کلینیک اصول منم.",
 noSlots:"وخت نشته؛ بله ورځ وټاکئ.",select:"یوه ټاکنه وکړئ",
 fee:"اټکلي بیه",pending:"د کلینیک تایید اړین دی.",
 success:"ملاقات ثبت شو.",offline:"اړیکه نشته؛ بیا هڅه وکړئ. دوه ځلې رزرو نه جوړېږي.",
 favorites:"ساتل شوي کلینیکونه او ډاکټران",noFavorites:"لا پروفایل نه دی ساتل شوی.",
 remove:"لرې کول",view:"کتل",preferences:"د ایمیل خبرتیاوې",bookingEmail:"د ملاقات ایمیل",
 updatesEmail:"د ملاقات بدلونونه",emailNote:"ایمیل د اجازې سره، SMS او push فعال نه دي.",
 notificationHistory:"زما د ملاقات خبرونه",notificationIntro:"د برېښنالیک وروستی حالت؛ خوندي جزئیات په لیدنو کې وګورئ.",
 notificationEmpty:"تر اوسه د ملاقات خبر نشته.",notificationRefresh:"خبرونه تازه کړئ",
 notificationQueued:"په کتار کې",notificationSent:"لېږل شوی",notificationFailed:"ناکام",notificationSkipped:"برېښنالیک بند دی",
 notificationRequest:"د ملاقات غوښتنه",notificationAccepted:"ملاقات تایید شو",notificationRejected:"غوښتنه رد شوه",
 notificationRescheduled:"د ملاقات وخت بدل شو",notificationCancelled:"ملاقات لغوه شو",
 notificationChannelOff:"برېښنالیک نه دی تنظیم شوی؛ SMS او push نشته.",notificationChannelOn:"SMS او push نشته.",
 error:"غوښتنه ناکامه شوه",linkedRecords:"د کلینیک ریکارډونه",visitWeb:"په خوندي وېب کې ریکارډونه",
 settings:"د حساب تنظیمات",reason:"دلیل",saving:"ساتل کېږي…",
 date:"نېټه",minor:"ماشوم",adultDelegate:"اجازه لرونکی بالغ",adding:"زیاتول",
 signInFirst:"د ملاقات لپاره ننوځئ او پروفایل بشپړ کړئ.",
 close:"بندول",ack:"زه د دې ماشوم قانوني سرپرست یم.",
 reference:"د ملاقات شمېره",refresh:"تازه کول",created:"ثبت شوی",
 cancelledStatus:"لغوه شوی",profileUpdate:"پروفایل سمول",
 verification:"په ایمیل کې لینک تایید کړئ، بیا ننوځئ.",
 resendVerification:"د تایید ایمیل بیا استول",backToLogin:"بېرته ننوتل",resetPassword:"د پټنوم لینک واستوئ",
 checkAppointments:"زما ملاقاتونه وګورئ"}
} as const;
function tr(lang:Language){return words[lang]}
const dark="#152b4c",blue="#075BF2",muted="#677a92";
function Block({children}:{children:React.ReactNode}){return <View style={p.card}>{children}</View>}
function Label({children}:{children:React.ReactNode}){return <Text style={p.label}>{children}</Text>}
function Field({value,onChangeText,label,secure=false,keyboardType="default"}:{value:string;
 onChangeText:(s:string)=>void;label:string;secure?:boolean;keyboardType?:"default"|"email-address"|"numeric"}){
 return <View style={{gap:6,marginTop:12}}><Label>{label}</Label><TextInput
  value={value} onChangeText={onChangeText} autoCapitalize={secure||keyboardType==="email-address"?"none":"sentences"}
  autoCorrect={false} secureTextEntry={secure} keyboardType={keyboardType}
  accessibilityLabel={label}
  textAlign={keyboardType==="email-address"||keyboardType==="numeric"||secure?"left":
   /[\u0590-\u08FF]/.test(label+" "+value)?"right":"left"}
  style={p.input}/></View>;
}
function Button({title,onPress,secondary=false,danger=false,disabled=false}:{title:string;onPress:()=>void;
 secondary?:boolean;danger?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled}
  style={[p.button,secondary&&p.buttonSecondary,danger&&p.buttonDanger,disabled&&{opacity:.45}]}
  onPress={onPress}><Text style={[p.buttonText,secondary&&p.secondaryText,danger&&p.dangerText]}>{title}</Text></Pressable>;
}
function ErrorBox({message}:{message:string}){return <View style={p.errorBox}><Text style={p.errorText}>{message}</Text></View>}
function NativeLoadingList({label,count=2}:{label:string;count?:number}){
 return <View accessibilityRole="progressbar" accessibilityLabel={label} style={{gap:11}}>
  <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
   <ActivityIndicator color={blue}/><Text style={p.copy}>{label}</Text>
  </View>
  {Array.from({length:count},(_,i)=><View key={i} style={p.skeletonCard}>
   <View style={p.skeletonRow}>
    <View style={p.skeletonAvatar}/>
    <View style={{flex:1,gap:10}}>
     <View style={[p.skeletonText,{width:"73%"}]}/>
     <View style={[p.skeletonText,{width:"52%"}]}/></View>
   </View>
   <View style={[p.skeletonText,{width:"85%",marginTop:14}]}/>
  </View>)}
 </View>;
}
function formatDate(iso:string,lang:Language,calendar:Calendar="gregorian"){
 return new Intl.DateTimeFormat(lang==="en"?"en-GB":lang,{
  timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  dateStyle:"medium",timeStyle:"short"
 }).format(new Date(iso));
}
function formatDay(day:string,lang:Language,calendar:Calendar){
 return new Intl.DateTimeFormat(lang==="en"?"en-GB":lang,{
  timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory",
  month:"short",day:"numeric"
 }).format(new Date(day+"T12:00:00Z"));
}
function appointmentStatus(status:string,lang:Language){
 const extra:Record<Language,Record<string,string>>={
  en:{completed:"Completed",checked_in:"Checked in",in_progress:"In progress",
   cancelled:"Cancelled",no_show:"Did not attend",rescheduled:"Rescheduled"},
  "fa-AF":{completed:"تکمیل‌شده",checked_in:"حاضر شده",in_progress:"در جریان",
   cancelled:"لغوشده",no_show:"حاضر نشده",rescheduled:"وقت تغییر یافته"},
  "ps-AF":{completed:"بشپړ شوی",checked_in:"حاضر شوی",in_progress:"روان",
   cancelled:"لغوه شوی",no_show:"نه دی حاضر شوی",rescheduled:"وخت بدل شوی"}
 };
 const t=tr(lang);
 return status==="requested"?t.requested:status==="confirmed"?t.confirmed:
  status==="rejected"?t.rejected:extra[lang][status]||status.replace(/_/g," ");
}
function isoDay(instant=new Date()){
 const x=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant)
  .filter(v=>v.type!=="literal").map(v=>[v.type,v.value]));
 return [x.year,x.month,x.day].join("-");
}
function addDays(day:string,n:number){
 return new Date(Date.parse(day+"T12:00:00Z")+n*86400000).toISOString().slice(0,10);
}
async function publicGet<T>(path:string):Promise<T>{
 if(!API)throw new ApiError(0,"API_NOT_CONFIGURED");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(API+path,{signal:controller.signal,
   headers:{Accept:"application/json"}});
  const data=await response.json().catch(()=>null) as T&{code?:string};
  if(!response.ok)throw new ApiError(response.status,data?.code||"PUBLIC_UNAVAILABLE");
  return data;
 }finally{clearTimeout(timer)}
}
export function NativeAccountArea({locale,calendar,city,onLocale,onCalendar,onCity,section="profile"}:{locale:Language;calendar:Calendar;
 city:string;onLocale:(v:Language)=>void;onCalendar:(v:Calendar)=>void;onCity:(v:string)=>void;
 section?:"profile"|"family"|"notifications"}){
 const t=tr(locale),auth=useNativeAuth();
 const [mode,setMode]=useState<"login"|"signup"|"recover">("login");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [phone,setPhone]=useState(""),[accepted,setAccepted]=useState(false),[adult,setAdult]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [prefs,setPrefs]=useState<Prefs|null>(null);
 const [family,setFamily]=useState<Family|null>(null);
 const [child,setChild]=useState(""),[birth,setBirth]=useState(""),[guardian,setGuardian]=useState(false);
 const [localEmail,setLocalEmail]=useState(false),[updateEmail,setUpdateEmail]=useState(false);
 const patientId=auth.account?.registered?auth.account.user.id:null;
 useEffect(()=>{
  // Account boundary: immediately clear all previous patient's family, notification
  // settings, unsaved forms and errors before fetching for the new identity.
  setPrefs(null);setFamily(null);setLocalEmail(false);setUpdateEmail(false);
  setChild("");setBirth("");setGuardian(false);setAccepted(false);setAdult(false);
  setNotice("");setError("");setPassword("");
  if(!patientId)return;
  let live=true;
  Promise.all([auth.request<Prefs>("/v1/patients/preferences"),
   auth.request<Family>("/v1/patients/family")]).then(([p,f])=>{
    if(live){setPrefs(p);setFamily(f);setLocalEmail(p.notifications.emailBookings);
     setUpdateEmail(p.notifications.emailUpdates);}
  }).catch(e=>{if(live)setError(patientError(e,locale))});
  return()=>{live=false};
 },[patientId,auth.request]);
 const run=async(fn:()=>Promise<void>)=>{
  setBusy(true);setError("");setNotice("");
  try{await fn()}catch(e){setError(e instanceof Error&&e.message===t.invalid?t.invalid:patientError(e,locale))}
  finally{setBusy(false)}
 };
 if(auth.loading)return <Block><Text>{t.checking}</Text><ActivityIndicator color={blue}/></Block>;
 if(auth.onlineError&&!auth.account)return <Block><ErrorBox message={patientError(new ApiError(0,auth.onlineError),locale)}/>
  <Button title={t.retry} onPress={()=>void auth.refresh()}/></Block>;
 if(!auth.account)return <Block><Text style={p.title}>{mode==="login"?t.login:mode==="signup"?t.signup:t.forgot}</Text>
  <Text style={p.copy}>{mode==="signup"?t.signupHelp:t.loginHelp}</Text>
  {mode==="signup"&&<Field label={t.name} value={name} onChangeText={setName}/>}
  <Field label={t.email} value={email} keyboardType="email-address" onChangeText={setEmail}/>
  {mode!=="recover"&&<Field label={t.password} value={password} secure onChangeText={setPassword}/>}
  {error&&<ErrorBox message={error}/>}
  {notice&&<Text style={p.success}>{notice}</Text>}
  <Button title={busy?t.saving:mode==="recover"?t.resetPassword:mode==="login"?t.login:t.signup} disabled={busy}
   onPress={()=>void run(async()=>{
    if(!email.includes("@")||(mode!=="recover"&&password.length<10)||(mode==="signup"&&name.trim().length<2))
     throw new Error(t.invalid);
    if(mode==="recover"){
     await auth.requestPasswordReset(email);
     setNotice(patientText(locale,"resetSent"));setPassword("");return;
    }
    if(mode==="signup"){await auth.signUp(name,email,password);
     setNotice(t.verification);setMode("login");setPassword("");}
    else await auth.signIn(email,password);
   })}/>
  <Button secondary title={mode==="recover"?t.backToLogin:mode==="login"?t.signup:t.login}
   disabled={busy} onPress={()=>{setMode(mode==="login"?"signup":"login");setError("");setNotice("");setPassword("")}}/>
  {mode==="login"&&<Button secondary title={t.forgot} disabled={busy}
   onPress={()=>{setMode("recover");setError("");setNotice("");setPassword("")}}/>}
  {mode!=="recover"&&<Button secondary title={t.resendVerification}
   disabled={busy||!email.includes("@")} onPress={()=>void run(async()=>{
    // Do not disclose whether the email address has an account. Preserve
    // actionable connection/rate limit failures; all other outcomes are neutral.
    try{await auth.resendVerification(email);}
    catch(e){
     if(e instanceof ApiError&&(e.status===0||e.status===429))throw e;
    }
    setNotice(patientText(locale,"verifySent"));
   })}/>}
  {error===patientText(locale,"mfaWeb")&&WEB&&<Button secondary title={t.login}
   onPress={()=>void Linking.openURL(WEB+"/login")}/>}
 </Block>;
 if(!auth.account.registered)return <Block><Text style={p.title}>{t.onboard}</Text>
  <Text style={p.copy}>{t.signInFirst}</Text>
  <Field label={t.name} value={name||auth.account.user.name} onChangeText={setName}/>
  <Field label={t.city} value={city} onChangeText={onCity}/>
  <Field label={t.phone} value={phone} onChangeText={setPhone}/>
  <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}}
   onPress={()=>setAccepted(!accepted)} style={p.check}><Text>{accepted?"☑":"□"} {t.accept}</Text></Pressable>
  <Pressable accessibilityRole="checkbox" accessibilityState={{checked:adult}}
   onPress={()=>setAdult(!adult)} style={p.check}><Text>{adult?"☑":"□"} {t.adult}</Text></Pressable>
  {error&&<ErrorBox message={error}/>}
  <Button title={t.onboard} disabled={busy||!accepted||!adult} onPress={()=>void run(async()=>{
   const fresh=await auth.request<NativeAccount>("/v1/patients/me");
   const versions=fresh.onboarding;
   await auth.request("/v1/patients/onboard","POST",{
    preferredName:(name||auth.account?.user.name||"").trim(),city,phone:phone||null,
    termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
    termsVersion:versions.termsVersion,privacyVersion:versions.privacyVersion
   });await auth.refresh();
  })}/>
  <Button secondary title={t.signout} disabled={busy}
   onPress={()=>void run(async()=>await auth.signOut())}/>
 </Block>;
 const profile=auth.account.profile;
 return <View style={{gap:13,direction:locale==="en"?"ltr":"rtl"}}>
  {section==="profile"&&<Block><Text style={p.title}>{t.profile}</Text>
   <Text style={p.copy}>{auth.account.user.email}</Text>
   <Text style={p.label}>{profile?.preferredName} · {profile?.city}</Text>
   <Button secondary title={t.profileUpdate} onPress={()=>{setName(profile?.preferredName||"");setPhone(profile?.phone||"");onCity(profile?.city||city);setNotice("edit")}}/>
   {notice==="edit"&&<>
    <Field label={t.name} value={name} onChangeText={setName}/>
    <Field label={t.city} value={city} onChangeText={onCity}/>
    <Field label={t.phone} value={phone} onChangeText={setPhone}/>
    <Button title={busy?t.saving:t.save} disabled={busy} onPress={()=>void run(async()=>{
     await auth.request("/v1/patients/me","PUT",{
      preferredName:name,city,phone:phone||null,revision:profile?.revision
     });await auth.refresh();
    })}/>
   </>}
   <Button secondary title={t.signout} disabled={busy} onPress={()=>void run(async()=>await auth.signOut())}/>
  </Block>}
  {section==="family"&&<Block><Text style={p.title}>{t.family}</Text>
   {family?.members.map(m=><Text key={m.id} style={p.item}>
    {m.displayName} · {m.memberType==="minor"?t.minor:t.adultDelegate}
   </Text>)}
   <Text style={p.copy}>{t.addChild}</Text>
   <Field label={t.name} value={child} onChangeText={setChild}/>
   <Field label={t.dob} value={birth} onChangeText={setBirth}/>
   <Pressable onPress={()=>setGuardian(!guardian)} style={p.check}
    accessibilityRole="checkbox" accessibilityState={{checked:guardian}}>
    <Text>{guardian?"☑":"□"} {t.ack}</Text></Pressable>
   <Button title={t.adding} disabled={busy||!guardian} onPress={()=>void run(async()=>{
    if(!family)throw Error(t.retry);
    await auth.request("/v1/patients/family/minors","POST",{
     displayName:child,dateOfBirth:birth,relationship:"child",
     authorizationStatement:true,guardianPolicyVersion:family.policy.guardianPolicyVersion
    });
    setChild("");setBirth("");setGuardian(false);
    setFamily(await auth.request<Family>("/v1/patients/family"));
   })}/>
  </Block>}
  {section==="notifications"&&<Block><Text style={p.title}>{t.preferences}</Text><Text style={p.copy}>{t.emailNote}</Text>
   <Pressable style={p.check} onPress={()=>setLocalEmail(!localEmail)}>
    <Text>{localEmail?"☑":"□"} {t.bookingEmail}</Text></Pressable>
   <Pressable style={p.check} onPress={()=>setUpdateEmail(!updateEmail)}>
    <Text>{updateEmail?"☑":"□"} {t.updatesEmail}</Text></Pressable>
   <Button title={busy?t.saving:t.save} disabled={busy||!prefs} onPress={()=>void run(async()=>{
    if(!prefs)throw Error(t.retry);
    await auth.request("/v1/patients/preferences","PUT",{
     locale,calendar,emailBookings:localEmail,emailUpdates:updateEmail,
     revision:prefs.revision
    });setPrefs(await auth.request<Prefs>("/v1/patients/preferences"));
   })}/>
  </Block>}
  {section==="notifications"&&<NativePatientNotifications locale={locale} calendar={calendar}/>}
  {error&&<ErrorBox message={error}/>}
 </View>;
}
function NativePatientNotifications({locale,calendar}:{locale:Language;calendar:Calendar}){
 const t=tr(locale),auth=useNativeAuth();
 const user=auth.account?.registered?auth.account.user.id:null;
 const [revision,setRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<{user:string;data:NotificationFeed|null;
  error:string;loading:boolean}|null>(null);
 const reload=useCallback(()=>setRevision(x=>x+1),[]);
 useEffect(()=>{
  if(!user){setSnapshot(null);return;}
  let live=true;
  setSnapshot({user,data:null,error:"",loading:true});
  auth.request<NotificationFeed>("/v1/booking/notifications").then(data=>{
   if(live)setSnapshot({user,data,error:"",loading:false});
  }).catch(e=>{
   if(live)setSnapshot({user,data:null,error:patientError(e,locale),loading:false});
  });
  return()=>{live=false};
 },[user,auth.request,revision]);
 useEffect(()=>{
  if(!user)return;
  const sub=AppState.addEventListener("change",state=>{
   if(state==="active")reload();
  });
  return()=>sub.remove();
 },[user,reload]);
 if(!user)return null;
 const view=snapshot?.user===user?snapshot:null;
 const loading=view?.loading??true,data=view?.data,error=view?.error||"";
 const label=(name:string)=>{
  switch(name){
   case "requested":return t.notificationRequest;
   case "confirmed":case "accepted":return t.notificationAccepted;
   case "rejected":return t.notificationRejected;
   case "rescheduled":return t.notificationRescheduled;
   case "cancelled":return t.notificationCancelled;
   default:return name.replace(/_/g," ");
  }
 };
 const status=(name:string)=>name==="sent"?t.notificationSent:
  name==="failed"?t.notificationFailed:name==="skipped"?t.notificationSkipped:
   t.notificationQueued;
 return <Block>
  <Text style={p.title}>{t.notificationHistory}</Text>
  <Text style={p.copy}>{t.notificationIntro}</Text>
  <Button secondary title={t.notificationRefresh} onPress={reload} disabled={loading}/>
  {loading&&<ActivityIndicator color={blue}/>}
  {error&&<ErrorBox message={error}/>}
  {!loading&&!error&&data&&<>
   <Text style={p.copy}>{data.emailConfigured?t.notificationChannelOn:t.notificationChannelOff}</Text>
   {!data.events.length&&<Text style={p.copy}>{t.notificationEmpty}</Text>}
   {data.events.slice(0,8).map((event,index)=><View key={event.created_at+":"+event.event_name+":"+index}
    style={p.notificationItem} accessibilityRole="text">
    <View style={p.between}><Text style={p.label}>{label(event.event_name)}</Text>
     <Text style={[p.notificationBadge,
      event.status==="failed"?p.badgeDanger:event.status==="sent"?p.badge: p.badgePending]}>
      {status(event.status)}</Text></View>
    <Text style={p.small}>{formatDate(event.created_at,locale,calendar)}</Text>
   </View>)}
  </>}
 </Block>;
}
export function NativeAppointments({locale,calendar,onExplore,onReschedule,onOpen}:{locale:Language;
 calendar:Calendar;onExplore:()=>void;onReschedule:(b:Booking)=>void;onOpen:(bookingId:string)=>void}){
 const t=tr(locale),auth=useNativeAuth();
 const [filter,setFilter]=useState<"upcoming"|"past"|"cancelled">("upcoming");
 const [busy,setBusy]=useState(""),[actionError,setActionError]=useState("");
 const [reload,setReload]=useState(0),generation=useRef(0);
 const patientId=auth.account?.registered?auth.account.user.id:null;
 const [snapshot,setSnapshot]=useState<{patientId:string;rows:Booking[];
  error:string;loading:boolean}|null>(null);
 const refresh=useCallback(async()=>{
  if(!patientId){setSnapshot(null);return;}
  const request=++generation.current;
  setActionError("");
  setSnapshot({patientId,rows:[],error:"",loading:true});
  try{
   const result=await auth.request<{appointments:Booking[]}>("/v1/booking/my");
   if(generation.current===request)setSnapshot({patientId,rows:result.appointments||[],
    error:"",loading:false});
  }catch(e){
   if(generation.current===request)setSnapshot({patientId,rows:[],
    error:patientError(e,locale),loading:false});
  }
 },[patientId,auth.request,locale]);
 useEffect(()=>{void refresh();return()=>{generation.current++};},[refresh,reload]);
 const active=snapshot?.patientId===patientId?snapshot:null;
 const rows=active?.rows||[],loading=active?.loading??true;
 const error=active?.error||"";
 if(!auth.account?.registered)return <Block><Text style={p.title}>{t.appointments}</Text>
  <Text style={p.copy}>{t.signInFirst}</Text></Block>;
 const current=rows.filter(b=>filter==="cancelled"?["cancelled","rejected","no_show"].includes(b.status):
  filter==="past"?new Date(b.startAt).getTime()<Date.now()||
   ["completed","checked_in","in_progress"].includes(b.status):
  new Date(b.startAt).getTime()>=Date.now()&&
   ["requested","confirmed"].includes(b.status))
  .sort((a,b)=>filter==="upcoming"?Date.parse(a.startAt)-Date.parse(b.startAt):
   Date.parse(b.startAt)-Date.parse(a.startAt));
 const cancel=(b:Booking)=>Alert.alert(t.cancel,t.cancelHint,[
  {text:t.back,style:"cancel"},{text:t.cancel,style:"destructive",onPress:()=>void(async()=>{
   setBusy(b.id);setActionError("");
   try{await auth.request("/v1/booking/my/"+encodeURIComponent(b.id)+"/cancel","POST",{
    revision:b.revision,reason:"Patient requested appointment cancellation"});
    await refresh();
   }catch(e){
    if(e instanceof ApiError&&e.status===409)await refresh();
    setActionError(patientError(e,locale));
   }
   finally{setBusy("")}
  })()}]);
 return <View style={{gap:12,direction:locale==="en"?"ltr":"rtl"}}>
  <Text style={p.title}>{t.appointments}</Text>
  <View style={[p.filters,{flexDirection:locale==="en"?"row":"row-reverse"}]}>{(["upcoming","past","cancelled"] as const).map(key=>
   <Pressable key={key} onPress={()=>setFilter(key)}
    style={[p.filter,filter===key&&p.filterOn]} accessibilityRole="tab"
    accessibilityState={{selected:filter===key}}>
    <Text style={[p.filterText,filter===key&&p.filterTextOn]}>{t[key]}</Text>
   </Pressable>)}</View>
  <Button secondary title={t.refresh} onPress={()=>setReload(x=>x+1)}/>
  {loading&&<NativeLoadingList label={t.loadingData}/> }
  {error&&<ErrorBox message={error}/>}
  {!!actionError&&<ErrorBox message={actionError}/>}
  {!loading&&!error&&current.length===0&&<Block><Text style={p.copy}>{t.empty}</Text>
   <Button secondary title={t.find} onPress={onExplore}/></Block>}
  {!loading&&!error&&current.map(b=><Block key={b.id}>
   <View style={p.between}><Text style={p.title}>{b.clinicName}</Text>
    <Text style={[p.badge,["cancelled","rejected","no_show"].includes(b.status)?p.badgeDanger:
     b.status==="requested"?p.badgePending:null]}>{appointmentStatus(b.status,locale)}</Text>
   </View>
   <Text style={p.copy}>{b.serviceName} · {b.patientName}</Text>
   <Text style={p.label}>{formatDate(b.startAt,locale,calendar)}</Text>
   <Text style={p.copy}>{b.priceAfn.toLocaleString("en")} AFN</Text>
   <Text style={p.small}>{t.reference}: {b.id.slice(0,12)}</Text>
   <Button secondary title={t.view} onPress={()=>onOpen(b.id)}/>
   {["confirmed","requested"].includes(b.status)&&Date.parse(b.startAt)>Date.now()&&<>
    {(b.status==="requested"||Date.parse(b.cancelUntil)>Date.now())&&
     <Button secondary title={t.reschedule} disabled={!!busy} onPress={()=>onReschedule(b)}/>}
    {(b.status==="requested"||Date.parse(b.cancelUntil)>Date.now())&&
     <Button danger title={t.cancel} disabled={!!busy} onPress={()=>cancel(b)}/>}
    {b.status==="confirmed"&&Date.parse(b.cancelUntil)<=Date.now()&&
     <Text style={p.copy}>{t.cancelHint}</Text>}
   </>}
  </Block>)}
 </View>;
}
export function NativeBookingWizard({locale,calendar,clinicId,dentistId,booking,onDone,onAccount}:{locale:Language;
 calendar:Calendar;clinicId:string;dentistId?:string;booking?:Booking;onDone:()=>void;onAccount:()=>void}){
 const t=tr(locale),auth=useNativeAuth();
 const [clinic,setClinic]=useState<Clinic|null>(null),[family,setFamily]=useState<Family|null>(null);
 const [step,setStep]=useState(0),[service,setService]=useState(booking?.serviceId||"");
 const [dentist,setDentist]=useState(booking?.dentistId||dentistId||"");
 const [day,setDay]=useState(isoDay()),[slots,setSlots]=useState<Time[]>([]);
 const [time,setTime]=useState(""),[person,setPerson]=useState("self"),[consent,setConsent]=useState(false);
 const [key,setKey]=useState(uniqueActionKey()),[receipt,setReceipt]=useState<Booking|null>(null);
 const [loading,setLoading]=useState(true),[slotsLoading,setSlotsLoading]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [recoveryNotice,setRecoveryNotice]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [retry,setRetry]=useState(0);
 const reserved=booking!=null;
 useEffect(()=>{
  let current=true;setLoading(true);setError("");
  Promise.all([publicGet<Clinic>("/v1/discovery/clinics/"+encodeURIComponent(clinicId)),
   auth.account?.registered?auth.request<Family>("/v1/patients/family"):Promise.resolve(null)
  ]).then(([c,f])=>{if(current){setClinic(c);setFamily(f)}})
   .catch(e=>{if(current)setError(patientError(e,locale))})
   .finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[clinicId,auth.account?.user.id,auth.account?.registered,retry]);
 useEffect(()=>{
  if(!service||!dentist)return;
  let active=true;setSlots([]);setError("");setSlotsLoading(true);
  const params=new URLSearchParams({date:day,serviceId:service,dentistId:dentist});
  publicGet<{slots:Time[]}>("/v1/discovery/clinics/"+encodeURIComponent(clinicId)+
   "/availability?"+params.toString()).then(x=>{if(active)setSlots(x.slots)})
   .catch(e=>{if(active)setError(patientError(e,locale))})
   .finally(()=>{if(active)setSlotsLoading(false)});
  return()=>{active=false};
 },[clinicId,service,dentist,day,retry]);
 function restartKey(){setTime("");setKey(uniqueActionKey());setRecoveryNotice("");setUncertain(false)}
 async function submit(){
  if(!time||!auth.account?.registered)return;
  setBusy(true);setError("");setRecoveryNotice("");setUncertain(false);
  try{
   if(booking){
    await auth.request("/v1/booking/my/"+encodeURIComponent(booking.id)+"/reschedule","POST",{
     revision:booking.revision,startAt:time,reason:"Patient requested to reschedule appointment"});
    onDone();return;
   }
   const selected=person==="self"?null:family?.members.find(m=>m.id===person);
   const response=await auth.request<{booking:Booking}>("/v1/booking/requests","POST",{
    clinicId,serviceId:service,dentistId:dentist,startAt:time,
    subjectType:selected?.memberType==="minor"?"minor":selected?"adult_delegate":"self",
    dependentId:selected?.id??null,bookingConsent:true,idempotencyKey:key
   });
   setReceipt(response.booking);setStep(5);
  }catch(e){
   if(isSlotConflict(e)){
    // Available slots are previews, not holds. Fetch fresh provider availability
    // and require the patient to choose another time without losing other input.
    setStep(2);setTime("");setSlots([]);setKey(uniqueActionKey());
    setRecoveryNotice(patientText(locale,"slotTaken"));
    setRetry(v=>v+1);
   }else{
    setError(patientError(e,locale));
    if(e instanceof ApiError&&e.status===0&&e.code==="NETWORK_UNAVAILABLE")
     setUncertain(true); // Keep idempotency key for safe retry after checking history.
   }
  }finally{setBusy(false)}
 }
 const steps=[t.treatment,t.dentist,t.time,t.patient,t.review];
 if(!auth.account?.registered)return <Block><Text style={p.title}>{t.signInFirst}</Text>
  <Button title={t.login} onPress={onAccount}/></Block>;
 if(loading)return <Block><ActivityIndicator color={blue}/><Text>{t.checking}</Text></Block>;
 if(!clinic)return <Block><ErrorBox message={error||t.error}/>
  <Button secondary title={t.retry} onPress={()=>setRetry(x=>x+1)}/></Block>;
 if(receipt)return <Block><Text style={p.title}>{t.done}</Text><Text style={p.success}>{t.success}</Text>
  <Text style={p.label}>{receipt.clinicName||clinic.clinic.name}</Text>
  <Text>{receipt.serviceName}</Text><Text>{formatDate(receipt.startAt,locale,calendar)}</Text>
  <Text style={p.badge}>{receipt.status==="requested"?t.pending:t.confirmed}</Text>
  <Text style={p.small}>{t.reference}: {receipt.id}</Text>
  <Button title={t.appointments} onPress={onDone}/></Block>;
 const picked=slots.find(s=>s.startAt===time);
 const allowed=step===0?!!service:step===1?!!dentist:step===2?!!picked:
  step===3?person==="self"||!!family?.members.find(x=>x.id===person&&x.eligibleForFutureBooking):consent&&!!picked;
 return <View style={{gap:12,direction:locale==="en"?"ltr":"rtl"}}>
  <Text style={p.title}>{booking?t.reschedule:t.book} · {clinic.clinic.name}</Text>
  <View style={p.stepper}>{steps.map((label,i)=><Pressable key={label} disabled={i>step}
   accessibilityRole="button" onPress={()=>setStep(i)}
   style={[p.step,i===step&&p.stepActive]}><Text style={[p.stepText,i===step&&p.stepTextActive]}>
    {i+1}. {label}</Text></Pressable>)}</View>
  <Block>
   <Text style={p.title}>{steps[step]}</Text>
   {step===0&&clinic.profile.services.filter(s=>!reserved||s.id===booking.serviceId).map(item=>
    <Pressable accessibilityRole="radio" accessibilityState={{checked:service===item.id}}
     onPress={()=>{setService(item.id);restartKey()}} key={item.id}
     style={[p.choice,service===item.id&&p.choiceActive]}>
     <Text style={p.label}>{item.name}</Text>
     <Text style={p.copy}>{item.durationMinutes} min · {item.priceAfn} AFN</Text>
    </Pressable>)}
   {step===1&&clinic.profile.dentists.filter(d=>!reserved||d.id===booking.dentistId).map(item=>
    <Pressable accessibilityRole="radio" accessibilityState={{checked:dentist===item.id}}
     key={item.id} style={[p.choice,dentist===item.id&&p.choiceActive]}
     onPress={()=>{setDentist(item.id);restartKey()}}>
     <Text style={p.label}>{item.displayName}</Text>
    </Pressable>)}
   {step===2&&<>
    <Text style={p.copy}>{t.date}: {formatDay(day,locale,calendar)}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
     contentContainerStyle={{gap:7,marginVertical:13,flexDirection:locale==="en"?"row":"row-reverse"}}>
     {Array.from({length:Math.min(21,clinic.profile.bookingRules.horizonDays||21)},(_,i)=>addDays(isoDay(),i))
      .map(d=><Pressable key={d} style={[p.day,day===d&&p.choiceActive]}
       onPress={()=>{setDay(d);restartKey()}}><Text style={p.label}>{formatDay(d,locale,calendar)}</Text></Pressable>)}
    </ScrollView>
    {slotsLoading?<ActivityIndicator color={blue}/>:!slots.length&&!error?<Text style={p.copy}>{t.noSlots}</Text>:!error?
     <View style={p.times}>{slots.map((item,index)=><Pressable key={item.startAt+index}
      accessibilityRole="radio" accessibilityState={{checked:time===item.startAt}}
      onPress={()=>{setTime(item.startAt);setKey(uniqueActionKey())}}
      style={[p.time,time===item.startAt&&p.choiceActive]}>
      <Text style={p.label}>{formatDate(item.startAt,locale,calendar)}</Text>
     </Pressable>)}</View>:null}
   </>}
   {step===3&&<>
    <Pressable style={[p.choice,person==="self"&&p.choiceActive]}
     onPress={()=>{setPerson("self");setKey(uniqueActionKey())}}><Text>{t.self}</Text></Pressable>
    {family?.members.filter(m=>m.eligibleForFutureBooking).map(member=>
     <Pressable key={member.id} onPress={()=>{setPerson(member.id);setKey(uniqueActionKey())}}
      style={[p.choice,person===member.id&&p.choiceActive]}>
      <Text style={p.label}>{member.displayName} · {member.memberType==="minor"?t.minor:t.adultDelegate}</Text>
     </Pressable>)}
   </>}
   {step===4&&<>
    <Text style={p.label}>{clinic.clinic.name}</Text>
    <Text>{clinic.profile.services.find(x=>x.id===service)?.name}</Text>
    <Text>{clinic.profile.dentists.find(x=>x.id===dentist)?.displayName}</Text>
    <Text>{formatDate(time,locale,calendar)}</Text>
    <Text style={p.label}>{t.fee}: {picked?.priceAfn||booking?.priceAfn} AFN</Text>
    <Text style={p.copy}>{clinic.profile.bookingRules.approvalMode==="manual"?t.pending:t.confirmed}</Text>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}}
     style={p.check} onPress={()=>setConsent(!consent)}>
     <Text>{consent?"☑":"□"} {t.confirmConsent}</Text></Pressable>
   </>}
   {!!recoveryNotice&&<Text accessibilityRole="alert" style={p.recoveryNote}>{recoveryNotice}</Text>}
   {!!error&&<ErrorBox message={error}/>}
   {uncertain&&<><Text style={p.copy}>{patientText(locale,"uncertain")}</Text>
    <Button secondary title={t.checkAppointments} onPress={onDone}/></>}
   <View style={p.actions}>{step>0&&<Button secondary title={t.back} onPress={()=>setStep(x=>x-1)}/>}
    <Button title={busy?t.saving:step===4?t.submit:t.next}
     disabled={!allowed||busy} onPress={()=>step===4?void submit():setStep(x=>x+1)}/></View>
  </Block>
 </View>;
}
export function NativeSaved({locale,onClinic,onDentist,onExplore}:{locale:Language;
 onClinic:(id:string)=>void;onDentist:(clinic:string,dentist:string)=>void;onExplore:()=>void}){
 const t=tr(locale),auth=useNativeAuth();
 const [favorites,setFavorites]=useState<Favorite[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [reload,setReload]=useState(0),[busy,setBusy]=useState("");
 useEffect(()=>{
  if(!auth.account?.registered)return;
  let alive=true;setLoading(true);setError("");
  auth.request<{favorites:Favorite[]}>("/v1/patient-favorites").then(x=>{
   if(alive)setFavorites(x.favorites);
  }).catch(e=>{if(alive)setError(patientError(e,locale))})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[auth.account?.user.id,auth.account?.registered,reload]);
 async function remove(f:Favorite){
  setBusy(f.clinicId+(f.dentistId||""));setError("");
  try{await auth.request("/v1/patient-favorites","DELETE",{clinicId:f.clinicId,dentistId:f.dentistId});
   setReload(x=>x+1);
  }catch(e){setError(patientError(e,locale))}
  finally{setBusy("")}
 }
 return <View style={{gap:12,direction:locale==="en"?"ltr":"rtl"}}>
  <Text style={p.title}>{t.favorites}</Text>
  {loading&&<NativeLoadingList label={t.loadingData}/> }
  {!!error&&<><ErrorBox message={error}/><Button secondary title={t.retry}
   onPress={()=>setReload(x=>x+1)}/></>}
  {!loading&&!error&&!favorites.length&&<Block><Text style={p.copy}>{t.noFavorites}</Text>
   <Button secondary title={t.find} onPress={onExplore}/></Block>}
  {!loading&&!error&&favorites.map(f=><Block key={f.clinicId+f.dentistId}>
   <Text style={p.label}>{f.dentistName||f.clinicName}</Text>
   {f.dentistName&&<Text style={p.copy}>{f.clinicName}</Text>}
   <View style={p.actions}><Button title={t.view} disabled={!!busy} onPress={()=>f.dentistId?
    onDentist(f.clinicId,f.dentistId):onClinic(f.clinicId)}/>
    <Button secondary title={t.remove} disabled={!!busy} onPress={()=>void remove(f)}/></View>
  </Block>)}
 </View>;
}
const p=StyleSheet.create({
 card:{backgroundColor:"#fff",borderRadius:18,padding:18,borderWidth:1,borderColor:"#E2EAF2",
  gap:10,shadowOpacity:.04,shadowRadius:9,shadowColor:"#1B3556",elevation:1},
 title:{fontSize:20,fontWeight:"800",color:dark,flexShrink:1},
 copy:{fontSize:13,lineHeight:21,color:muted},
 label:{fontSize:14,fontWeight:"700",color:dark},
 small:{fontSize:11,color:muted},
 input:{borderWidth:1,borderColor:"#CBD9EA",borderRadius:12,paddingHorizontal:12,
  minHeight:47,fontSize:14,color:dark,backgroundColor:"#FDFEFF"},
 button:{backgroundColor:blue,borderRadius:12,minHeight:44,justifyContent:"center",
  alignItems:"center",paddingHorizontal:16,paddingVertical:8,marginTop:6},
 buttonSecondary:{backgroundColor:"#EEF4FF",borderWidth:1,borderColor:"#C5D8FD"},
 buttonDanger:{backgroundColor:"#FFF1F1",borderWidth:1,borderColor:"#F3C8CD"},
 dangerText:{color:"#AC3443"},
 buttonText:{fontWeight:"800",color:"#fff",textAlign:"center",fontSize:13},
 secondaryText:{color:blue},
 errorBox:{backgroundColor:"#FFF0F0",padding:13,borderRadius:11},
 errorText:{color:"#9A2530",fontSize:13},
 success:{color:"#137655",fontWeight:"700"},
 item:{paddingVertical:7,borderBottomWidth:1,borderBottomColor:"#F0F4FA",color:dark},
 skeletonCard:{backgroundColor:"#F8FBFE",borderWidth:1,borderColor:"#DFEAF2",
  borderRadius:15,padding:16,minHeight:105},
 skeletonRow:{flexDirection:"row",gap:13,alignItems:"center"},
 skeletonAvatar:{width:46,height:46,borderRadius:12,backgroundColor:"#E3EDF5"},
 skeletonText:{height:12,borderRadius:6,backgroundColor:"#E3EDF5"},
 recoveryNote:{backgroundColor:"#E8F2FF",color:"#114C9D",borderWidth:1,borderColor:"#B8D5FC",padding:12,borderRadius:12,fontSize:13,lineHeight:20},
 notificationItem:{paddingVertical:9,borderTopWidth:1,borderTopColor:"#EDF2F8",gap:5},
 notificationBadge:{fontSize:11,fontWeight:"800",padding:6,borderRadius:16,overflow:"hidden"},
 check:{paddingVertical:10,minHeight:42},
 filters:{flexDirection:"row",gap:7},
 filter:{flex:1,borderRadius:12,backgroundColor:"#EFF4FB",padding:10,alignItems:"center"},
 filterOn:{backgroundColor:blue},
 filterText:{color:dark,fontSize:12,fontWeight:"700"},
 filterTextOn:{color:"#fff"},
 between:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:6},
 badge:{fontSize:11,fontWeight:"800",color:"#0F8063",backgroundColor:"#E7F7F0",
  padding:7,borderRadius:20,overflow:"hidden"},
 badgePending:{color:"#946019",backgroundColor:"#FFF1D5"},
 badgeDanger:{color:"#AC3443",backgroundColor:"#FFF0F1"},
 stepper:{flexDirection:"row",flexWrap:"wrap",gap:6},
 step:{borderRadius:10,backgroundColor:"#EAF0F9",padding:7},
 stepActive:{backgroundColor:blue},
 stepText:{fontSize:11,color:"#48617E"},
 stepTextActive:{color:"#fff"},
 choice:{padding:13,borderRadius:12,borderWidth:1,borderColor:"#D8E3F5",marginTop:6,gap:5},
 choiceActive:{backgroundColor:"#E9F2FF",borderColor:blue,borderWidth:2},
 day:{minWidth:64,padding:10,borderWidth:1,borderColor:"#D8E3F5",borderRadius:12},
 times:{flexDirection:"row",flexWrap:"wrap",gap:8},
 time:{width:"47%",padding:12,borderWidth:1,borderColor:"#D8E3F5",borderRadius:12},
 actions:{flexDirection:"row",flexWrap:"wrap",gap:10,justifyContent:"flex-end",marginTop:10}
});
