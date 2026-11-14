"use client";
import React,{useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {InlineAlert,usePreferences} from "./index";

type Role="owner"|"manager"|"cashier"|"receptionist"|"dentist"|"assistant";
type Space={clinicId:string;clinicName:string;role:Role};
type Lang="en"|"fa-AF"|"ps-AF";
type Expense={id:string;label:string;number:number;revision:number;status:string;
 date:string;category:string;description:string;amountAfn:number;paymentMethod:string;
 reference:string|null;attribution:string|null;receiptId:string|null;
 voidReason:string|null;actorName:string;createdAt:string;updatedAt:string};
type History={id:string;version:number;action:string;expense_date:string;category:string;
 description:string;amount_afn:number;payment_method:string;reference:string|null;
 attribution:string|null;receipt_id:string|null;correction_reason:string|null;
 actor_name:string;created_at:string};
type Detail={expense:Expense;history:History[]};
type Input={date:string;category:string;description:string;amountAfn:string;
 paymentMethod:string;reference:string;attribution:string};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const ROOT="/v1/expenses/clinics/";
const CAT=["rent","salary","supplies","utilities","other"];
const METHODS=["cash","bank_transfer","other_manual"];
const T:Record<Lang,Record<string,string>>={
 en:{
 expenses:"Expenses",intro:"Record and reconcile operational expenses without changing patient bills.",
 addExpense:"Add expense",close:"Close",save:"Record expense",edit:"Correct expense",
 cancel:"Cancel",description:"Description",category:"Category",date:"Expense date (Gregorian)",
 amount:"Amount (AFN)",method:"Payment method",reference:"Reference (optional)",
 attribution:"Source / attribution (optional)",receipt:"Receipt attachment (optional)",
 receiptHint:"PDF, PNG or JPEG · up to 1 MB · private to authorized finance staff",
 replaceReceipt:"Replace receipt",removeReceipt:"Remove current receipt association",
 downloadReceipt:"Download receipt",invalidReceipt:"Receipt must be PDF, PNG or JPEG (maximum 1 MB).",
 reason:"Reason for correction",reasonTip:"Required. Explain why the original record changed (10–500 characters).",
 correct:"Save new version", void:"Void expense",voidReason:"Reason for voiding",
 confirmVoid:"Void this expense? Historical versions and receipts will be preserved.",
 confirmSave:"Record this operational expense?",confirmEdit:"Save corrected version with a permanent audit record?",
 noRows:"No expenses match this period and filters.",loading:"Loading expense records…",
 error:"This operation could not be completed. The form remains available.",
 retry:"Retry",recorded:"Expense recorded",updated:"Expense corrected",voided:"Expense voided",
 posted:"Posted",created:"Created",corrected:"Corrected",status:"Status",
 all:"All", search:"Search description, reference or expense number", searchButton:"Search",
 period:"Reporting period",from:"From",to:"To",filter:"Filter",reset:"Reset",
 paymentMethod:"Payment method",cash:"Cash",bank_transfer:"Bank transfer",
 other_manual:"Other manual",rent:"Rent",salary:"Salary",supplies:"Supplies",utilities:"Utilities",
 other:"Other",recordedBy:"Recorded by",receiptNone:"No receipt attached",
 actions:"Actions",view:"View details",history:"Version and correction history",
 audit:"All versions are retained. Corrections never silently overwrite posted evidence.",
 current:"Current record",amountAfn:"Amount",amountWarning:"Expense amount must be positive.",
 receiptPrivate:"Receipts remain private to authorized clinic finance staff.",
 referenceNote:"Manual bank transfers are not verified by the banking system.",
 downloadCsv:"Export this page (CSV)",next:"Next",previous:"Previous",
 page:"Page",emptyDetail:"Select an expense to inspect its history.",
 unauthorized:"You are not authorized to view operational expense records.",
 noChange:"Void expenses cannot be corrected.", name:"Expense",version:"Version",
 ownerOnly:"Only owners and managers may void an expense.",
 totalExpenses:"Recorded expenses",netCollections:"Net recorded collections",
 netAfter:"Collections minus expenses",expenseCount:"Expense entries",
 cashNote:"Cash-flow comparison only. Not accounting profit or taxable income.",
 periodNote:"Amounts represent manually recorded payments and operational costs for the selected dates; receivables and outstanding bills are separate.",
 categoryBreakdown:"Expense categories",noBreakdown:"No expenses in the selected reporting period.",
 noProfit:"Not profit",report:"Operating cash flow",reportDesc:"Compare collection activity to operational expenses for the chosen period.",
 expensesNotCharges:"Expenses do not reduce or modify patient invoice balances.",
 netPositive:"Above recorded costs",netNegative:"Below recorded costs",
 apply:"Apply dates",updatedAt:"Last updated",source:"Source",keepReceipt:"Keep current receipt",
 receiptOld:"Original attachment is preserved in history even when disassociated.",
 recent:"Recent",summary:"Summary",voidedNote:"Voided costs are excluded from current reporting totals.",
 paymentNote:"All payment methods are entered manually; validate supporting bank statements separately.",
 time:"Recorded at", reasonLabel:"Reason",categoryForOwners:"Category totals available to clinic owners/managers",
 fileError:"Could not load the private receipt.",private:"Private clinic finance",
 inputError:"Enter all required fields.",confirm:"Confirm",exportScope:"Export includes only the current filtered page.",
 none:"—",auth:"Private authenticated download",active:"Active"
 },
 "fa-AF":{
 expenses:"مصارف",intro:"ثبت و بررسی مصارف عملیاتی کلینیک بدون تغییر در بل‌های مریضان.",
 addExpense:"ثبت مصرف",close:"بستن",save:"ثبت مصرف",edit:"اصلاح مصرف",
 cancel:"انصراف",description:"شرح مصرف",category:"کتگوری",date:"تاریخ مصرف (میلادی)",
 amount:"مبلغ (افغانی)",method:"روش پرداخت",reference:"شماره مرجع (اختیاری)",
 attribution:"منبع / انتساب (اختیاری)",receipt:"سند پرداخت (اختیاری)",
 receiptHint:"PDF، PNG یا JPEG · حداکثر ۱ مگابایت · خصوصی برای مسئولان مالی",
 replaceReceipt:"تبدیل سند",removeReceipt:"قطع ارتباط سند فعلی",
 downloadReceipt:"دریافت سند",invalidReceipt:"سند باید PDF، PNG یا JPEG و زیر ۱ مگابایت باشد.",
 reason:"دلیل اصلاح",reasonTip:"دلیل تغییر سند قبلی الزامی است (۱۰ تا ۵۰۰ حرف).",
 correct:"ذخیره نسخه جدید",void:"باطل‌سازی مصرف",voidReason:"دلیل باطل‌سازی",
 confirmVoid:"مصرف باطل شود؟ نسخه‌های قبلی و اسناد محفوظ می‌ماند.",
 confirmSave:"این مصرف عملیاتی ثبت شود؟",confirmEdit:"نسخه اصلاح‌شده با تاریخچه دائمی ذخیره شود؟",
 noRows:"در این دوره مصرف مطابق یافت نشد.",loading:"در حال دریافت مصارف…",
 error:"عملیات ناکام شد؛ معلومات فورم حفظ شده است.",
 retry:"تلاش دوباره",recorded:"مصرف ثبت شد",updated:"مصرف اصلاح شد",voided:"مصرف باطل شد",
 posted:"ثبت‌شده",created:"ایجاد",corrected:"اصلاح‌شده",status:"حالت",
 all:"همه",search:"جستجوی شرح، مرجع یا شماره مصرف",searchButton:"جستجو",
 period:"دوره گزارش",from:"از تاریخ",to:"تا تاریخ",filter:"فیلتر",reset:"پاک‌سازی",
 paymentMethod:"روش پرداخت",cash:"نقدی",bank_transfer:"حواله بانکی",
 other_manual:"روش دیگر دستی",rent:"کرایه",salary:"معاشات",supplies:"لوازم",
 utilities:"خدمات عامه",other:"سایر",recordedBy:"ثبت توسط",
 receiptNone:"سند ضمیمه نیست",actions:"عملیات",view:"جزئیات",
 history:"تاریخچه نسخه‌ها و اصلاحات",
 audit:"تمام نسخه‌ها محفوظ می‌ماند؛ اصلاحات بدون تاریخچه تغییر نمی‌کند.",
 current:"سند فعلی",amountAfn:"مبلغ",amountWarning:"مبلغ مصرف باید مثبت باشد.",
 receiptPrivate:"اسناد برای کارمندان مجاز مالی خصوصی است.",
 referenceNote:"حواله بانکی دستی توسط سیستم بانکی تأیید نشده.",
 downloadCsv:"دریافت CSV صفحه",next:"بعدی",previous:"قبلی",
 page:"صفحه",emptyDetail:"برای مشاهده تاریخچه یک مصرف انتخاب کنید.",
 unauthorized:"اجازه دیدن مصارف کلینیک را ندارید.",noChange:"مصرف باطل‌شده اصلاح نمی‌شود.",
 name:"مصرف",version:"نسخه",ownerOnly:"فقط مالک و مدیر مصرف را باطل می‌کنند.",
 totalExpenses:"مجموع مصارف",netCollections:"دریافت‌های خالص ثبت‌شده",
 netAfter:"دریافت منهای مصارف",expenseCount:"تعداد مصارف",
 cashNote:"این فقط مقایسه جریان نقدی است، نه مفاد حسابداری یا درآمد قابل مالیه.",
 periodNote:"مبلغ‌های این دوره براساس پرداخت‌های دستی و مصارف ثبت‌شده اند؛ طلبات مریضان جدا است.",
 categoryBreakdown:"تفکیک کتگوری‌ها",noBreakdown:"در این دوره مصرفی ثبت نشده.",
 noProfit:"مفاد نیست",report:"جریان نقدی عملیاتی",
 reportDesc:"مقایسه دریافت و مصارف کلینیک در دوره انتخاب‌شده.",
 expensesNotCharges:"مصارف هیچ تغییری در باقی‌مانده بل مریض نمی‌آورند.",
 netPositive:"بیشتر از مصارف",netNegative:"کمتر از مصارف",
 apply:"تطبیق تاریخ",updatedAt:"آخرین تغییر",source:"منبع",
 keepReceipt:"سند فعلی حفظ شود",receiptOld:"سند اصلی در تاریخچه محفوظ می‌ماند.",
 recent:"اخیر",summary:"خلاصه",voidedNote:"مصارف باطل‌شده در مجموع فعلی شامل نیست.",
 paymentNote:"پرداخت‌ها دستی ثبت می‌شوند؛ صورت‌حساب بانک را جدا بررسی کنید.",
 time:"زمان ثبت",reasonLabel:"دلیل",categoryForOwners:"جمع کتگوری‌ها برای مالک و مدیر قابل نمایش است.",
 fileError:"دریافت سند خصوصی ناکام شد.",private:"مالی خصوصی کلینیک",
 inputError:"تمام خانه‌های ضروری را تکمیل کنید.",confirm:"تأیید",exportScope:"فقط صفحه فعلی صادر می‌شود.",
 none:"—",auth:"دریافت با تصدیق هویت",active:"فعال"
 },
 "ps-AF":{
 expenses:"لګښتونه",intro:"د کلینیک عملیاتي لګښتونه ثبت او وڅارئ؛ د ناروغانو بیلونه نه بدلېږي.",
 addExpense:"لګښت ثبت کړئ",close:"بندول",save:"لګښت ثبت کړئ",edit:"لګښت سمول",
 cancel:"لغوه",description:"د لګښت تشریح",category:"ډول",date:"د لګښت نېټه (میلادي)",
 amount:"مبلغ (افغانۍ)",method:"د ورکړې لاره",reference:"حواله (اختیاري)",
 attribution:"سرچینه / تړاو (اختیاري)",receipt:"رسید ضمیمه (اختیاري)",
 receiptHint:"PDF، PNG یا JPEG · تر ۱ MB · یوازې مالي کارکوونکو ته",
 replaceReceipt:"رسید بدل کړئ",removeReceipt:"اوسنی رسید بېل کړئ",
 downloadReceipt:"رسید واخلئ",invalidReceipt:"رسید باید PDF، PNG یا JPEG او تر ۱ MB وي.",
 reason:"د سمون دلیل",reasonTip:"د پخواني ریکارډ د بدلون دلیل ولیکئ (۱۰–۵۰۰ توري).",
 correct:"نوې نسخه خوندي کړئ",void:"لګښت باطلول",voidReason:"د باطلولو دلیل",
 confirmVoid:"لګښت باطل شي؟ پخوانۍ نسخې او رسیدونه خوندي پاتې کېږي.",
 confirmSave:"دا لګښت ثبت شي؟",confirmEdit:"سمه شوې نسخه د تاریخ سره خوندي شي؟",
 noRows:"د دې مودې لګښت نه دی موندل شوی.",loading:"لګښتونه بارېږي…",
 error:"کړنه ناکامه شوه؛ د فورم معلومات خوندي دي.",
 retry:"بیا هڅه",recorded:"لګښت ثبت شو",updated:"لګښت سم شو",voided:"لګښت باطل شو",
 posted:"ثبت شوی",created:"جوړ شوی",corrected:"سم شوی",status:"حالت",
 all:"ټول",search:"تشریح، حواله یا شمېره ولټوئ",searchButton:"پلټل",
 period:"د راپور موده",from:"له نېټې",to:"تر نېټې",filter:"چاڼ",reset:"پاکول",
 paymentMethod:"د ورکړې لاره",cash:"نغدې",bank_transfer:"بانکي حواله",
 other_manual:"نور لاسي",rent:"کرایه",salary:"معاشونه",supplies:"توکي",
 utilities:"اسانتیاوې",other:"نور",recordedBy:"ثبت کوونکی",
 receiptNone:"رسید نشته",actions:"کړنې",view:"جزییات",
 history:"د نسخو او سمون تاریخ",
 audit:"ټولې نسخې ساتل کېږي؛ سمون پخوانی ریکارډ نه له منځه وړي.",
 current:"اوسنی ریکارډ",amountAfn:"مبلغ",amountWarning:"د لګښت مبلغ باید مثبت وي.",
 receiptPrivate:"رسیدونه یوازې مجازو مالي کارکوونکو ته ښکاري.",
 referenceNote:"لاسي بانکي حواله په بانک کې نه ده تایید شوې.",
 downloadCsv:"د پاڼې CSV واخلئ",next:"بل",previous:"مخکېنی",
 page:"پاڼه",emptyDetail:"د تاریخ لیدو لپاره یو لګښت غوره کړئ.",
 unauthorized:"د کلینیک د لګښتونو کتلو اجازه نشته.",
 noChange:"باطل شوی لګښت نه بدلېږي.",name:"لګښت",version:"نسخه",
 ownerOnly:"یوازې خاوند او مدیر لګښت باطلولای شي.",
 totalExpenses:"ټول لګښتونه",netCollections:"ثبت شوې خالص پیسې",
 netAfter:"تر لګښتونو وروسته راټولې شوې",expenseCount:"د لګښتونو شمېر",
 cashNote:"دا یوازې د نغدو بهیر پرتله ده؛ حسابي ګټه یا مالیاتي عاید نه دی.",
 periodNote:"دا مبلغونه له ثبت شویو لاسي تادیو او لګښتونو دي؛ د ناروغانو پورونه بېل دي.",
 categoryBreakdown:"د لګښت ډولونه",noBreakdown:"په دې موده کې لګښت نشته.",
 noProfit:"ګټه نه ده",report:"عملیاتي نغدي بهیر",
 reportDesc:"په ټاکل شوې موده کې راټولې شوې پیسې او لګښتونه پرتله کړئ.",
 expensesNotCharges:"لګښتونه د ناروغانو د بیل پاتې پیسې نه بدلوي.",
 netPositive:"له لګښتونو زیات",netNegative:"له لګښتونو کم",
 apply:"نېټې وکاروئ",updatedAt:"وروستی سمون",source:"سرچینه",
 keepReceipt:"اوسنی رسید وساتئ",receiptOld:"اصلي رسید په تاریخ کې ساتل کېږي.",
 recent:"وروستي",summary:"لنډیز",voidedNote:"باطل شوي لګښتونه په اوسني جمع کې نه حسابېږي.",
 paymentNote:"ټولې تادیې په لاس ثبت دي؛ بانکي اسناد جلا وګورئ.",
 time:"د ثبت وخت",reasonLabel:"دلیل",categoryForOwners:"د کټګوریو مجموعه خاوند او مدیر لیدلای شي.",
 fileError:"شخصي رسید ښکته نه شو.",private:"د کلینیک خصوصي مالي معلومات",
 inputError:"اړین معلومات ډک کړئ.",confirm:"تایید",exportScope:"یوازې همدا پاڼه صادرېږي.",
 none:"—",auth:"په ننوتلو خوندي کښته کول",active:"فعال"
 }
};
function useWords(){
 const {locale,calendar}=usePreferences();
 const lang:Lang=locale==="en"||locale==="fa-AF"||locale==="ps-AF"?locale:"en";
 const t=(x:string)=>T[lang][x]||T.en[x]||x;
 const money=(v:number)=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(v||0);
 const d=(s:unknown)=>{if(!s)return "—";try{
  return new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",
   calendar:calendar==="solar_hijri"?"persian":"gregory",
   day:"numeric",month:"short",year:"numeric"}).format(new Date(String(s)));
 }catch{return String(s).slice(0,10)}};
 return {t,money,d,lang};
}
function kabDay():string{
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join("-");
}
const base=(c:string)=>ROOT+c+"/expenses";
async function request(path:string,method="GET",body?:unknown){
 const r=await fetch(API+path,{method,credentials:"include",cache:"no-store",
 headers:body===undefined?{}:{"Content-Type":"application/json"},
 body:body===undefined?undefined:JSON.stringify(body)});
 const obj=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(obj.code||"EXPENSE_UNAVAILABLE");
 return obj;
}
function useLoad(path:string|null){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[v,setV]=useState(0);
 const refresh=()=>setV(x=>x+1);
 useEffect(()=>{let mounted=true;setData(null);setError("");
  if(path)request(path).then(x=>{if(mounted)setData(x)}).catch(e=>{if(mounted)setError(e.message)});
  return()=>{mounted=false};
 },[path,v]);return {data,error,refresh};
}
function Notice({children,kind="info"}:{children:ReactNode;kind?:"error"|"success"|"warning"|"info"}){
 return <InlineAlert kind={kind}>{children}</InlineAlert>;
}
function Loading(){const {t}=useWords();return <div className="card phase11-loading" role="status">
 <span className="phase05-spinner" aria-hidden="true"/>{t("loading")}</div>;}
function ErrorBox({message,retry}:{message:string;retry?:()=>void}){
 const {t}=useWords();return <div className="card phase11-error" role="alert">
  <strong>{t("error")}</strong><p>{message}</p>
  {retry&&<button className="btn btn-secondary" onClick={retry}>{t("retry")}</button>}
 </div>;
}
function Price({value}:{value:number}){const {money}=useWords();return <span className="phase11-money" dir="ltr">
 {money(value)} AFN</span>}
function Status({value}:{value:string}){const {t}=useWords();return <span className={"phase11-status "+value}>
 {t(value)}</span>}
const monthDefault=()=>kabDay().slice(0,7)+"-01";
type Filters={from:string;to:string;category:string;method:string;status:string;search:string};
const defaultFilters=():Filters=>({from:monthDefault(),to:kabDay(),category:"all",method:"all",
 status:"posted",search:""});
const defaultExpense=():Input=>({date:kabDay(),category:"rent",description:"",amountAfn:"",
 paymentMethod:"cash",reference:"",attribution:""});
async function attachment(file:File|null):Promise<null|{fileName:string;mimeType:string;contentBase64:string}>{
 if(!file)return null;
 if(file.size>1048576||file.size<8||
  !["application/pdf","image/jpeg","image/png"].includes(file.type))throw Error("INVALID_RECEIPT");
 const contentBase64=await new Promise<string>((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error("RECEIPT_READ_FAILED"));
  reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
  reader.readAsDataURL(file);
 });
 return {fileName:file.name,mimeType:file.type,contentBase64};
}
async function downloadReceipt(space:Space,expenseId:string,receiptId:string,fileName:string){
 const response=await fetch(API+base(space.clinicId)+"/"+expenseId+"/receipts/"+receiptId,
  {credentials:"include",cache:"no-store"});
 if(!response.ok)throw Error("RECEIPT_DOWNLOAD_FAILED");
 const blob=await response.blob(),url=URL.createObjectURL(blob),node=document.createElement("a");
 node.href=url;node.download=fileName;document.body.appendChild(node);node.click();node.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ExpenseEditor({space,original,onSaved,onCancel}:{space:Space;original?:Expense;
 onSaved:()=>void;onCancel:()=>void}){
 const {t}=useWords();
 const [form,setForm]=useState<Input>(original?{
  date:String(original.date).slice(0,10),category:original.category,description:original.description,
  amountAfn:String(original.amountAfn),paymentMethod:original.paymentMethod,
  reference:original.reference||"",attribution:original.attribution||""
 }:defaultExpense);
 const [file,setFile]=useState<File|null>(null),[removeReceipt,setRemoveReceipt]=useState(false),
 [reason,setReason]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),
 [key,setKey]=useState("");
 function update(field:keyof Input,value:string){setForm(x=>({...x,[field]:value}));setKey("");}
 async function save(e:FormEvent){
  e.preventDefault();if(busy)return;
  if(!Number.isSafeInteger(Number(form.amountAfn))||Number(form.amountAfn)<=0){
   setError("INVALID_AMOUNT");return;
  }
  if(!confirm(t(original?"confirmEdit":"confirmSave")))return;
  setBusy(true);setError("");
  const action=key||crypto.randomUUID();setKey(action);
  try{
   const receipt=await attachment(file);
   const payload={date:form.date,category:form.category,description:form.description,
    amountAfn:Number(form.amountAfn),paymentMethod:form.paymentMethod,
    reference:form.reference||null,attribution:form.attribution||null,
    actionKey:action,receipt,removeReceipt:removeReceipt&&!!original,
    ...(original?{revision:original.revision,reason}:{})};
   await request(original?base(space.clinicId)+"/"+original.id:base(space.clinicId),
    original?"PUT":"POST",payload);
   setKey("");onSaved();
  }catch(ex:any){setError(ex.message==="INVALID_RECEIPT"?t("invalidReceipt"):ex.message)}
  finally{setBusy(false);}
 }
 return <form className="phase11-editor" onSubmit={save}>
  <div className="phase11-section-title"><div><span className="phase11-kicker">{t("private")}</span>
   <h3>{t(original?"edit":"addExpense")}</h3></div>
   <button type="button" className="btn btn-secondary" onClick={onCancel}>{t("cancel")}</button></div>
  {original&&<Notice kind="warning">{t("audit")}</Notice>}
  <div className="phase11-form-grid">
   <label className="phase11-field"><span>{t("date")} *</span>
    <input type="date" required value={form.date} onChange={e=>update("date",e.target.value)}/></label>
   <label className="phase11-field"><span>{t("category")} *</span>
    <select value={form.category} onChange={e=>update("category",e.target.value)}>
     {CAT.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>
   <label className="phase11-field phase11-wide"><span>{t("description")} *</span>
    <textarea required minLength={3} maxLength={500} rows={2} value={form.description}
     onChange={e=>update("description",e.target.value)}/></label>
   <label className="phase11-field"><span>{t("amount")} *</span>
    <input type="number" required min={1} max={2000000000} step={1} value={form.amountAfn}
     onChange={e=>update("amountAfn",e.target.value)}/></label>
   <label className="phase11-field"><span>{t("method")} *</span>
    <select value={form.paymentMethod} onChange={e=>update("paymentMethod",e.target.value)}>
     {METHODS.map(m=><option key={m} value={m}>{t(m)}</option>)}</select></label>
   <label className="phase11-field"><span>{t("reference")}</span>
    <input maxLength={120} value={form.reference} onChange={e=>update("reference",e.target.value)}/></label>
   <label className="phase11-field"><span>{t("attribution")}</span>
    <input maxLength={120} value={form.attribution}
     onChange={e=>update("attribution",e.target.value)}/></label>
   <label className="phase11-field phase11-wide"><span>{t(original?"replaceReceipt":"receipt")}</span>
    <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
     onChange={e=>{setFile(e.target.files?.[0]||null);setRemoveReceipt(false);setKey("");}}/>
    <small>{t("receiptHint")}</small></label>
   {original?.receiptId&&<label className="phase11-checkbox phase11-wide">
    <input type="checkbox" checked={removeReceipt} onChange={e=>{
     setRemoveReceipt(e.target.checked);if(e.target.checked)setFile(null);setKey("");
    }}/> <span>{t("removeReceipt")} · {t("receiptOld")}</span></label>}
   {original&&<label className="phase11-field phase11-wide"><span>{t("reason")} *</span>
    <textarea minLength={10} maxLength={500} required rows={2} value={reason}
     onChange={e=>{setReason(e.target.value);setKey("");}} placeholder={t("reasonTip")}/></label>}
  </div>
  {form.paymentMethod==="bank_transfer"&&<Notice kind="warning">{t("referenceNote")}</Notice>}
  {error&&<ErrorBox message={error}/>}
  <div className="phase11-form-actions"><button className="btn btn-primary" disabled={busy}
   type="submit">{busy?t("loading"):t(original?"correct":"save")} →</button>
   <span>{t("audit")}</span></div>
 </form>;
}
function ExpenseDetail({space,id,onSaved}:{space:Space;id:string;onSaved:()=>void}){
 const {t,d}=useWords();
 const {data,error,refresh}=useLoad(base(space.clinicId)+"/"+id);
 const [edit,setEdit]=useState(false),[voidReason,setVoidReason]=useState(""),
 [busy,setBusy]=useState(false),[fault,setFault]=useState(""),[success,setSuccess]=useState("");
 async function doVoid(){
  if(voidReason.trim().length<10||!confirm(t("confirmVoid")))return;
  setBusy(true);setFault("");
  try{await request(base(space.clinicId)+"/"+id+"/void","POST",{
    revision:data.expense.revision,reason:voidReason,actionKey:crypto.randomUUID()});
   setSuccess(t("voided"));refresh();onSaved();setVoidReason("");}
  catch(e:any){setFault(e.message)}finally{setBusy(false)}
 }
 if(error)return <ErrorBox message={error} retry={refresh}/>;
 if(!data)return <Loading/>;
 const detail=data as Detail,e=detail.expense;
 return <section className="card phase11-detail">
  <div className="phase11-detail-head"><div><span className="phase11-kicker">{t("current")} ·
   <bdi dir="ltr">{e.label}</bdi> · {t("version")} {e.revision}</span>
   <h3>{e.description}</h3>
   <div className="phase11-inline-tags"><Status value={e.status}/>
    <span>{t(e.category)}</span><span>{t(e.paymentMethod)}</span></div></div>
   <div className="phase11-detail-value"><Price value={e.amountAfn}/><small>{d(e.date)}</small></div></div>
  <div className="phase11-details-grid">
   <div><span>{t("recordedBy")}</span><strong>{e.actorName||"—"}</strong></div>
   <div><span>{t("reference")}</span><strong>{e.reference||"—"}</strong></div>
   <div><span>{t("attribution")}</span><strong>{e.attribution||"—"}</strong></div>
   <div><span>{t("updatedAt")}</span><strong>{d(e.updatedAt)}</strong></div></div>
  <div className="phase11-detail-actions">
   {e.status==="posted"&&<button type="button" className="btn btn-primary"
    onClick={()=>setEdit(x=>!x)}>{t("edit")}</button>}
   {e.receiptId&&<button type="button" className="btn btn-secondary" onClick={async()=>{
    try{setFault("");await downloadReceipt(space,id,e.receiptId!,"clinic-expense-"+e.label);}
    catch{setFault(t("fileError"))}
   }}>{t("downloadReceipt")} ↗</button>}
  </div>
  {edit&&<ExpenseEditor key={e.id+":"+e.revision} original={e} space={space}
    onCancel={()=>setEdit(false)} onSaved={()=>{setEdit(false);setSuccess(t("updated"));refresh();onSaved();}}/>}
  <div className="phase11-history"><div className="phase11-section-title">
    <div><h3>{t("history")}</h3><p>{t("audit")}</p></div></div>
    {detail.history.map(h=><article className="phase11-history-event" key={h.id}>
     <span className="phase11-history-dot" aria-hidden="true"/>
     <div className="phase11-history-body">
      <div className="phase11-history-caption"><strong>{t(h.action)} · {t("version")} {h.version}</strong>
       <span>{d(h.created_at)} · {h.actor_name}</span></div>
      <p>{h.description} · {t(h.category)} · <Price value={h.amount_afn}/></p>
      {h.correction_reason&&<blockquote>{t("reasonLabel")}: {h.correction_reason}</blockquote>}
      {h.receipt_id&&<button type="button" className="phase11-text-button"
       onClick={async()=>{try{setFault("");await downloadReceipt(space,id,h.receipt_id!,
        "expense-"+e.label+"-v"+h.version);}
        catch{setFault(t("fileError"))}}}>{t("downloadReceipt")} v{h.version} ↗</button>}
     </div>
    </article>)}
  </div>
  {["owner","manager"].includes(space.role)&&e.status==="posted"&&
   <div className="phase11-danger"><div><strong>{t("void")}</strong><p>{t("ownerOnly")}</p></div>
    <label className="phase11-field"><span>{t("voidReason")} *</span>
     <textarea minLength={10} maxLength={500} rows={2} value={voidReason}
      onChange={x=>setVoidReason(x.target.value)}/></label>
    <button type="button" className="btn btn-secondary" disabled={busy||voidReason.trim().length<10}
     onClick={doVoid}>{t("void")}</button></div>}
  {e.status==="void"&&<Notice kind="warning">{t("voidedNote")} {e.voidReason}</Notice>}
  {fault&&<ErrorBox message={fault}/>}
  {success&&<Notice kind="success">{success}</Notice>}
 </section>;
}
export function ExpensePanel({space}:{space:Space}){
 const {t,d}=useWords();const [filters,setFilters]=useState<Filters>(defaultFilters),
  [draft,setDraft]=useState<Filters>(filters),[page,setPage]=useState(1),[newEntry,setNewEntry]=useState(false),
  [selected,setSelected]=useState<string|null>(null),[success,setSuccess]=useState("");
 const qs=new URLSearchParams({from:filters.from,to:filters.to,category:filters.category,
  method:filters.method,status:filters.status,q:filters.search,page:String(page)});
 const {data,error,refresh}=useLoad(base(space.clinicId)+"?"+qs);
 function change(field:keyof Filters,value:string){setDraft(s=>({...s,[field]:value}));}
 function apply(e:FormEvent){e.preventDefault();setPage(1);setFilters({...draft});setSelected(null);}
 function reset(){const f=defaultFilters();setDraft(f);setFilters(f);setPage(1);setSelected(null);}
 function exportPage(){
  const rows:Expense[]=data?.expenses||[];if(!rows.length)return;
  const table:(string|number)[][]=[
   ["number","date","category","description","amount_afn","payment_method",
    "reference","attribution","status","recorded_by"],
   ...rows.map(x=>[x.label,String(x.date).slice(0,10),x.category,x.description,x.amountAfn,
    x.paymentMethod,x.reference||"",x.attribution||"",x.status,x.actorName||""])];
  const content="\uFEFF"+table.map(row=>row.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="clinic-expenses-page-"+page+".csv";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 if(!["owner","manager","cashier"].includes(space.role))return <ErrorBox message={t("unauthorized")}/>;
 return <div className="phase11-workspace">
  <section className="card phase11-panel">
   <div className="phase11-section-title"><div><span className="phase11-kicker">{t("private")}</span>
    <h2>{t("expenses")}</h2><p>{t("intro")}</p></div>
    <div className="phase11-title-actions">
     <button type="button" className="btn btn-secondary" disabled={!data?.expenses?.length}
      onClick={exportPage}>{t("downloadCsv")}</button>
     <button type="button" className="btn btn-primary" onClick={()=>setNewEntry(x=>!x)}>
      {newEntry?t("cancel"):"+ "+t("addExpense")}</button>
    </div></div>
   {newEntry&&<div className="phase11-form-card"><ExpenseEditor space={space} onCancel={()=>setNewEntry(false)}
    onSaved={()=>{setNewEntry(false);setSuccess(t("recorded"));refresh();}}/></div>}
   <form className="phase11-toolbar" onSubmit={apply}>
    <label className="phase11-field"><span>{t("from")}</span>
     <input required type="date" value={draft.from} onChange={e=>change("from",e.target.value)}/></label>
    <label className="phase11-field"><span>{t("to")}</span>
     <input required type="date" value={draft.to} onChange={e=>change("to",e.target.value)}/></label>
    <label className="phase11-field"><span>{t("category")}</span>
     <select value={draft.category} onChange={e=>change("category",e.target.value)}>
      <option value="all">{t("all")}</option>{CAT.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>
    <label className="phase11-field"><span>{t("method")}</span>
     <select value={draft.method} onChange={e=>change("method",e.target.value)}>
      <option value="all">{t("all")}</option>
      {METHODS.map(m=><option key={m} value={m}>{t(m)}</option>)}</select></label>
    <label className="phase11-field"><span>{t("status")}</span>
     <select value={draft.status} onChange={e=>change("status",e.target.value)}>
      {["posted","void","all"].map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
    <label className="phase11-field phase11-search"><span>{t("searchButton")}</span>
     <input maxLength={100} placeholder={t("search")} value={draft.search}
      onChange={e=>change("search",e.target.value)}/></label>
    <div className="phase11-filter-actions"><button className="btn btn-primary" type="submit">
     {t("filter")}</button><button className="btn btn-secondary" type="button" onClick={reset}>
      {t("reset")}</button></div>
   </form>
   {error?<ErrorBox message={error} retry={refresh}/>:!data?<Loading/>:!data.expenses.length?
    <div className="phase11-empty">{t("noRows")}</div>:
    <div className="phase11-table-scroll"><table className="phase11-table"><thead><tr>
     <th>{t("name")}</th><th>{t("date")}</th><th>{t("category")}</th>
     <th>{t("description")}</th><th>{t("method")}</th><th>{t("amountAfn")}</th>
     <th>{t("status")}</th><th>{t("actions")}</th>
    </tr></thead><tbody>{(data.expenses as Expense[]).map(e=><tr key={e.id}>
     <td><strong dir="ltr">{e.label}</strong></td><td>{d(e.date)}</td>
     <td><span className={"phase11-category cat-"+e.category}>{t(e.category)}</span></td>
     <td className="phase11-table-description">{e.description}</td>
     <td>{t(e.paymentMethod)}</td><td><strong><Price value={e.amountAfn}/></strong></td>
     <td><Status value={e.status}/></td>
     <td><button type="button" className="phase11-text-button" aria-expanded={selected===e.id}
      onClick={()=>{setSelected(s=>s===e.id?null:e.id);setSuccess("");}}>
      {t("view")} →</button></td>
    </tr>)}</tbody></table></div>}
   <div className="phase11-pagination"><span>{t("exportScope")}</span>
    <button type="button" className="btn btn-secondary" disabled={page<=1} onClick={()=>{setPage(x=>x-1);setSelected(null)}}>
     {t("previous")}</button><strong>{t("page")} {page}</strong>
    <button type="button" className="btn btn-secondary" disabled={!data?.hasMore}
     onClick={()=>{setPage(x=>x+1);setSelected(null)}}>{t("next")}</button></div>
   {success&&<Notice kind="success">{success}</Notice>}
  </section>
  {selected&&<ExpenseDetail key={selected} id={selected} space={space} onSaved={refresh}/>}
  <Notice kind="info">{t("expensesNotCharges")} {t("paymentNote")} {t("voidedNote")}</Notice>
 </div>;
}
export function CashFlowInsights({space}:{space:Space}){
 const {t,money}=useWords(),[dates,setDates]=useState({from:monthDefault(),to:kabDay()}),
  [selected,setSelected]=useState(dates);
 const qs=new URLSearchParams(selected);
 const {data,error,refresh}=useLoad(base(space.clinicId)+"/summary?"+qs);
 const summary=data?.summary as {expense_total_afn:number;expense_count:number;
 net_collections_afn:number;net_after_expenses_afn:number}|undefined;
 const categories=data?.categories as {category:string;total_afn:number;count:number}[]|undefined;
 const maxValue=Math.max(1,...(categories||[]).map(x=>x.total_afn));
 if(!["owner","manager","cashier"].includes(space.role))return null;
 return <section className="card phase11-cashflow">
  <div className="phase11-section-title"><div><span className="phase11-kicker">{t("report")}</span>
   <h2>{t("cashNote")}</h2><p>{t("reportDesc")}</p></div>
   <a className="btn btn-secondary" href={"/clinic/finance?clinic="+encodeURIComponent(space.clinicId)+"&tab=expenses"}>
    {t("expenses")} →</a></div>
  <form className="phase11-period-form" onSubmit={e=>{e.preventDefault();setSelected({...dates})}}>
   <label className="phase11-field"><span>{t("from")}</span>
    <input type="date" required value={dates.from}
     onChange={e=>setDates(x=>({...x,from:e.target.value}))}/></label>
   <label className="phase11-field"><span>{t("to")}</span>
    <input type="date" required value={dates.to}
     onChange={e=>setDates(x=>({...x,to:e.target.value}))}/></label>
   <button type="submit" className="btn btn-secondary">{t("apply")}</button>
  </form>
  {error?<ErrorBox message={error} retry={refresh}/>:!summary?<Loading/>:<>
   <div className="phase11-insights">
    {([["netCollections","net_collections_afn"],["totalExpenses","expense_total_afn"],
      ["netAfter","net_after_expenses_afn"]] as [string,keyof typeof summary][]).map(([label,key])=>
     <div className="phase11-insight" key={key}><span>{t(label)}</span>
      <strong className={Number(summary[key])<0?"phase11-negative":""} dir="ltr">
       {money(Number(summary[key]))} AFN</strong><small>{t("noProfit")}</small></div>)}
   </div>
   <div className="phase11-cashflow-note"><span aria-hidden="true">ⓘ</span>
    <p>{t("periodNote")} {t("cashNote")} {t("paymentNote")}</p></div>
   {["owner","manager"].includes(space.role)&&<div className="phase11-category-breakdown">
    <div className="phase11-section-title"><div><h3>{t("categoryBreakdown")}</h3>
     <p>{t("totalExpenses")}: <Price value={summary.expense_total_afn}/></p></div></div>
    {categories?.length?categories.map(row=><div className="phase11-bar-row" key={row.category}>
     <span>{t(row.category)}</span><div className="phase11-bar-track" aria-label={t(row.category)}>
      <span style={{width:Math.max(0,Math.min(100,row.total_afn/maxValue*100))+"%"}}/></div>
     <strong><Price value={row.total_afn}/></strong></div>):
     <p className="phase11-muted">{t("noBreakdown")}</p>}
   </div>}
  </>}
 </section>;
}
