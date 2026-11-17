"use client";
import React, { useEffect, useState, useRef, type FormEvent, type ReactNode } from "react";
import { authClient, InlineAlert, usePreferences, AdminMfaSetup, LocaleControls, CareIcon, type CareIconName } from "./index";
import { ClinicOperationsOverview } from "./clinic-operations-dashboard";
import { Phase02Portal } from "./phase02";
import {usePersistentClinicShell,useClinicWorkspaceSession} from "./clinic-shell-context";
import {staffTab,staffMayInvite,staffAssignableRoles,staffEmail,staffFiltered,
 staffPage,staffStats,staffMayManage,type StaffEntry,type StaffRole,type StaffState} from "./clinic-staff-model";
type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;
  membershipId:string;role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
const base=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const labels:Record<string,Record<string,string>>={
 en:{
  appointments:"Appointments",queue:"Today’s queue",subscription:"Subscription",bookingRequests:"Online requests",notifications:"Notifications",clinical:"Clinical",finance:"Finance",reports:"Reports",exportData:"Export & Retention",listing:"Clinic Listing",myVerification:"My Credentials",settings:"Settings",workspace:"Workspace",operations:"Operations",services:"Services & Pricing",resources:"Chairs & Rooms",hours:"Hours & Holidays",patients:"Patients",staff:"Staff & Resources",team:"Team",dentists:"Dentists",invitations:"Invitations",
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
  appointments:"وقت‌های ملاقات",queue:"صف امروز",subscription:"اشتراک",clinical:"کلینیکی",finance:"مالی",reports:"گزارش‌ها",exportData:"دریافت و نگهداری",listing:"نمایش کلینیک",myVerification:"اسناد مسلکی من",settings:"تنظیمات",workspace:"فضای کاری",operations:"عملیات کلینیک",services:"خدمات و قیمت‌ها",resources:"چوکی‌ها و اتاق‌ها",hours:"ساعات و رخصتی‌ها",patients:"مریضان",staff:"کارمندان و منابع",team:"تیم",dentists:"داکتران دندان",invitations:"دعوت‌ها",
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
  appointments:"لیدنې",queue:"د نن کتار",subscription:"ګډون",clinical:"کلینیکي",finance:"مالي چارې",reports:"راپورونه",exportData:"صادرات او ساتنه",listing:"د کلینیک پېژندنه",myVerification:"زما مسلکي اسناد",settings:"تنظیمات",workspace:"کاري برخه",operations:"د کلینیک چارې",services:"خدمتونه او بیې",resources:"څوکۍ او خونې",hours:"وختونه او رخصتۍ",patients:"ناروغان",staff:"کارکوونکي او سرچینې",team:"ټیم",dentists:"د غاښونو ډاکټران",invitations:"بلنې",
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
const phase13Words:Record<string,Record<string,string>>={
 en:{
  teamWorkspace:"People & access",teamIntro:"Manage your clinic's real staff memberships, clinician drafts and invitation lifecycle.",
  activeMembers:"Active staff",suspendedMembers:"Suspended",clinicalTeam:"Active clinicians",
  teamSearch:"Search members",teamSearchHint:"Name, email or role",teamRoleFilter:"Role filter",
  teamCount:"Showing",teamOf:"of",teamMembers:"members",teamReset:"Clear filters",
  teamEmpty:"No staff matches these filters.",teamRefresh:"Refresh staff",
  teamPermissions:"Role permissions are checked by the server for every action.",
  teamLimit:"Only members of the selected clinic appear here. Nothing is sent to patients.",
  teamOpen:"Review membership",teamAllRoles:"All roles",teamPage:"Staff directory pages",
  invitationSafety:"Invitation grants no access until accepted by a verified account.",
  invitationReview:"Review staff invitation",invitationReviewNote:"Confirm the recipient, clinic and role before sending. The recipient must accept the invitation.",
  invitationReviewCheck:"I checked the email address, clinic and intended role.",
  invitationConfirm:"Send verified invitation",invitationLimit:"Latest 100 invitations from the selected clinic",
  invitationEmail:"Invitee email",invitationRole:"Intended role",invitationExpires:"Expires in 7 days",
  invitationRevokeReview:"Review invitation revocation",invitationRevokeNote:"The invitation will be invalidated. This does not delete an accepted membership.",
  invitationRevokeCheck:"I verified the invitation recipient and revocation reason.",
  invitationsSummary:"Invitation history",invitationNoAuto:"Staff seats and email delivery are checked by the server.",
  invitesSearch:"Search invitations",invitesSearchHint:"Email or role",
  editStaff:"Membership actions",staffReviewTitle:"Review staff access change",
  staffReviewNote:"Confirm the member, clinic, reason and requested action. Staff sessions may be revoked on all devices.",
  staffReviewCheck:"I verified the staff identity and the consequences of this action.",
  staffReviewConfirm:"Confirm staff action",staffChanged:"Change requires a reason and permission. The owner and your own membership are protected.",
  staffPersonal:"Member profile",staffClinicianNote:"Professional details are private drafts, not public verification.",
  securitySummary:"Clinic access oversight",securityReadOnly:"Security activity is audit history, not an editable access grant.",
  securityEvents:"Recent audit events (latest 60)",securityMemberCount:"Visible memberships",securityNoAuto:"Actions here never expose patient files.",
  securitySessionHint:"These are sessions for your own account, not every staff member's devices.",
  securityReasonHint:"At least 5 characters. All sessions for your account will be ended.",
  securityActionReview:"Review sign-out of your devices",
  securityActionCheck:"I understand all my own sessions will be revoked.",
  modalCancel:"Keep editing",modalReason:"Documented reason",modalExpiry:"Invitation expiry",
  modalScope:"Selected clinic",modalMember:"Staff member",modalImpact:"Access impact",
  modalClose:"Close review",modified:"Modified",pendingStatus:"Pending invitations"
 },
 "fa-AF":{
  teamWorkspace:"کارمندان و دسترسی",teamIntro:"عضویت‌های واقعی کارمندان، پیش‌نویس داکتران و دعوت‌ها را مدیریت کنید.",
  activeMembers:"کارمندان فعال",suspendedMembers:"تعلیق‌شده",clinicalTeam:"داکتران فعال",
  teamSearch:"جستجوی کارمندان",teamSearchHint:"نام، ایمیل یا نقش",teamRoleFilter:"فیلتر نقش",
  teamCount:"نمایش",teamOf:"از",teamMembers:"کارمند",teamReset:"پاک‌کردن فیلتر",
  teamEmpty:"کارمندی در این فیلتر یافت نشد.",teamRefresh:"تازه‌سازی کارمندان",
  teamPermissions:"صلاحیت هر عمل توسط سرور بررسی می‌شود.",
  teamLimit:"فقط کارمندان کلینیک انتخاب‌شده نمایش داده می‌شوند؛ به مریضان ارسال نمی‌شود.",
  teamOpen:"بررسی عضویت",teamAllRoles:"تمام نقش‌ها",teamPage:"صفحات کارمندان",
  invitationSafety:"دعوت تا پذیرش حساب تأییدشده دسترسی نمی‌دهد.",
  invitationReview:"بررسی دعوت کارمند",invitationReviewNote:"پیش از ارسال، گیرنده، کلینیک و نقش را بررسی کنید؛ گیرنده باید دعوت را بپذیرد.",
  invitationReviewCheck:"ایمیل، کلینیک و نقش را بررسی کرده‌ام.",
  invitationConfirm:"ارسال دعوت تأییدشده",invitationLimit:"آخرین ۱۰۰ دعوت از کلینیک انتخاب‌شده",
  invitationEmail:"ایمیل گیرنده",invitationRole:"نقش مورد نظر",invitationExpires:"انقضا پس از ۷ روز",
  invitationRevokeReview:"بررسی لغو دعوت",invitationRevokeNote:"دعوت باطل می‌شود؛ عضویت پذیرفته‌شده حذف نمی‌گردد.",
  invitationRevokeCheck:"گیرنده و دلیل لغو را بررسی کردم.",
  invitationsSummary:"تاریخچۀ دعوت‌ها",invitationNoAuto:"ظرفیت کارمندان و ارسال ایمیل توسط سرور بررسی می‌شود.",
  invitesSearch:"جستجوی دعوت‌ها",invitesSearchHint:"ایمیل یا نقش",
  editStaff:"اقدامات عضویت",staffReviewTitle:"بررسی تغییر دسترسی کارمند",
  staffReviewNote:"کارمند، کلینیک، دلیل و عمل را بررسی کنید؛ نشست‌ها ممکن است در تمام دستگاه‌ها پایان یابند.",
  staffReviewCheck:"هویت کارمند و پیامدهای این عمل را بررسی کرده‌ام.",
  staffReviewConfirm:"تأیید تغییر دسترسی",staffChanged:"تغییر نیاز به دلیل و اجازه دارد؛ مالک و عضویت خودتان محافظت می‌شوند.",
  staffPersonal:"پروفایل عضویت",staffClinicianNote:"معلومات مسلکی فقط پیش‌نویس خصوصی است، نه تأیید عمومی.",
  securitySummary:"نظارت دسترسی کلینیک",securityReadOnly:"فعالیت‌های امنیتی تاریخچۀ حسابرسی هستند، نه مجوز قابل ویرایش.",
  securityEvents:"آخرین ۶۰ رویداد",securityMemberCount:"عضویت‌های قابل مشاهده",securityNoAuto:"در این قسمت فایل مریضان نشر نمی‌شود.",
  securitySessionHint:"این‌ها نشست‌های حساب خود شما اند، نه دستگاه‌های تمام کارمندان.",
  securityReasonHint:"حداقل ۵ حرف؛ تمام نشست‌های حساب شما پایان می‌یابند.",
  securityActionReview:"بررسی خروج از تمام دستگاه‌های خود",
  securityActionCheck:"می‌دانم تمام نشست‌های خودم پایان می‌یابد.",
  modalCancel:"ادامه ویرایش",modalReason:"دلیل ثبت‌شده",modalExpiry:"انقضای دعوت",
  modalScope:"کلینیک انتخاب‌شده",modalMember:"کارمند",modalImpact:"تأثیر بر دسترسی",
  modalClose:"بستن بررسی",modified:"تغییر یافته",pendingStatus:"دعوت‌های در انتظار"
 },
 "ps-AF":{
  teamWorkspace:"کارکوونکي او لاسرسی",teamIntro:"د کلینیک رښتیني کارکوونکي، د ډاکټرانو مسودې او بلنې سمبال کړئ.",
  activeMembers:"فعال کارکوونکي",suspendedMembers:"ځنډول شوي",clinicalTeam:"فعال ډاکټران",
  teamSearch:"کارکوونکي ولټوئ",teamSearchHint:"نوم، ایمیل یا دنده",teamRoleFilter:"د دندې چاڼ",
  teamCount:"ښودل",teamOf:"له",teamMembers:"کارکوونکي",teamReset:"چاڼ پاک کړئ",
  teamEmpty:"په دې چاڼ کې کارکوونکی نشته.",teamRefresh:"کارکوونکي تازه کړئ",
  teamPermissions:"هره کړنه د سرور په اجازه اجرا کېږي.",
  teamLimit:"یوازې د ټاکل شوي کلینیک کارکوونکي ښکاري؛ ناروغانو ته نه استول کېږي.",
  teamOpen:"غړیتوب وګورئ",teamAllRoles:"ټولې دندې",teamPage:"د کارکوونکو پاڼې",
  invitationSafety:"تر منل شوې تایید شوې بلنې مخکې لاسرسی نه ورکول کېږي.",
  invitationReview:"د کارکوونکي بلنه وګورئ",invitationReviewNote:"تر استولو مخکې برېښنالیک، کلینیک او دنده وګورئ؛ بلنه باید ومنل شي.",
  invitationReviewCheck:"برېښنالیک، کلینیک او دنده مې تایید کړه.",
  invitationConfirm:"تایید شوې بلنه واستوئ",invitationLimit:"د ټاکل شوي کلینیک وروستۍ ۱۰۰ بلنې",
  invitationEmail:"د بلل شوي برېښنالیک",invitationRole:"غوره شوې دنده",invitationExpires:"په ۷ ورځو کې پای",
  invitationRevokeReview:"د بلنې لغوه کول وګورئ",invitationRevokeNote:"بلنه باطله کېږي؛ منل شوی غړیتوب نه پاکېږي.",
  invitationRevokeCheck:"د بلنې اخیستونکی او دلیل مې تایید کړل.",
  invitationsSummary:"د بلنو تاریخچه",invitationNoAuto:"د کارکوونکو ظرفیت او ایمیل استول سرور تاییدوي.",
  invitesSearch:"بلنې ولټوئ",invitesSearchHint:"برېښنالیک یا دنده",
  editStaff:"د غړیتوب چارې",staffReviewTitle:"د کارکوونکي د لاسرسي بدلون وګورئ",
  staffReviewNote:"کارکوونکی، کلینیک، دلیل او عمل وګورئ؛ ناستې د ټولو وسایلو څخه بندېدای شي.",
  staffReviewCheck:"د کارکوونکي پېژندنه او د دې عمل پایلې مې تایید کړې.",
  staffReviewConfirm:"د لاسرسي بدلون تایید",staffChanged:"بدلون دلیل او اجازه غواړي؛ خاوند او ستاسو غړیتوب خوندي دي.",
  staffPersonal:"د کارکوونکي پروفایل",staffClinicianNote:"مسلکي معلومات شخصي مسودې دي، عام تایید نه دی.",
  securitySummary:"د کلینیک لاسرسي څارنه",securityReadOnly:"امنیتي پېښې د پلټنې تاریخ دي، د سمون اجازه نه ده.",
  securityEvents:"وروستۍ ۶۰ پېښې",securityMemberCount:"ښکاره غړیتوبونه",securityNoAuto:"د ناروغانو فایلونه نه خپرېږي.",
  securitySessionHint:"دا ستاسو خپل حساب ناستې دي، نه د ټولو کارکوونکو وسایل.",
  securityReasonHint:"لږ تر لږه ۵ توري؛ ستاسو ټولې ناستې پای ته رسېږي.",
  securityActionReview:"له خپلو ټولو وسیلو د وتلو کتنه",
  securityActionCheck:"پوهېږم ټولې خپلې ناستې بندېږي.",
  modalCancel:"سمون ته ستنېدل",modalReason:"ثبت شوی دلیل",modalExpiry:"د بلنې پای",
  modalScope:"ټاکل شوی کلینیک",modalMember:"کارکوونکی",modalImpact:"پر لاسرسي اغېز",
  modalClose:"کتنه بنده کړئ",modified:"بدل شوی",pendingStatus:"نا منل شوې بلنې"
 }
};
function useLang(){
 const {locale,calendar}=usePreferences();
 const t=(key:string)=>phase13Words[locale]?.[key]||labels[locale]?.[key]||phase13Words.en[key]||labels.en[key]||key;
 const date=(v:unknown)=>v?new Intl.DateTimeFormat(locale,{calendar:calendar==="solar_hijri"?"persian":"gregory",
   timeZone:"Asia/Kabul",year:"numeric",month:"short",day:"numeric"}).format(new Date(String(v))):"—";
 return {t,date,locale};
}
async function api(path:string,method="GET",body?:unknown,signal?:AbortSignal):Promise<any>{
 const result=await fetch(base+"/v1/team"+path,{method,credentials:"include",signal,
  cache:"no-store",headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Object.assign(new Error(data.code||"NETWORK"),{status:result.status});
 return data;
}
function useData(path:string|null){
 // A response for a previous clinic or staff screen must never render here,
 // including the React frame before the effect that clears the last result.
 const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>({
  path:null,data:null,error:""
 });
 const [number,setNumber]=useState(0);
 const reload=()=>setNumber(v=>v+1);
 useEffect(()=>{
  if(!path){setSnapshot({path:null,data:null,error:""});return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  setSnapshot({path,data:null,error:""});
  api(path,"GET",undefined,controller.signal).then(d=>{
   if(!controller.signal.aborted)setSnapshot({path,data:d,error:""});
  }).catch(e=>{
   if(!controller.signal.aborted)setSnapshot({path,data:null,error:e?.message||"NETWORK"});
  }).finally(()=>clearTimeout(timer));
  return()=>{clearTimeout(timer);controller.abort()};
 },[path,number]);
 return {data:snapshot.path===path?snapshot.data:null,
  error:snapshot.path===path?snapshot.error:"",reload};
}
function Banner({children,kind="info"}:{children:ReactNode,kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Busy(){const {t}=useLang();return <div className="card panel k-team-skeleton"
 role="status" aria-label={t("loading")}>
 <span className="k-skeleton-heading" aria-hidden="true">
  <span className="h-skeleton"/><span className="h-skeleton"/></span>
 {Array.from({length:3},(_,i)=><span className="k-skeleton-row" aria-hidden="true" key={i}>
  <span className="h-skeleton"/><span className="h-skeleton"/></span>)}
 <span className="sr-only">{t("loading")}</span>
 </div>;}
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
 const queue=link("queue","/clinic/appointments/queue","◷","workspace");
 const notifications=link("notifications","/clinic/settings/notifications","✉","settings");
 const patients=link("patients","/clinic/patients","♧","workspace");
 const clinical=link("clinical","/clinic/clinical","✚","workspace");
 const finance=link("finance","/clinic/finance","▤","workspace");
  const reports=link("reports","/clinic/reports","▥","workspace");
 const exportData=link("exportData","/clinic/settings/export","⇩","settings");
 const listing=link("listing","/clinic/listing","◈","workspace");
 const myVerification=link("myVerification","/clinic/credentials","◈","workspace");
 const staff=link("staff","/clinic/staff","◉","operations");
 const resources=link("resources","/clinic/resources","▦","operations");
 const services=link("services","/clinic/services","✦","operations");
 const hours=link("hours","/clinic/settings/hours","◷","operations");
 const security=link("security","/clinic/settings/security","⛨","settings");
 const settings=link("settings","/clinic/settings","⚙","settings");
 const subscription=link("subscription","/clinic/settings/subscription","▤","settings");
 const profile=link("myProfile","/clinic/staff/"+space.membershipId,"◎","settings");
 const options=[home];
 if(space.role==="owner"||space.role==="manager"){
  options.push(appointments,queue,bookingRequests,patients,finance,reports,listing,staff,resources,services,hours,notifications,security);
  if(space.clinicianEnabled)options.push(clinical);
  // The PH02 clinic-registration/settings routes are owner-only, unlike operations setup.
  if(space.role==="owner")options.push(settings);
  if(space.role==="owner")options.push(exportData);
  if(space.role==="owner")options.push(subscription);
 }else if(space.role==="dentist"||space.role==="receptionist"){
  options.push(appointments,queue,bookingRequests,patients,...(space.role==="dentist"?[clinical,myVerification]:[finance]),resources,services,hours,profile,security);
 }else if(space.role==="assistant"){
  options.push(appointments,queue,clinical,profile,security);
 }else if(space.role==="cashier"){
  options.push(finance,reports,patients,profile,security);
 }else options.push(profile,security);
 return options;
}
export function Shell({ctx,space,active,children}:{ctx:Context,space:Space,active:string,children:ReactNode}){
 const {t}=useLang();const persistent=usePersistentClinicShell();
 const nav=navigation(space,t);
 // /clinic/layout.tsx now owns the sidebar/header across client-side routes.
 // Retain the original stand-alone shell as a safe fallback in other contexts.
 if(persistent)return <>{children}</>;
 const pageHasOwnHeading=["home","patients","services","resources","hours","appointments","queue","bookingRequests","notifications","clinical","finance","reports","export","listing","myVerification","subscription","settings"].includes(active);
 return <div className="work-layout phase-layout staff-shell">
  <aside className="card side-panel staff-side">
    <div className="pill">{t(space.role)}</div>
    <div className="staff-tenant-title">{space.clinicName}</div>
    <div className="staff-desktop-menu"><NavLinks nav={nav} active={active}/></div>
    <details className="staff-phone-menu"><summary>{t("chooseTab")} · {nav.find(n=>n.key===active)?.title||t("home")}</summary><NavLinks nav={nav} active={active}/></details>
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
const clinicIcons:Record<string,CareIconName>={
 home:"layout-dashboard",appointments:"calendar",queue:"clock",bookingRequests:"bell",
 notifications:"mail",patients:"users",clinical:"dental",finance:"receipt",reports:"chart-columns",
 exportData:"download",listing:"clinic",myVerification:"badge-check",staff:"users",
 resources:"hospital",services:"clipboard",hours:"clock",security:"shield-check",
 settings:"settings",subscription:"credit-card",myProfile:"account"
};
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
      <CareIcon name={clinicIcons[item.key]||"panel"} size={20}/></span><span>{item.title}</span></a>
   </React.Fragment>;
  })}
 </nav>;
}
function useContextAndSpace(){
 const session=useClinicWorkspaceSession();
 // The Next clinic layout fetched the authenticated tenant context exactly
 // once. Existing pages keep their own in-page data requests; no second
 // /v1/team/context call or full navigation skeleton is needed.
 const {data,error,reload}=useData(session?null:"/context");
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  if(!session)setRequested(new URLSearchParams(location.search).get("clinic"));
 },[session]);
 if(session)return {ctx:session.ctx as Context|null,
  space:session.space as Space|undefined,error:"",reload,
  requested:session.requested};
 const spaces=(data as Context|undefined)?.clinics||[];
 const selected=requested===undefined?undefined:requested?
  spaces.find(x=>x.clinicId===requested):spaces[0];
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
 // Unregistered owners still use the existing clinic registration flow. All active roles
 // enter the same tenant-scoped, real-data operations overview.
 if(!requested && !space)return <Phase02Portal audience="clinic" view="dashboard"/>;
 if(requested && !space)return <div className="page-narrow card panel"><Banner kind="error">{t("missingClinic")}</Banner>
    <a className="btn btn-secondary" href="/clinic">{t("home")}</a></div>;
 if(!space)return <Phase02Portal audience="clinic" view="dashboard"/>;
 return <Shell ctx={ctx} space={space} active="home"><ClinicOperationsOverview ctx={ctx} space={space}/></Shell>;
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
function StaffPager({page,pages,onPage,label}:{page:number;pages:number;
 onPage:(n:number)=>void;label:string}){
 const {t}=useLang();
 if(pages<=1)return null;
 return <nav className="clinic-phase13-pager" aria-label={label}>
  <button type="button" className="btn btn-secondary" disabled={page<=1}
   onClick={()=>onPage(Math.max(1,page-1))}>{t("previous")}</button>
  <span>{page} / {pages}</span>
  <button type="button" className="btn btn-secondary" disabled={page>=pages}
   onClick={()=>onPage(Math.min(pages,page+1))}>{t("next")}</button>
 </nav>;
}
function StaffReviewDialog({title,description,checked,onChecked,onCancel,onConfirm,
 busy,confirmText,children}:{title:string;description:string;checked:boolean;
 onChecked:(value:boolean)=>void;onCancel:()=>void;onConfirm:()=>void;
 busy:boolean;confirmText:string;children:ReactNode}){
 const {t}=useLang();
 const dialogRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const first=dialogRef.current?.querySelector<HTMLButtonElement>(".clinic-phase13-dialog-close");
  first?.focus();
  return()=>{
   document.body.style.overflow=previousOverflow;
   if(opener?.isConnected)opener.focus();
  };
 },[]);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(event.key==="Escape"&&!busy)onCancel();
   if(event.key!=="Tab")return;
   const root=dialogRef.current;
   if(!root)return;
   const focusable=Array.from(root.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )).filter(el=>el.getClientRects().length>0);
   if(!focusable.length){event.preventDefault();root.focus();return;}
   if(!root.contains(document.activeElement)){
    event.preventDefault();focusable[0].focus();return;
   }
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();first.focus();
   }
  };
  document.addEventListener("keydown",handler);
  return()=>document.removeEventListener("keydown",handler);
 },[busy,onCancel]);
 return <div className="clinic-phase13-dialog-backdrop" onMouseDown={event=>{
  if(!busy&&event.currentTarget===event.target)onCancel();
 }}>
  <section ref={dialogRef} tabIndex={-1} className="clinic-phase13-dialog" role="alertdialog" aria-modal="true"
   aria-labelledby="clinic-phase13-dialog-title" aria-describedby="clinic-phase13-dialog-description">
   <header className="clinic-phase13-dialog-heading">
    <span className="clinic-phase13-dialog-mark"><CareIcon name="shield-check" size={22}/></span>
    <button type="button" className="clinic-phase13-dialog-close"
     disabled={busy} aria-label={t("modalClose")} onClick={onCancel}>
     <CareIcon name="close" size={19}/></button>
   </header>
   <h2 id="clinic-phase13-dialog-title">{title}</h2>
   <p id="clinic-phase13-dialog-description">{description}</p>
   <dl className="clinic-phase13-dialog-facts">{children}</dl>
   <label className="clinic-phase13-dialog-check">
    <input type="checkbox" disabled={busy} checked={checked}
     onChange={event=>onChecked(event.target.checked)}/>
    <span>{t("staffReviewCheck")}</span>
   </label>
   <footer className="clinic-phase13-dialog-actions">
    <button type="button" className="btn btn-secondary" disabled={busy}
     onClick={onCancel}>{t("modalCancel")}</button>
    <button type="button" className="btn btn-primary" disabled={!checked||busy}
     onClick={onConfirm}><CareIcon name="check" size={17}/>
     {busy?t("loading"):confirmText}</button>
   </footer>
  </section>
 </div>;
}
function TeamHub({ctx,space}:{ctx:Context,space:Space}){
 const {t}=useLang();
 const [tab,setTab]=useState<"team"|"dentists"|"invitations">(()=>{
  return typeof window==="undefined"?"team":staffTab(new URLSearchParams(window.location.search).get("tab"));
 });
 useEffect(()=>{
  setTab(staffTab(new URLSearchParams(location.search).get("tab")));
 },[space.clinicId]);
 function choose(next:"team"|"dentists"|"invitations"){
  setTab(next);
  const query=new URLSearchParams(location.search);
  query.set("clinic",space.clinicId);query.set("tab",next);
  history.replaceState(null,"",location.pathname+"?"+query.toString());
 }
 const url=(kind:string)=>"/clinic/staff?clinic="+encodeURIComponent(space.clinicId)+"&tab="+kind;
 return <div className="clinic-phase13-staff-home">
  <section className="card clinic-phase13-hero">
   <div><span className="clinic-phase13-eyebrow"><CareIcon name="shield-check" size={17}/>
    {t("teamPermissions")}</span>
    <h1>{t("teamWorkspace")}</h1><p>{t("teamIntro")}</p>
    <div className="clinic-phase13-hero-clinic"><CareIcon name="clinic" size={16}/>
     {space.clinicName}</div></div>
   <div className="clinic-phase13-hero-badge">
    <CareIcon name="users" size={27}/><strong>{t(space.role)}</strong></div>
  </section>
  <nav className="phase-tabs clinic-phase13-staff-tabs" role="tablist" aria-label={t("staff")}>
   {(["team","dentists","invitations"] as const).map(key=><button type="button"
    className={"team-tab"+(tab===key?" current":"")} key={key}
    role="tab" aria-selected={tab===key}
    aria-controls="clinic-phase13-staff-content"
    onClick={()=>choose(key)}>
    <CareIcon name={key==="dentists"?"dental":key==="invitations"?"mail":"users"} size={18}/>
    {t(key)}</button>)}
  </nav>
  <div id="clinic-phase13-staff-content" role="tabpanel" aria-label={t(tab)}>
   {tab==="team"?<TeamList space={space} onInvite={()=>choose("invitations")}/>:
    tab==="dentists"?<DentistList space={space} onInvite={()=>choose("invitations")}/>:
    <Invitations space={space} ctx={ctx}/>}
  </div>
 </div>;
}
function TeamList({space,onInvite}:{space:Space;onInvite:()=>void}){
 const {t,date}=useLang();
 const {data,error,reload}=useData("/clinics/"+space.clinicId+"/team");
 const [filter,setFilter]=useState("all"),[role,setRole]=useState("all"),
  [query,setQuery]=useState(""),[page,setPage]=useState(1);
 useEffect(()=>{setFilter("all");setRole("all");setQuery("");setPage(1);},
  [space.clinicId]);
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 const records:StaffEntry[]=data.members||[];
 const summary=staffStats(records);
 const people=staffFiltered(records,query,filter,role);
 const slice=staffPage(people,page);
 const reset=()=>{setFilter("all");setRole("all");setQuery("");setPage(1);};
 return <section className="card panel clinic-phase13-staff-panel">
  <div className="clinic-phase13-panel-heading">
   <div><span className="clinic-phase13-kicker">{t("overview")}</span>
    <h2>{t("team")}</h2><p>{t("teamLimit")}</p></div>
   <button className="btn btn-secondary" type="button" onClick={reload}>
    <CareIcon name="activity" size={16}/>{t("teamRefresh")}</button>
  </div>
  <div className="clinic-phase13-metrics" role="group" aria-label={t("teamWorkspace")}>
   {([
    ["teamMembers",summary.total,"users"],["activeMembers",summary.active,"check"],
    ["suspendedMembers",summary.suspended,"clock"],["clinicalTeam",summary.clinicians,"dental"]
   ] as const).map(([label,count,icon])=><div className="clinic-phase13-metric" key={label}>
    <span className="clinic-phase13-metric-icon"><CareIcon name={icon} size={20}/></span>
    <strong>{count}</strong><span>{t(label)}</span>
   </div>)}
  </div>
  <div className="clinic-phase13-filters">
   <label className="clinic-phase13-search"><span>{t("teamSearch")}</span>
    <span className="clinic-phase13-search-field"><CareIcon name="search" size={17}/>
     <input type="search" autoComplete="off" value={query} maxLength={120}
      placeholder={t("teamSearchHint")}
      onChange={event=>{setQuery(event.target.value);setPage(1);}}/></span></label>
   <label><span>{t("filter")}</span><select value={filter} onChange={event=>{
    setFilter(event.target.value);setPage(1);
   }}>{["all","active","suspended","revoked"].map(value=>
    <option value={value} key={value}>{t(value)}</option>)}</select></label>
   <label><span>{t("teamRoleFilter")}</span><select value={role} onChange={event=>{
    setRole(event.target.value);setPage(1);
   }}><option value="all">{t("teamAllRoles")}</option>
    {(["owner","manager","dentist","receptionist","assistant","cashier"] as const).map(value=>
     <option key={value} value={value}>{t(value)}</option>)}</select></label>
   {(filter!=="all"||role!=="all"||query)&&<button type="button" className="btn btn-secondary"
    onClick={reset}><CareIcon name="close" size={15}/>{t("teamReset")}</button>}
  </div>
  {!slice.rows.length?<div className="clinic-phase13-empty" role="status">
   <CareIcon name="users" size={27}/>
   <p>{records.length?t("teamEmpty"):t("noStaff")}</p>
   {records.length>0&&<button type="button" className="btn btn-secondary"
    onClick={reset}>{t("teamReset")}</button>}
  </div>:<div className="staff-scroll clinic-phase13-staff-table-scroll">
   <table className="staff-table"><thead><tr>
    <th>{t("name")}</th><th>{t("role")}</th><th>{t("status")}</th>
    <th>{t("joinedOn")}</th><th>{t("mfa")}</th><th>{t("teamOpen")}</th>
   </tr></thead><tbody>{slice.rows.map(m=><tr key={m.id}>
    <td><strong>{m.name}</strong><div className="muted staff-small" dir="ltr">{m.email}</div></td>
    <td>{t(m.role)}</td><td><Badge value={m.status}/></td>
    <td>{date(m.joinedAt)}</td><td>
     <span className={"clinic-phase13-mfa"+(m.mfaEnabled?" is-on":"")}>
      <CareIcon name={m.mfaEnabled?"shield-check":"clock"} size={15}/>
      {t(m.mfaEnabled?"on":"off")}</span></td>
    <td><a className="btn btn-secondary clinic-phase13-open" href={
     "/clinic/staff/"+encodeURIComponent(m.id)+"?clinic="+encodeURIComponent(space.clinicId)}>
     {t("teamOpen")} <CareIcon name="arrow" size={15}/></a></td>
   </tr>)}</tbody></table>
  </div>}
  <div className="clinic-phase13-table-bottom">
   <p role="status" aria-live="polite">
    {t("teamCount")} {slice.start}–{slice.end} {t("teamOf")} {slice.total} {t("teamMembers")}
   </p>
   <StaffPager page={slice.page} pages={slice.pages} onPage={setPage} label={t("teamPage")}/>
  </div>
  {["owner","manager"].includes(space.role)&&<div className="phase-actions">
   <button className="btn btn-primary" type="button" onClick={onInvite}>
    <CareIcon name="plus" size={17}/>{t("invite")}</button>
  </div>}
 </section>;
}
function DentistList({space,onInvite}:{space:Space;onInvite:()=>void}){
 const {t}=useLang();
 const {data,error,reload}=useData("/clinics/"+space.clinicId+"/dentists");
 const [page,setPage]=useState(1),[query,setQuery]=useState("");
 useEffect(()=>{setQuery("");setPage(1);},[space.clinicId]);
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 const clinicians=(data.dentists||[]).filter((m:any)=>
  !query.trim()||(String(m.name||"")+" "+String(m.draft?.displayName||"")+" "+
   String(m.draft?.specialty||"")).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const slice=staffPage(clinicians,page);
 return <section className="card panel clinic-phase13-staff-panel">
  <div className="clinic-phase13-panel-heading"><div><h2>{t("dentists")}</h2>
   <p>{t("staffClinicianNote")}</p></div>
   <button type="button" className="btn btn-secondary" onClick={reload}>
    <CareIcon name="activity" size={16}/>{t("teamRefresh")}</button></div>
  <label className="clinic-phase13-search clinic-phase13-dentist-search"><span>{t("teamSearch")}</span>
   <span className="clinic-phase13-search-field"><CareIcon name="search" size={17}/>
    <input type="search" value={query} maxLength={120}
     onChange={event=>{setQuery(event.target.value);setPage(1);}}
     placeholder={t("teamSearchHint")}/></span>
  </label>
  {!slice.rows.length?<div className="clinic-phase13-empty">
   <CareIcon name="dental" size={27}/><p>{t("noDentists")}</p></div>:
   <div className="staff-dentist-grid clinic-phase13-dentist-grid">
    {slice.rows.map((m:any)=><article key={m.id} className="staff-dentist-card">
     <div className="staff-dentist-avatar"><CareIcon name="dental" size={24}/></div>
     <div className="staff-dentist-info"><h3>{m.draft?.displayName||m.name}</h3>
      <p>{m.draft?.specialty||t("pendingReview")}</p>
      <Badge value={m.status}/><p className="muted staff-small">{t("notPublic")}</p>
      <a className="text-link" href={"/clinic/staff/"+encodeURIComponent(m.id)+
       "?clinic="+encodeURIComponent(space.clinicId)}>{t("teamOpen")} ›</a>
     </div>
    </article>)}
   </div>}
  <div className="clinic-phase13-table-bottom"><p role="status">
   {t("teamCount")} {slice.start}–{slice.end} {t("teamOf")} {slice.total}</p>
   <StaffPager page={slice.page} pages={slice.pages} onPage={setPage} label={t("dentists")}/>
  </div>
  {["owner","manager"].includes(space.role)&&<div className="phase-actions">
   <button type="button" className="btn btn-secondary" onClick={onInvite}>
    <CareIcon name="plus" size={16}/>{t("invite")}</button></div>}
 </section>;
}

function Invitations({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const {data,error,reload}=useData("/clinics/"+space.clinicId+"/invitations");
 const [email,setEmail]=useState(""),[role,setRole]=useState("receptionist");
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(""),[success,setSuccess]=useState("");
 const [reason,setReason]=useState(""),[page,setPage]=useState(1),
  [filter,setFilter]=useState("pending"),[query,setQuery]=useState("");
 const [review,setReview]=useState<{kind:"send"|"resend"|"revoke";id?:string;email:string;role:string}|null>(null),
  [reviewed,setReviewed]=useState(false);
 const roles=staffAssignableRoles(space.role);
 const eligible=staffMayInvite(space.role,ctx.mfaEnabled);
 const close=()=>{if(!busy){setReview(null);setReviewed(false);}};
 useEffect(()=>{
  setEmail("");setRole("receptionist");setFilter("pending");setPage(1);
  setQuery("");setReview(null);setReviewed(false);setReason("");
  setFailure("");setSuccess("");
 },[space.clinicId]);
 function submit(e:FormEvent){
  e.preventDefault();if(busy||!eligible)return;
  const normalized=staffEmail(email);
  if(!normalized||normalized===ctx.email.toLocaleLowerCase()||!roles.includes(role as StaffRole)){
   setFailure("INVALID_INVITATION");return;
  }
  setFailure("");setSuccess("");setReviewed(false);
  setReview({kind:"send",email:normalized,role});
 }
 function begin(row:any,kind:"resend"|"revoke"){
  if(busy||!eligible)return;
  if(kind==="revoke"&&reason.trim().length<5)return;
  if(!roles.includes(row.role as StaffRole))return;
  setFailure("");setSuccess("");setReviewed(false);
  setReview({kind,id:row.id,email:row.email,role:row.role});
 }
 async function confirm(){
  if(!review||!reviewed||busy||!eligible)return;
  const current=review;
  if(current.kind==="send"&&(!staffEmail(current.email)||!roles.includes(current.role as StaffRole)))return;
  if(current.kind==="revoke"&&reason.trim().length<5)return;
  setBusy(true);setFailure("");setSuccess("");
  try{
   const root="/clinics/"+space.clinicId+"/invitations";
   if(current.kind==="send")await api(root,"POST",{email:current.email,role:current.role});
   else await api(root+"/"+current.id+"/"+current.kind,"POST",
    current.kind==="revoke"?{reason:reason.trim()}:undefined);
   if(current.kind==="send")setEmail("");
   setReason("");setReview(null);setReviewed(false);setPage(1);
   setSuccess(t(current.kind==="send"?"sentSuccess":"updateSuccess"));reload();
  }catch(e){setFailure((e as Error).message);}finally{setBusy(false);}
 }
 const entries=(data?.invitations||[]).filter((i:any)=>
  (filter==="all"||i.status===filter)&&
  (!query.trim()||(i.email+" "+i.role).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
 const slice=staffPage(entries,page);
 if(!eligible)return <section className="card panel clinic-phase13-staff-panel">
  <Banner kind="warning">{t("activateMfa")}</Banner>
  {["owner","manager"].includes(space.role)&&
   <AdminMfaSetup home={"/clinic/staff?clinic="+encodeURIComponent(space.clinicId)+"&tab=invitations"}/>}
 </section>;
 return <div className="staff-gap clinic-phase13-invitations">
  <section className="card panel clinic-phase13-staff-panel">
   <div className="clinic-phase13-panel-heading"><div>
    <span className="clinic-phase13-kicker"><CareIcon name="mail" size={16}/>{t("invitationSafety")}</span>
    <h2>{t("invite")}</h2><p>{t("inviteHint")}</p></div>
    <span className="clinic-phase13-capability"><CareIcon name="shield-check" size={16}/>
     {t("mfa")}</span>
   </div>
   <form className="staff-invite-form clinic-phase13-invite-form" onSubmit={submit}>
    <label className="clinic-phase13-email"><span>{t("email")} *</span>
     <input type="email" autoComplete="off" maxLength={160} required
      value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}
      placeholder="name@example.com" dir="ltr"/></label>
    <Select label={t("role")} value={role} onChange={value=>{setRole(value);setFailure("");}}
     options={roles.map(value=>({value,label:t(value)}))}/>
    <button type="submit" className="btn btn-primary"
     disabled={busy||!staffEmail(email)||staffEmail(email)===ctx.email.toLocaleLowerCase()}>
     <CareIcon name="plus" size={17}/>
     {busy?t("loading"):t("invitationReview")}</button>
   </form>
   <div className="clinic-phase13-invite-safety">
    <CareIcon name="shield-check" size={18}/><p>{t("receipt")} {t("unpaid")}
     {" "}{t("invitationNoAuto")}</p></div>
   {failure&&<Banner kind="error">{t("inviteFailed")}: {failure}</Banner>}
   {success&&<Banner kind="success">{success}</Banner>}
  </section>
  <section className="card panel clinic-phase13-staff-panel">
   <div className="clinic-phase13-panel-heading"><div>
    <h2>{t("invitationsSummary")}</h2><p>{t("invitationLimit")}</p></div>
    <button type="button" className="btn btn-secondary" onClick={reload}>
     <CareIcon name="activity" size={16}/>{t("teamRefresh")}</button></div>
   <div className="clinic-phase13-filters clinic-phase13-invite-filters">
    <label className="clinic-phase13-search"><span>{t("invitesSearch")}</span>
     <span className="clinic-phase13-search-field"><CareIcon name="search" size={17}/>
      <input type="search" autoComplete="off" maxLength={120} value={query}
       placeholder={t("invitesSearchHint")}
       onChange={e=>{setQuery(e.target.value);setPage(1);}}/></span></label>
    <label><span>{t("filter")}</span><select value={filter} onChange={e=>{
     setFilter(e.target.value);setPage(1);}}>
     {["pending","all","expired","accepted","revoked"].map(value=>
      <option key={value} value={value}>{t(value)}</option>)}</select></label>
    {(query||filter!=="pending")&&<button type="button" className="btn btn-secondary"
     onClick={()=>{setQuery("");setFilter("pending");setPage(1);}}>{t("teamReset")}</button>}
   </div>
   {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:!slice.rows.length?
    <div className="clinic-phase13-empty"><CareIcon name="mail" size={26}/>
     <p>{t("noInvites")}</p></div>:
    <div className="phase-list clinic-phase13-invite-list">
     {slice.rows.map((i:any)=><article className="staff-invitation-row clinic-phase13-invite-row" key={i.id}>
      <div className="clinic-phase13-invite-info"><strong dir="ltr">{i.email}</strong>
       <div className="staff-small muted">{t(i.role)} · {date(i.expiresAt)}
        {i.resolutionReason?" · "+i.resolutionReason:""}</div>
       <p className="clinic-phase13-invite-state"><Badge value={i.status}/>
        {i.sentAt&&<span>{t("sent")}: {date(i.sentAt)}</span>}</p></div>
      <div className="staff-invite-actions">
       {(i.status==="pending"||i.status==="expired")&&roles.includes(i.role)&&
        <button className="btn btn-secondary" type="button" disabled={busy||
         (i.sentAt&&Date.now()-new Date(i.sentAt).getTime()<60000)}
         title={i.sentAt&&Date.now()-new Date(i.sentAt).getTime()<60000?t("retryLater"):undefined}
         onClick={()=>begin(i,"resend")}><CareIcon name="mail" size={15}/>
         {t("resend")}</button>}
       {i.status==="pending"&&roles.includes(i.role)&&
        <button className="btn btn-secondary" type="button" disabled={busy||reason.trim().length<5}
         onClick={()=>begin(i,"revoke")}><CareIcon name="close" size={15}/>
         {t("removeInvite")}</button>}
      </div>
     </article>)}
    </div>}
   <div className="clinic-phase13-table-bottom">
    <p role="status" aria-live="polite">{t("teamCount")} {slice.start}–{slice.end}
     {" "}{t("teamOf")} {slice.total}</p>
    <StaffPager page={slice.page} pages={slice.pages} onPage={setPage}
     label={t("invitationsSummary")}/>
   </div>
   <label className="clinic-phase13-reason"><span>{t("reason")}</span>
    <textarea rows={2} maxLength={300} value={reason} disabled={busy}
     onChange={e=>setReason(e.target.value)}/></label>
   <p className="clinic-phase13-form-note">{t("invitationRevokeNote")}</p>
  </section>
  {review&&<StaffReviewDialog title={t(review.kind==="revoke"?
   "invitationRevokeReview":"invitationReview")}
   description={t(review.kind==="revoke"?"invitationRevokeNote":"invitationReviewNote")}
   checked={reviewed} onChecked={setReviewed}
   onCancel={close} onConfirm={()=>void confirm()} busy={busy}
   confirmText={t(review.kind==="revoke"?"removeInvite":review.kind==="resend"?"resend":"invitationConfirm")}>
   <div><dt>{t("modalScope")}</dt><dd>{space.clinicName}</dd></div>
   <div><dt>{t("invitationEmail")}</dt><dd dir="ltr">{review.email}</dd></div>
   <div><dt>{t("invitationRole")}</dt><dd>{t(review.role)}</dd></div>
   <div><dt>{t("modalExpiry")}</dt><dd>{t("invitationExpires")}</dd></div>
   {review.kind==="revoke"&&<div><dt>{t("modalReason")}</dt><dd>{reason}</dd></div>}
  </StaffReviewDialog>}
 </div>;
}
function SecurityPanel({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const canManage=space.capabilities.includes("security.read");
 const {data,error,reload}=useData(canManage?"/clinics/"+space.clinicId+"/security":null);
 const {data:sessions,error:sessionError,reload:reloadSessions}=useData("/sessions");
 const [reason,setReason]=useState("Close unused sessions"),[busy,setBusy]=useState(false),
  [notice,setNotice]=useState(""),[review,setReview]=useState(false),
  [reviewed,setReviewed]=useState(false),[eventPage,setEventPage]=useState(1),
  [sessionPage,setSessionPage]=useState(1),[accessPage,setAccessPage]=useState(1),
  [query,setQuery]=useState("");
 useEffect(()=>{
  setReview(false);setReviewed(false);setNotice("");
  setEventPage(1);setSessionPage(1);setAccessPage(1);setQuery("");
 },[space.clinicId]);
 async function allLogout(){
  if(!review||!reviewed||busy||reason.trim().length<5)return;
  setBusy(true);setNotice("");
  try{
   await api("/sessions/revoke","POST",{reason:reason.trim()});
   location.assign("/clinic/login");
  }catch(e){setNotice((e as Error).message);setBusy(false);}
 }
 const access=(data?.access||[]).filter((m:any)=>
  !query.trim()||(m.name+" "+m.email+" "+m.role).toLocaleLowerCase()
   .includes(query.trim().toLocaleLowerCase()));
 const accessRows=staffPage(access,accessPage);
 const eventRows=staffPage(data?.events||[],eventPage);
 const sessionRows=staffPage(sessions?.sessions||[],sessionPage);
 return <div className="staff-gap clinic-phase13-security">
  <section className="card panel clinic-phase13-security-intro">
   <span className="clinic-phase13-kicker"><CareIcon name="shield-check" size={17}/>
    {t("securitySummary")}</span>
   <h2>{t("security")}</h2><p>{t("securityNote")} {t("securityNoAuto")}</p>
   <div className="phase-actions"><a className="btn btn-secondary" href="/clinic/reset-password">
    <CareIcon name="security" size={16}/>{t("password")}</a></div>
  </section>
  {canManage&&<section className="card panel clinic-phase13-staff-panel">
   <div className="clinic-phase13-panel-heading"><div>
    <h2>{t("people")} · {t("security")}</h2>
    <p>{t("teamPermissions")}</p></div>
    <button type="button" className="btn btn-secondary" onClick={reload}>
     <CareIcon name="activity" size={16}/>{t("teamRefresh")}</button></div>
   {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:<>
    <div className="clinic-phase13-metrics clinic-phase13-security-metrics">
     <div className="clinic-phase13-metric"><CareIcon name="users" size={20}/>
      <strong>{data.access.length}</strong><span>{t("securityMemberCount")}</span></div>
     <div className="clinic-phase13-metric"><CareIcon name="shield-check" size={20}/>
      <strong>{data.access.filter((m:any)=>m.mfaEnabled&&m.status==="active").length}</strong>
      <span>{t("mfa")}</span></div>
     <div className="clinic-phase13-metric"><CareIcon name="activity" size={20}/>
      <strong>{data.events.length}</strong><span>{t("securityEvents")}</span></div>
    </div>
    <label className="clinic-phase13-search clinic-phase13-security-search">
     <span>{t("teamSearch")}</span>
     <span className="clinic-phase13-search-field"><CareIcon name="search" size={17}/>
      <input type="search" value={query} maxLength={120}
       onChange={e=>{setQuery(e.target.value);setAccessPage(1);}}
       placeholder={t("teamSearchHint")}/></span></label>
    {!accessRows.rows.length?<div className="clinic-phase13-empty"><p>{t("teamEmpty")}</p></div>:
     <div className="staff-scroll clinic-phase13-staff-table-scroll">
      <table className="staff-table"><thead><tr><th>{t("name")}</th><th>{t("role")}</th>
       <th>{t("status")}</th><th>{t("mfa")}</th><th>{t("lastChanged")}</th>
      </tr></thead><tbody>{accessRows.rows.map((m:any)=><tr key={m.id}>
       <td><a className="text-link" href={"/clinic/staff/"+encodeURIComponent(m.id)+
        "?clinic="+encodeURIComponent(space.clinicId)}>{m.name}</a>
        <div className="muted staff-small" dir="ltr">{m.email}</div></td>
       <td>{t(m.role)}</td><td><Badge value={m.status}/></td>
       <td><span className={"clinic-phase13-mfa"+(m.mfaEnabled?" is-on":"")}>
        <CareIcon name={m.mfaEnabled?"shield-check":"clock"} size={15}/>
        {t(m.mfaEnabled?"on":"off")}</span></td>
       <td>{date(m.changedAt)}</td>
      </tr>)}</tbody></table></div>}
    <StaffPager page={accessRows.page} pages={accessRows.pages}
     onPage={setAccessPage} label={t("securityMemberCount")}/>
   </>}
  </section>}
  <section className="card panel clinic-phase13-staff-panel">
   <div className="clinic-phase13-panel-heading"><div>
    <h2>{t("sessions")}</h2><p>{t("securitySessionHint")}</p></div>
    <button type="button" className="btn btn-secondary" onClick={reloadSessions}>
     <CareIcon name="activity" size={16}/>{t("retry")}</button></div>
   {sessionError?<ErrorBox error={sessionError} retry={reloadSessions}/>:!sessions?<Busy/>:
    !sessionRows.rows.length?<div className="clinic-phase13-empty"><p>{t("noHistory")}</p></div>:
    <div className="phase-list clinic-phase13-session-list">
     {sessionRows.rows.map((s:any)=><div className="phase-row phase-list-item" key={s.id}>
      <span className="clinic-phase13-session-icon"><CareIcon name="security" size={20}/></span>
      <div><strong>{s.userAgent||t("account")}</strong>
       <p className="muted">{date(s.createdAt)} · {date(s.expiresAt)}</p></div>
      <Badge value="active"/>
     </div>)}</div>}
   <StaffPager page={sessionRows.page} pages={sessionRows.pages} onPage={setSessionPage}
    label={t("sessions")}/>
   <div className="clinic-phase13-session-actions">
    <label className="clinic-phase13-reason"><span>{t("reason")}</span>
     <textarea rows={2} maxLength={300} value={reason} disabled={busy}
      onChange={e=>setReason(e.target.value)}/></label>
    <p>{t("securityReasonHint")}</p>
    <button type="button" className="btn btn-secondary"
     disabled={busy||reason.trim().length<5}
     onClick={()=>{setReview(true);setReviewed(false);setNotice("");}}>
     <CareIcon name="logout" size={17}/>{t("signoutAll")}</button>
   </div>
   {notice&&<Banner kind="error">{notice}</Banner>}
  </section>
  {canManage&&<section className="card panel clinic-phase13-staff-panel">
   <div className="clinic-phase13-panel-heading"><div>
    <h2>{t("lastActivity")}</h2><p>{t("securityEvents")} · {t("securityReadOnly")}</p></div></div>
   {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:
    !eventRows.rows.length?<div className="clinic-phase13-empty"><p>{t("noHistory")}</p></div>:
    <div className="phase-list clinic-phase13-event-list">
     {eventRows.rows.map((e:any)=><div className="phase-row phase-list-item" key={e.id}>
      <span className="clinic-phase13-session-icon"><CareIcon name="activity" size={19}/></span>
      <div><strong>{e.action}</strong><p className="muted">{date(e.createdAt)} · {e.outcome}</p></div>
      <span className="muted staff-small" dir="ltr">{e.subjectId?.slice(0,8)||"—"}</span>
     </div>)}</div>}
   <StaffPager page={eventRows.page} pages={eventRows.pages} onPage={setEventPage}
    label={t("securityEvents")}/>
  </section>}
  {review&&<StaffReviewDialog title={t("securityActionReview")}
   description={t("securityReasonHint")} busy={busy} checked={reviewed}
   onChecked={setReviewed} onCancel={()=>{if(!busy){setReview(false);setReviewed(false);}}}
   onConfirm={()=>void allLogout()} confirmText={t("signoutAll")}>
   <div><dt>{t("modalScope")}</dt><dd>{space.clinicName}</dd></div>
   <div><dt>{t("account")}</dt><dd>{ctx.name} · <bdi dir="ltr">{ctx.email}</bdi></dd></div>
   <div><dt>{t("modalReason")}</dt><dd>{reason}</dd></div>
   <div><dt>{t("modalImpact")}</dt><dd>{t("securityActionCheck")}</dd></div>
  </StaffReviewDialog>}
 </div>;
}
function StaffDetail({space,ctx}:{space:Space,ctx:Context}){
 const {t,date}=useLang();
 const [memberId,setMemberId]=useState("");
 useEffect(()=>{setMemberId(location.pathname.split("/").filter(Boolean).at(-1)||"");},[]);
 const {data,error,reload}=useData(memberId?"/clinics/"+space.clinicId+"/staff/"+memberId:null);
 const [role,setRole]=useState(""),[reason,setReason]=useState("");
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(""),[notice,setNotice]=useState("");
 const [review,setReview]=useState<{path:string;body:any;actionName:string}|null>(null),
  [reviewed,setReviewed]=useState(false);
 const [draft,setDraft]=useState<any>(null);
 useEffect(()=>{
  setRole("");setReason("");setProblem("");setNotice("");
  setReview(null);setReviewed(false);setDraft(null);
 },[space.clinicId,memberId]);
 useEffect(()=>{
  if(data?.member)setRole(data.member.role);
  if(data?.draft)setDraft(data.draft);
  else if(data?.canEditDentist)setDraft({
   displayName:data.member.name,specialty:"",qualifications:"",
   professionalLicense:"",experienceYears:"",biography:"",draftVersion:0
  });
 },[data]);
 async function action(path:string,body:any,destructive=false){
  if(busy)return;
  if(destructive){
   if(!data?.canManage||!ctx.mfaEnabled||memberId===space.membershipId||
    data.member.role==="owner"||reason.trim().length<5)return;
   const normalized={...body,reason:reason.trim()};
   setReview({path,body:normalized,actionName:path==="/role"?t("roleChange"):
    path==="/clinician"?t("clinicalAffiliation"):
    path==="/force-logout"?t("forceLogout"):t(normalized.action)});
   setReviewed(false);setProblem("");setNotice("");return;
  }
  setProblem("");setNotice("");setBusy(true);
  try{
   await api("/clinics/"+space.clinicId+"/staff/"+memberId+path,"POST",body);
   reload();setNotice(t("updateSuccess"));setReason("");
  }catch(e){setProblem((e as Error).message);}finally{setBusy(false);}
 }
 async function confirmReview(){
  if(!review||!reviewed||busy||!data?.canManage||!ctx.mfaEnabled||memberId===space.membershipId||
   data.member.role==="owner")return;
  const active=review;setBusy(true);setProblem("");setNotice("");
  try{
   await api("/clinics/"+space.clinicId+"/staff/"+memberId+active.path,"POST",active.body);
   setReview(null);setReviewed(false);setReason("");
   reload();setNotice(t("updateSuccess"));
  }catch(e){setProblem((e as Error).message);}
  finally{setBusy(false);}
 }
 const closeReview=()=>{if(!busy){setReview(null);setReviewed(false);}};
 if(error)return <ErrorBox error={error} retry={reload}/>;
 if(!data)return <Busy/>;
 const member=data.member;
 const manager=space.role==="manager";
 const options=staffAssignableRoles(space.role);
 const canChange=data.canManage&&staffMayManage(space.role,member.role as StaffRole,
  memberId===space.membershipId,member.status as StaffState)&&ctx.mfaEnabled;
 const canChangeRole=canChange&&member.status==="active";
 const editableOptions=options.filter(value=>value!==member.role);
 return <div className="staff-gap">
  <a className="text-link" href={space.capabilities.includes("staff.read")?
    "/clinic/staff?clinic="+space.clinicId:"/clinic?clinic="+space.clinicId}>{t("back")} ←</a>
  <section className="card panel clinic-phase13-staff-detail-hero"><div className="phase-row"><div>
    <span className="clinic-phase13-kicker">{t("staffPersonal")}</span>
    <h2>{member.name}</h2><span dir="ltr" className="muted">{member.email}</span></div>
    <Badge value={member.status}/></div>
   <div className="staff-role-summary">
    <div><small className="muted">{t("currentRole")}</small><strong>{t(member.role)}</strong></div>
    <div><small className="muted">{t("joinedOn")}</small><strong>{date(member.joinedAt)}</strong></div>
    <div><small className="muted">{t("mfa")}</small><strong>{t(member.mfaEnabled?"on":"off")}</strong></div>
   </div>
   <Banner>{t("sessionImpact")} {t("staffChanged")}</Banner>
  </section>
  {data.canManage&&<section className="card panel clinic-phase13-staff-actions"><h2>{t("editStaff")}</h2>
   <p className="clinic-phase13-inline-note">{t("staffChanged")}</p>
   {!ctx.mfaEnabled?<div><Banner kind="warning">{t("activateMfa")}</Banner>
    <AdminMfaSetup home={typeof window !== "undefined" ? window.location.pathname+window.location.search : "/clinic/staff"}/></div>:<>
    <div className="staff-roles-controls">
      <Select label={t("assign")} value={role} onChange={setRole}
       options={options.map(value=>({value,label:t(value)}))}/>
      <Field label={t("reason")} value={reason} onChange={setReason} maxLength={300}/>
    </div>
    <div className="phase-actions">
      <button className="btn btn-primary" disabled={busy||!canChangeRole||
        role===member.role||!options.includes(role as StaffRole)||reason.trim().length<5}
       onClick={()=>action("/role",{role,reason},true)}>
       <CareIcon name="edit" size={17}/>{t("change")}</button>
      {member.status==="active"&&<button className="btn btn-secondary" disabled={busy||!canChange||reason.trim().length<5}
       onClick={()=>action("/status",{action:"suspend",reason},true)}>{t("suspend")}</button>}
      {member.status==="suspended"&&<button className="btn btn-secondary" disabled={busy||!canChange||reason.trim().length<5}
       onClick={()=>action("/status",{action:"reactivate",reason},true)}>{t("reactivate")}</button>}
      {member.status!=="revoked"&&<button className="btn btn-secondary" disabled={busy||!canChange||reason.trim().length<5}
       onClick={()=>action("/status",{action:"revoke",reason},true)}>{t("revoke")}</button>}
      <button className="btn btn-secondary" disabled={busy||!canChange||reason.trim().length<5}
       onClick={()=>action("/force-logout",{reason},true)}>
       <CareIcon name="logout" size={17}/>{t("forceLogout")}</button>
    </div>
    <p className="muted staff-small">{t("ownerSafe")} {t("suspendedInfo")}</p>
   </>}
  </section>}
  {data.canManage&&space.role==="owner"&&member.role==="manager"&&ctx.mfaEnabled&&
   <section className="card panel"><h2>{t("clinicalAffiliation")}</h2>
    <p className="muted">{t("notPublic")}</p>
    <button className="btn btn-secondary" disabled={busy||!canChange||reason.trim().length<5}
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
  {review&&<StaffReviewDialog title={t("staffReviewTitle")}
   description={t("staffReviewNote")} checked={reviewed}
   onChecked={setReviewed} onCancel={closeReview}
   onConfirm={()=>void confirmReview()} busy={busy} confirmText={t("staffReviewConfirm")}>
   <div><dt>{t("modalScope")}</dt><dd>{space.clinicName}</dd></div>
   <div><dt>{t("modalMember")}</dt><dd>{member.name}
    {" · "}<bdi dir="ltr">{member.email}</bdi></dd></div>
   <div><dt>{t("currentRole")}</dt><dd>{t(member.role)}</dd></div>
   <div><dt>{t("modalImpact")}</dt><dd>{review.actionName}
    {review.path==="/role"?" → "+t(review.body.role):""}</dd></div>
   <div><dt>{t("modalReason")}</dt><dd>{review.body.reason}</dd></div>
   <div><dt>{t("sessionImpact")}</dt><dd>{t("sessionImpact")}</dd></div>
  </StaffReviewDialog>}
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
