import React,{useCallback,useEffect,useState} from "react";
import {
 ActivityIndicator,Image,Linking,Pressable,RefreshControl,ScrollView,
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
type Tab="home"|"explore"|"saved"|"account";
type Route={kind:"clinic";clinicId:string}|{kind:"dentist";clinicId:string;dentistId:string};
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
 blue:"#075BF2",blueDeep:"#1247BE",navy:"#11274A",ink:"#263854",muted:"#6A788D",
 pale:"#EEF4FF",soft:"#F4F7FC",white:"#FFFFFF",line:"#E2EAF2",
 green:"#138464",greenSoft:"#E7F8F0",amber:"#9A6514",amberSoft:"#FFF6DF",
 gray:"#A3B0BF",red:"#BC4854"
};
const en={
 home:"Home",explore:"Explore",saved:"Saved",account:"Account",back:"Back",
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
 verify:"Verified",preview:"Schedule preview",notBooked:"Not reservable online yet",
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
 timePreviewBody:"These times reflect the clinic's schedule, but online booking is not live. Contact the clinic to confirm.",
 noSlots:"No candidate times available on this date.",slots:"available previews",
 pickDate:"Select a future date",minutes:"min",closed:"Closed",
 openScheduled:"Within published hours",closedScheduled:"Outside published hours",
 today:"Today",timezone:"All dates and times use Afghanistan time.",
 contactClinic:"Contact the clinic directly",contactHelp:"Phone numbers are those approved for this public listing.",
 save:"Save",remove:"Remove",savedClinics:"Saved clinics",savedIntro:"Your saved public clinic shortcuts are stored on this device only.",
 emptySaved:"Nothing saved yet",emptySavedSub:"Use the heart on a verified clinic to keep it here.",
 noLongerPublished:"Some previously saved clinics are no longer published and are not shown.",
 discover:"Discover clinics",notices:"Important",
 later:"Online appointments, patient history and clinical records will arrive in later phases.",
 accountTitle:"Patient account & preferences",guest:"Browsing as a guest",
 guestSub:"Public clinic discovery is available without signing in.",
 secureAccount:"Open secure patient account",secureHelp:"Sign in, edit your profile, manage family permissions and review privacy on the patient website.",
 webMissing:"Set EXPO_PUBLIC_PATIENT_WEB_URL to enable the secure patient account link on this device.",
 prefs:"App preferences",language:"Language",calendar:"Calendar",
 solar:"Solar Hijri",gregorian:"Gregorian",network:"Connection",
 connected:"Connected to verified clinic directory",checking:"Checking connection…",notConfigured:"API not configured",
 offline:"Cannot reach the server",retry:"Retry",offlineHelp:"Configure EXPO_PUBLIC_API_URL with a reachable HTTPS API or your local LAN address.",
 refreshing:"Refreshing…",refresh:"Refresh",loading:"Loading verified clinics…",
 noMock:"The app never generates dentists, ratings, appointment bookings or fees.",
 info:"About DandanLink",howWorks:"How trust works",stepOne:"Only reviewed clinics are listed.",
 stepTwo:"Dentist credentials and affiliation must be current.",
 stepThree:"Price and hours are displayed from approved clinic records.",
 pending:"Online booking is not yet available. Please contact the clinic.",
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
 verify:"تأییدشده",preview:"نمایش تقسیم اوقات",notBooked:"رزرو آنلاین هنوز فعال نیست",
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
 timePreviewBody:"این وقت‌ها مطابق تقسیم اوقات کلینیک‌اند؛ رزرو آنلاین هنوز فعال نیست. برای تأیید تماس بگیرید.",
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
 later:"رزرو آنلاین، تاریخچه نوبت و اسناد صحی در مراحل آینده اضافه می‌شوند.",
 accountTitle:"حساب مریض و تنظیمات",guest:"به‌صورت مهمان هستید",
 guestSub:"برای جستجوی کلینیک به ورود ضرورت نیست.",
 secureAccount:"بازکردن حساب مصون مریض",
 secureHelp:"ورود، ویرایش پروفایل، مدیریت اجازه خانواده و حریم خصوصی در وبسایت مریض انجام می‌شود.",
 webMissing:"برای لینک حساب مصون، EXPO_PUBLIC_PATIENT_WEB_URL را تنظیم کنید.",
 prefs:"تنظیمات برنامه",language:"زبان",calendar:"تقویم",
 solar:"هجری شمسی",gregorian:"میلادی",network:"ارتباط",
 connected:"اتصال با فهرست کلینیک‌های تأییدشده برقرار است",checking:"در حال بررسی ارتباط…",
 notConfigured:"سرور تنظیم نشده",offline:"ارتباط با سرور برقرار نشد",
 retry:"دوباره کوشش",offlineHelp:"EXPO_PUBLIC_API_URL را به آدرس HTTPS یا آدرس قابل دسترس شبکه وصل کنید.",
 refreshing:"در حال تازه‌سازی…",refresh:"تازه‌سازی",loading:"کلینیک‌های تأییدشده دریافت می‌شود…",
 noMock:"این برنامه داکتر، امتیاز، نوبت یا قیمت ساختگی نمی‌سازد.",
 info:"درباره دندان‌لینک",howWorks:"چگونه اعتبار سنجی می‌شود",
 stepOne:"فقط کلینیک‌های بررسی‌شده نمایش داده می‌شوند.",
 stepTwo:"اسناد حرفه‌ای و ارتباط داکتر باید معتبر باشند.",
 stepThree:"قیمت‌ها و ساعت‌ها از معلومات تأییدشده کلینیک می‌آیند.",
 pending:"رزرو آنلاین هنوز فعال نیست؛ با کلینیک تماس بگیرید.",
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
 verify:"تایید شوی",preview:"د وختونو کتنه",notBooked:"آنلاین وخت اخیستل لا نه دي فعال",
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
 timePreviewBody:"دا د کلینیک د مهال‌وېش وختونه دي؛ آنلاین نوبت لا نشته. د تایید لپاره زنګ ووهئ.",
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
 later:"آنلاین نوبتونه، تاریخچه او طبي اسناد په راتلونکو پړاوونو کې راځي.",
 accountTitle:"د ناروغ حساب او غوره توبونه",guest:"د مېلمه په توګه ګورئ",
 guestSub:"د کلینیکونو د لټون لپاره ننوتل نه دي پکار.",
 secureAccount:"د ناروغ خوندي حساب پرانیزئ",
 secureHelp:"ننوتل، د پروفایل سمول، د کورنۍ اجازې او محرمیت د ناروغ په وېبپاڼه کې دي.",
 webMissing:"د خوندي حساب لینک لپاره EXPO_PUBLIC_PATIENT_WEB_URL وټاکئ.",
 prefs:"د اپ غوره توبونه",language:"ژبه",calendar:"کلیز",
 solar:"هجري لمریز",gregorian:"میلادي",network:"اړیکه",
 connected:"د تایید شوو کلینیکونو سره اړیکه شته",checking:"اړیکه کتل کېږي…",
 notConfigured:"API نه دی برابر شوی",offline:"له سرور سره اړیکه نشته",
 retry:"بیا هڅه",offlineHelp:"EXPO_PUBLIC_API_URL یو لاسرسي وړ HTTPS یا محلي شبکې پته وټاکئ.",
 refreshing:"تازه کېږي…",refresh:"تازه کول",loading:"تایید شوي کلینیکونه ترلاسه کېږي…",
 noMock:"اپ جعلي ډاکټران، نمرې، نوبتونه یا بیې نه جوړوي.",
 info:"د دندان‌لینک په اړه",howWorks:"باور څنګه تاییدېږي",
 stepOne:"یوازې کتل شوي کلینیکونه ښودل کېږي.",
 stepTwo:"د ډاکټر اسناد او تړاو باید اوس هم معتبر وي.",
 stepThree:"بیې او کاري ساعتونه له تایید شوو کلینیکونو اخیستل کېږي.",
 pending:"آنلاین نوبت لا نشته؛ کلینیک ته زنګ ووهئ.",
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
 const response=await fetch(API+"/v1/discovery"+path,{signal,headers:{Accept:"application/json"}});
 if(!response.ok)throw new Error(response.status===404?"PROFILE_UNAVAILABLE":"SERVICE_UNAVAILABLE");
 return response.json() as Promise<T>;
}
function usePublic<T>(path:string|null):Remote<T>{
 const [state,setState]=useState<{loading:boolean;data:T|null;error:string|null}>({
 loading:!!path,data:null,error:null});
 const [reload,setReload]=useState(0);
 useEffect(()=>{
  if(path===null){setState({loading:false,data:null,error:null});return}
  let active=true;const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  setState({loading:true,data:null,error:null});
  void fetchPublic<T>(path,controller.signal).then(data=>{
   if(active)setState({loading:false,data,error:null});
  }).catch(e=>{
   if(active)setState({loading:false,data:null,error:e instanceof Error?e.message:"SERVICE_UNAVAILABLE"});
  }).finally(()=>clearTimeout(timer));
  return ()=>{active=false;clearTimeout(timer);controller.abort()};
 },[path,reload]);
 return {...state,refresh:()=>setReload(x=>x+1)};
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
 return <View style={[s.iconSquare,filled&&s.iconSquareBlue]}>
  <Text style={[s.iconText,filled&&{color:colors.white}]}>{glyph}</Text>
 </View>;
}
function CardShell({children,style}:{children:React.ReactNode;style?:object}){
 return <View style={[s.card,style]}>{children}</View>;
}
function CTA({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled}
 onPress={onPress} style={[s.cta,secondary&&s.ctaLight,disabled&&s.disabled]}>
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
 return <View style={s.cardList}><View style={{alignItems:"center",paddingVertical:9}}>
  <ActivityIndicator color={colors.blue}/><Text style={s.helpText}>{ui.t("loading")}</Text></View>
  {[0,1].map(i=><View key={i} style={s.skeletonCard}>
   <View style={[s.row,{flexDirection:ui.flow,gap:12}]}>
    <View style={s.skeletonImage}/><View style={{flex:1,gap:12}}>
     <View style={[s.skeletonLine,{width:"80%"}]}/><View style={[s.skeletonLine,{width:"52%"}]}/>
     <View style={[s.skeletonLine,{width:"66%"}]}/></View></View>
   <View style={[s.skeletonLine,{width:"100%",height:38,marginTop:18}]}/>
  </View>)}</View>;
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
  <Text style={[s.photoFallbackIcon,large&&{fontSize:56}]}>✧</Text>
  <Text style={s.photoFallbackLabel}>DANDANLINK</Text></View>;
 const url=photo.url.startsWith("/")?API+photo.url:photo.url;
 return <Image source={{uri:url}} resizeMode="cover"
  onError={()=>setBad(true)}
  accessibilityLabel={photo.caption||label} style={[s.photo,large&&s.photoLarge]}/>;
}
function SavedButton({saved,onPress,ui}:{saved:boolean;onPress:()=>void;ui:UI}){
 return <Pressable style={[s.heart,saved&&s.heartSelected]}
  accessibilityRole="button" accessibilityState={{selected:saved}}
  accessibilityLabel={ui.t(saved?"removeFromSaved":"addToSaved")} onPress={onPress}>
  <Text style={[s.heartText,saved&&{color:colors.blue}]}>{saved?"♥":"♡"}</Text>
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
    accessibilityRole="button"><Text style={s.cardButtonText}>☎  {ui.t("call")}</Text></Pressable>
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
    <Text style={s.noticeIcon}>ⓘ</Text><Text style={[s.noticeText,{textAlign:ui.align}]}>
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
function ClinicScreen({clinicId,ui,onOpenDentist,isSaved,onSave}:{clinicId:string;ui:UI;
 onOpenDentist:(id:string)=>void;isSaved:boolean;onSave:()=>void}){
 const detail=usePublic<ClinicDetail>("/clinics/"+encodeURIComponent(clinicId));
 const [tab,setTab]=useState<"overview"|"dentists"|"services"|"gallery"|"hours"|"times">("overview");
 const [photo,setPhoto]=useState(0);
 if(detail.loading)return <LoadingCards ui={ui}/>;
 if(detail.error||!detail.data)return <Failure ui={ui} error={detail.error} retry={detail.refresh}/>;
 const {clinic,profile:p,hours}=detail.data;
 const mapUrl="https://www.openstreetmap.org/?mlat="+p.latitude+
  "&mlon="+p.longitude+"#map=16/"+p.latitude+"/"+p.longitude;
 const tabs:["overview"|"dentists"|"services"|"gallery"|"hours"|"times",string][]=[
  ["overview",ui.t("overview")],["dentists",ui.t("dentists")],
  ["services",ui.t("treatments")],["gallery",ui.t("gallery")],
  ["hours",ui.t("hours")],["times",ui.t("times")]];
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
   <View style={[s.row,{flexDirection:ui.flow,gap:9,marginTop:18}]}>
    <Pressable style={[s.cardButton,s.cardButtonPrimary]} onPress={()=>{
     void Linking.openURL("tel:"+clinic.phone)}}><Text style={s.cardButtonPrimaryText}>
     ☎  {ui.t("call")}</Text></Pressable>
    <Pressable style={s.cardButton} onPress={()=>{void Linking.openURL(mapUrl)}}>
     <Text style={s.cardButtonText}>⌖  {ui.t("directions")}</Text></Pressable>
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
  {tab==="gallery"&&<CardShell>
   <SectionHead ui={ui} title={ui.t("gallery")} sub={ui.t("photoDesc")}/>
   {p.photos.length?p.photos.map((x,i)=><Pressable key={x.id} onPress={()=>setPhoto(i)}
    style={{marginBottom:13}}><PublishedPhoto large photo={x} label={clinic.name}/>
    {x.caption&&<TextLine ui={ui} style={{marginTop:6}}>{x.caption}</TextLine>}</Pressable>):
    <Empty ui={ui} heading={ui.t("photosEmpty")} detail={ui.t("photoDesc")}/>}
  </CardShell>}
  {tab==="hours"&&<HoursCard hours={hours} ui={ui}/>}
  {tab==="times"&&<Availability ui={ui} clinicId={clinicId}
   dentists={p.dentists} services={p.services} horizon={p.bookingRules.horizonDays}/>}
  <View style={s.detailFooter}><TextLine ui={ui} style={s.footerNotice}>
   {ui.t("noFake")} {ui.t("pending")}</TextLine></View>
 </View>;
}
function DentistScreen({clinicId,dentistId,ui,onBackToClinic}:{clinicId:string;
 dentistId:string;ui:UI;onBackToClinic:()=>void}){
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
   <Pressable onPress={onBackToClinic} style={[s.row,{flexDirection:ui.flow,gap:8,marginTop:17}]}>
    <Text style={[s.link,{textAlign:ui.align,flex:1}]}>{clinic.name} ›</Text></Pressable>
   <TextLine ui={ui} style={{marginTop:8}}>⌖ {cityLabel(clinic.city,ui.locale)}, {clinic.province}</TextLine>
   <View style={[s.row,{flexDirection:ui.flow,gap:10,marginTop:16}]}>
    <Pressable style={[s.cardButton,s.cardButtonPrimary]} onPress={()=>{
     void Linking.openURL("tel:"+clinic.phone)}}>
     <Text style={s.cardButtonPrimaryText}>☎  {ui.t("call")}</Text></Pressable>
    <Pressable onPress={()=>setTab("times")} style={s.cardButton}>
     <Text style={s.cardButtonText}>▦  {ui.t("times")}</Text></Pressable>
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
  </>}
  {tab==="services"&&<ServicesCard ui={ui} services={services}/>}
  {tab==="times"&&<Availability ui={ui} clinicId={clinicId}
   doctorId={dentistId} dentists={[d]} services={services} horizon={bookingRules.horizonDays}/>}
  <TextLine ui={ui} style={s.footerNotice}>{ui.t("medical")}</TextLine>
 </View>;
}
function HomeScreen({ui,city,onCity,onSearch,onBrowse,onClinic,isSaved,onSave}:{ui:UI;
 city:string;onCity:(v:string)=>void;onSearch:(q:string)=>void;onBrowse:()=>void;
 onClinic:(id:string)=>void;isSaved:(id:string)=>boolean;onSave:(id:string)=>void}){
 const [search,setSearch]=useState(""),[showCity,setShowCity]=useState(false);
 const facets=usePublic<Facets>("/facets");
 const result=usePublic<Results>(urlSearch({city,limit:4,page:1}));
 const choices=facets.data?.cities||[];
 return <View style={s.sectionGap}>
  <View style={s.hero}><View style={s.heroCircle}/><View style={s.heroCircle2}/>
   <Text style={[s.heroKicker,{textAlign:ui.align}]}>{ui.t("introTag")}</Text>
   <Text style={[s.heroHeadline,{textAlign:ui.align}]}>{ui.t("goodCare")}</Text>
   <Text style={[s.heroBody,{textAlign:ui.align}]}>{ui.t("heroBody")}</Text>
   <View style={[s.row,{flexDirection:ui.flow,gap:8,marginTop:15}]}>
    <Tag positive label={ui.t("verify")}/><Tag label={ui.t("free")}/>
   </View>
  </View>
  <CardShell style={s.searchBox}>
   <Text style={[s.fieldLabel,{textAlign:ui.align}]}>{ui.t("findLabel")}</Text>
   <View style={[s.inputLine,{flexDirection:ui.flow}]}>
    <Text style={s.inputIcon}>⌕</Text>
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
    {facets.data!.specialties.slice(0,6).map(x=><Tag key={x.name}
     label={x.name}/>)}</View></View>}
  <View style={s.trustBanner}><Text style={[s.trustTitle,{textAlign:ui.align}]}>
   ✓  {ui.t("trust")}</Text>
   <TextLine ui={ui} style={s.trustBody}>{ui.t("trustBody")}</TextLine></View>
 </View>;
}
function ExploreScreen({ui,city,onCity,seed,onClinic,isSaved,onSave}:{ui:UI;
 city:string;onCity:(v:string)=>void;seed:string;onClinic:(id:string)=>void;
 isSaved:(id:string)=>boolean;onSave:(id:string)=>void}){
 const [draft,setDraft]=useState(seed),[q,setQ]=useState(seed),
 [specialty,setSpecialty]=useState(""),[service,setService]=useState(""),
 [sort,setSort]=useState("relevance"),[filterOpen,setFilterOpen]=useState(false),
 [page,setPage]=useState(1);
 useEffect(()=>{setDraft(seed);setQ(seed);setPage(1)},[seed]);
 const facets=usePublic<Facets>("/facets");
 const results=usePublic<Results>(urlSearch({q,city,specialty,service,sort,page,limit:8}));
 function selectCity(x:string){onCity(x);setPage(1)}
 function reset(){setDraft("");setQ("");setSpecialty("");setService("");setSort("relevance");setPage(1);selectCity("")}
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("listings")} sub={ui.t("intro")}/>
  <View style={[s.inputLine,s.exploreInput,{flexDirection:ui.flow}]}>
   <Text style={s.inputIcon}>⌕</Text>
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
function SavedScreen({ui,ids,onRemove,onClinic,onExplore}:{ui:UI;ids:string[];
 onRemove:(id:string)=>void;onClinic:(id:string)=>void;onExplore:()=>void}){
 const [state,setState]=useState<{loading:boolean;clinics:ClinicDetail[];missing:number;error:boolean}>({
  loading:false,clinics:[],missing:0,error:false});
 const [reload,setReload]=useState(0);
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
function AccountScreen({ui,locale,calendar,city,onLocale,onCalendar,onCity,checkApi,
 connection,checking}:{ui:UI;locale:Language;calendar:Calendar;city:string;
 onLocale:(x:Language)=>void;onCalendar:(x:Calendar)=>void;onCity:(x:string)=>void;
 checkApi:()=>void;connection:"connected"|"offline"|"notConfigured"|"checking";checking:boolean}){
 const facets=usePublic<Facets>("/facets");
 const [showCities,setShowCities]=useState(false);
 return <View style={s.sectionGap}>
  <SectionHead ui={ui} title={ui.t("accountTitle")} sub={ui.t("guestSub")}/>
  <View style={s.guestCard}><Icon glyph="☺" filled/>
   <View style={{flex:1}}><Text style={[s.guestName,{textAlign:ui.align}]}>{ui.t("guest")}</Text>
    <TextLine ui={ui} style={s.guestHint}>{ui.t("secureHelp")}</TextLine></View></View>
  {PATIENT_WEB?<CTA label={ui.t("secureAccount")+"  ›"} onPress={()=>{
   void Linking.openURL(PATIENT_WEB+"/account")}}/>:
   <TextLine ui={ui} style={s.footerNotice}>{ui.t("webMissing")}</TextLine>}
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
  <View style={s.notice}><TextLine ui={ui}>{ui.t("medical")} {ui.t("later")}</TextLine></View>
 </View>;
}
function PatientApp(){
 const [locale,setLocale]=useState<Language>("fa-AF"),[calendar,setCalendar]=useState<Calendar>("solar_hijri");
 const [city,setCity]=useState("Kabul"),[ready,setReady]=useState(false);
 const [tab,setTab]=useState<Tab>("home"),[route,setRoute]=useState<Route|null>(null);
 const [searchSeed,setSearchSeed]=useState(""),[savedIds,setSavedIds]=useState<string[]>([]);
 const [connection,setConnection]=useState<"connected"|"offline"|"notConfigured"|"checking">(
  API?"checking":"notConfigured");
 const [checking,setChecking]=useState(false);
 const ui=useUI(locale,calendar);
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
   const response=await fetch(API+"/v1/public/status",{signal:controller.signal});
   if(!response.ok)throw Error("status");
   setConnection("connected");
  }catch{setConnection("offline")}finally{clearTimeout(timer);setChecking(false)}
 },[]);
 useEffect(()=>{void checkApi()},[checkApi]);
 function select(next:Tab){setRoute(null);setTab(next)}
 function openClinic(clinicId:string){setRoute({kind:"clinic",clinicId})}
 function openDentist(clinicId:string,dentistId:string){setRoute({kind:"dentist",clinicId,dentistId})}
 function back(){if(route?.kind==="dentist")setRoute({kind:"clinic",clinicId:route.clinicId});
  else setRoute(null)}
 function save(id:string){setSavedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):
  [...ids,id].slice(-30))}
 const isSaved=(id:string)=>savedIds.includes(id);
 const screenTitle=route?.kind==="dentist"?ui.t("provider"):ui.t("profile");
 return <SafeAreaView style={s.root} edges={["top","bottom","left","right"]}>
  <StatusBar barStyle={route?"dark-content":"light-content"}
   backgroundColor={route?colors.white:colors.blue}/>
  {route?<View style={[s.detailTop,{flexDirection:ui.flow}]}>
    <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={ui.t("back")}
     style={s.backButton}><Text style={s.backGlyph}>{ui.rtl?"→":"←"}</Text></Pressable>
    <Text style={s.detailTopTitle}>{screenTitle}</Text><View style={{width:44}}/>
   </View>:
   <View style={[s.mainHeader,{flexDirection:ui.flow}]}>
    <View style={[s.row,{flexDirection:ui.flow,alignItems:"center",gap:11}]}>
     <View style={s.brandSquare}><Text style={s.brandGlyph}>✦</Text></View>
     <View><Text style={s.brandText}>DandanLink</Text>
      <Text style={s.brandSmall}>{ui.t("intro")}</Text></View>
    </View>
    <Pressable onPress={()=>select("account")} accessibilityLabel={ui.t("openSettings")}
     accessibilityRole="button" style={s.headerAccount}>
     <Text style={s.headerAccountGlyph}>☺</Text></Pressable>
   </View>}
  <ScrollView key={route?route.kind+":"+route.clinicId+":"+(route.kind==="dentist"?route.dentistId:""):tab}
   style={s.screenScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
   contentContainerStyle={s.screenContent}
   refreshControl={!route?<RefreshControl refreshing={checking}
    onRefresh={checkApi} tintColor={colors.blue}/>:undefined}>
   {route?.kind==="clinic"?<ClinicScreen clinicId={route.clinicId} ui={ui}
    isSaved={isSaved(route.clinicId)} onSave={()=>save(route.clinicId)}
    onOpenDentist={dentistId=>openDentist(route.clinicId,dentistId)}/>:
    route?.kind==="dentist"?<DentistScreen clinicId={route.clinicId}
     dentistId={route.dentistId} ui={ui} onBackToClinic={()=>openClinic(route.clinicId)}/>:
    tab==="home"?<HomeScreen ui={ui} city={city} onCity={setCity}
     onSearch={q=>{setSearchSeed(q);select("explore")}} onBrowse={()=>{setSearchSeed("");select("explore")}}
     onClinic={openClinic} isSaved={isSaved} onSave={save}/>:
    tab==="explore"?<ExploreScreen ui={ui} city={city} onCity={setCity}
     seed={searchSeed} onClinic={openClinic} isSaved={isSaved} onSave={save}/>:
    tab==="saved"?<SavedScreen ui={ui} ids={savedIds} onRemove={save}
     onClinic={openClinic} onExplore={()=>select("explore")}/>:
    <AccountScreen ui={ui} locale={locale} calendar={calendar} city={city}
     onLocale={setLocale} onCalendar={setCalendar} onCity={setCity}
     checkApi={()=>{void checkApi()}} connection={connection} checking={checking}/>}
  </ScrollView>
  {!route&&<View style={[s.bottomNav,{flexDirection:ui.flow}]}>
   {([["home","⌂"],["explore","⌕"],["saved","♡"],["account","☺"]] as const).map(([value,icon])=>
    <Pressable accessibilityRole="tab" accessibilityState={{selected:tab===value}}
     accessibilityLabel={ui.t(value)} onPress={()=>select(value)} key={value}
     style={[s.bottomNavItem,tab===value&&s.bottomNavItemActive]}>
     <Text style={[s.bottomNavIcon,tab===value&&s.bottomNavIconSelected]}>{icon}</Text>
     <Text numberOfLines={1} style={[s.bottomNavLabel,tab===value&&s.bottomNavLabelSelected]}>
      {ui.t(value)}</Text>
    </Pressable>)}
  </View>}
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><PatientApp/></SafeAreaProvider>}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.soft},
 screenScroll:{flex:1},
 screenContent:{paddingHorizontal:17,paddingTop:18,paddingBottom:40},
 sectionGap:{gap:16},
 row:{alignItems:"center"},
 body:{fontSize:13,lineHeight:22,color:colors.muted},
 helpText:{fontSize:12,color:colors.muted,marginTop:10},
 card:{backgroundColor:colors.white,borderRadius:18,borderWidth:1,
  borderColor:colors.line,padding:17,shadowColor:colors.navy,
  shadowOpacity:.035,shadowRadius:8,elevation:1},
 sectionTitleRow:{alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:0},
 sectionTitle:{fontSize:20,fontWeight:"800",lineHeight:27,color:colors.navy},
 sectionSubtitle:{marginTop:4,fontSize:12},
 mainHeader:{minHeight:79,paddingHorizontal:20,backgroundColor:colors.blue,
  alignItems:"center",justifyContent:"space-between"},
 brandSquare:{width:42,height:42,borderRadius:13,backgroundColor:"#F6FBFF",
  alignItems:"center",justifyContent:"center"},
 brandGlyph:{fontSize:27,fontWeight:"800",color:colors.blue},
 brandText:{fontSize:21,color:colors.white,fontWeight:"900",letterSpacing:-.4},
 brandSmall:{fontSize:10,color:"#D6E6FF",marginTop:3},
 headerAccount:{width:42,height:42,borderRadius:21,
  borderWidth:1,borderColor:"#B9D7FF77",backgroundColor:"#2D72F4",alignItems:"center",justifyContent:"center"},
 headerAccountGlyph:{fontSize:26,color:colors.white},
 detailTop:{minHeight:67,paddingHorizontal:17,backgroundColor:colors.white,
  borderBottomWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"space-between"},
 backButton:{height:44,width:44,borderRadius:13,backgroundColor:colors.pale,
  alignItems:"center",justifyContent:"center"},
 backGlyph:{fontSize:26,fontWeight:"700",color:colors.blue},
 detailTopTitle:{fontSize:18,fontWeight:"900",color:colors.navy},
 bottomNav:{backgroundColor:colors.white,borderTopWidth:1,borderColor:colors.line,
  justifyContent:"space-around",paddingHorizontal:7,paddingTop:8,paddingBottom:3},
 bottomNavItem:{flex:1,minHeight:57,alignItems:"center",justifyContent:"center",
  borderRadius:12,marginHorizontal:3},
 bottomNavItemActive:{backgroundColor:colors.pale},
 bottomNavIcon:{fontSize:25,color:"#93A1B3",lineHeight:29},
 bottomNavIconSelected:{color:colors.blue},
 bottomNavLabel:{fontSize:10,fontWeight:"700",marginTop:2,color:"#929DAE"},
 bottomNavLabelSelected:{color:colors.blue,fontWeight:"900"},
 hero:{minHeight:197,backgroundColor:colors.blue,borderRadius:22,
  padding:23,overflow:"hidden",justifyContent:"center"},
 heroCircle:{position:"absolute",width:200,height:200,borderRadius:100,
  backgroundColor:"#2878FF",opacity:.55,right:-55,top:-99},
 heroCircle2:{position:"absolute",width:130,height:130,borderRadius:70,
  backgroundColor:"#4D95FF",opacity:.26,left:-67,bottom:-66},
 heroKicker:{fontSize:11,fontWeight:"900",color:"#DAE9FF",letterSpacing:.7},
 heroHeadline:{fontSize:29,fontWeight:"900",color:colors.white,
  lineHeight:38,marginTop:11,maxWidth:330},
 heroBody:{fontSize:13,color:"#E0EBFF",lineHeight:21,marginTop:9,maxWidth:335},
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
 cta:{borderRadius:13,backgroundColor:colors.blue,minHeight:48,
  alignItems:"center",justifyContent:"center",paddingHorizontal:16},
 ctaText:{fontWeight:"900",fontSize:14,color:colors.white,textAlign:"center"},
 ctaLight:{backgroundColor:colors.pale,borderWidth:1,borderColor:"#CCE0FF"},
 ctaTextLight:{color:colors.blue},
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
 clinicName:{fontSize:16,fontWeight:"900",lineHeight:22,color:colors.navy},
 clinicSub:{fontSize:11,color:colors.muted,lineHeight:17},
 tag:{borderRadius:20,backgroundColor:colors.pale,paddingHorizontal:9,
  paddingVertical:6,alignSelf:"flex-start",maxWidth:"100%"},
 tagText:{color:colors.blueDeep,fontSize:10,fontWeight:"800"},
 tagGreen:{backgroundColor:colors.greenSoft},
 tagTextGreen:{color:colors.green},
 heart:{width:37,height:37,alignItems:"center",justifyContent:"center",
  borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.white},
 heartSelected:{backgroundColor:colors.pale,borderColor:"#C9DEFF"},
 heartText:{fontSize:24,color:colors.gray,lineHeight:28},
 cardMeta:{justifyContent:"space-between",gap:12,
  borderTopWidth:1,borderBottomWidth:1,borderColor:"#EDF1F5",paddingVertical:12},
 metaLabel:{color:colors.muted,fontSize:11,fontWeight:"700"},
 metaValue:{fontSize:13,fontWeight:"900",color:colors.navy,marginTop:4},
 metaTime:{fontSize:11,color:colors.green},
 cardButton:{flex:1,backgroundColor:colors.white,borderWidth:1.5,
  borderColor:"#C6D9F5",height:45,borderRadius:12,
  alignItems:"center",justifyContent:"center"},
 cardButtonPrimary:{backgroundColor:colors.blue,borderColor:colors.blue},
 cardButtonText:{color:colors.blue,fontWeight:"900",fontSize:12},
 cardButtonPrimaryText:{color:colors.white,fontWeight:"900",fontSize:12},
 chip:{borderWidth:1,borderColor:colors.line,backgroundColor:colors.white,
  paddingHorizontal:13,paddingVertical:10,borderRadius:24},
 chipActive:{backgroundColor:colors.blue,borderColor:colors.blue},
 chipText:{fontSize:12,fontWeight:"700",color:colors.ink},
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
 detailTabText:{fontWeight:"800",fontSize:12,color:colors.muted},
 detailTabTextActive:{color:colors.blue},
 overviewStats:{backgroundColor:colors.white,borderRadius:17,
  padding:16,borderWidth:1,borderColor:colors.line,alignItems:"center"},
 overviewStat:{flex:1,alignItems:"center",gap:5},
 overviewCount:{fontSize:24,fontWeight:"900",color:colors.blue},
 overviewLabel:{fontSize:11,color:colors.muted,fontWeight:"700",textAlign:"center"},
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
 serviceName:{fontSize:13,color:colors.navy,fontWeight:"800",lineHeight:21},
 serviceSub:{fontSize:11,color:colors.muted,lineHeight:18,marginTop:3},
 serviceFee:{fontSize:12,fontWeight:"900",color:colors.blueDeep,maxWidth:100},
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
 slotSub:{fontSize:10,color:colors.muted,lineHeight:15},
 slotFee:{fontSize:11,color:colors.navy,fontWeight:"800"},
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
 footerNotice:{fontSize:11,lineHeight:20,color:colors.muted},
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
