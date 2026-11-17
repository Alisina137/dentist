import React,{useCallback,useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {ApiError} from "./api-error";
import {PatientIcon} from "./patient-icons";
import {clinicDraftErrors,clinicRegistrationPayload,
 type ClinicDraft,type ClinicPlan} from "./native-clinic-model";
import {
 validateClinicReview,nativeClinicReadiness,blankDentistDraft,dentistDraftIssues,
 dentistDraftPayload,credentialFormIssues,
 type NativeClinicReview,type NativeClinicReadiness,type DentistDraftNative,
 type DentistVerification
} from "./native-clinic-phase20-model";
import {pickClinicEvidence,uploadClinicLicense,credentialEvidence,
 CREDENTIAL_MAX_BYTES,type EvidenceFile} from "./native-clinic-evidence";

export type Phase20Locale="en"|"fa-AF"|"ps-AF";
export type Phase20Request=<T>(path:string,method?:"GET"|"POST"|"PATCH",
 body?:unknown,signal?:AbortSignal)=>Promise<T>;
const w={
 en:{
  title:"Clinic activation",helper:"Complete registration on your phone. A platform reviewer makes the final decision.",
  subtitle:"Real registration status",loading:"Checking live registration…",
  refresh:"Refresh verification",network:"Unable to load authorized clinic data. Retry.",
  status:"Review status",draft:"Draft",pending:"Under review",approved:"Approved",
  needs_info:"More information requested",rejected:"Rejected",suspended:"Suspended",
  progress:"Registration checklist",identity:"Clinic details",plan:"Subscription",
  license:"Clinic license",submitted:"Submitted for review",approvedStep:"Independent approval",
  complete:"Completed",action:"Action required",waiting:"Awaiting reviewer",
  evidence:"Private license evidence",evidenceHelp:"Select a PDF, PNG or JPEG document (maximum 2 MB). The file goes directly to the protected clinic API. Never upload patient records.",
  upload:"Choose & upload clinic license",uploadConfirm:"Upload this private clinic license?",
  cancel:"Cancel",confirm:"Upload",uploaded:"Saved private documents",
  noDocument:"No clinic license uploaded yet.",uploadSuccess:"License evidence saved securely.",
  uploadError:"Upload not confirmed. Refresh the documents before attempting again.",
  limited:"Only the clinic owner can submit official registration and license files.",
  attested:"I am authorized to register this clinic and confirm these details are accurate.",
  submit:"Submit clinic for independent review",submitConfirm:"Submit this clinic and license for independent verification? You cannot edit while review is pending.",
  submitSuccess:"Submission received. Independent review is pending.",
  reviewHistory:"Reviewer history",noReview:"No independent review decision yet.",
  reason:"Review note",canEdit:"Update clinic details",editHelp:"Changes to the clinic draft require a saved revision. No approval is granted by saving.",
  edit:"Edit clinic draft",save:"Save clinic changes",cancelEdit:"Cancel editing",
  editSaved:"Clinic draft updated.",planLabel:"Selected subscription",
  doctors:"Expected dentists (planning)",contact:"Clinic contact",
  reviewBlocked:"A clinic needs a saved plan and license before submission.",
  disabled:"Review is in progress. Editing and uploading are restricted.",
  rejectedRetry:"Review the decision and correct your draft, then resubmit.",
  invalid:"Check required name, address, contact, planned doctors (1–500), and published plan.",
  legalName:"Registered name",displayName:"Display name",clinicType:"Clinic type",
  solo:"Independent dentist",office:"Dental clinic",specialtyType:"Specialty center",
  province:"Province",city:"City",district:"District (optional)",address:"Complete address",
  phone:"Clinic phone",email:"Clinic email",licenseNumber:"License number (optional)",
  planMissing:"No active subscription plan available.",noApproval:"Independent approval cannot be granted on this screen.",
  dentistTitle:"Dentist credentials",dentistHelp:"Update your professional profile, then submit evidence for an independent credential review.",
  dentistName:"Professional display name",specialty:"Specialty",qualifications:"Qualifications",
  professionalLicense:"Professional license number",experience:"Experience (years)",
  biography:"Professional biography",profile:"Professional profile",saveDoctor:"Save professional profile",
  doctorSaved:"Professional profile saved. This does not verify credentials.",
  credential:"Professional credential evidence",credentialType:"Credential type",
  credentialNumber:"Credential number",validUntil:"Expiration date (YYYY-MM-DD)",
  chooseCredential:"Choose PDF / image (max 1.5 MB)",credentialPicked:"Selected document",
  credentialAttest:"I confirm the uploaded credential belongs to me and is authentic.",
  sendCredential:"Submit credential for verification",credentialConfirm:"Send these credentials to independent reviewers?",
  credentialSent:"Credential submitted; awaiting reviewer decision.",
  credentialPending:"Reviewer decision pending",credentialVerified:"Verified by reviewer",
  credentialNotVerified:"Not independently verified",verifiedNote:"A professional profile or license number alone does not establish verification.",
  credentialNeedProfile:"Save a professional profile with license number before submitting documents.",
  credentialError:"Credential review unavailable. Check your professional profile and clinic.",
  credentialInvalid:"Enter credential type, number, and a future expiration date.",
  staffTitle:"Dentists & invitations",staffSubtitle:"Actual server-authorized dentists and professional verification status.",
  invite:"Invite dentist",inviteEmail:"Doctor email address",
  inviteSent:"Invitation requested. The doctor must accept using their verified email.",
  inviteLocked:"Staff invitations require verified MFA and available subscription capacity.",
  noDentists:"No affiliated dentists yet. Invite a verified account.",
  verification:"Credential status",openWeb:"Open clinic web for MFA / advanced staff controls.",
  acceptTitle:"Have a staff invitation?",acceptHelp:"Sign in with the email that received the invitation; enter the secure token. The server assigns the role.",
  token:"Invitation token",preview:"Check invitation",accept:"Accept invitation",
  tokenInvalid:"Invitation is invalid, expired, or for another verified email.",
  joined:"Invitation accepted. Your clinic access has been refreshed.",
  invalidInvite:"An invitation must be received through a trusted clinic email. Do not share the token.",
  role:"Role",expiry:"Expires",unverified:"Not verified",none:"None",back:"Back",
  loginRequired:"Sign in as a verified clinic user.",notAllowed:"Not available for your role.",
  refreshTeam:"Refresh dentists"
 },
 "fa-AF":{
  title:"فعال‌سازی کلینیک",helper:"ثبت کلینیک را در موبایل تکمیل کنید. تصمیم نهایی با بررسی‌کنندهٔ مستقل است.",
  subtitle:"حالت واقعی ثبت",loading:"بررسی معلومات واقعی ثبت…",
  refresh:"بررسی دوباره",network:"معلومات مصئون کلینیک در دسترس نیست. دوباره تلاش کنید.",
  status:"حالت بررسی",draft:"مسوده",pending:"در حال بررسی",approved:"تأییدشده",
  needs_info:"معلومات بیشتر خواسته شده",rejected:"رد شده",suspended:"تعلیق شده",
  progress:"مراحل ثبت",identity:"مشخصات کلینیک",plan:"اشتراک",
  license:"جواز کلینیک",submitted:"ارسال برای بررسی",approvedStep:"تأیید مستقل",
  complete:"تکمیل",action:"اقدام لازم",waiting:"منتظر بررسی‌کننده",
  evidence:"سند خصوصی جواز",evidenceHelp:"PDF، PNG یا JPEG تا ۲ مگابایت انتخاب کنید. سند مستقیماً به سرور مصئون ارسال می‌شود؛ اسناد مریضان را آپلود نکنید.",
  upload:"انتخاب و آپلود جواز",uploadConfirm:"جواز خصوصی کلینیک آپلود شود؟",
  cancel:"لغو",confirm:"آپلود",uploaded:"اسناد ثبت‌شده",
  noDocument:"هنوز سند جواز موجود نیست.",uploadSuccess:"سند جواز به‌صورت مصئون ثبت شد.",
  uploadError:"آپلود تأیید نشد. پیش از تلاش مجدد فهرست اسناد را تازه کنید.",
  limited:"فقط مالک کلینیک می‌تواند اسناد جواز را ارسال کند.",
  attested:"من مجاز به ثبت این کلینیک هستم و صحت معلومات را تأیید می‌کنم.",
  submit:"ارسال کلینیک برای بررسی مستقل",submitConfirm:"کلینیک و جواز برای تأیید مستقل ارسال شود؟ در جریان بررسی ویرایش ممکن نیست.",
  submitSuccess:"درخواست ثبت شد؛ در انتظار بررسی مستقل است.",
  reviewHistory:"تاریخچهٔ بررسی",noReview:"هنوز تصمیم مستقل ثبت نشده.",
  reason:"یادداشت بررسی",canEdit:"ویرایش مشخصات کلینیک",editHelp:"ویرایش مسوده نیاز به ذخیره دارد؛ ذخیره تأیید محسوب نمی‌شود.",
  edit:"ویرایش مسوده",save:"ذخیره تغییرات",cancelEdit:"لغو ویرایش",
  editSaved:"مسوده کلینیک تغییر کرد.",planLabel:"پلن انتخاب‌شده",
  doctors:"داکتران تخمینی",contact:"تماس کلینیک",
  reviewBlocked:"برای ارسال، پلن و جواز ثبت‌شده لازم است.",
  disabled:"در حال بررسی؛ ویرایش و آپلود محدود است.",
  rejectedRetry:"دلیل تصمیم را ببینید، معلومات را تصحیح و دوباره ارسال کنید.",
  invalid:"نام، آدرس، تماس، تعداد داکتران (۱–۵۰۰) و پلن را بررسی کنید.",
  legalName:"نام رسمی",displayName:"نام نمایشی",clinicType:"نوع کلینیک",
  solo:"داکتر مستقل",office:"کلینیک دندان",specialtyType:"مرکز تخصصی",
  province:"ولایت",city:"شهر",district:"ناحیه (اختیاری)",address:"آدرس کامل",
  phone:"شماره تماس",email:"ایمیل کلینیک",licenseNumber:"شماره جواز (اختیاری)",
  planMissing:"پلن فعال موجود نیست.",noApproval:"تأیید مستقل در این صفحه انجام نمی‌شود.",
  dentistTitle:"اسناد داکتر",dentistHelp:"پروفایل مسلکی را ذخیره و اسناد را برای بررسی مستقل ارسال کنید.",
  dentistName:"نام مسلکی",specialty:"تخصص",qualifications:"تحصیلات",
  professionalLicense:"شماره جواز مسلکی",experience:"تجربه (سال)",biography:"معرفی مسلکی",
  profile:"پروفایل مسلکی",saveDoctor:"ذخیره پروفایل داکتر",
  doctorSaved:"پروفایل ذخیره شد، اما اسناد هنوز تأیید نشده‌اند.",
  credential:"سند حرفه‌ای",credentialType:"نوع سند",
  credentialNumber:"شماره سند",validUntil:"تاریخ اعتبار (YYYY-MM-DD)",
  chooseCredential:"انتخاب PDF یا عکس (حداکثر ۱٫۵ مگابایت)",credentialPicked:"سند انتخاب‌شده",
  credentialAttest:"تأیید می‌کنم که سند به من تعلق دارد و معتبر است.",
  sendCredential:"ارسال سند برای تأیید",credentialConfirm:"این سند به بررسی‌کنندهٔ مستقل ارسال شود؟",
  credentialSent:"سند ارسال شد؛ در انتظار تصمیم بررسی‌کننده.",
  credentialPending:"در انتظار بررسی",credentialVerified:"تأیید مستقل شده",
  credentialNotVerified:"تأیید مستقل نشده",verifiedNote:"نام یا شماره جواز به‌تنهایی تأیید مسلکی محسوب نمی‌شود.",
  credentialNeedProfile:"اول پروفایل و شماره جواز داکتر را ذخیره کنید.",
  credentialError:"بررسی سند ممکن نیست. پروفایل و عضویت کلینیک را بررسی کنید.",
  credentialInvalid:"نوع، شماره و تاریخ آیندهٔ سند را وارد کنید.",
  staffTitle:"داکتران و دعوت‌ها",staffSubtitle:"داکتران واقعی عضو کلینیک و حالت تأیید مستقل آنان.",
  invite:"دعوت داکتر",inviteEmail:"ایمیل داکتر",
  inviteSent:"دعوت درخواست شد. داکتر با ایمیل تأییدشده باید آن را قبول کند.",
  inviteLocked:"دعوت کارمندان به MFA و ظرفیت اشتراک نیاز دارد.",
  noDentists:"هنوز داکتر عضو نیست. حساب تأییدشده را دعوت کنید.",
  verification:"حالت اسناد",openWeb:"بازکردن وب برای MFA و تنظیمات پیشرفته",
  acceptTitle:"دعوت‌نامهٔ کارمندی دارید؟",acceptHelp:"با ایمیل دعوت‌شده وارد شوید و توکن را درج کنید. نقش را سرور تعیین می‌کند.",
  token:"توکن دعوت",preview:"بررسی دعوت",accept:"قبول دعوت",
  tokenInvalid:"دعوت نامعتبر، منقضی، یا مربوط ایمیل دیگری است.",
  joined:"دعوت پذیرفته شد؛ دسترسی کلینیک تازه شد.",
  invalidInvite:"توکن دعوت را با دیگران شریک نکنید.",role:"نقش",expiry:"انقضا",
  unverified:"تأیید نشده",none:"هیچ",back:"بازگشت",
  loginRequired:"با حساب تأییدشده وارد شوید.",notAllowed:"برای نقش شما موجود نیست.",
  refreshTeam:"تازه‌سازی داکتران"
 },
 "ps-AF":{
  title:"د کلینیک فعالول",helper:"د کلینیک ثبتول په موبایل کې بشپړ کړئ؛ خپلواک کتونکی پرېکړه کوي.",
  subtitle:"د ثبت رښتینی حالت",loading:"د ثبت معلومات کتل کېږي…",
  refresh:"بیا کتنه",network:"خوندي معلومات نشته. بیا هڅه وکړئ.",
  status:"د کتنې حالت",draft:"مسوده",pending:"تر کتنې لاندې",approved:"تایید شوی",
  needs_info:"نورو معلوماتو ته اړتیا",rejected:"رد شوی",suspended:"ځنډول شوی",
  progress:"د ثبت پړاوونه",identity:"د کلینیک معلومات",plan:"ګډون",
  license:"د کلینیک جواز",submitted:"کتنې ته لېږل",approvedStep:"خپلواک تایید",
  complete:"بشپړ",action:"اقدام ته اړتیا",waiting:"کتونکي ته انتظار",
  evidence:"د جواز شخصي سند",evidenceHelp:"PDF، PNG یا JPEG تر ۲ مېګابایټه. سند خوندي سرور ته لېږل کېږي؛ د ناروغانو سندونه مه پورته کوئ.",
  upload:"جواز غوره او پورته کول",uploadConfirm:"د کلینیک شخصي جواز پورته شي؟",
  cancel:"لغوه",confirm:"پورته کول",uploaded:"ثبت شوي اسناد",
  noDocument:"د جواز سند نشته.",uploadSuccess:"د جواز سند خوندي شو.",
  uploadError:"پورته کول نه دي تایید شوي. د بیا هڅې وړاندې اسناد بیا وګورئ.",
  limited:"یوازې د کلینیک مالک جواز سپارلای شي.",
  attested:"زه د دې کلینیک د ثبت اجازه لرم او معلومات سم بولم.",
  submit:"خپلواکې کتنې ته کلینیک لېږل",submitConfirm:"کلینیک او جواز کتنې ته ولېږل شي؟ د کتنې پر مهال بدلون نه شي کېدای.",
  submitSuccess:"غوښتنه ثبت شوه؛ خپلواکې کتنې ته انتظار دی.",
  reviewHistory:"د کتنې تاریخ",noReview:"خپلواکه پرېکړه نشته.",
  reason:"د کتنې یادښت",canEdit:"د کلینیک معلومات سمول",editHelp:"د مسودې بدلول خوندي کول غواړي؛ دا تایید نه دی.",
  edit:"مسوده سمول",save:"بدلونونه خوندي کول",cancelEdit:"بدلون لغوه",
  editSaved:"مسوده بدله شوه.",planLabel:"ټاکل شوی پلان",
  doctors:"پلان شوي ډاکټران",contact:"د کلینیک اړیکه",
  reviewBlocked:"د سپارلو لپاره پلان او جواز لازم دي.",
  disabled:"تر کتنې لاندې؛ بدلون محدود دی.",
  rejectedRetry:"د پرېکړې دلیل وګورئ، سمونه وکړئ او بیا یې ولېږئ.",
  invalid:"نوم، پته، اړیکه، ډاکټران (۱–۵۰۰) او پلان وګورئ.",
  legalName:"رسمي نوم",displayName:"ښکاره نوم",clinicType:"ډول",
  solo:"خپلواک ډاکټر",office:"د غاښونو کلینیک",specialtyType:"تخصصي مرکز",
  province:"ولایت",city:"ښار",district:"ناحیه (اختیاري)",address:"بشپړه پته",
  phone:"تلیفون",email:"برېښنالیک",licenseNumber:"د جواز شمېره (اختیاري)",
  planMissing:"فعال پلان نشته.",noApproval:"خپلواک تایید دلته نه کېږي.",
  dentistTitle:"د ډاکټر اسناد",dentistHelp:"مسلکي پېژندلیک خوندي او سند خپلواکې کتنې ته ولېږئ.",
  dentistName:"مسلکي نوم",specialty:"تخصص",qualifications:"زده کړې",
  professionalLicense:"مسلکي جواز",experience:"تجربه (کلونه)",biography:"مسلکي پېژندنه",
  profile:"مسلکي پېژندلیک",saveDoctor:"د ډاکټر پېژندلیک خوندي کول",
  doctorSaved:"پېژندلیک خوندي شو؛ اسناد لا تایید نه دي.",
  credential:"مسلکي سند",credentialType:"د سند ډول",
  credentialNumber:"د سند شمېره",validUntil:"د اعتبار نېټه (YYYY-MM-DD)",
  chooseCredential:"PDF یا انځور (تر ۱٫۵ مېګابایټه)",credentialPicked:"غوره شوی سند",
  credentialAttest:"تاییدوم چې سند زما دی او رښتینی دی.",
  sendCredential:"سند تایید ته لېږل",credentialConfirm:"دا سند خپلواک کتونکي ته ولېږل شي؟",
  credentialSent:"سند ولېږل شو؛ کتنې ته انتظار دی.",
  credentialPending:"کتنې ته انتظار",credentialVerified:"خپلواک تایید شوی",
  credentialNotVerified:"خپلواک تایید نه دی شوی",verifiedNote:"نوم او جواز یوازې مسلکي تایید نه ثابتوي.",
  credentialNeedProfile:"لومړی د جواز شمېرې سره پېژندلیک خوندي کړئ.",
  credentialError:"د سند حالت نشته؛ پېژندلیک او غړیتوب وګورئ.",
  credentialInvalid:"د سند ډول، شمېره او راتلونکې نېټه ولیکئ.",
  staffTitle:"ډاکټران او بلنې",staffSubtitle:"د کلینیک رښتیني ډاکټران او د تایید حالت.",
  invite:"ډاکټر بلل",inviteEmail:"د ډاکټر ایمیل",
  inviteSent:"بلنه غوښتل شوې؛ ډاکټر باید په خپل تایید شوي ایمیل ومني.",
  inviteLocked:"بلنې MFA او د ګډون ظرفیت غواړي.",
  noDentists:"لا ډاکټر غړی نشته. تایید شوی حساب راوبلئ.",
  verification:"د سند حالت",openWeb:"د MFA او پرمختللو تنظیماتو لپاره وېب",
  acceptTitle:"د کارکوونکي بلنه لرئ؟",acceptHelp:"په بلل شوي ایمیل ننوځئ او خوندي کوډ ولیکئ. رول سرور ټاکي.",
  token:"د بلنې کوډ",preview:"بلنه وګورئ",accept:"بلنه منل",
  tokenInvalid:"بلنه ناسمه، تېره یا د بل ایمیل ده.",
  joined:"بلنه ومنل شوه؛ د کلینیک لاسرسی تازه شو.",
  invalidInvite:"د بلنې کوډ مه شریکوئ.",role:"رول",expiry:"پای",
  unverified:"نه دی تایید شوی",none:"نشته",back:"شاته",
  loginRequired:"په تایید شوي حساب ننوځئ.",notAllowed:"دا ستاسو د رول لپاره نشته.",
  refreshTeam:"ډاکټران بیا ترلاسه کول"
 }
} as const;
const stateKey=(value:string):"draft"|"pending"|"approved"|"needs_info"|"rejected"|"suspended"|"unverified"=>
 ["draft","pending","approved","needs_info","rejected","suspended"].includes(value)?
 value as "draft"|"pending"|"approved"|"needs_info"|"rejected"|"suspended":"unverified";
export function NativePhase20Button({label,onPress,disabled=false,quiet=false}:{
 label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean
}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}}
  disabled={disabled} onPress={onPress}
  style={({pressed})=>[s.button,quiet&&s.buttonQuiet,
    disabled&&s.buttonDisabled,pressed&&s.pressed]}>
  <Text style={[s.buttonText,quiet&&s.buttonQuietText]}>{label}</Text></Pressable>;
}
function Cell({label,value}:{label:string;value:string|number}){
 return <View style={s.cell}><Text style={s.label}>{label}</Text>
  <Text style={s.value}>{value}</Text></View>;
}
function Input({label,value,onChange,keyboardType="default",multiline=false}:{
 label:string;value:string;onChange:(value:string)=>void;
 keyboardType?:"default"|"numeric"|"email-address"|"phone-pad";multiline?:boolean
}){
 return <View style={s.inputGroup}><Text style={s.label}>{label}</Text>
  <TextInput value={value} onChangeText={onChange}
   accessibilityLabel={label} placeholder={label} maxLength={multiline?1000:300}
   keyboardType={keyboardType} multiline={multiline} autoCorrect={false}
   autoCapitalize={keyboardType==="email-address"?"none":"sentences"}
   style={[s.input,multiline&&s.textarea]}/></View>;
}
function Toggle({checked,onToggle,text}:{checked:boolean;onToggle:()=>void;text:string}){
 return <Pressable accessibilityRole="checkbox" accessibilityState={{checked}}
  onPress={onToggle} style={s.checkRow}>
  <View style={[s.checkbox,checked&&s.checkboxChecked]}>
   {checked&&<PatientIcon name="check" color="#fff" size={15}/>}</View>
  <Text style={s.checkText}>{text}</Text></Pressable>;
}
function Banner({text,good=false}:{text:string;good?:boolean}){
 return <View style={[s.banner,good&&s.bannerGood]} accessibilityRole="alert">
  <Text style={[s.bannerText,good&&s.bannerGoodText]}>{text}</Text></View>;
}
function loadDraft(body:NativeClinicReview["clinic"]&Record<string,unknown>):ClinicDraft{
 return {
  legalName:String(body.legalName||""),displayName:String(body.displayName||""),
  clinicType:body.clinicType==="solo"||body.clinicType==="specialty"?body.clinicType:"office",
  province:String(body.province||""),city:String(body.city||""),district:String(body.district||""),
  address:String(body.address||""),phone:String(body.phone||""),
  email:String(body.email||""),licenseNumber:String(body.licenseNumber||""),
  plannedDentistCount:String(body.plannedDentistCount||1)
 };
}
const todayAfghanistan=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).replace(/\//g,"-");

export function NativeClinicPhase20({clinicId,locale,token,api,request,onRefresh}:{
 clinicId:string;locale:Phase20Locale;token:string;api:string;
 request:Phase20Request;onRefresh:()=>Promise<void>
}){
 const t=w[locale];const [detail,setDetail]=useState<NativeClinicReview|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [issue,setIssue]=useState(""),[notice,setNotice]=useState("");
 const [attested,setAttested]=useState(false),[editing,setEditing]=useState(false);
 const [form,setForm]=useState<ClinicDraft|null>(null),[plans,setPlans]=useState<ClinicPlan[]>([]);
 const [selectedPlan,setSelectedPlan]=useState("");
 const [revision,setRevision]=useState(0);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  try{
   const body=await request<unknown>("/v1/clinics/"+encodeURIComponent(clinicId),"GET",undefined,signal);
   if(signal?.aborted)return;
   if(!validateClinicReview(body,clinicId))throw Error("INVALID_CLINIC_REVIEW");
   setDetail(body);setIssue("");setEditing(false);setAttested(false);
   setForm(loadDraft(body.clinic as NativeClinicReview["clinic"]&Record<string,unknown>));
   setSelectedPlan(body.clinic.selectedPlanId||"");
  }catch{if(!signal?.aborted){setDetail(null);setIssue(t.network)}}
  finally{if(!signal?.aborted)setLoading(false)}
 },[clinicId,request,locale]);
 useEffect(()=>{
  const ac=new AbortController();setLoading(true);setDetail(null);
  setForm(null);setIssue("");setNotice("");setAttested(false);setEditing(false);
  void refresh(ac.signal);
  return()=>ac.abort();
 },[refresh,revision]);
 useEffect(()=>{
  if(!editing)return;
  const ac=new AbortController();
  void request<{plans:ClinicPlan[]}>("/v1/public/plans","GET",undefined,ac.signal)
   .then(x=>{if(!ac.signal.aborted&&Array.isArray(x.plans))
    setPlans(x.plans.filter(p=>p&&typeof p.id==="string"&&
     typeof p.label==="string"&&typeof p.priceAfn==="number"))})
   .catch(()=>{if(!ac.signal.aborted)setPlans([])});
  return()=>ac.abort();
 },[editing,request]);
 const state=detail?nativeClinicReadiness(detail):null;
 const action=async(fn:()=>Promise<void>)=>{
  setBusy(true);setIssue("");setNotice("");
  try{await fn();await refresh();await onRefresh()}
  catch(e){setIssue(e instanceof ApiError&&e.status===409?t.disabled:t.network)}
  finally{setBusy(false)}
 };
 const upload=async()=>{
  if(!detail||!state?.canEdit||busy)return;
  try{
   const document=await pickClinicEvidence();
   if(!document)return;
   Alert.alert(t.license,t.uploadConfirm,[
    {text:t.cancel,style:"cancel"},
    {text:t.confirm,onPress:()=>{void action(async()=>{
     await uploadClinicLicense(api,clinicId,token,document);
     setNotice(t.uploadSuccess);
    }).catch(()=>setIssue(t.uploadError));}}
   ]);
  }catch{setIssue(t.uploadError)}
 };
 const update=async()=>{
  if(!detail||!form||!state?.canEdit||busy)return;
  if(clinicDraftErrors(form).length||!selectedPlan){setIssue(t.invalid);return}
  await action(async()=>{
   const payload=clinicRegistrationPayload(form,selectedPlan);
   await request("/v1/clinics/"+encodeURIComponent(clinicId),"PATCH",{
    ...payload,revision:detail.clinic.revision
   });
   setNotice(t.editSaved);
  });
 };
 const submit=()=>{
  if(!state?.canSubmit||!detail||busy||!attested)return;
  Alert.alert(t.title,t.submitConfirm,[
   {text:t.cancel,style:"cancel"},
   {text:t.submit,onPress:()=>{void action(async()=>{
    await request("/v1/clinics/"+encodeURIComponent(clinicId)+"/submit",
     "POST",{attested:true});
    setNotice(t.submitSuccess);
   })}}
  ]);
 };
 if(loading)return <View style={s.progressCard}><ActivityIndicator color="#2467a3"/>
  <Text style={s.body}>{t.loading}</Text></View>;
 if(!detail)return <View style={s.progressCard}>
  <Banner text={issue||t.network}/>
  <NativePhase20Button label={t.refresh} onPress={()=>setRevision(x=>x+1)}/></View>;
 return <View style={s.root}>
  <View style={s.hero}><Text style={s.heroEyebrow}>{t.subtitle}</Text>
   <Text style={s.heroTitle}>{t.title}</Text><Text style={s.heroSub}>{t.helper}</Text>
   <Text style={s.heroBadge}>{t.status}: {t[stateKey(detail.clinic.status)]}</Text>
  </View>
  <View style={s.progressCard}>
   <View style={s.row}><Text style={s.title}>{t.progress}</Text>
    <Text style={s.progressNumber}>{state!.complete} / {state!.total}</Text></View>
   <View style={s.progressTrack}><View style={[s.progressFill,
    {width:((state!.complete/state!.total)*100)+"%"}]}/></View>
   {state!.checks.map(step=><View key={step.id} style={s.progressRow}>
    <View style={[s.progressDot,step.state==="complete"&&s.progressDotDone]}>
     <PatientIcon name={step.state==="complete"?"check":"clock"} size={15}
      color={step.state==="complete"?"#fff":"#537893"}/></View>
    <Text style={s.progressName}>{t[step.id==="approved"?"approvedStep":step.id]}</Text>
    <Text style={[s.progressState,step.state==="complete"&&s.progressStateDone]}>
     {t[step.state]}</Text>
   </View>)}
  </View>
  {!!issue&&<Banner text={issue}/>}
  {!!notice&&<Banner text={notice} good/>}
  {(["needs_info","rejected"].includes(detail.clinic.status))&&
   <Banner text={t.rejectedRetry}/>}
  <View style={s.progressCard}>
   <Text style={s.title}>{t.identity}</Text>
   <Cell label={t.displayName} value={detail.clinic.displayName}/>
   <Cell label={t.doctors} value={detail.clinic.plannedDentistCount}/>
   <Cell label={t.planLabel} value={detail.plan?.label||t.none}/>
   {state!.canEdit&&!editing&&
    <NativePhase20Button label={t.edit} onPress={()=>setEditing(true)} quiet/>}
   {editing&&form&&<View style={s.form}>
    {([
     ["legalName",t.legalName],["displayName",t.displayName],
     ["province",t.province],["city",t.city],["district",t.district],
     ["address",t.address],["phone",t.phone],["email",t.email],
     ["licenseNumber",t.licenseNumber],["plannedDentistCount",t.doctors]
    ] as const).map(([key,label])=><Input key={key} label={label}
     value={form[key]} onChange={value=>setForm(old=>old?{...old,[key]:value}:old)}
     keyboardType={key==="plannedDentistCount"?"numeric":
      key==="email"?"email-address":key==="phone"?"phone-pad":"default"}/>)}
    <Text style={s.label}>{t.clinicType}</Text>
    <View style={s.wrap}>
     {(["solo","office","specialty"] as const).map(c=><Pressable key={c}
      accessibilityRole="button" accessibilityState={{selected:form.clinicType===c}}
      onPress={()=>setForm(old=>old?{...old,clinicType:c}:old)}
      style={[s.chip,form.clinicType===c&&s.chipSelected]}>
      <Text style={s.chipText}>{t[c==="specialty"?"specialtyType":c]}</Text></Pressable>)}
    </View>
    <Text style={s.label}>{t.plan}</Text>
    {!plans.length&&<Text style={s.hint}>{t.planMissing}</Text>}
    <View style={s.wrap}>{plans.map(p=><Pressable key={p.id}
     accessibilityRole="button" accessibilityState={{selected:selectedPlan===p.id}}
     onPress={()=>setSelectedPlan(p.id)}
     style={[s.chip,selectedPlan===p.id&&s.chipSelected]}>
     <Text style={s.chipText}>{p.label} · {p.priceAfn} AFN</Text></Pressable>)}</View>
    <View style={s.wrap}>
     <NativePhase20Button label={t.cancelEdit} quiet onPress={()=>setEditing(false)}/>
     <NativePhase20Button label={t.save} disabled={busy} onPress={()=>{void update()}}/>
    </View>
   </View>}
  </View>
  <View style={s.progressCard}>
   <Text style={s.title}>{t.evidence}</Text><Text style={s.hint}>{t.evidenceHelp}</Text>
   {detail.documents.filter(x=>x.kind==="clinic_license").length===0?
    <Text style={s.hint}>{t.noDocument}</Text>:
    detail.documents.filter(x=>x.kind==="clinic_license").map(doc=>
     <View key={doc.id} style={s.documentRow}>
      <PatientIcon name="file" size={20} color="#236395"/>
      <Text style={s.documentText}>{doc.fileName}</Text>
      <Text style={s.hint}>{Math.ceil(doc.sizeBytes/1024)} KB</Text>
     </View>)}
   {state!.canEdit?<NativePhase20Button label={busy?t.loading:t.upload}
    onPress={()=>{void upload()}} disabled={busy}/>:<Text style={s.hint}>{t.disabled}</Text>}
  </View>
  <View style={s.progressCard}>
   <Text style={s.title}>{t.submitted}</Text>
   <Text style={s.hint}>{t.noApproval}</Text>
   {state!.canEdit&&<Toggle checked={attested} onToggle={()=>setAttested(v=>!v)}
    text={t.attested}/>}
   {state!.canSubmit&&<NativePhase20Button label={t.submit}
    disabled={!attested||busy||editing} onPress={submit}/>}
   {!state!.submitted&&!state!.canSubmit&&<Text style={s.hint}>{t.reviewBlocked}</Text>}
   {state!.submitted&&<Text style={s.good}>{t[stateKey(detail.clinic.status)]}</Text>}
  </View>
  <View style={s.progressCard}>
   <Text style={s.title}>{t.reviewHistory}</Text>
   {!detail.history.length&&<Text style={s.hint}>{t.noReview}</Text>}
   {detail.history.slice(0,10).map((row,index)=><View key={index} style={s.historyRow}>
    <Text style={s.value}>{row.action}</Text><Text style={s.hint}>{row.createdAt.slice(0,10)}</Text>
    {!!row.reason&&<Text style={s.hint}>{t.reason}: {row.reason.slice(0,300)}</Text>}
   </View>)}
   <NativePhase20Button label={t.refresh} quiet onPress={()=>setRevision(x=>x+1)}/>
  </View>
 </View>;
}

export function NativeInviteAcceptance({locale,request,onAccepted}:{locale:Phase20Locale;
 request:Phase20Request;onAccepted:()=>Promise<void>}){
 const t=w[locale], [token,setToken]=useState(""),[preview,setPreview]=useState<
 {clinicName:string;role:string;status:string;expiresAt:string}|null>(null);
 const [busy,setBusy]=useState(false),[issue,setIssue]=useState(""),[success,setSuccess]=useState("");
 const check=async()=>{
  if(token.trim().length<30||token.trim().length>100){setIssue(t.tokenInvalid);return}
  setBusy(true);setIssue("");setPreview(null);setSuccess("");
  try{
   const data=await request<typeof preview>("/v1/team/invitations/preview?token="+encodeURIComponent(token.trim()));
   if(data&&typeof data.clinicName==="string"&&data.status==="pending")
    setPreview(data);else setIssue(t.tokenInvalid);
  }catch{setIssue(t.tokenInvalid)}finally{setBusy(false)}
 };
 const accept=async()=>{
  if(!preview||preview.status!=="pending")return;
  setBusy(true);setIssue("");
  try{
   await request("/v1/team/invitations/accept","POST",{token:token.trim()});
   setToken("");setPreview(null);setSuccess(t.joined);await onAccepted();
  }catch{setIssue(t.tokenInvalid)}finally{setBusy(false)}
 };
 return <View style={s.progressCard}><Text style={s.title}>{t.acceptTitle}</Text>
  <Text style={s.hint}>{t.acceptHelp}</Text><Input label={t.token} value={token}
   onChange={v=>{setToken(v);setPreview(null)}}/>
  {!!issue&&<Banner text={issue}/>}
  {!!success&&<Banner good text={success}/>}
  {preview&&<View style={s.documentRow}><Text style={s.value}>
   {preview.clinicName} · {preview.role}</Text><Text style={s.hint}>{preview.expiresAt.slice(0,10)}</Text></View>}
  <NativePhase20Button label={t.preview} disabled={busy||token.trim().length<30}
   onPress={()=>{void check()}} quiet/>
  {preview&&<NativePhase20Button label={t.accept} disabled={busy} onPress={()=>{void accept()}}/>}
  <Text style={s.hint}>{t.invalidInvite}</Text>
 </View>;
}

type DoctorResponse={draft:null|{displayName:string;specialty:string|null;qualifications:string|null;
 professionalLicense:string|null;experienceYears:number|null;biography:string|null;draftVersion:number};
 canEditDentist:boolean;member:{id:string;role:string;clinicianEnabled:boolean}};
export function NativeDentistPhase20({clinicId,membershipId,locale,request}:{clinicId:string;
 membershipId:string;locale:Phase20Locale;request:Phase20Request}){
 const t=w[locale];
 const [loaded,setLoaded]=useState<DoctorResponse|null>(null);
 const [profile,setProfile]=useState<DentistDraftNative>({...blankDentistDraft});
 const [verification,setVerification]=useState<DentistVerification|null>(null);
 const [file,setFile]=useState<EvidenceFile|null>(null),[credentialType,setCredentialType]=useState(""),
 [credentialNumber,setCredentialNumber]=useState(""),[validUntil,setValidUntil]=useState("");
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [revision,setRevision]=useState(0);
 const root="/v1/team/clinics/"+encodeURIComponent(clinicId)+"/staff/"+encodeURIComponent(membershipId);
 const credentials="/v1/listings/clinics/"+encodeURIComponent(clinicId)+"/dentists/"+encodeURIComponent(membershipId)+"/credential";
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  try{
   const result=await request<DoctorResponse>(root,"GET",undefined,signal);
   if(signal?.aborted)return;
   if(!result||result.member?.id!==membershipId||!result.canEditDentist)
    throw Error("DOCTOR_SCOPE_INVALID");
   setLoaded(result);setProfile({
    displayName:result.draft?.displayName||"",
    specialty:result.draft?.specialty||"",qualifications:result.draft?.qualifications||"",
    professionalLicense:result.draft?.professionalLicense||"",
    experienceYears:result.draft?.experienceYears===null||result.draft?.experienceYears===undefined?
     "":String(result.draft.experienceYears),
    biography:result.draft?.biography||""
   });
   if(result.draft?.professionalLicense){
    const status=await request<DentistVerification>(credentials,"GET",undefined,signal)
     .catch(()=>null);
    if(!signal?.aborted)setVerification(status?.verification?status:null);
   }else setVerification(null);
   if(!signal?.aborted)setError("");
  }catch{if(!signal?.aborted){setLoaded(null);setError(t.credentialError)}}
  finally{if(!signal?.aborted)setLoading(false)}
 },[root,credentials,request,membershipId,locale]);
 useEffect(()=>{
  const ac=new AbortController();setLoading(true);setLoaded(null);setVerification(null);
  setFile(null);setConsent(false);setSuccess("");setError("");
  void refresh(ac.signal);return()=>ac.abort();
 },[refresh,revision]);
 const update=(key:keyof DentistDraftNative,value:string)=>
  setProfile(old=>({...old,[key]:value}));
 const save=async()=>{
  if(!loaded||!loaded.canEditDentist||busy)return;
  if(dentistDraftIssues(profile).length){setError(t.invalid);return}
  setBusy(true);setError("");setSuccess("");
  try{
   await request(root+"/dentist","POST",dentistDraftPayload(profile,
    loaded.draft?.draftVersion??null));
   setSuccess(t.doctorSaved);setRevision(x=>x+1);
  }catch{setError(t.network)}finally{setBusy(false)}
 };
 const choose=async()=>{
  try{setError("");setFile(await pickClinicEvidence(CREDENTIAL_MAX_BYTES));setConsent(false)}
  catch{setFile(null);setError(t.uploadError)}
 };
 const send=async()=>{
  if(!loaded?.draft?.professionalLicense||!file||!consent||busy)return;
  if(credentialFormIssues(credentialType,credentialNumber,validUntil,todayAfghanistan()).length){
   setError(t.credentialInvalid);return;
  }
  Alert.alert(t.credential,t.credentialConfirm,[{text:t.cancel,style:"cancel"},
   {text:t.submit,onPress:()=>{void (async()=>{
    setBusy(true);setError("");setSuccess("");
    try{
     await request(credentials+"s","POST",{
      credentialType:credentialType.trim(),credentialNumber:credentialNumber.trim(),
      validUntil,attested:true,evidence:credentialEvidence(file)
     });
     setSuccess(t.credentialSent);setFile(null);setConsent(false);setRevision(x=>x+1);
    }catch{setError(t.network)}finally{setBusy(false)}
   })()}}
  ]);
 };
 if(loading)return <View style={s.progressCard}><ActivityIndicator color="#236395"/>
  <Text style={s.hint}>{t.loading}</Text></View>;
 if(!loaded)return <View style={s.progressCard}><Banner text={error||t.credentialError}/>
  <NativePhase20Button label={t.refresh} onPress={()=>setRevision(x=>x+1)}/></View>;
 const verified=verification?.verification?.status==="verified";
 const pending=verification?.verification?.status==="pending";
 return <View style={s.root}>
  <View style={s.hero}><Text style={s.heroEyebrow}>{t.staffTitle}</Text>
   <Text style={s.heroTitle}>{t.dentistTitle}</Text><Text style={s.heroSub}>{t.dentistHelp}</Text>
   <Text style={s.heroBadge}>{t.verification}: {verified?t.credentialVerified:
    pending?t.credentialPending:t.credentialNotVerified}</Text></View>
  {!!error&&<Banner text={error}/>}
  {!!success&&<Banner text={success} good/>}
  <View style={s.progressCard}><Text style={s.title}>{t.profile}</Text>
   {([
    ["displayName",t.dentistName],["specialty",t.specialty],
    ["qualifications",t.qualifications],["professionalLicense",t.professionalLicense],
    ["experienceYears",t.experience],["biography",t.biography]
   ] as const).map(([key,label])=><Input key={key} label={label}
    value={profile[key]} onChange={v=>update(key,v)} multiline={key==="biography"}
    keyboardType={key==="experienceYears"?"numeric":"default"}/>)}
   <Text style={s.hint}>{t.verifiedNote}</Text>
   <NativePhase20Button label={t.saveDoctor} onPress={()=>{void save()}} disabled={busy}/>
  </View>
  <View style={s.progressCard}><Text style={s.title}>{t.credential}</Text>
   <Text style={s.hint}>{pending?t.credentialPending:t.verifiedNote}</Text>
   {loaded.draft?.professionalLicense?
    <View style={s.form}>
     <Input label={t.credentialType} value={credentialType} onChange={setCredentialType}/>
     <Input label={t.credentialNumber} value={credentialNumber} onChange={setCredentialNumber}/>
     <Input label={t.validUntil} value={validUntil} onChange={setValidUntil}/>
     <NativePhase20Button label={t.chooseCredential} disabled={busy||pending}
      onPress={()=>{void choose()}} quiet/>
     {file&&<View style={s.documentRow}><PatientIcon name="file" size={19} color="#286596"/>
      <Text style={s.documentText}>{file.name}</Text>
      <Text style={s.hint}>{Math.ceil(file.size/1024)} KB</Text></View>}
     <Toggle checked={consent} onToggle={()=>setConsent(x=>!x)}
      text={t.credentialAttest}/>
     <NativePhase20Button label={t.sendCredential} disabled={!file||!consent||busy||pending}
      onPress={()=>{void send()}}/>
    </View>:<Banner text={t.credentialNeedProfile}/>}
   {verification?.decisions?.slice(0,4).map((decision,i)=>
    <View style={s.historyRow} key={i}>
     <Text style={s.value}>{decision.decision}</Text>
     {decision.reason&&<Text style={s.hint}>{decision.reason.slice(0,220)}</Text>}
    </View>)}
   <NativePhase20Button label={t.refresh} onPress={()=>setRevision(x=>x+1)} quiet/>
  </View>
 </View>;
}
export function NativeClinicTeamPhase20({clinicId,locale,mfa,request,openWeb}:{
 clinicId:string;locale:Phase20Locale;mfa:boolean;request:Phase20Request;openWeb:()=>void
}){
 const t=w[locale];
 type Directory={dentists:{id:string;display_name:string;verification_status:string|null;
  currentlyVerified:boolean;affiliation_status:string;professional_license:string|null}[]};
 const [items,setItems]=useState<Directory["dentists"]>([]);
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 const [inviteEmail,setInviteEmail]=useState(""),[error,setError]=useState(""),[note,setNote]=useState("");
 useEffect(()=>{
  const ac=new AbortController();setItems([]);setError("");
  void request<Directory>("/v1/listings/clinics/"+encodeURIComponent(clinicId)+"/dentists",
   "GET",undefined,ac.signal).then(x=>{
    if(!ac.signal.aborted&&Array.isArray(x.dentists))setItems(x.dentists.slice(0,150));
   }).catch(()=>{if(!ac.signal.aborted)setError(t.network)});
  return()=>ac.abort();
 },[clinicId,request,revision,locale]);
 async function invite(){
  if(!mfa){setError(t.inviteLocked);return}
  const address=inviteEmail.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError(t.tokenInvalid);return}
  setBusy(true);setError("");setNote("");
  try{
   await request("/v1/team/clinics/"+encodeURIComponent(clinicId)+"/invitations/",
    "POST",{email:address,role:"dentist"});
   setNote(t.inviteSent);setInviteEmail("");setRevision(x=>x+1);
  }catch{setError(t.inviteLocked)}finally{setBusy(false)}
 }
 return <View style={s.root}>
  <View style={s.progressCard}><Text style={s.title}>{t.staffTitle}</Text>
   <Text style={s.hint}>{t.staffSubtitle}</Text>
   {!!error&&<Banner text={error}/>}
   {!items.length&&<Text style={s.hint}>{t.noDentists}</Text>}
   {items.map(x=><View key={x.id} style={s.historyRow}>
    <Text style={s.value}>{x.display_name}</Text>
    <Text style={s.hint}>{t.verification}: {x.currentlyVerified?
     t.credentialVerified:x.verification_status==="pending"?t.credentialPending:
      t.credentialNotVerified}</Text>
   </View>)}
   <NativePhase20Button label={t.refreshTeam} quiet onPress={()=>setRevision(x=>x+1)}/>
  </View>
  <View style={s.progressCard}><Text style={s.title}>{t.invite}</Text>
   <Text style={s.hint}>{t.inviteLocked}</Text>
   <Input label={t.inviteEmail} value={inviteEmail} onChange={setInviteEmail}
    keyboardType="email-address"/>
   {!!note&&<Banner text={note} good/>}
   <NativePhase20Button label={t.invite} disabled={busy||!mfa}
    onPress={()=>{void invite()}}/>
   {!mfa&&<NativePhase20Button label={t.openWeb} onPress={openWeb} quiet/>}
  </View>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:14,minWidth:0},progressCard:{backgroundColor:"#fff",
  borderWidth:1,borderColor:"#dbe6f0",borderRadius:16,padding:17,gap:14},
 hero:{backgroundColor:"#173e5c",borderRadius:17,padding:20,gap:9},
 heroEyebrow:{fontSize:10,fontWeight:"900",color:"#72c9dc",letterSpacing:.7},
 heroTitle:{fontSize:23,fontWeight:"900",color:"#fff"},
 heroSub:{fontSize:12,lineHeight:20,color:"#c5dcee"},
 heroBadge:{alignSelf:"flex-start",fontSize:11,color:"#e2f3ff",fontWeight:"800",
  backgroundColor:"#2a5979",padding:9,borderRadius:9,marginTop:4},
 row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:9},
 title:{fontSize:17,fontWeight:"900",color:"#173b59"},
 label:{color:"#58758a",fontSize:11,fontWeight:"750"},
 value:{color:"#1e405e",fontSize:12,fontWeight:"850",flexShrink:1},
 body:{fontSize:12,color:"#58758a",lineHeight:20},
 hint:{fontSize:11,color:"#657e90",lineHeight:20},
 good:{fontSize:12,color:"#20714c",fontWeight:"800"},
 progressNumber:{fontSize:15,fontWeight:"900",color:"#1d6d9e"},
 progressTrack:{height:9,borderRadius:5,backgroundColor:"#e7f0f6",overflow:"hidden"},
 progressFill:{height:"100%",borderRadius:5,backgroundColor:"#148477"},
 progressRow:{flexDirection:"row",alignItems:"center",gap:10,borderBottomWidth:1,
  borderColor:"#eef3f7",paddingVertical:9},
 progressDot:{height:29,width:29,borderRadius:10,backgroundColor:"#edf3fa",alignItems:"center",justifyContent:"center"},
 progressDotDone:{backgroundColor:"#147f75"},
 progressName:{flex:1,fontSize:12,fontWeight:"800",color:"#314e66"},
 progressState:{fontSize:10,color:"#9b6d2d",fontWeight:"700"},
 progressStateDone:{color:"#168266"},
 inputGroup:{gap:6},input:{backgroundColor:"#f7fafe",minHeight:47,
  borderColor:"#d4e1ee",borderWidth:1,borderRadius:10,paddingHorizontal:12,
  paddingVertical:10,fontSize:13,color:"#21435e"},textarea:{minHeight:110,textAlignVertical:"top"},
 button:{minHeight:47,backgroundColor:"#175e9d",borderRadius:11,
  alignItems:"center",justifyContent:"center",paddingHorizontal:14,flex:1},
 buttonQuiet:{borderWidth:1,borderColor:"#c9ddec",backgroundColor:"#edf5fc"},
 buttonDisabled:{opacity:.48},pressed:{opacity:.83},
 buttonText:{fontWeight:"900",fontSize:12,color:"#fff",textAlign:"center"},
 buttonQuietText:{color:"#1d659c"},
 wrap:{flexDirection:"row",flexWrap:"wrap",gap:8},
 chip:{borderWidth:1,borderColor:"#dce5ee",backgroundColor:"#f7fafc",
  borderRadius:11,paddingHorizontal:12,paddingVertical:10},
 chipSelected:{borderColor:"#237da0",backgroundColor:"#e6f6fa"},
 chipText:{fontSize:11,color:"#355a78",fontWeight:"800"},
 form:{gap:13},
 cell:{borderBottomColor:"#edf2f6",borderBottomWidth:1,flexDirection:"row",
  justifyContent:"space-between",gap:10,paddingVertical:9},
 documentRow:{flexDirection:"row",alignItems:"center",gap:8,flexWrap:"wrap"},
 documentText:{flex:1,fontSize:12,fontWeight:"750",color:"#2d587a",minWidth:80},
 checkRow:{flexDirection:"row",alignItems:"flex-start",gap:9,padding:9,
  borderRadius:10,backgroundColor:"#f4f8fc"},
 checkbox:{width:24,height:24,borderRadius:7,borderWidth:2,borderColor:"#a7bcd0",
  alignItems:"center",justifyContent:"center"},
 checkboxChecked:{backgroundColor:"#137f75",borderColor:"#137f75"},
 checkText:{flex:1,fontSize:12,lineHeight:20,color:"#345a74"},
 historyRow:{gap:5,borderBottomWidth:1,borderColor:"#eef3f7",paddingVertical:10},
 banner:{borderRadius:11,borderWidth:1,borderColor:"#eccdd2",backgroundColor:"#fff4f5",padding:12},
 bannerGood:{backgroundColor:"#ecf8f3",borderColor:"#bee7d3"},
 bannerText:{fontSize:12,color:"#953c4f",lineHeight:19},
 bannerGoodText:{color:"#237054"}
});
