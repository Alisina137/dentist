"use client";
import React,{useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {authClient,InlineAlert,LocaleControls,usePreferences} from "./index";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Lang="en"|"fa-AF"|"ps-AF";
type Account={
 registered:boolean;
 user:{id:string;name:string;email:string;emailVerified:boolean;locale:Lang;
 calendar:"gregorian"|"solar_hijri";joinedAt:string};
 profile:Profile|null;
 onboarding:{termsVersion:string;privacyVersion:string;requiresAdultAttestation:boolean;
 accountAndBookingFree:boolean};
 publicBookingsEnabled:false;clinicalRecordLinksEnabled:false};
type Profile={preferredName:string;city:string;phone:string|null;phoneVerified:false;
 legalVersion:string;privacyVersion:string;acceptedAt:string;revision:number;
 createdAt:string;updatedAt:string;avatar:{kind:string;initials:string}};
type Family={members:FamilyMember[];total:number;limit:number;policy:{
 minorAgeLimit:number;guardianPolicyVersion:string;
 adultRequiresIndependentAccountAcceptance:boolean;clinicRecordAccessViaName:false}};
type FamilyMember={id:string;memberType:"minor"|"adult";displayName:string;relationship:string;
 dateOfBirth:string|null;age:number|null;authorization:string;authorizationStatus:string;
 eligibleForFutureBooking:boolean;revision:number;createdAt:string};
type Invitation={id:string;guardianName:string;createdAt:string;expiresAt:string;
 authorizationActive:false};
type Delegation={id:string;guardianName:string;revision:number;createdAt:string};
type Preferences={locale:Lang;calendar:"gregorian"|"solar_hijri";
 notifications:{emailBookings:boolean;emailUpdates:boolean;smsEnabled:false;pushEnabled:false;
 emailDeliveryConfigured:boolean;bookingNotificationsReleased:false;phase:"PH15"};
 privacy:{clinicalRecordsShared:false;linkedClinics:0;explanation:string};revision:number};
type Session={id:string;createdAt:string;expiresAt:string;device:string;ipAddress:string|null};
type ConsentEvent={subjectType:string;subjectId:string|null;consent:boolean;
 policyVersion:string;createdAt:string};
type Failure=Error&{code?:string;status?:number};
async function request<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(API+"/v1/patients"+path,{method,credentials:"include",
 cache:"no-store",headers:body===undefined?{}:{"Content-Type":"application/json"},
 body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){
  const data=await response.json().catch(()=>({})) as {code?:string};
  throw Object.assign(new Error(data.code||"ACCOUNT_UNAVAILABLE"),{
   status:response.status,code:data.code||"ACCOUNT_UNAVAILABLE"}) as Failure;
 }
 return response.json() as Promise<T>;
}
function safeNext(raw:string|null,fall="/account"){
 if(!raw||!raw.startsWith("/")||raw.startsWith("//")||raw.includes("\\")||
  raw.includes("\n")||raw.includes("\r"))return fall;
 const url=raw.split(/[?#]/)[0];
 if(url==="/account"||url.startsWith("/account/")||url==="/search"||
  url.startsWith("/clinics/")||url==="/about"||url==="/")return raw;
 return fall;
}
const words:Record<Lang,Record<string,string>>={
 en:{
 account:"My account",overview:"Overview",family:"Family",personal:"My profile",
 preferences:"Preferences",privacy:"Privacy",security:"Security",signin:"Sign in",
 signup:"Create free account",signout:"Sign out",find:"Find care",home:"Home",
 verified:"Email verified",notVerified:"Verification required",memberSince:"Member since",
 welcome:"Your care, organized around you.",welcomeSub:"Manage your own profile and authorized family members. Your clinic treatment records remain private until verified linking is released.",
 profileIntro:"Your personal details",editProfile:"Edit profile",manageFamily:"Manage family",
 managePreferences:"Change preferences",manageSecurity:"Manage security",
 noBook:"Online appointment booking is coming in Phase 15.",
 noShared:"No clinic treatment or billing records are linked to your account.",
 count:"Members",status:"Status",familyMembers:"Family members",
 publicOnly:"Your public clinic browsing does not require an account.",
 actions:"Quick actions",goSearch:"Find verified clinics",accountFree:"Patient accounts are free. Booking will also be free.",
 save:"Save changes",saved:"Changes saved",loading:"Loading account information…",
 error:"We couldn't load your account. Try again.",retry:"Try again",cancel:"Cancel",
 view:"View",invalid:"Please review the form values and try again.",
 authRequired:"Please sign in to view your account.",unauthorized:"Please verify your email before using your patient account.",
 onboardNeeded:"Complete account setup to continue.",continue:"Continue",
 signInHeading:"Welcome back",signInText:"Sign in securely to manage your account and family permissions.",
 signupHeading:"Create your patient account",signupText:"Sign up with a verified email. Patient accounts are free and there is no payment required to browse.",
 name:"Full name",email:"Email address",password:"Password",newPassword:"New password",
 passwordPolicy:"Use at least 10 characters and keep your password private.",
 terms:"Terms of service",legalPrivacy:"Privacy notice",
 agree:"I have read and agree to the patient terms and privacy notice.",
 create:"Create account",creating:"Creating account…",
 submit:"Continue",sending:"Processing…",authProblem:"Unable to sign in. Check your email and password.",
 existing:"Already have an account?",newHere:"New here?",forgot:"Forgot your password?",
 forgotHeading:"Reset your password",forgotText:"Enter your email to request a password reset link.",
 resetHeading:"Choose a new password",resetText:"Use the secure link sent to your email.",
 resetRequest:"Send reset link",resetSubmit:"Reset password",
 resetSent:"If this email is registered, you will receive a reset link.",
 resetDone:"Your password has been reset. Sign in again.",
 verificationTitle:"Check your email",verificationText:"Open the verification link sent to your email, then sign in.",
 verificationSent:"If eligible, a verification email has been requested. Check your inbox.",
 resendVerification:"Resend verification email",verificationError:"Your verification link is invalid or expired.",
 verificationDone:"Your email verification step has finished. Sign in to continue.",
 checkEmail:"Check your inbox. Email verification is required before patient setup.",
 genericAuth:"Your request could not be completed. Please try again.",
 onbHeading:"Finish setting up your account",onbSub:"Your email is verified. Confirm your details and privacy acknowledgement to activate your patient workspace.",
 onbConsent:"I understand the platform privacy notice and agree to the patient terms.",
 adultSelf:"I confirm that I am an adult and am setting up my own account.",
 adultSelfNote:"Children cannot register as adult guardians. A legal guardian must manage a minor using their own verified account.",
 preferredName:"Preferred name",city:"Your city",phone:"Contact phone (optional)",
 phoneUnverified:"Optional phone is not verified and cannot establish identity or link clinical records.",
 finish:"Activate my account",activating:"Activating account…",
 chooseLanguage:"Language and calendar",basicInfo:"Personal information",
 profileName:"Preferred display name",profileEmail:"Verified email (read-only)",
 profilePhone:"Optional contact phone (not verified)",
 profileCity:"Selected city",profileNote:"Changing your name, phone or city does not grant access to any clinic medical records. Email changes require separate verified identity handling.",
 avatarNote:"Profile initials are displayed until a secure avatar upload is available.",
 familyIntro:"Add children under your legal care or invite another verified adult to grant permission.",
 familyTab:"My family",requestsTab:"Requests to me",delegationsTab:"Who I authorized",
 addChild:"Add a child",editChild:"Edit child details",
 childName:"Child's full name",birth:"Date of birth",relationship:"Your relationship",
 relationshipChild:"Parent",relationshipLegal:"Legal guardian",
 attest:"I confirm I am this child's parent or lawful guardian and have authority to manage the child's future bookings.",
 minorPolicy:"A minor must be under 18. An adult cannot be added through a child's form.",
 add:"Add member",update:"Update member",age:"Age",years:"years",
 child:"Child",adult:"Adult", guardianAttested:"Guardian statement recorded",
 adultAccepted:"Accepted by the other adult",
 reauth:"Adult reauthorization required",active:"Active",pending:"Awaiting acceptance",
 emptyFamily:"No family members yet.",emptyFamilySub:"Add a child for whom you have legal authority or invite an adult to confirm access.",
 inviteAdult:"Invite a verified adult",inviteHelp:"Enter the email of an existing verified DandanLink user. That person must sign in and accept before any family authorization becomes active.",
 inviteEmail:"Adult's verified account email",
 inviteAction:"Request authorization",inviteSuccess:"If that verified account exists, an invitation may be delivered. No permission is active until the recipient accepts.",
 invitationWarning:"For privacy, we do not confirm whether an email belongs to an existing account.",
 accept:"Accept",decline:"Decline",revocation:"Revoke",
 remove:"Remove authorization",confirmRemove:"Remove this family authorization? This does not delete past clinic records.",
 adultNotice:"An adult must independently accept using their own verified account. You cannot authorize another adult by entering their name.",
 incoming:"Requests awaiting your decision",incomingEmpty:"No pending family invitations.",
 incomingText:"An existing DandanLink member has requested future booking authority for you. Accept only if you agree.",
 acceptConsent:"I independently consent to this adult family authorization.",
 accepted:"Authorization accepted. You can revoke it at any time.",
 declined:"Invitation declined.",peopleManage:"Authorized adults",
 ownDelegations:"Adults I have authorized",noDelegations:"You have not granted anyone authorization.",
 delegationNote:"Revoke if you no longer want this person to manage your future bookings.",
 removeSuccess:"Authorization revoked.", memberUpdated:"Family member updated.",
 noRecordAccess:"Family authorization grants no access to clinic-held records. Clinic record linking requires a separate verification process planned for Phase 15.",
 minorAgedOut:"This person is now an adult and needs independent authorization before future booking.",
 dateExplain:"Birth dates use unambiguous Gregorian dates; display dates follow your preferred calendar.",
 prefsIntro:"Choose how dates, messages, and account privacy are handled.",
 language:"Language",calendar:"Calendar",
 gregorian:"Gregorian",solar:"Solar Hijri",notifs:"Notifications",
 bookingEmails:"Appointment email updates",bookingEmailsHint:"Preference for future appointment messages (Phase 15).",
 newsEmails:"Account and service emails",newsEmailsHint:"Optional non-essential account updates.",
 emailConfigured:"Email provider configured",emailOffline:"Email delivery is not configured.",
 smsPushUnavailable:"SMS and push notifications are not enabled. Your selection will never imply messages were sent.",
 noNotifs:"Notification preferences are saved. Actual booking delivery is not available until Phase 15.",
 consentStatus:"Clinical sharing",consentNone:"No clinical records shared or linked.",
 privacyLink:"Review privacy notice",privacyHint:"Patient account details are separate from clinic medical and billing records. No name/phone matching releases a record.",
 managePrivacy:"Privacy and data access",privacyIntro:"Review recorded consents, family permissions and your own patient-portal data.",
 export:"Export my account data",exportHint:"Downloads your own patient portal profile, preferences, family authorizations and consent history only. Clinic treatment records are not included.",
 exported:"Your account data export has started.",events:"Consent history",
 historyEmpty:"No additional consent events recorded.",recordType:"Action",
 consentYes:"Accepted",consentNo:"Revoked",policy:"Version",recordLinkNone:"Clinic records & linked access",noLinks:"No linked clinics or medical records.",
 privacyFuture:"Verified clinic record-linking and patient release grants are planned for Phase 15.",
 privacySummary:"The clinic controls its own medical records. A matching name, phone number or authorized dependent does not grant clinical access.",
 securityIntro:"Manage account sessions and recover your password securely.",
 sessions:"Active sign-in sessions",sessionDate:"Signed in",expires:"Expires",
 device:"Device",ip:"IP",sessionRevoke:"Revoke session",sessionRevoked:"Session revoked",
 noSessions:"No active sessions returned.",resetPassword:"Reset password via email",
 securityHint:"Revoking a session prevents further authenticated requests from that session.",
 logout:"Sign out of this device",sessionTip:"If you see an unfamiliar session, revoke it and reset your password.",
 help:"Help and safety",helpPrivacy:"Your medical history never appears in public clinic search.",
 helpBooking:"Booking, appointment history, saved providers and record sharing arrive in later phases.",
 important:"Important",legalVersion:"Patient portal policy version",
 realFeatures:"Available now",upcoming:"Coming later", accountActive:"Patient account active",
 viewConsents:"View consent history",viewPrivacy:"Privacy notice",trust:"Privacy by design",
 consentMissing:"Consent and adult confirmation are required.",
 conflict:"Information changed in another session. Reload to continue.",
 familyConflict:"A family authorization has changed. Refresh and try again.",
 forbiddenAdult:"Another adult must accept their own invitation. Self-attestation is insufficient.",
 verifiedAccount:"Verified account",
 onboardingNotDone:"Finish onboarding",infoOnly:"Informational",
 draftLegal:"Patient terms and privacy require final legal review before production.",
 unsupported:"This action is not available in your current patient workspace.",
 coming:"Coming soon"
 },
 "fa-AF":{
 account:"حساب من",overview:"نمای کلی",family:"خانواده",personal:"پروفایل من",
 preferences:"تنظیمات",privacy:"حریم خصوصی",security:"امنیت",signin:"ورود",
 signup:"ایجاد حساب رایگان",signout:"خروج",find:"جستجوی خدمات",home:"خانه",
 verified:"ایمیل تأییدشده",notVerified:"تأیید ایمیل ضروری است",memberSince:"عضویت از",
 welcome:"مراقبت دندان، برای شما و خانواده‌تان.",welcomeSub:"پروفایل و اعضای مجاز خانواده را مدیریت کنید. معلومات صحی کلینیک‌ها تا زمان تأیید ارتباط خصوصی می‌مانند.",
 profileIntro:"معلومات شخصی شما",editProfile:"ویرایش پروفایل",manageFamily:"مدیریت خانواده",
 managePreferences:"تغییر تنظیمات",manageSecurity:"مدیریت امنیت",
 noBook:"رزرو آنلاین نوبت در مرحله ۱۵ فعال می‌شود.",
 noShared:"هیچ سند تداوی یا مالی کلینیک به حساب شما وصل نشده است.",
 count:"عضو",status:"حالت",familyMembers:"اعضای خانواده",
 publicOnly:"برای دیدن کلینیک‌ها به حساب ضرورت نیست.",
 actions:"دسترسی سریع",goSearch:"جستجوی کلینیک‌های معتبر",accountFree:"حساب مریضان رایگان است؛ گرفتن نوبت نیز رایگان خواهد بود.",
 save:"ذخیره تغییرات",saved:"تغییرات ذخیره شد",loading:"در حال دریافت معلومات حساب…",
 error:"دریافت معلومات حساب ممکن نشد. دوباره کوشش کنید.",retry:"دوباره کوشش",
 cancel:"لغو",view:"مشاهده",invalid:"معلومات فورم را بررسی و دوباره کوشش کنید.",
 authRequired:"برای دیدن حساب، وارد شوید.",unauthorized:"قبل از ادامه ایمیل خود را تأیید کنید.",
 onboardNeeded:"برای ادامه تنظیم حساب را تکمیل کنید.",continue:"ادامه",
 signInHeading:"خوش آمدید",signInText:"برای مدیریت حساب و اجازه‌های خانواده با امنیت وارد شوید.",
 signupHeading:"حساب مریض خود را بسازید",signupText:"با ایمیل معتبر ثبت‌نام کنید. حساب رایگان است و برای جستجو پرداخت ضرورت نیست.",
 name:"نام کامل",email:"آدرس ایمیل",password:"رمز عبور",newPassword:"رمز عبور جدید",
 passwordPolicy:"حداقل ده نویسه انتخاب کنید و رمز را محفوظ نگه دارید.",
 terms:"شرایط خدمات",legalPrivacy:"اطلاعیه حریم خصوصی",
 agree:"شرایط خدمات و حریم خصوصی را خوانده و می‌پذیرم.",
 create:"ساخت حساب",creating:"در حال ساخت حساب…",
 submit:"ادامه",sending:"در حال اجرا…",authProblem:"ورود ممکن نشد؛ ایمیل و رمز را بررسی کنید.",
 existing:"قبلاً حساب دارید؟",newHere:"حساب ندارید؟",forgot:"رمز عبور را فراموش کرده‌اید؟",
 forgotHeading:"بازیابی رمز عبور",forgotText:"برای دریافت لینک بازیابی، ایمیل خود را وارد کنید.",
 resetHeading:"رمز عبور جدید",resetText:"از لینک امن فرستاده‌شده به ایمیل استفاده کنید.",
 resetRequest:"ارسال لینک بازیابی",resetSubmit:"تغییر رمز",
 resetSent:"اگر این ایمیل ثبت باشد، لینک بازیابی فرستاده می‌شود.",
 resetDone:"رمز شما تغییر کرد. دوباره وارد شوید.",
 verificationTitle:"ایمیل خود را بررسی کنید",verificationText:"لینک تأیید را در ایمیل باز کنید و سپس وارد شوید.",
 verificationSent:"در صورت امکان ایمیل تأیید درخواست شد. صندوق ایمیل را بررسی کنید.",
 resendVerification:"ارسال مجدد لینک تأیید",verificationError:"لینک تأیید معتبر نیست یا وقت آن گذشته است.",
 verificationDone:"مرحله تأیید ایمیل انجام شد؛ برای ادامه وارد شوید.",
 checkEmail:"صندوق ایمیل را بررسی کنید؛ پیش از ساخت پروفایل تأیید ایمیل ضروری است.",
 genericAuth:"درخواست انجام نشد. دوباره کوشش کنید.",
 onbHeading:"تنظیم حساب خود را تکمیل کنید",onbSub:"ایمیل شما تأیید شده است؛ معلومات و رضایت حریم خصوصی را تأیید کنید.",
 onbConsent:"اطلاعیه حریم خصوصی را فهمیده و شرایط خدمات را می‌پذیرم.",
 adultSelf:"تأیید می‌کنم بزرگسال هستم و حساب شخصی خود را می‌سازم.",
 adultSelfNote:"اطفال نمی‌توانند به‌عنوان سرپرست بزرگسال ثبت شوند. سرپرست قانونی باید از حساب تأییدشده خود استفاده کند.",
 preferredName:"نام دلخواه",city:"شهر",phone:"شماره تماس (اختیاری)",
 phoneUnverified:"شماره اختیاری تأیید نشده و برای اثبات هویت یا دسترسی به اسناد صحی کافی نیست.",
 finish:"فعال‌سازی حساب",activating:"در حال فعال‌سازی…",chooseLanguage:"زبان و تقویم",
 basicInfo:"معلومات شخصی",profileName:"نام نمایشی",profileEmail:"ایمیل تأییدشده (قابل ویرایش نیست)",
 profilePhone:"شماره تماس اختیاری (تأیید نشده)",
 profileCity:"شهر انتخاب‌شده",profileNote:"تغییر نام، شماره یا شهر اجازه دسترسی به اسناد صحی کلینیک نمی‌دهد. تغییر ایمیل نیاز به تأیید مستقل دارد.",
 avatarNote:"تا فعال شدن آپلود امن عکس، حروف اول نام نمایش داده می‌شوند.",
 familyIntro:"اطفال تحت سرپرستی قانونی را اضافه کنید یا از یک بزرگسال بخواهید خودش اجازه بدهد.",
 familyTab:"اعضای خانواده",requestsTab:"درخواست‌های رسیده",delegationsTab:"اجازه‌های داده‌شده",
 addChild:"افزودن طفل",editChild:"ویرایش معلومات طفل",childName:"نام کامل طفل",
 birth:"تاریخ تولد",relationship:"نوع رابطه",relationshipChild:"پدر/مادر",
 relationshipLegal:"سرپرست قانونی",
 attest:"تأیید می‌کنم والد یا سرپرست قانونی این طفل هستم و حق مدیریت نوبت‌های آینده او را دارم.",
 minorPolicy:"طفل باید زیر ۱۸ سال باشد. بزرگسال از فورم طفل اضافه نمی‌شود.",
 add:"افزودن",update:"ذخیره",age:"سن",years:"سال",child:"طفل",adult:"بزرگسال",
 guardianAttested:"تعهد سرپرست ثبت شد",adultAccepted:"توسط بزرگسال پذیرفته شد",
 reauth:"اجازه دوباره بزرگسال ضروری است",active:"فعال",pending:"در انتظار پاسخ",
 emptyFamily:"هنوز عضوی اضافه نشده است.",emptyFamilySub:"طفل تحت سرپرستی را ثبت کنید یا از یک بزرگسال تأییدشده اجازه بگیرید.",
 inviteAdult:"درخواست اجازه از بزرگسال",inviteHelp:"ایمیل یک کاربر تأییدشده دندان‌لینک را وارد کنید. شخص باید وارد شود و مستقلاً درخواست را بپذیرد.",
 inviteEmail:"ایمیل حساب بزرگسال",
 inviteAction:"ارسال درخواست اجازه",inviteSuccess:"اگر چنین حساب تأییدشده وجود داشته باشد، دعوت‌نامه می‌تواند فرستاده شود. تا پذیرش شخص اجازه‌ای فعال نیست.",
 invitationWarning:"برای حفاظت از حریم خصوصی، وجود داشتن حساب با این ایمیل را تأیید نمی‌کنیم.",
 accept:"پذیرش",decline:"رد",revocation:"لغو دسترسی",
 remove:"لغو اجازه",confirmRemove:"این اجازه خانوادگی لغو شود؟ اسناد قبلی کلینیک حذف نمی‌شوند.",
 adultNotice:"بزرگسال باید از حساب تأییدشده خودش درخواست را بپذیرد. نام‌نویسی به‌تنهایی اجازه نمی‌دهد.",
 incoming:"درخواست‌های در انتظار پاسخ",incomingEmpty:"درخواست خانوادگی دریافت نشده است.",
 incomingText:"یکی از کاربران درخواست اجازه مدیریت نوبت‌های آینده شما را کرده است؛ فقط در صورت رضایت بپذیرید.",
 acceptConsent:"مستقلاً با این اجازه خانوادگی موافقم.",
 accepted:"اجازه پذیرفته شد؛ هر وقت خواستید می‌توانید لغو کنید.",declined:"درخواست رد شد.",
 peopleManage:"بزرگسالان مجاز",ownDelegations:"اشخاصی که به آن‌ها اجازه داده‌ام",
 noDelegations:"هنوز به کسی اجازه نداده‌اید.",
 delegationNote:"اگر نمی‌خواهید این شخص نوبت‌های آینده شما را مدیریت کند، اجازه را لغو کنید.",
 removeSuccess:"اجازه لغو شد.",memberUpdated:"معلومات عضو ذخیره شد.",
 noRecordAccess:"اجازه خانوادگی به اسناد صحی کلینیک دسترسی نمی‌دهد. برای پیوند اسناد در مرحله ۱۵ تأیید جداگانه ضروری است.",
 minorAgedOut:"این شخص بزرگسال شده است و پیش از نوبت‌دهی آینده باید خودش اجازه بدهد.",
 dateExplain:"تاریخ تولد به میلادی ثبت می‌شود؛ نمایش تاریخ مطابق تقویم انتخاب‌شده است.",
 prefsIntro:"زبان، تقویم، پیام‌ها و حریم خصوصی حساب را مدیریت کنید.",
 language:"زبان",calendar:"تقویم",gregorian:"میلادی",solar:"هجری شمسی",
 notifs:"اعلان‌ها",bookingEmails:"ایمیل‌های نوبت",bookingEmailsHint:"انتخاب شما برای پیام‌های نوبت آینده (مرحله ۱۵).",
 newsEmails:"ایمیل‌های حساب و خدمات",newsEmailsHint:"اخبار اختیاری درباره حساب و خدمات.",
 emailConfigured:"سرویس ایمیل تنظیم شده",emailOffline:"سرویس ایمیل تنظیم نشده است.",
 smsPushUnavailable:"پیامک و پوش نوتیفیکیشن فعال نیستند؛ انتخاب شما به معنای ارسال پیام نیست.",
 noNotifs:"تنظیمات اعلان‌ها ذخیره شد؛ ارسال پیام نوبت تا مرحله ۱۵ فعال نیست.",
 consentStatus:"اشتراک اسناد صحی",consentNone:"هیچ سند صحی به اشتراک گذاشته نشده است.",
 privacyLink:"مطالعه حریم خصوصی",privacyHint:"معلومات حساب از اسناد صحی و مالی کلینیک جداست؛ تطبیق نام و شماره، اجازه دسترسی نمی‌دهد.",
 managePrivacy:"حریم خصوصی و دسترسی به معلومات",
 privacyIntro:"رضایت‌های ثبت‌شده، اجازه‌های خانوادگی و معلومات حساب خود را بررسی کنید.",
 export:"دریافت معلومات حساب",exportHint:"فقط پروفایل حساب، تنظیمات، اجازه‌های خانوادگی و تاریخچه رضایت شما دانلود می‌شود؛ اسناد تداوی کلینیک شامل نیست.",
 exported:"دریافت فایل حساب آغاز شد.",events:"تاریخچه رضایت",
 historyEmpty:"رضایت دیگری ثبت نشده است.",recordType:"عمل",consentYes:"پذیرفته",
 consentNo:"لغو شده",policy:"نسخه",recordLinkNone:"اسناد صحی و کلینیک‌های مرتبط",
 noLinks:"هیچ کلینیک یا سند صحی وصل نشده است.",
 privacyFuture:"پیوند اسناد صحی با تأیید کلینیک در مرحله ۱۵ فراهم می‌شود.",
 privacySummary:"مسئولیت اسناد صحی با کلینیک است؛ نام، شماره و عضویت خانواده به‌تنهایی اجازه دسترسی نمی‌دهد.",
 securityIntro:"نشست‌های فعال را مدیریت کنید و رمز عبور خود را با امنیت بازیابی کنید.",
 sessions:"نشست‌های فعال",sessionDate:"زمان ورود",expires:"انقضا",
 device:"دستگاه",ip:"آی‌پی",sessionRevoke:"لغو نشست",sessionRevoked:"نشست لغو شد",
 noSessions:"نشست فعالی نمایش داده نشد.",resetPassword:"بازیابی رمز با ایمیل",
 securityHint:"با لغو نشست، درخواست‌های بعدی آن نشست تأیید نمی‌شوند.",
 logout:"خروج از این دستگاه",sessionTip:"اگر نشست ناشناخته دیدید، لغوش کنید و رمز عبور را تغییر دهید.",
 help:"راهنما و امنیت",helpPrivacy:"سوابق صحی شما هرگز در جستجوی عمومی کلینیک نمایش داده نمی‌شود.",
 helpBooking:"نوبت‌دهی، تاریخچه نوبت‌ها و اسناد مشترک در مراحل آینده می‌آیند.",
 important:"مهم",legalVersion:"نسخه شرایط حساب مریض",
 realFeatures:"اکنون فعال",upcoming:"در آینده",accountActive:"حساب مریض فعال",
 viewConsents:"تاریخچه رضایت",viewPrivacy:"حریم خصوصی",trust:"حفاظت از معلومات",
 consentMissing:"رضایت و تأیید بزرگسالی ضروری است.",
 conflict:"معلومات در یک نشست دیگر تغییر کرده است؛ صفحه را تازه کنید.",
 familyConflict:"اجازه خانوادگی تغییر کرده است؛ تازه کنید.",
 forbiddenAdult:"اجازه بزرگسال باید از حساب خودش داده شود.",
 verifiedAccount:"حساب تأییدشده",
 onboardingNotDone:"تکمیل تنظیم حساب",infoOnly:"معلومات",
 draftLegal:"شرایط و حریم خصوصی پیش از راه‌اندازی عمومی به بازبینی حقوقی نهایی نیاز دارند.",
 unsupported:"این کار هنوز در حساب مریض فعال نیست.",coming:"به‌زودی"
 },
 "ps-AF":{
 account:"زما حساب",overview:"لنډیز",family:"کورنۍ",personal:"زما پېژندلیک",
 preferences:"غوره توبونه",privacy:"محرمیت",security:"امنیت",signin:"ننوتل",
 signup:"وړیا حساب جوړول",signout:"وتل",find:"خدمتونه لټول",home:"کور",
 verified:"برېښنالیک تایید شوی",notVerified:"د برېښنالیک تایید اړین دی",memberSince:"د غړیتوب نېټه",
 welcome:"ستاسو او کورنۍ لپاره د غاښونو پاملرنه.",welcomeSub:"خپل پېژندلیک او د کورنۍ مجاز غړي اداره کړئ. د کلینیک طبي اسناد تر جلا تایید پورې محرم پاتې کېږي.",
 profileIntro:"ستاسو شخصي معلومات",editProfile:"پېژندلیک سمول",manageFamily:"کورنۍ اداره کول",
 managePreferences:"غوره توبونه بدلول",manageSecurity:"امنیت اداره کول",
 noBook:"آنلاین نوبت اخیستل په ۱۵ پړاو کې فعالېږي.",
 noShared:"هیڅ طبي یا مالي سند ستاسو حساب سره نه دی نښلول شوی.",
 count:"غړي",status:"حالت",familyMembers:"د کورنۍ غړي",
 publicOnly:"د کلینیکونو لیدلو لپاره حساب نه دی پکار.",
 actions:"چټک کارونه",goSearch:"تایید شوي کلینیکونه لټول",accountFree:"د ناروغانو حسابونه وړیا دي؛ نوبت اخیستل به هم وړیا وي.",
 save:"بدلونونه خوندي کول",saved:"بدلونونه خوندي شول",loading:"ستاسو حساب ترلاسه کوو…",
 error:"حساب نشو پرانیستلای. بیا هڅه وکړئ.",retry:"بیا هڅه",
 cancel:"لغوه",view:"کتل",invalid:"فورم وګورئ او بیا هڅه وکړئ.",
 authRequired:"د حساب لیدلو لپاره ننوځئ.",unauthorized:"لومړی خپل برېښنالیک تایید کړئ.",
 onboardNeeded:"د دوام لپاره د حساب تنظیم بشپړ کړئ.",continue:"دوام",
 signInHeading:"بیا ښه راغلاست",signInText:"د خپل حساب او کورنۍ د اجازو اداره کولو لپاره ننوځئ.",
 signupHeading:"د ناروغ حساب جوړ کړئ",signupText:"په تایید شوي برېښنالیک ثبت شئ. حساب وړیا دی.",
 name:"بشپړ نوم",email:"برېښنالیک",password:"پټنوم",newPassword:"نوی پټنوم",
 passwordPolicy:"لږ تر لږه لس توري وکاروئ او پټنوم پټ وساتئ.",
 terms:"د خدمت شرطونه",legalPrivacy:"د محرمیت خبرتیا",
 agree:"ما د خدمت شرطونه او د محرمیت خبرتیا لوستې او منلې ده.",
 create:"حساب جوړول",creating:"حساب جوړېږي…",
 submit:"دوام",sending:"په کار بوخت یو…",authProblem:"ننوتل ونه شول؛ برېښنالیک او پټنوم وګورئ.",
 existing:"حساب لرئ؟",newHere:"حساب نه لرئ؟",forgot:"پټنوم مو هېر دی؟",
 forgotHeading:"پټنوم بېرته ترلاسه کړئ",forgotText:"د پټنوم بیا ټاکلو لپاره برېښنالیک ولیکئ.",
 resetHeading:"نوی پټنوم وټاکئ",resetText:"د برېښنالیک خوندي لینک وکاروئ.",
 resetRequest:"د بیا ټاکلو لینک ولېږئ",resetSubmit:"پټنوم بدل کړئ",
 resetSent:"که برېښنالیک ثبت وي، د بیا ټاکلو لینک به واستول شي.",
 resetDone:"پټنوم بدل شو، بیا ننوځئ.",
 verificationTitle:"برېښنالیک وګورئ",verificationText:"په برېښنالیک کې د تایید لینک پرانیزئ او بیا ننوځئ.",
 verificationSent:"که ممکن وي، د تایید برېښنالیک غوښتل شوی؛ صندوق وګورئ.",
 resendVerification:"د تایید لینک بیا ولېږئ",verificationError:"د تایید لینک سم نه دی یا وخت یې تېر دی.",
 verificationDone:"د تایید پړاو بشپړ شو؛ د دوام لپاره ننوځئ.",
 checkEmail:"صندوق وګورئ؛ د حساب فعالېدو مخکې د برېښنالیک تایید اړین دی.",
 genericAuth:"غوښتنه بشپړه نه شوه؛ بیا هڅه وکړئ.",
 onbHeading:"د حساب تنظیم بشپړ کړئ",onbSub:"ستاسو برېښنالیک تایید شوی؛ معلومات او د محرمیت منل تایید کړئ.",
 onbConsent:"ما د محرمیت خبرتیا لوستې او د ناروغ شرطونه منم.",
 adultSelf:"زه لوی یم او خپل شخصي حساب جوړوم.",
 adultSelfNote:"ماشومان د لوی سرپرست په توګه حساب نشي جوړولای؛ قانوني سرپرست خپل تایید شوی حساب کاروي.",
 preferredName:"خوښ شوی نوم",city:"ښار",phone:"تلیفون (اختیاري)",
 phoneUnverified:"اختیاري تلیفون نه دی تایید شوی او د طبي اسنادو د ترلاسه کولو اجازه نه ورکوي.",
 finish:"زما حساب فعال کړه",activating:"حساب فعالېږي…",chooseLanguage:"ژبه او کلیز",
 basicInfo:"شخصي معلومات",profileName:"د ښودلو نوم",profileEmail:"تایید شوی برېښنالیک (نه بدلېږي)",
 profilePhone:"اختیاري تلیفون (تایید شوی نه دی)",profileCity:"غوره شوی ښار",
 profileNote:"نوم، تلیفون یا ښار بدلول د کلینیک طبي اسنادو ته د لاسرسي اجازه نه ورکوي.",
 avatarNote:"تر خوندي عکس پورته کولو پورې د نوم لومړي توري ښکاري.",
 familyIntro:"د قانوني سرپرستۍ ماشومان زیات کړئ یا له بل لوی کس څخه اجازه وغواړئ.",
 familyTab:"کورنۍ",requestsTab:"ما ته غوښتنې",delegationsTab:"ورکړل شوې اجازې",
 addChild:"ماشوم زیاتول",editChild:"د ماشوم معلومات سمول",childName:"د ماشوم بشپړ نوم",
 birth:"د زېږېدو نېټه",relationship:"اړیکه",relationshipChild:"پلار/مور",
 relationshipLegal:"قانوني سرپرست",
 attest:"تاییدوم چې د ماشوم مور، پلار یا قانوني سرپرست یم او د راتلونکو نوبتونو د اداره کولو واک لرم.",
 minorPolicy:"ماشوم باید تر ۱۸ کلونو کم عمر ولري. لوی کس دلته نه شي زیاتېدای.",
 add:"زیاتول",update:"خوندي کول",age:"عمر",years:"کلونه",child:"ماشوم",adult:"لوی",
 guardianAttested:"د سرپرست تایید ثبت شوی",adultAccepted:"بل لوی کس منلې ده",
 reauth:"د لوی کس بیا اجازه اړینه ده",active:"فعال",pending:"د ځواب په تمه",
 emptyFamily:"تر اوسه د کورنۍ غړي نشته.",emptyFamilySub:"د قانوني سرپرستۍ ماشوم زیات کړئ یا د تایید شوي لوی کس اجازه وغواړئ.",
 inviteAdult:"له لوی کس څخه اجازه غوښتل",inviteHelp:"د دندان‌لینک د تایید شوي حساب برېښنالیک ولیکئ؛ هغه کس باید پخپله ننوځي او ومني.",
 inviteEmail:"د لوی کس برېښنالیک",inviteAction:"د اجازې غوښتنه",
 inviteSuccess:"که دا تایید شوی حساب وي، بلنه ور رسېدای شي. تر منلو مخکې اجازه نه فعالېږي.",
 invitationWarning:"د محرمیت لپاره د دې برېښنالیک د حساب شته والی نه تاییدوو.",
 accept:"منل",decline:"ردول",revocation:"اجازه لغوه کول",
 remove:"اجازه لغوه کړه",confirmRemove:"دا کورنۍ اجازه لغوه شي؟ د کلینیک پخواني اسناد نه پاکېږي.",
 adultNotice:"لوی کس باید په خپل تایید شوي حساب کې اجازه ورکړي؛ یوازې نوم لیکل بسنه نه کوي.",
 incoming:"راتلونکې غوښتنې",incomingEmpty:"کورنۍ غوښتنه نشته.",
 incomingText:"یو کارن ستاسو د راتلونکو نوبتونو د اداره کولو اجازه غواړي؛ یوازې په رضا یې ومنئ.",
 acceptConsent:"زه پخپله د دې کورنۍ اجازې سره موافق یم.",
 accepted:"اجازه ومنل شوه؛ هر وخت یې لغوه کولای شئ.",declined:"غوښتنه رد شوه.",
 peopleManage:"مجاز لوی کسان",ownDelegations:"هغه کسان چې اجازه مې ورکړې",
 noDelegations:"تر اوسه مو چا ته اجازه نه ده ورکړې.",
 delegationNote:"که نور نه غواړئ دا کس ستاسو نوبتونه اداره کړي، اجازه یې لغوه کړئ.",
 removeSuccess:"اجازه لغوه شوه.",memberUpdated:"معلومات خوندي شول.",
 noRecordAccess:"کورنۍ اجازه د کلینیک طبي اسنادو ته لاسرسی نه ورکوي؛ د اسنادو نښلول په ۱۵ پړاو کې جلا تایید غواړي.",
 minorAgedOut:"دا کس اوس لوی شوی او د راتلونکو نوبتونو لپاره خپلې اجازې ته اړتیا لري.",
 dateExplain:"د زېږېدو نېټې میلادي ثبتېږي، خو ښودل ستاسو له کلیز سره سم وي.",
 prefsIntro:"د حساب ژبه، کلیز، پیغامونه او محرمیت وټاکئ.",
 language:"ژبه",calendar:"کلیز",gregorian:"میلادي",solar:"هجري لمریز",
 notifs:"خبرتیاوې",bookingEmails:"د نوبت برېښنالیک",bookingEmailsHint:"د راتلونکو نوبت پیغامونو غوره توب (۱۵ پړاو).",
 newsEmails:"د حساب او خدمت برېښنالیک",newsEmailsHint:"د حساب او خدمت اختیاري خبرونه.",
 emailConfigured:"برېښنالیک تنظیم شوی",emailOffline:"برېښنالیک لا نه دی تنظیم شوی.",
 smsPushUnavailable:"SMS او پُش خبرتیاوې لا فعالې نه دي؛ غوره کول د لېږلو معنا نه لري.",
 noNotifs:"د پیغامونو غوره توب خوندي شو؛ د نوبت خبرتیا تر ۱۵ پړاو پورې نشته.",
 consentStatus:"د طبي اسنادو شریکول",consentNone:"هیڅ طبي سند نه دی شریک شوی.",
 privacyLink:"د محرمیت خبرتیا",privacyHint:"د حساب معلومات د کلینیک له طبي او مالي اسنادو بېل دي.",
 managePrivacy:"محرمیت او معلومات",privacyIntro:"ثبت شوې اجازې او د خپل حساب معلومات وګورئ.",
 export:"د خپل حساب معلومات ترلاسه کړئ",exportHint:"یوازې د حساب پېژندلیک، غوره توبونه، د کورنۍ اجازې او د رضا تاریخچه راکښته کېږي؛ د کلینیک اسناد پکې نشته.",
 exported:"د حساب معلوماتو ترلاسه کول پیل شول.",events:"د اجازو تاریخچه",
 historyEmpty:"بله اجازې پېښه نشته.",recordType:"عمل",consentYes:"منل شوی",
 consentNo:"لغوه شوی",policy:"نسخه",recordLinkNone:"طبي اسناد او تړلي کلینیکونه",
 noLinks:"هیڅ کلینیک یا طبي سند نه دی تړل شوی.",
 privacyFuture:"د تایید شوي کلینیک د اسنادو اړیکه په ۱۵ پړاو کې راځي.",
 privacySummary:"طبي اسناد د کلینیک په واک کې دي؛ ورته نوم، تلیفون یا کورنۍ غړیتوب اجازه نه ورکوي.",
 securityIntro:"فعالې ناستې اداره او پټنوم په خوندي ډول بیا ترلاسه کړئ.",
 sessions:"فعالې ناستې",sessionDate:"د ننوتلو وخت",expires:"پای",
 device:"وسیله",ip:"IP",sessionRevoke:"ناسته لغوه کړه",
 sessionRevoked:"ناسته لغوه شوه",noSessions:"فعاله ناسته ونه موندل شوه.",
 resetPassword:"د برېښنالیک له لارې پټنوم بدلول",
 securityHint:"لغوه شوې ناسته وروسته تصدیق شوي غوښتنې نه شي لېږلای.",
 logout:"له دې وسیلې وتل",sessionTip:"که نااشنا ناسته وي، لغوه یې کړئ او پټنوم بدل کړئ.",
 help:"مرسته او خوندیتوب",helpPrivacy:"ستاسو طبي تاریخ په عامه لټون کې نه ښکاري.",
 helpBooking:"نوبتونه او شریک اسناد په راتلونکو پړاوونو کې راځي.",
 important:"مهم",legalVersion:"د ناروغ د حساب پالیسۍ نسخه",
 realFeatures:"اوس شته",upcoming:"وروسته",accountActive:"حساب فعال دی",
 viewConsents:"د رضایت تاریخچه",viewPrivacy:"د محرمیت خبرتیا",
 trust:"د معلوماتو ساتنه",consentMissing:"د رضایت او لوی والي تایید اړین دی.",
 conflict:"معلومات په بله ناسته کې بدل شوي؛ پاڼه تازه کړئ.",
 familyConflict:"د کورنۍ اجازه بدله شوې؛ تازه یې کړئ.",
 forbiddenAdult:"د لوی کس اجازه باید د هغه خپل حساب څخه ورکړل شي.",
 verifiedAccount:"تایید شوی حساب",onboardingNotDone:"د حساب تنظیم بشپړول",
 infoOnly:"معلومات",draftLegal:"شرطونه او محرمیت له عامه خپرولو مخکې وروستۍ حقوقي کتنه غواړي.",
 unsupported:"دا کار اوس فعال نه دی.",coming:"ژر"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const t=(key:string)=>words[locale]?.[key]||words.en[key]||key;
 const displayDate=(raw:string|null|undefined)=>{
  if(!raw)return "—";
  const d=new Date(raw.length===10?raw+"T12:00:00Z":raw);
  if(!Number.isFinite(d.getTime()))return raw;
  return new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric",
   timeZone:"Asia/Kabul",calendar:calendar==="solar_hijri"?"persian":"gregory"}).format(d);
 };
 return {t,displayDate,locale};
}
function usePatient<T>(path:string|null){
 const [state,setState]=useState<{loading:boolean;data:T|null;error:Failure|null}>({
  loading:true,data:null,error:null}),[version,setVersion]=useState(0);
 useEffect(()=>{if(path===null)return;const abort=new AbortController();
  setState(x=>({...x,loading:true,error:null}));
  fetch(API+"/v1/patients"+path,{credentials:"include",cache:"no-store",signal:abort.signal})
   .then(async r=>{let b=await r.json().catch(()=>({}));
    if(!r.ok)throw Object.assign(new Error(b.code||"ACCOUNT_UNAVAILABLE"),{
     code:b.code,status:r.status}) as Failure;
    return b as T})
   .then(data=>setState({loading:false,data,error:null}))
   .catch((err:Failure)=>{if(!abort.signal.aborted)setState({
    loading:false,data:null,error:err})});
  return ()=>abort.abort();
 },[path,version]);
 return {...state,refresh:()=>setVersion(x=>x+1)};
}
function Spinner(){const {t}=useWords();return <div className="p14-loading" role="status">
 <span className="p14-spinner" aria-hidden="true"/>{t("loading")}</div>}
function ErrorPanel({error,retry}:{error:Failure|null;retry?:()=>void}){
 const {t}=useWords();return <section className="p14-error" role="alert">
 <strong>{error?.status===403?t("unauthorized"):t("error")}</strong>
 <p>{error?.code==="PATIENT_PROFILE_CONFLICT"||error?.code==="PATIENT_PREFERENCES_CONFLICT"?
  t("conflict"):error?.code==="GUARDIAN_AUTHORIZATION_REQUIRED"?t("consentMissing"):t("invalid")}</p>
 {retry&&<button className="btn btn-secondary" type="button" onClick={retry}>{t("retry")}</button>}
 </section>;
}
function Notice({kind,text}:{kind:"error"|"success"|"info";text:string}){
 if(!text)return null;
 return <div className="p14-notice"><InlineAlert kind={kind}>{text}</InlineAlert></div>;
}
function safeError(err:unknown,t:(k:string)=>string){
 const e=err as Failure;
 if(e?.code==="PATIENT_PROFILE_CONFLICT"||e?.code==="PATIENT_PREFERENCES_CONFLICT")
  return t("conflict");
 if(e?.code==="CHILD_AGE_REQUIRED")return t("minorPolicy");
 if(e?.code==="EXPLICIT_ADULT_DECISION_REQUIRED")return t("adultNotice");
 if(e?.code==="GUARDIAN_AUTHORIZATION_REQUIRED")return t("consentMissing");
 if(e?.code==="FAMILY_MEMBER_CONFLICT")return t("familyConflict");
 if(e?.code==="PATIENT_ALREADY_REGISTERED")return t("onboardNeeded");
 if(e?.code==="EMAIL_VERIFICATION_REQUIRED")return t("unauthorized");
 return t("invalid");
}
function titleText(title:string,subtitle:string){
 return <header className="p14-page-title"><h1>{title}</h1><p>{subtitle}</p></header>;
}
function F({title,children,hint}:{title:string;children:ReactNode;hint?:string}){
 return <label className="p14-field"><span>{title}</span>{children}
  {hint&&<small>{hint}</small>}</label>;
}
function PasswordInput({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder?:string}){
 const [shown,setShown]=useState(false);
 return <div className="p14-password">
 <input value={value} onChange={e=>onChange(e.target.value)}
  type={shown?"text":"password"} minLength={10} required autoComplete="new-password"
  placeholder={placeholder}/>
 <button type="button" onClick={()=>setShown(x=>!x)} aria-label={shown?"Hide password":"Show password"}>
  <span aria-hidden="true">{shown?"◉":"◎"}</span></button></div>;
}
function AuthLinks({type}:{type:string}){
 const {t}=useWords();return <div className="p14-auth-links">
  {type!=="login"&&<a href="/login">{t("signin")}</a>}
  {type==="login"&&<><a href="/signup">{t("signup")}</a><a href="/forgot-password">{t("forgot")}</a></>}
  {type==="signup"&&<a href="/login">{t("existing")} {t("signin")}</a>}
 </div>;
}
export function PatientAuthPage({mode}:{mode:"login"|"signup"|"forgot"|"reset"|"verify"}){
 const {t}=useWords();
 const [name,setName]=useState(""),[email,setEmail]=useState(""),
  [password,setPassword]=useState(""),[accepted,setAccepted]=useState(false),
  [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const labels={login:"signInHeading",signup:"signupHeading",forgot:"forgotHeading",
 reset:"resetHeading",verify:"verificationTitle"};
 const hints={login:"signInText",signup:"signupText",forgot:"forgotText",
 reset:"resetText",verify:"verificationText"};
 const next=typeof window!=="undefined"?safeNext(new URLSearchParams(window.location.search)
  .get("next")):"/account";
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   if(mode==="signup"){
    if(!accepted)throw Error("consent");
    const r=await authClient.signUp.email({name:name.trim(),email:email.trim().toLowerCase(),
     password,callbackURL:window.location.origin+"/verify"});
    if(r.error)throw r.error;
    setNotice(t("checkEmail"));
   }else if(mode==="login"){
    const r=await authClient.signIn.email({email:email.trim().toLowerCase(),password});
    if(r.error)throw r.error;
    const has2fa=(r.data as {twoFactorRedirect?:boolean}|null)?.twoFactorRedirect;
    window.location.assign(has2fa?"/account/2fa?next="+encodeURIComponent(next):next);
   }else if(mode==="forgot"){
    const r=await authClient.requestPasswordReset({email:email.trim().toLowerCase(),
     redirectTo:window.location.origin+"/reset-password"});
    if(r.error)throw r.error;
    setNotice(t("resetSent"));
   }else if(mode==="reset"){
    const token=new URLSearchParams(window.location.search).get("token");
    if(!token)throw Error("invalid token");
    const r=await authClient.resetPassword({newPassword:password,token});
    if(r.error)throw r.error;
    setNotice(t("resetDone"));setPassword("");
   }
  }catch{setError(mode==="login"?t("authProblem"):t("genericAuth"))}
  finally{setBusy(false)}
 }
 async function resend(){
  setBusy(true);setError("");setNotice("");
  try{
   // Do not reveal whether the submitted email is registered.
   await authClient.sendVerificationEmail({email:email.trim().toLowerCase(),
    callbackURL:window.location.origin+"/verify"});
   setNotice(t("verificationSent"));
  }catch{setNotice(t("verificationSent"))}finally{setBusy(false)}
 }
 return <div className="p14-auth-page">
  <section className="p14-auth-visual">
   <span className="p14-auth-kicker">DANDANLINK · PATIENT CARE</span>
   <div className="p14-auth-symbol" aria-hidden="true">✦</div>
   <h2>{t("welcome")}</h2><p>{t("welcomeSub")}</p>
   <div className="p14-auth-visual-footer"><span aria-hidden="true">✓</span>{t("accountFree")}</div>
  </section>
  <section className="p14-auth-form">
   <div className="p14-auth-card">
    <a className="p14-back-link" href="/">← {t("home")}</a>
    <span className="p14-eyebrow">{t("account")}</span>
    <h1>{t(labels[mode])}</h1><p className="p14-muted">{t(hints[mode])}</p>
    {mode==="verify"?<>
      <Notice kind={typeof window!=="undefined"&&
       new URLSearchParams(window.location.search).get("error")?"error":"info"}
       text={typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("error")?
        t("verificationError"):t("verificationDone")}/>
      <form onSubmit={e=>{e.preventDefault();void resend()}} className="p14-form">
       <F title={t("email")}><input type="email" value={email}
        onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></F>
       <button className="btn btn-secondary" type="submit" disabled={busy}>
        {t("resendVerification")}</button></form>
      <a href="/login" className="btn btn-primary p14-wide">{t("signin")}</a>
     </>:<>
     <form onSubmit={submit} className="p14-form">
      {mode==="signup"&&<F title={t("name")}><input required minLength={2}
       maxLength={120} value={name} onChange={e=>setName(e.target.value)}
       autoComplete="name"/></F>}
      {mode!=="reset"&&<F title={t("email")}><input type="email" required
       value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></F>}
      {["login","signup","reset"].includes(mode)&&
       <F title={mode==="reset"?t("newPassword"):t("password")} hint={t("passwordPolicy")}>
        <PasswordInput value={password} onChange={setPassword}/></F>}
      {mode==="signup"&&<label className="p14-check">
       <input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>
       <span>{t("agree")} <a href="/terms" target="_blank" rel="noopener noreferrer">
        {t("terms")}</a> · <a href="/privacy" target="_blank" rel="noopener noreferrer">
        {t("legalPrivacy")}</a></span></label>}
      <button disabled={busy} className="btn btn-primary p14-wide" type="submit">
       {busy?t("sending"):mode==="login"?t("signin"):
        mode==="signup"?t("create"):mode==="forgot"?t("resetRequest"):t("resetSubmit")}</button>
     </form>
     <Notice kind="success" text={notice}/><Notice kind="error" text={error}/>
     <AuthLinks type={mode}/>
    </>}
    <div className="p14-auth-bottom"><span aria-hidden="true">✧</span>
     {t("publicOnly")} <a href="/search">{t("find")}</a></div>
   </div>
  </section>
 </div>;
}
function AccountGate({children,allowUnregistered=false}:{children:(a:Account)=>ReactNode;allowUnregistered?:boolean}){
 const {t}=useWords(),me=usePatient<Account>("/me");
 useEffect(()=>{
  if(!me.error)return;
  if(me.error.status===401)window.location.replace("/login?next="+encodeURIComponent(
   window.location.pathname+window.location.search));
 },[me.error]);
 useEffect(()=>{
  if(!me.data)return;
  if(!me.data.registered&&!allowUnregistered)
   window.location.replace("/account/onboarding?next="+encodeURIComponent(
    window.location.pathname+window.location.search));
  if(me.data.registered&&allowUnregistered)window.location.replace("/account");
 },[me.data,allowUnregistered]);
 if(me.loading)return <Spinner/>;
 if(me.error?.status===401)return <Spinner/>;
 if(me.error?.status===403)return <div className="p14-page"><section className="p14-error">
  <h2>{t("unauthorized")}</h2><a href="/verify" className="btn btn-primary">
   {t("verificationTitle")}</a></section></div>;
 if(me.error||!me.data)return <ErrorPanel error={me.error} retry={me.refresh}/>;
 if(!me.data.registered&&!allowUnregistered)return <Spinner/>;
 if(me.data.registered&&allowUnregistered)return <Spinner/>;
 return <>{children(me.data)}</>;
}
export function PatientOnboardingPage(){
 const {t}=useWords();return <AccountGate allowUnregistered>{me=><Onboard me={me}/>}</AccountGate>;
}
function Onboard({me}:{me:Account}){
 const {t}=useWords();
 const [name,setName]=useState(me.user.name),[city,setCity]=useState("Kabul"),
  [phone,setPhone]=useState(""),[legal,setLegal]=useState(false),
  [adult,setAdult]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   if(!adult||!legal)throw Error("consent");
   await request("/onboard","POST",{preferredName:name,city,phone:phone||null,
    termsAccepted:true,privacyAcknowledged:true,adultAttested:true,
    termsVersion:me.onboarding.termsVersion,
    privacyVersion:me.onboarding.privacyVersion});
   window.location.assign(safeNext(new URLSearchParams(window.location.search).get("next")));
  }catch(err){setError(safeError(err,t))}finally{setBusy(false)}
 }
 return <main className="p14-onboarding p14-page">
  <div className="p14-step-header"><span className="p14-eyebrow">{t("accountFree")}</span>
   <h1>{t("onbHeading")}</h1><p>{t("onbSub")}</p></div>
  <div className="p14-setup-grid">
   <form onSubmit={submit} className="p14-surface p14-form">
    <div className="p14-setup-section"><h2>{t("basicInfo")}</h2>
     <p><span className="p14-checkmark">✓</span> {t("verified")}: <bdi dir="ltr">{me.user.email}</bdi></p></div>
    <F title={t("preferredName")}><input required minLength={2} maxLength={120} value={name}
     onChange={e=>setName(e.target.value)}/></F>
    <F title={t("city")}><input required minLength={2} maxLength={90}
     value={city} onChange={e=>setCity(e.target.value)}/></F>
    <F title={t("phone")} hint={t("phoneUnverified")}><input value={phone}
     onChange={e=>setPhone(e.target.value)} autoComplete="tel" dir="ltr" maxLength={22}/></F>
    <div className="p14-form-divider"/>
    <label className="p14-check"><input type="checkbox" checked={legal} required
     onChange={e=>setLegal(e.target.checked)}/><span>{t("onbConsent")}:
     <a href="/terms" target="_blank" rel="noopener noreferrer"> {t("terms")}</a> ·
     <a href="/privacy" target="_blank" rel="noopener noreferrer"> {t("legalPrivacy")}</a></span></label>
    <label className="p14-check"><input type="checkbox" checked={adult} required
     onChange={e=>setAdult(e.target.checked)}/><span>{t("adultSelf")}</span></label>
    <p className="p14-muted">{t("adultSelfNote")}</p>
    <Notice kind="error" text={error}/>
    <button className="btn btn-primary p14-wide" disabled={busy||!legal||!adult} type="submit">
     {busy?t("activating"):t("finish")} →</button>
   </form>
   <aside className="p14-setup-aside p14-surface">
    <div className="p14-account-symbol" aria-hidden="true">✦</div>
    <h2>{t("chooseLanguage")}</h2><LocaleControls/>
    <p>{t("accountFree")}</p><p>{t("noRecordAccess")}</p>
    <a href="/privacy" className="p14-inline">{t("privacyLink")} →</a>
   </aside>
  </div>
 </main>;
}
const nav=[
 {key:"overview",href:"/account",icon:"▦"},
 {key:"personal",href:"/account/profile",icon:"◌"},
 {key:"family",href:"/account/family",icon:"◇"},
 {key:"preferences",href:"/account/preferences",icon:"⚙"},
 {key:"privacy",href:"/account/privacy",icon:"▧"},
 {key:"security",href:"/account/security",icon:"♙"}
] as const;
function AccountSpace({me,active,children}:{me:Account;active:string;children:ReactNode}){
 const {t}=useWords(),profile=me.profile!;
 const [signed,setSigned]=useState(false);
 async function signout(){setSigned(true);try{await authClient.signOut();
  window.location.assign("/login")}catch{setSigned(false)}}
 return <div className="p14-account">
  <header className="p14-account-header">
   <div><span className="p14-eyebrow">DANDANLINK · {t("account")}</span>
    <h1>{t("account")}</h1></div>
   <a className="btn btn-secondary" href="/search">{t("goSearch")} ↗</a></header>
  <div className="p14-account-grid">
   <aside className="p14-account-side">
    <div className="p14-account-identity"><span className="p14-account-avatar">
     {profile.avatar.initials}</span><div><strong>{profile.preferredName}</strong>
      <small>{t("verified")} ✓</small></div></div>
    <nav aria-label={t("account")} className="p14-account-nav">
     {nav.map(n=><a href={n.href} key={n.key} aria-current={n.key===active?"page":undefined}>
      <span aria-hidden="true">{n.icon}</span>{t(n.key)}</a>)}</nav>
    <div className="p14-account-side-bottom">
     <button type="button" onClick={signout} disabled={signed}>
      <span aria-hidden="true">⇥</span>{t("signout")}</button>
     <p>{t("noBook")}</p></div>
   </aside>
   <main className="p14-account-body">{children}</main>
  </div>
 </div>;
}
function Shell({active,children}:{active:string;children:(a:Account)=>ReactNode}){
 return <AccountGate>{me=><AccountSpace me={me} active={active}>
  {children(me)}</AccountSpace>}</AccountGate>;
}
function StatusCard({label,value,sub,href}:{label:string;value:string|number;sub:string;href?:string}){
 return <div className="p14-status-card"><span>{label}</span><strong>{value}</strong>
 <small>{sub}</small>{href&&<a href={href} aria-label={label+" · "+sub}>→</a>}</div>;
}
export function PatientAccountHome(){
 const {t,displayDate}=useWords();
 return <Shell active="overview">{me=><AccountHomeContent me={me} t={t} displayDate={displayDate}/>}</Shell>;
}
function AccountHomeContent({me,t,displayDate}:{me:Account;t:(k:string)=>string;
 displayDate:(x:string)=>string}){
 const family=usePatient<Family>("/family"),p=me.profile!;
 return <div className="p14-stack">
  <section className="p14-welcome"><div><span className="p14-eyebrow">
   {t("verifiedAccount")} ✓</span>
   <h2>{t("welcome")}</h2><p>{t("welcomeSub")}</p>
   <a className="btn btn-primary" href="/account/profile">{t("editProfile")} →</a>
   </div><div className="p14-welcome-symbol" aria-hidden="true">✦</div>
  </section>
  <div className="p14-stats">
   <StatusCard label={t("status")} value={t("active")} sub={t("accountActive")} href="/account/profile"/>
   <StatusCard label={t("familyMembers")} value={family.data?.total??"—"}
    sub={t("manageFamily")} href="/account/family"/>
   <StatusCard label={t("memberSince")} value={displayDate(me.user.joinedAt)}
    sub={t("verified")} href="/account/security"/>
  </div>
  <section className="p14-surface"><div className="p14-section-head">
   <div><h2>{t("actions")}</h2><p>{t("realFeatures")}</p></div></div>
   <div className="p14-quick-grid">
    {([["personal","editProfile","/account/profile","◌"],
       ["family","manageFamily","/account/family","◇"],
       ["preferences","managePreferences","/account/preferences","⚙"],
       ["privacy","managePrivacy","/account/privacy","▧"],
       ["security","manageSecurity","/account/security","♙"],
       ["find","goSearch","/search","⌕"]] as const).map(([title,body,href,icon])=>
       <a className="p14-quick-card" key={href} href={href}>
        <span className="p14-quick-icon" aria-hidden="true">{icon}</span>
        <span><strong>{t(title)}</strong><small>{t(body)}</small></span><b aria-hidden="true">→</b>
       </a>)}
   </div>
  </section>
  <section className="p14-info-panel"><span aria-hidden="true">ⓘ</span>
   <div><strong>{t("upcoming")}</strong><p>{t("noBook")} {t("noShared")}</p></div></section>
 </div>;
}
export function PatientProfilePage(){const {t}=useWords();return <Shell active="personal">{me=>
 <ProfileEdit me={me} t={t}/>}</Shell>}
function ProfileEdit({me,t}:{me:Account;t:(k:string)=>string}){
 const p=me.profile!,[name,setName]=useState(p.preferredName),
  [city,setCity]=useState(p.city),[phone,setPhone]=useState(p.phone||""),
  [row,setRow]=useState(p),[busy,setBusy]=useState(false),
  [notice,setNotice]=useState(""),[error,setError]=useState("");
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setNotice("");setError("");
  try{const r=await request<{profile:Profile}>("/me","PUT",{preferredName:name,
   city,phone:phone||null,revision:row.revision});
   setRow(r.profile);setNotice(t("saved"))}
  catch(err){setError(safeError(err,t))}finally{setBusy(false)}
 }
 return <div className="p14-stack">
  {titleText(t("personal"),t("profileIntro"))}
  <div className="p14-surface p14-profile-head">
   <span className="p14-big-avatar">{row.avatar.initials}</span>
   <div><h2>{row.preferredName}</h2><p>{t("avatarNote")}</p>
    <span className="p14-chip">✓ {t("verified")}</span></div>
  </div>
  <form onSubmit={submit} className="p14-surface p14-form">
   <h2>{t("basicInfo")}</h2>
   <F title={t("profileName")}><input required maxLength={120} minLength={2}
    value={name} onChange={e=>setName(e.target.value)}/></F>
   <F title={t("profileEmail")}><input type="email" dir="ltr"
    disabled value={me.user.email}/></F>
   <F title={t("profileCity")}><input required minLength={2} maxLength={90}
    value={city} onChange={e=>setCity(e.target.value)}/></F>
   <F title={t("profilePhone")} hint={t("phoneUnverified")}>
    <input dir="ltr" maxLength={22} type="tel" value={phone}
     onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></F>
   <Notice kind="success" text={notice}/><Notice kind="error" text={error}/>
   <button className="btn btn-primary" disabled={busy} type="submit">
    {busy?t("sending"):t("save")}</button>
  </form>
  <section className="p14-info-panel"><span aria-hidden="true">ⓘ</span>
   <div><strong>{t("important")}</strong><p>{t("profileNote")}</p></div></section>
 </div>;
}
function dateIso(s:string|null){return s?String(s).slice(0,10):""}
function ChildForm({existing,onDone,onCancel}:{existing:FamilyMember|null;
 onDone:()=>void;onCancel:()=>void}){
 const {t}=useWords(),[name,setName]=useState(existing?.displayName||""),
  [dob,setDob]=useState(dateIso(existing?.dateOfBirth||null)),
  [relation,setRelation]=useState(existing?.relationship||"child"),
  [agree,setAgree]=useState(false),[busy,setBusy]=useState(false),
  [error,setError]=useState("");
 const currentYear=new Date().getUTCFullYear();
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setBusy(true);
  try{
   const payload={displayName:name,dateOfBirth:dob,relationship:relation,
    authorizationStatement:agree,guardianPolicyVersion:"patient-family-2026-11-14-v1",
    ...(existing?{revision:existing.revision}:{})};
   await request(existing?"/family/minors/"+existing.id:"/family/minors",
    existing?"PUT":"POST",payload);onDone();
  }catch(err){setError(safeError(err,t))}finally{setBusy(false)}
 }
 return <form className="p14-form p14-family-form" onSubmit={submit}>
  <h3>{existing?t("editChild"):t("addChild")}</h3>
  <F title={t("childName")}><input value={name} minLength={2} maxLength={120}
   required onChange={e=>setName(e.target.value)} autoComplete="off"/></F>
  <div className="p14-form-two">
   <F title={t("birth")} hint={t("dateExplain")}><input type="date" required
    min={(currentYear-18)+"-01-01"} max={new Date().toISOString().slice(0,10)}
    value={dob} onChange={e=>setDob(e.target.value)}/></F>
   <F title={t("relationship")}><select value={relation}
    onChange={e=>setRelation(e.target.value)}>
    <option value="child">{t("relationshipChild")}</option>
    <option value="legal_guardian">{t("relationshipLegal")}</option></select></F>
  </div>
  <label className="p14-check"><input type="checkbox" required checked={agree}
   onChange={e=>setAgree(e.target.checked)}/><span>{t("attest")}</span></label>
  <p className="p14-muted">{t("minorPolicy")}</p><Notice kind="error" text={error}/>
  <div className="p14-actions"><button className="btn btn-primary" disabled={busy||!agree}
   type="submit">{busy?t("sending"):existing?t("update"):t("add")}</button>
   <button type="button" className="btn btn-secondary" onClick={onCancel}>{t("cancel")}</button>
  </div>
 </form>;
}
function FamilyContent(){
 const {t,displayDate}=useWords();
 const family=usePatient<Family>("/family");
 const incoming=usePatient<{requests:Invitation[]}>("/family/requests");
 const delegations=usePatient<{delegations:Delegation[]}>("/family/delegations");
 const [panel,setPanel]=useState("members"),[form,setForm]=useState<FamilyMember|null|undefined>(undefined),
  [email,setEmail]=useState(""),[inviteBusy,setInviteBusy]=useState(false),
  [inviteNotice,setInviteNotice]=useState(""),[consenting,setConsenting]=useState<Record<string,boolean>>({}),
  [busy,setBusy]=useState(""),[message,setMessage]=useState(""),[fault,setFault]=useState("");
 async function refresh(){family.refresh();incoming.refresh();delegations.refresh()}
 function done(){setForm(undefined);setMessage(t("memberUpdated"));void refresh()}
 async function remove(id:string,rev:number){
  if(!window.confirm(t("confirmRemove")))return;
  setBusy(id);setFault("");setMessage("");
  try{await request("/family/"+id,"DELETE",{revision:rev});
   setMessage(t("removeSuccess"));void refresh()}catch(e){setFault(safeError(e,t))}
  finally{setBusy("")}
 }
 async function invite(e:FormEvent){
  e.preventDefault();setInviteBusy(true);setInviteNotice("");setFault("");
  try{await request("/family/invite-adult","POST",{email,explicitAuthorization:true});
   setEmail("");setInviteNotice(t("inviteSuccess"))}
  catch(e){setFault(safeError(e,t))}finally{setInviteBusy(false)}
 }
 async function decide(id:string,decision:"accept"|"decline"){
  if(decision==="accept"&&!consenting[id])return;
  setBusy(id);setFault("");setMessage("");
  try{await request("/family/requests/"+id+"/decide","POST",{
   decision,adultConsent:true});
   setMessage(t(decision==="accept"?"accepted":"declined"));void refresh()}
  catch(e){setFault(safeError(e,t))}finally{setBusy("")}
 }
 async function selfRevoke(id:string){
  if(!window.confirm(t("confirmRemove")))return;
  setBusy(id);setFault("");
  try{await request("/family/delegations/"+id,"DELETE");
   setMessage(t("removeSuccess"));void refresh()}
  catch(e){setFault(safeError(e,t))}finally{setBusy("")}
 }
 const child=form!==undefined;
 return <div className="p14-stack">
  {titleText(t("family"),t("familyIntro"))}
  <div className="p14-family-tabs" role="tablist" aria-label={t("family")}>
   {([["members","familyTab"],["requests","requestsTab"],["delegations","delegationsTab"]] as const)
    .map(([key,label])=><button key={key} type="button"
    aria-selected={panel===key} role="tab" onClick={()=>setPanel(key)}>
    {t(label)}{key==="requests"&&Boolean(incoming.data?.requests.length)&&
     <span className="p14-nav-count">{incoming.data!.requests.length}</span>}</button>)}
  </div>
  <Notice kind="success" text={message}/><Notice kind="error" text={fault}/>
  {panel==="members"&&<>
   <section className="p14-surface">
    <div className="p14-section-head"><div><h2>{t("familyMembers")}</h2>
     <p>{t("noRecordAccess")}</p></div>
     {!child&&<button type="button" className="btn btn-primary" onClick={()=>setForm(null)}>
      + {t("addChild")}</button>}</div>
    {child&&<ChildForm existing={form||null} onCancel={()=>setForm(undefined)} onDone={done}/>}
    {family.error?<ErrorPanel error={family.error} retry={family.refresh}/>:family.loading?
     <Spinner/>:family.data?.members.length?
      <div className="p14-family-list">{family.data.members.map(x=>
       <article className="p14-family-member" key={x.id}>
        <div className="p14-member-symbol" aria-hidden="true">{x.memberType==="minor"?"◇":"◉"}</div>
        <div className="p14-member-main"><strong>{x.displayName}</strong>
         <small>{x.memberType==="minor"?t("child")+" · "+x.age+" "+t("years"):
          t("adult")}</small>
         <span className={x.eligibleForFutureBooking?"p14-chip":"p14-chip p14-chip-warning"}>
          {x.eligibleForFutureBooking?"✓ "+t(x.memberType==="minor"?"guardianAttested":"adultAccepted"):
           t("reauth")}</span>
         {x.memberType==="minor"&&<small>{t("birth")}: {displayDate(x.dateOfBirth)}</small>}
        </div>
        <div className="p14-member-actions">
         {x.memberType==="minor"&&x.eligibleForFutureBooking&&
          <button type="button" className="btn btn-secondary" onClick={()=>setForm(x)}>
           {t("editChild")}</button>}
         <button type="button" className="btn btn-secondary p14-danger"
          disabled={busy===x.id} onClick={()=>remove(x.id,x.revision)}>
          {t("remove")}</button></div>
       </article>)}</div>:
      <div className="p14-empty"><span aria-hidden="true">◇</span>
       <strong>{t("emptyFamily")}</strong><p>{t("emptyFamilySub")}</p></div>}
   </section>
   <section className="p14-surface"><h2>{t("inviteAdult")}</h2>
    <p className="p14-muted">{t("inviteHelp")}</p>
    <form className="p14-form" onSubmit={invite}>
     <F title={t("inviteEmail")}><input type="email" value={email} required
      onChange={e=>setEmail(e.target.value)} placeholder="person@example.com"
      autoComplete="email" dir="ltr"/></F>
     <button disabled={inviteBusy} className="btn btn-primary">{t("inviteAction")}</button>
    </form>
    <Notice kind="info" text={inviteNotice}/>
    <small className="p14-muted">{t("invitationWarning")}</small>
   </section>
  </>}
  {panel==="requests"&&<section className="p14-surface">
   <h2>{t("incoming")}</h2><p className="p14-muted">{t("incomingText")}</p>
   {incoming.error?<ErrorPanel error={incoming.error} retry={incoming.refresh}/>:
    incoming.loading?<Spinner/>:incoming.data?.requests.length?
     <div className="p14-family-list">{incoming.data.requests.map(x=>
      <article key={x.id} className="p14-family-member">
       <div className="p14-member-symbol" aria-hidden="true">↔</div>
       <div className="p14-member-main"><strong>{x.guardianName}</strong>
        <small>{t("expires")}: {displayDate(x.expiresAt)}</small>
        <label className="p14-check"><input type="checkbox" checked={!!consenting[x.id]}
         onChange={e=>setConsenting(old=>({...old,[x.id]:e.target.checked}))}/>
         <span>{t("acceptConsent")}</span></label></div>
       <div className="p14-member-actions"><button className="btn btn-primary"
        disabled={!consenting[x.id]||busy===x.id} type="button"
        onClick={()=>decide(x.id,"accept")}>{t("accept")}</button>
        <button className="btn btn-secondary" type="button" disabled={busy===x.id}
         onClick={()=>decide(x.id,"decline")}>{t("decline")}</button></div>
      </article>)}</div>:<div className="p14-empty"><strong>{t("incomingEmpty")}</strong></div>}
  </section>}
  {panel==="delegations"&&<section className="p14-surface">
   <h2>{t("ownDelegations")}</h2><p className="p14-muted">{t("delegationNote")}</p>
   {delegations.error?<ErrorPanel error={delegations.error} retry={delegations.refresh}/>:
    delegations.loading?<Spinner/>:delegations.data?.delegations.length?
     <div className="p14-family-list">{delegations.data.delegations.map(x=>
      <article className="p14-family-member" key={x.id}>
       <div className="p14-member-symbol" aria-hidden="true">◉</div>
       <div className="p14-member-main"><strong>{x.guardianName}</strong>
        <span className="p14-chip">✓ {t("adultAccepted")}</span></div>
       <button className="btn btn-secondary p14-danger" type="button"
        disabled={busy===x.id} onClick={()=>selfRevoke(x.id)}>{t("revocation")}</button>
      </article>)}</div>:<div className="p14-empty"><strong>{t("noDelegations")}</strong></div>}
  </section>}
  <div className="p14-info-panel"><span aria-hidden="true">ⓘ</span>
   <div><strong>{t("privacy")}</strong><p>{t("noRecordAccess")}</p></div></div>
 </div>;
}
export function PatientFamilyPage(){return <Shell active="family">{()=> <FamilyContent/>}</Shell>}
function PreferencesContent(){
 const {t}=useWords(),{locale,calendar,setLocale,setCalendar}=usePreferences();
 const data=usePatient<Preferences>("/preferences");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function save(next:Partial<{locale:Lang;calendar:"gregorian"|"solar_hijri";
  emailBookings:boolean;emailUpdates:boolean}>){
  if(!data.data)return;setBusy(true);setError("");setNotice("");
  try{
   const current=data.data;const target={locale,calendar,
    emailBookings:current.notifications.emailBookings,
    emailUpdates:current.notifications.emailUpdates,...next,revision:current.revision};
   const saved=await request<{revision:number}>("/preferences","PUT",target);
   if(next.locale)setLocale(next.locale);
   if(next.calendar)setCalendar(next.calendar);
   setNotice(t("saved"));data.refresh();
  }catch(e){setError(safeError(e,t));data.refresh()}finally{setBusy(false)}
 }
 return <div className="p14-stack">
  {titleText(t("preferences"),t("prefsIntro"))}
  {data.loading&&!data.data?<Spinner/>:data.error?<ErrorPanel error={data.error} retry={data.refresh}/>:<>
   <section className="p14-surface"><h2>{t("chooseLanguage")}</h2>
    <div className="p14-form-two">
     <F title={t("language")}><select value={locale} disabled={busy}
      onChange={e=>save({locale:e.target.value as Lang})}>
      <option value="fa-AF">دری</option><option value="ps-AF">پښتو</option>
      <option value="en">English</option></select></F>
     <F title={t("calendar")}><select value={calendar} disabled={busy}
      onChange={e=>save({calendar:e.target.value as "gregorian"|"solar_hijri"})}>
      <option value="solar_hijri">{t("solar")}</option>
      <option value="gregorian">{t("gregorian")}</option></select></F>
    </div>
   </section>
   <section className="p14-surface"><h2>{t("notifs")}</h2>
    <div className="p14-toggle-list">
     <label className="p14-toggle"><span><strong>{t("bookingEmails")}</strong>
      <small>{t("bookingEmailsHint")}</small></span><input type="checkbox" disabled={busy}
      checked={!!data.data?.notifications.emailBookings}
      onChange={e=>save({emailBookings:e.target.checked})}/></label>
     <label className="p14-toggle"><span><strong>{t("newsEmails")}</strong>
      <small>{t("newsEmailsHint")}</small></span><input type="checkbox" disabled={busy}
      checked={!!data.data?.notifications.emailUpdates}
      onChange={e=>save({emailUpdates:e.target.checked})}/></label>
    </div>
    <p className="p14-muted">{data.data?.notifications.emailDeliveryConfigured?t("emailConfigured"):
     t("emailOffline")}. {t("smsPushUnavailable")}</p>
    <p className="p14-muted">{t("noNotifs")}</p>
   </section>
   <section className="p14-surface"><h2>{t("consentStatus")}</h2>
    <span className="p14-chip p14-chip-warning">{t("consentNone")}</span>
    <p>{t("privacyHint")}</p><a className="btn btn-secondary" href="/account/privacy">
     {t("managePrivacy")}</a>
   </section></>}
  <Notice kind="success" text={notice}/><Notice kind="error" text={error}/>
 </div>;
}
export function PatientPreferencesPage(){return <Shell active="preferences">{()=>
 <PreferencesContent/>}</Shell>}
function PrivacyContent(){
 const {t,displayDate}=useWords();
 const consent=usePatient<{events:ConsentEvent[];clinicalAccessGrants:[]}>("/privacy/consents");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function exportData(){
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch(API+"/v1/patients/privacy/export",{
    cache:"no-store",credentials:"include"});
   if(!r.ok)throw Error("download failed");
   const data=await r.blob(),url=URL.createObjectURL(data);
   const link=document.createElement("a");link.href=url;
   link.download="dandanlink-patient-account.json";document.body.appendChild(link);
   link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage(t("exported"));consent.refresh();
  }catch{setError(t("error"))}finally{setBusy(false)}
 }
 const eventTitles:Record<string,string>={portal_terms:"terms",
  portal_privacy:"legalPrivacy",notifications:"notifs",
  family_minor:"family",family_adult:"family",data_access:"export"};
 return <div className="p14-stack">
  {titleText(t("managePrivacy"),t("privacyIntro"))}
  <section className="p14-surface"><h2>{t("recordLinkNone")}</h2>
   <span className="p14-chip p14-chip-warning">{t("noLinks")}</span>
   <p>{t("privacySummary")}</p><p>{t("privacyFuture")}</p>
   <a href="/privacy" className="p14-inline">{t("privacyLink")} →</a>
  </section>
  <section className="p14-surface"><h2>{t("export")}</h2>
   <p className="p14-muted">{t("exportHint")}</p>
   <button type="button" className="btn btn-primary" onClick={exportData}
    disabled={busy}>{busy?t("sending"):t("export")} ↓</button>
   <Notice kind="success" text={message}/><Notice kind="error" text={error}/>
  </section>
  <section className="p14-surface"><div className="p14-section-head">
    <div><h2>{t("events")}</h2><p>{t("privacyIntro")}</p></div>
    <button type="button" className="btn btn-secondary" onClick={consent.refresh}>
     {t("retry")}</button></div>
   {consent.error?<ErrorPanel error={consent.error} retry={consent.refresh}/>:
    consent.loading?<Spinner/>:consent.data?.events.length?
     <div className="p14-history">{consent.data.events.map((row,i)=>
      <div className="p14-history-line" key={row.subjectType+row.createdAt+i}>
       <span className="p14-history-dot" aria-hidden="true">✓</span>
       <div><strong>{t(eventTitles[row.subjectType]||"privacy")}</strong>
        <small>{displayDate(row.createdAt)} · {row.policyVersion}</small></div>
       <span className={row.consent?"p14-chip":"p14-chip p14-chip-warning"}>
        {t(row.consent?"consentYes":"consentNo")}</span></div>)}</div>:
     <p className="p14-muted">{t("historyEmpty")}</p>}
  </section>
 </div>;
}
export function PatientPrivacyPage(){return <Shell active="privacy">{()=>
 <PrivacyContent/>}</Shell>}
function SecurityContent({me}:{me:Account}){
 const {t,displayDate}=useWords();
 const data=usePatient<{sessions:Session[]}>("/security/sessions");
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function revoke(id:string){
  if(!window.confirm(t("sessionRevoke")+"?"))return;
  setBusy(id);setNotice("");setError("");
  try{await request("/security/sessions/"+encodeURIComponent(id),"DELETE");
   setNotice(t("sessionRevoked"));data.refresh()}
  catch{setError(t("error"))}finally{setBusy("")}
 }
 async function signout(){setBusy("signout");try{await authClient.signOut();
  window.location.assign("/login")}finally{setBusy("")}}
 return <div className="p14-stack">
  {titleText(t("security"),t("securityIntro"))}
  <section className="p14-surface"><h2>{t("verifiedAccount")}</h2>
   <div className="p14-security-email"><span className="p14-chip">✓ {t("verified")}</span>
    <bdi dir="ltr">{me.user.email}</bdi></div>
   <p className="p14-muted">{t("securityHint")}</p>
   <div className="p14-actions"><a href="/forgot-password" className="btn btn-secondary">
    {t("resetPassword")}</a>
    <button className="btn btn-primary" disabled={busy==="signout"}
     type="button" onClick={signout}>{t("logout")}</button></div>
  </section>
  <section className="p14-surface"><div className="p14-section-head">
   <div><h2>{t("sessions")}</h2><p>{t("sessionTip")}</p></div>
   <button type="button" className="btn btn-secondary" onClick={data.refresh}>
    {t("retry")}</button></div>
   {data.error?<ErrorPanel error={data.error} retry={data.refresh}/>:data.loading?
    <Spinner/>:data.data?.sessions.length?
     <div className="p14-session-list">{data.data.sessions.map(s=>
      <article key={s.id} className="p14-session">
       <span className="p14-device-icon" aria-hidden="true">▣</span>
       <div><strong>{s.device}</strong>
        <small>{t("sessionDate")}: {displayDate(s.createdAt)} ·
         {t("expires")}: {displayDate(s.expiresAt)}</small>
        {s.ipAddress&&<small dir="ltr">IP: {s.ipAddress}</small>}</div>
       <button type="button" className="btn btn-secondary p14-danger"
        onClick={()=>revoke(s.id)} disabled={busy===s.id}>{t("sessionRevoke")}</button>
      </article>)}</div>:<p className="p14-muted">{t("noSessions")}</p>}
  </section>
  <Notice kind="success" text={notice}/><Notice kind="error" text={error}/>
 </div>;
}
export function PatientSecurityPage(){return <Shell active="security">{me=>
 <SecurityContent me={me}/>}</Shell>}
export function PatientLegalPage({mode}:{mode:"privacy"|"terms"}){
 const {t}=useWords(),privacy=mode==="privacy";
 return <article className="p14-legal p14-page">
  <a className="p14-back-link" href="/">{t("home")} ←</a>
  <span className="p14-eyebrow">DANDANLINK CARE · 2026-11-14</span>
  <h1>{t(privacy?"legalPrivacy":"terms")}</h1>
  <div className="p14-surface p14-legal-body">
   <p><strong>{t("legalVersion")}:</strong> {privacy?"patient-privacy-2026-11-14-v1":
    "patient-terms-2026-11-14-v1"}</p>
   <h2>{t("privacySummary")}</h2>
   <p>{t("privacyHint")}</p>
   <p>{t("noRecordAccess")}</p>
   <p>{t("noBook")}</p>
   <p>{t("exportHint")}</p>
   <p>{t("draftLegal")}</p>
   <div className="p14-actions"><a href="/signup" className="btn btn-primary">
    {t("signup")}</a><a href="/search" className="btn btn-secondary">{t("find")}</a></div>
  </div>
 </article>;
}
