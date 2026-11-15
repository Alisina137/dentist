export type AlertKey="delivery_backlog"|"booking_notifications_failed"|
 "support_first_reply_overdue"|"support_triage_overdue"|"high_priority_support"|
 "unassigned_support"|"payment_reviews_overdue"|"clinic_reviews_overdue"|"security_denials";
export type AlertItem={key:AlertKey;severity:"critical"|"warning"|"info";
 href:string;group:string;count:number;snoozedUntil:string|null};
export type OperationsSummary={generatedAt:string;timezone:string;
 alerts:AlertItem[];activeCount:number;criticalCount:number;
 metrics:{pendingClinics:number;pendingListings:number;openTickets:number;paidInvoices14:number};
 checks:{databaseResponsive:boolean;pilotReleaseEnabled:boolean;note:string};
 activityTrend:{day:string;supportOpened:number;invoicesConfirmed:number;accessFailures:number}[];
 recentActions:{action:string;outcome:string;at:string}[];privacy:string};
export type SearchResult={type:"clinics"|"dentists"|"listings"|"invoices"|"tickets";
 id:string;title:string;detail:string;status:string;href:string};
export const ADMIN_API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
export async function getAdminOps<T>(path:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(ADMIN_API+"/v1/admin/operations"+path,{
  credentials:"include",cache:"no-store",signal});
 const result=await response.json().catch(()=>({})) as T&{code?:string};
 if(!response.ok)throw Error(result.code||"ADMIN_OPERATIONS_UNAVAILABLE");
 return result;
}
export async function changeSnooze(key:AlertKey,action:"snooze"|"unsnooze"){
 const response=await fetch(ADMIN_API+"/v1/admin/operations/alerts/"+key+"/snooze",{
  method:action==="snooze"?"POST":"DELETE",credentials:"include",cache:"no-store"});
 const result=await response.json().catch(()=>({})) as {code?:string};
 if(!response.ok)throw Error(result.code||"ALERT_UPDATE_FAILED");
 return result;
}
export const ADMIN_WORDS:Record<string,Record<string,string>>={
 en:{
 search:"Search platform",searchPlaceholder:"Find clinics, dentists, listings, payments or support…",
 searchTitle:"Find an administrative record",searchHint:"No patient or medical chart search.",
 searchShort:"Enter at least 2 characters.",searchEmpty:"No matching administrative records.",
 searchLoading:"Searching…",searchError:"Search is unavailable.",close:"Close",
 clinics:"Clinics",dentists:"Dentist credentials",listings:"Clinic listings",
 invoices:"Subscription payments",tickets:"Support cases",results:"Results",
 alerts:"Notifications",alertsCenter:"Alert center",monitoring:"Platform monitoring",
 active:"Active",snoozed:"Snoozed",snooze:"Snooze 12h",unsnooze:"Restore",
 critical:"Critical",warning:"Needs review",info:"Information",noAlerts:"No active alerts",
 noAlertsDetail:"No unresolved issues are detected by the current checks.",
 count:"Open alerts",refresh:"Refresh",loading:"Loading live operations…",
 failed:"Cannot retrieve operational data. Retry instead of assuming all clear.",retry:"Retry",
 viewAll:"View all alerts",observed:"Updated",alertsTitle:"Actionable alerts",
 alertsSubtitle:"Real-time data from platform queues. Snoozing only hides your notification for 12 hours.",
 monitoringTitle:"Platform monitoring",monitoringSubtitle:"Current operational signals and recorded platform events.",
 privacy:"Operational metadata only. No medical records, patient information or payment references.",
 systemChecks:"System and launch gates",reachable:"Database responsive",
 notReady:"Real-patient pilot release not approved",readyFlag:"Pilot release flag enabled by operator",
 releaseNote:"Database access and operator flags do not certify legal, clinical, hosting or backup readiness.",
 dailyTrend:"14-day activity",trendDescription:"Recorded events by Asia/Kabul calendar day.",
 supportOpened:"Support requests opened",invoicesConfirmed:"Paid platform subscription invoices",
 accessFailures:"Logged failed access actions",chartTable:"View source data",date:"Day",
 recentTitle:"Recent administration events",recentEmpty:"No recent events.",
 pendingClinics:"Pending clinics",pendingListings:"Pending listings",
 openTickets:"Open support requests",paidInvoices14:"Paid invoices in 14 days",
 goTo:"Open related queue",badge:"Operational alerts",timeKabul:"Kabul time",
 emptyChart:"No recorded activity for this period.",
 acknowledgeNote:"Snoozed alerts return after 12h if the issue remains unresolved.",
 success:"Notification preference saved.",failure:"Could not change notification preference.",
 delivery_backlog:"Delayed delivery queue",booking_notifications_failed:"Failed booking notifications",
 support_first_reply_overdue:"Support first response overdue (24h)",
 support_triage_overdue:"Support triage overdue (48h)",
 high_priority_support:"High-priority support requests",unassigned_support:"Unassigned support requests",
 payment_reviews_overdue:"Payment verification overdue (48h)",
 clinic_reviews_overdue:"Clinic verification overdue (48h)",
 security_denials:"Failed access/audit events (24h)",
 delivery_backlog_detail:"Pending delivery jobs older than 15 minutes.",
 booking_notifications_failed_detail:"Failed booking notifications need operator attention.",
 support_first_reply_overdue_detail:"Cases without a staff reply past the 24h internal target.",
 support_triage_overdue_detail:"Open or in-progress cases older than 48h.",
 high_priority_support_detail:"Unresolved support cases marked high priority.",
 unassigned_support_detail:"Unresolved support cases without an agent.",
 payment_reviews_overdue_detail:"Platform subscription invoices waiting longer than 48h.",
 clinic_reviews_overdue_detail:"Submitted clinics not reviewed after 48h.",
 security_denials_detail:"Failed or denied actions recorded in the audit log."
 },
 "fa-AF":{
 search:"جستجوی پلتفرم",searchPlaceholder:"کلینیک، داکتر، آگهی، پرداخت یا پشتیبانی را جستجو کنید…",
 searchTitle:"یافتن سوابق اداری",searchHint:"بدون جستجوی مریضان یا پرونده صحی.",
 searchShort:"حداقل ۲ حرف وارد کنید.",searchEmpty:"مورد مطابق یافت نشد.",
 searchLoading:"در حال جستجو…",searchError:"جستجو در دسترس نیست.",close:"بستن",
 clinics:"کلینیک‌ها",dentists:"اسناد داکتران",listings:"آگهی‌های کلینیک",
 invoices:"پرداخت اشتراک",tickets:"درخواست‌های پشتیبانی",results:"نتایج",
 alerts:"اعلان‌ها",alertsCenter:"مرکز هشدارها",monitoring:"نظارت پلتفرم",
 active:"فعال",snoozed:"موقتاً خاموش",snooze:"خاموشی ۱۲ ساعته",unsnooze:"دوباره فعال",
 critical:"بحرانی",warning:"نیازمند بررسی",info:"اطلاع",noAlerts:"هشدار فعال وجود ندارد",
 noAlertsDetail:"در بررسی فعلی دیتابیس مشکل باز شناسایی نشد.",
 count:"هشدارهای باز",refresh:"تازه‌سازی",loading:"در حال بارگیری وضعیت زنده…",
 failed:"وضعیت دریافت نشد. دوباره تلاش کنید؛ نبودن داده به معنی نبود هشدار نیست.",retry:"تلاش دوباره",
 viewAll:"مشاهده همه هشدارها",observed:"تازه‌شده",alertsTitle:"هشدارهای قابل پیگیری",
 alertsSubtitle:"هشدارهای واقعی از صف‌ها. خاموشی موقت تنها ۱۲ ساعت دوام دارد.",
 monitoringTitle:"نظارت پلتفرم",monitoringSubtitle:"وضعیت عملیات و رویدادهای ثبت‌شده.",
 privacy:"فقط معلومات عملیاتی؛ بدون اسناد صحی، معلومات مریضان یا مرجع پرداخت.",
 systemChecks:"سیستم و تأیید نشر",reachable:"دیتابیس پاسخ می‌دهد",
 notReady:"نشر آزمایشی با مریضان واقعی تأیید نشده",readyFlag:"نشر آزمایشی توسط مسئول فعال شده",
 releaseNote:"اتصال دیتابیس و تنظیمات مسئول، تصدیق آمادگی قانونی، طبی، میزبانی یا پشتیبان‌گیری نیست.",
 dailyTrend:"فعالیت ۱۴ روز اخیر",trendDescription:"رویدادهای ثبت‌شده مطابق تاریخ کابل.",
 supportOpened:"درخواست‌های پشتیبانی",invoicesConfirmed:"فاکتورهای اشتراک پرداخت‌شده",
 accessFailures:"دسترسی‌های ناموفق ثبت‌شده",chartTable:"نمایش جدول معلومات",date:"روز",
 recentTitle:"فعالیت‌های اخیر مدیران",recentEmpty:"فعالیت اخیر ثبت نشده.",
 pendingClinics:"کلینیک‌های منتظر",pendingListings:"آگهی‌های منتظر",
 openTickets:"درخواست‌های باز",paidInvoices14:"فاکتورهای پرداخت‌شده در ۱۴ روز",
 goTo:"بازکردن صف مربوط",badge:"هشدارهای عملیاتی",timeKabul:"به وقت کابل",
 emptyChart:"در این دوره رویدادی ثبت نشده.",
 acknowledgeNote:"هشدار خاموش‌شده، اگر حل نشود، بعد از ۱۲ ساعت برمی‌گردد.",
 success:"تنظیم اعلان ذخیره شد.",failure:"تغییر اعلان انجام نشد.",
 delivery_backlog:"صف تحویل با تأخیر",booking_notifications_failed:"اعلان‌های ناموفق ملاقات",
 support_first_reply_overdue:"پاسخ اول پشتیبانی با تأخیر (۲۴ ساعت)",
 support_triage_overdue:"بررسی اولیه پشتیبانی با تأخیر (۴۸ ساعت)",
 high_priority_support:"درخواست‌های عاجل پشتیبانی",unassigned_support:"درخواست‌های بدون مسئول",
 payment_reviews_overdue:"تأیید پرداخت با تأخیر (۴۸ ساعت)",
 clinic_reviews_overdue:"تأیید کلینیک با تأخیر (۴۸ ساعت)",
 security_denials:"رویدادهای دسترسی ناموفق (۲۴ ساعت)",
 delivery_backlog_detail:"کارهای تحویل با انتظار بیش از ۱۵ دقیقه.",
 booking_notifications_failed_detail:"اعلان‌های ناموفق نیازمند بررسی اند.",
 support_first_reply_overdue_detail:"درخواست‌های بدون پاسخ کارمند پس از هدف ۲۴ ساعت.",
 support_triage_overdue_detail:"درخواست‌های باز با عمر بیش از ۴۸ ساعت.",
 high_priority_support_detail:"درخواست‌های مهم حل‌نشده.",
 unassigned_support_detail:"درخواست‌های حل‌نشده بدون مسئول.",
 payment_reviews_overdue_detail:"فاکتورهای اشتراک منتظر بیش از ۴۸ ساعت.",
 clinic_reviews_overdue_detail:"درخواست‌های کلینیک منتظر بیش از ۴۸ ساعت.",
 security_denials_detail:"فعالیت ناموفق یا ردشده در گزارش حسابرسی."
 },
 "ps-AF":{
 search:"د پلاتفورم لټون",searchPlaceholder:"کلینیک، ډاکټر، اعلان، تادیه یا ملاتړ ولټوئ…",
 searchTitle:"اداري ریکارډونه موندل",searchHint:"د ناروغانو او طبي اسنادو لټون نشته.",
 searchShort:"لږ تر لږه ۲ توري ولیکئ.",searchEmpty:"ورته ریکارډ ونه موندل شو.",
 searchLoading:"لټون روان دی…",searchError:"لټون نشته.",close:"بندول",
 clinics:"کلینیکونه",dentists:"د ډاکټرانو اسناد",listings:"د کلینیک اعلانونه",
 invoices:"د ګډون تادیات",tickets:"د ملاتړ غوښتنې",results:"پایلې",
 alerts:"خبرتیاوې",alertsCenter:"د خبرتیاوو مرکز",monitoring:"د پلاتفورم څارنه",
 active:"فعال",snoozed:"لنډمهاله چوپ",snooze:"۱۲ ساعته چوپ",unsnooze:"بیا فعال",
 critical:"خطرناک",warning:"بیاکتنې ته اړتیا",info:"معلومات",noAlerts:"فعاله خبرتیا نشته",
 noAlertsDetail:"اوسنیو کتنو کې نه‌حل شوې ستونزه نشته.",
 count:"خلاصې خبرتیاوې",refresh:"تازه کول",loading:"ژوندی حالت بارېږي…",
 failed:"حالت نه راځي. بیا هڅه وکړئ؛ نشت معلومات د ښه حالت نښه نه ده.",retry:"بیا هڅه",
 viewAll:"ټولې خبرتیاوې وګورئ",observed:"تازه شوی",alertsTitle:"د اقدام خبرتیاوې",
 alertsSubtitle:"له حقیقي کتارونو خبرتیاوې. چوپول یې یوازې ۱۲ ساعته دوام کوي.",
 monitoringTitle:"د پلاتفورم څارنه",monitoringSubtitle:"عملیاتي حالت او ثبت شوې پېښې.",
 privacy:"یوازې عملیاتي شمېرې؛ طبي ریکارډونه او شخصي مرجع پکې نشته.",
 systemChecks:"سیسټم او د پیل تایید",reachable:"ډیټابېس فعاله ده",
 notReady:"د حقیقي ناروغانو پیل نه دی تایید",readyFlag:"ازمایښتي پیل د مسئول له خوا فعال دی",
 releaseNote:"د ډیټابېس اړیکه د قانوني، طبي، کوربه‌توب او بیک اپ تصدیق نه دی.",
 dailyTrend:"د ۱۴ ورځو فعالیت",trendDescription:"ثبت شوې پېښې د کابل د ورځې له مخې.",
 supportOpened:"د ملاتړ غوښتنې",invoicesConfirmed:"تادیه شوي ګډون بلونه",
 accessFailures:"ثبت شوې ناکامې لاسرسي",chartTable:"د معلوماتو جدول",date:"ورځ",
 recentTitle:"وروستي اداري فعالیتونه",recentEmpty:"وروستي فعالیت نشته.",
 pendingClinics:"منتظر کلینیکونه",pendingListings:"منتظر اعلانونه",
 openTickets:"خلاص ملاتړ",paidInvoices14:"په ۱۴ ورځو کې تادیه شوي بلونه",
 goTo:"اړوند کتار وګورئ",badge:"عملیاتي خبرتیاوې",timeKabul:"د کابل وخت",
 emptyChart:"په دې موده کې فعالیت نشته.",
 acknowledgeNote:"چوپه شوې خبرتیا که ستونزه پاتې وي له ۱۲ ساعتونو وروسته بېرته راځي.",
 success:"د خبرتیا تنظیم خوندي شو.",failure:"خبرتیا بدله نه شوه.",
 delivery_backlog:"د سپارلو ځنډېدلی کتار",booking_notifications_failed:"ناکامې د لیدنې خبرتیاوې",
 support_first_reply_overdue:"د ملاتړ ځنډېدلی لومړی ځواب (۲۴ ساعتونه)",
 support_triage_overdue:"د ملاتړ ځنډېدلې کتنه (۴۸ ساعتونه)",
 high_priority_support:"مهمې ملاتړ غوښتنې",unassigned_support:"بې مسئوله غوښتنې",
 payment_reviews_overdue:"د تادیې ځنډېدلی تایید (۴۸ ساعتونه)",
 clinic_reviews_overdue:"د کلینیک ځنډېدلی تایید (۴۸ ساعتونه)",
 security_denials:"ناکام لاسرسي پېښې (۲۴ ساعتونه)",
 delivery_backlog_detail:"له ۱۵ دقیقو زاړه د سپارلو کارونه.",
 booking_notifications_failed_detail:"ناکامې خبرتیاوې بیاکتنې ته اړتیا لري.",
 support_first_reply_overdue_detail:"له ۲۴ ساعتونو ډېر بې ځوابه غوښتنې.",
 support_triage_overdue_detail:"له ۴۸ ساعتونو زاړې پرانیستې غوښتنې.",
 high_priority_support_detail:"ناحل شوې مهمې غوښتنې.",
 unassigned_support_detail:"بې مسئوله ناحل شوې غوښتنې.",
 payment_reviews_overdue_detail:"له ۴۸ ساعتونو زاړه د ګډون بلونه.",
 clinic_reviews_overdue_detail:"له ۴۸ ساعتونو ډېر منتظر کلینیکونه.",
 security_denials_detail:"په راپور کې ناکامې یا رد شوې کړنې."
 }
};
export function adminWord(locale:string,key:string){
 return ADMIN_WORDS[locale]?.[key]||ADMIN_WORDS.en[key]||key;
}
