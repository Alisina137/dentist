import React,{useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,Linking,Pressable,ScrollView,StatusBar,StyleSheet,
 Text,TextInput,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {ApiError} from "./api-error";
import {NativeClinicPhase20,NativeDentistPhase20,NativeClinicTeamPhase20,
 NativeInviteAcceptance} from "./native-clinic-phase20";
import {nativeApiHeaders,nativeJsonResponse} from "./api-transport";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import {
 blankClinicDraft,clinicDraftErrors,clinicRegistrationPayload,validClinicContext,
 clinicHomeMetrics,clinicAppointmentMetrics,type ClinicDraft,type ClinicPlan,
 type NativeClinicContext,type NativeClinicSpace,type NativeClinicRecord,
 type ClinicOperations,type ClinicAppointments
} from "./native-clinic-model";

declare const process:{readonly env:{EXPO_PUBLIC_API_URL?:string;
 EXPO_PUBLIC_CLINIC_WEB_URL?:string}};
const API=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
const CLINIC_WEB=(process.env.EXPO_PUBLIC_CLINIC_WEB_URL||"").trim().replace(/\/+$/,"");
const TOKEN_KEY="dandanlink_native_clinic_session_v1";
const LOCALE_KEY="dandanlink.mobile.clinicLanguage.v1";
type Locale="en"|"fa-AF"|"ps-AF";
type Tab="overview"|"onboard"|"team"|"settings";
type AuthScreen="signin"|"signup";
const i18n={
 en:{
  eyebrow:"DANDANLINK · FOR PROFESSIONALS",title:"Your clinic, organized.",
  intro:"A secure home for practice owners, dentists and invited staff.",
  signin:"Sign in",signup:"Create account",name:"Full name",email:"Email address",
  password:"Password",authHelp:"Use a verified email address. Accounts with two-factor authentication must sign in through the secure clinic website.",
  verify:"Account created. Verify your email before signing in.",
  submit:"Continue",checking:"Checking secure clinic access…",
  signupHint:"Passwords need 10 or more characters.",signInError:"Sign-in failed. Check credentials, verification and connectivity.",
  signupError:"Could not create account. Check the form and network.",
  authRequired:"Sign in with your clinic account to continue.",retry:"Retry",
  noClinic:"Set up your dental clinic",noClinicBody:"Register as an owner, choose a plan and submit the required license evidence for review. Invited dentists and staff can sign in to an existing clinic.",
  createClinic:"Register a clinic",openWeb:"Open clinic web workspace",
  workspace:"Workspace",overview:"Overview",onboard:"Registration",team:"Team & dentists",
  settings:"Account",signout:"Sign out",switch:"Change workspace",
  selected:"Active clinic",status:"Review status",owner:"Owner",manager:"Manager",
  dentist:"Dentist",receptionist:"Receptionist",assistant:"Assistant",cashier:"Cashier",
  pending:"Pending independent review",draft:"Draft saved",approved:"Approved",
  today:"Today’s appointments",week:"Next 7 days",activeDoctors:"Dentists with hours",
  services:"Active services",chairs:"Active chairs",openDays:"Open days",
  noData:"Live metrics unavailable. Check role, network, or clinic approval.",
  refresh:"Refresh live data",privacy:"Private clinic information stays on verified sessions.",
  start:"Create clinic draft",identity:"Clinic details",plan:"Subscription plan",
  review:"Review & save",next:"Next",back:"Back",save:"Save clinic draft",
  formHelp:"The same verified clinic registration is used by the web workspace.",
  legalName:"Registered clinic name",displayName:"Public display name",
  clinicType:"Clinic type",solo:"Independent dentist",office:"Dental clinic",
  specialty:"Specialty center",province:"Province",city:"City",district:"District (optional)",
  address:"Complete address",phone:"Contact phone",licenseNumber:"License number (optional)",
  plannedDentistCount:"Expected number of dentists",
  expectedNote:"Planning estimate only. Actual dentists are invited and credential-reviewed separately.",
  billingPeriod:"Billing period",monthly:"Monthly",annual:"Annual",price:"AFN",
  trial:"Trial days",staffLimit:"Staff capacity",branches:"Branches",
  noPlans:"No active plans are available. Check the API or contact the platform administrator.",
  planUnavailable:"Select a published plan.",detailsInvalid:"Review the required clinic fields.",
  reviewNotice:"You are creating a draft, not an approved clinic. After saving, sign in on the clinic website to upload the clinic license, attest accuracy and submit for independent review.",
  saved:"Clinic draft saved. Complete license upload and submit for review on the clinic website.",
  setupTitle:"Finish clinic activation",setupIntro:"A draft is not a verified clinic and cannot publish dentists or accept real patient care.",
  steps:"Required setup",license:"Upload clinic license and submit for review",
  invite:"Invite team and verify dentist credentials",
  hours:"Configure clinic hours and dentist schedules",
  offering:"Configure services, chairs and booking rules",
  reviewHuman:"Independent approval is required; mobile onboarding does not bypass it.",
  connectWeb:"Continue full setup on clinic website",webMissing:"Configure EXPO_PUBLIC_CLINIC_WEB_URL to open the clinic website from your phone. Your saved draft remains on the API.",
  webSignIn:"The website may require a separate secure login.",
  statusInfo:"Your clinic membership and role come from the server.",
  emptyTeam:"Dentist count appears after provider schedules are configured.",
  readOnly:"Operational preview is read-only. Use clinic web for authorized actions.",
  mfa:"Two-factor authentication is required for protected staff operations.",
  role:"Your clinic role",emailLabel:"Account email",secure:"Secure session",
  network:"Connection unavailable or not configured",unknown:"Unavailable",
  chooseClinic:"Select clinic",none:"No clinic assigned",newClinic:"New registration",
  planSummary:"Clinic plan",registered:"Registered practice",needLogin:"Email verification required. Sign in after verifying."
 },
 "fa-AF":{
  eyebrow:"دندان‌لینک · برای متخصصان",title:"کلینیک شما، منظم و مصئون.",
  intro:"فضای امن برای مالک کلینیک، داکتران و کارمندان دعوت‌شده.",
  signin:"ورود",signup:"ایجاد حساب",name:"نام کامل",email:"ایمیل",
  password:"رمز عبور",authHelp:"با ایمیل تأییدشده وارد شوید. حساب‌های دارای تأیید دو مرحله‌ای باید از وب کلینیک وارد شوند.",
  verify:"حساب ایجاد شد. پیش از ورود ایمیل را تأیید کنید.",
  submit:"ادامه",checking:"بررسی دسترسی مصئون کلینیک…",
  signupHint:"رمز عبور حداقل ۱۰ کاراکتر باشد.",signInError:"ورود ناموفق. رمز، تأیید ایمیل و اتصال را بررسی کنید.",
  signupError:"حساب ساخته نشد. فرم و اتصال را بررسی کنید.",
  authRequired:"برای ادامه به حساب کلینیک خود وارد شوید.",retry:"دوباره",
  noClinic:"کلینیک دندان خود را ثبت کنید",noClinicBody:"به عنوان مالک کلینیک ثبت‌نام کنید، پلن انتخاب کنید و جواز را برای بررسی بفرستید. داکتران دعوت‌شده می‌توانند وارد کلینیک موجود شوند.",
  createClinic:"ثبت کلینیک",openWeb:"وب کلینیک",
  workspace:"محیط کاری",overview:"نمای کلی",onboard:"ثبت کلینیک",team:"تیم و داکتران",
  settings:"حساب",signout:"خروج",switch:"تغییر محیط",
  selected:"کلینیک فعال",status:"حالت بررسی",owner:"مالک",manager:"مدیر",
  dentist:"داکتر",receptionist:"پذیرش",assistant:"دستیار",cashier:"صندوقدار",
  pending:"در انتظار بررسی مستقل",draft:"مسوده ذخیره شد",approved:"تأیید شده",
  today:"نوبت‌های امروز",week:"۷ روز آینده",activeDoctors:"داکتران دارای ساعت کاری",
  services:"خدمات فعال",chairs:"چوکی‌های فعال",openDays:"روزهای کاری",
  noData:"آمار زنده در دسترس نیست. نقش، شبکه یا تأیید کلینیک را بررسی کنید.",
  refresh:"دریافت معلومات",privacy:"معلومات کلینیک فقط در جلسات تأییدشده نمایش داده می‌شود.",
  start:"ثبت مسوده کلینیک",identity:"مشخصات کلینیک",plan:"پلن اشتراک",
  review:"بررسی و ذخیره",next:"بعدی",back:"بازگشت",save:"ذخیره مسوده",
  formHelp:"همان ثبت‌نام معتبر کلینیک در وب نیز استفاده می‌شود.",
  legalName:"نام رسمی ثبت‌شده",displayName:"نام نمایشی",
  clinicType:"نوع کلینیک",solo:"داکتر مستقل",office:"کلینیک دندان",
  specialty:"مرکز تخصصی",province:"ولایت",city:"شهر",district:"ناحیه (اختیاری)",
  address:"آدرس کامل",phone:"شماره تماس",licenseNumber:"شماره جواز (اختیاری)",
  plannedDentistCount:"تعداد تخمینی داکتران",
  expectedNote:"فقط برای برنامه‌ریزی است. داکتران واقعی جداگانه دعوت و تأیید می‌شوند.",
  billingPeriod:"دوره اشتراک",monthly:"ماهانه",annual:"سالانه",price:"افغانی",
  trial:"روزهای آزمایشی",staffLimit:"ظرفیت کارمندان",branches:"شعبه‌ها",
  noPlans:"پلن فعال موجود نیست. اتصال سرور را بررسی کنید.",
  planUnavailable:"یک پلن نشرشده را انتخاب کنید.",detailsInvalid:"فیلدهای ضروری را بررسی کنید.",
  reviewNotice:"این فقط مسوده است، نه کلینیک تأییدشده. پس از ذخیره در وب کلینیک جواز را آپلود کنید، معلومات را تأیید و برای بررسی ارسال کنید.",
  saved:"مسوده کلینیک ذخیره شد. جواز را در وب آپلود و درخواست را ارسال کنید.",
  setupTitle:"ثبت کلینیک را تکمیل کنید",setupIntro:"مسوده کلینیک تأییدشده نیست و اجازه نشر داکتر یا ارائه خدمات طبی را ندارد.",
  steps:"مراحل ضروری",license:"آپلود جواز و ارسال برای بررسی",
  invite:"دعوت کارمندان و تأیید اسناد داکتران",
  hours:"تنظیم ساعت کاری کلینیک و داکتر",
  offering:"تنظیم خدمات، چوکی‌ها و قوانین نوبت‌دهی",
  reviewHuman:"تأیید مستقل لازم است؛ ورود موبایل آن را دور نمی‌زند.",
  connectWeb:"ادامه ثبت‌نام در وب کلینیک",webMissing:"برای بازکردن وب در موبایل EXPO_PUBLIC_CLINIC_WEB_URL را تنظیم کنید. مسوده در سرور محفوظ است.",
  webSignIn:"برای وب ممکن است ورود جداگانه لازم باشد.",
  statusInfo:"عضویت و نقش کلینیک توسط سرور تعیین می‌شود.",
  emptyTeam:"تعداد داکتران پس از تنظیم ساعات کاری نمایش می‌یابد.",
  readOnly:"نمایش عملیات فقط خواندنی است. برای اقدامات از وب کلینیک استفاده کنید.",
  mfa:"برای کارهای حساس کارمندان تأیید دومرحله‌ای لازم است.",
  role:"نقش شما",emailLabel:"ایمیل حساب",secure:"جلسه مصئون",
  network:"اتصال قطع است یا سرور تنظیم نشده",unknown:"نامعلوم",
  chooseClinic:"انتخاب کلینیک",none:"هنوز کلینیکی نیست",newClinic:"ثبت جدید",
  planSummary:"پلن کلینیک",registered:"کلینیک ثبت‌شده",needLogin:"ایمیل را تأیید کنید و بعد وارد شوید."
 },
 "ps-AF":{
  eyebrow:"دندان‌لینک · د متخصصانو لپاره",title:"ستاسو کلینیک، منظم او خوندي.",
  intro:"د کلینیک مالکانو، ډاکټرانو او بلل شويو کارکوونکو خوندي ځای.",
  signin:"ننوتل",signup:"حساب جوړول",name:"بشپړ نوم",email:"برېښنالیک",
  password:"رمز",authHelp:"له تایید شوي ایمیل سره ننوځئ. د دوه پړاوه تایید حسابونه په خوندي وېب کې ننوځي.",
  verify:"حساب جوړ شو؛ مخکې له ننوتلو خپل ایمیل تایید کړئ.",
  submit:"دوام",checking:"د کلینیک خوندي لاسرسی کتل کېږي…",
  signupHint:"رمز باید لږ تر لږه لس توري ولري.",signInError:"ننوتل ناکام شول؛ رمز، ایمیل او شبکه وګورئ.",
  signupError:"حساب جوړ نشو. فورمه او شبکه وګورئ.",
  authRequired:"د دوام لپاره د کلینیک حساب ته ننوځئ.",retry:"بیا هڅه",
  noClinic:"خپل د غاښونو کلینیک ثبت کړئ",noClinicBody:"د مالک په توګه ثبت شئ، پلان وټاکئ او جواز د کتنې لپاره ولېږئ. بلل شوي ډاکټران موجود کلینیک ته ننوتلای شي.",
  createClinic:"کلینیک ثبتول",openWeb:"د کلینیک وېب",
  workspace:"کاري ځای",overview:"لنډیز",onboard:"ثبتول",team:"ډله او ډاکټران",
  settings:"حساب",signout:"وتل",switch:"کاري ځای بدلول",
  selected:"فعال کلینیک",status:"د کتنې حالت",owner:"مالک",manager:"مدیر",
  dentist:"ډاکټر",receptionist:"پذیرش",assistant:"مرستیال",cashier:"صندوقدار",
  pending:"خپلواکې کتنې ته منتظر",draft:"مسوده خوندي شوه",approved:"تایید شو",
  today:"د نن ملاقاتونه",week:"راتلونکې ۷ ورځې",activeDoctors:"د مهالویش لرونکي ډاکټران",
  services:"فعال خدمتونه",chairs:"فعالې څوکۍ",openDays:"کاري ورځې",
  noData:"ژوندي معلومات نشته؛ رول، شبکه یا تایید وګورئ.",
  refresh:"بیا ترلاسه کول",privacy:"شخصي معلومات یوازې په تایید شوي حساب کې ښکاري.",
  start:"د کلینیک مسوده جوړول",identity:"د کلینیک معلومات",plan:"د ګډون پلان",
  review:"کتنه او خوندي کول",next:"بل",back:"شاته",save:"مسوده خوندي کول",
  formHelp:"همدا تایید شوی فورم د کلینیک په وېب کې هم کارېږي.",
  legalName:"رسمي نوم",displayName:"څرګند نوم",
  clinicType:"د کلینیک ډول",solo:"خپلواک ډاکټر",office:"د غاښونو کلینیک",
  specialty:"تخصصي مرکز",province:"ولایت",city:"ښار",district:"ناحیه (اختیاري)",
  address:"بشپړه پته",phone:"تلیفون",licenseNumber:"د جواز شمېره (اختیاري)",
  plannedDentistCount:"د پلان شويو ډاکټرانو شمېر",
  expectedNote:"یوازې اټکل دی؛ رښتیني ډاکټران وروسته بلل او تایید کېږي.",
  billingPeriod:"د ګډون موده",monthly:"میاشتنی",annual:"کلنی",price:"افغانۍ",
  trial:"ازمایښتي ورځې",staffLimit:"د کارکوونکو ظرفیت",branches:"څانګې",
  noPlans:"فعال پلان نشته؛ د سرور اتصال وګورئ.",
  planUnavailable:"خپور شوی پلان وټاکئ.",detailsInvalid:"اړین معلومات سم کړئ.",
  reviewNotice:"دا یوازې مسوده ده، تایید شوی کلینیک نه دی. وروسته په وېب کې جواز پورته او د کتنې غوښتنه وکړئ.",
  saved:"د کلینیک مسوده خوندي شوه؛ جواز په وېب کې پورته او غوښتنه ولېږئ.",
  setupTitle:"د کلینیک ثبتول بشپړ کړئ",setupIntro:"مسوده تایید شوی کلینیک نه دی؛ د ناروغ د درملنې او عامه خپرولو اجازه نه لري.",
  steps:"اړین پړاوونه",license:"جواز پورته کول او د کتنې لپاره لېږل",
  invite:"ډله بلل او د ډاکټر اسناد تاییدول",
  hours:"د کلینیک او ډاکټرانو ساعتونه برابرول",
  offering:"خدمتونه، څوکۍ او د ملاقات اصول برابرول",
  reviewHuman:"خپلواک تایید اړین دی؛ موبایل دا شرط نه لرې کوي.",
  connectWeb:"په وېب کې ثبتول بشپړ کړئ",webMissing:"د موبایل لپاره EXPO_PUBLIC_CLINIC_WEB_URL تنظیم کړئ؛ مسوده په سرور کې خوندي ده.",
  webSignIn:"کېدای شي وېب ته جلا ننوتل اړین وي.",
  statusInfo:"رول او غړیتوب سرور ټاکي.",
  emptyTeam:"د ډاکټرانو شمېر د کاري ساعتونو له تنظیم وروسته ښکاري.",
  readOnly:"د عملیاتو ښودنه یوازې لوستل کېږي؛ د عمل لپاره وېب وکاروئ.",
  mfa:"حساس کارونه دوه پړاوه تایید غواړي.",
  role:"ستاسو رول",emailLabel:"د حساب ایمیل",secure:"خوندي ناسته",
  network:"اتصال نشته یا سرور نه دی تنظیم شوی",unknown:"نامعلوم",
  chooseClinic:"کلینیک وټاکئ",none:"کلینیک نشته",newClinic:"نوی ثبتول",
  planSummary:"د کلینیک پلان",registered:"ثبت شوی کلینیک",needLogin:"ایمیل تایید کړئ او بیا ننوځئ."
 }
} as const;

type JsonMethod="GET"|"POST"|"PATCH";
async function clinicRequest<T>(path:string,method:JsonMethod="GET",
 body?:unknown,token?:string|null,signal?:AbortSignal):Promise<{data:T;headers:Headers}>{
 if(!API)throw new ApiError(0,"API_NOT_CONFIGURED");
 if(!__DEV__&&!API.startsWith("https://"))throw new ApiError(0,"HTTPS_REQUIRED");
 if(!path.startsWith("/")||path.startsWith("//"))throw new ApiError(0,"INVALID_PATH");
 const timeout=new AbortController();
 const timer=setTimeout(()=>timeout.abort(),12000);
 const cancellation=()=>{
  if(signal?.aborted)timeout.abort();
 };
 signal?.addEventListener("abort",cancellation,{once:true});
 if(signal?.aborted)timeout.abort();
 try{
  const response=await fetch(API+path,{
   method,cache:"no-store",signal:timeout.signal,
   headers:{...nativeApiHeaders(API),
    ...(body!==undefined?{"Content-Type":"application/json"}:{}),
    ...(token?{Authorization:"Bearer "+token}:{})
   },
   ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  const data=await nativeJsonResponse<T>(response);
  return {data,headers:response.headers};
 }catch(error){
  if(error instanceof ApiError)throw error;
  throw new ApiError(0,"NETWORK_UNAVAILABLE");
 }finally{clearTimeout(timer);signal?.removeEventListener("abort",cancellation)}
}
const clinicStatus=(status:string,t:typeof i18n.en)=>status==="approved"?t.approved:
 status==="draft"?t.draft:status==="pending"?t.pending:status;
const safeWeb=()=>Boolean(CLINIC_WEB&&
 (CLINIC_WEB.startsWith("https://")||__DEV__&&CLINIC_WEB.startsWith("http://")));
function Card({children}:{children:React.ReactNode}){return <View style={st.card}>{children}</View>}
function SectionTitle({text,hint}:{text:string;hint?:string}){return <View style={st.sectionHead}>
 <Text style={st.sectionTitle}>{text}</Text>{hint&&<Text style={st.body}>{hint}</Text>}
 </View>}
function Action({text,onPress,secondary=false,disabled=false,icon}:{text:string;onPress:()=>void;
 secondary?:boolean;disabled?:boolean;icon?:PatientIconName}){
 return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
  accessibilityState={{disabled}}
  style={({pressed})=>[st.action,secondary&&st.actionSecondary,disabled&&st.actionDisabled,
   pressed&&st.actionPressed]}>
  {icon&&<PatientIcon name={icon} size={19} color={secondary?"#1b5b89":"#fff"}/>}
  <Text style={[st.actionText,secondary&&st.actionSecondaryText]}>{text}</Text>
 </Pressable>;
}
function Input({label,value,onChange,keyboardType,secret=false,required=true}:{
 label:string;value:string;onChange:(text:string)=>void;keyboardType?:"email-address"|"phone-pad"|"numeric";
 secret?:boolean;required?:boolean}){
 return <View style={st.inputWrap}>
  <Text style={st.fieldLabel}>{label}{required?" *":""}</Text>
  <TextInput style={st.input} value={value} onChangeText={onChange}
   keyboardType={keyboardType||"default"} autoCapitalize={keyboardType==="email-address"?"none":"sentences"}
   autoCorrect={false} secureTextEntry={secret} maxLength={secret?100:250}
   placeholder={label} placeholderTextColor="#95a9b9"
   accessibilityLabel={label}/>
 </View>;
}
function SwitchChips<T extends string>({items,value,onChange}:{
 items:{value:T;label:string}[];value:T;onChange:(v:T)=>void}){
 return <View style={st.chips}>{items.map(item=>
  <Pressable key={item.value} onPress={()=>onChange(item.value)}
   accessibilityRole="button" accessibilityState={{selected:value===item.value}}
   style={[st.chip,value===item.value&&st.chipActive]}>
   <Text style={[st.chipText,value===item.value&&st.chipTextActive]}>{item.label}</Text>
  </Pressable>)}</View>;
}
function Metric({name,value}:{name:string;value:number|string}){
 return <View style={st.metric}><Text style={st.metricValue}>{value}</Text>
  <Text style={st.metricLabel}>{name}</Text></View>;
}

export function NativeClinicApp({onChangeWorkspace}:{onChangeWorkspace:()=>void}){
 const [locale,setLocale]=useState<Locale>("fa-AF");
 const t=i18n[locale],rtl=locale!=="en";
 const [boot,setBoot]=useState(true),[busy,setBusy]=useState(false);
 const [token,setToken]=useState<string|null>(null);
 const tokenRef=useRef<string|null>(null),generation=useRef(0);
 const [context,setContext]=useState<NativeClinicContext|null>(null);
 const [authScreen,setAuthScreen]=useState<AuthScreen>("signin");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [message,setMessage]=useState(""),[error,setError]=useState("");
 const [tab,setTab]=useState<Tab>("overview");
 const [selected,setSelected]=useState<string|null>(null);
 const [records,setRecords]=useState<NativeClinicRecord[]>([]);
 const [plans,setPlans]=useState<ClinicPlan[]>([]);
 const [planId,setPlanId]=useState("");
 const [draft,setDraft]=useState<ClinicDraft>({...blankClinicDraft});
 const [stage,setStage]=useState(0);
 const [creatingNew,setCreatingNew]=useState(false);
 const [summary,setSummary]=useState<ClinicOperations|null>(null);
 const [appointments,setAppointments]=useState<ClinicAppointments|null>(null);
 const [dataIssue,setDataIssue]=useState(false),[working,setWorking]=useState(false);
 const [revision,setRevision]=useState(0);
 const active=context?.clinics.find(row=>row.clinicId===selected)||null;
 const owned=records.find(row=>row.id===selected)||null;

 const clearSession=useCallback(async()=>{
  generation.current++;tokenRef.current=null;
  setToken(null);setContext(null);setSelected(null);setRecords([]);
  setSummary(null);setAppointments(null);setPassword("");setCreatingNew(false);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(()=>{});
 },[]);

 const refreshSession=useCallback(async(session:string)=>{
  const id=generation.current;
  const [verify,profile]=await Promise.all([
   clinicRequest<{user:{id:string;emailVerified:boolean}|null}>(
    "/api/auth/get-session","GET",undefined,session),
   clinicRequest<unknown>("/v1/team/context","GET",undefined,session)
  ]);
  if(!verify.data?.user?.emailVerified)throw new ApiError(403,"EMAIL_VERIFICATION_REQUIRED");
  if(!validClinicContext(profile.data))throw new ApiError(502,"INVALID_CLINIC_CONTEXT");
  if(id!==generation.current||tokenRef.current!==session)return;
  setContext(profile.data);
  const next=profile.data.clinics;
  setSelected(before=>next.some(row=>row.clinicId===before)?before:(next[0]?.clinicId||null));
  setError("");
  // Only the owner receives their own clinic draft records; other staff may
  // read their authorized workspaces but cannot create fake memberships.
  void clinicRequest<{clinics:NativeClinicRecord[]}>(
   "/v1/clinics","GET",undefined,session
  ).then(res=>{
   if(id===generation.current&&tokenRef.current===session&&
    Array.isArray(res.data?.clinics))setRecords(res.data.clinics);
  }).catch(()=>{});
 },[]);

 // Each protected native action uses the current SecureStore-backed bearer.
 // Reject a response if the user signs out or switches sessions while loading.
 const phase20Request=useCallback(<T,>(path:string,method:JsonMethod="GET",
  body?:unknown,signal?:AbortSignal):Promise<T>=>{
  const bearer=tokenRef.current,session=generation.current;
  if(!bearer)return Promise.reject(new ApiError(401,"AUTH_REQUIRED"));
  return clinicRequest<T>(path,method,body,bearer,signal).then(value=>{
   if(session!==generation.current||tokenRef.current!==bearer||signal?.aborted)
    throw new ApiError(401,"SESSION_CHANGED");
   return value.data;
  });
 },[]);
 const reloadClinic=useCallback(async()=>{
  const bearer=tokenRef.current;
  if(bearer)await refreshSession(bearer);
 },[refreshSession]);

 useEffect(()=>{
  let live=true;
  void Promise.all([
   AsyncStorage.getItem(LOCALE_KEY).catch(()=>null),
   SecureStore.getItemAsync(TOKEN_KEY).catch(()=>null)
  ]).then(async([savedLocale,saved])=>{
   if(!live)return;
   if(savedLocale==="en"||savedLocale==="fa-AF"||savedLocale==="ps-AF")
    setLocale(savedLocale);
   if(!saved)return;
   generation.current++;const id=generation.current;
   tokenRef.current=saved;
   try{
    await refreshSession(saved);
    if(live&&id===generation.current)setToken(saved);
   }catch(e){
    if(live&&id===generation.current){
     if(e instanceof ApiError&&(e.status===401||e.status===403)){
      await clearSession();
     }else{
      setError(i18n[(savedLocale==="en"||savedLocale==="fa-AF"||savedLocale==="ps-AF")?
       savedLocale:"fa-AF"].network);
     }
    }
   }
  }).finally(()=>{if(live)setBoot(false)});
  return()=>{live=false};
 },[refreshSession,clearSession]);

 const loadPlans=useCallback(async()=>{
  try{
   const result=await clinicRequest<{plans:ClinicPlan[]}>("/v1/public/plans");
   const items=result.data?.plans;
   if(Array.isArray(items)){
    const valid=items.filter(row=>row&&typeof row.id==="string"&&
     typeof row.label==="string"&&typeof row.priceAfn==="number"&&
     Number.isFinite(row.priceAfn)&&Number.isSafeInteger(row.staffLimit)&&
     Number.isSafeInteger(row.branchLimit)&&Number.isSafeInteger(row.trialDays));
    setPlans(valid);
    setPlanId(current=>valid.some(row=>row.id===current)?current:valid[0]?.id||"");
   }
  }catch{setPlans([]);}
 },[]);
 useEffect(()=>{if(tab==="onboard"&&token)void loadPlans()},[tab,token,loadPlans]);

 // Never show another clinic's results while switching the selected clinic.
 useEffect(()=>{
  setSummary(null);setAppointments(null);setDataIssue(false);
  if(!token||!active||tab!=="overview")return;
  const controller=new AbortController();
  const cid=encodeURIComponent(active.clinicId);
  setWorking(true);
  const load=async()=>{
   const results=await Promise.allSettled([
    clinicRequest<unknown>("/v1/operations/clinics/"+cid+"/summary","GET",
     undefined,token,controller.signal),
    clinicRequest<unknown>("/v1/appointments/clinics/"+cid+"/overview","GET",
     undefined,token,controller.signal)
   ]);
   if(controller.signal.aborted)return;
   const ops=results[0].status==="fulfilled"?
    clinicHomeMetrics(results[0].value.data):null;
   const visits=results[1].status==="fulfilled"?
    clinicAppointmentMetrics(results[1].value.data):null;
   setSummary(ops);setAppointments(visits);
   setDataIssue(!ops||!visits);setWorking(false);
  };
  void load();
  return()=>{controller.abort()};
 },[active?.clinicId,token,tab,revision]);

 async function signIn(){
  setBusy(true);setError("");setMessage("");
  try{
   await clearSession();const id=generation.current;
   const signed=await clinicRequest<{twoFactorRedirect?:boolean}>(
    "/api/auth/sign-in/email","POST",{email:email.trim().toLowerCase(),password});
   if(signed.data?.twoFactorRedirect)throw new ApiError(403,"MFA_WEB_REQUIRED");
   const bearer=signed.headers.get("set-auth-token");
   if(!bearer)throw new ApiError(503,"TOKEN_MISSING");
   await SecureStore.setItemAsync(TOKEN_KEY,bearer);
   if(id!==generation.current){
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(()=>{});
    throw new ApiError(401,"SESSION_CHANGED");
   }
   tokenRef.current=bearer;setToken(bearer);
   await refreshSession(bearer);
   setPassword("");
  }catch(e){
   await clearSession();setError(e instanceof ApiError&&e.code==="MFA_WEB_REQUIRED"?
    t.authHelp:t.signInError);
  }finally{setBusy(false)}
 }
 async function signUp(){
  if(name.trim().length<2||password.length<10||!email.trim().includes("@")){
   setError(t.signupHint);return;
  }
  setBusy(true);setError("");setMessage("");
  try{
   const res=await clinicRequest<{user?:{id:string;email:string}}>("/api/auth/sign-up/email",
    "POST",{name:name.trim(),email:email.trim().toLowerCase(),password});
   if(!res.data?.user?.id)throw Error("BAD_SIGNUP");
   setPassword("");setMessage(t.verify);setAuthScreen("signin");
  }catch{setError(t.signupError)}finally{setBusy(false)}
 }
 async function signOut(){
  const previous=tokenRef.current;
  await clearSession();setTab("overview");setAuthScreen("signin");
  if(previous)void clinicRequest("/api/auth/sign-out","POST",{},previous).catch(()=>{});
 }
 async function changeWorkspace(){
  await signOut();onChangeWorkspace();
 }
 function update(field:keyof ClinicDraft,value:string){
  setDraft(before=>({...before,[field]:value}));
  if(error)setError("");
 }
 async function saveClinic(){
  let payload;
  try{payload=clinicRegistrationPayload(draft,planId)}
  catch{setError(t.detailsInvalid);return}
  if(!context||!token)return;
  setBusy(true);setError("");
  try{
   const response=await clinicRequest<{clinic:NativeClinicRecord}>(
    "/v1/clinics","POST",payload,token);
   if(!response.data?.clinic?.id)throw Error("INVALID_CREATED_CLINIC");
   await refreshSession(token);
   setSelected(response.data.clinic.id);
   setTab("onboard");setStage(0);setCreatingNew(false);
   setMessage(t.saved);
  }catch(e){
   setError(e instanceof ApiError&&e.status===409?
    t.detailsInvalid:t.network);
  }finally{setBusy(false)}
 }
 function openWeb(path="/clinic"){
  if(!safeWeb()){Alert.alert("DandanLink",t.webMissing);return;}
  void Linking.openURL(CLINIC_WEB+path).catch(()=>Alert.alert("DandanLink",t.network));
 }
 const changeLang=(lang:Locale)=>{setLocale(lang);
  void AsyncStorage.setItem(LOCALE_KEY,lang).catch(()=>{})};
 const steps=[t.identity,t.plan,t.review];

 if(boot)return <SafeAreaView style={st.loading}>
  <StatusBar barStyle="dark-content"/><ActivityIndicator size="large" color="#165f9c"/>
  <Text style={st.body}>{t.checking}</Text>
 </SafeAreaView>;

 return <SafeAreaView style={st.root} edges={["top","bottom","left","right"]}>
  <StatusBar backgroundColor="#122e47" barStyle="light-content"/>
  <View style={st.header}>
   <View style={st.brandIcon}><PatientIcon name="tooth" size={24} color="#fff"/></View>
   <View style={st.brandCopy}><Text style={st.brandTitle}>DandanLink</Text>
    <Text numberOfLines={1} style={st.brandSubtitle}>{t.workspace}</Text></View>
   <Pressable accessibilityRole="button" onPress={()=>{void changeWorkspace()}}
    style={st.headerButton}><PatientIcon name="home" size={19} color="#e1effa"/>
    <Text style={st.headerButtonText}>{t.switch}</Text></Pressable>
  </View>
  <ScrollView key={token?(tab+":"+(selected||"none")):"auth"}
   style={{flex:1}} keyboardShouldPersistTaps="handled"
   keyboardDismissMode="on-drag" contentContainerStyle={st.content}>
   <View style={[st.topLine,{flexDirection:rtl?"row-reverse":"row"}]}>
    <Text style={st.topEyebrow}>{t.eyebrow}</Text>
    <View style={st.langRow}>
     {(["en","fa-AF","ps-AF"] as const).map(lang=>
      <Pressable key={lang} onPress={()=>changeLang(lang)}
       accessibilityRole="button" accessibilityState={{selected:locale===lang}}
       style={[st.langItem,lang===locale&&st.langItemActive]}>
       <Text style={[st.langItemText,lang===locale&&st.langItemTextActive]}>
        {lang==="en"?"EN":lang==="fa-AF"?"دری":"پښتو"}</Text>
      </Pressable>)}
    </View>
   </View>
   {!token?<View style={st.guest}>
    <Text style={[st.heroTitle,{textAlign:rtl?"right":"left"}]}>{t.title}</Text>
    <Text style={[st.heroSub,{textAlign:rtl?"right":"left"}]}>{t.intro}</Text>
    <Card>
     <SwitchChips value={authScreen} onChange={setAuthScreen} items={[
      {value:"signin",label:t.signin},{value:"signup",label:t.signup}]}/>
     <SectionTitle text={authScreen==="signin"?t.signin:t.signup} hint={t.authHelp}/>
     {authScreen==="signup"&&<Input label={t.name} value={name} onChange={setName}/>}
     <Input label={t.email} value={email} onChange={setEmail} keyboardType="email-address"/>
     <Input label={t.password} value={password} onChange={setPassword} secret/>
     {authScreen==="signup"&&<Text style={st.caption}>{t.signupHint}</Text>}
     {error!==""&&<Text style={st.error} accessibilityRole="alert">{error}</Text>}
     {message!==""&&<Text style={st.success}>{message}</Text>}
     <Action text={busy?t.checking:authScreen==="signin"?t.signin:t.signup}
      onPress={()=>{void (authScreen==="signin"?signIn():signUp())}} disabled={busy}/>
    </Card>
    <View style={st.note}><PatientIcon name="shield" size={18} color="#1d7399"/>
     <Text style={st.noteText}>{t.privacy}</Text></View>
    <Action text={t.openWeb} icon="clinic" secondary onPress={()=>openWeb("/clinic/login")}/>
   </View>:
   <View style={{gap:17}}>
    <View style={st.welcome}>
     <Text style={st.welcomeEyebrow}>{t.workspace}</Text>
     <Text style={st.welcomeName}>{context?.name||t.workspace}</Text>
     <Text style={st.welcomeBody}>{active?.clinicName||t.noClinic}</Text>
     <View style={st.welcomeStripe}/>
    </View>
    {message!==""&&<Text style={st.success} accessibilityRole="alert">{message}</Text>}
    {error!==""&&<Text style={st.error} accessibilityRole="alert">{error}</Text>}
    {context&&context.clinics.length>1&&<Card>
     <Text style={st.fieldLabel}>{t.chooseClinic}</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
      {context.clinics.map(c=><Pressable key={c.clinicId}
       onPress={()=>{setSelected(c.clinicId);setMessage("");setError("");setTab("overview")}}
       accessibilityRole="button" accessibilityState={{selected:selected===c.clinicId}}
       style={[st.chip,c.clinicId===selected&&st.chipActive]}>
       <Text style={[st.chipText,c.clinicId===selected&&st.chipTextActive]}>
        {c.clinicName}</Text></Pressable>)}
     </ScrollView>
    </Card>}
    {tab==="onboard"&&(!active||creatingNew)?<View style={{gap:14}}>
     <View style={st.formHeader}>
      <SectionTitle text={t.noClinic} hint={t.formHelp}/>
      <View style={st.stepBar}>{steps.map((label,index)=>
       <View key={label} style={[st.stepPill,index===stage&&st.stepPillActive]}>
        <Text style={[st.stepPillText,index===stage&&st.stepPillTextActive]}>
         {index+1}. {label}</Text>
       </View>)}</View>
     </View>
     <Card>
      <SectionTitle text={steps[stage]}/>
      {stage===0&&<View style={{gap:14}}>
       <Input label={t.legalName} value={draft.legalName} onChange={v=>update("legalName",v)}/>
       <Input label={t.displayName} value={draft.displayName} onChange={v=>update("displayName",v)}/>
       <Text style={st.fieldLabel}>{t.clinicType} *</Text>
       <SwitchChips value={draft.clinicType} items={[
        {value:"solo",label:t.solo},{value:"office",label:t.office},
        {value:"specialty",label:t.specialty}]}
        onChange={v=>update("clinicType",v)}/>
       <Input label={t.province} value={draft.province} onChange={v=>update("province",v)}/>
       <Input label={t.city} value={draft.city} onChange={v=>update("city",v)}/>
       <Input label={t.district} value={draft.district} onChange={v=>update("district",v)} required={false}/>
       <Input label={t.address} value={draft.address} onChange={v=>update("address",v)}/>
       <Input label={t.phone} value={draft.phone} onChange={v=>update("phone",v)} keyboardType="phone-pad"/>
       <Input label={t.email} value={draft.email} onChange={v=>update("email",v)} keyboardType="email-address"/>
       <Input label={t.licenseNumber} value={draft.licenseNumber} onChange={v=>update("licenseNumber",v)} required={false}/>
       <Input label={t.plannedDentistCount} value={draft.plannedDentistCount}
        onChange={v=>update("plannedDentistCount",v)} keyboardType="numeric"/>
       <Text style={st.noteText}>{t.expectedNote}</Text>
      </View>}
      {stage===1&&<View style={{gap:11}}>
       <Text style={st.body}>{t.planSummary}</Text>
       {!plans.length?<Text style={st.error}>{t.noPlans}</Text>:plans.map(plan=>
        <Pressable key={plan.id} onPress={()=>setPlanId(plan.id)}
         accessibilityRole="button" accessibilityState={{selected:planId===plan.id}}
         style={[st.planCard,planId===plan.id&&st.planCardActive]}>
         <View style={st.planTop}><Text style={st.planName}>{plan.label}</Text>
          {planId===plan.id&&<PatientIcon name="check" size={22} color="#147c7a"/>}</View>
         <Text style={st.planPrice}>{plan.priceAfn.toLocaleString("en")} {t.price} / {plan.billingPeriod==="monthly"?t.monthly:t.annual}</Text>
         <Text style={st.caption}>{t.staffLimit}: {plan.staffLimit} · {t.branches}: {plan.branchLimit} · {t.trial}: {plan.trialDays}</Text>
        </Pressable>)}
      </View>}
      {stage===2&&<View style={{gap:13}}>
       {([[t.legalName,draft.legalName],[t.displayName,draft.displayName],
         [t.city,draft.city],[t.province,draft.province],
         [t.address,draft.address],[t.phone,draft.phone],
         [t.plannedDentistCount,draft.plannedDentistCount],
         [t.plan,plans.find(x=>x.id===planId)?.label||"—"]] as const).map(([label,value])=>
        <View key={label} style={st.reviewRow}><Text style={st.caption}>{label}</Text>
         <Text style={st.reviewValue}>{value}</Text></View>)}
       <View style={st.warn}><PatientIcon name="shield" color="#935e24" size={20}/>
        <Text style={st.warnText}>{t.reviewNotice}</Text></View>
      </View>}
      <View style={st.formActions}>
       {stage>0&&<Action text={t.back} onPress={()=>setStage(x=>x-1)} secondary/>}
       {stage<2?<Action text={t.next} onPress={()=>{
        if(stage===0&&clinicDraftErrors(draft).length){setError(t.detailsInvalid);return}
        if(stage===1&&!plans.some(x=>x.id===planId)){setError(t.planUnavailable);return}
        setError("");setStage(x=>x+1);
       }}/>:<Action text={busy?t.checking:t.save} disabled={busy}
        onPress={()=>{void saveClinic()}} icon="check"/>}
      </View>
     </Card>
    </View>:tab==="onboard"&&active?.role==="owner"&&token?
    <View style={{gap:14}}>
     <NativeClinicPhase20 key={active.clinicId} clinicId={active.clinicId}
      locale={locale} token={token} api={API} request={phase20Request}
      onRefresh={reloadClinic}/>
     <Action text={t.newClinic} secondary icon="plus"
      onPress={()=>{setCreatingNew(true);setDraft({...blankClinicDraft});setStage(0)}}/>
    </View>:
    tab==="onboard"&&active?<View style={{gap:14}}>
     <Card><SectionTitle text={t.setupTitle} hint={t.reviewHuman}/>
      <Text style={st.caption}>{t.statusInfo}</Text>
      <Action text={t.connectWeb} secondary onPress={()=>openWeb("/clinic/onboarding?clinic="+encodeURIComponent(active.clinicId))}/>
     </Card>
     <Action text={t.newClinic} secondary icon="plus"
      onPress={()=>{setCreatingNew(true);setDraft({...blankClinicDraft});setStage(0)}}/>
    </View>:!active?<View style={{gap:14}}>
     <Card><SectionTitle text={t.noClinic} hint={t.noClinicBody}/>
      <Action text={t.start} onPress={()=>{setTab("onboard");setStage(0);setError("");setMessage("")}} icon="plus"/>
      <Text style={st.caption}>{t.needLogin}</Text>
     </Card>
     <NativeInviteAcceptance locale={locale} request={phase20Request}
      onAccepted={reloadClinic}/>
    </View>:tab==="overview"?<View style={{gap:14}}>
     <Card>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.selected}</Text>
       <Text style={st.infoValue}>{active.clinicName}</Text></View>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.status}</Text>
       <Text style={st.infoValue}>{clinicStatus(active.clinicStatus,i18n.en)===i18n.en.approved?t.approved:
        active.clinicStatus==="draft"?t.draft:active.clinicStatus==="pending"?t.pending:
        active.clinicStatus}</Text></View>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.role}</Text>
       <Text style={st.infoValue}>{t[active.role]}</Text></View>
      {owned&&<View style={st.infoRow}>
       <Text style={st.infoLabel}>{t.plannedDentistCount}</Text>
       <Text style={st.infoValue}>{owned.plannedDentistCount}</Text>
      </View>}
     </Card>
     <SectionTitle text={t.overview} hint={t.readOnly}/>
     {working?<View style={st.center}><ActivityIndicator color="#165f9c"/></View>:
      <View style={st.metricGrid}>
       {appointments&&<><Metric name={t.today} value={appointments.todayTotal}/>
        <Metric name={t.week} value={appointments.weekTotal}/></>}
       {summary&&<><Metric name={t.activeDoctors} value={summary.metrics.scheduledDentists}/>
        <Metric name={t.services} value={summary.metrics.services}/>
        <Metric name={t.chairs} value={summary.metrics.chairs}/>
        <Metric name={t.openDays} value={summary.metrics.openDays}/></>}
      </View>}
     {!working&&dataIssue&&<Text style={st.warnText}>{t.noData}</Text>}
     <Action text={t.refresh} onPress={()=>setRevision(x=>x+1)} secondary icon="calendar"/>
     <Card><SectionTitle text={t.setupTitle} hint={t.setupIntro}/>
      <Action text={t.connectWeb} onPress={()=>openWeb("/clinic/onboarding?clinic="+encodeURIComponent(active.clinicId))} icon="clinic"/>
      <Text style={st.caption}>{t.webSignIn}</Text>
     </Card>
    </View>:tab==="team"?<View style={{gap:14}}>
     <Card><SectionTitle text={t.team} hint={t.expectedNote}/>
      {owned&&<Metric name={t.plannedDentistCount} value={owned.plannedDentistCount}/>}
      <Text style={st.body}>{t.emptyTeam}</Text>
      <Action text={t.connectWeb} icon="users" onPress={()=>openWeb("/clinic/staff?clinic="+encodeURIComponent(active.clinicId))}/>
     </Card>
     <Card><SectionTitle text={t.steps}/>
      {[t.invite,t.hours,t.offering].map((item,i)=>
       <View key={item} style={st.todoRow}><View style={st.todoCount}>
        <Text style={st.todoCountText}>{i+1}</Text></View>
        <Text style={st.todoText}>{item}</Text></View>)}
     </Card>
    </View>:<View style={{gap:14}}>
     <Card><SectionTitle text={t.setupTitle} hint={t.reviewHuman}/>
      {[t.license,t.invite,t.hours,t.offering].map((item,i)=>
       <View key={item} style={st.todoRow}><View style={st.todoCount}>
        <Text style={st.todoCountText}>{i+1}</Text></View>
        <Text style={st.todoText}>{item}</Text></View>)}
      <Action text={t.connectWeb} onPress={()=>openWeb("/clinic/onboarding?clinic="+encodeURIComponent(active.clinicId))}/>
      <Text style={st.caption}>{t.webSignIn}</Text>
     </Card>
     <Card><SectionTitle text={t.settings}/>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.role}</Text>
       <Text style={st.infoValue}>{t[active.role]}</Text></View>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.emailLabel}</Text>
       <Text style={st.infoValue}>{context?.email||t.unknown}</Text></View>
      <View style={st.infoRow}><Text style={st.infoLabel}>{t.secure}</Text>
       <Text style={st.infoValue}>{context?.mfaEnabled?"MFA":t.mfa}</Text></View>
      <Action text={t.signout} onPress={()=>{void signOut()}} secondary icon="user"/>
      <Action text={t.switch} onPress={()=>{void changeWorkspace()}} secondary icon="home"/>
     </Card>
    </View>}
   </View>}
  </ScrollView>
  {token&&context&&<View style={st.nav}>
   {([
    ["overview","home",t.overview],["onboard","plus",t.onboard],
    ["team","users",t.team],["settings","settings",t.settings]
   ] as [Tab,PatientIconName,string][]).map(([id,icon,label])=>
    <Pressable key={id} accessibilityRole="tab"
     accessibilityState={{selected:tab===id}} onPress={()=>{setTab(id);setError("");setMessage("")}}
     style={[st.navItem,tab===id&&st.navItemActive]}>
     <PatientIcon name={icon} size={21} color={tab===id?"#1a659c":"#688198"}/>
     <Text numberOfLines={1} style={[st.navText,tab===id&&st.navTextActive]}>{label}</Text>
    </Pressable>)}
  </View>}
 </SafeAreaView>;
}
const st=StyleSheet.create({
 root:{flex:1,backgroundColor:"#f1f5f9"},loading:{flex:1,justifyContent:"center",alignItems:"center",gap:13,backgroundColor:"#f1f5f9"},
 header:{flexDirection:"row",alignItems:"center",backgroundColor:"#122e47",paddingHorizontal:18,
  paddingVertical:14,gap:10,minHeight:65},
 brandIcon:{width:38,height:38,borderRadius:12,backgroundColor:"#236ba3",alignItems:"center",justifyContent:"center"},
 brandCopy:{flex:1},brandTitle:{fontSize:16,fontWeight:"900",color:"#fff"},
 brandSubtitle:{fontSize:10,color:"#aec6dd",marginTop:2},
 headerButton:{flexDirection:"row",gap:5,alignItems:"center",paddingHorizontal:9,paddingVertical:9,
  backgroundColor:"#21435f",borderRadius:10},
 headerButtonText:{fontSize:10,fontWeight:"800",color:"#e1effa"},
 content:{paddingHorizontal:18,paddingTop:21,paddingBottom:28,gap:16,maxWidth:740,alignSelf:"center",width:"100%"},
 topLine:{alignItems:"center",justifyContent:"space-between",gap:9},
 topEyebrow:{fontSize:10,color:"#3d7096",fontWeight:"900",letterSpacing:.45,flex:1},
 langRow:{flexDirection:"row",backgroundColor:"#e1ebf2",borderRadius:9,padding:3,gap:2},
 langItem:{borderRadius:7,paddingVertical:7,paddingHorizontal:8},
 langItemActive:{backgroundColor:"#fff"},langItemText:{fontSize:10,fontWeight:"800",color:"#70889c"},
 langItemTextActive:{color:"#245b85"},
 guest:{gap:17},heroTitle:{fontSize:31,fontWeight:"900",lineHeight:41,color:"#152d44"},
 heroSub:{fontSize:14,lineHeight:23,color:"#5d7386"},
 card:{borderWidth:1,borderColor:"#dce7ef",borderRadius:16,backgroundColor:"#fff",
  padding:17,gap:14,shadowColor:"#132f48",shadowOffset:{width:0,height:7},shadowOpacity:.045,shadowRadius:16,elevation:1},
 sectionHead:{gap:6},sectionTitle:{fontSize:19,fontWeight:"900",color:"#163450",lineHeight:27},
 body:{fontSize:12,color:"#647b8e",lineHeight:21},
 inputWrap:{gap:6},fieldLabel:{fontSize:12,fontWeight:"800",color:"#344f66"},
 input:{minHeight:48,borderWidth:1,borderColor:"#d3e1eb",borderRadius:10,
  paddingVertical:11,paddingHorizontal:13,color:"#163450",backgroundColor:"#f9fbfd",fontSize:14},
 chips:{flexDirection:"row",flexWrap:"wrap",gap:8},
 chip:{borderWidth:1,borderColor:"#d3e2ec",backgroundColor:"#f5f8fb",
  borderRadius:10,paddingVertical:10,paddingHorizontal:13},
 chipActive:{borderColor:"#2c74aa",backgroundColor:"#e9f3fc"},
 chipText:{color:"#567087",fontSize:11,fontWeight:"800"},
 chipTextActive:{color:"#185e96"},
 action:{backgroundColor:"#175e9e",borderRadius:11,paddingHorizontal:18,minHeight:49,
  flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9,flexGrow:1},
 actionText:{color:"#fff",fontSize:13,fontWeight:"900"},
 actionSecondary:{backgroundColor:"#eaf2f9",borderWidth:1,borderColor:"#cfdfea"},
 actionSecondaryText:{color:"#1b5b89"},actionDisabled:{opacity:.5},actionPressed:{opacity:.82},
 error:{borderRadius:10,padding:13,color:"#9c3b46",backgroundColor:"#fff1f2",
  borderWidth:1,borderColor:"#f5d0d5",fontSize:12,lineHeight:20},
 success:{borderRadius:10,padding:13,color:"#20694f",backgroundColor:"#eaf8ef",
  borderWidth:1,borderColor:"#c8e9d3",fontSize:12,lineHeight:20},
 caption:{fontSize:11,color:"#6f8295",lineHeight:19},
 note:{padding:14,borderRadius:12,backgroundColor:"#e7f4fb",flexDirection:"row",gap:9},
 noteText:{fontSize:11,color:"#56768f",lineHeight:20,flex:1},
 welcome:{backgroundColor:"#163c59",borderRadius:17,padding:20,gap:8,overflow:"hidden"},
 welcomeEyebrow:{color:"#93d5e2",fontSize:11,fontWeight:"900"},
 welcomeName:{color:"#fff",fontSize:23,fontWeight:"900"},
 welcomeBody:{color:"#c3d9e8",fontSize:13,lineHeight:19},
 welcomeStripe:{position:"absolute",right:0,top:0,width:7,height:"100%",backgroundColor:"#52bead"},
 infoRow:{minHeight:40,borderBottomWidth:1,borderColor:"#edf1f6",flexDirection:"row",
  gap:12,justifyContent:"space-between",alignItems:"center",paddingVertical:7},
 infoLabel:{fontSize:12,color:"#72899a",flex:1},
 infoValue:{fontSize:12,color:"#264763",fontWeight:"800",flex:1,textAlign:"right"},
 metricGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},
 metric:{width:"47%",flexGrow:1,minHeight:105,borderRadius:14,borderWidth:1,
  borderColor:"#dbe6ee",backgroundColor:"#fff",padding:15,gap:9},
 metricValue:{fontSize:25,fontWeight:"900",color:"#175e96"},
 metricLabel:{fontSize:11,color:"#648097",fontWeight:"700",lineHeight:18},
 formHeader:{gap:10},stepBar:{flexDirection:"row",flexWrap:"wrap",gap:7},
 stepPill:{borderRadius:10,backgroundColor:"#e6edf3",paddingVertical:10,paddingHorizontal:11},
 stepPillActive:{backgroundColor:"#155e9d"},
 stepPillText:{fontSize:11,fontWeight:"800",color:"#57728a"},stepPillTextActive:{color:"#fff"},
 planCard:{borderWidth:1,borderColor:"#d6e4ed",borderRadius:13,padding:15,gap:7,backgroundColor:"#f8fbfe"},
 planCardActive:{borderColor:"#1e90b3",backgroundColor:"#eefafd"},
 planTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 planName:{fontSize:14,fontWeight:"900",color:"#214b69"},
 planPrice:{fontSize:16,fontWeight:"900",color:"#155a92"},
 reviewRow:{borderBottomColor:"#e9eef4",borderBottomWidth:1,paddingVertical:7,gap:5},
 reviewValue:{color:"#254964",fontWeight:"800",fontSize:13},
 warn:{backgroundColor:"#fff7e9",borderColor:"#ecd9b8",borderWidth:1,
  borderRadius:12,padding:14,flexDirection:"row",alignItems:"flex-start",gap:10},
 warnText:{color:"#8a5e33",fontSize:12,lineHeight:21,flex:1},
 formActions:{flexDirection:"row",gap:8,flexWrap:"wrap",marginTop:5},
 center:{minHeight:110,alignItems:"center",justifyContent:"center"},
 todoRow:{flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,
  borderColor:"#edf2f6",paddingVertical:13},
 todoCount:{width:30,height:30,borderRadius:9,backgroundColor:"#eaf3fc",
  alignItems:"center",justifyContent:"center"},
 todoCountText:{color:"#245e8e",fontSize:12,fontWeight:"900"},
 todoText:{fontSize:12,lineHeight:20,color:"#415e73",flex:1},
 nav:{backgroundColor:"#fff",borderTopWidth:1,borderColor:"#dce5ee",
  flexDirection:"row",paddingHorizontal:8,paddingTop:7,paddingBottom:8,
  justifyContent:"space-around"},
 navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:5,
  borderRadius:11,paddingHorizontal:5,paddingVertical:7},
 navItemActive:{backgroundColor:"#edf5fc"},
 navText:{fontSize:10,fontWeight:"800",color:"#70869b"},
 navTextActive:{color:"#185e96"}
});
