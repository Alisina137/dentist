import React,{useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import {clinicDraftErrors,type ClinicDraft,type NativeClinicSpace} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 accountIdentity,canEditClinic,canSeeDeliveries,clinicUpdatePayload,
 deliverySummary,parseClinicSettings,parseDeliveries,parsePaymentReceipt,
 parsePlans,parseSessions,paymentPayload,savedPreferences,shortenDate,
 type Calendar,type ClinicSettings,type Deliveries,type Identity,
 type Language,type Plan,type SessionRow
} from "./native-clinic-phase27-model";

type Panel="account"|"notifications"|"clinic"|"subscription"|"security";
type Load="loading"|"ready"|"error"|"forbidden";
type Props={clinic:NativeClinicSpace;locale:Language;request:Phase20Request;
 onLocaleChange:(language:Language)=>void;onSignOut:()=>Promise<void>;
 onChangeWorkspace:()=>Promise<void>;onOpenWeb:(path:string)=>void;
 onReloadClinic:()=>Promise<void>};
const words={
 en:{
  overline:"CLINIC WORKSPACE · SETTINGS",title:"Your account & settings",
  subtitle:"Keep your profile, clinic communication, membership and active sessions under control.",
  account:"Preferences",notifications:"Notifications",clinic:"Clinic details",
  subscription:"Subscription",security:"Security",loading:"Loading secure records…",
  refresh:"Refresh",retry:"Retry",save:"Save changes",cancel:"Cancel",
  verified:"Verified account",notVerified:"Email not verified",
  profile:"Account profile",name:"Name",email:"Email",role:"Clinic role",
  language:"Language",english:"English",dari:"Dari",pashto:"Pashto",
  calendar:"Calendar preference",solar_hijri:"Solar Hijri",gregorian:"Gregorian",
  prefsNote:"Language and calendar preferences are stored on your account; the current appointment schedule always uses Kabul time.",
  prefsSaved:"Preferences updated and verified on server.",localeError:"Could not confirm preferences. Refresh before trying again.",
  mfa:"Two-factor authentication",mfaOn:"Enabled",mfaOff:"Not enabled",
  securityInfo:"Your own login sessions only. No other staff member's devices are shown.",
  sessions:"Active sessions",noneSessions:"No sessions returned.",
  created:"Created",expires:"Expires",lastSeen:"Updated",unknownDevice:"Unidentified device",
  revoke:"Sign out on all devices",reason:"Administrative reason (5–300 characters)",
  revokeHelp:"This immediately revokes all your account sessions, including the current phone.",
  confirmRevoke:"Confirm sign-out everywhere",confirmRevokeBody:"All active sessions of your account will be revoked. You must sign in again on every device.",
  acknowledge:"I understand every device will be signed out",
  ownSession:"This includes this app.",
  revokeUncertain:"Could not confirm remote session revocation. This phone will sign out locally; use the secure website to review other devices.",
  notificationsInfo:"Delivery monitoring only. Messages do not include patient identity or treatment details.",
  deliveryCenter:"Appointment delivery activity",deliveryMail:"Email gateway",
  deliverySms:"SMS gateway",deliveryPush:"Push gateway",
  configured:"Configured",notConfigured:"Not configured",
  notEnabled:"Not available",last100:"Most recent 100 delivery attempts",
  all:"All",queued:"Queued",sent:"Sent",failed:"Failed",skipped:"Skipped",
  noDelivery:"No notification records in this clinic.",attempts:"Attempts",
  noNoticePrefs:"Clinic-level notification preference editing is not enabled by the current API; delivery states are read-only.",
  notificationsWeb:"Notification settings on web",openWeb:"Open secure clinic website",
  start:"From",until:"To",prev:"Previous",next:"Next",page:"Page",
  adminOnly:"Only a clinic owner can edit these registered details.",
  clinicStatus:"Clinic verification status",revision:"Revision",editClinic:"Edit registered clinic",
  legalName:"Registered name",displayName:"Public name",clinicType:"Clinic type",
  solo:"Independent dentist",office:"Dental clinic",specialty:"Specialty center",
  province:"Province",city:"City",district:"District (optional)",
  address:"Complete address",phone:"Clinic phone",clinicEmail:"Clinic email",
  licenseNumber:"License number (optional)",plannedDentists:"Planned dentist count",
  clinicWarning:"Changing an approved clinic's registered details will return it to independent verification. This does not bypass license review.",
  verifyClinic:"Review & submit changes",clinicSaved:"Clinic changes saved. Review the clinic's verification status.",
  formInvalid:"Review all required clinic fields, email, phone and dentist count.",
  subscriptionStatus:"Subscription status",plan:"Current plan",
  price:"Price",staffLimit:"Staff capacity",branches:"Branches",
  trialEnds:"Trial ends",periodEnds:"Current period ends",grace:"Grace days",
  noSubscription:"No subscription has started. Complete clinic verification first.",
  invoices:"Payment requests",noInvoices:"No payment requests yet.",
  selectPlan:"Select published plan",evidence:"Payment evidence reference",
  requestPayment:"Submit payment evidence for review",
  paymentWarning:"Submitting a reference does not charge your account or activate a subscription. An authorized platform reviewer must verify the payment. Do not include passwords or card details.",
  receiptSaved:"Payment request recorded and pending independent review.",
  invoicePending:"An invoice is already awaiting review; do not submit another.",
  referenceInvalid:"Provide an existing valid payment evidence reference (5–160 characters).",
  checked:"Checked against server",network:"Some records could not be verified. Refresh to retry.",
  blocked:"The API denied this action. Check role, authentication, and clinic status.",
  conflict:"Your record changed or conflicts with another action. Refresh before retrying.",
  uncertain:"The result is unconfirmed. Refresh live records before attempting the operation again.",
  refreshRequired:"A write has an uncertain result. Check the current server state before retrying.",
  status:"Status",notAvailable:"Unavailable",review:"Pending review",
  signout:"Sign out",switch:"Switch workspace",access:"Account access",
  securityWeb:"Manage password / MFA on web",
  reload:"Refresh account",staffLimits:"Staff seat limits are enforced on the server.",
  privacy:"No patient or clinical details are stored by this settings screen.",
  confirmation:"Confirm this change?",confirm:"Confirm",ready:"Ready"
 },
 "fa-AF":{
  overline:"کلینیک · تنظیمات",title:"حساب و تنظیمات شما",
  subtitle:"پروفایل، اطلاعیه‌ها، اشتراک و نشست‌های امن را مدیریت کنید.",
  account:"ترجیحات",notifications:"اطلاعیه‌ها",clinic:"معلومات کلینیک",
  subscription:"اشتراک",security:"امنیت",loading:"دریافت معلومات مصئون…",
  refresh:"تازه‌سازی",retry:"تلاش دوباره",save:"ذخیره تغییرات",cancel:"لغو",
  verified:"حساب تأییدشده",notVerified:"ایمیل تأیید نشده",
  profile:"پروفایل حساب",name:"نام",email:"ایمیل",role:"نقش کلینیک",
  language:"زبان",english:"انگلیسی",dari:"دری",pashto:"پښتو",
  calendar:"تقویم دلخواه",solar_hijri:"هجری شمسی",gregorian:"میلادی",
  prefsNote:"زبان و تقویم در حساب ذخیره می‌شوند. ساعات کاری همواره به وقت کابل است.",
  prefsSaved:"ترجیحات در سرور ذخیره و تأیید شدند.",localeError:"ترجیحات تأیید نشد؛ تازه‌سازی کنید.",
  mfa:"تأیید دومرحله‌ای",mfaOn:"فعال",mfaOff:"غیرفعال",
  securityInfo:"فقط نشست‌های حساب خودتان، نه دستگاه‌های کارمندان.",
  sessions:"نشست‌های فعال",noneSessions:"هیچ نشستی موجود نیست.",
  created:"ساخته‌شده",expires:"انقضا",lastSeen:"آخرین به‌روزرسانی",
  unknownDevice:"دستگاه ناشناس",revoke:"خروج از تمام دستگاه‌ها",
  reason:"دلیل اداری (۵–۳۰۰ حرف)",
  revokeHelp:"همه نشست‌های حساب شما، حتی این موبایل، لغو می‌شوند.",
  confirmRevoke:"تأیید خروج همگانی",confirmRevokeBody:"تمام نشست‌های حساب شما لغو می‌شود؛ در همه دستگاه‌ها باید دوباره وارد شوید.",
  acknowledge:"می‌دانم تمام دستگاه‌ها خارج خواهند شد.",
  ownSession:"این اپ هم خارج می‌شود.",
  revokeUncertain:"لغو نشست‌های دیگر تأیید نشد. این موبایل خارج می‌شود؛ از وب مصئون سایر دستگاه‌ها را بررسی کنید.",
  notificationsInfo:"فقط وضعیت ارسال اطلاعیه؛ معلومات شخصی یا طبی مریضان نشان داده نمی‌شود.",
  deliveryCenter:"اطلاعیه‌های نوبت‌ها",deliveryMail:"سرویس ایمیل",
  deliverySms:"سرویس پیامک",deliveryPush:"سرویس پوش",
  configured:"تنظیم‌شده",notConfigured:"تنظیم نشده",
  notEnabled:"موجود نیست",last100:"آخرین ۱۰۰ تلاش ارسال",
  all:"همه",queued:"در صف",sent:"ارسال‌شده",failed:"ناموفق",skipped:"ردشده",
  noDelivery:"اطلاعیه‌ای ثبت نشده است.",attempts:"تلاش‌ها",
  noNoticePrefs:"ویرایش ترجیحات اطلاعیه در API فعلی فعال نیست؛ وضعیت ارسال فقط خواندنی است.",
  notificationsWeb:"اطلاعیه‌ها در وب",openWeb:"بازکردن وب مصئون",
  start:"شروع",until:"پایان",prev:"قبلی",next:"بعدی",page:"صفحه",
  adminOnly:"فقط مالک می‌تواند مشخصات ثبت‌شده کلینیک را ویرایش کند.",
  clinicStatus:"وضعیت تأیید کلینیک",revision:"نسخه",editClinic:"ویرایش کلینیک",
  legalName:"نام قانونی",displayName:"نام عمومی",clinicType:"نوع کلینیک",
  solo:"داکتر مستقل",office:"کلینیک دندان",specialty:"مرکز تخصصی",
  province:"ولایت",city:"شهر",district:"ولسوالی (اختیاری)",
  address:"آدرس کامل",phone:"شماره کلینیک",clinicEmail:"ایمیل کلینیک",
  licenseNumber:"شماره جواز (اختیاری)",plannedDentists:"تعداد پلان‌شده داکتران",
  clinicWarning:"تغییر معلومات کلینیک تأییدشده نیاز به بررسی مستقل مجدد دارد.",
  verifyClinic:"بازبینی و ذخیره",clinicSaved:"تغییرات ذخیره شد؛ وضعیت تأیید کلینیک را بررسی کنید.",
  formInvalid:"معلومات ضروری، ایمیل، شماره و تعداد داکتران را بررسی کنید.",
  subscriptionStatus:"وضعیت اشتراک",plan:"پلان فعلی",
  price:"قیمت",staffLimit:"ظرفیت کارمندان",branches:"شعبات",
  trialEnds:"پایان آزمایشی",periodEnds:"پایان دوره",grace:"روزهای مهلت",
  noSubscription:"اشتراکی آغاز نشده؛ تأیید کلینیک را تکمیل کنید.",
  invoices:"درخواست‌های پرداخت",noInvoices:"درخواست پرداخت موجود نیست.",
  selectPlan:"انتخاب پلان منتشرشده",evidence:"مرجع سند پرداخت",
  requestPayment:"ثبت سند پرداخت برای بررسی",
  paymentWarning:"ثبت مرجع پرداخت به معنی برداشت پول یا فعال‌سازی اشتراک نیست. بررسی مستقل ضروری است؛ رمز یا معلومات کارت ننویسید.",
  receiptSaved:"درخواست ثبت شد و منتظر بررسی است.",
  invoicePending:"فاکتور دیگری در حال بررسی است.",
  referenceInvalid:"مرجع معتبر پرداخت بین ۵ تا ۱۶۰ حرف بنویسید.",
  checked:"بررسی‌شده در سرور",network:"بعضی معلومات تأیید نشد؛ تازه‌سازی کنید.",
  blocked:"سرور اجازه نمی‌دهد؛ نقش یا وضعیت را بررسی کنید.",
  conflict:"معلومات تغییر کرده است؛ تازه‌سازی کنید.",
  uncertain:"نتیجه معلوم نیست؛ پیش از تکرار وضعیت سرور را بررسی کنید.",
  refreshRequired:"نتیجه تغییر نامعلوم است؛ دوباره وضعیت سرور را بررسی کنید.",
  status:"وضعیت",notAvailable:"موجود نیست",review:"در انتظار بررسی",
  signout:"خروج",switch:"تغییر محیط",access:"دسترسی حساب",
  securityWeb:"مدیریت رمز و تأیید دومرحله‌ای در وب",
  reload:"تازه‌سازی حساب",staffLimits:"محدودیت کارمندان در سرور بررسی می‌شود.",
  privacy:"معلومات طبی مریضان در این بخش ذخیره نمی‌شود.",
  confirmation:"آیا این تغییر انجام شود؟",confirm:"تأیید",ready:"آماده"
 },
 "ps-AF":{
  overline:"کلینیک · امستنې",title:"ستاسو حساب او امستنې",
  subtitle:"پېژند، خبرتیاوې، ګډون او خوندي ناستې سمبال کړئ.",
  account:"غوره توبونه",notifications:"خبرتیاوې",clinic:"د کلینیک معلومات",
  subscription:"ګډون",security:"امنیت",loading:"خوندي معلومات راوړل کېږي…",
  refresh:"تازه کول",retry:"بیا هڅه",save:"بدلون خوندي کول",cancel:"لغوه",
  verified:"تایید شوی حساب",notVerified:"ایمیل نه دی تایید شوی",
  profile:"د حساب پېژند",name:"نوم",email:"برېښنالیک",role:"د کلینیک رول",
  language:"ژبه",english:"انګلیسي",dari:"دري",pashto:"پښتو",
  calendar:"کالیزه",solar_hijri:"لمریز هجري",gregorian:"میلادي",
  prefsNote:"ژبه او کالیزه ستاسو په حساب کې ساتل کېږي؛ کاري وختونه د کابل له مخې دي.",
  prefsSaved:"غوره توبونه په سرور کې خوندي شول.",localeError:"غوره توب نه دی تایید شوی؛ بیا یې وګورئ.",
  mfa:"دوه پړاوه تایید",mfaOn:"فعال",mfaOff:"غیرفعال",
  securityInfo:"یوازې ستاسو ناستې ښودل کېږي، د نورو کارکوونکو وسیلې نه دي.",
  sessions:"فعالې ناستې",noneSessions:"ناستې نه شته.",
  created:"جوړ شوی",expires:"پای",lastSeen:"وروستی بدلون",
  unknownDevice:"نامعلومه وسیله",revoke:"له ټولو وسیلو وتل",
  reason:"اداري دلیل (۵–۳۰۰ توري)",
  revokeHelp:"ستاسو ټولې ناستې، آن د دې موبایل ناسته، لغوه کېږي.",
  confirmRevoke:"د ټولو وسیلو وتل تایید کړئ",
  confirmRevokeBody:"په ټولو وسیلو کې به بیا ننوتلو ته اړتیا ولرئ.",
  acknowledge:"پوهېږم چې ټولې وسیلې به ووځي.",
  ownSession:"دا اپ هم وځي.",
  revokeUncertain:"د نورو وسیلو د وتلو پایله معلومه نه ده. دا موبایل وځي؛ نورې ناستې په وېب کې وګورئ.",
  notificationsInfo:"یوازې د خبرتیاوو د لېږلو حالت؛ د ناروغانو شخصي معلومات نه ښیي.",
  deliveryCenter:"د لیدنو خبرتیاوې",deliveryMail:"د ایمیل خدمت",
  deliverySms:"SMS خدمت",deliveryPush:"پوش خدمت",
  configured:"تنظیم شوی",notConfigured:"نه دی تنظیم شوی",
  notEnabled:"شتون نه لري",last100:"وروستۍ ۱۰۰ هڅې",
  all:"ټول",queued:"په کتار کې",sent:"لېږل شوي",failed:"ناکام",skipped:"نه لېږل شوي",
  noDelivery:"خبرتیا نه شته.",attempts:"هڅې",
  noNoticePrefs:"په اوسني API کې د کلینیک د خبرتیاوو غوره توبونه نه شي بدلولای.",
  notificationsWeb:"خبرتیاوې په وېب کې",openWeb:"خوندي وېب پرانیزئ",
  start:"پیل",until:"پای",prev:"مخکینۍ",next:"راتلونکی",page:"پاڼه",
  adminOnly:"یوازې مالک ثبت شوي معلومات بدلولای شي.",
  clinicStatus:"د کلینیک تایید",revision:"نسخه",editClinic:"کلینیک سمول",
  legalName:"قانوني نوم",displayName:"عام نوم",clinicType:"د کلینیک ډول",
  solo:"خپلواک ډاکټر",office:"د غاښونو کلینیک",specialty:"تخصصي مرکز",
  province:"ولایت",city:"ښار",district:"ولسوالي (اختیاري)",
  address:"بشپړه پته",phone:"د کلینیک تلیفون",clinicEmail:"د کلینیک ایمیل",
  licenseNumber:"د جواز شمېره (اختیاري)",plannedDentists:"پلان شوي ډاکټران",
  clinicWarning:"د تایید شوي کلینیک معلومات بدلول بیا خپلواک تایید غواړي.",
  verifyClinic:"کتنه او خوندي کول",clinicSaved:"بدلون خوندي شو؛ د کلینیک تایید وګورئ.",
  formInvalid:"اړین معلومات، ایمیل، تلیفون او د ډاکټرانو شمېر وګورئ.",
  subscriptionStatus:"د ګډون حالت",plan:"اوسنی پلان",
  price:"بیه",staffLimit:"د کارکوونکو ظرفیت",branches:"څانګې",
  trialEnds:"د ازموینې پای",periodEnds:"د دورې پای",grace:"مهلت ورځې",
  noSubscription:"ګډون نه دی پیل شوی؛ د کلینیک تایید بشپړ کړئ.",
  invoices:"د پیسو غوښتنې",noInvoices:"د پیسو غوښتنه نشته.",
  selectPlan:"خپور شوی پلان وټاکئ",evidence:"د پیسو سند مرجع",
  requestPayment:"د پیسو مرجع د کتنې لپاره واستوئ",
  paymentWarning:"د پیسو مرجع لېږل د پیسو ایستل یا د ګډون فعالول نه دي. د خپلواک تایید اړتیا ده؛ پټنوم مه لیکئ.",
  receiptSaved:"غوښتنه ثبت شوه او د کتنې په تمه ده.",
  invoicePending:"بله غوښتنه تر کتنې لاندې ده.",
  referenceInvalid:"د پیسو سند مرجع ۵ تر ۱۶۰ توري وي.",
  checked:"د سرور له مخې",network:"ځینې معلومات نه دي تایید شوي؛ تازه یې کړئ.",
  blocked:"سرور اجازه نه ورکوي؛ رول او حالت وګورئ.",
  conflict:"معلومات بدل شوي؛ تازه یې کړئ.",
  uncertain:"پایله نامعلومه ده؛ له بیا هڅې مخکې سرور تازه کړئ.",
  refreshRequired:"د بدلون پایله نامعلومه ده؛ سرور بیا وګورئ.",
  status:"حالت",notAvailable:"شتون نه لري",review:"تر کتنې لاندې",
  signout:"وتل",switch:"کاري ځای بدلول",access:"د حساب لاسرسی",
  securityWeb:"پټنوم او دوه پړاوه تایید په وېب کې",
  reload:"حساب تازه کول",staffLimits:"د کارکوونکو محدودیت سرور ګوري.",
  privacy:"د ناروغ طبي معلومات دلته نه ساتل کېږي.",
  confirmation:"دا بدلون تایید کړئ؟",confirm:"تایید",ready:"چمتو"
 }
} as const;
type Words={ [K in keyof typeof words.en]:string };
const dateShort=shortenDate;
const filters=["all","queued","sent","failed","skipped"] as const;
type Filter=typeof filters[number];
function Badge({text,kind}:{text:string;kind?:"green"|"amber"|"red"}){
 return <View style={[styles.badge,kind==="green"&&styles.badgeGreen,
  kind==="amber"&&styles.badgeAmber,kind==="red"&&styles.badgeRed]}>
  <Text style={styles.badgeText}>{text}</Text></View>;
}
function Card({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){
 return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>
  {subtitle&&<Text style={styles.hint}>{subtitle}</Text>}{children}</View>;
}
function Btn({text,onPress,quiet=false,danger=false,disabled=false,icon}:{
 text:string;onPress:()=>void;quiet?:boolean;danger?:boolean;disabled?:boolean;icon?:PatientIconName}){
 return <Pressable accessibilityRole="button" disabled={disabled}
  accessibilityState={{disabled}} onPress={onPress}
  style={({pressed})=>[styles.button,quiet&&styles.buttonQuiet,
   danger&&styles.buttonDanger,disabled&&styles.disabled,pressed&&styles.pressed]}>
  {icon&&<PatientIcon name={icon} size={17} color={danger?"#a9444e":quiet?"#246b98":"#fff"}/>}
  <Text style={[styles.buttonText,quiet&&styles.buttonQuietText,danger&&styles.buttonDangerText]}>{text}</Text>
 </Pressable>;
}
function Chips<T extends string>({items,value,onChange,disabled=false}:{
 items:{id:T;label:string}[];value:T;onChange:(x:T)=>void;disabled?:boolean}){
 return <View style={styles.chips}>{items.map(x=><Pressable key={x.id}
  onPress={()=>onChange(x.id)} disabled={disabled} accessibilityRole="button"
  accessibilityState={{selected:x.id===value,disabled}}
  style={[styles.chip,value===x.id&&styles.chipOn,disabled&&styles.disabled]}>
  <Text style={[styles.chipText,value===x.id&&styles.chipTextOn]}>{x.label}</Text>
 </Pressable>)}</View>;
}
function Field({label,value,onChange,max=250,keyboard}:{
 label:string;value:string;onChange:(v:string)=>void;max?:number;
 keyboard?:"numeric"|"email-address"|"phone-pad"}){
 return <View style={styles.field}><Text style={styles.label}>{label}</Text>
  <TextInput accessibilityLabel={label} value={value} maxLength={max}
   style={styles.input} autoCorrect={false}
   autoCapitalize={keyboard==="email-address"?"none":"sentences"}
   keyboardType={keyboard||"default"} onChangeText={onChange}/></View>;
}
function Pair({name,value}:{name:string;value:string}){
 return <View style={styles.pair}><Text style={styles.pairName}>{name}</Text>
  <Text style={styles.pairValue}>{value}</Text></View>;
}
function errorText(err:unknown,t:Words){
 const status=err&&typeof err==="object"&&"status" in err?
  (err as {status:unknown}).status:null;
 if(status===401||status===403)return t.blocked;
 if(status===409||status===422||status===429)return t.conflict;
 return t.uncertain;
}
function showState(state:Load,t:Words){
 return state==="loading"?t.loading:state==="forbidden"?t.blocked:t.network;
}
export function NativeClinicPhase27({clinic,locale,request,onLocaleChange,
 onSignOut,onChangeWorkspace,onOpenWeb,onReloadClinic}:Props){
 const t=words[locale],owner=canEditClinic(clinic.role),manager=canSeeDeliveries(clinic.role);
 const [panel,setPanel]=useState<Panel>("account");
 const [account,setAccount]=useState<Identity|null>(null);
 const [sessions,setSessions]=useState<SessionRow[]|null>(null);
 const [delivery,setDelivery]=useState<Deliveries|null>(null);
 const [details,setDetails]=useState<ClinicSettings|null>(null);
 const [plans,setPlans]=useState<Plan[]|null>(null);
 const [loads,setLoads]=useState<Record<"account"|"security"|"notifications"|"clinic"|"plans",Load>>({
  account:"loading",security:"loading",notifications:"loading",clinic:"loading",plans:"loading"});
 const [prefLocale,setPrefLocale]=useState<Language>(locale);
 const [prefCalendar,setPrefCalendar]=useState<Calendar>("solar_hijri");
 const [clinicDraft,setClinicDraft]=useState<ClinicDraft|null>(null);
 const [editClinic,setEditClinic]=useState(false);
 const [selectedPlan,setSelectedPlan]=useState("");
 const [evidence,setEvidence]=useState("");
 const [filter,setFilter]=useState<Filter>("all");
 const [page,setPage]=useState(0);
 const [reason,setReason]=useState("");
 const [ack,setAck]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const [foreground,setForeground]=useState(!["inactive","background"].includes(AppState.currentState));
 const mounted=useRef(true),visible=useRef(true),revision=useRef(0);
 const endpoint="/v1/clinics/"+encodeURIComponent(clinic.clinicId);
 const notificationUrl="/v1/booking/clinics/"+encodeURIComponent(clinic.clinicId)+"/notifications";
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;revision.current++}},[]);
 const wipe=()=>{
  setAccount(null);setSessions(null);setDelivery(null);setDetails(null);setPlans(null);
  setPrefLocale(locale);setPrefCalendar("solar_hijri");setEditClinic(false);
  setClinicDraft(null);setEvidence("");setReason("");setAck(false);
  setError("");setSuccess("");setUncertain(false);setFilter("all");setPage(0);
 };
 useEffect(()=>{
  const sub=AppState.addEventListener("change",state=>{
   if(state==="active"){visible.current=true;setForeground(true);
    setRefreshKey(n=>n+1);
   }else{visible.current=false;setForeground(false);wipe();}
  });return()=>sub.remove();
 },[locale]);
 const refresh=()=>{
  if(busy)return;
  setUncertain(false);setError("");setSuccess("");setEditClinic(false);
  setClinicDraft(null);setEvidence("");setReason("");setAck(false);
  setPage(0);setRefreshKey(n=>n+1);
 };
 useEffect(()=>{
  if(!foreground)return;
  const ab=new AbortController(),gen=++revision.current;
  setAccount(null);setSessions(null);setDelivery(null);setDetails(null);setPlans(null);
  setLoads({account:"loading",security:"loading",notifications:manager?"loading":"forbidden",
   clinic:owner?"loading":"forbidden",plans:owner?"loading":"forbidden"});
  const requests=[
   request<unknown>("/v1/me","GET",undefined,ab.signal),
   request<unknown>("/v1/team/sessions","GET",undefined,ab.signal),
   ...(manager?[request<unknown>(notificationUrl,"GET",undefined,ab.signal)]:[]),
   ...(owner?[request<unknown>(endpoint,"GET",undefined,ab.signal),
    request<unknown>("/v1/public/plans","GET",undefined,ab.signal)]:[])
  ];
  void Promise.allSettled(requests).then(results=>{
   if(ab.signal.aborted||!mounted.current||!visible.current||gen!==revision.current)return;
   const take=(index:number,kind:keyof typeof loads,parse:(raw:unknown)=>any,apply:(item:any)=>void)=>{
    const entry=results[index];
    if(entry?.status==="fulfilled"){
     const value=parse(entry.value);
     if(value!==null){
      apply(value);setLoads(x=>({...x,[kind]:"ready"}));return;
     }
    }
    setLoads(x=>({...x,[kind]:"error"}));
   };
   take(0,"account",accountIdentity,(value:Identity)=>{
    setAccount(value);setPrefLocale(value.locale);setPrefCalendar(value.calendar);
   });
   take(1,"security",parseSessions,setSessions);
   if(manager)take(2,"notifications",parseDeliveries,setDelivery);
   if(owner){
    const i=manager?3:2;
    take(i,"clinic",(value:unknown)=>parseClinicSettings(value,clinic.clinicId),
     (value:ClinicSettings)=>{setDetails(value);setClinicDraft({...value.fields});});
    take(i+1,"plans",parsePlans,setPlans);
   }
  });
  return()=>{ab.abort();revision.current++};
 },[clinic.clinicId,request,refreshKey,manager,owner,foreground]);
 const statusOf=(name:keyof typeof loads)=>loads[name]==="ready";
 const switchPanel=(name:Panel)=>{
  if(busy||uncertain)return;
  if(name==="clinic"||name==="subscription"){if(!owner)return}
  if(name==="notifications"&&!manager)return;
  setPanel(name);setError("");setSuccess("");setPage(0);
  setEditClinic(false);setEvidence("");setReason("");setAck(false);
 };
 const mutate=async(path:string,method:"PUT"|"PATCH"|"POST",payload:unknown,
  check:(value:unknown)=>boolean,onSuccess:()=>Promise<void>|void,successCopy:string)=>{
  if(busy||uncertain||!visible.current||!mounted.current)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const value=await request<unknown>(path,method,payload);
   if(!mounted.current||!visible.current)return;
   if(!check(value))throw Error("UNVERIFIED_WRITE");
   await onSuccess();
   if(!mounted.current||!visible.current)return;
   setUncertain(false);setSuccess(successCopy);
   setRefreshKey(x=>x+1);
  }catch(e){
   if(mounted.current&&visible.current){
    setUncertain(true);setError(errorText(e,t));
   }
  }finally{if(mounted.current)setBusy(false)}
 };
 const savePrefs=()=>{
  if(!account||!statusOf("account")||!account.verified||
   !["en","fa-AF","ps-AF"].includes(prefLocale)||
   !["solar_hijri","gregorian"].includes(prefCalendar))return;
  const next=prefLocale,cal=prefCalendar;
  void mutate("/v1/me/preferences","PUT",{locale:next,calendar:cal},
   raw=>savedPreferences(raw,next,cal),()=>onLocaleChange(next),t.prefsSaved);
 };
 const updateClinicField=(key:keyof ClinicDraft,value:string)=>{
  setClinicDraft(d=>d?{...d,[key]:value}:d);setError("");
 };
 const saveClinic=()=>{
  if(!owner||!details||!clinicDraft||!statusOf("clinic"))return;
  if(clinicDraftErrors(clinicDraft).length){setError(t.formInvalid);return}
  let payload:ReturnType<typeof clinicUpdatePayload>;
  try{payload=clinicUpdatePayload(details,clinicDraft)}
  catch{setError(t.formInvalid);return}
  Alert.alert(t.verifyClinic,t.clinicWarning,[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,onPress:()=>{void mutate(endpoint,"PATCH",payload,
    raw=>typeof raw==="object"&&raw!==null&&"clinic" in raw&&
     (raw as {clinic?:{id?:string;revision?:number}}).clinic?.id===details.id&&
     Number((raw as {clinic?:{revision?:number}}).clinic?.revision)>details.revision,
    async()=>{setEditClinic(false);await onReloadClinic()},t.clinicSaved)}}
  ]);
 };
 const pendingInvoice=details?.invoices.some(x=>x.status==="awaiting")||false;
 const chosen=plans?.find(x=>x.id===selectedPlan)||
  plans?.find(x=>x.id===details?.plan?.id)||plans?.[0]||null;
 const requestPayment=()=>{
  if(!owner||!details||!plans||!chosen||pendingInvoice)return;
  const payload=paymentPayload(chosen.id,evidence,plans);
  if(!payload){setError(t.referenceInvalid);return}
  Alert.alert(t.requestPayment,t.paymentWarning+"\n"+chosen.label+
   " · "+chosen.priceAfn+" AFN",[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,onPress:()=>{void mutate(endpoint+"/subscription/request",
    "POST",payload,
    raw=>parsePaymentReceipt(raw,chosen)!==null,
    ()=>{setEvidence("");},t.receiptSaved)}}
  ]);
 };
 const revokeAll=()=>{
  if(!ack||reason.trim().length<5||reason.trim().length>300||busy)return;
  Alert.alert(t.confirmRevoke,t.confirmRevokeBody,[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,style:"destructive",onPress:()=>{
    // The server deletes all of the actor's session rows and audits it.
    // Local sign-out is mandatory on either confirmed or ambiguous outcome;
    // the latter must NEVER be presented as a confirmed global revocation.
    void (async()=>{
     setBusy(true);
     let confirmed=false;
     try{
      const raw=await request<unknown>("/v1/team/sessions/revoke","POST",
       {reason:reason.trim()});
      confirmed=Boolean(raw&&typeof raw==="object"&&
       (raw as {revoked?:unknown}).revoked===true);
     }catch{/* unknown outcome, still clear this device */}
     if(!confirmed)Alert.alert(t.security,t.revokeUncertain);
     await onSignOut();
    })();
   }}
  ]);
 };
 const summary=delivery?deliverySummary(delivery):null;
 const subset=useMemo(()=>delivery?.records.filter(x=>{
  const label=x.status==="pending"||x.status==="processing"?"queued":x.status;
  return filter==="all"||label===filter;
 })||[],[delivery,filter]);
 const totalPages=Math.max(1,Math.ceil(subset.length/10));
 const visiblePage=Math.min(page,totalPages-1);
 const viewRecords=subset.slice(visiblePage*10,(visiblePage+1)*10);
 const panels:{id:Panel;title:string;icon:PatientIconName}[]=[
  {id:"account",title:t.account,icon:"user"},
  ...(manager?[{id:"notifications" as Panel,title:t.notifications,icon:"bell" as PatientIconName}]:[]),
  ...(owner?[{id:"clinic" as Panel,title:t.clinic,icon:"clinic" as PatientIconName},
   {id:"subscription" as Panel,title:t.subscription,icon:"file" as PatientIconName}]:[]),
  {id:"security",title:t.security,icon:"shield"}
 ];
 const inputDisabled=busy||uncertain;
 return <View style={styles.root}>
  <View style={styles.hero}>
   <View style={styles.heroTop}><PatientIcon name="settings" size={19} color="#81dccd"/>
    <Text style={styles.heroOverline}>{t.overline}</Text></View>
   <Text style={styles.heroTitle}>{t.title}</Text>
   <Text style={styles.heroSub}>{t.subtitle}</Text>
   <Text style={styles.heroClinic}>{clinic.clinicName}</Text>
  </View>
  <View style={styles.actions}>
   <Btn quiet icon="clock" text={t.refresh} disabled={busy} onPress={refresh}/>
   <Btn quiet icon="shield" text={t.openWeb} onPress={()=>onOpenWeb(
    "/clinic/settings?clinic="+encodeURIComponent(clinic.clinicId))}/>
  </View>
  {error!==""&&<Text style={styles.error} accessibilityRole="alert">{error}</Text>}
  {success!==""&&<Text style={styles.success} accessibilityRole="alert">{success}</Text>}
  {uncertain&&<Text style={styles.warning}>{t.refreshRequired}</Text>}
  <View style={styles.nav}>{panels.map(({id,title,icon})=>
   <Pressable key={id} accessibilityRole="tab"
    accessibilityState={{selected:panel===id}} onPress={()=>switchPanel(id)}
    style={[styles.navButton,panel===id&&styles.navSelected]}>
    <PatientIcon name={icon} size={17} color={panel===id?"#fff":"#507990"}/>
    <Text style={[styles.navText,panel===id&&styles.navTextSelected]}>{title}</Text>
   </Pressable>)}</View>
  {panel==="account"&&<View style={styles.stack}>
   <Card title={t.profile} subtitle={t.prefsNote}>
    {!statusOf("account")||!account?<Text style={styles.hint}>{showState(loads.account,t)}</Text>:
     <View style={styles.stack}>
      <View style={styles.person}>
       <View style={styles.avatar}><Text style={styles.avatarLetter}>
        {(account.name||"?").slice(0,1).toUpperCase()}</Text></View>
       <View style={{flex:1,gap:6}}><Text style={styles.personName}>{account.name}</Text>
        <Text style={styles.personEmail}>{account.email}</Text></View>
        <Badge kind={account.verified?"green":"amber"}
         text={account.verified?t.verified:t.notVerified}/>
      </View>
      <Pair name={t.role} value={clinic.role}/>
      <Pair name={t.mfa} value={account.twoFactorEnabled?t.mfaOn:t.mfaOff}/>
      <Text style={styles.label}>{t.language}</Text>
      <Chips value={prefLocale} onChange={setPrefLocale} disabled={inputDisabled}
       items={[{id:"en",label:t.english},{id:"fa-AF",label:t.dari},
        {id:"ps-AF",label:t.pashto}]}/>
      <Text style={styles.label}>{t.calendar}</Text>
      <Chips value={prefCalendar} onChange={setPrefCalendar} disabled={inputDisabled}
       items={[{id:"solar_hijri",label:t.solar_hijri},
        {id:"gregorian",label:t.gregorian}]}/>
      <Btn text={t.save} icon="check" onPress={savePrefs}
       disabled={inputDisabled||!account.verified||
        account.locale===prefLocale&&account.calendar===prefCalendar}/>
     </View>}
   </Card>
   <Card title={t.access} subtitle={t.securityInfo}>
    <Btn text={t.securityWeb} quiet icon="shield" onPress={()=>onOpenWeb(
     "/clinic/settings/security?clinic="+encodeURIComponent(clinic.clinicId))}/>
    <View style={styles.actions}>
     <Btn text={t.signout} quiet icon="user" onPress={()=>{void onSignOut()}}/>
     <Btn text={t.switch} quiet icon="home" onPress={()=>{void onChangeWorkspace()}}/>
    </View>
   </Card>
  </View>}
  {panel==="notifications"&&manager&&<View style={styles.stack}>
   <Card title={t.deliveryCenter} subtitle={t.notificationsInfo}>
    {!statusOf("notifications")||!delivery?
     <Text style={styles.hint}>{showState(loads.notifications,t)}</Text>:
     <View style={styles.stack}>
      <View style={styles.metrics}>
       {([[t.last100,summary?.total],[t.sent,summary?.sent],[t.queued,summary?.queued],
        [t.failed,summary?.failed]] as [string,number|undefined][])
        .map(([label,value])=><View key={label} style={styles.metric}>
         <Text style={styles.metricNumber}>{value??"—"}</Text>
         <Text style={styles.metricLabel}>{label}</Text></View>)}
      </View>
      <Pair name={t.deliveryMail} value={delivery.emailConfigured?t.configured:t.notConfigured}/>
      <Pair name={t.deliverySms} value={delivery.smsConfigured?t.configured:t.notEnabled}/>
      <Pair name={t.deliveryPush} value={delivery.pushConfigured?t.configured:t.notEnabled}/>
      <Text style={styles.hint}>{t.noNoticePrefs}</Text>
      <Chips value={filter} onChange={v=>{setFilter(v);setPage(0)}}
       items={filters.map(id=>({id,label:t[id]}))}/>
      {!viewRecords.length?<Text style={styles.empty}>{t.noDelivery}</Text>:
       viewRecords.map((row,i)=><View key={row.id+":"+i} style={styles.delivery}>
        <View style={styles.deliveryHead}>
         <Text style={styles.deliveryEvent}>{row.event.replace(/_/g," ")}</Text>
         <Badge text={t[row.status==="pending"||row.status==="processing"?"queued":row.status]}
          kind={row.status==="sent"?"green":row.status==="failed"?"red":"amber"}/>
        </View>
        <Text style={styles.hint}>{dateShort(row.createdAt)} · {t.attempts} {row.attemptCount}</Text>
        {row.sentAt&&<Text style={styles.hint}>{t.sent}: {dateShort(row.sentAt)}</Text>}
        {row.errorCode&&<Text style={styles.hint}>{row.errorCode}</Text>}
       </View>)}
      <View style={styles.actions}>
       <Btn text={t.prev} quiet disabled={visiblePage<=0}
        onPress={()=>setPage(p=>Math.max(0,p-1))}/>
       <Text style={styles.page}>{t.page} {visiblePage+1}/{totalPages}</Text>
       <Btn text={t.next} quiet disabled={visiblePage+1>=totalPages}
        onPress={()=>setPage(p=>p+1)}/>
      </View>
     </View>}
   </Card>
   <Btn text={t.notificationsWeb} quiet icon="bell" onPress={()=>onOpenWeb(
    "/clinic/settings/notifications?clinic="+encodeURIComponent(clinic.clinicId))}/>
  </View>}
  {panel==="clinic"&&owner&&<View style={styles.stack}>
   <Card title={t.editClinic} subtitle={t.clinicWarning}>
    {!statusOf("clinic")||!details||!clinicDraft?
     <Text style={styles.hint}>{showState(loads.clinic,t)}</Text>:
     <View style={styles.stack}>
      <Pair name={t.clinicStatus} value={details.status}/>
      <Pair name={t.revision} value={String(details.revision)}/>
      {!editClinic?<View style={styles.stack}>
       <Pair name={t.legalName} value={details.fields.legalName}/>
       <Pair name={t.displayName} value={details.fields.displayName}/>
       <Pair name={t.province} value={details.fields.province}/>
       <Pair name={t.city} value={details.fields.city}/>
       <Pair name={t.address} value={details.fields.address}/>
       <Pair name={t.phone} value={details.fields.phone}/>
       <Pair name={t.clinicEmail} value={details.fields.email}/>
       <Pair name={t.plannedDentists} value={details.fields.plannedDentistCount}/>
       <Btn text={t.editClinic} icon="settings"
        disabled={inputDisabled||!["draft","needs_info","rejected","approved"].includes(details.status)}
        onPress={()=>setEditClinic(true)}/>
      </View>:<View style={styles.stack}>
       {([
        ["legalName",t.legalName,120],["displayName",t.displayName,100],
        ["province",t.province,80],["city",t.city,80],
        ["district",t.district,80],["address",t.address,250],
        ["phone",t.phone,20],["email",t.clinicEmail,160],
        ["licenseNumber",t.licenseNumber,80],
        ["plannedDentistCount",t.plannedDentists,3]
       ] as [keyof ClinicDraft,string,number][]).map(([key,label,max])=>
        <Field key={key} label={label} value={clinicDraft[key]}
         max={max} keyboard={key==="phone"?"phone-pad":
          key==="email"?"email-address":key==="plannedDentistCount"?"numeric":undefined}
         onChange={v=>updateClinicField(key,v)}/>)}
       <Text style={styles.label}>{t.clinicType}</Text>
       <Chips value={clinicDraft.clinicType}
        onChange={v=>updateClinicField("clinicType",v)}
        items={[{id:"solo",label:t.solo},{id:"office",label:t.office},
         {id:"specialty",label:t.specialty}]}/>
       <Text style={styles.warning}>{t.clinicWarning}</Text>
       <Btn text={t.verifyClinic} icon="check" disabled={inputDisabled||
        clinicDraftErrors(clinicDraft).length>0} onPress={saveClinic}/>
       <Btn text={t.cancel} quiet disabled={busy} onPress={()=>{setEditClinic(false);
        setClinicDraft({...details.fields});setError("")}}/>
      </View>}
     </View>}
   </Card>
  </View>}
  {panel==="subscription"&&owner&&<View style={styles.stack}>
   <Card title={t.subscriptionStatus} subtitle={t.staffLimits}>
    {!statusOf("clinic")||!details?
     <Text style={styles.hint}>{showState(loads.clinic,t)}</Text>:
     <View style={styles.stack}>
      <Pair name={t.status} value={details.effectiveStatus}/>
      {details.subscription===null?<Text style={styles.warning}>{t.noSubscription}</Text>:
       <View style={styles.stack}>
        <Text style={styles.planName}>{details.plan?.label||t.notAvailable}</Text>
        <Pair name={t.price} value={(details.plan?.priceAfn??0)+" AFN"}/>
        <Pair name={t.staffLimit} value={String(details.plan?.staffLimit??"—")}/>
        <Pair name={t.branches} value={String(details.plan?.branchLimit??"—")}/>
        <Pair name={t.trialEnds} value={dateShort(details.subscription.trialEndsAt)}/>
        <Pair name={t.periodEnds} value={dateShort(details.subscription.currentPeriodEndsAt)}/>
        <Pair name={t.grace} value={String(details.plan?.graceDays??"—")}/>
       </View>}
     </View>}
   </Card>
   <Card title={t.invoices} subtitle={t.paymentWarning}>
    {!statusOf("clinic")||!details?<Text style={styles.hint}>{showState(loads.clinic,t)}</Text>:
     <View style={styles.stack}>
      {details.invoices.length===0?<Text style={styles.empty}>{t.noInvoices}</Text>:
       details.invoices.slice(0,25).map(row=><View key={row.id} style={styles.delivery}>
        <View style={styles.deliveryHead}><Text style={styles.itemTitle}>
         {row.amountAfn} AFN</Text>
         <Badge text={row.status} kind={row.status==="awaiting"?"amber":
          row.status==="approved"?"green":"red"}/></View>
        <Text style={styles.hint}>{dateShort(row.createdAt)}</Text>
       </View>)}
      {pendingInvoice&&<Text style={styles.warning}>{t.invoicePending}</Text>}
     </View>}
   </Card>
   {details&&statusOf("plans")&&plans&&details.subscription&&<Card
    title={t.requestPayment} subtitle={t.paymentWarning}>
    <Text style={styles.label}>{t.selectPlan}</Text>
    <Chips value={chosen?.id||""} disabled={inputDisabled||pendingInvoice}
     items={plans.filter(p=>p.active).map(p=>({
      id:p.id,label:p.label+" · "+p.priceAfn+" AFN / "+p.billingPeriod}))}
     onChange={setSelectedPlan}/>
    <Field label={t.evidence} max={160} value={evidence}
     onChange={setEvidence}/>
    <Btn text={t.requestPayment} icon="file"
     disabled={inputDisabled||pendingInvoice||!chosen||
      !paymentPayload(chosen.id,evidence,plans)} onPress={requestPayment}/>
   </Card>}
  </View>}
  {panel==="security"&&<View style={styles.stack}>
   <Card title={t.security} subtitle={t.securityInfo}>
    <View style={styles.secureBanner}>
     <PatientIcon name="shield" color="#197b76" size={22}/>
     <View style={{flex:1,gap:4}}><Text style={styles.itemTitle}>{t.mfa}</Text>
      <Text style={styles.hint}>{account?
       (account.twoFactorEnabled?t.mfaOn:t.mfaOff):t.loading}</Text></View>
    </View>
    <Btn text={t.securityWeb} quiet icon="shield" onPress={()=>onOpenWeb(
     "/clinic/settings/security?clinic="+encodeURIComponent(clinic.clinicId))}/>
   </Card>
   <Card title={t.sessions} subtitle={t.securityInfo}>
    {!statusOf("security")||!sessions?
     <Text style={styles.hint}>{showState(loads.security,t)}</Text>:
     sessions.length===0?<Text style={styles.empty}>{t.noneSessions}</Text>:
     sessions.map(row=><View key={row.id} style={styles.session}>
      <View style={styles.sessionTitle}>
       <PatientIcon name="phone" size={20} color="#246f95"/>
       <Text style={styles.sessionDevice} numberOfLines={2}>
        {row.userAgent||t.unknownDevice}</Text></View>
      <Text style={styles.hint}>{t.created}: {dateShort(row.createdAt)}</Text>
      <Text style={styles.hint}>{t.lastSeen}: {dateShort(row.updatedAt)}</Text>
      <Text style={styles.hint}>{t.expires}: {dateShort(row.expiresAt)}</Text>
     </View>)}
   </Card>
   <Card title={t.revoke} subtitle={t.revokeHelp}>
    <Field label={t.reason} max={300} value={reason}
     onChange={setReason}/>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:ack}}
     onPress={()=>setAck(v=>!v)} style={styles.checkRow}>
     <View style={[styles.checkbox,ack&&styles.checked]}>
      {ack&&<PatientIcon name="check" color="#fff" size={16}/>}
     </View><Text style={styles.checkText}>{t.acknowledge}</Text></Pressable>
    <Btn text={t.confirmRevoke} danger icon="shield"
     disabled={busy||!statusOf("security")||!ack||
      reason.trim().length<5||reason.trim().length>300} onPress={revokeAll}/>
    <Text style={styles.warning}>{t.ownSession}</Text>
   </Card>
  </View>}
  <Text style={styles.footer}>{t.privacy}</Text>
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:15},stack:{gap:13},hero:{borderRadius:19,backgroundColor:"#15334f",
  padding:20,gap:11},heroTop:{flexDirection:"row",gap:8,alignItems:"center"},
 heroOverline:{fontSize:10,fontWeight:"900",color:"#78dad1",letterSpacing:1},
 heroTitle:{color:"#fff",fontSize:25,fontWeight:"900",lineHeight:35},
 heroSub:{color:"#bdd6e9",fontSize:12,lineHeight:20},
 heroClinic:{paddingTop:10,borderTopWidth:1,borderTopColor:"#3a5974",
  color:"#dfeef5",fontSize:11,fontWeight:"800"},
 nav:{flexDirection:"row",gap:7,flexWrap:"wrap",backgroundColor:"#e8eff5",
  padding:6,borderRadius:14},
 navButton:{flexGrow:1,gap:5,minHeight:54,paddingHorizontal:8,paddingVertical:8,
  borderRadius:10,justifyContent:"center",alignItems:"center"},
 navSelected:{backgroundColor:"#1c6497"},navText:{fontSize:10,fontWeight:"800",
  color:"#51708a",textAlign:"center"},
 navTextSelected:{color:"#fff"},
 card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dbe7ef",
  padding:17,borderRadius:16,gap:13,shadowColor:"#163852",
  shadowOffset:{width:0,height:4},shadowOpacity:.05,shadowRadius:12,elevation:1},
 cardTitle:{fontSize:18,fontWeight:"900",color:"#20415e"},
 hint:{color:"#6d8598",fontSize:11,lineHeight:18},
 footer:{fontSize:10,color:"#70899a",textAlign:"center",paddingBottom:8},
 button:{minHeight:46,backgroundColor:"#206fa2",borderRadius:10,paddingVertical:12,
  paddingHorizontal:11,alignItems:"center",justifyContent:"center",flexGrow:1,
  flexDirection:"row",gap:7},
 buttonQuiet:{backgroundColor:"#ebf5fb",borderWidth:1,borderColor:"#cfe3ed"},
 buttonDanger:{backgroundColor:"#fff0f2",borderWidth:1,borderColor:"#f1cdd5"},
 buttonText:{color:"#fff",fontWeight:"900",fontSize:11,textAlign:"center"},
 buttonQuietText:{color:"#246b99"},buttonDangerText:{color:"#a84350"},
 actions:{flexDirection:"row",flexWrap:"wrap",gap:9,alignItems:"center"},
 pressed:{opacity:.83},disabled:{opacity:.43},
 badge:{borderRadius:9,paddingHorizontal:9,paddingVertical:7,backgroundColor:"#edf3f8",
  alignItems:"center",justifyContent:"center"},
 badgeGreen:{backgroundColor:"#e4f5ec"},badgeAmber:{backgroundColor:"#fff0d9"},
 badgeRed:{backgroundColor:"#fce7eb"},
 badgeText:{fontSize:9,fontWeight:"900",color:"#396881",textAlign:"center"},
 person:{flexDirection:"row",gap:11,alignItems:"center"},
 avatar:{width:48,height:48,borderRadius:13,backgroundColor:"#e1f1fb",
  alignItems:"center",justifyContent:"center"},
 avatarLetter:{fontSize:23,color:"#1c6798",fontWeight:"900"},
 personName:{fontSize:15,color:"#183c5a",fontWeight:"900"},
 personEmail:{fontSize:11,color:"#678096",flexShrink:1},
 label:{fontSize:12,color:"#3b5a72",fontWeight:"900"},
 field:{gap:7},input:{minHeight:45,borderWidth:1,borderColor:"#d5e5ef",
  borderRadius:10,backgroundColor:"#f8fbfd",paddingVertical:10,
  paddingHorizontal:12,color:"#214863",fontSize:13},
 chips:{flexDirection:"row",flexWrap:"wrap",gap:7},
 chip:{paddingVertical:11,paddingHorizontal:12,minHeight:41,borderRadius:10,
  borderColor:"#e0e9f0",borderWidth:1,backgroundColor:"#f6f9fc",justifyContent:"center"},
 chipOn:{borderColor:"#4e99c1",backgroundColor:"#e4f3fc"},
 chipText:{fontWeight:"800",fontSize:10,color:"#647f95"},
 chipTextOn:{color:"#1b6797"},
 pair:{flexDirection:"row",gap:10,justifyContent:"space-between",
  paddingBottom:11,borderBottomWidth:1,borderBottomColor:"#eaf0f4"},
 pairName:{fontSize:11,color:"#6f899c",flex:1},
 pairValue:{fontSize:11,color:"#235375",fontWeight:"900",flex:1,textAlign:"right"},
 metrics:{flexDirection:"row",gap:9,flexWrap:"wrap"},
 metric:{width:"47%",flexGrow:1,minHeight:91,padding:13,borderWidth:1,
  borderRadius:12,borderColor:"#e2ecf3",backgroundColor:"#f8fbfd",gap:10},
 metricNumber:{fontSize:24,fontWeight:"900",color:"#1f6d99"},
 metricLabel:{fontSize:10,color:"#6b8598",fontWeight:"800"},
 delivery:{borderWidth:1,borderColor:"#e5edf2",padding:12,borderRadius:11,
  backgroundColor:"#f7fafc",gap:8},
 deliveryHead:{flexDirection:"row",gap:10,alignItems:"center",justifyContent:"space-between"},
 deliveryEvent:{fontSize:11,color:"#245477",fontWeight:"900",flex:1},
 page:{fontSize:11,color:"#4a708b",fontWeight:"900"},
 empty:{fontSize:12,color:"#718ca0",padding:13,textAlign:"center"},
 warning:{fontSize:11,lineHeight:20,color:"#956329",borderRadius:10,
  padding:11,backgroundColor:"#fff5e8"},
 error:{fontSize:12,lineHeight:19,color:"#a04553",padding:12,
  borderRadius:11,backgroundColor:"#fff0f2"},
 success:{fontSize:12,lineHeight:19,color:"#197456",padding:12,
  borderRadius:11,backgroundColor:"#eaf7ef"},
 itemTitle:{fontSize:13,color:"#285575",fontWeight:"900"},
 planName:{fontSize:20,color:"#194b6d",fontWeight:"900"},
 secureBanner:{flexDirection:"row",gap:13,alignItems:"center",
  padding:13,backgroundColor:"#ebf8f4",borderRadius:10},
 session:{gap:7,backgroundColor:"#f8fbfc",borderWidth:1,
  borderColor:"#e4edf4",borderRadius:11,padding:13},
 sessionTitle:{flexDirection:"row",gap:8,alignItems:"center"},
 sessionDevice:{fontSize:12,fontWeight:"900",color:"#2a536e",flex:1},
 checkRow:{flexDirection:"row",gap:10,alignItems:"center",paddingVertical:9},
 checkbox:{width:26,height:26,borderRadius:7,borderWidth:1,
  borderColor:"#a6c3d4",alignItems:"center",justifyContent:"center"},
 checked:{backgroundColor:"#1b7b83"},
 checkText:{fontSize:12,color:"#3d5e75",fontWeight:"700",flex:1}
});
