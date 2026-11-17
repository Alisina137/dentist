"use client";
import React,{useEffect,useMemo,useState,type ReactNode,type FormEvent} from "react";
import {InlineAlert,usePreferences} from "./index";
import {ClinicLoadingState,ClinicFailureState,useClinicFeedback} from "./clinic-feedback";
import {Shell} from "./phase03";
import {ExpensePanel,CashFlowInsights} from "./phase11";
import {CareIcon} from "./care-icons";
import {clinicFinanceTab,clinicInvoiceLineIssue,clinicKabulDateTimeInput,
 clinicKabulInputToIso,clinicCsvRows,clinicFinancialNet,clinicCanEnterPayment,
 type ClinicFinanceTab} from "./clinic-finance-model";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Role="owner"|"manager"|"dentist"|"assistant"|"receptionist"|"cashier";
type Space={clinicId:string;clinicName:string;membershipId:string;role:Role;clinicianEnabled:boolean;
 clinicStatus:string;capabilities:string[]};
type Context={name:string;email:string;clinics:Space[];mfaEnabled:boolean};
type Lang="en"|"fa-AF"|"ps-AF";
type Invoice={id:string;patientId:string;patientName?:string;patientNumber?:string;
 number:number;label:string;status:string;documentStatus:string;totalAfn:number;paidAfn:number;
 balanceAfn:number;revision:number;version:number;sourceType:string;sourceId:string;
 dueDate:string|null;issuedAt:string|null;createdAt:string;voidedAt:string|null;voidReason:string|null};
type Line={serviceId:string;serviceVersion:number;name:string;quantity:number;unitPriceAfn:number;discountAfn:number;totalAfn:number};
type Entry={id:string;invoiceId?:string;invoice_id?:string;kind:string;amountAfn?:number;amount_afn?:number;
 method:string;reference:string|null;note?:string|null;reversesEntryId?:string|null;
 occurredAt?:string;occurred_at?:string;actorName?:string;actor_name?:string;receiptNumber?:string|null;
 invoice_number?:number;patient_name?:string;createdAt?:string;created_at?:string};
type Detail={invoice:Invoice;items:Line[];note:string|null;entries:Entry[];events:any[];versions:any[]};
type Service={id:string;name:string;category:string;base_price_afn:number;version:number};
type Patient={id:string;patient_number:string;preferred_name:string;family_name:string|null};
type Source={type:"appointment"|"encounter"|"treatment_stage";id:string;date:string;serviceIds:string[]};
const L:Record<Lang,Record<string,string>>={
 en:{
 finance:"Finance",expenses:"Expenses",tag:"Clinic receivables · manual payments · auditable ledger",
 overview:"Overview",invoices:"Invoices",payments:"Payments",balances:"Balances",patientBilling:"Patient billing",
 statement:"Statement",invoice:"Invoice",receipt:"Receipt",newInvoice:"New invoice",
 recordPayment:"Record payment",createDraft:"Create draft",draft:"Draft",issued:"Issued",
 partially_paid:"Partially paid",paid:"Paid",overdue:"Overdue",void:"Void",all:"All",
 outstanding:"Outstanding",todayReceipts:"Today's net receipts",monthCollections:"Month-to-date net collections",
 overdueTotal:"Past-due receivables",openCount:"Open invoices",search:"Search invoice or patient",
 patient:"Patient",patientSearch:"Find a clinic patient",selectPatient:"Select patient",
 amount:"Amount",total:"Total",paidAmount:"Paid",balance:"Balance",method:"Payment method",
 source:"Billable completed care",selectSource:"Select completed visit, signed encounter or stage",
 evidence:"Invoices require performed/complete clinical evidence; a plan alone is not a charge.",
 service:"Service",quantity:"Quantity",discount:"Discount (AFN)",price:"Unit price",
 lineTotal:"Line amount",addLine:"Add service",remove:"Remove",dueDate:"Due date (Gregorian)",
 note:"Internal note",noteOptional:"Optional internal note",revision:"Revision",
 save:"Save changes",issue:"Issue invoice",confirmIssue:"Issue this invoice with frozen line items?",
 confirmVoid:"Void this unpaid invoice? Prior document history remains.",
 voidReason:"Reason for voiding (at least 10 characters)",editDraft:"Edit draft",
 create:"Create",cancel:"Cancel",loading:"Loading financial records…",retry:"Retry",
 error:"Unable to finish the operation. No unsaved form content was discarded.",
 success:"Operation completed",noData:"Nothing matches these filters yet.",
 back:"Back to finance",openInvoice:"Open invoice",viewStatement:"Patient statement",
 sourceAppointment:"Completed appointment",sourceEncounter:"Signed clinical encounter",
 sourceStage:"Completed treatment stage",sourcesEmpty:"No eligible completed care was found for this patient.",
 needPatient:"Choose an active patient first.",
 currency:"AFN",recent:"Recent ledger activity",date:"Date",status:"Status",
 invoicesCount:"Invoices",viewAll:"View invoices",next:"Next",previous:"Previous",
 page:"Page",current:"Current",age1:"1–30 days",age2:"31–60 days",age3:"61+ days",
 aging:"Receivables aging",downloadCsv:"Export current page (CSV)",action:"Action",
 payment:"Payment",reversal:"Reversal",credit:"Credit",addCredit:"Apply credit",
 creditReason:"Credit authorization reason",creditNotice:"Credits reduce receivables but are not cash received.",
 reverse:"Reverse entry",reverseReason:"Reason for reversal",reverseWarning:"A reversal is an audit adjustment, not an automatic refund or bank transfer.",
 confirmReverse:"Post a compensating reversal for this ledger entry?",
 confirmCredit:"Apply this manual credit to the invoice?",
 reference:"Reference",referenceOptional:"Reference (optional)",recordedBy:"Recorded by",
 paymentDate:"Payment time",manualBank:"Manual bank transfer (not bank-verified)",
 cash:"Cash",bank_transfer:"Bank transfer",other_manual:"Other manual",
 confirmationPayment:"Record this manual payment?",issueDate:"Issued",
 cannotPay:"Only issued invoices with a remaining balance accept payments.",
 receiptNumber:"Receipt number",reversed:"Reversed",recorded:"Recorded",
 print:"Print",printInvoice:"Print invoice",printReceipt:"Print receipt",
 patientOnly:"Clinic-private; patient app sharing is not enabled.",
 unverified:"Manual entry — not independently bank-verified",
 issuedNotPaid:"Issuing an invoice does not mean it was paid.",
 invoiceLines:"Invoice line items",ledger:"Ledger history",history:"Change history",
 noTransactions:"No billing activity",newPatientInvoice:"New invoice for this patient",
 patientTotal:"Total invoiced",patientPaid:"Total paid",patientBalance:"Outstanding",
 invoiceHistory:"Patient invoices",patientPayments:"Patient payments",patientStatement:"Patient statement",
 filter:"Filter",noInvoice:"No invoices yet.",selectStatus:"Filter by status",
 stage:"Stage",consultation:"Consultation",ownerOnly:"Only the clinic owner or manager may reverse, void or credit.",
 clinicianHidden:"Clinical notes and diagnoses are not included in financial records.",
 tax:"Tax",taxNote:"Tax not configured; no unapproved automatic tax is added.",
 range:"Period",notReady:"Expenses become available in Phase 11.",
 noAuto:"No automatic checkout or payment capture.",
 zero:"0",summary:"Summary",done:"Done",invoiceCreated:"Invoice draft created",
 toInvoice:"Open created invoice",unverifiedBank:"Manual bank entry; verify with the clinic's banking records.",
 noCharge:"Performed care is not automatically an invoice.",
 refresh:"Refresh",statementDate:"Statement date",download:"Download CSV",
 receiptStatus:"Status",manual:"Manual",amountDue:"Amount due",invoiceSummary:"Invoice summary",
 authorization:"Authorization",cardLabel:"Clinic finance",cashMovement:"Net recorded cash flow",
 attention:"Needs attention",reason:"Reason",emptyPatient:"No patient selected",paidRecords:"Posted payments",
 invoiceState:"Invoice status",clinic:"Clinic",
 failed:"Financial data unavailable",
 financeWorkspace:"Financial workspace",financeIntro:"Track issued invoices, authorized manual payments and open receivables from actual clinic records.",
 financeSnapshot:"Live financial position",financeManual:"Manual ledger • AFN • No online payment capture",
 financeQuick:"Financial workflows",financeQuickHint:"Open the workspace section you need without leaving the clinic.",
 financeReceivables:"Review outstanding invoices",financeOpenLedger:"Review posted ledger entries",
 financeNewInvoice:"Prepare invoice draft",financeExpense:"Review clinic expenses",
 financeSummaryHint:"Receipts reflect manual recorded payments, net of reversals; credits are not cash receipts.",
 financeToday:"Today in Kabul",financeLimited:"This screen uses live billing records; not a bank reconciliation or verified financial statement.",
 financeNoInvoices:"Create the first draft only after completed clinical care is documented.",
 financeApprovals:"Financial permissions",financePermissions:"Owners and managers approve credits, reversals and invoice voids. Cashiers record manual payments; reception handles invoices.",
 financeCounts:"Loaded invoice records",financeTotalHint:"Invoice results are limited to the latest 400 records; search and status filters apply within that server window.",
 financeResult:"Showing",financeOf:"of",financeClear:"Clear filters",financeReview:"Review transaction",
 financeReviewTitle:"Verify manual payment before posting",
 financeReviewCredit:"Review manual credit before applying",
 financeReviewHelp:"Confirm the patient, invoice, amount and payment details against your external records.",
 financeReviewConfirm:"I checked this entry and understand it changes the clinic ledger.",
 financeReviewPost:"Post to ledger",financeReviewCancel:"Continue editing",
 financeReviewIssue:"Review invoice issuance",financeReviewIssueInfo:"Issuing freezes the invoice document. It does not collect any money.",
 financeReviewVoid:"Review invoice cancellation",financeReviewVoidInfo:"Only unpaid invoices without ledger history can be voided. The audit trail remains.",
 financeReviewReverse:"Review compensating reversal",financeReviewReverseInfo:"This posts a manual accounting reversal; it does NOT send a bank refund.",
 financeReviewIssueConfirm:"I reviewed the invoice, recorded performed-care source, amount and patient.",
 financeReviewReverseConfirm:"I verified the entry and reason against the original payment or credit.",
 financeReviewFinal:"Confirm and continue",financeInvoiceDraft:"Draft invoice, not yet issued",
 financeAmountPreview:"Estimated amount (final price verified by server)",
 financeEstimateWarning:"Displayed amounts use current catalog prices; the billing API re-prices from eligible performed-care evidence before saving.",
 financeInvalid:"Check each service, quantity and discount before saving.",
 financeBadDate:"Enter a valid payment time in Afghanistan (UTC+04:30), within the last year.",
 financeDateZone:"Afghanistan time (UTC+04:30)",financePreviewBalance:"Balance after this entry",
 financePaymentMethod:"Manual payment details",financeNoOnline:"Do not mark unverified bank transfers as settled by the bank.",
 financeReceiptReversed:"This payment was reversed in the ledger. This receipt is retained for audit only.",
 financePatientLimit:"Statement shows up to 150 most recent invoices and 200 recent ledger entries. Displayed totals cover that returned invoice window, not necessarily lifetime balances.",
 financeHistoryLimit:"History shows up to 100 invoice events and 200 ledger entries.",
 financeResultLimit:"Only the latest 400 invoices are searched on the server; this is not an all-time invoice count.",
 financeExportWarning:"CSV contains financial and patient details. Save only to a protected clinic device and verify the selected ledger page.",
 financeNoChanges:"No posting happens until you confirm the review.",
 financeDueDate:"Payment due date",financeUpdate:"Refresh financial records",
 financeStatus:"Invoice status",financePost:"Posted manually",financeBack:"Back to workspace",financeReviewPayment:"Review payment",financeReviewEntry:"Review ledger entry"
 },
 "fa-AF":{
 finance:"مالی",expenses:"مصارف",tag:"حساب‌های کلینیک · پرداخت دستی · دفتر ثبت قابل بررسی",
 overview:"نمای کلی",invoices:"بل‌ها",payments:"پرداخت‌ها",balances:"باقی‌مانده‌ها",patientBilling:"حساب مریض",
 statement:"صورت‌حساب",invoice:"بل",receipt:"رسید",newInvoice:"بل جدید",
 recordPayment:"ثبت پرداخت",createDraft:"ایجاد پیش‌نویس",draft:"پیش‌نویس",issued:"صادرشده",
 partially_paid:"نیمه‌پرداخت",paid:"پرداخت‌شده",overdue:"سررسید گذشته",void:"باطل",all:"همه",
 outstanding:"باقی‌مانده",todayReceipts:"دریافت خالص امروز",monthCollections:"دریافت خالص ماه",
 overdueTotal:"حساب‌های سررسید گذشته",openCount:"بل‌های باز",search:"جستجوی بل یا مریض",
 patient:"مریض",patientSearch:"جستجوی مریض",selectPatient:"انتخاب مریض",
 amount:"مبلغ",total:"مجموع",paidAmount:"پرداخت‌شده",balance:"باقی‌مانده",method:"روش پرداخت",
 source:"تداوی انجام‌شده",selectSource:"انتخاب معاینه یا مرحله انجام‌شده",
 evidence:"بل فقط برای تداوی واقعی ثبت می‌شود؛ پلان به‌تنهایی پرداخت نیست.",
 service:"خدمت",quantity:"تعداد",discount:"تخفیف (افغانی)",price:"قیمت واحد",
 lineTotal:"مجموع ردیف",addLine:"افزودن خدمت",remove:"حذف",dueDate:"سررسید (میلادی)",
 note:"یادداشت داخلی",noteOptional:"یادداشت اختیاری",revision:"نسخه",
 save:"ذخیره تغییرات",issue:"صدور بل",confirmIssue:"بل را با قیمت‌های ثابت صادر می‌کنید؟",
 confirmVoid:"بل پرداخت‌نشده باطل شود؟ تاریخچه محفوظ می‌ماند.",
 voidReason:"دلیل ابطال (حداقل ۱۰ حرف)",editDraft:"تغییر پیش‌نویس",
 create:"ایجاد",cancel:"انصراف",loading:"معلومات مالی بار می‌شود…",retry:"تلاش دوباره",
 error:"عملیات ناکام شد. محتوای فورم حفظ شده است.",success:"عملیات موفق",
 noData:"موردی پیدا نشد.",back:"بازگشت به مالی",openInvoice:"باز کردن بل",
 viewStatement:"صورت‌حساب مریض",sourceAppointment:"معاینه تکمیل‌شده",
 sourceEncounter:"معاینه کلینیکی امضاشده",sourceStage:"مرحله تداوی تکمیل‌شده",
 sourcesEmpty:"برای این مریض تداوی انجام‌شده قابل بل یافت نشد.",needPatient:"ابتدا مریض را انتخاب کنید.",
 currency:"افغانی",recent:"فعالیت اخیر مالی",date:"تاریخ",status:"حالت",invoicesCount:"بل‌ها",
 viewAll:"مشاهده بل‌ها",next:"بعدی",previous:"قبلی",page:"صفحه",current:"فعلی",
 age1:"۱ تا ۳۰ روز",age2:"۳۱ تا ۶۰ روز",age3:"۶۱ روز بیشتر",
 aging:"سن‌بندی طلب‌ها",downloadCsv:"دریافت CSV",action:"عملیات",
 payment:"پرداخت",reversal:"برگشت",credit:"اعتبار",addCredit:"اعمال اعتبار",
 creditReason:"دلیل اعتبار",creditNotice:"اعتبار بدهی را کم می‌کند، اما دریافت نقدی نیست.",
 reverse:"برگشت ثبت",reverseReason:"دلیل برگشت",
 reverseWarning:"برگشت فقط اصلاح حسابداری است؛ پول خودکار بازپرداخت نمی‌شود.",
 confirmReverse:"ثبت برگشت جبرانی برای این پرداخت؟",
 confirmCredit:"اعتبار دستی اعمال شود؟",reference:"شماره مرجع",
 referenceOptional:"مرجع (اختیاری)",recordedBy:"ثبت توسط",paymentDate:"زمان پرداخت",
 manualBank:"حواله بانکی دستی (تأییدنشده)",cash:"نقدی",bank_transfer:"حواله بانکی",
 other_manual:"روش دیگر دستی",confirmationPayment:"پرداخت دستی ثبت شود؟",
 issueDate:"صادرشده",cannotPay:"فقط بل صادرشده با بدهی قابل پرداخت است.",
 receiptNumber:"شماره رسید",reversed:"برگشت‌شده",recorded:"ثبت‌شده",
 print:"چاپ",printInvoice:"چاپ بل",printReceipt:"چاپ رسید",
 patientOnly:"معلومات مالی خصوصی کلینیک؛ در اپ مریض نشر نشده.",
 unverified:"ثبت دستی؛ تأیید مستقل بانکی نیست.",issuedNotPaid:"صدور بل به معنای پرداخت نیست.",
 invoiceLines:"اقلام بل",ledger:"تاریخچه مالی",history:"تاریخچه تغییرات",
 noTransactions:"فعالیت مالی ندارد",newPatientInvoice:"بل جدید برای مریض",
 patientTotal:"مجموع بل‌ها",patientPaid:"مجموع پرداخت‌ها",patientBalance:"باقی‌مانده",
 invoiceHistory:"بل‌های مریض",patientPayments:"پرداخت‌های مریض",
 patientStatement:"صورت‌حساب مریض",filter:"فیلتر",noInvoice:"بلی ثبت نشده.",
 selectStatus:"انتخاب حالت",stage:"مرحله",consultation:"معاینه",
 ownerOnly:"فقط مالک یا مدیر می‌تواند ابطال و برگشت دهد.",
 clinicianHidden:"معلومات کلینیکی و تشخیص در گزارش مالی نیست.",
 tax:"مالیات",taxNote:"مالیات تنظیم نشده و خودکار اضافه نمی‌شود.",
 range:"دوره",notReady:"مصارف در مرحله ۱۱ اضافه می‌شود.",noAuto:"برداشت خودکار نداریم.",
 zero:"۰",summary:"خلاصه",done:"انجام شد",invoiceCreated:"پیش‌نویس بل ایجاد شد",
 toInvoice:"باز کردن بل",unverifiedBank:"پرداخت بانکی دستی؛ با بانک مطابقت دهید.",
 noCharge:"تداوی انجام‌شده خودکار بل نمی‌سازد.",refresh:"تازه‌سازی",
 statementDate:"تاریخ صورت‌حساب",download:"دریافت CSV",receiptStatus:"حالت",
 manual:"دستی",amountDue:"مبلغ باقی",invoiceSummary:"خلاصه بل",
 authorization:"صلاحیت",cardLabel:"مالی کلینیک",cashMovement:"جریان نقد خالص",
 attention:"نیازمند توجه",reason:"دلیل",emptyPatient:"مریض انتخاب نشده.",
 paidRecords:"پرداخت‌های ثبت‌شده",invoiceState:"حالت بل",clinic:"کلینیک",
 failed:"معلومات مالی در دسترس نیست",
 financeWorkspace:"محیط کار مالی",financeIntro:"بل‌های صادرشده، پرداخت‌های دستی مجاز و حساب‌های باقی‌مانده را از معلومات واقعی کلینیک بررسی کنید.",
 financeSnapshot:"وضعیت زنده مالی",financeManual:"دفتر ثبت دستی • افغانی • بدون پرداخت آنلاین",
 financeQuick:"کارهای مالی",financeQuickHint:"بخش مورد نظر را بدون ترک محیط کلینیک باز کنید.",
 financeReceivables:"بررسی حساب‌های باقی",financeOpenLedger:"بررسی پرداخت‌های ثبت‌شده",
 financeNewInvoice:"آماده‌سازی پیش‌نویس بل",financeExpense:"بررسی مصارف کلینیک",
 financeSummaryHint:"دریافت‌ها ثبت دستی و خالص از برگشت‌ها هستند؛ اعتبار دریافت نقدی نیست.",
 financeToday:"امروز به وقت کابل",financeLimited:"این بخش از معلومات مالی زنده است؛ صورت‌حساب تأییدشدۀ بانکی نیست.",
 financeNoInvoices:"پیش‌نویس نخست را فقط پس از ثبت تداوی انجام‌شده بسازید.",
 financeApprovals:"صلاحیت‌های مالی",financePermissions:"مالک و مدیر اعتبار، برگشت و ابطال بل را تأیید می‌کنند. صندوق‌دار پرداخت دستی ثبت می‌کند.",
 financeCounts:"بل‌های بارگیری‌شده",financeTotalHint:"جستجو و فیلتر در آخرین ۴۰۰ بل ثبت‌شده انجام می‌شود.",
 financeResult:"نمایش",financeOf:"از",financeClear:"پاک‌کردن فیلترها",financeReview:"بررسی عملیات",
 financeReviewTitle:"بررسی پرداخت دستی قبل از ثبت",financeReviewCredit:"بررسی اعتبار دستی قبل از ثبت",
 financeReviewHelp:"مریض، بل، مبلغ و جزئیات پرداخت را با اسناد بیرونی بررسی کنید.",
 financeReviewConfirm:"این ثبت را بررسی کرده‌ام و می‌دانم دفتر حساب کلینیک تغییر می‌کند.",
 financeReviewPost:"ثبت در دفتر مالی",financeReviewCancel:"ادامه ویرایش",
 financeReviewIssue:"بررسی صدور بل",financeReviewIssueInfo:"صدور بل آن را ثابت می‌سازد، اما پولی دریافت نمی‌کند.",
 financeReviewVoid:"بررسی ابطال بل",financeReviewVoidInfo:"فقط بل بدون پرداخت و سابقۀ مالی باطل می‌شود؛ تاریخچه محفوظ است.",
 financeReviewReverse:"بررسی برگشت مالی",financeReviewReverseInfo:"برگشت اصلاح دستی حسابداری است و پول را از بانک پس نمی‌فرستد.",
 financeReviewIssueConfirm:"مریض، مبلغ، اسناد خدمت انجام‌شده و بل را بررسی کردم.",
 financeReviewReverseConfirm:"ثبت اصلی و دلیل برگشت را بررسی کرده‌ام.",
 financeReviewFinal:"تأیید و ادامه",financeInvoiceDraft:"بل پیش‌نویس است و هنوز صادر نشده",
 financeAmountPreview:"مبلغ تخمینی (قیمت نهایی توسط سرور بررسی می‌شود)",
 financeEstimateWarning:"مبلغ نمایشی بر اساس قیمت فعلی خدمات است؛ سرور قیمت نهایی را با اسناد تداوی محاسبه می‌کند.",
 financeInvalid:"خدمات، تعداد و تخفیف هر ردیف را بررسی کنید.",
 financeBadDate:"زمان پرداخت معتبر به وقت افغانستان (UTC+04:30) در یک سال اخیر وارد کنید.",
 financeDateZone:"وقت افغانستان (UTC+04:30)",financePreviewBalance:"باقی‌مانده بعد از ثبت",
 financePaymentMethod:"جزئیات پرداخت دستی",financeNoOnline:"حوالۀ بانکی تأییدنشده را به نام تأیید بانک ثبت نکنید.",
 financeReceiptReversed:"این پرداخت در دفتر مالی برگشت شده؛ رسید فقط برای بررسی محفوظ است.",
 financePatientLimit:"صورت‌حساب تا ۱۵۰ بل اخیر و ۲۰۰ ثبت مالی را نشان می‌دهد. جمع‌ها محدود به همان بل‌های دریافت‌شده هستند.",
 financeHistoryLimit:"تاریخچه تا ۱۰۰ رویداد بل و ۲۰۰ ثبت مالی را نشان می‌دهد.",
 financeResultLimit:"جستجو فقط در آخرین ۴۰۰ بل انجام می‌شود؛ این شمار کل تاریخ نیست.",
 financeExportWarning:"CSV شامل معلومات مالی و مریض است؛ فقط در دستگاه امن کلینیک ذخیره کنید.",
 financeNoChanges:"تا پیش از تأیید، ثبت مالی صورت نمی‌گیرد.",
 financeDueDate:"سررسید پرداخت",financeUpdate:"تازه‌سازی سوابق مالی",
 financeStatus:"حالت بل",financePost:"ثبت دستی",financeBack:"بازگشت به بخش مالی",financeReviewPayment:"بررسی پرداخت",financeReviewEntry:"بررسی ثبت مالی"
 },
 "ps-AF":{
 finance:"مالي چارې",expenses:"لګښتونه",tag:"د کلینیک پورونه · لاسي ورکړې · د حساب کتاب تاریخ",
 overview:"لنډیز",invoices:"بیلونه",payments:"تادیې",balances:"پاتې پورونه",patientBilling:"د ناروغ حساب",
 statement:"حسابپاڼه",invoice:"بیل",receipt:"رسید",newInvoice:"نوی بیل",
 recordPayment:"تادیه ثبت کړئ",createDraft:"مسوده جوړول",draft:"مسوده",issued:"صادر شوی",
 partially_paid:"یوه برخه ورکړل شوې",paid:"ورکړل شوی",overdue:"وخت تېر شوی",void:"باطل",all:"ټول",
 outstanding:"پاتې پیسې",todayReceipts:"د نن ورځې خالص ترلاسه شوې",monthCollections:"د میاشتې خالص ترلاسه شوې",
 overdueTotal:"ناوخته پورونه",openCount:"پرانستي بیلونه",search:"بیل یا ناروغ ولټوئ",
 patient:"ناروغ",patientSearch:"ناروغ ولټوئ",selectPatient:"ناروغ غوره کړئ",
 amount:"مبلغ",total:"ټول",paidAmount:"ورکړل شوي",balance:"پاتې",method:"د تادیې ډول",
 source:"بشپړه شوې درملنه",selectSource:"بشپړه معاینه یا پړاو غوره کړئ",
 evidence:"بیل یوازې د ترسره شوې درملنې لپاره دی؛ پلان په خپله بیل نه دی.",
 service:"خدمت",quantity:"شمېر",discount:"تخفیف (افغانۍ)",price:"د واحد بیه",
 lineTotal:"ټول لګښت",addLine:"خدمت زیات کړئ",remove:"لرې کړئ",dueDate:"وروستۍ نېټه (میلادي)",
 note:"داخلي یادښت",noteOptional:"اختیاري یادښت",revision:"نسخه",
 save:"بدلونونه خوندي کړئ",issue:"بیل صادر کړئ",confirmIssue:"دا بیل له ثابتو بیو سره صادر شي؟",
 confirmVoid:"نه ورکړل شوی بیل باطل شي؟ تاریخ یې پاتې کېږي.",
 voidReason:"د باطلولو دلیل (لږ تر لږه ۱۰ توري)",editDraft:"مسوده بدله کړئ",
 create:"جوړ کړئ",cancel:"بندول",loading:"مالي ریکارډونه بارېږي…",retry:"بیا هڅه",
 error:"کړنه ناکامه شوه؛ د فورم معلومات ساتل شوي.",success:"کړنه بریالۍ شوه",
 noData:"هیڅ ریکارډ نشته.",back:"مالي پاڼې ته ستنېدل",openInvoice:"بیل پرانیستل",
 viewStatement:"د ناروغ حسابپاڼه",sourceAppointment:"بشپړه لیدنه",
 sourceEncounter:"لاسلیک شوې معاینه",sourceStage:"بشپړ پړاو",
 sourcesEmpty:"د دې ناروغ د بیل وړ بشپړه درملنه ونه موندل شوه.",needPatient:"لومړی ناروغ غوره کړئ.",
 currency:"افغانۍ",recent:"وروستي حسابونه",date:"نېټه",status:"حالت",invoicesCount:"بیلونه",
 viewAll:"ټول بیلونه",next:"بل",previous:"مخکېنی",page:"پاڼه",current:"اوسنی",
 age1:"۱–۳۰ ورځې",age2:"۳۱–۶۰ ورځې",age3:"۶۱+ ورځې",
 aging:"د پورونو موده",downloadCsv:"CSV فایل",action:"عمل",
 payment:"تادیه",reversal:"بېرته ګرځول",credit:"اعتبار",addCredit:"اعتبار ورکړئ",
 creditReason:"د اعتبار دلیل",creditNotice:"اعتبار پور کموي خو نقدي ترلاسه نه ده.",
 reverse:"ثبت بېرته ګرځول",reverseReason:"د بېرته ګرځولو دلیل",
 reverseWarning:"دا یوازې د حساب سمون دی، اتومات پیسې نه لېږدوي.",
 confirmReverse:"د تادیې جبراني ثبت وکړئ؟",confirmCredit:"اعتبار وکارول شي؟",
 reference:"د حوالې شمېره",referenceOptional:"حواله (اختیاري)",recordedBy:"ثبت کوونکی",
 paymentDate:"د تادیې نېټه",manualBank:"لاسي بانکي حواله (تایید نه ده)",
 cash:"نغدې",bank_transfer:"بانکي حواله",other_manual:"نور لاسي",
 confirmationPayment:"دا لاسي تادیه ثبت شي؟",issueDate:"صادر شوی",
 cannotPay:"یوازې صادر شوی بیل چې پور ولري تادیه منلی شي.",
 receiptNumber:"د رسید شمېره",reversed:"بېرته شوی",recorded:"ثبت شوی",
 print:"چاپ",printInvoice:"بیل چاپ",printReceipt:"رسید چاپ",
 patientOnly:"دا د کلینیک شخصي حساب دی؛ د ناروغ په اپ کې نه ښکاري.",
 unverified:"لاسي ثبت؛ بانکي تایید نه دی.",issuedNotPaid:"د بیل صادرېدل د پیسو تادیه نه ده.",
 invoiceLines:"د بیل برخې",ledger:"د حساب تاریخ",history:"د بدلون تاریخ",
 noTransactions:"مالي فعالیت نشته",newPatientInvoice:"ناروغ ته نوی بیل",
 patientTotal:"ټول بیلونه",patientPaid:"ټولې تادیې",patientBalance:"پاتې پور",
 invoiceHistory:"د ناروغ بیلونه",patientPayments:"د ناروغ تادیې",
 patientStatement:"د ناروغ حسابپاڼه",filter:"چاڼ",noInvoice:"بیل نشته.",
 selectStatus:"حالت غوره کړئ",stage:"پړاو",consultation:"معاینه",
 ownerOnly:"یوازې خاوند یا مدیر بدلول او بېرته کولای شي.",
 clinicianHidden:"کلینیکي یادښتونه او تشخیصونه په مالي ریکارډ کې نشته.",
 tax:"مالیه",taxNote:"مالیه نه ده ټاکل شوې؛ اتومات نه زیاتېږي.",
 range:"موده",notReady:"لګښتونه په ۱۱ پړاو کې راځي.",noAuto:"اتومات پیسې نه اخیستل کېږي.",
 zero:"۰",summary:"لنډیز",done:"ترسره شو",invoiceCreated:"د بیل مسوده جوړه شوه",
 toInvoice:"بیل پرانیستل",unverifiedBank:"لاسي بانکي ثبت؛ له بانک سره یې وګورئ.",
 noCharge:"بشپړه درملنه په خپله بیل نه جوړوي.",refresh:"تازه کول",
 statementDate:"د حساب نېټه",download:"CSV واخلئ",receiptStatus:"حالت",
 manual:"لاسي",amountDue:"پاتې مبلغ",invoiceSummary:"د بیل لنډیز",
 authorization:"اجازه",cardLabel:"کلینیک مالي",cashMovement:"خالص نغدي حرکت",
 attention:"پاملرنه غواړي",reason:"دلیل",emptyPatient:"ناروغ نه دی غوره شوی.",
 paidRecords:"ثبت شوې تادیې",invoiceState:"د بیل حالت",clinic:"کلینیک",
 failed:"مالي معلومات نشته",
 financeWorkspace:"مالي کاري برخه",financeIntro:"صادر شوي بیلونه، مجاز لاسي تادیې او پاتې پورونه د کلینیک له رښتینو ریکارډونو وڅارئ.",
 financeSnapshot:"اوسنی مالي حالت",financeManual:"لاسي دفتر • افغانۍ • بې آنلاین تادیې",
 financeQuick:"مالي چارې",financeQuickHint:"په کلینیک کې پاتې شئ او اړینه برخه پرانیزئ.",
 financeReceivables:"پاتې بیلونه وګورئ",financeOpenLedger:"ثبت شوې تادیې وګورئ",
 financeNewInvoice:"د بیل مسوده جوړه کړئ",financeExpense:"د کلینیک لګښتونه وګورئ",
 financeSummaryHint:"ترلاسه شوې پیسې لاسي ثبت شوي او د بېرته اړولو څخه خالص دي؛ اعتبار نقدي نه دی.",
 financeToday:"نن د کابل په وخت",financeLimited:"دا رښتیني لاسي مالي ریکارډونه دي، نه تایید شوې بانکي حسابپاڼه.",
 financeNoInvoices:"له ثبت شوې بشپړې درملنې وروسته لومړنۍ مسوده جوړه کړئ.",
 financeApprovals:"مالي صلاحیتونه",financePermissions:"خاوند او مدیر اعتبار، بېرته اړول او باطلول تاییدوي. صندوق‌دار لاسي تادیه ثبتوي.",
 financeCounts:"بار شوي بیلونه",financeTotalHint:"پلټنه او چاڼ یوازې د وروستیو ۴۰۰ بیلونو په منځ کې کېږي.",
 financeResult:"ښودل",financeOf:"له",financeClear:"چاڼ پاک کړئ",financeReview:"د راکړې ورکړې کتنه",
 financeReviewTitle:"تر ثبت مخکې لاسي تادیه وڅېړئ",financeReviewCredit:"تر ثبت مخکې لاسي اعتبار وڅېړئ",
 financeReviewHelp:"ناروغ، بیل، اندازه او تادیه له بهرني سند سره پرتله کړئ.",
 financeReviewConfirm:"دا ثبت مې کتلې او پوهېږم چې د کلینیک حساب بدلوي.",
 financeReviewPost:"حساب ته ثبتول",financeReviewCancel:"بېرته سمول",
 financeReviewIssue:"د بیل صادرولو کتنه",financeReviewIssueInfo:"د بیل صادرول سند ثابتوي، خو پیسې نه اخلي.",
 financeReviewVoid:"د بیل باطلولو کتنه",financeReviewVoidInfo:"یوازې بې تادیې او بې دفتر تاریخ بیل باطلېږي؛ سابقه پاتې ده.",
 financeReviewReverse:"د حساب بېرته اړولو کتنه",financeReviewReverseInfo:"دا لاسي حسابداري سمون دی، بانکي پیسې نه بېرته استوي.",
 financeReviewIssueConfirm:"ناروغ، بیه، بشپړې شوې درملنې اسناد او بیل مې کتلي.",
 financeReviewReverseConfirm:"اصلي ثبت او د بېرته اړولو دلیل مې کتلې.",
 financeReviewFinal:"تایید او دوام",financeInvoiceDraft:"بیل مسوده ده، لا صادر شوی نه دی",
 financeAmountPreview:"اټکلي اندازه (وروستۍ بیه سرور تاییدوي)",
 financeEstimateWarning:"ښودل شوې بیه د اوسني خدمت له کتالوګه ده؛ سرور د ترسره شوې درملنې له مخې بیه ټاکي.",
 financeInvalid:"د هر خدمت نوم، شمېر او تخفیف وګورئ.",
 financeBadDate:"د افغانستان وخت (UTC+04:30) کې د تېر کال سمه نېټه وټاکئ.",
 financeDateZone:"د افغانستان وخت (UTC+04:30)",financePreviewBalance:"له ثبت وروسته پاتې پور",
 financePaymentMethod:"د لاسي تادیې جزئیات",financeNoOnline:"بې تایید بانکي حواله د بانک له خوا تادیه شوې مه ګڼئ.",
 financeReceiptReversed:"دا تادیه بېرته اړول شوې؛ رسید یوازې د پلټنې لپاره ساتل شوی.",
 financePatientLimit:"دا حسابپاڼه تر ۱۵۰ وروستي بیلونه او ۲۰۰ مالي ثبتونه ښيي؛ جمع یوازې د همدې بیلونو ده.",
 financeHistoryLimit:"تاریخچه تر ۱۰۰ بیل پېښې او ۲۰۰ مالي ثبتونه ښيي.",
 financeResultLimit:"پلټنه یوازې د وروستیو ۴۰۰ بیلونو ده، ټول تاریخ نه دی.",
 financeExportWarning:"CSV شخصي او مالي معلومات لري؛ یوازې د کلینیک په خوندي وسیله یې وساتئ.",
 financeNoChanges:"تر تایید وړاندې هیڅ مالي ثبت نه کېږي.",
 financeDueDate:"د ورکړې نېټه",financeUpdate:"مالي ریکارډونه تازه کړئ",
 financeStatus:"د بیل حالت",financePost:"په لاس ثبت شوی",financeBack:"مالي برخې ته ستنېدل",financeReviewPayment:"د تادیې کتنه",financeReviewEntry:"د ثبت کتنه"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang:Lang=locale==="fa-AF"||locale==="ps-AF"||locale==="en"?locale:"en";
 const t=(key:string)=>L[lang][key]||L.en[key]||key;
 const money=(value:number)=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(value||0);
 const date=(value:unknown)=>{if(!value)return "—";try{
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",year:"numeric",month:"short",day:"numeric"})
   .format(new Date(String(value)));}
   catch{return String(value).slice(0,10);}};
 return {t,date,money,lang};
}
async function api(path:string,method="GET",body?:unknown,signal?:AbortSignal):Promise<any>{
 const res=await fetch(API+"/v1/billing"+path,{method,credentials:"include",cache:"no-store",signal,
  headers:body===undefined?{}:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Object.assign(new Error(data.code||"BILLING_UNAVAILABLE"),{status:res.status});
 return data;
}
function useLoad(path:string|null){
 // Tenant and invoice path isolation prevents a previous patient's financial
 // data from remaining visible during a new request, even for one render.
 const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>({
  path:null,data:null,error:""
 });
 const [seq,setSeq]=useState(0);
 const refresh=()=>setSeq(x=>x+1);
 useEffect(()=>{
  if(!path){setSnapshot({path:null,data:null,error:""});return;}
  const controller=new AbortController();
  setSnapshot({path,data:null,error:""});
  api(path,"GET",undefined,controller.signal)
   .then(x=>{if(!controller.signal.aborted)setSnapshot({path,data:x,error:""});})
   .catch(e=>{if(!controller.signal.aborted)setSnapshot({
    path,data:null,error:e instanceof Error?e.message:"NETWORK_ERROR"
   });});
  return()=>controller.abort();
 },[path,seq]);
 return {data:snapshot.path===path?snapshot.data:null,
  error:snapshot.path===path?snapshot.error:"",refresh};
}
const b=(clinicId:string)=>"/clinics/"+clinicId;
const financeHref=(clinicId:string,tab?:string)=>"/clinic/finance?clinic="+encodeURIComponent(clinicId)+(tab?"&tab="+encodeURIComponent(tab):"");
const invoiceHref=(clinicId:string,id:string)=>"/clinic/finance/invoices/"+id+"?clinic="+encodeURIComponent(clinicId);
const receiptHref=(clinicId:string,id:string)=>"/clinic/finance/payments/"+id+"/receipt?clinic="+encodeURIComponent(clinicId);
const billHref=(clinicId:string,id:string)=>"/clinic/patients/"+id+"/billing?clinic="+encodeURIComponent(clinicId);
function Alert({children,kind="info"}:{children:ReactNode;kind?:"info"|"warning"|"error"|"success"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Busy(){const {t}=useWords();return <ClinicLoadingState
 className="card phase10-busy" label={t("loading")} variant="cards"/>;}
function Failure({code,retry}:{code:string;retry?:()=>void}){
 const {t,error:describe}=useClinicFeedback();
 return <ClinicFailureState className="card phase10-error" title={t("failed")}
  message={describe(code)} onRetry={retry} retryLabel={t("retry")}/>;
}
function Badge({status}:{status:string}){
 const {t}=useWords();return <span className={"phase10-badge status-"+status}>{t(status)}</span>;
}
function Title({title,desc,action}:{title:string;desc?:string;action?:ReactNode}){
 return <div className="phase10-title"><div><h2>{title}</h2>{desc&&<p>{desc}</p>}</div>{action}</div>;
}
function Money({amount,className=""}:{amount:number;className?:string}){
 const {money}=useWords();return <span className={className} dir="ltr">{money(amount)} AFN</span>;
}
function TableEmpty({text}:{text?:string}){const {t}=useWords();return <div className="phase10-empty" role="status">{text||t("noData")}</div>;}
function Pager({page,next,setPage}:{page:number;next:boolean;setPage:(x:number)=>void}){
 const {t}=useWords();return <div className="phase10-pager">
  <button className="btn btn-secondary" type="button" disabled={page<=1} onClick={()=>setPage(page-1)}>{t("previous")}</button>
  <span>{t("page")} {page}</span>
  <button className="btn btn-secondary" type="button" disabled={!next} onClick={()=>setPage(page+1)}>{t("next")}</button>
 </div>;
}
function InvoiceRows({rows,space}:{rows:Invoice[];space:Space}){
 const {t,date}=useWords();
 return <div className="phase10-table-scroll"><table className="phase10-table"><thead><tr>
  <th>{t("invoice")}</th><th>{t("patient")}</th><th>{t("date")}</th><th>{t("total")}</th>
  <th>{t("paidAmount")}</th><th>{t("balance")}</th><th>{t("status")}</th><th>{t("action")}</th>
 </tr></thead><tbody>{rows.map(i=><tr key={i.id}>
  <td><strong dir="ltr">{i.label}</strong></td>
  <td><a href={billHref(space.clinicId,i.patientId)}>{i.patientName||i.patientNumber||"—"}</a></td>
  <td>{date(i.issuedAt||i.createdAt)}</td><td><Money amount={i.totalAfn}/></td>
  <td><Money amount={i.paidAfn}/></td><td><Money amount={i.balanceAfn} className="phase10-balance"/></td>
  <td><Badge status={i.status}/></td>
  <td><a className="phase10-inline-link" href={invoiceHref(space.clinicId,i.id)}>{t("openInvoice")} →</a></td>
 </tr>)}</tbody></table></div>;
}
export function FinancePortal({view}:{view:"home"|"invoice"|"receipt"|"patient"}){
 const {t}=useWords();const [ctx,setCtx]=useState<Context|null>(null),[error,setError]=useState("");
 const [selected,setSelected]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
  setSelected(new URLSearchParams(location.search).get("clinic"));
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"})
   .then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.code||"AUTH_REQUIRED");
    setCtx(x);}).catch(e=>setError(e.message));
 },[]);
 if(error)return <Failure code={error} retry={()=>location.reload()}/>;
 if(!ctx||selected===undefined)return <Busy/>;
 const space=selected?ctx.clinics.find(x=>x.clinicId===selected):ctx.clinics[0];
 if(!space||!["owner","manager","cashier","receptionist"].includes(space.role))
  return <Failure code="BILLING_ROLE_DENIED"/>;
 const segments=location.pathname.split("/").filter(Boolean),i=segments.indexOf("patients"),
  pid=i>=0?segments[i+1]||"":"";
 const invIndex=segments.indexOf("invoices"),entryIndex=segments.indexOf("payments");
 const invoiceId=invIndex>=0?segments[invIndex+1]||"":"";
 const paymentId=entryIndex>=0?segments[entryIndex+1]||"":"";
 return <Shell ctx={ctx} space={space} active={view==="patient"?"patients":"finance"}>
  <div className="phase10-workspace clinic-phase12-workspace">
   <header className="phase10-header clinic-phase12-page-header"><div><span className="phase10-eyebrow">DANDANLINK / {space.clinicName} / {t("cardLabel")}</span>
    <h1>{view==="patient"?t("patientBilling"):view==="receipt"?t("receipt"):view==="invoice"?t("invoice"):t("financeWorkspace")}</h1>
    <p>{view==="home"?t("financeIntro"):t("tag")}</p></div>
    <div className="phase10-head-actions">
     <a className="btn btn-secondary" href={financeHref(space.clinicId)}>{t("finance")} ↗</a>
     {view==="patient"&&<a className="btn btn-secondary" href={"/clinic/patients/"+pid+"?clinic="+encodeURIComponent(space.clinicId)}>
      {t("patient")} ↗</a>}
    </div></header>
   {view==="home"?<FinanceHome space={space}/>:
    view==="invoice"?<InvoiceDetail space={space} id={invoiceId}/>:
    view==="receipt"?<Receipt space={space} id={paymentId}/>:
    <PatientBilling space={space} patientId={pid}/>}
   <p className="phase10-footer clinic-phase12-footer">
    <CareIcon name="shield-check" size={16}/>
    {t("clinicianHidden")} · {t("patientOnly")} · {t("noAuto")}</p>
  </div>
 </Shell>;
}
function FinanceHome({space}:{space:Space}){
 const {t}=useWords();
 const canOverview=["owner","manager","cashier"].includes(space.role);
 const [tab,setTab]=useState<ClinicFinanceTab>(()=>{
  return clinicFinanceTab(new URLSearchParams(location.search).get("tab"),canOverview);
 });
 function go(next:string){
  const target=clinicFinanceTab(next,canOverview);
  setTab(target);
  history.replaceState(null,"",financeHref(space.clinicId,target));
 }
 useEffect(()=>{
  // Role and clinic selection must not retain a prior tenant's workspace tab.
  setTab(clinicFinanceTab(new URLSearchParams(location.search).get("tab"),canOverview));
 },[space.clinicId,canOverview]);
 const allowed:ClinicFinanceTab[]=canOverview?
  ["overview","invoices","payments","balances","expenses"]:["invoices"];
 const icons={overview:"layout-dashboard",invoices:"receipt",payments:"credit-card",
  balances:"chart-columns",expenses:"receipt"} as const;
 return <div className="phase10-stack clinic-phase12-finance-home">
  <section className="card clinic-phase12-hero">
   <div className="clinic-phase12-hero-copy">
    <span className="clinic-phase12-eyebrow">
     <CareIcon name="shield-check" size={16}/>{t("financeManual")}
    </span>
    <h2>{t("financeSnapshot")}</h2>
    <p>{t("financeLimited")}</p>
   </div>
   <div className="clinic-phase12-hero-trust">
    <CareIcon name="clipboard" size={25}/>
    <span>{t("financePermissions")}</span>
   </div>
  </section>
  <div className="clinic-phase12-subnav-wrap">
   <nav className="phase10-tabs clinic-phase12-tabs" role="tablist" aria-label={t("finance")}>
    {allowed.map(x=><button type="button" key={x} role="tab" aria-selected={tab===x}
     aria-controls="clinic-phase12-finance-panel"
     onClick={()=>go(x)}>
     <CareIcon name={x==="expenses"?"receipt":icons[x]} size={17}/>
     {t(x)}</button>)}
   </nav>
  </div>
  <div id="clinic-phase12-finance-panel" role="tabpanel" aria-label={t(tab)} className="clinic-phase12-tab-content">
   {tab==="overview"&&canOverview?<Overview space={space} go={go}/>:
    tab==="payments"&&canOverview?<Payments space={space}/>:
    tab==="balances"&&canOverview?<Balances space={space}/>:
    tab==="expenses"&&canOverview?<ExpensePanel space={space}/>:
    <Invoices space={space}/>}
  </div>
 </div>;
}
function Overview({space,go}:{space:Space;go:(x:string)=>void}){
 const {t,date}=useWords();
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/overview");
 if(error)return <Failure code={error} retry={refresh}/>;
 if(!data)return <Busy/>;
 const s=data.summary;
 return <div className="phase10-stack clinic-phase12-overview">
  <div className="clinic-phase12-overview-intro">
   <div><span className="clinic-phase12-kicker">{t("financeToday")}</span>
    <h2>{t("overview")}</h2><p>{t("financeSummaryHint")}</p></div>
   <button type="button" className="btn btn-secondary" onClick={refresh}>
    <CareIcon name="activity" size={16}/>{t("financeUpdate")}</button>
  </div>
  <div className="phase10-kpis clinic-phase12-kpis">
   {(["todayReceipts","outstanding","overdueTotal","monthCollections"] as const).map((key,index)=>{
    const value=[s.today_receipts,s.outstanding,s.overdue,s.month_collections][index];
    const goto=index===2?"balances":index===1?"invoices":"payments";
    return <button className="card phase10-kpi" type="button" key={key} onClick={()=>go(goto)}>
     <span className="phase10-kpi-icon" aria-hidden="true">
      <CareIcon name={(["activity","receipt","clock","chart-columns"] as const)[index]} size={22}/>
     </span>
     <span>{t(key)}</span><strong><Money amount={value}/></strong><small>{t("viewAll")} →</small>
    </button>;
   })}
  </div>
  <section className="card phase10-panel clinic-phase12-quick">
   <Title title={t("financeQuick")} desc={t("financeQuickHint")}/>
   <div className="clinic-phase12-quick-grid">
    {([
      ["invoices","financeNewInvoice","receipt"],
      ["payments","financeOpenLedger","credit-card"],
      ["balances","financeReceivables","chart-columns"],
      ["expenses","financeExpense","clipboard"]
     ] as const).map(([target,label,icon])=><button type="button" key={target}
      className="clinic-phase12-quick-action" onClick={()=>go(target)}>
      <span className="clinic-phase12-quick-icon"><CareIcon name={icon} size={21}/></span>
      <strong>{t(label)}</strong>
      <CareIcon name="arrow" size={16}/>
     </button>)}
   </div>
  </section>
  <div className="phase10-grid clinic-phase12-overview-grid">
   <section className="card phase10-panel">
    <Title title={t("recent")} desc={t("financeSummaryHint")}
     action={<button className="btn btn-secondary" onClick={()=>go("payments")}>{t("viewAll")} →</button>}/>
    {!data.recent.length?<TableEmpty/>:<div className="phase10-recent-list">
     {data.recent.map((e:any)=><div className="phase10-recent" key={e.id}>
      <span className={"phase10-recent-icon "+e.kind}>
       <CareIcon name={e.kind==="reversal"?"arrow":e.kind==="credit"?"receipt":"activity"} size={19}/>
      </span>
      <div><strong>{t(e.kind)}</strong><p>{e.patient_name} · {date(e.occurred_at)}</p></div>
      <Money amount={clinicFinancialNet(e.kind,e.amount_afn)}/>
     </div>)}</div>}
   </section>
   <aside className="card phase10-panel phase10-guidance">
    <span className="phase10-kicker">{t("attention")}</span>
    <h2>{s.open_count} {t("openCount")}</h2>
    <p>{t("issuedNotPaid")}</p><p>{t("taxNote")}</p>
    <p className="clinic-phase12-clarification">{t("financeLimited")}</p>
    <button className="btn btn-primary" onClick={()=>go("balances")}>{t("aging")} →</button>
    <button className="btn btn-secondary" onClick={()=>go("expenses")}>{t("expenses")} →</button>
   </aside>
  </div>
  <CashFlowInsights space={space}/>
  <div className="card clinic-phase12-permission-banner">
   <CareIcon name="shield-check" size={19}/>
   <div><strong>{t("financeApprovals")}</strong><p>{t("financePermissions")}</p></div>
  </div>
 </div>;
}
function Invoices({space,patientId}:{space:Space;patientId?:string}){
 const {t}=useWords();const [create,setCreate]=useState(false),
  [filter,setFilter]=useState("all"),[text,setText]=useState(""),[search,setSearch]=useState(""),
  [page,setPage]=useState(1);
 useEffect(()=>{
  setCreate(false);setFilter("all");setText("");setSearch("");setPage(1);
 },[space.clinicId,patientId]);
 const qs=new URLSearchParams({status:filter,q:search,page:String(page),
  ...(patientId?{patientId}:{})});
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/invoices?"+qs);
 return <div className="phase10-stack">
  <section className="card phase10-panel">
   <Title title={patientId?t("invoiceHistory"):t("invoices")}
    desc={t("financeTotalHint")}
    action={<button className="btn btn-primary clinic-phase12-invoice-create" type="button"
      onClick={()=>setCreate(x=>!x)}>
     <CareIcon name={create?"close":"plus"} size={17}/>
     {create?t("cancel"):t("newInvoice")}</button>}/>
   {create?<InvoiceEditor space={space} defaultPatient={patientId}
    onCancel={()=>setCreate(false)} onSaved={id=>location.assign(invoiceHref(space.clinicId,id))}/>:<>
    <div className="phase10-toolbar clinic-phase12-invoice-toolbar">
     <div className="phase10-filter-chips" aria-label={t("selectStatus")}>{["all","draft","issued","partially_paid","paid","overdue","void"].map(x=>
      <button key={x} aria-pressed={filter===x} type="button"
       onClick={()=>{setFilter(x);setPage(1);}}>{t(x)}</button>)}</div>
     <form className="phase10-search" onSubmit={e=>{e.preventDefault();setSearch(text);setPage(1);}}>
      <input type="search" autoComplete="off" maxLength={100} aria-label={t("search")}
       placeholder={t("search")} value={text} onChange={e=>setText(e.target.value)}/>
      <button type="submit" className="btn btn-secondary">
       <CareIcon name="search" size={16}/>{t("search")}</button>
     </form>
     {(filter!=="all"||search)&&<button type="button" className="btn btn-secondary"
      onClick={()=>{setFilter("all");setSearch("");setText("");setPage(1);}}>
      <CareIcon name="close" size={15}/>{t("financeClear")}</button>}
     <button type="button" className="btn btn-secondary" onClick={refresh}>
      <CareIcon name="activity" size={15}/>{t("refresh")}</button>
    </div>
    {error?<Failure code={error} retry={refresh}/>:!data?<Busy/>:
     !data.invoices.length?<div className="clinic-phase12-empty">
      <CareIcon name="file" size={27}/>
      <p>{search||filter!=="all"?t("noData"):t("financeNoInvoices")}</p>
      {(filter!=="all"||search)&&<button type="button" className="btn btn-secondary"
       onClick={()=>{setFilter("all");setSearch("");setText("");setPage(1);}}>
       {t("financeClear")}</button>}
     </div>:<>
      <div className="clinic-phase12-results-bar">
       <strong>{t("financeResult")} {(page-1)*15+1}–{(page-1)*15+data.invoices.length}
        {" "}{t("financeOf")} {data.total}</strong>
       <span>{t("financeResultLimit")}</span>
      </div>
      <InvoiceRows rows={data.invoices} space={space}/>
      <Pager page={page} next={data.hasMore} setPage={setPage}/>
     </>}
   </>}
  </section>
 </div>;
}
function InvoiceEditor({space,defaultPatient,original,onCancel,onSaved}:{space:Space;
 defaultPatient?:string;original?:Detail;onCancel:()=>void;onSaved:(id:string)=>void}){
 const {t,money,date}=useWords();
 const [patientSearch,setPatientSearch]=useState(""),[patientQuery,setPatientQuery]=useState(""),
 [patientId,setPatientId]=useState(defaultPatient||original?.invoice.patientId||"");
 const patients=useLoad(original?null:b(space.clinicId)+"/patients?q="+encodeURIComponent(patientQuery));
 const sources=useLoad(patientId&&!original?b(space.clinicId)+"/patients/"+patientId+"/sources":null);
 const catalog=useLoad(b(space.clinicId)+"/catalog");
 const [sourceId,setSourceId]=useState(original?.invoice.sourceId||"");
 const [sourceType,setSourceType]=useState(original?.invoice.sourceType||"appointment");
 const [items,setItems]=useState<{serviceId:string;quantity:number;discountAfn:number}[]>(original?
  original.items.map(x=>({serviceId:x.serviceId,quantity:x.quantity,discountAfn:x.discountAfn})):
  [{serviceId:"",quantity:1,discountAfn:0}]);
 const [dueDate,setDueDate]=useState(original?.invoice.dueDate||""),
  [note,setNote]=useState(original?.note||""),[error,setError]=useState(""),
  [busy,setBusy]=useState(false);
 const selectedSource=sources.data?.sources?.find((x:Source)=>x.id===sourceId) as Source|undefined;
 const available=(catalog.data?.services||[] as Service[]).filter((s:Service)=>
  original?original.items.some(x=>x.serviceId===s.id):selectedSource?.serviceIds.includes(s.id));
 const priceOf=(id:string)=>{
  const originalUnit=original?.items.find(v=>v.serviceId===id)?.unitPriceAfn;
  if(originalUnit!==undefined)return originalUnit;
  return (catalog.data?.services||[] as Service[]).find((svc:Service)=>svc.id===id)?.base_price_afn;
 };
 const canDiscount=["owner","manager"].includes(space.role);
 const lineIssue=clinicInvoiceLineIssue(items,priceOf,canDiscount);
 const total=items.reduce((sum,x)=>{
  const unit=priceOf(x.serviceId)||0;
  return sum+unit*x.quantity-x.discountAfn;
 },0);
 function changeItem(index:number,key:string,value:any){
  setItems(prev=>prev.map((item,i)=>i===index?{...item,[key]:value}:item));
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;
  if(lineIssue||!catalog.data||!patientId||(!original&&!sourceId)||
   total<=0||total>2000000000){
   setError(lineIssue||"INVALID_INVOICE_LINES");return;
  }
  setBusy(true);setError("");
  try{
   const payload={items, dueDate:dueDate||null,note:note||null};
   const r=original?await api(b(space.clinicId)+"/invoices/"+original.invoice.id,"PUT",
     {...payload,revision:original.invoice.revision}):
    await api(b(space.clinicId)+"/invoices","POST",{...payload,patientId,sourceType,sourceId});
   onSaved(r.id||original!.invoice.id);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="phase10-editor">
  <Alert kind="info">{t("evidence")} {t("taxNote")}</Alert>
  <div className="clinic-phase12-editor-notice">
   <CareIcon name="shield-check" size={18}/>
   <span>{t("financeEstimateWarning")} {t("noCharge")}</span>
  </div>
  {!original&&<>
   {!defaultPatient&&<label className="phase10-field"><span>{t("patientSearch")}</span>
    <div className="phase10-field-search"><input aria-label={t("patientSearch")} value={patientSearch}
     onChange={e=>setPatientSearch(e.target.value)} maxLength={100}/>
     <button className="btn btn-secondary" type="button" onClick={()=>setPatientQuery(patientSearch)}>{t("search")}</button></div></label>}
   {!defaultPatient&&<label className="phase10-field"><span>{t("selectPatient")} *</span>
    <select required value={patientId} onChange={e=>{setPatientId(e.target.value);setSourceId("");
      setItems([{serviceId:"",quantity:1,discountAfn:0}]);}}>
     <option value="">{t("selectPatient")}</option>
     {(patients.data?.patients||[]).map((p:Patient)=>
      <option key={p.id} value={p.id}>{p.patient_number} · {p.preferred_name} {p.family_name||""}</option>)}
    </select></label>}
   {patientId&&<div className="phase10-stack">
    {sources.error?<Failure code={sources.error} retry={sources.refresh}/>:
     !sources.data?<Busy/>:!sources.data.sources.length?<Alert kind="warning">{t("sourcesEmpty")}</Alert>:
      <label className="phase10-field"><span>{t("source")} *</span>
       <select required value={sourceId} onChange={e=>{const src:Source|undefined=sources.data.sources.find((x:Source)=>x.id===e.target.value);
        setSourceId(src?.id||"");setSourceType(src?.type||"appointment");
        setItems([{serviceId:"",quantity:1,discountAfn:0}]);}}>
        <option value="">{t("selectSource")}</option>
        {(sources.data?.sources||[]).map((s:Source)=><option key={s.id} value={s.id}>
         {t(s.type==="appointment"?"sourceAppointment":s.type==="encounter"?"sourceEncounter":"sourceStage")}
          · {date(s.date)} · {s.id.slice(0,8)}</option>)}</select></label>}
   </div>}
  </>}
  <div className="phase10-section-title"><h3>{t("invoiceLines")}</h3>
   <button className="btn btn-secondary" type="button" disabled={items.length>=20}
    onClick={()=>setItems(x=>[...x,{serviceId:"",quantity:1,discountAfn:0}])}>+ {t("addLine")}</button></div>
  <div className="phase10-line-list">{items.map((x,index)=>{
   const svc=(catalog.data?.services||[] as Service[]).find((s:Service)=>s.id===x.serviceId);
   const originalLine=original?.items.find(v=>v.serviceId===x.serviceId);
   const unit=originalLine?.unitPriceAfn??svc?.base_price_afn??0;
   return <div className="phase10-line-edit" key={index}>
    <label className="phase10-field"><span>{t("service")}</span><select required value={x.serviceId}
     disabled={busy} onChange={e=>changeItem(index,"serviceId",e.target.value)}>
     <option value="">{t("service")}</option>
     {available.map((s:Service)=><option key={s.id} value={s.id}>{s.name} · {money(s.base_price_afn)} AFN</option>)}
     {originalLine&&!available.some((s:Service)=>s.id===x.serviceId)&&<option value={x.serviceId}>{originalLine.name}</option>}
    </select></label>
    <label className="phase10-field"><span>{t("quantity")}</span>
     <input type="number" required min={1} max={20} step={1} value={x.quantity}
      disabled={busy} onChange={e=>changeItem(index,"quantity",Number(e.target.value))}/></label>
    <label className="phase10-field"><span>{t("discount")}</span>
     <input type="number" min={0} max={Math.min(10000000,Math.floor(unit*x.quantity*0.3))}
      step={1} disabled={!canDiscount||busy} value={x.discountAfn}
      onChange={e=>changeItem(index,"discountAfn",Number(e.target.value))}/></label>
    <div className="phase10-line-value">{t("lineTotal")}<strong>
     <Money amount={Math.max(0,unit*x.quantity-x.discountAfn)}/></strong></div>
    {items.length>1&&<button className="phase10-remove" type="button" disabled={busy}
     onClick={()=>setItems(x=>x.filter((_,i)=>i!==index))}>{t("remove")}</button>}
   </div>;
  })}</div>
  {lineIssue&&<Alert kind="warning">{t("financeInvalid")} ({lineIssue})</Alert>}
  <div className="phase10-quote-total clinic-phase12-draft-preview">
   <span>{t("financeAmountPreview")}</span>
   <strong><Money amount={Math.max(0,total)}/></strong>
  </div>
  <div className="phase10-form-grid">
   <label className="phase10-field"><span>{t("dueDate")}</span>
    <input type="date" value={dueDate} disabled={busy}
     onChange={e=>setDueDate(e.target.value)}/></label>
   <label className="phase10-field phase10-wide"><span>{t("noteOptional")}</span>
    <textarea rows={2} maxLength={1000} value={note} disabled={busy}
     onChange={e=>setNote(e.target.value)}/></label>
  </div>
  {error&&<Failure code={error}/>}
  <div className="phase10-actions">
   <button type="submit" className="btn btn-primary"
    disabled={busy||Boolean(lineIssue)||total<=0||total>2000000000||
     !patientId||(!original&&!sourceId)||!catalog.data}>
    <CareIcon name="check" size={16}/>{busy?t("loading"):t(original?"save":"createDraft")}</button>
   <button className="btn btn-secondary" disabled={busy}
    type="button" onClick={onCancel}>{t("cancel")}</button>
  </div>
 </form>;
}
function Payments({space}:{space:Space}){
 const {t,date}=useWords();const [kind,setKind]=useState("all"),[page,setPage]=useState(1);
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/payments?"+new URLSearchParams({
  kind,page:String(page)}));
 function exportPage(){
  if(!data?.entries?.length)return;
  const head=["date","invoice","kind","method","amount_afn","reference","entered_by"];
  const rows=data.entries.map((e:any)=>[e.occurred_at,e.invoice_number,e.kind,e.method,e.amount_afn,
   e.reference||"",e.actor_name||""]);
  const csv=[head,...rows].map((v:(string|number)[])=>v.map((x:string|number)=>'"'+String(x??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="clinic-ledger-page-"+page+".csv";a.click();URL.revokeObjectURL(url);
 }
 return <section className="card phase10-panel">
  <Title title={t("payments")} desc={t("reverseWarning")} action={<button type="button"
   className="btn btn-secondary" disabled={!data?.entries?.length} onClick={exportPage}>{t("downloadCsv")}</button>}/>
  <div className="phase10-filter-chips">{["all","payment","reversal","credit"].map(x=>
   <button type="button" aria-pressed={kind===x} key={x} onClick={()=>{setKind(x);setPage(1);}}>{t(x)}</button>)}</div>
  {error?<Failure code={error} retry={refresh}/>:!data?<Busy/>:!data.entries.length?<TableEmpty/>:<>
   <div className="phase10-table-scroll"><table className="phase10-table"><thead><tr>
    <th>{t("date")}</th><th>{t("invoice")}</th><th>{t("patient")}</th><th>{t("method")}</th>
    <th>{t("amount")}</th><th>{t("status")}</th><th>{t("recordedBy")}</th><th>{t("action")}</th>
   </tr></thead><tbody>{data.entries.map((e:any)=><tr key={e.id}>
    <td>{date(e.occurred_at)}</td><td><a href={invoiceHref(space.clinicId,e.invoice_id)}>
     {"INV-"+String(e.invoice_number).padStart(6,"0")}</a></td>
    <td>{e.patient_name}</td><td>{t(e.method)}</td>
    <td><Money amount={(e.kind==="reversal"?-1:1)*e.amount_afn}/></td>
    <td><Badge status={e.kind}/></td><td>{e.actor_name}</td>
    <td>{e.kind==="payment"?<a className="phase10-inline-link"
      href={receiptHref(space.clinicId,e.id)}>{t("receipt")}</a>:"—"}</td>
   </tr>)}</tbody></table></div>
   <Pager page={page} next={data.hasMore} setPage={setPage}/>
  </>}
 </section>;
}
function Balances({space}:{space:Space}){
 const {t,date}=useWords();const [aging,setAging]=useState("all"),[page,setPage]=useState(1);
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/balances?"+new URLSearchParams({aging,page:String(page)}));
 const ages=["all","current","1-30","31-60","61+"],labels=["all","current","age1","age2","age3"];
 return <section className="card phase10-panel">
  <Title title={t("aging")} desc={t("outstanding")}/>
  <div className="phase10-filter-chips">{ages.map((x,i)=><button type="button" key={x}
   aria-pressed={aging===x} onClick={()=>{setAging(x);setPage(1);}}>{t(labels[i])}</button>)}</div>
  {error?<Failure code={error} retry={refresh}/>:!data?<Busy/>:!data.balances.length?<TableEmpty/>:<>
   <div className="phase10-table-scroll"><table className="phase10-table"><thead><tr>
    <th>{t("invoice")}</th><th>{t("patient")}</th><th>{t("dueDate")}</th>
    <th>{t("total")}</th><th>{t("paidAmount")}</th><th>{t("balance")}</th><th>{t("aging")}</th>
   </tr></thead><tbody>{data.balances.map((x:any)=><tr key={x.id}>
    <td><a href={invoiceHref(space.clinicId,x.id)}>{x.label}</a></td>
    <td><a href={billHref(space.clinicId,x.patientId)}>{x.patientName}</a></td>
    <td>{date(x.dueDate)}</td><td><Money amount={x.totalAfn}/></td>
    <td><Money amount={x.paidAfn}/></td><td><Money amount={x.balanceAfn}/></td>
    <td><Badge status={x.aging==="current"?"current":"overdue"}/></td>
   </tr>)}</tbody></table></div>
   <Pager page={page} next={data.hasMore} setPage={setPage}/>
  </>}
 </section>;
}
function PaymentForm({space,invoice,onRecorded,kind}:{space:Space;invoice:Invoice;
 onRecorded:()=>void;kind:"payment"|"credit"}){
 const {t,date}=useWords();
 const [amount,setAmount]=useState(""),[method,setMethod]=useState("cash"),
  [reference,setReference]=useState(""),[note,setNote]=useState(""),
  [occurredAt,setOccurredAt]=useState(()=>clinicKabulDateTimeInput()),
  [busy,setBusy]=useState(false),[error,setError]=useState(""),
  [actionKey,setActionKey]=useState(""),[review,setReview]=useState(false),
  [reviewed,setReviewed]=useState(false);
 const numeric=Number(amount);
 const validAmount=clinicCanEnterPayment(invoice.balanceAfn,numeric);
 const validReason=kind!=="credit"||note.trim().length>=10;
 const validReference=!reference.trim()||reference.trim().length>=2;
 let paymentIso:string|null=null;
 if(kind==="payment")try{paymentIso=clinicKabulInputToIso(occurredAt);}catch{/* Show typed error. */}
 const valid=validAmount&&validReason&&validReference&&
  (kind==="credit"||paymentIso!==null);
 const change=()=>{setActionKey("");setReview(false);setReviewed(false);setError("");};
 useEffect(()=>{
  if(!review)return;
  const onEscape=(event:KeyboardEvent)=>{
   if(event.key==="Escape"&&!busy){setReview(false);setReviewed(false);}
  };
  document.addEventListener("keydown",onEscape);
  return()=>document.removeEventListener("keydown",onEscape);
 },[review,busy]);
 function submit(e:FormEvent){
  e.preventDefault();if(busy||!valid)return;
  setError("");setReviewed(false);setReview(true);
 }
 async function post(){
  if(busy||!review||!reviewed||!valid)return;
  setBusy(true);setError("");
  const key=actionKey||crypto.randomUUID();setActionKey(key);
  try{
   await api(b(space.clinicId)+"/invoices/"+invoice.id+
    (kind==="payment"?"/payments":"/credits"),"POST",{
     actionKey:key,amountAfn:numeric,
     ...(kind==="payment"?{method,reference:reference.trim()||null,
      occurredAt:paymentIso,note:note.trim()||null}:{note:note.trim()})
   });
   setActionKey("");setReview(false);setReviewed(false);
   setAmount("");setReference("");setNote("");
   onRecorded();
  }catch(ex:any){
   // Keep the idempotency key on timeout/error: retry must not double-post.
   setError(ex instanceof Error?ex.message:"NETWORK_ERROR");
  }finally{setBusy(false);}
 }
 return <form className="phase10-payment-form clinic-phase12-payment-form" onSubmit={submit}>
  <Title title={t(kind==="payment"?"recordPayment":"addCredit")}
   desc={kind==="credit"?t("creditNotice"):t("unverified")}/>
  <div className="clinic-phase12-payment-context">
   <span><strong dir="ltr">{invoice.label}</strong> · {invoice.patientName||invoice.patientNumber||"—"}</span>
   <Badge status={invoice.status}/>
  </div>
  <div className="phase10-form-grid">
   <label className="phase10-field"><span>{t("amount")} (AFN) *</span>
    <input required min={1} max={invoice.balanceAfn} step={1} type="number"
     disabled={busy} value={amount}
     onChange={e=>{setAmount(e.target.value);change();}}/></label>
   {kind==="payment"&&<>
    <label className="phase10-field"><span>{t("method")}</span>
     <select disabled={busy} value={method} onChange={e=>{setMethod(e.target.value);change();}}>
      {["cash","bank_transfer","other_manual"].map(x=>
       <option key={x} value={x}>{t(x)}</option>)}</select></label>
    <label className="phase10-field"><span>{t("paymentDate")} · {t("financeDateZone")}</span>
     <input required type="datetime-local" disabled={busy} value={occurredAt}
      onChange={e=>{setOccurredAt(e.target.value);change();}}/></label>
    <label className="phase10-field"><span>{t("referenceOptional")}</span>
     <input maxLength={120} disabled={busy} value={reference}
      onChange={e=>{setReference(e.target.value);change();}}/></label>
   </>}
   <label className="phase10-field phase10-wide"><span>
    {t(kind==="credit"?"creditReason":"noteOptional")}</span>
    <textarea maxLength={500} minLength={kind==="credit"?10:undefined}
     required={kind==="credit"} disabled={busy}
     rows={2} value={note} onChange={e=>{setNote(e.target.value);change();}}/></label>
  </div>
  {kind==="payment"&&paymentIso===null&&<Alert kind="warning">{t("financeBadDate")}</Alert>}
  {method==="bank_transfer"&&kind==="payment"&&<Alert kind="warning">{t("unverifiedBank")}</Alert>}
  <div className="phase10-amount-preview clinic-phase12-balance-preview">
   <span>{t("balance")}</span><Money amount={invoice.balanceAfn}/>
   <span>→</span><strong><Money amount={Math.max(0,invoice.balanceAfn-(validAmount?numeric:0))}/></strong>
  </div>
  <p className="clinic-phase12-payment-disclaimer">{t("financeNoOnline")} {t("reverseWarning")}</p>
  {error&&<Failure code={error}/>}
  <button type="submit" className="btn btn-primary" disabled={busy||!valid}>
   <CareIcon name="shield-check" size={17}/>
   {busy?t("loading"):t(kind==="payment"?"financeReviewPayment":"financeReviewCredit")}</button>
  {review&&<div className="clinic-phase12-confirm-backdrop"
   onMouseDown={event=>{if(!busy&&event.currentTarget===event.target){
    setReview(false);setReviewed(false);
   }}}>
   <section className="clinic-phase12-confirm-dialog" role="alertdialog" aria-modal="true"
    aria-labelledby="clinic-phase12-payment-title">
    <div className="clinic-phase12-confirm-top">
     <span className="clinic-phase12-confirm-icon"><CareIcon name="shield-check" size={24}/></span>
     <button type="button" autoFocus className="clinic-phase12-confirm-close" disabled={busy}
      aria-label={t("cancel")} onClick={()=>{setReview(false);setReviewed(false);}}>
      <CareIcon name="close" size={20}/></button>
    </div>
    <h2 id="clinic-phase12-payment-title">
     {t(kind==="payment"?"financeReviewTitle":"financeReviewCredit")}</h2>
    <p className="clinic-phase12-confirm-hint">{t("financeReviewHelp")}</p>
    <dl className="clinic-phase12-confirm-facts">
     <div><dt>{t("clinic")}</dt><dd>{space.clinicName}</dd></div>
     <div><dt>{t("invoice")}</dt><dd><bdi dir="ltr">{invoice.label}</bdi></dd></div>
     <div><dt>{t("patient")}</dt><dd>{invoice.patientName||invoice.patientNumber||"—"}</dd></div>
     <div><dt>{t("amount")}</dt><dd><Money amount={numeric}/></dd></div>
     <div><dt>{t("financePreviewBalance")}</dt>
      <dd><Money amount={Math.max(0,invoice.balanceAfn-numeric)}/></dd></div>
     <div><dt>{t("method")}</dt><dd>
      {kind==="credit"?t("credit"):t(method)}</dd></div>
     {kind==="payment"&&<div><dt>{t("paymentDate")}</dt>
      <dd>{date(paymentIso)} · {t("financeDateZone")}</dd></div>}
     {reference.trim()&&kind==="payment"&&<div><dt>{t("reference")}</dt><dd>{reference}</dd></div>}
     {note.trim()&&<div><dt>{t(kind==="credit"?"creditReason":"note")}</dt><dd>{note}</dd></div>}
    </dl>
    <p className="clinic-phase12-confirm-warning">
     <CareIcon name="about" size={17}/>{t(kind==="credit"?"creditNotice":"unverified")}
     {" "}{t("financeNoOnline")}</p>
    <label className="clinic-phase12-confirm-check">
     <input type="checkbox" disabled={busy} checked={reviewed}
      onChange={e=>setReviewed(e.target.checked)}/>
     <span>{t("financeReviewConfirm")}</span>
    </label>
    {error&&<Failure code={error}/>}
    <div className="clinic-phase12-confirm-actions">
     <button type="button" className="btn btn-secondary" disabled={busy}
      onClick={()=>{setReview(false);setReviewed(false);}}>{t("financeReviewCancel")}</button>
     <button type="button" className="btn btn-primary" disabled={busy||!reviewed||!valid}
      onClick={()=>void post()}><CareIcon name="check" size={17}/>
      {busy?t("loading"):t("financeReviewPost")}</button>
    </div>
   </section>
  </div>}
 </form>;
}
function InvoiceDetail({space,id}:{space:Space;id:string}){
 const {t,date}=useWords(),{data,error,refresh}=useLoad(b(space.clinicId)+"/invoices/"+id);
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),
 [failure,setFailure]=useState(""),[success,setSuccess]=useState(""),
 [voidReason,setVoidReason]=useState(""),[reverseId,setReverseId]=useState(""),[reason,setReason]=useState("");
 async function perform(path:string,body:unknown,prompt?:string){
  if(prompt&&!confirm(prompt))return;setBusy(true);setFailure("");setSuccess("");
  try{await api(b(space.clinicId)+"/invoices/"+id+path,"POST",body);
   refresh();setSuccess(t("success"));setReverseId("");setReason("");}
  catch(e:any){setFailure(e.message);}finally{setBusy(false);}
 }
 async function reverse(){
  if(reason.trim().length<10||!reverseId||!confirm(t("confirmReverse")))return;
  setBusy(true);setFailure("");setSuccess("");
  try{await api(b(space.clinicId)+"/entries/"+reverseId+"/reverse","POST",
   {reason,actionKey:crypto.randomUUID()});refresh();setSuccess(t("success"));
   setReverseId("");setReason("");}
  catch(e:any){setFailure(e.message);}finally{setBusy(false);}
 }
 if(error)return <Failure code={error} retry={refresh}/>;
 if(!data)return <Busy/>;
 const detail=data as Detail,i=detail.invoice,owner=["owner","manager"].includes(space.role);
 const payments=detail.entries;
 return <div className="phase10-stack">
  <section className="card phase10-panel">
   <div className="phase10-invoice-heading">
    <div><a className="phase10-back" href={financeHref(space.clinicId,"invoices")}>← {t("back")}</a>
     <h2 dir="ltr">{i.label}</h2><p>{t("patient")}: <a href={billHref(space.clinicId,i.patientId)}>{i.patientName}</a>
       · {t("issueDate")}: {date(i.issuedAt)}</p></div>
    <div className="phase10-heading-controls"><Badge status={i.status}/>
     {i.documentStatus==="draft"&&<>
      <button className="btn btn-secondary" onClick={()=>setEditing(x=>!x)}>{t("editDraft")}</button>
      <button className="btn btn-primary" type="button" disabled={busy}
       onClick={()=>perform("/issue",{revision:i.revision},t("confirmIssue"))}>{t("issue")} →</button>
     </>}
     {i.documentStatus==="issued"&&<button className="btn btn-secondary" onClick={()=>window.print()}>{t("printInvoice")}</button>}
    </div>
   </div>
   <div className="phase10-summary-grid">
    <div><span>{t("total")}</span><strong><Money amount={i.totalAfn}/></strong></div>
    <div><span>{t("paidAmount")}</span><strong><Money amount={i.paidAfn}/></strong></div>
    <div className="phase10-due"><span>{t("amountDue")}</span><strong><Money amount={i.balanceAfn}/></strong></div>
    <div><span>{t("dueDate")}</span><strong>{date(i.dueDate)}</strong></div>
   </div>
  </section>
  {editing?<section className="card phase10-panel">
   <Title title={t("editDraft")}/>
   <InvoiceEditor space={space} original={detail} onCancel={()=>setEditing(false)}
    onSaved={()=>{setEditing(false);refresh();}}/>
  </section>:<>
   <section className="card phase10-panel phase10-printable" id="phase10-invoice-print">
    <div className="phase10-print-head">
     <strong>{space.clinicName}</strong><span>{t("invoice")} · <bdi dir="ltr">{i.label}</bdi></span>
    </div>
    <Title title={t("invoiceLines")} desc={t("issuedNotPaid")}/>
    <div className="phase10-table-scroll"><table className="phase10-table">
     <thead><tr><th>{t("service")}</th><th>{t("quantity")}</th><th>{t("price")}</th>
      <th>{t("discount")}</th><th>{t("lineTotal")}</th></tr></thead>
     <tbody>{detail.items.map((x,index)=><tr key={index}><td>{x.name}</td>
      <td>{x.quantity}</td><td><Money amount={x.unitPriceAfn}/></td>
      <td><Money amount={x.discountAfn}/></td>
      <td><strong><Money amount={x.totalAfn}/></strong></td></tr>)}</tbody></table></div>
    <div className="phase10-quote-total"><span>{t("total")}</span>
     <strong><Money amount={i.totalAfn}/></strong></div>
    <p className="phase10-print-note">{t("issuedNotPaid")} · {t("patientOnly")}</p>
   </section>
   {i.documentStatus==="issued"&&i.balanceAfn>0&&<div className="phase10-payment-grid">
    {["owner","manager","cashier"].includes(space.role)&&<section className="card phase10-panel">
     <PaymentForm key={"payment-"+i.revision+"-"+i.paidAfn} space={space} invoice={i}
      kind="payment" onRecorded={refresh}/></section>}
    {owner&&<section className="card phase10-panel">
     <PaymentForm key={"credit-"+i.revision+"-"+i.paidAfn} space={space} invoice={i}
      kind="credit" onRecorded={refresh}/></section>}
   </div>}
   <section className="card phase10-panel">
    <Title title={t("ledger")} desc={t("reverseWarning")}/>
    {!payments.length?<TableEmpty/>:<div className="phase10-ledger-list">{payments.map(e=>{
     const isReversed=payments.some(x=>x.reversesEntryId===e.id);
     return <div key={e.id} className="phase10-ledger-row">
      <span className={"phase10-ledger-icon kind-"+e.kind} aria-hidden="true">{e.kind==="reversal"?"↩":"◈"}</span>
      <div className="phase10-ledger-content"><strong>{t(e.kind)} · {t(e.method)}</strong>
       <p>{date(e.occurredAt)} · {e.actorName||t("recorded")}{e.reference?" · "+e.reference:""}</p>
       {e.note&&<p>{e.note}</p>}</div>
      <div className="phase10-ledger-tail"><strong><Money amount={(e.kind==="reversal"?-1:1)*(e.amountAfn||0)}/></strong>
       <div className="phase10-ledger-links">
        {e.kind==="payment"&&<a href={receiptHref(space.clinicId,e.id)}>{t("receipt")} ↗</a>}
        {isReversed&&<Badge status="reversed"/>}
        {owner&&!isReversed&&e.kind!=="reversal"&&i.documentStatus==="issued"&&
         <button type="button" className="phase10-text-btn" onClick={()=>{setReverseId(e.id);setReason("");}}>
          {t("reverse")}</button>}
       </div></div>
     </div>;
    })}</div>}
    {reverseId&&<div className="phase10-reverse-panel">
     <Alert kind="warning">{t("reverseWarning")}</Alert>
     <label className="phase10-field"><span>{t("reverseReason")} *</span>
      <textarea minLength={10} maxLength={500} rows={2} value={reason} onChange={e=>setReason(e.target.value)}/></label>
     <div className="phase10-actions"><button className="btn btn-primary" type="button" disabled={busy||reason.trim().length<10}
      onClick={reverse}>{t("reverse")}</button><button className="btn btn-secondary"
      onClick={()=>setReverseId("")}>{t("cancel")}</button></div></div>}
   </section>
   <section className="card phase10-panel">
    <Title title={t("history")}/>
    <div className="phase10-events">{detail.events.map((x:any,index)=><div key={index}>
     <span className="phase10-event-dot" aria-hidden="true"/><div>
     <strong>{t(x.action)} · {t("revision")} {x.version}</strong>
     <p>{date(x.created_at)} · {x.actor_name}</p>{x.reason&&<p>{x.reason}</p>}</div></div>)}</div>
   </section>
   {owner&&i.documentStatus==="issued"&&!payments.length&&<section className="card phase10-panel phase10-danger">
    <Title title={t("void")} desc={t("confirmVoid")}/>
    <label className="phase10-field"><span>{t("voidReason")} *</span>
     <textarea rows={2} minLength={10} maxLength={500} value={voidReason}
      onChange={e=>setVoidReason(e.target.value)}/></label>
    <button className="btn btn-secondary" type="button" disabled={busy||voidReason.trim().length<10}
     onClick={()=>perform("/void",{revision:i.revision,reason:voidReason},t("confirmVoid"))}>{t("void")}</button>
   </section>}
  </>}
  {failure&&<Failure code={failure}/>}
  {success&&<Alert kind="success">{success}</Alert>}
 </div>;
}
function PatientBilling({space,patientId}:{space:Space;patientId:string}){
 const {t,date}=useWords();const [tab,setTab]=useState("invoices");
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/patients/"+patientId+"/statement");
 const [showNew,setShowNew]=useState(false);
 if(error)return <Failure code={error} retry={refresh}/>;
 if(!data)return <Busy/>;
 const inv=data.invoices as Invoice[],entries=data.entries as Entry[],totals=data.summary;
 return <div className="phase10-stack">
  <div className="card phase10-patient-banner">
   <div className="phase10-patient-avatar">◈</div><div>
    <span className="phase10-kicker">{t("patient")}</span><h2>{data.patient.name}</h2>
    <span dir="ltr">{data.patient.number}</span></div>
   <button className="btn btn-primary" onClick={()=>setShowNew(x=>!x)}>
    {showNew?t("cancel"):"+ "+t("newPatientInvoice")}</button>
  </div>
  <div className="phase10-summary-grid">
   <div><span>{t("patientTotal")}</span><strong><Money amount={totals.totalInvoicedAfn}/></strong></div>
   <div><span>{t("patientPaid")}</span><strong><Money amount={totals.totalPaidAfn}/></strong></div>
   <div className="phase10-due"><span>{t("patientBalance")}</span><strong><Money amount={totals.outstandingAfn}/></strong></div>
  </div>
  {showNew&&<section className="card phase10-panel"><Title title={t("newPatientInvoice")}/>
   <InvoiceEditor space={space} defaultPatient={patientId}
    onCancel={()=>setShowNew(false)} onSaved={id=>location.assign(invoiceHref(space.clinicId,id))}/>
  </section>}
  <nav className="phase10-tabs" role="tablist" aria-label={t("patientBilling")}>
   {(["invoices","payments","statement"] as const).map(x=><button key={x} type="button"
    role="tab" aria-selected={tab===x} onClick={()=>setTab(x)}>{t(x)}</button>)}</nav>
  <section className="card phase10-panel">
   <Title title={t(tab==="invoices"?"invoiceHistory":tab==="payments"?"patientPayments":"patientStatement")}
    action={<button type="button" className="btn btn-secondary" onClick={refresh}>{t("refresh")} ↻</button>}/>
   {tab==="invoices"?!inv.length?<TableEmpty text={t("noTransactions")}/>:<InvoiceRows rows={inv} space={space}/>:
    tab==="payments"?!entries.length?<TableEmpty text={t("noTransactions")}/>:
    <div className="phase10-table-scroll"><table className="phase10-table"><thead><tr>
     <th>{t("date")}</th><th>{t("invoice")}</th><th>{t("method")}</th><th>{t("amount")}</th>
     <th>{t("status")}</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}>
      <td>{date(e.occurred_at)}</td><td><a href={invoiceHref(space.clinicId,e.invoice_id||"")}>
       {"INV-"+String(e.invoice_number).padStart(6,"0")}</a></td>
      <td>{t(e.method)}</td><td><Money amount={(e.kind==="reversal"?-1:1)*(e.amount_afn||0)}/></td>
      <td><Badge status={e.kind}/></td></tr>)}</tbody></table></div>:
    <div className="phase10-statement">
     <div className="phase10-statement-head"><strong>{data.patient.name}</strong>
      <span>{t("statementDate")}: {date(new Date())}</span></div>
     {inv.filter(i=>i.documentStatus==="issued").map(i=><div key={i.id} className="phase10-statement-row">
      <a href={invoiceHref(space.clinicId,i.id)}>{i.label}</a><span>{date(i.issuedAt)}</span>
      <Money amount={i.totalAfn}/><Money amount={i.paidAfn}/><strong><Money amount={i.balanceAfn}/></strong>
     </div>)}
     <div className="phase10-quote-total"><span>{t("outstanding")}</span>
      <strong><Money amount={totals.outstandingAfn}/></strong></div>
    </div>}
  </section>
  <Alert kind="info">{t("patientOnly")} {t("issuedNotPaid")}</Alert>
 </div>;
}
function Receipt({space,id}:{space:Space;id:string}){
 const {t,date}=useWords();
 const {data,error,refresh}=useLoad(b(space.clinicId)+"/payments/"+id+"/receipt");
 if(error)return <Failure code={error} retry={refresh}/>;
 if(!data)return <Busy/>;
 const r=data.receipt;
 return <div className="phase10-stack">
  <div className="phase10-head-actions phase10-no-print"><button type="button" className="btn btn-primary"
   onClick={()=>window.print()}>{t("printReceipt")}</button>
   <a className="btn btn-secondary" href={financeHref(space.clinicId,"payments")}>{t("back")}</a>
  </div>
  <article className="card phase10-receipt-paper phase10-printable" aria-label={t("receipt")}>
   <header><span className="phase10-kicker">DANDANLINK / {t("receipt")}</span>
    <h2>{r.clinicName}</h2><p>{t("receiptNumber")}: <bdi dir="ltr">{r.number}</bdi></p></header>
   <div className="phase10-receipt-amount"><span>{t("amount")}</span>
    <strong><Money amount={r.amountAfn}/></strong><Badge status={r.reversed?"reversed":"recorded"}/></div>
   <dl className="phase10-receipt-facts">
    <div><dt>{t("invoice")}</dt><dd>{r.invoiceNumber}</dd></div>
    <div><dt>{t("patient")}</dt><dd>{r.patientName} · {r.patientNumber}</dd></div>
    <div><dt>{t("method")}</dt><dd>{t(r.method)}</dd></div>
    <div><dt>{t("paymentDate")}</dt><dd>{date(r.occurredAt)}</dd></div>
    <div><dt>{t("recordedBy")}</dt><dd>{r.enteredBy}</dd></div>
    {r.reference&&<div><dt>{t("reference")}</dt><dd>{r.reference}</dd></div>}
    {r.note&&<div><dt>{t("note")}</dt><dd>{r.note}</dd></div>}
   </dl>
   <p className="phase10-receipt-footer">{t("unverified")}<br/>{t("patientOnly")}
    {r.reversed&&<><br/><strong>{t("reversed")}</strong></>}</p>
  </article>
 </div>;
}
