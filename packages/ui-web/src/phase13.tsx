"use client";
import React,{useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {InlineAlert,usePreferences} from "./index";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Language="en"|"fa-AF"|"ps-AF";
type Clinic={id:string;name:string;city:string;province:string;address:string;phone:string};
type Slot={startAt:string;endAt:string;dentistId:string;serviceId:string;
 dentistName:string;serviceName:string;priceAfn:number;durationMinutes:number};
type Dentist={id:string;displayName:string;specialty?:string|null;qualifications?:string|null;
 verified:true;validUntil?:string};
type Service={id:string;name:string;category:string;priceAfn:number;
 durationMinutes:number;version?:number};
type Photo={id:string;caption:string;url:string};
type Card={clinic:Clinic;description:string;specialties:string[];photo:Photo|null;
 dentists:{id:string;name:string;specialty?:string|null;verified:boolean}[];
 services:Service[];minFeeAfn:number;location:{latitude:number;longitude:number};
 distanceKm:number|null;verifiedClinic:boolean;nextSlot:Slot|null};
type Results={items:Card[];pagination:{page:number;limit:number;total:number;totalExact:boolean;hasNext:boolean};
 filters:any;disclaimer:string|null;resultsTruncated:boolean;dateFilteredByLiveSlots:boolean};
type Facets={cities:{city:string;province:string;clinics:number}[];
 specialties:{name:string;clinics:number}[];services:{name:string;clinics:number}[];
 verifiedClinics:number;defaultCity:string};
type BookingRules={approvalMode:"manual"|"auto";minNoticeHours:number;
 horizonDays:number;cancellationHours:number;bufferMinutes:number};
type Hours={weekly:{weekday:number;isOpen:boolean;startMinute:number;endMinute:number}[];
 now:{weekday:number;isWithinPublishedHours:boolean;disclaimer:string}};
type ClinicDetail={clinic:Clinic;profile:{description:string;specialties:string[];
 latitude:number;longitude:number;contactNote:string|null;photos:Photo[];
 dentists:Dentist[];services:Service[];bookingRules:BookingRules};version:number;
 verifiedClinic:true;hours:Hours;searchable:boolean;publicBookingsEnabled:false};
type DentistDetail={clinic:Clinic;dentist:Dentist&{biography:string|null;
 affiliationVerified:boolean;professionalVerificationSource:string};
 services:Service[];specialties:string[];photo:Photo|null;
 bookingRules:BookingRules;hours:Hours;publicBookingsEnabled:false};
type Availability={date:string;timezone:string;slots:Slot[];status:"available"|"no_slots";
 source:string;checkedAt:string;publicBookingsEnabled:false};
type Params={q:string;city:string;specialty:string;service:string;date:string;
 maxFee:string;verified:boolean;sort:string;page:number;latitude:string;longitude:string};
const initial:Params={q:"",city:"Kabul",specialty:"",service:"",date:"",maxFee:"",
 verified:true,sort:"relevance",page:1,latitude:"",longitude:""};
const translations:Record<Language,Record<string,string>>={
 en:{
 home:"Home",find:"Find care",about:"About",clinic:"Clinic",dentist:"Dentist",
 hello:"Care starts with a good match",eyebrow:"Verified care · Real availability",
 heading:"Find the right dental care, closer to you.",subheading:
 "Explore independently reviewed dental clinics, compare their real services and see clinic schedule availability before you contact them.",
 findDentist:"Search dentists, clinics, or treatments",search:"Search",city:"City",
 cityHint:"Choose a city",allCities:"All cities",nearMe:"Use my location",
 nearMeHint:"Location sharing is optional and used for distance sorting only.",
 specialty:"Specialty",allSpecialties:"All specialties",service:"Treatment or service",
 allServices:"All services",date:"Date",anyDate:"Any date",maxFee:"Maximum service fee",
 anyFee:"Any price",verifiedOnly:"Verified only",verified:"Verified",
 clear:"Clear filters",results:"clinics",show:"Show results",browse:"Browse all clinics",
 popular:"Explore by specialty",availableNear:"Verified clinics in",viewAll:"View all results",
 learnHow:"How discovery works",transparent:"Real details, not advertising claims",
 step1Title:"Reviewed professionals",step1Text:"Visible credentials require independent platform review and current clinic affiliation.",
 step2Title:"Services and prices",step2Text:"Only public services and fees approved with the clinic listing are shown.",
 step3Title:"Schedule-based times",step3Text:"Times come from configured clinic hours and existing reservations. These are previews, not bookable slots yet.",
 startExplore:"Start exploring",onlyReal:"Every clinic shown here has a currently reviewed public listing.",
 noClinics:"No participating verified clinics were found for these filters.",
 emptyHint:"Try another city, remove the date or choose a different specialty.",
 noLocal:"No participating clinics in this city yet.",changeCity:"Choose another city",
 filters:"Filters",sortBy:"Sort by",relevance:"Most relevant",name:"Name A–Z",
 soonest:"Soonest available",distance:"Nearest to me",distanceLabel:"away",
 searchResults:"Find dental care",searchHelp:"Compare real clinics and verified dentists without an account.",
 verifiedHint:"Unverified providers are never included in public search.",
 noSlot:"No online slots currently found",nextSlot:"Next available preview",
 previewOnly:"Availability preview — online booking is not yet enabled.",
 datesReal:"Times shown come from real clinic schedules and can change.",
 viewClinic:"View clinic",viewDentist:"View profile",contactClinic:"Call clinic",
 feeFrom:"Services from",serviceFee:"Service fee",notListed:"Not listed",
 openScheduled:"Within scheduled opening hours",closedScheduled:"Outside scheduled opening hours",
 holidayNote:"Holiday and clinician schedules may differ from regular opening hours.",
 page:"Page",previous:"Previous",next:"Next",refresh:"Refresh",
 loading:"Searching verified clinics…",loadError:"Unable to load directory information.",
 retry:"Try again",noResults:"No matching results",limited:"Search scope limited",
 narrowResults:"Refine city or specialty to check more live schedules.",
 noLocation:"Location access was not granted. You can still search by city.",
 locationUnsupported:"Your browser does not support location sharing.",
 permission:"Permission needed",locationFetching:"Checking location…",
 clinicProfile:"Clinic profile",aboutClinic:"About clinic",dentists:"Dentists",
 services:"Services",availability:"Availability",information:"Information",
 contact:"Contact",directions:"Map & directions",address:"Address",phone:"Phone",
 hours:"Opening hours",sunday:"Sunday",monday:"Monday",tuesday:"Tuesday",
 wednesday:"Wednesday",thursday:"Thursday",friday:"Friday",saturday:"Saturday",
 open:"Open",closed:"Closed",timeZone:"Afghanistan time (Asia/Kabul)",
 description:"Overview",specialties:"Specialties",verifiedProfessionals:"Verified dentists",
 publicService:"Clinic services",seeAll:"See all",noBio:"Biography not provided",
 currentAffiliation:"Current verified clinic affiliation",source:"Verification",
 evidenceReviewed:"Evidence reviewed by DandanLink moderators",
 qualifications:"Qualifications",aboutProfessional:"About this dentist",
 providerBio:"Professional biography",availableTimes:"Available time previews",
 chooseDate:"Select a date",chooseService:"Select a service",
 chooseDentist:"Select a dentist",allDentists:"All verified dentists",
 allListedServices:"All published services",checkTimes:"Check availability",
 scheduleAvailability:"Clinic schedule preview",noTimeDate:"No online times on this date. Contact the clinic for options.",
 timePreview:"This time is a preview, not a reservation.",
 bookingLater:"Online appointment booking launches in Phase 15.",
 consultation:"Consultation",duration:"Duration",minutes:"minutes",
 verifiedSince:"Credential valid through",validTo:"Valid until",
 gallery:"Clinic gallery",galleryHelp:"Only clinic-approved public photos are shown. No fabricated before-and-after images.",noPublishedPhotos:"No published clinic photos yet",photo:"Photo",patientExperience:"Your dental care search",
 trustTitle:"Only approved public information",trustDescription:
 "Profiles and fees are reviewed before appearing here. There are no sponsored rankings, invented ratings or fabricated opening times.",
 contactTitle:"Contact the clinic directly",contactText:"Contact details are those published by the verified clinic.",
 clearDate:"Any date",searchBack:"Back to results",profileUnavailable:"This verified profile is currently unavailable.",
 disclaimer:"Schedule previews do not guarantee a booking. Confirm with the clinic.",
 selectedCity:"Showing city",all:"All",browseDirectory:"Explore verified dental clinics",
 discover:"Discover",quickSpecialty:"Find a treatment",timezone:"Local clinic time",
 privacy:"Privacy",legal:"Privacy & terms",contactAbout:"Contact a participating clinic",
 aboutTitle:"Find trusted information before visiting a dentist",
 aboutIntro:"DandanLink lists independently moderated clinic and dental professional profiles in Afghanistan.",
 aboutSafety:"Our public directory shows reviewed profile information and active clinic service prices, without exposing clinical or patient records.",
 aboutStepTitle:"How the directory works",
 aboutStep1:"A clinic completes identity and license review.",
 aboutStep2:"The clinic's dentists submit credentials that a platform reviewer examines.",
 aboutStep3:"The clinic publishes public services, location and photos for further approval.",
 aboutStep4:"We recheck clinic suspension, professional credentials and service versions when serving a public profile.",
 aboutNoBooking:"Patient accounts and self-service appointment booking are planned for later phases. You can call a participating clinic using its verified listing.",
 aboutContact:"To contact a clinic, open a verified profile and use the displayed telephone number.",
 noFake:"No paid placement or artificial ratings are shown.",
 noBooking:"Booking unavailable online",share:"Share",copied:"Profile link copied",
 imageMissing:"No published image",backHome:"Back home",status:"Status",
 localeHint:"Date display follows your language/calendar preference; date search uses Gregorian ISO dates.",
 noServicePrice:"A service fee has not been published.",
 unverifiedNever:"Only dentists with current verification appear here.",
 readMore:"Explore this clinic",viewProfiles:"View dentists",searchAgain:"Search again"
 },
 "fa-AF":{
 home:"خانه",find:"جستجوی خدمات",about:"درباره",clinic:"کلینیک",dentist:"داکتر",
 hello:"مراقبت بهتر با انتخاب درست آغاز می‌شود",eyebrow:"خدمات تأییدشده · وقت‌های واقعی",
 heading:"داکتر دندان مناسب را در نزدیکی خود پیدا کنید.",
 subheading:"کلینیک‌های بررسی‌شده را جستجو کنید، خدمات و قیمت‌های واقعی را مقایسه کنید و قبل از تماس تقسیم اوقات را ببینید.",
 findDentist:"جستجوی داکتر، کلینیک یا تداوی",search:"جستجو",city:"شهر",cityHint:"شهر را انتخاب کنید",
 allCities:"تمام شهرها",nearMe:"استفاده از موقعیت من",
 nearMeHint:"موقعیت اختیاری است و فقط برای ترتیب بر اساس فاصله استفاده می‌شود.",
 specialty:"تخصص",allSpecialties:"تمام تخصص‌ها",service:"خدمت یا تداوی",
 allServices:"تمام خدمات",date:"تاریخ",anyDate:"هر تاریخ",maxFee:"حداکثر قیمت خدمت",
 anyFee:"هر قیمت",verifiedOnly:"فقط تأییدشده",verified:"تأییدشده",
 clear:"پاک‌کردن فیلترها",results:"کلینیک",show:"نمایش نتایج",browse:"مشاهدهٔ کلینیک‌ها",
 popular:"جستجو بر اساس تخصص",availableNear:"کلینیک‌های تأییدشده در",
 viewAll:"همه نتایج",learnHow:"طرز کار جستجو",transparent:"معلومات واقعی، نه ادعاهای تبلیغاتی",
 step1Title:"داکتران بررسی‌شده",step1Text:"اسناد مسلکی باید مستقلانه بررسی شوند و عضویت کلینیک معتبر باشد.",
 step2Title:"خدمات و قیمت‌ها",step2Text:"فقط خدمات و قیمت‌های تأییدشده همراه پروفایل کلینیک نمایش داده می‌شوند.",
 step3Title:"وقت‌های تقسیم اوقات",step3Text:"وقت‌ها از تقسیم اوقات کلینیک و نوبت‌های موجود می‌آیند؛ فعلاً امکان رزرو آنلاین نیست.",
 startExplore:"شروع جستجو",onlyReal:"فقط کلینیک‌هایی با پروفایل عمومی معتبر نشان داده می‌شوند.",
 noClinics:"برای این فیلترها کلینیک تأییدشده یافت نشد.",
 emptyHint:"شهر دیگری انتخاب کنید یا فیلتر تاریخ و تخصص را تغییر دهید.",
 noLocal:"هنوز در این شهر کلینیک ثبت‌شده یافت نشد.",changeCity:"شهر دیگری انتخاب کنید",
 filters:"فیلترها",sortBy:"ترتیب",relevance:"مرتبط‌ترین",name:"نام",
 soonest:"نزدیک‌ترین وقت خالی",distance:"نزدیک‌ترین به من",distanceLabel:"فاصله",
 searchResults:"یافتن خدمات دندان",searchHelp:"کلینیک‌ها و داکتران تأییدشده را بدون حساب کاربری مقایسه کنید.",
 verifiedHint:"داکتران تأییدنشده هرگز در جستجوی عمومی نمایش داده نمی‌شوند.",
 noSlot:"وقت آنلاین یافت نشد",nextSlot:"نزدیک‌ترین وقت احتمالی",
 previewOnly:"نمایش تقسیم اوقات؛ رزرو آنلاین هنوز فعال نیست.",
 datesReal:"وقت‌ها از تقسیم اوقات واقعی گرفته می‌شوند و ممکن است تغییر کنند.",
 viewClinic:"مشاهده کلینیک",viewDentist:"مشاهده پروفایل",contactClinic:"تماس با کلینیک",
 feeFrom:"شروع قیمت خدمات",serviceFee:"قیمت خدمت",notListed:"ثبت نشده",
 openScheduled:"در ساعات کاری ثبت‌شده",closedScheduled:"خارج از ساعات کاری ثبت‌شده",
 holidayNote:"رخصتی و تقسیم اوقات داکتر ممکن است متفاوت باشد.",
 page:"صفحه",previous:"قبلی",next:"بعدی",refresh:"تازه‌سازی",
 loading:"در حال جستجوی کلینیک‌های تأییدشده…",loadError:"دریافت معلومات ممکن نشد.",
 retry:"دوباره کوشش کنید",noResults:"نتیجه‌ای یافت نشد",limited:"محدودیت جستجو",
 narrowResults:"برای بررسی دقیق‌تر یک شهر یا تخصص انتخاب کنید.",
 noLocation:"اجازهٔ موقعیت داده نشد؛ می‌توانید شهر را انتخاب کنید.",
 locationUnsupported:"مرورگر شما موقعیت‌یابی ندارد.",
 permission:"اجازه لازم است",locationFetching:"در حال دریافت موقعیت…",
 clinicProfile:"پروفایل کلینیک",aboutClinic:"درباره کلینیک",dentists:"داکتران",
 services:"خدمات",availability:"وقت‌های خالی",information:"معلومات",
 contact:"تماس",directions:"نقشه و مسیر",address:"آدرس",phone:"شماره تماس",
 hours:"ساعات کاری",sunday:"یکشنبه",monday:"دوشنبه",tuesday:"سه‌شنبه",
 wednesday:"چهارشنبه",thursday:"پنجشنبه",friday:"جمعه",saturday:"شنبه",
 open:"باز",closed:"بسته",timeZone:"وقت افغانستان (کابل)",
 description:"معرفی",specialties:"تخصص‌ها",verifiedProfessionals:"داکتران تأییدشده",
 publicService:"خدمات کلینیک",seeAll:"مشاهده همه",noBio:"شرح حال ثبت نشده",
 currentAffiliation:"عضویت معتبر و تأییدشده",source:"منبع تأیید",
 evidenceReviewed:"اسناد توسط بررسی‌کنندگان دندان‌لینک بررسی شده‌اند",
 qualifications:"تحصیلات",aboutProfessional:"درباره این داکتر",
 providerBio:"شرح حال مسلکی",availableTimes:"پیش‌نمایش وقت‌ها",
 chooseDate:"تاریخ را انتخاب کنید",chooseService:"خدمت را انتخاب کنید",
 chooseDentist:"داکتر را انتخاب کنید",allDentists:"تمام داکتران تأییدشده",
 allListedServices:"تمام خدمات منتشرشده",checkTimes:"بررسی وقت‌ها",
 scheduleAvailability:"تقسیم اوقات کلینیک",noTimeDate:"در این تاریخ وقت آنلاین یافت نشد؛ با کلینیک تماس بگیرید.",
 timePreview:"این وقت صرف پیش‌نمایش است و رزرو نیست.",
 bookingLater:"رزرو آنلاین در مرحله ۱۵ فعال می‌شود.",
 consultation:"مشوره",duration:"مدت",minutes:"دقیقه",
 verifiedSince:"اعتبار اسناد تا",validTo:"معتبر تا",
 gallery:"عکس‌های کلینیک",galleryHelp:"فقط عکس‌های تأییدشده و نشرشده کلینیک نمایش داده می‌شوند. عکس ساختگی وجود ندارد.",noPublishedPhotos:"هنوز عکس کلینیک نشر نشده است",photo:"عکس",patientExperience:"جستجوی خدمات دندان",
 trustTitle:"فقط معلومات عمومی تأییدشده",trustDescription:"پروفایل‌ها و قیمت‌ها پیش از انتشار بررسی می‌شوند. رتبه‌بندی پولی، امتیاز ساختگی یا وقت خیالی وجود ندارد.",
 contactTitle:"مستقیماً با کلینیک تماس بگیرید",contactText:"شماره تماس همان شماره منتشرشده توسط کلینیک است.",
 clearDate:"هر تاریخ",searchBack:"بازگشت به نتایج",profileUnavailable:"این پروفایل فعلاً در دسترس نیست.",
 disclaimer:"وقت‌های نمایشی تضمین رزرو نیستند. با کلینیک تأیید کنید.",
 selectedCity:"شهر انتخاب‌شده",all:"همه",browseDirectory:"جستجوی کلینیک‌های دندان",
 discover:"پیدا کنید",quickSpecialty:"جستجوی تداوی",timezone:"وقت محلی کلینیک",
 privacy:"حریم خصوصی",legal:"حریم خصوصی و شرایط",contactAbout:"تماس با کلینیک عضو",
 aboutTitle:"پیش از مراجعه به داکتر، معلومات معتبر پیدا کنید",
 aboutIntro:"دندان‌لینک پروفایل کلینیک‌ها و داکتران بررسی‌شده در افغانستان را نمایش می‌دهد.",
 aboutSafety:"در فهرست عمومی فقط معلومات تأییدشده و قیمت خدمات فعال نمایش داده می‌شود؛ اسناد طبی مریض‌ها خصوصی اند.",
 aboutStepTitle:"طرز کار این فهرست",aboutStep1:"هویت و جواز کلینیک بررسی می‌شود.",
 aboutStep2:"اسناد مسلکی داکتر توسط بررسی‌کننده مستقل بازبینی می‌شود.",
 aboutStep3:"خدمات، آدرس و عکس‌های کلینیک برای نشر بررسی می‌شوند.",
 aboutStep4:"هنگام نمایش، اعتبار کلینیک، اسناد داکتر و خدمات دوباره سنجیده می‌شوند.",
 aboutNoBooking:"حساب مریض و رزرو آنلاین در مراحل بعدی می‌آیند. فعلاً با شماره کلینیک تماس بگیرید.",
 aboutContact:"برای تماس، پروفایل یک کلینیک تأییدشده را باز کنید و از شماره درج‌شده استفاده کنید.",
 noFake:"جایگاه پولی و امتیاز جعلی نمایش داده نمی‌شود.",
 noBooking:"رزرو آنلاین فعال نیست",share:"اشتراک‌گذاری",copied:"لینک کاپی شد",
 imageMissing:"عکس منتشرشده موجود نیست",backHome:"بازگشت به خانه",
 status:"حالت",localeHint:"نمایش تاریخ مطابق زبان/تقویم انتخاب‌شده است؛ جستجوی تاریخ از فرمت میلادی استفاده می‌کند.",
 noServicePrice:"قیمت این خدمت منتشر نشده.",unverifiedNever:"فقط داکتران معتبر نمایش داده می‌شوند.",
 readMore:"مشاهده کلینیک",viewProfiles:"مشاهده داکتران",searchAgain:"جستجوی دوباره"
 },
 "ps-AF":{
 home:"کور",find:"روغتیايي خدمتونه",about:"زموږ په اړه",clinic:"کلینیک",dentist:"ډاکټر",
 hello:"ښه پاملرنه د سم انتخاب څخه پیلېږي",eyebrow:"تایید شوي خدمتونه · رښتیني وختونه",
 heading:"خپل نږدې د غاښونو ښه ډاکټر ومومئ.",
 subheading:"تایید شوي کلینیکونه ولټوئ، رښتیني خدمتونه او بیې پرتله کړئ او د اړیکې نیولو مخکې کاري وختونه وګورئ.",
 findDentist:"ډاکټر، کلینیک یا درملنه ولټوئ",search:"لټون",city:"ښار",
 cityHint:"ښار وټاکئ",allCities:"ټول ښارونه",nearMe:"زما موقعیت وکاروئ",
 nearMeHint:"موقعیت ورکول اختیاري دي او یوازې د فاصلې ترتیب لپاره کارېږي.",
 specialty:"تخصص",allSpecialties:"ټول تخصصونه",service:"درملنه یا خدمت",
 allServices:"ټول خدمتونه",date:"نېټه",anyDate:"هره نېټه",maxFee:"د خدمت لوړه بیه",
 anyFee:"هره بیه",verifiedOnly:"یوازې تایید شوي",verified:"تایید شوی",
 clear:"فلټرونه پاک کړئ",results:"کلینیکونه",show:"پایلې وښایئ",
 browse:"ټول کلینیکونه",popular:"د تخصص له مخې ولټوئ",availableNear:"تایید شوي کلینیکونه په",
 viewAll:"ټولې پایلې",learnHow:"لټون څنګه کار کوي",transparent:"رښتیني معلومات، نه د اعلان ادعا",
 step1Title:"کتل شوي ډاکټران",step1Text:"مسلکي اسناد په خپلواکه توګه کتل کېږي او د کلینیک غړیتوب باید معتبر وي.",
 step2Title:"خدمتونه او بیې",step2Text:"یوازې له پروفایل سره تایید شوي خدمتونه او بیې ښکاري.",
 step3Title:"رښتیني کاري ساعتونه",step3Text:"وختونه له کلینیکي مهالویش او موجوده نوبتونو اخیستل کېږي؛ آنلاین ثبت لا نشته.",
 startExplore:"لټون پیل کړئ",onlyReal:"یوازې اوسني تایید شوي کلینیکونه ښکاري.",
 noClinics:"د دې فلټرونو لپاره تایید شوی کلینیک نشته.",
 emptyHint:"بل ښار وټاکئ یا د نېټې او تخصص فلټر بدل کړئ.",
 noLocal:"په دې ښار کې تر اوسه کلینیک نشته.",changeCity:"بل ښار وټاکئ",
 filters:"فلټرونه",sortBy:"ترتیب",relevance:"ډېر اړوند",name:"د نوم له مخې",
 soonest:"تر ټولو ژر خالي وخت",distance:"ما ته نږدې",distanceLabel:"واټن",
 searchResults:"د غاښونو خدمتونه ومومئ",searchHelp:"بې له حسابه کلینیکونه او ډاکټران پرتله کړئ.",
 verifiedHint:"نا تایید شوي ډاکټران په عامه لټون کې نه راځي.",
 noSlot:"آنلاین خالي وخت ونه موندل شو",nextSlot:"راتلونکی احتمالي وخت",
 previewOnly:"دا یوازې د مهالویش مخکتنه ده؛ آنلاین نوبت اخیستل فعال نه دي.",
 datesReal:"وختونه له رښتیني مهالویش څخه دي او بدلېدای شي.",
 viewClinic:"کلینیک وګورئ",viewDentist:"پېژندلیک وګورئ",contactClinic:"کلینیک ته زنګ",
 feeFrom:"د خدمتونو بیه له",serviceFee:"د خدمت بیه",notListed:"نه دی درج",
 openScheduled:"په ټاکلو کاري ساعتونو کې",closedScheduled:"له کاري ساعتونو بهر",
 holidayNote:"رخصتۍ او د ډاکټر ساعتونه ښايي توپیر ولري.",
 page:"پاڼه",previous:"مخکینۍ",next:"راتلونکې",refresh:"نوي کول",
 loading:"د تایید شوو کلینیکونو لټون…",loadError:"د لټون معلومات ترلاسه نه شول.",
 retry:"بیا هڅه وکړئ",noResults:"پایلې ونه موندل شوې",limited:"د لټون حد",
 narrowResults:"د نورو رښتینو وختونو لپاره ښار یا تخصص مشخص کړئ.",
 noLocation:"د موقعیت اجازه نشته، د ښار له مخې لټون کولای شئ.",
 locationUnsupported:"ستاسو براوزر موقعیت نه ملاتړ کوي.",
 permission:"اجازې ته اړتیا ده",locationFetching:"موقعیت اخلو…",
 clinicProfile:"د کلینیک پېژندلیک",aboutClinic:"د کلینیک په اړه",
 dentists:"ډاکټران",services:"خدمتونه",availability:"خالي وختونه",
 information:"معلومات",contact:"اړیکه",directions:"نقشه او لار",
 address:"پته",phone:"تلیفون",hours:"کاري ساعتونه",sunday:"یکشنبه",
 monday:"دوشنبه",tuesday:"سه‌شنبه",wednesday:"چهارشنبه",thursday:"پنجشنبه",
 friday:"جمعه",saturday:"شنبه",open:"پرانیستی",closed:"تړلی",
 timeZone:"د افغانستان وخت (کابل)",
 description:"لنډیز",specialties:"تخصصونه",verifiedProfessionals:"تایید شوي ډاکټران",
 publicService:"د کلینیک خدمتونه",seeAll:"ټول وګورئ",noBio:"ژوندلیک نه دی ورکړل شوی",
 currentAffiliation:"اوسنی تایید شوی غړیتوب",source:"د تایید سرچینه",
 evidenceReviewed:"اسناد د دندان‌لینک له خوا کتل شوي",
 qualifications:"زده کړې",aboutProfessional:"د ډاکټر په اړه",
 providerBio:"مسلکي ژوندلیک",availableTimes:"د وختونو مخکتنه",
 chooseDate:"نېټه وټاکئ",chooseService:"خدمت وټاکئ",
 chooseDentist:"ډاکټر وټاکئ",allDentists:"ټول تایید شوي ډاکټران",
 allListedServices:"ټول خپاره شوي خدمتونه",checkTimes:"وختونه وګورئ",
 scheduleAvailability:"د کلینیک مهالویش",noTimeDate:"په دې نېټه خالي وخت نشته، کلینیک ته زنګ ووهئ.",
 timePreview:"دا یوازې مخکتنه ده، ثبت نه دی.",
 bookingLater:"آنلاین نوبت اخیستل په ۱۵ پړاو کې پیلېږي.",
 consultation:"مشوره",duration:"وخت",minutes:"دقیقې",
 verifiedSince:"د سند اعتبار تر",validTo:"تر نېټې اعتبار لري",
 gallery:"د کلینیک انځورونه",galleryHelp:"یوازې د کلینیک منظور شوي عامه انځورونه ښودل کېږي؛ جعلي انځورونه نه لرو.",noPublishedPhotos:"د کلینیک انځورونه لا نه دي خپاره شوي",photo:"انځور",patientExperience:"د غاښونو د پاملرنې لټون",
 trustTitle:"یوازې تایید شوي معلومات",trustDescription:"پېژندلیکونه او بیې مخکې له خپرولو کتل کېږي. پېسو ورکړل شوي ځایونه، جعلي نمرې او خیالي وختونه نشته.",
 contactTitle:"له کلینیک سره مخامخ اړیکه",contactText:"د تلیفون شمېره د کلینیک له خپور شوي پېژندلیک څخه ده.",
 clearDate:"هره نېټه",searchBack:"پایلو ته بېرته",profileUnavailable:"دا تایید شوی پېژندلیک اوس نشته.",
 disclaimer:"د وختونو مخکتنه د ثبت ضمانت نه کوي. له کلینیک سره تایید کړئ.",
 selectedCity:"ښار",all:"ټول",browseDirectory:"تایید شوي کلینیکونه ولټوئ",
 discover:"ومومئ",quickSpecialty:"درملنه ولټوئ",timezone:"د کلینیک محلي وخت",
 privacy:"محرمیت",legal:"محرمیت او شرطونه",contactAbout:"له کلینیک سره اړیکه",
 aboutTitle:"ډاکټر ته له تلو مخکې د باور وړ معلومات ترلاسه کړئ",
 aboutIntro:"دندان‌لینک په افغانستان کې د تایید شوو کلینیکونو او ډاکټرانو پېژندلیکونه ښيي.",
 aboutSafety:"په عامه لست کې یوازې تایید شوې معلومات او د خدمتونو بیې ښکاري، د ناروغ شخصي طبي اسناد نه خپرېږي.",
 aboutStepTitle:"دا لست څنګه کار کوي",aboutStep1:"د کلینیک هویت او جواز کتل کېږي.",
 aboutStep2:"د ډاکټر مسلکي اسناد په خپلواکه توګه کتل کېږي.",
 aboutStep3:"خدمتونه، پته او انځورونه د خپرېدو لپاره کتل کېږي.",
 aboutStep4:"د ښودلو پر مهال د کلینیک او ډاکټر اوسنی اعتبار بیا کتل کېږي.",
 aboutNoBooking:"د ناروغ حسابونه او آنلاین ثبت په راتلونکو پړاوونو کې فعالېږي. تر هغه کلینیک ته زنګ وهلی شئ.",
 aboutContact:"د اړیکې لپاره د کلینیک پېژندلیک پرانیزئ او په ورکړل شوې شمېره زنګ ووهئ.",
 noFake:"د پیسو په بدل کې لومړیتوب او جعلي نمرې نه ښودل کېږي.",
 noBooking:"آنلاین ثبت نشته",share:"شریکول",copied:"لینک کاپي شو",
 imageMissing:"خپور شوی انځور نشته",backHome:"کور ته بېرته",
 status:"حالت",localeHint:"د نېټې ښودنه ستاسو له ژبې او تقویم سره سمه ده؛ د لټون نېټه میلادي ده.",
 noServicePrice:"د خدمت بیه نه ده خپره شوې.",unverifiedNever:"یوازې اوسني تایید شوي ډاکټران ښکاري.",
 readMore:"دا کلینیک وګورئ",viewProfiles:"ډاکټران وګورئ",searchAgain:"بیا لټون"
 }
};
function useLanguage(){
 const {locale,calendar}=usePreferences();const lang=locale as Language;
 const t=(key:string)=>translations[lang]?.[key]||translations.en[key]||key;
 const money=(price:number|null|undefined)=>typeof price==="number"?
  new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(price)+" AFN":t("notListed");
 const date=(s:string|null|undefined,opts:{weekday?:boolean;time?:boolean}={})=>{
  if(!s)return "—";
  const parsed=new Date(s.includes("T")?s:s+"T12:00:00+04:30");
  if(!Number.isFinite(parsed.getTime()))return s;
  try{return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   ...(opts.time?{hour:"numeric",minute:"2-digit"}:
    {year:"numeric",month:"short",day:"numeric",weekday:opts.weekday?"short":undefined})
  }).format(parsed)}catch{return s}};
 return {t,money,date,lang,calendar};
}
function today(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
  .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
function uri(path:string){return API+"/v1/discovery"+path}
function usePublic<T>(path:string|null){
 const [result,setResult]=useState<{loading:boolean;data:T|null;error:string}>({
  loading:true,data:null,error:""}),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!path)return;const abort=new AbortController();
  setResult({loading:true,data:null,error:""});
  fetch(uri(path),{signal:abort.signal,cache:"no-store"}).then(async response=>{
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.code||"DISCOVERY_UNAVAILABLE");
   return data as T;
  }).then(data=>setResult({loading:false,data,error:""}))
   .catch(e=>{if(!abort.signal.aborted)setResult({loading:false,data:null,error:e.message})});
  return()=>abort.abort();
 },[path,refresh]);
 return {...result,refresh:()=>setRefresh(x=>x+1)};
}
function messageDate(value:string,format:(s:string,opts?:{time?:boolean;weekday?:boolean})=>string){
 return format(value,{weekday:true})+" · "+format(value,{time:true});
}
function searchHref(data:Partial<Params>,defaults?:Params){
 const state={...(defaults||initial),...data},query=new URLSearchParams();
 for(const name of ["q","city","specialty","service","date","maxFee","sort","latitude","longitude"] as const){
  const value=state[name];if(value!==""&&value!=="relevance"&&value!=="all")
   query.set(name,value);
 }
 if(!state.verified)query.set("verified","false");
 if(state.page>1)query.set("page",String(state.page));
 const encoded=query.toString();return "/search"+(encoded?"?"+encoded:"");
}
function urlParams():Params{
 if(typeof window==="undefined")return initial;
 const u=new URLSearchParams(window.location.search);
 return {...initial,q:u.get("q")||"",city:u.get("city")??"Kabul",
 specialty:u.get("specialty")||"",service:u.get("service")||"",
 date:u.get("date")||"",maxFee:u.get("maxFee")||"",verified:u.get("verified")!=="false",
 sort:u.get("sort")||"relevance",page:Math.max(1,Number(u.get("page"))||1),
 latitude:u.get("latitude")||"",longitude:u.get("longitude")||""};
}
function statusText(code:string,t:(name:string)=>string){
 const map:Record<string,string>={CLINIC_UNAVAILABLE:"profileUnavailable",VERIFIED_DENTIST_NOT_FOUND:"profileUnavailable",
 DISCOVERY_UNAVAILABLE:"loadError",NETWORK_ERROR:"loadError",DATE_OUT_OF_RANGE:"date"};
 return t(map[code]||"loadError");
}
function Loading({compact=false}:{compact?:boolean}){
 const {t}=useLanguage();return <div className={"p13-loading"+(compact?" p13-loading-small":"")} role="status" aria-live="polite">
 <span className="p13-spinner" aria-hidden="true"/><span>{t("loading")}</span></div>;
}
function Failure({code,retry}:{code:string;retry?:()=>void}){
 const {t}=useLanguage();return <section className="p13-failure" role="alert">
 <span className="p13-failure-mark" aria-hidden="true">!</span>
 <h2>{statusText(code,t)}</h2><p>{code==="CLINIC_UNAVAILABLE"?t("profileUnavailable"):code}</p>
 <div className="p13-actions">
  {retry&&<button type="button" className="btn btn-primary" onClick={retry}>{t("retry")}</button>}
  <a href="/search" className="btn btn-secondary">{t("searchAgain")}</a>
 </div></section>;
}
function VerifiedBadge({provider=false}:{provider?:boolean}){
 const {t}=useLanguage();return <span className="p13-verified-badge" aria-label={t("verified")}>
 <span className="p13-check-icon" aria-hidden="true">✓</span>{provider?t("currentAffiliation"):t("verified")}</span>;
}
function Picture({src,label,wide=false}:{src:Photo|null|undefined;label:string;wide?:boolean}){
 const {t}=useLanguage(),[broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[src?.id]);
 if(!src||broken)return <div className={"p13-photo-placeholder"+(wide?" p13-wide":"")}
  aria-label={t("imageMissing")} role="img"><span aria-hidden="true">✦</span>
  <small>DANDANLINK CARE</small></div>;
 return <img className={"p13-photo"+(wide?" p13-wide":"")}
  src={API+src.url} alt={src.caption||label} loading={wide?"eager":"lazy"}
  onError={()=>setBroken(true)}/>;
}
function SearchCity({value,setValue,facets,all=false}:{value:string;
 setValue:(v:string)=>void;facets:Facets|null;all?:boolean}){
 const {t}=useLanguage();
 const list=facets?.cities||[];
 return <label className="p13-field"><span>{t("city")}</span>
  <select aria-label={t("city")} value={value} onChange={e=>setValue(e.target.value)}>
   <option value="">{t("allCities")}</option>
   {value&&!list.some(c=>c.city===value)&&<option value={value}>{value}</option>}
   {list.map(x=><option key={x.city+"-"+x.province} value={x.city}>
    {x.city} · {x.province}</option>)}
  </select></label>;
}
function SearchBar({facets}:{facets:Facets|null}){
 const {t}=useLanguage();const [query,setQuery]=useState(""),[city,setCity]=useState("Kabul");
 return <form className="p13-home-search" role="search" onSubmit={e=>{
  e.preventDefault();window.location.assign(searchHref({q:query,city,page:1}))}}>
  <label className="p13-search-term"><span className="p13-field-label">{t("findDentist")}</span>
   <span className="p13-search-inner"><span aria-hidden="true">⌕</span>
    <input autoComplete="off" maxLength={100} value={query}
     aria-label={t("findDentist")} placeholder={t("findDentist")}
     onChange={e=>setQuery(e.target.value)}/></span></label>
  <SearchCity facets={facets} value={city} setValue={setCity}/>
  <button type="submit" className="p13-search-submit">{t("search")} <span aria-hidden="true">→</span></button>
 </form>;
}
function ClinicCard({item}:{item:Card}){
 const {t,money,date}=useLanguage(),clinicLink="/clinics/"+item.clinic.id;
 return <article className="p13-card">
  <a href={clinicLink} aria-label={t("viewClinic")+": "+item.clinic.name}
   className="p13-card-image-link"><Picture src={item.photo} label={item.clinic.name}/>
   <span className="p13-photo-badge">{t("verified")} ✓</span></a>
  <div className="p13-card-main">
   <div className="p13-card-top"><div><VerifiedBadge/>
    <h3><a href={clinicLink}>{item.clinic.name}</a></h3>
    <p className="p13-card-location"><span aria-hidden="true">⌖</span>
     {item.clinic.city}, {item.clinic.province}</p></div>
    {item.distanceKm!==null&&<div className="p13-distance">
      <strong dir="ltr">{item.distanceKm} km</strong><span>{t("distanceLabel")}</span></div>}
   </div>
   <p className="p13-card-description">{item.description}</p>
   <div className="p13-tags">{item.specialties.slice(0,3).map(x=><span key={x}>{x}</span>)}</div>
   <div className="p13-card-doctors"><span>{t("verifiedProfessionals")}:</span>
    <strong>{item.dentists.slice(0,2).map(x=>x.name).join(" · ")||"—"}</strong></div>
   <div className="p13-card-bottom">
    <div className="p13-card-price"><span>{t("feeFrom")}</span>
     <strong dir="ltr">{money(item.minFeeAfn)}</strong></div>
    <div className="p13-card-next"><span>{t("nextSlot")}</span>
     {item.nextSlot?<strong>{messageDate(item.nextSlot.startAt,date)}</strong>:
      <strong className="p13-no-slot">{t("noSlot")}</strong>}</div>
   </div>
   <div className="p13-card-actions">
    <a className="btn btn-primary" href={clinicLink}>{t("viewClinic")} <span aria-hidden="true">→</span></a>
    <a className="btn btn-secondary" href={"tel:"+item.clinic.phone}>{t("contactClinic")}</a>
   </div>
   <span className="p13-card-notice">{t("previewOnly")}</span>
  </div>
 </article>;
}
function CityFilters({facets,select}:{facets:Facets|null;select:(city:string)=>void}){
 const {t}=useLanguage();
 return <div className="p13-cities">{[...(facets?.cities||[])].slice(0,7).map(x=>
  <button type="button" key={x.city+"-"+x.province} onClick={()=>select(x.city)}>
   <span aria-hidden="true">⌖</span>{x.city}
   <small>{x.clinics}</small></button>)}
 {!(facets?.cities||[]).length&&<button type="button" onClick={()=>select("")}>
  {t("allCities")} <span aria-hidden="true">→</span></button>}</div>;
}
export function PatientDiscoveryHome(){
 const {t}=useLanguage();
 const facets=usePublic<Facets>("/facets");
 const citySearch=usePublic<Results>("/search?"+new URLSearchParams({city:"Kabul",limit:"4"}));
 const featured=citySearch.data?.items||[];
 return <div className="p13-home">
  <section className="p13-hero">
   <div className="p13-hero-copy">
    <span className="p13-eyebrow"><span aria-hidden="true">✦</span>{t("eyebrow")}</span>
    <h1>{t("heading")}</h1>
    <p>{t("subheading")}</p>
    <SearchBar facets={facets.data}/>
    <div className="p13-hero-footer"><span><span aria-hidden="true">✓</span>
     {t("onlyReal")}</span><a href="/about">{t("learnHow")} ↗</a></div>
   </div>
   <div className="p13-hero-art" aria-hidden="true">
    <div className="p13-art-halo p13-halo-one"/><div className="p13-art-halo p13-halo-two"/>
    <div className="p13-art-center"><span className="p13-art-symbol">✦</span><span>DANDANLINK</span>
     <strong>CARE</strong></div>
    <div className="p13-art-tick p13-art-tick-one">+</div>
    <div className="p13-art-tick p13-art-tick-two">+</div>
   </div>
  </section>
  <section className="p13-home-discover p13-page-content">
   <div className="p13-section-title"><div><span className="p13-kicker">{t("discover")}</span>
    <h2>{t("popular")}</h2></div><a href="/search" className="p13-inline-link">
     {t("browse")} <span aria-hidden="true">→</span></a></div>
   {facets.error?<Failure code={facets.error} retry={facets.refresh}/>:
    facets.loading?<Loading compact/>:<>
     <div className="p13-specialty-row">
      {(facets.data?.specialties||[]).slice(0,9).map(x=><a key={x.name}
       href={searchHref({city:"",specialty:x.name})}><span aria-hidden="true">✧</span>
       {x.name}<small>{x.clinics}</small></a>)}
      {!facets.data?.specialties.length&&<p className="p13-muted">{t("noClinics")}</p>}
     </div>
     <CityFilters facets={facets.data} select={city=>window.location.assign(
      searchHref({city}))}/>
    </>}
  </section>
  <section className="p13-home-discover p13-page-content">
   <div className="p13-section-title"><div><span className="p13-kicker">{t("onlyReal")}</span>
    <h2>{t("availableNear")} Kabul</h2></div>
    <a className="p13-inline-link" href={searchHref({city:"Kabul"})}>{t("viewAll")} →</a></div>
   {citySearch.error?<Failure code={citySearch.error} retry={citySearch.refresh}/>:
    citySearch.loading?<Loading compact/>:featured.length?
     <div className="p13-home-card-grid">{featured.map(item=><ClinicCard key={item.clinic.id} item={item}/>)}</div>:
     <div className="p13-blank-state"><h3>{t("noLocal")}</h3>
      <p>{t("emptyHint")}</p><a className="btn btn-secondary" href="/search?city=">
       {t("changeCity")}</a></div>}
  </section>
  <section className="p13-confidence p13-page-content">
   <div className="p13-section-title"><div><span className="p13-kicker">{t("transparent")}</span>
    <h2>{t("trustTitle")}</h2><p>{t("trustDescription")}</p></div></div>
   <div className="p13-confidence-grid">
    {([["01","step1Title","step1Text"],["02","step2Title","step2Text"],
     ["03","step3Title","step3Text"]] as const).map(([n,h,p])=>
     <div className="p13-confidence-card" key={n}><span className="p13-confidence-number">{n}</span>
      <h3>{t(h)}</h3><p>{t(p)}</p></div>)}
   </div>
  </section>
 </div>;
}
export function PatientSearchPage(){
 const {t}=useLanguage();
 const [state,setState]=useState<Params>(initial),[initialized,setInitialized]=useState(false);
 const [locationPending,setLocationPending]=useState(false),[geoError,setGeoError]=useState("");
 const [mobileFilters,setMobileFilters]=useState(false);
 useEffect(()=>{setState(urlParams());setInitialized(true)},[]);
 const facets=usePublic<Facets>("/facets");
 // Query result always uses the URL, never unsaved in-form edits.
 const requestPath=useMemo(()=>{
  if(!initialized)return null;
  const u=new URLSearchParams(window.location.search);
  const query=new URLSearchParams();
  for(const k of ["q","city","specialty","service","date","maxFee","sort",
   "latitude","longitude"] as const)if(u.get(k))query.set(k,u.get(k)!);
  if(u.has("verified"))query.set("verified",u.get("verified")!);
  if(!u.has("city"))query.set("city","Kabul");
  query.set("page",String(Math.max(1,Number(u.get("page"))||1)));
  query.set("limit","8");return "/search?"+query;
 },[initialized]);
 const data=usePublic<Results>(requestPath);
 const shown=data.data,params=initialized?urlParams():initial;
 function update<K extends keyof Params>(k:K,value:Params[K]){
  setState(s=>({...s,[k]:value,page:1}));
 }
 function submit(e:FormEvent){e.preventDefault();window.location.assign(searchHref({...state,page:1}))}
 function location(){
  if(!navigator.geolocation){setGeoError(t("locationUnsupported"));return}
  setLocationPending(true);setGeoError("");
  navigator.geolocation.getCurrentPosition(position=>{
   setLocationPending(false);
   const {latitude,longitude}=position.coords;
   const next={...state,latitude:String(latitude),longitude:String(longitude),
    sort:"distance",city:"",page:1};
   window.location.assign(searchHref(next));
  },()=>{setLocationPending(false);setGeoError(t("noLocation"))},{
   timeout:8000,enableHighAccuracy:false,maximumAge:300000});
 }
 if(!initialized)return <Loading/>;
 return <div className="p13-search-page p13-page-content">
  <div className="p13-breadcrumb"><a href="/">{t("home")}</a><span aria-hidden="true">/</span>
   <strong>{t("find")}</strong></div>
  <div className="p13-section-title"><div><span className="p13-kicker">{t("eyebrow")}</span>
   <h1>{t("searchResults")}</h1><p>{t("searchHelp")}</p></div></div>
  <div className="p13-search-layout">
   <div className="p13-mobile-filter-toolbar">
    <button type="button" aria-controls="p13-search-filters" aria-expanded={mobileFilters}
     className="p13-mobile-filter-button" onClick={()=>setMobileFilters(x=>!x)}>
     <span aria-hidden="true">☷</span> {t("filters")}
     <span aria-hidden="true">{mobileFilters?"⌃":"⌄"}</span>
    </button>
    <a href="/search?city=">{t("clear")}</a>
   </div>
   <aside id="p13-search-filters" className={"p13-filter-panel"+(mobileFilters?" p13-filter-panel-open":"")}>
    <form role="search" onSubmit={submit}>
     <div className="p13-filter-head"><h2>{t("filters")}</h2>
      <a href="/search?city=">{t("clear")}</a></div>
     <label className="p13-field"><span>{t("findDentist")}</span>
      <input value={state.q} maxLength={100} placeholder={t("findDentist")}
       onChange={e=>update("q",e.target.value)}/></label>
     <SearchCity facets={facets.data} value={state.city} setValue={v=>update("city",v)}/>
     <label className="p13-field"><span>{t("specialty")}</span>
      <select value={state.specialty} onChange={e=>update("specialty",e.target.value)}>
       <option value="">{t("allSpecialties")}</option>
       {state.specialty&&!facets.data?.specialties.some(x=>x.name===state.specialty)&&
        <option value={state.specialty}>{state.specialty}</option>}
       {facets.data?.specialties.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}
      </select></label>
     <label className="p13-field"><span>{t("service")}</span>
      <select value={state.service} onChange={e=>update("service",e.target.value)}>
       <option value="">{t("allServices")}</option>
       {state.service&&!facets.data?.services.some(x=>x.name===state.service)&&
        <option value={state.service}>{state.service}</option>}
       {facets.data?.services.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}
      </select></label>
     <label className="p13-field"><span>{t("date")}</span>
      <input type="date" min={today()} value={state.date}
       onChange={e=>update("date",e.target.value)}/><small>{t("localeHint")}</small>
     </label>
     <label className="p13-field"><span>{t("maxFee")}</span>
      <select value={state.maxFee} onChange={e=>update("maxFee",e.target.value)}>
       <option value="">{t("anyFee")}</option>
       {[500,1000,2000,3000,5000,10000].map(x=><option key={x} value={x}>{x} AFN</option>)}
      </select></label>
     <label className="p13-verified-filter"><input type="checkbox" checked={state.verified}
      onChange={e=>update("verified",e.target.checked)}/><span>{t("verifiedOnly")}</span></label>
     <p className="p13-filter-hint">{t("verifiedHint")}</p>
     <button type="submit" className="btn btn-primary p13-filter-submit">{t("show")} →</button>
    </form>
   </aside>
   <div className="p13-results">
    <div className="p13-results-toolbar">
     <div><h2>{t("searchResults")}</h2>
      {shown&&<p><strong>{shown.pagination.totalExact?shown.pagination.total:
       shown.pagination.total+"+"}</strong> {t("results")}</p>}</div>
     <div className="p13-results-tools">
      <button className="p13-geolocate" type="button" onClick={location}
       disabled={locationPending}>{locationPending?t("locationFetching"):t("nearMe")}</button>
      <label className="p13-sort"><span>{t("sortBy")}</span>
       <select value={params.sort} onChange={e=>window.location.assign(searchHref({
        ...params,sort:e.target.value,page:1}))}>
        <option value="relevance">{t("relevance")}</option>
        <option value="name">{t("name")}</option>
        <option value="soonest">{t("soonest")}</option>
        {params.latitude&&params.longitude&&<option value="distance">{t("distance")}</option>}
       </select></label></div>
    </div>
    {geoError&&<InlineAlert kind="warning">{geoError}</InlineAlert>}
    {data.error?<Failure code={data.error} retry={data.refresh}/>:data.loading?<Loading/>:
     shown?.items.length?<div className="p13-result-stack">
      {shown.items.map(item=><ClinicCard item={item} key={item.clinic.id}/>)}
     </div>:<div className="p13-blank-state"><div className="p13-empty-icon" aria-hidden="true">⌕</div>
      <h3>{t("noResults")}</h3><p>{t("noClinics")} {t("emptyHint")}</p>
      <a className="btn btn-primary" href="/search?city=">{t("clear")}</a></div>}
    {shown?.resultsTruncated&&<InlineAlert kind="warning">{t("limited")}: {t("narrowResults")}</InlineAlert>}
    {shown&&shown.pagination.total>0&&<nav className="p13-pagination" aria-label={t("page")}>
      <a className={shown.pagination.page<=1?"disabled":""}
       aria-disabled={shown.pagination.page<=1}
       href={shown.pagination.page<=1?undefined:searchHref({...params,page:params.page-1})}>
       ← {t("previous")}</a>
      <span>{t("page")} {shown.pagination.page}</span>
      <a className={!shown.pagination.hasNext?"disabled":""}
       aria-disabled={!shown.pagination.hasNext} href={!shown.pagination.hasNext?undefined:
        searchHref({...params,page:params.page+1})}>{t("next")} →</a>
     </nav>}
    <p className="p13-search-disclaimer">{t("datesReal")} {t("bookingLater")}</p>
   </div>
  </div>
 </div>;
}
function BackTrail({items}:{items:{title:string;href?:string}[]}){
 return <div className="p13-breadcrumb">{items.map((item,index)=>
  <React.Fragment key={index}>{index>0&&<span aria-hidden="true">/</span>}
   {item.href?<a href={item.href}>{item.title}</a>:<strong>{item.title}</strong>}
  </React.Fragment>)}</div>;
}
function HoursTable({hours}:{hours:Hours|null}){
 const {t}=useLanguage();const days=["sunday","monday","tuesday","wednesday",
  "thursday","friday","saturday"];
 const fmt=(m:number)=>String(Math.floor(m/60)).padStart(2,"0")+":"+
  String(m%60).padStart(2,"0");
 return <div className="p13-hours">
  {days.map((day,n)=>{
   const h=hours?.weekly.find(x=>x.weekday===n);
   return <div key={day} className={hours?.now.weekday===n?"p13-today":""}>
    <span>{t(day)}</span><strong dir="ltr">{h?.isOpen?fmt(h.startMinute)+"–"+fmt(h.endMinute):t("closed")}</strong>
   </div>})}
  <small>{t("timeZone")} · {t("holidayNote")}</small>
 </div>;
}
function ServiceRow({service}:{service:Service}){
 const {t,money}=useLanguage();return <div className="p13-service-line">
  <div className="p13-service-icon" aria-hidden="true">✧</div>
  <div><strong>{service.name}</strong><span>{service.category} · {service.durationMinutes} {t("minutes")}</span></div>
  <strong dir="ltr">{money(service.priceAfn)}</strong>
 </div>;
}
function ProfessionalCard({clinicId,dentist}:{clinicId:string;dentist:Dentist}){
 const {t}=useLanguage();
 return <a className="p13-professional-card" href={"/clinics/"+clinicId+"/dentists/"+dentist.id}>
  <div className="p13-avatar" aria-hidden="true">{dentist.displayName?.trim().slice(0,1)||"✦"}</div>
  <div><strong>{dentist.displayName}</strong>
   <small>{dentist.specialty||"—"}</small>
   <span><span aria-hidden="true">✓</span> {t("verified")}</span></div>
  <span className="p13-profile-arrow" aria-hidden="true">→</span>
 </a>;
}
function AvailabilityPanel({clinicId,services,dentists,doctorId,phone,horizon}:{
 clinicId:string;services:Service[];dentists:Dentist[];
 doctorId?:string;phone:string;horizon:number}){
 const {t,date,money,lang,calendar}=useLanguage();
 const [day,setDay]=useState(today()),[service,setService]=useState(""),
  [doctor,setDoctor]=useState(doctorId||"");
 useEffect(()=>{if(doctorId)setDoctor(doctorId)},[doctorId]);
 const url=useMemo(()=>{
  const q=new URLSearchParams({date:day});
  if(service)q.set("serviceId",service);
  if(doctor)q.set("dentistId",doctor);
  return "/clinics/"+clinicId+"/availability?"+q;
 },[day,service,doctor,clinicId]);
 const result=usePublic<Availability>(url);
 const maxDay=new Date(Date.parse(today()+"T00:00:00Z")+
  (Math.min(horizon,90)-1)*86400000).toISOString().slice(0,10);
 return <div className="p13-availability-module">
  <div className="p13-section-title"><div><h2>{t("scheduleAvailability")}</h2>
   <p>{t("datesReal")}</p></div></div>
  <div className="p13-date-ribbon" role="group" aria-label={t("chooseDate")}>
   {Array.from({length:Math.min(7,Math.max(1,horizon))},(_,i)=>{
    const current=new Date(today()+"T12:00:00Z");
    current.setUTCDate(current.getUTCDate()+i);
    const iso=current.toISOString().slice(0,10);
    const format=new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
     weekday:"short",month:"short",day:"numeric",
     calendar:calendar==="solar_hijri"?"persian":"gregory"});
    return <button key={iso} type="button" className={day===iso?"p13-date-selected":""}
     aria-pressed={day===iso} onClick={()=>setDay(iso)}>
     <span>{format.formatToParts(current).find(x=>x.type==="weekday")?.value}</span>
     <strong>{format.formatToParts(current).find(x=>x.type==="day")?.value}</strong>
     <small>{format.formatToParts(current).find(x=>x.type==="month")?.value}</small>
    </button>;
   })}
  </div>
  <div className="p13-availability-filters">
   <label className="p13-field"><span>{t("chooseDate")}</span>
    <input type="date" value={day} min={today()} max={maxDay}
     onChange={e=>setDay(e.target.value||today())}/></label>
   <label className="p13-field"><span>{t("chooseService")}</span>
    <select value={service} onChange={e=>setService(e.target.value)}>
     <option value="">{t("allListedServices")}</option>
     {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>
   {!doctorId&&<label className="p13-field"><span>{t("chooseDentist")}</span>
    <select value={doctor} onChange={e=>setDoctor(e.target.value)}>
     <option value="">{t("allDentists")}</option>
     {dentists.map(d=><option key={d.id} value={d.id}>{d.displayName}</option>)}
    </select></label>}
   <button type="button" className="btn btn-secondary" onClick={result.refresh}>{t("refresh")}</button>
  </div>
  {result.error?<Failure code={result.error} retry={result.refresh}/>:
   result.loading?<Loading compact/>:
   result.data?.slots.length?
    <div className="p13-slot-grid" role="list">{result.data.slots.slice(0,30).map((x,i)=>
     <div className="p13-slot" role="listitem" key={x.dentistId+x.serviceId+x.startAt+i}>
      <span>{date(x.startAt,{time:true})}</span>
      <small>{x.dentistName} · {x.serviceName}</small>
      <strong dir="ltr">{money(x.priceAfn)}</strong>
     </div>)}</div>:
    <div className="p13-blank-state p13-availability-empty">
     <h3>{t("noTimeDate")}</h3><p>{t("previewOnly")}</p>
     <a className="btn btn-secondary" href={"tel:"+phone}>{t("contactClinic")}</a>
    </div>}
  <p className="p13-availability-disclaimer"><span aria-hidden="true">ⓘ</span>
   {t("timePreview")} {t("bookingLater")}</p>
 </div>;
}
async function copyUrl(t:(key:string)=>string,setToast:(x:string)=>void){
 try{
  await navigator.clipboard.writeText(window.location.href);setToast(t("copied"));
  setTimeout(()=>setToast(""),2600);
 }catch{/* Clipboard permissions may be unavailable; existing address bar remains copyable. */}
}
export function PatientClinicPage({clinicId}:{clinicId:string}){
 const {t}=useLanguage(),info=usePublic<ClinicDetail>("/clinics/"+encodeURIComponent(clinicId));
 const [tab,setTab]=useState("description"),[photo,setPhoto]=useState(0),[toast,setToast]=useState("");
 if(info.error)return <div className="p13-page-content"><Failure code={info.error} retry={info.refresh}/></div>;
 if(info.loading||!info.data)return <Loading/>;
 const item=info.data,p=item.profile;
 const names=["description","dentists","services","gallery","availability","aboutClinic"];
 const directions="https://www.openstreetmap.org/?mlat="+p.latitude+
  "&mlon="+p.longitude+"#map=16/"+p.latitude+"/"+p.longitude;
 return <div className="p13-profile-page p13-page-content">
  <BackTrail items={[{title:t("home"),href:"/"},{title:t("find"),href:"/search"},
   {title:item.clinic.name}]}/>
  <section className="p13-profile-cover">
   <div className="p13-profile-image">
    <Picture wide src={p.photos[photo]||p.photos[0]} label={item.clinic.name}/>
    {p.photos.length>1&&<div className="p13-gallery-picker">
     {p.photos.map((x,i)=><button type="button" key={x.id}
      className={photo===i?"active":""} onClick={()=>setPhoto(i)}
      aria-label={t("photo")+" "+(i+1)} aria-pressed={photo===i}>
      <img src={API+x.url} alt={x.caption||t("photo")+" "+(i+1)}/></button>)}
    </div>}
   </div>
   <div className="p13-profile-intro"><span className="p13-kicker">{t("clinicProfile")}</span>
    <VerifiedBadge/><h1>{item.clinic.name}</h1>
    <p className="p13-profile-address">⌖ {item.clinic.address},
     {item.clinic.city}, {item.clinic.province}</p>
    <div className="p13-tags">{p.specialties.map(x=><span key={x}>{x}</span>)}</div>
    <span className="p13-scheduled-indicator"><span aria-hidden="true">◷</span>
     {item.hours?.now.isWithinPublishedHours?t("openScheduled"):t("closedScheduled")}</span>
    <p>{t("holidayNote")}</p>
    <div className="p13-profile-actions">
     <a className="btn btn-primary" href={"tel:"+item.clinic.phone}>
      {t("contactClinic")}</a>
     <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer" href={directions}>
      {t("directions")} ↗</a>
     <button className="btn btn-secondary" onClick={()=>copyUrl(t,setToast)}>{t("share")}</button>
    </div>
    {toast&&<span className="p13-toast" role="status">{toast}</span>}
    <small>{t("noBooking")}</small>
   </div>
  </section>
  <div className="p13-profile-grid">
   <div className="p13-profile-primary">
    <nav className="p13-tabs" role="tablist" aria-label={t("clinicProfile")}>
     {names.map(x=><button role="tab" type="button" aria-selected={tab===x}
      key={x} onClick={()=>setTab(x)}>{t(x)}</button>)}
    </nav>
    <div className="p13-tab-panel" role="tabpanel">
     {tab==="description"&&<div className="p13-info-stack">
      <section className="p13-panel"><h2>{t("aboutClinic")}</h2><p className="p13-prose">{p.description}</p>
       {p.contactNote&&<p className="p13-note">{p.contactNote}</p>}</section>
      <section className="p13-panel">
       <div className="p13-section-title"><div><h2>{t("verifiedProfessionals")}</h2></div>
        <button type="button" onClick={()=>setTab("dentists")}>{t("seeAll")} →</button></div>
       <div className="p13-dentist-grid">{p.dentists.slice(0,4).map(d=>
        <ProfessionalCard key={d.id} dentist={d} clinicId={clinicId}/>)}</div>
      </section>
      <section className="p13-panel"><div className="p13-section-title">
       <div><h2>{t("publicService")}</h2></div>
       <button type="button" onClick={()=>setTab("services")}>{t("seeAll")} →</button></div>
       {p.services.slice(0,4).map(s=><ServiceRow service={s} key={s.id}/>)}</section>
      </div>}
     {tab==="dentists"&&<section className="p13-panel"><h2>{t("verifiedProfessionals")}</h2>
      <p className="p13-muted">{t("unverifiedNever")}</p>
      <div className="p13-dentist-grid">{p.dentists.map(d=>
       <ProfessionalCard key={d.id} dentist={d} clinicId={clinicId}/>)}</div></section>}
     {tab==="services"&&<section className="p13-panel">
      <h2>{t("publicService")}</h2><p className="p13-muted">{t("trustDescription")}</p>
      {p.services.map(s=><ServiceRow key={s.id} service={s}/>)}</section>}
     {tab==="gallery"&&<section className="p13-panel p13-gallery-panel">
      <div className="p13-section-title"><div><h2>{t("gallery")}</h2>
       <p className="p13-muted">{t("galleryHelp")}</p></div></div>
      {p.photos.length?<div className="p13-gallery-grid">
       {p.photos.map((x,i)=><figure key={x.id} className="p13-gallery-item">
        <button type="button" onClick={()=>{setPhoto(i);window.scrollTo({top:0,behavior:"smooth"})}}
         aria-label={t("photo")+" "+(i+1)+" · "+(x.caption||item.clinic.name)}>
         <Picture src={x} label={item.clinic.name}/></button>
        <figcaption>{x.caption||item.clinic.name}</figcaption>
       </figure>)}</div>:
       <div className="p13-blank-state p13-gallery-empty"><div className="p13-empty-icon"
        aria-hidden="true">▧</div><h3>{t("noPublishedPhotos")}</h3>
        <p>{t("galleryHelp")}</p></div>}
     </section>}
     {tab==="availability"&&<section className="p13-panel"><AvailabilityPanel
      clinicId={clinicId} services={p.services} dentists={p.dentists}
      phone={item.clinic.phone} horizon={p.bookingRules.horizonDays}/></section>}
     {tab==="aboutClinic"&&<div className="p13-info-stack">
      <section className="p13-panel"><h2>{t("information")}</h2>
       <dl className="p13-public-facts">
        <div><dt>{t("address")}</dt><dd>{item.clinic.address}</dd></div>
        <div><dt>{t("city")}</dt><dd>{item.clinic.city}, {item.clinic.province}</dd></div>
        <div><dt>{t("phone")}</dt><dd><a href={"tel:"+item.clinic.phone} dir="ltr">
         {item.clinic.phone}</a></dd></div>
        <div><dt>{t("source")}</dt><dd>{t("evidenceReviewed")}</dd></div>
       </dl></section>
      <section className="p13-panel"><h2>{t("hours")}</h2>
       <HoursTable hours={item.hours}/></section>
      <section className="p13-panel"><h2>{t("legal")}</h2>
       <p>{t("aboutNoBooking")}</p><a href="/privacy" className="p13-inline-link">
        {t("privacy")}</a></section>
     </div>}
    </div>
   </div>
   <aside className="p13-profile-aside">
    <div className="p13-contact-box"><span className="p13-kicker">{t("contactTitle")}</span>
     <h3>{item.clinic.name}</h3><p>{t("contactText")}</p>
     <a className="btn btn-primary" href={"tel:"+item.clinic.phone}>{t("contactClinic")}</a>
     <strong dir="ltr">{item.clinic.phone}</strong>
     <span>{t("bookingLater")}</span></div>
    <div className="p13-aside-hours"><h3>{t("hours")}</h3><HoursTable hours={item.hours}/></div>
   </aside>
  </div>
 </div>;
}
export function PatientDentistPage({clinicId,dentistId}:{clinicId:string;dentistId:string}){
 const {t,date}=useLanguage();
 const info=usePublic<DentistDetail>("/clinics/"+encodeURIComponent(clinicId)+
  "/dentists/"+encodeURIComponent(dentistId));
 const [tab,setTab]=useState("description");
 if(info.error)return <div className="p13-page-content"><Failure code={info.error} retry={info.refresh}/></div>;
 if(info.loading||!info.data)return <Loading/>;
 const item=info.data,d=item.dentist;
 return <div className="p13-profile-page p13-page-content">
  <BackTrail items={[{title:t("home"),href:"/"},{title:t("find"),href:"/search"},
   {title:item.clinic.name,href:"/clinics/"+clinicId},{title:d.displayName}]}/>
  <section className="p13-dentist-hero">
   <div className="p13-big-avatar" role="img" aria-label={t("imageMissing")}>
    {d.displayName?.trim().slice(0,1)||"✦"}</div>
   <div className="p13-dentist-hero-main"><span className="p13-kicker">{t("dentist")}</span>
    <VerifiedBadge provider/><h1>{d.displayName}</h1>
    <p className="p13-dentist-specialty">{d.specialty||"—"}</p>
    <p className="p13-profile-address">⌖ {item.clinic.name} · {item.clinic.city},
     {item.clinic.province}</p>
    <div className="p13-profile-actions">
     <a href={"tel:"+item.clinic.phone} className="btn btn-primary">{t("contactClinic")}</a>
     <a href={"/clinics/"+clinicId} className="btn btn-secondary">{t("viewClinic")}</a>
    </div>
    <small>{t("evidenceReviewed")}. {t("bookingLater")}</small>
   </div>
  </section>
  <div className="p13-profile-grid">
   <div className="p13-profile-primary">
    <nav className="p13-tabs" role="tablist" aria-label={t("dentist")}>
     {(["description","services","availability"] as const).map(x=>
      <button role="tab" type="button" key={x} aria-selected={tab===x}
       onClick={()=>setTab(x)}>{t(x)}</button>)}</nav>
    <div className="p13-tab-panel" role="tabpanel">
     {tab==="description"&&<div className="p13-info-stack">
      <section className="p13-panel"><h2>{t("aboutProfessional")}</h2>
       <p className="p13-prose">{d.biography||t("noBio")}</p>
       <dl className="p13-public-facts">
        <div><dt>{t("specialty")}</dt><dd>{d.specialty||"—"}</dd></div>
        <div><dt>{t("qualifications")}</dt><dd>{d.qualifications||t("notListed")}</dd></div>
        <div><dt>{t("source")}</dt><dd>{t("evidenceReviewed")}</dd></div>
        {d.validUntil&&<div><dt>{t("validTo")}</dt><dd>{date(d.validUntil)}</dd></div>}
       </dl>
      </section>
      <section className="p13-panel"><h2>{t("clinic")}</h2>
       <p>{item.clinic.name} · {item.clinic.address}</p>
       <a className="p13-inline-link" href={"/clinics/"+clinicId}>{t("viewClinic")} →</a>
      </section>
     </div>}
     {tab==="services"&&<section className="p13-panel"><h2>{t("publicService")}</h2>
      {item.services.map(s=><ServiceRow service={s} key={s.id}/>)}
      <p className="p13-muted">{t("feeFrom")} {t("notListed")}</p>
     </section>}
     {tab==="availability"&&<section className="p13-panel">
      <AvailabilityPanel clinicId={clinicId} services={item.services}
       dentists={[d]} doctorId={dentistId} phone={item.clinic.phone}
       horizon={item.bookingRules.horizonDays}/></section>}
    </div>
   </div>
   <aside className="p13-profile-aside">
    <div className="p13-contact-box"><span className="p13-kicker">{t("currentAffiliation")}</span>
     <h3>{item.clinic.name}</h3><p>{t("contactText")}</p>
     <a className="btn btn-primary" href={"tel:"+item.clinic.phone}>{t("contactClinic")}</a>
     <strong dir="ltr">{item.clinic.phone}</strong>
     <span>{t("noBooking")}</span></div>
    <div className="p13-aside-hours"><h3>{t("hours")}</h3><HoursTable hours={item.hours}/></div>
   </aside>
  </div>
 </div>;
}
export function PatientAboutPage(){
 const {t}=useLanguage();
 return <div className="p13-about-page p13-page-content">
  <BackTrail items={[{title:t("home"),href:"/"},{title:t("about")}]}/>
  <section className="p13-about-hero"><span className="p13-kicker">{t("patientExperience")}</span>
   <h1>{t("aboutTitle")}</h1><p>{t("aboutIntro")}</p>
   <a href="/search" className="btn btn-primary">{t("startExplore")} →</a></section>
  <section className="p13-panel"><h2>{t("trustTitle")}</h2><p>{t("aboutSafety")}</p>
   <div className="p13-confidence-grid">
    {[1,2,3,4].map(i=><div className="p13-confidence-card" key={i}>
     <span className="p13-confidence-number">0{i}</span><p>{t("aboutStep"+i)}</p></div>)}
   </div>
   <p>{t("aboutNoBooking")}</p><p>{t("aboutContact")}</p>
   <div className="p13-actions"><a className="btn btn-secondary" href="/privacy">
    {t("privacy")}</a><a className="btn btn-secondary" href="/terms">{t("legal")}</a></div>
  </section>
 </div>;
}
