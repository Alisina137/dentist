"use client";
import React,{useEffect,useState,useMemo,type FormEvent,type ReactNode} from "react";
import {authClient,InlineAlert,usePreferences} from "./index";
import {Shell} from "./phase03";

type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;role:Role;
 clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Lang="en"|"fa-AF"|"ps-AF";
type Rules={approvalMode:"manual"|"auto";minNoticeHours:number;horizonDays:number;
 cancellationHours:number;bufferMinutes:number};
type Profile={description:string;specialties:string[];photoIds:{id:string;caption:string}[];
 dentistIds:string[];serviceIds:string[];bookingRules:Rules;
 latitude:number|null;longitude:number|null;contactNote:string|null};
type ListingVersion={id:string;version:number;status:string;profile:Profile;
 submitted_at:string|null;reviewed_at:string|null;decision_reason:string|null;created_at:string};
type Head={revision:number;draft_version:number|null;pending_version:number|null;
 approved_version:number|null;hidden:boolean;hidden_reason?:string|null};
type ClinicInfo={name:string;city:string;province:string;address:string;phone:string;status:string};
type Dentist={id:string;display_name:string;specialty:string|null;qualifications:string|null;
 professional_license:string|null;draft_version:number;affiliation_status:string;
 verification_status:string|null;currentlyVerified:boolean;valid_until:string|null};
type Service={id:string;name:string;category:string;durationMinutes:number;
 basePriceAfn:number;active:boolean;publicBooking:boolean};
type Picture={id:string;mime_type:string;size_bytes:number;file_name:string};
type Working={head:Head;draft:ListingVersion|null;pending:ListingVersion|null;
 approved:ListingVersion|null;photos:Picture[];events:any[];clinic:ClinicInfo;
 checklist?:{ready:boolean;issues:string[]}|null};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const route=(x:string)=>"/v1/listings"+x;
const clinicPath=(id:string)=>"/clinics/"+id;
const adminPath=(x:string)=>"/admin"+x;
const profileLink=(id:string)=>"/clinics/"+id;
const defaults=():Profile=>({description:"",specialties:[],photoIds:[],dentistIds:[],serviceIds:[],
 bookingRules:{approvalMode:"manual",minNoticeHours:4,horizonDays:30,cancellationHours:12,
  bufferMinutes:10},latitude:null,longitude:null,contactNote:null});
const labels:Record<Lang,Record<string,string>>={
 en:{
 CLINIC_MUST_BE_APPROVED:"First approve the clinic license in Platform Admin.",CLINIC_CONTACT_LOCATION_REQUIRED:"Complete clinic contact and address.",MAP_COORDINATES_REQUIRED:"Provide both map coordinates.",VERIFIED_DENTIST_REQUIRED:"Select a verified dentist.",PUBLIC_SERVICE_REQUIRED:"Select a public service.",PRIMARY_PHOTO_REQUIRED:"Select a primary photo.",SPECIALTY_REQUIRED:"Choose a specialty.",DENTIST_VERIFICATION_INVALID:"Dentist verification is pending, expired or revoked.",SERVICE_NOT_PUBLIC:"Selected service is not active and public.",PHOTO_NOT_IN_CLINIC:"A gallery photo does not belong to this clinic.",CLINIC_HOURS_REQUIRED:"Configure clinic opening hours.",PROVIDER_HOURS_REQUIRED:"Configure dentist working hours.",ACTIVE_CHAIR_REQUIRED:"Add an active treatment chair.",REAL_AVAILABILITY_REQUIRED:"No real bookable time slot was available for the next eight days.",
 listing:"Clinic Listing",overview:"Overview",dentists:"Dentists",photos:"Photos",bookingRules:"Booking Rules",
 preview:"Preview",adminDentists:"Dentist Verification",adminListings:"Marketplace Listings",
 intro:"Build a verified, trustworthy public clinic profile before patients can discover it.",
 clinicalSafety:"Only reviewed professional identities, public catalog services and approved gallery images can appear here.",
 drafts:"Draft",pending:"Pending Review",approved:"Approved",verified:"Verified",
 published:"Published",rejected:"Rejected",needs_changes:"Needs changes",revoked:"Revoked",
 hidden:"Hidden",unverified:"Unverified",notReady:"Not ready",save:"Save draft",
 submit:"Submit for review",approve:"Approve & publish",reject:"Reject revision",revoke:"Revoke verification",
 hide:"Emergency hide",restore:"Restore approved listing",requestChanges:"Request replacement evidence",
 confirmReview:"An administrator must manually validate the documents before approval.",
 steps:"Publication checklist",complete:"Ready",missing:"Needs attention",
 description:"Clinic description",specialties:"Specialties",specialtiesHint:"Comma-separated specialties",
 address:"Address",location:"Map location",latitude:"Latitude",longitude:"Longitude",
 phone:"Phone",city:"City",province:"Province",contactNote:"Additional contact guidance",
 contactNoteHint:"Optional: directions, opening notes or practical arrival guidance.",
 services:"Public services",servicesEmpty:"No active publicly bookable services. Configure Services & Pricing first.",
 dentistEmpty:"Add a dentist and complete professional verification first.",
 verifyDentist:"Submit credential evidence",submitCredential:"Submit for independent verification",
 credentialType:"Credential type",credentialNumber:"Credential/license number",expires:"Valid until (Gregorian)",
 file:"Supporting document",fileHint:"PDF/JPEG/PNG, maximum 1.5 MB. Admin review only.",
 attestation:"I attest this document is genuine and I may submit it for verification.",
 verificationStatus:"Verification status",profileIncomplete:"Update this clinician's professional draft before submission.",
 viewStaff:"Edit staff professional draft",evidencePending:"Evidence awaiting independent platform review.",
 credentialApproved:"Credential reviewed. Current affiliation and profile version still required.",
 status:"Status",action:"Action",saveBefore:"Save your changes before submitting.",
 primaryPhoto:"Primary photo",rights:"I have the rights and consent to publish this image.",
 uploadPhoto:"Upload clinic photo",galleryEmpty:"No clinic photos uploaded yet.",
 galleryHint:"Upload photos, set a caption and use the arrows to reorder. First photo is the cover.",
 fileLimit:"PNG or JPEG, maximum 1 MB per image, maximum 8 selected.",
 removePhoto:"Remove from listing",up:"Move earlier",down:"Move later",
 approvalMode:"Approval mode",manual:"Manual clinic approval",auto:"Automatic approval (future booking policy)",
 minNotice:"Minimum notice (hours)",horizon:"Booking horizon (days)",
 cancelHours:"Cancellation notice (hours)",buffer:"Booking buffer (minutes)",
 bookingNote:"These rules will be enforced when patient booking is released in Phase 15. No Book button is shown now.",
 providerReady:"Providers",photoReady:"Gallery",serviceReady:"Services",readiness:"Readiness",
 pendingChanges:"Review in progress. The previously approved version remains visible.",
 clinicUnapproved:"Clinic must pass platform verification before publishing.",
 saved:"Draft version saved",submitted:"Listing revision submitted for independent moderation.",
 noPublic:"No public listing published yet",publicLink:"Public approved preview",
 publicUnlisted:"Shareable approved profile; searchable discovery starts in Phase 13.",
 privatePreview:"Owner-only draft preview; not published or searchable.",
 publicWarning:"Bookings are unavailable until Phase 15.",
 noSlots:"Public readiness requires actual available clinic/provider time slots. Schedule real hours and resources.",
 saveWarning:"Unsaved changes are not in the submitted revision.",
 readonlyPending:"You cannot edit the pending revision. Wait for a decision.",
 reviewerReason:"Decision reason",reviewBasis:"Independent review method / evidence assessment",
 reviewBasisHint:"Explain what you inspected. Do not claim an unverified external registry check.",
 confirmVerify:"I independently examined this evidence and verified the active clinic affiliation.",
 verify:"Approve verification",rejectCredential:"Reject credential",viewEvidence:"Download private evidence",
 credentialSubmission:"Credential submission",reviewHistory:"Moderation history",
 noData:"No records in this queue",pendingRevisions:"Pending revisions",publishedListings:"Published",
 hiddenListings:"Reported / Hidden",pendingDentists:"Pending",verifiedDentists:"Verified",
 rejectedDentists:"Rejected / Changes",search:"Search clinic or professional",
 selected:"Selected",compare:"Approved versus proposed",oldContent:"Currently approved",
 proposedContent:"Proposed revision",changes:"Changed fields",clinic:"Clinic",
 professional:"Professional",evidence:"Evidence",submittedAt:"Submitted",
 reviewedAt:"Reviewed",reason:"Reason",decision:"Decision",perform:"Apply decision",
 confirmation:"Type approval confirmation",confirmPublish:"PUBLISH",
 confirmCredential:"VERIFY",reload:"Refresh",back:"Back",review:"Review",
 publishedHidden:"This listing is hidden pending administrator review.",
 errors:"Unable to load this information. Try again.",loading:"Loading verified listing data…",
 login:"Sign in",unauthorized:"You do not have permission to use this workspace.",
 patientPreview:"Patient-facing approved profile",noBooking:"Public booking is not available yet.",
 publicPatient:"Verified information is published only after independent review.",
 approvedDentists:"Verified dentists",publishedServices:"Clinic services",fee:"Fee",
 emptyPreview:"No published version to preview yet.",publicPreview:"View published profile",
 serviceVisit:"Visit services & pricing",team:"Staff & Resources",openWebsite:"Open public page",
 confirmSubmission:"Submit this specific draft for platform review?",
 confirmApprove:"Approve and publish this vetted revision?",
 confirmReject:"Reject this revision while preserving any previously approved listing?",
 confirmHide:"Immediately hide this listing from the public?",
 confirmRestore:"Restore the currently approved version after confirming its safety?",
 confirmed:"Decision recorded",captions:"Photo captions",noClaims:"No ratings, availability, credentials or prices are fabricated.",
 eligibility:"Only current verified affiliations may display a badge.",replacement:"New credential evidence required",
 revision:"Revision",account:"Account",subscription:"Subscription",mediaRights:"Photo rights",
 mobileHidden:"Search will become available in Phase 13",contact:"Contact",
 photoRights:"Image rights attested",missingService:"Check clinic service catalog and dentist schedule.",
 imageUnavailable:"Image unavailable",previewLabel:"Patient preview",roleSafety:"Clinic owner / manager only",
 important:"Important",permalink:"Approved profile URL",reviewer:"Reviewer",
 validUntil:"Valid until",draftVersion:"Draft version",qualifications:"Qualifications"
 },
 "fa-AF":{
 CLINIC_MUST_BE_APPROVED:"ابتدا جواز کلینیک در مدیریت تأیید شود.",CLINIC_CONTACT_LOCATION_REQUIRED:"آدرس و تماس کلینیک را تکمیل کنید.",MAP_COORDINATES_REQUIRED:"مختصات نقشه را وارد کنید.",VERIFIED_DENTIST_REQUIRED:"حداقل یک داکتر تأییدشده انتخاب کنید.",PUBLIC_SERVICE_REQUIRED:"حداقل یک خدمت عمومی انتخاب کنید.",PRIMARY_PHOTO_REQUIRED:"عکس اصلی را انتخاب کنید.",SPECIALTY_REQUIRED:"حداقل یک تخصص انتخاب کنید.",DENTIST_VERIFICATION_INVALID:"تأیید داکتر در انتظار، منقضی یا لغو شده است.",SERVICE_NOT_PUBLIC:"خدمت انتخاب‌شده فعال و عمومی نیست.",PHOTO_NOT_IN_CLINIC:"عکس به این کلینیک تعلق ندارد.",CLINIC_HOURS_REQUIRED:"ساعات کاری کلینیک را تنظیم کنید.",PROVIDER_HOURS_REQUIRED:"تقسیم اوقات داکتر را تنظیم کنید.",ACTIVE_CHAIR_REQUIRED:"چوکی فعال تداوی لازم است.",REAL_AVAILABILITY_REQUIRED:"در هشت روز آینده وقت واقعی مناسب یافت نشد.",
 listing:"نمایش کلینیک",overview:"نمای کلی",dentists:"داکتران دندان",photos:"عکس‌ها",bookingRules:"قواعد نوبت",
 preview:"پیش‌نمایش",adminDentists:"تأیید داکتران دندان",adminListings:"آگهی‌های کلینیک",
 intro:"پروفایل قابل اعتماد کلینیک را پیش از انتشار آماده کنید.",
 clinicalSafety:"فقط هویت‌های مسلکی تأییدشده، خدمات واقعی و عکس‌های بررسی‌شده نشر می‌شوند.",
 drafts:"پیش‌نویس",pending:"در انتظار بررسی",approved:"تأییدشده",verified:"تأییدشده",
 published:"نشرشده",rejected:"ردشده",needs_changes:"نیاز به اصلاح",revoked:"لغوشده",
 hidden:"پنهان",unverified:"تأییدنشده",notReady:"آماده نیست",save:"ذخیره پیش‌نویس",
 submit:"ارسال برای بررسی",approve:"تأیید و نشر",reject:"رد اصلاحات",revoke:"لغو تأیید",
 hide:"پنهان‌سازی اضطراری",restore:"بازگردانی آگهی",requestChanges:"درخواست سند جدید",
 confirmReview:"مدیر سیستم باید اسناد را جداگانه بررسی کند.",
 steps:"فهرست آمادگی",complete:"آماده",missing:"نیازمند رسیدگی",
 description:"معرفی کلینیک",specialties:"تخصص‌ها",specialtiesHint:"تخصص‌ها را با کامه جدا کنید",
 address:"آدرس",location:"موقعیت نقشه",latitude:"عرض جغرافیایی",longitude:"طول جغرافیایی",
 phone:"تماس",city:"شهر",province:"ولایت",contactNote:"راهنمای تماس",
 contactNoteHint:"راهنمای رسیدن یا معلومات مراجعه (اختیاری)",
 services:"خدمات عمومی",servicesEmpty:"خدمت فعال برای رزرو عمومی یافت نشد.",
 dentistEmpty:"ابتدا داکتر دندان اضافه و اسناد او را تأیید کنید.",
 verifyDentist:"ارسال اسناد",submitCredential:"ارسال برای تأیید مستقل",
 credentialType:"نوع سند",credentialNumber:"شماره سند / جواز",
 expires:"تاریخ اعتبار (میلادی)",file:"سند اثبات",fileHint:"PDF/JPEG/PNG حداکثر ۱.۵ مگابایت؛ فقط مدیر سیستم",
 attestation:"تأیید می‌کنم سند واقعی است و اجازه ارسال دارم.",
 verificationStatus:"حالت تأیید",profileIncomplete:"اول معلومات مسلکی داکتر را تکمیل کنید.",
 viewStaff:"اصلاح پروفایل کارمند",evidencePending:"سند در حال بررسی مستقل است.",
 credentialApproved:"سند بررسی شد؛ عضویت و نسخه فعلی باید معتبر باشند.",
 status:"حالت",action:"عملیات",saveBefore:"قبل از ارسال تغییرات را ذخیره کنید.",
 primaryPhoto:"عکس اصلی",rights:"حق استفاده و نشر این تصویر را دارم.",
 uploadPhoto:"آپلود تصویر",galleryEmpty:"هنوز تصویری موجود نیست.",
 galleryHint:"عکس‌ها را انتخاب، شرح‌نویسی و مرتب کنید؛ اولی عکس اصلی است.",
 fileLimit:"PNG یا JPEG حداکثر ۱ مگابایت؛ تا ۸ عکس",
 removePhoto:"حذف از نمایش",up:"جابه‌جایی به بالا",down:"جابه‌جایی به پایین",
 approvalMode:"نوع تأیید",manual:"تأیید دستی کلینیک",auto:"تأیید خودکار (قاعده آینده)",
 minNotice:"اطلاع قبلی (ساعت)",horizon:"مدت رزرو (روز)",cancelHours:"لغو قبل از (ساعت)",
 buffer:"وقفه رزرو (دقیقه)",
 bookingNote:"این قواعد با فعال‌شدن نوبت‌گیری در مرحله ۱۵ اجرا می‌شوند.",
 providerReady:"داکتران",photoReady:"عکس‌ها",serviceReady:"خدمات",readiness:"آمادگی",
 pendingChanges:"بررسی ادامه دارد؛ نسخه قبلی منتشرشده محفوظ است.",
 clinicUnapproved:"برای انتشار کلینیک باید تأیید شده باشد.",
 saved:"پیش‌نویس ذخیره شد",submitted:"پیشنهاد برای بررسی ارسال شد.",
 noPublic:"هنوز آگهی عمومی نشر نشده.",publicLink:"نمایش عمومی تأییدشده",
 publicUnlisted:"پروفایل قابل اشتراک؛ جستجو در مرحله ۱۳ فعال می‌شود.",
 privatePreview:"پیش‌نمایش خصوصی مالک؛ عمومی نیست.",
 publicWarning:"رزرو آنلاین تا مرحله ۱۵ فعال نیست.",
 noSlots:"آمادگی نشر به وقت‌های واقعی خالی داکتر و کلینیک نیاز دارد.",
 saveWarning:"تغییرات ذخیره‌نشده ارسال نمی‌شوند.",
 readonlyPending:"نسخه در انتظار بررسی قابل تغییر نیست.",
 reviewerReason:"دلیل تصمیم",reviewBasis:"روش بررسی مستقل اسناد",
 reviewBasisHint:"آنچه بررسی کردید بنویسید، تأیید ثبت رسمی بدون سند ادعا نکنید.",
 confirmVerify:"اسناد و عضویت فعال را مستقلاً بررسی کرده‌ام.",
 verify:"تأیید سند",rejectCredential:"رد سند",viewEvidence:"دریافت سند خصوصی",
 credentialSubmission:"سند مسلکی",reviewHistory:"تاریخچه بررسی",
 noData:"در این بخش موردی نیست.",pendingRevisions:"اصلاحات در انتظار",publishedListings:"نشرشده",
 hiddenListings:"گزارش‌شده / پنهان",pendingDentists:"در انتظار",verifiedDentists:"تأییدشده",
 rejectedDentists:"ردشده / اصلاحات",search:"جستجوی کلینیک یا داکتر",
 selected:"انتخاب‌شده",compare:"نسخه قبلی و پیشنهادی",oldContent:"نسخه قبلی",
 proposedContent:"نسخه پیشنهادی",changes:"موارد تغییر",clinic:"کلینیک",
 professional:"داکتر",evidence:"سند",submittedAt:"ارسال‌شده",reviewedAt:"بررسی‌شده",
 reason:"دلیل",decision:"تصمیم",perform:"ثبت تصمیم",
 confirmation:"تأیید تصمیم",confirmPublish:"PUBLISH",confirmCredential:"VERIFY",
 reload:"تازه‌سازی",back:"بازگشت",review:"بررسی",publishedHidden:"این آگهی فعلاً پنهان است.",
 errors:"معلومات دریافت نشد.",loading:"در حال دریافت پروفایل…",
 login:"ورود",unauthorized:"اجازه دسترسی ندارید.",patientPreview:"نمایش عمومی برای مریض",
 noBooking:"رزرو آنلاین فعلاً فعال نیست.",publicPatient:"تنها معلومات بررسی‌شده نشر می‌شود.",
 approvedDentists:"داکتران تأییدشده",publishedServices:"خدمات کلینیک",fee:"قیمت",
 emptyPreview:"نسخه نشرشده موجود نیست.",publicPreview:"دیدن پروفایل منتشرشده",
 serviceVisit:"خدمات و قیمت‌ها",team:"کارمندان",openWebsite:"باز کردن صفحه عمومی",
 confirmSubmission:"این نسخه مشخص برای بررسی ارسال شود؟",
 confirmApprove:"نسخه بررسی‌شده تأیید و نشر شود؟",
 confirmReject:"نسخه پیشنهادی رد و نسخه قبلی حفظ شود؟",
 confirmHide:"آگهی فوراً از دید عمومی پنهان شود؟",
 confirmRestore:"نسخه تأییدشده پس از بررسی بازگردانده شود؟",
 confirmed:"تصمیم ثبت شد.",captions:"شرح عکس‌ها",noClaims:"امتیاز و وقت خیالی نشان داده نمی‌شود.",
 eligibility:"نشان تأیید فقط برای عضویت معتبر است.",
 replacement:"سند جدید لازم است.",revision:"ویرایش",account:"حساب",subscription:"اشتراک",
 mediaRights:"حق عکس",mobileHidden:"جستجو در مرحله ۱۳ فعال می‌شود.",
 contact:"تماس",photoRights:"حق نشر تصویر تأیید شده",
 missingService:"خدمات و تقسیم اوقات داکتر را بررسی کنید.",
 imageUnavailable:"تصویر موجود نیست.",previewLabel:"پیش‌نمایش مریض",
 roleSafety:"مخصوص مالک / مدیر",important:"مهم",permalink:"نشانی پروفایل عمومی",
 reviewer:"بررسی‌کننده",validUntil:"تا تاریخ",draftVersion:"نسخه مسلکی",
 qualifications:"اسناد تحصیلی"
 },
 "ps-AF":{
 CLINIC_MUST_BE_APPROVED:"د کلینیک جواز لومړی تایید کړئ.",CLINIC_CONTACT_LOCATION_REQUIRED:"د کلینیک پته او اړیکه بشپړه کړئ.",MAP_COORDINATES_REQUIRED:"د نقشې دواړه کوارډیناتونه ورکړئ.",VERIFIED_DENTIST_REQUIRED:"یو تایید شوی ډاکټر وټاکئ.",PUBLIC_SERVICE_REQUIRED:"یو عامه خدمت وټاکئ.",PRIMARY_PHOTO_REQUIRED:"اصلي انځور وټاکئ.",SPECIALTY_REQUIRED:"یو تخصص وټاکئ.",DENTIST_VERIFICATION_INVALID:"د ډاکټر تایید نامکمل، ختم یا لغوه شوی.",SERVICE_NOT_PUBLIC:"ټاکل شوی خدمت فعال او عام نه دی.",PHOTO_NOT_IN_CLINIC:"انځور د دې کلینیک نه دی.",CLINIC_HOURS_REQUIRED:"د کلینیک کاري ساعتونه تنظیم کړئ.",PROVIDER_HOURS_REQUIRED:"د ډاکټر ساعتونه تنظیم کړئ.",ACTIVE_CHAIR_REQUIRED:"فعاله د غاښونو څوکۍ پکار ده.",REAL_AVAILABILITY_REQUIRED:"په راتلونکو اتو ورځو کې خالي وخت نشته.",
 listing:"د کلینیک پېژندنه",overview:"لنډیز",dentists:"د غاښونو ډاکټران",photos:"انځورونه",
 bookingRules:"د وخت اخیستنې اصول",preview:"مخکتنه",
 adminDentists:"د ډاکټرانو تایید",adminListings:"د کلینیک اعلانونه",
 intro:"له خپرېدو مخکې د کلینیک باوري او تایید شوی پېژندلیک جوړ کړئ.",
 clinicalSafety:"یوازې تایید شوي ډاکټران، رښتیني خدمتونه او کتل شوي انځورونه خپرېږي.",
 drafts:"مسوده",pending:"د ارزونې په تمه",approved:"تایید",verified:"تایید شوی",
 published:"خپور شوی",rejected:"رد شوی",needs_changes:"اصلاح غواړي",revoked:"لغوه شوی",
 hidden:"پټ شوی",unverified:"نه دی تایید شوی",notReady:"چمتو نه دی",save:"مسوده خوندي کړئ",
 submit:"د ارزونې لپاره واستوئ",approve:"تایید او خپرول",reject:"اصلاح رد کړئ",
 revoke:"تایید لغوه کړئ",hide:"بیړنی پټول",restore:"بیا خپرول",
 requestChanges:"نوې اسناد وغواړئ",confirmReview:"د سیسټم مدیر باید اسناد جلا وګوري.",
 steps:"د خپرېدو شرطونه",complete:"چمتو",missing:"پاملرنه غواړي",
 description:"د کلینیک تشریح",specialties:"ځانګړې څانګې",
 specialtiesHint:"څانګې د کامې په وسیله جلا کړئ",
 address:"پته",location:"د نقشې موقعیت",latitude:"عرض البلد",longitude:"طول البلد",
 phone:"ټیلیفون",city:"ښار",province:"ولایت",contactNote:"د اړیکې لارښوونه",
 contactNoteHint:"د رسېدو یا د کتنې اختیاري لارښوونه",
 services:"عامه خدمتونه",servicesEmpty:"فعال عامه خدمتونه نشته.",
 dentistEmpty:"لومړی ډاکټر اضافه او اسناد تایید کړئ.",
 verifyDentist:"اسناد واستوئ",submitCredential:"خپلواک تایید ته واستوئ",
 credentialType:"د سند ډول",credentialNumber:"د سند/جواز شمېره",
 expires:"د اعتبار نېټه (میلادي)",file:"تاییدي سند",
 fileHint:"PDF/JPEG/PNG تر ۱.۵ MB، یوازې د سیسټم مدیر ته",
 attestation:"تاییدوم چې سند رښتینی دی او د سپارلو اجازه لرم.",
 verificationStatus:"د تایید حالت",profileIncomplete:"لومړی د ډاکټر مسلکي معلومات بشپړ کړئ.",
 viewStaff:"د کارکوونکي پېژندلیک سم کړئ",evidencePending:"اسناد د خپلواکې ارزونې په تمه دي.",
 credentialApproved:"سند وکتل شو؛ اوسنی تړاو او نسخه هم اړینه ده.",
 status:"حالت",action:"عمل",saveBefore:"لومړی خپل بدلونونه خوندي کړئ.",
 primaryPhoto:"اصلي انځور",rights:"د انځور د خپرولو حق لرم.",
 uploadPhoto:"انځور پورته کړئ",galleryEmpty:"انځور نشته.",
 galleryHint:"انځورونه وټاکئ، تشریح ورکړئ او ترتیب یې بدل کړئ؛ لومړی اصلي انځور دی.",
 fileLimit:"PNG/JPEG تر ۱ MB، ۸ ټاکل شوي انځورونه",
 removePhoto:"له اعلان څخه لرې کړئ",up:"پورته",down:"ښکته",
 approvalMode:"د تایید ډول",manual:"د کلینیک لاسي تایید",
 auto:"اتومات تایید (راتلونکی)",minNotice:"مخکې خبر (ساعت)",
 horizon:"د وخت اخیستنې موده (ورځې)",cancelHours:"د لغوه کولو خبر (ساعت)",
 buffer:"د وختونو ترمنځ وقفه (دقیقې)",
 bookingNote:"دا اصول د ۱۵ پړاو له نوبت اخیستنې سره پلي کېږي.",
 providerReady:"ډاکټران",photoReady:"انځورونه",serviceReady:"خدمتونه",readiness:"چمتووالی",
 pendingChanges:"ارزونه روانه ده؛ مخکینی خپور شوی پېژندلیک خوندي دی.",
 clinicUnapproved:"کلینیک باید د خپرېدو لپاره تایید وي.",saved:"مسوده خوندي شوه",
 submitted:"اعلان ارزونې ته واستول شو.",noPublic:"عام اعلان تر اوسه نشته.",
 publicLink:"تایید شوی عامه پېژندلیک",publicUnlisted:"د شریکولو پاڼه؛ لټون په ۱۳ پړاو کې.",
 privatePreview:"د خاوند شخصي مخکتنه، عامه نه ده.",
 publicWarning:"انلاین نوبت اخیستل تر ۱۵ پړاو نشته.",
 noSlots:"د خپرېدو لپاره رښتیني خالي ساعتونه اړین دي.",
 saveWarning:"ناخوندي بدلونونه نه استول کېږي.",
 readonlyPending:"د ارزونې پر مهال بدلون نه شي کېدای.",
 reviewerReason:"د پرېکړې دلیل",reviewBasis:"د اسنادو د خپلواکې ارزونې ډول",
 reviewBasisHint:"څه مو کتلي تشریح کړئ؛ بې ثبوته رسمي تایید مه ادعا کوئ.",
 confirmVerify:"اسناد او اوسنی کلینیکي تړاو مې په خپلواکه توګه کتلي.",
 verify:"اسناد تاییدول",rejectCredential:"سند ردول",viewEvidence:"شخصي سند اخيستل",
 credentialSubmission:"مسلکي سند",reviewHistory:"د ارزونې تاریخ",
 noData:"دلته ریکارډ نشته.",pendingRevisions:"د ارزونې په تمه",
 publishedListings:"خپرې شوې",hiddenListings:"راپورشوي / پټ",
 pendingDentists:"په تمه",verifiedDentists:"تایید شوي",rejectedDentists:"رد / اصلاح",
 search:"کلینیک یا ډاکټر ولټوئ",selected:"ټاکل شوی",
 compare:"منل شوی او وړاندیز شوی",oldContent:"اوسنی منل شوی",proposedContent:"وړاندیز",
 changes:"بدل شوي ځایونه",clinic:"کلینیک",professional:"ډاکټر",evidence:"اسناد",
 submittedAt:"سپارل شوی",reviewedAt:"کتل شوی",reason:"دلیل",decision:"پرېکړه",
 perform:"پرېکړه ثبتول",confirmation:"د تایید کلمه",
 confirmPublish:"PUBLISH",confirmCredential:"VERIFY",reload:"نوي کول",back:"بېرته",
 review:"کتنه",publishedHidden:"اعلان په موقتي ډول پټ شوی.",
 errors:"معلومات ونه موندل شول.",loading:"د کلینیک معلومات بارېږي…",
 login:"ننوتل",unauthorized:"دا برخه نه شئ کتلای.",
 patientPreview:"د ناروغ عامه مخکتنه",noBooking:"انلاین نوبت اخیستل لا نشته.",
 publicPatient:"یوازې تایید شوي معلومات خپرېږي.",
 approvedDentists:"تایید شوي ډاکټران",publishedServices:"د کلینیک خدمتونه",fee:"بیه",
 emptyPreview:"خپره شوې نسخه نشته.",publicPreview:"خپره شوې پاڼه کتل",
 serviceVisit:"خدمتونه او بیې",team:"کارکوونکي",openWebsite:"عامه پاڼه",
 confirmSubmission:"دا مسوده ارزونې ته ولېږل شي؟",
 confirmApprove:"کتل شوې نسخه تایید او خپره شي؟",
 confirmReject:"نوې نسخه رد، پخوانۍ نسخه وساتل شي؟",
 confirmHide:"دا اعلان سمدستي پټ شي؟",confirmRestore:"منل شوی اعلان بېرته راښکاره شي؟",
 confirmed:"پرېکړه ثبت شوه.",captions:"د انځور شرح",
 noClaims:"جعلي امتیازونه، وختونه یا بیې نه ښکاره کېږي.",
 eligibility:"یوازې اوسني معتبر ډاکټران تایید نښه لري.",
 replacement:"نوې اسناد پکار دي.",revision:"نسخه",account:"حساب",
 subscription:"ګډون",mediaRights:"د انځور حق",
 mobileHidden:"عامه لټون په ۱۳ پړاو کې پیلېږي.",contact:"اړیکه",
 photoRights:"د عکس حق تایید شو",missingService:"خدمتونه او د ډاکټر ساعتونه وګورئ.",
 imageUnavailable:"انځور نشته.",previewLabel:"د ناروغ مخکتنه",
 roleSafety:"یوازې د خاوند / مدیر لپاره",important:"مهم",permalink:"د عامه پاڼې پته",
 reviewer:"ارزوونکی",validUntil:"د اعتبار نېټه",draftVersion:"د مسلکي نسخې شمېره",
 qualifications:"زده کړې"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang:Lang=locale==="en"||locale==="fa-AF"||locale==="ps-AF"?locale:"en";
 const t=(key:string)=>labels[lang][key]||labels.en[key]||key;
 const money=(value:number)=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(value||0)+" AFN";
 const date=(value:unknown)=>{if(!value)return "—";try{
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   year:"numeric",month:"short",day:"numeric"}).format(new Date(String(value)));
 }catch{return String(value).slice(0,10)}};
 return {t,money,date,lang};
}
async function api(path:string,method="GET",body?:unknown):Promise<any>{
 const res=await fetch(API+route(path),{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Object.assign(new Error(data.code||"LISTING_UNAVAILABLE"),{status:res.status});
 return data;
}
function load(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[rev,setRev]=useState(0);
 const refresh=()=>setRev(x=>x+1);
 useEffect(()=>{let active=true;setError("");setData(null);
  if(path)api(path).then(x=>{if(active)setData(x)}).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false};
 },[path,rev]);
 return {data,error,refresh};
}
function Banner({children,kind="info"}:{children:ReactNode;kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Busy(){const {t}=useWords();return <div className="card phase12-busy" role="status">
 <span className="phase05-spinner" aria-hidden="true"/>{t("loading")}</div>}
function ErrorPanel({code,retry}:{code:string;retry?:()=>void}){
 const {t}=useWords();return <section className="card phase12-error" role="alert">
 <strong>{t("errors")}</strong><p>{code}</p>
 {retry&&<button className="btn btn-secondary" type="button" onClick={retry}>{t("reload")} ↻</button>}
 </section>;
}
function Label({value}:{value:string}){
 const {t}=useWords();return <span className={"phase12-badge state-"+value}>{t(value)}</span>;
}
async function fileAsBase64(file:File,limit:number){
 if(file.size<8||file.size>limit)throw Error("FILE_TOO_LARGE");
 const contentBase64=await new Promise<string>((resolve,reject)=>{
  const r=new FileReader();r.onerror=()=>reject(new Error("FILE_READ_FAILED"));
  r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.readAsDataURL(file);
 });
 return {fileName:file.name,mimeType:file.type,contentBase64};
}
async function privateFile(path:string,name:string){
 const res=await fetch(API+route(path),{credentials:"include",cache:"no-store"});
 if(!res.ok)throw Error("FILE_UNAVAILABLE");
 const blob=await res.blob(),url=URL.createObjectURL(blob),node=document.createElement("a");
 node.href=url;node.download=name;document.body.appendChild(node);node.click();node.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function ListingCover({src,name}:{src:string|null;name:string}){
 const {t}=useWords();return src?<img className="phase12-cover" src={src} alt={name}/>:
 <div className="phase12-cover phase12-cover-empty" role="img" aria-label={t("imageUnavailable")}>
 <span aria-hidden="true">✦</span><small>DANDANLINK</small></div>;
}
type Card={clinic:{id?:string;name:string;city:string;province:string;address:string;phone:string};
 profile:{description:string;specialties:string[];latitude?:number|null;longitude?:number|null;
 contactNote?:string|null;photos:{id:string;caption:string;url:string}[];
 dentists:{id?:string;displayName:string;specialty?:string|null;qualifications?:string|null;
 verified?:boolean}[];services:{id?:string;name:string;category:string;priceAfn:number}[];
 bookingRules:Rules}};
function PatientPreviewCard({item,badge,ownerOnly=false}:{item:Card;badge?:string;ownerOnly?:boolean}){
 const {t,money}=useWords();
 const image=item.profile.photos[0]?API+item.profile.photos[0].url:null;
 return <div className="phase12-public-profile">
  <div className="phase12-public-hero"><ListingCover src={image} name={item.clinic.name}/>
   <div className="phase12-hero-copy">
    <span className="phase12-kicker">DANDANLINK · {t("patientPreview")}</span>
    <div className="phase12-verified-row"><Label value={badge||"published"}/>
     <span className="phase12-verify-icon" aria-label={t("published")}>✓</span></div>
    <h2>{item.clinic.name}</h2>
    <p>{item.clinic.city}, {item.clinic.province} · {item.clinic.address}</p>
    <div className="phase12-specialties">{item.profile.specialties.map(x=><span key={x}>{x}</span>)}</div>
    <p className="phase12-public-intro">{item.profile.description}</p>
   </div></div>
  <div className="phase12-preview-grid">
   <section><h3>{t("approvedDentists")}</h3>
    {item.profile.dentists.length?item.profile.dentists.map((x,i)=><div className="phase12-dentist-preview" key={x.id||i}>
      <strong>{x.displayName}</strong>{x.verified&&<Label value="verified"/>}
      <span>{x.specialty||"—"}</span>{x.qualifications&&<small>{x.qualifications}</small>}
     </div>):<div className="phase12-empty">{t("dentistEmpty")}</div>}</section>
   <section><h3>{t("publishedServices")}</h3>
    {item.profile.services.length?item.profile.services.map((s,i)=><div className="phase12-service-preview" key={s.id||i}>
     <div><strong>{s.name}</strong><span>{s.category}</span></div>
     <bdi dir="ltr">{money(s.priceAfn)}</bdi></div>):<div className="phase12-empty">{t("servicesEmpty")}</div>}</section>
  </div>
  {item.profile.photos.length>1&&<section className="phase12-preview-gallery">
   {item.profile.photos.slice(1).map(x=><figure key={x.id}>
    <img alt={x.caption||item.clinic.name} src={API+x.url}/>
    <figcaption>{x.caption}</figcaption></figure>)}</section>}
  <aside className="phase12-public-footer">
   <strong>{t("contact")}: <bdi dir="ltr">{item.clinic.phone}</bdi></strong>
   {item.profile.contactNote&&<span>{item.profile.contactNote}</span>}
   <p>{ownerOnly?t("privatePreview"):t("publicUnlisted")} {t("publicWarning")}</p>
  </aside>
 </div>;
}
function fromVersion(space:Space,info:ClinicInfo,p:Profile,mode:"clinic"|"admin"="clinic"):Card{
 const prefix=mode==="clinic"?clinicPath(space.clinicId):adminPath("/listings/"+space.clinicId);
 return {clinic:{id:space.clinicId,name:info.name,city:info.city,province:info.province,
  address:info.address,phone:info.phone},
  profile:{...p,photos:p.photoIds.map(x=>({id:x.id,caption:x.caption,
   url:route(prefix+"/photos/"+x.id)})),dentists:[],services:[]}};
}
function Workspace({ctx,space}:{ctx:Context;space:Space}){
 const {t}=useWords();const root=clinicPath(space.clinicId);
 const {data,error,refresh}=load(root+"/workspace");
 const doctors=load(root+"/dentists");
 const [services,setServices]=useState<Service[]>([]);
 const [tab,setTab]=useState("overview"),[form,setForm]=useState<Profile>(defaults),
  [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[fault,setFault]=useState(""),
  [notice,setNotice]=useState("");
 useEffect(()=>{fetch(API+"/v1/operations/clinics/"+space.clinicId+"/services",{
  credentials:"include",cache:"no-store"}).then(r=>r.json()).then(x=>setServices(x.services||[]))
  .catch(()=>setServices([]))},[space.clinicId]);
 useEffect(()=>{if(data){
  setForm((data.draft?.profile||data.pending?.profile||data.approved?.profile||defaults()) as Profile);
  setDirty(false);
 }},[data]);
 function update(changes:Partial<Profile>){setForm(x=>({...x,...changes}));setDirty(true);setFault("");setNotice("")}
 function rules(k:keyof Rules,value:string|number){update({bookingRules:{...form.bookingRules,[k]:value}})}
 async function saveDraft(){
  setSaving(true);setFault("");setNotice("");
  try{
   const r=await api(root+"/draft","PUT",{revision:data.head.revision,profile:form});
   setNotice(t("saved")+" · "+r.draftVersion);refresh();
  }catch(e:any){setFault(e.message)}finally{setSaving(false)}
 }
 async function submit(){
  if(!confirm(t("confirmSubmission")))return;setSaving(true);setFault("");
  try{await api(root+"/submit","POST",{revision:data.head.revision});
   setNotice(t("submitted"));refresh();}
  catch(e:any){setFault(e.message)}finally{setSaving(false)}
 }
 if(error)return <ErrorPanel code={error} retry={refresh}/>;
 if(!data)return <Busy/>;
 const work=data as Working,head=work.head;
 const readonly=head.pending_version!=null,hasDraft=head.draft_version!=null;
 const current=work.draft||work.pending||work.approved;
 return <Shell ctx={ctx} space={space} active="listing">
  <div className="phase12-workspace">
   <header className="phase12-header"><div><span className="phase12-kicker">{t("roleSafety")} · DANDANLINK</span>
    <h1>{t("listing")}</h1><p>{t("intro")}</p></div>
    <div className="phase12-header-status">
     <Label value={head.hidden?"hidden":head.pending_version?"pending":
      head.approved_version?"published":"drafts"}/>
     {head.approved_version&&<a className="btn btn-secondary" target="_blank" rel="noreferrer"
      href={profileLink(space.clinicId)}>{t("publicPreview")} ↗</a>}
    </div></header>
   <div className="phase12-status-row">
    <div><span>{t("draftVersion")}</span><strong>{head.draft_version||"—"}</strong></div>
    <div><span>{t("pendingRevisions")}</span><strong>{head.pending_version||"—"}</strong></div>
    <div><span>{t("published")}</span><strong>{head.approved_version||"—"}</strong></div>
    <div><span>{t("status")}</span><strong><Label value={head.hidden?"hidden":head.pending_version?"pending":"published"}/></strong></div>
   </div>
   {readonly&&<Banner kind="warning">{t("readonlyPending")} {t("pendingChanges")}</Banner>}
   {head.hidden&&<Banner kind="warning">{t("publishedHidden")} {head.hidden_reason}</Banner>}
   {work.clinic.status!=="approved"&&<Banner kind="warning">{t("clinicUnapproved")}</Banner>}
   <nav className="phase12-tabs" role="tablist" aria-label={t("listing")}>
    {["overview","dentists","photos","bookingRules","preview"].map(x=>
     <button type="button" role="tab" aria-selected={tab===x} key={x} onClick={()=>setTab(x)}>
      {t(x)}</button>)}</nav>
   <div className="phase12-content">
    {tab==="overview"&&<section className="card phase12-panel">
     <SectionTitle title={t("overview")} desc={t("clinicalSafety")}/>
     <div className="phase12-form-grid">
      <label className="phase12-field phase12-wide"><span>{t("description")} *</span>
       <textarea rows={5} minLength={10} maxLength={2200} disabled={readonly}
        value={form.description} onChange={e=>update({description:e.target.value})}/></label>
      <label className="phase12-field phase12-wide"><span>{t("specialties")} *</span>
       <input value={form.specialties.join(", ")} placeholder={t("specialtiesHint")} disabled={readonly}
        onChange={e=>update({specialties:e.target.value.split(",")
         .map(x=>x.trim()).filter(Boolean)})}/></label>
      <div className="phase12-readonly"><span>{t("clinic")}</span><strong>{work.clinic.name}</strong></div>
      <div className="phase12-readonly"><span>{t("phone")}</span><strong dir="ltr">{work.clinic.phone}</strong></div>
      <div className="phase12-readonly"><span>{t("address")}</span><strong>{work.clinic.address}</strong></div>
      <div className="phase12-readonly"><span>{t("city")}</span><strong>{work.clinic.city}, {work.clinic.province}</strong></div>
      <label className="phase12-field"><span>{t("latitude")}</span>
       <input disabled={readonly} type="number" step="any" min={-90} max={90}
        value={form.latitude??""} onChange={e=>update({latitude:e.target.value===""?null:Number(e.target.value)})}/></label>
      <label className="phase12-field"><span>{t("longitude")}</span>
       <input disabled={readonly} type="number" step="any" min={-180} max={180}
        value={form.longitude??""} onChange={e=>update({longitude:e.target.value===""?null:Number(e.target.value)})}/></label>
      <label className="phase12-field phase12-wide"><span>{t("contactNote")}</span>
       <textarea disabled={readonly} maxLength={300} rows={2} value={form.contactNote||""}
        onChange={e=>update({contactNote:e.target.value||null})}/></label>
     </div>
     <p className="phase12-small">{t("location")} · {t("clinicUnapproved")}</p>
    </section>}
    {tab==="dentists"&&<section className="card phase12-panel">
     <SectionTitle title={t("dentists")} desc={t("eligibility")}
      action={<a className="btn btn-secondary" href={"/clinic/staff?clinic="+encodeURIComponent(space.clinicId)}>
       {t("team")} ↗</a>}/>
     {doctors.error?<ErrorPanel code={doctors.error} retry={doctors.refresh}/>:
      !doctors.data?<Busy/>:!doctors.data.dentists.length?<div className="phase12-empty">{t("dentistEmpty")}</div>:
      <div className="phase12-provider-list">{(doctors.data.dentists as Dentist[]).map(d=>
       <div className="phase12-provider" key={d.id}>
        <div className="phase12-provider-info"><strong>{d.display_name}</strong>
         <span>{d.specialty||"—"} · {d.qualifications||"—"}</span>
         <span>{t("verificationStatus")}: <Label value={d.currentlyVerified?"verified":d.verification_status||"unverified"}/></span>
         {!d.professional_license&&<small>{t("profileIncomplete")}</small>}
         {d.valid_until&&<small>{t("validUntil")}: {d.valid_until}</small>}
        </div>
        <div className="phase12-provider-actions">
         <label className="phase12-checkbox">
          <input type="checkbox" disabled={!d.currentlyVerified||readonly}
           checked={form.dentistIds.includes(d.id)}
           onChange={e=>update({dentistIds:e.target.checked?
            [...form.dentistIds,d.id]:form.dentistIds.filter(x=>x!==d.id)})}/>
          {t("selected")}</label>
         <CredentialForm space={space} dentist={d} onSuccess={()=>{doctors.refresh();}}/>
         <a className="phase12-text-link" href={"/clinic/staff/"+d.id+"?clinic="+encodeURIComponent(space.clinicId)}>
          {t("viewStaff")} ↗</a>
        </div>
       </div>)}</div>}
    </section>}
    {tab==="photos"&&<section className="card phase12-panel">
     <SectionTitle title={t("photos")} desc={t("galleryHint")}/>
     {!readonly&&<PhotoUpload space={space} onUploaded={id=>{
      update({photoIds:[...form.photoIds,{id,caption:""}]});
     }}/>}
     {form.photoIds.length?<div className="phase12-photo-grid">{form.photoIds.map((photo,index)=>
      <figure className="phase12-photo" key={photo.id}>
       <img src={API+route(clinicPath(space.clinicId)+"/photos/"+photo.id)}
        alt={photo.caption||work.clinic.name}/>
       {index===0&&<span className="phase12-photo-cover">{t("primaryPhoto")}</span>}
       <label className="phase12-field"><span>{t("captions")}</span>
        <input maxLength={160} disabled={readonly} value={photo.caption}
         onChange={e=>update({photoIds:form.photoIds.map(x=>x.id===photo.id?
           {...x,caption:e.target.value}:x)})}/></label>
       <div className="phase12-photo-actions">
        <button type="button" disabled={readonly||index===0} onClick={()=>{
         const a=[...form.photoIds];[a[index-1],a[index]]=[a[index],a[index-1]];
         update({photoIds:a})}}>{t("up")} ↑</button>
        <button type="button" disabled={readonly||index===form.photoIds.length-1} onClick={()=>{
         const a=[...form.photoIds];[a[index+1],a[index]]=[a[index],a[index+1]];
         update({photoIds:a})}}>{t("down")} ↓</button>
        <button type="button" disabled={readonly} onClick={()=>update({
         photoIds:form.photoIds.filter(x=>x.id!==photo.id)})}>{t("removePhoto")}</button>
       </div></figure>)}</div>:<div className="phase12-empty">{t("galleryEmpty")}</div>}
     <Banner kind="info">{t("fileLimit")} {t("photoRights")}</Banner>
    </section>}
    {tab==="bookingRules"&&<section className="card phase12-panel">
     <SectionTitle title={t("bookingRules")} desc={t("bookingNote")}/>
     <div className="phase12-form-grid">
      <label className="phase12-field"><span>{t("approvalMode")}</span>
       <select disabled={readonly} value={form.bookingRules.approvalMode}
        onChange={e=>rules("approvalMode",e.target.value)}>
        <option value="manual">{t("manual")}</option><option value="auto">{t("auto")}</option>
       </select></label>
      {([["minNoticeHours","minNotice",0,72],["horizonDays","horizon",1,90],
       ["cancellationHours","cancelHours",0,168],["bufferMinutes","buffer",0,120]] as const)
       .map(([key,label,min,max])=><label className="phase12-field" key={key}>
        <span>{t(label)}</span><input type="number" disabled={readonly} min={min} max={max} step={1}
         value={form.bookingRules[key]} onChange={e=>rules(key,Number(e.target.value))}/></label>)}
     </div>
     <div className="phase12-rule-services">
      <SectionTitle title={t("services")} desc={t("missingService")}
       action={<a className="btn btn-secondary" href={"/clinic/services?clinic="+encodeURIComponent(space.clinicId)}>
        {t("serviceVisit")}</a>}/>
      {services.filter(x=>x.active&&x.publicBooking).length===0?
       <div className="phase12-empty">{t("servicesEmpty")}</div>:
       services.filter(x=>x.active&&x.publicBooking).map(s=><label className="phase12-service-check" key={s.id}>
        <input disabled={readonly} type="checkbox" checked={form.serviceIds.includes(s.id)}
         onChange={e=>update({serviceIds:e.target.checked?[...form.serviceIds,s.id]:
          form.serviceIds.filter(x=>x!==s.id)})}/>
        <span><strong>{s.name}</strong><small>{s.category} · {s.durationMinutes} min</small></span>
        <bdi dir="ltr">{s.basePriceAfn} AFN</bdi></label>)}
     </div>
    </section>}
    {tab==="preview"&&<div className="phase12-stack">
     <section className="card phase12-panel">
      <SectionTitle title={t("preview")} desc={t("privatePreview")}/>
      {current?<PatientPreviewCard
       item={{...fromVersion(space,work.clinic,form),
        profile:{...fromVersion(space,work.clinic,form).profile,
         dentists:(doctors.data?.dentists||[]).filter((x:Dentist)=>form.dentistIds.includes(x.id)&&x.currentlyVerified)
         .map((x:Dentist)=>({id:x.id,displayName:x.display_name,specialty:x.specialty,
          qualifications:x.qualifications,verified:true})),
         services:services.filter(s=>form.serviceIds.includes(s.id)).map(s=>({
          id:s.id,name:s.name,category:s.category,priceAfn:s.basePriceAfn}))
        }}
       } badge={current.status} ownerOnly/>:<div className="phase12-empty">{t("emptyPreview")}</div>}
     </section>
     <section className="card phase12-panel">
      <SectionTitle title={t("steps")} desc={t("clinicalSafety")}/>
      <Readiness issues={work.checklist?.issues||[]} ready={Boolean(work.checklist?.ready)}
       hasDraft={Boolean(current)}/>
     </section>
    </div>}
    {tab!=="dentists"&&<section className="card phase12-panel phase12-controls">
     {dirty&&<Banner kind="warning">{t("saveWarning")}</Banner>}
     <div className="phase12-actions">
      <button type="button" className="btn btn-primary" disabled={saving||readonly}
       onClick={saveDraft}>{saving?t("loading"):t("save")} →</button>
      {hasDraft&&!readonly&&<button type="button" className="btn btn-secondary"
       disabled={saving||dirty||!work.checklist?.ready} onClick={submit}>{t("submit")} ↗</button>}
     </div>
     {!work.checklist?.ready&&hasDraft&&<Readiness issues={work.checklist?.issues||[]}
      ready={false} hasDraft/>}
     {work.approved&&<p className="phase12-small">{t("publicUnlisted")} ·
      <a href={profileLink(space.clinicId)} target="_blank" rel="noreferrer">
       {t("permalink")} ↗</a></p>}
    </section>}
    {fault&&<ErrorPanel code={fault}/>}
    {notice&&<Banner kind="success">{notice}</Banner>}
   </div>
   <p className="phase12-note">{t("noClaims")} {t("publicWarning")}</p>
  </div>
 </Shell>;
}
function SectionTitle({title,desc,action}:{title:string;desc?:string;action?:ReactNode}){
 return <header className="phase12-section-title"><div><h2>{title}</h2>{desc&&<p>{desc}</p>}</div>{action}</header>;
}
function Readiness({issues,ready,hasDraft}:{issues:string[];ready:boolean;hasDraft:boolean}){
 const {t}=useWords();return <div className="phase12-readiness">
  {ready?<Banner kind="success">{t("complete")}</Banner>:!hasDraft?
   <Banner kind="warning">{t("saveBefore")}</Banner>:
   <div className="phase12-check-grid">{issues.map((x,i)=><span key={i} className="phase12-check-missing">
     <b aria-hidden="true">!</b>{t(x)}</span>)}</div>}
 </div>;
}
function CredentialForm({space,dentist,onSuccess}:{space:Space;dentist:Dentist;onSuccess:()=>void}){
 const {t}=useWords();const [expanded,setExpanded]=useState(false),
  [type,setType]=useState("Professional license"),[number,setNumber]=useState(""),
  [validUntil,setValidUntil]=useState(""),[file,setFile]=useState<File|null>(null),
  [attested,setAttested]=useState(false),[busy,setBusy]=useState(false),[fault,setFault]=useState(""),
  [notice,setNotice]=useState("");
 const status=load(expanded?clinicPath(space.clinicId)+"/dentists/"+dentist.id+"/credential":null);
 async function submit(e:FormEvent){
  e.preventDefault();if(!file||!attested)return;setBusy(true);setFault("");
  try{
   const evidence=await fileAsBase64(file,1572864);
   await api(clinicPath(space.clinicId)+"/dentists/"+dentist.id+"/credentials","POST",{
    credentialType:type,credentialNumber:number,validUntil,evidence,attested:true});
   setNotice(t("evidencePending"));status.refresh();onSuccess();
  }catch(e:any){setFault(e.message)}finally{setBusy(false)}
 }
 return <div className="phase12-credential">
  <button type="button" className="btn btn-secondary" onClick={()=>setExpanded(x=>!x)}>
   {expanded?t("close"):t("verifyDentist")}</button>
  {expanded&&<div className="phase12-credential-panel">
   {status.error&&<ErrorPanel code={status.error} retry={status.refresh}/>}
   {status.data&&<div><p>{t("verificationStatus")}: <Label
    value={status.data.verification?.status||"unverified"}/></p>
    {status.data.decisions?.slice(0,3).map((x:any,i:number)=><p key={i} className="phase12-small">
     {x.decision} · {x.reason}</p>)}</div>}
   <form onSubmit={submit} className="phase12-credential-form">
    <label className="phase12-field"><span>{t("credentialType")} *</span>
     <input value={type} minLength={3} maxLength={100} required
      onChange={e=>setType(e.target.value)}/></label>
    <label className="phase12-field"><span>{t("credentialNumber")} *</span>
     <input value={number} minLength={3} maxLength={120} required
      onChange={e=>setNumber(e.target.value)}/></label>
    <label className="phase12-field"><span>{t("expires")} *</span>
     <input type="date" required value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></label>
    <label className="phase12-field"><span>{t("file")} *</span>
     <input type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      onChange={e=>setFile(e.target.files?.[0]||null)}/>
     <small>{t("fileHint")}</small></label>
    <label className="phase12-checkbox"><input type="checkbox" required checked={attested}
     onChange={e=>setAttested(e.target.checked)}/><span>{t("attestation")}</span></label>
    <button className="btn btn-primary" type="submit" disabled={busy||!attested||!file||
     dentist.verification_status==="pending"}>{busy?t("loading"):t("submitCredential")}</button>
   </form>
   {fault&&<ErrorPanel code={fault}/>}
   {notice&&<Banner kind="success">{notice}</Banner>}
  </div>}
 </div>;
}
function PhotoUpload({space,onUploaded}:{space:Space;onUploaded:(id:string)=>void}){
 const {t}=useWords();const [file,setFile]=useState<File|null>(null),
  [rights,setRights]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent){
  e.preventDefault();if(!file||!rights)return;setBusy(true);setError("");
  try{
   const image=await fileAsBase64(file,1048576);
   const r=await api(clinicPath(space.clinicId)+"/photos","POST",
    {rightsAttested:true,image});
   onUploaded(r.id);setFile(null);setRights(false);
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 return <form className="phase12-photo-upload" onSubmit={submit}>
  <label className="phase12-field"><span>{t("uploadPhoto")}</span>
   <input type="file" required accept="image/jpeg,image/png,.jpg,.jpeg,.png"
    onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
  <label className="phase12-checkbox"><input type="checkbox" required checked={rights}
   onChange={e=>setRights(e.target.checked)}/><span>{t("rights")}</span></label>
  <button className="btn btn-primary" type="submit" disabled={!file||!rights||busy}>
   {busy?t("loading"):t("uploadPhoto")}</button>
  {error&&<ErrorPanel code={error}/>}
 </form>;
}
export function ClinicListingPortal(){
 const [ctx,setCtx]=useState<Context|null>(null),[selected,setSelected]=useState<string|null|undefined>(undefined),
 [error,setError]=useState("");
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.code||"AUTH_REQUIRED");return x;})
   .then(setCtx).catch(e=>setError(e.message));
 },[]);
 if(error)return <ErrorPanel code={error}/>;
 if(!ctx||selected===undefined)return <Busy/>;
 const space=selected?ctx.clinics.find(x=>x.clinicId===selected):ctx.clinics[0];
 if(!space||!["owner","manager"].includes(space.role))return <ErrorPanel code="LISTING_STAFF_FORBIDDEN"/>;
 return <Workspace space={space} ctx={ctx}/>;
}


type AdminView="dentists"|"dentistReview"|"listings"|"listingReview";
function AdminDentistQueue(){
 const {t,date}=useWords();
 const [status,setStatus]=useState("pending"),[q,setQ]=useState(""),[search,setSearch]=useState("");
 const rows=load(adminPath("/dentists?")+new URLSearchParams({status,q:search}));
 return <div className="phase12-stack">
  <div className="phase12-section-title"><div><h1>{t("adminDentists")}</h1>
   <p>{t("confirmReview")}</p></div></div>
  <nav className="phase12-tabs" role="tablist" aria-label={t("adminDentists")}>
   {(["pending","verified","rejected","needs_changes","revoked","all"]).map(x=>
    <button key={x} type="button" role="tab" aria-selected={status===x}
     onClick={()=>setStatus(x)}>{t(x)}</button>)}</nav>
  <form className="phase12-filter-form" onSubmit={e=>{e.preventDefault();setSearch(q)}}>
   <input maxLength={100} aria-label={t("search")} value={q}
    placeholder={t("search")} onChange={e=>setQ(e.target.value)}/>
   <button className="btn btn-secondary" type="submit">{t("search")}</button>
  </form>
  {rows.error?<ErrorPanel code={rows.error} retry={rows.refresh}/>:
   !rows.data?<Busy/>:!rows.data.dentists.length?<div className="card phase12-empty">{t("noData")}</div>:
   <div className="card phase12-panel"><div className="phase12-table-wrap">
    <table className="phase12-table"><thead><tr>
     <th>{t("professional")}</th><th>{t("clinic")}</th>
     <th>{t("credentialType")}</th><th>{t("submittedAt")}</th>
     <th>{t("status")}</th><th>{t("action")}</th>
    </tr></thead><tbody>{rows.data.dentists.map((x:any)=><tr key={x.membership_id}>
     <td><strong>{x.display_name}</strong><small>{x.specialty||"—"}</small></td>
     <td>{x.clinic_name}<small>{x.city}</small></td>
     <td>{x.credential_type||"—"}</td><td>{date(x.submitted_at)}</td>
     <td><Label value={x.status}/></td>
     <td><a className="phase12-text-link" href={"/admin/dentists/"+x.membership_id}>
      {t("review")} →</a></td>
    </tr>)}</tbody></table></div></div>}
 </div>;
}
function AdminDentistReview({id}:{id:string}){
 const {t,date}=useWords();
 const data=load(adminPath("/dentists/"+id));
 const [action,setAction]=useState("approve"),[reason,setReason]=useState(""),
  [basis,setBasis]=useState(""),[confirmation,setConfirmation]=useState(false),
  [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{if(data.data?.verification?.status==="verified")setAction("revoke");
  else if(data.data?.verification?.status==="pending")setAction("approve");
 },[data.data?.verification?.status]);
 async function decision(e:FormEvent){
  e.preventDefault();if(busy)return;
  if(!confirm(t("confirmReview")))return;
  setBusy(true);setError("");setNotice("");
  try{
   await api(adminPath("/dentists/"+id+"/decision"),"POST",{
    action,reason,reviewBasis:action==="approve"?basis:null,
    confirmation:action==="approve"&&confirmation?"VERIFY":null});
   setNotice(t("confirmed"));data.refresh();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 if(data.error)return <ErrorPanel code={data.error} retry={data.refresh}/>;
 if(!data.data)return <Busy/>;
 const v=data.data.verification,canDecide=v.status==="pending",canRevoke=v.status==="verified";
 const items=data.data.submissions||[];
 return <div className="phase12-stack">
  <a href="/admin/dentists" className="phase12-text-link">← {t("adminDentists")}</a>
  <section className="card phase12-panel">
   <div className="phase12-review-head">
    <div><span className="phase12-kicker">{t("adminDentists")} / {v.clinic_name}</span>
     <h1>{v.display_name}</h1><p>{v.specialty||"—"} · {v.professional_license||"—"}</p></div>
    <Label value={v.status}/></div>
   <div className="phase12-info-tiles">
    <div><span>{t("clinic")}</span><strong>{v.clinic_name}</strong></div>
    <div><span>{t("draftVersion")}</span><strong>{v.draft_version}</strong></div>
    <div><span>{t("status")}</span><strong>{v.affiliation_status}</strong></div>
    <div><span>{t("qualifications")}</span><strong>{v.qualifications||"—"}</strong></div></div>
  </section>
  <section className="card phase12-panel">
   <SectionTitle title={t("evidence")} desc={t("confirmReview")}/>
   {items.length?items.map((s:any)=><div className="phase12-evidence-row" key={s.id}>
    <div><strong>{s.credential_type}</strong><p dir="ltr">{s.credential_number}</p>
     <span>{t("validUntil")}: {s.valid_until} · {t("draftVersion")} {s.draft_version}</span>
     <small>{s.file_name} · {s.size_bytes} bytes · {date(s.created_at)}</small></div>
    <button type="button" className="btn btn-secondary" onClick={()=>privateFile(
     adminPath("/dentists/"+id+"/evidence/"+s.id),"professional-proof-"+s.id.slice(0,8))}>
     {t("viewEvidence")} ↗</button>
   </div>):<div className="phase12-empty">{t("noData")}</div>}
  </section>
  {(canDecide||canRevoke)&&<section className="card phase12-panel">
   <SectionTitle title={t("decision")} desc={t("reviewBasisHint")}/>
   <form onSubmit={decision} className="phase12-decision-form">
    <label className="phase12-field"><span>{t("decision")}</span>
     <select value={action} onChange={e=>setAction(e.target.value)}>
      {(canDecide?["approve","reject","needs_changes"]:["revoke"]).map(x=>
       <option key={x} value={x}>{t(x==="approve"?"verify":x==="reject"?"rejectCredential":
        x==="needs_changes"?"requestChanges":"revoke")}</option>)}</select></label>
    <label className="phase12-field"><span>{t("reviewerReason")} *</span>
     <textarea minLength={10} maxLength={700} required rows={3}
      value={reason} onChange={e=>setReason(e.target.value)}/></label>
    {action==="approve"&&<label className="phase12-field">
     <span>{t("reviewBasis")} *</span><textarea required minLength={15} maxLength={700}
      rows={3} placeholder={t("reviewBasisHint")} value={basis}
      onChange={e=>setBasis(e.target.value)}/></label>}
    {action==="approve"&&<label className="phase12-checkbox">
     <input type="checkbox" checked={confirmation}
      onChange={e=>setConfirmation(e.target.checked)} required/>
     <span>{t("confirmVerify")} (<strong>VERIFY</strong>)</span></label>}
    <button type="submit" className="btn btn-primary" disabled={busy||(action==="approve"&&!confirmation)}>
     {busy?t("loading"):t("perform")}</button>
   </form>
   {error&&<ErrorPanel code={error}/>}
   {notice&&<Banner kind="success">{notice}</Banner>}
  </section>}
  <section className="card phase12-panel"><SectionTitle title={t("reviewHistory")}/>
   <Timeline rows={data.data.decisions||[]}/></section>
 </div>;
}
function AdminListingQueue(){
 const {t,date}=useWords();const [status,setStatus]=useState("pending"),
  [q,setQ]=useState(""),[search,setSearch]=useState("");
 const rows=load(adminPath("/listings?")+new URLSearchParams({status,q:search}));
 return <div className="phase12-stack">
  <div className="phase12-section-title"><div><h1>{t("adminListings")}</h1>
   <p>{t("publicPatient")}</p></div></div>
  <nav className="phase12-tabs" role="tablist" aria-label={t("adminListings")}>
   {(["pending","published","hidden","all"] as const).map(x=><button type="button" key={x}
    role="tab" aria-selected={status===x} onClick={()=>setStatus(x)}>
    {t(x==="pending"?"pendingRevisions":x==="published"?"publishedListings":
     x==="hidden"?"hiddenListings":"all")}</button>)}</nav>
  <form className="phase12-filter-form" onSubmit={e=>{e.preventDefault();setSearch(q)}}>
   <input maxLength={100} aria-label={t("search")} placeholder={t("search")}
    value={q} onChange={e=>setQ(e.target.value)}/>
   <button className="btn btn-secondary" type="submit">{t("search")}</button></form>
  {rows.error?<ErrorPanel code={rows.error} retry={rows.refresh}/>:!rows.data?<Busy/>:
   !rows.data.listings.length?<div className="card phase12-empty">{t("noData")}</div>:
   <div className="card phase12-panel"><div className="phase12-table-wrap">
    <table className="phase12-table"><thead><tr>
     <th>{t("clinic")}</th><th>{t("city")}</th><th>{t("changes")}</th>
     <th>{t("submittedAt")}</th><th>{t("status")}</th><th>{t("action")}</th>
    </tr></thead><tbody>{rows.data.listings.map((x:any)=><tr key={x.clinicId}>
     <td><strong>{x.clinicName}</strong></td><td>{x.city}, {x.province}</td>
     <td>{(x.changedFields||[]).map((s:string)=>s.replaceAll("_"," ")).join(", ")||"—"}</td>
     <td>{date(x.submittedAt)}</td>
     <td><Label value={x.hidden?"hidden":x.pendingVersion?"pending":"published"}/></td>
     <td><a className="phase12-text-link" href={"/admin/listings/"+x.clinicId}>
      {t("review")} →</a></td>
    </tr>)}</tbody></table></div></div>}
 </div>;
}
function Timeline({rows}:{rows:any[]}){
 const {date,t}=useWords();return <div className="phase12-timeline">
  {!rows.length?<div className="phase12-empty">{t("noData")}</div>:
   rows.map((e:any,index)=><div className="phase12-event" key={index}>
    <span className="phase12-event-icon" aria-hidden="true">◦</span>
    <div><strong>{t(e.action||e.decision)} · {e.actor_name||e.reviewer_name||""}</strong>
     <p>{date(e.created_at)}</p>{e.reason&&<blockquote>{e.reason}</blockquote>}
     {e.review_basis&&<p>{t("reviewBasis")}: {e.review_basis}</p>}</div>
   </div>)}</div>;
}
function VersionCompare({title,version,clinicId,clinic,readiness}:{title:string;
 version:ListingVersion|null;clinicId:string;clinic:any;readiness:any}){
 const {t}=useWords();if(!version)return <div className="phase12-comparison">
  <h3>{title}</h3><p>{t("emptyPreview")}</p></div>;
 const p=version.profile;
 return <div className="phase12-comparison">
  <div className="phase12-section-title"><div><h3>{title}</h3>
   <span>{t("revision")} {version.version}</span></div><Label value={version.status}/></div>
  <p className="phase12-comparison-description">{p.description}</p>
  <dl><div><dt>{t("specialties")}</dt><dd>{p.specialties.join(", ")}</dd></div>
   <div><dt>{t("location")}</dt><dd>{p.latitude}, {p.longitude}</dd></div>
   <div><dt>{t("dentists")}</dt><dd>{p.dentistIds.length}</dd></div>
   <div><dt>{t("services")}</dt><dd>{p.serviceIds.length}</dd></div>
   <div><dt>{t("bookingRules")}</dt><dd>
    {t(p.bookingRules.approvalMode)} · {t("minNotice")}: {p.bookingRules.minNoticeHours}h ·
    {t("horizon")}: {p.bookingRules.horizonDays}d</dd></div>
   <div><dt>{t("contactNote")}</dt><dd>{p.contactNote||"—"}</dd></div></dl>
  {p.photoIds.length>0&&<div className="phase12-moderation-photos">
   {p.photoIds.map(x=><figure key={x.id}>
    <img src={API+route(adminPath("/listings/"+clinicId+"/photos/"+x.id))}
     alt={x.caption||t("photos")}/><figcaption>{x.caption||"—"}</figcaption>
   </figure>)}</div>}
  {readiness&&<Readiness hasDraft issues={readiness.issues||[]} ready={Boolean(readiness.ready)}/>}
  {version.decision_reason&&<Banner kind="warning">{version.decision_reason}</Banner>}
 </div>;
}
function AdminListingReview({id}:{id:string}){
 const {t}=useWords();const data=load(adminPath("/listings/"+id));
 const [action,setAction]=useState("approve"),[reason,setReason]=useState(""),
  [confirmation,setConfirmation]=useState(false),[busy,setBusy]=useState(false),
  [fault,setFault]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{if(data.data){setAction(data.data.head.pending_version?"approve":
  data.data.head.hidden?"restore":"hide")}},[data.data]);
 async function apply(e:FormEvent){
  e.preventDefault();if(busy)return;
  const label=action==="approve"?"confirmApprove":action==="reject"?"confirmReject":
   action==="hide"?"confirmHide":"confirmRestore";
  if(!confirm(t(label)))return;setBusy(true);setFault("");setNotice("");
  try{
   await api(adminPath("/listings/"+id+"/decision"),"POST",{
    action,revision:data.data.head.revision,reason,
    confirmation:action==="approve"&&confirmation?"PUBLISH":null});
   setNotice(t("confirmed"));data.refresh();
  }catch(e:any){setFault(e.message)}finally{setBusy(false)}
 }
 if(data.error)return <ErrorPanel code={data.error} retry={data.refresh}/>;
 if(!data.data)return <Busy/>;
 const x=data.data,h=x.head as Head,hasPending=Boolean(h.pending_version),
  canHide=Boolean(h.approved_version)&&!h.hidden,canRestore=Boolean(h.hidden&&h.approved_version);
 const actions=[...(hasPending?["approve","reject"]:[]),...(canHide?["hide"]:[]),
  ...(canRestore?["restore"]:[])];
 return <div className="phase12-stack">
  <a href="/admin/listings" className="phase12-text-link">← {t("adminListings")}</a>
  <section className="card phase12-panel"><div className="phase12-review-head">
   <div><span className="phase12-kicker">{t("adminListings")}</span>
    <h1>{x.clinic.display_name}</h1><p>{x.clinic.city}, {x.clinic.province} · {x.clinic.address}</p></div>
   <Label value={h.hidden?"hidden":hasPending?"pending":h.approved_version?"published":"drafts"}/>
  </div>
   <div className="phase12-info-tiles">
    <div><span>{t("status")}</span><strong>{x.clinic.status}</strong></div>
    <div><span>{t("published")}</span><strong>{h.approved_version||"—"}</strong></div>
    <div><span>{t("pending")}</span><strong>{h.pending_version||"—"}</strong></div>
    <div><span>{t("revision")}</span><strong>{h.revision}</strong></div></div>
  </section>
  <section className="card phase12-panel"><SectionTitle title={t("compare")} desc={t("publicPatient")}/>
   <div className="phase12-comparison-grid">
    <VersionCompare title={t("oldContent")} version={x.approved} clinicId={id}
     clinic={x.clinic} readiness={null}/>
    <VersionCompare title={t("proposedContent")} version={x.pending} clinicId={id}
     clinic={x.clinic} readiness={x.readiness}/></div></section>
  {actions.length>0&&<section className="card phase12-panel">
   <SectionTitle title={t("decision")} desc={t("confirmReview")}/>
   <form onSubmit={apply} className="phase12-decision-form">
    <label className="phase12-field"><span>{t("decision")}</span>
     <select value={actions.includes(action)?action:actions[0]}
      onChange={e=>{setAction(e.target.value);setConfirmation(false)}}>
      {actions.map(a=><option key={a} value={a}>{t(a==="approve"?"approve":
       a==="reject"?"reject":a==="hide"?"hide":"restore")}</option>)}</select></label>
    <label className="phase12-field"><span>{t("reviewerReason")} *</span>
     <textarea rows={3} minLength={10} maxLength={500} required value={reason}
      onChange={e=>setReason(e.target.value)}/></label>
    {action==="approve"&&<label className="phase12-checkbox">
     <input type="checkbox" checked={confirmation} required
      onChange={e=>setConfirmation(e.target.checked)}/>
     {t("confirmApprove")} <strong>PUBLISH</strong></label>}
    <button className="btn btn-primary" type="submit" disabled={busy||(action==="approve"&&!confirmation)}>
     {busy?t("loading"):t("perform")}</button>
   </form>
   {fault&&<ErrorPanel code={fault}/>}
   {notice&&<Banner kind="success">{notice}</Banner>}
  </section>}
  <section className="card phase12-panel"><SectionTitle title={t("reviewHistory")}/>
   <Timeline rows={x.events||[]}/></section>
  {h.approved_version&&!h.hidden&&<a href={profileLink(id)}
   className="btn btn-secondary" target="_blank" rel="noreferrer">
   {t("publicPreview")} ↗</a>}
 </div>;
}
export function AdminModerationPortal({view}:{view:AdminView}){
 const bits=typeof location!=="undefined"?location.pathname.split("/").filter(Boolean):[];
 const id=bits.at(-1)||"";
 return view==="dentists"?<AdminDentistQueue/>:
  view==="dentistReview"?<AdminDentistReview id={id}/>:
  view==="listings"?<AdminListingQueue/>:<AdminListingReview id={id}/>;
}
export function PublicListingPortal({clinicId}:{clinicId:string}){
 const {t}=useWords(),content=load("/public/clinics/"+clinicId);
 if(content.error)return <div className="phase12-public-page"><ErrorPanel code={t("noPublic")}/></div>;
 if(!content.data)return <Busy/>;
 const data=content.data;
 return <div className="phase12-public-page">
  <header className="phase12-public-sitebar"><a href="/"><strong>DANDANLINK</strong></a>
   <span>{t("publicUnlisted")}</span></header>
  <PatientPreviewCard item={data as Card} badge="published"/>
  <div className="phase12-public-notice"><Banner kind="info">{t("publicWarning")}
   {t("publicPatient")} {t("noClaims")}</Banner></div>
 </div>;
}


/** Credential self-service intentionally doesn't expose the public listing editor to dentists. */
export function DentistCredentialPortal(){
 const {t}=useWords();const [ctx,setCtx]=useState<Context|null>(null),
  [selected,setSelected]=useState<string|null|undefined>(undefined),[error,setError]=useState("");
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.code||"AUTH_REQUIRED");return data;})
   .then(setCtx).catch(e=>setError(e.message));
 },[]);
 if(error)return <ErrorPanel code={error}/>;
 if(!ctx||selected===undefined)return <Busy/>;
 const space=selected?ctx.clinics.find(c=>c.clinicId===selected):ctx.clinics[0];
 if(!space||!(space.role==="dentist"||space.clinicianEnabled))
  return <ErrorPanel code="CREDENTIAL_SELF_OR_OWNER_REQUIRED"/>;
 return <DentistOwnCredential space={space} ctx={ctx} t={t}/>;
}
function DentistOwnCredential({space,ctx,t}:{space:Space;ctx:Context;
 t:(key:string)=>string}){
 const path="/v1/team/clinics/"+space.clinicId+"/staff/"+space.membershipId;
 const [detail,setDetail]=useState<any>(null),[error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let mounted=true;
  fetch(API+path,{credentials:"include",cache:"no-store"}).then(async r=>{
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.code||"STAFF_UNAVAILABLE");return data;
  }).then(x=>{if(mounted)setDetail(x)}).catch(e=>{if(mounted)setError(e.message)});
  return()=>{mounted=false};
 },[path,refresh]);
 const d=detail?.draft;
 const doctor: Dentist|undefined=d?{
  id:space.membershipId,display_name:d.displayName||ctx.name,
  specialty:d.specialty,qualifications:d.qualifications,
  professional_license:d.professionalLicense,draft_version:d.draftVersion,
  affiliation_status:"active",verification_status:d.verificationState||"unverified",
  currentlyVerified:false,valid_until:null
 }:undefined;
 return <Shell ctx={ctx} space={space} active="myVerification">
  <div className="phase12-workspace">
   <header className="phase12-header"><div><span className="phase12-kicker">
     DANDANLINK · {t("privatePreview")}</span>
    <h1>{t("adminDentists")}</h1><p>{t("confirmReview")}</p></div>
    <a className="btn btn-secondary" href={"/clinic/staff/"+space.membershipId+
     "?clinic="+encodeURIComponent(space.clinicId)}>{t("viewStaff")} ↗</a></header>
   {error?<ErrorPanel code={error} retry={()=>setRefresh(x=>x+1)}/>:
    !detail?<Busy/>:!doctor?<div className="card phase12-panel">
     <Banner kind="warning">{t("profileIncomplete")}</Banner>
     <a className="btn btn-primary" href={"/clinic/staff/"+space.membershipId+
      "?clinic="+encodeURIComponent(space.clinicId)}>{t("viewStaff")}</a>
    </div>:<section className="card phase12-panel">
     <SectionTitle title={t("credentialSubmission")} desc={t("clinicalSafety")}/>
     <div className="phase12-provider">
      <div className="phase12-provider-info"><strong>{doctor.display_name}</strong>
       <span>{doctor.specialty||"—"}</span>
       <span>{t("qualifications")}: {doctor.qualifications||"—"}</span>
       <span>{t("draftVersion")}: {doctor.draft_version}</span></div>
      <CredentialForm dentist={doctor} space={space}
       onSuccess={()=>setRefresh(x=>x+1)}/>
     </div>
     <Banner kind="info">{t("eligibility")} {t("publicPatient")}</Banner>
    </section>}
  </div>
 </Shell>;
}
