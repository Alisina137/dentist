import React,{useCallback,useEffect,useRef,useState} from "react";
import {Alert,BackHandler} from "react-native";
import {NativeAuthProvider,useNativeAuth,type NativeAccount} from "./native-auth";
import {WorkspaceRouter} from "./native-workspace-choice";
import {NativeClinicApp} from "./native-clinic";
import {nativeApiHeaders,nativeJsonResponse,nativeIsDandanlinkStatus} from "./api-transport";
import {NativeAppointmentDetails,NativeNextAppointment} from "./native-journeys";
import {patientError} from "./patient-errors";
import {patientTheme} from "./patient-theme";
import {PatientIcon,type PatientIconName} from "./patient-icons";
import {NativeReviews} from "./native-reviews";
import {NativeFamilyManager} from "./native-family";
import {NativeReleasedRecords} from "./native-records";
import {NativePatientSupport} from "./native-support";
import {NativePublishedReviews} from "./native-public-reviews";
import {NativeAccountArea,NativeAppointments,NativeBookingWizard,NativeSaved,type Favorite,type Booking} from "./native-patient";
import {
 AccessibilityInfo,ActivityIndicator,Animated,Image,Linking,Pressable,RefreshControl,ScrollView,
 StatusBar,StyleSheet,Text,TextInput,View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {SafeAreaProvider,SafeAreaView} from "react-native-safe-area-context";

/**
 * Mobile-first public patient experience. All clinic and provider data come
 * from PH13 approved/current public discovery; nothing is fabricated.
 * PH15 owns booking + clinical record release, PH16 will own native auth.
 */
declare const process:{readonly env:{
 readonly EXPO_PUBLIC_API_URL?:string;
 readonly EXPO_PUBLIC_PATIENT_WEB_URL?:string;
}};
type Language="fa-AF"|"ps-AF"|"en";
type Calendar="solar_hijri"|"gregorian";
type Tab="home"|"explore"|"appointments"|"saved"|"account";
type AccountSection="overview"|"profile"|"family"|"notifications"|"reviews"|"settings"|"records"|"security"|"support";
type Route={kind:"clinic";clinicId:string;fromBookingId?:string}|{kind:"dentist";clinicId:string;dentistId:string}|
 {kind:"appointment";bookingId:string}|
 {kind:"booking";clinicId:string;dentistId?:string;booking?:Booking;fromDentistId?:string;returnTab?:Tab};
type Remote<T>={loading:boolean;data:T|null;error:string|null;refresh:()=>void};
type Clinic={id:string;name:string;city:string;province:string;address:string;phone:string};
type Service={id:string;name:string;category:string;priceAfn:number;durationMinutes:number;version?:number};
type Dentist={id:string;displayName:string;specialty?:string|null;
 qualifications?:string|null;biography?:string|null;verified:true;validUntil?:string};
type Photo={id:string;url:string;caption:string};
type Slot={startAt:string;endAt:string;dentistId:string;serviceId:string;
 dentistName:string;serviceName:string;priceAfn:number;durationMinutes:number};
type Card={clinic:Clinic;description:string;specialties:string[];photo:Photo|null;
 dentists:{id:string;name:string;specialty?:string|null;verified:boolean}[];
 minFeeAfn:number;distanceKm:number|null;nextSlot:Slot|null;verifiedClinic:boolean};
type Results={items:Card[];pagination:{page:number;limit:number;total:number;
 totalExact:boolean;hasNext:boolean};resultsTruncated:boolean;reviewedOnly:true;
 publicBookingsEnabled:false};
type Facets={cities:{city:string;province:string;clinics:number}[];
 specialties:{name:string;clinics:number}[];services:{name:string;clinics:number}[];
 verifiedClinics:number;defaultCity:string};
type Hours={weekly:{weekday:number;isOpen:boolean;startMinute:number;endMinute:number}[];
 now:{weekday:number;isWithinPublishedHours:boolean;disclaimer:string}};
type ClinicDetail={clinic:Clinic;profile:{description:string;specialties:string[];
 latitude:number;longitude:number;contactNote:string|null;photos:Photo[];
 dentists:Dentist[];services:Service[];bookingRules:{horizonDays:number}};
 verifiedClinic:true;hours:Hours;publicBookingsEnabled:false};
type DentistDetail={clinic:Clinic;dentist:Dentist;services:Service[];specialties:string[];
 photo:Photo|null;hours:Hours;bookingRules:{horizonDays:number};
 publicBookingsEnabled:false};
type Preview={date:string;timezone:string;slots:Slot[];previewOnly:true;publicBookingsEnabled:false};

const API=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
const PATIENT_WEB=(process.env.EXPO_PUBLIC_PATIENT_WEB_URL||"").trim().replace(/\/+$/,"");
const PREF_KEY="dandanlink.patient.preferences.v1";
const SAVED_KEY="dandanlink.patient.savedPublicClinicIds.v1";
const colors={
 blue:patientTheme.colors.brand,blueDeep:patientTheme.colors.brandDark,
 navy:patientTheme.colors.ink,ink:patientTheme.colors.inkSecondary,muted:patientTheme.colors.muted,
 pale:patientTheme.colors.brandSoft,soft:patientTheme.colors.background,
 white:patientTheme.colors.surface,line:patientTheme.colors.stroke,
 green:patientTheme.colors.green,greenSoft:patientTheme.colors.greenSoft,
 amber:patientTheme.colors.amber,amberSoft:patientTheme.colors.amberSoft,
 gray:patientTheme.colors.inactive,red:patientTheme.colors.danger
};
const en={
 home:"Home",explore:"Explore",saved:"Saved",account:"Account",back:"Back",
 appointments:"Appointments",quickActions:"Quick actions",
 brand:"DandanLink",hello:"Your smile, your care",intro:"Verified dental clinics in Afghanistan",
 goodCare:"Find care you can trust",heroBody:"Compare verified professionals, published fees and real clinic schedules.",
 find:"Find a dentist, clinic or treatment",findLabel:"Search clinics and dentists",
 search:"Search",city:"City",allCities:"All cities",kabul:"Kabul",
 featured:"Verified clinics",featuredSub:"Reviewed providers with current public details",
 viewAll:"View all",near:"Explore by city",specialties:"Treatments & specialties",
 nearCity:"Clinics in your city",trust:"Verified information, not paid rankings",
 trustBody:"Every listed dentist is reviewed and currently affiliated with an approved clinic. No fabricated reviews or ratings.",
 listings:"Verified clinics",results:"results",filter:"Filters",clear:"Clear",
 apply:"Apply filters",service:"Service",sort:"Sort",sortRelevant:"Relevant",
 sortName:"Name",sortSoon:"Soonest available",allServices:"All services",
 allSpecialties:"All specialties",noResults:"No matching verified clinics",
 noResultsSub:"Try a different city, treatment or search phrase.",
 emptyDirectory:"No verified clinics are published for this city yet.",
 verify:"Verified",preview:"Schedule preview",notBooked:"Select Book appointment to request this time",
 call:"Call clinic",website:"Website",directions:"Directions",details:"View profile",
 priceFrom:"From",afn:"AFN",dentists:"Dentists",treatments:"Treatments",times:"Availability",
 gallery:"Gallery",hours:"Opening hours",about:"About",overview:"Overview",
 services:"Services",profile:"Clinic profile",provider:"Dentist profile",
 credentials:"Verified professional information",qualification:"Qualification",
 specialty:"Specialty",affiliation:"Verified clinic affiliation",
 description:"Description",address:"Address",contact:"Contact",phone:"Phone",
 photosEmpty:"No reviewed clinic photos have been published yet.",
 photoDesc:"Only photographs approved for the public clinic listing are shown.",
 noBio:"Biography not published.",notListed:"Not published",
 licensed:"Credentials independently reviewed",noFake:"Ratings and awards are not displayed without verifiable evidence.",
 date:"Date",selectDate:"Choose a day",chooseService:"Choose treatment",
 allDentists:"All dentists",timePreview:"Real candidate time slots",
 timePreviewBody:"Live schedule previews. Select Book appointment to confirm the current time with the clinic.",
 noSlots:"No candidate times available on this date.",slots:"available previews",
 pickDate:"Select a future date",minutes:"min",closed:"Closed",
 openScheduled:"Within published hours",closedScheduled:"Outside published hours",
 today:"Today",timezone:"All dates and times use Afghanistan time.",
 contactClinic:"Contact the clinic directly",contactHelp:"Phone numbers are those approved for this public listing.",
 save:"Save",remove:"Remove",savedClinics:"Saved clinics",savedIntro:"Your saved public clinic shortcuts are stored on this device only.",
 emptySaved:"Nothing saved yet",emptySavedSub:"Use the heart on a verified clinic to keep it here.",
 noLongerPublished:"Some previously saved clinics are no longer published and are not shown.",
 discover:"Discover clinics",notices:"Important",
 later:"Book and manage appointments in the Appointments tab. Clinic records require explicit, verified release.",
 accountTitle:"Patient account & preferences",guest:"Browsing as a guest",
 guestSub:"Public clinic discovery is available without signing in.",
 secureAccount:"Open secure patient account",secureHelp:"Sign in here to manage bookings, family permissions and profile settings.",
 webMissing:"Set EXPO_PUBLIC_PATIENT_WEB_URL to enable the secure patient account link on this device.",
 prefs:"App preferences",language:"Language",calendar:"Calendar",
 solar:"Solar Hijri",gregorian:"Gregorian",network:"Connection",
 connected:"Connected to verified clinic directory",checking:"Checking connection…",notConfigured:"API not configured",
 offline:"Cannot reach the server",retry:"Retry",offlineHelp:"Please check your internet connection, then try again. If the problem continues, contact support.",
 refreshing:"Refreshing…",refresh:"Refresh",loading:"Loading verified clinics…",
 noMock:"The app never generates dentists, ratings, appointment bookings or fees.",
 info:"About DandanLink",howWorks:"How trust works",stepOne:"Only reviewed clinics are listed.",
 stepTwo:"Dentist credentials and affiliation must be current.",
 stepThree:"Price and hours are displayed from approved clinic records.",
 pending:"A booking is only confirmed after submission or clinic approval.",
 support:"Support",yourCity:"Your selected city",changeCity:"Change city",
 tryAgain:"Try again",unavailable:"This verified profile is currently unavailable.",
 unavailableMore:"The clinic may have removed its listing or verification may have expired.",
 limited:"Refine your search to see more verified results.",
 medical:"Medical information remains private to the clinic.",
 count:"verified listings",loc:"Location",addToSaved:"Save clinic",removeFromSaved:"Remove saved clinic",
 next:"Next",previous:"Previous",page:"Page",
 close:"Close",introTag:"CARE WITH CONFIDENCE",greeting:"Dental care made simple",
 seeTreatments:"See treatments",openSettings:"App settings",
 updated:"Up-to-date public listing",travel:"Location and directions",
 free:"Free for patients",locationHint:"All results are from Afghanistan; city names reflect published clinic listings."
};
const fa:Record<keyof typeof en,string>={
 home:"خانه",explore:"جستجو",saved:"ذخیره‌ها",account:"حساب",back:"بازگشت",
 appointments:"نوبت‌ها",quickActions:"دسترسی سریع",
 brand:"دندان‌لینک",hello:"لبخند شما، مراقبت شما",intro:"کلینیک‌های دندان تأییدشده در افغانستان",
 goodCare:"خدمات دندان مطمئن پیدا کنید",heroBody:"داکتران تأییدشده، قیمت‌های نشرشده و تقسیم اوقات واقعی کلینیک را مقایسه کنید.",
 find:"داکتر، کلینیک یا تداوی را جستجو کنید",findLabel:"جستجوی کلینیک و داکتر",
 search:"جستجو",city:"شهر",allCities:"تمام شهرها",kabul:"کابل",
 featured:"کلینیک‌های تأییدشده",featuredSub:"کلینیک‌های بررسی‌شده با معلومات معتبر",
 viewAll:"مشاهده همه",near:"جستجو بر اساس شهر",specialties:"تداوی‌ها و تخصص‌ها",
 nearCity:"کلینیک‌های شهر شما",trust:"معلومات معتبر، نه رتبه‌بندی پولی",
 trustBody:"هر داکتر قابل مشاهده بررسی شده و در یک کلینیک تأییدشده کار می‌کند. نظر یا امتیاز ساختگی نداریم.",
 listings:"کلینیک‌های تأییدشده",results:"نتیجه",filter:"فیلترها",clear:"پاک‌کردن",
 apply:"اعمال فیلتر",service:"خدمت",sort:"ترتیب",sortRelevant:"مرتبط",
 sortName:"نام",sortSoon:"نزدیک‌ترین وقت",allServices:"تمام خدمات",
 allSpecialties:"تمام تخصص‌ها",noResults:"کلینیک مطابق جستجو پیدا نشد",
 noResultsSub:"شهر، تداوی یا متن جستجو را تغییر دهید.",
 emptyDirectory:"فعلاً کلینیک تأییدشده در این شهر نشر نشده است.",
 verify:"تأییدشده",preview:"نمایش تقسیم اوقات",notBooked:"برای ثبت این وقت گزینه رزرو نوبت را انتخاب کنید",
 call:"تماس با کلینیک",website:"وبسایت",directions:"مسیر",details:"مشاهده پروفایل",
 priceFrom:"شروع از",afn:"افغانی",dentists:"داکتران",treatments:"تداوی‌ها",
 times:"وقت‌های آزاد",gallery:"گالری",hours:"اوقات کاری",about:"درباره",
 overview:"نمای کلی",services:"خدمات",profile:"پروفایل کلینیک",provider:"پروفایل داکتر",
 credentials:"معلومات تأییدشده داکتر",qualification:"تحصیلات",
 specialty:"تخصص",affiliation:"ارتباط تأییدشده با کلینیک",
 description:"توضیحات",address:"آدرس",contact:"تماس",phone:"شماره تماس",
 photosEmpty:"هنوز عکس بررسی‌شده از کلینیک نشر نشده است.",
 photoDesc:"فقط عکس‌هایی نمایش داده می‌شوند که برای نشر عمومی تأیید شده باشند.",
 noBio:"زندگی‌نامه نشر نشده است.",notListed:"نشر نشده",
 licensed:"اسناد حرفه‌ای مستقلاً بررسی شده‌اند",
 noFake:"امتیاز و جوایز بدون سند معتبر نمایش داده نمی‌شوند.",
 date:"تاریخ",selectDate:"یک روز انتخاب کنید",chooseService:"تداوی را انتخاب کنید",
 allDentists:"همه داکتران",timePreview:"وقت‌های احتمالی واقعی",
 timePreviewBody:"وقت‌های واقعی کلینیک را ببینید و برای ثبت درخواست روی رزرو نوبت بزنید.",
 noSlots:"در این تاریخ وقت احتمالی موجود نیست.",slots:"وقت پیشنهادی",
 pickDate:"یک روز آینده انتخاب کنید",minutes:"دقیقه",closed:"بسته",
 openScheduled:"در ساعت کاری نشرشده",closedScheduled:"خارج از ساعت کاری نشرشده",
 today:"امروز",timezone:"تمام تاریخ‌ها و ساعت‌ها به وقت افغانستان است.",
 contactClinic:"مستقیم با کلینیک تماس بگیرید",
 contactHelp:"شماره تماس از معلومات نشرشده کلینیک است.",
 save:"ذخیره",remove:"حذف",savedClinics:"کلینیک‌های ذخیره‌شده",
 savedIntro:"میانبرهای کلینیک‌های عمومی تنها در این دستگاه ذخیره می‌شوند.",
 emptySaved:"هنوز چیزی ذخیره نشده",emptySavedSub:"برای ذخیره کلینیک از علامت قلب استفاده کنید.",
 noLongerPublished:"برخی کلینیک‌های ذخیره‌شده دیگر نشر نیستند و نمایش داده نمی‌شوند.",
 discover:"جستجوی کلینیک‌ها",notices:"مهم",
 later:"نوبت‌های خود را در بخش نوبت‌ها مدیریت کنید. اسناد صحی تنها با اجازه رسمی کلینیک قابل دسترس‌اند.",
 accountTitle:"حساب مریض و تنظیمات",guest:"به‌صورت مهمان هستید",
 guestSub:"برای جستجوی کلینیک به ورود ضرورت نیست.",
 secureAccount:"بازکردن حساب مصون مریض",
 secureHelp:"در همین برنامه وارد شوید و نوبت‌ها، پروفایل و اجازه خانواده را مدیریت کنید.",
 webMissing:"برای لینک حساب مصون، EXPO_PUBLIC_PATIENT_WEB_URL را تنظیم کنید.",
 prefs:"تنظیمات برنامه",language:"زبان",calendar:"تقویم",
 solar:"هجری شمسی",gregorian:"میلادی",network:"ارتباط",
 connected:"اتصال با فهرست کلینیک‌های تأییدشده برقرار است",checking:"در حال بررسی ارتباط…",
 notConfigured:"سرور تنظیم نشده",offline:"ارتباط با سرور برقرار نشد",
 retry:"دوباره کوشش",offlineHelp:"اتصال اینترنت را بررسی کنید و دوباره کوشش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.",
 refreshing:"در حال تازه‌سازی…",refresh:"تازه‌سازی",loading:"کلینیک‌های تأییدشده دریافت می‌شود…",
 noMock:"این برنامه داکتر، امتیاز، نوبت یا قیمت ساختگی نمی‌سازد.",
 info:"درباره دندان‌لینک",howWorks:"چگونه اعتبار سنجی می‌شود",
 stepOne:"فقط کلینیک‌های بررسی‌شده نمایش داده می‌شوند.",
 stepTwo:"اسناد حرفه‌ای و ارتباط داکتر باید معتبر باشند.",
 stepThree:"قیمت‌ها و ساعت‌ها از معلومات تأییدشده کلینیک می‌آیند.",
 pending:"نوبت پس از ثبت درخواست یا تأیید کلینیک قطعی می‌شود.",
 support:"کمک",yourCity:"شهر انتخاب‌شده شما",changeCity:"تغییر شهر",
 tryAgain:"دوباره کوشش",unavailable:"پروفایل تأییدشده فعلاً در دسترس نیست.",
 unavailableMore:"ممکن است نشر کلینیک قطع شده یا تایید آن منقضی شده باشد.",
 limited:"برای دیدن نتایج بیشتر جستجو را محدودتر کنید.",
 medical:"معلومات صحی تنها نزد کلینیک محفوظ است.",
 count:"کلینیک تأییدشده",loc:"موقعیت",addToSaved:"ذخیره کلینیک",
 removeFromSaved:"حذف کلینیک ذخیره‌شده",next:"بعدی",previous:"قبلی",
 page:"صفحه",close:"بستن",introTag:"مراقبت با اطمینان",
 greeting:"مراقبت دندان به شیوه ساده",seeTreatments:"دیدن تداوی‌ها",
 openSettings:"تنظیمات برنامه",updated:"معلومات عمومی معتبر",
 travel:"موقعیت و مسیر",free:"رایگان برای مریضان",
 locationHint:"تمام نتیجه‌ها از افغانستان‌اند؛ شهرها مطابق معلومات کلینیک‌ها نمایش داده می‌شوند."
};
const ps:Record<keyof typeof en,string>={
 home:"کور",explore:"لټون",saved:"ساتل شوي",account:"حساب",back:"ستنېدل",
 appointments:"ملاقاتونه",quickActions:"چټک لاسرسی",
 brand:"دندان‌لینک",hello:"ستاسو موسکا، ستاسو پاملرنه",intro:"په افغانستان کې تایید شوي د غاښونو کلینیکونه",
 goodCare:"باوري د غاښونو خدمتونه ومومئ",
 heroBody:"تایید شوي ډاکټران، خپرې شوې بیې او د کلینیک رښتینې مهال‌وېش پرتله کړئ.",
 find:"ډاکټر، کلینیک یا درملنه ولټوئ",findLabel:"د کلینیک او ډاکټر لټون",
 search:"لټون",city:"ښار",allCities:"ټول ښارونه",kabul:"کابل",
 featured:"تایید شوي کلینیکونه",featuredSub:"د اوسنیو معلوماتو لرونکي کلینیکونه",
 viewAll:"ټول وګورئ",near:"د ښار له مخې لټون",specialties:"درملنې او تخصصونه",
 nearCity:"ستاسو د ښار کلینیکونه",trust:"باوري معلومات، نه پیسو رتبه",
 trustBody:"هر څرګند ډاکټر تایید شوی او په منظور شوي کلینیک کې کار کوي. جعلي نظرونه او نمرې نشته.",
 listings:"تایید شوي کلینیکونه",results:"پایلې",filter:"فلټرونه",clear:"پاکول",
 apply:"فلټرونه پلي کول",service:"خدمت",sort:"ترتیب",sortRelevant:"اړوند",
 sortName:"نوم",sortSoon:"تر ټولو نږدې وخت",
 allServices:"ټول خدمتونه",allSpecialties:"ټول تخصصونه",
 noResults:"مطابق کلینیک ونه موندل شو",noResultsSub:"ښار، درملنه یا د لټون متن بدل کړئ.",
 emptyDirectory:"په دې ښار کې تایید شوي کلینیکونه لا نه دي خپاره شوي.",
 verify:"تایید شوی",preview:"د وختونو کتنه",notBooked:"د ملاقات ثبتولو لپاره د وخت اخیستل وټاکئ",
 call:"کلینیک ته زنګ",website:"وېبپاڼه",directions:"لارښوونې",details:"پېژندلیک وګورئ",
 priceFrom:"له",afn:"افغانۍ",dentists:"ډاکټران",treatments:"درملنې",
 times:"خالي وختونه",gallery:"انځورونه",hours:"کاري ساعتونه",about:"په اړه",
 overview:"لنډیز",services:"خدمتونه",profile:"د کلینیک پېژندلیک",provider:"د ډاکټر پېژندلیک",
 credentials:"د ډاکټر تایید شوي معلومات",qualification:"زده کړې",specialty:"تخصص",
 affiliation:"له کلینیک سره تایید شوې اړیکه",description:"تشریح",
 address:"پته",contact:"اړیکه",phone:"تلیفون",
 photosEmpty:"د کلینیک تایید شوي انځورونه لا نه دي خپاره شوي.",
 photoDesc:"یوازې د عامه خپرېدو لپاره تایید شوي انځورونه ښودل کېږي.",
 noBio:"ژوندلیک نه دی خپور شوی.",notListed:"نه دی خپور شوی",
 licensed:"مسلکي اسناد په خپلواک ډول کتل شوي",
 noFake:"بې له معتبر سنده نمرې او انعامونه نه ښودل کېږي.",
 date:"نېټه",selectDate:"ورځ وټاکئ",chooseService:"درملنه وټاکئ",
 allDentists:"ټول ډاکټران",timePreview:"د ممکنه وختونو کتنه",
 timePreviewBody:"د کلینیک رښتیني وختونه وګورئ او د ملاقات غوښتنه ثبت کړئ.",
 noSlots:"په دې نېټه ممکن وخت نشته.",slots:"ممکن وختونه",
 pickDate:"راتلونکې ورځ وټاکئ",minutes:"دقیقې",closed:"تړلی",
 openScheduled:"په خپرو شوو کاري ساعتونو کې",
 closedScheduled:"له کاري ساعتونو بهر",today:"نن",
 timezone:"ټولې نېټې او ساعتونه د افغانستان پر وخت دي.",
 contactClinic:"مستقیم له کلینیک سره اړیکه ونیسئ",
 contactHelp:"د تلیفون شمېره د کلینیک خپاره شوي معلومات دي.",
 save:"ساتل",remove:"لرې کول",savedClinics:"ساتل شوي کلینیکونه",
 savedIntro:"د عامه کلینیکونو لنډې لارې یوازې په دې وسیله ساتل کېږي.",
 emptySaved:"تر اوسه څه نه دي ساتل شوي",
 emptySavedSub:"د تایید شوي کلینیک د ساتلو لپاره پر زړه ټک وکړئ.",
 noLongerPublished:"ځینې مخکې ساتل شوي کلینیکونه نور نه خپرېږي او نه ښکاري.",
 discover:"کلینیکونه ولټوئ",notices:"مهم",
 later:"ملاقاتونه په اپ کې سمبال کړئ. طبي اسناد یوازې د کلینیک له ښکاره اجازې سره ښکاري.",
 accountTitle:"د ناروغ حساب او غوره توبونه",guest:"د مېلمه په توګه ګورئ",
 guestSub:"د کلینیکونو د لټون لپاره ننوتل نه دي پکار.",
 secureAccount:"د ناروغ خوندي حساب پرانیزئ",
 secureHelp:"دلته ننوځئ او ملاقاتونه، کورنۍ او د حساب تنظیمات سمبال کړئ.",
 webMissing:"د خوندي حساب لینک لپاره EXPO_PUBLIC_PATIENT_WEB_URL وټاکئ.",
 prefs:"د اپ غوره توبونه",language:"ژبه",calendar:"کلیز",
 solar:"هجري لمریز",gregorian:"میلادي",network:"اړیکه",
 connected:"د تایید شوو کلینیکونو سره اړیکه شته",checking:"اړیکه کتل کېږي…",
 notConfigured:"API نه دی برابر شوی",offline:"له سرور سره اړیکه نشته",
 retry:"بیا هڅه",offlineHelp:"خپل انټرنېټ وګورئ او بیا هڅه وکړئ. که ستونزه دوام وکړي، له ملاتړ سره اړیکه ونیسئ.",
 refreshing:"تازه کېږي…",refresh:"تازه کول",loading:"تایید شوي کلینیکونه ترلاسه کېږي…",
 noMock:"اپ جعلي ډاکټران، نمرې، نوبتونه یا بیې نه جوړوي.",
 info:"د دندان‌لینک په اړه",howWorks:"باور څنګه تاییدېږي",
 stepOne:"یوازې کتل شوي کلینیکونه ښودل کېږي.",
 stepTwo:"د ډاکټر اسناد او تړاو باید اوس هم معتبر وي.",
 stepThree:"بیې او کاري ساعتونه له تایید شوو کلینیکونو اخیستل کېږي.",
 pending:"ملاقات له ثبت یا د کلینیک له تایید وروسته قطعي کېږي.",
 support:"مرسته",yourCity:"ستاسو غوره شوی ښار",changeCity:"ښار بدلول",
 tryAgain:"بیا هڅه",unavailable:"دا تایید شوی پروفایل اوس نه ښکاري.",
 unavailableMore:"ښايي کلینیک خپرونه بنده کړې وي یا تایید یې پای ته رسېدلی وي.",
 limited:"د ډېرو تایید شوو پایلو لپاره خپل لټون محدود کړئ.",
 medical:"طبي معلومات یوازې له کلینیک سره خوندي دي.",
 count:"تایید شوي کلینیکونه",loc:"ځای",addToSaved:"کلینیک وساتئ",
 removeFromSaved:"ساتل شوی کلینیک لرې کړئ",next:"بل",previous:"مخکینی",
 page:"پاڼه",close:"بندول",introTag:"له باور سره پاملرنه",
 greeting:"د غاښونو پاملرنه په ساده ډول",seeTreatments:"درملنې وګورئ",
 openSettings:"د اپ تنظیمات",updated:"اوسني عامه معلومات",
 travel:"ځای او لار",free:"د ناروغانو لپاره وړیا",
 locationHint:"ټولې پایلې له افغانستانه دي؛ ښارونه د کلینیک د خپرو شوو معلوماتو له مخې ښودل کېږي."
};
const words:Record<Language,Record<keyof typeof en,string>>={"en":en,"fa-AF":fa,"ps-AF":ps};
const keyCity:Record<string,Record<Language,string>>={
 "Kabul":{"fa-AF":"کابل","ps-AF":"کابل","en":"Kabul"},
 "Herat":{"fa-AF":"هرات","ps-AF":"هرات","en":"Herat"},
 "Kandahar":{"fa-AF":"کندهار","ps-AF":"کندهار","en":"Kandahar"},
 "Jalalabad":{"fa-AF":"جلال‌آباد","ps-AF":"جلال اباد","en":"Jalalabad"},
 "Mazar-i-Sharif":{"fa-AF":"مزار شریف","ps-AF":"مزار شریف","en":"Mazar-i-Sharif"}
};
const isLang=(x:unknown):x is Language=>x==="fa-AF"||x==="ps-AF"||x==="en";
const isCal=(x:unknown):x is Calendar=>x==="solar_hijri"||x==="gregorian";
const isId=(x:unknown):x is string=>typeof x==="string"&&/^[a-zA-Z0-9_-]{3,100}$/.test(x);
const dirOf=(locale:Language)=>locale!=="en";
function cityLabel(city:string,lang:Language){return keyCity[city]?.[lang]||city}
function dayIso(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const value=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return value.year+"-"+value.month+"-"+value.day;
}
function plusDay(day:string,delta:number){
 const value=new Date(day+"T12:00:00Z");
 value.setUTCDate(value.getUTCDate()+delta);
 return value.toISOString().slice(0,10);
}
function displayDate(value:string,locale:Language,calendar:Calendar,withTime=false){
 const parsed=new Date(value.length===10?value+"T12:00:00Z":value);
 if(!Number.isFinite(parsed.getTime()))return value;
 return new Intl.DateTimeFormat(locale,{timeZone:"Asia/Kabul",
 calendar:calendar==="solar_hijri"?"persian":"gregory",
 ...(withTime?{hour:"numeric",minute:"2-digit"}:{month:"short",day:"numeric",weekday:"short"})
 }).format(parsed);
}
function money(amount:number,locale:Language){
 return new Intl.NumberFormat(locale,{maximumFractionDigits:0}).format(amount)+" AFN";
}
async function fetchPublic<T>(path:string,signal?:AbortSignal):Promise<T>{
 if(!API)throw new Error("API_NOT_CONFIGURED");
 const response=await fetch(API+"/v1/discovery"+path,{signal,
  headers:nativeApiHeaders(API)});
 if(response.status===404)throw new Error("PROFILE_UNAVAILABLE");
 return nativeJsonResponse<T>(response);
}
function usePublic<T>(path:string|null):Remote<T>{
 // Bind every public result to its current filters and location; a stale clinic
 // list must not appear for one frame when a user changes a search facet.
 const [state,setState]=useState<{path:string|null;loading:boolean;data:T|null;error:string|null}>({
  path:null,loading:!!path,data:null,error:null
 });
 const [reload,setReload]=useState(0);
 useEffect(()=>{
  if(path===null){setState({path:null,loading:false,data:null,error:null});return}
  let active=true;const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  setState({path,loading:true,data:null,error:null});
  void fetchPublic<T>(path,controller.signal).then(data=>{
   if(active)setState({path,loading:false,data,error:null});
  }).catch(e=>{
   if(active)setState({path,loading:false,data:null,
    error:e instanceof Error?e.message:"SERVICE_UNAVAILABLE"});
  }).finally(()=>clearTimeout(timer));
  return ()=>{active=false;clearTimeout(timer);controller.abort()};
 },[path,reload]);
 return {
  data:state.path===path?state.data:null,
  error:state.path===path?state.error:null,
  loading:state.path===path?state.loading:!!path,
  refresh:()=>setReload(x=>x+1)
 };
}
function urlSearch(fields:Record<string,string|number|undefined>){
 const params=new URLSearchParams();
 Object.entries(fields).forEach(([key,val])=>{
 if(val!==undefined&&val!==""&&val!==null)params.set(key,String(val));
 });
 return "/search?"+params.toString();
}
type UI={locale:Language;calendar:Calendar;t:(k:keyof typeof en)=>string;
 rtl:boolean;flow:"row"|"row-reverse";align:"right"|"left"};
function useUI(locale:Language,calendar:Calendar):UI{
 const rtl=dirOf(locale);
 return {locale,calendar,t:(key)=>words[locale][key]||en[key],rtl,
 flow:rtl?"row-reverse":"row",align:rtl?"right":"left"};
}
function TextLine({children,ui,style}:{children:React.ReactNode;ui:UI;style?:object}){
 return <Text style={[s.body,{textAlign:ui.align},style]}>{children}</Text>;
}
function Icon({glyph,filled=false}:{glyph:string;filled?:boolean}){
 const icon:PatientIconName=glyph==="⌕"?"search":glyph==="▦"?"calendar":
  glyph==="☺"?"user":glyph==="!"?"help":"shield";
 return <View style={[s.iconSquare,filled&&s.iconSquareBlue]}>
  <PatientIcon name={icon} size={25} color={filled?colors.white:colors.blue}/>
 </View>;
}
function CardShell({children,style}:{children:React.ReactNode;style?:object}){
 return <View style={[s.card,style]}>{children}</View>;
}
function CTA({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled}
 onPress={onPress} style={({pressed})=>[s.cta,secondary&&s.ctaLight,
  disabled&&s.disabled,pressed&&!disabled&&s.ctaPressed]}>
  <Text style={[s.ctaText,secondary&&s.ctaTextLight]}>{label}</Text>
 </Pressable>;
}
function Tag({label,positive=false}:{label:string;positive?:boolean}){
 return <View style={[s.tag,positive&&s.tagGreen]}>
  <Text style={[s.tagText,positive&&s.tagTextGreen]} numberOfLines={1}>
  {positive?"✓  ":""}{label}</Text>
 </View>;
}
function SectionHead({ui,title,sub,action}:{ui:UI;title:string;sub?:string;action?:React.ReactNode}){
 return <View style={[s.sectionTitleRow,{flexDirection:ui.flow}]}>
  <View style={{flex:1}}><Text style={[s.sectionTitle,{textAlign:ui.align}]}>{title}</Text>
   {sub&&<TextLine ui={ui} style={s.sectionSubtitle}>{sub}</TextLine>}</View>{action}
 </View>;
}
function LoadingCards({ui}:{ui:UI}){
 const fade=useRef(new Animated.Value(1)).current;
 useEffect(()=>{
  let active=true,loop:Animated.CompositeAnimation|null=null;
  // Respect accessibility settings and clean up the native-driver loop.
  void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{
   if(!active||reduced)return;
   loop=Animated.loop(Animated.sequence([
    Animated.timing(fade,{toValue:.65,duration:850,useNativeDriver:true}),
    Animated.timing(fade,{toValue:1,duration:850,useNativeDriver:true})
   ]));loop.start();
  }).catch(()=>{});
  return ()=>{active=false;loop?.stop()};
 },[fade]);
 return <View style={s.cardList}>
  <View accessibilityRole="progressbar" accessibilityLabel={ui.t("loading")}
   style={{alignItems:"center",paddingVertical:9}}>
   <ActivityIndicator color={colors.blue}/><Text style={s.helpText}>{ui.t("loading")}</Text>
  </View>
  <Animated.View style={{opacity:fade,gap:13}} importantForAccessibility="no-hide-descendants">
   {[0,1,2].map(i=><View key={i} style={s.skeletonCard}>
    <View style={[s.row,{flexDirection:ui.flow,gap:12}]}>
     <View style={s.skeletonImage}/><View style={{flex:1,gap:12}}>
      <View style={[s.skeletonLine,{width:"80%"}]}/>
      <View style={[s.skeletonLine,{width:"52%"}]}/>
      <View style={[s.skeletonLine,{width:"66%"}]}/></View></View>
    <View style={[s.skeletonLine,{width:"100%",height:38,marginTop:18}]}/>
   </View>)}
  </Animated.View>
 </View>;
}
function Failure({ui,error,retry}:{ui:UI;error:string|null;retry:()=>void}){
 return <CardShell style={s.blank}>
  <Icon glyph="!"/><Text style={s.emptyTitle}>{ui.t(error==="PROFILE_UNAVAILABLE"?"unavailable":error==="API_NOT_CONFIGURED"?"notConfigured":"offline")}</Text>
  <Text style={s.emptyCopy}>{ui.t(error==="PROFILE_UNAVAILABLE"?"unavailableMore":"offlineHelp")}</Text>
  <CTA label={ui.t("retry")} onPress={retry} secondary/>
 </CardShell>;
}
function Empty({ui,heading,detail,action}:{ui:UI;heading:string;detail:string;action?:React.ReactNode}){
 return <CardShell style={s.blank}><Icon glyph="⌕"/>
  <Text style={s.emptyTitle}>{heading}</Text>
  <Text style={s.emptyCopy}>{detail}</Text>{action}</CardShell>;
}
function PublishedPhoto({photo,label,large=false}:{photo:Photo|null|undefined;label:string;large?:boolean}){
 const [bad,setBad]=useState(false);
 useEffect(()=>setBad(false),[photo?.id]);
 if(!photo||bad)return <View style={[s.photoFallback,large&&s.photoFallbackLarge]}>
  <PatientIcon name="clinic" size={large?51:34} color="#86A8D8"/>
  <Text style={s.photoFallbackLabel}>DANDANLINK</Text></View>;
 const url=photo.url.startsWith("/")?API+photo.url:photo.url;
 return <Image source={{uri:url}} resizeMode="cover" fadeDuration={160}
  progressiveRenderingEnabled onError={()=>setBad(true)}
  accessibilityLabel={photo.caption||label} style={[s.photo,large&&s.photoLarge]}/>;
}
function SavedButton({saved,onPress,ui}:{saved:boolean;onPress:()=>void;ui:UI}){
 return <Pressable style={[s.heart,saved&&s.heartSelected]}
  accessibilityRole="button" accessibilityState={{selected:saved}}
  accessibilityLabel={ui.t(saved?"removeFromSaved":"addToSaved")} onPress={onPress}>
  <PatientIcon name="bookmark" size={21} color={saved?colors.blue:colors.muted} filled={saved}/>
 </Pressable>;
}
function ClinicCard({card,ui,saved,onSave,onOpen}:{card:Card;ui:UI;saved:boolean;
 onSave:(id:string)=>void;onOpen:(id:string)=>void}){
 const c=card.clinic;
 return <CardShell style={s.clinicCard}>
  <View style={[s.row,{flexDirection:ui.flow,alignItems:"flex-start",gap:12}]}>
   <Pressable style={s.cardPicture} onPress={()=>onOpen(c.id)} accessibilityRole="button"
    accessibilityLabel={ui.t("details")+" "+c.name}>
    <PublishedPhoto photo={card.photo} label={c.name}/></Pressable>
   <View style={{flex:1,minWidth:0,gap:5}}>
    <Text style={[s.clinicName,{textAlign:ui.align}]} numberOfLines={2}>{c.name}</Text>
    <Text style={[s.clinicSub,{textAlign:ui.align}]} numberOfLines={1}>⌖ {cityLabel(c.city,ui.locale)} · {c.province}</Text>
    <View style={[s.row,{flexDirection:ui.flow,flexWrap:"wrap",gap:6}]}>
     <Tag positive label={ui.t("verify")}/>
    </View>
   </View>
   <SavedButton ui={ui} saved={saved} onPress={()=>onSave(c.id)}/>
  </View>
  {card.specialties.length>0&&<View style={[s.row,{flexDirection:ui.flow,gap:6,flexWrap:"wrap",marginTop:12}]}>
   {card.specialties.slice(0,2).map(x=><Tag key={x} label={x}/>)}</View>}
  <View style={[s.cardMeta,{flexDirection:ui.flow}]}>
   <View style={{flex:1}}><Text style={[s.metaLabel,{textAlign:ui.align}]}>{ui.t("priceFrom")}</Text>
    <Text style={[s.metaValue,{textAlign:ui.align}]}>{money(card.minFeeAfn,ui.locale)}</Text></View>
   <View style={{flex:1}}><Text style={[s.metaLabel,{textAlign:ui.align}]}>{ui.t("timePreview")}</Text>
    <Text style={[s.metaValue,s.metaTime,{textAlign:ui.align}]} numberOfLines={1}>
     {card.nextSlot?displayDate(card.nextSlot.startAt,ui.locale,ui.calendar,true):ui.t("notListed")}</Text></View>
  </View>
  <View style={[s.row,{flexDirection:ui.flow,gap:10}]}>
   <Pressable style={[s.cardButton,s.cardButtonPrimary]} onPress={()=>onOpen(c.id)}
    accessibilityRole="button"><Text style={s.cardButtonPrimaryText}>{ui.t("details")}  ›</Text></Pressable>
   <Pressable style={s.cardButton} onPress={()=>{void Linking.openURL("tel:"+c.phone)}}
    accessibilityRole="button" accessibilityLabel={ui.t("call")}>
    <View style={s.iconButtonRow}><PatientIcon name="phone" size={18} color={colors.blue}/>
     <Text style={s.cardButtonText}>{ui.t("call")}</Text></View></Pressable>
  </View>
 </CardShell>;
}
function DateRibbon({ui,day,onChange,horizon=14}:{ui:UI;day:string;
 onChange:(day:string)=>void;horizon?:number}){
 const days=Array.from({length:Math.min(7,Math.max(1,horizon))},(_,i)=>plusDay(dayIso(),i));
 return <ScrollView horizontal showsHorizontalScrollIndicator={false}
  contentContainerStyle={[s.ribbon,{flexDirection:ui.flow}]}>
  {days.map((d,i)=>{
   const when=new Date(d+"T12:00:00Z");
   const weekday=new Intl.DateTimeFormat(ui.locale,{weekday:"short",timeZone:"Asia/Kabul"}).format(when);
   const month=new Intl.DateTimeFormat(ui.locale,{month:"short",timeZone:"Asia/Kabul",
    calendar:ui.calendar==="solar_hijri"?"persian":"gregory"}).format(when);
   const number=new Intl.DateTimeFormat(ui.locale,{day:"numeric",timeZone:"Asia/Kabul",
    calendar:ui.calendar==="solar_hijri"?"persian":"gregory"}).format(when);
   return <Pressable key={d} accessibilityRole="button"
    accessibilityState={{selected:day===d}} onPress={()=>onChange(d)}
    style={[s.dayChip,day===d&&s.dayChipSelected]}>
     <Text style={[s.dayWeek,day===d&&s.daySelectedText]}>{i===0?ui.t("today"):weekday}</Text>
     <Text style={[s.dayNumber,day===d&&s.daySelectedText]}>{number}</Text>
     <Text style={[s.dayMonth,day===d&&s.daySelectedText]}>{month}</Text>
    </Pressable>
  })}</ScrollView>;
}
function Availability({ui,clinicId,services,dentists,horizon,doctorId}:{ui:UI;clinicId:string;
 services:Service[];dentists:Dentist[];horizon:number;doctorId?:string}){
 const [day,setDay]=useState(dayIso()),[serviceId,setServiceId]=useState(""),
 [dentistId,setDentistId]=useState(doctorId||"");
 const params=new URLSearchParams({date:day});
 if(serviceId)params.set("serviceId",serviceId);
 if(dentistId)params.set("dentistId",dentistId);
 const result=usePublic<Preview>("/clinics/"+encodeURIComponent(clinicId)+"/availability?"+params.toString());
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("timePreview")} sub={ui.t("timePreviewBody")}/>
  <CardShell>
   <TextLine ui={ui} style={s.fieldLabel}>{ui.t("selectDate")}</TextLine>
   <DateRibbon ui={ui} day={day} onChange={setDay} horizon={horizon}/>
   {services.length>1&&<><TextLine ui={ui} style={[s.fieldLabel,{marginTop:14}]}>{ui.t("chooseService")}</TextLine>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
     contentContainerStyle={{gap:8,paddingVertical:5}}>
     <Pressable onPress={()=>setServiceId("")} style={[s.chip,serviceId===""&&s.chipActive]}>
      <Text style={[s.chipText,serviceId===""&&s.chipActiveText]}>{ui.t("allServices")}</Text></Pressable>
     {services.map(x=><Pressable key={x.id} onPress={()=>setServiceId(x.id)}
      style={[s.chip,serviceId===x.id&&s.chipActive]}>
      <Text style={[s.chipText,serviceId===x.id&&s.chipActiveText]}>{x.name}</Text>
     </Pressable>)}
    </ScrollView></>}
   {!doctorId&&dentists.length>1&&<><TextLine ui={ui} style={[s.fieldLabel,{marginTop:12}]}>{ui.t("dentists")}</TextLine>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
     contentContainerStyle={{gap:8,paddingVertical:5}}>
     <Pressable onPress={()=>setDentistId("")} style={[s.chip,dentistId===""&&s.chipActive]}>
      <Text style={[s.chipText,dentistId===""&&s.chipActiveText]}>{ui.t("allDentists")}</Text></Pressable>
     {dentists.map(x=><Pressable key={x.id} onPress={()=>setDentistId(x.id)}
      style={[s.chip,dentistId===x.id&&s.chipActive]}>
      <Text style={[s.chipText,dentistId===x.id&&s.chipActiveText]}>{x.displayName}</Text>
     </Pressable>)}</ScrollView></>}
   {result.loading?<View style={s.centerLoading}><ActivityIndicator color={colors.blue}/></View>:
    result.error?<Failure ui={ui} error={result.error} retry={result.refresh}/>:
    result.data?.slots.length?<View style={s.slotList}>
      <TextLine ui={ui} style={s.fieldLabel}>{result.data.slots.length} {ui.t("slots")}</TextLine>
      <View style={[s.slotGrid,{flexDirection:ui.flow}]}>
       {result.data.slots.slice(0,25).map((x,i)=><View style={s.slotItem}
        key={x.startAt+x.dentistId+x.serviceId+i}>
        <Text style={s.slotTime}>{displayDate(x.startAt,ui.locale,ui.calendar,true)}</Text>
        <Text numberOfLines={2} style={s.slotSub}>{x.serviceName} · {x.dentistName}</Text>
        <Text style={s.slotFee}>{money(x.priceAfn,ui.locale)}</Text>
       </View>)}</View>
      </View>:<View style={s.scheduleEmpty}><Icon glyph="▦"/>
       <Text style={s.emptyCopy}>{ui.t("noSlots")}</Text></View>}
   <View style={[s.notice,{flexDirection:ui.flow}]}>
    <PatientIcon name="help" size={19} color={colors.amber}/>
    <Text style={[s.noticeText,{textAlign:ui.align}]}>
     {ui.t("pending")} {ui.t("timezone")}</Text></View>
  </CardShell>
 </View>;
}
function HoursCard({ui,hours}:{ui:UI;hours:Hours}){
 const dayNames=ui.locale==="en"?["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]:
  ui.locale==="fa-AF"?["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"]:
  ["یکشنبه","دوشنبه","سې‌شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"];
 const format=(m:number)=>String(Math.floor(m/60)).padStart(2,"0")+":"+
  String(m%60).padStart(2,"0");
 return <CardShell><SectionHead ui={ui} title={ui.t("hours")} sub={ui.t("timezone")}/>
  {dayNames.map((name,weekday)=>{
   const row=hours.weekly.find(r=>r.weekday===weekday);
   const open=Boolean(row?.isOpen);
   return <View style={[s.hoursLine,{flexDirection:ui.flow}]} key={weekday}>
    <Text style={[s.hoursDay,{color:weekday===hours.now.weekday?colors.blue:colors.ink}]}>
     {name}{weekday===hours.now.weekday?" · "+ui.t("today"):""}</Text>
    <Text style={[s.hoursValue,{color:open?colors.navy:colors.gray}]}>
     {row&&open?format(row.startMinute)+"–"+format(row.endMinute):ui.t("closed")}</Text>
   </View>
  })}
 </CardShell>;
}
function ServicesCard({ui,services}:{ui:UI;services:Service[]}){
 return <CardShell><SectionHead ui={ui} title={ui.t("treatments")}
  sub={ui.t("trust")}/>
  {services.length?services.map(x=><View key={x.id} style={[s.serviceRow,{flexDirection:ui.flow}]}>
   <Icon glyph="✚"/><View style={{flex:1}}>
    <Text style={[s.serviceName,{textAlign:ui.align}]}>{x.name}</Text>
    <Text style={[s.serviceSub,{textAlign:ui.align}]}>
     {x.category} · {x.durationMinutes} {ui.t("minutes")}</Text>
   </View><Text style={s.serviceFee}>{money(x.priceAfn,ui.locale)}</Text>
  </View>):<TextLine ui={ui}>{ui.t("notListed")}</TextLine>}
 </CardShell>;
}
function DentistCard({dentist,ui,onPress}:{dentist:Dentist;ui:UI;onPress:()=>void}){
 return <Pressable onPress={onPress} accessibilityRole="button" style={[s.doctorRow,{flexDirection:ui.flow}]}>
  <View style={s.doctorAvatar}><Text style={s.doctorInitial}>
   {dentist.displayName?.trim().slice(0,1)||"✦"}</Text></View>
  <View style={{flex:1}}><Text style={[s.doctorName,{textAlign:ui.align}]}>{dentist.displayName}</Text>
   <Text style={[s.serviceSub,{textAlign:ui.align}]}>{dentist.specialty||ui.t("notListed")}</Text>
   <Text style={[s.verifiedTiny,{textAlign:ui.align}]}>✓ {ui.t("verify")}</Text>
  </View><Text style={s.forward}>›</Text>
 </Pressable>;
}
function ClinicScreen({clinicId,ui,onOpenDentist,isSaved,onSave,onBook,onReview}:{clinicId:string;ui:UI;
 onOpenDentist:(id:string)=>void;isSaved:boolean;onSave:()=>void;onBook:()=>void;onReview:()=>void}){
 const detail=usePublic<ClinicDetail>("/clinics/"+encodeURIComponent(clinicId));
 const [tab,setTab]=useState<"overview"|"dentists"|"services"|"times">("overview");
 const [photo,setPhoto]=useState(0),[showAllPhotos,setShowAllPhotos]=useState(false);
 if(detail.loading)return <LoadingCards ui={ui}/>;
 if(detail.error||!detail.data)return <Failure ui={ui} error={detail.error} retry={detail.refresh}/>;
 const {clinic,profile:p,hours}=detail.data;
 const mapUrl="https://www.openstreetmap.org/?mlat="+p.latitude+
  "&mlon="+p.longitude+"#map=16/"+p.latitude+"/"+p.longitude;
 const tabs:([typeof tab,string])[]=[
  ["overview",ui.t("overview")],["dentists",ui.t("dentists")],
  ["services",ui.t("treatments")],["times",ui.t("times")]];
 return <View style={s.sectionGap}>
  <View style={s.detailPhotoFrame}>
   <PublishedPhoto large photo={p.photos[photo]||null} label={clinic.name}/>
   {p.photos.length>1&&<View style={s.photoCount}><Text style={s.photoCountText}>
    {photo+1}/{p.photos.length}</Text></View>}
  </View>
  {p.photos.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false}
   contentContainerStyle={{gap:8,paddingHorizontal:2,marginTop:-9}}>
   {p.photos.map((x,i)=><Pressable onPress={()=>setPhoto(i)} key={x.id}
    style={[s.thumbnail,photo===i&&s.thumbnailActive]}>
    <Image source={{uri:x.url.startsWith("/")?API+x.url:x.url}} style={s.thumbImage}/>
   </Pressable>)}</ScrollView>}
  <CardShell>
   <View style={[s.row,{flexDirection:ui.flow,justifyContent:"space-between",alignItems:"flex-start"}]}>
    <Tag label={ui.t("verify")} positive/>
    <SavedButton ui={ui} saved={isSaved} onPress={onSave}/>
   </View>
   <Text style={[s.detailTitle,{textAlign:ui.align,marginTop:11}]}>{clinic.name}</Text>
   <TextLine ui={ui} style={s.detailAddress}>⌖ {clinic.address}, {cityLabel(clinic.city,ui.locale)}, {clinic.province}</TextLine>
   <View style={[s.row,{flexDirection:ui.flow,flexWrap:"wrap",gap:7,marginTop:11}]}>
    {p.specialties.slice(0,4).map(x=><Tag key={x} label={x}/>)}
   </View>
   <TextLine ui={ui} style={[s.verifiedTiny,{marginTop:12}]}>
    ✓ {ui.t("updated")} · {hours.now.isWithinPublishedHours?
     ui.t("openScheduled"):ui.t("closedScheduled")}</TextLine>
   <View style={[s.row,{flexDirection:ui.flow,gap:9,flexWrap:"wrap",marginTop:18}]}>
    <Pressable accessibilityRole="button" style={[s.cardButton,s.cardButtonPrimary,{minWidth:105}]}
     onPress={onBook}>
     <View style={s.iconButtonRow}><PatientIcon name="calendar" size={18} color={colors.white}/>
      <Text style={[s.cardButtonPrimaryText,{textAlign:"center",flexShrink:1}]}>
       {ui.locale==="en"?"Book":ui.locale==="ps-AF"?"وخت":"رزرو"}</Text></View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={ui.t("call")}
     style={[s.cardButton,{minWidth:105}]} onPress={()=>{void Linking.openURL("tel:"+clinic.phone)}}>
     <View style={s.iconButtonRow}><PatientIcon name="phone" size={18} color={colors.blue}/>
      <Text style={s.cardButtonText}>{ui.t("call")}</Text></View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={ui.t("directions")}
     style={[s.cardButton,{minWidth:105}]} onPress={()=>{void Linking.openURL(mapUrl)}}>
     <View style={s.iconButtonRow}><PatientIcon name="map" size={18} color={colors.blue}/>
      <Text style={s.cardButtonText}>{ui.t("directions")}</Text></View></Pressable>
   </View>
  </CardShell>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
   contentContainerStyle={[s.tabs,{flexDirection:ui.flow}]}>
   {tabs.map(([key,title])=><Pressable onPress={()=>setTab(key)}
    accessibilityRole="tab" accessibilityState={{selected:tab===key}}
    key={key} style={[s.detailTab,tab===key&&s.detailTabActive]}>
    <Text style={[s.detailTabText,tab===key&&s.detailTabTextActive]}>{title}</Text>
   </Pressable>)}
  </ScrollView>
  {tab==="overview"&&<>
   <View style={[s.overviewStats,{flexDirection:ui.flow}]}>
    <View style={s.overviewStat}><Text style={s.overviewCount}>{p.dentists.length}</Text>
     <Text style={s.overviewLabel}>{ui.t("dentists")}</Text></View>
    <View style={s.overviewDivider}/>
    <View style={s.overviewStat}><Text style={s.overviewCount}>{p.services.length}</Text>
     <Text style={s.overviewLabel}>{ui.t("treatments")}</Text></View>
    <View style={s.overviewDivider}/>
    <View style={s.overviewStat}><Text style={s.overviewCount}>✓</Text>
     <Text style={s.overviewLabel}>{ui.t("verify")}</Text></View>
   </View>
   <CardShell><SectionHead ui={ui} title={ui.t("about")}
    sub={ui.t("profile")}/>
    <TextLine ui={ui}>{p.description||ui.t("notListed")}</TextLine>
    {p.contactNote&&<TextLine ui={ui} style={{marginTop:12}}>{p.contactNote}</TextLine>}</CardShell>
   <CardShell><SectionHead ui={ui} title={ui.t("dentists")}
    action={<Pressable onPress={()=>setTab("dentists")}>
     <Text style={s.link}>{ui.t("viewAll")}  ›</Text></Pressable>}/>
    {p.dentists.slice(0,3).map(x=><DentistCard key={x.id} dentist={x} ui={ui}
     onPress={()=>onOpenDentist(x.id)}/>)}</CardShell>
   <CardShell><SectionHead ui={ui} title={ui.t("treatments")}
    action={<Pressable onPress={()=>setTab("services")}><Text style={s.link}>
     {ui.t("viewAll")}  ›</Text></Pressable>}/>
    {p.services.slice(0,3).map(x=><View key={x.id} style={[s.simpleFact,{flexDirection:ui.flow}]}>
     <Text style={s.serviceName}>{x.name}</Text><Text style={s.serviceFee}>
     {money(x.priceAfn,ui.locale)}</Text></View>)}</CardShell>
  </>}
  {tab==="dentists"&&<CardShell>
   <SectionHead ui={ui} title={ui.t("dentists")} sub={ui.t("licensed")}/>
   {p.dentists.map(x=><DentistCard key={x.id} dentist={x} ui={ui}
    onPress={()=>onOpenDentist(x.id)}/>)}</CardShell>}
  {tab==="services"&&<ServicesCard ui={ui} services={p.services}/>}
  {tab==="overview"&&<>
   <CardShell>
    <SectionHead ui={ui} title={ui.t("gallery")} sub={ui.t("photoDesc")}
     action={p.photos.length>2?<Pressable accessibilityRole="button"
      onPress={()=>setShowAllPhotos(v=>!v)}>
      <Text style={s.link}>{ui.t(showAllPhotos?"close":"viewAll")}  ›</Text>
     </Pressable>:undefined}/>
    {p.photos.length?p.photos.slice(0,showAllPhotos?p.photos.length:2).map((x,i)=>
     <Pressable key={x.id} onPress={()=>setPhoto(i)} accessibilityRole="button"
      accessibilityLabel={x.caption||clinic.name} style={{marginBottom:13}}>
      <PublishedPhoto large photo={x} label={clinic.name}/>
      {!!x.caption&&<TextLine ui={ui} style={{marginTop:6}}>{x.caption}</TextLine>}
     </Pressable>):<TextLine ui={ui}>{ui.t("photosEmpty")}</TextLine>}
   </CardShell>
   <HoursCard hours={hours} ui={ui}/>
   <NativePublishedReviews clinicId={clinicId} locale={ui.locale} onWrite={onReview}/>
  </>}
  {tab==="times"&&<Availability ui={ui} clinicId={clinicId}
   dentists={p.dentists} services={p.services} horizon={p.bookingRules.horizonDays}/>}
  <View style={s.detailFooter}><TextLine ui={ui} style={s.footerNotice}>
   {ui.t("noFake")} {ui.t("pending")}</TextLine></View>
 </View>;
}
function DentistScreen({clinicId,dentistId,ui,onBackToClinic,onBook,isSaved,onSave,onReview}:{clinicId:string;
 dentistId:string;ui:UI;onBackToClinic:()=>void;onBook:()=>void;isSaved:boolean;onSave:()=>void;
 onReview:()=>void}){
 const response=usePublic<DentistDetail>("/clinics/"+encodeURIComponent(clinicId)+
  "/dentists/"+encodeURIComponent(dentistId));
 const [tab,setTab]=useState<"overview"|"services"|"times">("overview");
 if(response.loading)return <LoadingCards ui={ui}/>;
 if(response.error||!response.data)return <Failure ui={ui} error={response.error} retry={response.refresh}/>;
 const {dentist:d,clinic,services,hours,bookingRules}=response.data;
 return <View style={s.sectionGap}>
  <CardShell style={s.dentistHero}>
   <View style={[s.row,{flexDirection:ui.flow,alignItems:"center",gap:17}]}>
    <View style={s.largeAvatar}><Text style={s.largeAvatarText}>
     {d.displayName?.trim().slice(0,1)||"✦"}</Text></View>
    <View style={{flex:1,gap:6}}><Text style={[s.detailTitle,{textAlign:ui.align}]}>
     {d.displayName}</Text><TextLine ui={ui}>{d.specialty||ui.t("notListed")}</TextLine>
     <Tag label={ui.t("verify")} positive/></View>
   </View>
   <Pressable accessibilityRole="button" accessibilityState={{selected:isSaved}}
    accessibilityLabel={ui.t(isSaved?"removeFromSaved":"addToSaved")}
    onPress={onSave} style={[s.heart,{marginTop:10,alignSelf:"flex-start"}]}>
    <PatientIcon name="bookmark" size={21} color={isSaved?colors.blue:colors.muted} filled={isSaved}/>
   </Pressable>
   <Pressable onPress={onBackToClinic} style={[s.row,{flexDirection:ui.flow,gap:8,marginTop:17}]}>
    <Text style={[s.link,{textAlign:ui.align,flex:1}]}>{clinic.name} ›</Text></Pressable>
   <TextLine ui={ui} style={{marginTop:8}}>⌖ {cityLabel(clinic.city,ui.locale)}, {clinic.province}</TextLine>
   <View style={[s.row,{flexDirection:ui.flow,gap:10,flexWrap:"wrap",marginTop:16}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={ui.t("times")}
     style={[s.cardButton,s.cardButtonPrimary,{minWidth:105}]} onPress={onBook}>
     <View style={s.iconButtonRow}><PatientIcon name="calendar" size={19} color={colors.white}/>
      <Text style={s.cardButtonPrimaryText}>{ui.locale==="en"?"Book":ui.locale==="ps-AF"?"وخت":"رزرو"}</Text>
     </View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={ui.t("call")}
     style={[s.cardButton,{minWidth:105}]} onPress={()=>{
     void Linking.openURL("tel:"+clinic.phone)}}>
     <View style={s.iconButtonRow}><PatientIcon name="phone" size={18} color={colors.blue}/>
      <Text style={s.cardButtonText}>{ui.t("call")}</Text></View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={ui.t("times")}
     onPress={()=>setTab("times")} style={[s.cardButton,{minWidth:105}]}>
     <View style={s.iconButtonRow}><PatientIcon name="clock" size={18} color={colors.blue}/>
      <Text style={s.cardButtonText}>{ui.t("times")}</Text></View></Pressable>
   </View>
  </CardShell>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
   contentContainerStyle={[s.tabs,{flexDirection:ui.flow}]}>
   {(["overview","services","times"] as const).map(key=>
    <Pressable key={key} onPress={()=>setTab(key)} accessibilityRole="tab"
     accessibilityState={{selected:tab===key}}
     style={[s.detailTab,tab===key&&s.detailTabActive]}>
     <Text style={[s.detailTabText,tab===key&&s.detailTabTextActive]}>{ui.t(key==="services"?"treatments":key)}</Text>
    </Pressable>)}
  </ScrollView>
  {tab==="overview"&&<>
   <CardShell><SectionHead ui={ui} title={ui.t("about")}
    sub={ui.t("provider")}/><TextLine ui={ui}>{d.biography||ui.t("noBio")}</TextLine></CardShell>
   <CardShell><SectionHead ui={ui} title={ui.t("credentials")}
    sub={ui.t("licensed")}/>
    {[["specialty",d.specialty],["qualification",d.qualifications],
     ["affiliation",clinic.name]].map(([key,value])=>
     <View key={key} style={[s.simpleFact,{flexDirection:ui.flow}]}>
      <Text style={s.metaLabel}>{ui.t(key as "specialty"|"qualification"|"affiliation")}</Text>
      <Text style={[s.serviceName,{flex:1,textAlign:ui.align}]}>{value||ui.t("notListed")}</Text>
     </View>)}
   </CardShell>
   <HoursCard ui={ui} hours={hours}/>
   <NativePublishedReviews clinicId={clinicId} dentistId={dentistId}
    locale={ui.locale} onWrite={onReview}/>
  </>}
  {tab==="services"&&<ServicesCard ui={ui} services={services}/>}
  {tab==="times"&&<Availability ui={ui} clinicId={clinicId}
   doctorId={dentistId} dentists={[d]} services={services} horizon={bookingRules.horizonDays}/>}
  <TextLine ui={ui} style={s.footerNotice}>{ui.t("medical")}</TextLine>
 </View>;
}
function HomeScreen({ui,city,onCity,onSearch,onBrowse,onSpecialty,onClinic,isSaved,onSave,
 onAppointment,onAppointments,onSaved,onRefreshSettled}:{ui:UI;
 city:string;onCity:(v:string)=>void;onSearch:(q:string)=>void;onBrowse:()=>void;
 onSpecialty:(specialty:string)=>void;onClinic:(id:string)=>void;
 onAppointment:(bookingId:string)=>void;onAppointments:()=>void;onSaved:()=>void;
 onRefreshSettled?:()=>void;
 isSaved:(id:string)=>boolean;onSave:(id:string)=>void}){
 const [search,setSearch]=useState(""),[showCity,setShowCity]=useState(false);
 const facets=usePublic<Facets>("/facets");
 const result=usePublic<Results>(urlSearch({city,limit:4,page:1}));
 const choices=facets.data?.cities||[];
 useEffect(()=>{if(!facets.loading&&!result.loading)onRefreshSettled?.()},
  [facets.loading,result.loading,onRefreshSettled]);
 return <View style={s.sectionGap}>
  <View style={s.hero}><View style={s.heroCircle}/><View style={s.heroCircle2}/>
   <Text style={[s.heroKicker,{textAlign:ui.align}]}>{ui.t("introTag")}</Text>
   <Text style={[s.heroHeadline,{textAlign:ui.align}]}>{ui.t("goodCare")}</Text>
   <Text style={[s.heroBody,{textAlign:ui.align}]}>{ui.t("heroBody")}</Text>
   <View style={[s.row,{flexDirection:ui.flow,gap:8,marginTop:15}]}>
    <Tag positive label={ui.t("verify")}/><Tag label={ui.t("free")}/>
   </View>
  </View>
  <NativeNextAppointment locale={ui.locale} calendar={ui.calendar}
   onOpen={onAppointment} onAll={onAppointments} onExplore={onBrowse}/>
  <CardShell style={s.searchBox}>
   <Text style={[s.fieldLabel,{textAlign:ui.align}]}>{ui.t("findLabel")}</Text>
   <View style={[s.inputLine,{flexDirection:ui.flow}]}>
    <PatientIcon name="search" size={22} color={colors.blue}/>
    <TextInput value={search} onChangeText={setSearch}
     onSubmitEditing={()=>onSearch(search)} returnKeyType="search"
     style={[s.searchInput,{textAlign:ui.align}]} placeholder={ui.t("find")}
     placeholderTextColor={colors.gray}/>
   </View>
   <View style={[s.row,{flexDirection:ui.flow,gap:9,marginTop:12}]}>
    <Pressable style={s.citySelector} onPress={()=>setShowCity(!showCity)}
     accessibilityRole="button" accessibilityState={{expanded:showCity}}>
     <Text style={s.citySelectorText}>⌖  {city?cityLabel(city,ui.locale):ui.t("allCities")}  ⌄</Text>
    </Pressable>
    <View style={{flex:1}}><CTA label={ui.t("search")+"  ›"} onPress={()=>onSearch(search)}/></View>
   </View>
   {showCity&&<View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {[{city:"",province:"",clinics:0},...choices].map(x=>
     <Pressable key={x.city} onPress={()=>{onCity(x.city);setShowCity(false)}}
      style={[s.chip,city===x.city&&s.chipActive]}>
      <Text style={[s.chipText,city===x.city&&s.chipActiveText]}>
       {x.city?cityLabel(x.city,ui.locale):ui.t("allCities")}</Text>
     </Pressable>)}</View>}
  </CardShell>
  <SectionHead ui={ui} title={ui.t("quickActions")}/>
  <View style={[s.quickActions,{flexDirection:ui.flow}]}>
   {([
    [ui.t("explore"),"search",onBrowse],
    [ui.t("appointments"),"calendar",onAppointments],
    [ui.t("saved"),"bookmark",onSaved]
   ] as [string,PatientIconName,()=>void][]).map(([label,icon,action])=>
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
     onPress={action} style={s.quickAction}>
     <View style={s.quickActionIconBox}><PatientIcon name={icon} size={24} color={colors.blue}/></View>
     <Text style={s.quickActionLabel} numberOfLines={2}>{label}</Text>
    </Pressable>)}
  </View>
  <SectionHead ui={ui} title={ui.t("featured")} sub={ui.t("featuredSub")}
   action={<Pressable onPress={onBrowse}><Text style={s.link}>{ui.t("viewAll")}  ›</Text></Pressable>}/>
  {result.loading?<LoadingCards ui={ui}/>:
   result.error?<Failure ui={ui} error={result.error} retry={result.refresh}/>:
   result.data?.items.length?<View style={s.cardList}>
    {result.data.items.map(x=><ClinicCard key={x.clinic.id} card={x} ui={ui}
     saved={isSaved(x.clinic.id)} onSave={onSave} onOpen={onClinic}/>)}</View>:
    <Empty ui={ui} heading={ui.t("emptyDirectory")} detail={ui.t("noResultsSub")}
     action={<CTA secondary label={ui.t("discover")} onPress={onBrowse}/>}/>}
  {(facets.data?.specialties.length||0)>0&&<View>
   <SectionHead ui={ui} title={ui.t("specialties")} sub={ui.t("near")}/>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {facets.data!.specialties.slice(0,6).map(x=><Pressable key={x.name}
     accessibilityRole="button" accessibilityLabel={x.name}
     onPress={()=>onSpecialty(x.name)} style={s.chip}>
     <Text style={s.chipText}>{x.name}  {ui.rtl?"‹":"›"}</Text>
    </Pressable>)}</View></View>}
  <View style={s.trustBanner}><Text style={[s.trustTitle,{textAlign:ui.align}]}>
   ✓  {ui.t("trust")}</Text>
   <TextLine ui={ui} style={s.trustBody}>{ui.t("trustBody")}</TextLine></View>
 </View>;
}
function ExploreScreen({ui,city,onCity,seed,specialtySeed,onClinic,isSaved,onSave,onRefreshSettled}:{ui:UI;
 city:string;onCity:(v:string)=>void;seed:string;specialtySeed:string;
 onClinic:(id:string)=>void;isSaved:(id:string)=>boolean;onSave:(id:string)=>void;
 onRefreshSettled?:()=>void}){
 const [draft,setDraft]=useState(seed),[q,setQ]=useState(seed),
 [specialty,setSpecialty]=useState(""),[service,setService]=useState(""),
 [sort,setSort]=useState("relevance"),[filterOpen,setFilterOpen]=useState(false),
 [page,setPage]=useState(1);
 useEffect(()=>{setDraft(seed);setQ(seed);setPage(1)},[seed]);
 useEffect(()=>{setSpecialty(specialtySeed);setPage(1)},[specialtySeed]);
 const facets=usePublic<Facets>("/facets");
 const results=usePublic<Results>(urlSearch({q,city,specialty,service,sort,page,limit:8}));
 useEffect(()=>{if(!results.loading)onRefreshSettled?.()},[results.loading,onRefreshSettled]);
 function selectCity(x:string){onCity(x);setPage(1)}
 function reset(){setDraft("");setQ("");setSpecialty("");setService("");setSort("relevance");setPage(1);selectCity("")}
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("listings")} sub={ui.t("intro")}/>
  <View style={[s.inputLine,s.exploreInput,{flexDirection:ui.flow}]}>
   <PatientIcon name="search" size={22} color={colors.blue}/>
   <TextInput value={draft} onChangeText={setDraft} placeholder={ui.t("find")}
    onSubmitEditing={()=>{setQ(draft.trim());setPage(1)}} returnKeyType="search"
    style={[s.searchInput,{textAlign:ui.align}]} placeholderTextColor={colors.gray}/>
   <Pressable onPress={()=>{setQ(draft.trim());setPage(1)}} style={s.searchIconButton}>
    <Text style={s.searchIconButtonText}>›</Text></Pressable>
  </View>
  <View style={[s.row,{flexDirection:ui.flow,flexWrap:"wrap",gap:8}]}>
   <Pressable onPress={()=>setFilterOpen(!filterOpen)}
    accessibilityState={{expanded:filterOpen}} style={[s.chip,s.filterTrigger]}>
    <Text style={[s.chipText,{color:colors.blue}]}>☷  {ui.t("filter")}  {filterOpen?"⌃":"⌄"}</Text>
   </Pressable>
   <Pressable onPress={()=>setFilterOpen(true)} style={s.chip}>
    <Text style={s.chipText}>⌖  {city?cityLabel(city,ui.locale):ui.t("allCities")}</Text></Pressable>
   {specialty!==""&&<Pressable onPress={()=>{setSpecialty("");setPage(1)}} style={s.chip}>
    <Text style={s.chipText}>{specialty}  ×</Text></Pressable>}
   {service!==""&&<Pressable onPress={()=>{setService("");setPage(1)}} style={s.chip}>
    <Text style={s.chipText}>{service}  ×</Text></Pressable>}
  </View>
  {filterOpen&&<CardShell style={s.filtersPanel}>
   {facets.error&&<Failure ui={ui} error={facets.error} retry={facets.refresh}/>}
   <SectionHead ui={ui} title={ui.t("filter")} action={<Pressable onPress={reset}>
    <Text style={s.link}>{ui.t("clear")}</Text></Pressable>}/>
   <TextLine ui={ui} style={s.fieldLabel}>{ui.t("city")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {[{city:"",province:"",clinics:0},...(facets.data?.cities||[])].map(x=>
     <Pressable key={x.city+x.province} onPress={()=>selectCity(x.city)}
      style={[s.chip,city===x.city&&s.chipActive]}>
      <Text style={[s.chipText,city===x.city&&s.chipActiveText]}>
       {x.city?cityLabel(x.city,ui.locale):ui.t("allCities")}</Text></Pressable>)}</View>
   <TextLine ui={ui} style={[s.fieldLabel,{marginTop:16}]}>{ui.t("specialty")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    <Pressable onPress={()=>{setSpecialty("");setPage(1)}}
     style={[s.chip,!specialty&&s.chipActive]}>
     <Text style={[s.chipText,!specialty&&s.chipActiveText]}>{ui.t("allSpecialties")}</Text>
    </Pressable>
    {facets.data?.specialties.slice(0,30).map(x=><Pressable key={x.name}
     onPress={()=>{setSpecialty(x.name);setPage(1)}} style={[s.chip,specialty===x.name&&s.chipActive]}>
     <Text style={[s.chipText,specialty===x.name&&s.chipActiveText]}>{x.name}</Text></Pressable>)}
   </View>
   <TextLine ui={ui} style={[s.fieldLabel,{marginTop:16}]}>{ui.t("service")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    <Pressable onPress={()=>{setService("");setPage(1)}} style={[s.chip,!service&&s.chipActive]}>
     <Text style={[s.chipText,!service&&s.chipActiveText]}>{ui.t("allServices")}</Text></Pressable>
    {facets.data?.services.slice(0,30).map(x=><Pressable key={x.name}
     onPress={()=>{setService(x.name);setPage(1)}}
     style={[s.chip,service===x.name&&s.chipActive]}>
     <Text style={[s.chipText,service===x.name&&s.chipActiveText]}>{x.name}</Text></Pressable>)}</View>
   <TextLine ui={ui} style={[s.fieldLabel,{marginTop:16}]}>{ui.t("sort")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {([["relevance","sortRelevant"],["name","sortName"],["soonest","sortSoon"]] as const).map(([val,label])=>
     <Pressable key={val} onPress={()=>{setSort(val);setPage(1)}}
      style={[s.chip,sort===val&&s.chipActive]}>
      <Text style={[s.chipText,sort===val&&s.chipActiveText]}>{ui.t(label)}</Text></Pressable>)}
   </View>
   <View style={{marginTop:18}}><CTA label={ui.t("apply")} onPress={()=>setFilterOpen(false)}/></View>
  </CardShell>}
  <SectionHead ui={ui} title={ui.t("featured")}
   sub={results.data?(results.data.pagination.totalExact?"":"≥")+results.data.pagination.total+
    " "+ui.t("results"):ui.t("loading")}/>
  {results.loading?<LoadingCards ui={ui}/>:
   results.error?<Failure ui={ui} error={results.error} retry={results.refresh}/>:
   results.data?.items.length?<View style={s.cardList}>
    {results.data.items.map(x=><ClinicCard key={x.clinic.id} card={x}
     ui={ui} saved={isSaved(x.clinic.id)} onSave={onSave} onOpen={onClinic}/>)}
   </View>:<Empty ui={ui} heading={ui.t("noResults")} detail={ui.t("noResultsSub")}
    action={<CTA label={ui.t("clear")} secondary onPress={reset}/>}/>}
  {results.data?.resultsTruncated&&<TextLine ui={ui} style={s.footerNotice}>{ui.t("limited")}</TextLine>}
  {results.data&&results.data.pagination.total>0&&<View style={[s.row,{flexDirection:ui.flow,gap:10,justifyContent:"space-between"}]}>
   <Pressable disabled={page<=1} onPress={()=>setPage(x=>x-1)}
    style={[s.pageButton,page<=1&&s.disabled]}><Text style={s.pageText}>{ui.t("previous")}</Text></Pressable>
   <Text style={s.metaLabel}>{ui.t("page")} {page}</Text>
   <Pressable disabled={!results.data.pagination.hasNext} onPress={()=>setPage(x=>x+1)}
    style={[s.pageButton,!results.data.pagination.hasNext&&s.disabled]}>
    <Text style={s.pageText}>{ui.t("next")}</Text></Pressable></View>}
  <TextLine ui={ui} style={s.footerNotice}>{ui.t("locationHint")}</TextLine>
 </View>;
}
function SavedScreen({ui,ids,onRemove,onClinic,onExplore,onRefreshSettled}:{ui:UI;ids:string[];
 onRemove:(id:string)=>void;onClinic:(id:string)=>void;onExplore:()=>void;
 onRefreshSettled?:()=>void}){
 const [state,setState]=useState<{loading:boolean;clinics:ClinicDetail[];missing:number;error:boolean}>({
  loading:!!ids.length,clinics:[],missing:0,error:false});
 const [reload,setReload]=useState(0);
 useEffect(()=>{if(!state.loading)onRefreshSettled?.()},[state.loading,onRefreshSettled]);
 useEffect(()=>{if(!ids.length){setState({loading:false,clinics:[],missing:0,error:false});return}
  let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  setState(prev=>({...prev,loading:true,error:false}));
  void Promise.all(ids.slice(0,30).map(async id=>{
   try{return {kind:"found" as const,clinic:await fetchPublic<ClinicDetail>(
    "/clinics/"+encodeURIComponent(id),controller.signal)}}
   catch(error){
    if(error instanceof Error&&error.message==="PROFILE_UNAVAILABLE")
     return {kind:"removed" as const};
    return {kind:"offline" as const};
   }})).then(items=>{
    if(!active)return;
    const offline=items.some(x=>x.kind==="offline");
    setState({loading:false,
     clinics:offline?[]:items.filter((x):x is {kind:"found";clinic:ClinicDetail}=>
      x.kind==="found").map(x=>x.clinic),
     missing:items.filter(x=>x.kind==="removed").length,error:offline});
   }).catch(()=>{if(active)setState({loading:false,clinics:[],missing:0,error:true})})
   .finally(()=>clearTimeout(timer));
  return ()=>{active=false;controller.abort();clearTimeout(timer)};
 },[ids.join("|"),reload]);
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("savedClinics")} sub={ui.t("savedIntro")}/>
  {!ids.length?<Empty ui={ui} heading={ui.t("emptySaved")} detail={ui.t("emptySavedSub")}
   action={<CTA label={ui.t("discover")} onPress={onExplore}/>}/>:
   state.loading?<LoadingCards ui={ui}/>:
   state.error?<Failure ui={ui} error="SERVICE_UNAVAILABLE" retry={()=>setReload(x=>x+1)}/>:
   <View style={s.cardList}>
    {state.clinics.map(x=><CardShell key={x.clinic.id}>
     <View style={[s.row,{flexDirection:ui.flow,alignItems:"center",gap:12}]}>
      <View style={s.savedThumb}><PublishedPhoto photo={x.profile.photos[0]} label={x.clinic.name}/></View>
      <View style={{flex:1}}><Text style={[s.clinicName,{textAlign:ui.align}]}>{x.clinic.name}</Text>
       <TextLine ui={ui} style={s.clinicSub}>{cityLabel(x.clinic.city,ui.locale)}</TextLine>
       <Tag positive label={ui.t("verify")}/></View>
     </View>
     <View style={[s.row,{flexDirection:ui.flow,gap:10,marginTop:17}]}>
      <Pressable onPress={()=>onClinic(x.clinic.id)} style={[s.cardButton,s.cardButtonPrimary]}>
       <Text style={s.cardButtonPrimaryText}>{ui.t("details")}</Text></Pressable>
      <Pressable onPress={()=>onRemove(x.clinic.id)} style={s.cardButton}>
       <Text style={s.cardButtonText}>{ui.t("remove")}</Text></Pressable></View>
    </CardShell>)}
    {state.missing>0&&<TextLine ui={ui} style={s.footerNotice}>{ui.t("noLongerPublished")}</TextLine>}
   </View>}
 </View>;
}
function AccountScreen({ui,locale,calendar,city,onLocale,onCalendar,onCity,checkApi,onOpenProfile,
 connection,checking,signedIn}:{ui:UI;locale:Language;calendar:Calendar;city:string;
 onLocale:(x:Language)=>void;onCalendar:(x:Calendar)=>void;onCity:(x:string)=>void;
 checkApi:()=>void;onOpenProfile:()=>void;connection:"connected"|"offline"|"notConfigured"|"checking";checking:boolean;signedIn:boolean}){
 const facets=usePublic<Facets>("/facets");
 const [showCities,setShowCities]=useState(false);
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("accountTitle")} sub={signedIn?ui.t("prefs"):ui.t("guestSub")}/>
  {!signedIn&&<View style={s.guestCard}><Icon glyph="☺" filled/>
   <View style={{flex:1}}><Text style={[s.guestName,{textAlign:ui.align}]}>{ui.t("guest")}</Text>
    <TextLine ui={ui} style={s.guestHint}>{ui.t("secureHelp")}</TextLine></View></View>}
  {!signedIn&&<CTA label={ui.t("secureAccount")+"  ›"} onPress={onOpenProfile}/>}
  <CardShell><SectionHead ui={ui} title={ui.t("prefs")}
   sub={ui.t("updated")}/>
   <TextLine ui={ui} style={s.fieldLabel}>{ui.t("language")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {([["fa-AF","دری"],["ps-AF","پښتو"],["en","English"]] as const).map(([val,label])=>
     <Pressable onPress={()=>onLocale(val)} key={val}
      style={[s.chip,locale===val&&s.chipActive]}>
      <Text style={[s.chipText,locale===val&&s.chipActiveText]}>{label}</Text></Pressable>)}
   </View>
   <TextLine ui={ui} style={[s.fieldLabel,{marginTop:18}]}>{ui.t("calendar")}</TextLine>
   <View style={[s.cityChoiceGroup,{flexDirection:ui.flow}]}>
    {(["solar_hijri","gregorian"] as const).map(x=>
     <Pressable onPress={()=>onCalendar(x)} key={x}
      style={[s.chip,calendar===x&&s.chipActive]}>
      <Text style={[s.chipText,calendar===x&&s.chipActiveText]}>
       {ui.t(x==="solar_hijri"?"solar":"gregorian")}</Text></Pressable>)}
   </View>
   <TextLine ui={ui} style={[s.fieldLabel,{marginTop:18}]}>{ui.t("yourCity")}</TextLine>
   <Pressable onPress={()=>setShowCities(x=>!x)} style={[s.citySelector,{alignSelf:"flex-start"}]}>
    <Text style={s.citySelectorText}>⌖  {city?cityLabel(city,locale):ui.t("allCities")}  ⌄</Text></Pressable>
   {showCities&&<View style={[s.cityChoiceGroup,{flexDirection:ui.flow,marginTop:10}]}>
    {[{city:"",province:"",clinics:0},...(facets.data?.cities||[])].map(x=>
     <Pressable key={x.city+x.province} style={[s.chip,city===x.city&&s.chipActive]}
      onPress={()=>{onCity(x.city);setShowCities(false)}}>
      <Text style={[s.chipText,city===x.city&&s.chipActiveText]}>
       {x.city?cityLabel(x.city,locale):ui.t("allCities")}</Text></Pressable>)}</View>}
  </CardShell>
  <CardShell><SectionHead ui={ui} title={ui.t("network")}/>
   <View style={[s.row,{flexDirection:ui.flow,alignItems:"center",gap:9}]}>
    <View style={[s.statusDot,{backgroundColor:connection==="connected"?colors.green:colors.amber}]}/>
    <Text style={[s.serviceName,{flex:1,textAlign:ui.align}]}>
     {ui.t(connection)}</Text></View>
   {connection!=="connected"&&<TextLine ui={ui} style={{marginTop:8}}>
    {ui.t("offlineHelp")}</TextLine>}
   <View style={{marginTop:13}}><CTA secondary label={ui.t("refresh")}
    onPress={checkApi} disabled={checking}/></View></CardShell>
  <CardShell><SectionHead ui={ui} title={ui.t("howWorks")}/>
   {(["stepOne","stepTwo","stepThree"] as const).map((key,i)=>
    <View style={[s.trustLine,{flexDirection:ui.flow}]} key={key}>
     <View style={s.trustNumber}><Text style={s.trustNumberText}>{i+1}</Text></View>
     <TextLine ui={ui} style={{flex:1}}>{ui.t(key)}</TextLine></View>)}
  </CardShell>
  <View style={s.notice}><TextLine ui={ui}>{ui.t("medical")}</TextLine></View>
 </View>;
}

const accountWords={
 en:{
  accountTitle:"Your patient account",accountGuest:"Browse as a guest",accountGuestSub:"Sign in to manage appointments and your own account.",
  verified:"Verified patient account",signIn:"Sign in / Create account",care:"Your care",
  manage:"Account and support",profile:"Personal profile",profileSub:"Name, city and contact details",
  family:"Family members",familySub:"Manage authorized people and children",
  records:"Shared clinic records",recordsSub:"Open individually released records on the secure website",
  notifications:"Booking updates",notificationsSub:"Email delivery history and preferences",
  reviews:"Your reviews",reviewsSub:"Reviews from verified completed visits",
  security:"Account security",securitySub:"Manage sessions and security on the secure website",
  settings:"App preferences",settingsSub:"Language, calendar and selected city",
  support:"Help and support",supportSub:"Guidance through the patient website",
  appointments:"My appointments",appointmentsSub:"View upcoming and past bookings",
  explore:"Find dental care",webOnly:"Secure patient website",openWeb:"Open secure website",
  unavailable:"The secure patient website is not configured on this device yet.",
  webNote:"Your medical records are only shared after separate identity checks and clinic approval. Opening a website may require signing in again.",
  webSecurity:"Account security and session controls remain on the secure patient website.",
  webSupport:"Help and support are available on the patient website.",
  return:"Back to account",signInFirst:"Sign in before opening your account records or security."
 },
 "fa-AF":{
  accountTitle:"حساب مریض",accountGuest:"به صورت مهمان هستید",accountGuestSub:"برای مدیریت نوبت‌ها و حساب خود وارد شوید.",
  verified:"حساب مریض تأییدشده",signIn:"ورود / ایجاد حساب",care:"مراقبت شما",
  manage:"حساب و پشتیبانی",profile:"معلومات شخصی",profileSub:"نام، شهر و معلومات تماس",
  family:"اعضای خانواده",familySub:"مدیریت اشخاص مجاز و اطفال",
  records:"اسناد مشترک کلینیک",recordsSub:"مشاهده اسناد جداگانه مجازشده در وبسایت مصون",
  notifications:"تازه‌های نوبت",notificationsSub:"تاریخچه و تنظیمات ایمیل",
  reviews:"نظرات شما",reviewsSub:"نظرات مراجعه‌های تکمیل‌شده",
  security:"امنیت حساب",securitySub:"مدیریت نشست‌ها و امنیت در وبسایت مصون",
  settings:"تنظیمات برنامه",settingsSub:"زبان، تقویم و شهر انتخاب‌شده",
  support:"کمک و پشتیبانی",supportSub:"راهنمایی در وبسایت مریضان",
  appointments:"نوبت‌های من",appointmentsSub:"مشاهده نوبت‌های آینده و گذشته",
  explore:"جستجوی خدمات دندان",webOnly:"وبسایت مصون مریضان",openWeb:"بازکردن وبسایت مصون",
  unavailable:"وبسایت مصون مریضان هنوز در این دستگاه تنظیم نشده است.",
  webNote:"اسناد صحی فقط بعد از بررسی جداگانه هویت و اجازه کلینیک شریک می‌شوند. ممکن است لازم شود در وبسایت دوباره وارد شوید.",
  webSecurity:"امنیت حساب و مدیریت نشست‌ها فعلاً در وبسایت مصون مریضان است.",
  webSupport:"کمک و پشتیبانی در وبسایت مریضان در دسترس است.",
  return:"بازگشت به حساب",signInFirst:"برای دسترسی به اسناد و امنیت حساب ابتدا وارد شوید."
 },
 "ps-AF":{
  accountTitle:"د ناروغ حساب",accountGuest:"تاسو د مېلمه په توګه ګورئ",accountGuestSub:"د ملاقاتونو او حساب سمبالولو لپاره ننوځئ.",
  verified:"تایید شوی د ناروغ حساب",signIn:"ننوتل / حساب جوړول",care:"ستاسو پاملرنه",
  manage:"حساب او ملاتړ",profile:"شخصي معلومات",profileSub:"نوم، ښار او اړیکه",
  family:"د کورنۍ غړي",familySub:"د مجاز کسانو او ماشومانو سمبالول",
  records:"شریک شوي کلینیکي ریکارډونه",recordsSub:"په خوندي وېب کې یوازې د اجازه شوو ریکارډونو لیدل",
  notifications:"د ملاقات خبرونه",notificationsSub:"د ایمیل خبرتیاوې او تنظیمات",
  reviews:"ستاسو نظرونه",reviewsSub:"د بشپړو شویو کتنو نظرونه",
  security:"د حساب امنیت",securitySub:"په خوندي وېب کې د ناستو او امنیت سمبالول",
  settings:"د اپ تنظیمات",settingsSub:"ژبه، کلیزه او غوره شوی ښار",
  support:"مرسته او ملاتړ",supportSub:"د ناروغانو په وېبپاڼه کې لارښوونې",
  appointments:"زما ملاقاتونه",appointmentsSub:"راتلونکي او تېر ملاقاتونه وګورئ",
  explore:"د غاښونو خدمتونه لټول",webOnly:"د ناروغانو خوندي وېبپاڼه",openWeb:"خوندي وېبپاڼه پرانیزئ",
  unavailable:"په دې وسیله کې د ناروغانو خوندي وېبپاڼه لا نه ده تنظیم شوې.",
  webNote:"طبي ریکارډونه یوازې له بېلې پېژندنې او د کلینیک له اجازې وروسته شریکېږي. کېدای شي په وېبپاڼه کې بیا ننوتل وغواړي.",
  webSecurity:"د حساب امنیت او ناستې د ناروغانو په خوندي وېبپاڼه کې سمبالېږي.",
  webSupport:"مرسته او ملاتړ د ناروغانو په وېبپاڼه کې شته.",
  return:"حساب ته ستنېدل",signInFirst:"د ریکارډونو او امنیت لپاره لومړی ننوځئ."
 }
} as const;

function AccountHub({ui,account,onSection,onAppointments,onExplore}:{
 ui:UI;account:NativeAccount|null;onSection:(section:AccountSection)=>void;
 onAppointments:()=>void;onExplore:()=>void}){
 const t=accountWords[ui.locale];
 const registered=Boolean(account?.registered);
 const groups:{title:string;items:{key:AccountSection;icon:PatientIconName;title:string;sub:string}[]}[]=[
  {title:t.care,items:[
   {key:"family",icon:"users",title:t.family,sub:t.familySub},
   {key:"records",icon:"file",title:t.records,sub:t.recordsSub},
   {key:"reviews",icon:"star",title:t.reviews,sub:t.reviewsSub}]},
  {title:t.manage,items:[
   {key:"profile",icon:"user",title:t.profile,sub:t.profileSub},
   {key:"notifications",icon:"bell",title:t.notifications,sub:t.notificationsSub},
   {key:"security",icon:"shield",title:t.security,sub:t.securitySub},
   {key:"settings",icon:"settings",title:t.settings,sub:t.settingsSub},
   {key:"support",icon:"help",title:t.support,sub:t.supportSub}]}
 ];
 return <View style={s.sectionGap}>
  <View style={s.accountSegment}>
   <CardShell>
    <Text accessibilityRole="header" style={[s.sectionTitle,{textAlign:ui.align}]}>{t.accountTitle}</Text>
    <TextLine ui={ui} style={{marginTop:8}}>
     {registered?(account?.profile?.preferredName||account?.user.name||t.verified):t.accountGuest}</TextLine>
    <TextLine ui={ui} style={{marginTop:3}}>{registered?account?.user.email||t.verified:t.accountGuestSub}</TextLine>
    {!registered&&<View style={{marginTop:14}}>
     <CTA label={t.signIn} onPress={()=>onSection("profile")}/></View>}
   </CardShell>
  </View>
  {registered&&<>
   <View style={s.quickActions}>
    <CTA label={t.appointments} onPress={onAppointments}/>
    <CTA label={t.explore} onPress={onExplore} secondary/>
   </View>
   {groups.map(group=><View key={group.title} style={s.accountGroup}>
    <Text accessibilityRole="header" style={[s.sectionTitle,{textAlign:ui.align}]}>{group.title}</Text>
    <CardShell>
     {group.items.map((row,index)=><Pressable
      accessibilityRole="button" accessibilityLabel={row.title}
      key={row.key} onPress={()=>onSection(row.key)}
      style={[s.accountRow,{flexDirection:ui.flow},index>0&&s.accountRowBorder]}>
      <View style={s.accountRowGlyph}><PatientIcon name={row.icon} size={22} color={colors.blue}/></View>
      <View style={{flex:1}}>
       <Text style={[s.accountRowTitle,{textAlign:ui.align}]}>{row.title}</Text>
       <Text style={[s.accountRowSubtitle,{textAlign:ui.align}]}>{row.sub}</Text>
      </View>
      <Text style={s.accountRowArrow}>{ui.rtl?"‹":"›"}</Text>
     </Pressable>)}
    </CardShell>
   </View>)}
  </>}
  {!registered&&<CTA secondary label={t.settings} onPress={()=>onSection("settings")}/>}
 </View>;
}
function AccountWebSection({ui,section,onBack,onProfile,registered}:{
 ui:UI;section:"records"|"security"|"support";onBack:()=>void;onProfile:()=>void;registered:boolean}){
 const t=accountWords[ui.locale],labels={records:t.records,security:t.security,support:t.support};
 const path=section==="records"?"/account/records":section==="security"?"/account/security":"/help";
 const message=section==="records"?t.webNote:section==="security"?t.webSecurity:t.webSupport;
 const [openError,setOpenError]=useState(false);
 return <View style={s.sectionGap}><CardShell>
  <Text accessibilityRole="header" style={[s.sectionTitle,{textAlign:ui.align}]}>{labels[section]}</Text>
  <TextLine ui={ui} style={{marginTop:10}}>{message}</TextLine>
  {!registered&&section!=="support"?
   <View style={{marginTop:15}}><TextLine ui={ui}>{t.signInFirst}</TextLine>
    <CTA label={t.signIn} onPress={onProfile}/></View>:
   PATIENT_WEB?<View style={{marginTop:16}}>
    <CTA label={t.openWeb+" ↗"} onPress={()=>void Linking.openURL(PATIENT_WEB+path)
     .catch(()=>setOpenError(true))}/>
    {openError&&<TextLine ui={ui} style={{marginTop:10}}>{t.unavailable}</TextLine>}
   </View>:<TextLine ui={ui} style={{marginTop:16}}>{t.unavailable}</TextLine>}
  <View style={{marginTop:12}}><CTA secondary label={t.return} onPress={onBack}/></View>
 </CardShell></View>;
}

function PatientApp({onChangeWorkspace}:{onChangeWorkspace:()=>void}){
 const native=useNativeAuth();
 const identityKey=native.account?.user.id||null;
 const patientId=native.account?.registered?identityKey:null;
 const [favoriteSnapshot,setFavoriteSnapshot]=useState<{patientId:string;rows:Favorite[]}|null>(null);
 const favorites=favoriteSnapshot?.patientId===patientId?favoriteSnapshot.rows:[];
 const [favoritesRefresh,setFavoritesRefresh]=useState(0);
 const [locale,setLocale]=useState<Language>("fa-AF"),[calendar,setCalendar]=useState<Calendar>("solar_hijri");
 const [city,setCity]=useState("Kabul"),[ready,setReady]=useState(false);
 const [tab,setTab]=useState<Tab>("home"),[route,setRoute]=useState<Route|null>(null);
 const [viewIdentity,setViewIdentity]=useState<string|null>(identityKey);
 const previousIdentity=useRef<string|null>(identityKey);
 const [accountSection,setAccountSection]=useState<AccountSection>("overview");
 const [searchSeed,setSearchSeed]=useState(""),[specialtySeed,setSpecialtySeed]=useState("");
 const [savedIds,setSavedIds]=useState<string[]>([]);
 const [refreshVersion,setRefreshVersion]=useState(0),[pullRefreshing,setPullRefreshing]=useState(false);
 const [connection,setConnection]=useState<"connected"|"offline"|"notConfigured"|"checking">(
  API?"checking":"notConfigured");
 const [checking,setChecking]=useState(false);
 const ui=useUI(locale,calendar);
 useEffect(()=>{
  if(previousIdentity.current!==identityKey){
   previousIdentity.current=identityKey;
   // Never display a previous user's booking route while another user signs in.
   setRoute(null);setAccountSection("overview");setTab("account");
   setViewIdentity(identityKey);
  }
 },[identityKey]);
 useEffect(()=>{
  if(!patientId){setFavoriteSnapshot(null);return;}
  let active=true;
  setFavoriteSnapshot(null);
  // Device-local guest bookmarks are never imported into a signed-in
  // patient's server-owned favorites. Shared devices must not silently grant
  // one account the previous guest's browsing choices or alter saved data.
  void native.request<{favorites:Favorite[]}>("/v1/patient-favorites")
   .then(current=>{if(active)setFavoriteSnapshot({patientId,rows:current.favorites})})
   .catch(()=>{if(active)setFavoriteSnapshot(null)});
  return()=>{active=false};
 },[patientId,favoritesRefresh,native.request]);
 useEffect(()=>{
  let live=true;
  void Promise.all([AsyncStorage.getItem(PREF_KEY),AsyncStorage.getItem(SAVED_KEY)]).then(([prefs,saved])=>{
   if(!live)return;
   if(prefs)try{const value=JSON.parse(prefs) as {locale?:Language;calendar?:Calendar;city?:string};
    if(isLang(value.locale))setLocale(value.locale);
    if(isCal(value.calendar))setCalendar(value.calendar);
    if(typeof value.city==="string"&&value.city.length<=90)setCity(value.city);
   }catch{}
   if(saved)try{const value=JSON.parse(saved) as unknown;
    if(Array.isArray(value))setSavedIds([...new Set(value.filter(isId))].slice(0,30));
   }catch{}
  }).catch(()=>{}).finally(()=>{if(live)setReady(true)});
  return ()=>{live=false};
 },[]);
 useEffect(()=>{if(ready)void AsyncStorage.setItem(PREF_KEY,
  JSON.stringify({locale,calendar,city})).catch(()=>{})},[ready,locale,calendar,city]);
 useEffect(()=>{if(ready)void AsyncStorage.setItem(SAVED_KEY,
  JSON.stringify(savedIds)).catch(()=>{})},[ready,savedIds]);
 const checkApi=useCallback(async()=>{
  if(!API){setConnection("notConfigured");return}
  setChecking(true);setConnection("checking");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const response=await fetch(API+"/v1/public/status",{
    signal:controller.signal,headers:nativeApiHeaders(API)});
   const body=await nativeJsonResponse<unknown>(response);
   if(!nativeIsDandanlinkStatus(body))throw Error("INVALID_SERVER");
   setConnection("connected");
  }catch{setConnection("offline")}finally{clearTimeout(timer);setChecking(false)}
 },[]);
 useEffect(()=>{void checkApi()},[checkApi]);
 const onRefreshSettled=useCallback(()=>setPullRefreshing(false),[]);
 const pullToRefresh=useCallback(()=>{
  // Each screen owns its real fetch and explicitly completes the pull spinner.
  // A separate /status connectivity request is not a proxy for current data.
  setPullRefreshing(true);setRefreshVersion(x=>x+1);
 },[]);
 useEffect(()=>{
  // Static Account pages render immediately; private subviews have their own
  // loading/skeleton indicators and retries. Avoid an indefinite pull spinner.
  if(pullRefreshing&&tab==="account"&&!route)setPullRefreshing(false);
 },[pullRefreshing,tab,route]);
 useEffect(()=>{
  if(!pullRefreshing)return;
  const timeout=setTimeout(()=>setPullRefreshing(false),16500);
  return()=>clearTimeout(timeout);
 },[pullRefreshing]);
 function select(next:Tab){setRoute(null);setTab(next);setAccountSection("overview")}
 function accountPage(section:AccountSection){setRoute(null);setTab("account");setAccountSection(section)}
 function book(clinicId:string,dentistId?:string,booking?:Booking){
  setRoute({kind:"booking",clinicId,dentistId,booking,
   fromDentistId:route?.kind==="dentist"?route.dentistId:undefined,
   returnTab:booking?"appointments":tab});
 }
 function openClinic(clinicId:string,fromBookingId?:string){setRoute({kind:"clinic",clinicId,fromBookingId})}
 function openAppointment(bookingId:string){setRoute({kind:"appointment",bookingId})}
 function openDentist(clinicId:string,dentistId:string){setRoute({kind:"dentist",clinicId,dentistId})}
 function back(){
  if(route?.kind==="booking"){
   if(route.fromDentistId)setRoute({kind:"dentist",clinicId:route.clinicId,dentistId:route.fromDentistId});
   else if(route.returnTab==="appointments"){setRoute(null);setTab("appointments");}
   else setRoute({kind:"clinic",clinicId:route.clinicId});
  }else if(route?.kind==="dentist")setRoute({kind:"clinic",clinicId:route.clinicId});
  else if(route?.kind==="clinic"&&route.fromBookingId)
   setRoute({kind:"appointment",bookingId:route.fromBookingId});
  else setRoute(null);
 }
 function toggleFavorite(clinicId:string,dentistId?:string){
  const exists=favorites.some(f=>f.clinicId===clinicId&&f.dentistId===(dentistId||null));
  void native.request("/v1/patient-favorites",exists?"DELETE":"POST",
   {clinicId,dentistId:dentistId||null})
   .then(()=>setFavoritesRefresh(n=>n+1))
   .catch(err=>Alert.alert("DandanLink",patientError(err,locale)));
 }
 function save(id:string){
  if(native.account?.registered){toggleFavorite(id);return;}
  setSavedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id].slice(-30));
 }
 const isSaved=(id:string)=>native.account?.registered?
  favorites.some(f=>f.clinicId===id&&f.dentistId===null):savedIds.includes(id);
 function saveDentist(clinicId:string,dentistId:string){
  if(!native.account?.registered){select("account");return;}
  toggleFavorite(clinicId,dentistId);
 }
 const isSavedDentist=(clinicId:string,dentistId:string)=>favorites.some(f=>
  f.clinicId===clinicId&&f.dentistId===dentistId);
 useEffect(()=>{
  const subscription=BackHandler.addEventListener("hardwareBackPress",()=>{
   if(route){back();return true;}
   if(tab==="account"&&accountSection!=="overview"){setAccountSection("overview");return true;}
   if(tab!=="home"){select("home");return true;}
   return false;
  });
  return ()=>subscription.remove();
 },[route,tab,accountSection]);
 const screenTitle=route?.kind==="dentist"?ui.t("provider"):route?.kind==="appointment"?
  ui.t("appointments"):route?.kind==="booking"?
  (locale==="en"?"Book appointment":locale==="ps-AF"?"ملاقات":"رزرو نوبت"):ui.t("profile");
 // Block even a single render of a stale, private route during an account switch.
 if(viewIdentity!==identityKey)return <SafeAreaView style={s.root} edges={["top","bottom","left","right"]}>
  <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
   <ActivityIndicator color={colors.blue}/>
  </View>
 </SafeAreaView>;
 return <SafeAreaView style={s.root} edges={["top","bottom","left","right"]}>
  <StatusBar barStyle={route?"dark-content":"light-content"}
   backgroundColor={route?colors.white:colors.blue}/>
  {route?<View style={[s.detailTop,{flexDirection:ui.flow}]}>
    <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={ui.t("back")}
     style={s.backButton}>
     <View style={ui.rtl?{transform:[{rotate:"180deg"}]}:undefined}>
      <PatientIcon name="arrow" size={24} color={colors.blue}/>
     </View></Pressable>
    <Text style={s.detailTopTitle}>{screenTitle}</Text><View style={{width:44}}/>
   </View>:
   <View style={[s.mainHeader,{flexDirection:ui.flow}]}>
    <View style={[s.row,{flexDirection:ui.flow,alignItems:"center",gap:11}]}>
     <View style={s.brandSquare}><PatientIcon name="tooth" size={29} color={colors.blue}/></View>
     <View><Text style={s.brandText}>DandanLink</Text>
      <Text style={s.brandSmall}>{ui.t("intro")}</Text></View>
    </View>
    <View style={[s.row,{flexDirection:ui.flow,gap:8}]}>
     <Pressable accessibilityRole="button"
      accessibilityLabel={locale==="en"?"Switch patient or clinic workspace":
       locale==="ps-AF"?"د ناروغ او کلینیک بدلول":"تغییر محیط مریض و کلینیک"}
      onPress={()=>{void native.signOut().catch(()=>{}).finally(onChangeWorkspace)}}
      style={s.headerAccount}>
      <PatientIcon name="clinic" size={23} color={colors.white}/>
     </Pressable>
     {native.account?.registered&&<Pressable onPress={()=>accountPage("notifications")}
      accessibilityRole="button" accessibilityLabel={accountWords[locale].notifications}
      style={s.headerAccount}>
      <PatientIcon name="bell" size={24} color={colors.white}/>
     </Pressable>}
    <Pressable onPress={()=>select("account")} accessibilityLabel={ui.t("openSettings")}
     accessibilityRole="button" style={s.headerAccount}>
     <PatientIcon name="user" size={25} color={colors.white}/></Pressable>
    </View>
   </View>}
  <ScrollView key={(route?route.kind+":"+(route.kind==="appointment"?route.bookingId:route.clinicId)+":"+(route.kind==="dentist"?route.dentistId:""):(tab==="account"?tab+":"+accountSection:tab))+":"+refreshVersion+":"+(identityKey||"guest")}
   style={s.screenScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
   contentContainerStyle={s.screenContent}
   refreshControl={!route?<RefreshControl refreshing={pullRefreshing}
    onRefresh={pullToRefresh} tintColor={colors.blue}/>:undefined}>
   {route?.kind==="appointment"?<NativeAppointmentDetails bookingId={route.bookingId}
    locale={locale} calendar={calendar} onBack={back}
    onReschedule={b=>book(b.clinicId,b.dentistId,b)}
    onClinic={id=>openClinic(id,route.bookingId)}/>:
    route?.kind==="booking"?<NativeBookingWizard locale={locale} calendar={calendar}
    clinicId={route.clinicId} dentistId={route.dentistId} booking={route.booking}
    onAccount={()=>select("account")} onDone={()=>select("appointments")}/>:
    route?.kind==="clinic"?<ClinicScreen clinicId={route.clinicId} ui={ui}
     isSaved={isSaved(route.clinicId)} onSave={()=>save(route.clinicId)} onBook={()=>book(route.clinicId)}
     onOpenDentist={dentistId=>openDentist(route.clinicId,dentistId)}
     onReview={()=>accountPage("reviews")}/>:
    route?.kind==="dentist"?<DentistScreen clinicId={route.clinicId}
     dentistId={route.dentistId} ui={ui} onBackToClinic={()=>openClinic(route.clinicId)}
     onBook={()=>book(route.clinicId,route.dentistId)}
     isSaved={isSavedDentist(route.clinicId,route.dentistId)}
     onSave={()=>saveDentist(route.clinicId,route.dentistId)}
     onReview={()=>accountPage("reviews")}/>:
    tab==="home"?<HomeScreen ui={ui} city={city} onCity={setCity}
     onAppointment={openAppointment} onAppointments={()=>select("appointments")} onSaved={()=>select("saved")}
     onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}
     onSearch={q=>{setSearchSeed(q.trim());setSpecialtySeed("");select("explore")}}
     onBrowse={()=>{setSearchSeed("");setSpecialtySeed("");select("explore")}}
     onSpecialty={specialty=>{setSearchSeed("");setSpecialtySeed(specialty);select("explore")}}
     onClinic={openClinic} isSaved={isSaved} onSave={save}/>:
    tab==="explore"?<ExploreScreen ui={ui} city={city} onCity={setCity}
     seed={searchSeed} specialtySeed={specialtySeed} onClinic={openClinic} isSaved={isSaved} onSave={save}
     onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}/>:
    tab==="appointments"?<NativeAppointments locale={locale} calendar={calendar}
     onExplore={()=>select("explore")} onReschedule={b=>book(b.clinicId,b.dentistId,b)}
     onOpen={openAppointment} onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}/>:
    tab==="saved"?(native.account?.registered?<NativeSaved locale={locale}
     onClinic={openClinic} onDentist={openDentist} onExplore={()=>select("explore")}
      onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}/>:
     <SavedScreen ui={ui} ids={savedIds} onRemove={save}
      onClinic={openClinic} onExplore={()=>select("explore")}
      onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}/>):
    <View style={s.sectionGap}>
     {accountSection!=="overview"&&<Pressable style={[s.accountBack,{flexDirection:ui.flow}]}
      accessibilityRole="button" onPress={()=>setAccountSection("overview")}>
      <Text style={s.link}>{ui.rtl?"→":"←"}  {accountWords[locale].return}</Text>
     </Pressable>}
     {accountSection==="overview"?<AccountHub ui={ui} account={native.account}
      onSection={setAccountSection} onAppointments={()=>select("appointments")} onExplore={()=>select("explore")}/>:
      accountSection==="reviews"?<NativeReviews locale={locale}/>:
      accountSection==="family"?<NativeFamilyManager locale={locale}/>:
      accountSection==="records"?<NativeReleasedRecords locale={locale} calendar={calendar}/>:
      accountSection==="support"?<NativePatientSupport locale={locale}/>:
      accountSection==="settings"?<AccountScreen ui={ui} locale={locale} calendar={calendar} city={city}
       signedIn={Boolean(native.account?.registered)}
       onLocale={setLocale} onCalendar={setCalendar} onCity={setCity}
       checkApi={()=>{void checkApi()}} onOpenProfile={()=>setAccountSection("profile")}
       connection={connection} checking={checking}/>:
      accountSection==="security"?
       <AccountWebSection ui={ui} section={accountSection}
        registered={Boolean(native.account?.registered)}
        onBack={()=>setAccountSection("overview")} onProfile={()=>setAccountSection("profile")}/>:
       <NativeAccountArea locale={locale} calendar={calendar} city={city}
        section={accountSection}
        onLocale={setLocale} onCalendar={setCalendar} onCity={setCity}/>}
    </View>}
  </ScrollView>
  {(route?.kind==="clinic"||route?.kind==="dentist")&&<View style={s.stickyBookingBar}>
   <Pressable style={({pressed})=>[s.stickyBookingButton,pressed&&s.ctaPressed]}
    accessibilityRole="button" accessibilityLabel={locale==="en"?"Book appointment":
     locale==="ps-AF"?"د ملاقات وخت اخیستل":"رزرو نوبت"}
    onPress={()=>route?.kind==="dentist"?book(route.clinicId,route.dentistId):
     route?.kind==="clinic"?book(route.clinicId):undefined}>
    <PatientIcon name="calendar" size={21} color={colors.white}/>
    <Text style={s.stickyBookingText}>{locale==="en"?"Book appointment":
     locale==="ps-AF"?"د ملاقات وخت اخیستل":"رزرو نوبت"}</Text>
   </Pressable>
  </View>}
  {!route&&<View style={[s.bottomNav,{flexDirection:ui.flow}]}>
   {([["home","home"],["explore","search"],["appointments","calendar"],["saved","bookmark"],["account","user"]] as const).map(([value,icon])=>
    <Pressable accessibilityRole="tab" accessibilityState={{selected:tab===value}}
     accessibilityLabel={value==="appointments"?(locale==="en"?"Appointments":locale==="ps-AF"?"ملاقاتونه":"نوبت‌ها"):ui.t(value)} onPress={()=>select(value)} key={value}
     style={({pressed})=>[s.bottomNavItem,tab===value&&s.bottomNavItemActive,pressed&&s.bottomNavPressed]}>
     <View style={[s.bottomNavIconContainer,tab===value&&s.bottomNavIconContainerSelected]}>
      <PatientIcon name={icon} size={23}
       color={tab===value?colors.blue:colors.muted} filled={tab===value}/>
     </View>
     <Text numberOfLines={1} style={[s.bottomNavLabel,tab===value&&s.bottomNavLabelSelected]}>
      {value==="appointments"?(locale==="en"?"Appointments":locale==="ps-AF"?"ملاقاتونه":"نوبت‌ها"):ui.t(value)}</Text>
    </Pressable>)}
  </View>}
 </SafeAreaView>;
}
export default function App(){
 return <SafeAreaProvider>
  <WorkspaceRouter
   patient={reset=><NativeAuthProvider><PatientApp onChangeWorkspace={reset}/></NativeAuthProvider>}
   clinic={reset=><NativeClinicApp onChangeWorkspace={reset}/>}
  />
 </SafeAreaProvider>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.soft},
 screenScroll:{flex:1},
 screenContent:{paddingHorizontal:patientTheme.spacing.screen,paddingTop:20,paddingBottom:32},
 sectionGap:{gap:patientTheme.spacing.section},
 row:{alignItems:"center"},
 body:{fontSize:patientTheme.type.body,lineHeight:23,color:colors.muted},
 helpText:{fontSize:patientTheme.type.secondary,color:colors.muted,marginTop:10},
 card:{backgroundColor:colors.white,borderRadius:patientTheme.radius.card,borderWidth:1,
  borderColor:colors.line,padding:patientTheme.spacing.card,...patientTheme.shadow},
 sectionTitleRow:{alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:1},
 sectionTitle:{fontSize:patientTheme.type.section,fontWeight:"800",lineHeight:27,color:colors.navy},
 sectionSubtitle:{marginTop:4,fontSize:patientTheme.type.secondary},
 mainHeader:{minHeight:76,paddingHorizontal:18,backgroundColor:colors.blue,
  alignItems:"center",justifyContent:"space-between"},
 brandSquare:{width:44,height:44,borderRadius:15,backgroundColor:"#F3F8FF",
  alignItems:"center",justifyContent:"center"},
 brandText:{fontSize:21,color:colors.white,fontWeight:"800",letterSpacing:-.25},
 brandSmall:{fontSize:patientTheme.type.minimum,color:"#E1EDFF",marginTop:2},
 headerAccount:{width:46,height:46,borderRadius:15,
  borderWidth:1,borderColor:"#B9D7FF77",backgroundColor:"#2D72F4",alignItems:"center",justifyContent:"center"},
 detailTop:{minHeight:65,paddingHorizontal:18,backgroundColor:colors.white,
  borderBottomWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"space-between"},
 backButton:{height:46,width:46,borderRadius:14,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 detailTopTitle:{fontSize:patientTheme.type.section,fontWeight:"800",color:colors.navy,
  maxWidth:"70%"},
 accountSegment:{backgroundColor:colors.white,borderColor:colors.line,borderWidth:1,
  padding:5,borderRadius:16},
 quickActions:{gap:10},
 quickAction:{flex:1,minHeight:104,justifyContent:"center",alignItems:"center",
  backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,
  borderRadius:18,paddingHorizontal:6,paddingVertical:14,gap:8,...patientTheme.shadow},
 quickActionIconBox:{width:44,height:44,borderRadius:14,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 quickActionLabel:{fontSize:patientTheme.type.caption,fontWeight:"800",
  lineHeight:18,color:colors.navy,textAlign:"center"},
 accountGroup:{gap:10},
 accountRow:{minHeight:74,alignItems:"center",gap:12,paddingVertical:11},
 accountRowBorder:{borderTopWidth:1,borderColor:"#ECF1F7"},
 accountRowGlyph:{width:44,height:44,borderRadius:14,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 accountRowTitle:{fontSize:patientTheme.type.body,fontWeight:"800",color:colors.navy},
 accountRowSubtitle:{fontSize:patientTheme.type.caption,color:colors.muted,lineHeight:19,marginTop:4},
 accountRowArrow:{fontSize:24,color:colors.blue,fontWeight:"500"},
 accountBack:{minHeight:44,alignItems:"center",paddingVertical:9},

 bottomNav:{backgroundColor:colors.white,borderTopWidth:1,borderColor:colors.line,
  justifyContent:"space-around",paddingHorizontal:7,paddingTop:8,paddingBottom:6},
 bottomNavItem:{flex:1,minHeight:64,alignItems:"center",justifyContent:"center",
  borderRadius:14,marginHorizontal:2,borderWidth:1,borderColor:"transparent",gap:4},
 bottomNavItemActive:{backgroundColor:colors.pale,borderColor:"#D4E4FB"},
 bottomNavPressed:{opacity:.88},
 bottomNavIconContainer:{minHeight:28,minWidth:40,borderRadius:11,
  alignItems:"center",justifyContent:"center"},
 bottomNavIconContainerSelected:{backgroundColor:"#D9EAFE"},
 bottomNavLabel:{fontSize:patientTheme.type.minimum,lineHeight:18,fontWeight:"700",
  color:colors.muted,textAlign:"center"},
 bottomNavLabelSelected:{color:colors.blue,fontWeight:"800"},
 stickyBookingBar:{backgroundColor:colors.white,borderTopWidth:1,borderColor:colors.line,
  paddingHorizontal:18,paddingTop:12,paddingBottom:12},
 stickyBookingButton:{minHeight:54,backgroundColor:colors.blue,borderRadius:16,
  flexDirection:"row",justifyContent:"center",alignItems:"center",gap:11,
  paddingHorizontal:18,shadowColor:colors.blue,shadowOpacity:.16,shadowRadius:9,elevation:3},
 stickyBookingText:{fontSize:patientTheme.type.body,fontWeight:"800",color:colors.white},
 hero:{minHeight:204,backgroundColor:colors.blueDeep,borderRadius:24,
  padding:23,overflow:"hidden",justifyContent:"center"},
 heroCircle:{position:"absolute",width:200,height:200,borderRadius:100,
  backgroundColor:"#2878FF",opacity:.55,right:-55,top:-99},
 heroCircle2:{position:"absolute",width:130,height:130,borderRadius:70,
  backgroundColor:"#4D95FF",opacity:.26,left:-67,bottom:-66},
 heroKicker:{fontSize:patientTheme.type.minimum,fontWeight:"800",color:"#E1EEFF",letterSpacing:.6},
 heroHeadline:{fontSize:patientTheme.type.hero,fontWeight:"900",color:colors.white,
  lineHeight:38,marginTop:11,maxWidth:330},
 heroBody:{fontSize:patientTheme.type.body,color:"#E0EBFF",lineHeight:23,marginTop:9,maxWidth:335},
 searchBox:{marginTop:-1,gap:5},
 fieldLabel:{fontSize:13,fontWeight:"800",color:colors.navy,marginBottom:8},
 inputLine:{borderWidth:1,borderColor:colors.line,minHeight:52,
  borderRadius:14,backgroundColor:colors.white,alignItems:"center",
  gap:9,paddingHorizontal:13},
 exploreInput:{marginTop:0},
 inputIcon:{color:colors.blue,fontSize:26,fontWeight:"600"},
 searchInput:{fontSize:14,color:colors.ink,flex:1,paddingVertical:10},
 searchIconButton:{width:33,height:33,borderRadius:10,backgroundColor:colors.blue,
  justifyContent:"center",alignItems:"center"},
 searchIconButtonText:{fontSize:24,fontWeight:"700",color:colors.white},
 citySelector:{paddingVertical:10,paddingHorizontal:13,borderWidth:1,
  borderRadius:12,borderColor:colors.line,backgroundColor:colors.soft,
  minHeight:44,justifyContent:"center"},
 citySelectorText:{fontSize:12,fontWeight:"800",color:colors.blue},
 cityChoiceGroup:{flexWrap:"wrap",gap:8,marginTop:5},
 cta:{borderRadius:patientTheme.radius.control,backgroundColor:colors.blue,
  minHeight:patientTheme.controlHeight,
  alignItems:"center",justifyContent:"center",paddingHorizontal:16},
 ctaText:{fontWeight:"900",fontSize:14,color:colors.white,textAlign:"center"},
 ctaLight:{backgroundColor:colors.pale,borderWidth:1,borderColor:"#CCE0FF"},
 ctaTextLight:{color:colors.blue},
 ctaPressed:{opacity:.9,transform:[{scale:.988}]},
 disabled:{opacity:.4},
 clinicCard:{gap:12,padding:15},
 cardList:{gap:13},
 cardPicture:{width:91,height:91,borderRadius:14,overflow:"hidden"},
 photo:{width:"100%",height:"100%",borderRadius:12,backgroundColor:colors.pale},
 photoLarge:{height:220,borderRadius:17},
 photoFallback:{flex:1,backgroundColor:colors.pale,
  justifyContent:"center",alignItems:"center",borderRadius:12,gap:1},
 photoFallbackLarge:{width:"100%",height:220,borderRadius:17},
 photoFallbackIcon:{fontSize:32,fontWeight:"700",color:"#7FA6E4"},
 photoFallbackLabel:{fontSize:8,fontWeight:"800",color:"#90A9CF",letterSpacing:1},
 clinicName:{fontSize:patientTheme.type.cardTitle,fontWeight:"800",lineHeight:23,color:colors.navy},
 clinicSub:{fontSize:patientTheme.type.caption,color:colors.muted,lineHeight:19},
 tag:{borderRadius:20,backgroundColor:colors.pale,paddingHorizontal:9,
  paddingVertical:6,alignSelf:"flex-start",maxWidth:"100%"},
 tagText:{color:colors.blueDeep,fontSize:patientTheme.type.minimum,fontWeight:"800"},
 tagGreen:{backgroundColor:colors.greenSoft},
 tagTextGreen:{color:colors.green},
 heart:{width:37,height:37,alignItems:"center",justifyContent:"center",
  borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.white},
 heartSelected:{backgroundColor:colors.pale,borderColor:"#C9DEFF"},
 heartText:{fontSize:24,color:colors.gray,lineHeight:28},
 cardMeta:{justifyContent:"space-between",gap:12,
  borderTopWidth:1,borderBottomWidth:1,borderColor:"#EDF1F5",paddingVertical:12},
 metaLabel:{color:colors.muted,fontSize:patientTheme.type.caption,fontWeight:"700"},
 metaValue:{fontSize:patientTheme.type.body,fontWeight:"800",color:colors.navy,marginTop:4},
 metaTime:{fontSize:patientTheme.type.caption,color:colors.green},
 cardButton:{flex:1,backgroundColor:colors.white,borderWidth:1,
  borderColor:"#C6D9F5",minHeight:patientTheme.controlHeight,borderRadius:14,
  paddingHorizontal:8,alignItems:"center",justifyContent:"center"},
 iconButtonRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},
 cardButtonPrimary:{backgroundColor:colors.blue,borderColor:colors.blue},
 cardButtonText:{color:colors.blue,fontWeight:"800",fontSize:patientTheme.type.label},
 cardButtonPrimaryText:{color:colors.white,fontWeight:"800",fontSize:patientTheme.type.label},
 chip:{borderWidth:1,borderColor:colors.line,backgroundColor:colors.white,
  paddingHorizontal:13,paddingVertical:10,borderRadius:24},
 chipActive:{backgroundColor:colors.blue,borderColor:colors.blue},
 chipText:{fontSize:patientTheme.type.label,fontWeight:"700",color:colors.ink},
 chipActiveText:{color:colors.white},
 filterTrigger:{borderColor:"#AFCBF9",backgroundColor:colors.pale},
 filtersPanel:{gap:10},
 trustBanner:{backgroundColor:"#EAF5F1",borderRadius:15,padding:18,
  borderWidth:1,borderColor:"#D7E8E2"},
 trustTitle:{fontWeight:"900",color:"#206856",fontSize:15},
 trustBody:{fontSize:12,color:"#4C7B72",marginTop:6},
 blank:{alignItems:"center",gap:12,paddingVertical:34,paddingHorizontal:20},
 emptyTitle:{fontSize:17,fontWeight:"900",textAlign:"center",color:colors.navy},
 emptyCopy:{fontSize:13,textAlign:"center",lineHeight:22,color:colors.muted},
 iconSquare:{height:44,width:44,borderRadius:13,backgroundColor:colors.pale,
  justifyContent:"center",alignItems:"center"},
 iconSquareBlue:{backgroundColor:colors.blue},
 iconText:{fontSize:23,color:colors.blue,fontWeight:"700"},
 skeletonCard:{backgroundColor:colors.white,borderRadius:17,
  borderWidth:1,borderColor:colors.line,padding:17},
 skeletonImage:{width:84,height:84,borderRadius:13,backgroundColor:"#E7EDF5"},
 skeletonLine:{height:13,borderRadius:7,backgroundColor:"#E7EDF5"},
 detailPhotoFrame:{height:220,borderRadius:18,overflow:"hidden"},
 photoCount:{position:"absolute",right:12,bottom:12,
  backgroundColor:"#162E55DD",paddingHorizontal:10,paddingVertical:6,borderRadius:12},
 photoCountText:{fontWeight:"900",color:colors.white,fontSize:11},
 thumbnail:{borderRadius:10,borderWidth:2,borderColor:colors.line,padding:2},
 thumbnailActive:{borderColor:colors.blue},
 thumbImage:{width:52,height:48,borderRadius:7},
 detailTitle:{fontSize:23,fontWeight:"900",color:colors.navy,lineHeight:29},
 detailAddress:{marginTop:8},
 tabs:{gap:4,padding:2,paddingVertical:6},
 detailTab:{paddingHorizontal:16,paddingVertical:13,borderBottomWidth:3,
  borderBottomColor:"transparent",borderRadius:9},
 detailTabActive:{borderBottomColor:colors.blue,backgroundColor:colors.pale},
 detailTabText:{fontWeight:"800",fontSize:patientTheme.type.label,color:colors.muted},
 detailTabTextActive:{color:colors.blue},
 overviewStats:{backgroundColor:colors.white,borderRadius:17,
  padding:16,borderWidth:1,borderColor:colors.line,alignItems:"center"},
 overviewStat:{flex:1,alignItems:"center",gap:5},
 overviewCount:{fontSize:24,fontWeight:"900",color:colors.blue},
 overviewLabel:{fontSize:patientTheme.type.caption,color:colors.muted,fontWeight:"700",textAlign:"center"},
 overviewDivider:{width:1,height:38,backgroundColor:colors.line},
 doctorRow:{paddingVertical:14,alignItems:"center",gap:12,
  borderBottomWidth:1,borderColor:"#EDF2F6"},
 doctorAvatar:{width:49,height:49,borderRadius:14,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 doctorInitial:{fontSize:21,color:colors.blue,fontWeight:"900"},
 doctorName:{fontWeight:"900",fontSize:14,color:colors.navy},
 verifiedTiny:{color:colors.green,fontSize:11,fontWeight:"800",lineHeight:18},
 forward:{fontSize:25,color:colors.blue},
 serviceRow:{borderBottomWidth:1,borderColor:"#ECF0F5",paddingVertical:15,
  gap:12,alignItems:"center"},
 serviceName:{fontSize:patientTheme.type.body,color:colors.navy,fontWeight:"800",lineHeight:22},
 serviceSub:{fontSize:patientTheme.type.caption,color:colors.muted,lineHeight:19,marginTop:3},
 serviceFee:{fontSize:patientTheme.type.label,fontWeight:"800",color:colors.blueDeep,maxWidth:120},
 simpleFact:{paddingVertical:13,borderBottomWidth:1,borderColor:colors.line,
  justifyContent:"space-between",alignItems:"center",gap:12},
 largeAvatar:{width:80,height:80,borderRadius:22,backgroundColor:colors.pale,
  justifyContent:"center",alignItems:"center"},
 largeAvatarText:{fontSize:38,fontWeight:"900",color:colors.blue},
 dentistHero:{gap:5},
 ribbon:{gap:8,paddingVertical:6},
 dayChip:{width:64,minHeight:77,borderRadius:14,borderWidth:1,
  borderColor:colors.line,backgroundColor:colors.soft,
  alignItems:"center",justifyContent:"center",gap:3,padding:6},
 dayChipSelected:{backgroundColor:colors.blue,borderColor:colors.blue},
 dayWeek:{fontSize:10,color:colors.muted,fontWeight:"800"},
 dayNumber:{fontSize:22,color:colors.navy,fontWeight:"900"},
 dayMonth:{fontSize:10,color:colors.gray},
 daySelectedText:{color:colors.white},
 slotList:{gap:10,marginTop:15},
 slotGrid:{flexWrap:"wrap",gap:8},
 slotItem:{width:"47%",backgroundColor:colors.pale,borderRadius:12,
  padding:12,borderWidth:1,borderColor:"#DCE7F8",gap:4},
 slotTime:{fontSize:13,color:colors.blue,fontWeight:"900"},
 slotSub:{fontSize:patientTheme.type.caption,color:colors.muted,lineHeight:19},
 slotFee:{fontSize:patientTheme.type.label,color:colors.navy,fontWeight:"800"},
 scheduleEmpty:{padding:24,alignItems:"center",gap:11},
 notice:{backgroundColor:colors.amberSoft,borderRadius:12,padding:12,
  gap:9,marginTop:13,borderWidth:1,borderColor:"#F3E1B9"},
 noticeIcon:{fontSize:17,fontWeight:"800",color:colors.amber},
 noticeText:{flex:1,fontSize:11,color:colors.amber,lineHeight:19},
 hoursLine:{minHeight:45,alignItems:"center",justifyContent:"space-between",
  borderBottomWidth:1,borderColor:colors.line,gap:10},
 hoursDay:{fontSize:12,fontWeight:"800",flex:1},
 hoursValue:{fontSize:12,fontWeight:"700"},
 detailFooter:{paddingBottom:12},
 footerNotice:{fontSize:patientTheme.type.caption,lineHeight:20,color:colors.muted},
 centerLoading:{minHeight:93,alignItems:"center",justifyContent:"center"},
 ribbonWrap:{paddingTop:10},
 savedThumb:{width:80,height:80,borderRadius:13,overflow:"hidden"},
 guestCard:{borderRadius:17,backgroundColor:colors.blue,padding:19,gap:14,
  flexDirection:"row",alignItems:"center"},
 guestName:{fontSize:17,fontWeight:"900",color:colors.white},
 guestHint:{fontSize:12,color:"#E6EFFF",marginTop:6},
 statusDot:{width:10,height:10,borderRadius:5},
 trustLine:{paddingVertical:11,gap:13,alignItems:"center",
  borderBottomWidth:1,borderColor:colors.line},
 trustNumber:{height:34,width:34,borderRadius:10,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 trustNumberText:{fontSize:13,fontWeight:"900",color:colors.blue},
 link:{fontSize:12,fontWeight:"900",color:colors.blue},
 pageButton:{paddingHorizontal:17,paddingVertical:12,borderRadius:12,
  backgroundColor:colors.pale},
 pageText:{fontSize:12,fontWeight:"800",color:colors.blue}
});
