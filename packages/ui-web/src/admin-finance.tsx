"use client";
import React,{useEffect,useState,type FormEvent} from "react";
import {CareIcon,InlineAlert,usePreferences} from "./index";
import {QueueTools,QueuePager,QueueEmpty} from "./admin-moderation";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Locale="en"|"fa-AF"|"ps-AF";
type Invoice={id:string;clinicId:string;clinicName:string;city:string;amountAfn:number;
 status:string;evidenceReference:string|null;createdAt:string;verifiedAt:string|null;
 planLabel:string;billingPeriod:string;periodEndsAt:string|null};
type Subscription={clinicId:string;clinicName:string;city:string;status:string;effectiveStatus:string;
 trialEndsAt:string|null;currentPeriodEndsAt:string|null;updatedAt:string;planLabel:string;billingPeriod:string};
type Summary={invoices:{awaiting:number;paid:number;void:number;awaitingOver48:number;lifetimeAfn:number;
 last30Afn:number;previous30Afn:number};subscriptions:{active:number;trialing:number;grace:number;
 expired:number;cancelled:number};generatedAt:string;note:string};
type Page<T>={invoices?:Invoice[];subscriptions?:Subscription[];total:number;page:number;pageSize:number};
const L:Record<Locale,Record<string,string>>={
 en:{title:"Subscriptions & payments",subtitle:"Review subscription plans, verify submitted payment references and follow financial activity.",
  eyebrow:"DANDANLINK · FINANCE",invoices:"Payment verification",subscriptions:"Clinic subscriptions",
  awaiting:"Awaiting review",paid:"Paid",void:"Rejected",all:"All",active:"Active",
  trialing:"Trial",grace:"Grace",expired:"Expired",cancelled:"Cancelled",
  receipts:"Confirmed receipts",recentReceipts:"Last 30 days",previousReceipts:"Previous 30 days",
  pendingOverdue:"Waiting over 48h",noMoney:"Platform subscriptions only — not patient payments or clinic revenue.",
  plan:"Plan",clinic:"Clinic",amount:"Amount (AFN)",date:"Submitted",reference:"Payment reference",
  action:"Review",status:"Status",reason:"Decision reason",confirmation:"Exact payment reference",
  verified:"Verified",verify:"Confirm payment",reject:"Reject payment",cancel:"Cancel",confirm:"I checked the payment evidence and accept responsibility for this decision.",
  warning:"Check payment evidence independently before approving; a submitted reference alone does not prove funds were received.",
  reasonHint:"Explain the decision (5–400 characters).",error:"Could not retrieve finance records.",
  loading:"Loading finance information…",refresh:"Refresh",retry:"Retry",success:"Decision recorded.",
  history:"Decision history",noHistory:"No decision history recorded.",hideHistory:"Hide history",
  failure:"This request could not be completed.",searchHint:"Search clinic, city or reference",
  new:"Submitted",end:"Current period ends",updated:"Updated",reviewOnly:"Approve or reject only a waiting invoice.",
  approvedReceipts:"Confirmed by a platform administrator",unverified:"Unverified submitted evidence",
  count:"Invoices",reviewPrompt:"Review invoice",decision:"Decision",currency:"AFN",clear:"Clear search",
  details:"Clinic details",notFound:"No matching records.",needsAdmin:"Platform admin access with verified MFA required.",
  noReference:"No reference provided",queue:"Payment queue",subStates:"Subscription lifecycle",closed:"Finalized",
  reconciliation:"Summary is based on paid platform subscription invoices, not bank-statement reconciliation."},
 "fa-AF":{title:"اشتراک‌ها و پرداخت‌ها",subtitle:"مدیریت اشتراک کلینیک‌ها، بررسی رسید پرداخت و پیگیری فعالیت مالی.",
  eyebrow:"دندان‌لینک · مالی",invoices:"تأیید پرداخت",subscriptions:"اشتراک کلینیک‌ها",
  awaiting:"در انتظار بررسی",paid:"پرداخت‌شده",void:"ردشده",all:"همه",active:"فعال",
  trialing:"آزمایشی",grace:"مهلت تمدید",expired:"منقضی",cancelled:"لغوشده",
  receipts:"دریافت‌های تأییدشده",recentReceipts:"۳۰ روز اخیر",previousReceipts:"۳۰ روز قبل",
  pendingOverdue:"بیش از ۴۸ ساعت معطل",noMoney:"فقط اشتراک‌های پلتفرم؛ بدون عواید مریضان و کلینیک‌ها.",
  plan:"طرح",clinic:"کلینیک",amount:"مبلغ (افغانی)",date:"تاریخ درخواست",reference:"مرجع پرداخت",
  action:"بررسی",status:"حالت",reason:"دلیل تصمیم",confirmation:"مرجع دقیق پرداخت",
  verified:"تأییدشده",verify:"تأیید پرداخت",reject:"رد پرداخت",cancel:"لغو",confirm:"اسناد پرداخت را بررسی کرده‌ام و مسئولیت این تصمیم را می‌پذیرم.",
  warning:"پیش از تأیید، سند پرداخت را مستقل بررسی کنید؛ شماره مرجع به‌تنهایی اثبات دریافت پول نیست.",
  reasonHint:"دلیل تصمیم را بنویسید (۵ تا ۴۰۰ حرف).",error:"اطلاعات مالی دریافت نشد.",
  loading:"در حال بارگیری معلومات مالی…",refresh:"تازه‌سازی",retry:"دوباره",success:"تصمیم ثبت شد.",
  history:"تاریخچه تصمیم‌ها",noHistory:"تصمیم قبلی ثبت نشده.",hideHistory:"پنهان‌کردن تاریخچه",
  failure:"درخواست تکمیل نشد.",searchHint:"جستجوی کلینیک، شهر یا مرجع",
  new:"ارسال‌شده",end:"پایان دوره فعلی",updated:"تازه‌شده",reviewOnly:"فقط فاکتور منتظر تأیید یا رد می‌شود.",
  approvedReceipts:"تأییدشده توسط مدیر پلتفرم",unverified:"اسناد ارسال‌شده هنوز تأیید نشده",
  count:"فاکتورها",reviewPrompt:"بررسی فاکتور",decision:"تصمیم",currency:"افغانی",clear:"پاک‌کردن جستجو",
  details:"جزئیات کلینیک",notFound:"موردی یافت نشد.",needsAdmin:"دسترسی مدیر پلتفرم با تأیید دومرحله‌ای لازم است.",
  noReference:"شماره مرجع ندارد",queue:"فهرست پرداخت‌ها",subStates:"حالت اشتراک‌ها",closed:"نهایی",
  reconciliation:"این جمع‌بندی بر اساس فاکتورهای تأییدشده پلتفرم است، نه مطابقت با صورت‌حساب بانک."},
 "ps-AF":{title:"ګډونونه او تادیات",subtitle:"د کلینیک ګډونونه، تادیې او مالي فعالیتونه وڅارئ.",
  eyebrow:"دندان‌لینک · مالي",invoices:"د تادیاتو تایید",subscriptions:"د کلینیک ګډونونه",
  awaiting:"کتنې ته منتظر",paid:"تادیه شوی",void:"رد شوی",all:"ټول",active:"فعال",
  trialing:"ازمایښتي",grace:"د تمدید مهلت",expired:"پای ته رسېدلی",cancelled:"لغوه",
  receipts:"تایید شوې پیسې",recentReceipts:"وروستۍ ۳۰ ورځې",previousReceipts:"تېرې ۳۰ ورځې",
  pendingOverdue:"له ۴۸ ساعتونو زاړه",noMoney:"یوازې د پلاتفورم ګډونونه؛ د ناروغانو او کلینیک عواید نه دي.",
  plan:"پلان",clinic:"کلینیک",amount:"اندازه (افغانۍ)",date:"د سپارلو نېټه",reference:"د تادیې مرجع",
  action:"کتنه",status:"حالت",reason:"د پرېکړې دلیل",confirmation:"د تادیې دقیق مرجع",
  verified:"تایید شوی",verify:"تادیه تاییدول",reject:"تادیه ردول",cancel:"لغوه",confirm:"د تادیې سند مې جلا وکوت او د پرېکړې مسئولیت منم.",
  warning:"تر تایید مخکې د تادیې سند پخپله وګورئ؛ یواځې مرجع د پیسو رسېدو ثبوت نه دی.",
  reasonHint:"د پرېکړې دلیل ولیکئ (۵–۴۰۰ توري).",error:"مالي مالومات نه راځي.",
  loading:"مالي معلومات بارېږي…",refresh:"تازه کول",retry:"بیا هڅه",success:"پرېکړه ثبت شوه.",
  history:"د پرېکړو تاریخ",noHistory:"پرېکړه نه ده ثبت شوې.",hideHistory:"تاریخ پټول",
  failure:"غوښتنه بشپړه نه شوه.",searchHint:"د کلینیک، ښار یا مرجع لټون",
  new:"سپارل شوی",end:"د روانې مودې پای",updated:"تازه شوی",reviewOnly:"یوازې منتظره غوښتنه تایید یا رد کړئ.",
  approvedReceipts:"د پلاتفورم مدیر تایید کړي",unverified:"سپارل شوی سند لا نه دی تایید",
  count:"بلونه",reviewPrompt:"د بل کتنه",decision:"پرېکړه",currency:"افغانۍ",clear:"لټون پاکول",
  details:"د کلینیک معلومات",notFound:"هیڅ مورد ونه موندل شو.",needsAdmin:"د تایید شوي MFA مدیر لاسرسی پکار دی.",
  noReference:"مرجع نشته",queue:"د تادیاتو کتار",subStates:"د ګډون حالتونه",closed:"وروستی",
  reconciliation:"شمېرې یوازې د تایید شویو بلونو دي، د بانک له صورت حساب سره تصدیق نه دی."}
};
async function read<T>(path:string,signal?:AbortSignal):Promise<T>{
 const res=await fetch(API+"/v1"+path,{credentials:"include",cache:"no-store",signal});
 const data=await res.json().catch(()=>({})) as T&{code?:string};
 if(!res.ok)throw Error(data.code||"REQUEST_FAILED");
 return data;
}
async function mutate(path:string,payload:unknown){
 const res=await fetch(API+"/v1"+path,{method:"POST",credentials:"include",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const data=await res.json().catch(()=>({})) as {code?:string};
 if(!res.ok)throw Error(data.code||"REQUEST_FAILED");
}
const formatDate=(s:string|null,locale:Locale)=>!s?"—":
 new Intl.DateTimeFormat(locale,{timeZone:"Asia/Kabul",dateStyle:"medium"}).format(new Date(s));
export function AdminFinancePortal(){
 const {locale}=usePreferences(),lang=(locale in L?locale:"en") as Locale;
 const t=(key:string)=>L[lang][key]||L.en[key]||key;
 const number=(value:number)=>new Intl.NumberFormat(lang).format(value);
 const [tab,setTab]=useState<"invoices"|"subscriptions">("invoices");
 const [status,setStatus]=useState("awaiting"),[sort,setSort]=useState<"newest"|"oldest">("newest");
 const [draft,setDraft]=useState(""),[q,setQ]=useState(""),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
 const [summary,setSummary]=useState<Summary|null>(null),[results,setResults]=useState<Page<Invoice|Subscription>|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [selected,setSelected]=useState<{id:string;action:"confirm"|"reject"}|null>(null);
 const [reason,setReason]=useState(""),[reference,setReference]=useState(""),[verified,setVerified]=useState(false);
 const [historyId,setHistoryId]=useState(""),[history,setHistory]=useState<Array<{action:string;at:string;outcome:string}>>([]);
 useEffect(()=>{
  const query=new URLSearchParams(location.search).get("status");
  if(query&&["all","awaiting","paid","void"].includes(query)){setTab("invoices");setStatus(query);}
  else if(query&&["trialing","active","grace","expired","cancelled"].includes(query)){
   setTab("subscriptions");setStatus(query);}
 },[]);
 useEffect(()=>{
  let alive=true;const controller=new AbortController();
  read<Summary>("/admin/finance/summary",controller.signal).then(x=>{if(alive)setSummary(x);})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));});
  return()=>{alive=false;controller.abort();};
 },[refresh]);
 useEffect(()=>{
  let alive=true;const controller=new AbortController();setLoading(true);setResults(null);setError("");
  const query=new URLSearchParams({status,sort,page:String(page),q});
  read<Page<Invoice|Subscription>>("/admin/finance/"+tab+"?"+query,controller.signal)
   .then(x=>{if(alive)setResults(x);})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;controller.abort();};
 },[tab,status,sort,page,q,refresh]);
 useEffect(()=>{
  if(!historyId){setHistory([]);return;}
  let active=true;read<{events:typeof history}>("/admin/finance/invoices/"+historyId+"/history")
   .then(x=>{if(active)setHistory(x.events);}).catch(()=>{if(active)setHistory([]);});
  return()=>{active=false};
 },[historyId,refresh]);
 const filterStatuses=tab==="invoices"?["awaiting","paid","void","all"]:
  ["active","trialing","grace","expired","cancelled","all"];
 function switchTab(value:"invoices"|"subscriptions"){
  setTab(value);setStatus(value==="invoices"?"awaiting":"active");setPage(1);setDraft("");setQ("");
  setSelected(null);setHistoryId("");setError("");setNotice("");
 }
 function openReview(invoice:Invoice,action:"confirm"|"reject"){
  if(invoice.status!=="awaiting")return;
  setSelected({id:invoice.id,action});setReason("");setReference("");setVerified(false);
  setHistoryId("");
 }
 async function decision(e:FormEvent,invoice:Invoice){
  e.preventDefault();
  if(!selected||selected.id!==invoice.id||!verified||reason.trim().length<5||reason.trim().length>400
   ||selected.action==="confirm"&&reference!==invoice.evidenceReference)return;
  setSaving(true);setError("");setNotice("");
  try{
   await mutate("/admin/invoices/"+invoice.id+"/decision",{
    action:selected.action,reason:reason.trim(),
    confirmation:selected.action==="confirm"?reference:undefined
   });
   setSelected(null);setReason("");setReference("");setVerified(false);
   setNotice(t("success"));setRefresh(x=>x+1);
  }catch(e){setError(e instanceof Error?e.message:t("failure"))}
  finally{setSaving(false)}
 }
 const rows=(tab==="invoices"?results?.invoices:results?.subscriptions)||[];
 return <main className="adm-d-finance">
  <header className="adm-d-finance-head"><div>
   <span className="adm-d-eyebrow">{t("eyebrow")}</span>
   <h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
   <button className="btn btn-secondary" type="button" onClick={()=>setRefresh(x=>x+1)}
    disabled={saving}><CareIcon name="activity" size={17}/>{t("refresh")}</button>
  </header>
  <section aria-label={t("receipts")} className="adm-d-stats">
   {[
    {key:"awaiting",value:summary?.invoices.awaiting,icon:"receipt"},
    {key:"pendingOverdue",value:summary?.invoices.awaitingOver48,icon:"clock"},
    {key:"recentReceipts",value:summary?.invoices.last30Afn,icon:"credit-card",unit:true},
    {key:"active",value:summary?.subscriptions.active,icon:"shield-check"},
    {key:"trialing",value:summary?.subscriptions.trialing,icon:"clinic"}
   ].map(x=><div className="adm-d-stat" key={x.key}>
    <span className="adm-d-stat-icon"><CareIcon name={x.icon as "receipt"} size={19}/></span>
    <span>{t(x.key)}</span><strong dir="auto">{x.value===undefined?"—":number(x.value)}{x.unit&&<small> AFN</small>}</strong>
   </div>)}
  </section>
  <p className="adm-d-privacy"><CareIcon name="shield" size={17}/>{t("noMoney")} {t("reconciliation")}</p>
  <nav className="adm-d-tabs" role="tablist" aria-label={t("title")}>
   {(["invoices","subscriptions"] as const).map(key=><button role="tab" type="button" key={key}
    aria-selected={tab===key} onClick={()=>switchTab(key)}>{t(key)}</button>)}
  </nav>
  <div className="adm-d-filters">
   <div role="group" aria-label={t("status")} className="adm-d-pills">
    {filterStatuses.map(key=><button type="button" key={key} aria-pressed={status===key}
     onClick={()=>{setStatus(key);setPage(1);setSelected(null);setHistoryId("");}}>{t(key)}</button>)}
   </div>
   <QueueTools draft={draft} onDraftChange={setDraft} placeholder={t("searchHint")}
    onSubmit={()=>{setQ(draft.trim());setPage(1);setSelected(null);}}
    onClear={()=>{setDraft("");setQ("");setPage(1);}}
    sort={sort} onSortChange={v=>{setSort(v);setPage(1);}}/>
  </div>
  {notice&&<InlineAlert kind="success">{notice}</InlineAlert>}
  {error&&<InlineAlert kind="error">{t("error")} · {error}</InlineAlert>}
  <section className="adm-d-records" aria-label={t(tab)}>
   <div className="adm-d-records-head"><h2>{tab==="invoices"?t("queue"):t("subStates")}</h2>
    <span>{results?number(results.total)+" "+t("count"):t("loading")}</span></div>
   {loading?<div className="admin-page-loading" role="status" aria-label={t("loading")}>
    <div className="admin-loading-grid">{[1,2,3].map(i=><div className="admin-loading-card" key={i}/>)}</div></div>:
    !results?<button type="button" className="btn btn-secondary" onClick={()=>setRefresh(x=>x+1)}>{t("retry")}</button>:
    !rows.length?<QueueEmpty/>:
    <div className="adm-d-rows">{tab==="invoices"?(rows as Invoice[]).map(invoice=>
     <article className="adm-d-record" key={invoice.id}>
      <div className="adm-d-record-top"><div><strong>{invoice.clinicName}</strong>
       <p>{invoice.city} · {invoice.planLabel} · {invoice.billingPeriod}</p></div>
       <span className={"adm-d-status is-"+invoice.status}>{t(invoice.status)}</span>
      </div>
      <div className="adm-d-record-grid"><span>{t("amount")}<strong dir="ltr">{number(invoice.amountAfn)} AFN</strong></span>
       <span>{t("reference")}<bdi dir="ltr">{invoice.evidenceReference||t("noReference")}</bdi></span>
       <span>{t("new")}<strong>{formatDate(invoice.createdAt,lang)}</strong></span>
      </div>
      <div className="adm-d-record-actions">
       <a className="adm-d-link" href={"/admin/clinics/"+invoice.clinicId}>{t("details")} →</a>
       {invoice.status==="awaiting"?<>
        <button type="button" className="btn btn-primary" disabled={saving}
         onClick={()=>openReview(invoice,"confirm")}>{t("verify")}</button>
        <button type="button" className="btn btn-secondary" disabled={saving}
         onClick={()=>openReview(invoice,"reject")}>{t("reject")}</button>
       </>:<button type="button" className="btn btn-secondary"
        onClick={()=>setHistoryId(historyId===invoice.id?"":invoice.id)}>
        {historyId===invoice.id?t("hideHistory"):t("history")}</button>}
      </div>
      {selected?.id===invoice.id&&<form className="adm-d-decision" onSubmit={e=>void decision(e,invoice)}>
       <h3>{t("reviewPrompt")} — {t(selected.action==="confirm"?"verify":"reject")}</h3>
       <p className="adm-d-warning">{t("warning")}</p>
       <label>{t("reason")}<textarea minLength={5} maxLength={400} required
        placeholder={t("reasonHint")} value={reason} onChange={e=>setReason(e.target.value)}/></label>
       {selected.action==="confirm"&&<label>{t("confirmation")}<input type="text"
        autoComplete="off" required value={reference} onChange={e=>setReference(e.target.value)}/></label>}
       <label className="adm-d-check"><input type="checkbox" required checked={verified}
        onChange={e=>setVerified(e.target.checked)}/>{t("confirm")}</label>
       <div className="adm-d-decision-actions">
        <button className="btn btn-secondary" type="button" disabled={saving}
         onClick={()=>setSelected(null)}>{t("cancel")}</button>
        <button className="btn btn-primary" type="submit"
         disabled={saving||!verified||reason.trim().length<5||
          (selected.action==="confirm"&&reference!==invoice.evidenceReference)}>
         {saving?t("loading"):t(selected.action==="confirm"?"verify":"reject")}</button></div>
      </form>}
      {historyId===invoice.id&&<div className="adm-d-audit"><h3>{t("history")}</h3>
       {history.length?history.map((event,i)=><p key={i}>
        {event.action.split(".").at(-1)} · {formatDate(event.at,lang)}</p>):
        <p>{t("noHistory")}</p>}</div>}
     </article>):(rows as Subscription[]).map(sub=><article className="adm-d-record" key={sub.clinicId}>
      <div className="adm-d-record-top"><div><strong>{sub.clinicName}</strong>
       <p>{sub.city} · {sub.planLabel} · {sub.billingPeriod}</p></div>
       <span className={"adm-d-status is-"+sub.effectiveStatus}>{t(sub.effectiveStatus)}</span></div>
      <div className="adm-d-record-grid"><span>{t("end")}<strong>
       {formatDate(sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt,lang)}</strong></span>
       <span>{t("updated")}<strong>{formatDate(sub.updatedAt,lang)}</strong></span>
       <span>{t("plan")}<strong>{sub.planLabel}</strong></span></div>
      <div className="adm-d-record-actions"><a className="adm-d-link"
       href={"/admin/clinics/"+sub.clinicId}>{t("details")} →</a></div>
     </article>)}</div>}
   <QueuePager page={page} total={results?.total||0} pageSize={results?.pageSize||10}
    onPage={p=>{setPage(p);setSelected(null);setHistoryId("");}} loading={loading}/>
  </section>
 </main>;
}
