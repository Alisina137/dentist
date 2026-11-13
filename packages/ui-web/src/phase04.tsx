"use client";
import React,{useCallback,useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import { InlineAlert,usePreferences } from "./index";
import { Shell } from "./phase03";
type Language="en"|"fa-AF"|"ps-AF";
type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;
 role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Page="services"|"resources"|"hours";
type Service={id:string;clinicId:string;name:string;category:string;description:string|null;
 durationMinutes:number;preparationMinutes:number;basePriceAfn:number;requiresChair:boolean;
 publicBooking:boolean;active:boolean;version:number;createdAt:string;updatedAt:string};
type Resource={id:string;clinicId:string;code:string;label:string;kind:"chair"|"room";
 equipment:string|null;active:boolean;revision:number;updatedAt:string};
type Shift={weekday:number;isOpen:boolean;startMinute:number;endMinute:number;
 breaks:{start:number;end:number}[];revision?:number};
type Doctor={membershipId:string;name:string;role:string};
type HoursData={hours:Shift[];providers:(Shift&{membershipId:string})[];
 resources:(Shift&{resourceId:string})[];clinicians:Doctor[];
 exceptions:{id:string;startDate:string;endDate:string;kind:string;startMinute:number|null;
  endMinute:number|null;reason:string}[];timezone:string};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const dict:Record<Language,Record<string,string>>={
 en:{
  services:"Services & Pricing",resources:"Chairs & Rooms",hours:"Hours & Holidays",
  servicesIntro:"Build the clinic catalog with reliable durations, transparent AFN prices and chair needs.",
  resourcesIntro:"Keep treatment chairs and rooms organized before scheduling patients.",
  hoursIntro:"Define real clinic hours, provider shifts and closures. Preview only, not live booking.",
  operations:"Clinic operations",settings:"Settings",dashboard:"Dashboard",patients:"Patients",
  staff:"Staff & Resources",team:"Team",overview:"Overview",refresh:"Refresh",
  addService:"New service",editService:"Edit service",serviceName:"Service name",category:"Category",
  description:"Description",duration:"Treatment minutes",buffer:"Preparation / buffer minutes",
  price:"Base price (AFN)",requiresChair:"Requires a dental chair",publicBooking:"Allow public booking when published",
  active:"Active",inactive:"Inactive",status:"Status",all:"All",search:"Search services",filter:"Filter",
  save:"Save changes",create:"Create",cancel:"Cancel",close:"Close",action:"Action",
  edit:"Edit",history:"Price & version history",version:"Version",current:"Current",
  neverRetroactive:"Changes create a new catalog version. Historic quotes and invoices remain unchanged.",
  durationHelp:"5–240 minutes in 5-minute increments; preparation time is added to each slot.",
  priceHelp:"Prices are nonnegative amounts in Afghan afghanis; not invoices or payments.",
  publicHelp:"Public booking stays unavailable until the verification and patient-booking phases.",
  noneServices:"No services created yet",noneServicesHelp:"Add a consultation to begin configuring your practice.",
  noneResources:"No chairs or rooms yet",noneResourcesHelp:"Add a treatment chair to unlock resource-based availability.",
  addResource:"Add chair / room",editResource:"Edit resource",resourceName:"Display name",code:"Internal code",
  kind:"Type",chair:"Chair",room:"Room",equipment:"Equipment or capabilities",
  resourceCodeHelp:"Unique within the clinic, 2–24 uppercase letters, numbers, hyphen or underscore.",
  resourceUsed:"This resource has a saved working schedule. Clear its schedule before deactivating.",
  scheduleResource:"Manage resource hours",deactivate:"Deactivate",reactivate:"Reactivate",
  noDeletes:"Resources and services are deactivated, never silently deleted.",
  weekly:"Clinic hours",providers:"Dentist shifts",chairs:"Chair schedules",exceptions:"Holidays & closures",
  preview:"Availability preview",daysOpen:"Open days",scheduledDentists:"Scheduled dentists",
  ready:"Ready to preview",setup:"Setup checklist",notReady:"Finish setup to preview candidate times",
  stepService:"Add a service",stepChair:"Add an active chair (if needed)",stepHours:"Set clinic hours",
  stepDoctor:"Assign a dentist shift",daySat:"Saturday",daySun:"Sunday",dayMon:"Monday",
  dayTue:"Tuesday",dayWed:"Wednesday",dayThu:"Thursday",dayFri:"Friday",
  open:"Open",closed:"Closed",from:"From",to:"To",breaks:"Breaks",addBreak:"Add break",
  remove:"Remove",saveWeek:"Save weekly hours",weekHint:"Daily hours use Afghanistan time (Asia/Kabul).",
  unsavedWeek:"Suggested working hours are not saved. Save this week to enable previews.",
  chooseProvider:"Choose dentist",chooseChair:"Choose chair or room",
  noProviders:"No active dentist identities yet. Invite a dentist or enable the owner’s clinician identity in Staff.",
  noChairs:"No active chairs are available. Create one in Chairs & Rooms.",
  providerShiftHelp:"Save each clinician's working days separately. A dentist must have saved shifts to appear in previews.",
  resourceShiftHelp:"Optional chair shifts further restrict clinic hours. Without a chair shift, an active chair follows clinic hours.",
  clearResourceHours:"Clear chair schedule",clearHelp:"Clearing a chair schedule allows deactivation and restores inherited clinic hours.",
  noResourceSchedule:"No custom chair schedule yet.",date:"Date",startDate:"Start date",
  endDate:"End date",kindException:"Exception type",holiday:"Closed / holiday",special:"Special opening hours",
  reason:"Reason",addException:"Add exception",emptyException:"No recorded closures or special days.",
  exceptionHint:"Exceptions cannot overlap. A closure never silently deletes booked appointments.",
  exceptionRemove:"Remove exception",removeReason:"Reason for removing this exception",
  selectService:"Choose service",selectDate:"Choose date",checkSlots:"Preview candidate slots",
  candidate:"Candidate times",candidateOnly:"Configuration preview — not a reservation or public appointment.",
  noSlots:"No candidate times for these settings",slotHint:"Update the service, working hours, dentist shift or chair and try again.",
  timezone:"Afghanistan time",publicOff:"Public booking is not live",
  minutes:"min",slots:"slots",capacity:"Resources",activeServices:"Active services",
  openDays:"Open days",setupProgress:"Operational readiness",
  loading:"Loading…",tryAgain:"Try again",failed:"Request failed",success:"Changes saved",
  forbidden:"You can view these settings, but only the clinic owner or manager can modify them.",
  stale:"Someone else updated this item. Refresh and try again.",permission:"Sign in to the correct clinic.",
  empty:"Nothing here yet",searchEmpty:"Nothing matches these filters",clearFilters:"Clear filters",
  statusLive:"Active",statusInactive:"Inactive",statusDraft:"Draft only",timeError:"Start must be before end; breaks cannot overlap.",
  allCategories:"All categories",allStatuses:"All statuses",custom:"Custom",
  clickToEdit:"Choose a row to edit its details",linked:"Linked from scheduling",
  selected:"Selected",dateRange:"Dates",saving:"Saving…",previewFirst:"Select a service and a dentist to preview.",
  effective:"Effective",errors:"Please correct the fields and retry.",readOnly:"Read-only",
  clinicStatus:"Clinic",trialInfo:"Operation settings do not publish a clinic or verify a dentist.",
  readonlyAccess:"You have read-only access to scheduling settings.",
  summary:"Operations summary",startSetup:"Configure operations",reviewSetup:"Review configuration",
  servicesTab:"Service catalog",versionsTab:"Version history",resourcesTab:"Resources",
  applyFilter:"Apply",done:"Done",disable:"Disable",enable:"Enable",
  noProvidersHint:"Use Staff & Resources to invite a dentist or activate your clinician role.",
  breakStart:"Break start",breakEnd:"Break end",breaksCount:"Breaks",configured:"Configured",
  unsaved:"Unsaved",required:"Required",deleteConfirm:"Remove this exception?",
  codeTaken:"That resource code or service name already exists in this clinic.",
  slotCost:"Estimated price",today:"Today",tomorrow:"Tomorrow",unknown:"Not scheduled",
  hoursWarning:"Saving hours changes candidate availability but does not cancel confirmed appointments.",
  manualOnly:"Clinic-only configuration. Appointment scheduling ships in Phase 6.",
  status_ready:"Ready",status_clinic_closed:"Clinic closed",status_provider_unavailable:"Provider unavailable",
  status_chair_unavailable:"Chair unavailable",status_holiday_closed:"Holiday / closure",
  noPublic:"Not a live marketplace listing",notConfigured:"Not configured",more:"More",
  lastUpdated:"Last updated",staffLink:"Manage staff",openServices:"Open services",
  openResources:"Open resources",openHours:"Open hours",stepDone:"Complete",stepPending:"To do",
  createFirst:"Create your first service"
 },
 "fa-AF":{
  services:"خدمات و قیمت‌ها",resources:"چوکی‌ها و اتاق‌ها",hours:"ساعات و رخصتی‌ها",
  servicesIntro:"خدمات کلینیک را با مدت دقیق، قیمت افغانی و نیاز چوکی تنظیم کنید.",
  resourcesIntro:"چوکی‌های تداوی و اتاق‌ها را پیش از ثبت وقت منظم کنید.",
  hoursIntro:"ساعات کلینیک، شیفت داکتر و رخصتی‌ها را تنظیم کنید. پیش‌نمایش هنوز رزرو نیست.",
  operations:"عملیات کلینیک",settings:"تنظیمات",dashboard:"داشبورد",patients:"مریضان",
  staff:"کارمندان و منابع",team:"تیم",overview:"نمای کلی",refresh:"تازه‌سازی",
  addService:"افزودن خدمت",editService:"ویرایش خدمت",serviceName:"نام خدمت",category:"دسته‌بندی",
  description:"توضیحات",duration:"دقیقه تداوی",buffer:"دقیقه آماده‌سازی",
  price:"قیمت پایه (افغانی)",requiresChair:"نیاز به چوکی دندان",publicBooking:"اجازه رزرو عمومی بعد از نشر",
  active:"فعال",inactive:"غیرفعال",status:"وضعیت",all:"همه",search:"جستجوی خدمات",
  filter:"فیلتر",save:"ذخیره تغییرات",create:"ایجاد",cancel:"انصراف",close:"بستن",
  action:"عملیات",edit:"ویرایش",history:"تاریخچه قیمت و نسخه",version:"نسخه",current:"فعلی",
  neverRetroactive:"هر تغییر نسخه جدید می‌سازد؛ نرخ‌ها و بل‌های قبلی تغییر نمی‌کنند.",
  durationHelp:"مدت ۵ تا ۲۴۰ دقیقه با گام‌های ۵ دقیقه؛ آماده‌سازی به وقت اضافه می‌شود.",
  priceHelp:"قیمت به افغانی و بدون رقم منفی است؛ این بل یا پرداخت نیست.",
  publicHelp:"رزرو عمومی تا مرحله تأیید و رزرو مریض فعال نمی‌شود.",
  noneServices:"هنوز خدمتی ثبت نشده",noneServicesHelp:"برای شروع یک خدمت مشوره اضافه کنید.",
  noneResources:"چوکی یا اتاق ثبت نشده",noneResourcesHelp:"برای نمایش وقت‌ها ابتدا چوکی ثبت کنید.",
  addResource:"افزودن چوکی / اتاق",editResource:"ویرایش منبع",resourceName:"نام نمایشی",
  code:"کود داخلی",kind:"نوع",chair:"چوکی",room:"اتاق",equipment:"وسایل یا قابلیت‌ها",
  resourceCodeHelp:"کود یکتا در کلینیک، ۲–۲۴ حرف انگلیسی، عدد یا خط تیره.",
  resourceUsed:"این منبع شیفت ذخیره‌شده دارد؛ برای غیرفعال‌سازی ابتدا شیفت را پاک کنید.",
  scheduleResource:"تنظیم ساعات منبع",deactivate:"غیرفعال‌سازی",reactivate:"فعال‌سازی",
  noDeletes:"خدمات و منابع غیرفعال می‌شوند، نه اینکه بدون هشدار حذف شوند.",
  weekly:"ساعات کلینیک",providers:"شیفت داکتران",chairs:"ساعات چوکی‌ها",exceptions:"رخصتی‌ها و تعطیلی‌ها",
  preview:"پیش‌نمایش وقت‌ها",daysOpen:"روزهای باز",scheduledDentists:"داکتران شیفت‌دار",
  ready:"آماده بررسی",setup:"چک‌لیست تنظیمات",notReady:"برای دیدن وقت‌ها تنظیمات را کامل کنید.",
  stepService:"افزودن خدمت",stepChair:"افزودن چوکی فعال (در صورت نیاز)",
  stepHours:"ثبت ساعات کلینیک",stepDoctor:"تنظیم شیفت داکتر",
  daySat:"شنبه",daySun:"یکشنبه",dayMon:"دوشنبه",dayTue:"سه‌شنبه",dayWed:"چهارشنبه",
  dayThu:"پنجشنبه",dayFri:"جمعه",open:"باز",closed:"بسته",from:"از",to:"تا",
  breaks:"وقفه‌ها",addBreak:"افزودن وقفه",remove:"حذف",saveWeek:"ذخیره ساعات هفته",
  weekHint:"ساعات به وقت افغانستان (Asia/Kabul) ذخیره می‌شود.",
  unsavedWeek:"این ساعات پیشنهادی هنوز ذخیره نشده‌اند؛ دکمه ذخیره را بزنید.",
  chooseProvider:"انتخاب داکتر",chooseChair:"انتخاب چوکی یا اتاق",
  noProviders:"داکتر فعالی وجود ندارد؛ از بخش کارمندان داکتر دعوت کنید.",
  noChairs:"چوکی فعال پیدا نشد؛ ابتدا یک چوکی بسازید.",
  providerShiftHelp:"شیفت هر داکتر جداگانه ثبت می‌شود. بدون شیفت ذخیره‌شده وقت نمایش داده نمی‌شود.",
  resourceShiftHelp:"شیفت چوکی اختیاری است؛ بدون آن ساعات کلینیک اعمال می‌شود.",
  clearResourceHours:"پاک‌کردن شیفت چوکی",clearHelp:"با پاک‌کردن شیفت، منبع دوباره تابع ساعات کلینیک می‌شود.",
  noResourceSchedule:"شیفت جداگانه چوکی موجود نیست.",date:"تاریخ",
  startDate:"تاریخ آغاز",endDate:"تاریخ پایان",kindException:"نوع استثنا",
  holiday:"تعطیل / رخصتی",special:"ساعات ویژه",reason:"دلیل",addException:"افزودن استثنا",
  emptyException:"رخصتی یا ساعات ویژه ثبت نشده است.",
  exceptionHint:"استثناها نباید همپوشانی داشته باشند؛ وقت‌های ثبت‌شده بی‌خبر لغو نمی‌شوند.",
  exceptionRemove:"حذف استثنا",removeReason:"دلیل حذف این استثنا",
  selectService:"انتخاب خدمت",selectDate:"انتخاب تاریخ",checkSlots:"بررسی وقت‌های پیشنهادی",
  candidate:"وقت‌های پیشنهادی",candidateOnly:"فقط پیش‌نمایش تنظیمات است؛ رزرو یا وقت عمومی نیست.",
  noSlots:"در این شرایط وقتی پیدا نشد",slotHint:"خدمت، شیفت داکتر، ساعات یا چوکی را بررسی کنید.",
  timezone:"وقت افغانستان",publicOff:"رزرو عمومی فعال نیست",
  minutes:"دقیقه",slots:"وقت",capacity:"منابع",activeServices:"خدمات فعال",
  openDays:"روزهای باز",setupProgress:"آمادگی عملیاتی",loading:"در حال بارگیری…",
  tryAgain:"تلاش دوباره",failed:"درخواست ناموفق",success:"تغییرات ذخیره شد",
  forbidden:"می‌توانید ببینید اما تنها مالک یا مدیر کلینیک می‌تواند تغییر دهد.",
  stale:"اطلاعات تغییر کرده؛ دوباره تازه‌سازی کنید.",permission:"به کلینیک درست وارد شوید.",
  empty:"موردی ثبت نشده",searchEmpty:"موردی با این فیلتر یافت نشد",clearFilters:"پاک کردن",
  statusLive:"فعال",statusInactive:"غیرفعال",statusDraft:"پیشنویس",
  timeError:"شروع باید پیش از پایان باشد و وقفه‌ها همپوشانی نداشته باشند.",
  allCategories:"همه دسته‌ها",allStatuses:"همه وضعیت‌ها",custom:"سفارشی",
  clickToEdit:"برای ویرایش خدمت را انتخاب کنید",linked:"مرتبط با شیفت",
  selected:"انتخاب‌شده",dateRange:"تاریخ‌ها",saving:"در حال ذخیره…",
  previewFirst:"برای دیدن وقت، خدمت و داکتر انتخاب کنید.",effective:"قابل اجرا",
  errors:"فیلدها را اصلاح کنید.",readOnly:"فقط مشاهده",
  clinicStatus:"کلینیک",trialInfo:"تنظیمات کلینیک را نشر یا داکتر را تأیید نمی‌کند.",
  readonlyAccess:"شما تنها اجازه مشاهده تنظیمات را دارید.",
  summary:"خلاصه عملیات",startSetup:"تنظیم عملیات",reviewSetup:"بررسی تنظیمات",
  servicesTab:"فهرست خدمات",versionsTab:"تاریخچه نسخه‌ها",
  resourcesTab:"منابع",applyFilter:"اعمال",done:"تمام",disable:"غیرفعال‌سازی",
  enable:"فعال‌سازی",noProvidersHint:"از کارمندان و منابع، داکتر دعوت کنید.",
  breakStart:"شروع وقفه",breakEnd:"پایان وقفه",breaksCount:"وقفه‌ها",
  configured:"تنظیم‌شده",unsaved:"ذخیره نشده",required:"ضروری",
  deleteConfirm:"این استثنا حذف شود؟",codeTaken:"کود منبع یا نام خدمت قبلاً ثبت شده است.",
  slotCost:"قیمت تخمینی",today:"امروز",tomorrow:"فردا",unknown:"شیفت ندارد",
  hoursWarning:"تغییر ساعات، وقت‌های پیشنهادی را عوض می‌کند ولی رزروهای تأییدشده را لغو نمی‌کند.",
  manualOnly:"فقط تنظیمات کلینیک؛ نوبت‌دهی در مرحله ۶ فعال می‌شود.",
  status_ready:"آماده",status_clinic_closed:"کلینیک بسته",status_provider_unavailable:"داکتر در دسترس نیست",
  status_chair_unavailable:"چوکی در دسترس نیست",status_holiday_closed:"روز تعطیل",
  noPublic:"فهرست عمومی فعال نیست",notConfigured:"تنظیم نشده",more:"بیشتر",
  lastUpdated:"آخرین تغییر",staffLink:"مدیریت کارمندان",openServices:"خدمات",
  openResources:"منابع",openHours:"ساعات",stepDone:"تکمیل",stepPending:"باقی",
  createFirst:"اولین خدمت را اضافه کنید"
 },
 "ps-AF":{
  services:"خدمتونه او بیې",resources:"څوکۍ او خونې",hours:"کاري وختونه او رخصتۍ",
  servicesIntro:"د کلینیک خدمتونه د دقیق وخت، افغانیو بیې او څوکۍ اړتیا سره برابر کړئ.",
  resourcesIntro:"د وخت اخیستلو له پیل مخکې د غاښونو څوکۍ او خونې تنظیم کړئ.",
  hoursIntro:"د کلینیک وختونه، د ډاکټر شیفټونه او رخصتۍ وټاکئ. دا لا رښتینې بکینګ نه دی.",
  operations:"د کلینیک چارې",settings:"تنظیمات",dashboard:"ډشبورډ",patients:"ناروغان",
  staff:"کارکوونکي او سرچینې",team:"ټیم",overview:"لنډیز",refresh:"تازه کول",
  addService:"خدمت اضافه کړئ",editService:"خدمت سم کړئ",serviceName:"د خدمت نوم",
  category:"کټګوري",description:"تشریح",duration:"د درملنې دقیقې",
  buffer:"د چمتووالي دقیقې",price:"اصلي بیه (افغانۍ)",
  requiresChair:"د غاښونو څوکۍ ته اړتیا لري",publicBooking:"له خپرېدو وروسته د عامه وخت اجازه",
  active:"فعال",inactive:"غیرفعال",status:"حالت",all:"ټول",search:"خدمتونه ولټوئ",
  filter:"چاڼ",save:"بدلونونه خوندي کړئ",create:"جوړ کړئ",cancel:"لغوه",
  close:"بندول",action:"کړنه",edit:"سمون",history:"د بیو او نسخو تاریخچه",
  version:"نسخه",current:"اوسنی",neverRetroactive:"هر بدلون نوې نسخه جوړوي؛ پخوانۍ بیې نه بدلېږي.",
  durationHelp:"له ۵ تر ۲۴۰ دقیقو، پنځه دقیقې ګام؛ چمتووالی هم حسابېږي.",
  priceHelp:"بیې په افغانیو دي، منفي نه شي کېدای او بل نه دی.",
  publicHelp:"عامه وخت اخیستل د تایید او بکینګ تر پړاوونو بند دي.",
  noneServices:"خدمتونه نشته",noneServicesHelp:"لومړی یو مشورتي خدمت ثبت کړئ.",
  noneResources:"څوکۍ او خونې نشته",noneResourcesHelp:"لومړی یوه څوکۍ ثبت کړئ.",
  addResource:"څوکۍ / خونه اضافه کړئ",editResource:"سرچینه سمه کړئ",
  resourceName:"د ښکاره نوم",code:"داخلي کوډ",kind:"ډول",chair:"څوکۍ",
  room:"خونه",equipment:"وسایل او ځانګړتیاوې",
  resourceCodeHelp:"په کلینیک کې ځانګړی کوډ، ۲–۲۴ انګلیسي توري، شمېرې او نښې.",
  resourceUsed:"دا سرچینه خوندي شوی شیفټ لري. لومړی هغه پاک کړئ.",
  scheduleResource:"د سرچینې شیفټونه",deactivate:"غیرفعالول",reactivate:"فعالول",
  noDeletes:"خدمتونه او سرچینې له خبرتیا پرته نه پاکېږي.",
  weekly:"د کلینیک وختونه",providers:"د ډاکټرانو شیفټونه",chairs:"د څوکیو شیفټونه",
  exceptions:"رخصتۍ او بندې ورځې",preview:"د وختونو مخکتنه",
  daysOpen:"پرانیستې ورځې",scheduledDentists:"شیفټ لرونکي ډاکټران",
  ready:"د کتنې لپاره چمتو",setup:"د تنظیم لړلیک",
  notReady:"د وختونو کتنې لپاره ټول تنظیمات بشپړ کړئ.",
  stepService:"خدمت جوړ کړئ",stepChair:"فعاله څوکۍ جوړه کړئ (که اړینه وي)",
  stepHours:"د کلینیک وختونه وټاکئ",stepDoctor:"د ډاکټر شیفټ وټاکئ",
  daySat:"شنبه",daySun:"یکشنبه",dayMon:"دوشنبه",dayTue:"سې شنبه",
  dayWed:"چهارشنبه",dayThu:"پنجشنبه",dayFri:"جمعه",
  open:"خلاص",closed:"بند",from:"له",to:"تر",breaks:"دمې",
  addBreak:"دمه اضافه کړئ",remove:"لرې کړئ",saveWeek:"اونیز وختونه خوندي کړئ",
  weekHint:"وختونه د افغانستان د وخت (Asia/Kabul) له مخې دي.",
  unsavedWeek:"دا وړاندیز شوي ساعتونه لا نه دي خوندي؛ خوندي یې کړئ.",
  chooseProvider:"ډاکټر غوره کړئ",chooseChair:"څوکۍ یا خونه غوره کړئ",
  noProviders:"فعال ډاکټر نشته؛ له کارکوونکو څخه ډاکټر دعوت کړئ.",
  noChairs:"فعاله څوکۍ نشته؛ لومړی یوه جوړه کړئ.",
  providerShiftHelp:"د هر ډاکټر شیفټونه جلا خوندي کېږي. بې شیفټه وخت نه ښکاري.",
  resourceShiftHelp:"د څوکۍ ځانګړی شیفټ اختیاري دی؛ که نه وي د کلینیک ساعتونه پلي کېږي.",
  clearResourceHours:"د څوکۍ شیفټ پاک کړئ",clearHelp:"د شیفټ له پاکېدو سره څوکۍ د کلینیک ساعتونه اخلي.",
  noResourceSchedule:"ځانګړی شیفټ نه دی ټاکل شوی.",date:"نېټه",startDate:"له نېټې",
  endDate:"تر نېټې",kindException:"د استثنا ډول",holiday:"رخصت / بند",
  special:"ځانګړي وختونه",reason:"دلیل",addException:"استثنا اضافه کړئ",
  emptyException:"رخصتۍ یا ځانګړي ورځې نشته.",
  exceptionHint:"استثناوې باید سره ونه نښلي. ثبت شوي وختونه په خپله نه لغوه کېږي.",
  exceptionRemove:"استثنا لرې کړئ",removeReason:"د استثنا لرې کولو دلیل",
  selectService:"خدمت وټاکئ",selectDate:"نېټه وټاکئ",
  checkSlots:"د شونو وختونو مخکتنه",candidate:"شوني وختونه",
  candidateOnly:"دا یوازې مخکتنه ده؛ رښتینې ریزرو یا عامه وخت نه دی.",
  noSlots:"په دې ترتیب کې وخت نشته",slotHint:"خدمت، د ډاکټر شیفټ، ساعتونه یا څوکۍ وګورئ.",
  timezone:"د افغانستان وخت",publicOff:"عامه بکینګ لا فعال نه دی",
  minutes:"دقیقې",slots:"وختونه",capacity:"سرچینې",activeServices:"فعال خدمتونه",
  openDays:"خلاصې ورځې",setupProgress:"د کار چمتووالی",loading:"بارېږي…",
  tryAgain:"بیا هڅه",failed:"غوښتنه ناکامه شوه",success:"بدلونونه خوندي شول",
  forbidden:"تاسې لیدلی شئ، خو یوازې مالک او مدیر بدلون راوستلای شي.",
  stale:"بل چا معلومات بدل کړي؛ تازه یې کړئ.",permission:"سم کلینیک ته ننوځئ.",
  empty:"لا معلومات نشته",searchEmpty:"له دې فلټر سره څه نشته",
  clearFilters:"فلټر پاک کړئ",statusLive:"فعال",statusInactive:"غیرفعال",
  statusDraft:"مسوده",timeError:"پیل باید له پای مخکې وي او دمې باید سره ونه نښلي.",
  allCategories:"ټولې کټګورۍ",allStatuses:"ټول حالتونه",custom:"خپل",
  clickToEdit:"د سمون لپاره کرښه غوره کړئ",linked:"له شیفټ سره تړلی",
  selected:"ټاکل شوی",dateRange:"نېټې",saving:"خوندي کېږي…",
  previewFirst:"لومړی خدمت او ډاکټر وټاکئ.",effective:"عملي",
  errors:"برخې سمې کړئ.",readOnly:"یوازې لیدل",
  clinicStatus:"کلینیک",trialInfo:"دا تنظیمات کلینیک نه خپروي او ډاکټر نه تاییدوي.",
  readonlyAccess:"ستاسې لاسرسی یوازې د لیدلو دی.",summary:"د چارو لنډیز",
  startSetup:"چارې تنظیم کړئ",reviewSetup:"ترتیب وګورئ",
  servicesTab:"د خدمتونو لړلیک",versionsTab:"د نسخو تاریخچه",
  resourcesTab:"سرچینې",applyFilter:"پلي کړئ",done:"بشپړ",disable:"بند کړئ",
  enable:"فعال کړئ",noProvidersHint:"له کارکوونکو څخه ډاکټر دعوت کړئ.",
  breakStart:"د دمې پیل",breakEnd:"د دمې پای",breaksCount:"دمې",
  configured:"تنظیم شوی",unsaved:"نه دی خوندي",required:"اړین",
  deleteConfirm:"دا استثنا لرې شي؟",codeTaken:"دا کوډ یا د خدمت نوم مخکې شته.",
  slotCost:"اټکلي بیه",today:"نن",tomorrow:"سبا",unknown:"شیفټ نشته",
  hoursWarning:"د ساعتونو بدلون وړاندیزي وختونه بدلوي خو تایید شوې رزرو نه لغوه کوي.",
  manualOnly:"یوازې د کلینیک تنظیمات؛ وخت اخیستل په شپږم پړاو کې فعالېږي.",
  status_ready:"چمتو",status_clinic_closed:"کلینیک بند",
  status_provider_unavailable:"ډاکټر نشته",status_chair_unavailable:"څوکۍ نشته",
  status_holiday_closed:"رخصتي",noPublic:"عامه لړلیک لا نه دی خپور",
  notConfigured:"نه دی ټاکل شوی",more:"نور",lastUpdated:"وروستی بدلون",
  staffLink:"کارکوونکي",openServices:"خدمتونه",openResources:"سرچینې",
  openHours:"وختونه",stepDone:"بشپړ",stepPending:"پاتې",
  createFirst:"لومړی خدمت جوړ کړئ"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang=(locale==="en"||locale==="ps-AF"||locale==="fa-AF")?locale:"fa-AF";
 const t=(key:string)=>dict[lang][key]||dict.en[key]||key;
 const date=(value:unknown)=>{
  if(!value)return "—";
  try{return new Intl.DateTimeFormat(lang,{calendar:calendar==="solar_hijri"?"persian":"gregory",
   timeZone:"Asia/Kabul",year:"numeric",month:"short",day:"numeric"}).format(new Date(String(value)));}
  catch{return String(value);}
 };
 return {t,date,lang};
}
const OpsApi=async(path:string,method="GET",body?:unknown):Promise<any>=>{
 const result=await fetch(API+"/v1/operations"+path,{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw new Error(data.code||"NETWORK_ERROR");
 return data;
};
function useResource(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [tick,setTick]=useState(0);
 const reload=()=>{setTick(n=>n+1);setError("");setData(null);};
 useEffect(()=>{
  if(!path)return;
  let valid=true;setData(null);setError("");
  OpsApi(path).then(d=>{if(valid)setData(d);}).catch(e=>{if(valid)setError(e.message);});
  return()=>{valid=false;};
 },[path,tick]);
 return {data,error,reload};
}
const cPath=(cid:string)=>"/clinics/"+encodeURIComponent(cid);
const href=(cid:string,view:Page,tab?:string)=>"/clinic/"+
 (view==="hours"?"settings/hours":view)+"?clinic="+encodeURIComponent(cid)+
 (tab?"&tab="+encodeURIComponent(tab):"");
const canManage=(space:Space)=>space.role==="owner"||space.role==="manager";
const minuteTime=(m:number)=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const timeMinute=(raw:string)=>{
 const parts=raw.split(":").map(Number);return parts[0]*60+parts[1];
};
const activeLabel=(t:(s:string)=>string,active:boolean)=>active?t("active"):t("inactive");
function ErrorBox({error,retry}:{error:string,retry:()=>void}){
 const {t}=useWords();return <section className="card panel phase04-empty" role="alert">
  <h2>{t("failed")}</h2><p>{error==="STALE_SERVICE_VERSION"||error==="STALE_RESOURCE_REVISION"||error==="STALE_SCHEDULE_VERSION"?
   t("stale"):error}</p>
  <button className="btn btn-secondary" onClick={retry}>{t("tryAgain")}</button></section>;
}
function Busy(){const {t}=useWords();return <div className="card panel phase04-loading" aria-live="polite">
 <span className="phase05-spinner" aria-hidden="true"/> {t("loading")}</div>;}
function Alert({kind="info",children}:{kind?:"info"|"success"|"error"|"warning",children:ReactNode}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Pill({active,children}:{active:boolean,children:ReactNode}){
 return <span className={"phase04-pill "+(active?"phase04-pill-on":"phase04-pill-off")}>
  <span className="phase04-dot"/> {children}</span>;
}
function FormField({label,value,onChange,required=false,type="text",min,max,step,placeholder,disabled=false}:{
 label:string;value:string|number;onChange:(s:string)=>void;required?:boolean;type?:string;
 min?:number;max?:number;step?:number;placeholder?:string;disabled?:boolean}){
 return <label className="phase04-field"><span>{label}{required?" *":""}</span>
  <input type={type} value={value} onChange={e=>onChange(e.target.value)}
   min={min} max={max} step={step} required={required} placeholder={placeholder} disabled={disabled}/></label>;
}
function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(s:string)=>void,
 options:{value:string,label:string}[];disabled?:boolean}){
 return <label className="phase04-field"><span>{label}</span>
  <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
   {options.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}
  </select></label>;
}
function Switch({checked,onChange,label,disabled=false}:{checked:boolean;onChange:(v:boolean)=>void;label:string;disabled?:boolean}){
 return <label className="phase04-switch"><input type="checkbox" checked={checked}
  onChange={e=>onChange(e.target.checked)} disabled={disabled}/><span>{label}</span></label>;
}
function Header({view,space,refresh}:{view:Page;space:Space;refresh?:()=>void}){
 const {t}=useWords();
 return <header className="phase04-header">
  <div><span className="phase04-eyebrow">{t("operations")} <span aria-hidden="true">/</span> {space.clinicName}</span>
   <h1>{t(view)}</h1><p>{t(view+"Intro")}</p></div>
  <div className="phase04-header-actions">
   <span className="phase04-timezone">◷ {t("timezone")} · Asia/Kabul</span>
   {refresh&&<button className="btn btn-secondary" onClick={refresh}>{t("refresh")} ↻</button>}
  </div>
 </header>;
}
function SectionNav({view,space}:{view:Page;space:Space}){
 const {t}=useWords();
 return <nav className="phase04-section-nav" aria-label={t("operations")}>
  {(["services","resources","hours"] as Page[]).map((key,i)=><a key={key}
   href={href(space.clinicId,key)} aria-current={view===key?"page":undefined}>
   <span aria-hidden="true">{["▤","▦","◷"][i]}</span>{t(key)}</a>)}
 </nav>;
}
export function OperationsPortal({view}:{view:Page}){
 const {t}=useWords();
 const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 const {data:summary,reload:reloadSummary}=useResource(ctx&&requested!==undefined?
  cPath(requested||ctx.clinics[0]?.clinicId||"")+"/summary":null);
 useEffect(()=>{
  setRequested(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
  .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.code||"AUTH_REQUIRED");setCtx(d);})
  .catch(e=>setError(e.message));
 },[]);
 if(error==="AUTH_REQUIRED")return <div className="page-narrow card panel">
  <Alert kind="warning">{t("permission")}</Alert>
  <a className="btn btn-primary" href="/clinic/login">{t("permission")}</a></div>;
 if(error)return <ErrorBox error={error} retry={()=>location.reload()}/>;
 if(!ctx||requested===undefined)return <Busy/>;
 const space=requested?ctx.clinics.find(c=>c.clinicId===requested):ctx.clinics[0];
 if(!space)return <div className="page-narrow card panel">
  <Alert kind="warning">{t("permission")}</Alert><a href="/clinic" className="btn btn-primary">{t("dashboard")}</a></div>;
 if(!["owner","manager","dentist","receptionist"].includes(space.role))
  return <ErrorBox error="OPERATIONS_ACCESS_DENIED" retry={()=>location.assign("/clinic")}/>;
 return <Shell ctx={ctx} space={space} active={view}>
  <div className="phase04-workspace">
   <Header view={view} space={space} refresh={reloadSummary}/>
   <SectionNav view={view} space={space}/>
   <div className="phase04-summary">
    {(["services","chairs","openDays","scheduledDentists"] as const).map((key,i)=>
     <article className="phase04-kpi" key={key}><div className="phase04-kpi-head">
      <span className="phase04-kpi-icon" aria-hidden="true">{["▤","▦","◷","◎"][i]}</span>
      <span>{t(key==="services"?"activeServices":key==="chairs"?"capacity":key==="openDays"?"openDays":"scheduledDentists")}</span></div>
      <strong>{summary?.metrics?.[key]??"—"}</strong></article>)}
   </div>
   {!canManage(space)&&<Alert kind="warning">{t("forbidden")}</Alert>}
   {view==="services"?<ServicesPanel space={space} onChange={reloadSummary}/>:
    view==="resources"?<ResourcesPanel space={space} onChange={reloadSummary}/>:
    <HoursPanel space={space} onChange={reloadSummary}/>}
   <div className="phase04-footer-note"><span>◈</span>{t("trialInfo")} {t("manualOnly")}</div>
  </div>
 </Shell>;
}


const emptyService={name:"",category:"Consultation",description:"",
 durationMinutes:30,preparationMinutes:0,basePriceAfn:0,
 requiresChair:true,publicBooking:false,active:true};
function ServiceEditor({space,service,close,done}:{space:Space;service:Service|null;
 close:()=>void;done:()=>void}){
 const {t}=useWords();
 const [form,setForm]=useState({...emptyService,...(service||{})});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const put=(key:string,value:unknown)=>setForm(o=>({...o,[key]:value}));
 async function submit(event:FormEvent){
  event.preventDefault();setError("");setBusy(true);
  try{
   const cid=cPath(space.clinicId);
   const payload={...form,name:form.name.trim(),category:form.category.trim(),
    description:form.description||null};
   if(service)await OpsApi(cid+"/services/"+service.id,"PATCH",{...payload,version:service.version});
   else await OpsApi(cid+"/services","POST",payload);
   done();close();
  }catch(e:any){setError(e.message||"NETWORK_ERROR");}
  finally{setBusy(false);}
 }
 return <div className="phase04-drawer-backdrop" onMouseDown={e=>{
   if(e.target===e.currentTarget)close();}}>
  <aside role="dialog" aria-modal="true" aria-labelledby="phase04-service-editor"
   className="phase04-drawer">
   <div className="phase04-drawer-head"><div>
    <span className="phase04-eyebrow">{t("servicesTab")} / {t("settings")}</span>
    <h2 id="phase04-service-editor">{t(service?"editService":"addService")}</h2></div>
    <button type="button" className="phase04-icon-button" onClick={close} aria-label={t("close")}>×</button>
   </div>
   <form className="phase04-editor-form" onSubmit={submit}>
    {service&&<div className="phase04-version-banner">
     <span>{t("current")} · {t("version")} {service.version}</span>
     <Pill active={service.active}>{activeLabel(t,service.active)}</Pill></div>}
    <div className="phase04-form-grid">
     <FormField label={t("serviceName")} value={form.name} required
      onChange={v=>put("name",v)} max={100}/>
     <FormField label={t("category")} value={form.category} required
      onChange={v=>put("category",v)}/>
    </div>
    <label className="phase04-field"><span>{t("description")}</span>
     <textarea rows={3} maxLength={700} value={form.description||""}
      onChange={e=>put("description",e.target.value)}/></label>
    <div className="phase04-form-grid">
     <FormField label={t("duration")} type="number" min={5} max={240} step={5}
      required value={form.durationMinutes} onChange={v=>put("durationMinutes",Number(v))}/>
     <FormField label={t("buffer")} type="number" min={0} max={120} step={5}
      required value={form.preparationMinutes} onChange={v=>put("preparationMinutes",Number(v))}/>
     <FormField label={t("price")} type="number" min={0} max={10000000} step={1}
      required value={form.basePriceAfn} onChange={v=>put("basePriceAfn",Number(v))}/>
    </div>
    <p className="phase04-help">{t("durationHelp")} {t("priceHelp")}</p>
    <div className="phase04-switch-box">
     <Switch label={t("requiresChair")} checked={form.requiresChair} onChange={v=>put("requiresChair",v)}/>
     <Switch label={t("publicBooking")} checked={form.publicBooking} onChange={v=>put("publicBooking",v)}/>
     <Switch label={t("active")} checked={form.active} onChange={v=>put("active",v)}/>
    </div>
    <Alert>{t("neverRetroactive")} {t("publicHelp")}</Alert>
    {error&&<Alert kind="error">{error.includes("VERSION")?t("stale"):
      error==="DUPLICATE_SERVICE_OR_RESOURCE"?t("codeTaken"):error}</Alert>}
    <div className="phase04-drawer-footer">
     <button type="button" className="btn btn-secondary" onClick={close}>{t("cancel")}</button>
     <button className="btn btn-primary" disabled={busy}>{busy?t("saving"):t(service?"save":"create")}</button>
    </div>
   </form>
  </aside>
 </div>;
}
function ServicesPanel({space,onChange}:{space:Space;onChange:()=>void}){
 const {t,date}=useWords();
 const base=cPath(space.clinicId);
 const {data,error,reload}=useResource(base+"/services");
 const [search,setSearch]=useState(""),[status,setStatus]=useState("all");
 const [category,setCategory]=useState("all");
 const [editing,setEditing]=useState<Service|null|undefined>(undefined);
 const [showHistory,setShowHistory]=useState(false),[selectedHistory,setSelectedHistory]=useState<string>("");
 const {data:versions,error:versionError,reload:reloadVersions}=useResource(showHistory&&selectedHistory?
  base+"/services/"+selectedHistory+"/versions":null);
 const items:Service[]=data?.services||[];
 const categories=Array.from(new Set(items.map(x=>x.category))).sort();
 const visible=items.filter(x=>(status==="all"||x.active===(status==="active"))&&
  (category==="all"||x.category===category)&&
  (x.name+" "+x.category+" "+(x.description||"")).toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
 const active=items.filter(x=>x.active).length;
 const refresh=()=>{reload();reloadVersions();onChange();};
 return <section className="phase04-panel card">
  <div className="phase04-panel-head"><div><span className="phase04-eyebrow">01 · {t("servicesTab")}</span>
   <h2>{t("services")}</h2><p>{t("servicesIntro")}</p></div>
   {canManage(space)&&<button className="btn btn-primary" onClick={()=>setEditing(null)}>+ {t("addService")}</button>}
  </div>
  <div className="phase04-inner-tabs" role="tablist" aria-label={t("services")}>
   <button role="tab" aria-selected={!showHistory} className={!showHistory?"selected":""}
    onClick={()=>setShowHistory(false)}>▤ {t("servicesTab")} <span className="phase04-count">{items.length}</span></button>
   <button role="tab" aria-selected={showHistory} className={showHistory?"selected":""}
    onClick={()=>{setShowHistory(true);setSelectedHistory(x=>x||items[0]?.id||"");}}>
    ◷ {t("versionsTab")}</button>
  </div>
  {showHistory?<div className="phase04-history">
    <div className="phase04-filters">
     <Select label={t("selectService")} value={selectedHistory}
      onChange={setSelectedHistory} options={[{value:"",label:t("selectService")},
       ...items.map(x=>({value:x.id,label:x.name}))]}/>
     <button className="btn btn-secondary" onClick={reloadVersions}>{t("refresh")}</button>
    </div>
    {!selectedHistory?<div className="phase04-empty"><h3>{t("noneServices")}</h3></div>:
     versionError?<ErrorBox error={versionError} retry={reloadVersions}/>:
     !versions?<Busy/>:<div className="phase04-timeline">
      {versions.versions.map((v:any,index:number)=><article className="phase04-history-card" key={v.version}>
       <span className="phase04-history-marker" aria-hidden="true"/>
       <div><div className="phase04-between"><strong>{t("version")} {v.version} {index===0?" · "+t("current"):""}</strong>
        <span>{date(v.changedAt)}</span></div>
        <p>{v.name} · {v.durationMinutes} {t("minutes")} + {v.preparationMinutes} {t("buffer")}</p>
        <strong><bdi dir="ltr">{v.basePriceAfn.toLocaleString("en-US")}</bdi> AFN</strong>
        <Pill active={v.active}>{activeLabel(t,v.active)}</Pill>
       </div>
      </article>)}
     </div>}
    <Alert>{t("neverRetroactive")}</Alert>
   </div>:<>
    <div className="phase04-toolbar">
     <div className="phase04-search"><span aria-hidden="true">⌕</span><input type="search"
      value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search")}
      aria-label={t("search")}/></div>
     <Select label={t("category")} value={category} onChange={setCategory}
      options={[{value:"all",label:t("allCategories")},...categories.map(x=>({value:x,label:x}))]}/>
     <Select label={t("status")} value={status} onChange={setStatus}
      options={[{value:"all",label:t("allStatuses")},{value:"active",label:t("active")},
       {value:"inactive",label:t("inactive")}]}/>
    </div>
    <div className="phase04-list-meta"><span>{active} {t("activeServices")} · {visible.length} / {items.length}</span>
      <span>{t("clickToEdit")}</span></div>
    {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:
     visible.length===0?<div className="phase04-empty">
       <div className="phase04-empty-icon">▤</div>
       <h3>{items.length?t("searchEmpty"):t("noneServices")}</h3>
       <p>{items.length?t("clearFilters"):t("noneServicesHelp")}</p>
       {items.length?<button className="btn btn-secondary" onClick={()=>{setSearch("");setCategory("all");setStatus("all");}}>
        {t("clearFilters")}</button>:canManage(space)&&<button className="btn btn-primary"
        onClick={()=>setEditing(null)}>+ {t("createFirst")}</button>}
      </div>:
      <div className="phase04-table-scroll"><table className="phase04-table">
       <thead><tr><th>{t("serviceName")}</th><th>{t("duration")}</th>
        <th>{t("price")}</th><th>{t("requiresChair")}</th><th>{t("status")}</th>
        <th>{t("action")}</th></tr></thead>
       <tbody>{visible.map(s=><tr key={s.id}>
        <td><div className="phase04-title-cell"><span className="phase04-service-icon">✚</span>
          <div><strong>{s.name}</strong><small>{s.category} · v{s.version}</small></div></div></td>
        <td><bdi dir="ltr">{s.durationMinutes}</bdi> {t("minutes")}
          {s.preparationMinutes>0&&<small className="phase04-secondary-line">+ {s.preparationMinutes} {t("buffer")}</small>}</td>
        <td className="phase04-price"><bdi dir="ltr">{s.basePriceAfn.toLocaleString("en-US")}</bdi> AFN</td>
        <td>{s.requiresChair?"✓":"—"}</td><td><Pill active={s.active}>{activeLabel(t,s.active)}</Pill></td>
        <td>{canManage(space)?<button className="phase04-inline-action"
         onClick={()=>setEditing(s)}>{t("edit")} ↗</button>:
         <span className="muted">{t("readOnly")}</span>}</td>
       </tr>)}</tbody></table></div>}
    <div className="phase04-panel-footer"><span>{t("neverRetroactive")}</span>
      <a href={href(space.clinicId,"hours","preview")} className="phase04-inline-action">
       {t("preview")} ↗</a></div>
   </>}
  {editing!==undefined&&<ServiceEditor space={space} service={editing}
   close={()=>setEditing(undefined)} done={refresh}/>}
 </section>;
}


const emptyResource={code:"",label:"",kind:"chair" as "chair"|"room",
 equipment:"",active:true};
function ResourceEditor({space,resource,done,close}:{space:Space;resource:Resource|null;
 done:()=>void;close:()=>void}){
 const {t}=useWords();
 const [form,setForm]=useState({...emptyResource,...(resource||{})});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const set=(key:string,value:unknown)=>setForm(x=>({...x,[key]:value}));
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setError("");
  try{
   const path=cPath(space.clinicId)+"/resources";
   const data={...form,code:form.code.trim().toUpperCase(),label:form.label.trim(),
    equipment:form.equipment||null};
   if(resource)await OpsApi(path+"/"+resource.id,"PATCH",{...data,revision:resource.revision});
   else await OpsApi(path,"POST",data);
   done();close();
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="phase04-drawer-backdrop" onMouseDown={e=>{
  if(e.currentTarget===e.target)close();}}>
  <aside role="dialog" aria-modal="true" aria-labelledby="phase04-resource-heading" className="phase04-drawer">
   <div className="phase04-drawer-head"><div>
    <span className="phase04-eyebrow">{t("resources")} / {t("settings")}</span>
    <h2 id="phase04-resource-heading">{t(resource?"editResource":"addResource")}</h2></div>
    <button className="phase04-icon-button" onClick={close} aria-label={t("close")}>×</button></div>
   <form className="phase04-editor-form" onSubmit={submit}>
    {resource&&<div className="phase04-version-banner"><span>{t("version")} {resource.revision}</span>
     <Pill active={resource.active}>{activeLabel(t,resource.active)}</Pill></div>}
    <Select label={t("kind")} value={form.kind} onChange={v=>set("kind",v)}
      options={[{value:"chair",label:t("chair")},{value:"room",label:t("room")}]}/>
    <div className="phase04-form-grid">
     <FormField label={t("resourceName")} value={form.label} onChange={v=>set("label",v)} required/>
     <FormField label={t("code")} value={form.code} onChange={v=>set("code",v)} required/>
    </div>
    <p className="phase04-help">{t("resourceCodeHelp")}</p>
    <label className="phase04-field"><span>{t("equipment")}</span>
      <textarea rows={3} maxLength={200} value={form.equipment||""}
       onChange={e=>set("equipment",e.target.value)}/></label>
    <div className="phase04-switch-box">
     <Switch label={t("active")} checked={form.active} onChange={v=>set("active",v)}/>
    </div>
    <Alert kind="warning">{t("noDeletes")} {t("resourceUsed")}</Alert>
    {error&&<Alert kind="error">{error==="RESOURCE_USED_BY_SCHEDULE"?t("resourceUsed"):
      error==="DUPLICATE_SERVICE_OR_RESOURCE"?t("codeTaken"):
      error==="STALE_RESOURCE_REVISION"?t("stale"):error}</Alert>}
    <div className="phase04-drawer-footer">
     <button className="btn btn-secondary" onClick={close} type="button">{t("cancel")}</button>
     <button className="btn btn-primary" disabled={busy}>{busy?t("saving"):t(resource?"save":"create")}</button>
    </div>
   </form>
  </aside>
 </div>;
}
function ResourcesPanel({space,onChange}:{space:Space;onChange:()=>void}){
 const {t,date}=useWords();
 const base=cPath(space.clinicId);
 const {data,error,reload}=useResource(base+"/resources");
 const {data:hours}=useResource(base+"/hours");
 const [editing,setEditing]=useState<Resource|null|undefined>(undefined);
 const [kind,setKind]=useState("all"),[status,setStatus]=useState("active");
 const items:Resource[]=data?.resources||[];
 const visible=items.filter(x=>(kind==="all"||x.kind===kind)&&
  (status==="all"||x.active===(status==="active")));
 const active=items.filter(x=>x.active).length;
 function update(){reload();onChange();}
 return <section className="phase04-panel card">
  <div className="phase04-panel-head"><div><span className="phase04-eyebrow">02 · {t("resourcesTab")}</span>
   <h2>{t("resources")}</h2><p>{t("resourcesIntro")}</p></div>
   {canManage(space)&&<button className="btn btn-primary" onClick={()=>setEditing(null)}>
    + {t("addResource")}</button>}
  </div>
  <div className="phase04-inner-tabs">
   <a className="selected" href={href(space.clinicId,"resources")}>
    ▦ {t("resourcesTab")} <span className="phase04-count">{items.length}</span></a>
   <a href={href(space.clinicId,"hours","chairs")}>◷ {t("scheduleResource")} ↗</a>
  </div>
  <div className="phase04-toolbar phase04-resource-toolbar">
   <Select label={t("kind")} value={kind} onChange={setKind}
    options={[{value:"all",label:t("all")},{value:"chair",label:t("chair")},
     {value:"room",label:t("room")}]}/>
   <Select label={t("status")} value={status} onChange={setStatus}
    options={[{value:"all",label:t("allStatuses")},{value:"active",label:t("active")},
     {value:"inactive",label:t("inactive")}]}/>
  </div>
  <div className="phase04-list-meta"><span>{active} / {items.length} {t("active")}</span>
   <span>{t("noDeletes")}</span></div>
  {error?<ErrorBox error={error} retry={reload}/>:!data?<Busy/>:
   !visible.length?<div className="phase04-empty">
    <div className="phase04-empty-icon">▦</div>
    <h3>{items.length?t("searchEmpty"):t("noneResources")}</h3>
    <p>{items.length?t("clearFilters"):t("noneResourcesHelp")}</p>
    {items.length?<button className="btn btn-secondary" onClick={()=>{setKind("all");setStatus("all");}}>
     {t("clearFilters")}</button>:canManage(space)&&
     <button className="btn btn-primary" onClick={()=>setEditing(null)}>+ {t("addResource")}</button>}
   </div>:<div className="phase04-resource-grid">
    {visible.map(item=>{
     const assigned=(hours?.resources||[]).some((h:any)=>h.resourceId===item.id&&h.isOpen);
     return <article className="phase04-resource-card" key={item.id}>
      <div className="phase04-resource-card-head">
       <div className="phase04-resource-symbol" aria-hidden="true">{item.kind==="chair"?"✛":"▣"}</div>
       <Pill active={item.active}>{activeLabel(t,item.active)}</Pill>
      </div>
      <div className="phase04-resource-card-body">
       <span className="phase04-code"><bdi dir="ltr">{item.code}</bdi></span>
       <h3>{item.label}</h3><p className="muted">{t(item.kind)} · {item.equipment||"—"}</p>
       <div className="phase04-resource-meta">
        <span>{t("lastUpdated")}</span><strong>{date(item.updatedAt)}</strong>
       </div>
       {assigned&&<p className="phase04-assigned">◷ {t("linked")}</p>}
      </div>
      <div className="phase04-resource-card-foot">
       {canManage(space)?<button className="phase04-inline-action" onClick={()=>setEditing(item)}>
         {t("edit")} ↗</button>:<span>{t("readOnly")}</span>}
       <a className="phase04-inline-action" href={href(space.clinicId,"hours","chairs")}>
         {t("scheduleResource")} ↗</a>
      </div>
     </article>;
    })}
   </div>}
  {editing!==undefined&&<ResourceEditor space={space} resource={editing}
   close={()=>setEditing(undefined)} done={update}/>}
 </section>;
}


const weekdays=["daySat","daySun","dayMon","dayTue","dayWed","dayThu","dayFri"] as const;
function suggestedWeek(source:Shift[],kind:"clinic"|"provider"|"resource"):Shift[]{
 return weekdays.map((_,weekday)=>{
  const saved=source.find(s=>s.weekday===weekday);
  return saved?{...saved,breaks:saved.breaks||[]}:
   {weekday,isOpen:kind==="clinic"?weekday!==6:kind==="provider"?weekday!==6:false,
     startMinute:540,endMinute:1020,breaks:[],revision:0};
 });
}
function WeekEditor({space,kind,target,existing,updated}:{space:Space;kind:"clinic"|"provider"|"resource";
 target?:string;existing:Shift[];updated:()=>void}){
 const {t}=useWords();
 const [days,setDays]=useState<Shift[]>(()=>suggestedWeek(existing,kind));
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(""),[success,setSuccess]=useState("");
 const [dirty,setDirty]=useState(false);
 useEffect(()=>{setDays(suggestedWeek(existing,kind));setDirty(false);setProblem("");},[existing,kind]);
 const hasSaved=existing.some(d=>d.isOpen||d.revision>0);
 const allowed=canManage(space);
 const amend=(weekday:number,change:Partial<Shift>)=>{
  setDays(state=>state.map(d=>d.weekday===weekday?{...d,...change}:d));
  setDirty(true);setSuccess("");setProblem("");
 };
 const addBreak=(d:Shift)=>{
  const mid=Math.floor((d.startMinute+d.endMinute)/2/5)*5;
  const start=Math.max(d.startMinute,mid-15);
  const end=Math.min(d.endMinute,start+30);
  amend(d.weekday,{breaks:[...d.breaks,{start,end}]});
 };
 const editBreak=(d:Shift,index:number,field:"start"|"end",value:number)=>{
  amend(d.weekday,{breaks:d.breaks.map((b,i)=>i===index?{...b,[field]:value}:b)});
 };
 async function submit(event:FormEvent){
  event.preventDefault();setProblem("");setSuccess("");
  for(const d of days){
   if(d.startMinute>=d.endMinute || d.endMinute>1440){
    setProblem(t("timeError"));return;
   }
   const sorted=[...d.breaks].sort((a,b)=>a.start-b.start);
   for(let i=0;i<sorted.length;i++){
    const b=sorted[i];
    if(b.start>=b.end||b.start<d.startMinute||b.end>d.endMinute||
       i>0&&sorted[i-1].end>b.start){
      setProblem(t("timeError"));return;
    }
   }
  }
  setBusy(true);
  try{
   const path=cPath(space.clinicId)+"/hours/"+(kind==="clinic"?"clinic":
      kind==="provider"?"providers/"+encodeURIComponent(target||""):
        "resources/"+encodeURIComponent(target||""));
   await OpsApi(path,"PUT",{week:days.map(d=>({...d,breaks:d.isOpen?d.breaks:[]}))});
   setSuccess(t("success"));setDirty(false);updated();
  }catch(e:any){setProblem(e.message==="STALE_SCHEDULE_VERSION"?t("stale"):e.message);}
  finally{setBusy(false);}
 }
 const helper=kind==="provider"?"providerShiftHelp":kind==="resource"?"resourceShiftHelp":"weekHint";
 return <form onSubmit={submit} className="phase04-week-editor">
  <div className="phase04-schedule-description">
   <div><h3>{t(kind==="clinic"?"weekly":kind==="provider"?"providers":"chairs")}</h3>
    <p>{t(helper)}</p></div>
   <Pill active={hasSaved}>{t(hasSaved?"configured":"unsaved")}</Pill>
  </div>
  {!hasSaved&&<Alert kind="warning">{t("unsavedWeek")}</Alert>}
  <div className="phase04-days">
   {days.map(d=><article className={"phase04-day-row "+(!d.isOpen?"phase04-day-closed":"")} key={d.weekday}>
    <div className="phase04-day-label">
     <strong>{t(weekdays[d.weekday])}</strong>
     <Switch checked={d.isOpen} disabled={!allowed}
      onChange={v=>amend(d.weekday,{isOpen:v})} label={t(d.isOpen?"open":"closed")}/>
    </div>
    <div className="phase04-time-range">
     <FormField label={t("from")} type="time" value={minuteTime(d.startMinute)}
      disabled={!d.isOpen||!allowed} onChange={v=>amend(d.weekday,{startMinute:timeMinute(v)})}/>
     <span className="phase04-time-separator" aria-hidden="true">—</span>
     <FormField label={t("to")} type="time" value={minuteTime(d.endMinute)}
      disabled={!d.isOpen||!allowed} onChange={v=>amend(d.weekday,{endMinute:timeMinute(v)})}/>
    </div>
    <div className="phase04-breaks">
     {d.isOpen&&<div className="phase04-breaks-list">
      {d.breaks.map((b,index)=><div className="phase04-break-chip" key={index}>
       <span aria-hidden="true">◷</span>
       <label><span className="visually-hidden">{t("breakStart")}</span>
         <input type="time" value={minuteTime(b.start)} disabled={!allowed}
          aria-label={t("breakStart")} onChange={e=>editBreak(d,index,"start",timeMinute(e.target.value))}/></label>
       <span>–</span>
       <label><span className="visually-hidden">{t("breakEnd")}</span>
         <input type="time" value={minuteTime(b.end)} disabled={!allowed}
          aria-label={t("breakEnd")} onChange={e=>editBreak(d,index,"end",timeMinute(e.target.value))}/></label>
       {allowed&&<button type="button" className="phase04-mini-close" onClick={()=>amend(d.weekday,{
        breaks:d.breaks.filter((_,i)=>i!==index)})} aria-label={t("remove")}>×</button>}
      </div>)}
     </div>}
     {allowed&&d.isOpen&&d.breaks.length<5&&
      <button type="button" className="phase04-add-break" onClick={()=>addBreak(d)}>+ {t("addBreak")}</button>}
    </div>
   </article>)}
  </div>
  {problem&&<Alert kind="error">{problem}</Alert>}
  {success&&<Alert kind="success">{success}</Alert>}
  <div className="phase04-schedule-footer">
   <p className="muted">{t("hoursWarning")}</p>
   {allowed&&<button className="btn btn-primary" disabled={busy||!dirty}>
    {busy?t("saving"):t("saveWeek")}</button>}
  </div>
 </form>;
}
function HoursPanel({space,onChange}:{space:Space;onChange:()=>void}){
 const {t}=useWords();
 const [tab,setTab]=useState("weekly");
 const [provider,setProvider]=useState<string>("");
 const [resource,setResource]=useState<string>("");
 useEffect(()=>{
  const requested=new URLSearchParams(location.search).get("tab");
  if(["weekly","providers","chairs","exceptions","preview"].includes(requested||""))
   setTab(requested!);
 },[]);
 const base=cPath(space.clinicId);
 const {data,error,reload}=useResource(base+"/hours");
 const {data:services}=useResource(base+"/services");
 const {data:resources}=useResource(base+"/resources");
 const hours:HoursData|undefined=data;
 const doctors=hours?.clinicians||[];
 const activeResources:Resource[]=(resources?.resources||[]).filter((r:Resource)=>r.active&&r.kind==="chair");
 useEffect(()=>{if(doctors.length&&!doctors.some(p=>p.membershipId===provider))setProvider(doctors[0].membershipId);},[data]);
 useEffect(()=>{if(activeResources.length&&!activeResources.some(r=>r.id===resource))
  setResource(activeResources[0].id);},[resources]);
 const saved=()=>{reload();onChange();};
 const nav=[
  ["weekly","▤","weekly"],["providers","◎","providers"],["chairs","▦","chairs"],
  ["exceptions","▧","exceptions"],["preview","◷","preview"]
 ];
 return <section className="phase04-panel card">
  <div className="phase04-panel-head"><div><span className="phase04-eyebrow">03 · {t("hours")}</span>
   <h2>{t("hours")}</h2><p>{t("hoursIntro")}</p></div>
   <span className="phase04-timezone">◷ {t("timezone")}</span>
  </div>
  <nav className="phase04-inner-tabs phase04-scroll-tabs" aria-label={t("hours")}>
   {nav.map(([key,icon,label])=><a key={key}
     href={href(space.clinicId,"hours",key)} aria-current={tab===key?"page":undefined}
     className={tab===key?"selected":""}>{icon} {t(label)}</a>)}
  </nav>
  {error?<ErrorBox error={error} retry={reload}/>:!hours?<Busy/>:tab==="weekly"?
   <WeekEditor key={"clinic-"+hours.hours.map(x=>x.revision).join(".")}
    kind="clinic" space={space} existing={hours.hours} updated={saved}/>:
  tab==="providers"?<div className="phase04-schedule-pane">
   {!doctors.length?<div className="phase04-empty"><div className="phase04-empty-icon">◎</div>
    <h3>{t("noProviders")}</h3><p>{t("noProvidersHint")}</p>
    <a href={"/clinic/staff?clinic="+space.clinicId} className="btn btn-primary">{t("staffLink")} ↗</a></div>:<>
     <div className="phase04-selector-row">
      <Select label={t("chooseProvider")} value={provider} onChange={setProvider}
       options={doctors.map(d=>({value:d.membershipId,label:d.name+" · "+d.role}))}/>
      <span className="phase04-timezone">{t("weekHint")}</span>
     </div>
     {provider&&<WeekEditor key={"provider-"+provider+"-"+hours.providers.map(h=>h.revision).join(".")}
      kind="provider" target={provider} space={space}
      existing={hours.providers.filter(x=>x.membershipId===provider)} updated={saved}/>}
    </>}
  </div>:tab==="chairs"?<div className="phase04-schedule-pane">
   {!activeResources.length?<div className="phase04-empty">
    <div className="phase04-empty-icon">▦</div><h3>{t("noChairs")}</h3>
    <a href={href(space.clinicId,"resources")} className="btn btn-primary">
     {t("addResource")} ↗</a></div>:<>
    <div className="phase04-selector-row">
     <Select label={t("chooseChair")} value={resource} onChange={setResource}
      options={activeResources.map(r=>({value:r.id,label:r.label+" · "+r.code}))}/>
     <span className="muted">{t("resourceShiftHelp")}</span>
    </div>
    {resource&&<div className="phase04-schedule-pane">
     <WeekEditor key={"resource-"+resource+"-"+hours.resources.map(h=>h.revision).join(".")}
      kind="resource" target={resource} space={space}
      existing={hours.resources.filter(x=>x.resourceId===resource)} updated={saved}/>
     {canManage(space)&&hours.resources.some(x=>x.resourceId===resource)&&
      <button className="btn btn-secondary" onClick={async()=>{
       if(!confirm(t("clearHelp")))return;
       try{await OpsApi(base+"/hours/resources/"+resource,"DELETE",{reason:"Clear resource schedule"});
        saved();}catch(e:any){alert(e.message);}
      }}>{t("clearResourceHours")}</button>}
    </div>}
    </>}
  </div>:tab==="exceptions"?<ExceptionPanel space={space} items={hours.exceptions} updated={saved}/>:
  <PreviewPanel space={space} data={hours} services={services?.services||[]}
    chairs={activeResources}/>}
 </section>;
}
