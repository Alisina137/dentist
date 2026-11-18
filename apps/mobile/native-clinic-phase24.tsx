import React,{useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import type {NativeClinicSpace,NativeClinicRole} from "./native-clinic-model";
import type {Phase20Request} from "./native-clinic-phase20";
import {
 countStaff,dentistStatuses,inviteEmailValid,invitationRows,minuteLabel,
 parseSchedule,providerWeek,reasonValid,staffCanAssign,staffCanClinicianToggle,
 staffCanManage,staffDetail,staffMayManageMember,staffNeedsMfa,teamRows,
 validWeek,weekPayload,
 type ClinicSchedule,type DentistStatus,type StaffMember,type StaffDetail,
 type StaffInvitation,type Shift,type StaffRole,type MemberStatus
} from "./native-clinic-phase24-model";

type Locale="en"|"fa-AF"|"ps-AF";
type SectionName="roster"|"invites"|"schedules";
type ScreenState="loading"|"ready"|"forbidden"|"unavailable";
type ActionKind="role"|"suspend"|"reactivate"|"revoke"|"force-logout"|
 "clinician-enable"|"clinician-disable"|"invite-revoke";
type Props={clinic:NativeClinicSpace;locale:Locale;request:Phase20Request;
 mfa:boolean;onOpenWeb:(path:string)=>void};
const lang={
 en:{
  eyebrow:"PRACTICE · PEOPLE",heading:"Doctors & staff",
  subtitle:"Secure team access, doctor credentials, invitations and weekly shifts.",
  roster:"Team directory",invites:"Invitations",schedules:"Doctor schedules",
  active:"Active",suspended:"Suspended",revoked:"Revoked",activeStaff:"Active staff",
  doctors:"Clinical staff",invited:"Pending invitations",verified:"Verified dentists",
  loading:"Loading authorized staff records…",unavailable:"Team data could not be verified. Refresh.",
  forbidden:"This role cannot view the full team directory.",
  refresh:"Refresh",empty:"No staff records available.",details:"Staff profile",
  close:"Close profile",you:"Your account",role:"Role",status:"Membership",
  email:"Email address",twoFactor:"Two-factor security",yes:"Enabled",no:"Not enabled",
  clinician:"Clinician affiliation",clinicianWarning:"A clinician flag does NOT verify professional credentials.",
  permission:"Access management",reason:"Administrative reason (5–300 characters)",
  reasonHint:"Explain the administrative change. Do not include patient information.",
  changeRole:"Change role",apply:"Apply change",suspend:"Suspend access",
  reactivate:"Reactivate",revoke:"Revoke membership",logout:"Revoke sessions",
  enableClinician:"Enable clinician affiliation",disableClinician:"Disable clinician affiliation",
  roleWarning:"Changing roles and suspending members may revoke their active sessions.",
  confirm:"Confirm",cancel:"Cancel",confirmChange:"Apply this security-sensitive change?",
  success:"Team action succeeded. Refreshing authorization.",
  conflict:"Team status changed or the plan limit was reached. Refresh before retrying.",
  uncertain:"Outcome not confirmed. Review latest team state before attempting again.",
  locked:"Staff actions require a verified multi-factor sign-in on the secure clinic website.",
  lockedHint:"Native login does not bypass the API's independent MFA requirement.",
  openWeb:"Open secure clinic website",inviteTitle:"Invite a staff member",
  inviteHint:"Invitation is emailed to the target account; an invitation never grants immediate staff access.",
  inviteEmail:"Staff email",sendInvite:"Send invitation",invalidEmail:"Enter a valid email address.",
  inviteRole:"New member role",inviteSuccess:"Invitation request submitted. Check delivery status.",
  invitationList:"Invitation history",pending:"Pending",accepted:"Accepted",expired:"Expired",
  resend:"Resend invitation",revokeInvite:"Revoke invitation",
  resendHint:"Resend has a server-enforced cooldown and staff seat limit.",
  sent:"Sent",expires:"Expires",notSent:"Email delivery not confirmed",
  credential:"Independent verification",pendingReview:"Pending verification",
  notVerified:"Not verified",verifiedLabel:"Currently verified",
  credentialHint:"Only independent review can verify a dentist. Draft profile or license text is not proof.",
  doctorDetails:"Professional profile",specialty:"Specialty",qualifications:"Qualifications",
  license:"Professional license",experience:"Experience (years)",displayName:"Professional name",
  biography:"Biography",editDoctor:"Edit professional profile",saveDoctor:"Save dentist draft",
  doctorWarning:"Changing the dentist draft resets existing verification; independent review is required again.",
  doctorMissing:"No professional profile has been completed.",
  schedule:"Provider weekly hours",chooseDoctor:"Choose a clinician",
  noClinician:"No active clinicians eligible for scheduling.",
  clinicTime:"Asia/Kabul time",open:"Open",closed:"Closed",start:"Start",
  finish:"Finish",saveWeek:"Save seven-day schedule",
  scheduleWarning:"A time change clears that day's break intervals. Existing appointments can block conflicting schedule changes.",
  scheduleConflict:"Existing bookings or an outdated schedule conflict. Refresh and review before retrying.",
  scheduleSaved:"Doctor hours saved. Reloaded from server.",
  readOnly:"You may view your own hours. Schedule changes require owner/manager authorization.",
  noSchedule:"The clinic schedule is unavailable for this account.",
  mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",
  fri:"Friday",sat:"Saturday",sun:"Sunday",
  allow:"Choose",staffInfo:"Access is checked independently by the clinic API.",
  ownerProtected:"Owner and your own membership cannot be demoted or revoked here.",
  owner:"Owner",manager:"Manager",dentist:"Dentist",receptionist:"Receptionist",
  assistant:"Assistant",cashier:"Cashier",
  credentialWeb:"Open clinician verification workspace",
  selfProfile:"Your current clinic membership",back:"Back to team",
  noChanges:"No changes selected.", reasonRequired:"Provide a reason of 5–300 characters.",
  invalidDoctor:"Professional name must be 2–120 characters, experience 0–70 years, and other fields must fit limits.",
  private:"Team data and invitations are not saved to this device.",
  refreshBefore:"Unknown result: refresh from the server before retrying.",
  staffCount:"Team members",filterAll:"All",filterActive:"Active",filterSuspended:"Suspended",
  search:"Search staff",select:"Select",more:"Review member",unverifiedStaff:"Unverified profile"
 },
 "fa-AF":{
  eyebrow:"کلینیک · کارمندان",heading:"داکتران و کارمندان",
  subtitle:"دسترسی امن، اسناد داکتران، دعوت‌نامه‌ها و ساعت کاری.",
  roster:"فهرست کارمندان",invites:"دعوت‌نامه‌ها",schedules:"ساعات داکتران",
  active:"فعال",suspended:"تعلیق‌شده",revoked:"لغوشده",activeStaff:"کارمندان فعال",
  doctors:"کارمندان طبی",invited:"دعوت‌های باز",verified:"داکتران تأییدشده",
  loading:"دریافت معلومات کارمندان…",unavailable:"معلومات تأیید نشد؛ دوباره تلاش کنید.",
  forbidden:"این نقش به فهرست کامل دسترسی ندارد.",refresh:"تازه‌سازی",
  empty:"کارمندی پیدا نشد.",details:"پروفایل کارمند",close:"بستن پروفایل",
  you:"حساب شما",role:"نقش",status:"عضویت",email:"ایمیل",
  twoFactor:"امنیت دومرحله‌ای",yes:"فعال",no:"فعال نیست",
  clinician:"وابستگی داکتر",clinicianWarning:"وابستگی به معنی تأیید اسناد حرفه‌ای نیست.",
  permission:"مدیریت دسترسی",reason:"دلیل اداری (۵–۳۰۰ حرف)",
  reasonHint:"دلیل اداری؛ معلومات مریضان را ننویسید.",
  changeRole:"تغییر نقش",apply:"اعمال تغییر",suspend:"تعلیق",
  reactivate:"فعال‌سازی",revoke:"لغو عضویت",logout:"خروج از جلسات",
  enableClinician:"فعال‌سازی داکتر",disableClinician:"غیرفعال‌سازی داکتر",
  roleWarning:"تغییر نقش ممکن جلسات فعال را مسدود سازد.",
  confirm:"تأیید",cancel:"لغو",confirmChange:"آیا این تغییر امنیتی انجام شود؟",
  success:"عملیات انجام شد. دسترسی دوباره بررسی می‌شود.",
  conflict:"وضعیت یا محدودیت تغییر کرده است؛ دوباره بررسی کنید.",
  uncertain:"نتیجه معلوم نیست؛ پیش از تکرار، وضعیت را بررسی کنید.",
  locked:"عملیات کارمندان به ورود دومرحله‌ای تأییدشده در وب کلینیک نیاز دارد.",
  lockedHint:"اپ موبایل محدودیت دومرحله‌ای سرور را دور نمی‌زند.",
  openWeb:"بازکردن وب مصئون",inviteTitle:"دعوت کارمند",
  inviteHint:"دعوت به ایمیل فرستاده می‌شود؛ عضویت تنها بعد از پذیرش فعال می‌شود.",
  inviteEmail:"ایمیل کارمند",sendInvite:"ارسال دعوت",invalidEmail:"ایمیل معتبر بنویسید.",
  inviteRole:"نقش کارمند جدید",inviteSuccess:"دعوت ثبت شد. تحویل ایمیل را بررسی کنید.",
  invitationList:"تاریخچه دعوت‌ها",pending:"در انتظار",accepted:"پذیرفته‌شده",
  expired:"منقضی‌شده",resend:"ارسال دوباره",revokeInvite:"لغو دعوت",
  resendHint:"ارسال دوباره دارای محدودیت زمانی و ظرفیت سرور است.",
  sent:"ارسال",expires:"انقضا",notSent:"تحویل ایمیل تأیید نشده",
  credential:"تأیید مستقل",pendingReview:"در حال بررسی",
  notVerified:"تأیید نشده",verifiedLabel:"فعلاً تأییدشده",
  credentialHint:"فقط بررسی مستقل اسناد داکتر را تأیید می‌کند.",
  doctorDetails:"پروفایل حرفه‌ای",specialty:"تخصص",qualifications:"تحصیلات",
  license:"جواز مسلکی",experience:"تجربه (سال)",displayName:"نام حرفه‌ای",
  biography:"معرفی",editDoctor:"ویرایش پروفایل",saveDoctor:"ذخیره پروفایل داکتر",
  doctorWarning:"تغییر پروفایل تأیید قبلی را باطل می‌کند و بررسی مجدد لازم است.",
  doctorMissing:"پروفایل حرفه‌ای موجود نیست.",
  schedule:"برنامه هفتگی داکتر",chooseDoctor:"انتخاب داکتر",
  noClinician:"داکتر فعال برای زمان‌بندی وجود ندارد.",
  clinicTime:"وقت کابل",open:"باز",closed:"بسته",start:"شروع",
  finish:"پایان",saveWeek:"ذخیره هفت روز",
  scheduleWarning:"تغییر وقت، وقفه همان روز را پاک می‌کند؛ نوبت‌های فعلی ممکن مانع شوند.",
  scheduleConflict:"نوبت فعلی یا نسخه قبلی تضاد دارد؛ تازه‌سازی کنید.",
  scheduleSaved:"ساعت داکتر ذخیره و تازه شد.",
  readOnly:"ساعات خود را ببینید؛ تغییر به مالک یا مدیر نیاز دارد.",
  noSchedule:"معلومات ساعات در دسترس نیست.",
  mon:"دوشنبه",tue:"سه‌شنبه",wed:"چهارشنبه",thu:"پنجشنبه",
  fri:"جمعه",sat:"شنبه",sun:"یکشنبه",
  allow:"انتخاب",staffInfo:"دسترسی مستقل در سرور بررسی می‌شود.",
  ownerProtected:"مالک و حساب خودتان در اینجا قابل لغو نیستند.",
  owner:"مالک",manager:"مدیر",dentist:"داکتر",receptionist:"پذیرش",
  assistant:"دستیار",cashier:"صندوق‌دار",
  credentialWeb:"بازکردن تأیید اسناد داکتر",selfProfile:"عضویت شما",
  back:"بازگشت",noChanges:"تغییری انتخاب نشده.",
  reasonRequired:"دلیل باید ۵ تا ۳۰۰ حرف باشد.",
  invalidDoctor:"نام و تجربه و متن‌های پروفایل را بررسی کنید.",
  private:"معلومات کارمندان روی دستگاه ذخیره نمی‌شود.",
  refreshBefore:"نتیجه نامعلوم؛ پیش از تکرار بررسی کنید.",
  staffCount:"کارمندان",filterAll:"همه",filterActive:"فعال",
  filterSuspended:"تعلیق‌شده",search:"جستجوی کارمندان",
  select:"انتخاب",more:"بررسی کارمند",unverifiedStaff:"پروفایل تأیید نشده"
 },
 "ps-AF":{
  eyebrow:"کلینیک · کارکوونکي",heading:"ډاکټران او کارکوونکي",
  subtitle:"خوندي لاسرسی، مسلکي اسناد، بلنې او کاري ساعتونه.",
  roster:"د کارکوونکو لېست",invites:"بلنې",schedules:"د ډاکټرانو وختونه",
  active:"فعال",suspended:"ځنډول شوی",revoked:"لغوه شوی",
  activeStaff:"فعال کارکوونکي",doctors:"طبي کارکوونکي",invited:"پاتې بلنې",
  verified:"تایید شوي ډاکټران",loading:"معلومات ترلاسه کېږي…",
  unavailable:"معلومات نه دي تایید شوي؛ بیا یې وګورئ.",
  forbidden:"دې رول ته بشپړ لېست نشته.",refresh:"تازه کول",
  empty:"کارکوونکی ونه موندل شو.",details:"د کارکوونکي پېژند",
  close:"تړل",you:"ستاسو حساب",role:"رول",status:"غړیتوب",
  email:"برېښنالیک",twoFactor:"دوه پړاوه امنیت",yes:"فعال",no:"فعال نه دی",
  clinician:"د ډاکټر تړاو",clinicianWarning:"دا تړاو مسلکي اسناد نه تاییدوي.",
  permission:"د لاسرسي مدیریت",reason:"اداري دلیل (۵–۳۰۰ توري)",
  reasonHint:"یوازې اداري دلیل؛ د ناروغ معلومات مه لیکئ.",
  changeRole:"رول بدلول",apply:"بدلون ثبتول",suspend:"ځنډول",
  reactivate:"بیا فعالول",revoke:"غړیتوب لغوه کول",logout:"ناستې بندول",
  enableClinician:"د ډاکټر رول فعالول",disableClinician:"د ډاکټر رول بندول",
  roleWarning:"د رول بدلون فعالې ناستې ختمولای شي.",
  confirm:"تایید",cancel:"لغوه",confirmChange:"دا مهم امنیتي بدلون وشي؟",
  success:"بدلون ثبت شو؛ لاسرسی بیا کتل کېږي.",
  conflict:"حالت یا محدودیت بدل شوی؛ بیا یې وګورئ.",
  uncertain:"پایله معلومه نه ده؛ له بیا هڅې مخکې یې وګورئ.",
  locked:"د کارکوونکو بدلونونه په خوندي وېب کې تایید شوي دوه پړاوه ننوتلو ته اړتیا لري.",
  lockedHint:"موبایل د سرور امنیتي غوښتنې نه شي لرې کولای.",
  openWeb:"خوندي وېب پرانیزئ",
  inviteTitle:"کارکوونکی راوبلئ",inviteHint:"بلنه برېښنالیک ته استول کېږي؛ لاسرسی د منلو وروسته فعالېږي.",
  inviteEmail:"د کارکوونکي ایمیل",sendInvite:"بلنه واستوئ",
  invalidEmail:"سم برېښنالیک ولیکئ.",inviteRole:"د نوي کارکوونکي رول",
  inviteSuccess:"بلنه ثبت شوه؛ د بریښنالیک رسول وګورئ.",
  invitationList:"د بلنو تاریخچه",pending:"په تمه",accepted:"منل شوی",
  expired:"پای ته رسېدلې",resend:"بیا واستوئ",revokeInvite:"بلنه لغوه کړئ",
  resendHint:"بیا لېږل د وخت او ظرفیت محدودیت لري.",
  sent:"لېږل شوی",expires:"پای نېټه",notSent:"استول نه دي تایید شوي",
  credential:"خپلواک تایید",pendingReview:"تر کتنې لاندې",
  notVerified:"نه دی تایید شوی",verifiedLabel:"اوس تایید شوی",
  credentialHint:"یوازې خپلواک کتونکی مسلکي اسناد تاییدوي.",
  doctorDetails:"مسلکي پېژند",specialty:"تخصص",qualifications:"زده کړې",
  license:"مسلکي جواز",experience:"تجربه (کلونه)",displayName:"مسلکي نوم",
  biography:"ژوندلیک",editDoctor:"مسلکي پېژند سمول",saveDoctor:"د ډاکټر پېژند خوندي کول",
  doctorWarning:"مسلکي بدلون پخوانی تایید باطلوي؛ بیا کتنه اړینه ده.",
  doctorMissing:"مسلکي پېژند نه شته.",
  schedule:"د ډاکټر اوونیز وخت",chooseDoctor:"ډاکټر وټاکئ",
  noClinician:"فعال ډاکټر نه شته.",clinicTime:"د کابل وخت",
  open:"خلاص",closed:"بند",start:"پیل",finish:"پای",
  saveWeek:"اووه ورځې خوندي کړئ",
  scheduleWarning:"د ساعت بدلون د ورځې وقفې پاکوي؛ اوسني ملاقاتونه د بدلون مخه نیولای شي.",
  scheduleConflict:"ملاقات یا پخوانۍ نسخه تضاد لري؛ تازه یې کړئ.",
  scheduleSaved:"د ډاکټر وختونه خوندي شول.",
  readOnly:"خپل ساعتونه لیدلای شئ؛ بدلول د مالک یا مدیر اجازه غواړي.",
  noSchedule:"د ساعتونو معلومات نه شته.",
  mon:"دوشنبه",tue:"سه شنبه",wed:"چهارشنبه",thu:"پنجشنبه",
  fri:"جمعه",sat:"شنبه",sun:"یکشنبه",
  allow:"ټاکل",staffInfo:"سرور لاسرسی بېل ګوري.",
  ownerProtected:"مالک او ستاسو غړیتوب دلته نه شي لغوه کېدای.",
  owner:"مالک",manager:"مدیر",dentist:"ډاکټر",receptionist:"پذیرش",
  assistant:"مرستیال",cashier:"صندوق",
  credentialWeb:"د ډاکټر تایید وېب پرانیزئ",
  selfProfile:"ستاسو غړیتوب",back:"ستنېدل",noChanges:"بدلون نه دی ټاکل شوی.",
  reasonRequired:"۵ تر ۳۰۰ تورو دلیل ولیکئ.",
  invalidDoctor:"د نوم، تجربې او مسلکي متنونو بڼه وګورئ.",
  private:"معلومات په موبایل کې نه ساتل کېږي.",
  refreshBefore:"پایله نامعلومه؛ مخکې له بیا هڅې یې وګورئ.",
  staffCount:"کارکوونکي",filterAll:"ټول",filterActive:"فعال",
  filterSuspended:"ځنډول",search:"د کارکوونکو لټون",
  select:"ټاکل",more:"غړی وګورئ",unverifiedStaff:"تایید شوی نه دی"
 }
} as const;
type Words={[K in keyof typeof lang.en]:string};
const roleOrder:StaffRole[]=["manager","dentist","receptionist","assistant","cashier"];
const dayOrder=[0,1,2,3,4,5,6] as const; // 0 is Saturday on this API.
const dayNames=["sat","sun","mon","tue","wed","thu","fri"] as const;
const timeStarts=[420,480,540,600,660,720,780,840,900,960,1020,1080];
const timeEnds=[720,780,840,900,960,1020,1080,1140,1200,1260,1320];
type Op={kind:ActionKind;member:StaffMember|null;invitation:StaffInvitation|null;nextRole:StaffRole|null};
const emptyOp=():Op=>({kind:"suspend",member:null,invitation:null,nextRole:null});
function Block({title,children,hint}:{title:string;children:React.ReactNode;hint?:string}){
 return <View style={s.block}><Text style={s.blockTitle}>{title}</Text>
  {hint&&<Text style={s.caption}>{hint}</Text>}{children}</View>;
}
function Button({title,onPress,quiet=false,danger=false,disabled=false,icon}:{
 title:string;onPress:()=>void;quiet?:boolean;danger?:boolean;disabled?:boolean;icon?:PatientIconName}){
 return <Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{disabled}}
  onPress={onPress} style={({pressed})=>[s.button,quiet&&s.quiet,
   danger&&s.danger,disabled&&s.disabled,pressed&&s.pressed]}>
  {icon&&<PatientIcon name={icon} size={17}
   color={quiet?"#1e6797":danger?"#a43f4b":"#fff"}/>}
  <Text style={[s.buttonText,quiet&&s.buttonTextQuiet,danger&&s.buttonTextDanger]}>
   {title}</Text></Pressable>;
}
function Field({title,value,onChange,keyboard="default",multiline=false}:{
 title:string;value:string;onChange:(text:string)=>void;
 keyboard?:"default"|"email-address"|"numeric";multiline?:boolean}){
 return <View style={s.field}><Text style={s.fieldTitle}>{title}</Text>
  <TextInput accessibilityLabel={title} value={value} autoCorrect={false}
   autoCapitalize={keyboard==="email-address"?"none":"sentences"}
   keyboardType={keyboard} maxLength={multiline?1000:300}
   multiline={multiline} style={[s.fieldInput,multiline&&s.textArea]}
   onChangeText={onChange}/></View>;
}
function Choice<T extends string|number>({items,value,onChange}:{
 items:{id:T;label:string}[];value:T;onChange:(x:T)=>void}){
 return <View style={s.chips}>{items.map(item=><Pressable key={String(item.id)}
  accessibilityRole="button" accessibilityState={{selected:value===item.id}}
  onPress={()=>onChange(item.id)} style={[s.chip,value===item.id&&s.chipSelected]}>
  <Text style={[s.chipText,value===item.id&&s.chipTextSelected]}>{item.label}</Text>
 </Pressable>)}</View>;
}
function DataRow({title,value}:{title:string;value:string}){
 return <View style={s.dataRow}><Text style={s.dataKey}>{title}</Text>
  <Text style={s.dataValue}>{value}</Text></View>;
}
function dateShort(v:string){return v.slice(0,10)}
const apiError=(e:unknown,t:Words)=>{
 const status=e&&typeof e==="object"&&"status" in e?(e as {status?:unknown}).status:null;
 if(status===401||status===403)return t.locked;
 if(status===409||status===429)return t.conflict;
 return t.uncertain;
};
/**
 * Team pages never use a public credential endpoint as proof of identity:
 * currentVerification comes only from the server's approved-current snapshot.
 */
export function NativeClinicPhase24({clinic,locale,request,mfa,onOpenWeb}:Props){
 const t=lang[locale],rtl=locale!=="en",manager=staffCanManage(clinic.role);
 const [section,setSection]=useState<SectionName>("roster");
 const [members,setMembers]=useState<StaffMember[]|null>(null);
 const [invitations,setInvitations]=useState<StaffInvitation[]|null>(null);
 const [dentists,setDentists]=useState<DentistStatus[]|null>(null);
 const [schedule,setSchedule]=useState<ClinicSchedule|null>(null);
 const [rosterState,setRosterState]=useState<ScreenState>("loading");
 const [inviteState,setInviteState]=useState<ScreenState>("loading");
 const [scheduleState,setScheduleState]=useState<ScreenState>("loading");
 const [selected,setSelected]=useState<StaffDetail|null>(null);
 const [detailState,setDetailState]=useState<ScreenState>("loading");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [providerId,setProviderId]=useState("");
 const [week,setWeek]=useState<Shift[]|null>(null);
 const [weekDirty,setWeekDirty]=useState(false);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<"all"|"active"|"suspended">("active");
 const [inviteEmail,setInviteEmail]=useState("");
 const [inviteRole,setInviteRole]=useState<StaffRole>("dentist");
 const [operation,setOperation]=useState<Op|null>(null);
 const [reason,setReason]=useState("");
 const [newRole,setNewRole]=useState<StaffRole>("dentist");
 const [doctorEditing,setDoctorEditing]=useState(false);
 const [doctorDraft,setDoctorDraft]=useState({
  displayName:"",specialty:"",qualifications:"",professionalLicense:"",
  experienceYears:"",biography:""
 });
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const [foreground,setForeground]=useState(!["inactive","background"].includes(AppState.currentState));
 const alive=useRef(true),foregroundRef=useRef(true);
 const seq=useRef({roster:0,invites:0,schedule:0,detail:0});
 const root="/v1/team/clinics/"+encodeURIComponent(clinic.clinicId);
 const ops="/v1/operations/clinics/"+encodeURIComponent(clinic.clinicId);
 useEffect(()=>{
  alive.current=true;
  return()=>{alive.current=false;seq.current.roster++;seq.current.invites++;
   seq.current.schedule++;seq.current.detail++};
 },[]);
 useEffect(()=>{
  const sub=AppState.addEventListener("change",state=>{
   if(state==="active"){
    foregroundRef.current=true;setForeground(true);setRefreshKey(n=>n+1);
   }else{
    foregroundRef.current=false;setForeground(false);
    setMembers(null);setInvitations(null);setDentists(null);
    setSchedule(null);setSelected(null);setSelectedId(null);
    setWeek(null);setWeekDirty(false);setProviderId("");
    setOperation(null);setReason("");setInviteEmail("");setSearch("");
    setDoctorEditing(false);setDoctorDraft({
     displayName:"",specialty:"",qualifications:"",professionalLicense:"",
     experienceYears:"",biography:""
    });
    setError("");setSuccess("");setUncertain(false);
   }
  });
  return()=>sub.remove();
 },[]);
 const reload=()=>{
  setError("");setSuccess("");setUncertain(false);
  setOperation(null);setSelected(null);setSelectedId(null);
  setWeek(null);setWeekDirty(false);setDoctorEditing(false);
  setRefreshKey(n=>n+1);
 };
 useEffect(()=>{
  if(!foreground||!manager){
   setMembers(null);setDentists(null);setRosterState("forbidden");return
  }
  const ac=new AbortController(),revision=++seq.current.roster;
  setMembers(null);setDentists(null);setRosterState("loading");
  void Promise.allSettled([
   request<unknown>(root+"/team","GET",undefined,ac.signal),
   request<unknown>("/v1/listings/clinics/"+
    encodeURIComponent(clinic.clinicId)+"/dentists","GET",undefined,ac.signal)
  ]).then(results=>{
   if(ac.signal.aborted||!alive.current||!foregroundRef.current||
    revision!==seq.current.roster)return;
   const roster=results[0].status==="fulfilled"?
    teamRows(results[0].value,clinic.clinicId,clinic.membershipId):null;
   const verified=results[1].status==="fulfilled"?
    dentistStatuses(results[1].value):null;
   setMembers(roster);setDentists(verified);
   setRosterState(roster?"ready":"unavailable");
  });
  return()=>{ac.abort();seq.current.roster++};
 },[clinic.clinicId,clinic.membershipId,manager,request,refreshKey,foreground]);
 useEffect(()=>{
  if(!foreground||!manager){setInvitations(null);setInviteState("forbidden");return}
  const ac=new AbortController(),revision=++seq.current.invites;
  setInvitations(null);setInviteState("loading");
  void request<unknown>(root+"/invitations/","GET",undefined,ac.signal)
   .then(value=>{
    if(ac.signal.aborted||!alive.current||revision!==seq.current.invites||
     !foregroundRef.current)return;
    const items=invitationRows(value,clinic.clinicId);
    setInvitations(items);setInviteState(items?"ready":"unavailable");
   }).catch(()=>{
    if(!ac.signal.aborted&&alive.current&&revision===seq.current.invites)
     setInviteState("unavailable");
   });
  return()=>{ac.abort();seq.current.invites++};
 },[clinic.clinicId,manager,request,refreshKey,foreground]);
 useEffect(()=>{
  if(!foreground||(!manager&&!["dentist","receptionist"].includes(clinic.role))){
   setSchedule(null);setScheduleState("forbidden");return
  }
  const ac=new AbortController(),revision=++seq.current.schedule;
  setSchedule(null);setScheduleState("loading");
  void request<unknown>(ops+"/hours","GET",undefined,ac.signal).then(value=>{
   if(ac.signal.aborted||!alive.current||!foregroundRef.current||
    revision!==seq.current.schedule)return;
   const valueSchedule=parseSchedule(value,clinic.clinicId);
   setSchedule(valueSchedule);setScheduleState(valueSchedule?"ready":"unavailable");
  }).catch(()=>{
   if(!ac.signal.aborted&&alive.current&&revision===seq.current.schedule)
    setScheduleState("unavailable");
  });
  return()=>{ac.abort();seq.current.schedule++};
 },[clinic.clinicId,clinic.role,manager,request,refreshKey,foreground]);
 useEffect(()=>{
  if(!foreground||!selectedId){setSelected(null);return}
  const ac=new AbortController(),revision=++seq.current.detail;
  setSelected(null);setDetailState("loading");setDoctorEditing(false);
  void request<unknown>(root+"/staff/"+encodeURIComponent(selectedId),"GET",
   undefined,ac.signal).then(value=>{
   if(ac.signal.aborted||!alive.current||!foregroundRef.current||
    revision!==seq.current.detail)return;
   const result=staffDetail(value,clinic.clinicId,clinic.membershipId);
   if(!result||result.member.id!==selectedId)throw Error("INVALID_MEMBER_DETAIL");
   if(!manager&&result.member.id!==clinic.membershipId)
    throw Error("UNAUTHORIZED_MEMBER");
   setSelected(result);setDetailState("ready");
   setDoctorDraft({
    displayName:result.displayName||result.member.name,
    specialty:result.specialty||"",qualifications:result.qualifications||"",
    professionalLicense:result.professionalLicense||"",
    experienceYears:result.experienceYears===null?"":String(result.experienceYears),
    biography:""
   });
  }).catch(()=>{
   if(!ac.signal.aborted&&alive.current&&revision===seq.current.detail)
    setDetailState("unavailable");
  });
  return()=>{ac.abort();seq.current.detail++};
 },[clinic.clinicId,clinic.membershipId,manager,selectedId,request,refreshKey,foreground]);
 useEffect(()=>{
  if(!schedule)return;
  const eligible=manager?schedule.clinicianIds:
   schedule.clinicianIds.filter(id=>id===clinic.membershipId);
  if(!eligible.length){setProviderId("");setWeek(null);setWeekDirty(false);return}
  const id=eligible.includes(providerId)?providerId:eligible[0];
  setProviderId(id);
  try{setWeek(providerWeek(schedule,id));setWeekDirty(false)}
  catch{setWeek(null);setWeekDirty(false)}
 },[schedule,providerId,clinic.membershipId,manager]);
 const filtered=useMemo(()=>members?.filter(m=>(filter==="all"||m.status===filter)&&
  (m.name+" "+m.email+" "+m.role).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ||[],[members,filter,search]);
 const summary=members?countStaff(members,invitations||[],dentists||[]):null;
 const currentDentist=selected?dentists?.find(x=>x.id===selected.member.id):null;
 const canAct=Boolean(manager&&mfa&&selected?.canManage&&
  selected&&staffMayManageMember(clinic.role,selected.member));
 const editableDoctor=Boolean(manager&&mfa&&selected?.canEditDentist&&
  selected.member.status==="active");
 const candidateRoles=roleOrder.filter(role=>staffCanAssign(clinic.role,role));
 const openDetail=(id:string)=>{setSelectedId(id);setSection("roster");
  setError("");setSuccess("");setOperation(null);setDoctorEditing(false)};
 const mode=(key:SectionName)=>{setSection(key);setSelectedId(null);setOperation(null);
  setError("");setSuccess("");setUncertain(false)};
 const startAction=(kind:ActionKind,member:StaffMember|null=null,
  invitation:StaffInvitation|null=null)=>{
  if(!manager||!mfa||busy||uncertain)return;
  setOperation({kind,member,invitation,nextRole:null});setReason("");
  setNewRole("dentist");setError("");setSuccess("");
 };
 const actionPath=(op:Op)=>{
  if(op.invitation)return root+"/invitations/"+encodeURIComponent(op.invitation.id)+"/revoke";
  if(!op.member)throw Error("MISSING_MEMBER");
  const base=root+"/staff/"+encodeURIComponent(op.member.id);
  if(op.kind==="role")return base+"/role";
  if(op.kind==="clinician-enable"||op.kind==="clinician-disable")return base+"/clinician";
  if(op.kind==="force-logout")return base+"/force-logout";
  return base+"/status";
 };
 const isSafeOp=(op:Op)=>{
  if(!staffNeedsMfa(clinic.role,mfa)||!reasonValid(reason))return false;
  if(op.invitation)return op.kind==="invite-revoke"&&
   op.invitation.status==="pending"&&staffCanAssign(clinic.role,op.invitation.role);
  if(!op.member)return false;
  if(op.kind==="clinician-enable"||op.kind==="clinician-disable")
   return staffCanClinicianToggle(clinic.role,op.member)&&
    op.member.clinicianEnabled===(op.kind==="clinician-disable");
  if(!staffMayManageMember(clinic.role,op.member))return false;
  if(op.kind==="role")return staffCanAssign(clinic.role,newRole,op.member.role)&&
   newRole!==op.member.role&&op.member.status==="active";
  if(op.kind==="reactivate")return op.member.status==="suspended";
  if(op.kind==="suspend")return op.member.status==="active";
  if(op.kind==="revoke")return ["active","suspended"].includes(op.member.status);
  return op.kind==="force-logout";
 };
 async function doAction(){
  const op=operation;if(!op||!isSafeOp(op)||busy||!alive.current||!foregroundRef.current)return;
  const latest=selected?.member;
  // A pending confirmation cannot target a membership that has since changed
  // the selected profile, or a different clinic/account.
  if(op.member&&(!latest||latest.id!==op.member.id||
   latest.changedAt!==op.member.changedAt))return;
  const body=op.kind==="role"?{role:newRole,reason:reason.trim()}:
   op.kind==="clinician-enable"||op.kind==="clinician-disable"?
    {enabled:op.kind==="clinician-enable",reason:reason.trim()}:
   op.kind==="force-logout"||op.kind==="invite-revoke"?
    {reason:reason.trim()}:{action:op.kind,reason:reason.trim()};
  setBusy(true);setError("");setOperation(null);
  try{
   const res=await request<unknown>(actionPath(op),"POST",body);
   if(!alive.current||!foregroundRef.current)return;
   if(!res||typeof res!=="object")throw Error("UNVERIFIED_ACTION");
   setSelectedId(null);setSelected(null);setUncertain(false);
   setSuccess(t.success);setRefreshKey(n=>n+1);
  }catch(e){
   if(alive.current&&foregroundRef.current){
    setUncertain(true);setError(apiError(e,t));
   }
  }finally{if(alive.current)setBusy(false)}
 }
 const confirmAction=()=>{
  if(!operation||!isSafeOp(operation)||busy)return;
  Alert.alert(t.permission,t.confirmChange+" "+t.roleWarning,[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,style:operation.kind==="revoke"||operation.kind==="invite-revoke"?
    "destructive":"default",onPress:()=>{void doAction()}}
  ]);
 };
 async function createInvite(){
  if(!manager||!mfa||!inviteEmailValid(inviteEmail)||busy||uncertain||
   !staffCanAssign(clinic.role,inviteRole))return;
  const email=inviteEmail.trim().toLowerCase(),role=inviteRole;
  setBusy(true);setError("");
  try{
   const result=await request<unknown>(root+"/invitations/","POST",{email,role});
   if(!alive.current||!foregroundRef.current)return;
   if(!result||typeof result!=="object"||
    (result as {status?:unknown}).status!=="pending")
    throw Error("INVALID_INVITATION_RESPONSE");
   setInviteEmail("");setSuccess(t.inviteSuccess);setRefreshKey(n=>n+1);
  }catch(e){
   if(alive.current&&foregroundRef.current){
    setUncertain(true);setError(apiError(e,t));
   }
  }finally{if(alive.current)setBusy(false)}
 }
 function confirmInvite(){
  if(!inviteEmailValid(inviteEmail)){setError(t.invalidEmail);return}
  if(!staffCanAssign(clinic.role,inviteRole))return;
  Alert.alert(t.inviteTitle,t.inviteHint+" "+t.email+": "+inviteEmail.trim(),[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,onPress:()=>{void createInvite()}}
  ]);
 }
 async function resend(invite:StaffInvitation){
  if(!manager||!mfa||busy||uncertain||!staffCanAssign(clinic.role,invite.role))return;
  setBusy(true);setError("");
  try{
   const result=await request<unknown>(root+"/invitations/"+
    encodeURIComponent(invite.id)+"/resend","POST",{});
   if(!alive.current||!foregroundRef.current)return;
   if(!result||typeof result!=="object"||
    (result as {status?:unknown}).status!=="pending")
    throw Error("UNVERIFIED_INVITATION_RESEND");
   setSuccess(t.inviteSuccess);setRefreshKey(n=>n+1);
  }catch(e){
   if(alive.current&&foregroundRef.current){
    setUncertain(true);setError(apiError(e,t));
   }
  }finally{if(alive.current)setBusy(false)}
 }
 const confirmResend=(invite:StaffInvitation)=>{
  Alert.alert(t.resend,t.inviteHint+" "+invite.email,[
   {text:t.cancel,style:"cancel"},
   {text:t.confirm,onPress:()=>{void resend(invite)}}
  ]);
 };
 const doctorValid=()=>doctorDraft.displayName.trim().length>=2&&
  doctorDraft.displayName.trim().length<=120&&
  doctorDraft.specialty.length<=120&&doctorDraft.qualifications.length<=300&&
  doctorDraft.professionalLicense.length<=100&&doctorDraft.biography.length<=1000&&
  (doctorDraft.experienceYears===""||
   /^\d{1,2}$/.test(doctorDraft.experienceYears)&&Number(doctorDraft.experienceYears)<=70);
 async function updateDoctor(){
  if(!selected||!editableDoctor||!doctorValid()||busy||uncertain)return;
  setBusy(true);setError("");
  const payload={
   displayName:doctorDraft.displayName.trim(),
   specialty:doctorDraft.specialty.trim()||null,
   qualifications:doctorDraft.qualifications.trim()||null,
   professionalLicense:doctorDraft.professionalLicense.trim()||null,
   biography:doctorDraft.biography.trim()||null,
   experienceYears:doctorDraft.experienceYears===""?null:Number(doctorDraft.experienceYears),
   ...(selected.draftVersion===null?{}:{draftVersion:selected.draftVersion})
  };
  try{
   const result=await request<unknown>(root+"/staff/"+
    encodeURIComponent(selected.member.id)+"/dentist","POST",payload);
   if(!alive.current||!foregroundRef.current)return;
   if(!result||typeof result!=="object"||!("draft" in result))
    throw Error("INVALID_DENTIST_WRITE");
   setDoctorEditing(false);setSelectedId(null);setSelected(null);
   setSuccess(t.success);setRefreshKey(n=>n+1);
  }catch(e){
   if(alive.current&&foregroundRef.current){
    setUncertain(true);setError(apiError(e,t));
   }
  }finally{if(alive.current)setBusy(false)}
 }
 const confirmDoctor=()=>{
  if(!doctorValid()){setError(t.invalidDoctor);return}
  Alert.alert(t.editDoctor,t.doctorWarning,[
   {text:t.cancel,style:"cancel"},{text:t.confirm,onPress:()=>{void updateDoctor()}}
  ]);
 };
 const editDay=(weekday:number,key:"isOpen"|"startMinute"|"endMinute",value:number|boolean)=>{
  if(!manager||!week||busy||uncertain)return;
  setWeek(current=>current?.map(row=>{
   if(row.weekday!==weekday)return row;
   if(key==="isOpen")return {...row,isOpen:Boolean(value)};
   const updated={...row,[key]:value,breaks:[]};
   return updated;
  })||null);
  setWeekDirty(true);
 };
 async function saveWeek(){
  if(!manager||!schedule||!week||!validWeek(week)||!weekDirty||busy||uncertain||
   !schedule.clinicianIds.includes(providerId)||!alive.current||!foregroundRef.current)return;
  const selectedProvider=providerId;
  setBusy(true);setError("");
  try{
   const result=await request<unknown>(ops+"/hours/providers/"+
    encodeURIComponent(selectedProvider),"PUT",{week:weekPayload(week)});
   if(!alive.current||!foregroundRef.current)return;
   const parsed=parseSchedule(result,clinic.clinicId);
   if(!parsed||!parsed.clinicianIds.includes(selectedProvider))
    throw Error("UNVERIFIED_SCHEDULE");
   setSchedule(parsed);setWeek(providerWeek(parsed,selectedProvider));
   setWeekDirty(false);setSuccess(t.scheduleSaved);setUncertain(false);
  }catch(e){
   if(alive.current&&foregroundRef.current){
    setUncertain(true);setError(apiError(e,t));
   }
  }finally{if(alive.current)setBusy(false)}
 }
 const confirmWeek=()=>{
  if(!week||!validWeek(week)){setError(t.scheduleConflict);return}
  Alert.alert(t.schedule,t.scheduleWarning,[
   {text:t.cancel,style:"cancel"},{text:t.confirm,onPress:()=>{void saveWeek()}}
  ]);
 };
 const canChooseProvider=(id:string)=>
  manager||id===clinic.membershipId;
 const scopedClinicians=(schedule?.clinicianIds||[]).filter(canChooseProvider);
 const providerName=(id:string)=>{
  const named=members?.find(m=>m.id===id);
  return named?.name||(id===clinic.membershipId?t.you:id.slice(0,8));
 };
 const activeMembers=filtered.slice(0,100);
 return <View style={s.root}>
  <View style={s.hero}>
   <View style={s.heroTop}><PatientIcon name="shield" color="#7ce1d7" size={19}/>
    <Text style={s.heroEyebrow}>{t.eyebrow}</Text></View>
   <Text style={s.heroTitle}>{t.heading}</Text>
   <Text style={s.heroSub}>{t.subtitle}</Text>
   <Text style={s.heroClinic} numberOfLines={1}>{clinic.clinicName}</Text>
  </View>
  <View style={s.actions}>
   <Button title={t.refresh} quiet icon="clock" onPress={reload} disabled={busy}/>
   <Button title={t.openWeb} quiet icon="shield"
    onPress={()=>onOpenWeb("/clinic/staff?clinic="+encodeURIComponent(clinic.clinicId))}/>
  </View>
  {error!==""&&<Text style={s.error} accessibilityRole="alert">{error}</Text>}
  {success!==""&&<Text style={s.good} accessibilityRole="alert">{success}</Text>}
  {uncertain&&<Text style={s.warning}>{t.refreshBefore}</Text>}
  {manager&&!mfa&&<View style={s.warningCard}>
   <Text style={s.warning}>{t.locked}</Text>
   <Text style={s.muted}>{t.lockedHint}</Text>
   <Button title={t.openWeb} quiet onPress={()=>onOpenWeb(
    "/clinic/security?clinic="+encodeURIComponent(clinic.clinicId))}/>
  </View>}
  {manager&&<View style={s.sectionTabs}>
   {(["roster","invites","schedules"] as const).map(name=>
    <Pressable key={name} accessibilityRole="tab"
     accessibilityState={{selected:section===name}} onPress={()=>mode(name)}
     style={[s.sectionTab,section===name&&s.sectionTabActive]}>
     <Text style={[s.sectionText,section===name&&s.sectionTextActive]}>{t[name]}</Text>
    </Pressable>)}
  </View>}
  {!manager&&<Block title={t.selfProfile} hint={t.staffInfo}>
   <Button title={t.details} quiet onPress={()=>openDetail(clinic.membershipId)}/>
   {detailState==="loading"&&selectedId===clinic.membershipId&&
    <ActivityIndicator color="#1c6397"/>}
   {selected&&selected.member.self&&<View style={s.stack}>
    <DataRow title={t.role} value={t[selected.member.role]}/>
    <DataRow title={t.status} value={t[selected.member.status]}/>
    <Text style={s.caption}>{t.readOnly}</Text>
   </View>}
  </Block>}
  {manager&&section==="roster"&&<View style={s.stack}>
   <View style={s.metrics}>
    {([[t.activeStaff,summary?.active],[t.doctors,summary?.dentists],
      [t.invited,summary?.invites],[t.verified,summary?.verified]] as [string,number|undefined][])
      .map(([title,value],i)=><View key={i} style={s.metric}>
       <Text style={s.metricNumber}>{value??"—"}</Text>
       <Text style={s.metricLabel}>{title}</Text>
      </View>)}
   </View>
   <Block title={t.roster} hint={t.staffInfo}>
    <Field title={t.search} value={search} onChange={setSearch}/>
    <Choice items={[{id:"active",label:t.filterActive},
      {id:"suspended",label:t.filterSuspended},{id:"all",label:t.filterAll}]}
     value={filter} onChange={setFilter}/>
    {rosterState==="loading"?<ActivityIndicator color="#195b93"/>:
     rosterState!=="ready"?<Text style={s.warning}>{t.unavailable}</Text>:
     !activeMembers.length?<Text style={s.muted}>{t.empty}</Text>:
     activeMembers.map(member=><Pressable key={member.id}
      accessibilityRole="button" accessibilityLabel={t.more+": "+member.name}
      onPress={()=>openDetail(member.id)} style={({pressed})=>[s.memberRow,pressed&&s.pressed]}>
      <View style={s.avatar}><Text style={s.avatarText}>
       {(member.name||"?").slice(0,1).toUpperCase()}</Text></View>
      <View style={s.memberInfo}><Text style={s.memberName} numberOfLines={1}>
       {member.name}{member.self?" · "+t.you:""}</Text>
       <Text style={s.memberSub} numberOfLines={1}>{t[member.role]} · {member.email}</Text>
      </View>
      <View style={[s.badge,{backgroundColor:member.status==="active"?
       "#e7f6f1":"#fff3e7"}]}>
       <Text style={s.badgeText}>{t[member.status]}</Text>
      </View>
     </Pressable>)}
    <Text style={s.caption}>{t.private}</Text>
   </Block>
  </View>}
  {manager&&section==="invites"&&<View style={s.stack}>
   <Block title={t.inviteTitle} hint={t.inviteHint}>
    <Field title={t.inviteEmail} value={inviteEmail} keyboard="email-address"
     onChange={x=>{setInviteEmail(x);setError("")}}/>
    <Text style={s.fieldTitle}>{t.inviteRole}</Text>
    <Choice value={inviteRole} onChange={setInviteRole}
     items={candidateRoles.map(role=>({id:role,label:t[role]}))}/>
    <Text style={s.caption}>{t.lockedHint}</Text>
    <Button title={t.sendInvite} icon="plus" onPress={confirmInvite}
     disabled={!mfa||busy||uncertain||!inviteEmailValid(inviteEmail)||
      !staffCanAssign(clinic.role,inviteRole)}/>
   </Block>
   <Block title={t.invitationList} hint={t.resendHint}>
    {inviteState==="loading"?<ActivityIndicator color="#195b93"/>:
     inviteState!=="ready"?<Text style={s.warning}>{t.unavailable}</Text>:
     !invitations?.length?<Text style={s.muted}>{t.empty}</Text>:
     invitations.map(inv=><View key={inv.id} style={s.invitation}>
      <Text style={s.memberName}>{inv.email}</Text>
      <Text style={s.caption}>{t[inv.role]} · {t[inv.status]} ·
       {t.expires}: {dateShort(inv.expiresAt)}</Text>
      <Text style={s.caption}>{t.sent}: {inv.sentAt?
       dateShort(inv.sentAt):t.notSent}</Text>
      {inv.status==="pending"&&mfa&&staffCanAssign(clinic.role,inv.role)&&
       <View style={s.actions}>
        <Button title={t.resend} quiet disabled={busy||uncertain}
         onPress={()=>confirmResend(inv)}/>
        <Button title={t.revokeInvite} danger disabled={busy||uncertain}
         onPress={()=>startAction("invite-revoke",null,inv)}/>
       </View>}
     </View>)}
   </Block>
  </View>}
  {((manager&&section==="schedules")||(!manager&&
   ["dentist","receptionist"].includes(clinic.role)))&&<Block
    title={t.schedule} hint={t.clinicTime}>
    {scheduleState==="loading"?<ActivityIndicator color="#195b93"/>:
     scheduleState!=="ready"||!schedule?<Text style={s.warning}>{t.noSchedule}</Text>:
     !scopedClinicians.length?<Text style={s.muted}>{t.noClinician}</Text>:
     <View style={s.stack}>
      <Text style={s.fieldTitle}>{t.chooseDoctor}</Text>
      <Choice items={scopedClinicians.map(id=>({id,label:providerName(id)}))}
       value={providerId} onChange={id=>{setProviderId(id);setWeekDirty(false)}}/>
      {!week?<ActivityIndicator color="#195b93"/>:
       dayOrder.map(day=>{
        const shift=week.find(w=>w.weekday===day)!;
        const starts=timeStarts.includes(shift.startMinute)?timeStarts:
         [shift.startMinute,...timeStarts].sort((a,b)=>a-b);
        const ends=timeEnds.includes(shift.endMinute)?timeEnds:
         [shift.endMinute,...timeEnds].sort((a,b)=>a-b);
        return <View key={day} style={s.dayRow}>
         <View style={s.dayHeading}>
          <Text style={s.dayName}>{t[dayNames[day]]}</Text>
          <Pressable accessibilityRole="button"
           accessibilityState={{selected:shift.isOpen,disabled:!manager}}
           disabled={!manager||busy||uncertain} onPress={()=>
            editDay(day,"isOpen",!shift.isOpen)}
           style={[s.daySwitch,shift.isOpen&&s.daySwitchOn]}>
           <Text style={[s.daySwitchText,shift.isOpen&&s.daySwitchTextOn]}>
            {shift.isOpen?t.open:t.closed}</Text>
          </Pressable>
         </View>
         {shift.isOpen&&<View style={s.stack}>
          <Text style={s.caption}>{t.start} · {minuteLabel(shift.startMinute)}</Text>
          {manager&&<Choice value={shift.startMinute}
           onChange={value=>editDay(day,"startMinute",value)}
           items={starts.filter(v=>v<shift.endMinute).map(v=>({id:v,label:minuteLabel(v)}))}/>}
          <Text style={s.caption}>{t.finish} · {minuteLabel(shift.endMinute)}</Text>
          {manager&&<Choice value={shift.endMinute}
           onChange={value=>editDay(day,"endMinute",value)}
           items={ends.filter(v=>v>shift.startMinute).map(v=>({id:v,label:minuteLabel(v)}))}/>}
         </View>}
        </View>;
       })}
      <Text style={s.caption}>{t.scheduleWarning}</Text>
      <Button title={t.saveWeek} icon="check" onPress={confirmWeek}
       disabled={!manager||!weekDirty||!week||!validWeek(week)||busy||uncertain}/>
     </View>}
   </Block>}
  {manager&&section==="roster"&&selectedId&&<Block title={t.details}>
   {detailState==="loading"?<ActivityIndicator color="#195b93"/>:
    detailState!=="ready"||!selected?<Text style={s.warning}>{t.unavailable}</Text>:
    <View style={s.stack}>
     <Text style={s.profileName}>{selected.member.name}</Text>
     <DataRow title={t.email} value={selected.member.email}/>
     <DataRow title={t.role} value={t[selected.member.role]}/>
     <DataRow title={t.status} value={t[selected.member.status]}/>
     <DataRow title={t.twoFactor} value={selected.member.mfaEnabled?t.yes:t.no}/>
     <DataRow title={t.clinician} value={selected.member.clinicianEnabled?t.yes:t.no}/>
     {selected.member.role==="owner"&&<Text style={s.caption}>{t.ownerProtected}</Text>}
     {(selected.member.role==="dentist"||selected.member.clinicianEnabled)&&
      <View style={s.doctorCard}>
       <Text style={s.blockTitle}>{t.doctorDetails}</Text>
       <DataRow title={t.displayName} value={selected.displayName||t.doctorMissing}/>
       <DataRow title={t.specialty} value={selected.specialty||"—"}/>
       <DataRow title={t.qualifications} value={selected.qualifications||"—"}/>
       <DataRow title={t.experience}
        value={selected.experienceYears===null?"—":String(selected.experienceYears)}/>
       <Text style={s.caption}>{t.credentialHint}</Text>
       <View style={s.verificationRow}>
        <PatientIcon name="shield" size={17}
         color={currentDentist?.currentlyVerified?"#19886c":"#a87c35"}/>
        <Text style={s.memberSub}>{currentDentist?.currentlyVerified?t.verifiedLabel:
         currentDentist?.verificationStatus==="pending"?t.pendingReview:t.notVerified}</Text>
       </View>
       <Button quiet title={t.credentialWeb} onPress={()=>onOpenWeb(
        "/clinic/credentials?clinic="+encodeURIComponent(clinic.clinicId))}/>
       {editableDoctor&&!doctorEditing&&<Button quiet title={t.editDoctor}
        disabled={busy||uncertain} onPress={()=>{
         setDoctorEditing(true);setError("");
        }}/>}
       {doctorEditing&&<View style={s.stack}>
        <Text style={s.warning}>{t.doctorWarning}</Text>
        <Field title={t.displayName} value={doctorDraft.displayName}
         onChange={v=>setDoctorDraft(x=>({...x,displayName:v}))}/>
        <Field title={t.specialty} value={doctorDraft.specialty}
         onChange={v=>setDoctorDraft(x=>({...x,specialty:v}))}/>
        <Field title={t.qualifications} value={doctorDraft.qualifications}
         onChange={v=>setDoctorDraft(x=>({...x,qualifications:v}))}/>
        <Field title={t.license} value={doctorDraft.professionalLicense}
         onChange={v=>setDoctorDraft(x=>({...x,professionalLicense:v}))}/>
        <Field title={t.experience} value={doctorDraft.experienceYears}
         onChange={v=>setDoctorDraft(x=>({...x,experienceYears:v}))}
         keyboard="numeric"/>
        <Field title={t.biography} multiline value={doctorDraft.biography}
         onChange={v=>setDoctorDraft(x=>({...x,biography:v}))}/>
        <Button title={t.saveDoctor} onPress={confirmDoctor}
         disabled={busy||uncertain||!doctorValid()}/>
        <Button quiet title={t.cancel} onPress={()=>setDoctorEditing(false)}/>
       </View>}
      </View>}
     <Text style={s.caption}>{t.roleWarning}</Text>
     {canAct&&<View style={s.stack}>
      <Text style={s.blockTitle}>{t.permission}</Text>
      {selected.member.status==="active"&&<View style={s.actions}>
       <Button quiet title={t.changeRole} onPress={()=>startAction("role",selected.member)}/>
       <Button quiet title={t.suspend} onPress={()=>startAction("suspend",selected.member)}/>
       <Button danger title={t.revoke} onPress={()=>startAction("revoke",selected.member)}/>
       <Button quiet title={t.logout} onPress={()=>startAction("force-logout",selected.member)}/>
      </View>}
      {selected.member.status==="suspended"&&<View style={s.actions}>
       <Button quiet title={t.reactivate} onPress={()=>startAction("reactivate",selected.member)}/>
       <Button danger title={t.revoke} onPress={()=>startAction("revoke",selected.member)}/>
      </View>}
     </View>}
     {mfa&&staffCanClinicianToggle(clinic.role,selected.member)&&
      <Button quiet title={selected.member.clinicianEnabled?
       t.disableClinician:t.enableClinician}
       onPress={()=>startAction(selected.member.clinicianEnabled?
        "clinician-disable":"clinician-enable",selected.member)}/>}
    </View>}
   <Button title={t.back} quiet onPress={()=>{setSelectedId(null);setSelected(null);
    setOperation(null);setDoctorEditing(false)}}/>
  </Block>}
  {operation&&<Block title={t.permission} hint={t.roleWarning}>
   <Text style={s.memberName}>{operation.invitation?.email||operation.member?.name||"—"}</Text>
   <Text style={s.caption}>{operation.kind==="role"?t.changeRole:
    operation.kind==="suspend"?t.suspend:
    operation.kind==="reactivate"?t.reactivate:
    operation.kind==="revoke"?t.revoke:
    operation.kind==="force-logout"?t.logout:
    operation.kind==="clinician-enable"?t.enableClinician:
    operation.kind==="clinician-disable"?t.disableClinician:t.revokeInvite}</Text>
   {operation.kind==="role"&&<View style={s.stack}>
    <Text style={s.fieldTitle}>{t.role}</Text>
    <Choice items={candidateRoles.filter(x=>staffCanAssign(clinic.role,x,
     operation.member?.role)).map(x=>({id:x,label:t[x]}))}
     value={newRole} onChange={setNewRole}/>
   </View>}
   <Field title={t.reason} value={reason} onChange={setReason}/>
   <Button title={t.apply} icon="shield" onPress={confirmAction}
    disabled={busy||uncertain||!isSafeOp(operation)}/>
   <Button quiet title={t.cancel} onPress={()=>setOperation(null)}/>
  </Block>}
  <Text style={s.bottomHint}>{t.private}</Text>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:16},
 hero:{padding:20,paddingTop:18,paddingBottom:22,backgroundColor:"#142e48",
  borderRadius:19,gap:10},
 heroTop:{flexDirection:"row",alignItems:"center",gap:8},
 heroEyebrow:{color:"#7bd3d9",fontWeight:"900",fontSize:10,letterSpacing:1},
 heroTitle:{fontSize:25,color:"#fff",fontWeight:"900",lineHeight:34},
 heroSub:{fontSize:12,color:"#bbd2e6",lineHeight:20},
 heroClinic:{color:"#e0eef6",fontSize:11,fontWeight:"800",paddingTop:9,
  borderTopWidth:1,borderTopColor:"#385b73"},
 actions:{flexDirection:"row",flexWrap:"wrap",gap:9},
 button:{flexGrow:1,minHeight:45,borderRadius:11,backgroundColor:"#1d659e",
  flexDirection:"row",alignItems:"center",justifyContent:"center",
  gap:7,paddingHorizontal:13,paddingVertical:11},
 quiet:{backgroundColor:"#edf5fc",borderWidth:1,borderColor:"#d4e5f1"},
 danger:{backgroundColor:"#fff0f1",borderWidth:1,borderColor:"#f5d0d6"},
 buttonText:{color:"#fff",fontWeight:"900",fontSize:11,textAlign:"center"},
 buttonTextQuiet:{color:"#1d6495"},buttonTextDanger:{color:"#a44350"},
 disabled:{opacity:.45},pressed:{opacity:.8},
 block:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dce6ef",borderRadius:16,
  padding:16,gap:13,shadowColor:"#14324b",shadowOpacity:.045,
  shadowRadius:13,shadowOffset:{width:0,height:4},elevation:1},
 blockTitle:{color:"#203d55",fontSize:17,fontWeight:"900",lineHeight:24},
 caption:{color:"#72889a",fontSize:11,lineHeight:19},
 muted:{color:"#678298",fontSize:12,lineHeight:21},
 stack:{gap:12},
 sectionTabs:{flexDirection:"row",backgroundColor:"#e2ebf4",borderRadius:13,padding:4,gap:4},
 sectionTab:{flex:1,alignItems:"center",justifyContent:"center",paddingHorizontal:5,
  paddingVertical:11,minHeight:49,borderRadius:9},
 sectionTabActive:{backgroundColor:"#1e6297"},
 sectionText:{fontSize:10,color:"#527189",fontWeight:"900",textAlign:"center"},
 sectionTextActive:{color:"#fff"},
 metrics:{flexDirection:"row",flexWrap:"wrap",gap:9},
 metric:{width:"47%",flexGrow:1,borderWidth:1,borderColor:"#e2ebf2",borderRadius:13,
  backgroundColor:"#fff",minHeight:106,padding:14,gap:9},
 metricNumber:{fontSize:25,fontWeight:"900",color:"#155e94"},
 metricLabel:{fontSize:11,color:"#667d90",fontWeight:"800"},
 field:{gap:6},fieldTitle:{color:"#395a76",fontSize:12,fontWeight:"900"},
 fieldInput:{borderWidth:1,borderColor:"#d5e4ef",borderRadius:11,
  backgroundColor:"#f7fbfe",paddingHorizontal:13,paddingVertical:10,
  minHeight:46,color:"#24435e",fontSize:13},
 textArea:{minHeight:82,textAlignVertical:"top"},
 chips:{flexDirection:"row",flexWrap:"wrap",gap:7},
 chip:{backgroundColor:"#f5f8fb",borderWidth:1,borderColor:"#dce7f1",
  paddingVertical:10,paddingHorizontal:11,borderRadius:10,minHeight:42,
  justifyContent:"center"},
 chipSelected:{backgroundColor:"#e4f1fb",borderColor:"#3487b6"},
 chipText:{fontSize:10,fontWeight:"800",color:"#59768c"},
 chipTextSelected:{color:"#185d91"},
 memberRow:{flexDirection:"row",alignItems:"center",gap:10,borderRadius:11,
  borderWidth:1,borderColor:"#e6edf4",backgroundColor:"#f7fafc",
  padding:11,minHeight:74},
 avatar:{height:39,width:39,borderRadius:11,alignItems:"center",justifyContent:"center",
  backgroundColor:"#e1eff9"},
 avatarText:{color:"#1a659d",fontWeight:"900",fontSize:18},
 memberInfo:{flex:1,gap:6,minWidth:0},
 memberName:{color:"#234b68",fontWeight:"900",fontSize:12},
 memberSub:{color:"#698297",fontSize:10,lineHeight:16},
 badge:{paddingVertical:7,paddingHorizontal:9,borderRadius:9},
 badgeText:{fontSize:9,color:"#2e7464",fontWeight:"900"},
 invitation:{gap:9,backgroundColor:"#f7fafc",borderRadius:11,
  padding:13,borderWidth:1,borderColor:"#e1eaf3"},
 dataRow:{flexDirection:"row",gap:10,alignItems:"flex-start",paddingVertical:8,
  borderBottomWidth:1,borderBottomColor:"#eef2f5"},
 dataKey:{flex:1,fontSize:11,color:"#6c8397"},
 dataValue:{flex:1,fontSize:11,color:"#27506f",fontWeight:"800",textAlign:"right"},
 profileName:{fontSize:19,color:"#1c415d",fontWeight:"900"},
 doctorCard:{gap:12,padding:14,backgroundColor:"#f7fafc",
  borderWidth:1,borderColor:"#dfe9f1",borderRadius:13},
 verificationRow:{flexDirection:"row",gap:9,alignItems:"center",padding:10,
  borderRadius:9,backgroundColor:"#eaf1f7"},
 dayRow:{gap:12,padding:13,borderRadius:12,backgroundColor:"#f7fafc",
  borderWidth:1,borderColor:"#e2eaf1"},
 dayHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
 dayName:{color:"#204a66",fontWeight:"900",fontSize:13},
 daySwitch:{minHeight:40,borderRadius:9,paddingHorizontal:13,paddingVertical:10,
  backgroundColor:"#e9edf3"},
 daySwitchOn:{backgroundColor:"#def4eb"},
 daySwitchText:{color:"#7c8a99",fontWeight:"900",fontSize:11},
 daySwitchTextOn:{color:"#176f57"},
 error:{fontSize:12,lineHeight:19,color:"#9d3d52",backgroundColor:"#fff2f4",
  padding:12,borderRadius:11,borderWidth:1,borderColor:"#f0d1d7"},
 good:{fontSize:12,lineHeight:19,color:"#207450",backgroundColor:"#e9f7f0",
  padding:12,borderRadius:11,borderWidth:1,borderColor:"#c5e9d6"},
 warning:{fontSize:11,color:"#916324",lineHeight:18,
  padding:12,backgroundColor:"#fff5e7",borderRadius:10},
 warningCard:{gap:11,padding:13,borderWidth:1,borderColor:"#e9d7aa",
  backgroundColor:"#fffcf5",borderRadius:13},
 bottomHint:{fontSize:10,color:"#74879a",lineHeight:17,textAlign:"center",
  paddingBottom:8}
});
