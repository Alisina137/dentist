"use client";
import React,{useEffect,useMemo,useState,useCallback,type FormEvent,type ReactNode} from "react";
import { InlineAlert,usePreferences } from "./index";
import { Shell } from "./phase03";

type Lang="fa-AF"|"ps-AF"|"en";
type Role="owner"|"manager"|"receptionist"|"dentist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;
 role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Page="calendar"|"queue"|"new"|"detail";
type AppointmentStatus="confirmed"|"arrived"|"in_treatment"|"completed"|"no_show"|"cancelled";
type Patient={id:string;patientNumber:string;preferredName:string;familyName:string|null;phone:string|null};
type Resource={id:string;code:string;label:string};
type Provider={membershipId:string;name:string;role:string};
type Service={id:string;name:string;category:string;durationMinutes:number;preparationMinutes:number;
 basePriceAfn:number;requiresChair:boolean;version:number};
type Appointment={
 id:string;clinicId:string;patientId:string;serviceId:string;providerMembershipId:string;
 resourceId:string|null;patient:Patient|null;providerName:string;resourceName:string|null;
 startAt:string;endAt:string;status:AppointmentStatus;source:"staff"|"phone"|"walk_in";
 serviceVersion:number;serviceName:string;serviceCategory:string;servicePriceAfn:number;
 serviceDurationMinutes:number;preparationMinutes:number;administrativeNote:string|null;
 revision:number;arrivedAt:string|null;startedAt:string|null;completedAt:string|null;
 cancelledAt:string|null;noShowAt:string|null;createdAt:string;updatedAt:string
};
type Event={id:string;action:string;beforeStatus:string|null;afterStatus:string;reason:string|null;
 actorId:string;actorName?:string;createdAt:string;beforeStartAt:string|null;
 afterStartAt:string;afterEndAt:string};
type Slot={start:string;end:string;resourceId:string|null;startAt:string;endAt:string;
 durationMinutes:number;preparationMinutes:number};
type Catalog={services:Service[];resources:Resource[];providers:Provider[];timezone:string};
type ConflictOption={date:string;start:string;resourceId:string|null};
type ViewMode="day"|"week"|"month";
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const words:Record<Lang,Record<string,string>>={
 en:{
  appointments:"Appointments",calendar:"Calendar",queue:"Patient queue",newAppointment:"New appointment",
  appointmentDetail:"Appointment details",welcome:"Clinic scheduling",intro:"Coordinate visits, staff and chairs on one reliable schedule.",
  queueIntro:"Today’s arrivals, treatment progress and completed appointments in one place.",
  newIntro:"Choose a real clinic patient, procedure, clinician and available time.",
  detailIntro:"Review details, appointment history and permitted actions.",
  today:"Today",previous:"Previous",next:"Next",day:"Day",week:"Week",month:"Month",
  search:"Search patients",searchHint:"Name, phone number or patient ID",searchPatient:"Find patient",
  addPatient:"Add patient",inlinePatient:"Register a new clinic patient",
  patientName:"Patient name",familyName:"Family name",phone:"Phone (optional)",
  privacyConfirm:"I confirm that the clinic has provided the applicable patient privacy notice.",
  createPatient:"Save patient",nameHelp:"Enter an existing clinic patient or register a new patient.",
  newPatientInfo:"Only demographic information is collected here. Clinical history belongs to authorized care.",
  patientDuplicate:"Possible duplicate patient found. Select the existing record or open the patient directory.",
  chooseExisting:"Use existing patient",reviewPatient:"Review patient record",
  patient:"Patient",service:"Service",dentist:"Dentist",chair:"Dental chair",
  anyChair:"All compatible chairs",choosePatient:"Select a patient",chooseService:"Select service",
  chooseDentist:"Select dentist",chooseChair:"Choose chair",date:"Appointment date",time:"Appointment time",
  dateGregorian:"Gregorian date (YYYY-MM-DD)",slots:"Candidate times",
  noSlots:"No available times",loadingSlots:"Checking live availability…",selectSlot:"Choose a time to continue",
  otherDates:"Choose another date or a different clinician/chair and retry.",
  note:"Administrative note (optional)",noteHelp:"No diagnosis or clinical history in this field.",
  source:"Booking source",staff:"Staff",phoneBooking:"Phone",walkIn:"Walk-in",
  stepPatient:"Patient",stepService:"Procedure",stepTime:"Time & chair",stepConfirm:"Confirm",
  review:"Review",book:"Confirm appointment",back:"Back",continue:"Continue",cancel:"Cancel",
  save:"Save",saving:"Saving…",loading:"Loading…",refresh:"Refresh",retry:"Retry",
  success:"Appointment confirmed",error:"Request failed",forbidden:"Your clinic role cannot perform this action.",
  unavailable:"This appointment time is no longer available.",alternatives:"Other available choices",
  chooseAlternative:"Choose this alternative",conflictHelp:"This slot was taken or unavailable. Select a new time.",
  readOnly:"Read-only",views:"Views",filterDentist:"Filter dentist",filterChair:"Filter chair",
  filterStatus:"Filter status",allDentists:"All dentists",allChairs:"All chairs",allStatuses:"All statuses",
  total:"Total",confirmed:"Expected",arrived:"Arrived",in_treatment:"In treatment",
  completed:"Completed",no_show:"No-show",cancelled:"Cancelled",
  expected:"Expected",noAppointments:"No appointments on these dates",
  noAppointmentsHint:"Adjust your filters or create a booking for an active clinic patient.",
  clearFilters:"Clear filters",viewDetails:"Details",openDetail:"Open details",
  patients:"Patients",services:"Services & Pricing",hours:"Hours & Holidays",
  resources:"Chairs & Rooms",staffLink:"Team & Dentists",manage:"Clinic operations",
  empty:"No results",count:"Appointments",status:"Status",started:"Start",finished:"End",
  duration:"Duration",minutes:"minutes",price:"Estimate",afn:"AFN",statusLegend:"Status legend",
  schedule:"Schedule",provider:"Provider",providerHelp:"Assigned clinician",resource:"Chair / room",
  checkIn:"Check in",startCare:"Start treatment",finishCare:"Complete visit",
  markNoShow:"Mark no-show",cancelBooking:"Cancel appointment",reschedule:"Reschedule",
  rescheduleIntro:"Select a new real slot. The old booking stays until the replacement is confirmed.",
  applyReschedule:"Confirm new time",actionReason:"Reason (at least 10 characters)",
  cancelReason:"Cancellation reason",noShowReason:"Reason for no-show",
  rescheduleReason:"Reason for changing time",confirmAction:"Confirm action",
  statusActions:"Available actions",noActions:"No more status actions for this booking.",
  timeline:"Activity history",noHistory:"No changes recorded yet",eventCreated:"Created",
  eventRescheduled:"Rescheduled",eventArrived:"Checked in",eventInTreatment:"Treatment started",
  eventCompleted:"Completed",eventCancelled:"Cancelled",eventNoShow:"Marked no-show",
  byStaff:"Clinic staff",who:"Recorded by",timeZone:"Asia/Kabul",
  adminOnly:"Administrative notes only",createdAt:"Created on",lastUpdated:"Last change",
  record:"Clinic patient ID",contact:"Contact",patientDetails:"Patient profile",sourceStaff:"Staff booking",
  statusPending:"Scheduled",queueExpected:"Expected",queueArrived:"Checked in",
  queueTreatment:"In treatment",queueComplete:"Complete",
  queueEmpty:"No patients in this queue stage",queueEmptyHint:"Open the calendar to find more bookings.",
  queueToday:"Today’s queue",queuePast:"Queue date",queueDateHint:"Queue is grouped using local Afghanistan dates.",
  totalArrivals:"Checked-in patients",waiting:"Waiting",completedToday:"Completed",
  timeBooked:"Scheduled",arrivalTime:"Checked in at",elapsed:"Elapsed",
  noShowToday:"No-shows",phoneUnverified:"Unverified number",
  noPersonalAccount:"A DandanLink patient account is not required for walk-in or phone bookings.",
  noPublic:"Private clinic appointment only. Patient-facing booking is not enabled yet.",
  deliveryNotice:"External reminders and booking requests are not enabled at this stage.",
  clinicalNext:"Clinical encounters and dental charts are delivered in later phases.",
  financialNext:"The price shown is an estimate; no patient invoice has been created.",
  clinicScope:"Current clinic",loadingAccount:"Checking clinic membership…",
  signin:"Sign in to the clinic",noClinic:"Choose an active clinic membership.",
  invalidDay:"Please select a valid Gregorian date.",startTime:"Start time",endTime:"End time",
  viewCalendar:"Back to calendar",goQueue:"View queue",goNew:"Create booking",
  list:"Agenda",weekTotal:"This week",todayTotal:"Today’s bookings",
  nextBookings:"Upcoming appointments",noUpcoming:"No upcoming appointments",
  clear:"Clear",more:"More",all:"All",tapSlot:"Select",timeAlreadyBooked:"Slot already occupied",
  staffOnly:"Authorized clinic staff only",oneClinic:"Appointments belong to this clinic only.",
  avoidDouble:"Double-clicks and network retries cannot create duplicate appointments.",
  inactivePatient:"Patient is inactive. Select an active patient.",
  stale:"The appointment was updated elsewhere. Refresh to see the current version.",
  statusInvalid:"This status change is not allowed.",onlyToday:"Check-in is available on the booked day.",
  noShowEarly:"Cannot mark no-show before the scheduled start.",
  checkAvailability:"Refresh available times",unavailableDate:"No compatible availability for this date.",
  selectedSlot:"Selected time",step:"Step",estimatedDuration:"Appointment length",
  bookingSuccess:"Appointment confirmed and visible in the calendar and queue.",
  walkinHelp:"Walk-in registrations use the same protected booking and queue records.",
  personalData:"Patient information remains private to the authorized clinic.",
  allSources:"All sources",days:"days",scheduleManagement:"Schedule management",
  detail:"Details",history:"History",actions:"Actions",close:"Close",open:"Open",none:"None",
  resourcesUnavailable:"No compatible chair exists. Configure Chairs & Rooms first.",
  providersUnavailable:"No active dentist configured. Invite a clinician in Team.",
  servicesUnavailable:"No active services. Configure Services & Pricing first.",
  selectProvider:"Choose clinician",prevPeriod:"Previous period",nextPeriod:"Next period",
  moreInDay:"more",showAll:"Show all",noCases:"No clinical encounter available yet.",
  specificDate:"Go to date",firstVisit:"Scheduled clinic visit",
  tabCalendar:"Calendar",tabQueue:"Queue",cancelBookingHelp:"Cancellation requires a reason and releases the held time.",
  limitReached:"Too many records for this view. Narrow your filters.",
  statusFilter:"Status",selectDay:"View day",checkinDone:"Patient checked in",
  treatmentStarted:"Treatment started",completedDone:"Visit completed",noShowDone:"Marked no-show",
  cancellationDone:"Appointment cancelled",rescheduleDone:"Appointment rescheduled",
  guardianNotNeeded:"Appointment selects a clinic record, not a public patient account."
 },
 "fa-AF":{
  appointments:"وقت‌های ملاقات",calendar:"تقویم ملاقات",queue:"صف مریضان",newAppointment:"ثبت وقت جدید",
  appointmentDetail:"جزئیات وقت ملاقات",welcome:"برنامه‌ریزی کلینیک",
  intro:"مریضان، داکتران و چوکی‌ها را در یک تقویم منظم مدیریت کنید.",
  queueIntro:"حضور مریضان، پیشرفت تداوی و تکمیل ملاقات‌ها در یک صفحه.",
  newIntro:"مریض، خدمت، داکتر و وقت واقعاً موجود را انتخاب کنید.",
  detailIntro:"معلومات، تاریخچه و عملیات مجاز وقت ملاقات.",
  today:"امروز",previous:"قبلی",next:"بعدی",day:"روز",week:"هفته",month:"ماه",
  search:"جستجوی مریض",searchHint:"نام، شماره تماس یا شماره مریض",
  searchPatient:"یافتن مریض",addPatient:"افزودن مریض",inlinePatient:"ثبت مریض جدید",
  patientName:"نام مریض",familyName:"تخلص",phone:"شماره تماس (اختیاری)",
  privacyConfirm:"تأیید می‌کنم اطلاعیه حریم خصوصی کلینیک به مریض داده شده است.",
  createPatient:"ذخیره مریض",nameHelp:"مریض موجود را انتخاب کنید یا مریض جدید ثبت کنید.",
  newPatientInfo:"فقط مشخصات مریض ثبت می‌شود؛ معلومات صحی نزد افراد طبی مجاز محفوظ است.",
  patientDuplicate:"مریض مشابه وجود دارد. مریض قبلی را انتخاب یا فهرست را باز کنید.",
  chooseExisting:"انتخاب مریض موجود",reviewPatient:"نمایش پرونده مریض",
  patient:"مریض",service:"خدمت",dentist:"داکتر",chair:"چوکی دندان",
  anyChair:"تمام چوکی‌های سازگار",choosePatient:"انتخاب مریض",chooseService:"انتخاب خدمت",
  chooseDentist:"انتخاب داکتر",chooseChair:"انتخاب چوکی",
  date:"تاریخ ملاقات",time:"ساعت ملاقات",dateGregorian:"تاریخ میلادی (YYYY-MM-DD)",
  slots:"وقت‌های پیشنهادی",noSlots:"وقتی موجود نیست",
  loadingSlots:"بررسی وقت‌های موجود…",selectSlot:"برای ادامه وقت را انتخاب کنید",
  otherDates:"روز، داکتر یا چوکی دیگری را انتخاب کنید.",
  note:"یادداشت اداری (اختیاری)",noteHelp:"در این بخش تشخیص یا معلومات صحی ثبت نکنید.",
  source:"منبع نوبت",staff:"کارمند",phoneBooking:"تلفنی",walkIn:"حضوری",
  stepPatient:"مریض",stepService:"خدمت",stepTime:"وقت و چوکی",stepConfirm:"تأیید",
  review:"بررسی",book:"تأیید ملاقات",back:"بازگشت",continue:"ادامه",cancel:"لغو",
  save:"ذخیره",saving:"در حال ذخیره…",loading:"در حال بارگیری…",refresh:"تازه‌سازی",
  retry:"دوباره تلاش",success:"ملاقات ثبت شد",error:"درخواست ناموفق",
  forbidden:"این عملیات برای نقش شما مجاز نیست.",
  unavailable:"این وقت دیگر موجود نیست.",alternatives:"وقت‌های جایگزین",
  chooseAlternative:"انتخاب این وقت",conflictHelp:"وقت قبلاً گرفته شده یا ناموجود است؛ وقت جدید انتخاب کنید.",
  readOnly:"فقط مشاهده",views:"نماها",filterDentist:"فیلتر داکتر",
  filterChair:"فیلتر چوکی",filterStatus:"فیلتر وضعیت",allDentists:"تمام داکتران",
  allChairs:"تمام چوکی‌ها",allStatuses:"تمام وضعیت‌ها",
  total:"مجموع",confirmed:"در انتظار",arrived:"حاضر",
  in_treatment:"در تداوی",completed:"تکمیل",no_show:"حاضر نشد",cancelled:"لغو شد",
  expected:"در انتظار",noAppointments:"برای این روز وقت ملاقات نیست",
  noAppointmentsHint:"فیلتر را تغییر دهید یا برای مریض فعال وقت ثبت کنید.",
  clearFilters:"پاک‌کردن فیلتر",viewDetails:"جزئیات",openDetail:"مشاهده جزئیات",
  patients:"مریضان",services:"خدمات و قیمت‌ها",hours:"ساعات و رخصتی‌ها",
  resources:"چوکی‌ها و اتاق‌ها",staffLink:"کارمندان و داکتران",manage:"عملیات کلینیک",
  empty:"نتیجه‌ای نیست",count:"ملاقات‌ها",status:"وضعیت",
  started:"شروع",finished:"پایان",duration:"مدت",minutes:"دقیقه",
  price:"قیمت تخمینی",afn:"افغانی",statusLegend:"راهنمای وضعیت",
  schedule:"تقویم",provider:"داکتر",providerHelp:"داکتر موظف",resource:"چوکی",
  checkIn:"ثبت حضور",startCare:"شروع تداوی",finishCare:"تکمیل ملاقات",
  markNoShow:"غیرحاضر",cancelBooking:"لغو ملاقات",reschedule:"تغییر وقت",
  rescheduleIntro:"وقت جدید را انتخاب کنید؛ وقت قبلی تا تأیید نهایی محفوظ می‌ماند.",
  applyReschedule:"تأیید تغییر وقت",actionReason:"دلیل (حداقل ۱۰ حرف)",
  cancelReason:"دلیل لغو",noShowReason:"دلیل غیرحاضری",
  rescheduleReason:"دلیل تغییر وقت",confirmAction:"تأیید عملیات",
  statusActions:"عملیات مجاز",noActions:"عملیات دیگر برای این ملاقات وجود ندارد.",
  timeline:"تاریخچه فعالیت",noHistory:"هنوز تغییری ثبت نشده",
  eventCreated:"ثبت شد",eventRescheduled:"وقت تغییر کرد",eventArrived:"حضور ثبت شد",
  eventInTreatment:"تداوی شروع شد",eventCompleted:"تکمیل شد",
  eventCancelled:"لغو شد",eventNoShow:"غیرحاضر",
  byStaff:"کارمند کلینیک",who:"ثبت‌کننده",timeZone:"Asia/Kabul",
  adminOnly:"فقط یادداشت اداری",createdAt:"تاریخ ثبت",lastUpdated:"آخرین تغییر",
  record:"شماره مریض",contact:"تماس",patientDetails:"پرونده مریض",
  sourceStaff:"ثبت کارمند",statusPending:"تعیین‌شده",
  queueExpected:"در انتظار",queueArrived:"حاضر",
  queueTreatment:"در تداوی",queueComplete:"تکمیل",
  queueEmpty:"در این مرحله مریض نیست",queueEmptyHint:"وقت‌های دیگر را در تقویم ببینید.",
  queueToday:"صف امروز",queuePast:"تاریخ صف",
  queueDateHint:"صف بر اساس تاریخ محلی افغانستان مرتب شده است.",
  totalArrivals:"مریضان حاضر",waiting:"منتظر",completedToday:"تکمیل‌شده",
  timeBooked:"وقت تعیین‌شده",arrivalTime:"زمان حضور",elapsed:"زمان سپری‌شده",
  noShowToday:"غیرحاضری‌ها",phoneUnverified:"شماره تأییدنشده",
  noPersonalAccount:"مریض حضوری یا تلفنی به حساب عمومی DandanLink نیاز ندارد.",
  noPublic:"فقط وقت خصوصی کلینیک؛ رزرو عمومی هنوز فعال نیست.",
  deliveryNotice:"یادآوری خودکار و درخواست رزرو عمومی هنوز فعال نیست.",
  clinicalNext:"معاینات طبی و چارت دندان در مراحل بعدی فعال می‌شود.",
  financialNext:"این قیمت تخمینی است؛ بل مریض ساخته نشده است.",
  clinicScope:"کلینیک فعلی",loadingAccount:"بررسی عضویت کلینیک…",
  signin:"ورود به کلینیک",noClinic:"کلینیک فعال خود را انتخاب کنید.",
  invalidDay:"تاریخ میلادی درست را انتخاب کنید.",startTime:"زمان شروع",endTime:"زمان پایان",
  viewCalendar:"بازگشت به تقویم",goQueue:"نمایش صف",goNew:"ثبت وقت جدید",
  list:"فهرست",weekTotal:"این هفته",todayTotal:"وقت‌های امروز",
  nextBookings:"ملاقات‌های آینده",noUpcoming:"وقت آینده‌ای موجود نیست",
  clear:"پاک کردن",more:"بیشتر",all:"همه",tapSlot:"انتخاب",timeAlreadyBooked:"وقت گرفته‌شده",
  staffOnly:"فقط کارمندان مجاز",oneClinic:"ملاقات‌ها تنها متعلق به همین کلینیک است.",
  avoidDouble:"کلیک تکراری یا قطعی شبکه، وقت تکراری نمی‌سازد.",
  inactivePatient:"مریض غیرفعال است؛ مریض فعال را انتخاب کنید.",
  stale:"اطلاعات وقت تغییر کرده؛ تازه‌سازی کنید.",statusInvalid:"این تغییر وضعیت مجاز نیست.",
  onlyToday:"ثبت حضور فقط در روز ملاقات ممکن است.",noShowEarly:"قبل از شروع وقت غیرحاضری ثبت نمی‌شود.",
  checkAvailability:"تازه‌سازی وقت‌ها",unavailableDate:"برای این روز وقتی موجود نیست.",
  selectedSlot:"وقت انتخاب‌شده",step:"مرحله",estimatedDuration:"مدت ملاقات",
  bookingSuccess:"ملاقات ثبت شد و در تقویم و صف دیده می‌شود.",
  walkinHelp:"وقت‌های حضوری نیز از همان تقویم و صف امن استفاده می‌کنند.",
  personalData:"معلومات مریضان خصوصی باقی می‌ماند.",
  allSources:"تمام منابع",days:"روز",scheduleManagement:"مدیریت وقت‌ها",
  detail:"جزئیات",history:"تاریخچه",actions:"عملیات",close:"بستن",open:"باز",
  none:"هیچ",resourcesUnavailable:"چوکی مناسب وجود ندارد؛ ابتدا چوکی ثبت کنید.",
  providersUnavailable:"داکتر فعال موجود نیست؛ در بخش تیم داکتر دعوت کنید.",
  servicesUnavailable:"خدمت فعال موجود نیست؛ نخست خدمت بسازید.",
  selectProvider:"انتخاب داکتر",prevPeriod:"دوره قبلی",nextPeriod:"دوره بعدی",
  moreInDay:"مورد بیشتر",showAll:"نمایش همه",noCases:"پرونده طبی هنوز فعال نیست.",
  specificDate:"انتخاب تاریخ",firstVisit:"ملاقات کلینیک",
  tabCalendar:"تقویم",tabQueue:"صف",cancelBookingHelp:"لغو نیازمند دلیل است و وقت آزاد می‌شود.",
  limitReached:"تعداد زیاد است؛ فیلتر را محدود کنید.",statusFilter:"وضعیت",
  selectDay:"نمایش روز",checkinDone:"حضور ثبت شد",treatmentStarted:"تداوی شروع شد",
  completedDone:"ملاقات تکمیل شد",noShowDone:"غیرحاضری ثبت شد",
  cancellationDone:"ملاقات لغو شد",rescheduleDone:"وقت تغییر کرد",
  guardianNotNeeded:"ملاقات به پرونده کلینیک مرتبط است، نه حساب عمومی مریض."
 },
 "ps-AF":{
  appointments:"لیدنې او وختونه",calendar:"د لیدنو مهالوېش",queue:"د ناروغانو کتار",
  newAppointment:"نوی وخت ثبت کړئ",appointmentDetail:"د لیدنې جزییات",
  welcome:"د کلینیک مهالویش",intro:"ناروغان، ډاکټران او څوکۍ په یوه منظم مهالوېش کې تنظیم کړئ.",
  queueIntro:"د ناروغانو راتګ، درملنې او بشپړو شوو لیدنو یو ځای مدیریت.",
  newIntro:"ناروغ، خدمت، ډاکټر او شته وخت غوره کړئ.",
  detailIntro:"د لیدنې معلومات، تاریخچه او مجازې کړنې.",
  today:"نن",previous:"مخکېنی",next:"راتلونکی",day:"ورځ",week:"اونۍ",month:"میاشت",
  search:"ناروغ ولټوئ",searchHint:"نوم، شمېره یا د ناروغ پېژند",
  searchPatient:"ناروغ پیدا کړئ",addPatient:"ناروغ اضافه کړئ",
  inlinePatient:"نوی ناروغ ثبت کړئ",patientName:"د ناروغ نوم",
  familyName:"تخلص",phone:"شمېره (اختیاري)",
  privacyConfirm:"تاییدوم چې ناروغ ته د کلینیک د محرمیت خبرتیا ورکړل شوې.",
  createPatient:"ناروغ خوندي کړئ",nameHelp:"موجود ناروغ غوره یا نوی ناروغ ثبت کړئ.",
  newPatientInfo:"یوازې پېژندنیز معلومات ثبتېږي؛ طبي معلومات مجاز کارکوونکو ته پاتې کېږي.",
  patientDuplicate:"ورته ناروغ شته؛ موجود ریکارډ غوره کړئ یا د ناروغانو لړلیک وګورئ.",
  chooseExisting:"موجود ناروغ غوره کړئ",reviewPatient:"د ناروغ ریکارډ وګورئ",
  patient:"ناروغ",service:"خدمت",dentist:"ډاکټر",chair:"د غاښونو څوکۍ",
  anyChair:"ټولې مناسبې څوکۍ",choosePatient:"ناروغ غوره کړئ",chooseService:"خدمت غوره کړئ",
  chooseDentist:"ډاکټر غوره کړئ",chooseChair:"څوکۍ غوره کړئ",
  date:"د لیدنې نېټه",time:"د لیدنې وخت",dateGregorian:"میلادي نېټه (YYYY-MM-DD)",
  slots:"شته وختونه",noSlots:"وخت نشته",loadingSlots:"شته وختونه کتل کېږي…",
  selectSlot:"د دوام لپاره وخت وټاکئ",otherDates:"بله ورځ، ډاکټر یا څوکۍ وټاکئ.",
  note:"اداري یادښت (اختیاري)",noteHelp:"په دې برخه کې تشخیص یا طبي تاریخ مه لیکئ.",
  source:"د ثبت لاره",staff:"کارکوونکی",phoneBooking:"په ټیلیفون",walkIn:"حضوري",
  stepPatient:"ناروغ",stepService:"خدمت",stepTime:"وخت او څوکۍ",stepConfirm:"تایید",
  review:"کتنه",book:"لیدنه تایید کړئ",back:"شاته",continue:"دوام",cancel:"لغوه",
  save:"خوندي",saving:"خوندي کېږي…",loading:"بارېږي…",refresh:"تازه",
  retry:"بیا هڅه",success:"لیدنه ثبت شوه",error:"غوښتنه ناکامه شوه",
  forbidden:"ستاسې دندې ته دا کړنه نه ده اجازه.",unavailable:"دا وخت نور نشته.",
  alternatives:"نور شته وختونه",chooseAlternative:"دا وخت غوره کړئ",
  conflictHelp:"دا وخت نیول شوی یا نشته؛ بل وخت وټاکئ.",readOnly:"یوازې کتل",
  views:"لیدونه",filterDentist:"ډاکټر فلټر",filterChair:"څوکۍ فلټر",
  filterStatus:"حالت فلټر",allDentists:"ټول ډاکټران",allChairs:"ټولې څوکۍ",
  allStatuses:"ټول حالتونه",total:"ټول",confirmed:"په تمه",
  arrived:"راغلی",in_treatment:"تر درملنې لاندې",
  completed:"بشپړ",no_show:"نه دی راغلی",cancelled:"لغوه",
  expected:"په تمه",noAppointments:"په دې ورځو کې لیدنې نشته",
  noAppointmentsHint:"فلټر بدل کړئ یا د فعال ناروغ لپاره وخت وټاکئ.",
  clearFilters:"فلټر پاک کړئ",viewDetails:"جزییات",openDetail:"جزییات وګورئ",
  patients:"ناروغان",services:"خدمتونه او بیې",hours:"وختونه او رخصتۍ",
  resources:"څوکۍ او خونې",staffLink:"کارکوونکي او ډاکټران",manage:"د کلینیک چارې",
  empty:"پایله نشته",count:"لیدنې",status:"حالت",started:"پیل",
  finished:"پای",duration:"وخت",minutes:"دقیقې",price:"اټکلي بیه",
  afn:"افغانۍ",statusLegend:"د حالت پېژند",schedule:"مهالوېش",
  provider:"ډاکټر",providerHelp:"ټاکل شوی ډاکټر",resource:"څوکۍ",
  checkIn:"راتګ ثبت کړئ",startCare:"درملنه پیل کړئ",finishCare:"لیدنه بشپړه کړئ",
  markNoShow:"نه راغلی",cancelBooking:"لیدنه لغوه کړئ",reschedule:"وخت بدل کړئ",
  rescheduleIntro:"نوی شته وخت غوره کړئ؛ زوړ وخت تر تایید پورې پاتې کېږي.",
  applyReschedule:"نوی وخت تایید کړئ",actionReason:"دلیل (لږترلږه ۱۰ توري)",
  cancelReason:"د لغوه کولو دلیل",noShowReason:"د نه راتلو دلیل",
  rescheduleReason:"د وخت بدلولو دلیل",confirmAction:"کړنه تایید کړئ",
  statusActions:"اجازه لرونکې کړنې",noActions:"نورې کړنې نشته.",
  timeline:"د بدلون تاریخچه",noHistory:"لا بدلون نه دی ثبت شوی",
  eventCreated:"ثبت",eventRescheduled:"وخت بدل شو",eventArrived:"راغلی",
  eventInTreatment:"درملنه پیل",eventCompleted:"بشپړ",
  eventCancelled:"لغوه",eventNoShow:"نه راغلی",
  byStaff:"د کلینیک کارکوونکی",who:"ثبتوونکی",timeZone:"Asia/Kabul",
  adminOnly:"یوازې اداري یادښت",createdAt:"د ثبت نېټه",lastUpdated:"وروستی بدلون",
  record:"د ناروغ پېژند",contact:"اړیکه",patientDetails:"د ناروغ ریکارډ",
  sourceStaff:"د کارکوونکي ثبت",statusPending:"ټاکل شوی",
  queueExpected:"تمه",queueArrived:"راغلی",queueTreatment:"درملنه",
  queueComplete:"بشپړ",queueEmpty:"په دې پړاو کې ناروغ نشته",
  queueEmptyHint:"د نورو وختونو لپاره مهالوېش وګورئ.",
  queueToday:"د نن کتار",queuePast:"د کتار نېټه",queueDateHint:"کتار د افغانستان په نېټه تنظیم شوی.",
  totalArrivals:"راغلي ناروغان",waiting:"انتظار",completedToday:"بشپړ",
  timeBooked:"ټاکل شوی وخت",arrivalTime:"د راتګ وخت",elapsed:"تېر وخت",
  noShowToday:"نه راغلي",phoneUnverified:"ناتایید شمېره",
  noPersonalAccount:"د حضوري او ټیلیفوني لیدنو لپاره عام حساب اړین نه دی.",
  noPublic:"دا یوازې د کلینیک لیدنه ده؛ عامه بکینګ لا نه دی فعال.",
  deliveryNotice:"اتومات یادونې او عامه غوښتنې لا نشته.",
  clinicalNext:"طبي لیدنې او د غاښونو چارتونه په راتلونکو پړاوونو کې فعالیږي.",
  financialNext:"دا اټکلي بیه ده؛ بیل نه دی جوړ شوی.",
  clinicScope:"اوسنی کلینیک",loadingAccount:"د کلینیک غړیتوب کتل کېږي…",
  signin:"کلینیک ته ننوځئ",noClinic:"فعال کلینیک غوره کړئ.",
  invalidDay:"سمه میلادي نېټه غوره کړئ.",startTime:"د پیل وخت",endTime:"د پای وخت",
  viewCalendar:"مهالوېش ته بېرته",goQueue:"کتار وګورئ",goNew:"نوی وخت ثبت کړئ",
  list:"لړلیک",weekTotal:"دا اونۍ",todayTotal:"د نن لیدنې",
  nextBookings:"راتلونکې لیدنې",noUpcoming:"راتلونکې لیدنې نشته",
  clear:"پاک",more:"نور",all:"ټول",tapSlot:"غوره کول",
  timeAlreadyBooked:"وخت نیول شوی",staffOnly:"یوازې مجاز کارکوونکي",
  oneClinic:"لیدنې یوازې دې کلینیک پورې اړه لري.",
  avoidDouble:"په تکراري کلیک یا د شبکې د بیا هڅې له امله دوه ځلې لیدنه نه ثبتېږي.",
  inactivePatient:"ناروغ فعال نه دی؛ فعال ناروغ غوره کړئ.",
  stale:"لیدنه بدله شوې؛ تازه یې کړئ.",statusInvalid:"دا بدلون جواز نه لري.",
  onlyToday:"راتګ یوازې د لیدنې په ورځ ثبتېږي.",noShowEarly:"له وخت مخکې نه راتګ مه ثبتوئ.",
  checkAvailability:"شته وختونه تازه کړئ",unavailableDate:"په دې ورځ مناسب وخت نشته.",
  selectedSlot:"غوره شوی وخت",step:"پړاو",estimatedDuration:"د لیدنې موده",
  bookingSuccess:"لیدنه ثبت او په مهالوېش کې ښکاري.",
  walkinHelp:"حضوري لیدنې هم له همدې خوندي کتار کار اخلي.",
  personalData:"د ناروغانو معلومات شخصي پاتې کېږي.",
  allSources:"ټولې لارې",days:"ورځې",scheduleManagement:"د وختونو تنظیم",
  detail:"جزییات",history:"تاریخچه",actions:"کړنې",close:"بند",open:"خلاص",
  none:"نشته",resourcesUnavailable:"مناسبه څوکۍ نشته؛ لومړی یې جوړه کړئ.",
  providersUnavailable:"فعال ډاکټر نشته؛ له ټیم څخه بلنه ورکړئ.",
  servicesUnavailable:"فعال خدمت نشته؛ لومړی یې جوړ کړئ.",
  selectProvider:"ډاکټر غوره کړئ",prevPeriod:"مخکنۍ دوره",
  nextPeriod:"راتلونکې دوره",moreInDay:"نورې لیدنې",showAll:"ټول",
  noCases:"طبي ریکارډ لا نه دی فعال.",specificDate:"نېټه غوره کړئ",
  firstVisit:"د کلینیک لیدنه",tabCalendar:"مهالوېش",tabQueue:"کتار",
  cancelBookingHelp:"لغوه کول دلیل غواړي او وخت خوشې کوي.",
  limitReached:"ډېر ریکارډونه دي؛ فلټر محدود کړئ.",statusFilter:"حالت",
  selectDay:"ورځ وګورئ",checkinDone:"راتګ ثبت شو",
  treatmentStarted:"درملنه پیل شوه",completedDone:"لیدنه بشپړه شوه",
  noShowDone:"نه راتګ ثبت شو",cancellationDone:"لیدنه لغوه شوه",
  rescheduleDone:"وخت بدل شو",guardianNotNeeded:"لیدنه د کلینیک ریکارډ پورې تړلې ده، نه عام حساب ته."
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang=(locale==="fa-AF"||locale==="ps-AF"||locale==="en")?locale:"fa-AF";
 const t=(key:string)=>words[lang][key]||words.en[key]||key;
 const fmt=(value:unknown,options?:Intl.DateTimeFormatOptions)=>{
  if(!value)return "—";
  const d=new Date(String(value));
  if(Number.isNaN(d.getTime()))return String(value);
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   year:"numeric",month:"short",day:"numeric",...options}).format(d);
 };
 const time=(value:unknown)=>fmt(value,{year:undefined,month:undefined,day:undefined,
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 return {t,fmt,time,lang};
}
async function call(path:string,method="GET",body?:unknown):Promise<any>{
 const r=await fetch(API+"/v1/appointments"+path,{method,credentials:"include",
  cache:"no-store",headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(payload.code||"NETWORK_ERROR"),{
  status:r.status,alternatives:payload.alternatives||[],candidates:payload.candidates||[]});
 return payload;
}
async function registry(cid:string,body:unknown){
 const r=await fetch(API+"/v1/registry/clinics/"+cid+"/patients",{
  method:"POST",credentials:"include",headers:{"content-type":"application/json"},
  body:JSON.stringify(body)});
 const x=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(x.code||"PATIENT_CREATE_FAILED"),{
  candidates:x.candidates||[]});
 return x;
}
function useData(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 const [version,setVersion]=useState(0);
 const refresh=()=>{setVersion(x=>x+1);setError("");setData(null);};
 useEffect(()=>{
  if(!path)return;
  let live=true;setData(null);setError("");
  call(path).then(x=>{if(live)setData(x);})
   .catch(e=>{if(live)setError(e.message||"NETWORK_ERROR");});
  return()=>{live=false;};
 },[path,version]);
 return {data,error,refresh};
}
function dayKabul(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const d=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [d.year,d.month,d.day].join("-");
}
function advance(date:string,diff:number){
 return new Date(Date.parse(date+"T00:00:00Z")+diff*86400000).toISOString().slice(0,10);
}
function weekday(date:string){return (new Date(date+"T12:00:00Z").getUTCDay()+1)%7;}
function saturday(date:string){return advance(date,-weekday(date));}
function monthStart(date:string){return date.slice(0,7)+"-01";}
function monthEnd(date:string){
 return new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0))
  .toISOString().slice(0,10);
}
function moveMonth(date:string,delta:number){
 const d=new Date(date.slice(0,7)+"-01T12:00:00Z");
 d.setUTCMonth(d.getUTCMonth()+delta);
 return d.toISOString().slice(0,10);
}
const weekLabels=["daySat","daySun","dayMon","dayTue","dayWed","dayThu","dayFri"] as const;
function dateTitle(value:string,lang:Lang){
 const date=new Date(value+"T12:00:00Z");
 return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",year:"numeric",month:"long",day:"numeric",
  calendar:"gregory"}).format(date);
}
function dateRange(date:string,view:ViewMode){
 if(view==="day")return {from:date,to:date};
 if(view==="week"){const d=saturday(date);return {from:d,to:advance(d,6)};}
 return {from:monthStart(date),to:monthEnd(date)};
}
const appHref=(cid:string,view?:string)=>"/clinic/appointments"+(view?"/"+view:"")+"?clinic="+encodeURIComponent(cid);
const patientHref=(cid:string,id:string)=>"/clinic/patients/"+id+"?clinic="+encodeURIComponent(cid);
const canBook=(space:Space)=>["owner","manager","receptionist","dentist"].includes(space.role);
const canArrive=(space:Space)=>["owner","manager","receptionist"].includes(space.role);
const canTreat=(space:Space,a:Appointment)=>space.role==="dentist"?a.providerMembershipId===space.membershipId:
  ["owner","manager"].includes(space.role)&&space.clinicianEnabled;
const patientDisplay=(a:Appointment,compact=false)=>{
 const p=a.patient;
 if(!p)return "—";
 if(compact)return p.preferredName+" "+(p.familyName?p.familyName.charAt(0)+".":"");
 return p.preferredName+(p.familyName?" "+p.familyName:"");
};
function Busy(){const {t}=useWords();return <div className="phase06-busy" aria-live="polite">
 <span className="phase05-spinner" aria-hidden="true"/>{t("loading")}</div>;}
function Notice({kind="info",children}:{kind?:"info"|"success"|"warning"|"error";children:ReactNode}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Problem({error,retry}:{error:string;retry?:()=>void}){
 const {t}=useWords();
 const messages:Record<string,string>={
  STALE_APPOINTMENT_REVISION:t("stale"),APPOINTMENT_SLOT_UNAVAILABLE:t("unavailable"),
  ONLY_CONFIRMED_CAN_RESCHEDULE:t("statusInvalid"),NO_SHOW_BEFORE_START:t("noShowEarly"),
  CHECK_IN_ONLY_ON_APPOINTMENT_DAY:t("onlyToday"),INVALID_APPOINTMENT_TRANSITION:t("statusInvalid"),
  ACTIVE_CLINIC_PATIENT_REQUIRED:t("inactivePatient")
 };
 return <div className="card phase06-error" role="alert"><strong>{t("error")}</strong>
  <p>{messages[error]||error}</p>{retry&&<button className="btn btn-secondary" onClick={retry}>
   {t("retry")} ↻</button>}</div>;
}
function Badge({status}:{status:AppointmentStatus}){
 const {t}=useWords();return <span className={"phase06-status phase06-status-"+status}>
  <span aria-hidden="true" className="phase06-status-dot"/>{t(status)}</span>;
}
function Field({label,value,onChange,type="text",min,max,required=false,disabled=false,placeholder,maxLength}:{
 label:string;value:string|number;onChange:(s:string)=>void;type?:string;
 min?:string|number;max?:string|number;required?:boolean;disabled?:boolean;placeholder?:string;maxLength?:number
}){
 return <label className="phase06-field"><span>{label}{required?" *":""}</span>
 <input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required}
  min={min} max={max} placeholder={placeholder} disabled={disabled} maxLength={maxLength}/></label>;
}
function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;
 onChange:(value:string)=>void;options:{value:string;label:string}[];disabled?:boolean}){
 return <label className="phase06-field"><span>{label}</span>
  <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
   {options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>;
}
function Header({space,view,refresh}:{space:Space;view:Page;refresh?:()=>void}){
 const {t}=useWords();
 return <div className="phase06-heading"><div>
  <span className="phase06-eyebrow">DANDANLINK <span aria-hidden="true">/</span> {space.clinicName}</span>
  <h1>{t(view==="new"?"newAppointment":view==="detail"?"appointmentDetail":
    view==="queue"?"queue":"appointments")}</h1>
  <p>{t(view==="new"?"newIntro":view==="detail"?"detailIntro":
    view==="queue"?"queueIntro":"intro")}</p></div>
  <div className="phase06-header-buttons">
   {refresh&&<button className="btn btn-secondary" onClick={refresh}>{t("refresh")} ↻</button>}
   {canBook(space)&&view!=="new"&&<a className="btn btn-primary" href={appHref(space.clinicId,"new")}>
    <span aria-hidden="true">+</span> {t("newAppointment")}</a>}
  </div>
 </div>;
}
function MainTabs({space,view}:{space:Space;view:Page}){
 const {t}=useWords();return <nav className="phase06-main-tabs" aria-label={t("appointments")}>
  <a href={appHref(space.clinicId)} aria-current={view==="calendar"?"page":undefined}>
   <span aria-hidden="true">▦</span> {t("tabCalendar")}</a>
  <a href={appHref(space.clinicId,"queue")} aria-current={view==="queue"?"page":undefined}>
   <span aria-hidden="true">▥</span> {t("tabQueue")}</a>
  {view==="detail"&&<span className="phase06-main-tab-static">{t("detail")}</span>}
  {view==="new"&&<span className="phase06-main-tab-static">{t("newAppointment")}</span>}
 </nav>;
}
export function AppointmentsPortal({view}:{view:Page}){
 const {t}=useWords();
 const [ctx,setCtx]=useState<Context|null>(null),[problem,setProblem]=useState("");
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setRequested(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(x.code||"AUTH_REQUIRED");setCtx(x);})
   .catch(e=>setProblem(e.message||"AUTH_REQUIRED"));
 },[]);
 if(problem==="AUTH_REQUIRED")return <div className="page-narrow card panel">
  <Notice kind="warning">{t("signin")}</Notice>
  <a href="/clinic/login" className="btn btn-primary">{t("signin")}</a></div>;
 if(problem)return <Problem error={problem} retry={()=>location.reload()}/>;
 if(!ctx||requested===undefined)return <Busy/>;
 const space=requested?ctx.clinics.find(c=>c.clinicId===requested):ctx.clinics[0];
 if(!space)return <div className="page-narrow card panel">
   <Notice kind="warning">{t("noClinic")}</Notice>
   <a className="btn btn-secondary" href="/clinic">{t("clinicScope")}</a></div>;
 if(!["owner","manager","receptionist","dentist","assistant"].includes(space.role))
  return <Problem error={t("forbidden")}/>;
 if(view==="new"&&!canBook(space))return <Problem error={t("forbidden")}/>;
 return <Shell ctx={ctx} space={space} active="appointments">
  <div className="phase06-workspace">
   <Header view={view} space={space}/>
   <MainTabs space={space} view={view}/>
   {view==="calendar"?<CalendarPanel space={space}/>:
    view==="queue"?<QueuePanel space={space}/>:
    view==="new"?<BookingWizard space={space}/>:
    <AppointmentDetail space={space}/>}
   <div className="phase06-policy"><span aria-hidden="true">◇</span>{t("noPublic")} {t("staffOnly")}</div>
  </div>
 </Shell>;
}
