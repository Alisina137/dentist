"use client";
import React, { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authClient, InlineAlert, usePreferences, AdminMfaSetup, LocaleControls } from "./index";
import { Phase02Portal } from "./phase02";
type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;
  membershipId:string;role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
const base=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const labels:Record<string,Record<string,string>>={
 en:{
  appointments:"Appointments",bookingRequests:"Online requests",notifications:"Notifications",clinical:"Clinical",finance:"Finance",listing:"Clinic Listing",myVerification:"My Credentials",settings:"Settings",workspace:"Workspace",operations:"Operations",services:"Services & Pricing",resources:"Chairs & Rooms",hours:"Hours & Holidays",patients:"Patients",staff:"Staff & Resources",team:"Team",dentists:"Dentists",invitations:"Invitations",
  security:"Security & Access",myProfile:"My membership",home:"Overview",account:"Account",
  clinics:"Clinic",role:"Role",status:"Status",email:"Email",name:"Name",
  invitedBy:"Invited by",joined:"Joined",joinedOn:"Joined at",activity:"Activity history",
  active:"Active",suspended:"Suspended",revoked:"Revoked",pending:"Pending",accepted:"Accepted",
  expired:"Expired",invite:"Invite staff",inviteHint:"Invite by verified email. Access starts only when they accept.",
  send:"Send invitation",reason:"Reason (at least 5 characters)",roleChange:"Change role",
  change:"Save role",suspend:"Suspend",reactivate:"Reactivate",revoke:"Revoke access",
  removeInvite:"Revoke invitation",resend:"Resend",expiry:"Expires",
  sent:"Sent",cancel:"Cancel",manager:"Clinic manager",dentist:"Dentist",
  receptionist:"Receptionist",assistant:"Dental assistant",cashier:"Cashier",owner:"Clinic owner",
  assign:"Assign role",grants:"Permissions",mfa:"Authenticator enabled",
  on:"Yes",off:"No",sessions:"Sessions & devices",signoutAll:"Sign out of all devices",
  forceLogout:"Force sign-out",password:"Password reset",lastActivity:"Recent security activity",
  clinicChoice:"Active clinic",chooseClinic:"Choose a clinic",profile:"Professional identity draft",
  displayName:"Professional display name",specialty:"Specialty (unverified)",
  qualifications:"Qualifications (unverified)",license:"Professional license (unverified)",
  experience:"Years of experience (unverified)",bio:"Professional biography",
  saveProfile:"Save draft",version:"Draft version",notPublic:"Draft only. Not verified or public.",
  schedulingLater:"Appointments, patient records and clinic operations are now active. Clinical encounters and billing open in their assigned phases.",
  noStaff:"No staff yet. Invite the first colleague.",noDentists:"No dentists yet. Invite a dentist.",
  noInvites:"No invitations yet.",noHistory:"No security activity recorded.",
  noClinics:"You do not currently have an active clinic membership.",
  missingClinic:"Clinic not found in your memberships. Choose an active clinic.",
  inviteIntro:"You've been invited to join a dental clinic.",
  accept:"Accept invitation",inviteEmail:"The invitation requires a verified account using this exact email.",
  clinicianOn:"Enable dentist draft",clinicianOff:"Disable dentist draft",clinicalAffiliation:"Dentist affiliation",switchAccount:"Switch account",retryLater:"Available after 60 seconds",signup:"Create an account",login:"Sign in",invalid:"Invitation is invalid or has expired.",
  acceptedMessage:"Membership accepted. Open your clinic workspace.",
  rejected:"Invitation cannot be accepted.",notAllowed:"You do not have permission to open this page.",
  updateSuccess:"Changes saved.",sentSuccess:"The invitation was sent.",loading:"Loading…",
  retry:"Retry",error:"Something went wrong",continue:"Continue",back:"Back",
  activateMfa:"Enable an authenticator to manage staff or permissions.",
  noCapacity:"Your current subscription staff limit may prevent a new invitation.",
  suspendedInfo:"Suspended staff cannot access this clinic. Revocation ends membership; another invitation is required.",
  sessionImpact:"Suspension and role changes revoke the staff member's account sessions on all devices.",
  noFake:"Clinic profiles and dentist qualifications are not publicly verified in this release.",
  confirm:"Confirm this action?",filter:"Filter",all:"All",next:"Next",previous:"Previous",
  receipt:"Invitations are emailed. No password or active membership is created automatically.",
  ready:"Your clinic access",overview:"Team overview",lastChanged:"Last changed",
  currentStatus:"Verification status",localOnly:"Your role controls access to active modules; unavailable clinical tabs are hidden.",
  enroll:"Enroll MFA",unavailable:"No active workspace. If you own a clinic, create it to get started.",
  createClinic:"Register a clinic",changeClinic:"Switch clinic",save:"Save",roleReason:"Reason for role change",
  linked:"Clinic affiliation",securityNote:"Security actions are audited. Medical records are not accessible here.",
  people:"Staff members",verification:"Verification",pendingReview:"Unverified draft",
  inviteFailed:"Invitation failed",chooseTab:"View",currentRole:"Current role",
  stale:"Refresh and retry; another administrator may have updated this record.",
  ownerSafe:"Owner privileges cannot be removed from staff management.",
  unpaid:"Subscription plan capacity is enforced before staff invitations."
 },
 "fa-AF":{
  appointments:"وقت‌های ملاقات",clinical:"کلینیکی",finance:"مالی",listing:"نمایش کلینیک",myVerification:"اسناد مسلکی من",settings:"تنظیمات",workspace:"فضای کاری",operations:"عملیات کلینیک",services:"خدمات و قیمت‌ها",resources:"چوکی‌ها و اتاق‌ها",hours:"ساعات و رخصتی‌ها",patients:"مریضان",staff:"کارمندان و منابع",team:"تیم",dentists:"داکتران دندان",invitations:"دعوت‌ها",
  security:"امنیت و دسترسی",myProfile:"عضویت من",home:"نمای کلی",account:"حساب",
  clinics:"کلینیک",role:"نقش",status:"وضعیت",email:"ایمیل",name:"نام",
  invitedBy:"دعوت‌شده توسط",joined:"پیوست",joinedOn:"تاریخ عضویت",activity:"تاریخچه فعالیت",
  active:"فعال",suspended:"تعلیق",revoked:"لغوشده",pending:"در انتظار",accepted:"پذیرفته‌شده",
  expired:"منقضی",invite:"دعوت کارمند",inviteHint:"با ایمیل تأییدشده دعوت کنید؛ دسترسی پس از پذیرش فعال می‌شود.",
  send:"ارسال دعوت",reason:"دلیل (حداقل ۵ حرف)",roleChange:"تغییر نقش",change:"ذخیره نقش",
  suspend:"تعلیق",reactivate:"فعال‌سازی دوباره",revoke:"لغو دسترسی",
  removeInvite:"لغو دعوت",resend:"ارسال مجدد",expiry:"انقضا",
  sent:"ارسال‌شده",cancel:"انصراف",manager:"مدیر کلینیک",dentist:"داکتر دندان",
  receptionist:"پذیرش",assistant:"دستیار دندان",cashier:"حسابدار/صندوق‌دار",owner:"مالک کلینیک",
  assign:"تعیین نقش",grants:"مجوزها",mfa:"تأیید دومرحله‌ای فعال",
  on:"بله",off:"نخیر",sessions:"نشست‌ها و دستگاه‌ها",signoutAll:"خروج از تمام دستگاه‌ها",
  forceLogout:"خروج اجباری",password:"بازیابی رمز",lastActivity:"فعالیت امنیتی اخیر",
  clinicChoice:"کلینیک فعال",chooseClinic:"کلینیک انتخاب کنید",profile:"پیش‌نویس هویت مسلکی",
  displayName:"نام مسلکی",specialty:"تخصص (تأییدنشده)",
  qualifications:"تحصیلات و مدارک (تأییدنشده)",license:"شماره جواز مسلکی (تأییدنشده)",
  experience:"سال‌های تجربه (تأییدنشده)",bio:"معرفی مسلکی",
  saveProfile:"ذخیره پیش‌نویس",version:"نسخه پیش‌نویس",notPublic:"فقط پیش‌نویس؛ نه تأیید شده و نه عمومی.",
  schedulingLater:"وقت‌دهی، ثبت مریضان و تنظیمات کلینیک فعال‌اند؛ معاینات و بل‌ها در مراحل بعدی فعال می‌شوند.",
  noStaff:"هنوز کارمندی نیست. اولین همکار را دعوت کنید.",noDentists:"داکتر دندان ثبت نشده.",
  noInvites:"هنوز دعوتی نیست.",noHistory:"هنوز فعالیت امنیتی ثبت نشده.",
  noClinics:"عضویت فعال کلینیک ندارید.",missingClinic:"کلینیک در عضویت‌های شما نیست.",
  inviteIntro:"شما برای پیوستن به یک کلینیک دندان دعوت شده‌اید.",
  accept:"پذیرفتن دعوت",inviteEmail:"برای پذیرش، حساب تأییدشده با همین ایمیل لازم است.",
  clinicianOn:"فعال‌سازی پیش‌نویس داکتر",clinicianOff:"غیرفعال‌سازی پیش‌نویس داکتر",clinicalAffiliation:"عضویت داکتر دندان",switchAccount:"تغییر حساب",retryLater:"پس از ۶۰ ثانیه قابل ارسال است",signup:"ایجاد حساب",login:"ورود",invalid:"دعوت نامعتبر یا منقضی شده است.",
  acceptedMessage:"عضویت پذیرفته شد. پنل کلینیک را باز کنید.",
  rejected:"این دعوت پذیرفته نمی‌شود.",notAllowed:"اجازه دسترسی به این صفحه را ندارید.",
  updateSuccess:"تغییرات ذخیره شد.",sentSuccess:"دعوت ارسال شد.",loading:"در حال بارگیری…",
  retry:"تلاش دوباره",error:"مشکلی رخ داد",continue:"ادامه",back:"بازگشت",
  activateMfa:"برای مدیریت کارمندان، تأیید دومرحله‌ای را فعال کنید.",
  noCapacity:"محدودیت کارمندان پلن ممکن است مانع دعوت شود.",
  suspendedInfo:"کارمند تعلیق‌شده به کلینیک دسترسی ندارد؛ لغو عضویت به دعوت تازه نیاز دارد.",
  sessionImpact:"تعلیق و تغییر نقش، نشست‌های حساب را در تمام دستگاه‌ها پایان می‌دهد.",
  noFake:"هویت مسلکی و پروفایل داکتران هنوز عمومی یا تأییدشده نیست.",
  confirm:"آیا این اقدام را تأیید می‌کنید؟",filter:"فیلتر",all:"همه",next:"بعدی",previous:"قبلی",
  receipt:"دعوت از طریق ایمیل ارسال می‌شود؛ عضویت خودکار ایجاد نمی‌شود.",
  ready:"دسترسی کلینیک",overview:"نمای کلی تیم",lastChanged:"آخرین تغییر",
  currentStatus:"حالت تأیید",localOnly:"نقش شما دسترسی به بخش‌های فعال را تعیین می‌کند.",
  enroll:"فعال‌سازی تأیید",unavailable:"محیط فعال ندارید؛ برای شروع کلینیک ثبت کنید.",
  createClinic:"ثبت کلینیک",changeClinic:"تغییر کلینیک",save:"ذخیره",roleReason:"دلیل تغییر نقش",
  linked:"عضویت در کلینیک",securityNote:"اقدامات امنیتی ثبت می‌شوند؛ سوابق مریضان در اینجا قابل مشاهده نیست.",
  people:"کارمندان",verification:"تأیید",pendingReview:"پیش‌نویس تأییدنشده",
  inviteFailed:"ارسال دعوت ناموفق",chooseTab:"بخش",currentRole:"نقش فعلی",
  stale:"صفحه را تازه کنید؛ تغییر دیگری ممکن است ثبت شده باشد.",
  ownerSafe:"دسترسی مالک از مدیریت کارمندان لغو نمی‌شود.",unpaid:"ظرفیت پلن قبل از دعوت بررسی می‌شود."
 },
 "ps-AF":{
  appointments:"لیدنې",clinical:"کلینیکي",finance:"مالي چارې",listing:"د کلینیک پېژندنه",myVerification:"زما مسلکي اسناد",settings:"تنظیمات",workspace:"کاري برخه",operations:"د کلینیک چارې",services:"خدمتونه او بیې",resources:"څوکۍ او خونې",hours:"وختونه او رخصتۍ",patients:"ناروغان",staff:"کارکوونکي او سرچینې",team:"ټیم",dentists:"د غاښونو ډاکټران",invitations:"بلنې",
  security:"امنیت او لاسرسی",myProfile:"زما غړیتوب",home:"لنډیز",account:"حساب",
  clinics:"کلینیک",role:"دنده",status:"حالت",email:"برېښنالیک",name:"نوم",
  invitedBy:"بلنه ورکوونکی",joined:"ګډ شوی",joinedOn:"د غړیتوب نېټه",activity:"د کړنو تاریخ",
  active:"فعال",suspended:"ځنډول شوی",revoked:"لغوه شوی",pending:"منتظر",accepted:"منل شوی",
  expired:"پای ته رسېدلی",invite:"کارکوونکی راوبلئ",inviteHint:"په تایید شوي برېښنالیک بلنه واستوئ؛ لاسرسی له منلو وروسته فعالېږي.",
  send:"بلنه واستوئ",reason:"دلیل (لږترلږه ۵ توري)",roleChange:"دنده بدله کړئ",
  change:"دنده خوندي کړئ",suspend:"ځنډول",reactivate:"بیا فعالول",revoke:"لاسرسی لغوه کول",
  removeInvite:"بلنه لغوه کول",resend:"بیا لېږل",expiry:"پای نېټه",
  sent:"لېږل شوی",cancel:"لغوه",manager:"د کلینیک مدیر",dentist:"د غاښونو ډاکټر",
  receptionist:"پذیرش",assistant:"د غاښونو مرستیال",cashier:"حسابدار",owner:"د کلینیک خاوند",
  assign:"دنده ټاکل",grants:"اجازې",mfa:"دوه پړاوه تایید فعال",
  on:"هو",off:"نه",sessions:"ناستې او وسایل",signoutAll:"له ټولو وسایلو وتل",
  forceLogout:"اجباري وتل",password:"پټنوم بیا ټاکل",lastActivity:"وروستۍ امنیتي کړنې",
  clinicChoice:"فعال کلینیک",chooseClinic:"کلینیک غوره کړئ",profile:"د مسلکي پېژندنې مسوده",
  displayName:"مسلکي نوم",specialty:"تخصص (نه دی تایید شوی)",
  qualifications:"اسناد (نه دي تایید شوي)",license:"د جواز شمېره (نه ده تایید شوې)",
  experience:"د تجربې کلونه (نه دي تایید شوي)",bio:"مسلکي پېژندنه",
  saveProfile:"مسوده خوندي کړئ",version:"د مسودې نسخه",notPublic:"یوازې مسوده؛ نه تایید شوې او نه عامه.",
  schedulingLater:"د لیدنو ثبت، د ناروغانو ریکارډونه او د کلینیک چارې فعالې دي؛ طبي اسناد او بیلونه وروسته فعالېږي.",
  noStaff:"تر اوسه کارکوونکي نشته. یو همکار راوبلئ.",noDentists:"ډاکټر نشته.",
  noInvites:"بلنې نشته.",noHistory:"امنیتي کړنې نشته.",
  noClinics:"فعال کلینیکي غړیتوب نه لرئ.",missingClinic:"کلینیک ستاسو په غړیتوب کې نشته.",
  inviteIntro:"تاسو د غاښونو کلینیک ته بلل شوي یاست.",
  accept:"بلنه ومنئ",inviteEmail:"دا بلنه په همدې تایید شوي برېښنالیک منل کېدای شي.",
  clinicianOn:"د ډاکټر مسوده فعاله کړئ",clinicianOff:"د ډاکټر مسوده غیرفعاله کړئ",clinicalAffiliation:"د ډاکټر غړیتوب",switchAccount:"حساب بدلول",retryLater:"له ۶۰ ثانیو وروسته",signup:"حساب جوړول",login:"ننوتل",invalid:"بلنه ناسمه یا پای ته رسېدلې ده.",
  acceptedMessage:"غړیتوب ومنل شو. خپل کلینیک ته لاړ شئ.",
  rejected:"دا بلنه نه منل کېږي.",notAllowed:"دې پاڼې ته اجازه نه لرئ.",
  updateSuccess:"بدلونونه خوندي شول.",sentSuccess:"بلنه ولېږل شوه.",loading:"بارېږي…",
  retry:"بیا هڅه",error:"ستونزه رامنځته شوه",continue:"دوام",back:"شاته",
  activateMfa:"د کارکوونکو د مدیریت لپاره دوه پړاوه تایید فعال کړئ.",
  noCapacity:"د پلان د کارکوونکو حد ښايي د بلنې مخه ونیسي.",
  suspendedInfo:"ځنډول شوی کس کلینیک ته لاسرسی نه لري؛ د لغوه شوي غړیتوب لپاره نوې بلنه پکار ده.",
  sessionImpact:"دنده بدلول او ځنډول له ټولو وسایلو ناستې بندوي.",
  noFake:"د ډاکټر هویت لا په عامه ډول تایید نه دی.",
  confirm:"ایا دا کار تاییدوئ؟",filter:"چاڼ",all:"ټول",next:"بل",previous:"مخکېنی",
  receipt:"بلنه په برېښنالیک ځي؛ غړیتوب په خپله نه جوړېږي.",
  ready:"د کلینیک لاسرسی",overview:"د ټیم لنډیز",lastChanged:"وروستی بدلون",
  currentStatus:"د تایید حالت",localOnly:"ستاسې دنده فعالې برخې ټاکي.",
  enroll:"تایید فعال کړئ",unavailable:"فعال کلینیک نشته؛ نوی کلینیک ثبت کړئ.",
  createClinic:"کلینیک ثبت کړئ",changeClinic:"کلینیک بدل کړئ",save:"خوندي کول",
  roleReason:"د دندې د بدلون دلیل",linked:"په کلینیک کې غړیتوب",
  securityNote:"امنیتي کړنې ثبتېږي؛ د ناروغانو معلومات دلته نشته.",
  people:"کارکوونکي",verification:"تایید",pendingReview:"ناتایید شوې مسوده",
  inviteFailed:"بلنه ونه لېږل شوه",chooseTab:"برخه",currentRole:"اوسنۍ دنده",
  stale:"پاڼه تازه کړئ؛ بل بدلون شوی وي.",ownerSafe:"د مالک لاسرسی نه لغوه کېږي.",
  unpaid:"د پلان ظرفیت د بلنې تر مخه کتل کېږي."
 }
};
function useLang(){
 const {locale,calendar}=usePreferences();
 const t=(key:string)=>labels[locale]?.[key]||labels.en[key]||key;
 const date=(v:unknown)=>v?new Intl.DateTimeFormat(locale,{calendar:calendar==="solar_hijri"?"persian":"gregory",
   timeZone:"Asia/Kabul",year:"numeric",month:"short",day:"numeric"}).format(new Date(String(v))):"—";
 return {t,date,locale};
}
async function api(path:string,method="GET",body?:unknown):Promise<any>{
 const result=await fetch(base+"/v1/team"+path,{method,credentials:"include",
  cache:"no-store",headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Object.assign(new Error(data.code||"NETWORK"),{status:result.status});
 return data;
}
function useData(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [number,setNumber]=useState(0);
 const reload=()=>{setData(null);setNumber(v=>v+1);};
 useEffect(()=>{
  if(!path){setData(null);return;}
  let alive=true;setData(null);setError("");
  api(path).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[path,number]);
 return {data,error,reload};
}
function Banner({children,kind="info"}:{children:ReactNode,kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Busy(){const {t}=useLang();return <div className="card panel"><Banner>{t("loading")}</Banner></div>;}
function ErrorBox({error,retry}:{error:string,retry:()=>void}){
 const {t}=useLang();return <div className="card panel"><Banner kind="error">{t("error")}: {error}</Banner>
   <button type="button" className="btn btn-secondary" onClick={retry}>{t("retry")}</button></div>;
}
function Empty({text}:{text:string}){return <div className="team-empty">{text}</div>;}
function Badge({value}:{value:string}){const {t}=useLang();return <span className={"state-badge state-"+value}>{t(value)}</span>;}
function Field({label,value,onChange,type="text",required=false,maxLength}:{label:string,value:string|number|null|undefined,
  onChange:(s:string)=>void,type?:string,required?:boolean,maxLength?:number}){
 return <label className="field"><span>{label}{required?" *":""}</span>
   <input type={type} value={value??""} required={required} maxLength={maxLength}
   onChange={e=>onChange(e.currentTarget.value)} /></label>;
}
function Select({label,value,onChange,options}:{label:string,value:string,onChange:(s:string)=>void,
 options:{value:string;label:string}[]}){
 return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>
   {options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
}
function Permission(){const {t}=useLang();return <Banner>{t("localOnly")}</Banner>;}
function navigation(space:Space,t:(key:string)=>string){
 const clinic="?clinic="+encodeURIComponent(space.clinicId);
 const link=(key:string,path:string,icon:string,group:string)=>({
  title:t(key),href:path+clinic,key,icon,group
 });
 const home=link("home","/clinic","⌂","workspace");
 const appointments=link("appointments","/clinic/appointments","▦","workspace");
 const bookingRequests=link("bookingRequests","/clinic/appointments/requests","◷","workspace");
 const notifications=link("notifications","/clinic/settings/notifications","✉","settings");
 const patients=link("patients","/clinic/patients","♧","workspace");
 const clinical=link("clinical","/clinic/clinical","✚","workspace");
 const finance=link("finance","/clinic/finance","▤","workspace");
 const listing=link("listing","/clinic/listing","◈","workspace");
 const myVerification=link("myVerification","/clinic/credentials","◈","workspace");
 const staff=link("staff","/clinic/staff","◉","operations");
 const resources=link("resources","/clinic/resources","▦","operations");
 const services=link("services","/clinic/services","✦","operations");
 const hours=link("hours","/clinic/settings/hours","◷","operations");
 const security=link("security","/clinic/settings/security","⛨","settings");
 const profile=link("myProfile","/clinic/staff/"+space.membershipId,"◎","settings");
 const options=[home];
 if(space.role==="owner"||space.role==="manager"){
  options.push(appointments,bookingRequests,patients,clinical,finance,listing,staff,resources,services,hours,notifications,security);
 }else if(space.role==="dentist"||space.role==="receptionist"){
  options.push(appointments,bookingRequests,patients,...(space.role==="dentist"?[clinical,myVerification]:[finance]),resources,services,hours,profile,security);
 }else if(space.role==="assistant"){
  options.push(appointments,clinical,profile,security);
 }else if(space.role==="cashier"){
  options.push(finance,patients,profile,security);
 }else options.push(profile,security);
 return options;
}
export function Shell({ctx,space,active,children}:{ctx:Context,space:Space,active:string,children:ReactNode}){
 const {t}=useLang();const nav=navigation(space,t);
 const pageHasOwnHeading=["patients","services","resources","hours","appointments","bookingRequests","notifications","clinical","finance","listing","myVerification"].includes(active);
 return <div className="work-layout phase-layout staff-shell">
  <aside className="card side-panel staff-side">
    <div className="pill">{t(space.role)}</div>
    <div className="staff-tenant-title">{space.clinicName}</div>
    <div className="staff-desktop-menu"><NavLinks nav={nav} active={active}/></div>
    <details className="staff-phone-menu"><summary>{t("chooseTab")}</summary><NavLinks nav={nav} active={active}/></details>
    <div className="staff-side-locale"><LocaleControls/></div>
  </aside>
  <section className="work-content staff-content">
    <header className={"work-heading"+(pageHasOwnHeading?" phase04-shell-topbar":"")}>
      <div><div className="pill">DandanLink · {pageHasOwnHeading?t("workspace"):t("staff")}</div>
       {!pageHasOwnHeading&&<h1 className="staff-page-heading">{t(active)||t("ready")}</h1>}
       <p className="muted">{ctx.name}</p></div>
      <button className="btn btn-secondary" onClick={async()=>{await authClient.signOut();location.assign("/clinic/login");}}>
        {t("account")} · ↪</button>
    </header>
    {ctx.clinics.length>1&&<div className="staff-switch"><Select label={t("changeClinic")} value={space.clinicId}
      options={ctx.clinics.map(c=>({value:c.clinicId,label:c.clinicName+" — "+t(c.role)}))}
      onChange={id=>{sessionStorage.removeItem("dandan.current.clinic");location.assign("/clinic?clinic="+encodeURIComponent(id));}}/></div>}
    {children}
  </section>
 </div>;
}
function NavLinks({nav,active}:{nav:{title:string;href:string;key:string;icon:string;group:string}[],active:string}){
 const {t}=useLang();let lastGroup="";
 return <nav aria-label="Clinic navigation" className="side-nav phase04-side-nav">
  {nav.map(item=>{
   const groupLabel=lastGroup!==item.group?item.group:null;
   lastGroup=item.group;
   return <React.Fragment key={item.href}>
    {groupLabel&&<span className="phase04-side-group">{t(groupLabel)}</span>}
    <a href={item.href} aria-current={active===item.key?"page":undefined}
     className="phase04-side-link"><span className="phase04-side-icon" aria-hidden="true">
      {item.icon}</span><span>{item.title}</span></a>
   </React.Fragment>;
  })}
 </nav>;
}
function useContextAndSpace(){
 const {data,error,reload}=useData("/context");
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 useEffect(()=>{setRequested(new URLSearchParams(location.search).get("clinic"));},[]);
 const spaces=(data as Context|undefined)?.clinics||[];
 const selected=requested===undefined?undefined:requested?spaces.find(x=>x.clinicId===requested):spaces[0];
 return {ctx:data as Context|null,space:selected as Space|undefined,error,reload,requested};
}
function Guard({children}:{children:(ctx:Context,space:Space)=>ReactNode}){
 const {t}=useLang();const {ctx,space,error,reload,requested}=useContextAndSpace();
 if(error==="AUTH_REQUIRED")return <div className="page-narrow"><Banner kind="warning">{t("login")}</Banner>
  <p><a className="btn btn-primary" href="/clinic/login">{t("login")}</a></p></div>;
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!ctx||requested===undefined)return <Busy/>;
 if(!space){
  return <div className="page-narrow card panel">
    <Banner kind="warning">{requested?t("missingClinic"):t("noClinics")}</Banner>
    <div className="phase-actions"><a href="/clinic/onboarding" className="btn btn-primary">{t("createClinic")}</a>
    <a href="/clinic" className="btn btn-secondary">{t("home")}</a></div>
  </div>;
 }
 return <>{children(ctx,space)}</>;
}
export function ClinicWorkspace(){
 const {t}=useLang();
 const {ctx,space,error,reload,requested}=useContextAndSpace();
 if(error==="AUTH_REQUIRED")return <div className="page-narrow"><Banner kind="warning">{t("login")}</Banner>
    <a className="btn btn-primary" href="/clinic/login">{t("login")}</a></div>;
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!ctx||requested===undefined)return <Busy/>;
 // Owners keep the already functional PH02 onboarding/subscription workspace.
 if(!requested && !space)return <Phase02Portal audience="clinic" view="dashboard"/>;
 if(requested && !space)return <div className="page-narrow card panel"><Banner kind="error">{t("missingClinic")}</Banner>
    <a className="btn btn-secondary" href="/clinic">{t("home")}</a></div>;
 if(!space)return <Phase02Portal audience="clinic" view="dashboard"/>;
 if(space.role==="owner")return <Phase02Portal audience="clinic" view="dashboard"/>;
 return <Shell ctx={ctx} space={space} active="home">
  <section className="card panel"><h2>{t("ready")}</h2>
    <div className="staff-role-summary">
      <div><small className="muted">{t("clinics")}</small><strong>{space.clinicName}</strong></div>
      <div><small className="muted">{t("role")}</small><strong>{t(space.role)}</strong></div>
      <div><small className="muted">{t("status")}</small><Badge value="active"/></div>
    </div>
    <p className="muted">{t("schedulingLater")}</p><Permission/>
    <div className="phase-actions">
      {(space.role==="manager")?<a href={"/clinic/staff?clinic="+space.clinicId}
        className="btn btn-primary">{t("staff")}</a>:<a href={"/clinic/staff/"+space.membershipId+"?clinic="+space.clinicId}
        className="btn btn-primary">{t("myProfile")}</a>}
      <a className="btn btn-secondary" href={"/clinic/settings/security?clinic="+space.clinicId}>{t("security")}</a>
    </div>
  </section>
 </Shell>;
}
export function StaffPortal({view}:{view:"staff"|"security"|"detail"}){
 return <Guard>{(ctx,space)=><StaffRoute ctx={ctx} space={space} view={view}/>}</Guard>;
}
function StaffRoute({ctx,space,view}:{ctx:Context,space:Space,view:"staff"|"security"|"detail"}){
 const {t}=useLang();
 if(view==="staff"&&!space.capabilities.includes("staff.read")){
  return <Shell ctx={ctx} space={space} active="staff"><div className="card panel"><Banner kind="error">{t("notAllowed")}</Banner>
   <a className="btn btn-secondary" href={"/clinic/staff/"+space.membershipId+"?clinic="+space.clinicId}>{t("myProfile")}</a></div></Shell>;
 }
 return <Shell ctx={ctx} space={space} active={view==="detail"?"myProfile":view==="staff"?"staff":"security"}>
   {view==="staff"?<TeamHub ctx={ctx} space={space}/>:view==="security"?<SecurityPanel ctx={ctx} space={space}/>:
     <StaffDetail ctx={ctx} space={space}/>}
 </Shell>;
}
function TeamHub({ctx,space}:{ctx:Context,space:Space}){
 const {t}=useLang();
 const [tab,setTab]=useState("team");
 useEffect(()=>{const requested=new URLSearchParams(location.search).get("tab");
  if(["team","dentists","invitations"].includes(requested||""))setTab(requested!);},[]);
 const url=(kind:string)=>"/clinic/staff?clinic="+encodeURIComponent(space.clinicId)+"&tab="+kind;
 return <div><h2>{t("staff")}</h2>
  <div className="phase-tabs" role="tablist" aria-label={t("staff")}>
    {["team","dentists","invitations"].map(key=><a href={url(key)} className={"team-tab "+(tab===key?"current":"")}
       key={key} role="tab" aria-selected={tab===key}>{t(key)}</a>)}
  </div>
  {tab==="team"?<TeamList space={space}/>:tab==="dentists"?<DentistList space={space}/>:
    <Invitations space={space} ctx={ctx}/>}
 </div>;
}
function TeamList({space}:{space:Space}){
 const {t,date}=useLang();const {data,error,reload}=useData("/clinics/"+space.clinicId+"/team");
 const [filter,setFilter]=useState("all");
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 const people=data.members.filter((m:any)=>filter==="all"||m.status===filter);
 return <section className="card panel"><div className="staff-panel-heading">
  <h2>{t("team")}</h2><Select label={t("filter")} value={filter} onChange={setFilter}
  options={["all","active","suspended","revoked"].map(value=>({value,label:t(value)}))}/></div>
  {!people.length?<Empty text={t("noStaff")}/>:<div className="staff-scroll">
   <table className="staff-table"><thead><tr><th>{t("name")}</th><th>{t("role")}</th>
    <th>{t("status")}</th><th>{t("joinedOn")}</th><th>{t("verification")}</th></tr></thead>
    <tbody>{people.map((m:any)=><tr key={m.id}><td>
      <a className="text-link" href={"/clinic/staff/"+m.id+"?clinic="+space.clinicId}>{m.name}</a>
      <div className="muted staff-small" dir="ltr">{m.email}</div></td>
      <td>{t(m.role)}</td><td><Badge value={m.status}/></td>
      <td>{date(m.joinedAt)}</td><td>{m.mfaEnabled?t("on"):t("off")}</td></tr>)}</tbody>
   </table></div>}
  <div className="phase-actions"><a className="btn btn-primary" href={"/clinic/staff?clinic="+space.clinicId+"&tab=invitations"}>
    {t("invite")}</a></div>
 </section>;
}
function DentistList({space}:{space:Space}){
 const {t}=useLang();const {data,error,reload}=useData("/clinics/"+space.clinicId+"/dentists");
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 return <section className="card panel"><h2>{t("dentists")}</h2>
  {!data.dentists.length?<Empty text={t("noDentists")}/>:<div className="staff-dentist-grid">
    {data.dentists.map((m:any)=><article key={m.id} className="staff-dentist-card">
      <div className="staff-dentist-avatar">{m.name?.slice(0,1)}</div>
      <div className="staff-dentist-info"><h3>{m.draft?.displayName||m.name}</h3>
      <p>{m.draft?.specialty||t("pendingReview")}</p>
      <Badge value={m.status}/><p className="muted staff-small">{t("notPublic")}</p>
      <a className="text-link" href={"/clinic/staff/"+m.id+"?clinic="+space.clinicId}>{t("myProfile")} ›</a></div>
    </article>)}</div>}
  <div className="phase-actions"><a className="btn btn-secondary" href={"/clinic/staff?clinic="+space.clinicId+"&tab=invitations"}>
    {t("invite")}</a></div>
 </section>;
}


function Invitations({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const {data,error,reload}=useData("/clinics/"+space.clinicId+"/invitations");
 const [email,setEmail]=useState(""),[role,setRole]=useState("receptionist");
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[success,setSuccess]=useState("");
 const [reason,setReason]=useState(""),[page,setPage]=useState(1),[filter,setFilter]=useState("pending");
 const roles=["dentist","receptionist","assistant","cashier",...(space.role==="owner"?["manager"]:[])];
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setFailure("");setSuccess("");
  try{
   await api("/clinics/"+space.clinicId+"/invitations","POST",{email,role});
   setEmail("");setSuccess(t("sentSuccess"));reload();
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 async function action(id:string,operation:"resend"|"revoke"){
  if(operation==="revoke" && (!reason.trim()||!window.confirm(t("confirm"))))return;
  setBusy(true);setFailure("");setSuccess("");
  try{
   await api("/clinics/"+space.clinicId+"/invitations/"+id+"/"+operation,"POST",
     operation==="revoke"?{reason}:undefined);
   reload();setReason("");setSuccess(t("updateSuccess"));
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 const entries=(data?.invitations||[]).filter((i:any)=>filter==="all"||i.status===filter);
 const pages=Math.max(1,Math.ceil(entries.length/5));
 if(!ctx.mfaEnabled)return <section className="card panel">
  <Banner kind="warning">{t("activateMfa")}</Banner>
  <AdminMfaSetup home={"/clinic/staff?clinic="+space.clinicId+"&tab=invitations"}/>
 </section>;
 return <div className="staff-gap">
  <section className="card panel"><h2>{t("invite")}</h2><p className="muted">{t("inviteHint")}</p>
   <form className="staff-invite-form" onSubmit={submit}>
    <Field label={t("email")} value={email} type="email" required maxLength={160} onChange={setEmail}/>
    <Select label={t("role")} value={role} onChange={setRole}
      options={roles.map(value=>({value,label:t(value)}))}/>
    <button className="btn btn-primary" disabled={busy||!email.trim()}>{busy?t("loading"):t("send")}</button>
   </form>
   <p className="muted staff-small">{t("receipt")} {t("unpaid")}</p>
   {failure&&<Banner kind="error">{t("inviteFailed")}: {failure}</Banner>}
   {success&&<Banner kind="success">{success}</Banner>}
  </section>
  <section className="card panel"><div className="staff-panel-heading"><h2>{t("invitations")}</h2>
   <Select label={t("filter")} value={filter} onChange={v=>{setFilter(v);setPage(1);}}
    options={["pending","all","expired","accepted","revoked"].map(value=>({value,label:t(value)}))}/></div>
   {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:
    entries.length? <div className="phase-list">{entries.slice((page-1)*5,page*5).map((i:any)=>
     <article className="staff-invitation-row" key={i.id}>
      <div><strong dir="ltr">{i.email}</strong><div className="staff-small muted">{t(i.role)} · {date(i.expiresAt)} {i.resolutionReason?" · "+i.resolutionReason:""}</div></div>
      <div className="staff-invite-actions"><Badge value={i.status}/>
       {(i.status==="pending"||i.status==="expired")&&
         <button className="btn btn-secondary" disabled={busy||
           (i.sentAt && Date.now()-new Date(i.sentAt).getTime()<60000)}
           title={i.sentAt&&Date.now()-new Date(i.sentAt).getTime()<60000?t("retryLater"):undefined}
           onClick={()=>action(i.id,"resend")}>{t("resend")}</button>}
       {i.status==="pending"&&
         <button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
          onClick={()=>action(i.id,"revoke")}>{t("removeInvite")}</button>}
      </div>
     </article>)}</div>:<Empty text={t("noInvites")}/>}
   <div className="phase-pagination">
    <button className="btn btn-secondary" disabled={page===1} onClick={()=>setPage(v=>v-1)}>{t("previous")}</button>
    <span>{page} / {pages}</span>
    <button className="btn btn-secondary" disabled={page>=pages} onClick={()=>setPage(v=>v+1)}>{t("next")}</button>
   </div>
   <Field label={t("reason")} value={reason} onChange={setReason} maxLength={300}/>
  </section>
 </div>;
}
function SecurityPanel({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const canManage=space.capabilities.includes("security.read");
 const {data,error,reload}=useData(canManage?"/clinics/"+space.clinicId+"/security":null);
 const {data:sessions,error:sessionError,reload:reloadSessions}=useData("/sessions");
 const [reason,setReason]=useState("Close unused sessions");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function allLogout(){
  if(!window.confirm(t("confirm")))return;
  setBusy(true);setNotice("");
  try{
   await api("/sessions/revoke","POST",{reason});
   location.assign("/clinic/login");
  }catch(e){setNotice((e as Error).message);setBusy(false);}
 }
 return <div className="staff-gap">
  <section className="card panel"><h2>{t("security")}</h2>
   <Banner>{t("securityNote")}</Banner>
   <div className="phase-actions"><a className="btn btn-secondary" href="/clinic/reset-password">{t("password")}</a></div>
  </section>
  {canManage&&<section className="card panel"><h2>{t("people")} · {t("security")}</h2>
   {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:
    <div className="staff-scroll"><table className="staff-table"><thead><tr>
      <th>{t("name")}</th><th>{t("role")}</th><th>{t("status")}</th>
      <th>{t("mfa")}</th><th>{t("lastChanged")}</th>
     </tr></thead><tbody>{data.access.map((m:any)=><tr key={m.id}>
      <td><a className="text-link" href={"/clinic/staff/"+m.id+"?clinic="+space.clinicId}>{m.name}</a>
       <div className="muted staff-small" dir="ltr">{m.email}</div></td>
      <td>{t(m.role)}</td><td><Badge value={m.status}/></td>
      <td>{t(m.mfaEnabled?"on":"off")}</td><td>{date(m.changedAt)}</td>
     </tr>)}</tbody></table></div>}
  </section>}
  <section className="card panel"><h2>{t("sessions")}</h2>
   {sessionError?<ErrorBox error={sessionError} retry={reloadSessions}/>:!sessions?<Busy/>:
    !sessions.sessions.length?<Empty text={t("noHistory")}/>:
    <div className="phase-list">{sessions.sessions.map((s:any)=><div className="phase-row phase-list-item" key={s.id}>
      <div><strong>{s.userAgent||t("account")}</strong><p className="muted">{date(s.createdAt)} · {date(s.expiresAt)}</p></div>
      <Badge value="active"/>
    </div>)}</div>}
   <div className="phase-form">
    <Field label={t("reason")} value={reason} onChange={setReason} maxLength={300}/>
    <button className="btn btn-secondary" disabled={busy||reason.trim().length<5} onClick={allLogout}>{t("signoutAll")}</button>
   </div>
   {notice&&<Banner kind="error">{notice}</Banner>}
  </section>
  {canManage&&<section className="card panel"><h2>{t("lastActivity")}</h2>
   {!data?<Busy/>:!data.events?.length?<Empty text={t("noHistory")}/>:
    <div className="phase-list">{data.events.map((e:any)=><div key={e.id} className="phase-row phase-list-item">
      <div><strong>{e.action}</strong><p className="muted">{date(e.createdAt)} · {e.outcome}</p></div>
      <span className="muted staff-small">{e.subjectId||"—"}</span>
    </div>)}</div>}
  </section>}
 </div>;
}
function StaffDetail({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const [memberId,setMemberId]=useState("");
 useEffect(()=>{setMemberId(location.pathname.split("/").filter(Boolean).at(-1)||"");},[]);
 const {data,error,reload}=useData(memberId?"/clinics/"+space.clinicId+"/staff/"+memberId:null);
 const [role,setRole]=useState(""),[reason,setReason]=useState("");
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(""),[notice,setNotice]=useState("");
 const [draft,setDraft]=useState<any>(null);
 useEffect(()=>{
  if(data?.member)setRole(data.member.role);
  if(data?.draft)setDraft(data.draft);
  else if(data?.canEditDentist)setDraft({
   displayName:data.member.name,specialty:"",qualifications:"",
   professionalLicense:"",experienceYears:"",biography:"",draftVersion:0
  });
 },[data]);
 async function action(path:string,body:any,destructive=false){
  if(destructive&&!window.confirm(t("confirm")))return;
  setProblem("");setNotice("");setBusy(true);
  try{
   await api("/clinics/"+space.clinicId+"/staff/"+memberId+path,"POST",body);
   reload();setNotice(t("updateSuccess"));setReason("");
  }catch(e){setProblem((e as Error).message);}finally{setBusy(false);}
 }
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 const member=data.member;
 const manager=space.role==="manager";
 const options=["dentist","receptionist","assistant","cashier",...(manager?[]:["manager"])];
 return <div className="staff-gap">
  <a className="text-link" href={space.capabilities.includes("staff.read")?
    "/clinic/staff?clinic="+space.clinicId:"/clinic?clinic="+space.clinicId}>{t("back")} ←</a>
  <section className="card panel"><div className="phase-row"><div>
    <h2>{member.name}</h2><span dir="ltr" className="muted">{member.email}</span></div>
    <Badge value={member.status}/></div>
   <div className="staff-role-summary">
    <div><small className="muted">{t("currentRole")}</small><strong>{t(member.role)}</strong></div>
    <div><small className="muted">{t("joinedOn")}</small><strong>{date(member.joinedAt)}</strong></div>
    <div><small className="muted">{t("mfa")}</small><strong>{t(member.mfaEnabled?"on":"off")}</strong></div>
   </div>
   <Banner>{t("sessionImpact")}</Banner>
  </section>
  {data.canManage&&<section className="card panel"><h2>{t("roleChange")}</h2>
   {!ctx.mfaEnabled?<div><Banner kind="warning">{t("activateMfa")}</Banner>
    <AdminMfaSetup home={typeof window !== "undefined" ? window.location.pathname+window.location.search : "/clinic/staff"}/></div>:<>
    <div className="staff-roles-controls">
      <Select label={t("assign")} value={role} onChange={setRole}
       options={options.map(value=>({value,label:t(value)}))}/>
      <Field label={t("reason")} value={reason} onChange={setReason} maxLength={300}/>
    </div>
    <div className="phase-actions">
      <button className="btn btn-primary" disabled={busy||role===member.role||reason.trim().length<5}
       onClick={()=>action("/role",{role,reason},true)}>{t("change")}</button>
      {member.status==="active"&&<button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
       onClick={()=>action("/status",{action:"suspend",reason},true)}>{t("suspend")}</button>}
      {member.status==="suspended"&&<button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
       onClick={()=>action("/status",{action:"reactivate",reason},true)}>{t("reactivate")}</button>}
      {member.status!=="revoked"&&<button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
       onClick={()=>action("/status",{action:"revoke",reason},true)}>{t("revoke")}</button>}
      <button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
       onClick={()=>action("/force-logout",{reason},true)}>{t("forceLogout")}</button>
    </div>
    <p className="muted staff-small">{t("ownerSafe")} {t("suspendedInfo")}</p>
   </>}
  </section>}
  {data.canManage&&space.role==="owner"&&member.role==="manager"&&ctx.mfaEnabled&&
   <section className="card panel"><h2>{t("clinicalAffiliation")}</h2>
    <p className="muted">{t("notPublic")}</p>
    <button className="btn btn-secondary" disabled={busy||reason.trim().length<5}
     onClick={()=>action("/clinician",{enabled:!member.clinicianEnabled,reason},true)}>
     {t(member.clinicianEnabled?"clinicianOff":"clinicianOn")}</button>
    <p className="muted staff-small">{t("roleReason")}: {t("reason")}</p>
   </section>}
  {member.reason&&<Banner kind="warning">{t("reason")}: {member.reason}</Banner>}
  {(member.role==="dentist"||member.clinicianEnabled||data.canEditDentist)&&draft&&<section className="card panel">
   <h2>{t("profile")}</h2><Banner kind="warning">{t("notPublic")}</Banner>
   <form className="phase-form" onSubmit={e=>{e.preventDefault();
    action("/dentist",{...draft,draftVersion:draft.draftVersion});}}>
    <div className="phase-form-grid">
      {(["displayName","specialty","qualifications","professionalLicense","experienceYears"] as const)
       .map(key=><Field key={key} label={t(key==="professionalLicense"?"license":key==="experienceYears"?"experience":key)}
        value={draft[key]} type={key==="experienceYears"?"number":"text"} onChange={v=>setDraft((d:any)=>({...d,[key]:v}))}/>)}
    </div>
    <label className="field"><span>{t("bio")}</span>
      <textarea rows={4} maxLength={1000} value={draft.biography||""}
       onChange={e=>setDraft((d:any)=>({...d,biography:e.target.value}))}/></label>
    {data.canEditDentist&&(ctx.mfaEnabled||member.email===ctx.email)
      ?<button className="btn btn-primary" disabled={busy}>{t("saveProfile")}</button>
      :data.canEditDentist?<Banner kind="warning">{t("activateMfa")}</Banner>:null}
   </form>
   <p className="muted">{t("version")}: {draft.draftVersion} · {t("pendingReview")}</p>
  </section>}
  {data.events?.length>0&&<section className="card panel"><h2>{t("activity")}</h2>
   {data.events.map((ev:any,i:number)=><p key={i}>{date(ev.createdAt)} · {ev.action} · {ev.outcome}</p>)}
  </section>}
  {problem&&<Banner kind="error">{problem}</Banner>}{notice&&<Banner kind="success">{notice}</Banner>}
 </div>;
}
export function InvitationAccept(){
 const {t,date}=useLang();
 const [raw,setRaw]=useState<string|null>(null);
 useEffect(()=>{setRaw(new URLSearchParams(location.search).get("token")||"");},[]);
 const {data,error,reload}=useData(raw?"/invitations/preview?token="+encodeURIComponent(raw):null);
 const {data:ctx,error:authError}=useData("/context");
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(""),[accepted,setAccepted]=useState<any>(null);
 async function accept(){
  setBusy(true);setProblem("");
  try{
   const result=await api("/invitations/accept","POST",{token:raw});setAccepted(result);
   window.history.replaceState(null,"","/clinic/invite");
  }catch(e){setProblem((e as Error).message);}finally{setBusy(false);}
 }
 if(raw===null)return <Busy/>;
 if(!raw)return <div className="page-narrow card panel"><Banner kind="error">{t("invalid")}</Banner></div>;
 if(error)return <div className="page-narrow card panel"><Banner kind="error">{t("invalid")}</Banner>
   <p className="muted">{error}</p></div>;
 if(!data)return <Busy/>;
 const next="/clinic/invite?token="+encodeURIComponent(raw);
 return <div className="page-narrow"><section className="card panel">
   <span className="pill">{t("invitations")}</span><h1 className="staff-invite-heading">{t("inviteIntro")}</h1>
   <div className="staff-role-summary">
    <div><small className="muted">{t("clinics")}</small><strong>{data.clinicName}</strong></div>
    <div><small className="muted">{t("role")}</small><strong>{t(data.role)}</strong></div>
    <div><small className="muted">{t("expiry")}</small><strong>{date(data.expiresAt)}</strong></div>
   </div>
   <p>{t("inviteEmail")} <bdi dir="ltr">{data.emailHint}</bdi></p>
   {accepted?<div><Banner kind="success">{t("acceptedMessage")}</Banner>
    <div className="phase-actions"><a className="btn btn-primary" href={"/clinic?clinic="+accepted.clinicId}>
      {t("continue")}</a></div></div>:
     data.status!=="pending"?<Banner kind="warning">{t("invalid")} ({t(data.status)})</Banner>:
     authError==="AUTH_REQUIRED"?<div className="phase-actions">
      <a className="btn btn-primary" href={"/clinic/login?next="+encodeURIComponent(next)}>{t("login")}</a>
      <a className="btn btn-secondary" href={"/clinic/signup?next="+encodeURIComponent(next)}>{t("signup")}</a></div>:
     authError?<ErrorBox error={authError} retry={()=>location.reload()}/>:
     !ctx?<Busy/>:
     <div className="phase-actions"><button className="btn btn-primary" onClick={accept}
       disabled={busy}>{busy?t("loading"):t("accept")}</button>
       <button className="btn btn-secondary" onClick={async()=>{
         await authClient.signOut();location.assign(next);
       }}>{t("switchAccount")}</button></div>}
   {problem&&<Banner kind="error">{t("rejected")}: {problem}</Banner>}
   <p className="muted staff-small">{t("receipt")}</p>
 </section></div>;
}
